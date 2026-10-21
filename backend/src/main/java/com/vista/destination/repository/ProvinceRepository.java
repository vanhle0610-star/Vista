package com.vista.destination.repository;

import com.vista.destination.domain.Province;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface ProvinceRepository extends JpaRepository<Province, UUID> {
  Optional<Province> findByName(String name);

  Optional<Province> findBySlug(String slug);
}
