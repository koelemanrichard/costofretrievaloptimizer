
// components/dashboard/StrategicContextPanel.tsx
import React, { useMemo } from 'react';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { SEOPillars, EnrichedTopic } from '../../types';
import PillarsDisplay from '../ui/PillarsDisplay';
import { Loader } from '../ui/Loader';

interface StrategicContextPanelProps {
    pillars: SEOPillars;
    eavsCount: number;
    competitorsCount: number;
    onEditPillars: (newPillars: SEOPillars) => void;
    onManageEavs: () => void;
    onManageCompetitors: () => void;
    onRegenerateMap: () => void;
    isRegenerating: boolean;
    // Data Enrichment
    onEnrichData?: () => void;
    isEnriching?: boolean;
    topics?: EnrichedTopic[];
    // Blueprint Generation
    onGenerateBlueprints?: () => void;
    isGeneratingBlueprints?: boolean;
    // Business Info
    onEditBusinessInfo?: () => void;
    language?: string;
    region?: string;
}

const StrategicContextPanel: React.FC<StrategicContextPanelProps> = ({
    pillars,
    eavsCount,
    competitorsCount,
    onEditPillars,
    onManageEavs,
    onManageCompetitors,
    onRegenerateMap,
    isRegenerating,
    onEnrichData,
    isEnriching,
    topics = [],
    onGenerateBlueprints,
    isGeneratingBlueprints,
    onEditBusinessInfo,
    language,
    region
}) => {
    // Detect if any topics are missing critical metadata
    const missingMetadataCount = useMemo(() => {
        return topics.filter(t => 
            !t.canonical_query || 
            !t.query_network || 
            t.query_network.length === 0 || 
            !t.url_slug_hint ||
            !t.attribute_focus ||
            !t.query_type ||
            !t.topical_border_note ||
            !t.planned_publication_date
        ).length;
    }, [topics]);

    // Detect topics missing blueprints
    const missingBlueprintsCount = useMemo(() => {
        return topics.filter(t => !t.blueprint).length;
    }, [topics]);

    return (
        <div className="space-y-4">
            {/* Pillars Display Reuse */}
            <PillarsDisplay pillars={pillars} onSave={onEditPillars} disabled={isRegenerating} />

            {/* Context Management Actions */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                {/* Business Settings Card */}
                {onEditBusinessInfo && (
                    <Card className="p-4 flex justify-between items-center">
                        <div>
                            <h4 className="font-semibold text-white">Map Settings</h4>
                            <p className="text-sm text-gray-400">
                                {language || 'en'} / {region || 'Not set'}
                            </p>
                        </div>
                        <Button onClick={onEditBusinessInfo} variant="secondary" className="text-sm py-2">Edit</Button>
                    </Card>
                )}
                <Card className="p-4 flex justify-between items-center">
                    <div>
                        <h4 className="font-semibold text-white">Semantic Triples (EAV)</h4>
                        <p className="text-sm text-gray-400">{eavsCount} defined facts</p>
                    </div>
                    <Button onClick={onManageEavs} variant="secondary" className="text-sm py-2">Manage</Button>
                </Card>
                <Card className="p-4 flex justify-between items-center">
                    <div>
                        <h4 className="font-semibold text-white">Competitors</h4>
                        <p className="text-sm text-gray-400">{competitorsCount} URLs tracked</p>
                    </div>
                    <Button onClick={onManageCompetitors} variant="secondary" className="text-sm py-2">Manage</Button>
                </Card>
                
                {/* Metadata Enrichment Card */}
                {missingMetadataCount > 0 && onEnrichData && (
                    <Card className="p-4 flex justify-between items-center border-yellow-900/30 bg-yellow-900/10">
                        <div>
                            <h4 className="font-semibold text-yellow-400">Metadata Gaps</h4>
                            <p className="text-sm text-gray-400">{missingMetadataCount} topics missing data</p>
                        </div>
                        <Button onClick={onEnrichData} disabled={isEnriching} className="text-sm py-2 bg-yellow-700 hover:bg-yellow-800 text-white">
                            {isEnriching ? <Loader className="w-4 h-4" /> : 'Enrich Data'}
                        </Button>
                    </Card>
                )}

                {/* Blueprint Generation Card */}
                {missingBlueprintsCount > 0 && onGenerateBlueprints && (
                    <Card className="p-4 flex justify-between items-center border-blue-900/30 bg-blue-900/10">
                        <div>
                            <h4 className="font-semibold text-blue-400">Missing Blueprints</h4>
                            <p className="text-sm text-gray-400">{missingBlueprintsCount} topics need plans</p>
                        </div>
                        <Button onClick={onGenerateBlueprints} disabled={isGeneratingBlueprints} className="text-sm py-2 bg-blue-700 hover:bg-blue-800 text-white">
                            {isGeneratingBlueprints ? <Loader className="w-4 h-4" /> : 'Gen Blueprints'}
                        </Button>
                    </Card>
                )}

                <Card className="p-4 flex justify-between items-center border-red-900/30 bg-red-900/10">
                    <div>
                        <h4 className="font-semibold text-red-400">Danger Zone</h4>
                        <p className="text-sm text-gray-400">Re-run AI generation</p>
                    </div>
                    <Button onClick={onRegenerateMap} disabled={isRegenerating} className="text-sm py-2 bg-red-700 hover:bg-red-800">
                        {isRegenerating ? <Loader className="w-4 h-4" /> : 'Regenerate Map'}
                    </Button>
                </Card>
            </div>
        </div>
    );
};

export default StrategicContextPanel;
