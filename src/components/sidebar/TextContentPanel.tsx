// TextContentPanel — Location, Date/Time, Title, Subtitle, and custom text for star map mode.
// Extracted from SidebarControls. Uses useStore() directly for its fields.

import React, { useState, useEffect, useMemo } from 'react';
import { format } from 'date-fns';
import { ChevronDown } from 'lucide-react';
import { useStore } from '../../store/useStore';
import { trackEvent } from '../../utils/analytics';
import { asCalendarDate } from '../../utils/dateOnly';
import { inputStyles, labelStyles, toggleButtonStyles } from './sidebarStyles';
import {
    Box, VStack, HStack, Text, Input, Button, Accordion, AccordionItem,
    AccordionButton, AccordionPanel, AccordionIcon, Textarea, Switch, FormControl,
    FormLabel, InputGroup, InputRightElement, Spinner, List, ListItem,
    Slider, SliderTrack, SliderFilledTrack, SliderThumb,
} from '@chakra-ui/react';

// ── Smart suggestion generators ──────────────────────────────────────────────

const HEART_MAP_TITLE_SUGGESTIONS = [
    'Where It All Began',
    'Where Our Story Started',
    'The First Date',
    'Where We Met',
    'It Was Always You',
    'Where Forever Started',
    'The Place You Said Yes',
    'Where We Said I Do',
    'Our Best Day',
    'To the Moon and Back',
    'Our Happy Place',
    'My Favorite Place is with You',
    "Home is Wherever I'm with You",
    'Our Little Corner of the World',
    'Our Love Story',
    'Love Knows No Distance',
    'Miles Apart, Close in Heart',
    'Worth Every Mile',
    'Together Anywhere',
];

const HEART_MAP_SUBTITLE_SUGGESTIONS = [
    'Our Story Began Here',
    'Forever Starts Here',
    'The Place That Changed Everything',
    'Every Love Story Has a Place',
    'The Beginning of Always',
    'A Moment We Will Never Forget',
    'Two Hearts, One Place',
    'A Love Worth Every Mile',
    'From This Place, Forever',
    'Where My Heart Found Home',
];

const HOUSE_MAP_TITLE_SUGGESTIONS = [
    'Our First Home',
    'Home Sweet Home',
    'Our Forever Home',
    'Where Love Lives',
    'The Place We Call Home',
    'Our New Beginning',
    'Home Is Here',
    'The First Place We Called Ours',
    'Our Little Home',
    'Where Our Story Lives',
    'Our Happy Place',
    'The Door We Opened Together',
    'A Place to Call Ours',
    'New Home, New Memories',
    'The Home We Built Together',
    'Our Nest',
    'The Address That Became Home',
    'Where Family Begins',
];

const HOUSE_MAP_SUBTITLE_SUGGESTIONS = [
    'The Place We Call Home',
    'Our First Chapter Together',
    'Where Love Lives',
    'A New Beginning',
    'Built on Love and Memories',
    'Our Favorite Place to Be',
    'The Start of Our Next Adventure',
    'Home Is Wherever We Are Together',
    'Made for Us',
    'Established with Love',
];

const STREET_MAP_TITLE_SUGGESTIONS = [
    'Our Happy Place',
    'The Place That Matters',
    'Life Is an Adventure With You',
    'Our Little Corner of the World',
    'The City That Made Us',
    'Where Our Story Started',
    'A Map of Us',
    'City of Memories',
    'The Streets We Know by Heart',
    'Always Take the Scenic Route',
    'Adventure Awaits',
    'Our Favorite Place',
    'The Place We Keep Coming Back To',
    'Where We Belong',
    'Home, Mapped',
    'A City Worth Remembering',
    'The Road That Led to You',
    'Every Street Leads to You',
];

const STREET_MAP_SUBTITLE_SUGGESTIONS = [
    'The Place That Matters',
    'Life Is an Adventure With You...',
    'A City Worth Remembering',
    'Mapped With Love',
    'Our Favorite Place on Earth',
    'Where the Best Memories Live',
    'The Streets That Tell Our Story',
    'Always Worth the Journey',
    'A Place We Will Never Forget',
    'Made for the Places We Love',
];

