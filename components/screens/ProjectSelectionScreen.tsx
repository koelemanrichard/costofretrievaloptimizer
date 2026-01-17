import React, { useState, useMemo } from 'react';
import { useAppState } from '../../state/appState';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Label } from '../ui/Label';
import { SmartLoader } from '../ui/FunLoaders';
import { Project, AppStep } from '../../types';
import { OrganizationSwitcher, PendingInvitationsBanner } from '../organization';
import { getSupabaseClient, resetSupabaseClient, clearSupabaseAuthStorage } from '../../services/supabaseClient';
import { useSuperAdmin } from '../../hooks/useSuperAdmin';

interface ProjectSelectionScreenProps {
  onCreateProject: (projectName: string, domain: string) => void;
  onLoadProject: (projectId: string) => void;
  onInitiateDeleteProject: (project: Project) => void;
}

type SortField = 'name' | 'domain' | 'maps' | 'created';
type SortDirection = 'asc' | 'desc';

const ProjectSelectionScreen: React.FC<ProjectSelectionScreenProps> = ({ onCreateProject, onLoadProject, onInitiateDeleteProject }) => {
  const { state, dispatch } = useAppState();
  const { projects, topicalMaps, isLoading, user, businessInfo } = state;
  const [newProjectName, setNewProjectName] = useState('');
  const [newProjectDomain, setNewProjectDomain] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortField, setSortField] = useState<SortField>('created');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  const [showCreateForm, setShowCreateForm] = useState(false);
  const { isSuperAdmin } = useSuperAdmin();

  // Count maps per project
  const projectMapCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    topicalMaps.forEach(map => {
      if (map.project_id) {
        counts[map.project_id] = (counts[map.project_id] || 0) + 1;
      }
    });
    return counts;
  }, [topicalMaps]);

  // Filter and sort projects
  const filteredProjects = useMemo(() => {
    let filtered = projects.filter(project => {
      const query = searchQuery.toLowerCase();
      return (
        project.project_name.toLowerCase().includes(query) ||
        project.domain.toLowerCase().includes(query)
      );
    });

    // Sort
    filtered.sort((a, b) => {
      let comparison = 0;
      switch (sortField) {
        case 'name':
          comparison = a.project_name.localeCompare(b.project_name);
          break;
        case 'domain':
          comparison = a.domain.localeCompare(b.domain);
          break;
        case 'maps':
          comparison = (projectMapCounts[a.id] || 0) - (projectMapCounts[b.id] || 0);
          break;
        case 'created':
          comparison = new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
          break;
      }
      return sortDirection === 'asc' ? comparison : -comparison;
    });

    return filtered;
  }, [projects, searchQuery, sortField, sortDirection, projectMapCounts]);

  const handleLogout = async () => {
    const supabase = getSupabaseClient(businessInfo.supabaseUrl, businessInfo.supabaseAnonKey);
    await supabase.auth.signOut({ scope: 'local' });
    clearSupabaseAuthStorage();
    resetSupabaseClient(true);
    dispatch({ type: 'SET_USER', payload: null });
    dispatch({ type: 'SET_STEP', payload: AppStep.AUTH });
  };

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (newProjectName && newProjectDomain) {
      onCreateProject(newProjectName, newProjectDomain);
      setShowCreateForm(false);
      setNewProjectName('');
      setNewProjectDomain('');
    }
  };

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) return <span className="text-gray-600 ml-1">↕</span>;
    return <span className="text-cyan-400 ml-1">{sortDirection === 'asc' ? '↑' : '↓'}</span>;
  };

  return (
    <div className="max-w-7xl w-full mx-auto relative pb-20 px-4">
      {/* Header */}
      <header className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 mb-8">
        <div className="flex items-center gap-6">
          <div>
            <h1 className="text-3xl font-bold text-white">Holistic SEO Workbench</h1>
            <p className="text-sm text-gray-400 mt-1">Next-Gen SEO Strategy & Migration Platform</p>
          </div>
          <OrganizationSwitcher />
        </div>
        <div className="flex items-center gap-3">
          {user && <span className="text-sm text-gray-400">{user.email}</span>}
          {isSuperAdmin && (
            <Button
              onClick={() => dispatch({ type: 'SET_STEP', payload: AppStep.ADMIN })}
              className="bg-gray-800 hover:bg-gray-700 border border-gray-600 flex items-center gap-2"
            >
              <span>🛡️</span> Admin
            </Button>
          )}
          <Button
            onClick={handleLogout}
            variant="secondary"
            className="bg-red-900/30 hover:bg-red-900/50 border border-red-700/50 text-red-300"
          >
            Logout
          </Button>
        </div>
      </header>

      <PendingInvitationsBanner onAccept={() => window.location.reload()} />

      {/* Main Projects Section */}
      <Card className="p-6">
        {/* Toolbar */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
          <div className="flex items-center gap-4">
            <h2 className="text-xl font-bold text-white">Projects</h2>
            <span className="text-sm text-gray-400 bg-gray-800 px-2 py-1 rounded">
              {filteredProjects.length} of {projects.length}
            </span>
          </div>

          <div className="flex items-center gap-3 w-full sm:w-auto">
            {/* Search */}
            <div className="relative flex-1 sm:flex-none">
              <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search projects..."
                className="w-full sm:w-64 bg-gray-900 border border-gray-700 rounded-lg pl-10 pr-4 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-cyan-500"
              />
            </div>

            {/* Create Button */}
            <Button
              onClick={() => setShowCreateForm(true)}
              className="flex items-center gap-2 whitespace-nowrap"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              New Project
            </Button>
          </div>
        </div>

        {/* Create Form (Collapsible) */}
        {showCreateForm && (
          <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-4 mb-6">
            <form onSubmit={handleCreate} className="flex flex-col sm:flex-row gap-4 items-end">
              <div className="flex-1">
                <Label htmlFor="new-project-name" className="text-sm">Project Name</Label>
                <Input
                  id="new-project-name"
                  value={newProjectName}
                  onChange={(e) => setNewProjectName(e.target.value)}
                  placeholder="e.g., Q4 Content Strategy"
                  required
                  className="mt-1"
                />
              </div>
              <div className="flex-1">
                <Label htmlFor="new-project-domain" className="text-sm">Domain</Label>
                <Input
                  id="new-project-domain"
                  value={newProjectDomain}
                  onChange={(e) => setNewProjectDomain(e.target.value)}
                  placeholder="e.g., yourdomain.com"
                  required
                  className="mt-1"
                />
              </div>
              <div className="flex gap-2">
                <Button type="submit" disabled={isLoading.createProject}>
                  {isLoading.createProject ? <SmartLoader context="building" size="sm" showText={false} /> : 'Create'}
                </Button>
                <Button type="button" variant="secondary" onClick={() => setShowCreateForm(false)}>
                  Cancel
                </Button>
              </div>
            </form>
          </div>
        )}

        {/* Projects Table */}
        {isLoading.projects ? (
          <div className="flex justify-center items-center h-48">
            <SmartLoader context="loading" size="lg" />
          </div>
        ) : projects.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-gray-500 text-5xl mb-4">📁</div>
            <p className="text-gray-400 mb-4">No projects yet. Create your first project to get started!</p>
            <Button onClick={() => setShowCreateForm(true)}>Create Your First Project</Button>
          </div>
        ) : filteredProjects.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-400">No projects match your search.</p>
            <button onClick={() => setSearchQuery('')} className="text-cyan-400 hover:text-cyan-300 text-sm mt-2">
              Clear search
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-700">
                  <th
                    className="text-left py-3 px-4 text-sm font-medium text-gray-400 cursor-pointer hover:text-white transition-colors"
                    onClick={() => handleSort('name')}
                  >
                    Project Name <SortIcon field="name" />
                  </th>
                  <th
                    className="text-left py-3 px-4 text-sm font-medium text-gray-400 cursor-pointer hover:text-white transition-colors"
                    onClick={() => handleSort('domain')}
                  >
                    Domain <SortIcon field="domain" />
                  </th>
                  <th
                    className="text-center py-3 px-4 text-sm font-medium text-gray-400 cursor-pointer hover:text-white transition-colors"
                    onClick={() => handleSort('maps')}
                  >
                    Maps <SortIcon field="maps" />
                  </th>
                  <th
                    className="text-left py-3 px-4 text-sm font-medium text-gray-400 cursor-pointer hover:text-white transition-colors"
                    onClick={() => handleSort('created')}
                  >
                    Created <SortIcon field="created" />
                  </th>
                  <th className="text-right py-3 px-4 text-sm font-medium text-gray-400">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {filteredProjects.map((project: Project) => (
                  <tr
                    key={project.id}
                    className="border-b border-gray-800 hover:bg-gray-800/50 transition-colors group"
                  >
                    <td className="py-3 px-4">
                      <span className="font-medium text-white">{project.project_name}</span>
                    </td>
                    <td className="py-3 px-4">
                      <a
                        href={`https://${project.domain}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-gray-400 hover:text-cyan-400 transition-colors flex items-center gap-1"
                        onClick={(e) => e.stopPropagation()}
                      >
                        {project.domain}
                        <svg className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                        </svg>
                      </a>
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span className={`inline-flex items-center justify-center min-w-[28px] h-7 px-2 rounded-full text-sm ${
                        (projectMapCounts[project.id] || 0) > 0
                          ? 'bg-cyan-900/30 text-cyan-400'
                          : 'bg-gray-800 text-gray-500'
                      }`}>
                        {projectMapCounts[project.id] || 0}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <span className="text-gray-400 text-sm">{formatDate(project.created_at)}</span>
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          onClick={() => onInitiateDeleteProject(project)}
                          variant="secondary"
                          className="!p-2 !bg-transparent hover:!bg-red-900/30 opacity-0 group-hover:opacity-100 transition-opacity"
                          title="Delete Project"
                          disabled={!!isLoading.loadProject}
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm4 0a1 1 0 012 0v6a1 1 0 11-2 0V8z" clipRule="evenodd" />
                          </svg>
                        </Button>
                        <Button
                          onClick={() => onLoadProject(project.id)}
                          className="!py-1.5 !px-4 text-sm"
                          disabled={isLoading.loadProject}
                        >
                          {isLoading.loadProject === project.id ? (
                            <SmartLoader context="loading" size="sm" showText={false} />
                          ) : (
                            'Open'
                          )}
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Site Analysis Tool */}
      <Card className="mt-6 p-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-white mb-1">Site Analysis</h2>
            <p className="text-sm text-gray-400">
              Audit your existing pages against Koray's Holistic SEO Framework.
            </p>
          </div>
          <Button
            onClick={() => dispatch({ type: 'SET_STEP', payload: AppStep.SITE_ANALYSIS })}
            variant="secondary"
            className="whitespace-nowrap"
          >
            Open Site Analysis
          </Button>
        </div>
      </Card>
    </div>
  );
};

export default ProjectSelectionScreen;
