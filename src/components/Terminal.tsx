import React, { useState, useEffect, useRef } from 'react';
import ReactMarkdown from 'react-markdown';
import '../styles/Terminal.css';
import { FILE_SYSTEM } from '../utils/fileSystem';
import FileExplorer from './FileExplorer'; 
import FileViewer from './FileViewer';

// --- ASCII ART CONSTANTS ---

const TT_LOGO = `
 ╔╦╗ ╔╦╗
  ║   ║
  ╩   ╩
TT41 SYSTEM
`;

const SYSTEM_INFO = `
USER:     guest@tt41
OS:       PortfolioOS v1.0
KERNEL:   React + Vite
UPTIME:   00:00:01
SHELL:    TS-BASH
RES:      1920x1080
THEME:    Cyber Circuit
CPU:      Virtual Neural Net
`;

const ASCII_WELCOME = `
 _       __     __                             
| |     / /__  / /________  ____ ___  ___      
| | /| / / _ \\/ / ___/ __ \\/ __ \`__ \\/ _ \\     
| |/ |/ /  __/ / /__/ /_/ / / / / / /  __/     
|__/|__/\\___/_/\\___/\\____/_/ /_/ /_/\\___/      
`;

const HELP_COMMANDS = [
  { cmd: 'sysinfo', desc: 'Display system information' },
  { cmd: 'pwd', desc: 'Print working directory' },
  { cmd: 'ls', desc: 'List directory content' },
  { cmd: 'cd [dir]', desc: 'Change directory (supports ..)' },
  { cmd: 'cat [file]', desc: 'Read file content' },
  { cmd: 'close', desc: 'Close active file viewer' },
  { cmd: 'clear', desc: 'Clear screen (Ctrl+L)' },
];

type BootPhase = 'loading' | 'login_msg' | 'welcome_msg' | 'ready';

