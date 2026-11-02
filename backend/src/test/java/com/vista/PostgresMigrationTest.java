package com.vista;

import static org.assertj.core.api.Assertions.assertThat;

import com.vista.support.SupabaseStorageFixture;
import javax.sql.DataSource;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.testcontainers.containers.PostgreSQLContainer;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;

@Testcontainers(disabledWithoutDocker = true)
@SpringBootTest
class PostgresMigrationTest {
  @Container
  static final PostgreSQLContainer<?> POSTGRES =
      new PostgreSQLContainer<>("pgvector/pgvector:pg17");

  @DynamicPropertySource
  static void database(DynamicPropertyRegistry registry) {
    SupabaseStorageFixture.initialize(
        POSTGRES.getJdbcUrl(), POSTGRES.getUsername(), POSTGRES.getPassword());
    registry.add("spring.datasource.url", POSTGRES::getJdbcUrl);
    registry.add("spring.datasource.username", POSTGRES::getUsername);
    registry.add("spring.datasource.password", POSTGRES::getPassword);
    registry.add("spring.flyway.enabled", () -> true);
  }

  @Autowired DataSource dataSource;

  @Test
  void flywayCreatesCoreTables() throws Exception {
    try (var connection = dataSource.getConnection();
        var statement =
            connection.prepareStatement(
                "select count(*) from information_schema.tables where table_schema='public' and table_name='trips'");
        var result = statement.executeQuery()) {
      assertThat(result.next()).isTrue();
      assertThat(result.getInt(1)).isEqualTo(1);
    }
  }

  @Test
  void migrationsCreateMediaBucketAndStoragePolicies() throws Exception {
    try (var connection = dataSource.getConnection();
        var statement = connection.createStatement()) {
      try (var buckets =
          statement.executeQuery(
              "SELECT count(*) FROM storage.buckets WHERE id='vista-media' AND public")) {
        assertThat(buckets.next()).isTrue();
        assertThat(buckets.getInt(1)).isEqualTo(1);
      }
      try (var policies =
          statement.executeQuery(
              "SELECT count(*) FROM pg_policies WHERE schemaname='storage' AND tablename='objects'"
                  + " AND policyname IN ('Public Access vista-media', 'Allow Upload vista-media',"
                  + " 'Allow Update vista-media', 'Allow Delete vista-media')")) {
        assertThat(policies.next()).isTrue();
        assertThat(policies.getInt(1)).isEqualTo(4);
      }
    }
  }
}
