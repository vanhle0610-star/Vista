package com.vista.budget.util;

import static org.junit.jupiter.api.Assertions.*;

import java.math.BigDecimal;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

class VndSplitCalculatorTest {

  private final UUID userA = UUID.fromString("00000000-0000-0000-0000-000000000001");
  private final UUID userB = UUID.fromString("00000000-0000-0000-0000-000000000002");
  private final UUID userC = UUID.fromString("00000000-0000-0000-0000-000000000003");
  private final UUID userD = UUID.fromString("00000000-0000-0000-0000-000000000004");
  private final UUID userE = UUID.fromString("00000000-0000-0000-0000-000000000005");
  private final UUID userF = UUID.fromString("00000000-0000-0000-0000-000000000006");
  private final UUID userG = UUID.fromString("00000000-0000-0000-0000-000000000007");

  @Test
  @DisplayName("Ca 1: Chia hết chẵn (300.000đ chia 3 người)")
  void testEvenSplit() {
    BigDecimal total = new BigDecimal("300000");
    List<VndSplitCalculator.SplitResult> results =
        VndSplitCalculator.calculateEqualSplit(total, userA, List.of(userA, userB, userC));

    assertEquals(3, results.size());
    BigDecimal sum =
        results.stream()
            .map(VndSplitCalculator.SplitResult::amount)
            .reduce(BigDecimal.ZERO, BigDecimal::add);
    assertEquals(new BigDecimal("300000"), sum);

    for (var r : results) {
      assertEquals(new BigDecimal("100000"), r.amount());
    }
  }

  @Test
  @DisplayName("Ca 2: Chia có dư 1đ (100.000đ chia 3 người)")
  void testRemainder1Vnd() {
    BigDecimal total = new BigDecimal("100000");
    List<VndSplitCalculator.SplitResult> results =
        VndSplitCalculator.calculateEqualSplit(total, userA, List.of(userA, userB, userC));

    assertEquals(3, results.size());
    BigDecimal sum =
        results.stream()
            .map(VndSplitCalculator.SplitResult::amount)
            .reduce(BigDecimal.ZERO, BigDecimal::add);
    assertEquals(new BigDecimal("100000"), sum);

    // Người trả (userA) nhận phần dư 1đ: 33.334đ, 2 người còn lại 33.333đ
    var shareA = results.stream().filter(r -> r.userId().equals(userA)).findFirst().orElseThrow();
    assertEquals(new BigDecimal("33334"), shareA.amount());
  }

  @Test
  @DisplayName("Ca 3: Chia có dư 2đ (200.000đ chia 3 người)")
  void testRemainder2Vnd() {
    BigDecimal total = new BigDecimal("200000");
    List<VndSplitCalculator.SplitResult> results =
        VndSplitCalculator.calculateEqualSplit(total, userA, List.of(userA, userB, userC));

    assertEquals(3, results.size());
    BigDecimal sum =
        results.stream()
            .map(VndSplitCalculator.SplitResult::amount)
            .reduce(BigDecimal.ZERO, BigDecimal::add);
    assertEquals(new BigDecimal("200000"), sum);

    // 2 người nhận 66.667đ, 1 người nhận 66.666đ (hoặc tương tự tổng đúng 200.000)
    assertTrue(results.stream().allMatch(r -> r.amount().compareTo(new BigDecimal("66666")) >= 0));
  }

  @Test
  @DisplayName("Ca 4: Chia cho 6 người (1.000.000đ)")
  void testSplitFor6People() {
    BigDecimal total = new BigDecimal("1000000");
    List<VndSplitCalculator.SplitResult> results =
        VndSplitCalculator.calculateEqualSplit(
            total, userA, List.of(userA, userB, userC, userD, userE, userF));

    assertEquals(6, results.size());
    BigDecimal sum =
        results.stream()
            .map(VndSplitCalculator.SplitResult::amount)
            .reduce(BigDecimal.ZERO, BigDecimal::add);
    assertEquals(new BigDecimal("1000000"), sum);
  }

  @Test
  @DisplayName("Ca 5: Chia cho 7 người (500.000đ)")
  void testSplitFor7People() {
    BigDecimal total = new BigDecimal("500000");
    List<VndSplitCalculator.SplitResult> results =
        VndSplitCalculator.calculateEqualSplit(
            total, userB, List.of(userA, userB, userC, userD, userE, userF, userG));

    assertEquals(7, results.size());
    BigDecimal sum =
        results.stream()
            .map(VndSplitCalculator.SplitResult::amount)
            .reduce(BigDecimal.ZERO, BigDecimal::add);
    assertEquals(new BigDecimal("500000"), sum);
  }

  @Test
  @DisplayName("Ca 6: Chỉ có 1 người (250.000đ)")
  void testSingleParticipant() {
    BigDecimal total = new BigDecimal("250000");
    List<VndSplitCalculator.SplitResult> results =
        VndSplitCalculator.calculateEqualSplit(total, userA, List.of(userA));

    assertEquals(1, results.size());
    assertEquals(new BigDecimal("250000"), results.get(0).amount());
  }

