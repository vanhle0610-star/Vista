package com.vista.community.infrastructure;

import static com.vista.community.application.CommunityProblem.of;
import static org.springframework.http.HttpStatus.*;

import com.fasterxml.jackson.databind.ObjectMapper;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;
import java.util.List;
import java.util.Map;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;
import org.springframework.web.ErrorResponseException;

/** Private bucket access. The service role key and object keys never come from clients. */
@Component
public class CommunityStorage {
  private final String base;
  private final String key;
  private final String bucket;
  private final ObjectMapper json;
  private final boolean allowLoopback;
  private final HttpClient client =
      HttpClient.newBuilder().connectTimeout(Duration.ofSeconds(5)).build();

  @Autowired
  public CommunityStorage(
      @Value("${SUPABASE_URL:}") String base,
      @Value("${SUPABASE_SECRET_KEY:}") String secretKey,
      @Value("${SUPABASE_SERVICE_ROLE_KEY:}") String legacyKey,
      @Value("${COMMUNITY_STORAGE_BUCKET:}") String bucket,
      ObjectMapper json) {
    this(base, secretKey.isBlank() ? legacyKey : secretKey, bucket, json, false);
  }

  public CommunityStorage(String base, String key, String bucket, ObjectMapper json) {
    this(base, key, bucket, json, false);
  }

  CommunityStorage(
      String base, String key, String bucket, ObjectMapper json, boolean allowLoopback) {
    this.base = base.replaceAll("/+$", "");
    this.key = key;
    this.bucket = bucket;
    this.json = json;
    this.allowLoopback = allowLoopback && base.startsWith("http://127.0.0.1:");
  }

  public void requireConfigured() {
    if ((!base.startsWith("https://") && !allowLoopback)
        || key.isBlank()
        || !bucket.matches("[A-Za-z0-9_-]+"))
      throw of(
          SERVICE_UNAVAILABLE,
          "STORAGE_UNCONFIGURED",
          "Chức năng tải ảnh chưa được cấu hình. Nội dung đang soạn vẫn được giữ lại.");
  }

  private HttpRequest.Builder request(String suffix) {
    requireConfigured();
    var request =
        HttpRequest.newBuilder(URI.create(base + "/storage/v1/object/" + bucket + suffix))
            .timeout(Duration.ofSeconds(20))
            .header("apikey", key);
    if (!key.startsWith("sb_secret_")) request.header("Authorization", "Bearer " + key);
    return request;
  }

  public void upload(String path, String mime, byte[] bytes) {
    send(
        request("/" + path)
            .header("Content-Type", mime)
            .header("x-upsert", "false")
            .POST(HttpRequest.BodyPublishers.ofByteArray(bytes))
            .build(),
        false);
  }

  public byte[] read(String path) {
    return send(request("/" + path).GET().build(), false);
  }

  public void delete(String path) {
    try {
      send(
          request("")
              .header("Content-Type", "application/json")
              .method(
                  "DELETE",
                  HttpRequest.BodyPublishers.ofString(
                      json.writeValueAsString(Map.of("prefixes", List.of(path)))))
              .build(),
          true);
    } catch (ErrorResponseException ex) {
      throw ex;
    } catch (Exception ex) {
      throw of(
          SERVICE_UNAVAILABLE,
          "STORAGE_UNAVAILABLE",
          "Chưa dọn được ảnh. Hệ thống sẽ thử lại sau.");
    }
  }

  private byte[] send(HttpRequest request, boolean allowMissing) {
    try {
      var response = client.send(request, HttpResponse.BodyHandlers.ofByteArray());
      if (response.statusCode() >= 200 && response.statusCode() < 300) return response.body();
      if (allowMissing && response.statusCode() == 404) return new byte[0];
      throw of(
          SERVICE_UNAVAILABLE,
          "STORAGE_UNAVAILABLE",
          "Không truy cập được ảnh. Vui lòng thử lại sau.");
    } catch (ErrorResponseException ex) {
      throw ex;
    } catch (InterruptedException ex) {
      Thread.currentThread().interrupt();
      throw of(SERVICE_UNAVAILABLE, "STORAGE_INTERRUPTED", "Yêu cầu ảnh bị gián đoạn.");
    } catch (Exception ex) {
      throw of(
          SERVICE_UNAVAILABLE,
          "STORAGE_UNAVAILABLE",
          "Không kết nối được kho ảnh. Vui lòng thử lại.");
    }
  }
}
