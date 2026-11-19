import re
import logging
from typing import Dict, Any, List, Optional, Tuple
from datetime import date, timedelta
import config

logger = logging.getLogger("intent_parser")

# Canonical provinces and alias keywords
PROVINCE_ALIASES: Dict[str, List[str]] = {
    "Đà Nẵng": ["da nang", "đà nẵng", "danang", "đà thành", "sơn trà", "bà nà"],
    "Hà Nội": ["ha noi", "hà nội", "hanoi", "thủ đô", "hoàn kiếm", "phố cổ hà nội"],
    "TP. Hồ Chí Minh": ["ho chi minh", "hồ chí minh", "tphcm", "tp hcm", "sài gòn", "sai gon", "hcmc", "sg"],
    "Thừa Thiên Huế": ["thừa thiên huế", "thua thien hue", "huế", "hue", "cố đô"],
    "Quảng Nam": ["quảng nam", "quang nam", "hội an", "hoi an", "cù lao chàm", "mỹ sơn"],
    "Khánh Hòa": ["khánh hòa", "khanh hoa", "nha trang", "cam ranh", "vịnh ninh vân"],
    "Kiên Giang": ["kiên giang", "kien giang", "phú quốc", "phu quoc", "đảo ngọc", "hà tiên", "nam du"],
    "Lâm Đồng": ["lâm đồng", "lam dong", "đà lạt", "da lat", "phố núi", "bảo lộc"],
    "Quảng Ninh": ["quảng ninh", "quang ninh", "hạ long", "ha long", "bãi cháy", "yên tử", "cô tô", "vân đồn"],
    "Ninh Bình": ["ninh bình", "ninh binh", "tràng an", "tam cốc", "bái đính", "hoa lư"],
    "Bà Rịa - Vũng Tàu": ["bà rịa", "vũng tàu", "vung tau", "ba ria", "côn đảo", "con dao", "hồ tràm"],
    "Bình Định": ["bình định", "binh dinh", "quy nhơn", "quy nhon", "kỳ co", "eo gió"],
    "Phú Yên": ["phú yên", "phu yen", "tuy hòa", "gành đá đĩa", "xứ nẫu"],
    "Lào Cai": ["lào cai", "lao cai", "sa pa", "sapa", "fansipan", "bắc hà"],
    "Hà Giang": ["hà giang", "ha giang", "mã pí lèng", "đồng văn", "mèo vạc", "hoàng su phì"],
    "Bình Thuận": ["bình thuận", "binh thuan", "mũi né", "mui ne", "phan thiết", "phú quý"],
    "Cần Thơ": ["cần thơ", "can tho", "chợ nổi cái răng", "bến ninh kiều"],
    "An Giang": ["an giang", "châu đốc", "rừng tràm trà sư", "núi cấm"],
    "Hòa Bình": ["hòa bình", "hoa binh", "mai châu", "thung nai"],
    "Hà Nam": ["hà nam", "ha nam", "tam chúc"],
    "Tây Ninh": ["tây ninh", "tay ninh", "núi bà đen"],
    "Hải Phòng": ["hải phòng", "hai phong", "cát bà", "cat ba", "đồ sơn"],
    "Quảng Bình": ["quảng bình", "quang binh", "phong nha", "kẻ bàng", "đồng hới", "nhật lệ"],
    "Nghệ An": ["nghệ an", "nghe an", "cửa lò", "vinh", "nam đàn"],
    "Thanh Hóa": ["thanh hóa", "thanh hoa", "sầm sơn", "pù luông", "hải tiến"],
    "Cao Bằng": ["cao bằng", "cao bang", "bản giốc", "pác bó"],
    "Bắc Kạn": ["bắc kạn", "bac kan", "hồ ba bể", "ba bể"],
    "Sơn La": ["sơn la", "son la", "mộc châu", "moc chau", "tà xùa"],
    "Yên Bái": ["yên bái", "yen bai", "mù cang chải", "trạm tấu"],
    "Gia Lai": ["gia lai", "pleiku", "biển hồ"],
    "Đắk Lắk": ["đắk lắk", "dak lak", "buôn ma thuột", "buon ma thuot", "hồ lắk"],
    "Kon Tum": ["kon tum", "măng đen", "mang den"],
    "Bến Tre": ["bến tre", "ben tre", "xứ dừa"],
    "Tiền Giang": ["tiền giang", "tien giang", "mỹ tho"],
    "Đồng Tháp": ["đồng tháp", "dong thap", "sa đéc", "tràm chim"],
    "Cà Mau": ["cà mau", "ca mau", "đất mũi", "u minh"],
    "Sóc Trăng": ["sóc trăng", "soc trang"],
    "Bạc Liêu": ["bạc liêu", "bac lieu"],
    "Vĩnh Phúc": ["vĩnh phúc", "vinh phuc", "tam đảo", "tam dao", "đại lải"],
    "Phú Thọ": ["phú thọ", "phu tho", "đền hùng", "thanh thủy"],
    "Bắc Ninh": ["bắc ninh", "bac ninh", "kinh bắc"],
    "Nam Định": ["nam định", "nam dinh", "phủ dầy", "quất lâm"],
    "Thái Bình": ["thái bình", "thai binh", "cồn vành"],
    "Hải Dương": ["hải dương", "hai duong", "côn sơn", "kiếp bạc"],
    "Hưng Yên": ["hưng yên", "hung yen", "phố hiến", "ecopark"],
}

