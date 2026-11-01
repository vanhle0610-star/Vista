package com.vista.ai.scheduler;

import com.vista.ai.api.dto.AiItinerarySuggestionRequest;
import com.vista.destination.application.DestinationSummary;
import java.text.Normalizer;
import java.time.LocalTime;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * Bộ phân tích ngữ nghĩa đa chiều (Semantic NLP & Physical Intensity Evaluator).
 * Giải quyết triệt để việc hiểu yêu cầu tự nhiên của du khách mà không phụ thuộc vào cú pháp cứng nhắc,
 * đồng thời lượng hóa mức độ tốn sức (Physical Intensity) của từng địa điểm cho người già & trẻ nhỏ.
 */
public final class SemanticIntentExtractor {

  public static final DateTimeFormatter TIME_FMT = DateTimeFormatter.ofPattern("HH:mm");

  public enum PhysicalIntensity {
    LOW,    // Nhẹ nhàng: Cafe, dạo biển, du thuyền, bảo tàng, ẩm thực, ngắm cầu/sông
    MEDIUM, // Vừa phải: Chùa, di tích bằng phẳng, phố cổ, làng nghề
    HIGH    // Tốn sức / Leo trèo: Núi, đèo, hang động, thác nước, nhiều bậc thang cao
  }

  public record TravelIntent(
      LocalTime arrivalTime,
      LocalTime departureTime,
      boolean hasElderly,
      boolean hasChildren,
      String effectivePace,
      String effectiveTravelMode,
      String dietaryPreference,
      boolean avoidStrenuousActivity,
      List<String> preferredKeywords,
      List<String> avoidKeywords) {

    public String arrivalTimeFormatted() {
      return arrivalTime != null ? arrivalTime.format(TIME_FMT) : null;
    }

    public String departureTimeFormatted() {
      return departureTime != null ? departureTime.format(TIME_FMT) : null;
    }
  }

  private static final Pattern FLEXIBLE_ARRIVAL_PATTERN = Pattern.compile(
      "(?:den|ha\\s*canh|toi|check-?in|co\\s*mat|dap|bay\\s*den|khoi\\s*hanh\\s*den)[^0-9\\n]{0,45}(\\d{1,2})\\s*(?:gio|h|:|g)\\s*(\\d{1,2})?\\s*(sang|trua|chieu|toi|dem)?");

  private static final Pattern FLEXIBLE_DEPARTURE_PATTERN = Pattern.compile(
      "(?:ve|roi|bay\\s*ve|khoi\\s*hanh\\s*ve|tra\\s*phong|check-?out|roi\\s*khoi|ket\\s*thuc|ra\\s*san\\s*bay)[^0-9\\n]{0,45}(\\d{1,2})\\s*(?:gio|h|:|g)\\s*(\\d{1,2})?\\s*(sang|trua|chieu|toi|dem)?");

  private SemanticIntentExtractor() {}

  /**
   * Chuẩn hóa chuỗi tiếng Việt về dạng không dấu chữ thường để phân tích ngữ nghĩa bất biến.
   */
  public static String normalizeAscii(String input) {
    if (input == null || input.isBlank()) return "";
    return Normalizer.normalize(input, Normalizer.Form.NFD)
        .replaceAll("\\p{InCombiningDiacriticalMarks}+", "")
        .replace('đ', 'd')
        .replace('Đ', 'd')
        .toLowerCase(Locale.ROOT)
        .trim();
  }

