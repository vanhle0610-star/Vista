package com.vista.destination.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.vista.common.audit.AuditLogService;
import com.vista.destination.api.dto.ApproveDestinationRequestDto;
import com.vista.destination.api.dto.DestinationRequestDto;
import com.vista.destination.api.dto.SubmitDestinationRequestDto;
import com.vista.destination.domain.Destination;
import com.vista.destination.domain.DestinationCategory;
import com.vista.destination.domain.DestinationRequest;
import com.vista.destination.domain.Province;
import com.vista.destination.repository.DestinationCategoryRepository;
import com.vista.destination.repository.DestinationRepository;
import com.vista.destination.repository.DestinationRequestRepository;
import com.vista.destination.repository.ProvinceRepository;
import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;

@DisplayName("DestinationRequestService Unit Tests")
class DestinationRequestServiceTest {

  private DestinationRequestRepository requestRepository;
  private DestinationRepository destinationRepository;
  private ProvinceRepository provinceRepository;
  private DestinationCategoryRepository categoryRepository;
  private AuditLogService auditLogService;
  private DestinationRequestService service;

  @BeforeEach
  void setUp() {
    requestRepository = mock(DestinationRequestRepository.class);
    destinationRepository = mock(DestinationRepository.class);
    provinceRepository = mock(ProvinceRepository.class);
    categoryRepository = mock(DestinationCategoryRepository.class);
    auditLogService = mock(AuditLogService.class);

    service =
        new DestinationRequestService(
            requestRepository,
            destinationRepository,
            provinceRepository,
            categoryRepository,
            null);
    service.setAuditLogService(auditLogService);

    when(requestRepository.save(any(DestinationRequest.class)))
        .thenAnswer(
            inv -> {
              DestinationRequest r = inv.getArgument(0);
              if (r.getId() == null) r.setId(UUID.randomUUID());
              return r;
            });
  }

  @Test
  @DisplayName("submitRequest CREATE creates PENDING request without touching destinations table")
  void submitCreateRequestSuccess() {
    UUID userId = UUID.randomUUID();
    var dto =
        new SubmitDestinationRequestDto(
            "CREATE",
            null,
            "Bãi Rạn Nam Ô",
            "Đà Nẵng",
            "Thiên nhiên",
            "Bãi đá rêu xanh đẹp vào mùa xuân",
            "Liên Chiểu, Đà Nẵng",
            new BigDecimal("16.123456"),
            new BigDecimal("108.123456"),
            BigDecimal.ZERO,
            new BigDecimal("50000"),
            null,
            List.of("https://example.com/namo.jpg"),
            "https://danang.gov.vn",
            "Địa điểm rất đẹp nhưng chưa có trên bản đồ");

    DestinationRequestDto result = service.submitRequest(userId, dto);

    assertThat(result.requestType()).isEqualTo("CREATE");
    assertThat(result.status()).isEqualTo("PENDING");
    assertThat(result.targetDestinationId()).isNull();
    assertThat(result.name()).isEqualTo("Bãi Rạn Nam Ô");
  }

  @Test
  @DisplayName("submitRequest CREATE rejects invalid coordinates")
  void submitCreateInvalidCoordinates() {
    UUID userId = UUID.randomUUID();
    var dto =
        new SubmitDestinationRequestDto(
            "CREATE",
            null,
            "Địa điểm lỗi",
            "Đà Nẵng",
            null,
            null,
            null,
            new BigDecimal("95.0"),
            new BigDecimal("108.0"),
            null,
            null,
            null,
            null,
            null,
            null);

    assertThatThrownBy(() -> service.submitRequest(userId, dto))
        .isInstanceOf(IllegalArgumentException.class)
        .hasMessageContaining("latitude");
  }

  @Test
  @DisplayName("submitRequest UPDATE blocks duplicate PENDING request for same user and destination")
  void submitUpdateDuplicatePendingThrowsConflict() {
    UUID userId = UUID.randomUUID();
    UUID destId = UUID.randomUUID();

    Destination published = new Destination();
    published.setId(destId);
    published.setName("Cầu Rồng");
    published.setStatus("PUBLISHED");

    when(destinationRepository.findById(destId)).thenReturn(Optional.of(published));
    when(requestRepository.existsBySubmittedByAndTargetDestinationIdAndStatus(
            userId, destId, "PENDING"))
        .thenReturn(true);

    var dto =
        new SubmitDestinationRequestDto(
            "UPDATE",
            destId,
            null,
            null,
            null,
            "Cập nhật giờ phun lửa",
            null,
            null,
            null,
            null,
            null,
            null,
            null,
            null,
            "Phun lửa 21h thứ 6-CN");

    assertThatThrownBy(() -> service.submitRequest(userId, dto))
        .isInstanceOf(DestinationRequestConflictException.class);
  }

