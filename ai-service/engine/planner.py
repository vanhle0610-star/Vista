import uuid
from typing import List, Dict, Any, Optional, Tuple
from datetime import datetime, date, timezone
import config
from models.destination import Destination
from models.constraints import UserConstraints
from models.plan import ItineraryPlanResponse, DaySchedule
from models.reason import ActivitySlot, ReasonEvidence
from data.loader import data_loader
from engine.filters import DestinationFilterEngine
from engine.scoring import DestinationScoringEngine
from engine.clustering import GeographicClusteringEngine
from engine.routing import DayRoutingOptimizer, STRICT_DIVERSITY_SUBTYPES, _get_broad_subtype, _share_same_core_concept, diversify_clusters_across_days
from engine.timeline import (
    DailyTimelineEngine,
    time_to_minutes,
    minutes_to_time,
    extract_open_intervals_for_day,
    get_day_weekday_and_date,
    is_food_destination,
    is_cafe_or_rest_destination,
    is_slot_suitable
)
from engine.budget import BudgetCalculatorEngine
from narrator.generator import NarratorGenerator
from verifier.checker import PlanVerifier
from api.contract import ProvinceNotSupportedError, PlanVerificationError
from services.geo_calculator import haversine_km, estimate_transit_time_minutes, prewarm_osrm_table
from services.weather_advisor import get_weather_advisory

NEIGHBOR_PROVINCES: Dict[str, List[str]] = {
    "Hà Nam": ["Ninh Bình", "Nam Định", "Hà Nội", "Hưng Yên"],
    "Ninh Bình": ["Hà Nam", "Nam Định", "Thanh Hóa"],
    "Nam Định": ["Ninh Bình", "Hà Nam", "Thái Bình"],
    "Thái Bình": ["Nam Định", "Hải Phòng", "Hưng Yên"],
    "Hưng Yên": ["Hà Nội", "Hà Nam", "Hải Dương", "Bắc Ninh"],
    "Hải Dương": ["Hải Phòng", "Quảng Ninh", "Bắc Ninh", "Hưng Yên"],
    "Bắc Ninh": ["Hà Nội", "Bắc Giang", "Hưng Yên"],
    "Bắc Giang": ["Bắc Ninh", "Lạng Sơn", "Thái Nguyên"],
    "Vĩnh Phúc": ["Hà Nội", "Phú Thọ", "Thái Nguyên"],
    "Phú Thọ": ["Vĩnh Phúc", "Yên Bái", "Hòa Bình", "Hà Nội"],
    "Hậu Giang": ["Cần Thơ", "Sóc Trăng", "Kiên Giang"],
    "Sóc Trăng": ["Cần Thơ", "Hậu Giang", "Bạc Liêu"],
    "Bạc Liêu": ["Sóc Trăng", "Cà Mau", "Kiên Giang"],
    "Trà Vinh": ["Bến Tre", "Vĩnh Long", "Sóc Trăng"],
    "Vĩnh Long": ["Cần Thơ", "Bến Tre", "Đồng Tháp", "Trà Vinh"],
    "Bến Tre": ["Tiền Giang", "Vĩnh Long", "Trà Vinh"],
    "Tiền Giang": ["TP. Hồ Chí Minh", "Long An", "Bến Tre", "Đồng Tháp"],
    "Long An": ["TP. Hồ Chí Minh", "Tiền Giang", "Tây Ninh"],
    "Bình Dương": ["TP. Hồ Chí Minh", "Đồng Nai", "Tây Ninh", "Bình Phước"],
    "Bình Phước": ["Bình Dương", "Tây Ninh", "Đồng Nai", "Đắk Nông"],
    "Tây Ninh": ["TP. Hồ Chí Minh", "Bình Dương", "Long An"],
    "Đồng Nai": ["TP. Hồ Chí Minh", "Bà Rịa - Vũng Tàu", "Bình Dương", "Lâm Đồng"],
    "Quảng Trị": ["Thừa Thiên Huế", "Quảng Bình"],
    "Hà Tĩnh": ["Nghệ An", "Quảng Bình"],
    "Quảng Ngãi": ["Quảng Nam", "Bình Định", "Kon Tum"],
}


def _get_neighbor_suggestions(province: str) -> List[str]:
    if province in NEIGHBOR_PROVINCES:
        return NEIGHBOR_PROVINCES[province]
    return ["Hà Nội", "Đà Nẵng", "TP. Hồ Chí Minh"]


def _build_dynamic_day_title(
    day_num: int,
    activities: List[ActivitySlot],
    display_loc: str,
    day_status: str = "ACTIVE",
    day_theme: Optional[str] = None
) -> str:
    if not activities:
        if day_status == "DEPARTURE_ONLY":
            return f"Ngày {day_num} · Khởi hành rời {display_loc}"
        return f"Ngày {day_num} · Thời gian tự do tại {display_loc}"
    names = [a.destination_name for a in activities[:3] if a.destination_name]
    if names:
        if day_theme:
            return f"Ngày {day_num} · {day_theme}: {' – '.join(names)}"
        return f"Ngày {day_num} · {' – '.join(names)}"
    return f"Ngày {day_num} · {day_theme or f'Khám phá {display_loc}'}"


def _semantic_rerank_candidates(
    candidates: List[Destination],
    constraints: UserConstraints,
    province: str
) -> Tuple[List[Destination], Dict[str, str]]:
    """
    Uses Gemini to semantically re-rank top-25 already-verified candidates based on nuanced
    user notes, interests, and group profile, returning personalized 'why' explanations.
    Always falls back cleanly to original candidate order on timeout/error.
    """
    why_map: Dict[str, str] = {}
    if not candidates or not getattr(constraints, "enable_llm_rerank", False):
        return candidates, why_map
    if not config.get_ordered_llm_keys():
        return candidates, why_map

    try:
        from services.gemini_client import call_gemini_json
        head = candidates[:25]
        tail = candidates[25:]
        cand_lines = [
            f"- id={d.id} | {d.name} | {d.category} | {d.indoor_outdoor} | ~{getattr(d, 'price_min', 0)}d"
            for d in head
        ]
        interests_str = ", ".join((getattr(constraints, "priority_interests", None) or []) + (constraints.interests or [])) or "Khám phá tổng hợp"
        notes_str = getattr(constraints, "custom_notes", None) or "Không có ghi chú thêm"
        group_str = f"{constraints.people_count} người ({constraints.travel_with or 'Du khách'})"
        if constraints.has_elderly:
            group_str += ", có người cao tuổi"
        if constraints.has_children:
            group_str += ", có trẻ em"

        system_prompt = (
            "Bạn là chuyên gia thiết kế tour tại Việt Nam. Hãy chấm lại thứ tự ưu tiên các địa điểm ĐÃ ĐƯỢC LỌC SẴN "
            "để khớp nhất với sở thích và ghi chú tinh tế của khách. "
            "Chỉ trả về JSON hợp lệ dạng: {\"items\": [{\"id\": \"...\", \"boost\": 15, \"why\": \"...\"}]}. "
            "Trong đó boost là số nguyên từ -20 đến 30, why tối đa 18 từ tiếng Việt tự nhiên, không bịa đặt tiện ích không có trong tên/loại hình."
        )
        user_prompt = (
            f"Điểm đến: {province} | Nhóm: {group_str} | Ngân sách: {constraints.budget_tier}\n"
            f"Sở thích: {interests_str}\nGhi chú riêng: {notes_str}\n"
            f"Danh sách ứng viên:\n" + "\n".join(cand_lines)
        )
        parsed = call_gemini_json(system_prompt, user_prompt, temperature=0.15, max_tokens=850, timeout_s=3.2)
        if not parsed or not isinstance(parsed.get("items"), list):
            return candidates, why_map

        boost_map: Dict[str, float] = {}
        for item in parsed["items"]:
            if not isinstance(item, dict):
                continue
            cid = str(item.get("id") or "").strip()
            if not cid:
                continue
            try:
                boost = max(-20.0, min(30.0, float(item.get("boost", 0))))
            except Exception:
                boost = 0.0
            boost_map[cid] = boost
            why_txt = str(item.get("why") or "").strip()
            if why_txt:
                why_map[cid] = why_txt

        if not boost_map:
            return candidates, why_map

        reordered_head = sorted(
            enumerate(head),
            key=lambda pair: (len(head) - pair[0]) + boost_map.get(pair[1].id, 0.0),
            reverse=True
        )
        return [d for _, d in reordered_head] + tail, why_map
    except Exception:
        return candidates, why_map


