from api.contract import serialize_plan
import unittest
import random
from models.constraints import UserConstraints
from engine.planner import VistaMasterPlanner
from engine.timeline import time_to_minutes, extract_opening_closing, is_food_destination, is_slot_suitable
from data.loader import data_loader
from services.geo_calculator import haversine_km, are_clusters_same_day_compatible
import config

class TestPropertyBasedInvariants(unittest.TestCase):
    def test_500_random_scenarios_invariants(self):
        rng = random.Random(12345)
        provinces = list(set(d.province for d in data_loader.destinations))
        self.assertGreaterEqual(len(provinces), 63, "Must test across all 63 provinces")

        budget_tiers = ["economy", "standard", "luxury"]
        arrivals = [None, "08:30", "12:00", "14:30"]
        departures = [None, "12:30", "16:00", "20:30"]

        print(f"\n[PropertyTest] Running 500 randomized property tests across {len(provinces)} provinces...")

        for i in range(500):
            prov = rng.choice(provinces)
            days = rng.randint(1, 3)
            people = rng.randint(1, 6)
            has_elderly = rng.random() < 0.35
            has_children = rng.random() < 0.35
            tier = rng.choice(budget_tiers)
            arr = rng.choice(arrivals)
            dep = rng.choice(departures)

            constraints = UserConstraints(
                destination_province=prov,
                total_days=days,
                people_count=people,
                budget_tier=tier,
                has_elderly=has_elderly,
                has_children=has_children,
                arrival_time=arr,
                departure_time=dep
            )

            try:
                plan = VistaMasterPlanner.generate_plan(constraints)
            except Exception as e:
                self.fail(f"Scenario {i+1} failed with exception: {e}")

            all_dest_ids = []
            active_days_list = [d for d in plan.days if len(d.activities) > 0]
            active_days_count = len(active_days_list)

            # 1. Independent financial line sum recalculation (Mục 7: hotel nights match total trip days, transport/meals match active days)
            calc_activities = sum(act.cost_vnd for day in active_days_list for act in day.activities)
            hotel_rate = config.ROOM_RATES_PER_NIGHT.get(plan.budget_tier, config.ROOM_RATES_PER_NIGHT["standard"])
            rooms = (people + 1) // 2
            nights = max(0, len(plan.days) - 1)
            calc_hotel = 0 if getattr(constraints, "has_hotel", False) else (hotel_rate * nights * rooms)
            trans_rate = config.DAILY_TRANSPORT_RATES.get(plan.budget_tier, config.DAILY_TRANSPORT_RATES["standard"])
            calc_trans = trans_rate * active_days_count
            meal_rate = config.DAILY_MEAL_RATES.get(plan.budget_tier, config.DAILY_MEAL_RATES["standard"])
            calc_meal = 0
            for d in active_days_list:
                base_day_m = meal_rate * people
                noon_food_cost = sum(a.cost_vnd for a in d.activities if (a.time_slot == "NOON" or getattr(a, "item_type", "") in ("MEAL", "MEAL_BREAK")) and a.cost_vnd > 0)
                deduct = min(int(base_day_m * 0.40), noon_food_cost)
                calc_meal += max(0, base_day_m - deduct)
            calc_subtotal = calc_activities + calc_hotel + calc_trans + calc_meal
            calc_contingency = int(calc_subtotal * config.CONTINGENCY_RATE)
            calc_grand_total = calc_subtotal + calc_contingency
            self.assertEqual(
                plan.estimated_total_cost_vnd,
                calc_grand_total,
                f"Iter {i}: Total cost {plan.estimated_total_cost_vnd} != independent sum {calc_grand_total}"
            )

            max_leg_min = config.get_max_leg_minutes(has_elderly, has_children)
            max_daily_transit_min = config.get_max_daily_transit_minutes(has_elderly, has_children)

            self.assertEqual(len(plan.days), days, f"Iter {i}: Must preserve all requested days ({days})")
            for day in plan.days:
                # Section 7: Empty days must never be charged for activities and must have clear day_status
                if len(day.activities) == 0:
                    self.assertEqual(day.subtotal_cost_vnd, 0, f"Iter {i}: Empty day charged in {prov}")
                    self.assertIn(day.day_status, ("FREE_DAY", "NO_SUITABLE_STOPS", "DEPARTURE_ONLY"), f"Iter {i}: Empty day missing status in {prov}")

                prev_end = None
                prev_act = None
                day_clusters = []
                day_transit_sum = 0

                for act in day.activities:
                    db_item = data_loader.get_by_id(act.destination_id)
                    self.assertIsNotNone(db_item, f"Iter {i}: Dest {act.destination_id} not in DB")

                    # Invariant 1: Không bị trùng giờ trong ngày (start >= prev_end)
                    start_min = time_to_minutes(act.start_time)
                    end_min = time_to_minutes(act.end_time)
                    self.assertGreater(end_min, start_min, f"Iter {i}: Activity duration <= 0: {act.destination_name}")

                    if prev_end is not None:
                        self.assertGreaterEqual(
                            start_min,
                            prev_end,
                            f"Iter {i}: Overlapping activities in day {day.day_number}: {prev_act.destination_name} ({prev_act.end_time}) -> {act.destination_name} ({act.start_time})"
                        )

                    # Invariant 2: Kết thúc trước hoặc đúng giờ đóng cửa (tolerance 1 min)
                    _, close_min = extract_opening_closing(db_item)
                    self.assertLessEqual(
                        end_min,
                        close_min + 1,
                        f"Iter {i}: Activity {act.destination_name} ends at {act.end_time} after venue closes at {close_min//60}:{close_min%60:02d}"
                    )

                    # Invariant 4 (Stage 1.1 & 1.2): Trần thời gian mỗi chặng & trần tổng thời gian di chuyển mỗi ngày
                    self.assertLessEqual(
                        act.travel_time_from_prev_min,
                        max_leg_min,
                        f"Iter {i}: Leg transit {act.travel_time_from_prev_min}m exceeds ceiling {max_leg_min}m"
                    )
                    day_transit_sum += act.travel_time_from_prev_min
                    self.assertLessEqual(
                        day_transit_sum,
                        max_daily_transit_min,
                        f"Iter {i}: Daily transit {day_transit_sum}m exceeds ceiling {max_daily_transit_min}m"
                    )

                    # Stage 1.3: Không xếp 2 điểm khác cụm địa lý/đảo cùng một ngày
                    if db_item.cluster_id:
                        for prev_cid in day_clusters:
                            self.assertTrue(
                                are_clusters_same_day_compatible(prev_cid, db_item.cluster_id),
                                f"Iter {i}: Incompatible clusters in same day: {prev_cid} vs {db_item.cluster_id}"
                            )
                        day_clusters.append(db_item.cluster_id)

                    # Invariant 5: Nếu has_elderly=True thì 100% điểm không có walking_load='STRENUOUS'
                    if has_elderly:
                        self.assertNotEqual(
                            db_item.walking_load,
                            "STRENUOUS",
                            f"Iter {i}: Strenuous place {db_item.name} assigned to elderly group!"
                        )

                    # Invariant 6: Điểm buổi trưa (NOON) nếu có thì phải là điểm ăn uống/ẩm thực phù hợp buổi trưa
                    if act.time_slot == "NOON":
                        self.assertTrue(
                            is_food_destination(db_item) and is_slot_suitable(db_item, "NOON"),
                            f"Iter {i}: Non-food or night-only venue {db_item.name} assigned to NOON slot"
                        )

                    prev_end = end_min
                    prev_act = act
                    all_dest_ids.append(act.destination_id)

            # Invariant 3: Không có destination nào xuất hiện 2 lần trong toàn bộ chuyến đi
            self.assertEqual(
                len(all_dest_ids),
                len(set(all_dest_ids)),
                f"Iter {i}: Duplicate destination across days in {prov}: {all_dest_ids}"
            )

        print("[PropertyTest] Passed all 500 randomized property invariant tests successfully!")

    def test_serialized_breakdown_activities_cost_invariant(self):
        """
        Property Test: In the final serialized JSON contract, breakdown.activities_cost
        MUST strictly equal the exact arithmetic sum of cost_vnd of every activity across all days.
        """
        test_cases = [
            ("Đà Nẵng", 3, 2, "standard"),
            ("Thừa Thiên Huế", 2, 4, "economy"),
            ("Hà Nội", 1, 2, "standard"),
            ("Hồ Chí Minh", 2, 2, "luxury"),
            ("Phú Quốc", 4, 2, "luxury"),
        ]
        for prov, days, people, tier in test_cases:
            c = UserConstraints(
                destination_province=prov,
                total_days=days,
                people_count=people,
                budget_tier=tier
            )
            plan = VistaMasterPlanner.generate_plan(c)
            res = serialize_plan(plan, request_id="prop-test")
            self.assertIn("breakdown", res)
            self.assertIn("activities_cost", res["breakdown"])

            sum_activities_cost = sum(
                act["cost_vnd"]
                for day in res["days"]
                for act in day["activities"]
            )
            self.assertEqual(
                res["breakdown"]["activities_cost"],
                sum_activities_cost,
                f"Breakdown activities_cost {res['breakdown']['activities_cost']} != sum of serialized activities {sum_activities_cost} for {prov}"
            )

if __name__ == "__main__":
    unittest.main()
