import json
import re
import os

WEB_FILE = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "web", "src", "data", "realDestinationsData.ts"))

from enrich_phu_quoc_destinations import PHU_QUOC_POIS

with open(WEB_FILE, "r", encoding="utf-8") as f:
    content = f.read()

count_before = content.count('"province": "Kiên Giang"')
print(f"[Sync Phú Quốc to Web] Current Kiên Giang places in realDestinationsData.ts: {count_before}")

# Find insertion point before ending array bracket "];"
insert_idx = content.rfind("];")
if insert_idx == -1:
    print("[Error] Could not find ending array bracket in realDestinationsData.ts")
    exit(1)

new_entries = []
for p in PHU_QUOC_POIS:
    if p["name"] in content:
        continue
    entry = f"""  {{
    "name": "{p['name']}",
    "province": "Kiên Giang",
    "category": "{p['category']}",
    "latitude": {p['latitude']},
    "longitude": {p['longitude']},
    "priceMin": {p['price_min']},
    "priceMax": {p['price_max']},
    "openingHours": "{p['hours'].get('all', '07:30-18:00')}",
    "description": "{p['desc']}",
    "image": "{p['image']}"
  }},"""
    new_entries.append(entry)

if new_entries:
    appended_block = "\n" + "\n".join(new_entries) + "\n"
    new_content = content[:insert_idx].rstrip() + "," + appended_block + content[insert_idx:]
    with open(WEB_FILE, "w", encoding="utf-8") as f:
        f.write(new_content)
    print(f"[Sync Phú Quốc to Web] Added {len(new_entries)} new Phú Quốc destinations to realDestinationsData.ts!")
else:
    print("[Sync Phú Quốc to Web] All Phú Quốc places already exist.")
