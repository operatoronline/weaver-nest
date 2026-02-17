import React from 'react';
import { useAuth } from '@operator/identify/react';

const LoginScreen: React.FC = () => {
  const { login, loginAsGuest } = useAuth();

  return (
    <div className="h-full w-full bg-bg-main flex flex-col items-center justify-center p-6 relative overflow-hidden">
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-accent-primary/5 rounded-full blur-[120px] pointer-events-none" />

      <div className="relative max-w-sm w-full glass-panel border border-border-subtle p-8 shadow-2xl rounded-3xl">
        <div className="flex flex-col items-center text-center">
          <div className="w-16 h-16 bg-text-primary text-bg-main flex items-center justify-center rounded-2xl mb-6 shadow-lg">
            <i className="fa-solid fa-shapes text-2xl"></i>
          </div>

          <h1 className="text-3xl font-bold text-text-primary mb-2 tracking-tight">Nest Studio</h1>
          <p className="text-text-secondary text-sm leading-relaxed mb-8 px-4">
            Infinite canvas for agentic collaboration. Sign in to sync your workspaces across devices.
          </p>

          <button
            onClick={login}
            className="group w-full py-3 px-4 bg-text-primary hover:opacity-90 text-bg-main rounded-xl font-bold transition-all duration-300 flex items-center justify-center gap-2 shadow-lg active:scale-95"
          >
            <span>Connect Cardsite</span>
            <i className="fa-solid fa-arrow-right text-sm transition-transform group-hover:translate-x-1"></i>
          </button>

          <button
            onClick={loginAsGuest}
            className="mt-4 text-xs font-medium text-text-muted hover:text-text-primary transition-colors tracking-wide uppercase px-4 py-2"
          >
            Continue as Guest
          </button>

          <div className="mt-6 flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
            <span className="text-[10px] font-mono text-text-muted uppercase tracking-widest">System Operational</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginScreen;
