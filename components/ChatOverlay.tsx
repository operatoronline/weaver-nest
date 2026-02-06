
import React, { useRef, useEffect } from 'react';
import { Message, CanvasNode, MessageType } from '../types';
import ChatMessage from './ChatMessage';

interface ChatOverlayProps {
    messages: Message[];
    isOpen: boolean;
    onToggle: () => void;
    onNodeSelect: (nodeId: string) => void;
    nodes: CanvasNode[];
    onClear: () => void;
    onRetry: () => void;
}

const ChatOverlay: React.FC<ChatOverlayProps> = ({ messages, isOpen, onToggle, onNodeSelect, nodes, onClear, onRetry }) => {
    const scrollRef = useRef<HTMLDivElement>(null);

    // Auto-scroll to bottom on new message
    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [messages, isOpen]);

    const canRetry = messages.length > 0 && messages[messages.length - 1].type !== MessageType.USER;

    return (
        <div className={`
            absolute top-20 right-4 bottom-32 z-[80] 
            w-[calc(100%-2rem)] md:w-[340px]
            transition-all duration-500 cubic-bezier(0.16, 1, 0.3, 1) 
            ${isOpen ? 'translate-x-0 opacity-100' : 'translate-x-[20px] opacity-0 pointer-events-none'}
        `}>
            <div className="glass-panel h-full rounded-3xl flex flex-col shadow-2xl overflow-hidden border border-white/20 dark:border-white/10 bg-bg-panel/95 backdrop-blur-xl">
                {/* Header */}
                <div className="h-14 shrink-0 flex items-center justify-between px-5 border-b border-border-subtle/50 bg-bg-surface/30">
                    <div className="flex items-center gap-2">
                        <i className="fa-solid fa-comments text-text-secondary text-xs"></i>
                        <span className="text-xs font-bold text-text-primary tracking-wide uppercase opacity-80">Session History</span>
                    </div>
                    <div className="flex items-center gap-1">
                        {canRetry && (
                            <button
                                onClick={onRetry}
                                className="w-8 h-8 rounded-full hover:bg-black/5 dark:hover:bg-white/10 flex items-center justify-center text-text-secondary transition-colors"
                                title="Retry last response"
                            >
                                <i className="fa-solid fa-rotate-right text-xs"></i>
                            </button>
                        )}
                        <button 
                            onClick={() => { if(confirm("Clear chat history?")) onClear(); }}
                            className="w-8 h-8 rounded-full hover:bg-black/5 dark:hover:bg-white/10 flex items-center justify-center text-text-secondary transition-colors"
                            title="Clear History"
                        >
                            <i className="fa-solid fa-trash-can text-xs"></i>
                        </button>
                        <button 
                            onClick={onToggle} 
                            className="w-8 h-8 rounded-full hover:bg-black/5 dark:hover:bg-white/10 flex items-center justify-center text-text-secondary transition-colors"
                        >
                            <i className="fa-solid fa-xmark text-sm"></i>
                        </button>
                    </div>
                </div>
                
                {/* Messages List - Padded content, full width scroll */}
                <div ref={scrollRef} className="flex-1 overflow-y-auto px-5 pt-5 pb-2 custom-scrollbar scroll-smooth">
                    {messages.length === 0 && (
                        <div className="h-full flex flex-col items-center justify-center text-center opacity-40">
                             <div className="w-16 h-16 rounded-3xl bg-text-primary/5 flex items-center justify-center mb-4">
                                <i className="fa-solid fa-sparkles text-2xl text-text-secondary"></i>
                             </div>
                             <p className="text-sm font-medium text-text-primary">Ready to create.</p>
                             <p className="text-xs text-text-secondary mt-1">Ask Wise to help you build.</p>
                        </div>
                    )}
                    {messages.map((msg) => (
                        <ChatMessage 
                            key={msg.id} 
                            message={msg} 
                            onNodeSelect={onNodeSelect} 
                            nodes={nodes}
                        />
                    ))}
                </div>
            </div>
        </div>
    );
};

export default ChatOverlay;
