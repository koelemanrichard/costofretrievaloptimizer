
import React, { useState } from 'react';
import { SemanticTriple, AttributeCategory } from '../../types';
import { Input } from '../ui/Input';
import { Select } from '../ui/Select';
import { Label } from '../ui/Label';

interface TripleEditRowProps {
    triple: SemanticTriple;
    onChange: (updatedTriple: SemanticTriple) => void;
    onDelete: () => void;
}

// Category color coding
const CATEGORY_COLORS: Record<string, string> = {
    ROOT: 'text-blue-400',
    UNIQUE: 'text-purple-400',
    RARE: 'text-orange-400',
    COMMON: 'text-gray-400',
    // Legacy mappings
    CORE_DEFINITION: 'text-blue-400',
    SEARCH_DEMAND: 'text-orange-400',
    COMPETITIVE_EXPANSION: 'text-purple-400',
    COMPOSITE: 'text-gray-400'
};

export const TripleEditRow: React.FC<TripleEditRowProps> = ({ triple, onChange, onDelete }) => {
    const [isExpanded, setIsExpanded] = useState(false);

    const handleChange = (section: 'subject' | 'predicate' | 'object', field: string, value: string) => {
        onChange({
            ...triple,
            [section]: {
                ...triple[section],
                [field]: value
            }
        });
    };

    const handleCategoryChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        onChange({
            ...triple,
            predicate: {
                ...triple.predicate,
                category: e.target.value as AttributeCategory
            }
        });
    };

    const handleMetadataChange = (section: 'validation' | 'presentation', field: string, value: any) => {
        const currentMetadata = triple.metadata || {};
        const currentSection = currentMetadata[section] || {};

        onChange({
            ...triple,
            metadata: {
                ...currentMetadata,
                [section]: {
                    ...currentSection,
                    [field]: value
                }
            }
        });
    };

    const handleLexicalChange = (field: 'synonyms' | 'antonyms' | 'hypernyms', value: string) => {
        // Parse comma-separated values into array, trim whitespace
        const values = value.split(',').map(v => v.trim()).filter(v => v.length > 0);
        onChange({
            ...triple,
            lexical: {
                ...triple.lexical,
                [field]: values
            }
        });
    };

    // Get display value for lexical arrays
    const getLexicalDisplay = (field: 'synonyms' | 'antonyms' | 'hypernyms'): string => {
        return triple.lexical?.[field]?.join(', ') || '';
    };

    // Get category color class
    const categoryColor = CATEGORY_COLORS[triple.predicate?.category || 'COMMON'] || 'text-gray-400';

    return (
        <div className="bg-gray-800 border border-gray-700 rounded-lg mb-2 overflow-hidden">
            {/* Main Row */}
            <div className="p-3 flex items-start gap-2">
                <div className="flex-1 grid grid-cols-1 md:grid-cols-12 gap-2">
                    {/* Subject */}
                    <div className="md:col-span-3">
                        <Input 
                            value={triple.subject.label}
                            onChange={(e) => handleChange('subject', 'label', e.target.value)}
                            placeholder="Entity (Subject)"
                            className="!text-sm !py-1.5"
                        />
                    </div>
                    
                    {/* Predicate */}
                    <div className="md:col-span-3">
                        <Input 
                            value={triple.predicate.relation}
                            onChange={(e) => handleChange('predicate', 'relation', e.target.value)}
                            placeholder="Attribute (Predicate)"
                            className="!text-sm !py-1.5 font-mono text-purple-300"
                        />
                    </div>

                    {/* Object */}
                    <div className="md:col-span-3">
                        <Input 
                            value={String(triple.object.value)}
                            onChange={(e) => handleChange('object', 'value', e.target.value)}
                            placeholder="Value (Object)"
                            className="!text-sm !py-1.5"
                        />
                    </div>

                     {/* Category Selector */}
                     <div className="md:col-span-3">
                         <Select
                            value={triple.predicate.category || 'COMMON'}
                            onChange={handleCategoryChange}
                            className={`!text-xs !py-1.5 ${categoryColor}`}
                        >
                            <option value="ROOT">ROOT (Identity)</option>
                            <option value="UNIQUE">UNIQUE (Differentiator)</option>
                            <option value="RARE">RARE (Expert Detail)</option>
                            <option value="COMMON">COMMON (Generic)</option>
                         </Select>
                     </div>
                </div>

                <div className="flex items-center gap-1">
                    <button 
                        type="button"
                        onClick={() => setIsExpanded(!isExpanded)}
                        className={`p-1.5 rounded hover:bg-gray-700 transition-colors ${isExpanded ? 'text-blue-400' : 'text-gray-500'}`}
                        title="Toggle Details"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                        </svg>
                    </button>
                    <button 
                        type="button"
                        onClick={onDelete}
                        className="p-1.5 rounded text-gray-500 hover:text-red-400 hover:bg-gray-700 transition-colors"
                        title="Delete Triple"
                    >
                         <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                    </button>
                </div>
            </div>

            {/* Expanded Metadata Section */}
            {isExpanded && (
                <div className="px-3 pb-3 pt-0 bg-gray-900/50 border-t border-gray-700">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-3">
                        {/* Validation Metadata */}
                        <div className="bg-black/20 p-2 rounded border border-gray-700/50">
                             <Label className="text-[10px] uppercase tracking-wider text-gray-500 mb-2">Validation Rules</Label>
                             <div className="space-y-2">
                                 <div className="flex items-center justify-between">
                                     <span className="text-xs text-gray-400">Type</span>
                                     <Select 
                                        value={triple.metadata?.validation?.type || 'STRING'}
                                        onChange={(e) => handleMetadataChange('validation', 'type', e.target.value)}
                                        className="!text-[10px] !py-0.5 !w-24"
                                     >
                                         <option value="STRING">String</option>
                                         <option value="NUMBER">Number</option>
                                         <option value="CURRENCY">Currency</option>
                                         <option value="BOOLEAN">Boolean</option>
                                     </Select>
                                 </div>
                                 {/* Add Min/Max inputs if needed in future */}
                             </div>
                        </div>

                        {/* Presentation Metadata */}
                         <div className="bg-black/20 p-2 rounded border border-gray-700/50">
                             <Label className="text-[10px] uppercase tracking-wider text-gray-500 mb-2">UI Presentation (LIFT)</Label>
                             <div className="flex items-center justify-between">
                                 <span className="text-xs text-gray-400">Prominence</span>
                                 <Select 
                                    value={triple.metadata?.presentation?.prominence || 'STANDARD'}
                                    onChange={(e) => handleMetadataChange('presentation', 'prominence', e.target.value)}
                                    className="!text-[10px] !py-0.5 !w-28"
                                 >
                                     <option value="STANDARD">Standard</option>
                                     <option value="CENTERPIECE">Centerpiece (High)</option>
                                     <option value="SUPPLEMENTARY">Supplementary</option>
                                 </Select>
                             </div>
                        </div>

                        {/* Data Enrichment */}
                        <div className="bg-black/20 p-2 rounded border border-gray-700/50">
                            <Label className="text-[10px] uppercase tracking-wider text-gray-500 mb-2">Data Details</Label>
                            <div className="space-y-2">
                                <div className="grid grid-cols-2 gap-2">
                                    <Input
                                        placeholder="Unit (e.g. kg)"
                                        value={triple.object.unit || ''}
                                        onChange={(e) => onChange({ ...triple, object: { ...triple.object, unit: e.target.value } })}
                                        className="!text-xs !py-0.5 !h-6"
                                    />
                                    <Input
                                        placeholder="Truth Range"
                                        value={triple.object.truth_range || ''}
                                        onChange={(e) => onChange({ ...triple, object: { ...triple.object, truth_range: e.target.value } })}
                                        className="!text-xs !py-0.5 !h-6"
                                        title="e.g. 7.0 - 7.5"
                                    />
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Lexical Enrichment Section */}
                    <div className="mt-3 pt-3 border-t border-gray-700/50">
                        <Label className="text-[10px] uppercase tracking-wider text-gray-500 mb-2 flex items-center gap-2">
                            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" />
                            </svg>
                            Lexical Enrichment (for semantic richness)
                        </Label>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                            {/* Synonyms */}
                            <div>
                                <label className="text-[10px] text-gray-400 mb-1 block">
                                    Synonyms <span className="text-gray-600">(comma-separated)</span>
                                </label>
                                <Input
                                    placeholder="e.g. alternative, similar, related"
                                    value={getLexicalDisplay('synonyms')}
                                    onChange={(e) => handleLexicalChange('synonyms', e.target.value)}
                                    className="!text-xs !py-1 !h-7 bg-green-900/20 border-green-800/30 placeholder:text-gray-600"
                                    title="Alternative terms that mean the same thing"
                                />
                                {triple.lexical?.synonyms && triple.lexical.synonyms.length > 0 && (
                                    <div className="flex flex-wrap gap-1 mt-1">
                                        {triple.lexical.synonyms.slice(0, 3).map((syn, i) => (
                                            <span key={i} className="px-1.5 py-0.5 text-[10px] bg-green-900/30 text-green-300 rounded">
                                                {syn}
                                            </span>
                                        ))}
                                        {triple.lexical.synonyms.length > 3 && (
                                            <span className="px-1.5 py-0.5 text-[10px] text-gray-500">
                                                +{triple.lexical.synonyms.length - 3} more
                                            </span>
                                        )}
                                    </div>
                                )}
                            </div>

                            {/* Antonyms */}
                            <div>
                                <label className="text-[10px] text-gray-400 mb-1 block">
                                    Antonyms <span className="text-gray-600">(comma-separated)</span>
                                </label>
                                <Input
                                    placeholder="e.g. opposite, contrasting"
                                    value={getLexicalDisplay('antonyms')}
                                    onChange={(e) => handleLexicalChange('antonyms', e.target.value)}
                                    className="!text-xs !py-1 !h-7 bg-red-900/20 border-red-800/30 placeholder:text-gray-600"
                                    title="Opposite or contrasting concepts"
                                />
                                {triple.lexical?.antonyms && triple.lexical.antonyms.length > 0 && (
                                    <div className="flex flex-wrap gap-1 mt-1">
                                        {triple.lexical.antonyms.slice(0, 3).map((ant, i) => (
                                            <span key={i} className="px-1.5 py-0.5 text-[10px] bg-red-900/30 text-red-300 rounded">
                                                {ant}
                                            </span>
                                        ))}
                                        {triple.lexical.antonyms.length > 3 && (
                                            <span className="px-1.5 py-0.5 text-[10px] text-gray-500">
                                                +{triple.lexical.antonyms.length - 3} more
                                            </span>
                                        )}
                                    </div>
                                )}
                            </div>

                            {/* Hypernyms */}
                            <div>
                                <label className="text-[10px] text-gray-400 mb-1 block">
                                    Hypernyms <span className="text-gray-600">(broader terms)</span>
                                </label>
                                <Input
                                    placeholder="e.g. category, type, class"
                                    value={getLexicalDisplay('hypernyms')}
                                    onChange={(e) => handleLexicalChange('hypernyms', e.target.value)}
                                    className="!text-xs !py-1 !h-7 bg-blue-900/20 border-blue-800/30 placeholder:text-gray-600"
                                    title="Broader category terms"
                                />
                                {triple.lexical?.hypernyms && triple.lexical.hypernyms.length > 0 && (
                                    <div className="flex flex-wrap gap-1 mt-1">
                                        {triple.lexical.hypernyms.slice(0, 3).map((hyp, i) => (
                                            <span key={i} className="px-1.5 py-0.5 text-[10px] bg-blue-900/30 text-blue-300 rounded">
                                                {hyp}
                                            </span>
                                        ))}
                                        {triple.lexical.hypernyms.length > 3 && (
                                            <span className="px-1.5 py-0.5 text-[10px] text-gray-500">
                                                +{triple.lexical.hypernyms.length - 3} more
                                            </span>
                                        )}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
