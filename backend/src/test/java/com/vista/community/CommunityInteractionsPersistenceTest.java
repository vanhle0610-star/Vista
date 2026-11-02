package com.vista.community;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.junit.jupiter.api.Assumptions.assumeTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

import com.vista.auth.api.dto.UserResponse;
import com.vista.community.api.CommunityModels.CreateComment;
import com.vista.community.api.CommunityModels.CreatePost;
import com.vista.community.api.CommunityModels.PostEdit;
import com.vista.community.application.CommunityService;
import com.vista.destination.application.DestinationQueryService;
import com.vista.destination.application.DestinationSummary;
import com.vista.user.application.UserService;
import java.sql.Connection;
import java.sql.DriverManager;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.junit.jupiter.api.AfterAll;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.core.io.ClassPathResource;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.datasource.SingleConnectionDataSource;
import org.springframework.jdbc.datasource.init.ResourceDatabasePopulator;
import org.springframework.web.ErrorResponseException;
import org.testcontainers.DockerClientFactory;
import org.testcontainers.containers.PostgreSQLContainer;

/** Uses disposable PostgreSQL, or an explicitly configured rollback-only isolated schema. */
class CommunityInteractionsPersistenceTest {
  static final PostgreSQLContainer<?> POSTGRES = new PostgreSQLContainer<>("postgres:17-alpine");
  private static String jdbcUrl;
  private static String jdbcUser;
  private static String jdbcPassword;

  private Connection connection;
  private JdbcTemplate db;
  private UserService users;
  private final UUID user = UUID.randomUUID();
  private final UUID otherUser = UUID.randomUUID();
  private final UUID post = UUID.randomUUID();

  @BeforeAll
  static void database() {
    if (System.getenv("TV5_TEST_JDBC_URL") != null) {
      assumeTrue(
          "true".equals(System.getenv("TV5_TEST_SCHEMA_ISOLATED")),
          "Explicit isolated-schema opt-in is required");
      jdbcUrl = System.getenv("TV5_TEST_JDBC_URL");
      jdbcUser = System.getenv("TV5_TEST_JDBC_USER");
      jdbcPassword = System.getenv("TV5_TEST_JDBC_PASSWORD");
    } else {
      assumeTrue(
          DockerClientFactory.instance().isDockerAvailable(),
          "No Docker or explicit rollback-only PostgreSQL test connection");
      POSTGRES.start();
      jdbcUrl = POSTGRES.getJdbcUrl();
      jdbcUser = POSTGRES.getUsername();
      jdbcPassword = POSTGRES.getPassword();
    }
  }

  @AfterAll
  static void stopContainer() {
    if (POSTGRES.isRunning()) POSTGRES.stop();
  }

  @BeforeEach
  void seed() throws Exception {
    connection = DriverManager.getConnection(jdbcUrl, jdbcUser, jdbcPassword);
    connection.setAutoCommit(false);
    db = new JdbcTemplate(new SingleConnectionDataSource(connection, true));
    String schema = "tv5_test_" + UUID.randomUUID().toString().replace("-", "");
    db.execute("CREATE SCHEMA " + schema);
    db.execute("SET LOCAL search_path TO " + schema + ", public");
    new ResourceDatabasePopulator(
            new ClassPathResource("db/migration/V202610171200__baseline_schema.sql"),
            new ClassPathResource("db/migration/V202611100900__tv5_community_week3.sql"),
            new ClassPathResource("db/migration/V202611111100__community_post_likes.sql"),
            new ClassPathResource("db/migration/V202611131200__community_threads_feelings.sql"))
        .populate(connection);
    db.update(
        "INSERT INTO users(id,email,password_hash,display_name) VALUES (?,?,?,?)",
        user,
        "first@example.invalid",
        "test-only",
        "First");
    db.update(
        "INSERT INTO users(id,email,password_hash,display_name) VALUES (?,?,?,?)",
        otherUser,
        "second@example.invalid",
        "test-only",
        "Second");
    db.update(
        "INSERT INTO posts(id,user_id,body,status) VALUES (?,?,?,'VISIBLE')",
        post,
        user,
        "Test post");
    users = mock(UserService.class);
    when(users.getProfile(any()))
        .thenAnswer(
            invocation ->
                new UserResponse(
                    invocation.getArgument(0),
                    "test@example.invalid",
                    "Tester",
                    null,
                    "ACTIVE",
                    List.of("USER")));
  }

