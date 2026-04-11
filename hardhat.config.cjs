require("@nomicfoundation/hardhat-toolbox");
require("dotenv").config();

const deployerKey = process.env.BD_VOTE_DEPLOYER_PRIVATE_KEY;
if (!deployerKey) {
  console.warn("WARNING: BD_VOTE_DEPLOYER_PRIVATE_KEY is not set in .env — deployment will fail.");
}

/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
  solidity: "0.8.24",
  networks: {
    baseSepolia: {
      url: "https://sepolia.base.org",
      chainId: 84532,
      accounts: deployerKey ? [`0x${deployerKey.replace(/^0x/, "")}`] : [],
    },
  },
};
