#!/usr/bin/env bash
# Detect private absolute paths in docs/
# Matches /Users/xxx/ or /home/xxx/ patterns

set -euo pipefail

if ! [ -d docs ]; then
  echo "✅ No docs/ directory found. Skipping."
  exit 0
fi

if grep -RnE '/(Users|home)/[A-Za-z0-9_.-]+/' docs/ 2>/dev/null; then
  echo ""
  echo "⛔ Private absolute paths detected in docs/. Use relative paths instead."
  exit 1
else
  echo "✅ No private paths found."
  exit 0
fi
