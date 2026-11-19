import json
import math
import urllib.request
from typing import Dict, List, Tuple, Optional

DETOUR_FACTOR = 1.35 # Hệ số đường vòng thực tế so với khoảng cách đường chim bay
CITY_SPEED_KMH = 30.0 # Vận tốc trung bình trong đô thị (km/h)

# In-memory cached road-network matrix populated by OSRM /table pre-warm (max 4000 pairs)
_OSRM_PAIR_CACHE: Dict[Tuple[float, float, float, float], Tuple[float, int]] = {}
_OSRM_CACHE_MAX = 4000

_HIGH_CONGESTION_HUBS = {
    "hà nội", "ha noi", "hồ chí minh", "ho chi minh", "sài gòn", "tp. hồ chí minh",
    "đà nẵng", "da nang", "khánh hòa", "nha trang", "lâm đồng", "đà lạt",
    "cần thơ", "hải phòng"
}


def get_congestion_multiplier(
    departure_min: Optional[int],
    province: Optional[str] = None,
    transport_mode: Optional[str] = None
) -> float:
    """
    Hệ số ùn tắc giao thông theo khung giờ trong ngày (Traffic-Aware Routing).
    - Giờ cao điểm sáng (07:30–08:45) & chiều (17:00–18:45) tại đô thị lớn: x1.28 (ô tô) / x1.15 (xe máy).
    - Giờ cao điểm trưa (11:30–12:45): x1.15 (ô tô) / x1.08 (xe máy).
    """
    if departure_min is None:
        return 1.0
    mode = (transport_mode or "car").strip().lower()
    if mode in ("walking", "walk", "đi bộ", "di bo"):
        return 1.0

    p_low = (province or "").strip().lower()
    is_major_city = any(hub in p_low for hub in _HIGH_CONGESTION_HUBS)
    is_motorbike = mode in ("motorbike", "bike", "xe máy", "xe may")

    in_morning_rush = (7 * 60 + 30) <= departure_min <= (8 * 60 + 45)
    in_evening_rush = (17 * 60) <= departure_min <= (18 * 60 + 45)
    in_lunch_rush = (11 * 60 + 30) <= departure_min <= (12 * 60 + 45)

    if in_morning_rush or in_evening_rush:
        if is_major_city:
            return 1.15 if is_motorbike else 1.28
        return 1.08 if is_motorbike else 1.12
    if in_lunch_rush and is_major_city:
        return 1.08 if is_motorbike else 1.15
    return 1.0


def prewarm_osrm_table(
    coords: List[Tuple[float, float]],
    timeout_sec: float = 1.8
) -> int:
    """
    Pre-warms pairwise real-road distance (km) and duration (minutes) via OSRM Table API
    for up to 25 top candidate coordinates. Silently falls back to Haversine on timeout/offline.
    Returns number of cached road pairs added.
    """
    clean_pts = [
        (round(float(lat), 5), round(float(lng), 5))
        for lat, lng in coords
        if lat and lng and abs(lat) > 0.1 and abs(lng) > 0.1
    ]
    # Deduplicate preserving order and cap at 25 points (max 625 pairs per single call)
    unique_pts: List[Tuple[float, float]] = []
    seen = set()
    for pt in clean_pts:
        if pt not in seen:
            seen.add(pt)
            unique_pts.append(pt)
        if len(unique_pts) >= 25:
            break

    if len(unique_pts) < 2:
        return 0

    # Skip network call if all pairs are already cached
    missing_any = False
    for i, (la1, lo1) in enumerate(unique_pts):
        for j, (la2, lo2) in enumerate(unique_pts):
            if i != j and (round(la1, 4), round(lo1, 4), round(la2, 4), round(lo2, 4)) not in _OSRM_PAIR_CACHE:
                missing_any = True
                break
        if missing_any:
            break
    if not missing_any:
        return 0

    coord_str = ";".join(f"{lng},{lat}" for lat, lng in unique_pts)
    url = f"https://router.project-osrm.org/table/v1/driving/{coord_str}?annotations=distance,duration"
    added = 0
    try:
        req = urllib.request.Request(url, headers={"User-Agent": "VISTA-AI-Planner/3.0"})
        with urllib.request.urlopen(req, timeout=timeout_sec) as resp:
            if resp.status != 200:
                return 0
            data = json.loads(resp.read().decode("utf-8"))
        distances = data.get("distances")
        durations = data.get("durations")
        if not distances or not durations:
            return 0
        if len(_OSRM_PAIR_CACHE) >= _OSRM_CACHE_MAX:
            _OSRM_PAIR_CACHE.clear()
        for i, (la1, lo1) in enumerate(unique_pts):
            for j, (la2, lo2) in enumerate(unique_pts):
                if i == j:
                    continue
                dist_m = distances[i][j]
                dur_s = durations[i][j]
                if dist_m is not None and dur_s is not None and dist_m >= 0 and dur_s >= 0:
                    key = (round(la1, 4), round(lo1, 4), round(la2, 4), round(lo2, 4))
                    _OSRM_PAIR_CACHE[key] = (round(float(dist_m) / 1000.0, 2), max(5, int(math.ceil(float(dur_s) / 60.0))))
                    added += 1
    except Exception:
        return 0
    return added

