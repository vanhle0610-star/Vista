import random
from typing import List, Optional, Tuple, Dict
from models.destination import Destination
from services.geo_calculator import haversine_km, are_clusters_same_day_compatible


class GeographicClusteringEngine:
    @classmethod
    def resolve_default_hotel_anchor(
        cls,
        destinations: List[Destination],
        has_elderly: bool = False
    ) -> Optional[Tuple[float, float, str]]:
        """
        Computes a central default hotel anchor (medoid of the core cluster) when
        the user has not specified hotel_lat / hotel_lng.
        Returns (anchor_lat, anchor_lng, anchor_name).
        """
        if not destinations:
            return None
        core_dests, _ = cls._filter_coordinate_outliers(
            destinations,
            max_radius_km=18.0 if has_elderly else 22.0
        )
        pool = core_dests if core_dests else destinations
        if len(pool) == 1:
            d0 = pool[0]
            return (d0.latitude, d0.longitude, d0.name)

        # Find medoid (destination minimizing total distance to all other points in core pool)
        best_dest = pool[0]
        best_total_dist = float("inf")
        sample_pool = pool[:35]
        for cand in sample_pool:
            tot = sum(haversine_km(cand.latitude, cand.longitude, other.latitude, other.longitude) for other in sample_pool)
            if tot < best_total_dist:
                best_total_dist = tot
                best_dest = cand
        return (best_dest.latitude, best_dest.longitude, best_dest.name)

    @classmethod
    def rebalance_clusters_across_days(
        cls,
        day_clusters: List[List[Destination]],
        start_date: Optional[str] = None
    ) -> List[List[Destination]]:
        """
        Inter-Day 2-Opt Swap:
        If a destination in day_clusters[d1] is closed on day d1+1's weekday/date
        but open on an adjacent compatible day d2+1, swap it with an all-day/open destination from d2.
        """
        if len(day_clusters) <= 1:
            return day_clusters

        from engine.timeline import extract_open_intervals_for_day, get_day_weekday_and_date

        total_days = len(day_clusters)
        for d1_idx in range(total_days):
            wk1, ds1 = get_day_weekday_and_date(start_date, d1_idx + 1)
            cluster1 = day_clusters[d1_idx]
            for i1, dest1 in enumerate(list(cluster1)):
                ivs1, st1 = extract_open_intervals_for_day(dest1, wk1, ds1)
                is_closed_d1 = (st1 == "CLOSED" or len(ivs1) == 0)
                if not is_closed_d1:
                    continue
                # Find another day d2 where dest1 is open and a compatible dest2 is open on d1
                swapped = False
                for d2_idx in range(total_days):
                    if d2_idx == d1_idx:
                        continue
                    wk2, ds2 = get_day_weekday_and_date(start_date, d2_idx + 1)
                    ivs1_on_d2, st1_on_d2 = extract_open_intervals_for_day(dest1, wk2, ds2)
                    if st1_on_d2 == "CLOSED" or len(ivs1_on_d2) == 0:
                        continue
                    cluster2 = day_clusters[d2_idx]
                    for i2, dest2 in enumerate(cluster2):
                        if not are_clusters_same_day_compatible(
                            getattr(dest1, "cluster_id", "MAINLAND"),
                            getattr(dest2, "cluster_id", "MAINLAND")
                        ):
                            continue
                        ivs2_on_d1, st2_on_d1 = extract_open_intervals_for_day(dest2, wk1, ds1)
                        if st2_on_d1 != "CLOSED" and len(ivs2_on_d1) > 0:
                            day_clusters[d1_idx][i1] = dest2
                            day_clusters[d2_idx][i2] = dest1
                            swapped = True
                            break
                    if swapped:
                        break
        return day_clusters

    @staticmethod
    def _filter_coordinate_outliers(
        destinations: List[Destination],
        max_radius_km: float = 22.0
    ) -> Tuple[List[Destination], List[Destination]]:
        """
        Tách các điểm nằm trong bán kính hợp lý quanh tâm cụm chính (nội đô/vùng trung tâm)
        khỏi các điểm xa trung tâm (> max_radius_km) để tránh ghép chung một ngày gây vượt trần chặng (Giai đoạn 2.1, 2.2).
        """
        if len(destinations) <= 2:
            return list(destinations), []

        lats = sorted(d.latitude for d in destinations)
        lngs = sorted(d.longitude for d in destinations)
        med_lat = lats[len(lats) // 2]
        med_lng = lngs[len(lngs) // 2]

        core: List[Destination] = []
        outliers: List[Destination] = []
        for d in destinations:
            dist_from_med = haversine_km(d.latitude, d.longitude, med_lat, med_lng)
            c_id = getattr(d, "cluster_id", "MAINLAND")
            if dist_from_med <= max_radius_km and not c_id.startswith("OUTLIER_"):
                core.append(d)
            else:
                outliers.append(d)

        if not core:
            return list(destinations), []
        return core, outliers

    @classmethod
    def cluster_by_days(
        cls,
        destinations: List[Destination],
        total_days: int,
        hotel_lat: Optional[float] = None,
        hotel_lng: Optional[float] = None,
        random_seed: int = 42,
        has_elderly: bool = False
    ) -> List[List[Destination]]:
        """
        Pure-Python deterministic geographic clustering by day (Giai đoạn 2.1, 2.2):
        - Tách biệt các điểm khác cluster_id (đảo vs đất liền, vùng xa trung tâm như Lăng Cô / Bà Nà).
        - Nếu đoàn có người cao tuổi (has_elderly=True) và cụm nội đô đủ điểm, ưu tiên giữ toàn bộ các ngày trong bán kính nội đô.
        - Điểm xa trung tâm chỉ được xếp vào ngày riêng dành cho vùng đó, không trộn lẫn với nội đô.
        """
        if not destinations:
            return [[] for _ in range(total_days)]

        k = max(1, min(total_days, len(destinations)))
        if k == 1:
            core, outliers = cls._filter_coordinate_outliers(destinations, max_radius_km=20.0)
            return [core if core else destinations]

        core_dests, distant_dests = cls._filter_coordinate_outliers(
            destinations,
            max_radius_km=18.0 if has_elderly else 22.0
        )

        # Nếu cụm nội đô (core_dests) đủ lấp các ngày hoặc đoàn có người cao tuổi, ưu tiên chia ngày trên core_dests trước
        # Nếu còn ngày dư và không phải người cao tuổi (hoặc core_dests ít điểm), dành riêng 1 ngày cho nhóm điểm xa cùng khu vực
        dedicated_outlier_clusters: List[List[Destination]] = []
        if distant_dests and not has_elderly and len(core_dests) < total_days * 3:
            # Gom các điểm xa nằm gần nhau (cách nhau <= 18 km) thành 1 cụm ngày riêng
            anchor_out = distant_dests[0]
            out_group = [
                d for d in distant_dests
                if haversine_km(anchor_out.latitude, anchor_out.longitude, d.latitude, d.longitude) <= 18.0
                and are_clusters_same_day_compatible(getattr(anchor_out, "cluster_id", "MAINLAND"), getattr(d, "cluster_id", "MAINLAND"))
            ]
            if out_group:
                dedicated_outlier_clusters.append(out_group)

        k_core = max(1, k - len(dedicated_outlier_clusters))
        working_pool = core_dests if len(core_dests) >= k_core else list(destinations)

        # 1. Deterministic centroid initialization on working_pool
        rng = random.Random(random_seed)
        centroids: List[Tuple[float, float]] = []

        if hotel_lat is not None and hotel_lng is not None:
            centroids.append((hotel_lat, hotel_lng))

        sorted_by_lat = sorted(working_pool, key=lambda d: (d.latitude, d.longitude))
        step = max(1, len(sorted_by_lat) // k_core)
        for i in range(k_core):
            if len(centroids) >= k_core:
                break
            idx = min(len(sorted_by_lat) - 1, i * step + step // 2)
            pt = (sorted_by_lat[idx].latitude, sorted_by_lat[idx].longitude)
            if pt not in centroids:
                centroids.append(pt)

        while len(centroids) < k_core:
            sample = rng.choice(working_pool)
            centroids.append((sample.latitude, sample.longitude))

        # 2. Iterative K-Means optimization (max 15 iterations)
        clusters: List[List[Destination]] = [[] for _ in range(k_core)]

        for _ in range(15):
            new_clusters: List[List[Destination]] = [[] for _ in range(k_core)]
            for d in working_pool:
                nearest_idx = 0
                min_dist = float("inf")
                for c_idx, (c_lat, c_lng) in enumerate(centroids):
                    dist = haversine_km(d.latitude, d.longitude, c_lat, c_lng)
                    if dist < min_dist:
                        min_dist = dist
                        nearest_idx = c_idx
                new_clusters[nearest_idx].append(d)

            # Handle empty clusters by borrowing from the largest cluster
            for c_idx in range(k_core):
                if not new_clusters[c_idx]:
                    largest_idx = max(range(k_core), key=lambda idx: len(new_clusters[idx]))
                    if len(new_clusters[largest_idx]) > 1:
                        borrowed = new_clusters[largest_idx].pop()
                        new_clusters[c_idx].append(borrowed)

            same = True
            for old_c, new_c in zip(clusters, new_clusters):
                if [d.id for d in old_c] != [d.id for d in new_c]:
                    same = False
                    break
            clusters = new_clusters
            if same:
                break

            for c_idx in range(k_core):
                if c_idx == 0 and hotel_lat is not None and hotel_lng is not None:
                    continue
                if clusters[c_idx]:
                    avg_lat = sum(d.latitude for d in clusters[c_idx]) / len(clusters[c_idx])
                    avg_lng = sum(d.longitude for d in clusters[c_idx]) / len(clusters[c_idx])
                    centroids[c_idx] = (avg_lat, avg_lng)

        clusters.extend(dedicated_outlier_clusters)

        # Pad to total_days if needed
        while len(clusters) < total_days:
            clusters.append([])

        return clusters[:total_days]

    @classmethod
    def balance_anchors_across_days(
        cls,
        day_clusters: List[List[Destination]],
        pinned_ids: Optional[set] = None
    ) -> List[List[Destination]]:
        """
        Anchor-First Multi-Day Balancing:
        Prevents Day 1 from hoarding all top curated landmarks while Day 2-3 only get minor POIs.
        Ensures each active day receives at least 1 strong sightseeing anchor when compatible spares exist.
        """
        if len(day_clusters) <= 1:
            return day_clusters

        from engine.timeline import is_food_destination, is_cafe_or_rest_destination

        pinned = pinned_ids or set()

        def _is_anchor(d: Destination) -> bool:
            if is_food_destination(d) or is_cafe_or_rest_destination(d):
                return False
            is_curated = getattr(d, "data_source", "") in ("VISTA_CURATED_CSV", "VISTA_CURATED") or str(d.id).startswith("dest-")
            return is_curated or getattr(d, "avg_duration_min", 60) >= 90

        for target_idx in range(len(day_clusters)):
            target_anchors = [d for d in day_clusters[target_idx] if _is_anchor(d)]
            if target_anchors:
                continue
            # Look for a donor day with >= 2 anchors
            for donor_idx in range(len(day_clusters)):
                if donor_idx == target_idx:
                    continue
                donor_anchors = [d for d in day_clusters[donor_idx] if _is_anchor(d) and d.id not in pinned]
                if len(donor_anchors) < 2:
                    continue
                donor_cand = donor_anchors[-1]
                # Check compatibility with target day's existing cluster
                if day_clusters[target_idx]:
                    t_anchor = day_clusters[target_idx][0]
                    if not are_clusters_same_day_compatible(
                        getattr(t_anchor, "cluster_id", "MAINLAND"),
                        getattr(donor_cand, "cluster_id", "MAINLAND")
                    ):
                        continue
                day_clusters[donor_idx].remove(donor_cand)
                day_clusters[target_idx].insert(0, donor_cand)
                break

        return day_clusters

    @classmethod
    def infer_day_theme(cls, destinations: List[Destination], day_num: int) -> str:
        """
        Infers a concise Vietnamese thematic label for a day's itinerary based on its main stops.
        """
        if not destinations:
            return "Khám phá địa phương"

        theme_votes: Dict[str, int] = {
            "Di sản & Văn hóa": 0,
            "Biển đảo & Nghỉ dưỡng": 0,
            "Thiên nhiên & Ngắm cảnh": 0,
            "Giải trí & Trải nghiệm": 0,
            "Ẩm thực & Nhịp sống": 0,
        }
        for d in destinations:
            txt = f"{d.name} {d.category}".lower()
            if any(k in txt for k in ["bãi biển", "biển ", "đảo ", "vịnh", "resort", "lặn", "hòn ", "bến tàu"]):
                theme_votes["Biển đảo & Nghỉ dưỡng"] += 2
            elif any(k in txt for k in ["bảo tàng", "di tích", "chùa", "đền", "lăng", "phố cổ", "nhà thờ", "dinh ", "thành cổ", "văn hóa"]):
                theme_votes["Di sản & Văn hóa"] += 2
            elif any(k in txt for k in ["núi", "thác", "đèo", "vườn quốc gia", "rừng", "hồ ", "đồi", "suối", "hang", "động"]):
                theme_votes["Thiên nhiên & Ngắm cảnh"] += 2
            elif any(k in txt for k in ["vinwonders", "sun world", "safari", "công viên", "cáp treo", "làng nghề", "khu du lịch", "giải trí"]):
                theme_votes["Giải trí & Trải nghiệm"] += 2
            elif any(k in txt for k in ["chợ đêm", "phố đi bộ", "ẩm thực", "cà phê", "chợ "]):
                theme_votes["Ẩm thực & Nhịp sống"] += 1

        best_theme = max(theme_votes.items(), key=lambda kv: kv[1])
        if best_theme[1] > 0:
            return best_theme[0]
        return "Khám phá địa phương"
