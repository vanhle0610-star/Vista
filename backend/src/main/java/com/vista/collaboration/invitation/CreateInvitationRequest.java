package com.vista.collaboration.invitation;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import java.time.Instant;

public class CreateInvitationRequest {

  @NotBlank(message = "Email người được mời không được để trống") @Email(message = "Email người được mời không hợp lệ") private String inviteeEmail;

  private Instant expiresAt;

  public CreateInvitationRequest() {}

  public CreateInvitationRequest(String inviteeEmail) {
    this.inviteeEmail = inviteeEmail;
  }

  public CreateInvitationRequest(String inviteeEmail, Instant expiresAt) {
    this.inviteeEmail = inviteeEmail;
    this.expiresAt = expiresAt;
  }

  public String getInviteeEmail() {
    return inviteeEmail;
  }

  public void setInviteeEmail(String inviteeEmail) {
    this.inviteeEmail = inviteeEmail;
  }

  public Instant getExpiresAt() {
    return expiresAt;
  }

  public void setExpiresAt(Instant expiresAt) {
    this.expiresAt = expiresAt;
  }
}
