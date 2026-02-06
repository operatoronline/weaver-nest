import React, { useState } from 'react';
import { Message, MessageType, CanvasNode } from '../types';
import { AGENTS } from '../constants';
import { MarkdownRenderer } from './MarkdownRenderer';

interface ChatMessageProps {
  message: Message;
  onNodeSelect: (nodeId: string) => void;
  nodes?: CanvasNode[];
}

const ChatMessage: React.FC<ChatMessageProps> = ({ message, onNodeSelect, nodes }) => {
  const isUser = message.type === MessageType.USER;
  const isSystem = message.type === MessageType.SYSTEM;
  const agent = message.agentId ? AGENTS[message.agentId] : null;
  const [showThoughts, setShowThoughts] = useState(false);

  // Identify "Tool" or "Log" messages (Updated to use specific marker)
  const isToolLog = !isUser && message.content.includes(':::LOG:::');
  
  // Clean content for display (Remove the marker)
  const displayContent = message.content.replace(':::LOG:::', '').trim();

  if (isSystem) {
      return (
          <div className="flex justify-center my-4 animate-fade-in px-4">
              <span className="px-3 py-1.5 rounded-lg bg-red-500/10 text-red-500 text-[10px] font-mono border border-red-500/20 shadow-sm text-center">
                  <i className="fa-solid fa-triangle-exclamation mr-1.5"></i>
                  {displayContent}
              </span>
          </div>
      );
  }

  return (
    <div className={`group flex w-full mb-4 animate-slide-up ${isUser ? 'justify-end' : 'justify-start'}`}>
      <div 
        className={`
            flex flex-col 
            ${isUser ? 'items-end' : 'items-start'} 
            ${isToolLog ? 'w-full px-2' : 'max-w-[90%] md:max-w-[85%]'}
        `}
      >
        
        {/* Agent Header - Only show for Agent Chat (not tools) */}
        {!isUser && !isToolLog && agent && (
          <div className="flex items-center gap-2 mb-1.5 ml-1 opacity-90 transition-opacity select-none">
            <div className={`w-4 h-4 rounded-full flex items-center justify-center bg-bg-surface border border-border-subtle shadow-sm`}>
                <i className={`fa-solid ${agent.icon} text-[8px] ${agent.color}`}></i>
            </div>
            <span className="text-[11px] font-bold text-text-primary tracking-wide">
                {agent.name}
            </span>
            <span className="text-[10px] text-text-muted font-mono ml-auto">
                {new Date(message.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
            </span>
          </div>
        )}

        {/* Message Bubble Container */}
        <div 
            className={`
                relative text-sm overflow-hidden transition-all duration-200
                ${isUser 
                    ? 'px-4 py-2.5 bg-text-primary text-bg-main rounded-2xl rounded-tr-sm shadow-md' // Monochrome User Bubble
                    : isToolLog
                        ? 'p-0 bg-transparent w-full'
                        : 'px-4 py-3 bg-bg-surface border border-border-subtle text-text-primary rounded-2xl rounded-tl-sm shadow-sm'
                }
            `}
        >
            {/* Thought Process (Router Reasoning) */}
            {message.thoughtProcess && !isUser && !isToolLog && (
                <div className="mb-2 pb-2 border-b border-border-subtle/50">
                    <button 
                        onClick={() => setShowThoughts(!showThoughts)}
                        className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-text-muted hover:text-accent-primary transition-colors select-none w-full"
                    >
                        <i className={`fa-solid fa-brain text-[10px] transition-transform duration-200 ${showThoughts ? 'text-accent-primary' : ''}`}></i>
                        <span>Reasoning</span>
                        <i className={`fa-solid fa-chevron-right text-[8px] ml-auto transition-transform duration-200 ${showThoughts ? 'rotate-90' : ''}`}></i>
                    </button>
                    
                    {showThoughts && (
                        <div className="mt-2 pl-2 border-l-2 border-accent-primary/20 text-text-secondary font-mono text-[10px] whitespace-pre-wrap leading-relaxed animate-slide-down">
                            {message.thoughtProcess}
                        </div>
                    )}
                </div>
            )}

            {/* Main Content */}
            {isToolLog ? (
                 // Specialized Tool/Log View
                 <div className="flex flex-col gap-2 rounded-xl bg-bg-main/50 border border-border-subtle/60 p-3 font-mono text-xs shadow-sm">
                     <div className="flex items-center gap-2 pb-2 border-b border-border-subtle/50 mb-1 opacity-70">
                         {/* Status Icon Indicator */}
                         <div className={`w-5 h-5 rounded-full flex items-center justify-center ${message.content.includes('Complete') ? 'bg-green-500/20 text-green-600' : 'bg-yellow-500/20 text-yellow-600'}`}>
                             {message.content.includes('Complete') 
                                ? <i className="fa-solid fa-check text-[10px]"></i> 
                                : <i className="fa-solid fa-rotate text-[10px] animate-spin"></i>
                             }
                         </div>
                         <span className="uppercase tracking-widest text-[9px] font-bold">System Process</span>
                         <span className="ml-auto text-[9px]">{new Date(message.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                     </div>
                     <div className="text-text-primary/90 leading-relaxed pl-1">
                        <MarkdownRenderer 
                            content={displayContent} 
                            onNodeLinkClick={onNodeSelect}
                            className="text-text-primary"
                            compact={true}
                            nodes={nodes}
                        />
                     </div>
                 </div>
            ) : (
                // Standard Chat View
                <MarkdownRenderer 
                    content={displayContent} 
                    onNodeLinkClick={onNodeSelect}
                    className={isUser ? 'text-bg-main' : 'text-text-primary'}
                    compact={true}
                    nodes={nodes}
                />
            )}

            {/* Media Attachments */}
            {message.attachments && message.attachments.length > 0 && (
                <div className={`mt-3 flex flex-wrap gap-2 ${isUser ? 'justify-end' : 'justify-start'}`}>
                    {message.attachments.map((att, idx) => (
                        <div 
                            key={idx} 
                            className="group/att relative rounded-lg overflow-hidden border border-border-subtle shadow-sm w-32 h-24 bg-black/5"
                        >
                            {att.type === 'image' && (
                                <img src={att.url} alt="Generated" className="w-full h-full object-cover transition-transform duration-500 group-hover/att:scale-110" />
                            )}
                            {att.type === 'video' && (
                                <div className="w-full h-full flex items-center justify-center bg-black relative">
                                    <video src={att.url} className="w-full h-full object-cover opacity-80" />
                                    <div className="absolute inset-0 flex items-center justify-center">
                                        <div className="w-6 h-6 rounded-full bg-white/20 backdrop-blur flex items-center justify-center">
                                            <i className="fa-solid fa-play text-white text-[8px] pl-0.5"></i>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            )}
        </div>
      </div>
    </div>
  );
};

export default ChatMessage;