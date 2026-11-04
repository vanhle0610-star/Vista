package com.vista.destination.api.dto;

import com.fasterxml.jackson.annotation.JsonAlias;
import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import java.math.BigDecimal;
import java.util.List;
import java.util.UUID;

public record UpdateDestinationRequest(
    @NotBlank(message = "Tên điểm đến không được để trống") @Size(max = 200, message = "Tên điểm đến tối đa 200 ký tự") String name,
    String province,
    UUID provinceId,
    String category,
    UUID categoryId,
    String description,
    String imageUrl,
    List<String> imageUrls,
    @DecimalMin(value = "-90.0", message = "Vĩ độ phải từ -90 đến 90") @DecimalMax(value = "90.0", message = "Vĩ độ phải từ -90 đến 90") BigDecimal latitude,
    @DecimalMin(value = "-180.0", message = "Kinh độ phải từ -180 đến 180") @DecimalMax(value = "180.0", message = "Kinh độ phải từ -180 đến 180") BigDecimal longitude,
    @DecimalMin(value = "0.0", message = "Giá vé tối thiểu không được âm") BigDecimal priceMin,
    @DecimalMin(value = "0.0", message = "Giá vé tối đa không được âm") BigDecimal priceMax,
    Object openingHours,
    @JsonAlias({"source", "source_url"}) String sourceUrl,
    String status) {}
