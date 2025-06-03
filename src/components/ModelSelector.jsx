import React, { useState, useEffect } from 'react';
import './ModelSelector.css';

function ModelSelector({ 
  llmCapabilities = [], 
  selectedModelId, 
  onModelChange, 
  disabled = false 
}) {
  const [defaultModel, setDefaultModel] = useState(null);
    useEffect(() => {
    // Set default model if none selected and capabilities are available
    if (!selectedModelId && llmCapabilities.length > 0) {
      // Try to find a default model or use the first one
      const defaultLlm = llmCapabilities.find(llm => llm.isDefault) || llmCapabilities[0];
      if (defaultLlm) {
        setDefaultModel(defaultLlm);
        onModelChange(defaultLlm.id, defaultLlm);
      }
    }
  }, [llmCapabilities, selectedModelId, onModelChange]);

  const handleModelChange = (event) => {
    const modelId = event.target.value;
    const selectedLlm = llmCapabilities.find(llm => llm.id === modelId);
    onModelChange(modelId, selectedLlm);
  };

  const getCapabilityIcons = (llm) => {
    const icons = [];
    
    // Check different property structures that might come from the backend
    const supportsText = llm.supportsText || llm.capabilities?.text || true; // Text is usually default
    const supportsImage = llm.supportsImage || llm.capabilities?.image || false;
    const supportsPdf = llm.supportsPdf || llm.capabilities?.pdf || false;
      if (supportsText) {
      icons.push(
        <span key="text" className="capability-icon text" title="Supports text">
          T
        </span>
      );
    }
    
    if (supportsImage) {
      icons.push(
        <span key="image" className="capability-icon image" title="Supports images">
          I
        </span>
      );
    }
    
    if (supportsPdf) {
      icons.push(
        <span key="pdf" className="capability-icon pdf" title="Supports PDF">
          P
        </span>
      );
    }
    
    return icons;
  };

  if (!llmCapabilities || llmCapabilities.length === 0) {
    return (
      <div className="model-selector">
        <select disabled className="model-select">
          <option>Loading models...</option>
        </select>
      </div>
    );
  }

  return (
    <div className="model-selector">
      <label htmlFor="model-select" className="model-label">
        Model:
      </label>
      <select
        id="model-select"
        className="model-select"
        value={selectedModelId || defaultModel?.id || ''}
        onChange={handleModelChange}
        disabled={disabled}
      >
        {llmCapabilities.map((llm) => (
          <option key={llm.id} value={llm.id}>
            {llm.name || llm.id}
          </option>
        ))}
      </select>
      
      {/* Show capabilities of selected model */}
      {(selectedModelId || defaultModel) && (
        <div className="model-capabilities">
          {getCapabilityIcons(
            llmCapabilities.find(llm => llm.id === (selectedModelId || defaultModel?.id)) || defaultModel
          )}
        </div>
      )}
    </div>
  );
}

export default ModelSelector;
