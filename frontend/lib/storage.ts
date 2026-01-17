/**
 * Local Storage Service with Wallet Scoping
 * 
 * Stores data in browser localStorage, scoped by wallet address.
 * Only the connected wallet can see their own data.
 * Can be migrated to Supabase later.
 */

export type Domain = {
    id: string
    domain_hash: string
    domain_name: string
    owner_address: string
    spend_pub_key: string
    view_pub_key: string
    registered_at: string
    created_at: string
}

export type SubscriptionTier = {
    id: string
    tier_name: string
    domain_limit: number
    price: string
    duration: number
    description: string
}

export type UserSubscription = {
    id: string
    user_address: string
    tier_id: string
    purchased_at: string
    expires_at: string
    transaction_hash: string
    tier?: SubscriptionTier
}

export type Payment = {
    id: string
    merchant_id: string
    plan_id: number
    stealth_address: string
    amount: string
    duration: number
    timestamp: number
    block_number: number
    transaction_hash: string
}

// Default subscription tiers
const DEFAULT_TIERS: SubscriptionTier[] = [
    {
        id: 'tier-free',
        tier_name: 'Free',
        domain_limit: 100,
        price: '0',
        duration: 0,
        description: 'Free tier - 100 domains forever'
    },
    {
        id: 'tier-basic',
        tier_name: 'Basic',
        domain_limit: 5,
        price: '0.01',
        duration: 2592000, // 30 days
        description: 'Basic tier - 5 domains for 30 days'
    },
    {
        id: 'tier-pro',
        tier_name: 'Pro',
        domain_limit: 20,
        price: '0.05',
        duration: 7776000, // 90 days
        description: 'Pro tier - 20 domains for 90 days'
    },
    {
        id: 'tier-enterprise',
        tier_name: 'Enterprise',
        domain_limit: 100,
        price: '0.2',
        duration: 31536000, // 1 year
        description: 'Enterprise tier - 100 domains for 1 year'
    }
]

class LocalStorageService {
    private getKey(address: string, type: string): string {
        return `veil_${address.toLowerCase()}_${type}`
    }

    // Domains
    getUserDomains(address: string): Domain[] {
        const key = this.getKey(address, 'domains')
        const data = window.localStorage.getItem(key)
        return data ? JSON.parse(data) : []
    }

    saveDomain(address: string, domain: Domain): void {
        const domains = this.getUserDomains(address)
        console.log('Current domains before save:', domains.length)
        domains.push(domain)
        console.log('Domains after push:', domains.length)
        const key = this.getKey(address, 'domains')
        console.log('Saving to localStorage key:', key)
        window.localStorage.setItem(key, JSON.stringify(domains))
        console.log('Saved! Verifying...')
        const saved = window.localStorage.getItem(key)
        console.log('Verification - saved domains:', saved ? JSON.parse(saved).length : 0)
    }

    // Subscriptions
    getUserSubscription(address: string): UserSubscription | null {
        const key = this.getKey(address, 'subscription')
        const data = window.localStorage.getItem(key)

        if (!data) {
            // Return free tier by default
            return {
                id: 'sub-free',
                user_address: address.toLowerCase(),
                tier_id: 'tier-free',
                purchased_at: new Date().toISOString(),
                expires_at: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(), // 1 year
                transaction_hash: '0x0',
                tier: DEFAULT_TIERS[0]
            }
        }

        const subscription: UserSubscription = JSON.parse(data)

        // Check if expired
        if (new Date(subscription.expires_at) < new Date()) {
            // Revert to free tier
            return {
                id: 'sub-free',
                user_address: address.toLowerCase(),
                tier_id: 'tier-free',
                purchased_at: new Date().toISOString(),
                expires_at: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
                transaction_hash: '0x0',
                tier: DEFAULT_TIERS[0]
            }
        }

        // Attach tier info
        subscription.tier = DEFAULT_TIERS.find(t => t.id === subscription.tier_id)
        return subscription
    }

    saveSubscription(address: string, subscription: UserSubscription): void {
        const key = this.getKey(address, 'subscription')
        window.localStorage.setItem(key, JSON.stringify(subscription))
    }

    // Subscription Tiers
    getSubscriptionTiers(): SubscriptionTier[] {
        return DEFAULT_TIERS
    }

    // Payments (global, but anonymized)
    getAllPayments(): Payment[] {
        const data = window.localStorage.getItem('veil_global_payments')
        return data ? JSON.parse(data) : []
    }

    savePayment(payment: Payment): void {
        const payments = this.getAllPayments()
        payments.unshift(payment) // Add to beginning
        // Keep only last 100
        const trimmed = payments.slice(0, 100)
        window.localStorage.setItem('veil_global_payments', JSON.stringify(trimmed))
    }

    // Clear user data (for testing)
    clearUserData(address: string): void {
        const domainsKey = this.getKey(address, 'domains')
        const subsKey = this.getKey(address, 'subscription')
        window.localStorage.removeItem(domainsKey)
        window.localStorage.removeItem(subsKey)
    }
}

// Export singleton instance
export const localStorage = new LocalStorageService()

// Helper functions (compatible with Supabase version)
export async function getUserDomains(address: string): Promise<Domain[]> {
    return localStorage.getUserDomains(address)
}

export async function saveDomain(address: string, domain: Domain): Promise<void> {
    localStorage.saveDomain(address, domain)
}

export async function getUserSubscription(address: string): Promise<UserSubscription | null> {
    return localStorage.getUserSubscription(address)
}

export async function saveSubscription(address: string, subscription: UserSubscription): Promise<void> {
    localStorage.saveSubscription(address, subscription)
}

export async function getSubscriptionTiers(): Promise<SubscriptionTier[]> {
    return localStorage.getSubscriptionTiers()
}

export async function getRecentPayments(limit = 50): Promise<Payment[]> {
    const payments = localStorage.getAllPayments()
    return payments.slice(0, limit)
}

export async function savePayment(payment: Payment): Promise<void> {
    localStorage.savePayment(payment)
}
