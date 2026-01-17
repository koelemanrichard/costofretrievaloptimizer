
// components/ui/FunLoaders.tsx
// A collection of fun, themed loading indicators for different contexts

import React from 'react';

interface LoaderProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg';
  color?: string;
}

const sizeMap = {
  sm: 'w-4 h-4',
  md: 'w-6 h-6',
  lg: 'w-8 h-8',
};

// ============================================
// 1. BOUNCING DOTS - Playful, universal
// ============================================
export const BouncingDots: React.FC<LoaderProps> = ({ className = '', size = 'md' }) => {
  const dotSize = size === 'sm' ? 'w-1.5 h-1.5' : size === 'md' ? 'w-2 h-2' : 'w-3 h-3';
  return (
    <div className={`flex items-center gap-1 ${className}`}>
      {[0, 1, 2].map((i) => (
        <div
          key={i}
          className={`${dotSize} rounded-full bg-current animate-bounce`}
          style={{ animationDelay: `${i * 0.15}s`, animationDuration: '0.6s' }}
        />
      ))}
    </div>
  );
};

// ============================================
// 2. DNA HELIX - Perfect for "expanding" knowledge
// ============================================
export const DnaHelix: React.FC<LoaderProps> = ({ className = '', size = 'md' }) => {
  const h = size === 'sm' ? 16 : size === 'md' ? 24 : 32;
  return (
    <svg className={`${sizeMap[size]} ${className}`} viewBox="0 0 24 24" fill="none">
      <style>{`
        @keyframes dna-strand {
          0%, 100% { transform: scaleY(1); }
          50% { transform: scaleY(0.3); }
        }
        .dna-bar { animation: dna-strand 0.8s ease-in-out infinite; transform-origin: center; }
      `}</style>
      {[0, 1, 2, 3, 4].map((i) => (
        <rect
          key={i}
          className="dna-bar"
          x={4 + i * 4}
          y="6"
          width="2"
          height="12"
          rx="1"
          fill="currentColor"
          style={{ animationDelay: `${i * 0.1}s` }}
        />
      ))}
    </svg>
  );
};

// ============================================
// 3. KNOWLEDGE NODES - Fits semantic SEO theme
// ============================================
export const KnowledgeNodes: React.FC<LoaderProps> = ({ className = '', size = 'md' }) => {
  return (
    <svg className={`${sizeMap[size]} ${className}`} viewBox="0 0 24 24" fill="none">
      <style>{`
        @keyframes node-pulse { 0%, 100% { opacity: 0.3; r: 2; } 50% { opacity: 1; r: 3; } }
        @keyframes line-draw { 0%, 100% { stroke-dashoffset: 20; } 50% { stroke-dashoffset: 0; } }
        .node { animation: node-pulse 1.2s ease-in-out infinite; }
        .connector { stroke-dasharray: 10; animation: line-draw 1.2s ease-in-out infinite; }
      `}</style>
      {/* Center node */}
      <circle className="node" cx="12" cy="12" r="3" fill="currentColor" />
      {/* Orbiting nodes */}
      <circle className="node" cx="5" cy="8" r="2" fill="currentColor" style={{ animationDelay: '0.2s' }} />
      <circle className="node" cx="19" cy="8" r="2" fill="currentColor" style={{ animationDelay: '0.4s' }} />
      <circle className="node" cx="5" cy="16" r="2" fill="currentColor" style={{ animationDelay: '0.6s' }} />
      <circle className="node" cx="19" cy="16" r="2" fill="currentColor" style={{ animationDelay: '0.8s' }} />
      {/* Connectors */}
      <line className="connector" x1="7" y1="9" x2="10" y2="11" stroke="currentColor" strokeWidth="1" style={{ animationDelay: '0.1s' }} />
      <line className="connector" x1="17" y1="9" x2="14" y2="11" stroke="currentColor" strokeWidth="1" style={{ animationDelay: '0.3s' }} />
      <line className="connector" x1="7" y1="15" x2="10" y2="13" stroke="currentColor" strokeWidth="1" style={{ animationDelay: '0.5s' }} />
      <line className="connector" x1="17" y1="15" x2="14" y2="13" stroke="currentColor" strokeWidth="1" style={{ animationDelay: '0.7s' }} />
    </svg>
  );
};

