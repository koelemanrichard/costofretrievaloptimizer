import React, { useState } from 'react';
import { Card } from './ui/Card';
import { Button } from './ui/Button';
import { Input } from './ui/Input';
import { Label } from './ui/Label';
import { Loader } from './ui/Loader';

interface NewMapModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreateMap: (mapName: string) => Promise<void>;
}

const NewMapModal: React.FC<NewMapModalProps> = ({ isOpen, onClose, onCreateMap }) => {
    const [mapName, setMapName] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    if (!isOpen) return null;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (mapName && !isLoading) {
            setIsLoading(true);
            try {
                await onCreateMap(mapName);
                // Only close and reset on success
                setMapName(''); 
                onClose();
            } catch (error) {
                // The error is already dispatched in App.tsx, so we just stop loading here
                console.error("Failed to create map from modal:", error);
            } finally {
                setIsLoading(false);
            }
        }
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-70 z-50 flex justify-center items-center p-4" onClick={onClose}>
            <Card className="w-full max-w-lg" onClick={e => e.stopPropagation()}>
                <form onSubmit={handleSubmit}>
                    <div className="p-6">
                        <h2 className="text-xl font-bold text-white mb-4">Create New Topical Map</h2>
                        <div className="space-y-4">
                            <div>
                                <Label htmlFor="map-name">Map Name</Label>
                                <Input
                                    id="map-name"
                                    value={mapName}
                                    onChange={(e) => setMapName(e.target.value)}
                                    placeholder="e.g., Q1 Content Strategy"
                                    required
                                    disabled={isLoading}
                                />
                            </div>
                        </div>
                    </div>
                    <div className="p-4 bg-gray-800 border-t border-gray-700 flex justify-end gap-4">
                        <Button type="button" variant="secondary" onClick={onClose} disabled={isLoading}>Cancel</Button>
                        <Button type="submit" disabled={isLoading || !mapName}>
                            {isLoading ? <Loader className="w-5 h-5" /> : 'Create & Setup'}
                        </Button>
                    </div>
                </form>
            </Card>
        </div>
    );
};

export default NewMapModal;