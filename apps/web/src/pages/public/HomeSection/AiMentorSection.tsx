import React, { useState, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useChat } from '../../../context/ChatContext';

interface Message {
  id: number;
  text: string;
  isUser: boolean;
  timestamp: string;
}

const AiMentorSection: React.FC = () => {
  const { t } = useTranslation();
  const { setIsOpen } = useChat();
  const [messages, setMessages] = useState<Message[]>([
    { id: 1, text: t('aiMentor.welcomeMsg'), isUser: false, timestamp: 'Vừa xong' },
  ]);
  const [inputValue, setInputValue] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isTyping]);

  const handleSend = () => {
    if (!inputValue.trim()) return;

    const userMessage: Message = {
      id: Date.now(),
      text: inputValue,
      isUser: true,
      timestamp: 'Vừa xong',
    };

    setMessages(prev => [...prev, userMessage]);
    setInputValue('');
    setIsTyping(true);

    // Simulate AI response after delay
    setTimeout(() => {
      const aiResponses = [
        t('aiMentor.aiResponse1'),
        t('aiMentor.aiResponse2'),
      ];
      const randomResponse = aiResponses[Math.floor(Math.random() * aiResponses.length)];
      const aiResponse: Message = {
        id: Date.now() + 1,
        text: randomResponse,
        isUser: false,
        timestamp: 'Vừa xong',
      };
      setMessages(prev => [...prev, aiResponse]);
      setIsTyping(false);
    }, 1500);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleOpenChat = () => {
    setIsOpen(true);
  };

  const renderIcon = (icon: string, color: string) => {
    const colorClass = `text-${color}-600 dark:text-${color}-400`;
    
    switch (icon) {
      case 'quiz':
        return (
          <svg className={`w-3.5 h-3.5 ${colorClass}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M9 11l3 3L22 4" />
            <path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11" />
          </svg>
        );
      case 'explain':
        return (
          <svg className={`w-3.5 h-3.5 ${colorClass}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="10" />
            <path d="M9.09 9a3 3 0 015.83 1c0 2-3 3-3 3" />
            <path d="M12 17h.01" />
          </svg>
        );
      case 'analyze':
        return (
          <svg className={`w-3.5 h-3.5 ${colorClass}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M3 3v18h18" />
            <path d="M18.7 8l-5.1 5.2-2.8-2.7L7 14.3" />
          </svg>
        );
      case 'review':
        return (
          <svg className={`w-3.5 h-3.5 ${colorClass}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="10" />
            <path d="M12 8v4l3 3" />
          </svg>
        );
      default:
        return null;
    }
  };

  return (
    <section id="aitutor" className="py-24 bg-slate-50 dark:bg-[#0f172a] relative overflow-hidden">
      {/* Background decorations */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 left-10 w-72 h-72 bg-blue-500/10 dark:bg-blue-500/5 rounded-full blur-3xl" />
        <div className="absolute bottom-20 right-10 w-96 h-96 bg-purple-500/10 dark:bg-purple-500/5 rounded-full blur-3xl" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-gradient-to-r from-blue-500/5 to-purple-500/5 dark:from-blue-500/10 dark:to-purple-500/10 rounded-full blur-3xl" />
      </div>
      
      <div className="max-w-4xl mx-auto px-6 pt-16 relative z-10">
        <div className="text-center mb-12">
          <span className="inline-flex items-center gap-2 px-4 py-2 bg-blue-100 dark:bg-blue-500/20 text-blue-700 dark:text-blue-400 rounded-full text-sm font-medium mb-4 border border-blue-200 dark:border-blue-500/30">
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" />
            </svg>
            {t('aiMentor.title')}
          </span>
          <h2 className="text-3xl md:text-4xl font-bold text-slate-900 dark:text-white mb-4">{t('aiMentor.chatTitle')}</h2>
          <p className="text-lg text-slate-600 dark:text-slate-400 max-w-2xl mx-auto">{t('aiMentor.chatDesc')}</p>
        </div>

        {/* Chat Container */}
        <div className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-xl border border-slate-200/50 dark:border-slate-700/50 rounded-3xl overflow-hidden shadow-2xl shadow-blue-500/10 dark:shadow-blue-500/5">
          {/* Header */}
          <div className="flex items-center gap-4 p-5 bg-gradient-to-r from-slate-50/80 to-white/80 dark:from-slate-800/80 dark:to-slate-800/50 border-b border-slate-200/50 dark:border-slate-700/50 backdrop-blur-xl">
            {/* Avatar with glow effect */}
            <div className="relative">
              <div className="w-12 h-12 bg-gradient-to-br from-blue-600 to-cyan-500 rounded-full flex items-center justify-center shadow-lg shadow-blue-500/30">
                <svg className="w-6 h-6 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" />
                </svg>
              </div>
              {/* Online indicator */}
              <span className="absolute -bottom-0.5 -right-0.5 w-4 h-4 bg-green-500 rounded-full border-2 border-white dark:border-slate-800 animate-pulse" />
            </div>
            
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <div className="text-slate-900 dark:text-white font-bold">AI Mentor - Emma</div>
                <span className="px-2.5 py-0.5 text-xs font-medium bg-gradient-to-r from-amber-100 to-orange-100 dark:from-amber-500/20 dark:to-orange-500/20 text-amber-700 dark:text-amber-400 rounded-full border border-amber-200 dark:border-amber-500/30">
                  Pro
                </span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                <span className="text-slate-500 dark:text-slate-400 text-xs">Online • Trả lời trong vài giây</span>
              </div>
            </div>

            {/* Action buttons */}
            <div className="flex items-center gap-2">
              <button className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors">
                <svg className="w-5 h-5 text-slate-500 dark:text-slate-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="1" />
                  <circle cx="19" cy="12" r="1" />
                  <circle cx="5" cy="12" r="1" />
                </svg>
              </button>
            </div>
          </div>

          {/* Messages Container */}
          <div className="p-6 min-h-[350px] max-h-[450px] overflow-y-auto space-y-5 bg-slate-50/30 dark:bg-slate-900/20">
            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex gap-3 animate-in slide-in-from-bottom-2 fade-in duration-300 ${
                  message.isUser ? 'flex-row-reverse' : ''
                }`}
              >
                {/* Avatar */}
                {!message.isUser && (
                  <div className="w-9 h-9 bg-gradient-to-br from-blue-600 to-cyan-500 rounded-full flex items-center justify-center flex-shrink-0 shadow-md">
                    <svg className="w-4 h-4 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" />
                    </svg>
                  </div>
                )}
                
                <div className={`flex-1 ${message.isUser ? 'max-w-[85%]' : ''}`}>
                  <div
                    className={`p-4 rounded-2xl max-w-full ${
                      message.isUser
                        ? 'bg-gradient-to-r from-blue-600 to-blue-500 text-white rounded-tr-md shadow-lg shadow-blue-500/20'
                        : 'bg-white/80 dark:bg-slate-800 border border-slate-200/50 dark:border-slate-700/50 rounded-tl-md shadow-sm'
                    }`}
                  >
                    <p className="text-sm leading-relaxed text-slate-900 dark:text-white whitespace-pre-wrap">{message.text}</p>
                  </div>
                  <span className={`text-xs text-slate-400 dark:text-slate-500 mt-1 block ${
                    message.isUser ? 'text-right' : ''
                  }`}>
                    {message.timestamp}
                  </span>
                </div>

                {/* User Avatar */}
                {message.isUser && (
                  <div className="w-9 h-9 bg-gradient-to-br from-blue-600 to-cyan-500 rounded-full flex items-center justify-center flex-shrink-0 shadow-md">
                    <svg className="w-4 h-4 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" />
                      <circle cx="12" cy="7" r="4" />
                    </svg>
                  </div>
                )}
              </div>
            ))}

            {/* Typing indicator */}
            {isTyping && (
              <div className="flex gap-3 animate-in slide-in-from-bottom-2 fade-in duration-300">
                <div className="w-9 h-9 bg-gradient-to-br from-blue-500 via-purple-500 to-pink-500 rounded-full flex items-center justify-center flex-shrink-0 shadow-md">
                  <svg className="w-4 h-4 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" />
                  </svg>
                </div>
                <div className="bg-white/80 dark:bg-slate-800 border border-slate-200/50 dark:border-slate-700/50 p-4 rounded-2xl rounded-tl-md shadow-sm">
                  <div className="flex gap-1">
                    <span className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                    <span className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                    <span className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                  </div>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Quick Actions */}
          <div className="flex gap-2.5 p-4 flex-wrap border-t border-slate-200/50 dark:border-slate-700/50 bg-white/50 dark:bg-slate-800/50 backdrop-blur-xl">
            <button className="px-4 py-2 bg-blue-50 dark:bg-blue-500/20 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-500/30 rounded-full text-xs font-medium cursor-pointer hover:bg-blue-100 dark:hover:bg-blue-500/30 transition-colors flex items-center gap-1.5">
              {renderIcon('quiz', 'blue')}
              {t('aiMentor.createQuiz')}
            </button>
            <button className="px-4 py-2 bg-purple-50 dark:bg-purple-500/20 text-purple-600 dark:text-purple-400 border border-purple-200 dark:border-purple-500/30 rounded-full text-xs font-medium cursor-pointer hover:bg-purple-100 dark:hover:bg-purple-500/30 transition-colors flex items-center gap-1.5">
              {renderIcon('explain', 'purple')}
              {t('aiMentor.explain')}
            </button>
            <button className="px-4 py-2 bg-green-50 dark:bg-green-500/20 text-green-600 dark:text-green-400 border border-green-200 dark:border-green-500/30 rounded-full text-xs font-medium cursor-pointer hover:bg-green-100 dark:hover:bg-green-500/30 transition-colors flex items-center gap-1.5">
              {renderIcon('analyze', 'green')}
              {t('aiMentor.analyze')}
            </button>
            <button className="px-4 py-2 bg-pink-50 dark:bg-pink-500/20 text-pink-600 dark:text-pink-400 border border-pink-200 dark:border-pink-500/30 rounded-full text-xs font-medium cursor-pointer hover:bg-pink-100 dark:hover:bg-pink-500/30 transition-colors flex items-center gap-1.5">
              {renderIcon('review', 'pink')}
              {t('aiMentor.review')}
            </button>
          </div>

          {/* Input Area */}
          <div className="p-4 bg-white/80 dark:bg-slate-800/80 backdrop-blur-xl border-t border-slate-200/50 dark:border-slate-700/50">
            <div className="flex items-end gap-3">
              <div className="flex-1 relative">
                <textarea
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  onKeyDown={handleKeyPress}
                  placeholder="Nhập câu hỏi của bạn..."
                  className="w-full px-4 py-3 bg-slate-100/80 dark:bg-slate-900/50 border border-slate-200/50 dark:border-slate-700/50 rounded-xl text-sm text-slate-900 dark:text-white placeholder-slate-400 resize-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 outline-none transition-all"
                  rows={1}
                  style={{ minHeight: '44px', maxHeight: '120px' }}
                />
              </div>
              <button
                onClick={handleSend}
                disabled={!inputValue.trim()}
                className="p-3 bg-gradient-to-r from-blue-600 to-cyan-500 hover:from-blue-700 hover:to-cyan-400 disabled:from-slate-300 disabled:to-slate-400 text-white rounded-xl transition-all shadow-lg shadow-blue-500/30 hover:shadow-blue-500/40 disabled:shadow-none disabled:cursor-not-allowed flex items-center justify-center"
              >
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M22 2L11 13" />
                  <path d="M22 2l-7 20-4-9-9-4 20-7z" />
                </svg>
              </button>
            </div>
            <p className="text-xs text-slate-400 dark:text-slate-500 mt-2 text-center">
              AI Mentor có thể mắc lỗi. Hãy kiểm tra thông tin quan trọng.
            </p>
          </div>
        </div>

        {/* CTA */}
        <div className="text-center mt-10">
          <button 
            onClick={handleOpenChat}
            className="group inline-flex items-center gap-3 px-8 py-4 bg-gradient-to-r from-blue-600 to-cyan-500 text-white rounded-xl font-bold text-sm hover:from-blue-700 hover:to-cyan-400 transition-all shadow-xl shadow-blue-500/30 hover:shadow-blue-500/40 hover:scale-105"
          >
            {t('aiMentor.tryNow')}
            <svg className="w-5 h-5 group-hover:translate-x-1 transition-transform" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M5 12h14M12 5l7 7-7 7" />
            </svg>
          </button>
        </div>
      </div>
    </section>
  );
};

export default AiMentorSection;
