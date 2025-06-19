import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Canvas } from '@react-three/fiber';
import Orb from './components/Orb';
import ChatHistoryPanel from './components/ChatHistoryPanel';
import MessageCard from './components/MessageCard';
import UserInput from './components/UserInput';
import ModelSelector from './components/ModelSelector';
import {
  createNewChat,
  streamTextChatResponse,
  fetchChatDetails,
  deleteChat as apiDeleteChat,
  createMultimodalChatWithStream,
  fetchLlmCapabilitiesWithOverrides,
  parseMultimodalContent,
  streamMultimodalMessage
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
  const [currentChatId, setCurrentChatId] = useState(null);  const [refreshHistoryKey, setRefreshHistoryKey] = useState(null);
  const [abortController, setAbortController] = useState(null); // New state for AbortController
  const [selectedFile, setSelectedFile] = useState(null); // New state for file upload
  const [llmCapabilities, setLlmCapabilities] = useState([]); // New state for LLM capabilities
  const [selectedModelId, setSelectedModelId] = useState(null); // New state for selected model
  const [selectedModel, setSelectedModel] = useState(null); // New state for selected model object
  const [isAborting, setIsAborting] = useState(false); // New state to prevent multiple abort calls
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);
  
  // Add this useEffect to focus the input when loading is finished
  useEffect(() => {
    if (!isLoading && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isLoading]); // Dependency array includes isLoading

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]); // Scroll when messages array changes  // Add this useEffect to fetch LLM capabilities on component mount
  useEffect(() => {
    const getLlmCapabilities = async () => {      try {
        const data = await fetchLlmCapabilitiesWithOverrides();
        if (data && Array.isArray(data)) {
          setLlmCapabilities(data);
        } else if (data && data.result && Array.isArray(data.result)) {
          setLlmCapabilities(data.result);
        }
      } catch (error) {
        console.error('Error fetching LLM capabilities:', error);
      }    };
    
    getLlmCapabilities();
    
    // Listen for capability override changes from settings
    const handleCapabilityOverrideChange = () => {
      getLlmCapabilities(); // Refresh capabilities when overrides change
    };
    
    window.addEventListener('capabilityOverrideChange', handleCapabilityOverrideChange);
    
    return () => {
      window.removeEventListener('capabilityOverrideChange', handleCapabilityOverrideChange);
    };
  }, []);  // Handle file selection
  const handleFileSelect = (file) => {
    setSelectedFile(file);
  };
  // Handle model selection
  const handleModelChange = (modelId, modelObject) => {
    setSelectedModelId(modelId);
    setSelectedModel(modelObject);
    console.log('Model changed to:', modelId, 'Model object:', modelObject);
  };
  const handleDeleteChatInHistory = useCallback(async (chatIdToDelete) => {
    try {
      await apiDeleteChat(chatIdToDelete);
      setRefreshHistoryKey(Date.now());
      if (currentChatId === chatIdToDelete) {
        handleClearChat();
      }
    } catch (error) {
      console.error('Error deleting chat:', error);
    }
  }, [currentChatId]);
  const handleInputChange = useCallback((event) => {
    setInputText(event.target.value);
  }, []);
  const handleClearChat = useCallback(() => {
    setMessages([]);
    setInputText('');
    setIsLoading(false);
    setIsTyping(false);
    setCurrentChatId(null);
    setSelectedChatId(null);
    setOrbAiState('default');
  }, []);  const handleStopGeneration = useCallback(async () => {
    // Prevent multiple abort calls
    if (isAborting) {
      return;
    }
    
    setIsAborting(true);
    
    // Abort the current request using AbortController
    if (abortController) {
      abortController.abort();
    }
    
    // Reset states immediately to restore UI responsiveness
    setIsLoading(false);
    setIsTyping(false);
    setOrbAiState('default');
    
    // Reset abort flag after a short delay
    setTimeout(() => {
      setIsAborting(false);
    }, 1000);
  }, [abortController, isAborting]);

  const handleSendMessage = useCallback(async () => {
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
    setIsTyping(true);

    // Create user message object for display
    let userMessageDisplayContent = userMessageContent;
    let fileAttachment = null;
    const userMessageId = `user-${Date.now()}`; // Generate ID once
    
    if (selectedFile) {
      // Handle ALL files the same way - as attachments
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
        };        reader.readAsDataURL(selectedFile);
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

    // Handle ALL files the same way - as multimodal attachments
    if (!selectedFile) {
      // Pure text message - use text-only flow
      await sendTextMessage(userMessageContent, userMessageId);
    } else {
      // Multimodal message flow for ALL file types
      let chatSessionId = currentChatId;

      if (!chatSessionId) {        // For new chats, use the new create multimodal chat endpoint with streaming
        await handleNewMultimodalChatWithStream(userMessageContent, selectedFile, userMessageId);
      } else {
        // For existing chats, use streaming endpoint
        await handleMultimodalStream(chatSessionId, userMessageContent, selectedFile, userMessageId);
      }
    }

    // Clear input and file after sending
    setInputText('');
    setSelectedFile(null);
  }, [inputText, selectedFile, isLoading, abortController, currentChatId, selectedModelId, selectedModel, llmCapabilities, handleStopGeneration]);

  const handleKeyDown = useCallback((event) => {
    if (event.key === 'Enter' && event.shiftKey) {
      event.preventDefault();
      handleSendMessage();
    }
  }, [handleSendMessage]);
  const toggleChatHistory = useCallback(() => {
    setIsPanelOpen(!isPanelOpen);
  }, [isPanelOpen]);
  const handleSelectChat = useCallback(async (chatId) => {
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
    setIsTyping(false); // Ensure typing is false when loading history
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
                  (msg.content.content && Array.isArray(msg.content.content))));              if (isMultimodal) {
                // Use utility function to parse multimodal content
                console.log('Found multimodal content in history:', msg.content);
                try {
                  const parsedContent = parseMultimodalContent(msg.content);
                  console.log('Parsed multimodal content result:', parsedContent);
                  // Instead of JSON.stringify, preserve the structure for ContentRenderer to handle properly
                  processedContent = parsedContent;
                } catch (err) {
                  console.error('Error parsing multimodal content:', err);
                  // Fallback to original content if parsing fails
                  processedContent = msg.content;
                }
              }              return {
                id: msg.id,
                role: msg.role === 'agent' ? 'ai' : msg.role, // Normalize 'agent' to 'ai'
                content: processedContent,
                rawContent: msg.rawContent || msg.content, // Ensure rawContent is available for tool call processing
                timestamp: msg.timestamp,
                isFromHistory: true, // Add flag for history messages
                fileAttachment
              };
            });
          setMessages(sortedMessages);
        } else {
          setMessages([]);
        }
      }    } catch (error) {
      console.error('Error loading chat:', error);
      setMessages([{ id: 'error-load', role: 'system', content: 'Error loading chat. Please try again.' }]);
      setOrbAiState('criticalError'); // Use criticalError for load failures
    } finally {
      setIsLoading(false);
      setIsTyping(false); // Ensure typing is false after loading completes
    }  }, [isPanelOpen, toggleChatHistory]);

  // Helper function to send text-only messages
  const sendTextMessage = useCallback(async (messageContent, userMessageId) => {
    try {
      let chatSessionId = currentChatId;
      let isNewChat = false;

      // If no current chat, create one first
      if (!chatSessionId) {
        try {
          const data = await createNewChat(messageContent);
          if (data && data.result && data.result.id) {
            chatSessionId = data.result.id;
            setCurrentChatId(chatSessionId);
            isNewChat = true;
          } else {
            throw new Error('Failed to create new chat session');
          }
        } catch (err) {
          console.error('Error creating new chat:', err);
          setMessages(prev => [...prev, { 
            id: 'error-chat-creation', 
            role: 'system', 
            content: `Error: Could not create new chat session. ${err.message}` 
          }]);
          setOrbAiState('criticalError');
          setIsLoading(false);
          setIsTyping(false);
          return;
        }
      }

      // Create AbortController for this request
      const controller = new AbortController();
      setAbortController(controller);      // Start AI response
      const aiMessageId = `ai-${Date.now()}`;
      const aiMessage = { 
        id: aiMessageId, 
        role: 'ai', 
        content: '', 
        rawContent: '', // Initialize rawContent for tool call processing
        timestamp: new Date().toISOString() 
      };
      setMessages(prevMessages => [...prevMessages, aiMessage]);      // Log the model being used for debugging
      const modelId = getCurrentModelId();
      console.log('Sending text message with model ID:', modelId, 'selectedModel:', selectedModel, 'selectedModelId:', selectedModelId, 'chatId:', chatSessionId);

      // Stream the response using the existing chat streaming endpoint
      const response = await streamTextChatResponse(
        chatSessionId, 
        messageContent, 
        controller.signal,
        modelId
      );      if (!response.body) {
        console.error('No response body for streaming. Response:', response);
        const errorMessage = response.status ? `HTTP ${response.status}: ${response.statusText}` : 'Unknown error';
        setMessages(prevMessages => 
          prevMessages.map(msg => 
            msg.id === aiMessageId ? { ...msg, content: `Error: Did not receive a streamable response. ${errorMessage}`, rawContent: `Error: Did not receive a streamable response. ${errorMessage}` } : msg
          )
        );
        setOrbAiState('criticalError');
        setIsLoading(false);
        setIsTyping(false);
        return;
      }      setOrbAiState('output');
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let aiResponse = '';
        try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) {
            console.log('Text stream completed successfully. Final response length:', aiResponse.length);
            break;
          }
            const chunk = decoder.decode(value, { stream: true });
          aiResponse += chunk;
          setMessages(prevMessages => 
            prevMessages.map(msg => 
              msg.id === aiMessageId ? { ...msg, content: aiResponse, rawContent: aiResponse } : msg
            )
          );
        }
        
        // Note: AI response is automatically saved by the streaming endpoint
        // The backend may log "DUPLICATE MESSAGE DETECTED" but this is normal for streaming responses
        setOrbAiState('success');
      } catch (streamError) {
        if (streamError.name === 'AbortError') {
          console.log('Text stream reading aborted.');
          throw streamError;
        }        console.error("Error reading text stream:", streamError);
        setOrbAiState('criticalError');
        setMessages(prevMessages => 
          prevMessages.map(msg => 
            msg.id === aiMessageId ? { ...msg, content: msg.content + `\nError reading stream: ${streamError.message}`, rawContent: msg.content + `\nError reading stream: ${streamError.message}` } : msg
          )
        );
        return;
      }
      // Note: No need to refresh chat history for existing chats - messages are already displayed locally
    } catch (err) {
      console.error('Error in text message flow:', err);
      if (err.name === 'AbortError') {
        console.log('Text message request was aborted');
        setOrbAiState('default');
      } else {
        setMessages(prev => [...prev, { 
          id: 'error-text-response', 
          role: 'system', 
          content: `Error: ${err.message}` 
        }]);
        setOrbAiState('criticalError');
      }
    } finally {      setIsLoading(false);
      setIsTyping(false);
      setAbortController(null);
    }
  }, [currentChatId, selectedModel, selectedModelId, abortController]);

  // Helper function to handle multimodal streaming
  const handleMultimodalStream = useCallback(async (chatSessionId, textContent, file, userMessageId) => {
    const aiMessageId = `agent-${Date.now()}`;
    setMessages(prevMessages => [...prevMessages, { 
      id: aiMessageId, 
      role: 'ai', 
      content: '', 
      rawContent: '', // Initialize rawContent for tool call processing
      timestamp: new Date().toISOString() 
    }]);

    if (!chatSessionId) {
      console.error("Critical Error: chatSessionId is not set before streaming call.");
      setMessages(prev => [...prev, { id: 'error-stream-id', role: 'system', content: "Error: Chat session ID not available. Please try again." }]);
      setOrbAiState('criticalError');
      setIsLoading(false);
      setIsTyping(false);
      return;
    }

    const controller = new AbortController();
    setAbortController(controller);
      try {
      // Determine which model to use for multimodal content
      let defaultLlmId = getCurrentModelId();
        // Log the model being used for debugging
      console.log('Starting multimodal stream with model ID:', defaultLlmId, 'selectedModel:', selectedModel, 'selectedModelId:', selectedModelId);
      console.log('getCurrentModelId() returns:', getCurrentModelId());
        // Check if selected model supports the file type
      if (selectedModelId && selectedModel && file) {
        const fileType = file.type.startsWith('image/') ? 'image' : 
                        (file.type === 'application/pdf' ? 'pdf' : 
                        (file.type === 'text/plain' || file.name.endsWith('.txt') || file.name.endsWith('.md') ? 'text' : 'document'));
        
        const selectedSupportsFile = (fileType === 'image' && (selectedModel.supportsImage || selectedModel.capabilities?.image)) ||
                                   (fileType === 'pdf' && (selectedModel.supportsPdf || selectedModel.capabilities?.pdf)) ||
                                   (fileType === 'text' && (selectedModel.supportsText || selectedModel.capabilities?.text)) ||
                                   (fileType === 'document' && (selectedModel.supportsDocument || selectedModel.capabilities?.document));
          if (!selectedSupportsFile && llmCapabilities.length > 0) {
          console.warn(`Selected model (${selectedModel.name || defaultLlmId}) may not support ${fileType} files, but proceeding with user's choice.`);
          // Removed automatic fallback - trust user's model selection
        }
      } else if (llmCapabilities.length > 0) {
        console.log('No specific model selected, using getCurrentModelId():', defaultLlmId);
      }// OVERRIDE: Force using user's selected model (disable fallback logic for debugging)
      console.log('FORCING MODEL SELECTION - Using defaultLlmId:', defaultLlmId);
      // Skip all capability checking and fallback logic for now

      const response = await streamMultimodalMessage(chatSessionId, textContent, file, controller.signal, defaultLlmId);

      if (!response.body) {
        console.error('No response body for multimodal streaming. Response:', response);
        const errorMessage = response.status ? `HTTP ${response.status}: ${response.statusText}` : 'Unknown error';
        setMessages(prevMessages => 
          prevMessages.map(msg => 
            msg.id === aiMessageId ? { ...msg, content: `Error: Did not receive a streamable response. ${errorMessage}` } : msg
          )
        );
        setOrbAiState('criticalError');
        return;
      }

      setOrbAiState('output');
      const reader = response.body.getReader();      const decoder = new TextDecoder();
      
      try {        while (true) {
          const { done, value } = await reader.read();          if (done) {
            console.log('Multimodal stream completed successfully.');
            // Note: AI response is automatically saved by the streaming endpoint
            break;
          }
            const chunk = decoder.decode(value, { stream: true });          setMessages(prevMessages => 
            prevMessages.map(msg => 
              msg.id === aiMessageId ? { ...msg, content: msg.content + chunk, rawContent: msg.content + chunk } : msg
            )
          );
        }
        
        setOrbAiState('success');
        // Note: No need to refresh chat history for existing chats - messages are already displayed locally
      } catch (streamError) {
        if (streamError.name === 'AbortError') {
          console.log('Stream reading aborted.');
          throw streamError;
        }        console.error("Error reading stream:", streamError);
        setOrbAiState('criticalError');
        setMessages(prevMessages => 
          prevMessages.map(msg => 
            msg.id === aiMessageId ? { ...msg, content: msg.content + `\nError reading stream: ${streamError.message}` } : msg
          )
        );
        return;
      }
    } catch (error) {
      if (error.name === 'AbortError') {
        console.log('Multimodal stream fetch aborted by user.');
        setOrbAiState('default');      } else {
        console.error('Error in multimodal stream:', error);
        setMessages(prevMessages =>
          prevMessages.map(msg =>
            msg.id === aiMessageId ? { ...msg, content: `Error: ${error.message}` } : msg
          )
        );
        setOrbAiState('criticalError');
      }
    } finally {      setIsLoading(false);
      setIsTyping(false);
      setAbortController(null);    }
  }, [selectedModel, selectedModelId, llmCapabilities, abortController]);
  // Helper function to handle new multimodal chat creation with streaming
  const handleNewMultimodalChatWithStream = useCallback(async (textContent, file, userMessageId) => {
    const aiMessageId = `agent-${Date.now()}`;
    setMessages(prevMessages => [...prevMessages, { 
      id: aiMessageId, 
      role: 'ai', 
      content: '', 
      rawContent: '', // Initialize rawContent for tool call processing
      timestamp: new Date().toISOString() 
    }]);

    const controller = new AbortController();
    setAbortController(controller);
      try {
      // Determine which model to use for multimodal content
      let defaultLlmId = getCurrentModelId();
      
      // Log the model being used for debugging
      console.log('Creating new multimodal chat with model ID:', defaultLlmId, 'selectedModel:', selectedModel, 'selectedModelId:', selectedModelId);
      console.log('getCurrentModelId() returns:', getCurrentModelId());
      
      // Check if selected model supports the file type
      if (selectedModelId && selectedModel && file) {
        const fileType = file.type.startsWith('image/') ? 'image' : 
                        (file.type === 'application/pdf' ? 'pdf' : 
                        (file.type === 'text/plain' || file.name.endsWith('.txt') || file.name.endsWith('.md') ? 'text' : 'document'));
        
        const selectedSupportsFile = (fileType === 'image' && (selectedModel.supportsImage || selectedModel.capabilities?.image)) ||
                                   (fileType === 'pdf' && (selectedModel.supportsPdf || selectedModel.capabilities?.pdf)) ||
                                   (fileType === 'text' && (selectedModel.supportsText || selectedModel.capabilities?.text)) ||
                                   (fileType === 'document' && (selectedModel.supportsDocument || selectedModel.capabilities?.document));
          if (!selectedSupportsFile && llmCapabilities.length > 0) {
          console.warn(`Selected model (${selectedModel.name || defaultLlmId}) may not support ${fileType} files, but proceeding with user's choice.`);
          // Removed automatic fallback - trust user's model selection
        }
      } else if (llmCapabilities.length > 0) {
        console.log('No specific model selected, using getCurrentModelId():', defaultLlmId);
      }

      console.log('Final model ID for new multimodal chat:', defaultLlmId);
      // Skip all capability checking and fallback logic for now

      const response = await createMultimodalChatWithStream(textContent, file, controller.signal, defaultLlmId);if (!response.body) {
        console.error('No response body for multimodal chat creation. Response:', response);
        const errorMessage = response.status ? `HTTP ${response.status}: ${response.statusText}` : 'Unknown error';
        setMessages(prevMessages => 
          prevMessages.map(msg => 
            msg.id === aiMessageId ? { ...msg, content: `Error: Did not receive a streamable response. ${errorMessage}` } : msg
          )
        );
        setOrbAiState('criticalError');
        return;
      }

      // Extract chat ID from response headers
      const chatId = response.headers.get('X-Chat-Id');
      if (chatId) {
        setCurrentChatId(chatId);
        setSelectedChatId(chatId);
        setRefreshHistoryKey(Date.now());
        console.log('Received chat ID from header:', chatId);
      } else {
        console.warn('No chat ID received in response headers');
      }

      setOrbAiState('output');
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let aiResponse = '';
      
      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) {
            break;
          }
            const chunk = decoder.decode(value, { stream: true });
          aiResponse += chunk;
          setMessages(prevMessages => 
            prevMessages.map( msg => 
              msg.id === aiMessageId ? { ...msg, content: aiResponse, rawContent: aiResponse } : msg
            )
          );
        }
        
        setOrbAiState('success');
        console.log('New multimodal chat created successfully with ID:', chatId);
      } catch (streamError) {
        if (streamError.name === 'AbortError') {
          console.log('New multimodal chat stream reading aborted.');
          throw streamError;
        }
        console.error("Error reading new multimodal chat stream:", streamError);
        setOrbAiState('criticalError');
        setMessages(prevMessages => 
          prevMessages.map(msg => 
            msg.id === aiMessageId ? { ...msg, content: aiResponse + `\nError reading stream: ${streamError.message}` } : msg
          )
        );
        return;
      }
    } catch (error) {
      if (error.name === 'AbortError') {
        console.log('New multimodal chat creation aborted by user.');
        setOrbAiState('default');
      } else {
        console.error('Error creating new multimodal chat:', error);
        setMessages(prevMessages =>
          prevMessages.map( msg =>
            msg.id === aiMessageId ? { ...msg, content: `Error: ${error.message}` } : msg
          )
        );
        setOrbAiState('criticalError');
      }
    } finally {      setIsLoading(false);
      setIsTyping(false);
      setAbortController(null);
    }
  }, [selectedModel, selectedModelId, llmCapabilities, currentChatId, setCurrentChatId, setSelectedChatId, setRefreshHistoryKey]);
  
  // Helper function to consistently get model ID from a model object
  const getModelId = (model) => {
    if (!model) return null;
    // Different backends might use different field names for model ID
    return model.id || model.llmId || model.modelId || model.model_id || null;
  };
  // Helper function to get the current selected model ID
  const getCurrentModelId = () => {
    // Debug logging to track state
    console.log('getCurrentModelId - selectedModel:', selectedModel, 'selectedModelId:', selectedModelId);
    
    if (selectedModel) {
      const modelId = getModelId(selectedModel);
      if (modelId) {
        console.log('Using model ID from selectedModel:', modelId);
        return modelId;
      }
    }
    
    const fallbackId = selectedModelId || '1';
    console.log('Using fallback model ID:', fallbackId);
    return fallbackId;
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

      <div className={`chat-container ${isPanelOpen ? 'panel-open' : ''}`}>        <div className="App-header">
          <button
            className="new-chat-header-button"
            onClick={handleClearChat}
            disabled={isLoading || currentChatId === null}
            title={currentChatId === null ? "Cannot create new chat while current one is unsaved" : "Start a new chat session"}
          >
            New Chat
          </button>
          <ModelSelector
            llmCapabilities={llmCapabilities}
            selectedModelId={selectedModelId}
            onModelChange={handleModelChange}
            disabled={isLoading}
          />
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
          </button>        </div>        <div className="messages-container">          {messages.map((message, index) => (            <MessageCard 
              key={message.id || index} 
              role={message.role} 
              content={message.content}
              rawContent={message.rawContent}
              timestamp={message.timestamp}
              isFromHistory={message.isFromHistory}
              isTyping={isTyping && index === messages.length - 1 && message.role === 'ai'} // Only set isTyping for the last AI message
              fileAttachment={message.fileAttachment}
              onOrbStateChange={setOrbAiState}
            />
          ))}
          
          <div ref={messagesEndRef} />
        </div>          <UserInput
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
          selectedModel={selectedModel}
        />      </div>
    </div>
  );
}

export default App;
