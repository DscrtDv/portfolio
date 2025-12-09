// src/data/fileSystem.ts

// --- 1. DEFINE TYPES HERE (No import needed) ---
export type FileSystemNode = { 
  type: 'file' | 'dir'; 
  content?: string; 
  children?: string[] 
};

export type FileSystem = { 
  [key: string]: FileSystemNode 
};

// --- 2. AUTOMATED DISCOVERY ---
// This scans your 'filesystem' folder for ANY file
const modules = import.meta.glob('../filesystem/**/*', { as: 'raw', eager: true });

// --- 3. THE BUILDER FUNCTION ---
const buildFileSystem = (): FileSystem => {
  const fs: FileSystem = {
    '~': { type: 'dir', children: [] }
  };

  Object.keys(modules).forEach((filePath) => {
    // filePath is like: "../filesystem/projects/test.txt"
    // Remove the prefix to get: "projects/test.txt"
    const relativePath = filePath.replace('../filesystem/', '');
    const content = modules[filePath] as string;

    const parts = relativePath.split('/');
    const fileName = parts.pop(); 
    
    if (!fileName) return;

    let currentPath = '~';
    
    // Create folders recursively
    parts.forEach((folderName) => {
      const nextPath = `${currentPath}/${folderName}`;
      
      if (!fs[nextPath]) {
        fs[nextPath] = { type: 'dir', children: [] };
        // Link to parent
        if (!fs[currentPath].children?.includes(folderName)) {
            fs[currentPath].children?.push(folderName);
        }
      }
      
      currentPath = nextPath;
    });

    // Create file
    const fullFilePath = `${currentPath}/${fileName}`;
    fs[fullFilePath] = { type: 'file', content: content };

    // Link file to parent
    if (!fs[currentPath].children?.includes(fileName)) {
      fs[currentPath].children?.push(fileName);
    }
  });

  return fs;
};

export const FILE_SYSTEM = buildFileSystem();
