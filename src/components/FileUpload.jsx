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
    // Helper function to validate file type against accepted types
  const isFileTypeAccepted = (file) => {
    if (!acceptedFileTypes || acceptedFileTypes === "") return false;
    
    const acceptedTypes = acceptedFileTypes.split(',').map(type => type.trim());
    
    return acceptedTypes.some(acceptedType => {
      if (acceptedType === 'image/*') {
        return file.type.startsWith('image/');
      } else if (acceptedType === '.pdf') {
        return file.type === 'application/pdf';
      } else if (acceptedType === '.txt') {
        return file.type === 'text/plain' || file.name.toLowerCase().endsWith('.txt');
      } else if (acceptedType === '.md') {
        return file.name.toLowerCase().endsWith('.md');
      } else if (acceptedType === '.csv') {
        return file.type === 'text/csv' || file.name.toLowerCase().endsWith('.csv');
      } else if (acceptedType === '.json') {
        return file.type === 'application/json' || file.name.toLowerCase().endsWith('.json');
      } else if (acceptedType === '.xml') {
        return file.type === 'text/xml' || file.type === 'application/xml' || file.name.toLowerCase().endsWith('.xml');
      } else if (acceptedType === '.log') {
        return file.name.toLowerCase().endsWith('.log');
      } else if (acceptedType === '.code') {
        // Support common code file extensions
        const codeExtensions = ['.js', '.jsx', '.ts', '.tsx', '.py', '.java', '.cpp', '.c', '.cs', '.php', '.rb', '.go', '.rs', '.swift'];
        return codeExtensions.some(ext => file.name.toLowerCase().endsWith(ext));
      } else if (acceptedType.startsWith('.')) {
        // Handle other extensions
        return file.name.toLowerCase().endsWith(acceptedType.toLowerCase());
      } else {
        // Handle specific MIME types
        return file.type === acceptedType;
      }
    });
  };  // Helper function to generate detailed description for error messages
  const getDetailedFileTypesDescription = () => {
    if (!acceptedFileTypes || acceptedFileTypes === "") return "no files are accepted";
    
    const acceptedTypes = acceptedFileTypes.split(',').map(type => type.trim());
    const descriptions = [];
    
    if (acceptedTypes.includes('.txt') || acceptedTypes.includes('.md')) {
      descriptions.push('text files (.txt, .md)');
    }
    if (acceptedTypes.includes('image/*')) {
      descriptions.push('images (JPEG, PNG, GIF, etc.)');
    }
    if (acceptedTypes.includes('.pdf')) {
      descriptions.push('PDF files');
    }
    
    if (descriptions.length === 0) {
      return "files of this type";
    }
    
    return descriptions.join(' or ');
  };
    // Helper function to generate user-friendly description of accepted file types
  const getAcceptedFileTypesDescription = () => {
    if (!acceptedFileTypes || acceptedFileTypes === "") return "no files";
    
    const acceptedTypes = acceptedFileTypes.split(',').map(type => type.trim());
    const descriptions = [];
    
    if (acceptedTypes.includes('.txt') || acceptedTypes.includes('.md')) {
      descriptions.push('text');
    }
    if (acceptedTypes.includes('image/*')) {
      descriptions.push('images');
    }
    if (acceptedTypes.includes('.pdf')) {
      descriptions.push('PDFs');
    }
    
    
    if (descriptions.length === 0) {
      return "files";
    }
    
    if (descriptions.length === 1) {
      return descriptions[0];
    }
    
    return descriptions.join(' or ');
  };
  
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
  };  const handleFile = (file) => {
    // Check if file type is in accepted types, but allow all files with warnings
    const isAccepted = isFileTypeAccepted(file);
    
    if (!isAccepted) {
      const proceed = confirm(`⚠️ File Type Notice: "${file.name}"\n\nThis file type (${file.type || 'unknown'}) may not be fully supported by all AI models, but you can still try uploading it.\n\n✅ Continue anyway?\n❌ Cancel and select a different file?`);
      if (!proceed) {
        // Reset the input if user cancels
        if (inputRef.current) {
          inputRef.current.value = '';
        }
        return;
      }
    }
    
    // Show warning for text/markdown files but allow them to proceed
    if (file.type === 'text/plain' || file.name.endsWith('.txt') || file.name.endsWith('.md')) {
      const proceed = confirm(`📄 Text File Detected: "${file.name}"\n\nThis will be sent as a file attachment to the AI model. The AI will read and analyze the file contents.\n\n✅ Continue with file attachment?\n❌ Cancel to paste text directly instead?`);
      if (!proceed) {
        // Reset the input if user cancels
        if (inputRef.current) {
          inputRef.current.value = '';
        }
        return;
      }
    }
    
    // Store file info
    setFileName(file.name);
    setFileType(file.type);
    
    // Generate preview for different file types
    if (file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = (e) => {
        setPreviewUrl(e.target.result);
        setShowPreview(true);
      };
      reader.readAsDataURL(file);
    } else if (file.type === 'application/pdf') {
      // For PDFs, just show the file name
      setPreviewUrl(null);
      setShowPreview(true);    } else if (file.type === 'text/plain' || file.name.endsWith('.txt') || file.name.endsWith('.md')) {
      // For text files, just show the file name
      setPreviewUrl(null);
      setShowPreview(true);
    } else {
      // For any other file type, show generic file icon
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
            <div className="file-icon">
              {(fileType === 'text/plain' || fileName.endsWith('.txt') || fileName.endsWith('.md')) ? (
                <svg viewBox="0 0 24 24" fill="currentColor" width="3em" height="3em">
                  <path d="M14 2H6c-1.1 0-2 .9-2 2v16c0 1.1.89 2 1.99 2H18c1.1 0 2-.9 2-2V8l-6-6zm4 18H6V4h7v5h5v11zm-5.5-7L11 14.5 9.5 13 8 14.5 9.5 16 11 14.5 12.5 16z"/>
                </svg>
              ) : (
                <svg viewBox="0 0 24 24" fill="currentColor" width="3em" height="3em">
                  <path d="M8 16h8v2H8zm0-4h8v2H8zm6-10H6c-1.1 0-2 .9-2 2v16c0 1.1.89 2 1.99 2H18c1.1 0 2-.9 2-2V8l-6-6zm4 18H6V4h7v5h5v11z" />
                </svg>
              )}
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
      ) : (        <div className="upload-prompt">
          <svg viewBox="0 0 24 24" fill="currentColor" width="2em" height="2em">
            <path d="M19.35 10.04C18.67 6.59 15.64 4 12 4 9.11 4 6.6 5.64 5.35 8.04 2.34 8.36 0 10.91 0 14c0 3.31 2.69 6 6 6h13c2.76 0 5-2.24 5-5 0-2.64-2.05-4.78-4.65-4.96zM14 13v4h-4v-4H7l5-5 5 5h-3z" />
          </svg>
          <span>Upload {getAcceptedFileTypesDescription()}</span>
        </div>
      )}
    </div>
  );
}

export default FileUpload;
