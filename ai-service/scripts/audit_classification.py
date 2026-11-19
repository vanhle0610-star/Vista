import os
import sys
import csv

# Add root directory to sys.path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from data.loader import data_loader

def run_audit(output_csv: str = "data/audit_classification.csv"):
    base_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
    out_path = os.path.join(base_dir, output_csv)
    os.makedirs(os.path.dirname(out_path), exist_ok=True)

    header = [
        "id",
        "name",
        "province",
        "category",
        "walking_load",
        "indoor_outdoor",
        "auto_classified",
        "classification_evidence"
    ]

    count = 0
    with open(out_path, mode="w", encoding="utf-8", newline="") as f:
        writer = csv.writer(f)
        writer.writerow(header)

        for d in data_loader.destinations:
            # Audit auto-classified records with STRENUOUS or LIGHT labels
            if d.auto_classified and d.walking_load in ("STRENUOUS", "LIGHT"):
                evidence_str = "; ".join(d.classification_evidence) if d.classification_evidence else ""
                writer.writerow([
                    d.id,
                    d.name,
                    d.province,
                    d.category,
                    d.walking_load,
                    d.indoor_outdoor,
                    d.auto_classified,
                    evidence_str
                ])
                count += 1

    print(f"[Audit] Successfully audited {count} auto-classified (STRENUOUS/LIGHT) destinations to {out_path}")
    return out_path, count

if __name__ == "__main__":
    run_audit()

