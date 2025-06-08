# AI Chat Frontend (Vite + React)

This project is a React-based frontend for an AI chat application, powered by Vite for a faster development experience. It features a dynamic 3D orb visualization, chat history management, user input handling, message rendering with markdown support, **dynamic model selection**, and **comprehensive multimodal content support** for text files, images, and PDFs.

![AI-Chat Frontend](https://github.com/SteffenHebestreit/ai-chat-frontend/blob/43a205879771e973b750434b3467bb59ad6c178b/Custom_AI-Chat_Frontend.png "AI-Chat Frontend")

## Key Features ⭐

### Model Selection & Intelligence
- **Dynamic Model Dropdown**: Real-time selection from available LLM models
- **Capability-Based UI**: File upload controls adapt to selected model capabilities
- **Smart Model Switching**: Automatic fallback to compatible models for file types

### Multimodal Content Support
The application supports comprehensive file upload and processing with intelligent capability detection.

![Image Support Feature](https://github.com/SteffenHebestreit/ai-chat-frontend/blob/dev/Image_Support.png "Multimodal Image Support")

## Features

### Core Functionality
- **Dynamic 3D Orb Visualization**: Interactive Three.js particle-based sphere animation
- **Chat History Management**: Save, load, and manage multiple chat sessions
- **Real-time Messaging**: Stream responses from AI with markdown support
- **Responsive Design**: Modern UI that works across different screen sizes

### Model Selection & Intelligence ⭐ *NEW*
- **Dynamic Model Dropdown**: Select from available LLM models with real-time switching
- **Capability Detection**: Visual badges showing text (T), image (I), and PDF (P) support
- **Smart File Upload**: Upload controls automatically adapt to selected model capabilities
- **Capability Warnings**: Clear indicators when file types aren't supported by current model
- **Automatic Fallback**: System automatically selects compatible models for unsupported file types

### Comprehensive File Support ⭐ *ENHANCED*
- **Text Files**: Direct content processing for .txt and .md files (integrated as message text)
- **Image Support**: Upload and analyze images (JPEG, PNG, GIF, WebP) with thumbnail previews
- **PDF Processing**: Upload and analyze PDF documents with appropriate LLM routing
- **Drag-and-Drop Interface**: Intuitive file upload with real-time validation
- **Rich File Previews**: Thumbnail previews and file metadata display in chat
- **Thinking Sections**: Collapsible AI reasoning sections for transparency

## Project Setup and Running

### Prerequisites

*   Node.js and npm (or yarn) installed.
*   A running backend service that this frontend will communicate with. Configure the backend URL in `src/config/apiConfig.js` and set the `VITE_BACKEND_API_URL` environment variable in a `.env` file at the project root (e.g., `VITE_BACKEND_API_URL=http://localhost:8080/research-agent/api`).

### Installation

1.  Clone the repository (if applicable).
2.  Navigate to the project directory: `cd frontend`
3.  Install dependencies:
    ```bash
    npm install
    ```
    or
    ```bash
    yarn install
    ```

### Running the Application

To start the development server (powered by Vite):

```bash
npm start
```

This will run the app in development mode. Vite will typically open [http://localhost:3000](http://localhost:3000) (or the configured port) in your browser. The page benefits from Hot Module Replacement (HMR) for fast updates.

### Building for Production

To create an optimized production build (using Vite):

```bash
npm run build
```

This builds the app for production to the `build` folder (or configured `outDir` in `vite.config.js`).

## Project Structure

```
frontend/
├── public/              # Static assets (favicon, manifest, etc.)
├── docs/                # Documentation
│   └── multimodal-support.md # Multimodal features documentation
├── src/
│   ├── assets/          # Static assets (e.g., icons - logo.svg)
│   ├── components/      # Reusable React components
│   │   ├── ChatHistoryPanel.css
│   │   ├── ChatHistoryPanel.jsx
│   │   ├── ContentRenderer.css    # NEW: Multimodal content rendering styles
│   │   ├── ContentRenderer.jsx    # NEW: Multimodal content and thinking sections
│   │   ├── FileAttachment.css     # NEW: File attachment display styles
│   │   ├── FileAttachment.jsx     # NEW: File attachment component
│   │   ├── FileUpload.css         # NEW: Drag-and-drop upload styles
│   │   ├── FileUpload.jsx         # NEW: File upload component with validation
│   │   ├── MessageCard.css
│   │   ├── MessageCard.jsx
│   │   ├── ModelSelector.css      # NEW: Model selection dropdown styles
│   │   ├── ModelSelector.jsx      # NEW: Dynamic model selection component
│   │   ├── Orb.jsx
│   │   ├── UserInput.css
│   │   └── UserInput.jsx          # Enhanced with file upload integration
│   ├── config/
│   │   └── apiConfig.js   # Backend API configuration
│   ├── pages/
│   │   └── SettingsView/
│   │       ├── SettingsView.css
│   │       └── SettingsView.jsx
│   ├── services/
│   │   └── chatService.js # API interaction services
│   ├── App.css
│   ├── App.jsx            # Main application component
│   ├── App.test.js
│   ├── index.css          # Global styles
│   ├── index.jsx          # Entry point of the application
│   ├── reportWebVitals.js
│   └── setupTests.js
├── .env                   # Environment variables (VITE_BACKEND_API_URL)
├── .gitignore
├── index.html             # Main HTML page (entry point for Vite)
├── package.json
├── README.md
├── vite.config.js         # Vite configuration file
└── ... (other configuration files)
```

## Key Components

### `App.jsx`
The main application component with enhanced model management and multimodal message processing.
*   **Enhanced Responsibilities**:
    *   Manages global states including model selection and file handling
    *   Orchestrates model-based file upload capability detection
    *   Handles both text-only and multimodal message flows
    *   Integrates dynamic model selection with chat functionality
    *   Manages separate streaming logic for text vs. multimodal content
    *   Provides automatic model fallback for unsupported file types
    *   **Performance Optimizations**: Enhanced with `useCallback` hooks for better memory management and reduced re-renders

### `ModelSelector.jsx` *(NEW)*
Dynamic model selection dropdown with capability visualization.
*   **Functionality**:
    *   Fetches available LLM models from backend API
    *   Displays model capabilities with flat monochrome badges (T, I, P)
    *   Provides real-time model switching during conversations
    *   Shows capability tooltips for user guidance
    *   Automatically selects default model on initialization
    *   Updates file upload controls based on selected model

### `UserInput.jsx` *(ENHANCED)*
Enhanced user input component with model-aware file upload capabilities.
*   **Enhanced Functionality**:
    *   Dynamic file upload button visibility based on model capabilities
    *   Model-specific file type validation and error messages
    *   Integration with ModelSelector for capability-aware UI
    *   Support for text file processing (.txt, .md) as message content
    *   Real-time capability warnings and user feedback
    *   Seamless integration with both text and multimodal workflows
    *   Fetches and displays chat messages.
    *   Manages focus for the user input field.
    *   Provides functionality to toggle the chat history panel.

### `Orb.jsx`
A Three.js component responsible for rendering a dynamic 3D orb visualization in the background.
*   **Functionality**:
    *   Creates a particle-based sphere that animates.
    *   Responds to mouse movements for interactive effects.
    *   Its appearance (e.g., color, particle density) can be configured.
    *   **Enhanced Animations**: Smoothed state transitions with reduced speed and intensity for better visual experience
*   **Note**: There has been an intermittent "THREE.WebGLRenderer: Context Lost" error. If this persists, further investigation into particle counts, resource management, or WebGL context handling within this component may be needed.

### `ChatHistoryPanel.jsx`
Displays a list of past chat sessions and allows users to select or delete them.
*   **Functionality**:
    *   Fetches and lists available chat histories from the backend.
    *   Allows users to switch to a selected chat.
    *   Provides a button to delete a chat session (with backend interaction).
    *   Uses SVG icons for UI elements (delete button).

### `MessageCard.jsx`
Renders individual chat messages, distinguishing between user and AI messages.
*   **Functionality**:
    *   Displays message content, sender (User/AI), and timestamp.
    *   Supports rendering of markdown content within messages.
    *   Applies distinct styling for user and AI messages, including a glowing border effect.
    *   **Enhanced Tool Call Visualization**: Expandable dropdown showing chronological tool execution steps with improved visual feedback
    *   **Error Detection**: Automatic detection of error content with orb state change triggers

### `UserInput.jsx`
Handles user text input and message sending, now enhanced with multimodal file upload capabilities.
*   **Functionality**:
    *   Provides a `textarea` for users to type their messages.
    *   Manages the input state and handles message submission.
    *   Communicates with `App.js` to send messages to the backend and update the chat.
    *   Features auto-resizing `textarea` and a send button.
    *   **NEW**: Includes file upload toggle and LLM capability detection with warnings.

### `FileUpload.jsx` *(ENHANCED)*
Comprehensive file upload interface with model-aware validation.
*   **Enhanced Functionality**:
    *   Support for text files (.txt, .md), images (JPEG, PNG, GIF, WebP), and PDFs
    *   Dynamic file type validation based on selected model capabilities
    *   Real-time error messages with detailed file type descriptions
    *   Text file content preview and processing
    *   Model-specific accepted file types configuration
    *   Responsive drag-and-drop interface with file validation

### `FileAttachment.jsx` *(NEW)*
Displays file attachments within chat messages.
*   **Functionality**:
    *   Renders file previews and metadata in messages.
    *   Supports various file types with appropriate icons and previews.
    *   Provides download functionality for attached files.
    *   Responsive design for different screen sizes.

### `ContentRenderer.jsx` *(NEW)*
Enhanced content renderer supporting multimodal content and thinking sections.
*   **Functionality**:
    *   Renders both text and multimodal content in messages.
    *   Supports collapsible "thinking" sections for AI reasoning display.
    *   Maintains markdown rendering capabilities.
    *   Handles mixed content types within single messages.
    *   **Enhanced HTML Rendering**: Integrated with `rehype-raw` plugin for safe HTML content processing

### `pages/SettingsView/SettingsView.jsx`
A component intended for application settings.
*   **Functionality**: (Currently basic)
    *   This component is structured as a separate page. Its specific settings and functionalities would be implemented here.
    *   Example settings could include API key configuration, theme preferences, or `Orb.js` visualization parameters.

## Services

### `services/chatService.js`
Enhanced API service layer with comprehensive model and multimodal support.
*   **Enhanced Functions**:
    *   **Model Management**: `fetchLlmCapabilities()` - Retrieves available models and their capabilities
    *   **Text Messaging**: `streamChatResponse()` - Enhanced with model ID parameter for text-only conversations
    *   **Multimodal Support**: `streamMultimodalChatResponse()` - Handles file uploads with model routing
    *   **Content Processing**: Support for text file content integration and multimodal message payloads
    *   **Legacy Functions**: All existing chat management functions (create, save, delete, history)
    *   **Model-Aware Routing**: Automatic model selection based on content type compatibility

### `config/apiConfig.js`
Provides configuration for the backend API URL.
*   **Functionality**:
    *   Exports `getBackendUrl()`, which returns the base URL for the backend service.
    *   This allows for easy modification of the backend endpoint without changing code in multiple service files. Currently defaults to `http://localhost:8080` if the `VITE_BACKEND_API_URL` environment variable (accessed via `import.meta.env.VITE_BACKEND_API_URL`) is not set.

## Key Dependencies

*   **`react`**: Core library for building user interfaces.
*   **`react-dom`**: Provides DOM-specific methods for React.
*   **`vite`**: Next-generation frontend tooling. It provides a faster and leaner development experience.
*   **`@vitejs/plugin-react`**: Vite plugin for React projects, enabling features like Fast Refresh.
*   **`@react-three/fiber` & `@react-three/drei`**: Libraries for using Three.js with React, enabling declarative 3D graphics. Used by `Orb.jsx`.
*   **`three`**: The underlying 3D graphics library for the orb visualization.
*   **`axios`**: Promise-based HTTP client for making API requests to the backend.
*   **`react-markdown`**: Component to render Markdown text as HTML. Used in `MessageCard.js`.
*   **`remark-gfm`**: Plugin for `react-markdown` to support GitHub Flavored Markdown (tables, strikethrough, etc.).
*   **`rehype-raw`**: Plugin for `react-markdown` to safely render raw HTML content within markdown. **(NEW)**
*   **`react-router-dom`**: For handling routing within the application (though minimally used currently).
*   **`@testing-library/react`**: Utilities for testing React components.

## Available Scripts (Vite)

### `npm start` or `vite`
Runs the app in development mode with Vite's dev server. Open [http://localhost:3000](http://localhost:3000) (or configured port) to view it.

### `npm run build` or `vite build`
Builds the app for production to the `build` folder (or configured `outDir` in `vite.config.js`).

### `npm run test` or `vitest`
Launches the test runner (Vitest, if configured). *Note: Test setup might need adjustments for Vite.*

### `npm run preview` or `vite preview`
Serves the production build locally to preview it before deployment.

## Recent Updates

### Latest Improvements (Current Version)
*   **Performance Optimization**: Added `useCallback` hooks in `App.jsx` for better memory management and reduced re-renders
*   **Enhanced Markdown Processing**: Integrated `rehype-raw` plugin to safely render HTML within markdown content
*   **Improved Tool Call Visualization**: Enhanced `MessageCard` with expandable dropdown showing chronological tool execution steps
*   **Visual Enhancements**: Updated styling for tool call status with better colors, borders, and hover effects
*   **Animation Improvements**: Smoothed orb transitions in `Orb.jsx` with reduced speed and intensity
*   **Error Detection**: Added automatic error content detection with orb state change triggers
*   **Code Cleanup**: Removed unused functions and improved component organization

### Technical Enhancements
*   **New Dependency**: Added `rehype-raw@7.0.0` for enhanced HTML rendering in React Markdown
*   **Performance**: Wrapped event handlers and state setters in `useCallback` to prevent unnecessary re-renders
*   **UX Improvements**: Created expandable tool call status indicators with chronological execution display
*   **Error Handling**: Enhanced error detection with automatic visual feedback through orb state changes

### Chat Message Rendering Improvements (June 2025)
*   **Enhanced Link Styling**: Links within chat messages now feature a distinct yellowish color (`#ffff33`) that matches the orb's tool-use activity state, with a subtle hover effect for better visual feedback
*   **Improved Tool Call Display**: Tool usage indicators (e.g., `[Calling tool: dateTime]`) are now exclusively displayed in a dedicated dropdown/summary section within AI message cards, preventing duplication in the main message content
*   **Refined Markdown Processing**: Enhanced markdown formatting with better handling of headings, lists, and other structural elements for improved readability

### Content Processing Enhancements
*   **rawContent Prioritization**: The frontend now prioritizes a `rawContent` field from backend responses, especially for messages loaded from chat history, ensuring original formatting is preserved and tool calls are handled correctly
*   **Robust Multimodal Parsing**: Updated `parseMultimodalContent` utility in `chatService.js` to handle various content structures from the backend more reliably
*   **Content Normalization**: Added `normalizeMarkdownContent` utility to preprocess markdown content before rendering, improving consistency across different message sources

### User Experience Improvements
*   **Cleaner Message Display**: Streamlined message card layout with better separation between tool progress indicators and main content
*   **Consistent Visual Theming**: Link colors now align with the application's overall color scheme, providing a more cohesive user experience
*   **Error Resilience**: Improved error handling for multimodal content parsing with graceful fallbacks to preserve message display

## Learn More

*   [Vite documentation](https://vitejs.dev/)
*   [React documentation](https://reactjs.org/)
