# Comprehensive Multimodal & Model Selection - Frontend

The AI Research application features comprehensive multimodal content support with intelligent model selection. Users can upload text files, images, and PDFs while the system automatically manages model compatibility and provides dynamic UI controls.

![Image Support Demo](../Image_Support.png)

## Key Features

### Model Selection & Intelligence
- **Dynamic Model Dropdown**: Real-time selection from available LLM models with capability detection.
- **Capability Badges**: Visual indicators showing text (T), image (I), and PDF (P) support.
- **Smart UI Controls**: File upload button visibility adapts to selected model capabilities.
- **Automatic Fallback**: The system can select compatible models when the current selection doesn't support the file type.

### Comprehensive File Support
- **Text Files (.txt, .md)**: Direct content integration as message text.
- **Images (JPEG, PNG, GIF, WebP)**: Multimodal processing with thumbnail previews.
- **PDF Documents**: Document analysis with appropriate model routing.
- **Drag-and-Drop Interface**: Intuitive upload with real-time validation and error handling.

## Usage

### Model Selection
1. Use the model dropdown in the header to select your preferred LLM.
2. Observe capability badges (T, I, P) showing supported content types.
3. File upload controls automatically adapt to selected model capabilities.

### File Upload & Processing
1. **Text Files (.txt, .md)**:
   - Upload via drag-and-drop or file selection.
   - Content is automatically integrated into your message text.
2. **Images & PDFs**:
   - Upload via the attachment button.
   - The system automatically selects a compatible model if the current selection doesn't support the file type.
   - A rich preview is displayed in the chat interface.
