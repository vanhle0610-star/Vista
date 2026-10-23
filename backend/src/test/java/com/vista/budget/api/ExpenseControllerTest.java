package com.vista.budget.api;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.doNothing;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.vista.budget.api.dto.CreateExpenseRequest;
import com.vista.budget.api.dto.ExpenseResponse;
import com.vista.budget.api.dto.ExpenseSplitResponse;
import com.vista.budget.api.dto.TripExpenseSummaryResponse;
import com.vista.budget.api.dto.UpdateExpenseRequest;
import com.vista.budget.application.ExpenseService;
import com.vista.budget.domain.ExpenseCategory;
import com.vista.common.security.CurrentUserProvider;
import com.vista.common.security.SecurityConfiguration;
import com.vista.common.web.GlobalExceptionHandler;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;
import java.util.Map;
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

@WebMvcTest(ExpenseController.class)
@Import({GlobalExceptionHandler.class, SecurityConfiguration.class})
@WithMockUser
class ExpenseControllerTest {

  @Autowired private MockMvc mockMvc;
  private final ObjectMapper objectMapper = new ObjectMapper().findAndRegisterModules();

  @MockitoBean private ExpenseService expenseService;
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
  @DisplayName("1. Lấy danh sách chi tiêu thành công khi là thành viên hợp lệ (200 OK)")
  void listTripExpenses_shouldReturn200() throws Exception {
    ExpenseResponse mockExpense =
        new ExpenseResponse(
            UUID.randomUUID(),
            tripId,
            "Hải sản Năm Đảnh",
            BigDecimal.valueOf(900000),
            "VND",
            currentUserId,
            ExpenseCategory.FOOD,
            Instant.now(),
            "ACTIVE",
            Instant.now(),
            List.of(
                new ExpenseSplitResponse(
                    UUID.randomUUID(), currentUserId, BigDecimal.valueOf(300000), "UNSETTLED")));

    when(expenseService.getTripExpenses(eq(tripId), eq(currentUserId)))
        .thenReturn(List.of(mockExpense));

    mockMvc
        .perform(get("/api/v1/trips/{tripId}/expenses", tripId))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$[0].title").value("Hải sản Năm Đảnh"))
        .andExpect(jsonPath("$[0].amount").value(900000))
        .andExpect(jsonPath("$[0].splits[0].shareAmount").value(300000));
  }

