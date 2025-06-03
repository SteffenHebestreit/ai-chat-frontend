# Comprehensive Multimodal & Model Selection - Frontend

The AI Research application features comprehensive multimodal content support with intelligent model selection. Users can upload text files, images, and PDFs while the system automatically manages model compatibility and provides dynamic UI controls.

![Image Support Demo](../Image_Support.png)

## Key Features

### Model Selection & Intelligence
- **Dynamic Model Dropdown**: Real-time selection from available LLM models with capability detection
- **Capability Badges**: Visual indicators showing text (T), image (I), and PDF (P) support with flat monochrome design
- **Smart UI Controls**: File upload button visibility adapts to selected model capabilities
- **Automatic Fallback**: System selects compatible models when current selection doesn't support file type
- **Real-time Feedback**: Capability warnings and tooltips guide user interactions

### Comprehensive File Support
- **Text Files (.txt, .md)**: Direct content integration as message text rather than attachments
- **Images (JPEG, PNG, GIF, WebP)**: Multimodal processing with thumbnail previews
- **PDF Documents**: Document analysis with appropriate model routing
- **Smart Processing**: Different handling logic for text files vs. binary files
- **Drag-and-Drop Interface**: Intuitive upload with real-time validation and error handling

### User Experience Enhancements
- **Dynamic File Type Validation**: Error messages adapt based on selected model capabilities
- **Rich File Previews**: Appropriate icons and previews for different file types
- **Thinking Sections**: Collapsible AI reasoning display for transparency
- **Responsive Design**: Mobile-friendly interface with consistent capability indicators

## Implementation Details

### Frontend Components

#### Core Components
- **ModelSelector.jsx**: Dynamic model selection dropdown with capability badges and real-time switching
- **FileUpload.jsx**: Enhanced drag-and-drop interface supporting text files, images, and PDFs
- **UserInput.jsx**: Model-aware file upload integration with dynamic capability controls
- **FileAttachment.jsx**: Rich file preview display in chat messages
- **ContentRenderer.jsx**: Multimodal content rendering with thinking sections

#### Key Features
- **Dynamic File Types**: `getAcceptedFileTypes()` function adapts to selected model capabilities
- **Model Capability Detection**: Real-time checking of text, image, and PDF support
- **Separate Message Flows**: Distinct handling for text-only vs. multimodal content
- **Automatic Model Routing**: Smart selection of compatible models for file types

### API Integration

#### Enhanced Backend Communication
- **Model Management**: `fetchLlmCapabilities()` - Retrieves available models and capabilities
- **Text File Processing**: Direct content integration via `sendTextMessage()` flow
- **Multimodal Messaging**: `streamMultimodalChatResponse()` for file-based conversations
- **Dynamic Routing**: Model ID passed to appropriate endpoints based on content type

#### File Processing Logic
```javascript
// Text files are processed differently - content is integrated into message
if (isTextFile) {
    const fileContent = await readFileAsText(file);
    const combinedMessage = `${userText}\n\n--- Content from ${file.name} ---\n${fileContent}`;
    await sendTextMessage(combinedMessage); // Uses selected model directly
} else {
    // Images/PDFs use multimodal flow with automatic model selection
    await handleMultimodalStream(chatId, messagePayload); // Auto-selects compatible model
}
```

### Model Capability System

#### Capability Detection Logic
1. **Model Selection**: User selects model from dropdown showing capability badges
2. **File Upload Validation**: System checks if selected model supports uploaded file type
3. **Automatic Fallback**: If incompatible, system finds and uses appropriate model
4. **User Feedback**: Visual warnings and tooltips guide user through process

#### Capability Indicators
- **T Badge**: Text processing support (usually all models)
- **I Badge**: Image analysis capabilities 
- **P Badge**: PDF document processing support
- **Dynamic UI**: File upload controls appear/disappear based on model selection

## Usage

### Model Selection
1. Use the model dropdown in the header to select your preferred LLM
2. Observe capability badges (T, I, P) showing supported content types
3. File upload controls automatically adapt to selected model capabilities

### File Upload & Processing
1. **Text Files (.txt, .md)**:
   - Upload via drag-and-drop or file selection
   - Content is automatically integrated into your message text
   - Processed using selected model directly

2. **Images & PDFs**:
   - Upload via attachment button (appears based on model capabilities)
   - System automatically selects compatible model if current selection doesn't support file type
   - Rich preview displayed in chat interface

3. **Smart Validation**:
   - Real-time validation based on selected model capabilities
   - Clear error messages for unsupported file types
   - Automatic capability warnings and guidance

### Advanced Features
- **Capability Warnings**: Visual indicators when model doesn't support file type
- **Automatic Model Switching**: System finds compatible model for unsupported files
- **Mixed Content**: Combine text with files in single messages
- **Thinking Sections**: View AI reasoning process in collapsible sections
