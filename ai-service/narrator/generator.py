import hashlib
import re
from typing import List, Dict, Any, Optional
from models.reason import ActivitySlot
from services.weather_advisor import get_region_by_province, get_weather_advisory
from data.loader import data_loader

def stable_hash_idx(keys: List[Any], length: int) -> int:
    s = ":".join(str(k) for k in keys)
    digest = hashlib.md5(s.encode("utf-8")).hexdigest()
    return int(digest[:8], 16) % length

class NarrationResult:
    def __init__(self, title: str, day_rationale: str, note: Optional[str] = None):
        self.title = title
        self.day_rationale = day_rationale
        self.note = note

    def to_dict(self) -> Dict[str, Any]:
        return {
            "title": self.title,
            "day_rationale": self.day_rationale,
            "note": self.note
        }

OPENING_VARIANTS: Dict[str, List[str]] = {
    "central": [
        "Khởi động ngày {day_num} tại vùng đất di sản {province}:",
        "Tiếp nối hành trình ngày {day_num} thảnh thơi tại {province}:",
        "Đồng hành ngày {day_num} khám phá chiều sâu văn hóa {province}:",
        "Hành trình ngày {day_num} êm đềm dọc miền duyên hải {province}:",
        "Lên đường ngày {day_num} trải nghiệm nét thanh lịch của {province}:",
        "Khép lại ngày {day_num} trọn vẹn tại dải đất {province}:"
    ],
    "north": [
        "Chào đón ngày {day_num} khám phá nét cổ kính và thiên nhiên {province}:",
        "Ngày {day_num} cảm nhận nét trầm mặc và chiều sâu lịch sử {province}:",
        "Bắt đầu ngày {day_num} tinh tươm giữa đất trời {province}:",
        "Hành trình ngày {day_num} thong dong qua từng điểm đến {province}:",
        "Tiếp tục ngày {day_num} lưu giữ những khoảnh khắc thanh bình ở {province}:",
        "Ngày {day_num} trải nghiệm nhịp sống dung dị và mộc mạc tại {province}:"
    ],
    "south": [
        "Đổ bộ phương Nam rực rỡ nắng ấm ngày {day_num} tại {province}:",
        "Khởi động ngày {day_num} tràn đầy hứng khởi tại {province}:",
        "Ngày {day_num} vi vu thảnh thơi trên miền đất {province}:",
        "Hành trình ngày {day_num} rộn rã niềm vui cùng {province}:",
        "Bắt nhịp ngày {day_num} phóng khoáng và tươi vui tại {province}:",
        "Gói trọn niềm vui ngày {day_num} nồng hậu tại {province}:"
    ],
    "highlands": [
        "Khởi đầu ngày {day_num} giữa không khí se lạnh trong lành của phố núi {province}:",
        "Tiếp nối ngày {day_num} ngập tràn sắc hoa và sương mai tại {province}:",
        "Ngày {day_num} thong thả tận hưởng nét bình yên lãng mạn tại {province}:",
        "Hành trình ngày {day_num} đón nắng vàng cao nguyên trên miền đất {province}:",
        "Chạm vào vẻ đẹp đại ngàn ngày {day_num} cùng những chặng dừng thơ mộng ở {province}:",
        "Gói trọn ký ức ngày {day_num} phố núi mộng mơ {province}:"
    ],
    "neutral": [
        "Bắt đầu ngày {day_num} với hành trình khám phá {province}:",
        "Hành trình ngày {day_num} mở ra nhiều trải nghiệm mới mẻ tại {province}:",
        "Tiếp nối ngày {day_num} với những chặng dừng chân hấp dẫn tại {province}:",
        "Khám phá ngày {day_num} thong thả và thư thái tại {province}:",
        "Ghi dấu ngày {day_num} cùng những kỷ niệm đáng nhớ ở {province}:",
        "Khép lại ngày {day_num} ấn tượng tại {province}:"
    ]
}

