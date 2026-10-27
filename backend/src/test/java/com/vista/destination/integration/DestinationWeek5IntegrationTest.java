package com.vista.destination.integration;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

import com.vista.destination.application.DestinationQueryService;
import com.vista.destination.application.DestinationSummary;
import com.vista.destination.application.StubDestinationQueryService;
import com.vista.destination.domain.Destination;
import com.vista.destination.domain.DestinationCategory;
import com.vista.destination.domain.Province;
import com.vista.destination.repository.DestinationHistoryRepository;
import com.vista.destination.repository.DestinationRepository;
import com.vista.destination.repository.FavoriteRepository;
import com.vista.destination.service.DestinationService;
import java.math.BigDecimal;
import java.util.List;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;

@DisplayName("TV1 Week 5 Integration Tests: Destination Discovery & Contract Query Service")
class DestinationWeek5IntegrationTest {

  private DestinationRepository destinationRepository;
  private FavoriteRepository favoriteRepository;
  private DestinationHistoryRepository historyRepository;
  private DestinationService destinationService;
  private DestinationQueryService destinationQueryService;

  @BeforeEach
  void setUp() {
    destinationRepository = mock(DestinationRepository.class);
    favoriteRepository = mock(FavoriteRepository.class);
    historyRepository = mock(DestinationHistoryRepository.class);

    destinationService =
        new DestinationService(destinationRepository, favoriteRepository, historyRepository);
    destinationQueryService = destinationService;
  }

  private Destination createMockDestination(
      String name, String province, String category, BigDecimal price, String openingHours) {
    Destination dest = new Destination();
    dest.setId(UUID.randomUUID());
    dest.setName(name);
    dest.setStatus("PUBLISHED");
    dest.setProvince(new Province(province, "slug-" + province, "VN-REGION"));
    dest.setCategory(new DestinationCategory(category, "slug-" + category));
    dest.setPriceMin(price);
    dest.setPriceMax(price);
    dest.setLatitude(BigDecimal.valueOf(16.05));
    dest.setLongitude(BigDecimal.valueOf(108.20));
    dest.setOpeningHours(openingHours);
    return dest;
  }

  @Test
  @DisplayName("W5-DISC-01: searchPublished preserves 7-day structured openingHours for AI Planner")
  void testSearchPublishedPreservesOpeningHoursForAiPlanner() {
    String structuredHours =
        "{\"mon\":\"07:30-17:00\",\"tue\":\"07:30-17:00\",\"wed\":\"07:30-17:00\",\"thu\":\"07:30-17:00\",\"fri\":\"07:30-17:00\",\"sat\":\"07:30-17:00\",\"sun\":\"07:30-17:00\"}";

    Destination dest =
        createMockDestination(
            "Ngũ Hành Sơn",
            "Đà Nẵng",
            "Cảnh quan & Thiên nhiên",
            BigDecimal.valueOf(40000),
            structuredHours);

    when(destinationRepository.findAll(any(Specification.class), any(Pageable.class)))
        .thenReturn(new PageImpl<>(List.of(dest)));

    List<DestinationSummary> summaries =
        destinationQueryService.searchPublished(
            "Ngũ Hành Sơn", "Đà Nẵng", null, BigDecimal.valueOf(50000), 10);

    assertThat(summaries).hasSize(1);
    DestinationSummary summary = summaries.get(0);
    assertThat(summary.name()).isEqualTo("Ngũ Hành Sơn");
    assertThat(summary.provinceName()).isEqualTo("Đà Nẵng");
    assertThat(summary.priceMin()).isEqualByComparingTo(BigDecimal.valueOf(40000));
    assertThat(summary.openingHours()).isNotNull();
    assertThat(summary.openingHours()).contains("\"mon\":\"07:30-17:00\"");
    assertThat(summary.openingHours()).contains("\"sun\":\"07:30-17:00\"");
  }

  @Test
  @DisplayName(
      "W5-DISC-02: searchPublished backward compatible 4-argument method delegates to priceMax=null")
  void testSearchPublishedBackwardCompatibility() {
    Destination dest =
        createMockDestination(
            "Bà Nà Hills",
            "Đà Nẵng",
            "Khu vui chơi & Nghỉ dưỡng",
            BigDecimal.valueOf(850000),
            "{\"all\":\"08:00-22:00\"}");

    when(destinationRepository.findAll(any(Specification.class), any(Pageable.class)))
        .thenReturn(new PageImpl<>(List.of(dest)));

    List<DestinationSummary> summaries =
        destinationQueryService.searchPublished("Bà Nà", "Đà Nẵng", "Khu vui chơi", 5);

    assertThat(summaries).hasSize(1);
    assertThat(summaries.get(0).name()).isEqualTo("Bà Nà Hills");
    assertThat(summaries.get(0).priceMax()).isEqualByComparingTo(BigDecimal.valueOf(850000));
  }

  @Test
  @DisplayName(
      "W5-DISC-03: Free destinations (0 VND) are correctly identified for TV4 budget calculation")
  void testZeroPriceHandlingForBudgetEstimation() {
    Destination freeDest =
        createMockDestination(
            "Cầu Rồng Đà Nẵng",
            "Đà Nẵng",
            "Check-in & Cảnh quan",
            BigDecimal.ZERO,
            "{\"all\":\"00:00-23:59\"}");

    when(destinationRepository.findAll(any(Specification.class), any(Pageable.class)))
        .thenReturn(new PageImpl<>(List.of(freeDest)));

    List<DestinationSummary> results =
        destinationQueryService.searchPublished("Cầu Rồng", "Đà Nẵng", null, BigDecimal.ZERO, 10);

    assertThat(results).hasSize(1);
    assertThat(results.get(0).priceMin()).isEqualByComparingTo(BigDecimal.ZERO);
    assertThat(results.get(0).priceMax()).isEqualByComparingTo(BigDecimal.ZERO);
  }

  @Test
  @DisplayName(
      "W5-DISC-04: StubDestinationQueryService supports budget filtering and 7-day opening hours")
  void testStubDestinationQueryServiceWeek5Support() {
    StubDestinationQueryService stub = new StubDestinationQueryService();

    // 1. Search with priceMax = 50,000 VND
    List<DestinationSummary> affordable =
        stub.searchPublished(null, null, null, BigDecimal.valueOf(50000), 10);
    assertThat(affordable).isNotEmpty();
    assertThat(affordable)
        .allMatch(
            d -> d.priceMin() == null || d.priceMin().compareTo(BigDecimal.valueOf(50000)) <= 0);

    // 2. Verify all stub destinations have 7-day structured openingHours
    List<DestinationSummary> all = stub.searchPublished(null, null, null, 10);
    assertThat(all).isNotEmpty();
    for (DestinationSummary s : all) {
      assertThat(s.openingHours()).isNotNull();
      assertThat(s.openingHours()).contains("\"mon\"");
      assertThat(s.openingHours()).contains("\"sun\"");
    }
  }
}
