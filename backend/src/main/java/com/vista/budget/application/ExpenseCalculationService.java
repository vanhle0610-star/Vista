package com.vista.budget.application;

import com.vista.budget.domain.ExpenseEntity;
import com.vista.budget.domain.ExpenseSplitEntity;
import com.vista.budget.util.VndSplitCalculator;
import com.vista.budget.util.VndSplitCalculator.SplitResult;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.PriorityQueue;
import java.util.UUID;
import org.springframework.stereotype.Service;

/**
 * Service xử lý tính toán phân chia chi phí chuyến đi và cân bằng công nợ (Settlement Delta). Sử
 * dụng nguyên lý tiền tệ số nguyên VND (zero-penny error) và giải thuật tối ưu hóa luồng thanh
 * toán.
 */
@Service
public class ExpenseCalculationService {

  public record SettlementTransfer(UUID fromUserId, UUID toUserId, BigDecimal amount) {
    public SettlementTransfer {
      Objects.requireNonNull(fromUserId, "fromUserId must not be null");
      Objects.requireNonNull(toUserId, "toUserId must not be null");
      Objects.requireNonNull(amount, "amount must not be null");
      if (amount.compareTo(BigDecimal.ZERO) <= 0) {
        throw new IllegalArgumentException("transfer amount must be strictly positive");
      }
    }
  }

  /** Tạo danh sách phân chia đều (Equal Split) cho một khoản chi tiêu. */
  public List<ExpenseSplitEntity> createEqualSplits(
      ExpenseEntity expense, List<UUID> participantIds) {
    Objects.requireNonNull(expense, "expense must not be null");
    Objects.requireNonNull(participantIds, "participantIds must not be null");

    List<SplitResult> results =
        VndSplitCalculator.calculateEqualSplit(
            expense.getAmount(), expense.getPaidBy(), participantIds);

    List<ExpenseSplitEntity> splitEntities = new ArrayList<>();
    for (SplitResult res : results) {
      ExpenseSplitEntity entity = new ExpenseSplitEntity(expense, res.userId(), res.amount());
      splitEntities.add(entity);
    }
    return splitEntities;
  }

  /** Tạo danh sách phân chia theo số tiền chỉ định (Exact Split). */
  public List<ExpenseSplitEntity> createExactSplits(
      ExpenseEntity expense, Map<UUID, BigDecimal> exactShares) {
    Objects.requireNonNull(expense, "expense must not be null");
    VndSplitCalculator.validateExactSplit(expense.getAmount(), exactShares);

    List<ExpenseSplitEntity> splitEntities = new ArrayList<>();
    for (Map.Entry<UUID, BigDecimal> entry : exactShares.entrySet()) {
      BigDecimal normalizedShare = entry.getValue().setScale(0, RoundingMode.HALF_UP);
      ExpenseSplitEntity entity = new ExpenseSplitEntity(expense, entry.getKey(), normalizedShare);
      splitEntities.add(entity);
    }
    return splitEntities;
  }

