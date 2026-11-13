from typing import List, Optional, Dict, Any

try:
    from pydantic import BaseModel, Field
    class Destination(BaseModel):
        id: str
        name: str
        province: str
        category: str
        latitude: float
        longitude: float
        price_min: int = Field(default=0, ge=0)
        price_max: int = Field(default=0, ge=0)
        price_unit: str = "VND"
        description: Optional[str] = ""
        photo_url: Optional[str] = ""
        opening_hours: Optional[Dict[str, str]] = Field(default_factory=dict)
        avg_duration_min: int = Field(default=90, ge=15)
        walking_load: str = Field(default="MODERATE", description="LIGHT, MODERATE, STRENUOUS")
        indoor_outdoor: str = Field(default="OUTDOOR", description="INDOOR, OUTDOOR, MIXED")
        suitable_slots: List[str] = Field(default_factory=lambda: ["MORNING", "AFTERNOON"])
        local_tip: Optional[str] = None
        photo_tips: Optional[str] = None
        last_verified_at: Optional[str] = None
        data_source: str = "VISTA_CURATED"
        auto_classified: bool = False
        classification_evidence: List[str] = Field(default_factory=list)
        cluster_id: str = "MAINLAND"
        sub_region: Optional[str] = None
        best_time: str = "ANY"
        min_duration_min: int = 45
        requires_booking: bool = False
        stairs_level: str = "LOW"
except ImportError:
    from dataclasses import dataclass, field
    @dataclass
    class Destination:
        id: str
        name: str
        province: str
        category: str
        latitude: float
        longitude: float
        price_min: int = 0
        price_max: int = 0
        price_unit: str = "VND"
        description: Optional[str] = ""
        photo_url: Optional[str] = ""
        opening_hours: Optional[Dict[str, str]] = field(default_factory=dict)
        avg_duration_min: int = 90
        walking_load: str = "MODERATE"
        indoor_outdoor: str = "OUTDOOR"
        suitable_slots: List[str] = field(default_factory=lambda: ["MORNING", "AFTERNOON"])
        local_tip: Optional[str] = None
        photo_tips: Optional[str] = None
        last_verified_at: Optional[str] = None
        data_source: str = "VISTA_CURATED"
        auto_classified: bool = False
        classification_evidence: List[str] = field(default_factory=list)
        cluster_id: str = "MAINLAND"
        sub_region: Optional[str] = None
        best_time: str = "ANY"
        min_duration_min: int = 45
        requires_booking: bool = False
        stairs_level: str = "LOW"
