package com.vista.budget.api;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.vista.budget.api.dto.CreatePaymentRequest;
import com.vista.budget.api.dto.PaymentRequestResponse;
import com.vista.budget.api.dto.UpdatePaymentRequestStatusRequest;
import com.vista.budget.application.PaymentRequestService;
import com.vista.budget.domain.PaymentRequestStatus;
import com.vista.common.security.CurrentUserProvider;
import com.vista.common.security.SecurityConfiguration;
import com.vista.common.web.GlobalExceptionHandler;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

@WebMvcTest(PaymentRequestController.class)
@Import({GlobalExceptionHandler.class, SecurityConfiguration.class})
@WithMockUser
class PaymentRequestControllerTest {

  @Autowired private MockMvc mockMvc;
  private final ObjectMapper objectMapper = new ObjectMapper().findAndRegisterModules();

  @MockitoBean private PaymentRequestService paymentRequestService;
  @MockitoBean private CurrentUserProvider currentUserProvider;

  private UUID tripId;
  private UUID currentUserId;

  @BeforeEach
  void setUp() {
    tripId = UUID.randomUUID();
    currentUserId = UUID.randomUUID();
    when(currentUserProvider.getCurrentUserId()).thenReturn(currentUserId);
  }

  @Test
  @DisplayName("1. Lấy danh sách payment requests trong chuyến đi thành công")
  void listPaymentRequests_shouldReturn200() throws Exception {
    PaymentRequestResponse response =
        new PaymentRequestResponse(
            UUID.randomUUID(),
            tripId,
            currentUserId,
            "Payer",
            UUID.randomUUID(),
            "Recipient",
            BigDecimal.valueOf(150000),
            "VND",
            "VISTA THANHTOAN",
            "qr-content",
            "https://img.vietqr.io/image/MB-0382404099-compact2.png",
            "MB",
            "******4099",
            "TRẦN VÂN ÁNH",
            "idem-key-1",
            PaymentRequestStatus.CREATED,
            Instant.now().plusSeconds(3600),
            Instant.now(),
            Instant.now(),
            0L);

    when(paymentRequestService.listTripPaymentRequests(eq(tripId), eq(currentUserId)))
        .thenReturn(List.of(response));

    mockMvc
        .perform(get("/api/v1/trips/{tripId}/settlements/payment-requests", tripId))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$[0].bankCode").value("MB"))
        .andExpect(jsonPath("$[0].maskedAccountNumber").value("******4099"))
        .andExpect(jsonPath("$[0].amount").value(150000));
  }

  @Test
  @DisplayName("2. Tạo payment request mới thành công - 201 Created")
  void createPaymentRequest_shouldReturn201() throws Exception {
    UUID recipientId = UUID.randomUUID();
    CreatePaymentRequest req = new CreatePaymentRequest(recipientId, "idempotency-key-xyz", "Ăn tối");

    PaymentRequestResponse response =
        new PaymentRequestResponse(
            UUID.randomUUID(),
            tripId,
            currentUserId,
            "Payer",
            recipientId,
            "Recipient",
            BigDecimal.valueOf(250000),
            "VND",
            "VISTA THANHTOAN",
            "qr-content",
            "https://img.vietqr.io/image/MB-0382404099-compact2.png",
            "MB",
            "******4099",
            "TRẦN VÂN ÁNH",
            "idempotency-key-xyz",
            PaymentRequestStatus.CREATED,
            Instant.now().plusSeconds(3600),
            Instant.now(),
            Instant.now(),
            0L);

    when(paymentRequestService.createPaymentRequest(eq(tripId), eq(currentUserId), any()))
        .thenReturn(response);

    mockMvc
        .perform(
            post("/api/v1/trips/{tripId}/settlements/payment-requests", tripId)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(req)))
        .andExpect(status().isCreated())
        .andExpect(jsonPath("$.amount").value(250000))
        .andExpect(jsonPath("$.recipientAccountName").value("TRẦN VÂN ÁNH"));
  }

  @Test
  @DisplayName("3. Cập nhật trạng thái payment request thành công - 200 OK")
  void updateStatus_shouldReturn200() throws Exception {
    UUID reqId = UUID.randomUUID();
    UpdatePaymentRequestStatusRequest statusReq =
        new UpdatePaymentRequestStatusRequest(PaymentRequestStatus.PAYER_MARKED_SENT, 0L, "Đã ck");

    PaymentRequestResponse response =
        new PaymentRequestResponse(
            reqId,
            tripId,
            currentUserId,
            "Payer",
            UUID.randomUUID(),
            "Recipient",
            BigDecimal.valueOf(250000),
            "VND",
            "VISTA THANHTOAN",
            "qr-content",
            "https://img.vietqr.io/image/MB-0382404099-compact2.png",
            "MB",
            "******4099",
            "TRẦN VÂN ÁNH",
            "idempotency-key-xyz",
            PaymentRequestStatus.PAYER_MARKED_SENT,
            Instant.now().plusSeconds(3600),
            Instant.now(),
            Instant.now(),
            1L);

    when(paymentRequestService.updateStatus(eq(tripId), eq(reqId), eq(currentUserId), any()))
        .thenReturn(response);

    mockMvc
        .perform(
            patch("/api/v1/trips/{tripId}/settlements/payment-requests/{requestId}/status", tripId, reqId)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(statusReq)))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.status").value("PAYER_MARKED_SENT"));
  }
}
