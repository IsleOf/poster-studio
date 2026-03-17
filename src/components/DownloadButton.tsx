import React, { useState } from 'react';
import { Button, useToast } from '@chakra-ui/react';
import { useStore } from '../store/useStore';

const DownloadButton: React.FC = () => {
    const { printSize, title } = useStore();
    const [isExporting, setIsExporting] = useState(false);
    const toast = useToast();

    const handleDownload = async () => {
        const posterElement = document.getElementById('poster-preview');
        if (!posterElement) {
            console.error('poster-preview element not found');
            return;
        }

        const svgElement = posterElement.querySelector('svg');
        if (!svgElement) {
            console.error('SVG element not found');
            return;
        }

        setIsExporting(true);

        try {
            const viewBox = svgElement.getAttribute('viewBox');
            if (!viewBox) {
                throw new Error('SVG viewBox not found');
            }

            const dpi = 300;
            const outputWidth = printSize.width * dpi;
            const outputHeight = printSize.height * dpi;

            const svgClone = svgElement.cloneNode(true) as SVGSVGElement;
            svgClone.setAttribute('width', outputWidth.toString());
            svgClone.setAttribute('height', outputHeight.toString());

            const svgData = new XMLSerializer().serializeToString(svgClone);
            const svgBlob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
            const svgUrl = URL.createObjectURL(svgBlob);

            const img = new Image();
            img.onload = async () => {
                const canvas = document.createElement('canvas');
                canvas.width = outputWidth;
                canvas.height = outputHeight;
                const ctx = canvas.getContext('2d');

                if (!ctx) {
                    console.error('Could not get canvas context');
                    setIsExporting(false);
                    return;
                }

                ctx.drawImage(img, 0, 0, outputWidth, outputHeight);

                const imageData = canvas.toDataURL('image/png');
                const filename = `${title.replace(/\s+/g, '-').toLowerCase()}-${Date.now()}.png`;

                try {
                    const response = await fetch('http://localhost:3001/api/save-render', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ imageData, filename })
                    });

                    const result = await response.json();

                    if (result.success) {
                        toast({
                            title: "Render saved!",
                            description: `Saved to ${result.path}`,
                            status: "success",
                            duration: 5000,
                            isClosable: true,
                        });
                    } else {
                        throw new Error(result.error || 'Failed to save');
                    }
                } catch (error) {
                    console.error('Error saving to server:', error);
                    toast({
                        title: "Save failed",
                        description: "Make sure the save server is running.",
                        status: "error",
                        duration: 5000,
                        isClosable: true,
                    });
                }

                URL.revokeObjectURL(svgUrl);
                setIsExporting(false);
            };

            img.onerror = (error) => {
                console.error('Error loading SVG image:', error);
                URL.revokeObjectURL(svgUrl);
                setIsExporting(false);
            };

            img.src = svgUrl;
        } catch (error) {
            console.error('Export failed:', error);
            setIsExporting(false);
        }
    };

    return (
        <Button
            onClick={handleDownload}
            isLoading={isExporting}
            loadingText="Exporting..."
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
            Save Render
        </Button>
    );
};

export default DownloadButton;
