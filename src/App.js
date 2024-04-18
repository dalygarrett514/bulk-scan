import React from 'react';
import FileDrop from './FileDrop';
import './App.css';

const App = () => {
  return (
    <div className="app-container">
      <h1 className="app-title">Bulk Scan App</h1>
      <FileDrop apiKey="YOUR_API_KEY" />
    </div>
  );
};

export default App;
