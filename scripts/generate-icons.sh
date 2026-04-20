#!/usr/bin/env bash
# Generate Tauri app icons from a square SVG or PNG.
#
# Usage:
#   ./scripts/generate-icons.sh [source-image]
#
# If no source image is given, defaults to app-icon.svg in the repo root.
# Requires: npx (Node.js) and @tauri-apps/cli installed as a dev dependency.
#
# The generated icons are written to src-tauri/icons/.

set -euo pipefail

SOURCE="${1:-app-icon.svg}"

if [ ! -f "$SOURCE" ]; then
  echo "Error: Source image '$SOURCE' not found."
  echo ""
  echo "To generate icons you need a square SVG or a 1024×1024 (or larger) PNG file."
  echo "Place it at the repo root as app-icon.svg, then re-run this script."
  exit 1
fi

echo "Generating icons from $SOURCE …"
npx tauri icon "$SOURCE"
echo "Done. Icons written to src-tauri/icons/"
