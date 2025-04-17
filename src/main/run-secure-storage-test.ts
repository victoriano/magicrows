/**
 * Entry point for running secure storage tests with Vite
 * 
 * Usage:
 * npm run vite-node src/main/run-secure-storage-test.ts
 * 
 * This runner integrates with the Electron environment to test the secure storage system.
 */

import { app } from 'electron';
import { runTests } from './test-secure-storage';

console.log('Starting secure storage test runner...');

// This script must be run in an electron environment
if (!app) {
  console.error('ERROR: This script must be run in an Electron environment.');
  console.error('Use: npm run vite-node src/main/run-secure-storage-test.ts');
  process.exit(1);
}

// Run tests when Electron is ready
if (app.isReady()) {
  runTests();
} else {
  app.whenReady().then(runTests);
}
