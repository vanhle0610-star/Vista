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
import com.vista.budget.api.dto.UpdateExpenseRequest;
import com.vista.budget.domain.ExpenseCategory;
import com.vista.budget.domain.ExpenseEntity;
import com.vista.budget.domain.ExpenseSplitEntity;
import com.vista.budget.infrastructure.ExpenseRepository;
import com.vista.budget.infrastructure.ExpenseSplitRepository;
import com.vista.common.audit.AuditLogService;
import com.vista.trip.application.TripAccessService;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;
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
class ExpenseSecurityRbacTest {

  @Mock private TripAccessService tripAccessService;
  @Mock private ExpenseRepository expenseRepository;
  @Mock private ExpenseSplitRepository expenseSplitRepository;
  @Mock private ExpenseCalculationService calculationService;
  @Mock private AuditLogService auditLogService;

  @InjectMocks private ExpenseService expenseService;

  private UUID tripId;
  private UUID ownerId;
  private UUID editorId;
  private UUID viewerId;
  private UUID outsiderId;
  private UUID removedMemberId;

  @BeforeEach
  void setUp() {
    tripId = UUID.randomUUID();
    ownerId = UUID.randomUUID();
    editorId = UUID.randomUUID();
    viewerId = UUID.randomUUID();
    outsiderId = UUID.randomUUID();
    removedMemberId = UUID.randomUUID();
  }

  // 1. Outsider đọc Expense bị từ chối
  @Test
  @DisplayName("1. Outsider cố đọc danh sách Expense bị từ chối (AccessDeniedException)")
  void listExpenses_outsider_denied() {
    doThrow(new AccessDeniedException("Outsider denied"))
        .when(tripAccessService)
        .requireMember(tripId, outsiderId);

    assertThatThrownBy(() -> expenseService.getTripExpenses(tripId, outsiderId))
        .isInstanceOf(AccessDeniedException.class);

    verify(expenseRepository, never()).findByTripIdAndStatusOrderByOccurredAtDesc(any(), any());
  }

  // 2. REMOVED member đọc Expense bị từ chối
  @Test
  @DisplayName("2. Member bị REMOVED cố đọc danh sách Expense bị từ chối (AccessDeniedException)")
  void listExpenses_removedMember_denied() {
    doThrow(new AccessDeniedException("Removed member denied"))
        .when(tripAccessService)
        .requireMember(tripId, removedMemberId);

    assertThatThrownBy(() -> expenseService.getTripExpenses(tripId, removedMemberId))
        .isInstanceOf(AccessDeniedException.class);
  }

  // 3. Viewer tạo Expense bị từ chối
  @Test
  @DisplayName("3. Viewer cố tạo Expense bị từ chối (requireWriteAccess fails)")
  void createExpense_viewer_denied() {
    CreateExpenseRequest request =
        new CreateExpenseRequest(
            "Taxi",
            BigDecimal.valueOf(100000),
            "VND",
            viewerId,
            ExpenseCategory.TRANSPORT,
            Instant.now(),
            "EQUAL",
            null,
            null);

    doThrow(new AccessDeniedException("Viewer has read-only access"))
        .when(tripAccessService)
        .requireWriteAccess(tripId, viewerId);

    assertThatThrownBy(() -> expenseService.createExpense(tripId, viewerId, request))
        .isInstanceOf(AccessDeniedException.class);

    verify(expenseRepository, never()).save(any());
    verify(auditLogService, never()).logAction(any(), any(), any(), any(), any());
  }

  // 4. Editor tạo Expense thành công
  @Test
  @DisplayName("4. Editor tạo Expense thành công và ghi Audit Log EXPENSE_CREATED")
  void createExpense_editor_success() {
    CreateExpenseRequest request =
        new CreateExpenseRequest(
            "Ăn trưa",
            BigDecimal.valueOf(200000),
            "VND",
            editorId,
            ExpenseCategory.FOOD,
            Instant.now(),
            "EQUAL",
            List.of(editorId),
            null);

    doNothing().when(tripAccessService).requireWriteAccess(tripId, editorId);
    when(calculationService.createEqualSplits(any(), any()))
        .thenReturn(List.of(new ExpenseSplitEntity(null, editorId, BigDecimal.valueOf(200000))));
    when(expenseRepository.save(any(ExpenseEntity.class))).thenAnswer(inv -> inv.getArgument(0));

    ExpenseResponse response = expenseService.createExpense(tripId, editorId, request);

    assertThat(response).isNotNull();
    assertThat(response.title()).isEqualTo("Ăn trưa");
    verify(tripAccessService).requireWriteAccess(tripId, editorId);
    verify(auditLogService)
        .logAction(eq(editorId), eq("EXPENSE_CREATED"), eq("EXPENSE"), any(), any());
  }

