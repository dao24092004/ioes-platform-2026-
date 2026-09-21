import React from 'react';
import type { Question, Difficulty, QuestionType } from '@/types/question-bank';

interface QuestionCardProps {
  question: Question;
  onClick?: () => void;
  showActions?: boolean;
  onEdit?: () => void;
  onDelete?: () => void;
}

const difficultyColors: Record<Difficulty, string> = {
  very_easy: 'bg-green-100 text-green-800',
  easy: 'bg-blue-100 text-blue-800',
  medium: 'bg-yellow-100 text-yellow-800',
  hard: 'bg-orange-100 text-orange-800',
  very_hard: 'bg-red-100 text-red-800',
};

const typeLabels: Record<QuestionType, string> = {
  multiple_choice: 'Multiple Choice',
  multiple_select: 'Multiple Select',
  true_false: 'True/False',
  short_answer: 'Short Answer',
  essay: 'Essay',
  coding: 'Coding',
};

export const QuestionCard: React.FC<QuestionCardProps> = ({
  question,
  onClick,
  showActions = false,
  onEdit,
  onDelete,
}) => {
  return (
    <div
      className={`bg-slate-800 border border-slate-700 rounded-lg p-6 hover:border-sky-500 transition-all ${
        onClick ? 'cursor-pointer' : ''
      }`}
      onClick={onClick}
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2">
            <span
              className={`px-2 py-1 rounded text-xs font-medium ${
                difficultyColors[question.difficulty]
              }`}
            >
              {question.difficulty.replace('_', ' ').toUpperCase()}
            </span>
            <span className="px-2 py-1 bg-slate-700 text-slate-300 rounded text-xs font-medium">
              {typeLabels[question.questionType]}
            </span>
            <span className="text-slate-400 text-xs">{question.points} pts</span>
          </div>
          <p className="text-slate-100 font-medium">{question.questionText}</p>
        </div>

        {showActions && (
          <div className="flex gap-2 ml-4">
            <button
              onClick={(e) => {
                e.stopPropagation();
                onEdit?.();
              }}
              className="px-3 py-1 bg-sky-600 hover:bg-sky-500 text-white rounded text-sm transition-colors"
            >
              Edit
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onDelete?.();
              }}
              className="px-3 py-1 bg-red-600 hover:bg-red-500 text-white rounded text-sm transition-colors"
            >
              Delete
            </button>
          </div>
        )}
      </div>

      {/* Image */}
      {question.imageUrl && (
        <img
          src={question.imageUrl}
          alt="Question"
          className="w-full h-48 object-cover rounded mb-4"
        />
      )}

      {/* Topic & Skills */}
      <div className="flex flex-wrap gap-2 mb-4">
        <span className="px-2 py-1 bg-slate-700 text-sky-400 rounded text-xs">
          📚 {question.topic.name}
        </span>
        {question.skills.map((skill) => (
          <span
            key={skill.uid}
            className="px-2 py-1 bg-slate-700 text-teal-400 rounded text-xs"
          >
            ⚡ {skill.name}
          </span>
        ))}
      </div>

      {/* Options preview (for MCQ) */}
      {question.options && question.options.length > 0 && (
        <div className="space-y-2">
          {question.options.slice(0, 2).map((option) => (
            <div
              key={option.uid}
              className="px-3 py-2 bg-slate-700/50 rounded text-sm text-slate-300"
            >
              {option.optionText}
            </div>
          ))}
          {question.options.length > 2 && (
            <p className="text-slate-400 text-xs">
              +{question.options.length - 2} more options
            </p>
          )}
        </div>
      )}

      {/* Footer */}
      <div className="mt-4 pt-4 border-t border-slate-700 flex items-center justify-between text-xs text-slate-400">
        <span>Created: {new Date(question.createdAt).toLocaleDateString()}</span>
        {question.publishedAt && (
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 bg-green-500 rounded-full"></span>
            Published
          </span>
        )}
      </div>
    </div>
  );
};
