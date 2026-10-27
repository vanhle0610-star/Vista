package com.vista.budget.application;

import com.vista.budget.api.dto.CreatePaymentRequest;
import com.vista.budget.api.dto.PaymentRequestResponse;
import com.vista.budget.api.dto.UpdatePaymentRequestStatusRequest;
import com.vista.budget.domain.ExpenseEntity;
import com.vista.budget.domain.ExpenseSplitEntity;
import com.vista.budget.domain.PaymentRequestStatus;
import com.vista.budget.domain.PayoutAccountEntity;
import com.vista.budget.domain.SettlementPaymentRequestEntity;
import com.vista.budget.infrastructure.ExpenseRepository;
import com.vista.budget.infrastructure.SettlementPaymentRequestRepository;
import com.vista.common.audit.AuditLogService;
import com.vista.trip.application.TripAccessService;
import com.vista.user.domain.UserEntity;
import com.vista.user.infrastructure.UserRepository;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

@Service
@Transactional
public class PaymentRequestService {

  private static final Logger log = LoggerFactory.getLogger(PaymentRequestService.class);

  private final SettlementPaymentRequestRepository requestRepository;
  private final PayoutAccountService payoutAccountService;
  private final ExpenseRepository expenseRepository;
  private final ExpenseCalculationService calculationService;
  private final TripAccessService tripAccessService;
  private final UserRepository userRepository;
  private final AuditLogService auditLogService;

  public PaymentRequestService(
      SettlementPaymentRequestRepository requestRepository,
      PayoutAccountService payoutAccountService,
      ExpenseRepository expenseRepository,
      ExpenseCalculationService calculationService,
      TripAccessService tripAccessService,
      UserRepository userRepository,
      AuditLogService auditLogService) {
    this.requestRepository = requestRepository;
    this.payoutAccountService = payoutAccountService;
    this.expenseRepository = expenseRepository;
    this.calculationService = calculationService;
    this.tripAccessService = tripAccessService;
    this.userRepository = userRepository;
    this.auditLogService = auditLogService;
  }