const STAR_MAP_TITLE_SUGGESTIONS = [
    'The Night We Met',
    'The Night Our Stars Aligned',
    'Written in the Stars',
    'The Stars Aligned',
    'The Night We Said I Do',
    'Our Wedding Night',
    'The Beginning of Forever',
    'The Night Our Love Was Born',
    'The Day You Were Born',
    'The Night You Were Born',
    'The Sky on Your Birthday',
    'Welcome to the World',
    'Our First Night as Three',
    'A Moment in Time',
    'Under These Stars',
    'The Night Everything Changed',
    'First Night of Forever',
    'Love Under the Stars',
    'The Universe Remembered',
    'Our Special Night',
];

const STAR_MAP_SUBTITLE_SUGGESTIONS = [
    'The Sky Above Us That Night',
    'Under These Stars',
    'The Moment Everything Changed',
    'Our Story Began',
    'Forever and Always',
    'A Night to Remember',
    'The Start of Something Beautiful',
    'Love Written in the Stars',
    'The Universe Had a Plan',
    'A Moment We Will Never Forget',
];

function uniqueSuggestions(suggestions: string[]): string[] {
    return Array.from(new Set(suggestions));
}

function isMapDesign(context: { posterType: string }): boolean {
    return context.posterType === 'streetmap' || context.posterType === 'coloredmap';
}

function generateSmartTitleSuggestions(
    location: string,
    date: Date,
    context: { posterType: string; maskShape: string },
): string[] {
    if (isMapDesign(context) && context.maskShape === 'heart') {
        return HEART_MAP_TITLE_SUGGESTIONS;
    }
    if (isMapDesign(context) && context.maskShape === 'house') {
        return HOUSE_MAP_TITLE_SUGGESTIONS;
    }
    if (context.posterType === 'streetmap' && context.maskShape === 'rect') {
        return STREET_MAP_TITLE_SUGGESTIONS;
    }

    const suggestions: string[] = [];
    const month = date.getMonth() + 1;
    const day = date.getDate();
    const loc = location.toLowerCase();

    if (month === 2 && day === 14) {
        suggestions.push("Be Mine Under These Stars", "My Valentine's Night Sky", "Love Written in the Stars");
    } else if (month === 12 && (day === 24 || day === 25)) {
        suggestions.push("A Christmas to Remember", "The Stars on Christmas Eve", "Our Christmas Night");
    } else if (month === 1 && day === 1) {
        suggestions.push("A New Chapter Begins", "The Stars of a New Year", "First Night of Forever");
    } else if (month === 12 && day === 31) {
        suggestions.push("One Last Dance Under the Stars", "New Year's Eve Sky", "The Last Stars of the Year");
    }

    if (/beach|bay|coast|harbour|harbor|island|sea|ocean|gulf|cove|shore/.test(loc)) {
        suggestions.push("Sands of Time", "Waves of Love", "The Sea Beneath the Stars");
    }
    if (/mountain|peak|hill|alps|ridge|summit|heights|highland/.test(loc)) {
        suggestions.push("Summit of Our Love", "Stars Above the Mountains", "On Top of the World");
    }
    if (/paris|france/.test(loc)) suggestions.push("L'Amour Sous Les Étoiles", "City of Lights, City of Love");
    if (/london/.test(loc)) suggestions.push("A London Night", "London Under the Stars");
    if (/new york|brooklyn|manhattan/.test(loc)) suggestions.push("New York State of Mind", "City Lights & Starlight");
    if (/sydney/.test(loc)) suggestions.push("Under Southern Stars", "Harbour Lights");
    if (/rome|roma/.test(loc)) suggestions.push("All Roads Lead to You", "Roma Sotto le Stelle");
    if (/venice|venezia/.test(loc)) suggestions.push("Floating Under the Stars", "A Venetian Night");
    if (/tokyo/.test(loc)) suggestions.push("Tokyo Lights & Starlight", "A Night in Tokyo");
    if (/garden|park|forest|woods|meadow/.test(loc)) suggestions.push("Among the Trees, Under the Stars");

    if (month >= 3 && month <= 5) {
        suggestions.push("Spring Stars", "Blooming Under the Stars");
    } else if (month >= 6 && month <= 8) {
        suggestions.push("Summer Nights", "The Warmest Night");
    } else if (month >= 9 && month <= 11) {
        suggestions.push("Autumn Stars", "Stars of the Golden Season");
    } else {
        suggestions.push("Winter Stars", "Stars in the Winter Sky");
    }

    suggestions.push(...STAR_MAP_TITLE_SUGGESTIONS);
    return uniqueSuggestions(suggestions);
}

