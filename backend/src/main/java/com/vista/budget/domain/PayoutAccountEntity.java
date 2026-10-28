package com.vista.budget.domain;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.PrePersist;
import jakarta.persistence.PreUpdate;
import jakarta.persistence.Table;
import jakarta.persistence.UniqueConstraint;
import jakarta.persistence.Version;
import java.time.Instant;
import java.util.Objects;
import java.util.UUID;

@Entity
@Table(
    name = "payout_accounts",
    uniqueConstraints = {
      @UniqueConstraint(
          name = "uq_payout_account",
          columnNames = {"user_id", "bank_code", "account_number"})
    })
public class PayoutAccountEntity {

  @Id
  @GeneratedValue(strategy = GenerationType.UUID)
  @Column(name = "id", nullable = false, updatable = false)
  private UUID id;

  @Column(name = "user_id", nullable = false, updatable = false)
  private UUID userId;

  @Column(name = "bank_code", nullable = false, length = 20)
  private String bankCode;

  @Column(name = "account_number", nullable = false, length = 64)
  private String accountNumber;

  @Column(name = "account_name", nullable = false, length = 150)
  private String accountName;

  @Column(name = "is_default", nullable = false)
  private boolean isDefault = false;

  @Enumerated(EnumType.STRING)
  @Column(name = "verification_status", nullable = false, length = 20)
  private PayoutVerificationStatus verificationStatus = PayoutVerificationStatus.UNVERIFIED;

  @Column(name = "created_at", nullable = false, updatable = false)
  private Instant createdAt;

  @Column(name = "updated_at", nullable = false)
  private Instant updatedAt;

  @Version
  @Column(name = "version", nullable = false)
  private Long version = 0L;

  public PayoutAccountEntity() {}

  public PayoutAccountEntity(
      UUID userId,
      String bankCode,
      String accountNumber,
      String accountName,
      boolean isDefault,
      PayoutVerificationStatus verificationStatus) {
    this.userId = Objects.requireNonNull(userId, "userId must not be null");
    this.bankCode = sanitizeBankCode(bankCode);
    this.accountNumber = sanitizeAccountNumber(accountNumber);
    this.accountName = sanitizeAccountName(accountName);
    this.isDefault = isDefault;
    this.verificationStatus =
        verificationStatus != null ? verificationStatus : PayoutVerificationStatus.UNVERIFIED;
    this.id = UUID.randomUUID();
  }

  @PrePersist
  protected void onCreate() {
    if (this.id == null) {
      this.id = UUID.randomUUID();
    }
    Instant now = Instant.now();
    if (createdAt == null) {
      createdAt = now;
    }
    if (updatedAt == null) {
      updatedAt = now;
    }
  }

  @PreUpdate
  protected void onUpdate() {
    updatedAt = Instant.now();
  }

  public static String maskAccountNumber(String acc) {
    if (acc == null || acc.isBlank()) {
      return "******";
    }
    String cleaned = acc.trim();
    if (cleaned.length() <= 4) {
      return "****" + cleaned;
    }
    String last4 = cleaned.substring(cleaned.length() - 4);
    return "******" + last4;
  }

  public String getMaskedAccountNumber() {
    return maskAccountNumber(this.accountNumber);
  }

  private static String sanitizeBankCode(String code) {
    if (code == null || code.isBlank()) {
      throw new IllegalArgumentException("bankCode must not be blank");
    }
    return code.trim().toUpperCase();
  }

  private static String sanitizeAccountNumber(String acc) {
    if (acc == null || acc.isBlank()) {
      throw new IllegalArgumentException("accountNumber must not be blank");
    }
    String cleaned = acc.trim().replaceAll("[^0-9a-zA-Z]", "");
    if (cleaned.length() < 6 || cleaned.length() > 30) {
      throw new IllegalArgumentException(
          "accountNumber length must be between 6 and 30 characters");
    }
    return cleaned;
  }

  private static String sanitizeAccountName(String name) {
    if (name == null || name.isBlank()) {
      throw new IllegalArgumentException("accountName must not be blank");
    }
    return name.trim().toUpperCase();
  }

  public UUID getId() {
    return id;
  }

  public void setId(UUID id) {
    this.id = id;
  }

  public UUID getUserId() {
    return userId;
  }

  public void setUserId(UUID userId) {
    this.userId = userId;
  }

  public String getBankCode() {
    return bankCode;
  }

  public void setBankCode(String bankCode) {
    this.bankCode = sanitizeBankCode(bankCode);
  }

  public String getAccountNumber() {
    return accountNumber;
  }

  public void setAccountNumber(String accountNumber) {
    this.accountNumber = sanitizeAccountNumber(accountNumber);
  }

  public String getAccountName() {
    return accountName;
  }

  public void setAccountName(String accountName) {
    this.accountName = sanitizeAccountName(accountName);
  }

  public boolean isDefault() {
    return isDefault;
  }

  public void setDefault(boolean aDefault) {
    isDefault = aDefault;
  }

  public PayoutVerificationStatus getVerificationStatus() {
    return verificationStatus;
  }

  public void setVerificationStatus(PayoutVerificationStatus verificationStatus) {
    this.verificationStatus = verificationStatus;
  }

  public Instant getCreatedAt() {
    return createdAt;
  }

  public Instant getUpdatedAt() {
    return updatedAt;
  }

  public Long getVersion() {
    return version;
  }

  public void setVersion(Long version) {
    this.version = version;
  }
}
