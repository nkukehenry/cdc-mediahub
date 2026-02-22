'use client';

import { useState } from 'react';
import Link from 'next/link';
import PublicNav from '@/components/PublicNav';
import PublicFooter from '@/components/PublicFooter';

export default function ForgotPasswordPage() {
    const [email, setEmail] = useState('');
    const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
    const [message, setMessage] = useState('');

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setStatus('loading');

        try {
            const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/api/auth/forgot-password`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email }),
            });

            const data = await response.json();

            if (response.ok) {
                setStatus('success');
                setMessage(data.message || 'If an account with that email exists, a reset link has been sent.');
            } else {
                setStatus('error');
                setMessage(data.error?.message || 'Something went wrong. Please try again.');
            }
        } catch (error) {
            setStatus('error');
            setMessage('Failed to connect to the server. Please try again.');
        }
    };

    return (
        <div className="min-h-screen flex flex-col bg-gray-50">
            <PublicNav />

            <div className="flex-1 pt-32 pb-8 px-4 sm:px-6 lg:px-8">
                <div className="max-w-md mx-auto">
                    <div className="text-center mb-10">
                        <h1 className="text-3xl font-bold text-au-grey-text">Reset Password</h1>
                        <p className="mt-3 text-sm text-au-grey-text/70">
                            Enter your email address and we'll send you a link to reset your password.
                        </p>
                    </div>

                    <div className="bg-white rounded-2xl shadow-xl px-6 py-8 md:px-10">
                        {status === 'success' ? (
                            <div className="text-center py-4">
                                <div className="mb-4 inline-flex items-center justify-center w-12 h-12 rounded-full bg-green-100 text-green-600">
                                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                                    </svg>
                                </div>
                                <h2 className="text-xl font-semibold text-gray-900 mb-2">Check your email</h2>
                                <p className="text-gray-600 mb-6">{message}</p>
                                <Link
                                    href="/login"
                                    className="text-au-green hover:text-au-corporate-green font-medium"
                                >
                                    Back to login
                                </Link>
                            </div>
                        ) : (
                            <form onSubmit={handleSubmit} className="space-y-6">
                                <div>
                                    <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                                        Email address
                                    </label>
                                    <input
                                        id="email"
                                        type="email"
                                        required
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        className="block w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-au-green focus:border-transparent outline-none transition-all"
                                        placeholder="Enter your email"
                                    />
                                </div>

                                {status === 'error' && (
                                    <div className="p-3 rounded-lg bg-red-50 text-red-600 text-sm">
                                        {message}
                                    </div>
                                )}

                                <button
                                    type="submit"
                                    disabled={status === 'loading'}
                                    className="w-full py-3 px-4 bg-au-green hover:bg-au-corporate-green text-white font-semibold rounded-xl shadow-lg transition-colors disabled:opacity-50"
                                >
                                    {status === 'loading' ? 'Sending link...' : 'Send reset link'}
                                </button>

                                <div className="text-center mt-6">
                                    <Link
                                        href="/login"
                                        className="text-sm text-au-grey-text/70 hover:text-au-green font-medium"
                                    >
                                        Cancel and return to login
                                    </Link>
                                </div>
                            </form>
                        )}
                    </div>
                </div>
            </div>

            <PublicFooter />
        </div>
    );
}
