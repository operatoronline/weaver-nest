
import React, { useEffect, useRef, useState } from 'react';
import { LiveSession as LiveSessionService } from '../services/liveService';

interface LiveSessionProps {
    onClose: () => void;
}

const LiveSession: React.FC<LiveSessionProps> = ({ onClose }) => {
    const [status, setStatus] = useState('Connecting...');
    const [audioLevel, setAudioLevel] = useState(0);
    const serviceRef = useRef<LiveSessionService | null>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);

    useEffect(() => {
        const session = new LiveSessionService();
        serviceRef.current = session;
        
        session.onStatusChange = setStatus;
        session.onAudioLevel = setAudioLevel;

        session.connect().catch(err => {
            console.error(err);
            setStatus('Connection Failed');
        });

        return () => {
            session.disconnect();
        };
    }, []);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        let animationId: number;
        const draw = () => {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            const center = canvas.height / 2;
            const radius = 60 + (audioLevel * 120); 
            
            // Outer glow
            const gradient = ctx.createRadialGradient(canvas.width/2, center, radius * 0.5, canvas.width/2, center, radius);
            gradient.addColorStop(0, 'rgba(255, 59, 48, 0.4)'); // Reddish/Orange tint like Gemini Live
            gradient.addColorStop(1, 'rgba(255, 59, 48, 0)');

            ctx.beginPath();
            ctx.arc(canvas.width / 2, center, radius, 0, 2 * Math.PI);
            ctx.fillStyle = gradient;
            ctx.fill();

            // Core
            ctx.beginPath();
            ctx.arc(canvas.width / 2, center, 40, 0, 2 * Math.PI);
            ctx.fillStyle = '#FFFFFF';
            ctx.fill();

            animationId = requestAnimationFrame(draw);
        };
        draw();

        return () => cancelAnimationFrame(animationId);
    }, [audioLevel]);

    return (
        <div className="absolute inset-0 z-[100] bg-black/95 flex flex-col items-center justify-center animate-fade-in">
             <div className="absolute top-8 right-8">
                <button onClick={onClose} className="w-12 h-12 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors">
                    <i className="fa-solid fa-xmark text-white text-xl"></i>
                </button>
            </div>

            <div className="relative mb-12">
                <canvas ref={canvasRef} width={500} height={500} className="w-[400px] h-[400px]" />
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                     <i className="fa-solid fa-microphone text-4xl text-black"></i>
                </div>
            </div>

            <h2 className="text-3xl font-light text-white tracking-tight">{status}</h2>
            <p className="text-gray-400 mt-4 font-light">Listening...</p>
        </div>
    );
};

export default LiveSession;
