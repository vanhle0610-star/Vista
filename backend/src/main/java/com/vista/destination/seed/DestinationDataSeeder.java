package com.vista.destination.seed;

import com.vista.destination.domain.Destination;
import com.vista.destination.domain.DestinationCategory;
import com.vista.destination.domain.Province;
import com.vista.destination.repository.DestinationCategoryRepository;
import com.vista.destination.repository.DestinationRepository;
import com.vista.destination.repository.ProvinceRepository;
import java.io.BufferedReader;
import java.io.InputStream;
import java.io.InputStreamReader;
import java.math.BigDecimal;
import java.nio.charset.StandardCharsets;
import java.text.Normalizer;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import java.util.regex.Pattern;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.CommandLineRunner;
import org.springframework.context.annotation.Profile;
import org.springframework.core.io.ClassPathResource;
import org.springframework.core.io.FileSystemResource;
import org.springframework.core.io.Resource;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

@Component
@Profile({"dev", "demo"})
public class DestinationDataSeeder implements CommandLineRunner {

  private static final Logger log = LoggerFactory.getLogger(DestinationDataSeeder.class);

  private final DestinationRepository destinationRepository;
  private final ProvinceRepository provinceRepository;
  private final DestinationCategoryRepository categoryRepository;

  public DestinationDataSeeder(
      DestinationRepository destinationRepository,
      ProvinceRepository provinceRepository,
      DestinationCategoryRepository categoryRepository) {
    this.destinationRepository = destinationRepository;
    this.provinceRepository = provinceRepository;
    this.categoryRepository = categoryRepository;
  }

  @Override
  @Transactional
  public void run(String... args) {
    log.info("Checking destination seed data...");

    Resource resource = new ClassPathResource("db/seed/demo_destinations_seed.csv");
    if (!resource.exists()) {
      resource = new FileSystemResource("database/seed/destinations/demo_destinations_seed.csv");
    }

    if (!resource.exists()) {
      log.warn("Destination seed CSV file not found. Skipping seeding.");
      return;
    }

    try (InputStream is = resource.getInputStream();
        BufferedReader reader =
            new BufferedReader(new InputStreamReader(is, StandardCharsets.UTF_8))) {

      String headerLine = reader.readLine();
      if (headerLine == null) {
        return;
      }

      String line;
      int insertedCount = 0;
      int skippedCount = 0;

      while ((line = reader.readLine()) != null) {
        if (line.trim().isEmpty()) {
          continue;
        }

        List<String> fields = parseCsvLine(line);
        if (fields.size() < 12) {
          log.warn("Skipping invalid CSV line: {}", line);
          continue;
        }

        String name = fields.get(0).trim();
        String provinceName = fields.get(1).trim();
        String categoryName = fields.get(2).trim();
        String latStr = fields.get(3).trim();
        String lngStr = fields.get(4).trim();
        String priceMinStr = fields.get(5).trim();
        String priceMaxStr = fields.get(6).trim();
        String openingHours = fields.get(7).trim();
        String sourceUrl = fields.get(8).trim();
        String verifiedAtStr = fields.get(9).trim();
        String description = fields.get(10).trim();
        String imageRef = fields.get(11).trim();

        String slug = toSlug(name);

        if (destinationRepository.existsBySlug(slug) || destinationRepository.existsByName(name)) {
          skippedCount++;
          continue;
        }

        Province province =
            provinceRepository
                .findByName(provinceName)
                .orElseGet(
                    () -> {
                      Province newProv =
                          new Province(provinceName, toSlug(provinceName), "VN-REGION");
                      return provinceRepository.save(newProv);
                    });

        DestinationCategory category =
            categoryRepository
                .findByName(categoryName)
                .orElseGet(
                    () -> {
                      DestinationCategory newCat =
                          new DestinationCategory(categoryName, "category-default");
                      return categoryRepository.save(newCat);
                    });

        Destination destination = new Destination();
        destination.setName(name);
        destination.setSlug(slug);
        destination.setProvince(province);
        destination.setCategory(category);
        destination.setDescription(description);

        if (!latStr.isBlank()) {
          destination.setLatitude(new BigDecimal(latStr));
        }
        if (!lngStr.isBlank()) {
          destination.setLongitude(new BigDecimal(lngStr));
        }
        if (!priceMinStr.isBlank()) {
          destination.setPriceMin(new BigDecimal(priceMinStr));
        }
        if (!priceMaxStr.isBlank()) {
          destination.setPriceMax(new BigDecimal(priceMaxStr));
        }

        destination.setOpeningHours(openingHours);
        destination.setSourceUrl(sourceUrl);
        if (!verifiedAtStr.isBlank()) {
          try {
            destination.setVerifiedAt(Instant.parse(verifiedAtStr));
          } catch (Exception e) {
            destination.setVerifiedAt(Instant.now());
          }
        }

        destination.setStatus("PUBLISHED");

        if (!imageRef.isBlank()) {
          destination.addImage(imageRef, name, 0);
        }

        destinationRepository.save(destination);
        insertedCount++;
      }

      log.info(
          "Destination seeding finished: {} inserted, {} already existed.",
          insertedCount,
          skippedCount);

    } catch (Exception e) {
      log.error("Failed to seed destination data from CSV: {}", e.getMessage(), e);
    }
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

  private static String toSlug(String input) {
    if (input == null || input.isBlank()) {
      return "";
    }
    String normalized =
        Normalizer.normalize(input, Normalizer.Form.NFD)
            .replaceAll("\\p{InCombiningDiacriticalMarks}+", "")
            .replace('đ', 'd')
            .replace('Đ', 'D');

    Pattern nonLatin = Pattern.compile("[^\\w-]");
    String slug =
        nonLatin
            .matcher(normalized.toLowerCase(Locale.ROOT).replaceAll("\\s+", "-"))
            .replaceAll("")
            .replaceAll("-+", "-")
            .replaceAll("^-|-$", "");

    return slug;
  }
}
