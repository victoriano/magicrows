#!/usr/bin/env node
/**
 * Test Packaging Script
 * 
 * This script helps test your Electron app's production configuration
 * without having to create a full DMG installer. It:
 * 
 * 1. Builds the app in production mode
 * 2. Sets an environment variable to simulate production paths
 * 3. Runs the app with detailed path logging
 * 
 * Usage: node scripts/test-packaging.js
 */

const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');

// ANSI color codes for prettier console output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
};

console.log(`${colors.bright}${colors.cyan}=== Rowvana Packaging Test Tool ===${colors.reset}\n`);
console.log(`${colors.yellow}This tool will build and test your app in a production-like environment${colors.reset}\n`);

// Step 1: Build the app
try {
  console.log(`${colors.bright}Step 1: Building application in production mode...${colors.reset}`);
  execSync('npm run build', { stdio: 'inherit' });
  console.log(`${colors.green}✓ Build completed successfully${colors.reset}\n`);
} catch (error) {
  console.error(`${colors.red}✗ Build failed:${colors.reset}`, error);
  process.exit(1);
}

// Step 2: Verify build output
const mainDir = path.join(__dirname, '../.vite/main');
const preloadDir = path.join(__dirname, '../.vite/preload');
const rendererDir = path.join(__dirname, '../.vite/renderer');
const mainFiles = fs.existsSync(mainDir) ? fs.readdirSync(mainDir) : [];
const preloadFiles = fs.existsSync(preloadDir) ? fs.readdirSync(preloadDir) : [];
const rendererFiles = fs.existsSync(rendererDir) ? fs.readdirSync(rendererDir) : [];

console.log(`${colors.bright}Step 2: Checking build output...${colors.reset}`);

// Check main process files
console.log(`${colors.blue}Main process build directory: ${mainDir}${colors.reset}`);
if (!fs.existsSync(mainDir)) {
  console.log(`${colors.yellow}⚠ Main directory not found at expected location: ${mainDir}${colors.reset}`);
  console.log(`${colors.yellow}⚠ Looking for alternative locations...${colors.reset}`);
  
  // Try alternative paths
  const altMainDir = path.join(__dirname, '../.vite/build');
  if (fs.existsSync(altMainDir)) {
    console.log(`${colors.green}✓ Found main process files at: ${altMainDir}${colors.reset}`);
  } else {
    console.log(`${colors.red}✗ Could not find main process build files${colors.reset}`);
  }
} else {
  console.log(`${colors.blue}Files found in main directory:${colors.reset}`);
  mainFiles.forEach(file => {
    console.log(`  - ${file}`);
  });
  
  if (!mainFiles.includes('main.js')) {
    console.log(`${colors.yellow}⚠ main.js not found in main directory${colors.reset}`);
  }
}

// Check preload files
console.log(`\n${colors.blue}Preload build directory: ${preloadDir}${colors.reset}`);
if (!fs.existsSync(preloadDir)) {
  console.log(`${colors.yellow}⚠ Preload directory not found at expected location: ${preloadDir}${colors.reset}`);
} else {
  console.log(`${colors.blue}Files found in preload directory:${colors.reset}`);
  preloadFiles.forEach(file => {
    console.log(`  - ${file}`);
  });
  
  if (!preloadFiles.includes('preload.js')) {
    console.log(`${colors.yellow}⚠ preload.js not found in preload directory${colors.reset}`);
  }
}

// Check renderer files
console.log(`\n${colors.blue}Renderer build directory: ${rendererDir}${colors.reset}`);
if (!fs.existsSync(rendererDir)) {
  console.log(`${colors.yellow}⚠ Renderer directory not found at expected location: ${rendererDir}${colors.reset}`);
  console.log(`${colors.yellow}⚠ Looking for alternative locations...${colors.reset}`);
  
  // Try alternative paths
  const altRendererDir = path.join(__dirname, '../src/renderer/dist');
  if (fs.existsSync(altRendererDir)) {
    console.log(`${colors.green}✓ Found renderer files at: ${altRendererDir}${colors.reset}`);
  } else {
    console.error(`${colors.red}✗ Could not find renderer build files${colors.reset}`);
    process.exit(1);
  }
} else {
  console.log(`${colors.blue}Files found in renderer directory:${colors.reset}`);
  rendererFiles.forEach(file => {
    console.log(`  - ${file}`);
  });
  
  if (!rendererFiles.includes('index.html')) {
    console.error(`${colors.red}✗ index.html not found in renderer directory${colors.reset}`);
    process.exit(1);
  }
}

console.log(`${colors.green}✓ Build output verified${colors.reset}\n`);

// Step 3: Run the app in simulated production mode
console.log(`${colors.bright}Step 3: Starting app in simulated production mode...${colors.reset}`);
console.log(`${colors.yellow}App will start with detailed logging enabled${colors.reset}`);
console.log(`${colors.yellow}Check the console output for any path-related errors${colors.reset}\n`);

try {
  // Set environment variables to simulate production
  const env = {
    ...process.env,
    NODE_ENV: 'production',
    SIMULATE_PRODUCTION: 'true',
    ELECTRON_ENABLE_LOGGING: '1',
    ELECTRON_ENABLE_STACK_DUMPING: '1',
    DEBUG: '*'
  };

  // Run the app with these variables
  execSync('electron .', { 
    stdio: 'inherit',
    env 
  });
} catch (error) {
  console.error(`${colors.red}✗ Test run failed:${colors.reset}`, error);
  process.exit(1);
}

// If we get here, the app started successfully
console.log(`\n${colors.green}${colors.bright}✓ App started successfully in simulated production mode${colors.reset}`);
console.log(`${colors.yellow}If the app UI appeared properly, your packaging configuration should work${colors.reset}`);
console.log(`${colors.yellow}You can now proceed to create a DMG:${colors.reset} npm run make -- --platform=darwin`);