  /**
   * Tính toán cán cân thanh toán (Settlement Delta) cho từng thành viên trong chuyến đi. Delta
   * dương (+): Người này đã trả nhiều hơn phần mình dùng (Chủ nợ, được nhận tiền). Delta âm (-):
   * Người này đã dùng nhiều hơn phần mình đã trả (Con nợ, cần trả tiền). Delta = 0: Cân bằng.
   */
  public Map<UUID, BigDecimal> calculateSettlementDeltas(
      List<ExpenseEntity> expenses, List<UUID> allMemberIds) {
    Objects.requireNonNull(expenses, "expenses must not be null");
    Objects.requireNonNull(allMemberIds, "allMemberIds must not be null");

    Map<UUID, BigDecimal> balances = new LinkedHashMap<>();
    for (UUID memberId : allMemberIds) {
      balances.put(memberId, BigDecimal.ZERO.setScale(0));
    }

    for (ExpenseEntity exp : expenses) {
      if (!"ACTIVE".equalsIgnoreCase(exp.getStatus())) {
        continue;
      }
      BigDecimal expenseAmount = exp.getAmount().setScale(0, RoundingMode.HALF_UP);
      UUID payerId = exp.getPaidBy();

      // Payer được cộng toàn bộ số tiền đã trả trước
      balances.compute(
          payerId, (id, curr) -> curr == null ? expenseAmount : curr.add(expenseAmount));

      // Mỗi người tham gia bị trừ đi phần chi phí của họ
      for (ExpenseSplitEntity split : exp.getSplits()) {
        UUID participantId = split.getUserId();
        BigDecimal share = split.getShareAmount().setScale(0, RoundingMode.HALF_UP);
        balances.compute(
            participantId, (id, curr) -> curr == null ? share.negate() : curr.subtract(share));
      }
    }

    // Kiểm tra bất biến Zero-Sum: Tổng tất cả số dư phải triệt tiêu về 0
    BigDecimal sumBalances = balances.values().stream().reduce(BigDecimal.ZERO, BigDecimal::add);
    if (sumBalances.compareTo(BigDecimal.ZERO) != 0) {
      throw new IllegalStateException(
          "Invariant violated: sum of settlement deltas must be 0, but was: " + sumBalances);
    }

    return balances;
  }

  /**
   * Thuật toán giảm thiểu số lượng giao dịch chuyển khoản (Min Cash Flow Algorithm). Giúp nhóm giải
   * quyết công nợ với số lần chuyển tiền ít nhất có thể.
   */
  public List<SettlementTransfer> simplifyDebts(Map<UUID, BigDecimal> balances) {
    Objects.requireNonNull(balances, "balances must not be null");

    record MemberBalance(UUID userId, BigDecimal amount) {}

    // Priority queue cho chủ nợ (Creditors: amount > 0, xếp giảm dần)
    PriorityQueue<MemberBalance> creditors =
        new PriorityQueue<>((a, b) -> b.amount().compareTo(a.amount()));

    // Priority queue cho con nợ (Debtors: amount < 0, lấy giá trị tuyệt đối xếp giảm dần)
    PriorityQueue<MemberBalance> debtors =
        new PriorityQueue<>((a, b) -> b.amount().abs().compareTo(a.amount().abs()));

    for (Map.Entry<UUID, BigDecimal> entry : balances.entrySet()) {
      BigDecimal val = entry.getValue().setScale(0, RoundingMode.HALF_UP);
      if (val.compareTo(BigDecimal.ZERO) > 0) {
        creditors.offer(new MemberBalance(entry.getKey(), val));
      } else if (val.compareTo(BigDecimal.ZERO) < 0) {
        debtors.offer(new MemberBalance(entry.getKey(), val));
      }
    }

    List<SettlementTransfer> transfers = new ArrayList<>();

    while (!creditors.isEmpty() && !debtors.isEmpty()) {
      MemberBalance topCreditor = creditors.poll();
      MemberBalance topDebtor = debtors.poll();

      BigDecimal debtAmount = topDebtor.amount().abs();
      BigDecimal creditAmount = topCreditor.amount();

      BigDecimal settledAmount = debtAmount.min(creditAmount);

      transfers.add(
          new SettlementTransfer(topDebtor.userId(), topCreditor.userId(), settledAmount));

      BigDecimal remainingCredit = creditAmount.subtract(settledAmount);
      BigDecimal remainingDebt = debtAmount.subtract(settledAmount);

      if (remainingCredit.compareTo(BigDecimal.ZERO) > 0) {
        creditors.offer(new MemberBalance(topCreditor.userId(), remainingCredit));
      }
      if (remainingDebt.compareTo(BigDecimal.ZERO) > 0) {
        debtors.offer(new MemberBalance(topDebtor.userId(), remainingDebt.negate()));
      }
    }

    return transfers;
  }
}