const Terminal: React.FC = () => {
  const [input, setInput] = useState('');
  const [output, setOutput] = useState<React.ReactNode[]>([]);
  const [currentPath, setCurrentPath] = useState('~');
  
  // State for the open file (Split View)
  const [activeFile, setActiveFile] = useState<{name: string, content: string} | null>(null);
  
  const [history, setHistory] = useState<string[]>([]);
  const [historyPtr, setHistoryPtr] = useState(-1);
  
  // Boot State Machine
  const [bootPhase, setBootPhase] = useState<BootPhase>('loading');
  const [loadingBar, setLoadingBar] = useState(0);
  
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  
  // NEW: Track cursor position to toggle block vs bar cursor
  const [cursorPos, setCursorPos] = useState(0);

  const inputRef = useRef<HTMLInputElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  // --- HELPER: Path Resolution Algorithm ---
  const resolvePath = (base: string, target: string): string => {
    // 1. If target starts with '~', it's absolute. Ignore base.
    //    Else, it's relative. Start from base.
    let startParts = base === '~' ? [] : base.slice(2).split('/');
    if (target.startsWith('~/')) {
      startParts = [];
      target = target.slice(2);
    } else if (target === '~') {
      return '~';
    }

    // 2. Split target into segments
    const targetParts = target.split('/');

    // 3. Process segments
    for (const part of targetParts) {
      if (part === '.' || part === '') continue; // Current dir
      if (part === '..') {
        // Go back up one level
        if (startParts.length > 0) startParts.pop();
      } else {
        // Go down
        startParts.push(part);
      }
    }

    // 4. Reconstruct
    if (startParts.length === 0) return '~';
    return '~/' + startParts.join('/');
  };

  // --- HELPER: System Info ---
  const renderSysInfo = (isCentered: boolean) => (
    <div style={{ 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: isCentered ? 'center' : 'flex-start', 
        gap: '3rem',
        marginLeft: isCentered ? '0' : '10px',
        flexWrap: 'wrap'
    }}>
        <div className="ascii-art" style={{ color: 'var(--color-cmd)' }}>
          {TT_LOGO}
        </div>
        <div className="ascii-art" style={{ color: 'var(--text-main)', textAlign: 'left', fontSize: '0.9rem' }}>
          {SYSTEM_INFO}
        </div>
    </div>
  );

  // --- BOOT SEQUENCE LOGIC ---
  useEffect(() => {
    let interval: NodeJS.Timeout;
    let timeout: NodeJS.Timeout;

    if (bootPhase === 'loading') {
      interval = setInterval(() => {
        setLoadingBar((prev) => {
          if (prev >= 100) {
            clearInterval(interval);
            setBootPhase('login_msg'); 
            return 100;
          }
          return prev + 1; 
        });
      }, 30); 

    } else if (bootPhase === 'login_msg') {
      const handleKeyPress = () => setBootPhase('welcome_msg');
      window.addEventListener('keydown', handleKeyPress);
      window.addEventListener('click', handleKeyPress);
      return () => {
        window.removeEventListener('keydown', handleKeyPress);
        window.removeEventListener('click', handleKeyPress);
      };

    } else if (bootPhase === 'welcome_msg') {
      timeout = setTimeout(() => setBootPhase('ready'), 1500);
    }

    return () => {
      if (interval) clearInterval(interval);
      if (timeout) clearTimeout(timeout);
    };
  }, [bootPhase]);

  // Initial Ready Message
  useEffect(() => {
    if (bootPhase === 'ready') {
       setOutput([
         <div key="init">System initialized. Type <span className="is-cmd">help</span> to start.</div>
       ]);
       setTimeout(() => inputRef.current?.focus(), 10);
    }
  }, [bootPhase]);

  // Scroll logic
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [output, loadingBar, bootPhase]);

  const handleFocus = () => {
      if (!isMobileMenuOpen) {
          inputRef.current?.focus();
      }
  };

  // --- COMMAND LOGIC ---
  const processCommand = (cmd: string) => {
    const cleanCmd = cmd.trim();
    if (!cleanCmd) return;

    setHistory((prev) => [...prev, cleanCmd]);
    setHistoryPtr(-1);

    const args = cleanCmd.split(' ');
    const mainCmd = args[0].toLowerCase();
    
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

      case 'sysinfo':
        response = <div style={{ marginTop: '1rem', marginBottom: '1rem' }}>{renderSysInfo(false)}</div>;
        break;
      
      case 'pwd':
        response = <div>{currentPath}</div>;
        break;

      case 'clear':
        setOutput([]); 
        return; 

      case 'close':
        if (activeFile) {
            setActiveFile(null);
            response = <span className="is-cmd">Closed {activeFile.name}.</span>;
        } else {
            response = <span className="is-error">Error: No file currently open.</span>;
        }
        break;

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
        
        // NEW: Resolve Path Logic
        const newPath = resolvePath(currentPath, target);

        if (FILE_SYSTEM[newPath] && FILE_SYSTEM[newPath].type === 'dir') {
            setCurrentPath(newPath);
        } else {
            response = <span className="is-error">cd: no such directory: {target}</span>;
        }
        break;

      case 'cat':
        const fileTarget = args[1];
        if (!fileTarget) { response = <span className="is-error">Usage: cat [filename]</span>; break; }
        
        // NEW: Resolve Path Logic
        const resolvedFilePath = resolvePath(currentPath, fileTarget);

        const node = FILE_SYSTEM[resolvedFilePath];

        if (node && node.type === 'file' && node.content) {
             if (resolvedFilePath.endsWith('.md')) {
                 setActiveFile({ name: fileTarget, content: node.content });
                 response = <span className="is-cmd">Opening {fileTarget} in viewer...</span>;
             } else {
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

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (bootPhase !== 'ready') return;
    if (e.ctrlKey && e.key === 'l') {
        e.preventDefault();
        setOutput([]);
        return;
    }
    if (e.key === 'Enter') {
      processCommand(input);
      setInput('');
      setCursorPos(0);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (history.length > 0) {
        const newPtr = historyPtr === -1 ? history.length - 1 : Math.max(0, historyPtr - 1);
        setHistoryPtr(newPtr);
        setInput(history[newPtr]);
        setCursorPos(history[newPtr].length);
      }
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (historyPtr !== -1) {
        const newPtr = historyPtr + 1;
        if (newPtr >= history.length) {
          setHistoryPtr(-1);
          setInput('');
          setCursorPos(0);
        } else {
          setHistoryPtr(newPtr);
          setInput(history[newPtr]);
          setCursorPos(history[newPtr].length);
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
             const newValue = args.join(' ');
             setInput(newValue);
             setCursorPos(newValue.length);
         }
      }
    }
  };

  // --- CURSOR TRACKING ---
  const handleSelect = (e: React.SyntheticEvent<HTMLInputElement>) => {
    setCursorPos(e.currentTarget.selectionStart || 0);
  };

  const handleExplorerSelect = (path: string, type: 'dir' | 'file') => {
    if (type === 'dir') {
      processCommand(`cd ${path}`);
    } else {
      processCommand(`cat ${path}`);
      setIsMobileMenuOpen(false);
    }
  };

  const renderLoader = () => {
    const bars = Math.floor(loadingBar / 5);
    const progress = '='.repeat(bars) + '-'.repeat(20 - bars);
    return `[${progress}] ${loadingBar}%`;
  };

  const renderBootContent = () => {
    switch(bootPhase) {
      case 'loading':
        return (
          <div className="boot-sequence">
             <div>INITIALIZING KERNEL...</div>
             <div>LOADING MODULES...</div>
             <div style={{ marginTop: '10px', color: 'var(--color-cmd)' }}>{renderLoader()}</div>
          </div>
        );
      case 'login_msg':
        return (
          <div className="boot-message">
             {renderSysInfo(true)}
             <div style={{ marginTop: '2rem', color: '#555', animation: 'blink 1s infinite' }}>
                [ PRESS ANY KEY TO CONTINUE ]
             </div>
          </div>
        );
      case 'welcome_msg':
        return (
          <div className="boot-message">
             <div className="ascii-art">{ASCII_WELCOME}</div>
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <>
      <div className="scanlines"></div>
      
      <div className="mobile-header">
         <button className="mobile-menu-btn" onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}>
           {isMobileMenuOpen ? '✕ Close' : '📂 Files'}
         </button>
         <span className="mobile-path">{currentPath}</span>
      </div>

      <div className="app-container">
        {bootPhase === 'ready' && (
           <div className={`explorer-wrapper ${isMobileMenuOpen ? 'open' : ''}`}>
              <FileExplorer fileSystem={FILE_SYSTEM} onNavigate={handleExplorerSelect} />
           </div>
        )}

        <div className="terminal-panel" onClick={handleFocus}>
          {bootPhase !== 'ready' ? (
            renderBootContent()
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
                  // CONDITIONAL CLASS: If cursor is not at end, add 'editing'
                  className={`terminal-input ${cursorPos < input.length ? 'editing' : ''}`}
                  style={{ width: `${Math.max(1, input.length)}ch` }} 
                  value={input}
                  onChange={(e) => {
                      setInput(e.target.value);
                      setCursorPos(e.target.selectionStart || 0);
                  }}
                  onKeyDown={handleKeyDown}
                  // TRACK CURSOR MOVEMENT
                  onSelect={handleSelect}
                  onClick={handleSelect}
                  onKeyUp={handleSelect}
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

        {bootPhase === 'ready' && activeFile && (
          <FileViewer 
            filename={activeFile.name} 
            content={activeFile.content} 
            onClose={() => setActiveFile(null)} 
          />
        )}
      </div>
    </>
  );
};

export default Terminal;