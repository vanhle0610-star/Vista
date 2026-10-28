package com.vista.budget.application;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.vista.budget.api.dto.CreatePaymentRequest;
import com.vista.budget.api.dto.PaymentRequestResponse;
import com.vista.budget.api.dto.UpdatePaymentRequestStatusRequest;
import com.vista.budget.domain.ExpenseCategory;
import com.vista.budget.domain.ExpenseEntity;
import com.vista.budget.domain.ExpenseSplitEntity;
import com.vista.budget.domain.PaymentRequestStatus;
import com.vista.budget.domain.PayoutAccountEntity;
import com.vista.budget.domain.PayoutVerificationStatus;
import com.vista.budget.domain.SettlementPaymentRequestEntity;
import com.vista.budget.infrastructure.ExpenseRepository;
import com.vista.budget.infrastructure.SettlementPaymentRequestRepository;
import com.vista.common.audit.AuditLogService;
import com.vista.trip.application.TripAccessService;
import com.vista.user.domain.UserEntity;
import com.vista.user.infrastructure.UserRepository;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.web.server.ResponseStatusException;

class PaymentRequestServiceTest {

  private SettlementPaymentRequestRepository requestRepository;
  private PayoutAccountService payoutAccountService;
  private ExpenseRepository expenseRepository;
  private ExpenseCalculationService calculationService;
  private TripAccessService tripAccessService;
  private UserRepository userRepository;
  private AuditLogService auditLogService;
  private PaymentRequestService service;

  private UUID tripId;
  private UUID payerId;
  private UUID recipientId;

  @BeforeEach
  void setUp() {
    requestRepository = mock(SettlementPaymentRequestRepository.class);
    payoutAccountService = mock(PayoutAccountService.class);
    expenseRepository = mock(ExpenseRepository.class);
    calculationService = new ExpenseCalculationService();
    tripAccessService = mock(TripAccessService.class);
    userRepository = mock(UserRepository.class);
    auditLogService = mock(AuditLogService.class);

    service =
        new PaymentRequestService(
            requestRepository,
            payoutAccountService,
            expenseRepository,
            calculationService,
            tripAccessService,
            userRepository,
            auditLogService);

    tripId = UUID.randomUUID();
    payerId = UUID.randomUUID();
    recipientId = UUID.randomUUID();
  }

  @Test
  @DisplayName("1. Không có payout account verified -> ném lỗi không tạo QR")
  void createPaymentRequest_throwsWhenNoVerifiedPayoutAccount() {
    CreatePaymentRequest request =
        new CreatePaymentRequest(recipientId, "idem-key-12345", "Tiền ăn trưa");

    // Recipient paid 200,000 for both payer and recipient (payer owes 100,000)
    ExpenseEntity expense =
        new ExpenseEntity(
            tripId,
            "Ăn trưa",
            BigDecimal.valueOf(200000),
            "VND",
            recipientId,
            ExpenseCategory.FOOD,
            Instant.now());
    expense.addSplit(new ExpenseSplitEntity(expense, recipientId, BigDecimal.valueOf(100000)));
    expense.addSplit(new ExpenseSplitEntity(expense, payerId, BigDecimal.valueOf(100000)));

    when(expenseRepository.findByTripIdAndStatusOrderByOccurredAtDesc(tripId, "ACTIVE"))
        .thenReturn(List.of(expense));
    when(payoutAccountService.getVerifiedAccountForRecipient(recipientId))
        .thenReturn(Optional.empty());

    assertThatThrownBy(() -> service.createPaymentRequest(tripId, payerId, request))
        .isInstanceOf(ResponseStatusException.class)
        .hasMessageContaining("Người nhận chưa thiết lập tài khoản nhận tiền đã xác minh");
  }

