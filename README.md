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

## API Keys

This application requires API keys for OpenAI and/or Perplexity:

1. Obtain API keys from:
   - [OpenAI](https://platform.openai.com/)
   - [Perplexity](https://www.perplexity.ai/)

2. Add them to the application through the settings interface

## License

MIT 