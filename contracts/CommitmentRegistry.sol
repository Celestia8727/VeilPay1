// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title CommitmentRegistry
 * @notice Stores subscription commitments on-chain for trustless ZK verification
 * @dev Permissionless - anyone can post commitments (censorship-resistant)
 *
 * Key Properties:
 * - Immutable: Cannot delete or modify commitments
 * - Privacy-preserving: Commitment reveals nothing about subscription details
 * - Trustless: ZK verifier checks commitment exists without learning subscription data
 */
contract CommitmentRegistry {
    // Commitment => exists
    mapping(bytes32 => bool) public validCommitments;

    // Commitment => timestamp (for ordering and indexing)
    mapping(bytes32 => uint256) public commitmentTimestamps;

    // Commitment => poster (for accountability, optional)
    mapping(bytes32 => address) public commitmentPosters;

    // Total commitments registered
    uint256 public totalCommitments;

    // Events
    event CommitmentRegistered(
        bytes32 indexed commitment,
        address indexed poster,
        uint256 timestamp
    );

    // Errors
    error CommitmentAlreadyExists();
    error InvalidCommitment();

    /**
     * @notice Register a subscription commitment
     * @param commitment Hash of subscription data: H(merchantId, planId, stealthAddress, paidAt, expiresAt, secret)
     * @dev Anyone can post commitments (permissionless) - enables censorship resistance
     */
    function registerCommitment(bytes32 commitment) external {
        if (commitment == bytes32(0)) {
            revert InvalidCommitment();
        }
        if (validCommitments[commitment]) {
            revert CommitmentAlreadyExists();
        }

        validCommitments[commitment] = true;
        commitmentTimestamps[commitment] = block.timestamp;
        commitmentPosters[commitment] = msg.sender;
        totalCommitments++;

        emit CommitmentRegistered(commitment, msg.sender, block.timestamp);
    }

    /**
     * @notice Batch register multiple commitments (gas optimization)
     * @param commitments Array of commitment hashes
     */
    function registerCommitmentBatch(bytes32[] calldata commitments) external {
        for (uint256 i = 0; i < commitments.length; i++) {
            bytes32 commitment = commitments[i];

            if (commitment == bytes32(0)) {
                revert InvalidCommitment();
            }
            if (validCommitments[commitment]) {
                continue; // Skip duplicates instead of reverting
            }

            validCommitments[commitment] = true;
            commitmentTimestamps[commitment] = block.timestamp;
            commitmentPosters[commitment] = msg.sender;
            totalCommitments++;

            emit CommitmentRegistered(commitment, msg.sender, block.timestamp);
        }
    }

    /**
     * @notice Check if commitment exists
     * @param commitment The commitment to check
     * @return exists Whether the commitment is registered
     */
    function isValidCommitment(
        bytes32 commitment
    ) external view returns (bool) {
        return validCommitments[commitment];
    }

    /**
     * @notice Get commitment details
     * @param commitment The commitment to query
     * @return exists Whether commitment exists
     * @return timestamp When it was registered
     * @return poster Who posted it
     */
    function getCommitmentDetails(
        bytes32 commitment
    ) external view returns (bool exists, uint256 timestamp, address poster) {
        return (
            validCommitments[commitment],
            commitmentTimestamps[commitment],
            commitmentPosters[commitment]
        );
    }
}