  public PaymentRequestResponse createPaymentRequest(
      UUID tripId, UUID currentUserId, CreatePaymentRequest request) {
    Objects.requireNonNull(tripId, "tripId must not be null");
    Objects.requireNonNull(currentUserId, "currentUserId must not be null");
    Objects.requireNonNull(request, "request must not be null");

    // 1. Xác thực thành viên chuyến đi
    tripAccessService.requireMember(tripId, currentUserId);
    UUID recipientId = request.toUserId();
    if (currentUserId.equals(recipientId)) {
      throw new ResponseStatusException(
          HttpStatus.BAD_REQUEST, "Không thể tạo yêu cầu thanh toán cho chính mình.");
    }
    tripAccessService.requireMember(tripId, recipientId);

    // 2. Chống double-submit / Idempotency check
    String idempotencyKey = request.idempotencyKey().trim();
    Optional<SettlementPaymentRequestEntity> existing =
        requestRepository.findByTripIdAndPayerIdAndRecipientIdAndIdempotencyKey(
            tripId, currentUserId, recipientId, idempotencyKey);
    if (existing.isPresent()) {
      SettlementPaymentRequestEntity existingReq = existing.get();
      return toResponse(existingReq);
    }

    // 3. Tính toán lại nợ từ cơ sở dữ liệu server (KHÔNG tin client amount)
    BigDecimal calculatedDebt = calculateServerSideDebt(tripId, currentUserId, recipientId);
    if (calculatedDebt.compareTo(BigDecimal.ZERO) <= 0) {
      throw new ResponseStatusException(
          HttpStatus.BAD_REQUEST,
          "Không phát hiện khoản công nợ cần thanh toán giữa hai thành viên này.");
    }

    // 4. Xác nhận người nhận có PayoutAccount VERIFIED
    PayoutAccountEntity recipientAccount =
        payoutAccountService
            .getVerifiedAccountForRecipient(recipientId)
            .orElseThrow(
                () ->
                    new ResponseStatusException(
                        HttpStatus.BAD_REQUEST,
                        "Người nhận chưa thiết lập tài khoản nhận tiền đã xác minh."));

    // 5. Tạo memo an toàn không chứa ký tự điều khiển
    String tripShort = tripId.toString().substring(0, 8).toUpperCase();
    String customMemo =
        (request.memo() != null && !request.memo().isBlank())
            ? request.memo().trim().replaceAll("[^a-zA-Z0-9 ]", "")
            : "THANHTOAN";
    if (customMemo.length() > 20) {
      customMemo = customMemo.substring(0, 20);
    }
    String safeMemo = ("VISTA " + tripShort + " " + customMemo).trim();

    // 6. Tạo URL VietQR an toàn theo thông tin tài khoản thật đã xác minh
    String encodedMemo = URLEncoder.encode(safeMemo, StandardCharsets.UTF_8);
    String encodedAccountName =
        URLEncoder.encode(recipientAccount.getAccountName(), StandardCharsets.UTF_8);
    String qrImageUrl =
        String.format(
            "https://img.vietqr.io/image/%s-%s-compact2.png?amount=%s&addInfo=%s&accountName=%s",
            recipientAccount.getBankCode(),
            recipientAccount.getAccountNumber(),
            calculatedDebt.toPlainString(),
            encodedMemo,
            encodedAccountName);

    String qrContent =
        String.format(
            "vietqr://transfer?bank=%s&account=%s&amount=%s&memo=%s",
            recipientAccount.getBankCode(),
            recipientAccount.getAccountNumber(),
            calculatedDebt.toPlainString(),
            encodedMemo);

    Instant now = Instant.now();
    Instant expiresAt = now.plus(24, ChronoUnit.HOURS);

    SettlementPaymentRequestEntity entity =
        new SettlementPaymentRequestEntity(
            tripId,
            currentUserId,
            recipientId,
            recipientAccount.getId(),
            calculatedDebt,
            safeMemo,
            qrContent,
            qrImageUrl,
            recipientAccount.getBankCode(),
            recipientAccount.getMaskedAccountNumber(),
            recipientAccount.getAccountName(),
            idempotencyKey,
            expiresAt);

    SettlementPaymentRequestEntity saved = requestRepository.save(entity);

    // Audit log
    auditLogService.logAction(
        currentUserId,
        "SETTLEMENT_PAYMENT_REQUEST_CREATED",
        "SETTLEMENT_PAYMENT_REQUEST",
        saved.getId().toString(),
        String.format(
            "Tạo yêu cầu thanh toán %s VND gửi tới %s (%s)",
            calculatedDebt.toPlainString(),
            saved.getRecipientAccountName(),
            saved.getMaskedAccountNumber()));

    return toResponse(saved);
  }

