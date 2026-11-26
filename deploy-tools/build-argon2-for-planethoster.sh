#!/usr/bin/env bash
set -Eeuo pipefail
trap 'status=$?; echo "::error::PlanetHoster argon2 build failed at script line ${LINENO} (exit ${status})."; exit "$status"' ERR

release_dir="${1:-}"
if [[ -z "$release_dir" || "$release_dir" != /* ||
  ! -d "$release_dir/services/auth-service/node_modules/.pnpm" ]]; then
  echo "::error::Pass the absolute packaged release directory."
  exit 1
fi

if ! command -v docker >/dev/null 2>&1; then
  echo "::error::Docker is required to build argon2 for GLIBC 2.28."
  exit 1
fi

verification_marker="$release_dir/.argon2-glibc-2.28-verified"
rm -f -- "$verification_marker"

docker run --interactive --rm --pull=always --platform linux/amd64 \
  --env "HOST_UID=$(id -u)" \
  --env "HOST_GID=$(id -g)" \
  --mount "type=bind,source=$release_dir,target=/release" \
  almalinux:8.10@sha256:974135fa35c47f8406ae9f81e8479fe0c372bdd64244a48770848466ceb694ce \
  bash -euo pipefail -s <<'CONTAINER'
test "$(getconf GNU_LIBC_VERSION)" = "glibc 2.28"

dnf -y module install python39:3.9/common
dnf -y install gcc-c++ make curl tar xz

node_version="22.23.5"
node_archive="node-v${node_version}-linux-x64.tar.xz"
node_sha256="cdeb8670a0c81f51b4dc4ac61919f9b1ad917b304bf8221eb939570663d240f8"
curl --fail --silent --show-error --location \
  "https://nodejs.org/dist/v${node_version}/${node_archive}" \
  --output "/tmp/${node_archive}"
printf '%s  %s\n' "$node_sha256" "/tmp/${node_archive}" | sha256sum --check -
mkdir -p /opt/node
tar -xJf "/tmp/${node_archive}" --strip-components=1 -C /opt/node
export PATH="/opt/node/bin:$PATH"
export npm_config_python=/usr/bin/python3.9
export npm_config_nodedir=/opt/node
test "$(node --version)" = "v${node_version}"

mapfile -t argon2_manifests < <(
  find /release/services/auth-service/node_modules/.pnpm \
    -type f -path '*/node_modules/argon2/package.json' -print
)
if [[ "${#argon2_manifests[@]}" -ne 1 ]]; then
  echo "Expected exactly one packaged argon2 dependency."
  exit 1
fi
argon2_version="$(node -e 'process.stdout.write(require(process.argv[1]).version)' "${argon2_manifests[0]}")"

npm install --global node-gyp@13.1.0
npm install \
  --prefix /tmp/argon2-build \
  --build-from-source \
  --no-audit \
  --no-fund \
  "argon2@${argon2_version}"

built_binary="/tmp/argon2-build/node_modules/argon2/build/Release/argon2.node"
test -s "$built_binary"

mapfile -t argon2_prebuilds < <(
  find /release/services/auth-service/node_modules/.pnpm \
    -type f -path '*/argon2/prebuilds/linux-x64/argon2.glibc.node' -print
)
if [[ "${#argon2_prebuilds[@]}" -ne 1 ]]; then
  echo "Expected exactly one packaged Linux glibc argon2 binary."
  exit 1
fi

install -m 755 "$built_binary" "${argon2_prebuilds[0]}"
chown "${HOST_UID:?}:${HOST_GID:?}" "${argon2_prebuilds[0]}"

cd /tmp/argon2-build
node <<'NODE'
const argon2 = require("argon2");

(async () => {
  const hash = await argon2.hash("kgpay-build-smoke-test");
  if (!(await argon2.verify(hash, "kgpay-build-smoke-test"))) {
    throw new Error("argon2 source-build smoke test failed");
  }
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
NODE

cd /release/services/auth-service
node <<'NODE'
const argon2 = require("argon2");

(async () => {
  const hash = await argon2.hash("kgpay-release-smoke-test");
  if (!(await argon2.verify(hash, "kgpay-release-smoke-test"))) {
    throw new Error("Packaged argon2 smoke test failed");
  }
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
NODE

printf 'node=%s;glibc=2.28;argon2-build=verified\n' "$node_version" \
  > /release/.argon2-glibc-2.28-verified
chown "${HOST_UID:?}:${HOST_GID:?}" /release/.argon2-glibc-2.28-verified
echo "argon2 built from source and verified on GLIBC 2.28."
CONTAINER

expected_marker="node=22.23.5;glibc=2.28;argon2-build=verified"
if [[ ! -f "$verification_marker" ||
  "$(cat "$verification_marker")" != "$expected_marker" ]]; then
  echo "::error::The GLIBC 2.28 argon2 build did not produce its verification marker."
  exit 1
fi
rm -f -- "$verification_marker"
