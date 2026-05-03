import React, { useState } from 'react';
import {
    Button, Modal, ModalOverlay, ModalContent, ModalHeader,
    ModalBody, ModalFooter, ModalCloseButton, useDisclosure,
    VStack, HStack, Text, Box, Progress, Alert, AlertIcon,
    Link, Divider, Input, InputGroup, InputRightElement, IconButton,
    Tabs, TabList, TabPanels, Tab, TabPanel, Badge,
} from '@chakra-ui/react';
import { useStore } from '../store/useStore';
import { renderPosterToBlob, renderPosterToPdf } from '../utils/renderPoster';

const API_URL = import.meta.env.VITE_API_URL || '';

const DownloadButton: React.FC = () => {
    const {
        printSize, title, posterType, captureHighResFn, setMapBackgroundImage,
        selectedTemplateEtsyUrl, savedDesignToken, setSavedDesignToken,
        // design fields for save
        subtitle, date, time, location, lat, lng,
        starScale, lineWeight, gridWidth, glowIntensity, gridOpacity,
        showBorder, posterColor, textColor, starColor, mapInteriorColor,
        showFrame, frameInset, frameWidth, finelineWidth,
        circleSize, heartSize, houseSize, shapeOutlineWidth, shapeOffsetY, shapeOffsetX, snapEnabled,
        titleFontSize, subtitleFontSize, detailsFontSize, dedicationFontSize, namesFontSize,
        titleOffsetX, titleOffsetY, subtitleOffsetY, detailsOffsetY, dedicationOffsetY, namesOffsetY,
        heartDecorOffsetY, dividerOffsetY, showDivider, dividerLength, dividerThickness,
        showNames, titleAllCaps,
        showConstellations, showMilkyWay, showGrid, showLocation, showDate, showCoords,
        maskShape, isLightMode, designStyle, borderStyle,
        titleFont, subtitleFont, detailsFont, dedicationFont, namesFont,
        titleKerning, subtitleKerning, detailsKerning, dedicationKerning, namesKerning,
        customText, mapCity, mapCenterLat, mapCenterLng, mapZoom, mapBearing,
        mapBgColor, mapStreetColor, mapWaterColor, mapLandColor,
        mapMainRoadColor, mapSmallRoadColor, mapDetailRoadColor,
        mapColorPreset, mapStyleUrl,
        mapImageOffsetX, mapImageOffsetY, mapImageOpacity,
        showLocationPin, locationPinSize, locationPinOffsetX, locationPinOffsetY,
        selectedTemplate,
    } = useStore();
    const { isOpen, onOpen, onClose } = useDisclosure();
    const [progress, setProgress] = useState<'idle' | 'rendering' | 'done' | 'error'>('idle');
    const [pdfProgress, setPdfProgress] = useState<'idle' | 'rendering' | 'done' | 'error'>('idle');
    const [saveProgress, setSaveProgress] = useState<'idle' | 'saving' | 'done' | 'error'>('idle');
    const [errorMsg, setErrorMsg] = useState('');
    const [copied, setCopied] = useState(false);

    const isTemplateMode = !!selectedTemplateEtsyUrl;
    const isBusy = progress === 'rendering' || pdfProgress === 'rendering';

    const getSvgEl = () =>
        document.getElementById('poster-preview')?.querySelector('svg') as SVGSVGElement | null;

    /** Ensure the map background is captured at high-res before rendering */
    const ensureHighResMap = async () => {
        if (posterType !== 'starmap' && captureHighResFn) {
            try {
                const highResUrl = await captureHighResFn();
                setMapBackgroundImage(highResUrl);
                await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
            } catch (e) {
                console.warn('High-res map capture failed, using preview image:', e);
            }
        }
    };

    const handleDownload = async () => {
        const svgEl = getSvgEl();
        if (!svgEl) return;
        setProgress('rendering');
        try {
            await ensureHighResMap();
            const blob = await renderPosterToBlob(svgEl, printSize.width, printSize.height, 300, true);
            const slug = title.replace(/\s+/g, '-').toLowerCase() || 'poster';
            const a = document.createElement('a');
            a.href = URL.createObjectURL(blob);
            a.download = `${slug}-demo-${Date.now()}.png`;
            a.click();
            URL.revokeObjectURL(a.href);
            setProgress('done');
        } catch (err) {
            setErrorMsg(err instanceof Error ? err.message : 'Unknown error');
            setProgress('error');
        }
    };

    const handleDownloadPdf = async () => {
        const svgEl = getSvgEl();
        if (!svgEl) return;
        setPdfProgress('rendering');
        try {
            await ensureHighResMap();
            const blob = await renderPosterToPdf(svgEl, printSize.width, printSize.height, title);
            const slug = title.replace(/\s+/g, '-').toLowerCase() || 'poster';
            const a = document.createElement('a');
            a.href = URL.createObjectURL(blob);
            a.download = `${slug}-demo-${Date.now()}.pdf`;
            a.click();
            URL.revokeObjectURL(a.href);
            setPdfProgress('done');
        } catch (err) {
            setErrorMsg(err instanceof Error ? err.message : 'Unknown error');
            setPdfProgress('error');
        }
    };

    const handleSaveDesign = async () => {
        setSaveProgress('saving');
        try {
            const design = {
                title, subtitle,
                date: date instanceof Date ? date.toISOString() : date,
                time, location, lat, lng,
                starScale, lineWeight, gridWidth, glowIntensity, gridOpacity,
                showBorder, posterColor, textColor, starColor, mapInteriorColor,
                showFrame, frameInset, frameWidth, finelineWidth,
                circleSize, heartSize, houseSize, shapeOutlineWidth, shapeOffsetY, shapeOffsetX, snapEnabled,
                titleFontSize, subtitleFontSize, detailsFontSize, dedicationFontSize, namesFontSize,
                titleOffsetX, titleOffsetY, subtitleOffsetY, detailsOffsetY, dedicationOffsetY, namesOffsetY,
                heartDecorOffsetY, dividerOffsetY, showDivider, dividerLength, dividerThickness,
                showNames, titleAllCaps,
                showConstellations, showMilkyWay, showGrid, showLocation, showDate, showCoords,
                maskShape, isLightMode, designStyle, borderStyle,
                titleFont, subtitleFont, detailsFont, dedicationFont, namesFont,
                titleKerning, subtitleKerning, detailsKerning, dedicationKerning, namesKerning,
                customText, posterType, printSize,
                mapCity, mapCenterLat, mapCenterLng, mapZoom, mapBearing,
                mapBgColor, mapStreetColor, mapWaterColor, mapLandColor,
                mapMainRoadColor, mapSmallRoadColor, mapDetailRoadColor,
                mapColorPreset, mapStyleUrl,
                mapImageOffsetX, mapImageOffsetY, mapImageOpacity,
                showLocationPin, locationPinSize, locationPinOffsetX, locationPinOffsetY,
                selectedTemplate,
            };
            const res = await fetch(`${API_URL}/api/save-design`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ state: design }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Save failed');
            setSavedDesignToken(data.token);
            setSaveProgress('done');
        } catch (err) {
            console.error('Save failed:', err);
            setErrorMsg(err instanceof Error ? err.message : 'Unknown error');
            setSaveProgress('error');
        }
    };

    const handleCopyToken = () => {
        if (savedDesignToken) {
            navigator.clipboard.writeText(savedDesignToken).then(() => {
                setCopied(true);
                setTimeout(() => setCopied(false), 2000);
            });
        }
    };

    const handleOpen = () => {
        setProgress('idle');
        setPdfProgress('idle');
        setSaveProgress('idle');
        setErrorMsg('');
        onOpen();
    };

    return (
        <>
            <Button
                onClick={handleOpen}
                bg={isTemplateMode ? 'orange.500' : 'gray.900'}
                color="white"
                size="lg"
                width="full"
                borderRadius="md"
                fontWeight="700"
                fontSize="sm"
                _hover={{ bg: isTemplateMode ? 'orange.600' : 'gray.800' }}
                _active={{ bg: isTemplateMode ? 'orange.700' : 'gray.700' }}
                border="1px solid"
                borderColor={isTemplateMode ? 'orange.500' : 'gray.900'}
            >
                {isTemplateMode ? 'Save Design & Order' : 'Download Preview (300 DPI)'}
            </Button>

            <Modal isOpen={isOpen} onClose={onClose} size="md" isCentered>
                <ModalOverlay />
                <ModalContent borderRadius="lg" mx={4}>
                    <ModalHeader fontSize="md" fontWeight="700" pb={2}>
                        {isTemplateMode ? 'Save Your Design' : 'Download Your Design'}
                    </ModalHeader>
                    <ModalCloseButton />

                    <ModalBody>
                        {isTemplateMode ? (
                            /* ── Template mode: Save design → get token → go to Etsy ── */
                            <VStack align="stretch" spacing={4}>
                                {/* Step indicator */}
                                <HStack spacing={3} p={3} bg="orange.50" borderRadius="md" border="1px" borderColor="orange.200">
                                    <Box>
                                        <Text fontSize="sm" fontWeight="700" color="orange.800">
                                            How it works
                                        </Text>
                                        <Text fontSize="xs" color="orange.700" mt={0.5}>
                                            1. Save your design to get a unique code
                                            <br />2. Go to Etsy and complete your purchase
                                            <br />3. Paste your code in the order note — we'll use it to produce your exact design
                                        </Text>
                                    </Box>
                                </HStack>

                                {saveProgress === 'idle' && !savedDesignToken && (
                                    <Box>
                                        <Text fontSize="xs" color="gray.500" mb={3}>
                                            Your current design — title, location, date, colours and fonts — will be saved securely.
                                            You'll receive a short code to include with your Etsy order.
                                        </Text>
                                        <Button
                                            w="full"
                                            bg="orange.500"
                                            color="white"
                                            _hover={{ bg: 'orange.600' }}
                                            fontWeight="700"
                                            onClick={handleSaveDesign}
                                        >
                                            Save My Design
                                        </Button>
                                    </Box>
                                )}

                                {saveProgress === 'saving' && (
                                    <Box>
                                        <Text fontSize="xs" color="gray.500" mb={1}>Saving your design…</Text>
                                        <Progress size="xs" isIndeterminate colorScheme="orange" borderRadius="full" />
                                    </Box>
                                )}

                                {(saveProgress === 'done' || savedDesignToken) && (
                                    <VStack align="stretch" spacing={3}>
                                        <Alert status="success" borderRadius="md" fontSize="sm">
                                            <AlertIcon />
                                            Design saved! Copy your order code below.
                                        </Alert>

                                        <Box>
                                            <Text fontSize="xs" fontWeight="700" color="gray.700" mb={1}>
                                                Your Design Code
                                            </Text>
                                            <InputGroup size="md">
                                                <Input
                                                    value={savedDesignToken || ''}
                                                    isReadOnly
                                                    fontFamily="mono"
                                                    fontSize="lg"
                                                    fontWeight="700"
                                                    letterSpacing="0.15em"
                                                    bg="gray.50"
                                                    color="gray.900"
                                                    textAlign="center"
                                                    borderColor="orange.300"
                                                    _focus={{ borderColor: 'orange.400' }}
                                                />
                                                <InputRightElement>
                                                    <Button
                                                        size="sm"
                                                        h="1.75rem"
                                                        mr={1}
                                                        onClick={handleCopyToken}
                                                        colorScheme={copied ? 'green' : 'orange'}
                                                        variant="ghost"
                                                        fontSize="xs"
                                                    >
                                                        {copied ? '✓ Copied' : 'Copy'}
                                                    </Button>
                                                </InputRightElement>
                                            </InputGroup>
                                            <Text fontSize="xs" color="gray.400" mt={1}>
                                                Include this code in your Etsy order message
                                            </Text>
                                        </Box>

                                        <Button
                                            as={Link}
                                            href={selectedTemplateEtsyUrl!}
                                            isExternal
                                            w="full"
                                            bg="orange.500"
                                            color="white"
                                            _hover={{ bg: 'orange.600', textDecoration: 'none' }}
                                            fontWeight="700"
                                            fontSize="sm"
                                        >
                                            Go to Etsy Listing →
                                        </Button>
                                    </VStack>
                                )}

                                {saveProgress === 'error' && (
                                    <Alert status="error" borderRadius="md" fontSize="sm">
                                        <AlertIcon />
                                        {errorMsg || 'Save failed. Please try again.'}
                                    </Alert>
                                )}

                                <Divider />

                                {/* Secondary: demo download */}
                                <Box>
                                    <Text fontSize="xs" color="gray.500" mb={2}>
                                        Want to test your design first?
                                    </Text>
                                    <Button
                                        w="full"
                                        variant="outline"
                                        size="sm"
                                        onClick={handleDownload}
                                        isLoading={progress === 'rendering'}
                                        loadingText="Generating…"
                                    >
                                        Download Watermarked Preview
                                    </Button>
                                    {progress === 'done' && (
                                        <Text fontSize="xs" color="green.600" mt={1}>Demo downloaded!</Text>
                                    )}
                                    {progress === 'error' && (
                                        <Text fontSize="xs" color="red.500" mt={1}>Export failed: {errorMsg}</Text>
                                    )}
                                </Box>
                            </VStack>
                        ) : (
                            /* ── Standard mode: download preview ── */
                            <VStack align="stretch" spacing={4}>
                                <Alert status="info" borderRadius="md" fontSize="sm">
                                    <AlertIcon />
                                    <Box>
                                        <Text fontWeight="600">This is a watermarked preview</Text>
                                        <Text color="gray.600" fontSize="xs" mt={0.5}>
                                            The downloaded file will contain a light themappedmoment.com watermark. Purchase on Etsy to receive the full-resolution, watermark-free file.
                                        </Text>
                                    </Box>
                                </Alert>

                                <Box bg="gray.50" borderRadius="md" p={3} border="1px solid" borderColor="gray.200">
                                    <VStack align="stretch" spacing={1.5}>
                                        <HStack justify="space-between">
                                            <Text fontSize="xs" color="gray.500">Resolution</Text>
                                            <Text fontSize="xs" fontWeight="600">300 DPI (print quality)</Text>
                                        </HStack>
                                        <HStack justify="space-between">
                                            <Text fontSize="xs" color="gray.500">Format</Text>
                                            <Text fontSize="xs" fontWeight="600">PNG</Text>
                                        </HStack>
                                        <HStack justify="space-between">
                                            <Text fontSize="xs" color="gray.500">Print size</Text>
                                            <Text fontSize="xs" fontWeight="600">{printSize.label}</Text>
                                        </HStack>
                                        <HStack justify="space-between">
                                            <Text fontSize="xs" color="gray.500">Pixel dimensions</Text>
                                            <Text fontSize="xs" fontWeight="600">
                                                {Math.round(printSize.width * 300).toLocaleString()} × {Math.round(printSize.height * 300).toLocaleString()} px
                                            </Text>
                                        </HStack>
                                    </VStack>
                                </Box>

                                <Divider />
                                <Box textAlign="center">
                                    <Text fontSize="xs" color="gray.500" mb={1}>
                                        Want the watermark-free version?
                                    </Text>
                                    <Link
                                        href="https://www.etsy.com/shop/TheMappedMoment"
                                        isExternal
                                        fontSize="sm"
                                        fontWeight="600"
                                        color="orange.500"
                                        _hover={{ color: 'orange.600', textDecoration: 'underline' }}
                                    >
                                        Order on Etsy →
                                    </Link>
                                </Box>

                                {progress === 'rendering' && (
                                    <Box>
                                        <Text fontSize="xs" color="gray.500" mb={1}>Generating 300 DPI image…</Text>
                                        <Progress size="xs" isIndeterminate colorScheme="gray" borderRadius="full" />
                                    </Box>
                                )}
                                {progress === 'done' && (
                                    <Alert status="success" borderRadius="md" fontSize="sm">
                                        <AlertIcon />
                                        Download started! Check your downloads folder.
                                    </Alert>
                                )}
                                {progress === 'error' && (
                                    <Alert status="error" borderRadius="md" fontSize="sm">
                                        <AlertIcon />
                                        Export failed: {errorMsg}
                                    </Alert>
                                )}
                            </VStack>
                        )}
                    </ModalBody>

                    <ModalFooter pt={2} gap={2}>
                        <Button variant="ghost" size="sm" onClick={onClose}>Close</Button>
                        {!isTemplateMode && (
                            <Button
                                onClick={handleDownload}
                                isLoading={progress === 'rendering'}
                                isDisabled={isBusy}
                                loadingText="Generating…"
                                bg="gray.900"
                                color="white"
                                size="sm"
                                fontWeight="600"
                                _hover={{ bg: 'gray.800' }}
                            >
                                PNG
                            </Button>
                        )}
                    </ModalFooter>
                </ModalContent>
            </Modal>
        </>
    );
};

export default DownloadButton;
