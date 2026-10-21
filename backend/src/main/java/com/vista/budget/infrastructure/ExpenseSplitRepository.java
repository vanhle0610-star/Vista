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
}
