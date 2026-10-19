package com.vista.auth.infrastructure;

import com.vista.auth.domain.RoleEntity;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface RoleRepository extends JpaRepository<RoleEntity, UUID> {

  Optional<RoleEntity> findByCode(String code);
}
