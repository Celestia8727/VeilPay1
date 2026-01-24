import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder-key';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Database types
export interface Domain {
    id: string;
    domain_hash: string;
    domain_name: string;
    owner_address: string;
    spend_pub_key: string;
    view_pub_key: string;
    registered_at: string;
    created_at: string;
}

export interface Merchant {
    id: string;
    merchant_id: string;
    merchant_name: string;
    owner_address: string;
    description?: string;
    website?: string;
    logo_url?: string;
    created_at: string;
}

export interface Plan {
    id: string;
    merchant_id: string;
    plan_id: number;
    plan_name: string;
    description?: string;
    price: string;
    duration: number;
    active: boolean;
    created_at: string;
}

export interface Payment {
    id: string;
    merchant_id: string;
    plan_id: number;
    stealth_address: string;
    amount: string;
    duration: number;
    timestamp: number;
    ephemeral_pub_key: string;
    block_number: number;
    transaction_hash: string;
    created_at: string;
}
