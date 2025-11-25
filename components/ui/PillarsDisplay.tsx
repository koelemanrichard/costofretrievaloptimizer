// components/ui/PillarsDisplay.tsx
import React, { useState, useEffect } from 'react';
import { SEOPillars } from '../../types';
import { Card } from './Card';
import { Button } from './Button';
import { Input } from './Input';
import { Textarea } from './Textarea';
import { Label } from './Label';

interface PillarsDisplayProps {
  pillars: SEOPillars;
  onSave: (newPillars: SEOPillars) => void;
  disabled: boolean;
}

const PillarsDisplay: React.FC<PillarsDisplayProps> = ({ pillars, onSave, disabled }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState<SEOPillars>(pillars);

  useEffect(() => {
    setFormData(pillars);
  }, [pillars]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSave = () => {
    onSave(formData);
    setIsEditing(false);
  };

  const handleCancel = () => {
    setFormData(pillars);
    setIsEditing(false);
  };

  return (
    <Card className="p-6">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-2xl font-bold text-white">SEO Pillars</h2>
        {!isEditing && (
          <Button onClick={() => setIsEditing(true)} variant="secondary" disabled={disabled}>
            Edit Pillars
          </Button>
        )}
      </div>

      {isEditing ? (
        <div className="space-y-4">
          <div>
            <Label htmlFor="centralEntity">Central Entity</Label>
            <Input id="centralEntity" name="centralEntity" value={formData.centralEntity} onChange={handleChange} />
          </div>
          <div>
            <Label htmlFor="sourceContext">Source Context</Label>
            <Textarea id="sourceContext" name="sourceContext" value={formData.sourceContext} onChange={handleChange} rows={3} />
          </div>
          <div>
            <Label htmlFor="centralSearchIntent">Central Search Intent</Label>
            <Input id="centralSearchIntent" name="centralSearchIntent" value={formData.centralSearchIntent} onChange={handleChange} />
          </div>
          <div className="flex justify-end gap-4 pt-2">
            <Button onClick={handleCancel} variant="secondary">Cancel</Button>
            <Button onClick={handleSave}>Save Changes</Button>
          </div>
        </div>
      ) : (
        <div className="space-y-4 text-gray-300">
          <div>
            <h4 className="text-sm font-semibold text-gray-400">Central Entity</h4>
            <p>{pillars.centralEntity}</p>
          </div>
          <div>
            <h4 className="text-sm font-semibold text-gray-400">Source Context</h4>
            <p className="whitespace-pre-wrap">{pillars.sourceContext}</p>
          </div>
          <div>
            <h4 className="text-sm font-semibold text-gray-400">Central Search Intent</h4>
            <p>{pillars.centralSearchIntent}</p>
          </div>
        </div>
      )}
    </Card>
  );
};

export default PillarsDisplay;