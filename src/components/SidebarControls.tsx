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
    // ── All-designs gallery (main page only — fetched once) ──────────────────
    interface RemoteDesign {
        id: string;
        name: string;
        thumbnail_path: string | null;
        design_group_id: string | null;
        posterType: 'starmap' | 'streetmap' | 'coloredmap';
    }
    const [remoteDesigns, setRemoteDesigns] = useState<RemoteDesign[]>([]);
    const isMainPage = !designGroups?.length && !editorSiblings?.length;
    useEffect(() => {
        if (!isMainPage) return;
        const API = import.meta.env.VITE_API_URL || '';
        fetch(`${API}/api/templates`)
            .then(r => r.ok ? r.json() : [])
            .then((data: RemoteDesign[]) => setRemoteDesigns(Array.isArray(data) ? data : []))
            .catch(() => setRemoteDesigns([]));
    }, [isMainPage]);
    // Only show designs that belong to a design_group — legacy ungrouped templates
    // (classic-dark, modern-white, etc.) are hidden from the main page gallery.
    const designsForCurrentMapType = remoteDesigns.filter(d => d.posterType === posterType && d.design_group_id);

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
                                    <Box display="grid" gridTemplateColumns="repeat(3, 1fr)" gap={3}>
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
                                                            ? `${API}${thumbSize.thumbnail_path}?v=4`
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

                {/* ── Designs gallery (main page only — filtered by current map type) ── */}
                {isMainPage && (
                    <Accordion allowToggle allowMultiple defaultIndex={[0]}>
                        <AccordionItem border="none" borderBottom="1px" borderColor="gray.200">
                            <h2>
                                <AccordionButton _expanded={{ bg: 'gray.50' }} py={4} px={6}>
                                    <Box flex="1" textAlign="left" fontWeight="600" fontSize="sm" color="gray.900">
                                        Designs
                                    </Box>
                                    <AccordionIcon color="gray.400" />
                                </AccordionButton>
                            </h2>
                            <AccordionPanel pb={4} px={4}>
                                {designsForCurrentMapType.length === 0 ? (
                                    <Text fontSize="xs" color="gray.500" textAlign="center" py={4}>
                                        No designs available for this map type yet.
                                    </Text>
                                ) : (
                                    <Box display="grid" gridTemplateColumns={`repeat(${Math.min(designsForCurrentMapType.length, 3)}, 1fr)`} gap={3}>
                                        {designsForCurrentMapType.map((d) => {
                                            // Card label: derive "DesignNNN" from design_group_id (e.g.
                                            // "sm001-design001" → "Design001"). Avoids depending on the
                                            // template `name` string which has drifted over time.
                                            const idMatch = (d.design_group_id || '').toLowerCase().match(/-design(\d+)$/);
                                            const labelParts = d.name.split(' — ');
                                            const fallback = labelParts.length > 1 ? labelParts.slice(0, -1).join(' — ') : d.name;
                                            const label = idMatch ? `Design${idMatch[1]}` : fallback;
                                            const API = import.meta.env.VITE_API_URL || '';
                                            const isActive = selectedTemplate === d.id;
                                            return (
                                                <Box
                                                    key={d.id}
                                                    cursor="pointer"
                                                    borderRadius="lg"
                                                    overflow="hidden"
                                                    border="2px solid"
                                                    borderColor={isActive ? 'gray.900' : 'gray.200'}
                                                    _hover={{ borderColor: 'gray.500' }}
                                                    transition="border-color 0.15s"
                                                    onClick={() => {
                                                        setSelectedTemplate(d.id);
                                                        fetchAndApplyTemplate(d.id, { designGroupId: d.design_group_id || undefined });
                                                        navigate(`/t/${d.id}`, { replace: true });
                                                        trackEvent('design_select_main', { templateId: d.id, posterType: d.posterType });
                                                    }}
                                                >
                                                    <Box
                                                        as="img"
                                                        src={d.thumbnail_path
                                                            ? `${API}${d.thumbnail_path}?v=4`
                                                            : `${API}/api/templates/${d.id}/thumbnail`}
                                                        alt={label}
                                                        w="100%"
                                                        display="block"
                                                        style={{ aspectRatio: '4/5', objectFit: 'cover' }}
                                                    />
                                                    <Box px={1.5} py={1.5} bg="white">
                                                        <Text fontSize="11px" fontWeight="600" color={isActive ? 'gray.900' : 'gray.500'} textAlign="center">
                                                            {label}
                                                        </Text>
                                                    </Box>
                                                </Box>
                                            );
                                        })}
                                    </Box>
                                )}
                            </AccordionPanel>
                        </AccordionItem>
                    </Accordion>
                )}

                {/* ── Street/Colored Map Controls ──────────────────────── */}
                {posterType !== 'starmap' && <MapControlsPanel />}



                <Accordion allowToggle defaultIndex={[0]} allowMultiple>
                    {/* Location and Text Section */}
                    <AccordionItem border="none" borderBottom="1px" borderColor="gray.200">
                        <h2>
                            <AccordionButton _expanded={{ bg: 'gray.50' }} py={4} px={6}>
                                <Box flex="1" textAlign="left" fontWeight="600" fontSize="sm" color="gray.900">
                                    {posterType === 'starmap' ? 'Location and Text' : 'Text'}
                                </Box>
                                <AccordionIcon color="gray.400" />
                            </AccordionButton>
                        </h2>
                        <AccordionPanel pb={6} px={6}>
                            <TextContentPanel />
                        </AccordionPanel>
                    </AccordionItem>

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
            gridWidth: s.gridWidth, gridOpacity: s.gridOpacity,
            // Rings & decorations
            showInnerRing: s.showInnerRing, innerRingWidth: s.innerRingWidth, innerRingInset: s.innerRingInset,
            showOuterRing: s.showOuterRing, outerRingWidth: s.outerRingWidth, outerRingGap: s.outerRingGap,
            showHeartDecor: s.showHeartDecor,
            // Vertical separator
            showVertSep: s.showVertSep, vertSepHeight: s.vertSepHeight, vertSepThickness: s.vertSepThickness,
            vertSepOffsetY: s.vertSepOffsetY,
            // Text content (prefer customText overrides, fall back to computed)
            title: s.customText?.title ?? s.title,
            subtitle: s.customText?.subtitle ?? s.subtitle,
            customDate: s.customText?.date,
            customLocation: s.customText?.location,
            customCoords: s.customText?.coords,
            customDedication: s.customText?.dedication,
            customNames: s.customText?.names,
            // Star map location & time
            location: s.location, lat: s.lat, lng: s.lng,
            date: s.date instanceof Date ? s.date.toISOString() : s.date,
            time: s.time,
            // Fonts
            titleFont: s.titleFont, subtitleFont: s.subtitleFont,
            detailsFont: s.detailsFont, dedicationFont: s.dedicationFont, namesFont: s.namesFont,
            // Font sizes
            titleFontSize: s.titleFontSize, subtitleFontSize: s.subtitleFontSize,
            detailsFontSize: s.detailsFontSize, dedicationFontSize: s.dedicationFontSize,
            namesFontSize: s.namesFontSize,
            // Kerning
            titleKerning: s.titleKerning, subtitleKerning: s.subtitleKerning,
            detailsKerning: s.detailsKerning, dedicationKerning: s.dedicationKerning,
            namesKerning: s.namesKerning,
            // Text position offsets
            titleOffsetX: s.titleOffsetX,
            titleOffsetY: s.titleOffsetY, subtitleOffsetY: s.subtitleOffsetY,
            detailsOffsetY: s.detailsOffsetY, dedicationOffsetY: s.dedicationOffsetY,
            namesOffsetY: s.namesOffsetY,
            heartDecorOffsetY: s.heartDecorOffsetY, dividerOffsetY: s.dividerOffsetY,
            // Names
            showNames: s.showNames, titleAllCaps: s.titleAllCaps,
            // Shape
            circleSize: s.circleSize, heartSize: s.heartSize, houseSize: s.houseSize,
            shapeOutlineWidth: s.shapeOutlineWidth, shapeOffsetY: s.shapeOffsetY,
            shapeOffsetX: s.shapeOffsetX, snapEnabled: s.snapEnabled,
            // Star map
            starScale: s.starScale, lineWeight: s.lineWeight, glowIntensity: s.glowIntensity,
            finelineWidth: s.finelineWidth,
            // Map
            mapCity: s.mapCity, mapCenterLat: s.mapCenterLat, mapCenterLng: s.mapCenterLng,
            mapZoom: s.mapZoom, mapBearing: s.mapBearing, mapStyleUrl: s.mapStyleUrl,
            mapBgColor: s.mapBgColor, mapStreetColor: s.mapStreetColor, mapColorPreset: s.mapColorPreset,
            // Location pin
            showLocationPin: s.showLocationPin, locationPinSize: s.locationPinSize,
            locationPinOffsetX: s.locationPinOffsetX, locationPinOffsetY: s.locationPinOffsetY,
            // Print size
            printSize: s.printSize,
        };
        const encoded = btoa(unescape(encodeURIComponent(JSON.stringify(compact))));
        // Preserve current path so listing pages stay in listing context
        const basePath = window.location.pathname;
        const url = `${window.location.origin}${basePath}?d=${encoded}`;
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
