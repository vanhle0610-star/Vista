package com.vista.community;

import static org.junit.jupiter.api.Assertions.*;

import com.vista.community.application.CommunityUploads;
import java.awt.image.BufferedImage;
import java.io.ByteArrayOutputStream;
import javax.imageio.ImageIO;
import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.web.ErrorResponseException;

class CommunityUploadValidationTest {
  @Test
  void acceptsActualPngAndRejectsSpoofedMime() throws Exception {
    var bytes = new ByteArrayOutputStream();
    ImageIO.write(new BufferedImage(2, 2, BufferedImage.TYPE_INT_RGB), "png", bytes);
    var valid = new MockMultipartFile("file", "safe.png", "image/png", bytes.toByteArray());
    assertEquals("image/png", CommunityUploads.validate(valid).mime());
    assertEquals(
        415,
        assertThrows(
                ErrorResponseException.class,
                () ->
                    CommunityUploads.validate(
                        new MockMultipartFile(
                            "file", "bad.jpg", "image/jpeg", bytes.toByteArray())))
            .getStatusCode()
            .value());
    assertEquals(
        415,
        assertThrows(
                ErrorResponseException.class,
                () ->
                    CommunityUploads.validate(
                        new MockMultipartFile(
                            "file", "bad.png", "image/png", "<script>".getBytes())))
            .getStatusCode()
            .value());
  }

  @Test
  void rejectsOversizeAndEmptyBeforeStorageAccess() {
    assertEquals(
        413,
        assertThrows(
                ErrorResponseException.class,
                () ->
                    CommunityUploads.validate(
                        new MockMultipartFile("file", "huge.png", "image/png", new byte[5242881])))
            .getStatusCode()
            .value());
    assertEquals(
        400,
        assertThrows(
                ErrorResponseException.class,
                () -> CommunityUploads.validate(new MockMultipartFile("file", new byte[0])))
            .getStatusCode()
            .value());
  }
}
