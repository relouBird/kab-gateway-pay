#!/usr/bin/env bash
set -eE
trap 'status=$?; printf "Remote deployment failed at script line %s (exit %s).\n" "$LINENO" "$status" >&2; exit "$status"' ERR

root="$1"
deploy_node_env="$2"
auth_node_env="$3"
auth_app_root="$4"
portal_apps_root="$5"
expected_commit="$6"
archive_name="$7"
manager_name="$8"
publisher_name="$9"
service_env_name="${10}"
repository="${11}"
mode="${12}"
target_branch="${13}"

case "$target_branch" in
  main|test) ;;
  *)
    echo "ERROR: Deployment branch must be main or test."
    exit 1
    ;;
esac

repository_dir="$root/repository"
archive="$root/incoming/$archive_name"
manager="$root/incoming/$manager_name"
portal_publisher="$root/incoming/$publisher_name"
service_env_upload="$root/incoming/$service_env_name"
service_env_file="$auth_app_root/.generated/env/auth-service.env"
service_env_stage="$auth_app_root/.generated/env-stage-$archive_name"
service_env_next="$service_env_file.next-$archive_name"
runtime_source="$root/dist/services/auth-service"
runtime_dir="$auth_app_root/runtime"
runtime_stage="$auth_app_root/.runtime-next-$archive_name"
runtime_previous="$auth_app_root/.runtime-previous-$archive_name"
clone_tmp=""
clone_tmp_owned=0
runtime_previous_moved=0
service_env_stage_owned=0
service_env_next_owned=0
runtime_stage_owned=0

cleanup_runtime() {
  if [ "$clone_tmp_owned" -eq 1 ] && [ -n "$clone_tmp" ] && [ -d "$clone_tmp" ]; then
    rm -rf -- "$clone_tmp"
  fi
  if [ -e "$service_env_upload" ]; then
    rm -f -- "$service_env_upload"
  fi
  if [ "$service_env_stage_owned" -eq 1 ] && [ -d "$service_env_stage" ]; then
    rm -rf -- "$service_env_stage"
  fi
  if [ "$service_env_next_owned" -eq 1 ] && [ -e "$service_env_next" ]; then
    rm -f -- "$service_env_next"
  fi
  if [ "$runtime_stage_owned" -eq 1 ] && [ -d "$runtime_stage" ]; then
    rm -rf -- "$runtime_stage"
  fi
  if [ "$runtime_previous_moved" -eq 1 ] &&
    [ ! -e "$runtime_dir" ] &&
    [ -e "$runtime_previous" ]; then
    mv "$runtime_previous" "$runtime_dir"
  fi
}
trap cleanup_runtime EXIT

assert_separate_paths() {
  local left="$1"
  local right="$2"
  case "$left/" in
    "$right/"*)
      echo "ERROR: Deployment, auth-service, and portal roots must be separate."
      exit 1
      ;;
  esac
  case "$right/" in
    "$left/"*)
      echo "ERROR: Deployment, auth-service, and portal roots must be separate."
      exit 1
      ;;
  esac
}

assert_separate_paths "$root" "$auth_app_root"
assert_separate_paths "$root" "$portal_apps_root"
assert_separate_paths "$auth_app_root" "$portal_apps_root"

if [ ! -f "$deploy_node_env" ]; then
  echo "ERROR: SERVER_NODE_ENV_ACTIVATE does not point to an existing Node activation script."
  exit 1
fi
if [ ! -f "$auth_node_env" ]; then
  echo "ERROR: SERVER_AUTH_SERVICE_NODE_ENV_ACTIVATE does not point to an existing Node activation script."
  exit 1
fi
if [ ! -d "$auth_app_root" ]; then
  echo "ERROR: SERVER_AUTH_SERVICE_APP_ROOT does not exist or is not a directory."
  exit 1
fi
if [ ! -s "$service_env_upload" ]; then
  echo "ERROR: Uploaded auth-service environment is missing from the private incoming directory."
  exit 1
fi
if [ -e "$service_env_stage" ] || [ -e "$service_env_next" ]; then
  echo "ERROR: An earlier environment installation is incomplete."
  exit 1
fi
if [ ! -f "$archive" ]; then
  echo "ERROR: Uploaded release archive is missing from the private incoming directory."
  exit 1
fi
if [ ! -f "$manager" ]; then
  echo "ERROR: Uploaded release manager is missing from the private incoming directory."
  exit 1
fi
if [ ! -f "$portal_publisher" ]; then
  echo "ERROR: Uploaded portal publisher is missing from the private incoming directory."
  exit 1
fi
command -v cp >/dev/null 2>&1 || {
  echo "ERROR: cp is required on the server."
  exit 1
}
command -v chmod >/dev/null 2>&1 || {
  echo "ERROR: chmod is required on the server."
  exit 1
}

mkdir -p "$auth_app_root/.generated"
chmod 700 "$auth_app_root/.generated"
mkdir -m 700 "$service_env_stage"
service_env_stage_owned=1
staged_service_env="$service_env_stage/auth-service.env"
mv "$service_env_upload" "$staged_service_env"
chmod 600 "$staged_service_env"
grep -Eq '^NODE_ENV=production\r?$' "$staged_service_env" || {
  echo "ERROR: Uploaded auth-service environment is not configured for production."
  exit 1
}
if ! grep -Eq '^JWT_SIGNING_SECRET=[A-Za-z0-9_-]{64,}$' "$staged_service_env"; then
  echo "ERROR: JWT_SIGNING_SECRET is missing or invalid in the production environment."
  exit 1
fi

