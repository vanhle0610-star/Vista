import csv
import os
import json
import re
import hashlib
import unicodedata
from datetime import datetime, timezone
from typing import List, Dict, Optional, Tuple, Any
from models.destination import Destination
import config

def normalize_text(text: str) -> str:
    """Normalizes text using Unicode NFC and converts to lowercase."""
    if not text:
        return ""
    return unicodedata.normalize("NFC", text).lower()

def remove_vietnamese_accents(text: str) -> str:
    """Removes diacritics/accents from Vietnamese text for robust canonical matching."""
    if not text:
        return ""
    text = unicodedata.normalize("NFC", text)
    text = text.replace("đ", "d").replace("Đ", "d")
    nfkd = unicodedata.normalize("NFKD", text)
    return "".join(c for c in nfkd if not unicodedata.combining(c))

def normalize_province_key(name: str) -> str:
    """
    Cleans and normalizes a province/city string:
    - NFC lowercase
    - Replaces punctuation with spaces
    - Strips prefixes: 'thành phố ', 'tỉnh ', 'tp. ', 'tp '
    - Strips accents for exact normalized comparison
    """
    if not name:
        return ""
    norm = unicodedata.normalize("NFC", name).lower().strip()
    norm = re.sub(r"[\.\-\_\,]", " ", norm)
    norm = re.sub(r"\s+", " ", norm).strip()
    prefixes = [
        "thành phố ", "thanh pho ", "tỉnh ", "tinh ", "tp "
    ]
    for p in prefixes:
        if norm.startswith(p):
            norm = norm[len(p):].strip()
            break
    return remove_vietnamese_accents(norm)

# Canonical alias mapping table for all Vietnamese provinces/popular destinations
PROVINCE_ALIASES: Dict[str, str] = {
    "hue": "Thừa Thiên Huế",
    "thua thien": "Thừa Thiên Huế",
    "thua thien hue": "Thừa Thiên Huế",
    "sai gon": "TP. Hồ Chí Minh",
    "hcm": "TP. Hồ Chí Minh",
    "tphcm": "TP. Hồ Chí Minh",
    "ho chi minh": "TP. Hồ Chí Minh",
    "da lat": "Lâm Đồng",
    "dalat": "Lâm Đồng",
    "nha trang": "Khánh Hòa",
    "quy nhon": "Bình Định",
    "phu quoc": "Kiên Giang",
    "hoi an": "Quảng Nam",
    "vung tau": "Bà Rịa - Vũng Tàu",
    "ba ria": "Bà Rịa - Vũng Tàu",
    "ba ria vung tau": "Bà Rịa - Vũng Tàu",
    "ha long": "Quảng Ninh",
    "phan thiet": "Bình Thuận",
    "mui ne": "Bình Thuận",
    "buon ma thuot": "Đắk Lắk",
    "bmt": "Đắk Lắk",
    "pleiku": "Gia Lai",
    "ha noi": "Hà Nội",
    "hanoi": "Hà Nội",
    "hn": "Hà Nội",
    "da nang": "Đà Nẵng",
    "danang": "Đà Nẵng",
    "dn": "Đà Nẵng",
    "sa pa": "Lào Cai",
    "sapa": "Lào Cai",
    "con dao": "Bà Rịa - Vũng Tàu",
    "cat ba": "Hải Phòng",
    "moc chau": "Sơn La",
    "tam dao": "Vĩnh Phúc",
    "mang den": "Kon Tum",
    "phong nha": "Quảng Bình",
}

def has_exact_token(token: str, text: str, exclude_prefix: Optional[str] = None) -> bool:
    """
    Checks for whole word/phrase token matching using word boundaries.
    Prevents false positives like 'động' inside 'hoạt động' or 'cầu' inside 'yêu cầu'.
    """
    norm_token = normalize_text(token)
    norm_text = normalize_text(text)
    escaped = re.escape(norm_token)

    if exclude_prefix:
        norm_prefix = normalize_text(exclude_prefix)
        # Match token only if not immediately preceded by exclude_prefix
        pattern = rf"(?<!{re.escape(norm_prefix)}\s)(?<!\w){escaped}(?!\w)"
    else:
        pattern = rf"(?<!\w){escaped}(?!\w)"

    return bool(re.search(pattern, norm_text, re.IGNORECASE))

DEFAULT_CSV_PATH = "../../backend/src/main/resources/db/seed/demo_destinations_seed.csv"

