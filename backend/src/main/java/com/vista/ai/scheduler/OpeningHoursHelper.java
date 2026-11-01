package com.vista.ai.scheduler;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.time.DayOfWeek;
import java.time.LocalTime;
import java.util.Locale;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

/**
 * Tiện ích phân tích và kiểm định giờ mở cửa (Opening Hours) thực tế của địa điểm du lịch.
 * Đảm bảo:
 * 1. Không mặc định mở cửa 24/7 khi thiếu dữ liệu (đánh dấu UNVERIFIED).
 * 2. Kiểm tra ngày trong tuần (Mon-Sun), phát hiện ngày đóng cửa định kỳ.
 * 3. Kiểm định khung giờ hoạt động thực tế [openTime, closeTime] kèm giờ nhận khách cuối (last entry).
 */
public final class OpeningHoursHelper {

  private static final Logger log = LoggerFactory.getLogger(OpeningHoursHelper.class);
  private static final ObjectMapper MAPPER = new ObjectMapper();
  private static final Pattern TIME_RANGE_PATTERN =
      Pattern.compile("(\\d{1,2}:\\d{2})\\s*-\\s*(\\d{1,2}:\\d{2})");

  public record ScheduleWindow(
      boolean isVerified,
      boolean isOpen,
      LocalTime openTime,
      LocalTime closeTime,
      String rawText) {

    public boolean canAccommodate(LocalTime startTime, LocalTime endTime) {
      if (!isVerified) {
        // Dữ liệu chưa xác minh -> chấp nhận nhưng có cảnh báo
        return true;
      }
      if (!isOpen || openTime == null || closeTime == null) {
        return false;
      }
      return !startTime.isBefore(openTime) && !endTime.isAfter(closeTime);
    }
  }

  private OpeningHoursHelper() {}

  /**
   * Phân tích giờ mở cửa của địa điểm theo ngày trong tuần.
   *
   * @param openingHoursJson chuỗi JSON hoặc chuỗi text giờ mở cửa
   * @param dayOfWeek ngày trong tuần (MONDAY..SUNDAY)
   * @return ScheduleWindow chứa thông tin kiểm định
   */
  public static ScheduleWindow parseWindow(String openingHoursJson, DayOfWeek dayOfWeek) {
    if (openingHoursJson == null || openingHoursJson.isBlank()) {
      return new ScheduleWindow(false, true, null, null, "Chưa xác minh");
    }

    String dayKey = toDayKey(dayOfWeek);
    String rawValue = null;
    boolean isJsonSchedule = false;

    try {
      if (openingHoursJson.trim().startsWith("{")) {
        JsonNode root = MAPPER.readTree(openingHoursJson);
        if (root.isObject()) {
          isJsonSchedule = true;
          if (root.has(dayKey)) {
            rawValue = root.get(dayKey).asText("").trim();
          } else if (root.has(dayKey.toUpperCase(Locale.ROOT))) {
            rawValue = root.get(dayKey.toUpperCase(Locale.ROOT)).asText("").trim();
          } else {
            // Khi JSON quy định lịch tuần nhưng không có ngày này -> Đóng cửa định kỳ
            return new ScheduleWindow(true, false, null, null, "Đóng cửa vào " + dayKey);
          }
        }
      } else {
        // Dạng chuỗi đơn giản như "07:30 - 17:30"
        rawValue = openingHoursJson.trim();
      }
    } catch (Exception e) {
      log.debug("Could not parse openingHours JSON: {}", e.getMessage());
      rawValue = openingHoursJson.trim();
    }

    if (rawValue == null || rawValue.isBlank() || "-".equals(rawValue) || "unknown".equalsIgnoreCase(rawValue)) {
      if (isJsonSchedule) {
        return new ScheduleWindow(true, false, null, null, "Đóng cửa vào " + dayKey);
      }
      return new ScheduleWindow(false, true, null, null, "Chưa xác minh");
    }

    String lower = rawValue.toLowerCase(Locale.ROOT);
    if (lower.contains("đóng") || lower.contains("close") || lower.contains("nghỉ") || lower.contains("off")) {
      return new ScheduleWindow(true, false, null, null, "Đóng cửa vào " + dayKey);
    }

    Matcher m = TIME_RANGE_PATTERN.matcher(rawValue);
    if (m.find()) {
      try {
        LocalTime open = parseTime(m.group(1));
        LocalTime close = parseTime(m.group(2));
        return new ScheduleWindow(true, true, open, close, rawValue);
      } catch (Exception ex) {
        return new ScheduleWindow(false, true, null, null, rawValue);
      }
    }

    // Trường hợp mở 24/7
    if (lower.contains("24/24") || lower.contains("00:00-23:59") || lower.contains("cả ngày")) {
      return new ScheduleWindow(true, true, LocalTime.MIN, LocalTime.MAX, "Mở cả ngày 24/7");
    }

    return new ScheduleWindow(false, true, null, null, rawValue);
  }

  private static LocalTime parseTime(String s) {
    String[] parts = s.split(":");
    int h = Integer.parseInt(parts[0].trim());
    int min = Integer.parseInt(parts[1].trim());
    return LocalTime.of(Math.min(23, Math.max(0, h)), Math.min(59, Math.max(0, min)));
  }

  private static String toDayKey(DayOfWeek dow) {
    if (dow == null) return "mon";
    return switch (dow) {
      case MONDAY -> "mon";
      case TUESDAY -> "tue";
      case WEDNESDAY -> "wed";
      case THURSDAY -> "thu";
      case FRIDAY -> "fri";
      case SATURDAY -> "sat";
      case SUNDAY -> "sun";
    };
  }
}
