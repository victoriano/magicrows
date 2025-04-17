import { app } from 'electron';
import * as path from 'path';
import { initSecureStorage } from './secureStorage';

/**
 * Test script for secure storage functionality
 * 
 * This script tests the secure storage system without requiring UI interaction
 * It will:
 * 1. Initialize the secure storage
 * 2. Test setting an API key
 * 3. Test retrieving the API key
 * 4. Test the has-api-key check
 * 5. Test various key formats and fallbacks
 */

// Wait for the app to be ready before running tests
async function runTests() {
  console.log('------------- SECURE STORAGE TEST SCRIPT -------------');
  console.log('App is ready, starting tests...');
  console.log(`User data path: ${app.getPath('userData')}`);
  
  try {
    // Initialize secure storage
    console.log('\n🔍 TEST 1: Initialize secure storage');
    const initResult = initSecureStorage();
    console.log(`Secure storage initialization: ${initResult ? 'SUCCESS ✅' : 'FAILURE ❌'}`);
    
    if (!initResult) {
      console.error('Cannot continue tests - secure storage initialization failed');
      return;
    }
    
    // Define test providers and keys
    const testProviders = [
      { id: 'openai', key: 'sk-test-openai-key-12345' },
      { id: 'myOpenai', key: 'sk-test-myopenai-key-67890' },
      { id: 'apiKeys.testProvider', key: 'sk-test-prefixed-key-abcde' }
    ];
    
    // Test setting API keys
    console.log('\n🔍 TEST 2: Setting API keys');
    for (const provider of testProviders) {
      try {
        const result = await global.ipcMain.handlers['secure-storage:set-api-key']({}, provider.id, provider.key);
        console.log(`Setting key for ${provider.id}: ${result ? 'SUCCESS ✅' : 'FAILURE ❌'}`);
      } catch (error) {
        console.error(`Error setting key for ${provider.id}:`, error);
      }
    }
    
    // Test retrieving API keys
    console.log('\n🔍 TEST 3: Retrieving API keys');
    for (const provider of testProviders) {
      try {
        const storedKey = await global.ipcMain.handlers['secure-storage:get-api-key']({}, provider.id);
        const keyMatch = storedKey === provider.key;
        console.log(`Getting key for ${provider.id}: ${keyMatch ? 'SUCCESS ✅' : 'FAILURE ❌'}`);
        console.log(`  Expected: ${provider.key}`);
        console.log(`  Actual:   ${storedKey}`);
      } catch (error) {
        console.error(`Error getting key for ${provider.id}:`, error);
      }
    }
    
    // Test has-api-key check
    console.log('\n🔍 TEST 4: Testing has-api-key');
    for (const provider of testProviders) {
      try {
        const hasKey = await global.ipcMain.handlers['secure-storage:has-api-key']({}, provider.id);
        console.log(`Has key for ${provider.id}: ${hasKey ? 'TRUE ✅' : 'FALSE ❌'}`);
      } catch (error) {
        console.error(`Error checking has key for ${provider.id}:`, error);
      }
    }
    
    // Test fallback logic
    console.log('\n🔍 TEST 5: Testing fallback logic');
    try {
      // This should fall back to the generic 'openai' provider
      const customOpenaiKey = await global.ipcMain.handlers['secure-storage:get-api-key']({}, 'customOpenaiService');
      console.log(`Fallback test for customOpenaiService: ${customOpenaiKey ? 'Found fallback key ✅' : 'No fallback key ❌'}`);
      if (customOpenaiKey) {
        console.log(`  Fallback key: ${customOpenaiKey}`);
      }
    } catch (error) {
      console.error('Error testing fallback logic:', error);
    }
    
    console.log('\n✨ All tests completed!');
  } catch (error) {
    console.error('Test script error:', error);
  }
}

// Check if this script is being run directly
if (require.main === module) {
  // This block will only run if the script is executed directly
  console.log('Running secure storage test script...');
  
  // If app is already ready, run tests immediately, otherwise wait
  if (app.isReady()) {
    runTests();
  } else {
    app.whenReady().then(runTests);
  }
}

// Export the test function for use in other scripts
export { runTests };
