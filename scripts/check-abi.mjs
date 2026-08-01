// Verifies that the committed frontend ABI (lib/abis/ProofStorage.json)
// semantically matches the contract compiled by forge. Exits non-zero on drift.
//
// Comparison is order-insensitive: ABI entries and JSON keys are canonicalized
// before comparing, so ordering differences between solc/forge output and
// hand-written files never cause false positives — only real semantic drift
// (added/removed/changed entries) fails the gate.
import { readFileSync, existsSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const artifactPath = resolve(
  root,
  "contracts/out/ProofStorage.sol/ProofStorage.json"
);
const committedPath = resolve(root, "lib/abis/ProofStorage.json");

if (!existsSync(artifactPath)) {
  console.error("[check-abi] Forge artifact not found. Run `forge build` in contracts/ first.");
  process.exit(1);
}
if (!existsSync(committedPath)) {
  console.error("[check-abi] Committed ABI not found at lib/abis/ProofStorage.json");
  process.exit(1);
}

/** Recursively sorts object keys so key ordering never affects equality. */
function sortKeys(value) {
  if (Array.isArray(value)) return value.map(sortKeys);
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.keys(value)
        .sort()
        .map((key) => [key, sortKeys(value[key])])
    );
  }
  return value;
}

/** Canonical form: sorted entries, each with sorted keys, joined deterministically. */
function canonical(abi) {
  return abi.map((entry) => JSON.stringify(sortKeys(entry))).sort().join("\n");
}

const artifact = JSON.parse(readFileSync(artifactPath, "utf8"));
const committed = JSON.parse(readFileSync(committedPath, "utf8"));

if (canonical(artifact.abi) === canonical(committed.abi)) {
  console.log("[check-abi] Committed ABI matches the contract source.");
  process.exit(0);
}

console.error(
  "[check-abi] ABI drift detected: lib/abis/ProofStorage.json does not match the contract. Run `npm run sync:abi` to regenerate it."
);
process.exit(1);
