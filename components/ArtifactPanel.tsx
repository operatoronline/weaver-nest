
import React from 'react';
import { Artifact } from '../types';

interface ArtifactPanelProps {
  artifact: Artifact;
  onClose: () => void;
}

const ArtifactPanel: React.FC<ArtifactPanelProps> = ({ artifact, onClose }) => {
  return (
    <div className="absolute inset-4 md:inset-y-4 md:right-4 md:left-auto md:w-[600px] glass-panel bg-bg-panel/95 backdrop-blur-2xl rounded-3xl shadow-2xl z-40 flex flex-col transform transition-transform duration-300 overflow-hidden border border-white/20 dark:border-white/10">
      {/* Header */}
      <div className="h-14 flex items-center justify-between px-6 border-b border-border-subtle bg-bg-card/50 backdrop-blur-md">
        <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-text-primary/5 flex items-center justify-center">
                 <i className="fa-solid fa-code text-text-primary"></i>
            </div>
            <span className="font-semibold text-text-primary tracking-tight">{artifact.title}</span>
        </div>
        <button onClick={onClose} className="w-8 h-8 rounded-full hover:bg-text-primary/10 flex items-center justify-center transition-colors">
            <i className="fa-solid fa-xmark text-text-secondary"></i>
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto bg-bg-card p-6 font-mono text-sm">
        <pre className="text-text-primary whitespace-pre-wrap leading-relaxed">
            <code>{artifact.content}</code>
        </pre>
      </div>
      
      {/* Footer */}
      <div className="h-16 border-t border-border-subtle flex items-center px-6 bg-bg-card/50 gap-3 backdrop-blur-md">
        <button className="text-sm px-4 py-2 rounded-xl bg-text-primary text-bg-main font-medium hover:opacity-90 transition-opacity flex items-center gap-2">
            <i className="fa-regular fa-copy"></i>
            Copy Code
        </button>
        {artifact.type === 'html' && (
             <button className="text-sm px-4 py-2 rounded-xl bg-bg-main border border-border-subtle text-text-primary font-medium hover:bg-text-primary/5 transition-colors flex items-center gap-2">
                <i className="fa-solid fa-play"></i>
                Run Preview
            </button>
        )}
      </div>
    </div>
  );
};

export default ArtifactPanel;