function generateSmartSubtitleSuggestions(
    location: string,
    date: Date,
    context: { posterType: string; maskShape: string },
): string[] {
    if (isMapDesign(context) && context.maskShape === 'heart') {
        return HEART_MAP_SUBTITLE_SUGGESTIONS;
    }
    if (isMapDesign(context) && context.maskShape === 'house') {
        return HOUSE_MAP_SUBTITLE_SUGGESTIONS;
    }
    if (context.posterType === 'streetmap' && context.maskShape === 'rect') {
        return STREET_MAP_SUBTITLE_SUGGESTIONS;
    }

    const suggestions: string[] = [];
    const month = date.getMonth() + 1;
    const day = date.getDate();
    const loc = location.toLowerCase();

    if (month === 2 && day === 14) {
        suggestions.push("Happy Valentine's Day, My Love", "Forever Yours", "With All My Heart");
    } else if (month === 12 && (day === 24 || day === 25)) {
        suggestions.push("Merry Christmas, My Love", "A Magical Christmas Night");
    } else if (month === 1 && day === 1) {
        suggestions.push("Here's to New Beginnings", "A Toast to Forever");
    }
    if (/beach|bay|coast|sea|ocean/.test(loc)) {
        suggestions.push("Where the Water Meets the Stars", "Salt Air and Starlight");
    }

    suggestions.push(...STAR_MAP_SUBTITLE_SUGGESTIONS);
    return uniqueSuggestions(suggestions);
}

// ── Component ─────────────────────────────────────────────────────────────────

