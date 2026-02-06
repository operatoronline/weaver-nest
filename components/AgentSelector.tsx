
import React, { useEffect, useRef } from 'react';
import { AgentId } from '../types';
import { AGENTS } from '../constants';

interface AgentSelectorProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (id: AgentId) => void;
  currentAgent: AgentId;
}

const AgentSelector: React.FC<AgentSelectorProps> = ({ isOpen, onClose, onSelect, currentAgent }) => {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
          onClose();
      }
    };

    if (isOpen) {
      const timer = setTimeout(() => {
          document.addEventListener('mousedown', handleClickOutside);
      }, 0);
      return () => {
          clearTimeout(timer);
          document.removeEventListener('mousedown', handleClickOutside);
      };
    }
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div 
        ref={containerRef}
        className="absolute bottom-full left-4 right-4 sm:left-4 sm:right-auto sm:w-72 mb-2 z-50 animate-slide-up origin-bottom-left"
    >
        <div className="glass-panel bg-bg-panel/95 backdrop-blur-2xl rounded-3xl border border-white/20 dark:border-white/10 shadow-2xl overflow-hidden flex flex-col max-h-[50vh] sm:max-h-[400px]">
            <div className="overflow-y-auto custom-scrollbar p-1.5 flex flex-col gap-1">
                {Object.values(AGENTS).map((agent) => {
                    const isSelected = currentAgent === agent.id;
                    return (
                        <button
                            key={agent.id}
                            onClick={() => {
                                onSelect(agent.id);
                                onClose();
                            }}
                            className={`
                                relative flex items-center gap-3 p-2 rounded-2xl transition-all duration-200 group text-left
                                ${isSelected 
                                    ? 'bg-text-primary text-bg-main shadow-md' 
                                    : 'hover:bg-bg-surface/80 hover:shadow-sm text-text-primary'
                                }
                            `}
                        >
                            {/* Icon */}
                            <div className={`
                                w-8 h-8 rounded-full flex items-center justify-center text-sm shrink-0 transition-colors
                                ${isSelected 
                                    ? 'bg-bg-main text-text-primary' 
                                    : `bg-bg-main border border-border-subtle ${agent.color}`
                                }
                            `}>
                                <i className={`fa-solid ${agent.icon}`}></i>
                            </div>
                            
                            {/* Text Info */}
                            <div className="flex flex-col items-start min-w-0 flex-1 gap-0">
                                <span className={`text-sm font-bold truncate ${isSelected ? 'text-bg-main' : 'text-text-primary'}`}>
                                    {agent.name}
                                </span>
                                <span className={`text-[10px] truncate w-full ${isSelected ? 'text-bg-main/70' : 'text-text-secondary'}`}>
                                    {agent.description}
                                </span>
                            </div>
                            
                            {/* Selection Indicator */}
                            {isSelected && (
                                <div className="shrink-0 pr-2">
                                    <i className="fa-solid fa-check text-accent-primary bg-white rounded-full p-0.5 text-[8px]"></i>
                                </div>
                            )}
                        </button>
                    );
                })}
            </div>
        </div>
    </div>
  );
};

export default AgentSelector;
