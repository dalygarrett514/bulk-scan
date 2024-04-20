import './FileDrop.css';
import React, { useState, useEffect } from 'react';
import { useDropzone } from 'react-dropzone';
import Papa from 'papaparse';

const FileDrop = () => {
  const [file, setFile] = useState(null);
  const [apiKey, setApiKey] = useState('');
  const [isFileUploaded, setIsFileUploaded] = useState(false);
  const [responseTableData, setResponseTableData] = useState([]);
  const [progressPercentage, setProgressPercentage] = useState(0);

  useEffect(() => {
    setProgressPercentage(0); // Reset progress percentage on file change
  }, [file]);

  const onDrop = (acceptedFiles) => {
    setFile(acceptedFiles[0]);
    setIsFileUploaded(true); // Set the indicator when a file is uploaded
  };

  const { getRootProps, getInputProps } = useDropzone({ onDrop });

  const handleApiKeyChange = (event) => {
    setApiKey(event.target.value);
  };

  const handleBulkScan = async () => {
    if (!file) return;
  
    if (!apiKey.trim()) {
      console.error('API Key is required');
      return;
    }
  
    const reader = new FileReader();
    reader.onload = async (event) => {
      const fileContent = event.target.result;
  
      const csvData = Papa.parse(fileContent, { header: true });
      const rows = csvData.data;
      const totalRequests = rows.length;
      let completedRequests = 0;
  
      const responseDataArray = [];
      // Send API requests for each row
      for (const row of rows) {
        const requestData = {
          name: row.Name,
          address: row.Address,
          phone: row.Phone,
          city: row.City,
          state: row.State,
          zip: row['Zip Code'],
          includeReviewMetrics: true,
          performDuplicateSearch: true
        };
  
        try {
          const response = await fetch(`https://thingproxy.freeboard.io/fetch/https://api.yext.com/v2/accounts/me/scan?api_key=${apiKey}&v=20240412`, {
            method: 'POST',

            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify(requestData),
            mode: 'no-cors' // Add this line to set the request mode to 'no-cors'
          });
  
          if (!response.ok) {
            throw new Error('Failed to perform bulk scan');
          }
  
          const responseData = await response.json();
          responseDataArray.push({ name: row.Name, jobId: responseData.response.jobId, success: true });
        } catch (error) {
          console.error('Error performing bulk scan:', error.message);
          responseDataArray.push({ name: row.Name, jobId: '', success: false });
        } finally {
          completedRequests++;
          const percentage = (completedRequests / totalRequests) * 50; // Update progress for POST requests
          console.log('Progress for POST:', percentage); // Debugging
          setProgressPercentage(percentage);
        }
      }
  
      // Update table data state after all API calls are completed
      setResponseTableData(responseDataArray);
  
      // Add a delay before making GET requests
      setTimeout(async () => {
        const responseDataLength = responseDataArray.length;
        for (let i = 0; i < responseDataLength; i++) {
          const data = responseDataArray[i];
          if (!data.success) {
            continue; // Skip failed requests
          }
          try {
            const additionalResponse = await fetch(`https://thingproxy.freeboard.io/fetch/https://api.yext.com/v2/accounts/me/metrics/${data.jobId}?api_key=${apiKey}&v=20230726`);
            if (!additionalResponse.ok) {
              throw new Error('Failed to fetch additional data');
            }
            const additionalData = await additionalResponse.json();
            // Add additional data to the response table data and format percentages
            data.reviewsPercentile = formatPercentage(additionalData.response.reviews_percentile);
            data.listingsInaccuracy = formatPercentage(additionalData.response.listings_inaccuracy);
            // Update progress for GET requests
            const percentageGET = 50 + ((i + 1) / totalRequests) * 50;
            console.log('Progress for GET:', percentageGET); // Debugging
            setProgressPercentage(percentageGET);
          } catch (error) {
            console.error('Error fetching additional data:', error.message);
          }
        }
      }, 12000); // 12-second delay before making GET requests
    };
    reader.readAsText(file);
  };
      
  // Function to format a decimal value as a percentage
  const formatPercentage = (value) => {
    if (value === null || value === undefined) return '-';
    return `${(value * 100).toFixed(2)}%`;
  };

  // Function to convert table data to CSV format
  const convertToCSV = () => {
    const csvContent = Papa.unparse(responseTableData);
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'table_data.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="file-drop-container">
      <div className="file-drop" {...getRootProps()}>
        <input {...getInputProps()} />
        {isFileUploaded ? (
          <p>CSV file successfully uploaded: {file.name}</p>
        ) : (
          <p>Drag & drop a CSV file here, or click to select file</p>
        )}
      </div>
      <input
        id="api-key-input"
        className="api-key-input"
        type="text"
        placeholder="Enter API Key"
        value={apiKey}
        onChange={handleApiKeyChange}
      />
      <button className="bulk-scan-button" onClick={handleBulkScan}>Bulk Scan</button>
      
      {/* Display response data in a scrollable table */}
      {responseTableData.length > 0 && (
        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>Name</th>
                <th>Job ID</th>
                <th>Reviews Percentile</th>
                <th>Listings Inaccuracy</th>
              </tr>
            </thead>
            <tbody>
              {responseTableData.map((item, index) => (
                <tr key={index}>
                  <td>{item.name}</td>
                  <td>{item.jobId}</td>
                  <td>{item.reviewsPercentile}</td>
                  <td>{item.listingsInaccuracy}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Progress indicator */}
      {progressPercentage > 0 && (
        <div className="progress-container">
          <div className="progress-bar" style={{ width: `${progressPercentage}%` }}></div>
        </div>
      )}

        <button className="download-csv-button" onClick={convertToCSV}>Download CSV</button>
    </div>
  );
};

export default FileDrop;
