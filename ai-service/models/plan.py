from typing import List, Optional, Dict, Any
from models.reason import ActivitySlot

try:
    from pydantic import BaseModel, Field

    class DaySchedule(BaseModel):
        day_number: int
        date_label: str
        title: str
        day_rationale: str
        activities: List[ActivitySlot] = Field(default_factory=list)
        subtotal_cost_vnd: int = 0
        day_status: str = "ACTIVE"
        status_reason: Optional[str] = None
        departure_info: Optional[Dict[str, Any]] = None

    class ItineraryPlanResponse(BaseModel):
        destination_province: str
        total_days: int
        people_count: int
        budget_tier: str
        estimated_total_cost_vnd: int
        min_fluctuation_vnd: int
        max_fluctuation_vnd: int
        days: List[DaySchedule]
        engine_version: str = "v2.0-deterministic"
        data_version: str = "646-curated-2026.11"
        fallback_used: bool = False
        warnings: List[str] = Field(default_factory=list)
        breakdown: Optional[dict] = None
        request_id: Optional[str] = None
        pace: str = "MODERATE"
        schedule_status: str = "FEASIBLE"
        conflicts: List[Dict[str, Any]] = Field(default_factory=list)
        replan_diff: Optional[Dict[str, Any]] = None
        assumptions: List[str] = Field(default_factory=list)
        internal_diagnostics: Optional[Dict[str, Any]] = None
except ImportError:
    from dataclasses import dataclass, field

    @dataclass
    class DaySchedule:
        day_number: int
        date_label: str
        title: str
        day_rationale: str
        activities: List[ActivitySlot] = field(default_factory=list)
        subtotal_cost_vnd: int = 0
        day_status: str = "ACTIVE"
        status_reason: Optional[str] = None
        departure_info: Optional[Dict[str, Any]] = None

    @dataclass
    class ItineraryPlanResponse:
        destination_province: str
        total_days: int
        people_count: int
        budget_tier: str
        estimated_total_cost_vnd: int
        min_fluctuation_vnd: int
        max_fluctuation_vnd: int
        days: List[DaySchedule]
        engine_version: str = "v2.0-deterministic"
        data_version: str = "646-curated-2026.11"
        fallback_used: bool = False
        warnings: List[str] = field(default_factory=list)
        breakdown: Optional[dict] = None
        request_id: Optional[str] = None
        pace: str = "MODERATE"
        schedule_status: str = "FEASIBLE"
        conflicts: List[Dict[str, Any]] = field(default_factory=list)
        replan_diff: Optional[Dict[str, Any]] = None
        assumptions: List[str] = field(default_factory=list)
        internal_diagnostics: Optional[Dict[str, Any]] = None
