package com.vista.community.api;

import com.fasterxml.jackson.annotation.JsonSetter;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import java.time.Instant;
import java.util.List;
import java.util.UUID;

public final class CommunityModels {
  private CommunityModels() {}

  public record Author(UUID id, String displayName, String avatarUrl) {
    public Author(UUID id, String displayName) {
      this(id, displayName, null);
    }
  }

  public record CommunityPlace(
      UUID id, String name, String area, String imageUrl, Double latitude, Double longitude) {}

  public record Media(UUID id, String path) {}

  public record Post(
      UUID id,
      String body,
      long version,
      Instant createdAt,
      Instant updatedAt,
      Author author,
      UUID destinationId,
      List<Media> media,
      String feeling,
      long commentCount,
      CommunityPlace destination) {
    public Post(
        UUID id,
        String body,
        long version,
        Instant createdAt,
        Instant updatedAt,
        Author author,
        UUID destinationId,
        List<Media> media) {
      this(id, body, version, createdAt, updatedAt, author, destinationId, media, null, 0, null);
    }
  }

  public record Comment(
      UUID id,
      UUID postId,
      String body,
      long version,
      Instant createdAt,
      Instant updatedAt,
      Author author,
      UUID rootId,
      UUID replyToId,
      Author replyToAuthor,
      long replyCount,
      boolean deleted) {
    public Comment(
        UUID id,
        UUID postId,
        String body,
        long version,
        Instant createdAt,
        Instant updatedAt,
        Author author) {
      this(id, postId, body, version, createdAt, updatedAt, author, null, null, null, 0, false);
    }
  }

  public record PostLike(UUID postId, boolean liked, long likeCount) {}

  public record Page<T>(List<T> items, long total, int page, int size, Long commentCount) {
    public Page(List<T> items, long total, int page, int size) {
      this(items, total, page, size, null);
    }
  }

  public record CreatePost(
      String body, UUID destinationId, List<UUID> uploadIds, UUID clientRequestId, String feeling) {
    public CreatePost(String body, UUID destinationId, List<UUID> uploadIds, UUID clientRequestId) {
      this(body, destinationId, uploadIds, clientRequestId, null);
    }
  }

  public record Edit(String body, @NotNull @Min(0) Long version) {}

  /** PATCH metadata: absent preserves the old value, explicit null removes it. */
  public static final class PostEdit {
    public String body;

    @NotNull @Min(0) public Long version;

    private UUID destinationId;
    private String feeling;
    private boolean destinationSupplied;
    private boolean feelingSupplied;

    @JsonSetter("destinationId")
    public void setDestinationId(UUID value) {
      destinationId = value;
      destinationSupplied = true;
    }

    @JsonSetter("feeling")
    public void setFeeling(String value) {
      feeling = value;
      feelingSupplied = true;
    }

    public UUID destinationId() {
      return destinationId;
    }

    public String feeling() {
      return feeling;
    }

    public boolean destinationSupplied() {
      return destinationSupplied;
    }

    public boolean feelingSupplied() {
      return feelingSupplied;
    }
  }

  public record CreateComment(String body, UUID replyToId, UUID clientRequestId) {
    public CreateComment(String body) {
      this(body, null, null);
    }
  }

  public record Upload(UUID id, Instant expiresAt) {}
}
