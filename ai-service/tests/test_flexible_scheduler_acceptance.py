import unittest
import os
import json
import copy
import config
from models.destination import Destination
from models.constraints import UserConstraints
from engine.planner import VistaMasterPlanner, resolve_plan_source_diagnostics
from engine.replanner import VistaReplannerEngine
from engine.routing import DayRoutingOptimizer
from engine.timeline import DailyTimelineEngine, time_to_minutes, minutes_to_time
from data.loader import data_loader, DestinationDataLoader
from api.contract import parse_plan_request, serialize_plan


class TestFlexibleSchedulerAcceptance(unittest.TestCase):
    """
    Bộ kiểm thử nghiệm thu đầy đủ cho 15 kịch bản Mục 10 và 6 kịch bản Mục 9.1 (Tín hiệu nguồn lập lịch).
    """

    def test_01_continuous_timeline_afternoon_starts_at_1340_not_forced_1430(self):
        """
        Mục 10 #1: Điểm tham quan buổi chiều khi khách đến lúc 13:40 và điểm đang mở cửa:
        giờ bắt đầu là 13:40, KHÔNG bị đẩy cứng sang 14:30.
        """
        d_lunch = Destination(
            id="hcm-lunch", name="Nhà hàng Ngon Quận 1", province="TP. Hồ Chí Minh", category="Ẩm thực",
            latitude=10.7770, longitude=106.6990, price_min=150000, price_max=250000,
            avg_duration_min=70, min_duration_min=60,
            opening_hours={"open": "10:00", "close": "22:00"}
        )
        d_afternoon = Destination(
            id="hcm-museum", name="Dinh Độc Lập", province="TP. Hồ Chí Minh", category="Di tích & Lịch sử",
            latitude=10.7775, longitude=106.6955, price_min=40000, price_max=65000,
            avg_duration_min=90, min_duration_min=60,
            opening_hours={"open": "08:00", "close": "17:00"}
        )
        # Arrival at 11:35 -> check-in buffer +30m = 12:05 start for lunch (70m) -> ends 13:15
        # Travel 10m + buffer 15m -> arrives at Dinh Độc Lập at 13:40!
        constraints = UserConstraints(
            destination_province="TP. Hồ Chí Minh",
            total_days=1,
            arrival_time="11:35",
            pace="MODERATE"
        )
        slots = DailyTimelineEngine.assemble_day_timeline(
            day_num=1,
            selected_dests=[d_lunch, d_afternoon],
            constraints=constraints,
            scheduled_slots=["NOON", "AFTERNOON"],
            max_stops=2
        )
        self.assertEqual(len(slots), 2)
        self.assertEqual(slots[0].start_time, "12:05")
        self.assertEqual(slots[0].end_time, "13:15")
        self.assertEqual(slots[1].start_time, "13:40", "Điểm chiều phải bắt đầu ngay lúc 13:40 thay vì chờ 14:30!")

    def test_02_pace_relaxed_with_culinary_and_cafe_priority(self):
        """
        Mục 10 #2 & #3: Cùng dữ liệu TP.HCM, khách chọn thư thả (RELAXED) + ưu tiên ẩm thực & cà phê
        sẽ có ít điểm dừng hơn (<= 3 điểm), có bữa ăn + điểm cà phê/nghỉ và ít di chuyển hơn khách chọn INTENSIVE.
        """
        hcm_pool = [
            Destination(
                id="hcm-1", name="Dinh Độc Lập", province="TP. Hồ Chí Minh", category="Di tích & Lịch sử",
                latitude=10.7769, longitude=106.6953, price_min=40000, price_max=65000,
                avg_duration_min=90, min_duration_min=60, walking_load="LIGHT",
                opening_hours={"open": "08:00", "close": "17:00"}
            ),
            Destination(
                id="hcm-2", name="Nhà hàng Cục Gạch Quán", province="TP. Hồ Chí Minh", category="Ẩm thực bản địa",
                latitude=10.7905, longitude=106.6915, price_min=200000, price_max=400000,
                avg_duration_min=75, min_duration_min=60, walking_load="LIGHT",
                opening_hours={"open": "09:00", "close": "22:00"}
            ),
            Destination(
                id="hcm-3", name="Cà phê Vợt Phùng Hưng", province="TP. Hồ Chí Minh", category="Cà phê & Thư giãn",
                latitude=10.7540, longitude=106.6590, price_min=35000, price_max=50000,
                avg_duration_min=60, min_duration_min=45, walking_load="LIGHT",
                opening_hours={"open": "07:00", "close": "21:00"}
            ),
            Destination(
                id="hcm-4", name="Bảo tàng Chứng tích Chiến tranh", province="TP. Hồ Chí Minh", category="Bảo tàng & Văn hóa",
                latitude=10.7795, longitude=106.6921, price_min=40000, price_max=40000,
                avg_duration_min=90, min_duration_min=60, walking_load="MODERATE",
                opening_hours={"open": "07:30", "close": "17:30"}
            ),
            Destination(
                id="hcm-5", name="Phố đi bộ Nguyễn Huệ", province="TP. Hồ Chí Minh", category="Cảnh quan & Phố đi bộ",
                latitude=10.7744, longitude=106.7035, price_min=0, price_max=0,
                avg_duration_min=90, min_duration_min=45, walking_load="LIGHT",
                opening_hours={"open": "00:00", "close": "23:59"}
            ),
        ]
        orig_dests = data_loader.destinations
        orig_by_id = data_loader._by_id
        try:
            data_loader.destinations = hcm_pool
            data_loader._by_id = {d.id: d for d in hcm_pool}

            plan_relaxed = VistaMasterPlanner.generate_plan(UserConstraints(
                destination_province="TP. Hồ Chí Minh",
                total_days=1,
                pace="thư thả",
                priority_interests=["ẩm thực", "cà phê"],
                interests=["ẩm thực", "cà phê", "di tích", "bảo tàng", "phố đi bộ"]
            ))
            plan_intensive = VistaMasterPlanner.generate_plan(UserConstraints(
                destination_province="TP. Hồ Chí Minh",
                total_days=1,
                pace="đi nhiều",
                interests=["ẩm thực", "di tích", "bảo tàng", "phố đi bộ"]
            ))

            acts_rel = plan_relaxed.days[0].activities
            acts_int = plan_intensive.days[0].activities

            self.assertLessEqual(len(acts_rel), 3, "RELAXED chỉ xếp tối đa 3 điểm dừng trong ngày")
            self.assertGreater(len(acts_int), len(acts_rel), "INTENSIVE phải xếp được nhiều điểm hơn RELAXED trên cùng dữ liệu")

            rel_names = " ".join(a.destination_name.lower() for a in acts_rel)
            self.assertIn("cục gạch", rel_names)
            self.assertIn("cà phê", rel_names)
        finally:
            data_loader.destinations = orig_dests
            data_loader._by_id = orig_by_id

    def test_04_simulation_driven_route_selection_avoids_closed_stop(self):
        """
        Mục 10 #4: Chọn tuyến bằng mô phỏng: thứ tự A -> B làm B đóng cửa trong lịch thực tế
        phải thua thứ tự B -> A nơi cả hai đều mở cửa hợp lệ.
        """
        # Venue A: open all day 08:00-17:00, duration 180 min
        dest_a = Destination(
            id="sim-a", name="Khu sinh thái A (Mở cả ngày)", province="Đà Nẵng", category="Thiên nhiên",
            latitude=16.0500, longitude=108.2000, price_min=50000, price_max=50000,
            avg_duration_min=180, min_duration_min=150,
            opening_hours={"open": "08:00", "close": "17:00"}
        )
        # Venue B: closes early at 11:00! If A is visited first (08:30-11:30), B is already closed!
        dest_b = Destination(
            id="sim-b", name="Chợ phiên sáng B (Đóng lúc 11:00)", province="Đà Nẵng", category="Văn hóa",
            latitude=16.0550, longitude=108.2050, price_min=0, price_max=0,
            avg_duration_min=75, min_duration_min=60,
            opening_hours={"open": "07:00", "close": "11:00"}
        )
        dest_lunch = Destination(
            id="sim-lunch", name="Quán Ăn Trưa C", province="Đà Nẵng", category="Ẩm thực",
            latitude=16.0580, longitude=108.2080, price_min=100000, price_max=100000,
            avg_duration_min=60, min_duration_min=45,
            opening_hours={"open": "11:00", "close": "15:00"}
        )
        constraints = UserConstraints(destination_province="Đà Nẵng", total_days=1, pace="MODERATE")
        # Pass [dest_a, dest_b, dest_lunch] so A is first in input list, but simulation must pick B -> lunch -> A!
        slots = DayRoutingOptimizer.optimize_day_stops(
            day_num=1,
            day_pool=[dest_a, dest_b, dest_lunch],
            constraints=constraints,
            province_pool=[dest_a, dest_b, dest_lunch],
            max_stops=3
        )
        scheduled_ids = [s.destination_id for s in slots]
        self.assertIn("sim-b", scheduled_ids, "Mô phỏng phải đặt B lên đầu sáng để không bị đóng cửa lúc 11:00!")
        self.assertEqual(slots[0].destination_id, "sim-b")

    def test_05_multi_interval_opening_hours_never_straddles_midday_closure(self):
        """
        Mục 10 #5: Điểm mở 09:00-11:30 và 13:30-17:00, thời lượng 90 phút, khách đến lúc 10:30:
        KHÔNG được xếp 10:30-12:00 xuyên qua giờ nghỉ trưa 11:30-13:30; phải xếp vào 13:30-15:00.
        """
        d_split = Destination(
            id="split-museum", name="Bảo tàng Nghỉ Trưa", province="Hà Nội", category="Bảo tàng",
            latitude=21.0285, longitude=105.8542, price_min=40000, price_max=40000,
            avg_duration_min=90, min_duration_min=90,
            opening_hours={"daily": "09:00-11:30, 13:30-17:00"}
        )
        # Arrival at 10:00 + 30m check-in buffer = 10:30 arrival at museum
        constraints = UserConstraints(
            destination_province="Hà Nội",
            total_days=1,
            arrival_time="10:00"
        )
        slots = DailyTimelineEngine.assemble_day_timeline(
            day_num=1,
            selected_dests=[d_split],
            constraints=constraints,
            scheduled_slots=["MORNING"],
            max_stops=1
        )
        self.assertEqual(len(slots), 1)
        self.assertEqual(slots[0].start_time, "13:30", "Phải bắt đầu ở khoảng mở cửa thứ 2 (13:30) thay vì cắt ngang 11:30-13:30!")
        self.assertEqual(slots[0].end_time, "15:00")

    def test_06_single_day_open_must_visit_placed_on_valid_day(self):
        """
        Mục 10 #6: Điểm must-visit chỉ mở một ngày trong chuyến đi (ví dụ chỉ mở Thứ Ba - Ngày 2)
        được ưu tiên đặt vào đúng Ngày 2 trước khi lấp các điểm tùy chọn.
        """
        pool = [
            Destination(
                id="mv-tue-only", name="Bảo tàng Chuyên đề Thứ Ba", province="Hà Nội", category="Văn hóa",
                latitude=21.0280, longitude=105.8500, price_min=50000, price_max=50000,
                avg_duration_min=90, min_duration_min=60,
                opening_hours={"tue": "08:30-17:00"}  # Only open on Tuesday!
            ),
            Destination(
                id="opt-1", name="Hồ Hoàn Kiếm", province="Hà Nội", category="Danh thắng",
                latitude=21.0285, longitude=105.8525, price_min=0, price_max=0,
                avg_duration_min=90, min_duration_min=60,
                opening_hours={"daily": "07:00-22:00"}
            ),
            Destination(
                id="opt-2", name="Văn Miếu Quốc Tử Giám", province="Hà Nội", category="Di tích",
                latitude=21.0275, longitude=105.8355, price_min=30000, price_max=30000,
                avg_duration_min=90, min_duration_min=60,
                opening_hours={"daily": "08:00-17:00"}
            ),
            Destination(
                id="opt-3", name="Phở Thìn Bờ Hồ", province="Hà Nội", category="Ẩm thực",
                latitude=21.0290, longitude=105.8530, price_min=60000, price_max=80000,
                avg_duration_min=60, min_duration_min=45,
                opening_hours={"daily": "07:00-21:00"}
            ),
        ]
        orig_dests = data_loader.destinations
        orig_by_id = data_loader._by_id
        try:
            data_loader.destinations = pool
            data_loader._by_id = {d.id: d for d in pool}
            # 2026-11-09 is Monday -> Day 1 = Mon, Day 2 = Tue
            plan = VistaMasterPlanner.generate_plan(UserConstraints(
                destination_province="Hà Nội",
                total_days=2,
                start_date="2026-11-09",
                must_visit_ids=["mv-tue-only"]
            ))
            day1_ids = [a.destination_id for a in plan.days[0].activities]
            day2_ids = [a.destination_id for a in plan.days[1].activities]
            self.assertNotIn("mv-tue-only", day1_ids, "Ngày 1 (Thứ Hai) điểm must-visit đóng cửa nên không được xếp vào Ngày 1")
            self.assertIn("mv-tue-only", day2_ids, "Ngày 2 (Thứ Ba) điểm must-visit mở cửa phải được xếp vào Ngày 2")
        finally:
            data_loader.destinations = orig_dests
            data_loader._by_id = orig_by_id

    def test_07_infeasible_locked_item_returns_specific_conflict(self):
        """
        Mục 10 #7: Điểm đã khóa hoặc must-visit không khả thi: trả về xung đột cụ thể và gợi ý cách chỉnh.
        """
        constraints = UserConstraints(
            destination_province="Đà Nẵng",
            total_days=1,
            departure_time="15:00",
            departure_buffer_min=90,
            departure_travel_min=30,
            locked_items=[
                {
                    "day_number": 1,
                    "destination_name": "Vé Show Ký Ức",
                    "start_time": "14:00",
                    "end_time": "15:30"
                }
            ]
        )
        plan = VistaMasterPlanner.generate_plan(constraints)
        self.assertGreaterEqual(len(plan.conflicts), 1)
        codes = [c["code"] for c in plan.conflicts]
        self.assertIn("LOCKED_ITEM_VIOLATES_DEPARTURE", codes)
        self.assertTrue(len(plan.conflicts[0]["suggested_resolutions"]) > 0)

    def test_08_final_day_flight_1800_buffer_90_travel_35(self):
        """
        Mục 10 #8: Ngày cuối có chuyến bay 18:00, đệm sân bay 90 phút, di chuyển từ điểm cuối ra sân bay 35 phút:
        điểm cuối kết thúc không muộn hơn 15:55 (hoặc 15:45 nếu cấu hình thêm 10 phút đệm di chuyển),
        và ngày cuối thể hiện rõ thông tin chặng ra sân bay.
        """
        # Case A: transit_buffer_min = 0 -> latest end = 15:55
        c_no_trans_buf = UserConstraints(
            destination_province="TP. Hồ Chí Minh",
            total_days=2,
            departure_time="18:00",
            departure_type="TRANSPORT_DEPARTURE",
            departure_buffer_min=90,
            departure_travel_min=35,
            transit_buffer_min=0,
            departure_point="Sân bay Tân Sơn Nhất"
        )
        plan_a = VistaMasterPlanner.generate_plan(c_no_trans_buf)
        last_day_a = plan_a.days[-1]
        self.assertIsNotNone(last_day_a.departure_info)
        self.assertEqual(last_day_a.departure_info["latest_activity_end_time"], "15:55")
        for act in last_day_a.activities:
            self.assertLessEqual(time_to_minutes(act.end_time), time_to_minutes("15:55"))

        # Case B: transit_buffer_min = 10 -> latest end = 15:45
        c_with_trans_buf = UserConstraints(
            destination_province="TP. Hồ Chí Minh",
            total_days=2,
            departure_time="18:00",
            departure_type="TRANSPORT_DEPARTURE",
            departure_buffer_min=90,
            departure_travel_min=35,
            transit_buffer_min=10,
            departure_point="Sân bay Tân Sơn Nhất"
        )
        plan_b = VistaMasterPlanner.generate_plan(c_with_trans_buf)
        last_day_b = plan_b.days[-1]
        self.assertEqual(last_day_b.departure_info["latest_activity_end_time"], "15:45")
        for act in last_day_b.activities:
            self.assertLessEqual(time_to_minutes(act.end_time), time_to_minutes("15:45"))

    def test_09_final_day_early_morning_departure_no_0900_floor(self):
        """
        Mục 10 #9: Ngày cuối có giờ rời đi rất sớm (08:30): không ép sàn 09:00 để nhét hoạt động tham quan;
        chỉ thể hiện chặng rời đi (DEPARTURE_ONLY).
        """
        c_early = UserConstraints(
            destination_province="Đà Nẵng",
            total_days=2,
            departure_time="08:30",
            departure_buffer_min=90,
            departure_travel_min=25,
            departure_point="Sân bay Quốc tế Đà Nẵng"
        )
        plan = VistaMasterPlanner.generate_plan(c_early)
        self.assertEqual(len(plan.days), 2)
        final_day = plan.days[1]
        self.assertEqual(len(final_day.activities), 0, "Chuyến bay 08:30 sáng không được ép sàn 09:00 để nhét hoạt động tham quan!")
        self.assertEqual(final_day.day_status, "DEPARTURE_ONLY")
        self.assertIsNotNone(final_day.departure_info)

    def test_10_replan_shift_lunch_45m_cascades_and_protects_locked_item(self):
        """
        Mục 10 #10: Replan dời bữa trưa muộn 45 phút:
        - Khi không xung đột: các hoạt động sau bữa trưa được tính lại giờ hợp lệ, vé đã khóa lúc 16:30 giữ nguyên giờ.
        - Khi xung đột với mục đã khóa lúc 13:30: trả về xung đột cụ thể và giữ nguyên lịch hợp lệ trước đó.
        """
        base_plan = {
            "destination_province": "TP. Hồ Chí Minh",
            "total_days": 1,
            "people_count": 2,
            "budget_tier": "standard",
            "days": [
                {
                    "day_number": 1,
                    "date_label": "Ngày 1",
                    "title": "Ngày 1 · TP. Hồ Chí Minh",
                    "day_rationale": "Lịch trình ngày 1.",
                    "subtotal_cost_vnd": 200000,
                    "activities": [
                        {
                            "destination_id": "d-morn",
                            "destination_name": "Dinh Độc Lập",
                            "time_slot": "MORNING",
                            "item_type": "SIGHTSEEING",
                            "start_time": "08:30",
                            "end_time": "10:30",
                            "category": "Di tích",
                            "cost_vnd": 80000,
                            "cost_label": "80,000đ",
                            "travel_time_from_prev_min": 0,
                            "buffer_min": 0,
                            "is_locked": False
                        },
                        {
                            "destination_id": "d-noon",
                            "destination_name": "Nhà hàng Ngon",
                            "time_slot": "NOON",
                            "item_type": "MEAL",
                            "start_time": "11:45",
                            "end_time": "13:00",
                            "category": "Ẩm thực",
                            "cost_vnd": 120000,
                            "cost_label": "120,000đ",
                            "travel_time_from_prev_min": 15,
                            "buffer_min": 15,
                            "is_locked": False
                        },
                        {
                            "destination_id": "d-aft",
                            "destination_name": "Bảo tàng Mỹ thuật",
                            "time_slot": "AFTERNOON",
                            "item_type": "SIGHTSEEING",
                            "start_time": "13:30",
                            "end_time": "15:00",
                            "category": "Bảo tàng",
                            "cost_vnd": 0,
                            "cost_label": "Miễn phí",
                            "travel_time_from_prev_min": 15,
                            "buffer_min": 15,
                            "is_locked": False
                        },
                        {
                            "destination_id": "d-lock",
                            "destination_name": "Show À Ố (Vé đã khóa)",
                            "time_slot": "EVENING",
                            "item_type": "LOCKED_COMMITMENT",
                            "start_time": "18:00",
                            "end_time": "19:30",
                            "category": "Giải trí",
                            "cost_vnd": 0,
                            "cost_label": "Đã đặt",
                            "travel_time_from_prev_min": 15,
                            "buffer_min": 15,
                            "is_locked": True
                        }
                    ]
                }
            ]
        }

        # 1. Valid shift +45m: Lunch becomes 12:30-13:45, Afternoon museum shifts to >= 14:15, Locked show stays 18:00-19:30!
        updated_ok = VistaReplannerEngine.replan_itinerary(
            base_plan,
            instruction="Dời bữa trưa ngày 1 muộn hơn 45 phút"
        )
        self.assertEqual(updated_ok["schedule_status"], "FEASIBLE")
        acts_ok = updated_ok["days"][0]["activities"]
        self.assertEqual(acts_ok[1]["start_time"], "12:30")
        self.assertEqual(acts_ok[1]["end_time"], "13:45")
        self.assertGreaterEqual(time_to_minutes(acts_ok[2]["start_time"]), time_to_minutes("14:15"))
        self.assertEqual(acts_ok[3]["start_time"], "18:00", "Vé đã khóa lúc 18:00 phải giữ nguyên giờ!")
        self.assertIn("replan_diff", updated_ok)
        self.assertGreaterEqual(len(updated_ok["replan_diff"]["moved"]), 2)

        # 2. Conflicting shift +45m when locked item is at 14:00:
        conflict_plan = copy.deepcopy(base_plan)
        conflict_plan["days"][0]["activities"][3]["start_time"] = "14:00"
        conflict_plan["days"][0]["activities"][3]["end_time"] = "15:30"
        updated_conflict = VistaReplannerEngine.replan_itinerary(
            conflict_plan,
            instruction="Dời bữa trưa ngày 1 muộn hơn 45 phút"
        )
        self.assertEqual(updated_conflict["schedule_status"], "INFEASIBLE_CONFLICT")
        self.assertGreaterEqual(len(updated_conflict["conflicts"]), 1)
        self.assertEqual(updated_conflict["conflicts"][0]["code"], "LUNCH_SHIFT_CONFLICTS_WITH_LOCKED_ITEM")
        # Previous valid lunch time 11:45 is preserved intact!
        self.assertEqual(updated_conflict["days"][0]["activities"][1]["start_time"], "11:45")

    def test_11_replan_change_pace_to_relaxed(self):
        """
        Mục 10 #11: Replan đổi nhịp độ sang thư thả: giảm điểm hoặc tăng thời gian nghỉ và cập nhật lại timeline.
        """
        plan_obj = VistaMasterPlanner.generate_plan(UserConstraints(
            destination_province="Đà Nẵng",
            total_days=1,
            pace="MODERATE"
        ))
        plan_dict = serialize_plan(plan_obj)
        before_count = len(plan_dict["days"][0]["activities"])
        updated = VistaReplannerEngine.replan_itinerary(
            plan_dict,
            instruction="Đoàn hơi mệt, muốn giảm tải chuyển sang lịch thư thả ngày 1"
        )
        self.assertEqual(updated.get("pace"), "RELAXED")
        if before_count > 2:
            self.assertLess(len(updated["days"][0]["activities"]), before_count)
            self.assertEqual(len(updated["replan_diff"]["dropped"]), 1)

    def test_12_scarce_province_3n2d_preserves_3_days_and_2_hotel_nights(self):
        """
        Mục 10 #12: Tỉnh ít điểm trong 3 ngày 2 đêm: giữ đủ 3 ngày trong response;
        ngày không có điểm tham quan được đánh dấu rõ và số đêm khách sạn vẫn là 2 đêm.
        """
        scarce_dests = [
            Destination(
                id="sc-1", name="Điểm A", province="Hà Nam", category="Văn hóa",
                latitude=20.56, longitude=105.87, price_min=50000, price_max=50000
            ),
            Destination(
                id="sc-2", name="Điểm B", province="Hà Nam", category="Thiên nhiên",
                latitude=20.55, longitude=105.89, price_min=30000, price_max=30000
            ),
        ]
        orig_dests = data_loader.destinations
        orig_by_id = data_loader._by_id
        try:
            data_loader.destinations = scarce_dests
            data_loader._by_id = {d.id: d for d in scarce_dests}
            plan = VistaMasterPlanner.generate_plan(UserConstraints(
                destination_province="Hà Nam",
                total_days=3,
                people_count=2,
                budget_tier="standard"
            ))
            self.assertEqual(plan.total_days, 3)
            self.assertEqual(len(plan.days), 3)
            self.assertEqual(plan.days[2].day_status, "FREE_DAY")
            self.assertIn("Thời gian tự do", plan.days[2].title)
            self.assertEqual(plan.breakdown["nights_count"], 2)
            expected_hotel = 2 * config.ROOM_RATES_PER_NIGHT["standard"] * 1
            self.assertEqual(plan.breakdown["hotel_cost"], expected_hotel)
        finally:
            data_loader.destinations = orig_dests
            data_loader._by_id = orig_by_id

    def test_13_missing_primary_csv_loader_never_raises_by_canonical(self):
        """
        Mục 10 #13: Thiếu CSV chính: loader không lỗi _by_canonical và báo rõ trạng thái MISSING.
        """
        missing_loader = DestinationDataLoader("/non/existent/path/missing_seed.csv")
        self.assertEqual(missing_loader.destinations, [])
        self.assertEqual(missing_loader._by_canonical, {})
        self.assertEqual(missing_loader.dataset_source_type, "MISSING")
        self.assertIsNone(missing_loader.get_canonical_province_name("Đà Nẵng"))

    def test_14_offline_mode_empty_llm_api_key_plan_and_replan(self):
        """
        Mục 10 #14: Không có LLM_API_KEY: cả tạo lịch và replan vẫn hoạt động bình thường.
        """
        orig_key = config.LLM_API_KEY
        try:
            config.LLM_API_KEY = ""
            plan = VistaMasterPlanner.generate_plan(UserConstraints(
                destination_province="Đà Nẵng",
                total_days=2,
                people_count=2
            ))
            self.assertEqual(len(plan.days), 2)
            plan_dict = serialize_plan(plan)
            replanned = VistaReplannerEngine.replan_itinerary(
                plan_dict,
                instruction="Sáng ngày 1 muốn ngủ nướng đến 10:00"
            )
            self.assertEqual(replanned["schedule_status"], "FEASIBLE")
        finally:
            config.LLM_API_KEY = orig_key

    def test_15_server_endpoints_plan_and_replan_contract(self):
        """
        Mục 10 #15: Kiểm thử qua contract của server.py và standalone_server.py.
        """
        req = {
            "destination": "Đà Nẵng",
            "days": 2,
            "people": 2,
            "pace": "thư thả",
            "priority_interests": ["ẩm thực", "cà phê"],
            "departure_time": "18:00",
            "departure_buffer_min": 90,
            "departure_travel_min": 35
        }
        c = parse_plan_request(req)
        self.assertEqual(c.pace, "RELAXED")
        self.assertEqual(c.priority_interests, ["ẩm thực", "cà phê"])
        plan = VistaMasterPlanner.generate_plan(c)
        res_guest = serialize_plan(plan, request_id="test-guest", include_internal_diagnostics=False)
        res_admin = serialize_plan(plan, request_id="test-admin", include_internal_diagnostics=True)
        self.assertNotIn("internal_diagnostics", res_guest)
        self.assertIn("internal_diagnostics", res_admin)
        self.assertIsNotNone(res_guest["days"][-1]["departure_info"])

    # ==========================================================================
    # MỤC 9.1: TÍN HIỆU NỘI BỘ VỀ NGUỒN LẬP LỊCH (6 KỊCH BẢN)
    # ==========================================================================
    def test_9_1_1_empty_llm_key_algorithm_source_gray(self):
        """
        Mục 9.1 #1: LLM_API_KEY trống, tạo lịch bằng bộ lập lịch nội bộ:
        trạng thái nguồn là ALGORITHM, nhãn 'Thuật toán', màu xám (gray).
        """
        orig_key = config.LLM_API_KEY
        try:
            config.LLM_API_KEY = ""
            plan = VistaMasterPlanner.generate_plan(UserConstraints(
                destination_province="Đà Nẵng",
                total_days=1,
                include_internal_diagnostics=True
            ))
            diag = plan.internal_diagnostics
            self.assertEqual(diag["current_source"]["source_code"], "ALGORITHM")
            self.assertEqual(diag["current_source"]["label"], "Thuật toán")
            self.assertEqual(diag["current_source"]["color"], "gray")
        finally:
            config.LLM_API_KEY = orig_key

    def test_9_1_2_model_used_only_for_intent_or_narration_remains_gray(self):
        """
        Mục 9.1 #2: Có gọi mô hình để phân tích câu nhập hoặc viết mô tả, nhưng thuật toán nội bộ chọn và xếp lịch:
        trạng thái nguồn lập lịch vẫn là ALGORITHM (màu xám).
        """
        plan = VistaMasterPlanner.generate_plan(UserConstraints(
            destination_province="Đà Nẵng",
            total_days=1,
            scheduler_mode="intent_or_narration_only",
            include_internal_diagnostics=True
        ))
        diag = plan.internal_diagnostics["current_source"]
        self.assertEqual(diag["source_code"], "ALGORITHM")
        self.assertEqual(diag["color"], "gray")
        self.assertIn("intent_parsing", diag["model_roles"])

    def test_9_1_3_model_assisted_verified_schedule_is_blue(self):
        """
        Mục 9.1 #3: Có nhánh mô hình tham gia lập lịch và kết quả mô hình qua được bộ kiểm tra:
        trạng thái nguồn là MODEL_ASSISTED, nhãn 'Có mô hình hỗ trợ', màu xanh (blue).
        """
        plan = VistaMasterPlanner.generate_plan(UserConstraints(
            destination_province="Đà Nẵng",
            total_days=1,
            scheduler_mode="model_assisted_verified_mock",
            include_internal_diagnostics=True
        ))
        diag = plan.internal_diagnostics["current_source"]
        self.assertEqual(diag["source_code"], "MODEL_ASSISTED")
        self.assertEqual(diag["label"], "Có mô hình hỗ trợ")
        self.assertEqual(diag["color"], "blue")

    def test_9_1_4_model_timeout_or_rejected_proposal_is_orange_with_reason(self):
        """
        Mục 9.1 #4: Có nhánh mô hình tham gia lập lịch nhưng mô hình lỗi hoặc đề xuất vi phạm giờ mở cửa:
        trạng thái nguồn là FALLBACK_TO_ALGORITHM, nhãn 'Chuyển sang thuật toán', màu cam (orange), có lý do cụ thể.
        """
        plan_timeout = VistaMasterPlanner.generate_plan(UserConstraints(
            destination_province="Đà Nẵng",
            total_days=1,
            scheduler_mode="model_timeout",
            include_internal_diagnostics=True
        ))
        diag_t = plan_timeout.internal_diagnostics["current_source"]
        self.assertEqual(diag_t["source_code"], "FALLBACK_TO_ALGORITHM")
        self.assertEqual(diag_t["label"], "Chuyển sang thuật toán")
        self.assertEqual(diag_t["color"], "orange")
        self.assertIn("quá thời gian", diag_t["fallback_reason"])

        plan_invalid = VistaMasterPlanner.generate_plan(UserConstraints(
            destination_province="Đà Nẵng",
            total_days=1,
            scheduler_mode="model_invalid_proposal",
            include_internal_diagnostics=True
        ))
        diag_i = plan_invalid.internal_diagnostics["current_source"]
        self.assertEqual(diag_i["source_code"], "FALLBACK_TO_ALGORITHM")
        self.assertEqual(diag_i["color"], "orange")
        self.assertIn("vi phạm giờ mở cửa", diag_i["fallback_reason"])

    def test_9_1_5_initial_plan_blue_then_replan_gray_tracks_both_separately(self):
        """
        Mục 9.1 #5: Lịch ban đầu có mô hình hỗ trợ (blue), sau đó chỉnh lịch bằng thuật toán nội bộ (gray):
        lần chỉnh gần nhất hiển thị 'Thuật toán' (gray), vẫn xem được nguồn của lịch ban đầu (blue).
        """
        plan = VistaMasterPlanner.generate_plan(UserConstraints(
            destination_province="Đà Nẵng",
            total_days=1,
            scheduler_mode="model_assisted_verified_mock",
            include_internal_diagnostics=True
        ))
        plan_dict = serialize_plan(plan, include_internal_diagnostics=True)
        self.assertEqual(plan_dict["internal_diagnostics"]["initial_plan_source"]["source_code"], "MODEL_ASSISTED")

        replanned = VistaReplannerEngine.replan_itinerary(
            plan_dict,
            instruction="Sáng ngày 1 muốn ngủ nướng đến 10:00",
            constraints_data={"include_internal_diagnostics": True}
        )
        diag = replanned["internal_diagnostics"]
        self.assertEqual(diag["initial_plan_source"]["source_code"], "MODEL_ASSISTED")
        self.assertEqual(diag["initial_plan_source"]["color"], "blue")
        self.assertEqual(diag["last_replan_source"]["source_code"], "ALGORITHM")
        self.assertEqual(diag["last_replan_source"]["color"], "gray")
        self.assertEqual(diag["current_source"]["source_code"], "ALGORITHM")

        # Also verify legacy plan without recorded source returns UNRECORDED
        legacy_diag = resolve_plan_source_diagnostics(None)
        self.assertEqual(legacy_diag["initial_plan_source"]["source_code"], "UNRECORDED")
        self.assertEqual(legacy_diag["initial_plan_source"]["label"], "Chưa ghi nhận nguồn")

    def test_9_1_6_non_admin_response_omits_internal_diagnostics_and_never_leaks_key(self):
        """
        Mục 9.1 #6: Người dùng thường không có quyền kiểm tra: không nhận metadata nội bộ và không bao giờ lộ LLM_API_KEY.
        """
        orig_key = config.LLM_API_KEY
        try:
            config.LLM_API_KEY = "sk-top-secret-never-leak-99999"
            plan = VistaMasterPlanner.generate_plan(UserConstraints(
                destination_province="Đà Nẵng",
                total_days=1,
                scheduler_mode="model_assisted",
                include_internal_diagnostics=False
            ))
            guest_payload = serialize_plan(plan, include_internal_diagnostics=False)
            admin_payload = serialize_plan(plan, include_internal_diagnostics=True)

            self.assertNotIn("internal_diagnostics", guest_payload)
            self.assertIn("internal_diagnostics", admin_payload)
            self.assertNotIn("sk-top-secret-never-leak-99999", json.dumps(guest_payload))
            self.assertNotIn("sk-top-secret-never-leak-99999", json.dumps(admin_payload))
        finally:
            config.LLM_API_KEY = orig_key


if __name__ == "__main__":
    unittest.main()

