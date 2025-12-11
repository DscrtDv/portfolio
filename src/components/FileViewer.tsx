import React from 'react';
import ReactMarkdown from 'react-markdown';
import '../styles/FileViewer.css';

interface FileViewerProps {
  filename: string;
  content: string;
  onClose: () => void;
}

const FileViewer: React.FC<FileViewerProps> = ({ filename, content, onClose }) => {
  return (
    <div className="file-viewer">
      {/* Header with Title and Close Button */}
      <div className="viewer-header">
        <span className="file-name">{filename}</span>
        <button className="close-btn" onClick={onClose}>
          ✕ CLOSE
        </button>
      </div>

      {/* Scrollable Content */}
      <div className="viewer-content">
        <ReactMarkdown>{content}</ReactMarkdown>
      </div>
    </div>
  );
};

export default FileViewer;