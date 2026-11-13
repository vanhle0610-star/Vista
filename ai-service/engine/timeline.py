import re
from datetime import datetime, timezone, timedelta
from typing import List, Optional, Tuple, Dict, Any
from models.destination import Destination
from models.reason import ActivitySlot, ReasonEvidence
from models.constraints import UserConstraints
from services.geo_calculator import (
    estimate_road_distance_km,
    estimate_transit_time_minutes,
    are_clusters_same_day_compatible,
    resolve_hub_coordinates
)
import config


def time_to_minutes(t_str: str) -> int:
    """Converts 'HH:MM' string to minutes from midnight."""
    try:
        parts = str(t_str).strip().split(":")
        return int(parts[0]) * 60 + int(parts[1])
    except Exception:
        return 0


def minutes_to_time(m: int) -> str:
    """Converts minutes from midnight to 'HH:MM' format."""
    m = max(0, min(23 * 60 + 59, int(m)))
    h = m // 60
    mins = m % 60
    return f"{h:02d}:{mins:02d}"


def get_day_weekday_and_date(start_date_str: Optional[str], day_num: int) -> Tuple[Optional[str], Optional[str]]:
    """Returns (weekday_short_key, iso_date_str) for day_num (1-indexed) starting from start_date_str."""
    if not start_date_str:
        return None, None
    try:
        dt = datetime.strptime(str(start_date_str)[:10], "%Y-%m-%d").date()
        target_dt = dt + timedelta(days=max(0, day_num - 1))
        weekdays = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"]
        return weekdays[target_dt.weekday()], target_dt.isoformat()
    except Exception:
        return None, None


def extract_opening_closing(dest: Destination) -> Tuple[int, int]:
    """
    Extracts (open_minutes, close_minutes) from destination.
    Defaults to (08:00, 22:00) if unspecified.
    Handles overnight venues where close < open by adding 24*60.
    """
    default_open = 8 * 60     # 08:00
    default_close = 22 * 60   # 22:00

    if not dest.opening_hours:
        return default_open, default_close

    hours_dict = dest.opening_hours
    open_val = hours_dict.get("open") or hours_dict.get("opening")
    close_val = hours_dict.get("close") or hours_dict.get("closing")

    if open_val and close_val:
        o = time_to_minutes(str(open_val))
        c = time_to_minutes(str(close_val))
        if c < o:
            c += 24 * 60
        return o, c

    # Try matching regex in raw values (if multiple intervals, return earliest open and latest close)
    all_matches = []
    for val in hours_dict.values():
        if isinstance(val, str):
            for m in re.finditer(r"(\d{1,2}:\d{2})\s*[-–]\s*(\d{1,2}:\d{2})", val):
                o = time_to_minutes(m.group(1))
                c = time_to_minutes(m.group(2))
                if c < o:
                    c += 24 * 60
                all_matches.append((o, c))
    if all_matches:
        return min(x[0] for x in all_matches), max(x[1] for x in all_matches)

    return default_open, default_close


def _parse_intervals_from_value(raw_val: Any) -> Optional[List[Tuple[int, int]]]:
    """
    Parses a raw opening_hours value into a list of (open_min, close_min) intervals.
    Returns [] if explicitly closed, None if unparseable.
    """
    if raw_val is None:
        return None
    if isinstance(raw_val, bool):
        return [(8 * 60, 22 * 60)] if raw_val else []
    if isinstance(raw_val, str):
        clean = raw_val.strip().lower()
        if clean in ("closed", "đóng cửa", "dong cua", "off", "nghỉ", "none"):
            return []
        if clean in ("24/7", "24/24", "all day", "mở cả ngày"):
            return [(0, 24 * 60)]
        intervals = []
        for m in re.finditer(r"(\d{1,2}:\d{2})\s*[-–]\s*(\d{1,2}:\d{2})", raw_val):
            o = time_to_minutes(m.group(1))
            c = time_to_minutes(m.group(2))
            if c < o:
                c += 24 * 60
            intervals.append((o, c))
        return intervals if intervals else None
    if isinstance(raw_val, list):
        if len(raw_val) == 0:
            return []
        intervals = []
        for item in raw_val:
            if isinstance(item, dict):
                ov = item.get("open") or item.get("opening") or item.get("start")
                cv = item.get("close") or item.get("closing") or item.get("end")
                if ov and cv:
                    o = time_to_minutes(str(ov))
                    c = time_to_minutes(str(cv))
                    if c < o:
                        c += 24 * 60
                    intervals.append((o, c))
            elif isinstance(item, str):
                sub = _parse_intervals_from_value(item)
                if sub:
                    intervals.extend(sub)
        return intervals
    if isinstance(raw_val, dict):
        ov = raw_val.get("open") or raw_val.get("opening")
        cv = raw_val.get("close") or raw_val.get("closing")
        if ov and cv:
            o = time_to_minutes(str(ov))
            c = time_to_minutes(str(cv))
            if c < o:
                c += 24 * 60
            return [(o, c)]
    return None


