package com.vista.budget.application;

import com.vista.budget.api.dto.CreateExpenseRequest;
import com.vista.budget.api.dto.ExpenseResponse;
import com.vista.budget.api.dto.ExpenseSplitResponse;
import com.vista.budget.api.dto.SettlementAccountResponse;
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
import com.vista.user.domain.UserEntity;
import com.vista.user.infrastructure.UserRepository;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.Duration;
import java.time.Instant;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

@Service
@Transactional
public class ExpenseService {

  private static final BigDecimal MAX_EXPENSE_AMOUNT =
      new BigDecimal("1000000000000"); // 1,000 tỷ VND
  private static final BigDecimal MAX_BUDGET_TARGET =
      new BigDecimal("10000000000000"); // 10,000 tỷ VND

  private final TripAccessService tripAccessService;
  private final ExpenseRepository expenseRepository;
  private final ExpenseSplitRepository expenseSplitRepository;
  private final ExpenseCalculationService calculationService;
  private final AuditLogService auditLogService;
  private final UserRepository userRepository;

  @Autowired
  public ExpenseService(
      TripAccessService tripAccessService,
      ExpenseRepository expenseRepository,
      ExpenseSplitRepository expenseSplitRepository,
      ExpenseCalculationService calculationService,
      AuditLogService auditLogService,
      UserRepository userRepository) {
    this.tripAccessService = tripAccessService;
    this.expenseRepository = expenseRepository;
    this.expenseSplitRepository = expenseSplitRepository;
    this.calculationService = calculationService;
    this.auditLogService = auditLogService;
    this.userRepository = userRepository;
  }

  public ExpenseService(
      TripAccessService tripAccessService,
      ExpenseRepository expenseRepository,
      ExpenseSplitRepository expenseSplitRepository,
      ExpenseCalculationService calculationService) {
    this(
        tripAccessService,
        expenseRepository,
        expenseSplitRepository,
        calculationService,
        null,
        null);
  }

  public ExpenseService(
      TripAccessService tripAccessService,
      ExpenseRepository expenseRepository,
      ExpenseSplitRepository expenseSplitRepository,
      ExpenseCalculationService calculationService,
      AuditLogService auditLogService) {
    this(
        tripAccessService,
        expenseRepository,
        expenseSplitRepository,
        calculationService,
        auditLogService,
        null);
  }

  public ExpenseResponse createExpense(
      UUID tripId, UUID currentUserId, CreateExpenseRequest request) {
    Objects.requireNonNull(tripId, "tripId must not be null");
    Objects.requireNonNull(currentUserId, "currentUserId must not be null");
    Objects.requireNonNull(request, "request must not be null");

    // 1. Kiểm tra quyền ghi (Chỉ OWNER hoặc EDITOR đang ACTIVE, chặn VIEWER và outsider)
    tripAccessService.requireWriteAccess(tripId, currentUserId);

    validateCurrency(request.currency());
    validateAmount(request.amount());
    validateOccurredAt(request.occurredAt());
    validateParticipantIds(request.participantIds());

    UUID payerId = request.paidBy() != null ? request.paidBy() : currentUserId;
    requireExpenseMembers(
        tripId, payerId, request.participantIds(), request.exactShares(), currentUserId);
    ExpenseCategory category =
        request.category() != null ? request.category() : ExpenseCategory.OTHER;
    Instant occurredAt = request.occurredAt() != null ? request.occurredAt() : Instant.now();

    ExpenseEntity expense =
        new ExpenseEntity(
            tripId,
            request.title().trim(),
            request.amount().setScale(0, RoundingMode.UNNECESSARY),
            "VND",
            payerId,
            category,
            occurredAt);

    // 2. Tính toán phân chia chi phí
    String splitType = request.splitType() != null ? request.splitType() : "EQUAL";
    List<ExpenseSplitEntity> splits;
    try {
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
        throw new ResponseStatusException(
            HttpStatus.BAD_REQUEST, "Unsupported splitType: " + splitType);
      }
    } catch (IllegalArgumentException ex) {
      throw new ResponseStatusException(HttpStatus.BAD_REQUEST, ex.getMessage());
    }

    for (ExpenseSplitEntity split : splits) {
      expense.addSplit(split);
    }

    ExpenseEntity saved = expenseRepository.save(expense);

    if (auditLogService != null) {
      auditLogService.logAction(
          currentUserId,
          "EXPENSE_CREATED",
          "EXPENSE",
          saved.getId().toString(),
          String.format(
              "{\"tripId\":\"%s\",\"amount\":%s,\"currency\":\"%s\",\"category\":\"%s\"}",
              tripId, saved.getAmount(), saved.getCurrency(), saved.getCategory()));
    }

