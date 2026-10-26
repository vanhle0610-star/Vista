package com.vista.community.api;

import com.vista.common.security.CurrentUserProvider;
import com.vista.community.api.CommunityModels.*;
import com.vista.community.application.CommunityService;
import com.vista.community.application.CommunityUploads;
import jakarta.validation.Valid;
import java.util.UUID;
import org.springframework.http.*;
import org.springframework.web.ErrorResponseException;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

@RestController
@RequestMapping("/api/v1")
public class CommunityController {
  private final CommunityService service;
  private final CommunityUploads uploads;
  private final CurrentUserProvider current;

  public CommunityController(
      CommunityService service, CommunityUploads uploads, CurrentUserProvider current) {
    this.service = service;
    this.uploads = uploads;
    this.current = current;
  }

  @GetMapping("/posts")
  public Page<Post> list(
      @RequestParam(defaultValue = "0") int page, @RequestParam(defaultValue = "20") int size) {
    return service.list(page, size);
  }

  @GetMapping("/posts/{id}")
  public Post detail(@PathVariable UUID id) {
    return service.detail(id);
  }

  @PostMapping("/posts")
  @ResponseStatus(HttpStatus.CREATED)
  public Post create(@RequestBody CreatePost body) {
    return service.create(current.getCurrentUserId(), body);
  }

  @PatchMapping("/posts/{id}")
  public Post edit(@PathVariable UUID id, @Valid @RequestBody Edit body) {
    return service.edit(current.getCurrentUserId(), id, body);
  }

  @DeleteMapping("/posts/{id}")
  @ResponseStatus(HttpStatus.NO_CONTENT)
  public void delete(@PathVariable UUID id) {
    service.delete(current.getCurrentUserId(), id);
  }

  @GetMapping("/posts/{id}/comments")
  public Page<Comment> comments(
      @PathVariable UUID id,
      @RequestParam(defaultValue = "0") int page,
      @RequestParam(defaultValue = "20") int size) {
    return service.comments(id, page, size);
  }

  @PostMapping("/posts/{id}/comments")
  public Comment addComment(@PathVariable UUID id, @RequestBody CreateComment body) {
    return service.addComment(current.getCurrentUserId(), id, body.body());
  }

  @PatchMapping("/posts/{id}/comments/{commentId}")
  public Comment editComment(
      @PathVariable UUID id, @PathVariable UUID commentId, @Valid @RequestBody Edit body) {
    return service.editComment(current.getCurrentUserId(), id, commentId, body);
  }

  @DeleteMapping("/posts/{id}/comments/{commentId}")
  @ResponseStatus(HttpStatus.NO_CONTENT)
  public void deleteComment(@PathVariable UUID id, @PathVariable UUID commentId) {
    service.deleteComment(current.getCurrentUserId(), id, commentId);
  }

  @PostMapping(value = "/post-uploads", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
  @ResponseStatus(HttpStatus.CREATED)
  public Upload upload(@RequestPart MultipartFile file) {
    return uploads.upload(current.getCurrentUserId(), file);
  }

  @DeleteMapping("/post-uploads/{id}")
  @ResponseStatus(HttpStatus.NO_CONTENT)
  public void cancel(@PathVariable UUID id) {
    uploads.cancel(current.getCurrentUserId(), id);
  }

  @GetMapping("/post-media/{id}")
  public ResponseEntity<byte[]> image(@PathVariable UUID id) {
    var image = uploads.read(id);
    return ResponseEntity.ok()
        .contentType(MediaType.parseMediaType(image.mime()))
        .cacheControl(CacheControl.noStore())
        .header("X-Content-Type-Options", "nosniff")
        .body(image.bytes());
  }

  @ExceptionHandler(ErrorResponseException.class)
  public ProblemDetail problem(ErrorResponseException ex) {
    return ex.getBody();
  }

  @ExceptionHandler(org.springframework.web.multipart.MaxUploadSizeExceededException.class)
  public ProblemDetail imageTooLarge() {
    return com.vista.community.application.CommunityProblem.of(
            HttpStatus.PAYLOAD_TOO_LARGE, "IMAGE_TOO_LARGE", "Mỗi ảnh tối đa 5 MiB.")
        .getBody();
  }
}
