import React, { useState, useEffect } from 'react';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Label } from '../ui/Label';
import { Select } from '../ui/Select';
import { getTelemetryLogs, clearTelemetryLogs } from '../../services/telemetryService';
import { AppStep, TelemetryLog, BusinessInfo } from '../../types';
import { useAppState } from '../../state/appState';
import { getSupabaseClient } from '../../services/supabaseClient';
import { AIProviderSettings, ServiceSettings } from '../modals';
import { Loader } from '../ui/Loader';
import HelpEditor from './HelpEditor';
import AIUsageReport from './AIUsageReport';
import ProjectManagement from './ProjectManagement';
import OrganizationManagement from './OrganizationManagement';
import { QualityDemoPage } from '../pages/QualityDemoPage';
import { TemplatePerformanceDashboard } from '../analytics/TemplatePerformanceDashboard';
import QuotationPricingAdmin from './QuotationPricingAdmin';

interface UserData {
    id: string;
    email: string;
    role: string;
    last_sign_in_at: string;
    created_at: string;
    organizations?: {
        id: string;
        name: string;
        role: string;
    }[];
}

// --- Internal User Management Component ---
const UserManagement: React.FC = () => {
    const { state } = useAppState();
    const [users, setUsers] = useState<UserData[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);
    
    // CRUD State
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingUser, setEditingUser] = useState<UserData | null>(null);
    const [formData, setFormData] = useState({ email: '', password: '', role: 'user' });
    const [formErrors, setFormErrors] = useState<{ email?: string; password?: string }>({});

    const fetchUsers = async () => {
        setIsLoading(true);
        setError(null);
        try {
            const supabase = getSupabaseClient(state.businessInfo.supabaseUrl, state.businessInfo.supabaseAnonKey);
            const { data, error } = await supabase.functions.invoke('get-users', { method: 'GET' });

            if (error) throw error;

            // Fetch organization memberships for each user
            const usersWithOrgs = await Promise.all((data.users || []).map(async (user: UserData) => {
                try {
                    const { data: memberships } = await supabase
                        .from('organization_members')
                        .select(`
                            role,
                            organization:organizations (
                                id,
                                name
                            )
                        `)
                        .eq('user_id', user.id)
                        .not('accepted_at', 'is', null);

                    return {
                        ...user,
                        organizations: (memberships || [])
                            .filter((m: any) => m.organization)
                            .map((m: any) => ({
                                id: m.organization.id,
                                name: m.organization.name,
                                role: m.role,
                            })),
                    };
                } catch {
                    return { ...user, organizations: [] };
                }
            }));

            setUsers(usersWithOrgs);
        } catch (e) {
            console.error("Failed to fetch users:", e);
            setError(e instanceof Error ? e.message : "Failed to load users.");
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchUsers();
    }, []);

    const openCreateModal = () => {
        setEditingUser(null);
        setFormData({ email: '', password: '', role: 'user' });
        setFormErrors({});
        setIsModalOpen(true);
    };

    const openEditModal = (user: UserData) => {
        setEditingUser(user);
        // Don't fill password on edit
        setFormData({ email: user.email || '', password: '', role: user.role || 'user' });
        setFormErrors({});
        setIsModalOpen(true);
    };

    const validateEmail = (email: string): string | undefined => {
        if (!email.trim()) return 'Email is required';
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) return 'Please enter a valid email address';
        return undefined;
    };

    const validatePassword = (password: string, isEditing: boolean): string | undefined => {
        if (isEditing && !password) return undefined; // Password optional when editing
        if (!password) return 'Password is required';
        if (password.length < 8) return 'Password must be at least 8 characters';
        if (!/[A-Z]/.test(password)) return 'Password must contain at least one uppercase letter';
        if (!/[a-z]/.test(password)) return 'Password must contain at least one lowercase letter';
        if (!/[0-9]/.test(password)) return 'Password must contain at least one number';
        return undefined;
    };

    const validateForm = (): boolean => {
        const errors: { email?: string; password?: string } = {};
        errors.email = validateEmail(formData.email);
        errors.password = validatePassword(formData.password, !!editingUser);
        setFormErrors(errors);
        return !errors.email && !errors.password;
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);

        if (!validateForm()) {
            return;
        }

        setIsSubmitting(true);

        try {
            const supabase = getSupabaseClient(state.businessInfo.supabaseUrl, state.businessInfo.supabaseAnonKey);
            const method = editingUser ? 'PUT' : 'POST';
            const body = editingUser 
                ? { id: editingUser.id, ...formData } 
                : formData;

            const { data, error } = await supabase.functions.invoke('get-users', {
                method,
                body
            });

            if (error) throw new Error(error.message || 'Request failed');
            if (!data.user && !data.message) throw new Error(data.error || 'Unknown error');

            setIsModalOpen(false);
            fetchUsers(); // Refresh list
        } catch (e) {
            setError(e instanceof Error ? e.message : "Operation failed.");
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm("Are you sure you want to delete this user?")) return;
        
        setIsSubmitting(true);
        try {
             const supabase = getSupabaseClient(state.businessInfo.supabaseUrl, state.businessInfo.supabaseAnonKey);
             const { error } = await supabase.functions.invoke('get-users', {
                method: 'DELETE',
                body: { id }
            });
            if (error) throw error;
            fetchUsers();
        } catch (e) {
            setError(e instanceof Error ? e.message : "Delete failed.");
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h3 className="text-lg font-semibold text-white">User Management</h3>
                <div className="flex gap-2">
                    <Button className="text-xs py-2" onClick={fetchUsers} variant="secondary">
                        {isLoading ? <Loader className="w-4 h-4" /> : 'Refresh'}
                    </Button>
                    <Button className="text-xs py-2 bg-green-600 hover:bg-green-700" onClick={openCreateModal}>
                        + Add User
                    </Button>
                </div>
            </div>
            
            {error && (
                <div className="p-3 bg-red-900/20 border border-red-700/50 rounded text-sm text-red-300">
                    {error}
                </div>
            )}

            <Card className="p-0 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm text-gray-400">
                        <thead className="bg-gray-800 text-gray-200 text-xs uppercase">
                            <tr>
                                <th className="px-4 py-3">Email</th>
                                <th className="px-4 py-3">Organizations</th>
                                <th className="px-4 py-3">Last Active</th>
                                <th className="px-4 py-3">Role</th>
                                <th className="px-4 py-3 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-700">
                            {users.length === 0 && !isLoading ? (
                                <tr>
                                    <td colSpan={5} className="px-4 py-8 text-center italic">No users found.</td>
                                </tr>
                            ) : (
                                users.map(u => (
                                    <tr key={u.id} className="hover:bg-gray-800/50">
                                        <td className="px-4 py-3 text-white font-medium">
                                            {u.email}
                                            {state.user?.email === u.email && <span className="ml-2 text-[10px] bg-blue-900 text-blue-200 px-1.5 py-0.5 rounded">YOU</span>}
                                        </td>
                                        <td className="px-4 py-3">
                                            {(u.organizations || []).length === 0 ? (
                                                <span className="text-gray-500 italic text-xs">None</span>
                                            ) : (
                                                <div className="flex flex-wrap gap-1">
                                                    {(u.organizations || []).map(org => (
                                                        <span
                                                            key={org.id}
                                                            className={`px-1.5 py-0.5 rounded text-[10px] ${
                                                                org.role === 'owner' ? 'bg-yellow-900/50 text-yellow-200' :
                                                                org.role === 'admin' ? 'bg-purple-900/50 text-purple-200' :
                                                                'bg-gray-700 text-gray-300'
                                                            }`}
                                                            title={`Role: ${org.role}`}
                                                        >
                                                            {org.name}
                                                        </span>
                                                    ))}
                                                </div>
                                            )}
                                        </td>
                                        <td className="px-4 py-3">
                                            {u.last_sign_in_at ? new Date(u.last_sign_in_at).toLocaleDateString() : 'Never'}
                                        </td>
                                        <td className="px-4 py-3">
                                            <span className={`px-2 py-0.5 rounded text-xs ${u.role === 'admin' ? 'bg-purple-900 text-purple-200' : 'bg-gray-700 text-gray-300'}`}>
                                                {u.role}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3 text-right space-x-2">
                                            <button onClick={() => openEditModal(u)} className="text-blue-400 hover:text-blue-300 text-xs underline">Edit</button>
                                            <button onClick={() => handleDelete(u.id)} className="text-red-400 hover:text-red-300 text-xs underline">Delete</button>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </Card>

            {/* Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50" onClick={() => setIsModalOpen(false)}>
                    <Card className="w-full max-w-md p-6" onClick={e => e.stopPropagation()}>
                        <h2 className="text-xl font-bold text-white mb-4">{editingUser ? 'Edit User' : 'Create User'}</h2>
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div>
                                <Label htmlFor="user-email">Email Address</Label>
                                <Input
                                    id="user-email"
                                    type="email"
                                    value={formData.email}
                                    onChange={e => {
                                        setFormData({...formData, email: e.target.value});
                                        if (formErrors.email) setFormErrors({...formErrors, email: undefined});
                                    }}
                                    aria-invalid={!!formErrors.email}
                                    aria-describedby={formErrors.email ? 'email-error' : undefined}
                                    className={formErrors.email ? 'border-red-500' : ''}
                                />
                                {formErrors.email && (
                                    <p id="email-error" className="mt-1 text-sm text-red-400">{formErrors.email}</p>
                                )}
                            </div>
                            <div>
                                <Label htmlFor="user-password">Password {editingUser && '(Leave blank to keep current)'}</Label>
                                <Input
                                    id="user-password"
                                    type="password"
                                    value={formData.password}
                                    onChange={e => {
                                        setFormData({...formData, password: e.target.value});
                                        if (formErrors.password) setFormErrors({...formErrors, password: undefined});
                                    }}
                                    placeholder={editingUser ? "••••••••" : "Min 8 chars, upper, lower, number"}
                                    aria-invalid={!!formErrors.password}
                                    aria-describedby={formErrors.password ? 'password-error' : undefined}
                                    className={formErrors.password ? 'border-red-500' : ''}
                                />
                                {formErrors.password && (
                                    <p id="password-error" className="mt-1 text-sm text-red-400">{formErrors.password}</p>
                                )}
                                {!editingUser && !formErrors.password && (
                                    <p className="mt-1 text-xs text-gray-500">
                                        Must contain uppercase, lowercase, and number
                                    </p>
                                )}
                            </div>
                            <div>
                                <Label htmlFor="user-role">Role</Label>
                                <Select
                                    id="user-role"
                                    value={formData.role}
                                    onChange={e => setFormData({...formData, role: e.target.value})}
                                >
                                    <option value="user">User</option>
                                    <option value="editor">Editor</option>
                                    <option value="admin">Admin</option>
                                </Select>
                            </div>
                            <div className="flex justify-end gap-3 pt-4">
                                <Button type="button" variant="secondary" onClick={() => setIsModalOpen(false)}>Cancel</Button>
                                <Button type="submit" disabled={isSubmitting}>
                                    {isSubmitting ? <Loader className="w-4 h-4" /> : (editingUser ? 'Update User' : 'Create User')}
                                </Button>
                            </div>
                        </form>
                    </Card>
                </div>
            )}
        </div>
    );
};

// --- Internal Configuration Component ---
const ConfigurationPanel: React.FC = () => {
    const { state, dispatch } = useAppState();
    const [localSettings, setLocalSettings] = useState<Partial<BusinessInfo>>(state.businessInfo);
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        setLocalSettings(state.businessInfo);
    }, [state.businessInfo]);

    const handleSave = async () => {
        setIsSaving(true);
        try {
            const supabase = getSupabaseClient(state.businessInfo.supabaseUrl, state.businessInfo.supabaseAnonKey);

            // Filter out problematic fields - only send settings-related fields
            // Exclude large nested objects and non-setting fields that could cause issues
            const settingsToSave: Record<string, unknown> = {};
            const excludeFields = ['supabaseUrl', 'supabaseAnonKey', 'brandKit', 'authorProfile', 'entityIdentity'];

            for (const [key, value] of Object.entries(localSettings)) {
                // Skip excluded fields and undefined values
                if (excludeFields.includes(key) || value === undefined) continue;
                // Skip complex objects (but allow simple objects like nested configs)
                if (typeof value === 'object' && value !== null && !Array.isArray(value) && Object.keys(value).length > 10) {
                    console.log(`[ConfigurationPanel] Skipping large object field: ${key}`);
                    continue;
                }
                settingsToSave[key] = value;
            }

            console.log('[ConfigurationPanel] Saving settings:', Object.keys(settingsToSave));

            const { data, error } = await supabase.functions.invoke('update-settings', {
                body: settingsToSave
            });

            // Check for HTTP-level error
            if (error) {
                console.error('[ConfigurationPanel] Function invoke error:', error);
                throw error;
            }

            // Check for application-level error in response body
            if (data && !data.ok) {
                console.error('[ConfigurationPanel] Function returned error:', data.error);
                throw new Error(data.error || 'Unknown error from settings function');
            }

            dispatch({ type: 'SET_BUSINESS_INFO', payload: { ...state.businessInfo, ...localSettings } });
            dispatch({ type: 'SET_NOTIFICATION', payload: 'Configuration saved successfully.' });
        } catch (e) {
            console.error('[ConfigurationPanel] Save failed:', e);
            dispatch({ type: 'SET_ERROR', payload: e instanceof Error ? e.message : 'Failed to save configuration.' });
        } finally {
            setIsSaving(false);
        }
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setLocalSettings(prev => ({ ...prev, [e.target.name]: e.target.value }));
    };

    return (
        <div className="space-y-8">
            <div className="flex justify-between items-center">
                <h3 className="text-lg font-semibold text-white">System Configuration</h3>
                <Button onClick={handleSave} disabled={isSaving}>
                    {isSaving ? <Loader className="w-4 h-4" /> : 'Save Changes'}
                </Button>
            </div>
            
            <Card className="p-6">
                <AIProviderSettings settings={localSettings} setSettings={setLocalSettings} />
            </Card>
            
            <Card className="p-6">
                <ServiceSettings settings={localSettings} handleChange={handleChange} setSettings={setLocalSettings} />
            </Card>

            {/* Developer Settings */}
            <Card className="p-6">
                <h4 className="text-md font-semibold text-white mb-4">Developer Settings</h4>
                <div className="space-y-4">
                    <label className="flex items-center gap-3 cursor-pointer">
                        <input
                            type="checkbox"
                            checked={localSettings.verboseLogging || false}
                            onChange={(e) => setLocalSettings(prev => ({ ...prev, verboseLogging: e.target.checked }))}
                            className="w-5 h-5 rounded border-gray-600 bg-gray-800 text-blue-500 focus:ring-blue-500 focus:ring-offset-gray-900"
                        />
                        <div>
                            <span className="text-white font-medium">Verbose Logging</span>
                            <p className="text-gray-400 text-sm">
                                Show detailed console logs during content generation passes (useful for debugging)
                            </p>
                        </div>
                    </label>
                </div>
            </Card>
        </div>
    );
};


const AdminDashboard: React.FC = () => {
    const { dispatch, state } = useAppState();
    const [logs, setLogs] = useState<TelemetryLog[]>([]);
    const [isCheckingDB, setIsCheckingDB] = useState(false);
    const [dbStatus, setDbStatus] = useState<'ok' | 'error' | null>(null);
    const [activeTab, setActiveTab] = useState<'overview' | 'usage' | 'config' | 'users' | 'orgs' | 'help' | 'projects' | 'quality' | 'templates' | 'quotation'>('overview');

    useEffect(() => {
        setLogs(getTelemetryLogs());
    }, []);

    const handleRefresh = () => {
        setLogs(getTelemetryLogs());
    };

    const handleClear = () => {
        if (confirm("Clear all usage logs?")) {
            clearTelemetryLogs();
            setLogs([]);
        }
    };
    
    const checkSystemHealth = async () => {
        setIsCheckingDB(true);
        setDbStatus(null);
        try {
            const supabase = getSupabaseClient(state.businessInfo.supabaseUrl, state.businessInfo.supabaseAnonKey);
            const { error } = await supabase.from('projects').select('id').limit(1);
            if (error) throw error;
            setDbStatus('ok');
        } catch (e) {
            console.error(e);
            setDbStatus('error');
        } finally {
            setIsCheckingDB(false);
        }
    };

    const totalCost = logs.reduce((sum, log) => sum + (log.cost_est || 0), 0);
    const totalTokens = logs.reduce((sum, log) => sum + (log.tokens_in || 0) + (log.tokens_out || 0), 0);

    return (
        <div className="min-h-screen bg-gray-900 text-gray-100 font-sans">
            <div className="flex h-screen overflow-hidden">
                {/* Sidebar */}
                <aside className="w-64 bg-gray-800 border-r border-gray-700 flex flex-col">
                    <div className="p-6 border-b border-gray-700">
                        <h1 className="text-xl font-bold text-white">Admin Console</h1>
                        <p className="text-xs text-gray-400 mt-1">System Management</p>
                    </div>
                    <nav className="flex-grow p-4 space-y-2">
                        <button
                            onClick={() => setActiveTab('overview')}
                            className={`w-full text-left px-4 py-2 rounded transition-colors ${activeTab === 'overview' ? 'bg-blue-600 text-white' : 'text-gray-400 hover:bg-gray-700 hover:text-white'}`}
                        >
                            📊 System Overview
                        </button>
                        <button
                            onClick={() => setActiveTab('usage')}
                            className={`w-full text-left px-4 py-2 rounded transition-colors ${activeTab === 'usage' ? 'bg-blue-600 text-white' : 'text-gray-400 hover:bg-gray-700 hover:text-white'}`}
                        >
                            💰 AI Usage & Costs
                        </button>
                        <button
                            onClick={() => setActiveTab('config')}
                            className={`w-full text-left px-4 py-2 rounded transition-colors ${activeTab === 'config' ? 'bg-blue-600 text-white' : 'text-gray-400 hover:bg-gray-700 hover:text-white'}`}
                        >
                            ⚙️ Configuration
                        </button>
                        <button
                            onClick={() => setActiveTab('users')}
                            className={`w-full text-left px-4 py-2 rounded transition-colors ${activeTab === 'users' ? 'bg-blue-600 text-white' : 'text-gray-400 hover:bg-gray-700 hover:text-white'}`}
                        >
                            👥 User Management
                        </button>
                        <button
                            onClick={() => setActiveTab('orgs')}
                            className={`w-full text-left px-4 py-2 rounded transition-colors ${activeTab === 'orgs' ? 'bg-blue-600 text-white' : 'text-gray-400 hover:bg-gray-700 hover:text-white'}`}
                        >
                            🏢 Organizations
                        </button>
                        <button
                            onClick={() => setActiveTab('help')}
                            className={`w-full text-left px-4 py-2 rounded transition-colors ${activeTab === 'help' ? 'bg-blue-600 text-white' : 'text-gray-400 hover:bg-gray-700 hover:text-white'}`}
                        >
                            📚 Help Documentation
                        </button>
                        <button
                            onClick={() => setActiveTab('projects')}
                            className={`w-full text-left px-4 py-2 rounded transition-colors ${activeTab === 'projects' ? 'bg-blue-600 text-white' : 'text-gray-400 hover:bg-gray-700 hover:text-white'}`}
                        >
                            📁 Project Management
                        </button>
                        <button
                            onClick={() => setActiveTab('quality')}
                            className={`w-full text-left px-4 py-2 rounded transition-colors ${activeTab === 'quality' ? 'bg-blue-600 text-white' : 'text-gray-400 hover:bg-gray-700 hover:text-white'}`}
                        >
                            ✓ Quality Demo (Dev)
                        </button>
                        <button
                            onClick={() => setActiveTab('templates')}
                            className={`w-full text-left px-4 py-2 rounded transition-colors ${activeTab === 'templates' ? 'bg-blue-600 text-white' : 'text-gray-400 hover:bg-gray-700 hover:text-white'}`}
                        >
                            📝 Template Analytics
                        </button>
                        <button
                            onClick={() => setActiveTab('quotation')}
                            className={`w-full text-left px-4 py-2 rounded transition-colors ${activeTab === 'quotation' ? 'bg-blue-600 text-white' : 'text-gray-400 hover:bg-gray-700 hover:text-white'}`}
                        >
                            💰 Quotation Pricing
                        </button>
                    </nav>
                    <div className="p-4 border-t border-gray-700">
                        <Button onClick={() => dispatch({ type: 'SET_STEP', payload: AppStep.PROJECT_SELECTION })} variant="secondary" className="w-full text-sm">
                            ← Back to Projects
                        </Button>
                    </div>
                </aside>

                {/* Main Content */}
                <main className="flex-1 overflow-y-auto p-8">
                    {activeTab === 'overview' && (
                        <div className="space-y-6">
                            <div className="flex justify-between items-center">
                                <h2 className="text-2xl font-bold text-white">System Overview</h2>
                                <div className="text-xs text-gray-400">Last updated: {new Date().toLocaleTimeString()}</div>
                            </div>

                            {/* KPI Cards */}
                            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                                <Card className="p-4 bg-gray-800/50 border border-blue-500/30">
                                    <h3 className="text-xs uppercase text-blue-400 font-bold">Total Cost (Est)</h3>
                                    <p className="text-2xl font-bold text-white">${totalCost.toFixed(4)}</p>
                                </Card>
                                <Card className="p-4 bg-gray-800/50 border border-purple-500/30">
                                    <h3 className="text-xs uppercase text-purple-400 font-bold">Total Tokens</h3>
                                    <p className="text-2xl font-bold text-white">{(totalTokens / 1000).toFixed(1)}k</p>
                                </Card>
                                <Card className="p-4 bg-gray-800/50 border border-green-500/30">
                                    <h3 className="text-xs uppercase text-green-400 font-bold">API Calls</h3>
                                    <p className="text-2xl font-bold text-white">{logs.length}</p>
                                </Card>
                                <Card className="p-4 bg-gray-800/50 border border-gray-600">
                                    <h3 className="text-xs uppercase text-gray-400 font-bold">System Health</h3>
                                    <div className="flex items-center gap-2 mt-1">
                                        <div className={`w-3 h-3 rounded-full ${dbStatus === 'ok' ? 'bg-green-500' : dbStatus === 'error' ? 'bg-red-500' : 'bg-gray-500'}`}></div>
                                        <span className="text-sm text-white">{dbStatus === 'ok' ? 'Operational' : dbStatus === 'error' ? 'DB Error' : 'Unknown'}</span>
                                        <button onClick={checkSystemHealth} className="text-xs underline text-blue-400 ml-2" disabled={isCheckingDB}>
                                            {isCheckingDB ? 'Checking...' : 'Test'}
                                        </button>
                                    </div>
                                </Card>
                            </div>

                            {/* Logs Table */}
                            <Card className="p-0 overflow-hidden">
                                <div className="p-4 border-b border-gray-700 flex justify-between items-center bg-gray-800">
                                    <h3 className="font-bold text-white">Recent API Activity</h3>
                                    <div className="flex gap-2">
                                        <Button onClick={handleRefresh} variant="secondary" className="text-xs py-1">Refresh</Button>
                                        <Button onClick={handleClear} variant="secondary" className="text-xs py-1 text-red-300 hover:text-red-200">Clear History</Button>
                                    </div>
                                </div>
                                <div className="overflow-x-auto max-h-[600px]">
                                    <table className="w-full text-left text-sm text-gray-400">
                                        <thead className="bg-gray-900 text-gray-200 text-xs uppercase sticky top-0">
                                            <tr>
                                                <th className="px-4 py-3">Time</th>
                                                <th className="px-4 py-3">Provider</th>
                                                <th className="px-4 py-3">Model</th>
                                                <th className="px-4 py-3">Operation</th>
                                                <th className="px-4 py-3 text-right">In / Out</th>
                                                <th className="px-4 py-3 text-right">Cost</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-800">
                                            {logs.map((log) => {
                                                const date = new Date(log.timestamp);
                                                const timeStr = !isNaN(date.getTime()) ? date.toLocaleTimeString() : 'Invalid Date';
                                                return (
                                                    <tr key={log.id} className="hover:bg-gray-800/50">
                                                        <td className="px-4 py-2 whitespace-nowrap">{timeStr}</td>
                                                        <td className="px-4 py-2">{log.provider || 'unknown'}</td>
                                                        <td className="px-4 py-2 font-mono text-xs">{log.model || 'unknown'}</td>
                                                        <td className="px-4 py-2 font-medium text-white">{log.operation || 'unknown'}</td>
                                                        <td className="px-4 py-2 text-right font-mono text-xs">{log.tokens_in || 0} / {log.tokens_out || 0}</td>
                                                        <td className="px-4 py-2 text-right text-green-400 font-mono">${(log.cost_est ?? 0).toFixed(5)}</td>
                                                    </tr>
                                                );
                                            })}
                                            {logs.length === 0 && (
                                                <tr>
                                                    <td colSpan={6} className="px-4 py-8 text-center italic">No activity recorded yet.</td>
                                                </tr>
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            </Card>
                        </div>
                    )}

                    {activeTab === 'usage' && (
                        <AIUsageReport />
                    )}

                    {activeTab === 'config' && (
                        <ConfigurationPanel />
                    )}

                    {activeTab === 'users' && (
                        <UserManagement />
                    )}

                    {activeTab === 'orgs' && (
                        <OrganizationManagement />
                    )}

                    {activeTab === 'help' && (
                        <HelpEditor />
                    )}

                    {activeTab === 'projects' && (
                        <ProjectManagement />
                    )}

                    {activeTab === 'quality' && (
                        <div className="bg-gray-800 rounded-lg">
                            <QualityDemoPage />
                        </div>
                    )}

                    {activeTab === 'templates' && (
                        <div className="bg-gray-800 rounded-lg p-6">
                            <TemplatePerformanceDashboard />
                        </div>
                    )}
                    {activeTab === 'quotation' && (
                        <div className="bg-gray-800 rounded-lg p-6">
                            <QuotationPricingAdmin />
                        </div>
                    )}
                </main>
            </div>
        </div>
    );
};

export default AdminDashboard;