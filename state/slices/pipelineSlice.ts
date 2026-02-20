// state/slices/pipelineSlice.ts
//
// Pipeline state management for the unified SEO pipeline.
// Tracks step statuses, approvals, mode (greenfield vs existing site), and wave config.

// ──── Types ────

export type PipelineStep =
  | 'crawl'
  | 'gap_analysis'
  | 'strategy'
  | 'eavs'
  | 'map_planning'
  | 'briefs'
  | 'content'
  | 'audit'
  | 'tech_spec'
  | 'export';

export type StepStatus =
  | 'locked'
  | 'available'
  | 'in_progress'
  | 'pending_approval'
  | 'approved'
  | 'completed';

export interface GateDefinition {
  gateId: string;
  reviewer: string;       // Who should review: "Business stakeholder", "SEO strategist", etc.
  reviewItems: string[];  // What they review
  blocksStep: PipelineStep;
  isOptional: boolean;
}

export interface StepApproval {
  status: 'pending' | 'approved' | 'rejected';
  approvedAt?: string;
  rejectedAt?: string;
  rejectionReason?: string;
  approvedBy?: string;
}

export interface PipelineStepState {
  step: PipelineStep;
  label: string;
  subtitle: string;
  status: StepStatus;
  approval?: StepApproval;
  gate?: GateDefinition;
  completedAt?: string;
  startedAt?: string;
  autoSkipped?: boolean;   // e.g., gap_analysis skipped for greenfield
}

export interface WaveConfiguration {
  strategy: 'monetization_first' | 'authority_first' | 'custom';
  waves: WaveState[];
}

export interface WaveState {
  id: string;
  number: 1 | 2 | 3 | 4;
  name: string;
  description: string;
  topicIds: string[];
  status: 'planning' | 'briefing' | 'drafting' | 'auditing' | 'ready' | 'published';
}

export interface PipelineState {
  isActive: boolean;
  steps: PipelineStepState[];
  currentStep: PipelineStep;
  isGreenfield: boolean;
  autoApprove: boolean;      // Solo user mode: skip gates
  waveConfig?: WaveConfiguration;
  siteUrl?: string;          // For existing site mode
  startedAt?: string;
}

// ──── Step Definitions ────

export const PIPELINE_STEP_DEFINITIONS: Array<{
  step: PipelineStep;
  label: string;
  subtitle: string;
  gate?: Omit<GateDefinition, 'gateId'>;
}> = [
  {
    step: 'crawl',
    label: 'Discover',
    subtitle: 'Crawl site or enter business info',
    gate: {
      reviewer: 'Project owner',
      reviewItems: ['Crawl results', 'Business info accuracy'],
      blocksStep: 'gap_analysis',
      isOptional: true,
    },
  },
  {
    step: 'gap_analysis',
    label: 'Gap Analysis',
    subtitle: 'Analyze existing site against framework',
    gate: {
      reviewer: 'Project owner',
      reviewItems: ['Business description accuracy', 'Critical gaps identified'],
      blocksStep: 'strategy',
      isOptional: true,
    },
  },
  {
    step: 'strategy',
    label: 'Strategy',
    subtitle: 'Define CE, SC, CSI, sections',
    gate: {
      reviewer: 'Business stakeholder',
      reviewItems: ['Central Entity', 'Source Context', 'Central Search Intent', 'Cluster allocation'],
      blocksStep: 'eavs',
      isOptional: false,
    },
  },
  {
    step: 'eavs',
    label: 'EAV Inventory',
    subtitle: 'Entity-Attribute-Value triples',
    gate: {
      reviewer: 'Business stakeholder',
      reviewItems: ['EAV factual accuracy', 'Data requests answered'],
      blocksStep: 'map_planning',
      isOptional: false,
    },
  },
  {
    step: 'map_planning',
    label: 'Topical Map',
    subtitle: 'Hub-spoke architecture & waves',
    gate: {
      reviewer: 'SEO strategist',
      reviewItems: ['Page structure', 'URL slugs', 'Publishing waves', 'Link architecture'],
      blocksStep: 'briefs',
      isOptional: false,
    },
  },
  {
    step: 'briefs',
    label: 'Content Briefs',
    subtitle: 'Detailed briefs per page',
    gate: {
      reviewer: 'Content manager',
      reviewItems: ['Heading structure', 'EAV consistency', 'Link targets'],
      blocksStep: 'content',
      isOptional: true,
    },
  },
  {
    step: 'content',
    label: 'Content',
    subtitle: 'Wave-based content writing',
    gate: {
      reviewer: 'Content manager',
      reviewItems: ['Content quality score >85%', 'EAV consistency across wave'],
      blocksStep: 'audit',
      isOptional: false,
    },
  },
  {
    step: 'audit',
    label: 'Audit',
    subtitle: '282-rule validation',
    gate: {
      reviewer: 'SEO strategist',
      reviewItems: ['Compliance scores', 'All CRITICAL items resolved'],
      blocksStep: 'tech_spec',
      isOptional: false,
    },
  },
  {
    step: 'tech_spec',
    label: 'Tech Spec',
    subtitle: 'Developer handoff package',
    gate: {
      reviewer: 'Developer',
      reviewItems: ['Schema templates', 'URL list', 'Performance targets'],
      blocksStep: 'export',
      isOptional: true,
    },
  },
  {
    step: 'export',
    label: 'Export',
    subtitle: 'Master summary & download',
    // No gate — final step
  },
];