  public PaymentRequestResponse updateStatus(
      UUID tripId,
      UUID requestId,
      UUID currentUserId,
      UpdatePaymentRequestStatusRequest request) {
    Objects.requireNonNull(tripId, "tripId must not be null");
    Objects.requireNonNull(requestId, "requestId must not be null");
    Objects.requireNonNull(currentUserId, "currentUserId must not be null");
    Objects.requireNonNull(request, "request must not be null");

    tripAccessService.requireMember(tripId, currentUserId);

    SettlementPaymentRequestEntity entity =
        requestRepository
            .findById(requestId)
            .orElseThrow(
                () ->
                    new ResponseStatusException(
                        HttpStatus.NOT_FOUND, "Không tìm thấy yêu cầu thanh toán."));

    if (!entity.getTripId().equals(tripId)) {
      throw new ResponseStatusException(
          HttpStatus.BAD_REQUEST, "Yêu cầu thanh toán không thuộc chuyến đi này.");
    }

    // Optimistic locking check
    if (request.version() != null && !entity.getVersion().equals(request.version())) {
      throw new ResponseStatusException(
          HttpStatus.CONFLICT,
          "Yêu cầu thanh toán đã bị thay đổi bởi người khác. Vui lòng tải lại trang.");
    }

    Instant now = Instant.now();
    if (entity.getStatus() != PaymentRequestStatus.RECIPIENT_CONFIRMED
        && entity.getStatus() != PaymentRequestStatus.CANCELLED
        && entity.getExpiresAt().isBefore(now)) {
      entity.setStatus(PaymentRequestStatus.EXPIRED);
    }

    PaymentRequestStatus target = request.status();
    PaymentRequestStatus current = entity.getStatus();

    if (current == PaymentRequestStatus.RECIPIENT_CONFIRMED
        || current == PaymentRequestStatus.CANCELLED
        || current == PaymentRequestStatus.EXPIRED) {
      throw new ResponseStatusException(
          HttpStatus.CONFLICT,
          "Không thể thay đổi trạng thái của yêu cầu thanh toán đã kết thúc (" + current + ").");
    }

    // Authorization & lifecycle state machine rules:
    // - Payer only can mark PAYER_MARKED_SENT or CANCELLED
    // - Recipient only can mark RECIPIENT_CONFIRMED
    // - Any participant can mark OPENED
    if (target == PaymentRequestStatus.OPENED) {
      if (current == PaymentRequestStatus.CREATED) {
        entity.setStatus(PaymentRequestStatus.OPENED);
      }
    } else if (target == PaymentRequestStatus.PAYER_MARKED_SENT) {
      if (!currentUserId.equals(entity.getPayerId())) {
        throw new ResponseStatusException(
            HttpStatus.FORBIDDEN, "Chỉ người trả tiền mới có quyền đánh dấu 'Đã chuyển khoản'.");
      }
      entity.setStatus(PaymentRequestStatus.PAYER_MARKED_SENT);
    } else if (target == PaymentRequestStatus.RECIPIENT_CONFIRMED) {
      if (!currentUserId.equals(entity.getRecipientId())) {
        throw new ResponseStatusException(
            HttpStatus.FORBIDDEN, "Chỉ người nhận tiền mới có quyền xác nhận 'Đã nhận được tiền'.");
      }
      entity.setStatus(PaymentRequestStatus.RECIPIENT_CONFIRMED);
    } else if (target == PaymentRequestStatus.CANCELLED) {
      if (!currentUserId.equals(entity.getPayerId()) && !currentUserId.equals(entity.getRecipientId())) {
        throw new ResponseStatusException(
            HttpStatus.FORBIDDEN, "Bạn không có quyền hủy yêu cầu thanh toán này.");
      }
      entity.setStatus(PaymentRequestStatus.CANCELLED);
    } else {
      throw new ResponseStatusException(
          HttpStatus.BAD_REQUEST, "Trạng thái thanh toán không hợp lệ: " + target);
    }

    SettlementPaymentRequestEntity saved = requestRepository.save(entity);

    auditLogService.logAction(
        currentUserId,
        "SETTLEMENT_PAYMENT_STATUS_UPDATED",
        "SETTLEMENT_PAYMENT_REQUEST",
        saved.getId().toString(),
        String.format(
            "Cập nhật trạng thái từ %s sang %s (ghi chú: %s)",
            current, saved.getStatus(), request.note() != null ? request.note() : "Không có"));

    return toResponse(saved);
  }

  @Transactional(readOnly = true)
  public List<PaymentRequestResponse> listTripPaymentRequests(UUID tripId, UUID currentUserId) {
    Objects.requireNonNull(tripId, "tripId must not be null");
    Objects.requireNonNull(currentUserId, "currentUserId must not be null");
    tripAccessService.requireMember(tripId, currentUserId);

    return requestRepository.findUserRequestsInTrip(tripId, currentUserId).stream()
        .map(this::toResponse)
        .toList();
  }

