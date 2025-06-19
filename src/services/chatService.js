import { getBackendUrl } from '../config/apiConfig';

// Helper function to convert a file to ByteData (ArrayBuffer)
// Returns a Promise that resolves with the file's raw binary data
const fileToByteData = (file) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsArrayBuffer(file);
    reader.onload = () => {
      resolve(reader.result);
    };
    reader.onerror = (error) => reject(error);
  });
};

const getAuthHeaders = () => ({
  'Authorization': `Bearer ${localStorage.getItem('access_token')}`,
  'Content-Type': 'application/json'
});

// Enhanced function to get auth headers with custom content type
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

// Create new text-only chat with streaming response
export const createTextChatWithStream = async (userMessageContent, signal, llmId = '1') => {
  console.log('Creating text chat with streaming response, LLM ID:', llmId);
  
  // Use the text-only chat creation endpoint that streams the response with llmId as query parameter
  const url = `${getBackendUrl()}/chat-stream?llmId=${encodeURIComponent(llmId)}`;
  const response = await fetch(url, {
    method: 'POST',
    headers: getAuthHeadersWithContentType('text/plain'),
    body: userMessageContent,
    signal,
  });

  console.log('Text chat creation response status:', response.status);
  console.log('Text chat creation response headers:', Object.fromEntries(response.headers.entries()));

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`HTTP error! status: ${response.status} - ${errorText || 'No error message'}`);
  }
  return response; // Return the raw response for stream processing
};

// Stream message in existing text chat
export const streamTextChatResponse = async (chatSessionId, userMessageContent, signal, llmId = '1') => {
  console.log('Streaming text response with LLM ID:', llmId, 'and Chat ID:', chatSessionId);
  
  // Use the existing chat streaming endpoint with llmId as query parameter
  const url = `${getBackendUrl()}/chats/${chatSessionId}/message/stream?llmId=${encodeURIComponent(llmId)}`;
  const response = await fetch(url, {
    method: 'POST',
    headers: getAuthHeadersWithContentType('text/plain'),
    body: userMessageContent,
    signal,
  });

  console.log('Text stream response status:', response.status);
  console.log('Text stream response headers:', Object.fromEntries(response.headers.entries()));

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`HTTP error! status: ${response.status} - ${errorText || 'No error message'}`);
  }
  return response; // Return the raw response for stream processing
};

