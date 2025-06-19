import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import FileUpload from './FileUpload';
import './UserInput.css';

function UserInput({ 
  inputText,
  onInputChange,
  onSendMessage,
  isLoading,
  onKeyDown,
  inputRef,
  onFileSelect,
  selectedFile,
  showFileUpload = true,
  llmCapabilities = [],
  selectedModel = null
}) {  const [showCapabilityWarning, setShowCapabilityWarning] = useState(false);
  const [capabilityWarningMessage, setCapabilityWarningMessage] = useState('');
  const navigate = useNavigate();
  const [isFileUploadVisible, setIsFileUploadVisible] = useState(false);
    // Check if the selected model supports file uploads (text files are always supported)
  const selectedModelSupportsFiles = selectedModel ? true : false;
   // Generate tooltip text based on selected model capabilities
  const getFileUploadTooltip = () => {
    if (!selectedModel) return "Attach text, image, or PDF file";
    
    const supportsImage = selectedModel.supportsImage || selectedModel.capabilities?.image;
    const supportsPdf = selectedModel.supportsPdf || selectedModel.capabilities?.pdf;
    
    // Always include text files since all models support text
    let tooltip = "Attach text file";
    
    if (supportsImage && supportsPdf) {
      tooltip = "Attach text, image, or PDF file";
    } else if (supportsImage) {
      tooltip = "Attach text or image file";
    } else if (supportsPdf) {
      tooltip = "Attach text or PDF file";
    }
    
    return tooltip;
  };  // Generate accepted file types based on selected model capabilities
  const getAcceptedFileTypes = () => {
    // Allow common file types regardless of model capabilities
    // The FileUpload component will show warnings for unsupported types
    return ".txt,.md,.csv,.json,.xml,.log,.js,.jsx,.ts,.tsx,.py,.java,.cpp,.c,.cs,.php,.rb,.go,.rs,.swift,image/*,.pdf";
  };
  
  // Should show file upload button only if the selected model supports files
  const shouldShowFileUpload = showFileUpload && selectedModelSupportsFiles;// Check if current file type is supported by the selected model
  useEffect(() => {
    if (selectedFile && selectedModel) {
      const fileType = selectedFile.type.startsWith('image/') ? 'image' : 
                      (selectedFile.type === 'application/pdf' ? 'pdf' : 
                       (selectedFile.type === 'text/plain' || selectedFile.name.endsWith('.txt') || selectedFile.name.endsWith('.md')) ? 'text' : 'unknown');
      
      // Check if the selected model supports this file type
      let isSupported = false;
      if (fileType === 'text') {
        isSupported = true; // All models support text files
      } else if (fileType === 'image') {
        isSupported = selectedModel.supportsImage || selectedModel.capabilities?.image;
      } else if (fileType === 'pdf') {
        isSupported = selectedModel.supportsPdf || selectedModel.capabilities?.pdf;
      }
      
      if (!isSupported && fileType !== 'unknown') {
        setShowCapabilityWarning(true);
        setCapabilityWarningMessage(`Warning: The selected model "${selectedModel.name || selectedModel.id}" does not support ${fileType === 'image' ? 'images' : 'PDF files'}.`);
      } else if (fileType === 'unknown') {
        setShowCapabilityWarning(true);
        setCapabilityWarningMessage('Warning: Unsupported file type. Please use text files (.txt, .md), images (JPEG, PNG), or PDF files.');
      } else {
        setShowCapabilityWarning(false);
        setCapabilityWarningMessage('');
      }
    } else {
      setShowCapabilityWarning(false);
      setCapabilityWarningMessage('');
    }
  }, [selectedFile, selectedModel]);

  const handleInputResize = (e) => {
    e.target.style.height = 'auto';
    e.target.style.height = `${e.target.scrollHeight}px`;
  };

  const handleButtonClick = (e) => {
    e.preventDefault(); // Prevent form submission if it's part of a form
    onSendMessage();
  };

  const toggleFileUpload = (e) => {
    e.preventDefault();
    setIsFileUploadVisible(!isFileUploadVisible);
  };

  const handleFileSelect = (file) => {
    onFileSelect(file);
    if (!file) {
      setIsFileUploadVisible(false);
    }
  };

  return (
    <div className="input-container">
      <textarea
        ref={inputRef}
        value={inputText}
        onChange={(e) => {
          onInputChange(e);
          handleInputResize(e);
        }}
        onKeyDown={onKeyDown}
        placeholder={selectedFile ? "Add a message about this file... (Shift+Enter to send)" : "Type your message... (Shift+Enter to send)"}
        rows="1"
        disabled={isLoading}
        title="Chat input area"
      />
      
      {showCapabilityWarning && (
        <div className="capability-warning">
          {capabilityWarningMessage}
        </div>
      )}      {!shouldShowFileUpload && selectedModel && (
        <div className="model-limitation-hint" title={`The selected model "${selectedModel.name || selectedModel.id}" only supports text conversations`}>
          <span className="text-only-indicator">T</span>
        </div>
      )}
      
      {shouldShowFileUpload && (
        <button 
          className={`attachment-button ${isFileUploadVisible || selectedFile ? 'active' : ''}`} 
          onClick={toggleFileUpload}
          title={getFileUploadTooltip()}
          disabled={isLoading}
        >
          <svg viewBox="0 0 24 24" fill="currentColor" width="1em" height="1em">
            <path d="M16.5 6v11.5c0 2.21-1.79 4-4 4s-4-1.79-4-4V5c0-1.38 1.12-2.5 2.5-2.5s2.5 1.12 2.5 2.5v10.5c0 .55-.45 1-1 1s-1-.45-1-1V6H10v9.5c0 1.38 1.12 2.5 2.5 2.5s2.5-1.12 2.5-2.5V5c0-2.21-1.79-4-4-4S7 2.79 7 5v12.5c0 3.04 2.46 5.5 5.5 5.5s5.5-2.46 5.5-5.5V6h-1.5z"/>
          </svg>
        </button>
      )}
      
      <button 
        title="Send message (Shift+Enter)"
        onClick={handleButtonClick} 
        disabled={!isLoading && !inputText.trim() && !selectedFile}
        className="send-button"
      >
        {!isLoading ? '➢' : '◼'}
      </button>
      
      <button 
        className="settings-button" 
        onClick={() => navigate('/settings')}
        title="Open settings"
      >
        ⚙
      </button>      {shouldShowFileUpload && isFileUploadVisible && (
        <div className="file-upload-wrapper">
          <FileUpload
            onFileSelect={handleFileSelect}
            acceptedFileTypes={getAcceptedFileTypes()}
            disabled={isLoading}
            selectedFile={selectedFile}
          />
        </div>
      )}
    </div>
  );
}

export default UserInput; // ForwardRef can be added if useImperativeHandle is used
