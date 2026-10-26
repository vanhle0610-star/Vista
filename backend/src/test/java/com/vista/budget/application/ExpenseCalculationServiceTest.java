package com.vista.budget.application;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.vista.budget.application.ExpenseCalculationService.SettlementTransfer;
import com.vista.budget.domain.ExpenseCategory;
import com.vista.budget.domain.ExpenseEntity;
import com.vista.budget.domain.ExpenseSplitEntity;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

class ExpenseCalculationServiceTest {

  private ExpenseCalculationService calculationService;

  private UUID tripId;
  private UUID vanAnhId;
  private UUID tuanId;
  private UUID namId;

  @BeforeEach
  void setUp() {
    calculationService = new ExpenseCalculationService();
    tripId = UUID.randomUUID();
    vanAnhId = UUID.randomUUID();
    tuanId = UUID.randomUUID();
    namId = UUID.randomUUID();
  }

  @Test
  @DisplayName("1. Chia đều chính xác khi số tiền chia hết cho số người")
  void createEqualSplits_shouldAllocateEvenly_whenDivisible() {
    BigDecimal amount = BigDecimal.valueOf(900000);
    ExpenseEntity expense =
        new ExpenseEntity(
            tripId,
            "Hải sản Năm Đảnh",
            amount,
            "VND",
            vanAnhId,
            ExpenseCategory.FOOD,
            Instant.now());

    List<UUID> participants = List.of(vanAnhId, tuanId, namId);
    List<ExpenseSplitEntity> splits = calculationService.createEqualSplits(expense, participants);

    assertThat(splits).hasSize(3);
    assertThat(splits).allMatch(s -> s.getShareAmount().compareTo(BigDecimal.valueOf(300000)) == 0);

    BigDecimal totalSplit =
        splits.stream()
            .map(ExpenseSplitEntity::getShareAmount)
            .reduce(BigDecimal.ZERO, BigDecimal::add);
    assertThat(totalSplit).isEqualByComparingTo(amount);
  }

  @Test
  @DisplayName("2. Chia đều và phân bổ số dư 1 đồng khi không chia hết")
  void createEqualSplits_shouldAllocateRemainder_whenIndivisible() {
    BigDecimal amount = BigDecimal.valueOf(100000); // 100.000 / 3 = 33.333 dư 1
    ExpenseEntity expense =
        new ExpenseEntity(
            tripId,
            "Bánh tráng cuốn thịt heo",
            amount,
            "VND",
            vanAnhId,
            ExpenseCategory.FOOD,
            Instant.now());

    List<UUID> participants = List.of(vanAnhId, tuanId, namId);
    List<ExpenseSplitEntity> splits = calculationService.createEqualSplits(expense, participants);

    assertThat(splits).hasSize(3);

    // Người thanh toán (Vân Ánh) được phân bổ phần dư 1 VND
    ExpenseSplitEntity vanAnhSplit =
        splits.stream().filter(s -> s.getUserId().equals(vanAnhId)).findFirst().orElseThrow();
    assertThat(vanAnhSplit.getShareAmount()).isEqualByComparingTo(BigDecimal.valueOf(33334));

    // Hai người còn lại nhận 33.333 VND
    ExpenseSplitEntity tuanSplit =
        splits.stream().filter(s -> s.getUserId().equals(tuanId)).findFirst().orElseThrow();
    assertThat(tuanSplit.getShareAmount()).isEqualByComparingTo(BigDecimal.valueOf(33333));

    BigDecimal totalSplit =
        splits.stream()
            .map(ExpenseSplitEntity::getShareAmount)
            .reduce(BigDecimal.ZERO, BigDecimal::add);
    assertThat(totalSplit).isEqualByComparingTo(amount);
  }

