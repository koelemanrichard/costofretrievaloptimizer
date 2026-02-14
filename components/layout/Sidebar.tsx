import React, { useState, useEffect } from 'react';
import { NavLink, useParams, useNavigate, useLocation } from 'react-router-dom';
import { useAppState } from '../../state/appState';

interface SidebarProps {
    collapsed: boolean;
    onToggleCollapse: () => void;
}

interface NavItem {
    label: string;
    icon: React.ReactNode;
    to: string;
    end?: boolean;
    onClick?: () => void;
}

interface NavSection {
    title?: string;
    items: NavItem[];
}

// SVG icons as inline components
const Icons = {
    projects: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12.75V12A2.25 2.25 0 014.5 9.75h15A2.25 2.25 0 0121.75 12v.75m-8.69-6.44l-2.12-2.12a1.5 1.5 0 00-1.061-.44H4.5A2.25 2.25 0 002.25 6v12a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9a2.25 2.25 0 00-2.25-2.25h-5.379a1.5 1.5 0 01-1.06-.44z" />
        </svg>
    ),
    settings: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.324.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 011.37.49l1.296 2.247a1.125 1.125 0 01-.26 1.431l-1.003.827c-.293.24-.438.613-.431.992a6.759 6.759 0 010 .255c-.007.378.138.75.43.99l1.005.828c.424.35.534.954.26 1.43l-1.298 2.247a1.125 1.125 0 01-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.57 6.57 0 01-.22.128c-.331.183-.581.495-.644.869l-.213 1.28c-.09.543-.56.941-1.11.941h-2.594c-.55 0-1.02-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 01-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 01-1.369-.49l-1.297-2.247a1.125 1.125 0 01.26-1.431l1.004-.827c.292-.24.437-.613.43-.992a6.932 6.932 0 010-.255c.007-.378-.138-.75-.43-.99l-1.004-.828a1.125 1.125 0 01-.26-1.43l1.297-2.247a1.125 1.125 0 011.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.087.22-.128.332-.183.582-.495.644-.869l.214-1.281z" />
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
    ),
    admin: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
        </svg>
    ),
    dashboard: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V6zM3.75 15.75A2.25 2.25 0 016 13.5h2.25a2.25 2.25 0 012.25 2.25V18a2.25 2.25 0 01-2.25 2.25H6A2.25 2.25 0 013.75 18v-2.25zM13.5 6a2.25 2.25 0 012.25-2.25H18A2.25 2.25 0 0120.25 6v2.25A2.25 2.25 0 0118 10.5h-2.25a2.25 2.25 0 01-2.25-2.25V6zM13.5 15.75a2.25 2.25 0 012.25-2.25H18a2.25 2.25 0 012.25 2.25V18A2.25 2.25 0 0118 20.25h-2.25a2.25 2.25 0 01-2.25-2.25v-2.25z" />
        </svg>
    ),
    wizard: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M11.42 15.17l-5.1-5.1m0 0L3.75 12.6m2.57-2.53L3.75 7.5M11.42 8.83l5.1 5.1m0 0l2.57-2.53m-2.57 2.53l2.57 2.53" />
        </svg>
    ),
    topics: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 6.75h12M8.25 12h12m-12 5.25h12M3.75 6.75h.007v.008H3.75V6.75zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zM3.75 12h.007v.008H3.75V12zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm-.375 5.25h.007v.008H3.75v-.008zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" />
        </svg>
    ),
    audit: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 002.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 00-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 00.75-.75 2.25 2.25 0 00-.1-.664m-5.8 0A2.251 2.251 0 0113.5 2.25H15a2.25 2.25 0 012.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25zM6.75 12h.008v.008H6.75V12zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm-.375 3h.008v.008H6.75V15zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm-.375 3h.008v.008H6.75V18zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" />
        </svg>
    ),
    insights: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />
        </svg>
    ),
    gap: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 14.25v2.25m3-4.5v4.5m3-6.75v6.75m3-9v9M6 20.25h12A2.25 2.25 0 0020.25 18V6A2.25 2.25 0 0018 3.75H6A2.25 2.25 0 003.75 6v12A2.25 2.25 0 006 20.25z" />
        </svg>
    ),
    quality: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M11.48 3.499a.562.562 0 011.04 0l2.125 5.111a.563.563 0 00.475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 00-.182.557l1.285 5.385a.562.562 0 01-.84.61l-4.725-2.885a.563.563 0 00-.586 0L6.982 20.54a.562.562 0 01-.84-.61l1.285-5.386a.562.562 0 00-.182-.557l-4.204-3.602a.563.563 0 01.321-.988l5.518-.442a.563.563 0 00.475-.345L11.48 3.5z" />
        </svg>
    ),
    planning: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" />
        </svg>
    ),
    calendar: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5m-9-6h.008v.008H12v-.008zM12 15h.008v.008H12V15zm0 2.25h.008v.008H12v-.008zM9.75 15h.008v.008H9.75V15zm0 2.25h.008v.008H9.75v-.008zM7.5 15h.008v.008H7.5V15zm0 2.25h.008v.008H7.5v-.008zm6.75-4.5h.008v.008h-.008v-.008zm0 2.25h.008v.008h-.008V15zm0 2.25h.008v.008h-.008v-.008zm2.25-4.5h.008v.008H16.5v-.008zm0 2.25h.008v.008H16.5V15z" />
        </svg>
    ),
    strategy: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 18v-5.25m0 0a6.01 6.01 0 001.5-.189m-1.5.189a6.01 6.01 0 01-1.5-.189m3.75 7.478a12.06 12.06 0 01-4.5 0m3.75 2.383a14.406 14.406 0 01-3 0M14.25 18v-.192c0-.983.658-1.823 1.508-2.316a7.5 7.5 0 10-7.517 0c.85.493 1.509 1.333 1.509 2.316V18" />
        </svg>
    ),
    back: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
        </svg>
    ),
    collapse: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M18.75 19.5l-7.5-7.5 7.5-7.5m-6 15L5.25 12l7.5-7.5" />
        </svg>
    ),
    expand: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M11.25 4.5l7.5 7.5-7.5 7.5m-6-15l7.5 7.5-7.5 7.5" />
        </svg>
    ),
    quotation: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18.75a60.07 60.07 0 0115.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5v.75A.75.75 0 013 6h-.75m0 0v-.375c0-.621.504-1.125 1.125-1.125H20.25M2.25 6v9m18-10.5v.75c0 .414.336.75.75.75h.75m-1.5-1.5h.375c.621 0 1.125.504 1.125 1.125v9.75c0 .621-.504 1.125-1.125 1.125h-.375m1.5-1.5H21a.75.75 0 00-.75.75v.75m0 0H3.75m0 0h-.375a1.125 1.125 0 01-1.125-1.125V15m1.5 1.5v-.75A.75.75 0 003 15h-.75M15 10.5a3 3 0 11-6 0 3 3 0 016 0zm3 0h.008v.008H18V10.5zm-12 0h.008v.008H6V10.5z" />
        </svg>
    ),
    logout: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15m3 0l3-3m0 0l-3-3m3 3H9" />
        </svg>
    ),
    article: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10" />
        </svg>
    ),
    style: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9.53 16.122a3 3 0 00-5.78 1.128 2.25 2.25 0 01-2.4 2.245 4.5 4.5 0 008.4-2.245c0-.399-.078-.78-.22-1.128zm0 0a15.998 15.998 0 003.388-1.62m-5.043-.025a15.994 15.994 0 011.622-3.395m3.42 3.42a15.995 15.995 0 004.764-4.648l3.876-5.814a1.151 1.151 0 00-1.597-1.597L14.146 6.32a15.996 15.996 0 00-4.649 4.763m3.42 3.42a6.776 6.776 0 00-3.42-3.42" />
        </svg>
    ),
    catalog: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 21v-7.5a.75.75 0 01.75-.75h3a.75.75 0 01.75.75V21m-4.5 0H2.36m11.14 0H18m0 0h3.64m-1.39 0V9.349m-16.5 11.65V9.35m0 0a3.001 3.001 0 003.75-.615A2.993 2.993 0 009.75 9.75c.896 0 1.7-.393 2.25-1.016a2.993 2.993 0 002.25 1.016c.896 0 1.7-.393 2.25-1.016a3.001 3.001 0 003.75.614m-16.5 0a3.004 3.004 0 01-.621-4.72L4.318 3.44A1.5 1.5 0 015.378 3h13.243a1.5 1.5 0 011.06.44l1.19 1.189a3 3 0 01-.621 4.72m-13.5 8.65h3.75a.75.75 0 00.75-.75V13.5a.75.75 0 00-.75-.75H6.75a.75.75 0 00-.75.75v3.75c0 .415.336.75.75.75z" />
        </svg>
    ),
    migration: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 21L3 16.5m0 0L7.5 12M3 16.5h13.5m0-13.5L21 7.5m0 0L16.5 12M21 7.5H7.5" />
        </svg>
    ),
};

