package com.vista.community.infrastructure;

import static org.junit.jupiter.api.Assertions.*;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.sun.net.httpserver.HttpServer;
import java.net.InetSocketAddress;
import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import org.junit.jupiter.api.Test;
import org.springframework.web.ErrorResponseException;

class CommunityStorageTest {
  @Test
  void privateStorageProtocolSupportsModernAndLegacyServerKeys() throws Exception {
    for (String key : new String[] {"sb_secret_mock_server_key", "legacy-service-role-test-key"}) {
      var requests = new ArrayList<String>();
      var server = HttpServer.create(new InetSocketAddress("127.0.0.1", 0), 0);
      server.createContext(
          "/",
          exchange -> {
            assertEquals(key, exchange.getRequestHeaders().getFirst("apikey"));
            assertEquals(
                key.startsWith("sb_secret_") ? null : "Bearer " + key,
                exchange.getRequestHeaders().getFirst("Authorization"));
            requests.add(
                exchange.getRequestMethod()
                    + " "
                    + exchange.getRequestURI().getPath()
                    + " "
                    + new String(exchange.getRequestBody().readAllBytes(), StandardCharsets.UTF_8));
            byte[] bytes = "test-image".getBytes(StandardCharsets.UTF_8);
            exchange.sendResponseHeaders(200, bytes.length);
            exchange.getResponseBody().write(bytes);
            exchange.close();
          });
      server.start();
      try {
        var storage =
            new CommunityStorage(
                "http://127.0.0.1:" + server.getAddress().getPort(),
                key,
                "community",
                new ObjectMapper(),
                true);
        storage.upload("community/user/random.png", "image/png", new byte[] {1, 2, 3});
        assertArrayEquals(
            "test-image".getBytes(StandardCharsets.UTF_8),
            storage.read("community/user/random.png"));
        storage.delete("community/user/random.png");
        assertTrue(
            requests
                .get(0)
                .startsWith("POST /storage/v1/object/community/community/user/random.png"));
        assertTrue(
            requests
                .get(1)
                .startsWith("GET /storage/v1/object/community/community/user/random.png"));
        assertTrue(requests.get(2).contains("\"prefixes\":[\"community/user/random.png\"]"));
      } finally {
        server.stop(0);
      }
    }
  }

  @Test
  void missingConfigurationNeverReportsUploadSuccess() {
    var storage = new CommunityStorage("", "", "", new ObjectMapper());
    assertEquals(
        503,
        assertThrows(
                ErrorResponseException.class,
                () -> storage.upload("x", "image/png", new byte[] {1}))
            .getStatusCode()
            .value());
  }
}
