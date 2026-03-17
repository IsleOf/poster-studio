import React, { useState } from 'react';
import html2canvas from 'html2canvas';
import { Download, Loader2 } from 'lucide-react';
import { useStore } from '../store/useStore';

const DownloadButton: React.FC = () => {
    const { printSize, title } = useStore();
    const [isExporting, setIsExporting] = useState(false);

    const handleDownload = async () => {
        const element = document.getElementById('poster-preview');
        if (!element) return;

        setIsExporting(true);

        try {
            // 300 DPI Calculation
            const dpi = 300;
            // Convert inches to pixels: width * dpi
            const pixelsWidth = printSize.width * dpi;
            const currentPreviewDivWidth = element.offsetWidth;
            const scaleFactor = pixelsWidth / currentPreviewDivWidth;

            const canvas = await html2canvas(element, {
                scale: scaleFactor,
                useCORS: true, // For external images (if any)
                backgroundColor: null, // Preserve transparency if needed, or use store color
                logging: false,
            });

            const link = document.createElement('a');
            link.download = `${title.replace(/\s+/g, '-').toLowerCase()}-star-poster.jpg`;
            link.href = canvas.toDataURL('image/jpeg', 0.95); // JPEG with 95% quality
            link.click();
        } catch (error) {
            console.error('Export failed:', error);
        } finally {
            setIsExporting(false);
        }
    };

    return (
        <button
            onClick={handleDownload}
            disabled={isExporting}
            className="w-full py-4 px-6 bg-white hover:bg-gray-100 text-gray-900 rounded-xl font-bold text-lg shadow-lg hover:shadow-xl transition-all flex items-center justify-center gap-3 disabled:opacity-70 disabled:cursor-not-allowed"
        >
            {isExporting ? (
                <>
                    Exporting High-Res...
                </>
            ) : (
                <>
                    Download Poster
                </>
            )}
        </button>
    );
};

export default DownloadButton;
