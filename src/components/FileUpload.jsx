import React, { useRef, useState, useEffect } from 'react';
import './FileUpload.css';

function FileUpload({ onFileSelect, acceptedFileTypes, disabled, selectedFile }) {
  const [dragActive, setDragActive] = useState(false);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [fileName, setFileName] = useState('');
  const [fileType, setFileType] = useState('');
  const [showPreview, setShowPreview] = useState(false);
  const inputRef = useRef(null);
  
  // Reset preview when selectedFile becomes null (after message is sent)
  useEffect(() => {
    if (selectedFile === null) {
      setPreviewUrl(null);
      setFileName('');
      setFileType('');
      setShowPreview(false);
      // Also reset the input value
      if (inputRef.current) {
        inputRef.current.value = '';
      }
    }
  }, [selectedFile]);
  
  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (disabled) return;
    
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (disabled) return;
    
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFile(e.dataTransfer.files[0]);
    }
  };

  const handleChange = (e) => {
    e.preventDefault();
    
    if (disabled) return;
    
    if (e.target.files && e.target.files[0]) {
      handleFile(e.target.files[0]);
    }
  };

  const handleFile = (file) => {
    // Store file info
    setFileName(file.name);
    setFileType(file.type);
    
    // Generate preview for images
    if (file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = (e) => {
        setPreviewUrl(e.target.result);
        setShowPreview(true);
      };
      reader.readAsDataURL(file);
    } else if (file.type === 'application/pdf') {
      // For PDFs, we could display a PDF icon, but we'll just set the name
      setPreviewUrl(null);
      setShowPreview(true);
    }
    
    // Notify parent component
    onFileSelect(file);
  };

  const handleButtonClick = () => {
    if (disabled) return;
    inputRef.current.click();
  };

  const handleRemoveFile = (e) => {
    e.stopPropagation();
    setPreviewUrl(null);
    setFileName('');
    setFileType('');
    setShowPreview(false);
    onFileSelect(null);
  };

  return (
    <div 
      className={`file-upload-container ${dragActive ? 'drag-active' : ''} ${disabled ? 'disabled' : ''}`}
      onDragEnter={handleDrag}
      onDragLeave={handleDrag}
      onDragOver={handleDrag}
      onDrop={handleDrop}
      onClick={handleButtonClick}
    >
      <input
        ref={inputRef}
        type="file"
        accept={acceptedFileTypes}
        onChange={handleChange}
        disabled={disabled}
        style={{ display: 'none' }}
      />
      
      {showPreview ? (
        <div className="file-preview">
          {previewUrl ? (
            <div className="image-preview">
              <img src={previewUrl} alt={fileName} />
            </div>
          ) : (
            <div className="pdf-preview">
              <svg viewBox="0 0 24 24" fill="currentColor" width="3em" height="3em">
                <path d="M8 16h8v2H8zm0-4h8v2H8zm6-10H6c-1.1 0-2 .9-2 2v16c0 1.1.89 2 1.99 2H18c1.1 0 2-.9 2-2V8l-6-6zm4 18H6V4h7v5h5v11z" />
              </svg>
            </div>
          )}
          <div className="file-info">
            <span className="file-name">{fileName}</span>
            <button 
              className="remove-file-btn" 
              onClick={handleRemoveFile}
              title="Remove file"
            >
              ✕
            </button>
          </div>
        </div>
      ) : (
        <div className="upload-prompt">
          <svg viewBox="0 0 24 24" fill="currentColor" width="2em" height="2em">
            <path d="M19.35 10.04C18.67 6.59 15.64 4 12 4 9.11 4 6.6 5.64 5.35 8.04 2.34 8.36 0 10.91 0 14c0 3.31 2.69 6 6 6h13c2.76 0 5-2.24 5-5 0-2.64-2.05-4.78-4.65-4.96zM14 13v4h-4v-4H7l5-5 5 5h-3z" />
          </svg>
          <span>Upload image or PDF</span>
        </div>
      )}
    </div>
  );
}

export default FileUpload;
