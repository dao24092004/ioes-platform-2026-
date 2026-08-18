#!/usr/bin/env python3
"""
Repair IOES service Helm values.yaml files.

The existing files mistakenly contain Chart.yaml metadata at the top
(`apiVersion: v2`, `name`, `description`, etc.) followed by a `values:` block
that nests the actual values two levels deeper than required.

Helm 3 expects `values.yaml` to be a flat YAML map whose keys correspond
directly to `.Values.*` paths in the templates. This script:

1. Strips the leading Chart.yaml metadata block (everything before `values:`).
2. Unindents the remaining `values:` block by 2 spaces so the keys become
   top-level.

It also drops the bare `values:` key — the file becomes a flat map of
default values, which is exactly what Helm's `--values` flag expects.

The script is idempotent: running it twice produces the same result.
"""
from __future__ import annotations

import re
import sys
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parent.parent
CHARTS = [
    "api-gateway",
    "auth-service",
    "content-service",
    "exam-suite",
    "analytics-service",
    "notification-service",
    "ai-suite",
    "blockchain-suite",
]


def repair(values_path: Path) -> bool:
    text = values_path.read_text(encoding="utf-8")

    # 1. Drop everything from the start up to and including the `values:` line.
    #    Idempotent: if `values:` is already at column 0, nothing changes.
    m = re.search(r"^values:\s*$", text, flags=re.MULTILINE)
    if m is None:
        # Already flat, but check it's not double-flat
        if text.startswith("apiVersion:"):
            print(f"  ! No `values:` key found in {values_path.name}; skipping")
            return False
        return False

    # 2. Take everything AFTER `values:` line.
    after = text[m.end():]

    # 3. Unindent every line by exactly 2 spaces (idempotent: only if first
    #    non-empty line begins with two spaces).
    lines = after.splitlines(keepends=True)
    non_empty = [ln for ln in lines if ln.strip()]
    if non_empty and non_empty[0].startswith("  "):
        lines = [
            ln[2:] if ln.startswith("  ") else ln
            for ln in lines
        ]

    new_body = "".join(lines)
    # 4. Normalise trailing whitespace: ensure single trailing newline.
    new_body = new_body.rstrip() + "\n"

    # 5. Drop the empty top line that was the `values:` block header.
    if new_body.startswith("\n"):
        new_body = new_body.lstrip("\n")

    values_path.write_text(new_body, encoding="utf-8")
    print(f"  ✓ Repaired {values_path.relative_to(REPO_ROOT)}")
    return True


def main() -> int:
    fixed = 0
    for chart in CHARTS:
        values_path = REPO_ROOT / "infrastructure" / "helm" / "charts" / chart / "values.yaml"
        if not values_path.exists():
            print(f"  - Skipping {chart} (no values.yaml)")
            continue
        print(f"\n[{chart}]")
        if repair(values_path):
            fixed += 1
    print(f"\n{fixed}/{len(CHARTS)} values.yaml files repaired")
    return 0


if __name__ == "__main__":
    sys.exit(main())