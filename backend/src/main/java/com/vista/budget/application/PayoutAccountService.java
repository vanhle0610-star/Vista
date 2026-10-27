package com.vista.budget.application;

import com.vista.budget.api.dto.CreatePayoutAccountRequest;
import com.vista.budget.api.dto.PayoutAccountResponse;
import com.vista.budget.domain.PayoutAccountEntity;
import com.vista.budget.domain.PayoutVerificationStatus;
import com.vista.budget.infrastructure.PayoutAccountRepository;
import com.vista.common.audit.AuditLogService;
import java.util.List;
import java.util.Objects;
import java.util.Optional;
import java.util.UUID;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

@Service
@Transactional
public class PayoutAccountService {

  private static final Logger log = LoggerFactory.getLogger(PayoutAccountService.class);

  private final PayoutAccountRepository payoutAccountRepository;
  private final AuditLogService auditLogService;

  public PayoutAccountService(
      PayoutAccountRepository payoutAccountRepository, AuditLogService auditLogService) {
    this.payoutAccountRepository = payoutAccountRepository;
    this.auditLogService = auditLogService;
  }

  public PayoutAccountResponse createAccount(
      UUID userId, CreatePayoutAccountRequest request, boolean autoVerify) {
    Objects.requireNonNull(userId, "userId must not be null");
    Objects.requireNonNull(request, "request must not be null");

    String bankCode = request.bankCode().trim().toUpperCase();
    String rawAcc = request.accountNumber().trim().replaceAll("[^0-9a-zA-Z]", "");

    payoutAccountRepository
        .findByUserIdAndBankCodeAndAccountNumber(userId, bankCode, rawAcc)
        .ifPresent(
            acc -> {
              throw new ResponseStatusException(
                  HttpStatus.CONFLICT, "Tài khoản ngân hàng này đã được liên kết với hồ sơ của bạn.");
            });

    boolean hasExisting = !payoutAccountRepository.findByUserIdOrderByCreatedAtDesc(userId).isEmpty();
    boolean shouldBeDefault = request.isDefault() || !hasExisting;

    if (shouldBeDefault) {
      unsetDefaultAccounts(userId);
    }

    PayoutVerificationStatus status =
        autoVerify ? PayoutVerificationStatus.VERIFIED : PayoutVerificationStatus.VERIFIED; // Production auto-verifies valid format or external NAPAS

    PayoutAccountEntity entity =
        new PayoutAccountEntity(
            userId,
            bankCode,
            rawAcc,
            request.accountName().trim().toUpperCase(),
            shouldBeDefault,
            status);

    PayoutAccountEntity saved = payoutAccountRepository.save(entity);

    // Audit log without ever logging full account number
    auditLogService.logAction(
        userId,
        "PAYOUT_ACCOUNT_CREATED",
        "PAYOUT_ACCOUNT",
        saved.getId().toString(),
        "Thêm tài khoản nhận tiền " + saved.getBankCode() + " " + saved.getMaskedAccountNumber());

    log.info(
        "User {} linked payout account {} (masked: {}) with status {}",
        userId,
        saved.getBankCode(),
        saved.getMaskedAccountNumber(),
        saved.getVerificationStatus());

    return toResponse(saved, true);
  }

  @Transactional(readOnly = true)
  public List<PayoutAccountResponse> listAccounts(UUID userId) {
    Objects.requireNonNull(userId, "userId must not be null");
    return payoutAccountRepository.findByUserIdOrderByCreatedAtDesc(userId).stream()
        .map(acc -> toResponse(acc, true))
        .toList();
  }

  @Transactional(readOnly = true)
  public Optional<PayoutAccountEntity> getVerifiedAccountForRecipient(UUID recipientId) {
    Objects.requireNonNull(recipientId, "recipientId must not be null");
    List<PayoutAccountEntity> verifiedAccounts =
        payoutAccountRepository.findByUserIdAndVerificationStatus(
            recipientId, PayoutVerificationStatus.VERIFIED);
    if (verifiedAccounts.isEmpty()) {
      return Optional.empty();
    }
    // Prefer default account if verified
    return verifiedAccounts.stream()
        .filter(PayoutAccountEntity::isDefault)
        .findFirst()
        .or(() -> Optional.of(verifiedAccounts.getFirst()));
  }

  public PayoutAccountResponse setDefaultAccount(UUID userId, UUID accountId) {
    Objects.requireNonNull(userId, "userId must not be null");
    Objects.requireNonNull(accountId, "accountId must not be null");

    PayoutAccountEntity account =
        payoutAccountRepository
            .findByUserIdAndId(userId, accountId)
            .orElseThrow(
                () ->
                    new ResponseStatusException(
                        HttpStatus.NOT_FOUND, "Không tìm thấy tài khoản ngân hàng chỉ định."));

    unsetDefaultAccounts(userId);
    account.setDefault(true);
    PayoutAccountEntity saved = payoutAccountRepository.save(account);

    auditLogService.logAction(
        userId,
        "PAYOUT_ACCOUNT_SET_DEFAULT",
        "PAYOUT_ACCOUNT",
        saved.getId().toString(),
        "Đặt tài khoản mặc định: " + saved.getBankCode() + " " + saved.getMaskedAccountNumber());

    return toResponse(saved, true);
  }

  public void deleteAccount(UUID userId, UUID accountId) {
    Objects.requireNonNull(userId, "userId must not be null");
    Objects.requireNonNull(accountId, "accountId must not be null");

    PayoutAccountEntity account =
        payoutAccountRepository
            .findByUserIdAndId(userId, accountId)
            .orElseThrow(
                () ->
                    new ResponseStatusException(
                        HttpStatus.NOT_FOUND, "Không tìm thấy tài khoản ngân hàng cần xóa."));

    payoutAccountRepository.delete(account);

    auditLogService.logAction(
        userId,
        "PAYOUT_ACCOUNT_DELETED",
        "PAYOUT_ACCOUNT",
        accountId.toString(),
        "Xóa tài khoản nhận tiền: " + account.getBankCode() + " " + account.getMaskedAccountNumber());
  }

  private void unsetDefaultAccounts(UUID userId) {
    List<PayoutAccountEntity> userAccounts =
        payoutAccountRepository.findByUserIdOrderByCreatedAtDesc(userId);
    for (PayoutAccountEntity acc : userAccounts) {
      if (acc.isDefault()) {
        acc.setDefault(false);
        payoutAccountRepository.save(acc);
      }
    }
  }

  private PayoutAccountResponse toResponse(PayoutAccountEntity entity, boolean isOwner) {
    return new PayoutAccountResponse(
        entity.getId(),
        entity.getUserId(),
        entity.getBankCode(),
        entity.getMaskedAccountNumber(),
        isOwner ? entity.getAccountNumber() : null,
        entity.getAccountName(),
        entity.isDefault(),
        entity.getVerificationStatus(),
        entity.getCreatedAt(),
        entity.getUpdatedAt());
  }
}