TIP_VARIANTS: Dict[str, List[str]] = {
    "central": [
        "Mẹo di chuyển: Cung đường hôm nay được xếp liền mạch, thong thả di chuyển không lo mệt sức.",
        "Mẹo cho đoàn: Các điểm đến cách nhau vừa phải, nghỉ ngơi hợp lý để giữ thể lực tốt nhất.",
        "Mẹo hành trình: Thứ tự ghé thăm đã tối ưu quãng đường ngắn nhất, dành trọn thời gian trải nghiệm.",
        "Mẹo nhỏ miền Trung: Chuẩn bị trang phục nhã nhặn khi vào di tích và giày đế mềm êm chân.",
        "Mẹo trải nghiệm: Các chặng được xếp thuận chiều giao thông, hoàn toàn không phải quay đầu xe.",
        "Mẹo nghỉ ngơi: Thời gian chuyển tiếp giữa các điểm có đệm nghỉ thư thả cho cả đoàn."
    ],
    "north": [
        "Mẹo dạo bước: Tuyến đường sắp xếp gọn gàng, thong thả cảm nhận từng điểm dừng chân.",
        "Mẹo cho đoàn: Các điểm bố trí liền kề, vừa vặn thời gian dạo ngắm mà không bị vội vã.",
        "Mẹo hành trình: Lộ trình tối ưu hạn chế di chuyển xa, giữ sức khỏe ổn định suốt cả ngày.",
        "Mẹo nhỏ phương Bắc: Nên đi giày mềm chống trượt và giữ ấm cơ thể khi thời tiết chuyển lạnh.",
        "Mẹo trải nghiệm: Khoảng cách ngắn giữa các chặng giúp tiết kiệm tối đa thời gian trên xe.",
        "Mẹo dặn dò: Lịch trình tuần tự thảnh thơi, giúp đoàn có nhiều thời gian ngắm cảnh."
    ],
    "south": [
        "Mẹo vi vu: Các điểm nối tiếp nhau trên cùng trục đường, di chuyển nhanh gọn và thoải mái.",
        "Mẹo cho đoàn: Quãng đường ngắn giúp cả nhà luôn tươi tắn và tràn đầy năng lượng khám phá.",
        "Mẹo hành trình: Lộ trình thông suốt tránh kẹt xe, tha hồ chụp hình kỷ niệm.",
        "Mẹo nhỏ phương Nam: Nhớ uống đủ nước và mang nón rộng vành khi dạo ngoài trời.",
        "Mẹo trải nghiệm: Di chuyển thuận tuyến giúp tiết kiệm đáng kể chi phí xe cộ.",
        "Mẹo khám phá: Nhịp độ khoan thai, thích hợp cho đoàn chụp hình lưu niệm thả ga."
    ],
    "highlands": [
        "Mẹo phố núi: Sáng sớm và tối nhiệt độ hạ nhanh, nhớ chuẩn bị áo khoác ấm và khăn quàng.",
        "Mẹo săn mây: Buổi sáng không khí se lạnh rất đẹp, khởi hành sớm để ngắm sương bảng lảng.",
        "Mẹo di chuyển: Đường đồi dốc quanh co, đoàn nên đi xe vững tay lái hoặc taxi nội đô.",
        "Mẹo trải nghiệm: Thưởng thức ly cà phê ấm giữa tiết trời se lạnh sẽ mang lại cảm giác cực kỳ thư thái.",
        "Mẹo hành trình: Các điểm check-in ven hồ và đồi thông xếp liền tuyến, tiết kiệm tối đa thời gian.",
        "Mẹo trang phục: Chuẩn bị áo ấm và giày đế bám tốt khi dạo quanh đồi dốc và vườn hoa."
    ],
    "neutral": [
        "Mẹo hành trình: Các điểm được phân bổ hợp lý, đảm bảo nhịp điệu chuyến đi thảnh thơi.",
        "Mẹo di chuyển: Tuyến đường tối ưu giúp tiết kiệm năng lượng và chi phí đi lại.",
        "Mẹo cho đoàn: Khởi hành đúng giờ để tận hưởng trọn vẹn từng khoảnh khắc tham quan.",
        "Mẹo chuẩn bị: Mang theo nước uống và giày đi bộ thoải mái cho cả hành trình.",
        "Mẹo trải nghiệm: Hãy dành thời gian ghi lại những khung hình đẹp tại mỗi điểm dừng chân.",
        "Mẹo dặn dò: Nghỉ ngơi đủ giấc giữa các buổi để luôn dồi dào năng lượng khám phá."
    ]
}

