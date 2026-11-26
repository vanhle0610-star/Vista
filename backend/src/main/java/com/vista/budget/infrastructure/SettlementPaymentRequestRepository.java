package com.vista.budget.infrastructure;

import com.vista.budget.domain.SettlementPaymentRequestEntity;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

@Repository
public interface SettlementPaymentRequestRepository
    extends JpaRepository<SettlementPaymentRequestEntity, UUID> {

  Optional<SettlementPaymentRequestEntity> findByTripIdAndPayerIdAndRecipientIdAndIdempotencyKey(
      UUID tripId, UUID payerId, UUID recipientId, String idempotencyKey);

  List<SettlementPaymentRequestEntity> findByTripIdOrderByCreatedAtDesc(UUID tripId);

  @Query(
      "SELECT r FROM SettlementPaymentRequestEntity r "
          + "WHERE r.tripId = :tripId AND (r.payerId = :userId OR r.recipientId = :userId) "
          + "ORDER BY r.createdAt DESC")
  List<SettlementPaymentRequestEntity> findUserRequestsInTrip(
      @Param("tripId") UUID tripId, @Param("userId") UUID userId);

  @Query(
      "SELECT COUNT(r) > 0 FROM SettlementPaymentRequestEntity r "
          + "WHERE r.tripId = :tripId "
          + "AND r.status IN ("
          + "com.vista.budget.domain.PaymentRequestStatus.CREATED, "
          + "com.vista.budget.domain.PaymentRequestStatus.OPENED, "
          + "com.vista.budget.domain.PaymentRequestStatus.PAYER_MARKED_SENT)")
  boolean existsPendingSettlementRequestsByTripId(@Param("tripId") UUID tripId);
}
