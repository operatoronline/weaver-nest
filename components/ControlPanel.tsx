
import React, { useRef, useEffect, useState } from 'react';

interface ControlPanelProps {
  isOpen: boolean;
  onClose: () => void;
  isDarkMode: boolean;
  onToggleTheme: () => void;
  snapToGrid: boolean;
  onToggleGrid: () => void;
  showChat: boolean;
  onToggleChat: () => void;
  onSave: () => void;
  onLoad: () => void;
  canUndo: boolean;
  canRedo: boolean;
  onUndo: () => void;
  onRedo: () => void;
}

const ControlPanel: React.FC<ControlPanelProps> = ({
  isOpen,
  onClose,
  isDarkMode,
  onToggleTheme,
  snapToGrid,
  onToggleGrid,
  showChat,
  onToggleChat,
  onSave,
  onLoad,
  canUndo,
  canRedo,
  onUndo,
  onRedo
}) => {
  const panelRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(event.target as Node)) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      ref={panelRef}
      className="fixed top-20 left-4 right-4 md:absolute md:top-16 md:right-0 md:left-auto md:w-72 glass-panel rounded-2xl shadow-2xl border border-white/20 dark:border-white/10 origin-top md:origin-top-right animate-scale-in z-[100] flex flex-col overflow-hidden"
    >
        {/* Header */}
        <div className="px-4 py-3 border-b border-border-subtle bg-bg-surface/30 backdrop-blur-md flex items-center justify-between">
            <h2 className="text-xs font-bold text-text-primary uppercase tracking-wide">Control Center</h2>
            <button 
                onClick={onClose}
                className="w-5 h-5 flex items-center justify-center rounded-full hover:bg-black/5 dark:hover:bg-white/10 text-text-secondary transition-colors"
            >
                <i className="fa-solid fa-xmark text-xs"></i>
            </button>
        </div>

        <div className="p-3 space-y-4 max-h-[calc(100vh-10rem)] overflow-y-auto custom-scrollbar">
            
            {/* Section: Interface */}
            <div className="space-y-1.5">
                <div className="px-1.5 flex items-center justify-between">
                    <span className="text-[10px] font-bold text-text-muted uppercase tracking-wider">Interface</span>
                </div>
                <div className="bg-bg-surface/50 border border-border-subtle rounded-xl overflow-hidden">
                    <ToggleRow 
                        label="Dark Mode" 
                        icon={isDarkMode ? "moon" : "sun"} 
                        active={isDarkMode} 
                        onClick={onToggleTheme}
                        activeColor="bg-indigo-500"
                    />
                    <Divider />
                    <ToggleRow 
                        label="Snap Grid" 
                        icon="border-all" 
                        active={snapToGrid} 
                        onClick={onToggleGrid} 
                    />
                    <Divider />
                    <ToggleRow 
                        label="Chat Overlay" 
                        icon="comments" 
                        active={showChat} 
                        onClick={onToggleChat} 
                    />
                </div>
            </div>

            {/* Section: History */}
            <div className="space-y-1.5">
                <div className="px-1.5 flex items-center justify-between">
                    <span className="text-[10px] font-bold text-text-muted uppercase tracking-wider">Session</span>
                </div>
                <div className="grid grid-cols-2 gap-2">
                    <ActionButton 
                        label="Undo" 
                        icon="rotate-left" 
                        onClick={onUndo} 
                        disabled={!canUndo} 
                    />
                    <ActionButton 
                        label="Redo" 
                        icon="rotate-right" 
                        onClick={onRedo} 
                        disabled={!canRedo} 
                    />
                </div>
            </div>

            {/* Section: System */}
            <div className="space-y-1.5">
                <div className="px-1.5 flex items-center justify-between">
                    <span className="text-[10px] font-bold text-text-muted uppercase tracking-wider">System</span>
                </div>
                <div className="bg-bg-surface/50 border border-border-subtle rounded-xl overflow-hidden">
                    <ActionRow 
                        label="Export Project" 
                        icon="file-export" 
                        onClick={onSave} 
                    />
                    <Divider />
                    <ActionRow 
                        label="Import Project" 
                        icon="file-import" 
                        onClick={onLoad} 
                    />
                    <Divider />
                    
                    {/* Cloud Storage Row — auto-managed via SDK */}
                    <div className="flex items-center justify-between px-3 py-2.5">
                        <div className="flex items-center gap-3">
                            <div className="w-6 h-6 rounded flex items-center justify-center bg-emerald-500/10 text-emerald-500">
                                <i className="fa-solid fa-cloud text-xs"></i>
                            </div>
                            <span className="text-xs font-medium text-text-primary">Cloud Storage</span>
                        </div>
                        <span className="text-[10px] font-medium text-emerald-500">Auto</span>
                    </div>
                </div>
            </div>

        </div>
        
        {/* Footer */}
        <div className="px-4 py-2 bg-bg-surface/30 border-t border-border-subtle/50 flex items-center justify-between text-[10px] text-text-muted">
            <span>Nest Studio</span>
            <span className="font-mono opacity-50">v0.9.2</span>
        </div>
    </div>
  );
};

