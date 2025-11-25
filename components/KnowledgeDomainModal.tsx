
import React, { useState } from 'react';
// FIX: Corrected import path for 'types' to be relative, fixing module resolution errors.
// FIX: Changed import to be a relative path and added KnowledgeGraph interface.
// FIX: Corrected import path for 'types' to be relative, fixing module resolution errors.
import { TopicRecommendation, KnowledgeNode, KnowledgeGraph } from '../types';
// FIX: Corrected import path to be relative.
import { Loader } from './ui/Loader';
// FIX: Corrected import path to be a relative path.
import { Card } from './ui/Card';
// FIX: Corrected import path to be a relative path.
import { Button } from './ui/Button';
// FIX: Corrected import path to be a relative path.
import { sanitizeForUI } from '../utils/helpers';
// FIX: Corrected import path to be a relative path.
import { InfoTooltip } from './ui/InfoTooltip';
// FIX: Corrected import path to be a relative path.
import { Textarea } from './ui/Textarea';

interface KnowledgeDomainModalProps {
  isOpen: boolean;
  onClose: () => void;
  knowledgeGraph: KnowledgeGraph | null;
  recommendations: TopicRecommendation[] | null;
  onAddTopicIntelligently: (recommendation: TopicRecommendation) => void;
  isLoading: boolean;
  error: string | null;
  onExpandKnowledgeDomain: () => void;
  isExpandingKnowledgeDomain: boolean;
  onFindAndAddMissingKnowledgeTerms: () => void;
  isFindingMissingTerms: boolean;
}

const CategoryBadge: React.FC<{ category: TopicRecommendation['category']}> = ({ category }) => {
    const styles = {
        'GAP_FILLING': 'bg-yellow-800 text-yellow-300 border-yellow-700',
        'COMPETITOR_BASED': 'bg-red-800 text-red-300 border-red-700',
        'EXPANSION': 'bg-indigo-800 text-indigo-300 border-indigo-700',
    };
    const text = {
        'GAP_FILLING': 'Gap Filling',
        'COMPETITOR_BASED': 'Competitor Based',
        'EXPANSION': 'Topical Expansion',
    }

    return (
        <span className={`px-2 py-1 text-xs font-medium rounded-full border ${styles[category]}`}>
            {text[category]}
        </span>
    );
}

