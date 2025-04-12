import React, { useState, useLayoutEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import CsvUpload from './components/CsvUpload';
// As we develop the application, these will be imported from the actual components
// import ConfigPanel from './components/ConfigPanel';
// import DataPreview from './components/DataPreview';
// import ProcessingPanel from './components/ProcessingPanel';
// import ResultsView from './components/ResultsView';

const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState('config');
  
  // Set the theme to 'modern' when the component mounts (before render)
  useLayoutEffect(() => {
    // Apply the theme after a short delay to ensure the DOM is ready
    const timer = setTimeout(() => {
      const htmlElement = document.documentElement;
      htmlElement.setAttribute('data-theme', 'modern');
      console.log('Theme set to modern');
    }, 0);
    
    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="min-h-screen bg-base-100 text-base-content">
      <header className="sticky top-0 z-10 bg-white border-b border-gray-100 shadow-sm py-3 px-6">
        <div className="container mx-auto flex justify-between items-center">
          <h1 className="text-xl font-bold text-gray-800">Rowvana</h1>
          <div className="flex space-x-1 bg-base-200 p-1 rounded-lg shadow-sm">
            {['Config', 'Data', 'Process', 'Results'].map((tab) => (
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

      <main className="container mx-auto py-6 px-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {activeTab === 'config' && (
          <>
            <div className="col-span-1 md:col-span-2 lg:col-span-3">
              <div className="bg-white rounded-xl shadow-card p-6">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h2 className="text-lg font-semibold text-gray-800">Configuration</h2>
                    <p className="text-sm text-gray-600">Configure input/output files and settings</p>
                  </div>
                </div>
                <div className="bg-base-200 rounded-lg p-4 my-4">
                  <div className="text-center text-gray-500 py-4">Configuration Panel (Coming Soon)</div>
                </div>
              </div>
            </div>
            
            <div className="col-span-1 md:col-span-2 lg:col-span-2">
              <div className="bg-white rounded-xl shadow-card p-6 h-full">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h2 className="text-lg font-semibold text-gray-800">Data Upload</h2>
                    <p className="text-sm text-gray-600">Upload your CSV files</p>
                  </div>
                </div>
                <CsvUpload />
              </div>
            </div>
            
            <div className="col-span-1 md:col-span-2 lg:col-span-1">
              <div className="bg-white rounded-xl shadow-card p-6 h-full">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h2 className="text-lg font-semibold text-gray-800">Recent Activity</h2>
                    <p className="text-sm text-gray-600">Latest uploads and processes</p>
                  </div>
                </div>
                <div className="space-y-3">
                  {[1, 2, 3].map((item) => (
                    <div key={item} className="flex items-center p-3 bg-base-200 rounded-lg">
                      <div className="w-2 h-2 bg-success rounded-full mr-3"></div>
                      <div className="text-sm">Sample Activity {item}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </>
        )}

        {activeTab === 'data' && (
          <div className="col-span-1 md:col-span-2 lg:col-span-3">
            <div className="bg-white rounded-xl shadow-card p-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="text-lg font-semibold text-gray-800">Data Preview</h2>
                  <p className="text-sm text-gray-600">View and filter uploaded data</p>
                </div>
                <div className="flex space-x-2">
                  <button className="px-3 py-1 text-sm bg-base-200 rounded-md">Filter</button>
                  <button className="px-3 py-1 text-sm bg-base-200 rounded-md">Export</button>
                </div>
              </div>
              <div className="bg-base-200 rounded-lg p-6 flex items-center justify-center min-h-[300px]">
                <div className="text-center text-gray-500">Data Preview (Coming Soon)</div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'process' && (
          <div className="col-span-1 md:col-span-2 lg:col-span-3">
            <div className="bg-white rounded-xl shadow-card p-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="text-lg font-semibold text-gray-800">Processing</h2>
                  <p className="text-sm text-gray-600">Generate tasks using AI APIs</p>
                </div>
                <button className="px-4 py-1.5 text-sm bg-primary text-white rounded-md">Start Processing</button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-base-200 rounded-lg p-6">
                  <h3 className="font-medium mb-3">Processing Options</h3>
                  <div className="space-y-4">
                    <div className="flex items-center space-x-2">
                      <input type="checkbox" className="checkbox" checked />
                      <span className="text-sm">Option 1</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <input type="checkbox" className="checkbox" />
                      <span className="text-sm">Option 2</span>
                    </div>
                  </div>
                </div>
                <div className="bg-base-200 rounded-lg p-6 flex items-center justify-center">
                  <div className="text-center text-gray-500">Processing Panel (Coming Soon)</div>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'results' && (
          <div className="col-span-1 md:col-span-2 lg:col-span-3">
            <div className="bg-white rounded-xl shadow-card p-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="text-lg font-semibold text-gray-800">Results</h2>
                  <p className="text-sm text-gray-600">View and export generated tasks</p>
                </div>
                <div className="flex space-x-2">
                  <button className="px-3 py-1 text-sm bg-base-200 rounded-md">Filter</button>
                  <button className="px-3 py-1 text-sm bg-primary text-white rounded-md">Export</button>
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="md:col-span-2">
                  <div className="bg-base-200 rounded-lg p-6 h-[300px] flex items-center justify-center">
                    <div className="text-center text-gray-500">Results Chart (Coming Soon)</div>
                  </div>
                </div>
                <div className="md:col-span-1">
                  <div className="bg-base-200 rounded-lg p-6 h-[300px] flex flex-col">
                    <h3 className="font-medium mb-3">Statistics</h3>
                    <div className="space-y-3 flex-1">
                      <div className="flex justify-between items-center p-2 bg-base-100 rounded">
                        <span className="text-sm">Total Items</span>
                        <span className="font-semibold">120</span>
                      </div>
                      <div className="flex justify-between items-center p-2 bg-base-100 rounded">
                        <span className="text-sm">Processed</span>
                        <span className="font-semibold">78</span>
                      </div>
                      <div className="flex justify-between items-center p-2 bg-base-100 rounded">
                        <span className="text-sm">Success Rate</span>
                        <span className="font-semibold">92%</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>

      <footer className="py-4 border-t bg-white mt-auto">
        <div className="container mx-auto px-6 text-center text-sm text-gray-500">
          <p>Rowvana - v0.1.0</p>
        </div>
      </footer>
    </div>
  );
};

export default App;