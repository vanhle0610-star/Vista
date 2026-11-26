package com.vista.budget.application;

import com.vista.budget.infrastructure.ExpenseSplitRepository;
import com.vista.budget.infrastructure.SettlementPaymentRequestRepository;
import com.vista.trip.application.TripSettlementChecker;
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
    // 1. Kiểm tra xem có khoản phân chia chi phí (split) nào trong trip chưa được quyết toán
    // (settledStatus != 'SETTLED')
    boolean hasUnsettledSplits = expenseSplitRepository.existsUnsettledSplitsByTripId(tripId);
    if (hasUnsettledSplits) {
      return true;
    }

    // 2. Chặn xóa khi yêu cầu thanh toán bù trừ còn ở trạng thái chưa kết thúc.
    return settlementPaymentRequestRepository.existsPendingSettlementRequestsByTripId(tripId);
  }
}
