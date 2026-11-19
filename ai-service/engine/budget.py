from typing import List, Dict, Any
from models.reason import ActivitySlot
from models.constraints import UserConstraints
import config


class BudgetCalculatorEngine:
    @classmethod
    def calculate_trip_budget(
        cls,
        days_activities: List[List[ActivitySlot]],
        constraints: UserConstraints
    ) -> Dict[str, Any]:
        total_activities_cost = 0
        for day in days_activities:
            for act in day:
                total_activities_cost += act.cost_vnd

        people = max(1, constraints.people_count)
        total_trip_days = max(len(days_activities), int(getattr(constraints, "total_days", 1) or 1))
        active_days = [day for day in days_activities if len(day) > 0]
        num_active_days = len(active_days)

        # Mục 7 & Mục 10 (#12): Số đêm lưu trú phải khớp thời lượng chuyến đi (ví dụ 3 ngày 2 đêm -> 2 đêm khách sạn)
        # kể cả khi có ngày tự do / chưa có điểm tham quan phù hợp.
        nights = max(0, total_trip_days - 1)

        raw_tier = (constraints.budget_tier or "standard").lower().strip()
        tier = config.BUDGET_TIER_ALIASES.get(raw_tier, raw_tier)
        if tier not in config.VALID_BUDGET_TIERS:
            tier = "standard"

        # 1. Chi phí phòng nghỉ (bỏ qua nếu đã có khách sạn has_hotel=True hoặc chuyến đi 1 ngày 0 đêm)
        if constraints.has_hotel or nights == 0:
            total_hotel_cost = 0
            rooms_needed = 0
        else:
            room_rate_per_night = config.ROOM_RATES_PER_NIGHT.get(tier, config.ROOM_RATES_PER_NIGHT["standard"])
            rooms_needed = (people + 1) // 2
            total_hotel_cost = room_rate_per_night * nights * rooms_needed

        # 2. Chi phí di chuyển nội đô (tính cho các ngày có hoạt động di chuyển)
        daily_transport_cost = config.DAILY_TRANSPORT_RATES.get(tier, config.DAILY_TRANSPORT_RATES["standard"])
        total_transport_cost = daily_transport_cost * num_active_days

        # 3. Chi phí ăn uống mỗi ngày theo hạng ngân sách
        # Không cộng trùng nếu lịch đã có hoạt động ăn uống có giá ước tính (NOON / MEAL / MEAL_BREAK)
        daily_meal_per_person = config.DAILY_MEAL_RATES.get(tier, config.DAILY_MEAL_RATES["standard"])
        total_meal_cost = 0
        lunch_share_ratio = 0.40  # Bữa trưa chiếm khoảng 40% chi phí ăn uống trong ngày

        for day in active_days:
            day_base_meal = daily_meal_per_person * people
            scheduled_meal_cost = 0
            for act in day:
                is_meal_act = (
                    act.time_slot == "NOON"
                    or getattr(act, "item_type", "") in ("MEAL", "MEAL_BREAK")
                )
                if is_meal_act and act.cost_vnd > 0:
                    scheduled_meal_cost += act.cost_vnd

            # Khấu trừ phần ăn đã tính trong hoạt động để không cộng trùng
            deduction = min(int(day_base_meal * lunch_share_ratio), scheduled_meal_cost)
            day_actual_meal = max(0, day_base_meal - deduction)
            total_meal_cost += day_actual_meal

        subtotal = total_activities_cost + total_hotel_cost + total_transport_cost + total_meal_cost
        contingency_cost = int(subtotal * config.CONTINGENCY_RATE)
        grand_total = subtotal + contingency_cost

        min_fluctuation = int(grand_total * config.MIN_FLUCTUATION_RATE)
        max_fluctuation = int(grand_total * config.MAX_FLUCTUATION_RATE)

        return {
            "grand_total_vnd": grand_total,
            "min_fluctuation_vnd": min_fluctuation,
            "max_fluctuation_vnd": max_fluctuation,
            "per_person_vnd": grand_total // people,
            "nights_count": nights,
            "activities_cost": total_activities_cost,
            "hotel_cost": total_hotel_cost,
            "transport_cost": total_transport_cost,
            "meal_cost": total_meal_cost,
            "contingency_cost": contingency_cost,
            "rooms_needed": rooms_needed,
            "breakdown": {
                "activities_cost": total_activities_cost,
                "hotel_cost": total_hotel_cost,
                "transport_cost": total_transport_cost,
                "meal_cost": total_meal_cost,
                "contingency_cost": contingency_cost,
                "nights_count": nights,
            }
        }

    @classmethod
    def optimize_for_budget_ceiling(
        cls,
        plan_days: List[Any],
        constraints: UserConstraints,
        candidate_pool: List[Any],
        max_budget_vnd: int
    ) -> Any:
        """
        Hard Budget Ceiling Solver:
        Attempts to bring grand_total_vnd <= max_budget_vnd by replacing expensive unlocked,
        non-must-visit ticketed attractions with free/low-cost local attractions from candidate_pool.
        Returns (budget_summary, optimization_notes).
        """
        notes: List[str] = []
        used_ids = {act.destination_id for d in plan_days for act in d.activities}
        low_cost_pool = [
            cand for cand in candidate_pool
            if cand.id not in used_ids and getattr(cand, "price_min", 0) <= 40000
        ]

        # Collect replaceable expensive activities: (cost_vnd, day_idx, act_idx)
        replaceable = []
        for d_idx, day in enumerate(plan_days):
            for a_idx, act in enumerate(day.activities):
                if getattr(act, "is_locked", False) or getattr(act, "is_must_visit", False):
                    continue
                if act.time_slot == "NOON" or getattr(act, "item_type", "") in ("MEAL", "MEAL_BREAK"):
                    continue
                if getattr(act, "cost_vnd", 0) >= 80000:
                    replaceable.append((act.cost_vnd, d_idx, a_idx))

        replaceable.sort(key=lambda x: x[0], reverse=True)
        people = max(1, constraints.people_count)

        for _, d_idx, a_idx in replaceable:
            current_summary = cls.calculate_trip_budget([d.activities for d in plan_days], constraints)
            if current_summary["grand_total_vnd"] <= max_budget_vnd:
                return current_summary, notes
            if not low_cost_pool:
                break

            act = plan_days[d_idx].activities[a_idx]
            replacement = low_cost_pool.pop(0)
            old_name = act.destination_name
            old_cost = act.cost_vnd
            new_cost = replacement.price_min * people

            if new_cost >= old_cost:
                continue

            act.destination_id = replacement.id
            act.destination_name = replacement.name
            act.category = replacement.category
            act.cost_vnd = new_cost
            act.cost_label = f"{new_cost:,} VND ({people} người)" if new_cost > 0 else "Miễn phí"
            act.note = replacement.description
            used_ids.add(replacement.id)
            notes.append(
                f"Tối ưu trần ngân sách: Đổi '{old_name}' ({old_cost:,}đ) sang '{replacement.name}' ({new_cost:,}đ) tại Ngày {plan_days[d_idx].day_number}."
            )

        final_summary = cls.calculate_trip_budget([d.activities for d in plan_days], constraints)
        return final_summary, notes
