import React, { useRef, useState, useEffect } from 'react';
import { RotateCcw } from 'lucide-react';

export default function SignaturePad({ onSignatureChange, disabled = false }) {
    const canvasRef = useRef(null);
    const [isDrawing, setIsDrawing] = useState(false);
    const [hasDrawn, setHasDrawn] = useState(false);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        ctx.strokeStyle = '#0f172a'; // slate-900
        ctx.lineWidth = 2.5;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';

        const resizeCanvas = () => {
            const rect = canvas.getBoundingClientRect();
            // Preserve drawing if resizing
            const tempCanvas = document.createElement('canvas');
            tempCanvas.width = canvas.width;
            tempCanvas.height = canvas.height;
            const tempCtx = tempCanvas.getContext('2d');
            tempCtx.drawImage(canvas, 0, 0);

            canvas.width = rect.width * (window.devicePixelRatio || 1);
            canvas.height = rect.height * (window.devicePixelRatio || 1);
            ctx.scale(window.devicePixelRatio || 1, window.devicePixelRatio || 1);
            ctx.strokeStyle = '#0f172a';
            ctx.lineWidth = 2.5;
            ctx.lineCap = 'round';
            ctx.lineJoin = 'round';

            if (tempCanvas.width > 0 && tempCanvas.height > 0) {
                ctx.drawImage(tempCanvas, 0, 0, rect.width, rect.height);
            }
        };

        resizeCanvas();
        window.addEventListener('resize', resizeCanvas);
        return () => window.removeEventListener('resize', resizeCanvas);
    }, []);

    const getPos = (e) => {
        const canvas = canvasRef.current;
        const rect = canvas.getBoundingClientRect();
        if (e.touches && e.touches.length > 0) {
            return {
                x: e.touches[0].clientX - rect.left,
                y: e.touches[0].clientY - rect.top,
            };
        }
        return {
            x: e.clientX - rect.left,
            y: e.clientY - rect.top,
        };
    };

    const startDrawing = (e) => {
        if (disabled) return;
        const { x, y } = getPos(e);
        const ctx = canvasRef.current.getContext('2d');
        ctx.beginPath();
        ctx.moveTo(x, y);
        setIsDrawing(true);
        setHasDrawn(true);
    };

    const draw = (e) => {
        if (!isDrawing || disabled) return;
        e.preventDefault();
        const { x, y } = getPos(e);
        const ctx = canvasRef.current.getContext('2d');
        ctx.lineTo(x, y);
        ctx.stroke();
    };

    const stopDrawing = () => {
        if (!isDrawing) return;
        setIsDrawing(false);
        const canvas = canvasRef.current;
        if (canvas) {
            const dataUrl = canvas.toDataURL('image/png');
            onSignatureChange(dataUrl);
        }
    };

    const clear = () => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        setHasDrawn(false);
        onSignatureChange('');
    };

    return (
        <div className="relative w-full">
            <div
                className="w-full h-36 rounded-xl border border-slate-300 dark:border-slate-700 bg-white relative overflow-hidden touch-none cursor-crosshair select-none"
                style={{ background: 'var(--umahz-surface)' }}
            >
                <canvas
                    ref={canvasRef}
                    className="w-full h-full block"
                    onMouseDown={startDrawing}
                    onMouseMove={draw}
                    onMouseUp={stopDrawing}
                    onMouseLeave={stopDrawing}
                    onTouchStart={startDrawing}
                    onTouchMove={draw}
                    onTouchEnd={stopDrawing}
                />

                {/* Signing guideline */}
                <div className="absolute bottom-6 left-6 right-6 border-b border-dashed border-slate-300 dark:border-slate-600 pointer-events-none flex items-center justify-between">
                    <span className="text-[10px] text-slate-400 dark:text-slate-500 font-medium">✕ Sign on the line</span>
                </div>

                {!hasDrawn && (
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                        <span className="text-xs text-slate-400 font-medium select-none">
                            Draw signature here with finger, stylus, or mouse
                        </span>
                    </div>
                )}
            </div>

            <div className="mt-2 flex items-center justify-between text-xs">
                <span className="text-slate-400 text-[11px]">
                    {hasDrawn ? '✓ Signature captured' : 'Awaiting signature'}
                </span>
                <button
                    type="button"
                    onClick={clear}
                    disabled={!hasDrawn || disabled}
                    className="inline-flex items-center gap-1 text-[11px] font-semibold text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 disabled:opacity-40"
                >
                    <RotateCcw className="w-3 h-3" />
                    Clear
                </button>
            </div>
        </div>
    );
}
