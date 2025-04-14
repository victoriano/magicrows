import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import ProcessingStatusIndicator from '../ProcessingStatusIndicator';
import { useAIEnrichment } from '../../../hooks/useAIEnrichment';

// Mock the useAIEnrichment hook
vi.mock('../../../hooks/useAIEnrichment', () => ({
  useAIEnrichment: vi.fn()
}));

describe('ProcessingStatusIndicator', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    
    // Default mock implementation - idle state with no error
    (useAIEnrichment as any).mockReturnValue({
      status: 'idle',
      error: null,
      selectedPreset: null,
      processingMetrics: null
    });
  });

  it('should not render anything in idle state with no error', () => {
    const { container } = render(<ProcessingStatusIndicator />);
    
    // Component should return null in idle state with no error
    expect(container.firstChild).toBe(null);
  });

  it('should show processing state with metrics', () => {
    const mockPreset = {
      config: {
        integrationName: 'openai'
      }
    };
    
    (useAIEnrichment as any).mockReturnValue({
      status: 'processing',
      error: null,
      selectedPreset: mockPreset,
      processingMetrics: {
        processed: 5,
        total: 10,
        timeElapsed: 2.3
      }
    });
    
    render(<ProcessingStatusIndicator />);
    
    // Check for processing indicator
    const processingIndicator = screen.getByText('Processing with openai');
    expect(processingIndicator).toBeDefined();
    
    // Check for metrics
    const metricsText = screen.getByText('5 of 10 items processed');
    expect(metricsText).toBeDefined();
  });

  it('should show success state with metrics', () => {
    (useAIEnrichment as any).mockReturnValue({
      status: 'success',
      error: null,
      selectedPreset: null,
      processingMetrics: {
        processed: 10,
        total: 10,
        timeElapsed: 3.5
      }
    });
    
    render(<ProcessingStatusIndicator />);
    
    // Check for success indicator
    const successIndicator = screen.getByText('Processing complete');
    expect(successIndicator).toBeDefined();
    
    // Check for metrics
    const metricsText = screen.getByText('Enriched 10 items in 3.5 seconds');
    expect(metricsText).toBeDefined();
  });

  it('should show error state with error message', () => {
    const errorMessage = 'Failed to connect to API: Rate limit exceeded';
    
    (useAIEnrichment as any).mockReturnValue({
      status: 'error',
      error: errorMessage,
      selectedPreset: null,
      processingMetrics: null
    });
    
    render(<ProcessingStatusIndicator />);
    
    // Check for error indicator
    const errorIndicator = screen.getByText('Error during processing');
    expect(errorIndicator).toBeDefined();
    
    // Check for error message
    const errorText = screen.getByText(errorMessage);
    expect(errorText).toBeDefined();
  });

  it('should have the correct border color for processing state', () => {
    (useAIEnrichment as any).mockReturnValue({
      status: 'processing',
      error: null,
      selectedPreset: { config: { integrationName: 'openai' } },
      processingMetrics: { processed: 3, total: 10 }
    });
    
    const { container } = render(<ProcessingStatusIndicator />);
    
    // Check for blue border for processing state
    const statusIndicator = container.firstChild as HTMLElement;
    expect(statusIndicator.className).toContain('border-blue-200');
  });

  it('should have the correct border color for success state', () => {
    (useAIEnrichment as any).mockReturnValue({
      status: 'success',
      error: null,
      selectedPreset: null,
      processingMetrics: { processed: 10, total: 10, timeElapsed: 2 }
    });
    
    const { container } = render(<ProcessingStatusIndicator />);
    
    // Check for green border for success state
    const statusIndicator = container.firstChild as HTMLElement;
    expect(statusIndicator.className).toContain('border-green-200');
  });

  it('should have the correct border color for error state', () => {
    (useAIEnrichment as any).mockReturnValue({
      status: 'error',
      error: 'API Error',
      selectedPreset: null,
      processingMetrics: null
    });
    
    const { container } = render(<ProcessingStatusIndicator />);
    
    // Check for red border for error state
    const statusIndicator = container.firstChild as HTMLElement;
    expect(statusIndicator.className).toContain('border-red-200');
  });
});
