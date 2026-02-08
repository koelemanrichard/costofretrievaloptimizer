
import React from 'react';
import { Button } from './Button';
import { Card } from './Card';

interface CandidateCardProps {
  title: string;
  reasoning: string;
  score?: number;
  onSelect: () => void;
  isSelected: boolean;
  loading?: boolean;
}

export const CandidateCard: React.FC<CandidateCardProps> = ({ title, reasoning, score, onSelect, isSelected, loading }) => {
  return (
    <Card className={`p-4 border-2 transition-all ${isSelected ? 'border-blue-500 bg-blue-900/30' : 'border-gray-700 hover:border-gray-600'}`}>
      <div className="flex justify-between items-start">
        <h4 className="font-bold text-white text-lg">{title}</h4>
        {score !== undefined && (
          <div className="text-sm font-semibold bg-gray-700 text-gray-200 px-2 py-1 rounded-md">{`${Math.round(score * 100)}%`}</div>
        )}
      </div>
      <p className="text-sm text-gray-400 mt-2">{reasoning}</p>
      <div className="text-right mt-4">
        <Button onClick={onSelect} variant={isSelected ? 'primary' : 'secondary'} className="!py-1 !px-4 text-sm" disabled={loading}>
          {loading ? (
            <span className="flex items-center gap-2">
              <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path>
              </svg>
              Loading...
            </span>
          ) : isSelected ? 'Selected' : 'Select'}
        </Button>
      </div>
    </Card>
  );
};
