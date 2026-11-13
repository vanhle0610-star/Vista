from typing import Dict, Any
import unicodedata

def normalize_prov(text: str) -> str:
    if not text:
        return ""
    norm = unicodedata.normalize("NFC", text).lower().strip()
    for prefix in ["tỉnh ", "tp. ", "tp ", "thành phố "]:
        if norm.startswith(prefix):
            norm = norm[len(prefix):].strip()
    return norm

NORTH_PROVINCES = {
    "hà nội", "hải phòng", "quảng ninh", "bắc ninh", "hà nam", "hải dương",
    "hưng yên", "nam định", "ninh bình", "thái bình", "vĩnh phúc", "hà giang",
    "cao bằng", "bắc kạn", "lạng sơn", "tuyên quang", "thái nguyên", "phú thọ",
    "bắc giang", "lào cai", "sa pa", "sapa", "yên bái", "điện biên", "lai châu", "sơn la", "hòa bình"
}

CENTRAL_PROVINCES = {
    "thanh hóa", "nghệ an", "hà tĩnh", "quảng bình", "quảng trị", "thừa thiên huế",
    "huế", "đà nẵng", "quảng nam", "hội an", "quảng ngãi", "bình định", "quy nhơn",
    "phú yên", "khánh hòa", "nha trang", "ninh thuận", "bình thuận", "phan thiết"
}

HIGHLANDS_PROVINCES = {
    "kon tum", "gia lai", "đắk lắk", "dak lak", "đắk nông", "dak nong", "lâm đồng", "đà lạt"
}

SOUTH_PROVINCES = {
    "hồ chí minh", "sài gòn", "tp. hcm", "tphcm", "bình phước", "bình dương",
    "đồng nai", "tây ninh", "bà rịa - vũng tàu", "vũng tàu", "long an", "tiền giang",
    "bến tre", "trà vinh", "vĩnh long", "đồng tháp", "an giang", "kiên giang",
    "phú quốc", "cần thơ", "hậu giang", "sóc trăng", "bạc liêu", "cà mau"
}

CLIMATE_RULES: Dict[str, Dict[int, Dict[str, Any]]] = {
    # Miền Trung
    "central": {
        month: {
            "is_rainy_season": month in [9, 10, 11, 12],
            "temp_range": "21°C – 26°C" if month in [10, 11, 12, 1, 2] else "28°C – 36°C",
            "advisory": "Mùa mưa se lạnh miền Trung, biển sóng lớn; nên ưu tiên điểm tham quan văn hóa, bảo tàng và ẩm thực trong nhà; mang theo ô/áo mưa nhẹ."
            if month in [9, 10, 11, 12] else
            "Tiết trời nắng đẹp, biển êm, cực kỳ thích hợp cho các hoạt động tắm biển và vui chơi ngoài trời."
        }
        for month in range(1, 13)
    },
    # Miền Bắc
    "north": {
        month: {
            "is_rainy_season": month in [6, 7, 8],
            "temp_range": "14°C – 20°C" if month in [11, 12, 1, 2] else "26°C – 35°C",
            "advisory": "Tiết trời chớm đông se lạnh, khô ráo, chụp ảnh phố phường và di tích rất đẹp; cần chuẩn bị áo ấm và khăn choàng."
            if month in [11, 12, 1, 2] else
            "Mùa hè nắng vàng, đôi khi có mưa rào chiều; nên khởi hành sớm vào buổi sáng."
        }
        for month in range(1, 13)
    },
    # Miền Nam
    "south": {
        month: {
            "is_rainy_season": month in [5, 6, 7, 8, 9, 10],
            "temp_range": "25°C – 32°C",
            "advisory": "Mùa khô rực rỡ, biển lặng ngọc bích, lý tưởng nhất trong năm để lặn ngắm san hô và ngắm hoàng hôn bãi biển."
            if month in [11, 12, 1, 2, 3, 4] else
            "Mùa mưa phương Nam với các cơn mưa rào nhanh tạnh; nên mang ô gấp gọn."
        }
        for month in range(1, 13)
    },
    # Tây Nguyên
    "highlands": {
        month: {
            "is_rainy_season": month in [5, 6, 7, 8, 9, 10],
            "temp_range": "14°C – 22°C" if month in [11, 12, 1, 2] else "18°C – 26°C",
            "advisory": "Mùa khô cao nguyên se lạnh, nắng ấm ban ngày, trăm hoa đua nở rực rỡ; lý tưởng nhất trong năm để săn mây, check-in đồi chè và ngắm cảnh sắc thiên nhiên. Buổi tối nhớ mặc ấm!"
            if month in [11, 12, 1, 2, 3, 4] else
            "Mùa mưa cao nguyên với các cơn mưa rào buổi chiều; thích hợp thư thả thưởng thức cà phê ngắm mưa và nghỉ dưỡng trong nhà."
        }
        for month in range(1, 13)
    },
    # Vùng trung tính / tổng quát
    "neutral": {
        month: {
            "is_rainy_season": False,
            "temp_range": "23°C – 29°C",
            "advisory": "Khí hậu mát mẻ, thuận tiện cho các hoạt động di chuyển và trải nghiệm ngoài trời."
        }
        for month in range(1, 13)
    }
}

