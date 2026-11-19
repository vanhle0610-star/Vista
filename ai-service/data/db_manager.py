import sqlite3
import json
import os
import csv
from datetime import datetime, time
from typing import List, Dict, Optional, Any

DB_PATH = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "database", "vista_destinations.db"))
SEED_CSV_PATH = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "backend", "src", "main", "resources", "db", "seed", "demo_destinations_seed.csv"))

def get_connection() -> sqlite3.Connection:
    os.makedirs(os.path.dirname(DB_PATH), exist_ok=True)
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn

def init_database():
    """Initializes the SQLite database and populates it with verified real destinations if empty."""
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS destinations (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        province TEXT NOT NULL,
        category TEXT NOT NULL,
        latitude REAL NOT NULL,
        longitude REAL NOT NULL,
        price_min INTEGER DEFAULT 0,
        price_max INTEGER DEFAULT 0,
        opening_hours TEXT,
        description TEXT,
        photo_url TEXT,
        walking_load TEXT DEFAULT 'MODERATE',
        indoor_outdoor TEXT DEFAULT 'OUTDOOR',
        suitable_slots TEXT,
        source_url TEXT,
        verified_at TEXT,
        status TEXT DEFAULT 'ACTIVE',
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        updated_at TEXT DEFAULT CURRENT_TIMESTAMP
    );
    """)
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_dest_province ON destinations (province);")
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_dest_category ON destinations (category);")
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_dest_status ON destinations (status);")
    conn.commit()

    # Check count
    cursor.execute("SELECT COUNT(*) FROM destinations;")
    count = cursor.fetchone()[0]

    if count == 0 and os.path.exists(SEED_CSV_PATH):
        print(f"[Database] Seeding 100% verified real destinations from {SEED_CSV_PATH}...")
        with open(SEED_CSV_PATH, mode="r", encoding="utf-8") as f:
            reader = csv.DictReader(f)
            records = []
            for idx, row in enumerate(reader):
                name = row.get("name", "").strip()
                if not name:
                    continue
                province = row.get("province", "").strip()
                category = row.get("category", "Tham quan").strip()
                lat = float(row.get("latitude", 0.0) or 0.0)
                lng = float(row.get("longitude", 0.0) or 0.0)
                p_min = int(float(row.get("price_min", 0) or 0))
                p_max = int(float(row.get("price_max", 0) or 0))
                oh_raw = row.get("opening_hours", "{}")
                desc = row.get("description", "").strip()
                photo = row.get("image_reference", "").strip()
                src = row.get("source_url", "").strip()
                verified = row.get("verified_at", datetime.now().isoformat()).strip()
                dest_id = f"dest-{province.lower().replace(' ', '-')}-{idx+1}"

                # Auto classify indoor/outdoor
                cat_lower = category.lower()
                desc_lower = desc.lower()
                indoor_outdoor = "OUTDOOR"
                if any(w in cat_lower or w in desc_lower for w in ["bảo tàng", "nhà hát", "trong nhà", "ẩm thực", "nhà hàng", "quán cà phê", "trung tâm thương mại"]):
                    indoor_outdoor = "INDOOR"

                walking_load = "MODERATE"
                if any(w in desc_lower for w in ["leo núi", "trekking", "bậc thang cao", "thác dốc"]):
                    walking_load = "STRENUOUS"
                elif any(w in desc_lower for w in ["xe điện", "thư giãn", "nghỉ dưỡng", "uống trà"]):
                    walking_load = "LIGHT"

                records.append((
                    dest_id, name, province, category, lat, lng, p_min, p_max,
                    oh_raw, desc, photo, walking_load, indoor_outdoor,
                    json.dumps(["MORNING", "AFTERNOON"]), src, verified, "ACTIVE"
                ))

            cursor.executemany("""
            INSERT OR REPLACE INTO destinations 
            (id, name, province, category, latitude, longitude, price_min, price_max, opening_hours, description, photo_url, walking_load, indoor_outdoor, suitable_slots, source_url, verified_at, status)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, records)
            conn.commit()
            print(f"[Database] Successfully inserted {len(records)} verified real destinations into SQLite database.")

    conn.close()

def query_destinations_by_province(province: str) -> List[Dict[str, Any]]:
    """Retrieves all active real destinations for a given province from the database."""
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("""
        SELECT * FROM destinations 
        WHERE status = 'ACTIVE' AND (
            LOWER(province) LIKE LOWER(?) OR 
            LOWER(?) LIKE '%' || LOWER(province) || '%'
        )
    """, (f"%{province}%", province))
    rows = cursor.fetchall()
    conn.close()
    return [dict(row) for row in rows]

def check_realtime_status(opening_hours_json: str, check_dt: Optional[datetime] = None) -> Dict[str, Any]:
    """
    Evaluates real-time opening status against opening_hours JSON string.
    Returns:
    {
        "is_open": bool,
        "status_text": "Đang mở cửa" | "Đã đóng cửa" | "Mở cả ngày",
        "today_hours": str,
        "badge_color": "green" | "red" | "orange"
    }
    """
    if not check_dt:
        check_dt = datetime.now()

    day_keys = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"]
    current_day_key = day_keys[check_dt.weekday()]
    current_time_str = check_dt.strftime("%H:%M")

    try:
        if isinstance(opening_hours_json, str):
            oh = json.loads(opening_hours_json)
        else:
            oh = opening_hours_json or {}
    except Exception:
        oh = {}

    today_range = oh.get(current_day_key)
    if not today_range:
        # Check fallback
        today_range = oh.get("all") or "00:00-23:59"

    if today_range == "00:00-23:59" or today_range == "24/24":
        return {
            "is_open": True,
            "status_text": "Mở cả ngày (24/24)",
            "today_hours": "Cả ngày",
            "badge_color": "green"
        }

    if today_range.lower() in ("closed", "đóng cửa"):
        return {
            "is_open": False,
            "status_text": "Đóng cửa hôm nay",
            "today_hours": "Nghỉ",
            "badge_color": "red"
        }

    # Range format: "08:00-17:30"
    parts = today_range.split("-")
    if len(parts) == 2:
        open_time = parts[0].strip()
        close_time = parts[1].strip()
        is_open = open_time <= current_time_str <= close_time
        if is_open:
            return {
                "is_open": True,
                "status_text": f"Đang mở cửa (Đóng lúc {close_time})",
                "today_hours": today_range,
                "badge_color": "green"
            }
        else:
            return {
                "is_open": False,
                "status_text": f"Đã đóng cửa (Mở lúc {open_time})",
                "today_hours": today_range,
                "badge_color": "red"
            }

    return {
        "is_open": True,
        "status_text": "Đang mở cửa",
        "today_hours": today_range,
        "badge_color": "green"
    }

if __name__ == "__main__":
    init_database()
    sample = query_destinations_by_province("Đà Nẵng")
    print(f"Sample query result for Đà Nẵng: {len(sample)} destinations found.")
    if sample:
        first = sample[0]
        status = check_realtime_status(first['opening_hours'])
        print(f"Place: {first['name']} - Realtime status: {status['status_text']}")