// ============================================
// 4. BRAIN PULSE - AI thinking animation
// ============================================
export const BrainPulse: React.FC<LoaderProps> = ({ className = '', size = 'md' }) => {
  return (
    <svg className={`${sizeMap[size]} ${className}`} viewBox="0 0 24 24" fill="none">
      <style>{`
        @keyframes brain-glow { 0%, 100% { opacity: 0.4; } 50% { opacity: 1; } }
        @keyframes spark { 0%, 100% { opacity: 0; transform: scale(0); } 50% { opacity: 1; transform: scale(1); } }
        .brain-base { opacity: 0.3; }
        .brain-active { animation: brain-glow 0.8s ease-in-out infinite; }
        .spark { animation: spark 0.6s ease-out infinite; transform-origin: center; }
      `}</style>
      {/* Brain outline */}
      <path className="brain-base" d="M12 2C8 2 4 5 4 9c0 2.5 1 4.5 3 6v5h10v-5c2-1.5 3-3.5 3-6 0-4-4-7-8-7z" fill="currentColor" />
      {/* Pulsing sections */}
      <circle className="brain-active" cx="8" cy="8" r="2" fill="currentColor" style={{ animationDelay: '0s' }} />
      <circle className="brain-active" cx="16" cy="8" r="2" fill="currentColor" style={{ animationDelay: '0.2s' }} />
      <circle className="brain-active" cx="12" cy="11" r="2" fill="currentColor" style={{ animationDelay: '0.4s' }} />
      {/* Sparks */}
      <circle className="spark" cx="6" cy="5" r="1" fill="currentColor" style={{ animationDelay: '0.1s' }} />
      <circle className="spark" cx="18" cy="6" r="1" fill="currentColor" style={{ animationDelay: '0.3s' }} />
      <circle className="spark" cx="12" cy="4" r="1" fill="currentColor" style={{ animationDelay: '0.5s' }} />
    </svg>
  );
};

// ============================================
// 5. MAGIC SPARKLES - For AI generation
// ============================================
export const MagicSparkles: React.FC<LoaderProps> = ({ className = '', size = 'md' }) => {
  return (
    <div className={`relative ${sizeMap[size]} ${className}`}>
      <style>{`
        @keyframes sparkle {
          0%, 100% { opacity: 0; transform: scale(0) rotate(0deg); }
          50% { opacity: 1; transform: scale(1) rotate(180deg); }
        }
        .sparkle { animation: sparkle 1s ease-in-out infinite; }
      `}</style>
      <svg className="w-full h-full" viewBox="0 0 24 24" fill="none">
        {/* Stars */}
        <path className="sparkle" style={{ animationDelay: '0s' }} d="M12 2l1 3 3 1-3 1-1 3-1-3-3-1 3-1z" fill="currentColor" />
        <path className="sparkle" style={{ animationDelay: '0.3s' }} d="M5 10l0.7 2 2 0.7-2 0.7-0.7 2-0.7-2-2-0.7 2-0.7z" fill="currentColor" />
        <path className="sparkle" style={{ animationDelay: '0.6s' }} d="M18 12l0.7 2 2 0.7-2 0.7-0.7 2-0.7-2-2-0.7 2-0.7z" fill="currentColor" />
        <path className="sparkle" style={{ animationDelay: '0.2s' }} d="M12 16l0.5 1.5 1.5 0.5-1.5 0.5-0.5 1.5-0.5-1.5-1.5-0.5 1.5-0.5z" fill="currentColor" />
      </svg>
    </div>
  );
};

