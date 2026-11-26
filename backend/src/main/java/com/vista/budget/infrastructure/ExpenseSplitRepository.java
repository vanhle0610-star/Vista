package com.vista.budget.infrastructure;

import com.vista.budget.domain.ExpenseSplitEntity;
import java.util.List;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface ExpenseSplitRepository extends JpaRepository<ExpenseSplitEntity, UUID> {

  List<ExpenseSplitEntity> findByExpenseId(UUID expenseId);

  List<ExpenseSplitEntity> findByUserId(UUID userId);

  List<ExpenseSplitEntity> findByUserIdAndSettledStatus(UUID userId, String settledStatus);

  @org.springframework.data.jpa.repository.Query(
      "SELECT COUNT(s) > 0 FROM ExpenseSplitEntity s "
          + "WHERE s.expense.tripId = :tripId "
          + "AND s.expense.status = 'ACTIVE' "
          + "AND UPPER(s.settledStatus) <> 'SETTLED'")
  boolean existsUnsettledSplitsByTripId(@org.springframework.data.repository.query.Param("tripId") UUID tripId);
}