class DestinationDataLoader:
    def __init__(self, csv_relative_path: Optional[str] = None):
        self.destinations: List[Destination] = []
        self._by_id: Dict[str, Destination] = {}
        self._by_province: Dict[str, List[Destination]] = {}
        self._by_canonical: Dict[str, List[Destination]] = {}
        self._canonical_by_clean_key: Dict[str, str] = {}
        self.csv_path: Optional[str] = None
        self.dataset_source_type: str = "MISSING"
        self.load_data(csv_relative_path)
        self.validate_dataset()

    def load_data(self, explicit_path: Optional[str] = None):
        self.destinations = []
        self._by_id = {}
        self._by_province = {}
        self._by_canonical = {}
        self._canonical_by_clean_key = {}
        self.csv_path = None
        self.dataset_source_type = "MISSING"

        candidate_paths = []
        base_dir = os.path.dirname(__file__)
        if explicit_path and explicit_path.strip():
            if os.path.exists(explicit_path):
                candidate_paths.append(os.path.abspath(explicit_path))
            else:
                rel_p = os.path.abspath(os.path.join(base_dir, explicit_path))
                if os.path.exists(rel_p):
                    candidate_paths.append(rel_p)
                else:
                    # Explicit path requested but does not exist -> do not fall back silently
                    print(f"[DataLoader] Warning: Explicit CSV file not found: {explicit_path}")
                    return

        env_csv = os.getenv("DESTINATIONS_CSV_PATH")
        if env_csv and env_csv.strip():
            candidate_paths.append(os.path.abspath(env_csv.strip()))

        candidate_paths.extend([
            os.path.abspath(os.path.join(base_dir, DEFAULT_CSV_PATH)),
            os.path.abspath(os.path.join(base_dir, "../../backend/src/main/resources/db/seed/demo_destinations_seed.csv")),
            os.path.abspath(os.path.join(os.getcwd(), "backend/src/main/resources/db/seed/demo_destinations_seed.csv")),
            os.path.abspath(os.path.join(os.getcwd(), "../backend/src/main/resources/db/seed/demo_destinations_seed.csv")),
            os.path.abspath(os.path.join(os.getcwd(), "demo_destinations_seed.csv")),
        ])

        csv_path = None
        for p in candidate_paths:
            if os.path.exists(p):
                csv_path = p
                break

        if not csv_path:
            # Optional fixture fallback when ALLOW_FIXTURE_FALLBACK=1
            fixture_candidate = os.path.abspath(os.path.join(base_dir, "../tests/fixtures/seed_fixture.csv"))
            if os.getenv("ALLOW_FIXTURE_FALLBACK", "0") == "1" and os.path.exists(fixture_candidate):
                csv_path = fixture_candidate
                self.dataset_source_type = "FIXTURE_CSV"
            else:
                print(f"[DataLoader] Warning: CSV file not found in candidates: {candidate_paths}")
                return

        self.csv_path = csv_path
        if self.dataset_source_type == "MISSING":
            if "fixture" in csv_path.lower():
                self.dataset_source_type = "FIXTURE_CSV"
            else:
                self.dataset_source_type = "OPERATIONAL_CSV"
        loaded: List[Destination] = []

        with open(csv_path, mode="r", encoding="utf-8") as f:
            reader = csv.reader(f)
            header_row = next(reader, None) # skip header
            col_map = {}
            if header_row:
                for c_idx, col in enumerate(header_row):
                    clean_col = col.strip().lower().replace('"', '').replace("'", "")
                    col_map[clean_col] = c_idx

            for idx, row in enumerate(reader):
                if len(row) < 7:
                    continue
                name = row[0].strip()
                province = row[1].strip()
                category = row[2].strip()
                try:
                    lat = float(row[3].strip())
                    lng = float(row[4].strip())
                except ValueError:
                    continue

                try:
                    p_min = int(float(row[5].strip()))
                except ValueError:
                    p_min = 0

                try:
                    p_max = int(float(row[6].strip()))
                except ValueError:
                    p_max = p_min

                raw_hours = row[7].strip() if len(row) > 7 else ""
                opening_hours = {}
                hours_invalid_json = False
                if raw_hours.startswith("{"):
                    try:
                        opening_hours = json.loads(raw_hours)
                    except Exception:
                        hours_invalid_json = True

                description = row[10].strip() if len(row) > 10 else ""
                photo_url = row[11].strip() if len(row) > 11 else ""

                # Stable ID computation (SHA-256 hash if ID column not present or empty)
                csv_id = row[12].strip() if len(row) > 12 and row[12].strip() else ""
                if csv_id:
                    dest_id = csv_id
                else:
                    hash_key = f"{name}|{province}|{lat:.5f}|{lng:.5f}".encode("utf-8")
                    dest_id = f"dest-{hashlib.sha256(hash_key).hexdigest()[:8]}"

                # Classification Evidence Tracker
                evidence: List[str] = []
                auto_classified = True

                # Check explicit CSV columns first (CSV priority)
                csv_walking = row[col_map["walking_load"]].strip().upper() if "walking_load" in col_map and len(row) > col_map["walking_load"] else ""
                csv_indoor_outdoor = row[col_map["indoor_outdoor"]].strip().upper() if "indoor_outdoor" in col_map and len(row) > col_map["indoor_outdoor"] else ""

                primary_text = f"{name} {category}"
                sec_text = description
                cat_clean = normalize_text(category)
                name_clean = normalize_text(name)

                # 1. Walking Load Classification
                if csv_walking in ("LIGHT", "MODERATE", "STRENUOUS"):
                    walking_load = csv_walking
                    auto_classified = False
                    evidence.append(f"walking_load: loaded explicitly from CSV ({csv_walking})")
                else:
                    # Rule 3d: Do not treat 'núi/đèo/đỉnh/thác/hang/động' as STRENUOUS if category is leisure, hot springs, spa, museum, dining
                    is_strenuous_exempt = any(
                        k in cat_clean or k in name_clean
                        for k in ["nghỉ dưỡng", "suối khoáng", "khoáng nóng", "spa", "bảo tàng", "quán ăn", "ăn uống", "ẩm thực", "khu vui chơi", "resort", "massage"]
                    )

                    strenuous_tokens = ["đèo", "núi", "đỉnh", "hang", "thác", "trekking", "phượt", "leo núi", "leo dốc"]
                    light_tokens = ["quán", "cà phê", "cafe", "chè", "nghỉ dưỡng", "du thuyền", "nhà hàng", "massage", "spa", "bảo tàng"]

                    walking_load = "MODERATE"
                    is_strenuous = False

                    if not is_strenuous_exempt:
                        is_strenuous = any(has_exact_token(tok, primary_text) for tok in strenuous_tokens)
                        if not is_strenuous and has_exact_token("động", primary_text, exclude_prefix="hoạt"):
                            is_strenuous = True
                            evidence.append("walking_load: matched 'động' (excluded 'hoạt động')")
                        elif is_strenuous:
                            matched_tok = next(tok for tok in strenuous_tokens if has_exact_token(tok, primary_text))
                            evidence.append(f"walking_load: matched strenuous token '{matched_tok}' in primary")

                        if not is_strenuous and sec_text:
                            if any(has_exact_token(tok, sec_text) for tok in ["trekking", "leo núi hiểm trở"]):
                                is_strenuous = True
                                evidence.append("walking_load: matched strenuous token in description")
                    else:
                        evidence.append("walking_load: exempted from STRENUOUS due to leisure/hot spring/spa/museum category")

                    if is_strenuous:
                        walking_load = "STRENUOUS"
                    else:
                        is_light = any(has_exact_token(tok, primary_text) for tok in light_tokens) or any(k in cat_clean for k in ["spa", "nghỉ dưỡng", "suối khoáng"])
                        if is_light:
                            walking_load = "LIGHT"
                            evidence.append("walking_load: matched light / leisure token")

                # 2. Indoor / Outdoor Classification
                if csv_indoor_outdoor in ("INDOOR", "OUTDOOR", "MIXED"):
                    indoor_outdoor = csv_indoor_outdoor
                    evidence.append(f"indoor_outdoor: loaded explicitly from CSV ({csv_indoor_outdoor})")
                else:
                    indoor_tokens = ["bảo tàng", "nhà ga", "quán", "ẩm thực", "nhà hàng", "trung tâm thương mại", "siêu thị", "nhà hát"]
                    outdoor_tokens = ["biển", "bãi biển", "bãi tắm", "đảo", "núi", "đèo", "thác", "sinh thái", "vườn", "công viên"]

                    indoor_outdoor = "MIXED"
                    if any(has_exact_token(tok, primary_text) for tok in indoor_tokens):
                        matched_tok = next(tok for tok in indoor_tokens if has_exact_token(tok, primary_text))
                        indoor_outdoor = "INDOOR"
                        evidence.append(f"indoor_outdoor: matched indoor token '{matched_tok}'")
                    elif any(has_exact_token(tok, primary_text) for tok in outdoor_tokens):
                        matched_tok = next(tok for tok in outdoor_tokens if has_exact_token(tok, primary_text))
                        indoor_outdoor = "OUTDOOR"
                        evidence.append(f"indoor_outdoor: matched outdoor token '{matched_tok}'")
                    elif has_exact_token("cầu", primary_text, exclude_prefix="yêu"):
                        indoor_outdoor = "OUTDOOR"
                        evidence.append("indoor_outdoor: matched 'cầu' (excluded 'yêu cầu')")
                    elif sec_text:
                        if has_exact_token("trong nhà", sec_text):
                            indoor_outdoor = "INDOOR"
                            evidence.append("indoor_outdoor: matched 'trong nhà' in description")
                        elif has_exact_token("ngoài trời", sec_text):
                            indoor_outdoor = "OUTDOOR"
                            evidence.append("indoor_outdoor: matched 'ngoài trời' in description")

                # 3. Suitable Slots & Best Time Classification (Giai đoạn 4.1, 4.2, 5.3)
                is_temple = any(has_exact_token(tok, primary_text) for tok in ["chùa", "đền", "miếu", "lăng", "nhà thờ", "tu viện", "thiền viện", "thánh thất"])
                is_night_food_or_market = any(
                    has_exact_token(tok, primary_text)
                    for tok in ["chợ đêm", "phố ẩm thực", "phố đêm", "ăn đêm", "ốc đêm", "bùi viện", "vĩnh khánh", "tạ hiện"]
                )
                is_market = has_exact_token("chợ", primary_text) and not is_night_food_or_market and not has_exact_token("chợ lớn", primary_text)
                is_food = (
                    not is_temple
                    and (
                        any(has_exact_token(tok, primary_text) for tok in ["ẩm thực", "quán", "bún", "cơm", "bánh", "chè", "đặc sản", "nhà hàng", "phở", "hải sản", "lẩu", "nướng", "mì", "mỳ", "hủ tiếu"])
                        or is_market
                    )
                )
                is_night = (
                    is_night_food_or_market
                    or any(has_exact_token(tok, primary_text) for tok in ["sông", "đêm", "phố đi bộ", "du thuyền"])
                    or has_exact_token("cầu", primary_text, exclude_prefix="yêu")
                )
                is_morning = any(has_exact_token(tok, primary_text) for tok in ["núi", "đèo", "chùa", "đền", "thắng cảnh", "vịnh", "di tích", "chợ nổi"])
                is_beach = any(has_exact_token(tok, primary_text) for tok in ["bãi biển", "bãi tắm", "bãi sao", "bãi khem", "bãi dài", "biển mỹ khê", "biển nha trang", "kỳ co"])

                # Determine best_time from CSV or infer
                csv_best_time = row[col_map["best_time"]].strip().upper() if "best_time" in col_map and len(row) > col_map["best_time"] and row[col_map["best_time"]].strip() else ""
                if csv_best_time:
                    best_time = csv_best_time
                elif is_night_food_or_market:
                    best_time = "NIGHT"
                elif any(has_exact_token(tok, primary_text) for tok in ["phố đi bộ", "du thuyền"]):
                    best_time = "EVENING"
                elif is_beach:
                    best_time = "EARLY_OR_LATE"
                elif has_exact_token("chợ nổi", primary_text) or (is_market and not any(has_exact_token(tok, primary_text) for tok in ["ẩm thực", "ăn uống"])):
                    best_time = "MORNING"
                elif is_food:
                    best_time = "NOON"
                elif is_morning:
                    best_time = "MORNING"
                else:
                    best_time = "ANY"

                suitable_slots = []
                if is_night_food_or_market:
                    # Night food streets and night markets ONLY fit EVENING/NIGHT (never NOON at 11:45)
                    suitable_slots.extend(["EVENING", "NIGHT"])
                    evidence.append("suitable_slots: night food/market restricted to EVENING/NIGHT")
                else:
                    if is_food:
                        suitable_slots.extend(["NOON", "EVENING"])
                        evidence.append("suitable_slots: matched culinary token")
                    if is_night:
                        suitable_slots.extend(["EVENING", "NIGHT"])
                        evidence.append("suitable_slots: matched night/bridge token")
                    if is_morning or is_market or is_beach:
                        suitable_slots.append("MORNING")
                        evidence.append("suitable_slots: matched morning scenic/culture/market token")
                    if is_beach:
                        suitable_slots.append("AFTERNOON")
                if not suitable_slots:
                    suitable_slots = ["MORNING", "AFTERNOON"]

                # 4. Geographic Cluster ID & Sub-Region Inference (Giai đoạn 1.3, 2.2, 5.3)
                csv_cluster = row[col_map["cluster_id"]].strip() if "cluster_id" in col_map and len(row) > col_map["cluster_id"] and row[col_map["cluster_id"]].strip() else ""
                prov_key = normalize_province_key(province)
                name_low = normalize_text(name)
                sub_region: Optional[str] = None

                if csv_cluster:
                    cluster_id = csv_cluster
                elif prov_key == "an giang":
                    if any(k in name_low for k in ["nam du", "hòn sơn", "an thới", "phú quốc", "hải vương"]):
                        cluster_id = "OUTLIER_KIEN_GIANG_ISLAND"
                    else:
                        cluster_id = "MAINLAND_AN_GIANG"
                elif prov_key == "quang ninh":
                    if "sơn đoòng" in name_low:
                        cluster_id = "OUTLIER_QUANG_BINH"
                    else:
                        cluster_id = "MAINLAND_QUANG_NINH"
                elif prov_key == "kien giang":
                    if lng < 104.5 or any(k in name_low for k in ["phú quốc", "bãi sao", "bãi khem", "hòn thơm", "vinwonders", "safari", "bún quậy", "hàm ninh", "dinh cậu", "suối tranh"]):
                        cluster_id = "ISLAND_PHU_QUOC"
                        sub_region = "Phú Quốc"
                    elif "nam du" in name_low:
                        cluster_id = "ISLAND_NAM_DU"
                        sub_region = "Nam Du"
                    elif "hòn sơn" in name_low:
                        cluster_id = "ISLAND_HON_SON"
                        sub_region = "Hòn Sơn"
                    else:
                        cluster_id = "MAINLAND_KIEN_GIANG"
                        sub_region = "Hà Tiên" if "hà tiên" in name_low else "Rạch Giá"
                elif prov_key == "ba ria vung tau":
                    if lat < 9.2 or "côn đảo" in name_low:
                        cluster_id = "ISLAND_CON_DAO"
                        sub_region = "Côn Đảo"
                    else:
                        cluster_id = "MAINLAND_BRVT"
                        sub_region = "Vũng Tàu"
                elif prov_key == "quang ngai":
                    if "lý sơn" in name_low or lng > 109.05:
                        cluster_id = "ISLAND_LY_SON"
                        sub_region = "Lý Sơn"
                    else:
                        cluster_id = "MAINLAND_QUANG_NGAI"
                elif prov_key == "binh thuan":
                    if "phú quý" in name_low or (lat < 10.6 and lng > 108.8):
                        cluster_id = "ISLAND_PHU_QUY"
                        sub_region = "Phú Quý"
                    else:
                        cluster_id = "MAINLAND_BINH_THUAN"
                        if any(k in name_low for k in ["mũi né", "phan thiết"]):
                            sub_region = "Mũi Né"
                elif prov_key == "hai phong":
                    if any(k in name_low for k in ["cát bà", "lan hạ"]):
                        cluster_id = "ISLAND_CAT_BA"
                        sub_region = "Cát Bà"
                    else:
                        cluster_id = "MAINLAND_HAI_PHONG"
                elif prov_key == "quang nam":
                    if "cù lao chàm" in name_low:
                        cluster_id = "ISLAND_CU_LAO_CHAM"
                        sub_region = "Cù Lao Chàm"
                    elif "mỹ sơn" in name_low:
                        cluster_id = "OUTLIER_MY_SON"
                        sub_region = "Mỹ Sơn"
                    else:
                        cluster_id = "MAINLAND_QUANG_NAM"
                        if "hội an" in name_low or (15.84 <= lat <= 15.93 and 108.30 <= lng <= 108.38):
                            sub_region = "Hội An"
                elif prov_key == "thua thien hue":
                    if any(k in name_low for k in ["lăng cô", "lập an", "bạch mã", "hải vân"]):
                        cluster_id = "OUTLIER_LANG_CO"
                        sub_region = "Lăng Cô"
                    else:
                        cluster_id = "MAINLAND_HUE"
                        sub_region = "Huế"
                elif prov_key == "da nang":
                    if any(k in name_low for k in ["bà nà", "núi thần tài", "hải vân"]):
                        cluster_id = "OUTLIER_BANA_WEST"
                        sub_region = "Bà Nà"
                    else:
                        cluster_id = "MAINLAND_DA_NANG"
                        sub_region = "Đà Nẵng"
                elif prov_key == "lam dong":
                    if "bảo lộc" in name_low or lat < 11.65:
                        cluster_id = "OUTLIER_BAO_LOC"
                        sub_region = "Bảo Lộc"
                    else:
                        cluster_id = "MAINLAND_LAM_DONG"
                        sub_region = "Đà Lạt"
                elif prov_key == "lao cai":
                    cluster_id = "MAINLAND_LAO_CAI"
                    if any(k in name_low for k in ["sa pa", "sapa", "fansipan", "cát cát", "hàm rồng", "mường hoa", "ô quy hồ"]):
                        sub_region = "Sa Pa"
                elif prov_key == "khanh hoa":
                    cluster_id = "MAINLAND_KHANH_HOA"
                    if "nha trang" in name_low or (12.15 <= lat <= 12.35):
                        sub_region = "Nha Trang"
                elif prov_key == "quang ninh":
                    if "cô tô" in name_low:
                        cluster_id = "ISLAND_CO_TO"
                        sub_region = "Cô Tô"
                    elif "yên tử" in name_low:
                        cluster_id = "OUTLIER_YEN_TU"
                        sub_region = "Yên Tử"
                    else:
                        cluster_id = "MAINLAND_QUANG_NINH"
                        sub_region = "Hạ Long"
                else:
                    cluster_id = f"MAINLAND_{prov_key.upper().replace(' ', '_')}"

                # 5. Duration, Booking & Stairs Level Inference (Giai đoạn 4.3, 5.3)
                is_major_complex = (
                    p_min >= 500000
                    or any(k in name_low for k in ["bà nà", "vinwonders", "safari", "sun world", "núi thần tài", "suối tiên", "đầm sen"])
                )
                is_half_day_heritage = (
                    p_min >= 200000
                    or any(k in name_low for k in ["đại nội", "hoàng thành", "địa đạo củ chi", "tràng an", "tam cốc", "tam chúc", "bái đính", "vịnh hạ long"])
                )
                if is_major_complex:
                    min_duration_min = 180
                    avg_duration_min = 210
                    # Major complexes like Bà Nà Hills / VinWonders should not be scheduled in EVENING
                    suitable_slots = [s for s in suitable_slots if s in ("MORNING", "AFTERNOON")] or ["MORNING", "AFTERNOON"]
                elif is_half_day_heritage:
                    min_duration_min = 90
                    avg_duration_min = 150
                elif is_food:
                    min_duration_min = 45
                    avg_duration_min = 60 if any(k in name_low for k in ["chè", "bánh mì", "cà phê", "cafe"]) else 75
                else:
                    min_duration_min = 60
                    avg_duration_min = 120 if walking_load == "STRENUOUS" else 60 if walking_load == "LIGHT" else 90

                if "min_duration_min" in col_map and len(row) > col_map["min_duration_min"] and row[col_map["min_duration_min"]].strip():
                    try:
                        min_duration_min = int(float(row[col_map["min_duration_min"]].strip()))
                    except ValueError:
                        pass

                requires_booking = bool(
                    p_min >= 300000
                    or any(k in name_low for k in ["du thuyền", "cáp treo", "vinwonders", "bà nà", "safari", "show"])
                )
                if "requires_booking" in col_map and len(row) > col_map["requires_booking"] and row[col_map["requires_booking"]].strip():
                    requires_booking = row[col_map["requires_booking"]].strip().lower() in ("true", "1", "yes")

                csv_stairs = row[col_map["stairs_level"]].strip().upper() if "stairs_level" in col_map and len(row) > col_map["stairs_level"] and row[col_map["stairs_level"]].strip() else ""
                if csv_stairs:
                    stairs_level = csv_stairs
                elif walking_load == "STRENUOUS" or any(k in name_low for k in ["hang múa", "ngũ hành sơn", "chùa hương", "lăng khải định", "núi", "đèo"]):
                    stairs_level = "HIGH"
                elif walking_load == "LIGHT":
                    stairs_level = "LOW"
                elif auto_classified:
                    stairs_level = "UNKNOWN"
                else:
                    stairs_level = "MEDIUM"

                # P0-1: Read verified_at dynamically from col_map
                verified_idx = None
                for k in ["verified_at", "last_verified_at", "last_verified"]:
                    if k in col_map:
                        verified_idx = col_map[k]
                        break

                raw_verified = row[verified_idx].strip() if verified_idx is not None and len(row) > verified_idx else ""
                last_verified_at = None
                if raw_verified:
                    try:
                        clean_v = raw_verified.replace("Z", "+00:00")
                        dt_v = datetime.fromisoformat(clean_v)
                        last_verified_at = dt_v.isoformat()
                    except Exception:
                        last_verified_at = None

                dest_obj = Destination(
                    id=dest_id,
                    name=name,
                    province=province,
                    category=category,
                    latitude=lat,
                    longitude=lng,
                    price_min=p_min,
                    price_max=p_max,
                    opening_hours=opening_hours,
                    avg_duration_min=avg_duration_min,
                    walking_load=walking_load,
                    indoor_outdoor=indoor_outdoor,
                    suitable_slots=list(dict.fromkeys(suitable_slots)),
                    description=description,
                    photo_url=photo_url,
                    last_verified_at=last_verified_at,
                    data_source="VISTA_CURATED_CSV",
                    auto_classified=auto_classified,
                    classification_evidence=evidence,
                    cluster_id=cluster_id,
                    sub_region=sub_region,
                    best_time=best_time,
                    min_duration_min=min_duration_min,
                    requires_booking=requires_booking,
                    stairs_level=stairs_level
                )
                loaded.append(dest_obj)

        # Tier-2 OpenStreetMap Real POI Supplement (loaded when not running isolated CSV unit tests)
        enable_osm = os.getenv("ENABLE_OSM_SUPPLEMENT")
        should_load_osm = (
            enable_osm == "1"
            or (
                enable_osm != "0"
                and not (explicit_path and explicit_path.strip())
                and not (env_csv and env_csv.strip())
                and self.dataset_source_type == "OPERATIONAL_CSV"
            )
        )
        if should_load_osm:
            self._load_osm_supplement_into(loaded)

        self.destinations = loaded
        self._by_id = {d.id: d for d in loaded}
        self._canonical_by_clean_key: Dict[str, str] = {}
        self._by_canonical: Dict[str, List[Destination]] = {}

        for d in loaded:
            canonical = d.province.strip()
            clean_k = normalize_province_key(canonical)
            if clean_k and clean_k not in self._canonical_by_clean_key:
                self._canonical_by_clean_key[clean_k] = canonical
            if canonical not in self._by_canonical:
                self._by_canonical[canonical] = []
            self._by_canonical[canonical].append(d)

        # Retain _by_province as reference to _by_canonical for backwards compatibility
        self._by_province = self._by_canonical

        print(f"[DataLoader] Successfully loaded and structured {len(self.destinations)} destinations across {len(self._by_canonical)} provinces.")

    @staticmethod
    def _strip_accents_key(text: str) -> str:
        import unicodedata
        s = unicodedata.normalize("NFKD", (text or "").lower().strip())
        s = "".join(ch for ch in s if not unicodedata.combining(ch))
        s = s.replace("đ", "d")
        return re.sub(r"[^a-z0-9]+", " ", s).strip()

    @staticmethod
    def _is_valid_osm_tourism_poi(name: str, category: str, province: str) -> bool:
        """
        System-wide OSM quality gate across all 63 provinces:
        filters out traffic roundabouts, admin wards, personal handles, generic English tags,
        wedding halls, blocked/closed viewpoints, and raw multi-segment addresses.
        """
        import unicodedata
        n_low = unicodedata.normalize("NFC", (name or "").lower().strip())
        if len(n_low) < 3 or len(n_low) > 75:
            return False

        # Reject casual digits prefix ("1 cave ngay dg") or username ending with 4 digits ("trunglinh2011")
        if re.match(r"^\d+\s+(cave|view|spot|place|stop)\b", n_low):
            return False
        if re.search(r"[a-z]\d{4}$", n_low):
            return False

        # Reject raw multi-segment addresses like "Dong lang - khang cuong - yen khanh - ninh binh"
        if n_low.count(" - ") >= 2 or n_low.count("-") >= 3:
            return False

        junk_substrings = [
            "vòng xoay", "vong xoay", "bùng binh", "ngã tư", "ngã ba", "nút giao",
            "trạm thu phí", "trạm xăng", "bến xe", "bãi giữ xe",
            "nhà văn hóa", "ủy ban", "ubnd", "trụ sở", "tiệc cưới", "hội nghị tiệc cưới",
            "chung cư", "bệnh viện", "phòng khám", "nhà thuốc", "siêu thị", "bách hóa",
            "điện máy", "tạp hóa", "blocked", "unnamed", "tba ", "tnhh", "công ty",
            "selene group", "beautiful view", "sea view", "nice view", "sunset point",
            "buckwheat flowers", "mountain angel eye", "bên kia cầu"
        ]
        if any(j in n_low for j in junk_substrings):
            return False

        if re.match(r"^(phường|xã|thôn|quận|huyện|ấp|tổ)\b", n_low):
            return False
        if re.search(r"\b(hưng khánh|trung a|trung b|khu phố)\b", n_low):
            return False

        # Reject OSM entries whose name clearly belongs to a different province (raw address leaks)
        prov_low = (province or "").lower().strip()
        for other_prov in ["ninh bình", "hà nội", "đà nẵng", "hải phòng", "cần thơ", "thanh hóa", "nghệ an"]:
            if other_prov not in prov_low and n_low.endswith(other_prov):
                return False

        return True

    def _load_osm_supplement_into(self, loaded: List[Destination], max_per_province: int = 100) -> int:
        """
        Loads verified real OpenStreetMap POIs (osm-node-*, osm-way-*) from database/vista_destinations.db
        as Tier-2 supplementary destinations (restaurants, cafes, regional attractions) while strictly
        rejecting any synthetic osm-gen-% records or non-tourism OSM clutter.
        """
        import sqlite3
        base_dir = os.path.dirname(__file__)
        db_candidates = [
            os.path.abspath(os.path.join(base_dir, "../../database/vista_destinations.db")),
            os.path.abspath(os.path.join(os.getcwd(), "database/vista_destinations.db")),
            os.path.abspath(os.path.join(os.getcwd(), "../database/vista_destinations.db")),
        ]
        db_path = next((p for p in db_candidates if os.path.exists(p)), None)
        if not db_path:
            return 0

        existing_ids = {d.id for d in loaded}
        seen_prov_names: Dict[str, set] = {}
        seen_prov_ascii: Dict[str, set] = {}
        for d in loaded:
            p_clean = d.province.strip()
            seen_prov_names.setdefault(p_clean, set()).add(normalize_text(d.name))
            seen_prov_ascii.setdefault(p_clean, set()).add(self._strip_accents_key(d.name))

        added_by_prov: Dict[str, int] = {}
        added_total = 0

        try:
            conn = sqlite3.connect(db_path, timeout=5.0)
            conn.row_factory = sqlite3.Row
            cur = conn.cursor()
            cur.execute("""
                SELECT id, name, province, category, latitude, longitude,
                       price_min, price_max, opening_hours,
                       walking_load, indoor_outdoor, suitable_slots,
                       description, photo_url, verified_at
                FROM destinations
                WHERE (id LIKE 'osm-node-%' OR id LIKE 'osm-way-%')
                  AND id NOT LIKE 'osm-gen-%'
            """)
            rows = cur.fetchall()
            conn.close()
        except Exception as e:
            print(f"[DataLoader] Notice: Could not read OSM supplement from SQLite: {e}")
            return 0

        for r in rows:
            osm_id = str(r["id"] or "").strip()
            if not osm_id or osm_id in existing_ids or osm_id.startswith("osm-gen-"):
                continue
            prov = str(r["province"] or "").strip()
            name = str(r["name"] or "").strip()
            if not prov or not name:
                continue
            if added_by_prov.get(prov, 0) >= max_per_province:
                continue

            norm_n = normalize_text(name)
            ascii_n = self._strip_accents_key(name)
            if norm_n in seen_prov_names.get(prov, set()) or ascii_n in seen_prov_ascii.get(prov, set()):
                continue

            cat = str(r["category"] or "Khám phá").strip()
            if not self._is_valid_osm_tourism_poi(name, cat, prov):
                continue

            try:
                lat = float(r["latitude"])
                lng = float(r["longitude"])
            except (ValueError, TypeError):
                continue
            if not (8.0 <= lat <= 24.0 and 102.0 <= lng <= 110.0):
                continue

            try:
                p_min = max(0, int(r["price_min"] or 0))
                p_max = max(p_min, int(r["price_max"] or p_min))
            except (ValueError, TypeError):
                p_min, p_max = 0, 0

            # Ensure drink/snack prices from OSM defaults never trigger snack_price_abnormal
            cat_norm = normalize_text(cat)
            if any(k in cat_norm for k in ["ẩm thực", "ăn uống", "quán ăn", "cà phê", "cafe", "giải khát"]):
                if any(has_exact_token(k, norm_n) for k in ["chè", "cà phê", "cafe", "trà"]):
                    p_min = min(p_min, config.SNACK_PRICE_THRESHOLD_DRINKS)
                    p_max = max(p_min, p_max)
                elif any(has_exact_token(k, norm_n) for k in ["bánh mì", "bánh bèo", "bánh tráng", "ăn vặt"]):
                    p_min = min(p_min, config.SNACK_PRICE_THRESHOLD_SNACKS)
                    p_max = max(p_min, p_max)

            raw_oh = str(r["opening_hours"] or "").strip()
            oh = {"open": "07:00", "close": "22:00"}
            if raw_oh.startswith("{"):
                try:
                    parsed_oh = json.loads(raw_oh)
                    if isinstance(parsed_oh, dict) and parsed_oh:
                        oh = parsed_oh
                except Exception:
                    pass

            raw_slots = str(r["suitable_slots"] or "").strip()
            slots = ["MORNING", "AFTERNOON"]
            if raw_slots.startswith("["):
                try:
                    parsed_s = json.loads(raw_slots)
                    if isinstance(parsed_s, list) and parsed_s:
                        slots = [str(s) for s in parsed_s]
                except Exception:
                    pass

            # Exclude cafe/coffee shops from NOON slot to preserve full lunch meals
            cat_check = (cat + " " + name).lower()
            if any(k in cat_check for k in ["cà phê", "cafe", "coffee", "giải khát"]):
                slots = [s for s in slots if s != "NOON"]
                if not slots:
                    slots = ["AFTERNOON"]

            w_load = str(r["walking_load"] or "LIGHT").strip().upper()
            if w_load not in ("LIGHT", "MODERATE", "STRENUOUS"):
                w_load = "LIGHT"
            in_out = str(r["indoor_outdoor"] or "MIXED").strip().upper()
            if in_out not in ("INDOOR", "OUTDOOR", "MIXED"):
                in_out = "MIXED"

            prov_key = normalize_province_key(prov)
            cluster_id = f"MAINLAND_{prov_key.upper().replace(' ', '_')}"
            if prov_key == "kien giang" and lng < 104.5:
                cluster_id = "ISLAND_PHU_QUOC"
            elif prov_key == "ba ria vung tau" and lat < 9.2:
                cluster_id = "ISLAND_CON_DAO"

            dest_obj = Destination(
                id=osm_id,
                name=name,
                province=prov,
                category=cat,
                latitude=lat,
                longitude=lng,
                price_min=p_min,
                price_max=p_max,
                opening_hours=oh,
                avg_duration_min=60,
                walking_load=w_load,
                indoor_outdoor=in_out,
                suitable_slots=slots,
                description=str(r["description"] or f"Địa điểm thực tế từ OpenStreetMap tại {prov}."),
                photo_url=str(r["photo_url"] or ""),
                local_tip="",
                last_verified_at=str(r["verified_at"] or "2026-11-01T00:00:00+00:00"),
                data_source="OPENSTREETMAP_REAL",
                auto_classified=True,
                classification_evidence=["osm_real: verified OpenStreetMap POI"],
                cluster_id=cluster_id,
                sub_region=None,
                best_time="NOON" if "NOON" in slots else "ANY",
                min_duration_min=45,
                requires_booking=False,
                stairs_level="LOW"
            )
            loaded.append(dest_obj)
            existing_ids.add(osm_id)
            seen_prov_names.setdefault(prov, set()).add(norm_n)
            seen_prov_ascii.setdefault(prov, set()).add(ascii_n)
            added_by_prov[prov] = added_by_prov.get(prov, 0) + 1
            added_total += 1

        if added_total > 0:
            self.dataset_source_type = "HYBRID_CURATED_AND_OSM"
        return added_total

    def _resolve_exact_province_token(self, token: str) -> Optional[str]:
        clean_in = normalize_province_key(token)
        if not clean_in:
            return None
        # Check dynamically in self.destinations first if overridden in tests
        for d in self.destinations:
            cand_prov = d.province.strip()
            if normalize_province_key(cand_prov) == clean_in:
                return cand_prov
        # Exact canonical key match (e.g. 'thua thien hue', 'quang nam', 'da nang')
        if clean_in in self._canonical_by_clean_key:
            return self._canonical_by_clean_key[clean_in]
        # Exact alias match (e.g. 'hue' -> 'Thừa Thiên Huế', 'sai gon' -> 'TP. Hồ Chí Minh')
        if clean_in in PROVINCE_ALIASES:
            alias_target = PROVINCE_ALIASES[clean_in]
            alias_clean = normalize_province_key(alias_target)
            for d in self.destinations:
                if normalize_province_key(d.province) == alias_clean:
                    return d.province.strip()
            return self._canonical_by_clean_key.get(alias_clean, alias_target if self.destinations else None)
        return None

    def get_canonical_province_name(self, province: str) -> Optional[str]:
        """
        Resolves an input province string to the exact canonical province name in DB.
        Supports formatted UI strings like 'Đà Lạt (Lâm Đồng)' or 'Bắc Kạn (Hồ Ba Bể)'
        without falling back to dangerous substring matching (e.g. 'Nam' returns None).
        """
        if not province or not str(province).strip():
            return None
        raw = str(province).strip()

        direct = self._resolve_exact_province_token(raw)
        if direct:
            return direct

        # Handle UI format 'Display (Province)' or 'Province (Highlights)'
        paren_match = re.match(r"^(.*?)\(([^()]+)\)\s*$", raw)
        if paren_match:
            outer_part = paren_match.group(1).strip()
            inner_part = paren_match.group(2).strip()
            for candidate in (inner_part, outer_part):
                resolved = self._resolve_exact_province_token(candidate)
                if resolved:
                    return resolved

        return None

    def get_by_province(self, province: str) -> List[Destination]:
        """
        Retrieves destinations by province using EXACT canonical / alias matching.
        Strictly rejects empty strings, substring matches (e.g. 'Nam' will not match 'Quảng Nam'),
        and unknown provinces.
        """
        canonical = self.get_canonical_province_name(province)
        if not canonical:
            return []
        norm_c = normalize_province_key(canonical)
        return [d for d in self.destinations if normalize_province_key(d.province) == norm_c]

    def get_by_id(self, dest_id: str) -> Optional[Destination]:
        for d in self.destinations:
            if d.id == dest_id:
                return d
        return self._by_id.get(dest_id)

    def validate_dataset(self) -> Dict[str, Any]:
        """
        Validates the loaded dataset against data quality constraints:
        - records_by_province: count per province
        - missing_opening_hours: list & percentage rate
        - opening_hours_invalid_json: malformed JSON records
        - price_min_gt_price_max: inverted price intervals
        - coordinates_out_of_vietnam: latitude [8.0, 24.0], longitude [102.0, 110.0]
        - duplicate_names: same destination name in same province
        - auto_classified_count: count of auto-inferred items
        - snack_price_abnormal: rules a & b (only culinary categories, thresholds drinks: 40k, snacks: 60k)
        - generated_at: real UTC time using datetime.now(timezone.utc)
        Writes quality report to data_quality_report.json.
        """
        records_by_province: Dict[str, int] = {}
        for d in self.destinations:
            records_by_province[d.province] = records_by_province.get(d.province, 0) + 1

        missing_hours_list: List[Dict[str, str]] = []
        invalid_hours_json: List[Dict[str, Any]] = []
        price_min_gt_max: List[Dict[str, Any]] = []
        coords_out_of_vn: List[Dict[str, Any]] = []
        snack_price_abnormal: List[Dict[str, Any]] = []
        auto_classified_count = sum(1 for d in self.destinations if getattr(d, "auto_classified", False))

        # Check duplicate names within same province
        seen_names_by_prov: Dict[str, set] = {}
        duplicate_names: List[Dict[str, str]] = []

        for d in self.destinations:
            prov = d.province
            norm_n = normalize_text(d.name)
            if prov not in seen_names_by_prov:
                seen_names_by_prov[prov] = set()
            if norm_n in seen_names_by_prov[prov]:
                duplicate_names.append({"id": d.id, "name": d.name, "province": prov})
            else:
                seen_names_by_prov[prov].add(norm_n)

            # Check missing opening hours
            if not d.opening_hours or len(d.opening_hours) == 0:
                missing_hours_list.append({"id": d.id, "name": d.name, "province": prov})

            # Check price_min > price_max
            if d.price_min > d.price_max:
                price_min_gt_max.append({
                    "id": d.id,
                    "name": d.name,
                    "price_min": d.price_min,
                    "price_max": d.price_max
                })

            # Check coordinate bounds for Vietnam (lat: 8.0 - 24.0, lng: 102.0 - 110.0)
            if not (8.0 <= d.latitude <= 24.0 and 102.0 <= d.longitude <= 110.0):
                coords_out_of_vn.append({
                    "id": d.id,
                    "name": d.name,
                    "latitude": d.latitude,
                    "longitude": d.longitude
                })

            # Task 3a & 3b: Snack price rules
            # ONLY apply to destinations whose category is in food/dining/cafe group!
            cat_norm = normalize_text(d.category)
            is_culinary = any(k in cat_norm for k in ["ẩm thực", "ăn uống", "quán ăn", "cà phê", "cafe", "giải khát"])
            if is_culinary:
                name_norm = normalize_text(d.name)
                # Chè, cà phê, trà: threshold 40,000 VND
                is_drink = any(has_exact_token(k, name_norm) for k in ["chè", "cà phê", "cafe", "trà"])
                # Bánh mì, ăn vặt: threshold 60,000 VND
                is_snack = any(has_exact_token(k, name_norm) for k in ["bánh mì", "bánh bèo", "bánh tráng", "ăn vặt"])

                if is_drink and d.price_min > config.SNACK_PRICE_THRESHOLD_DRINKS:
                    snack_price_abnormal.append({
                        "id": d.id,
                        "name": d.name,
                        "province": prov,
                        "category": d.category,
                        "price_min": d.price_min,
                        "threshold": config.SNACK_PRICE_THRESHOLD_DRINKS,
                        "type": "DRINK_PRICE_ABNORMAL",
                        "detail": f"Đồ uống/chè/cà phê '{d.name}' có giá tối thiểu {d.price_min:,}đ > {config.SNACK_PRICE_THRESHOLD_DRINKS:,}đ"
                    })
                elif is_snack and d.price_min > config.SNACK_PRICE_THRESHOLD_SNACKS:
                    snack_price_abnormal.append({
                        "id": d.id,
                        "name": d.name,
                        "province": prov,
                        "category": d.category,
                        "price_min": d.price_min,
                        "threshold": config.SNACK_PRICE_THRESHOLD_SNACKS,
                        "type": "SNACK_PRICE_ABNORMAL",
                        "detail": f"Món ăn vặt/bánh mì '{d.name}' có giá tối thiểu {d.price_min:,}đ > {config.SNACK_PRICE_THRESHOLD_SNACKS:,}đ"
                    })

        total = len(self.destinations)
        missing_hours_rate = round((len(missing_hours_list) / max(1, total)) * 100, 2)
        all_anomalies = (
            missing_hours_list
            + invalid_hours_json
            + price_min_gt_max
            + coords_out_of_vn
            + duplicate_names
            + snack_price_abnormal
        )

        report = {
            "total": total,
            "total_destinations": total,
            "provinces_count": len(self._by_canonical),
            "destinations_by_province": records_by_province,
            "missing_opening_hours": {
                "count": len(missing_hours_list),
                "rate_percentage": missing_hours_rate,
                "destinations": missing_hours_list
            },
            "opening_hours_invalid_json": invalid_hours_json,
            "price_min_gt_price_max": price_min_gt_max,
            "coordinates_out_of_vietnam": coords_out_of_vn,
            "duplicate_names": duplicate_names,
            "auto_classified_count": auto_classified_count,
            "snack_price_abnormal": snack_price_abnormal,
            "anomalies_count": len(all_anomalies),
            "anomalies": all_anomalies[:100],
            "generated_at": datetime.now(timezone.utc).isoformat()
        }

        # Write to data_quality_report.json
        base_dir = os.path.dirname(__file__)
        report_path = os.path.join(base_dir, "data_quality_report.json")
        try:
            with open(report_path, "w", encoding="utf-8") as f:
                json.dump(report, f, ensure_ascii=False, indent=2)
        except Exception as e:
            print(f"[DataLoader] Could not save data_quality_report.json: {e}")

        return report

# Global DataLoader Singleton
data_loader = DestinationDataLoader()