  @Test
  @DisplayName("Ca 7: Người trả không thuộc nhóm chia (120.000đ cho B và C khi A trả)")
  void testPayerNotInParticipants() {
    BigDecimal total = new BigDecimal("120000");
    List<VndSplitCalculator.SplitResult> results =
        VndSplitCalculator.calculateEqualSplit(total, userA, List.of(userB, userC));

    assertEquals(2, results.size());
    BigDecimal sum =
        results.stream()
            .map(VndSplitCalculator.SplitResult::amount)
            .reduce(BigDecimal.ZERO, BigDecimal::add);
    assertEquals(new BigDecimal("120000"), sum);
    assertEquals(new BigDecimal("60000"), results.get(0).amount());
    assertEquals(new BigDecimal("60000"), results.get(1).amount());
  }

  @Test
  @DisplayName("Ca 8: Số tiền nhỏ hơn số người (2đ chia 3 người)")
  void testSmallAmount() {
    BigDecimal total = new BigDecimal("2");
    List<VndSplitCalculator.SplitResult> results =
        VndSplitCalculator.calculateEqualSplit(total, userA, List.of(userA, userB, userC));

    assertEquals(3, results.size());
    BigDecimal sum =
        results.stream()
            .map(VndSplitCalculator.SplitResult::amount)
            .reduce(BigDecimal.ZERO, BigDecimal::add);
    assertEquals(new BigDecimal("2"), sum);
  }

  @Test
  @DisplayName("Ca 9: Hóa đơn 0 đồng")
  void testZeroAmount() {
    BigDecimal total = BigDecimal.ZERO;
    List<VndSplitCalculator.SplitResult> results =
        VndSplitCalculator.calculateEqualSplit(total, userA, List.of(userA, userB, userC));

    assertEquals(3, results.size());
    for (var r : results) {
      assertEquals(BigDecimal.ZERO, r.amount());
    }
  }

  @Test
  @DisplayName("Ca 10: Hóa đơn lớn (125.450.000đ chia 4 người)")
  void testLargeAmount() {
    BigDecimal total = new BigDecimal("125450000");
    List<VndSplitCalculator.SplitResult> results =
        VndSplitCalculator.calculateEqualSplit(total, userC, List.of(userA, userB, userC, userD));

    assertEquals(4, results.size());
    BigDecimal sum =
        results.stream()
            .map(VndSplitCalculator.SplitResult::amount)
            .reduce(BigDecimal.ZERO, BigDecimal::add);
    assertEquals(new BigDecimal("125450000"), sum);
  }

  @Test
  @DisplayName("Ngoại lệ: Số tiền âm ném IllegalArgumentException")
  void testNegativeAmountThrows() {
    assertThrows(
        IllegalArgumentException.class,
        () ->
            VndSplitCalculator.calculateEqualSplit(new BigDecimal("-100"), userA, List.of(userA)));
  }

  @Test
  @DisplayName("Ngoại lệ: Danh sách người tham gia rỗng")
  void testEmptyParticipantsThrows() {
    assertThrows(
        IllegalArgumentException.class,
        () -> VndSplitCalculator.calculateEqualSplit(new BigDecimal("1000"), userA, List.of()));
  }

  @Test
  @DisplayName("Phân chia chỉ định Exact Split")
  void testExactSplitValidation() {
    BigDecimal total = new BigDecimal("300000");
    Map<UUID, BigDecimal> validShares =
        Map.of(
            userA, new BigDecimal("150000"),
            userB, new BigDecimal("100000"),
            userC, new BigDecimal("50000"));
    assertDoesNotThrow(() -> VndSplitCalculator.validateExactSplit(total, validShares));

    Map<UUID, BigDecimal> invalidShares =
        Map.of(
            userA, new BigDecimal("150000"),
            userB, new BigDecimal("100000"));
    assertThrows(
        IllegalArgumentException.class,
        () -> VndSplitCalculator.validateExactSplit(total, invalidShares));
  }

  @Test
  @DisplayName("Ca 14: Từ chối danh sách thành viên bị trùng ID")
  void testDuplicateParticipantsThrows() {
    assertThrows(
        IllegalArgumentException.class,
        () ->
            VndSplitCalculator.calculateEqualSplit(
                new BigDecimal("100000"), userA, List.of(userA, userB, userA)));
  }

  @Test
  @DisplayName("Ca 15: Từ chối số tiền VND có phần thập phân")
  void testFractionalVndThrows() {
    assertThrows(
        IllegalArgumentException.class,
        () ->
            VndSplitCalculator.calculateEqualSplit(
                new BigDecimal("1000.50"), userA, List.of(userA, userB)));
  }
}
