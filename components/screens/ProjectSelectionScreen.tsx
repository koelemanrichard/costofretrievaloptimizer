import React, { useState } from 'react';
import { useAppState } from '../../state/appState';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Label } from '../ui/Label';
import { Loader } from '../ui/Loader';
import { Project, AppStep } from '../../types';
import { OrganizationSwitcher } from '../organization';
import { getSupabaseClient, resetSupabaseClient, clearSupabaseAuthStorage } from '../../services/supabaseClient';

interface ProjectSelectionScreenProps {
  onCreateProject: (projectName: string, domain: string) => void;
  onLoadProject: (projectId: string) => void;
  onInitiateDeleteProject: (project: Project) => void;
}

const ProjectSelectionScreen: React.FC<ProjectSelectionScreenProps> = ({ onCreateProject, onLoadProject, onInitiateDeleteProject }) => {
  const { state, dispatch } = useAppState();
  const { projects, isLoading, user, businessInfo } = state;
  const [newProjectName, setNewProjectName] = useState('');
  const [newProjectDomain, setNewProjectDomain] = useState('');

  const handleLogout = async () => {
    const supabase = getSupabaseClient(businessInfo.supabaseUrl, businessInfo.supabaseAnonKey);
    // Sign out with scope: 'local' to ensure all local session data is cleared
    await supabase.auth.signOut({ scope: 'local' });
    // Clear all Supabase auth storage from localStorage to prevent stale sessions
    clearSupabaseAuthStorage();
    // Reset the cached Supabase client to ensure a fresh client on next login
    resetSupabaseClient(true);
    dispatch({ type: 'SET_USER', payload: null });
    dispatch({ type: 'SET_STEP', payload: AppStep.AUTH });
  };

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (newProjectName && newProjectDomain) {
      onCreateProject(newProjectName, newProjectDomain);
    }
  };

  return (
    <div className="max-w-4xl w-full mx-auto relative pb-20">
      <header className="flex justify-between items-center mb-10">
        <div className="flex items-center gap-6">
          <div>
            <h1 className="text-4xl font-bold text-white">Holistic SEO Workbench</h1>
            <p className="text-lg text-gray-400 mt-2">Next-Gen SEO Strategy & Migration Platform</p>
          </div>
          <OrganizationSwitcher />
        </div>
        <div className="flex items-center gap-3">
            {user && (
              <span className="text-sm text-gray-400">{user.email}</span>
            )}
            {user?.user_metadata?.role === 'admin' && (
              <Button
                  onClick={() => dispatch({ type: 'SET_STEP', payload: AppStep.ADMIN })}
                  className="bg-gray-800 hover:bg-gray-700 border border-gray-600 flex items-center gap-2 shadow-lg"
              >
                  <span className="text-lg">🛡️</span> Admin Dashboard
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

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Create New Project */}
        <Card>
          <form onSubmit={handleCreate} className="p-8">
            <h2 className="text-2xl font-bold text-white mb-6">Create New Project</h2>
            <div className="space-y-4">
              <div>
                <Label htmlFor="new-project-name">Project Name</Label>
                <Input
                  id="new-project-name"
                  value={newProjectName}
                  onChange={(e) => setNewProjectName(e.target.value)}
                  placeholder="e.g., Q4 Content Strategy"
                  required
                />
              </div>
              <div>
                <Label htmlFor="new-project-domain">Domain</Label>
                <Input
                  id="new-project-domain"
                  value={newProjectDomain}
                  onChange={(e) => setNewProjectDomain(e.target.value)}
                  placeholder="e.g., yourdomain.com"
                  required
                />
              </div>
            </div>
            <Button type="submit" className="mt-6 w-full" disabled={isLoading.createProject}>
              {isLoading.createProject ? <Loader /> : 'Create and Open Project'}
            </Button>
          </form>
        </Card>

        {/* Load Existing Project */}
        <Card className="p-8">
          <h2 className="text-2xl font-bold text-white mb-6">Load Existing Project</h2>
          {isLoading.projects ? (
            <div className="flex justify-center items-center h-48">
              <Loader />
            </div>
          ) : projects.length === 0 ? (
            <p className="text-gray-400 text-center">No projects found.</p>
          ) : (
            <ul className="space-y-3 max-h-80 overflow-y-auto pr-2">
              {projects.map((project: Project) => (
                <li
                  key={project.id}
                  className="flex justify-between items-center p-3 bg-gray-900/50 rounded-lg hover:bg-gray-800/80 transition-colors"
                >
                  <div>
                    <p className="font-semibold text-white">{project.project_name}</p>
                    <p className="text-sm text-gray-400">{project.domain}</p>
                  </div>
                  <div className="flex items-center gap-2">
                     <Button
                        onClick={() => onInitiateDeleteProject(project)}
                        variant="secondary"
                        className="!p-2 !bg-red-900/50 hover:!bg-red-800/50"
                        title="Delete Project"
                        disabled={!!isLoading.loadProject}
                     >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-red-300" viewBox="0 0 20 20" fill="currentColor">
                           <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm4 0a1 1 0 012 0v6a1 1 0 11-2 0V8z" clipRule="evenodd" />
                        </svg>
                     </Button>
                     <Button
                        onClick={() => onLoadProject(project.id)}
                        variant="secondary"
                        className="!py-1 !px-3 text-sm"
                        disabled={isLoading.loadProject}
                      >
                        Load
                      </Button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>

      {/* Site Analysis Tool */}
      <Card className="mt-8 p-8">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-white mb-2">Site Analysis</h2>
            <p className="text-gray-400">
              Audit your existing pages against Koray's Holistic SEO Framework.
              Import from URL, sitemap, or GSC export.
            </p>
          </div>
          <Button
            onClick={() => dispatch({ type: 'SET_STEP', payload: AppStep.SITE_ANALYSIS })}
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