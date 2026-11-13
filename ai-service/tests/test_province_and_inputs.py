import unittest
from api.contract import parse_plan_request, parse_bool, ProvinceNotSupportedError
from data.loader import data_loader
from engine.planner import VistaMasterPlanner

class TestProvinceAndInputs(unittest.TestCase):
    def test_empty_payload_raises_422_exception(self):
        with self.assertRaises(ProvinceNotSupportedError):
            parse_plan_request({})

    def test_empty_destination_raises_422_exception(self):
        with self.assertRaises(ProvinceNotSupportedError):
            parse_plan_request({"destination": ""})
        with self.assertRaises(ProvinceNotSupportedError):
            parse_plan_request({"destinationProvince": "   "})
        with self.assertRaises(ProvinceNotSupportedError):
            parse_plan_request({"province": ""})

    def test_substring_nam_does_not_match_quang_nam(self):
        # 'Nam' must NOT match 'Quảng Nam' or 'Hà Nam'
        matched = data_loader.get_by_province("Nam")
        self.assertEqual(len(matched), 0, "Substring 'Nam' should not match any province!")
        self.assertIsNone(data_loader.get_canonical_province_name("Nam"))

    def test_ui_parenthesized_destination_names_resolve_cleanly(self):
        cases = {
            "Đà Lạt (Lâm Đồng)": "Lâm Đồng",
            "Phú Quốc (Kiên Giang)": "Kiên Giang",
            "Bắc Kạn (Hồ Ba Bể)": "Bắc Kạn",
            "Vũng Tàu (Bà Rịa - Vũng Tàu)": "Bà Rịa - Vũng Tàu",
            "Hà Giang (Đồng Văn - Mã Pí Lèng)": "Hà Giang",
        }
        for raw_in, expected in cases.items():
            resolved = data_loader.get_canonical_province_name(raw_in)
            self.assertEqual(resolved, expected, f"Failed to resolve UI string '{raw_in}'")
            self.assertGreater(len(data_loader.get_by_province(raw_in)), 0)

    def test_parse_bool_handles_various_representations(self):
        self.assertFalse(parse_bool("false"))
        self.assertFalse(parse_bool("False"))
        self.assertFalse(parse_bool("0"))
        self.assertFalse(parse_bool("no"))
        self.assertFalse(parse_bool(0))
        self.assertFalse(parse_bool(None))
        self.assertFalse(parse_bool(False))

        self.assertTrue(parse_bool("true"))
        self.assertTrue(parse_bool("True"))
        self.assertTrue(parse_bool("1"))
        self.assertTrue(parse_bool("yes"))
        self.assertTrue(parse_bool(1))
        self.assertTrue(parse_bool(True))

        # Check parse_plan_request with string booleans
        c = parse_plan_request({
            "destination": "Đà Nẵng",
            "hasElderly": "false",
            "hasChildren": "true",
            "hasHotel": "0"
        })
        self.assertFalse(c.has_elderly)
        self.assertTrue(c.has_children)
        self.assertFalse(c.has_hotel)

    def test_hue_alias_matches_thua_thien_hue(self):
        canonical = data_loader.get_canonical_province_name("Huế")
        self.assertEqual(canonical, "Thừa Thiên Huế")
        dests = data_loader.get_by_province("Huế")
        self.assertGreater(len(dests), 0)

        plan = VistaMasterPlanner.generate_plan(parse_plan_request({"destination": "Huế"}))
        self.assertEqual(plan.destination_province, "Thừa Thiên Huế")

    def test_province_alias_input_key(self):
        c = parse_plan_request({"province": "Hà Nội", "total_days": 2})
        self.assertEqual(c.destination_province, "Hà Nội")
        self.assertEqual(c.total_days, 2)

    def test_invalid_input_format_raises_error(self):
        from api.contract import InvalidInputError
        with self.assertRaises(InvalidInputError):
            parse_plan_request({"destination": "Đà Nẵng", "days": "invalid_number"})
        with self.assertRaises(InvalidInputError):
            parse_plan_request({"destination": "Đà Nẵng", "people": "many"})
        with self.assertRaises(InvalidInputError):
            parse_plan_request({"destination": "Đà Nẵng", "arrival_time": "25:00"})
        with self.assertRaises(InvalidInputError):
            parse_plan_request({"destination": "Đà Nẵng", "start_date": "not-a-date"})

    def test_clamping_and_warnings(self):
        c = parse_plan_request({"destination": "Đà Nẵng", "days": 10, "people": -5})
        self.assertEqual(c.total_days, 7)
        self.assertEqual(c.people_count, 1)
        self.assertTrue(any("vượt quá giới hạn tối đa" in w for w in c.initial_warnings))
        self.assertTrue(any("không hợp lệ, đã điều chỉnh về 1 người" in w for w in c.initial_warnings))

    def test_determinism_same_input_same_output(self):
        from api.contract import serialize_plan
        payload = {
            "destination": "Đà Nẵng",
            "days": 2,
            "people": 2,
            "budget_tier": "standard",
            "start_date": "2026-11-15"
        }
        p1 = VistaMasterPlanner.generate_plan(parse_plan_request(payload))
        p2 = VistaMasterPlanner.generate_plan(parse_plan_request(payload))
        s1 = serialize_plan(p1, request_id="fixed-id")
        s2 = serialize_plan(p2, request_id="fixed-id")
        self.assertEqual(s1, s2, "Same input and start_date must generate 100% deterministic output")

    def test_highlands_weather_advisory(self):
        from services.weather_advisor import get_weather_advisory, get_region_by_province
        region = get_region_by_province("Lâm Đồng")
        self.assertEqual(region, "highlands")
        adv_dry = get_weather_advisory("Lâm Đồng", month=11)
        self.assertFalse(adv_dry["is_rainy_season"])
        self.assertIn("cao nguyên", adv_dry["advisory"])
        adv_rain = get_weather_advisory("Đà Lạt", month=7)
        self.assertTrue(adv_rain["is_rainy_season"])

if __name__ == "__main__":
    unittest.main()

