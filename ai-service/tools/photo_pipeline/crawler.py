"""
VISTA Multi-Source Photo Crawler Module
Searches authentic photography using:
1. Wikimedia Commons API (Landmarks, Culture, Heritage, Beaches, Natural Landscapes)
2. Search Engine Crawler (Food, Cafes, Restaurants, Stays, Local POIs)
Zero-cost, zero-card, 100% open access.
"""

import re
import ssl
import json
import urllib.parse
import urllib.request
from typing import Optional, Dict, Any, List

SSL_CTX = ssl._create_unverified_context()
USER_AGENT = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36"


def _clean_poi_name_for_search(name: str, province: str) -> str:
    """Removes noise suffixes like '(Cơ sở 1)' or duplicate province names."""
    n = re.sub(r"\s*\([^)]*\)", "", name)
    n = re.sub(r"\s*-\s*" + re.escape(province), "", n, flags=re.IGNORECASE)
    n = re.sub(r"\s+", " ", n).strip()
    return n


def search_wikimedia_commons(query: str, timeout: int = 8) -> Optional[Dict[str, Any]]:
    """
    Searches Wikimedia Commons for high-resolution authentic photography.
    Returns dict with source_url, title, and attribution.
    """
    clean_q = re.sub(r"[^\w\s-]", " ", query).strip()
    url = (
        "https://commons.wikimedia.org/w/api.php?action=query"
        f"&generator=search&gsrnamespace=6&gsrsearch={urllib.parse.quote(clean_q)}"
        "&gsrlimit=3&prop=imageinfo&iiprop=url|extmetadata&iiurlwidth=1400&format=json"
    )
    req = urllib.request.Request(url, headers={"User-Agent": "VistaTravelPlatform/1.0 (contact@vista.vn)"})
    try:
        with urllib.request.urlopen(req, timeout=timeout, context=SSL_CTX) as resp:
            data = json.loads(resp.read().decode("utf-8"))
        pages = data.get("query", {}).get("pages", {})
        for pid, page in pages.items():
            infos = page.get("imageinfo", [])
            if not infos:
                continue
            info = infos[0]
            thumb_url = info.get("thumburl") or info.get("url")
            if not thumb_url:
                continue
            # Filter out non-photo files (.svg, .pdf, .ogv)
            if any(thumb_url.lower().endswith(ext) for ext in [".svg.png", ".svg", ".pdf", ".ogv"]):
                continue
            if "file-type-icons" in thumb_url or "assets/file-type" in thumb_url:
                continue

            title = page.get("title", "").replace("File:", "")
            return {
                "source_url": thumb_url,
                "title": title,
                "source": "WIKIMEDIA_COMMONS",
                "attribution": "Wikimedia Commons (CC-BY/Public Domain)"
            }
    except Exception:
        pass
    return None


def search_bing_images(query: str, timeout: int = 10) -> Optional[Dict[str, Any]]:
    """
    Searches public travel reviews and photography using search engine indexing.
    Extracts raw image URLs without banners.
    """
    url = f"https://www.bing.com/images/search?q={urllib.parse.quote(query)}&form=HDRSC2&first=1"
    req = urllib.request.Request(
        url,
        headers={
            "User-Agent": USER_AGENT,
            "Accept-Language": "vi-VN,vi;q=0.9,en-US;q=0.8,en;q=0.7",
            "Referer": "https://www.bing.com/"
        }
    )
    try:
        with urllib.request.urlopen(req, timeout=timeout, context=SSL_CTX) as resp:
            html = resp.read().decode("utf-8", errors="ignore")

        # Extract direct image urls from Bing's murl JSON attributes
        murls = re.findall(r'murl&quot;:&quot;(https?://[^&]+)&quot;', html)
        if not murls:
            murls = re.findall(r'\"murl\":\"(https?://[^\"]+)\"', html)

        # Filter out junk URLs or low-res thumbnails
        valid_urls = []
        for u in murls:
            u_low = u.lower()
            if any(bad in u_low for bad in ["logo", "icon", "banner", "avatar", "1x1", "placeholder", "badge"]):
                continue
            if any(u_low.endswith(ext) for ext in [".jpg", ".jpeg", ".png", ".webp", ".avif"]) or "resize" in u_low or "upload" in u_low:
                valid_urls.append(u)

        if valid_urls:
            return {
                "source_url": valid_urls[0],
                "candidate_urls": valid_urls,
                "title": query,
                "source": "WEB_TRAVEL_CRAWLER",
                "attribution": "Public Travel Review Index"
            }
    except Exception:
        pass
    return None


def find_best_photo_for_destination(name: str, province: str, category: str) -> Optional[Dict[str, Any]]:
    """
    Intelligent router selecting the best source based on POI category:
    - Landmarks / Nature -> Wikimedia Commons first, then Web Crawler.
    - Food / Stays / Cafes -> Web Crawler first, then Wikimedia.
    """
    clean_name = _clean_poi_name_for_search(name, province)
    is_food_or_cafe = any(k in category.lower() for k in ["ẩm thực", "ăn vặt", "nhà hàng", "cà phê", "cafe", "trà", "quán"])
    is_stay = any(k in category.lower() for k in ["khách sạn", "homestay", "resort", "nghỉ dưỡng", "hotel"])

    if is_food_or_cafe or is_stay:
        search_query = f"{clean_name} {province} {'ẩm thực đặc sản' if is_food_or_cafe else 'khách sạn nghỉ dưỡng'}"
        res = search_bing_images(search_query)
        if res:
            return res
        return search_bing_images(f"{clean_name} {province}")
    else:
        candidates = []
        res = search_wikimedia_commons(f"{clean_name} {province}") or search_wikimedia_commons(clean_name)
        if res and res.get("source_url"):
            candidates.append(res["source_url"])
        web_res = search_bing_images(f"{clean_name} {province} du lịch tham quan")
        if web_res:
            candidates.extend(web_res.get("candidate_urls", []))
        if candidates:
            return {
                "source_url": candidates[0],
                "candidate_urls": candidates,
                "title": clean_name,
                "source": "WIKIMEDIA_COMMONS" if res else "WEB_TRAVEL_CRAWLER",
                "attribution": res.get("attribution", "Public Travel Review Index") if res else "Public Travel Review Index"
            }
        return None
