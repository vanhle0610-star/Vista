package com.vista.budget.application;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.doNothing;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.vista.budget.api.dto.CreateExpenseRequest;
import com.vista.budget.api.dto.ExpenseResponse;
import com.vista.budget.api.dto.TripExpenseSummaryResponse;
import com.vista.budget.application.ExpenseCalculationService.SettlementTransfer;
import com.vista.budget.domain.ExpenseCategory;
import com.vista.budget.domain.ExpenseEntity;
import com.vista.budget.domain.ExpenseSplitEntity;
import com.vista.budget.infrastructure.ExpenseRepository;
import com.vista.budget.infrastructure.ExpenseSplitRepository;
import com.vista.trip.application.TripAccessService;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.web.server.ResponseStatusException;

@ExtendWith(MockitoExtension.class)
class ExpenseServiceTest {

  @Mock private TripAccessService tripAccessService;
  @Mock private ExpenseRepository expenseRepository;
  @Mock private ExpenseSplitRepository expenseSplitRepository;
  @Mock private ExpenseCalculationService calculationService;

  @InjectMocks private ExpenseService expenseService;

  private UUID tripId;
  private UUID currentUserId;
  private UUID partnerId;

  @BeforeEach
  void setUp() {
    tripId = UUID.randomUUID();
    currentUserId = UUID.randomUUID();
    partnerId = UUID.randomUUID();
  }

  @Test
  @DisplayName("1. Tạo khoản chi tiêu chia đều thành công")
  void createExpense_equalSplit_success() {
    CreateExpenseRequest request =
        new CreateExpenseRequest(
            "Cà phê muối Hội An",
            BigDecimal.valueOf(60000),
            "VND",
            currentUserId,
            ExpenseCategory.FOOD,
            Instant.now(),
            "EQUAL",
            List.of(currentUserId, partnerId),
            null);

    doNothing().when(tripAccessService).requireMember(tripId, currentUserId);

    List<ExpenseSplitEntity> splits =
        List.of(
            new ExpenseSplitEntity(null, currentUserId, BigDecimal.valueOf(30000)),
            new ExpenseSplitEntity(null, partnerId, BigDecimal.valueOf(30000)));

    when(calculationService.createEqualSplits(any(ExpenseEntity.class), eq(List.of(currentUserId, partnerId))))
        .thenReturn(splits);

    when(expenseRepository.save(any(ExpenseEntity.class)))
        .thenAnswer(invocation -> invocation.getArgument(0));

    ExpenseResponse response = expenseService.createExpense(tripId, currentUserId, request);

    assertThat(response).isNotNull();
    assertThat(response.title()).isEqualTo("Cà phê muối Hội An");
    assertThat(response.amount()).isEqualByComparingTo(BigDecimal.valueOf(60000));
    assertThat(response.splits()).hasSize(2);

    verify(tripAccessService).requireMember(tripId, currentUserId);
    verify(expenseRepository).save(any(ExpenseEntity.class));
  }

  @Test
  @DisplayName("2. Tạo khoản chi tiêu chia chỉ định (EXACT) thành công")
  void createExpense_exactSplit_success() {
    Map<UUID, BigDecimal> exactShares =
        Map.of(
            currentUserId, BigDecimal.valueOf(150000),
            partnerId, BigDecimal.valueOf(250000));

    CreateExpenseRequest request =
        new CreateExpenseRequest(
            "Vé tham quan Ngũ Hành Sơn",
            BigDecimal.valueOf(400000),
            "VND",
            currentUserId,
            ExpenseCategory.ACTIVITIES,
            Instant.now(),
            "EXACT",
            null,
            exactShares);

    doNothing().when(tripAccessService).requireMember(tripId, currentUserId);

    List<ExpenseSplitEntity> splits =
        List.of(
            new ExpenseSplitEntity(null, currentUserId, BigDecimal.valueOf(150000)),
            new ExpenseSplitEntity(null, partnerId, BigDecimal.valueOf(250000)));

    when(calculationService.createExactSplits(any(ExpenseEntity.class), eq(exactShares)))
        .thenReturn(splits);

    when(expenseRepository.save(any(ExpenseEntity.class)))
        .thenAnswer(invocation -> invocation.getArgument(0));

    ExpenseResponse response = expenseService.createExpense(tripId, currentUserId, request);

    assertThat(response).isNotNull();
    assertThat(response.title()).isEqualTo("Vé tham quan Ngũ Hành Sơn");
    assertThat(response.amount()).isEqualByComparingTo(BigDecimal.valueOf(400000));
    assertThat(response.splits()).hasSize(2);

    verify(calculationService).createExactSplits(any(ExpenseEntity.class), eq(exactShares));
  }

  @Test
  @DisplayName("3. Từ chối tạo khoản chi khi người dùng không thuộc chuyến đi (403 Forbidden)")
  void createExpense_nonMember_throwsAccessDenied() {
    CreateExpenseRequest request =
        new CreateExpenseRequest(
            "Taxi sân bay",
            BigDecimal.valueOf(120000),
            "VND",
            currentUserId,
            ExpenseCategory.TRANSPORT,
            Instant.now(),
            "EQUAL",
            null,
            null);

    doThrow(new AccessDeniedException("User is not a member of trip " + tripId))
        .when(tripAccessService)
        .requireMember(tripId, currentUserId);

    assertThatThrownBy(() -> expenseService.createExpense(tripId, currentUserId, request))
        .isInstanceOf(AccessDeniedException.class)
        .hasMessageContaining("not a member");

    verify(expenseRepository, never()).save(any());
  }

