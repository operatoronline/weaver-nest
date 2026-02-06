
import React, { useState, useRef, useEffect, memo, useMemo, useCallback } from 'react';
import { CanvasNode as CanvasNodeType, CanvasFile, HandleSide } from '../types';
import { MarkdownRenderer } from './MarkdownRenderer';

// Type definition for Prism global
declare global {
  interface Window {
    Prism: any;
  }
}

interface CanvasNodeProps {
    node: CanvasNodeType;
    isSelected: boolean;
    scale: number;
    onMove: (id: string, x: number, y: number) => void;
    onSelect: (id: string, multi: boolean) => void;
    onDelete: (id: string) => void;
    onUpdate: (id: string, updates: Partial<CanvasNodeType>) => void;
    onConnectStart: (id: string, side: HandleSide) => void;
    onConnectEnd: (id: string, side: HandleSide) => void;
    snapToGrid: boolean;
    isConnecting: boolean;
    onContextMenu: (id: string, e: React.MouseEvent) => void;
}

const Handle = ({ side, onMouseDown, onMouseUp, isConnecting }: { side: HandleSide, onMouseDown: (e: React.MouseEvent | React.TouchEvent) => void, onMouseUp: (e: React.MouseEvent | React.TouchEvent) => void, isConnecting: boolean }) => {
    // Positioning logic
    const positionClasses = {
        top: "-top-3 left-1/2 -translate-x-1/2 w-8 h-6 cursor-crosshair",
        bottom: "-bottom-3 left-1/2 -translate-x-1/2 w-8 h-6 cursor-crosshair",
        left: "-left-3 top-1/2 -translate-y-1/2 h-8 w-6 cursor-crosshair",
        right: "-right-3 top-1/2 -translate-y-1/2 h-8 w-6 cursor-crosshair"
    };

    const dotClasses = {
        top: "top-1 left-1/2 -translate-x-1/2",
        bottom: "bottom-1 left-1/2 -translate-x-1/2",
        left: "left-1 top-1/2 -translate-y-1/2",
        right: "right-1 top-1/2 -translate-y-1/2"
    }

    return (
        <div 
            className={`absolute z-[100] flex items-center justify-center group/handle ${positionClasses[side]}`}
            onMouseDown={onMouseDown}
            onMouseUp={onMouseUp}
            onTouchStart={onMouseDown}
            onTouchEnd={onMouseUp}
        >
             {/* Visual Dot */}
            <div className={`
                absolute w-3 h-3 bg-bg-surface border-2 border-text-secondary rounded-full 
                transition-all duration-200 shadow-sm pointer-events-none
                ${isConnecting ? 'opacity-80 scale-100 bg-accent-primary border-accent-primary' : 'opacity-0 group-hover/node:opacity-100 group-hover/handle:scale-125 group-hover/handle:bg-accent-primary group-hover/handle:border-accent-primary'}
                ${dotClasses[side]}
            `}></div>
        </div>
    );
};

