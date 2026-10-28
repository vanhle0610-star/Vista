package com.vista.budget.infrastructure;

import com.vista.budget.domain.PayoutAccountEntity;
import com.vista.budget.domain.PayoutVerificationStatus;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface PayoutAccountRepository extends JpaRepository<PayoutAccountEntity, UUID> {

  List<PayoutAccountEntity> findByUserIdOrderByCreatedAtDesc(UUID userId);

  Optional<PayoutAccountEntity> findByUserIdAndIsDefaultTrue(UUID userId);

  Optional<PayoutAccountEntity> findByUserIdAndId(UUID userId, UUID id);

  Optional<PayoutAccountEntity> findByUserIdAndBankCodeAndAccountNumber(
      UUID userId, String bankCode, String accountNumber);

  List<PayoutAccountEntity> findByUserIdAndVerificationStatus(
      UUID userId, PayoutVerificationStatus verificationStatus);
}
