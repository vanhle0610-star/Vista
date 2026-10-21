package com.vista.budget.domain;

import jakarta.persistence.CascadeType;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Id;
import jakarta.persistence.OneToMany;
import jakarta.persistence.PrePersist;
import jakarta.persistence.Table;
import jakarta.persistence.Version;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

@Entity
@Table(name = "expenses")
public class ExpenseEntity {

  @Id
  @Column(name = "id", nullable = false, updatable = false)
  private UUID id;

  @Column(name = "trip_id", nullable = false)
  private UUID tripId;

  @Column(name = "title", nullable = false, length = 200)
  private String title;

  @Column(name = "amount", nullable = false, precision = 15, scale = 2)
  private BigDecimal amount;

  @JdbcTypeCode(SqlTypes.CHAR)
  @Column(name = "currency", nullable = false, length = 3)
  private String currency = "VND";

  @Column(name = "paid_by", nullable = false)
  private UUID paidBy;

  @Enumerated(EnumType.STRING)
  @Column(name = "category", length = 50)
  private ExpenseCategory category;

  @Column(name = "occurred_at", nullable = false)
  private Instant occurredAt;

  @Column(name = "status", nullable = false, length = 20)
  private String status = "ACTIVE";

  @Column(name = "created_at", nullable = false, updatable = false)
  private Instant createdAt;

  @Version
  @Column(name = "version", nullable = false)
  private Long version = 0L;

  @OneToMany(mappedBy = "expense", cascade = CascadeType.ALL, orphanRemoval = true)
  private List<ExpenseSplitEntity> splits = new ArrayList<>();

  public ExpenseEntity() {}

  public ExpenseEntity(
      UUID tripId,
      String title,
      BigDecimal amount,
      String currency,
      UUID paidBy,
      ExpenseCategory category,
      Instant occurredAt) {
    this.id = UUID.randomUUID();
    this.tripId = tripId;
    this.title = title;
    this.amount = amount;
    this.currency = currency != null ? currency : "VND";
    this.paidBy = paidBy;
    this.category = category;
    this.occurredAt = occurredAt != null ? occurredAt : Instant.now();
    this.status = "ACTIVE";
    this.version = 0L;
  }

  @PrePersist
  protected void onCreate() {
    if (this.id == null) {
      this.id = UUID.randomUUID();
    }
    if (this.createdAt == null) {
      this.createdAt = Instant.now();
    }
    if (this.occurredAt == null) {
      this.occurredAt = Instant.now();
    }
    if (this.currency == null) {
      this.currency = "VND";
    }
    if (this.status == null) {
      this.status = "ACTIVE";
    }
    if (this.version == null) {
      this.version = 0L;
    }
  }

  public UUID getId() {
    return id;
  }

  public UUID getTripId() {
    return tripId;
  }

  public void setTripId(UUID tripId) {
    this.tripId = tripId;
  }

  public String getTitle() {
    return title;
  }

  public void setTitle(String title) {
    this.title = title;
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

  public void setCurrency(String currency) {
    this.currency = currency;
  }

  public UUID getPaidBy() {
    return paidBy;
  }

  public void setPaidBy(UUID paidBy) {
    this.paidBy = paidBy;
  }

  public ExpenseCategory getCategory() {
    return category;
  }

  public void setCategory(ExpenseCategory category) {
    this.category = category;
  }

  public Instant getOccurredAt() {
    return occurredAt;
  }

  public void setOccurredAt(Instant occurredAt) {
    this.occurredAt = occurredAt;
  }

  public String getStatus() {
    return status;
  }

  public void setStatus(String status) {
    this.status = status;
  }

  public Instant getCreatedAt() {
    return createdAt;
  }

  public Long getVersion() {
    return version;
  }

  public List<ExpenseSplitEntity> getSplits() {
    return splits;
  }

  public void addSplit(ExpenseSplitEntity split) {
    this.splits.add(split);
    split.setExpense(this);
  }

  public void removeSplit(ExpenseSplitEntity split) {
    this.splits.remove(split);
    split.setExpense(null);
  }
}
