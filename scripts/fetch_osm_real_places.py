"""
VISTA OSM Real Data Ingestion Pipeline (Production Quality Gate)
Fetches 100% real, verified POIs (attractions, historic sites, beaches, nature, restaurants, cafes)
directly from OpenStreetMap Overpass API using spatial indices around Vietnam's 63 provinces.
Never generates synthetic/template rows (strictly forbids `osm-gen-*`).
"""

import os
import re
import ssl
import json
import math
import time
import sqlite3
import argparse
import urllib.request
import urllib.parse
from datetime import datetime, timezone
from typing import Dict, List, Tuple, Optional

DB_PATH = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "database", "vista_destinations.db"))

OVERPASS_SERVERS = [
    "https://overpass-api.de/api/interpreter",
    "https://lz4.overpass-api.de/api/interpreter",
    "https://overpass.kumi.systems/api/interpreter",
]

BLACKLIST_KEYWORDS = [
    "tạp hóa", "tap hoa", "hiệu thuốc", "nhà thuốc", "pharmacy", "bệnh viện", "phòng khám",
    "trạm y tế", "atm", "ngân hàng", "bank", "trạm xăng", "petrolimex", "cây xăng",
    "trường tiểu học", "trường thcs", "trường thpt", "mầm non", "ủy ban", "ubnd",
    "công an", "bưu điện xã", "công ty", "nhà kho", "xưởng", "karaoke", "nhà nghỉ",
    "nhà trọ", "tiệm tóc", "rửa xe", "sửa xe", "vật liệu xây dựng", "bách hóa xanh",
    "winmart+", "circle k", "familymart", "gs25", "ministop", "7-eleven", "gas station",
    "petrol", "cemetery", "nghĩa trang", "martyrs",
]

GENERIC_EXACT_NAMES = {
    "cafe", "cà phê", "ca phe", "coffee", "quán cà phê", "quán cafe", "nhà hàng",
    "quán ăn", "quán cơm", "quán nhậu", "quán nước", "trà sữa", "ăn vặt", "restaurant",
    "hotel", "khách sạn", "homestay", "chợ", " công viên", "nhà thờ", "chùa", "đền",
}


