import React, { useState, useRef, useEffect } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import chatbotService from "../services/chatbot";
import "./ChatbotBubble.css";

const ChatbotBubble = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [messages, setMessages] = useState([
    {
      id: 1,
      text: "Hello! I'm your expense tracker assistant. I can help you with budgeting tips, expense analysis, and financial advice. How can I help you today?",
      sender: "bot",
      timestamp: new Date().toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      }),
    },
  ]);
  const [inputText, setInputText] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [retryCount, setRetryCount] = useState(0);
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const toggleChat = () => {
    setIsOpen(!isOpen);
    setError(null);
  };

  const toggleExpand = () => {
    setIsExpanded(!isExpanded);
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (inputText.trim() === "" || isLoading) return;

    const userMessage = {
      id: Date.now(),
      text: inputText,
      sender: "user",
      timestamp: new Date().toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      }),
    };

    setMessages((prev) => [...prev, userMessage]);
    const currentInput = inputText;
    setInputText("");
    setIsLoading(true);
    setError(null);

    try {
      const response = await chatbotService.sendMessage(currentInput);

      const botMessage = {
        id: Date.now() + 1,
        text: response.response,
        sender: "bot",
        timestamp: new Date().toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
        }),
      };

      setMessages((prev) => [...prev, botMessage]);
      setRetryCount(0); // Reset retry count on success
    } catch (err) {
      const newRetryCount = retryCount + 1;
      setRetryCount(newRetryCount);
      setError(err.message);

      let errorText = "Sorry, I encountered an error. ";

      if (err.message.includes("401")) {
        errorText +=
          "Please check your authentication and try logging in again.";
      } else if (err.message.includes("500")) {
        errorText +=
          "The server is temporarily unavailable. Please try again in a moment.";
      } else if (
        err.message.includes("Network Error") ||
        err.message.includes("fetch")
      ) {
        errorText += "Please check your internet connection and try again.";
      } else {
        errorText += err.message;
      }

      if (newRetryCount < 3) {
        errorText += " Click the retry button or try rephrasing your question.";
      } else {
        errorText +=
          " The chatbot seems to be having persistent issues. Please refresh the page or try again later.";
      }

      const errorMessage = {
        id: Date.now() + 1,
        text: errorText,
        sender: "bot",
        timestamp: new Date().toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
        }),
        isError: true,
        retryable: newRetryCount < 3,
        originalInput: currentInput,
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRetryMessage = async (originalInput) => {
    if (isLoading) return;

    setIsLoading(true);
    setError(null);

    try {
      const response = await chatbotService.sendMessage(originalInput);

      const botMessage = {
        id: Date.now() + 1,
        text: response.response,
        sender: "bot",
        timestamp: new Date().toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
        }),
      };

      setMessages((prev) => [...prev, botMessage]);
      setRetryCount(0);
    } catch (err) {
      const errorMessage = {
        id: Date.now() + 1,
        text: "Retry failed. Please try a different question or refresh the page.",
        sender: "bot",
        timestamp: new Date().toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
        }),
        isError: true,
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      {isOpen && (
        <div className={`chatbot-window ${isExpanded ? "expanded" : ""}`}>
          <div className="chatbot-header">
            <div className="chatbot-title">
              <div className="bot-avatar">🤖</div>
              <span>AI Expense Assistant</span>
            </div>
            <div className="header-controls">
              <button
                className="expand-button"
                onClick={toggleExpand}
                title={isExpanded ? "Minimize" : "Expand"}
              >
                {isExpanded ? (
                  <svg
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path
                      d="M8 3V5H4V9H2V3H8ZM2 21V15H4V19H8V21H2ZM22 21H16V19H20V15H22V21ZM22 9H20V5H16V3H22V9Z"
                      fill="currentColor"
                    />
                  </svg>
                ) : (
                  <svg
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path
                      d="M3 3H9V5H5V9H3V3ZM3 21H5V17H9V15H3V21ZM15 21H21V15H19V17H15V21ZM21 3H15V5H19V9H21V3Z"
                      fill="currentColor"
                    />
                  </svg>
                )}
              </button>
              <button className="close-button" onClick={toggleChat}>
                ×
              </button>
            </div>
          </div>

          <div className="chatbot-messages">
            {messages.map((message) => (
              <div
                key={message.id}
                className={`message ${
                  message.sender === "user" ? "user-message" : "bot-message"
                } ${message.isError ? "error-message" : ""}`}
              >
                <div className="message-content">
                  {message.sender === "bot" ? (
                    <div className="markdown-content">
                      <ReactMarkdown remarkPlugins={[remarkGfm]}>
                        {message.text}
                      </ReactMarkdown>
                      {message.isError && message.retryable && (
                        <button
                          className="retry-button"
                          onClick={() =>
                            handleRetryMessage(message.originalInput)
                          }
                          disabled={isLoading}
                        >
                          🔄 Retry
                        </button>
                      )}
                    </div>
                  ) : (
                    message.text
                  )}
                </div>
                <div className="message-timestamp">{message.timestamp}</div>
              </div>
            ))}
            {isLoading && (
              <div className="message bot-message">
                <div className="message-content loading">
                  <div className="typing-indicator">
                    <span></span>
                    <span></span>
                    <span></span>
                  </div>
                  AI is thinking...
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {error && (
            <div className="error-banner">
              <span>⚠️ {error}</span>
            </div>
          )}

          <form className="chatbot-input" onSubmit={handleSendMessage}>
            <input
              type="text"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder={
                isLoading
                  ? "AI is responding..."
                  : "Ask me about your expenses..."
              }
              className="message-input"
              disabled={isLoading}
            />
            <button
              type="submit"
              className="send-button"
              disabled={isLoading || !inputText.trim()}
            >
              {isLoading ? (
                <div className="loading-spinner"></div>
              ) : (
                <svg
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    d="M2.01 21L23 12 2.01 3 2 10L17 12 2 14Z"
                    fill="currentColor"
                  />
                </svg>
              )}
            </button>
          </form>
        </div>
      )}

      <div className="chatbot-bubble" onClick={toggleChat}>
        <div className="bubble-icon">
          {isOpen ? (
            <svg
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d="M18 6L6 18M6 6L18 18"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          ) : (
            <svg
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          )}
        </div>
        {!isOpen && (
          <div className="bubble-notification">
            <div className="notification-dot"></div>
          </div>
        )}
      </div>
    </>
  );
};

export default ChatbotBubble;