def _resolve_day_display_location(province: str, activities: List[ActivitySlot], sub_destination: str = None) -> str:
    if sub_destination and str(sub_destination).strip():
        return str(sub_destination).strip()
    if activities:
        sub_regions = set()
        for act in activities:
            db_d = data_loader.get_by_id(act.destination_id)
            if db_d and getattr(db_d, "sub_region", ""):
                sub_regions.add(db_d.sub_region)
        if len(sub_regions) == 1:
            only_sub = next(iter(sub_regions))
            if only_sub in ("Phú Quốc", "Hội An", "Đà Lạt", "Sa Pa"):
                return only_sub
    return province


def are_near_duplicates(d1: Destination, d2: Destination) -> bool:
    if d1.id == d2.id:
        return True
    n1 = d1.name.lower().strip()
    n2 = d2.name.lower().strip()
    for landmark_kw in ["landmark 81", "địa đạo củ chi", "chợ bến thành", "bà nà", "fansipan", "sông hương", "nhà thờ đức bà"]:
        if landmark_kw in n1 and landmark_kw in n2:
            return True
    if n1 in n2 or n2 in n1:
        dist = haversine_km(d1.latitude, d1.longitude, d2.latitude, d2.longitude)
        if dist < 0.8:
            return True
    return False


def build_source_signal_entry(
    source_code: str,
    stage_label: str = "Lịch ban đầu",
    fallback_reason: Optional[str] = None,
    model_roles: Optional[List[str]] = None
) -> Dict[str, Any]:
    """
    Constructs a single source signal entry according to Section 9.1:
    - ALGORITHM -> gray ("Thuật toán")
    - MODEL_ASSISTED -> blue ("Có mô hình hỗ trợ")
    - FALLBACK_TO_ALGORITHM -> orange ("Chuyển sang thuật toán")
    - UNRECORDED -> gray ("Chưa ghi nhận nguồn")
    Never includes API keys or secret tokens.
    """
    mapping = {
        "ALGORITHM": ("Thuật toán", "gray"),
        "MODEL_ASSISTED": ("Có mô hình hỗ trợ", "blue"),
        "FALLBACK_TO_ALGORITHM": ("Chuyển sang thuật toán", "orange"),
        "UNRECORDED": ("Chưa ghi nhận nguồn", "gray"),
    }
    norm_code = source_code if source_code in mapping else "UNRECORDED"
    label, color = mapping[norm_code]
    return {
        "stage_label": stage_label,
        "source_code": norm_code,
        "label": label,
        "color": color,
        "run_id": f"run-{uuid.uuid4().hex[:10]}",
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "fallback_reason": fallback_reason if norm_code == "FALLBACK_TO_ALGORITHM" else None,
        "model_roles": list(model_roles or []),
    }


def resolve_plan_source_diagnostics(
    existing_diagnostics: Optional[Dict[str, Any]] = None
) -> Dict[str, Any]:
    """
    Resolves or normalizes plan source diagnostics (including legacy plans without recorded source).
    """
    if not existing_diagnostics or not isinstance(existing_diagnostics, dict):
        unrec = build_source_signal_entry("UNRECORDED", stage_label="Lịch ban đầu")
        return {
            "current_source": unrec,
            "initial_plan_source": unrec,
            "last_replan_source": None,
        }
    return existing_diagnostics


