package com.vista.budget.api;

import com.vista.budget.api.dto.CreateExpenseRequest;
import com.vista.budget.api.dto.ExpenseResponse;
import com.vista.budget.api.dto.TripExpenseSummaryResponse;
import com.vista.budget.api.dto.UpdateExpenseRequest;
import com.vista.budget.application.ExpenseService;
import com.vista.common.security.CurrentUserProvider;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import java.math.BigDecimal;
import java.util.List;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/trips/{tripId}/expenses")
@Tag(name = "Expenses", description = "Quản lý chi phí chuyến đi và phân chia chi phí (BF-04, TV4)")
@SecurityRequirement(name = "bearerAuth")
public class ExpenseController {

  private final ExpenseService expenseService;
  private final CurrentUserProvider currentUserProvider;

  public ExpenseController(ExpenseService expenseService, CurrentUserProvider currentUserProvider) {
    this.expenseService = expenseService;
    this.currentUserProvider = currentUserProvider;
  }

  @GetMapping
  @Operation(summary = "Lấy danh sách các khoản chi tiêu của chuyến đi (FR-EXP-01)")
  public ResponseEntity<List<ExpenseResponse>> listTripExpenses(@PathVariable UUID tripId) {
    UUID currentUserId = currentUserProvider.getCurrentUserId();
    List<ExpenseResponse> expenses = expenseService.getTripExpenses(tripId, currentUserId);
    return ResponseEntity.ok(expenses);
  }

  @PostMapping
  @Operation(summary = "Ghi nhận một khoản chi tiêu mới cho chuyến đi (FR-EXP-01)")
  public ResponseEntity<ExpenseResponse> createTripExpense(
      @PathVariable UUID tripId, @Valid @RequestBody CreateExpenseRequest request) {
    UUID currentUserId = currentUserProvider.getCurrentUserId();
    ExpenseResponse created = expenseService.createExpense(tripId, currentUserId, request);
    return ResponseEntity.status(HttpStatus.CREATED).body(created);
  }

  @PatchMapping("/{expenseId}")
  @Operation(summary = "Cập nhật một khoản chi tiêu của chuyến đi (FR-EXP-02)")
  public ResponseEntity<ExpenseResponse> updateTripExpense(
      @PathVariable UUID tripId,
      @PathVariable UUID expenseId,
      @Valid @RequestBody UpdateExpenseRequest request) {
    UUID currentUserId = currentUserProvider.getCurrentUserId();
    ExpenseResponse updated =
        expenseService.updateExpense(tripId, expenseId, currentUserId, request);
    return ResponseEntity.ok(updated);
  }

  @DeleteMapping("/{expenseId}")
  @ResponseStatus(HttpStatus.NO_CONTENT)
  @Operation(summary = "Hủy một khoản chi tiêu của chuyến đi (FR-EXP-02)")
  public void deleteTripExpense(@PathVariable UUID tripId, @PathVariable UUID expenseId) {
    UUID currentUserId = currentUserProvider.getCurrentUserId();
    expenseService.deleteExpense(tripId, expenseId, currentUserId);
  }

  @GetMapping("/summary")
  @Operation(
      summary = "Lấy tổng quan ngân sách và cán cân thanh toán (Settlement Delta) (FR-EXP-03)")
  public ResponseEntity<TripExpenseSummaryResponse> getTripExpenseSummary(
      @PathVariable UUID tripId, @RequestParam(required = false) BigDecimal budgetTarget) {
    UUID currentUserId = currentUserProvider.getCurrentUserId();
    TripExpenseSummaryResponse summary =
        expenseService.getTripExpenseSummary(tripId, currentUserId, budgetTarget);
    return ResponseEntity.ok(summary);
  }
}