  @Test
  @DisplayName("2. Có payout account verified -> tạo payment request với số tiền server tính")
  void createPaymentRequest_successWithServerCalculatedDebt() {
    CreatePaymentRequest request =
        new CreatePaymentRequest(recipientId, "idem-key-67890", "Tiền ăn trưa");

    ExpenseEntity expense =
        new ExpenseEntity(
            tripId,
            "Ăn trưa",
            BigDecimal.valueOf(200000),
            "VND",
            recipientId,
            ExpenseCategory.FOOD,
            Instant.now());
    expense.addSplit(new ExpenseSplitEntity(expense, recipientId, BigDecimal.valueOf(100000)));
    expense.addSplit(new ExpenseSplitEntity(expense, payerId, BigDecimal.valueOf(100000)));

    PayoutAccountEntity verifiedAccount =
        new PayoutAccountEntity(
            recipientId,
            "MB",
            "0382404099",
            "TRẦN VÂN ÁNH",
            true,
            PayoutVerificationStatus.VERIFIED);
    verifiedAccount.setId(UUID.randomUUID());

    when(expenseRepository.findByTripIdAndStatusOrderByOccurredAtDesc(tripId, "ACTIVE"))
        .thenReturn(List.of(expense));
    when(payoutAccountService.getVerifiedAccountForRecipient(recipientId))
        .thenReturn(Optional.of(verifiedAccount));
    when(requestRepository.save(any(SettlementPaymentRequestEntity.class)))
        .thenAnswer(inv -> inv.getArgument(0));

    UserEntity payerUser = new UserEntity("Payer", "payer@example.com", "hash");
    UserEntity recipientUser = new UserEntity("Recipient", "rec@example.com", "hash");
    when(userRepository.findById(payerId)).thenReturn(Optional.of(payerUser));
    when(userRepository.findById(recipientId)).thenReturn(Optional.of(recipientUser));

    PaymentRequestResponse response = service.createPaymentRequest(tripId, payerId, request);

    assertThat(response).isNotNull();
    assertThat(response.amount()).isEqualByComparingTo(BigDecimal.valueOf(100000));
    assertThat(response.bankCode()).isEqualTo("MB");
    assertThat(response.maskedAccountNumber()).isEqualTo("******4099");
    assertThat(response.recipientAccountName()).isEqualTo("TRẦN VÂN ÁNH");
    assertThat(response.qrImageUrl()).contains("MB-0382404099-compact2.png");
    assertThat(response.status()).isEqualTo(PaymentRequestStatus.CREATED);

    verify(auditLogService)
        .logAction(eq(payerId), eq("SETTLEMENT_PAYMENT_REQUEST_CREATED"), any(), any(), any());
  }

  @Test
  @DisplayName(
      "3. Trạng thái thanh toán: Payer đánh dấu PAYER_MARKED_SENT, Recipient xác nhận RECIPIENT_CONFIRMED")
  void updateStatus_lifecycleTransitions() {
    UUID reqId = UUID.randomUUID();
    SettlementPaymentRequestEntity entity =
        new SettlementPaymentRequestEntity(
            tripId,
            payerId,
            recipientId,
            UUID.randomUUID(),
            BigDecimal.valueOf(100000),
            "VISTA THANHTOAN",
            "qr",
            "http://qr",
            "MB",
            "******4099",
            "TRẦN VÂN ÁNH",
            "idem-key-abc",
            Instant.now().plusSeconds(3600));
    entity.setId(reqId);
    entity.setVersion(0L);

    when(requestRepository.findById(reqId)).thenReturn(Optional.of(entity));
    when(requestRepository.save(any(SettlementPaymentRequestEntity.class)))
        .thenAnswer(inv -> inv.getArgument(0));

    // Payer marks sent
    UpdatePaymentRequestStatusRequest payerReq =
        new UpdatePaymentRequestStatusRequest(
            PaymentRequestStatus.PAYER_MARKED_SENT, 0L, "Đã ck qua app");
    PaymentRequestResponse sentRes = service.updateStatus(tripId, reqId, payerId, payerReq);
    assertThat(sentRes.status()).isEqualTo(PaymentRequestStatus.PAYER_MARKED_SENT);

    // Recipient confirms
    UpdatePaymentRequestStatusRequest recReq =
        new UpdatePaymentRequestStatusRequest(
            PaymentRequestStatus.RECIPIENT_CONFIRMED, 0L, "Đã nhận đủ");
    PaymentRequestResponse confRes = service.updateStatus(tripId, reqId, recipientId, recReq);
    assertThat(confRes.status()).isEqualTo(PaymentRequestStatus.RECIPIENT_CONFIRMED);
  }

  @Test
  @DisplayName("4. Người lạ không thể xác nhận hoặc đổi trạng thái -> 403 Forbidden")
  void updateStatus_forbiddenForNonParticipants() {
    UUID reqId = UUID.randomUUID();
    UUID strangerId = UUID.randomUUID();
    SettlementPaymentRequestEntity entity =
        new SettlementPaymentRequestEntity(
            tripId,
            payerId,
            recipientId,
            UUID.randomUUID(),
            BigDecimal.valueOf(100000),
            "VISTA THANHTOAN",
            "qr",
            "http://qr",
            "MB",
            "******4099",
            "TRẦN VÂN ÁNH",
            "idem-key-abc",
            Instant.now().plusSeconds(3600));

    when(requestRepository.findById(reqId)).thenReturn(Optional.of(entity));

    UpdatePaymentRequestStatusRequest req =
        new UpdatePaymentRequestStatusRequest(PaymentRequestStatus.RECIPIENT_CONFIRMED, 0L, "Hack");

    assertThatThrownBy(() -> service.updateStatus(tripId, reqId, strangerId, req))
        .isInstanceOf(ResponseStatusException.class)
        .hasMessageContaining("Chỉ người nhận tiền mới có quyền");
  }
}
