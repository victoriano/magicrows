import React, { useState, useLayoutEffect, useRef, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { RootState } from './store';
import { setData, setLoading, removeRecentFile, clearData, setRecentFiles, updateFileTimestamp } from './store/slices/dataSlice';
import Papa from 'papaparse';
// Use absolute path from the file system for the logo in Electron
const logoImgPath = new URL('../assets/rowvana_logo.png', import.meta.url).href;

// Define the provider type
interface Provider {
  id: string;
  name: string;
  type: string;
  isActive: boolean;
  apiKey: string;
}

const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState('import');
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [columnToProcess, setColumnToProcess] = useState('');
  const [dropzoneActive, setDropzoneActive] = useState(false);
  const [showDropdown, setShowDropdown] = useState<string | null>(null);
  
  // Provider integration states
  const [providers, setProviders] = useState<Provider[]>([]);
  const [showAddProviderModal, setShowAddProviderModal] = useState(false);
  const [showEditProviderModal, setShowEditProviderModal] = useState(false);
  const [newProviderType, setNewProviderType] = useState('openai');
  const [newProviderName, setNewProviderName] = useState('');
  const [newProviderApiKey, setNewProviderApiKey] = useState('');
  const [editingProvider, setEditingProvider] = useState<string | null>(null);
  const [editProviderApiKey, setEditProviderApiKey] = useState('');
  const dispatch = useDispatch();
  const { recentFiles, isLoading, csvData, error, currentFileName, currentFilePath } = useSelector((state: RootState) => state.data);
  
  useEffect(() => {
    console.log('Recent files:', recentFiles);
  }, [recentFiles]);

  const addTestFile = () => {
    const testFile = {
      id: `file_${Date.now()}`,
      path: `/mock/path/test_file_${Date.now()}.csv`,
      name: `test_file_${Date.now()}.csv`,
      timestamp: Date.now()
    };
    
    console.log('Adding test file to recent files:', testFile);
    
    // Use the proper Redux action to update recent files
    dispatch(setRecentFiles([testFile, ...recentFiles]));
  };

  const fileInputRef = useRef<HTMLInputElement>(null);

  useLayoutEffect(() => {
    const timer = setTimeout(() => {
      const htmlElement = document.documentElement;
      htmlElement.setAttribute('data-theme', 'modern');
      console.log('Theme set to modern');
    }, 0);
    
    return () => clearTimeout(timer);
  }, []);

  const handleReloadFile = (filePath: string) => {
    dispatch(setLoading(true));
    
    // Update the timestamp whenever a file is accessed
    dispatch(updateFileTimestamp(filePath));
    
    try {
      const recentFile = recentFiles.find(file => file.path === filePath);
      
      if (!recentFile) {
        console.error('File not found in recent files');
        dispatch(setLoading(false));
        return;
      }
      
      console.log(`Loading file from path: ${filePath}`);
      
      // Try to get the saved data from localStorage
      const savedFileData = localStorage.getItem(`csv_file_${filePath}`);
      
      if (savedFileData) {
        try {
          const fileData = JSON.parse(savedFileData);
          dispatch(setData({
            headers: fileData.headers,
            rows: fileData.rows,
            fileName: recentFile.name,
            filePath: recentFile.path
          }));
          dispatch(setLoading(false));
          return;
        } catch (err) {
          console.error('Error parsing saved file data:', err);
        }
      }
      
      // Fallback to mock data if saved data isn't available
      setTimeout(() => {
        // Generate a dataset based on file name to appear unique
        const fileNameHash = recentFile.name.split('').reduce((a, b) => {
          a = ((a << 5) - a) + b.charCodeAt(0);
          return a & a;
        }, 0);
        
        // Generate headers and rows based on a hash of the filename
        // This ensures the same file always gets the same mock data
        const sectorIndex = Math.abs(fileNameHash) % 3;
        
        const sectors = [
          '1. Agriculture',
          '2. Forestry and logging',
          '3. Manufacturing'
        ];
        
        const roles = [
          '11. Chief executives, senior officials and legislators',
          '12. Business managers',
          '13. Production managers'
        ];
        
        const sector = sectors[sectorIndex];
        const role = roles[sectorIndex];
        
        // Create a larger dataset (20 rows instead of just 5)
        const headers = ['nace', 'lace', 'source_api', 'automatable_task'];
        const rows = Array(20).fill(0).map((_, i) => {
          return [
            sector,
            role, 
            'openai',
            `Task ${i+1} for ${recentFile.name}: ${sector} automation technique ${i+1}`
          ];
        });
        
        dispatch(setData({
          headers,
          rows,
          fileName: recentFile.name,
          filePath: recentFile.path
        }));
        dispatch(setLoading(false));
      }, 500);
    } catch (err) {
      console.error('Error in handleReloadFile:', err);
      dispatch(setLoading(false));
    }
  };

  const handleRemoveFromRecent = (e: React.MouseEvent, fileId: string) => {
    e.stopPropagation();
    dispatch(removeRecentFile(fileId));
  };

  const formatTimestamp = (timestamp: number): string => {
    const date = new Date(timestamp);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    
    if (date.toDateString() === today.toDateString()) {
      return `Today at ${date.getHours()}:${date.getMinutes().toString().padStart(2, '0')}`;
    } else if (date.toDateString() === yesterday.toDateString()) {
      return `Yesterday at ${date.getHours()}:${date.getMinutes().toString().padStart(2, '0')}`;
    } else {
      return `${date.toLocaleDateString()} at ${date.getHours()}:${date.getMinutes().toString().padStart(2, '0')}`;
    }
  };

  const handleImportFile = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const handleClearFile = () => {
    dispatch(clearData());
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0];
    if (selectedFile) {
      dispatch(setLoading(true));
      try {
        // For testing, add a mock file path if it doesn't exist
        const filePath = selectedFile.path || `/mock/path/${selectedFile.name}`;
        
        Papa.parse(selectedFile, {
          complete: (results) => {
            const headers = results.data[0] as string[];
            const rows = results.data.slice(1) as string[][];
            
            console.log('Adding file to recent files:', selectedFile.name, filePath);
            
            // We will store the full dataset in localStorage for later retrieval
            const fileData = {
              headers,
              rows
            };
            
            // Store the file data in localStorage with the file path as the key
            localStorage.setItem(`csv_file_${filePath}`, JSON.stringify(fileData));
            
            dispatch(setData({
              headers,
              rows,
              fileName: selectedFile.name,
              filePath: filePath
            }));
            dispatch(setLoading(false));
          },
          error: (error) => {
            dispatch(setLoading(false));
          }
        });
      } catch (err) {
        dispatch(setLoading(false));
      }
    }
  };

  // Handle toggling the dropdown menu
  const toggleDropdown = (provider: string) => {
    if (showDropdown === provider) {
      setShowDropdown(null);
    } else {
      setShowDropdown(provider);
    }
  };

  // Handle removing a provider integration
  const handleRemoveProvider = (providerId: string) => {
    // In a real implementation, this would remove the API key from storage
    console.log(`Removing ${providerId} integration`);
    setProviders(providers.filter(provider => provider.id !== providerId));
    setShowDropdown(null);
  };

  // Handle editing a provider
  const handleEditProvider = (providerId: string) => {
    const provider = providers.find(p => p.id === providerId);
    if (provider) {
      setEditingProvider(providerId);
      setEditProviderApiKey(provider.apiKey);
      setShowEditProviderModal(true);
    }
    setShowDropdown(null);
  };

  // Handle saving an edited provider
  const handleSaveEditedProvider = () => {
    if (editingProvider) {
      const newProviders = [...providers];
      const index = newProviders.findIndex(p => p.id === editingProvider);
      if (index !== -1) {
        newProviders[index].apiKey = editProviderApiKey;
        newProviders[index].isActive = !!editProviderApiKey;
        setProviders(newProviders);
      }
      
      // Close the modal
      setShowEditProviderModal(false);
      setEditingProvider(null);
      setEditProviderApiKey('');
    }
  };

  // Handle closing the edit provider modal
  const handleCloseEditModal = () => {
    setShowEditProviderModal(false);
    setEditingProvider(null);
    setEditProviderApiKey('');
  };

  // Handle adding a new provider
  const handleAddProviderClick = () => {
    // Generate default name based on provider type with sequential numbering
    const baseProviderName = `my${newProviderType.charAt(0).toUpperCase() + newProviderType.slice(1)}`;
    
    // Check if providers with the same base name already exist
    const existingProviders = providers.filter(p => 
      p.name.startsWith(baseProviderName)
    );
    
    if (existingProviders.length === 0) {
      // No providers with this name exist, use the base name
      setNewProviderName(baseProviderName);
    } else {
      // Find the highest number suffix
      let highestNum = 1;
      existingProviders.forEach(p => {
        // Extract number from the end of the name if it exists
        const match = p.name.match(new RegExp(`${baseProviderName}(\\d+)$`));
        if (match && match[1]) {
          const num = parseInt(match[1], 10);
          if (num >= highestNum) {
            highestNum = num + 1;
          }
        } else if (p.name === baseProviderName) {
          // If exact match without number exists, start at 2
          highestNum = Math.max(2, highestNum);
        }
      });
      
      // Set name with the next sequential number
      setNewProviderName(`${baseProviderName}${highestNum}`);
    }
    
    setShowAddProviderModal(true);
  };

  // Handle provider type change in the modal
  const handleProviderTypeChange = (type: string) => {
    setNewProviderType(type);
    
    // Update the name when provider type changes
    const baseProviderName = `my${type.charAt(0).toUpperCase() + type.slice(1)}`;
    
    // Check if providers with the same base name already exist
    const existingProviders = providers.filter(p => 
      p.name.startsWith(baseProviderName)
    );
    
    if (existingProviders.length === 0) {
      // No providers with this name exist, use the base name
      setNewProviderName(baseProviderName);
    } else {
      // Find the highest number suffix
      let highestNum = 1;
      existingProviders.forEach(p => {
        // Extract number from the end of the name if it exists
        const match = p.name.match(new RegExp(`${baseProviderName}(\\d+)$`));
        if (match && match[1]) {
          const num = parseInt(match[1], 10);
          if (num >= highestNum) {
            highestNum = num + 1;
          }
        } else if (p.name === baseProviderName) {
          // If exact match without number exists, start at 2
          highestNum = Math.max(2, highestNum);
        }
      });
      
      // Set name with the next sequential number
      setNewProviderName(`${baseProviderName}${highestNum}`);
    }
  };

  // Handle saving an API key
  const handleSaveApiKey = (providerId: string) => {
    // Update the provider's active status
    const newProviders = [...providers];
    const index = newProviders.findIndex(p => p.id === providerId);
    if (index !== -1 && newProviders[index].apiKey) {
      newProviders[index].isActive = true;
      setProviders(newProviders);
      setEditingProvider(null);
    }
  };

  // Handle closing the add provider modal
  const handleCloseModal = () => {
    setNewProviderName('');
    setNewProviderApiKey('');
    setShowAddProviderModal(false);
  };

  // Handle adding a new provider
  const handleAddProvider = () => {
    if (newProviderName.trim() && newProviderApiKey.trim()) {
      // Create a unique ID for the provider
      const timestamp = Date.now();
      const newProviderId = `${newProviderType}_${timestamp}`;
      
      // Add the new provider
      setProviders([
        ...providers,
        { 
          id: newProviderId, 
          name: newProviderName.trim(), 
          type: newProviderType, 
          isActive: true, 
          apiKey: newProviderApiKey 
        }
      ]);
      
      // Reset the form
      setNewProviderName('');
      setNewProviderApiKey('');
      setShowAddProviderModal(false);
    }
  };

  return (
    <div className="min-h-screen bg-base-100 text-base-content">
      <header className="sticky top-0 z-10 bg-white border-b border-gray-100 shadow-sm py-3 px-6">
        <div className="container mx-auto flex justify-between items-center">
          <div className="flex items-center">
            <img src="/rowvana_logo.png" alt="Rowvana Logo" className="h-8 mr-2" />
            <h1 className="text-xl font-bold text-gray-800">Rowvana</h1>
          </div>
          <div className="flex space-x-1 bg-base-200 p-1 rounded-lg shadow-sm">
            {['Import', 'Data', 'Settings'].map((tab) => (
              <button
                key={tab}
                className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                  activeTab === tab.toLowerCase() 
                    ? 'bg-white text-gray-800 shadow-sm' 
                    : 'text-gray-600 hover:bg-white/50'
                }`}
                onClick={() => setActiveTab(tab.toLowerCase())}
              >
                {tab}
              </button>
            ))}
          </div>
        </div>
      </header>

      <main className="container mx-auto py-6 px-4 flex flex-col gap-6">
        {activeTab === 'import' && (
          <>
            <div className="grid grid-cols-3 gap-6">
              {/* Data Upload Section */}
              <div className="col-span-2 bg-white rounded-xl shadow-card p-6">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h2 className="text-lg font-semibold text-gray-800">Data Upload</h2>
                    <p className="text-sm text-gray-600">Upload your CSV files</p>
                  </div>
                </div>
                <div className="upload-container">
                  {currentFileName && csvData ? (
                    <div className="flex flex-col items-center justify-center h-[200px] border border-gray-200 rounded-lg p-6 text-center bg-base-200">
                      <div className="w-14 h-14 bg-success/10 rounded-full flex items-center justify-center mb-3">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-7 w-7 text-success" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M5 13l4 4L19 7" />
                        </svg>
                      </div>
                      <div className="px-3 py-1 bg-base-100 rounded-md text-sm font-medium mb-2">
                        {currentFileName}
                      </div>
                      <button 
                        className="text-xs text-gray-500 hover:text-gray-700 transition-colors"
                        onClick={handleClearFile}
                      >
                        Remove file
                      </button>
                    </div>
                  ) : (
                    <div 
                      className="flex flex-col items-center justify-center h-[200px] border border-gray-200 rounded-lg p-6 text-center cursor-pointer bg-base-200 transition-all hover:bg-base-200/70"
                      onClick={handleImportFile}
                    >
                      <input 
                        type="file" 
                        ref={fileInputRef}
                        className="hidden" 
                        accept=".csv" 
                        onChange={handleFileChange} 
                      />
                      <div className="flex flex-col items-center">
                        <div className="w-14 h-14 bg-white rounded-full flex items-center justify-center mb-3 shadow-sm">
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-7 w-7 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                          </svg>
                        </div>
                        <p className="text-sm font-medium text-gray-600">Drag and drop your CSV file here</p>
                        <p className="text-xs text-gray-500 mt-1">or click to browse files</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
              
              {/* Recent Activity Section */}
              <div className="col-span-1 bg-white rounded-xl shadow-card p-6">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h2 className="text-lg font-semibold text-gray-800">Recent Activity</h2>
                    <p className="text-sm text-gray-600">Previously loaded files</p>
                  </div>
                </div>
                
                {isLoading ? (
                  <div className="flex justify-center items-center h-[200px]">
                    <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
                  </div>
                ) : recentFiles.length > 0 ? (
                  <div className="h-[200px] overflow-y-auto">
                    <div className="space-y-3">
                      {recentFiles.map((file) => (
                        <div 
                          key={file.id} 
                          className="flex items-center p-3 bg-base-200 rounded-lg cursor-pointer hover:bg-base-200/80 transition-colors"
                          onClick={() => handleReloadFile(file.path)}
                        >
                          <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center mr-3">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                            </svg>
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="text-sm font-medium text-gray-700 truncate">{file.name}</div>
                            <div className="text-xs text-gray-500">{formatTimestamp(file.timestamp)}</div>
                          </div>
                          <div className="flex space-x-1">
                            <button 
                              className="p-1 text-primary hover:text-primary-focus"
                              onClick={(e) => {
                                e.stopPropagation(); // Prevent triggering the parent onClick
                                handleReloadFile(file.path);
                              }}
                              title="Reimport file"
                            >
                              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                              </svg>
                            </button>
                            <button 
                              className="p-1 text-gray-400 hover:text-gray-600"
                              onClick={(e) => handleRemoveFromRecent(e, file.id)}
                              title="Remove from history"
                            >
                              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M6 18L18 6M6 6l12 12" />
                              </svg>
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center h-[200px] text-center">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 text-gray-300 mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                    </svg>
                    <p className="text-sm text-gray-500">No recent files</p>
                    <p className="text-xs text-gray-400 mt-1">Upload a file to get started</p>
                    <p className="text-xs text-gray-500 mt-2">Debug: {recentFiles.length} files in state</p>
                    <button 
                      className="mt-3 px-3 py-1 text-xs bg-base-300 rounded-md"
                      onClick={addTestFile}
                    >
                      Add Test File (Debug)
                    </button>
                  </div>
                )}
              </div>
            </div>
            
            {/* Preview Section - Spans Full Width */}
            {csvData && !isLoading && (
              <div className="bg-white rounded-xl shadow-card p-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-semibold text-gray-800">Preview</h2>
                  <div className="flex items-center space-x-2">
                    <span className="text-sm text-gray-500">{csvData.rows.length} rows total</span>
                    <button 
                      className="px-3 py-1 text-sm bg-primary text-white rounded-md shadow-sm"
                      onClick={() => setActiveTab('data')}
                    >
                      Import
                    </button>
                    <button 
                      className="px-3 py-1 text-sm bg-base-200 rounded-md"
                      onClick={handleClearFile}
                    >
                      Clear
                    </button>
                  </div>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-base-200 text-left">
                      <tr>
                        {csvData.headers.map((header, index) => (
                          <th key={index} className="px-4 py-2 text-xs font-medium text-gray-600 truncate">{header}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {csvData.rows.slice(0, 10).map((row, rowIndex) => (
                        <tr key={rowIndex} className="hover:bg-base-200/30">
                          {row.map((cell, cellIndex) => (
                            <td key={cellIndex} className="px-4 py-2 text-gray-700 truncate">{cell}</td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
            
            {/* Error message display */}
            {error && (
              <div className="mt-2 p-3 bg-error/10 border border-error/20 rounded-md flex items-center text-sm text-error">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span>{error}</span>
              </div>
            )}
            
            {/* Add your preview section here */}
          </>
        )}

        {activeTab === 'settings' && (
          <div className="col-span-1 md:col-span-2 lg:col-span-3">
            <div className="bg-white rounded-xl shadow-card p-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="text-lg font-semibold text-gray-800">Configuration</h2>
                  <p className="text-sm text-gray-600">Configure input/output files and settings</p>
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-base-200 rounded-lg p-6">
                  <h3 className="font-medium mb-3">Providers</h3>
                  <div className="space-y-4">
                    <div className="flex flex-col space-y-3">
                      {providers.length > 0 ? (
                        providers.map(provider => (
                          <div key={provider.id} className="bg-base-100 p-3 rounded-md border border-gray-200">
                            <div className="flex items-center justify-between mb-2">
                              <div className="flex items-center space-x-2">
                                <span className="font-medium text-sm">{provider.name}</span>
                                <span className="px-2 py-0.5 text-xs bg-gray-100 text-gray-600 rounded-md">
                                  {provider.type === 'openai' ? 'OpenAI' : 'Perplexity'}
                                </span>
                                <span className={`px-2 py-0.5 text-xs rounded-full ${
                                  provider.isActive 
                                    ? 'bg-green-100 text-green-800' 
                                    : 'bg-gray-100 text-gray-800'
                                }`}>
                                  {provider.isActive ? 'Active' : 'Inactive'}
                                </span>
                              </div>
                              <div className="relative">
                                <button 
                                  className="p-1 rounded-md hover:bg-base-200"
                                  onClick={() => toggleDropdown(provider.id)}
                                >
                                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="1"></circle><circle cx="19" cy="12" r="1"></circle><circle cx="5" cy="12" r="1"></circle></svg>
                                </button>
                                {showDropdown === provider.id && (
                                  <div className="absolute right-0 mt-1 w-36 bg-white border rounded-md shadow-md z-10">
                                    <button 
                                      className="w-full px-4 py-2 text-sm text-left text-blue-600 hover:bg-gray-100"
                                      onClick={() => handleEditProvider(provider.id)}
                                    >
                                      Edit
                                    </button>
                                    <button 
                                      className="w-full px-4 py-2 text-sm text-left text-red-600 hover:bg-gray-100"
                                      onClick={() => handleRemoveProvider(provider.id)}
                                    >
                                      Remove
                                    </button>
                                  </div>
                                )}
                              </div>
                            </div>
                            <div className="flex flex-col space-y-2">
                              <p className="text-xs text-gray-500">
                                {provider.isActive ? 
                                  'API key is set and the integration is active.' : 
                                  'No API key set. Click Edit to add your key.'}
                              </p>
                            </div>
                          </div>
                        ))
                      ) : (
                        <div className="bg-base-100 p-6 rounded-md border border-gray-200 flex flex-col items-center justify-center">
                          <svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" className="text-gray-300 mb-3">
                            <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"></path>
                            <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"></path>
                          </svg>
                          <p className="text-sm text-gray-500 mb-1">No API integrations configured</p>
                          <p className="text-xs text-gray-400 text-center mb-4">Add an integration to connect with AI providers</p>
                        </div>
                      )}
                    </div>
                    
                    <div className="pt-2">
                      <button className="w-full px-4 py-2 text-sm bg-primary text-white hover:bg-primary-focus rounded-md flex items-center justify-center"
                        onClick={handleAddProviderClick}
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
                        Add New Provider
                      </button>
                    </div>
                  </div>
                </div>
                <div className="bg-base-200 rounded-lg p-6">
                  <h3 className="font-medium mb-3">Advanced Settings</h3>
                  <div className="space-y-4">
                    <div className="flex flex-col space-y-1">
                      <label className="text-sm font-medium">Output Directory</label>
                      <div className="flex">
                        <input type="text" className="px-3 py-2 border rounded-l-md flex-1" placeholder="Select output directory" />
                        <button className="px-3 py-2 bg-base-300 border border-l-0 rounded-r-md">Browse</button>
                      </div>
                    </div>
                    <div className="flex flex-col space-y-1">
                      <label className="text-sm font-medium">Processing Threads</label>
                      <input type="number" className="px-3 py-2 border rounded-md" defaultValue={4} />
                    </div>
                    <div className="flex items-center space-x-2">
                      <input type="checkbox" className="checkbox" />
                      <span className="text-sm">Save results automatically</span>
                    </div>
                  </div>
                </div>
              </div>
              <div className="flex justify-end mt-6">
                <button className="px-4 py-2 bg-primary text-white rounded-md shadow-sm">Save Settings</button>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'data' && (
          <div className="space-y-6">
            {csvData ? (
              <>
                <div className="bg-white rounded-xl shadow-card p-6">
                  <div className="flex items-center justify-between mb-6">
                    <div>
                      <h2 className="text-lg font-semibold text-gray-800">Imported Data</h2>
                      <p className="text-sm text-gray-600">
                        {currentFileName && `Current file: ${currentFileName}`}
                      </p>
                    </div>
                    <div className="space-x-2">
                      <button className="px-3 py-1 text-sm bg-primary text-white rounded-md">Process</button>
                      <button className="px-3 py-1 text-sm bg-base-200 rounded-md">Export</button>
                    </div>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead className="bg-base-200 text-left sticky top-0">
                        <tr>
                          {csvData.headers.map((header, index) => (
                            <th key={index} className="px-4 py-2 text-xs font-medium text-gray-600 truncate">{header}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {csvData.rows.map((row, rowIndex) => (
                          <tr key={rowIndex} className="hover:bg-base-200/30">
                            {row.map((cell, cellIndex) => (
                              <td key={cellIndex} className="px-4 py-2 text-gray-700 truncate">{cell}</td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </>
            ) : (
              <div className="bg-white rounded-xl shadow-card p-6 text-center">
                <div className="py-8">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 text-gray-300 mx-auto mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  <h3 className="text-lg font-medium text-gray-800 mb-2">No Data Imported</h3>
                  <p className="text-gray-500 max-w-md mx-auto mb-6">
                    Import a CSV file from the Import tab to view and process your data.
                  </p>
                  <button 
                    className="px-4 py-2 bg-primary text-white rounded-md shadow-sm"
                    onClick={() => setActiveTab('import')}
                  >
                    Go to Import
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </main>

      <footer className="py-4 border-t bg-white mt-auto">
        <div className="container mx-auto px-6 text-center text-sm text-gray-500">
          <p>Rowvana &copy; {new Date().getFullYear()} | Version 0.1.0</p>
        </div>
      </footer>

      {/* Add Provider Modal */}
      {showAddProviderModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold mb-4">Add New Provider</h3>
            <div className="space-y-4">
              <div className="flex flex-col space-y-1">
                <label className="text-sm font-medium">Provider Type</label>
                <select 
                  className="px-3 py-2 border rounded-md"
                  value={newProviderType}
                  onChange={(e) => handleProviderTypeChange(e.target.value)}
                >
                  <option value="openai">OpenAI</option>
                  <option value="perplexity">Perplexity</option>
                </select>
              </div>
              <div className="flex flex-col space-y-1">
                <label className="text-sm font-medium">Provider Name</label>
                <input
                  type="text"
                  className="px-3 py-2 border rounded-md"
                  placeholder="e.g., My OpenAI"
                  value={newProviderName}
                  onChange={(e) => setNewProviderName(e.target.value)}
                />
              </div>
              <div className="flex flex-col space-y-1">
                <label className="text-sm font-medium">API Key</label>
                <input
                  type="text"
                  className="px-3 py-2 border rounded-md font-mono"
                  placeholder="Enter API key"
                  onFocus={(e) => e.target.type = 'text'}
                  onBlur={(e) => e.target.value ? e.target.type = 'password' : e.target.type = 'text'}
                  value={newProviderApiKey}
                  onChange={(e) => setNewProviderApiKey(e.target.value)}
                />
              </div>
            </div>
            <div className="flex justify-end space-x-2 mt-6">
              <button
                className="px-4 py-2 text-sm border rounded-md hover:bg-gray-50"
                onClick={handleCloseModal}
              >
                Cancel
              </button>
              <button
                className="px-4 py-2 text-sm bg-primary text-white rounded-md"
                onClick={handleAddProvider}
                disabled={!newProviderName.trim()}
              >
                Add Provider
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Provider Modal */}
      {showEditProviderModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold mb-4">Edit Provider</h3>
            <div className="space-y-4">
              <div className="flex flex-col space-y-1">
                <label className="text-sm font-medium">API Key</label>
                <input
                  type="text"
                  className="px-3 py-2 border rounded-md font-mono"
                  placeholder="Enter API key"
                  onFocus={(e) => e.target.type = 'text'}
                  onBlur={(e) => e.target.value ? e.target.type = 'password' : e.target.type = 'text'}
                  value={editProviderApiKey}
                  onChange={(e) => setEditProviderApiKey(e.target.value)}
                />
              </div>
            </div>
            <div className="flex justify-end space-x-2 mt-6">
              <button
                className="px-4 py-2 text-sm border rounded-md hover:bg-gray-50"
                onClick={handleCloseEditModal}
              >
                Cancel
              </button>
              <button
                className="px-4 py-2 text-sm bg-primary text-white rounded-md"
                onClick={handleSaveEditedProvider}
              >
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default App;