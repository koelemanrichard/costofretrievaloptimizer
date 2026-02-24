/**
 * StepDialogue — Main orchestration component for the Intelligent Dialogue Engine.
 *
 * Manages a state machine that drives the Q&A flow within each pipeline step.
 * Generates AI questions about step output, processes user answers into structured
 * data, handles interpretation confirmation, follow-up questions, and cascade detection.
 *
 * Created: 2026-02-24 - Intelligent Dialogue Engine
 *
 * @module components/pipeline/StepDialogue
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { generateStepQuestions, processAnswer } from '../../services/ai/dialogueEngine';
import { useAppState } from '../../state/appState';
import DialogueQuestionComponent from './DialogueQuestion';
import DialogueAnswerComponent from './DialogueAnswer';
import CascadeWarning from './CascadeWarning';
import type { BusinessInfo } from '../../types';
import type {
  DialogueContext,
  DialogueStep,
  DialogueUIState,
  DialogueQuestion as DialogueQuestionType,
  DialogueAnswer as DialogueAnswerType,
  ExtractedData,
  CascadeImpact,
  AnswerProcessingResult,
} from '../../types/dialogue';

// ──── Types ────

interface StepDialogueProps {
  step: DialogueStep;
  stepOutput: any;
  businessInfo: BusinessInfo;
  dialogueContext: DialogueContext;
  onDataExtracted: (data: ExtractedData) => void;
  onDialogueComplete: () => void;
  onCascadeAction: (action: 'update_all' | 'review' | 'cancel', impact: CascadeImpact) => void;
  onAnswerConfirmed?: (answer: DialogueAnswerType) => void;
}

// ──── Spinner SVG ────

function Spinner({ className }: { className?: string }) {
  return (
    <svg
      className={`animate-spin ${className || 'w-4 h-4 text-blue-400'}`}
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
    >
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
    </svg>
  );
}

// ──── Main Component ────

const StepDialogue: React.FC<StepDialogueProps> = ({
  step,
  stepOutput,
  businessInfo,
  dialogueContext,
  onDataExtracted,
  onDialogueComplete,
  onCascadeAction,
  onAnswerConfirmed,
}) => {
  const { dispatch } = useAppState();

  // State machine
  const [uiState, setUIState] = useState<DialogueUIState>('loading');
  const [questions, setQuestions] = useState<DialogueQuestionType[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [confirmedAnswers, setConfirmedAnswers] = useState<DialogueAnswerType[]>([]);
  const [introText, setIntroText] = useState('');
  const [allClearMessage, setAllClearMessage] = useState('');
  const [currentResult, setCurrentResult] = useState<AnswerProcessingResult | null>(null);
  const [editableInterpretation, setEditableInterpretation] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const hasInitialized = useRef(false);

  // Track the last submitted answer text for reprocessing during edit
  const lastAnswerRef = useRef('');

  // ──── Advance to next question ────

  const advanceToNext = useCallback(() => {
    const nextIndex = currentIndex + 1;
    if (nextIndex >= questions.length) {
      setUIState('complete');
      onDialogueComplete();
    } else {
      setCurrentIndex(nextIndex);
      setCurrentResult(null);
      setIsEditing(false);
      setUIState('active');
    }
  }, [currentIndex, questions.length, onDialogueComplete]);

  // ──── On mount: generate step questions ────

  useEffect(() => {
    if (hasInitialized.current) return;
    hasInitialized.current = true;

    let cancelled = false;

    async function init() {
      setUIState('loading');
      try {
        const result = await generateStepQuestions(
          step,
          stepOutput,
          businessInfo,
          dialogueContext,
          dispatch,
        );

        if (cancelled) return;

        if (result.allClear) {
          setAllClearMessage(result.allClearMessage || '');
          setUIState('all_clear');
          onDialogueComplete();
        } else {
          setQuestions(result.questions);
          setIntroText(result.introText);
          setUIState('active');
        }
      } catch (err) {
        console.warn('[StepDialogue] Failed to generate questions:', err);
        if (!cancelled) {
          setAllClearMessage('Review complete');
          setUIState('all_clear');
          onDialogueComplete();
        }
      }
    }

    init();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ──── Handle answer submission ────

  const handleSubmitAnswer = useCallback(
    async (answer: string) => {
      const currentQuestion =
        uiState === 'follow_up' && currentResult?.followUpQuestion
          ? currentResult.followUpQuestion
          : questions[currentIndex];

      if (!currentQuestion) return;

      lastAnswerRef.current = answer;
      setUIState('processing');
      setIsEditing(false);

      try {
        const result = await processAnswer(
          currentQuestion,
          answer,
          step,
          stepOutput,
          businessInfo,
          dispatch,
        );

        setCurrentResult(result);

        if (result.followUpQuestion) {
          setUIState('follow_up');
        } else {
          setEditableInterpretation(result.interpretation);
          setUIState('interpretation');
        }
      } catch (err) {
        console.warn('[StepDialogue] Failed to process answer:', err);
        // Fallback: treat the raw answer as the interpretation
        setCurrentResult({
          interpretation: answer,
          extractedData: { rawInsight: answer },
          confidence: 0.3,
        });
        setEditableInterpretation(answer);
        setUIState('interpretation');
      }
    },
    [uiState, currentResult, questions, currentIndex, step, stepOutput, businessInfo],
  );

  // ──── Handle [Looks good] confirmation ────

  const handleConfirm = useCallback(() => {
    if (!currentResult) return;

    const currentQuestion = questions[currentIndex];
    if (!currentQuestion) return;

    const confirmedAnswer: DialogueAnswerType = {
      questionId: currentQuestion.questionId,
      question: currentQuestion.question,
      questionType: currentQuestion.questionType,
      answer: lastAnswerRef.current,
      extractedData: currentResult.extractedData,
      confirmedByUser: true,
      timestamp: new Date().toISOString(),
    };

    setConfirmedAnswers((prev) => [...prev, confirmedAnswer]);
    onDataExtracted(currentResult.extractedData);
    onAnswerConfirmed?.(confirmedAnswer);
    setIsEditing(false);
    advanceToNext();
  }, [currentResult, questions, currentIndex, onDataExtracted, onAnswerConfirmed, advanceToNext]);

  // ──── Handle [Edit] — resubmit with edited interpretation ────

  const handleEditResubmit = useCallback(async () => {
    if (!editableInterpretation.trim()) return;
    // Reprocess using the edited interpretation as the new answer
    await handleSubmitAnswer(editableInterpretation.trim());
  }, [editableInterpretation, handleSubmitAnswer]);

  // ──── Handle [Skip] ────

  const handleSkip = useCallback(() => {
    setIsEditing(false);
    advanceToNext();
  }, [advanceToNext]);

  // ──── Handle "Skip remaining questions" ────

  const handleSkipAll = useCallback(() => {
    setIsEditing(false);
    setUIState('complete');
    onDialogueComplete();
  }, [onDialogueComplete]);

  // ──── Render ────

  return (
    <div className="bg-gradient-to-r from-blue-900/20 to-purple-900/20 border border-blue-700/30 rounded-xl p-5 space-y-4">
      {/* Header with chat bubble icon */}
      <div className="flex items-center gap-2">
        <svg
          className="w-5 h-5 text-blue-400"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
          />
        </svg>
        <h3 className="text-blue-300 font-medium text-sm">AI Review</h3>
      </div>

      {/* Intro text (when active) */}
      {introText && uiState !== 'all_clear' && uiState !== 'complete' && (
        <p className="text-gray-400 text-sm">{introText}</p>
      )}

      {/* Progress bar (when active and multiple questions) */}
      {questions.length > 1 &&
        ['active', 'processing', 'interpretation', 'follow_up'].includes(uiState) && (
          <div>
            <span className="text-gray-400 text-xs">
              Question {currentIndex + 1} of {questions.length}
            </span>
            <div className="w-full h-1 bg-gray-700 rounded-full mt-1">
              <div
                className="h-1 bg-blue-500 rounded-full transition-all"
                style={{ width: `${((currentIndex + 1) / questions.length) * 100}%` }}
              />
            </div>
          </div>
        )}

      {/* Confirmed answers (collapsed rows) */}
      {confirmedAnswers.length > 0 && (
        <div className="space-y-1">
          {confirmedAnswers.map((a, i) => (
            <DialogueAnswerComponent key={i} answer={a} />
          ))}
        </div>
      )}

      {/* Loading state */}
      {uiState === 'loading' && (
        <div className="flex items-center gap-2 py-4">
          <Spinner />
          <span className="text-gray-400 text-sm">Analyzing output...</span>
        </div>
      )}

      {/* Active question */}
      {uiState === 'active' && questions[currentIndex] && (
        <DialogueQuestionComponent
          question={questions[currentIndex]}
          onSubmit={handleSubmitAnswer}
          onSkip={handleSkip}
          isProcessing={false}
        />
      )}

      {/* Processing answer */}
      {uiState === 'processing' && (
        <div className="flex items-center gap-2 py-4">
          <Spinner />
          <span className="text-gray-400 text-sm">Processing your answer...</span>
        </div>
      )}

      {/* Interpretation view */}
      {uiState === 'interpretation' && currentResult && (
        <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-4 space-y-3">
          {isEditing ? (
            /* Editing mode: textarea + Resubmit button */
            <div className="space-y-3">
              <textarea
                value={editableInterpretation}
                onChange={(e) => setEditableInterpretation(e.target.value)}
                rows={4}
                className="w-full bg-gray-900 border border-gray-600 rounded-lg px-3 py-2 text-sm text-gray-200 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-y"
              />
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={handleEditResubmit}
                  disabled={!editableInterpretation.trim()}
                  className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  Resubmit
                </button>
                <button
                  type="button"
                  onClick={() => setIsEditing(false)}
                  className="text-gray-400 hover:text-gray-300 text-sm underline transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            /* Display mode: interpretation text + action buttons */
            <>
              <p className="text-gray-200 text-sm">{editableInterpretation}</p>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={handleConfirm}
                  className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-sm font-medium transition-colors"
                >
                  Looks good
                </button>
                <button
                  type="button"
                  onClick={() => setIsEditing(true)}
                  className="px-3 py-1.5 bg-gray-700 hover:bg-gray-600 text-gray-300 rounded-lg text-sm border border-gray-600 transition-colors"
                >
                  Edit
                </button>
                <button
                  type="button"
                  onClick={handleSkip}
                  className="text-gray-400 hover:text-gray-300 text-sm underline transition-colors"
                >
                  Skip
                </button>
              </div>
              {/* Confidence indicator */}
              {currentResult.confidence < 0.6 && (
                <p className="text-amber-400 text-xs">
                  Low confidence — please verify this interpretation
                </p>
              )}
            </>
          )}
        </div>
      )}

      {/* Follow-up question */}
      {uiState === 'follow_up' && currentResult?.followUpQuestion && (
        <DialogueQuestionComponent
          question={currentResult.followUpQuestion}
          onSubmit={handleSubmitAnswer}
          onSkip={handleSkip}
          isProcessing={false}
        />
      )}

      {/* All clear banner */}
      {uiState === 'all_clear' && (
        <div className="flex items-center gap-2 py-3 px-4 bg-emerald-900/20 border border-emerald-700/30 rounded-lg">
          <svg
            className="w-5 h-5 text-emerald-400 flex-shrink-0"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2.5}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
          <span className="text-emerald-300 text-sm">
            {allClearMessage || 'Everything looks well-defined — ready for review'}
          </span>
        </div>
      )}

      {/* Complete banner */}
      {uiState === 'complete' && (
        <div className="flex items-center gap-2 py-3 px-4 bg-emerald-900/20 border border-emerald-700/30 rounded-lg">
          <svg
            className="w-5 h-5 text-emerald-400 flex-shrink-0"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2.5}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
          <span className="text-emerald-300 text-sm">All questions answered — ready for review</span>
        </div>
      )}

      {/* Skip remaining link */}
      {['active', 'interpretation', 'follow_up'].includes(uiState) && questions.length > 1 && (
        <div className="text-center pt-2">
          <button
            type="button"
            onClick={handleSkipAll}
            className="text-gray-500 hover:text-gray-400 text-xs underline transition-colors"
          >
            Skip remaining questions
          </button>
        </div>
      )}
    </div>
  );
};

export default StepDialogue;