def verify_narration(text: str, plan_or_activities: Any) -> bool:
    """
    Verifies that all proper place names mentioned in text actually exist in the plan.
    Detects hallucinated or ungrounded destination names.
    """
    if not text or not str(text).strip():
        return False

    activities: List[ActivitySlot] = []
    if hasattr(plan_or_activities, "days"):
        for day in plan_or_activities.days:
            activities.extend(day.activities)
    elif isinstance(plan_or_activities, list):
        activities = plan_or_activities
    elif isinstance(plan_or_activities, dict) and "activities" in plan_or_activities:
        activities = plan_or_activities["activities"]

    valid_names = [a.destination_name for a in activities]
    valid_lower = [name.lower() for name in valid_names]

    # Check for known banned / hallucinated food tokens unless part of a real destination name
    banned_tokens = ["hai đầu da", "bún quậy", "cơm hến", "bún bò", "cầu rồng", "cà phê trứng", "mè xửng"]
    text_lower = text.lower()
    for token in banned_tokens:
        if token in text_lower:
            # Only allowed if it is a literal substring of an actual destination name in the plan
            if not any(token in vn for vn in valid_lower):
                return False

    # Expanded verification: any specific landmark name from the entire destination database
    # that is mentioned in the rationale MUST belong to this day's planned activities
    for dest in data_loader.destinations:
        d_name_low = dest.name.lower().strip()
        # Check specific multi-word proper landmark names (length >= 7)
        if len(d_name_low) >= 7 and d_name_low in text_lower:
            if not any(d_name_low in vn or vn in d_name_low for vn in valid_lower):
                return False

    return True

