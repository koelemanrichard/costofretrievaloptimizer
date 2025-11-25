
import React, { useState, useEffect } from 'react';
import { SchemaGenerationResult } from '../types';
import { Card } from './ui/Card';
import { Button } from './ui/Button';

interface SchemaModalProps {
  isOpen: boolean;
  onClose: () => void;
  result: SchemaGenerationResult | null;
}

const SchemaModal: React.FC<SchemaModalProps> = ({ isOpen, onClose, result }) => {
  const [copyButtonText, setCopyButtonText] = useState('Copy to Clipboard');

  useEffect(() => {
    if (isOpen) {
      setCopyButtonText('Copy to Clipboard');
    }
  }, [isOpen]);

  if (!isOpen || !result) return null;

  const handleCopy = () => {
    navigator.clipboard.writeText(result.schema).then(() => {
      setCopyButtonText('Copied!');
      setTimeout(() => setCopyButtonText('Copy to Clipboard'), 2000);
    }).catch(err => {
      console.error('Failed to copy schema: ', err);
      setCopyButtonText('Failed to Copy');
    });
  };
  
  // Safer syntax highlighting function
  const formatJson = (json: string) => {
      if (!json) return '';
      
      // First, entity encode the JSON string to prevent XSS and preserve structure
      const encoded = json.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
      
      // Tokenize and wrap in spans. We use a regex that identifies tokens specifically.
      // We avoid matching things that look like numbers inside what might be class names if we were parsing HTML, 
      // but here we are parsing strictly JSON text *before* it becomes HTML.
      return encoded.replace(
          /("(\\u[a-zA-Z0-9]{4}|\\[^u]|[^\\"])*"(\s*:)?|\b(true|false|null)\b|-?\d+(?:\.\d*)?(?:[eE][+\-]?\d+)?)/g,
          function (match) {
              let cls = 'text-yellow-400'; // number
              if (/^"/.test(match)) {
                  if (/:$/.test(match)) {
                      cls = 'text-purple-400'; // key
                  } else {
                      cls = 'text-green-400'; // string
                  }
              } else if (/true|false/.test(match)) {
                  cls = 'text-blue-400'; // boolean
              } else if (/null/.test(match)) {
                  cls = 'text-gray-500'; // null
              }
              return '<span class="' + cls + '">' + match + '</span>';
          }
      );
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-70 z-50 flex justify-center items-center p-4" onClick={onClose}>
      <Card className="w-full max-w-3xl max-h-[90vh] flex flex-col" onClick={e => e.stopPropagation()}>
        <header className="sticky top-0 bg-gray-800 p-4 border-b border-gray-700 flex justify-between items-center z-10 flex-shrink-0">
          <h2 className="text-xl font-bold text-white">Generated Schema.org Markup (JSON-LD)</h2>
          <button onClick={onClose} className="text-gray-400 text-2xl leading-none hover:text-white">&times;</button>
        </header>
        
        <div className="p-6 overflow-y-auto">
            <div className="space-y-4">
                <Card className="p-3 bg-gray-900/50">
                    <p className="text-sm text-cyan-300/90 italic">
                        <strong>AI Reasoning:</strong> {result.reasoning}
                    </p>
                </Card>
                <div className="relative bg-gray-900 rounded-lg p-4 border border-gray-700">
                    <Button onClick={handleCopy} variant="secondary" className="absolute top-2 right-2 !py-1 !px-3 text-xs">
                        {copyButtonText}
                    </Button>
                    <pre className="overflow-x-auto text-sm">
                        <code dangerouslySetInnerHTML={{ __html: formatJson(result.schema) }} />
                    </pre>
                </div>
            </div>
        </div>
        <footer className="p-4 bg-gray-800 border-t border-gray-700 flex justify-end">
            <Button onClick={onClose} variant="secondary">Close</Button>
        </footer>
      </Card>
    </div>
  );
};

export default SchemaModal;
