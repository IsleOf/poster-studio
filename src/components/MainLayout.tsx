import React, { useEffect, useRef, useState, useCallback } from 'react';
import {
    Box, Flex, Slider, SliderTrack, SliderFilledTrack, SliderThumb,
    Text, VStack, HStack, Button,
} from '@chakra-ui/react';
import { useStore } from '../store/useStore';
import VectorStarMap from './VectorStarMap';
import SidebarControls from './SidebarControls';
import StreetMapCapture from './StreetMapCapture';

const MainLayout: React.FC = () => {
    const containerRef = useRef<HTMLDivElement>(null);
    const {
        previewZoom, setPreviewZoom,
        previewPanX, setPreviewPanX,
        previewPanY, setPreviewPanY,
        printSize,
        posterType,
        setMapBackgroundImage,
        isInlineEditing,
    } = useStore();

    const [previewDimensions, setPreviewDimensions] = useState({ width: 0, height: 0 });
    const [isDragging, setIsDragging] = useState(false);
    const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
    // Ref so window-level move handler always reads the current editing state (avoids stale closure)
    const isInlineEditingRef = useRef(false);
    useEffect(() => { isInlineEditingRef.current = isInlineEditing; }, [isInlineEditing]);

    // ── Street map capture ───────────────────────────────────────────────────
    // When the street map renders, it calls onCapture → we store the data-URL
    // which VectorStarMap uses as mapBackgroundImage inside the poster template.
    const handleMapCapture = useCallback((dataUrl: string) => {
        setMapBackgroundImage(dataUrl);
    }, [setMapBackgroundImage]);

    // Clear background image when switching back to star map
    useEffect(() => {
        if (posterType === 'starmap') {
            setMapBackgroundImage(null);
        }
    }, [posterType, setMapBackgroundImage]);

    // ── Preview dimensions ───────────────────────────────────────────────────
    useEffect(() => {
        const updateDimensions = () => {
            if (containerRef.current) {
                const { clientWidth, clientHeight } = containerRef.current;
                const padding = 80;
                const availableWidth = clientWidth - padding * 2;
                const availableHeight = clientHeight - padding * 2;
                const aspectRatio = printSize.width / printSize.height;
                let width: number, height: number;
                if (availableWidth / availableHeight > aspectRatio) {
                    height = availableHeight;
                    width = height * aspectRatio;
                } else {
                    width = availableWidth;
                    height = width / aspectRatio;
                }
                setPreviewDimensions({ width, height });
            }
        };
        updateDimensions();
        window.addEventListener('resize', updateDimensions);
        return () => window.removeEventListener('resize', updateDimensions);
    }, [printSize]);

    // ── Zoom / Pan ───────────────────────────────────────────────────────────
    const handleWheel = (e: React.WheelEvent) => {
        if (e.ctrlKey || e.metaKey) {
            e.preventDefault();
            e.stopPropagation();
            const delta = e.deltaY * -0.005;
            setPreviewZoom(Math.min(Math.max(0.5, previewZoom + delta), 3));
        }
    };

    const handleMouseDown = (e: React.MouseEvent) => {
        if (e.button === 0 && !isInlineEditingRef.current) {
            setIsDragging(true);
            setDragStart({ x: e.clientX - previewPanX, y: e.clientY - previewPanY });
        }
    };

    useEffect(() => {
        const handleMouseMove = (e: MouseEvent) => {
            // Use ref — not closure state — so we always see current editing status
            if (isDragging && !isInlineEditingRef.current) {
                setPreviewPanX(e.clientX - dragStart.x);
                setPreviewPanY(e.clientY - dragStart.y);
            }
        };
        const handleMouseUp = () => setIsDragging(false);
        if (isDragging) {
            window.addEventListener('mousemove', handleMouseMove);
            window.addEventListener('mouseup', handleMouseUp);
        }
        return () => {
            window.removeEventListener('mousemove', handleMouseMove);
            window.removeEventListener('mouseup', handleMouseUp);
        };
    }, [isDragging, dragStart, setPreviewPanX, setPreviewPanY]);

    const handleDoubleClick = () => {
        setPreviewPanX(0);
        setPreviewPanY(0);
    };

    return (
        <Flex h="100vh" overflow="hidden" bg="gray.50">
            {/* ── Left: Preview ─────────────────────────────────────────── */}
            <Box
                ref={containerRef}
                flex="1"
                h="100vh"
                display="flex"
                alignItems="center"
                justifyContent="center"
                bg="gray.50"
                p={8}
                overflow="hidden"
                position="relative"
                onWheelCapture={handleWheel}
                onMouseDown={handleMouseDown}
                onDoubleClick={handleDoubleClick}
                cursor={isDragging ? 'grabbing' : 'grab'}
                userSelect="none"
            >
                {/* Zoom Controls */}
                <Box
                    position="absolute"
                    top={4}
                    right={4}
                    bg="white"
                    p={3}
                    borderRadius="md"
                    border="1px solid"
                    borderColor="gray.200"
                    boxShadow="sm"
                    minW="180px"
                    zIndex={100}
                >
                    <VStack spacing={2} align="stretch">
                        <HStack justify="space-between">
                            <Text fontSize="xs" fontWeight="600" color="gray.700">Zoom</Text>
                            <Text fontSize="xs" color="gray.500" fontWeight="600">
                                {Math.round(previewZoom * 100)}%
                            </Text>
                        </HStack>
                        <HStack spacing={1} mb={2}>
                            <Button size="xs" onClick={() => setPreviewZoom(Math.max(0.5, previewZoom - 0.1))}>-</Button>
                            <Slider flex="1" value={previewZoom} min={0.5} max={3.0} step={0.1}
                                onChange={setPreviewZoom} aria-label="zoom-slider">
                                <SliderTrack bg="gray.200">
                                    <SliderFilledTrack bg="gray.900" />
                                </SliderTrack>
                                <SliderThumb boxSize={3} borderColor="gray.300" borderWidth="1px" />
                            </Slider>
                            <Button size="xs" onClick={() => setPreviewZoom(Math.min(3.0, previewZoom + 0.1))}>+</Button>
                        </HStack>
                    </VStack>
                </Box>

                {/* Poster Preview */}
                <Box
                    id="poster-preview"
                    boxShadow="sm"
                    width={`${previewDimensions.width}px`}
                    height={`${previewDimensions.height}px`}
                    maxWidth="100%"
                    maxHeight="100%"
                    transform={`scale(${previewZoom}) translate(${previewPanX / previewZoom}px, ${previewPanY / previewZoom}px)`}
                    transformOrigin="center center"
                    transition={isDragging ? 'none' : 'transform 0.2s ease-out'}
                    bg="white"
                    border="1px solid"
                    borderColor="gray.200"
                    pointerEvents="none"
                >
                    {/* VectorStarMap is always rendered — it handles both modes via mapBackgroundImage */}
                    <VectorStarMap />
                </Box>

                {/* Offscreen street map renderer — captures high-res canvas snapshot */}
                {posterType !== 'starmap' && (
                    <Box
                        position="fixed"
                        top="-9999px"
                        left="-9999px"
                        width="1200px"
                        height="1200px"
                        pointerEvents="none"
                        aria-hidden
                    >
                        <StreetMapCapture onCapture={handleMapCapture} />
                    </Box>
                )}
            </Box>

            {/* ── Right: Controls ───────────────────────────────────────── */}
            <Box
                w="400px"
                bg="white"
                overflowY="auto"
                borderLeft="1px"
                borderColor="gray.200"
                boxShadow="none"
                zIndex={10}
            >
                <SidebarControls />
            </Box>
        </Flex>
    );
};

export default MainLayout;
