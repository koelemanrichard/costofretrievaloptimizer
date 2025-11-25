// components/site-analysis/ProjectSetup.tsx
// Project setup component for Site Analysis

import React, { useState, useRef } from 'react';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Label } from '../ui/Label';
import { Loader } from '../ui/Loader';

type InputMethod = 'url' | 'sitemap' | 'gsc';

interface ProjectSetupProps {
  onStartProject: (name: string, inputMethod: InputMethod, inputData: string) => void;
  isProcessing: boolean;
}

export const ProjectSetup: React.FC<ProjectSetupProps> = ({
  onStartProject,
  isProcessing,
}) => {
  const [projectName, setProjectName] = useState('');
  const [inputMethod, setInputMethod] = useState<InputMethod>('url');
  const [urlInput, setUrlInput] = useState('');
  const [sitemapUrl, setSitemapUrl] = useState('');
  const [gscCsvContent, setGscCsvContent] = useState('');
  const [gscFileName, setGscFileName] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setGscFileName(file.name);
    const text = await file.text();
    setGscCsvContent(text);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    let inputData = '';
    switch (inputMethod) {
      case 'url':
        inputData = urlInput;
        break;
      case 'sitemap':
        inputData = sitemapUrl;
        break;
      case 'gsc':
        inputData = gscCsvContent;
        break;
    }

    if (!projectName || !inputData) return;
    onStartProject(projectName, inputMethod, inputData);
  };

  const inputMethods = [
    {
      id: 'url' as InputMethod,
      title: 'Website URL',
      description: 'Enter a URL to auto-discover sitemap and crawl',
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
        </svg>
      ),
    },
    {
      id: 'sitemap' as InputMethod,
      title: 'Sitemap URL',
      description: 'Provide a direct sitemap URL to import pages',
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
      ),
    },
    {
      id: 'gsc' as InputMethod,
      title: 'GSC Export',
      description: 'Upload a CSV export from Google Search Console',
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
        </svg>
      ),
    },
  ];

  return (
    <form onSubmit={handleSubmit}>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Project Info */}
        <Card className="p-6">
          <h2 className="text-xl font-semibold text-white mb-6">Project Details</h2>

          <div className="space-y-4">
            <div>
              <Label htmlFor="project-name">Project Name</Label>
              <Input
                id="project-name"
                value={projectName}
                onChange={(e) => setProjectName(e.target.value)}
                placeholder="e.g., Main Site Audit Q4 2025"
                required
              />
            </div>
          </div>

          <div className="mt-8">
            <Label>Input Method</Label>
            <div className="grid grid-cols-1 gap-3 mt-3">
              {inputMethods.map((method) => (
                <button
                  key={method.id}
                  type="button"
                  onClick={() => setInputMethod(method.id)}
                  className={`flex items-center gap-4 p-4 rounded-lg border transition-all text-left ${
                    inputMethod === method.id
                      ? 'border-blue-500 bg-blue-500/10'
                      : 'border-gray-700 bg-gray-800/50 hover:border-gray-600'
                  }`}
                >
                  <div className={`${inputMethod === method.id ? 'text-blue-400' : 'text-gray-400'}`}>
                    {method.icon}
                  </div>
                  <div>
                    <p className={`font-medium ${inputMethod === method.id ? 'text-blue-300' : 'text-white'}`}>
                      {method.title}
                    </p>
                    <p className="text-sm text-gray-400">{method.description}</p>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </Card>

        {/* Input Form */}
        <Card className="p-6">
          <h2 className="text-xl font-semibold text-white mb-6">
            {inputMethod === 'url' && 'Enter Website URL'}
            {inputMethod === 'sitemap' && 'Enter Sitemap URL'}
            {inputMethod === 'gsc' && 'Upload GSC CSV'}
          </h2>

          {inputMethod === 'url' && (
            <div className="space-y-4">
              <div>
                <Label htmlFor="url-input">Website URL</Label>
                <Input
                  id="url-input"
                  type="url"
                  value={urlInput}
                  onChange={(e) => setUrlInput(e.target.value)}
                  placeholder="https://example.com"
                  required={inputMethod === 'url'}
                />
                <p className="text-sm text-gray-400 mt-2">
                  We'll attempt to find the sitemap from robots.txt or common locations.
                </p>
              </div>
            </div>
          )}

          {inputMethod === 'sitemap' && (
            <div className="space-y-4">
              <div>
                <Label htmlFor="sitemap-input">Sitemap URL</Label>
                <Input
                  id="sitemap-input"
                  type="url"
                  value={sitemapUrl}
                  onChange={(e) => setSitemapUrl(e.target.value)}
                  placeholder="https://example.com/sitemap.xml"
                  required={inputMethod === 'sitemap'}
                />
                <p className="text-sm text-gray-400 mt-2">
                  Supports both regular sitemaps and sitemap indexes.
                </p>
              </div>
            </div>
          )}

          {inputMethod === 'gsc' && (
            <div className="space-y-4">
              <div>
                <Label>Upload CSV File</Label>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".csv"
                  onChange={handleFileUpload}
                  className="hidden"
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full p-8 border-2 border-dashed border-gray-600 rounded-lg hover:border-gray-500 transition-colors"
                >
                  {gscFileName ? (
                    <div className="text-center">
                      <svg className="w-12 h-12 mx-auto text-green-400 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <p className="text-white font-medium">{gscFileName}</p>
                      <p className="text-sm text-gray-400 mt-1">Click to change file</p>
                    </div>
                  ) : (
                    <div className="text-center">
                      <svg className="w-12 h-12 mx-auto text-gray-400 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                      </svg>
                      <p className="text-white font-medium">Click to upload CSV</p>
                      <p className="text-sm text-gray-400 mt-1">Export from GSC Performance &gt; Pages</p>
                    </div>
                  )}
                </button>
              </div>
            </div>
          )}

          {/* Info Box */}
          <div className="mt-6 p-4 bg-blue-500/10 border border-blue-500/30 rounded-lg">
            <h3 className="text-blue-300 font-medium mb-2">What happens next?</h3>
            <ol className="text-sm text-gray-300 space-y-1 list-decimal list-inside">
              <li>We'll discover and import your pages</li>
              <li>Content extraction via Jina.ai Reader API</li>
              <li>Audit against 25 rules across 5 phases</li>
              <li>Generate actionable improvement tasks</li>
            </ol>
          </div>

          <Button
            type="submit"
            className="w-full mt-6"
            disabled={isProcessing || !projectName || (inputMethod === 'gsc' ? !gscCsvContent : inputMethod === 'sitemap' ? !sitemapUrl : !urlInput)}
          >
            {isProcessing ? <Loader /> : 'Start Analysis'}
          </Button>
        </Card>
      </div>
    </form>
  );
};

export default ProjectSetup;
