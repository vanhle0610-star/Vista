package com.vista.destination.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.vista.destination.api.dto.DestinationDetailDto;
import com.vista.destination.api.dto.DestinationSummaryDto;
import com.vista.destination.domain.Destination;
import com.vista.destination.domain.DestinationCategory;
import com.vista.destination.domain.DestinationHistory;
import com.vista.destination.domain.Favorite;
import com.vista.destination.domain.Province;
import com.vista.destination.repository.DestinationHistoryRepository;
import com.vista.destination.repository.DestinationRepository;
import com.vista.destination.repository.FavoriteRepository;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.data.domain.Pageable;

class DestinationServiceTest {

  private DestinationRepository destinationRepository;
  private FavoriteRepository favoriteRepository;
  private DestinationHistoryRepository historyRepository;
  private DestinationService destinationService;

  @BeforeEach
  void setUp() {
    destinationRepository = mock(DestinationRepository.class);
    favoriteRepository = mock(FavoriteRepository.class);
    historyRepository = mock(DestinationHistoryRepository.class);
    destinationService =
        new DestinationService(destinationRepository, favoriteRepository, historyRepository);
  }

  private Destination createMockDestination(UUID id, String name, String status) {
    Destination dest = new Destination();
    dest.setId(id);
    dest.setName(name);
    dest.setStatus(status);
    dest.setProvince(new Province("Đà Nẵng", "da-nang", "CENTRAL"));
    dest.setCategory(new DestinationCategory("Văn hóa", "culture"));
    dest.setPriceMin(BigDecimal.ZERO);
    dest.setPriceMax(BigDecimal.valueOf(100000));
    dest.setLatitude(BigDecimal.valueOf(16.05));
    dest.setLongitude(BigDecimal.valueOf(108.20));
    dest.setOpeningHours("{\"mon\":\"08:00-17:00\",\"sun\":\"08:00-17:00\"}");
    return dest;
  }

  @Nested
  @DisplayName("Favorites Management Tests")
  class FavoriteTests {

    @Test
    @DisplayName(
        "addFavorite saves new favorite when destination is published and not yet favorited")
    void addFavoriteSuccess() {
      UUID destId = UUID.randomUUID();
      UUID userId = UUID.randomUUID();
      Destination dest = createMockDestination(destId, "Cầu Rồng", "PUBLISHED");

      when(destinationRepository.findByIdAndStatus(destId, "PUBLISHED"))
          .thenReturn(Optional.of(dest));
      when(favoriteRepository.existsByIdUserIdAndIdDestinationId(userId, destId)).thenReturn(false);

      destinationService.addFavorite(destId, userId);

      ArgumentCaptor<Favorite> captor = ArgumentCaptor.forClass(Favorite.class);
      verify(favoriteRepository).save(captor.capture());
      assertThat(captor.getValue().getId().getUserId()).isEqualTo(userId);
      assertThat(captor.getValue().getId().getDestinationId()).isEqualTo(destId);
    }

    @Test
    @DisplayName("addFavorite is idempotent: does not duplicate if already favorited")
    void addFavoriteIdempotentWhenAlreadyFavorited() {
      UUID destId = UUID.randomUUID();
      UUID userId = UUID.randomUUID();
      Destination dest = createMockDestination(destId, "Cầu Rồng", "PUBLISHED");

      when(destinationRepository.findByIdAndStatus(destId, "PUBLISHED"))
          .thenReturn(Optional.of(dest));
      when(favoriteRepository.existsByIdUserIdAndIdDestinationId(userId, destId)).thenReturn(true);

      destinationService.addFavorite(destId, userId);

      verify(favoriteRepository, never()).save(any());
    }

    @Test
    @DisplayName(
        "addFavorite throws DestinationNotFoundException when destination not found or unpublished")
    void addFavoriteThrowsWhenNotFound() {
      UUID destId = UUID.randomUUID();
      UUID userId = UUID.randomUUID();

      when(destinationRepository.findByIdAndStatus(destId, "PUBLISHED"))
          .thenReturn(Optional.empty());

      assertThatThrownBy(() -> destinationService.addFavorite(destId, userId))
          .isInstanceOf(DestinationNotFoundException.class)
          .hasMessageContaining(destId.toString());

      verify(favoriteRepository, never()).save(any());
    }

