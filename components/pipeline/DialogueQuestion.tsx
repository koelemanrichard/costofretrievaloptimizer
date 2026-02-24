import React, { useState } from 'react';
import type { DialogueQuestion as DialogueQuestionType } from '../../types/dialogue';

// ──── Types ────

interface DialogueQuestionProps {
  question: DialogueQuestionType;
  onSubmit: (answer: string) => void;
  onSkip: () => void;
  isProcessing: boolean;
}

// ──── Sub-components ────

/** Choice question type: radio buttons with optional custom input. */
function ChoiceInput({
  question,
  value,
  onChange,
}: {
  question: DialogueQuestionType;
  value: string;
  onChange: (val: string) => void;
}) {
  const [selectedRadio, setSelectedRadio] = useState<string>('');
  const [customText, setCustomText] = useState('');

  const handleRadioChange = (label: string) => {
    setSelectedRadio(label);
    setCustomText('');
    onChange(label);
  };

  const handleCustomChange = (text: string) => {
    setCustomText(text);
    if (text.trim()) {
      setSelectedRadio('');
      onChange(text);
    } else if (selectedRadio) {
      onChange(selectedRadio);
    } else {
      onChange('');
    }
  };

  return (
    <div className="space-y-2">
      {question.choices?.map((choice) => (
        <label
          key={choice.label}
          className="flex items-start gap-3 p-2.5 rounded-lg cursor-pointer transition-colors hover:bg-gray-700/40 group"
        >
          <input
            type="radio"
            name={`choice-${question.questionId}`}
            checked={selectedRadio === choice.label && !customText.trim()}
            onChange={() => handleRadioChange(choice.label)}
            className="mt-0.5 w-4 h-4 text-blue-600 bg-gray-700 border-gray-600 focus:ring-blue-500 focus:ring-2"
          />
          <div className="flex-1 min-w-0">
            <span className="text-sm text-gray-200 group-hover:text-gray-100">
              {choice.label}
            </span>
            {choice.description && (
              <p className="text-xs text-gray-500 mt-0.5">{choice.description}</p>
            )}
          </div>
        </label>
      ))}
      <div className="pt-2">
        <input
          type="text"
          value={customText}
          onChange={(e) => handleCustomChange(e.target.value)}
          placeholder="Or type your own answer..."
          className="w-full bg-gray-900 border border-gray-600 rounded-lg px-3 py-2 text-sm text-gray-200 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
      </div>
    </div>
  );
}

/** Text question type: single text input. */
function TextInput({
  value,
  onChange,
}: {
  value: string;
  onChange: (val: string) => void;
}) {
  return (
    <input
      type="text"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder="Type your answer..."
      className="w-full bg-gray-900 border border-gray-600 rounded-lg px-3 py-2 text-sm text-gray-200 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
    />
  );
}