const CanvasNode: React.FC<CanvasNodeProps> = memo(({ node, isSelected, scale, onMove, onSelect, onDelete, onUpdate, onConnectStart, onConnectEnd, snapToGrid, isConnecting, onContextMenu }) => {
    const [viewMode, setViewMode] = useState<'code' | 'preview'>('preview');
    const [isEditing, setIsEditing] = useState(false);
    const [localContent, setLocalContent] = useState(node.content);
    const [showCopyFeedback, setShowCopyFeedback] = useState(false);
    
    // Rename State
    const [isRenaming, setIsRenaming] = useState(false);
    const [tempTitle, setTempTitle] = useState(node.title);

    // Derived files state to handle legacy nodes (single file) vs new nodes (multi-file)
    const derivedFiles: Record<string, CanvasFile> = useMemo(() => {
        if (node.files && Object.keys(node.files).length > 0) return node.files;
        // Fallback for legacy nodes: construct a file object from main content
        const name = node.title && node.title.includes('.') ? node.title : 'script.js';
        return {
            [name]: {
                name: name,
                content: node.content,
                language: node.language || 'javascript'
            }
        };
    }, [node.files, node.title, node.content, node.language]);

    // Initialize active tab
    const [activeTab, setActiveTab] = useState<string>(() => {
        if (node.activeFile && derivedFiles[node.activeFile]) return node.activeFile;
        return Object.keys(derivedFiles)[0];
    });

    // Refs for drag logic optimization (bypass React render cycle)
    const nodeRef = useRef<HTMLDivElement>(null);
    const dragData = useRef<{ startX: number, startY: number, initialNodeX: number, initialNodeY: number } | null>(null);
    const textareaRef = useRef<HTMLTextAreaElement>(null);
    
    // Preview debounce ref
    const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    const isCode = node.type === 'code';
    // Check if we can preview: must be HTML file or supported language
    const isPreviewable = isCode && (Object.keys(derivedFiles).some(f => f.endsWith('.html')) || ['html', 'svg', 'xml'].includes(node.language?.toLowerCase() || ''));

    // Sync local active tab if changed externally
    useEffect(() => {
        if (node.activeFile && node.activeFile !== activeTab && derivedFiles[node.activeFile]) {
            setActiveTab(node.activeFile);
        }
    }, [node.activeFile, derivedFiles]);

    // Ensure activeTab is valid if files change
    useEffect(() => {
        if (!derivedFiles[activeTab]) {
            setActiveTab(Object.keys(derivedFiles)[0]);
        }
    }, [derivedFiles]);

    // Update local content when not editing text node
    useEffect(() => {
        if (!isEditing && !isCode) {
            setLocalContent(node.content);
        }
    }, [node.content, isEditing, isCode]);

    // Syntax Highlighting Hook
    const [highlightedCode, setHighlightedCode] = useState('');
    useEffect(() => {
        if (isCode && window.Prism) {
            const currentContent = derivedFiles[activeTab]?.content || "";
            const lang = derivedFiles[activeTab]?.language || 'javascript';
            // Simple mapping for Prism languages
            const prismLang = window.Prism.languages[lang] ? lang : 'javascript';
            const html = window.Prism.highlight(currentContent, window.Prism.languages[prismLang], prismLang);
            setHighlightedCode(html);
        }
    }, [derivedFiles, activeTab, isCode, node.content]);

    // --- Helper to stop scroll propagation ---
    const stopScrollPropagation = (e: React.WheelEvent) => {
        e.stopPropagation();
        e.nativeEvent.stopImmediatePropagation();
    };

    // --- Actions ---
    const handleActionCopy = (e: React.MouseEvent) => {
        e.stopPropagation();
        let textToCopy = node.content;
        if (node.type === 'code') {
             textToCopy = derivedFiles[activeTab]?.content || node.content;
        }
        navigator.clipboard.writeText(textToCopy);
        setShowCopyFeedback(true);
        setTimeout(() => setShowCopyFeedback(false), 2000);
    };

    const handleActionDownload = (e: React.MouseEvent) => {
        e.stopPropagation();
        const a = document.createElement('a');
        
        let filename = node.title || 'download';
        let href = node.content;

        if (node.type === 'code') {
            filename = activeTab;
            const blob = new Blob([derivedFiles[activeTab]?.content || node.content], { type: 'text/plain' });
            href = URL.createObjectURL(blob);
        } else if (node.type === 'image') {
            if (!filename.toLowerCase().endsWith('.png')) filename += '.png';
        } else if (node.type === 'video') {
             if (!filename.toLowerCase().endsWith('.mp4')) filename += '.mp4';
        }

        a.href = href;
        a.download = filename;
        a.click();
        
        if (node.type === 'code') {
            URL.revokeObjectURL(href);
        }
    };

    // --- High Performance Drag Logic ---
    const handleDragStart = (e: React.MouseEvent | React.TouchEvent) => {
        // Prevent drag if clicking input or rename area when renaming
        if (isRenaming) return;
        
        e.stopPropagation();
        const isShift = 'shiftKey' in e && (e as React.MouseEvent).shiftKey;
        onSelect(node.id, isShift);
        
        const clientX = 'touches' in e ? e.touches[0].clientX : (e as React.MouseEvent).clientX;
        const clientY = 'touches' in e ? e.touches[0].clientY : (e as React.MouseEvent).clientY;

        dragData.current = {
            startX: clientX,
            startY: clientY,
            initialNodeX: node.x,
            initialNodeY: node.y
        };

        window.addEventListener('mousemove', handleDragMove);
        window.addEventListener('mouseup', handleDragEnd);
        window.addEventListener('touchmove', handleDragMove, { passive: false });
        window.addEventListener('touchend', handleDragEnd);

        if (nodeRef.current) {
            nodeRef.current.style.cursor = 'grabbing';
            nodeRef.current.style.zIndex = '100'; 
            nodeRef.current.style.willChange = 'transform';
        }
    };

    const handleDragMove = (e: MouseEvent | TouchEvent) => {
        if (!dragData.current || !nodeRef.current) return;
        e.preventDefault(); 

        const clientX = 'touches' in e ? (e as TouchEvent).touches[0].clientX : (e as MouseEvent).clientX;
        const clientY = 'touches' in e ? (e as TouchEvent).touches[0].clientY : (e as MouseEvent).clientY;

        const deltaX = (clientX - dragData.current.startX) / scale;
        const deltaY = (clientY - dragData.current.startY) / scale;

        let newX = dragData.current.initialNodeX + deltaX;
        let newY = dragData.current.initialNodeY + deltaY;

        if (snapToGrid) {
            const gridSize = 32;
            newX = Math.round(newX / gridSize) * gridSize;
            newY = Math.round(newY / gridSize) * gridSize;
        }

        const visualDx = newX - node.x; 
        const visualDy = newY - node.y;

        nodeRef.current.style.transform = `translate3d(${visualDx}px, ${visualDy}px, 0)`;
    };

    const handleDragEnd = (e: MouseEvent | TouchEvent) => {
        if (!dragData.current || !nodeRef.current) return;

        const clientX = 'changedTouches' in e ? (e as TouchEvent).changedTouches[0].clientX : (e as MouseEvent).clientX;
        const clientY = 'changedTouches' in e ? (e as TouchEvent).changedTouches[0].clientY : (e as MouseEvent).clientY;

        const deltaX = (clientX - dragData.current.startX) / scale;
        const deltaY = (clientY - dragData.current.startY) / scale;

        let newX = dragData.current.initialNodeX + deltaX;
        let newY = dragData.current.initialNodeY + deltaY;

        if (snapToGrid) {
            const gridSize = 32;
            newX = Math.round(newX / gridSize) * gridSize;
            newY = Math.round(newY / gridSize) * gridSize;
        }

        onMove(node.id, newX, newY);

        nodeRef.current.style.cursor = 'default';
        nodeRef.current.style.zIndex = '';
        nodeRef.current.style.transform = ''; 
        nodeRef.current.style.willChange = 'auto'; 
        
        dragData.current = null;
        window.removeEventListener('mousemove', handleDragMove);
        window.removeEventListener('mouseup', handleDragEnd);
        window.removeEventListener('touchmove', handleDragMove);
        window.removeEventListener('touchend', handleDragEnd);
    };

    const handleResizeTouchStart = (e: React.TouchEvent) => {
        e.stopPropagation();
        const touch = e.touches[0];
        const startX = touch.clientX;
        const startY = touch.clientY;
        const startW = node.width;
        const startH = node.height;

        const handleTouchMove = (ev: TouchEvent) => {
             const t = ev.touches[0];
             const dx = (t.clientX - startX) / scale;
             const dy = (t.clientY - startY) / scale;
             
             let newW = Math.max(200, startW + dx);
             let newH = 0;

             if (node.type === 'image' || node.type === 'video') {
                 const ratio = startW / startH;
                 newH = newW / ratio;
             } else {
                 newH = Math.max(100, startH + dy);
             }
             onUpdate(node.id, { width: newW, height: newH });
        };

        const handleTouchEnd = () => {
             window.removeEventListener('touchmove', handleTouchMove);
             window.removeEventListener('touchend', handleTouchEnd);
        };

        window.addEventListener('touchmove', handleTouchMove, { passive: false });
        window.addEventListener('touchend', handleTouchEnd);
    };

    // --- File Operations ---
    const handleAddFile = (e: React.MouseEvent) => {
        e.stopPropagation();
        const name = prompt("Enter file name (e.g. style.css):");
        if (!name) return;
        
        if (derivedFiles[name]) {
            alert("File already exists");
            return;
        }

        const newFiles = {
            ...derivedFiles,
            [name]: { name, content: '', language: name.split('.').pop() || 'txt' }
        };

        onUpdate(node.id, { files: newFiles, activeFile: name });
        setActiveTab(name);
    };

    const handleRenameFile = (oldName: string) => {
        const newName = prompt("Rename file:", oldName);
        if (!newName || newName === oldName) return;
        
        if (derivedFiles[newName]) {
            alert("File name already exists");
            return;
        }

        const file = derivedFiles[oldName];
        const newFiles = { ...derivedFiles };
        delete newFiles[oldName];
        newFiles[newName] = { ...file, name: newName, language: newName.split('.').pop() || 'txt' };

        onUpdate(node.id, { files: newFiles, activeFile: newName });
        setActiveTab(newName);
    };

    const handleDeleteFile = (fileName: string, e: React.MouseEvent) => {
        e.stopPropagation();
        if (Object.keys(derivedFiles).length <= 1) {
            alert("Cannot delete the last file.");
            return;
        }
        if (!confirm(`Delete ${fileName}?`)) return;

        const newFiles = { ...derivedFiles };
        delete newFiles[fileName];
        
        const newActive = activeTab === fileName ? Object.keys(newFiles)[0] : activeTab;
        
        onUpdate(node.id, { files: newFiles, activeFile: newActive });
        setActiveTab(newActive);
    };

    // --- Editor Logic ---
    const handleSave = () => {
        if (isCode) return; 
        setIsEditing(false);
        onUpdate(node.id, { content: localContent });
    };

    const handleContextMenu = (e: React.MouseEvent) => {
        onContextMenu(node.id, e);
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
            handleSave();
        } else if (e.key === 'Escape') {
            setIsEditing(false);
            setLocalContent(node.content); 
        }
    };

    // Code editing handler
    const handleCodeChange = (newCode: string) => {
        // Update specific file content
        const newFiles = {
            ...derivedFiles,
            [activeTab]: { ...derivedFiles[activeTab], content: newCode }
        };
        // Update both files structure (for future) and main content (legacy support)
        onUpdate(node.id, { files: newFiles, content: newCode });
    };

    // Text Editor Helper Functions
    const insertText = (prefix: string, suffix: string = '') => {
        if (!textareaRef.current) return;
        
        const start = textareaRef.current.selectionStart;
        const end = textareaRef.current.selectionEnd;
        const text = localContent;
        const before = text.substring(0, start);
        const selection = text.substring(start, end);
        const after = text.substring(end);

        const newText = before + prefix + selection + suffix + after;
        setLocalContent(newText);
        
        setTimeout(() => {
            if (textareaRef.current) {
                textareaRef.current.focus();
                textareaRef.current.setSelectionRange(start + prefix.length, end + prefix.length);
            }
        }, 0);
    };

    // Block inserter helper for elements that need newlines
    const insertBlock = (template: string) => {
         if (!textareaRef.current) return;
         const start = textareaRef.current.selectionStart;
         const text = localContent;
         const before = text.substring(0, start);
         const after = text.substring(start);
         
         // Ensure newlines around block
         const needsNewlineBefore = before.length > 0 && !before.endsWith('\n');
         const needsNewlineAfter = after.length > 0 && !after.startsWith('\n');
         
         const newText = before + (needsNewlineBefore ? '\n\n' : '') + template + (needsNewlineAfter ? '\n\n' : '') + after;
         setLocalContent(newText);
         
         setTimeout(() => {
            if (textareaRef.current) {
                textareaRef.current.focus();
                // Position cursor inside valid insertion point if template implies it, otherwise at end
                const offset = (needsNewlineBefore ? 2 : 0) + template.length;
                textareaRef.current.setSelectionRange(start + offset, start + offset);
            }
        }, 0);
    };

    const cleanCode = useCallback((content: string) => {
        let c = content.trim();
        if (c.startsWith('```')) {
            const lines = c.split('\n');
            if (lines.length > 1) {
                lines.shift();
                if (lines[lines.length-1].trim() === '```') lines.pop();
                return lines.join('\n');
            }
        }
        return content;
    }, []);

    const bundlePreview = useCallback(() => {
        const indexFileKey = Object.keys(derivedFiles).find(k => k === 'index.html') || Object.keys(derivedFiles).find(k => k.endsWith('.html')) || Object.keys(derivedFiles)[0];
        let htmlContent = cleanCode(derivedFiles[indexFileKey]?.content || "");

        htmlContent = htmlContent.replace(/<link[^>]+href=["']([^"']+\.css)["'][^>]*>/g, (match, href) => {
            const cssFile = derivedFiles[href];
            if (cssFile) {
                return `<style>\n${cleanCode(cssFile.content)}\n</style>`;
            }
            return match;
        });

        htmlContent = htmlContent.replace(/<script[^>]+src=["']([^"']+\.js)["'][^>]*><\/script>/g, (match, src) => {
            const jsFile = derivedFiles[src];
            if (jsFile) {
                return `<script>\n${cleanCode(jsFile.content)}\n</script>`;
            }
            return match;
        });

        return htmlContent;
    }, [derivedFiles, cleanCode]);

    // Use effect to manage blob URL and prevent flashing with Debounce
    const [previewUrl, setPreviewUrl] = useState<string>('');

    useEffect(() => {
        if (viewMode !== 'preview' || !isPreviewable) return;
        
        if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);

        debounceTimerRef.current = setTimeout(() => {
            const html = bundlePreview();
            const blob = new Blob([html], { type: 'text/html' });
            const url = URL.createObjectURL(blob);
            setPreviewUrl(prev => {
                if (prev) URL.revokeObjectURL(prev);
                return url;
            });
        }, 1000); // 1 second delay to stabilize preview during typing/generation

        return () => {
             if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
        };
    }, [bundlePreview, viewMode, isPreviewable]);

    // --- Rename Handlers ---
    const handleRenameSubmit = () => {
        setIsRenaming(false);
        if (tempTitle.trim() && tempTitle !== node.title) {
            onUpdate(node.id, { title: tempTitle });
        } else {
            setTempTitle(node.title);
        }
    };

    const handleRenameKey = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') handleRenameSubmit();
        if (e.key === 'Escape') {
            setIsRenaming(false);
            setTempTitle(node.title);
        }
    };

    // Render Content based on Type
    const renderContent = () => {
        if (node.type === 'code') {
            if (viewMode === 'preview' && isPreviewable) {
                return (
                    <div 
                        className="w-full h-full bg-white relative group/preview"
                        onDoubleClick={() => setViewMode('code')}
                    >
                        {previewUrl && (
                            <iframe 
                                src={previewUrl} 
                                className="w-full h-full border-none pointer-events-auto" 
                                title="Preview"
                                sandbox="allow-scripts allow-modals allow-same-origin" 
                            />
                        )}
                        {!previewUrl && (
                            <div className="flex items-center justify-center h-full text-gray-400">
                                <i className="fa-solid fa-circle-notch animate-spin text-xl"></i>
                            </div>
                        )}
                    </div>
                );
            }

            const currentFileContent = derivedFiles[activeTab]?.content || "";
            const currentLang = derivedFiles[activeTab]?.language || 'javascript';
            
            return (
                <div className="flex-1 flex flex-col bg-[#2d2d2d] overflow-hidden">
                    <div className="flex bg-[#252526] border-b border-[#333] overflow-x-auto no-scrollbar items-center" onWheel={stopScrollPropagation}>
                        {Object.values(derivedFiles).map((file: CanvasFile) => (
                            <div 
                                key={file.name}
                                className={`
                                    group/tab flex items-center border-r border-[#333]
                                    ${activeTab === file.name 
                                        ? 'bg-[#1E1E1E] text-[#D4D4D4] border-t-2 border-t-accent-primary' 
                                        : 'text-[#969696] hover:bg-[#2A2D2E] hover:text-[#CCCCCC] border-t-2 border-t-transparent'
                                    }
                                `}
                            >
                                <button
                                    onClick={(e) => { e.stopPropagation(); setActiveTab(file.name); }}
                                    onDoubleClick={(e) => { e.stopPropagation(); handleRenameFile(file.name); }}
                                    className="px-3 py-2 text-xs font-medium flex items-center gap-2 whitespace-nowrap"
                                >
                                    <i className={`fa-brands ${file.name.endsWith('.html') ? 'fa-html5 text-orange-500' : file.name.endsWith('.css') ? 'fa-css3 text-blue-500' : file.name.endsWith('.js') ? 'fa-js text-yellow-500' : 'fa-codepen'} text-[10px]`}></i>
                                    {file.name}
                                </button>
                                
                                {/* Delete Button (only visible on hover or active) */}
                                <button
                                    onClick={(e) => handleDeleteFile(file.name, e)}
                                    className={`w-6 h-full flex items-center justify-center hover:text-red-400 ${activeTab === file.name ? 'opacity-100' : 'opacity-0 group-hover/tab:opacity-100'} transition-opacity`}
                                >
                                    <i className="fa-solid fa-xmark text-[10px]"></i>
                                </button>
                            </div>
                        ))}
                        
                        {/* Add File Button */}
                        <button 
                            onClick={handleAddFile}
                            className="px-3 py-2 text-[#969696] hover:text-white hover:bg-[#2A2D2E] transition-colors"
                            title="Add File"
                        >
                            <i className="fa-solid fa-plus text-xs"></i>
                        </button>
                    </div>
                    
                    <div 
                        className="h-full overflow-hidden relative" 
                        onMouseDown={(e) => e.stopPropagation()} 
                        onWheel={stopScrollPropagation}
                    >
                         {/* Syntax Highlighting Layer (Bottom) */}
                         <pre 
                            className={`absolute inset-0 p-5 font-mono text-[13px] leading-6 pointer-events-none whitespace-pre-wrap break-all text-[#ccc]`}
                            aria-hidden="true"
                         >
                             <code 
                                className={`language-${currentLang}`} 
                                dangerouslySetInnerHTML={{ __html: highlightedCode || cleanCode(currentFileContent).replace(/</g, '&lt;') }} 
                             />
                         </pre>

                         {/* Editor Layer (Top, Transparent) */}
                         <textarea
                            className="absolute inset-0 w-full h-full p-5 font-mono text-[13px] leading-6 text-transparent bg-transparent caret-white resize-none outline-none border-none custom-scrollbar"
                            value={cleanCode(currentFileContent)}
                            onChange={(e) => handleCodeChange(e.target.value)}
                            spellCheck={false}
                            style={{ color: 'transparent' }} // Ensure text is transparent so pre shows through
                         />
                    </div>
                </div>
            );
        }

        // --- NEW: Loading State for Media Generation ---
        if (node.content.startsWith('loading://')) {
            const isImg = node.content.includes('image');
            return (
                <div className="w-full h-full bg-bg-surface flex items-center justify-center overflow-hidden relative group">
                    <div className="absolute inset-0 bg-gradient-to-br from-bg-surface to-bg-main"></div>
                    {/* Shimmer overlay */}
                    <div className="absolute inset-0 animate-shimmer bg-gradient-to-r from-transparent via-text-primary/5 to-transparent skew-x-12 pointer-events-none"></div>
                    
                    <div className="flex flex-col items-center gap-4 relative z-10 p-6 text-center">
                         <div className="w-16 h-16 rounded-full border-2 border-accent-primary/20 bg-accent-primary/5 flex items-center justify-center animate-pulse">
                             <i className={`fa-solid ${isImg ? 'fa-image' : 'fa-film'} text-accent-primary text-2xl`}></i>
                         </div>
                         <div className="flex flex-col items-center gap-1">
                            <span className="text-sm font-semibold text-text-primary tracking-wide">Generating...</span>
                            <span className="text-[10px] text-text-secondary uppercase tracking-wider font-medium">Creating your {isImg ? 'Visual' : 'Motion'}</span>
                         </div>
                    </div>
                </div>
            );
        }

        switch (node.type) {
            case 'image':
                const isPlaceholderImg = node.content.includes('placehold.co') || !node.content;
                if (isPlaceholderImg) {
                    return (
                        <div className="w-full h-full bg-bg-surface/50 flex flex-col items-center justify-center text-text-secondary gap-3 p-6 border border-dashed border-border-subtle/50 m-1 rounded-lg">
                            <div className="w-12 h-12 rounded-full bg-black/5 dark:bg-white/5 flex items-center justify-center">
                                <i className="fa-regular fa-image text-xl opacity-50"></i>
                            </div>
                            <span className="text-xs font-medium opacity-60">Waiting for image...</span>
                        </div>
                    );
                }
                return (
                    <div className="w-full h-full bg-bg-surface flex items-center justify-center overflow-hidden">
                        <img src={node.content} alt={node.title} className="w-full h-full object-cover pointer-events-none" />
                    </div>
                );
            case 'video':
                const isPlaceholderVid = !node.content;
                if (isPlaceholderVid) {
                    return (
                        <div className="w-full h-full bg-bg-surface/50 flex flex-col items-center justify-center text-text-secondary gap-3 p-6 border border-dashed border-border-subtle/50 m-1 rounded-lg">
                             <div className="w-12 h-12 rounded-full bg-black/5 dark:bg-white/5 flex items-center justify-center">
                                <i className="fa-solid fa-film text-xl opacity-50"></i>
                            </div>
                            <span className="text-xs font-medium opacity-60">Waiting for video...</span>
                        </div>
                    );
                }
                return (
                    <div className="w-full h-full bg-black overflow-hidden flex items-center justify-center">
                         <video src={node.content} controls className="w-full h-full object-contain" />
                    </div>
                );
            case 'text':
            default:
                if (isEditing) {
                    return (
                         <div className="flex flex-col h-full bg-bg-surface" onMouseDown={(e) => e.stopPropagation()}>
                            <div 
                                className="flex items-center gap-0.5 p-1.5 border-b border-border-subtle bg-bg-main/30 backdrop-blur-sm shrink-0 overflow-x-auto no-scrollbar"
                                onMouseDown={(e) => e.preventDefault()} 
                            >
                                <button onClick={() => insertText('**', '**')} className="w-7 h-7 rounded hover:bg-black/5 dark:hover:bg-white/10 flex items-center justify-center text-text-secondary hover:text-text-primary transition-colors" title="Bold">
                                    <i className="fa-solid fa-bold text-xs"></i>
                                </button>
                                <button onClick={() => insertText('*', '*')} className="w-7 h-7 rounded hover:bg-black/5 dark:hover:bg-white/10 flex items-center justify-center text-text-secondary hover:text-text-primary transition-colors" title="Italic">
                                    <i className="fa-solid fa-italic text-xs"></i>
                                </button>
                                <div className="w-[1px] h-4 bg-border-subtle mx-1"></div>
                                <button onClick={() => insertText('# ', '')} className="w-7 h-7 rounded hover:bg-black/5 dark:hover:bg-white/10 flex items-center justify-center text-text-secondary hover:text-text-primary transition-colors font-bold text-xs font-serif" title="Heading 1">
                                    H1
                                </button>
                                <button onClick={() => insertText('## ', '')} className="w-7 h-7 rounded hover:bg-black/5 dark:hover:bg-white/10 flex items-center justify-center text-text-secondary hover:text-text-primary transition-colors font-bold text-xs font-serif" title="Heading 2">
                                    H2
                                </button>
                                <button onClick={() => insertText('### ', '')} className="w-7 h-7 rounded hover:bg-black/5 dark:hover:bg-white/10 flex items-center justify-center text-text-secondary hover:text-text-primary transition-colors font-bold text-xs font-serif" title="Heading 3">
                                    H3
                                </button>
                                <div className="w-[1px] h-4 bg-border-subtle mx-1"></div>
                                <button onClick={() => insertText('- ', '')} className="w-7 h-7 rounded hover:bg-black/5 dark:hover:bg-white/10 flex items-center justify-center text-text-secondary hover:text-text-primary transition-colors" title="List">
                                    <i className="fa-solid fa-list-ul text-xs"></i>
                                </button>
                                <button onClick={() => insertText('- [ ] ', '')} className="w-7 h-7 rounded hover:bg-black/5 dark:hover:bg-white/10 flex items-center justify-center text-text-secondary hover:text-text-primary transition-colors" title="Checklist">
                                    <i className="fa-regular fa-square-check text-xs"></i>
                                </button>
                                <button onClick={() => insertBlock('> ')} className="w-7 h-7 rounded hover:bg-black/5 dark:hover:bg-white/10 flex items-center justify-center text-text-secondary hover:text-text-primary transition-colors" title="Quote">
                                    <i className="fa-solid fa-quote-left text-xs"></i>
                                </button>
                                <div className="w-[1px] h-4 bg-border-subtle mx-1"></div>
                                <button onClick={() => insertText('`', '`')} className="w-7 h-7 rounded hover:bg-black/5 dark:hover:bg-white/10 flex items-center justify-center text-text-secondary hover:text-text-primary transition-colors" title="Inline Code">
                                    <i className="fa-solid fa-code text-xs"></i>
                                </button>
                                <button onClick={() => insertBlock('```\n\n```')} className="w-7 h-7 rounded hover:bg-black/5 dark:hover:bg-white/10 flex items-center justify-center text-text-secondary hover:text-text-primary transition-colors" title="Code Block">
                                    <i className="fa-regular fa-file-code text-xs"></i>
                                </button>
                                <button onClick={() => insertBlock('| Col 1 | Col 2 |\n|---|---|\n| Val 1 | Val 2 |')} className="w-7 h-7 rounded hover:bg-black/5 dark:hover:bg-white/10 flex items-center justify-center text-text-secondary hover:text-text-primary transition-colors" title="Table">
                                    <i className="fa-solid fa-table text-xs"></i>
                                </button>
                                <button onClick={() => insertText('[Link](', ')')} className="w-7 h-7 rounded hover:bg-black/5 dark:hover:bg-white/10 flex items-center justify-center text-text-secondary hover:text-text-primary transition-colors" title="Link">
                                    <i className="fa-solid fa-link text-xs"></i>
                                </button>
                                <button onClick={() => insertText('![Alt](', ')')} className="w-7 h-7 rounded hover:bg-black/5 dark:hover:bg-white/10 flex items-center justify-center text-text-secondary hover:text-text-primary transition-colors" title="Image">
                                    <i className="fa-regular fa-image text-xs"></i>
                                </button>
                            </div>
                            <textarea
                                ref={textareaRef}
                                autoFocus
                                className="w-full flex-1 p-6 font-sans text-base leading-7 text-text-primary bg-bg-surface resize-none outline-none border-none custom-scrollbar"
                                value={localContent}
                                onChange={(e) => setLocalContent(e.target.value)}
                                onBlur={handleSave}
                                onKeyDown={handleKeyDown}
                                onWheel={stopScrollPropagation}
                                placeholder="Type something..."
                            />
                        </div>
                    );
                }
                return (
                    <div 
                        className="p-6 h-full overflow-auto bg-bg-surface cursor-text"
                        onDoubleClick={() => setIsEditing(true)}
                        onMouseDown={(e) => e.stopPropagation()} 
                        onWheel={stopScrollPropagation}
                    >
                        <MarkdownRenderer 
                            content={node.content} 
                            onNodeLinkClick={(id) => onSelect(id, false)} 
                        />
                    </div>
                );
        }
    };

    return (
        <div
            ref={nodeRef}
            className={`
                absolute flex flex-col pointer-events-auto
                rounded-[12px] overflow-hidden group/node
                transition-shadow duration-300 ease-out
                ${isSelected 
                    ? 'shadow-node-active ring-1 ring-accent-primary/50 z-30' 
                    : 'shadow-node ring-1 ring-border-subtle z-10 hover:shadow-node-hover'
                }
            `}
            style={{
                left: node.x,
                top: node.y,
                width: node.width,
                height: node.height,
            }}
            onMouseDown={(e) => {
                // Pass event to handleDragStart which handles selection
                // We don't call onSelect here directly to avoid double triggering
            }}
            onContextMenu={handleContextMenu}
        >
            <Handle side="top" onMouseDown={(e) => { e.stopPropagation(); onConnectStart(node.id, 'top'); }} onMouseUp={(e) => { e.stopPropagation(); onConnectEnd(node.id, 'top'); }} isConnecting={isConnecting} />
            <Handle side="right" onMouseDown={(e) => { e.stopPropagation(); onConnectStart(node.id, 'right'); }} onMouseUp={(e) => { e.stopPropagation(); onConnectEnd(node.id, 'right'); }} isConnecting={isConnecting} />
            <Handle side="bottom" onMouseDown={(e) => { e.stopPropagation(); onConnectStart(node.id, 'bottom'); }} onMouseUp={(e) => { e.stopPropagation(); onConnectEnd(node.id, 'bottom'); }} isConnecting={isConnecting} />
            <Handle side="left" onMouseDown={(e) => { e.stopPropagation(); onConnectStart(node.id, 'left'); }} onMouseUp={(e) => { e.stopPropagation(); onConnectEnd(node.id, 'left'); }} isConnecting={isConnecting} />

            <div 
                className={`
                    h-10 shrink-0 flex items-center justify-between px-3 gap-3
                    border-b cursor-grab active:cursor-grabbing select-none
                    ${node.type === 'code'
                        ? 'bg-[#1E1E1E] border-[#333] text-gray-400' 
                        : 'bg-bg-panel backdrop-blur-xl border-border-subtle text-text-primary'}
                `}
                onMouseDown={handleDragStart}
                onTouchStart={handleDragStart}
            >
                <div className="flex items-center gap-3 min-w-0 flex-1">
                    <div className="flex items-center gap-1.5 group shrink-0" onMouseDown={e => e.stopPropagation()}>
                        <button 
                            onClick={(e) => { e.stopPropagation(); onDelete(node.id); }}
                            className="w-2.5 h-2.5 rounded-full bg-red-400/80 hover:bg-red-500 transition-colors flex items-center justify-center overflow-hidden relative"
                        >
                            <i className="fa-solid fa-xmark text-[6px] text-black/50 opacity-0 group-hover:opacity-100 absolute"></i>
                        </button>
                        <div className="w-2.5 h-2.5 rounded-full bg-yellow-400/80"></div>
                        <div className="w-2.5 h-2.5 rounded-full bg-green-400/80"></div>
                    </div>

                    {isRenaming ? (
                        <input
                            type="text"
                            value={tempTitle}
                            onChange={(e) => setTempTitle(e.target.value)}
                            onBlur={handleRenameSubmit}
                            onKeyDown={handleRenameKey}
                            autoFocus
                            onMouseDown={(e) => e.stopPropagation()}
                            className="text-[12px] font-medium bg-transparent border-b border-accent-primary outline-none w-full min-w-0"
                            style={{ color: node.type === 'code' ? '#E0E0E0' : 'inherit' }}
                        />
                    ) : (
                        <span 
                            onDoubleClick={(e) => { e.stopPropagation(); setIsRenaming(true); }}
                            className="text-[12px] font-medium opacity-90 truncate cursor-text"
                            title="Double-click to rename"
                        >
                            {node.title}
                        </span>
                    )}
                </div>
                
                <div className="flex items-center gap-2" onMouseDown={e => e.stopPropagation()}>
                    
                    {/* Copy Action (Code/Text) */}
                    {(node.type === 'code' || node.type === 'text') && (
                         <button 
                            onClick={handleActionCopy}
                            className="w-6 h-6 flex items-center justify-center rounded-md hover:bg-black/10 dark:hover:bg-white/10 text-text-secondary hover:text-text-primary transition-colors"
                            title="Copy to Clipboard"
                         >
                            {showCopyFeedback ? <i className="fa-solid fa-check text-emerald-500 text-[10px]"></i> : <i className="fa-regular fa-copy text-[10px]"></i>}
                         </button>
                    )}

                    {/* Download Action (Image/Video/Code) */}
                    {(node.type === 'image' || node.type === 'video' || node.type === 'code') && (
                        <button 
                            onClick={handleActionDownload}
                            className="w-6 h-6 flex items-center justify-center rounded-md hover:bg-black/10 dark:hover:bg-white/10 text-text-secondary hover:text-text-primary transition-colors"
                            title="Download"
                        >
                           <i className="fa-solid fa-download text-[10px]"></i>
                        </button>
                    )}

                    {/* Preview Toggle for Code */}
                    {isPreviewable && (
                        <div className="flex bg-black/20 p-0.5 rounded-lg shrink-0 border border-white/5 ml-1">
                            <button 
                                onClick={(e) => { setViewMode('code'); }}
                                className={`px-2 py-0.5 text-[10px] font-semibold rounded-[5px] transition-all ${viewMode === 'code' ? 'bg-[#333] text-white shadow-sm' : 'text-gray-500 hover:text-gray-300'}`}
                            >
                                Code
                            </button>
                            <button 
                                onClick={(e) => { setViewMode('preview'); }}
                                className={`px-2 py-0.5 text-[10px] font-semibold rounded-[5px] transition-all ${viewMode === 'preview' ? 'bg-[#333] text-white shadow-sm' : 'text-gray-500 hover:text-gray-300'}`}
                            >
                                Preview
                            </button>
                        </div>
                    )}
                </div>
            </div>

            <div className="flex-1 relative flex flex-col overflow-hidden bg-bg-surface">
                {renderContent()}
            </div>
            
            <div 
                className="absolute bottom-0 right-0 w-8 h-8 cursor-nwse-resize opacity-0 hover:opacity-100 group-hover/node:opacity-100 z-50 flex items-end justify-end p-1.5"
                onMouseDown={(e) => {
                    e.stopPropagation();
                    const startX = e.clientX;
                    // const startY = e.clientY;
                    const startW = node.width;
                    const startH = node.height;
                    
                    const handleResize = (ev: MouseEvent) => {
                         const dx = (ev.clientX - startX) / scale;
                         let newW = Math.max(200, startW + dx);
                         
                         // Aspect Ratio Locking for Media Nodes
                         if (node.type === 'image' || node.type === 'video') {
                             const ratio = startW / startH;
                             onUpdate(node.id, { width: newW, height: newW / ratio });
                         } else {
                             const dy = (ev.clientY - e.clientY) / scale; // Note: using e.clientY from start closure
                             onUpdate(node.id, { width: newW, height: Math.max(100, startH + dy) });
                         }
                    };
                    const handleUp = () => {
                         window.removeEventListener('mousemove', handleResize);
                         window.removeEventListener('mouseup', handleUp);
                    };
                    window.addEventListener('mousemove', handleResize);
                    window.addEventListener('mouseup', handleUp);
                }}
                onTouchStart={handleResizeTouchStart}
            >
                 <div className="w-3 h-3 rounded-full bg-accent-primary/20 hover:bg-accent-primary/80 border border-accent-primary/50 transition-colors"></div>
            </div>
        </div>
    );
});

export default CanvasNode;
