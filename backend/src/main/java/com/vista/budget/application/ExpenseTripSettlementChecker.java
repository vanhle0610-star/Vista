package com.vista.budget.application;

import com.vista.budget.domain.PaymentRequestStatus;
import com.vista.budget.infrastructure.ExpenseSplitRepository;
import com.vista.budget.infrastructure.SettlementPaymentRequestRepository;
import com.vista.trip.application.TripSettlementChecker;
import java.util.List;
import java.util.UUID;
import org.springframework.stereotype.Component;

@Component
public class ExpenseTripSettlementChecker implements TripSettlementChecker {

  private final ExpenseSplitRepository expenseSplitRepository;
  private final SettlementPaymentRequestRepository settlementPaymentRequestRepository;

  public ExpenseTripSettlementChecker(
      ExpenseSplitRepository expenseSplitRepository,
      SettlementPaymentRequestRepository settlementPaymentRequestRepository) {
    this.expenseSplitRepository = expenseSplitRepository;
    this.settlementPaymentRequestRepository = settlementPaymentRequestRepository;
  }

  @Override
  public boolean hasUnsettledDebts(UUID tripId) {
    if (tripId == null) {
      return false;
    }
    // 1. Kiểm tra xem có khoản phân chia chi phí (split) nào trong trip chưa được quyết toán (settledStatus != 'SETTLED')
    boolean hasUnsettledSplits = expenseSplitRepository.existsUnsettledSplitsByTripId(tripId);
    if (hasUnsettledSplits) {
      return true;
    }

    // 2. Kiểm tra xem có yêu cầu thanh toán bù trừ nào đang chờ xử lý (CREATED, OPENED, PAYER_MARKED_SENT)
    return settlementPaymentRequestRepository.existsByTripIdAndStatusIn(
        tripId,
        List.of(
            PaymentRequestStatus.CREATED,
            PaymentRequestStatus.OPENED,
            PaymentRequestStatus.PAYER_MARKED_SENT));
  }
}
