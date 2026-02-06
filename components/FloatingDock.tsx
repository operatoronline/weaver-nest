
import React, { useState } from 'react';
import { AgentId } from '../types';
import { AGENTS } from '../constants';

interface FloatingDockProps {
    activeAgent: AgentId;
    onSelectAgent: (id: AgentId) => void;
    onToggleLive: () => void;
}

const FloatingDock: React.FC<FloatingDockProps> = ({ activeAgent, onSelectAgent, onToggleLive }) => {
    const [isExpanded, setIsExpanded] = useState(false);

    return (
        <>
            {/* Mobile Backdrop */}
            <div 
                className={`
                    absolute inset-0 bg-black/20 backdrop-blur-sm z-[90] transition-opacity duration-300 md:hidden
                    ${isExpanded ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}
                `}
                onClick={() => setIsExpanded(false)}
            />

            {/* Main Dock Container */}
            <div className={`
                absolute z-[100] left-1/2 transform -translate-x-1/2 transition-all duration-500 ease-[cubic-bezier(0.32,0.72,0,1)]
                ${isExpanded ? 'top-20 md:top-6' : 'top-4 md:top-6'}
            `}>
                <div 
                    className={`
                        glass-panel shadow-glass hover:shadow-glass-hover bg-bg-panel/80 backdrop-blur-xl
                        flex items-center justify-center overflow-hidden transition-all duration-500 ease-[cubic-bezier(0.32,0.72,0,1)]
                        ${isExpanded 
                            ? 'h-14 px-4 rounded-[28px] gap-2' // Mobile Expanded (Float down a bit to separate from header)
                            : 'h-10 w-10 rounded-full md:h-12 md:w-auto md:px-2 md:rounded-[24px] md:gap-1' // Mobile Collapsed (Circle) vs Desktop (Pill)
                        }
                    `}
                >
                    {/* Mobile Collapsed Trigger */}
                    <button 
                        className={`
                            absolute inset-0 flex items-center justify-center md:hidden transition-opacity duration-300
                            ${isExpanded ? 'opacity-0 pointer-events-none' : 'opacity-100'}
                        `}
                        onClick={() => setIsExpanded(true)}
                    >
                        <i className={`fa-solid ${AGENTS[activeAgent].icon} text-sm text-text-primary`}></i>
                    </button>

                    {/* Agent List */}
                    <div 
                        className={`
                            flex items-center gap-2 md:gap-1 transition-all duration-300
                            ${isExpanded 
                                ? 'opacity-100 scale-100 translate-y-0' 
                                : 'opacity-0 scale-95 translate-y-4 pointer-events-none absolute md:static md:opacity-100 md:scale-100 md:translate-y-0 md:pointer-events-auto'
                            }
                        `}
                    >
                        {Object.values(AGENTS).map((agent) => {
                            const isActive = activeAgent === agent.id;
                            return (
                                <button
                                    key={agent.id}
                                    onClick={() => {
                                        onSelectAgent(agent.id);
                                        setIsExpanded(false);
                                    }}
                                    className={`
                                        group relative w-8 h-8 md:w-9 md:h-9 rounded-full flex items-center justify-center text-base transition-all duration-300 ease-out
                                        ${isActive 
                                            ? 'bg-text-primary text-bg-main scale-100 shadow-md' 
                                            : 'text-text-secondary hover:bg-black/5 dark:hover:bg-white/10 hover:scale-105'
                                        }
                                    `}
                                >
                                    <i className={`fa-solid ${agent.icon} text-xs`}></i>
                                    
                                    {/* Tooltip (Desktop Only) */}
                                    <div className="hidden md:block absolute top-full mt-2 left-1/2 transform -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-all duration-200 pointer-events-none z-50">
                                        <div className="bg-text-primary text-bg-main text-[10px] px-2 py-1 rounded-md font-medium shadow-xl whitespace-nowrap">
                                            {agent.name}
                                        </div>
                                    </div>

                                    {/* Active Dot (Desktop Only) */}
                                    {isActive && (
                                        <div className="absolute -top-1 w-0.5 h-0.5 rounded-full bg-text-primary opacity-50 hidden md:block"></div>
                                    )}
                                </button>
                            )
                        })}
                        
                        <div className="w-[1px] h-4 bg-border-subtle mx-1"></div>

                        <button 
                            onClick={() => {
                                onToggleLive();
                                setIsExpanded(false);
                            }}
                            className="group w-8 h-8 md:w-9 md:h-9 rounded-full bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white flex items-center justify-center transition-all duration-300 hover:scale-105 shadow-sm"
                        >
                            <i className="fa-solid fa-microphone text-xs group-hover:animate-pulse"></i>
                        </button>
                    </div>
                </div>
            </div>
        </>
    );
};

export default FloatingDock;
