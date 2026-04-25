import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { PRINT_SIZE_MAP, fetchAndApplyTemplate } from '../utils/applyTemplate';
import type { DesignGroup } from '../types/listing';
import { trackEvent } from '../utils/analytics';
import { useStore } from '../store/useStore';
import TextContentPanel from './sidebar/TextContentPanel';
import TypographyPanel from './sidebar/TypographyPanel';
import MapControlsPanel from './sidebar/MapControlsPanel';
import ColorPanel from './sidebar/ColorPanel';
import StylePanel from './sidebar/StylePanel';
import { toggleButtonStyles } from './sidebar/sidebarStyles';
import DownloadButton from './DownloadButton';
import { renderPosterToBlob } from '../utils/renderPoster';
import { useToast } from '@chakra-ui/react';
import {
    Box,
    VStack,
    HStack,
    Text,
    Input,
    Button,
    Accordion,
    AccordionItem,
    AccordionButton,
    AccordionPanel,
    AccordionIcon,
    Slider,
    SliderTrack,
    SliderFilledTrack,
    SliderThumb,
    Grid,
    Switch,
    FormControl,
    FormLabel,
} from '@chakra-ui/react';


export interface EditorSibling {
    id: string;
    name: string;
    fulfillment_size: string;
}

interface SidebarProps {
    designGroups?: DesignGroup[];
    editorSiblings?: EditorSibling[];
    onSiblingSwitch?: (siblingId: string) => void;
}

