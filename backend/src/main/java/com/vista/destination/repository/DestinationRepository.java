package com.vista.destination.repository;

import com.vista.destination.domain.Destination;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

@Repository
public interface DestinationRepository
    extends JpaRepository<Destination, UUID>, JpaSpecificationExecutor<Destination> {

  @Query(
      "SELECT DISTINCT d FROM Destination d "
          + "LEFT JOIN FETCH d.province "
          + "LEFT JOIN FETCH d.category "
          + "LEFT JOIN FETCH d.images")
  List<Destination> findAllWithDetails();

  @Query(
      "SELECT DISTINCT d FROM Destination d "
          + "LEFT JOIN FETCH d.province "
          + "LEFT JOIN FETCH d.category "
          + "LEFT JOIN FETCH d.images "
          + "WHERE d.id = :id")
  Optional<Destination> findByIdWithDetails(@Param("id") UUID id);

  Optional<Destination> findByIdAndStatus(UUID id, String status);

  java.util.List<Destination> findAllByIdInAndStatus(java.util.Collection<UUID> ids, String status);

  boolean existsByIdAndStatus(UUID id, String status);

  Optional<Destination> findBySlug(String slug);

  boolean existsByName(String name);

  boolean existsBySlug(String slug);

  long countByStatus(String status);
}