    return mapToResponse(saved);
  }

  public ExpenseResponse updateExpense(
      UUID tripId, UUID expenseId, UUID currentUserId, UpdateExpenseRequest request) {
    return updateExpense(tripId, expenseId, currentUserId, request, null);
  }

  public ExpenseResponse updateExpense(
      UUID tripId,
      UUID expenseId,
      UUID currentUserId,
      UpdateExpenseRequest request,
      Long expectedVersion) {
    Objects.requireNonNull(request, "request must not be null");
    if (!hasAnyChange(request)) {
      throw new ResponseStatusException(
          HttpStatus.BAD_REQUEST, "At least one expense field must be provided");
    }
    ExpenseEntity expense = findActiveExpense(tripId, expenseId);
    requireExpenseManager(tripId, currentUserId, expense);

    // Optimistic locking check
    Long targetVersion = expectedVersion != null ? expectedVersion : request.version();
    if (targetVersion != null && !Objects.equals(targetVersion, expense.getVersion())) {
      throw new ResponseStatusException(
          HttpStatus.CONFLICT,
          "Expense was modified by another user (expected version: "
              + targetVersion
              + ", current version: "
              + expense.getVersion()
              + ")");
    }

    if (request.currency() != null) {
      validateCurrency(request.currency());
    }
    if (request.amount() != null) {
      validateAmount(request.amount());
    }
    if (request.occurredAt() != null) {
      validateOccurredAt(request.occurredAt());
    }
    if (request.participantIds() != null) {
      validateParticipantIds(request.participantIds());
    }

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
      expense.setAmount(request.amount().setScale(0, RoundingMode.UNNECESSARY));
    }
    expense.setCurrency("VND");
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

    if (auditLogService != null) {
      auditLogService.logAction(
          currentUserId,
          "EXPENSE_UPDATED",
          "EXPENSE",
          expenseId.toString(),
          String.format(
              "{\"tripId\":\"%s\",\"amount\":%s,\"currency\":\"%s\",\"category\":\"%s\"}",
              tripId, updated.getAmount(), updated.getCurrency(), updated.getCategory()));
    }

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

    if (budgetTarget != null) {
      if (budgetTarget.compareTo(BigDecimal.ZERO) < 0) {
        throw new ResponseStatusException(
            HttpStatus.BAD_REQUEST, "Budget target must not be negative");
      }
      if (budgetTarget.compareTo(MAX_BUDGET_TARGET) > 0) {
        throw new ResponseStatusException(
            HttpStatus.BAD_REQUEST, "Budget target exceeds maximum limit (10,000,000,000,000 VND)");
      }
    }

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

  /**
   * Lấy thông tin tài khoản ngân hàng thụ hưởng phục vụ quyết toán (TV4). Chỉ các thành viên hợp lệ
   * của chuyến đi mới được phép truy cập. Chỉ trả về tài khoản của những thành viên thực sự cần
   * nhận tiền từ kết quả settlement.
   */
  @Transactional(readOnly = true)
  public List<SettlementAccountResponse> getSettlementAccounts(UUID tripId, UUID currentUserId) {
    tripAccessService.requireMember(tripId, currentUserId);

    TripExpenseSummaryResponse summary = getTripExpenseSummary(tripId, currentUserId, null);
    if (summary.suggestedTransfers() == null || summary.suggestedTransfers().isEmpty()) {
      return List.of();
    }

    Set<UUID> receiverIds =
        summary.suggestedTransfers().stream()
            .map(SettlementTransferResponse::toUserId)
            .collect(Collectors.toCollection(LinkedHashSet::new));

    if (receiverIds.isEmpty()) {
      return List.of();
    }

    List<UserEntity> receivers =
        userRepository != null ? userRepository.findAllById(receiverIds) : List.of();
    Map<UUID, UserEntity> userMap =
        receivers.stream().collect(Collectors.toMap(UserEntity::getId, u -> u));

    return receiverIds.stream()
        .map(
            id -> {
              UserEntity user = userMap.get(id);
              if (user == null) {
                return new SettlementAccountResponse(id, null, null, null, null, null);
              }
              return new SettlementAccountResponse(
                  user.getId(),
                  user.getDisplayName() != null ? user.getDisplayName() : user.getEmail(),
                  user.getBankCode(),
                  user.getBankBin(),
                  user.getBankAccountNumber(),
                  user.getBankAccountName());
            })
        .toList();
  }

  public void deleteExpense(UUID tripId, UUID expenseId, UUID currentUserId) {
    ExpenseEntity expense = findActiveExpense(tripId, expenseId);
    requireExpenseManager(tripId, currentUserId, expense);

    expense.setStatus("CANCELLED");
    ExpenseEntity saved = expenseRepository.save(expense);

    if (auditLogService != null) {
      auditLogService.logAction(
          currentUserId,
          "EXPENSE_DELETED",
          "EXPENSE",
          expenseId.toString(),
          String.format("{\"tripId\":\"%s\",\"status\":\"CANCELLED\"}", tripId));
    }
  }

  private void validateAmount(BigDecimal amount) {
    if (amount == null) {
      throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Amount is required");
    }
    if (amount.compareTo(BigDecimal.ZERO) <= 0) {
      throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Amount must be strictly positive");
    }
    if (amount.compareTo(MAX_EXPENSE_AMOUNT) > 0) {
      throw new ResponseStatusException(
          HttpStatus.BAD_REQUEST, "Amount exceeds maximum limit (1,000,000,000,000 VND)");
    }
    if (amount.stripTrailingZeros().scale() > 0) {
      throw new ResponseStatusException(
          HttpStatus.BAD_REQUEST, "Amount must be a whole VND amount without fractional cents");
    }
  }

  private void validateCurrency(String currency) {
    if (currency != null && !currency.trim().equalsIgnoreCase("VND")) {
      throw new ResponseStatusException(
          HttpStatus.BAD_REQUEST, "Only VND currency is supported. Provided: " + currency);
    }
  }

  private void validateOccurredAt(Instant occurredAt) {
    if (occurredAt != null && occurredAt.isAfter(Instant.now().plus(Duration.ofDays(30)))) {
      throw new ResponseStatusException(
          HttpStatus.BAD_REQUEST, "occurredAt cannot be more than 30 days in the future");
    }
  }

  private void validateParticipantIds(List<UUID> participantIds) {
    if (participantIds != null) {
      Set<UUID> unique = new HashSet<>();
      for (UUID id : participantIds) {
        if (id == null) {
          throw new ResponseStatusException(
              HttpStatus.BAD_REQUEST, "participantIds must not contain null");
        }
        if (!unique.add(id)) {
          throw new ResponseStatusException(
              HttpStatus.BAD_REQUEST, "participantIds must not contain duplicates");
        }
      }
    }
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
    try {
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
    } catch (IllegalArgumentException ex) {
      throw new ResponseStatusException(HttpStatus.BAD_REQUEST, ex.getMessage());
    }
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
        splitResponses,
        entity.getVersion());
  }

  @Transactional(readOnly = true)
  public boolean hasOutstandingDebts(UUID tripId) {
    Objects.requireNonNull(tripId, "tripId must not be null");

    List<ExpenseEntity> expenses =
        expenseRepository.findByTripIdAndStatusOrderByOccurredAtDesc(tripId, "ACTIVE");

    // Trạng thái 1: Chưa có khoản chi -> Không có công nợ
    if (expenses.isEmpty()) {
      return false;
    }

    // Trạng thái 2 & 3: Kiểm tra các khoản chia tiền (splits)
    // Nếu có split giữa thành viên khác người thanh toán và chưa SETTLED -> còn nợ
    boolean hasUnsettledSplit = false;
    for (ExpenseEntity exp : expenses) {
      UUID payerId = exp.getPaidBy();
      for (ExpenseSplitEntity split : exp.getSplits()) {
        if (!split.getUserId().equals(payerId)
            && !"SETTLED".equalsIgnoreCase(split.getSettledStatus())) {
          hasUnsettledSplit = true;
          break;
        }
      }
      if (hasUnsettledSplit) {
        break;
      }
    }

    if (hasUnsettledSplit) {
      return true;
    }

    // Kiểm tra thêm qua cán cân thanh toán (Min Cash Flow)
    Set<UUID> memberSet = new LinkedHashSet<>();
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

    return !transfers.isEmpty();
  }

  /**
   * Quyết toán toàn bộ các khoản chi tiêu trong chuyến đi (TV4).
   * Đánh dấu toàn bộ splits thành SETTLED.
   */
  public void settleAllTripExpenses(UUID tripId, UUID currentUserId) {
    tripAccessService.requireWriteAccess(tripId, currentUserId);
    List<ExpenseEntity> expenses =
        expenseRepository.findByTripIdAndStatusOrderByOccurredAtDesc(tripId, "ACTIVE");
    for (ExpenseEntity exp : expenses) {
      for (ExpenseSplitEntity split : exp.getSplits()) {
        split.setSettledStatus("SETTLED");
        expenseSplitRepository.save(split);
      }
    }
    if (auditLogService != null) {
      auditLogService.logAction(
          currentUserId,
          "EXPENSES_SETTLED",
          "TRIP",
          tripId.toString(),
          "{\"status\":\"FULLY_SETTLED\"}");
    }
  }
}
