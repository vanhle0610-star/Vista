package com.vista.destination.application;

import java.util.Optional;
import java.util.UUID;

public interface DestinationQueryService {
  Optional<DestinationSummary> findPublishedById(UUID id);
}
