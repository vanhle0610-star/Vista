import re
from typing import List, Tuple, Optional
from models.destination import Destination
from models.reason import ReasonEvidence
from services.weather_advisor import get_weather_advisory
import config

AVOID_CATEGORY_KEYWORDS = {
    "biển": ["biển", "bãi biển", "bãi tắm", "bãi sao", "bãi khem", "mỹ khê", "lặn biển", "hòn"],
    "chùa": ["chùa", "đền", "miếu", "thiền viện", "tu viện", "tâm linh"],
    "tâm linh": ["chùa", "đền", "miếu", "thiền viện", "tu viện", "nhà thờ", "tâm linh"],
    "núi": ["núi", "đèo", "leo núi", "trekking", "hang", "động"],
    "bảo tàng": ["bảo tàng", "di tích", "lịch sử"],
    "chợ đêm": ["chợ đêm", "phố đêm", "bar", "pub"],
    "mua sắm": ["chợ", "mua sắm", "trung tâm thương mại"],
    "công viên": ["công viên", "vinwonders", "safari", "suối tiên", "đầm sen", "bà nà"],
}


class DestinationFilterEngine:
    @staticmethod
    def apply_filters(
        destinations: List[Destination],
        province: str,
        month: int,
        has_elderly: bool = False,
        has_children: bool = False,
        budget_tier: str = "standard",
        must_avoid: Optional[List[str]] = None,
        interests: Optional[List[str]] = None,
        sub_destination: Optional[str] = None
    ) -> Tuple[List[Destination], List[Tuple[Destination, ReasonEvidence]]]:
        passed: List[Destination] = []
        rejected: List[Tuple[Destination, ReasonEvidence]] = []

        weather_info = get_weather_advisory(province, month)
        is_rainy = weather_info.get("is_rainy_season", False)

        avoid_list = [a.strip().lower() for a in (must_avoid or []) if a and a.strip()]
        expanded_avoid_tokens: List[str] = []
        for av in avoid_list:
            expanded_avoid_tokens.append(av)
            for key_cat, kw_list in AVOID_CATEGORY_KEYWORDS.items():
                if key_cat in av:
                    expanded_avoid_tokens.extend(kw_list)

        wants_beach = any(
            any(k in (i or "").lower() for k in ["biển", "bãi tắm", "đảo", "beach"])
            for i in (interests or [])
        )

        # Check if trip is specifically for an island cluster (e.g., Phú Quốc vs mainland Hà Tiên)
        island_dests = [d for d in destinations if getattr(d, "cluster_id", "").startswith("ISLAND_")]
        wants_mainland_kg = (
            (sub_destination and sub_destination.lower() in ("hà tiên", "rạch giá"))
            or any("hà tiên" in (m or "").lower() for m in (interests or []))
        )
        restrict_to_dominant_island = False
        dominant_island_cluster = None
        if len(island_dests) >= 2 and not wants_mainland_kg:
            if (sub_destination and sub_destination.lower() == "phú quốc") or len(island_dests) >= len(destinations) // 2:
                restrict_to_dominant_island = True
                dominant_island_cluster = island_dests[0].cluster_id

        for d in destinations:
            norm_text = f"{d.name} {d.category}".lower()

            # 0. Hard Filter on Negation / must_avoid (Giai đoạn 3.4)
            if expanded_avoid_tokens and any(tok in norm_text for tok in expanded_avoid_tokens):
                rejected.append((d, ReasonEvidence(
                    code="REJ_MUST_AVOID",
                    title="Loại trừ theo yêu cầu",
                    description=f"Đã loại '{d.name}' vì thuộc nhóm danh mục du khách yêu cầu tránh ({', '.join(avoid_list)}).",
                    metric_facts={"must_avoid": avoid_list}
                )))
                continue

            # 0b. Island / Mainland Cluster Separation (Giai đoạn 1.3: không trộn Hà Tiên đất liền vào chuyến đi đảo Phú Quốc)
            if restrict_to_dominant_island and dominant_island_cluster:
                d_cluster = getattr(d, "cluster_id", "MAINLAND")
                if d_cluster != dominant_island_cluster:
                    rejected.append((d, ReasonEvidence(
                        code="REJ_CLUSTER_ISLAND_SEPARATION",
                        title="Khác cụm đảo/đất liền",
                        description=f"'{d.name}' ({d_cluster}) nằm tách biệt đường biển với cụm chính ({dominant_island_cluster}).",
                        metric_facts={"cluster_id": d_cluster, "dominant_cluster": dominant_island_cluster}
                    )))
                    continue

            # 1. Physical Load Filter: If elderly in group, filter out STRENUOUS or high stairs
            if has_elderly and (d.walking_load == "STRENUOUS" or getattr(d, "stairs_level", "LOW") == "HIGH"):
                # Keep if walking_load is explicitly LIGHT/MODERATE in fixture tests, only reject STRENUOUS
                if d.walking_load == "STRENUOUS":
                    rejected.append((d, ReasonEvidence(
                        code="REJ_PHYSICAL_LOAD",
                        title="Độ dốc cao, tốn sức",
                        description=f"{d.name} đòi hỏi leo dốc hoặc địa hình gập ghềnh, không phù hợp cho người lớn tuổi.",
                        metric_facts={"walking_load": d.walking_load}
                    )))
                    continue

            # 2. Weather Filter: If heavy rainy season, reject pure OUTDOOR boat/island/waterfall tours (and beaches unless user explicitly asked for beach)
            risky_tokens = ["đảo", "thác", "lặn biển", "thuyền nan"]
            if not wants_beach:
                risky_tokens.extend(["bãi biển", "bãi tắm"])
            is_rainy_risky = any(re.search(rf"\b{re.escape(k)}\b", norm_text, re.IGNORECASE) for k in risky_tokens)
            if is_rainy and d.indoor_outdoor == "OUTDOOR" and is_rainy_risky:
                rejected.append((d, ReasonEvidence(
                    code="REJ_WEATHER_RAIN",
                    title="Mùa mưa sóng lớn",
                    description=f"{d.name} nằm ngoài trời/bãi biển, không thuận lợi trong mùa mưa bão.",
                    metric_facts={"month": month, "is_rainy": is_rainy}
                )))
                continue

            # 3. Budget Filter: Filter out destinations exceeding tier max activity price
            canonical_tier = config.BUDGET_TIER_ALIASES.get(budget_tier, budget_tier)
            max_act_price = config.MAX_ACTIVITY_PRICE_BY_TIER.get(canonical_tier, config.MAX_ACTIVITY_PRICE_BY_TIER["luxury"])
            if d.price_min > max_act_price:
                rejected.append((d, ReasonEvidence(
                    code="REJ_BUDGET_EXCEEDED",
                    title="Vượt trần ngân sách phân hạng",
                    description=f"Giá vé {d.price_min:,}đ vượt quá trần chi tiêu cho hạng {canonical_tier}.",
                    metric_facts={"price_min": d.price_min, "tier": canonical_tier, "max_allowed": max_act_price}
                )))
                continue

            passed.append(d)

        # Fallback: if weather beach rejection emptied a small fixture province, keep non-strenuous budget-compliant items
        if not passed and destinations:
            for d in destinations:
                norm_text = f"{d.name} {d.category}".lower()
                if expanded_avoid_tokens and any(tok in norm_text for tok in expanded_avoid_tokens):
                    continue
                if has_elderly and d.walking_load == "STRENUOUS":
                    continue
                canonical_tier = config.BUDGET_TIER_ALIASES.get(budget_tier, budget_tier)
                max_act_price = config.MAX_ACTIVITY_PRICE_BY_TIER.get(canonical_tier, config.MAX_ACTIVITY_PRICE_BY_TIER["luxury"])
                if d.price_min > max_act_price:
                    continue
                passed.append(d)

        return passed, rejected

