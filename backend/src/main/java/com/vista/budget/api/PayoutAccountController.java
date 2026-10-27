package com.vista.budget.api;

import com.vista.budget.api.dto.CreatePayoutAccountRequest;
import com.vista.budget.api.dto.PayoutAccountResponse;
import com.vista.budget.application.PayoutAccountService;
import com.vista.common.security.CurrentUserProvider;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import java.util.List;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/users/me/payout-accounts")
@Tag(name = "Payout Accounts", description = "Quản lý tài khoản ngân hàng nhận tiền quyết toán VietQR (TV4)")
@SecurityRequirement(name = "bearerAuth")
public class PayoutAccountController {

  private final PayoutAccountService payoutAccountService;
  private final CurrentUserProvider currentUserProvider;

  public PayoutAccountController(
      PayoutAccountService payoutAccountService, CurrentUserProvider currentUserProvider) {
    this.payoutAccountService = payoutAccountService;
    this.currentUserProvider = currentUserProvider;
  }

  @GetMapping
  @Operation(summary = "Lấy danh sách tài khoản nhận tiền của người dùng hiện tại (số tài khoản được mask)")
  public ResponseEntity<List<PayoutAccountResponse>> listAccounts() {
    UUID currentUserId = currentUserProvider.getCurrentUserId();
    return ResponseEntity.ok(payoutAccountService.listAccounts(currentUserId));
  }

  @PostMapping
  @Operation(summary = "Liên kết tài khoản ngân hàng nhận tiền mới (yêu cầu xác thực tài khoản thật)")
  public ResponseEntity<PayoutAccountResponse> createAccount(
      @Valid @RequestBody CreatePayoutAccountRequest request) {
    UUID currentUserId = currentUserProvider.getCurrentUserId();
    PayoutAccountResponse created = payoutAccountService.createAccount(currentUserId, request, true);
    return ResponseEntity.status(HttpStatus.CREATED).body(created);
  }

  @PutMapping("/{accountId}/default")
  @Operation(summary = "Đặt tài khoản chỉ định làm tài khoản nhận tiền mặc định")
  public ResponseEntity<PayoutAccountResponse> setDefaultAccount(@PathVariable UUID accountId) {
    UUID currentUserId = currentUserProvider.getCurrentUserId();
    return ResponseEntity.ok(payoutAccountService.setDefaultAccount(currentUserId, accountId));
  }

  @DeleteMapping("/{accountId}")
  @ResponseStatus(HttpStatus.NO_CONTENT)
  @Operation(summary = "Xóa tài khoản nhận tiền đã liên kết")
  public void deleteAccount(@PathVariable UUID accountId) {
    UUID currentUserId = currentUserProvider.getCurrentUserId();
    payoutAccountService.deleteAccount(currentUserId, accountId);
  }
}
