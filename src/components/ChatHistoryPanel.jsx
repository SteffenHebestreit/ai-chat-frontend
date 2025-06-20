import React, { useState, useEffect, useCallback } from 'react';
import './ChatHistoryPanel.css';
import { fetchChatHistory, deleteChat as apiDeleteChat, parseMultimodalContent } from '../services/chatService';

// Utility function to extract a clean title from chat content
const extractCleanTitle = (title) => {
  if (!title) return 'New Chat';
  
  // If it's already a clean title, return it
  if (typeof title === 'string' && !title.includes('[{') && !title.includes('type=') && !title.includes('Multimodal content:')) {
    return title.length > 50 ? title.substring(0, 50) + '...' : title;
  }
    // Handle multimodal content titles
  if (typeof title === 'string' && (title.includes('[{') || title.includes('type=') || title.includes('Multimodal content:'))) {
    try {
      // Try to parse multimodal content to extract text
      const parsedContent = parseMultimodalContent(title);
      
      if (Array.isArray(parsedContent)) {
        // Find the first text item
        const textItem = parsedContent.find(item => item.type === 'text' && item.text);
        if (textItem && textItem.text) {
          const cleanText = textItem.text.trim();
          if (cleanText && cleanText !== 'null') {
            return cleanText.length > 50 ? cleanText.substring(0, 50) + '...' : cleanText;
          }
        }
        
        // If no text content found, create a descriptive title
        const hasImages = parsedContent.some(item => item.type === 'image_url');
        const hasFiles = parsedContent.some(item => item.type === 'file_url');
        
        if (hasImages && hasFiles) {
          return '📎 Chat with files and images';
        } else if (hasImages) {
          return '🖼️ Chat with images';
        } else if (hasFiles) {
          return '📄 Chat with files';
        }
      }
    } catch (e) {
      console.warn('Failed to parse multimodal title:', e, 'Raw title:', title);
    }
    
    // Fallback for various multimodal formats
    if (title.includes('ArrayList')) {
      return '📎 Chat with attachments';
    }
      // Try to extract any readable text from the raw format
    // Improved regex patterns to handle various formats including quoted strings
    const patterns = [
      // Pattern for quoted text like text="describe this image"
      /text=["']([^"']+)["']/g,
      // Pattern for unquoted text like text=describe or text=hello world
      /text=([^,}\]]+?)(?=[,}\]]|$)/g,
      // Pattern for text: formats
      /text:\s*["']([^"']+)["']/g,
      /text:\s*([^,}\]]+?)(?=[,}\]]|$)/g
    ];
    
    for (const pattern of patterns) {
      const matches = Array.from(title.matchAll(pattern));
      for (const match of matches) {
        let extractedText = match[1]?.trim();
        if (extractedText && extractedText !== 'null' && extractedText !== '') {
          // Clean up any remaining brackets or special characters
          extractedText = extractedText.replace(/[{}[\]]/g, '').trim();
          if (extractedText) {
            return extractedText.length > 50 ? extractedText.substring(0, 50) + '...' : extractedText;
          }
        }
      }
    }
    
    return '💬 Multimodal Chat';
  }
  
  return title || 'New Chat';
};

