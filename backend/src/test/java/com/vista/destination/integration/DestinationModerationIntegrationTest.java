package com.vista.destination.integration;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.vista.common.audit.AuditLogService;
import com.vista.destination.api.dto.DestinationDetailDto;
import com.vista.destination.api.dto.DestinationPageDto;
import com.vista.destination.domain.Destination;
import com.vista.destination.domain.DestinationCategory;
import com.vista.destination.domain.Province;
import com.vista.destination.repository.DestinationHistoryRepository;
import com.vista.destination.repository.DestinationRepository;
import com.vista.destination.repository.FavoriteRepository;
import com.vista.destination.service.DestinationService;
import java.math.BigDecimal;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;

@DisplayName(
    "TV1 Week 6 Integration Tests: Destination Moderation Queue & Approval (FR-ADM-01, FR-ADM-03)")
class DestinationModerationIntegrationTest {

  private DestinationRepository destinationRepository;
  private FavoriteRepository favoriteRepository;
  private DestinationHistoryRepository historyRepository;
  private AuditLogService auditLogService;
  private DestinationService destinationService;

  @BeforeEach
  void setUp() {
    destinationRepository = mock(DestinationRepository.class);
    favoriteRepository = mock(FavoriteRepository.class);
    historyRepository = mock(DestinationHistoryRepository.class);
    auditLogService = mock(AuditLogService.class);

    destinationService =
        new DestinationService(destinationRepository, favoriteRepository, historyRepository);
    destinationService.setAuditLogService(auditLogService);
  }

  private Destination createDestinationWithStatus(UUID id, String name, String status) {
    Destination dest = new Destination();
    dest.setId(id);
    dest.setName(name);
    dest.setStatus(status);
    dest.setProvince(new Province("Đà Nẵng", "da-nang", "REGION"));
    dest.setCategory(new DestinationCategory("Cảnh quan", "canh-quan"));
    dest.setPriceMin(BigDecimal.ZERO);
    dest.setPriceMax(BigDecimal.ZERO);
    dest.setOpeningHours("{\"mon\":\"08:00-17:00\"}");
    return dest;
  }

  @Test
  @DisplayName("W6-MOD-01: Moderation Queue queries DRAFT destinations by default")
  void testModerationQueueSearchDraftByDefault() {
    UUID destId = UUID.randomUUID();
    Destination draftDest = createDestinationWithStatus(destId, "Bãi Rạn Nam Ô", "DRAFT");

    when(destinationRepository.findAll(any(Specification.class), any(Pageable.class)))
        .thenReturn(new PageImpl<>(List.of(draftDest)));

    DestinationPageDto result =
        destinationService.searchModerationQueue("Nam Ô", null, null, null, 0, 20);

    assertThat(result.items()).hasSize(1);
    assertThat(result.items().get(0).status()).isEqualTo("DRAFT");
    assertThat(result.items().get(0).name()).isEqualTo("Bãi Rạn Nam Ô");
  }

  @Test
  @DisplayName(
      "W6-MOD-02: Approve destination sets status to PUBLISHED, verifiedAt, and records audit log")
  void testApproveDestination() {
    UUID destId = UUID.randomUUID();
    UUID moderatorId = UUID.randomUUID();
    Destination draftDest = createDestinationWithStatus(destId, "Chùa Linh Ứng", "DRAFT");

    when(destinationRepository.findById(destId)).thenReturn(Optional.of(draftDest));
    when(destinationRepository.save(any(Destination.class))).thenAnswer(inv -> inv.getArgument(0));

    DestinationDetailDto approved =
        destinationService.approveDestination(destId, moderatorId, "Nội dung đầy đủ, hợp lệ");

    assertThat(approved.status()).isEqualTo("PUBLISHED");
    assertThat(draftDest.getStatus()).isEqualTo("PUBLISHED");
    assertThat(draftDest.getVerifiedAt()).isNotNull();

    verify(auditLogService)
        .logAction(
            eq(moderatorId),
            eq("DESTINATION_PUBLISHED"),
            eq("DESTINATION"),
            eq(destId.toString()),
            eq("Nội dung đầy đủ, hợp lệ"));
  }

  @Test
  @DisplayName("W6-MOD-03: Reject destination sets status to REJECTED and records audit log")
  void testRejectDestination() {
    UUID destId = UUID.randomUUID();
    UUID moderatorId = UUID.randomUUID();
    Destination draftDest = createDestinationWithStatus(destId, "Điểm đến spam", "DRAFT");

    when(destinationRepository.findById(destId)).thenReturn(Optional.of(draftDest));
    when(destinationRepository.save(any(Destination.class))).thenAnswer(inv -> inv.getArgument(0));

    DestinationDetailDto rejected =
        destinationService.rejectDestination(destId, moderatorId, "Thiếu thông tin vị trí và ảnh");

    assertThat(rejected.status()).isEqualTo("REJECTED");
    assertThat(draftDest.getStatus()).isEqualTo("REJECTED");

    verify(auditLogService)
        .logAction(
            eq(moderatorId),
            eq("DESTINATION_REJECTED"),
            eq("DESTINATION"),
            eq(destId.toString()),
            eq("Thiếu thông tin vị trí và ảnh"));
  }

  @Test
  @DisplayName("W6-MOD-04: getModerationStats returns total, draft, published, and rejected counts")
  void testGetModerationStats() {
    when(destinationRepository.count()).thenReturn(368L);
    when(destinationRepository.countByStatus("DRAFT")).thenReturn(12L);
    when(destinationRepository.countByStatus("PUBLISHED")).thenReturn(350L);
    when(destinationRepository.countByStatus("REJECTED")).thenReturn(6L);

    Map<String, Long> stats = destinationService.getModerationStats();

    assertThat(stats.get("total")).isEqualTo(368L);
    assertThat(stats.get("draft")).isEqualTo(12L);
    assertThat(stats.get("published")).isEqualTo(350L);
    assertThat(stats.get("rejected")).isEqualTo(6L);
  }

  @Test
  @DisplayName(
      "W6-MOD-05: updateDestinationStatus throws IllegalArgumentException for invalid status")
  void testInvalidStatusThrowsException() {
    UUID destId = UUID.randomUUID();
    UUID moderatorId = UUID.randomUUID();

    assertThatThrownBy(
            () ->
                destinationService.updateDestinationStatus(
                    destId, "INVALID_STATUS", moderatorId, null))
        .isInstanceOf(IllegalArgumentException.class)
        .hasMessageContaining("Trạng thái không hợp lệ");
  }
}