  @Test
  @DisplayName("updateMyRequest allows owner to resubmit REJECTED request back to PENDING")
  void updateMyRequestResubmitsRejectedToPending() {
    UUID userId = UUID.randomUUID();
    UUID reqId = UUID.randomUUID();

    DestinationRequest existing = new DestinationRequest();
    existing.setId(reqId);
    existing.setRequestType("CREATE");
    existing.setSubmittedBy(userId);
    existing.setStatus("REJECTED");
    existing.setRejectionReason("Thiếu tọa độ");

    when(requestRepository.findById(reqId)).thenReturn(Optional.of(existing));

    var dto =
        new SubmitDestinationRequestDto(
            "CREATE",
            null,
            "Đỉnh Bàn Cờ",
            "Đà Nẵng",
            "Cảnh quan",
            "View toàn cảnh thành phố",
            null,
            new BigDecimal("16.119000"),
            new BigDecimal("108.285000"),
            BigDecimal.ZERO,
            BigDecimal.ZERO,
            null,
            null,
            null,
            "Đã bổ sung tọa độ chính xác");

    DestinationRequestDto updated = service.updateMyRequest(userId, reqId, dto);

    assertThat(updated.status()).isEqualTo("PENDING");
    assertThat(updated.rejectionReason()).isNull();
    assertThat(updated.name()).isEqualTo("Đỉnh Bàn Cờ");
  }

  @Test
  @DisplayName("updateMyRequest throws 403 Forbidden when called by non-owner")
  void updateMyRequestNonOwnerForbidden() {
    UUID ownerId = UUID.randomUUID();
    UUID otherId = UUID.randomUUID();
    UUID reqId = UUID.randomUUID();

    DestinationRequest existing = new DestinationRequest();
    existing.setId(reqId);
    existing.setRequestType("CREATE");
    existing.setSubmittedBy(ownerId);
    existing.setStatus("PENDING");

    when(requestRepository.findById(reqId)).thenReturn(Optional.of(existing));

    var dto =
        new SubmitDestinationRequestDto(
            "CREATE", null, "Test", "Đà Nẵng", null, null, null,
            new BigDecimal("16.0"), new BigDecimal("108.0"), null, null, null, null, null, null);

    assertThatThrownBy(() -> service.updateMyRequest(otherId, reqId, dto))
        .isInstanceOf(DestinationRequestForbiddenException.class);
  }

  @Test
  @DisplayName("approveRequest CREATE publishes new Destination and links targetDestinationId")
  void approveCreateRequestCreatesPublishedDestination() {
    UUID reqId = UUID.randomUUID();
    UUID modId = UUID.randomUUID();
    UUID newDestId = UUID.randomUUID();

    DestinationRequest req = new DestinationRequest();
    req.setId(reqId);
    req.setRequestType("CREATE");
    req.setSubmittedBy(UUID.randomUUID());
    req.setName("Làng đá mỹ nghệ Non Nước");
    req.setProvinceName("Đà Nẵng");
    req.setCategoryName("Làng nghề");
    req.setDescription("Làng nghề truyền thống lâu đời");
    req.setLatitude(new BigDecimal("16.002000"));
    req.setLongitude(new BigDecimal("108.263000"));
    req.setPriceMin(BigDecimal.ZERO);
    req.setPriceMax(BigDecimal.ZERO);
    req.setStatus("PENDING");

    when(requestRepository.findById(reqId)).thenReturn(Optional.of(req));
    when(provinceRepository.findByName("Đà Nẵng"))
        .thenReturn(Optional.of(new Province("Đà Nẵng", "da-nang", "VN")));
    when(categoryRepository.findByName("Làng nghề"))
        .thenReturn(Optional.of(new DestinationCategory("Làng nghề", "craft")));
    when(destinationRepository.existsBySlug(any())).thenReturn(false);
    when(destinationRepository.save(any(Destination.class)))
        .thenAnswer(
            inv -> {
              Destination d = inv.getArgument(0);
              d.setId(newDestId);
              return d;
            });

    var overrides =
        new ApproveDestinationRequestDto(
            "Làng đá Non Nước", null, null, null, null, null, null, null, null, null, null, null);

    DestinationRequestDto approved = service.approveRequest(reqId, modId, overrides);

    assertThat(approved.status()).isEqualTo("APPROVED");
    assertThat(approved.targetDestinationId()).isEqualTo(newDestId);

    ArgumentCaptor<Destination> destCaptor = ArgumentCaptor.forClass(Destination.class);
    verify(destinationRepository).save(destCaptor.capture());
    assertThat(destCaptor.getValue().getStatus()).isEqualTo("PUBLISHED");
    assertThat(destCaptor.getValue().getName()).isEqualTo("Làng đá Non Nước");
    assertThat(destCaptor.getValue().getVerifiedAt()).isNotNull();

    verify(auditLogService)
        .logAction(
            eq(modId),
            eq("APPROVE_DESTINATION_REQUEST"),
            eq("DESTINATION_REQUEST"),
            eq(reqId.toString()),
            any());
  }

