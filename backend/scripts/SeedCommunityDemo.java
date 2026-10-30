import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.sql.DriverManager;
import java.sql.SQLException;

/** Explicit JDBC seed command; never runs as part of application startup. */
public class SeedCommunityDemo {
  public static void main(String[] args) {
    var url = System.getenv("DB_URL");
    var user = System.getenv("DB_USERNAME");
    var password = System.getenv("DB_PASSWORD");
    if (args.length != 1 || url == null || user == null || password == null) {
      System.err.println("Missing seed file or database configuration in backend/.env.");
      System.exit(1);
    }

    try (var connection = DriverManager.getConnection(url, user, password)) {
      connection.setAutoCommit(false);
      try (var statement = connection.createStatement()) {
        statement.execute(Files.readString(Path.of(args[0]), StandardCharsets.UTF_8));
        try (var rows = statement.executeQuery(
            "SELECT count(*) FROM posts WHERE id IN ('5d100000-0000-4000-8000-000000000001',"
                + "'5d100000-0000-4000-8000-000000000002','5d100000-0000-4000-8000-000000000003')"
                + " AND status='VISIBLE' AND deleted_at IS NULL")) {
          rows.next();
          if (rows.getInt(1) != 3) {
            throw new IllegalStateException("A demo post was hidden or deleted; existing edits were preserved.");
          }
        }
        boolean likesConfigured;
        try (var rows = statement.executeQuery("SELECT to_regclass('public.post_likes') IS NOT NULL")) {
          rows.next();
          likesConfigured = rows.getBoolean(1);
        }
        connection.commit();
        System.out.println("{\"demoPosts\":3,\"likesConfigured\":" + likesConfigured + "}");
      } catch (Exception error) {
        connection.rollback();
        throw error;
      }
    } catch (Exception error) {
      // Do not print JDBC credentials or environment values in diagnostics.
      System.err.println("Demo seed failed: " + error.getClass().getSimpleName()
          + (error instanceof SQLException sql ? " (SQLSTATE " + sql.getSQLState() + ")" : ""));
      System.exit(1);
    }
  }
}
