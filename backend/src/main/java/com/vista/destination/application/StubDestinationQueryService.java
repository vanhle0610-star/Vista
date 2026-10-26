package com.vista.destination.application;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;
import org.springframework.stereotype.Service;

@Service
public class StubDestinationQueryService implements DestinationQueryService {

  private final Map<UUID, DestinationSummary> store = new ConcurrentHashMap<>();

  public StubDestinationQueryService() {
    // Default sample destination for quick out-of-the-box testing
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
            "https://images.unsplash.com/photo-1559592413-7cec4d0cae2b"));
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
    // Fallback: If querying default ID or unknown ID, allow mock response if store is not
    // explicitly cleared
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
      String keyword, String province, String category, int limit) {
    int max = Math.max(1, limit);
    List<DestinationSummary> results = new ArrayList<>();
    for (DestinationSummary item : store.values()) {
      boolean match = true;
      if (keyword != null && !keyword.isBlank()) {
        match = item.name().toLowerCase().contains(keyword.toLowerCase());
      }
      if (match && province != null && !province.isBlank()) {
        match = item.provinceName().toLowerCase().contains(province.toLowerCase());
      }
      if (match && category != null && !category.isBlank()) {
        match = item.categoryName().toLowerCase().contains(category.toLowerCase());
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
  public boolean isPublished(UUID id) {
    return id != null && store.containsKey(id);
  }
}
