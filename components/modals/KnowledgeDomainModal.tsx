import React, { useState, useId } from 'react';
import { TopicRecommendation, KnowledgeNode, KnowledgeGraph, SemanticTriple } from '../../types';
import { Loader } from '../ui/Loader';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { Modal } from '../ui/Modal';
import { sanitizeForUI } from '../../utils/helpers';
import { InfoTooltip } from '../ui/InfoTooltip';
import { Textarea } from '../ui/Textarea';
import { KnowledgeGraphTree } from '../KnowledgeGraphTree';

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
  eavs?: SemanticTriple[];
  centralEntity?: string;
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
    isFindingMissingTerms,
    eavs,
    centralEntity
}) => {
  const [activeTab, setActiveTab] = useState<'nodes' | 'tree' | 'sparql'>('nodes');
  const tabId = useId();

  const nodes = knowledgeGraph ? Array.from(knowledgeGraph.getNodes().values()) : null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Knowledge Domain Analysis"
      description="Explore and expand your content's semantic knowledge domain"
      maxWidth="max-w-6xl"
    >
      <div>
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
                  <div className="-mb-px flex space-x-4" role="tablist" aria-label="Knowledge domain views">
                      <button
                          role="tab"
                          id={`${tabId}-nodes-tab`}
                          aria-selected={activeTab === 'nodes'}
                          aria-controls={`${tabId}-nodes-panel`}
                          tabIndex={activeTab === 'nodes' ? 0 : -1}
                          onClick={() => setActiveTab('nodes')}
                          className={`${activeTab === 'nodes' ? 'border-blue-500 text-blue-400' : 'border-transparent text-gray-400 hover:text-gray-200 hover:border-gray-500'} whitespace-nowrap py-3 px-1 border-b-2 font-medium text-sm transition-colors`}
                      >
                          Nodes & Recommendations
                      </button>
                      <button
                          role="tab"
                          id={`${tabId}-tree-tab`}
                          aria-selected={activeTab === 'tree'}
                          aria-controls={`${tabId}-tree-panel`}
                          tabIndex={activeTab === 'tree' ? 0 : -1}
                          onClick={() => setActiveTab('tree')}
                          className={`${activeTab === 'tree' ? 'border-cyan-500 text-cyan-400' : 'border-transparent text-gray-400 hover:text-gray-200 hover:border-gray-500'} whitespace-nowrap py-3 px-1 border-b-2 font-medium text-sm transition-colors flex items-center gap-1`}
                      >
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
                          </svg>
                          EAV Tree View
                      </button>
                      <button
                          role="tab"
                          id={`${tabId}-sparql-tab`}
                          aria-selected={activeTab === 'sparql'}
                          aria-controls={`${tabId}-sparql-panel`}
                          tabIndex={activeTab === 'sparql' ? 0 : -1}
                          onClick={() => setActiveTab('sparql')}
                          className={`${activeTab === 'sparql' ? 'border-blue-500 text-blue-400' : 'border-transparent text-gray-400 hover:text-gray-200 hover:border-gray-500'} whitespace-nowrap py-3 px-1 border-b-2 font-medium text-sm transition-colors`}
                      >
                          Advanced SPARQL Query
                      </button>
                  </div>
              </div>

              {activeTab === 'nodes' && (
                <div
                    role="tabpanel"
                    id={`${tabId}-nodes-panel`}
                    aria-labelledby={`${tabId}-nodes-tab`}
                    className="space-y-8"
                >
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

              {activeTab === 'tree' && (
                <div
                    role="tabpanel"
                    id={`${tabId}-tree-panel`}
                    aria-labelledby={`${tabId}-tree-tab`}
                >
                    <h3 className="text-lg font-semibold text-cyan-400 mb-3 flex items-center">
                        EAV Knowledge Graph Tree
                        <InfoTooltip text="Hierarchical view of your semantic triples (Entity-Attribute-Value), grouped by subject entity and attribute relation." />
                    </h3>
                    {eavs && eavs.length > 0 ? (
                        <KnowledgeGraphTree
                            eavs={eavs}
                            centralEntity={centralEntity}
                        />
                    ) : (
                        <div className="text-center py-10 text-gray-500">
                            <p>No EAVs available for this map.</p>
                            <p className="text-sm mt-2">Run the EAV Discovery Wizard to generate semantic triples.</p>
                        </div>
                    )}
                </div>
              )}

              {activeTab === 'sparql' && knowledgeGraph && (
                <div
                    role="tabpanel"
                    id={`${tabId}-sparql-panel`}
                    aria-labelledby={`${tabId}-sparql-tab`}
                >
                    <SparqlQueryTab knowledgeGraph={knowledgeGraph} />
                </div>
              )}
            </div>
          )}
      </div>
    </Modal>
  );
};

export default KnowledgeDomainModal;
