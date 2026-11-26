"""
Intercity Transit & Dynamic Seasonal Pricing Engine (VISTA AI Planner - TV4)
Tính toán chi phí di chuyển liên tỉnh khứ hồi chính xác theo tuyến đường,
phương tiện (Máy bay, Tàu hỏa, Xe khách/Limousine, Xe cá nhân) và biến động theo mùa cao điểm/thấp điểm.
"""

import math
import re
from typing import Dict, Any, Optional
from datetime import datetime

# Tọa độ GPS trung tâm tỉnh thành phục vụ tính toán khoảng cách cự ly bay/đường bộ chính xác
PROVINCE_COORDINATES: Dict[str, Dict[str, float]] = {
    "Hà Nội": {"lat": 21.0285, "lng": 105.8542},
    "Hồ Chí Minh": {"lat": 10.7769, "lng": 106.7009},
    "Đà Nẵng": {"lat": 16.0544, "lng": 108.2022},
    "Thừa Thiên Huế": {"lat": 16.4637, "lng": 107.5909},
    "Quảng Nam": {"lat": 15.8801, "lng": 108.3380},
    "Quảng Ngãi": {"lat": 15.1205, "lng": 108.7923},
    "Bình Định": {"lat": 13.7820, "lng": 109.2194},
    "Khánh Hòa": {"lat": 12.2388, "lng": 109.1967},
    "Lâm Đồng": {"lat": 11.9404, "lng": 108.4583},
    "Kiên Giang": {"lat": 10.2899, "lng": 103.9840},
    "Lào Cai": {"lat": 22.3364, "lng": 103.8438},
    "Hà Giang": {"lat": 22.8233, "lng": 104.9836},
    "Quảng Ninh": {"lat": 20.9505, "lng": 107.0734},
    "Ninh Bình": {"lat": 20.2506, "lng": 105.9745},
    "Cần Thơ": {"lat": 10.0452, "lng": 105.7469},
    "Hải Phòng": {"lat": 20.8449, "lng": 106.6881},
    "Bà Rịa - Vũng Tàu": {"lat": 10.3460, "lng": 107.0843},
    "Bình Thuận": {"lat": 10.9333, "lng": 108.1000},
}

def normalize_province_name(raw: str) -> str:
    if not raw:
        return ""
    s = raw.strip()
    match = re.search(r"\(([^)]+)\)", s)
    if match:
        inside = match.group(1).strip()
        if inside in PROVINCE_COORDINATES or any(k in inside for k in ["Quảng Nam", "Lâm Đồng", "Khánh Hòa", "Kiên Giang", "Lào Cai", "Bà Rịa"]):
            s = inside
    if "Hội An" in s or "Quảng Nam" in s: return "Quảng Nam"
    if "Huế" in s or "Thừa Thiên" in s: return "Thừa Thiên Huế"
    if "Sài Gòn" in s or "Hồ Chí Minh" in s: return "Hồ Chí Minh"
    if "Hà Nội" in s: return "Hà Nội"
    if "Đà Nẵng" in s: return "Đà Nẵng"
    if "Sa Pa" in s or "Lào Cai" in s: return "Lào Cai"
    if "Đà Lạt" in s or "Lâm Đồng" in s: return "Lâm Đồng"
    if "Nha Trang" in s or "Khánh Hòa" in s: return "Khánh Hòa"
    if "Phú Quốc" in s or "Kiên Giang" in s: return "Kiên Giang"
    if "Hạ Long" in s or "Quảng Ninh" in s: return "Quảng Ninh"
    if "Vũng Tàu" in s: return "Bà Rịa - Vũng Tàu"
    if "Phan Thiết" in s or "Bình Thuận" in s: return "Bình Thuận"
    if "Quy Nhơn" in s or "Bình Định" in s: return "Bình Định"
    if "Cần Thơ" in s: return "Cần Thơ"
    if "Hải Phòng" in s: return "Hải Phòng"
    if "Ninh Bình" in s: return "Ninh Bình"
    return s

