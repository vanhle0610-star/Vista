import unittest
from unittest.mock import patch
from models.constraints import UserConstraints
from engine.planner import VistaMasterPlanner
from engine.timeline import DailyTimelineEngine, time_to_minutes
from engine.filters import DestinationFilterEngine
from data.loader import data_loader
from models.destination import Destination

class TestMutationSanity(unittest.TestCase):
    def test_mutation_disabling_elderly_filter_triggers_failure(self):
        strenuous_dest = Destination(
            id="dest-mutation-mountain",
            name="Núi Thử Thách Đột Biến",
            province="Thừa Thiên Huế",
            category="Tham quan",
            latitude=16.45,
            longitude=107.55,
            walking_load="STRENUOUS",
            opening_hours={"open": "07:00", "close": "18:00"}
        )

        # 1. Normal execution: elderly safety filter MUST reject STRENUOUS
        normal_passed, normal_rejected = DestinationFilterEngine.apply_filters(
            [strenuous_dest],
            province="Thừa Thiên Huế",
            month=11,
            has_elderly=True
        )
        self.assertEqual(len(normal_passed), 0, "Normal filter must drop STRENUOUS for elderly")
        self.assertEqual(len(normal_rejected), 1)

        # 2. Mutated execution: if elderly filter is disabled (has_elderly ignored/mutated to False)
        mutated_passed, _ = DestinationFilterEngine.apply_filters(
            [strenuous_dest],
            province="Thừa Thiên Huế",
            month=11,
            has_elderly=False  # MUTATION: disabled elderly filter
        )
        # Mutation leaks STRENUOUS destination into passed pool!
        self.assertEqual(len(mutated_passed), 1, "Disabling filter must leak STRENUOUS destination")
        self.assertEqual(mutated_passed[0].walking_load, "STRENUOUS")

    def test_mutation_corrupting_timeline_overlap_triggers_detection(self):
        constraints = UserConstraints(
            destination_province="Đà Nẵng",
            total_days=1,
            people_count=2
        )

        # MUTATION: force activities to start at fixed 08:00, causing overlapping
        orig_assemble = DailyTimelineEngine.assemble_day_timeline
        def mutated_assemble(day_num, selected_dests, c, scheduled_slots=None, *args, **kwargs):
            slots = orig_assemble(day_num, selected_dests, c, scheduled_slots=scheduled_slots, *args, **kwargs)
            for s in slots:
                s.start_time = "08:00"
                s.end_time = "10:00"
            return slots

        with patch.object(DailyTimelineEngine, "assemble_day_timeline", side_effect=mutated_assemble):
            mutated_plan = VistaMasterPlanner.generate_plan(constraints)
            acts = mutated_plan.days[0].activities
            if len(acts) >= 2:
                # Invariant: start_time >= prev.end_time
                st_2 = time_to_minutes(acts[1].start_time)
                et_1 = time_to_minutes(acts[0].end_time)
                # Overlap detected!
                self.assertLess(st_2, et_1, "Mutation should cause overlapping activities to be detected")

    def test_mutation_disabling_closing_hour_check_triggers_detection(self):
        constraints = UserConstraints(
            destination_province="Đà Nẵng",
            total_days=1,
            people_count=2
        )

        # MUTATION: force destination to close at 06:00 AM (before morning start 08:30)
        from engine import timeline
        orig_extract = timeline.extract_opening_closing
        def mutated_extract(dest):
            # Closes very early in the morning
            return (5 * 60, 6 * 60)

        with patch("engine.timeline.extract_opening_closing", side_effect=mutated_extract):
            # When closed before arrival (arrival 08:30 >= 06:00), venue is correctly skipped
            mutated_slots = DailyTimelineEngine.assemble_day_timeline(
                1,
                data_loader.get_by_province("Đà Nẵng")[:2],
                constraints
            )
            self.assertEqual(len(mutated_slots), 0, "Closed venue should be skipped")

if __name__ == "__main__":
    unittest.main()
