import { EnrichmentPreset } from '../../store/slices/aiEnrichmentSlice';
import { AIEnrichmentBlockConfig } from '../../../shared/schemas/AIEnrichmentBlockSchema';
import { allPresets } from '../../../shared/presets_library';

/**
 * Interface for the PresetLoaderService
 * Responsible for loading AI enrichment presets from the presets_library directory
 */
export interface IPresetLoaderService {
  /**
   * Load all available presets from the presets_library directory
   * @returns Array of EnrichmentPreset objects
   */
  loadAllPresets(): Promise<EnrichmentPreset[]>;
  
  /**
   * Get a specific preset by its ID
   * @param id The preset ID to retrieve
   * @returns The preset if found, undefined otherwise
   */
  getPresetById(id: string): Promise<EnrichmentPreset | undefined>;
  
  /**
   * Refresh the presets cache and reload from the filesystem
   */
  refreshPresets(): Promise<void>;
}

/**
 * Service that loads AI enrichment presets from the presets_library directory
 */
export class PresetLoaderService implements IPresetLoaderService {
  private static instance: PresetLoaderService;
  private presetsCache: EnrichmentPreset[] = [];
  private initialized = false;
  
  /**
   * Private constructor to enforce singleton pattern
   */
  private constructor() {}
  
  /**
   * Get the singleton instance of the PresetLoaderService
   */
  public static getInstance(): PresetLoaderService {
    if (!PresetLoaderService.instance) {
      PresetLoaderService.instance = new PresetLoaderService();
    }
    return PresetLoaderService.instance;
  }
  
  /**
   * Initialize the service by loading all presets
   */
  private async initialize(): Promise<void> {
    if (!this.initialized) {
      await this.refreshPresets();
      this.initialized = true;
    }
  }
  
  /**
   * Validate that a preset object has all required fields
   * @param preset The preset object to validate
   * @returns true if valid, false otherwise
   */
  private isValidPreset(preset: any): preset is EnrichmentPreset {
    return (
      preset &&
      typeof preset.id === 'string' &&
      typeof preset.name === 'string' &&
      typeof preset.description === 'string' &&
      preset.config && 
      typeof preset.config === 'object' &&
      typeof preset.config.integrationName === 'string'
    );
  }
  
  /**
   * Load all available presets from the presets_library directory
   * @returns Array of EnrichmentPreset objects
   */
  public async loadAllPresets(): Promise<EnrichmentPreset[]> {
    await this.initialize();
    return this.presetsCache;
  }
  
  /**
   * Get a specific preset by its ID
   * @param id The preset ID to retrieve
   * @returns The preset if found, undefined otherwise
   */
  public async getPresetById(id: string): Promise<EnrichmentPreset | undefined> {
    await this.initialize();
    return this.presetsCache.find(preset => preset.id === id);
  }
  
  /**
   * Refresh the presets cache and reload from the presets_library
   */
  public async refreshPresets(): Promise<void> {
    try {
      // Use the imported allPresets array instead of file discovery
      const loadedPresets = allPresets;
      
      // Filter out invalid presets
      const validPresets = loadedPresets.filter(preset => this.isValidPreset(preset));
      
      if (validPresets.length < loadedPresets.length) {
        console.warn(`Filtered out ${loadedPresets.length - validPresets.length} invalid presets`);
      }
      
      // Update the cache
      this.presetsCache = validPresets;
    } catch (error) {
      console.error('Error refreshing presets:', error);
      // Keep the existing cache on error
    }
  }
}