  @Test
  @DisplayName("3. Chia theo số tiền chỉ định (Exact Split) thành công khi tổng khớp")
  void createExactSplits_shouldSucceed_whenSumMatchesTotal() {
    BigDecimal total = BigDecimal.valueOf(500000);
    ExpenseEntity expense =
        new ExpenseEntity(
            tripId,
            "Cà phê & nước ngọt",
            total,
            "VND",
            tuanId,
            ExpenseCategory.FOOD,
            Instant.now());

    Map<UUID, BigDecimal> exactShares =
        Map.of(
            vanAnhId, BigDecimal.valueOf(150000),
            tuanId, BigDecimal.valueOf(200000),
            namId, BigDecimal.valueOf(150000));

    List<ExpenseSplitEntity> splits = calculationService.createExactSplits(expense, exactShares);

    assertThat(splits).hasSize(3);
    BigDecimal sum =
        splits.stream()
            .map(ExpenseSplitEntity::getShareAmount)
            .reduce(BigDecimal.ZERO, BigDecimal::add);
    assertThat(sum).isEqualByComparingTo(total);
  }

  @Test
  @DisplayName("4. Báo lỗi khi tổng chia chỉ định không khớp tổng hóa đơn")
  void createExactSplits_shouldThrow_whenSumDoesNotMatchTotal() {
    BigDecimal total = BigDecimal.valueOf(500000);
    ExpenseEntity expense =
        new ExpenseEntity(
            tripId, "Cà phê", total, "VND", tuanId, ExpenseCategory.FOOD, Instant.now());

    Map<UUID, BigDecimal> invalidShares =
        Map.of(
            vanAnhId, BigDecimal.valueOf(100000),
            tuanId, BigDecimal.valueOf(200000)); // tổng = 300.000 != 500.000

    assertThatThrownBy(() -> calculationService.createExactSplits(expense, invalidShares))
        .isInstanceOf(IllegalArgumentException.class)
        .hasMessageContaining("does not equal total amount");
  }

  @Test
  @DisplayName("5. Tính toán cán cân thanh toán (Settlement Delta) đảm bảo Zero-Sum Invariant")
  void calculateSettlementDeltas_shouldComputeBalancesAndPreserveZeroSum() {
    // Khoản 1: Vân Ánh trả 900.000 đ ăn hải sản (chia 3)
    ExpenseEntity exp1 =
        new ExpenseEntity(
            tripId,
            "Hải sản",
            BigDecimal.valueOf(900000),
            "VND",
            vanAnhId,
            ExpenseCategory.FOOD,
            Instant.now());
    exp1.addSplit(new ExpenseSplitEntity(vanAnhId, BigDecimal.valueOf(300000)));
    exp1.addSplit(new ExpenseSplitEntity(tuanId, BigDecimal.valueOf(300000)));
    exp1.addSplit(new ExpenseSplitEntity(namId, BigDecimal.valueOf(300000)));

    // Khoản 2: Tuấn trả 150.000 đ taxi sân bay (chia 3)
    ExpenseEntity exp2 =
        new ExpenseEntity(
            tripId,
            "Taxi",
            BigDecimal.valueOf(150000),
            "VND",
            tuanId,
            ExpenseCategory.TRANSPORT,
            Instant.now());
    exp2.addSplit(new ExpenseSplitEntity(vanAnhId, BigDecimal.valueOf(50000)));
    exp2.addSplit(new ExpenseSplitEntity(tuanId, BigDecimal.valueOf(50000)));
    exp2.addSplit(new ExpenseSplitEntity(namId, BigDecimal.valueOf(50000)));

    // Khoản 3: Nam trả 2.700.000 đ vé Bà Nà Hills (chia 3)
    ExpenseEntity exp3 =
        new ExpenseEntity(
            tripId,
            "Vé cáp treo",
            BigDecimal.valueOf(2700000),
            "VND",
            namId,
            ExpenseCategory.ACTIVITIES,
            Instant.now());
    exp3.addSplit(new ExpenseSplitEntity(vanAnhId, BigDecimal.valueOf(900000)));
    exp3.addSplit(new ExpenseSplitEntity(tuanId, BigDecimal.valueOf(900000)));
    exp3.addSplit(new ExpenseSplitEntity(namId, BigDecimal.valueOf(900000)));

    List<UUID> members = List.of(vanAnhId, tuanId, namId);
    Map<UUID, BigDecimal> balances =
        calculationService.calculateSettlementDeltas(List.of(exp1, exp2, exp3), members);

    // Chi tiêu mỗi người: 300k + 50k + 900k = 1.250.000 đ
    // Vân Ánh đã trả: 900.000 đ -> Net = 900k - 1250k = -350.000 đ
    // Tuấn đã trả: 150.000 đ -> Net = 150k - 1250k = -1.100.000 đ
    // Nam đã trả: 2.700.000 đ -> Net = 2700k - 1250k = +1.450.000 đ
    assertThat(balances.get(vanAnhId)).isEqualByComparingTo(BigDecimal.valueOf(-350000));
    assertThat(balances.get(tuanId)).isEqualByComparingTo(BigDecimal.valueOf(-1100000));
    assertThat(balances.get(namId)).isEqualByComparingTo(BigDecimal.valueOf(1450000));

    // Tổng số dư toàn nhóm phải triệt tiêu về 0
    BigDecimal sumBalances = balances.values().stream().reduce(BigDecimal.ZERO, BigDecimal::add);
    assertThat(sumBalances).isEqualByComparingTo(BigDecimal.ZERO);
  }