// New function to create multimodal chat with streaming response
// Sends files as ByteData with type information via FormData
// Uses the following format:
// - file: ByteData (ArrayBuffer) of the file content
// - fileName: String with the file name
// - fileType: String with the file type (e.g., "application/pdf")
// - fileSize: Number representing the file size
// - prompt: String with the text prompt for the LLM
export const createMultimodalChatWithStream = async (textContent, file, signal, llmId = '1') => {
  // Create a FormData object for multipart/form-data
  const formData = new FormData();
  // Add the file as raw binary data
  if (file) {
    try {
      // Convert file to ByteData (ArrayBuffer)
      const byteData = await fileToByteData(file);
      // Create a Blob from the ArrayBuffer
      const blob = new Blob([byteData], { type: file.type });
      formData.append('file', blob, file.name);
      formData.append('fileName', file.name);
      formData.append('fileType', file.type);
      formData.append('fileSize', file.size.toString());
    } catch (error) {
      console.error('Error converting file to ByteData:', error);
      throw new Error('Failed to convert file to ByteData');
    }
  }
    // Add text content if present
  if (textContent && textContent.trim()) {
    formData.append('prompt', textContent);
  }
  
  // Add the llmId parameter
  formData.append('llmId', llmId);
  console.log('Creating multimodal chat with LLM ID:', llmId);
  console.log('File info (ByteData):', file ? `${file.name} (${file.type}, ${file.size} bytes)` : 'No file');
  console.log('FormData entries:', Array.from(formData.entries())
    .filter(([key]) => key !== 'file') // Don't log the entire file binary data
    .map(([key, value]) => [key, value]));
    // Use the new create multimodal chat endpoint with streaming
  const response = await fetch(`${getBackendUrl()}/create-stream-multimodal-chat`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${localStorage.getItem('access_token')}`,
      // Let the browser set the correct Content-Type with boundary for FormData
    },
    body: formData,
    signal,
  });

  console.log('Create multimodal chat response status:', response.status);
  console.log('Create multimodal chat response headers:', Object.fromEntries(response.headers.entries()));

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`HTTP error! status: ${response.status} - ${errorText || 'No error message'}`);
  }
  
  return response; // Return the raw response for stream processing
};

// Send multimodal message to an existing chat with streaming response
// Sends files as ByteData with type information via FormData
// Uses the following format:
// - file: ByteData (ArrayBuffer) of the file content
// - fileName: String with the file name
// - fileType: String with the file type (e.g., "application/pdf")
// - fileSize: Number representing the file size
// - prompt: String with the text prompt for the LLM
// - chatId: ID of the existing chat
// - llmId: ID of the language model to use
export const streamMultimodalMessage = async (chatId, textContent, file, signal, llmId = '1') => {
  const formData = new FormData();
    // Add the file as raw binary data
  if (file) {
    try {
      // Convert file to ByteData (ArrayBuffer)
      const byteData = await fileToByteData(file);
      // Create a Blob from the ArrayBuffer
      const blob = new Blob([byteData], { type: file.type });
      formData.append('file', blob, file.name);
      formData.append('fileName', file.name);
      formData.append('fileType', file.type);
      formData.append('fileSize', file.size.toString());
    } catch (error) {
      console.error('Error converting file to ByteData:', error);
      throw new Error('Failed to convert file to ByteData');
    }
  }
    if (textContent && textContent.trim()) {
    formData.append('prompt', textContent);
  }
  
  formData.append('llmId', llmId);
  formData.append('chatId', chatId);
  console.log('Streaming multimodal message to existing chat:', chatId, 'with LLM ID:', llmId);
  console.log('File info (ByteData):', file ? `${file.name} (${file.type}, ${file.size} bytes)` : 'No file');
  
  const response = await fetch(`${getBackendUrl()}/chat-stream-multimodal`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${localStorage.getItem('access_token')}`,
    },
    body: formData,
    signal,
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`HTTP error! status: ${response.status} - ${errorText || 'No error message'}`);
  }
  
  return response;
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
  if (typeof content === 'string') {
    // Handle the "Multimodal content: ArrayList" case
    if (content.includes('Multimodal content:') && content.includes('ArrayList')) {
      // Return a placeholder structure
      return [
        {
          type: 'text',
          text: '📎 *This message contained files that cannot be displayed due to a data format issue*'
        }
      ];
    }
      // Handle the format like "[{type=text, text=...}, {type=image_url, file_url={url=...}}]"
    if (content.includes('type=') && (content.includes('image_url') || content.includes('file_url'))) {
      console.log('Parsing malformed multimodal content:', content);
      
      try {        // Convert the malformed format to proper JSON
        let jsonString = content
          // Replace equals with colons for object properties
          .replace(/(\w+)=/g, '"$1":')
          // Fix the nested object structure for file_url
          .replace(/file_url:\{/g, '"file_url":{')
          .replace(/image_url:\{/g, '"image_url":{')          // Handle data URLs specially - improved to capture complete base64 strings without truncation
          .replace(/url=(data:image\/[^,]+,[\w+/=]+)/g, (match, dataUrl) => {
            return 'url="' + dataUrl.trim() + '"';
          })
          // Then handle other data URL patterns
          .replace(/:\s*(data:[^,}\]]*,[\w+/=]*)/g, (match, dataUrl) => {
            return ':"' + dataUrl.trim() + '"';
          })
          // Add quotes around other values that aren't already quoted
          .replace(/:\s*([^",\[\]{}][^,\[\]{}]*?)([,\]}])/g, (match, value, delimiter) => {
            const trimmedValue = value.trim();
            // Skip if already processed as data URL or if it's already quoted, a number, boolean, or null
            if (trimmedValue.startsWith('"') || trimmedValue.startsWith('data:') || 
                /^(true|false|null|\d+(\.\d+)?)$/.test(trimmedValue)) {
              return ':' + trimmedValue + delimiter;
            }
            return ':"' + trimmedValue + '"' + delimiter;
          });
        
        console.log('Attempting to parse transformed content:', jsonString);
        const parsed = JSON.parse(jsonString);
        
        if (Array.isArray(parsed)) {
          console.log('Successfully parsed as array:', parsed);
          return parsed;
        }
        if (parsed.content && Array.isArray(parsed.content)) {
          console.log('Successfully parsed with content property:', parsed.content);
          return parsed.content;
        }
      } catch (e) {
        console.warn('Failed to parse malformed multimodal content, trying fallback extraction:', e);
        console.warn('Original content:', content);
          // Fallback: try to extract text and image information manually
        const parts = [];
          // Extract text parts - improved regex to handle quotes and special characters
        const textPattern = /text=([^,\]]*?)(?=[,\]]|(?:,\s*type=))/g;
        let textMatch;
        while ((textMatch = textPattern.exec(content)) !== null) {
          let text = textMatch[1].trim();
          // Remove surrounding quotes and clean up
          text = text.replace(/^["']|["']$/g, '').replace(/\}$/, '');
          if (text && text !== 'null' && text !== '') {
            parts.push({ type: 'text', text: text });
          }
        }        // Extract image parts - comprehensive patterns for different structures        // Pattern 1: type=image_url with nested file_url={url=...} - improved base64 capture
        const imageUrlWithFileUrlPattern = /type=image_url[^}]*file_url=\{url=(data:image\/[^,]+,[\w+/=]*)/g;
        let match1;
        while ((match1 = imageUrlWithFileUrlPattern.exec(content)) !== null) {
          const url = match1[1].trim();
          if (url) {
            console.log('Pattern 1 found image URL:', url.substring(0, 50) + '...');
            parts.push({ 
              type: 'image_url', 
              image_url: { url: url, detail: 'auto' } 
            });
          }
        }        // Pattern 2: type=image_url with direct image_url={url=...} - improved base64 capture
        const imageUrlDirectPattern = /type=image_url[^}]*image_url=\{url=(data:image\/[^,]+,[\w+/=]*)/g;
        let match2;
        while ((match2 = imageUrlDirectPattern.exec(content)) !== null) {
          const url = match2[1].trim();
          if (url && !parts.some(p => p.image_url?.url === url)) {
            console.log('Pattern 2 found image URL:', url.substring(0, 50) + '...');
            parts.push({ 
              type: 'image_url', 
              image_url: { url: url, detail: 'auto' } 
            });
          }
        }        // Pattern 3: Any file_url or image_url with url= containing image data - improved base64 capture
        const anyImagePattern = /(?:file_url|image_url)=\{url=(data:image\/[^,]+,[\w+/=]*)/g;
        let match3;
        while ((match3 = anyImagePattern.exec(content)) !== null) {
          const url = match3[1].trim();
          if (url && !parts.some(p => p.image_url?.url === url)) {
            console.log('Pattern 3 found image URL:', url.substring(0, 50) + '...');
            parts.push({ 
              type: 'image_url', 
              image_url: { url: url, detail: 'auto' } 
            });
          }
        }        // Pattern 4: Direct url=data:image/... pattern - improved to capture complete base64 data
        const directImagePattern = /url=(data:image\/[^,]+,[\w+/=]*)/g;
        let match4;
        while ((match4 = directImagePattern.exec(content)) !== null) {
          const url = match4[1].trim();
          if (url && !parts.some(p => p.image_url?.url === url)) {
            console.log('Pattern 4 found image URL:', url.substring(0, 50) + '...');
            parts.push({ 
              type: 'image_url', 
              image_url: { url: url, detail: 'auto' } 
            });
          }
        }
          // Extract file parts - improved to handle different file formats
        const filePattern = /url=(data:(?:application|text)\/[^}]+)/g;
        let fileMatch;
        while ((fileMatch = filePattern.exec(content)) !== null) {
          const url = fileMatch[1].trim();
          if (url) {
            console.log('Found file URL:', url.substring(0, 50) + '...');
            parts.push({ 
              type: 'file_url', 
              file_url: { url: url, detail: 'auto' } 
            });
          }
        }
        console.log('Fallback extraction - found text parts:', parts.filter(p => p.type === 'text'));
        console.log('Fallback extraction - found image parts:', parts.filter(p => p.type === 'image_url'));
        
        if (parts.length > 0) {
          console.log('Fallback extraction successful. Found parts:', parts);
          return parts;
        } else {
          console.warn('Fallback extraction found no parts');
        }
      }
    }
    
    // Try to parse as regular JSON
    if (content.trim().startsWith('[') || content.trim().startsWith('{')) {
      try {
        const parsed = JSON.parse(content);
        if (Array.isArray(parsed)) {
          return parsed;
        }
        if (parsed.content && Array.isArray(parsed.content)) {
          return parsed.content;
        }
      } catch (e) {
        // Silent fallback for JSON parsing errors
      }
    }
  }
  
  // If all else fails, return content as text
  return [{ type: 'text', text: normalizeMarkdownContent(content) || '' }];
};

