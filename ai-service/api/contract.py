import dataclasses
from typing import Any, Dict, List, Optional
from datetime import date
from models.constraints import UserConstraints
from models.plan import ItineraryPlanResponse
import config

class ProvinceNotSupportedError(Exception):
    """Raised when the requested province has no registered destinations in the database."""
    def __init__(self, province: str):
        self.province = province
        super().__init__(f"Tỉnh/thành '{province}' chưa có dữ liệu địa điểm trong hệ thống.")

class InvalidBudgetTierError(Exception):
    """Raised when an unrecognized budget tier is supplied."""
    def __init__(self, tier: str):
        self.tier = tier
        super().__init__(f"Hạng ngân sách '{tier}' không hợp lệ. Chỉ chấp nhận: economy, standard, luxury (hoặc premium).")

class InvalidInputError(Exception):
    """Raised when an input field has an invalid type or format."""
    def __init__(self, message: str, field: str):
        self.message = message
        self.field = field
        super().__init__(f"Trường '{field}' không hợp lệ: {message}")

class InsufficientDestinationsError(Exception):
    """Raised when a province does not have enough destinations for the requested trip duration."""
    def __init__(self, message: str, details: Optional[Dict[str, Any]] = None):
        self.message = message
        self.details = details or {}
        super().__init__(message)

class PlanVerificationError(Exception):
    """Raised when the generated plan fails safety/grounded verification and cannot be auto-repaired."""
    def __init__(self, message: str, errors: Optional[List[str]] = None):
        self.message = message
        self.errors = errors or []
        super().__init__(f"Plan verification failed: {message} ({len(self.errors)} violations)")

def parse_bool(value: Any) -> bool:
    """
    Parses boolean from various representations:
    True/False, 'true'/'false', '1'/'0', 'yes'/'no', 1/0, None.
    Avoids bool('false') evaluating to True.
    """
    if value is None:
        return False
    if isinstance(value, bool):
        return value
    if isinstance(value, (int, float)):
        return value != 0
    if isinstance(value, str):
        v = value.strip().lower()
        if v in ("true", "1", "yes", "y", "t"):
            return True
        if v in ("false", "0", "no", "n", "f", ""):
            return False
    return False