  @Test
  @DisplayName("6. Thuật toán Min Cash Flow đơn giản hóa số giao dịch trả nợ tối ưu")
  void simplifyDebts_shouldMinimizeTransfers() {
    // Vân Ánh: -350.000 đ, Tuấn: -1.100.000 đ, Nam: +1.450.000 đ
    Map<UUID, BigDecimal> balances =
        Map.of(
            vanAnhId, BigDecimal.valueOf(-350000),
            tuanId, BigDecimal.valueOf(-1100000),
            namId, BigDecimal.valueOf(1450000));

    List<SettlementTransfer> transfers = calculationService.simplifyDebts(balances);

    // Thay vì chuyển lòng vòng, chỉ cần đúng 2 giao dịch:
    // Tuấn chuyển Nam: 1.100.000 đ
    // Vân Ánh chuyển Nam: 350.000 đ
    assertThat(transfers).hasSize(2);

    BigDecimal totalTransferred =
        transfers.stream().map(SettlementTransfer::amount).reduce(BigDecimal.ZERO, BigDecimal::add);
    assertThat(totalTransferred).isEqualByComparingTo(BigDecimal.valueOf(1450000));

    assertThat(transfers)
        .anyMatch(
            t ->
                t.fromUserId().equals(tuanId)
                    && t.toUserId().equals(namId)
                    && t.amount().compareTo(BigDecimal.valueOf(1100000)) == 0);

    assertThat(transfers)
        .anyMatch(
            t ->
                t.fromUserId().equals(vanAnhId)
                    && t.toUserId().equals(namId)
                    && t.amount().compareTo(BigDecimal.valueOf(350000)) == 0);
  }

  @Test
  @DisplayName("7. Bỏ qua các hóa đơn đã hủy (INACTIVE status)")
  void calculateSettlementDeltas_shouldIgnoreInactiveExpenses() {
    ExpenseEntity expActive =
        new ExpenseEntity(
            tripId,
            "Ăn sáng",
            BigDecimal.valueOf(120000),
            "VND",
            vanAnhId,
            ExpenseCategory.FOOD,
            Instant.now());
    expActive.addSplit(new ExpenseSplitEntity(vanAnhId, BigDecimal.valueOf(60000)));
    expActive.addSplit(new ExpenseSplitEntity(tuanId, BigDecimal.valueOf(60000)));

    ExpenseEntity expCancelled =
        new ExpenseEntity(
            tripId,
            "Mua quà bị hủy",
            BigDecimal.valueOf(500000),
            "VND",
            vanAnhId,
            ExpenseCategory.OTHER,
            Instant.now());
    expCancelled.setStatus("CANCELLED");
    expCancelled.addSplit(new ExpenseSplitEntity(vanAnhId, BigDecimal.valueOf(250000)));
    expCancelled.addSplit(new ExpenseSplitEntity(tuanId, BigDecimal.valueOf(250000)));

    List<UUID> members = List.of(vanAnhId, tuanId);
    Map<UUID, BigDecimal> balances =
        calculationService.calculateSettlementDeltas(List.of(expActive, expCancelled), members);

    // Chỉ tính hóa đơn active: Vân Ánh trả 120k, tiêu 60k -> +60k. Tuấn tiêu 60k -> -60k.
    assertThat(balances.get(vanAnhId)).isEqualByComparingTo(BigDecimal.valueOf(60000));
    assertThat(balances.get(tuanId)).isEqualByComparingTo(BigDecimal.valueOf(-60000));
  }

