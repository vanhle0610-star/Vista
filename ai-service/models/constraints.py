from typing import List, Optional, Dict, Any

try:
    from pydantic import BaseModel, Field

    class UserConstraints(BaseModel):
        destination_province: str
        total_days: int = Field(default=3, ge=1, le=7)
        people_count: int = Field(default=2, ge=1)
        travel_with: Optional[str] = "Cặp đôi / Bạn bè"
        budget_tier: str = "standard"
        pace: str = "MODERATE"
        interests: List[str] = Field(default_factory=list)
        priority_interests: List[str] = Field(default_factory=list)
        must_include: List[str] = Field(default_factory=list)
        must_visit_ids: List[str] = Field(default_factory=list)
        must_avoid: List[str] = Field(default_factory=list)
        locked_items: List[Dict[str, Any]] = Field(default_factory=list)
        arrival_time: Optional[str] = None
        arrival_point: Optional[str] = None
        arrival_lat: Optional[float] = None
        arrival_lng: Optional[float] = None
        departure_time: Optional[str] = None
        departure_point: Optional[str] = None
        departure_lat: Optional[float] = None
        departure_lng: Optional[float] = None
        departure_type: str = "TRANSPORT_DEPARTURE"
        departure_buffer_min: Optional[int] = None
        departure_travel_min: Optional[int] = None
        transit_buffer_min: int = 0
        transport_mode: str = "car"
        lunch_window_start: str = "11:30"
        lunch_window_end: str = "13:30"
        start_date: Optional[str] = None
        has_elderly: bool = False
        has_children: bool = False
        has_hotel: bool = False
        hotel_lat: Optional[float] = None
        hotel_lng: Optional[float] = None
        dietary_preference: Optional[str] = None
        sub_destination: Optional[str] = None
        max_total_budget_vnd: Optional[int] = None
        include_internal_diagnostics: bool = False
        scheduler_mode: Optional[str] = None
        enable_llm_narration: bool = False
        enable_llm_rerank: bool = False
        custom_notes: Optional[str] = None
        rejected_destination_ids: List[str] = Field(default_factory=list)
        rejected_subtypes: List[str] = Field(default_factory=list)
        initial_warnings: List[str] = Field(default_factory=list)
except ImportError:
    from dataclasses import dataclass, field

    @dataclass
    class UserConstraints:
        destination_province: str
        total_days: int = 3
        people_count: int = 2
        travel_with: Optional[str] = "Cặp đôi / Bạn bè"
        budget_tier: str = "standard"
        pace: str = "MODERATE"
        interests: List[str] = field(default_factory=list)
        priority_interests: List[str] = field(default_factory=list)
        must_include: List[str] = field(default_factory=list)
        must_visit_ids: List[str] = field(default_factory=list)
        must_avoid: List[str] = field(default_factory=list)
        locked_items: List[Dict[str, Any]] = field(default_factory=list)
        arrival_time: Optional[str] = None
        arrival_point: Optional[str] = None
        arrival_lat: Optional[float] = None
        arrival_lng: Optional[float] = None
        departure_time: Optional[str] = None
        departure_point: Optional[str] = None
        departure_lat: Optional[float] = None
        departure_lng: Optional[float] = None
        departure_type: str = "TRANSPORT_DEPARTURE"
        departure_buffer_min: Optional[int] = None
        departure_travel_min: Optional[int] = None
        transit_buffer_min: int = 0
        transport_mode: str = "car"
        lunch_window_start: str = "11:30"
        lunch_window_end: str = "13:30"
        start_date: Optional[str] = None
        has_elderly: bool = False
        has_children: bool = False
        has_hotel: bool = False
        hotel_lat: Optional[float] = None
        hotel_lng: Optional[float] = None
        dietary_preference: Optional[str] = None
        sub_destination: Optional[str] = None
        max_total_budget_vnd: Optional[int] = None
        include_internal_diagnostics: bool = False
        scheduler_mode: Optional[str] = None
        enable_llm_narration: bool = False
        enable_llm_rerank: bool = False
        custom_notes: Optional[str] = None
        rejected_destination_ids: List[str] = field(default_factory=list)
        rejected_subtypes: List[str] = field(default_factory=list)
        initial_warnings: List[str] = field(default_factory=list)
