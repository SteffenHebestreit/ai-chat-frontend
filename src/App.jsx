import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Canvas } from '@react-three/fiber';
import Orb from './components/Orb';
import ChatHistoryPanel from './components/ChatHistoryPanel';
import MessageCard from './components/MessageCard';
import UserInput from './components/UserInput';
import ModelSelector from './components/ModelSelector';
import {
  createNewChat,
  streamChatResponse,
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
      // Handle text files differently - read their content and include in message
      if (selectedFile.type === 'text/plain' || selectedFile.name.endsWith('.txt') || selectedFile.name.endsWith('.md')) {
        // Read text file content
        const reader = new FileReader();
        reader.onload = async (e) => {
          const fileContent = e.target.result;
          const combinedContent = userMessageContent 
            ? `${userMessageContent}\n\n--- Content from ${selectedFile.name} ---\n${fileContent}`
            : `--- Content from ${selectedFile.name} ---\n${fileContent}`;
          
          // Update the user message with file content
          setMessages(prevMessages => 
            prevMessages.map(msg => 
              msg.id === userMessageId 
                ? { ...msg, content: combinedContent }
                : msg
            )
          );
          
          // Proceed with sending the message with text content
          await sendTextMessage(combinedContent, userMessageId);
        };
        reader.readAsText(selectedFile);
        
        // For display purposes, show that file is being processed
        userMessageDisplayContent = userMessageContent
          ? `${userMessageContent}\n[Processing text file: ${selectedFile.name}]`
          : `[Processing text file: ${selectedFile.name}]`;
      } else {
        // Handle image/PDF files as before
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
    }
    
    const userMessage = { 
      id: userMessageId,
      role: 'user', 
      content: userMessageDisplayContent,
      timestamp: new Date().toISOString(),
      fileAttachment // This will be updated asynchronously for images with previewUrl
    };
    setMessages(prevMessages => [...prevMessages, userMessage]);
    
    // For text files, the sendTextMessage function is called asynchronously from the FileReader
    // For other files or no files, continue with the current flow
    const isTextFile = selectedFile && (selectedFile.type === 'text/plain' || selectedFile.name.endsWith('.txt') || selectedFile.name.endsWith('.md'));
    
    if (!selectedFile || !isTextFile) {
      // Handle regular text messages or multimodal (image/PDF) messages
      if (!selectedFile) {
        // Pure text message - use text-only flow
        await sendTextMessage(userMessageContent, userMessageId);
      } else {
        // Multimodal message flow for images/PDFs
        let chatSessionId = currentChatId;

        if (!chatSessionId) {
          // For new chats, use the new create multimodal chat endpoint with streaming
          await handleNewMultimodalChatWithStream(userMessageContent, selectedFile, userMessageId);
        } else {
          // For existing chats, use streaming endpoint
          await handleMultimodalStream(chatSessionId, userMessageContent, selectedFile, userMessageId);
        }
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
              }return {
                id: msg.id,
                role: msg.role === 'agent' ? 'ai' : msg.role, // Normalize 'agent' to 'ai'
                content: processedContent,
                rawContent: msg.rawContent || processedContent, // Use rawContent from backend if available
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
    }
  }, [isPanelOpen, toggleChatHistory]);
  // Helper function to send text-only messages
  const sendTextMessage = async (messageContent, userMessageId) => {
    try {
      let chatSessionId = currentChatId;
      let isNewChat = false;

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
      }      // Note: User message will be saved by the streaming endpoint

      // Create AbortController for this request
      const controller = new AbortController();
      setAbortController(controller);

      // Start AI response
      const aiMessageId = `ai-${Date.now()}`;
      const aiMessage = { id: aiMessageId, role: 'ai', content: '', timestamp: new Date().toISOString() };
      setMessages(prevMessages => [...prevMessages, aiMessage]);

      // Log the model being used for debugging
      const modelId = selectedModel?.id || selectedModelId || '1';
      console.log('Sending text message with model ID:', modelId, 'selectedModel:', selectedModel);      // Stream the response
      const response = await streamChatResponse(
        chatSessionId, 
        messageContent, 
        controller.signal,
        modelId
      );      if (!response.body) {
        console.error('No response body for streaming. Response:', response);
        const errorMessage = response.status ? `HTTP ${response.status}: ${response.statusText}` : 'Unknown error';
        setMessages(prevMessages => 
          prevMessages.map(msg => 
            msg.id === aiMessageId ? { ...msg, content: `Error: Did not receive a streamable response. ${errorMessage}` } : msg
          )
        );
        setOrbAiState('criticalError');
        setIsLoading(false);
        setIsTyping(false);
        return;
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
            prevMessages.map(msg => 
              msg.id === aiMessageId ? { ...msg, content: aiResponse } : msg
            )
          );        }
        
        // Note: AI response is automatically saved by the streaming endpoint
        setOrbAiState('success');
      } catch (streamError) {
        if (streamError.name === 'AbortError') {
          console.log('Text stream reading aborted.');
          throw streamError;
        }
        console.error("Error reading text stream:", streamError);
        setOrbAiState('criticalError');
        setMessages(prevMessages => 
          prevMessages.map(msg => 
            msg.id === aiMessageId ? { ...msg, content: msg.content + `\nError reading stream: ${streamError.message}` } : msg
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
    } finally {
      setIsLoading(false);
      setIsTyping(false);
      setAbortController(null);    }
  };

  // Helper function to handle multimodal streaming
  const handleMultimodalStream = async (chatSessionId, textContent, file, userMessageId) => {
    const aiMessageId = `agent-${Date.now()}`;
    setMessages(prevMessages => [...prevMessages, { 
      id: aiMessageId, 
      role: 'ai', 
      content: '', 
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
      let defaultLlmId = selectedModelId || '1';
      
      // Log the model being used for debugging
      console.log('Starting multimodal stream with initial model ID:', defaultLlmId, 'selectedModel:', selectedModel);
      
      // Check if selected model supports the file type
      if (selectedModelId && selectedModel && file) {
        const fileType = file.type.startsWith('image/') ? 'image' : 
                        (file.type === 'application/pdf' ? 'pdf' : 'unknown');
        
        const selectedSupportsFile = (fileType === 'image' && (selectedModel.supportsImage || selectedModel.capabilities?.image)) ||
                                   (fileType === 'pdf' && (selectedModel.supportsPdf || selectedModel.capabilities?.pdf));
        
        if (!selectedSupportsFile && llmCapabilities.length > 0) {
          // Find an LLM that supports the file type
          const capableLlm = llmCapabilities.find(llm => {
            if (fileType === 'image') {
              return llm.supportsImage || llm.capabilities?.image || 
                     (llm.supportedTypes && llm.supportedTypes.includes('image'));
            }
            if (fileType === 'pdf') {
              return llm.supportsPdf || llm.capabilities?.pdf ||
                     (llm.supportedTypes && llm.supportedTypes.includes('pdf'));
            }
            return false;
          });
          
          if (capableLlm) {
            defaultLlmId = capableLlm.id || capableLlm.llmId || '1';
            console.warn(`Selected model doesn't support ${fileType}, using ${capableLlm.name || defaultLlmId} instead`);
          }
        }
      } else if (llmCapabilities.length > 0) {
        // No model selected, find an appropriate one
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

      console.log('Final model ID for multimodal stream:', defaultLlmId);

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
      
      try {
        while (true) {
          const { done, value } = await reader.read();          if (done) {
            // Note: AI response is automatically saved by the streaming endpoint
            break;
          }
          
          const chunk = decoder.decode(value, { stream: true });          setMessages(prevMessages => 
            prevMessages.map(msg => 
              msg.id === aiMessageId ? { ...msg, content: msg.content + chunk } : msg
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
    } finally {
      setIsLoading(false);
      setIsTyping(false);
      setAbortController(null);    }
  };
  // Helper function to handle new multimodal chat creation with streaming
  const handleNewMultimodalChatWithStream = async (textContent, file, userMessageId) => {
    const aiMessageId = `agent-${Date.now()}`;
    setMessages(prevMessages => [...prevMessages, { 
      id: aiMessageId, 
      role: 'ai', 
      content: '', 
      timestamp: new Date().toISOString() 
    }]);

    const controller = new AbortController();
    setAbortController(controller);
    
    try {
      // Determine which model to use for multimodal content
      let defaultLlmId = selectedModelId || '1';
      
      // Log the model being used for debugging      console.log('Creating new multimodal chat with model ID:', defaultLlmId, 'selectedModel:', selectedModel);
      
      // Check if selected model supports the file type
      if (selectedModelId && selectedModel && file) {
        const fileType = file.type.startsWith('image/') ? 'image' : 
                        (file.type === 'application/pdf' ? 'pdf' : 'unknown');
        
        const selectedSupportsFile = (fileType === 'image' && (selectedModel.supportsImage || selectedModel.capabilities?.image)) ||
                                   (fileType === 'pdf' && (selectedModel.supportsPdf || selectedModel.capabilities?.pdf));
        
        if (!selectedSupportsFile && llmCapabilities.length > 0) {
          // Find an LLM that supports the file type
          const capableLlm = llmCapabilities.find(llm => {
            if (fileType === 'image') {
              return llm.supportsImage || llm.capabilities?.image || 
                     (llm.supportedTypes && llm.supportedTypes.includes('image'));
            }
            if (fileType === 'pdf') {
              return llm.supportsPdf || llm.capabilities?.pdf ||
                     (llm.supportedTypes && llm.supportedTypes.includes('pdf'));
            }
            return false;
          });
          
          if (capableLlm) {
            defaultLlmId = capableLlm.id || capableLlm.llmId || '1';
            console.warn(`Selected model doesn't support ${fileType}, using ${capableLlm.name || defaultLlmId} instead`);
          }
        }
      } else if (llmCapabilities.length > 0) {
        // No model selected, find an appropriate one
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

      console.log('Final model ID for new multimodal chat:', defaultLlmId);

      const response = await createMultimodalChatWithStream(textContent, file, controller.signal, defaultLlmId);      if (!response.body) {
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
              msg.id === aiMessageId ? { ...msg, content: aiResponse } : msg
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
    } finally {
      setIsLoading(false);
      setIsTyping(false);
      setAbortController(null);
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
