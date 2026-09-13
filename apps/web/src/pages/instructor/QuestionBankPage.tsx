import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { QuestionSearch, QuestionCard, QuestionForm } from '@/components/question-bank';
import { questionBankApi } from '@/services/api/question-bank.api';
import type {
  Question,
  SearchParams,
  SearchResult,
  CreateQuestionDto,
  Topic,
  Skill,
} from '@/types/question-bank';

export const QuestionBankPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchResult, setSearchResult] = useState<SearchResult | null>(null);
  const [topics, setTopics] = useState<Topic[]>([]);
  const [skills, setSkills] = useState<Skill[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [selectedQuestion, setSelectedQuestion] = useState<Question | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Load topics on mount
  useEffect(() => {
    loadTopics();
  }, []);

  const loadTopics = async () => {
    try {
      const data = await questionBankApi.listTopics();
      setTopics(data);
      // Extract unique skills from all topics
      const allSkills: Skill[] = [];
      data.forEach((topic) => {
        // Note: Skills would come from questions in real implementation
        // For now, we'll use a placeholder
      });
      setSkills(allSkills);
    } catch (err) {
      console.error('Failed to load topics:', err);
      setError('Failed to load topics');
    }
  };

  const handleSearch = async (params: SearchParams) => {
    setIsLoading(true);
    setError(null);
    try {
      const result = await questionBankApi.searchQuestions(params);
      setSearchResult(result);
    } catch (err) {
      console.error('Search failed:', err);
      setError('Search failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateQuestion = async (data: CreateQuestionDto) => {
    setIsLoading(true);
    setError(null);
    try {
      await questionBankApi.createQuestion(data);
      setShowCreateForm(false);
      // Refresh search results
      handleSearch({ limit: 20 });
    } catch (err) {
      console.error('Failed to create question:', err);
      setError('Failed to create question. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteQuestion = async (uid: string) => {
    if (!confirm('Are you sure you want to delete this question?')) return;

    setIsLoading(true);
    setError(null);
    try {
      await questionBankApi.deleteQuestion(uid);
      // Refresh search results
      if (searchResult) {
        setSearchResult({
          ...searchResult,
          questions: searchResult.questions.filter((q) => q.uid !== uid),
          total: searchResult.total - 1,
        });
      }
    } catch (err) {
      console.error('Failed to delete question:', err);
      setError('Failed to delete question. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-2">
            <h1 className="text-3xl font-bold text-slate-100">Question Bank</h1>
            <button
              onClick={() => setShowCreateForm(!showCreateForm)}
              className="px-6 py-3 bg-sky-600 hover:bg-sky-500 text-white rounded-lg font-medium transition-colors"
            >
              {showCreateForm ? 'Cancel' : '+ Create Question'}
            </button>
          </div>
          <p className="text-slate-400">
            Manage your question bank with advanced search and filtering
          </p>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="mb-6 p-4 bg-red-900/50 border border-red-700 rounded-lg text-red-200">
            ⚠️ {error}
          </div>
        )}

        {/* Create Form */}
        {showCreateForm && (
          <div className="mb-6 bg-slate-800 border border-slate-700 rounded-lg p-6">
            <h2 className="text-xl font-bold text-slate-100 mb-4">Create New Question</h2>
            <QuestionForm
              topics={topics}
              skills={skills}
              onSubmit={handleCreateQuestion}
              onCancel={() => setShowCreateForm(false)}
              isSubmitting={isLoading}
            />
          </div>
        )}

        {/* Search */}
        {!showCreateForm && (
          <>
            <QuestionSearch onSearch={handleSearch} isLoading={isLoading} />

            {/* Results */}
            {searchResult && (
              <div className="mt-6">
                <div className="mb-4 flex items-center justify-between">
                  <p className="text-slate-300">
                    Found <span className="font-bold text-sky-400">{searchResult.total}</span>{' '}
                    questions
                  </p>
                  {searchResult.hasMore && (
                    <p className="text-slate-400 text-sm">Showing first 20 results</p>
                  )}
                </div>

                {searchResult.questions.length === 0 ? (
                  <div className="text-center py-12 bg-slate-800 border border-slate-700 rounded-lg">
                    <p className="text-slate-400 text-lg mb-2">No questions found</p>
                    <p className="text-slate-500 text-sm">
                      Try adjusting your search filters
                    </p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 gap-4">
                    {searchResult.questions.map((question) => (
                      <QuestionCard
                        key={question.uid}
                        question={question}
                        onClick={() => setSelectedQuestion(question)}
                        showActions
                        onEdit={() => {
                          // Navigate to edit page or open modal
                          console.log('Edit:', question.uid);
                        }}
                        onDelete={() => handleDeleteQuestion(question.uid)}
                      />
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Empty State (no search yet) */}
            {!searchResult && !isLoading && (
              <div className="mt-12 text-center py-12 bg-slate-800 border border-slate-700 rounded-lg">
                <div className="text-6xl mb-4">🔍</div>
                <p className="text-slate-300 text-lg mb-2">Ready to search</p>
                <p className="text-slate-500 text-sm">
                  Use the search bar above to find questions
                </p>
              </div>
            )}

            {/* Loading State */}
            {isLoading && (
              <div className="mt-12 text-center py-12">
                <div className="inline-block animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-sky-500"></div>
                <p className="text-slate-400 mt-4">Loading questions...</p>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};
