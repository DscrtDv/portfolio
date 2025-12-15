// src/components/FileViewer.tsx
import React from 'react';
import ReactMarkdown from 'react-markdown';
// Make sure this points to where you saved that CSS!
import '../styles/FileViewer.css'; 

interface FileViewerProps {
  filename: string;
  content: string;
  onClose: () => void;
}

const FileViewer: React.FC<FileViewerProps> = ({ filename, content, onClose }) => {
  return (
    <div className="file-viewer">
      <div className="viewer-header">
        {/* Updated class name to match CSS (.file-name) */}
        <span className="file-name">{filename}</span>
        
        {/* Updated class name to match CSS (.close-btn) */}
        <button className="close-btn" onClick={onClose}>
          Close ✕
        </button>
      </div>
      
      <div className="viewer-content">
        <ReactMarkdown
          components={{
            // Keep the 'open in new tab' logic we added earlier
            a: (props) => (
              <a 
                {...props} 
                target="_blank" 
                rel="noopener noreferrer" 
              />
            )
          }}
        >
          {content}
        </ReactMarkdown>
      </div>
    </div>
  );
};

export default FileViewer;