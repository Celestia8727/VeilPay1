export const CONTRACTS = {
    REGISTRY: process.env.NEXT_PUBLIC_REGISTRY_ADDRESS || '',
    COMMITMENT_REGISTRY: process.env.NEXT_PUBLIC_COMMITMENT_REGISTRY_ADDRESS || '',
    VAULT: process.env.NEXT_PUBLIC_VAULT_ADDRESS || '',
    VERIFIER: process.env.NEXT_PUBLIC_VERIFIER_ADDRESS || '',
} as const;

export const REGISTRY_ABI = [
    {
        type: 'function',
        name: 'registerDomain',
        stateMutability: 'nonpayable',
        inputs: [
            { name: 'domainHash', type: 'bytes32' },
            { name: 'spendPubKey', type: 'bytes' },
            { name: 'viewPubKey', type: 'bytes' }
        ],
        outputs: []
    },
    {
        type: 'function',
        name: 'getDomain',
        stateMutability: 'view',
        inputs: [{ name: 'domainHash', type: 'bytes32' }],
        outputs: [
            { name: 'owner', type: 'address' },
            { name: 'spendPubKey', type: 'bytes' },
            { name: 'viewPubKey', type: 'bytes' },
            { name: 'registeredAt', type: 'uint256' },
            { name: 'exists', type: 'bool' }
        ]
    },
    {
        type: 'function',
        name: 'domainExists',
        stateMutability: 'view',
        inputs: [{ name: 'domainHash', type: 'bytes32' }],
        outputs: [{ name: '', type: 'bool' }]
    },
    {
        type: 'event',
        name: 'DomainRegistered',
        inputs: [
            { name: 'domainHash', type: 'bytes32', indexed: true },
            { name: 'owner', type: 'address', indexed: true },
            { name: 'spendPubKey', type: 'bytes', indexed: false },
            { name: 'viewPubKey', type: 'bytes', indexed: false },
            { name: 'timestamp', type: 'uint256', indexed: false }
        ]
    }
] as const;


export const VAULT_ABI = [
    {
        type: 'function',
        name: 'registerMerchant',
        stateMutability: 'nonpayable',
        inputs: [{ name: 'merchantId', type: 'bytes32' }],
        outputs: []
    },
    {
        type: 'function',
        name: 'createPlan',
        stateMutability: 'nonpayable',
        inputs: [
            { name: 'merchantId', type: 'bytes32' },
            { name: 'planId', type: 'uint256' },
            { name: 'price', type: 'uint256' },
            { name: 'duration', type: 'uint256' }
        ],
        outputs: []
    },
    {
        type: 'function',
        name: 'paySubscription',
        stateMutability: 'payable',
        inputs: [
            { name: 'merchantId', type: 'bytes32' },
            { name: 'planId', type: 'uint256' },
            { name: 'stealthAddress', type: 'address' },
            { name: 'ephemeralPubKey', type: 'bytes' }
        ],
        outputs: []
    },
    {
        type: 'function',
        name: 'getPlan',
        stateMutability: 'view',
        inputs: [
            { name: 'merchantId', type: 'bytes32' },
            { name: 'planId', type: 'uint256' }
        ],
        outputs: [
            { name: 'price', type: 'uint256' },
            { name: 'duration', type: 'uint256' },
            { name: 'active', type: 'bool' }
        ]
    },
    {
        type: 'function',
        name: 'getMerchantOwner',
        stateMutability: 'view',
        inputs: [{ name: 'merchantId', type: 'bytes32' }],
        outputs: [{ name: '', type: 'address' }]
    },
    {
        type: 'event',
        name: 'MerchantRegistered',
        inputs: [
            { name: 'merchantId', type: 'bytes32', indexed: true },
            { name: 'owner', type: 'address', indexed: true },
            { name: 'timestamp', type: 'uint256', indexed: false }
        ]
    },
    {
        type: 'event',
        name: 'PlanCreated',
        inputs: [
            { name: 'merchantId', type: 'bytes32', indexed: true },
            { name: 'planId', type: 'uint256', indexed: true },
            { name: 'price', type: 'uint256', indexed: false },
            { name: 'duration', type: 'uint256', indexed: false },
            { name: 'timestamp', type: 'uint256', indexed: false }
        ]
    },
    {
        type: 'event',
        name: 'PaymentReceived',
        inputs: [
            { name: 'merchantId', type: 'bytes32', indexed: true },
            { name: 'planId', type: 'uint256', indexed: true },
            { name: 'stealthAddress', type: 'address', indexed: true },
            { name: 'amount', type: 'uint256', indexed: false },
            { name: 'duration', type: 'uint256', indexed: false },
            { name: 'timestamp', type: 'uint256', indexed: false },
            { name: 'ephemeralPubKey', type: 'bytes', indexed: false }
        ]
    }
] as const;


export const COMMITMENT_REGISTRY_ABI = [
    'function registerCommitment(bytes32 commitment) external',
    'function registerCommitmentBatch(bytes32[] calldata commitments) external',
    'function isValidCommitment(bytes32 commitment) external view returns (bool)',
    'event CommitmentRegistered(bytes32 indexed commitment, address indexed registrar, uint256 timestamp)',
] as const;

export const VERIFIER_ABI = [
    'function verifyAccess(bytes calldata proof, bytes32 proofHash, bytes32 merchantId, uint256 planId, uint256 currentEpoch, bytes32 nullifierHash) external returns (bool)',
    'function isNullifierUsed(bytes32 nullifierHash) external view returns (bool)',
    'event AccessVerified(bytes32 indexed merchantId, uint256 indexed planId, bytes32 indexed nullifierHash, uint256 timestamp)',
] as const;
