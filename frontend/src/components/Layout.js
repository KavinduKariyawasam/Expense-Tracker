import React from "react";
import Navbar from "./Navbar";
import ChatbotBubble from "./ChatbotBubble";
import "./Layout.css";

const Layout = ({ children }) => {
  return (
    <div className="layout">
      <Navbar />
      <main className="layout-main">
        <div className="layout-content">{children}</div>
      </main>
      <ChatbotBubble />
    </div>
  );
};

export default Layout;
