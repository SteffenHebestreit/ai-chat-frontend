import React, { useState, useEffect, useRef } from 'react'; // Added useEffect, useRef
import ContentRenderer from './ContentRenderer';
import FileAttachment from './FileAttachment';
import './MessageCard.css';

// Icon Components
const UserRoleIcon = () => (
  <svg className="message-role-icon user-icon" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
    <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/>
  </svg>
);

const AiRoleIcon = () => (
  <svg className="message-role-icon ai-icon" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" fill="currentColor">
    {/* Central core */}
    <circle cx="12" cy="12" r="3"/>
    {/* Orbit paths */}
    <ellipse cx="12" cy="12" rx="10" ry="4" fill="none" stroke="currentColor" strokeWidth="1"/>
    <ellipse cx="12" cy="12" rx="10" ry="4" transform="rotate(60 12 12)" fill="none" stroke="currentColor" strokeWidth="1"/>
    <ellipse cx="12" cy="12" rx="10" ry="4" transform="rotate(-60 12 12)" fill="none" stroke="currentColor" strokeWidth="1"/>
    {/* Electrons - example positions, can be adjusted */}
    <circle cx="12" cy="2" r="1.5"/> 
    <circle cx="5.07" cy="7.5" r="1.5"/>
    <circle cx="18.93" cy="16.5" r="1.5"/>
  </svg>
);

const ErrorRoleIcon = () => (
  <svg className="message-role-icon error-icon" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
    <path d="M1 21h22L12 2 1 21zm12-3h-2v-2h2v2zm0-4h-2v-4h2v4z"/>
  </svg>
);

// New Collapse/Expand Icons
const CollapseIcon = ({ className }) => (
  <svg className={`message-role-icon ${className}`} viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
    <path d="M7.41 15.41L12 10.83l4.59 4.58L18 14l-6-6-6 6z"/>
  </svg>
);

const ExpandIcon = ({ className }) => (
  <svg className={`message-role-icon ${className}`} viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
    <path d="M7.41 8.59L12 13.17l4.59-4.58L18 10l-6 6-6-6z"/>
  </svg>
);


function MessageCard({ role, content, timestamp, isFromHistory, isTyping, fileAttachment }) {
  const [isExpanded, setIsExpanded] = useState(
    !(isFromHistory && content && content.length >= 250)
  );
  const [showScrollToTop, setShowScrollToTop] = useState(false);

  const messageCardRef = useRef(null);
  const messageContentRef = useRef(null);

  const toggleExpand = () => {
    setIsExpanded(!isExpanded);
  };

  useEffect(() => {
    if (isExpanded && messageContentRef.current) {
      // Use a timeout to allow the DOM to update and render fully after expansion
      const timer = setTimeout(() => {
        if (messageContentRef.current && messageContentRef.current.scrollHeight > window.innerHeight) {
          setShowScrollToTop(true);
        } else {
          setShowScrollToTop(false);
        }
      }, 100); // Small delay for rendering, adjust if needed
      return () => clearTimeout(timer);
    } else {
      setShowScrollToTop(false);
    }
  }, [isExpanded, content]); // Re-check when content changes or expansion state changes

  const handleScrollToMessageTop = () => {
    messageCardRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const iconColorClass = role === 'user' ? 'user-icon' : (role === 'system' ? 'error-icon' : 'ai-icon');

  return (
    <div ref={messageCardRef} className={`message ${role === 'user' ? 'user' : (role === 'system' ? 'system-error' : 'ai')}`}>
      <div className="message-icon-wrapper">
        {role === 'user' && <UserRoleIcon />}
        {role === 'ai' && <AiRoleIcon />}
        {role === 'system' && <ErrorRoleIcon />}
        
        {content && content.length >= 250 && (
          <button 
            onClick={toggleExpand} 
            className="message-collapse-button" 
            aria-expanded={isExpanded}
            title={isExpanded ? 'Collapse message' : 'Expand message'}
          >
            {isExpanded ? 
              <CollapseIcon className={iconColorClass} /> : 
              <ExpandIcon className={iconColorClass} />
            }
          </button>
        )}
      </div>      {isExpanded && (
        <div ref={messageContentRef} className="message-content">
          {fileAttachment && (
            <FileAttachment file={fileAttachment.file} previewUrl={fileAttachment.previewUrl} />
          )}
          <ContentRenderer content={content} isTyping={isTyping} />
        </div>
      )}
      {!isExpanded && content && (
        <div className="message-content-preview">
          {`${content.substring(0, 50)}${content.length > 50 ? '...' : ''}`}
        </div>
      )}
      {timestamp && (
        <div className="message-timestamp">
          {new Date(timestamp).toLocaleTimeString()}
        </div>
      )}
      {isExpanded && showScrollToTop && (
        <button 
          onClick={handleScrollToMessageTop} 
          className="message-scroll-top-button"
          title="Scroll to top of message"
        >
          <svg viewBox="0 0 24 24" fill="currentColor" width="1em" height="1em">
            <path d="M7.41 15.41L12 10.83l4.59 4.58L18 14l-6-6-6 6z"/>
          </svg>
        </button>
      )}
    </div>
  );
}

export default MessageCard;
