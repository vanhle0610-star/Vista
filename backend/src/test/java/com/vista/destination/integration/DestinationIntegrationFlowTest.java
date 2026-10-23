package com.vista.destination.integration;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

import com.vista.destination.api.dto.DestinationDetailDto;
import com.vista.destination.api.dto.DestinationPageDto;
import com.vista.destination.api.dto.DestinationSummaryDto;
import com.vista.destination.application.DestinationQueryService;
import com.vista.destination.application.DestinationSummary;
import com.vista.destination.application.StubDestinationQueryService;
import com.vista.destination.domain.Destination;
import com.vista.destination.domain.DestinationCategory;
import com.vista.destination.domain.DestinationHistory;
import com.vista.destination.domain.Favorite;
import com.vista.destination.domain.Province;
import com.vista.destination.repository.DestinationHistoryRepository;
import com.vista.destination.repository.DestinationRepository;
import com.vista.destination.repository.FavoriteRepository;
import com.vista.destination.service.DestinationNotFoundException;
import com.vista.destination.service.DestinationService;
import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;

class DestinationIntegrationFlowTest {

  private DestinationRepository destinationRepository;
  private FavoriteRepository favoriteRepository;
  private DestinationHistoryRepository historyRepository;
  private DestinationService destinationService;
  private DestinationQueryService destinationQueryService;

  private final List<Favorite> mockFavoritesDb = new ArrayList<>();
  private final List<DestinationHistory> mockHistoryDb = new ArrayList<>();

  @BeforeEach
  void setUp() {
    destinationRepository = mock(DestinationRepository.class);
    favoriteRepository = mock(FavoriteRepository.class);
    historyRepository = mock(DestinationHistoryRepository.class);

    destinationService =
        new DestinationService(destinationRepository, favoriteRepository, historyRepository);
    destinationQueryService = destinationService;

    mockFavoritesDb.clear();
    mockHistoryDb.clear();
  }

  private Destination createPublishedDestination(
      UUID id, String name, String provinceName, String categoryName, BigDecimal price) {
    Destination dest = new Destination();
    dest.setId(id);
    dest.setName(name);
    dest.setStatus("PUBLISHED");
    dest.setProvince(new Province(provinceName, "slug-" + provinceName, "REGION"));
    dest.setCategory(new DestinationCategory(categoryName, "slug-" + categoryName));
    dest.setPriceMin(price);
    dest.setPriceMax(price);
    dest.setLatitude(BigDecimal.valueOf(16.06));
    dest.setLongitude(BigDecimal.valueOf(108.22));
    dest.setOpeningHours("{\"mon\":\"07:30-17:00\",\"sun\":\"07:30-17:00\"}");
    dest.setDescription("Điểm đến du lịch hấp dẫn " + name);
    return dest;
  }

  @Test
  @DisplayName("W4-FLOW-01: End-to-end Visitor Discovery Flow (Search -> Detail -> Favorite -> History)")
  void testVisitorEndToEndDiscoveryFlow() {
    UUID userId = UUID.randomUUID();
    UUID destId = UUID.randomUUID();
    Destination cafeDest =
        createPublishedDestination(
            destId, "Cà phê Đồi Trè", "Đà Nẵng", "Ẩm thực & Thư giãn", BigDecimal.valueOf(45000));

    // 1. Search by keyword "cà phê" and province "Đà Nẵng"
    when(destinationRepository.findAll(any(Specification.class), any(Pageable.class)))
        .thenReturn(new PageImpl<>(List.of(cafeDest)));

    DestinationPageDto searchResults =
        destinationService.searchPublished("cà phê", "Đà Nẵng", null, null, 0, 10);
    assertThat(searchResults.items()).hasSize(1);
    assertThat(searchResults.items().get(0).name()).isEqualTo("Cà phê Đồi Trè");

    // 2. Open detail
    when(destinationRepository.findByIdAndStatus(destId, "PUBLISHED"))
        .thenReturn(Optional.of(cafeDest));
    when(favoriteRepository.existsByIdUserIdAndIdDestinationId(userId, destId)).thenReturn(false);

    DestinationDetailDto detail = destinationService.getPublishedDetail(destId, userId);
    assertThat(detail.id()).isEqualTo(destId);
    assertThat(detail.isFavorite()).isFalse();
    assertThat(detail.openingHours()).containsKey("mon");

    // 3. Record history
    when(historyRepository.findByUserIdAndDestinationId(userId, destId)).thenReturn(Optional.empty());
    destinationService.recordView(destId, userId);

    // 4. Toggle favorite
    destinationService.addFavorite(destId, userId);
    when(favoriteRepository.existsByIdUserIdAndIdDestinationId(userId, destId)).thenReturn(true);
    when(favoriteRepository.findByIdUserIdOrderByCreatedAtDesc(userId))
        .thenReturn(List.of(new Favorite(userId, cafeDest)));

    List<DestinationSummaryDto> favorites = destinationService.getFavorites(userId);
    assertThat(favorites).hasSize(1);
    assertThat(favorites.get(0).id()).isEqualTo(destId);

    // 5. Verify detail now reflects favorite = true
    DestinationDetailDto detailAfterFav = destinationService.getPublishedDetail(destId, userId);
    assertThat(detailAfterFav.isFavorite()).isTrue();

    // 6. Remove favorite
    when(destinationRepository.existsByIdAndStatus(destId, "PUBLISHED")).thenReturn(true);
    destinationService.removeFavorite(destId, userId);
  }

