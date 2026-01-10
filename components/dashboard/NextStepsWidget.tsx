
import React from 'react';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { Recommendation, RecommendationType } from '../../services/recommendationEngine';

interface NextStepsWidgetProps {
    recommendations: Recommendation[];
    onAction: (type: RecommendationType) => void;
}

export const NextStepsWidget: React.FC<NextStepsWidgetProps> = ({ recommendations, onAction }) => {
    // Ensure recommendations is always an array
    const safeRecommendations = recommendations || [];
    if (safeRecommendations.length === 0) return null;

    const primary = safeRecommendations[0];
    const secondary = safeRecommendations.slice(1, 3);

    const getIcon = (type: RecommendationType) => {
        switch(type) {
            case 'GENERATE_INITIAL_MAP': return '🗺️';
            case 'ANALYZE_DOMAIN': return '🔍';
            case 'GENERATE_BRIEFS': return '📝';
            case 'VALIDATE_MAP': return '🛡️';
            case 'FIX_VALIDATION_ISSUES': return '🔧';
            case 'EXPAND_TOPICS': return '✨';
            case 'EXPORT_DATA': return '📤';
            default: return '💡';
        }
    };

    const getBgColor = (priority: string) => {
        switch(priority) {
            case 'CRITICAL': return 'bg-red-900/20 border-red-700';
            case 'HIGH': return 'bg-blue-900/20 border-blue-700';
            case 'MEDIUM': return 'bg-yellow-900/10 border-yellow-800';
            default: return 'bg-gray-800 border-gray-700';
        }
    };

    return (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-8">
            {/* Primary Recommendation */}
            <div className="lg:col-span-2">
                <Card className={`h-full p-6 flex flex-col justify-between border-2 ${getBgColor(primary.priority)}`}>
                    <div>
                        <div className="flex justify-between items-start mb-2">
                            <span className="text-xs font-bold uppercase tracking-wider opacity-70 flex items-center gap-2">
                                <span className="animate-pulse text-green-400">●</span> Suggested Next Step
                            </span>
                            <span className="text-2xl">{getIcon(primary.type)}</span>
                        </div>
                        <h3 className="text-2xl font-bold text-white mb-2">{primary.title}</h3>
                        <p className="text-gray-300 text-sm max-w-xl">{primary.description}</p>
                    </div>
                    <div className="mt-6">
                        <Button onClick={() => onAction(primary.type)} className="flex items-center gap-2">
                            {primary.actionLabel} <span>→</span>
                        </Button>
                    </div>
                </Card>
            </div>

            {/* Secondary Recommendations */}
            <div className="space-y-4">
                {secondary.map(rec => (
                    <Card key={rec.id} className="p-4 bg-gray-800/50 border border-gray-700 flex flex-col justify-between h-[calc(50%-0.5rem)]">
                        <div>
                            <div className="flex justify-between items-center mb-1">
                                <h4 className="font-semibold text-gray-200 text-sm">{rec.title}</h4>
                                <span className="text-lg">{getIcon(rec.type)}</span>
                            </div>
                            <p className="text-xs text-gray-400 line-clamp-2">{rec.description}</p>
                        </div>
                        <button 
                            onClick={() => onAction(rec.type)}
                            className="text-xs text-blue-400 hover:text-blue-300 font-medium mt-2 text-left"
                        >
                            {rec.actionLabel} &raquo;
                        </button>
                    </Card>
                ))}
                {secondary.length === 0 && (
                    <Card className="p-4 bg-gray-800/30 border border-gray-700/50 h-full flex items-center justify-center text-gray-500 text-sm italic">
                        No other immediate actions.
                    </Card>
                )}
            </div>
        </div>
    );
};
