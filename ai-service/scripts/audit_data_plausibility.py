import os
import sys
import csv
import json
import statistics
from datetime import datetime, timezone
from typing import Dict, Any, List, Optional, Tuple

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

import config
from data.loader import DestinationDataLoader
from services.geo_calculator import haversine_km

PAID_ATTRACTION_KEYWORDS = [
    "vinwonders", "vinpearl safari", "safari", "sun world", "mikazuki",
    "công viên nước", "cong vien nuoc", "công viên giải trí", "thủy cung",
    "cáp treo", "cap treo", "khu vui chơi", "suối khoáng nóng", "núi thần tài",
    "bà nà hills", "ba na hills", "fansipan legend", "khu du lịch"
]

MAJOR_THEME_PARK_KEYWORDS = [
    "vinwonders", "vinpearl safari", "safari", "sun world", "mikazuki",
    "bà nà hills", "ba na hills", "công viên nước", "thủy cung"
]

INNER_CITY_LANDMARK_KEYWORDS = [
    "sông hương", "cố đô huế", "đại nội", "bảo tàng cổ vật cung đình",
    "chợ đông ba", "chùa thiên mụ", "cầu trường tiền", "nhà thờ đức bà",
    "chợ bến thành", "hồ hoàn kiếm", "cầu rồng"
]

KNOWN_LANDMARK_PROVINCE_RULES = [
    ("mũi né", "Bình Thuận"),
    ("hòn rơm", "Bình Thuận"),
    ("bàu sen", "Bình Thuận"),
    ("bàu trắng", "Bình Thuận"),
    ("tà đùng", "Đắk Nông"),
    ("nam cương", "Ninh Thuận"),
    ("mũi dinh", "Ninh Thuận"),
    ("vịnh vĩnh hy", "Ninh Thuận"),
]

