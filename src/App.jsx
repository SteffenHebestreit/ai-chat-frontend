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
  deleteChat as apiDeleteChat,
  abortStream, // Import the new service function
  createMultimodalMessagePayload,
  streamMultimodalChatResponse,
  fetchLlmCapabilities,
  saveMultimodalUserMessage,
  parseMultimodalContent
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
  const [abortController, setAbortController] = useState(null); // New state for AbortController
  const [selectedFile, setSelectedFile] = useState(null); // New state for file upload
  const [llmCapabilities, setLlmCapabilities] = useState([]); // New state for LLM capabilities
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);
  // Add this useEffect to focus the input when loading is finished
  useEffect(() => {
    if (!isLoading && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isLoading]); // Dependency array includes isLoading
  // Add this useEffect to fetch LLM capabilities on component mount
  useEffect(() => {
    const getLlmCapabilities = async () => {      try {
        const data = await fetchLlmCapabilities();
        if (data && Array.isArray(data)) {
          setLlmCapabilities(data);
        } else if (data && data.result && Array.isArray(data.result)) {
          setLlmCapabilities(data.result);
        }
      } catch (error) {
        console.error('Error fetching LLM capabilities:', error);
      }
    };
    
    getLlmCapabilities();
  }, []);
  // Handle file selection
  const handleFileSelect = (file) => {
    setSelectedFile(file);
  };

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
    setSelectedFile(null); // Clear selected file
  };

  const toggleChatHistory = () => {
    setIsPanelOpen(!isPanelOpen);
  };

  const handleSelectChat = async (chatId) => {
    setSelectedChatId(chatId);
    setOrbAiState('default'); // Reset to default when selecting/clearing chat

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
            .sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp))            .map(msg => {
              let processedContent = msg.content;
              let fileAttachment = null;              // Check if this might be multimodal content
              const isMultimodal = 
                (typeof msg.content === 'string' && 
                 (msg.content.includes('Multimodal content:') || 
                  msg.content.includes('ArrayList') ||
                  msg.content.startsWith('[') ||
                  msg.content.startsWith('{'))) ||
                (msg.content && typeof msg.content === 'object' && 
                 (Array.isArray(msg.content) || 
                  (msg.content.content && Array.isArray(msg.content.content))));

              if (isMultimodal) {
                // Use utility function to parse multimodal content
                const parsedContent = parseMultimodalContent(msg.content);
                processedContent = JSON.stringify(parsedContent);
              }

              return {
                id: msg.id,
                role: msg.role === 'agent' ? 'ai' : msg.role, // Normalize 'agent' to 'ai'
                content: processedContent,
                timestamp: msg.timestamp,
                isFromHistory: true, // Add flag for history messages
                fileAttachment
              };
            });
          setMessages(sortedMessages);
        } else {
          setMessages([]);
        }
      }
    } catch (error) {
      console.error('Error loading chat:', error);
      setMessages([{ id: 'error-load', role: 'system', content: 'Error loading chat. Please try again.' }]);
      setOrbAiState('criticalError'); // Use criticalError for load failures
    } finally {
      setIsLoading(false);
    }
  };
  const handleSendMessage = async () => {
    if ((!inputText.trim() && !selectedFile) && !isLoading) return; // Prevent sending empty messages if not loading

    // If already loading (i.e., AI is responding), this button press should mean "Stop"
    if (isLoading && abortController) {
      handleStopGeneration();
      return;
    }
    
    if (!inputText.trim() && !selectedFile) return; // Ensure inputText is not empty or there's a file

    setOrbAiState('activity');
    const userMessageContent = inputText;
    setIsLoading(true);
    setIsTyping(true);    // Create user message object for display
    let userMessageDisplayContent = userMessageContent;
    let fileAttachment = null;
    const userMessageId = `user-${Date.now()}`; // Generate ID once

    if (selectedFile) {
      const fileType = selectedFile.type.startsWith('image/') ? 'image' : 'document';
      userMessageDisplayContent = userMessageContent
        ? `${userMessageContent}\n[Attached ${fileType}: ${selectedFile.name}]`
        : `[Attached ${fileType}: ${selectedFile.name}]`;
      
      // Set file attachment immediately
      fileAttachment = { file: selectedFile };
      
      // Create preview URL for the file if it's an image
      if (selectedFile.type.startsWith('image/')) {
        const reader = new FileReader();
        reader.onload = (e) => {
          const previewUrl = e.target.result;
          setMessages(prevMessages => 
            prevMessages.map(msg => 
              msg.id === userMessageId 
                ? { ...msg, fileAttachment: { file: selectedFile, previewUrl } }
                : msg
            )
          );
        };
        reader.readAsDataURL(selectedFile);
      }
    }

    const userMessage = { 
      id: userMessageId,
      role: 'user', 
      content: userMessageDisplayContent,
      timestamp: new Date().toISOString(),
      fileAttachment // This will be updated asynchronously for images with previewUrl
    };
    setMessages(prevMessages => [...prevMessages, userMessage]);

    let chatSessionId = currentChatId;
    let isNewChat = false;

    // Prepare the message payload based on whether there's a file or not
    let messagePayload;
    try {
      messagePayload = await createMultimodalMessagePayload(userMessageContent, selectedFile);
    } catch (err) {
      console.error('Error preparing message payload:', err);
      setMessages(prev => [...prev, { id: 'error-payload', role: 'system', content: `Error: Could not prepare message. ${err.message}` }]);
      setOrbAiState('criticalError');
      setIsLoading(false);
      setIsTyping(false);
      return;
    }    if (!chatSessionId) {
      try {
        const data = await createNewChat(messagePayload);

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
        setOrbAiState('criticalError'); // Use criticalError
        setIsLoading(false);
        setIsTyping(false);
        return;
      }
    } else if (!isNewChat) { 
      try {
        // If there's a file, use multimodal API
        if (selectedFile) {
          await saveMultimodalUserMessage(chatSessionId, messagePayload);
        } else {
          await saveUserMessage(chatSessionId, userMessageContent);
        }
      } catch (err) {
        console.error('Error saving user message to existing chat:', err);
        // Optionally, set a less severe error state or handle differently
        // For now, using criticalError as per prompt's visual description for "error"
        setOrbAiState('criticalError');
      }
    }
    
    const aiMessageId = `agent-${Date.now()}`; // ID can remain agent-prefixed for uniqueness
    setMessages(prevMessages => [...prevMessages, { 
      id: aiMessageId, 
      role: 'ai', 
      content: '', 
      timestamp: new Date().toISOString() 
      // isFromHistory will be undefined (falsy) here, defaulting to expanded
    }]);

    if (!chatSessionId) {
      console.error("Critical Error: chatSessionId is not set before streaming call.");
      setMessages(prev => [...prev, { id: 'error-stream-id', role: 'system', content: "Error: Chat session ID not available. Please try again." }]);
      setOrbAiState('criticalError'); // Use criticalError
      setIsLoading(false);
      setIsTyping(false);
      return;
    }    const controller = new AbortController(); // Create a new AbortController
    setAbortController(controller); // Store it in state
    
    try {      // Pass the signal to streamChatResponse - choose correct method based on content type
      let response;      if (selectedFile) {
        // Get the first available LLM ID that supports multimodal content
        let defaultLlmId = '1'; // fallback default
          if (llmCapabilities.length > 0) {
          // First, try to find an LLM that supports images (for multimodal)
          const imageCapableLlm = llmCapabilities.find(llm => 
            llm.supportsImage || llm.capabilities?.image || 
            (llm.supportedTypes && llm.supportedTypes.includes('image'))
          );
          
          if (imageCapableLlm) {
            defaultLlmId = imageCapableLlm.id || imageCapableLlm.llmId || '1';
          } else {
            // Fall back to the first available LLM
            const firstLlm = llmCapabilities[0];
            defaultLlmId = firstLlm.id || firstLlm.llmId || '1';
          }
        }
        
        response = await streamMultimodalChatResponse(chatSessionId, messagePayload, controller.signal, defaultLlmId);
      } else {
        response = await streamChatResponse(chatSessionId, userMessageContent, controller.signal);
      }

      if (response.body) {
        setOrbAiState('output'); // AI is now outputting data
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
                // No setOrbAiState('default') here, will be handled in finally or AbortError
                return; // Exit loop and function on successful completion
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
            if (streamError.name === 'AbortError') {
              console.log('Stream reading aborted.');
              throw streamError; // Re-throw AbortError to be caught by the outer catch
            }
            console.error("Error reading stream:", streamError);
            setOrbAiState('criticalError'); // Use criticalError for stream errors
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
        setOrbAiState('default'); // Set to default only on successful completion of stream
      } else {
        setMessages(prevMessages => 
          prevMessages.map(msg => 
            msg.id === aiMessageId ? { ...msg, content: 'Error: Did not receive a streamable response.' } : msg
          )
        );
        setOrbAiState('criticalError'); // Use criticalError
        setIsLoading(false);
        setIsTyping(false);
      }
    } catch (error) {
      if (error.name === 'AbortError') {
        console.log('Stream fetch aborted by user.');
        setMessages(prevMessages =>
          prevMessages.map(msg =>
            msg.id === aiMessageId ? { ...msg, content: msg.content + '\n(Stream stopped by user)' } : msg
          )
        );
        setOrbAiState('default'); // Reset orb state after abortion
      } else {
        console.error("Failed to send message or process stream:", error);
        setMessages(prevMessages => 
          prevMessages.map(msg => 
            msg.id === aiMessageId ? { ...msg, content: msg.content + `\nError: ${error.message}` } : msg
          )
        );
        setOrbAiState('criticalError'); // Use criticalError for other errors
      }    } finally {
      setInputText(''); // Clear input text
      setSelectedFile(null); // Clear selected file
      setIsLoading(false); // Reset loading state
      setIsTyping(false); // Reset typing indicator
      setAbortController(null); // Clear the abort controller
      // inputRef.current?.focus(); // Focus handled by useEffect
    }
  };

  const handleStopGeneration = async () => {
    if (abortController) {
      abortController.abort(); // This will trigger the AbortError in handleSendMessage's catch block
      // The UI updates (isLoading, isTyping, orbState) will be handled by handleSendMessage's finally/catch block.
    }
    if (currentChatId) {
      try {
        await abortStream(currentChatId); // Notify backend
        console.log('Backend notified of stream abortion.');
      } catch (error) {
        console.error('Error notifying backend of stream abortion:', error);
        // Optionally, display a message to the user about this failure
      }
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
        <div className="messages-container">          {messages.map((message, index) => (            <MessageCard 
              key={message.id || index} 
              role={message.role} 
              content={message.content} 
              timestamp={message.timestamp}
              isFromHistory={message.isFromHistory}
              isTyping={isTyping && index === messages.length - 1 && message.role === 'ai'} // Only set isTyping for the last AI message
              fileAttachment={message.fileAttachment}
            />
          ))}
          
          <div ref={messagesEndRef} />
        </div>
          <UserInput
          inputText={inputText}
          onInputChange={handleInputChange}
          onSendMessage={isLoading ? handleStopGeneration : handleSendMessage} // Conditional handler
          isLoading={isLoading} // Pass isLoading to UserInput
          onKeyDown={handleKeyDown}
          inputRef={inputRef}
          onFileSelect={handleFileSelect}
          selectedFile={selectedFile}
          showFileUpload={true}
          llmCapabilities={llmCapabilities}
        />
      </div>
    </div>
  );
}

export default App;
