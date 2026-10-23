package com.vista.destination.repository;

import com.vista.destination.domain.Favorite;
import com.vista.destination.domain.FavoriteId;
import java.util.List;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface FavoriteRepository extends JpaRepository<Favorite, FavoriteId> {

  boolean existsByIdUserIdAndIdDestinationId(UUID userId, UUID destinationId);

  void deleteByIdUserIdAndIdDestinationId(UUID userId, UUID destinationId);

  List<Favorite> findByIdUserIdOrderByCreatedAtDesc(UUID userId);
}
