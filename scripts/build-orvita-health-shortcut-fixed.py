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
SRC_HISTORIAL = ROOT / "scripts/shortcuts/orvita-salud-historial-15dias.src.plist"
OUT_SHORTCUT = ROOT / "public/shortcuts/Orvita-Importar-Salud-Hoy.shortcut"
OUT_HISTORIAL = ROOT / "public/shortcuts/Orvita-Salud-Historial-15Dias.shortcut"
TMP_UNSIGNED_HOY = "/tmp/orvita-unsigned-hoy.shortcut"
TMP_UNSIGNED_HIST = "/tmp/orvita-unsigned-historial.shortcut"


def run(cmd: list[str]) -> None:
    print("→", " ".join(cmd))
    subprocess.run(cmd, check=True)


def build() -> None:
    run(["python3", str(BUILDER)])
    run(["python3", str(BUILDER), "--variant", "historial-15d"])
    run(["plutil", "-convert", "binary1", str(SRC_PLIST), "-o", TMP_UNSIGNED_HOY])
    run(["plutil", "-convert", "binary1", str(SRC_HISTORIAL), "-o", TMP_UNSIGNED_HIST])
    run(
        [
            "shortcuts",
            "sign",
            "--mode",
            "anyone",
            "--input",
            TMP_UNSIGNED_HOY,
            "--output",
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
            TMP_UNSIGNED_HIST,
            "--output",
            str(OUT_HISTORIAL),
        ]
    )
    print("")
    print("Shortcuts generados:")
    print(" ", OUT_SHORTCUT)
    print(" ", OUT_HISTORIAL)


if __name__ == "__main__":
    build()
