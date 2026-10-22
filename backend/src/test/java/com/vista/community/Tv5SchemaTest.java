package com.vista.community;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import java.sql.Connection;
import java.sql.DriverManager;
import java.sql.SQLException;
import java.util.UUID;
import org.flywaydb.core.Flyway;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.testcontainers.containers.PostgreSQLContainer;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;

/** Runs the actual baseline and delta in disposable PostgreSQL, never against configured DB_URL. */
@Testcontainers(disabledWithoutDocker = true)
class Tv5SchemaTest {
  @Container
  static final PostgreSQLContainer<?> POSTGRES = new PostgreSQLContainer<>("postgres:17-alpine");

  private Connection connection;
  private final UUID user = UUID.randomUUID();
  private final UUID trip = UUID.randomUUID();
  private final UUID post = UUID.randomUUID();

  @BeforeAll
  static void migrate() {
    Flyway.configure()
        .dataSource(POSTGRES.getJdbcUrl(), POSTGRES.getUsername(), POSTGRES.getPassword())
        .load()
        .migrate();
  }

  @BeforeEach
  void seed() throws Exception {
    connection =
        DriverManager.getConnection(
            POSTGRES.getJdbcUrl(), POSTGRES.getUsername(), POSTGRES.getPassword());
    connection.setAutoCommit(false);
    execute(
        "INSERT INTO users(id,email,password_hash,display_name) VALUES ('"
            + user
            + "','schema-test@example.invalid','test-only','Schema test')");
    execute(
        "INSERT INTO trips(id,owner_id,title,start_date,end_date) VALUES ('"
            + trip
            + "','"
            + user
            + "','Test',current_date,current_date)");
    execute("INSERT INTO posts(id,user_id,body) VALUES ('" + post + "','" + user + "','Test')");
  }

  @AfterEach
  void rollback() throws Exception {
    if (connection != null) {
      connection.rollback();
      connection.close();
    }
  }

  @Test
  void coordinatesRejectOutOfRangeAndMissingValues() throws Exception {
    String insert =
        "INSERT INTO checkins(trip_id,user_id,latitude,longitude) VALUES ('"
            + trip
            + "','"
            + user
            + "',";
    reject(insert + "91,0)", "23514");
    reject(insert + "0,-181)", "23514");
    reject(insert + "NULL,0)", "23502");
    execute(insert + "-90,180)");
    reject(
        "INSERT INTO meetup_points(trip_id,created_by,label,latitude,longitude) VALUES ('"
            + trip
            + "','"
            + user
            + "','Meet',0,181)",
        "23514");
  }

  @Test
  void foreignKeysAndDeletePoliciesArePreserved() throws Exception {
    reject(
        "INSERT INTO comments(post_id,user_id,body) VALUES ('"
            + UUID.randomUUID()
            + "','"
            + user
            + "','Test')",
        "23503");
    execute(
        "INSERT INTO comments(post_id,user_id,body) VALUES ('" + post + "','" + user + "','Test')");
    reject("DELETE FROM users WHERE id='" + user + "'", "23503");
    execute("DELETE FROM posts WHERE id='" + post + "'");
    assertThat(count("SELECT count(*) FROM comments")).isZero();
    execute(shareInsert());
    execute("DELETE FROM trips WHERE id='" + trip + "'");
    assertThat(count("SELECT count(*) FROM location_shares")).isZero();
  }

  @Test
  void moderationAndUserDeletionRemainIndependent() throws Exception {
    reject("UPDATE posts SET status='HIDDEN'", "23514");
    reject("UPDATE posts SET body='   '", "23514");
    execute("UPDATE posts SET status='HIDDEN',status_before_hidden='PENDING',deleted_at=now()");
    execute("UPDATE posts SET status=status_before_hidden,status_before_hidden=NULL");
    assertThat(
            count("SELECT count(*) FROM posts WHERE status='PENDING' AND deleted_at IS NOT NULL"))
        .isEqualTo(1);
    // Restore implementation must reject deleted posts; SQL preserves the deletion marker.
    assertThat(count("SELECT count(*) FROM posts WHERE status='VISIBLE' AND deleted_at IS NULL"))
        .isZero();
  }

  @Test
  void onlyOneCurrentShareAndDisabledCoordinatesAreRejected() throws Exception {
    execute(shareInsert());
    reject(shareInsert(), "23505");
    reject("UPDATE location_shares SET last_latitude=91", "23514");
    reject("UPDATE location_shares SET last_longitude=NULL", "23514");
    reject("UPDATE location_shares SET expires_at=started_at", "23514");
    reject("UPDATE location_shares SET enabled=false", "23514");
    execute(
        "UPDATE location_shares SET enabled=false,stopped_at=now(),"
            + "last_latitude=NULL,last_longitude=NULL,last_updated_at=NULL");
    assertThat(count("SELECT count(*) FROM location_shares WHERE last_latitude IS NOT NULL"))
        .isZero();
  }

  @Test
  void expiredCoordinatesAreExcludedAndCleanupRemovesThem() throws Exception {
    execute(
        "INSERT INTO location_shares(trip_id,user_id,enabled,started_at,expires_at,"
            + "last_latitude,last_longitude,last_updated_at) VALUES ('"
            + trip
            + "','"
            + user
            + "',true,now()-interval '2 hours',now()-interval '1 hour',"
            + "10,106,now()-interval '90 minutes')");
    assertThat(
            count(
                "SELECT count(*) FROM location_shares WHERE enabled AND stopped_at IS NULL "
                    + "AND expires_at > statement_timestamp() AND last_latitude IS NOT NULL"))
        .isZero();
    execute(
        "UPDATE location_shares SET enabled=false,stopped_at=expires_at,"
            + "last_latitude=NULL,last_longitude=NULL,last_updated_at=NULL "
            + "WHERE enabled AND expires_at <= statement_timestamp()");
    assertThat(count("SELECT count(*) FROM location_shares WHERE last_latitude IS NOT NULL"))
        .isZero();
  }

  private String shareInsert() {
    return "INSERT INTO location_shares(trip_id,user_id,enabled,expires_at,"
        + "last_latitude,last_longitude,last_updated_at) VALUES ('"
        + trip
        + "','"
        + user
        + "',true,now()+interval '1 hour',10,106,now())";
  }

  private void execute(String sql) throws SQLException {
    try (var statement = connection.createStatement()) {
      statement.execute(sql);
    }
  }

  private long count(String sql) throws SQLException {
    try (var statement = connection.createStatement();
        var result = statement.executeQuery(sql)) {
      result.next();
      return result.getLong(1);
    }
  }

  private void reject(String sql, String sqlState) throws SQLException {
    var savepoint = connection.setSavepoint();
    try {
      assertThatThrownBy(() -> execute(sql))
          .isInstanceOfSatisfying(
              SQLException.class, error -> assertThat(error.getSQLState()).isEqualTo(sqlState));
    } finally {
      connection.rollback(savepoint);
      connection.releaseSavepoint(savepoint);
    }
  }
}
