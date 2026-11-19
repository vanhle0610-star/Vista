import os
from pathlib import Path

try:
    from dotenv import load_dotenv
    _ENV_PATH = Path(__file__).resolve().parent / ".env"
    load_dotenv(dotenv_path=_ENV_PATH, override=False)
    load_dotenv(override=False)
except ImportError:
    pass

HOST = os.getenv("HOST", "127.0.0.1")
PORT = int(os.getenv("PORT", "8000"))

ALLOWED_ORIGINS = [o.strip() for o in os.getenv("ALLOWED_ORIGINS", "http://localhost:3000,http://127.0.0.1:3000").split(",") if o.strip()]
INTERNAL_TOKEN = os.getenv("INTERNAL_TOKEN", "")
DEV = os.getenv("DEV", "0") == "1"

LLM_PROVIDER = os.getenv("LLM_PROVIDER", "openai_compatible")
LLM_BASE_URL = os.getenv("LLM_BASE_URL", "")
LLM_API_KEY = os.getenv("LLM_API_KEY")
LLM_API_KEYS = os.getenv("LLM_API_KEYS", "")
GEMINI_API_KEYS = os.getenv("GEMINI_API_KEYS", "")
LLM_MODEL = os.getenv("LLM_MODEL", "gpt-4o-mini")

_ACTIVE_LLM_KEY_INDEX = 0


def get_llm_key_pool():
    """Returns deduplicated ordered list of configured LLM/Gemini API keys."""
    raw_sources = [
        os.getenv("LLM_API_KEYS", LLM_API_KEYS),
        os.getenv("GEMINI_API_KEYS", GEMINI_API_KEYS),
        os.getenv("LLM_API_KEY", LLM_API_KEY or ""),
        os.getenv("GEMINI_API_KEY", ""),
    ]
    if LLM_API_KEY and str(LLM_API_KEY).strip():
        raw_sources.insert(0, str(LLM_API_KEY))
    pool = []
    seen = set()
    for src in raw_sources:
        if not src:
            continue
        for part in str(src).split(","):
            k = part.strip()
            if k and k not in seen:
                seen.add(k)
                pool.append(k)
    return pool


def get_ordered_llm_keys():
    """Returns key pool rotated to start from the currently healthy active key index."""
    pool = get_llm_key_pool()
    if not pool:
        return []
    idx = _ACTIVE_LLM_KEY_INDEX % len(pool)
    return pool[idx:] + pool[:idx]


def rotate_llm_key(failed_key: str) -> None:
    """Advances active key index when a key hits quota (429), auth error (401/403), or server outage."""
    global _ACTIVE_LLM_KEY_INDEX
    pool = get_llm_key_pool()
    if len(pool) <= 1:
        return
    try:
        idx = pool.index(failed_key)
        _ACTIVE_LLM_KEY_INDEX = (idx + 1) % len(pool)
    except ValueError:
        _ACTIVE_LLM_KEY_INDEX = (_ACTIVE_LLM_KEY_INDEX + 1) % len(pool)

DESTINATIONS_DATA_PATH = os.getenv("DESTINATIONS_DATA_PATH", "../backend/src/main/resources/db/seed/demo_destinations_seed.csv")

# ==============================================================================
# HARD FEASIBILITY & TRANSIT CEILINGS (Giai đoạn 1.1)
# ==============================================================================
MAX_LEG_MINUTES_DEFAULT = 60
MAX_LEG_MINUTES_ELDERLY = 40
MAX_LEG_MINUTES_CHILDREN = 45

MAX_DAILY_TRANSIT_MINUTES_DEFAULT = 150
MAX_DAILY_TRANSIT_MINUTES_ELDERLY = 95
MAX_DAILY_TRANSIT_MINUTES_CHILDREN = 110


def get_max_leg_minutes(has_elderly: bool = False, has_children: bool = False) -> int:
    """Trả về trần thời gian di chuyển mỗi chặng (phút), lấy mức nghiêm nhất nếu có cả hai."""
    limits = [MAX_LEG_MINUTES_DEFAULT]
    if has_elderly:
        limits.append(MAX_LEG_MINUTES_ELDERLY)
    if has_children:
        limits.append(MAX_LEG_MINUTES_CHILDREN)
    return min(limits)


def get_max_daily_transit_minutes(has_elderly: bool = False, has_children: bool = False) -> int:
    """Trả về trần tổng thời gian di chuyển trong một ngày (phút), lấy mức nghiêm nhất nếu có cả hai."""
    limits = [MAX_DAILY_TRANSIT_MINUTES_DEFAULT]
    if has_elderly:
        limits.append(MAX_DAILY_TRANSIT_MINUTES_ELDERLY)
    if has_children:
        limits.append(MAX_DAILY_TRANSIT_MINUTES_CHILDREN)
    return min(limits)

# ==============================================================================
# CENTRALIZED BUDGET TIER CONSTANTS (Single Source of Truth)
# ==============================================================================
VALID_BUDGET_TIERS = {"economy", "standard", "luxury"}
BUDGET_TIER_ALIASES = {"premium": "luxury"}

ROOM_RATES_PER_NIGHT = {
    "economy": 450000,
    "standard": 850000,
    "luxury": 2200000
}

DAILY_TRANSPORT_RATES = {
    "economy": 150000,
    "standard": 350000,
    "luxury": 800000
}

DAILY_MEAL_RATES = {
    "economy": 135000,    # ~35k breakfast, ~45k lunch, ~55k dinner
    "standard": 290000,   # ~50k breakfast, ~110k lunch, ~130k dinner
    "luxury": 780000      # ~120k buffet breakfast, ~280k lunch, ~380k dinner
}

