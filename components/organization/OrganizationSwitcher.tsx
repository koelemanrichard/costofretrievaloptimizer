// components/organization/OrganizationSwitcher.tsx
/**
 * OrganizationSwitcher
 *
 * Dropdown component for switching between organizations.
 * Shows current org name with chevron, expands to show all orgs.
 *
 * Created: 2026-01-10 - Multi-tenancy Phase 1, Task 2
 */

import React, { useState, useRef, useEffect } from 'react';
import { useOrganizationContext } from './OrganizationProvider';
import { CreateOrganizationModal } from './CreateOrganizationModal';
import { SmartLoader } from '../ui/FunLoaders';

interface OrganizationSwitcherProps {
  className?: string;
}

export function OrganizationSwitcher({ className = '' }: OrganizationSwitcherProps) {
  const {
    current,
    organizations,
    isLoading,
    isSwitching,
    switchOrganization,
    hasMultipleOrgs,
  } = useOrganizationContext();

  const [isOpen, setIsOpen] = useState(false);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Close on Escape key
  useEffect(() => {
    function handleEscape(event: KeyboardEvent) {
      if (event.key === 'Escape') setIsOpen(false);
    }
    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      return () => document.removeEventListener('keydown', handleEscape);
    }
  }, [isOpen]);

  const handleSwitch = async (orgId: string) => {
    if (orgId !== current?.id) {
      await switchOrganization(orgId);
    }
    setIsOpen(false);
  };

  if (isLoading) {
    return (
      <div className={`flex items-center gap-2 px-3 py-2 text-gray-400 ${className}`}>
        <SmartLoader context="loading" size="sm" showText={false} />
        <span className="text-sm">Loading...</span>
      </div>
    );
  }

  if (!current) {
    return null;
  }

  // Don't show dropdown if user only has one org
  if (!hasMultipleOrgs) {
    return (
      <div className={`flex items-center gap-2 px-3 py-2 ${className}`}>
        <OrgIcon type={current.type} />
        <span className="text-sm font-medium text-gray-200">{current.name}</span>
      </div>
    );
  }

  return (
    <div ref={dropdownRef} className={`relative ${className}`}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        disabled={isSwitching}
        className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-gray-700/50 transition-colors"
        aria-expanded={isOpen}
        aria-haspopup="listbox"
      >
        {isSwitching ? (
          <SmartLoader context="loading" size="sm" showText={false} />
        ) : (
          <OrgIcon type={current.type} />
        )}
        <span className="text-sm font-medium text-gray-200 max-w-[150px] truncate">
          {current.name}
        </span>
        <svg
          className={`w-4 h-4 text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {isOpen && (
        <div
          role="listbox"
          className="absolute top-full left-0 mt-1 w-64 bg-gray-800 border border-gray-700 rounded-lg shadow-xl z-50 py-1 max-h-64 overflow-y-auto"
        >
          {organizations.map((org) => (
            <button
              key={org.id}
              role="option"
              aria-selected={org.id === current.id}
              onClick={() => handleSwitch(org.id)}
              className={`w-full flex items-center gap-3 px-4 py-2 text-left hover:bg-gray-700/50 transition-colors ${
                org.id === current.id ? 'bg-blue-600/20 text-blue-400' : 'text-gray-200'
              }`}
            >
              <OrgIcon type={org.type} />
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium truncate">{org.name}</div>
                <div className="text-xs text-gray-500 capitalize">{org.type}</div>
              </div>
              {org.id === current.id && (
                <svg className="w-4 h-4 text-blue-400" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
              )}
            </button>
          ))}
          <div className="border-t border-gray-700 mt-1 pt-1">
            <button
              onClick={() => {
                setIsOpen(false);
                setIsCreateModalOpen(true);
              }}
              className="w-full flex items-center gap-3 px-4 py-2 text-left text-gray-400 hover:bg-gray-700/50 hover:text-gray-200 transition-colors"
            >
              <span className="text-base">+</span>
              <span className="text-sm">Create Organization</span>
            </button>
          </div>
        </div>
      )}

      <CreateOrganizationModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
      />
    </div>
  );
}

function OrgIcon({ type }: { type: string }) {
  const icons: Record<string, string> = {
    personal: '👤',
    team: '👥',
    enterprise: '🏢',
  };
  return <span className="text-base">{icons[type] || '🏢'}</span>;
}
