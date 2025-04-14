import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import AIEnrichmentSelector from '../AIEnrichmentSelector';
import { useAIEnrichment } from '../../../hooks/useAIEnrichment';

// Mock the useAIEnrichment hook
vi.mock('../../../hooks/useAIEnrichment', () => ({
  useAIEnrichment: vi.fn()
}));

describe('AIEnrichmentSelector', () => {
  const mockPreset = {
    id: 'preset-1',
    name: 'Sentiment Analysis',
    description: 'Analyze sentiment of text',
    config: {
      integrationName: 'openai',
      model: 'gpt-3.5-turbo',
      mode: 'preview',
      outputFormat: 'newColumns',
      outputs: [
        {
          name: 'Sentiment',
          prompt: 'Analyze sentiment',
          outputType: 'singleCategory',
          outputCategories: [
            { name: 'positive', description: 'Positive sentiment' },
            { name: 'negative', description: 'Negative sentiment' },
            { name: 'neutral', description: 'Neutral sentiment' }
          ]
        }
      ]
    }
  };

  const mockProcessDataWithAI = vi.fn();
  const mockSelectEnrichmentPreset = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    
    // Default mock implementation
    (useAIEnrichment as any).mockReturnValue({
      presets: [mockPreset],
      selectedPreset: null,
      status: 'idle',
      error: null,
      processDataWithAI: mockProcessDataWithAI,
      selectEnrichmentPreset: mockSelectEnrichmentPreset
    });
  });

  it('should render with presets available', () => {
    render(<AIEnrichmentSelector />);
    
    const titleElement = screen.getByText('AI Enrichment');
    expect(titleElement).toBeDefined();
    
    const dropdownElement = screen.getByText('Select an enrichment preset');
    expect(dropdownElement).toBeDefined();
  });

  it('should show preset dropdown when clicked', () => {
    render(<AIEnrichmentSelector />);
    
    // Open dropdown
    const dropdownButton = screen.getByText('Select an enrichment preset');
    fireEvent.click(dropdownButton);
    
    // Verify dropdown content appears
    const presetTitle = screen.getByText('Sentiment Analysis');
    expect(presetTitle).toBeDefined();
    
    const presetInfo = screen.getByText('openai • gpt-3.5-turbo');
    expect(presetInfo).toBeDefined();
  });

  it('should select a preset when clicked', () => {
    render(<AIEnrichmentSelector />);
    
    // Open dropdown
    const dropdownButton = screen.getByText('Select an enrichment preset');
    fireEvent.click(dropdownButton);
    
    // Select preset
    const preset = screen.getByText('Sentiment Analysis');
    fireEvent.click(preset);
    
    // Verify selection function was called
    expect(mockSelectEnrichmentPreset).toHaveBeenCalledWith('preset-1');
  });

  it('should show preset details when selected', () => {
    // Mock selected preset
    (useAIEnrichment as any).mockReturnValue({
      presets: [mockPreset],
      selectedPreset: mockPreset,
      status: 'idle',
      error: null,
      processDataWithAI: mockProcessDataWithAI,
      selectEnrichmentPreset: mockSelectEnrichmentPreset
    });
    
    render(<AIEnrichmentSelector />);
    
    // Verify preset details are visible
    expect(screen.getByText('Provider:')).toBeDefined();
    expect(screen.getByText('openai')).toBeDefined();
    expect(screen.getByText('Model:')).toBeDefined();
    expect(screen.getByText('gpt-3.5-turbo')).toBeDefined();
    expect(screen.getByText('Output Format:')).toBeDefined();
    expect(screen.getByText('New Columns')).toBeDefined();
    expect(screen.getByText('Sentiment')).toBeDefined();
  });

  it('should process data when Enrich Data button is clicked', () => {
    // Mock selected preset
    (useAIEnrichment as any).mockReturnValue({
      presets: [mockPreset],
      selectedPreset: mockPreset,
      status: 'idle',
      error: null,
      processDataWithAI: mockProcessDataWithAI,
      selectEnrichmentPreset: mockSelectEnrichmentPreset
    });
    
    render(<AIEnrichmentSelector />);
    
    // Click enrich data button
    const enrichButton = screen.getByText('Enrich Data');
    fireEvent.click(enrichButton);
    
    // Verify process function was called
    expect(mockProcessDataWithAI).toHaveBeenCalled();
  });

  it('should show loading state when processing', () => {
    // Mock processing state
    (useAIEnrichment as any).mockReturnValue({
      presets: [mockPreset],
      selectedPreset: mockPreset,
      status: 'processing',
      error: null,
      processDataWithAI: mockProcessDataWithAI,
      selectEnrichmentPreset: mockSelectEnrichmentPreset
    });
    
    render(<AIEnrichmentSelector />);
    
    // Verify loading state
    const processingText = screen.getByText('Processing...');
    expect(processingText).toBeDefined();
    
    // Buttons should be disabled
    const enrichButton = screen.getByText('Processing...');
    expect(enrichButton.hasAttribute('disabled')).toBe(true);
  });

  it('should show error message when there is an error', () => {
    // Mock error state
    (useAIEnrichment as any).mockReturnValue({
      presets: [mockPreset],
      selectedPreset: mockPreset,
      status: 'error',
      error: 'API connection failed',
      processDataWithAI: mockProcessDataWithAI,
      selectEnrichmentPreset: mockSelectEnrichmentPreset
    });
    
    render(<AIEnrichmentSelector />);
    
    // Verify error message
    const errorMessage = screen.getByText('API connection failed');
    expect(errorMessage).toBeDefined();
  });

  it('should show empty state when no presets are available', () => {
    // Mock empty presets
    (useAIEnrichment as any).mockReturnValue({
      presets: [],
      selectedPreset: null,
      status: 'idle',
      error: null,
      processDataWithAI: mockProcessDataWithAI,
      selectEnrichmentPreset: mockSelectEnrichmentPreset
    });
    
    render(<AIEnrichmentSelector />);
    
    // Verify empty state
    const emptyStateText = screen.getByText('No AI enrichment presets available.');
    expect(emptyStateText).toBeDefined();
    
    const createPresetButton = screen.getByText('Create Preset');
    expect(createPresetButton).toBeDefined();
  });
});
