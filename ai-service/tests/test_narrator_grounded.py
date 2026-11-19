import unittest
from narrator.generator import NarratorGenerator, NarrationResult, verify_narration
from services.weather_advisor import get_region_by_province, NORTH_PROVINCES, CENTRAL_PROVINCES, SOUTH_PROVINCES
from models.reason import ActivitySlot
from data.loader import data_loader

class TestNarratorGrounded(unittest.TestCase):
    def test_63_provinces_coverage(self):
        total_covered = len(NORTH_PROVINCES) + len(CENTRAL_PROVINCES) + len(SOUTH_PROVINCES)
        self.assertGreaterEqual(total_covered, 63)

        # Sample test from each region
        self.assertEqual(get_region_by_province("Hà Nội"), "north")
        self.assertEqual(get_region_by_province("Quảng Ninh"), "north")
        self.assertEqual(get_region_by_province("Đà Nẵng"), "central")
        self.assertEqual(get_region_by_province("Thừa Thiên Huế"), "central")
        self.assertEqual(get_region_by_province("Khánh Hòa"), "central")
        self.assertEqual(get_region_by_province("TP. Hồ Chí Minh"), "south")
        self.assertEqual(get_region_by_province("Kiên Giang"), "south")
        self.assertEqual(get_region_by_province("Cần Thơ"), "south")
        self.assertEqual(get_region_by_province("UnknownLand"), "neutral")

    def test_no_hallucinated_dish_names(self):
        activities = [
            ActivitySlot(
                destination_id="d1",
                destination_name="Bảo tàng Điêu khắc Chăm",
                time_slot="MORNING",
                start_time="08:30",
                end_time="10:30",
                category="Văn hóa",
                cost_vnd=60000,
                cost_label="60,000đ"
            ),
            ActivitySlot(
                destination_id="d2",
                destination_name="Quán Mỳ Quảng Bà Mua",
                time_slot="NOON",
                start_time="11:45",
                end_time="13:00",
                category="Ẩm thực",
                cost_vnd=90000,
                cost_label="90,000đ"
            )
        ]

        facts = {
            "day_num": 1,
            "province": "Đà Nẵng",
            "day_title": "Ngày 1 · Chạm ngõ di sản",
            "activities": activities
        }

        result = NarratorGenerator.generate(facts)
        self.assertIsInstance(result, NarrationResult)
        rationale = result.day_rationale

        self.assertIn("Bảo tàng Điêu khắc Chăm", rationale)
        self.assertIn("Quán Mỳ Quảng Bà Mua", rationale)
        self.assertNotIn("hai đầu da", rationale)
        self.assertNotIn("bún quậy", rationale)
        self.assertNotIn("cơm hến", rationale)

    def test_only_narrates_present_slots(self):
        activities = [
            ActivitySlot(
                destination_id="d3",
                destination_name="Chùa Linh Ứng Bãi Bụt",
                time_slot="AFTERNOON",
                start_time="14:30",
                end_time="16:30",
                category="Tâm linh",
                cost_vnd=0,
                cost_label="Miễn phí vé"
            ),
            ActivitySlot(
                destination_id="d4",
                destination_name="Cầu Rồng Đà Nẵng",
                time_slot="EVENING",
                start_time="18:30",
                end_time="20:30",
                category="Thắng cảnh",
                cost_vnd=0,
                cost_label="Miễn phí vé"
            )
        ]

        rationale = NarratorGenerator.generate_day_rationale(1, "Đà Nẵng", "Ngày 1", activities)
        self.assertIn("Chiều", rationale)
        self.assertIn("Tối", rationale)
        self.assertNotIn("Sáng (", rationale)
        self.assertNotIn("Trưa (", rationale)

    def test_different_morning_destinations_get_different_sentences(self):
        # Two distinct destinations in the morning
        act1 = ActivitySlot(
            destination_id="d1",
            destination_name="Đại Nội Huế",
            time_slot="MORNING",
            start_time="08:30",
            end_time="11:00",
            category="Di tích",
            cost_vnd=200000,
            cost_label="200,000đ"
        )
        act2 = ActivitySlot(
            destination_id="d2",
            destination_name="Chùa Thiên Mụ",
            time_slot="MORNING",
            start_time="08:30",
            end_time="10:00",
            category="Tâm linh",
            cost_vnd=0,
            cost_label="Miễn phí vé"
        )

        sent1 = NarratorGenerator._build_slot_sentence(act1, weather_temp_num=25)
        sent2 = NarratorGenerator._build_slot_sentence(act2, weather_temp_num=25)
        self.assertNotEqual(sent1, sent2)
        self.assertIn("Đại Nội Huế", sent1)
        self.assertIn("Chùa Thiên Mụ", sent2)

    def test_verify_narration_catches_fabricated_places(self):
        real_act = ActivitySlot(
            destination_id="d1",
            destination_name="Hồ Hoàn Kiếm",
            time_slot="MORNING",
            start_time="08:30",
            end_time="10:00",
            category="Danh thắng",
            cost_vnd=0,
            cost_label="Miễn phí"
        )
        valid_text = "Sáng ghé Hồ Hoàn Kiếm dạo mát."
        self.assertTrue(verify_narration(valid_text, [real_act]))

        fabricated_text = "Sáng ghé Cầu Rồng và thưởng thức bún bò ăn kèm hai đầu da."
        self.assertFalse(verify_narration(fabricated_text, [real_act]))

if __name__ == "__main__":
    unittest.main()
