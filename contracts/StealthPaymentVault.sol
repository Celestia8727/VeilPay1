// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title StealthPaymentVault
 * @notice Privacy-preserving subscription payment vault using stealth addresses
 * @dev Optimized for parallel execution - no subscription state storage
 *
 * Privacy Guarantees:
 * - NO domain awareness (domain never touches this contract)
 * - NO subscription storage (all data off-chain)
 * - NO on-chain correlation between stealth addresses
 * - Only emits: merchantId, planId, stealthAddress, ephemeralPubKey
 *
 * This contract ONLY:
 * 1. Manages merchant plans
 * 2. Accepts payments to stealth addresses
 * 3. Emits minimal events for indexer
 */
contract StealthPaymentVault {
    // Subscription plan details
    struct Plan {
        uint256 price;
        uint256 duration; // in seconds
        bool active;
    }

    // Merchant => PlanId => Plan
    mapping(bytes32 => mapping(uint256 => Plan)) public plans;

    // Merchant => authorized owner
    mapping(bytes32 => address) public merchantOwners;

    // Events
    event PaymentReceived(
        bytes32 indexed merchantId,
        uint256 indexed planId,
        address indexed stealthAddress,
        uint256 amount,
        uint256 duration,
        uint256 timestamp,
        bytes ephemeralPubKey // For indexer to scan with view key
    );

    event PlanCreated(
        bytes32 indexed merchantId,
        uint256 indexed planId,
        uint256 price,
        uint256 duration,
        uint256 timestamp
    );

    event PlanUpdated(
        bytes32 indexed merchantId,
        uint256 indexed planId,
        uint256 price,
        uint256 duration,
        bool active,
        uint256 timestamp
    );

    event MerchantRegistered(
        bytes32 indexed merchantId,
        address indexed owner,
        uint256 timestamp
    );

    // Errors
    error InvalidPayment();
    error PlanNotActive();
    error PlanDoesNotExist();
    error NotMerchantOwner();
    error MerchantAlreadyExists();
    error InvalidStealthAddress();
    error InvalidPlanParameters();
    error InvalidEphemeralPubKey();

    /**
     * @notice Register a new merchant
     * @param merchantId Unique identifier for the merchant
     */
    function registerMerchant(bytes32 merchantId) external {
        if (merchantOwners[merchantId] != address(0)) {
            revert MerchantAlreadyExists();
        }

        merchantOwners[merchantId] = msg.sender;

        emit MerchantRegistered(merchantId, msg.sender, block.timestamp);
    }

    /**
     * @notice Create a new subscription plan
     * @param merchantId Merchant identifier
     * @param planId Plan identifier
     * @param price Price in wei
     * @param duration Duration in seconds
     */
    function createPlan(
        bytes32 merchantId,
        uint256 planId,
        uint256 price,
        uint256 duration
    ) external {
        if (merchantOwners[merchantId] != msg.sender) {
            revert NotMerchantOwner();
        }
        if (price == 0 || duration == 0) {
            revert InvalidPlanParameters();
        }
        if (plans[merchantId][planId].active) {
            revert PlanDoesNotExist(); // Plan already exists
        }

        plans[merchantId][planId] = Plan({
            price: price,
            duration: duration,
            active: true
        });

        emit PlanCreated(merchantId, planId, price, duration, block.timestamp);
    }

    /**
     * @notice Update an existing plan
     * @param merchantId Merchant identifier
     * @param planId Plan identifier
     * @param price New price
     * @param duration New duration
     * @param active Whether plan is active
     */
    function updatePlan(
        bytes32 merchantId,
        uint256 planId,
        uint256 price,
        uint256 duration,
        bool active
    ) external {
        if (merchantOwners[merchantId] != msg.sender) {
            revert NotMerchantOwner();
        }
        if (price == 0 || duration == 0) {
            revert InvalidPlanParameters();
        }

        Plan storage plan = plans[merchantId][planId];
        plan.price = price;
        plan.duration = duration;
        plan.active = active;

        emit PlanUpdated(
            merchantId,
            planId,
            price,
            duration,
            active,
            block.timestamp
        );
    }

    /**
     * @notice Pay for a subscription to a stealth address
     * @param merchantId Merchant identifier
     * @param planId Plan identifier
     * @param stealthAddress The generated stealth address to receive payment
     * @param ephemeralPubKey Ephemeral public key for indexer scanning (uncompressed, 65 bytes)
     *
     * @dev This function is STATELESS and parallel-friendly
     * - NO subscription storage
     * - NO domain awareness
     * - Each call is independent
     */
    function paySubscription(
        bytes32 merchantId,
        uint256 planId,
        address stealthAddress,
        bytes calldata ephemeralPubKey
    ) external payable {
        if (stealthAddress == address(0)) {
            revert InvalidStealthAddress();
        }
        if (ephemeralPubKey.length != 65) {
            revert InvalidEphemeralPubKey();
        }

        Plan memory plan = plans[merchantId][planId];

        if (!plan.active) {
            revert PlanNotActive();
        }
        if (msg.value != plan.price) {
            revert InvalidPayment();
        }

        // Transfer funds directly to stealth address
        // No balance storage = maximum parallelism
        (bool success, ) = stealthAddress.call{value: msg.value}("");
        require(success, "Transfer failed");

        // Emit minimal event for indexer
        // NOTE: NO domainHash - this breaks the on-chain correlation
        emit PaymentReceived(
            merchantId,
            planId,
            stealthAddress,
            msg.value,
            plan.duration,
            block.timestamp,
            ephemeralPubKey
        );
    }

    /**
     * @notice Get plan details
     * @param merchantId Merchant identifier
     * @param planId Plan identifier
     * @return price Plan price
     * @return duration Plan duration
     * @return active Whether plan is active
     */
    function getPlan(
        bytes32 merchantId,
        uint256 planId
    ) external view returns (uint256 price, uint256 duration, bool active) {
        Plan memory plan = plans[merchantId][planId];
        return (plan.price, plan.duration, plan.active);
    }

    /**
     * @notice Check if a plan is active
     * @param merchantId Merchant identifier
     * @param planId Plan identifier
     * @return active Whether the plan is active
     */
    function isPlanActive(
        bytes32 merchantId,
        uint256 planId
    ) external view returns (bool) {
        return plans[merchantId][planId].active;
    }

    /**
     * @notice Get merchant owner
     * @param merchantId Merchant identifier
     * @return owner Address of merchant owner
     */
    function getMerchantOwner(
        bytes32 merchantId
    ) external view returns (address) {
        return merchantOwners[merchantId];
    }
}