class NarratorGenerator:
    @classmethod
    def generate(cls, plan_facts: Dict[str, Any]) -> NarrationResult:
        day_num = plan_facts.get("day_num", 1)
        province = plan_facts.get("province", "Việt Nam")
        day_title = plan_facts.get("day_title", f"Ngày {day_num}")
        activities = plan_facts.get("activities", [])
        safety_warnings = plan_facts.get("safety_warnings", [])
        group_code = str(plan_facts.get("group_code", "group_1"))

        rationale = cls.generate_day_rationale(day_num, province, day_title, activities, safety_warnings, group_code=group_code)

        # Fallback if verify_narration fails
        if not verify_narration(rationale, activities):
            rationale = cls._safe_fallback_rationale(day_num, province, activities, safety_warnings)

        return NarrationResult(title=day_title, day_rationale=rationale)

    @classmethod
    def _safe_fallback_rationale(
        cls,
        day_num: int,
        province: str,
        activities: List[ActivitySlot],
        safety_warnings: Optional[List[str]] = None
    ) -> str:
        parts = [f"Lịch trình ngày {day_num} tại {province}:"]
        for act in activities:
            parts.append(f"Khung giờ {act.time_slot} ({act.start_time} - {act.end_time}) tham quan {act.destination_name}.")
        if safety_warnings:
            parts.append(f"Lưu ý an toàn: {' '.join(safety_warnings)}")
        return " ".join(parts)

    @staticmethod
    def _build_slot_sentence(act: ActivitySlot, weather_temp_num: int) -> str:
        dest = data_loader.get_by_id(act.destination_id)
        indoor_outdoor = getattr(dest, "indoor_outdoor", "OUTDOOR") if dest else "OUTDOOR"
        photo_tips = getattr(dest, "photo_tips", None) if dest else None
        local_tip = getattr(dest, "local_tip", None) if dest else None

        slot_label = "Sáng"
        if act.time_slot == "NOON":
            slot_label = "Trưa"
        elif act.time_slot == "AFTERNOON":
            slot_label = "Chiều"
        elif act.time_slot in ["EVENING", "NIGHT"]:
            slot_label = "Tối"

        sentence = f"{slot_label} ({act.start_time}) ghé thăm {act.destination_name}"
        if act.travel_time_from_prev_min > 0:
            sentence += f" (di chuyển ~{act.travel_time_from_prev_min} phút)"

        details = []
        if photo_tips and str(photo_tips).strip():
            details.append(f"góc chụp ảnh: {photo_tips.strip()}")

        name_low = act.destination_name.lower()
        if indoor_outdoor == "INDOOR" and "khoáng nóng" not in name_low and "suối" not in name_low:
            details.append("không gian trong nhà")

        if local_tip and str(local_tip).strip():
            details.append(f"lưu ý: {local_tip.strip()}")

        if details:
            sentence += f", {', '.join(details)}."
        else:
            sentence += "."

        return sentence

    @classmethod
    def generate_day_rationale(
        cls,
        day_num: int,
        province: str,
        day_title: str,
        activities: List[ActivitySlot],
        safety_warnings: Optional[List[str]] = None,
        group_code: str = "default_group",
        month: int = 11
    ) -> str:
        if not activities:
            return f"Ngày {day_num} tự do nghỉ ngơi và khám phá vẻ đẹp {province} theo nhịp điệu riêng."

        region = get_region_by_province(province)
        weather_info = get_weather_advisory(province, month=month)
        advisory_text = weather_info.get("advisory", "")
        temp_range = weather_info.get("temp_range", "24°C – 30°C")

        # Parse numeric temp
        temp_match = re.search(r"(\d+)", temp_range)
        weather_temp_num = int(temp_match.group(1)) if temp_match else 28

        openings = OPENING_VARIANTS.get(region, OPENING_VARIANTS["neutral"])
        tips = TIP_VARIANTS.get(region, TIP_VARIANTS["neutral"])

        open_idx = stable_hash_idx([province, day_num, group_code, "opening"], len(openings))
        tip_idx = stable_hash_idx([province, day_num, group_code, "tip"], len(tips))

        parts: List[str] = []

        # 1. Opening greeting
        parts.append(openings[open_idx].format(day_num=day_num, province=province))

        # 2. Per-slot activity sentences
        for act in activities:
            parts.append(cls._build_slot_sentence(act, weather_temp_num))

        # 3. Weather survival tip (consistent with scheduled activities & labeled as seasonal climate estimate)
        if advisory_text:
            has_beach_scheduled = any(
                any(k in (a.destination_name + " " + a.category).lower() for k in ["biển", "bãi tắm", "vịnh", "đảo"])
                for a in activities
            )
            if has_beach_scheduled and ("trong nhà" in advisory_text.lower() or "sóng lớn" in advisory_text.lower()):
                consistent_advisory = (
                    f"Ước lượng khí hậu theo mùa tại {province} ({temp_range}): "
                    "Thời tiết giao mùa có thể xuất hiện mưa rào hoặc gió biển theo đợt; đoàn nên theo dõi dự báo thực tế trước giờ ra biển và chuẩn bị ô/áo khoác mỏng."
                )
                parts.append(consistent_advisory)
            else:
                if "ước lượng khí hậu theo mùa" in advisory_text.lower():
                    parts.append(f"Thời tiết {province} ({temp_range}) — {advisory_text}")
                else:
                    parts.append(f"Thời tiết {province} ({temp_range}, ước lượng khí hậu theo mùa): {advisory_text}")

        # 4. Regional tip
        parts.append(tips[tip_idx])

        # 5. Safety warnings stated seriously
        if safety_warnings:
            safety_text = " ".join(safety_warnings)
            parts.append(f"Lưu ý an toàn: {safety_text}")

        rationale = " ".join(parts)

        # Fallback if verify fails
        if not verify_narration(rationale, activities):
            return cls._safe_fallback_rationale(day_num, province, activities, safety_warnings)

        return rationale

    @classmethod
    def enhance_plan_narration_with_gemini(
        cls,
        province: str,
        days: List[Any],
        constraints: Any,
    ) -> bool:
        """
        Single-shot grounded Gemini enhancement for live itineraries:
        rewrites per-day `day_rationale` and per-activity `why_visit_reason`/`tip` tailored to
        the travel group while keeping 100% of verified venues intact (`verify_narration` guardrail).
        Returns True if at least one day narration was safely upgraded.
        """
        import config
        from services.gemini_client import call_gemini_json

        if not config.get_ordered_llm_keys() or not config.LLM_BASE_URL:
            return False

        active_days = [d for d in days if getattr(d, "activities", None)]
        if not active_days:
            return False

        schedule_brief = []
        for d in active_days:
            stops = []
            for act in d.activities:
                stops.append({
                    "id": act.destination_id,
                    "name": act.destination_name,
                    "slot": act.time_slot,
                    "time": f"{act.start_time}-{act.end_time}",
                    "category": act.category,
                })
            schedule_brief.append({
                "day_number": d.day_number,
                "title": d.title,
                "stops": stops,
            })

        group_profile = (
            f"Số người: {getattr(constraints, 'people_count', 2)}, "
            f"Nhóm: {getattr(constraints, 'travel_with', 'Cặp đôi / Bạn bè')}, "
            f"Hạng: {getattr(constraints, 'budget_tier', 'standard')}, "
            f"Có người cao tuổi: {bool(getattr(constraints, 'has_elderly', False))}, "
            f"Có trẻ nhỏ: {bool(getattr(constraints, 'has_children', False))}, "
            f"Sở thích: {', '.join(getattr(constraints, 'interests', []) or ['khám phá bản địa'])}"
        )

        system_prompt = (
            "Bạn là biên tập viên du lịch VISTA AI tinh tế, am hiểu văn hóa vùng miền Việt Nam.\n"
            "Hãy viết lời dẫn lịch trình cá nhân hóa bằng tiếng Việt tự nhiên, giàu cảm hứng cho bộ điểm đến ĐÃ ĐƯỢC CHỐT bên dưới.\n"
            "QUY TẮC NGHIÊM NGẶT:\n"
            "1. KHÔNG tự bịa thêm tên địa danh, quán ăn hay hoạt động ngoài danh sách được cung cấp.\n"
            "2. Trong mỗi `day_rationale`, phải nhắc đúng tên các địa điểm trong ngày đó và lưu ý phù hợp hồ sơ đoàn.\n"
            "3. Trả về JSON thuần theo cấu trúc:\n"
            '{"days": [{"day_number": 1, "day_rationale": "...", "tips": {"<destination_id>": {"why": "...", "tip": "..."}}}]}.'
        )
        user_prompt = (
            f"Tỉnh/thành: {province}\n"
            f"Hồ sơ đoàn: {group_profile}\n"
            f"Lịch trình đã chốt: {schedule_brief}"
        )

        llm_out = call_gemini_json(
            system_prompt=system_prompt,
            user_prompt=user_prompt,
            temperature=0.45,
            max_tokens=1400,
            timeout_s=5.5,
        )
        if not llm_out or not isinstance(llm_out.get("days"), list):
            return False

        day_map = {d.day_number: d for d in active_days}
        upgraded_any = False

        for item in llm_out["days"]:
            if not isinstance(item, dict):
                continue
            try:
                d_num = int(item.get("day_number") or 0)
            except Exception:
                continue
            day_obj = day_map.get(d_num)
            if not day_obj:
                continue

            cand_rationale = str(item.get("day_rationale") or "").strip()
            if cand_rationale and len(cand_rationale) >= 30 and verify_narration(cand_rationale, day_obj.activities):
                if day_obj.departure_info and day_obj.departure_info.get("summary"):
                    cand_rationale = f"{cand_rationale} {day_obj.departure_info['summary']}".strip()
                day_obj.day_rationale = cand_rationale
                upgraded_any = True

            tips_map = item.get("tips")
            if isinstance(tips_map, dict):
                for act in day_obj.activities:
                    act_tip_obj = tips_map.get(act.destination_id)
                    if not isinstance(act_tip_obj, dict):
                        continue
                    why_txt = str(act_tip_obj.get("why") or "").strip()
                    tip_txt = str(act_tip_obj.get("tip") or "").strip()
                    if why_txt and len(why_txt) >= 12 and verify_narration(why_txt, day_obj.activities):
                        act.note = why_txt
                    if tip_txt and len(tip_txt) >= 10 and verify_narration(tip_txt, day_obj.activities):
                        act.tip = tip_txt

        return upgraded_any
