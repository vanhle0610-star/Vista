package com.vista.budget.api.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

public record CreatePayoutAccountRequest(
    @NotBlank(message = "bankCode must not be blank")
    @Size(min = 2, max = 20, message = "bankCode must be between 2 and 20 characters")
    String bankCode,

    @NotBlank(message = "accountNumber must not be blank")
    @Pattern(regexp = "^[0-9a-zA-Z]{6,30}$", message = "accountNumber must be between 6 and 30 alphanumeric characters")
    String accountNumber,

    @NotBlank(message = "accountName must not be blank")
    @Size(min = 2, max = 150, message = "accountName must be between 2 and 150 characters")
    String accountName,

    boolean isDefault
) {}
