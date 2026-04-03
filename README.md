<<<<<<< HEAD
📊 BD-Vote — Secure & Transparent E-Voting System for Bangladesh

BD-Vote is a decentralized, AI-powered e-voting support system designed to modernize the election process in Bangladesh. The platform uses NID-based digital verification, facial recognition, and blockchain technology to ensure secure voter authentication, prevent fraud, and maintain full transparency in vote counting.

The system verifies voters through OCR-based NID scanning and live face matching, ensuring one person, one vote. Once a vote is cast, it is stored in an immutable distributed ledger, eliminating the risk of tampering or unauthorized modification. BD-Vote also provides a real-time public results dashboard, allowing citizens and observers to monitor election outcomes transparently.

This project aims to reduce election costs, eliminate booth capturing and proxy voting, and increase voter participation by enabling secure remote voting—especially for expatriates, elderly, and physically challenged citizens.

🔐 Key Features

NID verification using OCR (Tesseract.js)

Live face detection & matching (Face-api.js)

One-vote-per-voter enforcement

Blockchain-based immutable vote storage

Real-time public election results dashboard

Admin panel for candidate and constituency management

🛠 Tech Stack

Frontend: TypeSrcipt, Tailwind CSS

AI & Vision: Face-api.js, Tesseract.js

Blockchain: Solidity, Ethers.js

Backend: Supabase (PostgreSQL)
=======
# BDV - ইউনিভোট ব্লকচেইন ই-ভোটিং

## Project info
A modern, secure, and transparent digital voting solution for Bangladesh.

## Project Roles and Team Structure
This project is logically structured to distribute development across distinct specialties, allowing three team members to work efficiently in a parallel workflow.

### Member 1: Smart Contract & Blockchain Infrastructure
**Responsibilities:**
- Designing and implementing the Core Voting Contract (Solidity/Vyper).
- Ensuring network deployment (Hardhat/Foundry integration).
- Integrating user identities and secure transaction handling at the protocol layer.

### Member 2: Frontend & Voting Interface
**Responsibilities:**
- Creating the core user interface and user dashboards (Vite, React, TypeScript).
- Styling the interface for a clean user experience (TailwindCSS, shadcn-ui).
- Handling form submissions, validations, and mapping user interactions routes.

### Member 3: Backend & Integration
**Responsibilities:**
- Bridging the React Frontend with the Blockchain Network (Ethers.js / Web3 interface).
- Maintaining testing frameworks and ensuring state management between chains.
- Managing off-chain data flows and environment configurations (e.g., config, database APIs).

---

## How can I edit this code?
The only requirement is having Node.js & npm installed - [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating)

Follow these steps:

```sh
# Step 1: Clone the repository using the project's Git URL.
git clone <YOUR_GIT_URL>

# Step 2: Navigate to the project directory.
cd <YOUR_PROJECT_NAME>

# Step 3: Install the necessary dependencies.
npm i

# Step 4: Start the development server with auto-reloading and an instant preview.
npm run dev
```

## What technologies are used for this project?
This project is built with:
- Vite
- TypeScript
- React
- shadcn-ui
- Tailwind CSS
>>>>>>> main
