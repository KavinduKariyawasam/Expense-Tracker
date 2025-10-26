import React from "react";
import ChatbotBubble from "./ChatbotBubble";
import ChatbotErrorBoundary from "./ChatbotErrorBoundary";

const SafeChatbotBubble = () => {
  return (
    <ChatbotErrorBoundary>
      <ChatbotBubble />
    </ChatbotErrorBoundary>
  );
};

export default SafeChatbotBubble;
