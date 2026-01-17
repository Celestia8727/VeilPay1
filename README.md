# veil402 - Privacy-Preserving Subscriptions

> Cross-chain subscription platform with PLONK zero-knowledge proofs on Monad + Sepolia

## 🎯 What is veil402?

A **privacy-first subscription platform** where users can:
- Pay subscriptions privately via stealth addresses
- Prove access using zero-knowledge proofs
- Keep their identity and payment history completely private

**No one knows who paid, when they paid, or what they're accessing.**

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    MONAD TESTNET                             │
│  ┌──────────────────────┐  ┌─────────────────────────────┐ │
│  │ PrivacyDomainRegistry│  │ StealthSubscriptionVault    │ │
│  │ - Domain → Keys      │  │ - Subscription Storage      │ │
│  └──────────────────────┘  │ - getSubscription()         │ │
│                             └─────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
                            ↓
                   Fetch Subscription Data
                            ↓
┌─────────────────────────────────────────────────────────────┐
│                    OFF-CHAIN (JavaScript)                    │
│  ┌──────────────────────────────────────────────────────┐  │
│  │ PLONK Proof Generator (Noir + Barretenberg)          │  │
│  │ - Generates zero-knowledge proof                     │  │
│  │ - Computes proof hash                                │  │
│  └──────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
                            ↓
                    Submit Proof + Hash
                            ↓
┌─────────────────────────────────────────────────────────────┐
│                    SEPOLIA TESTNET                           │
│  ┌──────────────────────┐  ┌─────────────────────────────┐ │
│  │ ZKAccessVerifier     │  │ PLONK Verifier              │ │
│  │ - Verifies proofs    │  │ - UltraPlonk verification   │ │
│  │ - Tracks nullifiers  │  │                             │ │
│  └──────────────────────┘  └─────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
```

---

## ✨ Key Features

### Privacy-First
- ✅ **Stealth addresses** - No reusable payment addresses
- ✅ **Zero-knowledge proofs** - Prove access without revealing identity
- ✅ **No wallet tracking** - Access checks are cryptographic, not address-based
- ✅ **Private subscriptions** - No one can see your subscription history

### Cross-Chain
- ✅ **Monad** - Subscription logic (optimized for parallel execution)
- ✅ **Sepolia** - ZK proof verification (PLONK UltraPlonk)
- ✅ **Off-chain proving** - Fast proof generation in JavaScript

### Developer-Friendly
- ✅ **TypeScript SDK** - Easy integration
- ✅ **Comprehensive docs** - Step-by-step guides
- ✅ **Example code** - Ready-to-use templates

---

## 🚀 Quick Start

### Prerequisites

```bash
# Install Noir
curl -L https://raw.githubusercontent.com/noir-lang/noirup/main/install | bash
noirup

# Install dependencies
npm install
cd lib && npm install && cd ..
```

### Setup

```bash
# 1. Configure environment
cp .env.example .env
# Edit .env with your keys

# 2. Compile Noir circuit
npm run compile:noir

# 3. Build proof generator
npm run build:lib

# 4. Deploy to Monad
npm run deploy:monad

# 5. Deploy to Sepolia
npm run deploy:sepolia
```

### Usage Example

```typescript
import { ProofGenerator, fetchSubscriptionData, submitProof } from 'veil402-proof-generator';

// 1. Fetch subscription from Monad
const subscription = await fetchSubscriptionData(
    subscriptionId,
    vaultAddress,
    monadProvider,
    secretNullifier
);

// 2. Generate proof off-chain
const generator = new ProofGenerator();
await generator.initialize();
const proof = await generator.generateProof(subscription);

// 3. Submit to Sepolia
const receipt = await submitProof(proof, verifierAddress, sepoliaSigner);

console.log('✅ Access verified!');
```

---

## 📁 Project Structure

```
veil402/
├── contracts/           # Solidity smart contracts
│   ├── PrivacyDomainRegistry.sol
│   ├── StealthSubscriptionVault.sol
│   └── ZKAccessVerifier.sol
│
├── noir/               # PLONK circuit
│   └── src/main.nr
│
├── lib/                # TypeScript proof generator
│   └── src/index.ts
│
├── scripts/            # Deployment scripts
│   └── deploy-crosschain.js
│
├── test/               # Contract tests
│
└── docs/               # Documentation
    ├── CROSS_CHAIN_SETUP.md
    ├── ZK_IMPLEMENTATION_GUIDE.md
    └── ZK_QUICK_REFERENCE.md
