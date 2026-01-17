/**
 * NewMapModal Component
 *
 * Modal for creating a new topical map with a name.
 * Uses the accessible Modal component with full keyboard navigation and ARIA support.
 *
 * Updated: 2024-12-19 - Migrated to accessible Modal component
 */

import React, { useState } from 'react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Label } from '../ui/Label';
import { SmartLoader } from '../ui/FunLoaders';

interface NewMapModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreateMap: (mapName: string) => Promise<void>;
}

const NewMapModal: React.FC<NewMapModalProps> = ({ isOpen, onClose, onCreateMap }) => {
    const [mapName, setMapName] = useState('');
    const [isLoading, setIsLoading] = useState(false);

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
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title="Create New Topical Map"
            description="Enter a name for your new topical map"
            maxWidth="max-w-lg"
            footer={
                <>
                    <Button type="button" variant="secondary" onClick={onClose} disabled={isLoading}>
                        Cancel
                    </Button>
                    <Button type="submit" form="new-map-form" disabled={isLoading || !mapName}>
                        {isLoading ? <SmartLoader context="building" size="sm" showText={false} /> : 'Create & Setup'}
                    </Button>
                </>
            }
        >
            <form id="new-map-form" onSubmit={handleSubmit}>
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
                            aria-describedby="map-name-hint"
                        />
                        <p id="map-name-hint" className="text-xs text-gray-400 mt-1">
                            Choose a descriptive name for your content strategy map
                        </p>
                    </div>
                </div>
            </form>
        </Modal>
    );
};

export default NewMapModal;