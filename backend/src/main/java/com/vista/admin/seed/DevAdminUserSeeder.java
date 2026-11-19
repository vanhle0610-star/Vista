package com.vista.admin.seed;

import com.vista.auth.domain.RoleEntity;
import com.vista.auth.infrastructure.RoleRepository;
import com.vista.user.domain.UserEntity;
import com.vista.user.infrastructure.UserRepository;
import java.util.List;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.CommandLineRunner;
import org.springframework.context.annotation.Profile;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

@Component
@Profile({"dev", "demo"})
public class DevAdminUserSeeder implements CommandLineRunner {

  private static final Logger log = LoggerFactory.getLogger(DevAdminUserSeeder.class);

  private final UserRepository userRepository;
  private final RoleRepository roleRepository;
  private final PasswordEncoder passwordEncoder;

  public DevAdminUserSeeder(
      UserRepository userRepository,
      RoleRepository roleRepository,
      PasswordEncoder passwordEncoder) {
    this.userRepository = userRepository;
    this.roleRepository = roleRepository;
    this.passwordEncoder = passwordEncoder;
  }

  @Override
  @Transactional
  public void run(String... args) {
    RoleEntity adminRole = ensureRole("ADMIN");
    RoleEntity moderatorRole = ensureRole("MODERATOR");
    RoleEntity userRole = ensureRole("USER");

    String defaultHash = passwordEncoder.encode("Vista@2026");

    List<SeedAccount> demoAccounts =
        List.of(
            new SeedAccount(
                "admin@vista.vn",
                "Nguyễn Minh Quản Trị",
                "0901234567",
                "ACTIVE",
                "Quản trị viên hệ thống VISTA Travel.",
                List.of(adminRole, userRole)),
            new SeedAccount(
                "moderator.lan@vista.vn",
                "Trần Thị Ngọc Lan",
                "0912345678",
                "ACTIVE",
                "Kiểm duyệt viên nội dung điểm đến & cộng đồng miền Trung.",
                List.of(moderatorRole, userRole)),
            new SeedAccount(
                "moderator.hung@vista.vn",
                "Lê Quốc Hùng",
                "0987654321",
                "ACTIVE",
                "Kiểm duyệt viên phụ trách dữ liệu địa điểm phía Bắc.",
                List.of(moderatorRole, userRole)),
            new SeedAccount(
                "hoang.nam@gmail.com",
                "Phạm Hoàng Nam",
                "0934567890",
                "ACTIVE",
                "Đam mê du lịch bụi Tây Bắc và khám phá ẩm thực địa phương.",
                List.of(userRole)),
            new SeedAccount(
                "thu.ha.travel@gmail.com",
                "Vũ Thu Hà",
                "0978123456",
                "ACTIVE",
                "Yêu thích nghỉ dưỡng biển đảo Phú Quốc, Nha Trang, Đà Nẵng.",
                List.of(userRole)),
            new SeedAccount(
                "minh.khang@outlook.com",
                "Đặng Minh Khang",
                "0965432109",
                "LOCKED",
                "Tài khoản vi phạm quy tắc đăng tải nội dung quảng cáo spam.",
                List.of(userRole)));

    int inserted = 0;
    for (SeedAccount seed : demoAccounts) {
      if (!userRepository.existsByEmailIgnoreCase(seed.email())) {
        UserEntity entity = new UserEntity(seed.email(), defaultHash, seed.displayName());
        entity.setPhoneNumber(seed.phoneNumber());
        entity.setStatus(seed.status());
        entity.setBio(seed.bio());
        entity.setTravelPreferences("[\"Văn hóa\",\"Ẩm thực\",\"Thiên nhiên\"]");
        for (RoleEntity role : seed.roles()) {
          entity.addRole(role);
        }
        userRepository.save(entity);
        inserted++;
      }
    }

    if (inserted > 0) {
      log.info("Seeded {} demo user accounts for Admin User Management.", inserted);
    }
  }

  private RoleEntity ensureRole(String code) {
    return roleRepository
        .findByCode(code)
        .orElseGet(() -> roleRepository.save(new RoleEntity(code)));
  }

  private record SeedAccount(
      String email,
      String displayName,
      String phoneNumber,
      String status,
      String bio,
      List<RoleEntity> roles) {}
}
