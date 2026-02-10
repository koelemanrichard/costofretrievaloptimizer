/**
 * FileUploadStep - Step 1 of CSV Import Wizard
 *
 * Drag-and-drop zone for CSV/JSON files with preview of first 5 rows.
 */

import React, { useState, useRef, useCallback } from 'react';
import { Button } from '../../ui/Button';
import { parseCsv, parseJson } from '../../../services/catalog/catalogImporter';

interface FileUploadStepProps {
  onParsed: (headers: string[], rows: Record<string, string>[], fileName: string) => void;
}

const FileUploadStep: React.FC<FileUploadStepProps> = ({ onParsed }) => {
  const [isDragging, setIsDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [preview, setPreview] = useState<{ headers: string[]; rows: Record<string, string>[]; fileName: string } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFile = useCallback(async (file: File) => {
    setError(null);
    setPreview(null);

    const ext = file.name.split('.').pop()?.toLowerCase();
    if (!['csv', 'json', 'tsv', 'txt'].includes(ext || '')) {
      setError('Unsupported file format. Please use CSV, TSV, or JSON.');
      return;
    }

    try {
      const text = await file.text();

      let result: { headers: string[]; rows: Record<string, string>[] };
      if (ext === 'json') {
        result = parseJson(text);
      } else {
        result = parseCsv(text);
      }

      if (result.headers.length === 0) {
        setError('No data found in file.');
        return;
      }

      setPreview({ ...result, fileName: file.name });
    } catch (err) {
      setError(`Failed to parse file: ${err instanceof Error ? err.message : 'Unknown error'}`);
    }
  }, []);

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
  };

  const handleContinue = () => {
    if (preview) {
      onParsed(preview.headers, preview.rows, preview.fileName);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium text-gray-200">Upload Product Data</h3>
        <p className="text-sm text-gray-400 mt-1">
          Upload a CSV, TSV, or JSON file with your product data. We'll auto-detect the columns.
        </p>
      </div>

      {/* Drop zone */}
      <div
        className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors cursor-pointer ${
          isDragging
            ? 'border-blue-400 bg-blue-900/10'
            : 'border-gray-700 hover:border-gray-500'
        }`}
        onDragOver={e => { e.preventDefault(); setIsDragging(true); }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
      >
        <svg className="w-10 h-10 mx-auto mb-3 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
        </svg>
        <p className="text-sm text-gray-300">Drop your file here, or click to browse</p>
        <p className="text-xs text-gray-500 mt-1">CSV, TSV, or JSON up to 10MB</p>
        <input
          ref={fileInputRef}
          type="file"
          accept=".csv,.tsv,.json,.txt"
          className="hidden"
          onChange={handleInputChange}
        />
      </div>

      {/* Error */}
      {error && (
        <div className="bg-red-900/20 border border-red-800 rounded px-4 py-2 text-sm text-red-300">
          {error}
        </div>
      )}

      {/* Preview */}
      {preview && (
        <div>
          <div className="flex items-center justify-between mb-2">
            <h4 className="text-sm font-medium text-gray-300">
              Preview: {preview.fileName}
            </h4>
            <span className="text-xs text-gray-500">
              {preview.headers.length} columns, {preview.rows.length} rows
            </span>
          </div>

          <div className="overflow-x-auto border border-gray-700 rounded">
            <table className="w-full text-xs">
              <thead className="bg-gray-800">
                <tr>
                  <th className="px-2 py-1.5 text-left text-gray-400 font-medium w-8">#</th>
                  {preview.headers.map(h => (
                    <th key={h} className="px-2 py-1.5 text-left text-gray-400 font-medium">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {preview.rows.slice(0, 5).map((row, idx) => (
                  <tr key={idx} className="border-t border-gray-800">
                    <td className="px-2 py-1 text-gray-500">{idx + 1}</td>
                    {preview.headers.map(h => (
                      <td key={h} className="px-2 py-1 text-gray-300 max-w-[200px] truncate">
                        {row[h] || <span className="text-gray-600">-</span>}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {preview.rows.length > 5 && (
            <p className="text-xs text-gray-500 mt-1">
              Showing first 5 of {preview.rows.length} rows
            </p>
          )}

          <div className="flex justify-end mt-4">
            <Button variant="primary" size="sm" onClick={handleContinue}>
              Continue to Field Mapping
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};

export default FileUploadStep;