  @Test
  @DisplayName("8. Xử lý trường hợp chỉ có 1 người tham gia chia toàn bộ số tiền")
  void createEqualSplits_singleParticipant_shouldTakeFullAmount() {
    BigDecimal amount = BigDecimal.valueOf(450000);
    ExpenseEntity expense =
        new ExpenseEntity(
            tripId,
            "Chi phí cá nhân",
            amount,
            "VND",
            vanAnhId,
            ExpenseCategory.OTHER,
            Instant.now());

    List<ExpenseSplitEntity> splits =
        calculationService.createEqualSplits(expense, List.of(vanAnhId));

    assertThat(splits).hasSize(1);
    assertThat(splits.get(0).getUserId()).isEqualTo(vanAnhId);
    assertThat(splits.get(0).getShareAmount()).isEqualByComparingTo(amount);
  }

  @Test
  @DisplayName("9. Khi tất cả số dư bằng 0, danh sách chuyển nợ rỗng")
  void simplifyDebts_allZeroBalances_shouldReturnEmptyList() {
    Map<UUID, BigDecimal> zeroBalances =
        Map.of(
            vanAnhId, BigDecimal.ZERO,
            tuanId, BigDecimal.ZERO,
            namId, BigDecimal.ZERO);

    List<SettlementTransfer> transfers = calculationService.simplifyDebts(zeroBalances);
    assertThat(transfers).isEmpty();
  }

  @Test
  @DisplayName("10. Báo lỗi khi danh sách người tham gia rỗng")
  void createEqualSplits_emptyParticipants_shouldThrowException() {
    ExpenseEntity expense =
        new ExpenseEntity(
            tripId,
            "Không có người",
            BigDecimal.valueOf(100000),
            "VND",
            vanAnhId,
            ExpenseCategory.OTHER,
            Instant.now());

    assertThatThrownBy(() -> calculationService.createEqualSplits(expense, List.of()))
        .isInstanceOf(IllegalArgumentException.class);
  }

  @Test
  @DisplayName(
      "11. Tuần 7 Edge Case: Thành viên chuyến đi không tham gia chia tiền (Excluded Members)")
  void calculateSettlementDeltas_withExcludedMembers_shouldHaveZeroBalanceForNonParticipants() {
    UUID memberD = UUID.randomUUID();
    UUID memberE = UUID.randomUUID();

    // Hóa đơn 900.000đ do Vân Ánh trả, chỉ chia cho Vân Ánh, Tuấn, Nam (mỗi người 300k). D và E
    // không tham gia.
    ExpenseEntity expense =
        new ExpenseEntity(
            tripId,
            "Bữa tối hải sản",
            BigDecimal.valueOf(900000),
            "VND",
            vanAnhId,
            ExpenseCategory.FOOD,
            Instant.now());
    expense.addSplit(new ExpenseSplitEntity(vanAnhId, BigDecimal.valueOf(300000)));
    expense.addSplit(new ExpenseSplitEntity(tuanId, BigDecimal.valueOf(300000)));
    expense.addSplit(new ExpenseSplitEntity(namId, BigDecimal.valueOf(300000)));

    List<UUID> allTripMembers = List.of(vanAnhId, tuanId, namId, memberD, memberE);
    Map<UUID, BigDecimal> balances =
        calculationService.calculateSettlementDeltas(List.of(expense), allTripMembers);

    // Vân Ánh bỏ ra 900k, chịu 300k -> số dư +600k (được nhận về)
    assertThat(balances.get(vanAnhId)).isEqualByComparingTo(BigDecimal.valueOf(600000));
    // Tuấn chịu 300k -> nợ -300k
    assertThat(balances.get(tuanId)).isEqualByComparingTo(BigDecimal.valueOf(-300000));
    // Nam chịu 300k -> nợ -300k
    assertThat(balances.get(namId)).isEqualByComparingTo(BigDecimal.valueOf(-300000));
    // D và E không tham gia -> số dư đúng bằng 0
    assertThat(balances.get(memberD)).isEqualByComparingTo(BigDecimal.ZERO);
    assertThat(balances.get(memberE)).isEqualByComparingTo(BigDecimal.ZERO);
  }

