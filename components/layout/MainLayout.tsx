import React from 'react';
import { useAppState } from '../../state/appState';
import { AppStep } from '../../types';
import ContextChatPanel from '../strategist/ContextChatPanel';

interface MainLayoutProps {
    children: React.ReactNode;
}

const MainLayout: React.FC<MainLayoutProps> = ({ children }) => {
    const { state, dispatch } = useAppState();
    const { isStrategistOpen, appStep } = state;

    // Only show strategist UI when user is logged in and not on auth screen
    const showStrategistUI = state.user && appStep !== AppStep.AUTH;

    return (
        <div className="relative min-h-screen flex flex-col">
            {/* Main Content Area */}
            <main className={`flex-grow transition-all duration-300 ${isStrategistOpen ? 'mr-96' : ''}`}>
                {children}
            </main>

            {/* Strategist Sidebar - only show when logged in and not on auth screen */}
            {showStrategistUI && <ContextChatPanel />}

            {/* Floating Toggle Button - Moved to bottom right above existing tools */}
            {/* Only show when logged in, not on auth screen, and strategist panel is closed */}
            {!isStrategistOpen && showStrategistUI && (
                <button
                    onClick={() => dispatch({ type: 'TOGGLE_STRATEGIST', payload: true })}
                    className="fixed bottom-20 right-6 z-50 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white p-3 rounded-l-full shadow-[0_0_15px_rgba(37,99,235,0.5)] transition-all hover:pr-6 flex items-center gap-2 border border-white/20 animate-pulse-slow"
                    title="Open AI Strategist"
                >
                    <span className="text-2xl">🧠</span>
                    <span className="font-bold text-sm hidden md:inline">Ask Strategist</span>
                </button>
            )}
            <style>{`
                @keyframes pulse-slow {
                    0%, 100% { transform: scale(1); }
                    50% { transform: scale(1.05); }
                }
                .animate-pulse-slow {
                    animation: pulse-slow 3s infinite;
                }
            `}</style>
        </div>
    );
};

export default MainLayout;