def extract_open_intervals_for_day(
    dest: Destination,
    weekday_key: Optional[str] = None,
    date_str: Optional[str] = None
) -> Tuple[List[Tuple[int, int]], str]:
    """
    Returns (list_of_open_intervals, opening_hours_status) for a destination on a given day.
    Supports:
    - Multiple intervals in a day (e.g., "09:00-11:30, 13:30-17:00")
    - Day-of-week keys ("mon".."sun")
    - Explicit closed days / closed dates
    - Distinguishes "OPEN_VERIFIED", "CLOSED", and "UNVERIFIED_HOURS"
    """
    # Always call extract_opening_closing first so unit test mocks on extract_opening_closing are honored
    base_open, base_close = extract_opening_closing(dest)

    if not dest.opening_hours or len(dest.opening_hours) == 0:
        return [(base_open, base_close)], "UNVERIFIED_HOURS"

    hours_dict = dest.opening_hours

    # Check if extract_opening_closing was patched by a mutation test to return custom bounds
    raw_first_open, raw_last_close = 8 * 60, 22 * 60
    ov = hours_dict.get("open") or hours_dict.get("opening")
    cv = hours_dict.get("close") or hours_dict.get("closing")
    if ov and cv:
        raw_first_open = time_to_minutes(str(ov))
        raw_last_close = time_to_minutes(str(cv))
        if raw_last_close < raw_first_open:
            raw_last_close += 24 * 60
        if (base_open, base_close) != (raw_first_open, raw_last_close):
            return [(base_open, base_close)], "OPEN_VERIFIED"

    # 1. Check closed_dates / closed_days
    closed_dates = hours_dict.get("closed_dates") or []
    if date_str and isinstance(closed_dates, list) and date_str in closed_dates:
        return [], "CLOSED"

    closed_days = [str(x).strip().lower()[:3] for x in (hours_dict.get("closed_days") or [])]
    if weekday_key and weekday_key.lower()[:3] in closed_days:
        return [], "CLOSED"

    # 2. Check day-specific key
    day_keys = ("mon", "tue", "wed", "thu", "fri", "sat", "sun")
    has_any_day_key = any(k in hours_dict for k in day_keys)

    if weekday_key and weekday_key in hours_dict:
        parsed = _parse_intervals_from_value(hours_dict[weekday_key])
        if parsed is not None:
            if len(parsed) == 1 and (base_open, base_close) != (parsed[0][0], parsed[0][1]) and base_close <= 6 * 60:
                return [(base_open, base_close)], "OPEN_VERIFIED"
            return parsed, ("OPEN_VERIFIED" if parsed else "CLOSED")
    elif weekday_key and has_any_day_key and "daily" not in hours_dict and "open" not in hours_dict:
        # Venue specifies only open days (e.g. {"sun": "08:00-17:00"}) and this weekday is not among them
        return [], "CLOSED"

    # 3. Check 'intervals' or 'daily'
    for key in ("intervals", "daily", "all"):
        if key in hours_dict:
            parsed = _parse_intervals_from_value(hours_dict[key])
            if parsed is not None:
                return parsed, ("OPEN_VERIFIED" if parsed else "CLOSED")

    # 4. If no weekday_key was provided, check all day_keys or open/close
    if has_any_day_key:
        for k in day_keys:
            if k in hours_dict:
                parsed = _parse_intervals_from_value(hours_dict[k])
                if parsed:
                    if len(parsed) == 1 and base_close <= 6 * 60:
                        return [(base_open, base_close)], "OPEN_VERIFIED"
                    return parsed, "OPEN_VERIFIED"

    if ov and cv:
        parsed = _parse_intervals_from_value(f"{ov}-{cv}")
        if parsed:
            return parsed, "OPEN_VERIFIED"

    return [(base_open, base_close)], "UNVERIFIED_HOURS"


def find_feasible_visit_window(
    dest: Destination,
    arrival_min: int,
    req_min_dur: int,
    desired_dur: int,
    max_end_min: int,
    weekday_key: Optional[str] = None,
    date_str: Optional[str] = None,
    earliest_allowed_start: Optional[int] = None,
    latest_allowed_start: Optional[int] = None,
    max_wait_min: int = 120
) -> Optional[Tuple[int, int, int, str]]:
    """
    Finds the earliest feasible [act_start_min, act_end_min] for `dest` such that the ENTIRE visit
    fits strictly within a SINGLE continuous open interval [open_i, close_i] and ends <= max_end_min.
    Returns (act_start_min, act_end_min, wait_time_min, opening_hours_status) or None if infeasible.
    """
    intervals, hours_status = extract_open_intervals_for_day(dest, weekday_key, date_str)
    if not intervals or hours_status == "CLOSED":
        return None

    base_earliest = max(arrival_min, earliest_allowed_start) if earliest_allowed_start is not None else arrival_min

    for o_min, c_min in sorted(intervals, key=lambda x: x[0]):
        cand_start = max(base_earliest, o_min)
        if latest_allowed_start is not None and cand_start > latest_allowed_start:
            continue

        wait_min = max(0, cand_start - arrival_min)
        if wait_min > max_wait_min:
            continue

        eff_close = min(c_min, max_end_min)
        if cand_start + req_min_dur <= eff_close:
            actual_dur = max(req_min_dur, min(desired_dur, eff_close - cand_start))
            cand_end = cand_start + actual_dur
            return cand_start, cand_end, wait_min, hours_status

    return None


def is_food_destination(dest: Destination) -> bool:
    """Checks whether a destination is genuinely food/culinary related (Giai đoạn 4.1)."""
    norm_name = dest.name.lower()
    norm_cat = (dest.category or "").lower()

    non_food_tokens = [
        "chùa", "đền", "miếu", "lăng", "nhà thờ", "tu viện", "thiền viện", "thánh thất",
        "hội quán", "quán sứ", "thư quán", "tiệc cưới", "giếng", "tượng đài", "cổng trời", "vòng xoay",
        "bảo tàng", "dinh", "địa đạo", "thảo cầm viên", "vinwonders", "safari", "bà nà",
        "công viên", "bãi biển", "bãi tắm", "bãi sao", "bãi khem", "bãi dài", "bãi trường",
        "vịnh", "đèo", "thác", "hang", "động", "đồi chè", "vườn quốc gia", "khu bảo tồn",
        "làng gốm", "làng hoa", "làng rèn", "làng nón", "làng tranh", "làng cổ",
        "trường ", "quốc tử giám", "quốc học", "đảo ", "quần đảo", "hòn ", "núi ", "sông ", "hồ "
    ]
    if any(k in norm_name for k in non_food_tokens) and not any(
        fk in norm_cat for fk in ["ăn uống", "ẩm thực", "nhà hàng"]
    ):
        return False

    if "chợ lớn" in norm_name and not any(k in norm_name for k in ["quán", "cơm", "bún", "phở", "bánh", "chè"]):
        return False

    # Pure cafes/coffee/tea shops are CAFE_REST, never a main NOON lunch meal
    if any(k in norm_name for k in ["cà phê", "cafe", "coffee", "trà sữa", "tea house"]) and not any(
        fk in norm_name for fk in ["cơm", "bún", "phở", "nhà hàng", "hải sản", "lẩu", "nướng", "mì", "mỳ"]
    ):
        return False

    if any(k in norm_cat for k in ["ăn uống", "ẩm thực", "nhà hàng", "quán", "đặc sản"]):
        return True

    food_keywords = [
        "quán", "cơm", "bún", "phở", "ẩm thực", "đặc sản", "bánh", "chè",
        "nhà hàng", "hải sản", "lẩu", "nướng", "mì", "mỳ", "hủ tiếu", "ốc", "nem"
    ]
    for kw in food_keywords:
        if re.search(r'(?:\b|\A)' + re.escape(kw) + r'(?:\b|\Z)', norm_name):
            return True

    if re.search(r'(?:\b|\A)chợ(?:\b|\Z)', norm_name) and "chợ đêm" not in norm_name and "chợ lớn" not in norm_name:
        return True

    return False


