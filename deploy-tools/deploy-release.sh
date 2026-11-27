#!/usr/bin/env bash
set -Eeuo pipefail
trap 'status=$?; echo "::error::Release deployment failed on the runner at script line ${LINENO} (exit ${status})."; exit "$status"' ERR

if [[ ! -s "$RUNNER_TEMP/deploy_key" ]]; then
  echo "::error::The temporary SSH key is missing on the runner."
  exit 1
fi
if [[ ! -f "$GITHUB_WORKSPACE/deploy-tools/planet-host-deploy.sh" ]]; then
  echo "::error::The PlanetHoster deployment script is missing from the checkout."
  exit 1
fi

remote="$SERVER_USER@$SERVER_HOST"
archive_name="kgpay-build-$GITHUB_RUN_ID-$GITHUB_RUN_ATTEMPT.tar.gz"
service_env_name="auth-service-$GITHUB_RUN_ID-$GITHUB_RUN_ATTEMPT.env"
manager_name="release-manager-$GITHUB_RUN_ID-$GITHUB_RUN_ATTEMPT.cjs"
publisher_name="portal-publisher-$GITHUB_RUN_ID-$GITHUB_RUN_ATTEMPT.cjs"

printf -v deploy_command 'bash -s -- %q %q %q %q %q %q %q %q %q %q %q %q %q' \
  "$SERVER_DEPLOY_ROOT" \
  "$SERVER_NODE_ENV_ACTIVATE" \
  "$SERVER_AUTH_SERVICE_NODE_ENV_ACTIVATE" \
  "$SERVER_AUTH_SERVICE_APP_ROOT" \
  "$SERVER_KGAPPS_ROOT" \
  "$GITHUB_SHA" \
  "$archive_name" \
  "$manager_name" \
  "$publisher_name" \
  "$service_env_name" \
  "$REPOSITORY" \
  "$DEPLOY_MODE" \
  "$DEPLOY_BRANCH"

ssh -i "$RUNNER_TEMP/deploy_key" \
  -p "$SERVER_SSH_PORT" \
  -o BatchMode=yes \
  -o StrictHostKeyChecking=no \
  -o UserKnownHostsFile=/dev/null \
  "$remote" "$deploy_command" \
  < "$GITHUB_WORKSPACE/deploy-tools/planet-host-deploy.sh"
