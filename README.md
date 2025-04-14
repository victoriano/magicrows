# MagicRows - Data Processing & AI Automation Tool

An Electron application for processing data and leveraging AI APIs for automation tasks.

## Overview

This application helps users:
1. Load and process CSV data 
2. Interact with AI providers like OpenAI and Perplexity
3. Apply AI transformations to your data
4. Export processed results

## Tech Stack

- **Electron**: Cross-platform desktop application framework
- **React**: UI library
- **TypeScript**: Type-safe JavaScript
- **Redux**: State management
- **Tailwind CSS**: Utility-first CSS framework
- **DaisyUI**: UI components for Tailwind CSS
- **Vite**: Fast bundler and development server
- **Electron Forge/Builder**: Build and packaging tools

## Project Structure

The project follows a modern Electron application structure with a clear separation between main and renderer processes:

```
src/
├── main/           # Electron main process
├── renderer/       # React application (renderer process)
└── shared/         # Shared code between main and renderer
```

See the [TypeScript Conversion Guide](./typescript_conversion_guide.md) for a detailed breakdown of the project structure and implementation details.

## Features

- **CSV Data Loading**: Load and parse CSV files with complex header structures
- **Data Filtering**: Apply flexible filtering to data using expressions
- **NACE/ISCO Processing**: Work with industry and occupation code combinations
- **AI Integration**: Use OpenAI and/or Perplexity APIs to generate task suggestions
- **Rate Limiting**: Configurable delays between API calls to avoid rate limits
- **Result Export**: Export generated tasks to CSV

## Development

### Prerequisites

- Node.js (v14 or newer)
- npm or yarn
- Git

### Getting Started

1. Clone the repository:
   ```bash
   git clone https://github.com/yourusername/nace-isco-electron.git
   cd nace-isco-electron
   ```

2. Install dependencies:
   ```bash
   npm install
   # or
   yarn
   ```

3. Start the development server:
   ```bash
   npm run dev
   # or
   yarn dev
   ```

### Building for Production

```bash
npm run build
# or
yarn build
```

### Creating Distributable Packages

#### Testing Before Building (Recommended)

Before creating a DMG or other distributable package, it's highly recommended to test the production build process:

1. Use the included testing script:
   ```bash
   # Make the script executable (if needed)
   chmod +x scripts/test-packaging.js
   
   # Run the test
   node scripts/test-packaging.js
   ```

2. This script will:
   - Build the application with production settings
   - Verify the build outputs
   - Test the path resolution logic
   - Simulate how files are located in a packaged app
   - Provide detailed logs of any issues found

3. Watch the console output for any errors or warnings:
   - Green checkmarks indicate successful steps
   - Yellow warnings may need investigation
   - Red errors must be fixed before packaging

4. If the script fails or displays errors:
   - Review the specific error messages
   - Check the build output directories
   - Make sure paths in the config match actual file locations
   - Fix any issues before proceeding to create the DMG

This testing process can save significant time by identifying packaging issues early, avoiding the need to rebuild DMGs repeatedly.

#### macOS DMG Installer

To create a DMG installer for macOS:

1. Install the DMG maker package (if not already installed):
   ```bash
   npm install --save-dev @electron-forge/maker-dmg
   ```

2. Build the DMG:
   ```bash
   # Create a DMG for macOS
   npm run make -- --platform=darwin
   ```

3. The DMG file will be available in the `out/make` directory:
   ```bash
   # Path to your DMG file
   out/make/Rowvana.dmg
   ```

4. To install the application:
   - Double-click the DMG file to mount it
   - Drag the application to your Applications folder
   - Eject the DMG

> **Note for development builds**: Since the app is not signed with an Apple Developer ID, you may need to bypass macOS security when first opening the app:
> 1. Right-click on the app in your Applications folder
> 2. Select "Open" from the context menu
> 3. Confirm you want to open it

### Customizing Application Icons

The application uses custom icons for both the application itself and the DMG installer. Here's how to update them:

1. **Prepare your icon image**:
   - Create a PNG image for your icon (ideally 1024x1024 pixels for best quality)
   - Save it to `src/assets/rowvana_logo.png` (or change the path in the script below)

2. **Generate proper icon formats**:
   - The application requires different icon formats for different platforms
   - Run the icon generation script:
     ```bash
     node scripts/create-icons.js
     ```
   - This creates:
     - `build/icon.icns` (for macOS)
     - `build/icon.ico` (for Windows)
     - `build/icon.png` (copy of original)

3. **How it works**:
   - The script (`scripts/create-icons.js`) converts your PNG to platform-specific formats
   - Electron Forge uses these files based on the target platform
   - The `forge.config.js` file references these icons:
     ```javascript
     packagerConfig: {
       icon: './build/icon', // No extension - Electron chooses correct format
     },
     // ...
     makers: [
       // ...
       {
         name: '@electron-forge/maker-dmg',
         config: {
           icon: './build/icon.icns', // Explicit icon for DMG
           // ...
         }
       }
     ]
     ```

4. **To modify the icon generation script**:
   - Edit `scripts/create-icons.js` to change input/output paths or conversion settings
   - Install dependencies: `npm install --save-dev png2icons` (if not already installed)

#### Windows Installer

To create a Windows installer:

```bash
# Create a Windows installer (on Windows)
npm run make -- --platform=win32
```

#### Linux Package

To create a Linux package:

```bash
# Create a Debian package (on Linux)
npm run make -- --platform=linux --targets=@electron-forge/maker-deb
```

## Troubleshooting

### Packaging and Distribution Issues

If you encounter issues when packaging the application or after installation:

1. **File Not Found Errors**
   - Check the main process logs for path resolution errors
   - Make sure all build directories are being properly created
   - Verify that `vite.renderer.config.ts`, `vite.main.config.ts`, and `vite.preload.config.ts` have correct `outDir` settings
   - Update `package.json` main field if build paths have changed

2. **Blank Screen After Launch**
   - This often indicates the main window can't find `index.html`
   - Run the test script to diagnose: `node scripts/test-packaging.js`
   - Check the console output for file path errors
   - Make sure the Electron main process can locate the renderer files

3. **Missing Icons or Assets**
   - Run `scripts/create-icons.js` to regenerate application icons
   - Ensure assets are properly referenced with correct relative paths
   - Use Vite's `?url` import syntax for images and other assets: `import logoImg from '../assets/logo.png?url'`

4. **Electron-Squirrel-Startup Errors**
   - This Windows-specific module is wrapped in a try-catch in the main process
   - If errors persist, manually edit `src/main/main.ts` to remove or comment out the squirrel startup code

### Development Environment Issues

1. **Vite Build Failures**
   - Make sure all Vite configuration files have correct paths and settings
   - Check for conflicting `outDir` or `emptyOutDir` settings between configs
   - Verify that all required dependencies are installed

2. **Hot Reload Not Working**
   - Check Vite server settings in the main process
   - Verify that the HMR connection is being established
   - Check port configuration (default is 5173)

For more detailed diagnostics, run the app with additional logging:
```bash
# For main process logs
ELECTRON_ENABLE_LOGGING=1 npm start

# For packaging diagnostics
node scripts/test-packaging.js
```

## API Keys

This application requires API keys for OpenAI and/or Perplexity:

1. Obtain API keys from:
   - [OpenAI](https://platform.openai.com/)
   - [Perplexity](https://www.perplexity.ai/)

2. Add them to the application through the settings interface

## License

MIT 