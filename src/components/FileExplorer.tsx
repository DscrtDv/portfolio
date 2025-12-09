// src/components/FileExplorer.tsx
import React from 'react';
import '../styles/FileExplorer.css';
// Import the types explicitly
import { FILE_SYSTEM } from '../utils/fileSystem'; 

// Define Props Interface
interface FileExplorerProps {
  fileSystem: FileSystem;
  onNavigate: (path: string, type: 'dir' | 'file') => void;
}

interface FileNodeProps {
  path: string;
  fs: FileSystem;
  onNavigate: (path: string, type: 'dir' | 'file') => void;
}

// --- RECURSIVE COMPONENT ---
const FileNode: React.FC<FileNodeProps> = ({ path, fs, onNavigate }) => {
  const node = fs[path];
  
  // Safety check: If node doesn't exist or has no children, stop.
  if (!node || !node.children) return null;

  return (
    <div className="tree-indent">
      {/* FIX: Add '?' before .map to prevent crashing if children is undefined 
         FIX: Explicitly type 'childName' as string
      */}
      {node.children?.map((childName: string) => {
        const fullPath = path === '~' ? `~/${childName}` : `${path}/${childName}`;
        const childNode = fs[fullPath];
        
        // Skip if node missing
        if (!childNode) return null;
        
        const isDir = childNode.type === 'dir';

        return (
          <div key={fullPath}>
            <div 
              className="tree-item"
              onClick={(e) => {
                e.stopPropagation();
                onNavigate(fullPath, childNode.type);
              }}
            >
              <span className={isDir ? 'icon-dir' : 'icon-file'}>
                {isDir ? '📂' : '📄'}
              </span>
              <span>{childName}</span>
            </div>
            
            {/* Recursion: Only if it's a directory */}
            {isDir && (
              <FileNode 
                path={fullPath} 
                fs={fs} 
                onNavigate={onNavigate} 
              />
            )}
          </div>
        );
      })}
    </div>
  );
};

// --- MAIN EXPORT ---
const FileExplorer: React.FC<FileExplorerProps> = ({ fileSystem, onNavigate }) => {
  return (
    <div className="file-explorer">
      <div className="explorer-header">Explorer</div>
      {/* Start recursion at Root (~) */}
      <FileNode path="~" fs={fileSystem} onNavigate={onNavigate} />
    </div>
  );
};

export default FileExplorer;