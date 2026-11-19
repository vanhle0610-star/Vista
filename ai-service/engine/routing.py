import itertools
from typing import List, Optional, Tuple, Dict
from models.destination import Destination
from models.reason import ActivitySlot
from models.constraints import UserConstraints
from engine.timeline import (
    DailyTimelineEngine,
    extract_opening_closing,
    extract_open_intervals_for_day,
    get_day_weekday_and_date,
    is_food_destination,
    is_slot_suitable,
    time_to_minutes
)
from engine.scoring import DestinationScoringEngine
from services.geo_calculator import (
    haversine_km,
    estimate_transit_time_minutes,
    are_clusters_same_day_compatible
)
import config


import re

_CONCEPT_STOPWORDS = {
    "khu", "du", "lịch", "công", "viên", "chùa", "đền", "miếu", "nhà", "thờ", "bảo", "tàng",
    "bãi", "biển", "hồ", "núi", "đỉnh", "thác", "chợ", "quán", "cà", "phê", "phố", "đảo",
    "quần", "làng", "vườn", "quốc", "gia", "suối", "đèo", "hang", "động", "cầu", "di", "tích",
    "thành", "phường", "hội", "tượng", "đài", "cổ", "trung", "tâm", "sinh", "thái", "nghỉ", "dưỡng",
    "cồn", "tháp", "vịnh", "bản", "rừng", "ruộng", "đồi", "suối", "ghềnh", "mũi",
    # Provincial & geographic words that shouldn't falsely trigger same-concept duplicates
    "việt", "nam", "trung", "đông", "tây", "bắc", "thanh", "hoàng", "nguyễn", "quang",
    "kon", "tum", "gia", "lai", "đắk", "lắk", "nông", "lâm", "đồng", "khánh", "hòa",
    "bình", "định", "thuận", "dương", "phước", "ninh", "hưng", "yên", "thái", "hải",
    "quảng", "ngãi", "trị", "nghệ", "tĩnh", "sơn", "lào", "cai", "châu", "bái",
    "kiên", "giang", "tiền", "hậu", "sóc", "trăng", "bạc", "liêu", "cà", "mau",
    "vĩnh", "long", "trà", "bến", "tre", "cần", "thơ", "vũng", "tàu", "phú", "quốc", "huế", "nội", "sài", "gòn"
}

STRICT_DIVERSITY_SUBTYPES = {
    "CAFE", "THEME_PARK", "BEACH", "MOUNTAIN", "TEMPLE", "MUSEUM", "TOWER", "VILLAGE", "MARKET", "NIGHT_MARKET"
}


def _get_broad_subtype(dest: Destination) -> str:
    txt = f"{dest.name} {dest.category}".lower()
    if any(k in txt for k in ["chợ đêm", "phố đêm", "phố đi bộ", "phố ẩm thực"]):
        return "NIGHT_MARKET"
    if "chợ " in txt or txt.startswith("chợ"):
        return "MARKET"
    if any(k in txt for k in ["cà phê", "cafe", "coffee", "trà sữa", "roastery", "tiệm trà", "bakery"]):
        return "CAFE"
    if any(k in txt for k in ["vinwonders", "vinpearl", "safari", "sun world", "sunworld", "bà nà", "grand world", "công viên", "khu vui chơi", "giải trí", "suối tiên", "đầm sen", "đại nam", "thủy cung"]):
        return "THEME_PARK"
    if any(k in txt for k in ["vườn quốc gia", "khu bảo tồn", "rừng tràm", "rừng ngập"]):
        return "NATIONAL_PARK"
    if "lăng " in txt:
        return "TOMB"
    if any(k in txt for k in ["chùa", "đền", "miếu", "nhà thờ", "thiền viện", "tu viện", "thánh thất", "hội quán", "phủ ", "đình "]):
        return "TEMPLE"
    if "tháp " in txt:
        return "TOWER"
    if any(k in txt for k in ["bảo tàng", "di tích", "thành cổ", "nhà tù", "khu chứng tích", "địa đạo", "dinh "]):
        return "MUSEUM"
    if any(k in txt for k in ["làng nghề", "làng gốm", "làng hoa", "làng rèn", "làng nón", "làng tranh", "làng cổ", "làng "]):
        return "VILLAGE"
    if is_food_destination(dest):
        return "FOOD"
    if any(k in txt for k in ["bãi biển", "bãi tắm", "bãi sao", "bãi khem", "bãi dài", "bãi trường", "biển ", "đảo ", "quần đảo", "hòn ", "vịnh "]):
        return "BEACH"
    if any(k in txt for k in ["núi ", "đỉnh ", "đèo ", "hang ", "động ", "thác ", "cổng trời", "đồi "]):
        return "MOUNTAIN"
    return dest.category.lower().strip()


