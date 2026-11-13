import unittest
import json
from api.contract import parse_plan_request, serialize_plan
from engine.planner import VistaMasterPlanner

class TestServerContract(unittest.TestCase):
    def test_parse_plan_request_aliases(self):
        # Test camelCase input (typical from Next.js / Java Spring)
        camel_data = {
            "destinationProvince": "Đà Nẵng",
            "totalDays": 2,
            "peopleCount": 4,
            "budgetTier": "premium",
            "hasElderly": True,
            "hasChildren": False,
            "interests": ["Ẩm thực", "Biển"]
        }
        c1 = parse_plan_request(camel_data)
        self.assertEqual(c1.destination_province, "Đà Nẵng")
        self.assertEqual(c1.total_days, 2)
        self.assertEqual(c1.people_count, 4)
        self.assertEqual(c1.budget_tier, "luxury")
        self.assertTrue(c1.has_elderly)
        self.assertFalse(c1.has_children)
        self.assertIn("Ẩm thực", c1.interests)

        # Test snake_case input
        snake_data = {
            "destination": "Đà Nẵng",
            "days": 2,
            "people": 4,
            "budget_tier": "premium",
            "has_elderly": True,
            "has_children": False,
            "interests": "Ẩm thực, Biển"
        }
        c2 = parse_plan_request(snake_data)
        self.assertEqual(c1.destination_province, c2.destination_province)
        self.assertEqual(c1.total_days, c2.total_days)
        self.assertEqual(c1.people_count, c2.people_count)
        self.assertEqual(c1.budget_tier, c2.budget_tier)
        self.assertEqual(c2.budget_tier, "luxury")
        self.assertEqual(c1.has_elderly, c2.has_elderly)

    def test_json_structure_and_types(self):
        input_data = {
            "destination": "Đà Nẵng",
            "days": 2,
            "people": 2,
            "budget_tier": "standard"
        }
        constraints = parse_plan_request(input_data)
        plan_obj = VistaMasterPlanner.generate_plan(constraints)

        # Serialize with simulated requestId from both server styles
        res_main = serialize_plan(plan_obj, request_id="req-main-123")
        res_standalone = serialize_plan(plan_obj, request_id="req-standalone-456")

        # Compare keys and types (ignoring request_id value)
        self.assertEqual(set(res_main.keys()), set(res_standalone.keys()))
        for key in res_main:
            if key == "request_id":
                continue
            self.assertEqual(type(res_main[key]), type(res_standalone[key]))
            self.assertEqual(res_main[key], res_standalone[key])

        # Verify required contract fields
        expected_fields = {
            "destination_province": str,
            "total_days": int,
            "people_count": int,
            "budget_tier": str,
            "estimated_total_cost_vnd": int,
            "min_fluctuation_vnd": int,
            "max_fluctuation_vnd": int,
            "days": list,
            "engine_version": str,
            "data_version": str,
            "fallback_used": bool,
            "warnings": list,
            "request_id": str,
        }
        for field, f_type in expected_fields.items():
            self.assertIn(field, res_main)
            self.assertIsInstance(res_main[field], f_type, f"Field {field} should be {f_type}")

        # Check day schedule schema
        self.assertGreater(len(res_main["days"]), 0)
        day1 = res_main["days"][0]
        self.assertIn("day_number", day1)
        self.assertIn("date_label", day1)
        self.assertIn("title", day1)
        self.assertIn("day_rationale", day1)
        self.assertIn("activities", day1)
        self.assertIn("subtotal_cost_vnd", day1)

        # Check activity slot schema
        self.assertGreater(len(day1["activities"]), 0)
        act1 = day1["activities"][0]
        self.assertIn("destination_id", act1)
        self.assertIn("destination_name", act1)
        self.assertIn("time_slot", act1)
        self.assertIn("start_time", act1)
        self.assertIn("end_time", act1)
        self.assertIn("category", act1)
        self.assertIn("cost_vnd", act1)
        self.assertIn("reasons", act1)

    def test_5_sample_requests_both_servers_identical_contract(self):
        sample_requests = [
            {"destination": "Đà Nẵng", "days": 3, "people": 4, "has_children": True, "budget_tier": "standard"},
            {"destinationProvince": "Thừa Thiên Huế", "totalDays": 2, "peopleCount": 2, "hasElderly": True, "budgetTier": "economy"},
            {"destination": "Hà Nội", "days": 1, "people": 1, "arrival_time": "08:30", "departure_time": "18:00"},
            {"destinationProvince": "Kiên Giang", "totalDays": 4, "peopleCount": 2, "budgetTier": "premium"},
            {"destination": "Ninh Bình", "days": 2, "people": 2, "budget_tier": "standard"}
        ]

        for idx, req in enumerate(sample_requests):
            constraints = parse_plan_request(req)
            plan = VistaMasterPlanner.generate_plan(constraints)

            res_fastapi_style = serialize_plan(plan, request_id=f"fastapi-{idx}")
            res_standalone_style = serialize_plan(plan, request_id=f"standalone-{idx}")

            # Verify identical schema and content across keys
            self.assertEqual(set(res_fastapi_style.keys()), set(res_standalone_style.keys()))
            for k in res_fastapi_style:
                if k == "request_id":
                    continue
                self.assertEqual(type(res_fastapi_style[k]), type(res_standalone_style[k]))
                self.assertEqual(res_fastapi_style[k], res_standalone_style[k])

if __name__ == "__main__":
    unittest.main()
