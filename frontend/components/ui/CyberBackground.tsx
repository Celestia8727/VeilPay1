'use client';

export default function CyberBackground() {
    return (
        <>
            {/* Simple gradient background */}
            <div className="fixed inset-0 bg-gradient-to-br from-purple-900/20 via-gray-900 to-cyan-900/20 -z-10" />

            {/* Animated gradient orbs */}
            <div className="fixed inset-0 overflow-hidden pointer-events-none -z-10">
                <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-pink-500/10 rounded-full blur-3xl animate-pulse" />
                <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl animate-pulse delay-1000" />
            </div>
        </>
    );
}
