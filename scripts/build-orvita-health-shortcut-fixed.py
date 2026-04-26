#!/usr/bin/env python3
"""Atajo de un solo comando: regenera plist, binario y firma (macOS).

El builder principal (`build-orvita-health-shortcut.py`) ya emite
`is.workflow.actions.statistics` + `is.workflow.actions.detect.number`;
este script solo encadena generación + `plutil` + `shortcuts sign`.
"""
import subprocess
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]

BUILDER = ROOT / "scripts/build-orvita-health-shortcut.py"
SRC_PLIST = ROOT / "scripts/shortcuts/orvita-importar-salud-hoy.shortcut.src.plist"
OUT_SHORTCUT = ROOT / "public/shortcuts/Orvita-Importar-Salud-Hoy.shortcut"


def run(cmd: list[str]) -> None:
    print("→", " ".join(cmd))
    subprocess.run(cmd, check=True)


def build() -> None:
    run(["python3", str(BUILDER)])
    run(
        [
            "plutil",
            "-convert",
            "binary1",
            str(SRC_PLIST),
            "-o",
            str(OUT_SHORTCUT),
        ]
    )
    run(
        [
            "shortcuts",
            "sign",
            "--mode",
            "anyone",
            "--input",
            str(OUT_SHORTCUT),
            "--output",
            str(OUT_SHORTCUT),
        ]
    )
    print("")
    print("Shortcut generado:", OUT_SHORTCUT)


if __name__ == "__main__":
    build()
