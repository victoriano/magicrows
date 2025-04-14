import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import DatasetSelector from '../DatasetSelector';
import { useAIEnrichment } from '../../../hooks/useAIEnrichment';

// Mock the useAIEnrichment hook
vi.mock('../../../hooks/useAIEnrichment', () => ({
  useAIEnrichment: vi.fn()
}));

describe('DatasetSelector', () => {
  const mockSetActiveDataset = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    
    // Default mock implementation
    (useAIEnrichment as any).mockReturnValue({
      hasEnrichedData: true,
      isShowingEnrichedData: false,
      setActiveDataset: mockSetActiveDataset,
      status: 'idle'
    });
  });

  it('should render correctly with enriched data available', () => {
    render(<DatasetSelector />);
    
    const datasetViewText = screen.getByText('Dataset view:');
    expect(datasetViewText).toBeDefined();
    
    const originalButton = screen.getByText('Original');
    expect(originalButton).toBeDefined();
    
    const enrichedButton = screen.getByText('Enriched');
    expect(enrichedButton).toBeDefined();
  });

  it('should not render when no enriched data is available', () => {
    // Mock no enriched data
    (useAIEnrichment as any).mockReturnValue({
      hasEnrichedData: false,
      isShowingEnrichedData: false,
      setActiveDataset: mockSetActiveDataset,
      status: 'idle'
    });
    
    const { container } = render(<DatasetSelector />);
    
    // Component should return null, so container should be empty
    expect(container.firstChild).toBe(null);
  });

  it('should highlight the Original button when showing original data', () => {
    (useAIEnrichment as any).mockReturnValue({
      hasEnrichedData: true,
      isShowingEnrichedData: false,
      setActiveDataset: mockSetActiveDataset,
      status: 'idle'
    });
    
    render(<DatasetSelector />);
    
    // Original button should have the active class
    const originalButton = screen.getByText('Original');
    const enrichedButton = screen.getByText('Enriched');
    
    expect(originalButton.className).toContain('btn-active');
    expect(enrichedButton.className).not.toContain('btn-active');
  });

  it('should highlight the Enriched button when showing enriched data', () => {
    (useAIEnrichment as any).mockReturnValue({
      hasEnrichedData: true,
      isShowingEnrichedData: true,
      setActiveDataset: mockSetActiveDataset,
      status: 'idle'
    });
    
    render(<DatasetSelector />);
    
    // Enriched button should have the active class
    const originalButton = screen.getByText('Original');
    const enrichedButton = screen.getByText('Enriched');
    
    expect(originalButton.className).not.toContain('btn-active');
    expect(enrichedButton.className).toContain('btn-active');
  });

  it('should call setActiveDataset with "original" when clicking Original button', () => {
    render(<DatasetSelector />);
    
    // Click original button
    const originalButton = screen.getByText('Original');
    fireEvent.click(originalButton);
    
    // Check if the action was called with correct parameter
    expect(mockSetActiveDataset).toHaveBeenCalledWith('original');
  });

  it('should call setActiveDataset with "enriched" when clicking Enriched button', () => {
    render(<DatasetSelector />);
    
    // Click enriched button
    const enrichedButton = screen.getByText('Enriched');
    fireEvent.click(enrichedButton);
    
    // Check if the action was called with correct parameter
    expect(mockSetActiveDataset).toHaveBeenCalledWith('enriched');
  });

  it('should show loading indicator when processing', () => {
    (useAIEnrichment as any).mockReturnValue({
      hasEnrichedData: true,
      isShowingEnrichedData: false,
      setActiveDataset: mockSetActiveDataset,
      status: 'processing'
    });
    
    render(<DatasetSelector />);
    
    // Loading indicator should be visible
    const loadingIndicator = screen.getByText('Processing...');
    expect(loadingIndicator).toBeDefined();
    
    // Buttons should be disabled
    const originalButton = screen.getByText('Original');
    const enrichedButton = screen.getByText('Enriched');
    
    expect(originalButton.hasAttribute('disabled')).toBe(true);
    expect(enrichedButton.hasAttribute('disabled')).toBe(true);
  });
});
