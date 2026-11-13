from typing import List, Tuple, Optional
from models.plan import ItineraryPlanResponse
from models.constraints import UserConstraints
from data.loader import data_loader
from engine.timeline import (
    time_to_minutes,
    extract_open_intervals_for_day,
    get_day_weekday_and_date,
    is_food_destination,
    is_slot_suitable,
    DailyTimelineEngine
)
from services.geo_calculator import are_clusters_same_day_compatible
import config


class PlanVerifier:
    @staticmethod
    def verify_and_sanitize(plan: ItineraryPlanResponse, constraints: Optional[UserConstraints] = None) -> Tuple[bool, List[str]]:
        """
        Verifies plan invariants & hard plausibility constraints:
        1. Destination IDs must exist in DB (unless locked commitment or synthetic break) and belong to destination province.
        2. No illegal placeholders (1.1, 1.2, etc.).
        3. No STRENUOUS places if has_elderly is True.
        4. No duplicate destinations across multiple days.
        5. Warns on abnormal pricing.
        6. Leg transit time <= max_leg_minutes; daily transit time <= max_daily_transit_minutes.
        7. Same-day activities must belong to compatible geographic clusters.
        8. NOON slot must be a genuine food destination suitable for NOON.
        9. Activities with known opening intervals must fit within a single continuous open interval.
        10. Empty days must have subtotal_cost_vnd == 0.
        """
        from api.contract import PlanVerificationError
        from engine.filters import AVOID_CATEGORY_KEYWORDS

        sanitized_warnings: List[str] = []
        fatal_errors: List[str] = []
        used_dest_ids = set()

        has_elderly = bool(constraints.has_elderly) if constraints else False
        has_children = bool(constraints.has_children) if constraints else False
        max_leg_min = config.get_max_leg_minutes(has_elderly, has_children)
        max_daily_transit_min = config.get_max_daily_transit_minutes(has_elderly, has_children)
        must_avoid_list = [str(x).strip().lower() for x in (constraints.must_avoid or []) if str(x).strip()] if constraints else []

        for day in plan.days:
            if len(day.activities) == 0 and day.subtotal_cost_vnd > 0:
                sanitized_warnings.append(
                    f"Phát hiện ngày {day.day_number} trống nhưng có chi phí {day.subtotal_cost_vnd:,}đ; đã đưa về 0đ."
                )
                day.subtotal_cost_vnd = 0

            weekday_key, date_str = get_day_weekday_and_date(
                getattr(constraints, "start_date", None) if constraints else None,
                day.day_number
            )

            clean_activities = []
            day_clusters: List[str] = []
            running_daily_transit = 0

            for act in day.activities:
                is_locked = bool(getattr(act, "is_locked", False))
                is_synthetic = bool(getattr(act, "is_synthetic", False))

                if is_synthetic:
                    clean_activities.append(act)
                    continue

                # 1. Check ID existence in DB
                db_item = data_loader.get_by_id(act.destination_id)
                if not db_item:
                    matched = [d for d in data_loader.destinations if d.name.strip().lower() == act.destination_name.strip().lower()]
                    if matched:
                        db_item = matched[0]
                        act.destination_id = db_item.id
                        sanitized_warnings.append(f"Auto-resolved destination id for '{act.destination_name}' -> {db_item.id}")
                    elif is_locked:
                        # Locked user commitment (e.g. flight/meeting/external ticket) is allowed without DB entry
                        clean_activities.append(act)
                        continue
                    else:
                        fatal_errors.append(f"Địa điểm '{act.destination_name}' (ID: {act.destination_id}) không tồn tại trong cơ sở dữ liệu.")
                        continue

                # Invariant: Must belong to target province
                if db_item.province and plan.destination_province:
                    if db_item.province.lower() != plan.destination_province.lower():
                        fatal_errors.append(
                            f"Địa điểm '{db_item.name}' thuộc tỉnh '{db_item.province}', không thuộc '{plan.destination_province}'."
                        )
                        continue

                # 2. Check for illegal placeholder patterns
                for bad_pattern in ["trải nghiệm điểm đến", "điểm đến 1", "hoạt động 1", "1.1", "1.2"]:
                    if bad_pattern in act.destination_name.lower():
                        sanitized_warnings.append(f"Phát hiện và loại bỏ tên định danh mẫu: '{act.destination_name}'")
                        act.destination_name = db_item.name

                # 3. Elderly Physical Load Check
                if has_elderly and not is_locked:
                    if db_item.walking_load == "STRENUOUS":
                        fatal_errors.append(
                            f"Địa điểm '{db_item.name}' có độ dốc cao (STRENUOUS) vi phạm an toàn thể lực cho người lớn tuổi."
                        )
                        continue

                # 4. Check must_avoid violation
                if must_avoid_list and not is_locked:
                    d_text = f"{db_item.name} {db_item.category}".lower()
                    violated_avoid = False
                    for av in must_avoid_list:
                        kws = [av]
                        for k_group, group_kws in AVOID_CATEGORY_KEYWORDS.items():
                            if k_group in av or av in k_group:
                                kws.extend(group_kws)
                        if any(kw in d_text for kw in kws):
                            sanitized_warnings.append(
                                f"Đã loại bỏ '{db_item.name}' khỏi ngày {day.day_number} vì thuộc nhóm người dùng muốn tránh ('{av}')."
                            )
                            violated_avoid = True
                            break
                    if violated_avoid:
                        continue

                # 5. Check cross-day duplicate destinations
                if act.destination_id in used_dest_ids and not is_locked:
                    sanitized_warnings.append(f"Phát hiện điểm trùng lặp '{act.destination_name}' (ID: {act.destination_id}), đã loại bỏ khỏi ngày {day.day_number}.")
                    continue

                # 6. Check NOON slot is genuine food destination and suitable for NOON
                if act.time_slot == "NOON" and not is_locked:
                    if not is_food_destination(db_item) or not is_slot_suitable(db_item, "NOON", weekday_key, date_str):
                        sanitized_warnings.append(
                            f"Đã loại bỏ '{db_item.name}' khỏi khung trưa (NOON) ngày {day.day_number} vì không phải điểm ăn trưa phù hợp."
                        )
                        continue

                # 7. Check single continuous opening interval fit (no straddling midday closure)
                if not is_locked:
                    intervals, h_status = extract_open_intervals_for_day(db_item, weekday_key, date_str)
                    if h_status == "CLOSED" or not intervals:
                        sanitized_warnings.append(
                            f"Đã loại bỏ '{db_item.name}' khỏi ngày {day.day_number} vì đóng cửa vào ngày này."
                        )
                        continue
                    st_min = time_to_minutes(act.start_time)
                    et_min = time_to_minutes(act.end_time)
                    fits_single_interval = any(
                        st_min >= o_m - 1 and et_min <= c_m + 1
                        for o_m, c_m in intervals
                    )
                    if not fits_single_interval:
                        sanitized_warnings.append(
                            f"Đã loại bỏ '{db_item.name}' ({act.start_time}–{act.end_time}) khỏi ngày {day.day_number} vì vượt ngoài khung giờ mở cửa liên tục."
                        )
                        continue

                # 8. Check geographic cluster compatibility within the same day
                item_cluster = getattr(db_item, "cluster_id", "") or ""
                if day_clusters and item_cluster and not is_locked:
                    if any(not are_clusters_same_day_compatible(prev_c, item_cluster) for prev_c in day_clusters):
                        sanitized_warnings.append(
                            f"Đã loại bỏ '{db_item.name}' (cụm {item_cluster}) khỏi ngày {day.day_number} do khác cụm địa lý/đảo với các điểm trước đó ({day_clusters[0]})."
                        )
                        continue

                # 9. Check leg transit time ceiling & daily transit time ceiling
                leg_min = int(getattr(act, "travel_time_from_prev_min", 0) or 0)
                if len(clean_activities) == 0:
                    leg_min = 0
                    act.travel_time_from_prev_min = 0
                if not is_locked:
                    if leg_min > max_leg_min:
                        sanitized_warnings.append(
                            f"Đã loại bỏ '{db_item.name}' khỏi ngày {day.day_number} vì thời gian di chuyển chặng ({leg_min} phút) vượt trần cho phép ({max_leg_min} phút)."
                        )
                        continue
                    if running_daily_transit + leg_min > max_daily_transit_min:
                        sanitized_warnings.append(
                            f"Đã loại bỏ '{db_item.name}' khỏi ngày {day.day_number} vì tổng thời gian di chuyển trong ngày ({running_daily_transit + leg_min} phút) vượt trần ({max_daily_transit_min} phút)."
                        )
                        continue

                used_dest_ids.add(act.destination_id)
                if item_cluster:
                    day_clusters.append(item_cluster)
                running_daily_transit += leg_min

                # 10. Price Sanity Check
                if any(k in act.destination_name.lower() for k in ["chè", "cà phê", "bánh mì", "bánh bèo"]):
                    per_person = act.cost_vnd // max(1, plan.people_count)
                    if per_person > 50000:
                        sanitized_warnings.append(
                            f"Cảnh báo giá: Món ăn nhẹ/chè '{act.destination_name}' có đơn giá ước tính {per_person:,}đ/người cao hơn mức bình dân thông thường (12.000đ - 30.000đ)."
                        )

                clean_activities.append(act)

            day.activities = clean_activities
            day.subtotal_cost_vnd = sum(a.cost_vnd for a in day.activities) if clean_activities else 0

        if fatal_errors:
            raise PlanVerificationError("Vi phạm bất biến dữ liệu lịch trình không thể tự sửa.", fatal_errors)

        is_valid = len(sanitized_warnings) == 0
        return is_valid, sanitized_warnings
