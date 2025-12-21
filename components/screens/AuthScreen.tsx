
import React, { useState } from 'react';
import { useAppState } from '../../state/appState';
import { getSupabaseClient } from '../../services/supabaseClient';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Label } from '../ui/Label';
import { Loader } from '../ui/Loader';

const AuthScreen: React.FC = () => {
    const { state } = useAppState();
    const { businessInfo } = state;
    const [isSignUp, setIsSignUp] = useState(false);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [message, setMessage] = useState<string | null>(null);

    const handleAuth = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);
        setMessage(null);

        try {
            const supabase = getSupabaseClient(businessInfo.supabaseUrl, businessInfo.supabaseAnonKey);
            if (isSignUp) {
                const { error } = await supabase.auth.signUp({ email, password });
                if (error) throw error;
                setMessage('Check your email for the confirmation link!');
            } else {
                const { error } = await supabase.auth.signInWithPassword({ email, password });
                if (error) throw error;
                // The onAuthStateChange listener in App.tsx will handle the redirect.
            }
        } catch (err) {
            let errorMsg = err instanceof Error ? err.message : 'An unknown authentication error occurred.';
            
            if (errorMsg.includes('Failed to fetch')) {
                errorMsg = 'Connection failed. Please check your Supabase credentials in Settings (⚙️ bottom right).';
            }
            
            setError(errorMsg);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="flex items-center justify-center min-h-screen">
            <Card className="w-full max-w-md p-8">
                <h1 className="text-3xl font-bold text-center text-white mb-2">Holistic SEO Workbench</h1>
                <p className="text-center text-gray-400 mb-6">{isSignUp ? 'Create a new account' : 'Sign in to your account'}</p>
                
                <div className="flex justify-center mb-6 border-b border-gray-700">
                    <button 
                        onClick={() => setIsSignUp(false)}
                        className={`px-4 py-2 text-sm font-medium ${!isSignUp ? 'text-blue-400 border-b-2 border-blue-500' : 'text-gray-400'}`}
                    >
                        Sign In
                    </button>
                    <button 
                        onClick={() => setIsSignUp(true)}
                        className={`px-4 py-2 text-sm font-medium ${isSignUp ? 'text-blue-400 border-b-2 border-blue-500' : 'text-gray-400'}`}
                    >
                        Sign Up
                    </button>
                </div>
                
                <form onSubmit={handleAuth} className="space-y-6">
                    <div>
                        <Label htmlFor="email">Email Address</Label>
                        <Input
                            id="email"
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            required
                            placeholder="you@example.com"
                        />
                    </div>
                    <div>
                        <Label htmlFor="password">Password</Label>
                        <Input
                            id="password"
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                            placeholder="••••••••"
                        />
                    </div>
                    
                    {error && (
                        <div className="text-sm text-red-400 bg-red-900/20 p-3 rounded-md border border-red-900/50">
                            <p>{error}</p>
                            {error.includes('Settings') && (
                                <p className="mt-2 text-xs text-gray-400">
                                    Use the gear icon ⚙️ in the bottom right corner to configure your own Supabase URL and Anon Key.
                                </p>
                            )}
                        </div>
                    )}
                    {message && <p className="text-sm text-green-400 bg-green-900/20 p-3 rounded-md">{message}</p>}

                    <div>
                        <Button type="submit" className="w-full" disabled={loading}>
                            {loading ? <Loader className="w-5 h-5 mx-auto" /> : (isSignUp ? 'Sign Up' : 'Sign In')}
                        </Button>
                    </div>
                </form>
            </Card>
        </div>
    );
};

export default AuthScreen;
