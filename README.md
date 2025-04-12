# NACE/ISCO Task Generator - Electron App

An Electron application for generating AI-automatable tasks for combinations of NACE (industry) and ISCO (occupation) codes.

## Overview

This application is a TypeScript port of a Python script that:
1. Loads CSV data containing NACE/ISCO combinations
2. Filters data based on various criteria
3. Uses OpenAI and/or Perplexity APIs to generate tasks that could be automated with AI
4. Outputs the results to a CSV file

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

## API Keys

This application requires API keys for OpenAI and/or Perplexity:

1. Obtain API keys from:
   - [OpenAI](https://platform.openai.com/)
   - [Perplexity](https://www.perplexity.ai/)

2. Add them to the application through the settings interface

## License

MIT 