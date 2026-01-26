/**
 * Brand Component Preview
 *
 * READ-ONLY display of extracted brand components. This component enforces
 * the anti-template philosophy by showing literal HTML/CSS without any
 * editing capabilities.
 *
 * @module components/publishing/brand/BrandComponentPreview
 */

import React, { useState } from 'react';
import type { ExtractedComponent } from '../../../types/brandExtraction';

// ============================================================================
// Types
// ============================================================================

interface BrandComponentPreviewProps {
  components: ExtractedComponent[];
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Generate brand-prefixed class names from original class names
 */
const generateOurClassNames = (theirClassNames: string[]): string[] => {
  return theirClassNames.map((className) => `brand-${className}`);
};

/**
 * Truncate text with ellipsis
 */
const truncate = (text: string, maxLength: number): string => {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength).trim() + '...';
};

// ============================================================================
// Sub-Components
// ============================================================================

interface ComponentListItemProps {
  component: ExtractedComponent;
  isSelected: boolean;
  onClick: () => void;
}

const ComponentListItem: React.FC<ComponentListItemProps> = ({
  component,
  isSelected,
  onClick,
}) => {
  const displayType = component.componentType || 'Component';
  const firstThreeClasses = component.theirClassNames.slice(0, 3);

  return (
    <button
      type="button"
      onClick={onClick}
      className={`w-full text-left p-3 rounded-lg border transition-colors ${
        isSelected
          ? 'bg-zinc-700 border-blue-500'
          : 'bg-zinc-800 border-zinc-700 hover:border-zinc-600'
      }`}
    >
      <div className="font-medium text-zinc-200 text-sm">{displayType}</div>
      <p className="text-xs text-zinc-400 mt-1 line-clamp-2">
        {truncate(component.visualDescription, 80)}
      </p>
      {firstThreeClasses.length > 0 && (
        <div className="flex flex-wrap gap-1 mt-2">
          {firstThreeClasses.map((className) => (
            <span
              key={className}
              className="px-1.5 py-0.5 text-xs bg-zinc-700 text-zinc-300 rounded"
            >
              .{className}
            </span>
          ))}
        </div>
      )}
    </button>
  );
};

interface ContentSlotDisplayProps {
  slots: ExtractedComponent['contentSlots'];
}

