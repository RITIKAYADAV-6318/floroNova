import React, { useState, useRef, useEffect } from 'react';
import { MessageCircle, X, Send, Bot, User, Loader2, ExternalLink, Image as ImageIcon, Trash2 } from 'lucide-react';
import { createChatSession, sendChatMessage } from '../services/geminiService';
import { ChatMessage } from '../types';
import { Chat } from '@google/genai';

interface ChatInterfaceProps {
  contextImage?: string | null;
}

export const ChatInterface: React.FC<ChatInterfaceProps> = ({ contextImage }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [attachedImage, setAttachedImage] = useState<string | null>(null);
  const [lastContextImage, setLastContextImage] = useState<string | null>(null);
  
  const chatSessionRef = useRef<Chat | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const initSession = () => {
    if (!chatSessionRef.current) {
      try {
        chatSessionRef.current = createChatSession();
        // Add initial greeting only if it's the very first time and no image context is being sent immediately
        if (!contextImage) {
            setMessages([
              {
                id: 'init',
                role: 'model',
                text: "Hi! I'm your plant expert assistant. Ask me anything about plant care, pests, or gardening tips! You can also show me a picture.",
                timestamp: Date.now()
              }
            ]);
        }
      } catch (e) {
        console.error("Failed to init chat", e);
      }
    }
  };

  // Initialize chat when opened if not already initialized
  useEffect(() => {
    if (isOpen) {
      initSession();
    }
  }, [isOpen]);

  // Handle incoming context image (auto-send to bot)
  useEffect(() => {
    const processContextImage = async () => {
      if (contextImage && contextImage !== lastContextImage) {
        setLastContextImage(contextImage);
        
        // Initialize session if needed
        if (!chatSessionRef.current) {
           chatSessionRef.current = createChatSession();
        }

        // Construct a message to prime the bot with the image
        const userMsg: ChatMessage = {
          id: crypto.randomUUID(),
          role: 'user',
          text: "I just uploaded this photo for analysis.",
          attachment: contextImage,
          timestamp: Date.now()
        };

        // Add to UI state so user sees it when they open chat
        setMessages(prev => [...prev, userMsg]);
        setIsLoading(true);

        try {
          // Send silently to background
          const response = await sendChatMessage(chatSessionRef.current!, userMsg.text, userMsg.attachment);
          
          const botMsg: ChatMessage = {
            id: crypto.randomUUID(),
            role: 'model',
            text: response.text,
            sources: response.sources,
            timestamp: Date.now()
          };

          setMessages(prev => [...prev, botMsg]);
        } catch (error) {
           console.error("Failed to send context image to chat", error);
        } finally {
          setIsLoading(false);
        }
      }
    };

    processContextImage();
  }, [contextImage, lastContextImage]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isOpen]);

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      if (!file.type.startsWith('image/')) {
        alert("Please select an image file.");
        return;
      }
      
      const reader = new FileReader();
      reader.onload = (event) => {
        if (event.target?.result) {
          setAttachedImage(event.target.result as string);
        }
      };
      reader.readAsDataURL(file);
    }
    // Reset input so same file can be selected again if needed
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleRemoveImage = () => {
    setAttachedImage(null);
  };

  const handleSend = async () => {
    if ((!input.trim() && !attachedImage) || !chatSessionRef.current) return;

    const userMsg: ChatMessage = {
      id: crypto.randomUUID(),
      role: 'user',
      text: input,
      attachment: attachedImage || undefined,
      timestamp: Date.now()
    };

    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setAttachedImage(null);
    setIsLoading(true);

    try {
      const response = await sendChatMessage(chatSessionRef.current, userMsg.text, userMsg.attachment);
      
      const botMsg: ChatMessage = {
        id: crypto.randomUUID(),
        role: 'model',
        text: response.text,
        sources: response.sources,
        timestamp: Date.now()
      };

      setMessages(prev => [...prev, botMsg]);
    } catch (error) {
      setMessages(prev => [...prev, {
        id: crypto.randomUUID(),
        role: 'model',
        text: "I'm having trouble connecting right now. Please try again.",
        timestamp: Date.now()
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      {/* Toggle Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`fixed bottom-6 right-6 z-[60] p-4 rounded-full shadow-2xl transition-all duration-300 ${isOpen ? 'bg-gray-800 text-white rotate-90' : 'bg-emerald-600 text-white hover:bg-emerald-700 hover:scale-105'}`}
      >
        {isOpen ? <X size={24} /> : <MessageCircle size={24} />}
      </button>

      {/* Chat Window */}
      {isOpen && (
        <div className="fixed bottom-24 right-6 w-[90vw] md:w-[400px] h-[60vh] max-h-[600px] bg-white rounded-3xl shadow-2xl z-50 flex flex-col border border-emerald-50 overflow-hidden animate-pop-in origin-bottom-right">
          
          {/* Header */}
          <div className="bg-emerald-600 p-4 flex items-center gap-3 text-white">
            <div className="bg-white/20 p-2 rounded-full">
              <Bot size={20} />
            </div>
            <div>
              <h3 className="font-bold">Plant Assistant</h3>
              <p className="text-xs text-emerald-100 flex items-center gap-1">
                <span className="w-2 h-2 bg-green-300 rounded-full animate-pulse"/>
                Online • Powered by Gemini
              </p>
            </div>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50">
            {messages.map((msg) => (
              <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[85%] rounded-2xl p-3 ${
                  msg.role === 'user' 
                    ? 'bg-emerald-600 text-white rounded-tr-none' 
                    : 'bg-white text-gray-800 shadow-sm border border-gray-100 rounded-tl-none'
                }`}>
                  
                  {msg.attachment && (
                    <div className="mb-2 rounded-lg overflow-hidden border border-white/20">
                      <img src={msg.attachment} alt="User attachment" className="max-w-full max-h-48 object-cover" />
                    </div>
                  )}

                  <p className="text-sm whitespace-pre-wrap leading-relaxed">{msg.text}</p>
                  
                  {/* Sources */}
                  {msg.sources && msg.sources.length > 0 && (
                    <div className="mt-3 pt-3 border-t border-gray-100">
                      <p className="text-xs font-semibold text-gray-500 mb-2">Sources:</p>
                      <div className="flex flex-wrap gap-2">
                        {msg.sources.map((source, idx) => (
                          <a 
                            key={idx}
                            href={source.uri}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-1 text-[10px] bg-gray-100 text-gray-600 px-2 py-1 rounded hover:bg-emerald-50 hover:text-emerald-600 transition-colors"
                          >
                            <ExternalLink size={10} />
                            <span className="truncate max-w-[150px]">{source.title}</span>
                          </a>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  <span className={`text-[10px] block mt-1 opacity-70 ${msg.role === 'user' ? 'text-emerald-100' : 'text-gray-400'}`}>
                    {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
              </div>
            ))}
            {isLoading && (
              <div className="flex justify-start">
                 <div className="bg-white p-3 rounded-2xl rounded-tl-none shadow-sm border border-gray-100 flex items-center gap-2">
                    <Loader2 size={16} className="animate-spin text-emerald-500" />
                    <span className="text-xs text-gray-400">Thinking...</span>
                 </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input Area */}
          <div className="bg-white border-t border-gray-100">
            {/* Attachment Preview */}
            {attachedImage && (
              <div className="px-3 pt-3 flex items-center gap-2 animate-fade-in">
                <div className="relative group">
                   <img src={attachedImage} alt="Preview" className="w-16 h-16 object-cover rounded-lg border border-gray-200" />
                   <button 
                     onClick={handleRemoveImage}
                     className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full p-0.5 shadow-md hover:bg-red-600 transition-colors"
                   >
                     <X size={12} />
                   </button>
                </div>
                <span className="text-xs text-gray-500">Image attached</span>
              </div>
            )}

            <div className="p-3">
              <div className="flex gap-2">
                <input 
                  type="file"
                  ref={fileInputRef}
                  className="hidden"
                  accept="image/*"
                  onChange={handleImageSelect}
                />
                
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="bg-gray-100 text-gray-500 p-3 rounded-full hover:bg-emerald-50 hover:text-emerald-600 transition-colors"
                  title="Attach image"
                  disabled={isLoading}
                >
                  <ImageIcon size={18} />
                </button>

                <input
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                  placeholder={attachedImage ? "Ask about this image..." : "Ask about plant care..."}
                  className="flex-1 bg-gray-50 border border-gray-200 rounded-full px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500 transition-all"
                  disabled={isLoading}
                />
                <button
                  onClick={handleSend}
                  disabled={(!input.trim() && !attachedImage) || isLoading}
                  className="bg-emerald-600 text-white p-3 rounded-full hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-lg shadow-emerald-200"
                >
                  <Send size={18} />
                </button>
              </div>
              <p className="text-[10px] text-center text-gray-400 mt-2">
                Gemini can make mistakes. Check important info.
              </p>
            </div>
          </div>

        </div>
      )}
    </>
  );
};