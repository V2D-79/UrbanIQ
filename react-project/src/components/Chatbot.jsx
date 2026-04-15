import { useState, useRef, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import { chatWithAI } from "../services/aiService";
import "./Chatbot.css";

const Chatbot = () => {
  const { isAuthenticated, isAdmin } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef(null);

  const mode = isAdmin ? "admin" : "citizen";

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    if (isOpen && messages.length === 0) {
      const welcome = isAdmin
        ? "Hello! I'm the UrbanIQ Admin Assistant. I can help you with hotspot detection, AI analysis, report management, and more. Ask me anything!"
        : "Hi there! I'm the UrbanIQ Assistant. I can help you report issues, track your reports, and understand the platform. How can I help?";
      setMessages([{ role: "assistant", content: welcome }]);
    }
  }, [isOpen]);

  const sendMessage = async () => {
    if (!input.trim() || loading) return;
    const userMsg = { role: "user", content: input.trim() };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setLoading(true);

    try {
      const chatHistory = [...messages, userMsg].map((m) => ({ role: m.role, content: m.content }));
      const result = await chatWithAI(chatHistory, mode);
      setMessages((prev) => [...prev, { role: "assistant", content: result.response || "I couldn't generate a response." }]);
    } catch {
      setMessages((prev) => [...prev, { role: "assistant", content: "Sorry, I encountered an error. Please try again." }]);
    }
    setLoading(false);
  };

  if (!isAuthenticated) return null;

  return (
    <>
      {/* Chat Bubble */}
      <button className={`chatbot-bubble ${isOpen ? "active" : ""}`} onClick={() => setIsOpen(!isOpen)} title="UrbanIQ Assistant">
        <i className={`fas ${isOpen ? "fa-times" : "fa-comments"}`}></i>
      </button>

      {/* Chat Window */}
      {isOpen && (
        <div className="chatbot-window">
          <div className="chatbot-header">
            <div className="chatbot-title">
              <div className="chatbot-avatar"><i className="fas fa-robot"></i></div>
              <div>
                <h4>UrbanIQ Assistant</h4>
                <span>{isAdmin ? "Admin Mode" : "Citizen Mode"}</span>
              </div>
            </div>
            <button onClick={() => setIsOpen(false)}><i className="fas fa-minus"></i></button>
          </div>

          <div className="chatbot-messages">
            {messages.map((msg, i) => (
              <div key={i} className={`chat-msg ${msg.role}`}>
                {msg.role === "assistant" && <div className="chat-msg-avatar"><i className="fas fa-robot"></i></div>}
                <div className="chat-msg-bubble">
                  <p>{msg.content}</p>
                </div>
              </div>
            ))}
            {loading && (
              <div className="chat-msg assistant">
                <div className="chat-msg-avatar"><i className="fas fa-robot"></i></div>
                <div className="chat-msg-bubble typing">
                  <span></span><span></span><span></span>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          <div className="chatbot-input">
            <input type="text" placeholder="Type a message..." value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && sendMessage()}
              disabled={loading} />
            <button onClick={sendMessage} disabled={loading || !input.trim()}>
              <i className="fas fa-paper-plane"></i>
            </button>
          </div>
        </div>
      )}
    </>
  );
};

export default Chatbot;