MAX_ACTIVITY_PRICE_BY_TIER = {
    "economy": 500000,
    "standard": 2000000,
    "luxury": 10000000
}

CONTINGENCY_RATE = 0.10      # 10% backup buffer
MIN_FLUCTUATION_RATE = 0.85
MAX_FLUCTUATION_RATE = 1.25

# ==============================================================================
# PACE POLICIES & ALIASES (Mục 3, 4, 5, 6)
# ==============================================================================
PACE_ALIASES = {
    "relaxed": "RELAXED",
    "thư thả": "RELAXED",
    "thu tha": "RELAXED",
    "thong thả": "RELAXED",
    "thong tha": "RELAXED",
    "chill": "RELAXED",
    "nhẹ nhàng": "RELAXED",
    "nhe nhang": "RELAXED",
    "slow": "RELAXED",
    "moderate": "MODERATE",
    "cân bằng": "MODERATE",
    "can bang": "MODERATE",
    "vừa phải": "MODERATE",
    "vua phai": "MODERATE",
    "normal": "MODERATE",
    "standard": "MODERATE",
    "intensive": "INTENSIVE",
    "đi nhiều": "INTENSIVE",
    "di nhieu": "INTENSIVE",
    "dày đặc": "INTENSIVE",
    "day dac": "INTENSIVE",
    "nhiều điểm": "INTENSIVE",
    "fast": "INTENSIVE",
    "packed": "INTENSIVE",
}

PACE_POLICIES = {
    "RELAXED": {
        "max_stops_per_day": 3,
        "ideal_sightseeing_stops": 2,
        "duration_multiplier": 1.20,
        "insert_cafe_or_rest": True,
        "default_buffer_min": 20,
        "max_daily_transit_factor": 0.80,
    },
    "MODERATE": {
        "max_stops_per_day": 4,
        "ideal_sightseeing_stops": 3,
        "duration_multiplier": 1.00,
        "insert_cafe_or_rest": False,
        "default_buffer_min": 15,
        "max_daily_transit_factor": 1.00,
    },
    "INTENSIVE": {
        "max_stops_per_day": 5,
        "ideal_sightseeing_stops": 4,
        "duration_multiplier": 0.85,
        "insert_cafe_or_rest": False,
        "default_buffer_min": 10,
        "max_daily_transit_factor": 1.10,
    },
}


def normalize_pace(raw_pace: str) -> str:
    if not raw_pace:
        return "MODERATE"
    clean = str(raw_pace).strip().lower()
    if clean in PACE_ALIASES:
        return PACE_ALIASES[clean]
    upper = clean.upper()
    if upper in PACE_POLICIES:
        return upper
    return "MODERATE"


# ==============================================================================
# NAMED RANKING CRITERIA WEIGHTS (Mục 4 & 6)
# ==============================================================================
RANKING_WEIGHTS = {
    "priority_interest_match": 85.0,
    "secondary_interest_match": 35.0,
    "must_visit_inclusion": 500.0,
    "locked_item_preserved": 1000.0,
    "transit_penalty_per_min": 2.2,
    "wait_penalty_per_min": 1.8,
    "subtype_repeat_penalty": 45.0,
    "unverified_hours_penalty": 12.0,
    "pace_fit_bonus": 40.0,
    "replan_stability_bonus": 60.0,
    "meal_window_fit_bonus": 35.0,
    "cafe_break_fit_bonus": 30.0,
    "micro_pair_proximity_bonus": 28.0,
    "golden_hour_bonus": 32.0,
    "curated_landmark_bonus": 18.0,
}

# ==============================================================================
# DEPARTURE & LUNCH WINDOW DEFAULTS (Mục 5 & 7)
# ==============================================================================
DEFAULT_FLIGHT_DEPARTURE_BUFFER_MIN = 90
DEFAULT_TRANSIT_BUFFER_MIN = 0
DEFAULT_LUNCH_WINDOW_START_MIN = 11 * 60 + 30  # 11:30
DEFAULT_LUNCH_WINDOW_END_MIN = 13 * 60 + 30    # 13:30
ADMIN_INSPECT_TOKEN = os.getenv("ADMIN_INSPECT_TOKEN", "vista-admin-inspect")

# ==============================================================================
# DATA QUALITY THRESHOLDS (Task 3 & P0-1)
# ==============================================================================
SNACK_PRICE_THRESHOLD_DRINKS = 40000   # Chè, cà phê, trà > 40,000 VND
SNACK_PRICE_THRESHOLD_SNACKS = 60000   # Bánh mì, đồ ăn vặt khác > 60,000 VND
DATA_STALE_THRESHOLD_DAYS = int(os.getenv("DATA_STALE_THRESHOLD_DAYS", "180"))

def validate_server_startup():
    """
    Validates security requirements before starting HTTP server:
    If INTERNAL_TOKEN is empty and DEV is not '1', refuse to start with clear error.
    If DEV is '1' and INTERNAL_TOKEN is empty, print warning.
    """
    token = os.getenv("INTERNAL_TOKEN", INTERNAL_TOKEN).strip()
    is_dev = os.getenv("DEV", "1" if DEV else "0").strip() == "1"

    if not token:
        if not is_dev:
            raise RuntimeError(
                "CRITICAL SECURITY CONFIGURATION ERROR: INTERNAL_TOKEN is not configured! "
                "The server refuses to start in production without an internal authentication token. "
                "Set INTERNAL_TOKEN in your environment or set DEV=1 for local development only."
            )
        else:
            print("[SECURITY WARNING] Running in DEV mode (DEV=1) without INTERNAL_TOKEN. Endpoint authentication is disabled for development.")