const STEP_ORDER: PipelineStep[] = PIPELINE_STEP_DEFINITIONS.map(d => d.step);

// ──── Initial State ────

function buildInitialSteps(): PipelineStepState[] {
  return PIPELINE_STEP_DEFINITIONS.map((def, index) => ({
    step: def.step,
    label: def.label,
    subtitle: def.subtitle,
    status: index === 0 ? 'available' : 'locked',
    gate: def.gate
      ? { ...def.gate, gateId: `G${index}` }
      : undefined,
  }));
}

export const initialPipelineState: PipelineState = {
  isActive: false,
  steps: buildInitialSteps(),
  currentStep: 'crawl',
  isGreenfield: false,
  autoApprove: false,
};

// ──── Action Types ────

export type PipelineAction =
  | { type: 'PIPELINE_ACTIVATE'; payload: { isGreenfield: boolean; siteUrl?: string } }
  | { type: 'PIPELINE_DEACTIVATE' }
  | { type: 'PIPELINE_SET_STEP_STATUS'; payload: { step: PipelineStep; status: StepStatus } }
  | { type: 'PIPELINE_ADVANCE_STEP'; payload: { fromStep: PipelineStep } }
  | { type: 'PIPELINE_APPROVE_GATE'; payload: { step: PipelineStep; approvedBy?: string } }
  | { type: 'PIPELINE_REJECT_GATE'; payload: { step: PipelineStep; reason: string } }
  | { type: 'PIPELINE_CLEAR_APPROVAL'; payload: { step: PipelineStep } }
  | { type: 'PIPELINE_SET_CURRENT_STEP'; payload: PipelineStep }
  | { type: 'PIPELINE_TOGGLE_AUTO_APPROVE'; payload?: boolean }
  | { type: 'PIPELINE_SET_WAVE_CONFIG'; payload: WaveConfiguration }
  | { type: 'PIPELINE_UPDATE_WAVE'; payload: { waveId: string; updates: Partial<WaveState> } }
  | { type: 'PIPELINE_SKIP_STEP'; payload: { step: PipelineStep; reason: string } }
  | { type: 'PIPELINE_RESTORE_STATE'; payload: PipelineState }
  | { type: 'PIPELINE_RESET' };

// ──── Guard ────

