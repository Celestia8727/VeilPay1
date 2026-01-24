'use client';

import Link from 'next/link';
import { useAccount, useConnect, useDisconnect } from 'wagmi';
import { Shield, Menu, X } from 'lucide-react';
import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

// Simple Wallet Button
function WalletButton() {
    const { address, isConnected } = useAccount();
    const { connect, connectors } = useConnect();
    const { disconnect } = useDisconnect();

    if (!isConnected) {
        return (
            <button
                onClick={() => connect({ connector: connectors[0] })}
                className="px-4 py-2 bg-cyan-500/20 border border-cyan-400/50 text-cyan-400 rounded-lg hover:bg-cyan-500/30 transition-all font-medium"
            >
                Connect Wallet
            </button>
        );
    }

    return (
        <button
            onClick={() => disconnect()}
            className="px-4 py-2 bg-cyan-500/20 border border-cyan-400/50 text-cyan-400 rounded-lg hover:bg-cyan-500/30 transition-all font-medium"
        >
            {address?.slice(0, 6)}...{address?.slice(-4)}
        </button>
    );
}

export default function Navigation() {
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

    const navLinks = [
        { href: '/', label: 'Home' },
        { href: '/dashboard', label: 'Dashboard' },
        { href: '/pay', label: 'Pay' },
        { href: '/merchant', label: 'Merchant' },
    ];

    return (
        <nav className="fixed top-0 left-0 right-0 z-50 border-b border-cyan-500/20 bg-gray-900/80 backdrop-blur-lg">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex items-center justify-between h-16">
                    {/* Logo */}
                    <Link href="/" className="flex items-center space-x-3 group">
                        <Shield className="w-8 h-8 text-cyan-400 group-hover:text-cyan-300 transition-colors" />
                        <span className="text-2xl font-bold text-white">
                            veil<span className="text-cyan-400">402</span>
                        </span>
                    </Link>

                    {/* Desktop Navigation */}
                    <div className="hidden md:flex items-center space-x-8">
                        {navLinks.map((link) => (
                            <Link
                                key={link.href}
                                href={link.href}
                                className="text-gray-300 hover:text-cyan-400 transition-colors duration-300 font-medium"
                            >
                                {link.label}
                            </Link>
                        ))}
                    </div>

                    {/* Wallet Connect Button */}
                    <div className="hidden md:block">
                        <WalletButton />
                    </div>

                    {/* Mobile Menu Button */}
                    <button
                        onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                        className="md:hidden p-2 rounded-lg border border-cyan-400/30 hover:border-cyan-400 transition-all"
                    >
                        {mobileMenuOpen ? (
                            <X className="w-6 h-6 text-cyan-400" />
                        ) : (
                            <Menu className="w-6 h-6 text-cyan-400" />
                        )}
                    </button>
                </div>
            </div>

            {/* Mobile Menu */}
            <AnimatePresence>
                {mobileMenuOpen && (
                    <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="md:hidden border-t border-cyan-400/20 bg-gray-800/95 backdrop-blur-lg"
                    >
                        <div className="px-4 py-6 space-y-4">
                            {navLinks.map((link) => (
                                <Link
                                    key={link.href}
                                    href={link.href}
                                    onClick={() => setMobileMenuOpen(false)}
                                    className="block text-gray-300 hover:text-cyan-400 transition-colors duration-300 font-medium py-2"
                                >
                                    {link.label}
                                </Link>
                            ))}
                            <div className="pt-4 border-t border-cyan-400/20">
                                <ConnectButton />
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </nav>
    );
}
