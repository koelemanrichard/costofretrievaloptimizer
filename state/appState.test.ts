// state/appState.test.ts
import { describe, it, expect, beforeEach } from 'vitest';
import { appReducer, initialState, type AppState, type AppAction } from './appState';
import { AppStep } from '../types';
import type { User } from '@supabase/supabase-js';

describe('appReducer', () => {
  let state: AppState;

  beforeEach(() => {
    state = { ...initialState };
  });

  describe('SET_USER', () => {
    it('sets user to payload value', () => {
      const mockUser = { id: 'user-123', email: 'test@example.com' } as User;
      const action: AppAction = { type: 'SET_USER', payload: mockUser };

      const newState = appReducer(state, action);

      expect(newState.user).toBe(mockUser);
      expect(newState.user?.id).toBe('user-123');
    });

    it('sets user to null', () => {
      const stateWithUser = { ...state, user: { id: 'user-123' } as User };
      const action: AppAction = { type: 'SET_USER', payload: null };

      const newState = appReducer(stateWithUser, action);

      expect(newState.user).toBeNull();
    });

    it('does not mutate original state', () => {
      const mockUser = { id: 'user-123' } as User;
      const action: AppAction = { type: 'SET_USER', payload: mockUser };
      const originalState = { ...state };

      appReducer(state, action);

      expect(state).toEqual(originalState);
    });
  });

  describe('SET_STEP', () => {
    it('changes app step to AUTH', () => {
      const action: AppAction = { type: 'SET_STEP', payload: AppStep.AUTH };

      const newState = appReducer(state, action);

      expect(newState.appStep).toBe(AppStep.AUTH);
    });

    it('changes app step to PROJECT_SELECTION', () => {
      const action: AppAction = { type: 'SET_STEP', payload: AppStep.PROJECT_SELECTION };

      const newState = appReducer(state, action);

      expect(newState.appStep).toBe(AppStep.PROJECT_SELECTION);
    });

    it('changes app step to PROJECT_DASHBOARD', () => {
      const action: AppAction = { type: 'SET_STEP', payload: AppStep.PROJECT_DASHBOARD };

      const newState = appReducer(state, action);

      expect(newState.appStep).toBe(AppStep.PROJECT_DASHBOARD);
    });

    it('preserves other state when changing step', () => {
      const stateWithData = {
        ...state,
        user: { id: 'user-123' } as User,
        error: 'Some error'
      };
      const action: AppAction = { type: 'SET_STEP', payload: AppStep.PROJECT_WORKSPACE };

      const newState = appReducer(stateWithData, action);

      expect(newState.appStep).toBe(AppStep.PROJECT_WORKSPACE);
      expect(newState.user?.id).toBe('user-123');
      expect(newState.error).toBe('Some error');
    });
  });

  describe('SET_VIEW_MODE', () => {
    it('sets view mode to CREATION', () => {
      const action: AppAction = { type: 'SET_VIEW_MODE', payload: 'CREATION' };

      const newState = appReducer(state, action);

      expect(newState.viewMode).toBe('CREATION');
    });

    it('sets view mode to MIGRATION', () => {
      const action: AppAction = { type: 'SET_VIEW_MODE', payload: 'MIGRATION' };

      const newState = appReducer(state, action);

      expect(newState.viewMode).toBe('MIGRATION');
    });

    it('can toggle from CREATION to MIGRATION', () => {
      const stateWithCreation = { ...state, viewMode: 'CREATION' as const };
      const action: AppAction = { type: 'SET_VIEW_MODE', payload: 'MIGRATION' };

      const newState = appReducer(stateWithCreation, action);

      expect(newState.viewMode).toBe('MIGRATION');
    });
  });

  describe('TOGGLE_STRATEGIST', () => {
    it('toggles strategist from false to true when no payload', () => {
      const stateWithClosed = { ...state, isStrategistOpen: false };
      const action: AppAction = { type: 'TOGGLE_STRATEGIST' };

      const newState = appReducer(stateWithClosed, action);

      expect(newState.isStrategistOpen).toBe(true);
    });

    it('toggles strategist from true to false when no payload', () => {
      const stateWithOpen = { ...state, isStrategistOpen: true };
      const action: AppAction = { type: 'TOGGLE_STRATEGIST' };

      const newState = appReducer(stateWithOpen, action);

      expect(newState.isStrategistOpen).toBe(false);
    });

    it('sets strategist to specific value when payload provided', () => {
      const action: AppAction = { type: 'TOGGLE_STRATEGIST', payload: true };

      const newState = appReducer(state, action);

      expect(newState.isStrategistOpen).toBe(true);
    });

    it('sets strategist to false when payload is false', () => {
      const stateWithOpen = { ...state, isStrategistOpen: true };
      const action: AppAction = { type: 'TOGGLE_STRATEGIST', payload: false };

      const newState = appReducer(stateWithOpen, action);

      expect(newState.isStrategistOpen).toBe(false);
    });
  });

  describe('SET_ERROR', () => {
    it('sets error message', () => {
      const action: AppAction = { type: 'SET_ERROR', payload: 'An error occurred' };

      const newState = appReducer(state, action);

      expect(newState.error).toBe('An error occurred');
    });

    it('clears error message when null', () => {
      const stateWithError = { ...state, error: 'Previous error' };
      const action: AppAction = { type: 'SET_ERROR', payload: null };

      const newState = appReducer(stateWithError, action);

      expect(newState.error).toBeNull();
    });
  });

  describe('SET_NOTIFICATION', () => {
    it('sets notification message', () => {
      const action: AppAction = { type: 'SET_NOTIFICATION', payload: 'Success!' };

      const newState = appReducer(state, action);

      expect(newState.notification).toBe('Success!');
    });

    it('clears notification when null', () => {
      const stateWithNotification = { ...state, notification: 'Previous notification' };
      const action: AppAction = { type: 'SET_NOTIFICATION', payload: null };

      const newState = appReducer(stateWithNotification, action);

      expect(newState.notification).toBeNull();
    });
  });

  describe('SET_LOADING', () => {
    it('sets loading state for a specific key', () => {
      const action: AppAction = {
        type: 'SET_LOADING',
        payload: { key: 'fetchProjects', value: true }
      };

      const newState = appReducer(state, action);

      expect(newState.isLoading.fetchProjects).toBe(true);
    });

    it('sets loading to false for a key', () => {
      const stateWithLoading = {
        ...state,
        isLoading: { fetchProjects: true }
      };
      const action: AppAction = {
        type: 'SET_LOADING',
        payload: { key: 'fetchProjects', value: false }
      };

      const newState = appReducer(stateWithLoading, action);

      expect(newState.isLoading.fetchProjects).toBe(false);
    });

    it('maintains multiple loading states independently', () => {
      const stateWithLoading = {
        ...state,
        isLoading: { fetchProjects: true, generateMap: true }
      };
      const action: AppAction = {
        type: 'SET_LOADING',
        payload: { key: 'fetchProjects', value: false }
      };

      const newState = appReducer(stateWithLoading, action);

      expect(newState.isLoading.fetchProjects).toBe(false);
      expect(newState.isLoading.generateMap).toBe(true);
    });
  });

  describe('SET_PROJECTS', () => {
    it('sets projects array', () => {
      const projects = [
        { id: 'proj-1', name: 'Project 1', user_id: 'user-123', created_at: new Date().toISOString() },
        { id: 'proj-2', name: 'Project 2', user_id: 'user-123', created_at: new Date().toISOString() }
      ] as any[];
      const action: AppAction = { type: 'SET_PROJECTS', payload: projects };

      const newState = appReducer(state, action);

      expect(newState.projects).toEqual(projects);
      expect(newState.projects.length).toBe(2);
    });

    it('replaces existing projects', () => {
      const existingProjects = [
        { id: 'proj-old', name: 'Old Project', user_id: 'user-123', created_at: new Date().toISOString() }
      ] as any[];
      const stateWithProjects = { ...state, projects: existingProjects };
      const newProjects = [
        { id: 'proj-1', name: 'Project 1', user_id: 'user-123', created_at: new Date().toISOString() }
      ] as any[];
      const action: AppAction = { type: 'SET_PROJECTS', payload: newProjects };

      const newState = appReducer(stateWithProjects, action);

      expect(newState.projects).toEqual(newProjects);
      expect(newState.projects[0].id).toBe('proj-1');
    });

    it('can set empty projects array', () => {
      const stateWithProjects = {
        ...state,
        projects: [{ id: 'proj-1', name: 'Project 1' }] as any[]
      };
      const action: AppAction = { type: 'SET_PROJECTS', payload: [] };

      const newState = appReducer(stateWithProjects, action);

      expect(newState.projects).toEqual([]);
    });
  });

  describe('ADD_PROJECT', () => {
    it('adds a project to empty array', () => {
      const project = {
        id: 'proj-1',
        name: 'New Project',
        user_id: 'user-123',
        created_at: new Date().toISOString()
      } as any;
      const action: AppAction = { type: 'ADD_PROJECT', payload: project };

      const newState = appReducer(state, action);

      expect(newState.projects.length).toBe(1);
      expect(newState.projects[0]).toEqual(project);
    });

    it('adds a project to existing projects', () => {
      const existingProject = { id: 'proj-1', name: 'Existing' } as any;
      const stateWithProjects = { ...state, projects: [existingProject] };
      const newProject = { id: 'proj-2', name: 'New Project' } as any;
      const action: AppAction = { type: 'ADD_PROJECT', payload: newProject };

      const newState = appReducer(stateWithProjects, action);

      expect(newState.projects.length).toBe(2);
      expect(newState.projects[0]).toEqual(existingProject);
      expect(newState.projects[1]).toEqual(newProject);
    });

    it('does not mutate original projects array', () => {
      const existingProject = { id: 'proj-1', name: 'Existing' } as any;
      const stateWithProjects = { ...state, projects: [existingProject] };
      const originalLength = stateWithProjects.projects.length;
      const newProject = { id: 'proj-2', name: 'New Project' } as any;
      const action: AppAction = { type: 'ADD_PROJECT', payload: newProject };

      appReducer(stateWithProjects, action);

      expect(stateWithProjects.projects.length).toBe(originalLength);
    });
  });

  describe('DELETE_PROJECT', () => {
    it('deletes a project by id', () => {
      const projects = [
        { id: 'proj-1', name: 'Project 1' },
        { id: 'proj-2', name: 'Project 2' },
        { id: 'proj-3', name: 'Project 3' }
      ] as any[];
      const stateWithProjects = { ...state, projects };
      const action: AppAction = { type: 'DELETE_PROJECT', payload: { projectId: 'proj-2' } };

      const newState = appReducer(stateWithProjects, action);

      expect(newState.projects.length).toBe(2);
      expect(newState.projects.find(p => p.id === 'proj-2')).toBeUndefined();
      expect(newState.projects[0].id).toBe('proj-1');
      expect(newState.projects[1].id).toBe('proj-3');
    });

    it('handles deleting non-existent project', () => {
      const projects = [
        { id: 'proj-1', name: 'Project 1' }
      ] as any[];
      const stateWithProjects = { ...state, projects };
      const action: AppAction = { type: 'DELETE_PROJECT', payload: { projectId: 'non-existent' } };

      const newState = appReducer(stateWithProjects, action);

      expect(newState.projects.length).toBe(1);
      expect(newState.projects[0].id).toBe('proj-1');
    });

    it('can delete last remaining project', () => {
      const projects = [{ id: 'proj-1', name: 'Project 1' }] as any[];
      const stateWithProjects = { ...state, projects };
      const action: AppAction = { type: 'DELETE_PROJECT', payload: { projectId: 'proj-1' } };

      const newState = appReducer(stateWithProjects, action);

      expect(newState.projects.length).toBe(0);
    });
  });

  describe('SET_ACTIVE_PROJECT', () => {
    it('sets active project id', () => {
      const action: AppAction = { type: 'SET_ACTIVE_PROJECT', payload: 'proj-123' };

      const newState = appReducer(state, action);

      expect(newState.activeProjectId).toBe('proj-123');
    });

    it('clears active map id when setting active project', () => {
      const stateWithActiveMap = {
        ...state,
        activeProjectId: 'proj-1',
        activeMapId: 'map-123'
      };
      const action: AppAction = { type: 'SET_ACTIVE_PROJECT', payload: 'proj-456' };

      const newState = appReducer(stateWithActiveMap, action);

      expect(newState.activeProjectId).toBe('proj-456');
      expect(newState.activeMapId).toBeNull();
    });

    it('clears topical maps when setting active project', () => {
      const stateWithMaps = {
        ...state,
        topicalMaps: [{ id: 'map-1', name: 'Map 1' }] as any[]
      };
      const action: AppAction = { type: 'SET_ACTIVE_PROJECT', payload: 'proj-456' };

      const newState = appReducer(stateWithMaps, action);

      expect(newState.activeProjectId).toBe('proj-456');
      expect(newState.topicalMaps).toEqual([]);
    });

    it('can set active project to null', () => {
      const stateWithActiveProject = { ...state, activeProjectId: 'proj-123' };
      const action: AppAction = { type: 'SET_ACTIVE_PROJECT', payload: null };

      const newState = appReducer(stateWithActiveProject, action);

      expect(newState.activeProjectId).toBeNull();
    });
  });

  describe('SET_TOPICAL_MAPS', () => {
    it('sets topical maps array', () => {
      const maps = [
        { id: 'map-1', name: 'Map 1', project_id: 'proj-1' },
        { id: 'map-2', name: 'Map 2', project_id: 'proj-1' }
      ] as any[];
      const action: AppAction = { type: 'SET_TOPICAL_MAPS', payload: maps };

      const newState = appReducer(state, action);

      expect(newState.topicalMaps).toEqual(maps);
      expect(newState.topicalMaps.length).toBe(2);
    });

    it('replaces existing maps', () => {
      const existingMaps = [{ id: 'map-old', name: 'Old Map' }] as any[];
      const stateWithMaps = { ...state, topicalMaps: existingMaps };
      const newMaps = [{ id: 'map-1', name: 'Map 1' }] as any[];
      const action: AppAction = { type: 'SET_TOPICAL_MAPS', payload: newMaps };

      const newState = appReducer(stateWithMaps, action);

      expect(newState.topicalMaps).toEqual(newMaps);
    });
  });

  describe('ADD_TOPICAL_MAP', () => {
    it('adds a topical map to empty array', () => {
      const map = { id: 'map-1', name: 'New Map', project_id: 'proj-1' } as any;
      const action: AppAction = { type: 'ADD_TOPICAL_MAP', payload: map };

      const newState = appReducer(state, action);

      expect(newState.topicalMaps.length).toBe(1);
      expect(newState.topicalMaps[0]).toEqual(map);
    });

    it('adds a map to existing maps', () => {
      const existingMap = { id: 'map-1', name: 'Existing Map' } as any;
      const stateWithMaps = { ...state, topicalMaps: [existingMap] };
      const newMap = { id: 'map-2', name: 'New Map' } as any;
      const action: AppAction = { type: 'ADD_TOPICAL_MAP', payload: newMap };

      const newState = appReducer(stateWithMaps, action);

      expect(newState.topicalMaps.length).toBe(2);
      expect(newState.topicalMaps[1]).toEqual(newMap);
    });
  });

  describe('DELETE_TOPICAL_MAP', () => {
    it('deletes a topical map by id', () => {
      const maps = [
        { id: 'map-1', name: 'Map 1' },
        { id: 'map-2', name: 'Map 2' },
        { id: 'map-3', name: 'Map 3' }
      ] as any[];
      const stateWithMaps = { ...state, topicalMaps: maps };
      const action: AppAction = { type: 'DELETE_TOPICAL_MAP', payload: { mapId: 'map-2' } };

      const newState = appReducer(stateWithMaps, action);

      expect(newState.topicalMaps.length).toBe(2);
      expect(newState.topicalMaps.find(m => m.id === 'map-2')).toBeUndefined();
    });

    it('handles deleting non-existent map', () => {
      const maps = [{ id: 'map-1', name: 'Map 1' }] as any[];
      const stateWithMaps = { ...state, topicalMaps: maps };
      const action: AppAction = { type: 'DELETE_TOPICAL_MAP', payload: { mapId: 'non-existent' } };

      const newState = appReducer(stateWithMaps, action);

      expect(newState.topicalMaps.length).toBe(1);
    });
  });

  describe('SET_ACTIVE_MAP', () => {
    it('sets active map id', () => {
      const action: AppAction = { type: 'SET_ACTIVE_MAP', payload: 'map-123' };

      const newState = appReducer(state, action);

      expect(newState.activeMapId).toBe('map-123');
    });

    it('can set active map to null', () => {
      const stateWithActiveMap = { ...state, activeMapId: 'map-123' };
      const action: AppAction = { type: 'SET_ACTIVE_MAP', payload: null };

      const newState = appReducer(stateWithActiveMap, action);

      expect(newState.activeMapId).toBeNull();
    });
  });

  describe('SET_MODAL_VISIBILITY', () => {
    it('shows a modal', () => {
      const action: AppAction = {
        type: 'SET_MODAL_VISIBILITY',
        payload: { modal: 'briefModal', visible: true }
      };

      const newState = appReducer(state, action);

      expect(newState.modals.briefModal).toBe(true);
    });

    it('hides a modal', () => {
      const stateWithModal = {
        ...state,
        modals: { briefModal: true }
      };
      const action: AppAction = {
        type: 'SET_MODAL_VISIBILITY',
        payload: { modal: 'briefModal', visible: false }
      };

      const newState = appReducer(stateWithModal, action);

      expect(newState.modals.briefModal).toBe(false);
    });

    it('maintains multiple modals independently', () => {
      const stateWithModals = {
        ...state,
        modals: { modal1: true, modal2: false }
      };
      const action: AppAction = {
        type: 'SET_MODAL_VISIBILITY',
        payload: { modal: 'modal2', visible: true }
      };

      const newState = appReducer(stateWithModals, action);

      expect(newState.modals.modal1).toBe(true);
      expect(newState.modals.modal2).toBe(true);
    });
  });

  describe('SHOW_CONFIRMATION', () => {
    it('shows confirmation dialog with title, message, and callback', () => {
      const onConfirm = () => console.log('confirmed');
      const action: AppAction = {
        type: 'SHOW_CONFIRMATION',
        payload: {
          title: 'Delete Project',
          message: 'Are you sure?',
          onConfirm
        }
      };

      const newState = appReducer(state, action);

      expect(newState.confirmation).not.toBeNull();
      expect(newState.confirmation?.title).toBe('Delete Project');
      expect(newState.confirmation?.message).toBe('Are you sure?');
      expect(newState.confirmation?.onConfirm).toBe(onConfirm);
    });

    it('replaces existing confirmation', () => {
      const oldConfirm = () => console.log('old');
      const stateWithConfirmation = {
        ...state,
        confirmation: { title: 'Old', message: 'Old message', onConfirm: oldConfirm }
      };
      const newConfirm = () => console.log('new');
      const action: AppAction = {
        type: 'SHOW_CONFIRMATION',
        payload: { title: 'New', message: 'New message', onConfirm: newConfirm }
      };

      const newState = appReducer(stateWithConfirmation, action);

      expect(newState.confirmation?.title).toBe('New');
      expect(newState.confirmation?.message).toBe('New message');
    });
  });

  describe('HIDE_CONFIRMATION', () => {
    it('hides confirmation dialog', () => {
      const stateWithConfirmation = {
        ...state,
        confirmation: {
          title: 'Delete',
          message: 'Are you sure?',
          onConfirm: () => {}
        }
      };
      const action: AppAction = { type: 'HIDE_CONFIRMATION' };

      const newState = appReducer(stateWithConfirmation, action);

      expect(newState.confirmation).toBeNull();
    });

    it('handles hiding when already null', () => {
      const action: AppAction = { type: 'HIDE_CONFIRMATION' };

      const newState = appReducer(state, action);

      expect(newState.confirmation).toBeNull();
    });
  });

  describe('LOG_EVENT', () => {
    it('adds event to beginning of log', () => {
      const logEntry = {
        service: 'Test',
        message: 'Test event',
        status: 'info' as const,
        timestamp: Date.now()
      };
      const action: AppAction = { type: 'LOG_EVENT', payload: logEntry };

      const newState = appReducer(state, action);

      expect(newState.generationLog.length).toBe(1);
      expect(newState.generationLog[0]).toEqual(logEntry);
    });

    it('adds multiple events in order', () => {
      const event1 = { service: 'Test', message: 'First', status: 'info' as const, timestamp: 1000 };
      const event2 = { service: 'Test', message: 'Second', status: 'info' as const, timestamp: 2000 };

      let newState = appReducer(state, { type: 'LOG_EVENT', payload: event1 });
      newState = appReducer(newState, { type: 'LOG_EVENT', payload: event2 });

      expect(newState.generationLog.length).toBe(2);
      expect(newState.generationLog[0]).toEqual(event2); // Most recent first
      expect(newState.generationLog[1]).toEqual(event1);
    });

    it('limits log to 100 entries', () => {
      // Start with 100 entries
      const existingLog = Array.from({ length: 100 }, (_, i) => ({
        service: 'Test',
        message: `Event ${i}`,
        status: 'info' as const,
        timestamp: i
      }));
      const stateWithFullLog = { ...state, generationLog: existingLog };

      const newEntry = {
        service: 'Test',
        message: 'New event',
        status: 'info' as const,
        timestamp: 101
      };
      const action: AppAction = { type: 'LOG_EVENT', payload: newEntry };

      const newState = appReducer(stateWithFullLog, action);

      expect(newState.generationLog.length).toBe(100);
      expect(newState.generationLog[0]).toEqual(newEntry);
      expect(newState.generationLog[99].message).toBe('Event 98'); // Oldest is dropped
    });
  });

  describe('CLEAR_LOG', () => {
    it('clears all log entries', () => {
      const stateWithLog = {
        ...state,
        generationLog: [
          { service: 'Test', message: 'Event 1', status: 'info' as const, timestamp: 1000 },
          { service: 'Test', message: 'Event 2', status: 'info' as const, timestamp: 2000 }
        ]
      };
      const action: AppAction = { type: 'CLEAR_LOG' };

      const newState = appReducer(stateWithLog, action);

      expect(newState.generationLog).toEqual([]);
    });

    it('handles clearing when already empty', () => {
      const action: AppAction = { type: 'CLEAR_LOG' };

      const newState = appReducer(state, action);

      expect(newState.generationLog).toEqual([]);
    });
  });

  describe('Analysis Result Actions', () => {
    it('SET_VALIDATION_RESULT sets validation result', () => {
      const validationResult = {
        isValid: true,
        message: 'Valid',
        issues: []
      } as any;
      const action: AppAction = { type: 'SET_VALIDATION_RESULT', payload: validationResult };

      const newState = appReducer(state, action);

      expect(newState.validationResult).toEqual(validationResult);
    });

    it('SET_VALIDATION_RESULT can clear result', () => {
      const stateWithResult = {
        ...state,
        validationResult: { isValid: true, message: 'Valid', issues: [] } as any
      };
      const action: AppAction = { type: 'SET_VALIDATION_RESULT', payload: null };

      const newState = appReducer(stateWithResult, action);

      expect(newState.validationResult).toBeNull();
    });

    it('SET_GSC_OPPORTUNITIES sets GSC opportunities', () => {
      const opportunities = [
        { keyword: 'test', impressions: 100, clicks: 10 }
      ] as any[];
      const action: AppAction = { type: 'SET_GSC_OPPORTUNITIES', payload: opportunities };

      const newState = appReducer(state, action);

      expect(newState.gscOpportunities).toEqual(opportunities);
    });

    it('SET_IMPROVEMENT_LOG sets improvement suggestions', () => {
      const improvement = {
        suggestions: ['Add more topics'],
        score: 7.5
      } as any;
      const action: AppAction = { type: 'SET_IMPROVEMENT_LOG', payload: improvement };

      const newState = appReducer(state, action);

      expect(newState.improvementLog).toEqual(improvement);
    });

    it('SET_MERGE_SUGGESTIONS sets merge suggestions', () => {
      const suggestions = [
        { topicIds: ['topic-1', 'topic-2'], reason: 'Similar content' }
      ] as any[];
      const action: AppAction = { type: 'SET_MERGE_SUGGESTIONS', payload: suggestions };

      const newState = appReducer(state, action);

      expect(newState.mergeSuggestions).toEqual(suggestions);
    });

    it('SET_SEMANTIC_ANALYSIS_RESULT sets semantic analysis', () => {
      const analysis = { score: 8.5, entities: [] } as any;
      const action: AppAction = { type: 'SET_SEMANTIC_ANALYSIS_RESULT', payload: analysis };

      const newState = appReducer(state, action);

      expect(newState.semanticAnalysisResult).toEqual(analysis);
    });

    it('SET_FLOW_AUDIT_RESULT sets flow audit result', () => {
      const flowResult = { score: 9.0, issues: [] } as any;
      const action: AppAction = { type: 'SET_FLOW_AUDIT_RESULT', payload: flowResult };

      const newState = appReducer(state, action);

      expect(newState.flowAuditResult).toEqual(flowResult);
    });
  });

  describe('Site Analysis Actions', () => {
    it('SET_SITE_ANALYSIS_VIEW_MODE changes view mode', () => {
      const action: AppAction = { type: 'SET_SITE_ANALYSIS_VIEW_MODE', payload: 'extracting' };

      const newState = appReducer(state, action);

      expect(newState.siteAnalysis.viewMode).toBe('extracting');
    });

    it('SET_SITE_ANALYSIS_PROJECT sets current project', () => {
      const project = { id: 'site-1', url: 'https://example.com' } as any;
      const action: AppAction = { type: 'SET_SITE_ANALYSIS_PROJECT', payload: project };

      const newState = appReducer(state, action);

      expect(newState.siteAnalysis.currentProject).toEqual(project);
    });

    it('SET_SITE_ANALYSIS_SELECTED_PAGE sets selected page id', () => {
      const action: AppAction = { type: 'SET_SITE_ANALYSIS_SELECTED_PAGE', payload: 'page-123' };

      const newState = appReducer(state, action);

      expect(newState.siteAnalysis.selectedPageId).toBe('page-123');
    });

    it('SET_SITE_ANALYSIS_PILLARS sets discovered pillars', () => {
      const pillars = { primary: [], secondary: [] } as any;
      const action: AppAction = { type: 'SET_SITE_ANALYSIS_PILLARS', payload: pillars };

      const newState = appReducer(state, action);

      expect(newState.siteAnalysis.discoveredPillars).toEqual(pillars);
    });

    it('RESET_SITE_ANALYSIS resets all site analysis state', () => {
      const stateWithAnalysis = {
        ...state,
        siteAnalysis: {
          viewMode: 'results' as const,
          currentProject: { id: 'site-1' } as any,
          selectedPageId: 'page-123',
          discoveredPillars: { primary: [], secondary: [] } as any
        }
      };
      const action: AppAction = { type: 'RESET_SITE_ANALYSIS' };

      const newState = appReducer(stateWithAnalysis, action);

      expect(newState.siteAnalysis.viewMode).toBe('project_list');
      expect(newState.siteAnalysis.currentProject).toBeNull();
      expect(newState.siteAnalysis.selectedPageId).toBeNull();
      expect(newState.siteAnalysis.discoveredPillars).toBeNull();
    });
  });

  describe('Foundation Pages & Navigation Actions', () => {
    it('SET_FOUNDATION_PAGES sets foundation pages', () => {
      const pages = [
        { id: 'page-1', title: 'About Us', type: 'about' }
      ] as any[];
      const action: AppAction = { type: 'SET_FOUNDATION_PAGES', payload: pages };

      const newState = appReducer(state, action);

      expect(newState.websiteStructure.foundationPages).toEqual(pages);
    });

    it('ADD_FOUNDATION_PAGE adds a page', () => {
      const existingPage = { id: 'page-1', title: 'About' } as any;
      const stateWithPage = {
        ...state,
        websiteStructure: { ...state.websiteStructure, foundationPages: [existingPage] }
      };
      const newPage = { id: 'page-2', title: 'Contact' } as any;
      const action: AppAction = { type: 'ADD_FOUNDATION_PAGE', payload: newPage };

      const newState = appReducer(stateWithPage, action);

      expect(newState.websiteStructure.foundationPages.length).toBe(2);
      expect(newState.websiteStructure.foundationPages[1]).toEqual(newPage);
    });

    it('UPDATE_FOUNDATION_PAGE updates page properties', () => {
      const page = { id: 'page-1', title: 'About Us', status: 'draft' } as any;
      const stateWithPage = {
        ...state,
        websiteStructure: { ...state.websiteStructure, foundationPages: [page] }
      };
      const action: AppAction = {
        type: 'UPDATE_FOUNDATION_PAGE',
        payload: { pageId: 'page-1', updates: { status: 'published' } }
      };

      const newState = appReducer(stateWithPage, action);

      expect(newState.websiteStructure.foundationPages[0].status).toBe('published');
      expect(newState.websiteStructure.foundationPages[0].title).toBe('About Us');
    });

    it('DELETE_FOUNDATION_PAGE soft deletes a page', () => {
      const page = { id: 'page-1', title: 'About Us' } as any;
      const stateWithPage = {
        ...state,
        websiteStructure: { ...state.websiteStructure, foundationPages: [page] }
      };
      const action: AppAction = {
        type: 'DELETE_FOUNDATION_PAGE',
        payload: { pageId: 'page-1' }
      };

      const newState = appReducer(stateWithPage, action);

      expect(newState.websiteStructure.foundationPages[0].deleted_at).toBeDefined();
      expect(newState.websiteStructure.foundationPages[0].deletion_reason).toBe('user_deleted');
    });

    it('SET_NAVIGATION sets navigation structure', () => {
      const navigation = { header: [], footer: [] } as any;
      const action: AppAction = { type: 'SET_NAVIGATION', payload: navigation };

      const newState = appReducer(state, action);

      expect(newState.websiteStructure.navigation).toEqual(navigation);
    });

    it('UPDATE_NAVIGATION updates navigation properties', () => {
      const stateWithNav = {
        ...state,
        websiteStructure: {
          ...state.websiteStructure,
          navigation: { header: [], footer: [], sticky: false } as any
        }
      };
      const action: AppAction = {
        type: 'UPDATE_NAVIGATION',
        payload: { sticky: true }
      };

      const newState = appReducer(stateWithNav, action);

      expect(newState.websiteStructure.navigation?.sticky).toBe(true);
      expect(newState.websiteStructure.navigation?.header).toEqual([]);
    });

    it('UPDATE_NAVIGATION handles null navigation', () => {
      const action: AppAction = {
        type: 'UPDATE_NAVIGATION',
        payload: { sticky: true }
      };

      const newState = appReducer(state, action);

      expect(newState.websiteStructure.navigation).toBeNull();
    });

    it('SET_NAP_DATA sets NAP data', () => {
      const napData = {
        name: 'Company Name',
        address: '123 Main St',
        phone: '555-1234'
      } as any;
      const action: AppAction = { type: 'SET_NAP_DATA', payload: napData };

      const newState = appReducer(state, action);

      expect(newState.websiteStructure.napData).toEqual(napData);
    });

    it('ADD_FOUNDATION_NOTIFICATION adds notification', () => {
      const notification = {
        id: 'notif-1',
        message: 'Page created',
        type: 'success'
      } as any;
      const action: AppAction = { type: 'ADD_FOUNDATION_NOTIFICATION', payload: notification };

      const newState = appReducer(state, action);

      expect(newState.websiteStructure.notifications.length).toBe(1);
      expect(newState.websiteStructure.notifications[0]).toEqual(notification);
    });

    it('DISMISS_FOUNDATION_NOTIFICATION removes notification', () => {
      const stateWithNotif = {
        ...state,
        websiteStructure: {
          ...state.websiteStructure,
          notifications: [
            { id: 'notif-1', message: 'Test' },
            { id: 'notif-2', message: 'Test 2' }
          ] as any[]
        }
      };
      const action: AppAction = {
        type: 'DISMISS_FOUNDATION_NOTIFICATION',
        payload: { notificationId: 'notif-1' }
      };

      const newState = appReducer(stateWithNotif, action);

      expect(newState.websiteStructure.notifications.length).toBe(1);
      expect(newState.websiteStructure.notifications[0].id).toBe('notif-2');
    });

    it('SET_WEBSITE_STRUCTURE_GENERATING sets generating flag', () => {
      const action: AppAction = { type: 'SET_WEBSITE_STRUCTURE_GENERATING', payload: true };

      const newState = appReducer(state, action);

      expect(newState.websiteStructure.isGenerating).toBe(true);
    });

    it('RESET_WEBSITE_STRUCTURE resets all website structure', () => {
      const stateWithStructure = {
        ...state,
        websiteStructure: {
          foundationPages: [{ id: 'page-1' }] as any[],
          navigation: { header: [] } as any,
          navigationSyncStatus: { synced: true } as any,
          notifications: [{ id: 'notif-1' }] as any[],
          isGenerating: true
        }
      };
      const action: AppAction = { type: 'RESET_WEBSITE_STRUCTURE' };

      const newState = appReducer(stateWithStructure, action);

      expect(newState.websiteStructure.foundationPages).toEqual([]);
      expect(newState.websiteStructure.navigation).toBeNull();
      expect(newState.websiteStructure.navigationSyncStatus).toBeNull();
      expect(newState.websiteStructure.notifications).toEqual([]);
      expect(newState.websiteStructure.isGenerating).toBe(false);
    });
  });

  describe('Linking Audit Actions', () => {
    it('SET_LINKING_AUDIT_RESULT sets audit result', () => {
      const result = { score: 8.5, issues: [] } as any;
      const action: AppAction = { type: 'SET_LINKING_AUDIT_RESULT', payload: result };

      const newState = appReducer(state, action);

      expect(newState.linkingAudit.result).toEqual(result);
    });

    it('SET_LINKING_AUDIT_RUNNING sets running flag', () => {
      const action: AppAction = { type: 'SET_LINKING_AUDIT_RUNNING', payload: true };

      const newState = appReducer(state, action);

      expect(newState.linkingAudit.isRunning).toBe(true);
    });

    it('SET_LINKING_PENDING_FIXES sets pending fixes', () => {
      const fixes = [{ id: 'fix-1', type: 'broken_link' }] as any[];
      const action: AppAction = { type: 'SET_LINKING_PENDING_FIXES', payload: fixes };

      const newState = appReducer(state, action);

      expect(newState.linkingAudit.pendingFixes).toEqual(fixes);
    });

    it('ADD_LINKING_FIX_HISTORY adds to history with 100 limit', () => {
      const entry = { id: 'history-1', fix: 'Fixed link' } as any;
      const action: AppAction = { type: 'ADD_LINKING_FIX_HISTORY', payload: entry };

      const newState = appReducer(state, action);

      expect(newState.linkingAudit.fixHistory.length).toBe(1);
      expect(newState.linkingAudit.fixHistory[0]).toEqual(entry);
    });

    it('ADD_LINKING_FIX_HISTORY limits to 100 entries', () => {
      const existingHistory = Array.from({ length: 100 }, (_, i) => ({
        id: `history-${i}`,
        fix: `Fix ${i}`
      })) as any[];
      const stateWithHistory = {
        ...state,
        linkingAudit: { ...state.linkingAudit, fixHistory: existingHistory }
      };
      const newEntry = { id: 'history-101', fix: 'New fix' } as any;
      const action: AppAction = { type: 'ADD_LINKING_FIX_HISTORY', payload: newEntry };

      const newState = appReducer(stateWithHistory, action);

      expect(newState.linkingAudit.fixHistory.length).toBe(100);
      expect(newState.linkingAudit.fixHistory[0]).toEqual(newEntry);
    });

    it('CLEAR_LINKING_FIX_HISTORY clears history', () => {
      const stateWithHistory = {
        ...state,
        linkingAudit: {
          ...state.linkingAudit,
          fixHistory: [{ id: 'history-1' }] as any[]
        }
      };
      const action: AppAction = { type: 'CLEAR_LINKING_FIX_HISTORY' };

      const newState = appReducer(stateWithHistory, action);

      expect(newState.linkingAudit.fixHistory).toEqual([]);
    });

    it('SET_LINKING_LAST_AUDIT_ID sets audit id', () => {
      const action: AppAction = { type: 'SET_LINKING_LAST_AUDIT_ID', payload: 'audit-123' };

      const newState = appReducer(state, action);

      expect(newState.linkingAudit.lastAuditId).toBe('audit-123');
    });

    it('RESET_LINKING_AUDIT resets all linking audit state', () => {
      const stateWithAudit = {
        ...state,
        linkingAudit: {
          result: { score: 8.5 } as any,
          isRunning: true,
          pendingFixes: [{ id: 'fix-1' }] as any[],
          fixHistory: [{ id: 'history-1' }] as any[],
          lastAuditId: 'audit-123'
        }
      };
      const action: AppAction = { type: 'RESET_LINKING_AUDIT' };

      const newState = appReducer(stateWithAudit, action);

      expect(newState.linkingAudit.result).toBeNull();
      expect(newState.linkingAudit.isRunning).toBe(false);
      expect(newState.linkingAudit.pendingFixes).toEqual([]);
      expect(newState.linkingAudit.fixHistory).toEqual([]);
      expect(newState.linkingAudit.lastAuditId).toBeNull();
    });
  });

  describe('Unified Audit Actions', () => {
    it('SET_UNIFIED_AUDIT_RESULT sets audit result', () => {
      const result = { overallScore: 9.0, issues: [] } as any;
      const action: AppAction = { type: 'SET_UNIFIED_AUDIT_RESULT', payload: result };

      const newState = appReducer(state, action);

      expect(newState.unifiedAudit.result).toEqual(result);
    });

    it('SET_UNIFIED_AUDIT_RUNNING sets running flag', () => {
      const action: AppAction = { type: 'SET_UNIFIED_AUDIT_RUNNING', payload: true };

      const newState = appReducer(state, action);

      expect(newState.unifiedAudit.isRunning).toBe(true);
    });

    it('SET_UNIFIED_AUDIT_PROGRESS sets progress', () => {
      const progress = { current: 5, total: 10, stage: 'analyzing' } as any;
      const action: AppAction = { type: 'SET_UNIFIED_AUDIT_PROGRESS', payload: progress };

      const newState = appReducer(state, action);

      expect(newState.unifiedAudit.progress).toEqual(progress);
    });

    it('SET_UNIFIED_AUDIT_HISTORY replaces history', () => {
      const history = [
        { id: 'history-1', fix: 'Fix 1' },
        { id: 'history-2', fix: 'Fix 2' }
      ] as any[];
      const action: AppAction = { type: 'SET_UNIFIED_AUDIT_HISTORY', payload: history };

      const newState = appReducer(state, action);

      expect(newState.unifiedAudit.fixHistory).toEqual(history);
    });

    it('ADD_UNIFIED_AUDIT_HISTORY adds entry to beginning', () => {
      const existingEntry = { id: 'history-1', fix: 'Old fix' } as any;
      const stateWithHistory = {
        ...state,
        unifiedAudit: { ...state.unifiedAudit, fixHistory: [existingEntry] }
      };
      const newEntry = { id: 'history-2', fix: 'New fix' } as any;
      const action: AppAction = { type: 'ADD_UNIFIED_AUDIT_HISTORY', payload: newEntry };

      const newState = appReducer(stateWithHistory, action);

      expect(newState.unifiedAudit.fixHistory.length).toBe(2);
      expect(newState.unifiedAudit.fixHistory[0]).toEqual(newEntry);
      expect(newState.unifiedAudit.fixHistory[1]).toEqual(existingEntry);
    });

    it('SET_UNIFIED_AUDIT_ID sets audit id', () => {
      const action: AppAction = { type: 'SET_UNIFIED_AUDIT_ID', payload: 'unified-audit-456' };

      const newState = appReducer(state, action);

      expect(newState.unifiedAudit.lastAuditId).toBe('unified-audit-456');
    });

    it('RESET_UNIFIED_AUDIT resets all unified audit state', () => {
      const stateWithAudit = {
        ...state,
        unifiedAudit: {
          result: { overallScore: 9.0 } as any,
          isRunning: true,
          progress: { current: 5, total: 10 } as any,
          fixHistory: [{ id: 'history-1' }] as any[],
          lastAuditId: 'unified-audit-456'
        }
      };
      const action: AppAction = { type: 'RESET_UNIFIED_AUDIT' };

      const newState = appReducer(stateWithAudit, action);

      expect(newState.unifiedAudit.result).toBeNull();
      expect(newState.unifiedAudit.isRunning).toBe(false);
      expect(newState.unifiedAudit.progress).toBeNull();
      expect(newState.unifiedAudit.fixHistory).toEqual([]);
      expect(newState.unifiedAudit.lastAuditId).toBeNull();
    });
  });

  describe('State Immutability', () => {
    it('does not mutate original state for SET_USER', () => {
      const originalState = { ...initialState };
      const action: AppAction = { type: 'SET_USER', payload: { id: 'user-123' } as User };

      appReducer(originalState, action);

      expect(originalState).toEqual(initialState);
    });

    it('does not mutate original state for ADD_PROJECT', () => {
      const originalState = { ...initialState };
      const project = { id: 'proj-1', name: 'Test' } as any;
      const action: AppAction = { type: 'ADD_PROJECT', payload: project };

      appReducer(originalState, action);

      expect(originalState.projects).toEqual([]);
    });

    it('does not mutate original state for nested objects', () => {
      const originalState = {
        ...initialState,
        websiteStructure: { ...initialState.websiteStructure }
      };
      const action: AppAction = { type: 'SET_WEBSITE_STRUCTURE_GENERATING', payload: true };

      appReducer(originalState, action);

      expect(originalState.websiteStructure.isGenerating).toBe(false);
    });
  });

  describe('Default case', () => {
    it('returns unchanged state for unknown action', () => {
      const unknownAction = { type: 'UNKNOWN_ACTION' } as any;

      const newState = appReducer(state, unknownAction);

      expect(newState).toBe(state);
    });
  });
});
