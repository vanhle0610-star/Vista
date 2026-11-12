package com.vista.community;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.argThat;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

import com.vista.auth.application.JwtTokenService;
import com.vista.common.security.CurrentUserProvider;
import com.vista.common.security.SecurityConfiguration;
import com.vista.common.web.GlobalExceptionHandler;
import com.vista.community.api.CommunityController;
import com.vista.community.api.CommunityModels.*;
import com.vista.community.application.CommunityService;
import com.vista.community.application.CommunityUploads;
import java.time.Instant;
import java.util.List;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

@WebMvcTest(CommunityController.class)
@Import({SecurityConfiguration.class, GlobalExceptionHandler.class})
class CommunityInteractionsControllerTest {
  @Autowired private MockMvc mvc;
  @MockitoBean private CommunityService service;
  @MockitoBean private CommunityUploads uploads;
  @MockitoBean private CurrentUserProvider current;
  @MockitoBean private JwtTokenService tokens;

  private final UUID postId = UUID.randomUUID();
  private final UUID userId = UUID.randomUUID();

  @BeforeEach
  void identity() {
    when(current.getCurrentUserId()).thenReturn(userId);
  }

  @Test
  void guestsCannotReadPersonalLikeStateOrChangeLikes() throws Exception {
    mvc.perform(get("/api/v1/posts/{id}/like", postId)).andExpect(status().isUnauthorized());
    mvc.perform(put("/api/v1/posts/{id}/like", postId)).andExpect(status().isUnauthorized());
    mvc.perform(delete("/api/v1/posts/{id}/like", postId)).andExpect(status().isUnauthorized());
    verifyNoInteractions(service);
  }

  @Test
  @WithMockUser
  void likeUsesAuthenticatedAccountAndReturnsPersistedState() throws Exception {
    when(service.setLiked(userId, postId, true)).thenReturn(new PostLike(postId, true, 2));
    mvc.perform(
            put("/api/v1/posts/{id}/like", postId)
                .header("X-User-Id", UUID.randomUUID().toString()))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.liked").value(true))
        .andExpect(jsonPath("$.likeCount").value(2));
    verify(service).setLiked(userId, postId, true);
  }

  @Test
  @WithMockUser
  void reloadReadsLikeStateForTheAuthenticatedAccount() throws Exception {
    when(service.likeState(userId, postId)).thenReturn(new PostLike(postId, true, 1));
    mvc.perform(get("/api/v1/posts/{id}/like", postId))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.postId").value(postId.toString()))
        .andExpect(jsonPath("$.liked").value(true));
    verify(service).likeState(userId, postId);
  }

  @Test
  @WithMockUser
  void unlikeOnlyRemovesTheAuthenticatedAccountsLike() throws Exception {
    when(service.setLiked(userId, postId, false)).thenReturn(new PostLike(postId, false, 1));
    mvc.perform(delete("/api/v1/posts/{id}/like", postId))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.liked").value(false))
        .andExpect(jsonPath("$.likeCount").value(1));
    verify(service).setLiked(userId, postId, false);
  }

  @Test
  @WithMockUser
  void commentResponseContainsTheSavedCommentForImmediateDisplay() throws Exception {
    var now = Instant.now();
    var comment =
        new Comment(
            UUID.randomUUID(), postId, "New comment", 0, now, now, new Author(userId, "Tester"));
    when(service.createComment(userId, postId, new CreateComment("New comment")))
        .thenReturn(comment);
    mvc.perform(
            post("/api/v1/posts/{id}/comments", postId)
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"body\":\"New comment\"}"))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.id").value(comment.id().toString()))
        .andExpect(jsonPath("$.body").value("New comment"))
        .andExpect(jsonPath("$.author.id").value(userId.toString()));
  }

  @Test
  void commentHistoryRemainsPublicAndSupportsPagination() throws Exception {
    when(service.comments(postId, 1, 10)).thenReturn(new Page<>(List.of(), 12, 1, 10));
    mvc.perform(get("/api/v1/posts/{id}/comments?page=1&size=10", postId))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.total").value(12))
        .andExpect(jsonPath("$.page").value(1));
    verify(service).comments(postId, 1, 10);
  }

  @Test
  void guestsCannotCreateComments() throws Exception {
    mvc.perform(
            post("/api/v1/posts/{id}/comments", postId)
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"body\":\"New comment\"}"))
        .andExpect(status().isUnauthorized());
    verify(service, never()).createComment(any(), any(), any());
  }

  @Test
  @WithMockUser
  void postPatchDistinguishesOmittedAndExplicitNullMetadata() throws Exception {
    mvc.perform(
            patch("/api/v1/posts/{id}", postId)
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"body\":\"Keep metadata\",\"version\":0}"))
        .andExpect(status().isOk());
    verify(service)
        .editPost(
            eq(userId), eq(postId), argThat(p -> !p.destinationSupplied() && !p.feelingSupplied()));
    mvc.perform(
            patch("/api/v1/posts/{id}", postId)
                .contentType(MediaType.APPLICATION_JSON)
                .content(
                    "{\"body\":\"Remove metadata\",\"version\":0,\"destinationId\":null,\"feeling\":null}"))
        .andExpect(status().isOk());
    verify(service)
        .editPost(
            eq(userId),
            eq(postId),
            argThat(
                p ->
                    p.destinationSupplied()
                        && p.destinationId() == null
                        && p.feelingSupplied()
                        && p.feeling() == null));
  }
}
