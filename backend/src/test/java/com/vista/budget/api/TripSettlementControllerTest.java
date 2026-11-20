package com.vista.budget.api;

import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.vista.budget.api.dto.SettlementAccountResponse;
import com.vista.budget.application.ExpenseService;
import com.vista.common.security.CurrentUserProvider;
import com.vista.common.security.SecurityConfiguration;
import com.vista.common.web.GlobalExceptionHandler;
import java.util.List;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

@WebMvcTest(TripSettlementController.class)
@Import({GlobalExceptionHandler.class, SecurityConfiguration.class})
@WithMockUser
class TripSettlementControllerTest {

  @Autowired private MockMvc mockMvc;

  @MockitoBean private ExpenseService expenseService;
  @MockitoBean private CurrentUserProvider currentUserProvider;

  private UUID tripId;
  private UUID currentUserId;
  private UUID receiverId;

  @BeforeEach
  void setUp() {
    tripId = UUID.randomUUID();
    currentUserId = UUID.randomUUID();
    receiverId = UUID.randomUUID();
    when(currentUserProvider.getCurrentUserId()).thenReturn(currentUserId);
  }

  @Test
  @DisplayName("1. Thành viên hợp lệ được phép lấy danh sách tài khoản quyết toán")
  void getSettlementAccounts_asMember_shouldReturn200() throws Exception {
    SettlementAccountResponse account =
        new SettlementAccountResponse(
            receiverId,
            "Nguyễn Văn A",
            "TCB",
            "970407",
            "1903678999",
            "NGUYEN VAN A");

    when(expenseService.getSettlementAccounts(tripId, currentUserId))
        .thenReturn(List.of(account));

    mockMvc
        .perform(
            get("/api/v1/trips/{tripId}/settlement-accounts", tripId)
                .contentType(MediaType.APPLICATION_JSON))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$").isArray())
        .andExpect(jsonPath("$[0].userId").value(receiverId.toString()))
        .andExpect(jsonPath("$[0].displayName").value("Nguyễn Văn A"))
        .andExpect(jsonPath("$[0].bankCode").value("TCB"))
        .andExpect(jsonPath("$[0].bankBin").value("970407"))
        .andExpect(jsonPath("$[0].bankAccountNumber").value("1903678999"))
        .andExpect(jsonPath("$[0].bankAccountName").value("NGUYEN VAN A"));
  }

  @Test
  @DisplayName("2. Người ngoài chuyến đi nhận lỗi 403 Forbidden")
  void getSettlementAccounts_asNonMember_shouldReturn403() throws Exception {
    doThrow(new AccessDeniedException("Bạn không phải thành viên của chuyến đi"))
        .when(expenseService)
        .getSettlementAccounts(tripId, currentUserId);

    mockMvc
        .perform(
            get("/api/v1/trips/{tripId}/settlement-accounts", tripId)
                .contentType(MediaType.APPLICATION_JSON))
        .andExpect(status().isForbidden());
  }

  @Test
  @DisplayName("3. Thành viên không có thông tin ngân hàng trả về null an toàn")
  void getSettlementAccounts_memberWithoutBankInfo_shouldReturnNullFields() throws Exception {
    SettlementAccountResponse account =
        new SettlementAccountResponse(
            receiverId,
            "Trần Thị B",
            null,
            null,
            null,
            null);

    when(expenseService.getSettlementAccounts(tripId, currentUserId))
        .thenReturn(List.of(account));

    mockMvc
        .perform(
            get("/api/v1/trips/{tripId}/settlement-accounts", tripId)
                .contentType(MediaType.APPLICATION_JSON))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$[0].userId").value(receiverId.toString()))
        .andExpect(jsonPath("$[0].displayName").value("Trần Thị B"))
        .andExpect(jsonPath("$[0].bankCode").doesNotExist())
        .andExpect(jsonPath("$[0].bankAccountNumber").doesNotExist());
  }

  @Test
  @DisplayName("4. Khi không có giao dịch quyết toán trả về danh sách rỗng")
  void getSettlementAccounts_noSettlementRequired_shouldReturnEmptyList() throws Exception {
    when(expenseService.getSettlementAccounts(tripId, currentUserId))
        .thenReturn(List.of());

    mockMvc
        .perform(
            get("/api/v1/trips/{tripId}/settlement-accounts", tripId)
                .contentType(MediaType.APPLICATION_JSON))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$").isArray())
        .andExpect(jsonPath("$.length()").value(0));
  }
}
