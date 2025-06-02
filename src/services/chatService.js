import { getBackendUrl } from '../config/apiConfig';

const getAuthHeaders = () => ({
  'Authorization': `Bearer ${localStorage.getItem('access_token')}`,
  'Content-Type': 'application/json'
});

// Helper function to get auth headers with custom content type
const getAuthHeadersWithContentType = (contentType) => ({
  'Authorization': `Bearer ${localStorage.getItem('access_token')}`,
  'Content-Type': contentType
});

const handleResponse = async (response) => {
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ message: `HTTP error ${response.status} and failed to parse error JSON.` }));
    throw new Error(errorData.message || `HTTP error ${response.status}`);
  }
  return response.json();
};

export const createNewChat = async (userMessageContent) => {
  // Handle if userMessageContent is a string or an object
  const payload = typeof userMessageContent === 'string' 
    ? {
        role: 'user',
        contentType: 'text/plain',
        content: userMessageContent
      }
    : userMessageContent;

  const response = await fetch(`${getBackendUrl()}/chats/create`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify(payload),
  });
  return handleResponse(response);
};

// New function to create a multimodal chat
export const createNewMultimodalChat = async (messageData) => {
  const response = await fetch(`${getBackendUrl()}/chats/create`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify(messageData),
  });
  return handleResponse(response);
};

export const saveUserMessage = async (chatSessionId, userMessageContent) => {
  const response = await fetch(`${getBackendUrl()}/chats/${chatSessionId}/messages`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify({ content: userMessageContent, role: 'user' }),
  });
  // For saving messages, we might not always need to parse a JSON response if backend sends 204 or similar
  if (!response.ok) {
    const errorData = await response.text().catch(() => `HTTP error ${response.status}`);
    throw new Error(errorData || `HTTP error ${response.status}`);
  }
  // If there's a body, try to parse, otherwise return status or a success indicator
  const contentType = response.headers.get("content-type");
  if (contentType && contentType.indexOf("application/json") !== -1) {
    return response.json();
  }
  return { status: response.status, ok: response.ok }; 
};

// New function to save a multimodal user message
export const saveMultimodalUserMessage = async (chatSessionId, messageData) => {
  const response = await fetch(`${getBackendUrl()}/chats/${chatSessionId}/messages`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify(messageData),
  });
  
  if (!response.ok) {
    const errorData = await response.text().catch(() => `HTTP error ${response.status}`);
    throw new Error(errorData || `HTTP error ${response.status}`);
  }
  
  const contentType = response.headers.get("content-type");
  if (contentType && contentType.indexOf("application/json") !== -1) {
    return response.json();
  }
  return { status: response.status, ok: response.ok };
};

export const streamChatResponse = async (chatSessionId, userMessageContent, signal) => { // Added signal parameter
  const response = await fetch(`${getBackendUrl()}/chats/${chatSessionId}/message/stream`, {
    method: 'POST',
    headers: {
      ...getAuthHeaders(),
      'Content-Type': 'text/plain', // Override for this specific endpoint
    },
    body: userMessageContent,
    signal, // Pass the signal to the fetch request
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`HTTP error! status: ${response.status} - ${errorText || 'No error message'}`);
  }
  return response; // Return the raw response for stream processing
};

