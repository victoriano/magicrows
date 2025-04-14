import { describe, it, expect, vi, beforeEach } from 'vitest';
import aiEnrichmentReducer, {
  AIEnrichmentState,
  selectPreset,
  clearSelection,
  setActiveDataset,
  resetEnrichmentState,
  addPreset,
  updatePreset,
  removePreset,
  processDataWithAI
} from '../aiEnrichmentSlice';

// Mock the AIEnrichmentProcessor
vi.mock('../../../services/ai/AIEnrichmentProcessor', () => {
  return {
    AIEnrichmentProcessor: vi.fn().mockImplementation(() => {
      return {
        processDataset: vi.fn().mockResolvedValue({
          newHeaders: ['id', 'name', 'description', 'Sentiment', 'Score'],
          newRows: [
            ['1', 'Product A', 'Great product', 'positive', '9'],
            ['2', 'Product B', 'Average quality', 'neutral', '5'],
            ['3', 'Product C', 'Disappointing', 'negative', '2']
          ],
          processedRowCount: 3,
          errors: []
        })
      };
    })
  };
});

describe('aiEnrichmentSlice', () => {
  let initialState: AIEnrichmentState;

  beforeEach(() => {
    // Reset state before each test
    initialState = {
      presets: [
        {
          id: 'test-preset',
          name: 'Test Preset',
          description: 'A preset for testing',
          config: {
            integrationName: 'openai',
            model: 'gpt-3.5-turbo',
            mode: 'preview',
            outputFormat: 'newColumns',
            outputs: [{
              name: 'Test Output',
              prompt: 'Test prompt {{text}}',
              outputType: 'text'
            }]
          }
        }
      ],
      selectedPresetId: null,
      activeDataset: 'original',
      status: 'idle',
      error: null,
      result: null
    };
  });

  it('should return the initial state', () => {
    expect(aiEnrichmentReducer(undefined, { type: undefined })).toHaveProperty('presets');
    expect(aiEnrichmentReducer(undefined, { type: undefined })).toHaveProperty('status', 'idle');
  });

  it('should handle selectPreset', () => {
    const nextState = aiEnrichmentReducer(initialState, selectPreset('test-preset'));
    expect(nextState.selectedPresetId).toBe('test-preset');
    expect(nextState.status).toBe('idle');
    expect(nextState.error).toBeNull();
  });

  it('should handle clearSelection', () => {
    // First select a preset
    let state = aiEnrichmentReducer(initialState, selectPreset('test-preset'));
    expect(state.selectedPresetId).toBe('test-preset');
    
    // Then clear selection
    state = aiEnrichmentReducer(state, clearSelection());
    expect(state.selectedPresetId).toBeNull();
    expect(state.status).toBe('idle');
  });

  it('should handle setActiveDataset', () => {
    const state = aiEnrichmentReducer(initialState, setActiveDataset('enriched'));
    expect(state.activeDataset).toBe('enriched');
  });

  it('should handle resetEnrichmentState', () => {
    // Set up a state with some data
    let state: AIEnrichmentState = {
      ...initialState,
      selectedPresetId: 'test-preset',
      status: 'success',
      activeDataset: 'enriched',
      result: {
        newHeaders: ['test'],
        newRows: [['value']],
        processedRowCount: 1,
        errors: []
      }
    };
    
    // Reset the state
    state = aiEnrichmentReducer(state, resetEnrichmentState());
    expect(state.status).toBe('idle');
    expect(state.result).toBeNull();
    expect(state.activeDataset).toBe('original');
    // Selected preset should remain
    expect(state.selectedPresetId).toBe('test-preset');
  });

  it('should handle addPreset', () => {
    const newPreset = {
      id: 'new-preset',
      name: 'New Preset',
      description: 'A new preset',
      config: {
        integrationName: 'perplexity',
        model: 'sonar-small-online',
        mode: 'preview',
        outputFormat: 'newColumns',
        outputs: [{
          name: 'New Output',
          prompt: 'New prompt {{text}}',
          outputType: 'text'
        }]
      }
    };
    
    const state = aiEnrichmentReducer(initialState, addPreset(newPreset));
    expect(state.presets).toHaveLength(2);
    expect(state.presets[1].id).toBe('new-preset');
  });

  it('should handle updatePreset', () => {
    const updatedFields = {
      name: 'Updated Preset Name',
      description: 'Updated description'
    };
    
    const state = aiEnrichmentReducer(
      initialState, 
      updatePreset({ id: 'test-preset', preset: updatedFields })
    );
    
    expect(state.presets[0].name).toBe('Updated Preset Name');
    expect(state.presets[0].description).toBe('Updated description');
    // The ID should remain the same
    expect(state.presets[0].id).toBe('test-preset');
  });

  it('should handle removePreset', () => {
    // Add another preset first
    let state = aiEnrichmentReducer(
      initialState, 
      addPreset({
        id: 'preset-to-remove',
        name: 'To Be Removed',
        description: 'This preset will be removed',
        config: {
          integrationName: 'openai',
          model: 'gpt-3.5-turbo',
          mode: 'preview',
          outputFormat: 'newColumns',
          outputs: []
        }
      })
    );
    
    expect(state.presets).toHaveLength(2);
    
    // Remove the preset
    state = aiEnrichmentReducer(state, removePreset('preset-to-remove'));
    expect(state.presets).toHaveLength(1);
    expect(state.presets[0].id).toBe('test-preset');
  });

  it('should handle processDataWithAI.pending', () => {
    const action = { type: processDataWithAI.pending.type };
    const state = aiEnrichmentReducer(initialState, action);
    
    expect(state.status).toBe('processing');
    expect(state.error).toBeNull();
  });

  it('should handle processDataWithAI.fulfilled', () => {
    const payload = {
      newHeaders: ['id', 'name', 'Sentiment'],
      newRows: [
        ['1', 'Product A', 'positive'],
        ['2', 'Product B', 'neutral']
      ],
      processedRowCount: 2,
      errors: []
    };
    
    const action = { 
      type: processDataWithAI.fulfilled.type,
      payload
    };
    
    const state = aiEnrichmentReducer(initialState, action);
    
    expect(state.status).toBe('success');
    expect(state.result).toEqual(payload);
    expect(state.activeDataset).toBe('enriched');
  });

  it('should handle processDataWithAI.rejected', () => {
    const action = { 
      type: processDataWithAI.rejected.type,
      payload: 'Error message'
    };
    
    const state = aiEnrichmentReducer(initialState, action);
    
    expect(state.status).toBe('error');
    expect(state.error).toBe('Error message');
  });
});
