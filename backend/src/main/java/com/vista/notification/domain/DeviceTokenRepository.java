package com.vista.notification.domain;

import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

@Repository
public interface DeviceTokenRepository extends JpaRepository<DeviceTokenEntity, UUID> {

  /** Lấy toàn bộ token đang active của user (để gửi push). */
  List<DeviceTokenEntity> findByUserIdAndActiveTrue(UUID userId);

  Optional<DeviceTokenEntity> findByToken(String token);

  /** Vô hiệu hóa token khi user đăng xuất hoặc token hết hạn. */
  @Modifying
  @Query("UPDATE DeviceTokenEntity d SET d.active = false WHERE d.token = :token")
  int deactivateByToken(@Param("token") String token);

  /** Vô hiệu hóa token chỉ khi nó thuộc về user hiện tại (chống IDOR). */
  @Modifying
  @Query("UPDATE DeviceTokenEntity d SET d.active = false WHERE d.userId = :userId AND d.token = :token")
  int deactivateByUserAndToken(@Param("userId") UUID userId, @Param("token") String token);

  /** Vô hiệu hóa toàn bộ token của user (logout all devices). */
  @Modifying
  @Query("UPDATE DeviceTokenEntity d SET d.active = false WHERE d.userId = :userId")
  int deactivateAllByUserId(@Param("userId") UUID userId);
}