  @Test
  @DisplayName("4. Lấy danh sách các khoản chi tiêu đang hoạt động")
  void getTripExpenses_success() {
    ExpenseEntity exp =
        new ExpenseEntity(
            tripId,
            "Khách sạn Biển Mỹ Khê",
            BigDecimal.valueOf(1200000),
            "VND",
            currentUserId,
            ExpenseCategory.ACCOMMODATION,
            Instant.now());

    when(expenseRepository.findByTripIdAndStatusOrderByOccurredAtDesc(tripId, "ACTIVE"))
        .thenReturn(List.of(exp));

    List<ExpenseResponse> results = expenseService.getTripExpenses(tripId, currentUserId);

    assertThat(results).hasSize(1);
    assertThat(results.get(0).title()).isEqualTo("Khách sạn Biển Mỹ Khê");
    verify(tripAccessService).requireMember(tripId, currentUserId);
  }

  @Test
  @DisplayName("5. Tính toán tổng quan ngân sách và cán cân thanh toán (Settlement Deltas)")
  void getTripExpenseSummary_withBudgetTarget_calculatesMetricsAndTransfers() {
    ExpenseEntity exp =
        new ExpenseEntity(
            tripId,
            "Hải sản Bà Rô",
            BigDecimal.valueOf(1000000),
            "VND",
            currentUserId,
            ExpenseCategory.FOOD,
            Instant.now());

    ExpenseSplitEntity split1 = new ExpenseSplitEntity(exp, currentUserId, BigDecimal.valueOf(500000));
    ExpenseSplitEntity split2 = new ExpenseSplitEntity(exp, partnerId, BigDecimal.valueOf(500000));
    exp.addSplit(split1);
    exp.addSplit(split2);

    when(expenseRepository.findByTripIdAndStatusOrderByOccurredAtDesc(tripId, "ACTIVE"))
        .thenReturn(List.of(exp));
    when(expenseRepository.sumAmountByTripId(tripId))
        .thenReturn(BigDecimal.valueOf(1000000));

    Map<UUID, BigDecimal> balances =
        Map.of(
            currentUserId, BigDecimal.valueOf(500000),
            partnerId, BigDecimal.valueOf(-500000));
    when(calculationService.calculateSettlementDeltas(eq(List.of(exp)), any()))
        .thenReturn(balances);

    List<SettlementTransfer> transfers =
        List.of(new SettlementTransfer(partnerId, currentUserId, BigDecimal.valueOf(500000)));
    when(calculationService.simplifyDebts(balances)).thenReturn(transfers);

    BigDecimal budgetTarget = BigDecimal.valueOf(5000000);
    TripExpenseSummaryResponse summary =
        expenseService.getTripExpenseSummary(tripId, currentUserId, budgetTarget);

    assertThat(summary.totalSpent()).isEqualByComparingTo(BigDecimal.valueOf(1000000));
    assertThat(summary.budgetTotal()).isEqualByComparingTo(BigDecimal.valueOf(5000000));
    assertThat(summary.remainingBudget()).isEqualByComparingTo(BigDecimal.valueOf(4000000));
    assertThat(summary.spentPercentage()).isEqualTo(20);
    assertThat(summary.suggestedTransfers()).hasSize(1);
    assertThat(summary.suggestedTransfers().get(0).amount())
        .isEqualByComparingTo(BigDecimal.valueOf(500000));
  }

  @Test
  @DisplayName("6. Xóa mềm (CANCELLED) khoản chi tiêu thành công")
  void deleteExpense_success() {
    UUID expenseId = UUID.randomUUID();
    ExpenseEntity exp =
        new ExpenseEntity(
            tripId,
            "Trà sữa",
            BigDecimal.valueOf(50000),
            "VND",
            currentUserId,
            ExpenseCategory.FOOD,
            Instant.now());

    when(expenseRepository.findById(expenseId)).thenReturn(Optional.of(exp));

    expenseService.deleteExpense(tripId, expenseId, currentUserId);

    assertThat(exp.getStatus()).isEqualTo("CANCELLED");
    verify(expenseRepository).save(exp);
  }

  @Test
  @DisplayName("7. Báo lỗi 404 khi khoản chi không tồn tại")
  void deleteExpense_notFound_throws404() {
    UUID expenseId = UUID.randomUUID();
    when(expenseRepository.findById(expenseId)).thenReturn(Optional.empty());

    assertThatThrownBy(() -> expenseService.deleteExpense(tripId, expenseId, currentUserId))
        .isInstanceOf(ResponseStatusException.class)
        .matches(e -> ((ResponseStatusException) e).getStatusCode() == HttpStatus.NOT_FOUND);
  }

  @Test
  @DisplayName("8. Báo lỗi 400 khi khoản chi không thuộc về chuyến đi chỉ định")
  void deleteExpense_wrongTrip_throws400() {
    UUID expenseId = UUID.randomUUID();
    UUID anotherTripId = UUID.randomUUID();
    ExpenseEntity exp =
        new ExpenseEntity(
            anotherTripId,
            "Vé cano Cù Lao Chàm",
            BigDecimal.valueOf(350000),
            "VND",
            currentUserId,
            ExpenseCategory.TRANSPORT,
            Instant.now());

    when(expenseRepository.findById(expenseId)).thenReturn(Optional.of(exp));

    assertThatThrownBy(() -> expenseService.deleteExpense(tripId, expenseId, currentUserId))
        .isInstanceOf(ResponseStatusException.class)
        .matches(e -> ((ResponseStatusException) e).getStatusCode() == HttpStatus.BAD_REQUEST);
  }
}
