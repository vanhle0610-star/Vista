package com.vista.collaboration.proposal;

public enum ProposalStatus {
  /** Đang mở — thành viên có thể vote. */
  OPEN,
  /** Owner đã duyệt đề xuất. */
  APPROVED,
  /** Owner đã từ chối đề xuất. */
  REJECTED,
  /** Biểu quyết đã đóng — không nhận vote mới. */
  CLOSED
}
