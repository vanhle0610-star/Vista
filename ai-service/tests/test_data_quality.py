import unittest
import os
from data.loader import data_loader
from models.destination import Destination
from models.constraints import UserConstraints
from engine.planner import VistaMasterPlanner

class TestDataQuality(unittest.TestCase):
    def test_snack_rules_and_thresholds(self):
        # Create a mock temporary dataset of 4 destinations to test rules 3a and 3b
        d_doi_che = Destination(
            id="test-1",
            name="Đồi chè Cầu Đất",
            province="Lâm Đồng",
            category="Cảnh quan & Nông nghiệp",
            latitude=11.9,
            longitude=108.4,
            price_min=100000,
            price_max=100000
        )
        d_banh_mi_40k = Destination(
            id="test-2",
            name="Bánh mì Phượng",
            province="Quảng Nam",
            category="Ẩm thực",
            latitude=15.8,
            longitude=108.3,
            price_min=40000,
            price_max=40000
        )
        d_banh_mi_48k = Destination(
            id="test-3",
            name="Bánh mì Huỳnh Hoa",
            province="TP. Hồ Chí Minh",
            category="Ẩm thực",
            latitude=10.7,
            longitude=106.6,
            price_min=48000,
            price_max=55000
        )
        d_cafe_90k = Destination(
            id="test-4",
            name="Quán cà phê Rooftop",
            province="Hà Nội",
            category="Cà phê & Đồ uống",
            latitude=21.0,
            longitude=105.8,
            price_min=90000,
            price_max=150000
        )

        orig_dests = data_loader.destinations
        try:
            data_loader.destinations = [d_doi_che, d_banh_mi_40k, d_banh_mi_48k, d_cafe_90k]
            report = data_loader.validate_dataset()
            abnormal_items = report["snack_price_abnormal"]
            abnormal_ids = [item["id"] for item in abnormal_items]

            # 3 bản ghi (đồi chè, bánh mì 40k, bánh mì 48k) KHÔNG bị gắn cờ
            self.assertNotIn("test-1", abnormal_ids, "Đồi chè không được bị gắn cờ vì category không phải ẩm thực")
            self.assertNotIn("test-2", abnormal_ids, "Bánh mì 40k <= 60k không được bị gắn cờ")
            self.assertNotIn("test-3", abnormal_ids, "Bánh mì 48k <= 60k không được bị gắn cờ")

            # Một quán cà phê 90k BỊ gắn cờ
            self.assertIn("test-4", abnormal_ids, "Quán cà phê 90k > 40k phải bị gắn cờ")
        finally:
            data_loader.destinations = orig_dests
            data_loader.validate_dataset()

    def test_hot_spring_mountain_not_strenuous(self):
        # Find 'Núi Thần Tài' in real dataset or verify exemption rule
        matches = [d for d in data_loader.destinations if "thần tài" in d.name.lower()]
        for d in matches:
            self.assertNotEqual(
                d.walking_load,
                "STRENUOUS",
                f"Suối khoáng nóng '{d.name}' phải là LIGHT hoặc MODERATE, không được là STRENUOUS!"
            )

    def test_validate_dataset_schema_and_missing_opening_hours(self):
        report = data_loader.validate_dataset()
        self.assertIn("total", report)
        self.assertIn("provinces_count", report)
        self.assertIn("destinations_by_province", report)
        self.assertIn("missing_opening_hours", report)
        self.assertIn("opening_hours_invalid_json", report)
        self.assertIn("price_min_gt_price_max", report)
        self.assertIn("coordinates_out_of_vietnam", report)
        self.assertIn("duplicate_names", report)
        self.assertIn("auto_classified_count", report)
        self.assertIn("snack_price_abnormal", report)
        self.assertIn("generated_at", report)

        missing_info = report["missing_opening_hours"]
        self.assertIn("count", missing_info)
        self.assertIn("rate_percentage", missing_info)
        self.assertIn("destinations", missing_info)
        self.assertIsInstance(missing_info["destinations"], list)

    def test_audit_classification_script_runs(self):
        from scripts.audit_classification import run_audit
        out_path, count = run_audit("data/test_audit.csv")
        self.assertTrue(os.path.exists(out_path))
        self.assertGreater(count, 0)
        if os.path.exists(out_path):
            os.remove(out_path)

    def test_elderly_auto_classified_warning(self):
        # When an elderly plan is generated in a province with auto-classified destinations
        plan = VistaMasterPlanner.generate_plan(UserConstraints(
            destination_province="Đà Nẵng",
            total_days=2,
            has_elderly=True
        ))
        has_autoclassified_non_light = any(
            d.auto_classified and d.walking_load != "LIGHT"
            for day in plan.days
            for act in day.activities
            for d in [data_loader.get_by_id(act.destination_id)]
            if d
        )
        if has_autoclassified_non_light:
            self.assertTrue(any("mức độ vận động chưa được xác minh" in w for w in plan.warnings))
        plan = VistaMasterPlanner.generate_plan(UserConstraints(destination_province="Đà Nẵng", total_days=1))
        for day in plan.days:
            for act in day.activities:
                self.assertIn(act.data_confidence, ("VERIFIED", "STALE", "UNVERIFIED_HOURS"))
                if act.data_confidence == "UNVERIFIED_HOURS":
                    expected_warn = f"Chưa xác minh giờ mở cửa của {act.destination_name}, vui lòng kiểm tra trước khi đến"
                    self.assertIn(expected_warn, plan.warnings)

    def test_csv_verified_at_parsing_and_stale_flag(self):
        import tempfile
        import csv
        import os
        from data.loader import DestinationDataLoader
        from engine.timeline import DailyTimelineEngine

        # Create temporary CSV with 3 destinations:
        # 1. verified_at fresh
        # 2. verified_at missing
        # 3. verified_at stale (>180 days)
        rows = [
            ["name", "province", "category", "latitude", "longitude", "price_min", "price_max", "opening_hours", "source_url", "verified_at", "description", "image_reference"],
            ["Điểm Fresh", "Tỉnh Test", "Văn hóa", "16.0", "108.0", "0", "0", '{"mon":"08:00-17:00"}', "http://test", "2026-10-25T00:00:00Z", "Desc", "img"],
            ["Điểm NoVerified", "Tỉnh Test", "Văn hóa", "16.1", "108.1", "0", "0", '{"mon":"08:00-17:00"}', "http://test", "", "Desc", "img"],
            ["Điểm Stale", "Tỉnh Test", "Văn hóa", "16.2", "108.2", "0", "0", '{"mon":"08:00-17:00"}', "http://test", "2024-01-01T00:00:00Z", "Desc", "img"],
        ]
        with tempfile.NamedTemporaryFile(mode="w", encoding="utf-8", newline="", delete=False, suffix=".csv") as f:
            writer = csv.writer(f)
            writer.writerows(rows)
            tmp_path = f.name

        try:
            loader = DestinationDataLoader(tmp_path)
            self.assertEqual(len(loader.destinations), 3)

            d_fresh = loader.destinations[0]
            d_no_v = loader.destinations[1]
            d_stale = loader.destinations[2]

            self.assertIsNotNone(d_fresh.last_verified_at)
            self.assertIn("2026-10-25", d_fresh.last_verified_at)
            self.assertIsNone(d_no_v.last_verified_at)
            self.assertIsNotNone(d_stale.last_verified_at)
            self.assertIn("2024-01-01", d_stale.last_verified_at)

            # Test timeline confidence mapping
            c = UserConstraints(destination_province="Tỉnh Test", total_days=1)
            slots_fresh = DailyTimelineEngine.assemble_day_timeline(1, [d_fresh], c, scheduled_slots=["MORNING"])
            slots_no_v = DailyTimelineEngine.assemble_day_timeline(1, [d_no_v], c, scheduled_slots=["MORNING"])
            slots_stale = DailyTimelineEngine.assemble_day_timeline(1, [d_stale], c, scheduled_slots=["MORNING"])

            self.assertEqual(slots_fresh[0].data_confidence, "VERIFIED")
            self.assertEqual(slots_no_v[0].data_confidence, "UNVERIFIED_HOURS")
            self.assertEqual(slots_stale[0].data_confidence, "STALE")
        finally:
            if os.path.exists(tmp_path):
                os.remove(tmp_path)

if __name__ == "__main__":
    unittest.main()

