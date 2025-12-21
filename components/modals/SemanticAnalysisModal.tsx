import React from 'react';
import { SemanticAnalysisResult, SemanticPair } from '../../types';
import { Modal } from '../ui/Modal';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';

interface SemanticAnalysisModalProps {
  isOpen: boolean;
  onClose: () => void;
  result: SemanticAnalysisResult | null;
}

const getRelationshipStyles = (type: SemanticPair['relationship']['type']) => {
    switch (type) {
        case 'SIBLING':
            return 'bg-green-800 text-green-200';
        case 'RELATED':
            return 'bg-blue-800 text-blue-200';
        case 'DISTANT':
            return 'bg-gray-700 text-gray-300';
        default:
            return 'bg-gray-700 text-gray-300';
    }
}

const SemanticAnalysisModal: React.FC<SemanticAnalysisModalProps> = ({ isOpen, onClose, result }) => {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Semantic Relationship Analysis"
      description="View semantic relationships between topics, similarity scores, and linking suggestions"
      maxWidth="max-w-4xl"
      footer={<Button onClick={onClose} variant="secondary">Close</Button>}
    >
            {!result ? (
                 <p className="text-gray-400 text-center py-10">No analysis data available. Run the analysis first.</p>
            ) : (
                <div className="space-y-6">
                    <Card className="p-4 bg-gray-900/50">
                        <h3 className="font-semibold text-lg text-blue-300 mb-2">AI Summary</h3>
                        <p className="text-gray-300 italic">{result.summary}</p>
                    </Card>

                    {result.pairs.length > 0 && (
                        <div>
                            <h3 className="text-lg font-semibold text-white mb-3">Topic Pairs</h3>
                            <div className="space-y-3">
                                {result.pairs.map((pair, index) => (
                                    <Card key={index} className="p-3 bg-gray-800/80">
                                        <div className="flex justify-between items-center">
                                            <p className="text-sm">
                                                <strong className="text-white">{pair.topicA}</strong> ↔ <strong className="text-white">{pair.topicB}</strong>
                                            </p>
                                            <span className={`px-2 py-1 text-xs font-semibold rounded-full ${getRelationshipStyles(pair.relationship.type)}`}>
                                                {pair.relationship.type}
                                            </span>
                                        </div>
                                        <p className="text-xs text-yellow-400 mt-1">Similarity Score: {pair.distance.weightedScore.toFixed(2)} | Linking Priority: {pair.relationship.internalLinkingPriority}</p>
                                    </Card>
                                ))}
                            </div>
                        </div>
                    )}

                    {result.actionableSuggestions.length > 0 && (
                         <div>
                            <h3 className="text-lg font-semibold text-green-400 mb-3">Actionable Suggestions</h3>
                            <ul className="list-disc list-inside text-gray-300 space-y-1">
                                {result.actionableSuggestions.map((suggestion, index) => (
                                    <li key={index}>{suggestion}</li>
                                ))}
                            </ul>
                         </div>
                    )}
                </div>
            )}
    </Modal>
  );
};

export default SemanticAnalysisModal;