// ============================================
// 6. WAVE BARS - Audio visualizer style
// ============================================
export const WaveBars: React.FC<LoaderProps> = ({ className = '', size = 'md' }) => {
  const barWidth = size === 'sm' ? 2 : size === 'md' ? 3 : 4;
  const gap = size === 'sm' ? 1 : 2;
  return (
    <div className={`flex items-center ${className}`} style={{ gap: `${gap}px` }}>
      <style>{`
        @keyframes wave {
          0%, 100% { height: 30%; }
          50% { height: 100%; }
        }
      `}</style>
      {[0, 1, 2, 3, 4].map((i) => (
        <div
          key={i}
          className="bg-current rounded-full"
          style={{
            width: `${barWidth}px`,
            height: size === 'sm' ? '12px' : size === 'md' ? '18px' : '24px',
            animation: 'wave 0.8s ease-in-out infinite',
            animationDelay: `${i * 0.1}s`,
          }}
        />
      ))}
    </div>
  );
};

// ============================================
// 7. ORBIT - Planets orbiting (space theme)
// ============================================
export const Orbit: React.FC<LoaderProps> = ({ className = '', size = 'md' }) => {
  return (
    <div className={`relative ${sizeMap[size]} ${className}`}>
      <style>{`
        @keyframes orbit { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
        @keyframes counter-orbit { 0% { transform: rotate(0deg); } 100% { transform: rotate(-360deg); } }
        .orbit-ring { animation: orbit 2s linear infinite; }
        .orbit-ring-reverse { animation: counter-orbit 1.5s linear infinite; }
      `}</style>
      <svg className="w-full h-full" viewBox="0 0 24 24" fill="none">
        {/* Center sun */}
        <circle cx="12" cy="12" r="3" fill="currentColor" className="opacity-80" />
        {/* Orbit path */}
        <circle cx="12" cy="12" r="8" stroke="currentColor" strokeWidth="0.5" opacity="0.2" fill="none" />
        {/* Orbiting planet */}
        <g className="orbit-ring" style={{ transformOrigin: '12px 12px' }}>
          <circle cx="20" cy="12" r="2" fill="currentColor" />
        </g>
        {/* Second orbit (smaller, reverse) */}
        <g className="orbit-ring-reverse" style={{ transformOrigin: '12px 12px' }}>
          <circle cx="12" cy="6" r="1.5" fill="currentColor" className="opacity-60" />
        </g>
      </svg>
    </div>
  );
};

// ============================================
// 8. MORPHING BLOB - Organic, modern
// ============================================
export const MorphBlob: React.FC<LoaderProps> = ({ className = '', size = 'md' }) => {
  return (
    <div className={`${sizeMap[size]} ${className}`}>
      <style>{`
        @keyframes morph {
          0%, 100% { border-radius: 60% 40% 30% 70% / 60% 30% 70% 40%; }
          25% { border-radius: 30% 60% 70% 40% / 50% 60% 30% 60%; }
          50% { border-radius: 50% 60% 30% 60% / 30% 60% 70% 40%; }
          75% { border-radius: 60% 40% 60% 30% / 70% 30% 50% 60%; }
        }
        @keyframes rotate { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
        .blob { animation: morph 3s ease-in-out infinite, rotate 4s linear infinite; }
      `}</style>
      <div className="w-full h-full bg-current blob opacity-80" />
    </div>
  );
};

// ============================================
// 9. TYPING DOTS - Chat/AI thinking style
// ============================================
export const TypingDots: React.FC<LoaderProps> = ({ className = '', size = 'md' }) => {
  const dotSize = size === 'sm' ? 'w-1 h-1' : size === 'md' ? 'w-1.5 h-1.5' : 'w-2 h-2';
  return (
    <div className={`flex items-center gap-1 ${className}`}>
      <style>{`
        @keyframes typing {
          0%, 60%, 100% { transform: translateY(0); opacity: 0.4; }
          30% { transform: translateY(-4px); opacity: 1; }
        }
      `}</style>
      {[0, 1, 2].map((i) => (
        <div
          key={i}
          className={`${dotSize} rounded-full bg-current`}
          style={{
            animation: 'typing 1.2s ease-in-out infinite',
            animationDelay: `${i * 0.2}s`,
          }}
        />
      ))}
    </div>
  );
};

