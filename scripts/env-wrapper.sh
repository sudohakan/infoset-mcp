#!/bin/bash
# Wrapper that loads .env from project dir before starting the MCP server.
# Usage: env-wrapper.sh <script-path> [args...]
# Claude Code MCP config calls this instead of node directly.

SCRIPT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
ENV_FILE="$SCRIPT_DIR/.env"

if [ -f "$ENV_FILE" ]; then
  set -a
  while IFS='=' read -r key value; do
    key=$(echo "$key" | tr -d '\r')
    value=$(echo "$value" | tr -d '\r')
    [[ -z "$key" || "$key" == \#* ]] && continue
    export "$key=$value"
  done < "$ENV_FILE"
  set +a
fi

exec node "$@"
