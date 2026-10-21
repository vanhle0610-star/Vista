package com.vista.budget.application;

import com.vista.budget.api.dto.CreateExpenseRequest;
import com.vista.budget.api.dto.ExpenseResponse;
import com.vista.budget.api.dto.ExpenseSplitResponse;
import com.vista.budget.api.dto.SettlementTransferResponse;
import com.vista.budget.api.dto.TripExpenseSummaryResponse;
import com.vista.budget.domain.ExpenseCategory;
import com.vista.budget.domain.ExpenseEntity;
import com.vista.budget.domain.ExpenseSplitEntity;
import com.vista.budget.infrastructure.ExpenseRepository;
import com.vista.budget.infrastructure.ExpenseSplitRepository;
import com.vista.trip.application.TripAccessService;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.Instant;
import java.util.ArrayList;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Set;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

@Service
@Transactional
public class ExpenseService {

  private final TripAccessService tripAccessService;
  private final ExpenseRepository expenseRepository;
  private final ExpenseSplitRepository expenseSplitRepository;
  private final ExpenseCalculationService calculationService;

  public ExpenseService(
      TripAccessService tripAccessService,
      ExpenseRepository expenseRepository,
      ExpenseSplitRepository expenseSplitRepository,
      ExpenseCalculationService calculationService) {
    this.tripAccessService = tripAccessService;
    this.expenseRepository = expenseRepository;
    this.expenseSplitRepository = expenseSplitRepository;
    this.calculationService = calculationService;
  }

  public ExpenseResponse createExpense(
      UUID tripId, UUID currentUserId, CreateExpenseRequest request) {
    Objects.requireNonNull(tripId, "tripId must not be null");
    Objects.requireNonNull(currentUserId, "currentUserId must not be null");
    Objects.requireNonNull(request, "request must not be null");

    // 1. Kiểm tra quyền thành viên chuyến đi (403 Forbidden nếu không thuộc nhóm)
    tripAccessService.requireMember(tripId, currentUserId);

    UUID payerId = request.paidBy() != null ? request.paidBy() : currentUserId;
    ExpenseCategory category =
        request.category() != null ? request.category() : ExpenseCategory.OTHER;
    Instant occurredAt = request.occurredAt() != null ? request.occurredAt() : Instant.now();

    ExpenseEntity expense =
        new ExpenseEntity(
            tripId,
            request.title(),
            request.amount(),
            request.currency() != null ? request.currency() : "VND",
            payerId,
            category,
            occurredAt);

    // 2. Tính toán phân chia chi phí
    List<ExpenseSplitEntity> splits;
    if ("EXACT".equalsIgnoreCase(request.splitType())
        && request.exactShares() != null
        && !request.exactShares().isEmpty()) {
      splits = calculationService.createExactSplits(expense, request.exactShares());
    } else {
      List<UUID> participants =
          (request.participantIds() != null && !request.participantIds().isEmpty())
              ? request.participantIds()
              : List.of(payerId);
      splits = calculationService.createEqualSplits(expense, participants);
    }

    for (ExpenseSplitEntity split : splits) {
      expense.addSplit(split);
    }

    ExpenseEntity saved = expenseRepository.save(expense);
    return mapToResponse(saved);
  }

  @Transactional(readOnly = true)
  public List<ExpenseResponse> getTripExpenses(UUID tripId, UUID currentUserId) {
    tripAccessService.requireMember(tripId, currentUserId);

    List<ExpenseEntity> expenses =
        expenseRepository.findByTripIdAndStatusOrderByOccurredAtDesc(tripId, "ACTIVE");

    return expenses.stream().map(this::mapToResponse).toList();
  }

  @Transactional(readOnly = true)
  public TripExpenseSummaryResponse getTripExpenseSummary(
      UUID tripId, UUID currentUserId, BigDecimal budgetTarget) {
    tripAccessService.requireMember(tripId, currentUserId);

    List<ExpenseEntity> expenses =
        expenseRepository.findByTripIdAndStatusOrderByOccurredAtDesc(tripId, "ACTIVE");

    BigDecimal totalSpent = expenseRepository.sumAmountByTripId(tripId);
    if (totalSpent == null) {
      totalSpent = BigDecimal.ZERO;
    }

    // Thu thập danh sách tất cả thành viên có liên quan đến các khoản chi
    Set<UUID> memberSet = new LinkedHashSet<>();
    memberSet.add(currentUserId);
    for (ExpenseEntity exp : expenses) {
      memberSet.add(exp.getPaidBy());
      for (ExpenseSplitEntity split : exp.getSplits()) {
        memberSet.add(split.getUserId());
      }
    }

    List<UUID> memberList = new ArrayList<>(memberSet);
    Map<UUID, BigDecimal> balances =
        calculationService.calculateSettlementDeltas(expenses, memberList);

    List<SettlementTransferResponse> suggestedTransfers =
        calculationService.simplifyDebts(balances).stream()
            .map(t -> new SettlementTransferResponse(t.fromUserId(), t.toUserId(), t.amount()))
            .toList();

    BigDecimal remainingBudget = null;
    Integer spentPercentage = null;

    if (budgetTarget != null && budgetTarget.compareTo(BigDecimal.ZERO) > 0) {
      remainingBudget = budgetTarget.subtract(totalSpent);
      spentPercentage =
          totalSpent
              .multiply(BigDecimal.valueOf(100))
              .divide(budgetTarget, 0, RoundingMode.HALF_UP)
              .intValue();
    }

    return new TripExpenseSummaryResponse(
        tripId,
        totalSpent,
        budgetTarget,
        remainingBudget,
        spentPercentage,
        "VND",
        balances,
        suggestedTransfers);
  }

  public void deleteExpense(UUID tripId, UUID expenseId, UUID currentUserId) {
    tripAccessService.requireMember(tripId, currentUserId);

    ExpenseEntity expense =
        expenseRepository
            .findById(expenseId)
            .orElseThrow(
                () -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Expense not found"));

    if (!expense.getTripId().equals(tripId)) {
      throw new ResponseStatusException(
          HttpStatus.BAD_REQUEST, "Expense does not belong to the specified trip");
    }

    expense.setStatus("CANCELLED");
    expenseRepository.save(expense);
  }

  private ExpenseResponse mapToResponse(ExpenseEntity entity) {
    List<ExpenseSplitResponse> splitResponses =
        entity.getSplits().stream()
            .map(
                s ->
                    new ExpenseSplitResponse(
                        s.getId(), s.getUserId(), s.getShareAmount(), s.getSettledStatus()))
            .toList();

    return new ExpenseResponse(
        entity.getId(),
        entity.getTripId(),
        entity.getTitle(),
        entity.getAmount(),
        entity.getCurrency(),
        entity.getPaidBy(),
        entity.getCategory(),
        entity.getOccurredAt(),
        entity.getStatus(),
        entity.getCreatedAt(),
        splitResponses);
  }
}
