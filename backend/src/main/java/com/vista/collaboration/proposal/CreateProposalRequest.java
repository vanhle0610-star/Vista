package com.vista.collaboration.proposal;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import java.time.Instant;
import java.util.UUID;

public class CreateProposalRequest {

  @NotBlank(message = "Tiêu đề đề xuất không được để trống") @Size(max = 200, message = "Tiêu đề tối đa 200 ký tự") private String title;

  /** FK đến destinations — null nếu đề xuất tự nhập. */
  private UUID destinationId;

  /** Thời điểm tự động đóng biểu quyết — null nếu không có hạn. */
  private Instant closesAt;

  public CreateProposalRequest() {}

  public String getTitle() {
    return title;
  }

  public void setTitle(String title) {
    this.title = title;
  }

  public UUID getDestinationId() {
    return destinationId;
  }

  public void setDestinationId(UUID destinationId) {
    this.destinationId = destinationId;
  }

  public Instant getClosesAt() {
    return closesAt;
  }

  public void setClosesAt(Instant closesAt) {
    this.closesAt = closesAt;
  }
}
