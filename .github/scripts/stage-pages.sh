#!/usr/bin/env bash
set -euo pipefail
stage="$1"
mkdir "$stage"
tar --exclude='./.git' --exclude='./.github' --exclude='./node_modules' -cf - . |
  tar -xf - -C "$stage"
test ! -e "$stage/node_modules"
test -f "$stage/.nojekyll"
CONDOR_STATIC_ARTIFACT_DIR="$stage" node --test tools/ci/check-offline-artifact.js
