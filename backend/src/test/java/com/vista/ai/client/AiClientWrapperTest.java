package com.vista.ai.client;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.vista.ai.config.AiProperties;
import java.io.IOException;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;
import java.util.Optional;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

class AiClientWrapperTest {

  @Test
  @DisplayName("Khi không có API key thì isAvailable trả về false và generateContent trả về empty")
  void testNoApiKeyReturnsEmpty() {
    AiProperties props =
        new AiProperties("gemini", "", "gemini-1.5-flash", Duration.ofSeconds(5), 1);
    AiClientWrapper wrapper = new AiClientWrapper(props);

    assertFalse(wrapper.isAvailable());
    Optional<String> result = wrapper.generateContent("Gợi ý lịch trình");
    assertTrue(result.isEmpty());
  }

  @Test
  @DisplayName("Khi có API key hợp lệ và Gemini trả về 200 thì trích xuất đúng nội dung text")
  @SuppressWarnings("unchecked")
  void testSuccessfulGeminiResponse() throws Exception {
    AiProperties props =
        new AiProperties("gemini", "dummy-api-key", "gemini-1.5-flash", Duration.ofSeconds(5), 1);
    HttpClient mockHttpClient = mock(HttpClient.class);
    HttpResponse<String> mockResponse = mock(HttpResponse.class);

    String geminiJson =
        """
        {
          "candidates": [
            {
              "content": {
                "parts": [
                  { "text": "{\\"tripTitle\\": \\"Khám phá Đà Nẵng\\"}" }
                ]
              }
            }
          ]
        }
        """;

    when(mockResponse.statusCode()).thenReturn(200);
    when(mockResponse.body()).thenReturn(geminiJson);
    when(mockHttpClient.send(any(HttpRequest.class), any(HttpResponse.BodyHandler.class)))
        .thenReturn(mockResponse);

    AiClientWrapper wrapper = new AiClientWrapper(props, mockHttpClient, new ObjectMapper());

    assertTrue(wrapper.isAvailable());
    Optional<String> result = wrapper.generateContent("Gợi ý lịch trình Đà Nẵng");
    assertTrue(result.isPresent());
    assertEquals("{\"tripTitle\": \"Khám phá Đà Nẵng\"}", result.get());
  }

  @Test
  @DisplayName("Khi Gemini API trả về lỗi HTTP 500 thì bắt lỗi êm đẹp và trả về empty")
  @SuppressWarnings("unchecked")
  void testHttpErrorReturnsEmpty() throws Exception {
    AiProperties props =
        new AiProperties("gemini", "dummy-api-key", "gemini-1.5-flash", Duration.ofSeconds(5), 1);
    HttpClient mockHttpClient = mock(HttpClient.class);
    HttpResponse<String> mockResponse = mock(HttpResponse.class);

    when(mockResponse.statusCode()).thenReturn(500);
    when(mockResponse.body()).thenReturn("Internal Server Error");
    when(mockHttpClient.send(any(HttpRequest.class), any(HttpResponse.BodyHandler.class)))
        .thenReturn(mockResponse);

    AiClientWrapper wrapper = new AiClientWrapper(props, mockHttpClient, new ObjectMapper());

    Optional<String> result = wrapper.generateContent("Gợi ý lịch trình");
    assertTrue(result.isEmpty());
  }

  @Test
  @DisplayName("Khi gặp sự cố mạng hoặc timeout thì không throw exception ra ngoài mà trả về empty")
  @SuppressWarnings("unchecked")
  void testNetworkExceptionReturnsEmpty() throws Exception {
    AiProperties props =
        new AiProperties("gemini", "dummy-api-key", "gemini-1.5-flash", Duration.ofSeconds(5), 1);
    HttpClient mockHttpClient = mock(HttpClient.class);

    when(mockHttpClient.send(any(HttpRequest.class), any(HttpResponse.BodyHandler.class)))
        .thenThrow(new IOException("Connection timed out"));

    AiClientWrapper wrapper = new AiClientWrapper(props, mockHttpClient, new ObjectMapper());

    Optional<String> result = wrapper.generateContent("Gợi ý lịch trình");
    assertTrue(result.isEmpty());
  }

  @Test
  @DisplayName("Retry có giới hạn khi Gemini lỗi tạm thời và thành công ở lần kế tiếp")
  @SuppressWarnings("unchecked")
  void testRetryableFailureThenSuccess() throws Exception {
    AiProperties props =
        new AiProperties("gemini", "dummy-api-key", "gemini-2.5-flash", Duration.ofSeconds(5), 1);
    HttpClient mockHttpClient = mock(HttpClient.class);
    HttpResponse<String> failedResponse = mock(HttpResponse.class);
    HttpResponse<String> successResponse = mock(HttpResponse.class);

    when(failedResponse.statusCode()).thenReturn(503);
    when(successResponse.statusCode()).thenReturn(200);
    when(successResponse.body())
        .thenReturn(
            "{\"candidates\":[{\"content\":{\"parts\":[{\"text\":\"valid-json\"}]}}]}");
    when(mockHttpClient.send(any(HttpRequest.class), any(HttpResponse.BodyHandler.class)))
        .thenReturn(failedResponse, successResponse);

    AiClientWrapper wrapper = new AiClientWrapper(props, mockHttpClient, new ObjectMapper());

    assertEquals(Optional.of("valid-json"), wrapper.generateContent("Lập lịch trình"));
    verify(mockHttpClient, times(2))
        .send(any(HttpRequest.class), any(HttpResponse.BodyHandler.class));
  }
}
