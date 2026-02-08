import React from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useAppState } from '../../../state/appState';

/**
 * TopicDetailPage - Shows topic overview with brief status, draft status, and action buttons.
 * This is the landing page when clicking a topic from the map.
 */
const TopicDetailPage: React.FC = () => {
    const { state } = useAppState();
    const navigate = useNavigate();
    const { projectId, mapId, topicId } = useParams<{ projectId: string; mapId: string; topicId: string }>();

    const currentMap = state.topicalMaps.find(m => m.id === mapId);
    const topic = currentMap?.topics?.find(t => t.id === topicId);
    const brief = topic ? currentMap?.briefs?.[topic.id] : null;

    if (!topic) {
        return (
            <div className="text-center py-12 text-gray-400">
                Topic not found. It may have been deleted or the map data is still loading.
            </div>
        );
    }

    const hasBrief = !!brief;
    const hasDraft = !!brief?.articleDraft;
    const basePath = `/p/${projectId}/m/${mapId}/topics/${topicId}`;

    return (
        <div className="space-y-6">
            {/* Breadcrumb navigation */}
            <nav className="text-sm text-gray-400">
                <Link to={`/p/${projectId}/m/${mapId}`} className="hover:text-white transition-colors">
                    Map Dashboard
                </Link>
                <span className="mx-2">/</span>
                <span className="text-gray-300">{topic.title}</span>
            </nav>

            {/* Topic header */}
            <div>
                <div className="flex items-center gap-3 mb-2">
                    <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                        topic.type === 'core' ? 'bg-blue-600/20 text-blue-400' : 'bg-purple-600/20 text-purple-400'
                    }`}>
                        {topic.type === 'core' ? 'Core' : 'Supporting'}
                    </span>
                    {topic.parent_topic_id && (
                        <span className="text-xs text-gray-500">
                            Parent: {currentMap?.topics?.find(t => t.id === topic.parent_topic_id)?.title || 'Unknown'}
                        </span>
                    )}
                </div>
                <h1 className="text-3xl font-bold text-white">{topic.title}</h1>
                {topic.query_type && (
                    <p className="text-gray-400 mt-1">Query type: {topic.query_type}</p>
                )}
            </div>

            {/* Status cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Brief status */}
                <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-4">
                    <h3 className="text-sm font-medium text-gray-400 mb-2">Content Brief</h3>
                    {hasBrief ? (
                        <>
                            <div className="flex items-center gap-2 mb-3">
                                <span className="w-2 h-2 rounded-full bg-green-400"></span>
                                <span className="text-green-400 text-sm">Generated</span>
                            </div>
                            <p className="text-xs text-gray-500 mb-3">
                                {brief.structured_outline?.length || 0} sections
                            </p>
                        </>
                    ) : (
                        <div className="flex items-center gap-2 mb-3">
                            <span className="w-2 h-2 rounded-full bg-gray-500"></span>
                            <span className="text-gray-500 text-sm">Not generated</span>
                        </div>
                    )}
                    <button
                        onClick={() => navigate(`${basePath}/brief`)}
                        className="w-full px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-sm rounded transition-colors"
                    >
                        {hasBrief ? 'View Brief' : 'Generate Brief'}
                    </button>
                </div>

                {/* Draft status */}
                <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-4">
                    <h3 className="text-sm font-medium text-gray-400 mb-2">Article Draft</h3>
                    {hasDraft ? (
                        <>
                            <div className="flex items-center gap-2 mb-3">
                                <span className="w-2 h-2 rounded-full bg-green-400"></span>
                                <span className="text-green-400 text-sm">Draft ready</span>
                            </div>
                            <p className="text-xs text-gray-500 mb-3">
                                {Math.round((brief.articleDraft?.length || 0) / 5)} words approx.
                            </p>
                        </>
                    ) : (
                        <div className="flex items-center gap-2 mb-3">
                            <span className="w-2 h-2 rounded-full bg-gray-500"></span>
                            <span className="text-gray-500 text-sm">{hasBrief ? 'Ready to draft' : 'Needs brief first'}</span>
                        </div>
                    )}
                    <button
                        onClick={() => navigate(`${basePath}/draft`)}
                        disabled={!hasBrief}
                        className={`w-full px-3 py-1.5 text-sm rounded transition-colors ${
                            hasBrief
                                ? 'bg-blue-600 hover:bg-blue-700 text-white'
                                : 'bg-gray-700 text-gray-500 cursor-not-allowed'
                        }`}
                    >
                        {hasDraft ? 'Edit Draft' : 'Start Drafting'}
                    </button>
                </div>

                {/* Publish status */}
                <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-4">
                    <h3 className="text-sm font-medium text-gray-400 mb-2">Style & Publish</h3>
                    <div className="flex items-center gap-2 mb-3">
                        <span className="w-2 h-2 rounded-full bg-gray-500"></span>
                        <span className="text-gray-500 text-sm">{hasDraft ? 'Ready to publish' : 'Needs draft first'}</span>
                    </div>
                    <button
                        onClick={() => navigate(`${basePath}/style`)}
                        disabled={!hasDraft}
                        className={`w-full px-3 py-1.5 text-sm rounded transition-colors ${
                            hasDraft
                                ? 'bg-blue-600 hover:bg-blue-700 text-white'
                                : 'bg-gray-700 text-gray-500 cursor-not-allowed'
                        }`}
                    >
                        Style & Publish
                    </button>
                </div>
            </div>

            {/* Topic metadata */}
            {(topic.description || topic.url_slug_hint || topic.canonical_query) && (
                <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-4 space-y-3">
                    <h3 className="text-sm font-medium text-gray-300">Topic Details</h3>
                    {topic.canonical_query && (
                        <div>
                            <span className="text-xs text-gray-500">Canonical Query:</span>
                            <span className="text-sm text-gray-300 ml-2">{topic.canonical_query}</span>
                        </div>
                    )}
                    {topic.url_slug_hint && (
                        <div>
                            <span className="text-xs text-gray-500">URL Slug Hint:</span>
                            <span className="text-sm text-gray-300 ml-2">/{topic.url_slug_hint}</span>
                        </div>
                    )}
                    {topic.attribute_focus && (
                        <div>
                            <span className="text-xs text-gray-500">Attribute Focus:</span>
                            <span className="text-sm text-gray-300 ml-2">{topic.attribute_focus}</span>
                        </div>
                    )}
                    {topic.description && (
                        <div>
                            <span className="text-xs text-gray-500">Description:</span>
                            <p className="text-sm text-gray-300 mt-1">{topic.description}</p>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default TopicDetailPage;
