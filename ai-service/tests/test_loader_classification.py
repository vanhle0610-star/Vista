import unittest
import os
import json
from data.loader import has_exact_token, normalize_text, data_loader
from models.destination import Destination

class TestDataLoaderClassification(unittest.TestCase):
    def test_token_matching_false_positives(self):
        # 'hoạt động' must NOT trigger 'động'
        self.assertFalse(has_exact_token("động", "Trung tâm hoạt động thanh thiếu niên", exclude_prefix="hoạt"))
        # 'Động Thiên Đường' MUST trigger 'động'
        self.assertTrue(has_exact_token("động", "Động Thiên Đường", exclude_prefix="hoạt"))

        # 'yêu cầu' must NOT trigger 'cầu'
        self.assertFalse(has_exact_token("cầu", "Theo yêu cầu của khách tham quan", exclude_prefix="yêu"))
        # 'Cầu Rồng' MUST trigger 'cầu'
        self.assertTrue(has_exact_token("cầu", "Cầu Rồng Đà Nẵng", exclude_prefix="yêu"))

        # 'chè' must not match 'chèo thuyền'
        self.assertFalse(has_exact_token("chè", "Trải nghiệm chèo thuyền SUP trên sông"))
        # 'Quán chè' MUST match 'chè'
        self.assertTrue(has_exact_token("chè", "Quán chè Hẻm nổi tiếng"))

    def test_loaded_destinations_classification_and_evidence(self):
        self.assertGreater(len(data_loader.destinations), 0)
        sample = data_loader.destinations[0]
        self.assertTrue(hasattr(sample, "auto_classified"))
        self.assertTrue(sample.auto_classified)
        self.assertTrue(hasattr(sample, "classification_evidence"))
        self.assertIsInstance(sample.classification_evidence, list)

    def test_stable_id_not_empty(self):
        for d in data_loader.destinations:
            self.assertTrue(
                d.id.startswith(("dest-", "osm-node-", "osm-way-")),
                f"Invalid destination ID prefix: {d.id}"
            )
            self.assertGreater(len(d.id), 5)

    def test_validate_dataset_generates_report(self):
        report = data_loader.validate_dataset()
        self.assertIn("total_destinations", report)
        self.assertIn("anomalies_count", report)
        self.assertIn("anomalies", report)

        report_file = os.path.join(os.path.dirname(data_loader.csv_path or "."), "data_quality_report.json")
        report_loader_file = os.path.join(os.path.dirname(__file__), "../data/data_quality_report.json")
        self.assertTrue(os.path.exists(report_loader_file) or os.path.exists(report_file))

if __name__ == "__main__":
    unittest.main()

