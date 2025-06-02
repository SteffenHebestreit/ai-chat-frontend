import React, { useState, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { atomDark } from 'react-syntax-highlighter/dist/esm/styles/prism';
import remarkGfm from 'remark-gfm';
import './ContentRenderer.css';

// Helper for syntax highlighting in ReactMarkdown
const syntaxHighlighterComponents = {
  code({node, inline, className, children, ...props}) {
    const match = /language-(\w+)/.exec(className || '');
    return !inline && match ? (
      <SyntaxHighlighter
        style={atomDark}
        language={match[1]}
        PreTag="div"
        {...props}
      >
        {String(children).replace(/\n$/, '')}
      </SyntaxHighlighter>
    ) : (
      <code className={className} {...props}>
        {children}
      </code>
    );
  }
};

// Thinking component to display thinking content with animation
const ThinkingSection = ({ content, isTyping }) => {
  // Default state is collapsed
  const [isExpanded, setIsExpanded] = useState(false);

  const toggleExpand = () => {
    setIsExpanded(!isExpanded);
  };

  return (
    <div className="thinking-section">
      <div 
        className="thinking-header" 
        onClick={toggleExpand}
        title={isExpanded ? "Collapse thinking" : "Expand thinking"}
      >        <div className="thinking-indicator">
          {isTyping && (
            <div className="question-marks">
              <span className="question q1">?</span>
              <span className="question q2">?</span>
              <span className="question q3">?</span>
            </div>
          )}
        </div>
        <span className="thinking-label">{isExpanded ? "Hide thinking" : "Show thinking"}</span>
        <svg 
          className="thinking-toggle-icon" 
          viewBox="0 0 24 24" 
          fill="currentColor" 
          width="1em" 
          height="1em"
        >
          <path d={isExpanded 
            ? "M7.41 15.41L12 10.83l4.59 4.58L18 14l-6-6-6 6z" 
            : "M7.41 8.59L12 13.17l4.59-4.58L18 10l-6 6-6-6z"} 
          />
        </svg>
      </div>
      
      {isExpanded && (
        <div className="thinking-content">
          <ReactMarkdown
            children={content}
            remarkPlugins={[remarkGfm]}
            components={syntaxHighlighterComponents}
          />
        </div>
      )}
    </div>
  );
};

// Image or PDF component for multimodal content
const MediaRenderer = ({ mediaContent }) => {
  const [isExpanded, setIsExpanded] = useState(false);

  // Function to toggle image expansion
  const toggleExpand = () => {
    setIsExpanded(!isExpanded);
  };

  // Determine media type
  const isImage = mediaContent.type === 'image_url';
  const isPdf = mediaContent.type === 'file_url' && 
                (mediaContent.file_url.url.includes('application/pdf') || 
                 mediaContent.file_url.url.endsWith('.pdf'));

  const mediaUrl = isImage ? mediaContent.image_url.url : 
                  (isPdf ? mediaContent.file_url.url : null);

  // If the content is not media we can render, return null
  if (!mediaUrl) return null;

  if (isImage) {
    // Render an image
    return (
      <div className={`media-container ${isExpanded ? 'expanded' : ''}`} onClick={toggleExpand}>
        <img
          src={mediaUrl}
          alt="Uploaded content"
          className="uploaded-image"
          title={isExpanded ? "Click to shrink" : "Click to expand"}
        />
      </div>
    );
  } else if (isPdf) {
    // For PDFs embedded as data URLs
    if (mediaUrl.startsWith('data:application/pdf')) {
      return (
        <div className="pdf-container">
          <div className="pdf-info">
            <svg viewBox="0 0 24 24" fill="currentColor" width="2em" height="2em">
              <path d="M20 2H8c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm-8.5 7.5c0 .83-.67 1.5-1.5 1.5H9v2H7.5V7H10c.83 0 1.5.67 1.5 1.5v1zm5 2c0 .83-.67 1.5-1.5 1.5h-2.5V7H15c.83 0 1.5.67 1.5 1.5v3zm4-3H19v1h1.5V11H19v2h-1.5V7h3v1.5zM9 9.5h1v-1H9v1zM4 6H2v14c0 1.1.9 2 2 2h14v-2H4V6zm10 5.5h1v-3h-1v3z"/>
            </svg>
            <span>PDF Document (click to download)</span>
          </div>
          <a 
            href={mediaUrl} 
            download="document.pdf"
            className="pdf-download-link"
            target="_blank"
            rel="noopener noreferrer"
          >
            Download PDF
          </a>
        </div>
      );
    }
    // For PDFs with URLs (not data URLs)
    return (
      <div className="pdf-container">
        <iframe
          src={mediaUrl}
          title="PDF document"
          className="pdf-frame"
        />
      </div>
    );
  }

  return null;
};

// Main content renderer component
const ContentRenderer = ({ content, isTyping }) => {
  const [processedContent, setProcessedContent] = useState('');
  const [thinkingSections, setThinkingSections] = useState([]);
  const [isThinking, setIsThinking] = useState(false);
  const [currentThinking, setCurrentThinking] = useState('');
  const [mediaContents, setMediaContents] = useState([]);

  // Process content to extract thinking sections and handle multimodal content
  useEffect(() => {
    if (!content) {
      setProcessedContent('');
      setThinkingSections([]);
      setIsThinking(false);
      setCurrentThinking('');
      setMediaContents([]);
      return;
    }    // Try to parse if the content might be JSON (for multimodal messages)
    try {
      // Check if it's a string that might be JSON
      if (typeof content === 'string' && 
          (content.trim().startsWith('[') || content.trim().startsWith('{'))) {
        const parsedContent = JSON.parse(content);
        
        // If it's an array, it might be multimodal content
        if (Array.isArray(parsedContent)) {
          const textContents = [];
          const newMediaContents = [];
          
          parsedContent.forEach(item => {
            if (item.type === 'text') {
              textContents.push(item.text || '');
            } else if (item.type === 'image_url' || item.type === 'file_url') {
              newMediaContents.push(item);
            }
          });
          
          // Set the text content for markdown processing
          setProcessedContent(textContents.join('\n\n'));
          
          // Set media contents for rendering
          setMediaContents(newMediaContents);
          
          // Process thinking sections in the text content
          processThinkingSections(textContents.join('\n\n'));
          return;
        }
      }
        // Handle special case of "Multimodal content:" prefix
      if (typeof content === 'string' && content.includes('Multimodal content:')) {
        // Try to extract meaningful content or show a placeholder
        const fallbackText = content.includes('ArrayList') 
          ? '📎 *This message contained attached files that cannot be displayed in chat history*'
          : content;
        
        setProcessedContent(fallbackText);
        setMediaContents([]);
        processThinkingSections(fallbackText);
        return;
      }
    } catch (e) {
      // If parsing fails, it's not JSON, so continue with normal processing
    }

    // Process as regular text content with potential thinking sections
    processThinkingSections(content);
    setMediaContents([]);
  }, [content]);

  // Function to process thinking sections
  const processThinkingSections = (text) => {
    let newProcessedContent = '';
    let newThinkingSections = [];
    let currentPosition = 0;
    
    // Regular expression to find <thinking>...</thinking> or <think>...</think> tags
    const thinkingRegex = /<(thinking|think)>([\s\S]*?)<\/(thinking|think)>/g;
    let match;
    let inThinking = false;
    
    // Process existing complete thinking tags
    while ((match = thinkingRegex.exec(text)) !== null) {
      // Add content before the thinking tag
      const beforeThinking = text.substring(currentPosition, match.index);
      if (beforeThinking) {
        newProcessedContent += beforeThinking;
      }
      
      // Store the thinking section
      newThinkingSections.push({
        id: `thinking-${newThinkingSections.length}`,
        content: match[2].trim()
      });
      
      // Update position
      currentPosition = match.index + match[0].length;
    }
    
    // Check if we're in an unclosed thinking tag
    const openingTags = ['<thinking>', '<think>'];
    const closingTags = ['</thinking>', '</think>'];
    let lastOpeningIndex = -1;
    let lastOpeningTag = '';
    
    // Find the last opening tag
    for (const tag of openingTags) {
      const index = text.lastIndexOf(tag);
      if (index > lastOpeningIndex) {
        lastOpeningIndex = index;
        lastOpeningTag = tag;
      }
    }
    
    if (lastOpeningIndex !== -1) {
      // Find the corresponding closing tag
      const correspondingClosingTag = lastOpeningTag === '<thinking>' ? '</thinking>' : '</think>';
      const lastClosingIndex = text.lastIndexOf(correspondingClosingTag);
      
      if (lastClosingIndex < lastOpeningIndex || lastClosingIndex === -1) {
        // We're in an unclosed thinking tag
        inThinking = true;
        
        // Add content before the thinking tag
        const beforeThinking = text.substring(currentPosition, lastOpeningIndex);
        if (beforeThinking) {
          newProcessedContent += beforeThinking;
        }
        
        // Extract thinking content so far
        const thinkingContent = text.substring(lastOpeningIndex + lastOpeningTag.length);
        setCurrentThinking(thinkingContent.trim());
        
        // Update position
        currentPosition = text.length;
      }
    }
    
    // Add any remaining content
    if (currentPosition < text.length) {
      newProcessedContent += text.substring(currentPosition);
    }
    
    setProcessedContent(newProcessedContent);
    setThinkingSections(newThinkingSections);
    setIsThinking(inThinking);
  };

  return (
    <div className="content-renderer">
      {/* Display media contents first */}
      {mediaContents.length > 0 && (
        <div className="media-content-container">
          {mediaContents.map((mediaContent, index) => (
            <MediaRenderer key={`media-${index}`} mediaContent={mediaContent} />
          ))}
        </div>
      )}
      
      {/* Current thinking in progress */}
      {isThinking && (
        <ThinkingSection 
          content={currentThinking}
          isTyping={true}
        />
      )}
      
      {/* Completed thinking sections */}
      {thinkingSections.map((section) => (
        <ThinkingSection 
          key={section.id}
          content={section.content}
          isTyping={false}
        />
      ))}
      
      {/* Regular content */}
      {processedContent && (
        <ReactMarkdown
          children={processedContent}
          remarkPlugins={[remarkGfm]}
          components={syntaxHighlighterComponents}
        />
      )}
    </div>
  );
};

export default ContentRenderer;
