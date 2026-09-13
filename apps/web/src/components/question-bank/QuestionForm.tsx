import React, { useState } from 'react';
import type {
  CreateQuestionDto,
  QuestionType,
  Difficulty,
  Topic,
  Skill,
} from '@/types/question-bank';

interface QuestionFormProps {
  topics: Topic[];
  skills: Skill[];
  onSubmit: (data: CreateQuestionDto) => void;
  onCancel: () => void;
  initialData?: Partial<CreateQuestionDto>;
  isSubmitting?: boolean;
}

const questionTypes: { value: QuestionType; label: string }[] = [
  { value: 'multiple_choice', label: 'Multiple Choice' },
  { value: 'multiple_select', label: 'Multiple Select' },
  { value: 'true_false', label: 'True/False' },
  { value: 'short_answer', label: 'Short Answer' },
  { value: 'essay', label: 'Essay' },
  { value: 'coding', label: 'Coding' },
];

const difficulties: { value: Difficulty; label: string }[] = [
  { value: 'very_easy', label: 'Very Easy' },
  { value: 'easy', label: 'Easy' },
  { value: 'medium', label: 'Medium' },
  { value: 'hard', label: 'Hard' },
  { value: 'very_hard', label: 'Very Hard' },
];

export const QuestionForm: React.FC<QuestionFormProps> = ({
  topics,
  skills,
  onSubmit,
  onCancel,
  initialData,
  isSubmitting = false,
}) => {
  const [questionText, setQuestionText] = useState(initialData?.questionText || '');
  const [questionType, setQuestionType] = useState<QuestionType>(
    initialData?.questionType || 'multiple_choice'
  );
  const [difficulty, setDifficulty] = useState<Difficulty>(
    initialData?.difficulty || 'medium'
  );
  const [points, setPoints] = useState(initialData?.points || 5);
  const [topicId, setTopicId] = useState(initialData?.topicId || '');
  const [selectedSkills, setSelectedSkills] = useState<string[]>(
    initialData?.skillIds || []
  );
  const [explanation, setExplanation] = useState(initialData?.explanation || '');
  const [answerText, setAnswerText] = useState(initialData?.answerText || '');
  const [options, setOptions] = useState(
    initialData?.options || [
      { optionText: '', isCorrect: false, position: 0 },
      { optionText: '', isCorrect: false, position: 1 },
    ]
  );

  const handleAddOption = () => {
    setOptions([
      ...options,
      { optionText: '', isCorrect: false, position: options.length },
    ]);
  };

  const handleRemoveOption = (index: number) => {
    setOptions(options.filter((_, i) => i !== index));
  };

  const handleOptionChange = (
    index: number,
    field: 'optionText' | 'isCorrect',
    value: string | boolean
  ) => {
    const newOptions = [...options];
    newOptions[index] = { ...newOptions[index], [field]: value };
    setOptions(newOptions);
  };

  const handleToggleSkill = (skillId: string) => {
    if (selectedSkills.includes(skillId)) {
      setSelectedSkills(selectedSkills.filter((id) => id !== skillId));
    } else {
      setSelectedSkills([...selectedSkills, skillId]);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const data: CreateQuestionDto = {
      questionText,
      questionType,
      difficulty,
      points,
      topicId,
      skillIds: selectedSkills,
      explanation: explanation || undefined,
      answerText: answerText || undefined,
      options:
        questionType === 'multiple_choice' || questionType === 'multiple_select'
          ? options
          : undefined,
    };

    onSubmit(data);
  };

  const needsOptions =
    questionType === 'multiple_choice' || questionType === 'multiple_select';
  const needsAnswerText = questionType === 'short_answer' || questionType === 'essay';

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Question Text */}
      <div>
        <label className="block text-sm font-medium text-slate-300 mb-2">
          Question Text <span className="text-red-400">*</span>
        </label>
        <textarea
          value={questionText}
          onChange={(e) => setQuestionText(e.target.value)}
          required
          rows={4}
          className="w-full px-4 py-3 bg-slate-900 border border-slate-700 rounded-lg text-slate-100 placeholder-slate-400 focus:outline-none focus:border-sky-500"
          placeholder="Enter your question..."
        />
      </div>

      {/* Question Type & Difficulty */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <label className="block text-sm font-medium text-slate-300 mb-2">
            Type <span className="text-red-400">*</span>
          </label>
          <select
            value={questionType}
            onChange={(e) => setQuestionType(e.target.value as QuestionType)}
            required
            className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-slate-100 focus:outline-none focus:border-sky-500"
          >
            {questionTypes.map((type) => (
              <option key={type.value} value={type.value}>
                {type.label}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-300 mb-2">
            Difficulty <span className="text-red-400">*</span>
          </label>
          <select
            value={difficulty}
            onChange={(e) => setDifficulty(e.target.value as Difficulty)}
            required
            className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-slate-100 focus:outline-none focus:border-sky-500"
          >
            {difficulties.map((diff) => (
              <option key={diff.value} value={diff.value}>
                {diff.label}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-300 mb-2">
            Points <span className="text-red-400">*</span>
          </label>
          <input
            type="number"
            value={points}
            onChange={(e) => setPoints(Number(e.target.value))}
            required
            min={1}
            max={100}
            className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-slate-100 focus:outline-none focus:border-sky-500"
          />
        </div>
      </div>

      {/* Topic */}
      <div>
        <label className="block text-sm font-medium text-slate-300 mb-2">
          Topic <span className="text-red-400">*</span>
        </label>
        <select
          value={topicId}
          onChange={(e) => setTopicId(e.target.value)}
          required
          className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-slate-100 focus:outline-none focus:border-sky-500"
        >
          <option value="">Select a topic</option>
          {topics.map((topic) => (
            <option key={topic.uid} value={topic.uid}>
              {'  '.repeat(topic.level)} {topic.name}
            </option>
          ))}
        </select>
      </div>

      {/* Skills */}
      <div>
        <label className="block text-sm font-medium text-slate-300 mb-2">Skills</label>
        <div className="flex flex-wrap gap-2">
          {skills.map((skill) => (
            <button
              key={skill.uid}
              type="button"
              onClick={() => handleToggleSkill(skill.uid)}
              className={`px-3 py-1 rounded-lg text-sm transition-colors ${
                selectedSkills.includes(skill.uid)
                  ? 'bg-sky-600 text-white'
                  : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
              }`}
            >
              {skill.name}
            </button>
          ))}
        </div>
      </div>

      {/* Options (for MCQ/Multiple Select) */}
      {needsOptions && (
        <div>
          <label className="block text-sm font-medium text-slate-300 mb-2">
            Options <span className="text-red-400">*</span>
          </label>
          <div className="space-y-3">
            {options.map((option, index) => (
              <div key={index} className="flex gap-3 items-start">
                <input
                  type="checkbox"
                  checked={option.isCorrect}
                  onChange={(e) =>
                    handleOptionChange(index, 'isCorrect', e.target.checked)
                  }
                  className="mt-3"
                />
                <input
                  type="text"
                  value={option.optionText}
                  onChange={(e) =>
                    handleOptionChange(index, 'optionText', e.target.value)
                  }
                  placeholder={`Option ${index + 1}`}
                  required
                  className="flex-1 px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-slate-100 placeholder-slate-400 focus:outline-none focus:border-sky-500"
                />
                {options.length > 2 && (
                  <button
                    type="button"
                    onClick={() => handleRemoveOption(index)}
                    className="px-3 py-2 bg-red-600 hover:bg-red-500 text-white rounded-lg transition-colors"
                  >
                    ✕
                  </button>
                )}
              </div>
            ))}
          </div>
          <button
            type="button"
            onClick={handleAddOption}
            className="mt-3 px-4 py-2 bg-slate-700 hover:bg-slate-600 text-slate-300 rounded-lg text-sm transition-colors"
          >
            + Add Option
          </button>
        </div>
      )}

      {/* Answer Text (for short answer/essay) */}
      {needsAnswerText && (
        <div>
          <label className="block text-sm font-medium text-slate-300 mb-2">
            Sample Answer
          </label>
          <textarea
            value={answerText}
            onChange={(e) => setAnswerText(e.target.value)}
            rows={3}
            className="w-full px-4 py-3 bg-slate-900 border border-slate-700 rounded-lg text-slate-100 placeholder-slate-400 focus:outline-none focus:border-sky-500"
            placeholder="Enter a sample answer for reference..."
          />
        </div>
      )}

      {/* Explanation */}
      <div>
        <label className="block text-sm font-medium text-slate-300 mb-2">
          Explanation
        </label>
        <textarea
          value={explanation}
          onChange={(e) => setExplanation(e.target.value)}
          rows={3}
          className="w-full px-4 py-3 bg-slate-900 border border-slate-700 rounded-lg text-slate-100 placeholder-slate-400 focus:outline-none focus:border-sky-500"
          placeholder="Explain the correct answer..."
        />
      </div>

      {/* Actions */}
      <div className="flex gap-3 justify-end pt-4 border-t border-slate-700">
        <button
          type="button"
          onClick={onCancel}
          disabled={isSubmitting}
          className="px-6 py-2 bg-slate-700 hover:bg-slate-600 disabled:bg-slate-800 text-slate-300 rounded-lg transition-colors"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={isSubmitting}
          className="px-6 py-2 bg-sky-600 hover:bg-sky-500 disabled:bg-slate-700 disabled:text-slate-500 text-white rounded-lg font-medium transition-colors"
        >
          {isSubmitting ? 'Saving...' : initialData ? 'Update' : 'Create'}
        </button>
      </div>
    </form>
  );
};