```

---

## 🔐 How It Works

### 1. User Pays Subscription (Monad)

```solidity
vault.paySubscription(
    domainHash,
    stealthAddress,  // Unique, unlinkable address
    merchantId,
    planId,
    { value: price }
);
```

Subscription is stored with a unique ID.

### 2. Generate Zero-Knowledge Proof (Off-Chain)

```typescript
const proof = await generator.generateProof(subscription);
```

Proof asserts: **"I have a valid subscription for merchant X and plan Y"**

Without revealing:
- ❌ Wallet address
- ❌ Payment details
- ❌ Exact expiration date

### 3. Verify Proof (Sepolia)

```solidity
verifier.verifyAccess(
    proof,
    proofHash,
    merchantId,
    planId,
    currentEpoch,
    nullifierHash
);
```

Access granted if proof is valid! ✅

---

## 📊 Performance

| Operation | Time | Gas Cost |
|-----------|------|----------|
| Pay Subscription (Monad) | ~3s | ~100k |
| Generate Proof (Off-chain) | 2-4s | 0 |
| Verify Proof (Sepolia) | ~5s | ~280k |

**Total flow**: ~10-15 seconds

---

## 🧪 Testing

```bash
# Run contract tests
npm test

# Test with gas reporting
npm run test:gas

# Deploy to local network
npm run node          # Terminal 1
npm run deploy:local  # Terminal 2
```

---

## 📚 Documentation

- **[Cross-Chain Setup Guide](./docs/CROSS_CHAIN_SETUP.md)** - Complete setup instructions
- **[ZK Implementation Guide](./docs/ZK_IMPLEMENTATION_GUIDE.md)** - Deep dive into zero-knowledge proofs
- **[ZK Quick Reference](./docs/ZK_QUICK_REFERENCE.md)** - Visual diagrams and quick tips

---

## 🎯 Use Cases

### Content Platforms
- Private access to premium content
- No user tracking
- Subscription privacy

### SaaS Applications
- Anonymous API access
- Privacy-preserving authentication
- Compliance-friendly

### Membership Sites
- Private membership verification
- No personal data collection
- GDPR-compliant by design

---

## 🛠️ Technology Stack

- **Smart Contracts**: Solidity 0.8.20
- **ZK Proofs**: Noir + PLONK UltraPlonk
- **Proof Generation**: TypeScript + Barretenberg
- **Blockchain**: Monad (subscriptions) + Sepolia (verification)
- **Development**: Hardhat, ethers.js

---

## 🔒 Security

### What's Private
- User wallet addresses
- Payment transactions
- Subscription details
- Access patterns

### What's Public
- Merchant ID
- Plan ID
- Proof validity
- Nullifier (prevents reuse)

### Security Features
- ✅ Nullifier tracking (prevents proof reuse)
- ✅ Time-based expiration (prevents replay attacks)
- ✅ Proof hash verification (prevents tampering)
- ✅ Cross-chain isolation (data separation)

---

## 🚧 Roadmap

### Phase 1: Smart Contracts ✅
- [x] PrivacyDomainRegistry
- [x] StealthSubscriptionVault
- [x] ZKAccessVerifier

### Phase 2: PLONK Proofs ✅
- [x] Noir circuit
- [x] TypeScript proof generator
- [x] Cross-chain deployment

### Phase 3: Infrastructure (Next)
- [ ] Off-chain indexer
- [ ] API endpoints
- [ ] SDK improvements

### Phase 4: Frontend
- [ ] User dashboard
- [ ] Merchant portal
- [ ] Mobile app

---

## 🤝 Contributing

Contributions welcome! Please:
1. Fork the repository
2. Create a feature branch
3. Submit a pull request

---

## 📄 License

MIT

---

## 🌟 Why veil402?

**Privacy is a right, not a privilege.**

veil402 makes privacy-preserving subscriptions accessible to everyone. No complex setup, no compromises on security, just pure privacy.

**Build the future of private subscriptions with us!** 🔐✨

---

## 📞 Support

- 📖 [Documentation](./docs/)
- 💬 [Discord](#)
- 🐛 [Issues](https://github.com/yourusername/veil402/issues)
- 🐦 [Twitter](#)

---

**Ready to deploy?** Check out the [Cross-Chain Setup Guide](./docs/CROSS_CHAIN_SETUP.md)!