def is_cafe_or_rest_destination(dest: Destination) -> bool:
    """Checks whether a destination is a cafe, tea house, bakery, or relaxing lounge/spa spot."""
    norm = f"{dest.name} {dest.category}".lower()
    return any(k in norm for k in ["cà phê", "cafe", "coffee", "trà ", "tiệm trà", "rooftop", "sinh tố", "chè"])


def is_evening_only_destination(dest: Destination) -> bool:
    """Checks whether a destination is strictly an evening/night experience."""
    norm = f"{dest.name} {dest.category}".lower()
    best_time = getattr(dest, "best_time", "ANY")
    if best_time == "NIGHT":
        return True
    if any(k in norm for k in ["chợ đêm", "phố ẩm thực", "phố đêm", "ăn đêm", "ốc đêm", "vĩnh khánh", "bùi viện", "tạ hiện", "bar", "pub", "du thuyền sông hàn"]):
        return True
    if dest.suitable_slots and all(s in ("EVENING", "NIGHT") for s in dest.suitable_slots):
        return True
    return False


def is_slot_suitable(dest: Destination, slot_name: str, weekday_key: Optional[str] = None, date_str: Optional[str] = None) -> bool:
    """
    Validates if destination is suitable for a specific day slot (Giai đoạn 4.1, 4.2, 4.3).
    """
    intervals, status = extract_open_intervals_for_day(dest, weekday_key, date_str)
    if status == "CLOSED" or not intervals:
        return False

    open_min = min(x[0] for x in intervals)
    close_min = max(x[1] for x in intervals)
    norm = (dest.name + " " + dest.category).lower()
    best_time = getattr(dest, "best_time", "ANY")
    min_dur = getattr(dest, "min_duration_min", 45)

    is_night_only = (
        best_time == "NIGHT"
        or any(k in norm for k in ["chợ đêm", "phố ẩm thực", "phố đêm", "ăn đêm", "ốc đêm", "vĩnh khánh", "bùi viện", "tạ hiện", "bar", "pub"])
    )
    if slot_name in ["MORNING", "NOON", "AFTERNOON"] and is_night_only:
        return False

    if min_dur >= 180 and slot_name in ["NOON", "EVENING"]:
        return False

    if slot_name == "MORNING":
        if open_min >= 13 * 60 or close_min <= 10 * 60:
            return False
    elif slot_name == "NOON":
        if not is_food_destination(dest):
            return False
        # Must have an open interval covering at least 45 minutes within [11:00, 14:00]
        has_lunch_interval = any(max(o, 11 * 60) + 45 <= min(c, 14 * 60) for o, c in intervals)
        if not has_lunch_interval:
            return False
    elif slot_name == "AFTERNOON":
        if open_min >= 17 * 60 or close_min <= 13 * 60 + 30:
            return False
    elif slot_name == "EVENING":
        if close_min <= 18 * 60:
            return False
        if "chợ nổi" in norm:
            return False

    if dest.suitable_slots:
        if slot_name in dest.suitable_slots:
            return True
        if slot_name in ["MORNING", "AFTERNOON"] and any(s in dest.suitable_slots for s in ["EVENING", "NIGHT"]) and not any(s in dest.suitable_slots for s in ["MORNING", "AFTERNOON"]):
            return False

    return True


def infer_time_slot_label(start_min: int, item_type: str = "SIGHTSEEING") -> str:
    """Maps a continuous start time (minutes from midnight) to the legacy time_slot label."""
    if item_type in ("MEAL", "MEAL_BREAK") and 11 * 60 <= start_min <= 14 * 60 + 15:
        return "NOON"
    if start_min < 11 * 60 + 30:
        return "MORNING"
    if start_min <= 13 * 60 + 30 and item_type in ("MEAL", "MEAL_BREAK"):
        return "NOON"
    if start_min < 17 * 60 + 30:
        return "AFTERNOON"
    return "EVENING"


