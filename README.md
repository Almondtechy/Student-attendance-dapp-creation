# 🎓 Student Attendance dApp

Blockchain-powered student attendance tracking with **on-chain proof of participation**. Students connect their wallet, mark attendance for a class, and the institution's server attests a cryptographic proof on-chain — making records verifiable, immutable, and impossible to forge.

Built with **Next.js 16**, **ethers v6**, **Solidity/Foundry**, and **Prisma + PostgreSQL**.

## ✨ Features

- **Wallet-powered auth** — MetaMask connection via a shared `WalletProvider`; no passwords. Route guards protect the dashboard.
- **Signed attendance requests** — students sign `Attendance request: <wallet>:<timestamp>` with their wallet; the API verifies the signature (with a 5-minute TTL) so nobody can mark attendance for someone else.
- **Verifiable on-chain proofs** — the `ProofStorage` contract records a proof hash for each attendance event. Only the **contract owner** and **authorized markers** (teachers) can record proofs, so attendance can't be self-attested.
- **Real-time dashboard** — stats cards (total classes, attended, rate, on-chain proofs), attendance history, and streak tracking, all served from a real API backed by PostgreSQL.
- **Duplicate protection** — one attendance record per wallet per day (HTTP 409).
- **Responsive dark/light UI** — Tailwind CSS with loading skeletons, empty states, and error banners.

## 🧱 Architecture

```
┌────────────────────────────────────────────────────────────┐
│  Frontend (Next.js App Router)                              │
│  WalletProvider → useWallet()                               │
│   ├── Navbar / ProtectedRoute                               │
│   └── Dashboard                                             │
│        ├── AttendanceStats                                  │
│        ├── MarkAttendance  ── signs request ──┐             │
│        └── AttendanceList                     │             │
└───────────────────────────────────────────────┼─────────────┘
                                                ▼
┌────────────────────────────────────────────────────────────┐
│  API Route  POST /api/attendance                            │
│  1. Verify wallet signature (ethers.verifyMessage + TTL)    │
│  2. Reject duplicates for today (409)                       │
│  3. Save record in PostgreSQL (Prisma)                      │
│  4. Attest proof on-chain via server signer (owner/marker)  │
└────────────────────────────────────────────────────────────┘
```

### The contract: `contracts/src/ProofStorage.sol`

- `storeProof(bytes32 hash, address student)` — records a proof hash. Callable **only** by the owner or an authorized marker.
- `authorizeMarker(address)` / `revokeMarker(address)` — owner manages the teacher role.
- `verifyProof(bytes32 hash)` — anyone can verify a stored proof.
- Emits `ProofStored`, `MarkerAuthorized`, `MarkerRevoked`, `OwnershipTransferred`.

> **Security model:** students prove *who they are* by signing the API request; the *institution's* key (server-side `PRIVATE_KEY`) attests attendance on-chain. This separates identity from attestation, so attendance records are trustworthy to a third party.
>
> **Note:** `POST /api/attendance` is public and each valid request spends the institution's gas on attestation. For production, add rate limiting and/or an allowlist so a spammer can't drain the owner's ETH.

## 📋 Prerequisites