  @Test
  @DisplayName("approveRequest UPDATE updates only non-blank fields on target Destination")
  void approveUpdateRequestUpdatesTargetDestination() {
    UUID reqId = UUID.randomUUID();
    UUID modId = UUID.randomUUID();
    UUID targetId = UUID.randomUUID();

    Destination target = new Destination();
    target.setId(targetId);
    target.setName("Bảo tàng Chăm");
    target.setSlug("bao-tang-cham");
    target.setDescription("Mô tả cũ");
    target.setPriceMin(new BigDecimal("40000"));
    target.setPriceMax(new BigDecimal("40000"));
    target.setStatus("PUBLISHED");

    DestinationRequest req = new DestinationRequest();
    req.setId(reqId);
    req.setRequestType("UPDATE");
    req.setTargetDestinationId(targetId);
    req.setSubmittedBy(UUID.randomUUID());
    req.setPriceMin(new BigDecimal("60000"));
    req.setPriceMax(new BigDecimal("60000"));
    req.setNote("Giá vé mới năm nay đã tăng lên 60.000đ");
    req.setStatus("PENDING");

    when(requestRepository.findById(reqId)).thenReturn(Optional.of(req));
    when(destinationRepository.findById(targetId)).thenReturn(Optional.of(target));
    when(destinationRepository.save(any(Destination.class))).thenAnswer(inv -> inv.getArgument(0));

    DestinationRequestDto result = service.approveRequest(reqId, modId, null);

    assertThat(result.status()).isEqualTo("APPROVED");
    assertThat(target.getName()).isEqualTo("Bảo tàng Chăm");
    assertThat(target.getDescription()).isEqualTo("Mô tả cũ");
    assertThat(target.getPriceMin()).isEqualByComparingTo("60000");
    assertThat(target.getPriceMax()).isEqualByComparingTo("60000");
    assertThat(target.getVerifiedAt()).isNotNull();
  }

  @Test
  @DisplayName("rejectRequest requires reason 10-500 chars and sets REJECTED")
  void rejectRequestSuccessAndValidation() {
    UUID reqId = UUID.randomUUID();
    UUID modId = UUID.randomUUID();

    assertThatThrownBy(() -> service.rejectRequest(reqId, modId, "Ngắn"))
        .isInstanceOf(IllegalArgumentException.class);

    DestinationRequest req = new DestinationRequest();
    req.setId(reqId);
    req.setRequestType("CREATE");
    req.setSubmittedBy(UUID.randomUUID());
    req.setStatus("PENDING");

    when(requestRepository.findById(reqId)).thenReturn(Optional.of(req));

    DestinationRequestDto rejected =
        service.rejectRequest(reqId, modId, "Tọa độ GPS chưa chính xác, vui lòng kiểm tra lại");

    assertThat(rejected.status()).isEqualTo("REJECTED");
    assertThat(rejected.rejectionReason())
        .isEqualTo("Tọa độ GPS chưa chính xác, vui lòng kiểm tra lại");
    verify(auditLogService)
        .logAction(
            eq(modId),
            eq("REJECT_DESTINATION_REQUEST"),
            eq("DESTINATION_REQUEST"),
            eq(reqId.toString()),
            any());
  }
}
