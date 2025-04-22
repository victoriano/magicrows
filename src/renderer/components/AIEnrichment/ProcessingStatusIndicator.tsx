import React from 'react';
import { useAIEnrichment } from '../../hooks/useAIEnrichment';

/**
 * Component to display the current processing status of AI enrichment
 */
const ProcessingStatusIndicator: React.FC = () => {
  const { 
    status, 
    error,
    selectedPreset,
    processingMetrics
  } = useAIEnrichment();

  if (status === 'idle' && !error) {
    return null;
  }

  return (
    <div className={`bg-white rounded-lg p-6 my-4 shadow-md border ${
      status === 'error' ? 'border-red-200' :
      status === 'success' ? 'border-green-200' :
      'border-blue-200'
    }`}>
      {status === 'processing' && (
        <div className="flex items-center space-x-4">
          <div className="bg-blue-50 p-3 rounded-full">
            <svg className="animate-spin h-6 w-6 text-primary" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
          </div>
          <div>
            <p className="font-medium text-lg">Processing with {selectedPreset?.config.integrationName}</p>
            <p className="text-sm text-gray-600 mt-1">
              {processingMetrics?.processed} of {processingMetrics?.total} items processed
            </p>
          </div>
        </div>
      )}

      {status === 'success' && (
        <div className="flex items-center space-x-4">
          <div className="bg-green-50 p-3 rounded-full">
            <svg className="h-6 w-6 text-green-500" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
            </svg>
          </div>
          <div>
            <p className="font-medium text-lg">Processing complete</p>
            <p className="text-sm text-gray-600 mt-1">
              Enriched {processingMetrics?.processed} items in {processingMetrics?.timeElapsed} seconds
            </p>
          </div>
        </div>
      )}

      {status === 'error' && (
        <div className="flex items-center space-x-4">
          <div className="bg-red-50 p-3 rounded-full">
            <svg className="h-6 w-6 text-red-500" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
            </svg>
          </div>
          <div>
            <p className="font-medium text-lg">Error during processing</p>
            <p className="text-sm text-red-600 mt-1">{error}</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProcessingStatusIndicator;
