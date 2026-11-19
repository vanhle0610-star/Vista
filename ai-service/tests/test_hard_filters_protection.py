import unittest
from api.contract import ProvinceNotSupportedError, parse_plan_request
from engine.planner import VistaMasterPlanner
from data.loader import data_loader

class TestHardFiltersProtection(unittest.TestCase):
    def test_unknown_province_raises_exception(self):
        req = {
            "destinationProvince": "TinhKhongTonTai999",
            "totalDays": 3,
            "peopleCount": 2
        }
        constraints = parse_plan_request(req)
        with self.assertRaises(ProvinceNotSupportedError):
            VistaMasterPlanner.generate_plan(constraints)

    def test_elderly_never_contains_strenuous(self):
        # Province with mixed walking loads
        req = {
            "destinationProvince": "Đà Nẵng",
            "totalDays": 3,
            "peopleCount": 2,
            "hasElderly": True
        }
        constraints = parse_plan_request(req)
        plan = VistaMasterPlanner.generate_plan(constraints)

        # Inspect all activities in the plan
        for day in plan.days:
            for act in day.activities:
                db_item = data_loader.get_by_id(act.destination_id)
                self.assertIsNotNone(db_item, f"Destination {act.destination_id} must exist in DB")
                self.assertNotEqual(
                    db_item.walking_load,
                    "STRENUOUS",
                    f"Destination {db_item.name} has walking_load=STRENUOUS which is forbidden for elderly!"
                )

    def test_warnings_populated_when_dests_are_limited(self):
        # Ninh Bình with elderly + economy tier has fewer qualifying stops
        req = {
            "destinationProvince": "Ninh Bình",
            "totalDays": 4,
            "peopleCount": 2,
            "hasElderly": True,
            "budgetTier": "economy"
        }
        constraints = parse_plan_request(req)
        plan = VistaMasterPlanner.generate_plan(constraints)

        # Ensure no strenuous destinations made it into the plan
        for day in plan.days:
            for act in day.activities:
                db_item = data_loader.get_by_id(act.destination_id)
                if db_item:
                    self.assertNotEqual(db_item.walking_load, "STRENUOUS")

if __name__ == "__main__":
    unittest.main()