SUB_DESTINATION_MAP: List[Tuple[str, str, str]] = [
    ("phú quốc", "Phú Quốc", "Kiên Giang"),
    ("phu quoc", "Phú Quốc", "Kiên Giang"),
    ("đảo ngọc", "Phú Quốc", "Kiên Giang"),
    ("hà tiên", "Hà Tiên", "Kiên Giang"),
    ("hội an", "Hội An", "Quảng Nam"),
    ("hoi an", "Hội An", "Quảng Nam"),
    ("đà lạt", "Đà Lạt", "Lâm Đồng"),
    ("da lat", "Đà Lạt", "Lâm Đồng"),
    ("bảo lộc", "Bảo Lộc", "Lâm Đồng"),
    ("sa pa", "Sa Pa", "Lào Cai"),
    ("sapa", "Sa Pa", "Lào Cai"),
    ("nha trang", "Nha Trang", "Khánh Hòa"),
    ("cam ranh", "Cam Ranh", "Khánh Hòa"),
    ("vũng tàu", "Vũng Tàu", "Bà Rịa - Vũng Tàu"),
    ("vung tau", "Vũng Tàu", "Bà Rịa - Vũng Tàu"),
    ("côn đảo", "Côn Đảo", "Bà Rịa - Vũng Tàu"),
    ("con dao", "Côn Đảo", "Bà Rịa - Vũng Tàu"),
    ("hạ long", "Hạ Long", "Quảng Ninh"),
    ("ha long", "Hạ Long", "Quảng Ninh"),
    ("mũi né", "Mũi Né", "Bình Thuận"),
    ("mui ne", "Mũi Né", "Bình Thuận"),
    ("phan thiết", "Phan Thiết", "Bình Thuận"),
    ("quy nhơn", "Quy Nhơn", "Bình Định"),
    ("quy nhon", "Quy Nhơn", "Bình Định"),
    ("cát bà", "Cát Bà", "Hải Phòng"),
    ("mộc châu", "Mộc Châu", "Sơn La"),
    ("măng đen", "Măng Đen", "Kon Tum"),
    ("tam đảo", "Tam Đảo", "Vĩnh Phúc"),
    ("phong nha", "Phong Nha", "Quảng Bình"),
]

