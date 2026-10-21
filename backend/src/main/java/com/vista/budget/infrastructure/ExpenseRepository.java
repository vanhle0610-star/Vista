package com.vista.budget.infrastructure;

import com.vista.budget.domain.ExpenseEntity;
import java.math.BigDecimal;
import java.util.List;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

@Repository
public interface ExpenseRepository extends JpaRepository<ExpenseEntity, UUID> {

  List<ExpenseEntity> findByTripIdOrderByOccurredAtDesc(UUID tripId);

  List<ExpenseEntity> findByTripIdAndStatusOrderByOccurredAtDesc(UUID tripId, String status);

  @Query(
      "SELECT COALESCE(SUM(e.amount), 0) FROM ExpenseEntity e WHERE e.tripId = :tripId AND e.status = 'ACTIVE'")
  BigDecimal sumAmountByTripId(@Param("tripId") UUID tripId);

  List<ExpenseEntity> findByPaidBy(UUID paidBy);
}
