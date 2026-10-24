import { useState, useEffect, useRef } from 'react';
import { theme, commonStyles } from '../styles/theme.js';
import api from '../services/api.js';

export default function ChatApp() {
  const [chats, setChats] = useState([]);
  const [activeChat, setActiveChat] = useState(null);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  
  const [documents, setDocuments] = useState([]);
  const [selectedDocs, setSelectedDocs] = useState([]);
  const [showNewChat, setShowNewChat] = useState(false);
  const [newChatTitle, setNewChatTitle] = useState('');
  
  const [pdfUrl, setPdfUrl] = useState(null);
  const [toast, setToast] = useState(null);

  const [isStreaming, setIsStreaming] = useState(false);
  const abortControllerRef = useRef(null);
  const messagesEndRef = useRef(null);

  const showToast = (message, type = 'error') => setToast({ message, type });

  // 1. Initial Load Effect
  useEffect(() => {
    const fetchChats = async () => {
      try {
        const { data } = await api.get('/chat');
        setChats(data.data);
      } catch (err) { 
        console.error(err);
        showToast('Failed to load chats'); 
      }
    };

    const fetchDocuments = async () => {
      try {
        const { data } = await api.get('/documents');
        setDocuments(data.data.filter(d => d.status === 'ready'));
      } catch (err) {
        console.error(err);
      }
    };

    fetchChats();
    fetchDocuments();
  }, []);

  // 2. Active Chat Change Effect
  useEffect(() => {
    const fetchMessages = async (chatId) => {
      try {
        const { data } = await api.get(`/chat/${chatId}/messages`);
        setMessages(data.data);
      } catch (err) {
        console.error(err);
      }
    };

    if (activeChat) {
      fetchMessages(activeChat._id);
      // NOTE: setPdfUrl(null) has been moved to the click handlers to satisfy ESLint
    }
  }, [activeChat]);

  // 3. Auto-scroll Effect
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // 4. Toast Timer Effect
  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  const handleCreateChat = async (e) => {
    e.preventDefault();
    if (selectedDocs.length === 0) return showToast('Select at least one document');
    
    try {
      const { data } = await api.post('/chat', { title: newChatTitle, documentIds: selectedDocs });
      setChats([data.data, ...chats]);
      setActiveChat(data.data);
      setPdfUrl(null); // Clear PDF when creating a new chat
      setShowNewChat(false);
      setNewChatTitle('');
      setSelectedDocs([]);
    } catch (err) { 
      console.error(err);
      showToast('Failed to create chat'); 
    }
  };

  const handleSelectChat = (chat) => {
    setActiveChat(chat);
    setPdfUrl(null); // Clear PDF when switching chats manually
  };

  const stopStreaming = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      setIsStreaming(false);
    }
  };

  const sendMessage = async (e) => {
    e.preventDefault();
    if (!input.trim() || !activeChat || isStreaming) return;

    const question = input;
    setInput('');
    
    const newMessages = [...messages, { role: 'user', content: question }];
    setMessages(newMessages);
    
    let assistantMessage = { role: 'assistant', content: '', sources: [] };
    setMessages([...newMessages, assistantMessage]);
    
    setIsStreaming(true);
    abortControllerRef.current = new AbortController();

    try {
      const response = await fetch(`http://localhost:5000/api/chat/${activeChat._id}/stream`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question }),
        credentials: 'include',
        signal: abortControllerRef.current.signal
      });

      const reader = response.body.getReader();
      const decoder = new TextDecoder('utf-8');
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const parts = buffer.split('\n\n');
        buffer = parts.pop(); 

        for (const part of parts) {
          if (part.startsWith('data: ')) {
            const data = JSON.parse(part.slice(6));
            if (data.error) {
               showToast(data.error);
               break;
            }
            if (data.text) {
              assistantMessage.content += data.text;
              setMessages([...newMessages, { ...assistantMessage }]); 
            }
            if (data.done) {
              assistantMessage.sources = data.sources;
              setMessages([...newMessages, { ...assistantMessage }]);
            }
          }
        }
      }
    } catch (err) {
      if (err.name !== 'AbortError') {
         console.error(err);
         showToast('Network connection failed');
      }
    } finally {
      setIsStreaming(false);
    }
  };

  const openPdfViewer = (filePath, pageNumber) => {
    setPdfUrl(`http://localhost:5000/${filePath}#page=${pageNumber}`);
  };

  // --- Styles ---
  const layoutStyle = { display: 'flex', height: 'calc(100vh - 60px)', backgroundColor: theme.colors.background, position: 'relative' };
  const sidebarStyle = { width: '280px', backgroundColor: theme.colors.surface, borderRight: `1px solid ${theme.colors.border}`, display: 'flex', flexDirection: 'column' };
  const mainStyle = { flex: 1, display: 'flex', flexDirection: 'column', position: 'relative' };
  
  const toastStyle = {
    position: 'absolute', top: theme.spacing.md, left: '50%', transform: 'translateX(-50%)',
    backgroundColor: toast?.type === 'error' ? theme.colors.error : theme.colors.success,
    color: '#fff', padding: `${theme.spacing.sm} ${theme.spacing.md}`, borderRadius: theme.borderRadius.md,
    boxShadow: '0 4px 6px rgba(0,0,0,0.1)', zIndex: 1000, fontWeight: 'bold'
  };

  const citationStyle = {
    backgroundColor: theme.colors.background, border: `1px solid ${theme.colors.border}`,
    borderRadius: theme.borderRadius.sm, padding: theme.spacing.sm, marginTop: theme.spacing.sm,
    fontSize: '0.8rem', cursor: 'pointer', transition: 'border-color 0.2s'
  };

  return (
    <div style={layoutStyle}>
      {toast && <div style={toastStyle}>{toast.message}</div>}

      {/* SIDEBAR */}
      <div style={sidebarStyle}>
        <div style={{ padding: theme.spacing.md, borderBottom: `1px solid ${theme.colors.border}` }}>
          <button style={commonStyles.button(false)} onClick={() => setShowNewChat(true)}>+ New Chat</button>
        </div>
        <div style={{ flex: 1, overflowY: 'auto' }}>
          {chats.length === 0 ? (
            <p style={{ padding: theme.spacing.md, color: theme.colors.textMuted, fontSize: '0.875rem' }}>No chats yet. Create one!</p>
          ) : (
            chats.map(chat => (
              <div key={chat._id} onClick={() => handleSelectChat(chat)}
                style={{ padding: theme.spacing.md, cursor: 'pointer', borderBottom: `1px solid ${theme.colors.border}`, backgroundColor: activeChat?._id === chat._id ? '#EEF2FF' : 'transparent' }}>
                <strong style={{ display: 'block', color: theme.colors.textMain, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{chat.title}</strong>
              </div>
            ))
          )}
        </div>
      </div>

      {/* SPLIT VIEW CONTAINER */}
      <div style={{ flex: 1, display: 'flex' }}>
        
        {/* CHAT AREA */}
        <div style={mainStyle}>
          {showNewChat ? (
            <div style={{ padding: theme.spacing.xl, maxWidth: '500px', margin: '0 auto', width: '100%' }}>
              <h2>Create New Chat</h2>
              <form onSubmit={handleCreateChat}>
                <input style={commonStyles.input} placeholder="Chat Title (e.g. Employee Handbook)" value={newChatTitle} onChange={(e) => setNewChatTitle(e.target.value)} required />
                <h4 style={{ marginBottom: theme.spacing.xs }}>Select Documents</h4>
                <div style={{ maxHeight: '300px', overflowY: 'auto', marginBottom: theme.spacing.md, border: `1px solid ${theme.colors.border}`, borderRadius: theme.borderRadius.md, padding: theme.spacing.sm }}>
                  {documents.length === 0 ? <p style={{ color: theme.colors.textMuted, fontSize: '0.875rem' }}>No ready documents found. Go upload some in the Dashboard.</p> : null}
                  {documents.map(doc => (
                    <label key={doc._id} style={{ display: 'flex', alignItems: 'center', gap: theme.spacing.sm, padding: theme.spacing.xs, cursor: 'pointer' }}>
                      <input type="checkbox" checked={selectedDocs.includes(doc._id)} onChange={() => setSelectedDocs(prev => prev.includes(doc._id) ? prev.filter(id => id !== doc._id) : [...prev, doc._id])} />
                      {doc.title}
                    </label>
                  ))}
                </div>
                <button type="submit" style={commonStyles.button(false)}>Start Chat</button>
                <button type="button" onClick={() => setShowNewChat(false)} style={{ ...commonStyles.button(false), backgroundColor: 'transparent', color: theme.colors.textMuted, marginTop: theme.spacing.sm }}>Cancel</button>
              </form>
            </div>
          ) : !activeChat ? (
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', color: theme.colors.textMuted }}>
              <h3>DocChat AI</h3>
              <p>Select a chat on the left to begin.</p>
            </div>
          ) : (
            <>
              {/* MESSAGES */}
              <div style={{ flex: 1, overflowY: 'auto', padding: theme.spacing.xl }}>
                {messages.length === 0 && <p style={{ textAlign: 'center', color: theme.colors.textMuted }}>Send a message to start the conversation.</p>}
                
                {messages.map((msg, i) => (
                  <div key={i} style={{ marginBottom: theme.spacing.xl, display: 'flex', flexDirection: 'column', alignItems: msg.role === 'user' ? 'flex-end' : 'flex-start' }}>
                    <div style={{ maxWidth: pdfUrl ? '95%' : '75%', padding: theme.spacing.md, borderRadius: theme.borderRadius.lg, backgroundColor: msg.role === 'user' ? theme.colors.primary : theme.colors.surface, color: msg.role === 'user' ? '#fff' : theme.colors.textMain, border: msg.role === 'assistant' ? `1px solid ${theme.colors.border}` : 'none' }}>
                      <p style={{ margin: 0, whiteSpace: 'pre-wrap', lineHeight: '1.5' }}>{msg.content}</p>
                      
                      {msg.sources && msg.sources.length > 0 && (
                        <div style={{ marginTop: theme.spacing.md, paddingTop: theme.spacing.sm, borderTop: `1px solid ${theme.colors.border}`, display: 'flex', flexDirection: 'column', gap: '8px' }}>
                          <small style={{ fontWeight: 'bold' }}>Sources (Click to view):</small>
                          {msg.sources.map((src, idx) => (
                            <div 
                              key={idx} 
                              style={citationStyle}
                              onClick={() => openPdfViewer(src.filePath, src.page)}
                              onMouseEnter={(e) => e.currentTarget.style.borderColor = theme.colors.primary}
                              onMouseLeave={(e) => e.currentTarget.style.borderColor = theme.colors.border}
                            >
                              <strong style={{ color: theme.colors.primary }}>{src.documentTitle} (Page {src.page})</strong>
                              <p style={{ margin: '4px 0 0 0', color: theme.colors.textMuted, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                                "{src.text}"
                              </p>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
                <div ref={messagesEndRef} />
              </div>

              {/* INPUT */}
              <div style={{ padding: theme.spacing.md, backgroundColor: theme.colors.surface, borderTop: `1px solid ${theme.colors.border}`, display: 'flex', gap: theme.spacing.sm }}>
                <input style={{ ...commonStyles.input, marginBottom: 0, flex: 1 }} placeholder="Ask a question..." value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && sendMessage(e)} disabled={isStreaming} />
                {isStreaming ? (
                  <button onClick={stopStreaming} style={{ ...commonStyles.button(false), width: 'auto', backgroundColor: theme.colors.error }}>Stop</button>
                ) : (
                  <button onClick={sendMessage} style={{ ...commonStyles.button(false), width: 'auto' }}>Send</button>
                )}
              </div>
            </>
          )}
        </div>

        {/* PDF VIEWER PANEL */}
        {pdfUrl && (
          <div style={{ flex: 1, borderLeft: `1px solid ${theme.colors.border}`, display: 'flex', flexDirection: 'column', backgroundColor: '#e5e7eb' }}>
            <div style={{ padding: theme.spacing.sm, backgroundColor: theme.colors.surface, borderBottom: `1px solid ${theme.colors.border}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontWeight: 'bold' }}>Source Document Viewer</span>
              <button onClick={() => setPdfUrl(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '1.2rem' }}>✕</button>
            </div>
            <iframe 
              src={pdfUrl} 
              style={{ width: '100%', height: '100%', border: 'none' }} 
              title="PDF Viewer"
            />
          </div>
        )}
      </div>
    </div>
  );
}