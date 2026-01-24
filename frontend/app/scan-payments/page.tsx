'use client'

import { useState, useEffect } from 'react'
import { useAccount, useWalletClient, usePublicClient } from 'wagmi'
import { AnimatedBackground } from '@/components/animated-background'
import { ScanlineOverlay } from '@/components/scanline-overlay'
import { NavHeader } from '@/components/nav-header'
import { GlassPanel } from '@/components/ui/glass-panel'
import { NeonButton } from '@/components/ui/neon-button'
import { TerminalText } from '@/components/ui/terminal-text'
import { Shield, Loader2, Eye, Key, Coins, AlertCircle, Database, Zap, Fuel } from 'lucide-react'
import { getUserDomains, type Domain } from '@/lib/storage'
import { derivePublicKeyFromWallet } from '@/lib/crypto'
import { CONTRACTS } from '@/lib/contracts'
import { getPaymentsByMerchant, markPaymentClaimed, checkIndexerStatus, type StoredPayment } from '@/lib/payment-api'
import { useX402 } from '@/hooks/use-x402'
import { PaywallModal } from '@/components/x402/PaywallModal'
import toast from 'react-hot-toast'
import { useFarcaster } from '@/components/providers/FarcasterProvider'
import { SafeAreaContainer } from '@/components/SafeAreaContainer'

