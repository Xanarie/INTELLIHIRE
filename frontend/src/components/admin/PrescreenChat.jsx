// frontend/src/components/admin/PrescreenChat.jsx
import React, { useState, useEffect, useRef } from 'react';
import { apiPublic, api } from '@/config/api';
import { MessageCircle, Send, Loader2, CheckCircle2, XCircle, User, Bot } from 'lucide-react';

const PrescreenChat = ({ applicant, job, onClose, onComplete }) => {
  const [sessionId, setSessionId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isComplete, setIsComplete] = useState(false);
  const [summary, setSummary] = useState(null);
  const [error, setError] = useState(null);
  
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    startChat();
  }, []);

  const startChat = async () => {
    setIsLoading(true);
    setError(null);
    
    // Check for resume text
    let resumeText = applicant.resume_focus_text || applicant.resume_text || '';
    
    // Build job description from all available fields
    const jobDescParts = [
      job.job_summary,
      job.key_responsibilities,
      job.required_qualifications,
      job.preferred_qualifications,
      job.key_competencies
    ].filter(Boolean);
    const jobDesc = jobDescParts.join('\n\n');
    
    // If no resume text but has resume path, try to extract it
    if (!resumeText.trim() && applicant.resume_path) {
      setError('Extracting resume text... This may take a moment.');
      try {
        // Trigger prescreen to extract and store resume text
        await api.post(`/applicants/${applicant.id}/prescreen`);
        setError('Resume extracted! Please try starting the chat again.');
        setIsLoading(false);
        return;
      } catch (err) {
        setError('Could not extract resume text. Please ensure the resume is uploaded correctly.');
        setIsLoading(false);
        return;
      }
    }
    
    if (!resumeText.trim()) {
      setError('This applicant does not have a resume uploaded. Please upload a resume first.');
      setIsLoading(false);
      return;
    }
    
    if (!jobDesc.trim()) {
      setError('This job does not have a description. Please add a job description first.');
      setIsLoading(false);
      return;
    }
    
    try {
      console.log('Starting chat with:', {
        applicant_name: `${applicant.f_name} ${applicant.l_name}`,
        position: job.title,
        has_resume: !!resumeText,
        has_job_desc: !!jobDesc,
      });
      
      const response = await apiPublic.post('/ai/prescreen-chat/start', {
        applicant_name: `${applicant.f_name} ${applicant.l_name}`,
        position: job.title,
        resume_text: resumeText,
        job_description: jobDesc,
        match_score: applicant.ai_job_match_score || applicant.ai_resume_score || 0.5,
      });
      
      console.log('Chat started successfully:', response.data);
      setSessionId(response.data.session_id);
      setMessages(response.data.conversation_history);
    } catch (err) {
      console.error('Start chat error details:', {
        message: err.message,
        response: err.response?.data,
        status: err.response?.status,
      });
      setError(`Failed to start conversation: ${err.response?.data?.detail || err.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const sendMessage = async () => {
    if (!inputMessage.trim() || isLoading || isComplete) return;
    
    const userMessage = inputMessage.trim();
    setInputMessage('');
    setIsLoading(true);
    setError(null);
    
    try {
      const response = await apiPublic.post('/ai/prescreen-chat/message', {
        session_id: sessionId,
        message: userMessage,
      });
      
      setMessages(response.data.conversation_history);
      setIsComplete(response.data.is_complete);
      
      if (response.data.summary) {
        setSummary(response.data.summary);
        if (onComplete) {
          onComplete(response.data.summary);
        }
      }
    } catch (err) {
      setError('Failed to send message. Please try again.');
      console.error('Send message error:', err);
    } finally {
      setIsLoading(false);
      inputRef.current?.focus();
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const getScoreColor = (score) => {
    if (score >= 0.75) return 'text-emerald-600';
    if (score >= 0.55) return 'text-amber-500';
    return 'text-rose-500';
  };

  const getScoreBg = (score) => {
    if (score >= 0.75) return 'bg-emerald-50 border-emerald-200';
    if (score >= 0.55) return 'bg-amber-50 border-amber-200';
    return 'bg-rose-50 border-rose-200';
  };

  const getRecommendationIcon = (recommendation) => {
    if (recommendation === 'strong_match') return <CheckCircle2 className="text-emerald-500" size={20} />;
    if (recommendation === 'potential_match') return <MessageCircle className="text-amber-500" size={20} />;
    return <XCircle className="text-rose-400" size={20} />;
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-3xl h-[85vh] flex flex-col overflow-hidden">
        
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 bg-gradient-to-r from-[#1A3C6E] to-[#00AECC]">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center">
                <MessageCircle size={20} className="text-white" />
              </div>
              <div>
                <h2 className="text-lg font-black text-white">
                  AI Pre-screening Chat
                </h2>
                <p className="text-xs text-white/80">
                  {applicant.f_name} {applicant.l_name} • {job.title}
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="text-white/80 hover:text-white text-2xl font-light leading-none px-2"
            >
              ×
            </button>
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-slate-50">
          {error && (
            <div className="bg-rose-50 border border-rose-200 rounded-xl p-4 text-sm text-rose-600">
              {error}
            </div>
          )}
          
          {messages.map((msg, idx) => {
            const isAssistant = msg.role === 'assistant';
            const isCandidate = msg.role === 'candidate';
            
            return (
              <div
                key={idx}
                className={`flex gap-3 ${isCandidate ? 'flex-row-reverse' : ''}`}
              >
                {/* Avatar */}
                <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
                  isAssistant ? 'bg-[#2A5C9A]' : 'bg-slate-300'
                }`}>
                  {isAssistant ? (
                    <Bot size={16} className="text-white" />
                  ) : (
                    <User size={16} className="text-white" />
                  )}
                </div>
                
                {/* Message bubble */}
                <div className={`flex-1 max-w-[75%] ${isCandidate ? 'flex justify-end' : ''}`}>
                  <div className={`rounded-2xl px-4 py-3 ${
                    isAssistant 
                      ? 'bg-white border border-slate-200' 
                      : 'bg-[#2A5C9A] text-white'
                  }`}>
                    <p className="text-sm leading-relaxed whitespace-pre-wrap">
                      {msg.content}
                    </p>
                    
                    {/* Show analysis for candidate responses */}
                    {msg.analysis && (
                      <div className="mt-2 pt-2 border-t border-slate-200/50">
                        <div className="flex gap-2 text-xs">
                          <span className="text-white/70">Quality:</span>
                          <span className="font-bold">
                            {Math.round(msg.analysis.quality_score * 100)}%
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                  
                  {/* Topic indicator */}
                  {msg.topic && (
                    <p className="text-[10px] text-slate-400 mt-1 px-2">
                      Topic: {msg.topic}
                    </p>
                  )}
                </div>
              </div>
            );
          })}
          
          {isLoading && (
            <div className="flex gap-3">
              <div className="w-8 h-8 rounded-full bg-[#2A5C9A] flex items-center justify-center">
                <Bot size={16} className="text-white" />
              </div>
              <div className="bg-white border border-slate-200 rounded-2xl px-4 py-3">
                <Loader2 size={16} className="text-[#2A5C9A] animate-spin" />
              </div>
            </div>
          )}
          
          <div ref={messagesEndRef} />
        </div>

        {/* Summary (shown when complete) */}
        {isComplete && summary && (
          <div className={`mx-6 mb-4 rounded-2xl border-2 p-4 ${getScoreBg(summary.combined_score)}`}>
            <div className="flex items-start gap-3">
              {getRecommendationIcon(summary.recommendation)}
              <div className="flex-1">
                <h3 className="text-sm font-black text-slate-800 mb-1">
                  Pre-screening Complete
                </h3>
                <p className="text-xs text-slate-600 mb-3">
                  {summary.message}
                </p>
                
                <div className="grid grid-cols-3 gap-3">
                  <div className="bg-white/50 rounded-xl p-2">
                    <p className="text-[10px] text-slate-500 uppercase tracking-wide mb-0.5">
                      Combined Score
                    </p>
                    <p className={`text-lg font-black ${getScoreColor(summary.combined_score)}`}>
                      {Math.round(summary.combined_score * 100)}%
                    </p>
                  </div>
                  <div className="bg-white/50 rounded-xl p-2">
                    <p className="text-[10px] text-slate-500 uppercase tracking-wide mb-0.5">
                      Match Score
                    </p>
                    <p className={`text-lg font-black ${getScoreColor(summary.match_score)}`}>
                      {Math.round(summary.match_score * 100)}%
                    </p>
                  </div>
                  <div className="bg-white/50 rounded-xl p-2">
                    <p className="text-[10px] text-slate-500 uppercase tracking-wide mb-0.5">
                      Chat Quality
                    </p>
                    <p className={`text-lg font-black ${getScoreColor(summary.conversation_quality)}`}>
                      {Math.round(summary.conversation_quality * 100)}%
                    </p>
                  </div>
                </div>
                
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {summary.topics_covered.map((topic) => (
                    <span
                      key={topic}
                      className="px-2 py-1 bg-white/70 rounded-lg text-[10px] font-bold text-slate-600"
                    >
                      {topic}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Input */}
        {!isComplete && (
          <div className="px-6 py-4 border-t border-slate-200 bg-white">
            <div className="flex gap-3">
              <input
                ref={inputRef}
                type="text"
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Type your response..."
                disabled={isLoading || !sessionId}
                className="flex-1 px-4 py-3 rounded-xl border-2 border-slate-200 focus:border-[#2A5C9A] outline-none text-sm disabled:bg-slate-50 disabled:text-slate-400"
              />
              <button
                onClick={sendMessage}
                disabled={isLoading || !inputMessage.trim() || !sessionId}
                className="px-6 py-3 rounded-xl bg-[#2A5C9A] text-white font-bold text-sm hover:bg-[#1e4470] disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center gap-2"
              >
                {isLoading ? (
                  <Loader2 size={16} className="animate-spin" />
                ) : (
                  <Send size={16} />
                )}
                Send
              </button>
            </div>
            <p className="text-[10px] text-slate-400 mt-2">
              Press Enter to send • Shift+Enter for new line
            </p>
          </div>
        )}
        
        {isComplete && (
          <div className="px-6 py-4 border-t border-slate-200 bg-white">
            <button
              onClick={onClose}
              className="w-full py-3 rounded-xl bg-slate-100 text-slate-700 font-bold text-sm hover:bg-slate-200 transition-all"
            >
              Close
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default PrescreenChat;
