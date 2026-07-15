import { useEffect, useRef, useState } from "react";
import "./ChatWidget.css";

const ChatIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
  </svg>
);

const SendIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <line x1="22" y1="2" x2="11" y2="13"></line>
    <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
  </svg>
);

const CloseIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <line x1="18" y1="6" x2="6" y2="18"></line>
    <line x1="6" y1="6" x2="18" y2="18"></line>
  </svg>
);

/**
 * Visual variant props (accent/customScrollbar/shrinkIconOnMobile) exist because
 * the 9 page-local implementations this was consolidated from had genuinely diverged in these
 * specific ways — they reproduce each page's exact prior appearance, not stylistic options for new use.
 */
export default function ChatWidget({
  initialGreeting,
  getBotResponse,
  sendButtonAriaLabel = "Send message",
  accent = "light",
  customScrollbar = true,
  shrinkIconOnMobile = true,
}) {
  const [chatOpen, setChatOpen] = useState(false);
  const [messages, setMessages] = useState([
    { id: 1, type: "bot", text: initialGreeting, timestamp: new Date() },
  ]);
  const [inputValue, setInputValue] = useState("");
  const messagesEndRef = useRef(null);
  const messageIdRef = useRef(1);
  const botReplyTimeoutRef = useRef(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // If the student navigates away within the reply delay, this timeout would
  // otherwise still fire and call setState on an unmounted component.
  useEffect(() => {
    return () => {
      if (botReplyTimeoutRef.current) clearTimeout(botReplyTimeoutRef.current);
    };
  }, []);

  const handleSendMessage = (e) => {
    e.preventDefault();
    if (inputValue.trim() === "") return;

    const capturedInput = inputValue;
    const userMessage = {
      id: ++messageIdRef.current,
      type: "user",
      text: capturedInput,
      timestamp: new Date(),
    };
    setMessages((prev) => [...prev, userMessage]);
    setInputValue("");

    if (botReplyTimeoutRef.current) clearTimeout(botReplyTimeoutRef.current);
    botReplyTimeoutRef.current = setTimeout(() => {
      const botResponse = {
        id: ++messageIdRef.current,
        type: "bot",
        text: getBotResponse(capturedInput),
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, botResponse]);
    }, 600);
  };

  return (
    <div
      className="chat-widget"
      data-accent={accent}
      data-scrollbar={customScrollbar ? "thin" : undefined}
      data-icon-shrink={shrinkIconOnMobile ? "true" : undefined}
    >
      {chatOpen && (
        <div className="chat-container">
          <div className="chat-header">
            <h3>OAMS Assistant</h3>
            <button
              className="chat-close-btn"
              onClick={() => setChatOpen(false)}
              aria-label="Close chat"
            >
              <CloseIcon />
            </button>
          </div>
          <div className="chat-messages">
            {messages.map((message) => (
              <div key={message.id} className={`message message-${message.type}`}>
                <div className="message-content">{message.text}</div>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>
          <form className="chat-input-form" onSubmit={handleSendMessage}>
            <input
              type="text"
              className="chat-input"
              placeholder="Ask me anything..."
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
            />
            <button type="submit" className="chat-send-btn" aria-label={sendButtonAriaLabel}>
              <SendIcon />
            </button>
          </form>
        </div>
      )}
      <button
        className={`chat-fab ${chatOpen ? "hidden" : ""}`}
        onClick={() => setChatOpen(true)}
        aria-label="Open chat"
      >
        <ChatIcon />
      </button>
    </div>
  );
}
