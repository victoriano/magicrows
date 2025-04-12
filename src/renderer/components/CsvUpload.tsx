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
    <div className="card bg-base-200 shadow-xl">
      <div className="card-body">
        <h2 className="card-title">Upload CSV</h2>
        
        <div 
          ref={dropZoneRef}
          className={`border-2 border-dashed ${isDragging ? 'border-primary' : 'border-base-300'} rounded-box p-8 text-center cursor-pointer bg-base-100`}
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
            <div>
              <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 mx-auto text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
              </svg>
              <p className="mt-4 text-base-content">Drag and drop your CSV file here, or click to select</p>
            </div>
          ) : (
            <div>
              <div className="badge badge-primary">{file.name}</div>
              <button 
                className="btn btn-sm btn-ghost mt-2"
                onClick={clearFile}
              >
                Clear
              </button>
            </div>
          )}
        </div>

        {error && (
          <div className="alert alert-error mt-4">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 shrink-0 stroke-current" fill="none" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span>{error}</span>
          </div>
        )}

        {loading && (
          <div className="flex justify-center mt-4">
            <span className="loading loading-spinner loading-lg text-primary"></span>
          </div>
        )}

        {csvData && !loading && (
          <div className="mt-4 overflow-x-auto">
            <h3 className="font-bold text-lg mb-2">Preview:</h3>
            <table className="table table-zebra w-full">
              <thead>
                <tr>
                  {csvData.headers.map((header, index) => (
                    <th key={index}>{header}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {csvData.data.slice(0, 5).map((row, rowIndex) => (
                  <tr key={rowIndex}>
                    {row.map((cell, cellIndex) => (
                      <td key={cellIndex}>{cell}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
            {csvData.data.length > 5 && (
              <p className="text-sm text-base-content/70 mt-2">
                Showing {Math.min(5, csvData.data.length)} of {csvData.data.length} rows
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default CsvUpload; 