import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useStore } from '../store/useStore';
import { format } from 'date-fns';
import DownloadButton from './DownloadButton';
import CitySearch from './CitySearch';
import GlyphPicker from './GlyphPicker';
import { MAP_COLOR_PRESETS } from './StreetMapCapture';
import { ChevronDown } from 'lucide-react';
import { renderPosterToBlob } from '../utils/renderPoster';
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
    Textarea,
    Grid,
    Switch,
    FormControl,
    FormLabel,
    InputGroup,
    InputRightElement,
    Spinner,
    Select,
    List,
    ListItem,
} from '@chakra-ui/react';

const TITLE_SUGGESTIONS = [
    "Our Night Sky",
    "The Night We Met",
    "Where It All Began",
    "The Day You Were Born",
    "Our Love Story",
    "Written in the Stars",
    "The Stars Aligned",
    "A Moment in Time",
    "Our Special Night",
    "The Beginning of Forever"
];

const SUBTITLE_SUGGESTIONS = [
    "A Moment to Remember",
    "Under These Stars",
    "Our Story Began",
    "Forever and Always",
    "The Day Everything Changed",
    "When Our Hearts Met",
    "The Start of Something Beautiful",
    "Our Universe",
    "Love Under the Stars",
    "A Night to Remember"
];

const TITLE_FONTS = [
    // Serifs
    { label: 'Cormorant Garamond', value: 'Cormorant Garamond' },
    { label: 'Playfair Display', value: 'Playfair Display' },
    { label: 'Cinzel', value: 'Cinzel' },
    // Sans-serif
    { label: 'Bebas Neue', value: 'Bebas Neue' },
    { label: 'Oswald', value: 'Oswald' },
    { label: 'Poppins', value: 'Poppins' },
    { label: 'Nunito', value: 'Nunito' },
    { label: 'Orbitron', value: 'Orbitron' },
    // Script — featured
    { label: 'Mapped Moment Script ❤', value: 'Mapped Moment Script' },
    { label: 'Great Vibes', value: 'Great Vibes' },
    { label: 'Sacramento', value: 'Sacramento' },
    { label: 'Dancing Script', value: 'Dancing Script' },
    { label: 'Pinyon Script', value: 'Pinyon Script' },
    { label: 'Allura', value: 'Allura' },
    { label: 'Petit Formal Script', value: 'Petit Formal Script' },
    { label: 'Alex Brush', value: 'Alex Brush' },
];

const SUBTITLE_FONTS = [
    { label: 'Mapped Moment Script ❤', value: 'Mapped Moment Script' },
    { label: 'Montserrat', value: 'Montserrat' },
    { label: 'Raleway', value: 'Raleway' },
    { label: 'Poppins', value: 'Poppins' },
    { label: 'Nunito', value: 'Nunito' },
    { label: 'Oswald', value: 'Oswald' },
    { label: 'Space Mono', value: 'Space Mono' },
    { label: 'Playfair Display', value: 'Playfair Display' },
    { label: 'Cinzel', value: 'Cinzel' },
];

const DETAILS_FONTS = [
    { label: 'Montserrat', value: 'Montserrat' },
    { label: 'Raleway', value: 'Raleway' },
    { label: 'Lato', value: 'Lato' },
    { label: 'Space Mono', value: 'Space Mono' },
];

const DEDICATION_FONTS = [
    { label: 'Mapped Moment Script ❤', value: 'Mapped Moment Script' },
    { label: 'Great Vibes', value: 'Great Vibes' },
    { label: 'Sacramento', value: 'Sacramento' },
    { label: 'Dancing Script', value: 'Dancing Script' },
    { label: 'Pinyon Script', value: 'Pinyon Script' },
    { label: 'Allura', value: 'Allura' },
    { label: 'Petit Formal Script', value: 'Petit Formal Script' },
    { label: 'Alex Brush', value: 'Alex Brush' },
    { label: 'Playfair Display', value: 'Playfair Display' },
    { label: 'Cinzel', value: 'Cinzel' },
];

