/**
 * ProjectSettingsModal Component
 *
 * Modal for project-level settings including external collaborator limits
 * and other project-specific configurations.
 *
 * Created: 2026-01-11 - Multi-tenancy UI Integration
 */

import React, { useState } from 'react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { ExternalCollaboratorLimits } from './ExternalCollaboratorLimits';
import { usePermissions } from '../../hooks/usePermissions';

interface ProjectSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  projectId: string;
  projectName?: string;
}

type SettingsTab = 'collaborators' | 'general';

export function ProjectSettingsModal({
  isOpen,
  onClose,
  projectId,
  projectName,
}: ProjectSettingsModalProps) {
  const [activeTab, setActiveTab] = useState<SettingsTab>('collaborators');
  const { isAdmin } = usePermissions();

  const TabButton = ({ tab, label }: { tab: SettingsTab; label: string }) => (
    <button
      type="button"
      onClick={() => setActiveTab(tab)}
      className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
        activeTab === tab
          ? 'bg-blue-600 text-white'
          : 'text-gray-300 hover:bg-gray-700 hover:text-white'
      }`}
    >
      {label}
    </button>
  );

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Project Settings${projectName ? `: ${projectName}` : ''}`}
      description="Configure project-specific settings and collaborator access"
      maxWidth="max-w-3xl"
      zIndex="z-[70]"
    >
      <div className="space-y-6">
        {/* Tab Navigation */}
        <div className="flex gap-2 border-b border-gray-700 pb-3">
          <TabButton tab="collaborators" label="External Collaborators" />
          <TabButton tab="general" label="General" />
        </div>

        {/* Tab Content */}
        <div className="min-h-[300px]">
          {activeTab === 'collaborators' && (
            isAdmin ? (
              <ExternalCollaboratorLimits projectId={projectId} />
            ) : (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <svg
                  className="w-12 h-12 text-gray-500 mb-4"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                  />
                </svg>
                <p className="text-gray-400">
                  Only organization admins can manage external collaborator limits.
                </p>
              </div>
            )
          )}

          {activeTab === 'general' && (
            <div className="space-y-4">
              <div className="p-4 bg-gray-800/50 rounded-lg border border-gray-700">
                <h4 className="text-sm font-medium text-gray-400 uppercase tracking-wider mb-3">
                  Project Information
                </h4>
                <div className="space-y-3">
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Project ID</label>
                    <p className="text-gray-300 font-mono text-sm bg-gray-900/50 px-3 py-2 rounded">
                      {projectId}
                    </p>
                  </div>
                  {projectName && (
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">Project Name</label>
                      <p className="text-gray-300">{projectName}</p>
                    </div>
                  )}
                </div>
              </div>

              <div className="p-4 bg-gray-800/50 rounded-lg border border-gray-700">
                <h4 className="text-sm font-medium text-gray-400 uppercase tracking-wider mb-3">
                  Actions
                </h4>
                <p className="text-sm text-gray-500 mb-4">
                  Additional project settings and actions will be available here.
                </p>
                <div className="flex gap-3">
                  <Button variant="secondary" disabled>
                    Export Project Data
                  </Button>
                  <Button variant="ghost" disabled className="text-red-400">
                    Archive Project
                  </Button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-end pt-4 border-t border-gray-700">
          <Button variant="secondary" onClick={onClose}>
            Close
          </Button>
        </div>
      </div>
    </Modal>
  );
}

export default ProjectSettingsModal;