const TextContentPanel: React.FC = () => {
    const {
        title, setTitle,
        subtitle, setSubtitle,
        location, setLocation,
        date, setDate,
        time, setTime,
        setLat, setLng,
        showLocation, setShowLocation,
        showDate, setShowDate,
        showCoords, setShowCoords,
        showNames, setShowNames,
        customText, setCustomText,
        posterType,
        maskShape,
        locationAllCaps, setLocationAllCaps,
        showDivider, setShowDivider, dividerLength, setDividerLength, dividerThickness, setDividerThickness,
        dividerOffsetY, setDividerOffsetY,
        showVertSep, setShowVertSep, vertSepHeight, setVertSepHeight, vertSepThickness, setVertSepThickness,
        vertSepOffsetY, setVertSepOffsetY,
    } = useStore();

    // ── Clearable text lines ────────────────────────────────────────────────
    // Clearing a custom-text field should REMOVE that line from the poster. Customers delete the
    // characters and reasonably expect it gone — but the renderer treats an empty customText value
    // as "not customised, fall back to the auto-generated default", which silently puts it right
    // back. (Two real customers hit this on the date; one spent a paid revision on a change that
    // did nothing.) That renderer rule is load-bearing — most saved designs legitimately store ''
    // and rely on the default — so intent is expressed via the show* flag here instead of changing
    // renderer semantics, which would retroactively alter existing customers' posters.
    //
    // Hiding happens on BLUR, never on keystroke: people routinely clear a field before typing a
    // replacement, and hiding per-keystroke made the line flicker off/on mid-edit (and could leave
    // it hidden if they wandered off with the box momentarily empty). Typing always restores it.
    //
    // Applied uniformly to every line that has a Visibility toggle EXCEPT `names`: that input is
    // itself rendered only when showNames is true, so auto-hiding would make the field vanish
    // out from under the user mid-edit. Names stays toggle-only.
    const clearableText = (
        field: 'date' | 'location' | 'coords',
        isShown: boolean,
        setShown: (v: boolean) => void,
    ) => ({
        onChange: (e: React.ChangeEvent<HTMLInputElement>) => {
            const v = e.target.value;
            setCustomText(field, v);
            if (v.trim() !== '' && !isShown) setShown(true);
        },
        onBlur: (e: React.FocusEvent<HTMLInputElement>) => {
            if (e.target.value.trim() === '') setShown(false);
        },
    });

    const [locationQuery, setLocationQuery] = useState('');
    const [searchResults, setSearchResults] = useState<any[]>([]);
    const [isSearching, setIsSearching] = useState(false);
    const [showTitleSuggestions, setShowTitleSuggestions] = useState(false);
    const [showSubtitleSuggestions, setShowSubtitleSuggestions] = useState(false);
    const [showAllTitleSuggestions, setShowAllTitleSuggestions] = useState(false);
    const [showAllSubtitleSuggestions, setShowAllSubtitleSuggestions] = useState(false);

    const titleSuggestions = useMemo(
        () => generateSmartTitleSuggestions(location, date, { posterType, maskShape }),
        [location, date, posterType, maskShape],
    );
    const subtitleSuggestions = useMemo(
        () => generateSmartSubtitleSuggestions(location, date, { posterType, maskShape }),
        [location, date, posterType, maskShape],
    );
    const titleQuery = (customText.title || title).toLowerCase();
    const filteredTitleSuggestions = titleSuggestions.filter(s => s.toLowerCase().includes(titleQuery));
    const visibleTitleSuggestions = showAllTitleSuggestions || filteredTitleSuggestions.length === 0
        ? titleSuggestions
        : filteredTitleSuggestions;
    const subtitleQuery = (customText.subtitle || subtitle).toLowerCase();
    const filteredSubtitleSuggestions = subtitleSuggestions.filter(s => s.toLowerCase().includes(subtitleQuery));
    const visibleSubtitleSuggestions = showAllSubtitleSuggestions || filteredSubtitleSuggestions.length === 0
        ? subtitleSuggestions
        : filteredSubtitleSuggestions;

    const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const newDate = new Date(e.target.value);
        if (!isNaN(newDate.getTime())) setDate(newDate);
    };

    useEffect(() => {
        const delay = setTimeout(async () => {
            if (locationQuery.length > 2) {
                setIsSearching(true);
                try {
                    const response = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(locationQuery)}`);
                    const data = await response.json();
                    setSearchResults(data);
                } catch {
                    /* ignore */
                } finally {
                    setIsSearching(false);
                }
            } else {
                setSearchResults([]);
            }
        }, 500);
        return () => clearTimeout(delay);
    }, [locationQuery]);

    const selectLocation = (result: any) => {
        setLocation(result.display_name.split(',')[0]);
        setLat(parseFloat(result.lat));
        setLng(parseFloat(result.lon));
        setSearchResults([]);
        setLocationQuery('');
        trackEvent('city_search', { city: result.display_name.split(',')[0], method: 'starmap_search' });
    };

    return (
        <VStack spacing={5} align="stretch">
            {/* Location Search */}
            <FormControl>
                <FormLabel {...labelStyles}>Location</FormLabel>
                <Box position="relative">
                    <InputGroup>
                        <Input
                            value={locationQuery}
                            onChange={(e) => setLocationQuery(e.target.value)}
                            placeholder="Search location…"
                            {...inputStyles}
                        />
                        {isSearching && <InputRightElement><Spinner size="sm" color="gray.600" /></InputRightElement>}
                    </InputGroup>
                    {searchResults.length > 0 && (
                        <Box
                            position="absolute" zIndex={10} w="full" mt={1}
                            bg="white" border="1px" borderColor="gray.300" borderRadius="md"
                            boxShadow="lg" maxH="48" overflowY="auto"
                        >
                            {searchResults.map((result, index) => (
                                <Box
                                    key={index} as="button" w="full" textAlign="left"
                                    px={4} py={2} _hover={{ bg: 'gray.100' }} fontSize="sm"
                                    onClick={() => selectLocation(result)} transition="all 0.15s"
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
                    <Input type="date" value={format(asCalendarDate(date), 'yyyy-MM-dd')} onChange={handleDateChange} {...inputStyles} />
                </FormControl>
                <FormControl>
                    <FormLabel {...labelStyles}>Time</FormLabel>
                    <Input type="time" value={time} onChange={(e) => setTime(e.target.value)} {...inputStyles} />
                </FormControl>
            </HStack>

            {/* Title with suggestions */}
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
                            autoComplete="new-password"
                            {...inputStyles}
                        />
                        <InputRightElement>
                            <Box
                                as="button"
                                onClick={() => {
                                    setShowAllTitleSuggestions(true);
                                    setShowTitleSuggestions(!showTitleSuggestions);
                                }}
                                color="gray.500" _hover={{ color: "gray.700" }}
                            >
                                <ChevronDown size={16} />
                            </Box>
                        </InputRightElement>
                    </InputGroup>
                    {showTitleSuggestions && (
                        <List position="absolute" zIndex={10} w="full" mt={1}
                            bg="white" border="1px" borderColor="gray.300" borderRadius="md"
                            boxShadow="lg" maxH="48" overflowY="auto"
                        >
                            {visibleTitleSuggestions.map((suggestion, index) => (
                                <ListItem key={index} px={4} py={2}
                                    _hover={{ bg: 'gray.100', cursor: 'pointer' }} fontSize="sm"
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

            {/* Subtitle with suggestions */}
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
                            autoComplete="new-password"
                            {...inputStyles}
                        />
                        <InputRightElement>
                            <Box
                                as="button"
                                onClick={() => {
                                    setShowAllSubtitleSuggestions(true);
                                    setShowSubtitleSuggestions(!showSubtitleSuggestions);
                                }}
                                color="gray.500" _hover={{ color: "gray.700" }}
                            >
                                <ChevronDown size={16} />
                            </Box>
                        </InputRightElement>
                    </InputGroup>
                    {showSubtitleSuggestions && (
                        <List position="absolute" zIndex={10} w="full" mt={1}
                            bg="white" border="1px" borderColor="gray.300" borderRadius="md"
                            boxShadow="lg" maxH="48" overflowY="auto"
                        >
                            {visibleSubtitleSuggestions.map((suggestion, index) => (
                                <ListItem key={index} px={4} py={2}
                                    _hover={{ bg: 'gray.100', cursor: 'pointer' }} fontSize="sm"
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

            {/* Visibility toggles */}
            <Box>
                <FormLabel {...labelStyles}>Visibility</FormLabel>
                <HStack spacing={2} flexWrap="wrap">
                    <Button onClick={() => setShowDate(!showDate)} {...toggleButtonStyles(showDate)}>Date</Button>
                    <Button onClick={() => setShowLocation(!showLocation)} {...toggleButtonStyles(showLocation)}>Location</Button>
                    <Button onClick={() => setShowCoords(!showCoords)} {...toggleButtonStyles(showCoords)}>Coords</Button>
                    <Button onClick={() => setShowNames(!showNames)} {...toggleButtonStyles(showNames)}>Names</Button>
                </HStack>
                {/* Discoverability: two customers in a row tried to remove the date by clearing the
                    text box in "Advanced Text Options" and couldn't find these toggles. Spell out
                    that tapping a button here removes that line from the poster. */}
                <Text fontSize="xs" color="gray.500" mt={2}>
                    Tap to show or hide each line on your poster. A dimmed button means that line is hidden.
                </Text>
            </Box>

            {/* Horizontal Divider controls */}
            <Box>
                <HStack justify="space-between" mb={2}>
                    <FormLabel {...labelStyles} mb={0}>Horizontal Divider</FormLabel>
                    <Switch size="sm" isChecked={showDivider} onChange={(e) => setShowDivider(e.target.checked)} />
                </HStack>
                {showDivider && (
                    <VStack spacing={3}>
                        <Box w="full">
                            <HStack justify="space-between" mb={1}>
                                <Text fontSize="xs" color="gray.700" fontWeight="500">Length</Text>
                                <Text fontSize="xs" color="gray.500">{dividerLength}px</Text>
                            </HStack>
                            <Slider value={dividerLength} min={20} max={600} step={2} onChange={setDividerLength}>
                                <SliderTrack bg="gray.200"><SliderFilledTrack bg="gray.900" /></SliderTrack>
                                <SliderThumb boxSize={3} borderColor="gray.300" borderWidth="2px" />
                            </Slider>
                        </Box>
                        <Box w="full">
                            <HStack justify="space-between" mb={1}>
                                <Text fontSize="xs" color="gray.700" fontWeight="500">Thickness</Text>
                                <Text fontSize="xs" color="gray.500">{dividerThickness.toFixed(1)}px</Text>
                            </HStack>
                            <Slider value={dividerThickness} min={0.3} max={4} step={0.1} onChange={(v) => setDividerThickness(parseFloat(v.toFixed(1)))}>
                                <SliderTrack bg="gray.200"><SliderFilledTrack bg="gray.900" /></SliderTrack>
                                <SliderThumb boxSize={3} borderColor="gray.300" borderWidth="2px" />
                            </Slider>
                        </Box>
                        <Box w="full">
                            <HStack justify="space-between" mb={1}>
                                <Text fontSize="xs" color="gray.700" fontWeight="500">Vertical Position</Text>
                                <HStack spacing={2}>
                                    <Text fontSize="xs" color="gray.500">{Math.round(dividerOffsetY)}px</Text>
                                    {Math.round(dividerOffsetY) !== 0 && (
                                        <Button size="xs" variant="ghost" colorScheme="gray" px={1} h="auto" py={0} fontSize="xs" onClick={() => setDividerOffsetY(0)}>Reset</Button>
                                    )}
                                </HStack>
                            </HStack>
                            <Slider value={dividerOffsetY} min={-300} max={300} step={1} onChange={setDividerOffsetY}>
                                <SliderTrack bg="gray.200"><SliderFilledTrack bg="gray.900" /></SliderTrack>
                                <SliderThumb boxSize={3} borderColor="gray.300" borderWidth="2px" />
                            </Slider>
                        </Box>
                    </VStack>
                )}
            </Box>

            {/* Vertical Separator controls — only relevant when location+date are inline (no coords) */}
            {showLocation && showDate && !showCoords && (
                <Box>
                    <HStack justify="space-between" mb={2}>
                        <FormLabel {...labelStyles} mb={0}>Vertical Separator</FormLabel>
                        <Switch size="sm" isChecked={showVertSep} onChange={(e) => setShowVertSep(e.target.checked)} />
                    </HStack>
                    {showVertSep && (
                        <VStack spacing={3}>
                            <Box w="full">
                                <HStack justify="space-between" mb={1}>
                                    <Text fontSize="xs" color="gray.700" fontWeight="500">Height</Text>
                                    <Text fontSize="xs" color="gray.500">{vertSepHeight}px</Text>
                                </HStack>
                                <Slider value={vertSepHeight} min={6} max={80} step={1} onChange={setVertSepHeight}>
                                    <SliderTrack bg="gray.200"><SliderFilledTrack bg="gray.900" /></SliderTrack>
                                    <SliderThumb boxSize={3} borderColor="gray.300" borderWidth="2px" />
                                </Slider>
                            </Box>
                            <Box w="full">
                                <HStack justify="space-between" mb={1}>
                                    <Text fontSize="xs" color="gray.700" fontWeight="500">Thickness</Text>
                                    <Text fontSize="xs" color="gray.500">{vertSepThickness.toFixed(1)}px</Text>
                                </HStack>
                                <Slider value={vertSepThickness} min={0.3} max={4} step={0.1} onChange={(v) => setVertSepThickness(parseFloat(v.toFixed(1)))}>
                                    <SliderTrack bg="gray.200"><SliderFilledTrack bg="gray.900" /></SliderTrack>
                                    <SliderThumb boxSize={3} borderColor="gray.300" borderWidth="2px" />
                                </Slider>
                            </Box>
                            <Box w="full">
                                <HStack justify="space-between" mb={1}>
                                    <Text fontSize="xs" color="gray.700" fontWeight="500">Vertical Position</Text>
                                    <HStack spacing={2}>
                                        <Text fontSize="xs" color="gray.500">{Math.round(vertSepOffsetY)}px</Text>
                                        {Math.round(vertSepOffsetY) !== 0 && (
                                            <Button size="xs" variant="ghost" colorScheme="gray" px={1} h="auto" py={0} fontSize="xs" onClick={() => setVertSepOffsetY(0)}>Reset</Button>
                                        )}
                                    </HStack>
                                </HStack>
                                <Slider value={vertSepOffsetY} min={-100} max={100} step={1} onChange={setVertSepOffsetY}>
                                    <SliderTrack bg="gray.200"><SliderFilledTrack bg="gray.900" /></SliderTrack>
                                    <SliderThumb boxSize={3} borderColor="gray.300" borderWidth="2px" />
                                </Slider>
                            </Box>
                        </VStack>
                    )}
                </Box>
            )}

            {/* Advanced text options (collapsible) */}
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
                                    {...clearableText('date', showDate, setShowDate)}
                                    placeholder={format(date, 'MMMM do, yyyy').toUpperCase()}
                                    name="custom-date-text-unique"
                                    autoComplete="new-password"
                                    {...inputStyles}
                                />
                                <Text fontSize="xs" color="gray.500" mt={1}>
                                    Clear this field to remove the date from your poster.
                                </Text>
                            </FormControl>
                            <FormControl>
                                <HStack justify="space-between" align="center" mb={2}>
                                    <FormLabel {...labelStyles} mb={0}>Custom Location Text</FormLabel>
                                    <HStack spacing={2}>
                                        <Text fontSize="xs" color="gray.600" fontWeight="600">Full Caps</Text>
                                        <Switch
                                            size="sm"
                                            isChecked={locationAllCaps}
                                            onChange={(e) => setLocationAllCaps(e.target.checked)}
                                            colorScheme="gray"
                                        />
                                    </HStack>
                                </HStack>
                                <Input
                                    value={customText.location}
                                    {...clearableText('location', showLocation, setShowLocation)}
                                    placeholder={location ? location.toUpperCase() : 'Location'}
                                    autoComplete="new-password"
                                    {...inputStyles}
                                />
                                <Text fontSize="xs" color="gray.500" mt={1}>
                                    Clear this field to remove the location from your poster.
                                </Text>
                            </FormControl>
                            <FormControl>
                                <FormLabel {...labelStyles}>Custom Coordinates</FormLabel>
                                <Input
                                    value={customText.coords}
                                    {...clearableText('coords', showCoords, setShowCoords)}
                                    placeholder="0.0000° N, 0.0000° E"
                                    autoComplete="new-password"
                                    {...inputStyles}
                                />
                                <Text fontSize="xs" color="gray.500" mt={1}>
                                    Clear this field to remove the coordinates from your poster.
                                </Text>
                            </FormControl>
                            {showNames && (
                                <FormControl>
                                    <FormLabel {...labelStyles}>Names</FormLabel>
                                    <Input
                                        value={customText.names}
                                        onChange={(e) => setCustomText('names', e.target.value)}
                                        placeholder="e.g. James & Lilly"
                                        autoComplete="new-password"
                                        {...inputStyles}
                                    />
                                </FormControl>
                            )}
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
    );
};

export default TextContentPanel;
