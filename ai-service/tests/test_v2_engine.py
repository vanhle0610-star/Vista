import sys
import os
import unittest

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from models.constraints import UserConstraints
from engine.planner import VistaMasterPlanner
from data.loader import data_loader

class TestVistaAgenticEngineV2(unittest.TestCase):
    def test_database_loaded(self):
        self.assertGreaterEqual(len(data_loader.destinations), 100)
        hue_dests = data_loader.get_by_province("Thừa Thiên Huế")
        self.assertGreaterEqual(len(hue_dests), 3)

    @unittest.skipUnless(os.getenv("REAL_SEED_PATH"), "REAL_SEED_PATH not configured")
    def test_database_real_seed(self):
        real_path = os.getenv("REAL_SEED_PATH")
        self.assertTrue(os.path.exists(real_path))

    def test_plan_generation_hue(self):
        constraints = UserConstraints(
            destination_province="Thừa Thiên Huế",
            total_days=3,
            people_count=2,
            interests=["ẩm thực", "chè", "di tích"],
            has_elderly=True
        )
        plan = VistaMasterPlanner.generate_plan(constraints)
        self.assertEqual(plan.destination_province, "Thừa Thiên Huế")
        self.assertEqual(len(plan.days), 3)
        self.assertGreater(plan.estimated_total_cost_vnd, 1000000)

        # Property tests:
        seen_dest_ids = set()
        for d in plan.days:
            self.assertGreater(len(d.activities), 0)
            self.assertTrue(len(d.day_rationale) > 20)
            for a in d.activities:
                # 1. No placeholder names
                self.assertNotIn("trải nghiệm điểm đến 1.1", a.destination_name.lower())
                self.assertNotIn("trải nghiệm điểm đến 1.2", a.destination_name.lower())
                # 2. Check no duplicate non-hotel destinations across the plan
                self.assertNotIn(a.destination_id, seen_dest_ids)
                seen_dest_ids.add(a.destination_id)
                # 3. If snack/che, price must be <= 30000
                if any(k in a.destination_name.lower() for k in ["chè", "bánh mì", "cà phê"]):
                    per_person = a.cost_vnd // constraints.people_count
                    self.assertLessEqual(per_person, 30000)
                    self.assertGreaterEqual(per_person, 10000)

    def test_plan_generation_danang(self):
        constraints = UserConstraints(
            destination_province="Đà Nẵng",
            total_days=3,
            people_count=4,
            interests=["biển", "ẩm thực"],
            has_elderly=False
        )
        plan = VistaMasterPlanner.generate_plan(constraints)
        self.assertEqual(plan.destination_province, "Đà Nẵng")
        self.assertEqual(len(plan.days), 3)
        # Check noon slot is culinary
        for d in plan.days:
            noon_acts = [a for a in d.activities if a.time_slot == "NOON"]
            if noon_acts:
                self.assertIn("ẩm thực", (noon_acts[0].category + noon_acts[0].destination_name).lower())

if __name__ == "__main__":
    unittest.main()

