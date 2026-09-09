import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
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
    isAdmin?: boolean;
}

const SidebarControls: React.FC<SidebarProps> = ({ designGroups, editorSiblings, onSiblingSwitch, isAdmin }) => {
    // Paid-order lockdown: when this is a real order's design (or an admin opening it), don't let
    // the product TYPE be switched (Star/Street/Colored) — that would wipe the purchased design.
    const { designToken: sbRouteToken } = useParams<{ designToken?: string }>();
    const [sbPurchased, setSbPurchased] = useState(false);
    useEffect(() => {
        if (!sbRouteToken) { setSbPurchased(false); return; }
        let cancelled = false;
        fetch(`/api/order-status/${encodeURIComponent(sbRouteToken)}`)
            .then(r => (r.ok ? r.json() : null))
            .then(j => { if (!cancelled && j?.found && !['cancelled', 'refunded'].includes(j.status)) setSbPurchased(true); })
            .catch(() => {});
        return () => { cancelled = true; };
    }, [sbRouteToken]);
    const lockProductType = !!isAdmin || sbPurchased;
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
        printSize, setPrintSize, lockedPrintSize,
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
                                                    {thumbSize?.thumbnail_path ? (
                                                        <picture style={{ display: 'block', width: '100%' }}>
                                                            <source
                                                                srcSet={`${API}${thumbSize.thumbnail_path.replace(/\.png$/, '.avif')}?v=9`}
                                                                type="image/avif"
                                                            />
                                                            <img
                                                                src={`${API}${thumbSize.thumbnail_path}?v=9`}
                                                                alt={group.name}
                                                                style={{ width: '100%', display: 'block', aspectRatio: '4/5', objectFit: 'cover' }}
                                                            />
                                                        </picture>
                                                    ) : (
                                                        <Box
                                                            as="img"
                                                            src={`${API}/api/templates/${thumbSize?.id ?? group.sizes[0]?.id}/thumbnail`}
                                                            alt={group.name}
                                                            w="100%"
                                                            display="block"
                                                            style={{ aspectRatio: '4/5', objectFit: 'cover' }}
                                                        />
                                                    )}
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
                                    {lockedPrintSize && (
                                        <Text fontSize="xs" color="gray.500" mb={3} bg="gray.50" p={2} borderRadius="md">
                                            Locked to <strong>{lockedPrintSize.label}</strong> — this matches your order and can't be changed.
                                        </Text>
                                    )}
                                    <Grid templateColumns="repeat(2, 1fr)" gap={3}>
                                        {activeGroup.sizes.map((sz) => {
                                            const sizeObj = PRINT_SIZE_MAP[sz.fulfillment_size || ''] || PRINT_SIZE_MAP['8x10'];
                                            const isActive = printSize.label === sizeObj.label;
                                            return (
                                                <Button
                                                    key={sz.id}
                                                    isDisabled={!!lockedPrintSize}
                                                    onClick={() => fetchAndApplyTemplate(sz.id, {
                                                        preserveText: true,
                                                        preserveMapPlacement: true,
                                                        designGroupId: activeGroupId,
                                                    })}
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


                {/* ── Poster Type Toggle — hidden in listing/customer mode + on paid orders (lockProductType) ── */}
                {!(designGroups && designGroups.length > 0) && !lockProductType && <Box px={6} py={4} borderBottom="1px" borderColor="gray.200">
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
                                                    {d.thumbnail_path ? (
                                                        <picture style={{ display: 'block', width: '100%' }}>
                                                            <source
                                                                srcSet={`${API}${d.thumbnail_path.replace(/\.png$/, '.avif')}?v=9`}
                                                                type="image/avif"
                                                            />
                                                            <img
                                                                src={`${API}${d.thumbnail_path}?v=9`}
                                                                alt={label}
                                                                style={{ width: '100%', display: 'block', aspectRatio: '4/5', objectFit: 'cover' }}
                                                            />
                                                        </picture>
                                                    ) : (
                                                        <Box
                                                            as="img"
                                                            src={`${API}/api/templates/${d.id}/thumbnail`}
                                                            alt={label}
                                                            w="100%"
                                                            display="block"
                                                            style={{ aspectRatio: '4/5', objectFit: 'cover' }}
                                                        />
                                                    )}
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
                            {lockedPrintSize && (
                                <Text fontSize="xs" color="orange.600" bg="orange.50" borderRadius="md"
                                    px={3} py={2} mb={3} border="1px solid" borderColor="orange.200">
                                    Locked to <strong>{lockedPrintSize.label}</strong> — this matches your order size and cannot be changed.
                                </Text>
                            )}
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
                                        isDisabled={!!lockedPrintSize}
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

                <OrderSection isAdmin={isAdmin} />
            </Box >
        </Box >
    );
};

// ─── Order Section ───────────────────────────────────────────────────────────

const ETSY_DIGITAL_URL = 'https://www.etsy.com/shop/TheMappedMoment';
const ETSY_PRINT_URL   = 'https://www.etsy.com/shop/TheMappedMoment';
const API_BASE = ''; // relative — served by same nginx

// Show the "Printed Poster" / "Framed Poster" buy options?
//
// FALSE since 2026-07 because the shop is DIGITAL-ONLY and those options were a dead end:
//   1. All 5 physical Etsy listings are deactivated (state=edit) — there is nothing live to buy,
//      so a customer choosing "Printed Poster" got sent to Etsy to purchase a listing that
//      doesn't exist.
//   2. `enable_auto_prodigi` is OFF (deliberately — the seller funds Prodigi only after the
//      Etsy payout clears), so a physical order couldn't be auto-fulfilled anyway.
// Flip to true ONLY after re-activating physical listings AND deciding on Prodigi funding.
const PHYSICAL_PRODUCTS_ENABLED = false;

function blobToBase64(blob: Blob): Promise<string> {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve((reader.result as string).split(',')[1]);
        reader.onerror = reject;
        reader.readAsDataURL(blob);
    });
}

// Available frame colors from Prodigi's CFPM product line.
// Attribute name: "color". Valid values verified via Prodigi API v4.0.
const FRAME_COLORS = [
    { id: 'black',      label: 'Black',      bg: '#1a1a1a', border: '#555' },
    { id: 'white',      label: 'White',      bg: '#f5f5f5', border: '#ccc' },
    { id: 'natural',    label: 'Natural',    bg: '#c8a06e', border: '#a07840' },
    { id: 'light grey', label: 'Light Grey', bg: '#c0c0c0', border: '#999' },
    { id: 'dark grey',  label: 'Dark Grey',  bg: '#555555', border: '#333' },
] as const;
type FrameColor = typeof FRAME_COLORS[number]['id'];

const OrderSection: React.FC<{ isAdmin?: boolean }> = ({ isAdmin = false }) => {
    const store = useStore();
    const { canUndo, canRedo, undo, redo } = useStore();
    const [token, setToken] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const [orderType, setOrderType] = useState<'digital' | 'print' | 'framed' | null>(null);
    const [frameColor, setFrameColor] = useState<FrameColor>('black');
    const [copied, setCopied] = useState(false);
    const toast = useToast();

    // Route token — present when the editor is opened via /d/:designToken
    const { designToken: routeToken } = useParams<{ designToken?: string }>();

    // Confirm mode state — set when the order is awaiting size confirmation
    const [confirmInfo, setConfirmInfo] = useState<{ orderId: number; listingType: string; printSize: string } | null>(null);
    const [confirmState, setConfirmState] = useState<'idle' | 'submitting' | 'done' | 'error'>('idle');
    // Purchased mode — the token belongs to a real (paid) order. Show edit + no-watermark
    // download; hide the buy-on-Etsy UI (the customer already paid — never loop them back).
    const [purchased, setPurchased] = useState(false);
    // Order details captured alongside `purchased`, needed to background-sync edits to the
    // server (see the auto-sync effect below) — separate from confirmInfo, which is only for
    // the one-time awaiting_size_confirm step.
    const [purchasedOrderInfo, setPurchasedOrderInfo] = useState<{ listingType: string; revisionsRemaining: number } | null>(null);
    const [syncState, setSyncState] = useState<'idle' | 'syncing' | 'synced' | 'exhausted' | 'error'>('idle');

    // Size + variant info for post-save instructions
    const displaySize = store.selectedTemplateFulfillmentSize || store.printSize?.label || '';
    const etsy_variant = store.selectedTemplateEtsyVariantName;
    // Format size for display: "8x10" → "8×10""
    const sizeLabel = displaySize.replace('x', '×').replace(/"$/, '') + '"';

    // Extract store snapshot into a reusable helper so both saveDesign and confirmOrder
    // can reference the same set of fields.
    const buildSnapshot = useCallback((type: 'digital' | 'print' | 'framed') => ({
        title: store.title, subtitle: store.subtitle,
        date: store.date, time: store.time,
        location: store.location, lat: store.lat, lng: store.lng,
        posterColor: store.posterColor, textColor: store.textColor,
        starColor: store.starColor, mapInteriorColor: store.mapInteriorColor,
        mapStreetColor: store.mapStreetColor, mapBgColor: store.mapBgColor,
        mapWaterColor: store.mapWaterColor, mapLandColor: store.mapLandColor,
        mapMainRoadColor: store.mapMainRoadColor, mapSmallRoadColor: store.mapSmallRoadColor,
        mapDetailRoadColor: store.mapDetailRoadColor,
        mapColorPreset: store.mapColorPreset, mapStyleUrl: store.mapStyleUrl,
        posterType: store.posterType, maskShape: store.maskShape,
        designStyle: store.designStyle, printSize: store.printSize,
        titleFont: store.titleFont, subtitleFont: store.subtitleFont,
        detailsFont: store.detailsFont, dedicationFont: store.dedicationFont,
        titleFontSize: store.titleFontSize, subtitleFontSize: store.subtitleFontSize,
        detailsFontSize: store.detailsFontSize,
        customText: store.customText,
        titleAllCaps: store.titleAllCaps, locationAllCaps: store.locationAllCaps,
        showBorder: store.showBorder, showFrame: store.showFrame,
        borderStyle: store.borderStyle, circleSize: store.circleSize,
        showConstellations: store.showConstellations, showGrid: store.showGrid,
        mapCenterLat: store.mapCenterLat, mapCenterLng: store.mapCenterLng,
        mapZoom: store.mapZoom, mapCity: store.mapCity,
        // Order metadata — used by the server at fulfillment time.
        // orderType drives the Prodigi product (FAP=print, CFPM=framed).
        // frameColor is the Prodigi 'color' attribute (black, white, natural, etc.).
        orderType: type,
        frameColor: type === 'framed' ? frameColor : undefined,
    }), [store, frameColor]);

    // When the editor is opened via /d/:designToken, check if a real order now exists for
    // this design and switch to confirm/purchased mode if so.
    //
    // Seamless round-trip: a customer typically designs here, THEN opens Etsy in a separate
    // tab to paste their code and check out — this tab is often still open/bookmarked when
    // they come back. Etsy's own poll only picks up new receipts every 2 minutes, so a single
    // check on mount would miss an order placed moments ago. Keep polling (capped) so the
    // page flips itself into purchased mode automatically — no re-entering a code or order
    // number required. Also re-checks immediately when the tab regains focus, which is the
    // most common "I just finished checking out" moment.
    useEffect(() => {
        if (!routeToken) return;
        let cancelled = false;
        let attempts = 0;
        let found = false; // stop polling as soon as an order is found — no need to keep checking
        const MAX_ATTEMPTS = 20; // ~ 20 * 20s = ~6.5min of polling — comfortably past Etsy's 2min poll cadence

        const check = async () => {
            if (cancelled || found) return;
            try {
                const res = await fetch(`/api/order-status/${encodeURIComponent(routeToken)}`);
                if (!res.ok || cancelled) return;
                const json = await res.json();
                if (cancelled) return;
                if (json.confirmRequired) {
                    found = true;
                    setConfirmInfo({ orderId: json.orderId, listingType: json.listingType, printSize: json.printSize });
                } else if (json.found && !['cancelled', 'refunded'].includes(json.status)) {
                    // A real paid order exists for this design → purchased mode.
                    found = true;
                    setPurchased(true);
                    if (json.delivered) {
                        setPurchasedOrderInfo({ listingType: json.listingType, revisionsRemaining: json.revisionsRemaining ?? 0 });
                    }
                }
            } catch {
                // silent — confirm mode is opt-in; normal shopping UI shown on failure
            }
        };

        check();
        const interval = setInterval(() => {
            attempts += 1;
            if (found || attempts >= MAX_ATTEMPTS) { clearInterval(interval); return; }
            check();
        }, 20000);
        const onFocus = () => check();
        window.addEventListener('focus', onFocus);
        document.addEventListener('visibilitychange', onFocus);

        return () => {
            cancelled = true;
            clearInterval(interval);
            window.removeEventListener('focus', onFocus);
            document.removeEventListener('visibilitychange', onFocus);
        };
    }, [routeToken]);

    // Confirm the design at the ordered size and re-enter the production pipeline.
    const confirmOrder = useCallback(async () => {
        if (!routeToken || !confirmInfo) return;
        setConfirmState('submitting');
        try {
            const res = await fetch('/api/confirm-order', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ token: routeToken, state: buildSnapshot((confirmInfo.listingType as 'digital' | 'print' | 'framed') || 'print') }),
            });
            if (!res.ok) throw new Error('Server error');
            setConfirmState('done');
        } catch {
            setConfirmState('error');
        }
    }, [routeToken, confirmInfo, buildSnapshot]);

    // ── Server sync of post-purchase edits (EXPLICIT, never automatic) ──────────
    // When a buyer edits an already-delivered order, "Export (No Watermark)" gives them an
    // instant client-side file but tells the SERVER nothing, so our stored render_path (what
    // /verify re-downloads and what the seller uploads to Etsy) would stay on the ORIGINAL
    // file. `syncUpdate()` pushes the edit to /confirm-order, which re-renders under the same
    // guards as the /verify revision path (edit window + MAX_REVISIONS).
    //
    // ⚠️ This is deliberately a BUTTON, not a background auto-sync. An earlier version fired
    // automatically on a debounce whenever the snapshot changed, which spent a STRICTLY
    // LIMITED resource (3 free updates) with no intent signal:
    //   - the shop OWNER opening a customer's design to grab the file could burn the
    //     customer's credits by nudging a slider or dragging the map;
    //   - a customer idly tweaking across three sessions could exhaust all 3 updates without
    //     ever meaning to "submit" anything.
    // A credit must only ever be spent on a deliberate click. Do not reintroduce auto-sync.
    const snapshotJson = useMemo(
        () => (purchased && purchasedOrderInfo
            ? JSON.stringify(buildSnapshot(purchasedOrderInfo.listingType as 'digital' | 'print' | 'framed'))
            : null),
        [purchased, purchasedOrderInfo, buildSnapshot]
    );
    const lastSyncedRef = useRef<string | null>(null);
    const baselineSetRef = useRef(false);

    // Capture the AS-DELIVERED state as the baseline when purchased mode is detected, so we can
    // tell "actually edited something" from "just opened the page".
    useEffect(() => {
        if (!purchased) { baselineSetRef.current = false; return; }
        if (purchasedOrderInfo && snapshotJson && !baselineSetRef.current) {
            lastSyncedRef.current = snapshotJson;
            baselineSetRef.current = true;
        }
    }, [purchased, purchasedOrderInfo, snapshotJson]);

    // True only when the current design genuinely differs from what was delivered.
    const hasUnsyncedEdits = !!(
        purchased && purchasedOrderInfo && baselineSetRef.current &&
        snapshotJson && snapshotJson !== lastSyncedRef.current
    );

    const syncUpdate = useCallback(async () => {
        if (!routeToken || !purchasedOrderInfo || !snapshotJson) return;
        if (purchasedOrderInfo.revisionsRemaining <= 0) { setSyncState('exhausted'); return; }
        setSyncState('syncing');
        try {
            const res = await fetch('/api/confirm-order', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ token: routeToken, state: JSON.parse(snapshotJson) }),
            });
            const json = await res.json().catch(() => ({}));
            if (!res.ok) {
                if (json.revisionsExhausted || json.editWindowClosed) {
                    setSyncState('exhausted');
                    setPurchasedOrderInfo(info => (info ? { ...info, revisionsRemaining: 0 } : info));
                } else {
                    setSyncState('error');
                }
                return;
            }
            lastSyncedRef.current = snapshotJson;
            setSyncState('synced');
            setPurchasedOrderInfo(info => (info
                ? { ...info, revisionsRemaining: json.revisionsRemaining ?? info.revisionsRemaining }
                : info));
        } catch {
            setSyncState('error');
        }
    }, [routeToken, purchasedOrderInfo, snapshotJson]);

    const saveDesign = useCallback(async (type: 'digital' | 'print' | 'framed') => {
        setLoading(true);
        setOrderType(type);
        try {
            // Capture a clean snapshot of store state (no functions, no DOM refs)
            const state = buildSnapshot(type);

            // Client-side pre-render removed: large canvases (300 DPI street/star maps)
            // overflow browser limits and exceed the 2 MB body limit.
            // Server renders at full 300 DPI via Puppeteer on fulfillment.
            const renderedPng: string | undefined = undefined;

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
    }, [buildSnapshot]);

    const copyToken = () => {
        if (!token) return;
        navigator.clipboard.writeText(token);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    const openEtsy = () => {
        // Prefer the specific template listing URL; framed + print both use the print listing.
        const url = store.selectedTemplateEtsyUrl
            || (orderType === 'digital' ? ETSY_DIGITAL_URL : ETSY_PRINT_URL);
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
            milkyWayOpacity: s.milkyWayOpacity,
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
            showNames: s.showNames, titleAllCaps: s.titleAllCaps, locationAllCaps: s.locationAllCaps,
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
            mapBgColor: s.mapBgColor, mapStreetColor: s.mapStreetColor,
            mapWaterColor: s.mapWaterColor, mapLandColor: s.mapLandColor,
            mapMainRoadColor: s.mapMainRoadColor, mapSmallRoadColor: s.mapSmallRoadColor,
            mapDetailRoadColor: s.mapDetailRoadColor,
            mapColorPreset: s.mapColorPreset,
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

    // Post-purchase: an admin opening an order (?admin=1, server-verified upstream) OR a paid
    // customer. Both get the no-watermark export and NO buy-on-Etsy UI (edit + download only).
    const postPurchase = isAdmin || purchased;

    // Confirm / edit mode — shown instead of the shopping UI when the order is in confirm/edit mode
    // (awaiting_size_confirm). Used both for print size-confirm AND digital "personalise your map".
    if (confirmInfo) {
        const isDigital = confirmInfo.listingType === 'digital';
        const productLabel = confirmInfo.listingType === 'framed'
            ? 'Framed Print'
            : confirmInfo.listingType === 'print'
                ? 'Printed Poster'
                : 'Digital Download';
        const formattedSize = (confirmInfo.printSize || '').replace('x', '×');
        const editOrderId = (typeof window !== 'undefined')
            ? new URLSearchParams(window.location.search).get('o') : null;
        const downloadHref = editOrderId ? `/verify?o=${encodeURIComponent(editOrderId)}` : '/verify';

        return (
            <Box p={6} borderTop="1px" borderColor="gray.200">
                <Box border="1px solid" borderColor="gray.200" borderRadius="lg" p={5}>
                    <Text fontWeight="700" fontSize="md" color="gray.900" mb={3}>
                        {isDigital ? 'Personalise your map' : 'Confirm your order'}
                    </Text>
                    <Text fontSize="sm" color="gray.600" mb={4}>
                        {isDigital
                            ? 'Make any changes above — location, date, names, colours — then get your print-ready file. No extra charge.'
                            : <>You ordered a {formattedSize} {productLabel}. We&apos;ve laid your design out at {formattedSize} — edit anything above, then confirm and it goes straight to production. No extra charge.</>}
                    </Text>

                    {confirmState === 'done' ? (
                        <Box bg="green.50" border="1px solid" borderColor="green.200"
                            borderRadius="md" p={4} textAlign="center">
                            {isDigital ? (
                                <>
                                    <Text fontWeight="700" color="green.700" fontSize="sm" mb={3}>
                                        ✓ Saved! Your file is being prepared — about a minute.
                                    </Text>
                                    <Button as="a" href={downloadHref}
                                        size="md" width="full" borderRadius="md"
                                        bg="green.600" color="white" fontWeight="700" fontSize="sm"
                                        _hover={{ bg: 'green.700' }}
                                    >
                                        Download my file →
                                    </Button>
                                </>
                            ) : (
                                <Text fontWeight="700" color="green.700" fontSize="sm">
                                    ✓ Confirmed! Your order is now in production. We&apos;ll email you when it ships.
                                </Text>
                            )}
                        </Box>
                    ) : (
                        <VStack spacing={3}>
                            {confirmState === 'error' && (
                                <Text fontSize="xs" color="red.500" textAlign="center">
                                    Something went wrong — please try again or email studio@themappedmoment.com.
                                </Text>
                            )}
                            <Button
                                onClick={confirmOrder}
                                isLoading={confirmState === 'submitting'}
                                loadingText={isDigital ? 'Preparing…' : 'Confirming…'}
                                size="md" width="full" borderRadius="md"
                                bg="gray.900" color="white" fontWeight="600" fontSize="sm"
                                _hover={{ bg: 'gray.700' }}
                            >
                                {isDigital ? '✓ Get my file' : '✓ Confirm & send to production'}
                            </Button>
                        </VStack>
                    )}
                </Box>
            </Box>
        );
    }

    return (
        <Box p={6} borderTop="1px" borderColor="gray.200">
            <HStack spacing={2} mb={3}>
                <Button
                    flex={1} size="sm" variant="outline" borderColor="gray.300"
                    color="gray.600" fontWeight="500" fontSize="xs"
                    isDisabled={!canUndo} onClick={undo} title="Undo (Ctrl+Z)"
                    _disabled={{ opacity: 0.35, cursor: 'not-allowed' }}
                >
                    ↩ Undo
                </Button>
                <Button
                    flex={1} size="sm" variant="outline" borderColor="gray.300"
                    color="gray.600" fontWeight="500" fontSize="xs"
                    isDisabled={!canRedo} onClick={redo} title="Redo (Ctrl+Y / Ctrl+Shift+Z)"
                    _disabled={{ opacity: 0.35, cursor: 'not-allowed' }}
                >
                    Redo ↪
                </Button>
            </HStack>
            <DownloadButton isAdmin={postPurchase} />
            <Button
                size="sm" width="full" mt={2} variant="outline" borderColor="gray.300"
                color="gray.600" fontWeight="500" fontSize="xs"
                onClick={shareDesign}
            >
                Share Design Link
            </Button>
            {/* Must match reality: renderPosterToBlob() is called with dpi=300 for BOTH the free
                preview and the paid export — the ONLY difference is the watermark flag (`!isAdmin`).
                This previously claimed "150 DPI", which was never true and made the preview look
                lower-quality than it is. Don't reintroduce a DPI number here unless DownloadButton
                actually renders at that DPI. */}
            {!postPurchase && (
                <Text fontSize="xs" textAlign="center" color="gray.400" mt={2} mb={5} fontWeight="400">
                    Preview only · watermarked
                </Text>
            )}

            {postPurchase ? (
                <Box bg="green.50" border="1px solid" borderColor="green.200" borderRadius="lg" p={4} mt={3}>
                    <Text fontWeight="700" fontSize="sm" color="green.800" mb={1}>
                        ✓ {isAdmin && !purchased ? 'Admin — order design' : 'Your purchased design'}
                    </Text>
                    <Text fontSize="xs" color="gray.600">
                        Edit anything above, then use <b>Export (No Watermark)</b> to download your
                        full-resolution file. {purchased ? 'No need to buy again.' : ''}
                    </Text>
                    {purchased && purchasedOrderInfo && (
                        <Box mt={3}>
                            {/* A credit is spent ONLY by clicking this button — never automatically. */}
                            {hasUnsyncedEdits && syncState !== 'synced' && purchasedOrderInfo.revisionsRemaining > 0 && (
                                <Button
                                    onClick={syncUpdate}
                                    isLoading={syncState === 'syncing'}
                                    loadingText="Updating your file…"
                                    size="sm" width="full" mb={2}
                                    bg="green.600" color="white" fontWeight="700" fontSize="xs"
                                    _hover={{ bg: 'green.700' }}
                                >
                                    Save changes &amp; update my file
                                </Button>
                            )}
                            <Text fontSize="xs" color="gray.500">
                                {syncState === 'syncing' && 'Updating your file…'}
                                {syncState === 'synced' && '✓ Updated — your file is up to date.'}
                                {syncState === 'error' && 'Could not update — please try again or email studio@themappedmoment.com.'}
                                {syncState === 'exhausted' && "You've used all your free updates — email studio@themappedmoment.com for further changes."}
                                {syncState === 'idle' && purchasedOrderInfo.revisionsRemaining <= 0 &&
                                    "You've used all your free updates — email studio@themappedmoment.com for further changes."}
                                {syncState === 'idle' && purchasedOrderInfo.revisionsRemaining > 0 && (hasUnsyncedEdits
                                    ? `Unsaved changes — ${purchasedOrderInfo.revisionsRemaining} free update${purchasedOrderInfo.revisionsRemaining !== 1 ? 's' : ''} left`
                                    : `${purchasedOrderInfo.revisionsRemaining} free update${purchasedOrderInfo.revisionsRemaining !== 1 ? 's' : ''} remaining`)}
                            </Text>
                        </Box>
                    )}
                </Box>
            ) : !token ? (
                <VStack spacing={3}>
                    {/* Product type cards — physical options gated by PHYSICAL_PRODUCTS_ENABLED (top of file) */}
                    {([
                        { type: 'digital' as const,  icon: '📄', title: 'Digital File',    sub: '300 DPI PNG, instant download' },
                        ...(PHYSICAL_PRODUCTS_ENABLED ? [
                            { type: 'print'  as const, icon: '🖼', title: 'Printed Poster', sub: 'Fine Art Print, unframed' },
                            { type: 'framed' as const, icon: '🪟', title: 'Framed Poster',  sub: 'Fine Art Print + frame' },
                        ] : []),
                    ]).map(({ type, icon, title, sub }) => {
                        const isActive = orderType === type || (!orderType && type === 'digital');
                        return (
                            <Box
                                key={type}
                                as="button"
                                w="full"
                                onClick={() => !loading && setOrderType(type)}
                                border="2px solid"
                                borderColor={isActive ? 'gray.900' : 'gray.200'}
                                borderRadius="lg"
                                bg={isActive ? 'gray.900' : 'white'}
                                color={isActive ? 'white' : 'gray.700'}
                                px={4} py={3}
                                textAlign="left"
                                _hover={{ borderColor: isActive ? 'gray.900' : 'gray.400' }}
                                transition="all 0.15s"
                                cursor={loading ? 'not-allowed' : 'pointer'}
                            >
                                <HStack spacing={3}>
                                    <Text fontSize="xl">{icon}</Text>
                                    <Box>
                                        <Text fontWeight="700" fontSize="sm">{title}</Text>
                                        <Text fontSize="11px" opacity={0.7}>{sub}</Text>
                                    </Box>
                                    <Box ml="auto" w="18px" h="18px" borderRadius="full"
                                        border="2px solid" borderColor={isActive ? 'white' : 'gray.300'}
                                        bg={isActive ? 'white' : 'transparent'}
                                        display="flex" alignItems="center" justifyContent="center">
                                        {isActive && <Box w="8px" h="8px" borderRadius="full" bg="gray.900" />}
                                    </Box>
                                </HStack>
                            </Box>
                        );
                    })}

                    {/* Frame color picker — shown when 'framed' is selected */}
                    {orderType === 'framed' && (
                        <Box w="full" bg="gray.50" borderRadius="md" p={3} border="1px solid" borderColor="gray.200">
                            <Text fontSize="xs" fontWeight="600" color="gray.600" mb={2}>Frame color</Text>
                            <HStack spacing={2} flexWrap="wrap">
                                {FRAME_COLORS.map(fc => (
                                    <Box
                                        key={fc.id}
                                        as="button"
                                        onClick={() => setFrameColor(fc.id)}
                                        border="2px solid"
                                        borderColor={frameColor === fc.id ? 'gray.900' : fc.border}
                                        borderRadius="md"
                                        bg={fc.bg}
                                        w="32px" h="32px"
                                        cursor="pointer"
                                        title={fc.label}
                                        position="relative"
                                        flexShrink={0}
                                        _hover={{ borderColor: 'gray.900' }}
                                        transition="border-color 0.1s"
                                    >
                                        {frameColor === fc.id && (
                                            <Box position="absolute" inset={0} display="flex" alignItems="center" justifyContent="center">
                                                <Text fontSize="14px" lineHeight="1">{['white','light grey'].includes(fc.id) ? '✓' : '✓'}</Text>
                                            </Box>
                                        )}
                                    </Box>
                                ))}
                            </HStack>
                            <Text fontSize="10px" color="gray.500" mt={2}>
                                {FRAME_COLORS.find(f => f.id === frameColor)?.label} frame selected
                                · saved with your design — no need to choose again at checkout
                            </Text>
                        </Box>
                    )}

                    <Button
                        onClick={() => saveDesign(orderType ?? 'digital')}
                        isLoading={loading}
                        loadingText="Saving design…"
                        size="md" width="full" borderRadius="md"
                        bg="gray.900" color="white" fontWeight="600" fontSize="sm"
                        _hover={{ bg: 'gray.700' }}
                        mt={1}
                    >
                        Save Design &amp; Continue →
                    </Button>

                    {store.selectedTemplateEtsyUrl && (
                        <Text fontSize="xs" color="gray.400" textAlign="center">
                            or{' '}
                            <Box as="a" href={store.selectedTemplateEtsyUrl} target="_blank"
                                color="orange.500" fontWeight="600" textDecoration="underline"
                                _hover={{ color: 'orange.600' }}>
                                view listing on Etsy ↗
                            </Box>
                        </Text>
                    )}
                </VStack>
            ) : token === 'ERROR' ? (
                <Box textAlign="center">
                    <Text fontSize="sm" color="red.500" mb={2}>Could not save design. Try again.</Text>
                    <Button size="sm" onClick={reset} variant="ghost">Back</Button>
                </Box>
            ) : (
                <Box bg="gray.50" borderRadius="lg" p={4} border="1px solid" borderColor="gray.200">
                    <Text fontSize="xs" fontWeight="700" color="green.600" textTransform="uppercase"
                        letterSpacing="0.08em" mb={4}>
                        ✓ Design saved — 2 steps to complete your order
                    </Text>

                    {/* Step 1 — Copy code */}
                    <Text fontSize="xs" fontWeight="700" color="gray.600" mb={1}>
                        Step 1 — Copy your personalisation code
                    </Text>
                    <Box bg="white" border="2px solid" borderColor="gray.900" borderRadius="md"
                        p={3} mb={1} textAlign="center" cursor="pointer" onClick={copyToken}
                        _hover={{ borderColor: 'gray.600' }}>
                        <Text fontSize="2xl" fontWeight="800" letterSpacing="0.2em" color="gray.900">
                            {token}
                        </Text>
                    </Box>
                    <Button size="xs" width="full" variant="outline" borderColor="gray.300"
                        color="gray.600" mb={4} onClick={copyToken}>
                        {copied ? '✓ Copied to clipboard' : 'Copy code'}
                    </Button>

                    {/* Step 2 — Order instructions */}
                    <Text fontSize="xs" fontWeight="700" color="gray.600" mb={2}>
                        Step 2 — Order on Etsy
                    </Text>
                    <Box bg="white" border="1px solid" borderColor="gray.200" borderRadius="md" p={3} mb={4}>
                        <VStack align="start" spacing={1}>
                            {sizeLabel && (
                                <Text fontSize="xs" color="gray.700">
                                    📐 Select size: <strong>{sizeLabel}</strong>
                                </Text>
                            )}
                            {etsy_variant ? (
                                <Text fontSize="xs" color="gray.700">
                                    🖼 Select product: <strong>{etsy_variant}</strong>
                                </Text>
                            ) : orderType === 'framed' ? (
                                <Text fontSize="xs" color="gray.700">
                                    🖼 Select: <strong>Framed Poster</strong>
                                </Text>
                            ) : (
                                <Text fontSize="xs" color="gray.700">
                                    🖼 Select: <strong>{orderType === 'digital' ? 'Digital Download' : 'Printed Poster'}</strong>
                                </Text>
                            )}
                            {orderType === 'framed' && (
                                <Text fontSize="xs" color="gray.700">
                                    🎨 Frame color: <strong>{FRAME_COLORS.find(f => f.id === frameColor)?.label ?? 'Black'}</strong>
                                    {' '}<Box as="span" display="inline-block" w="10px" h="10px" borderRadius="2px"
                                        bg={FRAME_COLORS.find(f => f.id === frameColor)?.bg}
                                        border="1px solid" borderColor="gray.300"
                                        verticalAlign="middle" ml="1" />
                                    {' '}<Box as="span" color="gray.400">(locked into your code)</Box>
                                </Text>
                            )}
                            <Text fontSize="xs" color="gray.700">
                                📋 Paste your code in <strong>"Personalisation"</strong> at checkout
                            </Text>
                        </VStack>
                    </Box>

                    <VStack spacing={2}>
                        <Button
                            onClick={openEtsy}
                            size="md" width="full" borderRadius="md"
                            bg="orange.400" color="white" fontWeight="700" fontSize="sm"
                            _hover={{ bg: 'orange.500' }}
                        >
                            Buy on Etsy →
                        </Button>
                        <Button size="xs" variant="ghost" color="gray.400" onClick={reset}>
                            ← Start over
                        </Button>
                    </VStack>
                </Box>
            )}
        </Box>
    );
};

export default SidebarControls;
