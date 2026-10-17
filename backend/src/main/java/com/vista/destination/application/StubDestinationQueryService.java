package com.vista.destination.application;

import java.math.BigDecimal;
import java.util.Optional;
import java.util.UUID;
import org.springframework.stereotype.Service;

@Service
public class StubDestinationQueryService implements DestinationQueryService {
  @Override
  public Optional<DestinationSummary> findPublishedById(UUID id) {
    return Optional.of(
        new DestinationSummary(
            id,
            "Cầu Rồng Đà Nẵng",
            "Đà Nẵng",
            "Cảnh quan & Văn hóa",
            BigDecimal.ZERO,
            BigDecimal.ZERO,
            16.0611,
            108.2272));
  }
}