  private CommunityService newService() {
    return new CommunityService(db, users, mock(DestinationQueryService.class));
  }

  @AfterEach
  void rollback() throws Exception {
    if (connection != null) {
      connection.rollback();
      connection.close();
    }
  }

  @Test
  void likesPersistAcrossRequestsAndRemainAccountScoped() {
    var service = newService();
    assertThat(service.setLiked(user, post, true).likeCount()).isEqualTo(1);
    assertThat(service.setLiked(user, post, true).likeCount()).isEqualTo(1);
    assertThat(service.likeState(otherUser, post).liked()).isFalse();
    assertThat(service.setLiked(otherUser, post, true).likeCount()).isEqualTo(2);

    var reloaded = newService();
    assertThat(reloaded.likeState(user, post).liked()).isTrue();
    assertThat(reloaded.setLiked(user, post, false).likeCount()).isEqualTo(1);
    assertThat(reloaded.setLiked(user, post, false).likeCount()).isEqualTo(1);
    assertThat(reloaded.likeState(otherUser, post).liked()).isTrue();
  }

  @Test
  void commentsCanBeReadFromANewServiceInstance() {
    var created = newService().addComment(user, post, "A persisted comment");
    var history = newService().comments(post, 0, 10);
    assertThat(history.total()).isEqualTo(1);
    assertThat(history.items()).extracting("id").containsExactly(created.id());
    assertThat(history.items()).extracting("body").containsExactly("A persisted comment");
    assertThat(history.items()).extracting("author.id").containsExactly(user);
  }

  @Test
  void replyToReplyStaysInTheRootThreadAndCountsIgnorePagination() {
    var service = newService();
    assertThatThrownBy(
            () ->
                service.createComment(
                    user,
                    post,
                    new CreateComment("Reply without retry key", UUID.randomUUID(), null)))
        .isInstanceOfSatisfying(
            ErrorResponseException.class,
            error -> assertThat(error.getStatusCode().value()).isEqualTo(400));
    var root =
        service.createComment(user, post, new CreateComment("Root", null, UUID.randomUUID()));
    var reply =
        service.createComment(
            otherUser, post, new CreateComment("Reply", root.id(), UUID.randomUUID()));
    var nested =
        service.createComment(
            user, post, new CreateComment("Reply to reply", reply.id(), UUID.randomUUID()));
    assertThat(reply.rootId()).isEqualTo(root.id());
    assertThat(nested.rootId()).isEqualTo(root.id());
    assertThat(nested.replyToId()).isEqualTo(reply.id());
    assertThat(nested.replyToAuthor().id()).isEqualTo(otherUser);
    var roots = service.comments(post, 0, 1);
    assertThat(roots.total()).isEqualTo(1);
    assertThat(roots.commentCount()).isEqualTo(3);
    assertThat(roots.items().getFirst().replyCount()).isEqualTo(2);
    assertThat(service.replies(post, root.id(), 0, 1).items()).hasSize(1);
    assertThat(service.replies(post, root.id(), 1, 1).items()).hasSize(1);
    assertThat(service.replies(post, root.id(), 0, 1).total()).isEqualTo(2);
    assertThat(service.detail(post).commentCount()).isEqualTo(3);
  }

  @Test
  void retryUsesTheSameSavedCommentAndDifferentPayloadIsRejected() {
    var service = newService();
    UUID request = UUID.randomUUID();
    var payload = new CreateComment("Same comment", null, request);
    var created = service.createComment(user, post, payload);
    assertThat(service.createComment(user, post, payload).id()).isEqualTo(created.id());
    assertThat(service.detail(post).commentCount()).isEqualTo(1);
    assertThatThrownBy(
            () -> service.createComment(user, post, new CreateComment("Different", null, request)))
        .isInstanceOfSatisfying(
            ErrorResponseException.class,
            error -> assertThat(error.getStatusCode().value()).isEqualTo(409));
  }

