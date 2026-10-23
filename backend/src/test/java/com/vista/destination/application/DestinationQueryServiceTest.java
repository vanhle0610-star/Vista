package com.vista.destination.application;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

import com.vista.destination.domain.Destination;
import com.vista.destination.domain.DestinationCategory;
import com.vista.destination.domain.Province;
import com.vista.destination.repository.DestinationHistoryRepository;
import com.vista.destination.repository.DestinationRepository;
import com.vista.destination.repository.FavoriteRepository;
import com.vista.destination.service.DestinationService;
import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;

class DestinationQueryServiceTest {

  private DestinationRepository destinationRepository;
  private FavoriteRepository favoriteRepository;
  private DestinationHistoryRepository historyRepository;
  private DestinationQueryService destinationQueryService;

  @BeforeEach
  void setUp() {
    destinationRepository = mock(DestinationRepository.class);
    favoriteRepository = mock(FavoriteRepository.class);
    historyRepository = mock(DestinationHistoryRepository.class);
    destinationQueryService =
        new DestinationService(destinationRepository, favoriteRepository, historyRepository);
  }

  @Test
  @DisplayName("findPublishedById returns DestinationSummary when destination is published")
  void findPublishedByIdReturnsSummary() {
    UUID id = UUID.randomUUID();
    Destination dest = new Destination();
    dest.setId(id);
    dest.setName("Bà Nà Hills");
    dest.setStatus("PUBLISHED");
    dest.setProvince(new Province("Đà Nẵng", "da-nang", "CENTRAL"));
    dest.setCategory(new DestinationCategory("Giải trí", "amusement"));
    dest.setPriceMin(BigDecimal.valueOf(900000));
    dest.setPriceMax(BigDecimal.valueOf(1250000));
    dest.setLatitude(BigDecimal.valueOf(15.9958));
    dest.setLongitude(BigDecimal.valueOf(107.9965));

    when(destinationRepository.findByIdAndStatus(id, "PUBLISHED")).thenReturn(Optional.of(dest));

    Optional<DestinationSummary> result = destinationQueryService.findPublishedById(id);

    assertThat(result).isPresent();
    assertThat(result.get().id()).isEqualTo(id);
    assertThat(result.get().name()).isEqualTo("Bà Nà Hills");
    assertThat(result.get().provinceName()).isEqualTo("Đà Nẵng");
    assertThat(result.get().categoryName()).isEqualTo("Giải trí");
    assertThat(result.get().priceMin()).isEqualByComparingTo("900000");
  }

  @Test
  @DisplayName("findPublishedByIds returns batch list for TV3 Itinerary")
  void findPublishedByIdsReturnsBatchList() {
    UUID id1 = UUID.randomUUID();
    UUID id2 = UUID.randomUUID();

    Destination dest1 = new Destination();
    dest1.setId(id1);
    dest1.setName("Cầu Rồng");
    dest1.setStatus("PUBLISHED");

    Destination dest2 = new Destination();
    dest2.setId(id2);
    dest2.setName("Ngũ Hành Sơn");
    dest2.setStatus("PUBLISHED");

    when(destinationRepository.findAllByIdInAndStatus(List.of(id1, id2), "PUBLISHED"))
        .thenReturn(List.of(dest1, dest2));

    List<DestinationSummary> results =
        destinationQueryService.findPublishedByIds(List.of(id1, id2));

    assertThat(results).hasSize(2);
    assertThat(results.get(0).name()).isEqualTo("Cầu Rồng");
    assertThat(results.get(1).name()).isEqualTo("Ngũ Hành Sơn");
  }

  @Test
  @DisplayName("isPublished validates destination status accurately")
  void isPublishedValidatesAccurately() {
    UUID validId = UUID.randomUUID();
    UUID invalidId = UUID.randomUUID();

    when(destinationRepository.existsByIdAndStatus(validId, "PUBLISHED")).thenReturn(true);
    when(destinationRepository.existsByIdAndStatus(invalidId, "PUBLISHED")).thenReturn(false);

    assertThat(destinationQueryService.isPublished(validId)).isTrue();
    assertThat(destinationQueryService.isPublished(invalidId)).isFalse();
    assertThat(destinationQueryService.isPublished(null)).isFalse();
  }

  @Test
  @DisplayName("searchPublished queries by criteria for TV4 AI Planner")
  void searchPublishedQueriesByCriteria() {
    Destination dest = new Destination();
    dest.setId(UUID.randomUUID());
    dest.setName("Phố Cổ Hội An");
    dest.setStatus("PUBLISHED");
    dest.setProvince(new Province("Quảng Nam", "quang-nam", "CENTRAL"));
    dest.setCategory(new DestinationCategory("Di tích", "heritage"));

    when(destinationRepository.findAll(any(Specification.class), any(Pageable.class)))
        .thenReturn(new PageImpl<>(List.of(dest)));

    List<DestinationSummary> results =
        destinationQueryService.searchPublished("Hội An", "Quảng Nam", null, 5);

    assertThat(results).hasSize(1);
    assertThat(results.get(0).name()).isEqualTo("Phố Cổ Hội An");
  }

  @Test
  @DisplayName("StubDestinationQueryService provides reliable in-memory testing for TV3 and TV4")
  void stubDestinationQueryServiceWorksAsHandoverContract() {
    StubDestinationQueryService stub = new StubDestinationQueryService();
    UUID defaultId = UUID.fromString("11111111-1111-1111-1111-111111111111");

    // 1. Has default destination
    assertThat(stub.isPublished(defaultId)).isTrue();
    assertThat(stub.findPublishedById(defaultId)).isPresent();
    assertThat(stub.findPublishedById(defaultId).get().name()).isEqualTo("Cầu Rồng Đà Nẵng");

    // 2. Can add new test destination dynamically
    UUID testId = UUID.randomUUID();
    DestinationSummary testItem =
        new DestinationSummary(
            testId,
            "Thánh địa Mỹ Sơn",
            "Quảng Nam",
            "Di sản",
            BigDecimal.valueOf(150000),
            BigDecimal.valueOf(150000),
            15.7644,
            108.1234,
            "https://example.com/my-son.jpg");
    stub.addDestination(testItem);

    assertThat(stub.isPublished(testId)).isTrue();
    assertThat(stub.findPublishedById(testId)).isPresent();
    assertThat(stub.findPublishedById(testId).get().name()).isEqualTo("Thánh địa Mỹ Sơn");

    // 3. Batch query for TV3 itinerary
    List<DestinationSummary> batch = stub.findPublishedByIds(List.of(defaultId, testId, UUID.randomUUID()));
    assertThat(batch).hasSize(2);

    // 4. Search query for TV4 AI context
    List<DestinationSummary> found = stub.searchPublished("Mỹ Sơn", null, null, 10);
    assertThat(found).hasSize(1);
    assertThat(found.get(0).id()).isEqualTo(testId);

    // 5. Remove & clear
    stub.removeDestination(testId);
    assertThat(stub.isPublished(testId)).isFalse();
    assertThat(stub.findPublishedById(testId)).isEmpty();
  }
}

