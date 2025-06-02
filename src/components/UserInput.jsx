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
  llmCapabilities = []
}) {
  const [showCapabilityWarning, setShowCapabilityWarning] = useState(false);
  const [capabilityWarningMessage, setCapabilityWarningMessage] = useState('');
  const navigate = useNavigate();
  const [isFileUploadVisible, setIsFileUploadVisible] = useState(false);
  // Check if current file type is supported by available LLMs
  useEffect(() => {
    if (selectedFile && llmCapabilities.length > 0) {
      const fileType = selectedFile.type.startsWith('image/') ? 'image' : 
                      (selectedFile.type === 'application/pdf' ? 'pdf' : 'unknown');
      
      // Check if any LLM supports this file type
      const supportedLlms = llmCapabilities.filter(llm => {
        // Handle different property structures that might come from the backend
        if (fileType === 'image') {
          return llm.supportsImage || llm.capabilities?.image;
        }
        if (fileType === 'pdf') {
          return llm.supportsPdf || llm.capabilities?.pdf;
        }
        return false;
      });
      
      if (supportedLlms.length === 0) {
        setShowCapabilityWarning(true);
        setCapabilityWarningMessage(`Warning: No available LLM supports ${fileType === 'image' ? 'images' : 'PDF files'}.`);
      } else if (fileType === 'unknown') {
        setShowCapabilityWarning(true);
        setCapabilityWarningMessage('Warning: Unsupported file type. Please use images (JPEG, PNG) or PDF files.');
      } else {
        setShowCapabilityWarning(false);
        setCapabilityWarningMessage('');
      }
    } else {
      setShowCapabilityWarning(false);
      setCapabilityWarningMessage('');
    }
  }, [selectedFile, llmCapabilities]);

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
      )}
      
      {showFileUpload && (
        <button 
          className={`attachment-button ${isFileUploadVisible || selectedFile ? 'active' : ''}`} 
          onClick={toggleFileUpload}
          title="Attach image or PDF"
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
      </button>
      
      {showFileUpload && isFileUploadVisible && (        <div className="file-upload-wrapper">
          <FileUpload
            onFileSelect={handleFileSelect}
            acceptedFileTypes="image/*,.pdf"
            disabled={isLoading}
            selectedFile={selectedFile}
          />
        </div>
      )}
    </div>
  );
}

export default UserInput; // ForwardRef can be added if useImperativeHandle is used
