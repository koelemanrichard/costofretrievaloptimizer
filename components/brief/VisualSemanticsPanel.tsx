/**
 * Visual Semantics Panel Component
 * Displays image optimization specifications based on Koray's
 * "Pixels, Letters, and Bytes" framework
 */

import React, { useState, useMemo } from 'react';
import type { ContentBrief, BriefVisualSemantics, VisualSemanticAnalysis } from '../../types';
import {
  analyzeImageRequirements,
  validateBriefVisualSemantics,
  generateBriefImageHTML,
} from '../../services/visualSemanticsService';
import { IMAGE_FORMAT_HIERARCHY, FORMAT_DETAILS, ALT_TEXT_EXAMPLES, FILE_NAMING_EXAMPLES } from '../../config/visualSemantics';

interface VisualSemanticsPanelProps {
  brief: ContentBrief;
  searchIntent?: string;
  onCopyHTML?: (html: string) => void;
}

/**
 * Single image specification card
 */
const ImageSpecCard: React.FC<{
  id: string;
  spec: VisualSemanticAnalysis;
  isHero?: boolean;
  onCopyHTML?: (html: string) => void;
}> = ({ id, spec, isHero = false, onCopyHTML }) => {
  const [expanded, setExpanded] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleCopyHTML = () => {
    navigator.clipboard.writeText(spec.html_template);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    onCopyHTML?.(spec.html_template);
  };

  return (
    <div className={`p-3 rounded-lg border ${isHero ? 'bg-purple-900/20 border-purple-700/50' : 'bg-gray-800/50 border-gray-700'}`}>
      <div className="flex justify-between items-start mb-2">
        <div>
          <span className={`text-xs font-bold uppercase ${isHero ? 'text-purple-400' : 'text-gray-400'}`}>
            {isHero ? '🖼️ Hero Image' : `📷 ${id}`}
          </span>
          <p className="text-sm text-white mt-1">{spec.image_description}</p>
        </div>
        <button
          onClick={() => setExpanded(!expanded)}
          className="text-gray-400 hover:text-white text-sm"
        >
          {expanded ? '▲' : '▼'}
        </button>
      </div>

      {/* Core specs always visible */}
      <div className="space-y-2 text-xs">
        <div className="p-2 bg-gray-900/50 rounded">
          <p className="text-gray-400 uppercase text-[10px] font-bold">Alt Text</p>
          <p className="text-green-300 font-mono">{spec.alt_text_recommendation}</p>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div className="p-2 bg-gray-900/50 rounded">
            <p className="text-gray-400 uppercase text-[10px] font-bold">File Name</p>
            <p className="text-blue-300 font-mono text-[11px]">{spec.file_name_recommendation}</p>
          </div>
          <div className="p-2 bg-gray-900/50 rounded">
            <p className="text-gray-400 uppercase text-[10px] font-bold">Format</p>
            <p className="text-amber-300">{spec.format_recommendation.recommended_format.toUpperCase()} @ {spec.format_recommendation.max_width}px</p>
          </div>
        </div>
      </div>

      {/* Expanded details */}
      {expanded && (
        <div className="mt-3 pt-3 border-t border-gray-700 space-y-3 animate-fade-in">
          <div>
            <p className="text-gray-400 uppercase text-[10px] font-bold mb-1">Placement</p>
            <p className="text-xs text-gray-300">{spec.placement_context}</p>
          </div>

          <div>
            <p className="text-gray-400 uppercase text-[10px] font-bold mb-1">Entity Connections</p>
            <div className="flex flex-wrap gap-1">
              {spec.entity_connections.map((entity, i) => (
                <span key={i} className="px-2 py-0.5 bg-blue-900/30 text-blue-200 text-[10px] rounded">
                  {entity}
                </span>
              ))}
            </div>
          </div>

          <div>
            <p className="text-gray-400 uppercase text-[10px] font-bold mb-1">Figcaption</p>
            <p className="text-xs text-gray-300">{spec.figcaption_text}</p>
          </div>

          <div>
            <p className="text-gray-400 uppercase text-[10px] font-bold mb-1">Centerpiece Alignment</p>
            <div className="flex items-center gap-2">
              <div className="flex-1 h-2 bg-gray-700 rounded-full overflow-hidden">
                <div
                  className="h-full bg-green-500"
                  style={{ width: `${spec.centerpiece_alignment}%` }}
                />
              </div>
              <span className="text-xs text-gray-400">{spec.centerpiece_alignment}%</span>
            </div>
          </div>

          {/* HTML Template */}
          <div>
            <div className="flex justify-between items-center mb-1">
              <p className="text-gray-400 uppercase text-[10px] font-bold">HTML Template</p>
              <button
                onClick={handleCopyHTML}
                className="text-[10px] text-blue-400 hover:text-blue-300"
              >
                {copied ? '✓ Copied!' : '📋 Copy'}
              </button>
            </div>
            <pre className="p-2 bg-gray-900 rounded text-[10px] text-gray-300 overflow-x-auto">
              {spec.html_template}
            </pre>
          </div>
        </div>
      )}
    </div>
  );
};

