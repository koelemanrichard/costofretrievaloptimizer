



import React, { useState } from 'react';
// FIX: Corrected import path to be a relative path.
import { useAppState } from '../state/appState';
// FIX: Corrected import path to be a relative path.
import { Card } from './ui/Card';
// FIX: Corrected import path to be a relative path.
import { Button } from './ui/Button';
// FIX: Corrected import path to be a relative path.
import { Input } from './ui/Input';
// FIX: Corrected import path to be a relative path.
import { Label } from './ui/Label';
// FIX: Corrected import path to be a relative path.
import { Loader } from './ui/Loader';
// FIX: Corrected import path to be a relative path.
import { Project } from '../types';

interface ProjectSelectionScreenProps {
  onCreateProject: (projectName: string, domain: string) => void;
  onLoadProject: (projectId: string) => void;
}

const ProjectSelectionScreen: React.FC<ProjectSelectionScreenProps> = ({ onCreateProject, onLoadProject }) => {
  const { state } = useAppState();
  const { projects, isLoading } = state;
  const [newProjectName, setNewProjectName] = useState('');
  const [newProjectDomain, setNewProjectDomain] = useState('');

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (newProjectName && newProjectDomain) {
      onCreateProject(newProjectName, newProjectDomain);
    }
  };

  return (
    <div className="max-w-4xl w-full mx-auto">
      <header className="text-center mb-10">
        <h1 className="text-4xl font-bold text-white">Holistic SEO Workbench</h1>
        <p className="text-lg text-gray-400 mt-2">Create a new project or continue working on an existing one.</p>
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
                  <Button
                    onClick={() => onLoadProject(project.id)}
                    variant="secondary"
                    className="!py-1 !px-3 text-sm"
                    disabled={isLoading.loadProject}
                  >
                    Load
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </div>
  );
};

export default ProjectSelectionScreen;