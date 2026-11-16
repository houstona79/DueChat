#!/usr/bin/env bash
# Generates the ANON_KEY and SERVICE_ROLE_KEY JWTs your self-hosted stack
# needs, signed with the JWT_SECRET from your .env file.
# Usage: cd deploy && ./generate-keys.sh
set -euo pipefail

if [ ! -f .env ]; then
  echo "Copy .env.example to .env and set JWT_SECRET first." >&2
  exit 1
fi
JWT_SECRET=$(grep '^JWT_SECRET=' .env | cut -d= -f2-)
if [ -z "$JWT_SECRET" ] || [ "$JWT_SECRET" = "CHANGEME" ]; then
  echo "Set a real JWT_SECRET in .env first (openssl rand -base64 32)." >&2
  exit 1
fi

b64url() { openssl enc -base64 -A | tr '+/' '-_' | tr -d '='; }

make_jwt() {
  local role=$1
  local header payload sig
  header=$(printf '{"alg":"HS256","typ":"JWT"}' | b64url)
  payload=$(printf '{"role":"%s","iss":"supabase","iat":1763308800,"exp":1975689600}' "$role" | b64url)
  sig=$(printf '%s.%s' "$header" "$payload" | openssl dgst -sha256 -hmac "$JWT_SECRET" -binary | b64url)
  printf '%s.%s.%s' "$header" "$payload" "$sig"
}

echo "ANON_KEY=$(make_jwt anon)"
echo "SERVICE_ROLE_KEY=$(make_jwt service_role)"
