package com.vista.ai.util;

import com.vista.destination.application.DestinationQueryService;
import com.vista.destination.application.DestinationSummary;
import java.math.BigDecimal;
import java.text.Normalizer;
import java.util.List;
import java.util.Locale;
import java.util.Map;

/**
 * Chuẩn hóa tên thành phố/địa danh du lịch phổ biến sang tên tỉnh hành chính trong DB
 * và hỗ trợ fallback tìm kiếm địa điểm PUBLISHED cho AI Planner.
 */
public final class ProvinceAliasResolver {

  private static final Map<String, String> ALIASES =
      Map.ofEntries(
          Map.entry("phu quoc", "Kiên Giang"),
          Map.entry("da lat", "Lâm Đồng"),
          Map.entry("hoi an", "Quảng Nam"),
          Map.entry("sapa", "Lào Cai"),
          Map.entry("sa pa", "Lào Cai"),
          Map.entry("nha trang", "Khánh Hòa"),
          Map.entry("ha long", "Quảng Ninh"),
          Map.entry("vung tau", "Bà Rịa - Vũng Tàu"),
          Map.entry("con dao", "Bà Rịa - Vũng Tàu"),
          Map.entry("mui ne", "Bình Thuận"),
          Map.entry("phan thiet", "Bình Thuận"),
          Map.entry("quy nhon", "Bình Định"),
          Map.entry("phong nha", "Quảng Bình"),
          Map.entry("dong hoi", "Quảng Bình"),
          Map.entry("hue", "Thừa Thiên Huế"),
          Map.entry("tam dao", "Vĩnh Phúc"),
          Map.entry("cat ba", "Hải Phòng"),
          Map.entry("moc chau", "Sơn La"),
          Map.entry("mai chau", "Hòa Bình"),
          Map.entry("sai gon", "Hồ Chí Minh"),
          Map.entry("tphcm", "Hồ Chí Minh"));

  private ProvinceAliasResolver() {}

  public static String resolveProvinceName(String rawInput) {
    if (rawInput == null || rawInput.isBlank()) {
      return "";
    }
    String trimmed = rawInput.trim();
    String normalized = stripAccents(trimmed).toLowerCase(Locale.ROOT);
    for (Map.Entry<String, String> entry : ALIASES.entrySet()) {
      if (normalized.contains(entry.getKey())) {
        return entry.getValue();
      }
    }
    return trimmed;
  }

  public static List<DestinationSummary> searchPublishedForPlanner(
      DestinationQueryService service, String rawProvince, BigDecimal budgetVnd) {
    if (service == null || rawProvince == null || rawProvince.isBlank()) {
      return List.of();
    }
    String resolvedProvince = resolveProvinceName(rawProvince);
    List<DestinationSummary> results =
        service.searchPublished(null, resolvedProvince, null, budgetVnd, 30);
    if (!results.isEmpty()) {
      return results;
    }

    if (!resolvedProvince.equalsIgnoreCase(rawProvince.trim())) {
      results = service.searchPublished(null, rawProvince.trim(), null, budgetVnd, 30);
      if (!results.isEmpty()) {
        return results;
      }
    }

    results = service.searchPublished(rawProvince.trim(), null, null, budgetVnd, 30);
    if (!results.isEmpty()) {
      return results;
    }

    return service.searchPublished(null, resolvedProvince, null, null, 30);
  }

  private static String stripAccents(String s) {
    String nfd = Normalizer.normalize(s, Normalizer.Form.NFD);
    return nfd.replaceAll("\\p{M}", "").replace('đ', 'd').replace('Đ', 'D');
  }
}
