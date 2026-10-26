package com.vista.destination.domain;

import static org.assertj.core.api.Assertions.assertThat;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.io.BufferedReader;
import java.io.InputStream;
import java.io.InputStreamReader;
import java.nio.charset.StandardCharsets;
import java.time.LocalTime;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.regex.Pattern;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;
import org.springframework.core.io.ClassPathResource;

class OpeningHoursValidationTest {

  private static final ObjectMapper OBJECT_MAPPER = new ObjectMapper();
  private static final Set<String> DAYS_OF_WEEK =
      Set.of("mon", "tue", "wed", "thu", "fri", "sat", "sun");
  private static final Pattern TIME_RANGE_PATTERN =
      Pattern.compile("^(\\d{2}:\\d{2})\\s*-\\s*(\\d{2}:\\d{2})$");

  @Test
  @DisplayName(
      "W4-AI-CONSUMPTION: All 90 seed destinations must have valid 7-day opening hours JSON")
  void verifyAllSeedDestinationsHaveValidStructuredOpeningHours() throws Exception {
    ClassPathResource resource = new ClassPathResource("db/seed/demo_destinations_seed.csv");
    assertThat(resource.exists()).isTrue();

    int validatedCount = 0;

    try (InputStream is = resource.getInputStream();
        BufferedReader reader =
            new BufferedReader(new InputStreamReader(is, StandardCharsets.UTF_8))) {

      String headerLine = reader.readLine();
      assertThat(headerLine).isNotNull();

      String line;
      while ((line = reader.readLine()) != null) {
        if (line.trim().isEmpty()) {
          continue;
        }

        List<String> tokens = parseCsvLine(line);
        assertThat(tokens.size())
            .as("CSV line must have 12 columns: %s", line)
            .isGreaterThanOrEqualTo(12);

        String destinationName = tokens.get(0);
        String openingHoursJson = tokens.get(7);

        assertThat(openingHoursJson)
            .as("Opening hours JSON cannot be empty for %s", destinationName)
            .isNotBlank();

        Map<String, String> hoursMap =
            OBJECT_MAPPER.readValue(openingHoursJson, new TypeReference<>() {});

        // 1. Must contain all 7 days of the week
        assertThat(hoursMap.keySet())
            .as("Must specify all 7 days for destination %s", destinationName)
            .containsExactlyInAnyOrderElementsOf(DAYS_OF_WEEK);

        // 2. Validate value format for each day
        for (Map.Entry<String, String> entry : hoursMap.entrySet()) {
          String day = entry.getKey();
          String value = entry.getValue();

          assertThat(value)
              .as("Day %s in %s has empty opening hours", day, destinationName)
              .isNotBlank();

          if ("closed".equalsIgnoreCase(value) || "-".equals(value.trim())) {
            continue;
          }

          var matcher = TIME_RANGE_PATTERN.matcher(value);
          assertThat(matcher.matches())
              .as(
                  "Day %s in %s must match 'HH:mm-HH:mm' or 'closed', got: %s",
                  day, destinationName, value)
              .isTrue();

          String startTimeStr = matcher.group(1);
          String endTimeStr = matcher.group(2);

          LocalTime startTime = LocalTime.parse(startTimeStr, DateTimeFormatter.ofPattern("HH:mm"));
          LocalTime endTime = LocalTime.parse(endTimeStr, DateTimeFormatter.ofPattern("HH:mm"));

          // Allow 00:00 - 23:59 for 24/7 or valid ranges
          if (!value.replaceAll("\\s+", "").equals("00:00-23:59")) {
            assertThat(startTime)
                .as("Start time cannot be after end time for %s on %s", destinationName, day)
                .isBeforeOrEqualTo(endTime);
          }
        }

        validatedCount++;
      }
    }

    assertThat(validatedCount)
        .as("Must validate at least 90 seed destinations")
        .isGreaterThanOrEqualTo(90);
  }

  @ParameterizedTest
  @ValueSource(
      strings = {
        "{\"mon\":\"07:30-17:00\",\"tue\":\"07:30-17:00\",\"wed\":\"07:30-17:00\",\"thu\":\"07:30-17:00\",\"fri\":\"07:30-17:00\",\"sat\":\"07:30-17:00\",\"sun\":\"closed\"}",
        "{\"mon\":\"00:00-23:59\",\"tue\":\"00:00-23:59\",\"wed\":\"00:00-23:59\",\"thu\":\"00:00-23:59\",\"fri\":\"00:00-23:59\",\"sat\":\"00:00-23:59\",\"sun\":\"00:00-23:59\"}"
      })
  @DisplayName("Opening hours parser safely handles 24/7 and closed schedules for AI")
  void handlesSpecialSchedules(String json) throws Exception {
    Map<String, String> parsed = OBJECT_MAPPER.readValue(json, new TypeReference<>() {});
    assertThat(parsed).hasSize(7);
  }

  private static List<String> parseCsvLine(String line) {
    List<String> tokens = new ArrayList<>();
    StringBuilder sb = new StringBuilder();
    boolean inQuotes = false;

    for (int i = 0; i < line.length(); i++) {
      char c = line.charAt(i);
      if (c == '"') {
        if (inQuotes && i + 1 < line.length() && line.charAt(i + 1) == '"') {
          sb.append('"');
          i++;
        } else {
          inQuotes = !inQuotes;
        }
      } else if (c == ',' && !inQuotes) {
        tokens.add(sb.toString());
        sb.setLength(0);
      } else {
        sb.append(c);
      }
    }
    tokens.add(sb.toString());
    return tokens;
  }
}
