// TypographyPanel — Font family, size, kerning, and offset for all 5 text elements.
// Receives typoTab + setTypoTab from SidebarControls (the ref for auto-open lives there).

import React, { useState, useEffect } from 'react';
import { useStore } from '../../store/useStore';
import { labelStyles } from './sidebarStyles';
import GlyphPicker from '../GlyphPicker';
import {
    Box, VStack, HStack, Text, Button, Switch, FormControl, FormLabel, Select,
    Slider, SliderTrack, SliderFilledTrack, SliderThumb,
} from '@chakra-ui/react';

// ── Font lists ────────────────────────────────────────────────────────────────

const TITLE_FONTS = [
    { label: 'Cormorant Garamond', value: 'Cormorant Garamond' },
    { label: 'Playfair Display', value: 'Playfair Display' },
    { label: 'Cinzel', value: 'Cinzel' },
    { label: 'Title001', value: 'Title001' },
    { label: 'Title002', value: 'Title002' },
    { label: 'Title003', value: 'Title003' },
    { label: 'Details001', value: 'Details001' },
    { label: 'Mapped2', value: 'Mapped2' },
    { label: 'Bebas Neue', value: 'Bebas Neue' },
    { label: 'Oswald', value: 'Oswald' },
    { label: 'Poppins', value: 'Poppins' },
    { label: 'Nunito', value: 'Nunito' },
    { label: 'Orbitron', value: 'Orbitron' },
    { label: 'Calligraphy002', value: 'Calligraphy002' },
    { label: 'Mapped Moment Script ❤', value: 'Mapped Moment Script' },
    { label: 'Great Vibes', value: 'Great Vibes' },
    { label: 'Sacramento', value: 'Sacramento' },
    { label: 'Dancing Script', value: 'Dancing Script' },
    { label: 'Pinyon Script', value: 'Pinyon Script' },
    { label: 'Allura', value: 'Allura' },
    { label: 'Petit Formal Script', value: 'Petit Formal Script' },
    { label: 'Alex Brush', value: 'Alex Brush' },
    { label: 'Title004', value: 'Title004' },
];

const SUBTITLE_FONTS = [
    { label: 'Mapped Moment Script ❤', value: 'Mapped Moment Script' },
    { label: 'Title001', value: 'Title001' },
    { label: 'Details001', value: 'Details001' },
    { label: 'Details002', value: 'Details002' },
    { label: 'Mapped2', value: 'Mapped2' },
    { label: 'Poppins', value: 'Poppins' },
    { label: 'Nunito', value: 'Nunito' },
    { label: 'Oswald', value: 'Oswald' },
    { label: 'Space Mono', value: 'Space Mono' },
    { label: 'Playfair Display', value: 'Playfair Display' },
    { label: 'Cinzel', value: 'Cinzel' },
    { label: 'Typewriter', value: 'Typewriter' },
];

const DETAILS_FONTS = [
    { label: 'Montserrat', value: 'Montserrat' },
    { label: 'Title001', value: 'Title001' },
    { label: 'Details001', value: 'Details001' },
    { label: 'Details002', value: 'Details002' },
    { label: 'Mapped2', value: 'Mapped2' },
    { label: 'Lato', value: 'Lato' },
    { label: 'Space Mono', value: 'Space Mono' },
    { label: 'Typewriter', value: 'Typewriter' },
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
    { label: 'Details001', value: 'Details001' },
    { label: 'Details002', value: 'Details002' },
    { label: 'Playfair Display', value: 'Playfair Display' },
    { label: 'Cinzel', value: 'Cinzel' },
    { label: 'Title001', value: 'Title001' },
    { label: 'Title004', value: 'Title004' },
    { label: 'Montserrat', value: 'Montserrat' },
];

// ── Uploaded-font helpers ─────────────────────────────────────────────────────

interface UploadedFont { id: string; name: string; roles: string[] }
let _uploadedFontsCache: UploadedFont[] | null = null;
async function getUploadedFonts(): Promise<UploadedFont[]> {
    if (_uploadedFontsCache) return _uploadedFontsCache;
    try {
        const res = await fetch('/api/assets/fonts');
        if (res.ok) { _uploadedFontsCache = await res.json(); return _uploadedFontsCache!; }
    } catch { /* ignore */ }
    return (_uploadedFontsCache = []);
}

// ── Component ─────────────────────────────────────────────────────────────────