  @Test
  void deletedRootKeepsRepliesAndTombstoneWithoutCountingDeletedOrHiddenContent() {
    var service = newService();
    var root =
        service.createComment(
            user, post, new CreateComment("Sensitive old body", null, UUID.randomUUID()));
    var reply =
        service.createComment(
            otherUser, post, new CreateComment("Keep reply", root.id(), UUID.randomUUID()));
    var nested =
        service.createComment(
            user, post, new CreateComment("Keep nested", reply.id(), UUID.randomUUID()));
    assertThatThrownBy(() -> service.deleteComment(otherUser, post, root.id()))
        .isInstanceOfSatisfying(
            ErrorResponseException.class,
            error -> assertThat(error.getStatusCode().value()).isEqualTo(403));
    service.deleteComment(user, post, root.id());
    assertThat(service.comments(post, 0, 10).items().getFirst().body())
        .isEqualTo("Bình luận đã bị xóa");
    assertThat(service.comments(post, 0, 10).items().getFirst().deleted()).isTrue();
    assertThat(service.detail(post).commentCount()).isEqualTo(2);
    assertThat(service.replies(post, root.id(), 0, 10).items()).hasSize(2);
    assertThatThrownBy(
            () ->
                service.createComment(
                    otherUser,
                    post,
                    new CreateComment("Closed thread", reply.id(), UUID.randomUUID())))
        .isInstanceOf(ErrorResponseException.class);
    db.update("UPDATE comments SET status='HIDDEN' WHERE id=?", reply.id());
    assertThat(service.detail(post).commentCount()).isEqualTo(1);
    service.deleteComment(user, post, nested.id());
    assertThat(service.detail(post).commentCount()).isZero();
    assertThat(service.comments(post, 0, 10).items()).isEmpty();
  }

  @Test
  void crossPostReplyAndHiddenOrDeletedPostRejectWrites() {
    var service = newService();
    var root =
        service.createComment(user, post, new CreateComment("Root", null, UUID.randomUUID()));
    UUID otherPost = UUID.randomUUID();
    db.update(
        "INSERT INTO posts(id,user_id,body,status) VALUES (?,?,?,'VISIBLE')",
        otherPost,
        otherUser,
        "Other post");
    assertThatThrownBy(
            () ->
                service.createComment(
                    user, otherPost, new CreateComment("Cross post", root.id(), UUID.randomUUID())))
        .isInstanceOf(ErrorResponseException.class);
    db.update("UPDATE posts SET status='HIDDEN' WHERE id=?", otherPost);
    assertThatThrownBy(
            () ->
                service.createComment(
                    user, otherPost, new CreateComment("Hidden", null, UUID.randomUUID())))
        .isInstanceOf(ErrorResponseException.class);
    db.update("UPDATE posts SET deleted_at=now() WHERE id=?", otherPost);
    assertThatThrownBy(
            () ->
                service.createComment(
                    user, otherPost, new CreateComment("Deleted", null, UUID.randomUUID())))
        .isInstanceOf(ErrorResponseException.class);
    assertThat(service.detail(post).commentCount()).isEqualTo(1);
  }

  @Test
  void feelingPersistsAndOldPostsAndPublicProfilesStayCompatible() {
    var service = newService();
    var created =
        service.create(
            user, new CreatePost("Feeling post", null, List.of(), UUID.randomUUID(), "HAPPY"));
    assertThat(newService().detail(created.id()).feeling()).isEqualTo("HAPPY");
    assertThat(service.detail(post).feeling()).isNull();
    assertThatThrownBy(
            () ->
                service.create(
                    user,
                    new CreatePost("Invalid", null, List.of(), UUID.randomUUID(), "<script>")))
        .isInstanceOf(ErrorResponseException.class);
    var comment = service.addComment(user, post, "Before profile update");
    when(users.getProfile(user))
        .thenReturn(
            new UserResponse(
                user,
                "private@example.invalid",
                "Updated public name",
                "https://example.invalid/avatar.png",
                "ACTIVE",
                List.of("USER")));
    assertThat(newService().detail(post).author().displayName()).isEqualTo("Updated public name");
    var updated = newService().comments(post, 0, 10).items().getFirst();
    assertThat(updated.id()).isEqualTo(comment.id());
    assertThat(updated.author().avatarUrl()).isEqualTo("https://example.invalid/avatar.png");
    assertThat(updated.author().getClass().getRecordComponents())
        .extracting("name")
        .containsExactly("id", "displayName", "avatarUrl");
  }