def parse_plan_request(data: Dict[str, Any]) -> UserConstraints:
    """
    Parses request dictionary into UserConstraints model across both FastAPI and standalone servers.
    Handles legacy snake_case, camelCase field names, and aliases gracefully.
    """
    import re
    initial_warnings: List[str] = []

    raw_dest = (
        data.get("destination")
        or data.get("destinationProvince")
        or data.get("destination_province")
        or data.get("province")
        or ""
    )
    destination_province = str(raw_dest).strip()
    if not destination_province:
        raise ProvinceNotSupportedError("")

    raw_days = data.get("days") if "days" in data else (data.get("totalDays") if "totalDays" in data else data.get("total_days"))
    if raw_days is not None:
        try:
            val_days = int(raw_days)
        except (ValueError, TypeError):
            raise InvalidInputError("days phải là số nguyên", field="days")
        if val_days > 7:
            total_days = 7
            initial_warnings.append(f"Số ngày ({val_days}) vượt quá giới hạn tối đa, đã điều chỉnh về 7 ngày.")
        elif val_days < 1:
            total_days = 1
            initial_warnings.append(f"Số ngày ({val_days}) không hợp lệ, đã điều chỉnh về 1 ngày.")
        else:
            total_days = val_days
    else:
        total_days = 3

    raw_people = data.get("people") if "people" in data else (data.get("peopleCount") if "peopleCount" in data else data.get("people_count"))
    if raw_people is not None:
        try:
            val_people = int(raw_people)
        except (ValueError, TypeError):
            raise InvalidInputError("people phải là số nguyên", field="people")
        if val_people < 1:
            people_count = 1
            initial_warnings.append(f"Số lượng người ({val_people}) không hợp lệ, đã điều chỉnh về 1 người.")
        else:
            people_count = val_people
    else:
        people_count = 2

    raw_interests = data.get("interests", [])
    if isinstance(raw_interests, str):
        interests = [item.strip() for item in raw_interests.split(",") if item.strip()]
    elif isinstance(raw_interests, list):
        interests = [str(item).strip() for item in raw_interests if str(item).strip()]
    else:
        interests = []

    raw_must_include = data.get("must_include") or data.get("mustInclude") or []
    if isinstance(raw_must_include, str):
        must_include = [item.strip() for item in raw_must_include.split(",") if item.strip()]
    elif isinstance(raw_must_include, list):
        must_include = [str(item).strip() for item in raw_must_include if str(item).strip()]
    else:
        must_include = []

    raw_must_avoid = data.get("must_avoid") or data.get("mustAvoid") or []
    if isinstance(raw_must_avoid, str):
        must_avoid = [item.strip() for item in raw_must_avoid.split(",") if item.strip()]
    elif isinstance(raw_must_avoid, list):
        must_avoid = [str(item).strip() for item in raw_must_avoid if str(item).strip()]
    else:
        must_avoid = []

    raw_tier = str(data.get("budget_tier") or data.get("budgetTier") or "standard").strip().lower()
    canonical_tier = config.BUDGET_TIER_ALIASES.get(raw_tier, raw_tier)
    if canonical_tier not in config.VALID_BUDGET_TIERS:
        raise InvalidBudgetTierError(raw_tier)
    budget_tier = canonical_tier
    raw_pace = data.get("pace") or data.get("travelPace") or data.get("travel_pace") or "MODERATE"
    pace = config.normalize_pace(str(raw_pace))
    travel_with = str(data.get("travel_with") or data.get("travelWith") or "Cặp đôi / Bạn bè")

    raw_prio = data.get("priority_interests") or data.get("priorityInterests") or []
    if isinstance(raw_prio, str):
        priority_interests = [item.strip() for item in raw_prio.split(",") if item.strip()]
    elif isinstance(raw_prio, list):
        priority_interests = [str(item).strip() for item in raw_prio if str(item).strip()]
    else:
        priority_interests = []
    if not priority_interests and interests:
        priority_interests = list(interests[:3])

    raw_must_visit_ids = data.get("must_visit_ids") or data.get("mustVisitIds") or []
    if isinstance(raw_must_visit_ids, str):
        must_visit_ids = [item.strip() for item in raw_must_visit_ids.split(",") if item.strip()]
    elif isinstance(raw_must_visit_ids, list):
        must_visit_ids = [str(item).strip() for item in raw_must_visit_ids if str(item).strip()]
    else:
        must_visit_ids = []

    raw_locked = data.get("locked_items") or data.get("lockedItems") or data.get("locked_activities") or []
    locked_items = raw_locked if isinstance(raw_locked, list) else []

    arrival_point = data.get("arrival_point") or data.get("arrivalPoint")
    departure_point = data.get("departure_point") or data.get("departurePoint")
    departure_type = str(
        data.get("departure_type") or data.get("departureType") or "TRANSPORT_DEPARTURE"
    ).strip().upper()
    if departure_type not in ("TRANSPORT_DEPARTURE", "ARRIVE_AT_DEPARTURE_POINT"):
        departure_type = "TRANSPORT_DEPARTURE"

    departure_buffer_min = None
    raw_dep_buf = data.get("departure_buffer_min") if "departure_buffer_min" in data else data.get("departureBufferMin")
    if raw_dep_buf is not None:
        try:
            departure_buffer_min = max(0, int(raw_dep_buf))
        except (ValueError, TypeError):
            departure_buffer_min = None

    departure_travel_min = None
    raw_dep_trav = data.get("departure_travel_min") if "departure_travel_min" in data else data.get("departureTravelMin")
    if raw_dep_trav is not None:
        try:
            departure_travel_min = max(0, int(raw_dep_trav))
        except (ValueError, TypeError):
            departure_travel_min = None

    transit_buffer_min = 0
    raw_trans_buf = data.get("transit_buffer_min") if "transit_buffer_min" in data else data.get("transitBufferMin")
    if raw_trans_buf is not None:
        try:
            transit_buffer_min = max(0, int(raw_trans_buf))
        except (ValueError, TypeError):
            transit_buffer_min = 0

    transport_mode = str(data.get("transport_mode") or data.get("transportMode") or "car").strip().lower()
    lunch_window_start = str(data.get("lunch_window_start") or data.get("lunchWindowStart") or "11:30").strip()
    lunch_window_end = str(data.get("lunch_window_end") or data.get("lunchWindowEnd") or "13:30").strip()
    include_internal_diagnostics = parse_bool(
        data.get("include_internal_diagnostics")
        if "include_internal_diagnostics" in data
        else data.get("includeInternalDiagnostics")
    )
    scheduler_mode = data.get("scheduler_mode") or data.get("schedulerMode")

    has_elderly = parse_bool(data.get("has_elderly") if "has_elderly" in data else data.get("hasElderly"))
    has_children = parse_bool(data.get("has_children") if "has_children" in data else data.get("hasChildren"))
    has_hotel = parse_bool(data.get("has_hotel") if "has_hotel" in data else data.get("hasHotel"))
    hotel_lat = None
    if "hotel_lat" in data or "hotelLat" in data:
        try:
            hotel_lat = float(data.get("hotel_lat") or data.get("hotelLat"))
        except (ValueError, TypeError):
            hotel_lat = None
    hotel_lng = None
    if "hotel_lng" in data or "hotelLng" in data:
        try:
            hotel_lng = float(data.get("hotel_lng") or data.get("hotelLng"))
        except (ValueError, TypeError):
            hotel_lng = None

    time_regex = re.compile(r"^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$")

    raw_arrival = data.get("arrival_time") or data.get("arrivalTime")
    arrival_time = None
    if raw_arrival:
        raw_arrival_str = str(raw_arrival).strip()
        if not time_regex.match(raw_arrival_str):
            raise InvalidInputError("Định dạng giờ đến không hợp lệ, yêu cầu định dạng HH:MM", field="arrival_time")
        arrival_time = raw_arrival_str

    raw_departure = data.get("departure_time") or data.get("departureTime")
    departure_time = None
    if raw_departure:
        raw_departure_str = str(raw_departure).strip()
        if not time_regex.match(raw_departure_str):
            raise InvalidInputError("Định dạng giờ về không hợp lệ, yêu cầu định dạng HH:MM", field="departure_time")
        departure_time = raw_departure_str

    date_regex = re.compile(r"^\d{4}-\d{2}-\d{2}$")
    raw_start_date = data.get("start_date") or data.get("startDate")
    if raw_start_date:
        start_date_str = str(raw_start_date).strip()
        if not date_regex.match(start_date_str):
            raise InvalidInputError("Định dạng ngày bắt đầu không hợp lệ, yêu cầu định dạng YYYY-MM-DD", field="start_date")
        start_date = start_date_str
    else:
        start_date = date.today().isoformat()

    dietary_preference = data.get("dietary_preference") or data.get("dietaryPreference")
    raw_sub = data.get("sub_destination") or data.get("subDestination") or data.get("city")
    sub_destination = str(raw_sub).strip() if raw_sub else None
    if not sub_destination:
        dest_low = destination_province.lower()
        for sub_alias, sub_canonical in [
            ("phú quốc", "Phú Quốc"), ("phu quoc", "Phú Quốc"), ("đảo ngọc", "Phú Quốc"),
            ("hà tiên", "Hà Tiên"), ("ha tien", "Hà Tiên"),
            ("hội an", "Hội An"), ("hoi an", "Hội An"),
            ("đà lạt", "Đà Lạt"), ("da lat", "Đà Lạt"), ("dalat", "Đà Lạt"),
            ("sa pa", "Sa Pa"), ("sapa", "Sa Pa"),
            ("nha trang", "Nha Trang"),
            ("hạ long", "Hạ Long"), ("ha long", "Hạ Long"),
            ("côn đảo", "Côn Đảo"), ("con dao", "Côn Đảo"),
            ("vũng tàu", "Vũng Tàu"), ("vung tau", "Vũng Tàu"),
            ("mũi né", "Mũi Né"), ("mui ne", "Mũi Né"), ("phan thiết", "Phan Thiết"),
            ("quy nhơn", "Quy Nhơn"), ("quy nhon", "Quy Nhơn"),
        ]:
            if sub_alias in dest_low:
                sub_destination = sub_canonical
                break

    max_total_budget_vnd = None
    raw_max_budget = data.get("max_total_budget_vnd") or data.get("maxTotalBudgetVnd") or data.get("max_budget_vnd")
    if raw_max_budget is not None:
        try:
            max_total_budget_vnd = int(raw_max_budget)
        except (ValueError, TypeError):
            max_total_budget_vnd = None

    raw_rejected_ids = data.get("rejected_destination_ids") or data.get("rejectedDestinationIds") or []
    if isinstance(raw_rejected_ids, list):
        rejected_destination_ids = [str(x).strip() for x in raw_rejected_ids if str(x).strip()]
    else:
        rejected_destination_ids = []

    raw_rejected_subtypes = data.get("rejected_subtypes") or data.get("rejectedSubtypes") or []
    if isinstance(raw_rejected_subtypes, list):
        rejected_subtypes = [str(x).strip().upper() for x in raw_rejected_subtypes if str(x).strip()]
    else:
        rejected_subtypes = []

    raw_custom_notes = data.get("custom_notes") or data.get("customNotes") or data.get("prompt")
    custom_notes = str(raw_custom_notes).strip() if raw_custom_notes else None
    enable_llm_narration = parse_bool(data.get("enable_llm_narration") if "enable_llm_narration" in data else data.get("enableLlmNarration"))
    enable_llm_rerank = parse_bool(data.get("enable_llm_rerank") if "enable_llm_rerank" in data else data.get("enableLlmRerank"))

    return UserConstraints(
        destination_province=destination_province,
        total_days=total_days,
        people_count=people_count,
        travel_with=travel_with,
        budget_tier=budget_tier,
        pace=pace,
        interests=interests,
        priority_interests=priority_interests,
        must_include=must_include,
        must_visit_ids=must_visit_ids,
        must_avoid=must_avoid,
        locked_items=locked_items,
        arrival_time=arrival_time,
        arrival_point=arrival_point,
        departure_time=departure_time,
        departure_point=departure_point,
        departure_type=departure_type,
        departure_buffer_min=departure_buffer_min,
        departure_travel_min=departure_travel_min,
        transit_buffer_min=transit_buffer_min,
        transport_mode=transport_mode,
        lunch_window_start=lunch_window_start,
        lunch_window_end=lunch_window_end,
        start_date=start_date,
        has_elderly=has_elderly,
        has_children=has_children,
        has_hotel=has_hotel,
        hotel_lat=hotel_lat,
        hotel_lng=hotel_lng,
        dietary_preference=dietary_preference,
        sub_destination=sub_destination,
        max_total_budget_vnd=max_total_budget_vnd,
        include_internal_diagnostics=include_internal_diagnostics,
        scheduler_mode=scheduler_mode,
        enable_llm_narration=enable_llm_narration,
        enable_llm_rerank=enable_llm_rerank,
        custom_notes=custom_notes,
        rejected_destination_ids=rejected_destination_ids,
        rejected_subtypes=rejected_subtypes,
        initial_warnings=initial_warnings
    )