def calculate_distance_km(p1: str, p2: str) -> int:
    n1 = normalize_province_name(p1)
    n2 = normalize_province_name(p2)
    if n1.lower() == n2.lower():
        return 0
    c1 = PROVINCE_COORDINATES.get(n1)
    c2 = PROVINCE_COORDINATES.get(n2)
    if not c1 or not c2:
        return 600
    R = 6371
    d_lat = math.radians(c2["lat"] - c1["lat"])
    d_lng = math.radians(c2["lng"] - c1["lng"])
    a = math.sin(d_lat / 2) ** 2 + math.cos(math.radians(c1["lat"])) * math.cos(math.radians(c2["lat"])) * math.sin(d_lng / 2) ** 2
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
    return int(round(R * c))

def calculate_flight_fare_by_distance(dist_km: int) -> int:
    if dist_km < 180:
        return 0
    if dist_km <= 350:
        return 1650000
    if dist_km <= 550:
        return 1950000
    if dist_km <= 850:
        return 2200000
    if dist_km <= 1150:
        return 2550000
    return 2850000


# Bảng giá vé khứ hồi cơ sở (Base Round-trip Fare VND / người) theo tuyến và phương tiện
# Dữ liệu chuẩn hóa từ thị trường hàng không (VNA/VJ/Bamboo), ĐSVN và Vexere/nhà xe chất lượng cao.
TRANSIT_ROUTE_MATRIX: Dict[str, Dict[str, Dict[str, Any]]] = {
    "Hà Nội": {
        "Đà Nẵng": {
            "flight": {"base_fare": 2200000, "hub": "Sân bay Quốc tế Đà Nẵng", "transit_hours": 1.3},
            "train": {"base_fare": 1300000, "hub": "Ga Đà Nẵng", "transit_hours": 15.0},
            "coach": {"base_fare": 700000, "hub": "Bến xe Trung tâm Đà Nẵng", "transit_hours": 14.0},
            "car": {"base_fare": 1600000, "hub": "Cửa ngõ Đà Nẵng", "transit_hours": 13.0, "is_vehicle_cost": True},
        },
        "Thừa Thiên Huế": {
            "flight": {"base_fare": 2100000, "hub": "Cảng hàng không Quốc tế Phú Bài", "transit_hours": 1.2},
            "train": {"base_fare": 1200000, "hub": "Ga Huế", "transit_hours": 14.0},
            "coach": {"base_fare": 650000, "hub": "Bến xe phía Nam Huế", "transit_hours": 13.0},
            "car": {"base_fare": 1500000, "hub": "Cửa ngõ TP. Huế", "transit_hours": 12.0, "is_vehicle_cost": True},
        },
        "Lào Cai": {
            "train": {"base_fare": 850000, "hub": "Ga Lào Cai", "transit_hours": 8.0},
            "coach": {"base_fare": 650000, "hub": "Bến xe Sa Pa", "transit_hours": 5.5}, # Limousine
            "car": {"base_fare": 900000, "hub": "Thị xã Sa Pa", "transit_hours": 5.0, "is_vehicle_cost": True},
        },
        "Hà Giang": {
            "coach": {"base_fare": 600000, "hub": "Bến xe TP. Hà Giang", "transit_hours": 6.0},
            "car": {"base_fare": 1000000, "hub": "TP. Hà Giang", "transit_hours": 5.5, "is_vehicle_cost": True},
        },
        "Khánh Hòa": {
            "flight": {"base_fare": 2600000, "hub": "Cảng hàng không Quốc tế Cam Ranh", "transit_hours": 1.9},
            "train": {"base_fare": 1600000, "hub": "Ga Nha Trang", "transit_hours": 24.0},
            "coach": {"base_fare": 950000, "hub": "Bến xe phía Nam Nha Trang", "transit_hours": 26.0},
        },
        "Lâm Đồng": {
            "flight": {"base_fare": 2500000, "hub": "Cảng hàng không Liên Khương", "transit_hours": 1.8},
            "coach": {"base_fare": 1000000, "hub": "Bến xe Liên tỉnh Đà Lạt", "transit_hours": 28.0},
        },
        "Kiên Giang": {
            "flight": {"base_fare": 2900000, "hub": "Cảng hàng không Quốc tế Phú Quốc", "transit_hours": 2.1},
        },
        "Hồ Chí Minh": {
            "flight": {"base_fare": 2600000, "hub": "Cảng hàng không Quốc tế Tân Sơn Nhất", "transit_hours": 2.0},
            "train": {"base_fare": 1900000, "hub": "Ga Sài Gòn", "transit_hours": 32.0},
            "coach": {"base_fare": 1200000, "hub": "Bến xe Miền Đông", "transit_hours": 36.0},
        },
        "Quảng Ninh": {
            "coach": {"base_fare": 450000, "hub": "Bến xe Bãi Cháy", "transit_hours": 2.5},
            "car": {"base_fare": 600000, "hub": "TP. Hạ Long", "transit_hours": 2.2, "is_vehicle_cost": True},
        },
        "Ninh Bình": {
            "coach": {"base_fare": 300000, "hub": "Bến xe Ninh Bình", "transit_hours": 1.5},
            "train": {"base_fare": 250000, "hub": "Ga Ninh Bình", "transit_hours": 1.8},
            "car": {"base_fare": 400000, "hub": "TP. Ninh Bình", "transit_hours": 1.3, "is_vehicle_cost": True},
        },
    },
    "Hồ Chí Minh": {
        "Đà Nẵng": {
            "flight": {"base_fare": 2100000, "hub": "Sân bay Quốc tế Đà Nẵng", "transit_hours": 1.3},
            "train": {"base_fare": 1250000, "hub": "Ga Đà Nẵng", "transit_hours": 16.0},
            "coach": {"base_fare": 750000, "hub": "Bến xe Trung tâm Đà Nẵng", "transit_hours": 17.0},
            "car": {"base_fare": 1700000, "hub": "Cửa ngõ Đà Nẵng", "transit_hours": 16.0, "is_vehicle_cost": True},
        },
        "Thừa Thiên Huế": {
            "flight": {"base_fare": 2200000, "hub": "Cảng hàng không Quốc tế Phú Bài", "transit_hours": 1.3},
            "train": {"base_fare": 1300000, "hub": "Ga Huế", "transit_hours": 18.0},
            "coach": {"base_fare": 800000, "hub": "Bến xe phía Nam Huế", "transit_hours": 19.0},
        },
        "Lâm Đồng": {
            "flight": {"base_fare": 1800000, "hub": "Cảng hàng không Liên Khương", "transit_hours": 0.8},
            "coach": {"base_fare": 600000, "hub": "Bến xe Liên tỉnh Đà Lạt (Limousine)", "transit_hours": 6.5},
            "car": {"base_fare": 800000, "hub": "TP. Đà Lạt", "transit_hours": 6.0, "is_vehicle_cost": True},
        },
        "Khánh Hòa": {
            "flight": {"base_fare": 1800000, "hub": "Cảng hàng không Quốc tế Cam Ranh", "transit_hours": 1.0},
            "train": {"base_fare": 800000, "hub": "Ga Nha Trang", "transit_hours": 8.0},
            "coach": {"base_fare": 500000, "hub": "Bến xe phía Nam Nha Trang", "transit_hours": 8.5},
            "car": {"base_fare": 900000, "hub": "TP. Nha Trang", "transit_hours": 7.5, "is_vehicle_cost": True},
        },
        "Kiên Giang": {
            "flight": {"base_fare": 1900000, "hub": "Cảng hàng không Quốc tế Phú Quốc", "transit_hours": 1.0},
            "coach": {"base_fare": 650000, "hub": "Bến tàu Rạch Giá / Phú Quốc Express", "transit_hours": 6.0},
        },
        "Hà Nội": {
            "flight": {"base_fare": 2600000, "hub": "Cảng hàng không Quốc tế Nội Bài", "transit_hours": 2.0},
            "train": {"base_fare": 1900000, "hub": "Ga Hà Nội", "transit_hours": 32.0},
            "coach": {"base_fare": 1200000, "hub": "Bến xe Nước Ngầm", "transit_hours": 36.0},
        },
        "Bà Rịa - Vũng Tàu": {
            "coach": {"base_fare": 320000, "hub": "Bến xe Vũng Tàu (Limousine VIP)", "transit_hours": 2.0},
            "car": {"base_fare": 450000, "hub": "TP. Vũng Tàu", "transit_hours": 1.8, "is_vehicle_cost": True},
        },
        "Cần Thơ": {
            "coach": {"base_fare": 350000, "hub": "Bến xe Trung tâm Cần Thơ", "transit_hours": 3.0},
            "car": {"base_fare": 500000, "hub": "TP. Cần Thơ", "transit_hours": 2.5, "is_vehicle_cost": True},
        },
    },
    "Đà Nẵng": {
        "Hà Nội": {
            "flight": {"base_fare": 2200000, "hub": "Cảng hàng không Quốc tế Nội Bài", "transit_hours": 1.3},
            "train": {"base_fare": 1300000, "hub": "Ga Hà Nội", "transit_hours": 15.0},
            "coach": {"base_fare": 700000, "hub": "Bến xe Giáp Bát", "transit_hours": 14.0},
        },
        "Hồ Chí Minh": {
            "flight": {"base_fare": 2100000, "hub": "Cảng hàng không Quốc tế Tân Sơn Nhất", "transit_hours": 1.3},
            "train": {"base_fare": 1250000, "hub": "Ga Sài Gòn", "transit_hours": 16.0},
            "coach": {"base_fare": 750000, "hub": "Bến xe Miền Đông", "transit_hours": 17.0},
        },
        "Thừa Thiên Huế": {
            "train": {"base_fare": 200000, "hub": "Ga Huế (Tàu di sản kết nối Huế - Đà Nẵng)", "transit_hours": 2.5},
            "coach": {"base_fare": 180000, "hub": "Bến xe phía Nam Huế", "transit_hours": 2.0},
            "car": {"base_fare": 300000, "hub": "TP. Huế (qua Hầm/Đèo Hải Vân)", "transit_hours": 1.8, "is_vehicle_cost": True},
        },
        "Quảng Nam": {
            "coach": {"base_fare": 100000, "hub": "Phố cổ Hội An", "transit_hours": 0.8},
            "car": {"base_fare": 150000, "hub": "Hội An", "transit_hours": 0.6, "is_vehicle_cost": True},
        },
    }
}


