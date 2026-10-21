package com.vista.ai.api.dto;

import com.vista.budget.util.RouteOptimizer.DestinationPoint;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import java.util.List;

public record RouteOptimizationRequest(
    @NotNull(message = "Start point must not be null") DestinationPoint startPoint,
    @NotEmpty(message = "Destinations list must not be empty") List<DestinationPoint> destinations) {}
