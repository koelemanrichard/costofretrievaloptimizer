/**
 * Social Signals Panel Component
 * Dashboard panel for tracking social signals for Knowledge Panel building
 * Based on Kalicube methodology and Google's entity verification signals
 */

import React, { useState, useMemo } from 'react';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import type { SocialProfile, SocialPlatform, OverallSocialSignalReport } from '../../services/socialSignalsService';
import {
  PLATFORM_CONFIGS,
  calculatePlatformScore,
  generateSocialSignalReport,
  generateKPActionChecklist,
  validateSocialProfileUrl,
} from '../../services/socialSignalsService';

interface SocialSignalsPanelProps {
  entityName: string;
  entityType?: string;
  existingProfiles?: SocialProfile[];
  onProfilesChange?: (profiles: SocialProfile[]) => void;
  collapsed?: boolean;
}

/**
 * Platform icon SVG paths
 */
const PLATFORM_ICONS: Record<SocialPlatform, string> = {
  youtube: 'M23.5 6.5c-.3-1-1-1.8-2-2.1C19.9 4 12 4 12 4s-7.9 0-9.5.4c-1 .3-1.7 1.1-2 2.1C0 8.1 0 12 0 12s0 3.9.5 5.5c.3 1 1 1.8 2 2.1 1.6.4 9.5.4 9.5.4s7.9 0 9.5-.4c1-.3 1.7-1.1 2-2.1.5-1.6.5-5.5.5-5.5s0-3.9-.5-5.5zM9.5 15.5v-7l6.5 3.5-6.5 3.5z',
  twitter: 'M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z',
  linkedin: 'M20.5 2h-17A1.5 1.5 0 002 3.5v17A1.5 1.5 0 003.5 22h17a1.5 1.5 0 001.5-1.5v-17A1.5 1.5 0 0020.5 2zM8 19H5v-9h3zM6.5 8.25A1.75 1.75 0 118.3 6.5a1.78 1.78 0 01-1.8 1.75zM19 19h-3v-4.74c0-1.42-.6-1.93-1.38-1.93A1.74 1.74 0 0013 14.19a.66.66 0 000 .14V19h-3v-9h2.9v1.3a3.11 3.11 0 012.7-1.4c1.55 0 3.36.86 3.36 3.66z',
  facebook: 'M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z',
  instagram: 'M12 2c2.717 0 3.056.01 4.122.06 1.065.05 1.79.217 2.428.465.66.254 1.216.598 1.772 1.153a4.908 4.908 0 011.153 1.772c.247.637.415 1.363.465 2.428.047 1.066.06 1.405.06 4.122s-.01 3.056-.06 4.122c-.05 1.065-.218 1.79-.465 2.428a4.883 4.883 0 01-1.153 1.772 4.915 4.915 0 01-1.772 1.153c-.637.247-1.363.415-2.428.465-1.066.047-1.405.06-4.122.06s-3.056-.01-4.122-.06c-1.065-.05-1.79-.218-2.428-.465a4.89 4.89 0 01-1.772-1.153 4.904 4.904 0 01-1.153-1.772c-.248-.637-.415-1.363-.465-2.428C2.013 15.056 2 14.717 2 12s.01-3.056.06-4.122c.05-1.066.217-1.79.465-2.428a4.88 4.88 0 011.153-1.772A4.897 4.897 0 015.45 2.525c.638-.248 1.362-.415 2.428-.465C8.944 2.013 9.283 2 12 2zm0 1.802c-2.67 0-2.986.01-4.04.058-.976.045-1.505.207-1.858.344-.466.182-.8.398-1.15.748-.35.35-.566.683-.748 1.15-.137.353-.3.882-.344 1.857-.048 1.055-.058 1.37-.058 4.041 0 2.67.01 2.986.058 4.04.045.976.207 1.505.344 1.858.182.466.399.8.748 1.15.35.35.683.566 1.15.748.353.137.882.3 1.857.344 1.054.048 1.37.058 4.041.058 2.67 0 2.987-.01 4.04-.058.976-.045 1.505-.207 1.858-.344.466-.182.8-.398 1.15-.748.35-.35.566-.683.748-1.15.137-.353.3-.882.344-1.857.048-1.055.058-1.37.058-4.041 0-2.67-.01-2.986-.058-4.04-.045-.976-.207-1.505-.344-1.858a3.097 3.097 0 00-.748-1.15 3.098 3.098 0 00-1.15-.748c-.353-.137-.882-.3-1.857-.344-1.055-.048-1.37-.058-4.041-.058zm0 3.063a5.135 5.135 0 110 10.27 5.135 5.135 0 010-10.27zm0 8.468a3.333 3.333 0 100-6.666 3.333 3.333 0 000 6.666zm6.538-8.671a1.2 1.2 0 11-2.4 0 1.2 1.2 0 012.4 0z',
  tiktok: 'M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-5.2 1.74 2.89 2.89 0 012.31-4.64 2.93 2.93 0 01.88.13V9.4a6.84 6.84 0 00-1-.05A6.33 6.33 0 005 20.1a6.34 6.34 0 0010.86-4.43v-7a8.16 8.16 0 004.77 1.52v-3.4a4.85 4.85 0 01-1-.1z',
  pinterest: 'M12 0C5.373 0 0 5.372 0 12c0 5.084 3.163 9.426 7.627 11.174-.105-.949-.2-2.405.042-3.441.218-.937 1.407-5.965 1.407-5.965s-.359-.719-.359-1.782c0-1.668.967-2.914 2.171-2.914 1.023 0 1.518.769 1.518 1.69 0 1.029-.655 2.568-.994 3.995-.283 1.194.599 2.169 1.777 2.169 2.133 0 3.772-2.249 3.772-5.495 0-2.873-2.064-4.882-5.012-4.882-3.414 0-5.418 2.561-5.418 5.207 0 1.031.397 2.138.893 2.738a.36.36 0 01.083.345l-.333 1.36c-.053.22-.174.267-.402.161-1.499-.698-2.436-2.889-2.436-4.649 0-3.785 2.75-7.262 7.929-7.262 4.163 0 7.398 2.967 7.398 6.931 0 4.136-2.607 7.464-6.227 7.464-1.216 0-2.359-.631-2.75-1.378l-.748 2.853c-.271 1.043-1.002 2.35-1.492 3.146C9.57 23.812 10.763 24 12 24c6.627 0 12-5.373 12-12 0-6.628-5.373-12-12-12z',
  github: 'M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12',
  medium: 'M13.54 12a6.8 6.8 0 01-6.77 6.82A6.8 6.8 0 010 12a6.8 6.8 0 016.77-6.82A6.8 6.8 0 0113.54 12zM20.96 12c0 3.54-1.51 6.42-3.38 6.42-1.87 0-3.39-2.88-3.39-6.42s1.52-6.42 3.39-6.42 3.38 2.88 3.38 6.42M24 12c0 3.17-.53 5.75-1.19 5.75-.66 0-1.19-2.58-1.19-5.75s.53-5.75 1.19-5.75C23.47 6.25 24 8.83 24 12z',
  quora: 'M18.99 18.5c.67.83 1.36 1.5 2.01 1.5.34 0 .68-.11.99-.5l-.01-.01c.31.4.62.8.88 1.15-.49.66-1.26 1.36-2.49 1.36-1.23 0-2.15-.66-2.92-1.49-.61.27-1.3.49-2.09.49-4.05 0-6.87-3.32-6.87-7.5C8.49 8.83 11.31 5.5 15.36 5.5c4.05 0 6.87 3.32 6.87 7.5 0 2.28-.79 4.28-2.07 5.71l-1.17-.21zm-3.63-1.99c-.73-1.27-1.54-2.77-2.53-4.32.24-.07.49-.09.77-.09 1.31 0 2.43.58 3.16 1.46.67-.88.99-2.05.99-3.56 0-2.73-1.32-4.99-3.39-4.99-2.08 0-3.4 2.26-3.4 4.99 0 2.73 1.32 4.99 3.4 4.99.35 0 .68-.06 1-.16v1.68z',
};