def run_plausibility_audit(
    csv_path: Optional[str] = None,
    out_json_path: Optional[str] = None,
    out_csv_path: Optional[str] = None
) -> Dict[str, Any]:
    """
    Kiểm định tính hợp lý của dữ liệu điểm đến (Plausibility Audit - Giai đoạn 5).
    KHÔNG tự ý sửa dữ liệu gốc; chỉ xuất báo cáo JSON và CSV để con người xác minh.
    """
    loader = DestinationDataLoader(csv_path) if csv_path else DestinationDataLoader()
    destinations = loader.destinations

    # 1. Tính trung vị giá (chỉ tính các điểm có price_min > 0) theo category
    cat_prices: Dict[str, List[int]] = {}
    for d in destinations:
        if d.price_min > 0:
            cat_prices.setdefault(d.category, []).append(d.price_min)
    cat_medians: Dict[str, float] = {
        cat: statistics.median(vals) for cat, vals in cat_prices.items() if len(vals) >= 2
    }

    # 2. Tính tâm tọa độ trung vị theo từng tỉnh và danh sách cụm địa lý mỗi tỉnh
    prov_dests: Dict[str, List[Any]] = {}
    prov_clusters: Dict[str, set] = {}
    for d in destinations:
        prov_dests.setdefault(d.province, []).append(d)
        if getattr(d, "cluster_id", ""):
            prov_clusters.setdefault(d.province, set()).add(d.cluster_id)

    prov_centers: Dict[str, Tuple[float, float]] = {}
    for prov, p_list in prov_dests.items():
        med_lat = statistics.median([x.latitude for x in p_list])
        med_lng = statistics.median([x.longitude for x in p_list])
        prov_centers[prov] = (med_lat, med_lng)

    issues: List[Dict[str, Any]] = []
    now = datetime.now(timezone.utc)

    for d in destinations:
        text_low = f"{d.name} {d.category} {d.description or ''}".lower()
        name_cat_low = f"{d.name} {d.category}".lower()

        # Check 5.1a: price_min == 0 cho các loại hình thường phải mua vé
        if d.price_min == 0 and any(kw in name_cat_low for kw in PAID_ATTRACTION_KEYWORDS):
            # Loại trừ phố đi bộ / quảng trường miễn phí thực sự
            if not any(free_kw in name_cat_low for free_kw in ["phố đi bộ", "quảng trường", "cầu ", "chợ "]):
                issues.append({
                    "destination_id": d.id,
                    "name": d.name,
                    "province": d.province,
                    "category": d.category,
                    "issue_type": "ZERO_PRICE_PAID_ATTRACTION",
                    "severity": "HIGH",
                    "current_value": f"price_min={d.price_min}, price_max={d.price_max}",
                    "description": (
                        f"Điểm '{d.name}' thuộc nhóm khu vui chơi/cáp treo/công viên có thu vé nhưng đang ghi giá 0đ. "
                        "Cần con người xác minh lại bảng giá thực tế."
                    )
                })

        # Check 5.1b: Khu vui chơi / công viên giải trí lớn nhưng giá thấp bất thường (< 150.000đ, ví dụ VinWonders 40.000đ)
        if 0 < d.price_min < 150000 and any(kw in name_cat_low for kw in MAJOR_THEME_PARK_KEYWORDS):
            issues.append({
                "destination_id": d.id,
                "name": d.name,
                "province": d.province,
                "category": d.category,
                "issue_type": "SUSPICIOUSLY_LOW_THEME_PARK_PRICE",
                "severity": "HIGH",
                "current_value": f"price_min={d.price_min:,}đ",
                "description": (
                    f"Tổ hợp giải trí lớn '{d.name}' có giá vé {d.price_min:,}đ thấp bất thường so với mặt bằng vé cổng/cáp treo (>= 200.000đ)."
                )
            })

        # Check 5.1c: Giá lệch quá xa trung vị cùng category (< 20% hoặc > 5x trung vị)
        if d.price_min > 0 and d.category in cat_medians:
            med = cat_medians[d.category]
            if med > 0 and (d.price_min < 0.2 * med or d.price_min > 5.0 * med):
                issues.append({
                    "destination_id": d.id,
                    "name": d.name,
                    "province": d.province,
                    "category": d.category,
                    "issue_type": "PRICE_OUTLIER_VS_CATEGORY_MEDIAN",
                    "severity": "MEDIUM",
                    "current_value": f"price_min={d.price_min:,}đ (median={int(med):,}đ)",
                    "description": (
                        f"Giá của '{d.name}' ({d.price_min:,}đ) lệch quá xa (<20% hoặc >5x) so với trung vị nhóm '{d.category}' ({int(med):,}đ)."
                    )
                })

        # Check 5.2a: Tọa độ lệch xa tâm trung vị của tỉnh hoặc điểm nội đô bị gán nhầm tọa độ vùng ven
        if d.province in prov_centers:
            c_lat, c_lng = prov_centers[d.province]
            dist_from_center = haversine_km(c_lat, c_lng, d.latitude, d.longitude)
            is_inner_landmark = any(ikw in d.name.lower() for ikw in INNER_CITY_LANDMARK_KEYWORDS)
            if (is_inner_landmark and dist_from_center > 15.0) or dist_from_center > 45.0:
                issues.append({
                    "destination_id": d.id,
                    "name": d.name,
                    "province": d.province,
                    "category": d.category,
                    "issue_type": "COORDINATE_PROVINCE_OUTLIER",
                    "severity": "HIGH" if is_inner_landmark else "MEDIUM",
                    "current_value": f"({d.latitude:.4f}, {d.longitude:.4f}) - cách tâm tỉnh {dist_from_center:.1f}km",
                    "description": (
                        f"Tọa độ của '{d.name}' cách tâm trung vị tỉnh {d.province} tới {dist_from_center:.1f}km "
                        f"{'(nghi sai lệch tọa độ điểm nội đô)' if is_inner_landmark else '(điểm biệt lập/khác cụm địa lý)'}."
                    )
                })

        # Check 5.2b: Điểm danh thắng nổi tiếng bị gán nhầm sang tỉnh lân cận trong CSV
        for kw_land, true_prov in KNOWN_LANDMARK_PROVINCE_RULES:
            if kw_land in d.name.lower() and d.province.lower() != true_prov.lower():
                issues.append({
                    "destination_id": d.id,
                    "name": d.name,
                    "province": d.province,
                    "category": d.category,
                    "issue_type": "PROVINCE_LANDMARK_MISMATCH",
                    "severity": "HIGH",
                    "current_value": f"province='{d.province}' (thực tế thuộc '{true_prov}')",
                    "description": (
                        f"Điểm '{d.name}' đang được gán tỉnh '{d.province}' trong CSV nhưng thực tế địa lý thuộc tỉnh '{true_prov}'."
                    )
                })

        # Check 5.2c: Điểm thuộc cụm thiểu số ngăn cách qua biển (ví dụ Hà Tiên đất liền trong tỉnh Kiên Giang đa số là đảo Phú Quốc, hoặc Cù Lao Chàm tách biệt đất liền)
        clusters_in_prov = prov_clusters.get(d.province, set())
        has_island = any(c.startswith("ISLAND_") for c in clusters_in_prov)
        has_mainland = any(c.startswith("MAINLAND_") for c in clusters_in_prov)
        if has_island and has_mainland:
            d_cid = getattr(d, "cluster_id", "")
            same_cid_count = sum(1 for x in prov_dests.get(d.province, []) if getattr(x, "cluster_id", "") == d_cid)
            total_prov_count = len(prov_dests.get(d.province, []))
            if same_cid_count <= max(2, total_prov_count // 3):
                issues.append({
                    "destination_id": d.id,
                    "name": d.name,
                    "province": d.province,
                    "category": d.category,
                    "issue_type": "CROSS_SEA_CLUSTER_IN_PROVINCE",
                    "severity": "HIGH",
                    "current_value": f"cluster_id={d_cid} ({same_cid_count}/{total_prov_count} điểm trong tỉnh {d.province})",
                    "description": (
                        f"Điểm '{d.name}' ({d_cid}) bị ngăn cách địa lý/biển với đa số điểm còn lại trong tỉnh '{d.province}'; "
                        "tuyệt đối không được xếp chung ngày với cụm bên kia biển."
                    )
                })

        # Check 5.2c: Thiếu verified_at hoặc quá hạn
        if not d.last_verified_at:
            issues.append({
                "destination_id": d.id,
                "name": d.name,
                "province": d.province,
                "category": d.category,
                "issue_type": "MISSING_VERIFIED_AT",
                "severity": "LOW",
                "current_value": "verified_at=None",
                "description": f"Điểm '{d.name}' chưa có dấu thời gian xác minh (verified_at)."
            })
        else:
            try:
                v_str = str(d.last_verified_at).strip()
                if v_str.endswith("Z"):
                    v_str = v_str[:-1] + "+00:00"
                dt = datetime.fromisoformat(v_str)
                if dt.tzinfo is None:
                    dt = dt.replace(tzinfo=timezone.utc)
                days_diff = (now - dt).days
                if days_diff > config.DATA_STALE_THRESHOLD_DAYS:
                    issues.append({
                        "destination_id": d.id,
                        "name": d.name,
                        "province": d.province,
                        "category": d.category,
                        "issue_type": "STALE_VERIFIED_AT",
                        "severity": "LOW",
                        "current_value": f"verified_at={d.last_verified_at} ({days_diff} ngày trước)",
                        "description": f"Dữ liệu '{d.name}' đã quá {config.DATA_STALE_THRESHOLD_DAYS} ngày chưa được xác minh lại."
                    })
            except Exception:
                pass

    by_type: Dict[str, int] = {}
    for item in issues:
        itype = item["issue_type"]
        by_type[itype] = by_type.get(itype, 0) + 1

    report = {
        "generated_at": now.isoformat(),
        "csv_source": loader.csv_path,
        "total_destinations_scanned": len(destinations),
        "total_issues_found": len(issues),
        "summary_by_issue_type": by_type,
        "issues": issues
    }

    default_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "data"))
    os.makedirs(default_dir, exist_ok=True)
    json_target = out_json_path or os.path.join(default_dir, "plausibility_audit_report.json")
    csv_target = out_csv_path or os.path.join(default_dir, "plausibility_audit_report.csv")

    with open(json_target, "w", encoding="utf-8") as jf:
        json.dump(report, jf, ensure_ascii=False, indent=2)

    fieldnames = ["destination_id", "name", "province", "category", "issue_type", "severity", "current_value", "description"]
    with open(csv_target, "w", encoding="utf-8", newline="") as cf:
        writer = csv.DictWriter(cf, fieldnames=fieldnames)
        writer.writeheader()
        for row in issues:
            writer.writerow({k: row.get(k, "") for k in fieldnames})

    return report

if __name__ == "__main__":
    target_csv = sys.argv[1] if len(sys.argv) > 1 else os.getenv("REAL_SEED_PATH") or os.getenv("DESTINATIONS_CSV_PATH")
    rep = run_plausibility_audit(csv_path=target_csv)
    print(f"[PlausibilityAudit] Scanned {rep['total_destinations_scanned']} destinations from {rep['csv_source']}")
    print(f"[PlausibilityAudit] Total issues flagged: {rep['total_issues_found']}")
    print(f"[PlausibilityAudit] Breakdown: {json.dumps(rep['summary_by_issue_type'], ensure_ascii=False)}")
