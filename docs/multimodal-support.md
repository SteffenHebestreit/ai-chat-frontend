# Multimodal Content Support - Frontend

The AI Research application now supports multimodal content (text, images, PDFs) in the chat interface. This feature allows users to upload and analyze visual content alongside text, with intelligent capability detection and seamless user experience.

![Image Support Demo](../Image_Support.png)

## Features

- **File Upload Support**: Images (JPEG, PNG, GIF, WebP) and PDFs with drag-and-drop interface
- **Rich File Previews**: Thumbnail previews and metadata display in chat messages
- **Smart Capability Detection**: Automatic LLM compatibility checking based on file type
- **Visual Warnings**: Clear indicators when file types aren't supported by the current LLM
- **Thinking Sections**: Collapsible AI reasoning display for transparency
- **Responsive Design**: Mobile-friendly file upload and preview components

## Implementation Details

### Frontend Components

- **FileUpload.jsx**: Drag-and-drop interface for file uploads
- **FileAttachment.jsx**: Displays file previews in messages
- **UserInput.jsx**: Enhanced with file upload toggle and capability warnings

### API Integration

The frontend leverages backend multimodal endpoints using these key functions:

- `createMultimodalMessagePayload()`: Prepares message objects with both text and file content
- `prepareFileForUpload()`: Converts files to base64 data URIs for API compatibility
- `streamMultimodalChatResponse()`: Streams responses for multimodal messages
- `fetchLlmCapabilities()`: Checks which LLMs support specific content types

### Capability Detection

The application automatically detects whether the selected LLM supports the uploaded file type:

1. When a file is uploaded, the application checks its MIME type
2. The app compares this against the capabilities of available LLMs
3. If no compatible LLM is found, a warning is displayed
4. Users can still send the message, but are informed of potential issues

## Usage

1. Click the attachment button (paperclip icon) in the chat input
2. Select or drag-and-drop an image or PDF file
3. (Optional) Add text to accompany the file
4. Send the message as usual

The file will be displayed in the chat interface and processed by the LLM.
