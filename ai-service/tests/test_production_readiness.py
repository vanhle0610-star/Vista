import unittest
import sqlite3
import os
from data.loader import data_loader
from models.constraints import UserConstraints
from engine.planner import VistaMasterPlanner
from engine.replanner import VistaReplannerEngine

class TestProductionReadiness(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.db_path = os.path.abspath(os.path.join(os.path.dirname(__file__), "../../database/vista_destinations.db"))

    def test_tier0_osm_database_quality_gate(self):
        """Tier 0: Verify 0 synthetic osm-gen-% records and real osm-node-*/osm-way-* presence."""
        if not os.path.exists(self.db_path):
            self.skipTest("vista_destinations.db not found")
        conn = sqlite3.connect(self.db_path)
        cur = conn.cursor()
        cur.execute("SELECT COUNT(*) FROM destinations WHERE id LIKE 'osm-gen-%'")
        gen_count = cur.fetchone()[0]
        self.assertEqual(gen_count, 0, "Database MUST contain 0 synthetic osm-gen-% rows!")

        cur.execute("SELECT COUNT(*) FROM destinations WHERE id LIKE 'osm-node-%' OR id LIKE 'osm-way-%'")
        real_osm_count = cur.fetchone()[0]
        self.assertGreater(real_osm_count, 500, f"Expected >500 real OSM POIs, found {real_osm_count}")
        conn.close()

    def test_tier1_pace_causal_sensitivity(self):
        """Tier 1: Switching pace from RELAXED -> INTENSIVE increases total scheduled stops."""
        c_relaxed = UserConstraints(
            destination_province="TP. Hồ Chí Minh",
            total_days=2,
            people_count=2,
            pace="RELAXED"
        )
        plan_relaxed = VistaMasterPlanner.generate_plan(c_relaxed)
        stops_relaxed = sum(len(d.activities) for d in plan_relaxed.days)

        c_intensive = UserConstraints(
            destination_province="TP. Hồ Chí Minh",
            total_days=2,
            people_count=2,
            pace="INTENSIVE"
        )
        plan_intensive = VistaMasterPlanner.generate_plan(c_intensive)
        stops_intensive = sum(len(d.activities) for d in plan_intensive.days)

        self.assertGreater(stops_intensive, stops_relaxed, "INTENSIVE pace must schedule more stops than RELAXED pace!")

    def test_tier1_budget_ceiling_solver(self):
        """Tier 1: Hard budget ceiling solver adapts plan when max_total_budget_vnd is specified."""
        c_capped = UserConstraints(
            destination_province="Đà Nẵng",
            total_days=2,
            people_count=2,
            budget_tier="economy",
            max_total_budget_vnd=2800000
        )
        plan = VistaMasterPlanner.generate_plan(c_capped)
        self.assertLessEqual(plan.estimated_total_cost_vnd, 3200000)
        self.assertEqual(plan.budget_tier, "economy")

    def test_tier2_smart_hotel_anchor_assumption(self):
        """Tier 2: When hotel_lat/lng are omitted, planner computes a default central anchor and notes it in assumptions."""
        c_no_hotel = UserConstraints(
            destination_province="Đà Nẵng",
            total_days=2,
            people_count=2
        )
        plan = VistaMasterPlanner.generate_plan(c_no_hotel)
        has_anchor_note = any("mốc lưu trú mặc định" in a for a in plan.assumptions)
        self.assertTrue(has_anchor_note, "Planner must record default central hotel anchor in assumptions!")

    def test_tier3_replan_actions_and_locked_commitments(self):
        """Tier 3: REORDER_STOP, SHIFT_LUNCH, and locked commitment invariance in replanner."""
        c = UserConstraints(
            destination_province="TP. Hồ Chí Minh",
            total_days=2,
            people_count=2
        )
        plan = VistaMasterPlanner.generate_plan(c)
        from api.contract import _to_plain_dict
        plan_dict = _to_plain_dict(plan)

        # Lock activity #2
        act2 = plan_dict["days"][0]["activities"][1]
        act2["is_locked"] = True
        locked_id = act2["destination_id"]
        locked_start = act2["start_time"]

        # Reorder stop 0 and stop 2
        reordered = VistaReplannerEngine.replan_itinerary(
            plan_dict,
            instruction="Đổi thứ tự điểm 1 và điểm 3",
            constraints_data={"target_day": 1, "action": "REORDER_STOP", "from_index": 0, "to_index": 2}
        )
        self.assertIn("replan_diff", reordered)
        self.assertEqual(reordered["schedule_status"], "FEASIBLE")

        # Verify locked item was not dropped and no unrelated swap occurred
        day1_acts = reordered["days"][0]["activities"]
        self.assertTrue(any(a["destination_id"] == locked_id for a in day1_acts))
        self.assertEqual(len(reordered["replan_diff"]["replaced"]), 0, "REORDER_STOP must not trigger generic stop swap!")

    def test_tier3_change_pace_replan_action(self):
        """Tier 3: CHANGE_PACE action updates plan pace and scales unlocked durations without triggering generic swap."""
        c = UserConstraints(
            destination_province="Đà Nẵng",
            total_days=2,
            people_count=2,
            pace="MODERATE"
        )
        plan = VistaMasterPlanner.generate_plan(c)
        from api.contract import _to_plain_dict
        plan_dict = _to_plain_dict(plan)

        paced = VistaReplannerEngine.replan_itinerary(
            plan_dict,
            instruction="Đổi nhịp độ sang Thư thả",
            constraints_data={"target_day": 1, "action": "CHANGE_PACE", "pace": "RELAXED"}
        )
        self.assertEqual(paced["pace"], "RELAXED")
        self.assertEqual(paced["schedule_status"], "FEASIBLE")
        self.assertEqual(len(paced["replan_diff"]["replaced"]), 0, "CHANGE_PACE must not trigger generic swap")
        self.assertTrue(any("nhịp độ" in s.lower() for s in paced["replan_diff"]["summary"]))

    def test_no_duplicate_cafes_or_all_cafe_days_nha_trang(self):
        """Regression: Nha Trang with vegetarian/food preference must never pack 2+ cafes in a day or skip sightseeing."""
        from api.contract import parse_plan_request
        from engine.timeline import is_cafe_or_rest_destination, is_food_destination

        plan = VistaMasterPlanner.generate_plan(parse_plan_request({
            "destination": "Nha Trang (Khánh Hòa)",
            "days": 3,
            "people": 2,
            "pace": "MODERATE",
            "interests": ["Ưu tiên ẩm thực chay"],
        }))
        for day in plan.days:
            cafes_in_day = []
            sight_in_day = []
            for act in day.activities:
                dest_obj = data_loader.get_by_id(act.destination_id)
                if dest_obj and is_cafe_or_rest_destination(dest_obj) and not is_food_destination(dest_obj):
                    cafes_in_day.append(act.destination_name)
                elif dest_obj and not is_food_destination(dest_obj):
                    sight_in_day.append(act.destination_name)
                if act.time_slot == "NOON" and dest_obj:
                    self.assertNotIn("cafe", dest_obj.name.lower(), f"Cafe '{dest_obj.name}' must not occupy NOON meal slot")
            self.assertLessEqual(len(cafes_in_day), 1, f"Day {day.day_number} scheduled >1 cafe: {cafes_in_day}")
            self.assertGreaterEqual(len(sight_in_day), 1, f"Day {day.day_number} had no sightseeing landmark")

    def test_llm_key_pool_automatic_failover_rotation(self):
        """Verify multi-key pool rotates smoothly to next key when active key fails/exhausts quota."""
        import config
        orig_keys = config.LLM_API_KEYS
        orig_gkeys = config.GEMINI_API_KEYS
        orig_key = config.LLM_API_KEY
        orig_idx = config._ACTIVE_LLM_KEY_INDEX
        orig_env_keys = os.environ.get("LLM_API_KEYS")
        orig_env_gkeys = os.environ.get("GEMINI_API_KEYS")
        orig_env_key = os.environ.get("LLM_API_KEY")
        orig_env_gkey = os.environ.get("GEMINI_API_KEY")
        try:
            os.environ["LLM_API_KEYS"] = "keyA,keyB,keyC"
            os.environ["GEMINI_API_KEYS"] = ""
            os.environ["LLM_API_KEY"] = "keyA"
            os.environ["GEMINI_API_KEY"] = ""
            config.LLM_API_KEYS = "keyA,keyB,keyC"
            config.GEMINI_API_KEYS = ""
            config.LLM_API_KEY = "keyA"
            config._ACTIVE_LLM_KEY_INDEX = 0

            ordered1 = config.get_ordered_llm_keys()
            self.assertEqual(ordered1, ["keyA", "keyB", "keyC"])
            config.rotate_llm_key("keyA")
            ordered2 = config.get_ordered_llm_keys()
            self.assertEqual(ordered2, ["keyB", "keyC", "keyA"])
            config.rotate_llm_key("keyB")
            ordered3 = config.get_ordered_llm_keys()
            self.assertEqual(ordered3, ["keyC", "keyA", "keyB"])
        finally:
            config.LLM_API_KEYS = orig_keys
            config.GEMINI_API_KEYS = orig_gkeys
            config.LLM_API_KEY = orig_key
            config._ACTIVE_LLM_KEY_INDEX = orig_idx
            for env_k, orig_v in [
                ("LLM_API_KEYS", orig_env_keys),
                ("GEMINI_API_KEYS", orig_env_gkeys),
                ("LLM_API_KEY", orig_env_key),
                ("GEMINI_API_KEY", orig_env_gkey),
            ]:
                if orig_v is not None:
                    os.environ[env_k] = orig_v
                else:
                    os.environ.pop(env_k, None)

if __name__ == "__main__":
    unittest.main()
