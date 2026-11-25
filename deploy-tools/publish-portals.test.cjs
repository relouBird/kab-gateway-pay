"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const test = require("node:test");
const { publishPortals } = require("./publish-portals.cjs");

function createTempDirectory(t) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "kgpay-portals-"));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  return root;
}

function createBuild(sourceRoot) {
  for (const portal of ["customer-portal", "staff-portal"]) {
    const dist = path.join(sourceRoot, portal, "dist");
    fs.mkdirSync(path.join(dist, "assets"), { recursive: true });
    fs.writeFileSync(path.join(dist, "index.html"), `<html>${portal}</html>`, {
      mode: 0o600,
    });
    fs.writeFileSync(path.join(dist, "assets", "app.js"), "bundle", {
      mode: 0o600,
    });
  }
}

test("publishes both portals with readable permissions and preserves server files", (t) => {
  const temp = createTempDirectory(t);
  const sourceRoot = path.join(temp, "release", "apps");
  const targetRoot = path.join(temp, "public", "kgapps");
  createBuild(sourceRoot);

  const oldCustomer = path.join(targetRoot, "customer-app");
  const oldStaff = path.join(targetRoot, "staff-app");
  fs.mkdirSync(path.join(oldCustomer, ".well-known"), { recursive: true });
  fs.mkdirSync(oldStaff, { recursive: true });
  fs.writeFileSync(path.join(oldCustomer, ".htaccess"), "RewriteEngine On");
  fs.writeFileSync(
    path.join(oldCustomer, ".well-known", "validation.txt"),
    "keep",
  );
  fs.writeFileSync(path.join(oldCustomer, "stale.js"), "remove");
  fs.writeFileSync(path.join(oldStaff, ".htaccess"), "RewriteEngine On");

  publishPortals({ sourceRoot, targetRoot });

  for (const [name, sourceName] of [
    ["customer-app", "customer-portal"],
    ["staff-app", "staff-portal"],
  ]) {
    const target = path.join(targetRoot, name);
    assert.equal(
      fs.readFileSync(path.join(target, "index.html"), "utf8"),
      `<html>${sourceName}</html>`,
    );
    assert.equal(
      fs.readFileSync(path.join(target, "assets", "app.js"), "utf8"),
      "bundle",
    );
    assert.equal(
      fs.readFileSync(path.join(target, ".htaccess"), "utf8"),
      "RewriteEngine On",
    );
    if (process.platform !== "win32") {
      assert.equal(fs.statSync(target).mode & 0o777, 0o755);
      assert.equal(
        fs.statSync(path.join(target, "index.html")).mode & 0o777,
        0o644,
      );
      assert.equal(
        fs.statSync(path.join(target, "assets")).mode & 0o777,
        0o755,
      );
      assert.equal(
        fs.statSync(path.join(target, "assets", "app.js")).mode & 0o777,
        0o644,
      );
    }
  }

  assert.equal(
    fs.readFileSync(
      path.join(oldCustomer, ".well-known", "validation.txt"),
      "utf8",
    ),
    "keep",
  );
  assert.equal(
    fs.existsSync(path.join(targetRoot, "customer-app", "stale.js")),
    false,
  );
  assert.equal(
    fs.readdirSync(targetRoot).some((entry) => entry.includes("-next-")),
    false,
  );
});

test("rejects incomplete builds without replacing existing portals", (t) => {
  const temp = createTempDirectory(t);
  const sourceRoot = path.join(temp, "release", "apps");
  const targetRoot = path.join(temp, "public", "kgapps");
  createBuild(sourceRoot);
  fs.rmSync(path.join(sourceRoot, "staff-portal", "dist", "index.html"));
  fs.mkdirSync(path.join(targetRoot, "customer-app"), { recursive: true });
  fs.writeFileSync(
    path.join(targetRoot, "customer-app", "index.html"),
    "current",
  );

  assert.throws(
    () => publishPortals({ sourceRoot, targetRoot }),
    /missing index\.html/,
  );
  assert.equal(
    fs.readFileSync(
      path.join(targetRoot, "customer-app", "index.html"),
      "utf8",
    ),
    "current",
  );
});
