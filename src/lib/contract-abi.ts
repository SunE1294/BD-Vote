/**
 * ABI for the BDVote smart contract (contracts/BDVote.sol).
 * Re-generate this file after any contract change by running:
 *   npx hardhat compile
 * then copying artifacts/contracts/BDVote.sol/BDVote.json → abi field.
 */
export const BDVoteABI = [
  // ─── Constructor ────────────────────────────────────────────────────────────
  { inputs: [], stateMutability: "nonpayable", type: "constructor" },

  // ─── Events ─────────────────────────────────────────────────────────────────
  {
    anonymous: false,
    inputs: [
      { indexed: true,  internalType: "uint256", name: "id",    type: "uint256" },
      { indexed: false, internalType: "string",  name: "name",  type: "string"  },
      { indexed: false, internalType: "string",  name: "party", type: "string"  },
    ],
    name: "CandidateAdded",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      { indexed: false, internalType: "string",  name: "name",      type: "string"  },
      { indexed: false, internalType: "uint256", name: "startTime", type: "uint256" },
      { indexed: false, internalType: "uint256", name: "endTime",   type: "uint256" },
    ],
    name: "ElectionConfigured",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      { indexed: true,  internalType: "address", name: "voter",       type: "address" },
      { indexed: true,  internalType: "uint256", name: "candidateId", type: "uint256" },
      { indexed: false, internalType: "uint256", name: "timestamp",   type: "uint256" },
    ],
    name: "VoteCast",
    type: "event",
  },

  // ─── State-variable getters ─────────────────────────────────────────────────
  {
    inputs: [],
    name: "admin",
    outputs: [{ internalType: "address", name: "", type: "address" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "candidateCount",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    name: "candidates",
    outputs: [
      { internalType: "uint256", name: "id",        type: "uint256" },
      { internalType: "string",  name: "name",      type: "string"  },
      { internalType: "string",  name: "party",     type: "string"  },
      { internalType: "string",  name: "symbol",    type: "string"  },
      { internalType: "uint256", name: "voteCount", type: "uint256" },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "election",
    outputs: [
      { internalType: "string",  name: "name",      type: "string"  },
      { internalType: "uint256", name: "startTime", type: "uint256" },
      { internalType: "uint256", name: "endTime",   type: "uint256" },
      { internalType: "bool",    name: "isActive",  type: "bool"    },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [{ internalType: "address", name: "", type: "address" }],
    name: "hasVoted",
    outputs: [{ internalType: "bool", name: "", type: "bool" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [{ internalType: "address", name: "", type: "address" }],
    name: "voterChoice",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },

  // ─── Admin write functions ──────────────────────────────────────────────────
  {
    inputs: [
      { internalType: "string",  name: "_name",   type: "string"  },
      { internalType: "string",  name: "_party",  type: "string"  },
      { internalType: "string",  name: "_symbol", type: "string"  },
    ],
    name: "addCandidate",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      { internalType: "string",  name: "_name",      type: "string"  },
      { internalType: "uint256", name: "_startTime", type: "uint256" },
      { internalType: "uint256", name: "_endTime",   type: "uint256" },
    ],
    name: "configureElection",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },

  // ─── Voter write functions ──────────────────────────────────────────────────
  {
    inputs: [{ internalType: "uint256", name: "_candidateId", type: "uint256" }],
    name: "castVote",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },

  // ─── View functions ─────────────────────────────────────────────────────────
  {
    inputs: [],
    name: "getAllCandidates",
    outputs: [
      {
        components: [
          { internalType: "uint256", name: "id",        type: "uint256" },
          { internalType: "string",  name: "name",      type: "string"  },
          { internalType: "string",  name: "party",     type: "string"  },
          { internalType: "string",  name: "symbol",    type: "string"  },
          { internalType: "uint256", name: "voteCount", type: "uint256" },
        ],
        internalType: "struct BDVote.Candidate[]",
        name: "",
        type: "tuple[]",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [{ internalType: "address", name: "_voter", type: "address" }],
    name: "checkVoted",
    outputs: [{ internalType: "bool", name: "", type: "bool" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [{ internalType: "address", name: "_voter", type: "address" }],
    name: "getVoterChoice",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "getTotalVotes",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "getElectionStatus",
    outputs: [
      { internalType: "bool", name: "isOngoing",  type: "bool" },
      { internalType: "bool", name: "hasEnded",   type: "bool" },
      { internalType: "bool", name: "hasStarted", type: "bool" },
    ],
    stateMutability: "view",
    type: "function",
  },
] as const;
