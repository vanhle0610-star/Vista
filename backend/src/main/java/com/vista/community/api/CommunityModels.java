package com.vista.community.api;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import java.time.Instant;
import java.util.List;
import java.util.UUID;

public final class CommunityModels {
  private CommunityModels() {}

  public record Author(UUID id, String displayName) {}

  public record Media(UUID id, String path) {}

  public record Post(
      UUID id,
      String body,
      long version,
      Instant createdAt,
      Instant updatedAt,
      Author author,
      UUID destinationId,
      List<Media> media) {}

  public record Comment(
      UUID id,
      UUID postId,
      String body,
      long version,
      Instant createdAt,
      Instant updatedAt,
      Author author) {}

  public record Page<T>(List<T> items, long total, int page, int size) {}

  public record CreatePost(
      String body, UUID destinationId, List<UUID> uploadIds, UUID clientRequestId) {}

  public record Edit(String body, @NotNull @Min(0) Long version) {}

  public record CreateComment(String body) {}

  public record Upload(UUID id, Instant expiresAt) {}
}