  /**
   * Phân tích toàn diện hồ sơ yêu cầu chuyến đi từ cả trường có cấu trúc và văn bản tự nhiên.
   */
  public static TravelIntent extractIntent(AiItinerarySuggestionRequest request) {
    if (request == null) {
      return new TravelIntent(null, null, false, false, "MODERATE", "DRIVING", "GENERAL", false, List.of(), List.of());
    }

    String combinedRaw = String.join(" ",
        request.specialRequests() != null ? request.specialRequests() : "",
        request.travelWith() != null ? request.travelWith() : "",
        request.interests() != null ? String.join(" ", request.interests()) : "");

    String norm = normalizeAscii(combinedRaw);

    // 1. Trích xuất giờ đến (Arrival Time)
    LocalTime arrival = parseDirectTime(request.arrivalTime());
    if (arrival == null) {
      arrival = extractFlexibleTime(norm, FLEXIBLE_ARRIVAL_PATTERN, true);
    }

    // 2. Trích xuất giờ về (Departure Time)
    LocalTime departure = parseDirectTime(request.departureTime());
    if (departure == null) {
      departure = extractFlexibleTime(norm, FLEXIBLE_DEPARTURE_PATTERN, false);
    }

    // 3. Nhận diện thành phần đoàn (Người lớn tuổi & Trẻ nhỏ)
    boolean hasElderly = containsAny(norm,
        "nguoi lon tuoi", "nguoi gia", "ong ba", "bo me", "cha me", "cao tuoi", "phu huynh", "suc khoe yeu");

    boolean hasChildren = containsAny(norm,
        "tre em", "tre nho", "em be", "con nho", "nhoc", "gia dinh co be");

    // 4. Nhận diện mức độ vận động & nhịp đi (Pacing)
    String pace = request.pace() != null && !request.pace().isBlank() ? request.pace().toUpperCase(Locale.ROOT) : "MODERATE";
    if (containsAny(norm, "thong tha", "thu tha", "nhe nhang", "nghi duong", "cham rai", "khong voi", "ung dung", "chill")) {
      pace = "RELAXED";
    } else if (containsAny(norm, "nhieu noi", "day dac", "toi da", "check-in het", "lien tuc")) {
      pace = "PACKED";
    } else if (hasElderly || hasChildren) {
      pace = "RELAXED";
    }

    // 5. Nhận diện phương tiện (Vehicle Mode)
    String travelMode = request.travelMode() != null && !request.travelMode().isBlank()
        ? request.travelMode().toUpperCase(Locale.ROOT)
        : "DRIVING";
    if (containsAny(norm, "xe may", "phuot", "xe ga", "motorbike")) {
      travelMode = "MOTORBIKE";
    } else if (containsAny(norm, "di bo", "tan bo", "walking")) {
      travelMode = "WALKING";
    } else if (hasElderly || hasChildren) {
      travelMode = "DRIVING"; // Đoàn có người già/trẻ nhỏ ưu tiên taxi/ô tô êm ái
    }

    // 6. Nhận diện gu ẩm thực (Dietary Preference)
    String dietary = "GENERAL";
    if (containsAny(norm, "an chay", "do chay", "chay", "vegetarian")) {
      dietary = "VEGETARIAN";
    } else if (containsAny(norm, "hai san", "seafood", "ca tuoi", "tom cua")) {
      dietary = "SEAFOOD";
    } else if (containsAny(norm, "dac san", "bun", "mi quang", "banh trang", "com nieu", "am thuc")) {
      dietary = "LOCAL_SPECIALTY";
    }

    // 7. Nhận diện yêu cầu tránh vận động nặng
    boolean avoidStrenuous = hasElderly || containsAny(norm,
        "khong leo", "ngai leo", "khong di bo nhieu", "dau chan", "dau khop", "met", "tranh leo nui");

    // 8. Từ khóa ưu tiên và loại trừ
    List<String> preferred = new ArrayList<>();
    if (containsAny(norm, "cafe", "ca phe", "ngam canh")) preferred.add("cafe");
    if (containsAny(norm, "bien", "dao mat")) preferred.add("biển");
    if (containsAny(norm, "chua", "tam linh")) preferred.add("chùa");
    if (containsAny(norm, "lich su", "di tich", "lang")) preferred.add("di tích");
    if (containsAny(norm, "bao tang")) preferred.add("bảo tàng");

    List<String> avoid = new ArrayList<>();
    if (request.avoidPlaces() != null) {
      avoid.addAll(request.avoidPlaces());
    }
    if (avoidStrenuous) {
      avoid.add("leo núi");
      avoid.add("mạo hiểm");
    }

    return new TravelIntent(
        arrival,
        departure,
        hasElderly,
        hasChildren,
        pace,
        travelMode,
        dietary,
        avoidStrenuous,
        preferred,
        avoid);
  }