def get_region_by_province(province: str) -> str:
    """
    Classifies all 63 Vietnamese provinces into 'north', 'central', 'highlands', 'south', or 'neutral'.
    """
    norm = normalize_prov(province)
    for p in HIGHLANDS_PROVINCES:
        if p in norm or norm in p:
            return "highlands"
    for p in NORTH_PROVINCES:
        if p in norm or norm in p:
            return "north"
    for p in CENTRAL_PROVINCES:
        if p in norm or norm in p:
            return "central"
    for p in SOUTH_PROVINCES:
        if p in norm or norm in p:
            return "south"
    return "neutral"

def get_weather_advisory(province: str, month: int = 11) -> Dict[str, Any]:
    region = get_region_by_province(province)
    safe_month = max(1, min(12, month))
    info = dict(CLIMATE_RULES.get(region, CLIMATE_RULES["neutral"]).get(safe_month, {
        "is_rainy_season": False,
        "temp_range": "24°C – 30°C",
        "advisory": "Thời tiết thuận lợi cho các hoạt động tham quan ngoài trời."
    }))
    info["source_type"] = "seasonal_climate_estimate"

    norm_p = normalize_prov(province)
    if region == "central":
        if info.get("is_rainy_season"):
            if "huế" in norm_p:
                info["temp_range"] = "20°C – 25°C"
                info["advisory"] = (
                    "Ước lượng khí hậu theo mùa: tiết trời Cố đô se lạnh và thường có mưa phùn kéo dài; "
                    "nên ưu tiên điểm tham quan di sản, lăng tẩm, bảo tàng và thưởng thức ẩm thực nóng; mang theo ô/áo mưa nhẹ."
                )
            elif "đà nẵng" in norm_p:
                info["temp_range"] = "22°C – 27°C"
                info["advisory"] = (
                    "Ước lượng khí hậu theo mùa: ven biển miền Trung có gió mùa và mưa rào theo đợt; "
                    "nên ưu tiên điểm tham quan văn hóa, bảo tàng và ẩm thực trong nhà; chuẩn bị áo khoác mỏng và ô gấp."
                )
            elif "quảng nam" in norm_p or "hội an" in norm_p:
                info["temp_range"] = "22°C – 26°C"
                info["advisory"] = (
                    "Ước lượng khí hậu theo mùa: tiết trời dịu mát xen kẽ mưa rào cuối thu; "
                    "thích hợp dạo bộ khu di sản, thưởng thức cà phê và ẩm thực truyền thống; nhớ mang theo ô/áo mưa."
                )
        else:
            if "huế" in norm_p:
                info["temp_range"] = "27°C – 35°C"
                info["advisory"] = (
                    "Ước lượng khí hậu theo mùa: trời nắng ráo, thuận lợi tham quan quần thể di tích và dạo mát buổi chiều; "
                    "nên mang nón rộng vành và nước uống."
                )
            elif "đà nẵng" in norm_p:
                info["temp_range"] = "26°C – 33°C"
                info["advisory"] = (
                    "Ước lượng khí hậu theo mùa: nắng đẹp, biển êm, rất thích hợp cho các hoạt động tắm biển và dạo mát ven sông."
                )
    return info
