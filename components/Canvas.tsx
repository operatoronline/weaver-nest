import React from 'react';
import { CanvasItem } from '../types';

interface CanvasProps {
  item: CanvasItem | null;
  onClose: () => void;
}

const Canvas: React.FC<CanvasProps> = ({ item, onClose }) => {
  if (!item) {
    return (
      <div className="h-full w-full flex flex-col items-center justify-center text-text-muted bg-bg-surface/50">
        <div className="w-16 h-16 rounded-2xl bg-border-subtle flex items-center justify-center mb-4 opacity-50">
            <i className="fa-solid fa-layer-group text-2xl"></i>
        </div>
        <h3 className="text-sm font-medium">No Active Artifact</h3>
        <p className="text-xs opacity-70 mt-1">Select code or media from chat to view here.</p>
      </div>
    );
  }

  return (
    <div className="h-full w-full flex flex-col bg-bg-surface border-l border-border-subtle animate-in-slide">
      {/* Canvas Header */}
      <div className="h-14 border-b border-border-subtle flex items-center justify-between px-6 bg-bg-main/50 backdrop-blur">
        <div className="flex items-center gap-3 overflow-hidden">
            <div className={`
                w-8 h-8 rounded-lg flex items-center justify-center text-xs
                ${item.type === 'code' ? 'bg-emerald-500/10 text-emerald-500' : ''}
                ${item.type === 'image' ? 'bg-pink-500/10 text-pink-500' : ''}
                ${item.type === 'video' ? 'bg-orange-500/10 text-orange-500' : ''}
            `}>
                <i className={`fa-solid ${item.type === 'code' ? 'fa-code' : item.type === 'image' ? 'fa-image' : 'fa-film'}`}></i>
            </div>
            <div className="flex flex-col">
                <span className="font-semibold text-sm truncate max-w-[200px]">{item.title || 'Untitled Artifact'}</span>
                <span className="text-[10px] text-text-secondary uppercase tracking-wider font-mono">{item.language || item.type}</span>
            </div>
        </div>
        
        <div className="flex items-center gap-2">
            <button className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-border-subtle text-text-secondary transition-colors" title="Download/Copy">
                <i className={`fa-solid ${item.type === 'code' ? 'fa-copy' : 'fa-download'}`}></i>
            </button>
            <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-border-subtle text-text-secondary transition-colors">
                <i className="fa-solid fa-xmark"></i>
            </button>
        </div>
      </div>

      {/* Canvas Body */}
      <div className="flex-1 overflow-auto p-0 relative">
        <div className="absolute inset-0 bg-grid-pattern opacity-[0.4] pointer-events-none"></div>
        
        <div className="h-full overflow-auto">
            {item.type === 'code' && (
                <div className="p-6">
                    <pre className="font-mono text-sm leading-relaxed p-4 rounded-xl bg-bg-panel border border-border-subtle shadow-sm overflow-x-auto text-text-primary">
                        <code>{item.content}</code>
                    </pre>
                </div>
            )}

            {item.type === 'image' && (
                <div className="h-full flex items-center justify-center p-8">
                    <div className="relative group rounded-xl overflow-hidden shadow-2xl border border-border-subtle max-h-full">
                        <img src={item.content} alt={item.title} className="max-h-full max-w-full object-contain" />
                    </div>
                </div>
            )}

            {item.type === 'video' && (
                <div className="h-full flex items-center justify-center p-8">
                    <div className="relative rounded-xl overflow-hidden shadow-2xl border border-border-subtle bg-black w-full max-w-3xl aspect-video">
                        <video src={item.content} controls className="w-full h-full" />
                    </div>
                </div>
            )}
        </div>
      </div>
    </div>
  );
};

export default Canvas;