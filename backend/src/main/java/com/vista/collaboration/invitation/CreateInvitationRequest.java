package com.vista.collaboration.invitation;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import java.time.Instant;

public class CreateInvitationRequest {

  @NotBlank(message = "Email người được mời không được để trống") @Email(message = "Email người được mời không hợp lệ") private String inviteeEmail;

  private Instant expiresAt;

  private String token;

  public CreateInvitationRequest() {}

  public CreateInvitationRequest(String inviteeEmail) {
    this.inviteeEmail = inviteeEmail;
  }

  public CreateInvitationRequest(String inviteeEmail, Instant expiresAt) {
    this.inviteeEmail = inviteeEmail;
    this.expiresAt = expiresAt;
  }

  public CreateInvitationRequest(String inviteeEmail, Instant expiresAt, String token) {
    this.inviteeEmail = inviteeEmail;
    this.expiresAt = expiresAt;
    this.token = token;
  }

  public String getToken() {
    return token;
  }

  public void setToken(String token) {
    this.token = token;
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
