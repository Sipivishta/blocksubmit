// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// @title SubmissionRegistry
/// @notice Records an immutable fingerprint (SHA-256 file hash + metadata)
///         for each academic submission. The actual file NEVER touches this
///         contract or the chain — only its hash and identifying IDs do.
/// @dev IDs (submissionId, studentId, assignmentId) are the app's Postgres
///      UUIDs, passed in as bytes32 (UUID bytes, or keccak256 of the UUID
///      string — pick one convention and keep it consistent app-wide; see
///      lib/blockchain.ts for the encoding used by this project).
contract SubmissionRegistry {
    struct Record {
        bytes32 studentId;
        bytes32 assignmentId;
        bytes32 fileHash; // SHA-256 digest of the file, stored raw (32 bytes)
        uint256 timestamp; // block.timestamp at recording time
        address recordedBy; // the server signer that submitted the tx
        bool exists;
    }

    /// @dev submissionId => Record. One record per submission; recording
    ///      twice for the same submissionId is rejected to keep the
    ///      integrity guarantee meaningful (a hash can't be silently
    ///      overwritten).
    mapping(bytes32 => Record) private records;

    /// @notice Emitted every time a submission's fingerprint is recorded.
    event SubmissionRecorded(
        bytes32 indexed submissionId,
        bytes32 indexed studentId,
        bytes32 indexed assignmentId,
        bytes32 fileHash,
        uint256 timestamp
    );

    /// @notice The only address allowed to call recordSubmission.
    /// @dev Kept intentionally simple (single trusted server signer) — see
    ///      README "Trust model" for why this is acceptable for a
    ///      portfolio/demo project and what a production version would add
    ///      (e.g. a role-gated set of signers, or client-side signing).
    address public owner;

    error NotOwner();
    error AlreadyRecorded(bytes32 submissionId);
    error RecordNotFound(bytes32 submissionId);

    modifier onlyOwner() {
        if (msg.sender != owner) revert NotOwner();
        _;
    }

    constructor() {
        owner = msg.sender;
    }

    /// @notice Record a new submission's fingerprint on-chain.
    /// @dev Reverts if a record already exists for this submissionId —
    ///      records are write-once by design.
    function recordSubmission(
        bytes32 submissionId,
        bytes32 studentId,
        bytes32 assignmentId,
        bytes32 fileHash
    ) external onlyOwner {
        if (records[submissionId].exists) {
            revert AlreadyRecorded(submissionId);
        }

        records[submissionId] = Record({
            studentId: studentId,
            assignmentId: assignmentId,
            fileHash: fileHash,
            timestamp: block.timestamp,
            recordedBy: msg.sender,
            exists: true
        });

        emit SubmissionRecorded(
            submissionId,
            studentId,
            assignmentId,
            fileHash,
            block.timestamp
        );
    }

    /// @notice Fetch a previously recorded submission fingerprint.
    function getSubmission(bytes32 submissionId)
        external
        view
        returns (
            bytes32 studentId,
            bytes32 assignmentId,
            bytes32 fileHash,
            uint256 timestamp,
            address recordedBy
        )
    {
        Record storage r = records[submissionId];
        if (!r.exists) revert RecordNotFound(submissionId);
        return (r.studentId, r.assignmentId, r.fileHash, r.timestamp, r.recordedBy);
    }

    /// @notice Cheap existence check without reverting, useful for
    ///         idempotency checks before calling recordSubmission.
    function hasRecord(bytes32 submissionId) external view returns (bool) {
        return records[submissionId].exists;
    }

    /// @notice Transfer the server-signer role to a new address (key
    ///         rotation). Owner-only.
    function transferOwnership(address newOwner) external onlyOwner {
        require(newOwner != address(0), "zero address");
        owner = newOwner;
    }
}
