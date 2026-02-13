
import React, { useState, useId } from 'react';
import { ValidationResult, ValidationIssue, FoundationPageType } from '../../types';
import { Modal } from '../ui/Modal';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { Loader } from '../ui/Loader';
import { InfoTooltip } from '../ui/InfoTooltip';

interface ValidationResultModalProps {
  isOpen: boolean;
  onClose: () => void;
  result: ValidationResult | null;
  onImproveMap: (issues: ValidationIssue[], options?: { includeTypeReclassifications?: boolean }) => void;
  isImprovingMap: boolean;
  onRepairFoundation?: (missingPages: FoundationPageType[]) => void;
  isRepairingFoundation?: boolean;
  onRepairNavigation?: () => void;
  isRepairingNavigation?: boolean;
}

const getSeverityStyles = (severity: ValidationIssue['severity']) => {
    switch (severity) {
        case 'CRITICAL':
            return 'border-red-500 bg-red-900/20 text-red-300';
        case 'WARNING':
            return 'border-yellow-500 bg-yellow-900/20 text-yellow-300';
        case 'SUGGESTION':
            return 'border-blue-500 bg-blue-900/20 text-blue-300';
        default:
            return 'border-gray-600 bg-gray-900/20 text-gray-300';
    }
};

const ValidationResultModal: React.FC<ValidationResultModalProps> = ({
  isOpen,
  onClose,
  result,
  onImproveMap,
  isImprovingMap,
  onRepairFoundation,
  isRepairingFoundation,
  onRepairNavigation,
  isRepairingNavigation
}) => {
  const [activeTab, setActiveTab] = useState<'issues' | 'metrics' | 'foundation' | 'navigation'>('issues');
  const [includeTypeReclassifications, setIncludeTypeReclassifications] = useState(true);
  const tabIdPrefix = useId();

  const hasCriticalIssues = result?.issues.some(i => i.severity === 'CRITICAL');

  // Tab configuration
  const tabs = [
    { id: 'issues', label: 'Validation Issues', show: true, color: 'blue', badge: undefined as string | number | undefined },
    { id: 'metrics', label: 'Holistic Quality Metrics', show: !!result?.metrics, color: 'blue', badge: undefined as string | number | undefined },
    { id: 'foundation', label: 'Foundation Pages', show: !!result?.foundationPageIssues, color: 'purple',
      badge: result?.foundationPageIssues && (result.foundationPageIssues.missingPages.length + result.foundationPageIssues.incompletePages.length) > 0
        ? result.foundationPageIssues.missingPages.length + result.foundationPageIssues.incompletePages.length : undefined },
    { id: 'navigation', label: 'Navigation', show: !!result?.navigationIssues, color: 'teal',
      badge: result?.navigationIssues && (result.navigationIssues.missingInHeader.length > 0 || result.navigationIssues.missingInFooter.length > 0) ? '!' : undefined }
  ];

  const visibleTabs = tabs.filter(t => t.show);

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Topical Map Validation Report"
      description="View validation issues, quality metrics, foundation pages, and navigation structure for your topical map"
      maxWidth="max-w-4xl"
      footer={<Button onClick={onClose} variant="secondary">Close</Button>}
    >
          {!result ? (
            <p className="text-gray-400 text-center py-10">No validation data available.</p>
          ) : (
            <div className="space-y-6">
                <div className="flex items-center justify-between mb-4">
                     <div className="flex space-x-4 flex-wrap" role="tablist" aria-label="Validation sections">
                        {visibleTabs.map(tab => (
                          <button
                            key={tab.id}
                            role="tab"
                            id={`${tabIdPrefix}-tab-${tab.id}`}
                            aria-selected={activeTab === tab.id}
                            aria-controls={`${tabIdPrefix}-panel-${tab.id}`}
                            onClick={() => setActiveTab(tab.id as typeof activeTab)}
                            className={`pb-2 border-b-2 transition-colors ${
                              activeTab === tab.id
                                ? `border-${tab.color}-500 text-white`
                                : 'border-transparent text-gray-400 hover:text-gray-300'
                            }`}
                          >
                            {tab.label}
                            {tab.badge && (
                              <span className={`ml-1 px-1.5 py-0.5 text-xs bg-${tab.color}-500/30 text-${tab.color}-300 rounded-full`}>
                                {tab.badge}
                              </span>
                            )}
                          </button>
                        ))}
                    </div>
                    <div className="text-right">
                        <p className="text-gray-400 text-xs uppercase tracking-wider">Quality Score</p>
                        <p className={`text-3xl font-bold ${result.overallScore > 80 ? 'text-green-400' : result.overallScore > 50 ? 'text-yellow-400' : 'text-red-400'}`}>
                            {result.overallScore}/100
                        </p>
                    </div>
                </div>
                
                {/* Tab Content */}
                <div
                  role="tabpanel"
                  id={`${tabIdPrefix}-panel-${activeTab}`}
                  aria-labelledby={`${tabIdPrefix}-tab-${activeTab}`}
                >
                {activeTab === 'issues' && (
                    <>
                        <Card className="p-4 bg-gray-900/50 mb-6">
                             <p className="text-gray-300 italic">{result.summary}</p>
                        </Card>

                        {result.issues.length > 0 ? (
                            <div>
                                <h4 className="text-md font-semibold text-white mb-2">Actionable Feedback:</h4>
                                <div className="space-y-3">
                                    {result.issues.map((issue, index) => (
                                        <div key={index} className={`p-4 border-l-4 rounded-r-lg ${getSeverityStyles(issue.severity)}`}>
                                            <div className='flex justify-between items-start'>
                                                <p className="font-semibold">{issue.rule}</p>
                                                <span className="text-[10px] uppercase tracking-wider font-bold opacity-70">{issue.severity}</span>
                                            </div>
                                            <p className="text-sm mt-1">{issue.message}</p>
                                            {issue.offendingTopics && issue.offendingTopics.length > 0 && (
                                                <div className="mt-2 flex flex-wrap gap-1">
                                                    {issue.offendingTopics.map(t => (
                                                        <span key={t} className="text-[10px] px-2 py-0.5 bg-black/20 rounded text-current opacity-80">{t}</span>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </div>
                                <div className="mt-6 pt-6 border-t border-gray-700">
                                    <h4 className="text-md font-semibold text-white mb-2 text-center">AI-Powered Improvement</h4>
                                    <p className="text-sm text-gray-400 mb-4 text-center">Let the AI attempt to fix these issues by adding, removing, or modifying topics.</p>

                                    {/* Type Reclassification Option */}
                                    <div className="flex items-center justify-center gap-2 mb-4">
                                        <input
                                            type="checkbox"
                                            id="includeTypeReclassifications"
                                            checked={includeTypeReclassifications}
                                            onChange={(e) => setIncludeTypeReclassifications(e.target.checked)}
                                            className="w-4 h-4 text-blue-600 bg-gray-700 border-gray-600 rounded focus:ring-blue-500"
                                        />
                                        <label htmlFor="includeTypeReclassifications" className="text-sm text-gray-300">
                                            Include type reclassifications (core ↔ outer)
                                        </label>
                                        <InfoTooltip text="When enabled, the AI will also suggest changing topic types (e.g., demoting location variants from 'core' to 'outer'). Disable if you want to keep the current hierarchy structure." />
                                    </div>

                                    <div className="flex justify-center gap-4">
                                        {hasCriticalIssues && (
                                            <Button
                                                onClick={() => onImproveMap(result.issues.filter(i => i.severity === 'CRITICAL'), { includeTypeReclassifications })}
                                                disabled={isImprovingMap}
                                                variant="secondary"
                                                className="bg-red-900/40 hover:bg-red-800/40 text-red-200"
                                            >
                                                {isImprovingMap ? <Loader className="w-4 h-4"/> : 'Fix Critical Issues Only'}
                                            </Button>
                                        )}
                                        <Button
                                            onClick={() => onImproveMap(result.issues, { includeTypeReclassifications })}
                                            disabled={isImprovingMap}
                                        >
                                            {isImprovingMap ? <Loader className="w-4 h-4"/> : 'Fix All Issues'}
                                        </Button>
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <div className="p-4 rounded-lg bg-green-900/30 border-l-4 border-green-500 text-center">
                                <p className="font-semibold text-green-300">Excellent Work!</p>
                                <p className="text-green-400/80">No structural issues found in your topical map.</p>
                            </div>
                        )}
                    </>
                )}

                {activeTab === 'metrics' && result.metrics && (
                    <div className="space-y-8">
                        {/* Hub-Spoke Metric */}
                        <div>
                            <h3 className="text-lg font-semibold text-white flex items-center">
                                Hub-Spoke Efficiency (1:5 Rule)
                                <InfoTooltip text="Holistic SEO recommends ~3–5 supporting articles for every Core Topic to establish authority without dilution. Minimum 3, maximum 12." />
                            </h3>
                            <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-3">
                                {result.metrics.hubSpoke.map(hub => (
                                    <div key={hub.hubId} className={`p-3 rounded border ${hub.status === 'OPTIMAL' ? 'border-green-600 bg-green-900/10' : hub.status === 'DILUTED' ? 'border-yellow-600 bg-yellow-900/10' : 'border-red-600 bg-red-900/10'}`}>
                                        <div className="flex justify-between items-center mb-1">
                                            <span className="font-medium text-gray-200">{hub.hubTitle}</span>
                                            <span className={`text-xs font-bold px-2 py-0.5 rounded ${hub.status === 'OPTIMAL' ? 'bg-green-500/20 text-green-300' : hub.status === 'DILUTED' ? 'bg-yellow-500/20 text-yellow-300' : 'bg-red-500/20 text-red-300'}`}>
                                                {hub.status === 'UNDER_SUPPORTED' ? 'WEAK' : hub.status}
                                            </span>
                                        </div>
                                        <div className="w-full bg-gray-700 h-2 rounded-full overflow-hidden mt-2">
                                            <div
                                                className={`h-full ${hub.status === 'OPTIMAL' ? 'bg-green-500' : hub.status === 'DILUTED' ? 'bg-yellow-500' : 'bg-red-500'}`}
                                                style={{ width: `${Math.min(100, (hub.spokeCount / 5) * 100)}%` }}
                                            ></div>
                                        </div>
                                        <p className="text-xs text-gray-400 mt-1 text-right">{hub.spokeCount} / 5 Spokes</p>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Anchor Text Diversity */}
                         <div>
                            <h3 className="text-lg font-semibold text-white flex items-center">
                                Anchor Text Diversity
                                <InfoTooltip text="Repeated exact-match anchor text (>3 times) across briefs can trigger over-optimization penalties." />
                            </h3>
                            <div className="mt-3 overflow-x-auto">
                                <table className="w-full text-sm text-left text-gray-400">
                                    <thead className="text-xs text-gray-300 uppercase bg-gray-700">
                                        <tr>
                                            <th className="px-4 py-2">Anchor Text</th>
                                            <th className="px-4 py-2 text-center">Count</th>
                                            <th className="px-4 py-2 text-right">Status</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {result.metrics.anchorText.slice(0, 5).map((item, idx) => (
                                            <tr key={idx} className="border-b border-gray-700 hover:bg-gray-700/50">
                                                <td className="px-4 py-2 text-white">{item.anchorText}</td>
                                                <td className="px-4 py-2 text-center">{item.count}</td>
                                                <td className="px-4 py-2 text-right">
                                                    {item.isRepetitive ? (
                                                        <span className="text-red-400 font-bold text-xs">Risk</span>
                                                    ) : (
                                                        <span className="text-green-400 text-xs">Safe</span>
                                                    )}
                                                </td>
                                            </tr>
                                        ))}
                                        {result.metrics.anchorText.length === 0 && (
                                            <tr>
                                                <td colSpan={3} className="px-4 py-4 text-center italic">No internal links analyzed yet.</td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>

                        {/* Content Freshness */}
                        {result.metrics.contentFreshness.length > 0 && (
                             <div>
                                <h3 className="text-lg font-semibold text-white">Stale Content (Decay Audit)</h3>
                                <p className="text-sm text-gray-400 mb-3">Topics that require updates based on their freshness profile.</p>
                                <div className="space-y-2">
                                    {result.metrics.contentFreshness.map(f => (
                                        <div key={f.topicId} className="flex justify-between items-center bg-red-900/10 border border-red-900/30 p-2 rounded">
                                            <span className="text-sm text-gray-300">{f.title}</span>
                                            <div className="flex items-center gap-3">
                                                <span className="text-xs text-gray-500">{f.freshness}</span>
                                                <span className="text-xs font-bold text-red-400">{f.decayScore}% Health</span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {/* Foundation Pages Tab */}
                {activeTab === 'foundation' && result.foundationPageIssues && (
                    <div className="space-y-6">
                        <Card className="p-4 bg-gray-900/50">
                            <p className="text-gray-300">
                                Foundation pages establish trust, authority, and legal compliance.
                                These pages are essential for E-E-A-T signals and user experience.
                            </p>
                        </Card>

                        {/* Missing Pages */}
                        {result.foundationPageIssues.missingPages.length > 0 && (
                            <div>
                                <h3 className="text-lg font-semibold text-red-400 mb-3">Missing Foundation Pages</h3>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                    {result.foundationPageIssues.missingPages.map(pageType => (
                                        <div key={pageType} className="p-3 rounded border border-red-600 bg-red-900/10">
                                            <div className="flex items-center gap-2">
                                                <span className="text-red-400 text-lg">⚠</span>
                                                <span className="font-medium text-gray-200 capitalize">{pageType.replace('_', ' ')}</span>
                                            </div>
                                            <p className="text-xs text-gray-400 mt-1">
                                                {pageType === 'homepage' && 'Your main entry point - critical for first impressions and SEO.'}
                                                {pageType === 'about' && 'Establishes E-E-A-T by showcasing expertise and authority.'}
                                                {pageType === 'contact' && 'Required for trust signals and local SEO (NAP data).'}
                                                {pageType === 'privacy' && 'Legal requirement for GDPR/CCPA compliance.'}
                                                {pageType === 'terms' && 'Protects your business and sets user expectations.'}
                                                {pageType === 'author' && 'Supports E-E-A-T by highlighting content creators.'}
                                            </p>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Incomplete Pages */}
                        {result.foundationPageIssues.incompletePages.length > 0 && (
                            <div>
                                <h3 className="text-lg font-semibold text-yellow-400 mb-3">Incomplete Foundation Pages</h3>
                                <div className="space-y-3">
                                    {result.foundationPageIssues.incompletePages.map(page => (
                                        <div key={page.pageType} className="p-3 rounded border border-yellow-600 bg-yellow-900/10">
                                            <div className="flex justify-between items-start">
                                                <span className="font-medium text-gray-200 capitalize">{page.pageType.replace('_', ' ')}</span>
                                                <span className="text-xs bg-yellow-500/20 text-yellow-300 px-2 py-0.5 rounded">
                                                    {page.missingFields.length} missing field{page.missingFields.length > 1 ? 's' : ''}
                                                </span>
                                            </div>
                                            <div className="mt-2 flex flex-wrap gap-1">
                                                {page.missingFields.map(field => (
                                                    <span key={field} className="text-xs px-2 py-0.5 bg-black/20 rounded text-yellow-300/80">
                                                        {field.replace('_', ' ')}
                                                    </span>
                                                ))}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Suggestions */}
                        {result.foundationPageIssues.suggestions.length > 0 && (
                            <div>
                                <h3 className="text-lg font-semibold text-blue-400 mb-3">Suggestions</h3>
                                <ul className="space-y-2">
                                    {result.foundationPageIssues.suggestions.map((suggestion, idx) => (
                                        <li key={idx} className="flex items-start gap-2 text-sm text-gray-300">
                                            <span className="text-blue-400">→</span>
                                            {suggestion}
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        )}

                        {/* Repair Button */}
                        {result.foundationPageIssues.missingPages.length > 0 && onRepairFoundation && (
                            <div className="mt-6 pt-6 border-t border-gray-700">
                                <h4 className="text-md font-semibold text-white mb-2 text-center">AI-Powered Repair</h4>
                                <p className="text-sm text-gray-400 mb-4 text-center">
                                    Generate the missing foundation pages using AI based on your business information.
                                </p>
                                <div className="flex justify-center">
                                    <Button
                                        onClick={() => onRepairFoundation(result.foundationPageIssues!.missingPages)}
                                        disabled={isRepairingFoundation}
                                        className="bg-purple-600 hover:bg-purple-500"
                                    >
                                        {isRepairingFoundation ? <Loader className="w-4 h-4" /> : `Generate ${result.foundationPageIssues.missingPages.length} Missing Page${result.foundationPageIssues.missingPages.length > 1 ? 's' : ''}`}
                                    </Button>
                                </div>
                            </div>
                        )}

                        {/* All Good State */}
                        {result.foundationPageIssues.missingPages.length === 0 &&
                         result.foundationPageIssues.incompletePages.length === 0 && (
                            <div className="p-4 rounded-lg bg-green-900/30 border-l-4 border-green-500 text-center">
                                <p className="font-semibold text-green-300">Foundation Pages Complete!</p>
                                <p className="text-green-400/80">All required foundation pages are configured.</p>
                            </div>
                        )}
                    </div>
                )}

                {/* Navigation Tab */}
                {activeTab === 'navigation' && result.navigationIssues && (
                    <div className="space-y-6">
                        <Card className="p-4 bg-gray-900/50">
                            <p className="text-gray-300">
                                Navigation structure affects crawlability, user experience, and link equity distribution.
                                Follow best practices for header (max 10 links) and footer (max 30 links) navigation.
                            </p>
                        </Card>

                        {/* Header Navigation */}
                        <div>
                            <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                                Header Navigation
                                <span className={`text-xs px-2 py-0.5 rounded ${
                                    result.navigationIssues.headerLinkCount <= result.navigationIssues.headerLinkLimit
                                        ? 'bg-green-500/20 text-green-300'
                                        : 'bg-red-500/20 text-red-300'
                                }`}>
                                    {result.navigationIssues.headerLinkCount} / {result.navigationIssues.headerLinkLimit}
                                </span>
                            </h3>
                            <div className="mt-3">
                                <div className="w-full bg-gray-700 h-2 rounded-full overflow-hidden">
                                    <div
                                        className={`h-full transition-all ${
                                            result.navigationIssues.headerLinkCount <= result.navigationIssues.headerLinkLimit
                                                ? 'bg-green-500'
                                                : 'bg-red-500'
                                        }`}
                                        style={{ width: `${Math.min(100, (result.navigationIssues.headerLinkCount / result.navigationIssues.headerLinkLimit) * 100)}%` }}
                                    ></div>
                                </div>
                                {result.navigationIssues.missingInHeader.length > 0 && (
                                    <div className="mt-3 p-3 rounded border border-yellow-600 bg-yellow-900/10">
                                        <p className="text-sm text-yellow-300 mb-2">Missing recommended links:</p>
                                        <div className="flex flex-wrap gap-1">
                                            {result.navigationIssues.missingInHeader.map(link => (
                                                <span key={link} className="text-xs px-2 py-0.5 bg-yellow-500/20 rounded text-yellow-300">
                                                    {link}
                                                </span>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Footer Navigation */}
                        <div>
                            <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                                Footer Navigation
                                <span className={`text-xs px-2 py-0.5 rounded ${
                                    result.navigationIssues.footerLinkCount <= result.navigationIssues.footerLinkLimit
                                        ? 'bg-green-500/20 text-green-300'
                                        : 'bg-red-500/20 text-red-300'
                                }`}>
                                    {result.navigationIssues.footerLinkCount} / {result.navigationIssues.footerLinkLimit}
                                </span>
                            </h3>
                            <div className="mt-3">
                                <div className="w-full bg-gray-700 h-2 rounded-full overflow-hidden">
                                    <div
                                        className={`h-full transition-all ${
                                            result.navigationIssues.footerLinkCount <= result.navigationIssues.footerLinkLimit
                                                ? 'bg-green-500'
                                                : 'bg-red-500'
                                        }`}
                                        style={{ width: `${Math.min(100, (result.navigationIssues.footerLinkCount / result.navigationIssues.footerLinkLimit) * 100)}%` }}
                                    ></div>
                                </div>
                                {result.navigationIssues.missingInFooter.length > 0 && (
                                    <div className="mt-3 p-3 rounded border border-yellow-600 bg-yellow-900/10">
                                        <p className="text-sm text-yellow-300 mb-2">Missing recommended links:</p>
                                        <div className="flex flex-wrap gap-1">
                                            {result.navigationIssues.missingInFooter.map(link => (
                                                <span key={link} className="text-xs px-2 py-0.5 bg-yellow-500/20 rounded text-yellow-300">
                                                    {link}
                                                </span>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Navigation Suggestions */}
                        {result.navigationIssues.suggestions.length > 0 && (
                            <div>
                                <h3 className="text-lg font-semibold text-blue-400 mb-3">Suggestions</h3>
                                <ul className="space-y-2">
                                    {result.navigationIssues.suggestions.map((suggestion, idx) => (
                                        <li key={idx} className="flex items-start gap-2 text-sm text-gray-300">
                                            <span className="text-blue-400">→</span>
                                            {suggestion}
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        )}

                        {/* Repair Navigation Button */}
                        {(result.navigationIssues.missingInHeader.length > 0 ||
                          result.navigationIssues.missingInFooter.length > 0) && onRepairNavigation && (
                            <div className="mt-6 pt-6 border-t border-gray-700">
                                <h4 className="text-md font-semibold text-white mb-2 text-center">AI-Powered Repair</h4>
                                <p className="text-sm text-gray-400 mb-4 text-center">
                                    Generate an optimized navigation structure based on your foundation pages and topics.
                                </p>
                                <div className="flex justify-center">
                                    <Button
                                        onClick={onRepairNavigation}
                                        disabled={isRepairingNavigation}
                                        className="bg-teal-600 hover:bg-teal-500"
                                    >
                                        {isRepairingNavigation ? <Loader className="w-4 h-4" /> : 'Regenerate Navigation Structure'}
                                    </Button>
                                </div>
                            </div>
                        )}

                        {/* All Good State */}
                        {result.navigationIssues.missingInHeader.length === 0 &&
                         result.navigationIssues.missingInFooter.length === 0 &&
                         result.navigationIssues.headerLinkCount <= result.navigationIssues.headerLinkLimit &&
                         result.navigationIssues.footerLinkCount <= result.navigationIssues.footerLinkLimit && (
                            <div className="p-4 rounded-lg bg-green-900/30 border-l-4 border-green-500 text-center">
                                <p className="font-semibold text-green-300">Navigation Structure Optimal!</p>
                                <p className="text-green-400/80">Your navigation follows best practices.</p>
                            </div>
                        )}
                    </div>
                )}
                </div>
            </div>
          )}
    </Modal>
  );
};

export default ValidationResultModal;
