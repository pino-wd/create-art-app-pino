#!/usr/bin/env bash
# Check for dead links in docs/ using lychee.
# If lychee is not installed, skip with a warning.

set -euo pipefail

if ! command -v lychee &>/dev/null; then
  echo "⚠️  lychee is not installed. Skipping link check."
  echo "   Install: brew install lychee (macOS) or cargo install lychee"
  exit 0
fi

lychee --no-progress docs/
