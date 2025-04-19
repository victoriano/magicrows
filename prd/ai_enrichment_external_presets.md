# AI Enrichment External Presets - Product Requirements Document

## Overview
Currently, AI Enrichment presets are hardcoded within the Redux store (aiEnrichmentSlice.ts). This PRD outlines a plan to refactor this approach to load presets dynamically from the `src/shared/schemas_examples` folder, enabling easier updates and additions to presets without modifying the Redux code.

## Goals
- Move preset definitions from Redux store to external files in the schemas_examples directory
- Support dynamic loading of presets at runtime
- Enable easier creation and modification of presets
- Maintain backward compatibility with existing components
- Allow developers to create and modify presets without changing core application code

## Feature Scope

### In Scope
- Creating a service to load presets from the schemas_examples folder
- Modifying the AI Enrichment Redux slice to use externally loaded presets
- Supporting the existing preset structure and functionality
- Implementing a mechanism to refresh presets when files change
- Supporting TypeScript type safety for presets

### Out of Scope (Future Implementations)
- UI for creating or editing presets (this is just about loading from files)
- User-specific presets or customizations
- Runtime creation of presets outside of the schemas_examples folder
- Version control for presets

## Detailed Requirements

### 1. Preset File Structure

#### 1.1 File Organization
- **Location**: All preset files should be stored in the `src/shared/schemas_examples` directory
- **Naming Convention**: Files should follow a consistent pattern, e.g., `*_preset.ts`
- **Format**: Each file should export one or more preset configurations
- **Testing Checkpoint**: File detection and parsing

#### 1.2 Preset Format
- **Structure**: Each preset must match the `EnrichmentPreset` interface
- **Required Properties**: id, name, description, config
- **Testing Checkpoint**: Type validation of loaded presets

### 2. Preset Loading Service

#### 2.1 PresetLoaderService
- **Purpose**: Dynamically load all presets from the schemas_examples directory
- **Methods**:
  - `loadAllPresets(): EnrichmentPreset[]`
  - `getPresetById(id: string): EnrichmentPreset | undefined`
  - `refreshPresets(): void`
- **Singleton Pattern**: Service should be instantiated once
- **Testing Checkpoint**: Service initialization and preset loading

#### 2.2 Error Handling
- **Validation**: Verify each loaded preset against the required interface
- **Missing Files**: Gracefully handle missing or empty directories
- **Invalid Presets**: Skip invalid presets but log errors
- **Testing Checkpoint**: Error handling and logging

### 3. Integration with Redux

#### 3.1 Redux State Modification
- **Initial State**: Replace hardcoded presets with empty array
- **Loading Action**: Add action to load presets into Redux store
- **Initialization**: Load presets during application startup
- **Testing Checkpoint**: State update with loaded presets

#### 3.2 Backward Compatibility
- **Existing Selectors**: Maintain all existing selector functions
- **Component Integration**: Ensure components using presets continue to work
- **Testing Checkpoint**: End-to-end functionality with existing components

### 4. File Operations

#### 4.1 Preset File Detection
- **File Filtering**: Only process TypeScript files with preset exports
- **Import Mechanism**: Use dynamic imports or require for Node environments
- **Testing Checkpoint**: File detection accuracy

#### 4.2 Preset Transformation
- **Mapping**: Convert from file exports to EnrichmentPreset objects
- **Validation**: Ensure all required fields are present
- **Testing Checkpoint**: Transformation logic and output format

### 5. Development Experience

#### 5.1 Developer Workflow
- **Create New Preset**: Simple process for adding a new preset file
- **Update Existing Preset**: Modify file and see changes reflected
- **Documentation**: Clear documentation on preset structure and location
- **Testing Checkpoint**: Developer experience testing

#### 5.2 Type Safety
- **TypeScript Interfaces**: Provide comprehensive type definitions
- **Validation Helpers**: Helper functions to validate preset structure
- **Testing Checkpoint**: TypeScript compilation and type checking

## Implementation Tasks

### Phase 1: Preset Loading Infrastructure
1. Create PresetLoaderService interface and implementation
2. Implement file discovery and loading logic
3. Add preset validation and error handling

### Phase 2: Redux Integration
4. Modify AIEnrichmentSlice to use loaded presets
5. Add initialization logic to load presets at startup
6. Update selectors if needed to maintain compatibility

### Phase 3: Implementation of Example Presets
7. Convert existing Redux presets to standalone files
8. Create additional example presets
9. Document the preset file structure

### Phase 4: Testing and Refinement
10. Write unit tests for the PresetLoaderService
11. Test backward compatibility with existing components
12. Optimize loading performance

## Technical Design Considerations

### Preset Loading Approach
Two potential approaches to consider:

#### Option 1: Runtime Import (Recommended)
- Use dynamic imports to load preset files at runtime
- Pros: Flexible, supports hot reloading
- Cons: More complex, potential runtime errors

#### Option 2: Build-time Bundling
- Generate a single file with all presets during build
- Pros: Simpler, better performance
- Cons: Requires rebuild to update presets

### File Format Considerations
- Use TypeScript for type safety
- Consider backward compatibility with future format changes
- Ensure clear documentation of the expected structure

## Testing Strategy

1. **Unit Tests**
   - PresetLoaderService functionality
   - Validation logic
   - Error handling

2. **Integration Tests**
   - Redux store initialization with loaded presets
   - Selector functionality with loaded presets

3. **End-to-End Tests**
   - Complete flow from preset loading to UI display
   - Error states and edge cases

## Future Enhancements

1. UI for browsing and selecting presets
2. Runtime creation and editing of presets
3. User-specific preset customizations
4. Preset version control and history
5. Preset sharing capabilities
