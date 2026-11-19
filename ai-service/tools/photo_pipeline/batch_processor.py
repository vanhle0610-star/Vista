"""
VISTA Batch Photo Processor
Scans SQLite destinations, crawls authentic images, optimizes to WebP,
saves them to web/public/destinations/{id}.webp, and updates the database.
Includes resume checkpoints and polite rate limiting.
"""

import os
import sys
import time
import json
import sqlite3
import argparse
from pathlib import Path
from typing import Dict, Any, List

# Ensure parent directory is in path
CURRENT_DIR = Path(__file__).resolve().parent
AI_SERVICE_DIR = CURRENT_DIR.parent.parent
sys.path.insert(0, str(AI_SERVICE_DIR))

from tools.photo_pipeline.crawler import find_best_photo_for_destination
from tools.photo_pipeline.optimizer import download_and_optimize_image

DB_PATH = AI_SERVICE_DIR.parent / "database" / "vista_destinations.db"
OUTPUT_DIR = AI_SERVICE_DIR.parent / "web" / "public" / "destinations"
PROGRESS_FILE = AI_SERVICE_DIR / "data" / "photo_crawl_progress.json"


def ensure_db_columns(conn: sqlite3.Connection):
    """Adds photo metadata columns to destinations table if missing."""
    cur = conn.cursor()
    cur.execute("PRAGMA table_info(destinations)")
    cols = [r[1] for r in cur.fetchall()]
    if "photo_source" not in cols:
        cur.execute("ALTER TABLE destinations ADD COLUMN photo_source TEXT")
    if "photo_verified" not in cols:
        cur.execute("ALTER TABLE destinations ADD COLUMN photo_verified INTEGER DEFAULT 0")
    if "photo_updated_at" not in cols:
        cur.execute("ALTER TABLE destinations ADD COLUMN photo_updated_at TEXT")
    conn.commit()


def load_progress() -> Dict[str, Any]:
    if PROGRESS_FILE.exists():
        try:
            with open(PROGRESS_FILE, "r", encoding="utf-8") as f:
                return json.load(f)
        except Exception:
            pass
    return {"processed_ids": {}, "failed_ids": {}}


def save_progress(progress: Dict[str, Any]):
    PROGRESS_FILE.parent.mkdir(parents=True, exist_ok=True)
    with open(PROGRESS_FILE, "w", encoding="utf-8") as f:
        json.dump(progress, f, ensure_ascii=False, indent=2)


def process_destinations(province: str = "Kiên Giang", id_prefix: str = None, limit: int = 50, delay: float = 0.5):
    """
    Crawls and optimizes photos for destinations in the specified province or ID prefix.
    """
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    progress = load_progress()

    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    ensure_db_columns(conn)
    cur = conn.cursor()

    if id_prefix:
        cur.execute("""
            SELECT id, name, province, category, photo_url
            FROM destinations
            WHERE id LIKE ?
            ORDER BY id ASC
        """, (f"{id_prefix}%",))
    elif province.lower() == "all":
        cur.execute("""
            SELECT id, name, province, category, photo_url
            FROM destinations
            ORDER BY id ASC
        """)
    else:
        cur.execute("""
            SELECT id, name, province, category, photo_url
            FROM destinations
            WHERE province = ?
            ORDER BY id ASC
        """, (province,))

    rows = cur.fetchall()
    print(f"[BatchProcessor] Total destinations in '{province}': {len(rows)}")

    success_count = 0
    skip_count = 0
    fail_count = 0

    for r in rows:
        poi_id = r["id"]
        name = r["name"]
        prov = r["province"]
        cat = r["category"] or "Khám phá"
        cur_photo = r["photo_url"] or ""

        dest_file = OUTPUT_DIR / f"{poi_id}.webp"

        # Check if already processed and file exists
        if (dest_file.exists() and dest_file.stat().st_size > 5000) and (poi_id in progress["processed_ids"]):
            skip_count += 1
            continue

        if limit and (success_count + fail_count) >= limit:
            print(f"[BatchProcessor] Reached limit of {limit} operations. Stopping batch.")
            break

        print(f"\n[{success_count + fail_count + 1}] Processing: {name} ({prov}) | Cat: {cat}")
        found = find_best_photo_for_destination(name, prov, cat)

        if not found:
            print(f"  ❌ No photo found online for: {name}")
            progress["failed_ids"][poi_id] = {"name": name, "reason": "search_exhausted"}
            fail_count += 1
            save_progress(progress)
            time.sleep(delay)
            continue

        candidate_urls = found.get("candidate_urls") or [found["source_url"]]
        webp_bytes = None
        for cand_url in candidate_urls[:3]:
            print(f"  🔍 Trying: {cand_url[:70]}...")
            webp_bytes = download_and_optimize_image(cand_url)
            if webp_bytes and len(webp_bytes) >= 4096:
                break

        if not webp_bytes or len(webp_bytes) < 4096:
            print(f"  ❌ Image download or WebP optimization failed.")
            progress["failed_ids"][poi_id] = {"name": name, "reason": "download_optimize_failed"}
            fail_count += 1
        else:
            # Write optimized WebP file
            with open(dest_file, "wb") as f_out:
                f_out.write(webp_bytes)

            file_size_kb = len(webp_bytes) // 1024
            web_url = f"/destinations/{poi_id}.webp"

            # Update database
            cur.execute("""
                UPDATE destinations
                SET photo_url = ?, photo_source = ?, photo_verified = 1, photo_updated_at = datetime('now')
                WHERE id = ?
            """, (web_url, found["source"], poi_id))
            conn.commit()

            progress["processed_ids"][poi_id] = {
                "name": name,
                "file": f"{poi_id}.webp",
                "size_kb": file_size_kb,
                "source": found["source"],
                "attribution": found.get("attribution", "")
            }
            success_count += 1
            print(f"  ✅ Saved: {dest_file.name} ({file_size_kb} KB) -> Updated DB photo_url = {web_url}")

        save_progress(progress)
        time.sleep(delay)

    conn.close()
    print("\n" + "=" * 60)
    print(f"[BatchProcessor] Finished! Success: {success_count} | Skipped: {skip_count} | Failed: {fail_count}")
    print(f"Web images directory: {OUTPUT_DIR}")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="VISTA Batch Photo Processor")
    parser.add_argument("--province", type=str, default="Kiên Giang", help="Province to process or 'all'")
    parser.add_argument("--id-prefix", type=str, default=None, help="Process destinations starting with prefix (e.g. 'dest-pq-')")
    parser.add_argument("--limit", type=int, default=50, help="Max items to process in this run")
    parser.add_argument("--delay", type=float, default=0.4, help="Polite delay between requests in seconds")
    args = parser.parse_args()

    process_destinations(province=args.province, id_prefix=args.id_prefix, limit=args.limit, delay=args.delay)
