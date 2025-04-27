import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useAIEnrichment } from '../../hooks/useAIEnrichment';

/**
 * Component to display the current processing status of AI enrichment
 */
const ProcessingStatusIndicator: React.FC = () => {
  const { 
    status, 
    error,
    selectedPreset,
    processingMetrics,
    enrichmentResult
  } = useAIEnrichment();

  const [isVisible, setIsVisible] = useState(true);
  const [shouldRender, setShouldRender] = useState(true); 
  const hideTimerRef = useRef<NodeJS.Timeout | null>(null);
  const unmountTimerRef = useRef<NodeJS.Timeout | null>(null);
  const animationDuration = 2000; // Match CSS duration
  
  // Use a ref to track if we've shown the success message for this enrichment result
  const hasShownSuccessMessage = useRef(false);

  // Check if we've already shown the success message for this result
  useEffect(() => {
    // When a new enrichment result appears, reset our tracking
    if (enrichmentResult) {
      const resultId = enrichmentResult.timestamp || Date.now();
      const shownMessageKey = `shown_message_${resultId}`;
      
      if (localStorage.getItem(shownMessageKey)) {
        // We've already shown this message
        hasShownSuccessMessage.current = true;
      } else if (status === 'success') {
        // Mark this message as shown
        localStorage.setItem(shownMessageKey, 'true');
        hasShownSuccessMessage.current = false;
      }
    }
  }, [enrichmentResult, status]);

  // Function to initiate the fade-out and subsequent unmount
  const startFadeOut = useCallback(() => {
    // Clear any pending unmount timer
    if (unmountTimerRef.current) clearTimeout(unmountTimerRef.current);
    
    setIsVisible(false); // Start fade-out via CSS opacity
    // Set a timer to remove the component from DOM after the animation
    unmountTimerRef.current = setTimeout(() => {
      setShouldRender(false);
    }, animationDuration);
  }, [animationDuration]); // animationDuration is constant, so this is stable

  // Effect to manage visibility based on status
  useEffect(() => {
    // Always clear timers when status changes
    if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
    if (unmountTimerRef.current) clearTimeout(unmountTimerRef.current);

    if (status === 'idle' && !error) {
      setIsVisible(false); // Hide immediately
      setShouldRender(false); // Unmount immediately
    } else if (status === 'success' && hasShownSuccessMessage.current) {
      // If we've already shown the success message for this result, don't show it again
      setIsVisible(false);
      setShouldRender(false);
    } else {
      // For processing, error, or new success, ensure it's rendered and visible
      setShouldRender(true);
      setIsVisible(true);
      
      // If success, start the 5-second auto-hide timer
      if (status === 'success') {
        hasShownSuccessMessage.current = true; // Mark that we've shown this message
        hideTimerRef.current = setTimeout(() => {
          startFadeOut(); // Trigger the fade-out process
        }, 5000); // Auto-hide starts after 5 seconds
      }
    }

    // Cleanup function for timers
    return () => {
      if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
      if (unmountTimerRef.current) clearTimeout(unmountTimerRef.current);
    };
  // Removed startFadeOut from dependencies as it's stable due to useCallback
  }, [status, error]); 

  const handleClose = () => {
    // Clear potential auto-hide timer if manually closed
    if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
    startFadeOut(); // Manually trigger fade-out
    
    // Remember that we've closed this message
    if (enrichmentResult) {
      const resultId = enrichmentResult.timestamp || Date.now();
      localStorage.setItem(`shown_message_${resultId}`, 'true');
      hasShownSuccessMessage.current = true;
    }
  };

  // Only render if shouldRender is true
  if (!shouldRender) {
     return null;
  }

  // Render the component with appropriate classes
  return (
    <div className={`bg-white rounded-lg p-6 my-4 shadow-md border relative transition-opacity duration-[2000ms] ease-in-out ${ 
      status === 'error' ? 'border-red-200' :
      status === 'success' ? 'border-green-200' :
      'border-blue-200'
    } ${isVisible ? 'opacity-100' : 'opacity-0'}`} // Opacity controlled by isVisible
    >
      {/* Close button shown for success and error states */}
      {(status === 'success' || status === 'error') && ( 
        <button
          onClick={handleClose}
          className="absolute top-2 right-2 p-1 text-gray-400 hover:text-gray-600 focus:outline-none z-10" 
          aria-label="Close status message"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      )}

      {/* Content based on status */}
      {status === 'processing' && (
        <div className="flex items-center space-x-4">
          <div className="bg-blue-50 p-3 rounded-full">
            <svg className="animate-spin h-6 w-6 text-primary" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
          </div>
          <div>
            <p className="font-medium text-lg">Processing with {selectedPreset?.config.integrationName || 'AI'}</p>
            <p className="text-sm text-gray-600 mt-1">
              {processingMetrics?.processed} of {processingMetrics?.total} items processed
            </p>
          </div>
        </div>
      )}

      {status === 'success' && (
        <div className="flex items-center space-x-4 pr-6"> 
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