  @Test
  @DisplayName("12. Tuần 7 Edge Case: 1.000.000đ chia 7 người không chia hết, bù lẻ VND chính xác")
  void createEqualSplits_oneMillionVndDividedBySeven_shouldBalanceExactly() {
    BigDecimal amount = BigDecimal.valueOf(1000000);
    ExpenseEntity expense =
        new ExpenseEntity(
            tripId,
            "Vé tham quan nhóm",
            amount,
            "VND",
            vanAnhId,
            ExpenseCategory.ACTIVITIES,
            Instant.now());

    List<UUID> sevenUsers =
        List.of(
            vanAnhId,
            tuanId,
            namId,
            UUID.randomUUID(),
            UUID.randomUUID(),
            UUID.randomUUID(),
            UUID.randomUUID());

    List<ExpenseSplitEntity> splits = calculationService.createEqualSplits(expense, sevenUsers);

    assertThat(splits).hasSize(7);
    BigDecimal sumSplits =
        splits.stream()
            .map(ExpenseSplitEntity::getShareAmount)
            .reduce(BigDecimal.ZERO, BigDecimal::add);
    // Tổng từng phần phải bằng đúng 1.000.000đ không lệch 1 xu
    assertThat(sumSplits).isEqualByComparingTo(amount);

    // Người trả (Vân Ánh) chịu phần dư 1đ: 142.858đ, 6 người còn lại 142.857đ
    ExpenseSplitEntity payerSplit =
        splits.stream().filter(s -> s.getUserId().equals(vanAnhId)).findFirst().orElseThrow();
    assertThat(payerSplit.getShareAmount()).isEqualByComparingTo(BigDecimal.valueOf(142858));

    long otherSharesCount =
        splits.stream()
            .filter(s -> !s.getUserId().equals(vanAnhId))
            .filter(s -> s.getShareAmount().compareTo(BigDecimal.valueOf(142857)) == 0)
            .count();
    assertThat(otherSharesCount).isEqualTo(6);
  }

  @Test
  @DisplayName(
      "13. Tuần 7 Edge Case: Cấn trừ công nợ đa phương (A nợ B 100k, B nợ C 100k -> A trả C 100k)")
  void simplifyDebts_transitiveDebt_shouldOptimizeToSingleTransfer() {
    // Vân Ánh nợ Tuấn 100k (-100k), Tuấn số dư ròng 0k, Nam được nhận 100k (+100k)
    Map<UUID, BigDecimal> balances =
        Map.of(
            vanAnhId, BigDecimal.valueOf(-100000),
            tuanId, BigDecimal.ZERO,
            namId, BigDecimal.valueOf(100000));

    List<SettlementTransfer> transfers = calculationService.simplifyDebts(balances);

    assertThat(transfers).hasSize(1);
    SettlementTransfer transfer = transfers.get(0);
    assertThat(transfer.fromUserId()).isEqualTo(vanAnhId);
    assertThat(transfer.toUserId()).isEqualTo(namId);
    assertThat(transfer.amount()).isEqualByComparingTo(BigDecimal.valueOf(100000));
  }
}
