const fs = require('fs');
const path = require('path');

module.exports = {
  packagerConfig: {
    asar: true,
    icon: './build/icon', // Path without extension for proper icon format selection
    extraResource: [
      // Add any additional resources here
    ],
    // Ensure complete renaming across all references
    executableName: 'MagicRows',
    applicationName: 'MagicRows',
    name: 'MagicRows',
    productName: 'MagicRows',
    appBundleId: 'com.magicrows.app',
    // Ensure native modules are properly built for the target platform
    // *** ignore pattern removed to use defaults ***
  },
  rebuildConfig: {
    // Force rebuilding native modules for the target platform
    forceRebuild: true,
    // Specify which native modules need to be rebuilt
    onlyModules: ['electron-store']
  },
  makers: [
    {
      name: '@electron-forge/maker-squirrel',
      config: {},
    },
    {
      name: '@electron-forge/maker-zip',
      platforms: ['darwin'],
    },
    {
      name: '@electron-forge/maker-deb',
      config: {},
    },
    {
      name: '@electron-forge/maker-rpm',
      config: {},
    },
    {
      name: '@electron-forge/maker-dmg',
      config: {
        icon: './build/icon.icns', // Using the converted ICNS file for DMG
        format: 'ULFO',
        name: 'MagicRows'
      }
    }
  ],
  plugins: [
    {
      name: '@electron-forge/plugin-vite',
      config: {
        build: [
          {
            entry: 'src/main/main.ts',
            config: 'vite.main.config.ts',
          },
          {
            entry: 'src/preload/preload.ts',
            config: 'vite.preload.config.ts',
          },
        ],
        renderer: [
          {
            name: 'main_window',
            config: 'vite.renderer.config.ts',
          },
        ],
      },
    }
  ],
  electronRebuildConfig: {},
  hooks: {
    generateAssets: async () => {
    }
  }
};