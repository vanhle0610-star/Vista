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
import java.math.BigDecimal;
import java.time.Instant;
import java.util.Objects;
import java.util.UUID;

@Entity
@Table(
    name = "settlement_payment_requests",
    uniqueConstraints = {
      @UniqueConstraint(
          name = "uq_settlement_payment_request",
          columnNames = {"trip_id", "payer_id", "recipient_id", "idempotency_key"})
    })
public class SettlementPaymentRequestEntity {

  @Id
  @GeneratedValue(strategy = GenerationType.UUID)
  @Column(name = "id", nullable = false, updatable = false)
  private UUID id;

  @Column(name = "trip_id", nullable = false, updatable = false)
  private UUID tripId;

  @Column(name = "payer_id", nullable = false, updatable = false)
  private UUID payerId;

  @Column(name = "recipient_id", nullable = false, updatable = false)
  private UUID recipientId;

  @Column(name = "payout_account_id", nullable = false, updatable = false)
  private UUID payoutAccountId;

  @Column(name = "amount", nullable = false, precision = 15, scale = 2)
  private BigDecimal amount;

  @Column(name = "currency", nullable = false, length = 3)
  private String currency = "VND";

  @Column(name = "memo", nullable = false, length = 100)
  private String memo;

  @Column(name = "qr_content", nullable = false, columnDefinition = "text")
  private String qrContent;

  @Column(name = "qr_image_url", columnDefinition = "text")
  private String qrImageUrl;

  @Column(name = "bank_code", nullable = false, length = 20)
  private String bankCode;

  @Column(name = "masked_account_number", nullable = false, length = 64)
  private String maskedAccountNumber;

  @Column(name = "recipient_account_name", nullable = false, length = 150)
  private String recipientAccountName;

  @Column(name = "idempotency_key", nullable = false, length = 64)
  private String idempotencyKey;

  @Enumerated(EnumType.STRING)
  @Column(name = "status", nullable = false, length = 30)
  private PaymentRequestStatus status = PaymentRequestStatus.CREATED;

  @Column(name = "expires_at", nullable = false)
  private Instant expiresAt;

  @Column(name = "created_at", nullable = false, updatable = false)
  private Instant createdAt;

  @Column(name = "updated_at", nullable = false)
  private Instant updatedAt;

  @Version
  @Column(name = "version", nullable = false)
  private Long version = 0L;

  public SettlementPaymentRequestEntity() {}

  public SettlementPaymentRequestEntity(
      UUID tripId,
      UUID payerId,
      UUID recipientId,
      UUID payoutAccountId,
      BigDecimal amount,
      String memo,
      String qrContent,
      String qrImageUrl,
      String bankCode,
      String maskedAccountNumber,
      String recipientAccountName,
      String idempotencyKey,
      Instant expiresAt) {
    this.tripId = Objects.requireNonNull(tripId, "tripId must not be null");
    this.payerId = Objects.requireNonNull(payerId, "payerId must not be null");
    this.recipientId = Objects.requireNonNull(recipientId, "recipientId must not be null");
    this.payoutAccountId =
        Objects.requireNonNull(payoutAccountId, "payoutAccountId must not be null");
    this.amount = Objects.requireNonNull(amount, "amount must not be null");
    this.currency = "VND";
    this.memo = Objects.requireNonNull(memo, "memo must not be null");
    this.qrContent = Objects.requireNonNull(qrContent, "qrContent must not be null");
    this.qrImageUrl = qrImageUrl;
    this.bankCode = Objects.requireNonNull(bankCode, "bankCode must not be null");
    this.maskedAccountNumber =
        Objects.requireNonNull(maskedAccountNumber, "maskedAccountNumber must not be null");
    this.recipientAccountName =
        Objects.requireNonNull(recipientAccountName, "recipientAccountName must not be null");
    this.idempotencyKey = Objects.requireNonNull(idempotencyKey, "idempotencyKey must not be null");
    this.expiresAt = Objects.requireNonNull(expiresAt, "expiresAt must not be null");
    this.status = PaymentRequestStatus.CREATED;
    this.id = UUID.randomUUID();
  }

  @PrePersist
  protected void onCreate() {
    if (id == null) {
      id = UUID.randomUUID();
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

  public UUID getId() {
    return id;
  }

  public void setId(UUID id) {
    this.id = id;
  }

  public UUID getTripId() {
    return tripId;
  }

  public UUID getPayerId() {
    return payerId;
  }

  public UUID getRecipientId() {
    return recipientId;
  }

  public UUID getPayoutAccountId() {
    return payoutAccountId;
  }

  public BigDecimal getAmount() {
    return amount;
  }

  public void setAmount(BigDecimal amount) {
    this.amount = amount;
  }

  public String getCurrency() {
    return currency;
  }

  public String getMemo() {
    return memo;
  }

  public String getQrContent() {
    return qrContent;
  }

  public String getQrImageUrl() {
    return qrImageUrl;
  }

  public void setQrImageUrl(String qrImageUrl) {
    this.qrImageUrl = qrImageUrl;
  }

  public String getBankCode() {
    return bankCode;
  }

  public String getMaskedAccountNumber() {
    return maskedAccountNumber;
  }

  public String getRecipientAccountName() {
    return recipientAccountName;
  }

  public String getIdempotencyKey() {
    return idempotencyKey;
  }

  public PaymentRequestStatus getStatus() {
    return status;
  }

  public void setStatus(PaymentRequestStatus status) {
    this.status = status;
  }

  public Instant getExpiresAt() {
    return expiresAt;
  }

  public void setExpiresAt(Instant expiresAt) {
    this.expiresAt = expiresAt;
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