const SparqlQueryTab: React.FC<{ knowledgeGraph: KnowledgeGraph }> = ({ knowledgeGraph }) => {
    const [query, setQuery] = useState(`SELECT ?term ?importance ?definition\nWHERE {\n  ?node term ?term .\n  ?node importance ?importance .\n  ?node definition ?definition .\n}\nLIMIT 10`);
    const [results, setResults] = useState<Record<string, any>[] | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);

    const handleRunQuery = () => {
        setIsLoading(true);
        setError(null);
        setResults(null);
        try {
            const queryResult = knowledgeGraph.query(query);
            setResults(queryResult);
        } catch (e) {
            setError(e instanceof Error ? e.message : "An unknown error occurred.");
        } finally {
            setIsLoading(false);
        }
    };

    const headers = results && results.length > 0 ? Object.keys(results[0]) : [];

    return (
        <div className="space-y-4">
            <Textarea 
                value={query} 
                onChange={(e) => setQuery(e.target.value)}
                rows={6}
                className="font-mono text-sm"
                placeholder="Enter your SPARQL-like query..."
            />
            <Button onClick={handleRunQuery} disabled={isLoading}>
                {isLoading ? <Loader /> : "Run Query"}
            </Button>
            {error && <p className="text-red-400 bg-red-900/20 p-2 rounded-md">{error}</p>}
            {results && (
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left text-gray-400 mt-4">
                        <thead className="text-xs text-gray-300 uppercase bg-gray-700">
                            <tr>
                                {headers.map(header => <th key={header} scope="col" className="px-4 py-3">{header}</th>)}
                            </tr>
                        </thead>
                        <tbody>
                            {results.map((row, index) => (
                                <tr key={index} className="bg-gray-800 border-b border-gray-700 hover:bg-gray-700/50">
                                    {headers.map(header => <td key={header} className="px-4 py-3 font-medium text-white break-words">{String(row[header])}</td>)}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                     <p className="text-xs text-gray-500 mt-2">{results.length} results returned.</p>
                </div>
            )}
        </div>
    );
};

const KnowledgeDomainModal: React.FC<KnowledgeDomainModalProps> = ({ 
    isOpen, 
    onClose, 
    knowledgeGraph, 
    recommendations, 
    onAddTopicIntelligently, 
    isLoading, 
    error,
    onExpandKnowledgeDomain,
    isExpandingKnowledgeDomain,
    onFindAndAddMissingKnowledgeTerms,
    isFindingMissingTerms
}) => {
  const [activeTab, setActiveTab] = useState<'nodes' | 'sparql'>('nodes');
  if (!isOpen) return null;

  const nodes = knowledgeGraph ? Array.from(knowledgeGraph.getNodes().values()) : null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-70 z-50 flex justify-center items-center p-4" onClick={onClose}>
      <Card className="w-full max-w-6xl max-h-[90vh] flex flex-col" onClick={e => e.stopPropagation()}>
        <div className="sticky top-0 bg-gray-800 p-4 border-b border-gray-700 flex justify-between items-center z-10 flex-shrink-0">
            <div className='flex items-center flex-wrap gap-4'>
                <h2 className="text-xl font-bold text-white">Knowledge Domain Analysis</h2>
            </div>
          <button onClick={onClose} className="text-gray-400 text-2xl leading-none hover:text-white">&times;</button>
        </div>
        
        <div className="p-6 overflow-y-auto">
          {(isLoading || isFindingMissingTerms) && (
            <div className="flex flex-col items-center justify-center py-20">
                <Loader />
                <p className='mt-2 text-gray-300'>{isLoading ? 'Analyzing domain...' : 'Finding missing terms...'}</p>
            </div>
           )}

          {error && !isLoading && !isFindingMissingTerms && <div className="text-red-500 text-center py-10">{sanitizeForUI(error)}</div>}
          
          {nodes && !isLoading && !isFindingMissingTerms && (
            <div>
              <div className="border-b border-gray-700 mb-4">
                  <nav className="-mb-px flex space-x-4" aria-label="Tabs">
                      <button onClick={() => setActiveTab('nodes')} className={`${activeTab === 'nodes' ? 'border-blue-500 text-blue-400' : 'border-transparent text-gray-400 hover:text-gray-200 hover:border-gray-500'} whitespace-nowrap py-3 px-1 border-b-2 font-medium text-sm transition-colors`}>
                          Nodes & Recommendations
                      </button>
                      <button onClick={() => setActiveTab('sparql')} className={`${activeTab === 'sparql' ? 'border-blue-500 text-blue-400' : 'border-transparent text-gray-400 hover:text-gray-200 hover:border-gray-500'} whitespace-nowrap py-3 px-1 border-b-2 font-medium text-sm transition-colors`}>
                          Advanced SPARQL Query
                      </button>
                  </nav>
              </div>

              {activeTab === 'nodes' && (
                <div className="space-y-8">
                    <div>
                        <h3 className="text-lg font-semibold text-blue-400 mb-3 flex items-center">
                            Knowledge Graph Nodes
                            <InfoTooltip text="Key entities and concepts identified within the semantic field of your main topic." />
                        </h3>
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm text-left text-gray-400">
                                <thead className="text-xs text-gray-300 uppercase bg-gray-700">
                                <tr>
                                    <th scope="col" className="px-4 py-3">Term</th>
                                    <th scope="col" className="px-4 py-3">Importance</th>
                                    <th scope="col" className="px-4 py-3">Definition</th>
                                    <th scope="col" className="px-4 py-3">Source</th>
                                </tr>
                                </thead>
                                <tbody>
                                {nodes.map((node: KnowledgeNode, index) => (
                                    <tr key={index} className="bg-gray-800 border-b border-gray-700 hover:bg-gray-700/50">
                                    <td className="px-4 py-4 font-medium text-white">{node.term}</td>
                                    <td className="px-4 py-4 text-center">{node.metadata.importance}/10</td>
                                    <td className="px-4 py-4">{node.definition}</td>
                                    <td className="px-4 py-4">{node.metadata.source}</td>
                                    </tr>
                                ))}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    {recommendations && recommendations.length > 0 && (
                        <div>
                            <h3 className="text-lg font-semibold text-green-400 mb-3">Strategic Recommendations</h3>
                            <p className="text-sm text-gray-400 mb-4">The AI has identified the following semantic and competitive gaps in your topical map. Add them to improve your content coverage.</p>
                            <div className="space-y-4">
                                {recommendations.map(rec => (
                                    <Card key={rec.id} className="p-4 bg-gray-800/80">
                                        <div className="flex justify-between items-start gap-4">
                                            <div className="flex-grow">
                                                <div className="flex items-center gap-3 mb-1">
                                                    <h4 className="font-semibold text-white">{rec.title}</h4>
                                                    <CategoryBadge category={rec.category} />
                                                </div>
                                                <p className="text-xs text-green-400 font-mono">/{rec.slug}</p>
                                                <p className="text-sm text-gray-400 mt-2">{rec.description}</p>
                                                <p className="text-sm text-cyan-300/90 mt-2 italic border-l-2 border-cyan-500/20 pl-3">
                                                    <strong>Reasoning:</strong> {rec.reasoning}
                                                </p>
                                            </div>
                                            <div className="flex-shrink-0 mt-1">
                                                <Button onClick={() => onAddTopicIntelligently(rec)} className="text-xs py-1 px-3">Add Topic</Button>
                                            </div>
                                        </div>
                                    </Card>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
              )}
              {activeTab === 'sparql' && knowledgeGraph && <SparqlQueryTab knowledgeGraph={knowledgeGraph} />}
            </div>
          )}
        </div>
      </Card>
    </div>
  );
};

export default KnowledgeDomainModal;
