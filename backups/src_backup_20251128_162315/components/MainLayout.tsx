import React, { useEffect, useRef, useState } from 'react';
import { useStore } from '../store/useStore';
import VectorStarMap from './VectorStarMap';
import SidebarControls from './SidebarControls';

const MainLayout: React.FC = () => {
    const { printSize, previewZoom, setPreviewZoom } = useStore();
    const containerRef = useRef<HTMLDivElement>(null);
    const [previewDimensions, setPreviewDimensions] = useState({ width: 0, height: 0 });

    useEffect(() => {
        const updateDimensions = () => {
            if (!containerRef.current) return;

            const container = containerRef.current;
            const containerWidth = container.clientWidth;
            const containerHeight = container.clientHeight;

            const [w, h] = printSize.ratio.split('/').map(Number);
            const ratio = w / h;

            // Calculate dimensions that fit within container while maintaining exact ratio
            let width = containerWidth * 0.85;
            let height = width / ratio;

            if (height > containerHeight * 0.85) {
                height = containerHeight * 0.85;
                width = height * ratio;
            }

            setPreviewDimensions({ width, height });
        };

        updateDimensions();
        window.addEventListener('resize', updateDimensions);
        return () => window.removeEventListener('resize', updateDimensions);
    }, [printSize.ratio]);

    const handleWheel = (e: React.WheelEvent) => {
        e.preventDefault();
        const delta = e.deltaY * -0.001;
        const newZoom = Math.min(Math.max(0.5, previewZoom + delta), 3.0);
        setPreviewZoom(newZoom);
    };

    return (
        <div className="flex h-screen overflow-hidden bg-neutral-50">
            {/* Left Side - Preview with zoom on entire frame */}
            <div
                ref={containerRef}
                className="flex-1 h-screen flex items-center justify-center bg-neutral-100 p-8"
                onWheel={handleWheel}
            >
                <div
                    id="poster-preview"
                    className="shadow-2xl bg-white"
                    style={{
                        width: `${previewDimensions.width}px`,
                        height: `${previewDimensions.height}px`,
                        maxWidth: '100%',
                        maxHeight: '100%',
                        transform: `scale(${previewZoom})`,
                        transformOrigin: 'center center',
                        transition: 'transform 0.2s ease-out'
                    }}
                >
                    <VectorStarMap />
                </div>
            </div>

            {/* Right Side - Controls */}
            <div className="w-96 bg-white overflow-y-auto shadow-xl z-10 border-l border-neutral-200">
                <SidebarControls />
            </div>
        </div>
    );
};

export default MainLayout;