// --- Sub-components for cleaner code ---

const Divider = () => <div className="h-[1px] bg-border-subtle mx-3" />;

interface ToggleRowProps {
    label: string;
    icon: string;
    active: boolean;
    onClick: () => void;
    activeColor?: string;
}

const ToggleRow: React.FC<ToggleRowProps> = ({ label, icon, active, onClick, activeColor = 'bg-accent-primary' }) => (
    <div 
        onClick={onClick}
        className="flex items-center justify-between px-3 py-2.5 hover:bg-black/5 dark:hover:bg-white/5 transition-colors cursor-pointer group select-none"
    >
        <div className="flex items-center gap-3">
            <div className={`w-6 h-6 rounded flex items-center justify-center transition-colors ${active ? `${activeColor} text-white` : 'bg-text-secondary/10 text-text-secondary'}`}>
                <i className={`fa-solid fa-${icon} text-xs`}></i>
            </div>
            <span className="text-xs font-medium text-text-primary">{label}</span>
        </div>
        <div className={`w-9 h-5 rounded-full relative transition-colors duration-200 ease-in-out ${active ? activeColor : 'bg-border-active'}`}>
            <div className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white shadow-sm transition-transform duration-200 ease-[cubic-bezier(0.2,0.8,0.3,1)] ${active ? 'translate-x-4' : 'translate-x-0'}`} />
        </div>
    </div>
);

interface ActionButtonProps {
    label: string;
    icon: string;
    onClick: () => void;
    disabled?: boolean;
}

const ActionButton: React.FC<ActionButtonProps> = ({ label, icon, onClick, disabled }) => (
    <button 
        onClick={onClick}
        disabled={disabled}
        className="flex flex-col items-center justify-center gap-1.5 py-3 rounded-xl bg-bg-surface/50 border border-border-subtle hover:bg-bg-surface hover:border-text-primary/10 disabled:opacity-50 disabled:hover:bg-bg-surface/50 transition-all active:scale-[0.98]"
    >
        <i className={`fa-solid fa-${icon} text-sm text-text-primary`}></i>
        <span className="text-[10px] font-medium text-text-secondary">{label}</span>
    </button>
);

interface ActionRowProps {
    label: string;
    icon: string;
    onClick: () => void;
}

const ActionRow: React.FC<ActionRowProps> = ({ label, icon, onClick }) => (
    <button 
        onClick={onClick}
        className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-black/5 dark:hover:bg-white/5 transition-colors text-left group"
    >
        <div className="w-6 h-6 rounded flex items-center justify-center bg-text-secondary/10 text-text-secondary group-hover:bg-text-primary group-hover:text-bg-main transition-colors">
            <i className={`fa-solid fa-${icon} text-xs`}></i>
        </div>
        <span className="text-xs font-medium text-text-primary flex-1">{label}</span>
        <i className="fa-solid fa-chevron-right text-[10px] text-text-muted opacity-0 group-hover:opacity-100 transition-opacity transform translate-x-[-4px] group-hover:translate-x-0"></i>
    </button>
);

export default ControlPanel;
