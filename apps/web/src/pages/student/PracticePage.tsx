import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { questionBankApi } from '@/services/api/question-bank.api';
import type { Question, PracticePathNode } from '@/types/question-bank';

export const PracticePage: React.FC = () => {
  const { topicId } = useParams<{ topicId: string }>();
  const [practiceNode, setPracticeNode] = useState<PracticePathNode | null>(null);
  const [currentQuestion, setCurrentQuestion] = useState<Question | null>(null);
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [showExplanation, setShowExplanation] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (topicId) {
      loadPracticePath();
    }
  }, [topicId]);

  const loadPracticePath = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const node = await questionBankApi.getPracticePath(topicId!);
      setPracticeNode(node);
      setCurrentQuestion(node.question);
    } catch (err) {
      console.error('Failed to load practice path:', err);
      setError('Failed to load practice questions');
    } finally {
      setIsLoading(false);
    }
  };

  const handleAnswerSelect = (optionUid: string) => {
    setSelectedAnswer(optionUid);
  };

  const handleSubmitAnswer = () => {
    setShowExplanation(true);
  };

  const handleNextQuestion = async () => {
    if (practiceNode && practiceNode.nextQuestions.length > 0) {
      // Load next question
      const nextQ = practiceNode.nextQuestions[0];
      const node = await questionBankApi.getPracticePath(nextQ.topic.uid);
      setPracticeNode(node);
      setCurrentQuestion(node.question);
      setSelectedAnswer(null);
      setShowExplanation(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-sky-500"></div>
          <p className="text-slate-400 mt-4">Loading practice session...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="text-center">
          <div className="text-6xl mb-4">⚠️</div>
          <p className="text-red-400 text-lg">{error}</p>
        </div>
      </div>
    );
  }

  if (!currentQuestion) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="text-center">
          <div className="text-6xl mb-4">🎉</div>
          <p className="text-slate-300 text-lg mb-2">No more questions!</p>
          <p className="text-slate-500">You've completed this practice path</p>
        </div>
      </div>
    );
  }

  const isCorrect = selectedAnswer
    ? currentQuestion.options?.find((o) => o.uid === selectedAnswer)?.isCorrect
    : false;

  return (
    <div className="min-h-screen bg-slate-900 p-6">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center gap-2 mb-2 text-sm text-slate-400">
            <span>Practice</span>
            <span>›</span>
            <span className="text-sky-400">{currentQuestion.topic.name}</span>
          </div>
          <h1 className="text-2xl font-bold text-slate-100">
            {currentQuestion.questionText}
          </h1>
        </div>

        {/* Question Card */}
        <div className="bg-slate-800 border border-slate-700 rounded-lg p-6 mb-6">
          {/* Metadata */}
          <div className="flex items-center gap-3 mb-6">
            <span className="px-3 py-1 bg-yellow-100 text-yellow-800 rounded text-sm font-medium">
              {currentQuestion.difficulty.replace('_', ' ').toUpperCase()}
            </span>
            <span className="text-slate-400 text-sm">
              {currentQuestion.points} points
            </span>
            <div className="flex gap-2 ml-auto">
              {currentQuestion.skills.map((skill) => (
                <span
                  key={skill.uid}
                  className="px-2 py-1 bg-slate-700 text-teal-400 rounded text-xs"
                >
                  {skill.name}
                </span>
              ))}
            </div>
          </div>

          {/* Image */}
          {currentQuestion.imageUrl && (
            <img
              src={currentQuestion.imageUrl}
              alt="Question"
              className="w-full h-64 object-cover rounded mb-6"
            />
          )}

          {/* Options */}
          {currentQuestion.options && (
            <div className="space-y-3">
              {currentQuestion.options.map((option) => {
                const isSelected = selectedAnswer === option.uid;
                const showCorrect = showExplanation && option.isCorrect;
                const showWrong = showExplanation && isSelected && !option.isCorrect;

                return (
                  <button
                    key={option.uid}
                    onClick={() => !showExplanation && handleAnswerSelect(option.uid)}
                    disabled={showExplanation}
                    className={`w-full px-4 py-3 rounded-lg text-left transition-all ${
                      showCorrect
                        ? 'bg-green-900/50 border-2 border-green-500 text-green-100'
                        : showWrong
                        ? 'bg-red-900/50 border-2 border-red-500 text-red-100'
                        : isSelected
                        ? 'bg-sky-900/50 border-2 border-sky-500 text-sky-100'
                        : 'bg-slate-700 border-2 border-slate-600 text-slate-300 hover:border-slate-500'
                    } ${showExplanation ? 'cursor-not-allowed' : 'cursor-pointer'}`}
                  >
                    <div className="flex items-center justify-between">
                      <span>{option.optionText}</span>
                      {showCorrect && <span className="text-green-400">✓ Correct</span>}
                      {showWrong && <span className="text-red-400">✗ Wrong</span>}
                    </div>
                  </button>
                );
              })}
            </div>
          )}

          {/* Submit Button */}
          {!showExplanation && (
            <button
              onClick={handleSubmitAnswer}
              disabled={!selectedAnswer}
              className="mt-6 w-full px-6 py-3 bg-sky-600 hover:bg-sky-500 disabled:bg-slate-700 disabled:text-slate-500 text-white rounded-lg font-medium transition-colors"
            >
              Submit Answer
            </button>
          )}

          {/* Explanation */}
          {showExplanation && currentQuestion.explanation && (
            <div
              className={`mt-6 p-4 rounded-lg ${
                isCorrect
                  ? 'bg-green-900/30 border border-green-700'
                  : 'bg-red-900/30 border border-red-700'
              }`}
            >
              <h3
                className={`font-bold mb-2 ${
                  isCorrect ? 'text-green-300' : 'text-red-300'
                }`}
              >
                {isCorrect ? '✓ Correct!' : '✗ Incorrect'}
              </h3>
              <p className="text-slate-300">{currentQuestion.explanation}</p>
            </div>
          )}

          {/* Next Button */}
          {showExplanation && (
            <button
              onClick={handleNextQuestion}
              className="mt-6 w-full px-6 py-3 bg-sky-600 hover:bg-sky-500 text-white rounded-lg font-medium transition-colors"
            >
              Next Question →
            </button>
          )}
        </div>

        {/* Knowledge Graph Preview */}
        {practiceNode && (
          <div className="bg-slate-800 border border-slate-700 rounded-lg p-6">
            <h3 className="text-lg font-bold text-slate-100 mb-4">Learning Path</h3>
            
            {/* Prerequisites */}
            {practiceNode.prerequisites.length > 0 && (
              <div className="mb-4">
                <p className="text-sm text-slate-400 mb-2">Prerequisites:</p>
                <div className="flex flex-wrap gap-2">
                  {practiceNode.prerequisites.map((q) => (
                    <div
                      key={q.uid}
                      className="px-3 py-1 bg-slate-700 text-slate-300 rounded text-sm"
                    >
                      ✓ {q.questionText.substring(0, 50)}...
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Current */}
            <div className="mb-4 px-3 py-2 bg-sky-900/50 border border-sky-700 rounded text-sky-200">
              → Current: {currentQuestion.questionText.substring(0, 60)}...
            </div>

            {/* Next Questions */}
            {practiceNode.nextQuestions.length > 0 && (
              <div>
                <p className="text-sm text-slate-400 mb-2">Coming next:</p>
                <div className="flex flex-wrap gap-2">
                  {practiceNode.nextQuestions.map((q) => (
                    <div
                      key={q.uid}
                      className="px-3 py-1 bg-slate-700 text-slate-300 rounded text-sm"
                    >
                      {q.questionText.substring(0, 50)}...
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