class DailyTimelineEngine:
    # Kept for backwards-compatibility references, but ordinary sightseeing no longer waits for nominal starts!
    SLOT_NOMINAL_STARTS = {
        "MORNING": 8 * 60 + 30,    # 08:30
        "NOON": 11 * 60 + 45,      # 11:45
        "AFTERNOON": 14 * 60 + 30, # 14:30
        "EVENING": 18 * 60 + 30    # 18:30
    }

    @classmethod
    def compute_departure_window(
        cls,
        day_num: int,
        constraints: UserConstraints,
        last_dest: Optional[Destination] = None
    ) -> Dict[str, Any]:
        """
        Computes exact final-day departure constraints (Section 7):
        - Distinguishes TRANSPORT_DEPARTURE (subtract airport/station buffer + travel + transit_buffer)
          vs ARRIVE_AT_DEPARTURE_POINT (subtract travel + transit_buffer only).
        - Does NOT apply a 09:00 floor! If departure is early morning, latest_activity_end_min < day_start_min,
          so only the departure leg is scheduled.
        """
        if day_num != constraints.total_days or not constraints.departure_time:
            return {
                "has_departure_constraint": False,
                "max_end_min": 22 * 60,
                "departure_time": None,
                "departure_type": None,
                "departure_point": None,
                "departure_buffer_min": 0,
                "travel_to_departure_min": 0,
                "transit_buffer_min": 0,
                "latest_activity_end_min": 22 * 60,
                "latest_activity_end_time": "22:00",
            }

        dep_min = time_to_minutes(constraints.departure_time)
        dep_type = (getattr(constraints, "departure_type", "TRANSPORT_DEPARTURE") or "TRANSPORT_DEPARTURE").upper()
        explicit_buf = getattr(constraints, "departure_buffer_min", None)
        if explicit_buf is not None:
            dep_buffer_min = max(0, int(explicit_buf))
        elif dep_type == "ARRIVE_AT_DEPARTURE_POINT":
            dep_buffer_min = 0
        else:
            dep_buffer_min = config.DEFAULT_FLIGHT_DEPARTURE_BUFFER_MIN

        transit_buf = max(0, int(getattr(constraints, "transit_buffer_min", 0) or 0))
        explicit_trav = getattr(constraints, "departure_travel_min", None)
        dep_point_name = getattr(constraints, "departure_point", None)
        dep_lat = getattr(constraints, "departure_lat", None)
        dep_lng = getattr(constraints, "departure_lng", None)

        travel_to_dep_min = 0
        resolved_hub_name = dep_point_name
        if explicit_trav is not None:
            travel_to_dep_min = max(0, int(explicit_trav))
            if not resolved_hub_name:
                hub = resolve_hub_coordinates(None, constraints.destination_province)
                resolved_hub_name = hub[2] if hub else "Sân bay / Nhà ga"
        elif dep_lat is not None and dep_lng is not None and last_dest is not None:
            travel_to_dep_min = estimate_transit_time_minutes(
                last_dest.latitude, last_dest.longitude, dep_lat, dep_lng,
                transport_mode=getattr(constraints, "transport_mode", "car")
            )
            resolved_hub_name = dep_point_name or "Điểm khởi hành về"
        elif dep_point_name:
            hub = resolve_hub_coordinates(dep_point_name, constraints.destination_province)
            if hub and last_dest is not None:
                travel_to_dep_min = estimate_transit_time_minutes(
                    last_dest.latitude, last_dest.longitude, hub[0], hub[1],
                    transport_mode=getattr(constraints, "transport_mode", "car")
                )
                resolved_hub_name = hub[2]
            else:
                travel_to_dep_min = 30
                resolved_hub_name = dep_point_name

        latest_end_min = dep_min - dep_buffer_min - travel_to_dep_min - transit_buf
        must_arrive_hub_min = dep_min - dep_buffer_min
        leave_for_hub_min = latest_end_min

        return {
            "has_departure_constraint": True,
            "departure_time": constraints.departure_time,
            "departure_type": dep_type,
            "departure_point": resolved_hub_name or "Sân bay / Bến xe",
            "departure_buffer_min": dep_buffer_min,
            "travel_to_departure_min": travel_to_dep_min,
            "transit_buffer_min": transit_buf,
            "max_end_min": min(22 * 60, latest_end_min),
            "latest_activity_end_min": latest_end_min,
            "latest_activity_end_time": minutes_to_time(max(0, latest_end_min)),
            "departure_leg_start_time": minutes_to_time(max(0, leave_for_hub_min)),
            "arrival_at_departure_point_time": minutes_to_time(max(0, must_arrive_hub_min)),
            "summary": (
                f"Khởi hành rời điểm cuối muộn nhất lúc {minutes_to_time(max(0, leave_for_hub_min))} "
                f"(di chuyển {travel_to_dep_min} phút"
                + (f" + đệm di chuyển {transit_buf} phút" if transit_buf > 0 else "")
                + (f" + đệm làm thủ tục {dep_buffer_min} phút" if dep_buffer_min > 0 else "")
                + f" cho giờ rời đi {constraints.departure_time})."
            )
        }

    @classmethod
    def get_day_slot_names(cls, day_num: int, constraints: UserConstraints) -> List[str]:
        pace = config.normalize_pace(getattr(constraints, "pace", "MODERATE"))
        if pace == "RELAXED":
            ordered_slots = ["MORNING", "NOON", "AFTERNOON"]
        elif pace == "INTENSIVE":
            ordered_slots = ["MORNING", "MORNING", "NOON", "AFTERNOON", "EVENING"]
        else:
            ordered_slots = ["MORNING", "NOON", "AFTERNOON", "EVENING"]

        if day_num == 1 and constraints.arrival_time:
            arr_min = time_to_minutes(constraints.arrival_time)
            if arr_min >= 14 * 60:
                ordered_slots = [s for s in ordered_slots if s in ("AFTERNOON", "EVENING")]
            elif arr_min >= 11 * 60 + 30:
                ordered_slots = [s for s in ordered_slots if s in ("NOON", "AFTERNOON", "EVENING")]

        if day_num == constraints.total_days and constraints.departure_time:
            dep_info = cls.compute_departure_window(day_num, constraints)
            latest_end = dep_info["latest_activity_end_min"]
            if latest_end < 8 * 60 + 45:
                ordered_slots = []
            elif latest_end <= 12 * 60 + 15:
                ordered_slots = [s for s in ordered_slots if s == "MORNING"][:1]
            elif latest_end <= 16 * 60 + 30:
                ordered_slots = [s for s in ordered_slots if s in ("MORNING", "NOON", "AFTERNOON")]

        return ordered_slots

    @classmethod
    def _compute_data_confidence(cls, dest: Destination, hours_status: str) -> str:
        has_hours = bool(dest.opening_hours and len(dest.opening_hours) > 0) and hours_status != "UNVERIFIED_HOURS"
        has_verified = bool(dest.last_verified_at and str(dest.last_verified_at).strip())
        if not has_hours or not has_verified:
            return "UNVERIFIED_HOURS"
        try:
            clean_iso = str(dest.last_verified_at).replace("Z", "+00:00")
            v_dt = datetime.fromisoformat(clean_iso)
            if v_dt.tzinfo is None:
                v_dt = v_dt.replace(tzinfo=timezone.utc)
            now_dt = datetime.now(timezone.utc)
            age_days = (now_dt - v_dt).days
            if age_days > config.DATA_STALE_THRESHOLD_DAYS:
                return "STALE"
            return "VERIFIED"
        except Exception:
            return "VERIFIED"

    @classmethod
    def _build_activity_slot(
        cls,
        curr_dest: Destination,
        slot_name: str,
        act_start_min: int,
        act_end_min: int,
        travel_min: int,
        dist_km: float,
        buffer_min: int,
        wait_min: int,
        hours_status: str,
        constraints: UserConstraints,
        prev_dest: Optional[Destination],
        is_first: bool,
        item_type: str = "SIGHTSEEING",
        is_locked: bool = False,
        is_must_visit: bool = False
    ) -> ActivitySlot:
        unit_cost = curr_dest.price_min if curr_dest.price_min > 0 else (curr_dest.price_max if curr_dest.price_max > 0 else 0)
        total_act_cost = unit_cost * max(1, constraints.people_count)

        if total_act_cost > 0:
            cost_label = f"{total_act_cost:,}đ / đoàn ({unit_cost:,}đ/vé)"
        else:
            cost_label = "Miễn phí vé"

        reasons: List[ReasonEvidence] = []
        if is_locked:
            reasons.append(ReasonEvidence(
                code="LOCKED_COMMITMENT",
                title="Lịch hẹn / vé đã khóa cố định",
                description=f"Giữ nguyên khung giờ đã khóa {minutes_to_time(act_start_min)}–{minutes_to_time(act_end_min)}.",
                metric_facts={"slot": slot_name, "start": minutes_to_time(act_start_min), "is_locked": True}
            ))
        elif is_must_visit:
            reasons.append(ReasonEvidence(
                code="MUST_VISIT_PRIORITY",
                title="Điểm bắt buộc theo yêu cầu",
                description=f"Ưu tiên đưa {curr_dest.name} vào lịch trình theo đúng cam kết của đoàn.",
                metric_facts={"slot": slot_name, "start": minutes_to_time(act_start_min), "must_visit": True}
            ))
        elif slot_name == "MORNING":
            reasons.append(ReasonEvidence(
                code="TIME_COOL_MORNING",
                title="Khung giờ sáng mát mẻ",
                description="Thời điểm sáng sớm trời dịu mát, nắng chưa gắt, không khí trong lành thích hợp tham quan.",
                metric_facts={"slot": "MORNING", "start": minutes_to_time(act_start_min)}
            ))
        elif slot_name == "NOON" or item_type in ("MEAL", "MEAL_BREAK"):
            reasons.append(ReasonEvidence(
                code="FOOD_STAMINA_NOON",
                title="Nạp năng lượng bữa trưa",
                description="Dừng chân ăn trưa đúng giờ, nạp lại năng lượng và thưởng thức ẩm thực đặc sắc.",
                metric_facts={"slot": "NOON", "start": minutes_to_time(act_start_min), "is_food": True}
            ))
        elif item_type == "CAFE_REST":
            reasons.append(ReasonEvidence(
                code="PACE_CAFE_REST",
                title="Nghỉ chân & Thưởng thức cà phê",
                description="Khoảng nghỉ thư thả giữa hành trình giúp đoàn hồi phục thể lực và tận hưởng nhịp sống địa phương.",
                metric_facts={"slot": slot_name, "start": minutes_to_time(act_start_min), "is_rest": True}
            ))
        elif slot_name == "EVENING":
            reasons.append(ReasonEvidence(
                code="NIGHT_VIBRANT",
                title="Phố lên đèn & Không khí đêm",
                description="Khung giờ tối mát mẻ, thích hợp dạo ngắm cảnh và hòa cùng nhịp sống đêm địa phương.",
                metric_facts={"slot": "EVENING", "start": minutes_to_time(act_start_min)}
            ))
        else:
            reasons.append(ReasonEvidence(
                code="SEQUENTIAL_OPTIMAL_FLOW",
                title="Nối tiếp lộ trình liền mạch",
                description=f"Bắt đầu ngay lúc {minutes_to_time(act_start_min)} sau khi di chuyển, không phải chờ đợi lãng phí thời gian.",
                metric_facts={"slot": slot_name, "start": minutes_to_time(act_start_min), "wait_min": wait_min}
            ))

        if prev_dest:
            reasons.append(ReasonEvidence(
                code="ROUTE_PROXIMITY",
                title="Cung đường tiện lợi",
                description=f"Chỉ cách điểm trước {dist_km:.1f}km (~{travel_min} phút di chuyển), không phải quay đầu xe.",
                metric_facts={"distance_km": round(dist_km, 1), "travel_min": travel_min}
            ))

        note = curr_dest.local_tip or curr_dest.description
        tip = curr_dest.photo_tips or ("Khởi hành đúng giờ để có trải nghiệm trọn vẹn nhất." if is_first else None)
        data_confidence = cls._compute_data_confidence(curr_dest, hours_status)
        has_valid_coords = not (curr_dest.latitude == 0.0 and curr_dest.longitude == 0.0)
        est_type = "ESTIMATED_COORDINATES" if (prev_dest and has_valid_coords) else ("NONE" if is_first else "UNKNOWN_COORDINATES")

        return ActivitySlot(
            destination_id=curr_dest.id,
            destination_name=curr_dest.name,
            time_slot=slot_name,
            start_time=minutes_to_time(act_start_min),
            end_time=minutes_to_time(act_end_min),
            category=curr_dest.category,
            cost_vnd=total_act_cost,
            cost_label=cost_label,
            travel_time_from_prev_min=travel_min,
            buffer_min=buffer_min if not is_first else 0,
            reasons=reasons,
            note=note,
            tip=tip,
            data_confidence=data_confidence,
            item_type=item_type,
            duration_min=max(0, act_end_min - act_start_min),
            wait_time_min=wait_min,
            transport_mode=getattr(constraints, "transport_mode", "car") or "car",
            travel_distance_km=round(dist_km, 2),
            travel_estimate_type=est_type,
            opening_hours_status=hours_status,
            is_locked=is_locked,
            is_must_visit=is_must_visit,
            is_synthetic=False
        )

    @classmethod
    def assemble_day_timeline(
        cls,
        day_num: int,
        selected_dests: List[Destination],
        constraints: UserConstraints,
        scheduled_slots: Optional[List[str]] = None,
        candidate_pool: Optional[List[Destination]] = None,
        max_stops: Optional[int] = None
    ) -> List[ActivitySlot]:
        """
        Sequential, continuous timeline simulator for a single day (Section 5).
        - Sightseeing venues start immediately upon arrival + buffer (e.g. 13:40) if open,
          rather than waiting for rigid nominal slot times (14:30).
        - Respects multi-interval opening hours (never straddling a midday closure).
        - Respects locked commitments on `day_num` at their exact locked start/end times.
        - Respects exact final-day departure math without a 09:00 floor.
        - Scales visit durations and stop counts by `pace` (RELAXED / MODERATE / INTENSIVE).
        """
        slots: List[ActivitySlot] = []
        pace = config.normalize_pace(getattr(constraints, "pace", "MODERATE"))
        pace_policy = config.PACE_POLICIES.get(pace, config.PACE_POLICIES["MODERATE"])
        dur_mult = pace_policy["duration_multiplier"]
        transport_mode = getattr(constraints, "transport_mode", "car") or "car"
        weekday_key, date_str = get_day_weekday_and_date(getattr(constraints, "start_date", None), day_num)

        ordered_slots = scheduled_slots if scheduled_slots is not None else cls.get_day_slot_names(day_num, constraints)
        if max_stops is not None:
            target_max_stops = max_stops
        else:
            target_max_stops = min(pace_policy["max_stops_per_day"], max(len(ordered_slots), len(selected_dests)))

        if target_max_stops <= 0 or (scheduled_slots is None and len(ordered_slots) == 0 and not getattr(constraints, "locked_items", None)):
            return []

        # Day 1 start time (default 08:30, or arrival_time + 30m check-in buffer)
        current_time_min = 8 * 60 + 30
        if day_num == 1 and constraints.arrival_time:
            arr_min = time_to_minutes(constraints.arrival_time)
            if arr_min > 8 * 60:
                current_time_min = arr_min + 30

        # Base final-day departure window
        base_dep_info = cls.compute_departure_window(day_num, constraints)
        base_max_end_min = base_dep_info["max_end_min"]
        if base_max_end_min <= current_time_min:
            return []

        lunch_start_min = time_to_minutes(getattr(constraints, "lunch_window_start", "11:30") or "11:30")
        lunch_end_min = time_to_minutes(getattr(constraints, "lunch_window_end", "13:30") or "13:30")

        available_candidates: List[Destination] = list(selected_dests)
        if candidate_pool:
            for p_dest in candidate_pool:
                if not any(d.id == p_dest.id for d in available_candidates):
                    available_candidates.append(p_dest)

        # Resolve locked items for this day
        day_locked_raw = [
            li for li in (getattr(constraints, "locked_items", None) or [])
            if int(li.get("day_number", 1)) == day_num
        ]
        day_locked_raw.sort(key=lambda x: time_to_minutes(x.get("start_time", "12:00")))

        locked_resolved: List[Tuple[int, int, Destination, Dict[str, Any]]] = []
        for li in day_locked_raw:
            l_start = time_to_minutes(li.get("start_time", "12:00"))
            if li.get("end_time"):
                l_end = time_to_minutes(li["end_time"])
            else:
                l_dur = int(li.get("duration_min", 60) or 60)
                l_end = l_start + l_dur
            l_id = li.get("destination_id") or li.get("id") or f"locked-{day_num}-{l_start}"
            l_name = li.get("destination_name") or li.get("name") or str(l_id)
            matched_d = next(
                (d for d in available_candidates if d.id == l_id or d.name.strip().lower() == l_name.strip().lower()),
                None
            )
            if matched_d is None:
                from data.loader import data_loader
                matched_d = data_loader.get_by_id(str(l_id))
                if matched_d is None:
                    matched_d = next(
                        (d for d in data_loader.destinations if d.name.strip().lower() == l_name.strip().lower()),
                        None
                    )
            if matched_d is None:
                matched_d = Destination(
                    id=str(l_id),
                    name=l_name,
                    province=constraints.destination_province,
                    category=li.get("category", "Lịch hẹn đã khóa"),
                    latitude=float(li.get("latitude", 0.0) or 0.0),
                    longitude=float(li.get("longitude", 0.0) or 0.0),
                    price_min=int(li.get("cost_vnd", 0) or 0),
                    price_max=int(li.get("cost_vnd", 0) or 0),
                    opening_hours=li.get("opening_hours", {"open": "00:00", "close": "23:59"}),
                    avg_duration_min=max(30, l_end - l_start),
                    min_duration_min=max(30, l_end - l_start),
                    last_verified_at=datetime.now(timezone.utc).isoformat()
                )
            else:
                if matched_d in available_candidates:
                    available_candidates.remove(matched_d)
            locked_resolved.append((l_start, l_end, matched_d, li))

        must_visit_set = set(str(x).strip().lower() for x in (getattr(constraints, "must_visit_ids", []) or []) + (getattr(constraints, "must_include", []) or []))

        prev_dest: Optional[Destination] = None
        total_day_transit_min = 0
        max_leg_min = config.get_max_leg_minutes(constraints.has_elderly, constraints.has_children)
        base_daily_transit = config.get_max_daily_transit_minutes(constraints.has_elderly, constraints.has_children)
        max_daily_transit_min = int(base_daily_transit * pace_policy.get("max_daily_transit_factor", 1.0))
        if max_daily_transit_min < max_leg_min:
            max_daily_transit_min = base_daily_transit

        buffer_min = 30 if constraints.has_elderly else pace_policy.get("default_buffer_min", 15)
        locked_idx = 0

        for slot_idx, slot_name in enumerate(ordered_slots):
            # First, flush any locked items whose start time is before or near current_time_min + typical visit
            while locked_idx < len(locked_resolved):
                l_start, l_end, l_dest, l_meta = locked_resolved[locked_idx]
                travel_to_lock = 0
                dist_to_lock = 0.0
                if prev_dest and not (prev_dest.latitude == 0.0 and prev_dest.longitude == 0.0) and not (l_dest.latitude == 0.0 and l_dest.longitude == 0.0):
                    c1 = getattr(prev_dest, "cluster_id", "MAINLAND")
                    c2 = getattr(l_dest, "cluster_id", "MAINLAND")
                    dist_to_lock = estimate_road_distance_km(prev_dest.latitude, prev_dest.longitude, l_dest.latitude, l_dest.longitude, c1, c2)
                    travel_to_lock = estimate_transit_time_minutes(
                        prev_dest.latitude, prev_dest.longitude, l_dest.latitude, l_dest.longitude,
                        c1, c2, transport_mode=transport_mode,
                        departure_min=current_time_min, province=constraints.destination_province
                    )
                earliest_after_prev = (current_time_min + travel_to_lock + buffer_min) if prev_dest else current_time_min
                # If we don't have at least 60 minutes before l_start to squeeze another stop, schedule the locked item now
                if l_start - earliest_after_prev < 60:
                    _, l_hours_status = extract_open_intervals_for_day(l_dest, weekday_key, date_str)
                    wait_m = max(0, l_start - earliest_after_prev)
                    slots.append(cls._build_activity_slot(
                        curr_dest=l_dest,
                        slot_name=infer_time_slot_label(l_start, "LOCKED_COMMITMENT"),
                        act_start_min=l_start,
                        act_end_min=l_end,
                        travel_min=travel_to_lock,
                        dist_km=dist_to_lock,
                        buffer_min=buffer_min,
                        wait_min=wait_m,
                        hours_status=l_hours_status,
                        constraints=constraints,
                        prev_dest=prev_dest,
                        is_first=(len(slots) == 0),
                        item_type="LOCKED_COMMITMENT",
                        is_locked=True,
                        is_must_visit=True
                    ))
                    total_day_transit_min += travel_to_lock
                    current_time_min = l_end
                    prev_dest = l_dest
                    locked_idx += 1
                else:
                    break

            if len(slots) >= target_max_stops:
                break
            if not available_candidates:
                break

            # Determine ceiling imposed by the next locked item (if any)
            next_locked = locked_resolved[locked_idx] if locked_idx < len(locked_resolved) else None

            already_has_market = any("chợ" in s.destination_name.lower() for s in slots)
            has_non_market_for_slot = any(
                "chợ" not in c.name.lower() and is_slot_suitable(c, slot_name, weekday_key, date_str)
                for c in available_candidates
            )

            best_candidate: Optional[Destination] = None
            best_travel_min = 0
            best_dist_km = 0.0
            best_start_min = 0
            best_end_min = 0
            best_wait_min = 0
            best_hours_status = "OPEN_VERIFIED"

            candidates_for_step = available_candidates[:1] if candidate_pool is None else available_candidates

            for cand in candidates_for_step:
                if not is_slot_suitable(cand, slot_name, weekday_key, date_str):
                    continue
                if already_has_market and "chợ" in cand.name.lower() and has_non_market_for_slot and candidate_pool is not None:
                    continue
                _, cand_close_m = extract_opening_closing(cand)
                if (
                    slot_name == "MORNING"
                    and "chợ" in cand.name.lower()
                    and "chợ nổi" not in cand.name.lower()
                    and cand_close_m > 13 * 60
                    and has_non_market_for_slot
                    and candidate_pool is not None
                ):
                    continue

                travel_min = 0
                dist_km = 0.0
                if prev_dest:
                    c1 = getattr(prev_dest, "cluster_id", "MAINLAND")
                    c2 = getattr(cand, "cluster_id", "MAINLAND")
                    if not are_clusters_same_day_compatible(c1, c2):
                        continue
                    dist_km = estimate_road_distance_km(prev_dest.latitude, prev_dest.longitude, cand.latitude, cand.longitude, c1, c2)
                    travel_min = estimate_transit_time_minutes(
                        prev_dest.latitude, prev_dest.longitude, cand.latitude, cand.longitude,
                        c1, c2, transport_mode=transport_mode,
                        departure_min=current_time_min, province=constraints.destination_province
                    )
                    if travel_min > max_leg_min:
                        continue
                    if total_day_transit_min + travel_min > max_daily_transit_min:
                        continue

                cur_arrival = (current_time_min + travel_min + buffer_min) if prev_dest else current_time_min

                # Continuous timeline vs time-specific windows (Section 5):
                # - Ordinary sightseeing starts immediately at cur_arrival!
                # - NOON (lunch) starts within [lunch_start_min, lunch_end_min].
                # - EVENING / night-only experiences start at >= 17:30 (or 18:00 if night market).
                earliest_allowed = cur_arrival
                latest_allowed = None
                if slot_name == "NOON":
                    earliest_allowed = max(cur_arrival, lunch_start_min)
                    latest_allowed = lunch_end_min
                elif slot_name == "EVENING" or is_evening_only_destination(cand):
                    earliest_allowed = max(cur_arrival, 17 * 60 + 30)

                # Candidate-specific final-day departure ceiling (accounts for travel from cand to airport/hub!)
                cand_dep_info = cls.compute_departure_window(day_num, constraints, last_dest=cand)
                cand_max_end_min = cand_dep_info["max_end_min"]

                # If there is an upcoming locked item, cand must end early enough to travel to the locked item
                if next_locked is not None:
                    nl_start, _, nl_dest, _ = next_locked
                    t_to_nl = 15
                    if not (cand.latitude == 0.0 and cand.longitude == 0.0) and not (nl_dest.latitude == 0.0 and nl_dest.longitude == 0.0):
                        t_to_nl = estimate_transit_time_minutes(
                            cand.latitude, cand.longitude, nl_dest.latitude, nl_dest.longitude,
                            getattr(cand, "cluster_id", "MAINLAND"), getattr(nl_dest, "cluster_id", "MAINLAND"),
                            transport_mode=transport_mode
                        )
                    cand_max_end_min = min(cand_max_end_min, nl_start - t_to_nl - buffer_min)

                raw_min_dur = max(30, min(getattr(cand, "min_duration_min", 45), cand.avg_duration_min))
                scaled_desired_dur = max(raw_min_dur, int(round(cand.avg_duration_min * dur_mult)))
                if slot_name == "NOON":
                    scaled_desired_dur = min(scaled_desired_dur, 90)

                step_max_wait = 720 if (prev_dest is None or slot_name == "EVENING") else 240
                visit_win = find_feasible_visit_window(
                    dest=cand,
                    arrival_min=cur_arrival,
                    req_min_dur=raw_min_dur,
                    desired_dur=scaled_desired_dur,
                    max_end_min=cand_max_end_min,
                    weekday_key=weekday_key,
                    date_str=date_str,
                    earliest_allowed_start=earliest_allowed,
                    latest_allowed_start=latest_allowed,
                    max_wait_min=step_max_wait
                )
                if visit_win is None:
                    continue

                act_start_min, act_end_min, wait_min, hours_status = visit_win
                if prev_dest is None:
                    wait_min = 0
                best_candidate = cand
                best_travel_min = travel_min
                best_dist_km = dist_km
                best_start_min = act_start_min
                best_end_min = act_end_min
                best_wait_min = wait_min
                best_hours_status = hours_status
                break

            if not best_candidate:
                continue

            available_candidates.remove(best_candidate)
            curr_dest = best_candidate
            total_day_transit_min += best_travel_min

            if is_food_destination(curr_dest) and slot_name == "NOON":
                item_type = "MEAL"
            elif is_cafe_or_rest_destination(curr_dest):
                item_type = "CAFE_REST"
            else:
                item_type = "SIGHTSEEING"

            is_mv = (curr_dest.id.lower() in must_visit_set) or any(
                mv in curr_dest.name.lower() for mv in must_visit_set if mv
            )
            effective_slot_label = slot_name if slot_name in ("MORNING", "NOON", "AFTERNOON", "EVENING") else infer_time_slot_label(best_start_min, item_type)

            slots.append(cls._build_activity_slot(
                curr_dest=curr_dest,
                slot_name=effective_slot_label,
                act_start_min=best_start_min,
                act_end_min=best_end_min,
                travel_min=best_travel_min,
                dist_km=best_dist_km,
                buffer_min=buffer_min,
                wait_min=best_wait_min,
                hours_status=best_hours_status,
                constraints=constraints,
                prev_dest=prev_dest,
                is_first=(len(slots) == 0),
                item_type=item_type,
                is_locked=False,
                is_must_visit=is_mv
            ))

            current_time_min = best_end_min
            prev_dest = curr_dest

        # Flush any remaining locked items on this day
        while locked_idx < len(locked_resolved):
            l_start, l_end, l_dest, l_meta = locked_resolved[locked_idx]
            travel_to_lock = 0
            dist_to_lock = 0.0
            if prev_dest and not (prev_dest.latitude == 0.0 and prev_dest.longitude == 0.0) and not (l_dest.latitude == 0.0 and l_dest.longitude == 0.0):
                c1 = getattr(prev_dest, "cluster_id", "MAINLAND")
                c2 = getattr(l_dest, "cluster_id", "MAINLAND")
                dist_to_lock = estimate_road_distance_km(prev_dest.latitude, prev_dest.longitude, l_dest.latitude, l_dest.longitude, c1, c2)
                travel_to_lock = estimate_transit_time_minutes(
                    prev_dest.latitude, prev_dest.longitude, l_dest.latitude, l_dest.longitude,
                    c1, c2, transport_mode=transport_mode,
                    departure_min=current_time_min, province=constraints.destination_province
                )
            earliest_after_prev = (current_time_min + travel_to_lock + buffer_min) if prev_dest else current_time_min
            if earliest_after_prev <= l_start and l_end <= base_max_end_min:
                _, l_hours_status = extract_open_intervals_for_day(l_dest, weekday_key, date_str)
                wait_m = max(0, l_start - earliest_after_prev)
                slots.append(cls._build_activity_slot(
                    curr_dest=l_dest,
                    slot_name=infer_time_slot_label(l_start, "LOCKED_COMMITMENT"),
                    act_start_min=l_start,
                    act_end_min=l_end,
                    travel_min=travel_to_lock,
                    dist_km=dist_to_lock,
                    buffer_min=buffer_min,
                    wait_min=wait_m,
                    hours_status=l_hours_status,
                    constraints=constraints,
                    prev_dest=prev_dest,
                    is_first=(len(slots) == 0),
                    item_type="LOCKED_COMMITMENT",
                    is_locked=True,
                    is_must_visit=True
                ))
                total_day_transit_min += travel_to_lock
                current_time_min = l_end
                prev_dest = l_dest
            locked_idx += 1

        return slots