    @Test
    @DisplayName("removeFavorite deletes favorite when destination exists")
    void removeFavoriteSuccess() {
      UUID destId = UUID.randomUUID();
      UUID userId = UUID.randomUUID();

      when(destinationRepository.existsByIdAndStatus(destId, "PUBLISHED")).thenReturn(true);

      destinationService.removeFavorite(destId, userId);

      verify(favoriteRepository).deleteByIdUserIdAndIdDestinationId(userId, destId);
    }

    @Test
    @DisplayName(
        "removeFavorite throws DestinationNotFoundException when destination does not exist")
    void removeFavoriteThrowsWhenNotFound() {
      UUID destId = UUID.randomUUID();
      UUID userId = UUID.randomUUID();

      when(destinationRepository.existsByIdAndStatus(destId, "PUBLISHED")).thenReturn(false);

      assertThatThrownBy(() -> destinationService.removeFavorite(destId, userId))
          .isInstanceOf(DestinationNotFoundException.class);

      verify(favoriteRepository, never()).deleteByIdUserIdAndIdDestinationId(any(), any());
    }

    @Test
    @DisplayName("getFavorites returns only published destinations in user list")
    void getFavoritesFiltersPublishedOnly() {
      UUID userId = UUID.randomUUID();
      Destination dest1 = createMockDestination(UUID.randomUUID(), "Bà Nà Hills", "PUBLISHED");
      Destination dest2 = createMockDestination(UUID.randomUUID(), "Điểm đóng cửa", "ARCHIVED");

      Favorite fav1 = new Favorite(userId, dest1);
      Favorite fav2 = new Favorite(userId, dest2);

      when(favoriteRepository.findByIdUserIdOrderByCreatedAtDesc(userId))
          .thenReturn(List.of(fav1, fav2));

      List<DestinationSummaryDto> results = destinationService.getFavorites(userId);

      assertThat(results).hasSize(1);
      assertThat(results.get(0).name()).isEqualTo("Bà Nà Hills");
    }

    @Test
    @DisplayName("isFavorite checks user favorite status correctly")
    void isFavoriteStatusCheck() {
      UUID destId = UUID.randomUUID();
      UUID userId = UUID.randomUUID();

      when(favoriteRepository.existsByIdUserIdAndIdDestinationId(userId, destId)).thenReturn(true);

      assertThat(destinationService.isFavorite(destId, userId)).isTrue();
      assertThat(destinationService.isFavorite(destId, null)).isFalse();
    }
  }

  @Nested
  @DisplayName("Destination History Tests")
  class HistoryTests {

    @Test
    @DisplayName("recordView creates new history entry if never viewed before")
    void recordViewCreatesNewEntry() {
      UUID destId = UUID.randomUUID();
      UUID userId = UUID.randomUUID();
      Destination dest = createMockDestination(destId, "Chùa Cầu", "PUBLISHED");

      when(destinationRepository.findByIdAndStatus(destId, "PUBLISHED"))
          .thenReturn(Optional.of(dest));
      when(historyRepository.findByUserIdAndDestinationId(userId, destId))
          .thenReturn(Optional.empty());

      destinationService.recordView(destId, userId);

      ArgumentCaptor<DestinationHistory> captor = ArgumentCaptor.forClass(DestinationHistory.class);
      verify(historyRepository).save(captor.capture());
      assertThat(captor.getValue().getUserId()).isEqualTo(userId);
      assertThat(captor.getValue().getDestination().getId()).isEqualTo(destId);
    }

