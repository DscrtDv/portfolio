import React, { useState, useEffect, useRef } from 'react';
import ReactMarkdown from 'react-markdown';
import '../styles/Terminal.css';
import { FILE_SYSTEM } from '../utils/fileSystem';
import FileExplorer from './FileExplorer'; 

// --- CONSTANTS ---
const ASCII_ART = `
 _       __     __                             
| |     / /__  / /________  ____ ___  ___      
| | /| / / _ \\/ / ___/ __ \\/ __ \`__ \\/ _ \\     
| |/ |/ /  __/ / /__/ /_/ / / / / / /  __/     
|__/|__/\\___/_/\\___/\\____/_/ /_/ /_/\\___/      
`;

const WELCOME_MESSAGE = (
  <>
    <div className="ascii-wrapper">
      <div className="ascii-art">{ASCII_ART}</div>
    </div>
    <div>
      SYSTEM ONLINE. Type <span className="is-cmd">help</span> for command list.
    </div>
  </>
);

const HELP_COMMANDS = [
  { cmd: 'pwd', desc: 'Print working directory' },
  { cmd: 'ls', desc: 'List directory content' },
  { cmd: 'cd [dir]', desc: 'Change directory' },
  { cmd: 'cat [file]', desc: 'Read file content' },
  { cmd: 'clear', desc: 'Clear screen' },
];

