import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getBackendUrl } from '../../config/apiConfig'; // CORRECTED PATH
import { fetchLlmCapabilities } from '../../services/chatService';
import './SettingsView.css';

function SettingsView() {
  const [backendUrl, setBackendUrl] = useState('');
  const [message, setMessage] = useState('');
  const [llmCapabilities, setLlmCapabilities] = useState([]);
  const [capabilityOverrides, setCapabilityOverrides] = useState({});
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  useEffect(() => {
    setBackendUrl(localStorage.getItem('backendUrl') || getBackendUrl());
    
    // Load LLM capabilities and any existing overrides
    loadLlmCapabilities();
    loadCapabilityOverrides();
  }, []);

  const loadLlmCapabilities = async () => {
    setLoading(true);
    try {
      const data = await fetchLlmCapabilities();
      if (data && Array.isArray(data)) {
        setLlmCapabilities(data);
      } else if (data && data.result && Array.isArray(data.result)) {
        setLlmCapabilities(data.result);
      }
    } catch (error) {
      console.error('Error fetching LLM capabilities:', error);
      setMessage('Failed to load model capabilities: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const loadCapabilityOverrides = () => {
    const savedOverrides = localStorage.getItem('capabilityOverrides');
    if (savedOverrides) {
      try {
        setCapabilityOverrides(JSON.parse(savedOverrides));
      } catch (error) {
        console.error('Error loading capability overrides:', error);
      }
    }
  };  const handleSave = () => {
    if (backendUrl.trim() === '') {
      setMessage('Backend URL cannot be empty.');
      return;
    }
    
    // Save backend URL
    localStorage.setItem('backendUrl', backendUrl.trim());
    
    // Save capability overrides
    localStorage.setItem('capabilityOverrides', JSON.stringify(capabilityOverrides));
    
    // Dispatch event to notify other parts of the app about capability changes
    window.dispatchEvent(new CustomEvent('capabilityOverrideChange'));
    
    setMessage('Settings saved successfully!');
  };
  const handleResetToDefault = () => {
    const defaultUrl = getBackendUrl(); 
    setBackendUrl(defaultUrl); 
    localStorage.setItem('backendUrl', defaultUrl);
    
    // Reset capability overrides
    setCapabilityOverrides({});
    localStorage.removeItem('capabilityOverrides');
    
    // Dispatch event to notify other parts of the app about capability changes
    window.dispatchEvent(new CustomEvent('capabilityOverrideChange'));
    
    setMessage('All settings reset to default.');
  };

  const handleCapabilityToggle = (modelId, capability, currentValue) => {
    setCapabilityOverrides(prev => ({
      ...prev,
      [modelId]: {
        ...prev[modelId],
        [capability]: !currentValue
      }
    }));
  };
  const getEffectiveCapability = (model, capability) => {
    // Check if there's an override for this model and capability
    const override = capabilityOverrides[model.id]?.[capability];
    if (override !== undefined) {
      return override;
    }
    
    // Fall back to the original model capability
    switch (capability) {
      case 'disabled':
        return false; // Models are enabled by default
      case 'text':
        return model.supportsText || model.capabilities?.text || true;
      case 'image':
        return model.supportsImage || model.capabilities?.image || false;
      case 'pdf':
        return model.supportsPdf || model.capabilities?.pdf || false;
      case 'tools':
        return model.supportsTools || model.capabilities?.tools || false;
      default:
        return false;
    }
  };

  const hasOverrides = (modelId) => {
    return capabilityOverrides[modelId] && Object.keys(capabilityOverrides[modelId]).length > 0;
  };

  const resetModelOverrides = (modelId) => {
    setCapabilityOverrides(prev => {
      const newOverrides = { ...prev };
      delete newOverrides[modelId];
      return newOverrides;
    });
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
      </div>      <div className="settings-content">
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

        {/* Model Capability Overrides Section */}
        <div className="setting-section">
          <h2>Model Capability Overrides</h2>          <div className="warning-box">
            <div className="warning-icon">⚠️</div>
            <div className="warning-content">
              <strong>Warning:</strong> Overriding model capabilities can lead to unexpected errors and failures. 
              Only enable capabilities that you know the model actually supports. Disabling capabilities 
              will prevent certain features from being available for that model.
              <br/><br/>
              <strong>Note:</strong> Disabled models will be completely hidden from the model dropdown in the chat interface.
            </div>
          </div>
          
          {!loading && llmCapabilities.length > 0 && (
            <div className="models-summary">
              <span>
                Total Models: <strong>{llmCapabilities.length}</strong> | 
                Disabled: <strong>{llmCapabilities.filter(model => getEffectiveCapability(model, 'disabled')).length}</strong> | 
                Custom Settings: <strong>{Object.keys(capabilityOverrides).length}</strong>
              </span>
            </div>
          )}
          
          {loading ? (
            <div className="loading-message">Loading models...</div>
          ) : llmCapabilities.length === 0 ? (
            <div className="no-models-message">
              No models available. Check your backend connection.
            </div>
          ) : (
            <div className="models-list">
              {llmCapabilities.map((model) => (
                <div key={model.id} className={`model-card ${getEffectiveCapability(model, 'disabled') ? 'disabled' : ''}`}>                  <div className="model-header">
                    <h3>{model.name || model.id}</h3>
                    <div className="model-status">
                      {getEffectiveCapability(model, 'disabled') && (
                        <div className="disabled-badge">
                          DISABLED
                        </div>
                      )}
                      {hasOverrides(model.id) && (
                        <div className="override-badge">
                          CUSTOM
                          <button 
                            className="reset-model-button"
                            onClick={() => resetModelOverrides(model.id)}
                            title="Reset to default capabilities"
                          >
                            ↺
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                  
                  <div className="capabilities-grid">
                    <div className="capability-item special">
                      <label>
                        <input
                          type="checkbox"
                          checked={getEffectiveCapability(model, 'disabled')}
                          onChange={() => handleCapabilityToggle(
                            model.id, 
                            'disabled', 
                            getEffectiveCapability(model, 'disabled')
                          )}
                        />
                        <span className="capability-label">
                          <span className="capability-icon disabled">🚫</span>
                          Disabled (Hide from dropdown)
                        </span>
                      </label>
                    </div>
                    
                    <div className="capability-item">
                      <label>
                        <input
                          type="checkbox"
                          checked={getEffectiveCapability(model, 'text')}
                          onChange={() => handleCapabilityToggle(
                            model.id, 
                            'text', 
                            getEffectiveCapability(model, 'text')
                          )}
                          disabled={getEffectiveCapability(model, 'disabled')}
                        />
                        <span className="capability-label">
                          <span className="capability-icon text">T</span>
                          Text Processing
                        </span>
                      </label>
                    </div>
                      <div className="capability-item">
                      <label>
                        <input
                          type="checkbox"
                          checked={getEffectiveCapability(model, 'image')}
                          onChange={() => handleCapabilityToggle(
                            model.id, 
                            'image', 
                            getEffectiveCapability(model, 'image')
                          )}
                          disabled={getEffectiveCapability(model, 'disabled')}
                        />
                        <span className="capability-label">
                          <span className="capability-icon image">I</span>
                          Vision/Images
                        </span>
                      </label>
                    </div>
                    
                    <div className="capability-item">
                      <label>
                        <input
                          type="checkbox"
                          checked={getEffectiveCapability(model, 'pdf')}
                          onChange={() => handleCapabilityToggle(
                            model.id, 
                            'pdf', 
                            getEffectiveCapability(model, 'pdf')
                          )}
                          disabled={getEffectiveCapability(model, 'disabled')}
                        />
                        <span className="capability-label">
                          <span className="capability-icon pdf">P</span>
                          PDF Processing
                        </span>
                      </label>
                    </div>
                    
                    <div className="capability-item">
                      <label>
                        <input
                          type="checkbox"
                          checked={getEffectiveCapability(model, 'tools')}
                          onChange={() => handleCapabilityToggle(
                            model.id, 
                            'tools', 
                            getEffectiveCapability(model, 'tools')
                          )}
                          disabled={getEffectiveCapability(model, 'disabled')}
                        />
                        <span className="capability-label">
                          <span className="capability-icon tools">🔧</span>
                          Tool Use
                        </span>
                      </label>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="setting-actions">
          <button onClick={handleSave} className="settings-button-primary">Save Settings</button>
          <button onClick={handleResetToDefault} className="settings-button-secondary">Reset All to Default</button>
        </div>
        {message && <p className="settings-message">{message}</p>}
      </div>
    </div>
  );
}

export default SettingsView;
