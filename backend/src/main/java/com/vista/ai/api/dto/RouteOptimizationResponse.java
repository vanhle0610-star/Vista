package com.vista.ai.api.dto;

import com.vista.budget.util.RouteOptimizer.DestinationPoint;
import java.util.List;

public record RouteOptimizationResponse(
    List<DestinationPoint> orderedRoute, double totalDistanceKm, double estimatedTaxiCostVnd) {}