const Terminal: React.FC = () => {
  const [input, setInput] = useState('');
  const [output, setOutput] = useState<React.ReactNode[]>([]);
  const [currentPath, setCurrentPath] = useState('~');
  
  const [history, setHistory] = useState<string[]>([]);
  const [historyPtr, setHistoryPtr] = useState(-1);
  
  const [isBooting, setIsBooting] = useState(true);
  const [loadingBar, setLoadingBar] = useState(0);
  
  const inputRef = useRef<HTMLInputElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  // 1. Boot Logic
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isBooting) {
      interval = setInterval(() => {
        setLoadingBar((prev) => {
          if (prev >= 100) {
            clearInterval(interval);
            setIsBooting(false);
            return 100;
          }
          return prev + 5; 
        });
      }, 30);
    }
    return () => clearInterval(interval);
  }, [isBooting]);

  useEffect(() => {
    if (!isBooting) {
       setOutput([<div key="init-welcome">{WELCOME_MESSAGE}</div>]);
    }
  }, [isBooting]);

  // 2. Auto-scroll
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [output, loadingBar, isBooting]);

  const handleFocus = () => inputRef.current?.focus();

  // 3. Command Logic
  const processCommand = (cmd: string) => {
    const cleanCmd = cmd.trim();
    if (!cleanCmd) return;

    setHistory((prev) => [...prev, cleanCmd]);
    setHistoryPtr(-1);

    const args = cleanCmd.split(' ');
    const mainCmd = args[0].toLowerCase();
    
    // Echo Line (The user's input)
    const echoLine = (
      <div key={Date.now() + '-echo'} className="command-echo">
        <span className="prompt-label">guest@system:{currentPath}$</span> 
        <span>{cleanCmd}</span>
      </div>
    );

    let response: React.ReactNode = null;

    switch (mainCmd) {
      case 'help':
        response = (
          <div>
            <div style={{ marginBottom: '10px' }}>AVAILABLE COMMANDS:</div>
            {HELP_COMMANDS.map((item) => (
              <div key={item.cmd} style={{ display: 'flex', marginBottom: '4px' }}>
                <span className="is-cmd" style={{ minWidth: '120px' }}>{item.cmd}</span>
                <span style={{ color: 'var(--text-dim)' }}>{item.desc}</span>
              </div>
            ))}
          </div>
        );
        break;
      
      case 'pwd':
        response = <div>{currentPath}</div>;
        break;

      case 'clear':
        setOutput([<div key={Date.now() + '-cls'}>{WELCOME_MESSAGE}</div>]);
        return; 

      case 'ls':
        const dir = FILE_SYSTEM[currentPath];
        if (dir && dir.children) {
            response = (
                <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap' }}>
                    {dir.children.map(child => {
                        const fullPath = currentPath === '~' ? `~/${child}` : `${currentPath}/${child}`;
                        const isDir = FILE_SYSTEM[fullPath]?.type === 'dir';
                        return (
                            <span key={child} className={isDir ? 'is-dir' : 'is-file'}>
                                {child}{isDir ? '/' : ''}
                            </span>
                        );
                    })}
                </div>
            );
        } else {
            response = <span className="is-error">Error: Cannot list content of this location.</span>;
        }
        break;

      case 'cd':
        const target = args[1];
        if (!target || target === '.') break;
        if (target === '..') {
            if (currentPath === '~') {
                response = <span className="is-error">Access Denied: Already at root.</span>;
            } else {
                const parts = currentPath.split('/');
                parts.pop();
                setCurrentPath(parts.join('/'));
            }
        } else {
            let newPath = '';
            if (target.startsWith('~/')) {
              newPath = target;
            } else {
              newPath = currentPath === '~' ? `~/${target}` : `${currentPath}/${target}`;
            }
            if (newPath.endsWith('/')) newPath = newPath.slice(0, -1);

            if (FILE_SYSTEM[newPath] && FILE_SYSTEM[newPath].type === 'dir') {
                setCurrentPath(newPath);
            } else {
                response = <span className="is-error">cd: no such directory: {target}</span>;
            }
        }
        break;

      case 'cat':
        const fileTarget = args[1];
        if (!fileTarget) { response = <span className="is-error">Usage: cat [filename]</span>; break; }
        
        let filePath = '';
        if (fileTarget.startsWith('~/')) {
            filePath = fileTarget;
        } else {
            filePath = currentPath === '~' ? `~/${fileTarget}` : `${currentPath}/${fileTarget}`;
        }

        const node = FILE_SYSTEM[filePath];

        if (node && node.type === 'file' && node.content) {
             // MARKDOWN RENDERING LOGIC
             if (filePath.endsWith('.md')) {
                 response = (
                    <div className="markdown-output">
                        <ReactMarkdown>{node.content}</ReactMarkdown>
                    </div>
                 );
             } else {
                 // Standard text rendering
                 response = <div className="pre-wrap">{node.content}</div>;
             }
        } else {
             response = <span className="is-error">cat: file not found: {fileTarget}</span>;
        }
        break;

      default:
        response = <span className="is-error">Command not found: {mainCmd}</span>;
    }

    if (response) setOutput((prev) => [...prev, echoLine, response]);
    else setOutput((prev) => [...prev, echoLine]);
  };

  // 4. Input Handler
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (isBooting) return;
    if (e.key === 'Enter') {
      processCommand(input);
      setInput('');
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (history.length > 0) {
        const newPtr = historyPtr === -1 ? history.length - 1 : Math.max(0, historyPtr - 1);
        setHistoryPtr(newPtr);
        setInput(history[newPtr]);
      }
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (historyPtr !== -1) {
        const newPtr = historyPtr + 1;
        if (newPtr >= history.length) {
          setHistoryPtr(-1);
          setInput('');
        } else {
          setHistoryPtr(newPtr);
          setInput(history[newPtr]);
        }
      }
    } else if (e.key === 'Tab') {
      e.preventDefault();
      const args = input.trim().split(' ');
      const lastArg = args[args.length - 1];
      const currentDirObj = FILE_SYSTEM[currentPath];
      if (currentDirObj && currentDirObj.children) {
         const matches = currentDirObj.children.filter(child => child.startsWith(lastArg));
         if (matches.length === 1) {
             const completion = matches[0];
             const isDir = FILE_SYSTEM[currentPath === '~' ? `~/${completion}` : `${currentPath}/${completion}`]?.type === 'dir';
             const suffix = isDir ? '/' : '';
             args.pop();
             args.push(completion + suffix);
             setInput(args.join(' '));
         }
      }
    }
  };

  // 5. Explorer Handler (Bridges Sidebar -> Terminal)
  const handleExplorerSelect = (path: string, type: 'dir' | 'file') => {
    if (type === 'dir') {
      processCommand(`cd ${path}`);
    } else {
      processCommand(`cat ${path}`);
    }
  };

  const renderLoader = () => {
    const bars = Math.floor(loadingBar / 5);
    const progress = '='.repeat(bars) + '-'.repeat(20 - bars);
    return `[${progress}] ${loadingBar}%`;
  };

  return (
    <>
      <div className="scanlines"></div>
      
      {/* APP CONTAINER (Split Layout) */}
      <div className="app-container">
        
        {/* LEFT: File Explorer */}
        {!isBooting && (
          <FileExplorer 
            fileSystem={FILE_SYSTEM} 
            onNavigate={handleExplorerSelect} 
          />
        )}

        {/* RIGHT: Terminal Panel */}
        <div className="terminal-panel" onClick={handleFocus}>
          {isBooting ? (
            <div className="boot-sequence">
               <div>INITIALIZING KERNEL...</div>
               <div>LOADING MODULES...</div>
               <div style={{ marginTop: '10px', color: 'var(--color-cmd)' }}>{renderLoader()}</div>
            </div>
          ) : (
            <>
              {output.map((line, index) => (
                <div key={index} className="output-line">{line}</div>
              ))}

              <div className="input-area">
                <span className="prompt-label">guest@system:{currentPath}$</span>
                <input
                  ref={inputRef}
                  type="text"
                  className="terminal-input"
                  style={{ width: `${Math.max(1, input.length)}ch` }} 
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  autoFocus
                  autoComplete="off"
                />
                <span className="cursor-block"></span>
                <div className="click-trap" onClick={handleFocus}></div>
              </div>
            </>
          )}
          <div ref={bottomRef} />
        </div>
      </div>
    </>
  );
};

export default Terminal;