  // 5. Owner tạo Expense thành công
  @Test
  @DisplayName("5. Owner tạo Expense thành công và ghi Audit Log")
  void createExpense_owner_success() {
    CreateExpenseRequest request =
        new CreateExpenseRequest(
            "Khách sạn",
            BigDecimal.valueOf(1200000),
            "VND",
            ownerId,
            ExpenseCategory.ACCOMMODATION,
            Instant.now(),
            "EQUAL",
            List.of(ownerId),
            null);

    doNothing().when(tripAccessService).requireWriteAccess(tripId, ownerId);
    when(calculationService.createEqualSplits(any(), any()))
        .thenReturn(List.of(new ExpenseSplitEntity(null, ownerId, BigDecimal.valueOf(1200000))));
    when(expenseRepository.save(any(ExpenseEntity.class))).thenAnswer(inv -> inv.getArgument(0));

    ExpenseResponse response = expenseService.createExpense(tripId, ownerId, request);

    assertThat(response).isNotNull();
    verify(auditLogService)
        .logAction(eq(ownerId), eq("EXPENSE_CREATED"), eq("EXPENSE"), any(), any());
  }

  // 6. Member không phải Owner/PaidBy sửa Expense bị từ chối
  @Test
  @DisplayName(
      "6. Member khác (không phải PaidBy, không phải Owner) cố sửa Expense bị 403 Forbidden")
  void updateExpense_byAnotherMember_forbidden() {
    UUID expenseId = UUID.randomUUID();
    ExpenseEntity existing =
        new ExpenseEntity(
            tripId,
            "Cà phê",
            BigDecimal.valueOf(50000),
            "VND",
            editorId,
            ExpenseCategory.FOOD,
            Instant.now());

    when(expenseRepository.findById(expenseId)).thenReturn(Optional.of(existing));
    doNothing().when(tripAccessService).requireMember(tripId, viewerId);
    when(tripAccessService.isOwner(tripId, viewerId)).thenReturn(false);

    UpdateExpenseRequest updateReq =
        new UpdateExpenseRequest("Cà phê update", null, null, null, null, null, null, null, null);

    assertThatThrownBy(() -> expenseService.updateExpense(tripId, expenseId, viewerId, updateReq))
        .isInstanceOf(ResponseStatusException.class)
        .satisfies(
            ex ->
                assertThat(((ResponseStatusException) ex).getStatusCode())
                    .isEqualTo(HttpStatus.FORBIDDEN));

    verify(auditLogService, never()).logAction(any(), any(), any(), any(), any());
  }

  // 7. Paid-By ACTIVE sửa Expense thành công nếu policy cho phép
  @Test
  @DisplayName("7. Paid-By đang ACTIVE sửa Expense thành công và ghi Audit Log EXPENSE_UPDATED")
  void updateExpense_activePaidBy_success() {
    UUID expenseId = UUID.randomUUID();
    ExpenseEntity existing =
        new ExpenseEntity(
            tripId,
            "Vé tham quan",
            BigDecimal.valueOf(100000),
            "VND",
            editorId,
            ExpenseCategory.ACTIVITIES,
            Instant.now());

    when(expenseRepository.findById(expenseId)).thenReturn(Optional.of(existing));
    doNothing().when(tripAccessService).requireMember(tripId, editorId);
    when(expenseRepository.save(any(ExpenseEntity.class))).thenAnswer(inv -> inv.getArgument(0));

    UpdateExpenseRequest updateReq =
        new UpdateExpenseRequest(
            "Vé tham quan Bà Nà", null, null, null, null, null, null, null, null);

    ExpenseResponse response = expenseService.updateExpense(tripId, expenseId, editorId, updateReq);

    assertThat(response.title()).isEqualTo("Vé tham quan Bà Nà");
    verify(auditLogService)
        .logAction(
            eq(editorId), eq("EXPENSE_UPDATED"), eq("EXPENSE"), eq(expenseId.toString()), any());
  }

  // 8. Paid-By đã bị REMOVED cố sửa Expense bị từ chối
  @Test
  @DisplayName(
      "8. Người từng là Paid-By nhưng đã bị REMOVED cố sửa Expense bị AccessDeniedException")
  void updateExpense_removedPaidBy_denied() {
    UUID expenseId = UUID.randomUUID();
    ExpenseEntity existing =
        new ExpenseEntity(
            tripId,
            "Vé xe",
            BigDecimal.valueOf(150000),
            "VND",
            removedMemberId,
            ExpenseCategory.TRANSPORT,
            Instant.now());

    when(expenseRepository.findById(expenseId)).thenReturn(Optional.of(existing));
    doThrow(new AccessDeniedException("Removed user is no longer a member"))
        .when(tripAccessService)
        .requireMember(tripId, removedMemberId);

    UpdateExpenseRequest updateReq =
        new UpdateExpenseRequest("Vé xe đổi giờ", null, null, null, null, null, null, null, null);

    assertThatThrownBy(
            () -> expenseService.updateExpense(tripId, expenseId, removedMemberId, updateReq))
        .isInstanceOf(AccessDeniedException.class);

    verify(expenseRepository, never()).save(any());
  }

