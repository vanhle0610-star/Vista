import unittest
import os
import config
from models.destination import Destination
from models.constraints import UserConstraints
from engine.planner import VistaMasterPlanner
from engine.timeline import time_to_minutes, is_food_destination, is_slot_suitable
from data.loader import data_loader, DestinationDataLoader
from intent.intent_parser import IntentParserEngine
from services.geo_calculator import are_clusters_same_day_compatible
from services.weather_advisor import get_weather_advisory
from narrator.generator import NarratorGenerator
from models.reason import ActivitySlot

REAL_SEED_DEFAULT = os.path.abspath(
    os.path.join(os.path.dirname(__file__), "..", "..", "backend", "src", "main", "resources", "db", "seed", "demo_destinations_seed.csv")
)

class TestPlausibilityRegressions(unittest.TestCase):
    """
    Bộ kiểm thử hồi quy cho 9 lỗi thực tế đã xác nhận (Giai đoạn 1 -> 9).
    """

    def test_regression_1_phu_quoc_never_mixes_ha_tien_or_301min_leg(self):
        """
        Lỗi 1: Phú Quốc 4 ngày luxury cặp đôi không bao giờ ghép Hà Tiên (đất liền) chung với Phú Quốc (đảo)
        và không có chặng di chuyển nào vượt trần 60 phút.
        """
        pq_dests = [
            Destination(
                id="pq-1", name="Bãi Sao Phú Quốc", province="Kiên Giang", category="Biển & Nghỉ dưỡng",
                latitude=10.0544, longitude=104.0355, price_min=0, price_max=0,
                cluster_id="ISLAND_PHU_QUOC", sub_region="Phú Quốc"
            ),
            Destination(
                id="pq-2", name="Làng chài Hàm Ninh", province="Kiên Giang", category="Ẩm thực & Văn hóa",
                latitude=10.1819, longitude=104.0438, price_min=150000, price_max=350000,
                cluster_id="ISLAND_PHU_QUOC", sub_region="Phú Quốc"
            ),
            Destination(
                id="pq-3", name="Dinh Cậu Phú Quốc", province="Kiên Giang", category="Tâm linh & Hoàng hôn",
                latitude=10.2175, longitude=103.9575, price_min=0, price_max=0,
                cluster_id="ISLAND_PHU_QUOC", sub_region="Phú Quốc"
            ),
            Destination(
                id="pq-4", name="Bãi Trường Sunset Sanato", province="Kiên Giang", category="Biển & Check-in",
                latitude=10.1602, longitude=103.9681, price_min=100000, price_max=200000,
                cluster_id="ISLAND_PHU_QUOC", sub_region="Phú Quốc"
            ),
            Destination(
                id="ht-1", name="Khu du lịch Mũi Nai Hà Tiên", province="Kiên Giang", category="Biển & Nghỉ dưỡng",
                latitude=10.3939, longitude=105.3825, price_min=50000, price_max=100000,
                cluster_id="MAINLAND_KIEN_GIANG", sub_region="Hà Tiên"
            ),
        ]
        orig_dests = data_loader.destinations
        orig_by_id = data_loader._by_id
        try:
            data_loader.destinations = pq_dests
            data_loader._by_id = {d.id: d for d in pq_dests}

            constraints = UserConstraints(
                destination_province="Phú Quốc",
                sub_destination="Phú Quốc",
                total_days=2,
                people_count=2,
                budget_tier="luxury",
                start_date="2026-01-15"
            )
            plan = VistaMasterPlanner.generate_plan(constraints)
            scheduled_names = [a.destination_name for d in plan.days for a in d.activities]
            self.assertNotIn("Khu du lịch Mũi Nai Hà Tiên", scheduled_names, "Không được xếp Hà Tiên vào lịch đi đảo Phú Quốc!")
            for d in plan.days:
                for a in d.activities:
                    self.assertLessEqual(a.travel_time_from_prev_min, 60, "Không được có chặng > 60 phút")
        finally:
            data_loader.destinations = orig_dests
            data_loader._by_id = orig_by_id

    def test_regression_2_ha_nam_scarce_points_no_empty_days_charged(self):
        """
        Lỗi 3: Hà Nam chỉ có 2 điểm cho lịch 3 ngày -> Không được sinh ngày 3 rỗng và không tính khách sạn/đi lại/ăn uống cho ngày rỗng.
        """
        hn_dests = [
            Destination(
                id="hn-1", name="Khu du lịch Tam Chúc", province="Hà Nam", category="Tâm linh & Cảnh quan",
                latitude=20.5621, longitude=105.8744, price_min=200000, price_max=250000
            ),
            Destination(
                id="hn-2", name="Đền Trúc - Ngũ Động Thi Sơn", province="Hà Nam", category="Di tích & Thiên nhiên",
                latitude=20.5511, longitude=105.8950, price_min=30000, price_max=50000
            ),
        ]
        orig_dests = data_loader.destinations
        orig_by_id = data_loader._by_id
        try:
            data_loader.destinations = hn_dests
            data_loader._by_id = {d.id: d for d in hn_dests}

            constraints = UserConstraints(
                destination_province="Hà Nam",
                total_days=3,
                people_count=2,
                budget_tier="standard"
            )
            plan = VistaMasterPlanner.generate_plan(constraints)
            # Mục 7 & Mục 10 (#12): Giữ đủ 3 ngày trong response; ngày không có điểm được đánh dấu rõ và số đêm khách sạn vẫn là 2 đêm
            self.assertEqual(len(plan.days), 3, "Phải giữ đủ 3 ngày khách chọn trong response")
            self.assertEqual(plan.total_days, 3)
            self.assertEqual(plan.days[2].day_status, "FREE_DAY")
            self.assertEqual(plan.days[2].subtotal_cost_vnd, 0)
            self.assertTrue(any("thời gian tự do" in w.lower() or "chưa có điểm phù hợp" in w.lower() for w in plan.warnings))
            self.assertTrue(any("ninh bình" in w.lower() for w in plan.warnings))
            # Hotel nights for 3N2Đ must remain 2 nights
            self.assertEqual(plan.breakdown["nights_count"], 2)
            # Transport cost for 2 active days (standard = 350k/day -> 700k), NOT 3 days
            self.assertEqual(plan.breakdown["transport_cost"], 2 * config.DAILY_TRANSPORT_RATES["standard"])
        finally:
            data_loader.destinations = orig_dests
            data_loader._by_id = orig_by_id

    def test_regression_3_hue_elderly_leg_cap_and_grouped_warning(self):
        """
        Lỗi 2: Huế đoàn có người cao tuổi -> Trần chặng <= 40 phút, không xếp điểm lệch tọa độ 65km (105 phút),
        và cảnh báo 'mức độ vận động chưa được xác minh' chỉ xuất hiện tối đa 1 dòng mỗi ngày.
        """
        constraints = UserConstraints(
            destination_province="Thừa Thiên Huế",
            total_days=2,
            people_count=4,
            budget_tier="economy",
            has_elderly=True
        )
        plan = VistaMasterPlanner.generate_plan(constraints)
        for d in plan.days:
            day_transit = 0
            for a in d.activities:
                self.assertLessEqual(a.travel_time_from_prev_min, config.MAX_LEG_MINUTES_ELDERLY)
                day_transit += a.travel_time_from_prev_min
            self.assertLessEqual(day_transit, config.MAX_DAILY_TRANSIT_MINUTES_ELDERLY)

        elderly_unverified_warnings = [w for w in plan.warnings if "mức độ vận động chưa được xác minh" in w]
        self.assertLessEqual(
            len(elderly_unverified_warnings),
            len(plan.days),
            "Cảnh báo mức độ vận động chưa xác minh phải được gộp tối đa 1 dòng mỗi ngày!"
        )

    def test_regression_4_hcm_luxury_culinary_noon_never_temple_or_night_street(self):
        """
        Lỗi 5: TP.HCM luxury ẩm thực -> Khung trưa (NOON) không bao giờ xếp Chùa Bà Thiên Hậu hay Phố ẩm thực Vĩnh Khánh (phố ăn đêm).
        """
        hcm_dests = [
            Destination(
                id="hcm-chua", name="Chùa Bà Thiên Hậu", province="TP. Hồ Chí Minh", category="Tâm linh & Di tích",
                latitude=10.7532, longitude=106.6601, price_min=0, price_max=0
            ),
            Destination(
                id="hcm-vinhkhanh", name="Phố ẩm thực Vĩnh Khánh", province="TP. Hồ Chí Minh", category="Ẩm thực đêm",
                latitude=10.7611, longitude=106.7022, price_min=150000, price_max=400000,
                best_time="EVENING", suitable_slots=["EVENING", "NIGHT"],
                opening_hours={"open": "17:00", "close": "23:30"}
            ),
            Destination(
                id="hcm-nhahang", name="Nhà hàng Cục Gạch Quán", province="TP. Hồ Chí Minh", category="Ẩm thực & Nhà hàng",
                latitude=10.7905, longitude=106.6915, price_min=300000, price_max=700000,
                best_time="NOON", suitable_slots=["NOON", "EVENING"],
                opening_hours={"open": "09:00", "close": "22:00"}
            ),
            Destination(
                id="hcm-dinh", name="Dinh Độc Lập", province="TP. Hồ Chí Minh", category="Di tích & Lịch sử",
                latitude=10.7769, longitude=106.6953, price_min=40000, price_max=65000
            ),
        ]
        orig_dests = data_loader.destinations
        orig_by_id = data_loader._by_id
        try:
            data_loader.destinations = hcm_dests
            data_loader._by_id = {d.id: d for d in hcm_dests}

            constraints = UserConstraints(
                destination_province="TP. Hồ Chí Minh",
                total_days=1,
                people_count=2,
                budget_tier="luxury",
                interests=["ẩm thực bản địa"]
            )
            plan = VistaMasterPlanner.generate_plan(constraints)
            noon_acts = [a for d in plan.days for a in d.activities if a.time_slot == "NOON"]
            self.assertEqual(len(noon_acts), 1)
            self.assertEqual(noon_acts[0].destination_name, "Nhà hàng Cục Gạch Quán")
            self.assertNotEqual(noon_acts[0].destination_name, "Chùa Bà Thiên Hậu")
            self.assertNotEqual(noon_acts[0].destination_name, "Phố ẩm thực Vĩnh Khánh")
        finally:
            data_loader.destinations = orig_dests
            data_loader._by_id = orig_by_id

    def test_regression_5_danang_bana_min_duration_and_dynamic_titles(self):
        """
        Lỗi 4: Bà Nà Hills (min_duration_min >= 180) không được xếp vào khung tối 18:30-19:30 (1 giờ);
        tiêu đề ngày tạo động từ tên địa điểm thực tế.
        """
        dn_bana = Destination(
            id="dn-bana", name="Sun World Bà Nà Hills", province="Đà Nẵng", category="Giải trí & Cảnh quan",
            latitude=15.9977, longitude=107.9881, price_min=900000, price_max=900000,
            min_duration_min=240, avg_duration_min=240, best_time="MORNING",
            suitable_slots=["MORNING", "AFTERNOON"],
            opening_hours={"open": "07:30", "close": "21:00"}
        )
        self.assertFalse(is_slot_suitable(dn_bana, "EVENING"), "Bà Nà Hills không được phép xếp vào buổi tối!")
        self.assertFalse(is_slot_suitable(dn_bana, "NOON"), "Bà Nà Hills không được phép xếp vào khung ăn trưa!")
        self.assertTrue(is_slot_suitable(dn_bana, "MORNING"))

        plan = VistaMasterPlanner.generate_plan(UserConstraints(
            destination_province="Đà Nẵng",
            total_days=2,
            people_count=2,
            interests=["biển", "ẩm thực"],
            start_date="2026-06-15"
        ))
        for d in plan.days:
            self.assertNotIn("Chạm ngõ di sản & Danh lam biểu tượng", d.title)
            self.assertTrue(any(a.destination_name in d.title for a in d.activities))

    def test_real_seed_dataset_regressions_if_available(self):
        """
        Kiểm thử trực tiếp trên bộ dữ liệu thật 645 điểm (demo_destinations_seed.csv) nếu có trong workspace.
        """
        real_path = os.getenv("REAL_SEED_PATH") or (REAL_SEED_DEFAULT if os.path.exists(REAL_SEED_DEFAULT) else None)
        if not real_path or not os.path.exists(real_path):
            self.skipTest("Không tìm thấy demo_destinations_seed.csv")

        real_loader = DestinationDataLoader(real_path)
        orig_dests = data_loader.destinations
        orig_by_id = data_loader._by_id
        try:
            data_loader.destinations = real_loader.destinations
            data_loader._by_id = real_loader._by_id

            # 1. Phú Quốc 4 ngày luxury
            pq_plan = VistaMasterPlanner.generate_plan(UserConstraints(
                destination_province="Phú Quốc",
                sub_destination="Phú Quốc",
                total_days=3,
                people_count=2,
                budget_tier="luxury",
                start_date="2026-01-20"
            ))
            for d in pq_plan.days:
                for a in d.activities:
                    self.assertNotIn("hà tiên", a.destination_name.lower())
                    self.assertLessEqual(a.travel_time_from_prev_min, 60)

            # 2. Huế 3 ngày người cao tuổi economy
            hue_plan = VistaMasterPlanner.generate_plan(UserConstraints(
                destination_province="Thừa Thiên Huế",
                total_days=3,
                people_count=4,
                budget_tier="economy",
                has_elderly=True,
                start_date="2026-04-15"
            ))
            for d in hue_plan.days:
                for a in d.activities:
                    self.assertLessEqual(a.travel_time_from_prev_min, 40)

            # 3. Hà Nam 3 ngày (Mục 7 & 10 #12: Giữ đủ 3 ngày, số đêm lưu trú = 2 đêm, ngày thiếu điểm được đánh dấu FREE_DAY)
            hn_plan = VistaMasterPlanner.generate_plan(UserConstraints(
                destination_province="Hà Nam",
                total_days=3,
                people_count=2,
                budget_tier="standard"
            ))
            self.assertEqual(len(hn_plan.days), 3)
            self.assertEqual(hn_plan.breakdown["nights_count"], 2)
            for d in hn_plan.days:
                if len(d.activities) == 0:
                    self.assertIn(d.day_status, ("FREE_DAY", "NO_SUITABLE_STOPS"))
        finally:
            data_loader.destinations = orig_dests
            data_loader._by_id = orig_by_id

    def test_narrator_and_weather_consistency_stage_6(self):
        """
        Giai đoạn 6: Không gắn 'không gian thoáng mát' cho suối khoáng nóng; thời tiết Đà Nẵng != Huế;
        lời khuyên thời tiết nhất quán khi có xếp bãi biển.
        """
        adv_hue = get_weather_advisory("Thừa Thiên Huế", month=11)
        adv_dn = get_weather_advisory("Đà Nẵng", month=11)
        self.assertNotEqual(adv_hue["advisory"], adv_dn["advisory"])
        self.assertNotEqual(adv_hue["temp_range"], adv_dn["temp_range"])

        hot_spring_slot = ActivitySlot(
            destination_id="hs-1",
            destination_name="Công viên Suối khoáng nóng Núi Thần Tài",
            time_slot="MORNING",
            start_time="08:30",
            end_time="11:30",
            category="Nghỉ dưỡng",
            cost_vnd=400000,
            cost_label="400,000đ"
        )
        sent = NarratorGenerator._build_slot_sentence(hot_spring_slot, weather_temp_num=22)
        self.assertNotIn("không gian thoáng mát", sent)

        beach_slot = ActivitySlot(
            destination_id="b-1",
            destination_name="Bãi biển Mỹ Khê",
            time_slot="MORNING",
            start_time="08:30",
            end_time="10:30",
            category="Biển",
            cost_vnd=0,
            cost_label="Miễn phí"
        )
        rationale = NarratorGenerator.generate_day_rationale(1, "Đà Nẵng", "Ngày 1 · Bãi biển Mỹ Khê", [beach_slot], month=11)
        self.assertNotIn("ưu tiên điểm tham quan văn hóa, bảo tàng và ẩm thực trong nhà", rationale)
        self.assertIn("khí hậu theo mùa", rationale.lower())

    def test_intent_parser_8_sample_prompts_stage_7(self):
        """
        Giai đoạn 7.6: Kiểm thử 8 câu prompt mẫu trên đường không LLM (_parse_deterministic).
        """
        # 1. Phủ định sở thích ("Không muốn đi biển, chỉ muốn đi chùa ở Ninh Bình")
        r1 = IntentParserEngine._parse_deterministic("Không muốn đi biển, chỉ muốn đi chùa ở Ninh Bình 2 ngày")
        self.assertEqual(r1["destination"], "Ninh Bình")
        self.assertIn("biển", r1["must_avoid"])
        self.assertNotIn("biển & nghỉ dưỡng", r1["interests"])
        self.assertIn("văn hóa & di sản", r1["interests"])

        # 2. Không nêu sở thích -> interests rỗng, không gán mặc định biển + ẩm thực
        r2 = IntentParserEngine._parse_deterministic("Gia đình đi Huế 3 ngày cùng ông bà")
        self.assertEqual(r2["destination"], "Thừa Thiên Huế")
        self.assertTrue(r2["has_elderly"])
        self.assertEqual(r2["interests"], [])

        # 3. Từ khóa "sang chảnh" -> luxury
        r3 = IntentParserEngine._parse_deterministic("Chuyến đi sang chảnh ở Đà Nẵng 3 ngày")
        self.assertEqual(r3["destination"], "Đà Nẵng")
        self.assertEqual(r3["budget_tier"], "luxury")

        # 4. Ngân sách số tiền cụ thể "tối đa 10 triệu cho 4 người đi Đà Lạt 4 ngày"
        r4 = IntentParserEngine._parse_deterministic("Ngân sách tối đa 10 triệu cho 4 người đi Đà Lạt 4 ngày")
        self.assertEqual(r4["destination"], "Lâm Đồng")
        self.assertEqual(r4["sub_destination"], "Đà Lạt")
        self.assertEqual(r4["people_count"], 4)
        self.assertEqual(r4["max_total_budget_vnd"], 10_000_000)
        self.assertEqual(r4["budget_tier"], "economy")

        # 5. "2 bé nhỏ" + gia đình -> cộng người lớn (people_count = 4, has_children = True)
        r5 = IntentParserEngine._parse_deterministic("Hai vợ chồng và 2 bé nhỏ đi Nha Trang 3 ngày")
        self.assertEqual(r5["destination"], "Khánh Hòa")
        self.assertEqual(r5["sub_destination"], "Nha Trang")
        self.assertEqual(r5["people_count"], 4)
        self.assertTrue(r5["has_children"])

        # 6. Mơ hồ điểm đến ("Hà Nội hay Hải Phòng") -> needs_clarification = True
        r6 = IntentParserEngine._parse_deterministic("Cuối tuần này nên đi Hà Nội hay Hải Phòng 2 ngày?")
        self.assertTrue(r6["needs_clarification"])
        self.assertGreaterEqual(len(r6["clarification_questions"]), 1)

        # 7. Giữ mức thành phố/đảo: Phú Quốc -> destination="Kiên Giang", sub_destination="Phú Quốc"
        r7 = IntentParserEngine._parse_deterministic("Đi Phú Quốc 4 ngày 3 đêm nghỉ dưỡng cao cấp")
        self.assertEqual(r7["destination"], "Kiên Giang")
        self.assertEqual(r7["sub_destination"], "Phú Quốc")
        self.assertEqual(r7["budget_tier"], "luxury")

        # 8. Giữ mức thành phố: Hội An + tránh ồn ào
        r8 = IntentParserEngine._parse_deterministic("Đi Hội An 2 ngày thích ăn uống nhưng tránh ồn ào")
        self.assertEqual(r8["destination"], "Quảng Nam")
        self.assertEqual(r8["sub_destination"], "Hội An")
        self.assertIn("ẩm thực bản địa", r8["interests"])
        self.assertIn("ồn ào", r8["must_avoid"])

    def test_server_py_enforces_token_and_allowed_origins_stage_8(self):
        """
        Giai đoạn 8.1: Kiểm tra server.py dùng hmac.compare_digest cho X-Internal-Token và ALLOWED_ORIGINS.
        """
        from server import VistaAIHandler
        orig_token = config.INTERNAL_TOKEN
        try:
            config.INTERNAL_TOKEN = "vista-secret-token-999"
            h_ok = VistaAIHandler.__new__(VistaAIHandler)
            h_ok.headers = {"X-Internal-Token": "vista-secret-token-999"}
            self.assertTrue(h_ok._check_auth())

            h_bad = VistaAIHandler.__new__(VistaAIHandler)
            h_bad.headers = {"X-Internal-Token": "wrong-token"}
            self.assertFalse(h_bad._check_auth())

            h_none = VistaAIHandler.__new__(VistaAIHandler)
            h_none.headers = {}
            self.assertFalse(h_none._check_auth())
        finally:
            config.INTERNAL_TOKEN = orig_token

    def test_audit_and_export_scripts_stage_5_and_9(self):
        """
        Giai đoạn 5.1, 5.2 & 9.4: Kiểm tra script audit_data_plausibility.py và export_review_sheet.py chạy chuẩn.
        """
        import tempfile
        from scripts.audit_data_plausibility import run_plausibility_audit
        from scripts.export_review_sheet import export_review_sheet

        with tempfile.TemporaryDirectory() as tmpdir:
            json_out = os.path.join(tmpdir, "audit.json")
            csv_out = os.path.join(tmpdir, "audit.csv")
            rep = run_plausibility_audit(out_json_path=json_out, out_csv_path=csv_out)
            self.assertTrue(os.path.exists(json_out))
            self.assertTrue(os.path.exists(csv_out))
            self.assertIn("total_destinations_scanned", rep)
            self.assertIn("summary_by_issue_type", rep)

            rev_csv = os.path.join(tmpdir, "review.csv")
            rev_md = os.path.join(tmpdir, "review.md")
            rev_res = export_review_sheet(out_csv_path=rev_csv, out_md_path=rev_md)
            self.assertTrue(os.path.exists(rev_csv))
            self.assertTrue(os.path.exists(rev_md))
            self.assertGreaterEqual(rev_res["scenarios_count"], 20)

if __name__ == "__main__":
    unittest.main()