def haversine_km(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """Tính khoảng cách Haversine giữa 2 tọa độ (km)."""
    R = 6371.0 # Bán kính Trái Đất (km)
    phi1 = math.radians(lat1)
    phi2 = math.radians(lat2)
    delta_phi = math.radians(lat2 - lat1)
    delta_lambda = math.radians(lon2 - lon1)

    a = math.sin(delta_phi / 2.0) ** 2 + math.cos(phi1) * math.cos(phi2) * (math.sin(delta_lambda / 2.0) ** 2)
    c = 2.0 * math.atan2(math.sqrt(a), math.sqrt(1.0 - a))
    return R * c

def are_clusters_same_day_compatible(cluster_a: Optional[str], cluster_b: Optional[str]) -> bool:
    """
    Kiểm tra hai điểm có thể đi chung trong một ngày bằng đường bộ hay không.
    Nếu hai điểm khác cluster_id và ít nhất một điểm là đảo (ISLAND_*) hoặc vùng tách biệt xa,
    chúng bị ngăn cách bởi biển/phà và KHÔNG được xếp cùng một ngày.
    """
    ca = (cluster_a or "MAINLAND").strip().upper()
    cb = (cluster_b or "MAINLAND").strip().upper()
    if ca == cb:
        return True
    if ca.startswith("ISLAND_") or cb.startswith("ISLAND_"):
        return False
    if ca.startswith("OUTLIER_") or cb.startswith("OUTLIER_"):
        return False
    return True

def estimate_road_distance_km(
    lat1: float,
    lon1: float,
    lat2: float,
    lon2: float,
    cluster1: Optional[str] = None,
    cluster2: Optional[str] = None
) -> float:
    """
    Ước tính khoảng cách đường bộ thực tế (km) có nhân hệ số đường vòng 1.35.
    Nếu 2 điểm khác cụm đảo/đất liền (không có đường bộ nối trực tiếp), không dùng haversine * 1.35 thông thường.
    """
    if cluster1 and cluster2 and not are_clusters_same_day_compatible(cluster1, cluster2):
        return 999.0
    cache_key = (round(float(lat1), 4), round(float(lon1), 4), round(float(lat2), 4), round(float(lon2), 4))
    cached = _OSRM_PAIR_CACHE.get(cache_key)
    if cached is not None:
        return cached[0]
    straight_km = haversine_km(lat1, lon1, lat2, lon2)
    return round(straight_km * DETOUR_FACTOR, 2)

def estimate_transit_time_minutes(
    lat1: float,
    lon1: float,
    lat2: float,
    lon2: float,
    cluster1: Optional[str] = None,
    cluster2: Optional[str] = None,
    transport_mode: Optional[str] = None,
    departure_min: Optional[int] = None,
    province: Optional[str] = None
) -> int:
    """Ước tính thời gian di chuyển (phút) giữa 2 điểm theo phương tiện, đường bộ OSRM (nếu có cache) và hệ số ùn tắc khung giờ."""
    if cluster1 and cluster2 and not are_clusters_same_day_compatible(cluster1, cluster2):
        return 999
    if (lat1 == 0.0 and lon1 == 0.0) or (lat2 == 0.0 and lon2 == 0.0):
        return 15
    mode = (transport_mode or "car").strip().lower()
    congestion = get_congestion_multiplier(departure_min, province=province, transport_mode=mode)

    cache_key = (round(float(lat1), 4), round(float(lon1), 4), round(float(lat2), 4), round(float(lon2), 4))
    cached = _OSRM_PAIR_CACHE.get(cache_key)
    if cached is not None and mode not in ("walking", "walk", "đi bộ", "di bo"):
        base_min = cached[1]
        if mode in ("motorbike", "bike", "xe máy", "xe may"):
            base_min = max(8, int(math.ceil(base_min * 0.88)))
        return max(8, int(math.ceil(base_min * congestion)))

    road_km = estimate_road_distance_km(lat1, lon1, lat2, lon2)
    if mode in ("walking", "walk", "đi bộ", "di bo"):
        speed_kmh = 4.8
        hours = road_km / speed_kmh
        minutes = int(math.ceil(hours * 60.0))
        return max(5, minutes)
    elif mode in ("motorbike", "bike", "xe máy", "xe may"):
        speed_kmh = 42.0 if road_km > 25.0 else 32.0
        hours = road_km / speed_kmh
        minutes = int(math.ceil(hours * 60.0 * congestion))
        return max(8, minutes)
    else:
        # Tốc độ di chuyển ô tô / taxi (mặc định): Trong nội đô (~30km/h), chặng đường dài ngoài đô thị (>25km) ~45km/h
        speed_kmh = 45.0 if road_km > 25.0 else CITY_SPEED_KMH
        hours = road_km / speed_kmh
        minutes = int(math.ceil(hours * 60.0 * congestion))
        # Tối thiểu 10 phút nếu cùng khu vực; không chặn trần nhân tạo 90 phút nếu cự ly xa thực tế
        return max(10, minutes)


# Known transport hubs (airports / stations) coordinates for realistic departure/arrival legs
KNOWN_TRANSPORT_HUBS = {
    "sân bay tân sơn nhất": (10.8188, 106.6519, "TP. Hồ Chí Minh"),
    "tan son nhat": (10.8188, 106.6519, "TP. Hồ Chí Minh"),
    "tsn": (10.8188, 106.6519, "TP. Hồ Chí Minh"),
    "sân bay nội bài": (21.2187, 105.8042, "Hà Nội"),
    "noi bai": (21.2187, 105.8042, "Hà Nội"),
    "sân bay đà nẵng": (16.0539, 108.1994, "Đà Nẵng"),
    "sân bay phú quốc": (10.1698, 103.9931, "Kiên Giang"),
    "sân bay phú bài": (16.4015, 107.7026, "Thừa Thiên Huế"),
    "sân bay cam ranh": (11.9982, 109.2193, "Khánh Hòa"),
    "sân bay liên khương": (11.7500, 108.3667, "Lâm Đồng"),
    "ga sài gòn": (10.7825, 106.6769, "TP. Hồ Chí Minh"),
    "ga hà nội": (21.0245, 105.8412, "Hà Nội"),
    "ga đà nẵng": (16.0719, 108.2097, "Đà Nẵng"),
    "ga huế": (16.4573, 107.5799, "Thừa Thiên Huế"),
}


def resolve_hub_coordinates(point_name: Optional[str], province: Optional[str] = None) -> Optional[Tuple[float, float, str]]:
    """Tra cứu tọa độ sân bay/nhà ga/điểm xuất phát nếu người dùng truyền tên hoặc suy từ tỉnh."""
    if point_name:
        norm = point_name.strip().lower()
        for key, (lat, lng, prov) in KNOWN_TRANSPORT_HUBS.items():
            if key in norm or norm in key:
                return (lat, lng, point_name.strip())
    if province:
        p_low = province.strip().lower()
        if "hồ chí minh" in p_low or "sài gòn" in p_low or "hcm" in p_low:
            return (10.8188, 106.6519, point_name or "Sân bay Tân Sơn Nhất")
        if "đà nẵng" in p_low:
            return (16.0539, 108.1994, point_name or "Sân bay Quốc tế Đà Nẵng")
        if "hà nội" in p_low:
            return (21.2187, 105.8042, point_name or "Sân bay Quốc tế Nội Bài")
        if "huế" in p_low:
            return (16.4015, 107.7026, point_name or "Sân bay Phú Bài")
        if "kiên giang" in p_low or "phú quốc" in p_low:
            return (10.1698, 103.9931, point_name or "Sân bay Quốc tế Phú Quốc")
    return None