  // 9. Owner xóa Expense thành công
  @Test
  @DisplayName("9. Owner xóa Expense thành công và ghi Audit Log EXPENSE_DELETED")
  void deleteExpense_byOwner_success() {
    UUID expenseId = UUID.randomUUID();
    ExpenseEntity existing =
        new ExpenseEntity(
            tripId,
            "Hải sản",
            BigDecimal.valueOf(800000),
            "VND",
            editorId,
            ExpenseCategory.FOOD,
            Instant.now());

    when(expenseRepository.findById(expenseId)).thenReturn(Optional.of(existing));
    doNothing().when(tripAccessService).requireMember(tripId, ownerId);
    when(tripAccessService.isOwner(tripId, ownerId)).thenReturn(true);

    expenseService.deleteExpense(tripId, expenseId, ownerId);

    assertThat(existing.getStatus()).isEqualTo("CANCELLED");
    verify(expenseRepository).save(existing);
    verify(auditLogService)
        .logAction(
            eq(ownerId), eq("EXPENSE_DELETED"), eq("EXPENSE"), eq(expenseId.toString()), any());
  }

  // 10. Paid-By đã REMOVED cố xóa Expense bị từ chối
  @Test
  @DisplayName("10. Paid-By đã bị REMOVED cố xóa Expense bị AccessDeniedException")
  void deleteExpense_removedPaidBy_denied() {
    UUID expenseId = UUID.randomUUID();
    ExpenseEntity existing =
        new ExpenseEntity(
            tripId,
            "Vé xe",
            BigDecimal.valueOf(150000),
            "VND",
            removedMemberId,
            ExpenseCategory.TRANSPORT,
            Instant.now());

    when(expenseRepository.findById(expenseId)).thenReturn(Optional.of(existing));
    doThrow(new AccessDeniedException("Removed member cannot delete expense"))
        .when(tripAccessService)
        .requireMember(tripId, removedMemberId);

    assertThatThrownBy(() -> expenseService.deleteExpense(tripId, expenseId, removedMemberId))
        .isInstanceOf(AccessDeniedException.class);

    verify(expenseRepository, never()).save(any());
  }

  // 11. Expense thuộc Trip khác (IDOR) bị từ chối 400 Bad Request
  @Test
  @DisplayName("11. IDOR: Gọi ExpenseId thuộc Trip khác bị 400 Bad Request")
  void expense_crossTripIdor_badRequest() {
    UUID expenseId = UUID.randomUUID();
    UUID anotherTripId = UUID.randomUUID();
    ExpenseEntity foreignExpense =
        new ExpenseEntity(
            anotherTripId,
            "Chi phí trip khác",
            BigDecimal.valueOf(300000),
            "VND",
            ownerId,
            ExpenseCategory.OTHER,
            Instant.now());

    when(expenseRepository.findById(expenseId)).thenReturn(Optional.of(foreignExpense));

    UpdateExpenseRequest updateReq =
        new UpdateExpenseRequest(
            "Cố sửa trip khác", null, null, null, null, null, null, null, null);

    assertThatThrownBy(() -> expenseService.updateExpense(tripId, expenseId, ownerId, updateReq))
        .isInstanceOf(ResponseStatusException.class)
        .satisfies(
            ex ->
                assertThat(((ResponseStatusException) ex).getStatusCode())
                    .isEqualTo(HttpStatus.BAD_REQUEST));
  }

  // 12. Participant ngoài trip bị từ chối
  @Test
  @DisplayName("12. Tạo expense với participantId là người ngoài trip bị AccessDeniedException")
  void expense_crossTripParticipant_denied() {
    CreateExpenseRequest request =
        new CreateExpenseRequest(
            "Ăn tối",
            BigDecimal.valueOf(400000),
            "VND",
            ownerId,
            ExpenseCategory.FOOD,
            Instant.now(),
            "EQUAL",
            List.of(ownerId, outsiderId),
            null);

    doNothing().when(tripAccessService).requireWriteAccess(tripId, ownerId);
    doThrow(new AccessDeniedException("Participant is not in this trip"))
        .when(tripAccessService)
        .requireMember(tripId, outsiderId);

    assertThatThrownBy(() -> expenseService.createExpense(tripId, ownerId, request))
        .isInstanceOf(AccessDeniedException.class);

    verify(expenseRepository, never()).save(any());
  }
}
