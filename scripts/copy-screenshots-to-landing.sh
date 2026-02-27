#!/bin/bash
# Copy provider flow screenshots to cloudburst-landing for the dashboard page.
# Run after: cd cloudburst-autoscaler && ./hack/integration-test-e2e-gcp.sh
#
# Copies flow-screenshots-gcp/*.png → dashboard/gcp/
# Both lifecycle (dashboard-lifecycle.html) and full tour (dashboard-tour.html) use gcp/ screenshots.

set -e
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
UI_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"
LANDING="${UI_ROOT}/../cloudburst-landing"

GCP_SRC="${UI_ROOT}/web/flow-screenshots-gcp"
GCP_DEST="${LANDING}/assets/images/dashboard/gcp"

if [ ! -d "${GCP_SRC}" ]; then
  echo "Source not found: ${GCP_SRC}"
  echo "Run the GCP integration test first: cd ../cloudburst-autoscaler && ./hack/integration-test-e2e-gcp.sh"
  exit 1
fi

count=$(ls -1 "${GCP_SRC}"/*.png 2>/dev/null | wc -l)
if [ "${count}" -eq 0 ]; then
  echo "No screenshots in ${GCP_SRC}"
  echo "Run the full GCP integration test (it captures at each lifecycle phase):"
  echo "  cd ../cloudburst-autoscaler && ./hack/integration-test-e2e-gcp.sh"
  exit 1
fi

mkdir -p "${GCP_DEST}"
rm -f "${GCP_DEST}"/*.png
cp -v "${GCP_SRC}"/*.png "${GCP_DEST}/"
echo "Copied ${count} screenshots to ${GCP_DEST}"
