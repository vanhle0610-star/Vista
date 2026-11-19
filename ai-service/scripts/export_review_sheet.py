import os
import sys
import csv
from datetime import datetime
from typing import List, Dict, Any, Optional

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from data.loader import DestinationDataLoader, data_loader
from models.constraints import UserConstraints
from engine.planner import VistaMasterPlanner

REVIEW_SCENARIOS: List[Dict[str, Any]] = [
    {"id": "R01", "province": "Phú Quốc", "sub_destination": "Phú Quốc", "days": 4, "people": 2, "tier": "luxury", "elderly": False, "children": False, "interests": ["biển & nghỉ dưỡng", "ẩm thực bản địa"], "avoid": [], "date": "2026-01-15", "desc": "Phú Quốc 4N3Đ cặp đôi cao cấp"},
    {"id": "R02", "province": "Thừa Thiên Huế", "sub_destination": None, "days": 3, "people": 4, "tier": "economy", "elderly": True, "children": False, "interests": ["văn hóa & di sản", "ẩm thực bản địa"], "avoid": ["leo núi"], "date": "2026-03-10", "desc": "Huế 3N2Đ gia đình có ông bà tiết kiệm"},
    {"id": "R03", "province": "Hà Nam", "sub_destination": None, "days": 3, "people": 2, "tier": "standard", "elderly": False, "children": False, "interests": ["văn hóa & di sản"], "avoid": [], "date": "2026-02-20", "desc": "Hà Nam 3N2Đ (kiểm tra rút gọn tỉnh ít điểm)"},
    {"id": "R04", "province": "Đà Nẵng", "sub_destination": None, "days": 3, "people": 4, "tier": "standard", "elderly": False, "children": True, "interests": ["biển & nghỉ dưỡng", "ẩm thực bản địa"], "avoid": [], "date": "2026-06-15", "desc": "Đà Nẵng 3N2Đ gia đình có trẻ nhỏ (biển + ẩm thực)"},
    {"id": "R05", "province": "TP. Hồ Chí Minh", "sub_destination": None, "days": 2, "people": 2, "tier": "luxury", "elderly": False, "children": False, "interests": ["ẩm thực bản địa", "check-in sống ảo"], "avoid": [], "date": "2026-02-10", "desc": "TP.HCM 2N1Đ ẩm thực cao cấp"},
    {"id": "R06", "province": "Ninh Bình", "sub_destination": None, "days": 2, "people": 3, "tier": "standard", "elderly": True, "children": False, "interests": ["văn hóa & di sản"], "avoid": ["biển", "leo núi"], "date": "2026-03-05", "desc": "Ninh Bình 2N1Đ đi chùa, tránh biển & leo núi"},
    {"id": "R07", "province": "Hội An", "sub_destination": "Hội An", "days": 2, "people": 2, "tier": "standard", "elderly": False, "children": False, "interests": ["văn hóa & di sản", "ẩm thực bản địa"], "avoid": [], "date": "2026-04-12", "desc": "Hội An 2N1Đ cặp đôi dạo phố cổ"},
    {"id": "R08", "province": "Đà Lạt", "sub_destination": "Đà Lạt", "days": 3, "people": 2, "tier": "standard", "elderly": False, "children": False, "interests": ["check-in sống ảo", "ẩm thực bản địa"], "avoid": [], "date": "2026-12-10", "desc": "Đà Lạt 3N2Đ săn mây & cà phê"},
    {"id": "R09", "province": "Sa Pa", "sub_destination": "Sa Pa", "days": 3, "people": 2, "tier": "standard", "elderly": False, "children": False, "interests": ["thiên nhiên sinh thái", "văn hóa & di sản"], "avoid": [], "date": "2026-10-15", "desc": "Sa Pa 3N2Đ khám phá bản làng"},
    {"id": "R10", "province": "Hà Nội", "sub_destination": None, "days": 2, "people": 2, "tier": "standard", "elderly": False, "children": False, "interests": ["văn hóa & di sản", "ẩm thực bản địa"], "avoid": [], "date": "2026-11-05", "desc": "Hà Nội 2N1Đ mùa thu di sản & phố cổ"},
    {"id": "R11", "province": "Khánh Hòa", "sub_destination": "Nha Trang", "days": 3, "people": 4, "tier": "luxury", "elderly": False, "children": True, "interests": ["biển & nghỉ dưỡng", "vui chơi giải trí"], "avoid": [], "date": "2026-05-20", "desc": "Nha Trang 3N2Đ gia đình nghỉ dưỡng biển"},
    {"id": "R12", "province": "Quảng Ninh", "sub_destination": "Hạ Long", "days": 3, "people": 4, "tier": "standard", "elderly": True, "children": True, "interests": ["biển & nghỉ dưỡng", "ẩm thực bản địa"], "avoid": ["leo núi"], "date": "2026-04-25", "desc": "Hạ Long 3N2Đ đại gia đình 3 thế hệ"},
    {"id": "R13", "province": "Bà Rịa - Vũng Tàu", "sub_destination": "Vũng Tàu", "days": 2, "people": 4, "tier": "economy", "elderly": False, "children": False, "interests": ["biển & nghỉ dưỡng", "ẩm thực bản địa"], "avoid": [], "date": "2026-03-22", "desc": "Vũng Tàu 2N1Đ nhóm bạn cuối tuần"},
    {"id": "R14", "province": "Cần Thơ", "sub_destination": None, "days": 2, "people": 3, "tier": "standard", "elderly": True, "children": False, "interests": ["ẩm thực bản địa", "thiên nhiên sinh thái"], "avoid": [], "date": "2026-01-25", "desc": "Cần Thơ 2N1Đ miệt vườn sông nước"},
    {"id": "R15", "province": "Bình Định", "sub_destination": "Quy Nhơn", "days": 3, "people": 2, "tier": "standard", "elderly": False, "children": False, "interests": ["biển & nghỉ dưỡng", "ẩm thực bản địa"], "avoid": [], "date": "2026-06-05", "desc": "Quy Nhơn 3N2Đ biển đảo & hải sản"},
    {"id": "R16", "province": "Phú Yên", "sub_destination": None, "days": 2, "people": 2, "tier": "economy", "elderly": False, "children": False, "interests": ["check-in sống ảo", "biển & nghỉ dưỡng"], "avoid": [], "date": "2026-05-10", "desc": "Phú Yên 2N1Đ xứ hoa vàng cỏ xanh"},
    {"id": "R17", "province": "Quảng Bình", "sub_destination": "Phong Nha", "days": 3, "people": 2, "tier": "standard", "elderly": False, "children": False, "interests": ["thiên nhiên sinh thái"], "avoid": [], "date": "2026-04-18", "desc": "Quảng Bình 3N2Đ khám phá hang động"},
    {"id": "R18", "province": "Hà Giang", "sub_destination": None, "days": 3, "people": 2, "tier": "economy", "elderly": False, "children": False, "interests": ["thiên nhiên sinh thái", "check-in sống ảo"], "avoid": [], "date": "2026-10-25", "desc": "Hà Giang 3N2Đ mùa hoa tam giác mạch"},
    {"id": "R19", "province": "Bình Thuận", "sub_destination": "Mũi Né", "days": 2, "people": 2, "tier": "luxury", "elderly": False, "children": False, "interests": ["biển & nghỉ dưỡng", "ẩm thực bản địa"], "avoid": [], "date": "2026-03-14", "desc": "Mũi Né 2N1Đ resort biển cao cấp"},
    {"id": "R20", "province": "An Giang", "sub_destination": None, "days": 2, "people": 4, "tier": "standard", "elderly": True, "children": False, "interests": ["văn hóa & di sản", "thiên nhiên sinh thái"], "avoid": ["leo núi"], "date": "2026-02-18", "desc": "An Giang 2N1Đ hành hương & rừng tràm"},
    {"id": "R21", "province": "Hải Phòng", "sub_destination": None, "days": 2, "people": 2, "tier": "standard", "elderly": False, "children": False, "interests": ["ẩm thực bản địa"], "avoid": [], "date": "2026-04-04", "desc": "Hải Phòng 2N1Đ foodtour đất Cảng"},
    {"id": "R22", "province": "Tây Ninh", "sub_destination": None, "days": 1, "people": 4, "tier": "standard", "elderly": True, "children": True, "interests": ["văn hóa & di sản"], "avoid": [], "date": "2026-02-08", "desc": "Tây Ninh đi trong ngày gia đình"},
    {"id": "R23", "province": "Sơn La", "sub_destination": "Mộc Châu", "days": 2, "people": 2, "tier": "economy", "elderly": False, "children": False, "interests": ["thiên nhiên sinh thái", "check-in sống ảo"], "avoid": [], "date": "2026-01-30", "desc": "Mộc Châu 2N1Đ mùa hoa mận"},
    {"id": "R24", "province": "Cao Bằng", "sub_destination": None, "days": 2, "people": 2, "tier": "standard", "elderly": False, "children": False, "interests": ["thiên nhiên sinh thái", "văn hóa & di sản"], "avoid": [], "date": "2026-09-20", "desc": "Cao Bằng 2N1Đ thác Bản Giốc"},
    {"id": "R25", "province": "Đà Nẵng", "sub_destination": None, "days": 3, "people": 2, "tier": "standard", "elderly": True, "children": False, "interests": ["văn hóa & di sản", "ẩm thực bản địa"], "avoid": ["biển"], "date": "2026-11-15", "desc": "Đà Nẵng 3N2Đ mùa mưa có người già (tránh biển)"},
]

