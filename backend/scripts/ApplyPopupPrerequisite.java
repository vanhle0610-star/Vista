import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.security.MessageDigest;
import java.sql.Connection;
import java.sql.DriverManager;
import java.sql.SQLException;
import java.util.HexFormat;
import org.flywaydb.core.Flyway;

/** Explicit, single-migration rollout. Default mode inspects only; --apply requires user approval. */
public class ApplyPopupPrerequisite {
  static final String VERSION = "202611131200";
  static final String SCRIPT = "V202611131200__community_threads_feelings.sql";

  static long scalar(Connection connection, String sql) throws SQLException {
    try (var statement = connection.createStatement(); var rows = statement.executeQuery(sql)) {
      rows.next();
      return rows.getLong(1);
    }
  }

  static void require(boolean condition, String message) {
    if (!condition) throw new IllegalStateException(message);
  }

  public static void main(String[] args) throws Exception {
    boolean apply = args.length == 3 && "--apply".equals(args[2]);
    if (args.length < 2 || (args.length > 2 && !apply)) {
      throw new IllegalArgumentException("Expected migration source, isolated location, optional --apply");
    }
    var source = Path.of(args[0]).toAbsolutePath();
    require(source.getFileName().toString().equals(SCRIPT), "Unexpected migration file");
    var location = Path.of(args[1]).toAbsolutePath();
    Files.createDirectories(location);
    try (var files = Files.list(location)) {
      require(files.allMatch(p -> p.getFileName().toString().equals(SCRIPT)), "Location must contain only the approved migration");
    }
    Files.copy(source, location.resolve(SCRIPT), java.nio.file.StandardCopyOption.REPLACE_EXISTING);
    String sha = HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256").digest(Files.readAllBytes(source)));
    var url = System.getenv("DB_URL");
    var user = System.getenv("DB_USERNAME");
    var password = System.getenv("DB_PASSWORD");
    require(url != null && user != null && password != null, "Missing database configuration");
    try {
      long beforePosts, beforeComments, applied, columns;
      try (var connection = DriverManager.getConnection(url, user, password)) {
        connection.setAutoCommit(false);
        connection.setReadOnly(true);
        require(scalar(connection, "SELECT count(*) FROM information_schema.tables WHERE table_schema='public' AND table_name='flyway_schema_history'") == 1, "Missing Flyway history; do not baseline automatically");
        require(scalar(connection, "SELECT count(*) FROM public.flyway_schema_history WHERE NOT success") == 0, "Existing failed migration; inspect before rollout");
        applied = scalar(connection, "SELECT count(*) FROM public.flyway_schema_history WHERE version='" + VERSION + "' AND success");
        columns = scalar(connection, "SELECT count(*) FROM information_schema.columns WHERE table_schema='public' AND ((table_name='posts' AND column_name='feeling') OR (table_name='comments' AND column_name IN ('root_id','reply_to_id','client_request_id','request_hash')))");
        beforePosts = scalar(connection, "SELECT count(*) FROM public.posts");
        beforeComments = scalar(connection, "SELECT count(*) FROM public.comments");
        connection.rollback();
      }
      var flyway = Flyway.configure()
          .dataSource(url, user, password)
          .defaultSchema("public").schemas("public")
          .locations("filesystem:" + location.toString().replace('\\', '/'))
          .failOnMissingLocations(true).validateMigrationNaming(true)
          .outOfOrder(true).target(VERSION).validateOnMigrate(false)
          .initSql("SET lock_timeout='10s'; SET statement_timeout='60s'")
          .load();
      var all = flyway.info().all();
      var resolved = java.util.Arrays.stream(all)
          .filter(item -> item.getVersion() != null && VERSION.equals(item.getVersion().toString()))
          .findFirst().orElseThrow(() -> new IllegalStateException("Approved migration not resolved"));
      System.out.println("Resolved migration: " + resolved.getScript() + "; state=" + resolved.getState() + "; applied=" + applied + "; columns=" + columns);
      require(Path.of(resolved.getScript()).getFileName().toString().equals(SCRIPT), "Unexpected script for approved version");
      if (applied == 0) {
        require(columns == 0, "Partial/manual schema detected; do not overwrite or repair automatically");
        var pending = flyway.info().pending();
        require(pending.length == 1 && Path.of(pending[0].getScript()).getFileName().toString().equals(SCRIPT), "Only the approved migration may be pending in this isolated location");
      } else {
        require(columns == 5, "Flyway history/schema mismatch");
        try (var connection = DriverManager.getConnection(url, user, password);
             var statement = connection.prepareStatement("SELECT checksum FROM public.flyway_schema_history WHERE version=? AND success")) {
          statement.setString(1, VERSION);
          try (var rows = statement.executeQuery()) {
            rows.next();
            require(java.util.Objects.equals(rows.getObject(1), resolved.getChecksum()), "Applied migration checksum mismatch");
          }
        }
      }
      System.out.println("{\"phase\":\"preflight\",\"version\":\"" + VERSION + "\",\"sha256\":\"" + sha + "\",\"alreadyApplied\":" + (applied > 0) + ",\"metadataColumns\":" + columns + ",\"posts\":" + beforePosts + ",\"comments\":" + beforeComments + "}");
      if (!apply) return;
      int executed = applied > 0 ? 0 : flyway.migrate().migrationsExecuted;
      require(executed == (applied > 0 ? 0 : 1), "Unexpected number of migrations executed");
      try (var connection = DriverManager.getConnection(url, user, password)) {
        connection.setAutoCommit(false);
        connection.setReadOnly(true);
        require(scalar(connection, "SELECT count(*) FROM public.flyway_schema_history WHERE version='" + VERSION + "' AND success AND checksum=" + resolved.getChecksum()) == 1, "Successful migration history/checksum missing");
        require(scalar(connection, "SELECT count(*) FROM information_schema.columns WHERE table_schema='public' AND ((table_name='posts' AND column_name='feeling') OR (table_name='comments' AND column_name IN ('root_id','reply_to_id','client_request_id','request_hash')))") == 5, "Metadata columns missing after migration");
        require(scalar(connection, "SELECT count(*) FROM pg_constraint WHERE connamespace='public'::regnamespace AND conname IN ('ck_posts_feeling','uq_comments_id_post','fk_comments_root_post','fk_comments_reply_post','ck_comments_thread')") == 5, "Metadata constraints missing");
        require(scalar(connection, "SELECT count(*) FROM pg_indexes WHERE schemaname='public' AND indexname IN ('uq_comments_client_request','idx_comments_thread_visible')") == 2, "Metadata indexes missing");
        long posts = scalar(connection, "SELECT count(*) FROM public.posts");
        long comments = scalar(connection, "SELECT count(*) FROM public.comments");
        connection.rollback();
        System.out.println("{\"phase\":\"verified\",\"version\":\"" + VERSION + "\",\"migrationsExecuted\":" + executed + ",\"checksum\":" + resolved.getChecksum() + ",\"metadataColumns\":5,\"constraints\":5,\"indexes\":2,\"posts\":" + posts + ",\"comments\":" + comments + ",\"rowCountsUnchanged\":" + (posts == beforePosts && comments == beforeComments) + "}");
      }
    } catch (Exception error) {
      System.err.println("Migration command failed: " + error.getClass().getSimpleName()
          + (error instanceof SQLException sql ? " (SQLSTATE " + sql.getSQLState() + ")" : error instanceof IllegalStateException ? " — " + error.getMessage() : ""));
      System.exit(1);
    }
  }
}