// New function to stream multimodal chat response
export const streamMultimodalChatResponse = async (chatSessionId, messageData, signal, llmId = '1') => {
  // Create a FormData object for multipart/form-data
  const formData = new FormData();
  
  // If we have a file in the message data, add it to the form
  if (messageData.content && Array.isArray(messageData.content)) {
    // Find the file content (if any)
    const fileContent = messageData.content.find(item => 
      item.type === 'image_url' || item.type === 'file_url');
    
    // Find the text content (if any)
    const textContent = messageData.content.find(item => item.type === 'text');
    
    if (fileContent) {
      // Get the data URI
      const dataUri = fileContent.file_url?.url || fileContent.image_url?.url;
      if (dataUri) {
        // Convert data URI to Blob
        const byteString = atob(dataUri.split(',')[1]);
        const mimeType = dataUri.split(',')[0].split(':')[1].split(';')[0];
        const ab = new ArrayBuffer(byteString.length);
        const ia = new Uint8Array(ab);
        for (let i = 0; i < byteString.length; i++) {
          ia[i] = byteString.charCodeAt(i);
        }
        const blob = new Blob([ab], { type: mimeType });
        
        // Add the file to the form data
        formData.append('file', blob, 'attachment.' + mimeType.split('/')[1]);
      }
    }
    
    // Add text content if present
    if (textContent && textContent.text) {
      formData.append('prompt', textContent.text);
    }
  }
  
  // Add the llmId parameter as required by the backend
  formData.append('llmId', llmId);
  
  // Use the correct multimodal streaming endpoint
  const response = await fetch(`${getBackendUrl()}/chat-stream-multimodal`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${localStorage.getItem('access_token')}`,
      // Let the browser set the correct Content-Type with boundary for FormData
    },
    body: formData,
    signal,
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`HTTP error! status: ${response.status} - ${errorText || 'No error message'}`);
  }
  return response; // Return the raw response for stream processing
};

// Function to prepare a file for sending to the API
export const prepareFileForUpload = async (file) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      // Get base64 data
      const base64Data = reader.result.split(',')[1];
      
      // Determine the media type
      let mediaType = file.type;
      if (!mediaType && file.name.toLowerCase().endsWith('.pdf')) {
        mediaType = 'application/pdf';
      } else if (!mediaType && file.name.match(/\.(jpg|jpeg|png|gif|webp)$/i)) {
        mediaType = 'image/' + file.name.split('.').pop().toLowerCase();
      }
      
      // Create a content object in the format expected by the backend
      const contentObject = {
        type: mediaType.startsWith('image/') ? 'image_url' : 'file_url',
        file_url: {
          url: `data:${mediaType};base64,${base64Data}`,
          detail: "auto" // Let the LLM determine the detail level needed
        }
      };
      
      resolve(contentObject);
    };
    reader.onerror = (error) => reject(error);
    reader.readAsDataURL(file);
  });
};

// Function to create a multimodal message payload
export const createMultimodalMessagePayload = async (textContent, file = null) => {
  // If no file, return a simple text message
  if (!file) {
    return {
      role: 'user',
      contentType: 'text/plain',
      content: textContent
    };
  }
  
  try {
    // Prepare the file
    const fileContentObject = await prepareFileForUpload(file);
    
    // Create a multimodal message payload
    return {
      role: 'user',
      contentType: 'multipart/mixed',
      content: [
        { type: 'text', text: textContent || '' },
        fileContentObject
      ]
    };
  } catch (error) {
    console.error('Failed to prepare file for upload:', error);
    throw error;
  }
};

export const saveAgentResponse = async (chatSessionId, agentResponseContent) => {
  const response = await fetch(`${getBackendUrl()}/chats/${chatSessionId}/messages`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify({
      content: agentResponseContent.trim(),
      role: 'agent'
    }),
  });
  if (!response.ok) {
    const errorData = await response.text().catch(() => `HTTP error ${response.status}`);
    throw new Error(errorData || `HTTP error ${response.status}`);
  }
  const contentType = response.headers.get("content-type");
  if (contentType && contentType.indexOf("application/json") !== -1) {
    return response.json();
  }
  return { status: response.status, ok: response.ok }; 
};

export const abortStream = async (chatSessionId) => {
  // Assuming a new backend endpoint to notify about stream abortion
  const response = await fetch(`${getBackendUrl()}/chats/${chatSessionId}/message/stream/abort`, {
    method: 'POST', // Or 'DELETE', or appropriate method defined by your backend
    headers: getAuthHeaders(),
  });
  if (!response.ok) {
    const errorData = await response.text().catch(() => `HTTP error ${response.status}`);
    throw new Error(errorData || `HTTP error ${response.status} while aborting stream`);
  }
  // Check content type before parsing JSON, similar to other functions
  const contentType = response.headers.get("content-type");
  if (contentType && contentType.indexOf("application/json") !== -1) {
    return response.json();
  }
  return { status: response.status, ok: response.ok, message: 'Stream abortion signaled to backend.' };
};

export const fetchChatDetails = async (chatId) => {
  const response = await fetch(`${getBackendUrl()}/chats/${chatId}`, {
    headers: getAuthHeaders(),
  });
  return handleResponse(response);
};

export const deleteChat = async (chatIdToDelete) => {
  const response = await fetch(`${getBackendUrl()}/chats/${chatIdToDelete}`, {
    method: 'DELETE',
    headers: getAuthHeaders(),
  });
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ message: 'Failed to delete chat and parse error.' }));
    throw new Error(errorData.message || `HTTP error ${response.status}`);
  }
  // For DELETE, often there's no content, or a success message
  const contentType = response.headers.get("content-type");
  if (contentType && contentType.indexOf("application/json") !== -1) {
    return response.json(); 
  }
  return { status: response.status, ok: response.ok, message: 'Chat deleted successfully' };
};

export const fetchChatHistory = async () => {
  const response = await fetch(`${getBackendUrl()}/chats`, {
    headers: getAuthHeaders(),
  });
  return handleResponse(response);
};

// New function to fetch available LLM capabilities
export const fetchLlmCapabilities = async () => {
  const response = await fetch(`${getBackendUrl()}/llms/capabilities`, {
    headers: getAuthHeaders(),
  });
  return handleResponse(response);
};

// New function to check if a specific LLM supports a data type
export const checkLlmSupport = async (llmId, dataType) => {
  const response = await fetch(`${getBackendUrl()}/llms/${llmId}/supports/${dataType}`, {
    headers: getAuthHeaders(),
  });
  return handleResponse(response);
};

// Utility function to parse multimodal content from chat history
export const parseMultimodalContent = (content) => {
  // If content is already an array, return as-is
  if (Array.isArray(content)) {
    return content;
  }
  
  // If content is an object with a content property that's an array
  if (content && typeof content === 'object' && Array.isArray(content.content)) {
    return content.content;
  }
  
  // If content is a string, try to parse it
  if (typeof content === 'string') {    // Handle the "Multimodal content: ArrayList" case
    if (content.includes('Multimodal content:') && content.includes('ArrayList')) {
      // Return a placeholder structure
      return [
        {
          type: 'text',
          text: '📎 *This message contained files that cannot be displayed due to a data format issue*'
        }
      ];
    }
    
    // Try to parse as JSON
    if (content.trim().startsWith('[') || content.trim().startsWith('{')) {
      try {
        const parsed = JSON.parse(content);
        if (Array.isArray(parsed)) {
          return parsed;
        }        if (parsed.content && Array.isArray(parsed.content)) {
          return parsed.content;
        }
      } catch (e) {
        // Silent fallback for JSON parsing errors
      }
    }
  }
  
  // If all else fails, return content as text
  return [{ type: 'text', text: content || '' }];
};
