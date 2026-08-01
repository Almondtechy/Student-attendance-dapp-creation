// Regenerates lib/abis/ProofStorage.json from Foundry's build output.
// Run after changing the contract (forge build) or via `npm run sync:abi`.
// Safe to run when forge artifacts are absent — it skips silently so the
// frontend can build from the committed ABI.
import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const artifactPath = resolve(
  root,
  "contracts/out/ProofStorage.sol/ProofStorage.json"
);
const targetPath = resolve(root, "lib/abis/ProofStorage.json");

if (!existsSync(artifactPath)) {
  console.log("[sync-abi] Forge artifact not found — skipping (run `forge build` in contracts/ to regenerate).");
  process.exit(0);
}

const artifact = JSON.parse(readFileSync(artifactPath, "utf8"));
const output = JSON.stringify({ abi: artifact.abi }, null, 2) + "\n";
mkdirSync(dirname(targetPath), { recursive: true });
writeFileSync(targetPath, output);
console.log("[sync-abi] Synced ABI to lib/abis/ProofStorage.json");