const ContentSlotDisplay: React.FC<ContentSlotDisplayProps> = ({ slots }) => {
  if (slots.length === 0) {
    return (
      <p className="text-zinc-500 text-sm italic">No content slots defined</p>
    );
  }

  return (
    <div className="space-y-2">
      {slots.map((slot, index) => (
        <div
          key={`${slot.selector}-${index}`}
          className="flex items-start gap-3 p-2 bg-zinc-800 rounded border border-zinc-700"
        >
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="font-mono text-xs text-blue-400">
                {slot.selector}
              </span>
              {slot.required && (
                <span className="px-1.5 py-0.5 text-xs bg-red-900/50 text-red-400 rounded">
                  required
                </span>
              )}
            </div>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-sm text-zinc-300">{slot.name}</span>
              <span className="px-1.5 py-0.5 text-xs bg-zinc-700 text-zinc-400 rounded">
                {slot.type}
              </span>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

interface CodeBlockProps {
  title: string;
  code: string;
  language: 'html' | 'css';
}

const CodeBlock: React.FC<CodeBlockProps> = ({ title, code, language }) => {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-medium text-zinc-400">{title}</h4>
        <span className="px-2 py-0.5 text-xs bg-zinc-700 text-zinc-400 rounded uppercase">
          {language}
        </span>
      </div>
      <pre className="p-3 bg-zinc-900 rounded-lg border border-zinc-700 overflow-x-auto">
        <code className="text-xs text-zinc-300 font-mono whitespace-pre-wrap break-all">
          {code || '/* No code */'}
        </code>
      </pre>
    </div>
  );
};

// ============================================================================
// Main Component
// ============================================================================

export const BrandComponentPreview: React.FC<BrandComponentPreviewProps> = ({
  components,
}) => {
  const [selectedIndex, setSelectedIndex] = useState(0);

  const selectedComponent = components[selectedIndex] || null;
  const ourClassNames = selectedComponent
    ? generateOurClassNames(selectedComponent.theirClassNames)
    : [];

  if (components.length === 0) {
    return (
      <div className="p-8 text-center">
        <div className="text-zinc-500 text-sm">No components extracted yet</div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Anti-Template Indicator Banner */}
      <div className="flex items-center gap-3 p-3 bg-green-900/30 border border-green-500/30 rounded-lg">
        <svg
          className="w-5 h-5 text-green-400 flex-shrink-0"
          fill="currentColor"
          viewBox="0 0 20 20"
        >
          <path
            fillRule="evenodd"
            d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
            clipRule="evenodd"
          />
        </svg>
        <span className="text-sm text-green-300">
          Literal Extraction Mode - Using actual HTML/CSS (no templates)
        </span>
      </div>

      {/* Two-Column Layout */}
      <div className="flex gap-4">
        {/* Left Column - Component List (1/3) */}
        <div className="w-1/3 space-y-2">
          <h3 className="text-xs font-medium text-zinc-500 uppercase tracking-wide px-1">
            Components ({components.length})
          </h3>
          <div className="space-y-2 max-h-[600px] overflow-y-auto pr-2">
            {components.map((component, index) => (
              <ComponentListItem
                key={component.id}
                component={component}
                isSelected={index === selectedIndex}
                onClick={() => setSelectedIndex(index)}
              />
            ))}
          </div>
        </div>

        {/* Right Column - Component Detail (2/3) */}
        <div className="w-2/3 bg-zinc-800/50 rounded-lg border border-zinc-700 p-4 space-y-5">
          {selectedComponent ? (
            <>
              {/* Visual Description */}
              <div>
                <h3 className="text-sm font-medium text-zinc-400 mb-2">
                  Visual Description
                </h3>
                <p className="text-sm text-zinc-300">
                  {selectedComponent.visualDescription}
                </p>
              </div>

              {/* Their Classes (Original) */}
              <div>
                <h3 className="text-sm font-medium text-zinc-400 mb-2">
                  Their Classes
                  <span className="ml-2 text-xs text-zinc-500 font-normal">
                    (original)
                  </span>
                </h3>
                <div className="flex flex-wrap gap-1.5">
                  {selectedComponent.theirClassNames.length > 0 ? (
                    selectedComponent.theirClassNames.map((className) => (
                      <span
                        key={className}
                        className="px-2 py-1 text-xs bg-blue-900/40 text-blue-300 border border-blue-500/30 rounded"
                      >
                        .{className}
                      </span>
                    ))
                  ) : (
                    <span className="text-zinc-500 text-sm italic">
                      No classes
                    </span>
                  )}
                </div>
              </div>

              {/* Our Classes (Brand-Prefixed) */}
              <div>
                <h3 className="text-sm font-medium text-zinc-400 mb-2">
                  Our Classes
                  <span className="ml-2 text-xs text-zinc-500 font-normal">
                    (brand-prefixed)
                  </span>
                </h3>
                <div className="flex flex-wrap gap-1.5">
                  {ourClassNames.length > 0 ? (
                    ourClassNames.map((className) => (
                      <span
                        key={className}
                        className="px-2 py-1 text-xs bg-green-900/40 text-green-300 border border-green-500/30 rounded"
                      >
                        .{className}
                      </span>
                    ))
                  ) : (
                    <span className="text-zinc-500 text-sm italic">
                      No classes
                    </span>
                  )}
                </div>
              </div>

              {/* Content Slots */}
              <div>
                <h3 className="text-sm font-medium text-zinc-400 mb-2">
                  Content Slots
                  <span className="ml-2 text-xs text-zinc-500 font-normal">
                    ({selectedComponent.contentSlots.length})
                  </span>
                </h3>
                <ContentSlotDisplay slots={selectedComponent.contentSlots} />
              </div>

              {/* Literal HTML */}
              <CodeBlock
                title="Literal HTML"
                code={selectedComponent.literalHtml}
                language="html"
              />

              {/* Literal CSS */}
              <CodeBlock
                title="Literal CSS"
                code={selectedComponent.literalCss}
                language="css"
              />
            </>
          ) : (
            <div className="flex items-center justify-center h-64 text-zinc-500">
              Select a component to view details
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default BrandComponentPreview;