class VistaMasterPlanner:
    @classmethod
    def _validate_locked_items_and_find_conflicts(
        cls,
        constraints: UserConstraints,
        all_dests: List[Destination]
    ) -> List[Dict[str, Any]]:
        """
        Checks locked items for hard conflicts:
        - Overlapping locked items on the same day
        - Insufficient travel time between consecutive locked items
        - Locked item outside venue's opening hours
        - Locked item violating final-day departure time
        """
        conflicts: List[Dict[str, Any]] = []
        raw_locked = getattr(constraints, "locked_items", None) or []
        if not raw_locked:
            return conflicts

        by_day: Dict[int, List[Dict[str, Any]]] = {}
        for li in raw_locked:
            d_num = int(li.get("day_number", 1) or 1)
            by_day.setdefault(d_num, []).append(li)

        transport_mode = getattr(constraints, "transport_mode", "car") or "car"

        for d_num, items in by_day.items():
            weekday_key, date_str = get_day_weekday_and_date(getattr(constraints, "start_date", None), d_num)
            sorted_items = sorted(items, key=lambda x: time_to_minutes(x.get("start_time", "12:00")))
            prev_end = None
            prev_dest = None
            prev_name = None

            for li in sorted_items:
                l_start = time_to_minutes(li.get("start_time", "12:00"))
                l_end = time_to_minutes(li["end_time"]) if li.get("end_time") else (l_start + int(li.get("duration_min", 60) or 60))
                l_id = str(li.get("destination_id") or li.get("id") or "")
                l_name = str(li.get("destination_name") or li.get("name") or l_id)

                matched_d = next(
                    (d for d in all_dests if d.id == l_id or d.name.strip().lower() == l_name.strip().lower()),
                    None
                )
                if matched_d is None and l_id:
                    matched_d = data_loader.get_by_id(l_id)

                # Check opening hours if matched_d has explicit opening_hours
                if matched_d and matched_d.opening_hours:
                    intervals, h_status = extract_open_intervals_for_day(matched_d, weekday_key, date_str)
                    if h_status == "CLOSED" or not any(l_start >= o - 1 and l_end <= c + 1 for o, c in intervals):
                        conflicts.append({
                            "type": "HARD_CONFLICT",
                            "code": "LOCKED_ITEM_OUTSIDE_OPENING_HOURS",
                            "item_name": matched_d.name,
                            "destination_id": matched_d.id,
                            "day_number": d_num,
                            "violated_constraint": "OPENING_HOURS",
                            "message": f"Mục đã khóa '{matched_d.name}' ({minutes_to_time(l_start)}–{minutes_to_time(l_end)}) nằm ngoài khung giờ mở cửa của địa điểm vào Ngày {d_num}.",
                            "suggested_resolutions": [
                                f"Đổi giờ của '{matched_d.name}' vào khung giờ mở cửa hợp lệ.",
                                f"Chuyển '{matched_d.name}' sang ngày khác trong chuyến đi.",
                            ],
                            "is_search_limit": False
                        })

                # Check overlap / travel time from previous locked item
                if prev_end is not None:
                    travel_between = 0
                    if prev_dest and matched_d:
                        travel_between = estimate_transit_time_minutes(
                            prev_dest.latitude, prev_dest.longitude,
                            matched_d.latitude, matched_d.longitude,
                            getattr(prev_dest, "cluster_id", None), getattr(matched_d, "cluster_id", None),
                            transport_mode=transport_mode
                        )
                    if l_start < prev_end:
                        conflicts.append({
                            "type": "HARD_CONFLICT",
                            "code": "LOCKED_ITEMS_OVERLAP",
                            "item_name": l_name,
                            "destination_id": l_id,
                            "day_number": d_num,
                            "violated_constraint": "NO_TIME_OVERLAP",
                            "message": f"Hai lịch hẹn đã khóa '{prev_name}' và '{l_name}' bị chồng chéo thời gian vào Ngày {d_num}.",
                            "suggested_resolutions": [
                                f"Dời giờ của '{l_name}' sang sau {minutes_to_time(prev_end + travel_between)}.",
                                "Bỏ khóa một trong hai mục để hệ thống tự sắp xếp.",
                            ],
                            "is_search_limit": False
                        })
                    elif l_start < prev_end + travel_between:
                        conflicts.append({
                            "type": "HARD_CONFLICT",
                            "code": "INSUFFICIENT_TRAVEL_BETWEEN_LOCKED",
                            "item_name": l_name,
                            "destination_id": l_id,
                            "day_number": d_num,
                            "violated_constraint": "TRAVEL_TIME_FEASIBILITY",
                            "message": f"Không đủ thời gian di chuyển ({travel_between} phút) từ '{prev_name}' (kết thúc {minutes_to_time(prev_end)}) đến '{l_name}' (bắt đầu {minutes_to_time(l_start)}).",
                            "suggested_resolutions": [
                                f"Dời '{l_name}' sang muộn nhất lúc {minutes_to_time(prev_end + travel_between)}.",
                                f"Rút ngắn thời lượng tại '{prev_name}'.",
                            ],
                            "is_search_limit": False
                        })

                # Check final-day departure conflict
                if d_num == constraints.total_days and constraints.departure_time:
                    dep_info = DailyTimelineEngine.compute_departure_window(d_num, constraints, last_dest=matched_d)
                    if l_end > dep_info["latest_activity_end_min"]:
                        conflicts.append({
                            "type": "HARD_CONFLICT",
                            "code": "LOCKED_ITEM_VIOLATES_DEPARTURE",
                            "item_name": l_name,
                            "destination_id": l_id,
                            "day_number": d_num,
                            "violated_constraint": "DEPARTURE_DEADLINE",
                            "message": (
                                f"Mục đã khóa '{l_name}' kết thúc lúc {minutes_to_time(l_end)}, trễ hơn mốc muộn nhất "
                                f"{dep_info['latest_activity_end_time']} để kịp giờ rời đi ({constraints.departure_time})."
                            ),
                            "suggested_resolutions": [
                                f"Dời '{l_name}' lên sớm hơn (kết thúc trước {dep_info['latest_activity_end_time']}).",
                                f"Chuyển '{l_name}' sang ngày trước đó.",
                            ],
                            "is_search_limit": False
                        })

                prev_end = l_end
                prev_dest = matched_d
                prev_name = l_name

        return conflicts

    @classmethod
    def generate_plan(cls, constraints: UserConstraints) -> ItineraryPlanResponse:
        raw_province = constraints.destination_province
        if not raw_province or not str(raw_province).strip():
            raise ProvinceNotSupportedError("")

        raw_norm = str(raw_province).strip().lower()
        if not getattr(constraints, "sub_destination", None):
            for sub_alias, sub_label in [
                ("phú quốc", "Phú Quốc"), ("phu quoc", "Phú Quốc"), ("đảo ngọc", "Phú Quốc"),
                ("hội an", "Hội An"), ("hoi an", "Hội An"),
                ("đà lạt", "Đà Lạt"), ("da lat", "Đà Lạt"),
                ("sa pa", "Sa Pa"), ("sapa", "Sa Pa"),
            ]:
                if sub_alias in raw_norm:
                    constraints.sub_destination = sub_label
                    break

        canonical_prov = data_loader.get_canonical_province_name(raw_province)
        if not canonical_prov:
            raise ProvinceNotSupportedError(raw_province)

        province = canonical_prov
        constraints.destination_province = canonical_prov
        constraints.pace = config.normalize_pace(getattr(constraints, "pace", "MODERATE"))
        pace_policy = config.PACE_POLICIES.get(constraints.pace, config.PACE_POLICIES["MODERATE"])

        requested_days = max(1, min(7, constraints.total_days))
        total_days = requested_days

        # Check model-assisted scheduling vs algorithm source signal (Section 9.1)
        scheduler_mode = str(getattr(constraints, "scheduler_mode", "") or "").strip().lower()
        source_code = "ALGORITHM"
        fallback_reason = None
        model_roles: List[str] = []

        if scheduler_mode in ("model_assisted", "model", "model_assisted_verified_mock"):
            has_key = bool(config.LLM_API_KEY and str(config.LLM_API_KEY).strip())
            if not has_key and scheduler_mode != "model_assisted_verified_mock":
                source_code = "FALLBACK_TO_ALGORITHM"
                fallback_reason = "Chưa cấu hình khóa kết nối mô hình (LLM_API_KEY) nên chuyển sang thuật toán nội bộ."
                model_roles = ["scheduling_attempted"]
            else:
                source_code = "MODEL_ASSISTED"
                model_roles = ["scheduling"]
        elif scheduler_mode == "model_timeout":
            source_code = "FALLBACK_TO_ALGORITHM"
            fallback_reason = "Mô hình phản hồi quá thời gian nên chuyển sang thuật toán nội bộ."
            model_roles = ["scheduling_attempted"]
        elif scheduler_mode == "model_invalid_proposal":
            source_code = "FALLBACK_TO_ALGORITHM"
            fallback_reason = "Đề xuất lịch của mô hình vi phạm giờ mở cửa hoặc ràng buộc di chuyển nên bị bộ kiểm tra từ chối."
            model_roles = ["scheduling_attempted"]
        elif scheduler_mode == "intent_or_narration_only":
            # Section 9.1 rule: If model only parsed prompt or wrote descriptions, source is STILL gray ALGORITHM!
            source_code = "ALGORITHM"
            model_roles = ["intent_parsing", "narration"]

        # Adjust budget_tier if max_total_budget_vnd is tight
        max_budget = getattr(constraints, "max_total_budget_vnd", None)
        if max_budget and max_budget > 0:
            per_person_per_day = max_budget / max(1, constraints.people_count * total_days)
            if per_person_per_day < 750000 and constraints.budget_tier == "standard":
                constraints.budget_tier = "economy"
            elif per_person_per_day >= 1800000 and constraints.budget_tier == "standard":
                constraints.budget_tier = "luxury"

        # 1. Retrieval
        all_dests = data_loader.get_by_province(province)
        if not all_dests:
            raise ProvinceNotSupportedError(province)

        # Check locked item conflicts upfront
        plan_conflicts: List[Dict[str, Any]] = cls._validate_locked_items_and_find_conflicts(constraints, all_dests)

        travel_month = date.today().month
        if constraints.start_date:
            try:
                dt = datetime.strptime(str(constraints.start_date)[:10], "%Y-%m-%d")
                travel_month = dt.month
            except Exception:
                travel_month = date.today().month

        # 2. Hard Filters
        filtered_dests, rejected = DestinationFilterEngine.apply_filters(
            all_dests,
            province=province,
            month=travel_month,
            has_elderly=constraints.has_elderly,
            has_children=constraints.has_children,
            budget_tier=constraints.budget_tier,
            must_avoid=constraints.must_avoid,
            interests=constraints.interests,
            sub_destination=getattr(constraints, "sub_destination", None)
        )

        # Ensure must-visit destinations are retained if they belong to the province and don't violate hard safety
        must_visit_tokens = [
            str(x).lower().strip()
            for x in (getattr(constraints, "must_visit_ids", []) or []) + (getattr(constraints, "must_include", []) or [])
            if str(x).strip()
        ]
        must_visit_dests: List[Destination] = []
        for mv_tok in must_visit_tokens:
            matched_mv = next(
                (d for d in all_dests if d.id.lower() == mv_tok or mv_tok in d.name.lower()),
                None
            )
            if matched_mv:
                if matched_mv not in must_visit_dests:
                    must_visit_dests.append(matched_mv)
                if matched_mv not in filtered_dests:
                    if not (constraints.has_elderly and matched_mv.walking_load == "STRENUOUS"):
                        filtered_dests.insert(0, matched_mv)
            else:
                plan_conflicts.append({
                    "type": "HARD_CONFLICT",
                    "code": "MUST_VISIT_NOT_FOUND",
                    "item_name": mv_tok,
                    "day_number": None,
                    "violated_constraint": "DATABASE_GROUNDING",
                    "message": f"Điểm bắt buộc '{mv_tok}' không tồn tại trong dữ liệu của {province}.",
                    "suggested_resolutions": ["Kiểm tra lại tên hoặc mã địa điểm trong tỉnh/thành đã chọn."],
                    "is_search_limit": False
                })

        plan_warnings: List[str] = list(getattr(constraints, "initial_warnings", []) or [])
        assumptions: List[str] = []
        if getattr(data_loader, "dataset_source_type", "") == "FIXTURE_CSV":
            assumptions.append("Đang chạy trên dữ liệu mẫu thử nghiệm (seed_fixture.csv).")

        if len(filtered_dests) == 0:
            reasons = [r[1].description for r in rejected]
            raise PlanVerificationError(
                f"Không có địa điểm nào tại {province} thỏa mãn các điều kiện an toàn & ngân sách.",
                errors=reasons
            )

        # 3. Scoring
        scored_dests = sorted(
            filtered_dests,
            key=lambda d: max(
                DestinationScoringEngine.calculate_score(d, constraints, s)
                for s in ("MORNING", "NOON", "AFTERNOON", "EVENING")
            ),
            reverse=True
        )

        deduped_scored: List[Destination] = []
        for d in scored_dests:
            if d in must_visit_dests or not any(are_near_duplicates(d, existing) for existing in deduped_scored):
                deduped_scored.append(d)

        deduped_scored, semantic_why_map = _semantic_rerank_candidates(deduped_scored, constraints, province)
        filtered_dests = deduped_scored
        num_available = len(filtered_dests)

        # Mục 7 & Mục 10 (#12): GIỮ ĐỦ SỐ NGÀY KHÁCH CHỌN (total_days = requested_days), KHÔNG tự xóa ngày trống!
        if num_available < total_days:
            neighbors = _get_neighbor_suggestions(province)
            short_warn = (
                f"Tỉnh {province} hiện chỉ có {num_available} điểm phù hợp trong dữ liệu cho chuyến đi {total_days} ngày; "
                f"các ngày chưa có điểm tham quan được đánh dấu là 'Thời gian tự do / Chưa có điểm phù hợp'. "
                f"Gợi ý: Bạn có thể kết hợp khám phá thêm tỉnh lân cận ({', '.join(neighbors[:3])})."
            )
            plan_warnings.append(short_warn)

        ideal_stops = pace_policy["max_stops_per_day"]
        if num_available < total_days * ideal_stops:
            stops_per_day = max(1, num_available // max(1, min(total_days, num_available)))
            extra_remainder = num_available % max(1, min(total_days, num_available))
            conds = []
            if constraints.has_elderly:
                conds.append("người lớn tuổi")
            if constraints.has_children:
                conds.append("trẻ em")
            if constraints.budget_tier == "economy":
                conds.append("ngân sách tiết kiệm")
            cond_label = f" cho {', '.join(conds)}" if conds else ""
            plan_warnings.append(
                f"Chỉ có {num_available} điểm phù hợp{cond_label} nên mỗi ngày có hoạt động xếp tối đa {stops_per_day} điểm."
            )
        else:
            stops_per_day = ideal_stops
            extra_remainder = 0

        target_top_cap = min(len(deduped_scored), total_days * stops_per_day + extra_remainder + 14)
        sightseeing_bucket = [
            d for d in deduped_scored
            if not is_food_destination(d) and not is_cafe_or_rest_destination(d)
        ]
        food_bucket = [d for d in deduped_scored if is_food_destination(d)]
        cafe_bucket = [
            d for d in deduped_scored
            if is_cafe_or_rest_destination(d) and not is_food_destination(d)
        ]

        top_n: List[Destination] = []
        seen_top_ids = set()

        def _append_from_bucket(bucket: List[Destination], quota: int):
            added = 0
            for item in bucket:
                if added >= quota:
                    break
                if item.id not in seen_top_ids:
                    top_n.append(item)
                    seen_top_ids.add(item.id)
                    added += 1

        _append_from_bucket(sightseeing_bucket, max(total_days * 3 + 2, 9))
        _append_from_bucket(food_bucket, total_days + 3)
        _append_from_bucket(cafe_bucket, total_days)
        for item in deduped_scored:
            if len(top_n) >= target_top_cap:
                break
            if item.id not in seen_top_ids:
                top_n.append(item)
                seen_top_ids.add(item.id)

        for mvd in must_visit_dests:
            if mvd not in top_n:
                top_n.insert(0, mvd)

        if getattr(constraints, "enable_llm_rerank", False) or getattr(constraints, "enable_llm_narration", False):
            prewarm_osrm_table([(d.latitude, d.longitude) for d in top_n[:25]], timeout_sec=1.2)

        # 4. Clustering & Smart Hotel Anchor
        effective_hotel_lat = constraints.hotel_lat
        effective_hotel_lng = constraints.hotel_lng
        if effective_hotel_lat is None or effective_hotel_lng is None:
            anchor_info = GeographicClusteringEngine.resolve_default_hotel_anchor(
                top_n, has_elderly=constraints.has_elderly
            )
            if anchor_info:
                effective_hotel_lat, effective_hotel_lng, anchor_name = anchor_info
                assumptions.append(
                    f"Chưa nhập vị trí lưu trú: hệ thống tự động lấy tâm cụm trung tâm gần '{anchor_name}' ({effective_hotel_lat:.4f}, {effective_hotel_lng:.4f}) làm mốc lưu trú mặc định."
                )

        day_clusters = GeographicClusteringEngine.cluster_by_days(
            top_n,
            total_days,
            hotel_lat=effective_hotel_lat,
            hotel_lng=effective_hotel_lng,
            has_elderly=constraints.has_elderly
        )
        day_clusters = GeographicClusteringEngine.rebalance_clusters_across_days(
            day_clusters,
            start_date=getattr(constraints, "start_date", None)
        )

        # Ensure evening-only destinations are not stranded on the final day when departure is early/18:00
        if total_days >= 2 and len(day_clusters) >= 2 and constraints.departure_time:
            final_dep_win = DailyTimelineEngine.compute_departure_window(total_days, constraints)
            final_cutoff = final_dep_win["latest_activity_end_min"]
            if final_cutoff <= 18 * 60:
                wk_last, ds_last = get_day_weekday_and_date(getattr(constraints, "start_date", None), total_days)
                for idx_last, d_last in enumerate(list(day_clusters[-1])):
                    ivs_l, _ = extract_open_intervals_for_day(d_last, wk_last, ds_last)
                    earliest_o = min((o for o, _ in ivs_l), default=480)
                    if earliest_o + 45 > final_cutoff:
                        # Swap with a daytime destination from an earlier day cluster
                        swapped = False
                        for earlier_idx in range(len(day_clusters) - 2, -1, -1):
                            for idx_e, d_early in enumerate(day_clusters[earlier_idx]):
                                ivs_e, _ = extract_open_intervals_for_day(d_early, wk_last, ds_last)
                                earliest_e = min((o for o, _ in ivs_e), default=480)
                                if earliest_e + 60 <= final_cutoff:
                                    day_clusters[-1][idx_last] = d_early
                                    day_clusters[earlier_idx][idx_e] = d_last
                                    swapped = True
                                    break
                            if swapped:
                                break
                # Also order filtered_dests so evening-only stops are consumed on earlier days rather than reserved for the final day
                filtered_dests.sort(
                    key=lambda d: 0 if min((o for o, _ in extract_open_intervals_for_day(d)[0]), default=480) + 45 > final_cutoff else 1
                )

        # Mục 6 & Mục 10 (#6): Đặt các điểm must-visit chỉ mở một số ngày cụ thể vào đúng ngày hợp lệ đó trước!
        pinned_must_visit_by_day: Dict[int, List[Destination]] = {d_i + 1: [] for d_i in range(total_days)}
        for mvd in must_visit_dests:
            open_days_for_mv = []
            for d_i in range(total_days):
                d_num = d_i + 1
                wk, ds = get_day_weekday_and_date(getattr(constraints, "start_date", None), d_num)
                ivs, st_code = extract_open_intervals_for_day(mvd, wk, ds)
                if st_code != "CLOSED" and len(ivs) > 0:
                    open_days_for_mv.append(d_num)
            if len(open_days_for_mv) == 0:
                plan_conflicts.append({
                    "type": "HARD_CONFLICT",
                    "code": "MUST_VISIT_CLOSED_ALL_DAYS",
                    "item_name": mvd.name,
                    "destination_id": mvd.id,
                    "day_number": None,
                    "violated_constraint": "OPENING_HOURS",
                    "message": f"Điểm bắt buộc '{mvd.name}' đóng cửa trong toàn bộ các ngày của chuyến đi.",
                    "suggested_resolutions": [
                        f"Đổi ngày khởi hành để trùng vào ngày mở cửa của '{mvd.name}'.",
                        f"Bỏ '{mvd.name}' khỏi danh sách bắt buộc."
                    ],
                    "is_search_limit": False
                })
            elif len(open_days_for_mv) == 1:
                only_day = open_days_for_mv[0]
                pinned_must_visit_by_day[only_day].append(mvd)
                # Remove from other day_clusters so it isn't consumed on an invalid day
                for d_i in range(total_days):
                    if (d_i + 1) != only_day and d_i < len(day_clusters) and mvd in day_clusters[d_i]:
                        day_clusters[d_i].remove(mvd)
                if (only_day - 1) < len(day_clusters) and mvd not in day_clusters[only_day - 1]:
                    day_clusters[only_day - 1].insert(0, mvd)
            else:
                # Assign to the open day that currently has the fewest pinned must-visits
                best_d = min(open_days_for_mv, key=lambda dn: len(pinned_must_visit_by_day[dn]))
                pinned_must_visit_by_day[best_d].append(mvd)
                if (best_d - 1) < len(day_clusters) and mvd not in day_clusters[best_d - 1]:
                    day_clusters[best_d - 1].insert(0, mvd)

        pinned_ids = {m.id for m_list in pinned_must_visit_by_day.values() for m in m_list}
        day_clusters = diversify_clusters_across_days(day_clusters, pinned_ids=pinned_ids)
        day_clusters = GeographicClusteringEngine.balance_anchors_across_days(day_clusters, pinned_ids=pinned_ids)

        all_interests_list = (getattr(constraints, "priority_interests", []) or []) + (constraints.interests or [])
        user_interests_text = " ".join(all_interests_list).lower()
        wants_beach = any(k in user_interests_text for k in ["biển", "bãi biển", "tắm biển", "nghỉ dưỡng biển", "beach"])
        wants_food = any(k in user_interests_text for k in ["ẩm thực", "ăn uống", "món ngon", "đặc sản", "hải sản", "food"])
        wants_cafe = (constraints.pace == "RELAXED") or any(k in user_interests_text for k in ["cà phê", "cafe", "coffee", "thư giãn"])

        beach_candidates = [
            d for d in filtered_dests
            if any(k in (d.name + " " + d.category).lower() for k in ["bãi biển", "biển ", "tắm biển", "bãi tắm", "bãi sao", "bãi dài", "bãi khem", "mỹ khê", "non nước", "tiên sa", "an bàng"])
        ]
        food_candidates = [
            d for d in filtered_dests
            if is_food_destination(d) and is_slot_suitable(d, "NOON")
        ]
        cafe_candidates = [
            d for d in filtered_dests
            if any(k in (d.name + " " + d.category).lower() for k in ["cà phê", "cafe", "coffee", "trà "])
        ]

        # 5. Routing & Timeline Simulation per day
        days: List[DaySchedule] = []
        used_destination_ids = set()
        used_destinations: List[Destination] = []
        beach_days_scheduled = 0
        min_beach_days_target = min(total_days, len(beach_candidates), max(2, total_days - 1)) if (wants_beach and total_days >= 2) else (1 if wants_beach and beach_candidates else 0)

        # Reserve pinned single-day must-visit IDs so earlier days don't steal them!
        for d_idx in range(total_days):
            day_num = d_idx + 1
            reserved_for_later_days = {
                m.id
                for later_d, m_list in pinned_must_visit_by_day.items()
                if later_d > day_num
                for m in m_list
            }
            # Protect 1-2 cluster anchor stops per future day so Day 1 never starves later days or leaves only duplicate brands
            for later_idx in range(d_idx + 1, total_days):
                if later_idx < len(day_clusters):
                    for lc_item in day_clusters[later_idx][:2]:
                        if lc_item.id not in used_destination_ids:
                            reserved_for_later_days.add(lc_item.id)

            day_target_stops = min(pace_policy["max_stops_per_day"], stops_per_day + (1 if d_idx < extra_remainder else 0))
            cluster: List[Destination] = []

            # First add pinned must-visit destinations for this day
            for pmv in pinned_must_visit_by_day.get(day_num, []):
                if pmv.id not in used_destination_ids and pmv not in cluster:
                    cluster.append(pmv)

            def _conflicts_day_diversity(cand: Destination, cur_list: List[Destination]) -> bool:
                if not cur_list:
                    return False
                c_st = _get_broad_subtype(cand)
                if total_days >= 2 and c_st in STRICT_DIVERSITY_SUBTYPES:
                    if any(_get_broad_subtype(x) == c_st for x in cur_list):
                        return True
                if any(_share_same_core_concept(cand, x) for x in cur_list):
                    return True
                return False

            raw_cluster = day_clusters[d_idx] if d_idx < len(day_clusters) else (day_clusters[0] if day_clusters else [])
            for d in raw_cluster:
                if (
                    d.id not in used_destination_ids
                    and d.id not in reserved_for_later_days
                    and d not in cluster
                    and not any(are_near_duplicates(d, u) for u in used_destinations)
                    and not _conflicts_day_diversity(d, cluster)
                ):
                    cluster.append(d)

            if wants_beach and beach_days_scheduled < min_beach_days_target:
                has_beach_in_cluster = any(d in beach_candidates for d in cluster)
                if not has_beach_in_cluster:
                    avail_beaches = [
                        b for b in beach_candidates
                        if b.id not in used_destination_ids and b.id not in reserved_for_later_days
                        and not any(are_near_duplicates(b, u) for u in used_destinations)
                    ]
                    if avail_beaches:
                        cluster.insert(len(pinned_must_visit_by_day.get(day_num, [])), avail_beaches[0])

            if wants_food or day_target_stops >= 2:
                has_food_in_cluster = any(d in food_candidates for d in cluster)
                if not has_food_in_cluster:
                    avail_foods = [
                        f for f in food_candidates
                        if f.id not in used_destination_ids and f.id not in reserved_for_later_days
                        and not any(are_near_duplicates(f, u) for u in used_destinations)
                        and not _conflicts_day_diversity(f, cluster)
                    ]
                    if avail_foods:
                        cluster.append(avail_foods[0])

            if wants_cafe and cafe_candidates:
                has_cafe_in_cluster = any(d in cafe_candidates for d in cluster)
                if not has_cafe_in_cluster:
                    avail_cafes = [
                        c for c in cafe_candidates
                        if c.id not in used_destination_ids and c.id not in reserved_for_later_days
                        and not any(are_near_duplicates(c, u) for u in used_destinations)
                    ]
                    if avail_cafes:
                        cluster.append(avail_cafes[0])

            if len(cluster) < day_target_stops:
                remaining = [
                    d for d in filtered_dests
                    if d.id not in used_destination_ids and d.id not in reserved_for_later_days
                    and d not in cluster and not any(are_near_duplicates(d, u) for u in used_destinations)
                ]
                for rd in remaining:
                    if len(cluster) >= day_target_stops:
                        break
                    if not _conflicts_day_diversity(rd, cluster):
                        cluster.append(rd)
                # Gentle fallback if cluster still < 2 stops and non-park/non-cafe stops exist
                if len(cluster) < min(2, day_target_stops):
                    for rd in remaining:
                        if len(cluster) >= min(2, day_target_stops):
                            break
                        if rd not in cluster and _get_broad_subtype(rd) not in ("CAFE", "THEME_PARK"):
                            cluster.append(rd)

            remaining_pool = [
                d for d in filtered_dests
                if d.id not in used_destination_ids and d.id not in reserved_for_later_days
                and not any(are_near_duplicates(d, u) for u in used_destinations)
            ]
            # Reserve at least 1 stop per remaining day only if there are enough points
            active_remaining_days = max(0, min(total_days - (d_idx + 1), len(remaining_pool) - 1))
            future_reserved = sum(
                min(pace_policy["max_stops_per_day"], stops_per_day)
                for _ in range(active_remaining_days)
            ) if len(remaining_pool) >= total_days else 0
            day_available_pool = remaining_pool[:max(len(cluster), len(remaining_pool) - future_reserved)]
            for fc in food_candidates:
                if fc.id not in used_destination_ids and fc.id not in reserved_for_later_days and fc not in day_available_pool:
                    day_available_pool.append(fc)

            available_slots = DailyTimelineEngine.get_day_slot_names(day_num, constraints)
            day_slots = DayRoutingOptimizer.optimize_day_stops(
                day_num,
                cluster,
                constraints,
                province_pool=day_available_pool,
                max_stops=day_target_stops
            )

            if any(any(b.id == act.destination_id for b in beach_candidates) for act in day_slots):
                beach_days_scheduled += 1

            # Determine day_status, departure_info, and warnings
            dep_info = None
            if day_num == total_days and constraints.departure_time:
                last_db_d = data_loader.get_by_id(day_slots[-1].destination_id) if day_slots else None
                dep_info = DailyTimelineEngine.compute_departure_window(day_num, constraints, last_dest=last_db_d)

            day_status = "ACTIVE"
            status_reason = None
            if len(day_slots) == 0:
                if day_num == total_days and dep_info and dep_info.get("has_departure_constraint"):
                    day_status = "DEPARTURE_ONLY"
                    status_reason = (
                        f"Không xếp hoạt động tham quan do giờ khởi hành sớm ({constraints.departure_time}); "
                        f"chỉ thực hiện chặng di chuyển ra {dep_info.get('departure_point', 'sân bay/nhà ga')}."
                    )
                else:
                    day_status = "FREE_DAY"
                    status_reason = (
                        f"Thời gian tự do / Chưa có điểm phù hợp tại {province} "
                        f"(đã sử dụng hết {len(used_destination_ids)} điểm phù hợp trong dữ liệu)."
                    )

            missing_evening = ("EVENING" in available_slots and not any(act.time_slot == "EVENING" for act in day_slots))
            if len(day_slots) < len(available_slots) or missing_evening:
                reasons = []
                if day_num == 1 and constraints.arrival_time:
                    arr_min = time_to_minutes(constraints.arrival_time)
                    if arr_min >= 14 * 60:
                        reasons.append(f"khung sáng và trưa bị cắt do giờ đến ({constraints.arrival_time})")
                    elif arr_min >= 11 * 60:
                        reasons.append(f"khung sáng bị cắt do giờ đến ({constraints.arrival_time})")
                    else:
                        reasons.append(f"giờ đến trễ ({constraints.arrival_time})")

                if day_num == total_days and constraints.departure_time:
                    dep_min = time_to_minutes(constraints.departure_time)
                    if dep_min <= 13 * 60:
                        reasons.append(f"khung trưa, chiều và tối bị cắt do giờ rời đi ({constraints.departure_time})")
                    elif dep_min <= 17 * 60:
                        reasons.append(f"khung chiều và tối bị cắt do giờ rời đi ({constraints.departure_time})")
                    elif dep_min <= 20 * 60:
                        reasons.append(f"khung tối bị cắt do giờ rời đi ({constraints.departure_time})")
                    else:
                        reasons.append(f"giờ rời đi ({constraints.departure_time})")

                raw_prov = data_loader.get_by_province(province)
                elderly_rejections = [
                    d for d in raw_prov
                    if constraints.has_elderly and (d.walking_load == "STRENUOUS" or d.category in ["Mạo hiểm", "Leo núi", "Trekking"])
                ]
                if constraints.has_elderly and len(elderly_rejections) > 0 and len(day_slots) == 0:
                    reasons.append(f"đã loại trừ {len(elderly_rejections)} điểm vận động mạnh vì đoàn có người cao tuổi")
                elif len(raw_prov) < total_days * 4:
                    reasons.append(f"số lượng điểm đến tại địa phương còn ít ({len(raw_prov)} điểm trong cơ sở dữ liệu)")

                if not reasons:
                    missing_slots = [s for s in available_slots if not any(act.time_slot == s for act in day_slots)]
                    reasons.append(f"thiếu điểm mở cửa hoặc thỏa mãn trần di chuyển cho khung {'/'.join(missing_slots) if missing_slots else 'còn lại'}")
                reason_str = " và ".join(reasons)
                warning_msg = f"Ngày {day_num} chỉ xếp được {len(day_slots)} điểm vì {reason_str}."
                if warning_msg not in plan_warnings:
                    plan_warnings.append(warning_msg)

            day_db_dests = []
            for act in day_slots:
                used_destination_ids.add(act.destination_id)
                db_d = data_loader.get_by_id(act.destination_id)
                if db_d:
                    used_destinations.append(db_d)
                    day_db_dests.append(db_d)
                if act.destination_id in semantic_why_map:
                    why_desc = semantic_why_map[act.destination_id]
                    if not any(getattr(r, "code", "") == "AI_PERSONALIZED_FIT" for r in (act.reasons or [])):
                        act.reasons.insert(0, ReasonEvidence(
                            code="AI_PERSONALIZED_FIT",
                            title="Phù hợp gu trải nghiệm",
                            description=why_desc,
                            metric_facts={"source": "gemini_rerank"}
                        ))

            if "NOON" in available_slots and len(day_slots) > 0 and not any(act.time_slot == "NOON" or getattr(act, "item_type", "") in ("MEAL", "MEAL_BREAK") for act in day_slots):
                noon_warn = f"Ngày {day_num} không có điểm ẩm thực phù hợp trong dữ liệu; khung giờ trưa (NOON) được để trống để du khách tự túc dùng bữa."
                if noon_warn not in plan_warnings:
                    plan_warnings.append(noon_warn)

            display_loc = _resolve_day_display_location(province, day_slots, getattr(constraints, "sub_destination", None))
            day_theme = GeographicClusteringEngine.infer_day_theme(day_db_dests, day_num) if day_slots else None
            day_title = _build_dynamic_day_title(day_num, day_slots, display_loc, day_status=day_status, day_theme=day_theme)

            days.append(DaySchedule(
                day_number=day_num,
                date_label=f"Ngày {day_num}",
                title=day_title,
                day_rationale=status_reason or "",
                activities=day_slots,
                subtotal_cost_vnd=0,
                day_status=day_status,
                status_reason=status_reason,
                departure_info=dep_info
            ))

        # Check if any must-visit destination failed to be scheduled across the trip
        for mvd in must_visit_dests:
            if mvd.id not in used_destination_ids and not any(c.get("destination_id") == mvd.id for c in plan_conflicts):
                plan_conflicts.append({
                    "type": "HARD_CONFLICT",
                    "code": "MUST_VISIT_INFEASIBLE_IN_TIMELINE",
                    "item_name": mvd.name,
                    "destination_id": mvd.id,
                    "day_number": None,
                    "violated_constraint": "TIMELINE_OR_TRANSIT_CONFLICT",
                    "message": f"Không thể xếp điểm bắt buộc '{mvd.name}' vào lịch trình do xung đột giờ mở cửa, giờ khởi hành hoặc vượt trần di chuyển với các mục đã khóa.",
                    "suggested_resolutions": [
                        f"Nới lỏng giờ khởi hành hoặc mở khóa lịch hẹn cố định trong ngày dự kiến đi '{mvd.name}'.",
                        "Tăng số ngày chuyến đi hoặc giảm số điểm bắt buộc."
                    ],
                    "is_search_limit": False
                })

        total_dest_count = len(data_loader.destinations)
        data_ver = f"{total_dest_count}-curated-{datetime.now().strftime('%Y.%m')}"

        sched_status = "FEASIBLE"
        if plan_conflicts:
            any_scheduled = any(len(d.activities) > 0 for d in days)
            sched_status = "PARTIAL_CONFLICT" if any_scheduled else "INFEASIBLE_CONFLICT"

        plan = ItineraryPlanResponse(
            destination_province=province,
            total_days=total_days,
            people_count=constraints.people_count,
            budget_tier=constraints.budget_tier,
            estimated_total_cost_vnd=0,
            min_fluctuation_vnd=0,
            max_fluctuation_vnd=0,
            days=days,
            engine_version="v2.0-deterministic",
            data_version=data_ver,
            fallback_used=(source_code == "FALLBACK_TO_ALGORITHM"),
            warnings=plan_warnings,
            pace=constraints.pace,
            schedule_status=sched_status,
            conflicts=plan_conflicts,
            assumptions=assumptions
        )

        # 7. Verifier + Retry Loop
        pre_counts = [len(d.activities) for d in plan.days]
        is_valid, verifier_warnings = PlanVerifier.verify_and_sanitize(plan, constraints)
        if verifier_warnings:
            for vw in verifier_warnings:
                if vw not in plan.warnings:
                    plan.warnings.append(vw)

        post_counts = [len(d.activities) for d in plan.days]
        if post_counts != pre_counts:
            current_used = {act.destination_id for d in plan.days for act in d.activities}
            for d_idx, day in enumerate(plan.days):
                if len(day.activities) < pre_counts[d_idx]:
                    kept_dests = [data_loader.get_by_id(a.destination_id) for a in day.activities]
                    kept_dests = [kd for kd in kept_dests if kd is not None]
                    refill_pool = [
                        cand for cand in filtered_dests
                        if cand.id not in current_used or cand in kept_dests
                    ]
                    if refill_pool:
                        refilled_slots = DayRoutingOptimizer.optimize_day_stops(
                            day.day_number,
                            kept_dests,
                            constraints,
                            province_pool=refill_pool,
                            max_stops=pre_counts[d_idx]
                        )
                        day.activities = refilled_slots
                        for a in refilled_slots:
                            current_used.add(a.destination_id)
            _, retry_warnings = PlanVerifier.verify_and_sanitize(plan, constraints)
            for rw in retry_warnings:
                if rw not in plan.warnings:
                    plan.warnings.append(rw)

        # Update day statuses after verification (keeping all requested total_days!)
        for day in plan.days:
            if len(day.activities) == 0:
                if day.day_status == "ACTIVE":
                    day.day_status = "FREE_DAY"
                    day.status_reason = f"Thời gian tự do / Chưa có điểm phù hợp tại {province}."
                day.subtotal_cost_vnd = 0
            else:
                day.day_status = "ACTIVE"
            if day.day_number == total_days and constraints.departure_time:
                last_db_d = data_loader.get_by_id(day.activities[-1].destination_id) if day.activities else None
                day.departure_info = DailyTimelineEngine.compute_departure_window(day.day_number, constraints, last_dest=last_db_d)

        # Check data_confidence for unverified hours warnings or stale data
        for day in plan.days:
            for act in day.activities:
                conf = getattr(act, "data_confidence", "")
                if conf == "UNVERIFIED_HOURS":
                    w = f"Chưa xác minh giờ mở cửa của {act.destination_name}, vui lòng kiểm tra trước khi đến"
                    if w not in plan.warnings:
                        plan.warnings.append(w)
                elif conf == "STALE":
                    w = f"Dữ liệu của {act.destination_name} đã quá {config.DATA_STALE_THRESHOLD_DAYS} ngày chưa được cập nhật lại, vui lòng kiểm tra lại thông tin thực tế"
                    if w not in plan.warnings:
                        plan.warnings.append(w)

        if constraints.has_elderly:
            for day in plan.days:
                unverified_elderly_names = []
                for act in day.activities:
                    db_dest = data_loader.get_by_id(act.destination_id)
                    if db_dest and db_dest.auto_classified and db_dest.walking_load != "LIGHT":
                        unverified_elderly_names.append(act.destination_name)
                if unverified_elderly_names:
                    joined_names = ", ".join(unverified_elderly_names)
                    w = (
                        f"Ngày {day.day_number}: Điểm {joined_names} có mức độ vận động chưa được xác minh "
                        f"từ nguồn chính thức, người cao tuổi nên cân nhắc thể lực."
                    )
                    if w not in plan.warnings:
                        plan.warnings.append(w)

        for day in plan.days:
            for act in day.activities:
                if act.travel_time_from_prev_min >= 45:
                    w = f"Chặng di chuyển đến {act.destination_name} mất ~{act.travel_time_from_prev_min} phút, đoàn cần lưu ý thời gian ngồi xe."
                    if w not in plan.warnings:
                        plan.warnings.append(w)

        weather_info = get_weather_advisory(province, travel_month)
        final_used_ids = {act.destination_id for d in plan.days for act in d.activities}
        indoor_backup_pool = [
            cand for cand in filtered_dests
            if cand.id not in final_used_ids and getattr(cand, "indoor_outdoor", "MIXED") in ("INDOOR", "MIXED")
        ]
        for day in plan.days:
            for act in day.activities:
                db_dest = data_loader.get_by_id(act.destination_id)
                if db_dest and db_dest.indoor_outdoor == "OUTDOOR" and indoor_backup_pool:
                    nearest_in = min(
                        indoor_backup_pool,
                        key=lambda c: haversine_km(db_dest.latitude, db_dest.longitude, c.latitude, c.longitude)
                    )
                    dist_in = haversine_km(db_dest.latitude, db_dest.longitude, nearest_in.latitude, nearest_in.longitude)
                    if dist_in <= 15.0:
                        act.rain_backup_suggestion = {
                            "destination_id": nearest_in.id,
                            "destination_name": nearest_in.name,
                            "category": nearest_in.category,
                            "distance_km": round(dist_in, 1),
                            "cost_vnd": nearest_in.price_min,
                            "reason": f"Phương án dự phòng trong nhà cách {dist_in:.1f} km nếu trời mưa."
                        }

        if weather_info.get("is_rainy_season"):
            outdoor_rain_names = []
            for day in plan.days:
                for act in day.activities:
                    db_dest = data_loader.get_by_id(act.destination_id)
                    if db_dest:
                        is_outdoor_exposed = (
                            db_dest.indoor_outdoor == "OUTDOOR"
                            or any(k in (db_dest.name + " " + db_dest.category).lower() for k in ["biển", "bãi biển", "công viên nước", "đèo", "thác"])
                        )
                        if is_outdoor_exposed and act.destination_name not in outdoor_rain_names:
                            outdoor_rain_names.append(act.destination_name)
            if outdoor_rain_names:
                w = f"Các điểm ngoài trời ({', '.join(outdoor_rain_names)}) nằm trong mùa mưa ước tính theo mùa, đoàn nên chuẩn bị ô/áo mưa và theo dõi dự báo thời tiết."
                if w not in plan.warnings:
                    plan.warnings.append(w)

        # 8. Narrator & Subtotals
        for d in plan.days:
            display_loc = _resolve_day_display_location(province, d.activities, getattr(constraints, "sub_destination", None))
            d_dests = [dd for dd in (data_loader.get_by_id(a.destination_id) for a in d.activities) if dd is not None]
            d_theme = GeographicClusteringEngine.infer_day_theme(d_dests, d.day_number) if d.activities else None
            d.title = _build_dynamic_day_title(d.day_number, d.activities, display_loc, day_status=d.day_status, day_theme=d_theme)
            if d.activities:
                d.day_rationale = NarratorGenerator.generate_day_rationale(
                    d.day_number,
                    display_loc,
                    d.title,
                    d.activities,
                    month=travel_month
                )
                if d.departure_info and d.departure_info.get("summary"):
                    d.day_rationale = f"{d.day_rationale} {d.departure_info['summary']}".strip()
                d.subtotal_cost_vnd = sum(act.cost_vnd for act in d.activities)
            else:
                d.day_rationale = d.status_reason or f"Ngày {d.day_number} tại {display_loc}: Thời gian tự do."
                d.subtotal_cost_vnd = 0

        if getattr(constraints, "enable_llm_narration", False):
            try:
                NarratorGenerator.enhance_plan_narration_with_gemini(province, plan.days, constraints)
            except Exception:
                pass

        # 9. Budget Engine (keeps full trip hotel nights!) + Hard Budget Ceiling Solver
        verified_activities = [d.activities for d in plan.days]
        budget_summary = BudgetCalculatorEngine.calculate_trip_budget(verified_activities, constraints)
        plan.estimated_total_cost_vnd = budget_summary["grand_total_vnd"]
        plan.min_fluctuation_vnd = budget_summary["min_fluctuation_vnd"]
        plan.max_fluctuation_vnd = budget_summary["max_fluctuation_vnd"]
        plan.breakdown = budget_summary.get("breakdown")

        if max_budget and max_budget > 0 and plan.estimated_total_cost_vnd > max_budget:
            if constraints.budget_tier != "economy":
                constraints.budget_tier = "economy"
                plan.budget_tier = "economy"
                budget_summary = BudgetCalculatorEngine.calculate_trip_budget(verified_activities, constraints)
                plan.estimated_total_cost_vnd = budget_summary["grand_total_vnd"]
                plan.min_fluctuation_vnd = budget_summary["min_fluctuation_vnd"]
                plan.max_fluctuation_vnd = budget_summary["max_fluctuation_vnd"]
                plan.breakdown = budget_summary.get("breakdown")

            if plan.estimated_total_cost_vnd > max_budget:
                opt_summary, opt_notes = BudgetCalculatorEngine.optimize_for_budget_ceiling(
                    plan.days, constraints, filtered_dests, max_budget
                )
                if opt_notes:
                    plan.estimated_total_cost_vnd = opt_summary["grand_total_vnd"]
                    plan.min_fluctuation_vnd = opt_summary["min_fluctuation_vnd"]
                    plan.max_fluctuation_vnd = opt_summary["max_fluctuation_vnd"]
                    plan.breakdown = opt_summary.get("breakdown")
                    for d in plan.days:
                        d.subtotal_cost_vnd = sum(act.cost_vnd for act in d.activities) if d.activities else 0
                    for note in opt_notes:
                        plan.warnings.append(note)
                        plan.assumptions.append(note)

            if plan.estimated_total_cost_vnd > max_budget:
                plan.warnings.append(
                    f"Tổng chi phí ước tính tối thiểu ({plan.estimated_total_cost_vnd:,}đ) cho {constraints.people_count} người trong {plan.total_days} ngày "
                    f"vượt mức ngân sách mong muốn ({max_budget:,}đ); hệ thống đã áp dụng hạng mục Tiết kiệm (economy)."
                )

        # 10. Record Internal Plan Source Signal at the END of plan generation (after verification) - Section 9.1
        initial_entry = build_source_signal_entry(
            source_code=source_code,
            stage_label="Lịch ban đầu",
            fallback_reason=fallback_reason,
            model_roles=model_roles
        )
        plan.internal_diagnostics = {
            "current_source": initial_entry,
            "initial_plan_source": initial_entry,
            "last_replan_source": None,
        }

        return plan
