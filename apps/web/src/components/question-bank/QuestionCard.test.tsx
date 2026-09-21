import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { QuestionCard } from './QuestionCard';
import type { Question } from '@/types/question-bank';

const mockQuestion: Question = {
  uid: 'q1',
  questionText: 'What is the time complexity of binary search?',
  questionType: 'multiple_choice',
  difficulty: 'medium',
  points: 5,
  topic: {
    uid: 't1',
    name: 'Algorithms',
    level: 0,
  },
  skills: [
    { uid: 's1', name: 'Binary Search' },
    { uid: 's2', name: 'Time Complexity' },
  ],
  options: [
    { uid: 'o1', optionText: 'O(log n)', isCorrect: true, position: 0 },
    { uid: 'o2', optionText: 'O(n)', isCorrect: false, position: 1 },
    { uid: 'o3', optionText: 'O(n^2)', isCorrect: false, position: 2 },
  ],
  createdBy: 'instructor1',
  createdAt: '2026-09-01T10:00:00Z',
  updatedAt: '2026-09-01T10:00:00Z',
  publishedAt: '2026-09-01T12:00:00Z',
};

describe('QuestionCard', () => {
  it('should render question text', () => {
    render(<QuestionCard question={mockQuestion} />);
    expect(screen.getByText(mockQuestion.questionText)).toBeInTheDocument();
  });

  it('should display difficulty badge', () => {
    render(<QuestionCard question={mockQuestion} />);
    expect(screen.getByText('MEDIUM')).toBeInTheDocument();
  });

  it('should display question type', () => {
    render(<QuestionCard question={mockQuestion} />);
    expect(screen.getByText('Multiple Choice')).toBeInTheDocument();
  });

  it('should display points', () => {
    render(<QuestionCard question={mockQuestion} />);
    expect(screen.getByText('5 pts')).toBeInTheDocument();
  });

  it('should display topic and skills', () => {
    render(<QuestionCard question={mockQuestion} />);
    expect(screen.getByText('📚 Algorithms')).toBeInTheDocument();
    expect(screen.getByText('⚡ Binary Search')).toBeInTheDocument();
    expect(screen.getByText('⚡ Time Complexity')).toBeInTheDocument();
  });

  it('should show first 2 options with "more" text', () => {
    render(<QuestionCard question={mockQuestion} />);
    expect(screen.getByText('O(log n)')).toBeInTheDocument();
    expect(screen.getByText('O(n)')).toBeInTheDocument();
    expect(screen.getByText('+1 more options')).toBeInTheDocument();
  });

  it('should call onClick when card is clicked', () => {
    const handleClick = vi.fn();
    render(<QuestionCard question={mockQuestion} onClick={handleClick} />);
    
    fireEvent.click(screen.getByText(mockQuestion.questionText));
    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  it('should show action buttons when showActions is true', () => {
    render(<QuestionCard question={mockQuestion} showActions />);
    expect(screen.getByText('Edit')).toBeInTheDocument();
    expect(screen.getByText('Delete')).toBeInTheDocument();
  });

  it('should call onEdit when edit button clicked', () => {
    const handleEdit = vi.fn();
    render(<QuestionCard question={mockQuestion} showActions onEdit={handleEdit} />);
    
    fireEvent.click(screen.getByText('Edit'));
    expect(handleEdit).toHaveBeenCalledTimes(1);
  });

  it('should call onDelete when delete button clicked', () => {
    const handleDelete = vi.fn();
    render(<QuestionCard question={mockQuestion} showActions onDelete={handleDelete} />);
    
    fireEvent.click(screen.getByText('Delete'));
    expect(handleDelete).toHaveBeenCalledTimes(1);
  });

  it('should show published status', () => {
    render(<QuestionCard question={mockQuestion} />);
    expect(screen.getByText('Published')).toBeInTheDocument();
  });
});
