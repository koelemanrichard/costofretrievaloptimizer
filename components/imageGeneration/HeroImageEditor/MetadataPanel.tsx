/**
 * Metadata Panel Component
 *
 * Editor for IPTC/EXIF metadata and Schema.org properties.
 * Ensures proper attribution and SEO signals for hero images.
 */

import React from 'react';
import { HeroImageMetadata } from '../../../types';

// ============================================
// TYPES
// ============================================

interface MetadataPanelProps {
  metadata: HeroImageMetadata;
  onUpdateMetadata: (updates: Partial<HeroImageMetadata>) => void;
  businessName?: string;
  className?: string;
}

// ============================================
// COMPONENT
// ============================================

export const MetadataPanel: React.FC<MetadataPanelProps> = ({
  metadata,
  onUpdateMetadata,
  businessName,
  className = ''
}) => {
  const [activeTab, setActiveTab] = React.useState<'basic' | 'iptc' | 'exif' | 'schema'>('basic');

  // Auto-fill from business name
  const handleAutoFill = () => {
    if (!businessName) return;

    const year = new Date().getFullYear();
    onUpdateMetadata({
      iptc: {
        ...metadata.iptc,
        creator: businessName,
        copyright: `Copyright ${year} ${businessName}`
      },
      exif: {
        ...metadata.exif,
        artist: businessName,
        copyright: `Copyright ${year} ${businessName}`
      },
      schemaOrg: {
        ...metadata.schemaOrg,
        author: { '@type': 'Organization', name: businessName },
        copyrightHolder: { '@type': 'Organization', name: businessName }
      }
    });
  };

  return (
    <div className={`bg-gray-800 border border-gray-700 rounded-lg overflow-hidden ${className}`}>
      {/* Header */}
      <div className="px-3 py-2 bg-gray-900 border-b border-gray-700 flex items-center justify-between">
        <h3 className="text-sm font-medium text-white">Image Metadata</h3>
        {businessName && (
          <button
            onClick={handleAutoFill}
            className="text-xs text-blue-400 hover:text-blue-300"
          >
            Auto-fill from BrandKit
          </button>
        )}
      </div>

      {/* Tabs */}
      <div className="flex border-b border-gray-700">
        {(['basic', 'iptc', 'exif', 'schema'] as const).map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`flex-1 px-3 py-2 text-xs font-medium transition-colors ${
              activeTab === tab
                ? 'text-blue-400 border-b-2 border-blue-500 bg-gray-700'
                : 'text-gray-400 hover:text-white hover:bg-gray-700'
            }`}
          >
            {tab === 'basic' ? 'Basic' :
             tab === 'iptc' ? 'IPTC' :
             tab === 'exif' ? 'EXIF' : 'Schema'}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div className="p-3 max-h-64 overflow-y-auto">
        {activeTab === 'basic' && (
          <BasicMetadata
            metadata={metadata}
            onUpdateMetadata={onUpdateMetadata}
          />
        )}
        {activeTab === 'iptc' && (
          <IPTCMetadata
            metadata={metadata}
            onUpdateMetadata={onUpdateMetadata}
          />
        )}
        {activeTab === 'exif' && (
          <EXIFMetadata
            metadata={metadata}
            onUpdateMetadata={onUpdateMetadata}
          />
        )}
        {activeTab === 'schema' && (
          <SchemaMetadata
            metadata={metadata}
            onUpdateMetadata={onUpdateMetadata}
          />
        )}
      </div>
    </div>
  );
};

// ============================================
// BASIC METADATA
// ============================================

interface BasicMetadataProps {
  metadata: HeroImageMetadata;
  onUpdateMetadata: (updates: Partial<HeroImageMetadata>) => void;
}

const BasicMetadata: React.FC<BasicMetadataProps> = ({
  metadata,
  onUpdateMetadata
}) => {
  return (
    <div className="space-y-3">
      {/* Alt Text */}
      <div className="space-y-1">
        <label className="text-xs font-medium text-gray-300">
          Alt Text <span className="text-red-400">*</span>
        </label>
        <textarea
          value={metadata.altText || ''}
          onChange={(e) => onUpdateMetadata({ altText: e.target.value })}
          placeholder="Describe the image content..."
          rows={3}
          className="w-full px-2 py-1.5 text-sm bg-gray-700 border border-gray-600 rounded text-white placeholder-gray-500 focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
        />
        <p className="text-xs text-gray-400">
          {(metadata.altText?.length || 0)} / 150 characters recommended
        </p>
      </div>

      {/* File Name */}
      <div className="space-y-1">
        <label className="text-xs font-medium text-gray-300">File Name</label>
        <input
          type="text"
          value={metadata.fileName || ''}
          onChange={(e) => onUpdateMetadata({ fileName: e.target.value })}
          placeholder="hero-image-name.avif"
          className="w-full px-2 py-1.5 text-sm bg-gray-700 border border-gray-600 rounded text-white placeholder-gray-500 focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
        />
        <p className="text-xs text-gray-400">
          Use descriptive, keyword-rich names (no spaces)
        </p>
      </div>

      {/* Completeness Check */}
      <div className="p-2 bg-gray-900 rounded">
        <p className="text-xs font-medium text-gray-300 mb-2">Completeness</p>
        <div className="space-y-1">
          <MetadataCheck
            label="Alt text"
            isComplete={!!metadata.altText && metadata.altText.length >= 30}
          />
          <MetadataCheck
            label="File name"
            isComplete={!!metadata.fileName}
          />
          <MetadataCheck
            label="Creator/Author"
            isComplete={!!metadata.iptc?.creator || !!metadata.exif?.artist}
          />
          <MetadataCheck
            label="Copyright"
            isComplete={!!metadata.iptc?.copyright || !!metadata.exif?.copyright}
          />
        </div>
      </div>
    </div>
  );
};