// Utility function to normalize markdown content for better rendering
export const normalizeMarkdownContent = (text) => {
  if (typeof text !== 'string') return text;
  
  // First, protect existing LaTeX delimiters from being modified
  const latexPlaceholders = [];
  let placeholderCounter = 0;
  
  // Protect inline math $...$
  text = text.replace(/\$([^$]+)\$/g, (match) => {
    const placeholder = `__LATEX_INLINE_${placeholderCounter++}__`;
    latexPlaceholders.push({ placeholder, content: match });
    return placeholder;
  });
  
  // Protect block math $$...$$
  text = text.replace(/\$\$([^$]+)\$\$/g, (match) => {
    const placeholder = `__LATEX_BLOCK_${placeholderCounter++}__`;
    latexPlaceholders.push({ placeholder, content: match });
    return placeholder;
  });
  // Handle common LaTeX commands that appear without delimiters
  // Convert \boxed{...} to $\boxed{\text{...}}$ for proper text rendering
  text = text.replace(/\\boxed\{([^{}]*(?:\{[^{}]*\}[^{}]*)*)\}/g, (match, content) => {
    // If the content looks like math (contains math symbols), keep it as is
    const mathSymbols = /[+\-*/=<>^_{}\\]|\\[a-zA-Z]+/;
    if (mathSymbols.test(content)) {
      return `$\\boxed{${content}}$`;
    } else {
      // For regular text, wrap it in \text{} to preserve spacing
      return `$\\boxed{\\text{${content}}}$`;
    }
  });
  
  // Convert standalone LaTeX commands (only if not already in math mode)
  const latexCommands = ['frac', 'sqrt', 'sum', 'int', 'lim', 'sin', 'cos', 'tan', 'log', 'ln', 'exp', 'alpha', 'beta', 'gamma', 'delta', 'epsilon', 'theta', 'lambda', 'mu', 'pi', 'sigma', 'phi', 'psi', 'omega'];
  latexCommands.forEach(cmd => {
    // Match \command{...} or \command not already in math delimiters
    const regex = new RegExp(`(?<!\\$[^$]*)\\\\${cmd}(?:\\{[^}]*\\}|\\b)(?![^$]*\\$)`, 'g');
    text = text.replace(regex, (match) => {
      // Check if this match is already inside a placeholder (protected)
      const isProtected = latexPlaceholders.some(item => item.content.includes(match));
      return isProtected ? match : `$${match}$`;
    });
  });
  
  // Fix markdown headers without proper spacing after hashes
  // Convert: ###Title -> ### Title
  text = text.replace(/^(#{1,6})([^\s#])/gm, '$1 $2');
  
  // Handle --- headers specifically
  // This ensures that lines like "--- ### 1." are properly rendered
  text = text.replace(/^(---\s*)(#+)(\s*\d+\.)/gm, '$1\n$2$3');
  
  // Ensure proper spacing after horizontal rules
  text = text.replace(/^(---\s*)$/gm, '$1\n');
  
  // Ensure proper line breaks for list items and paragraphs
  // Add double spaces at the end of lines that should have a line break
  text = text.replace(/^(-|\d+\.)\s+(.+)$/gm, '$1 $2  ');
  
  // Preserve line breaks between different sections
  text = text.replace(/\n(\s*)(#{1,6})\s+/g, '\n\n$1$2 ');
  
  // Restore protected LaTeX content
  latexPlaceholders.forEach(({ placeholder, content }) => {
    text = text.replace(placeholder, content);
  });
  
  return text;
};

// Utility function to apply capability overrides to models
export const applyCapabilityOverrides = (models) => {
  const savedOverrides = localStorage.getItem('capabilityOverrides');
  if (!savedOverrides) {
    return models; // No overrides, return original models
  }
  
  try {
    const overrides = JSON.parse(savedOverrides);
    
    return models.map(model => {
      const modelOverrides = overrides[model.id];
      if (!modelOverrides) {
        return model; // No overrides for this model
      }
      
      // Create a new model object with overridden capabilities
      const overriddenModel = { ...model };
      
      // Apply disabled override
      if (modelOverrides.disabled !== undefined) {
        overriddenModel.disabled = modelOverrides.disabled;
      }
      
      // Apply text capability override
      if (modelOverrides.text !== undefined) {
        overriddenModel.supportsText = modelOverrides.text;
        if (overriddenModel.capabilities) {
          overriddenModel.capabilities.text = modelOverrides.text;
        }
      }
      
      // Apply image capability override
      if (modelOverrides.image !== undefined) {
        overriddenModel.supportsImage = modelOverrides.image;
        if (overriddenModel.capabilities) {
          overriddenModel.capabilities.image = modelOverrides.image;
        }
      }
      
      // Apply PDF capability override
      if (modelOverrides.pdf !== undefined) {
        overriddenModel.supportsPdf = modelOverrides.pdf;
        if (overriddenModel.capabilities) {
          overriddenModel.capabilities.pdf = modelOverrides.pdf;
        }
      }
      
      // Apply tools capability override
      if (modelOverrides.tools !== undefined) {
        overriddenModel.supportsTools = modelOverrides.tools;
        if (overriddenModel.capabilities) {
          overriddenModel.capabilities.tools = modelOverrides.tools;
        }
      }
      
      return overriddenModel;
    }).filter(model => !model.disabled); // Filter out disabled models
  } catch (error) {
    console.error('Error applying capability overrides:', error);
    return models; // Return original models if there's an error
  }
};

// Enhanced function to fetch LLM capabilities with overrides applied
export const fetchLlmCapabilitiesWithOverrides = async () => {
  const models = await fetchLlmCapabilities();
  let processedModels;
  
  if (Array.isArray(models)) {
    processedModels = models;
  } else if (models && models.result && Array.isArray(models.result)) {
    processedModels = models.result;
  } else {
    return models; // Return as-is if format is unexpected
  }
  
  const overriddenModels = applyCapabilityOverrides(processedModels);
  
  // Return in the same format as received
  if (Array.isArray(models)) {
    return overriddenModels;
  } else {
    return { ...models, result: overriddenModels };
  }
};
