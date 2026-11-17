#!/usr/bin/env python3
"""Build public GG Coins ranking. Export names and balances only, never contacts."""
import csv
import io
import json
import os
from datetime import datetime, timezone
from pathlib import Path
from urllib.request import Request, urlopen

SHEET_ID = "1S2c4DtCYXHeF1FyBV31XCZZLPVFS9qBIdWyJ8dOS6PE"
SHEETS = {"operators": "0", "aup": "1528848510"}

def number(value):
    try:
        result = float(str(value or "0").strip().replace(" ", "").replace("\u00a0", "").replace(",", "."))
        if not (float("-inf") < result < float("inf")):
            return 0
        return int(result) if result.is_integer() else result
    except ValueError:
        return 0

def load(gid):
    url = f"https://docs.google.com/spreadsheets/d/{SHEET_ID}/export?format=csv&gid={gid}"
    request = Request(url, headers={"User-Agent": "GGCoins-RatingUpdater/1.0"})
    with urlopen(request, timeout=30) as response:
        text = response.read().decode("utf-8-sig")
    return list(csv.reader(io.StringIO(text)))

def parse(rows, group, earned_idx, spent_idx, balance_idx):
    result=[]
    for row in rows[1:]:
        if not row or not row[0].strip():
            continue
        needed=max(earned_idx,spent_idx,balance_idx)
        if len(row) <= needed:
            row = row + [""] * (needed + 1 - len(row))
        result.append({
            "group":group,"name":row[0].strip(),
            "earned":number(row[earned_idx]),"spent":number(row[spent_idx]),
            "balance":number(row[balance_idx])
        })
    return result

def main():
    operators=parse(load(SHEETS["operators"]),"Операторы",9,10,11)
    aup=parse(load(SHEETS["aup"]),"АУП",3,4,5)
    if not operators or not aup:
        raise RuntimeError("Google Sheets returned empty ranking — keeping previous deployment")
    output={
        "updatedAt":datetime.now(timezone.utc).isoformat(),
        "operators":operators,"aup":aup,"all":operators+aup
    }
    target=Path(os.environ.get("OUTPUT_RATING_JSON", "rating.json"))
    target.parent.mkdir(parents=True, exist_ok=True)
    target.write_text(json.dumps(output,ensure_ascii=False,indent=2)+"\n", encoding="utf-8")
    print(f"Published {len(operators)} operators, {len(aup)} AUP; no Telegram handles")

if __name__=="__main__":
    main()