    @Test
    @DisplayName("recordView updates timestamp and does not create duplicate if viewed before")
    void recordViewUpdatesTimestamp() {
      UUID destId = UUID.randomUUID();
      UUID userId = UUID.randomUUID();
      Destination dest = createMockDestination(destId, "Chùa Cầu", "PUBLISHED");

      Instant oldTime = Instant.now().minusSeconds(3600);
      DestinationHistory existingHistory = new DestinationHistory(userId, dest);
      existingHistory.setViewedAt(oldTime);

      when(destinationRepository.findByIdAndStatus(destId, "PUBLISHED"))
          .thenReturn(Optional.of(dest));
      when(historyRepository.findByUserIdAndDestinationId(userId, destId))
          .thenReturn(Optional.of(existingHistory));

      destinationService.recordView(destId, userId);

      verify(historyRepository).save(existingHistory);
      assertThat(existingHistory.getViewedAt()).isAfter(oldTime);
    }

    @Test
    @DisplayName("recordView throws DestinationNotFoundException if destination not found")
    void recordViewThrowsWhenNotFound() {
      UUID destId = UUID.randomUUID();
      UUID userId = UUID.randomUUID();

      when(destinationRepository.findByIdAndStatus(destId, "PUBLISHED"))
          .thenReturn(Optional.empty());

      assertThatThrownBy(() -> destinationService.recordView(destId, userId))
          .isInstanceOf(DestinationNotFoundException.class);

      verify(historyRepository, never()).save(any());
    }

    @Test
    @DisplayName("getRecentHistory returns ordered items and caps limit")
    void getRecentHistoryWorks() {
      UUID userId = UUID.randomUUID();
      Destination dest1 = createMockDestination(UUID.randomUUID(), "Hồ Tây", "PUBLISHED");
      Destination dest2 = createMockDestination(UUID.randomUUID(), "Hồ Gươm", "PUBLISHED");

      DestinationHistory h1 = new DestinationHistory(userId, dest1);
      DestinationHistory h2 = new DestinationHistory(userId, dest2);

      when(historyRepository.findByUserIdOrderByViewedAtDesc(eq(userId), any(Pageable.class)))
          .thenReturn(List.of(h1, h2));

      List<DestinationSummaryDto> history = destinationService.getRecentHistory(userId, 10);

      assertThat(history).hasSize(2);
      assertThat(history.get(0).name()).isEqualTo("Hồ Tây");
      assertThat(history.get(1).name()).isEqualTo("Hồ Gươm");
    }
  }

  @Nested
  @DisplayName("Detail & Favorite status integration")
  class DetailTests {

    @Test
    @DisplayName("getPublishedDetail sets isFavorite = true for authenticated user who favorited")
    void getPublishedDetailWithFavoriteTrue() {
      UUID destId = UUID.randomUUID();
      UUID userId = UUID.randomUUID();
      Destination dest = createMockDestination(destId, "Fansipan", "PUBLISHED");

      when(destinationRepository.findByIdAndStatus(destId, "PUBLISHED"))
          .thenReturn(Optional.of(dest));
      when(favoriteRepository.existsByIdUserIdAndIdDestinationId(userId, destId)).thenReturn(true);

      DestinationDetailDto detail = destinationService.getPublishedDetail(destId, userId);

      assertThat(detail.name()).isEqualTo("Fansipan");
      assertThat(detail.isFavorite()).isTrue();
      assertThat(detail.openingHours()).isNotEmpty();
    }

    @Test
    @DisplayName(
        "getPublishedDetail sets isFavorite = false for unauthenticated guest (null userId)")
    void getPublishedDetailWithGuestUser() {
      UUID destId = UUID.randomUUID();
      Destination dest = createMockDestination(destId, "Fansipan", "PUBLISHED");

      when(destinationRepository.findByIdAndStatus(destId, "PUBLISHED"))
          .thenReturn(Optional.of(dest));

      DestinationDetailDto detail = destinationService.getPublishedDetail(destId, null);

      assertThat(detail.name()).isEqualTo("Fansipan");
      assertThat(detail.isFavorite()).isFalse();
      verify(favoriteRepository, never()).existsByIdUserIdAndIdDestinationId(any(), any());
    }
  }
}
