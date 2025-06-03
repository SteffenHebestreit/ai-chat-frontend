import React from 'react';
import './FileAttachment.css';

const FileAttachment = ({ file, previewUrl }) => {
  const isImage = file.type.startsWith('image/');
  const isPdf = file.type === 'application/pdf';
  
  return (
    <div className="file-attachment">
      {isImage && previewUrl ? (
        <div className="image-attachment">
          <img src={previewUrl} alt={file.name} />
        </div>
      ) : isPdf ? (
        <div className="pdf-attachment">
          <svg viewBox="0 0 24 24" fill="currentColor" width="2em" height="2em">
            <path d="M8 16h8v2H8zm0-4h8v2H8zm6-10H6c-1.1 0-2 .9-2 2v16c0 1.1.89 2 1.99 2H18c1.1 0 2-.9 2-2V8l-6-6zm4 18H6V4h7v5h5v11z" />
          </svg>
          <span>{file.name}</span>
        </div>
      ) : (
        <div className="generic-attachment">
          <svg viewBox="0 0 24 24" fill="currentColor" width="2em" height="2em">
            <path d="M14 2H6c-1.1 0-2 .9-2 2v16c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V8l-6-6zm2 16H8v-2h8v2zm0-4H8v-2h8v2zm-3-5V3.5L18.5 9H13z" />
          </svg>
          <span>{file.name}</span>
        </div>
      )}
    </div>
  );
};

export default FileAttachment;