def _get_brand_family(dest: Destination) -> str:
    name_low = dest.name.lower()
    if any(k in name_low for k in ["vinwonders", "vinpearl", "grand world", "vincom"]):
        return "VIN"
    if any(k in name_low for k in ["sun world", "sunworld", "hòn thơm", "cáp treo bà nà"]):
        return "SUN_WORLD"
    if "flc " in name_low:
        return "FLC"
    if "ttc " in name_low:
        return "TTC"
    if "novaworld" in name_low:
        return "NOVAWORLD"
    return ""


def _share_same_core_concept(d1: Destination, d2: Destination) -> bool:
    if d1.id == d2.id:
        return True
    b1 = _get_brand_family(d1)
    b2 = _get_brand_family(d2)
    if b1 and b2 and b1 == b2:
        return True
    t1 = [w for w in re.findall(r"[a-zà-ỹ0-9]+", d1.name.lower()) if len(w) >= 3 and w not in _CONCEPT_STOPWORDS]
    t2 = [w for w in re.findall(r"[a-zà-ỹ0-9]+", d2.name.lower()) if len(w) >= 3 and w not in _CONCEPT_STOPWORDS]
    if t1 and t2 and t1[0] == t2[0] and t1[0] not in _CONCEPT_STOPWORDS:
        return True
    return False


def diversify_clusters_across_days(
    day_clusters: List[List[Destination]],
    pinned_ids: Optional[set] = None
) -> List[List[Destination]]:
    """
    Rebalances destinations across multi-day clusters before daily routing so duplicate
    subtypes/brands (e.g. 2 Vin parks, 2 waterfalls, 2 beaches, 2+ temples) are spread across
    separate days whenever geographically compatible alternatives exist on other days.
    """
    if len(day_clusters) <= 1:
        return day_clusters

    pinned = pinned_ids or set()
    n_days = len(day_clusters)

    for _ in range(2):
        changed = False
        for d1_idx in range(n_days):
            c1 = day_clusters[d1_idx]
            if len(c1) < 2:
                continue
            seen_sts = set()
            for i1, item in enumerate(list(c1)):
                st1 = _get_broad_subtype(item)
                has_conflict = (
                    (st1 in STRICT_DIVERSITY_SUBTYPES and st1 in seen_sts)
                    or any(_share_same_core_concept(item, prev) for prev in c1[:i1])
                )
                seen_sts.add(st1)
                if not has_conflict or item.id in pinned:
                    continue

                # Try swapping `item` with a non-conflicting compatible stop from another day
                swapped = False
                for d2_idx in range(n_days):
                    if d2_idx == d1_idx:
                        continue
                    c2 = day_clusters[d2_idx]
                    c2_sts = {_get_broad_subtype(x) for x in c2}
                    if st1 in c2_sts or any(_share_same_core_concept(item, x) for x in c2):
                        continue
                    for i2, cand in enumerate(c2):
                        if cand.id in pinned:
                            continue
                        if not are_clusters_same_day_compatible(
                            getattr(item, "cluster_id", "MAINLAND"),
                            getattr(cand, "cluster_id", "MAINLAND")
                        ):
                            continue
                        st2 = _get_broad_subtype(cand)
                        if (st2 in STRICT_DIVERSITY_SUBTYPES and st2 in seen_sts) or any(
                            _share_same_core_concept(cand, x) for j, x in enumerate(c1) if j != i1
                        ):
                            continue
                        c1[i1] = cand
                        c2[i2] = item
                        swapped = True
                        changed = True
                        break
                    if swapped:
                        break
        if not changed:
            break
    return day_clusters


