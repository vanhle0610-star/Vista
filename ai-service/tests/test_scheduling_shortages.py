import unittest
from engine.planner import VistaMasterPlanner
from models.constraints import UserConstraints
from engine.timeline import time_to_minutes
from data.loader import data_loader

class TestSchedulingShortages(unittest.TestCase):
    def test_hue_arrival_1430_elderly_schedule(self):
        constraints = UserConstraints(
            destination_province="Thừa Thiên Huế",
            total_days=3,
            arrival_time="14:30",
            has_elderly=True,
            budget_tier="standard",
            people_count=3
        )
        plan = VistaMasterPlanner.generate_plan(constraints)
        self.assertEqual(plan.destination_province, "Thừa Thiên Huế")
        self.assertEqual(len(plan.days), 3)

        day1 = plan.days[0]
        day1_slots = [a.time_slot for a in day1.activities]

        # Verify Day 1 has AFTERNOON and EVENING if available, or has explanatory warning
        if "AFTERNOON" in day1_slots and "EVENING" in day1_slots:
            self.assertIn("AFTERNOON", day1_slots)
            self.assertIn("EVENING", day1_slots)
        else:
            self.assertTrue(any("Ngày 1 chỉ xếp được" in w for w in plan.warnings))

        # Check all invariants
        used_ids = set()
        for day in plan.days:
            prev_end = 0
            for act in day.activities:
                # 1. No duplicate destination across days
                self.assertNotIn(act.destination_id, used_ids)
                used_ids.add(act.destination_id)

                # 2. No overlapping times within day
                start_m = time_to_minutes(act.start_time)
                end_m = time_to_minutes(act.end_time)
                self.assertGreater(end_m, start_m)
                self.assertGreaterEqual(start_m, prev_end)
                prev_end = end_m

                # 3. Elderly: no STRENUOUS walking load
                dest = data_loader.get_by_id(act.destination_id)
                if dest:
                    self.assertNotEqual(dest.walking_load, "STRENUOUS")

                # 4. NOON slot is food
                if act.time_slot == "NOON":
                    norm_food = (act.destination_name + " " + act.category).lower()
                    is_food = any(k in norm_food for k in ["ẩm thực", "ăn", "quán", "cơm", "bún", "chè", "chợ", "bánh", "phở"])
                    self.assertTrue(is_food)

    def test_explicit_warning_on_shortage(self):
        # Province with very few points or tight constraints
        constraints = UserConstraints(
            destination_province="Hậu Giang",
            total_days=4,
            budget_tier="economy",
            people_count=2
        )
        plan = VistaMasterPlanner.generate_plan(constraints)
        # Should have warnings if days cannot fill all nominal slots
        total_slots = sum(len(d.activities) for d in plan.days)
        if total_slots < 4 * 3:
            self.assertTrue(len(plan.warnings) > 0)

    def test_night_market_not_in_morning_or_afternoon(self):
        from engine.timeline import is_slot_suitable
        from models.destination import Destination
        d_night = Destination(
            id="d-night",
            name="Chợ đêm Helio",
            province="Đà Nẵng",
            category="Cảnh quan & Check-in",
            latitude=16.03,
            longitude=108.22,
            price_min=0,
            price_max=0,
            opening_hours={"mon": "17:00-23:00"}
        )
        self.assertFalse(is_slot_suitable(d_night, "MORNING"))
        self.assertFalse(is_slot_suitable(d_night, "NOON"))
        self.assertFalse(is_slot_suitable(d_night, "AFTERNOON"))
        self.assertTrue(is_slot_suitable(d_night, "EVENING"))

    def test_closed_venue_substituted_from_pool(self):
        from engine.timeline import DailyTimelineEngine
        from models.destination import Destination
        # Place 1: Closed in morning (opens 14:00)
        d_closed_morning = Destination(
            id="d-closed",
            name="Điểm chiều tối",
            province="Đà Nẵng",
            category="Tham quan",
            latitude=16.05,
            longitude=108.20,
            price_min=0,
            price_max=0,
            opening_hours={"open": "14:00", "close": "21:00"}
        )
        # Place 2: Open in morning (opens 08:00)
        d_open_morning = Destination(
            id="d-open",
            name="Bảo tàng sáng",
            province="Đà Nẵng",
            category="Tham quan",
            latitude=16.06,
            longitude=108.21,
            price_min=0,
            price_max=0,
            opening_hours={"open": "08:00", "close": "17:00"}
        )
        constraints = UserConstraints(destination_province="Đà Nẵng", total_days=1)
        # Pass d_closed_morning first, and d_open_morning in candidate_pool
        slots = DailyTimelineEngine.assemble_day_timeline(
            1,
            selected_dests=[d_closed_morning],
            constraints=constraints,
            scheduled_slots=["MORNING"],
            candidate_pool=[d_closed_morning, d_open_morning],
            max_stops=1
        )
        self.assertEqual(len(slots), 1)
        self.assertEqual(slots[0].destination_id, "d-open")

    def test_plan_financial_breakdown_exposed(self):
        constraints = UserConstraints(destination_province="Đà Nẵng", total_days=2, people_count=2)
        plan = VistaMasterPlanner.generate_plan(constraints)
        self.assertIsNotNone(plan.breakdown)
        bd = plan.breakdown
        self.assertIn("activities_cost", bd)
        self.assertIn("hotel_cost", bd)
        self.assertIn("transport_cost", bd)
        self.assertIn("meal_cost", bd)
        self.assertIn("contingency_cost", bd)
        computed_sum = bd["activities_cost"] + bd["hotel_cost"] + bd["transport_cost"] + bd["meal_cost"] + bd["contingency_cost"]
        self.assertEqual(plan.estimated_total_cost_vnd, computed_sum)

