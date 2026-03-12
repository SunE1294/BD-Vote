// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/**
 * @title BDVote
 * @notice Immutable on-chain vote store for the BD-Vote e-voting platform.
 *         Each voter wallet may cast exactly one vote during the active election window.
 */
contract BDVote {

    // ─── Data structures ──────────────────────────────────────────────────────

    struct Candidate {
        uint256 id;
        string  name;
        string  party;
        string  symbol;
        uint256 voteCount;
    }

    struct Election {
        string  name;
        uint256 startTime;
        uint256 endTime;
        bool    isActive;
    }

    // ─── State ─────────────────────────────────────────────────────────────────

    address public admin;
    Election public election;
    uint256 public candidateCount;

    mapping(uint256 => Candidate) public candidates;
    mapping(address => bool)      public hasVoted;
    mapping(address => uint256)   public voterChoice;

    // ─── Events ────────────────────────────────────────────────────────────────

    event CandidateAdded      (uint256 indexed id, string name, string party);
    event ElectionConfigured  (string name, uint256 startTime, uint256 endTime);
    event VoteCast            (address indexed voter, uint256 indexed candidateId, uint256 timestamp);

    // ─── Modifiers ─────────────────────────────────────────────────────────────

    modifier onlyAdmin() {
        require(msg.sender == admin, "BDVote: caller is not admin");
        _;
    }

    modifier electionActive() {
        require(election.isActive,                    "BDVote: no active election");
        require(block.timestamp >= election.startTime, "BDVote: election not started");
        require(block.timestamp <= election.endTime,   "BDVote: election ended");
        _;
    }

    // ─── Constructor ───────────────────────────────────────────────────────────

    constructor() {
        admin = msg.sender;
    }

    // ─── Admin functions ───────────────────────────────────────────────────────

    /**
     * @notice Set up (or replace) the election window.
     * @param _name      Human-readable election title.
     * @param _startTime Unix timestamp when voting opens.
     * @param _endTime   Unix timestamp when voting closes.
     */
    function configureElection(
        string calldata _name,
        uint256 _startTime,
        uint256 _endTime
    ) external onlyAdmin {
        require(_endTime > _startTime, "BDVote: invalid time range");
        election = Election(_name, _startTime, _endTime, true);
        emit ElectionConfigured(_name, _startTime, _endTime);
    }

    /**
     * @notice Register a new candidate. Candidates are numbered 1..N.
     */
    function addCandidate(
        string calldata _name,
        string calldata _party,
        string calldata _symbol
    ) external onlyAdmin {
        candidateCount++;
        candidates[candidateCount] = Candidate(candidateCount, _name, _party, _symbol, 0);
        emit CandidateAdded(candidateCount, _name, _party);
    }

    // ─── Voter functions ───────────────────────────────────────────────────────

    /**
     * @notice Cast a vote for a candidate.  Reverts if the caller has already voted,
     *         the election is not active, or the candidate ID is invalid.
     * @param _candidateId 1-based candidate index.
     */
    function castVote(uint256 _candidateId) external electionActive {
        require(!hasVoted[msg.sender],                              "BDVote: already voted");
        require(_candidateId > 0 && _candidateId <= candidateCount, "BDVote: invalid candidate");

        hasVoted[msg.sender]    = true;
        voterChoice[msg.sender] = _candidateId;
        candidates[_candidateId].voteCount++;

        emit VoteCast(msg.sender, _candidateId, block.timestamp);
    }

    // ─── View functions ────────────────────────────────────────────────────────

    /// @notice Returns every candidate with their live vote tally.
    function getAllCandidates() external view returns (Candidate[] memory) {
        Candidate[] memory result = new Candidate[](candidateCount);
        for (uint256 i = 1; i <= candidateCount; i++) {
            result[i - 1] = candidates[i];
        }
        return result;
    }

    /// @notice Returns true if _voter has already cast a vote.
    function checkVoted(address _voter) external view returns (bool) {
        return hasVoted[_voter];
    }

    /// @notice Returns the candidate ID chosen by _voter (0 if not voted).
    function getVoterChoice(address _voter) external view returns (uint256) {
        return voterChoice[_voter];
    }

    /// @notice Returns the sum of all votes recorded so far.
    function getTotalVotes() external view returns (uint256 total) {
        for (uint256 i = 1; i <= candidateCount; i++) {
            total += candidates[i].voteCount;
        }
    }

    /**
     * @notice Convenience status check for the frontend.
     * @return isOngoing  True when the election window is open right now.
     * @return hasEnded   True when the end time has passed.
     * @return hasStarted True when the start time has passed.
     */
    function getElectionStatus()
        external
        view
        returns (bool isOngoing, bool hasEnded, bool hasStarted)
    {
        hasStarted = block.timestamp >= election.startTime;
        hasEnded   = block.timestamp >  election.endTime;
        isOngoing  = election.isActive && hasStarted && !hasEnded;
    }
}