// ============================================
// 10. BUILDING BLOCKS - For construction ops
// ============================================
export const BuildingBlocks: React.FC<LoaderProps> = ({ className = '', size = 'md' }) => {
  return (
    <svg className={`${sizeMap[size]} ${className}`} viewBox="0 0 24 24" fill="none">
      <style>{`
        @keyframes stack {
          0%, 100% { opacity: 0.3; transform: translateY(4px); }
          50% { opacity: 1; transform: translateY(0); }
        }
        .block { animation: stack 0.8s ease-out infinite; }
      `}</style>
      <rect className="block" x="4" y="14" width="6" height="6" rx="1" fill="currentColor" style={{ animationDelay: '0s' }} />
      <rect className="block" x="14" y="14" width="6" height="6" rx="1" fill="currentColor" style={{ animationDelay: '0.2s' }} />
      <rect className="block" x="9" y="8" width="6" height="6" rx="1" fill="currentColor" style={{ animationDelay: '0.4s' }} />
      <rect className="block" x="9" y="2" width="6" height="6" rx="1" fill="currentColor" style={{ animationDelay: '0.6s' }} />
    </svg>
  );
};

// ============================================
// 11. PROGRESS TEXT - Fun messages
// ============================================
const funMessages = [
  'Thinking...',
  'Processing...',
  'Almost there...',
  'Working magic...',
  'Connecting dots...',
  'Building knowledge...',
  'Analyzing...',
  'Expanding horizons...',
];

export const ProgressText: React.FC<{ messages?: string[]; className?: string; interval?: number }> = ({
  messages = funMessages,
  className = '',
  interval = 2000,
}) => {
  const [index, setIndex] = React.useState(0);

  React.useEffect(() => {
    const timer = setInterval(() => {
      setIndex((prev) => (prev + 1) % messages.length);
    }, interval);
    return () => clearInterval(timer);
  }, [messages.length, interval]);

  return (
    <span className={`transition-opacity duration-300 ${className}`}>
      {messages[index]}
    </span>
  );
};

// ============================================
// 12. COMBINED LOADER WITH TEXT
// ============================================
export const FunLoader: React.FC<{
  variant?: 'dots' | 'dna' | 'nodes' | 'brain' | 'sparkles' | 'wave' | 'orbit' | 'blob' | 'typing' | 'blocks';
  text?: string | string[];
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  showText?: boolean;
}> = ({ variant = 'dots', text, size = 'md', className = '', showText = true }) => {
  const LoaderComponent = {
    dots: BouncingDots,
    dna: DnaHelix,
    nodes: KnowledgeNodes,
    brain: BrainPulse,
    sparkles: MagicSparkles,
    wave: WaveBars,
    orbit: Orbit,
    blob: MorphBlob,
    typing: TypingDots,
    blocks: BuildingBlocks,
  }[variant];

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <LoaderComponent size={size} />
      {showText && text && (
        typeof text === 'string'
          ? <span className="text-sm">{text}</span>
          : <ProgressText messages={text} className="text-sm" />
      )}
    </div>
  );
};

// ============================================
// BUTTON LOADER - Drop-in replacement
// ============================================
export const ButtonLoader: React.FC<{
  variant?: 'dots' | 'typing' | 'wave' | 'sparkles';
  className?: string;
}> = ({ variant = 'dots', className = '' }) => {
  const Component = {
    dots: BouncingDots,
    typing: TypingDots,
    wave: WaveBars,
    sparkles: MagicSparkles,
  }[variant];

  return <Component size="sm" className={className} />;
};

export default FunLoader;
