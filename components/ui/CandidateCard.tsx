
import React from 'react';
import { Button } from './Button';
import { Card } from './Card';

interface CandidateCardProps {
  title: string;
  reasoning: string;
  score: number;
  onSelect: () => void;
  isSelected: boolean;
}

export const CandidateCard: React.FC<CandidateCardProps> = ({ title, reasoning, score, onSelect, isSelected }) => {
  return (
    <Card className={`p-4 border-2 transition-all ${isSelected ? 'border-blue-500 bg-blue-900/30' : 'border-gray-700 hover:border-gray-600'}`}>
      <div className="flex justify-between items-start">
        <h4 className="font-bold text-white text-lg">{title}</h4>
        <div className="text-sm font-semibold bg-gray-700 text-gray-200 px-2 py-1 rounded-md">{`${Math.round(score * 100)}%`}</div>
      </div>
      <p className="text-sm text-gray-400 mt-2">{reasoning}</p>
      <div className="text-right mt-4">
        <Button onClick={onSelect} variant={isSelected ? 'primary' : 'secondary'} className="!py-1 !px-4 text-sm">
          {isSelected ? 'Selected' : 'Select'}
        </Button>
      </div>
    </Card>
  );
};