const SidebarControls: React.FC<SidebarProps> = ({ designGroups, editorSiblings, onSiblingSwitch }) => {
    const {
        title, setTitle,
        subtitle, setSubtitle,
        date, setDate,
        location, setLocation,
        setLat, setLng,
        time, setTime,
        starScale, setStarScale,
        lineWeight, setLineWeight,
        gridWidth, setGridWidth,
        glowIntensity, setGlowIntensity,
        gridOpacity, setGridOpacity,
        showBorder, setShowBorder,
        showConstellations, setShowConstellations,
        showMilkyWay, setShowMilkyWay,
        showGrid, setShowGrid,
        designStyle, setDesignStyle,
        maskShape, setMaskShape,
        isLightMode, setIsLightMode,
        showLocation, setShowLocation,
        showDate, setShowDate,
        showCoords, setShowCoords,
        printSize, setPrintSize,
        customText, setCustomText,
        circleSize, setCircleSize,
        heartSize, setHeartSize,
        houseSize, setHouseSize,
        shapeOffsetY, setShapeOffsetY,
        shapeOffsetX, setShapeOffsetX,
        snapEnabled, setSnapEnabled,
        titleFontSize, setTitleFontSize,
        subtitleFontSize, setSubtitleFontSize,
        detailsFontSize, setDetailsFontSize,
        dedicationFontSize, setDedicationFontSize,
        titleOffsetX, setTitleOffsetX,
        titleOffsetY, setTitleOffsetY,
        subtitleOffsetY, setSubtitleOffsetY,
        detailsOffsetY, setDetailsOffsetY,
        dedicationOffsetY, setDedicationOffsetY,
        shapeOutlineWidth, setShapeOutlineWidth,
        showFrame, setShowFrame,
        frameInset, setFrameInset,
        frameWidth, setFrameWidth,
        finelineWidth, setFinelineWidth,
        titleFont, setTitleFont,
        titleKerning, setTitleKerning,
        titleAllCaps, setTitleAllCaps,
        subtitleFont, setSubtitleFont,
        subtitleKerning, setSubtitleKerning,
        detailsFont, setDetailsFont,
        detailsKerning, setDetailsKerning,
        dedicationFont, setDedicationFont,
        dedicationKerning, setDedicationKerning,
        showNames, setShowNames,
        namesFont, setNamesFont,
        namesFontSize, setNamesFontSize,
        namesOffsetY, setNamesOffsetY,
        namesKerning, setNamesKerning,
        showDivider, setShowDivider,
        dividerLength, setDividerLength,
        dividerThickness, setDividerThickness,
        dividerOffsetY, setDividerOffsetY,
        selectedTemplate, setSelectedTemplate,
        activeDesignGroupId, setActiveDesignGroupId,
        mapBackgroundImage, setMapBackgroundImage,
        borderStyle, setBorderStyle,
        setPosterColor, setTextColor, setStarColor, setMapInteriorColor,
        mapInteriorColor, posterColor, textColor, starColor,
        saveTemplateSettings, restoreTemplateSettings, templateSettings,
        saveTemplateDefaults, loadTemplateDefaults,
        // Street map / poster type
        posterType, setPosterType,
        mapCity, setMapCity,
        mapCenterLat, setMapCenterLat,
        mapCenterLng, setMapCenterLng,
        mapZoom, setMapZoom,
        mapBgColor, setMapBgColor,
        mapStreetColor, setMapStreetColor,
        mapColorPreset, setMapColorPreset,
        setMapStyleUrl,
        activeTypoField, setActiveTypoField, typoFieldVersion,
        showLocationPin, setShowLocationPin,
        locationPinSize, setLocationPinSize,
        locationPinOffsetX, locationPinOffsetY,
        setLocationPinOffsetX, setLocationPinOffsetY,
        mapBearing, setMapBearing,
        mapImageOpacity, setMapImageOpacity,
    } = useStore();

    const toast = useToast();
    const navigate = useNavigate();
    const { slug: listingSlug } = useParams<{ slug?: string }>();

    // Derive a short, URL-safe slug from a design_group_id. Examples:
    //   "sm001-design002" → "design002"
    //   "sm001-design-night-we-met" → "design-night-we-met"
    //   "design002" → "design002"
    const designGroupSlug = useCallback((groupId: string) => {
        const lower = groupId.toLowerCase();
        const m = lower.match(/(?:^|-)(design[\w-]*)$/);
        return m ? m[1] : lower;
    }, []);
    // Typography tab — syncs when user clicks a text element in the poster
    const [typoTab, setTypoTab] = useState<'title' | 'subtitle' | 'details' | 'dedication' | 'names'>('title');
    const typoButtonRef = useRef<HTMLButtonElement>(null);

    useEffect(() => {
        if (!activeTypoField) return;
        setTypoTab(activeTypoField);
        setTimeout(() => {
            if (typoButtonRef.current) {
                typoButtonRef.current.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
                if (typoButtonRef.current.getAttribute('aria-expanded') === 'false') {
                    typoButtonRef.current.click();
                }
            }
        }, 50);
    // typoFieldVersion ensures this fires even when clicking the same element twice
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [typoFieldVersion]);

    return (
        <Box w="full" h="full" bg="white" display="flex" flexDirection="column">
            {/* Header */}
            <Box px={6} py={4} borderBottom="1px" borderColor="gray.200">
                <HStack justify="space-between" align="center">
                    <Text fontSize="xl" fontWeight="bold" letterSpacing="tight">THE MAPPED MOMENT</Text>
                    <Button size="xs" variant="ghost" color="gray.500" _hover={{ color: 'gray.900' }}
                        onClick={() => navigate('/gallery')} title="Browse template gallery">
                        Gallery
                    </Button>
                </HStack>
            </Box>

            <Box flex="1" overflowY="auto">

                {/* ── Designs (listing mode) ───────────────────────────── */}
                {designGroups && designGroups.length > 0 && (() => {
                    const API = import.meta.env.VITE_API_URL || '';
                    // Use the stored active group ID — set explicitly when user clicks a design.
                    // Falls back to first group on initial load.
                    const activeGroupId = (activeDesignGroupId && designGroups.some(g => g.id === activeDesignGroupId))
                        ? activeDesignGroupId
                        : designGroups[0].id;
                    const activeGroup = designGroups.find(g => g.id === activeGroupId) ?? designGroups[0];

                    return (
                        <Accordion allowToggle allowMultiple defaultIndex={[0, 1]}>
                            {/* Design selector — one card per design group */}
                            <AccordionItem border="none" borderBottom="1px" borderColor="gray.200">
                                <h2>
                                    <AccordionButton _expanded={{ bg: 'gray.50' }} py={4} px={6}>
                                        <Box flex="1" textAlign="left" fontWeight="600" fontSize="sm" color="gray.900">
                                            Design
                                        </Box>
                                        <AccordionIcon color="gray.400" />
                                    </AccordionButton>
                                </h2>
                                <AccordionPanel pb={4} px={4}>
                                    <Box display="grid" gridTemplateColumns={`repeat(${Math.min(designGroups.length, 3)}, 1fr)`} gap={3}>
                                        {designGroups.map((group) => {
                                            // Always use 8x10 as the thumbnail representative — consistent 4:5 ratio across all designs
                                            const thumbSize = group.sizes.find(sz => sz.fulfillment_size === '8x10') ?? group.sizes[0];
                                            const isActive = group.id === activeGroupId;
                                            return (
                                                <Box
                                                    key={group.id}
                                                    cursor="pointer"
                                                    borderRadius="lg"
                                                    overflow="hidden"
                                                    border="2px solid"
                                                    borderColor={isActive ? 'gray.900' : 'gray.200'}
                                                    _hover={{ borderColor: 'gray.500' }}
                                                    transition="border-color 0.15s"
                                                    onClick={() => {
                                                        // Set active group immediately so border highlights before fetch completes
                                                        setActiveDesignGroupId(group.id);
                                                        // Load the matching size for this group (prefer current printSize, fallback to first)
                                                        const matchingSize = group.sizes.find(sz => {
                                                            const so = PRINT_SIZE_MAP[sz.fulfillment_size || ''] || PRINT_SIZE_MAP['8x10'];
                                                            return so.label === printSize.label;
                                                        }) ?? group.sizes[0];
                                                        if (matchingSize) fetchAndApplyTemplate(matchingSize.id, { designGroupId: group.id });
                                                        // Reflect the active design in the URL (replace, don't push — back button stays useful)
                                                        if (listingSlug) {
                                                            const ds = designGroupSlug(group.id);
                                                            navigate(`/l/${listingSlug}/${ds}`, { replace: true });
                                                            trackEvent('design_select', { slug: listingSlug, designGroupId: group.id });
                                                        }
                                                    }}
                                                >
                                                    <Box
                                                        as="img"
                                                        src={thumbSize?.thumbnail_path
                                                            ? `${API}${thumbSize.thumbnail_path}?v=3`
                                                            : `${API}/api/templates/${thumbSize?.id ?? group.sizes[0]?.id}/thumbnail`}
                                                        alt={group.name}
                                                        w="100%"
                                                        display="block"
                                                        style={{ aspectRatio: '4/5', objectFit: 'cover' }}
                                                    />
                                                    <Box px={1.5} py={1.5} bg="white">
                                                        <Text fontSize="11px" fontWeight="600" color={isActive ? 'gray.900' : 'gray.500'} textAlign="center">
                                                            {group.name}
                                                        </Text>
                                                    </Box>
                                                </Box>
                                            );
                                        })}
                                    </Box>
                                </AccordionPanel>
                            </AccordionItem>

                            {/* Size selector — sizes for active design group */}
                            <AccordionItem border="none" borderBottom="1px" borderColor="gray.200">
                                <h2>
                                    <AccordionButton _expanded={{ bg: 'gray.50' }} py={4} px={6}>
                                        <Box flex="1" textAlign="left" fontWeight="600" fontSize="sm" color="gray.900">
                                            Size
                                        </Box>
                                        <AccordionIcon color="gray.400" />
                                    </AccordionButton>
                                </h2>
                                <AccordionPanel pb={4} px={6}>
                                    <Grid templateColumns="repeat(2, 1fr)" gap={3}>
                                        {activeGroup.sizes.map((sz) => {
                                            const sizeObj = PRINT_SIZE_MAP[sz.fulfillment_size || ''] || PRINT_SIZE_MAP['8x10'];
                                            const isActive = printSize.label === sizeObj.label;
                                            return (
                                                <Button
                                                    key={sz.id}
                                                    onClick={() => fetchAndApplyTemplate(sz.id, { preserveText: true, designGroupId: activeGroupId })}
                                                    {...toggleButtonStyles(isActive)}
                                                    flexDirection="column"
                                                    h="auto"
                                                    py={2}
                                                >
                                                    <Text fontSize="sm">{sizeObj.label}</Text>
                                                </Button>
                                            );
                                        })}
                                    </Grid>
                                </AccordionPanel>
                            </AccordionItem>
                        </Accordion>
                    );
                })()}

                {/* ── Templates (hidden in listing mode) ──────────────── */}
                {!(designGroups && designGroups.length > 0) && <Accordion allowToggle allowMultiple defaultIndex={[0]}>
                    <AccordionItem border="none" borderBottom="1px" borderColor="gray.200">
                        <h2>
                            <AccordionButton _expanded={{ bg: 'gray.50' }} py={4} px={6}>
                                <Box flex="1" textAlign="left" fontWeight="600" fontSize="sm" color="gray.900">
                                    Templates
                                </Box>
                                <AccordionIcon color="gray.400" />
                            </AccordionButton>
                        </h2>
                        <AccordionPanel pb={6} px={6}>
                            <Grid templateColumns="repeat(3, 1fr)" gap={3}>
                                {[
                                    { id: 'classic-dark', label: 'Classic Dark', bg: '#1B2735', text: '#ffffff', shape: 'circle', border: 'simple', mapBg: null, font: 'Lato' },
                                    { id: 'love-dark', label: 'Love Dark', bg: '#0f172a', text: '#ffffff', shape: 'heart', border: 'simple', mapBg: null, font: 'Great Vibes' },
                                    { id: 'modern-white', label: 'Modern White', bg: '#ffffff', text: '#000000', shape: 'circle', border: 'double-offset', mapBg: null, font: 'Great Vibes' },
                                    { id: 'home-street', label: 'Home Street', bg: '#ffffff', text: '#111111', shape: 'house', border: 'simple', mapBg: null, font: 'Cinzel' },
                                    { id: 'design2-bw', label: 'Rectangle', bg: '#ffffff', text: '#111111', shape: 'rect', border: 'none', mapBg: null, font: 'Lato' },
                                ].map((template) => (
                                    <VStack key={template.id} as="div" spacing={2}>
                                        <Box
                                            as="button" w="full" h={24} bg={template.bg}
                                            borderRadius="md" borderWidth={2}
                                            borderColor={selectedTemplate === template.id ? 'blue.500' : 'gray.200'}
                                            position="relative" overflow="hidden"
                                            _hover={{ borderColor: 'blue.400', cursor: 'pointer' }}
                                            display="flex" alignItems="center" justifyContent="center"
                                            onClick={() => {
                                                saveTemplateSettings(selectedTemplate);
                                                setSelectedTemplate(template.id);
                                                const customDefaults = loadTemplateDefaults(template.id);
                                                if (customDefaults) {
                                                    Object.keys(customDefaults).forEach(key => {
                                                        const setter = `set${key.charAt(0).toUpperCase()}${key.slice(1)}` as any;
                                                        if (typeof (useStore.getState() as any)[setter] === 'function') {
                                                            (useStore.getState() as any)[setter](customDefaults[key as keyof typeof customDefaults]);
                                                        }
                                                    });
                                                } else if (templateSettings[template.id]) {
                                                    restoreTemplateSettings(template.id);
                                                } else {
                                                    setPosterColor(template.bg);
                                                    setMapInteriorColor(template.id === 'modern-white' ? '#1B2735' : template.bg);
                                                    setTextColor(template.text);
                                                    setMaskShape(template.shape as any);
                                                    setBorderStyle(template.border as any);
                                                    setMapBackgroundImage(template.mapBg);
                                                    if (template.id === 'modern-white') {
                                                        setIsLightMode(false); setStarColor('#ffffff'); setShowFrame(true); setFrameWidth(1); setFrameInset(20); setShowBorder(true); setShapeOutlineWidth(1.5); setStarScale(1.6); setLineWeight(0.8); setTitleFontSize(56); setSubtitleFontSize(16); setDetailsFontSize(12); setDedicationFontSize(13); setTitleOffsetX(0); setTitleOffsetY(0); setSubtitleOffsetY(0); setDetailsOffsetY(0); setDedicationOffsetY(0); setSubtitleFont('DM Sans'); setDetailsFont('DM Sans'); setDedicationFont('Cormorant Garamond'); setTitleFont('Cormorant Garamond'); setShowDivider(true);
                                                    } else if (template.id === 'love-dark') {
                                                        setIsLightMode(false); setStarColor('#ffffff'); setShowFrame(true); setFrameWidth(5); setShapeOutlineWidth(2); setStarScale(1.9); setLineWeight(1.0); setTitleFontSize(48); setTitleOffsetX(0); setTitleOffsetY(0); setSubtitleOffsetY(0); setDetailsOffsetY(0); setSubtitleFont('Lato'); setDetailsFont('Lato'); setTitleFont('Playfair Display');
                                                    } else if (template.id === 'home-street') {
                                                        setPosterType('coloredmap'); setIsLightMode(false); setShowFrame(true); setFrameWidth(3); setFrameInset(16); setShapeOutlineWidth(3); setTitleFontSize(52); setSubtitleFontSize(14); setDetailsFontSize(12); setDedicationFontSize(13); setTitleOffsetX(0); setTitleOffsetY(0); setSubtitleOffsetY(0); setDetailsOffsetY(0); setDedicationOffsetY(0); setSubtitleFont('DM Sans'); setDetailsFont('DM Sans'); setDedicationFont('DM Sans'); setTitleFont('Cinzel'); setShowDivider(true); setMapBgColor('#f8f4f0'); setMapStreetColor('#fc8'); setPosterColor('#ffffff'); setTextColor('#1a1a1a'); setMapColorPreset('realistic'); setMapStyleUrl('https://tiles.openfreemap.org/styles/bright');
                                                    } else if (template.id === 'design2-bw') {
                                                        setPosterType('streetmap'); setIsLightMode(true); setMaskShape('rect'); setBorderStyle('simple'); setShowBorder(false); setShowFrame(false); setShapeOutlineWidth(0); setPosterColor('#ffffff'); setTextColor('#111111'); setMapColorPreset('design2'); setMapStyleUrl(null); setMapBgColor('#ffffff'); setMapStreetColor('#111111'); setShowLocationPin(true); setLocationPinSize(32); setTitleFont('Mapped2'); setSubtitleFont('Mapped2'); setDetailsFont('Mapped2'); setDedicationFont('Mapped2'); setTitleFontSize(72); setSubtitleFontSize(22); setDetailsFontSize(18); setDedicationFontSize(16); setTitleOffsetX(0); setTitleOffsetY(0); setSubtitleOffsetY(0); setDetailsOffsetY(0); setDedicationOffsetY(0); setShowDivider(false); setCustomText('title', 'Jessica & Michael'); setCustomText('subtitle', 'THE VENUE NAME'); setCustomText('location', '52.9540° N, 1.1550° W'); setCustomText('date', '25TH AUGUST 2025'); setCustomText('dedication', 'LIFE IS AN ADVENTURE WITH YOU...');
                                                    } else {
                                                        setIsLightMode(false); setStarColor('#ffffff'); setShowFrame(true); setFrameWidth(5); setShapeOutlineWidth(2); setStarScale(1.5); setTitleFontSize(48); setTitleOffsetX(0); setTitleOffsetY(0); setSubtitleOffsetY(0); setDetailsOffsetY(0); setSubtitleFont('Lato'); setDetailsFont('Lato'); setTitleFont('Lato');
                                                    }
                                                }
                                            }}
                                        >
                                            <Box w={16} h={16}
                                                bg={template.id === 'modern-white' ? '#CBD5E0' : template.id === 'home-street' ? '#CBD5E0' : template.id === 'design2-bw' ? '#111111' : (template.mapBg ? `url(${template.mapBg})` : (template.bg === '#ffffff' ? '#000' : '#fff'))}
                                                backgroundSize="cover"
                                                borderRadius={template.shape === 'circle' ? 'full' : 'none'}
                                                opacity={0.9} pointerEvents="none"
                                                style={{ clipPath: template.shape === 'heart' ? 'path("M32 56.93l-3.86-3.52C14.4 40.96 5.33 32.75 5.33 22.67 5.33 14.45 11.78 8 20 8c4.64 0 9.09 2.16 12 5.57C34.91 10.16 39.36 8 44 8c8.22 0 14.67 6.45 14.67 14.67 0 10.08-9.07 18.29-22.8 30.77L32 56.93z")' : template.shape === 'house' ? 'polygon(20% 90%, 20% 40%, 10% 40%, 50% 0%, 60% 10%, 60% 2%, 70% 2%, 70% 20%, 90% 40%, 80% 40%, 80% 90%)' : undefined }}
                                            />
                                        </Box>
                                        <VStack w="full" spacing={1}>
                                            <Button w="full" size="xs" variant="outline"
                                                borderColor={selectedTemplate === template.id ? 'blue.500' : 'gray.300'}
                                                color={selectedTemplate === template.id ? 'blue.600' : 'gray.700'}
                                                _hover={{ borderColor: 'blue.400', bg: 'blue.50' }}
                                                onClick={() => {
                                                    saveTemplateSettings(selectedTemplate);
                                                    setSelectedTemplate(template.id);
                                                    const customDefaults = loadTemplateDefaults(template.id);
                                                    if (customDefaults) {
                                                        Object.keys(customDefaults).forEach(key => {
                                                            const value = customDefaults[key as keyof typeof customDefaults];
                                                            if (value !== undefined) {
                                                                const setter = `set${key.charAt(0).toUpperCase()}${key.slice(1)}`;
                                                                // @ts-ignore
                                                                if (typeof useStore.getState()[setter] === 'function') { // @ts-ignore
                                                                    useStore.getState()[setter](value);
                                                                }
                                                            }
                                                        });
                                                    } else if (templateSettings[template.id]) {
                                                        restoreTemplateSettings(template.id);
                                                    } else {
                                                        setPosterColor(template.bg); setMapInteriorColor(template.bg); setTextColor(template.text); setMaskShape(template.shape as any); setBorderStyle(template.border as any); setMapBackgroundImage(template.mapBg); setTitleFont(template.font);
                                                        if (template.id === 'modern-white') {
                                                            setIsLightMode(false); setStarColor('#ffffff'); setShowFrame(true); setFrameWidth(1); setFrameInset(20); setShowBorder(true); setShapeOutlineWidth(1.5); setStarScale(1.6); setLineWeight(0.8); setTitleFontSize(56); setSubtitleFontSize(16); setDetailsFontSize(12); setDedicationFontSize(13); setTitleOffsetX(0); setTitleOffsetY(0); setSubtitleOffsetY(0); setDetailsOffsetY(0); setDedicationOffsetY(0); setSubtitleFont('DM Sans'); setDetailsFont('DM Sans'); setDedicationFont('Cormorant Garamond'); setTitleFont('Cormorant Garamond');
                                                        } else if (template.id === 'love-dark') {
                                                            setIsLightMode(false); setStarColor('#ffffff'); setShowFrame(true); setFrameWidth(5); setShapeOutlineWidth(2); setStarScale(1.9); setLineWeight(1.0); setTitleFontSize(48); setTitleOffsetX(0); setTitleOffsetY(0); setSubtitleOffsetY(0); setDetailsOffsetY(0); setSubtitleFont('Lato'); setDetailsFont('Lato'); setTitleFont('Playfair Display');
                                                        } else if (template.id === 'home-street') {
                                                            setPosterType('streetmap'); setIsLightMode(false); setShowFrame(true); setFrameWidth(3); setFrameInset(16); setShapeOutlineWidth(3); setTitleFontSize(52); setSubtitleFontSize(14); setDetailsFontSize(12); setDedicationFontSize(13); setTitleOffsetX(0); setTitleOffsetY(0); setSubtitleOffsetY(0); setDetailsOffsetY(0); setDedicationOffsetY(0); setSubtitleFont('DM Sans'); setDetailsFont('DM Sans'); setDedicationFont('DM Sans'); setTitleFont('Cinzel'); setShowDivider(true); setMapBgColor('#f8f4f0'); setMapStreetColor('#fc8'); setPosterColor('#ffffff'); setTextColor('#1a1a1a'); setMapColorPreset('realistic'); setMapStyleUrl('https://tiles.openfreemap.org/styles/bright');
                                                        } else {
                                                            setIsLightMode(false); setStarColor('#ffffff'); setShowFrame(true); setFrameWidth(5); setShapeOutlineWidth(2); setStarScale(1.5); setTitleFontSize(48); setTitleOffsetX(0); setTitleOffsetY(0); setSubtitleOffsetY(0); setDetailsOffsetY(0); setSubtitleFont('Lato'); setDetailsFont('Lato'); setTitleFont('Lato');
                                                        }
                                                    }
                                                }}
                                            >
                                                <Text fontSize="xs" fontWeight="600">{template.label}</Text>
                                            </Button>
                                            <Button w="full" size="xs" colorScheme="green" variant="ghost" fontSize="10px"
                                                onClick={(e) => { e.stopPropagation(); saveTemplateDefaults(template.id); alert(`Saved current settings as default for ${template.label}`); }}
                                            >
                                                💾 Save as Default
                                            </Button>
                                        </VStack>
                                    </VStack>
                                ))}
                            </Grid>
                        </AccordionPanel>
                    </AccordionItem>
                </Accordion>}

                {/* ── Poster Type Toggle — hidden in listing/customer mode ── */}
                {!(designGroups && designGroups.length > 0) && <Box px={6} py={4} borderBottom="1px" borderColor="gray.200">
                    <HStack spacing={1}>
                        <Button size="sm" flex={1}
                            onClick={() => { setPosterType('starmap'); trackEvent('poster_type_change', { type: 'starmap' }); }}
                            bg={posterType === 'starmap' ? 'gray.900' : 'white'}
                            color={posterType === 'starmap' ? 'white' : 'gray.700'}
                            border="1px solid" borderColor={posterType === 'starmap' ? 'gray.900' : 'gray.300'}
                            fontWeight={posterType === 'starmap' ? '700' : '500'}
                            _hover={{ bg: posterType === 'starmap' ? 'gray.800' : 'gray.50' }}
                            fontSize="xs" letterSpacing="wide" px={2}>
                            ✦ STAR MAP
                        </Button>
                        <Button size="sm" flex={1}
                            onClick={() => { setPosterType('streetmap'); trackEvent('poster_type_change', { type: 'streetmap' }); }}
                            bg={posterType === 'streetmap' ? 'gray.900' : 'white'}
                            color={posterType === 'streetmap' ? 'white' : 'gray.700'}
                            border="1px solid" borderColor={posterType === 'streetmap' ? 'gray.900' : 'gray.300'}
                            fontWeight={posterType === 'streetmap' ? '700' : '500'}
                            _hover={{ bg: posterType === 'streetmap' ? 'gray.800' : 'gray.50' }}
                            fontSize="xs" letterSpacing="wide" px={2}>
                            ⊕ STREET MAP
                        </Button>
                        <Button size="sm" flex={1}
                            onClick={() => { setPosterType('coloredmap'); trackEvent('poster_type_change', { type: 'coloredmap' }); }}
                            bg={posterType === 'coloredmap' ? 'gray.900' : 'white'}
                            color={posterType === 'coloredmap' ? 'white' : 'gray.700'}
                            border="1px solid" borderColor={posterType === 'coloredmap' ? 'gray.900' : 'gray.300'}
                            fontWeight={posterType === 'coloredmap' ? '700' : '500'}
                            _hover={{ bg: posterType === 'coloredmap' ? 'gray.800' : 'gray.50' }}
                            fontSize="xs" letterSpacing="wide" px={2}>
                            ◈ COLORED MAP
                        </Button>
                    </HStack>
                </Box>}

                {/* ── Street/Colored Map Controls ──────────────────────── */}
                {posterType !== 'starmap' && <MapControlsPanel />}



                <Accordion allowToggle defaultIndex={[0]} allowMultiple>
                    {/* Location and Text Section — only shown for star maps */}
                    {posterType === 'starmap' && (
                    <AccordionItem border="none" borderBottom="1px" borderColor="gray.200">
                        <h2>
                            <AccordionButton _expanded={{ bg: 'gray.50' }} py={4} px={6}>
                                <Box flex="1" textAlign="left" fontWeight="600" fontSize="sm" color="gray.900">
                                    Location and Text
                                </Box>
                                <AccordionIcon color="gray.400" />
                            </AccordionButton>
                        </h2>
                        <AccordionPanel pb={6} px={6}>
                            <TextContentPanel />
                        </AccordionPanel>
                    </AccordionItem>
                    )}

                    {/* Typography Section */}
                    < AccordionItem border="none" borderBottom="1px" borderColor="gray.200" >
                        <h2>
                            <AccordionButton ref={typoButtonRef} _expanded={{ bg: 'gray.50' }} py={4} px={6}>
                                <Box flex="1" textAlign="left" fontWeight="600" fontSize="sm" color="gray.900" display="flex" alignItems="center" gap={2}>
                                    Typography
                                    {activeTypoField && (
                                        <Box as="span" fontSize="xs" color="blue.500" fontWeight="400">
                                            · {activeTypoField}
                                        </Box>
                                    )}
                                </Box>
                                <AccordionIcon color="gray.400" />
                            </AccordionButton>
                        </h2>
                        <AccordionPanel pb={6} px={6}>
                            <TypographyPanel typoTab={typoTab} setTypoTab={setTypoTab} />
                        </AccordionPanel>
                    </AccordionItem >

                    {/* Size Section — design editor siblings mode */}
                    {editorSiblings && editorSiblings.length > 0 && (
                        <AccordionItem border="none" borderBottom="1px" borderColor="gray.200">
                            <h2>
                                <AccordionButton _expanded={{ bg: 'gray.50' }} py={4} px={6}>
                                    <Box flex="1" textAlign="left" fontWeight="600" fontSize="sm" color="gray.900">
                                        Size
                                    </Box>
                                    <AccordionIcon color="gray.400" />
                                </AccordionButton>
                            </h2>
                            <AccordionPanel pb={6} px={6}>
                                <Grid templateColumns="repeat(3, 1fr)" gap={2}>
                                    {editorSiblings.map((sib) => {
                                        const sizeObj = PRINT_SIZE_MAP[sib.fulfillment_size] || PRINT_SIZE_MAP['8x10'];
                                        const isActive = printSize.label === sizeObj.label;
                                        return (
                                            <Button
                                                key={sib.id}
                                                onClick={() => {
                                                    if (onSiblingSwitch) {
                                                        onSiblingSwitch(sib.id);
                                                    } else {
                                                        setPrintSize(sizeObj);
                                                    }
                                                }}
                                                {...toggleButtonStyles(isActive)}
                                                fontSize="xs"
                                            >
                                                {sizeObj.label}
                                            </Button>
                                        );
                                    })}
                                </Grid>
                            </AccordionPanel>
                        </AccordionItem>
                    )}

                    {/* Size Section — generic (hidden in listing mode and editor mode) */}
                    {!(designGroups && designGroups.length > 0) && !(editorSiblings && editorSiblings.length > 0) && < AccordionItem border="none" borderBottom="1px" borderColor="gray.200" >
                        <h2>
                            <AccordionButton _expanded={{ bg: 'gray.50' }} py={4} px={6}>
                                <Box flex="1" textAlign="left" fontWeight="600" fontSize="sm" color="gray.900">
                                    Size
                                </Box>
                                <AccordionIcon color="gray.400" />
                            </AccordionButton>
                        </h2>
                        <AccordionPanel pb={6} px={6}>
                            <Grid templateColumns="repeat(2, 1fr)" gap={3}>
                                {[
                                    { label: '8x10"', width: 8, height: 10, ratio: '4/5' },
                                    { label: '11x14"', width: 11, height: 14, ratio: '11/14' },
                                    { label: '16x20"', width: 16, height: 20, ratio: '4/5' },
                                    { label: '18x24"', width: 18, height: 24, ratio: '3/4' },
                                    { label: '24x36"', width: 24, height: 36, ratio: '2/3' },
                                ].map((size) => (
                                    <Button
                                        key={size.label}
                                        onClick={() => setPrintSize(size)}
                                        {...toggleButtonStyles(printSize.label === size.label)}
                                    >
                                        {size.label}
                                    </Button>
                                ))}
                            </Grid>
                        </AccordionPanel>
                    </AccordionItem >}

                    {/* Color Section */}
                    < AccordionItem border="none" borderBottom="1px" borderColor="gray.200" >
                        <h2>
                            <AccordionButton _expanded={{ bg: 'gray.50' }} py={4} px={6}>
                                <Box flex="1" textAlign="left" fontWeight="600" fontSize="sm" color="gray.900">
                                    Color
                                </Box>
                                <AccordionIcon color="gray.400" />
                            </AccordionButton>
                        </h2>
                        <AccordionPanel pb={6} px={6}>
                            <ColorPanel />
                        </AccordionPanel>
                    </AccordionItem >

                    {/* Style Section */}
                    < AccordionItem border="none" >
                        <h2>
                            <AccordionButton _expanded={{ bg: 'gray.50' }} py={4} px={6}>
                                <Box flex="1" textAlign="left" fontWeight="600" fontSize="sm" color="gray.900">
                                    Style
                                </Box>
                                <AccordionIcon color="gray.400" />
                            </AccordionButton>
                        </h2>
                        <AccordionPanel pb={6} px={6}>
                            <StylePanel />
                        </AccordionPanel>
                    </AccordionItem >
                </Accordion >

                <OrderSection />
            </Box >
        </Box >
    );
};

// ─── Order Section ───────────────────────────────────────────────────────────

const ETSY_DIGITAL_URL = 'https://www.etsy.com/shop/TheMappedMoment';
const ETSY_PRINT_URL   = 'https://www.etsy.com/shop/TheMappedMoment';
const API_BASE = ''; // relative — served by same nginx

function blobToBase64(blob: Blob): Promise<string> {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve((reader.result as string).split(',')[1]);
        reader.onerror = reject;
        reader.readAsDataURL(blob);
    });
}