if [ "$mode" = "initialize" ]; then
  if [ -e "$repository_dir" ] || [ -e "$root/dist" ] || [ -e "$root/local-builds" ]; then
    echo "ERROR: Deployment paths already exist; initialization is only for a new target."
    exit 1
  fi
  if [ -e "$runtime_dir" ]; then
    echo "ERROR: auth-service runtime already exists; initialization is only for a new target."
    exit 1
  fi
  clone_tmp="$root/.repository-init-$archive_name"
  if [ -e "$clone_tmp" ]; then
    echo "ERROR: A previous repository initialization is incomplete: $clone_tmp"
    exit 1
  fi
  clone_tmp_owned=1
  git clone --depth=1 --branch "$target_branch" \
    "https://github.com/$repository.git" "$clone_tmp"
  cloned_commit="$(git -C "$clone_tmp" rev-parse "origin/$target_branch")"
  if [ "$cloned_commit" != "$expected_commit" ]; then
    echo "ERROR: GitHub $target_branch advanced before the first deployment; rerun the workflow."
    exit 1
  fi
  git -C "$clone_tmp" reset --hard "$expected_commit"
  mv "$clone_tmp" "$repository_dir"
  clone_tmp_owned=0
elif [ "$mode" = "deploy" ]; then
  if [ ! -d "$repository_dir/.git" ]; then
    echo "ERROR: Repository is not initialized. Run the first-deployment workflow first."
    exit 1
  fi
  git -C "$repository_dir" fetch --prune origin "$target_branch"
  remote_commit="$(git -C "$repository_dir" rev-parse "origin/$target_branch")"
  if [ "$remote_commit" != "$expected_commit" ]; then
    echo "ERROR: GitHub $target_branch advanced before deployment; rerun the workflow for the latest commit."
    exit 1
  fi
  git -C "$repository_dir" reset --hard "$expected_commit"
else
  echo "ERROR: Unknown deployment mode."
  exit 1
fi

(
  source "$deploy_node_env"
  set -u
  node --version
  node "$manager" \
    --archive "$archive" \
    --deploy-root "$root" \
    --commit "$expected_commit" \
    --ref "$target_branch"
)

if [ ! -d "$runtime_source" ]; then
  echo "ERROR: The release manager did not publish the auth-service runtime source."
  exit 1
fi
if [ -e "$runtime_dir" ] && [ ! -d "$runtime_dir" ]; then
  echo "ERROR: auth-service runtime path exists but is not a directory."
  exit 1
fi
if [ "$mode" = "deploy" ] && [ ! -d "$runtime_dir" ]; then
  echo "ERROR: auth-service runtime is not initialized."
  exit 1
fi
if [ -d "$runtime_dir" ]; then
  for env_file in "$runtime_dir"/.env "$runtime_dir"/.env.*; do
    if [ -e "$env_file" ]; then
      echo "ERROR: Move private runtime configuration outside auth-service/runtime."
      exit 1
    fi
  done
fi
if [ -e "$runtime_stage" ] || [ -e "$runtime_previous" ]; then
  echo "ERROR: An earlier runtime promotion is incomplete."
  exit 1
fi

mkdir "$runtime_stage"
runtime_stage_owned=1
cp -a "$runtime_source/." "$runtime_stage/"
if [ -e "$runtime_dir" ]; then
  mv "$runtime_dir" "$runtime_previous"
  runtime_previous_moved=1
fi
if ! mv "$runtime_stage" "$runtime_dir"; then
  echo "ERROR: Could not activate the new auth-service runtime."
  exit 1
fi
runtime_stage_owned=0
if [ "$runtime_previous_moved" -eq 1 ]; then
  rm -rf -- "$runtime_previous"
  runtime_previous_moved=0
fi

mkdir -p "$(dirname "$service_env_file")"
mv "$staged_service_env" "$service_env_next"
service_env_next_owned=1
mv "$service_env_next" "$service_env_file"
service_env_next_owned=0
for obsolete_env in \
  "$auth_app_root/.generated/env/auth-service.build.env" \
  "$auth_app_root/.generated/env/auth-service.runtime.env"; do
  if [ -e "$obsolete_env" ] || [ -L "$obsolete_env" ]; then
    rm -f -- "$obsolete_env"
  fi
done
rmdir "$service_env_stage"
service_env_stage_owned=0

if [ "$mode" = "initialize" ]; then
  echo "Initial release installed; auth-service startup is deferred until migrations and super-admin bootstrap are complete."
else
  (
    source "$auth_node_env"
    set -u
    node --version
    /usr/sbin/cloudlinux-selector restart \
      --json \
      --interpreter=nodejs \
      --app-root="$auth_app_root"
  )
fi

(
  source "$deploy_node_env"
  set -u
  node "$portal_publisher" \
    --source-root "$root/dist/apps" \
    --target-root "$portal_apps_root"
)

if [ ! -f "$portal_apps_root/customer-app/index.html" ] ||
  [ ! -f "$portal_apps_root/staff-app/index.html" ]; then
  echo "ERROR: Both portal index files must exist after publication."
  exit 1
fi
if [ ! -d "$root/local-builds" ] || [ ! -d "$root/dist" ]; then
  echo "ERROR: The dated release history or temporary release snapshot is missing."
  exit 1
fi

# The retained local-builds releases are the history; dist/ is only a deployment snapshot.
rm -rf -- "$root/dist"
rm -f -- "$archive" "$manager" "$portal_publisher"
trap - EXIT
if [ "$mode" = "initialize" ]; then
  echo "Initial release installed: $expected_commit"
else
  echo "Deployment successful: $expected_commit"
fi
