const { generateKeyPairSync, randomBytes, randomUUID } = require("node:crypto");
const { mkdirSync, writeFileSync } = require("node:fs");
const { resolve } = require("node:path");

const outputDirectory = resolve(process.cwd(), ".local-secrets");
mkdirSync(outputDirectory, { recursive: true, mode: 0o700 });

const { privateKey, publicKey } = generateKeyPairSync("rsa", {
  modulusLength: 3072,
  publicKeyEncoding: {
    type: "spki",
    format: "pem",
  },
  privateKeyEncoding: {
    type: "pkcs8",
    format: "pem",
  },
});
const keyId = randomUUID();

writeFileSync(resolve(outputDirectory, "auth-private.pem"), privateKey, {
  mode: 0o600,
  flag: "wx",
});
writeFileSync(resolve(outputDirectory, "auth-public.pem"), publicKey, {
  mode: 0o644,
  flag: "wx",
});
writeFileSync(
  resolve(outputDirectory, "otp-hash.key"),
  randomBytes(32).toString("hex"),
  { mode: 0o600, flag: "wx" },
);
writeFileSync(
  resolve(outputDirectory, "ip-hash.key"),
  randomBytes(32).toString("hex"),
  { mode: 0o600, flag: "wx" },
);

process.stdout.write(
  `Signing and HMAC keys created in ${outputDirectory}.\nSet JWT_PRIVATE_KEY_FILE__AUTH_SERVICE to the private key path, JWT_KEY_ID__AUTH_SERVICE=${keyId}, OTP_HASH_KEY__AUTH_SERVICE to the contents of otp-hash.key, and IP_HASH_KEY__AUTH_SERVICE to the contents of ip-hash.key in the repository-root .env.\n`,
);