// ============================================
// IPTC METADATA
// ============================================

interface IPTCMetadataProps {
  metadata: HeroImageMetadata;
  onUpdateMetadata: (updates: Partial<HeroImageMetadata>) => void;
}

const IPTCMetadata: React.FC<IPTCMetadataProps> = ({
  metadata,
  onUpdateMetadata
}) => {
  const updateIPTC = (field: string, value: string | string[]) => {
    onUpdateMetadata({
      iptc: {
        ...metadata.iptc,
        [field]: value
      }
    });
  };

  return (
    <div className="space-y-3">
      {/* Creator */}
      <div className="space-y-1">
        <label className="text-xs font-medium text-gray-300">Creator</label>
        <input
          type="text"
          value={metadata.iptc?.creator || ''}
          onChange={(e) => updateIPTC('creator', e.target.value)}
          placeholder="Creator name or organization"
          className="w-full px-2 py-1.5 text-sm bg-gray-700 border border-gray-600 rounded text-white placeholder-gray-500"
        />
      </div>

      {/* Copyright */}
      <div className="space-y-1">
        <label className="text-xs font-medium text-gray-300">Copyright Notice</label>
        <input
          type="text"
          value={metadata.iptc?.copyright || ''}
          onChange={(e) => updateIPTC('copyright', e.target.value)}
          placeholder="Copyright 2024 Company Name"
          className="w-full px-2 py-1.5 text-sm bg-gray-700 border border-gray-600 rounded text-white placeholder-gray-500"
        />
      </div>

      {/* Headline */}
      <div className="space-y-1">
        <label className="text-xs font-medium text-gray-300">Headline</label>
        <input
          type="text"
          value={metadata.iptc?.headline || ''}
          onChange={(e) => updateIPTC('headline', e.target.value)}
          placeholder="Short headline (max 64 chars)"
          maxLength={64}
          className="w-full px-2 py-1.5 text-sm bg-gray-700 border border-gray-600 rounded text-white placeholder-gray-500"
        />
      </div>

      {/* Caption */}
      <div className="space-y-1">
        <label className="text-xs font-medium text-gray-300">Caption</label>
        <textarea
          value={metadata.iptc?.caption || ''}
          onChange={(e) => updateIPTC('caption', e.target.value)}
          placeholder="Detailed description of the image"
          rows={2}
          className="w-full px-2 py-1.5 text-sm bg-gray-700 border border-gray-600 rounded text-white placeholder-gray-500"
        />
      </div>

      {/* Keywords */}
      <div className="space-y-1">
        <label className="text-xs font-medium text-gray-300">Keywords</label>
        <input
          type="text"
          value={metadata.iptc?.keywords?.join(', ') || ''}
          onChange={(e) => updateIPTC('keywords', e.target.value.split(',').map(k => k.trim()).filter(Boolean))}
          placeholder="keyword1, keyword2, keyword3"
          className="w-full px-2 py-1.5 text-sm bg-gray-700 border border-gray-600 rounded text-white placeholder-gray-500"
        />
        <p className="text-xs text-gray-400">Separate with commas</p>
      </div>
    </div>
  );
};

// ============================================
// EXIF METADATA
// ============================================

interface EXIFMetadataProps {
  metadata: HeroImageMetadata;
  onUpdateMetadata: (updates: Partial<HeroImageMetadata>) => void;
}