function ChatHistoryPanel({ onSelectChat, selectedChatId, onClose, isOpen, refreshHistoryKey, onDeleteChat }) {
  const [chats, setChats] = useState([]);
  const [loading, setLoading] = useState(true); // Set initial loading to true
  const [error, setError] = useState(null);

  const fetchHistory = useCallback(async () => {
    setLoading(true);
    setError(null); // Clear previous errors
    try {
      const fetchedData = await fetchChatHistory();

      if (fetchedData && Array.isArray(fetchedData.result)) { // Changed from fetchedData.results
        const results = fetchedData.result; // Changed from fetchedData.results
        // Sort chats by last_updated timestamp, descending (newest first)
        results.sort((a, b) => {
          const dateA = new Date(a.last_updated);
          const dateB = new Date(b.last_updated);
          // Handle invalid dates by treating them as older
          if (isNaN(dateB)) return -1;
          if (isNaN(dateA)) return 1;
          return dateB - dateA;
        });
        setChats(results);
      } else {
        console.warn('[ChatHistoryPanel] fetchChatHistory returned invalid data or no result array. Data:', fetchedData);
        setChats([]); // Ensure chats is empty
        setError('Chat history is empty or could not be loaded correctly.');
      }
    } catch (err) {
      setError('Failed to load chat history due to an error.');
      setChats([]); // Ensure chats is empty on error
    } finally {
      setLoading(false);
    }
  }, []); // CORRECTED: Empty dependency array as fetchChatHistory is stable and others are setters or primitive

  useEffect(() => {
    // Fetch history if the panel is open or if a refresh is explicitly triggered.
    // Also, fetch on initial mount if isOpen is true or refreshHistoryKey is set.
    if (isOpen || refreshHistoryKey) {
        fetchHistory();
    }
  }, [isOpen, refreshHistoryKey, fetchHistory]);

  // Function to create a new chat
  // eslint-disable-next-line no-unused-vars
  const createNewChat = () => {
    onSelectChat(null); // Passing null indicates to create a new chat
    onClose(); // Close the panel after selection
  };

  // Function to delete a chat
  const handleDeleteChat = async (chatId, event) => { // Renamed to avoid conflict with imported service
    // Prevent the click from selecting the chat
    event.stopPropagation();
    
    if (window.confirm('Are you sure you want to delete this chat?')) {
      try {
        await apiDeleteChat(chatId); // UPDATED to use service

        // Remove the chat from the list
        setChats(prevChats => prevChats.filter(chat => chat.id !== chatId));
        
        // If the deleted chat was selected, clear the selection
        // And inform parent component (App.js) to also clear/reset
        if (selectedChatId === chatId) {
          onSelectChat(null); 
        }
        // Call the onDeleteChat prop passed from App.js to trigger its own logic (like refreshHistoryKey)
        if (onDeleteChat) {
          onDeleteChat(chatId);
        }

      } catch (err) {
        console.error('Error deleting chat:', err);
        alert('Failed to delete chat. Please try again.');
      }
    }
  };

  // Format date for display (for updatedAt - last message time)
  const formatDate = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();

    const optionsTime = { hour: 'numeric', minute: '2-digit', hour12: true };
    const timeString = date.toLocaleTimeString(undefined, optionsTime);

    if (
      date.getFullYear() === now.getFullYear() &&
      date.getMonth() === now.getMonth() &&
      date.getDate() === now.getDate()
    ) {
      return `Today, ${timeString}`;
    } else {
      const optionsDateWithDay = { weekday: 'short', month: 'short', day: 'numeric' };
      const dateStringWithDay = date.toLocaleDateString(undefined, optionsDateWithDay);
      return `${dateStringWithDay}, ${timeString}`;
    }
  };

  // ADDED: Function to format the creation date and time
  const formatCreationDateTime = (dateString) => {
    if (!dateString) return ''; // Handle cases where createdAt might be null or undefined
    const date = new Date(dateString);
    const optionsDate = { month: 'short', day: 'numeric' };
    const optionsTime = { hour: 'numeric', minute: '2-digit', hour12: true };
    return `${date.toLocaleDateString(undefined, optionsDate)}, ${date.toLocaleTimeString(undefined, optionsTime)}`;
  };

  // Handle chat selection
  const handleSelectChat = (chatId) => {
    onSelectChat(chatId);
    onClose(); // Close the panel after selection
  };

  return (
    <div className={`chat-history-panel ${isOpen ? 'open' : ''}`}>
      <div className="chat-history-panel-header">
        <h2>Recent Chats</h2>
      </div>
      
      {loading ? (
        <div className="loading-chats">Loading...</div>
      ) : error ? (
        <div className="error-message">{error}</div>
      ) : chats.length === 0 ? (
        <div className="no-chats">
          <p>No chat history yet.</p>
        </div>
      ) : (
        <div className="chat-list">
          {chats.map(chat => (
            <div 
              key={chat.id} 
              className={`chat-item ${selectedChatId === chat.id ? 'selected' : ''}`}
              onClick={() => handleSelectChat(chat.id)}
            >
              <div className="chat-details">
                {/* ADDED: Creation timestamp */}
                {chat.createdAt && (
                  <span className="chat-creation-time">
                    Created: {formatCreationDateTime(chat.createdAt)}
                  </span>
                )}
                <div className="chat-header">
                  <h3 className="chat-title">{extractCleanTitle(chat.title)}</h3>
                  <span className="chat-time">{formatDate(chat.updatedAt)}</span>
                </div>
              </div>
              <button 
                className="delete-chat-btn"
                onClick={(e) => handleDeleteChat(chat.id, e)} // UPDATED to call new handler
                title="Delete chat"
              >
                {/* Replace text '×' with an SVG icon */}
                <svg viewBox="0 0 24 24" fill="currentColor" width="1em" height="1em" style={{ display: 'block' }}>
                  <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"></path>
                </svg>
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default ChatHistoryPanel;
