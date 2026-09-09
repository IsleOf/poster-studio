// MapControlsPanel — City search, zoom, bearing, location pin, and map color presets.
// Rendered only when posterType !== 'starmap'. Extracted from SidebarControls.

import React, { useState } from 'react';
import { useStore } from '../../store/useStore';
import { trackEvent } from '../../utils/analytics';
import { zoomFromBbox } from '../../utils/geocode';
import CitySearch from '../CitySearch';
import { MAP_COLOR_PRESET_DATA as MAP_COLOR_PRESETS } from '../mapPresets';
import { useToast } from '@chakra-ui/react';
import {
    Box, VStack, HStack, Text, Input, Button, Grid, Switch, FormControl, FormLabel,
    Accordion, AccordionItem, AccordionButton, AccordionPanel, AccordionIcon,
    Slider, SliderTrack, SliderFilledTrack, SliderThumb,
} from '@chakra-ui/react';

const RECENT_KEY = 'poster_studio_recent_locations';

const MapControlsPanel: React.FC = () => {
    const {
        mapCity, setMapCity,
        mapCenterLat, setMapCenterLat,
        mapCenterLng, setMapCenterLng,
        mapZoom, setMapZoom,
        mapBearing, setMapBearing,
        mapLabelScale, setMapLabelScale,
        mapColorPreset, setMapColorPreset,
        mapBgColor, setMapBgColor,
        mapStreetColor, setMapStreetColor,
        setMapWaterColor, setMapLandColor,
        setMapMainRoadColor, setMapSmallRoadColor, setMapDetailRoadColor,
        setMapStyleUrl,
        setPosterColor, setTextColor,
        showLocationPin, setShowLocationPin,
        locationPinSize, setLocationPinSize,
        locationPinOffsetX, locationPinOffsetY,
        setLocationPinOffsetX, setLocationPinOffsetY,
        maskShape, circleSize, heartSize, houseSize,
        printSize, posterType,
        setLocation, setLat, setLng,
    } = useStore();

    const toast = useToast();

    const [recentLocations, setRecentLocations] = useState<{ name: string; lat: number; lng: number }[]>(() => {
        try { return JSON.parse(localStorage.getItem(RECENT_KEY) || '[]'); } catch { return []; }
    });

    const saveRecentLocation = (name: string, lat: number, lng: number) => {
        const next = [{ name, lat, lng }, ...recentLocations.filter(r => r.name !== name)].slice(0, 4);
        setRecentLocations(next);
        try { localStorage.setItem(RECENT_KEY, JSON.stringify(next)); } catch { /* quota */ }
    };

    const handleZoomChange = (newZoom: number) => {
        if (showLocationPin && (locationPinOffsetX !== 0 || locationPinOffsetY !== 0)) {
            const [rW, rH] = printSize.ratio.split('/').map(Number);
            const svgHeight = 1200 / (rW / rH);
            const baseMapRadius = Math.min(1200, svgHeight) * 0.4;
            const mapRadius = maskShape === 'rect'
                ? (1200 * 0.875) / 2
                : baseMapRadius * (maskShape === 'circle' ? circleSize : maskShape === 'heart' ? heartSize : houseSize);
            const imgSize = mapRadius * 3;
            const svgToCanvas = 1200 / imgSize;
            const worldWidthPx = 512 * Math.pow(2, mapZoom);
            const degPerCanvasPx = 360 / worldWidthPx;
            const pinLng = mapCenterLng + locationPinOffsetX * svgToCanvas * degPerCanvasPx;
            const pinLat = mapCenterLat - locationPinOffsetY * svgToCanvas * degPerCanvasPx
                * Math.cos(mapCenterLat * Math.PI / 180);
            setMapCenterLng(pinLng);
            setMapCenterLat(pinLat);
            setLocationPinOffsetX(0);
            setLocationPinOffsetY(0);
        }
        setMapZoom(newZoom);
    };

    return (
        <Box borderBottom="1px" borderColor="gray.200">
            <Accordion allowToggle defaultIndex={[0]} allowMultiple>
                {/* Location / city search */}
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
                                <HStack justify="space-between" mb={2}>
                                    <FormLabel fontSize="xs" fontWeight="600" color="gray.700" mb={0}>
                                        Location
                                    </FormLabel>
                                    <Button
                                        size="xs" variant="ghost" color="gray.500" fontSize="10px"
                                        px={2} h="auto" py={1}
                                        _hover={{ color: 'gray.900', bg: 'gray.50' }}
                                        title="Use my current location"
                                        onClick={() => {
                                            if (!navigator.geolocation) {
                                                toast({ title: 'Geolocation not supported', status: 'warning', duration: 3000, isClosable: true });
                                                return;
                                            }
                                            navigator.geolocation.getCurrentPosition(
                                                async (pos) => {
                                                    const { latitude: lat, longitude: lng } = pos.coords;
                                                    setMapCenterLat(lat);
                                                    setMapCenterLng(lng);
                                                    setLat(lat);
                                                    setLng(lng);
                                                    try {
                                                        const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`);
                                                        const data = await res.json();
                                                        const city = data.address?.city || data.address?.town || data.address?.village || data.address?.county || 'My Location';
                                                        const country = data.address?.country_code?.toUpperCase() || '';
                                                        setMapCity(city);
                                                        setLocation(`${city}${country ? `, ${country}` : ''}`);
                                                        trackEvent('city_search', { city, method: 'geolocation' });
                                                    } catch {
                                                        setMapCity('My Location');
                                                    }
                                                },
                                                () => toast({ title: 'Location access denied', description: 'Allow location access in your browser', status: 'error', duration: 4000, isClosable: true })
                                            );
                                        }}
                                    >
                                        ◎ My location
                                    </Button>
                                </HStack>
                                <CitySearch
                                    value={mapCity}
                                    onSelect={(r) => {
                                        setMapCity(r.name);
                                        setMapCenterLat(r.lat);
                                        setMapCenterLng(r.lng);
                                        if (r.boundingbox) setMapZoom(zoomFromBbox(r.boundingbox));
                                        setLocation(r.name + (r.state ? `, ${r.state}` : ''));
                                        setLat(r.lat);
                                        setLng(r.lng);
                                        saveRecentLocation(r.name, r.lat, r.lng);
                                        trackEvent('city_search', { city: r.name, country: r.country });
                                    }}
                                    onError={(msg) => toast({ title: 'Location search failed', description: msg, status: 'error', duration: 4000, isClosable: true })}
                                />
                                {recentLocations.length > 0 && (
                                    <Box mt={2}>
                                        <Text fontSize="10px" color="gray.400" fontWeight="600" mb={1} textTransform="uppercase" letterSpacing="0.08em">Recent</Text>
                                        <HStack spacing={1} flexWrap="wrap">
                                            {recentLocations.map((r) => (
                                                <Button
                                                    key={r.name}
                                                    size="xs" variant="outline" borderColor="gray.300" bg="white"
                                                    color="gray.600" fontSize="10px" fontWeight="500" borderRadius="full" px={2}
                                                    _hover={{ borderColor: 'gray.600', color: 'gray.900' }}
                                                    onClick={() => {
                                                        setMapCity(r.name);
                                                        setMapCenterLat(r.lat);
                                                        setMapCenterLng(r.lng);
                                                        setLocation(r.name);
                                                        setLat(r.lat);
                                                        setLng(r.lng);
                                                    }}
                                                >
                                                    {r.name}
                                                </Button>
                                            ))}
                                        </HStack>
                                    </Box>
                                )}
                            </FormControl>

                            <HStack spacing={3}>
                                <FormControl>
                                    <FormLabel fontSize="xs" fontWeight="600" color="gray.700" mb={2}>Lat</FormLabel>
                                    <Input
                                        size="sm" type="number" step="0.0001"
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
                                        size="sm" type="number" step="0.0001"
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
                                    Zoom: {mapZoom.toFixed(1)}
                                </FormLabel>
                                <Slider value={mapZoom} min={5} max={20} step={0.1} onChange={handleZoomChange} aria-label="map-zoom">
                                    <SliderTrack bg="gray.200"><SliderFilledTrack bg="gray.900" /></SliderTrack>
                                    <SliderThumb boxSize={3} borderColor="gray.300" borderWidth="1px" />
                                </Slider>
                                <HStack spacing={1} mt={2}>
                                    {([
                                        { label: 'Region', zoom: 9 },
                                        { label: 'City', zoom: 12 },
                                        { label: 'District', zoom: 14 },
                                        { label: 'Street', zoom: 16 },
                                    ] as const).map(({ label, zoom }) => (
                                        <Button key={label} size="xs" flex={1} variant="outline"
                                            borderColor={Math.abs(mapZoom - zoom) < 0.6 ? 'gray.900' : 'gray.300'}
                                            bg={Math.abs(mapZoom - zoom) < 0.6 ? 'gray.900' : 'white'}
                                            color={Math.abs(mapZoom - zoom) < 0.6 ? 'white' : 'gray.600'}
                                            fontWeight="500" fontSize="10px"
                                            onClick={() => handleZoomChange(zoom)}
                                            _hover={{ borderColor: 'gray.600', bg: 'gray.50', color: 'gray.900' }}
                                        >
                                            {label}
                                        </Button>
                                    ))}
                                </HStack>
                            </FormControl>

                            <FormControl>
                                <FormLabel fontSize="xs" fontWeight="600" color="gray.700" mb={2}>
                                    Rotation: {Math.round(mapBearing)}°
                                </FormLabel>
                                <Slider value={mapBearing} min={0} max={360} step={1} onChange={setMapBearing} aria-label="map-bearing">
                                    <SliderTrack bg="gray.200"><SliderFilledTrack bg="gray.900" /></SliderTrack>
                                    <SliderThumb boxSize={3} borderColor="gray.300" borderWidth="1px" />
                                </Slider>
                            </FormControl>

                            {/* Label size — colored map only (the 2-colour styles hide all labels).
                                Scales the vector text size in the style, re-rendered at full print
                                resolution, so larger labels stay crisp at 300 DPI. */}
                            {posterType === 'coloredmap' && (
                                <FormControl>
                                    <FormLabel fontSize="xs" fontWeight="600" color="gray.700" mb={2}>
                                        Label size: {Math.round(mapLabelScale * 100)}%
                                    </FormLabel>
                                    <Slider value={mapLabelScale} min={0.7} max={2.2} step={0.1} onChange={setMapLabelScale} aria-label="map-label-size">
                                        <SliderTrack bg="gray.200"><SliderFilledTrack bg="gray.900" /></SliderTrack>
                                        <SliderThumb boxSize={3} borderColor="gray.300" borderWidth="1px" />
                                    </Slider>
                                    <Text fontSize="10px" color="gray.400" mt={1}>Bigger labels may show fewer names (they need more room).</Text>
                                </FormControl>
                            )}

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

                {/* Presets are starting points; exact map colors live in the Color panel. */}
                {posterType === 'streetmap' && (
                    <AccordionItem border="none">
                        <h2>
                            <AccordionButton _expanded={{ bg: 'gray.50' }} py={4} px={6}>
                                <Box flex="1" textAlign="left" fontWeight="600" fontSize="sm" color="gray.900">
                                    Map Style Presets
                                </Box>
                                <AccordionIcon color="gray.400" />
                            </AccordionButton>
                        </h2>
                        <AccordionPanel pb={6} px={6}>
                            <VStack spacing={4} align="stretch">
                                <Grid templateColumns="repeat(4, 1fr)" gap={2}>
                                    {MAP_COLOR_PRESETS.map((preset) => (
                                        <Box
                                            key={preset.id}
                                            as="button"
                                            onClick={() => {
                                                setMapColorPreset(preset.id);
                                                setMapBgColor(preset.bgColor);
                                                setMapStreetColor(preset.streetColor);
                                                setMapStyleUrl(preset.styleUrl ?? null);
                                                if (preset.id === 'design2') {
                                                    setMapWaterColor('#8f8f8f');
                                                    setMapLandColor('#b6b6b6');
                                                    setMapMainRoadColor('#111111');
                                                    setMapSmallRoadColor('#1a1a1a');
                                                    setMapDetailRoadColor('#2a2a2a');
                                                    setPosterColor(preset.bgColor);
                                                    setTextColor('#111111');
                                                } else if (preset.styleUrl) {
                                                    setPosterColor('#ffffff');
                                                    setTextColor('#1a1a1a');
                                                } else {
                                                    setPosterColor(preset.bgColor);
                                                    setTextColor(preset.id === 'classic' ? '#1a1a1a' : '#ffffff');
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
                                                <Box h="28px" style={{ background: 'linear-gradient(135deg, #AECFE2 0%, #d8e8c8 30%, #f8f4f0 50%, #fea 70%, #fc8 100%)' }} />
                                            ) : (
                                                <Box h="28px" bg={preset.bgColor} />
                                            )}
                                            <Box h="16px" bg="white" display="flex" alignItems="center" justifyContent="center">
                                                <Text fontSize="7px" fontWeight="700" color="gray.600">{preset.name.toUpperCase()}</Text>
                                            </Box>
                                        </Box>
                                    ))}
                                </Grid>
                                <Text fontSize="xs" color="gray.500">
                                    Use this only as a starting point. Fine-tune background, water, land, and street colors in the Color section.
                                </Text>
                            </VStack>
                        </AccordionPanel>
                    </AccordionItem>
                )}
            </Accordion>
        </Box>
    );
};

export default MapControlsPanel;