const SidebarControls: React.FC = () => {
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
        titleFontSize, setTitleFontSize,
        subtitleFontSize, setSubtitleFontSize,
        detailsFontSize, setDetailsFontSize,
        dedicationFontSize, setDedicationFontSize,
        titleOffsetY, setTitleOffsetY,
        subtitleOffsetY, setSubtitleOffsetY,
        detailsOffsetY, setDetailsOffsetY,
        dedicationOffsetY, setDedicationOffsetY,
        previewZoom, setPreviewZoom,
        shapeOutlineWidth, setShapeOutlineWidth,
        showFrame, setShowFrame,
        frameInset, setFrameInset,
        frameWidth, setFrameWidth,
        finelineWidth, setFinelineWidth,
        titleFont, setTitleFont,
        titleKerning, setTitleKerning,
        subtitleFont, setSubtitleFont,
        subtitleKerning, setSubtitleKerning,
        detailsFont, setDetailsFont,
        detailsKerning, setDetailsKerning,
        dedicationFont, setDedicationFont,
        dedicationKerning, setDedicationKerning,
        showDivider, setShowDivider,
        dividerLength, setDividerLength,
        dividerThickness, setDividerThickness,
        dividerOffsetY, setDividerOffsetY,
        selectedTemplate, setSelectedTemplate,
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
        activeTypoField, setActiveTypoField,
        showLocationPin, setShowLocationPin,
        locationPinSize, setLocationPinSize,
    } = useStore();

    const [locationQuery, setLocationQuery] = useState('');
    const [searchResults, setSearchResults] = useState<any[]>([]);
    const [isSearching, setIsSearching] = useState(false);
    const [showTitleSuggestions, setShowTitleSuggestions] = useState(false);
    const [showSubtitleSuggestions, setShowSubtitleSuggestions] = useState(false);
    const [showAllTitleSuggestions, setShowAllTitleSuggestions] = useState(false);
    const [showAllSubtitleSuggestions, setShowAllSubtitleSuggestions] = useState(false);

    // Typography tab — syncs when user clicks a text element in the poster
    const [typoTab, setTypoTab] = useState<'title' | 'subtitle' | 'details' | 'dedication'>('title');
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
    }, [activeTypoField]);

    // Close suggestions when clicking outside
    useEffect(() => {
        const handleClickOutside = () => {
            // This is handled by onBlur with delay, but global click listener can be a backup
            // For now, relying on onBlur with delay
        };
        document.addEventListener('click', handleClickOutside);
        return () => document.removeEventListener('click', handleClickOutside);
    }, []);

    const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const newDate = new Date(e.target.value);
        if (!isNaN(newDate.getTime())) {
            setDate(newDate);
        }
    };

    useEffect(() => {
        const delayDebounceFn = setTimeout(async () => {
            if (locationQuery.length > 2) {
                setIsSearching(true);
                try {
                    const response = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(locationQuery)}`);
                    const data = await response.json();
                    setSearchResults(data);
                } catch (error) {
                    console.error("Location search failed", error);
                } finally {
                    setIsSearching(false);
                }
            } else {
                setSearchResults([]);
            }
        }, 500);

        return () => clearTimeout(delayDebounceFn);
    }, [locationQuery]);

    const selectLocation = (result: any) => {
        setLocation(result.display_name.split(',')[0]);
        setLat(parseFloat(result.lat));
        setLng(parseFloat(result.lon));
        setSearchResults([]);
        setLocationQuery('');
    };

    const inputStyles = {
        bg: "white",
        border: "1px solid",
        borderColor: "gray.300",
        _focus: { borderColor: "gray.900", boxShadow: "none", bg: "white" },
        _hover: { borderColor: "gray.400" },
        borderRadius: "md",
        fontSize: "sm",
        color: "gray.900"
    };

    const labelStyles = {
        fontSize: "xs",
        fontWeight: "600",
        color: "gray.700",
        mb: 2
    };

    const toggleButtonStyles = (isActive: boolean) => ({
        size: "sm",
        flex: 1,
        variant: "outline",
        borderColor: isActive ? "gray.900" : "gray.300",
        color: isActive ? "white" : "gray.700",
        bg: isActive ? "gray.900" : "white",
        _hover: {
            bg: isActive ? "gray.800" : "gray.50",
            borderColor: isActive ? "gray.800" : "gray.400"
        },
        fontWeight: isActive ? "600" : "500",
        fontSize: "sm"
    });

    return (
        <Box w="full" h="full" bg="white" display="flex" flexDirection="column">
            {/* Header */}
            <Box p={6} borderBottom="1px" borderColor="gray.200">
                <Text fontSize="xl" fontWeight="bold" letterSpacing="tight" mb={3}>THE MAPPED MOMENT</Text>
                {/* Poster Type Toggle */}
                <HStack spacing={1}>
                    <Button
                        size="sm"
                        flex={1}
                        onClick={() => setPosterType('starmap')}
                        bg={posterType === 'starmap' ? 'gray.900' : 'white'}
                        color={posterType === 'starmap' ? 'white' : 'gray.700'}
                        border="1px solid"
                        borderColor={posterType === 'starmap' ? 'gray.900' : 'gray.300'}
                        fontWeight={posterType === 'starmap' ? '700' : '500'}
                        _hover={{ bg: posterType === 'starmap' ? 'gray.800' : 'gray.50' }}
                        fontSize="xs"
                        letterSpacing="wide"
                        px={2}
                    >
                        ✦ STAR MAP
                    </Button>
                    <Button
                        size="sm"
                        flex={1}
                        onClick={() => setPosterType('streetmap')}
                        bg={posterType === 'streetmap' ? 'gray.900' : 'white'}
                        color={posterType === 'streetmap' ? 'white' : 'gray.700'}
                        border="1px solid"
                        borderColor={posterType === 'streetmap' ? 'gray.900' : 'gray.300'}
                        fontWeight={posterType === 'streetmap' ? '700' : '500'}
                        _hover={{ bg: posterType === 'streetmap' ? 'gray.800' : 'gray.50' }}
                        fontSize="xs"
                        letterSpacing="wide"
                        px={2}
                    >
                        ⊕ STREET MAP
                    </Button>
                    <Button
                        size="sm"
                        flex={1}
                        onClick={() => setPosterType('coloredmap')}
                        bg={posterType === 'coloredmap' ? 'gray.900' : 'white'}
                        color={posterType === 'coloredmap' ? 'white' : 'gray.700'}
                        border="1px solid"
                        borderColor={posterType === 'coloredmap' ? 'gray.900' : 'gray.300'}
                        fontWeight={posterType === 'coloredmap' ? '700' : '500'}
                        _hover={{ bg: posterType === 'coloredmap' ? 'gray.800' : 'gray.50' }}
                        fontSize="xs"
                        letterSpacing="wide"
                        px={2}
                    >
                        ◈ COLORED MAP
                    </Button>
                </HStack>
            </Box>

            <Box flex="1" overflowY="auto">

                {/* ── Street/Colored Map Controls ──────────────────────── */}
                {posterType !== 'starmap' && (
                    <Box borderBottom="1px" borderColor="gray.200">
                        <Accordion allowToggle defaultIndex={[0]} allowMultiple>
                            <AccordionItem border="none" borderBottom="1px" borderColor="gray.100">
                                <h2>
                                    <AccordionButton _expanded={{ bg: 'gray.50' }} py={4} px={6}>
                                        <Box flex="1" textAlign="left" fontWeight="600" fontSize="sm" color="gray.900">
                                            Location
                                        </Box>
                                        <AccordionIcon color="gray.400" />
                                    </AccordionButton>
                                </h2>
                                <AccordionPanel pb={6} px={6}>
                                    <VStack spacing={4} align="stretch">
                                        <FormControl>
                                            <FormLabel fontSize="xs" fontWeight="600" color="gray.700" mb={2}>
                                                City
                                            </FormLabel>
                                            <CitySearch
                                                value={mapCity}
                                                onSelect={(r) => {
                                                    setMapCity(r.name);
                                                    setMapCenterLat(r.lat);
                                                    setMapCenterLng(r.lng);
                                                    // Also set star-map location fields for text display
                                                    setLocation(r.name + (r.state ? `, ${r.state}` : ''));
                                                    setLat(r.lat);
                                                    setLng(r.lng);
                                                }}
                                            />
                                        </FormControl>
                                        <HStack spacing={3}>
                                            <FormControl>
                                                <FormLabel fontSize="xs" fontWeight="600" color="gray.700" mb={2}>Lat</FormLabel>
                                                <Input
                                                    size="sm"
                                                    type="number"
                                                    step="0.0001"
                                                    value={mapCenterLat.toFixed(4)}
                                                    onChange={(e) => setMapCenterLat(parseFloat(e.target.value) || 0)}
                                                    bg="white" border="1px solid" borderColor="gray.300"
                                                    _focus={{ borderColor: 'gray.900', boxShadow: 'none' }}
                                                    borderRadius="md" fontSize="sm"
                                                />
                                            </FormControl>
                                            <FormControl>
                                                <FormLabel fontSize="xs" fontWeight="600" color="gray.700" mb={2}>Lng</FormLabel>
                                                <Input
                                                    size="sm"
                                                    type="number"
                                                    step="0.0001"
                                                    value={mapCenterLng.toFixed(4)}
                                                    onChange={(e) => setMapCenterLng(parseFloat(e.target.value) || 0)}
                                                    bg="white" border="1px solid" borderColor="gray.300"
                                                    _focus={{ borderColor: 'gray.900', boxShadow: 'none' }}
                                                    borderRadius="md" fontSize="sm"
                                                />
                                            </FormControl>
                                        </HStack>
                                        <FormControl>
                                            <FormLabel fontSize="xs" fontWeight="600" color="gray.700" mb={2}>
                                                Zoom: {mapZoom}
                                            </FormLabel>
                                            <Slider value={mapZoom} min={10} max={18} step={0.5} onChange={setMapZoom} aria-label="map-zoom">
                                                <SliderTrack bg="gray.200"><SliderFilledTrack bg="gray.900" /></SliderTrack>
                                                <SliderThumb boxSize={3} borderColor="gray.300" borderWidth="1px" />
                                            </Slider>
                                        </FormControl>
                                        <HStack justify="space-between">
                                            <Text fontSize="xs" fontWeight="600" color="gray.700">Location Pin</Text>
                                            <Switch size="sm" isChecked={showLocationPin} onChange={(e) => setShowLocationPin(e.target.checked)}
                                                sx={{ '.chakra-switch__track': { bg: 'gray.300' }, '.chakra-switch__track[data-checked]': { bg: 'gray.900' } }} />
                                        </HStack>
                                        {showLocationPin && (
                                            <FormControl>
                                                <FormLabel fontSize="xs" fontWeight="600" color="gray.700" mb={2}>
                                                    Pin Size: {locationPinSize}px
                                                </FormLabel>
                                                <Slider value={locationPinSize} min={10} max={80} step={1} onChange={setLocationPinSize} aria-label="pin-size">
                                                    <SliderTrack bg="gray.200"><SliderFilledTrack bg="gray.900" /></SliderTrack>
                                                    <SliderThumb boxSize={3} borderColor="gray.300" borderWidth="1px" />
                                                </Slider>
                                            </FormControl>
                                        )}
                                    </VStack>
                                </AccordionPanel>
                            </AccordionItem>

                            {/* 2-color presets — only shown in Street Map mode (not colored map) */}
                            {posterType === 'streetmap' && <AccordionItem border="none">
                                <h2>
                                    <AccordionButton _expanded={{ bg: 'gray.50' }} py={4} px={6}>
                                        <Box flex="1" textAlign="left" fontWeight="600" fontSize="sm" color="gray.900">
                                            Map Colors
                                        </Box>
                                        <AccordionIcon color="gray.400" />
                                    </AccordionButton>
                                </h2>
                                <AccordionPanel pb={6} px={6}>
                                    <VStack spacing={4} align="stretch">
                                        {/* Color presets — one-click coordinated color themes */}
                                        <Grid templateColumns="repeat(4, 1fr)" gap={2}>
                                            {MAP_COLOR_PRESETS.map((preset) => (
                                                <Box
                                                    key={preset.id}
                                                    as="button"
                                                    onClick={() => {
                                                        setMapColorPreset(preset.id);
                                                        setMapBgColor(preset.bgColor);
                                                        setMapStreetColor(preset.streetColor);
                                                        // Realistic uses a prebuilt style URL; all others use 2-color custom style
                                                        setMapStyleUrl(preset.styleUrl ?? null);
                                                        if (!preset.styleUrl) {
                                                            setPosterColor(preset.bgColor);
                                                            setTextColor(preset.id === 'classic' ? '#1a1a1a' : '#ffffff');
                                                        } else {
                                                            // Realistic: light poster bg, dark text to complement the colourful map
                                                            setPosterColor('#ffffff');
                                                            setTextColor('#1a1a1a');
                                                        }
                                                    }}
                                                    borderRadius="md"
                                                    border="2px solid"
                                                    borderColor={mapColorPreset === preset.id ? 'blue.400' : 'gray.200'}
                                                    overflow="hidden"
                                                    h="44px"
                                                    position="relative"
                                                    title={preset.name}
                                                    _hover={{ borderColor: 'gray.400' }}
                                                    transition="all 0.15s"
                                                >
                                                    {preset.styleUrl ? (
                                                        // Realistic preset — show a multicolour gradient swatch
                                                        <Box
                                                            h="28px"
                                                            style={{ background: 'linear-gradient(135deg, #AECFE2 0%, #d8e8c8 30%, #f8f4f0 50%, #fea 70%, #fc8 100%)' }}
                                                        />
                                                    ) : (
                                                        <Box h="28px" bg={preset.bgColor} />
                                                    )}
                                                    <Box h="16px" bg="white" display="flex" alignItems="center" justifyContent="center">
                                                        <Text fontSize="7px" fontWeight="700" color="gray.600">{preset.name.toUpperCase()}</Text>
                                                    </Box>
                                                </Box>
                                            ))}
                                        </Grid>
                                        <Text fontSize="xs" color="gray.500">Fine-tune colors in the Color section below.</Text>
                                    </VStack>
                                </AccordionPanel>
                            </AccordionItem>}
                        </Accordion>
                    </Box>
                )}

                <Accordion allowToggle defaultIndex={[0]} allowMultiple>
                    {/* Moment Section — only shown for star maps */}
                    {posterType === 'starmap' && (
                    <AccordionItem border="none" borderBottom="1px" borderColor="gray.200">
                        <h2>
                            <AccordionButton _expanded={{ bg: 'gray.50' }} py={4} px={6}>
                                <Box flex="1" textAlign="left" fontWeight="600" fontSize="sm" color="gray.900">
                                    Moment
                                </Box>
                                <AccordionIcon color="gray.400" />
                            </AccordionButton>
                        </h2>
                        <AccordionPanel pb={6} px={6}>
                            <VStack spacing={5} align="stretch">
                                {/* Location Search */}
                                <FormControl>
                                    <FormLabel {...labelStyles}>Location</FormLabel>
                                    <Box position="relative">
                                        <InputGroup>
                                            <Input
                                                value={locationQuery}
                                                onChange={(e) => setLocationQuery(e.target.value)}
                                                placeholder="Search city (e.g. New York)"
                                                {...inputStyles}
                                            />
                                            {isSearching && <InputRightElement><Spinner size="sm" color="gray.600" /></InputRightElement>}
                                        </InputGroup>
                                        {searchResults.length > 0 && (
                                            <Box
                                                position="absolute"
                                                zIndex={10}
                                                w="full"
                                                mt={1}
                                                bg="white"
                                                border="1px"
                                                borderColor="gray.300"
                                                borderRadius="md"
                                                boxShadow="lg"
                                                maxH="48"
                                                overflowY="auto"
                                            >
                                                {searchResults.map((result, index) => (
                                                    <Box
                                                        key={index}
                                                        as="button"
                                                        w="full"
                                                        textAlign="left"
                                                        px={4}
                                                        py={2}
                                                        _hover={{ bg: 'gray.100' }}
                                                        fontSize="sm"
                                                        onClick={() => selectLocation(result)}
                                                        transition="all 0.15s"
                                                    >
                                                        {result.display_name}
                                                    </Box>
                                                ))}
                                            </Box>
                                        )}
                                    </Box>
                                </FormControl>

                                <HStack spacing={4}>
                                    <FormControl>
                                        <FormLabel {...labelStyles}>Date</FormLabel>
                                        <Input
                                            type="date"
                                            value={format(date, 'yyyy-MM-dd')}
                                            onChange={handleDateChange}
                                            {...inputStyles}
                                        />
                                    </FormControl>
                                    <FormControl>
                                        <FormLabel {...labelStyles}>Time</FormLabel>
                                        <Input
                                            type="time"
                                            value={time}
                                            onChange={(e) => setTime(e.target.value)}
                                            {...inputStyles}
                                        />
                                    </FormControl>
                                </HStack>

                                <FormControl>
                                    <FormLabel {...labelStyles}>Title</FormLabel>
                                    <Box position="relative">
                                        <InputGroup>
                                            <Input
                                                value={customText.title || title}
                                                onChange={(e) => {
                                                    setTitle(e.target.value);
                                                    setCustomText('title', e.target.value);
                                                    setShowAllTitleSuggestions(false);
                                                    setShowTitleSuggestions(true);
                                                }}
                                                onFocus={() => setShowTitleSuggestions(true)}
                                                onBlur={() => setTimeout(() => setShowTitleSuggestions(false), 200)}
                                                placeholder="Our Night Sky"
                                                name="starmap-title-custom"
                                                autoComplete="off"
                                                {...inputStyles}
                                            />
                                            <InputRightElement>
                                                <Box
                                                    as="button"
                                                    onClick={() => {
                                                        setShowAllTitleSuggestions(true);
                                                        setShowTitleSuggestions(!showTitleSuggestions);
                                                    }}
                                                    color="gray.500"
                                                    _hover={{ color: "gray.700" }}
                                                >
                                                    <ChevronDown size={16} />
                                                </Box>
                                            </InputRightElement>
                                        </InputGroup>
                                        {showTitleSuggestions && (
                                            <List
                                                position="absolute"
                                                zIndex={10}
                                                w="full"
                                                mt={1}
                                                bg="white"
                                                border="1px"
                                                borderColor="gray.300"
                                                borderRadius="md"
                                                boxShadow="lg"
                                                maxH="48"
                                                overflowY="auto"
                                            >
                                                {(showAllTitleSuggestions ? TITLE_SUGGESTIONS : TITLE_SUGGESTIONS.filter(s => s.toLowerCase().includes((customText.title || title).toLowerCase()))).map((suggestion, index) => (
                                                    <ListItem
                                                        key={index}
                                                        px={4}
                                                        py={2}
                                                        _hover={{ bg: 'gray.100', cursor: 'pointer' }}
                                                        fontSize="sm"
                                                        onMouseDown={() => {
                                                            setTitle(suggestion);
                                                            setCustomText('title', suggestion);
                                                            setShowTitleSuggestions(false);
                                                        }}
                                                    >
                                                        {suggestion}
                                                    </ListItem>
                                                ))}
                                            </List>
                                        )}
                                    </Box>
                                </FormControl>
                                <FormControl>
                                    <FormLabel {...labelStyles}>Subtitle</FormLabel>
                                    <Box position="relative">
                                        <InputGroup>
                                            <Input
                                                value={customText.subtitle || subtitle}
                                                onChange={(e) => {
                                                    setSubtitle(e.target.value);
                                                    setCustomText('subtitle', e.target.value);
                                                    setShowAllSubtitleSuggestions(false);
                                                    setShowSubtitleSuggestions(true);
                                                }}
                                                onFocus={() => setShowSubtitleSuggestions(true)}
                                                onBlur={() => setTimeout(() => setShowSubtitleSuggestions(false), 200)}
                                                placeholder="A Moment to Remember"
                                                name="starmap-subtitle-custom"
                                                autoComplete="off"
                                                {...inputStyles}
                                            />
                                            <InputRightElement>
                                                <Box
                                                    as="button"
                                                    onClick={() => {
                                                        setShowAllSubtitleSuggestions(true);
                                                        setShowSubtitleSuggestions(!showSubtitleSuggestions);
                                                    }}
                                                    color="gray.500"
                                                    _hover={{ color: "gray.700" }}
                                                >
                                                    <ChevronDown size={16} />
                                                </Box>
                                            </InputRightElement>
                                        </InputGroup>
                                        {showSubtitleSuggestions && (
                                            <List
                                                position="absolute"
                                                zIndex={10}
                                                w="full"
                                                mt={1}
                                                bg="white"
                                                border="1px"
                                                borderColor="gray.300"
                                                borderRadius="md"
                                                boxShadow="lg"
                                                maxH="48"
                                                overflowY="auto"
                                            >
                                                {(showAllSubtitleSuggestions ? SUBTITLE_SUGGESTIONS : SUBTITLE_SUGGESTIONS.filter(s => s.toLowerCase().includes((customText.subtitle || subtitle).toLowerCase()))).map((suggestion, index) => (
                                                    <ListItem
                                                        key={index}
                                                        px={4}
                                                        py={2}
                                                        _hover={{ bg: 'gray.100', cursor: 'pointer' }}
                                                        fontSize="sm"
                                                        onMouseDown={() => {
                                                            setSubtitle(suggestion);
                                                            setCustomText('subtitle', suggestion);
                                                            setShowSubtitleSuggestions(false);
                                                        }}
                                                    >
                                                        {suggestion}
                                                    </ListItem>
                                                ))}
                                            </List>
                                        )}
                                    </Box>
                                </FormControl>

                                <Box>
                                    <FormLabel {...labelStyles}>Visibility</FormLabel>
                                    <HStack spacing={2}>
                                        <Button
                                            onClick={() => setShowDate(!showDate)}
                                            {...toggleButtonStyles(showDate)}
                                        >
                                            Date
                                        </Button>
                                        <Button
                                            onClick={() => setShowLocation(!showLocation)}
                                            {...toggleButtonStyles(showLocation)}
                                        >
                                            Location
                                        </Button>
                                        <Button
                                            onClick={() => setShowCoords(!showCoords)}
                                            {...toggleButtonStyles(showCoords)}
                                        >
                                            Coords
                                        </Button>
                                    </HStack>
                                </Box>



                                <Accordion allowToggle border="none">
                                    <AccordionItem border="none">
                                        <AccordionButton px={0} _hover={{ bg: 'transparent' }}>
                                            <Box flex="1" textAlign="left" fontSize="xs" color="gray.600" fontWeight="600">
                                                Advanced Text Options
                                            </Box>
                                            <AccordionIcon color="gray.500" />
                                        </AccordionButton>
                                        <AccordionPanel pb={4} px={0}>
                                            <VStack spacing={4}>
                                                <FormControl>
                                                    <FormLabel {...labelStyles}>Custom Date Text</FormLabel>
                                                    <Input
                                                        value={customText.date}
                                                        onChange={(e) => setCustomText('date', e.target.value)}
                                                        placeholder={format(date, 'MMMM do, yyyy').toUpperCase()}
                                                        name="custom-date-text-unique"
                                                        autoComplete="new-password"
                                                        {...inputStyles}
                                                    />
                                                </FormControl>
                                                <FormControl>
                                                    <FormLabel {...labelStyles}>Custom Location Text</FormLabel>
                                                    <Input
                                                        value={customText.location}
                                                        onChange={(e) => setCustomText('location', e.target.value)}
                                                        placeholder={location ? location.toUpperCase() : 'Location'}
                                                        autoComplete="new-password"
                                                        {...inputStyles}
                                                    />
                                                </FormControl>
                                                <FormControl>
                                                    <FormLabel {...labelStyles}>Custom Coordinates</FormLabel>
                                                    <Input
                                                        value={customText.coords}
                                                        onChange={(e) => setCustomText('coords', e.target.value)}
                                                        placeholder="0.0000° N, 0.0000° E"
                                                        autoComplete="new-password"
                                                        {...inputStyles}
                                                    />
                                                </FormControl>
                                                <FormControl>
                                                    <FormLabel {...labelStyles}>Personal Dedication</FormLabel>
                                                    <Textarea
                                                        value={customText.dedication}
                                                        onChange={(e) => setCustomText('dedication', e.target.value)}
                                                        placeholder="Add a special message at the bottom..."
                                                        {...inputStyles}
                                                        resize="none"
                                                        rows={3}
                                                    />
                                                </FormControl>
                                            </VStack>
                                        </AccordionPanel>
                                    </AccordionItem>
                                </Accordion>
                            </VStack>
                        </AccordionPanel>
                    </AccordionItem>
                    )}

                    {/* Templates Section */}
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
                                    {
                                        id: 'classic-dark',
                                        label: 'Classic Dark',
                                        bg: '#1B2735',
                                        text: '#ffffff',
                                        shape: 'circle',
                                        border: 'simple',
                                        mapBg: null,
                                        font: 'Lato'
                                    },
                                    {
                                        id: 'love-dark',
                                        label: 'Love Dark',
                                        bg: '#0f172a',
                                        text: '#ffffff',
                                        shape: 'heart',
                                        border: 'simple',
                                        mapBg: null,
                                        font: 'Great Vibes'
                                    },
                                    {
                                        id: 'modern-white',
                                        label: 'Modern White',
                                        bg: '#ffffff',
                                        text: '#000000',
                                        shape: 'circle',
                                        border: 'double-offset',
                                        mapBg: null,
                                        font: 'Great Vibes'
                                    },
                                    {
                                        id: 'home-street',
                                        label: 'Home Street',
                                        bg: '#ffffff',
                                        text: '#111111',
                                        shape: 'house',
                                        border: 'simple',
                                        mapBg: null,
                                        font: 'Cinzel'
                                    },
                                ].map((template) => (
                                    <VStack
                                        key={template.id}
                                        as="div"
                                        spacing={2}
                                    >
                                        <Box
                                            as="button"
                                            w="full"
                                            h={24}
                                            bg={template.bg}
                                            borderRadius="md"
                                            borderWidth={2}
                                            borderColor={selectedTemplate === template.id ? 'blue.500' : 'gray.200'}
                                            position="relative"
                                            overflow="hidden"
                                            _hover={{ borderColor: 'blue.400', cursor: 'pointer' }}
                                            display="flex"
                                            alignItems="center"
                                            justifyContent="center"
                                            onClick={() => {
                                                // Save current settings
                                                saveTemplateSettings(selectedTemplate);
                                                // Set new template
                                                setSelectedTemplate(template.id);
                                                // Check for custom defaults
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
                                                    // Apply built-in defaults
                                                    setPosterColor(template.bg);
                                                    setMapInteriorColor(template.id === 'modern-white' ? '#1B2735' : template.bg);
                                                    setTextColor(template.text);
                                                    setMaskShape(template.shape as any);
                                                    setBorderStyle(template.border as any);
                                                    setMapBackgroundImage(template.mapBg);

                                                    // Auto-enable divider for Modern White
                                                    if (template.id === 'modern-white') {
                                                        setShowDivider(true);
                                                    } else {
                                                        setShowDivider(false);
                                                    }

                                                    if (template.id === 'modern-white') {
                                                        setIsLightMode(false);
                                                        setStarColor('#ffffff');
                                                        setShowFrame(true);
                                                        setFrameWidth(1);
                                                        setFrameInset(20);
                                                        setShapeOutlineWidth(0);
                                                        setStarScale(1.6);
                                                        setLineWeight(0.8);
                                                        setTitleFontSize(56);
                                                        setSubtitleFontSize(16);
                                                        setDetailsFontSize(12);
                                                        setDedicationFontSize(13);
                                                        setTitleOffsetY(0);
                                                        setSubtitleOffsetY(0);
                                                        setDetailsOffsetY(0);
                                                        setDedicationOffsetY(0);
                                                        setSubtitleFont('DM Sans');
                                                        setDetailsFont('DM Sans');
                                                        setDedicationFont('Cormorant Garamond');
                                                        setTitleFont('Cormorant Garamond');
                                                    } else if (template.id === 'love-dark') {
                                                        setIsLightMode(false);
                                                        setStarColor('#ffffff');
                                                        setShowFrame(true);
                                                        setFrameWidth(5);
                                                        setShapeOutlineWidth(2);
                                                        setStarScale(1.9);
                                                        setLineWeight(1.0);
                                                        setTitleFontSize(48);
                                                        setTitleOffsetY(0);
                                                        setSubtitleOffsetY(0);
                                                        setDetailsOffsetY(0);
                                                        setSubtitleFont('Lato');
                                                        setDetailsFont('Lato');
                                                        setTitleFont('Playfair Display');
                                                    } else if (template.id === 'home-street') {
                                                        setPosterType('coloredmap');
                                                        setIsLightMode(false);
                                                        setShowFrame(true);
                                                        setFrameWidth(3);
                                                        setFrameInset(16);
                                                        setShapeOutlineWidth(3);
                                                        setTitleFontSize(52);
                                                        setSubtitleFontSize(14);
                                                        setDetailsFontSize(12);
                                                        setDedicationFontSize(13);
                                                        setTitleOffsetY(0);
                                                        setSubtitleOffsetY(0);
                                                        setDetailsOffsetY(0);
                                                        setDedicationOffsetY(0);
                                                        setSubtitleFont('DM Sans');
                                                        setDetailsFont('DM Sans');
                                                        setDedicationFont('DM Sans');
                                                        setTitleFont('Cinzel');
                                                        setShowDivider(true);
                                                        setMapBgColor('#f8f4f0');
                                                        setMapStreetColor('#fc8');
                                                        setPosterColor('#ffffff');
                                                        setTextColor('#1a1a1a');
                                                        setMapColorPreset('realistic');
                                                        setMapStyleUrl('https://tiles.openfreemap.org/styles/bright');
                                                    } else {
                                                        setIsLightMode(false);
                                                        setStarColor('#ffffff');
                                                        setShowFrame(true);
                                                        setFrameWidth(5);
                                                        setShapeOutlineWidth(2);
                                                        setStarScale(1.5);
                                                        setTitleFontSize(48);
                                                        setTitleOffsetY(0);
                                                        setSubtitleOffsetY(0);
                                                        setDetailsOffsetY(0);
                                                        setSubtitleFont('Lato');
                                                        setDetailsFont('Lato');
                                                        setTitleFont('Lato');
                                                    }
                                                }
                                            }}
                                        >
                                            {/* Mini preview representation */}
                                            <Box
                                                w={16}
                                                h={16}
                                                bg={template.id === 'modern-white' ? '#CBD5E0' : template.id === 'home-street' ? '#CBD5E0' : (template.mapBg ? `url(${template.mapBg})` : (template.bg === '#ffffff' ? '#000' : '#fff'))}
                                                backgroundSize="cover"
                                                borderRadius={template.shape === 'circle' ? 'full' : 'none'}
                                                opacity={0.9}
                                                pointerEvents="none"
                                                style={{
                                                    clipPath: template.shape === 'heart'
                                                        ? 'path("M32 56.93l-3.86-3.52C14.4 40.96 5.33 32.75 5.33 22.67 5.33 14.45 11.78 8 20 8c4.64 0 9.09 2.16 12 5.57C34.91 10.16 39.36 8 44 8c8.22 0 14.67 6.45 14.67 14.67 0 10.08-9.07 18.29-22.8 30.77L32 56.93z")'
                                                        : template.shape === 'house'
                                                        ? 'polygon(20% 90%, 20% 40%, 10% 40%, 50% 0%, 60% 10%, 60% 2%, 70% 2%, 70% 20%, 90% 40%, 80% 40%, 80% 90%)'
                                                        : undefined
                                                }}
                                            />
                                        </Box>
                                        <VStack w="full" spacing={1}>
                                            <Button
                                                w="full"
                                                size="xs"
                                                variant="outline"
                                                borderColor={selectedTemplate === template.id ? 'blue.500' : 'gray.300'}
                                                color={selectedTemplate === template.id ? 'blue.600' : 'gray.700'}
                                                _hover={{ borderColor: 'blue.400', bg: 'blue.50' }}
                                                onClick={() => {
                                                    // 1. Save current settings for the previous template
                                                    saveTemplateSettings(selectedTemplate);

                                                    // 2. Set new template ID
                                                    setSelectedTemplate(template.id);

                                                    // 3. Check if we have saved custom defaults first
                                                    const customDefaults = loadTemplateDefaults(template.id);

                                                    if (customDefaults) {
                                                        // Apply custom defaults
                                                        Object.keys(customDefaults).forEach(key => {
                                                            const value = customDefaults[key as keyof typeof customDefaults];
                                                            if (value !== undefined) {
                                                                const setter = `set${key.charAt(0).toUpperCase()}${key.slice(1)}`;
                                                                // @ts-ignore
                                                                if (typeof useStore.getState()[setter] === 'function') {
                                                                    // @ts-ignore
                                                                    useStore.getState()[setter](value);
                                                                }
                                                            }
                                                        });
                                                    } else if (templateSettings[template.id]) {
                                                        // Fallback to session settings
                                                        restoreTemplateSettings(template.id);
                                                    } else {
                                                        // Apply built-in defaults
                                                        setPosterColor(template.bg);
                                                        setMapInteriorColor(template.bg); // Default interior to match poster
                                                        setTextColor(template.text);
                                                        setMaskShape(template.shape as any);
                                                        setBorderStyle(template.border as any);
                                                        setMapBackgroundImage(template.mapBg);
                                                        setTitleFont(template.font);

                                                        // Specific tweaks per template
                                                        if (template.id === 'modern-white') {
                                                            setIsLightMode(false);
                                                            setStarColor('#ffffff');
                                                            setShowFrame(true);
                                                            setFrameWidth(1);
                                                            setFrameInset(20);
                                                            setShapeOutlineWidth(0); setStarScale(1.6);
                                                            setLineWeight(0.8);
                                                            setTitleFontSize(56);
                                                            setSubtitleFontSize(16);
                                                            setDetailsFontSize(12);
                                                            setDedicationFontSize(13);
                                                            setTitleOffsetY(0);
                                                            setSubtitleOffsetY(0);
                                                            setDetailsOffsetY(0);
                                                            setDedicationOffsetY(0);
                                                            setSubtitleFont('DM Sans');
                                                            setDetailsFont('DM Sans');
                                                            setDedicationFont('Cormorant Garamond');
                                                            setTitleFont('Cormorant Garamond');
                                                        } else if (template.id === 'love-dark') {
                                                            setIsLightMode(false);
                                                            setStarColor('#ffffff');
                                                            setShowFrame(true);
                                                            setFrameWidth(5);
                                                            setShapeOutlineWidth(2);
                                                            setStarScale(1.9);
                                                            setLineWeight(1.0);
                                                            setTitleFontSize(48);
                                                            setTitleOffsetY(0);
                                                            setSubtitleOffsetY(0);
                                                            setDetailsOffsetY(0);
                                                            setSubtitleFont('Lato');
                                                            setDetailsFont('Lato');
                                                            setTitleFont('Playfair Display');
                                                        } else if (template.id === 'home-street') {
                                                            setPosterType('streetmap');
                                                            setIsLightMode(false);
                                                            setShowFrame(true);
                                                            setFrameWidth(3);
                                                            setFrameInset(16);
                                                            setShapeOutlineWidth(3);
                                                            setTitleFontSize(52);
                                                            setSubtitleFontSize(14);
                                                            setDetailsFontSize(12);
                                                            setDedicationFontSize(13);
                                                            setTitleOffsetY(0);
                                                            setSubtitleOffsetY(0);
                                                            setDetailsOffsetY(0);
                                                            setDedicationOffsetY(0);
                                                            setSubtitleFont('DM Sans');
                                                            setDetailsFont('DM Sans');
                                                            setDedicationFont('DM Sans');
                                                            setTitleFont('Cinzel');
                                                            setShowDivider(true);
                                                            setMapBgColor('#f8f4f0');
                                                            setMapStreetColor('#fc8');
                                                            setPosterColor('#ffffff');
                                                            setTextColor('#1a1a1a');
                                                            setMapColorPreset('realistic');
                                                            setMapStyleUrl('https://tiles.openfreemap.org/styles/bright');
                                                        } else {
                                                            setIsLightMode(false);
                                                            setStarColor('#ffffff');
                                                            setShowFrame(true);
                                                            setFrameWidth(5);
                                                            setShapeOutlineWidth(2);
                                                            setStarScale(1.5);
                                                            setTitleFontSize(48);
                                                            setTitleOffsetY(0);
                                                            setSubtitleOffsetY(0);
                                                            setDetailsOffsetY(0);
                                                            setSubtitleFont('Lato');
                                                            setDetailsFont('Lato');
                                                            setTitleFont('Lato');
                                                        }
                                                    }
                                                }}
                                            >
                                                <Text fontSize="xs" fontWeight="600">{template.label}</Text>
                                            </Button>
                                            <Button
                                                w="full"
                                                size="xs"
                                                colorScheme="green"
                                                variant="ghost"
                                                fontSize="10px"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    saveTemplateDefaults(template.id);
                                                    alert(`Saved current settings as default for ${template.label}`);
                                                }}
                                            >
                                                💾 Save as Default
                                            </Button>
                                        </VStack>
                                    </VStack>
                                ))}
                            </Grid>
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
                            <VStack spacing={4} align="stretch">
                                {/* Tab strip */}
                                <HStack spacing={1}>
                                    {(['title', 'subtitle', 'details', 'dedication'] as const).map((tab) => (
                                        <Button
                                            key={tab}
                                            size="xs"
                                            flex={1}
                                            onClick={() => setTypoTab(tab)}
                                            bg={typoTab === tab ? 'gray.900' : 'white'}
                                            color={typoTab === tab ? 'white' : 'gray.600'}
                                            border="1px solid"
                                            borderColor={typoTab === tab ? 'gray.900' : 'gray.300'}
                                            _hover={{ bg: typoTab === tab ? 'gray.800' : 'gray.50' }}
                                            borderRadius="md"
                                            textTransform="capitalize"
                                        >
                                            {tab}
                                        </Button>
                                    ))}
                                </HStack>

                                {/* Title tab */}
                                {typoTab === 'title' && (
                                    <VStack spacing={3}>
                                        <FormControl>
                                            <FormLabel {...labelStyles}>Font Family</FormLabel>
                                            <Select size="sm" value={titleFont} onChange={(e) => setTitleFont(e.target.value)} bg="white" borderColor="gray.300" _hover={{ borderColor: 'gray.400' }}>
                                                {TITLE_FONTS.map(f => <option key={f.value} value={f.value}>{f.label}</option>)}
                                            </Select>
                                        </FormControl>
                                        <Box w="full">
                                            <HStack justify="space-between" mb={1}>
                                                <Text fontSize="xs" color="gray.700" fontWeight="500">Font Size</Text>
                                                <Text fontSize="xs" color="gray.500">{titleFontSize}px</Text>
                                            </HStack>
                                            <Slider value={titleFontSize} min={24} max={300} step={1} onChange={setTitleFontSize}>
                                                <SliderTrack bg="gray.200"><SliderFilledTrack bg="gray.900" /></SliderTrack>
                                                <SliderThumb boxSize={3} borderColor="gray.300" borderWidth="2px" />
                                            </Slider>
                                        </Box>
                                        <Box w="full">
                                            <HStack justify="space-between" mb={1}>
                                                <Text fontSize="xs" color="gray.700" fontWeight="500">Kerning</Text>
                                                <Text fontSize="xs" color="gray.500">{titleKerning.toFixed(2)}em</Text>
                                            </HStack>
                                            <Slider value={titleKerning} min={-0.1} max={0.5} step={0.01} onChange={setTitleKerning}>
                                                <SliderTrack bg="gray.200"><SliderFilledTrack bg="gray.900" /></SliderTrack>
                                                <SliderThumb boxSize={3} borderColor="gray.300" borderWidth="2px" />
                                            </Slider>
                                        </Box>
                                        <Box w="full">
                                            <HStack justify="space-between" mb={1}>
                                                <Text fontSize="xs" color="gray.700" fontWeight="500">Vertical Offset</Text>
                                                <Text fontSize="xs" color="gray.500">{titleOffsetY}px</Text>
                                            </HStack>
                                            <Slider value={titleOffsetY} min={-100} max={100} step={1} onChange={setTitleOffsetY}>
                                                <SliderTrack bg="gray.200"><SliderFilledTrack bg="gray.900" /></SliderTrack>
                                                <SliderThumb boxSize={3} borderColor="gray.300" borderWidth="2px" />
                                            </Slider>
                                        </Box>
                                        {titleFont === 'Mapped Moment Script' && <GlyphPicker defaultField="title" />}
                                    </VStack>
                                )}

                                {/* Subtitle tab */}
                                {typoTab === 'subtitle' && (
                                    <VStack spacing={3}>
                                        <FormControl>
                                            <FormLabel {...labelStyles}>Font Family</FormLabel>
                                            <Select size="sm" value={subtitleFont} onChange={(e) => setSubtitleFont(e.target.value)} bg="white" borderColor="gray.300" _hover={{ borderColor: 'gray.400' }}>
                                                {SUBTITLE_FONTS.map(f => <option key={f.value} value={f.value}>{f.label}</option>)}
                                            </Select>
                                        </FormControl>
                                        <Box w="full">
                                            <HStack justify="space-between" mb={1}>
                                                <Text fontSize="xs" color="gray.700" fontWeight="500">Font Size</Text>
                                                <Text fontSize="xs" color="gray.500">{subtitleFontSize}px</Text>
                                            </HStack>
                                            <Slider value={subtitleFontSize} min={16} max={200} step={1} onChange={setSubtitleFontSize}>
                                                <SliderTrack bg="gray.200"><SliderFilledTrack bg="gray.900" /></SliderTrack>
                                                <SliderThumb boxSize={3} borderColor="gray.300" borderWidth="2px" />
                                            </Slider>
                                        </Box>
                                        <Box w="full">
                                            <HStack justify="space-between" mb={1}>
                                                <Text fontSize="xs" color="gray.700" fontWeight="500">Kerning</Text>
                                                <Text fontSize="xs" color="gray.500">{subtitleKerning.toFixed(2)}em</Text>
                                            </HStack>
                                            <Slider value={subtitleKerning} min={-0.1} max={0.5} step={0.01} onChange={setSubtitleKerning}>
                                                <SliderTrack bg="gray.200"><SliderFilledTrack bg="gray.900" /></SliderTrack>
                                                <SliderThumb boxSize={3} borderColor="gray.300" borderWidth="2px" />
                                            </Slider>
                                        </Box>
                                        <Box w="full">
                                            <HStack justify="space-between" mb={1}>
                                                <Text fontSize="xs" color="gray.700" fontWeight="500">Vertical Offset</Text>
                                                <Text fontSize="xs" color="gray.500">{subtitleOffsetY}px</Text>
                                            </HStack>
                                            <Slider value={subtitleOffsetY} min={-50} max={50} step={1} onChange={setSubtitleOffsetY}>
                                                <SliderTrack bg="gray.200"><SliderFilledTrack bg="gray.900" /></SliderTrack>
                                                <SliderThumb boxSize={3} borderColor="gray.300" borderWidth="2px" />
                                            </Slider>
                                        </Box>
                                        {subtitleFont === 'Mapped Moment Script' && <GlyphPicker defaultField="subtitle" />}
                                    </VStack>
                                )}

                                {/* Details tab */}
                                {typoTab === 'details' && (
                                    <VStack spacing={3}>
                                        <FormControl>
                                            <FormLabel {...labelStyles}>Font Family</FormLabel>
                                            <Select size="sm" value={detailsFont} onChange={(e) => setDetailsFont(e.target.value)} bg="white" borderColor="gray.300" _hover={{ borderColor: 'gray.400' }}>
                                                {DETAILS_FONTS.map(f => <option key={f.value} value={f.value}>{f.label}</option>)}
                                            </Select>
                                        </FormControl>
                                        <Box w="full">
                                            <HStack justify="space-between" mb={1}>
                                                <Text fontSize="xs" color="gray.700" fontWeight="500">Font Size</Text>
                                                <Text fontSize="xs" color="gray.500">{detailsFontSize}px</Text>
                                            </HStack>
                                            <Slider value={detailsFontSize} min={12} max={48} step={1} onChange={setDetailsFontSize}>
                                                <SliderTrack bg="gray.200"><SliderFilledTrack bg="gray.900" /></SliderTrack>
                                                <SliderThumb boxSize={3} borderColor="gray.300" borderWidth="2px" />
                                            </Slider>
                                        </Box>
                                        <Box w="full">
                                            <HStack justify="space-between" mb={1}>
                                                <Text fontSize="xs" color="gray.700" fontWeight="500">Kerning</Text>
                                                <Text fontSize="xs" color="gray.500">{detailsKerning.toFixed(2)}em</Text>
                                            </HStack>
                                            <Slider value={detailsKerning} min={-0.1} max={0.5} step={0.01} onChange={setDetailsKerning}>
                                                <SliderTrack bg="gray.200"><SliderFilledTrack bg="gray.900" /></SliderTrack>
                                                <SliderThumb boxSize={3} borderColor="gray.300" borderWidth="2px" />
                                            </Slider>
                                        </Box>
                                        <Box w="full">
                                            <HStack justify="space-between" mb={1}>
                                                <Text fontSize="xs" color="gray.700" fontWeight="500">Vertical Offset</Text>
                                                <Text fontSize="xs" color="gray.500">{detailsOffsetY}px</Text>
                                            </HStack>
                                            <Slider value={detailsOffsetY} min={-50} max={50} step={1} onChange={setDetailsOffsetY}>
                                                <SliderTrack bg="gray.200"><SliderFilledTrack bg="gray.900" /></SliderTrack>
                                                <SliderThumb boxSize={3} borderColor="gray.300" borderWidth="2px" />
                                            </Slider>
                                        </Box>
                                    </VStack>
                                )}

                                {/* Dedication tab */}
                                {typoTab === 'dedication' && (
                                    <VStack spacing={3}>
                                        <FormControl>
                                            <FormLabel {...labelStyles}>Font Family</FormLabel>
                                            <Select size="sm" value={dedicationFont} onChange={(e) => setDedicationFont(e.target.value)} bg="white" borderColor="gray.300" _hover={{ borderColor: 'gray.400' }}>
                                                {DEDICATION_FONTS.map(f => <option key={f.value} value={f.value}>{f.label}</option>)}
                                            </Select>
                                        </FormControl>
                                        <Box w="full">
                                            <HStack justify="space-between" mb={1}>
                                                <Text fontSize="xs" color="gray.700" fontWeight="500">Font Size</Text>
                                                <Text fontSize="xs" color="gray.500">{dedicationFontSize}px</Text>
                                            </HStack>
                                            <Slider value={dedicationFontSize} min={12} max={150} step={1} onChange={setDedicationFontSize}>
                                                <SliderTrack bg="gray.200"><SliderFilledTrack bg="gray.900" /></SliderTrack>
                                                <SliderThumb boxSize={3} borderColor="gray.300" borderWidth="2px" />
                                            </Slider>
                                        </Box>
                                        <Box w="full">
                                            <HStack justify="space-between" mb={1}>
                                                <Text fontSize="xs" color="gray.700" fontWeight="500">Kerning</Text>
                                                <Text fontSize="xs" color="gray.500">{dedicationKerning.toFixed(2)}em</Text>
                                            </HStack>
                                            <Slider value={dedicationKerning} min={-0.1} max={0.5} step={0.01} onChange={setDedicationKerning}>
                                                <SliderTrack bg="gray.200"><SliderFilledTrack bg="gray.900" /></SliderTrack>
                                                <SliderThumb boxSize={3} borderColor="gray.300" borderWidth="2px" />
                                            </Slider>
                                        </Box>
                                        <Box w="full">
                                            <HStack justify="space-between" mb={1}>
                                                <Text fontSize="xs" color="gray.700" fontWeight="500">Vertical Offset</Text>
                                                <Text fontSize="xs" color="gray.500">{dedicationOffsetY}px</Text>
                                            </HStack>
                                            <Slider value={dedicationOffsetY} min={-50} max={50} step={1} onChange={setDedicationOffsetY}>
                                                <SliderTrack bg="gray.200"><SliderFilledTrack bg="gray.900" /></SliderTrack>
                                                <SliderThumb boxSize={3} borderColor="gray.300" borderWidth="2px" />
                                            </Slider>
                                        </Box>
                                        {dedicationFont === 'Mapped Moment Script' && <GlyphPicker defaultField="dedication" />}
                                    </VStack>
                                )}

                                {/* Divider Controls */}
                                <Box pt={2} borderTop="1px solid" borderColor="gray.100">
                                    <HStack justify="space-between" mb={3}>
                                        <Text fontSize="sm" fontWeight="600" color="gray.900">Divider</Text>
                                        <Switch
                                            size="sm"
                                            isChecked={showDivider}
                                            onChange={(e) => setShowDivider(e.target.checked)}
                                        />
                                    </HStack>
                                    {showDivider && (
                                        <VStack spacing={3}>
                                            <Box w="full">
                                                <HStack justify="space-between" mb={1}>
                                                    <Text fontSize="xs" color="gray.700" fontWeight="500">Length</Text>
                                                    <Text fontSize="xs" color="gray.500">{dividerLength}px</Text>
                                                </HStack>
                                                <Slider value={dividerLength} min={20} max={300} step={5} onChange={setDividerLength}>
                                                    <SliderTrack bg="gray.200"><SliderFilledTrack bg="gray.900" /></SliderTrack>
                                                    <SliderThumb boxSize={3} borderColor="gray.300" borderWidth="2px" />
                                                </Slider>
                                            </Box>
                                            <Box w="full">
                                                <HStack justify="space-between" mb={1}>
                                                    <Text fontSize="xs" color="gray.700" fontWeight="500">Thickness</Text>
                                                    <Text fontSize="xs" color="gray.500">{dividerThickness.toFixed(1)}px</Text>
                                                </HStack>
                                                <Slider value={dividerThickness} min={0.2} max={5} step={0.1} onChange={setDividerThickness}>
                                                    <SliderTrack bg="gray.200"><SliderFilledTrack bg="gray.900" /></SliderTrack>
                                                    <SliderThumb boxSize={3} borderColor="gray.300" borderWidth="2px" />
                                                </Slider>
                                            </Box>
                                            <Box w="full">
                                                <HStack justify="space-between" mb={1}>
                                                    <Text fontSize="xs" color="gray.700" fontWeight="500">Vertical Offset</Text>
                                                    <Text fontSize="xs" color="gray.500">{dividerOffsetY}px</Text>
                                                </HStack>
                                                <Slider value={dividerOffsetY} min={-50} max={50} step={1} onChange={setDividerOffsetY}>
                                                    <SliderTrack bg="gray.200"><SliderFilledTrack bg="gray.900" /></SliderTrack>
                                                    <SliderThumb boxSize={3} borderColor="gray.300" borderWidth="2px" />
                                                </Slider>
                                            </Box>
                                        </VStack>
                                    )}
                                </Box>
                            </VStack>
                        </AccordionPanel>
                    </AccordionItem >

                    {/* Size Section */}
                    < AccordionItem border="none" borderBottom="1px" borderColor="gray.200" >
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
                    </AccordionItem >

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
                            <VStack align="stretch" spacing={3}>
                                <Text fontSize="xs" fontWeight="600" color="gray.700">Custom Colors</Text>
                                <HStack justify="space-between" p={3} bg="gray.50" borderRadius="md" border="1px solid" borderColor="gray.200">
                                    <Text fontSize="sm" color="gray.700" fontWeight="500">Background</Text>
                                    <HStack>
                                        <Text fontSize="xs" color="gray.500" fontFamily="mono">{useStore.getState().posterColor}</Text>
                                        <Input
                                            type="color"
                                            w={8}
                                            h={8}
                                            p={0}
                                            border="1px solid"
                                            borderColor="gray.300"
                                            borderRadius="md"
                                            bg="transparent"
                                            value={useStore.getState().posterColor}
                                            onChange={(e) => useStore.getState().setPosterColor(e.target.value)}
                                            cursor="pointer"
                                        />
                                    </HStack>
                                </HStack>
                                <HStack justify="space-between" p={3} bg="gray.50" borderRadius="md" border="1px solid" borderColor="gray.200">
                                    <Text fontSize="sm" color="gray.700" fontWeight="500">Text & Elements</Text>
                                    <HStack>
                                        <Text fontSize="xs" color="gray.500" fontFamily="mono">{useStore.getState().textColor}</Text>
                                        <Input
                                            type="color"
                                            w={8}
                                            h={8}
                                            p={0}
                                            border="1px solid"
                                            borderColor="gray.300"
                                            borderRadius="md"
                                            bg="transparent"
                                            value={useStore.getState().textColor}
                                            onChange={(e) => useStore.getState().setTextColor(e.target.value)}
                                            cursor="pointer"
                                        />
                                    </HStack>
                                </HStack>
                                {posterType === 'streetmap' ? (
                                    <HStack justify="space-between" p={3} bg="gray.50" borderRadius="md" border="1px solid" borderColor="gray.200">
                                        <Text fontSize="sm" color="gray.700" fontWeight="500">Streets</Text>
                                        <HStack>
                                            <Text fontSize="xs" color="gray.500" fontFamily="mono">{mapStreetColor}</Text>
                                            <Input
                                                type="color"
                                                w={8}
                                                h={8}
                                                p={0}
                                                border="1px solid"
                                                borderColor="gray.300"
                                                borderRadius="md"
                                                bg="transparent"
                                                value={mapStreetColor}
                                                onChange={(e) => setMapStreetColor(e.target.value)}
                                                cursor="pointer"
                                            />
                                        </HStack>
                                    </HStack>
                                ) : (
                                    <HStack justify="space-between" p={3} bg="gray.50" borderRadius="md" border="1px solid" borderColor="gray.200">
                                        <Text fontSize="sm" color="gray.700" fontWeight="500">Map Background</Text>
                                        <HStack>
                                            <Text fontSize="xs" color="gray.500" fontFamily="mono">{useStore.getState().mapInteriorColor}</Text>
                                            <Input
                                                type="color"
                                                w={8}
                                                h={8}
                                                p={0}
                                                border="1px solid"
                                                borderColor="gray.300"
                                                borderRadius="md"
                                                bg="transparent"
                                                value={useStore.getState().mapInteriorColor}
                                                onChange={(e) => useStore.getState().setMapInteriorColor(e.target.value)}
                                                cursor="pointer"
                                            />
                                        </HStack>
                                    </HStack>
                                )}
                            </VStack>
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
                            <VStack spacing={6} align="stretch">
                                <HStack justify="space-between">
                                    <Text fontSize="sm" fontWeight="500" color="gray.700">Show Border</Text>
                                    <Switch
                                        isChecked={showBorder}
                                        onChange={(e) => setShowBorder(e.target.checked)}
                                        colorScheme="blue"
                                    />
                                </HStack>

                                <FormControl>
                                    <FormLabel {...labelStyles}>Design Style</FormLabel>
                                    <HStack spacing={2}>
                                        <Button
                                            onClick={() => {
                                                setDesignStyle('standard');
                                                setShapeOutlineWidth(1.0);
                                            }}
                                            {...toggleButtonStyles(designStyle === 'standard')}
                                        >
                                            Standard
                                        </Button>
                                        <Button
                                            onClick={() => {
                                                setDesignStyle('fineline');
                                                setShapeOutlineWidth(0.5);
                                            }}
                                            {...toggleButtonStyles(designStyle === 'fineline')}
                                        >
                                            Fineline
                                        </Button>
                                    </HStack>
                                </FormControl>

                                <FormControl>
                                    <FormLabel {...labelStyles}>Mask Shape</FormLabel>
                                    <HStack spacing={1}>
                                        <Button
                                            onClick={() => setMaskShape('circle')}
                                            {...toggleButtonStyles(maskShape === 'circle')}
                                            fontSize="xs"
                                        >
                                            ○ Circle
                                        </Button>
                                        <Button
                                            onClick={() => setMaskShape('heart')}
                                            {...toggleButtonStyles(maskShape === 'heart')}
                                            fontSize="xs"
                                        >
                                            ♥ Heart
                                        </Button>
                                        <Button
                                            onClick={() => setMaskShape('house')}
                                            {...toggleButtonStyles(maskShape === 'house')}
                                            fontSize="xs"
                                        >
                                            ⌂ House
                                        </Button>
                                    </HStack>
                                </FormControl>

                                <HStack justify="space-between">
                                    <Text fontSize="sm" fontWeight="500" color="gray.700">Light Mode</Text>
                                    <Switch
                                        isChecked={isLightMode}
                                        onChange={(e) => setIsLightMode(e.target.checked)}
                                        colorScheme="blue"
                                    />
                                </HStack>

                                {/* Star-map-only sliders — hidden in street/colored map mode */}
                                {posterType === 'starmap' && (<>
                                <Box>
                                    <HStack justify="space-between" mb={2}>
                                        <Text fontSize="sm" color="gray.700" fontWeight="500">Star Size</Text>
                                        <Text fontSize="xs" color="gray.500" fontWeight="600">{starScale.toFixed(1)}x</Text>
                                    </HStack>
                                    <Slider value={starScale} min={0.5} max={2.2} step={0.1} onChange={setStarScale}>
                                        <SliderTrack bg="gray.200"><SliderFilledTrack bg="gray.900" /></SliderTrack>
                                        <SliderThumb boxSize={4} borderColor="gray.300" borderWidth="2px" />
                                    </Slider>
                                </Box>

                                <Box>
                                    <HStack justify="space-between" mb={2}>
                                        <Text fontSize="sm" color="gray.700" fontWeight="500">Line Weight</Text>
                                        <Text fontSize="xs" color="gray.500" fontWeight="600">{lineWeight.toFixed(1)}pt</Text>
                                    </HStack>
                                    <Slider value={lineWeight} min={0.1} max={1.8} step={0.1} onChange={setLineWeight}>
                                        <SliderTrack bg="gray.200"><SliderFilledTrack bg="gray.900" /></SliderTrack>
                                        <SliderThumb boxSize={4} borderColor="gray.300" borderWidth="2px" />
                                    </Slider>
                                </Box>

                                <Box>
                                    <HStack justify="space-between" mb={2}>
                                        <Text fontSize="sm" color="gray.700" fontWeight="500">Grid Width</Text>
                                        <Text fontSize="xs" color="gray.500" fontWeight="600">{gridWidth.toFixed(1)}pt</Text>
                                    </HStack>
                                    <Slider value={gridWidth} min={0.1} max={1.2} step={0.1} onChange={setGridWidth}>
                                        <SliderTrack bg="gray.200"><SliderFilledTrack bg="gray.900" /></SliderTrack>
                                        <SliderThumb boxSize={4} borderColor="gray.300" borderWidth="2px" />
                                    </Slider>
                                </Box>

                                <Box>
                                    <HStack justify="space-between" mb={2}>
                                        <Text fontSize="sm" color="gray.700" fontWeight="500">Glow Intensity</Text>
                                        <Text fontSize="xs" color="gray.500" fontWeight="600">{glowIntensity}</Text>
                                    </HStack>
                                    <Slider value={glowIntensity} min={0} max={20} step={1} onChange={setGlowIntensity}>
                                        <SliderTrack bg="gray.200"><SliderFilledTrack bg="gray.900" /></SliderTrack>
                                        <SliderThumb boxSize={4} borderColor="gray.300" borderWidth="2px" />
                                    </Slider>
                                </Box>

                                <Box>
                                    <HStack justify="space-between" mb={2}>
                                        <Text fontSize="sm" color="gray.700" fontWeight="500">Grid Opacity</Text>
                                        <Text fontSize="xs" color="gray.500" fontWeight="600">{Math.round(gridOpacity * 100)}%</Text>
                                    </HStack>
                                    <Slider value={gridOpacity} min={0} max={1} step={0.05} onChange={setGridOpacity}>
                                        <SliderTrack bg="gray.200"><SliderFilledTrack bg="gray.900" /></SliderTrack>
                                        <SliderThumb boxSize={4} borderColor="gray.300" borderWidth="2px" />
                                    </Slider>
                                </Box>
                                </>)}

                                {maskShape === 'circle' && (
                                    <Box>
                                        <HStack justify="space-between" mb={2}>
                                            <Text fontSize="sm" color="gray.700" fontWeight="500">Circle Size</Text>
                                            <Text fontSize="xs" color="gray.500" fontWeight="600">{circleSize.toFixed(2)}x</Text>
                                        </HStack>
                                        <Slider value={circleSize} min={0.5} max={1.5} step={0.05} onChange={setCircleSize}>
                                            <SliderTrack bg="gray.200">
                                                <SliderFilledTrack bg="gray.900" />
                                            </SliderTrack>
                                            <SliderThumb boxSize={4} borderColor="gray.300" borderWidth="2px" />
                                        </Slider>
                                    </Box>
                                )}

                                {maskShape === 'heart' && (
                                    <Box>
                                        <HStack justify="space-between" mb={2}>
                                            <Text fontSize="sm" color="gray.700" fontWeight="500">Heart Size</Text>
                                            <Text fontSize="xs" color="gray.500" fontWeight="600">{heartSize.toFixed(2)}x</Text>
                                        </HStack>
                                        <Slider value={heartSize} min={0.5} max={1.5} step={0.05} onChange={setHeartSize}>
                                            <SliderTrack bg="gray.200">
                                                <SliderFilledTrack bg="gray.900" />
                                            </SliderTrack>
                                            <SliderThumb boxSize={4} borderColor="gray.300" borderWidth="2px" />
                                        </Slider>
                                    </Box>
                                )}

                                {maskShape === 'house' && (
                                    <Box>
                                        <HStack justify="space-between" mb={2}>
                                            <Text fontSize="sm" color="gray.700" fontWeight="500">House Size</Text>
                                            <Text fontSize="xs" color="gray.500" fontWeight="600">{houseSize.toFixed(2)}x</Text>
                                        </HStack>
                                        <Slider value={houseSize} min={0.5} max={1.5} step={0.05} onChange={setHouseSize}>
                                            <SliderTrack bg="gray.200">
                                                <SliderFilledTrack bg="gray.900" />
                                            </SliderTrack>
                                            <SliderThumb boxSize={4} borderColor="gray.300" borderWidth="2px" />
                                        </Slider>
                                    </Box>
                                )}

                                <Box>
                                    <HStack justify="space-between" mb={2}>
                                        <Text fontSize="sm" color="gray.700" fontWeight="500">Shape Position</Text>
                                        <Text fontSize="xs" color="gray.500" fontWeight="600">{shapeOffsetY > 0 ? '+' : ''}{shapeOffsetY}pt</Text>
                                    </HStack>
                                    <Slider value={shapeOffsetY} min={-200} max={200} step={5} onChange={setShapeOffsetY}>
                                        <SliderTrack bg="gray.200">
                                            <SliderFilledTrack bg="gray.900" />
                                        </SliderTrack>
                                        <SliderThumb boxSize={4} borderColor="gray.300" borderWidth="2px" />
                                    </Slider>
                                </Box>

                                {/* Shape Outline Width */}
                                <Box>
                                    <HStack justify="space-between" mb={2}>
                                        <Text fontSize="sm" color="gray.700" fontWeight="500">Shape Outline Width</Text>
                                        <Text fontSize="xs" color="gray.500" fontWeight="600">{shapeOutlineWidth.toFixed(1)}pt</Text>
                                    </HStack>
                                    <Slider value={shapeOutlineWidth} min={0.5} max={6.0} step={0.5} onChange={setShapeOutlineWidth}>
                                        <SliderTrack bg="gray.200">
                                            <SliderFilledTrack bg="gray.900" />
                                        </SliderTrack>
                                        <SliderThumb boxSize={4} borderColor="gray.300" borderWidth="2px" />
                                    </Slider>
                                </Box>

                                {/* Fineline Width - only show when fineline is selected */}
                                {designStyle === 'fineline' && (
                                    <Box>
                                        <HStack justify="space-between" mb={2}>
                                            <Text fontSize="sm" color="gray.700" fontWeight="500">Fineline Spacing</Text>
                                            <Text fontSize="xs" color="gray.500" fontWeight="600">{finelineWidth.toFixed(1)}pt</Text>
                                        </HStack>
                                        <Slider value={finelineWidth} min={0.5} max={5} step={0.1} onChange={setFinelineWidth}>
                                            <SliderTrack bg="gray.200">
                                                <SliderFilledTrack bg="gray.900" />
                                            </SliderTrack>
                                            <SliderThumb boxSize={4} borderColor="gray.300" borderWidth="2px" />
                                        </Slider>
                                    </Box>
                                )}

                                {/* Frame Controls */}
                                <Box pt={4} borderTop="1px" borderColor="gray.100">
                                    <HStack justify="space-between" mb={4}>
                                        <Text fontSize="sm" fontWeight="500" color="gray.700">Show Frame</Text>
                                        <Switch
                                            isChecked={showFrame}
                                            onChange={(e) => setShowFrame(e.target.checked)}
                                            colorScheme="blue"
                                        />
                                    </HStack>

                                    {showFrame && (
                                        <VStack spacing={4}>
                                            <Box w="full">
                                                <HStack justify="space-between" mb={2}>
                                                    <Text fontSize="sm" color="gray.700" fontWeight="500">Frame Inset</Text>
                                                    <Text fontSize="xs" color="gray.500" fontWeight="600">{frameInset}pt</Text>
                                                </HStack>
                                                <Slider value={frameInset} min={10} max={100} step={5} onChange={setFrameInset}>
                                                    <SliderTrack bg="gray.200">
                                                        <SliderFilledTrack bg="gray.900" />
                                                    </SliderTrack>
                                                    <SliderThumb boxSize={4} borderColor="gray.300" borderWidth="2px" />
                                                </Slider>
                                            </Box>
                                            <Box w="full">
                                                <HStack justify="space-between" mb={2}>
                                                    <Text fontSize="sm" color="gray.700" fontWeight="500">Frame Width</Text>
                                                    <Text fontSize="xs" color="gray.500" fontWeight="600">{frameWidth.toFixed(1)}pt</Text>
                                                </HStack>
                                                <Slider value={frameWidth} min={0.5} max={8.0} step={0.5} onChange={setFrameWidth}>
                                                    <SliderTrack bg="gray.200">
                                                        <SliderFilledTrack bg="gray.900" />
                                                    </SliderTrack>
                                                    <SliderThumb boxSize={4} borderColor="gray.300" borderWidth="2px" />
                                                </Slider>
                                            </Box>
                                        </VStack>
                                    )}
                                </Box>
                            </VStack>
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
        const url = orderType === 'print' ? ETSY_PRINT_URL : ETSY_DIGITAL_URL;
        window.open(url, '_blank');
    };

    const reset = () => { setToken(null); setOrderType(null); };

    return (
        <Box p={6} borderTop="1px" borderColor="gray.200">
            <DownloadButton />
            <Text fontSize="xs" textAlign="center" color="gray.400" mt={2} mb={5} fontWeight="400">
                Preview only · 150 DPI · watermarked
            </Text>

            {!token ? (
                <>
                    <Text fontSize="xs" fontWeight="700" color="gray.500" textTransform="uppercase"
                        letterSpacing="0.1em" mb={3} textAlign="center">
                        Order print-quality file
                    </Text>
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