  @Test
  @DisplayName("W4-TV3-INTEGRATION: TV3 Itinerary Service consumes DestinationQueryService contract")
  void testTv3ItineraryIntegration() {
    UUID destId1 = UUID.randomUUID();
    UUID destId2 = UUID.randomUUID();
    Destination d1 = createPublishedDestination(destId1, "Cầu Vàng Bà Nà", "Đà Nẵng", "Giải trí", BigDecimal.valueOf(900000));
    Destination d2 = createPublishedDestination(destId2, "Bán đảo Sơn Trà", "Đà Nẵng", "Thiên nhiên", BigDecimal.ZERO);

    when(destinationRepository.findByIdAndStatus(destId1, "PUBLISHED")).thenReturn(Optional.of(d1));
    when(destinationRepository.existsByIdAndStatus(destId1, "PUBLISHED")).thenReturn(true);
    when(destinationRepository.findAllByIdInAndStatus(List.of(destId1, destId2), "PUBLISHED"))
        .thenReturn(List.of(d1, d2));

    // Simulation of TV3 addStop validation
    assertThat(destinationQueryService.isPublished(destId1)).isTrue();
    Optional<DestinationSummary> stopSummary = destinationQueryService.findPublishedById(destId1);
    assertThat(stopSummary).isPresent();
    assertThat(stopSummary.get().name()).isEqualTo("Cầu Vàng Bà Nà");

    // Simulation of TV3 loading full itinerary day stops
    List<DestinationSummary> dayStops =
        destinationQueryService.findPublishedByIds(List.of(destId1, destId2));
    assertThat(dayStops).hasSize(2);
    assertThat(dayStops.get(0).name()).isEqualTo("Cầu Vàng Bà Nà");
    assertThat(dayStops.get(1).name()).isEqualTo("Bán đảo Sơn Trà");
  }

  @Test
  @DisplayName("W4-TV4-INTEGRATION: TV4 Gemini AI & Budget Estimator consumes DestinationQueryService")
  void testTv4AiPlannerAndBudgetIntegration() {
    UUID destId = UUID.randomUUID();
    Destination d = createPublishedDestination(destId, "Quần thể Tràng An", "Ninh Bình", "Di sản", BigDecimal.valueOf(250000));

    when(destinationRepository.findAll(any(Specification.class), any(Pageable.class)))
        .thenReturn(new PageImpl<>(List.of(d)));
    when(destinationRepository.findAllByIdInAndStatus(List.of(destId), "PUBLISHED"))
        .thenReturn(List.of(d));

    // 1. AI context generation (searching candidates for prompt context)
    List<DestinationSummary> candidates =
        destinationQueryService.searchPublished("Tràng An", "Ninh Bình", null, 20);
    assertThat(candidates).isNotEmpty();
    assertThat(candidates.get(0).name()).isEqualTo("Quần thể Tràng An");
    assertThat(candidates.get(0).priceMin()).isEqualByComparingTo("250000");

    // 2. Budget attraction calculation
    List<DestinationSummary> planned = destinationQueryService.findPublishedByIds(List.of(destId));
    BigDecimal totalBudget =
        planned.stream()
            .map(DestinationSummary::priceMin)
            .reduce(BigDecimal.ZERO, BigDecimal::add);
    assertThat(totalBudget).isEqualByComparingTo("250000");
  }

  @Test
  @DisplayName("W4-STUB-INTEGRATION: TV3/TV4 can use StubDestinationQueryService for completely decoupled testing")
  void testStubServiceDecoupledTesting() {
    StubDestinationQueryService stub = new StubDestinationQueryService();
    UUID sampleId = UUID.fromString("11111111-1111-1111-1111-111111111111");

    assertThat(stub.isPublished(sampleId)).isTrue();
    assertThat(stub.findPublishedById(sampleId)).isPresent();
  }
}