  @Test
  @DisplayName("2. Tạo khoản chi mới thành công trả về 201 Created")
  void createTripExpense_shouldReturn201() throws Exception {
    CreateExpenseRequest request =
        new CreateExpenseRequest(
            "Taxi Mai Linh",
            BigDecimal.valueOf(150000),
            "VND",
            currentUserId,
            ExpenseCategory.TRANSPORT,
            Instant.now(),
            "EQUAL",
            List.of(currentUserId),
            null);

    ExpenseResponse mockCreated =
        new ExpenseResponse(
            UUID.randomUUID(),
            tripId,
            "Taxi Mai Linh",
            BigDecimal.valueOf(150000),
            "VND",
            currentUserId,
            ExpenseCategory.TRANSPORT,
            Instant.now(),
            "ACTIVE",
            Instant.now(),
            List.of());

    when(expenseService.createExpense(
            eq(tripId), eq(currentUserId), any(CreateExpenseRequest.class)))
        .thenReturn(mockCreated);

    mockMvc
        .perform(
            post("/api/v1/trips/{tripId}/expenses", tripId)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(request)))
        .andExpect(status().isCreated())
        .andExpect(jsonPath("$.title").value("Taxi Mai Linh"))
        .andExpect(jsonPath("$.amount").value(150000));
  }

  @Test
  @DisplayName("3. Chặn 403 Forbidden khi người dùng không phải thành viên chuyến đi")
  void createTripExpense_shouldReturn403_whenUserNotMember() throws Exception {
    CreateExpenseRequest request =
        new CreateExpenseRequest(
            "Hải sản",
            BigDecimal.valueOf(500000),
            "VND",
            currentUserId,
            ExpenseCategory.FOOD,
            Instant.now(),
            "EQUAL",
            List.of(currentUserId),
            null);

    doThrow(new AccessDeniedException("User is not a member of trip"))
        .when(expenseService)
        .createExpense(eq(tripId), eq(currentUserId), any(CreateExpenseRequest.class));

    mockMvc
        .perform(
            post("/api/v1/trips/{tripId}/expenses", tripId)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(request)))
        .andExpect(status().isForbidden())
        .andExpect(jsonPath("$.title").value("Forbidden"));
  }

  @Test
  @DisplayName("4. Báo lỗi 400 Bad Request khi số tiền âm hoặc tiêu đề rỗng")
  void createTripExpense_shouldReturn400_whenInvalidData() throws Exception {
    CreateExpenseRequest invalidRequest =
        new CreateExpenseRequest(
            "", // tiêu đề rỗng
            BigDecimal.valueOf(-50000), // số tiền âm
            "VND",
            currentUserId,
            ExpenseCategory.FOOD,
            Instant.now(),
            "EQUAL",
            List.of(),
            null);

    mockMvc
        .perform(
            post("/api/v1/trips/{tripId}/expenses", tripId)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(invalidRequest)))
        .andExpect(status().isBadRequest())
        .andExpect(jsonPath("$.title").value("Validation failed"));
  }

  @Test
  @DisplayName("5. Hủy khoản chi thành công trả về 204 No Content")
  void deleteTripExpense_shouldReturn204() throws Exception {
    UUID expenseId = UUID.randomUUID();
    doNothing().when(expenseService).deleteExpense(tripId, expenseId, currentUserId);

    mockMvc
        .perform(delete("/api/v1/trips/{tripId}/expenses/{expenseId}", tripId, expenseId))
        .andExpect(status().isNoContent());
  }

  @Test
  @DisplayName("6. Lấy tóm tắt ngân sách và settlement delta thành công (200 OK)")
  void getTripExpenseSummary_shouldReturn200() throws Exception {
    TripExpenseSummaryResponse summaryResponse =
        new TripExpenseSummaryResponse(
            tripId,
            BigDecimal.valueOf(3450000),
            BigDecimal.valueOf(5000000),
            BigDecimal.valueOf(1550000),
            69,
            "VND",
            Map.of(currentUserId, BigDecimal.valueOf(550000)),
            List.of());

    when(expenseService.getTripExpenseSummary(eq(tripId), eq(currentUserId), any()))
        .thenReturn(summaryResponse);

    mockMvc
        .perform(get("/api/v1/trips/{tripId}/expenses/summary", tripId))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.totalSpent").value(3450000))
        .andExpect(jsonPath("$.remainingBudget").value(1550000))
        .andExpect(jsonPath("$.spentPercentage").value(69));
  }

  @Test
  @DisplayName("7. Tuần 7 Bảo mật: Chặn 403 Forbidden khi người ngoài cố tình truy cập xem danh sách chi tiêu (IDOR)")
  void listTripExpenses_shouldReturn403_whenUserNotMember() throws Exception {
    doThrow(new AccessDeniedException("User is not a member of trip"))
        .when(expenseService)
        .getTripExpenses(eq(tripId), eq(currentUserId));

    mockMvc
        .perform(get("/api/v1/trips/{tripId}/expenses", tripId))
        .andExpect(status().isForbidden())
        .andExpect(jsonPath("$.title").value("Forbidden"));
  }

  @Test
  @DisplayName("8. Tuần 7 Bảo mật: Chặn 403 Forbidden khi người ngoài cố tình lấy tóm tắt ngân sách (IDOR)")
  void getTripExpenseSummary_shouldReturn403_whenUserNotMember() throws Exception {
    doThrow(new AccessDeniedException("User is not a member of trip"))
        .when(expenseService)
        .getTripExpenseSummary(eq(tripId), eq(currentUserId), any());

    mockMvc
        .perform(get("/api/v1/trips/{tripId}/expenses/summary", tripId))
        .andExpect(status().isForbidden())
        .andExpect(jsonPath("$.title").value("Forbidden"));
  }

  @Test
  @DisplayName("9. Cập nhật khoản chi thành công trả về 200 OK")
  void updateTripExpense_shouldReturn200() throws Exception {
    UUID expenseId = UUID.randomUUID();
    UpdateExpenseRequest request =
        new UpdateExpenseRequest(
            "Taxi sân bay", null, null, null, null, null, null, null, null);
    ExpenseResponse response =
        new ExpenseResponse(
            expenseId,
            tripId,
            "Taxi sân bay",
            BigDecimal.valueOf(150000),
            "VND",
            currentUserId,
            ExpenseCategory.TRANSPORT,
            Instant.now(),
            "ACTIVE",
            Instant.now(),
            List.of());

    when(expenseService.updateExpense(
            eq(tripId), eq(expenseId), eq(currentUserId), any(UpdateExpenseRequest.class)))
        .thenReturn(response);

    mockMvc
        .perform(
            patch("/api/v1/trips/{tripId}/expenses/{expenseId}", tripId, expenseId)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(request)))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.id").value(expenseId.toString()))
        .andExpect(jsonPath("$.title").value("Taxi sân bay"));
  }
}
