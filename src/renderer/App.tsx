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
  
  // Set the theme to 'silk' when the component mounts (before render)
  useLayoutEffect(() => {
    // Apply the theme after a short delay to ensure the DOM is ready
    const timer = setTimeout(() => {
      const htmlElement = document.documentElement;
      htmlElement.setAttribute('data-theme', 'silk');
      console.log('Theme set to silk');
    }, 0);
    
    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="min-h-screen bg-base-100 text-base-content">
      <header className="navbar bg-base-200 shadow-md">
        <div className="flex-1">
          <h1 className="text-xl font-bold px-4">Rowvana</h1>
        </div>
        <div className="flex-none px-4">
          <div className="tabs tabs-boxed">
            <a 
              className={`tab ${activeTab === 'config' ? 'tab-active' : ''}`}
              onClick={() => setActiveTab('config')}
            >
              Configuration
            </a>
            <a 
              className={`tab ${activeTab === 'data' ? 'tab-active' : ''}`}
              onClick={() => setActiveTab('data')}
            >
              Data Preview
            </a>
            <a 
              className={`tab ${activeTab === 'process' ? 'tab-active' : ''}`}
              onClick={() => setActiveTab('process')}
            >
              Processing
            </a>
            <a 
              className={`tab ${activeTab === 'results' ? 'tab-active' : ''}`}
              onClick={() => setActiveTab('results')}
            >
              Results
            </a>
          </div>
        </div>
      </header>

      <main className="container mx-auto p-4">
        {activeTab === 'config' && (
          <div>
            <div className="card bg-base-200 shadow-xl mb-4">
              <div className="card-body">
                <h2 className="card-title">Configuration</h2>
                <p>Configure input/output files and API settings.</p>
                {/* <ConfigPanel /> */}
                <div className="placeholder mb-4">Configuration Panel Component (Coming Soon)</div>
              </div>
            </div>
            <CsvUpload />
          </div>
        )}

        {activeTab === 'data' && (
          <div className="card bg-base-200 shadow-xl">
            <div className="card-body">
              <h2 className="card-title">Data Preview</h2>
              <p>View and filter NACE/ISCO combinations.</p>
              {/* <DataPreview /> */}
              <div className="placeholder">Data Preview Component (Coming Soon)</div>
            </div>
          </div>
        )}

        {activeTab === 'process' && (
          <div className="card bg-base-200 shadow-xl">
            <div className="card-body">
              <h2 className="card-title">Processing</h2>
              <p>Generate tasks using AI APIs.</p>
              {/* <ProcessingPanel /> */}
              <div className="placeholder">Processing Panel Component (Coming Soon)</div>
            </div>
          </div>
        )}

        {activeTab === 'results' && (
          <div className="card bg-base-200 shadow-xl">
            <div className="card-body">
              <h2 className="card-title">Results</h2>
              <p>View and export generated tasks.</p>
              {/* <ResultsView /> */}
              <div className="placeholder">Results View Component (Coming Soon)</div>
            </div>
          </div>
        )}
      </main>

      <footer className="footer footer-center p-4 bg-base-200 text-base-content">
        <div>
          <p>Rowvana - v0.1.0</p>
        </div>
      </footer>
    </div>
  );
};

export default App; 