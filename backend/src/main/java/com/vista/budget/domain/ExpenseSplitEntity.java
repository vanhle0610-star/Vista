package com.vista.budget.domain;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.PrePersist;
import jakarta.persistence.Table;
import jakarta.persistence.UniqueConstraint;
import java.math.BigDecimal;
import java.util.UUID;

@Entity
@Table(
    name = "expense_splits",
    uniqueConstraints = {
      @UniqueConstraint(
          name = "uq_expense_splits_expense_user",
          columnNames = {"expense_id", "user_id"})
    })
public class ExpenseSplitEntity {

  @Id
  @Column(name = "id", nullable = false, updatable = false)
  private UUID id;

  @ManyToOne(fetch = FetchType.LAZY)
  @JoinColumn(name = "expense_id", nullable = false)
  private ExpenseEntity expense;

  @Column(name = "user_id", nullable = false)
  private UUID userId;

  @Column(name = "share_amount", nullable = false, precision = 15, scale = 2)
  private BigDecimal shareAmount;

  @Column(name = "settled_status", nullable = false, length = 20)
  private String settledStatus = "UNSETTLED";

  public ExpenseSplitEntity() {}

  public ExpenseSplitEntity(UUID userId, BigDecimal shareAmount) {
    this.id = UUID.randomUUID();
    this.userId = userId;
    this.shareAmount = shareAmount;
    this.settledStatus = "UNSETTLED";
  }

  public ExpenseSplitEntity(ExpenseEntity expense, UUID userId, BigDecimal shareAmount) {
    this.id = UUID.randomUUID();
    this.expense = expense;
    this.userId = userId;
    this.shareAmount = shareAmount;
    this.settledStatus = "UNSETTLED";
  }

  @PrePersist
  protected void onCreate() {
    if (this.id == null) {
      this.id = UUID.randomUUID();
    }
    if (this.settledStatus == null) {
      this.settledStatus = "UNSETTLED";
    }
  }

  public UUID getId() {
    return id;
  }

  public ExpenseEntity getExpense() {
    return expense;
  }

  public void setExpense(ExpenseEntity expense) {
    this.expense = expense;
  }

  public UUID getUserId() {
    return userId;
  }

  public void setUserId(UUID userId) {
    this.userId = userId;
  }

  public BigDecimal getShareAmount() {
    return shareAmount;
  }

  public void setShareAmount(BigDecimal shareAmount) {
    this.shareAmount = shareAmount;
  }

  public String getSettledStatus() {
    return settledStatus;
  }

  public void setSettledStatus(String settledStatus) {
    this.settledStatus = settledStatus;
  }
}
