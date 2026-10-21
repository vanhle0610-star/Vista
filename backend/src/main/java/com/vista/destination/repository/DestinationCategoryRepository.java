package com.vista.destination.repository;

import com.vista.destination.domain.DestinationCategory;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface DestinationCategoryRepository extends JpaRepository<DestinationCategory, UUID> {
  Optional<DestinationCategory> findByName(String name);
}