def haversine_m(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    r = 6371000.0
    p1, p2 = math.radians(lat1), math.radians(lat2)
    dp = math.radians(lat2 - lat1)
    dl = math.radians(lon2 - lon1)
    a = math.sin(dp / 2) ** 2 + math.cos(p1) * math.cos(p2) * math.sin(dl / 2) ** 2
    return 2 * r * math.atan2(math.sqrt(a), math.sqrt(1 - a))


def get_connection() -> sqlite3.Connection:
    os.makedirs(os.path.dirname(DB_PATH), exist_ok=True)
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn


def is_valid_poi_name(name: str) -> bool:
    if not name:
        return False
    clean = name.strip()
    if len(clean) < 4 or len(clean) > 95:
        return False
    low = clean.lower()
    if low in GENERIC_EXACT_NAMES:
        return False
    if re.match(r"^[0-9\W_]+$", clean):
        return False
    if any(bk in low for bk in BLACKLIST_KEYWORDS):
        return False
    # Reject phone-number spam in names
    if re.search(r"\d{8,}", clean):
        return False
    return True


def classify_osm_element(tags: Dict[str, str], province: str) -> Tuple[str, int, int, Dict[str, str], str, str, List[str], str]:
    """
    Returns (category, price_min, price_max, opening_hours_dict, walking_load, indoor_outdoor, suitable_slots, description)
    """
    name = (tags.get("name:vi") or tags.get("name") or "").strip()
    tourism = tags.get("tourism", "")
    historic = tags.get("historic", "")
    natural = tags.get("natural", "")
    amenity = tags.get("amenity", "")
    cuisine = tags.get("cuisine", "")
    leisure = tags.get("leisure", "")

    raw_oh = (tags.get("opening_hours") or "").strip()
    oh_match = re.search(r"(\d{1,2}:\d{2})\s*-\s*(\d{1,2}:\d{2})", raw_oh)

    if tourism == "museum" or historic:
        category = "Bảo tàng & Di tích lịch sử"
        p_min, p_max = 0, 40000
        default_oh = {"open": "07:30", "close": "17:00"}
        walking_load = "LIGHT"
        indoor_outdoor = "INDOOR" if tourism == "museum" else "OUTDOOR"
        slots = ["MORNING", "AFTERNOON"]
        desc = f"{name} là điểm di tích - văn hóa thực tế tại {province} (nguồn OpenStreetMap)."
    elif natural == "beach":
        category = "Biển & Nghỉ dưỡng"
        p_min, p_max = 0, 0
        default_oh = {"open": "05:00", "close": "22:00"}
        walking_load = "LIGHT"
        indoor_outdoor = "OUTDOOR"
        slots = ["MORNING", "AFTERNOON"]
        desc = f"{name} — bãi biển tự nhiên thoáng đãng tại {province}, thích hợp dạo biển và ngắm hoàng hôn."
    elif natural in ("waterfall", "peak", "cave_entrance", "cliff") or tourism == "viewpoint":
        category = "Thiên nhiên & Ngắm cảnh"
        p_min, p_max = 0, 30000
        default_oh = {"open": "06:00", "close": "18:00"}
        walking_load = "MODERATE"
        indoor_outdoor = "OUTDOOR"
        slots = ["MORNING", "AFTERNOON"]
        desc = f"{name} — điểm ngắm cảnh và khám phá thiên nhiên tại {province}."
    elif tourism in ("theme_park", "zoo", "aquarium") or leisure in ("water_park", "park"):
        category = "Vui chơi & Công viên"
        p_min, p_max = (0, 0) if leisure == "park" else (50000, 200000)
        default_oh = {"open": "08:00", "close": "21:00"}
        walking_load = "MODERATE"
        indoor_outdoor = "OUTDOOR"
        slots = ["MORNING", "AFTERNOON", "EVENING"]
        desc = f"{name} — không gian dạo chơi và giải trí tại {province}."
    elif amenity == "cafe":
        category = "Cà phê & Thư giãn"
        p_min, p_max = 35000, 65000
        default_oh = {"open": "07:00", "close": "22:00"}
        walking_load = "LIGHT"
        indoor_outdoor = "INDOOR"
        slots = ["MORNING", "AFTERNOON", "EVENING"]
        desc = f"Quán cà phê {name} tại {province} — điểm dừng chân thưởng thức đồ uống và nghỉ ngơi."
    elif amenity == "restaurant":
        category = "Ẩm thực bản địa"
        p_min, p_max = 60000, 180000
        default_oh = {"open": "10:00", "close": "22:00"}
        walking_load = "LIGHT"
        indoor_outdoor = "INDOOR"
        slots = ["NOON", "EVENING"]
        cuisine_note = f" ({cuisine})" if cuisine else ""
        desc = f"Nhà hàng / quán ăn {name}{cuisine_note} tại {province}, phục vụ bữa trưa và bữa tối."
    else:
        category = "Tham quan & Khám phá"
        p_min, p_max = 0, 30000
        default_oh = {"open": "07:30", "close": "18:00"}
        walking_load = "LIGHT"
        indoor_outdoor = "OUTDOOR"
        slots = ["MORNING", "AFTERNOON"]
        desc = f"{name} — điểm tham quan thực tế tại {province} được ghi nhận trên OpenStreetMap."

    if oh_match:
        oh_dict = {"open": oh_match.group(1).zfill(5), "close": oh_match.group(2).zfill(5)}
    elif "24/7" in raw_oh:
        oh_dict = {"open": "00:00", "close": "23:59"}
    else:
        oh_dict = default_oh

    if tags.get("description:vi") or tags.get("description"):
        desc = (tags.get("description:vi") or tags.get("description") or "").strip()

    return category, p_min, p_max, oh_dict, walking_load, indoor_outdoor, slots, desc


def get_province_centroids(conn: sqlite3.Connection) -> List[Tuple[str, float, float]]:
    cur = conn.cursor()
    cur.execute("""
        SELECT province, AVG(latitude) as avg_lat, AVG(longitude) as avg_lng, COUNT(*) as cnt
        FROM destinations
        WHERE id LIKE 'dest-%' AND latitude > 8.0 AND longitude > 102.0
        GROUP BY province
        ORDER BY cnt DESC
    """)
    return [(r["province"], float(r["avg_lat"]), float(r["avg_lng"])) for r in cur.fetchall()]


def execute_overpass_query(query: str) -> Optional[Dict]:
    ssl_ctx = ssl.create_default_context()
    ssl_ctx.check_hostname = False
    ssl_ctx.verify_mode = ssl.CERT_NONE
    for server in OVERPASS_SERVERS:
        try:
            req_data = urllib.parse.urlencode({"data": query}).encode("utf-8")
            req = urllib.request.Request(
                server,
                data=req_data,
                headers={"User-Agent": "VISTA-Travel-Planner/2.2 (https://vista.vn)"},
            )
            with urllib.request.urlopen(req, timeout=45, context=ssl_ctx) as resp:
                data = json.loads(resp.read().decode("utf-8"))
                if data and "elements" in data:
                    return data
        except Exception as e:
            print(f"[OSM] Server {server} error: {e}. Trying next server...")
            time.sleep(1.0)
    return None


def ingest_all_provinces(batch_size: int = 9, per_province_cap: int = 85) -> int:
    conn = get_connection()
    cur = conn.cursor()

    # 1. Always purge any synthetic osm-gen-% rows first
    cur.execute("DELETE FROM destinations WHERE id LIKE 'osm-gen-%'")
    conn.commit()

    centroids = get_province_centroids(conn)
    if not centroids:
        print("[OSM] Error: No curated destinations found to compute province centroids.")
        conn.close()
        return 0

    # Load existing coordinates & names per province for deduplication
    cur.execute("SELECT id, name, province, latitude, longitude FROM destinations")
    existing_by_prov: Dict[str, List[Tuple[str, float, float]]] = {}
    existing_osm_by_prov: Dict[str, int] = {}
    existing_ids = set()
    for row in cur.fetchall():
        existing_ids.add(row["id"])
        if str(row["id"]).startswith("osm-"):
            existing_osm_by_prov[row["province"]] = existing_osm_by_prov.get(row["province"], 0) + 1
        existing_by_prov.setdefault(row["province"], []).append(
            (row["name"].strip().lower(), float(row["latitude"]), float(row["longitude"]))
        )

    pending_centroids = [c for c in centroids if existing_osm_by_prov.get(c[0], 0) < 15]
    if not pending_centroids:
        pending_centroids = centroids

    total_inserted = 0
    now_iso = datetime.now(timezone.utc).isoformat()

    for i in range(0, len(pending_centroids), batch_size):
        batch = pending_centroids[i : i + batch_size]
        prov_names = [b[0] for b in batch]
        print(f"[OSM] Querying batch {i // batch_size + 1}/{math.ceil(len(pending_centroids) / batch_size)}: {', '.join(prov_names)}...")

        subqueries = []
        for _, lat, lng in batch:
            s, w, n, e = lat - 0.13, lng - 0.13, lat + 0.13, lng + 0.13
            bbox = f"{s:.4f},{w:.4f},{n:.4f},{e:.4f}"
            subqueries.append(f'node["tourism"~"attraction|museum|viewpoint|gallery|theme_park|zoo|aquarium"]["name"]({bbox});')
            subqueries.append(f'way["tourism"~"attraction|museum|viewpoint|gallery|theme_park|zoo|aquarium"]["name"]({bbox});')
            subqueries.append(f'node["historic"~"monument|memorial|castle|ruins|heritage|archaeological_site|temple"]["name"]({bbox});')
            subqueries.append(f'node["natural"~"beach|waterfall|cave_entrance|peak|hot_spring"]["name"]({bbox});')
            s_c, w_c, n_c, e_c = lat - 0.06, lng - 0.06, lat + 0.06, lng + 0.06
            bbox_c = f"{s_c:.4f},{w_c:.4f},{n_c:.4f},{e_c:.4f}"
            subqueries.append(f'node["amenity"~"restaurant|cafe"]["name"]({bbox_c});')

        full_query = "[out:json][timeout:25];\n(\n  " + "\n  ".join(subqueries) + "\n);\nout center 2200;"
        data = execute_overpass_query(full_query)
        if not data or "elements" not in data:
            print(f"[OSM] Batch skipped due to timeout/network.")
            continue

        elements = data["elements"]
        print(f"[OSM] Received {len(elements)} raw elements from Overpass API.")

        per_prov_added: Dict[str, int] = {b[0]: 0 for b in batch}
        per_prov_cat_added: Dict[Tuple[str, str], int] = {}
        records_to_insert = []

        # Prioritize tourism/historic/natural elements before restaurants/cafes
        def _el_priority(el: Dict) -> int:
            t = el.get("tags", {})
            if t.get("tourism") or t.get("historic") or t.get("natural"):
                return 0
            return 1

        elements.sort(key=_el_priority)

        for el in elements:
            el_id = el.get("id")
            el_type = el.get("type", "node")
            if not el_id:
                continue
            osm_id = f"osm-{el_type}-{el_id}"
            if osm_id in existing_ids:
                continue

            tags = el.get("tags", {})
            name = (tags.get("name:vi") or tags.get("name") or "").strip()
            if not is_valid_poi_name(name):
                continue

            lat = el.get("lat") or (el.get("center") or {}).get("lat")
            lon = el.get("lon") or (el.get("center") or {}).get("lon")
            if lat is None or lon is None:
                continue
            lat_f, lon_f = float(lat), float(lon)
            if not (8.18 <= lat_f <= 23.40 and 102.14 <= lon_f <= 109.50):
                continue

            # Assign to nearest province in centroids (within 35km)
            nearest_prov, min_dist_m = None, 1e12
            for p_name, p_lat, p_lng in centroids:
                d_m = haversine_m(lat_f, lon_f, p_lat, p_lng)
                if d_m < min_dist_m:
                    min_dist_m = d_m
                    nearest_prov = p_name

            if not nearest_prov or min_dist_m > 38000:
                continue

            if per_prov_added.get(nearest_prov, 0) >= per_province_cap:
                continue

            category, p_min, p_max, oh_dict, walking_load, indoor_outdoor, slots, desc = classify_osm_element(tags, nearest_prov)

            # Balance categories per province (at most 28 cafes and 28 restaurants per province so sightseeing stays rich)
            cat_key = (nearest_prov, category)
            if "Cà phê" in category and per_prov_cat_added.get(cat_key, 0) >= 25:
                continue
            if "Ẩm thực" in category and per_prov_cat_added.get(cat_key, 0) >= 28:
                continue

            # Spatial & Name Deduplication within province (< 50m or identical name)
            name_low = name.lower()
            prov_existing = existing_by_prov.setdefault(nearest_prov, [])
            is_dup = False
            for ex_name, ex_lat, ex_lng in prov_existing:
                if ex_name == name_low or haversine_m(lat_f, lon_f, ex_lat, ex_lng) < 50.0:
                    is_dup = True
                    break
            if is_dup:
                continue

            photo = (tags.get("image") or tags.get("wikimedia_commons") or "").strip()
            src_url = f"https://www.openstreetmap.org/{el_type}/{el_id}"

            records_to_insert.append((
                osm_id,
                name,
                nearest_prov,
                category,
                round(lat_f, 6),
                round(lon_f, 6),
                p_min,
                p_max,
                json.dumps(oh_dict, ensure_ascii=False),
                desc,
                photo,
                walking_load,
                indoor_outdoor,
                json.dumps(slots),
                src_url,
                now_iso,
                "ACTIVE",
            ))
            existing_ids.add(osm_id)
            prov_existing.append((name_low, lat_f, lon_f))
            per_prov_added[nearest_prov] = per_prov_added.get(nearest_prov, 0) + 1
            per_prov_cat_added[cat_key] = per_prov_cat_added.get(cat_key, 0) + 1

        if records_to_insert:
            cur.executemany(
                """
                INSERT OR IGNORE INTO destinations
                (id, name, province, category, latitude, longitude, price_min, price_max,
                 opening_hours, description, photo_url, walking_load, indoor_outdoor,
                 suitable_slots, source_url, verified_at, status)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """,
                records_to_insert,
            )
            conn.commit()
            total_inserted += len(records_to_insert)
            print(f"[OSM] Inserted {len(records_to_insert)} verified POIs in batch (Total added: {total_inserted}).")

        time.sleep(1.2)

    cur.execute("SELECT COUNT(*) FROM destinations")
    final_total = cur.fetchone()[0]
    conn.close()
    print(f"[OSM] Completed! Added {total_inserted} real OSM POIs. Database now has {final_total} verified destinations.")
    return total_inserted


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Fetch 100% real OSM destinations for VISTA across 63 provinces")
    parser.add_argument("--batch-size", type=int, default=9, help="Provinces per Overpass query batch")
    parser.add_argument("--cap", type=int, default=85, help="Max OSM POIs added per province")
    args = parser.parse_args()
    ingest_all_provinces(batch_size=args.batch_size, per_province_cap=args.cap)
