import { CONTRACTS, REGISTRY_ABI } from './contracts'
import { generateDomainHash } from './crypto'
import { createPublicClient, http } from 'viem'

/**
 * Query a domain from the blockchain
 * @param domainName - Domain name (e.g., "alice")
 * @returns Domain data with public keys, or null if not found
 */
export async function queryDomainFromBlockchain(domainName: string): Promise<{
    owner: string
    spendPubKey: string
    viewPubKey: string
    registeredAt: bigint
    exists: boolean
} | null> {
    try {
        // Create public client for reading from blockchain
        const publicClient = createPublicClient({
            chain: {
                id: 10143, // Monad Testnet
                name: 'Monad Testnet',
                network: 'monad-testnet',
                nativeCurrency: {
                    decimals: 18,
                    name: 'MON',
                    symbol: 'MON',
                },
                rpcUrls: {
                    default: {
                        http: [process.env.NEXT_PUBLIC_MONAD_RPC_URL || 'https://testnet-rpc.monad.xyz'],
                    },
                    public: {
                        http: [process.env.NEXT_PUBLIC_MONAD_RPC_URL || 'https://testnet-rpc.monad.xyz'],
                    },
                },
            },
            transport: http()
        })

        // Generate domain hash
        const domainHash = generateDomainHash(domainName)

        console.log('Querying blockchain for domain:', domainName)
        console.log('Domain hash:', domainHash)
        console.log('Registry contract:', CONTRACTS.REGISTRY)

        // Access the public mapping directly (Solidity auto-generates getter)
        // mapping(bytes32 => Domain) public domains;
        const domainData = await publicClient.readContract({
            address: CONTRACTS.REGISTRY as `0x${string}`,
            abi: [
                {
                    inputs: [{ name: 'domainHash', type: 'bytes32' }],
                    name: 'domains',
                    outputs: [
                        { name: 'owner', type: 'address' },
                        { name: 'spendPubKey', type: 'bytes' },
                        { name: 'viewPubKey', type: 'bytes' },
                        { name: 'registeredAt', type: 'uint256' },
                        { name: 'exists', type: 'bool' }
                    ],
                    stateMutability: 'view',
                    type: 'function'
                }
            ],
            functionName: 'domains',
            args: [domainHash as `0x${string}`]
        }) as [string, string, string, bigint, boolean]

        const [owner, spendPubKey, viewPubKey, registeredAt, exists] = domainData

        console.log('Blockchain query result:', {
            exists,
            owner,
            spendPubKeyLength: spendPubKey ? spendPubKey.length : 0,
            viewPubKeyLength: viewPubKey ? viewPubKey.length : 0
        })

        if (!exists) {
            return null
        }

        return {
            owner,
            spendPubKey,
            viewPubKey,
            registeredAt,
            exists
        }
    } catch (error) {
        console.error('Error querying domain from blockchain:', error)
        return null
    }
}

/**
 * Check if a domain exists on the blockchain
 * @param domainName - Domain name to check
 * @returns true if domain exists on-chain
 */
export async function domainExistsOnChain(domainName: string): Promise<boolean> {
    const domain = await queryDomainFromBlockchain(domainName)
    return domain !== null && domain.exists
}
