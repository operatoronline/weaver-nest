
import React, { useState, useRef, useEffect } from 'react';
import { AgentId, CanvasNode, ImageConfig, VideoConfig } from '../types';
import { AGENTS } from '../constants';
import { LiveSession as LiveSessionService } from '../services/liveService';
import AgentSelector from './AgentSelector';

interface OmniBarProps {
    activeAgent: AgentId;
    onSend: (text: string, mediaConfig?: ImageConfig | VideoConfig) => void;
    isThinking: boolean;
    onSelectAgent: (id: AgentId) => void;
    onToggleLive: () => void;
    isLiveMode: boolean;
    referencedNodes?: CanvasNode[];
    nodeContext?: string;
    onFileUpload?: (file: File) => void;
}

const OmniBar: React.FC<OmniBarProps> = ({ activeAgent, onSend, isThinking, onSelectAgent, onToggleLive, isLiveMode, referencedNodes, nodeContext, onFileUpload }) => {
    const [input, setInput] = useState('');
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    
    // Media Config State
    const [imageParams, setImageParams] = useState<ImageConfig>({ size: '1K', aspectRatio: '1:1' });
    const [videoParams, setVideoParams] = useState<VideoConfig>({ resolution: '720p', aspectRatio: '16:9' });

    // Refs
    const buttonRef = useRef<HTMLButtonElement>(null);
    const inputRef = useRef<HTMLTextAreaElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Live Mode State
    const [liveStatus, setLiveStatus] = useState('Connecting...');
    const liveSessionRef = useRef<LiveSessionService | null>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    
    // Stable refs for callbacks to prevent effect re-triggering
    const onSendRef = useRef(onSend);
    const nodeContextRef = useRef(nodeContext);

    useEffect(() => { onSendRef.current = onSend; }, [onSend]);
    useEffect(() => { nodeContextRef.current = nodeContext; }, [nodeContext]);

    // Auto-resize textarea (Desktop Only)
    useEffect(() => {
        if (!inputRef.current) return;
        
        // On mobile, we prevent resizing to avoid layout jumping when keyboard is active
        if (window.innerWidth < 768) {
            inputRef.current.style.height = ''; // Reset to CSS default
        } else {
            inputRef.current.style.height = 'auto';
            inputRef.current.style.height = Math.min(inputRef.current.scrollHeight, 150) + 'px';
        }
    }, [input]);

    // Live Session Management
    useEffect(() => {
        if (isLiveMode) {
             // Only connect if not already connected (or if completely cleaned up)
             if (liveSessionRef.current) return;

             const session = new LiveSessionService();
             liveSessionRef.current = session;
             
             session.onStatusChange = (status) => setLiveStatus(status);
             
             // Handle delegated requests from Live Agent
             session.onAgentRequest = (request) => {
                 // Trigger the main AI processing pipeline while keeping Live active
                 onSendRef.current(request, undefined);
             };

             session.onAudioLevel = (level) => {
                 const canvas = canvasRef.current;
                 if (canvas) {
                     const ctx = canvas.getContext('2d');
                     if (ctx) {
                         const width = canvas.width;
                         const height = canvas.height;
                         ctx.clearRect(0,0, width, height);
                         
                         const centerX = width / 2;
                         const centerY = height / 2;
                         const maxRadius = Math.min(width, height) / 2;
                         
                         // Base circle
                         ctx.beginPath();
                         ctx.arc(centerX, centerY, 4, 0, Math.PI * 2);
                         ctx.fillStyle = '#ef4444'; 
                         ctx.fill();

                         // Ripple based on level
                         if (level > 0.01) {
                             const radius = 4 + (level * (maxRadius - 4));
                             ctx.beginPath();
                             ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
                             ctx.strokeStyle = `rgba(239, 68, 68, ${Math.min(level + 0.2, 0.8)})`;
                             ctx.lineWidth = 2;
                             ctx.stroke();
                         }
                     }
                 }
             };

             // Use the initial context when connecting
             session.connect(nodeContextRef.current).catch(err => {
                 console.error("Live Connect Failed", err);
                 setLiveStatus("Error");
             });
        } else {
            // Cleanup when turning OFF live mode
            if (liveSessionRef.current) {
                liveSessionRef.current.disconnect();
                liveSessionRef.current = null;
            }
        }
        
        // Cleanup on unmount only
        return () => {
            if (!isLiveMode && liveSessionRef.current) {
                liveSessionRef.current.disconnect();
                liveSessionRef.current = null;
            }
        };
    }, [isLiveMode]); // Only depend on isLiveMode toggling

    // Cleanup when component unmounts entirely
    useEffect(() => {
        return () => {
             if (liveSessionRef.current) {
                 liveSessionRef.current.disconnect();
             }
        }
    }, []);

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSendClick();
        }
    };

    const handleSendClick = () => {
        if (input.trim() && !isThinking) {
            let config: ImageConfig | VideoConfig | undefined;
            if (activeAgent === AgentId.IMAGE) config = imageParams;
            else if (activeAgent === AgentId.VIDEO) config = videoParams;
            
            onSend(input, config);
            setInput('');
        }
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files.length > 0 && onFileUpload) {
             const file = e.target.files[0];
             onFileUpload(file);
        }
        if (fileInputRef.current) fileInputRef.current.value = '';
    }

    const activeAgentConfig = AGENTS[activeAgent];

    return (
        <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 w-full max-w-3xl px-4 z-[60]">
            <input type="file" ref={fileInputRef} className="hidden" onChange={handleFileChange} />
            <AgentSelector 
                isOpen={isMenuOpen} 
                onClose={() => setIsMenuOpen(false)} 
                onSelect={onSelectAgent} 
                currentAgent={activeAgent} 
            />

            {/* Floating Context Chips */}
            <div className="absolute bottom-full left-0 w-full mb-3 px-1 flex flex-wrap items-end justify-center gap-2 pointer-events-none z-10">
                {referencedNodes && referencedNodes.map((node, idx) => (
                    <div 
                        key={node.id} 
                        className="pointer-events-auto flex items-center gap-2 bg-bg-panel/90 backdrop-blur-xl border border-white/20 dark:border-white/10 shadow-lg rounded-2xl pl-2 pr-3 py-1.5 text-xs animate-scale-in origin-bottom"
                        style={{ animationDelay: `${idx * 50}ms` }}
                    >
                        <div className={`
                            w-5 h-5 rounded-full flex items-center justify-center shrink-0
                            ${node.type === 'code' ? 'bg-emerald-500/10 text-emerald-500' : 
                              node.type === 'image' ? 'bg-pink-500/10 text-pink-500' :
                              node.type === 'video' ? 'bg-orange-500/10 text-orange-500' :
                              'bg-accent-primary/10 text-accent-primary'}
                        `}>
                             <i className={`fa-solid ${
                                node.type === 'code' ? 'fa-code' : 
                                node.type === 'image' ? 'fa-image' : 
                                node.type === 'video' ? 'fa-film' : 
                                'fa-paragraph'
                            } text-[10px]`}></i>
                        </div>
                        <span className="font-semibold text-text-primary max-w-[150px] truncate">
                            {node.title}
                        </span>
                        {idx > 0 && (
                            <i className="fa-solid fa-link text-[10px] text-text-secondary opacity-50 ml-1"></i>
                        )}
                    </div>
                ))}
            </div>

            <div className={`
                relative w-full glass-panel rounded-[28px] shadow-2xl border border-white/20 dark:border-white/10
                bg-bg-panel/80 backdrop-blur-xl transition-all duration-300 z-20 overflow-hidden
                ${isThinking ? 'ring-2 ring-accent-primary/50' : ''}
            `}>
                {/* Image Config Toolbar */}
                {activeAgent === AgentId.IMAGE && !isLiveMode && (
                    <div className="flex items-center gap-3 px-4 pt-3 pb-2 border-b border-border-subtle/30 bg-bg-surface/30 backdrop-blur-sm animate-slide-up">
                        <div className="flex items-center gap-2 text-[10px] font-bold text-text-secondary uppercase tracking-wider mr-1">
                            <i className="fa-solid fa-sliders"></i>
                            <span>Image</span>
                        </div>
                        
                        {/* Aspect Ratio */}
                        <div className="flex items-center gap-1 bg-black/5 dark:bg-white/5 rounded-lg p-0.5">
                             {['1:1', '3:4', '4:3', '9:16', '16:9'].map(ratio => (
                                 <button 
                                    key={ratio}
                                    onClick={() => setImageParams(p => ({ ...p, aspectRatio: ratio as any }))}
                                    className={`px-2 py-1 text-[10px] font-medium rounded-md transition-all ${imageParams.aspectRatio === ratio ? 'bg-bg-surface text-text-primary shadow-sm' : 'text-text-secondary hover:text-text-primary'}`}
                                 >
                                    {ratio}
                                 </button>
                             ))}
                        </div>
                        
                        <div className="w-[1px] h-3 bg-border-subtle"></div>

                        {/* Size */}
                         <div className="flex items-center gap-1 bg-black/5 dark:bg-white/5 rounded-lg p-0.5">
                             {['1K', '2K', '4K'].map(size => (
                                 <button 
                                    key={size}
                                    onClick={() => setImageParams(p => ({ ...p, size: size as any }))}
                                    className={`px-2 py-1 text-[10px] font-medium rounded-md transition-all ${imageParams.size === size ? 'bg-bg-surface text-text-primary shadow-sm' : 'text-text-secondary hover:text-text-primary'}`}
                                 >
                                    {size}
                                 </button>
                             ))}
                        </div>
                    </div>
                )}

                {/* Video Config Toolbar */}
                {activeAgent === AgentId.VIDEO && !isLiveMode && (
                    <div className="flex items-center gap-3 px-4 pt-3 pb-2 border-b border-border-subtle/30 bg-bg-surface/30 backdrop-blur-sm animate-slide-up">
                        <div className="flex items-center gap-2 text-[10px] font-bold text-text-secondary uppercase tracking-wider mr-1">
                            <i className="fa-solid fa-film"></i>
                            <span>Video</span>
                        </div>
                        
                        {/* Aspect Ratio */}
                        <div className="flex items-center gap-1 bg-black/5 dark:bg-white/5 rounded-lg p-0.5">
                             {['16:9', '9:16'].map(ratio => (
                                 <button 
                                    key={ratio}
                                    onClick={() => setVideoParams(p => ({ ...p, aspectRatio: ratio as any }))}
                                    className={`px-2 py-1 text-[10px] font-medium rounded-md transition-all ${videoParams.aspectRatio === ratio ? 'bg-bg-surface text-text-primary shadow-sm' : 'text-text-secondary hover:text-text-primary'}`}
                                 >
                                    {ratio}
                                 </button>
                             ))}
                        </div>
                        
                        <div className="w-[1px] h-3 bg-border-subtle"></div>

                        {/* Resolution */}
                         <div className="flex items-center gap-1 bg-black/5 dark:bg-white/5 rounded-lg p-0.5">
                             {['720p', '1080p'].map(res => (
                                 <button 
                                    key={res}
                                    onClick={() => setVideoParams(p => ({ ...p, resolution: res as any }))}
                                    className={`px-2 py-1 text-[10px] font-medium rounded-md transition-all ${videoParams.resolution === res ? 'bg-bg-surface text-text-primary shadow-sm' : 'text-text-secondary hover:text-text-primary'}`}
                                 >
                                    {res}
                                 </button>
                             ))}
                        </div>
                    </div>
                )}

                <div className="flex items-end p-2 gap-2">
                    <button
                        ref={buttonRef}
                        onClick={() => setIsMenuOpen(!isMenuOpen)}
                        className={`
                            shrink-0 w-11 h-11 rounded-full flex items-center justify-center transition-all duration-300
                            bg-bg-surface hover:bg-bg-main border border-transparent hover:border-border-subtle
                            ${isMenuOpen ? 'scale-105 shadow-md' : ''}
                        `}
                    >
                         <i className={`fa-solid ${activeAgentConfig.icon} text-lg ${activeAgentConfig.color}`}></i>
                    </button>

                    <div className="flex-1 relative min-h-[44px] flex items-end bg-bg-surface/50 rounded-2xl border border-transparent focus-within:border-border-subtle/50 transition-colors">
                         {isLiveMode ? (
                             <div className="w-full h-[44px] flex items-center justify-center gap-3 animate-fade-in py-1">
                                 <canvas ref={canvasRef} width={40} height={40} className="w-10 h-10" />
                                 <span className="text-sm font-mono text-red-500 font-bold tracking-widest uppercase animate-pulse">
                                     {liveStatus}
                                 </span>
                             </div>
                         ) : (
                             <textarea
                                ref={inputRef}
                                value={input}
                                onChange={(e) => setInput(e.target.value)}
                                onKeyDown={handleKeyDown}
                                placeholder={`Ask ${activeAgentConfig.name}...`}
                                className="w-full bg-transparent border-none outline-none text-text-primary placeholder:text-text-muted resize-none py-2.5 px-4 text-base font-normal custom-scrollbar leading-relaxed"
                                rows={1}
                                style={{ maxHeight: '150px' }}
                                disabled={isThinking}
                             />
                         )}
                    </div>

                    <div className="flex items-center gap-2 shrink-0 pb-0.5">
                        <button
                            onClick={onToggleLive}
                            className={`
                                w-11 h-11 rounded-full flex items-center justify-center transition-all duration-300
                                ${isLiveMode 
                                    ? 'bg-red-500 text-white shadow-lg shadow-red-500/30' 
                                    : 'text-text-secondary hover:text-red-500 hover:bg-red-500/10'
                                }
                            `}
                            title={isLiveMode ? "End Live Session" : "Start Live Session"}
                        >
                            {isLiveMode ? <i className="fa-solid fa-phone-slash"></i> : <i className="fa-solid fa-microphone"></i>}
                        </button>

                        {!isLiveMode && (
                            <button
                                onClick={handleSendClick}
                                disabled={!input.trim() || isThinking}
                                className={`
                                    w-11 h-11 rounded-full flex items-center justify-center transition-all duration-300
                                    ${input.trim() && !isThinking
                                        ? 'bg-text-primary text-bg-main hover:scale-105 shadow-md'
                                        : 'bg-black/5 dark:bg-white/5 text-text-muted cursor-not-allowed'
                                    }
                                `}
                            >
                                {isThinking ? (
                                    <i className="fa-solid fa-circle-notch animate-spin text-sm"></i>
                                ) : (
                                    <i className="fa-solid fa-arrow-up text-lg"></i>
                                )}
                            </button>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default OmniBar;
