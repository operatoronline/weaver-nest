
import React, { useRef, useEffect, useState } from 'react';
import { Workspace } from '../types';

interface WorkspacePanelProps {
  isOpen: boolean;
  onClose: () => void;
  workspaces: Workspace[];
  activeWorkspaceId: string;
  onSelect: (id: string) => void;
  onCreate: () => void;
  onDelete: (id: string) => void;
  onRename: (id: string, name: string) => void;
}

const WorkspacePanel: React.FC<WorkspacePanelProps> = ({
  isOpen,
  onClose,
  workspaces,
  activeWorkspaceId,
  onSelect,
  onCreate,
  onDelete,
  onRename
}) => {
  const panelRef = useRef<HTMLDivElement>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');

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

  const handleStartRename = (ws: Workspace, e: React.MouseEvent) => {
      e.stopPropagation();
      setEditingId(ws.id);
      setEditName(ws.name);
  };

  const handleFinishRename = () => {
      if (editingId && editName.trim()) {
          onRename(editingId, editName.trim());
      }
      setEditingId(null);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
      if (e.key === 'Enter') handleFinishRename();
  };

  if (!isOpen) return null;

  return (
    <div
      ref={panelRef}
      className="fixed top-20 left-4 right-4 md:absolute md:top-16 md:left-0 md:right-auto md:w-80 glass-panel rounded-3xl p-2 shadow-2xl border border-white/20 dark:border-white/10 origin-top md:origin-top-left animate-scale-in z-[100] flex flex-col overflow-hidden"
    >
        {/* Header Section */}
      <div className="flex items-center justify-between p-4 border-b border-border-subtle/50 mb-2 bg-bg-surface/30">
        <div className="flex flex-col">
             <span className="text-xs font-bold text-text-secondary uppercase tracking-wider">Workspaces</span>
             <span className="text-[10px] text-text-muted">Manage your canvases</span>
        </div>
        <button 
            onClick={onCreate}
            className="w-8 h-8 rounded-full bg-text-primary text-bg-main hover:scale-105 flex items-center justify-center transition-all shadow-md"
            title="New Workspace"
        >
            <i className="fa-solid fa-plus text-xs"></i>
        </button>
      </div>

      {/* Scrollable List */}
      <div className="flex flex-col gap-1 max-h-[350px] overflow-y-auto custom-scrollbar px-2 pb-2">
        {workspaces.map((ws) => {
            const isActive = ws.id === activeWorkspaceId;
            const isEditing = ws.id === editingId;

            return (
                <div
                    key={ws.id}
                    onClick={() => !isEditing && onSelect(ws.id)}
                    className={`
                        group relative flex items-center gap-3 px-3 py-3 rounded-2xl transition-all duration-300 cursor-pointer overflow-hidden
                        ${isActive 
                            ? 'bg-bg-surface shadow-sm border border-border-subtle' 
                            : 'hover:bg-bg-surface/50 border border-transparent hover:border-border-subtle/50'
                        }
                    `}
                >
                    {/* Icon */}
                    <div className={`
                        w-9 h-9 rounded-xl flex items-center justify-center shrink-0 transition-colors shadow-sm
                        ${isActive 
                            ? 'bg-accent-primary text-white shadow-accent-primary/30' 
                            : 'bg-bg-main border border-border-subtle text-text-secondary'
                        }
                    `}>
                        <i className="fa-solid fa-layer-group text-sm"></i>
                    </div>

                    {/* Text Content */}
                    <div className="flex flex-col flex-1 min-w-0 z-10">
                        {isEditing ? (
                            <input 
                                autoFocus
                                value={editName}
                                onChange={(e) => setEditName(e.target.value)}
                                onBlur={handleFinishRename}
                                onKeyDown={handleKeyDown}
                                onClick={(e) => e.stopPropagation()}
                                className="bg-transparent border-b border-accent-primary outline-none text-sm font-semibold w-full text-text-primary placeholder:text-text-muted"
                                placeholder="Workspace Name"
                            />
                        ) : (
                            <div className="flex items-center justify-between">
                                <span className={`text-sm font-semibold truncate ${isActive ? 'text-text-primary' : 'text-text-secondary group-hover:text-text-primary'} transition-colors`}>
                                    {ws.name}
                                </span>
                            </div>
                        )}
                        <div className="flex items-center gap-2 text-[10px] text-text-muted mt-0.5">
                             <span>{ws.nodes.length} items</span>
                             <span className="w-0.5 h-0.5 rounded-full bg-text-muted"></span>
                             <span>{new Date(ws.lastModified).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}</span>
                        </div>
                    </div>

                    {/* Action Buttons (Hover) */}
                    {!isEditing && (
                        <div className={`flex items-center gap-1 ${isActive ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'} transition-opacity duration-200`}>
                             <button 
                                onClick={(e) => handleStartRename(ws, e)}
                                className="w-7 h-7 rounded-lg hover:bg-black/5 dark:hover:bg-white/10 flex items-center justify-center text-text-secondary hover:text-text-primary transition-colors"
                                title="Rename"
                            >
                                <i className="fa-solid fa-pen text-[10px]"></i>
                            </button>
                            {workspaces.length > 1 && (
                                <button 
                                    onClick={(e) => { e.stopPropagation(); onDelete(ws.id); }}
                                    className="w-7 h-7 rounded-lg hover:bg-red-500/10 hover:text-red-500 flex items-center justify-center text-text-secondary transition-colors"
                                    title="Delete"
                                >
                                    <i className="fa-solid fa-trash text-[10px]"></i>
                                </button>
                            )}
                        </div>
                    )}
                </div>
            );
        })}
      </div>
      
      {/* Footer */}
      <div className="mt-auto px-4 py-3 bg-bg-surface/30 border-t border-border-subtle/50 flex justify-between items-center text-[10px] text-text-muted font-mono">
          <span>{workspaces.length} Active</span>
          <span>v1.0.8</span>
      </div>
    </div>
  );
};

export default WorkspacePanel;
