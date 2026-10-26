package com.vista.budget.application;

import com.vista.budget.api.dto.CreateExpenseRequest;
import com.vista.budget.api.dto.ExpenseResponse;
import com.vista.budget.api.dto.ExpenseSplitResponse;
import com.vista.budget.api.dto.SettlementTransferResponse;
import com.vista.budget.api.dto.TripExpenseSummaryResponse;
import com.vista.budget.api.dto.UpdateExpenseRequest;
import com.vista.budget.domain.ExpenseCategory;
import com.vista.budget.domain.ExpenseEntity;
import com.vista.budget.domain.ExpenseSplitEntity;
import com.vista.budget.infrastructure.ExpenseRepository;
import com.vista.budget.infrastructure.ExpenseSplitRepository;
import com.vista.common.audit.AuditLogService;
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
  private final AuditLogService auditLogService;

  public ExpenseService(
      TripAccessService tripAccessService,
      ExpenseRepository expenseRepository,
      ExpenseSplitRepository expenseSplitRepository,
      ExpenseCalculationService calculationService,
      AuditLogService auditLogService) {
    this.tripAccessService = tripAccessService;
    this.expenseRepository = expenseRepository;
    this.expenseSplitRepository = expenseSplitRepository;
    this.calculationService = calculationService;
    this.auditLogService = auditLogService;
  }

  public ExpenseResponse createExpense(
      UUID tripId, UUID currentUserId, CreateExpenseRequest request) {
    Objects.requireNonNull(tripId, "tripId must not be null");
    Objects.requireNonNull(currentUserId, "currentUserId must not be null");
    Objects.requireNonNull(request, "request must not be null");

    // 1. Kiểm tra quyền ghi (Chỉ OWNER hoặc EDITOR đang ACTIVE, chặn VIEWER và outsider)
    tripAccessService.requireWriteAccess(tripId, currentUserId);

    UUID payerId = request.paidBy() != null ? request.paidBy() : currentUserId;
    requireExpenseMembers(
        tripId, payerId, request.participantIds(), request.exactShares(), currentUserId);
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
    String splitType = request.splitType() != null ? request.splitType() : "EQUAL";
    List<ExpenseSplitEntity> splits;
    if ("EXACT".equalsIgnoreCase(splitType)) {
      if (request.exactShares() == null || request.exactShares().isEmpty()) {
        throw new ResponseStatusException(
            HttpStatus.BAD_REQUEST, "EXACT split requires exactShares");
      }
      splits = calculationService.createExactSplits(expense, request.exactShares());
    } else if ("EQUAL".equalsIgnoreCase(splitType)) {
      List<UUID> participants =
          (request.participantIds() != null && !request.participantIds().isEmpty())
              ? request.participantIds()
              : List.of(payerId);
      splits = calculationService.createEqualSplits(expense, participants);
    } else {
      throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Unsupported splitType");
    }

    for (ExpenseSplitEntity split : splits) {
      expense.addSplit(split);
    }

    ExpenseEntity saved = expenseRepository.save(expense);

    auditLogService.logAction(
        currentUserId,
        "EXPENSE_CREATED",
        "EXPENSE",
        saved.getId().toString(),
        String.format(
            "{\"tripId\":\"%s\",\"amount\":%s,\"currency\":\"%s\",\"category\":\"%s\"}",
            tripId, saved.getAmount(), saved.getCurrency(), saved.getCategory()));

    return mapToResponse(saved);
  }

  public ExpenseResponse updateExpense(
      UUID tripId, UUID expenseId, UUID currentUserId, UpdateExpenseRequest request) {
    Objects.requireNonNull(request, "request must not be null");
    if (!hasAnyChange(request)) {
      throw new ResponseStatusException(
          HttpStatus.BAD_REQUEST, "At least one expense field must be provided");
    }
    ExpenseEntity expense = findActiveExpense(tripId, expenseId);
    requireExpenseManager(tripId, currentUserId, expense);

    UUID payerId = request.paidBy() != null ? request.paidBy() : expense.getPaidBy();
    requireExpenseMembers(
        tripId, payerId, request.participantIds(), request.exactShares(), currentUserId);

    if (request.title() != null) {
      String title = request.title().trim();
      if (title.isEmpty()) {
        throw new ResponseStatusException(
            HttpStatus.BAD_REQUEST, "Expense title must not be blank");
      }
      expense.setTitle(title);
    }
    if (request.amount() != null) {
      expense.setAmount(request.amount());
    }
    if (request.currency() != null) {
      expense.setCurrency(request.currency().toUpperCase());
    }
    expense.setPaidBy(payerId);
    if (request.category() != null) {
      expense.setCategory(request.category());
    }
    if (request.occurredAt() != null) {
      expense.setOccurredAt(request.occurredAt());
    }

    if (hasSplitUpdate(request)) {
      expense.replaceSplits(createUpdatedSplits(expense, request));
    } else if (request.amount() != null) {
      throw new ResponseStatusException(
          HttpStatus.BAD_REQUEST, "Changing amount requires split details");
    }

    ExpenseEntity updated = expenseRepository.save(expense);

    auditLogService.logAction(
        currentUserId,
        "EXPENSE_UPDATED",
        "EXPENSE",
        expenseId.toString(),
        String.format(
            "{\"tripId\":\"%s\",\"amount\":%s,\"currency\":\"%s\",\"category\":\"%s\"}",
            tripId, updated.getAmount(), updated.getCurrency(), updated.getCategory()));

    return mapToResponse(updated);
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
    ExpenseEntity expense = findActiveExpense(tripId, expenseId);
    requireExpenseManager(tripId, currentUserId, expense);

    expense.setStatus("CANCELLED");
    expenseRepository.save(expense);

    auditLogService.logAction(
        currentUserId,
        "EXPENSE_DELETED",
        "EXPENSE",
        expenseId.toString(),
        String.format("{\"tripId\":\"%s\",\"status\":\"CANCELLED\"}", tripId));
  }

  private ExpenseEntity findActiveExpense(UUID tripId, UUID expenseId) {
    ExpenseEntity expense =
        expenseRepository
            .findById(expenseId)
            .orElseThrow(
                () -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Expense not found"));
    if (!expense.getTripId().equals(tripId)) {
      throw new ResponseStatusException(
          HttpStatus.BAD_REQUEST, "Expense does not belong to the specified trip");
    }
    if (!"ACTIVE".equalsIgnoreCase(expense.getStatus())) {
      throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Expense not found");
    }
    return expense;
  }

  private void requireExpenseManager(UUID tripId, UUID currentUserId, ExpenseEntity expense) {
    // 1. Actor bắt buộc phải còn là ACTIVE member của trip
    tripAccessService.requireMember(tripId, currentUserId);

    // 2. Sau đó mới xét quyền Owner hoặc Paid-By
    if (!currentUserId.equals(expense.getPaidBy())
        && !tripAccessService.isOwner(tripId, currentUserId)) {
      throw new ResponseStatusException(
          HttpStatus.FORBIDDEN, "Only the payer or trip owner can modify this expense");
    }
  }

  private void requireExpenseMembers(
      UUID tripId,
      UUID payerId,
      List<UUID> participantIds,
      Map<UUID, BigDecimal> exactShares,
      UUID currentUserId) {
    LinkedHashSet<UUID> referencedUsers = new LinkedHashSet<>();
    referencedUsers.add(payerId);
    if (participantIds != null) {
      referencedUsers.addAll(participantIds);
    }
    if (exactShares != null) {
      referencedUsers.addAll(exactShares.keySet());
    }
    if (referencedUsers.contains(null)) {
      throw new ResponseStatusException(
          HttpStatus.BAD_REQUEST, "Expense members must not contain null");
    }
    referencedUsers.remove(currentUserId);
    referencedUsers.forEach(userId -> tripAccessService.requireMember(tripId, userId));
  }

  private boolean hasSplitUpdate(UpdateExpenseRequest request) {
    return request.splitType() != null
        || request.participantIds() != null
        || request.exactShares() != null;
  }

  private boolean hasAnyChange(UpdateExpenseRequest request) {
    return request.title() != null
        || request.amount() != null
        || request.currency() != null
        || request.paidBy() != null
        || request.category() != null
        || request.occurredAt() != null
        || hasSplitUpdate(request);
  }

  private List<ExpenseSplitEntity> createUpdatedSplits(
      ExpenseEntity expense, UpdateExpenseRequest request) {
    if ("EXACT".equalsIgnoreCase(request.splitType())) {
      if (request.exactShares() == null || request.exactShares().isEmpty()) {
        throw new ResponseStatusException(
            HttpStatus.BAD_REQUEST, "EXACT split requires exactShares");
      }
      return calculationService.createExactSplits(expense, request.exactShares());
    }
    if (request.splitType() != null && !"EQUAL".equalsIgnoreCase(request.splitType())) {
      throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Unsupported splitType");
    }
    if (request.participantIds() == null || request.participantIds().isEmpty()) {
      throw new ResponseStatusException(
          HttpStatus.BAD_REQUEST, "EQUAL split requires participantIds");
    }
    return calculationService.createEqualSplits(expense, request.participantIds());
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
