package com.vista.budget.api;

import com.vista.budget.api.dto.SettlementAccountResponse;
import com.vista.budget.application.ExpenseService;
import com.vista.common.security.CurrentUserProvider;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import java.util.List;
import java.util.UUID;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/trips/{tripId}/settlement-accounts")
@Tag(name = "Settlement Accounts", description = "Thông tin tài khoản nhận tiền quyết toán của thành viên (TV4)")
@SecurityRequirement(name = "bearerAuth")
public class TripSettlementController {

  private final ExpenseService expenseService;
  private final CurrentUserProvider currentUserProvider;

  public TripSettlementController(
      ExpenseService expenseService, CurrentUserProvider currentUserProvider) {
    this.expenseService = expenseService;
    this.currentUserProvider = currentUserProvider;
  }

  @GetMapping
  @Operation(summary = "Lấy thông tin tài khoản ngân hàng thụ hưởng phục vụ quyết toán (TV4)")
  public ResponseEntity<List<SettlementAccountResponse>> getSettlementAccounts(
      @PathVariable UUID tripId) {
    UUID currentUserId = currentUserProvider.getCurrentUserId();
    List<SettlementAccountResponse> accounts =
        expenseService.getSettlementAccounts(tripId, currentUserId);
    return ResponseEntity.ok(accounts);
  }
}
