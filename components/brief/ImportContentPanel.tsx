
import React, { useState } from 'react';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { SmartLoader } from '../ui/FunLoaders';

interface ImportContentPanelProps {
    onImport: (url: string) => Promise<void>;
    isLoading: boolean;
}

export const ImportContentPanel: React.FC<ImportContentPanelProps> = ({ onImport, isLoading }) => {
    const [url, setUrl] = useState('');

    const handleImport = async () => {
        if (!url) return;
        await onImport(url);
    };

    return (
        <Card className="p-4 mb-6 bg-blue-900/10 border border-blue-800">
            <h3 className="text-sm font-semibold text-blue-300 mb-2">Import Existing Content</h3>
            <div className="flex gap-2">
                <Input 
                    value={url} 
                    onChange={(e) => setUrl(e.target.value)} 
                    placeholder="https://example.com/existing-article"
                    className="text-sm"
                    disabled={isLoading}
                />
                <Button 
                    onClick={handleImport} 
                    disabled={!url || isLoading} 
                    className="whitespace-nowrap text-sm py-2 bg-blue-700 hover:bg-blue-600"
                >
                    {isLoading ? <SmartLoader context="importing" size="sm" showText={false} /> : 'Import & Audit'}
                </Button>
            </div>
            <p className="text-xs text-gray-400 mt-2">
                Scrapes the URL, converts content to Markdown, and opens the Editor for auditing against this Brief.
            </p>
        </Card>
    );
};