const PIPELINE_ACTION_TYPES = new Set([
  'PIPELINE_ACTIVATE',
  'PIPELINE_DEACTIVATE',
  'PIPELINE_SET_STEP_STATUS',
  'PIPELINE_ADVANCE_STEP',
  'PIPELINE_APPROVE_GATE',
  'PIPELINE_REJECT_GATE',
  'PIPELINE_CLEAR_APPROVAL',
  'PIPELINE_SET_CURRENT_STEP',
  'PIPELINE_TOGGLE_AUTO_APPROVE',
  'PIPELINE_SET_WAVE_CONFIG',
  'PIPELINE_UPDATE_WAVE',
  'PIPELINE_SKIP_STEP',
  'PIPELINE_RESTORE_STATE',
  'PIPELINE_RESET',
]);

export function isPipelineAction(type: string): boolean {
  return PIPELINE_ACTION_TYPES.has(type);
}

// ──── Helpers ────

function getNextStep(currentStep: PipelineStep): PipelineStep | null {
  const idx = STEP_ORDER.indexOf(currentStep);
  return idx >= 0 && idx < STEP_ORDER.length - 1 ? STEP_ORDER[idx + 1] : null;
}

function updateStep(
  steps: PipelineStepState[],
  targetStep: PipelineStep,
  updates: Partial<PipelineStepState>
): PipelineStepState[] {
  return steps.map(s => s.step === targetStep ? { ...s, ...updates } : s);
}

// ──── Reducer ────