/** Confirm question type: Yes/No buttons with optional alternatives on "No". */
function ConfirmInput({
  question,
  value,
  onChange,
}: {
  question: DialogueQuestionType;
  value: string;
  onChange: (val: string) => void;
}) {
  const [confirmed, setConfirmed] = useState<boolean | null>(null);
  const [customText, setCustomText] = useState('');

  const handleYes = () => {
    setConfirmed(true);
    setCustomText('');
    onChange('Yes, correct');
  };

  const handleNo = () => {
    setConfirmed(false);
    onChange('');
  };

  const handleAlternativeClick = (label: string) => {
    setCustomText('');
    onChange(label);
  };

  const handleCustomChange = (text: string) => {
    setCustomText(text);
    onChange(text);
  };

  return (
    <div className="space-y-3">
      <div className="flex gap-3">
        <button
          type="button"
          onClick={handleYes}
          className={`flex-1 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors ${
            confirmed === true
              ? 'bg-emerald-600 text-white ring-2 ring-emerald-400'
              : 'bg-emerald-900/30 border border-emerald-700/50 text-emerald-300 hover:bg-emerald-900/50'
          }`}
        >
          Yes, correct
        </button>
        <button
          type="button"
          onClick={handleNo}
          className={`flex-1 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors ${
            confirmed === false
              ? 'bg-red-600 text-white ring-2 ring-red-400'
              : 'bg-red-900/30 border border-red-700/50 text-red-300 hover:bg-red-900/50'
          }`}
        >
          No, change this
        </button>
      </div>

      {confirmed === false && (
        <div className="space-y-2 pt-1">
          {question.choices && question.choices.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {question.choices.map((choice) => (
                <button
                  key={choice.label}
                  type="button"
                  onClick={() => handleAlternativeClick(choice.label)}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                    value === choice.label && !customText.trim()
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                  }`}
                >
                  {choice.label}
                </button>
              ))}
            </div>
          )}
          <input
            type="text"
            value={customText}
            onChange={(e) => handleCustomChange(e.target.value)}
            placeholder="Or type the correct value..."
            className="w-full bg-gray-900 border border-gray-600 rounded-lg px-3 py-2 text-sm text-gray-200 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
      )}
    </div>
  );
}

/** Multi-text question type: multiple text inputs with add/remove. */
function MultiTextInput({
  value,
  onChange,
}: {
  value: string;
  onChange: (val: string) => void;
}) {
  const [fields, setFields] = useState<string[]>(['']);

  const updateField = (index: number, text: string) => {
    const next = [...fields];
    next[index] = text;
    setFields(next);
    onChange(next.filter((f) => f.trim()).join(' | '));
  };

  const addField = () => {
    setFields((prev) => [...prev, '']);
  };

  const removeField = (index: number) => {
    const next = fields.filter((_, i) => i !== index);
    if (next.length === 0) {
      setFields(['']);
      onChange('');
    } else {
      setFields(next);
      onChange(next.filter((f) => f.trim()).join(' | '));
    }
  };

  return (
    <div className="space-y-2">
      {fields.map((field, index) => (
        <div key={index} className="flex items-center gap-2">
          <input
            type="text"
            value={field}
            onChange={(e) => updateField(index, e.target.value)}
            placeholder="Type your answer..."
            className="flex-1 bg-gray-900 border border-gray-600 rounded-lg px-3 py-2 text-sm text-gray-200 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
          {fields.length > 1 && (
            <button
              type="button"
              onClick={() => removeField(index)}
              className="p-1.5 text-gray-500 hover:text-red-400 transition-colors"
              aria-label="Remove entry"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>
      ))}
      <button
        type="button"
        onClick={addField}
        className="flex items-center gap-1.5 text-sm text-blue-400 hover:text-blue-300 transition-colors"
      >
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
        </svg>
        Add another
      </button>
    </div>
  );
}

// ──── Main Component ────

const DialogueQuestion: React.FC<DialogueQuestionProps> = ({
  question,
  onSubmit,
  onSkip,
  isProcessing,
}) => {
  const [answer, setAnswer] = useState('');

  const handleSubmit = () => {
    const trimmed = answer.trim();
    if (trimmed) {
      onSubmit(trimmed);
    }
  };

  const canSubmit = answer.trim().length > 0 && !isProcessing;

  return (
    <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-5">
      {/* Question text */}
      <p className="text-gray-100 text-base font-medium mb-1">
        {question.question}
      </p>

      {/* Context subtitle */}
      {question.context && (
        <p className="text-gray-400 text-sm italic mb-4">
          {question.context}
        </p>
      )}

      {/* Input area per question type */}
      <div className="mb-4">
        {question.questionType === 'choice' && (
          <ChoiceInput question={question} value={answer} onChange={setAnswer} />
        )}
        {question.questionType === 'text' && (
          <TextInput value={answer} onChange={setAnswer} />
        )}
        {question.questionType === 'confirm' && (
          <ConfirmInput question={question} value={answer} onChange={setAnswer} />
        )}
        {question.questionType === 'multi_text' && (
          <MultiTextInput value={answer} onChange={setAnswer} />
        )}
      </div>

      {/* Actions row */}
      <div className="flex items-center gap-4">
        <button
          type="button"
          onClick={handleSubmit}
          disabled={!canSubmit}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {isProcessing ? (
            <span className="flex items-center gap-2">
              <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              Processing...
            </span>
          ) : (
            'Submit Answer'
          )}
        </button>
        <button
          type="button"
          onClick={onSkip}
          disabled={isProcessing}
          className="text-gray-400 hover:text-gray-300 text-sm underline disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          Skip
        </button>
      </div>
    </div>
  );
};

export default DialogueQuestion;
