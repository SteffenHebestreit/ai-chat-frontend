import React, { useState, useEffect, useRef } from 'react'; // Added useEffect, useRef
import ContentRenderer from './ContentRenderer';
import FileAttachment from './FileAttachment';
import { normalizeMarkdownContent } from '../services/chatService';
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


function MessageCard({ role, content, rawContent, timestamp, isFromHistory, isTyping, fileAttachment, onOrbStateChange }) {
  const [isExpanded, setIsExpanded] = useState(
    !(isFromHistory && content && content.length >= 250)
  );
  const [showScrollToTop, setShowScrollToTop] = useState(false);
  const [toolCallStatus, setToolCallStatus] = useState(''); // New state for tool call status
  const [toolCallStatuses, setToolCallStatuses] = useState([]); // New state for tool call statuses array
  const [showToolDropdown, setShowToolDropdown] = useState(false); // New state for dropdown visibility
  const [processedContent, setProcessedContent] = useState(content); // New state for processed content
  const [contentToRender, setContentToRender] = useState(content); // Content to pass to ContentRenderer

  const messageCardRef = useRef(null);
  const messageContentRef = useRef(null);
  // Effect to process content for tool calls - needs to run for both regular and history messages
  useEffect(() => {
    console.log('MessageCard tool call processing - role:', role, 'contentToRender type:', typeof contentToRender, 'isFromHistory:', isFromHistory);
    console.log('MessageCard tool call processing - contentToRender preview:', typeof contentToRender === 'string' ? contentToRender.substring(0, 200) + '...' : contentToRender);
    
    if (role === 'ai') {
      // For AI messages, check if it's a string that might contain tool call status
      if (typeof contentToRender === 'string') {// Function to extract tool calls - handles both complete and incomplete tool calls
        const extractToolCalls = (text) => {
          const toolCallMatches = [];
          
          // Pattern 1: Complete tool calls with proper closing brackets, including surrounding line breaks
          const completeToolCallPattern = /\n*\[(?:Tool|tool)[^\]]*?\]\n*/gis;
          let match;
          while ((match = completeToolCallPattern.exec(text)) !== null) {
            toolCallMatches.push(match[0]);
          }
          
          // Pattern 2: Incomplete or malformed tool calls that start with [Tool but don't have proper closing
          // This handles cases where tool calls are truncated or contain complex nested content
          const incompleteToolCallPattern = /\n*\[(?:Tool|tool)[^[]*?(?=\n\n[A-Z]|\n[A-Z][a-z]|$)\n*/gis;
          while ((match = incompleteToolCallPattern.exec(text)) !== null) {
            // Only add if it's not already captured by the complete pattern
            const potentialMatch = match[0];
            if (!toolCallMatches.some(existing => existing.includes(potentialMatch) || potentialMatch.includes(existing))) {
              toolCallMatches.push(potentialMatch);
            }
          }
          
          // Pattern 3: Other known tool call patterns, including surrounding line breaks
          const otherPatterns = [
            /\n*\[Calling tool[^\]]*?\]\n*/gis,
            /\n*\[Executing tools?[^\]]*?\]\n*/gis,
            /\n*\[Tool calls requested by LLM[^\]]*?\]\n*/gis
          ];
          
          for (const pattern of otherPatterns) {
            while ((match = pattern.exec(text)) !== null) {
              if (!toolCallMatches.includes(match[0])) {
                toolCallMatches.push(match[0]);
              }
            }
          }
          
          // Sort matches by their position in the original text
          toolCallMatches.sort((a, b) => text.indexOf(a) - text.indexOf(b));
          
          return toolCallMatches;
        };
          // Extract tool calls using the improved function
        const matches = extractToolCalls(contentToRender);
        console.log('MessageCard tool call extraction - found matches:', matches.length, matches);
          if (matches && matches.length > 0) {
          // Store all tool call statuses for dropdown in chronological order with deduplication
          const statuses = matches.map(match => {
            // Remove brackets and clean up line breaks for display
            let cleanMatch = match.replace(/^\n*|\n*$/g, ''); // Remove leading/trailing line breaks
            if (cleanMatch.startsWith('[') && cleanMatch.endsWith(']')) {
              cleanMatch = cleanMatch.slice(1, -1); // Remove brackets
            }
            return cleanMatch.trim();
          });
          
          // Deduplicate consecutive identical tool calls
          const deduplicatedStatuses = [];
          for (let i = 0; i < statuses.length; i++) {
            // Only add if it's different from the previous status
            if (i === 0 || statuses[i] !== statuses[i - 1]) {
              deduplicatedStatuses.push(statuses[i]);
            }
          }
          
          setToolCallStatuses(deduplicatedStatuses);
            // Get the last/most recent tool status for main display
          const lastMatch = matches[matches.length - 1];
          let cleanLastMatch = lastMatch.replace(/^\n*|\n*$/g, ''); // Remove leading/trailing line breaks
          if (cleanLastMatch.startsWith('[') && cleanLastMatch.endsWith(']')) {
            cleanLastMatch = cleanLastMatch.slice(1, -1); // Remove brackets
          }
          setToolCallStatus(cleanLastMatch.trim());// Remove tool calls from the main content to avoid duplication
          let contentWithoutToolCalls = contentToRender;
          matches.forEach(match => {
            contentWithoutToolCalls = contentWithoutToolCalls.replace(match, '');
          });
            // Clean up excessive line breaks and whitespace
          contentWithoutToolCalls = contentWithoutToolCalls
            // Replace multiple consecutive line breaks (3 or more) with at most 2
            .replace(/\n{3,}/g, '\n\n')
            // Remove line breaks that are only whitespace
            .replace(/^\s*\n+/g, '')
            .replace(/\n\s*$/g, '')
            // Remove any trailing/leading whitespace
            .trim();
            
          setProcessedContent(contentWithoutToolCalls);
        } else {
          setToolCallStatuses([]);
          setToolCallStatus('');
          setProcessedContent(contentToRender);
        }
      } else {
        // For non-string AI content (like multimodal content), pass through without tool status processing
        setToolCallStatuses([]);
        setToolCallStatus('');
        setProcessedContent(contentToRender);
      }
    } else {
      // For non-AI messages, pass content through without any processing
      setToolCallStatuses([]);
      setToolCallStatus('');
      setProcessedContent(contentToRender);
    }
  }, [contentToRender, role]);

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
  }, [isExpanded, processedContent]); // Re-check when content changes or expansion state changes  // Effect to normalize markdown content from history
  useEffect(() => {
    // For history messages, always prefer rawContent if available and substantial
    if (rawContent && rawContent.length > 0) {
      // Use rawContent which should contain the complete response with thinking blocks and tool calls
      // Convert escaped newlines to actual newlines for proper processing
      const processedRawContent = rawContent.replace(/\\n/g, '\n');
      setContentToRender(processedRawContent);
    } else if (isFromHistory && typeof content === 'string') {
      // Fallback to content for history messages if no rawContent
      // Also process escaped newlines in content
      const processedContent = content.replace(/\\n/g, '\n');
      setContentToRender(processedContent);
    } else if (content) {
      // For new messages without rawContent, use content as-is (should already have proper newlines)
      setContentToRender(content);
    } else {
      setContentToRender('');
    }
  }, [content, rawContent, isFromHistory]);

  // Function to detect error content
  const detectErrorContent = (content) => {
    if (typeof content !== 'string') return false;
    
    // Try to parse as JSON to detect error objects
    try {
      const parsed = JSON.parse(content);
      if (parsed && typeof parsed === 'object' && parsed.error) {
        return true;
      }
    } catch (e) {
      // Not valid JSON, check for other error patterns
    }
    
    // Check for common error patterns in text
    const errorPatterns = [
      /connection\s+timed?\s+out/i,
      /error\s+processing/i,
      /getsockopt/i,
      /connection\s+refused/i,
      /network\s+error/i,
      /timeout/i,
      /failed\s+to\s+connect/i,
      /server\s+error/i,
      /internal\s+server\s+error/i
    ];
    
    return errorPatterns.some(pattern => pattern.test(content));
  };
  // Effect to detect error content and trigger orb state change
  useEffect(() => {
    if (onOrbStateChange && detectErrorContent(processedContent)) {
      onOrbStateChange('criticalError');
    }
  }, [processedContent, onOrbStateChange]);
  // Effect to set orb to activity state when tool calls are active
  useEffect(() => {
    if (onOrbStateChange && toolCallStatus && role === 'ai') {
      // Check if the tool call indicates active processing (not completed)
      const activeToolPatterns = [
        /calling tool/i,
        /executing/i,
        /tool execution/i,
        /processing/i,
        /tool thinking/i,
        /using tool/i,
        /task started/i,
        /step \d+/i
      ];
      
      const completedToolPatterns = [
        /tool completed successfully/i,
        /tool result/i,
        /task complete/i,
        /continuing conversation/i
      ];
      
      const isActiveToolCall = activeToolPatterns.some(pattern => pattern.test(toolCallStatus));
      const isCompletedToolCall = completedToolPatterns.some(pattern => pattern.test(toolCallStatus));
      
      if (isActiveToolCall && !isCompletedToolCall) {
        onOrbStateChange('activity');
      } else if (isCompletedToolCall) {
        // Tool call has completed, transition to success state
        onOrbStateChange('output');
      }
    }
  }, [toolCallStatus, onOrbStateChange, role]);

  const handleScrollToMessageTop = () => {
    messageCardRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const iconColorClass = role === 'user' ? 'user-icon' : (role === 'system' ? 'error-icon' : 'ai-icon');

  return (
    <div ref={messageCardRef} className={`message ${role === 'user' ? 'user' : (role === 'system' ? 'system-error' : 'ai')}`}>
      <div className="message-icon-wrapper">
        {role === 'user' && <UserRoleIcon />}
        {role === 'ai' && <AiRoleIcon />}      {role === 'system' && <ErrorRoleIcon />}
        
        {processedContent && processedContent.length >= 250 && (
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
          )}          {toolCallStatus && (
            <div className="tool-call-status-container">
              <div 
                className="tool-call-status"
                onClick={() => toolCallStatuses.length > 1 && setShowToolDropdown(!showToolDropdown)}
                style={{ cursor: toolCallStatuses.length > 1 ? 'pointer' : 'default' }}
              >
                Tool Progress: {toolCallStatus}
                {toolCallStatuses.length > 1 && (
                  <span className="dropdown-arrow">{showToolDropdown ? ' ▼' : ' ▶'}</span>
                )}
              </div>
              {showToolDropdown && toolCallStatuses.length > 1 && (
                <div className="tool-dropdown">
                  <div className="tool-dropdown-header">Chronological Tool Execution:</div>
                  {toolCallStatuses.map((status, index) => (
                    <div key={index} className="tool-dropdown-item">
                      <span className="tool-step">Step {index + 1}:</span> {status}
                    </div>
                  ))}
                </div>              )}
            </div>
          )}          <ContentRenderer 
            content={processedContent} // Pass processed content (tool calls removed, thinking preserved)
            rawContent={rawContent}
            isTyping={isTyping && !toolCallStatus}
          />
        </div>
      )}
      {!isExpanded && processedContent && (
        <div className="message-content-preview">
          {`${processedContent.substring(0, 50)}${processedContent.length > 50 ? '...' : ''}`}
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