export function pipelineReducer(
  state: PipelineState,
  action: PipelineAction
): PipelineState | null {
  switch (action.type) {
    case 'PIPELINE_ACTIVATE': {
      const steps = buildInitialSteps();
      // For greenfield, auto-skip gap_analysis
      const updatedSteps = action.payload.isGreenfield
        ? steps.map(s =>
            s.step === 'gap_analysis'
              ? { ...s, status: 'completed' as StepStatus, autoSkipped: true, completedAt: new Date().toISOString() }
              : s
          )
        : steps;

      return {
        ...state,
        isActive: true,
        steps: updatedSteps,
        currentStep: 'crawl',
        isGreenfield: action.payload.isGreenfield,
        siteUrl: action.payload.siteUrl,
        startedAt: new Date().toISOString(),
      };
    }

    case 'PIPELINE_DEACTIVATE':
      return { ...state, isActive: false };

    case 'PIPELINE_SET_STEP_STATUS': {
      const { step, status } = action.payload;

      // When auto-approve is ON and a step is set to pending_approval, auto-complete it
      if (status === 'pending_approval' && state.autoApprove) {
        const nextStep = getNextStep(step);
        let newSteps = updateStep(state.steps, step, {
          status: 'completed',
          completedAt: new Date().toISOString(),
          approval: { status: 'approved', approvedAt: new Date().toISOString(), approvedBy: 'auto' },
        });
        if (nextStep) {
          const nextStepState = newSteps.find(s => s.step === nextStep);
          if (nextStepState?.autoSkipped) {
            const stepAfter = getNextStep(nextStep);
            if (stepAfter) {
              newSteps = updateStep(newSteps, stepAfter, { status: 'available' });
              return { ...state, steps: newSteps, currentStep: stepAfter };
            }
          }
          newSteps = updateStep(newSteps, nextStep, { status: 'available' });
          return { ...state, steps: newSteps, currentStep: nextStep };
        }
        return { ...state, steps: newSteps };
      }

      const updates: Partial<PipelineStepState> = { status };
      if (status === 'in_progress' && !state.steps.find(s => s.step === step)?.startedAt) {
        updates.startedAt = new Date().toISOString();
      }
      if (status === 'completed') {
        updates.completedAt = new Date().toISOString();
      }
      return { ...state, steps: updateStep(state.steps, step, updates) };
    }

    case 'PIPELINE_ADVANCE_STEP': {
      const { fromStep } = action.payload;
      const stepState = state.steps.find(s => s.step === fromStep);
      if (!stepState) return state;

      // If gate exists and not auto-approve, set to pending_approval
      if (stepState.gate && !state.autoApprove && stepState.status !== 'approved') {
        return {
          ...state,
          steps: updateStep(state.steps, fromStep, {
            status: 'pending_approval',
            approval: { status: 'pending' },
          }),
        };
      }

      // Mark current as completed, unlock next
      const nextStep = getNextStep(fromStep);
      let newSteps = updateStep(state.steps, fromStep, {
        status: 'completed',
        completedAt: new Date().toISOString(),
        approval: stepState.gate ? { status: 'approved', approvedAt: new Date().toISOString() } : undefined,
      });

      if (nextStep) {
        const nextStepState = newSteps.find(s => s.step === nextStep);
        // Skip auto-skipped steps
        if (nextStepState?.autoSkipped) {
          const stepAfter = getNextStep(nextStep);
          if (stepAfter) {
            newSteps = updateStep(newSteps, stepAfter, { status: 'available' });
            return { ...state, steps: newSteps, currentStep: stepAfter };
          }
        }
        newSteps = updateStep(newSteps, nextStep, { status: 'available' });
        return { ...state, steps: newSteps, currentStep: nextStep };
      }

      return { ...state, steps: newSteps };
    }

    case 'PIPELINE_APPROVE_GATE': {
      const { step, approvedBy } = action.payload;
      const nextStep = getNextStep(step);
      let newSteps = updateStep(state.steps, step, {
        status: 'completed',
        completedAt: new Date().toISOString(),
        approval: { status: 'approved', approvedAt: new Date().toISOString(), approvedBy },
      });

      if (nextStep) {
        const nextStepState = newSteps.find(s => s.step === nextStep);
        if (nextStepState?.autoSkipped) {
          const stepAfter = getNextStep(nextStep);
          if (stepAfter) {
            newSteps = updateStep(newSteps, stepAfter, { status: 'available' });
            return { ...state, steps: newSteps, currentStep: stepAfter };
          }
        }
        newSteps = updateStep(newSteps, nextStep, { status: 'available' });
        return { ...state, steps: newSteps, currentStep: nextStep };
      }

      return { ...state, steps: newSteps };
    }

    case 'PIPELINE_REJECT_GATE': {
      const { step, reason } = action.payload;
      return {
        ...state,
        steps: updateStep(state.steps, step, {
          status: 'in_progress',
          approval: { status: 'rejected', rejectedAt: new Date().toISOString(), rejectionReason: reason },
        }),
      };
    }

    case 'PIPELINE_CLEAR_APPROVAL': {
      const { step } = action.payload;
      return {
        ...state,
        steps: updateStep(state.steps, step, {
          status: 'in_progress',
          approval: undefined,
        }),
      };
    }

    case 'PIPELINE_SET_CURRENT_STEP':
      return { ...state, currentStep: action.payload };

    case 'PIPELINE_TOGGLE_AUTO_APPROVE': {
      const newAutoApprove = action.payload !== undefined ? action.payload : !state.autoApprove;
      let newState: PipelineState = { ...state, autoApprove: newAutoApprove };

      // When toggled ON, auto-advance any step currently in pending_approval
      if (newAutoApprove) {
        const pendingStep = state.steps.find(s => s.status === 'pending_approval');
        if (pendingStep) {
          const nextStep = getNextStep(pendingStep.step);
          let newSteps = updateStep(state.steps, pendingStep.step, {
            status: 'completed',
            completedAt: new Date().toISOString(),
            approval: { status: 'approved', approvedAt: new Date().toISOString(), approvedBy: 'auto' },
          });
          if (nextStep) {
            const nextStepState = newSteps.find(s => s.step === nextStep);
            if (nextStepState?.autoSkipped) {
              const stepAfter = getNextStep(nextStep);
              if (stepAfter) {
                newSteps = updateStep(newSteps, stepAfter, { status: 'available' });
                newState = { ...newState, steps: newSteps, currentStep: stepAfter };
                return newState;
              }
            }
            newSteps = updateStep(newSteps, nextStep, { status: 'available' });
            newState = { ...newState, steps: newSteps, currentStep: nextStep };
          } else {
            newState = { ...newState, steps: newSteps };
          }
        }
      }
      return newState;
    }

    case 'PIPELINE_SET_WAVE_CONFIG':
      return { ...state, waveConfig: action.payload };

    case 'PIPELINE_UPDATE_WAVE': {
      if (!state.waveConfig) return state;
      return {
        ...state,
        waveConfig: {
          ...state.waveConfig,
          waves: state.waveConfig.waves.map(w =>
            w.id === action.payload.waveId ? { ...w, ...action.payload.updates } : w
          ),
        },
      };
    }

    case 'PIPELINE_SKIP_STEP': {
      const { step } = action.payload;
      const nextStep = getNextStep(step);
      let newSteps = updateStep(state.steps, step, {
        status: 'completed',
        autoSkipped: true,
        completedAt: new Date().toISOString(),
      });

      if (nextStep) {
        newSteps = updateStep(newSteps, nextStep, { status: 'available' });
        return { ...state, steps: newSteps, currentStep: nextStep };
      }

      return { ...state, steps: newSteps };
    }

    case 'PIPELINE_RESTORE_STATE':
      return action.payload;

    case 'PIPELINE_RESET':
      return { ...initialPipelineState, steps: buildInitialSteps() };

    default:
      return null;
  }
}