NEGATION_PREFIXES = (
    r"(?:không\s*muốn(?:\s*đi|\s*ghé|\s*ăn|\s*chơi)?|"
    r"không\s*thích(?:\s*đi|\s*ghé|\s*ăn|\s*chơi)?|"
    r"không\s*đi|không\s*ra|không\s*ăn|không\s*vào|"
    r"đừng(?:\s*xếp|\s*đi|\s*cho)?|tránh(?:\s*đi|\s*xếp|\s*các\s*điểm)?|"
    r"bỏ\s*qua|dị\s*ứng|sợ)"
)

INTEREST_PATTERNS: List[Tuple[str, str, str]] = [
    ("biển & nghỉ dưỡng", "biển", r"biển|tắm\s*biển|bãi\s*biển|nghỉ\s*dưỡng\s*biển|lặn\s*biển|ngắm\s*hoàng\s*hôn"),
    ("ẩm thực bản địa", "ẩm thực", r"ẩm\s*thực|ăn\s*uống|món\s*ngon|hải\s*sản|ăn\s*vặt|đặc\s*sản|cafe|cà\s*phê|bún|phở|chè"),
    ("văn hóa & di sản", "tâm linh", r"lịch\s*sử|văn\s*hóa|di\s*tích|chùa|đền|lăng\s*tẩm|lăng|bảo\s*tàng|cổ\s*kính|di\s*sản|tâm\s*linh"),
    ("check-in sống ảo", "check-in", r"sống\s*ảo|chụp\s*hình|check-in|check\s*in|chụp\s*ảnh|view\s*đẹp"),
    ("thiên nhiên sinh thái", "leo núi", r"thiên\s*nhiên|núi|leo\s*núi|rừng|sinh\s*thái|suối|thác|cắm\s*trại|trekking"),
    ("vui chơi giải trí", "công viên giải trí", r"vui\s*chơi|công\s*viên|giải\s*trí|safari|vinwonders|sun\s*world|cáp\s*treo"),
]

AVOID_TARGET_PATTERNS: List[Tuple[str, str]] = [
    ("biển", r"biển|tắm\s*biển|bãi\s*biển|ra\s*đảo"),
    ("leo núi", r"leo\s*núi|núi\s*cao|đèo\s*dốc|trekking|mạo\s*hiểm|đi\s*bộ\s*nhiều"),
    ("tâm linh", r"chùa|đền|miếu|lăng\s*tẩm|tâm\s*linh"),
    ("bảo tàng", r"bảo\s*tàng|di\s*tích"),
    ("công viên giải trí", r"công\s*viên\s*giải\s*trí|vui\s*chơi\s*cảm\s*giác\s*mạnh|vinwonders|bà\s*nà"),
    ("chợ", r"chợ\s*đêm|chợ\s*truyền\s*thống|mua\s*sắm"),
    ("ồn ào", r"ồn\s*ào|đông\s*đúc|xô\s*bồ|bar|pub|phố\s*đêm"),
    ("hải sản", r"hải\s*sản"),
]

def remove_vietnamese_accents(text: str) -> str:
    patterns = {
        '[àáảãạăằắẳẵặâầấẩẫậ]': 'a',
        '[èéẻẽẹêềếểễệ]': 'e',
        '[ìíỉĩị]': 'i',
        '[òóỏõọôồốổỗộơờớởỡợ]': 'o',
        '[ùúủũụưừứửữự]': 'u',
        '[ỳýỷỹỵ]': 'y',
        '[đ]': 'd',
        '[ÀÁẢÃẠĂẰẮẲẴẶÂẦẤẨẪẬ]': 'A',
        '[ÈÉẺẼẸÊỀẾỂỄỆ]': 'E',
        '[ÌÍỈĨỊ]': 'I',
        '[ÒÓỎÕỌÔỒỐỔỖỘƠỜỚỞỠỢ]': 'O',
        '[ÙÚỦŨỤƯỪỨỬỮỰ]': 'U',
        '[ỲÝỶỸỴ]': 'Y',
        '[Đ]': 'D'
    }
    res = text
    for pattern, repl in patterns.items():
        res = re.sub(pattern, repl, res)
    return res