def export_review_sheet(
    csv_seed_path: Optional[str] = None,
    out_csv_path: Optional[str] = None,
    out_md_path: Optional[str] = None
) -> Dict[str, Any]:
    """
    Xuất 25 kịch bản lịch trình mẫu ra CSV và Markdown để chuyên gia địa phương chấm điểm tay (thang 1–5).
    """
    orig_dests = data_loader.destinations
    orig_by_id = data_loader._by_id
    if csv_seed_path and os.path.exists(csv_seed_path):
        custom_loader = DestinationDataLoader(csv_seed_path)
        data_loader.destinations = custom_loader.destinations
        data_loader._by_id = custom_loader._by_id

    try:
        default_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "data"))
        os.makedirs(default_dir, exist_ok=True)
        csv_target = out_csv_path or os.path.join(default_dir, "human_review_sheet.csv")
        md_target = out_md_path or os.path.join(default_dir, "human_review_sheet.md")

        csv_rows: List[Dict[str, Any]] = []
        md_lines: List[str] = [
            "# BẢNG CHẤM ĐIỂM CHẤT LƯỢNG LỊCH TRÌNH THỰC TẾ (HUMAN EXPERT REVIEW SHEET)",
            "",
            f"- **Thời gian xuất:** `{datetime.now().strftime('%Y-%m-%d %H:%M:%S')}`",
            f"- **Nguồn dữ liệu:** `{csv_seed_path or data_loader.csv_path}` (`{len(data_loader.destinations)}` địa điểm)",
            "- **Thang điểm đánh giá (1 – 5):**",
            "  - `1`: Vô lý nặng (vượt biển trong ngày, chặng > 90p, khung trưa đi chùa/phố đêm, ngày rỗng tính tiền).",
            "  - `2`: Hợp lệ kỹ thuật nhưng bất tiện (quay đầu xe xa, lặp loại điểm, lệch sở thích).",
            "  - `3`: Chấp nhận được, đi được thực tế nhưng chưa tối ưu trải nghiệm.",
            "  - `4`: Hợp lý, đúng cụm địa lý, đúng khung giờ ăn/chơi, thể hiện rõ sở thích & hồ sơ đoàn.",
            "  - `5`: Xuất sắc như thổ địa thiết kế riêng.",
            "",
            "---",
            ""
        ]

        for sc in REVIEW_SCENARIOS:
            c = UserConstraints(
                destination_province=sc["province"],
                sub_destination=sc["sub_destination"],
                total_days=sc["days"],
                people_count=sc["people"],
                budget_tier=sc["tier"],
                has_elderly=sc["elderly"],
                has_children=sc["children"],
                interests=sc["interests"],
                must_avoid=sc["avoid"],
                start_date=sc["date"]
            )
            plan = VistaMasterPlanner.generate_plan(c)
            max_leg = max([a.travel_time_from_prev_min for d in plan.days for a in d.activities] or [0])

            md_lines.append(f"## [{sc['id']}] {sc['desc']}")
            md_lines.append(
                f"- **Đầu vào:** Tỉnh `{plan.destination_province}` (Vùng con: `{sc['sub_destination'] or 'Toàn tỉnh'}`) | "
                f"Yêu cầu `{sc['days']} ngày` -> Thực xếp `{plan.total_days} ngày` | `{sc['people']} người` | "
                f"Hạng `{plan.budget_tier}` | Người già: `{sc['elderly']}` | Trẻ nhỏ: `{sc['children']}`"
            )
            md_lines.append(f"- **Sở thích:** `{', '.join(sc['interests']) or 'Mặc định'}` | **Tránh:** `{', '.join(sc['avoid']) or 'Không'}`")
            md_lines.append(
                f"- **Tổng chi phí dự kiến:** `{plan.estimated_total_cost_vnd:,}đ` "
                f"(Vé: `{plan.breakdown['activities_cost']:,}đ`, KS: `{plan.breakdown['hotel_cost']:,}đ`, "
                f"Đi lại: `{plan.breakdown['transport_cost']:,}đ`, Ăn uống: `{plan.breakdown['meal_cost']:,}đ`)"
            )
            md_lines.append(f"- **Chặng dài nhất:** `{max_leg} phút`")

            for d in plan.days:
                day_transit = sum(a.travel_time_from_prev_min for a in d.activities)
                stops_summary = " -> ".join(
                    f"[{a.time_slot} {a.start_time}-{a.end_time}] {a.destination_name} ({a.category}, +{a.travel_time_from_prev_min}p, {a.cost_vnd:,}đ)"
                    for a in d.activities
                )
                md_lines.append(f"  - **{d.title}** (Tổng di chuyển: `{day_transit}p`): {stops_summary}")

                csv_rows.append({
                    "scenario_id": sc["id"],
                    "scenario_desc": sc["desc"],
                    "province": plan.destination_province,
                    "sub_destination": sc["sub_destination"] or "",
                    "requested_days": sc["days"],
                    "actual_days": plan.total_days,
                    "day_number": d.day_number,
                    "day_title": d.title,
                    "stops_count": len(d.activities),
                    "day_transit_min": day_transit,
                    "max_leg_min": max([a.travel_time_from_prev_min for a in d.activities] or [0]),
                    "schedule_detail": stops_summary,
                    "total_trip_cost_vnd": plan.estimated_total_cost_vnd,
                    "warnings": " | ".join(plan.warnings),
                    "expert_score_route_1_5": "",
                    "expert_score_timing_1_5": "",
                    "expert_score_interest_1_5": "",
                    "expert_score_overall_1_5": "",
                    "reviewer_notes": ""
                })

            if plan.warnings:
                md_lines.append(f"- **Cảnh báo ({len(plan.warnings)}):** " + " ; ".join(plan.warnings))
            md_lines.append("- **Chấm điểm chuyên gia (1-5):** Tuyến đường: `[   /5]` | Khung giờ: `[   /5]` | Sở thích: `[   /5]` | Tổng thể: `[   /5]`")
            md_lines.append("")

        fieldnames = [
            "scenario_id", "scenario_desc", "province", "sub_destination",
            "requested_days", "actual_days", "day_number", "day_title",
            "stops_count", "day_transit_min", "max_leg_min", "schedule_detail",
            "total_trip_cost_vnd", "warnings",
            "expert_score_route_1_5", "expert_score_timing_1_5",
            "expert_score_interest_1_5", "expert_score_overall_1_5", "reviewer_notes"
        ]
        with open(csv_target, "w", encoding="utf-8", newline="") as cf:
            writer = csv.DictWriter(cf, fieldnames=fieldnames)
            writer.writeheader()
            writer.writerows(csv_rows)

        with open(md_target, "w", encoding="utf-8") as mf:
            mf.write("\n".join(md_lines))

        return {
            "scenarios_count": len(REVIEW_SCENARIOS),
            "rows_exported": len(csv_rows),
            "csv_path": csv_target,
            "md_path": md_target
        }
    finally:
        data_loader.destinations = orig_dests
        data_loader._by_id = orig_by_id

if __name__ == "__main__":
    seed_arg = sys.argv[1] if len(sys.argv) > 1 else os.getenv("REAL_SEED_PATH")
    if not seed_arg:
        candidate_real = os.path.abspath(
            os.path.join(os.path.dirname(__file__), "..", "..", "backend", "src", "main", "resources", "db", "seed", "demo_destinations_seed.csv")
        )
        if os.path.exists(candidate_real):
            seed_arg = candidate_real
    res = export_review_sheet(csv_seed_path=seed_arg)
    print(f"[ExportReviewSheet] Exported {res['scenarios_count']} scenarios ({res['rows_exported']} day rows)")
    print(f"  - CSV: {res['csv_path']}")
    print(f"  - MD:  {res['md_path']}")