// ──── Action Creators ────

export const pipelineActions = {
  activate: (isGreenfield: boolean, siteUrl?: string): PipelineAction => ({
    type: 'PIPELINE_ACTIVATE',
    payload: { isGreenfield, siteUrl },
  }),
  deactivate: (): PipelineAction => ({
    type: 'PIPELINE_DEACTIVATE',
  }),
  setStepStatus: (step: PipelineStep, status: StepStatus): PipelineAction => ({
    type: 'PIPELINE_SET_STEP_STATUS',
    payload: { step, status },
  }),
  advanceStep: (fromStep: PipelineStep): PipelineAction => ({
    type: 'PIPELINE_ADVANCE_STEP',
    payload: { fromStep },
  }),
  approveGate: (step: PipelineStep, approvedBy?: string): PipelineAction => ({
    type: 'PIPELINE_APPROVE_GATE',
    payload: { step, approvedBy },
  }),
  rejectGate: (step: PipelineStep, reason: string): PipelineAction => ({
    type: 'PIPELINE_REJECT_GATE',
    payload: { step, reason },
  }),
  clearApproval: (step: PipelineStep): PipelineAction => ({
    type: 'PIPELINE_CLEAR_APPROVAL',
    payload: { step },
  }),
  setCurrentStep: (step: PipelineStep): PipelineAction => ({
    type: 'PIPELINE_SET_CURRENT_STEP',
    payload: step,
  }),
  toggleAutoApprove: (value?: boolean): PipelineAction => ({
    type: 'PIPELINE_TOGGLE_AUTO_APPROVE',
    payload: value,
  }),
  setWaveConfig: (config: WaveConfiguration): PipelineAction => ({
    type: 'PIPELINE_SET_WAVE_CONFIG',
    payload: config,
  }),
  updateWave: (waveId: string, updates: Partial<WaveState>): PipelineAction => ({
    type: 'PIPELINE_UPDATE_WAVE',
    payload: { waveId, updates },
  }),
  skipStep: (step: PipelineStep, reason: string): PipelineAction => ({
    type: 'PIPELINE_SKIP_STEP',
    payload: { step, reason },
  }),
  restoreState: (state: PipelineState): PipelineAction => ({
    type: 'PIPELINE_RESTORE_STATE',
    payload: state,
  }),
  reset: (): PipelineAction => ({
    type: 'PIPELINE_RESET',
  }),
};
