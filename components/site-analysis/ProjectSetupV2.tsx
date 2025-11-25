// components/site-analysis/ProjectSetupV2.tsx
// V2 Project setup with topical map linking option

import React, { useState } from 'react';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { TopicalMap } from '../../types';

interface ProjectSetupV2Props {
  onStartProject: (
    name: string,
    domain: string,
    inputMethod: 'url' | 'sitemap' | 'gsc' | 'single_page',
    inputData: string,
    linkedMapId?: string
  ) => void;
  onCancel: () => void;
  isProcessing: boolean;
  existingTopicalMaps: TopicalMap[];
}

export const ProjectSetupV2: React.FC<ProjectSetupV2Props> = ({
  onStartProject,
  onCancel,
  isProcessing,
  existingTopicalMaps,
}) => {
  const [step, setStep] = useState<'method' | 'details'>('method');
  const [inputMethod, setInputMethod] = useState<'url' | 'sitemap' | 'gsc' | 'single_page'>('url');
  const [projectName, setProjectName] = useState('');
  const [domain, setDomain] = useState('');
  const [inputData, setInputData] = useState('');
  const [linkedMapId, setLinkedMapId] = useState<string>('');
  const [gscFile, setGscFile] = useState<File | null>(null);

  const handleMethodSelect = (method: 'url' | 'sitemap' | 'gsc' | 'single_page') => {
    setInputMethod(method);
    setStep('details');
  };

  const handleGscFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setGscFile(file);
      const reader = new FileReader();
      reader.onload = (event) => {
        setInputData(event.target?.result as string);
      };
      reader.readAsText(file);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // Validate
    if (!projectName.trim()) {
      alert('Please enter a project name');
      return;
    }

    let domainToUse = domain;
    let dataToUse = inputData;

    // For URL method, extract domain from the URL
    if ((inputMethod === 'url' || inputMethod === 'single_page') && inputData) {
      try {
        const url = new URL(inputData.startsWith('http') ? inputData : `https://${inputData}`);
        domainToUse = url.hostname;
        dataToUse = url.href;
      } catch {
        dataToUse = inputData;
        domainToUse = inputData;
      }
    }

    // For sitemap, extract domain
    if (inputMethod === 'sitemap' && inputData) {
      try {
        const url = new URL(inputData);
        domainToUse = url.hostname;
      } catch {
        // Keep existing domain
      }
    }

    onStartProject(
      projectName,
      domainToUse,
      inputMethod,
      dataToUse,
      linkedMapId || undefined
    );
  };

  // Input method selection screen
  if (step === 'method') {
    return (
      <div className="space-y-6">
        <Card className="p-6">
          <h2 className="text-xl font-semibold text-white mb-6">Choose Input Method</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Single Page Option */}
            <button
              onClick={() => handleMethodSelect('single_page')}
              className="p-6 rounded-lg border border-gray-700 hover:border-orange-500 bg-gray-800/50 hover:bg-gray-800 transition-all text-left group"
            >
              <div className="w-12 h-12 rounded-lg bg-orange-500/20 flex items-center justify-center mb-4 group-hover:bg-orange-500/30 transition-colors">
                <svg className="w-6 h-6 text-orange-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-white mb-2">Single Page</h3>
              <p className="text-gray-400 text-sm">
                Audit one specific URL without crawling the site
              </p>
            </button>

            {/* Full Site URL Option */}
            <button
              onClick={() => handleMethodSelect('url')}
              className="p-6 rounded-lg border border-gray-700 hover:border-purple-500 bg-gray-800/50 hover:bg-gray-800 transition-all text-left group"
            >
              <div className="w-12 h-12 rounded-lg bg-purple-500/20 flex items-center justify-center mb-4 group-hover:bg-purple-500/30 transition-colors">
                <svg className="w-6 h-6 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-white mb-2">Full Site</h3>
              <p className="text-gray-400 text-sm">
                Auto-discover sitemap and crawl all pages
              </p>
            </button>

            {/* Sitemap Option */}
            <button
              onClick={() => handleMethodSelect('sitemap')}
              className="p-6 rounded-lg border border-gray-700 hover:border-purple-500 bg-gray-800/50 hover:bg-gray-800 transition-all text-left group"
            >
              <div className="w-12 h-12 rounded-lg bg-blue-500/20 flex items-center justify-center mb-4 group-hover:bg-blue-500/30 transition-colors">
                <svg className="w-6 h-6 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-white mb-2">Sitemap URL</h3>
              <p className="text-gray-400 text-sm">
                Provide a direct link to your sitemap.xml file
              </p>
            </button>

            {/* GSC Option */}
            <button
              onClick={() => handleMethodSelect('gsc')}
              className="p-6 rounded-lg border border-gray-700 hover:border-purple-500 bg-gray-800/50 hover:bg-gray-800 transition-all text-left group"
            >
              <div className="w-12 h-12 rounded-lg bg-green-500/20 flex items-center justify-center mb-4 group-hover:bg-green-500/30 transition-colors">
                <svg className="w-6 h-6 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-white mb-2">GSC Export</h3>
              <p className="text-gray-400 text-sm">
                Upload a CSV export from Google Search Console
              </p>
            </button>
          </div>
        </Card>

        <div className="flex justify-end">
          <Button onClick={onCancel} variant="secondary">
            Cancel
          </Button>
        </div>
      </div>
    );
  }

  // Details form
  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <Card className="p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold text-white">Project Details</h2>
          <button
            type="button"
            onClick={() => setStep('method')}
            className="text-gray-400 hover:text-white text-sm"
          >
            ← Change method
          </button>
        </div>

        <div className="space-y-4">
          {/* Project Name */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Project Name *
            </label>
            <input
              type="text"
              value={projectName}
              onChange={(e) => setProjectName(e.target.value)}
              placeholder="My Site Audit"
              className="w-full px-4 py-2 rounded-lg bg-gray-800 border border-gray-700 text-white placeholder-gray-500 focus:border-purple-500 focus:outline-none"
              required
            />
          </div>

          {/* Input based on method */}
          {inputMethod === 'single_page' && (
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Page URL *
              </label>
              <input
                type="text"
                value={inputData}
                onChange={(e) => setInputData(e.target.value)}
                placeholder="https://example.com/specific-page"
                className="w-full px-4 py-2 rounded-lg bg-gray-800 border border-gray-700 text-white placeholder-gray-500 focus:border-orange-500 focus:outline-none"
                required
              />
              <p className="mt-1 text-sm text-gray-500">
                Only this specific page will be analyzed - no sitemap discovery or crawling
              </p>
            </div>
          )}

          {inputMethod === 'url' && (
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Website URL *
              </label>
              <input
                type="text"
                value={inputData}
                onChange={(e) => setInputData(e.target.value)}
                placeholder="https://example.com"
                className="w-full px-4 py-2 rounded-lg bg-gray-800 border border-gray-700 text-white placeholder-gray-500 focus:border-purple-500 focus:outline-none"
                required
              />
              <p className="mt-1 text-sm text-gray-500">
                We'll automatically look for sitemap.xml at common locations
              </p>
            </div>
          )}

          {inputMethod === 'sitemap' && (
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Sitemap URL *
              </label>
              <input
                type="url"
                value={inputData}
                onChange={(e) => setInputData(e.target.value)}
                placeholder="https://example.com/sitemap.xml"
                className="w-full px-4 py-2 rounded-lg bg-gray-800 border border-gray-700 text-white placeholder-gray-500 focus:border-purple-500 focus:outline-none"
                required
              />
            </div>
          )}

          {inputMethod === 'gsc' && (
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                GSC Export CSV *
              </label>
              <div className="border-2 border-dashed border-gray-700 rounded-lg p-6 text-center hover:border-purple-500/50 transition-colors">
                <input
                  type="file"
                  accept=".csv"
                  onChange={handleGscFileChange}
                  className="hidden"
                  id="gsc-file"
                />
                <label htmlFor="gsc-file" className="cursor-pointer">
                  {gscFile ? (
                    <div>
                      <svg className="w-8 h-8 text-green-400 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      <p className="text-white">{gscFile.name}</p>
                      <p className="text-gray-500 text-sm mt-1">Click to change file</p>
                    </div>
                  ) : (
                    <div>
                      <svg className="w-8 h-8 text-gray-500 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                      </svg>
                      <p className="text-gray-400">Click to upload or drag and drop</p>
                      <p className="text-gray-500 text-sm mt-1">CSV files only</p>
                    </div>
                  )}
                </label>
              </div>
              <p className="mt-2 text-sm text-gray-500">
                Export from GSC → Performance → Pages or Queries
              </p>
            </div>
          )}

          {/* Domain (for GSC) */}
          {inputMethod === 'gsc' && (
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Domain *
              </label>
              <input
                type="text"
                value={domain}
                onChange={(e) => setDomain(e.target.value)}
                placeholder="example.com"
                className="w-full px-4 py-2 rounded-lg bg-gray-800 border border-gray-700 text-white placeholder-gray-500 focus:border-purple-500 focus:outline-none"
                required
              />
            </div>
          )}

          {/* Link to existing topical map */}
          {existingTopicalMaps.length > 0 && (
            <div className="pt-4 border-t border-gray-700">
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Link to Topical Map (Optional)
              </label>
              <select
                value={linkedMapId}
                onChange={(e) => setLinkedMapId(e.target.value)}
                className="w-full px-4 py-2 rounded-lg bg-gray-800 border border-gray-700 text-white focus:border-purple-500 focus:outline-none"
              >
                <option value="">Don't link - discover pillars from content</option>
                {existingTopicalMaps.map((map) => (
                  <option key={map.id} value={map.id}>
                    {map.map_name} ({map.domain || 'No domain'})
                  </option>
                ))}
              </select>
              <p className="mt-1 text-sm text-gray-500">
                Linking imports the Central Entity, Source Context, and Central Search Intent
              </p>
            </div>
          )}
        </div>
      </Card>

      {/* Actions */}
      <div className="flex justify-between">
        <Button type="button" onClick={onCancel} variant="secondary">
          Cancel
        </Button>
        <Button
          type="submit"
          variant="primary"
          disabled={isProcessing || !projectName || !inputData}
        >
          {isProcessing ? 'Starting...' : 'Start Analysis'}
        </Button>
      </div>
    </form>
  );
};

export default ProjectSetupV2;
