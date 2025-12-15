import React, { useState } from 'react';
import '../styles/FileExplorer.css'; // Updated path
import { FILE_SYSTEM } from '../utils/fileSystem'; // Updated path

interface FileExplorerProps {
  fileSystem: typeof FILE_SYSTEM; // Using typeof ensures strict match
  onNavigate: (path: string, type: 'dir' | 'file') => void;
}

interface FileNodeProps {
  path: string;
  fs: typeof FILE_SYSTEM;
  onNavigate: (path: string, type: 'dir' | 'file') => void;
  expandedFolders: Set<string>;
  toggleFolder: (path: string) => void;
}

// --- RECURSIVE COMPONENT ---
const FileNode: React.FC<FileNodeProps> = ({ path, fs, onNavigate, expandedFolders, toggleFolder }) => {
  const node = fs[path];
  
  if (!node || !node.children) return null;

  // --- SORTING LOGIC ---
  // Create a copy of the array and sort it: Directories first, then Files.
  const sortedChildren = [...node.children].sort((a, b) => {
    const fullPathA = path === '~' ? `~/${a}` : `${path}/${a}`;
    const fullPathB = path === '~' ? `~/${b}` : `${path}/${b}`;
    const nodeA = fs[fullPathA];
    const nodeB = fs[fullPathB];

    // Safety check
    if (!nodeA || !nodeB) return 0;

    // 1. Dirs before Files
    if (nodeA.type === 'dir' && nodeB.type !== 'dir') return -1;
    if (nodeA.type !== 'dir' && nodeB.type === 'dir') return 1;

    // 2. Alphabetical sort (optional, but looks nicer)
    return a.localeCompare(b);
  });

  return (
    <div className="tree-indent">
      {sortedChildren.map((childName: string) => {
        const fullPath = path === '~' ? `~/${childName}` : `${path}/${childName}`;
        const childNode = fs[fullPath];
        
        if (!childNode) return null;
        
        const isDir = childNode.type === 'dir';
        const isExpanded = expandedFolders.has(fullPath);

        return (
          <div key={fullPath}>
            <div 
              className="tree-item"
              onClick={(e) => {
                e.stopPropagation();
                onNavigate(fullPath, childNode.type);
                if (isDir) {
                  toggleFolder(fullPath);
                }
              }}
            >
              {isDir && (
                <span className="arrow-icon">
                  {isExpanded ? '▼' : '▶'}
                </span>
              )}
              
              <span className={isDir ? 'icon-dir' : 'icon-file'}>
                {isDir ? '📂' : '▫️'}
              </span>
              <span>{childName}</span>
            </div>
            
            {/* Recursion: Only render children if Expanded */}
            {isDir && isExpanded && (
              <FileNode 
                path={fullPath} 
                fs={fs} 
                onNavigate={onNavigate} 
                expandedFolders={expandedFolders}
                toggleFolder={toggleFolder}
              />
            )}
          </div>
        );
      })}
    </div>
  );
};

// --- MAIN COMPONENT ---
const FileExplorer: React.FC<FileExplorerProps> = ({ fileSystem, onNavigate }) => {
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set());

  // --- ACCORDION LOGIC ---
  const toggleFolder = (targetPath: string) => {
    setExpandedFolders((prev) => {
      const next = new Set<string>();

      // 1. If clicking a folder that is ALREADY open, just close it (return empty set or keep parents)
      // Note: If you want closing a folder to NOT close everything else, logic varies.
      // But for "Accordion", usually we want to focus on the new path.
      if (prev.has(targetPath)) {
        // If we want to allow collapsing the current item without clearing everything else:
        // We iterate prev, keep everything that DOES NOT start with targetPath
        prev.forEach(p => {
            if (!p.startsWith(targetPath)) next.add(p);
        });
        return next;
      }

      // 2. If Opening a NEW folder:
      // We want to keep the ROOT path and PARENTS of the target open.
      // Everything else (siblings, unrelated branches) gets closed.
      
      // Re-build the parent chain for the target
      // e.g. target = "~/projects/web" -> we need "~" and "~/projects" open.
      let tempPath = targetPath;
      while (tempPath !== '~' && tempPath.includes('/')) {
        // Add the current path (e.g. ~/projects/web)
        next.add(tempPath);
        // Move up one level (e.g. ~/projects)
        tempPath = tempPath.substring(0, tempPath.lastIndexOf('/'));
      }
      // Add the final remaining parent (or top level dir)
      if (tempPath !== '~') next.add(tempPath);

      return next;
    });
  };

  return (
    <div className="file-explorer">
      <div className="explorer-header">Explorer</div>
      <FileNode 
        path="~" 
        fs={fileSystem} 
        onNavigate={onNavigate} 
        expandedFolders={expandedFolders}
        toggleFolder={toggleFolder}
      />
    </div>
  );
};

export default FileExplorer;