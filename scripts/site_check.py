"""Check that every JSON the site fetches exists and that each page references only files
that exist. Run from the repo root: python3 scripts/site_check.py"""
import re
import sys
from pathlib import Path

SITE = Path("site")
NAME = "wc2026"


def main() -> int:
    errors = []
    data = SITE / "data" / NAME
    for required in ("report.json", "teams.json", "calibration.json"):
        if not (data / required).exists():
            errors.append(f"missing {data / required}")
    teams = len(list(data.glob("team_*.json")))
    if teams != 48:
        errors.append(f"expected 48 team files, found {teams}")
    for page in SITE.glob("*.html"):
        html = page.read_text()
        for ref in re.findall(r'(?:src|href)="((?:css|js)/[^"]+)"', html):
            if not (SITE / ref).exists():
                errors.append(f"{page.name} references missing {ref}")
    for js in (SITE / "js").glob("*.js"):
        for ref in re.findall(r"from\s+['\"]\./([^'\"]+)['\"]", js.read_text()):
            if not (SITE / "js" / ref).exists():
                errors.append(f"{js.name} imports missing js/{ref}")
    for e in errors:
        print("ERROR", e)
    print("site check:", "ok" if not errors else f"{len(errors)} problem(s)")
    return 1 if errors else 0


if __name__ == "__main__":
    sys.exit(main())