const NavItemLink: React.FC<{ item: NavItem; collapsed: boolean }> = ({ item, collapsed }) => (
    <NavLink
        to={item.to}
        end={item.end}
        onClick={item.onClick}
        className={({ isActive }) =>
            `flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors ${
                isActive
                    ? 'bg-blue-600/20 text-blue-400 border-l-2 border-blue-400 -ml-px'
                    : 'text-gray-400 hover:text-gray-200 hover:bg-gray-800'
            } ${collapsed ? 'justify-center px-2' : ''}`
        }
        title={collapsed ? item.label : undefined}
    >
        <span className="flex-shrink-0">{item.icon}</span>
        {!collapsed && <span className="truncate">{item.label}</span>}
    </NavLink>
);

const Sidebar: React.FC<SidebarProps> = ({ collapsed, onToggleCollapse }) => {
    const { state, dispatch } = useAppState();
    const { projectId, mapId, topicId } = useParams<{ projectId: string; mapId: string; topicId: string }>();
    const navigate = useNavigate();
    const location = useLocation();

    const activeProject = state.projects.find(p => p.id === projectId);
    const activeMap = state.topicalMaps.find(m => m.id === mapId);
    const isSuperAdmin = state.user?.app_metadata?.role === 'super_admin';

    // Detect topic from route params OR from URL pattern (wildcard routes)
    const urlTopicMatch = location.pathname.match(/\/topics\/([^/]+)/);
    const effectiveTopicId = topicId || urlTopicMatch?.[1];
    const activeTopic = activeMap?.topics?.find((t: any) => t.id === effectiveTopicId);

    const handleLogout = async () => {
        const { getSupabaseClient } = await import('../../services/supabaseClient');
        const supabase = getSupabaseClient(state.businessInfo.supabaseUrl, state.businessInfo.supabaseAnonKey);
        await supabase.auth.signOut();
        navigate('/login');
    };

    // Determine navigation level based on URL
    const isTopicLevel = !!projectId && !!mapId && !!effectiveTopicId;
    const isMapLevel = !!projectId && !!mapId;
    const isProjectLevel = !!projectId && !mapId;
    const isRootLevel = !projectId;

    // Build base path for map-level routes
    const mapBase = projectId && mapId ? `/p/${projectId}/m/${mapId}` : '';
    const topicBase = mapBase && effectiveTopicId ? `${mapBase}/topics/${effectiveTopicId}` : '';

    // websiteType is stored per-map in business_info, so check both map-level and global state
    const activeMapData = state.topicalMaps.find(m => m.id === mapId);
    const mapBizInfo = activeMapData?.business_info as Record<string, unknown> | undefined;
    const isEcommerce = (mapBizInfo?.websiteType || state.businessInfo.websiteType) === 'ECOMMERCE';

    // Level 3: Map selected - full navigation
    const mapSections: NavSection[] = [
        {
            title: 'MAP',
            items: [
                { label: 'Topical Map', icon: Icons.dashboard, to: mapBase, end: true,
                  onClick: () => { if (state.viewMode === 'MIGRATION') dispatch({ type: 'SET_VIEW_MODE', payload: 'CREATION' }); }
                },
                { label: 'Map Settings', icon: Icons.settings, to: `${mapBase}/setup` },
                ...(isEcommerce ? [{ label: 'Product Catalog', icon: Icons.catalog, to: `${mapBase}/catalog` }] : []),
            ],
        },
        {
            title: 'ANALYSIS',
            items: [
                { label: 'Audit Dashboard', icon: Icons.audit, to: `${mapBase}/audit` },
                { label: 'Insights Hub', icon: Icons.insights, to: `${mapBase}/insights` },
                { label: 'Gap Analysis', icon: Icons.gap, to: `${mapBase}/gap-analysis` },
                { label: 'Quality', icon: Icons.quality, to: `${mapBase}/quality` },
            ],
        },
        {
            title: 'PLANNING',
            items: [
                { label: 'Publication Plan', icon: Icons.planning, to: `${mapBase}/planning` },
                { label: 'Content Calendar', icon: Icons.calendar, to: `${mapBase}/calendar` },
            ],
        },
        {
            title: 'STRATEGY',
            items: [
                { label: 'KP Strategy', icon: Icons.strategy, to: `${mapBase}/strategy/kp` },
                { label: 'Entity Authority', icon: Icons.strategy, to: `${mapBase}/strategy/entity-authority` },
                { label: 'Entity Health', icon: Icons.strategy, to: `${mapBase}/strategy/entity-health` },
            ],
        },
    ];

    // Topic workflow sections - shown when on a topic-level page
    const topicSections: NavSection[] = topicBase ? [
        {
            title: 'TOPIC',
            items: [
                { label: 'Overview', icon: Icons.topics, to: topicBase, end: true },
                { label: 'Content Brief', icon: Icons.audit, to: `${topicBase}/brief` },
                { label: 'Article Draft', icon: Icons.article, to: `${topicBase}/draft` },
                { label: 'Style & Publish', icon: Icons.style, to: `${topicBase}/style` },
            ],
        },
    ] : [];

    return (
        <aside
            className={`fixed left-0 top-0 h-full bg-gray-950 border-r border-gray-800 flex flex-col transition-all duration-300 z-40 ${
                collapsed ? 'w-14' : 'w-60'
            }`}
        >
            {/* Header */}
            <div className={`flex items-center h-14 border-b border-gray-800 ${collapsed ? 'justify-center px-2' : 'px-4'}`}>
                {!collapsed && (
                    <div className="flex-1 min-w-0">
                        {isTopicLevel && activeTopic ? (
                            <div className="truncate">
                                <button
                                    onClick={() => navigate(mapBase)}
                                    className="text-xs text-gray-500 hover:text-gray-300 truncate block"
                                >
                                    {activeMap?.name}
                                </button>
                                <span className="text-sm font-medium text-white truncate block">{activeTopic.title}</span>
                            </div>
                        ) : isMapLevel && activeProject && activeMap ? (
                            <div className="truncate">
                                <button
                                    onClick={() => navigate(`/p/${projectId}`)}
                                    className="text-xs text-gray-500 hover:text-gray-300 truncate block"
                                >
                                    {activeProject.project_name}
                                </button>
                                <span className="text-sm font-medium text-white truncate block">{activeMap.name}</span>
                            </div>
                        ) : isProjectLevel && activeProject ? (
                            <div className="truncate">
                                <span className="text-sm font-medium text-white truncate block">{activeProject.project_name}</span>
                                {activeProject.domain && (
                                    <span className="text-xs text-gray-500 truncate block">{activeProject.domain}</span>
                                )}
                            </div>
                        ) : (
                            <span className="text-sm font-bold text-white tracking-wide">SEO Tool</span>
                        )}
                    </div>
                )}
                {collapsed && (
                    <span className="text-lg font-bold text-blue-400">S</span>
                )}
            </div>

            {/* Navigation */}
            <nav className="flex-1 overflow-y-auto py-3 px-2 space-y-1">
                {/* Back navigation */}
                {isTopicLevel && (
                    <button
                        onClick={() => navigate(mapBase)}
                        className={`flex items-center gap-3 px-3 py-2 rounded-md text-sm text-gray-400 hover:text-gray-200 hover:bg-gray-800 w-full ${
                            collapsed ? 'justify-center px-2' : ''
                        }`}
                        title={collapsed ? 'Back to Topical Map' : undefined}
                    >
                        {Icons.back}
                        {!collapsed && <span>Back to Topical Map</span>}
                    </button>
                )}
                {isMapLevel && !isTopicLevel && (
                    <button
                        onClick={() => navigate(`/p/${projectId}`)}
                        className={`flex items-center gap-3 px-3 py-2 rounded-md text-sm text-gray-400 hover:text-gray-200 hover:bg-gray-800 w-full ${
                            collapsed ? 'justify-center px-2' : ''
                        }`}
                        title={collapsed ? 'Back to Maps' : undefined}
                    >
                        {Icons.back}
                        {!collapsed && <span>Back to Maps</span>}
                    </button>
                )}
                {isProjectLevel && (
                    <button
                        onClick={() => navigate('/projects')}
                        className={`flex items-center gap-3 px-3 py-2 rounded-md text-sm text-gray-400 hover:text-gray-200 hover:bg-gray-800 w-full ${
                            collapsed ? 'justify-center px-2' : ''
                        }`}
                        title={collapsed ? 'Back to Projects' : undefined}
                    >
                        {Icons.back}
                        {!collapsed && <span>Back to Projects</span>}
                    </button>
                )}

                {/* Divider after back button */}
                {(isMapLevel || isProjectLevel) && (
                    <div className="border-t border-gray-800 my-2" />
                )}

                {/* Topic-level navigation */}
                {isTopicLevel && topicSections.map((section, idx) => (
                    <div key={`topic-${idx}`} className="mb-2">
                        {section.title && !collapsed && (
                            <div className="px-3 py-1 text-xs font-semibold text-gray-600 uppercase tracking-wider">
                                {section.title}
                            </div>
                        )}
                        {section.items.map(item => (
                            <NavItemLink key={item.to} item={item} collapsed={collapsed} />
                        ))}
                    </div>
                ))}

                {/* Divider between topic and map sections */}
                {isTopicLevel && (
                    <div className="border-t border-gray-800 my-2" />
                )}

                {/* Map-level navigation */}
                {isMapLevel && mapSections.map((section, idx) => (
                    <div key={idx} className="mb-2">
                        {section.title && !collapsed && (
                            <div className="px-3 py-1 text-xs font-semibold text-gray-600 uppercase tracking-wider">
                                {section.title}
                            </div>
                        )}
                        {collapsed && idx > 0 && <div className="border-t border-gray-800 my-1" />}
                        {section.items.map(item => (
                            <NavItemLink key={item.to} item={item} collapsed={collapsed} />
                        ))}
                        {/* Migration Workbench button in MAP section */}
                        {idx === 0 && !isTopicLevel && (
                            <button
                                onClick={() => {
                                    if (state.viewMode === 'MIGRATION') {
                                        dispatch({ type: 'SET_VIEW_MODE', payload: 'CREATION' });
                                    } else {
                                        dispatch({ type: 'SET_VIEW_MODE', payload: 'MIGRATION' });
                                    }
                                }}
                                className={`flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors w-full ${
                                    state.viewMode === 'MIGRATION'
                                        ? 'bg-blue-600/20 text-blue-400 border-l-2 border-blue-400 -ml-px'
                                        : 'text-gray-400 hover:text-gray-200 hover:bg-gray-800'
                                } ${collapsed ? 'justify-center px-2' : ''}`}
                                title={collapsed ? 'Migration Workbench' : undefined}
                            >
                                <span className="flex-shrink-0">{Icons.migration}</span>
                                {!collapsed && <span className="truncate">Migration</span>}
                            </button>
                        )}
                    </div>
                ))}

                {/* Project-level navigation */}
                {isProjectLevel && (
                    <>
                        <NavItemLink
                            item={{ label: 'Topical Maps', icon: Icons.projects, to: `/p/${projectId}`, end: true }}
                            collapsed={collapsed}
                        />
                    </>
                )}

                {/* Root-level navigation */}
                {isRootLevel && (
                    <>
                        <NavItemLink
                            item={{ label: 'Projects', icon: Icons.projects, to: '/projects', end: true }}
                            collapsed={collapsed}
                        />
                        {isSuperAdmin && (
                            <NavItemLink
                                item={{ label: 'Admin', icon: Icons.admin, to: '/admin' }}
                                collapsed={collapsed}
                            />
                        )}
                        <NavItemLink
                            item={{ label: 'SEO Quotation', icon: Icons.quotation, to: '/tools/quotation' }}
                            collapsed={collapsed}
                        />
                    </>
                )}
            </nav>

            {/* Footer */}
            <div className="border-t border-gray-800 p-2 space-y-1">
                {/* Settings - always available at root */}
                {isRootLevel && (
                    <NavItemLink
                        item={{ label: 'Settings', icon: Icons.settings, to: '/settings' }}
                        collapsed={collapsed}
                    />
                )}

                {/* Collapse toggle */}
                <button
                    onClick={onToggleCollapse}
                    className={`flex items-center gap-3 px-3 py-2 rounded-md text-sm text-gray-500 hover:text-gray-300 hover:bg-gray-800 w-full ${
                        collapsed ? 'justify-center px-2' : ''
                    }`}
                    title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
                >
                    {collapsed ? Icons.expand : Icons.collapse}
                    {!collapsed && <span>Collapse</span>}
                </button>

                {/* User info + logout */}
                {state.user && (
                    <div className={`flex items-center gap-2 px-3 py-2 ${collapsed ? 'justify-center px-2' : ''}`}>
                        <div className="w-7 h-7 rounded-full bg-blue-600 flex items-center justify-center flex-shrink-0">
                            <span className="text-xs font-medium text-white">
                                {state.user.email?.charAt(0).toUpperCase() || 'U'}
                            </span>
                        </div>
                        {!collapsed && (
                            <div className="flex-1 min-w-0">
                                <div className="text-xs text-gray-400 truncate">{state.user.email}</div>
                            </div>
                        )}
                        <button
                            onClick={handleLogout}
                            className="text-gray-500 hover:text-gray-300 flex-shrink-0"
                            title="Logout"
                        >
                            {Icons.logout}
                        </button>
                    </div>
                )}
            </div>
        </aside>
    );
};

export default Sidebar;
