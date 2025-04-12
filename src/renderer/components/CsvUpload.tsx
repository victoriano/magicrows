import React, { useState, useRef, useEffect } from 'react';
import Papa from 'papaparse';

interface CsvData {
  data: string[][];
  headers: string[];
}

const CsvUpload: React.FC = () => {
  const [file, setFile] = useState<File | null>(null);
  const [csvData, setCsvData] = useState<CsvData | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dropZoneRef = useRef<HTMLDivElement>(null);
  const dragCounter = useRef<number>(0);

  // Use useEffect to handle drag and drop events at the document level
  useEffect(() => {
    const preventDefaults = (e: Event) => {
      e.preventDefault();
      e.stopPropagation();
    };

    const highlight = () => {
      dragCounter.current += 1;
      if (dropZoneRef.current) {
        setIsDragging(true);
      }
    };

    const unhighlight = () => {
      dragCounter.current -= 1;
      if (dragCounter.current === 0 && dropZoneRef.current) {
        setIsDragging(false);
      }
    };

    const handleDrop = (e: DragEvent) => {
      preventDefaults(e);
      unhighlight();
      
      try {
        const dt = e.dataTransfer;
        if (dt?.files && dt.files.length > 0 && dropZoneRef.current?.contains(e.target as Node)) {
          const droppedFile = dt.files[0];
          setFile(droppedFile);
          parseCSV(droppedFile);
        }
      } catch (err) {
        console.error('Error handling dropped file:', err);
        setError(`Error handling dropped file: ${err instanceof Error ? err.message : String(err)}`);
      }
    };

    // Add event listeners for the whole document
    ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
      document.addEventListener(eventName, preventDefaults, false);
    });
    
    document.addEventListener('dragenter', highlight, false);
    document.addEventListener('dragleave', unhighlight, false);
    document.addEventListener('drop', handleDrop, false);

    // Clean up
    return () => {
      ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
        document.removeEventListener(eventName, preventDefaults, false);
      });
      document.removeEventListener('dragenter', highlight, false);
      document.removeEventListener('dragleave', unhighlight, false);
      document.removeEventListener('drop', handleDrop, false);
    };
  }, []);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const selectedFile = e.target.files[0];
      setFile(selectedFile);
      parseCSV(selectedFile);
    }
  };

  const parseCSV = (file: File) => {
    setLoading(true);
    setError(null);

    try {
      Papa.parse(file, {
        complete: (results) => {
          try {
            if (results.data && Array.isArray(results.data) && results.data.length > 0) {
              // Extract headers from the first row
              const headers = results.data[0] as string[];
              // The rest are data rows
              const data = results.data.slice(1) as string[][];
              setCsvData({ data, headers });
            } else {
              setError('No data found in the CSV file');
            }
          } catch (e) {
            console.error('Error processing CSV data:', e);
            setError(`Error processing CSV data: ${e instanceof Error ? e.message : String(e)}`);
          } finally {
            setLoading(false);
          }
        },
        error: (error) => {
          console.error('PapaParse error:', error);
          setError(`Error parsing CSV: ${error.message}`);
          setLoading(false);
        }
      });
    } catch (e) {
      console.error('Error while parsing CSV:', e);
      setError(`Error while parsing CSV: ${e instanceof Error ? e.message : String(e)}`);
      setLoading(false);
    }
  };

  const clearFile = (e: React.MouseEvent) => {
    e.stopPropagation();
    setFile(null);
    setCsvData(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className="h-full">
      <div 
        ref={dropZoneRef}
        className={`flex flex-col items-center justify-center h-[200px] border ${isDragging ? 'border-primary border-2' : 'border-gray-200'} rounded-lg p-6 text-center cursor-pointer bg-base-200 transition-all hover:bg-base-200/70`}
        onClick={() => fileInputRef.current?.click()}
      >
        <input 
          type="file" 
          ref={fileInputRef}
          className="hidden" 
          accept=".csv" 
          onChange={handleFileChange} 
        />
        
        {!file ? (
          <div className="flex flex-col items-center">
            <div className="w-14 h-14 bg-white rounded-full flex items-center justify-center mb-3 shadow-sm">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-7 w-7 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
              </svg>
            </div>
            <p className="text-sm font-medium text-gray-600">Drag and drop your CSV file here</p>
            <p className="text-xs text-gray-500 mt-1">or click to browse files</p>
          </div>
        ) : (
          <div className="flex flex-col items-center">
            <div className="w-14 h-14 bg-success/10 rounded-full flex items-center justify-center mb-3">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-7 w-7 text-success" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <div className="px-3 py-1 bg-base-100 rounded-md text-sm font-medium mb-2">
              {file.name}
            </div>
            <button 
              className="text-xs text-gray-500 hover:text-gray-700 transition-colors"
              onClick={clearFile}
            >
              Remove file
            </button>
          </div>
        )}
      </div>

      {error && (
        <div className="mt-4 p-3 bg-error/10 border border-error/20 rounded-md flex items-center text-sm text-error">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span>{error}</span>
        </div>
      )}

      {loading && (
        <div className="flex justify-center items-center mt-4 h-8">
          <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
          <span className="ml-2 text-sm text-gray-600">Processing file...</span>
        </div>
      )}

      {csvData && !loading && (
        <div className="mt-4">
          <div className="flex justify-between items-center mb-3">
            <h3 className="text-sm font-medium text-gray-700">Preview</h3>
            <span className="text-xs text-gray-500">{csvData.data.length} rows total</span>
          </div>
          <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
            <div className="overflow-x-auto max-h-[200px]">
              <table className="w-full text-sm">
                <thead className="bg-base-200 text-left">
                  <tr>
                    {csvData.headers.map((header, index) => (
                      <th key={index} className="px-4 py-2 text-xs font-medium text-gray-600 truncate">{header}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {csvData.data.slice(0, 5).map((row, rowIndex) => (
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
        </div>
      )}
    </div>
  );
};

export default CsvUpload;