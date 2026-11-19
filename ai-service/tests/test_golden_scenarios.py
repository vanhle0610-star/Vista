import unittest
import os
import json
import config
from api.contract import parse_plan_request, serialize_plan
from engine.planner import VistaMasterPlanner
from data.loader import data_loader
from engine.timeline import time_to_minutes, extract_opening_closing, is_food_destination, is_slot_suitable
from services.geo_calculator import haversine_km, are_clusters_same_day_compatible

class TestGoldenScenarios(unittest.TestCase):
    def test_all_30_golden_scenarios(self):
        golden_dir = os.path.join(os.path.dirname(__file__), "golden")
        self.assertTrue(os.path.exists(golden_dir), f"Golden directory not found: {golden_dir}")

        json_files = sorted([f for f in os.listdir(golden_dir) if f.endswith(".json")])
        self.assertEqual(len(json_files), 30, f"Expected 30 golden scenario files, found {len(json_files)}")

        print(f"\n[GoldenTests] Validating all {len(json_files)} golden scenarios against expected assertions...")

        for fname in json_files:
            fpath = os.path.join(golden_dir, fname)
            with open(fpath, "r", encoding="utf-8") as f:
                payload = json.load(f)

            expect = payload.get("expect", {})
            constraints = parse_plan_request(payload)
            plan = VistaMasterPlanner.generate_plan(constraints)
            serialized = serialize_plan(plan, request_id=f"req-{fname}")

            prov_dests = data_loader.get_by_province(constraints.destination_province)

            # 1. Assert against explicit 'expect' block
            if "expected_province" in expect:
                canonical = data_loader.get_canonical_province_name(expect["expected_province"])
                self.assertEqual(serialized["destination_province"], canonical, f"Scenario {fname}: province mismatch")

            if "min_days" in expect:
                expected_active_days = min(expect["min_days"], len(prov_dests))
                self.assertGreaterEqual(
                    serialized["total_days"],
                    min(1, expected_active_days),
                    f"Scenario {fname}: days mismatch"
                )
                self.assertLessEqual(
                    serialized["total_days"],
                    expect["min_days"],
                    f"Scenario {fname}: total_days exceeded requested min_days"
                )

            total_acts = sum(len(d.activities) for d in plan.days)
            expected_min_acts = expect.get("min_total_activities", 0)

            if len(prov_dests) >= constraints.total_days * 2 and not constraints.has_elderly:
                required_min = max(expected_min_acts, plan.total_days * 2)
            else:
                required_min = expected_min_acts

            required_min = min(required_min, len(prov_dests))

            if required_min > 0:
                self.assertGreaterEqual(total_acts, required_min, f"Scenario {fname}: total activities too low (got {total_acts}, expected >= {required_min})")

            banned_loads = expect.get("must_not_contain_walking_load", [])
            for day in plan.days:
                for act in day.activities:
                    db_item = data_loader.get_by_id(act.destination_id)
                    if db_item and banned_loads:
                        self.assertNotIn(db_item.walking_load, banned_loads, f"Scenario {fname}: found banned walking load {db_item.walking_load}")

            # 2. General contract and financial consistency (no empty day charged)
            self.assertEqual(serialized["people_count"], constraints.people_count)
            self.assertGreater(serialized["estimated_total_cost_vnd"], 0)
            self.assertGreaterEqual(serialized["max_fluctuation_vnd"], serialized["estimated_total_cost_vnd"])
            self.assertLessEqual(serialized["min_fluctuation_vnd"], serialized["estimated_total_cost_vnd"])
            self.assertEqual(len(serialized["days"]), serialized["total_days"])

            max_leg_min = config.get_max_leg_minutes(constraints.has_elderly, constraints.has_children)
            max_daily_transit_min = config.get_max_daily_transit_minutes(constraints.has_elderly, constraints.has_children)

            # 3. Hard Plausibility Invariants check (Stage 1 & Stage 9.1)
            used_ids = set()
            for day in plan.days:
                # Section 7 & 10 (#12): All requested days are preserved; if a day has no stops, it must be marked FREE_DAY/DEPARTURE_ONLY with subtotal 0
                if len(day.activities) == 0:
                    self.assertEqual(day.subtotal_cost_vnd, 0, f"Scenario {fname}: empty day charged")
                    self.assertIn(day.day_status, ("FREE_DAY", "NO_SUITABLE_STOPS", "DEPARTURE_ONLY"), f"Scenario {fname}: empty day {day.day_number} not marked clearly")

                prev_end = None
                prev_act = None
                day_clusters = []
                day_transit_sum = 0

                for act in day.activities:
                    db_item = data_loader.get_by_id(act.destination_id)
                    self.assertIsNotNone(db_item, f"Scenario {fname}: dest {act.destination_id} not found in DB")

                    # Invariant 1: Non-overlapping times
                    st = time_to_minutes(act.start_time)
                    et = time_to_minutes(act.end_time)
                    self.assertGreater(et, st, f"Scenario {fname}: invalid time range in {act.destination_name}")
                    if prev_end is not None:
                        self.assertGreaterEqual(st, prev_end, f"Scenario {fname}: overlapping in day {day.day_number}")

                    # Invariant 2: Closing time
                    _, close_min = extract_opening_closing(db_item)
                    self.assertLessEqual(et, close_min + 1)

                    # Invariant 3: No duplicate dest across days
                    self.assertNotIn(act.destination_id, used_ids, f"Scenario {fname}: duplicate dest {act.destination_id}")
                    used_ids.add(act.destination_id)

                    # Invariant 4: Leg transit ceiling & Daily transit ceiling
                    self.assertLessEqual(
                        act.travel_time_from_prev_min,
                        max_leg_min,
                        f"Scenario {fname}: leg to {act.destination_name} ({act.travel_time_from_prev_min}m) exceeds ceiling {max_leg_min}m"
                    )
                    day_transit_sum += act.travel_time_from_prev_min
                    self.assertLessEqual(
                        day_transit_sum,
                        max_daily_transit_min,
                        f"Scenario {fname}: daily transit ({day_transit_sum}m) exceeds ceiling {max_daily_transit_min}m"
                    )

                    # Invariant 5: Same-day geographic cluster compatibility
                    if db_item.cluster_id:
                        for prev_cid in day_clusters:
                            self.assertTrue(
                                are_clusters_same_day_compatible(prev_cid, db_item.cluster_id),
                                f"Scenario {fname}: incompatible clusters on day {day.day_number}: {prev_cid} vs {db_item.cluster_id}"
                            )
                        day_clusters.append(db_item.cluster_id)

                    # Invariant 6: Elderly safety
                    if constraints.has_elderly:
                        self.assertNotEqual(db_item.walking_load, "STRENUOUS")

                    # Invariant 7: Noon is genuine food suitable for NOON
                    if act.time_slot == "NOON":
                        self.assertTrue(
                            is_food_destination(db_item) and is_slot_suitable(db_item, "NOON"),
                            f"Scenario {fname}: non-food or night-only place at noon: {db_item.name}"
                        )

                    # Invariant 8: No must_avoid item scheduled
                    if constraints.must_avoid:
                        d_text = f"{db_item.name} {db_item.category}".lower()
                        for av in constraints.must_avoid:
                            self.assertNotIn(av.lower(), d_text, f"Scenario {fname}: avoided keyword '{av}' found in {db_item.name}")

                    prev_end = et
                    prev_act = act

        print(f"[GoldenTests] All {len(json_files)} golden scenarios verified successfully against expectations!")

if __name__ == "__main__":
    unittest.main()
