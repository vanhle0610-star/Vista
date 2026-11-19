package com.vista.destination.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.vista.collaboration.itinerary.ItineraryItemRepository;
import com.vista.common.audit.AuditLogService;
import com.vista.destination.api.dto.CreateDestinationRequest;
import com.vista.destination.api.dto.DestinationDetailDto;
import com.vista.destination.api.dto.DestinationSummaryDto;
import com.vista.destination.api.dto.UpdateDestinationRequest;
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

  @Nested
  @DisplayName("Review Stats and Image Tests")
  class ReviewStatsAndImageTests {

    @Test
    @DisplayName("Newly created destination has 0 reviews, null rating, and stores image URL")
    void newlyCreatedDestinationStatsAndImage() {
      CreateDestinationRequest request =
          new CreateDestinationRequest(
              "Chợ đêm Sơn Trà",
              "Đà Nẵng",
              "Ẩm thực",
              "Thiên đường ẩm thực đêm Đà Nẵng",
              "https://cyqvqehhjpvwovdzscxm.supabase.co/storage/v1/object/public/vista-media/destinations/son_tra.jpg",
              BigDecimal.valueOf(16.06),
              BigDecimal.valueOf(108.23),
              BigDecimal.ZERO,
              BigDecimal.valueOf(200000),
              "18:00 - 23:00",
              "https://dulich3mien.vn/da-nang/cho-dem-son-tra/",
              "PUBLISHED");

      when(destinationRepository.save(any(Destination.class)))
          .thenAnswer(
              inv -> {
                Destination saved = inv.getArgument(0);
                saved.setId(UUID.randomUUID());
                return saved;
              });

      DestinationDetailDto result = destinationService.createDestination(request);

      assertThat(result.name()).isEqualTo("Chợ đêm Sơn Trà");
      assertThat(result.imageUrl())
          .isEqualTo(
              "https://cyqvqehhjpvwovdzscxm.supabase.co/storage/v1/object/public/vista-media/destinations/son_tra.jpg");
      assertThat(result.rating()).isNull();
      assertThat(result.reviewCount()).isEqualTo(0);
    }

    @Test
    @DisplayName("Destination without reviews returns rating = null and reviewCount = 0")
    void destinationWithoutReviews() {
      UUID destId = UUID.randomUUID();
      Destination dest = createMockDestination(destId, "Bà Nà Hills", "PUBLISHED");

      when(destinationRepository.findByIdAndStatus(destId, "PUBLISHED"))
          .thenReturn(Optional.of(dest));

      DestinationDetailDto detail = destinationService.getPublishedDetail(destId, null);

      assertThat(detail.rating()).isNull();
      assertThat(detail.reviewCount()).isEqualTo(0);
    }

    @Test
    @DisplayName(
        "Destination with real reviews calculates average rating and total count accurately")
    void destinationWithRealReviews() {
      UUID destId = UUID.randomUUID();
      Destination dest = createMockDestination(destId, "Cầu Rồng", "PUBLISHED");

      org.springframework.jdbc.core.JdbcTemplate mockJdbc =
          mock(org.springframework.jdbc.core.JdbcTemplate.class);
      destinationService.setJdbcTemplate(mockJdbc);

      when(mockJdbc.query(
              anyString(), any(org.springframework.jdbc.core.ResultSetExtractor.class), eq(destId)))
          .thenReturn(new DestinationService.DestinationReviewStats(4.8, 25));

      when(destinationRepository.findByIdAndStatus(destId, "PUBLISHED"))
          .thenReturn(Optional.of(dest));

      DestinationDetailDto detail = destinationService.getPublishedDetail(destId, null);

      assertThat(detail.rating()).isEqualTo(4.8);
      assertThat(detail.reviewCount()).isEqualTo(25);
    }
  }

  @Nested
  @DisplayName("Admin Edit, Soft-Delete & Moderation Tests")
  class AdminDestinationManagementTests {

    @Test
    @DisplayName(
        "updateDestination happy path updates fields, gallery, and logs UPDATE_DESTINATION")
    void updateDestinationHappyPath() {
      UUID destId = UUID.randomUUID();
      UUID actorId = UUID.randomUUID();
      Destination existing = createMockDestination(destId, "Cầu Rồng Cũ", "PUBLISHED");
      existing.setSlug("cau-rong-cu");

      AuditLogService mockAudit = mock(AuditLogService.class);
      destinationService.setAuditLogService(mockAudit);

      when(destinationRepository.findById(destId)).thenReturn(Optional.of(existing));
      when(destinationRepository.existsBySlug("cau-rong-da-nang")).thenReturn(false);
      when(destinationRepository.save(any(Destination.class)))
          .thenAnswer(inv -> inv.getArgument(0));

      UpdateDestinationRequest req =
          new UpdateDestinationRequest(
              "Cầu Rồng Đà Nẵng",
              "Đà Nẵng",
              null,
              "Cảnh quan & Check-in",
              null,
              "Cầu Rồng phun lửa cuối tuần",
              "https://example.com/img1.jpg",
              List.of("https://example.com/img1.jpg", "https://example.com/img2.jpg"),
              BigDecimal.valueOf(16.0611),
              BigDecimal.valueOf(108.2272),
              BigDecimal.ZERO,
              BigDecimal.valueOf(50000),
              "{\"mon\":\"08:00-22:00\"}",
              "https://danang.gov.vn",
              null);

      DestinationDetailDto updated = destinationService.updateDestination(destId, req, actorId);

      assertThat(updated.name()).isEqualTo("Cầu Rồng Đà Nẵng");
      assertThat(existing.getSlug()).isEqualTo("cau-rong-da-nang");
      assertThat(updated.imageUrls())
          .containsExactly("https://example.com/img1.jpg", "https://example.com/img2.jpg");
      assertThat(updated.priceMax()).isEqualByComparingTo(BigDecimal.valueOf(50000));
      verify(mockAudit)
          .logAction(
              eq(actorId),
              eq("UPDATE_DESTINATION"),
              eq("DESTINATION"),
              eq(destId.toString()),
              anyString());
    }

    @Test
    @DisplayName(
        "updateDestination appends -1, -2 suffix when slug is duplicated and keeps REJECTED status")
    void updateDestinationSlugDuplicateAndKeepsRejectedStatus() {
      UUID destId = UUID.randomUUID();
      Destination existing = createMockDestination(destId, "Tên Cũ", "REJECTED");
      existing.setSlug("ten-cu");

      when(destinationRepository.findById(destId)).thenReturn(Optional.of(existing));
      when(destinationRepository.existsBySlug("pho-co-hoi-an")).thenReturn(true);
      when(destinationRepository.existsBySlug("pho-co-hoi-an-1")).thenReturn(true);
      when(destinationRepository.existsBySlug("pho-co-hoi-an-2")).thenReturn(false);
      when(destinationRepository.save(any(Destination.class)))
          .thenAnswer(inv -> inv.getArgument(0));

      UpdateDestinationRequest req =
          new UpdateDestinationRequest(
              "Phố cổ Hội An",
              "Quảng Nam",
              null,
              "Di sản",
              null,
              "Mô tả cập nhật",
              null,
              null,
              BigDecimal.valueOf(15.88),
              BigDecimal.valueOf(108.33),
              BigDecimal.ZERO,
              BigDecimal.valueOf(120000),
              "07:00-21:00",
              null,
              "PUBLISHED");

      DestinationDetailDto updated = destinationService.updateDestination(destId, req);

      assertThat(existing.getSlug()).isEqualTo("pho-co-hoi-an-2");
      assertThat(updated.status()).isEqualTo("REJECTED");
    }

    @Test
    @DisplayName("updateDestination validation throws when name is blank or priceMax < priceMin")
    void updateDestinationValidationErrors() {
      UUID destId = UUID.randomUUID();

      UpdateDestinationRequest blankNameReq =
          new UpdateDestinationRequest(
              "   ",
              "Đà Nẵng",
              null,
              null,
              null,
              null,
              null,
              null,
              null,
              null,
              BigDecimal.ZERO,
              BigDecimal.TEN,
              null,
              null,
              null);

      assertThatThrownBy(() -> destinationService.updateDestination(destId, blankNameReq))
          .isInstanceOf(IllegalArgumentException.class)
          .hasMessageContaining("Tên điểm đến");

      UpdateDestinationRequest invalidPriceReq =
          new UpdateDestinationRequest(
              "Bà Nà Hills",
              "Đà Nẵng",
              null,
              null,
              null,
              null,
              null,
              null,
              null,
              null,
              BigDecimal.valueOf(500000),
              BigDecimal.valueOf(100000),
              null,
              null,
              null);

      assertThatThrownBy(() -> destinationService.updateDestination(destId, invalidPriceReq))
          .isInstanceOf(IllegalArgumentException.class)
          .hasMessageContaining("Giá vé tối đa");
    }

    @Test
    @DisplayName(
        "deleteDestination without FK references physically deletes and logs DELETE_DESTINATION")
    void deleteDestinationWithoutFkDeletesPhysically() {
      UUID destId = UUID.randomUUID();
      UUID actorId = UUID.randomUUID();
      Destination dest = createMockDestination(destId, "Điểm test xóa", "DRAFT");

      AuditLogService mockAudit = mock(AuditLogService.class);
      destinationService.setAuditLogService(mockAudit);

      when(destinationRepository.findById(destId)).thenReturn(Optional.of(dest));

      destinationService.deleteDestination(destId, actorId);

      verify(destinationRepository).deleteById(destId);
      verify(mockAudit)
          .logAction(
              eq(actorId),
              eq("DELETE_DESTINATION"),
              eq("DESTINATION"),
              eq(destId.toString()),
              anyString());
    }

    @Test
    @DisplayName(
        "deleteDestination with FK references archives destination, logs ARCHIVE_DESTINATION, and throws 409")
    void deleteDestinationWithFkSoftDeletesToArchived() {
      UUID destId = UUID.randomUUID();
      UUID actorId = UUID.randomUUID();
      Destination dest = createMockDestination(destId, "Cầu Vàng", "PUBLISHED");

      ItineraryItemRepository mockItineraryRepo = mock(ItineraryItemRepository.class);
      AuditLogService mockAudit = mock(AuditLogService.class);
      destinationService.setItineraryItemRepository(mockItineraryRepo);
      destinationService.setAuditLogService(mockAudit);

      when(destinationRepository.findById(destId)).thenReturn(Optional.of(dest));
      when(mockItineraryRepo.existsByDestinationId(destId)).thenReturn(true);
      when(destinationRepository.save(any(Destination.class)))
          .thenAnswer(inv -> inv.getArgument(0));

      assertThatThrownBy(() -> destinationService.deleteDestination(destId, actorId))
          .isInstanceOf(DestinationInUseException.class)
          .hasMessageContaining("Lưu trữ");

      assertThat(dest.getStatus()).isEqualTo("ARCHIVED");
      verify(destinationRepository, never()).deleteById(destId);
      verify(destinationRepository).save(dest);
      verify(mockAudit)
          .logAction(
              eq(actorId),
              eq("ARCHIVE_DESTINATION"),
              eq("DESTINATION"),
              eq(destId.toString()),
              anyString());
    }

    @Test
    @DisplayName("rejectDestination stores rejectionReason and returns it in DestinationDetailDto")
    void rejectDestinationWithReasonPersistsReason() {
      UUID destId = UUID.randomUUID();
      UUID moderatorId = UUID.randomUUID();
      Destination dest = createMockDestination(destId, "Điểm chưa chuẩn", "DRAFT");

      AuditLogService mockAudit = mock(AuditLogService.class);
      destinationService.setAuditLogService(mockAudit);

      when(destinationRepository.findById(destId)).thenReturn(Optional.of(dest));
      when(destinationRepository.save(any(Destination.class)))
          .thenAnswer(inv -> inv.getArgument(0));

      String reason = "Hình ảnh bị mờ và thông tin tọa độ GPS không chính xác";
      DestinationDetailDto rejected =
          destinationService.rejectDestination(destId, moderatorId, reason);

      assertThat(rejected.status()).isEqualTo("REJECTED");
      assertThat(rejected.rejectionReason()).isEqualTo(reason);
      assertThat(rejected.openingHours()).doesNotContainKey("_rejectionReason");
      verify(mockAudit)
          .logAction(
              eq(moderatorId),
              eq("DESTINATION_REJECTED"),
              eq("DESTINATION"),
              eq(destId.toString()),
              eq(reason));
    }
  }
}
