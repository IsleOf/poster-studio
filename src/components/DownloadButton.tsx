import React, { useState } from 'react';
import { Button, useToast } from '@chakra-ui/react';
import { useStore } from '../store/useStore';
import { renderPosterToBlob } from '../utils/renderPoster';

const DownloadButton: React.FC = () => {
    const { printSize, title } = useStore();
    const [isExporting, setIsExporting] = useState(false);
    const toast = useToast();

    const handleDownload = async () => {
        const svgEl = document.getElementById('poster-preview')?.querySelector('svg') as SVGSVGElement | null;
        if (!svgEl) return;

        setIsExporting(true);
        try {
            const blob = await renderPosterToBlob(svgEl, printSize.width, printSize.height, 300, true);
            const filename = `${title.replace(/\s+/g, '-').toLowerCase()}-demo-${Date.now()}.png`;
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = filename;
            a.click();
            URL.revokeObjectURL(url);
            toast({ title: 'Download started', description: filename, status: 'success', duration: 3000, isClosable: true });
        } catch (err) {
            console.error('Export failed:', err);
            toast({ title: 'Export failed', status: 'error', duration: 3000, isClosable: true });
        } finally {
            setIsExporting(false);
        }
    };

    return (
        <Button
            onClick={handleDownload}
            isLoading={isExporting}
            loadingText="Generating..."
            bg="gray.900"
            color="white"
            size="lg"
            width="full"
            borderRadius="md"
            fontWeight="700"
            fontSize="sm"
            _hover={{ bg: 'gray.800' }}
            _active={{ bg: 'gray.700' }}
            border="1px solid"
            borderColor="gray.900"
        >
            Download Demo (300 DPI)
        </Button>
    );
};

export default DownloadButton;
