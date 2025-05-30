import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getBackendUrl } from '../../config/apiConfig'; // CORRECTED PATH
import './SettingsView.css';

function SettingsView() {
  const [backendUrl, setBackendUrl] = useState('');
  const [message, setMessage] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    setBackendUrl(localStorage.getItem('backendUrl') || getBackendUrl());
  }, []);

  const handleSave = () => {
    if (backendUrl.trim() === '') {
      setMessage('Backend URL cannot be empty.');
      return;
    }
    localStorage.setItem('backendUrl', backendUrl.trim());
    setMessage('Settings saved successfully!');
  };

  const handleResetToDefault = () => {
    const defaultUrl = getBackendUrl(); 
    setBackendUrl(defaultUrl); 
    localStorage.setItem('backendUrl', defaultUrl);
    setMessage('Backend URL reset to default.');
  };
  
  const handleBack = () => {
    navigate(-1);
  };

  return (
    <div className="settings-view">
      <div className="settings-header">
        <button onClick={handleBack} className="settings-back-button" title="Back to Chat">
          <svg viewBox="0 0 24 24" fill="currentColor" width="1.5em" height="1.5em">
            <path d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z"/>
          </svg>
        </button>
        <h1>Settings</h1>
      </div>
      <div className="settings-content">
        <div className="setting-item">
          <label htmlFor="backendUrl">Backend URL:</label>
          <input
            type="text"
            id="backendUrl"
            value={backendUrl}
            onChange={(e) => setBackendUrl(e.target.value)}
            placeholder="Enter backend URL"
          />
        </div>
        <div className="setting-actions">
          <button onClick={handleSave} className="settings-button-primary">Save Settings</button>
          <button onClick={handleResetToDefault} className="settings-button-secondary">Reset to Default</button>
        </div>
        {message && <p className="settings-message">{message}</p>}
      </div>
    </div>
  );
}

export default SettingsView;
