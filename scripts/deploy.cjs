/**
 * Deployment script for BDVote contract.
 *
 * Usage:
 *   npx hardhat run scripts/deploy.cjs --network amoy
 *   npx hardhat run scripts/deploy.cjs --network localhost
 *
 * After deploying, copy the printed contract address into .env:
 *   VITE_CONTRACT_ADDRESS=0x...
 */

const { ethers } = require("hardhat");

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Deploying BDVote with account:", deployer.address);

  const balance = await ethers.provider.getBalance(deployer.address);
  console.log("Account balance:", ethers.formatEther(balance), "MATIC");

  // ── Deploy ──────────────────────────────────────────────────────────────────
  const BDVote = await ethers.getContractFactory("BDVote");
  const contract = await BDVote.deploy();
  await contract.waitForDeployment();

  const address = await contract.getAddress();
  console.log("\n✅  BDVote deployed to:", address);
  console.log("   Add to .env → VITE_CONTRACT_ADDRESS=" + address);

  // ── Seed candidates (matches Ballot.tsx order) ──────────────────────────────
  console.log("\nAdding candidates...");
  const candidates = [
    ["আব্দুর রহমান",         "বাংলাদেশ আওয়ামী লীগ",         "নৌকা"],
    ["মোসাম্মাৎ ফাতেমা বেগম","বাংলাদেশ জাতীয়তাবাদী দল",    "ধানের শীষ"],
    ["নজরুল ইসলাম",          "জাতীয় পার্টি",                 "লাঙল"],
    ["সৈয়দা সুলতানা",        "ইসলামী আন্দোলন বাংলাদেশ",      "হাতপাখা"],
    ["মোঃ আমিনুল হক",        "স্বতন্ত্র",                     "ঘড়া"],
    ["বিপ্লব কুমার রায়",     "স্বতন্ত্র",                     "মোমবাতি"],
  ];

  for (const [name, party, symbol] of candidates) {
    const tx = await contract.addCandidate(name, party, symbol);
    await tx.wait();
    console.log("  ✓ Added:", name);
  }

  // ── Configure election (active for 24 hours) ─────────────────────────────
  const startTime = Math.floor(Date.now() / 1000);
  const endTime   = startTime + 24 * 60 * 60;

  const electionTx = await contract.configureElection(
    "জাতীয় সংসদ নির্বাচন ২০২৬",
    startTime,
    endTime,
  );
  await electionTx.wait();

  console.log("\n✅  Election configured");
  console.log("   Start:", new Date(startTime * 1000).toISOString());
  console.log("   End:  ", new Date(endTime   * 1000).toISOString());
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
