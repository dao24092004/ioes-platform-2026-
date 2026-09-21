import React, { useState } from 'react';
import type { SearchParams, Difficulty, QuestionType } from '@/types/question-bank';

interface QuestionSearchProps {
  onSearch: (params: SearchParams) => void;
  isLoading?: boolean;
}

const difficulties: Difficulty[] = ['very_easy', 'easy', 'medium', 'hard', 'very_hard'];
const questionTypes: QuestionType[] = [
  'multiple_choice',
  'multiple_select',
  'true_false',
  'short_answer',
  'essay',
  'coding',
];

export const QuestionSearch: React.FC<QuestionSearchProps> = ({ onSearch, isLoading }) => {
  const [query, setQuery] = useState('');
  const [difficulty, setDifficulty] = useState<Difficulty | ''>('');
  const [questionType, setQuestionType] = useState<QuestionType | ''>('');
  const [showAdvanced, setShowAdvanced] = useState(false);

  const handleSearch = () => {
    const params: SearchParams = {
      query: query || undefined,
      difficulty: difficulty || undefined,
      questionType: questionType || undefined,
      limit: 20,
    };
    onSearch(params);
  };

  const handleReset = () => {
    setQuery('');
    setDifficulty('');
    setQuestionType('');
    onSearch({ limit: 20 });
  };

  return (
    <div className="bg-slate-800 border border-slate-700 rounded-lg p-6">
      {/* Search Bar */}
      <div className="flex gap-3 mb-4">
        <div className="flex-1 relative">
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            placeholder="Search questions by text, topic, or skill..."
            className="w-full px-4 py-3 bg-slate-900 border border-slate-700 rounded-lg text-slate-100 placeholder-slate-400 focus:outline-none focus:border-sky-500"
            disabled={isLoading}
          />
          <span className="absolute right-4 top-3.5 text-slate-400">🔍</span>
        </div>
        <button
          onClick={handleSearch}
          disabled={isLoading}
          className="px-6 py-3 bg-sky-600 hover:bg-sky-500 disabled:bg-slate-700 disabled:text-slate-500 text-white rounded-lg font-medium transition-colors"
        >
          {isLoading ? 'Searching...' : 'Search'}
        </button>
      </div>

      {/* Advanced Filters Toggle */}
      <button
        onClick={() => setShowAdvanced(!showAdvanced)}
        className="text-sm text-sky-400 hover:text-sky-300 mb-4"
      >
        {showAdvanced ? '▼' : '▶'} Advanced Filters
      </button>

      {/* Advanced Filters */}
      {showAdvanced && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 bg-slate-900/50 rounded-lg">
          {/* Difficulty Filter */}
          <div>
            <label
              htmlFor="question-search-difficulty"
              className="block text-sm font-medium text-slate-300 mb-2"
            >
              Difficulty
            </label>
            <select
              id="question-search-difficulty"
              value={difficulty}
              onChange={(e) => setDifficulty(e.target.value as Difficulty | '')}
              className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded text-slate-100 focus:outline-none focus:border-sky-500"
            >
              <option value="">All Difficulties</option>
              {difficulties.map((d) => (
                <option key={d} value={d}>
                  {d.replace('_', ' ').toUpperCase()}
                </option>
              ))}
            </select>
          </div>

          {/* Question Type Filter */}
          <div>
            <label
              htmlFor="question-search-type"
              className="block text-sm font-medium text-slate-300 mb-2"
            >
              Question Type
            </label>
            <select
              id="question-search-type"
              value={questionType}
              onChange={(e) => setQuestionType(e.target.value as QuestionType | '')}
              className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded text-slate-100 focus:outline-none focus:border-sky-500"
            >
              <option value="">All Types</option>
              {questionTypes.map((t) => (
                <option key={t} value={t}>
                  {t.replace('_', ' ').replace(/\b\w/g, (l) => l.toUpperCase())}
                </option>
              ))}
            </select>
          </div>

          {/* Reset Button */}
          <div className="flex items-end">
            <button
              onClick={handleReset}
              className="w-full px-4 py-2 bg-slate-700 hover:bg-slate-600 text-slate-300 rounded transition-colors"
            >
              Reset Filters
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
