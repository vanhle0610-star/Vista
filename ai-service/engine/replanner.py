import re
import copy
import logging
from typing import Dict, Any, List, Optional, Tuple
from models.destination import Destination
from models.reason import ActivitySlot, ReasonEvidence
from models.constraints import UserConstraints
from models.plan import ItineraryPlanResponse, DaySchedule
from data.loader import data_loader
from services.geo_calculator import (
    haversine_km,
    estimate_road_distance_km,
    estimate_transit_time_minutes
)
from engine.timeline import (
    DailyTimelineEngine,
    time_to_minutes,
    minutes_to_time,
    extract_open_intervals_for_day,
    find_feasible_visit_window,
    get_day_weekday_and_date,
    is_food_destination,
    is_slot_suitable
)
from engine.budget import BudgetCalculatorEngine
from engine.planner import build_source_signal_entry, resolve_plan_source_diagnostics
from verifier.checker import PlanVerifier
import config

logger = logging.getLogger("replanner")


class VistaReplannerEngine:
    @classmethod
    def replan_itinerary(
        cls,
        current_plan_data: Dict[str, Any],
        instruction: str,
        constraints_data: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """
        Interactively and deterministically modifies an existing itinerary using the shared
        timeline simulator and verifier (Section 8 & Section 9.1).
        Preserves locked commitments, reports structured diffs (kept, moved, replaced, dropped)
        and structured conflicts if a requested edit violates a locked item.
        """
        if not instruction or not instruction.strip():
            return current_plan_data

        c_data = constraints_data or {}
        original_plan_snapshot = copy.deepcopy(current_plan_data)
        plan = copy.deepcopy(current_plan_data)
        days = plan.get("days", [])
        if not days:
            return current_plan_data

        province = plan.get("destination_province") or plan.get("destination") or "Đà Nẵng"
        canonical_prov = data_loader.get_canonical_province_name(province) or province
        plan["destination_province"] = canonical_prov
        inst_lower = instruction.lower().strip()

        # Determine source tracking mode for replan (Section 9.1)
        scheduler_mode = str(c_data.get("scheduler_mode") or "").strip().lower()
        replan_source_code = "ALGORITHM"
        replan_fallback_reason = None
        replan_model_roles: List[str] = []
        if scheduler_mode in ("model_assisted", "model"):
            has_key = bool(config.LLM_API_KEY and str(config.LLM_API_KEY).strip())
            if not has_key and scheduler_mode != "model_assisted_verified_mock":
                replan_source_code = "FALLBACK_TO_ALGORITHM"
                replan_fallback_reason = "Chưa cấu hình khóa kết nối mô hình (LLM_API_KEY) khi chỉnh lịch nên chuyển sang thuật toán nội bộ."
                replan_model_roles = ["replanning_attempted"]
            else:
                replan_source_code = "MODEL_ASSISTED"
                replan_model_roles = ["replanning"]
        elif scheduler_mode == "model_timeout":
            replan_source_code = "FALLBACK_TO_ALGORITHM"
            replan_fallback_reason = "Mô hình phản hồi quá thời gian khi chỉnh lịch nên chuyển sang thuật toán nội bộ."
            replan_model_roles = ["replanning_attempted"]
        elif scheduler_mode == "model_invalid_proposal":
            replan_source_code = "FALLBACK_TO_ALGORITHM"
            replan_fallback_reason = "Đề xuất chỉnh lịch của mô hình vi phạm giờ mở cửa hoặc lịch hẹn đã khóa."
            replan_model_roles = ["replanning_attempted"]

        # 1. Identify Target Day (1-based index)
        target_day_num = int(c_data.get("target_day") or 1)
        day_match = re.search(r'ngày\s*(\d+)|ngay\s*(\d+)|day\s*(\d+)', inst_lower)
        if day_match:
            try:
                matched_val = int(day_match.group(1) or day_match.group(2) or day_match.group(3))
                if 1 <= matched_val <= len(days):
                    target_day_num = matched_val
            except Exception:
                target_day_num = 1
        elif "ngày mai" in inst_lower or "ngay mai" in inst_lower:
            target_day_num = min(len(days), 2)
        elif "ngày cuối" in inst_lower or "ngay cuoi" in inst_lower or "ngày cuối cùng" in inst_lower:
            target_day_num = len(days)

        day_idx = max(0, min(len(days) - 1, target_day_num - 1))
        target_day = days[day_idx]
        activities = target_day.get("activities", [])
        if not activities:
            return plan

        before_activities = copy.deepcopy(activities)

        # Merge locked items from constraints_data onto target_day activities
        locked_from_constraints = [
            li for li in (c_data.get("locked_items") or [])
            if int(li.get("day_number", target_day_num)) == target_day_num
        ]
        for li in locked_from_constraints:
            l_id = str(li.get("destination_id") or li.get("id") or "").strip().lower()
            l_name = str(li.get("destination_name") or li.get("name") or "").strip().lower()
            for act in activities:
                if (l_id and str(act.get("destination_id", "")).lower() == l_id) or (l_name and l_name in str(act.get("destination_name", "")).lower()):
                    act["is_locked"] = True
                    if li.get("start_time"):
                        act["start_time"] = li["start_time"]
                    if li.get("end_time"):
                        act["end_time"] = li["end_time"]

        used_ids = set()
        for d in days:
            for act in d.get("activities", []):
                used_ids.add(act.get("destination_id"))

        prov_dests = data_loader.get_by_province(canonical_prov)
        available_pool = [d for d in prov_dests if d.id not in used_ids]

        changes_summary: List[str] = []
        conflicts: List[Dict[str, Any]] = []
        transport_mode = str(c_data.get("transport_mode") or plan.get("transport_mode") or "car")
        has_elderly = bool(c_data.get("has_elderly"))
        has_children = bool(c_data.get("has_children"))

        # 2. Intent Detection & Handling
        # Case Structured Replan Action: REORDER_STOP
        if c_data.get("action") == "REORDER_STOP":
            from_idx = int(c_data.get("from_index", 0))
            to_idx = int(c_data.get("to_index", 0))
            if 0 <= from_idx < len(activities) and 0 <= to_idx < len(activities):
                moved_item = activities.pop(from_idx)
                activities.insert(to_idx, moved_item)
                changes_summary.append(
                    f"Ngày {target_day_num}: Đổi thứ tự điểm '{moved_item.get('destination_name')}' từ vị trí {from_idx+1} sang vị trí {to_idx+1}."
                )
                cls._recalculate_day_timeline(
                    target_day,
                    day_num=target_day_num,
                    start_date=c_data.get("start_date"),
                    transport_mode=transport_mode,
                    has_elderly=has_elderly
                )
            else:
                changes_summary.append(f"Ngày {target_day_num}: Vị trí đổi chỗ không hợp lệ.")

        # Case Structured Replan Action: REPLACE_STOP
        elif c_data.get("action") == "REPLACE_STOP":
            target_dest_id = c_data.get("target_destination_id")
            replacement_id = c_data.get("replacement_destination_id")
            idx_to_replace = -1
            for idx_a, act in enumerate(activities):
                if act.get("destination_id") == target_dest_id:
                    idx_to_replace = idx_a
                    break
            
            rep_dest = data_loader.get_by_id(replacement_id) if replacement_id else (available_pool[0] if available_pool else None)
            if idx_to_replace >= 0 and rep_dest:
                old_act = activities[idx_to_replace]
                old_name = old_act.get("destination_name")
                old_act["destination_id"] = rep_dest.id
                old_act["destination_name"] = rep_dest.name
                old_act["category"] = rep_dest.category
                old_act["cost_vnd"] = rep_dest.price_min
                old_act["cost_label"] = f"{rep_dest.price_min:,} VND" if rep_dest.price_min > 0 else "Miễn phí"
                old_act["note"] = rep_dest.description
                old_act["tip"] = rep_dest.local_tip
                old_act["photo_url"] = getattr(rep_dest, "photo_url", "") or old_act.get("photo_url", "")
                old_act["latitude"] = rep_dest.latitude
                old_act["longitude"] = rep_dest.longitude
                old_act["duration_min"] = getattr(rep_dest, "avg_duration_min", 90)
                old_act["rain_backup_suggestion"] = None
                used_ids.add(rep_dest.id)
                changes_summary.append(f"Ngày {target_day_num}: Đổi điểm '{old_name}' sang '{rep_dest.name}'.")
                cls._recalculate_day_timeline(
                    target_day,
                    day_num=target_day_num,
                    start_date=c_data.get("start_date"),
                    transport_mode=transport_mode,
                    has_elderly=has_elderly
                )

        # Case Structured Replan Action: RAIN_BACKUP
        elif c_data.get("action") == "RAIN_BACKUP":
            changes_summary.extend(cls._handle_rain_mode(target_day, available_pool, used_ids, target_day_num))
            cls._recalculate_day_timeline(
                target_day,
                day_num=target_day_num,
                start_date=c_data.get("start_date"),
                transport_mode=transport_mode,
                has_elderly=has_elderly
            )

        # Case Structured Replan Action: CHANGE_PACE
        elif c_data.get("action") == "CHANGE_PACE":
            new_pace = config.normalize_pace(c_data.get("pace") or c_data.get("new_pace") or plan.get("pace") or "MODERATE")
            policy = config.PACE_POLICIES.get(new_pace, config.PACE_POLICIES["MODERATE"])
            mult = policy["duration_multiplier"]
            def_buf = max(policy["default_buffer_min"], 30 if has_elderly else policy["default_buffer_min"])
            plan["pace"] = new_pace

            if new_pace == "RELAXED" and len(activities) > policy["max_stops_per_day"]:
                changes_summary.extend(cls._handle_relax_pace(target_day, target_day_num))
            elif new_pace == "INTENSIVE" and len(activities) < policy["max_stops_per_day"] and available_pool:
                changes_summary.extend(cls._handle_add_stop(target_day, available_pool, used_ids, target_day_num))

            for d_idx, d_item in enumerate(days):
                d_acts = d_item.get("activities", [])
                if not d_acts:
                    continue
                for act in d_acts:
                    if act.get("is_locked"):
                        continue
                    dest_obj = data_loader.get_by_id(act.get("destination_id"))
                    base_dur = dest_obj.avg_duration_min if dest_obj else int(act.get("duration_min") or 90)
                    scaled_dur = max(40, min(210, int(round(base_dur * mult / 5.0) * 5)))
                    act["duration_min"] = scaled_dur
                    act["buffer_min"] = def_buf
                cls._recalculate_day_timeline(
                    d_item,
                    day_num=d_idx + 1,
                    start_date=c_data.get("start_date"),
                    transport_mode=transport_mode,
                    has_elderly=has_elderly,
                    use_act_duration=True
                )

            pace_vn = "Thư thả" if new_pace == "RELAXED" else ("Đi nhiều" if new_pace == "INTENSIVE" else "Cân bằng")
            changes_summary.append(
                f"Đã điều chỉnh nhịp độ toàn chuyến sang '{pace_vn}' (hệ số thời lượng x{mult:.2f}, đệm nghỉ {def_buf} phút)."
            )

        # Case 0: Shift Lunch / Shift Specific Activity Time (e.g., "dời bữa trưa muộn 45 phút")
        elif (
            ("dời" in inst_lower or "lùi" in inst_lower or "muộn hơn" in inst_lower or "trễ hơn" in inst_lower or "shift" in inst_lower)
            and any(k in inst_lower for k in ["trưa", "bữa trưa", "ăn trưa", "lunch", "noon"])
        ) or c_data.get("action") == "SHIFT_LUNCH":
            shift_mins = int(c_data.get("shift_minutes") or 0)
            if shift_mins == 0:
                m_min = re.search(r'(\d+)\s*(?:phút|phut|p|min)', inst_lower)
                if m_min:
                    shift_mins = int(m_min.group(1))
                else:
                    shift_mins = 45
                if any(w in inst_lower for w in ["sớm hơn", "som hon", "sớm"]):
                    shift_mins = -abs(shift_mins)

            shift_msgs, shift_conflicts = cls._handle_lunch_shift(
                target_day=target_day,
                shift_minutes=shift_mins,
                day_num=target_day_num,
                start_date=c_data.get("start_date"),
                transport_mode=transport_mode,
                has_elderly=has_elderly
            )
            changes_summary.extend(shift_msgs)
            conflicts.extend(shift_conflicts)

        # Case A: Rain / Indoor Swap
        elif any(w in inst_lower for w in ["mưa", "mua", "trong nhà", "trong nha", "indoor", "bảo tàng", "thời tiết xấu"]):
            changes_summary.extend(cls._handle_rain_mode(target_day, available_pool, used_ids, target_day_num))
            cls._recalculate_day_timeline(
                target_day,
                day_num=target_day_num,
                start_date=c_data.get("start_date"),
                transport_mode=transport_mode,
                has_elderly=has_elderly
            )

        # Case B: Sleep In / Adjust Morning Start
        elif any(w in inst_lower for w in ["ngủ nướng", "ngu nuong", "dậy muộn", "day muon", "dời giờ", "xong muộn", "10h", "10:00", "trễ hơn"]):
            sleep_msgs, sleep_conflicts = cls._handle_sleep_in(target_day, inst_lower, target_day_num, transport_mode=transport_mode, has_elderly=has_elderly)
            changes_summary.extend(sleep_msgs)
            conflicts.extend(sleep_conflicts)
            if not sleep_conflicts:
                cls._recalculate_day_timeline(
                    target_day,
                    day_num=target_day_num,
                    start_date=c_data.get("start_date"),
                    transport_mode=transport_mode,
                    has_elderly=has_elderly
                )

        # Case C: Food Swap / Local Culinary
        elif any(w in inst_lower for w in ["hải sản", "hai san", "ẩm thực", "quán ăn", "đặc sản", "đổi điểm ăn", "ăn trưa", "ăn tối"]):
            changes_summary.extend(cls._handle_food_swap(target_day, available_pool, used_ids, target_day_num))
            cls._recalculate_day_timeline(
                target_day,
                day_num=target_day_num,
                start_date=c_data.get("start_date"),
                transport_mode=transport_mode,
                has_elderly=has_elderly
            )

        # Case D: Relax Pace / Remove 1 stop
        elif any(w in inst_lower for w in ["giảm tải", "mệt", "bớt điểm", "bỏ bớt", "nghỉ ngơi", "thong thả", "thư thả", "nhe nhang", "nhẹ nhàng"]):
            changes_summary.extend(cls._handle_relax_pace(target_day, target_day_num))
            plan["pace"] = "RELAXED"
            cls._recalculate_day_timeline(
                target_day,
                day_num=target_day_num,
                start_date=c_data.get("start_date"),
                transport_mode=transport_mode,
                has_elderly=has_elderly
            )

        # Case E: Intensive Pace / Add 1 stop
        elif any(w in inst_lower for w in ["đi nhiều", "di nhieu", "thêm điểm", "them diem", "dày đặc"]):
            changes_summary.extend(cls._handle_add_stop(target_day, available_pool, used_ids, target_day_num))
            plan["pace"] = "INTENSIVE"
            cls._recalculate_day_timeline(
                target_day,
                day_num=target_day_num,
                start_date=c_data.get("start_date"),
                transport_mode=transport_mode,
                has_elderly=has_elderly
            )

        else:
            llm_intent = cls._interpret_instruction_with_llm(instruction, days, canonical_prov, target_day_num)
            if llm_intent:
                llm_day = int(llm_intent.get("target_day") or target_day_num)
                if 1 <= llm_day <= len(days) and llm_day != target_day_num:
                    target_day_num = llm_day
                    target_day = days[target_day_num - 1]
                    activities = target_day.get("activities", [])
                    before_activities = copy.deepcopy(activities)
                llm_act = str(llm_intent.get("intent_action") or "").upper().strip()
                if llm_act == "RAIN_BACKUP":
                    changes_summary.extend(cls._handle_rain_mode(target_day, available_pool, used_ids, target_day_num))
                elif llm_act == "SHIFT_LUNCH":
                    s_min = int(llm_intent.get("shift_minutes") or 45)
                    s_msgs, s_confs = cls._handle_lunch_shift(
                        target_day=target_day, shift_minutes=s_min, day_num=target_day_num,
                        start_date=c_data.get("start_date"), transport_mode=transport_mode, has_elderly=has_elderly
                    )
                    changes_summary.extend(s_msgs)
                    conflicts.extend(s_confs)
                elif llm_act == "SLEEP_IN":
                    sl_msgs, sl_confs = cls._handle_sleep_in(
                        target_day, inst_lower, target_day_num, transport_mode=transport_mode, has_elderly=has_elderly
                    )
                    changes_summary.extend(sl_msgs)
                    conflicts.extend(sl_confs)
                elif llm_act == "FOOD_SWAP":
                    changes_summary.extend(cls._handle_food_swap(target_day, available_pool, used_ids, target_day_num))
                elif llm_act == "RELAX_PACE":
                    changes_summary.extend(cls._handle_relax_pace(target_day, target_day_num))
                    plan["pace"] = "RELAXED"
                elif llm_act == "ADD_STOP":
                    changes_summary.extend(cls._handle_add_stop(target_day, available_pool, used_ids, target_day_num))
                else:
                    changes_summary.extend(cls._handle_generic_swap(
                        target_day, available_pool, used_ids, target_day_num,
                        target_stop_name=llm_intent.get("target_stop_name"),
                        preferred_keyword=llm_intent.get("preferred_keyword"),
                    ))
            else:
                changes_summary.extend(cls._handle_generic_swap(target_day, available_pool, used_ids, target_day_num))

            if not conflicts:
                cls._recalculate_day_timeline(
                    target_day,
                    day_num=target_day_num,
                    start_date=c_data.get("start_date"),
                    transport_mode=transport_mode,
                    has_elderly=has_elderly
                )

        # If a hard conflict occurred (e.g., shifting lunch conflicts with a locked commitment),
        # keep the original valid day schedule intact and report the conflict clearly!
        if conflicts:
            plan = copy.deepcopy(original_plan_snapshot)
            plan["schedule_status"] = "INFEASIBLE_CONFLICT"
            plan["conflicts"] = conflicts
            if "warnings" not in plan or plan["warnings"] is None:
                plan["warnings"] = []
            for c in conflicts:
                plan["warnings"].append(f"Xung đột lịch trình: {c['message']}")
            plan["replan_diff"] = cls._compute_replan_diff(before_activities, before_activities, changes_summary, conflicts)
        else:
            plan["schedule_status"] = "FEASIBLE"
            plan["conflicts"] = []
            after_activities = target_day.get("activities", [])
            plan["replan_diff"] = cls._compute_replan_diff(before_activities, after_activities, changes_summary, [])

            # Recalculate Day Subtotal and Overall Plan Budget
            people_count = plan.get("people_count", 2)
            budget_tier = plan.get("budget_tier", "standard")
            cls._recalculate_plan_budget(plan, people_count, budget_tier, has_elderly, has_children)

            if "warnings" not in plan or plan["warnings"] is None:
                plan["warnings"] = []
            for change in changes_summary:
                plan["warnings"].append(f"AI Co-Pilot: {change}")

            target_day["day_rationale"] = (
                f"{target_day.get('day_rationale', '')} "
                f"[Cập nhật Co-Pilot: {'; '.join(changes_summary)}]"
            ).strip()

        # Generate sharp local insider commentary and pro tips
        insider_data = cls._generate_sharp_insider_advice(
            province=canonical_prov,
            instruction=instruction,
            day_num=target_day_num,
            changes_summary=changes_summary,
            llm_intent=locals().get('llm_intent')
        )
        plan["co_pilot_reply"] = insider_data.get("reply_speech")
        plan["insider_tip"] = insider_data.get("insider_tip")
        plan["proactive_suggestion"] = insider_data.get("proactive_suggestion")

        return plan

    @classmethod
    def _generate_sharp_insider_advice(
        cls,
        province: str,
        instruction: str,
        day_num: int,
        changes_summary: List[str],
        llm_intent: Optional[Dict[str, Any]] = None
    ) -> Dict[str, str]:
        """Provides witty, sharp, local connoisseur commentary and insider travel tips."""
        p_clean = province.lower().strip()
        inst_clean = instruction.lower().strip()

        # If LLM returned high quality commentary, prioritize it
        if llm_intent and isinstance(llm_intent, dict) and llm_intent.get("reply_speech") and llm_intent.get("insider_tip"):
            return {
                "reply_speech": str(llm_intent["reply_speech"]).strip(),
                "insider_tip": str(llm_intent["insider_tip"]).strip(),
                "proactive_suggestion": str(llm_intent.get("proactive_suggestion") or "").strip()
            }

        # Knowledge database for authentic local secrets
        secrets = {
            "hà tĩnh": {
                "food": "Về Hà Tĩnh mà mê hải sản thì số một là Mực nhảy Vũng Áng hấp sả gừng chấm mù tạt tươi giòn sần sật. Bữa sáng hoặc xế chiều nhớ ghé làm đĩa Bánh bèo đĩa ngập tép mỡ giòn rụm hoặc Ram bánh mướt nóng hổi nhé!",
                "timing": "Chùa Hương Tích nên đi cáp treo sớm trước 09:00 để sương mây bồng lai vừa tan, mát mẻ thanh tịnh; còn Biển Thiên Cầm thì đẹp xuất sắc nhất vào khoảng 17:15 khi ánh hoàng hôn ngả tím cam.",
                "hacks": "Mua kẹo Cu đơ làm quà nhớ ghé lò Cu đơ Thư Viện hoặc Cầu Phủ, chọn loại mới ra lò còn dẻo quánh, cắn miếng giòn tan hòa vị gừng cay the kèm bát nước chè xanh om là chuẩn bài xứ Nghệ!",
                "sunset_cafe": "Quán Cafe view Biển Thiên Cầm hoặc lầu vọng cảnh Hồ Kẻ Gỗ"
            },
            "đà nẵng": {
                "food": "Đà Nẵng sành ăn là phải bún mắm nêm thịt quay Bà Thuyên (nước mắm nêm đậm đà thơm nức mũi), mì Quảng ếch hoặc bánh tráng cuốn thịt heo Đại Lộc hai đầu da giòn ngọt.",
                "timing": "Cầu Rồng phun lửa vào 21:00 thứ Bảy & Chủ Nhật, đứng bên mạn đường Trần Hưng Đạo phía đầu rồng đón gió mát mà không lo bị tạt bọt nước. Bán đảo Sơn Trà nên đi tầm 15:30 chiều mát ngắm voọc chà vá chân nâu.",
                "hacks": "Hải sản tươi sống ghé mạn đường Võ Nguyên Giáp hoặc quán bình dân Năm Đảnh, vào bể tự tay chỉ từng con cân ký rồi hãy nhờ chế biến nướng mọi hoặc hấp sả để giữ trọn vị ngọt biển khơi.",
                "sunset_cafe": "Cafe muối đường Bạch Đằng ngắm sông Hàn lung linh hoặc dãy rooftop ven biển Mỹ Khê"
            },
            "quảng nam": {
                "food": "Phố cổ Hội An nhất định phải thử cơm gà xé giòn Bà Buội, cao lầu Bá Lễ đậm khói củi, ly nước Mót thảo mộc sả chanh hạt sen thanh lọc và bánh mì Madam Khánh giòn rụm.",
                "timing": "Hội An đẹp ma mị nhất lúc 17:00 khi hoàng hôn phủ màu vàng cam lên bức tường rêu phong, và 18:30 khi cả phố cổ đồng loạt lên đèn lồng lung linh.",
                "hacks": "Thả hoa đăng trên sông Hoài nên chọn thuyền mộc nhỏ, giá thương lượng tầm 50k - 100k/thuyền cho 2-4 người thong thả trôi dòng ngắm phố.",
                "sunset_cafe": "Faifo Coffee trên tầng thượng đường Trần Phú ngắm mái ngói rêu phong hoặc The Deck House biển An Bàng"
            },
            "lâm đồng": {
                "food": "Lên Đà Lạt trời lạnh phải làm ngay nồi Lẩu gà lá é Tao Ngộ cay the ấm bụng, bánh tráng nướng Dì Đinh giòn rụm và ly sữa đậu nành nóng hổi kèm bánh tiêu đêm chợ.",
                "timing": "Săn mây đồi Đa Phú hoặc Cầu Đất đẹp nhất lúc 05:15 - 06:15 sáng; chiều tầm 16:30 ngồi cafe ven Hồ Tuyền Lâm ngắm rừng thông soi bóng mặt nước.",
                "hacks": "Đi xe máy qua Dốc Nhà Bò hay đèo Mimosa nhớ kiểm tra phanh kỹ và về số thấp, đừng rà phanh liên tục nhé!",
                "sunset_cafe": "Tiệm Cà Phê Túi Mơ To hoặc Cheo Veooo hoàng hôn buông thung lũng"
            },
            "kiên giang": {
                "food": "Đến Phú Quốc phải nếm Gỏi cá trích cuốn bánh tráng rau rừng chấm nước mắm nhĩ pha đậu phộng béo bùi, và tự tay 'quậy' tô Bún quậy Kiến Xây nóng hổi.",
                "timing": "Ngắm hoàng hôn Phú Quốc đẹp không góc chết tại Bãi Trường hoặc Dinh Cậu đúng 17:30; đi cano tour đảo nên đi từ 08:30 sáng nước biển trong vắt như pha lê.",
                "hacks": "Mua ngọc trai hoặc nước mắm Phú Quốc nên ghé tận nhà thùng Khải Hoàn hoặc cơ sở nuôi cấy uy tín có giấy kiểm định chất lượng.",
                "sunset_cafe": "Sunset Sanato Beach Club hoặc OCSEN Beach Bar & Club ngắm mặt trời lặn biển Tây"
            }
        }

        matched_secret = None
        for k, v in secrets.items():
            if k in p_clean:
                matched_secret = v
                break
        if not matched_secret:
            matched_secret = secrets["đà nẵng"]

        # Contextual witty response generation
        if any(w in inst_clean for w in ["ngu nuong", "ngủ nướng", "day muon", "dậy muộn", "lui gio", "lùi giờ"]):
            reply = (
                f"😴 Chuẩn gu du lịch nghỉ dưỡng luôn bạn ơi! Đi chơi xả stress tái tạo năng lượng chứ có phải đi luyện quân sự đâu mà dậy sớm chi cho mệt! "
                f"Tui đã lùi lịch Ngày {day_num} xuất phát thong thả từ 09:30, bữa trưa dời sang 12:00 vừa vặn, không lo dồn dập hay trễ giờ mở cửa!"
            )
            tip = matched_secret["food"]
            proactive = f"Sau khi ngủ nướng đã đời, bạn có muốn tui gợi ý thêm {matched_secret['sunset_cafe']} để buổi chiều ghé chill ngắm cảnh không?"
        elif any(w in inst_clean for w in ["hai san", "hải sản", "an ngon", "đặc sản", "quán ăn", "chay", "ẩm thực"]):
            reply = (
                f"🦞 Đúng điệu luôn! Đi du lịch là bao tử phải được nuông chiều trước tiên. Tui đã cập nhật điểm ăn uống Ngày {day_num} sang địa chỉ ẩm thực bản địa nức tiếng với nguồn nguyên liệu tươi rói!"
            )
            tip = matched_secret["hacks"]
            proactive = "Bữa ăn này ngon chuẩn bài xong, bạn có muốn bổ sung một điểm dạo mát hoặc quán cafe thoáng mát gần đó để nghỉ trưa không?"
        elif any(w in inst_clean for w in ["mua", "mưa", "trong nha", "trong nhà", "thoi tiet", "thời tiết"]):
            reply = (
                f"☔ Nhanh trí và nhạy bén lắm! Gặp mưa gió hay thời tiết thất thường là phải chuyển sang chế độ 'du lịch trong nhà' liền tay. Tui đã dời các điểm ngoài trời sang không gian văn hóa/bảo tàng có mái che sang xịn mịn!"
            )
            tip = matched_secret["timing"]
            proactive = "Tui đã kiểm tra kỹ mái che và điều hòa mát rượi, bạn hoàn toàn yên tâm tận hưởng trọn vẹn từng khoảnh khắc nhé!"
        else:
            action_desc = "; ".join(changes_summary) if changes_summary else "Đã tối ưu lại lịch trình"
            reply = (
                f"✨ Tinh chỉnh xong xuôi theo đúng ý bạn rồi nhé! ({action_desc}). Lộ trình, nhịp di chuyển và ngân sách đã được đồng bộ hóa tức thì!"
            )
            tip = matched_secret["timing"]
            proactive = f"Bạn có muốn tui gợi ý thêm {matched_secret['sunset_cafe']} hoặc điểm check-in triệu like phụ cận không?"

        return {
            "reply_speech": reply,
            "insider_tip": tip,
            "proactive_suggestion": proactive
        }

    @classmethod
    def _handle_lunch_shift(
        cls,
        target_day: Dict[str, Any],
        shift_minutes: int,
        day_num: int,
        start_date: Optional[str] = None,
        transport_mode: str = "car",
        has_elderly: bool = False
    ) -> Tuple[List[str], List[Dict[str, Any]]]:
        """
        Shifts the lunch/noon activity by `shift_minutes` (e.g. +45 min) and simulates the impact
        on subsequent activities while preserving locked commitments and opening hours (Section 8 & 10 #10).
        """
        acts = target_day.get("activities", [])
        changes: List[str] = []
        conflicts: List[Dict[str, Any]] = []

        # Find lunch activity index
        lunch_idx = -1
        for i, act in enumerate(acts):
            if act.get("time_slot") == "NOON" or act.get("item_type") in ("MEAL", "MEAL_BREAK"):
                lunch_idx = i
                break
        if lunch_idx == -1:
            for i, act in enumerate(acts):
                st = time_to_minutes(act.get("start_time", "08:30"))
                if 11 * 60 <= st <= 13 * 60 + 30:
                    lunch_idx = i
                    break

        if lunch_idx == -1:
            return [f"Ngày {day_num}: Không tìm thấy hoạt động ăn trưa để dời giờ."], []

        lunch_act = acts[lunch_idx]
        if lunch_act.get("is_locked"):
            conflicts.append({
                "type": "HARD_CONFLICT",
                "code": "CANNOT_SHIFT_LOCKED_LUNCH",
                "item_name": lunch_act.get("destination_name"),
                "destination_id": lunch_act.get("destination_id"),
                "day_number": day_num,
                "violated_constraint": "LOCKED_COMMITMENT",
                "message": f"Bữa trưa tại '{lunch_act.get('destination_name')}' đang được khóa cố định nên không thể dời giờ.",
                "suggested_resolutions": ["Mở khóa bữa trưa trước khi dời giờ."],
                "is_search_limit": False
            })
            return [], conflicts

        old_start = time_to_minutes(lunch_act.get("start_time", "11:45"))
        old_end = time_to_minutes(lunch_act.get("end_time", "13:00"))
        dur = max(45, old_end - old_start)
        new_start = old_start + shift_minutes
        new_end = new_start + dur

        buffer_min = 30 if has_elderly else 15
        lunch_dest = data_loader.get_by_id(lunch_act.get("destination_id"))
        weekday_key, date_str = get_day_weekday_and_date(start_date, day_num)

        # Check if any subsequent LOCKED item conflicts with the shifted lunch end time!
        for j in range(lunch_idx + 1, len(acts)):
            sub_act = acts[j]
            if sub_act.get("is_locked"):
                lock_start = time_to_minutes(sub_act.get("start_time", "14:00"))
                sub_dest = data_loader.get_by_id(sub_act.get("destination_id"))
                travel_to_lock = 15
                if lunch_dest and sub_dest:
                    travel_to_lock = estimate_transit_time_minutes(
                        lunch_dest.latitude, lunch_dest.longitude,
                        sub_dest.latitude, sub_dest.longitude,
                        getattr(lunch_dest, "cluster_id", None), getattr(sub_dest, "cluster_id", None),
                        transport_mode=transport_mode
                    )
                earliest_arrival_at_lock = new_end + travel_to_lock + buffer_min
                if earliest_arrival_at_lock > lock_start:
                    max_feasible_shift = max(0, (lock_start - travel_to_lock - buffer_min) - old_end)
                    conflicts.append({
                        "type": "HARD_CONFLICT",
                        "code": "LUNCH_SHIFT_CONFLICTS_WITH_LOCKED_ITEM",
                        "item_name": sub_act.get("destination_name"),
                        "destination_id": sub_act.get("destination_id"),
                        "day_number": day_num,
                        "violated_constraint": "LOCKED_COMMITMENT",
                        "message": (
                            f"Dời bữa trưa '{lunch_act.get('destination_name')}' sang {minutes_to_time(new_start)}–{minutes_to_time(new_end)} "
                            f"(+{shift_minutes} phút) cần thêm {travel_to_lock} phút di chuyển + {buffer_min} phút đệm "
                            f"(đến nơi lúc {minutes_to_time(earliest_arrival_at_lock)}), gây xung đột trực tiếp với lịch hẹn đã khóa "
                            f"'{sub_act.get('destination_name')}' lúc {sub_act.get('start_time')}."
                        ),
                        "suggested_resolutions": [
                            f"Chỉ dời bữa trưa tối đa {max_feasible_shift} phút để kịp giờ tới '{sub_act.get('destination_name')}'.",
                            f"Rút ngắn thời lượng ăn trưa hoặc mở khóa '{sub_act.get('destination_name')}'.",
                        ],
                        "is_search_limit": False
                    })
                    return [], conflicts

        # Apply lunch shift and cascade simulation to subsequent stops on target_day
        lunch_act["start_time"] = minutes_to_time(new_start)
        lunch_act["end_time"] = minutes_to_time(new_end)
        changes.append(
            f"Ngày {day_num}: Dời bữa trưa '{lunch_act.get('destination_name')}' từ "
            f"{minutes_to_time(old_start)}–{minutes_to_time(old_end)} sang {minutes_to_time(new_start)}–{minutes_to_time(new_end)}."
        )

        cur_min = new_end
        prev_dest = lunch_dest
        kept_after_lunch = []

        for j in range(lunch_idx + 1, len(acts)):
            sub_act = acts[j]
            sub_dest = data_loader.get_by_id(sub_act.get("destination_id"))
            sub_dur = max(45, time_to_minutes(sub_act.get("end_time", "16:00")) - time_to_minutes(sub_act.get("start_time", "14:30")))

            if prev_dest and sub_dest:
                travel_min = estimate_transit_time_minutes(
                    prev_dest.latitude, prev_dest.longitude,
                    sub_dest.latitude, sub_dest.longitude,
                    getattr(prev_dest, "cluster_id", None), getattr(sub_dest, "cluster_id", None),
                    transport_mode=transport_mode
                )
            else:
                travel_min = int(sub_act.get("travel_time_from_prev_min", 15) or 15)

            if sub_act.get("is_locked"):
                # Locked item stays at exact locked start_time and end_time!
                l_st = time_to_minutes(sub_act.get("start_time"))
                l_et = time_to_minutes(sub_act.get("end_time"))
                sub_act["travel_time_from_prev_min"] = travel_min
                kept_after_lunch.append(sub_act)
                cur_min = l_et
                prev_dest = sub_dest
                continue

            # Check if there is a locked item later in the day that caps this optional activity
            next_locked_start = None
            next_locked_dest = None
            for k in range(j + 1, len(acts)):
                if acts[k].get("is_locked"):
                    next_locked_start = time_to_minutes(acts[k].get("start_time"))
                    next_locked_dest = data_loader.get_by_id(acts[k].get("destination_id"))
                    break

            arrival_at_sub = cur_min + travel_min + buffer_min
            old_sub_start = time_to_minutes(sub_act.get("start_time", "14:30"))
            # Evening venues keep evening earliest start; daytime stops shift naturally
            earliest_sub = max(arrival_at_sub, 17 * 60 + 30) if sub_act.get("time_slot") == "EVENING" else max(arrival_at_sub, old_sub_start if shift_minutes < 0 else arrival_at_sub)

            max_sub_end = 22 * 60
            if next_locked_start is not None:
                t_to_lock = 15
                if sub_dest and next_locked_dest:
                    t_to_lock = estimate_transit_time_minutes(
                        sub_dest.latitude, sub_dest.longitude,
                        next_locked_dest.latitude, next_locked_dest.longitude,
                        transport_mode=transport_mode
                    )
                max_sub_end = min(max_sub_end, next_locked_start - t_to_lock - buffer_min)

            if sub_dest:
                req_min = max(30, min(getattr(sub_dest, "min_duration_min", 45), sub_dur))
                win = find_feasible_visit_window(
                    dest=sub_dest,
                    arrival_min=arrival_at_sub,
                    req_min_dur=req_min,
                    desired_dur=sub_dur,
                    max_end_min=max_sub_end,
                    weekday_key=weekday_key,
                    date_str=date_str,
                    earliest_allowed_start=earliest_sub,
                    max_wait_min=240
                )
                if win is None:
                    changes.append(
                        f"Ngày {day_num}: Bỏ điểm tùy chọn '{sub_act.get('destination_name')}' do không còn đủ thời lượng trước giờ đóng cửa hoặc lịch hẹn khóa."
                    )
                    continue
                new_sub_st, new_sub_et, wait_m, _ = win
            else:
                if earliest_sub + 45 > max_sub_end:
                    changes.append(
                        f"Ngày {day_num}: Bỏ điểm tùy chọn '{sub_act.get('destination_name')}' do không kịp giờ trước lịch hẹn khóa."
                    )
                    continue
                new_sub_st = earliest_sub
                new_sub_et = min(max_sub_end, new_sub_st + sub_dur)

            if new_sub_st != old_sub_start:
                changes.append(
                    f"Ngày {day_num}: Tự động tính lại giờ '{sub_act.get('destination_name')}' sang {minutes_to_time(new_sub_st)}–{minutes_to_time(new_sub_et)}."
                )
            sub_act["travel_time_from_prev_min"] = travel_min
            sub_act["start_time"] = minutes_to_time(new_sub_st)
            sub_act["end_time"] = minutes_to_time(new_sub_et)
            kept_after_lunch.append(sub_act)
            cur_min = new_sub_et
            prev_dest = sub_dest

        target_day["activities"] = acts[:lunch_idx + 1] + kept_after_lunch
        return changes, conflicts

    @classmethod
    def _handle_rain_mode(
        cls,
        target_day: Dict[str, Any],
        available_pool: List[Destination],
        used_ids: set,
        day_num: int
    ) -> List[str]:
        changes = []
        acts = target_day.get("activities", [])
        indoor_candidates = [d for d in available_pool if d.indoor_outdoor in ("INDOOR", "MIXED")]
        if not indoor_candidates:
            first_db = data_loader.get_by_id(acts[0]["destination_id"]) if acts else None
            target_prov = first_db.province if first_db else ""
            indoor_candidates = [
                d for d in data_loader.destinations
                if d.indoor_outdoor in ("INDOOR", "MIXED") and (not target_prov or d.province == target_prov) and d.id not in used_ids
            ]

        for act in acts:
            if act.get("is_locked"):
                continue
            dest = data_loader.get_by_id(act.get("destination_id"))
            if dest and dest.indoor_outdoor == "OUTDOOR" and indoor_candidates:
                new_dest = indoor_candidates.pop(0)
                used_ids.add(new_dest.id)
                old_name = act.get("destination_name")

                act["destination_id"] = new_dest.id
                act["destination_name"] = new_dest.name
                act["category"] = new_dest.category
                act["cost_vnd"] = new_dest.price_min
                act["cost_label"] = f"{new_dest.price_min:,} VND" if new_dest.price_min > 0 else "Miễn phí"
                act["tip"] = new_dest.local_tip or "Điểm tham quan trong nhà tránh mưa lý tưởng."
                act["reasons"] = [
                    {
                        "code": "WEATHER_RAIN_ADAPTATION",
                        "title": "Chuyển điểm trong nhà do trời mưa",
                        "description": f"Thay thế {old_name} bằng {new_dest.name} có mái che an toàn.",
                        "metric_facts": {"indoor_outdoor": new_dest.indoor_outdoor}
                    }
                ]
                changes.append(f"Ngày {day_num}: Đổi '{old_name}' (ngoài trời) sang '{new_dest.name}' (trong nhà)")
                break

        if not changes:
            changes.append(f"Ngày {day_num}: Các điểm hiện tại đã có không gian trong nhà an toàn.")
        return changes

    @classmethod
    def _handle_sleep_in(
        cls,
        target_day: Dict[str, Any],
        inst_lower: str,
        day_num: int,
        transport_mode: str = "car",
        has_elderly: bool = False
    ) -> Tuple[List[str], List[Dict[str, Any]]]:
        acts = target_day.get("activities", [])
        if not acts:
            return [], []

        hour_match = re.search(r'(\d{1,2})(?:h|:)(\d{2})?', inst_lower)
        target_start_min = 10 * 60
        if hour_match:
            h = int(hour_match.group(1))
            m = int(hour_match.group(2) or 0)
            target_start_min = h * 60 + m

        if acts[0].get("is_locked") and time_to_minutes(acts[0].get("start_time", "08:30")) < target_start_min:
            return [], [{
                "type": "HARD_CONFLICT",
                "code": "SLEEP_IN_CONFLICTS_WITH_LOCKED_ITEM",
                "item_name": acts[0].get("destination_name"),
                "destination_id": acts[0].get("destination_id"),
                "day_number": day_num,
                "violated_constraint": "LOCKED_COMMITMENT",
                "message": f"Không thể lùi giờ xuất phát sang {minutes_to_time(target_start_min)} vì '{acts[0].get('destination_name')}' đã khóa lúc {acts[0].get('start_time')}.",
                "suggested_resolutions": [f"Mở khóa '{acts[0].get('destination_name')}' hoặc chọn giờ xuất phát sớm hơn {acts[0].get('start_time')}."],
                "is_search_limit": False
            }]

        curr_first_min = time_to_minutes(acts[0].get("start_time", "08:30"))
        if curr_first_min >= target_start_min:
            return [f"Ngày {day_num}: Giờ xuất phát hiện tại ({acts[0].get('start_time')}) đã thong thả."], []

        if len(acts) >= 4 and acts[0].get("time_slot") == "MORNING" and not acts[0].get("is_locked"):
            dropped = acts.pop(0)
            changes = [f"Ngày {day_num}: Bỏ bớt điểm sớm '{dropped.get('destination_name')}' và dời giờ bắt đầu sang {minutes_to_time(target_start_min)} để đoàn ngủ nướng."]
        else:
            changes = [f"Ngày {day_num}: Dời giờ xuất phát sang {minutes_to_time(target_start_min)}."]

        acts[0]["start_time"] = minutes_to_time(target_start_min)
        acts[0]["travel_time_from_prev_min"] = 0
        return changes, []

    @classmethod
    def _handle_food_swap(
        cls,
        target_day: Dict[str, Any],
        available_pool: List[Destination],
        used_ids: set,
        day_num: int
    ) -> List[str]:
        acts = target_day.get("activities", [])
        food_candidates = [
            d for d in available_pool
            if is_food_destination(d) and is_slot_suitable(d, "NOON")
        ]
        if not food_candidates:
            return [f"Ngày {day_num}: Không tìm thấy quán ăn mới chưa có trong lịch trình."]

        target_idx = -1
        for i, act in enumerate(acts):
            if act.get("is_locked"):
                continue
            if act.get("time_slot") in ("NOON", "EVENING") or act.get("item_type") in ("MEAL", "MEAL_BREAK"):
                target_idx = i
                break
        if target_idx == -1 and len(acts) > 1:
            for i in range(1, len(acts)):
                if not acts[i].get("is_locked"):
                    target_idx = i
                    break

        if target_idx >= 0:
            act = acts[target_idx]
            old_name = act.get("destination_name")
            new_food = food_candidates[0]
            used_ids.add(new_food.id)

            act["destination_id"] = new_food.id
            act["destination_name"] = new_food.name
            act["category"] = new_food.category
            act["cost_vnd"] = new_food.price_min
            act["cost_label"] = f"{new_food.price_min:,} VND" if new_food.price_min > 0 else "Theo menu"
            act["tip"] = new_food.local_tip or "Thưởng thức các món đặc sản chuẩn vị bản địa."
            return [f"Ngày {day_num}: Đổi điểm ăn '{old_name}' thành quán đặc sản '{new_food.name}'"]

        return [f"Ngày {day_num}: Giữ nguyên lịch trình ẩm thực hiện tại."]

    @classmethod
    def _handle_relax_pace(cls, target_day: Dict[str, Any], day_num: int) -> List[str]:
        acts = target_day.get("activities", [])
        unlocked_indices = [i for i, a in enumerate(acts) if not a.get("is_locked") and a.get("time_slot") != "NOON"]
        if len(acts) <= 2 or not unlocked_indices:
            return [f"Ngày {day_num}: Lịch trình đã rất nhẹ nhàng (chỉ có {len(acts)} điểm)."]

        drop_idx = unlocked_indices[-1]
        for i in reversed(unlocked_indices):
            d = data_loader.get_by_id(acts[i].get("destination_id"))
            if d and d.walking_load == "STRENUOUS":
                drop_idx = i
                break

        dropped = acts.pop(drop_idx)
        return [f"Ngày {day_num}: Bỏ bớt điểm '{dropped.get('destination_name')}' và kéo giãn thời gian nghỉ ngơi thư giãn (nhịp độ RELAXED)."]

    @classmethod
    def _handle_add_stop(
        cls,
        target_day: Dict[str, Any],
        available_pool: List[Destination],
        used_ids: set,
        day_num: int
    ) -> List[str]:
        acts = target_day.get("activities", [])
        if not available_pool:
            return [f"Ngày {day_num}: Không còn điểm khả dụng để thêm."]
        new_dest = available_pool[0]
        used_ids.add(new_dest.id)
        acts.append({
            "destination_id": new_dest.id,
            "destination_name": new_dest.name,
            "time_slot": "AFTERNOON",
            "start_time": "15:30",
            "end_time": "17:00",
            "category": new_dest.category,
            "cost_vnd": new_dest.price_min,
            "cost_label": f"{new_dest.price_min:,} VND" if new_dest.price_min > 0 else "Miễn phí",
            "travel_time_from_prev_min": 15,
            "buffer_min": 15,
            "reasons": [],
            "note": new_dest.description,
            "tip": new_dest.local_tip,
            "latitude": new_dest.latitude,
            "longitude": new_dest.longitude,
            "photo_url": getattr(new_dest, "photo_url", ""),
            "data_confidence": "VERIFIED",
            "is_locked": False
        })
        return [f"Ngày {day_num}: Thêm điểm tham quan '{new_dest.name}' theo nhịp độ đi nhiều."]

    @classmethod
    def _interpret_instruction_with_llm(
        cls,
        instruction: str,
        days: List[Dict[str, Any]],
        province: str,
        default_day_num: int,
    ) -> Optional[Dict[str, Any]]:
        """Uses Gemini JSON mode with few-shot in-context learning to interpret Co-Pilot requests with a sharp, witty local expert persona."""
        from services.gemini_client import call_gemini_json

        if not config.get_ordered_llm_keys() or not config.LLM_BASE_URL:
            return None

        compact_days = [
            {
                "day": d.get("day_number", i + 1),
                "stops": [a.get("destination_name") for a in d.get("activities", [])],
            }
            for i, d in enumerate(days)
        ]
        system_prompt = (
            "Bạn là 'Thổ Địa Du Lịch AI Sành Sỏi VISTA' - chuyên gia đồng hành du lịch thông minh, hóm hỉnh, am hiểu sâu sắc văn hóa, ẩm thực và đường đi nước bước tại từng tỉnh thành Việt Nam.\n"
            "Nhiệm vụ của bạn là đọc hiểu ý định tinh tế của người dùng và trả về JSON thuần túy có cấu trúc chính xác sau:\n"
            "{\n"
            '  "target_day": int,\n'
            '  "intent_action": "RAIN_BACKUP"|"SHIFT_LUNCH"|"SLEEP_IN"|"FOOD_SWAP"|"RELAX_PACE"|"ADD_STOP"|"SMART_SWAP"|"SUNSET_CHILL"|"BUDGET_OPTIMIZE"|"NIGHTLIFE"|"ELDERLY_FRIENDLY",\n'
            '  "shift_minutes": int|null,\n'
            '  "target_stop_name": string|null,\n'
            '  "preferred_keyword": string|null,\n'
            '  "reply_speech": string (Câu trả lời cực kỳ sắc sảo, hóm hỉnh, ấm áp, đậm chất thổ địa sành sỏi, giải thích rõ hành động vừa làm),\n'
            '  "insider_tip": string (Mẹo thực chiến độc quyền chỉ dân bản địa mới biết về ẩm thực, giờ đẹp ngắm cảnh, hoặc lưu ý tránh bẫy du lịch tại tỉnh này),\n'
            '  "proactive_suggestion": string (Gợi ý bước tiếp theo hoặc điểm đến phụ cận cực kỳ cuốn hút)\n'
            "}\n\n"
            "Quy tắc phản hồi siêu bén:\n"
            "1. Phong thái: Duyên dáng, thông minh, tinh tế, am hiểu gu ăn uống và nghỉ dưỡng, không dùng văn mẫu khô khan như robot.\n"
            "2. Khi người dùng muốn ngủ nướng: Luôn đồng cảm nhiệt tình ('Đi du lịch là xả stress, chứ không phải chạy deadline hay tập thể dục quân sự!'), lùi giờ khởi hành và tính toán bữa trưa thong thả.\n"
            "3. Khi muốn đổi quán ăn/hải sản: Nhắc nhở mẹo chọn hải sản tươi sống bơi tại bể, niêm yết giá rõ ràng, hoặc món chấm độc quyền.\n"
            "4. insider_tip phải thật cụ thể theo tỉnh thành điểm đến (ví dụ ở Hà Tĩnh thì nhắc bánh bèo tép giòn, mực nhảy Vũng Áng; ở Đà Nẵng nhắc bún mắm nêm, cafe muối; ở Phú Quốc nhắc gỏi cá trích, bún quậy)."
        )
        user_prompt = (
            f"Điểm đến: {province}\n"
            f"Ngày mặc định người dùng đang xem: Ngày {default_day_num}\n"
            f"Các chặng trong lịch trình hiện tại: {compact_days}\n"
            f"Yêu cầu của du khách: \"{instruction}\""
        )
        return call_gemini_json(system_prompt=system_prompt, user_prompt=user_prompt, temperature=0.25, max_tokens=650, timeout_s=6.5)

    @classmethod
    def _handle_generic_swap(
        cls,
        target_day: Dict[str, Any],
        available_pool: List[Destination],
        used_ids: set,
        day_num: int,
        target_stop_name: Optional[str] = None,
        preferred_keyword: Optional[str] = None,
    ) -> List[str]:
        acts = target_day.get("activities", [])
        unlocked = [a for a in acts if not a.get("is_locked")]
        if not unlocked or not available_pool:
            return [f"Ngày {day_num}: Đã giữ nguyên các điểm tối ưu."]

        act = unlocked[-1]
        if target_stop_name and isinstance(target_stop_name, str):
            t_low = target_stop_name.lower().strip()
            matched_act = next((a for a in unlocked if t_low in str(a.get("destination_name", "")).lower()), None)
            if matched_act:
                act = matched_act

        new_dest = available_pool[0]
        if preferred_keyword and isinstance(preferred_keyword, str):
            kw = preferred_keyword.lower().strip()
            kw_matches = [
                d for d in available_pool
                if kw in f"{d.name} {d.category} {d.description or ''}".lower()
            ]
            if kw_matches:
                # Prefer curated Tier-1 match when available
                kw_matches.sort(key=lambda d: 0 if getattr(d, "data_source", "") != "OPENSTREETMAP_REAL" else 1)
                new_dest = kw_matches[0]

        old_name = act.get("destination_name")
        used_ids.add(new_dest.id)

        act["destination_id"] = new_dest.id
        act["destination_name"] = new_dest.name
        act["category"] = new_dest.category
        act["cost_vnd"] = new_dest.price_min
        act["cost_label"] = f"{new_dest.price_min:,} VND" if new_dest.price_min > 0 else "Miễn phí"
        act["note"] = new_dest.description or act.get("note", "")
        act["tip"] = new_dest.local_tip or "Khám phá địa danh độc đáo."
        act["latitude"] = new_dest.latitude
        act["longitude"] = new_dest.longitude
        act["photo_url"] = getattr(new_dest, "photo_url", "") or act.get("photo_url", "")

        return [f"Ngày {day_num}: Đổi '{old_name}' sang trải nghiệm mới tại '{new_dest.name}'"]

    @classmethod
    def _recalculate_day_timeline(
        cls,
        target_day: Dict[str, Any],
        day_num: int = 1,
        start_date: Optional[str] = None,
        transport_mode: str = "car",
        has_elderly: bool = False,
        use_act_duration: bool = False
    ):
        """
        Recalculates `target_day` timeline using the shared continuous visit window logic:
        - Preserves `is_locked` items at their exact locked `start_time` and `end_time`.
        - Ensures every DB-backed activity fits within a single continuous opening interval.
        """
        acts = target_day.get("activities", [])
        if not acts:
            return

        weekday_key, date_str = get_day_weekday_and_date(start_date, day_num)
        cur_min = time_to_minutes(acts[0].get("start_time", "08:30"))
        prev_dest = None
        buffer_min = 30 if has_elderly else 15

        kept_acts = []
        for i, act in enumerate(acts):
            dest = data_loader.get_by_id(act.get("destination_id"))
            default_dur = dest.avg_duration_min if dest else 90
            duration = int(act.get("duration_min") or default_dur) if use_act_duration else default_dur

            if i == 0:
                travel_min = 0
                dist_km = 0.0
            else:
                if prev_dest and dest:
                    c1 = getattr(prev_dest, "cluster_id", None)
                    c2 = getattr(dest, "cluster_id", None)
                    dist_km = estimate_road_distance_km(prev_dest.latitude, prev_dest.longitude, dest.latitude, dest.longitude, c1, c2)
                    travel_min = estimate_transit_time_minutes(prev_dest.latitude, prev_dest.longitude, dest.latitude, dest.longitude, c1, c2, transport_mode=transport_mode)
                else:
                    dist_km = float(act.get("travel_distance_km", 2.5) or 2.5)
                    travel_min = 15
                act_buf = int(act.get("buffer_min", buffer_min) or buffer_min)
                cur_min += travel_min + act_buf

            if act.get("is_locked"):
                l_st = time_to_minutes(act.get("start_time"))
                l_et = time_to_minutes(act.get("end_time"))
                act["travel_time_from_prev_min"] = travel_min
                act["travel_distance_km"] = round(dist_km, 2)
                kept_acts.append(act)
                cur_min = l_et
                prev_dest = dest
                continue

            if dest:
                req_min = max(30, min(getattr(dest, "min_duration_min", 45), duration))
                win = find_feasible_visit_window(
                    dest=dest,
                    arrival_min=cur_min,
                    req_min_dur=req_min,
                    desired_dur=duration,
                    max_end_min=22 * 60,
                    weekday_key=weekday_key,
                    date_str=date_str,
                    earliest_allowed_start=cur_min,
                    max_wait_min=240
                )
                if win is not None:
                    st_m, et_m, wait_m, h_status = win
                    act["start_time"] = minutes_to_time(st_m)
                    act["end_time"] = minutes_to_time(et_m)
                    act["duration_min"] = max(30, et_m - st_m)
                    act["wait_time_min"] = wait_m
                    act["opening_hours_status"] = h_status
                    cur_min = et_m
                else:
                    act["start_time"] = minutes_to_time(cur_min)
                    cur_min += duration
                    act["end_time"] = minutes_to_time(cur_min)
                    act["duration_min"] = duration
            else:
                act["start_time"] = minutes_to_time(cur_min)
                cur_min += duration
                act["end_time"] = minutes_to_time(cur_min)
                act["duration_min"] = duration

            act["travel_time_from_prev_min"] = travel_min
            act["travel_distance_km"] = round(dist_km, 2)
            kept_acts.append(act)
            prev_dest = dest

        target_day["activities"] = kept_acts

    @classmethod
    def _compute_replan_diff(
        cls,
        before_acts: List[Dict[str, Any]],
        after_acts: List[Dict[str, Any]],
        changes_summary: List[str],
        conflicts: List[Dict[str, Any]]
    ) -> Dict[str, Any]:
        """
        Produces structured diff (`kept`, `moved`, `replaced`, `dropped`) comparing before and after replan (Section 8).
        """
        kept = []
        moved = []
        replaced = []
        dropped = []

        before_by_id = {a.get("destination_id"): a for a in before_acts}
        after_by_id = {a.get("destination_id"): a for a in after_acts}

        for a_id, b_act in before_by_id.items():
            if a_id in after_by_id:
                a_act = after_by_id[a_id]
                if b_act.get("start_time") == a_act.get("start_time") and b_act.get("end_time") == a_act.get("end_time"):
                    kept.append({
                        "destination_id": a_id,
                        "destination_name": a_act.get("destination_name"),
                        "start_time": a_act.get("start_time"),
                        "end_time": a_act.get("end_time"),
                        "is_locked": bool(a_act.get("is_locked", False)),
                    })
                else:
                    moved.append({
                        "destination_id": a_id,
                        "destination_name": a_act.get("destination_name"),
                        "old_start_time": b_act.get("start_time"),
                        "old_end_time": b_act.get("end_time"),
                        "new_start_time": a_act.get("start_time"),
                        "new_end_time": a_act.get("end_time"),
                        "reason": "Điều chỉnh khung giờ theo thay đổi dây chuyền trong ngày."
                    })

        new_ids = [a.get("destination_id") for a in after_acts if a.get("destination_id") not in before_by_id]
        removed_ids = [a.get("destination_id") for a in before_acts if a.get("destination_id") not in after_by_id]

        paired_count = min(len(removed_ids), len(new_ids))
        for idx in range(paired_count):
            old_a = before_by_id[removed_ids[idx]]
            new_a = after_by_id[new_ids[idx]]
            replaced.append({
                "old_destination_id": old_a.get("destination_id"),
                "old_destination_name": old_a.get("destination_name"),
                "new_destination_id": new_a.get("destination_id"),
                "new_destination_name": new_a.get("destination_name"),
                "start_time": new_a.get("start_time"),
                "end_time": new_a.get("end_time"),
                "reason": changes_summary[0] if changes_summary else "Thay thế địa điểm theo yêu cầu."
            })

        for r_id in removed_ids[paired_count:]:
            old_a = before_by_id[r_id]
            dropped.append({
                "destination_id": old_a.get("destination_id"),
                "destination_name": old_a.get("destination_name"),
                "old_start_time": old_a.get("start_time"),
                "old_end_time": old_a.get("end_time"),
                "reason": changes_summary[-1] if changes_summary else "Không còn đủ thời lượng hợp lệ trong ngày."
            })

        return {
            "kept": kept,
            "moved": moved,
            "replaced": replaced,
            "dropped": dropped,
            "summary": changes_summary,
            "has_conflicts": len(conflicts) > 0,
        }

    @classmethod
    def _recalculate_plan_budget(
        cls,
        plan: Dict[str, Any],
        people_count: int,
        budget_tier: str,
        has_elderly: bool,
        has_children: bool
    ):
        total_days = len(plan.get("days", []))
        for day in plan.get("days", []):
            day_cost = sum(act.get("cost_vnd", 0) for act in day.get("activities", []))
            day["subtotal_cost_vnd"] = day_cost

        constraints = UserConstraints(
            destination_province=plan.get("destination_province", "Đà Nẵng"),
            total_days=total_days,
            people_count=people_count,
            budget_tier=budget_tier,
            has_elderly=has_elderly,
            has_children=has_children
        )

        class DummyAct:
            def __init__(self, time_slot, cost_vnd, item_type="SIGHTSEEING"):
                self.time_slot = time_slot
                self.cost_vnd = cost_vnd
                self.item_type = item_type

        days_activities = []
        for d in plan.get("days", []):
            acts = [
                DummyAct(a.get("time_slot", "MORNING"), a.get("cost_vnd", 0), a.get("item_type", "SIGHTSEEING"))
                for a in d.get("activities", [])
            ]
            days_activities.append(acts)

        budget_summary = BudgetCalculatorEngine.calculate_trip_budget(days_activities, constraints)

        plan["estimated_total_cost_vnd"] = budget_summary["grand_total_vnd"]
        plan["min_fluctuation_vnd"] = budget_summary["min_fluctuation_vnd"]
        plan["max_fluctuation_vnd"] = budget_summary["max_fluctuation_vnd"]
        plan["breakdown"] = budget_summary["breakdown"]
