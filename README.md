# BD Vote — Blockchain-First Digital Voting System for Bangladesh

A secure, transparent, and tamper-proof digital voting platform built with React, TypeScript, Supabase, and the Ethereum blockchain (Base Sepolia testnet).

**Live Contract:** [`0x0eCa67dCED1D02aDACA453Ac1e330B7b4beF25f9`](https://sepolia.basescan.org/address/0x0eCa67dCED1D02aDACA453Ac1e330B7b4beF25f9) on Base Sepolia (Chain 84532)

---

## Architecture

```
Voter → Verification → Face Auth → Ballot → Edge Function → Blockchain (PRIMARY)
                                                          ↘ Supabase DB (cache)
```

**Blockchain-First:** Every vote is submitted to the smart contract first. Supabase is a read-cache only — the blockchain is the sole authority. If blockchain submission fails, the vote fails honestly — no simulated fallback.

---

## Features

### Voter
- **Biometric Verification** — AI face recognition with liveness detection (face-api.js)
- **OCR ID Scanning** — Auto data extraction from NID / University ID cards via Tesseract.js
- **Blockchain Vote Recording** — Every vote recorded immutably on Base Sepolia with candidate name visible on-chain
- **Vote Receipt** — TX hash + BaseScan link for independent verification
- **Vote Verification** — Enter TX hash to verify vote exists on-chain at `/verify-vote`
- **Offline Support** — Votes queued locally and synced on reconnect (PWA)
- **Real-time Results** — Live vote counts from both blockchain and DB at `/results`

### Results Page
- Live candidate vote counts (DB + blockchain side-by-side)
- DB vs blockchain sync indicator per candidate
- Full on-chain vote history — candidate name, timestamp, voter hash (privacy-preserved)
- Clickable TX hashes → BaseScan
- Supabase Realtime subscription for instant updates

### Admin
- **Bulk Voter Import** — Drag-and-drop ID card upload with OCR processing
- **Candidate Management** — Create, edit, and deactivate candidates per constituency
- **Constituency Management** — Define and manage election areas
- **Audit Logs** — Full activity trail for all system events
- **Incident Reporting** — Log and track voting anomalies

### Candidate
- **Candidate Dashboard** — Live vote counts and election performance

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 18, TypeScript, Vite |
| Styling | Tailwind CSS, shadcn-ui (Radix UI) |
| State / Data | React Query (@tanstack/react-query) |
| Routing | React Router DOM v6 |
| Backend / DB | Supabase (PostgreSQL + Edge Functions + Realtime) |
| Blockchain | Base Sepolia via ethers.js v6 |
| Smart Contract | Solidity 0.8.24, Hardhat, deployed on Base Sepolia |
| Face AI | face-api.js (detection + recognition + liveness) |
| OCR | Tesseract.js |
| Animation | Framer Motion |
| Forms | React Hook Form + Zod |
| PWA | vite-plugin-pwa |

---

## Smart Contract

**File:** [`contracts/BDVote.sol`](contracts/BDVote.sol)

**Key guarantees:**
- `hasVoted` mapping: once `true`, can never be set back — one vote per voter, forever
- `votes` array: append-only, records can never be deleted or modified
- `candidateVotes` mapping: only increments, never decrements
- Election can be ended but never restarted (prevents admin manipulation)
- Every vote stores `candidateName` on-chain — visible on BaseScan in event logs

**Key functions:**

```solidity
castVote(bytes32 voterIdHash, bytes32 candidateHash, string candidateName) → bytes32 receiptHash
checkHasVoted(bytes32 voterIdHash) → bool
getResults(bytes32[] candidateHashes) → uint256[]
getVote(uint256 index) → (voterIdHash, candidateHash, candidateName, timestamp, receiptHash, submittedBy)
verifyReceipt(bytes32 receipt) → bool
```

### Deploy Contract

```sh
npx hardhat compile
npx hardhat run scripts/deploy.cjs --network baseSepolia
```

The deploy script automatically updates `.env` with the new contract address.

---

## Getting Started

### Prerequisites

- Node.js >= 18
- npm

### Installation

```sh
git clone <YOUR_GIT_URL>
cd BD-Vote-Final

npm install
npm run dev
```

App runs at `http://localhost:8080`.

---

## Environment Variables

Create a `.env` file in the project root:

```env
VITE_SUPABASE_URL=https://<your-project-id>.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=<your-supabase-anon-key>
VITE_SUPABASE_PROJECT_ID=<your-project-id>

# Blockchain — Base Sepolia
VITE_BD_VOTE_CONTRACT_ADDRESS=0x0eCa67dCED1D02aDACA453Ac1e330B7b4beF25f9
BD_VOTE_CONTRACT_ADDRESS=0x0eCa67dCED1D02aDACA453Ac1e330B7b4beF25f9
BD_VOTE_DEPLOYER_PRIVATE_KEY=<deployer-wallet-private-key>
```

### Supabase Edge Function Secrets

Set these in Supabase Dashboard → Edge Functions → Secrets:

| Secret | Value |
|---|---|
| `BD_VOTE_CONTRACT_ADDRESS` | `0x0eCa67dCED1D02aDACA453Ac1e330B7b4beF25f9` |
| `BD_VOTE_DEPLOYER_PRIVATE_KEY` | your deployer wallet private key |

> `VITE_` prefixed variables are browser-exposed. Never put private keys in `VITE_` vars.

---

## Scripts

| Command | Description |
|---|---|
| `npm run dev` | Start development server |
| `npm run build` | Production build |
| `npm run preview` | Preview production build locally |
| `npm run lint` | Run ESLint |
| `npx hardhat compile` | Compile smart contract |
| `npx hardhat run scripts/deploy.cjs --network baseSepolia` | Deploy contract to Base Sepolia |

---

## Project Structure

```
├── contracts/
│   └── BDVote.sol                  # Solidity smart contract
├── scripts/
│   └── deploy.cjs                  # Hardhat deploy script
├── supabase/
│   └── functions/
│       └── cast-vote/
│           └── index.ts            # Edge function — blockchain-first vote submission
├── src/
│   ├── pages/
│   │   ├── Index.tsx               # Landing page
│   │   ├── Verification.tsx        # ID scan + face verification
│   │   ├── Ballot.tsx              # Vote casting + receipt screen
│   │   ├── Dashboard.tsx           # Voter dashboard
│   │   ├── Results.tsx             # Live results (DB + blockchain)
│   │   ├── VerifyVote.tsx          # On-chain vote verification
│   │   └── admin/                  # Admin panel pages
│   ├── components/
│   │   ├── ui/                     # shadcn-ui base components
│   │   ├── ballot/                 # FaceVerificationModal, etc.
│   │   ├── admin/                  # Admin-specific components
│   │   └── layout/                 # Navbar, Footer
│   ├── hooks/
│   │   ├── use-votes.tsx           # castVote, fetchRecentTransactions
│   │   ├── use-candidates.tsx      # Candidate data
│   │   ├── use-voters.tsx          # Voter data
│   │   └── use-offline-queue.tsx   # PWA offline vote queue
│   └── lib/
│       ├── blockchain.ts           # ethers.js contract interaction + on-chain queries
│       ├── face-verification.ts    # face-api.js wrapper
│       ├── ocr.ts                  # Tesseract.js OCR engine
│       └── liveness-detection.ts  # Face liveness checks
└── hardhat.config.cjs              # Hardhat config (Base Sepolia network)
```

---

## Routes

| Path | Description |
|---|---|
| `/` | Landing page |
| `/verification` | Voter ID + face verification |
| `/ballot` | Cast a vote |
| `/dashboard` | Voter dashboard |
| `/results` | Live election results (DB + blockchain) |
| `/verify-vote` | Verify a vote on-chain by TX hash |
| `/admin/login` | Admin login |
| `/admin/*` | Admin dashboard (voters, candidates, audit, etc.) |
| `/candidate/login` | Candidate login |
| `/candidate` | Candidate dashboard |

---

## Vote Flow (End-to-End)

```
1. Voter scans ID → OCR extracts name/ID
2. Face verification → liveness check
3. Ballot page → selects candidate → confirms
4. Edge function (Deno):
   a. Verifies voter in DB (is_verified, not has_voted)
   b. Checks blockchain: checkHasVoted(keccak256(salt:voter_id))
   c. Calls castVote(voterIdHash, candidateHash, candidateName) on Base Sepolia
   d. Gets TX hash immediately (no tx.wait() — no timeout)
   e. Inserts vote record in Supabase DB
   f. Marks voter has_voted = true
   g. DB trigger auto-increments candidates.vote_count
5. Receipt shown to voter: TX hash + BaseScan link
6. Results page updates in real-time via Supabase Realtime
```

---

## Deployment

Build and deploy the `dist/` folder to any static host (Vercel, Netlify, Cloudflare Pages):

```sh
npm run build
```

The app is PWA-ready — installable on mobile and desktop, works offline.

---

## License

This project is private. All rights reserved.
