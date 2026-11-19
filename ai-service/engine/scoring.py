from typing import List
from models.destination import Destination
from models.constraints import UserConstraints
from data.loader import has_exact_token
from services.weather_advisor import get_weather_advisory

class DestinationScoringEngine:
    @staticmethod
    def calculate_score(
        dest: Destination,
        constraints: UserConstraints,
        target_slot: str
    ) -> float:
        score = 50.0  # Điểm cơ sở
        norm_name = dest.name.lower()
        norm_cat = dest.category.lower()
        norm_desc = (dest.description or "").lower()

        # 2-Tier Curation Bonus: Tier 1 curated landmarks stay strongly primary over raw Tier-2 OSM POIs
        import config
        is_curated = getattr(dest, "data_source", "") in ("VISTA_CURATED_CSV", "VISTA_CURATED") or str(dest.id).startswith("dest-")
        if target_slot in ("MORNING", "AFTERNOON", "EVENING"):
            if is_curated:
                score += max(42.0, config.RANKING_WEIGHTS.get("curated_landmark_bonus", 18.0))
            elif getattr(dest, "data_source", "") == "OPENSTREETMAP_REAL" and norm_cat in ("thiên nhiên & ngắm cảnh", "khám phá"):
                score -= 14.0
        elif target_slot == "NOON" and is_curated:
            score += 20.0

        # Check rainy season outdoor penalty (-30)
        month = 11
        if constraints.start_date:
            try:
                month = int(str(constraints.start_date).split("-")[1])
            except Exception:
                month = 11
        weather_info = get_weather_advisory(dest.province, month)
        is_rainy = bool(weather_info.get("is_rainy_season"))
        is_hot_weather = False
        try:
            import re as _re
            temps = [int(t) for t in _re.findall(r"(\d+)\s*°C", str(weather_info.get("temp_range", "")))]
            if temps and max(temps) >= 33:
                is_hot_weather = True
        except Exception:
            is_hot_weather = False

        if is_rainy:
            is_outdoor_exposed = (
                dest.indoor_outdoor == "OUTDOOR"
                or any(k in norm_name or k in norm_cat for k in ["biển", "bãi biển", "công viên nước", "đèo", "thác"])
            )
            if is_outdoor_exposed:
                score -= 30.0

        # 1. SLOT-SPECIFIC SCORING (Chấm điểm chuyên biệt theo từng khung giờ + điều phối theo thời tiết)
        if target_slot == "MORNING":
            if "MORNING" in dest.suitable_slots:
                score += 35.0
            else:
                score -= 15.0

            # Sáng ưu tiên ngắm cảnh, thiên nhiên, di tích, tâm linh đón bình minh (đặc biệt khi trưa/chiều nắng gắt hoặc mưa rào chiều)
            if dest.indoor_outdoor == "OUTDOOR":
                score += 27.0 if (is_rainy or is_hot_weather) else 15.0
            if any(k in norm_name or k in norm_cat for k in ["chùa", "đền", "núi", "đèo", "vịnh", "thắng cảnh", "lăng"]):
                score += 20.0
            # Tránh điểm chỉ mở tối hoặc bar/pub
            if any(k in norm_name or k in norm_cat for k in ["chợ đêm", "bar", "pub", "club"]):
                score -= 60.0

        elif target_slot == "NOON":
            is_food = (
                dest.category in ["Ăn uống", "Ẩm thực"]
                or "NOON" in dest.suitable_slots
                or any(has_exact_token(k, norm_name) or has_exact_token(k, norm_cat) for k in ["ẩm thực", "quán", "cơm", "bún", "phở", "bánh", "chè", "đặc sản", "nhà hàng", "chợ"])
            )
            if is_food:
                score += 65.0
            else:
                # Slot NOON bắt buộc ưu tiên ẩm thực nghỉ trưa; địa điểm tham quan tốn sức bị trừ điểm mạnh
                score -= 50.0

            if dest.indoor_outdoor == "INDOOR":
                score += 15.0  # Tránh nắng đỉnh đầu

        elif target_slot == "AFTERNOON":
            if "AFTERNOON" in dest.suitable_slots:
                score += 30.0
            if dest.indoor_outdoor == "INDOOR" or any(k in norm_name or k in norm_cat for k in ["bảo tàng", "làng nghề", "cà phê", "cafe", "bãi biển", "biển"]):
                score += 20.0
            # Weather-driven slot reordering: mưa hoặc nắng gắt đầu chiều ưu tiên điểm trong nhà/bảo tàng/cà phê
            if is_rainy or is_hot_weather:
                if dest.indoor_outdoor == "INDOOR" or any(k in norm_name or k in norm_cat for k in ["bảo tàng", "cà phê", "cafe", "nhà hát", "trung tâm thương mại", "spa"]):
                    score += 22.0
                elif dest.indoor_outdoor == "OUTDOOR" and not any(k in norm_name or k in norm_cat for k in ["biển", "bãi biển"]):
                    score -= 18.0

        elif target_slot == "EVENING":
            if "EVENING" in dest.suitable_slots or "NIGHT" in dest.suitable_slots:
                score += 35.0
            # Tối ưu tiên điểm mở muộn, phố đi bộ, chợ đêm, cầu ngắm cảnh, du thuyền, ẩm thực đêm
            is_evening_vibe = any(
                has_exact_token(k, norm_name) or has_exact_token(k, norm_cat)
                for k in ["phố đi bộ", "chợ đêm", "du thuyền", "cầu", "sông", "đêm", "ẩm thực", "quán"]
            )
            if is_evening_vibe:
                score += 40.0
            # Smart Dinner / Nightlife pairing bonus
            if any(k in norm_name or k in norm_cat for k in ["chợ đêm", "phố ẩm thực", "hải sản", "lẩu", "nướng", "nhà hàng", "bún", "phở", "ẩm thực"]):
                score += 28.0

            # Kiểm tra giờ đóng cửa nếu có trong DB: nếu đóng trước 17:30 thì trừ điểm nặng
            if dest.opening_hours:
                close_str = dest.opening_hours.get("close") or dest.opening_hours.get("closing")
                if close_str:
                    try:
                        c_h = int(close_str.split(":")[0])
                        if c_h <= 17:
                            score -= 80.0
                    except Exception:
                        pass

        # 2. Ràng buộc Must-include / Must-visit / Must-avoid & Phản hồi phiên (Interactive Feedback Loop)
        must_visit_all = [str(x).lower().strip() for x in (constraints.must_include or []) + (getattr(constraints, "must_visit_ids", []) or []) if str(x).strip()]
        if dest.id.lower() in must_visit_all or any(m in norm_name for m in must_visit_all):
            score += 500.0
        if any(a.lower() in norm_name for a in constraints.must_avoid):
            score -= 300.0

        rejected_ids = {str(rid).strip().lower() for rid in (getattr(constraints, "rejected_destination_ids", None) or []) if str(rid).strip()}
        if dest.id.lower() in rejected_ids:
            score -= 600.0
        rejected_subtypes = {str(st).strip().upper() for st in (getattr(constraints, "rejected_subtypes", None) or []) if str(st).strip()}
        if rejected_subtypes:
            from engine.routing import _get_broad_subtype
            if _get_broad_subtype(dest) in rejected_subtypes:
                score -= 140.0

        # 3. Phù hợp sở thích người dùng (Priority Interests & Secondary Interests)
        INTEREST_KEYWORD_MAP = {
            "biển": ["biển", "bãi tắm", "đảo", "vịnh", "bán đảo", "hòn", "bến", "cảng", "du thuyền", "sông", "hồ"],
            "nghỉ dưỡng": ["nghỉ dưỡng", "resort", "spa", "khoáng nóng", "suối khoáng", "thư giãn", "công viên", "vườn"],
            "beach": ["biển", "bãi tắm", "đảo", "vịnh", "nghỉ dưỡng", "du thuyền", "sông", "hồ"],
            "văn hóa": ["văn hóa", "di tích", "lịch sử", "bảo tàng", "chùa", "đền", "nhà thờ", "dinh", "lăng", "cổ", "di sản", "miếu", "thánh thất"],
            "di sản": ["di sản", "di tích", "lịch sử", "bảo tàng", "cố đô", "thành cổ", "phố cổ", "chùa", "nhà thờ", "dinh"],
            "culture": ["văn hóa", "di tích", "lịch sử", "bảo tàng", "chùa", "đền", "nhà thờ", "dinh", "lăng"],
            "ẩm thực": ["ẩm thực", "quán", "nhà hàng", "đặc sản", "chợ", "bún", "phở", "cơm", "hải sản", "bánh", "ăn uống", "lẩu", "nướng", "ốc", "hủ tiếu", "mì", "chè"],
            "cuisine": ["ẩm thực", "quán", "nhà hàng", "đặc sản", "chợ", "bún", "phở", "cơm", "bánh", "ăn uống", "chè"],
            "thiên nhiên": ["thiên nhiên", "sinh thái", "vườn", "rừng", "núi", "thác", "hồ", "công viên", "suối", "đồi", "thung lũng", "cần giờ"],
            "sinh thái": ["sinh thái", "vườn", "rừng", "thảo cầm viên", "suối", "thác", "hồ", "đảo", "công viên"],
            "nature": ["thiên nhiên", "sinh thái", "vườn", "rừng", "núi", "thác", "hồ", "công viên"],
            "vui chơi": ["vui chơi", "giải trí", "công viên", "khu du lịch", "cáp treo", "nhà hát", "phố đi bộ", "quảng trường", "thảo cầm viên", "landmark", "skyview", "suối tiên", "đầm sen"],
            "giải trí": ["giải trí", "vui chơi", "công viên", "nhà hát", "phố đi bộ", "skyview", "landmark", "du thuyền", "cáp treo"],
            "entertainment": ["vui chơi", "giải trí", "công viên", "khu du lịch", "nhà hát", "phố đi bộ", "skyview"],
            "check-in": ["check-in", "sống ảo", "cảnh quan", "cầu", "tháp", "phố đi bộ", "ngắm cảnh", "view", "cà phê", "biểu tượng", "bưu điện", "nhà thờ", "landmark", "rooftop"],
            "sống ảo": ["check-in", "sống ảo", "cảnh quan", "ngắm cảnh", "rooftop", "cà phê", "phố", "bảo tàng mỹ thuật"],
            "photo": ["check-in", "sống ảo", "cảnh quan", "cầu", "tháp", "ngắm cảnh", "rooftop"],
            "cà phê": ["cà phê", "cafe", "coffee", "trà", "tiệm", "roastery", "acoustic", "rooftop"],
            "thư giãn": ["cà phê", "cafe", "trà", "spa", "nghỉ dưỡng", "khoáng nóng", "rooftop"],
            "cafe": ["cà phê", "cafe", "coffee", "trà", "rooftop"],
            "chợ đêm": ["chợ đêm", "phố đi bộ", "đêm", "phố ẩm thực", "chợ", "vĩnh khánh", "hồ thị kỷ", "bến thành", "bùi viện"],
            "phố đi bộ": ["phố đi bộ", "chợ đêm", "nguyễn huệ", "bùi viện", "đêm", "quảng trường", "dạo phố"],
            "nightlife": ["chợ đêm", "phố đi bộ", "đêm", "phố ẩm thực", "du thuyền"],
            "trekking": ["trekking", "leo núi", "khám phá", "hang", "động", "đèo", "thác", "mạo hiểm", "địa đạo", "rừng"],
            "khám phá": ["khám phá", "địa đạo", "rừng", "hang", "động", "biệt động", "núi", "đảo"],
            "adventure": ["trekking", "leo núi", "khám phá", "địa đạo", "rừng", "hang", "động"],
            "khoáng nóng": ["khoáng nóng", "suối khoáng", "spa", "massage", "bùn khoáng", "thư giãn", "nghỉ dưỡng"],
            "spa": ["spa", "khoáng nóng", "suối khoáng", "massage", "nghỉ dưỡng"],
            "wellness": ["khoáng nóng", "suối khoáng", "spa", "nghỉ dưỡng"],
            "làng nghề": ["làng nghề", "mua sắm", "chợ", "thủ công", "gốm", "lụa", "truyền thống", "đặc sản", "bình tây", "bến thành"],
            "mua sắm": ["mua sắm", "chợ", "trung tâm thương mại", "đặc sản", "làng nghề", "bến thành", "bình tây"],
            "crafts": ["làng nghề", "mua sắm", "chợ", "thủ công", "truyền thống"],
        }

        import config
        combined_text = f"{norm_name} {norm_cat} {norm_desc}"
        matched_any_interest = False
        prio_list = [str(p).lower().strip() for p in (getattr(constraints, "priority_interests", None) or []) if str(p).strip()]
        all_interests = list(constraints.interests or [])
        for p in prio_list:
            if not any(p == i.lower().strip() for i in all_interests):
                all_interests.insert(0, p)

        for idx, interest in enumerate(all_interests):
            norm_int = interest.lower().strip()
            is_explicit_prio = (norm_int in prio_list) if prio_list else (idx < 3)
            priority_weight = (
                config.RANKING_WEIGHTS["priority_interest_match"]
                if is_explicit_prio
                else config.RANKING_WEIGHTS["secondary_interest_match"]
            )

            # Kiểm tra khớp trực tiếp hoặc qua từ điển mở rộng
            expanded_keywords = [norm_int]
            for key_phrase, kw_list in INTEREST_KEYWORD_MAP.items():
                if key_phrase in norm_int:
                    expanded_keywords.extend(kw_list)

            # Tách thêm các cụm từ con qua dấu '&' hoặc ','
            for sub_part in norm_int.replace("&", ",").split(","):
                sp = sub_part.strip()
                if len(sp) >= 3:
                    expanded_keywords.append(sp)

            if any(kw in combined_text for kw in set(expanded_keywords)):
                score += priority_weight
                matched_any_interest = True
                # Extra primary match bonus when keyword matches name/category directly (e.g. actual beach for 'biển')
                if "biển" in norm_int and any(bk in f"{norm_name} {norm_cat}" for bk in ["bãi biển", "biển ", "bãi tắm", "bãi sao", "bãi khem", "bãi dài", "mỹ khê", "non nước", "an bàng", "kỳ co"]):
                    score += 40.0
                elif "ẩm thực" in norm_int and any(fk in f"{norm_name} {norm_cat}" for fk in ["ẩm thực", "ăn uống", "nhà hàng", "quán", "bún", "phở", "mì", "cơm", "bánh", "chè", "hải sản"]):
                    score += 35.0 if is_explicit_prio else 25.0
                elif any(ck in norm_int for ck in ["cà phê", "cafe", "coffee", "thư giãn"]) and any(cf in f"{norm_name} {norm_cat}" for cf in ["cà phê", "cafe", "coffee", "trà", "rooftop"]):
                    score += 45.0 if is_explicit_prio else 25.0

        if all_interests and not matched_any_interest:
            score -= 20.0

        pace_norm = config.normalize_pace(getattr(constraints, "pace", "MODERATE"))
        if pace_norm == "RELAXED":
            if dest.walking_load == "LIGHT" or any(k in combined_text for k in ["cà phê", "cafe", "trà", "nghỉ dưỡng", "spa", "khoáng nóng", "rooftop"]):
                score += 25.0
            elif dest.walking_load == "STRENUOUS":
                score -= 40.0
        elif pace_norm == "INTENSIVE":
            if getattr(dest, "avg_duration_min", 90) <= 120:
                score += 15.0

        # 4. Phù hợp hồ sơ đoàn và hạng ngân sách (Giai đoạn 3.2)
        if constraints.has_elderly:
            if not dest.auto_classified:
                score += 15.0
            if dest.walking_load == "LIGHT":
                score += 25.0
            elif dest.walking_load == "STRENUOUS":
                score -= 150.0
            elif dest.auto_classified and dest.walking_load != "LIGHT":
                score -= 20.0

            stairs = getattr(dest, "stairs_level", "LOW")
            if stairs in ("NONE", "LOW"):
                score += 20.0
            elif stairs == "HIGH":
                score -= 60.0

        if constraints.has_children:
            if any(k in combined_text for k in ["công viên", "thủy cung", "safari", "vinwonders", "thảo cầm viên", "biển", "giải trí", "bảo tàng", "sinh thái"]):
                score += 25.0
            if dest.walking_load == "LIGHT":
                score += 15.0
            elif dest.walking_load == "STRENUOUS":
                score -= 30.0

        travel_with_low = (constraints.travel_with or "").lower()
        is_couple = (
            "cặp đôi" in travel_with_low
            or "couple" in travel_with_low
            or (constraints.people_count == 2 and not constraints.has_elderly and not constraints.has_children)
        )
        if is_couple:
            if any(k in combined_text for k in ["hoàng hôn", "cà phê", "cafe", "rooftop", "bãi biển", "ngắm cảnh", "du thuyền", "skyview", "phố cổ", "lãng mạn"]):
                score += 18.0

        tier = (constraints.budget_tier or "standard").lower().strip()
        if tier in ("luxury", "premium"):
            if dest.price_min >= 150000 or any(k in combined_text for k in ["nhà hàng", "resort", "nghỉ dưỡng", "du thuyền", "skyview", "landmark", "spa", "khoáng nóng", "cáp treo", "nhà hát"]):
                score += 45.0
            wants_market = any("chợ" in (i or "").lower() for i in (constraints.interests or []))
            if not wants_market and ("chợ " in norm_name or norm_name.startswith("chợ")):
                score -= 65.0
        elif tier == "economy":
            if dest.price_min <= 80000:
                score += 15.0

        return score