  @Transactional(readOnly = true)
  public PaymentRequestResponse getPaymentRequest(UUID tripId, UUID requestId, UUID currentUserId) {
    Objects.requireNonNull(tripId, "tripId must not be null");
    Objects.requireNonNull(requestId, "requestId must not be null");
    Objects.requireNonNull(currentUserId, "currentUserId must not be null");
    tripAccessService.requireMember(tripId, currentUserId);

    SettlementPaymentRequestEntity entity =
        requestRepository
            .findById(requestId)
            .orElseThrow(
                () ->
                    new ResponseStatusException(
                        HttpStatus.NOT_FOUND, "Không tìm thấy yêu cầu thanh toán."));

    if (!entity.getTripId().equals(tripId)) {
      throw new ResponseStatusException(
          HttpStatus.BAD_REQUEST, "Yêu cầu thanh toán không thuộc chuyến đi này.");
    }

    return toResponse(entity);
  }

  private BigDecimal calculateServerSideDebt(UUID tripId, UUID payerId, UUID recipientId) {
    List<ExpenseEntity> expenses =
        expenseRepository.findByTripIdAndStatusOrderByOccurredAtDesc(tripId, "ACTIVE");

    Set<UUID> memberSet = new LinkedHashSet<>();
    memberSet.add(payerId);
    memberSet.add(recipientId);
    for (ExpenseEntity exp : expenses) {
      memberSet.add(exp.getPaidBy());
      for (ExpenseSplitEntity split : exp.getSplits()) {
        memberSet.add(split.getUserId());
      }
    }

    List<UUID> memberList = new ArrayList<>(memberSet);
    Map<UUID, BigDecimal> balances =
        calculationService.calculateSettlementDeltas(expenses, memberList);

    List<ExpenseCalculationService.SettlementTransfer> transfers =
        calculationService.simplifyDebts(balances);

    for (ExpenseCalculationService.SettlementTransfer transfer : transfers) {
      if (transfer.fromUserId().equals(payerId) && transfer.toUserId().equals(recipientId)) {
        return transfer.amount().setScale(0, RoundingMode.HALF_UP);
      }
    }

    // Direct net debt check if not explicitly in simplified greedy path
    BigDecimal payerBalance = balances.getOrDefault(payerId, BigDecimal.ZERO);
    BigDecimal recipientBalance = balances.getOrDefault(recipientId, BigDecimal.ZERO);
    if (payerBalance.compareTo(BigDecimal.ZERO) < 0 && recipientBalance.compareTo(BigDecimal.ZERO) > 0) {
      BigDecimal maxDebtPayable = payerBalance.abs().min(recipientBalance);
      return maxDebtPayable.setScale(0, RoundingMode.HALF_UP);
    }

    return BigDecimal.ZERO;
  }

  private PaymentRequestResponse toResponse(SettlementPaymentRequestEntity entity) {
    UserEntity payer = userRepository.findById(entity.getPayerId()).orElse(null);
    UserEntity recipient = userRepository.findById(entity.getRecipientId()).orElse(null);

    return new PaymentRequestResponse(
        entity.getId(),
        entity.getTripId(),
        entity.getPayerId(),
        payer != null ? payer.getDisplayName() : "Thành viên VISTA",
        entity.getRecipientId(),
        recipient != null ? recipient.getDisplayName() : entity.getRecipientAccountName(),
        entity.getAmount(),
        entity.getCurrency(),
        entity.getMemo(),
        entity.getQrContent(),
        entity.getQrImageUrl(),
        entity.getBankCode(),
        entity.getMaskedAccountNumber(),
        entity.getRecipientAccountName(),
        entity.getIdempotencyKey(),
        entity.getStatus(),
        entity.getExpiresAt(),
        entity.getCreatedAt(),
        entity.getUpdatedAt(),
        entity.getVersion());
  }
}
