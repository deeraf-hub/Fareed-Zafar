#!/usr/bin/env bash
# Sends a correctly SIGNED Instagram test DM to the workflow, exactly as Meta would.
# Usage:  META_APP_SECRET=xxxx ./send-instagram-test.sh https://<n8n>/webhook-test/instagram-inbound "Do you do whitening?"
# Use the production URL (/webhook/...) when the workflow is active, the test URL (/webhook-test/...) while "Test workflow" is listening.
set -euo pipefail
URL="${1:?webhook url}"
TEXT="${2:-Do you do teeth whitening? What does it cost?}"
: "${META_APP_SECRET:?set META_APP_SECRET to the Meta app secret used in the Crypto credential}"
BODY=$(printf '{"object":"instagram","entry":[{"id":"17841400000000000","time":%s,"messaging":[{"sender":{"id":"1234567890123456"},"recipient":{"id":"17841400000000000"},"timestamp":%s,"message":{"mid":"m_TEST_%s","text":"%s"}}]}]}' \
  "$(date +%s)000" "$(date +%s)000" "$(date +%s)" "$TEXT")
SIG=$(printf '%s' "$BODY" | openssl dgst -sha256 -hmac "$META_APP_SECRET" | sed 's/^.* //')
curl -sS -X POST "$URL" \
  -H "Content-Type: application/json" \
  -H "X-Hub-Signature-256: sha256=$SIG" \
  --data-binary "$BODY"
echo
echo "Sent. A wrong secret or a changed body must end at 'Reject Forged Request' in the execution."
