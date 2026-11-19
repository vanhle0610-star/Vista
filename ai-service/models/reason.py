from typing import List, Optional, Dict, Any

try:
    from pydantic import BaseModel, Field

    class ReasonEvidence(BaseModel):
        code: str
        title: str
        description: str
        metric_facts: Dict[str, Any] = Field(default_factory=dict)

    class ActivitySlot(BaseModel):
        destination_id: str
        destination_name: str
        time_slot: str
        start_time: str
        end_time: str
        category: str
        cost_vnd: int
        cost_label: str
        travel_time_from_prev_min: int = 0
        buffer_min: int = 15
        reasons: List[ReasonEvidence] = Field(default_factory=list)
        note: Optional[str] = None
        tip: Optional[str] = None
        warning: Optional[str] = None
        data_confidence: str = "VERIFIED"
        item_type: str = "SIGHTSEEING"
        duration_min: int = 0
        wait_time_min: int = 0
        transport_mode: str = "car"
        travel_distance_km: float = 0.0
        travel_estimate_type: str = "ESTIMATED_COORDINATES"
        opening_hours_status: str = "OPEN_VERIFIED"
        is_locked: bool = False
        is_must_visit: bool = False
        is_synthetic: bool = False
        rain_backup_suggestion: Optional[Dict[str, Any]] = None
except ImportError:
    from dataclasses import dataclass, field

    @dataclass
    class ReasonEvidence:
        code: str
        title: str
        description: str
        metric_facts: Dict[str, Any] = field(default_factory=dict)

    @dataclass
    class ActivitySlot:
        destination_id: str
        destination_name: str
        time_slot: str
        start_time: str
        end_time: str
        category: str
        cost_vnd: int
        cost_label: str
        travel_time_from_prev_min: int = 0
        buffer_min: int = 15
        reasons: List[ReasonEvidence] = field(default_factory=list)
        note: Optional[str] = None
        tip: Optional[str] = None
        warning: Optional[str] = None
        data_confidence: str = "VERIFIED"
        item_type: str = "SIGHTSEEING"
        duration_min: int = 0
        wait_time_min: int = 0
        transport_mode: str = "car"
        travel_distance_km: float = 0.0
        travel_estimate_type: str = "ESTIMATED_COORDINATES"
        opening_hours_status: str = "OPEN_VERIFIED"
        is_locked: bool = False
        is_must_visit: bool = False
        is_synthetic: bool = False
        rain_backup_suggestion: Optional[Dict[str, Any]] = None