class IntentParserEngine:
    @classmethod
    def parse_intent(cls, prompt: str) -> Dict[str, Any]:
        """
        Parses natural language prompt into structured user constraints.
        Tries LLM if configured; always guarantees deterministic semantic extraction fallback.
        """
        if not prompt or not prompt.strip():
            return cls._default_constraints()

        deterministic_result = cls._parse_deterministic(prompt)

        if config.get_ordered_llm_keys() and config.LLM_BASE_URL and len(prompt.strip().split()) > 4:
            try:
                llm_enhanced = cls._parse_with_llm(prompt, deterministic_result)
                if llm_enhanced and llm_enhanced.get("destination"):
                    return llm_enhanced
            except Exception as e:
                logger.warning(f"LLM intent parsing skipped due to error: {e}")

        return deterministic_result

    @classmethod
    def _default_constraints(cls) -> Dict[str, Any]:
        tomorrow = (date.today() + timedelta(days=1)).strftime("%Y-%m-%d")
        return {
            "destination": "Đà Nẵng",
            "sub_destination": None,
            "total_days": 3,
            "people_count": 2,
            "budget_tier": "standard",
            "max_total_budget_vnd": None,
            "has_elderly": False,
            "has_children": False,
            "pace": "MODERATE",
            "interests": [],
            "must_avoid": [],
            "arrival_time": "08:00",
            "departure_time": "18:00",
            "start_date": tomorrow,
            "needs_clarification": True,
            "clarification_questions": [
                "Bạn muốn đi du lịch tại tỉnh/thành phố nào và trong bao nhiêu ngày?"
            ],
            "extracted_notes": "Tự động gợi ý mặc định (cần làm rõ điểm đến)"
        }

    @classmethod
    def _parse_deterministic(cls, prompt: str) -> Dict[str, Any]:
        raw_text = prompt.strip()
        text_lower = raw_text.lower()
        text_no_accents = remove_vietnamese_accents(text_lower)

        clarification_questions: List[str] = []
        needs_clarification = False

        # 1. Sub-destination & Canonical Province Extraction (including multi-destination ambiguity check)
        matched_provinces: List[str] = []
        matched_sub_dest: Optional[str] = None

        for sub_kw, sub_label, prov_canonical in SUB_DESTINATION_MAP:
            pattern = r'(?:\b|\A)' + re.escape(sub_kw) + r'(?:\b|\Z)'
            if re.search(pattern, text_lower) or re.search(pattern, text_no_accents):
                if matched_sub_dest is None:
                    matched_sub_dest = sub_label
                if prov_canonical not in matched_provinces:
                    matched_provinces.append(prov_canonical)

        for canonical, aliases in PROVINCE_ALIASES.items():
            for alias in aliases:
                pattern = r'(?:\b|\A)' + re.escape(alias) + r'(?:\b|\Z)'
                if re.search(pattern, text_lower) or re.search(pattern, text_no_accents):
                    if canonical not in matched_provinces:
                        matched_provinces.append(canonical)
                    break

        # Detect ambiguity like "Hà Nội hay Hải Phòng", "Đà Nẵng hoặc Nha Trang", "nên đi đâu"
        has_choice_conjunction = bool(
            re.search(r'\b(hay\s+là|hay|hoặc\s+là|hoặc|phân\s*vân|chưa\s*biết\s*đi\s*đâu|nên\s*đi\s*đâu)\b', text_lower)
        )
        if len(matched_provinces) >= 2 and has_choice_conjunction:
            needs_clarification = True
            clarification_questions.append(
                f"Bạn đang phân vân giữa {' và '.join(matched_provinces[:3])}. Bạn muốn lập lịch trình cho điểm đến nào trước?"
            )
        elif len(matched_provinces) == 0:
            needs_clarification = True
            clarification_questions.append(
                "Bạn chưa nêu rõ điểm đến (tỉnh/thành phố). Bạn muốn đi đâu?"
            )

        detected_destination = matched_provinces[0] if matched_provinces else "Đà Nẵng"

        # 2. Duration / Total Days Extraction
        total_days = 3
        day_match = re.search(r'(\d+)\s*(?:ngày|ngay|n)\s*(?:(\d+)\s*(?:đêm|dem|d))?', text_lower)
        if day_match:
            try:
                val = int(day_match.group(1))
                total_days = max(1, min(7, val))
            except Exception:
                pass
        elif "cuối tuần" in text_lower or "cuoi tuan" in text_no_accents:
            total_days = 2
        elif "trong ngày" in text_lower or "1 ngày" in text_lower or "di trong ngay" in text_no_accents:
            total_days = 1

        # 3. Companion Flags: Elderly & Children
        has_elderly = bool(re.search(
            r'người\s*lớn\s*tuổi|người\s*già|ông\s*bà|bố\s*mẹ|ba\s*mẹ|cha\s*mẹ|cao\s*tuổi|phụ\s*huynh|mẹ\s*già|bác\s*lớn',
            text_lower
        ) or re.search(
            r'nguoi\s*lon\s*tuoi|nguoi\s*gia|ong\s*ba|bo\s*me|cao\s*tuoi',
            text_no_accents
        ))

        has_children = bool(re.search(
            r'trẻ\s*em|trẻ\s*nhỏ|bé\s*nhỏ|em\s*bé|con\s*nhỏ|trẻ\s*con|học\s*sinh\s*tiểu\s*học|\d+\s*(?:bé|con|trẻ)',
            text_lower
        ) or re.search(
            r'tre\s*em|tre\s*nho|be\s*nho|em\s*be|con\s*nho',
            text_no_accents
        ))

        # 4. People Count & Family Arithmetic (7.4)
        people_count = 2
        explicit_people_match = re.search(r'(\d+)\s*(?:người|nguoi|khách|thành\s*viên|bạn|anh\s*em|chị\s*em)', text_lower)
        children_count_match = re.search(r'(\d+)\s*(?:bé\s*nhỏ|bé|em\s*bé|trẻ\s*em|trẻ\s*nhỏ|con\s*nhỏ|đứa\s*con)', text_lower)
        adults_count_match = re.search(r'(\d+)\s*(?:người\s*lớn|vợ\s*chồng|phụ\s*huynh)', text_lower)

        if explicit_people_match:
            try:
                people_count = max(1, min(20, int(explicit_people_match.group(1))))
            except Exception:
                pass
            # If user says "2 người lớn và 2 bé nhỏ", explicit_people_match matched "2 người" (from "2 người lớn")!
            if adults_count_match and children_count_match:
                try:
                    people_count = min(20, int(adults_count_match.group(1)) + int(children_count_match.group(1)))
                except Exception:
                    pass
        elif children_count_match:
            c_num = int(children_count_match.group(1))
            if "hai vợ chồng" in text_lower or "2 vợ chồng" in text_lower or "vợ chồng" in text_lower or "gia đình" in text_lower or "nhà mình" in text_lower:
                people_count = 2 + c_num
            else:
                # "2 bé nhỏ" without specifying how many adults accompany them -> default 2 adults + c_num and ask clarification
                people_count = 2 + c_num
                needs_clarification = True
                clarification_questions.append(
                    f"Đoàn có {c_num} bé nhỏ đi cùng bao nhiêu người lớn (hiện đang tạm tính 2 người lớn + {c_num} bé = {people_count} người)?"
                )
        elif "một mình" in text_lower or "1 mình" in text_lower or "solo" in text_lower or "độc hành" in text_lower:
            people_count = 1
        elif "cặp đôi" in text_lower or "2 vợ chồng" in text_lower or "hai vợ chồng" in text_lower or "người yêu" in text_lower:
            people_count = 2
        elif "gia đình" in text_lower and has_elderly:
            people_count = 4

        # 5. Budget Tier & Explicit Budget Amount (7.3)
        budget_tier = "standard"
        max_total_budget_vnd: Optional[int] = None

        # Match explicit total budget like "10 triệu", "10tr", "10.000.000", "15 củ"
        budget_num_match = re.search(
            r'(?:ngân\s*sách|tối\s*đa|khoảng|tầm|chi\s*phí|hết\s*khoảng|với)?\s*(\d+(?:[.,]\d+)?)\s*(?:triệu|trieu|tr|củ)\b',
            text_lower
        )
        if budget_num_match:
            try:
                num_str = budget_num_match.group(1).replace(",", ".")
                millions = float(num_str)
                if 0.3 <= millions <= 500:
                    max_total_budget_vnd = int(millions * 1_000_000)
                    # Check if prompt says "mỗi người" / "/người"
                    if re.search(r'(?:mỗi\s*người|/\s*người|1\s*người)', text_lower[budget_num_match.end():budget_num_match.end() + 20]):
                        max_total_budget_vnd = max_total_budget_vnd * people_count
            except Exception:
                pass

        if re.search(r'tiết\s*kiệm|sinh\s*viên|giá\s*rẻ|hạt\s*dẻ|bình\s*dân|ít\s*tiền|rẻ\s*nhất', text_lower) or re.search(
            r'tiet\s*kiem|sinh\s*vien|gia\s*re|hat\s*de|binh\s*dan|it\s*tien', text_no_accents
        ):
            budget_tier = "economy"
        elif re.search(r'sang\s*trọng|sang\s*chảnh|cao\s*cấp|luxury|resort|5\s*sao|nghỉ\s*dưỡng\s*cao\s*cấp|không\s*lo\s*(?:về\s*)?giá|xịn\s*sò', text_lower) or re.search(
            r'sang\s*trong|sang\s*chanh|cao\s*cap|khong\s*lo\s*(?:ve\s*)?gia', text_no_accents
        ):
            budget_tier = "luxury"
        elif max_total_budget_vnd:
            per_person_per_day = max_total_budget_vnd / max(1, people_count * total_days)
            if per_person_per_day < 800_000:
                budget_tier = "economy"
            elif per_person_per_day >= 1_800_000:
                budget_tier = "luxury"
            else:
                budget_tier = "standard"

        # 6. Flight Arrival & Departure Times
        arrival_time = "08:00"
        departure_time = "18:00"

        arr_match = re.search(r'(?:đáp|hạ cánh|đến|bay đến|tới)\s*(?:lúc|khoảng)?\s*(\d{1,2})(?:h|:)(\d{2})?', text_lower)
        if arr_match:
            hour = int(arr_match.group(1))
            minute = int(arr_match.group(2) or 0)
            arrival_time = f"{hour:02d}:{minute:02d}"

        dep_match = re.search(r'(?:bay về|về|rời đi|rời|kết thúc|ra sân bay)\s*(?:lúc|khoảng)?\s*(\d{1,2})(?:h|:)(\d{2})?', text_lower)
        if dep_match:
            hour = int(dep_match.group(1))
            minute = int(dep_match.group(2) or 0)
            departure_time = f"{hour:02d}:{minute:02d}"

        # 7. Negation (`must_avoid`) & Positive Interests Extraction (7.1 & 7.2)
        must_avoid: List[str] = []
        interests: List[str] = []

        # Split prompt into clauses by comma, semicolon, period, "nhưng", "chỉ", "mà"
        clauses = re.split(r'[,;.]|\bnhưng\b|\bmà\b|\bchỉ\b', text_lower)
        positive_clauses: List[str] = []

        for clause in clauses:
            c_strip = clause.strip()
            if not c_strip:
                continue
            # Check if clause contains a negation prefix (excluding "không lo về giá" / "không vội")
            cleaned_for_neg = re.sub(r'không\s*lo\s*(?:về\s*)?giá|không\s*vội', '', c_strip)
            neg_match = re.search(NEGATION_PREFIXES, cleaned_for_neg)
            if neg_match:
                neg_tail = cleaned_for_neg[neg_match.end():]
                for avoid_label, avoid_regex in AVOID_TARGET_PATTERNS:
                    if re.search(avoid_regex, neg_tail):
                        if avoid_label not in must_avoid:
                            must_avoid.append(avoid_label)
                # Anything BEFORE the negation in the same clause might still be positive
                before_neg = cleaned_for_neg[:neg_match.start()].strip()
                if before_neg:
                    positive_clauses.append(before_neg)
            else:
                positive_clauses.append(c_strip)

        positive_text = " ; ".join(positive_clauses)

        for interest_label, avoid_corr, pos_regex in INTEREST_PATTERNS:
            if avoid_corr in must_avoid:
                continue
            if re.search(pos_regex, positive_text):
                # Double check if "nghỉ dưỡng" matched "biển & nghỉ dưỡng" for a non-coastal mountain/inland province when "biển" wasn't mentioned
                if interest_label == "biển & nghỉ dưỡng" and not re.search(r'biển|đảo|bãi\s*tắm|vịnh', positive_text):
                    if detected_destination in ("Lâm Đồng", "Lào Cai", "Hà Giang", "Ninh Bình", "Hà Nội", "Hà Nam", "Hòa Bình", "Sơn La", "Tây Ninh"):
                        if "thiên nhiên sinh thái" not in interests:
                            interests.append("thiên nhiên sinh thái")
                        continue
                if interest_label not in interests:
                    interests.append(interest_label)

        # 7.2: Do NOT inject default ["biển & nghỉ dưỡng", "ẩm thực bản địa"] when user specifies no interests!

        # 8. Pace
        pace = "MODERATE"
        if has_elderly or has_children or re.search(r'chill|nhẹ\s*nhàng|thong\s*thả|thư\s*thái|nghỉ\s*dưỡng|không\s*vội|không\s*leo', text_lower):
            pace = "RELAXED"
        elif re.search(r'dày\s*đặc|khám\s*phá\s*nhiều|đi\s*hết|tối\s*đa|năng\s*động|phượt', text_lower):
            pace = "INTENSIVE"

        # 9. Start Date
        tomorrow = (date.today() + timedelta(days=1)).strftime("%Y-%m-%d")

        return {
            "destination": detected_destination,
            "sub_destination": matched_sub_dest,
            "total_days": total_days,
            "people_count": people_count,
            "budget_tier": budget_tier,
            "max_total_budget_vnd": max_total_budget_vnd,
            "has_elderly": has_elderly,
            "has_children": has_children,
            "pace": pace,
            "interests": interests,
            "must_avoid": must_avoid,
            "arrival_time": arrival_time,
            "departure_time": departure_time,
            "start_date": tomorrow,
            "needs_clarification": needs_clarification,
            "clarification_questions": clarification_questions,
            "extracted_notes": f"Trích xuất thông minh từ: '{prompt[:60]}...'"
        }

    @classmethod
    def _parse_with_llm(cls, prompt: str, baseline: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        """
        Refines deterministic intent extraction using Gemini JSON mode (4-key failover pool).
        Always validates destinations against supported Vietnam provinces and preserves safety flags.
        """
        from data.loader import data_loader
        from services.gemini_client import call_gemini_json

        system_prompt = (
            "Bạn là bộ phân tích yêu cầu du lịch Việt Nam cho hệ thống VISTA.\n"
            "Hãy trích xuất JSON thuần túy (không markdown) từ mô tả tự nhiên của người dùng với các khóa:\n"
            '{"destination": string|null, "sub_destination": string|null, "total_days": int|null, '
            '"people_count": int|null, "budget_tier": "economy"|"standard"|"luxury"|null, '
            '"max_total_budget_vnd": int|null, "has_elderly": bool, "has_children": bool, '
            '"pace": "RELAXED"|"MODERATE"|"INTENSIVE"|null, "interests": [string], '
            '"must_avoid": [string], "arrival_time": "HH:MM"|null, "departure_time": "HH:MM"|null, '
            '"extracted_notes": string}.\n'
            "Quy tắc: Chỉ dùng tên tỉnh/thành phố Việt Nam chuẩn (ví dụ 'Đà Nẵng', 'Thừa Thiên Huế', 'Kiên Giang', 'Lâm Đồng', 'Hà Nội', 'TP. Hồ Chí Minh')."
        )
        parsed = call_gemini_json(
            system_prompt=system_prompt,
            user_prompt=f"Câu yêu cầu du lịch: {prompt.strip()}",
            temperature=0.1,
            max_tokens=500,
            timeout_s=5.5,
        )
        if not parsed:
            return baseline

        merged = dict(baseline)

        raw_dest = parsed.get("destination")
        if raw_dest and isinstance(raw_dest, str):
            canonical = data_loader.get_canonical_province_name(raw_dest.strip())
            if canonical and not baseline.get("needs_clarification"):
                merged["destination"] = canonical

        raw_sub = parsed.get("sub_destination")
        if raw_sub and isinstance(raw_sub, str) and not merged.get("sub_destination"):
            merged["sub_destination"] = raw_sub.strip()

        if isinstance(parsed.get("total_days"), (int, float)) and 1 <= int(parsed["total_days"]) <= 7:
            merged["total_days"] = int(parsed["total_days"])

        if isinstance(parsed.get("people_count"), (int, float)) and 1 <= int(parsed["people_count"]) <= 20:
            # Keep deterministic family arithmetic when already calculated explicitly
            if baseline.get("people_count", 2) == 2:
                merged["people_count"] = int(parsed["people_count"])

        merged["has_elderly"] = bool(baseline.get("has_elderly")) or bool(parsed.get("has_elderly"))
        merged["has_children"] = bool(baseline.get("has_children")) or bool(parsed.get("has_children"))

        bt = str(parsed.get("budget_tier") or "").lower().strip()
        if bt in ("economy", "standard", "luxury") and baseline.get("budget_tier") == "standard":
            merged["budget_tier"] = bt

        if isinstance(parsed.get("max_total_budget_vnd"), (int, float)) and not baseline.get("max_total_budget_vnd"):
            bval = int(parsed["max_total_budget_vnd"])
            if 300_000 <= bval <= 500_000_000:
                merged["max_total_budget_vnd"] = bval

        p_val = str(parsed.get("pace") or "").upper().strip()
        if p_val in ("RELAXED", "MODERATE", "INTENSIVE"):
            if merged["has_elderly"] or merged["has_children"]:
                merged["pace"] = "RELAXED"
            elif baseline.get("pace") == "MODERATE":
                merged["pace"] = p_val

        for kw_list_key in ("interests", "must_avoid"):
            extra = parsed.get(kw_list_key)
            if isinstance(extra, list):
                cur = list(merged.get(kw_list_key) or [])
                for item in extra:
                    s_item = str(item).strip()
                    if s_item and s_item.lower() not in [x.lower() for x in cur]:
                        if kw_list_key == "interests" and s_item.lower() in [m.lower() for m in merged.get("must_avoid", [])]:
                            continue
                        cur.append(s_item)
                merged[kw_list_key] = cur[:8]

        for t_key in ("arrival_time", "departure_time"):
            tv = parsed.get(t_key)
            if isinstance(tv, str) and re.match(r"^\d{2}:\d{2}$", tv.strip()):
                if (t_key == "arrival_time" and baseline.get("arrival_time") == "08:00") or (
                    t_key == "departure_time" and baseline.get("departure_time") == "18:00"
                ):
                    merged[t_key] = tv.strip()

        notes = parsed.get("extracted_notes")
        if isinstance(notes, str) and notes.strip():
            merged["extracted_notes"] = notes.strip()
        merged["llm_enhanced"] = True
        return merged
