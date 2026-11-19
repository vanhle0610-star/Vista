import unittest
import json
from intent.intent_parser import IntentParserEngine
from engine.replanner import VistaReplannerEngine
from engine.planner import VistaMasterPlanner
from models.constraints import UserConstraints

class TestAiIntelligence(unittest.TestCase):
    def test_intent_parsing_elderly_family(self):
        prompt = "Gia đình mình có bố mẹ 70 tuổi đi Huế 2 ngày 1 đêm thong thả, ăn đặc sản"
        res = IntentParserEngine.parse_intent(prompt)
        self.assertEqual(res["destination"], "Thừa Thiên Huế")
        self.assertEqual(res["total_days"], 2)
        self.assertTrue(res["has_elderly"])
        self.assertEqual(res["pace"], "RELAXED")
        self.assertIn("ẩm thực bản địa", res["interests"])

    def test_intent_parsing_flight_times_luxury(self):
        prompt = "Cặp đôi đi Phú Quốc 4 ngày luxury, hạ cánh 11h trưa và về lúc 17:00, không lo về giá"
        res = IntentParserEngine.parse_intent(prompt)
        self.assertEqual(res["destination"], "Kiên Giang")
        self.assertEqual(res["total_days"], 4)
        self.assertEqual(res["budget_tier"], "luxury")
        self.assertEqual(res["arrival_time"], "11:00")
        self.assertEqual(res["departure_time"], "17:00")

    def test_intent_parsing_economy_quick(self):
        prompt = "Sinh viên tiết kiệm đi phượt Đà Lạt 3N2Đ, thích check-in sống ảo và cafe"
        res = IntentParserEngine.parse_intent(prompt)
        self.assertEqual(res["destination"], "Lâm Đồng")
        self.assertEqual(res["total_days"], 3)
        self.assertEqual(res["budget_tier"], "economy")
        self.assertIn("check-in sống ảo", res["interests"])

    def test_replanner_rain_mode(self):
        # Generate baseline plan for Da Nang
        constraints = UserConstraints(
            destination_province="Đà Nẵng",
            total_days=2,
            people_count=2,
            budget_tier="standard"
        )
        plan_obj = VistaMasterPlanner.generate_plan(constraints)
        from api.contract import serialize_plan
        plan_dict = serialize_plan(plan_obj)

        # Apply rain mode to Day 1
        updated = VistaReplannerEngine.replan_itinerary(
            plan_dict,
            instruction="Trời mưa to rồi, hãy đổi các điểm ngoài trời ngày 1 thành điểm trong nhà",
            constraints_data={"has_elderly": False}
        )

        self.assertIn("warnings", updated)
        # Check that replan occurred
        any_replan_warning = any("AI Co-Pilot" in w for w in updated["warnings"])
        self.assertTrue(any_replan_warning)
        # Check budget consistency
        self.assertGreater(updated["estimated_total_cost_vnd"], 0)
        self.assertEqual(
            updated["breakdown"]["activities_cost"],
            sum(act["cost_vnd"] for d in updated["days"] for act in d["activities"])
        )

    def test_replanner_sleep_in(self):
        constraints = UserConstraints(
            destination_province="Hà Nội",
            total_days=2,
            people_count=2,
            budget_tier="standard"
        )
        plan_obj = VistaMasterPlanner.generate_plan(constraints)
        from api.contract import serialize_plan
        plan_dict = serialize_plan(plan_obj)

        updated = VistaReplannerEngine.replan_itinerary(
            plan_dict,
            instruction="Sáng ngày 1 muốn ngủ nướng đến 10:00 mới đi",
            constraints_data={"has_elderly": False}
        )

        first_act = updated["days"][0]["activities"][0]
        self.assertGreaterEqual(first_act["start_time"], "10:00")

if __name__ == "__main__":
    unittest.main()

