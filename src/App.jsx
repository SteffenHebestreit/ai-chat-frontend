import React, { useState, useRef, useEffect } from 'react';
import { Canvas } from '@react-three/fiber';
import Orb from './components/Orb';
import ChatHistoryPanel from './components/ChatHistoryPanel';
import MessageCard from './components/MessageCard';
import UserInput from './components/UserInput';
import {
  createNewChat,
  saveUserMessage,
  streamChatResponse,
  saveAgentResponse,
  fetchChatDetails,
  deleteChat as apiDeleteChat
} from './services/chatService';
import './App.css';

function App() {
  const [inputText, setInputText] = useState('');
  const [messages, setMessages] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [orbAiState, setOrbAiState] = useState('default');
  const [isPanelOpen, setIsPanelOpen] = useState(false);
  const [selectedChatId, setSelectedChatId] = useState(null);
  const [currentChatId, setCurrentChatId] = useState(null);
  const [refreshHistoryKey, setRefreshHistoryKey] = useState(null);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  // Add this useEffect to focus the input when loading is finished
  useEffect(() => {
    if (!isLoading && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isLoading]); // Dependency array includes isLoading

  const handleDeleteChatInHistory = async (chatIdToDelete) => {
    try {
      await apiDeleteChat(chatIdToDelete);
      setRefreshHistoryKey(Date.now());
      if (currentChatId === chatIdToDelete) {
        handleClearChat();
      }
    } catch (error) {
      console.error('Error deleting chat:', error);
    }
  };

  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages]);

  const handleInputChange = (event) => {
    setInputText(event.target.value);
  };

  const handleKeyDown = (event) => {
    if (event.key === 'Enter' && event.shiftKey) {
      event.preventDefault();
      handleSendMessage();
    }
  };
  
  const handleClearChat = () => {
    setMessages([]);
    setInputText('');
    setIsLoading(false);
    setIsTyping(false);
    setCurrentChatId(null);
    setSelectedChatId(null);
  };

  const toggleChatHistory = () => {
    setIsPanelOpen(!isPanelOpen);
  };

  const handleSelectChat = async (chatId) => {
    setSelectedChatId(chatId);
    setOrbAiState('default');

    if (isPanelOpen) {
      toggleChatHistory();
    }
    
    if (chatId === null) {
      handleClearChat();
      return;
    }
    
    setIsLoading(true);
    try {
      const data = await fetchChatDetails(chatId);
      
      if (data && data.result) {
        const chat = data.result;
        setCurrentChatId(chat.id);
        
        if (chat.messages && chat.messages.length > 0) {
          const sortedMessages = [...chat.messages]
            .sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp))
            .map(msg => ({
              id: msg.id,
              role: msg.role,
              content: msg.content,
              timestamp: msg.timestamp
            }));
          setMessages(sortedMessages);
        } else {
          setMessages([]);
        }
      }
    } catch (error) {
      console.error('Error loading chat:', error);
      setMessages([{ id: 'error-load', role: 'system', content: 'Error loading chat. Please try again.' }]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSendMessage = async () => {
    if (!inputText.trim()) return;

    setOrbAiState('activity');
    const userMessageContent = inputText;
    setIsLoading(true);
    setIsTyping(true);

    const userMessage = { 
      id: `user-${Date.now()}`,
      role: 'user', 
      content: userMessageContent,
      timestamp: new Date().toISOString()
    };
    setMessages(prevMessages => [...prevMessages, userMessage]);

    let chatSessionId = currentChatId;
    let isNewChat = false;

    if (!chatSessionId) {
      try {
        const data = await createNewChat(userMessageContent);

        if (data && data.result && data.result.id) {
          chatSessionId = data.result.id;
          setCurrentChatId(chatSessionId);
          setSelectedChatId(chatSessionId);
          setRefreshHistoryKey(Date.now());
          isNewChat = true;
        } else {
          throw new Error('Failed to create chat or retrieve chat ID.');
        }
      } catch (err) {
        console.error('Error creating new chat:', err);
        setMessages(prev => [...prev, { id: 'error-create', role: 'system', content: `Error: Could not initiate chat session. ${err.message}` }]);
        setIsLoading(false);
        setIsTyping(false);
        return;
      }
    } else if (!isNewChat) { 
      try {
        await saveUserMessage(chatSessionId, userMessageContent);
      } catch (err) {
        console.error('Error saving user message to existing chat:', err);
      }
    }
    
    const aiMessageId = `agent-${Date.now()}`;
    setMessages(prevMessages => [...prevMessages, { id: aiMessageId, role: 'agent', content: '', timestamp: new Date().toISOString() }]);

    if (!chatSessionId) {
      console.error("Critical Error: chatSessionId is not set before streaming call.");
      setMessages(prev => [...prev, { id: 'error-stream-id', role: 'system', content: "Error: Chat session ID not available. Please try again." }]);
      setIsLoading(false);
      setIsTyping(false);
      return;
    }

    try {
      const response = await streamChatResponse(chatSessionId, userMessageContent);

      if (response.body) {
        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let accumulatedResponseForSaving = '';
        
        const processStream = async (idToSaveUnder) => {
          try {
            while (true) {
              const { done, value } = await reader.read();
              if (done) {
                if (idToSaveUnder && accumulatedResponseForSaving.trim()) {
                  try {
                    await saveAgentResponse(idToSaveUnder, accumulatedResponseForSaving);
                  } catch (err) {
                    console.error('Error saving AI response:', err);
                  }
                }
                setOrbAiState('default');
                setIsLoading(false);
                setIsTyping(false);
                return;
              }
              
              const chunk = decoder.decode(value, { stream: true });
              accumulatedResponseForSaving += chunk;
              setMessages(prevMessages => 
                prevMessages.map(msg => 
                  msg.id === aiMessageId ? { ...msg, content: msg.content + chunk } : msg
                )
              );
            }
          } catch (streamError) {
            console.error("Error reading stream:", streamError);
            setOrbAiState('error');
            setMessages(prevMessages => 
              prevMessages.map(msg => 
                msg.id === aiMessageId ? { ...msg, content: msg.content + `\nError reading stream: ${streamError.message}` } : msg
              )
            );
            setIsLoading(false);
            setIsTyping(false);
          }
        };
        await processStream(chatSessionId);
      } else {
        setMessages(prevMessages => 
          prevMessages.map(msg => 
            msg.id === aiMessageId ? { ...msg, content: 'Error: Did not receive a streamable response.' } : msg
          )
        );
        setOrbAiState('error');
        setIsLoading(false);
        setIsTyping(false);
      }
    } catch (error) {
      console.error("Failed to send message or process stream:", error);
      setMessages(prevMessages => 
        prevMessages.map(msg => 
          msg.id === aiMessageId ? { ...msg, content: msg.content + `\nError: ${error.message}` } : msg
        )
      );
      setOrbAiState('error');
    } finally {
      setInputText('');
      // inputRef.current?.focus(); // We'll rely on the new useEffect for focusing
    }
  };

  return (
    <div className="app-container">
      <div className="orb-container">
        <Canvas>
          <Orb aiState={orbAiState} />
        </Canvas>
      </div>

      <ChatHistoryPanel
        isOpen={isPanelOpen}
        onClose={toggleChatHistory}
        onSelectChat={handleSelectChat}
        selectedChatId={selectedChatId}
        currentChatId={currentChatId}
        refreshHistoryKey={refreshHistoryKey}
        onDeleteChat={handleDeleteChatInHistory}
      />

      <div className={`chat-container ${isPanelOpen ? 'panel-open' : ''}`}>
        <div className="App-header">
          <button
            className="new-chat-header-button"
            onClick={handleClearChat}
            disabled={isLoading || currentChatId === null}
            title={currentChatId === null ? "Cannot create new chat while current one is unsaved" : "Start a new chat session"}
          >
            New Chat
          </button>
          <button 
            className={`chat-history-toggle ${isPanelOpen ? 'panel-is-open' : ''}`} 
            onClick={toggleChatHistory}
            title={isPanelOpen ? "Close chat history" : "Open chat history"}
          >
            {isPanelOpen ? (
              <svg viewBox="0 0 24 24" fill="currentColor" width="1em" height="1em" style={{ display: 'block' }}>
                <path d="M10 6L8.59 7.41 13.17 12l-4.58 4.59L10 18l6-6z"/>
              </svg>
            ) : (
              <svg viewBox="0 0 24 24" fill="currentColor" width="1em" height="1em" style={{ display: 'block' }}>
                <path d="M15.41 7.41L14 6l-6 6 6 6 1.41-1.41L10.83 12z"/>
              </svg>
            )}
          </button>
        </div>
        <div className="messages-container">
          {messages.map((message, index) => (
            <MessageCard 
              key={message.id || index} 
              role={message.role} 
              content={message.content} 
              timestamp={message.timestamp} 
            />
          ))}
          
          {isTyping && (
            <div className="message ai typing">
              <div className="typing-indicator">
                <span></span>
                <span></span>
                <span></span>
              </div>
            </div>
          )}
          
          <div ref={messagesEndRef} />
        </div>
        
        <UserInput
          inputText={inputText}
          onInputChange={handleInputChange}
          onSendMessage={handleSendMessage}
          isLoading={isLoading}
          onKeyDown={handleKeyDown}
          inputRef={inputRef} // ADDED: Pass inputRef to UserInput component
        />
      </div>
    </div>
  );
}

export default App;
