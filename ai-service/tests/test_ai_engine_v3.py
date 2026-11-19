import os
import sys
import unittest

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from models.constraints import UserConstraints
from models.destination import Destination
from models.reason import ActivitySlot
from services.geo_calculator import get_congestion_multiplier, estimate_transit_time_minutes
from engine.clustering import GeographicClusteringEngine
from engine.scoring import DestinationScoringEngine
from engine.routing import DayRoutingOptimizer
from engine.planner import VistaMasterPlanner


class TestAiEngineV3(unittest.TestCase):
    def test_traffic_congestion_multiplier_and_transit(self):
        # Rush hour in Hanoi car should be 1.28x, off-peak 1.0x, walking always 1.0x
        self.assertEqual(get_congestion_multiplier(8 * 60, province="Hà Nội", transport_mode="car"), 1.28)
        self.assertEqual(get_congestion_multiplier(17 * 60 + 30, province="TP. Hồ Chí Minh", transport_mode="car"), 1.28)
        self.assertEqual(get_congestion_multiplier(10 * 60, province="Hà Nội", transport_mode="car"), 1.0)
        self.assertEqual(get_congestion_multiplier(8 * 60, province="Hà Nội", transport_mode="walking"), 1.0)

        t_off = estimate_transit_time_minutes(21.0285, 105.8542, 21.0368, 105.8347, transport_mode="car", departure_min=10 * 60, province="Hà Nội")
        t_rush = estimate_transit_time_minutes(21.0285, 105.8542, 21.0368, 105.8347, transport_mode="car", departure_min=8 * 60, province="Hà Nội")
        self.assertGreaterEqual(t_rush, t_off)

    def test_anchor_balancing_and_theme_inference(self):
        d1 = Destination(
            id="dest-1", name="Bảo tàng Lịch sử", province="Hà Nội", category="Văn hóa & Di tích",
            latitude=21.024, longitude=105.859, avg_duration_min=120, price_min=40000,
            suitable_slots=["MORNING", "AFTERNOON"], indoor_outdoor="INDOOR", data_source="VISTA_CURATED"
        )
        d2 = Destination(
            id="dest-2", name="Văn Miếu Quốc Tử Giám", province="Hà Nội", category="Văn hóa & Di tích",
            latitude=21.027, longitude=105.835, avg_duration_min=120, price_min=70000,
            suitable_slots=["MORNING", "AFTERNOON"], indoor_outdoor="OUTDOOR", data_source="VISTA_CURATED"
        )
        d3 = Destination(
            id="dest-3", name="Quán Cà Phê Phố Cổ", province="Hà Nội", category="Cà phê & Thư giãn",
            latitude=21.034, longitude=105.851, avg_duration_min=60, price_min=50000,
            suitable_slots=["AFTERNOON"], indoor_outdoor="INDOOR", data_source="OPENSTREETMAP_REAL"
        )
        clusters = [[d1, d2], [d3]]
        balanced = GeographicClusteringEngine.balance_anchors_across_days(clusters)
        self.assertEqual(len(balanced[0]), 1)
        self.assertEqual(len(balanced[1]), 2)
        self.assertIn(balanced[1][0].id, ("dest-1", "dest-2"))

        theme = GeographicClusteringEngine.infer_day_theme([d1, d2], 1)
        self.assertEqual(theme, "Di sản & Văn hóa")

    def test_feedback_loop_rejection_scoring(self):
        dest = Destination(
            id="dest-reject-me", name="Công viên Thống Nhất", province="Hà Nội", category="Giải trí",
            latitude=21.015, longitude=105.842, avg_duration_min=90, price_min=0,
            suitable_slots=["MORNING", "AFTERNOON"], indoor_outdoor="OUTDOOR"
        )
        c_normal = UserConstraints(destination_province="Hà Nội", total_days=2)
        c_rejected = UserConstraints(
            destination_province="Hà Nội", total_days=2,
            rejected_destination_ids=["dest-reject-me"]
        )
        s_normal = DestinationScoringEngine.calculate_score(dest, c_normal, "MORNING")
        s_rejected = DestinationScoringEngine.calculate_score(dest, c_rejected, "MORNING")
        self.assertLess(s_rejected, s_normal - 500.0)

    def test_anti_zigzag_penalty(self):
        # A -> B -> A reversal across > 2 km legs should score lower than A -> B -> C forward progression
        d_a = Destination(id="a", name="Điểm A", province="Đà Nẵng", category="Khám phá", latitude=16.000, longitude=108.200)
        d_b = Destination(id="b", name="Điểm B", province="Đà Nẵng", category="Khám phá", latitude=16.030, longitude=108.200)
        d_c = Destination(id="c", name="Điểm C", province="Đà Nẵng", category="Khám phá", latitude=16.060, longitude=108.200)
        d_back = Destination(id="back", name="Điểm A2", province="Đà Nẵng", category="Khám phá", latitude=16.001, longitude=108.201)
        dest_map = {"a": d_a, "b": d_b, "c": d_c, "back": d_back}
        constraints = UserConstraints(destination_province="Đà Nẵng", total_days=1)

        def _slot(did, st, en):
            return ActivitySlot(
                destination_id=did, destination_name=dest_map[did].name,
                time_slot="MORNING", start_time=st, end_time=en,
                category="Khám phá", cost_vnd=0, cost_label="Miễn phí",
                travel_time_from_prev_min=10, buffer_min=10, reasons=[]
            )

        forward_score = DayRoutingOptimizer.score_simulated_timeline(
            [_slot("a", "08:30", "09:30"), _slot("b", "09:50", "10:50"), _slot("c", "11:10", "12:10")],
            dest_map, constraints
        )
        zigzag_score = DayRoutingOptimizer.score_simulated_timeline(
            [_slot("a", "08:30", "09:30"), _slot("b", "09:50", "10:50"), _slot("back", "11:10", "12:10")],
            dest_map, constraints
        )
        self.assertGreater(forward_score, zigzag_score)

    def test_planner_with_rejected_id_and_thematic_title(self):
        c1 = UserConstraints(destination_province="Đà Nẵng", total_days=2, people_count=2, interests=["Văn hóa", "Ẩm thực"])
        p1 = VistaMasterPlanner.generate_plan(c1)
        self.assertEqual(len(p1.days), 2)
        first_id = p1.days[0].activities[0].destination_id
        self.assertIn(":", p1.days[0].title)

        c2 = UserConstraints(
            destination_province="Đà Nẵng", total_days=2, people_count=2,
            interests=["Văn hóa", "Ẩm thực"],
            rejected_destination_ids=[first_id]
        )
        p2 = VistaMasterPlanner.generate_plan(c2)
        all_p2_ids = {act.destination_id for d in p2.days for act in d.activities}
        self.assertNotIn(first_id, all_p2_ids)


if __name__ == "__main__":
    unittest.main()
