# AI Chat Frontend (Vite + React)

This project is a React-based frontend for an AI chat application, now powered by Vite for a faster development experience. It features a dynamic 3D orb visualization, chat history management, user input handling, message rendering with markdown support, and **multimodal content support** for images and PDFs.

![AI-Chat Frontend](https://github.com/SteffenHebestreit/ai-chat-frontend/blob/43a205879771e973b750434b3467bb59ad6c178b/Custom_AI-Chat_Frontend.png "AI-Chat Frontend")

## Multimodal Support

The application now supports uploading and analyzing visual content alongside text messages, with automatic LLM capability detection and file type warnings.

![Image Support Feature](https://github.com/SteffenHebestreit/ai-chat-frontend/blob/main/Image_Support.png "Multimodal Image Support")

## Features

### Core Functionality
- **Dynamic 3D Orb Visualization**: Interactive Three.js particle-based sphere animation
- **Chat History Management**: Save, load, and manage multiple chat sessions
- **Real-time Messaging**: Stream responses from AI with markdown support
- **Responsive Design**: Modern UI that works across different screen sizes

### Multimodal Content Support ⭐ *NEW*
- **File Upload**: Drag-and-drop interface for images (JPEG, PNG, GIF, WebP) and PDFs
- **Smart Capability Detection**: Automatic LLM compatibility checking with visual warnings
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
│   │   ├── FileUpload.jsx         # NEW: File upload component
│   │   ├── MessageCard.css
│   │   ├── MessageCard.jsx
│   │   ├── Orb.jsx
│   │   ├── UserInput.css
│   │   └── UserInput.jsx
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
The main application component. It orchestrates the overall layout and state management.
*   **Responsibilities**:
    *   Manages global states like `isLoading`, `currentChatId`, `isHistoryVisible`.
    *   Handles routing (though currently simple, with `SettingsView` as a potential route).
    *   Integrates `Orb`, `ChatHistoryPanel`, `UserInput`, and `MessageCard` components.
    *   Fetches and displays chat messages.
    *   Manages focus for the user input field.
    *   Provides functionality to toggle the chat history panel.

### `Orb.jsx`
A Three.js component responsible for rendering a dynamic 3D orb visualization in the background.
*   **Functionality**:
    *   Creates a particle-based sphere that animates.
    *   Responds to mouse movements for interactive effects.
    *   Its appearance (e.g., color, particle density) can be configured.
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

### `UserInput.jsx`
Handles user text input and message sending, now enhanced with multimodal file upload capabilities.
*   **Functionality**:
    *   Provides a `textarea` for users to type their messages.
    *   Manages the input state and handles message submission.
    *   Communicates with `App.js` to send messages to the backend and update the chat.
    *   Features auto-resizing `textarea` and a send button.
    *   **NEW**: Includes file upload toggle and LLM capability detection with warnings.

### `FileUpload.jsx` *(NEW)*
Provides drag-and-drop file upload interface for multimodal content.
*   **Functionality**:
    *   Drag-and-drop zone for images (JPEG, PNG, GIF, WebP) and PDFs.
    *   File preview functionality with thumbnails.
    *   File validation and size checking.
    *   Integration with the chat input system.

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

### `pages/SettingsView/SettingsView.jsx`
A component intended for application settings.
*   **Functionality**: (Currently basic)
    *   This component is structured as a separate page. Its specific settings and functionalities would be implemented here.
    *   Example settings could include API key configuration, theme preferences, or `Orb.js` visualization parameters.

## Services

### `services/chatService.js`
Contains functions for interacting with the backend chat API, now enhanced with multimodal support.
*   **Key Functions**:
    *   `createNewChat()`: Initiates a new chat session.
    *   `sendMessage(chatId, message)`: Sends a user message to a specific chat.
    *   `saveMessage(chatId, message)`: Saves a message (typically AI response) to a chat.
    *   `getChatHistory(chatId)`: Fetches the message history for a specific chat.
    *   `getAllChats()`: Retrieves a list of all chat sessions for the user.
    *   `deleteChat(chatId)`: Deletes a specific chat session.
    *   **NEW**: `createMultimodalMessagePayload()`: Prepares multimodal messages with text and files.    *   **NEW**: `prepareFileForUpload()`: Converts files to base64 data URIs for API compatibility.
    *   **NEW**: `streamMultimodalChatResponse()`: Handles streaming responses for multimodal messages.
    *   **NEW**: `fetchLlmCapabilities()`: Checks LLM support for specific content types.
    *   All functions use `axios` for HTTP requests and rely on `getBackendUrl()` from `apiConfig.js`.

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

## Learn More

*   [Vite documentation](https://vitejs.dev/)
*   [React documentation](https://reactjs.org/)
