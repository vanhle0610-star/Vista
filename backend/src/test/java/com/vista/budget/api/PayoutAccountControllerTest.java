package com.vista.budget.api;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyBoolean;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.doNothing;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.vista.budget.api.dto.CreatePayoutAccountRequest;
import com.vista.budget.api.dto.PayoutAccountResponse;
import com.vista.budget.application.PayoutAccountService;
import com.vista.budget.domain.PayoutVerificationStatus;
import com.vista.common.security.CurrentUserProvider;
import com.vista.common.security.SecurityConfiguration;
import com.vista.common.web.GlobalExceptionHandler;
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

@WebMvcTest(PayoutAccountController.class)
@Import({GlobalExceptionHandler.class, SecurityConfiguration.class})
@WithMockUser
class PayoutAccountControllerTest {

  @Autowired private MockMvc mockMvc;
  private final ObjectMapper objectMapper = new ObjectMapper().findAndRegisterModules();

  @MockitoBean private PayoutAccountService payoutAccountService;
  @MockitoBean private CurrentUserProvider currentUserProvider;

  private UUID currentUserId;

  @BeforeEach
  void setUp() {
    currentUserId = UUID.randomUUID();
    when(currentUserProvider.getCurrentUserId()).thenReturn(currentUserId);
  }

  @Test
  @DisplayName("1. Lấy danh sách payout account thành công - số tài khoản được mask")
  void listAccounts_shouldReturnMasked() throws Exception {
    PayoutAccountResponse resp =
        new PayoutAccountResponse(
            UUID.randomUUID(),
            currentUserId,
            "MB",
            "******4099",
            "0382404099",
            "TRẦN VÂN ÁNH",
            true,
            PayoutVerificationStatus.VERIFIED,
            Instant.now(),
            Instant.now());

    when(payoutAccountService.listAccounts(eq(currentUserId))).thenReturn(List.of(resp));

    mockMvc
        .perform(get("/api/v1/users/me/payout-accounts"))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$[0].bankCode").value("MB"))
        .andExpect(jsonPath("$[0].maskedAccountNumber").value("******4099"))
        .andExpect(jsonPath("$[0].accountName").value("TRẦN VÂN ÁNH"))
        .andExpect(jsonPath("$[0].verificationStatus").value("VERIFIED"));
  }

  @Test
  @DisplayName("2. Thêm payout account mới thành công")
  void createAccount_shouldReturn201() throws Exception {
    CreatePayoutAccountRequest request =
        new CreatePayoutAccountRequest("TCB", "19034567890123", "NGUYỄN VĂN A", true);

    PayoutAccountResponse resp =
        new PayoutAccountResponse(
            UUID.randomUUID(),
            currentUserId,
            "TCB",
            "******0123",
            "19034567890123",
            "NGUYỄN VĂN A",
            true,
            PayoutVerificationStatus.VERIFIED,
            Instant.now(),
            Instant.now());

    when(payoutAccountService.createAccount(eq(currentUserId), any(), anyBoolean()))
        .thenReturn(resp);

    mockMvc
        .perform(
            post("/api/v1/users/me/payout-accounts")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(request)))
        .andExpect(status().isCreated())
        .andExpect(jsonPath("$.bankCode").value("TCB"))
        .andExpect(jsonPath("$.maskedAccountNumber").value("******0123"));
  }

  @Test
  @DisplayName("3. Đặt tài khoản mặc định thành công")
  void setDefaultAccount_shouldReturn200() throws Exception {
    UUID accId = UUID.randomUUID();
    PayoutAccountResponse resp =
        new PayoutAccountResponse(
            accId,
            currentUserId,
            "TCB",
            "******0123",
            "19034567890123",
            "NGUYỄN VĂN A",
            true,
            PayoutVerificationStatus.VERIFIED,
            Instant.now(),
            Instant.now());

    when(payoutAccountService.setDefaultAccount(eq(currentUserId), eq(accId))).thenReturn(resp);

    mockMvc
        .perform(put("/api/v1/users/me/payout-accounts/{accountId}/default", accId))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.isDefault").value(true));
  }

  @Test
  @DisplayName("4. Xóa tài khoản thành công")
  void deleteAccount_shouldReturn204() throws Exception {
    UUID accId = UUID.randomUUID();
    doNothing().when(payoutAccountService).deleteAccount(eq(currentUserId), eq(accId));

    mockMvc
        .perform(delete("/api/v1/users/me/payout-accounts/{accountId}", accId))
        .andExpect(status().isNoContent());
  }
}