class DayRoutingOptimizer:
    @staticmethod
    def _is_food_destination(dest: Destination) -> bool:
        return is_food_destination(dest)

    @classmethod
    def _is_evening_destination(cls, dest: Destination, weekday_key: Optional[str] = None, date_str: Optional[str] = None) -> bool:
        return is_slot_suitable(dest, "EVENING", weekday_key, date_str)

    @classmethod
    def score_simulated_timeline(
        cls,
        sim_slots: List[ActivitySlot],
        dest_map: Dict[str, Destination],
        constraints: UserConstraints
    ) -> float:
        """
        Scores a simulated day timeline based ONLY on the activities actually scheduled in `sim_slots`
        and the actual simulated start/end/wait/transit times (Section 4 & Section 6).
        """
        if not sim_slots:
            return -1e9

        pace = config.normalize_pace(getattr(constraints, "pace", "MODERATE"))
        pace_policy = config.PACE_POLICIES.get(pace, config.PACE_POLICIES["MODERATE"])
        w = config.RANKING_WEIGHTS

        total_score = 0.0
        seen_subtypes = set()
        seen_brands = set()
        total_transit = 0
        total_wait = 0
        has_lunch_meal = False
        has_cafe_rest = False
        cafe_count = 0
        theme_park_count = 0
        non_noon_food_count = 0
        sightseeing_count = 0

        prev_prev_dest = None
        prev_dest = None
        prev_st = None
        prev_brand = ""
        for idx, slot in enumerate(sim_slots):
            dest = dest_map.get(slot.destination_id)
            if dest:
                base_s = DestinationScoringEngine.calculate_score(dest, constraints, slot.time_slot)
                total_score += base_s
                st = _get_broad_subtype(dest)
                brand = _get_brand_family(dest)
                if st in STRICT_DIVERSITY_SUBTYPES and st in seen_subtypes:
                    total_score -= 360.0 if st in ("CAFE", "THEME_PARK", "MOUNTAIN", "BEACH", "TEMPLE") else w["subtype_repeat_penalty"]
                seen_subtypes.add(st)

                if prev_dest is not None and _share_same_core_concept(prev_dest, dest):
                    total_score -= 450.0
                elif brand:
                    if brand in seen_brands:
                        total_score -= 420.0
                    seen_brands.add(brand)

                if st == "CAFE":
                    cafe_count += 1
                    if cafe_count > 1:
                        total_score -= 350.0 * (cafe_count - 1)
                elif st == "THEME_PARK":
                    theme_park_count += 1
                    if theme_park_count > 1:
                        total_score -= 400.0 * (theme_park_count - 1)
                    sightseeing_count += 1
                elif st == "FOOD":
                    if slot.time_slot != "NOON":
                        non_noon_food_count += 1
                else:
                    sightseeing_count += 1

                # Strongly penalize back-to-back same subtypes or food+food
                if prev_st == st and st in STRICT_DIVERSITY_SUBTYPES:
                    total_score -= 450.0
                elif prev_brand and brand and prev_brand == brand:
                    total_score -= 450.0
                elif prev_st == "FOOD" and st == "FOOD":
                    total_score -= 350.0

                # Morning slot should anchor on sightseeing rather than a restaurant/cafe when landmarks exist
                if idx == 0 and slot.time_slot == "MORNING" and st in ("CAFE", "FOOD"):
                    total_score -= 120.0

                # Golden Hour & Morning Major Complex Bonus
                try:
                    s_min = time_to_minutes(slot.start_time)
                    e_min = time_to_minutes(slot.end_time)
                    txt_low = f"{dest.name} {dest.category}".lower()
                    is_sunset_spot = any(
                        k in txt_low
                        for k in ["hoàng hôn", "sunset", "ngắm cảnh", "đồi", "mũi", "cầu", "sông", "rooftop", "bãi biển"]
                    )
                    if is_sunset_spot and s_min <= 18 * 60 and e_min >= 16 * 60 + 15:
                        total_score += w.get("golden_hour_bonus", 32.0)
                    elif getattr(dest, "min_duration_min", 60) >= 150 and s_min <= 9 * 60 + 15:
                        total_score += w.get("golden_hour_bonus", 32.0)
                except Exception:
                    pass

                # Micro-Pairing Bonus: Only pair a meal/cafe WITH a sightseeing stop (never CAFE+CAFE or FOOD+FOOD)
                if idx > 0 and prev_dest is not None:
                    is_cur_meal_or_cafe = (
                        slot.time_slot == "NOON"
                        or getattr(slot, "item_type", "") in ("MEAL", "MEAL_BREAK", "CAFE_REST")
                        or st in ("FOOD", "CAFE")
                    )
                    prev_slot = sim_slots[idx - 1]
                    is_prev_meal_or_cafe = (
                        prev_slot.time_slot == "NOON"
                        or getattr(prev_slot, "item_type", "") in ("MEAL", "MEAL_BREAK", "CAFE_REST")
                        or (prev_st in ("FOOD", "CAFE"))
                    )
                    if is_cur_meal_or_cafe != is_prev_meal_or_cafe:
                        hav_d = haversine_km(prev_dest.latitude, prev_dest.longitude, dest.latitude, dest.longitude)
                        if hav_d <= 1.2 or float(getattr(slot, "travel_distance_km", 99.0) or 99.0) <= 1.5:
                            total_score += w.get("micro_pair_proximity_bonus", 28.0)
                # Anti-Zigzag Penalty: avoid crisscrossing back and forth across the city
                if prev_prev_dest is not None and prev_dest is not None:
                    d_leg1 = haversine_km(prev_prev_dest.latitude, prev_prev_dest.longitude, prev_dest.latitude, prev_dest.longitude)
                    d_leg2 = haversine_km(prev_dest.latitude, prev_dest.longitude, dest.latitude, dest.longitude)
                    if d_leg1 >= 2.0 and d_leg2 >= 2.0:
                        v1_lat = prev_dest.latitude - prev_prev_dest.latitude
                        v1_lng = prev_dest.longitude - prev_prev_dest.longitude
                        v2_lat = dest.latitude - prev_dest.latitude
                        v2_lng = dest.longitude - prev_dest.longitude
                        mag1 = (v1_lat ** 2 + v1_lng ** 2) ** 0.5
                        mag2 = (v2_lat ** 2 + v2_lng ** 2) ** 0.5
                        if mag1 > 1e-6 and mag2 > 1e-6:
                            cos_theta = (v1_lat * v2_lat + v1_lng * v2_lng) / (mag1 * mag2)
                            if cos_theta < -0.55:
                                total_score -= 35.0

                prev_st = st
                prev_brand = brand
            else:
                total_score += 50.0
                prev_st = None
                prev_brand = ""

            prev_prev_dest = prev_dest
            prev_dest = dest

            if getattr(slot, "is_must_visit", False):
                total_score += w["must_visit_inclusion"]
            if getattr(slot, "is_locked", False):
                total_score += w["locked_item_preserved"]

            if slot.time_slot == "NOON" or getattr(slot, "item_type", "") in ("MEAL", "MEAL_BREAK"):
                has_lunch_meal = True
                total_score += w["meal_window_fit_bonus"]
            if getattr(slot, "item_type", "") == "CAFE_REST" or (dest and _get_broad_subtype(dest) == "CAFE"):
                has_cafe_rest = True

            if getattr(slot, "opening_hours_status", "") == "UNVERIFIED_HOURS":
                total_score -= w["unverified_hours_penalty"]

            total_transit += int(getattr(slot, "travel_time_from_prev_min", 0) or 0)
            slot_wait = int(getattr(slot, "wait_time_min", 0) or 0)
            if slot.time_slot in ("NOON", "EVENING") or getattr(slot, "item_type", "") in ("MEAL", "MEAL_BREAK"):
                total_wait += int(slot_wait * 0.2)
            else:
                total_wait += slot_wait

        total_score -= w["transit_penalty_per_min"] * total_transit
        total_score -= w["wait_penalty_per_min"] * total_wait

        # Pace fit evaluation
        n_stops = len(sim_slots)
        if pace == "RELAXED":
            if 2 <= n_stops <= 3:
                total_score += w["pace_fit_bonus"]
            elif n_stops > 3:
                total_score -= 90.0 * (n_stops - 3)
            if has_cafe_rest:
                total_score += w["cafe_break_fit_bonus"]
            if total_transit <= 40:
                total_score += 20.0
        elif pace == "INTENSIVE":
            # Reward fitting more valid stops
            total_score += 95.0 * n_stops
        else:
            # MODERATE
            total_score += 85.0 * n_stops
            if 3 <= n_stops <= 4:
                total_score += w["pace_fit_bonus"]

        if has_lunch_meal:
            total_score += 25.0
        noon_slot_count = sum(1 for s in sim_slots if s.time_slot == "NOON")
        if noon_slot_count > 1:
            total_score -= 400.0 * (noon_slot_count - 1)
        if non_noon_food_count > 1:
            total_score -= 180.0 * (non_noon_food_count - 1)
        if sightseeing_count >= 2:
            total_score += 120.0
        elif sightseeing_count >= 1:
            total_score += 75.0

        # Never waste the 08:30-11:30 morning window by starting at NOON (11:30+) when sightseeing stops exist in the day
        if sim_slots and sightseeing_count >= 1 and sim_slots[0].time_slot == "NOON":
            total_score -= 380.0

        return total_score

    @classmethod
    def optimize_day_stops(
        cls,
        day_num: int,
        day_pool: List[Destination],
        constraints: UserConstraints,
        province_pool: Optional[List[Destination]] = None,
        max_stops: Optional[int] = None
    ) -> List[ActivitySlot]:
        if not day_pool and not province_pool and not getattr(constraints, "locked_items", None):
            return []

        pace = config.normalize_pace(getattr(constraints, "pace", "MODERATE"))
        pace_policy = config.PACE_POLICIES.get(pace, config.PACE_POLICIES["MODERATE"])
        transport_mode = getattr(constraints, "transport_mode", "car") or "car"
        weekday_key, date_str = get_day_weekday_and_date(getattr(constraints, "start_date", None), day_num)

        all_pool = list(province_pool) if province_pool is not None else list(day_pool)
        day_slots = list(DailyTimelineEngine.get_day_slot_names(day_num, constraints))
        if not day_slots and not getattr(constraints, "locked_items", None):
            return []

        needs_noon_food = "NOON" in day_slots
        needs_evening = "EVENING" in day_slots

        max_leg_min = config.get_max_leg_minutes(constraints.has_elderly, constraints.has_children)

        # Pairwise transit cache for this day optimization
        transit_cache: Dict[Tuple[str, str], int] = {}

        def _cached_transit(d1: Destination, d2: Destination) -> int:
            key = (d1.id, d2.id)
            if key not in transit_cache:
                transit_cache[key] = estimate_transit_time_minutes(
                    d1.latitude, d1.longitude, d2.latitude, d2.longitude,
                    getattr(d1, "cluster_id", None), getattr(d2, "cluster_id", None),
                    transport_mode=transport_mode
                )
            return transit_cache[key]

        # Filter out destinations explicitly closed on this weekday/date
        open_all_pool = []
        for d in all_pool:
            intervals, status = extract_open_intervals_for_day(d, weekday_key, date_str)
            if status != "CLOSED" and len(intervals) > 0:
                open_all_pool.append(d)
        if open_all_pool:
            all_pool = open_all_pool

        open_day_pool = [d for d in day_pool if d in all_pool]
        if open_day_pool:
            day_pool = open_day_pool

        anchor_dest = day_pool[0] if day_pool else (all_pool[0] if all_pool else None)
        anchor_cluster = getattr(anchor_dest, "cluster_id", "MAINLAND") if anchor_dest else "MAINLAND"

        compatible_all = [
            d for d in all_pool
            if are_clusters_same_day_compatible(anchor_cluster, getattr(d, "cluster_id", "MAINLAND"))
        ]
        if not compatible_all:
            compatible_all = list(all_pool)

        candidates = [
            d for d in day_pool
            if are_clusters_same_day_compatible(anchor_cluster, getattr(d, "cluster_id", "MAINLAND"))
        ]
        if not candidates and compatible_all:
            candidates = [compatible_all[0]]

        if max_stops is not None:
            allowed_capacity = min(max_stops, pace_policy["max_stops_per_day"])
        else:
            allowed_capacity = min(len(day_slots), pace_policy["max_stops_per_day"])
        allowed_capacity = max(1, allowed_capacity)

        # Preserve must-visit items in candidates first
        must_visit_tokens = [
            str(x).lower().strip()
            for x in (getattr(constraints, "must_visit_ids", []) or []) + (getattr(constraints, "must_include", []) or [])
            if str(x).strip()
        ]
        must_visit_in_pool = [
            d for d in compatible_all
            if d.id.lower() in must_visit_tokens or any(mv in d.name.lower() for mv in must_visit_tokens)
        ]
        for mvd in reversed(must_visit_in_pool):
            if mvd in candidates:
                candidates.remove(mvd)
            candidates.insert(0, mvd)

        all_interests_low = [
            str(i).lower().strip()
            for i in (getattr(constraints, "priority_interests", []) or []) + (constraints.interests or [])
        ]

        # 1. If NOON is requested, ensure a real daytime food destination is in candidates
        if needs_noon_food:
            food_in_cand = [d for d in candidates if is_slot_suitable(d, "NOON", weekday_key, date_str)]
            if not food_in_cand:
                food_pool = [
                    d for d in compatible_all
                    if is_slot_suitable(d, "NOON", weekday_key, date_str) and d not in candidates
                    and (not anchor_dest or _cached_transit(anchor_dest, d) <= max_leg_min)
                ]
                if food_pool:
                    if anchor_dest:
                        food_pool.sort(
                            key=lambda fd: (
                                0 if haversine_km(anchor_dest.latitude, anchor_dest.longitude, fd.latitude, fd.longitude) <= 1.2 else 1,
                                -DestinationScoringEngine.calculate_score(fd, constraints, "NOON"),
                                haversine_km(anchor_dest.latitude, anchor_dest.longitude, fd.latitude, fd.longitude)
                            )
                        )
                    insert_idx = len(must_visit_in_pool)
                    candidates.insert(insert_idx, food_pool[0])
                else:
                    day_slots = [s for s in day_slots if s != "NOON"]
                    needs_noon_food = False

        # 2. Beach interest
        wants_beach = any(any(k in i for k in ["biển", "bãi tắm", "beach"]) for i in all_interests_low)
        if wants_beach:
            if not any(_get_broad_subtype(d) == "BEACH" for d in candidates):
                beach_pool = [
                    d for d in compatible_all
                    if _get_broad_subtype(d) == "BEACH" and d not in candidates
                    and (not anchor_dest or _cached_transit(anchor_dest, d) <= max_leg_min)
                ]
                if beach_pool:
                    candidates.insert(len(must_visit_in_pool), beach_pool[0])

        # 3. Cafe / Relax interest or RELAXED pace
        wants_cafe = (pace == "RELAXED") or any(
            any(k in i for k in ["cà phê", "cafe", "coffee", "thư giãn"])
            for i in all_interests_low
        )
        if wants_cafe:
            if not any(_get_broad_subtype(d) == "CAFE" for d in candidates):
                cafe_pool = [
                    d for d in compatible_all
                    if _get_broad_subtype(d) == "CAFE" and d not in candidates
                    and (not anchor_dest or _cached_transit(anchor_dest, d) <= max_leg_min)
                ]
                if cafe_pool:
                    if anchor_dest:
                        cafe_pool.sort(
                            key=lambda cd: (
                                0 if haversine_km(anchor_dest.latitude, anchor_dest.longitude, cd.latitude, cd.longitude) <= 1.2 else 1,
                                -DestinationScoringEngine.calculate_score(cd, constraints, "AFTERNOON"),
                                haversine_km(anchor_dest.latitude, anchor_dest.longitude, cd.latitude, cd.longitude)
                            )
                        )
                    insert_pos = min(len(candidates), max(1, len(must_visit_in_pool) + 1))
                    candidates.insert(insert_pos, cafe_pool[0])

        # 4. Evening destination if EVENING is requested
        if needs_evening:
            has_evening = any(cls._is_evening_destination(d, weekday_key, date_str) for d in candidates)
            if not has_evening:
                evening_pool = [
                    d for d in compatible_all
                    if cls._is_evening_destination(d, weekday_key, date_str) and d not in candidates
                    and (not anchor_dest or _cached_transit(anchor_dest, d) <= max_leg_min)
                ]
                if evening_pool:
                    candidates.append(evening_pool[0])

        # 5. Deduplicate excess cafes in candidates & guarantee sightseeing landmarks before food/cafe padding
        seen_cafes = [c for c in candidates if _get_broad_subtype(c) == "CAFE"]
        if len(seen_cafes) > 1:
            non_cafe_avail = [d for d in compatible_all if _get_broad_subtype(d) != "CAFE" and d not in candidates]
            if non_cafe_avail:
                kept_first_cafe = False
                deduped_cands = []
                for c in candidates:
                    if _get_broad_subtype(c) == "CAFE":
                        if not kept_first_cafe:
                            deduped_cands.append(c)
                            kept_first_cafe = True
                    else:
                        deduped_cands.append(c)
                candidates = deduped_cands

        sight_in_cands = [c for c in candidates if _get_broad_subtype(c) not in ("CAFE", "FOOD")]
        if len(sight_in_cands) < 2:
            sight_pool = [
                d for d in compatible_all
                if d not in candidates and _get_broad_subtype(d) not in ("CAFE", "FOOD")
                and (not anchor_dest or _cached_transit(anchor_dest, d) <= max_leg_min)
            ]
            sight_pool.sort(
                key=lambda sd: -DestinationScoringEngine.calculate_score(sd, constraints, "MORNING")
            )
            for sd in sight_pool:
                if len(sight_in_cands) >= 2:
                    break
                candidates.insert(len(must_visit_in_pool), sd)
                sight_in_cands.append(sd)

        # Pad candidates from compatible_all if needed (enforce systemic subtype & concept diversity across all provinces)
        desired_pool_size = min(6, max(allowed_capacity + 1, 4))
        if len(candidates) < desired_pool_size:
            existing_subtypes = {_get_broad_subtype(c) for c in candidates}
            has_cafe_cand = any(_get_broad_subtype(c) == "CAFE" for c in candidates)
            non_noon_food_cands = sum(1 for c in candidates if _get_broad_subtype(c) == "FOOD")
            sight_cands = [
                d for d in compatible_all
                if d not in candidates and _get_broad_subtype(d) not in ("CAFE", "FOOD")
            ]
            other_cands = [
                d for d in compatible_all
                if d not in candidates and _get_broad_subtype(d) in ("CAFE", "FOOD")
            ]
            # Pass 1: Add ONLY places introducing a fresh subtype & zero core-concept conflict
            for d in sight_cands + other_cands:
                if anchor_dest and _cached_transit(anchor_dest, d) > max_leg_min:
                    continue
                st = _get_broad_subtype(d)
                if st == "CAFE" and has_cafe_cand:
                    continue
                if st == "FOOD" and non_noon_food_cands >= 1:
                    continue
                if any(_share_same_core_concept(d, c) for c in candidates):
                    continue
                if st not in existing_subtypes:
                    candidates.append(d)
                    existing_subtypes.add(st)
                    if st == "CAFE":
                        has_cafe_cand = True
                    elif st == "FOOD":
                        non_noon_food_cands += 1
                if len(candidates) >= desired_pool_size:
                    break
            # Pass 2 (only if still < min stops): fill remaining slots while still guarding CAFE / THEME_PARK / same concept
            if len(candidates) < desired_pool_size:
                for d in sight_cands + other_cands:
                    if d not in candidates:
                        if anchor_dest and _cached_transit(anchor_dest, d) > max_leg_min:
                            continue
                        st = _get_broad_subtype(d)
                        if st == "CAFE" and has_cafe_cand:
                            continue
                        if st == "THEME_PARK" and "THEME_PARK" in existing_subtypes:
                            continue
                        if any(_share_same_core_concept(d, c) for c in candidates):
                            continue
                        if len(candidates) >= 2 and st in STRICT_DIVERSITY_SUBTYPES and st in existing_subtypes:
                            continue
                        candidates.append(d)
                        existing_subtypes.add(st)
                        if st == "CAFE":
                            has_cafe_cand = True
                    if len(candidates) >= desired_pool_size:
                        break

        # 6. Hard Leg Ceiling Filter
        if len(candidates) > 1:
            core_anchor = candidates[0]
            filtered_close = [core_anchor]
            for d in candidates[1:]:
                min_t = min(_cached_transit(d, c) for c in filtered_close)
                if min_t <= max_leg_min:
                    filtered_close.append(d)
                else:
                    for alt in compatible_all:
                        if alt in filtered_close or alt in candidates:
                            continue
                        alt_min_t = min(_cached_transit(alt, c) for c in filtered_close)
                        if alt_min_t <= max_leg_min:
                            filtered_close.append(alt)
                            break
            candidates = filtered_close

        if len(candidates) > 6:
            # Ensure must-visit items AND at least 1 NOON food stop stay within the top 6
            kept = [c for c in candidates if c in must_visit_in_pool]
            if needs_noon_food:
                first_food = next((c for c in candidates if c not in kept and is_slot_suitable(c, "NOON", weekday_key, date_str)), None)
                if first_food:
                    kept.append(first_food)
            for c in candidates:
                if c not in kept and len(kept) < 6:
                    kept.append(c)
            candidates = kept

        dest_map = {d.id: d for d in compatible_all}
        for d in candidates:
            dest_map[d.id] = d

        target_len = min(len(day_slots), allowed_capacity, len(candidates))
        if target_len <= 0:
            return DailyTimelineEngine.assemble_day_timeline(
                day_num, [], constraints, scheduled_slots=day_slots, candidate_pool=compatible_all, max_stops=allowed_capacity
            )

        best_sim_slots: List[ActivitySlot] = []
        best_sim_key: Tuple[float, Tuple[str, ...]] = (-1e12, ())

        # Evaluate permutations by running the actual sequential timeline simulator!
        # Also test size target_len and (if target_len >= 3 and pace == RELAXED) target_len - 1
        lengths_to_try = [target_len]
        if pace == "RELAXED" and target_len >= 3:
            lengths_to_try.append(target_len - 1)

        # Compute which strict diversity caps can be satisfied by the candidate pool
        capped_subtypes_for_perm = {
            st for st in STRICT_DIVERSITY_SUBTYPES
            if len([c for c in candidates if _get_broad_subtype(c) != st]) >= 2
        }

        seen_simulated_orders = set()
        for seq_len in lengths_to_try:
            for perm in itertools.permutations(candidates, seq_len):
                # Systemic diversity cap: never schedule > 1 of any strict subtype (CAFE, THEME_PARK, BEACH, MOUNTAIN, TEMPLE, MUSEUM, VILLAGE, MARKET) when diverse options exist
                perm_sts = [_get_broad_subtype(p) for p in perm]
                if any(st in capped_subtypes_for_perm and perm_sts.count(st) > 1 for st in set(perm_sts)):
                    continue
                # Never schedule two stops sharing the same core brand/concept in 1 day when diverse stops exist
                if any(_share_same_core_concept(perm[i], perm[j]) for i in range(len(perm)) for j in range(i + 1, len(perm))):
                    if len(candidates) > seq_len:
                        continue
                # Quick pre-filter: if any consecutive leg in perm violates cluster or max_leg_min, skip
                feasible_legs = True
                for i in range(len(perm) - 1):
                    c1 = getattr(perm[i], "cluster_id", "MAINLAND")
                    c2 = getattr(perm[i + 1], "cluster_id", "MAINLAND")
                    if not are_clusters_same_day_compatible(c1, c2) or _cached_transit(perm[i], perm[i + 1]) > max_leg_min:
                        feasible_legs = False
                        break
                if not feasible_legs:
                    continue

                # Derive adaptive slot sequence for this permutation so non-food morning/afternoon stops
                # are not blocked by a rigid slot position if lunch comes 2nd or 3rd
                perm_slots: List[str] = []
                for idx, p_dest in enumerate(perm):
                    if is_Evening := cls._is_evening_destination(p_dest, weekday_key, date_str) and idx == len(perm) - 1 and "EVENING" in day_slots:
                        perm_slots.append("EVENING")
                    elif is_food_destination(p_dest) and is_slot_suitable(p_dest, "NOON", weekday_key, date_str) and "NOON" not in perm_slots and "NOON" in day_slots:
                        perm_slots.append("NOON")
                    elif idx == 0 and "MORNING" in day_slots:
                        perm_slots.append("MORNING")
                    elif "NOON" not in perm_slots and idx == 1 and len(perm) >= 4 and "MORNING" in day_slots and is_slot_suitable(p_dest, "MORNING", weekday_key, date_str):
                        perm_slots.append("MORNING")
                    elif is_slot_suitable(p_dest, "AFTERNOON", weekday_key, date_str):
                        perm_slots.append("AFTERNOON")
                    elif is_slot_suitable(p_dest, "MORNING", weekday_key, date_str) and "NOON" not in perm_slots:
                        perm_slots.append("MORNING")
                    else:
                        perm_slots.append(day_slots[min(idx, len(day_slots) - 1)])

                sim_slots = DailyTimelineEngine.assemble_day_timeline(
                    day_num,
                    list(perm),
                    constraints,
                    scheduled_slots=perm_slots,
                    candidate_pool=None,
                    max_stops=allowed_capacity
                )
                if not sim_slots:
                    continue

                order_sig = tuple((s.destination_id, s.start_time) for s in sim_slots)
                if order_sig in seen_simulated_orders:
                    continue
                seen_simulated_orders.add(order_sig)

                sim_score = cls.score_simulated_timeline(sim_slots, dest_map, constraints)
                # Deterministic tie-breaking: higher score wins; ties broken by lexicographically smaller ID tuple
                tie_ids = tuple(s.destination_id for s in sim_slots)
                cand_key = (round(sim_score, 4), tuple("" for _ in tie_ids))
                if round(sim_score, 4) > best_sim_key[0] or (
                    round(sim_score, 4) == best_sim_key[0] and (not best_sim_key[1] or tie_ids < best_sim_key[1])
                ):
                    best_sim_key = (round(sim_score, 4), tie_ids)
                    best_sim_slots = sim_slots

        # If best_sim_slots has fewer stops than allowed_capacity (and pace != RELAXED), try topping up from compatible_all
        if best_sim_slots and (len(best_sim_slots) >= min(target_len, 2) or pace == "RELAXED"):
            if len(best_sim_slots) < allowed_capacity and pace != "RELAXED":
                best_dests = [dest_map[s.destination_id] for s in best_sim_slots if s.destination_id in dest_map]
                already_has_cafe = any(_get_broad_subtype(bd) == "CAFE" for bd in best_dests)
                topup_pool = [
                    d for d in compatible_all
                    if not (already_has_cafe and _get_broad_subtype(d) == "CAFE")
                ]
                topped_up = DailyTimelineEngine.assemble_day_timeline(
                    day_num,
                    best_dests,
                    constraints,
                    scheduled_slots=day_slots,
                    candidate_pool=topup_pool,
                    max_stops=allowed_capacity
                )
                if len(topped_up) > len(best_sim_slots):
                    return topped_up
            return best_sim_slots

        return DailyTimelineEngine.assemble_day_timeline(
            day_num,
            candidates[:target_len],
            constraints,
            scheduled_slots=day_slots,
            candidate_pool=compatible_all,
            max_stops=allowed_capacity
        )
