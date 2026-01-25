# VeilPay - Privacy-First Payment Platform on Monad

A self-custodial privacy domain layer built on Monad using stealth addresses to ensure maximum privacy in transactions. VeilPay enables completely private payments while maintaining full user control over funds.

🔗 **Live Demo:** [veil-pay1.vercel.app](https://veil-pay1.vercel.app)  
🎯 **Farcaster Mini App:** Available on Warpcast

## 🌟 Features

### Core Privacy Features
- **Stealth Addresses**: Generate unique one-time addresses for each payment
- **Privacy Domains**: Register human-readable privacy domains (e.g., `alice.veil`)
- **Zero-Knowledge Proofs**: Verify payments without revealing transaction details
- **Self-Custodial**: Users maintain full control of their private keys

### Payment Features
- **Private Payments**: Send/receive payments with complete anonymity
- **Subscription Plans**: Create and manage recurring payment plans
- **Payment Scanning**: Detect incoming payments to your privacy domain
- **Claim Payments**: Withdraw funds from stealth addresses to your wallet

### x402 Protocol Integration
- **Priority Scan**: Instant payment detection (paid service)
- **Gas Relay**: Gasless claiming of payments (paid service)
- **USDC Payments**: Pay for premium services with USDC
- **Payment Authorization**: EIP-3009 `transferWithAuthorization` support

### Farcaster Integration
- **Mini App**: Full Farcaster mini app support
- **Wallet Integration**: Seamless Farcaster wallet connection
- **Social Features**: Share privacy domains on Farcaster

## 🏗️ Architecture

### Smart Contracts (Solidity)
- **PrivacyDomainRegistry**: Register and manage privacy domains
- **StealthPaymentVault**: Handle stealth address payments
- **CommitmentRegistry**: Store payment commitments for privacy

### Frontend (Next.js 14)
- **App Router**: Modern Next.js app directory structure
- **Wagmi v2**: Ethereum wallet integration
- **Farcaster SDK**: Mini app functionality
- **TailwindCSS**: Responsive, modern UI

### Backend Services
- **Supabase**: Database for indexing blockchain events
- **Production Indexer**: Real-time blockchain event indexing
- **x402 API**: Premium service endpoints

## 🚀 Quick Start

### Prerequisites
- Node.js 18+
- MetaMask or compatible wallet
- Monad testnet RPC access

### Installation

```bash
# Clone the repository
git clone https://github.com/Vaibhav-Rawat-cipher/VeilPay.git
cd VeilPay

# Install dependencies
npm install
cd frontend && npm install && cd ..

# Setup environment variables
cp .env.example .env
# Edit .env with your configuration
```

### Environment Variables

Create `.env` in the root directory:

```env
# Monad RPC
MONAD_RPC_URL=https://testnet-rpc.monad.xyz

# Supabase
SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_KEY=your_service_key

# Contract Addresses (auto-populated after deployment)
NEXT_PUBLIC_REGISTRY_ADDRESS=
NEXT_PUBLIC_VAULT_ADDRESS=
NEXT_PUBLIC_COMMITMENT_ADDRESS=
```

### Deploy Contracts

```bash
# Compile contracts
npm run compile

# Deploy to Monad testnet
npm run deploy:monad
```

### Run Frontend

```bash
cd frontend
npm run dev
```

Visit `http://localhost:3000`

### Run Indexer (Optional)

```bash
# In a separate terminal
node indexer/production-indexer.js
```

## 📱 Farcaster Mini App

The VeilPay Farcaster mini app is live! Access it through:

1. **Warpcast Developer Portal**: [warpcast.com/~/developers/mini-apps](https://warpcast.com/~/developers/mini-apps)
2. **Share in Cast**: Paste `https://veil-pay1.vercel.app` in a Warpcast cast
3. **Direct Link**: Open in Warpcast mobile app

### Mini App Features
- Connect with Farcaster wallet
- Register privacy domains
- Send/receive private payments
- Scan for incoming payments
- Premium x402 services

## 🔧 Technology Stack

### Blockchain
- **Monad Testnet**: High-performance EVM-compatible chain
- **Solidity**: Smart contract development
- **Hardhat**: Development framework
- **ethers.js v6**: Blockchain interaction

### Frontend
- **Next.js 14**: React framework with App Router
- **TypeScript**: Type-safe development
- **Wagmi v2**: React hooks for Ethereum
- **Farcaster SDK**: Mini app integration
- **TailwindCSS**: Utility-first CSS

### Backend
- **Supabase**: PostgreSQL database
- **Node.js**: Indexer services
- **x402 Protocol**: Payment-gated APIs

## 📖 Usage Guide

### 1. Register a Privacy Domain

```typescript
// Navigate to "Register Domain"
// Enter your desired domain name (e.g., "alice")
// Click "Register Domain"
// Approve the transaction
```

### 2. Send a Private Payment

```typescript
// Navigate to "Send Payment"
// Enter recipient's privacy domain (e.g., "bob.veil")
// Enter amount and select plan
// Click "Send Payment"
// Approve the transaction
```

### 3. Scan for Payments

```typescript
// Navigate to "Scan Payments"
// Select your domain
// Click "Derive Private Keys" (sign message)
// Click "Scan Database" to find payments
// Or use "Priority Scan" for instant results (x402)
```

### 4. Claim Payments

```typescript
// After scanning, unclaimed payments appear
// Click "Claim" on any payment
// Approve the transaction
// Funds transferred to your wallet
```

## 🔐 Security

- **Private Keys**: Never leave your device
- **Stealth Addresses**: Unique per payment
- **Zero-Knowledge**: Verify without revealing
- **Self-Custodial**: You control your funds

## 🛣️ Roadmap

- [x] Core stealth address implementation
- [x] Privacy domain registration
- [x] Payment sending/receiving
- [x] Payment scanning and claiming
- [x] Farcaster mini app integration
- [x] x402 premium services
- [ ] Mobile app (iOS/Android)
- [ ] Cross-chain support
- [ ] Enhanced privacy features
- [ ] DAO governance

## 📄 License

MIT License - see [LICENSE](LICENSE) file for details

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## 📞 Support

- **GitHub Issues**: [Report bugs](https://github.com/Vaibhav-Rawat-cipher/VeilPay/issues)
- **Documentation**: Coming soon
- **Community**: Join our discussions

## 🙏 Acknowledgments

- Monad team for the high-performance blockchain
- Farcaster for mini app platform
- x402 protocol for payment-gated APIs
- Open source community

---

**Built with ❤️ for privacy-conscious users**
