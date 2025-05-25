import { getBackendUrl } from '../config/apiConfig';

const getAuthHeaders = () => ({
  'Authorization': `Bearer ${localStorage.getItem('access_token')}`,
  'Content-Type': 'application/json'
});

const handleResponse = async (response) => {
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ message: `HTTP error ${response.status} and failed to parse error JSON.` }));
    throw new Error(errorData.message || `HTTP error ${response.status}`);
  }
  return response.json();
};

export const createNewChat = async (userMessageContent) => {
  const response = await fetch(`${getBackendUrl()}/chats/create`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify({
      role: 'user',
      contentType: 'text/plain',
      content: userMessageContent
    }),
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

export const streamChatResponse = async (chatSessionId, userMessageContent) => {
  const response = await fetch(`${getBackendUrl()}/chats/${chatSessionId}/message/stream`, {
    method: 'POST',
    headers: {
      ...getAuthHeaders(),
      'Content-Type': 'text/plain', // Override for this specific endpoint
    },
    body: userMessageContent,
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`HTTP error! status: ${response.status} - ${errorText || 'No error message'}`);
  }
  return response; // Return the raw response for stream processing
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
