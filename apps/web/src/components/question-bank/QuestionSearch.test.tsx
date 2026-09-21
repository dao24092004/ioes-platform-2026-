import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { QuestionSearch } from './QuestionSearch';

describe('QuestionSearch', () => {
  it('should render search input', () => {
    render(<QuestionSearch onSearch={vi.fn()} />);
    expect(
      screen.getByPlaceholderText(/search questions by text/i)
    ).toBeInTheDocument();
  });

  it('should call onSearch when search button clicked', () => {
    const handleSearch = vi.fn();
    render(<QuestionSearch onSearch={handleSearch} />);

    const input = screen.getByPlaceholderText(/search questions by text/i);
    fireEvent.change(input, { target: { value: 'algorithm' } });

    const searchButton = screen.getByText('Search');
    fireEvent.click(searchButton);

    expect(handleSearch).toHaveBeenCalledWith({
      query: 'algorithm',
      difficulty: undefined,
      questionType: undefined,
      limit: 20,
    });
  });

  it('should call onSearch when Enter key pressed', () => {
    const handleSearch = vi.fn();
    render(<QuestionSearch onSearch={handleSearch} />);

    const input = screen.getByPlaceholderText(/search questions by text/i);
    fireEvent.change(input, { target: { value: 'binary search' } });
    fireEvent.keyDown(input, { key: 'Enter', code: 'Enter' });

    expect(handleSearch).toHaveBeenCalledWith({
      query: 'binary search',
      difficulty: undefined,
      questionType: undefined,
      limit: 20,
    });
  });

  it('should show advanced filters when toggled', () => {
    render(<QuestionSearch onSearch={vi.fn()} />);

    const advancedButton = screen.getByText(/advanced filters/i);
    fireEvent.click(advancedButton);

    expect(screen.getByLabelText(/difficulty/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/question type/i)).toBeInTheDocument();
  });

  it('should apply filters when searching', () => {
    const handleSearch = vi.fn();
    render(<QuestionSearch onSearch={handleSearch} />);

    // Open advanced filters
    const advancedButton = screen.getByText(/advanced filters/i);
    fireEvent.click(advancedButton);

    // Set filters
    const difficultySelect = screen.getByLabelText(/difficulty/i);
    fireEvent.change(difficultySelect, { target: { value: 'medium' } });

    const typeSelect = screen.getByLabelText(/question type/i);
    fireEvent.change(typeSelect, { target: { value: 'multiple_choice' } });

    // Search
    const searchButton = screen.getByText('Search');
    fireEvent.click(searchButton);

    expect(handleSearch).toHaveBeenCalledWith({
      query: undefined,
      difficulty: 'medium',
      questionType: 'multiple_choice',
      limit: 20,
    });
  });

  it('should reset filters when reset button clicked', () => {
    const handleSearch = vi.fn();
    render(<QuestionSearch onSearch={handleSearch} />);

    // Open advanced filters
    const advancedButton = screen.getByText(/advanced filters/i);
    fireEvent.click(advancedButton);

    // Set filters
    const difficultySelect = screen.getByLabelText(/difficulty/i);
    fireEvent.change(difficultySelect, { target: { value: 'hard' } });

    // Reset
    const resetButton = screen.getByText(/reset filters/i);
    fireEvent.click(resetButton);

    expect(handleSearch).toHaveBeenCalledWith({ limit: 20 });
  });

  it('should disable inputs when loading', () => {
    render(<QuestionSearch onSearch={vi.fn()} isLoading />);

    const input = screen.getByPlaceholderText(/search questions by text/i);
    const searchButton = screen.getByText('Searching...');

    expect(input).toBeDisabled();
    expect(searchButton).toBeDisabled();
  });
});
