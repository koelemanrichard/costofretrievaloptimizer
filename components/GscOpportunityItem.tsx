
import React from 'react';
// FIX: Corrected import path for 'types' to be relative, fixing module resolution error.
// FIX: Changed import to be a relative path.
import { GscOpportunity } from '../types';
import { Button } from './ui/Button';

interface GscOpportunityItemProps {
    opportunity: GscOpportunity;
    onAddTopic: (title: string) => void;
}

const GscOpportunityItem: React.FC<GscOpportunityItemProps> = ({ opportunity, onAddTopic }) => {
    return (
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 bg-gray-800 p-3 rounded-md">
            <div className='flex-grow'>
                <p className="font-semibold text-white">{opportunity.query}</p>
                <p className="text-sm text-gray-400 mt-1">Impressions: {opportunity.impressions.toLocaleString()} | CTR: {(opportunity.ctr * 100).toFixed(2)}%</p>
                <p className="text-sm text-cyan-300/90 mt-2 italic">Reasoning: {opportunity.reasoning}</p>
                <p className="text-xs text-gray-500 mt-1">Related to: {opportunity.relatedKnowledgeTerms.join(', ')}</p>
            </div>
            <div className="flex-shrink-0">
                <Button onClick={() => onAddTopic(opportunity.query)} className="text-xs py-1 px-3">Add Topic</Button>
            </div>
        </div>
    );
};

export default React.memo(GscOpportunityItem);
