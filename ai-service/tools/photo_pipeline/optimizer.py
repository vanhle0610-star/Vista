"""
VISTA Image Optimizer Module
Downloads raw images, strips EXIF, resizes to target aspect ratio (3:2),
and encodes to Google WebP format with high visual fidelity and low footprint.
"""

import io
import ssl
import urllib.request
from typing import Optional, Tuple
from PIL import Image, ImageOps

# Reusable unverified SSL context for diverse CDN sources
SSL_CTX = ssl._create_unverified_context()
DEFAULT_USER_AGENT = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36"


def download_and_optimize_image(
    source_url: str,
    target_size: Tuple[int, int] = (1200, 800),
    quality: int = 82,
    timeout: int = 12
) -> Optional[bytes]:
    """
    Downloads an image from source_url, optimizes it, and returns WebP bytes.
    Returns None if download or processing fails.
    """
    if not source_url or not source_url.startswith("http"):
        return None

    try:
        req = urllib.request.Request(
            source_url,
            headers={
                "User-Agent": DEFAULT_USER_AGENT,
                "Accept": "image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8",
                "Referer": "https://www.google.com/"
            }
        )
        with urllib.request.urlopen(req, timeout=timeout, context=SSL_CTX) as resp:
            content_type = resp.headers.get("Content-Type", "")
            # Verify basic image mime-type or payload
            raw_bytes = resp.read()

        if len(raw_bytes) < 4096:
            # File too small (probably an error page or 1x1 tracking pixel)
            return None

        # Open in Pillow
        img = Image.open(io.BytesIO(raw_bytes))

        # Auto-orient based on EXIF (prevents sideways phone photos)
        try:
            img = ImageOps.exif_transpose(img)
        except Exception:
            pass

        # Convert to RGB (dropping CMYK, palette, or transparency alpha if needed)
        if img.mode in ("RGBA", "LA") or (img.mode == "P" and "transparency" in img.info):
            # Fill background with white before RGB conversion if transparent
            bg = Image.new("RGB", img.size, (255, 255, 255))
            if img.mode != "RGBA":
                img = img.convert("RGBA")
            bg.paste(img, mask=img.split()[3])
            img = bg
        elif img.mode != "RGB":
            img = img.convert("RGB")

        # Smart crop to target aspect ratio (3:2 = 1.5)
        target_w, target_h = target_size
        target_ratio = target_w / target_h
        cur_w, cur_h = img.size
        cur_ratio = cur_w / cur_h

        if abs(cur_ratio - target_ratio) > 0.05:
            if cur_ratio > target_ratio:
                # Image is too wide -> crop left and right
                new_w = int(cur_h * target_ratio)
                left = (cur_w - new_w) // 2
                img = img.crop((left, 0, left + new_w, cur_h))
            else:
                # Image is too tall -> crop top and bottom slightly biased to upper center
                new_h = int(cur_w / target_ratio)
                top = int((cur_h - new_h) * 0.35)  # 35% from top to keep monuments/horizons
                img = img.crop((0, top, cur_w, top + new_h))

        # Resize with high-quality Lanczos resampling
        if img.size[0] > target_w:
            img = img.resize(target_size, Image.Resampling.LANCZOS)
        elif img.size[0] < 600:
            # If the image was very small, do not upscale aggressively
            pass
        else:
            img = img.resize(target_size, Image.Resampling.LANCZOS)

        # Encode to WebP
        out_buf = io.BytesIO()
        img.save(out_buf, format="WEBP", quality=quality, method=6)
        return out_buf.getvalue()

    except Exception as e:
        return None
