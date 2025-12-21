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

interface UserData {
    id: string;
    email: string;
    role: string;
    last_sign_in_at: string;
    created_at: string;
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

    const fetchUsers = async () => {
        setIsLoading(true);
        setError(null);
        try {
            const supabase = getSupabaseClient(state.businessInfo.supabaseUrl, state.businessInfo.supabaseAnonKey);
            const { data, error } = await supabase.functions.invoke('get-users', { method: 'GET' });
            
            if (error) throw error;
            setUsers(data.users || []);
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
        setIsModalOpen(true);
    };

    const openEditModal = (user: UserData) => {
        setEditingUser(user);
        // Don't fill password on edit
        setFormData({ email: user.email || '', password: '', role: user.role || 'user' });
        setIsModalOpen(true);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);
        setError(null);

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
                                <th className="px-4 py-3">Last Active</th>
                                <th className="px-4 py-3">Role</th>
                                <th className="px-4 py-3 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-700">
                            {users.length === 0 && !isLoading ? (
                                <tr>
                                    <td colSpan={4} className="px-4 py-8 text-center italic">No users found.</td>
                                </tr>
                            ) : (
                                users.map(u => (
                                    <tr key={u.id} className="hover:bg-gray-800/50">
                                        <td className="px-4 py-3 text-white font-medium">
                                            {u.email}
                                            {state.user?.email === u.email && <span className="ml-2 text-[10px] bg-blue-900 text-blue-200 px-1.5 py-0.5 rounded">YOU</span>}
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
                                <Label>Email Address</Label>
                                <Input 
                                    type="email" 
                                    value={formData.email} 
                                    onChange={e => setFormData({...formData, email: e.target.value})}
                                    required
                                />
                            </div>
                            <div>
                                <Label>Password {editingUser && '(Leave blank to keep current)'}</Label>
                                <Input 
                                    type="password" 
                                    value={formData.password} 
                                    onChange={e => setFormData({...formData, password: e.target.value})}
                                    required={!editingUser}
                                    placeholder={editingUser ? "••••••••" : "Secure Password"}
                                />
                            </div>
                            <div>
                                <Label>Role</Label>
                                <Select 
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
            const { data, error } = await supabase.functions.invoke('update-settings', {
                body: localSettings
            });
            if (error) throw error;
            
            dispatch({ type: 'SET_BUSINESS_INFO', payload: { ...state.businessInfo, ...localSettings } });
            dispatch({ type: 'SET_NOTIFICATION', payload: 'Configuration saved successfully.' });
        } catch (e) {
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
                <ServiceSettings settings={localSettings} handleChange={handleChange} />
            </Card>
        </div>
    );
};


const AdminDashboard: React.FC = () => {
    const { dispatch, state } = useAppState();
    const [logs, setLogs] = useState<TelemetryLog[]>([]);
    const [isCheckingDB, setIsCheckingDB] = useState(false);
    const [dbStatus, setDbStatus] = useState<'ok' | 'error' | null>(null);
    const [activeTab, setActiveTab] = useState<'overview' | 'usage' | 'config' | 'users' | 'help'>('overview');

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
                            onClick={() => setActiveTab('help')}
                            className={`w-full text-left px-4 py-2 rounded transition-colors ${activeTab === 'help' ? 'bg-blue-600 text-white' : 'text-gray-400 hover:bg-gray-700 hover:text-white'}`}
                        >
                            📚 Help Documentation
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

                    {activeTab === 'help' && (
                        <HelpEditor />
                    )}
                </main>
            </div>
        </div>
    );
};

export default AdminDashboard;