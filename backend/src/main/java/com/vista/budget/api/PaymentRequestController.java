package com.vista.budget.api;

import com.vista.budget.api.dto.CreatePaymentRequest;
import com.vista.budget.api.dto.PaymentRequestResponse;
import com.vista.budget.api.dto.UpdatePaymentRequestStatusRequest;
import com.vista.budget.application.PaymentRequestService;
import com.vista.common.security.CurrentUserProvider;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import java.util.List;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/trips/{tripId}/settlements/payment-requests")
@Tag(name = "Payment Requests", description = "Quản lý yêu cầu chuyển khoản quyết toán VietQR an toàn phía server (TV4)")
@SecurityRequirement(name = "bearerAuth")
public class PaymentRequestController {

  private final PaymentRequestService paymentRequestService;
  private final CurrentUserProvider currentUserProvider;

  public PaymentRequestController(
      PaymentRequestService paymentRequestService, CurrentUserProvider currentUserProvider) {
    this.paymentRequestService = paymentRequestService;
    this.currentUserProvider = currentUserProvider;
  }

  @GetMapping
  @Operation(summary = "Lấy danh sách các yêu cầu thanh toán quyết toán trong chuyến đi")
  public ResponseEntity<List<PaymentRequestResponse>> listPaymentRequests(@PathVariable UUID tripId) {
    UUID currentUserId = currentUserProvider.getCurrentUserId();
    return ResponseEntity.ok(paymentRequestService.listTripPaymentRequests(tripId, currentUserId));
  }

  @PostMapping
  @Operation(summary = "Tạo yêu cầu thanh toán VietQR an toàn được tính toán từ công nợ phía máy chủ")
  public ResponseEntity<PaymentRequestResponse> createPaymentRequest(
      @PathVariable UUID tripId, @Valid @RequestBody CreatePaymentRequest request) {
    UUID currentUserId = currentUserProvider.getCurrentUserId();
    PaymentRequestResponse created =
        paymentRequestService.createPaymentRequest(tripId, currentUserId, request);
    return ResponseEntity.status(HttpStatus.CREATED).body(created);
  }

  @GetMapping("/{requestId}")
  @Operation(summary = "Lấy chi tiết yêu cầu thanh toán quyết toán VietQR")
  public ResponseEntity<PaymentRequestResponse> getPaymentRequest(
      @PathVariable UUID tripId, @PathVariable UUID requestId) {
    UUID currentUserId = currentUserProvider.getCurrentUserId();
    return ResponseEntity.ok(
        paymentRequestService.getPaymentRequest(tripId, requestId, currentUserId));
  }

  @PatchMapping("/{requestId}/status")
  @Operation(summary = "Cập nhật trạng thái vòng đời yêu cầu thanh toán (Đã chuyển / Đã nhận / Hủy)")
  public ResponseEntity<PaymentRequestResponse> updateStatus(
      @PathVariable UUID tripId,
      @PathVariable UUID requestId,
      @Valid @RequestBody UpdatePaymentRequestStatusRequest request) {
    UUID currentUserId = currentUserProvider.getCurrentUserId();
    PaymentRequestResponse updated =
        paymentRequestService.updateStatus(tripId, requestId, currentUserId, request);
    return ResponseEntity.ok(updated);
  }
}