const EXIFMetadata: React.FC<EXIFMetadataProps> = ({
  metadata,
  onUpdateMetadata
}) => {
  const updateEXIF = (field: string, value: string) => {
    onUpdateMetadata({
      exif: {
        ...metadata.exif,
        [field]: value
      }
    });
  };

  return (
    <div className="space-y-3">
      {/* Artist */}
      <div className="space-y-1">
        <label className="text-xs font-medium text-gray-300">Artist</label>
        <input
          type="text"
          value={metadata.exif?.artist || ''}
          onChange={(e) => updateEXIF('artist', e.target.value)}
          placeholder="Artist or creator name"
          className="w-full px-2 py-1.5 text-sm bg-gray-700 border border-gray-600 rounded text-white placeholder-gray-500"
        />
      </div>

      {/* Copyright */}
      <div className="space-y-1">
        <label className="text-xs font-medium text-gray-300">Copyright</label>
        <input
          type="text"
          value={metadata.exif?.copyright || ''}
          onChange={(e) => updateEXIF('copyright', e.target.value)}
          placeholder="Copyright notice"
          className="w-full px-2 py-1.5 text-sm bg-gray-700 border border-gray-600 rounded text-white placeholder-gray-500"
        />
      </div>

      {/* Image Description */}
      <div className="space-y-1">
        <label className="text-xs font-medium text-gray-300">Image Description</label>
        <textarea
          value={metadata.exif?.imageDescription || ''}
          onChange={(e) => updateEXIF('imageDescription', e.target.value)}
          placeholder="Description of the image"
          rows={3}
          className="w-full px-2 py-1.5 text-sm bg-gray-700 border border-gray-600 rounded text-white placeholder-gray-500"
        />
      </div>

      <div className="p-2 bg-blue-900/30 border border-blue-700/50 rounded">
        <p className="text-xs text-blue-300">
          EXIF metadata will be embedded in the final image file (JPEG only).
        </p>
      </div>
    </div>
  );
};

// ============================================
// SCHEMA.ORG METADATA
// ============================================

interface SchemaMetadataProps {
  metadata: HeroImageMetadata;
  onUpdateMetadata: (updates: Partial<HeroImageMetadata>) => void;
}

const SchemaMetadata: React.FC<SchemaMetadataProps> = ({
  metadata,
  onUpdateMetadata
}) => {
  const updateSchema = (field: string, value: any) => {
    onUpdateMetadata({
      schemaOrg: {
        ...metadata.schemaOrg,
        [field]: value
      }
    });
  };

  return (
    <div className="space-y-3">
      {/* Name */}
      <div className="space-y-1">
        <label className="text-xs font-medium text-gray-300">Name</label>
        <input
          type="text"
          value={metadata.schemaOrg?.name || ''}
          onChange={(e) => updateSchema('name', e.target.value)}
          placeholder="Image name"
          className="w-full px-2 py-1.5 text-sm bg-gray-700 border border-gray-600 rounded text-white placeholder-gray-500"
        />
      </div>

      {/* Description */}
      <div className="space-y-1">
        <label className="text-xs font-medium text-gray-300">Description</label>
        <textarea
          value={metadata.schemaOrg?.description || ''}
          onChange={(e) => updateSchema('description', e.target.value)}
          placeholder="Image description for schema"
          rows={2}
          className="w-full px-2 py-1.5 text-sm bg-gray-700 border border-gray-600 rounded text-white placeholder-gray-500"
        />
      </div>

      {/* Author Organization */}
      <div className="space-y-1">
        <label className="text-xs font-medium text-gray-300">Author (Organization)</label>
        <input
          type="text"
          value={metadata.schemaOrg?.author?.name || ''}
          onChange={(e) => updateSchema('author', { '@type': 'Organization', name: e.target.value })}
          placeholder="Organization name"
          className="w-full px-2 py-1.5 text-sm bg-gray-700 border border-gray-600 rounded text-white placeholder-gray-500"
        />
      </div>

      {/* License URL */}
      <div className="space-y-1">
        <label className="text-xs font-medium text-gray-300">License URL</label>
        <input
          type="url"
          value={metadata.schemaOrg?.license || ''}
          onChange={(e) => updateSchema('license', e.target.value)}
          placeholder="https://creativecommons.org/licenses/..."
          className="w-full px-2 py-1.5 text-sm bg-gray-700 border border-gray-600 rounded text-white placeholder-gray-500"
        />
      </div>

      {/* Preview */}
      <div className="p-2 bg-gray-900 rounded">
        <p className="text-xs font-medium text-gray-300 mb-1">Schema Preview</p>
        <pre className="text-xs text-gray-400 overflow-x-auto">
          {JSON.stringify({
            '@type': 'ImageObject',
            name: metadata.schemaOrg?.name || '',
            description: metadata.schemaOrg?.description || '',
            author: metadata.schemaOrg?.author
          }, null, 2)}
        </pre>
      </div>
    </div>
  );
};

// ============================================
// METADATA CHECK
// ============================================

interface MetadataCheckProps {
  label: string;
  isComplete: boolean;
}

const MetadataCheck: React.FC<MetadataCheckProps> = ({ label, isComplete }) => {
  return (
    <div className="flex items-center gap-2">
      {isComplete ? (
        <svg className="w-4 h-4 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
        </svg>
      ) : (
        <svg className="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <circle cx="12" cy="12" r="10" strokeWidth={2} />
        </svg>
      )}
      <span className={`text-xs ${isComplete ? 'text-gray-200' : 'text-gray-500'}`}>
        {label}
      </span>
    </div>
  );
};

export default MetadataPanel;
