import { useState, useEffect, useRef } from 'react';
// import { useAuth } from '../context/AuthContext.jsx';
import { theme, commonStyles } from '../styles/theme.js';
import api from '../services/api.js';

export default function Dashboard() {
  const [documents, setDocuments] = useState([]);
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState('');
  const fileInputRef = useRef(null);

  // Fetch documents on mount
  const fetchDocuments = async () => {
    try {
      const { data } = await api.get('/documents');
      setDocuments(data.data);
    } catch (err) {
      console.error("Failed to fetch documents", err);
    }
  };

  useEffect(() => {
    // eslint-disable-next-line
    fetchDocuments();
  }, []);

  // Polling logic: If any document is 'processing', refetch every 3 seconds
  useEffect(() => {
    const isProcessing = documents.some(doc => doc.status === 'processing');
    let intervalId;

    if (isProcessing) {
      intervalId = setInterval(() => {
        fetchDocuments();
      }, 3000);
    }
    return () => {
      if (intervalId) clearInterval(intervalId);
    };
  }, [documents]);

  const handleFileUpload = async (file) => {
    if (file.type !== 'application/pdf') {
      setError('Only PDF files are allowed.');
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      setError('File must be smaller than 10MB.');
      return;
    }

    setError('');
    setIsUploading(true);

    // Create a FormData object to safely wrap the binary file
    const formData = new FormData();
    formData.append('file', file); // 'file' must match upload.single('file') in backend

    try {
      await api.post('/documents', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      fetchDocuments(); // Refresh list to show the new 'processing' document
    } catch (err) {
      setError(err.response?.data?.error || 'Upload failed');
    } finally {
      setIsUploading(false);
    }
  };

  // --- Drag and Drop Handlers ---
  const onDragOver = (e) => {
    e.preventDefault(); // Required to allow dropping
    setIsDragging(true);
  };
  const onDragLeave = () => setIsDragging(false);
  const onDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFileUpload(file);
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Delete this document forever?")) return;
    try {
      await api.delete(`/documents/${id}`);
      setDocuments(docs => docs.filter(d => d._id !== id));
    } catch (err) {
        console.error("Delete error:", err); // Log it to satisfy the linter
        setError('Failed to delete document');
    }
  };

  // --- Inline Styles ---
  const dropzoneStyle = {
    border: `2px dashed ${isDragging ? theme.colors.primary : theme.colors.border}`,
    backgroundColor: isDragging ? '#EEF2FF' : theme.colors.surface,
    padding: '40px',
    textAlign: 'center',
    borderRadius: theme.borderRadius.lg,
    cursor: 'pointer',
    transition: 'all 0.2s',
    marginBottom: theme.spacing.xl
  };

  const badgeStyle = (status) => ({
    padding: '4px 8px',
    borderRadius: '12px',
    fontSize: '0.75rem',
    fontWeight: 'bold',
    backgroundColor: status === 'ready' ? '#D1FAE5' : status === 'failed' ? '#FEE2E2' : '#FEF3C7',
    color: status === 'ready' ? '#065F46' : status === 'failed' ? '#991B1B' : '#92400E',
  });

  return (
    <div style={{ maxWidth: '800px', margin: '0 auto', padding: theme.spacing.xl }}>
      <h2 style={{ marginTop: 0 }}>Dashboard</h2>
      <p style={{ color: theme.colors.textMuted }}>Upload a PDF to begin chatting with it.</p>

      {error && <div style={commonStyles.errorText}>{error}</div>}

      {/* Hidden file input triggered by clicking the dropzone */}
      <input 
        type="file" 
        accept="application/pdf" 
        ref={fileInputRef}
        style={{ display: 'none' }} 
        onChange={(e) => {
          const file = e.target.files[0];
          if (file) handleFileUpload(file);
          e.target.value = ''; // Reset input so the same file can be uploaded again if needed
        }}
      />

      <div 
        style={dropzoneStyle}
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        onDrop={onDrop}
        onClick={() => fileInputRef.current.click()}
      >
        <p style={{ margin: 0, fontWeight: 'bold', color: theme.colors.primary }}>
          {isUploading ? 'Uploading...' : 'Click or Drag & Drop a PDF here'}
        </p>
        <p style={{ fontSize: '0.875rem', color: theme.colors.textMuted, marginTop: theme.spacing.sm }}>Max file size: 10MB</p>
      </div>

      <h3>Your Documents</h3>
      {documents.length === 0 ? (
        <p style={{ color: theme.colors.textMuted }}>No documents uploaded yet.</p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: theme.spacing.md }}>
          {documents.map(doc => (
            <div key={doc._id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: theme.spacing.md, backgroundColor: theme.colors.surface, borderRadius: theme.borderRadius.md, border: `1px solid ${theme.colors.border}` }}>
              <div>
                <strong style={{ display: 'block', marginBottom: theme.spacing.xs }}>{doc.title}</strong>
                <span style={badgeStyle(doc.status)}>{doc.status.toUpperCase()}</span>
              </div>
              <div style={{ display: 'flex', gap: theme.spacing.sm }}>
                <button 
                  style={{ ...commonStyles.button(false, doc.status !== 'ready'), width: 'auto' }}
                  disabled={doc.status !== 'ready'}
                  onClick={() => alert('Chat interface coming in Stage 9!')}
                >
                  Chat
                </button>
                <button 
                  style={{ padding: '8px 12px', backgroundColor: theme.colors.error, color: 'white', border: 'none', borderRadius: theme.borderRadius.md, cursor: 'pointer' }}
                  onClick={() => handleDelete(doc._id)}
                >
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}