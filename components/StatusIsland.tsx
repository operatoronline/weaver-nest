
import React from 'react';
import { AgentId } from '../types';
import { AGENTS } from '../constants';

interface StatusIslandProps {
  currentAgent: AgentId;
  status: 'idle' | 'thinking' | 'working' | 'listening' | 'routing';
  statusMessage?: string;
  onClick: () => void;
}

const StatusIsland: React.FC<StatusIslandProps> = ({ currentAgent, status, statusMessage, onClick }) => {
  const agent = AGENTS[currentAgent];

  // Map status to visual width/state
  const isActive = status !== 'idle';

  return (
    <div 
      onClick={onClick}
      className={`
        absolute top-6 left-1/2 transform -translate-x-1/2 
        z-50 cursor-pointer transition-all duration-500 ease-[cubic-bezier(0.16,1,0.3,1)]
        h-12 rounded-full glass-panel shadow-2xl
        flex items-center justify-center gap-3 px-6 w-auto
        hover:scale-105 hover:bg-white/5 group
        whitespace-nowrap
      `}
    >
      {/* Icon Area */}
      <div className={`relative flex items-center justify-center transition-all duration-300`}>
        {status === 'thinking' || status === 'routing' ? (
             <div className="flex gap-1 h-3 items-center">
                <div className="w-1.5 h-1.5 bg-current rounded-full animate-bounce" style={{ animationDelay: '0ms' }}/>
                <div className="w-1.5 h-1.5 bg-current rounded-full animate-bounce" style={{ animationDelay: '150ms' }}/>
                <div className="w-1.5 h-1.5 bg-current rounded-full animate-bounce" style={{ animationDelay: '300ms' }}/>
            </div>
        ) : (
             <i className={`fa-solid ${agent.icon} text-lg ${agent.color} opacity-80 group-hover:opacity-100 transition-opacity`}></i>
        )}
      </div>

      {/* Text Area */}
      <div className="flex flex-col items-center leading-none">
        {isActive && statusMessage ? (
             <span className="text-xs font-medium text-text-primary animate-fade-in">
                {statusMessage}
             </span>
        ) : (
             <span className="text-sm font-semibold text-text-primary group-hover:text-text-primary/80 transition-colors">
                {agent.name}
             </span>
        )}
      </div>
    </div>
  );
};

export default StatusIsland;
