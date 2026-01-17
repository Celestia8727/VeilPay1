// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title PrivacyDomainRegistry
 * @notice Registry for privacy domains mapping to stealth address public keys
 * @dev Read-only lookups are parallel-friendly (no state mutation during usage)
 *
 * This contract enables users to register privacy domains (like ENS but for privacy)
 * and associate them with public keys used for stealth address generation.
 */
contract PrivacyDomainRegistry {
    struct Domain {
        address owner;
        bytes spendPubKey; // Full EC public key (65 bytes uncompressed: 0x04 + x + y)
        bytes viewPubKey; // Full EC public key (65 bytes uncompressed: 0x04 + x + y)
        uint256 registeredAt;
        bool exists;
    }

    // Domain name hash => Domain data
    mapping(bytes32 => Domain) public domains;

    // Events
    event DomainRegistered(
        bytes32 indexed domainHash,
        address indexed owner,
        bytes spendPubKey,
        bytes viewPubKey,
        uint256 timestamp
    );

    event DomainKeysUpdated(
        bytes32 indexed domainHash,
        bytes spendPubKey,
        bytes viewPubKey,
        uint256 timestamp
    );

    event DomainTransferred(
        bytes32 indexed domainHash,
        address indexed previousOwner,
        address indexed newOwner,
        uint256 timestamp
    );

    // Errors
    error DomainAlreadyExists(bytes32 domainHash);
    error DomainDoesNotExist(bytes32 domainHash);
    error NotDomainOwner(bytes32 domainHash, address caller);
    error InvalidAddress();
    error InvalidPublicKey();

    /**
     * @notice Register a new privacy domain
     * @param domainHash Keccak256 hash of the domain name
     * @param spendPubKey Full EC public key for stealth address generation (65 bytes)
     * @param viewPubKey Full EC public key for payment detection (65 bytes)
     */
    function registerDomain(
        bytes32 domainHash,
        bytes calldata spendPubKey,
        bytes calldata viewPubKey
    ) external {
        if (domains[domainHash].exists) {
            revert DomainAlreadyExists(domainHash);
        }
        if (spendPubKey.length != 65 || viewPubKey.length != 65) {
            revert InvalidPublicKey();
        }
        // Verify keys start with 0x04 (uncompressed format)
        if (spendPubKey[0] != 0x04 || viewPubKey[0] != 0x04) {
            revert InvalidPublicKey();
        }

        domains[domainHash] = Domain({
            owner: msg.sender,
            spendPubKey: spendPubKey,
            viewPubKey: viewPubKey,
            registeredAt: block.timestamp,
            exists: true
        });

        emit DomainRegistered(
            domainHash,
            msg.sender,
            spendPubKey,
            viewPubKey,
            block.timestamp
        );
    }

    /**
     * @notice Update public keys for an existing domain
     * @param domainHash Hash of the domain to update
     * @param spendPubKey New spend public key (65 bytes)
     * @param viewPubKey New view public key (65 bytes)
     */
    function updateDomainKeys(
        bytes32 domainHash,
        bytes calldata spendPubKey,
        bytes calldata viewPubKey
    ) external {
        Domain storage domain = domains[domainHash];

        if (!domain.exists) {
            revert DomainDoesNotExist(domainHash);
        }
        if (domain.owner != msg.sender) {
            revert NotDomainOwner(domainHash, msg.sender);
        }
        if (spendPubKey.length != 65 || viewPubKey.length != 65) {
            revert InvalidPublicKey();
        }
        if (spendPubKey[0] != 0x04 || viewPubKey[0] != 0x04) {
            revert InvalidPublicKey();
        }

        domain.spendPubKey = spendPubKey;
        domain.viewPubKey = viewPubKey;

        emit DomainKeysUpdated(
            domainHash,
            spendPubKey,
            viewPubKey,
            block.timestamp
        );
    }

    /**
     * @notice Transfer domain ownership to a new address
     * @param domainHash Hash of the domain to transfer
     * @param newOwner Address of the new owner
     */
    function transferDomain(bytes32 domainHash, address newOwner) external {
        Domain storage domain = domains[domainHash];

        if (!domain.exists) {
            revert DomainDoesNotExist(domainHash);
        }
        if (domain.owner != msg.sender) {
            revert NotDomainOwner(domainHash, msg.sender);
        }
        if (newOwner == address(0)) {
            revert InvalidAddress();
        }

        address previousOwner = domain.owner;
        domain.owner = newOwner;

        emit DomainTransferred(
            domainHash,
            previousOwner,
            newOwner,
            block.timestamp
        );
    }

    /**
     * @notice Get domain information (read-only, parallel-friendly)
     * @param domainHash Hash of the domain to query
     * @return owner Owner address
     * @return spendPubKey Spend public key (65 bytes)
     * @return viewPubKey View public key (65 bytes)
     * @return registeredAt Registration timestamp
     * @return exists Whether domain exists
     */
    function getDomain(
        bytes32 domainHash
    )
        external
        view
        returns (
            address owner,
            bytes memory spendPubKey,
            bytes memory viewPubKey,
            uint256 registeredAt,
            bool exists
        )
    {
        Domain memory domain = domains[domainHash];
        return (
            domain.owner,
            domain.spendPubKey,
            domain.viewPubKey,
            domain.registeredAt,
            domain.exists
        );
    }

    /**
     * @notice Check if a domain exists
     * @param domainHash Hash of the domain to check
     * @return exists Whether the domain exists
     */
    function domainExists(bytes32 domainHash) external view returns (bool) {
        return domains[domainHash].exists;
    }

    /**
     * @notice Get the owner of a domain
     * @param domainHash Hash of the domain
     * @return owner Address of the domain owner
     */
    function getDomainOwner(
        bytes32 domainHash
    ) external view returns (address) {
        return domains[domainHash].owner;
    }
}
