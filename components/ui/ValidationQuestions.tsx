
import React from 'react';
import { InfoTooltip } from './InfoTooltip';

interface ValidationQuestionsProps {
  title: string;
  questions: { question: string; guidance?: string }[];
}

export const ValidationQuestions: React.FC<ValidationQuestionsProps> = ({ title, questions }) => {
  return (
    <div className="p-4 border border-gray-700 rounded-lg bg-gray-900/30 mt-6">
      <h4 className="text-md font-semibold text-gray-200 mb-3">{title}</h4>
      <ul className="space-y-3 text-sm text-gray-300">
        {questions.map((q, i) => (
          <li key={i} className="flex items-start">
            <svg className="w-4 h-4 mr-2 mt-0.5 text-blue-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
            <span>
              {q.question}
              {q.guidance && <InfoTooltip text={q.guidance} />}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
};