const OrderSection: React.FC = () => {
    const store = useStore();
    const [token, setToken] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const [orderType, setOrderType] = useState<'digital' | 'print' | null>(null);
    const [copied, setCopied] = useState(false);
    const toast = useToast();

    const saveDesign = useCallback(async (type: 'digital' | 'print') => {
        setLoading(true);
        setOrderType(type);
        try {
            // Capture a clean snapshot of store state (no functions, no DOM refs)
            const state = {
                title: store.title, subtitle: store.subtitle,
                date: store.date, time: store.time,
                location: store.location, lat: store.lat, lng: store.lng,
                posterColor: store.posterColor, textColor: store.textColor,
                starColor: store.starColor, mapInteriorColor: store.mapInteriorColor,
                mapStreetColor: store.mapStreetColor, mapColorPreset: store.mapColorPreset,
                posterType: store.posterType, maskShape: store.maskShape,
                designStyle: store.designStyle, printSize: store.printSize,
                titleFont: store.titleFont, subtitleFont: store.subtitleFont,
                detailsFont: store.detailsFont, dedicationFont: store.dedicationFont,
                titleFontSize: store.titleFontSize, subtitleFontSize: store.subtitleFontSize,
                detailsFontSize: store.detailsFontSize,
                customText: store.customText,
                showBorder: store.showBorder, showFrame: store.showFrame,
                borderStyle: store.borderStyle, circleSize: store.circleSize,
                showConstellations: store.showConstellations, showGrid: store.showGrid,
                mapCenterLat: store.mapCenterLat, mapCenterLng: store.mapCenterLng,
                mapZoom: store.mapZoom, mapCity: store.mapCity,
            };

            // Render the poster to PNG (300 DPI, no watermark) and include in save request
            let renderedPng: string | undefined;
            try {
                const svgEl = document.getElementById('poster-preview')?.querySelector('svg') as SVGSVGElement | null;
                if (svgEl) {
                    const blob = await renderPosterToBlob(svgEl, store.printSize.width, store.printSize.height, 300, false);
                    renderedPng = await blobToBase64(blob);
                }
            } catch (renderErr) {
                console.warn('Pre-render failed (non-fatal):', renderErr);
            }

            const res = await fetch(`${API_BASE}/api/save-design`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ state, renderedPng }),
            });
            if (!res.ok) throw new Error('Server error');
            const { token: t } = await res.json();
            setToken(t);
        } catch {
            setToken('ERROR');
        } finally {
            setLoading(false);
        }
    }, [store]);

    const copyToken = () => {
        if (!token) return;
        navigator.clipboard.writeText(token);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    const openEtsy = () => {
        // Prefer the specific template listing URL if we arrived via a template link
        const url = store.selectedTemplateEtsyUrl
            || (orderType === 'print' ? ETSY_PRINT_URL : ETSY_DIGITAL_URL);
        window.open(url, '_blank');
    };

    const reset = () => { setToken(null); setOrderType(null); };

    const shareDesign = () => {
        const s = useStore.getState();
        const compact = {
            // Mode & shape
            posterType: s.posterType, maskShape: s.maskShape, designStyle: s.designStyle,
            isLightMode: s.isLightMode, borderStyle: s.borderStyle,
            // Colors
            posterColor: s.posterColor, textColor: s.textColor, starColor: s.starColor,
            mapInteriorColor: s.mapInteriorColor,
            // Visibility
            showBorder: s.showBorder, showFrame: s.showFrame, frameInset: s.frameInset, frameWidth: s.frameWidth,
            showLocation: s.showLocation, showDate: s.showDate, showCoords: s.showCoords,
            showDivider: s.showDivider, dividerLength: s.dividerLength, dividerThickness: s.dividerThickness,
            showConstellations: s.showConstellations, showMilkyWay: s.showMilkyWay, showGrid: s.showGrid,
            // Text content (prefer customText overrides, fall back to computed)
            title: s.customText?.title ?? s.title,
            subtitle: s.customText?.subtitle ?? s.subtitle,
            customDate: s.customText?.date,
            customLocation: s.customText?.location,
            customCoords: s.customText?.coords,
            customDedication: s.customText?.dedication,
            // Star map location & time
            location: s.location, lat: s.lat, lng: s.lng,
            date: s.date instanceof Date ? s.date.toISOString() : s.date,
            time: s.time,
            // Fonts
            titleFont: s.titleFont, subtitleFont: s.subtitleFont,
            detailsFont: s.detailsFont, dedicationFont: s.dedicationFont,
            // Font sizes
            titleFontSize: s.titleFontSize, subtitleFontSize: s.subtitleFontSize,
            detailsFontSize: s.detailsFontSize, dedicationFontSize: s.dedicationFontSize,
            // Kerning
            titleKerning: s.titleKerning, subtitleKerning: s.subtitleKerning,
            detailsKerning: s.detailsKerning, dedicationKerning: s.dedicationKerning,
            // Text position offsets
            titleOffsetY: s.titleOffsetY, subtitleOffsetY: s.subtitleOffsetY,
            detailsOffsetY: s.detailsOffsetY, dedicationOffsetY: s.dedicationOffsetY,
            heartDecorOffsetY: s.heartDecorOffsetY, dividerOffsetY: s.dividerOffsetY,
            // Shape
            circleSize: s.circleSize, heartSize: s.heartSize, houseSize: s.houseSize,
            shapeOutlineWidth: s.shapeOutlineWidth, shapeOffsetY: s.shapeOffsetY,
            shapeOffsetX: s.shapeOffsetX, snapEnabled: s.snapEnabled,
            // Star map
            starScale: s.starScale, lineWeight: s.lineWeight, glowIntensity: s.glowIntensity,
            // Map
            mapCity: s.mapCity, mapCenterLat: s.mapCenterLat, mapCenterLng: s.mapCenterLng,
            mapZoom: s.mapZoom, mapBearing: s.mapBearing,
            mapBgColor: s.mapBgColor, mapStreetColor: s.mapStreetColor, mapColorPreset: s.mapColorPreset,
            // Location pin
            showLocationPin: s.showLocationPin, locationPinSize: s.locationPinSize,
            locationPinOffsetX: s.locationPinOffsetX, locationPinOffsetY: s.locationPinOffsetY,
            // Print size
            printSize: s.printSize,
        };
        const encoded = btoa(unescape(encodeURIComponent(JSON.stringify(compact))));
        const url = `${window.location.origin}/?d=${encoded}`;
        navigator.clipboard.writeText(url).then(() => {
            trackEvent('share_click');
            toast({ title: 'Link copied!', description: 'Share this URL to load your current design.', status: 'success', duration: 3000, isClosable: true });
        }).catch(() => {
            toast({ title: 'Copy failed', description: url, status: 'warning', duration: 6000, isClosable: true });
        });
    };

    return (
        <Box p={6} borderTop="1px" borderColor="gray.200">
            <DownloadButton />
            <Button
                size="sm" width="full" mt={2} variant="outline" borderColor="gray.300"
                color="gray.600" fontWeight="500" fontSize="xs"
                onClick={shareDesign}
            >
                Share Design Link
            </Button>
            <Text fontSize="xs" textAlign="center" color="gray.400" mt={2} mb={5} fontWeight="400">
                Preview only · 150 DPI · watermarked
            </Text>

            {!token ? (
                <>
                    <VStack spacing={2}>
                        <Button
                            onClick={() => saveDesign('digital')}
                            isLoading={loading && orderType === 'digital'}
                            loadingText="Saving design…"
                            size="md" width="full" borderRadius="md"
                            bg="gray.900" color="white" fontWeight="600" fontSize="sm"
                            _hover={{ bg: 'gray.700' }}
                        >
                            Order Digital File — 300 DPI PNG
                        </Button>
                        <Button
                            onClick={() => saveDesign('print')}
                            isLoading={loading && orderType === 'print'}
                            loadingText="Saving design…"
                            size="md" width="full" borderRadius="md"
                            variant="outline" borderColor="gray.300"
                            fontWeight="600" fontSize="sm" color="gray.700"
                            _hover={{ bg: 'gray.50' }}
                        >
                            Order Printed Poster
                        </Button>
                    </VStack>
                </>
            ) : token === 'ERROR' ? (
                <Box textAlign="center">
                    <Text fontSize="sm" color="red.500" mb={2}>Could not save design. Try again.</Text>
                    <Button size="sm" onClick={reset} variant="ghost">Back</Button>
                </Box>
            ) : (
                <Box bg="gray.50" borderRadius="lg" p={4} border="1px solid" borderColor="gray.200">
                    <Text fontSize="xs" fontWeight="700" color="gray.500" textTransform="uppercase"
                        letterSpacing="0.08em" mb={3}>
                        Your design is saved!
                    </Text>

                    <HStack justify="space-between" align="center" mb={1}>
                        <Text fontSize="xs" color="gray.500">Your design token:</Text>
                        <Button size="xs" variant="ghost" color="gray.500" onClick={copyToken}>
                            {copied ? '✓ Copied' : 'Copy'}
                        </Button>
                    </HStack>
                    <Box bg="white" border="2px solid" borderColor="gray.900" borderRadius="md"
                        p={3} mb={4} textAlign="center" cursor="pointer" onClick={copyToken}>
                        <Text fontSize="2xl" fontWeight="800" letterSpacing="0.2em" color="gray.900">
                            {token}
                        </Text>
                    </Box>

                    <Box bg="blue.50" borderRadius="md" p={3} mb={4} border="1px solid" borderColor="blue.100">
                        <Text fontSize="xs" color="blue.700" lineHeight="1.6">
                            <strong>On Etsy:</strong> paste <strong>{token}</strong> in the
                            "personalisation" field when ordering. Your poster will be automatically
                            prepared and sent to you.
                        </Text>
                    </Box>

                    <VStack spacing={2}>
                        <Button
                            onClick={openEtsy}
                            size="md" width="full" borderRadius="md"
                            bg="orange.400" color="white" fontWeight="700" fontSize="sm"
                            _hover={{ bg: 'orange.500' }}
                        >
                            Continue to Etsy →
                        </Button>
                        <Button size="xs" variant="ghost" color="gray.400" onClick={reset}>
                            ← Back
                        </Button>
                    </VStack>
                </Box>
            )}
        </Box>
    );
};

export default SidebarControls;
