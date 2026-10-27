package com.vista.destination.application;

import java.math.BigDecimal;
import java.text.Normalizer;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;
import java.util.regex.Pattern;
import org.springframework.stereotype.Service;

@Service
public class StubDestinationQueryService implements DestinationQueryService {

  private final Map<UUID, DestinationSummary> store = new ConcurrentHashMap<>();

  public StubDestinationQueryService() {
    // Default sample destinations for quick out-of-the-box testing
    UUID defaultId = UUID.fromString("11111111-1111-1111-1111-111111111111");
    addDestination(
        new DestinationSummary(
            defaultId,
            "Cầu Rồng Đà Nẵng",
            "Đà Nẵng",
            "Cảnh quan & Văn hóa",
            BigDecimal.ZERO,
            BigDecimal.ZERO,
            16.0611,
            108.2272,
            "https://images.unsplash.com/photo-1559592413-7cec4d0cae2b",
            "{\"mon\":\"00:00-23:59\",\"tue\":\"00:00-23:59\",\"wed\":\"00:00-23:59\",\"thu\":\"00:00-23:59\",\"fri\":\"00:00-23:59\",\"sat\":\"00:00-23:59\",\"sun\":\"00:00-23:59\"}"));

    UUID banaId = UUID.fromString("22222222-2222-2222-2222-222222222222");
    addDestination(
        new DestinationSummary(
            banaId,
            "Bà Nà Hills",
            "Đà Nẵng",
            "Khu vui chơi & Nghỉ dưỡng",
            new BigDecimal("900000"),
            new BigDecimal("1250000"),
            15.9958,
            107.9965,
            "https://images.unsplash.com/photo-1599708153386-62e27c5bab47",
            "{\"mon\":\"08:00-22:00\",\"tue\":\"08:00-22:00\",\"wed\":\"08:00-22:00\",\"thu\":\"08:00-22:00\",\"fri\":\"08:00-22:00\",\"sat\":\"08:00-22:00\",\"sun\":\"08:00-22:00\"}"));

    UUID chuaCauId = UUID.fromString("33333333-3333-3333-3333-333333333333");
    addDestination(
        new DestinationSummary(
            chuaCauId,
            "Chùa Cầu",
            "Hội An, Quảng Nam",
            "Di tích lịch sử",
            BigDecimal.ZERO,
            BigDecimal.ZERO,
            15.8771,
            108.3260,
            "https://images.unsplash.com/photo-1559592413-7cec4d0cae2c",
            "{\"mon\":\"07:00-21:30\",\"tue\":\"07:00-21:30\",\"wed\":\"07:00-21:30\",\"thu\":\"07:00-21:30\",\"fri\":\"07:00-21:30\",\"sat\":\"07:00-21:30\",\"sun\":\"07:00-21:30\"}"));

    UUID vinhHaLongId = UUID.fromString("44444444-4444-4444-4444-444444444444");
    addDestination(
        new DestinationSummary(
            vinhHaLongId,
            "Vịnh Hạ Long",
            "Quảng Ninh",
            "Kỳ quan thiên nhiên",
            new BigDecimal("290000"),
            new BigDecimal("500000"),
            20.9101,
            107.1839,
            "https://images.unsplash.com/photo-1528127269322-539801943592",
            "{\"mon\":\"07:30-16:30\",\"tue\":\"07:30-16:30\",\"wed\":\"07:30-16:30\",\"thu\":\"07:30-16:30\",\"fri\":\"07:30-16:30\",\"sat\":\"07:30-16:30\",\"sun\":\"07:30-16:30\"}"));

    UUID hoiAnId = UUID.fromString("55555555-5555-5555-5555-555555555555");
    addDestination(
        new DestinationSummary(
            hoiAnId,
            "Phố cổ Hội An",
            "Quảng Nam",
            "Văn hóa & Di sản",
            new BigDecimal("120000"),
            new BigDecimal("150000"),
            15.8801,
            108.3275,
            "https://images.unsplash.com/photo-1555939594-58d7cb561ad1",
            "{\"mon\":\"00:00-23:59\",\"tue\":\"00:00-23:59\",\"wed\":\"00:00-23:59\",\"thu\":\"00:00-23:59\",\"fri\":\"00:00-23:59\",\"sat\":\"00:00-23:59\",\"sun\":\"00:00-23:59\"}"));
  }

  public static String stripAccents(String input) {
    if (input == null || input.isBlank()) {
      return "";
    }
    String normalized = Normalizer.normalize(input, Normalizer.Form.NFD);
    Pattern pattern = Pattern.compile("\\p{InCombiningDiacriticalMarks}+");
    return pattern
        .matcher(normalized)
        .replaceAll("")
        .toLowerCase(Locale.ROOT)
        .replace('đ', 'd')
        .replace('Đ', 'd')
        .trim();
  }

  public void addDestination(DestinationSummary summary) {
    if (summary != null && summary.id() != null) {
      store.put(summary.id(), summary);
    }
  }

  public void removeDestination(UUID id) {
    if (id != null) {
      store.remove(id);
    }
  }

  public void clear() {
    store.clear();
  }

  @Override
  public Optional<DestinationSummary> findPublishedById(UUID id) {
    if (id == null) {
      return Optional.empty();
    }
    DestinationSummary item = store.get(id);
    if (item != null) {
      return Optional.of(item);
    }
    return Optional.empty();
  }

  @Override
  public List<DestinationSummary> findPublishedByIds(List<UUID> ids) {
    if (ids == null || ids.isEmpty()) {
      return Collections.emptyList();
    }
    return ids.stream().map(this::findPublishedById).flatMap(Optional::stream).toList();
  }

  @Override
  public List<DestinationSummary> searchPublished(
      String keyword, String province, String category, BigDecimal priceMax, int limit) {
    int max = Math.max(1, limit);
    List<DestinationSummary> results = new ArrayList<>();
    for (DestinationSummary item : store.values()) {
      boolean match = true;
      if (keyword != null && !keyword.isBlank()) {
        String lowerKeyword = keyword.trim().toLowerCase(Locale.ROOT);
        String strippedKeyword = stripAccents(keyword);
        match =
            item.name().toLowerCase(Locale.ROOT).contains(lowerKeyword)
                || stripAccents(item.name()).contains(strippedKeyword)
                || stripAccents(item.provinceName()).contains(strippedKeyword)
                || stripAccents(item.categoryName()).contains(strippedKeyword);
      }
      if (match && province != null && !province.isBlank()) {
        String lowerProv = province.trim().toLowerCase(Locale.ROOT);
        String strippedProv = stripAccents(province);
        match =
            item.provinceName().toLowerCase(Locale.ROOT).contains(lowerProv)
                || stripAccents(item.provinceName()).contains(strippedProv);
      }
      if (match && category != null && !category.isBlank()) {
        String lowerCat = category.trim().toLowerCase(Locale.ROOT);
        String strippedCat = stripAccents(category);
        match =
            item.categoryName().toLowerCase(Locale.ROOT).contains(lowerCat)
                || stripAccents(item.categoryName()).contains(strippedCat);
      }
      if (match && priceMax != null) {
        match = item.priceMin() == null || item.priceMin().compareTo(priceMax) <= 0;
      }
      if (match) {
        results.add(item);
        if (results.size() >= max) {
          break;
        }
      }
    }
    return results;
  }

  @Override
  public List<DestinationSummary> searchPublished(
      String keyword, String province, String category, int limit) {
    return searchPublished(keyword, province, category, null, limit);
  }

  @Override
  public boolean isPublished(UUID id) {
    return id != null && store.containsKey(id);
  }
}
