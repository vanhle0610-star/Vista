package com.vista.budget.util;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.ArrayList;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Set;
import java.util.UUID;

/**
 * Tiện ích tính toán phân chia chi phí chuyến đi theo quy tắc tiền tệ Việt Nam Đồng (VND). Đảm bảo:
 * 1. Tiền VND không có số thập phân lẻ (luôn làm tròn về số nguyên gần nhất). 2. Phân bổ phần dư
 * làm tròn tuần tự sao cho: sum(share_amount) == total_amount (sai số 0 đồng).
 */
public final class VndSplitCalculator {

  private VndSplitCalculator() {}

  public record SplitResult(UUID userId, BigDecimal amount) {
    public SplitResult {
      Objects.requireNonNull(userId, "userId must not be null");
      Objects.requireNonNull(amount, "amount must not be null");
      if (amount.compareTo(BigDecimal.ZERO) < 0) {
        throw new IllegalArgumentException("share amount must not be negative");
      }
    }
  }

  /**
   * Tính toán chia đều chi phí (Equal Split) cho danh sách người tham gia.
   *
   * @param totalAmount tổng số tiền của khoản chi (VND)
   * @param payerId mã người đã thanh toán (có thể thuộc hoặc không thuộc nhóm chia)
   * @param participantIds danh sách mã thành viên cùng chia tiền
   * @return danh sách kết quả phân chia cho từng người
   */
  public static List<SplitResult> calculateEqualSplit(
      BigDecimal totalAmount, UUID payerId, List<UUID> participantIds) {
    if (totalAmount == null) {
      throw new IllegalArgumentException("totalAmount must not be null");
    }
    if (totalAmount.compareTo(BigDecimal.ZERO) < 0) {
      throw new IllegalArgumentException("totalAmount must not be negative");
    }
    if (participantIds == null || participantIds.isEmpty()) {
      throw new IllegalArgumentException("participantIds must not be empty");
    }

    requireWholeVnd(totalAmount, "totalAmount");

    Set<UUID> uniqueParticipants = new LinkedHashSet<>(participantIds);
    if (uniqueParticipants.size() != participantIds.size()) {
      throw new IllegalArgumentException("participantIds must not contain duplicates");
    }
    if (uniqueParticipants.contains(null)) {
      throw new IllegalArgumentException("participantIds must not contain null");
    }
    int count = uniqueParticipants.size();

    BigDecimal normalizedTotal = totalAmount.setScale(0, RoundingMode.UNNECESSARY);
    if (normalizedTotal.compareTo(BigDecimal.ZERO) == 0) {
      return uniqueParticipants.stream()
          .map(id -> new SplitResult(id, BigDecimal.ZERO.setScale(0)))
          .toList();
    }

    BigDecimal countBd = BigDecimal.valueOf(count);
    BigDecimal baseShare = normalizedTotal.divide(countBd, 0, RoundingMode.FLOOR);
    BigDecimal remainder = normalizedTotal.subtract(baseShare.multiply(countBd));

    // Phân bổ phần dư (1 VND mỗi người) ưu tiên người thanh toán trước nếu có trong nhóm
    List<UUID> orderedIds = new ArrayList<>(uniqueParticipants);
    if (payerId != null && orderedIds.contains(payerId)) {
      orderedIds.remove(payerId);
      orderedIds.add(0, payerId);
    }

    List<SplitResult> results = new ArrayList<>();
    BigDecimal currentRemainder = remainder;

    for (UUID uid : orderedIds) {
      BigDecimal share = baseShare;
      if (currentRemainder.compareTo(BigDecimal.ZERO) > 0) {
        share = share.add(BigDecimal.ONE);
        currentRemainder = currentRemainder.subtract(BigDecimal.ONE);
      }
      results.add(new SplitResult(uid, share));
    }

    // Đảm bảo bất biến tổng: sum(results) == normalizedTotal
    BigDecimal calculatedSum =
        results.stream().map(SplitResult::amount).reduce(BigDecimal.ZERO, BigDecimal::add);
    if (calculatedSum.compareTo(normalizedTotal) != 0) {
      throw (new IllegalStateException(
          "Invariant violated: sum of shares ("
              + calculatedSum
              + ") does not match total amount ("
              + normalizedTotal
              + ")"));
    }

    return results;
  }

  /**
   * Kiểm tra tính hợp lệ của phân chia theo số tiền chỉ định (Exact Split).
   *
   * @param totalAmount tổng tiền hóa đơn
   * @param exactShares bản đồ số tiền từng người được chỉ định
   */
  public static void validateExactSplit(BigDecimal totalAmount, Map<UUID, BigDecimal> exactShares) {
    if (totalAmount == null || exactShares == null || exactShares.isEmpty()) {
      throw new IllegalArgumentException("totalAmount and exactShares must not be empty");
    }
    requireWholeVnd(totalAmount, "totalAmount");
    BigDecimal normalizedTotal = totalAmount.setScale(0, RoundingMode.UNNECESSARY);
    BigDecimal sum = BigDecimal.ZERO;
    for (Map.Entry<UUID, BigDecimal> entry : exactShares.entrySet()) {
      if (entry.getKey() == null) {
        throw new IllegalArgumentException("Exact split userId must not be null");
      }
      BigDecimal share = entry.getValue();
      if (share == null || share.compareTo(BigDecimal.ZERO) < 0) {
        throw new IllegalArgumentException(
            "Exact share for user " + entry.getKey() + " must be non-negative");
      }
      requireWholeVnd(share, "Exact share for user " + entry.getKey());
      sum = sum.add(share.setScale(0, RoundingMode.UNNECESSARY));
    }
    if (sum.compareTo(normalizedTotal) != 0) {
      throw new IllegalArgumentException(
          "Sum of exact shares ("
              + sum
              + ") does not equal total amount ("
              + normalizedTotal
              + ")");
    }
  }

  private static void requireWholeVnd(BigDecimal amount, String fieldName) {
    if (amount.stripTrailingZeros().scale() > 0) {
      throw new IllegalArgumentException(fieldName + " must be a whole VND amount");
    }
  }
}
