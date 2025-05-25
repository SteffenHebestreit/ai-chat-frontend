import React from 'react';
import ReactMarkdown from 'react-markdown';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { atomDark } from 'react-syntax-highlighter/dist/esm/styles/prism';
import remarkGfm from 'remark-gfm';
import './MessageCard.css';

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

function MessageCard({ role, content, timestamp }) { // Destructure props directly
  return (
    <div className={`message ${role === 'user' ? 'user' : 'ai'}`}>
      <div className="message-content">
        <ReactMarkdown
          children={content}
          remarkPlugins={[remarkGfm]}
          components={syntaxHighlighterComponents}
        />
      </div>
      {timestamp && (
        <div className="message-timestamp">
          {new Date(timestamp).toLocaleTimeString()} {/* Format timestamp */}
        </div>
      )}
    </div>
  );
}

export default MessageCard;