export default function ScanPaymentsPage() {
    const { context, isSDKLoaded } = useFarcaster()
    const { address, isConnected } = useAccount()
    const { data: walletClient } = useWalletClient()
    const publicClient = usePublicClient()

    const [domains, setDomains] = useState<Domain[]>([])
    const [selectedDomain, setSelectedDomain] = useState<Domain | null>(null)
    const [isLoadingDomains, setIsLoadingDomains] = useState(true)
    const [isDerivingKeys, setIsDerivingKeys] = useState(false)
    const [isScanning, setIsScanning] = useState(false)

    const [privateKeys, setPrivateKeys] = useState<{
        spendPrivKey: string
        viewPrivKey: string
    } | null>(null)

    const [detectedPayments, setDetectedPayments] = useState<any[]>([])
    const [storedPayments, setStoredPayments] = useState<StoredPayment[]>([])
    const [indexerStatus, setIndexerStatus] = useState<{ isRunning: boolean; lastBlock: number } | null>(null)
    const [isLoadingFromDb, setIsLoadingFromDb] = useState(false)
    const [isPriorityScan, setIsPriorityScan] = useState(false)
    const [showPaywall, setShowPaywall] = useState(false)
    const [x402Service, setX402Service] = useState<'priorityScan' | 'gasRelay'>('priorityScan')
    const [pendingClaimPayment, setPendingClaimPayment] = useState<any>(null)
    const [scanStats, setScanStats] = useState<{
        lastScanType: string
        newBlocksScanned: number
        newPaymentsIndexed: number
        totalPayments: number
        unclaimedPayments: number
        claimedPayments: number
        autoMarked: number
        timestamp: Date
    } | null>(null)

    // x402 hook for premium services
    const {
        x402Fetch,
        signPaymentAuthorization,
        retryWithPayment,
        currentChallenge,
        selectedRequirements,
        isPaymentPending,
        setCurrentChallenge
    } = useX402({
        onPaymentSuccess: (signature) => {
            console.log('x402 payment authorized:', signature.slice(0, 20) + '...')
        }
    })

    useEffect(() => {
        if (address) {
            loadDomains()
        }
    }, [address])

    async function loadDomains() {
        if (!address) return

        setIsLoadingDomains(true)
        try {
            const domainsData = await getUserDomains(address)
            setDomains(domainsData)
            if (domainsData.length > 0) {
                setSelectedDomain(domainsData[0])
            }
        } catch (error) {
            console.error('Error loading domains:', error)
            toast.error('Failed to load domains')
        } finally {
            setIsLoadingDomains(false)
        }
    }

    // Load payments from Supabase database
    async function loadPaymentsFromDatabase() {
        if (!selectedDomain || !privateKeys) {
            toast.error('Please derive private keys first')
            return
        }

        setIsLoadingFromDb(true)
        try {
            console.log('📦 Loading payments from Supabase for merchant:', selectedDomain.domain_hash)

            // Check indexer status
            const status = await checkIndexerStatus()
            setIndexerStatus(status)
            console.log('   Indexer status:', status.isRunning ? '🟢 Running' : '🔴 Not running', 'Last block:', status.lastBlock)

            // Get payments from database
            const dbPayments = await getPaymentsByMerchant(selectedDomain.domain_hash, false) // Get all, including claimed
            console.log(`   Found ${dbPayments.length} payment(s) in database`)

            if (dbPayments.length === 0) {
                toast.error('No payments found in database. Run the indexer first!')
                return
            }

            // Import stealth functions for verification
            const { checkPayment: checkPaymentFn, deriveStealthPrivateKey } = await import('@/lib/stealth')

            // Process payments - verify ownership and add stealth private keys
            const verifiedPayments = []
            let autoMarkedCount = 0
            let claimedCount = 0
            let unclaimedCount = 0

            toast.loading('Verifying payment statuses...')

            for (const payment of dbPayments) {
                // Check if this payment belongs to us
                const isOurs = checkPaymentFn(
                    privateKeys.viewPrivKey,
                    selectedDomain.spend_pub_key,
                    payment.ephemeral_pub_key,
                    payment.stealth_address
                )

                if (isOurs) {
                    console.log(`   ✅ Payment ${payment.transaction_hash.slice(0, 10)}... belongs to us!`)

                    // Derive the stealth private key for claiming
                    const stealthPrivateKey = deriveStealthPrivateKey(
                        privateKeys.spendPrivKey,
                        privateKeys.viewPrivKey,
                        payment.ephemeral_pub_key
                    )

                    let isClaimed = payment.claimed === true

                    // If database says unclaimed, check actual balance
                    if (!isClaimed && publicClient) {
                        try {
                            const balance = await publicClient.getBalance({ address: payment.stealth_address as `0x${string}` })
                            if (balance === BigInt(0)) {
                                // Already claimed! Update database
                                isClaimed = true
                                autoMarkedCount++
                                await markPaymentClaimed(payment.stealth_address, 'auto_detected')
                                console.log(`   Auto-marked ${payment.stealth_address.slice(0, 10)}... as claimed (balance=0)`)
                            }
                        } catch (e) {
                            console.warn('Could not check balance:', e)
                        }
                    }

                    if (isClaimed) claimedCount++
                    else unclaimedCount++

                    verifiedPayments.push({
                        ...payment,
                        stealthAddress: payment.stealth_address,
                        amount: payment.amount,
                        timestamp: payment.timestamp,
                        ephemeralPubKey: payment.ephemeral_pub_key,
                        stealthPrivateKey,
                        blockNumber: payment.block_number,
                        transactionHash: payment.transaction_hash,
                        isClaimed
                    })
                }
            }

            toast.dismiss()
            setStoredPayments(dbPayments)
            setDetectedPayments(verifiedPayments)

            // Set scan stats for UI display
            setScanStats({
                lastScanType: 'Database Load',
                newBlocksScanned: 0,
                newPaymentsIndexed: 0,
                totalPayments: verifiedPayments.length,
                unclaimedPayments: unclaimedCount,
                claimedPayments: claimedCount,
                autoMarked: autoMarkedCount,
                timestamp: new Date()
            })

            if (verifiedPayments.length > 0) {
                let message = `Found ${verifiedPayments.length} payment(s)! (${unclaimedCount} unclaimed, ${claimedCount} claimed)`
                if (autoMarkedCount > 0) {
                    message += ` - ${autoMarkedCount} auto-marked`
                }
                toast.success(message)
            } else {
                toast.error('No payments found for this domain')
            }

        } catch (error: any) {
            console.error('Error loading from database:', error)
            toast.error(error.message || 'Failed to load from database')
        } finally {
            setIsLoadingFromDb(false)
        }
    }

    // x402 Priority Scan - instant payment detection (paid service)
    async function x402PriorityScan() {
        if (!selectedDomain || !privateKeys) {
            toast.error('Please derive private keys first')
            return
        }

        setIsPriorityScan(true)
        setX402Service('priorityScan')

        try {
            const { data, paid } = await x402Fetch('/api/x402/scan/priority', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    domainHash: selectedDomain.domain_hash,
                    userAddress: address
                })
            })

            if (!paid) {
                // Show paywall modal
                setShowPaywall(true)
                console.log('x402 Payment required:', data)
            } else {
                // Process the scan results
                await processX402ScanResults(data)
            }

        } catch (error: any) {
            console.error('x402 Priority Scan error:', error)
            toast.error(error.message || 'Priority scan failed')
        } finally {
            setIsPriorityScan(false)
        }
    }

    // Process scan results from x402 priority scan
    async function processX402ScanResults(data: any) {
        if (!privateKeys || !selectedDomain || !publicClient) return

        const { checkPayment: checkPaymentFn, deriveStealthPrivateKey } = await import('@/lib/stealth')

        const verifiedPayments = []
        let claimedCount = 0
        let unclaimedCount = 0
        let autoMarkedCount = 0

        toast.loading('Verifying payment statuses...')

        for (const payment of data.payments || []) {
            const isOurs = checkPaymentFn(
                privateKeys.viewPrivKey,
                selectedDomain.spend_pub_key,
                payment.ephemeralPubKey,
                payment.stealthAddress
            )

            if (isOurs) {
                const stealthPrivateKey = deriveStealthPrivateKey(
                    privateKeys.spendPrivKey,
                    privateKeys.viewPrivKey,
                    payment.ephemeralPubKey
                )

                let isClaimed = payment.claimed === true

                // If database says unclaimed, check actual balance
                if (!isClaimed) {
                    try {
                        const balance = await publicClient.getBalance({ address: payment.stealthAddress })
                        if (balance === BigInt(0)) {
                            // Already claimed! Update database
                            isClaimed = true
                            autoMarkedCount++
                            await markPaymentClaimed(payment.stealthAddress, 'auto_detected')
                            console.log(`   Auto-marked ${payment.stealthAddress.slice(0, 10)}... as claimed (balance=0)`)
                        }
                    } catch (e) {
                        console.warn('Could not check balance:', e)
                    }
                }

                if (isClaimed) claimedCount++
                else unclaimedCount++

                verifiedPayments.push({
                    ...payment,
                    stealthPrivateKey,
                    isClaimed
                })
            }
        }

        toast.dismiss()
        setDetectedPayments(verifiedPayments)

        // Set scan stats for UI display
        setScanStats({
            lastScanType: '⚡ Priority Scan',
            newBlocksScanned: data.newBlocksScanned || 0,
            newPaymentsIndexed: data.newPaymentsIndexed || 0,
            totalPayments: verifiedPayments.length,
            unclaimedPayments: unclaimedCount,
            claimedPayments: claimedCount,
            autoMarked: autoMarkedCount,
            timestamp: new Date()
        })

        let message = `Found ${verifiedPayments.length} payment(s)! (${unclaimedCount} unclaimed, ${claimedCount} claimed)`
        if (autoMarkedCount > 0) {
            message += ` - ${autoMarkedCount} auto-marked as claimed`
        }
        toast.success(message)
    }

    // Handle x402 payment authorization from paywall modal
    async function handleX402Pay() {
        const paymentHeader = await signPaymentAuthorization()

        if (paymentHeader) {
            setShowPaywall(false)

            try {
                if (x402Service === 'priorityScan' && selectedDomain) {
                    const data = await retryWithPayment('/api/x402/scan/priority', paymentHeader, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            domainHash: selectedDomain.domain_hash,
                            userAddress: address
                        })
                    })
                    await processX402ScanResults(data)
                } else if (x402Service === 'gasRelay' && pendingClaimPayment) {
                    const data = await retryWithPayment('/api/x402/relay/gas', paymentHeader, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            stealthAddress: pendingClaimPayment.stealthAddress,
                            userAddress: address,
                            relayType: 'sendGas'
                        })
                    })

                    if (data.status === 'success') {
                        toast.success('Gas relay successful! Now claiming funds...')
                        // Continue with claim after gas relay
                        await continueClaimAfterGasRelay(pendingClaimPayment)
                    }
                }
            } catch (error: any) {
                toast.error('Request failed after payment')
            }
        }
    }

    // Continue claim process after gas relay
    async function continueClaimAfterGasRelay(payment: any) {
        if (!walletClient || !publicClient || !address) return

        try {
            const { privateKeyToAccount } = await import('viem/accounts')
            const { createWalletClient, http } = await import('viem')
            const { formatEther } = await import('viem')

            const stealthAccount = privateKeyToAccount(payment.stealthPrivateKey as `0x${string}`)

            // Get new balance (should have gas now)
            const balance = await publicClient.getBalance({ address: stealthAccount.address })
            const gasPrice = await publicClient.getGasPrice()
            const gasLimit = BigInt(21000)
            const gasCost = gasPrice * gasLimit

            const amountToSend = balance - gasCost

            const stealthWalletClient = createWalletClient({
                account: stealthAccount,
                chain: walletClient.chain,
                transport: http(publicClient.transport.url)
            })

            const hash = await stealthWalletClient.sendTransaction({
                to: address as `0x${string}`,
                value: amountToSend,
            })

            await publicClient.waitForTransactionReceipt({ hash })
            toast.success(`Claimed ${formatEther(amountToSend)} MON!`)

            // Mark as claimed in database
            const marked = await markPaymentClaimed(payment.stealthAddress, hash)
            if (!marked) console.warn('Failed to update database, payment may show as unclaimed')

            // Update UI to show as claimed
            setDetectedPayments(prev => prev.map(p =>
                p.stealthAddress === payment.stealthAddress ? { ...p, isClaimed: true } : p
            ))
            setPendingClaimPayment(null)
        } catch (error: any) {
            console.error('Error claiming after gas relay:', error)
            toast.error(error.message || 'Claim failed')
        }
    }

    async function derivePrivateKeys() {
        if (!walletClient || !selectedDomain) {
            toast.error('Please select a domain first')
            return
        }

        setIsDerivingKeys(true)
        try {
            // Sign the same message used during registration
            const message = `Generate keys for domain: ${selectedDomain.domain_name}`
            const signature = await walletClient.signMessage({
                account: walletClient.account,
                message
            })

            // Use the SAME derivation as in crypto.ts derivePublicKeyFromWallet
            // Import keccak256 for proper key derivation
            const { keccak256 } = await import('ethers')
            // @ts-ignore
            const { ec: EC } = await import('elliptic')
            const ec = new EC('secp256k1')

            const sigHex = signature.slice(2) // Remove 0x

            // Derive seeds (same as registration)
            const spendSeed = keccak256('0x' + sigHex)
            const viewSeed = keccak256(keccak256('0x' + sigHex))

            // The private keys are the seeds themselves
            const spendPrivKey = spendSeed
            const viewPrivKey = viewSeed

            console.log('🔑 Derived private keys:')
            console.log('   Spend priv:', spendPrivKey.slice(0, 20) + '...')
            console.log('   View priv:', viewPrivKey.slice(0, 20) + '...')

            // VERIFY: Derive public keys from private keys and compare with stored
            console.log('🔍 VERIFICATION: Deriving public keys from private keys...')
            const spendKeyPair = ec.keyFromPrivate(spendPrivKey.slice(2), 'hex')
            const viewKeyPair = ec.keyFromPrivate(viewPrivKey.slice(2), 'hex')

            const derivedSpendPubKey = '0x' + spendKeyPair.getPublic(false, 'hex')
            const derivedViewPubKey = '0x' + viewKeyPair.getPublic(false, 'hex')

            console.log('   Derived spend pub:', derivedSpendPubKey.slice(0, 20) + '...')
            console.log('   Stored spend pub:', selectedDomain.spend_pub_key.slice(0, 20) + '...')
            console.log('   Derived view pub:', derivedViewPubKey.slice(0, 20) + '...')
            console.log('   Stored view pub:', selectedDomain.view_pub_key.slice(0, 20) + '...')

            const spendMatch = derivedSpendPubKey.toLowerCase() === selectedDomain.spend_pub_key.toLowerCase()
            const viewMatch = derivedViewPubKey.toLowerCase() === selectedDomain.view_pub_key.toLowerCase()

            console.log('   Spend key match:', spendMatch ? '✅' : '❌')
            console.log('   View key match:', viewMatch ? '✅' : '❌')

            if (!spendMatch || !viewMatch) {
                toast.error('⚠️ Derived keys do NOT match stored keys! Domain may have been registered with different wallet or old key system.')
                console.error('KEY MISMATCH! The domain was likely registered with a different wallet or before the EC key fix.')
            }

            setPrivateKeys({ spendPrivKey, viewPrivKey })
            toast.success('Private keys derived successfully!')
        } catch (error: any) {
            console.error('Error deriving keys:', error)
            toast.error(error.message || 'Failed to derive private keys')
        } finally {
            setIsDerivingKeys(false)
        }
    }

    async function scanForPayments() {
        if (!privateKeys || !selectedDomain || !publicClient) {
            toast.error('Please derive private keys first')
            return
        }

        setIsScanning(true)
        setDetectedPayments([])

        try {
            console.log('🔍 Scanning blockchain for payments to:', selectedDomain.domain_name)
            console.log('📦 Domain keys stored:')
            console.log('   View pub key:', selectedDomain.view_pub_key?.slice(0, 20) + '...')
            console.log('   Spend pub key:', selectedDomain.spend_pub_key?.slice(0, 20) + '...')
            console.log('   Using private keys:')
            console.log('   View priv key:', privateKeys.viewPrivKey.slice(0, 20) + '...')
            console.log('   Spend priv key:', privateKeys.spendPrivKey.slice(0, 20) + '...')

            // Import stealth utilities
            const { checkPayment: checkPaymentFn, deriveStealthPrivateKey } = await import('@/lib/stealth')
            const { generateDomainHash } = await import('@/lib/crypto')
            const { VAULT_ABI } = await import('@/lib/contracts')

            // Get merchant ID for this domain
            const merchantId = generateDomainHash(selectedDomain.domain_name)
            console.log('   Merchant ID:', merchantId)

            // Get current block to limit query range (Monad RPC: trying 50 blocks)
            console.log('🔄 USING NEW CODE - Block limit: 50 blocks')
            const latestBlock = await publicClient.getBlockNumber()
            const fromBlock = latestBlock > BigInt(50) ? latestBlock - BigInt(50) : BigInt(0)
            console.log(`   Querying blocks ${fromBlock} to ${latestBlock} (50 block range)`)


            // Get PaymentReceived event from ABI
            const paymentEvent = VAULT_ABI.find((item: any) => item.type === 'event' && item.name === 'PaymentReceived') as any

            console.log('   📋 Event ABI:', paymentEvent)
            console.log('   📍 Vault contract:', CONTRACTS.VAULT)

            // Query PaymentReceived events from the vault contract
            // NOTE: Not filtering by merchantId in the query to avoid RPC limits
            // We'll filter client-side instead
            console.log('   Querying ALL PaymentReceived events (will filter client-side)...')

            const queryParams = {
                address: CONTRACTS.VAULT as `0x${string}`,
                event: paymentEvent,
                fromBlock,
                toBlock: 'latest' as const
            }
            console.log('   🔍 Query params:', JSON.stringify(queryParams, (key, value) =>
                typeof value === 'bigint' ? value.toString() : value
                , 2))

            const logs = await publicClient.getLogs(queryParams)

            console.log(`   Found ${logs.length} total payment events, filtering for merchant ${merchantId}...`)

            const payments: any[] = []

            // If no events found, try scanning backwards
            if (logs.length === 0) {
                console.log('   📡 No events in recent blocks, scanning backwards...')
                let currentFromBlock = fromBlock
                let scanAttempts = 0
                const maxAttempts = 10 // Scan up to 500 blocks back (10 * 50)

                while (logs.length === 0 && scanAttempts < maxAttempts && currentFromBlock > BigInt(0)) {
                    scanAttempts++
                    const olderFromBlock = currentFromBlock > BigInt(50) ? currentFromBlock - BigInt(50) : BigInt(0)
                    console.log(`   🔍 Attempt ${scanAttempts}: Scanning blocks ${olderFromBlock} to ${currentFromBlock}`)

                    const olderLogs = await publicClient.getLogs({
                        address: CONTRACTS.VAULT as `0x${string}`,
                        event: paymentEvent,
                        fromBlock: olderFromBlock,
                        toBlock: currentFromBlock
                    })

                    if (olderLogs.length > 0) {
                        console.log(`   ✅ Found ${olderLogs.length} events in older blocks!`)
                        logs.push(...olderLogs)
                        break
                    }

                    currentFromBlock = olderFromBlock

                    if (olderFromBlock === BigInt(0)) break
                }

                if (logs.length === 0) {
                    console.log(`   ❌ No payments found in last ${50 * (scanAttempts + 1)} blocks`)
                }
            }

            // Check each payment to see if it belongs to us
            for (const log of logs) {
                const { stealthAddress, amount, timestamp, ephemeralPubKey, planId } = (log as any).args

                console.log(`   Checking payment to ${stealthAddress}...`)
                console.log(`   🔑 Using keys:`)
                console.log(`      View private key: ${privateKeys.viewPrivKey.slice(0, 20)}...`)
                console.log(`      Spend public key: ${selectedDomain.spend_pub_key.slice(0, 20)}...`)
                console.log(`      Ephemeral pub key: ${ephemeralPubKey.slice(0, 20)}...`)
                console.log(`      Target address: ${stealthAddress}`)

                // Check if this payment belongs to us using our view key
                const isOurs = checkPaymentFn(
                    privateKeys.viewPrivKey,
                    selectedDomain.spend_pub_key,
                    ephemeralPubKey,
                    stealthAddress
                )

                console.log(`   Result: ${isOurs ? '✅ MATCH!' : '❌ Not our payment'}`)

                if (isOurs) {
                    console.log('   ✅ Payment belongs to us!')

                    // Derive the private key for this stealth address
                    const stealthPrivateKey = deriveStealthPrivateKey(
                        privateKeys.spendPrivKey,
                        privateKeys.viewPrivKey,
                        ephemeralPubKey
                    )

                    payments.push({
                        stealthAddress,
                        amount: amount.toString(),
                        timestamp: Number(timestamp),
                        ephemeralPubKey,
                        planId: Number(planId),
                        stealthPrivateKey,
                        blockNumber: log.blockNumber,
                        transactionHash: log.transactionHash
                    })
                } else {
                    console.log('   ❌ Not our payment')
                }
            }

            setDetectedPayments(payments)

            if (payments.length > 0) {
                toast.success(`Found ${payments.length} payment(s)!`)
            } else {
                toast.error('No payments detected for this domain')
            }
        } catch (error: any) {
            console.error('Error scanning for payments:', error)
            toast.error(error.message || 'Failed to scan for payments')
        } finally {
            setIsScanning(false)
        }
    }

    async function claimFunds(payment: any) {
        if (!walletClient || !address || !publicClient) {
            toast.error('Wallet not connected')
            return
        }

        try {
            console.log('💰 Claiming funds from stealth address:', payment.stealthAddress)
            console.log('   Amount:', payment.amount)
            console.log('   Using stealth private key:', payment.stealthPrivateKey.slice(0, 20) + '...')

            // Import viem utilities
            const { formatEther } = await import('viem')
            const { privateKeyToAccount } = await import('viem/accounts')

            // Create account from stealth private key
            const stealthAccount = privateKeyToAccount(payment.stealthPrivateKey as `0x${string}`)
            console.log('   Stealth account address:', stealthAccount.address)

            // Verify it matches the payment's stealth address
            if (stealthAccount.address.toLowerCase() !== payment.stealthAddress.toLowerCase()) {
                throw new Error('Derived stealth address does not match payment address!')
            }

            // Get balance of stealth address
            const balance = await publicClient.getBalance({
                address: stealthAccount.address
            })

            console.log('   Stealth address balance:', formatEther(balance), 'MON')

            if (balance === BigInt(0)) {
                // Balance is 0 - this was already claimed!
                // Mark as claimed in database and update UI
                console.log('   ⚠️ Balance is 0 - marking as already claimed')

                await markPaymentClaimed(payment.stealthAddress, 'already_claimed')

                // Update local state
                setDetectedPayments(prev => prev.map(p =>
                    p.stealthAddress === payment.stealthAddress
                        ? { ...p, isClaimed: true }
                        : p
                ))

                toast.success('Payment already claimed! Updated database.')
                return
            }

            // Estimate gas for transfer
            const gasPrice = await publicClient.getGasPrice()
            const gasLimit = BigInt(21000) // Standard ETH transfer
            const gasCost = gasPrice * gasLimit

            console.log('   Gas cost:', formatEther(gasCost), 'MON')
            console.log('   Balance:', formatEther(balance), 'MON')

            // Check if stealth address has enough for gas
            if (balance < gasCost) {
                console.log('⚠️ Insufficient balance for gas. Using gas relay...')
                toast.loading('Step 1/2: Sending gas to stealth address...')

                // GAS RELAY STEP 1: Send gas from user wallet
                const { parseEther } = await import('viem')
                const gasToSend = gasCost * BigInt(2)
                console.log('   Sending', formatEther(gasToSend), 'MON for gas')

                const gasHash = await walletClient.sendTransaction({
                    to: stealthAccount.address as `0x${string}`,
                    value: gasToSend,
                })

                console.log('   Gas sent! Waiting for confirmation...')
                toast.loading('Waiting for gas transaction...')
                await publicClient.waitForTransactionReceipt({ hash: gasHash })

                // Get new balance
                const newBalance = await publicClient.getBalance({ address: stealthAccount.address })
                console.log('   New balance:', formatEther(newBalance), 'MON')
                toast.loading('Step 2/2: Claiming all funds...')

                // Transfer ALL funds from stealth address (user pays gas from their wallet)
                // We need to create a wallet client with the stealth account
                const { createWalletClient, http } = await import('viem')

                const stealthWalletClient = createWalletClient({
                    account: stealthAccount,
                    chain: walletClient.chain,
                    transport: http(publicClient.transport.url)
                })

                // Send entire balance minus gas back to user
                const amountToReturn = newBalance - gasCost
                const hash = await stealthWalletClient.sendTransaction({
                    to: address as `0x${string}`,
                    value: amountToReturn,
                })

                console.log('✅ Claim transaction sent:', hash)
                await publicClient.waitForTransactionReceipt({ hash })
                toast.dismiss()
                toast.success(`Claimed ${formatEther(balance)} MON! (Gas relay used)`)

                // Mark as claimed in database
                const marked = await markPaymentClaimed(payment.stealthAddress, hash)
                if (!marked) console.warn('Failed to update database, payment may show as unclaimed')
            } else {
                // Stealth address has enough for gas
                const amountToSend = balance - gasCost

                console.log('   Amount to send:', formatEther(amountToSend), 'MON')

                toast.loading('Sending transaction...')

                // Send transaction from stealth address to user's wallet
                const { createWalletClient, http } = await import('viem')

                const stealthWalletClient = createWalletClient({
                    account: stealthAccount,
                    chain: walletClient.chain,
                    transport: http(publicClient.transport.url)
                })

                const hash = await stealthWalletClient.sendTransaction({
                    to: address as `0x${string}`,
                    value: amountToSend,
                })

                console.log('✅ Claim transaction sent:', hash)
                await publicClient.waitForTransactionReceipt({ hash })
                toast.dismiss()
                toast.success(`Claimed ${formatEther(amountToSend)} MON!`)

                // Mark as claimed in database
                const markedDirect = await markPaymentClaimed(payment.stealthAddress, hash)
                if (!markedDirect) console.warn('Failed to update database, payment may show as unclaimed')
            }

            // Update UI to show as claimed
            setDetectedPayments(prev => prev.map(p =>
                p.stealthAddress === payment.stealthAddress ? { ...p, isClaimed: true } : p
            ))

        } catch (error: any) {
            console.error('Error claiming funds:', error)
            toast.error(error.message || 'Failed to claim funds')
        }
    }

    if (!isConnected) {
        return (
            <div className="min-h-screen">
                <AnimatedBackground />
                <ScanlineOverlay />
                <NavHeader />
                <main className="pt-32 px-4">
                    <div className="max-w-2xl mx-auto text-center">
                        <GlassPanel glow="cyan" className="p-12">
                            <Shield className="w-16 h-16 text-neon-cyan mx-auto mb-6" />
                            <h2 className="font-mono text-3xl tracking-wider text-foreground mb-4">
                                Connect Your Wallet
                            </h2>
                            <p className="font-mono text-sm text-muted-foreground">
                                Please connect your wallet to scan for payments
                            </p>
                        </GlassPanel>
                    </div>
                </main>
            </div>
        )
    }

    if (isLoadingDomains) {
        return (
            <div className="min-h-screen">
                <AnimatedBackground />
                <ScanlineOverlay />
                <NavHeader />
                <main className="pt-32 px-4">
                    <div className="max-w-2xl mx-auto text-center">
                        <GlassPanel className="p-12">
                            <Loader2 className="w-8 h-8 animate-spin text-neon-cyan mx-auto mb-4" />
                            <TerminalText>Loading domains...</TerminalText>
                        </GlassPanel>
                    </div>
                </main>
            </div>
        )
    }

    if (domains.length === 0) {
        return (
            <div className="min-h-screen">
                <AnimatedBackground />
                <ScanlineOverlay />
                <NavHeader />
                <main className="pt-32 px-4">
                    <div className="max-w-2xl mx-auto text-center">
                        <GlassPanel className="p-12">
                            <Shield className="w-16 h-16 text-muted-foreground mx-auto mb-6" />
                            <h3 className="font-mono text-xl text-foreground mb-2">No Domains Found</h3>
                            <TerminalText className="mb-6">
                                You need to register a domain before scanning for payments
                            </TerminalText>
                        </GlassPanel>
                    </div>
                </main>
            </div>
        )
    }

    return (
        <div className="min-h-screen">
            <AnimatedBackground />
            <ScanlineOverlay />
            <NavHeader />

            <main className="pt-32 px-4 pb-20">
                <div className="max-w-4xl mx-auto">
                    {/* Header */}
                    <div className="mb-12">
                        <h1 className="font-mono text-4xl font-bold tracking-[0.2em] mb-4 animate-flicker">
                            <span className="neon-text-purple">SCAN PAYMENTS</span>
                        </h1>
                        <TerminalText prefix="$">Detect and claim stealth address payments</TerminalText>
                    </div>

                    {/* Domain Selection */}
                    <GlassPanel glow="cyan" className="p-6 mb-6">
                        <TerminalText prefix="#">Select Domain</TerminalText>
                        <select
                            value={selectedDomain?.id || ''}
                            onChange={(e) => {
                                const domain = domains.find(d => d.id === e.target.value)
                                setSelectedDomain(domain || null)
                                setPrivateKeys(null) // Reset keys when changing domain
                            }}
                            className="w-full mt-2 px-4 py-3 bg-input border border-border text-foreground font-mono text-sm focus:outline-none focus:border-neon-cyan"
                        >
                            {domains.map(domain => (
                                <option key={domain.id} value={domain.id}>
                                    {domain.domain_name}
                                </option>
                            ))}
                        </select>
                    </GlassPanel>

                    {/* Step 1: Derive Private Keys */}
                    <GlassPanel glow="green" className="p-6 mb-6">
                        <div className="flex items-center justify-between mb-4">
                            <div>
                                <TerminalText prefix="1.">Derive Private Keys</TerminalText>
                                <p className="font-mono text-xs text-muted-foreground mt-1">
                                    Sign a message to regenerate your private keys
                                </p>
                            </div>
                            {!privateKeys && (
                                <NeonButton
                                    variant="green"
                                    size="sm"
                                    onClick={derivePrivateKeys}
                                    disabled={isDerivingKeys}
                                >
                                    {isDerivingKeys ? (
                                        <>
                                            <Loader2 className="w-4 h-4 animate-spin mr-2" />
                                            Deriving...
                                        </>
                                    ) : (
                                        <>
                                            <Key className="w-4 h-4 mr-2" />
                                            Derive Keys
                                        </>
                                    )}
                                </NeonButton>
                            )}
                        </div>

                        {privateKeys && (
                            <div className="space-y-3 pt-4 border-t border-border">
                                <div className="flex items-center gap-2 text-neon-green">
                                    <Eye className="w-4 h-4" />
                                    <span className="font-mono text-sm">Private keys derived</span>
                                </div>
                                <div className="p-3 bg-neon-green/10 border border-neon-green/30">
                                    <TerminalText prefix="!">
                                        Keys are in memory only. Never share your private keys!
                                    </TerminalText>
                                </div>
                            </div>
                        )}
                    </GlassPanel>

                    {/* Step 2: Scan Blockchain */}
                    <GlassPanel glow="purple" className="p-6 mb-6">
                        <div className="flex items-center justify-between mb-4">
                            <div>
                                <TerminalText prefix="2.">Scan Blockchain</TerminalText>
                                <p className="font-mono text-xs text-muted-foreground mt-1">
                                    Search for payments sent to your stealth addresses
                                </p>
                            </div>
                            <NeonButton
                                variant="purple"
                                size="sm"
                                onClick={scanForPayments}
                                disabled={!privateKeys || isScanning}
                            >
                                {isScanning ? (
                                    <>
                                        <Loader2 className="w-4 h-4 animate-spin mr-2" />
                                        Scanning...
                                    </>
                                ) : (
                                    <>
                                        <Coins className="w-4 h-4 mr-2" />
                                        Scan Blockchain
                                    </>
                                )}
                            </NeonButton>
                            <NeonButton
                                variant="outline"
                                size="sm"
                                onClick={x402PriorityScan}
                                disabled={!privateKeys || isPriorityScan}
                                title="Priority scan using x402 payment (0.001 MON)"
                            >
                                {isPriorityScan ? (
                                    <>
                                        <Loader2 className="w-4 h-4 animate-spin mr-2" />
                                        Scanning...
                                    </>
                                ) : (
                                    <>
                                        <Zap className="w-4 h-4 mr-2" />
                                        ⚡ Priority Scan
                                    </>
                                )}
                            </NeonButton>
                        </div>

                        {/* Indexer Status */}
                        {indexerStatus && (
                            <div className="p-3 bg-secondary/20 border border-border rounded text-xs font-mono">
                                <span className={indexerStatus.isRunning ? 'text-green-400' : 'text-yellow-400'}>
                                    {indexerStatus.isRunning ? '🟢' : '🟡'} Indexer: {indexerStatus.isRunning ? 'Running' : 'Idle'}
                                </span>
                                <span className="ml-4 text-muted-foreground">
                                    Last block: {indexerStatus.lastBlock}
                                </span>
                            </div>
                        )}

                        {/* Scan Stats Display */}
                        {scanStats && (
                            <div className="p-3 bg-purple-500/10 border border-purple-500/30 rounded text-xs font-mono space-y-1">
                                <div className="flex items-center justify-between">
                                    <span className="text-purple-400">📊 {scanStats.lastScanType}</span>
                                    <span className="text-muted-foreground text-[10px]">
                                        {scanStats.timestamp.toLocaleTimeString()}
                                    </span>
                                </div>
                                {scanStats.newBlocksScanned > 0 && (
                                    <div className="text-muted-foreground">
                                        Scanned {scanStats.newBlocksScanned} new block(s)
                                    </div>
                                )}
                                {scanStats.newPaymentsIndexed > 0 && (
                                    <div className="text-green-400">
                                        Indexed {scanStats.newPaymentsIndexed} new payment(s)
                                    </div>
                                )}
                                <div className="text-cyan-400">
                                    Total payments for domain: {scanStats.totalPayments}
                                </div>
                            </div>
                        )}ū

                        {detectedPayments.length > 0 && (
                            <div className="space-y-3 pt-4 border-t border-border">
                                <TerminalText prefix="found">ū
                                    {detectedPayments.filter(p => !p.isClaimed).length} unclaimed, {detectedPayments.filter(p => p.isClaimed).length} claimed
                                </TerminalText>

                                {/* Unclaimed Payments First */}
                                {detectedPayments.filter(p => !p.isClaimed).map(payment => (
                                    <div key={payment.stealthAddress} className="p-4 bg-secondary/30 border border-cyan-500/50 rounded-lg">
                                        <div className="flex items-center justify-between">
                                            <div>
                                                <TerminalText prefix="amount">{payment.amount}</TerminalText>
                                                <p className="font-mono text-xs text-muted-foreground">
                                                    To: {payment.stealthAddress?.slice(0, 20)}...
                                                </p>
                                            </div>
                                            <NeonButton variant="cyan" size="sm" onClick={() => claimFunds(payment)}>
                                                Claim
                                            </NeonButton>
                                        </div>
                                    </div>
                                ))}

                                {/* Claimed Payments (if any) */}
                                {detectedPayments.filter(p => p.isClaimed).length > 0 && (
                                    <div className="mt-4 pt-4 border-t border-border/50">
                                        <p className="text-xs text-muted-foreground mb-2">Already Claimed:</p>
                                        {detectedPayments.filter(p => p.isClaimed).map(payment => (
                                            <div key={payment.stealthAddress} className="p-3 bg-green-500/10 border border-green-500/30 rounded-lg mb-2 opacity-70">
                                                <div className="flex items-center justify-between">
                                                    <div>
                                                        <TerminalText prefix="amount">{payment.amount}</TerminalText>
                                                        <p className="font-mono text-xs text-muted-foreground">
                                                            To: {payment.stealthAddress?.slice(0, 20)}...
                                                        </p>
                                                    </div>
                                                    <span className="text-green-400 text-sm font-mono flex items-center gap-1">
                                                        ✓ Claimed
                                                    </span>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        )}
                    </GlassPanel>

                    {/* Info Panel */}
                    <GlassPanel className="p-6">
                        <div className="flex items-start gap-3">
                            <AlertCircle className="w-5 h-5 text-neon-cyan flex-shrink-0 mt-0.5" />
                            <div className="flex-1">
                                <h3 className="font-mono text-sm text-neon-cyan mb-2">How It Works</h3>
                                <div className="space-y-2 font-mono text-xs text-muted-foreground">
                                    <TerminalText prefix="1.">
                                        Derive your private keys by signing a message
                                    </TerminalText>
                                    <TerminalText prefix="2.">
                                        Scan blockchain for PaymentReceived events
                                    </TerminalText>
                                    <TerminalText prefix="3.">
                                        Use view key to detect payments meant for you
                                    </TerminalText>
                                    <TerminalText prefix="4.">
                                        Use spend key to claim detected payments
                                    </TerminalText>
                                </div>
                            </div>
                        </div>
                    </GlassPanel>
                </div>
            </main>

            {/* x402 Payment Modal */}
            <PaywallModal
                challenge={currentChallenge}
                selectedRequirements={selectedRequirements}
                isOpen={showPaywall}
                onClose={() => {
                    setShowPaywall(false)
                    setCurrentChallenge(null)
                }}
                onAuthorize={handleX402Pay}
                isPaying={isPaymentPending}
            />
        </div>
    )
}
