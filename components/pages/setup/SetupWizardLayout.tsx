import React, { useMemo } from 'react';
import { Outlet, useParams, useLocation, NavLink } from 'react-router-dom';
import { useAppState } from '../../../state/appState';

const BASE_WIZARD_STEPS = [
    { label: 'Business Info', path: 'business' },
    { label: 'SEO Pillars', path: 'pillars' },
    { label: 'Semantic Triples', path: 'eavs' },
    { label: 'Competitors', path: 'competitors' },
    // Catalog step inserted conditionally for ecommerce
    { label: 'Blueprint', path: 'blueprint' },
];

const CATALOG_STEP = { label: 'Product Catalog', path: 'catalog' };

/**
 * SetupWizardLayout - Provides a progress indicator and layout wrapper
 * for the multi-step setup wizard. Uses <Outlet /> for step content.
 *
 * When websiteType is ECOMMERCE, an optional "Product Catalog" step
 * is inserted between Competitors and Blueprint.
 */
const SetupWizardLayout: React.FC = () => {
    const { projectId, mapId } = useParams<{ projectId: string; mapId: string }>();
    const location = useLocation();
    const { state } = useAppState();
    const basePath = `/p/${projectId}/m/${mapId}/setup`;

    // Conditionally include catalog step for ecommerce projects
    // websiteType is stored per-map in business_info, so check both map-level and global state
    const activeMap = state.topicalMaps.find(m => m.id === mapId);
    const mapBusinessInfo = activeMap?.business_info as Record<string, unknown> | undefined;
    const isEcommerce = (mapBusinessInfo?.websiteType || state.businessInfo.websiteType) === 'ECOMMERCE';

    const WIZARD_STEPS = useMemo(() => {
        if (!isEcommerce) return BASE_WIZARD_STEPS;
        // Insert catalog step after competitors (index 3), before blueprint
        const steps = [...BASE_WIZARD_STEPS];
        steps.splice(4, 0, CATALOG_STEP); // Insert at position 4 (after competitors at 3)
        return steps;
    }, [isEcommerce]);

    // Determine current step index
    const currentStepPath = location.pathname.replace(`${basePath}/`, '').replace(basePath, '');
    const currentStepIndex = WIZARD_STEPS.findIndex(s => s.path === currentStepPath);

    return (
        <div className="max-w-4xl mx-auto">
            {/* Progress bar */}
            <div className="mb-8">
                <div className="flex items-center justify-between">
                    {WIZARD_STEPS.map((step, idx) => (
                        <React.Fragment key={step.path}>
                            <NavLink
                                to={`${basePath}/${step.path}`}
                                className={({ isActive }) => {
                                    const isCompleted = idx < currentStepIndex;
                                    const isCurrent = isActive || idx === currentStepIndex;
                                    return `flex items-center gap-2 text-sm ${
                                        isCurrent
                                            ? 'text-blue-400 font-medium'
                                            : isCompleted
                                                ? 'text-green-400'
                                                : 'text-gray-500'
                                    }`;
                                }}
                            >
                                <span className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold border-2 ${
                                    idx < currentStepIndex
                                        ? 'bg-green-600 border-green-600 text-white'
                                        : idx === currentStepIndex
                                            ? 'border-blue-400 text-blue-400'
                                            : 'border-gray-600 text-gray-600'
                                }`}>
                                    {idx < currentStepIndex ? (
                                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                                        </svg>
                                    ) : (
                                        idx + 1
                                    )}
                                </span>
                                <span className="hidden sm:inline">{step.label}</span>
                            </NavLink>
                            {idx < WIZARD_STEPS.length - 1 && (
                                <div className={`flex-1 h-px mx-2 ${
                                    idx < currentStepIndex ? 'bg-green-600' : 'bg-gray-700'
                                }`} />
                            )}
                        </React.Fragment>
                    ))}
                </div>
            </div>

            {/* Step content */}
            <Outlet />
        </div>
    );
};

export default SetupWizardLayout;