- **Node.js 20+** (22 recommended) and npm
- **MetaMask** browser extension
- **PostgreSQL** (local or hosted, e.g. [Neon](https://neon.tech) / [Supabase](https://supabase.com))
- **Foundry** ([install guide](https://book.getfoundry.sh/getting-started/installation)) — only needed to build/test the Solidity contracts

## 🚀 Getting Started

### 1. Install dependencies

```bash
npm install
```

### 2. Configure environment

Copy the example file and fill in real values:

```bash
cp .env.example .env
```

| Variable | Description |
|---|---|
| `DATABASE_URL` | PostgreSQL connection string used by Prisma |
| `PRIVATE_KEY` | Private key of the contract owner / authorized marker — the server signs on-chain attestations with it |
| `RPC_URL` | RPC endpoint for the chain the contract is deployed on (e.g. Sepolia via Infura/Alchemy) |
| `NEXT_PUBLIC_PROOF_ADDRESS` | Address of the deployed `ProofStorage` contract (public) |

### 3. Set up the database

```bash
npx prisma generate   # generate the Prisma client
npx prisma db push    # create tables from the schema (dev only — use migrate in prod)
```

### 4. Deploy the contract

```bash
cd contracts
forge build
# Foundry loads .env from the Foundry project root (contracts/).
# Put PRIVATE_KEY + RPC_URL in a contracts/.env (gitignored) or export them.
forge script script/DeployProofStorage.s.sol --rpc-url $RPC_URL --broadcast
```

Copy the printed contract address into `NEXT_PUBLIC_PROOF_ADDRESS` in the root `.env`.
The deploying account becomes the contract **owner**. To let a teacher record proofs:

```bash
cast send $PROOF_ADDRESS "authorizeMarker(address)" $TEACHER_ADDRESS --private-key $OWNER_KEY --rpc-url $RPC_URL
```

> If `PRIVATE_KEY` / `RPC_URL` / `NEXT_PUBLIC_PROOF_ADDRESS` are not set, the app still works in **off-chain mode**: attendance is recorded in the DB with status `pending` instead of `confirmed`.

### 5. Run the app

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000), connect your wallet, and visit the dashboard.

## 🧪 Testing

### Frontend (Vitest + Testing Library)

```bash
npm test               # single run
npx vitest             # watch mode
```

### Contracts (Foundry)

```bash
cd contracts
forge test             # runs ProofStorage test suite (access control, events, fuzz)
```

## 🔍 CI

GitHub Actions (`.github/workflows/ci.yml`) runs on every push/PR to `main`:

- **Frontend job:** `npm ci` → `prisma generate` → lint → typecheck → tests → production build
- **Contracts job:** `forge build` → `forge test`

## 🛡️ Admin Dashboard

The contract owner (the wallet whose `PRIVATE_KEY` is in `.env`) has an admin view at `/admin`:

- **Authorize / revoke markers (teachers)** — the owner's wallet signs on-chain `authorizeMarker`/`revokeMarker` calls. The current marker list is derived from `MarkerAuthorized`/`MarkerRevoked` events.
- **See all students' attendance** — a signature-protected API (`/api/admin/attendance`) returns every attendance record with student wallet, date, on-chain proof, and status, plus summary stats (total students, records, marked today). Only the owner's signature is accepted.

The Admin link appears in the navbar automatically when the connected wallet is the owner.

> Requires `PRIVATE_KEY` (to derive the owner address) and, for marker management, `NEXT_PUBLIC_PROOF_ADDRESS` pointing at the deployed contract.

## ☁️ Deploying the frontend

The app deploys cleanly to **Vercel**:

1. Push the repo to GitHub (include the updated `package-lock.json`).
2. In Vercel, import the repo (framework: Next.js).
3. **Set the build command to `npx prisma generate && next build`** — the Prisma client (`lib/generated/prisma`) is gitignored and must be generated at build time, or the API routes will return 503.
4. Add the environment variables from `.env.example` (note: `PRIVATE_KEY`/`RPC_URL` are server-only; `NEXT_PUBLIC_PROOF_ADDRESS` is public).
5. Point `DATABASE_URL` at your hosted PostgreSQL and run `prisma db push` (or `prisma migrate deploy`) against it.
6. Deploy. The `/api/attendance` and `/api/users` routes are server-rendered on demand.

## 📦 Scripts

| Command | Purpose |
|---|---|
| `npm run dev` | Start the dev server |
| `npm run build` | Production build (auto-syncs the contract ABI via `prebuild`) |
| `npm run lint` | ESLint |
| `npm test` | Run the Vitest suite |
| `npm run sync:abi` | Regenerate `lib/abis/ProofStorage.json` from forge build output |

## 🗂️ Project Layout

```
app/                    # Next.js App Router pages + API routes
  api/attendance/       # GET (list) / POST (mark) attendance
  api/users/            # demo user listing endpoint
  dashboard/            # protected attendance dashboard
components/             # UI components (stats, list, mark attendance, navbar…)
hooks/useWallet.tsx     # wallet context provider + hook
lib/
  abis/                 # committed ProofStorage ABI (builds without forge)
  proof.ts              # server-side on-chain attestation
  web3.ts               # wallet connection
  prisma.ts             # Prisma client singleton
contracts/              # Foundry project (src / test / script)
prisma/schema.prisma    # data model
```

## 🔜 Roadmap

- QR / geolocation-based attendance challenges
- Calendar view for attendance history
- Email/notification reminders

## 📄 License

No license file is included in this repository. Reach out to the project owner before reusing this code.