def _to_plain_dict(obj: Any) -> Any:
    """Recursively converts Pydantic models, Dataclasses, lists, and dicts to primitive types."""
    if obj is None:
        return None
    if isinstance(obj, (int, float, str, bool)):
        return obj
    if isinstance(obj, list):
        return [_to_plain_dict(item) for item in obj]
    if isinstance(obj, dict):
        return {key: _to_plain_dict(value) for key, value in obj.items()}
    if hasattr(obj, "model_dump"):
        return _to_plain_dict(obj.model_dump())
    if hasattr(obj, "dict"):
        return _to_plain_dict(obj.dict())
    if dataclasses.is_dataclass(obj):
        return _to_plain_dict(dataclasses.asdict(obj))
    if hasattr(obj, "__dict__"):
        return _to_plain_dict(vars(obj))
    return str(obj)

def serialize_plan(
    plan: ItineraryPlanResponse,
    request_id: Optional[str] = None,
    include_internal_diagnostics: bool = False
) -> Dict[str, Any]:
    """
    Serializes ItineraryPlanResponse into a standard JSON-compatible Python dictionary.
    Guarantees structural equality across both server entry points.
    Omits internal_diagnostics for regular users unless include_internal_diagnostics is True.
    """
    res = _to_plain_dict(plan)
    if not isinstance(res, dict):
        res = {"result": res}

    if request_id:
        res["request_id"] = request_id
    elif "request_id" not in res:
        res["request_id"] = None

    if "warnings" not in res or res["warnings"] is None:
        res["warnings"] = []

    if not include_internal_diagnostics:
        res.pop("internal_diagnostics", None)

    return res
