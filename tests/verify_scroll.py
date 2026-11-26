#!/usr/bin/env python3
"""Automated verification suite for Shan Hai Bianjing 3D (山海汴京圖)."""
from __future__ import annotations

import re
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
JS_FILES = [
    ROOT / "assets" / "geometry.js",
    ROOT / "assets" / "engine.js",
    ROOT / "assets" / "audio.js",
]
FORBIDDEN = [r"C:\\Users\\", r"D:\\LocalLLM", r"/home/antigravity/", r"/workspace/"]


def main() -> int:
    for jf in JS_FILES:
        assert jf.is_file(), f"Missing {jf}"
        r = subprocess.run(["node", "--check", str(jf)], capture_output=True, text=True)
        assert r.returncode == 0, f"Syntax error in {jf.name}:\n{r.stderr}"
        txt = jf.read_text(encoding="utf-8")
        assert not re.search(r"https?://", txt), f"External URL in {jf.name}"
        print(f"[PASS] {jf.name:16s} | {jf.stat().st_size/1024:5.1f} KB | JS OK | 0 external deps")

    idx = (ROOT / "index.html").read_text(encoding="utf-8")
    assert "Gemini 4 Neon" in idx, "Missing Gemini 4 Neon attribution"
    assert "ai-purplemaple.com" in idx, "Missing Purple Maple linkback"
    assert "og-cover.png" in idx, "Missing PNG og-cover"
    assert (ROOT / "assets" / "og-cover.png").is_file(), "og-cover.png not generated"

    for p in ROOT.rglob("*"):
        if p.is_dir() or p.suffix.lower() in {".png", ".jpg", ".webp"} or ".git" in p.parts:
            continue
        if p.resolve() == Path(__file__).resolve():
            continue
        t = p.read_text(encoding="utf-8", errors="ignore")
        for pat in FORBIDDEN:
            assert not re.search(pat, t), f"Forbidden path {pat} leaked in {p}"

    print("[PASS] index.html + OG cover + zero-leak security hygiene OK")
    print("\nALL SHAN HAI BIANJING 3D CHECKS PASSED.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