/**
 * Get color for KP readiness status
 */
function getKPReadinessColor(status: OverallSocialSignalReport['kpReadiness']): string {
  switch (status) {
    case 'strong': return 'text-green-400 bg-green-900/30';
    case 'ready': return 'text-blue-400 bg-blue-900/30';
    case 'building': return 'text-amber-400 bg-amber-900/30';
    default: return 'text-red-400 bg-red-900/30';
  }
}

/**
 * Score bar component
 */
const ScoreBar: React.FC<{ score: number; maxScore?: number; color?: string }> = ({
  score,
  maxScore = 100,
  color = 'bg-blue-500'
}) => (
  <div className="h-2 bg-gray-700 rounded-full overflow-hidden">
    <div
      className={`h-full ${color} transition-all duration-300`}
      style={{ width: `${(score / maxScore) * 100}%` }}
    />
  </div>
);

/**
 * Platform score card
 */
const PlatformScoreCard: React.FC<{
  profile: SocialProfile;
  score: ReturnType<typeof calculatePlatformScore>;
  onEdit?: () => void;
}> = ({ profile, score, onEdit }) => {
  const config = PLATFORM_CONFIGS.find(p => p.id === profile.platform);
  const [showFactors, setShowFactors] = useState(false);

  const scoreColor = score.score >= 70 ? 'bg-green-500' :
                     score.score >= 40 ? 'bg-amber-500' : 'bg-red-500';

  return (
    <div className="p-3 bg-gray-800/50 rounded-lg border border-gray-700">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <svg className="w-5 h-5 text-gray-300" viewBox="0 0 24 24" fill="currentColor">
            <path d={PLATFORM_ICONS[profile.platform]} />
          </svg>
          <span className="text-sm font-medium text-white">{config?.name}</span>
          {profile.verified && (
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-blue-900/50 text-blue-300">
              Verified
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm font-bold text-white">{score.score}</span>
          <button
            onClick={() => setShowFactors(!showFactors)}
            className="text-xs text-gray-400 hover:text-white"
          >
            {showFactors ? 'Hide' : 'Details'}
          </button>
        </div>
      </div>

      <ScoreBar score={score.score} color={scoreColor} />

      {showFactors && (
        <div className="mt-3 space-y-2">
          {score.factors.map((factor, i) => (
            <div key={i} className="flex items-center justify-between text-xs">
              <div className="flex items-center gap-2">
                <span className={factor.achieved ? 'text-green-400' : 'text-gray-500'}>
                  {factor.achieved ? '\u2713' : '\u2717'}
                </span>
                <span className={factor.achieved ? 'text-gray-300' : 'text-gray-500'}>
                  {factor.name}
                </span>
              </div>
              <span className="text-gray-500">+{factor.weight}</span>
            </div>
          ))}

          {score.recommendations.length > 0 && (
            <div className="mt-2 pt-2 border-t border-gray-700">
              <p className="text-xs text-amber-400 mb-1">Recommendations:</p>
              <ul className="text-xs text-gray-400 space-y-1">
                {score.recommendations.slice(0, 2).map((rec, i) => (
                  <li key={i} className="flex items-start gap-1">
                    <span className="text-amber-500 mt-0.5">-</span>
                    {rec}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

/**
 * Add profile form
 */
const AddProfileForm: React.FC<{
  onAdd: (profile: Omit<SocialProfile, 'url'> & { url: string }) => void;
  onCancel: () => void;
}> = ({ onAdd, onCancel }) => {
  const [platform, setPlatform] = useState<SocialPlatform>('linkedin');
  const [url, setUrl] = useState('');
  const [username, setUsername] = useState('');
  const [verified, setVerified] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!url.trim()) {
      setError('Profile URL is required');
      return;
    }

    const validation = validateSocialProfileUrl(url);
    if (!validation.valid) {
      setError(validation.error || 'Invalid URL format');
      return;
    }

    onAdd({
      platform: validation.platform || platform,
      url: url.trim(),
      username: username.trim() || url.split('/').pop() || '',
      verified,
    });
  };

  return (
    <form onSubmit={handleSubmit} className="p-3 bg-gray-800 rounded-lg border border-gray-600 space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1">
          <label className="text-xs text-gray-400">Platform</label>
          <select
            value={platform}
            onChange={(e) => setPlatform(e.target.value as SocialPlatform)}
            className="w-full bg-gray-900 border border-gray-600 rounded px-3 py-2 text-white text-sm focus:border-blue-500 focus:outline-none"
          >
            {PLATFORM_CONFIGS.map(p => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
        </div>
        <div className="space-y-1">
          <label className="text-xs text-gray-400">Username/Handle</label>
          <input
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="@username"
            className="w-full bg-gray-900 border border-gray-600 rounded px-3 py-2 text-white text-sm focus:border-blue-500 focus:outline-none"
          />
        </div>
      </div>

      <div className="space-y-1">
        <label className="text-xs text-gray-400">Profile URL</label>
        <input
          type="url"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="https://linkedin.com/company/..."
          className="w-full bg-gray-900 border border-gray-600 rounded px-3 py-2 text-white text-sm focus:border-blue-500 focus:outline-none"
          required
        />
      </div>

      <label className="flex items-center gap-2 text-sm text-gray-400">
        <input
          type="checkbox"
          checked={verified}
          onChange={(e) => setVerified(e.target.checked)}
          className="rounded border-gray-600"
        />
        Account is verified
      </label>

      {error && (
        <p className="text-xs text-red-400">{error}</p>
      )}

      <div className="flex justify-end gap-2">
        <Button onClick={onCancel} variant="secondary" type="button" className="text-sm">
          Cancel
        </Button>
        <Button type="submit" variant="primary" className="text-sm">
          Add Profile
        </Button>
      </div>
    </form>
  );
};

/**
 * Main Social Signals Panel
 */
export const SocialSignalsPanel: React.FC<SocialSignalsPanelProps> = ({
  entityName,
  entityType = 'organization',
  existingProfiles = [],
  onProfilesChange,
  collapsed = false,
}) => {
  const [profiles, setProfiles] = useState<SocialProfile[]>(existingProfiles);
  const [showAddForm, setShowAddForm] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(collapsed);

  // Generate full report
  const report = useMemo(() => {
    return generateSocialSignalReport(profiles);
  }, [profiles]);

  // Generate action checklist
  const checklist = useMemo(() => {
    return generateKPActionChecklist(profiles, entityType);
  }, [entityType, profiles]);

  // Calculate individual platform scores
  const platformScores = useMemo(() => {
    return profiles.map(profile => ({
      profile,
      score: calculatePlatformScore(profile.platform, profile),
    }));
  }, [profiles]);

  const handleAddProfile = (profile: SocialProfile) => {
    const newProfiles = [...profiles, profile];
    setProfiles(newProfiles);
    onProfilesChange?.(newProfiles);
    setShowAddForm(false);
  };

  const handleRemoveProfile = (platform: SocialPlatform) => {
    const newProfiles = profiles.filter(p => p.platform !== platform);
    setProfiles(newProfiles);
    onProfilesChange?.(newProfiles);
  };

  return (
    <Card className="border-gray-700">
      {/* Header */}
      <div
        className="p-4 flex justify-between items-center cursor-pointer border-b border-gray-700"
        onClick={() => setIsCollapsed(!isCollapsed)}
      >
        <div>
          <h3 className="text-sm font-semibold text-white flex items-center gap-2">
            Social Signals
            <span className={`text-xs px-2 py-0.5 rounded ${getKPReadinessColor(report.kpReadiness)}`}>
              {report.kpReadiness === 'not-ready' ? 'Not Ready' :
               report.kpReadiness === 'building' ? 'Building' :
               report.kpReadiness === 'ready' ? 'Ready' : 'Strong'}
            </span>
          </h3>
          <p className="text-xs text-gray-400 mt-0.5">
            Knowledge Panel eligibility signals
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="text-right">
            <span className="text-2xl font-bold text-white">{report.totalScore}</span>
            <span className="text-xs text-gray-500">/100</span>
          </div>
          <span className="text-gray-500 text-sm">{isCollapsed ? '\u25BC' : '\u25B2'}</span>
        </div>
      </div>

      {!isCollapsed && (
        <div className="p-4 space-y-4">
          {/* Overall Score Bar */}
          <div>
            <div className="flex justify-between text-xs text-gray-400 mb-1">
              <span>Overall Signal Strength</span>
              <span>{report.totalScore}%</span>
            </div>
            <ScoreBar
              score={report.totalScore}
              color={report.totalScore >= 70 ? 'bg-green-500' :
                     report.totalScore >= 40 ? 'bg-amber-500' : 'bg-red-500'}
            />
          </div>

          {/* Platform Scores */}
          {platformScores.length > 0 && (
            <div className="space-y-2">
              <h4 className="text-xs text-gray-400 uppercase tracking-wide">Connected Platforms</h4>
              <div className="grid grid-cols-1 gap-2">
                {platformScores.map(({ profile, score }) => (
                  <PlatformScoreCard
                    key={profile.platform}
                    profile={profile}
                    score={score}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Missing Critical Signals */}
          {report.missingCriticalSignals.length > 0 && (
            <div className="p-3 bg-red-900/20 rounded-lg border border-red-700/30">
              <h4 className="text-xs text-red-400 font-medium mb-2">Missing Critical Signals</h4>
              <ul className="text-xs text-gray-400 space-y-1">
                {report.missingCriticalSignals.map((signal, i) => (
                  <li key={i} className="flex items-start gap-2">
                    <span className="text-red-400 mt-0.5">!</span>
                    {signal}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Action Checklist */}
          {checklist.length > 0 && (
            <div className="space-y-2">
              <h4 className="text-xs text-gray-400 uppercase tracking-wide">Action Checklist</h4>
              <div className="space-y-1">
                {checklist.slice(0, 5).map((item, i) => (
                  <div
                    key={i}
                    className={`flex items-start gap-2 p-2 rounded text-xs ${
                      item.completed ? 'bg-green-900/20 text-gray-400' : 'bg-gray-800/50 text-white'
                    }`}
                  >
                    <span className={item.completed ? 'text-green-400' : 'text-gray-500'}>
                      {item.completed ? '\u2713' : '\u25A1'}
                    </span>
                    <div className="flex-1">
                      <span className={item.completed ? 'line-through' : ''}>{item.action}</span>
                    </div>
                    <span className={`px-1.5 py-0.5 rounded text-[10px] ${
                      item.priority === 'high' ? 'bg-red-900/50 text-red-300' :
                      item.priority === 'medium' ? 'bg-amber-900/50 text-amber-300' :
                      'bg-gray-700 text-gray-400'
                    }`}>
                      {item.priority}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Add Profile Form */}
          {showAddForm ? (
            <AddProfileForm
              onAdd={handleAddProfile}
              onCancel={() => setShowAddForm(false)}
            />
          ) : (
            <Button
              onClick={() => setShowAddForm(true)}
              variant="secondary"
              className="w-full text-sm"
            >
              + Add Social Profile
            </Button>
          )}

          {/* Recommendations */}
          {report.recommendations.length > 0 && (
            <div className="p-3 bg-blue-900/20 rounded-lg border border-blue-700/30">
              <h4 className="text-xs text-blue-400 font-medium mb-2">Top Recommendations</h4>
              <ul className="text-xs text-gray-400 space-y-1">
                {report.recommendations.slice(0, 3).map((rec, i) => (
                  <li key={i} className="flex items-start gap-2">
                    <span className="text-blue-400 mt-0.5">-</span>
                    {rec}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </Card>
  );
};

export default SocialSignalsPanel;
