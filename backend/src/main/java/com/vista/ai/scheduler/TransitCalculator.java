package com.vista.ai.scheduler;

import java.math.BigDecimal;
import java.util.Locale;

/**
 * Tiện ích tính toán di chuyển thực tế (Transit & Buffer Estimator).
 * Áp dụng hệ số uốn khúc mạng lưới đường bộ Việt Nam (Tortuosity factor 1.35x),
 * tốc độ trung bình theo phương tiện và ước tính chi phí di chuyển minh bạch.
 */
public final class TransitCalculator {

  private static final double EARTH_RADIUS_KM = 6371.0;
  private static final double VIETNAM_ROAD_FACTOR = 1.35; // Đường bộ thực tế dài hơn đường chim bay ~35%

  public record TransitInfo(
      double roadDistanceKm,
      int durationMinutes,
      int bufferMinutes,
      BigDecimal estimatedFareVnd,
      String travelMode,
      String summaryText) {}

  private TransitCalculator() {}

  /**
   * Tính khoảng cách Haversine giữa 2 tọa độ (km).
   */
  public static double haversineDistanceKm(double lat1, double lon1, double lat2, double lon2) {
    double dLat = Math.toRadians(lat2 - lat1);
    double dLon = Math.toRadians(lon2 - lon1);
    double a =
        Math.sin(dLat / 2.0) * Math.sin(dLat / 2.0)
            + Math.cos(Math.toRadians(lat1))
                * Math.cos(Math.toRadians(lat2))
                * Math.sin(dLon / 2.0)
                * Math.sin(dLon / 2.0);
    double c = 2.0 * Math.atan2(Math.sqrt(a), Math.sqrt(1.0 - a));
    return EARTH_RADIUS_KM * c;
  }

  /**
   * Ước tính cung đường di chuyển thực tế và thời gian đệm an toàn.
   *
   * @param lat1 vĩ độ điểm đi
   * @param lon1 kinh độ điểm đi
   * @param lat2 vĩ độ điểm đến
   * @param lon2 kinh độ điểm đến
   * @param mode phương tiện ("DRIVING", "MOTORBIKE", "WALKING")
   * @param pace nhịp độ ("RELAXED", "MODERATE", "PACKED")
   * @param travelWith thành phần đoàn ("Gia đình có trẻ nhỏ", "Người lớn tuổi", "Cặp đôi", "Nhóm bạn")
   * @return TransitInfo chứa quãng đường, thời gian và chi phí
   */
  public static TransitInfo estimateTransit(
      Double lat1,
      Double lon1,
      Double lat2,
      Double lon2,
      String mode,
      String pace,
      String travelWith) {

    if (lat1 == null || lon1 == null || lat2 == null || lon2 == null) {
      int defaultBuffer = determineBufferMinutes(pace, travelWith);
      return new TransitInfo(0.0, 15, defaultBuffer, BigDecimal.ZERO, "DRIVING", "Ước tính di chuyển tiêu chuẩn ~15 phút");
    }

    double airDistKm = haversineDistanceKm(lat1, lon1, lat2, lon2);
    double roadDistKm = Math.round(airDistKm * VIETNAM_ROAD_FACTOR * 10.0) / 10.0;
    if (roadDistKm < 0.5) roadDistKm = 0.5;

    String cleanMode = mode != null ? mode.trim().toUpperCase(Locale.ROOT) : "DRIVING";
    double speedKmh;
    BigDecimal fareVnd;

    if ("WALKING".equals(cleanMode)) {
      speedKmh = 4.5;
      fareVnd = BigDecimal.ZERO;
    } else if ("MOTORBIKE".equals(cleanMode)) {
      speedKmh = 35.0;
      // 8.000đ mở cửa + 7.000đ/km
      long fareLong = Math.round(8000L + roadDistKm * 7000.0);
      fareVnd = BigDecimal.valueOf(fareLong);
    } else {
      // Mặc định DRIVING (Taxi / Ô tô / Grab Car)
      speedKmh = roadDistKm > 15.0 ? 42.0 : 30.0;
      // 12.000đ mở cửa + 14.500đ/km
      long fareLong = Math.round(12000L + roadDistKm * 14500.0);
      fareVnd = BigDecimal.valueOf(fareLong);
    }

    int durationMinutes = Math.max(5, (int) Math.round((roadDistKm / speedKmh) * 60.0));
    int bufferMinutes = determineBufferMinutes(pace, travelWith);

    String summary =
        String.format(
            Locale.US,
            "Di chuyển ~%d phút (%.1f km đường bộ) · Nghỉ đệm %d phút",
            durationMinutes,
            roadDistKm,
            bufferMinutes);

    return new TransitInfo(roadDistKm, durationMinutes, bufferMinutes, fareVnd, cleanMode, summary);
  }

  public static int determineBufferMinutes(String pace, String travelWith) {
    String p = pace != null ? pace.toUpperCase(Locale.ROOT) : "MODERATE";
    String w = travelWith != null ? travelWith.toLowerCase(Locale.ROOT) : "";

    int buffer = 15;
    if (p.contains("RELAX") || p.contains("THẢN THƠI")) {
      buffer = 25;
    } else if (p.contains("PACK") || p.contains("DÀY")) {
      buffer = 10;
    }

    // Nếu đoàn có trẻ em hoặc người lớn tuổi, cộng thêm 10 phút đệm nghỉ ngơi
    if (w.contains("trẻ") || w.contains("bé") || w.contains("lớn tuổi") || w.contains("già") || w.contains("gia đình")) {
      buffer += 10;
    }

    return Math.min(45, Math.max(10, buffer));
  }
}

