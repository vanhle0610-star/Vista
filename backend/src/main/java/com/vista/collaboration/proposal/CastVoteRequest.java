package com.vista.collaboration.proposal;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;

public class CastVoteRequest {

  @NotBlank(message = "Giá trị phiếu bầu không được để trống") @Pattern(regexp = "^(UP|DOWN)$", message = "Giá trị phiếu phải là UP hoặc DOWN")
  private String vote;

  public CastVoteRequest() {}

  public String getVote() {
    return vote;
  }

  public void setVote(String vote) {
    this.vote = vote;
  }
}
