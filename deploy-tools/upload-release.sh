#!/usr/bin/env bash
set -Eeuo pipefail
trap 'status=$?; echo "::error::Release upload failed on the runner at script line ${LINENO} (exit ${status})."; exit "$status"' ERR

if [[ "$DEPLOY_MODE" != "initialize" && "$DEPLOY_MODE" != "deploy" ]]; then
  echo "::error::Unknown deployment mode."
  exit 1
fi
if [[ "$SERVER_HOST" =~ [^A-Za-z0-9.-] || -z "$SERVER_HOST" ]]; then
  echo "::error::SERVER_HOST is missing or invalid; provide a hostname or IP only."
  exit 1
fi
if [[ "$SERVER_USER" =~ [^A-Za-z0-9._-] || -z "$SERVER_USER" ]]; then
  echo "::error::SERVER_USER is missing or invalid; provide the account name only."
  exit 1
fi
if [[ ! "$SERVER_SSH_PORT" =~ ^[0-9]+$ ]] ||
  ! test "$SERVER_SSH_PORT" -ge 1 2>/dev/null ||
  ! test "$SERVER_SSH_PORT" -le 65535 2>/dev/null; then
  echo "::error::SERVER_SSH_PORT must be a number from 1 to 65535."
  exit 1
fi

for path_name in \
  SERVER_DEPLOY_ROOT \
  SERVER_NODE_ENV_ACTIVATE \
  SERVER_AUTH_SERVICE_NODE_ENV_ACTIVATE \
  SERVER_AUTH_SERVICE_APP_ROOT \
  SERVER_KGAPPS_ROOT; do
  path_value="${!path_name}"
  if [[ ! "$path_value" =~ ^/[A-Za-z0-9._/-]+$ || "$path_value" == *".."* ]]; then
    echo "::error::$path_name must be an absolute Linux path without spaces or '..'."
    exit 1
  fi
done

for path_name in SERVER_DEPLOY_ROOT SERVER_AUTH_SERVICE_APP_ROOT SERVER_KGAPPS_ROOT; do
  if [[ "${!path_name}" == "/" ]]; then
    echo "::error::$path_name must not be the filesystem root."
    exit 1
  fi
done
if [[ "$SERVER_NODE_ENV_ACTIVATE" == "$SERVER_AUTH_SERVICE_NODE_ENV_ACTIVATE" ]]; then
  echo "::error::SERVER_NODE_ENV_ACTIVATE and SERVER_AUTH_SERVICE_NODE_ENV_ACTIVATE must be distinct."
  exit 1
fi

assert_separate_paths() {
  local left_name="$1"
  local right_name="$2"
  local left="${!left_name}"
  local right="${!right_name}"
  case "$left/" in
    "$right/"*)
      echo "::error::$left_name and $right_name must be separate, non-nested paths."
      exit 1
      ;;
  esac
  case "$right/" in
    "$left/"*)
      echo "::error::$left_name and $right_name must be separate, non-nested paths."
      exit 1
      ;;
  esac
}

assert_separate_paths SERVER_DEPLOY_ROOT SERVER_AUTH_SERVICE_APP_ROOT
assert_separate_paths SERVER_DEPLOY_ROOT SERVER_KGAPPS_ROOT
assert_separate_paths SERVER_AUTH_SERVICE_APP_ROOT SERVER_KGAPPS_ROOT

if [[ "$REPOSITORY" != "relouBird/kab-gateway-pay" ]]; then
  echo "::error::Unexpected repository for the PlanetHoster deployment."
  exit 1
fi
if [[ ! "$GITHUB_SHA" =~ ^[0-9a-f]{40}$ ]]; then
  echo "::error::GITHUB_SHA is not a full commit SHA."
  exit 1
fi
if [[ ! -s "$RUNNER_TEMP/deploy_key" ]]; then
  echo "::error::The temporary SSH key is missing on the runner."
  exit 1
fi

archive="$RUNNER_TEMP/kgpay-build.tar.gz"
service_env="$RUNNER_TEMP/kgpay-auth-service.env"
manager="$GITHUB_WORKSPACE/deploy-tools/release-manager.cjs"
portal_publisher="$GITHUB_WORKSPACE/deploy-tools/publish-portals.cjs"
if [[ ! -f "$archive" ]]; then
  echo "::error::The packaged release archive is missing on the runner."
  exit 1
fi
if [[ ! -s "$service_env" ]]; then
  echo "::error::The generated auth-service environment is missing on the runner."
  exit 1
fi
if [[ ! -f "$manager" || ! -f "$portal_publisher" ]]; then
  echo "::error::A deployment helper is missing from the checkout."
  exit 1
fi

remote="$SERVER_USER@$SERVER_HOST"
archive_name="kgpay-build-$GITHUB_RUN_ID-$GITHUB_RUN_ATTEMPT.tar.gz"
service_env_name="auth-service-$GITHUB_RUN_ID-$GITHUB_RUN_ATTEMPT.env"
manager_name="release-manager-$GITHUB_RUN_ID-$GITHUB_RUN_ATTEMPT.cjs"
publisher_name="portal-publisher-$GITHUB_RUN_ID-$GITHUB_RUN_ATTEMPT.cjs"

printf -v prepare_command 'bash -s -- %q' "$SERVER_DEPLOY_ROOT"
ssh -i "$RUNNER_TEMP/deploy_key" \
  -p "$SERVER_SSH_PORT" \
  -o BatchMode=yes \
  -o StrictHostKeyChecking=no \
  -o UserKnownHostsFile=/dev/null \
  "$remote" "$prepare_command" <<'REMOTE'
set -eE
trap 'status=$?; printf "Remote upload-directory preparation failed at script line %s (exit %s).\n" "$LINENO" "$status" >&2; exit "$status"' ERR
umask 077
root="$1"
mkdir -p "$root/incoming"
chmod 700 "$root/incoming"
REMOTE

scp -i "$RUNNER_TEMP/deploy_key" \
  -P "$SERVER_SSH_PORT" \
  -o BatchMode=yes \
  -o StrictHostKeyChecking=no \
  -o UserKnownHostsFile=/dev/null \
  "$archive" "$remote:$SERVER_DEPLOY_ROOT/incoming/$archive_name"
scp -i "$RUNNER_TEMP/deploy_key" \
  -P "$SERVER_SSH_PORT" \
  -o BatchMode=yes \
  -o StrictHostKeyChecking=no \
  -o UserKnownHostsFile=/dev/null \
  "$manager" "$remote:$SERVER_DEPLOY_ROOT/incoming/$manager_name"
scp -i "$RUNNER_TEMP/deploy_key" \
  -P "$SERVER_SSH_PORT" \
  -o BatchMode=yes \
  -o StrictHostKeyChecking=no \
  -o UserKnownHostsFile=/dev/null \
  "$portal_publisher" "$remote:$SERVER_DEPLOY_ROOT/incoming/$publisher_name"
scp -p -i "$RUNNER_TEMP/deploy_key" \
  -P "$SERVER_SSH_PORT" \
  -o BatchMode=yes \
  -o StrictHostKeyChecking=no \
  -o UserKnownHostsFile=/dev/null \
  "$service_env" "$remote:$SERVER_DEPLOY_ROOT/incoming/$service_env_name"

echo "Uploaded release archive, service environment, and deployment helpers to PlanetHoster."