  /**
   * Đánh giá mức độ vận động (Physical Intensity) của một địa điểm.
   */
  public static PhysicalIntensity evaluatePhysicalIntensity(DestinationSummary dest) {
    if (dest == null) return PhysicalIntensity.MEDIUM;
    String text = normalizeAscii((dest.name() != null ? dest.name() : "") + " " + (dest.categoryName() != null ? dest.categoryName() : ""));

    // Nhóm tốn sức / leo bậc thang cao / leo núi / hang động dốc
    if (containsAny(text,
        "dinh ", "nui ", "deo ", "hang ", "dong ", "thac ", "trekking", "leo ",
        "ngu hanh son", "ba na", "fansipan", "yen tu", "chua huong", "lang biang",
        "mui nghinh phong", "hai van quan", "ban co")) {
      return PhysicalIntensity.HIGH;
    }

    // Nhóm thư giãn nhẹ nhàng, bằng phẳng, có chỗ ngồi nghỉ
    if (containsAny(text,
        "bien", "cafe", "ca phe", "quan", "nha hang", "am thuc", "cho ", "cau ",
        "song ", "ho ", "cong vien", "bao tang", "du thuyen", "suoi khoang",
        "nha tho", "pho co", "bistro", "lounge")) {
      return PhysicalIntensity.LOW;
    }

    return PhysicalIntensity.MEDIUM;
  }

  /**
   * Kiểm tra địa điểm có thân thiện với người lớn tuổi không.
   */
  public static boolean isElderlyFriendly(DestinationSummary dest) {
    return evaluatePhysicalIntensity(dest) != PhysicalIntensity.HIGH;
  }

  private static LocalTime parseDirectTime(String raw) {
    if (raw == null || raw.isBlank()) return null;
    try {
      String clean = raw.trim();
      if (clean.length() == 4 && clean.charAt(1) == ':') clean = "0" + clean;
      return LocalTime.parse(clean, TIME_FMT);
    } catch (Exception ignored) {
      return null;
    }
  }

  public static LocalTime extractFlexibleTime(String normText, Pattern pattern, boolean isArrival) {
    if (normText == null || normText.isBlank()) return null;
    Matcher m = pattern.matcher(normText);
    if (m.find()) {
      try {
        int hour = Integer.parseInt(m.group(1));
        int minute = (m.group(2) != null && !m.group(2).isBlank()) ? Integer.parseInt(m.group(2)) : 0;
        String period = m.group(3);

        if (period != null) {
          if ((period.equals("chieu") || period.equals("toi")) && hour < 12) {
            hour += 12;
          } else if (period.equals("dem") && hour < 12 && hour >= 6) {
            hour += 12;
          } else if (period.equals("trua") && hour >= 1 && hour <= 3) {
            hour += 12;
          }
        }

        if (hour >= 0 && hour <= 23 && minute >= 0 && minute <= 59) {
          return LocalTime.of(hour, minute);
        }
      } catch (Exception ignored) {}
    }

    // Fallback nhận diện theo buổi nếu người dùng chỉ nói "hạ cánh buổi chiều" hoặc "bay về buổi sáng"
    if (isArrival) {
      if (normText.matches(".*(?:den|ha canh|toi|bay den)[^.\\n]{0,25}\\bbuoi chieu\\b.*")) {
        return LocalTime.of(14, 0);
      }
      if (normText.matches(".*(?:den|ha canh|toi|bay den)[^.\\n]{0,25}\\bbuoi toi\\b.*")) {
        return LocalTime.of(19, 30);
      }
    } else {
      if (normText.matches(".*(?:bay ve|khoi hanh ve|roi di)[^.\\n]{0,25}\\bbuoi sang\\b.*")) {
        return LocalTime.of(11, 0);
      }
      if (normText.matches(".*(?:bay ve|khoi hanh ve|roi di)[^.\\n]{0,25}\\bbuoi trua\\b.*")) {
        return LocalTime.of(12, 30);
      }
    }
    return null;
  }

  private static boolean containsAny(String text, String... keywords) {
    if (text == null || text.isEmpty()) return false;
    for (String kw : keywords) {
      if (text.contains(kw)) return true;
    }
    return false;
  }
}