interface TypographyPanelProps {
    typoTab: 'title' | 'subtitle' | 'details' | 'dedication' | 'names';
    setTypoTab: (tab: 'title' | 'subtitle' | 'details' | 'dedication' | 'names') => void;
}

const TypographyPanel: React.FC<TypographyPanelProps> = ({ typoTab, setTypoTab }) => {
    const {
        titleFont, setTitleFont, titleFontSize, setTitleFontSize,
        titleKerning, setTitleKerning, titleLineHeight, setTitleLineHeight, titleOffsetY, setTitleOffsetY, titleAllCaps, setTitleAllCaps,
        title, customText,
        subtitleFont, setSubtitleFont, subtitleFontSize, setSubtitleFontSize,
        subtitleKerning, setSubtitleKerning, subtitleOffsetY, setSubtitleOffsetY,
        detailsFont, setDetailsFont, detailsFontSize, setDetailsFontSize,
        detailsKerning, setDetailsKerning, detailsOffsetY, setDetailsOffsetY,
        dedicationFont, setDedicationFont, dedicationFontSize, setDedicationFontSize,
        dedicationKerning, setDedicationKerning, dedicationOffsetY, setDedicationOffsetY,
        namesFont, setNamesFont, namesFontSize, setNamesFontSize,
        namesKerning, setNamesKerning, namesOffsetY, setNamesOffsetY,
        showNames,
    } = useStore();

    const [uploadedFonts, setUploadedFonts] = useState<UploadedFont[]>([]);

    useEffect(() => { getUploadedFonts().then(setUploadedFonts); }, []);

    const fontsForRole = (base: { label: string; value: string }[], role: string) => {
        const extra = uploadedFonts
            .filter(f => f.roles.includes(role))
            .map(f => ({ label: f.name, value: f.name }));
        const seen = new Set(base.map(f => f.value));
        return [...base, ...extra.filter(f => !seen.has(f.value))];
    };

    const TABS = ['title', 'subtitle', 'details', 'dedication', ...(showNames ? ['names'] : [])] as const;

    const sliderRow = (label: string, value: number, display: string, min: number, max: number, step: number, onChange: (v: number) => void) => (
        <Box w="full">
            <HStack justify="space-between" mb={1}>
                <Text fontSize="xs" color="gray.700" fontWeight="500">{label}</Text>
                <Text fontSize="xs" color="gray.500">{display}</Text>
            </HStack>
            <Slider value={value} min={min} max={max} step={step} onChange={onChange}>
                <SliderTrack bg="gray.200"><SliderFilledTrack bg="gray.900" /></SliderTrack>
                <SliderThumb boxSize={3} borderColor="gray.300" borderWidth="2px" />
            </Slider>
        </Box>
    );

    return (
        <VStack spacing={4} align="stretch">
            {/* Tab strip */}
            <HStack spacing={1}>
                {TABS.map((tab) => (
                    <Button
                        key={tab}
                        size="xs" flex={1}
                        onClick={() => setTypoTab(tab as typeof typoTab)}
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
                            {fontsForRole(TITLE_FONTS, 'title').map(f => <option key={f.value} value={f.value}>{f.label}</option>)}
                        </Select>
                    </FormControl>
                    {sliderRow('Font Size', titleFontSize, `${titleFontSize}px`, 24, 300, 1, setTitleFontSize)}
                    {sliderRow('Kerning', titleKerning, `${titleKerning.toFixed(2)}em`, -0.1, 0.5, 0.01, setTitleKerning)}
                    {/* Line spacing only matters when the title wraps to 2+ lines (a "\n" in the text) */}
                    {((customText?.title ?? title ?? '').includes('\n')) &&
                        sliderRow('Line Spacing', titleLineHeight, `${titleLineHeight.toFixed(2)}×`, 0.7, 2, 0.01, setTitleLineHeight)}
                    {sliderRow('Vertical Offset', titleOffsetY, `${titleOffsetY}px`, -100, 100, 1, setTitleOffsetY)}
                    <HStack justify="space-between" w="full">
                        <Text fontSize="xs" color="gray.700" fontWeight="500">All Caps</Text>
                        <Switch size="sm" isChecked={titleAllCaps} onChange={(e) => setTitleAllCaps(e.target.checked)} />
                    </HStack>
                    {titleFont === 'Mapped Moment Script' && <GlyphPicker defaultField="title" />}
                </VStack>
            )}

            {/* Subtitle tab */}
            {typoTab === 'subtitle' && (
                <VStack spacing={3}>
                    <FormControl>
                        <FormLabel {...labelStyles}>Font Family</FormLabel>
                        <Select size="sm" value={subtitleFont} onChange={(e) => setSubtitleFont(e.target.value)} bg="white" borderColor="gray.300" _hover={{ borderColor: 'gray.400' }}>
                            {fontsForRole(SUBTITLE_FONTS, 'subtitle').map(f => <option key={f.value} value={f.value}>{f.label}</option>)}
                        </Select>
                    </FormControl>
                    {sliderRow('Font Size', subtitleFontSize, `${subtitleFontSize}px`, 16, 200, 1, setSubtitleFontSize)}
                    {sliderRow('Kerning', subtitleKerning, `${subtitleKerning.toFixed(2)}em`, -0.1, 0.5, 0.01, setSubtitleKerning)}
                    {sliderRow('Vertical Offset', subtitleOffsetY, `${subtitleOffsetY}px`, -50, 50, 1, setSubtitleOffsetY)}
                    {subtitleFont === 'Mapped Moment Script' && <GlyphPicker defaultField="subtitle" />}
                </VStack>
            )}

            {/* Details tab */}
            {typoTab === 'details' && (
                <VStack spacing={3}>
                    <FormControl>
                        <FormLabel {...labelStyles}>Font Family</FormLabel>
                        <Select size="sm" value={detailsFont} onChange={(e) => setDetailsFont(e.target.value)} bg="white" borderColor="gray.300" _hover={{ borderColor: 'gray.400' }}>
                            {fontsForRole(DETAILS_FONTS, 'details').map(f => <option key={f.value} value={f.value}>{f.label}</option>)}
                        </Select>
                    </FormControl>
                    {sliderRow('Font Size', detailsFontSize, `${detailsFontSize}px`, 12, 48, 1, setDetailsFontSize)}
                    {sliderRow('Kerning', detailsKerning, `${detailsKerning.toFixed(2)}em`, -0.1, 0.5, 0.01, setDetailsKerning)}
                    {sliderRow('Vertical Offset', detailsOffsetY, `${detailsOffsetY}px`, -50, 50, 1, setDetailsOffsetY)}
                </VStack>
            )}

            {/* Dedication tab */}
            {typoTab === 'dedication' && (
                <VStack spacing={3}>
                    <FormControl>
                        <FormLabel {...labelStyles}>Font Family</FormLabel>
                        <Select size="sm" value={dedicationFont} onChange={(e) => setDedicationFont(e.target.value)} bg="white" borderColor="gray.300" _hover={{ borderColor: 'gray.400' }}>
                            {fontsForRole(DEDICATION_FONTS, 'dedication').map(f => <option key={f.value} value={f.value}>{f.label}</option>)}
                        </Select>
                    </FormControl>
                    {sliderRow('Font Size', dedicationFontSize, `${dedicationFontSize}px`, 12, 150, 1, setDedicationFontSize)}
                    {sliderRow('Kerning', dedicationKerning, `${dedicationKerning.toFixed(2)}em`, -0.1, 0.5, 0.01, setDedicationKerning)}
                    {sliderRow('Vertical Offset', dedicationOffsetY, `${Math.round(dedicationOffsetY)}px`, -50, 50, 1, (v) => setDedicationOffsetY(Math.round(v)))}
                    {dedicationFont === 'Mapped Moment Script' && <GlyphPicker defaultField="dedication" />}
                </VStack>
            )}

            {/* Names tab */}
            {typoTab === 'names' && (
                <VStack spacing={3}>
                    <FormControl>
                        <FormLabel {...labelStyles}>Font Family</FormLabel>
                        <Select size="sm" value={namesFont} onChange={(e) => setNamesFont(e.target.value)} bg="white" borderColor="gray.300" _hover={{ borderColor: 'gray.400' }}>
                            {fontsForRole(DEDICATION_FONTS, 'names').map(f => <option key={f.value} value={f.value}>{f.label}</option>)}
                        </Select>
                    </FormControl>
                    {sliderRow('Font Size', namesFontSize, `${namesFontSize}px`, 12, 200, 1, setNamesFontSize)}
                    {sliderRow('Kerning', namesKerning, `${namesKerning.toFixed(2)}em`, -0.1, 0.5, 0.01, setNamesKerning)}
                    {sliderRow('Vertical Offset', namesOffsetY, `${Math.round(namesOffsetY)}px`, -200, 200, 1, (v) => setNamesOffsetY(Math.round(v)))}
                </VStack>
            )}
        </VStack>
    );
};

export default TypographyPanel;
