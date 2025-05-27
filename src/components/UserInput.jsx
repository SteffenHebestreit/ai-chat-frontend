import React from 'react'; // Removed useRef as it's passed as a prop now
import { useNavigate } from 'react-router-dom';
import './UserInput.css';
function UserInput({ 
  inputText,
  onInputChange,
  onSendMessage,
  isLoading,
  onKeyDown,
  inputRef // Added inputRef to props
}) {
  const navigate = useNavigate();

  const handleInputResize = (e) => {
    e.target.style.height = 'auto';
    e.target.style.height = `${e.target.scrollHeight}px`;
  };

  const handleButtonClick = (e) => {
    e.preventDefault(); // Prevent form submission if it's part of a form
    onSendMessage();
  };

  return (
    <div className="input-container">
      <textarea
        ref={inputRef}
        value={inputText}
        onChange={(e) => {
          onInputChange(e);
          handleInputResize(e);
        }}
        onKeyDown={onKeyDown} // Pass down onKeyDown
        placeholder="Type your message... (Shift+Enter to send)"
        rows="1"
        disabled={isLoading} // Disable textarea when isLoading is true
        title="Chat input area"
      />
      <button 
        title="Send message (Shift+Enter)"
        onClick={handleButtonClick} 
        disabled={!isLoading && !inputText.trim()} // Disable send if not loading and no text
      >
        {!isLoading ? '➢' : '◼'}
      </button>
      <button 
        className="settings-button" 
        onClick={() => navigate('/settings')} // This navigation will still work as routes are defined in index.js
        title="Open settings"
      >
        ⚙
      </button>
    </div>
  );
}

export default UserInput; // ForwardRef can be added if useImperativeHandle is used