class IntercityTransitPricingEngine:
    """
    Engine định giá chi phí di chuyển liên tỉnh khứ hồi với mô hình biến thiên theo mùa.
    """

    @classmethod
    def get_seasonal_factor(cls, start_date_str: Optional[str] = None) -> Dict[str, Any]:
        """
        Xác định hệ số mùa dựa trên ngày đi.
        - Mùa Tết / Lễ lớn (Tết Âm lịch, 30/4 - 1/5, 2/9): 1.5x - 1.7x
        - Mùa Cao điểm Hè (Tháng 6, 7, 8): 1.30x (+30%)
        - Mùa Trung điểm (Tháng 3, 4, 5, 9, 12): 1.0x (Giá gốc tiêu chuẩn)
        - Mùa Thấp điểm (Tháng 10, 11): 0.85x (-15% vé khuyến mãi / kích cầu)
        """
        month = 6  # Mặc định mùa hè
        day = 15
        if start_date_str:
            try:
                dt = datetime.strptime(start_date_str[:10], "%Y-%m-%d")
                month = dt.month
                day = dt.day
            except Exception:
                pass

        # 1. Cao điểm Tết Nguyên Đán (Khoảng 20/01 đến 15/02 tùy năm)
        if (month == 1 and day >= 20) or (month == 2 and day <= 15):
            return {
                "factor": 1.65,
                "season_tier": "PEAK_TET",
                "season_name": "Mùa Cao điểm Tết",
                "badge_label": "Cao điểm Tết (+65%)",
                "description": "Giá vé máy bay và tàu xe đạt mức trần do nhu cầu du xuân và về quê tăng đột biến."
            }

        # 2. Đại lễ 30/4 - 1/5 và Quốc khánh 2/9
        if (month == 4 and day >= 27) or (month == 5 and day <= 3) or (month == 8 and day >= 30) or (month == 9 and day <= 4):
            return {
                "factor": 1.45,
                "season_tier": "PEAK_HOLIDAY",
                "season_name": "Kỳ nghỉ Lễ lớn",
                "badge_label": "Kỳ nghỉ Lễ (+45%)",
                "description": "Nhu cầu du lịch dịp đại lễ tăng cao, các hãng áp dụng khung giá cao điểm."
            }

        # 3. Cao điểm Hè (Tháng 6, 7, 8)
        if month in [6, 7, 8]:
            return {
                "factor": 1.30,
                "season_tier": "PEAK_SUMMER",
                "season_name": "Mùa Cao điểm Hè",
                "badge_label": "Cao điểm Hè (+30%)",
                "description": "Mùa du lịch gia đình và học sinh nghỉ hè, giá vé máy bay và xe tăng trung bình 30%."
            }

        # 4. Mùa Thấp điểm (Tháng 10, 11 - trừ sự kiện đặc biệt)
        if month in [10, 11]:
            return {
                "factor": 0.85,
                "season_tier": "LOW_SEASON",
                "season_name": "Mùa Thấp điểm",
                "badge_label": "Mùa Thấp điểm (-15%)",
                "description": "Mùa kích cầu du lịch thu - đông, nhiều chương trình vé khuyến mãi và giảm giá."
            }

        # 5. Mùa Tiêu chuẩn (Tháng 3, 4, 5, 9, 12)
        return {
            "factor": 1.00,
            "season_tier": "REGULAR",
            "season_name": "Mùa Tiêu chuẩn",
            "badge_label": "Giá Tiêu chuẩn (100%)",
            "description": "Mức giá vé ổn định, không phát sinh phụ thu cao điểm."
        }

    @classmethod
    def calculate_transit_cost(
        cls,
        origin_province: str,
        destination_province: str,
        transport_mode: str,
        start_date: Optional[str] = None,
        people_count: int = 2
    ) -> Dict[str, Any]:
        """
        Tính toán chi phí di chuyển liên tỉnh khứ hồi toàn diện.
        """
        raw_origin = origin_province.strip() if origin_province else "Hà Nội"
        raw_dest = destination_province.strip() if destination_province else "Đà Nẵng"
        origin = normalize_province_name(raw_origin)
        dest = normalize_province_name(raw_dest)
        mode = transport_mode.lower().strip() if transport_mode else "flight"
        people = max(1, people_count)
        dist_km = calculate_distance_km(origin, dest)

        # Cùng một tỉnh/thành phố xuất phát -> Không phát sinh cước liên tỉnh
        if origin.lower() == dest.lower():
            return {
                "is_intercity": False,
                "origin": raw_origin,
                "destination": raw_dest,
                "normalized_origin": origin,
                "normalized_destination": dest,
                "distance_km": 0,
                "transport_mode": "local",
                "transport_name": "Nội tỉnh / Tự túc",
                "base_fare_per_person": 0,
                "seasonal_factor": 1.0,
                "total_transit_cost_vnd": 0,
                "season_info": cls.get_seasonal_factor(start_date),
                "arrival_hub": "Điểm hẹn nội thành",
                "transit_hours": 0.5,
                "summary": f"Xuất phát tại chỗ ({raw_dest}), không phát sinh chi phí vé liên tỉnh."
            }

        season = cls.get_seasonal_factor(start_date)
        factor = season["factor"]

        # Tra cứu bảng ma trận tuyến
        route_data = TRANSIT_ROUTE_MATRIX.get(origin, {}).get(dest, {})
        if not route_data:
            # Tra cứu ngược lại nếu có
            route_data = TRANSIT_ROUTE_MATRIX.get(dest, {}).get(origin, {})

        is_available = True
        unavailable_reason = None
        effective_mode = mode

        # Kiểm tra nếu cự ly gần dưới 180km hoặc tuyến ko có chuyến bay thương mại
        if mode == "flight":
            if dist_km < 180 or (route_data and "flight" not in route_data):
                is_available = False
                unavailable_reason = f"{origin} và {dest} cự ly gần (~{dist_km}km), không có đường bay thương mại trực tiếp."
                if route_data and "train" in route_data:
                    effective_mode = "train"
                elif route_data and "coach" in route_data:
                    effective_mode = "coach"
                elif route_data and "car" in route_data:
                    effective_mode = "car"
                else:
                    effective_mode = "coach"
            elif not route_data:
                no_airport = ["Lào Cai", "Hà Giang", "Ninh Bình", "Quảng Ninh", "Bà Rịa - Vũng Tàu", "Bình Thuận", "Bến Tre", "Tiền Giang", "Vĩnh Long", "Hưng Yên", "Hà Nam", "Nam Định"]
                if dest in no_airport or origin in no_airport:
                    is_available = False
                    unavailable_reason = f"{dest} chưa có sân bay thương mại trực tiếp."
                    effective_mode = "coach"

        # Nếu không có tuyến trực tiếp trong ma trận, dùng thuật toán ước tính theo cự ly thực tế
        if not route_data or effective_mode not in route_data:
            if effective_mode == "flight":
                base_fare = calculate_flight_fare_by_distance(dist_km)
                hub_name = f"Cảng hàng không {dest}"
                hours = 1.3
                is_vehicle = False
            elif effective_mode == "train":
                base_fare = int(dist_km * 1500 + 150000)
                hub_name = f"Ga {dest}"
                hours = max(2.0, dist_km / 50.0)
                is_vehicle = False
            elif effective_mode == "coach":
                base_fare = max(120000, int(dist_km * 900 + 80000))
                hub_name = f"Bến xe {dest}"
                hours = max(1.0, dist_km / 60.0)
                is_vehicle = False
            else:
                base_fare = max(200000, int(dist_km * 1800 + 120000))
                hub_name = f"Cửa ngõ {dest}"
                hours = max(1.0, dist_km / 70.0)
                is_vehicle = True
        else:
            conf = route_data[effective_mode]
            base_fare = conf["base_fare"]
            hub_name = conf["hub"]
            hours = conf.get("transit_hours", 2.0)
            is_vehicle = conf.get("is_vehicle_cost", False)

        # Tính đơn giá thực tế sau khi nhân hệ số mùa
        actual_fare_per_person = int(base_fare * factor)

        # Đối với xe cá nhân/tự lái (car): chi phí tính theo xe (xăng xe + trạm BOT khứ hồi)
        if is_vehicle:
            # 1 xe chở tối đa 4 người
            cars_needed = (people + 3) // 4
            total_transit_cost = int(base_fare * factor) * cars_needed
            actual_fare_per_person = total_transit_cost // people
        else:
            total_transit_cost = actual_fare_per_person * people

        mode_names = {
            "flight": "Máy bay khứ hồi ✈️",
            "train": "Tàu hỏa khứ hồi 🚆",
            "coach": "Xe khách / Limousine khứ hồi 🚌",
            "car": "Xe ô tô cá nhân / Xăng dầu & BOT 🚗",
        }

        return {
            "is_intercity": True,
            "origin": raw_origin,
            "destination": raw_dest,
            "normalized_origin": origin,
            "normalized_destination": dest,
            "distance_km": dist_km,
            "transport_mode": effective_mode,
            "transport_name": mode_names.get(effective_mode, "Di chuyển liên tỉnh"),
            "base_fare_per_person": base_fare,
            "actual_fare_per_person": actual_fare_per_person,
            "seasonal_factor": factor,
            "season_info": season,
            "people_count": people,
            "total_transit_cost_vnd": total_transit_cost,
            "arrival_hub": hub_name,
            "transit_hours": hours,
            "is_available": is_available,
            "unavailable_reason": unavailable_reason,
            "summary": (
                f"Di chuyển từ {origin} đi {raw_dest} (~{dist_km}km) bằng {mode_names.get(effective_mode, effective_mode)}: "
                f"ước tính {actual_fare_per_person:,} đ/người ({season['badge_label']}), "
                f"tổng cộng {total_transit_cost:,} đ cho {people} người."
            ) if is_available else (
                f"Tuyến {origin} - {raw_dest} (~{dist_km}km) không có đường bay trực tiếp ({unavailable_reason}). "
                f"Đã tự động chuyển sang {mode_names.get(effective_mode, effective_mode)}: {actual_fare_per_person:,} đ/người."
            )
        }