/**
 * Image N-grams section
 */
const ImageNGramsSection: React.FC<{ ngrams: string[] }> = ({ ngrams }) => (
  <div className="p-3 bg-gray-800/50 rounded-lg border border-gray-700">
    <p className="text-xs text-gray-400 uppercase font-bold mb-2">
      Expected Image Types (SERP Analysis)
    </p>
    <div className="flex flex-wrap gap-2">
      {ngrams.map((ngram, i) => (
        <span
          key={i}
          className="px-2 py-1 bg-amber-900/30 text-amber-200 text-xs rounded border border-amber-700/50"
        >
          {ngram}
        </span>
      ))}
    </div>
    <p className="text-[10px] text-gray-500 mt-2">
      These image types currently rank in Google Images for similar queries
    </p>
  </div>
);

/**
 * Validation summary
 */
const ValidationSummary: React.FC<{
  validation: ReturnType<typeof validateBriefVisualSemantics>;
}> = ({ validation }) => {
  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-400';
    if (score >= 60) return 'text-yellow-400';
    return 'text-red-400';
  };

  return (
    <div className="p-3 bg-gray-800/50 rounded-lg border border-gray-700">
      <div className="flex justify-between items-center mb-3">
        <p className="text-xs text-gray-400 uppercase font-bold">Visual Semantics Score</p>
        <span className={`text-lg font-bold ${getScoreColor(validation.overall_score)}`}>
          {validation.overall_score}%
        </span>
      </div>

      <div className="grid grid-cols-2 gap-2 text-xs">
        <div className="flex justify-between">
          <span className="text-gray-400">Hero Image</span>
          <span className={getScoreColor(validation.hero_image_score)}>
            {validation.hero_image_score}%
          </span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-400">Section Images</span>
          <span className={getScoreColor(validation.section_images_score)}>
            {validation.section_images_score}%
          </span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-400">N-gram Alignment</span>
          <span className={getScoreColor(validation.n_gram_alignment_score)}>
            {validation.n_gram_alignment_score}%
          </span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-400">Centerpiece</span>
          <span className={getScoreColor(validation.centerpiece_alignment_score)}>
            {validation.centerpiece_alignment_score}%
          </span>
        </div>
      </div>

      {validation.issues.length > 0 && (
        <div className="mt-3 pt-3 border-t border-gray-700">
          <p className="text-[10px] text-gray-400 uppercase font-bold mb-1">Issues</p>
          <ul className="space-y-1">
            {validation.issues.slice(0, 3).map((issue, i) => (
              <li key={i} className={`text-xs ${issue.severity === 'error' ? 'text-red-400' : 'text-amber-400'}`}>
                {issue.severity === 'error' ? '❌' : '⚠️'} [{issue.image_id}] {issue.message}
              </li>
            ))}
          </ul>
        </div>
      )}

      {validation.recommendations.length > 0 && (
        <div className="mt-3 pt-3 border-t border-gray-700">
          <p className="text-[10px] text-gray-400 uppercase font-bold mb-1">Recommendations</p>
          <ul className="space-y-1">
            {validation.recommendations.map((rec, i) => (
              <li key={i} className="text-xs text-blue-300">
                💡 {rec}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};

/**
 * Best practices section
 */
const BestPractices: React.FC = () => {
  const [showExamples, setShowExamples] = useState(false);

  return (
    <div className="p-3 bg-gray-800/50 rounded-lg border border-gray-700">
      <button
        onClick={() => setShowExamples(!showExamples)}
        className="flex justify-between items-center w-full text-left"
      >
        <p className="text-xs text-gray-400 uppercase font-bold">
          📚 Best Practices
        </p>
        <span className="text-gray-400 text-sm">{showExamples ? '▲' : '▼'}</span>
      </button>

      {showExamples && (
        <div className="mt-3 space-y-4 animate-fade-in">
          {/* Alt Text Examples */}
          <div>
            <p className="text-[10px] text-gray-400 uppercase font-bold mb-2">Alt Text Examples</p>
            <div className="space-y-2">
              {ALT_TEXT_EXAMPLES.slice(0, 2).map((ex, i) => (
                <div key={i} className="text-xs">
                  <p className="text-red-400">❌ Bad: {ex.bad}</p>
                  <p className="text-green-400">✅ Good: {ex.good}</p>
                  <p className="text-gray-500 text-[10px]">{ex.explanation}</p>
                </div>
              ))}
            </div>
          </div>

          {/* File Naming Examples */}
          <div>
            <p className="text-[10px] text-gray-400 uppercase font-bold mb-2">File Naming</p>
            <div className="space-y-2">
              {FILE_NAMING_EXAMPLES.slice(0, 2).map((ex, i) => (
                <div key={i} className="text-xs">
                  <p className="text-red-400">❌ Bad: {ex.bad}</p>
                  <p className="text-green-400">✅ Good: {ex.good}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Format Hierarchy */}
          <div>
            <p className="text-[10px] text-gray-400 uppercase font-bold mb-2">Format Priority</p>
            <div className="flex items-center gap-2 text-xs">
              {IMAGE_FORMAT_HIERARCHY.map((format, i) => (
                <React.Fragment key={format}>
                  <span className={i === 0 ? 'text-green-400 font-bold' : 'text-gray-400'}>
                    {format.toUpperCase()}
                  </span>
                  {i < IMAGE_FORMAT_HIERARCHY.length - 1 && (
                    <span className="text-gray-600">→</span>
                  )}
                </React.Fragment>
              ))}
            </div>
            <p className="text-[10px] text-gray-500 mt-1">
              AVIF: 36% better compression than WebP
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

/**
 * Main component
 */
export const VisualSemanticsPanel: React.FC<VisualSemanticsPanelProps> = ({
  brief,
  searchIntent = 'informational',
  onCopyHTML,
}) => {
  // Analyze image requirements
  const visualSemantics = useMemo(
    () => analyzeImageRequirements(brief, searchIntent),
    [brief, searchIntent]
  );

  // Validate
  const validation = useMemo(
    () => validateBriefVisualSemantics(brief, visualSemantics),
    [brief, visualSemantics]
  );

  const [showAllSections, setShowAllSections] = useState(false);
  const sectionKeys = Object.keys(visualSemantics.section_images);
  const displayedSections = showAllSections ? sectionKeys : sectionKeys.slice(0, 2);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-bold text-white">Visual Semantics</h3>
          <p className="text-xs text-gray-400">
            "Pixels, Letters, and Bytes" - Image optimization specs
          </p>
        </div>
        <span className="text-xs text-gray-500">
          {visualSemantics.total_images_recommended} images recommended
        </span>
      </div>

      {/* Validation Summary */}
      <ValidationSummary validation={validation} />

      {/* Image N-grams */}
      <ImageNGramsSection ngrams={visualSemantics.image_n_grams} />

      {/* Hero Image */}
      <ImageSpecCard
        id="hero"
        spec={visualSemantics.hero_image}
        isHero
        onCopyHTML={onCopyHTML}
      />

      {/* Section Images */}
      {displayedSections.map(sectionId => (
        <ImageSpecCard
          key={sectionId}
          id={sectionId}
          spec={visualSemantics.section_images[sectionId]}
          onCopyHTML={onCopyHTML}
        />
      ))}

      {sectionKeys.length > 2 && (
        <button
          onClick={() => setShowAllSections(!showAllSections)}
          className="w-full py-2 text-xs text-blue-400 hover:text-blue-300 bg-gray-800/50 rounded border border-gray-700"
        >
          {showAllSections
            ? '▲ Show Less'
            : `▼ Show ${sectionKeys.length - 2} More Section Images`}
        </button>
      )}

      {/* Best Practices */}
      <BestPractices />

      <style>{`
        @keyframes fade-in {
          from { opacity: 0; transform: translateY(-5px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fade-in { animation: fade-in 0.2s ease-out forwards; }
      `}</style>
    </div>
  );
};

export default VisualSemanticsPanel;
