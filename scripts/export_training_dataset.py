"""
VISTA Dataset Export Engine
Generates standard OpenAI / HuggingFace format JSONL dataset for AI training / fine-tuning
based on the 10,500+ real destinations in vista_destinations.db.
"""

import sqlite3
import json
import os
import random

DB_PATH = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "database", "vista_destinations.db"))
OUTPUT_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "database", "training"))
OUTPUT_FILE = os.path.join(OUTPUT_DIR, "vista_travel_training_1000.jsonl")

SYSTEM_PROMPT = """Bạn là VISTA AI Planner - Chuyên gia hoạch định lịch trình du lịch thông minh Việt Nam. Nhiệm vụ của bạn là tư vấn và thiết kế lịch trình chi tiết theo từng ngày, sử dụng 100% địa điểm có thật, có tọa độ GPS, giá vé chính xác, giờ mở cửa thực tế và tối ưu cung đường di chuyển."""

def export_training_data(sample_count: int = 1000):
    os.makedirs(OUTPUT_DIR, exist_ok=True)
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()

    cursor.execute("SELECT DISTINCT province FROM destinations;")
    provinces = [r[0] for r in cursor.fetchall()]

    durations = [
        (1, "1 ngày"),
        (2, "2 ngày 1 đêm"),
        (3, "3 ngày 2 đêm"),
        (4, "4 ngày 3 đêm"),
    ]

    personas = [
        ("Cặp đôi", "cặp đôi thích chụp ảnh sống ảo và ngắm hoàng hôn"),
        ("Gia đình có người cao tuổi", "gia đình có bố mẹ 68 tuổi, nhịp độ thong thả nhẹ nhàng, tránh leo trèo"),
        ("Gia đình có trẻ nhỏ", "gia đình có con nhỏ 5 tuổi, ưu tiên an toàn, có không gian vui chơi"),
        ("Nhóm bạn trẻ", "nhóm bạn trẻ thích khám phá ẩm thực đường phố và quán cà phê view đẹp"),
        ("Solo Traveler", "đi du lịch một mình, thích tìm hiểu văn hóa lịch sử bản địa và cà phê yên tĩnh"),
    ]

    budget_tiers = [
        ("economy", "tiết kiệm", "Ưu tiên các điểm miễn phí vé và quán ăn bình dân chuẩn vị"),
        ("standard", "tiêu chuẩn", "Cân đối hợp lý giữa tham quan di sản và thưởng thức ẩm thực đặc sản"),
        ("luxury", "cao cấp / nghỉ dưỡng", "Trải nghiệm dịch vụ cao cấp, nhà hàng sang trọng và homestay/resort view đẹp"),
    ]

    records = []

    print(f"[Dataset Export] Generating {sample_count} training samples from database...")

    for i in range(sample_count):
        prov = random.choice(provinces)
        days_num, days_label = random.choice(durations)
        persona_label, persona_desc = random.choice(personas)
        b_code, b_label, b_desc = random.choice(budget_tiers)

        # Query real destinations for this province
        cursor.execute("SELECT * FROM destinations WHERE province = ? ORDER BY is_curated DESC, RANDOM() LIMIT 15;", (prov,))
        places = [dict(r) for r in cursor.fetchall()]
        if len(places) < days_num * 2:
            continue

        user_query = f"Tôi muốn lên lịch trình {days_label} tại {prov} cho {persona_desc}, mức ngân sách {b_label}."

        # Build assistant response
        days_output = []
        p_idx = 0
        for d in range(1, days_num + 1):
            day_acts = []
            # 3 activities per day: morning, noon/afternoon, evening
            slots = ["MORNING", "AFTERNOON", "EVENING"]
            for slot in slots:
                if p_idx < len(places):
                    p = places[p_idx]
                    p_idx += 1
                else:
                    p = places[random.randint(0, len(places) - 1)]

                cost_str = "Miễn phí vé" if p["price_min"] == 0 else f"{p['price_min']:,}đ / người"
                day_acts.append({
                    "time_slot": slot,
                    "place_name": p["name"],
                    "category": p["category"],
                    "cost": cost_str,
                    "description": p["description"][:120] + "..." if len(p["description"]) > 120 else p["description"],
                    "realtime_hours": p["opening_hours"]
                })

            days_output.append({
                "day": d,
                "title": f"Ngày {d}: Trải nghiệm {prov}",
                "activities": day_acts
            })

        assistant_content = json.dumps({
            "destination": prov,
            "duration": days_label,
            "persona": persona_label,
            "budget": b_label,
            "strategy": b_desc,
            "itinerary": days_output
        }, ensure_ascii=False, indent=2)

        sample = {
            "messages": [
                {"role": "system", "content": SYSTEM_PROMPT},
                {"role": "user", "content": user_query},
                {"role": "assistant", "content": assistant_content}
            ]
        }
        records.append(sample)

    with open(OUTPUT_FILE, "w", encoding="utf-8") as f:
        for r in records:
            f.write(json.dumps(r, ensure_ascii=False) + "\n")

    conn.close()
    print(f"[Dataset Export] Successfully wrote {len(records)} high-quality training pairs to {OUTPUT_FILE}")
    return len(records)

if __name__ == "__main__":
    export_training_data(1000)

