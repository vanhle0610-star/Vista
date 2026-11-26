package com.vista.trip;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.vista.common.audit.AuditLogService;
import com.vista.trip.application.TripAccessService;
import com.vista.trip.application.TripService;
import com.vista.trip.application.TripSettlementChecker;
import com.vista.trip.domain.TripEntity;
import com.vista.trip.domain.TripMemberRepository;
import com.vista.trip.domain.TripRepository;
import java.time.LocalDate;
import java.util.Optional;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.web.server.ResponseStatusException;

@ExtendWith(MockitoExtension.class)
class TripServiceDeleteDebtTest {

  @Mock private TripRepository tripRepository;
  @Mock private TripMemberRepository tripMemberRepository;
  @Mock private TripAccessService tripAccessService;
  @Mock private AuditLogService auditLogService;
  @Mock private TripSettlementChecker tripSettlementChecker;

  private TripService tripService;
  private UUID ownerId;
  private UUID tripId;
  private TripEntity sampleTrip;

  @BeforeEach
  void setUp() {
    tripService =
        new TripService(
            tripRepository,
            tripMemberRepository,
            tripAccessService,
            auditLogService,
            tripSettlementChecker);

    ownerId = UUID.randomUUID();
    tripId = UUID.randomUUID();
    sampleTrip = new TripEntity(ownerId, "Chuyến đi Đà Lạt", LocalDate.now(), LocalDate.now().plusDays(3));
  }

  @Test
  @DisplayName("Owner xóa chuyến đi không có chi phí hoặc đã quyết toán xong: Thành công xóa")
  void deleteTrip_whenNoUnsettledDebts_deletesSuccessfully() {
    when(tripRepository.findById(tripId)).thenReturn(Optional.of(sampleTrip));
    when(tripSettlementChecker.hasUnsettledDebts(tripId)).thenReturn(false);

    tripService.deleteTrip(tripId, ownerId);

    verify(tripAccessService).requireOwner(tripId, ownerId);
    verify(tripRepository, times(1)).delete(sampleTrip);
    verify(auditLogService, times(1))
        .logAction(eq(ownerId), eq("DELETE_TRIP"), eq("TRIP"), eq(tripId.toString()), any());
  }

  @Test
  @DisplayName("Owner xóa chuyến đi còn công nợ chưa quyết toán: Ném 409 CONFLICT và giữ nguyên dữ liệu")
  void deleteTrip_whenHasUnsettledDebts_throws409ConflictAndPreservesData() {
    when(tripRepository.findById(tripId)).thenReturn(Optional.of(sampleTrip));
    when(tripSettlementChecker.hasUnsettledDebts(tripId)).thenReturn(true);

    assertThatThrownBy(() -> tripService.deleteTrip(tripId, ownerId))
        .isInstanceOf(ResponseStatusException.class)
        .satisfies(
            ex -> {
              ResponseStatusException rse = (ResponseStatusException) ex;
              assertThat(rse.getStatusCode()).isEqualTo(HttpStatus.CONFLICT);
              assertThat(rse.getReason()).contains("còn khoản chi tiêu hoặc công nợ chưa quyết toán");
            });

    verify(tripAccessService).requireOwner(tripId, ownerId);
    verify(tripRepository, never()).delete(any());
  }

  @Test
  @DisplayName("Người không phải Owner cố gắng xóa chuyến đi: Ném AccessDeniedException và không xóa")
  void deleteTrip_whenRequesterNotOwner_throwsAccessDenied() {
    UUID nonOwnerId = UUID.randomUUID();
    doThrow(new AccessDeniedException("Chỉ chủ chuyến đi mới có quyền thực hiện"))
        .when(tripAccessService)
        .requireOwner(tripId, nonOwnerId);

    assertThatThrownBy(() -> tripService.deleteTrip(tripId, nonOwnerId))
        .isInstanceOf(AccessDeniedException.class);

    verify(tripRepository, never()).findById(any());
    verify(tripRepository, never()).delete(any());
  }

  private <T> T eq(T value) {
    return org.mockito.ArgumentMatchers.eq(value);
  }
}