  @Test
  void chosenPlaceAndFeelingPersistAndPatchPreservesOrRemovesMetadata() {
    UUID place = UUID.randomUUID();
    UUID province = UUID.randomUUID();
    UUID category = UUID.randomUUID();
    db.update("INSERT INTO provinces(id,name,slug) VALUES (?,'Test','tv5')", province);
    db.update("INSERT INTO destination_categories(id,name) VALUES (?,'Test')", category);
    db.update(
        "INSERT INTO destinations(id,province_id,category_id,name,slug,status) VALUES (?,?,?,'Public place','tv5-place','PUBLISHED')",
        place,
        province,
        category);
    var destinations = mock(DestinationQueryService.class);
    when(destinations.findPublishedById(place))
        .thenReturn(
            Optional.of(
                new DestinationSummary(
                    place, "Public place", "Test area", "Test", null, null, 16.0, 108.0)));
    var service = new CommunityService(db, users, destinations);
    var created =
        service.create(
            user, new CreatePost("With metadata", place, List.of(), UUID.randomUUID(), "EXCITED"));
    var reloaded = new CommunityService(db, users, destinations).detail(created.id());
    assertThat(reloaded.destinationId()).isEqualTo(place);
    assertThat(reloaded.destination().name()).isEqualTo("Public place");
    assertThat(reloaded.feeling()).isEqualTo("EXCITED");
    var patch = new PostEdit();
    patch.body = "Body only";
    patch.version = reloaded.version();
    var edited = service.editPost(user, created.id(), patch);
    assertThat(edited.destinationId()).isEqualTo(place);
    assertThat(edited.feeling()).isEqualTo("EXCITED");
    when(destinations.findPublishedById(place)).thenReturn(Optional.empty());
    assertThat(service.detail(created.id()).destination()).isNull();
    patch.version = edited.version();
    patch.setDestinationId(null);
    patch.setFeeling(null);
    edited = service.editPost(user, created.id(), patch);
    assertThat(edited.destinationId()).isNull();
    assertThat(edited.feeling()).isNull();
    assertThat(service.detail(post).destination()).isNull();
  }

  @Test
  void metadataRejectsUnavailablePlacesInvalidFeelingsOtherOwnersAndStaleVersions() {
    var service = newService();
    UUID unavailable = UUID.randomUUID();
    assertThatThrownBy(
            () ->
                service.create(
                    user,
                    new CreatePost(
                        "Invalid place", unavailable, List.of(), UUID.randomUUID(), "HAPPY")))
        .isInstanceOf(ErrorResponseException.class);
    var patch = new PostEdit();
    patch.body = "Update";
    patch.version = 0L;
    patch.setDestinationId(unavailable);
    assertThatThrownBy(() -> service.editPost(user, post, patch))
        .isInstanceOf(ErrorResponseException.class);
    patch.setDestinationId(null);
    patch.setFeeling("<script>");
    assertThatThrownBy(() -> service.editPost(user, post, patch))
        .isInstanceOf(ErrorResponseException.class);
    patch.setFeeling("GRATEFUL");
    assertThatThrownBy(() -> service.editPost(otherUser, post, patch))
        .isInstanceOf(ErrorResponseException.class);
    var changed = service.editPost(user, post, patch);
    assertThat(changed.feeling()).isEqualTo("GRATEFUL");
    assertThatThrownBy(() -> service.editPost(user, post, patch))
        .isInstanceOf(ErrorResponseException.class);
    assertThat(service.detail(post).feeling()).isEqualTo("GRATEFUL");
  }

  @Test
  void hiddenThreadDoesNotLeakItsRepliesThroughCountsOrIdempotentRetry() {
    var service = newService();
    var root =
        service.createComment(user, post, new CreateComment("Root", null, UUID.randomUUID()));
    var payload = new CreateComment("Reply", root.id(), UUID.randomUUID());
    service.createComment(otherUser, post, payload);
    assertThatThrownBy(
            () ->
                service.editComment(
                    otherUser,
                    post,
                    root.id(),
                    new com.vista.community.api.CommunityModels.Edit("Spoof edit", 0L)))
        .isInstanceOf(ErrorResponseException.class);
    db.update("UPDATE comments SET status='HIDDEN' WHERE id=?", root.id());
    assertThat(service.detail(post).commentCount()).isZero();
    assertThat(service.comments(post, 0, 10).commentCount()).isZero();
    assertThatThrownBy(() -> service.replies(post, root.id(), 0, 10))
        .isInstanceOf(ErrorResponseException.class);
    assertThatThrownBy(() -> service.createComment(otherUser, post, payload))
        .isInstanceOf(ErrorResponseException.class);
  }
}
