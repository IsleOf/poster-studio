// StylePanel — Border, divider, design style, mask shape, light mode, star controls, frame.
// Extracted from SidebarControls. Uses useStore() directly.

import React from 'react';
import { useStore } from '../../store/useStore';
import { labelStyles, toggleButtonStyles } from './sidebarStyles';
import {
    Box, VStack, HStack, Text, Button, Switch, FormControl, FormLabel,
    Slider, SliderTrack, SliderFilledTrack, SliderThumb,
} from '@chakra-ui/react';

const StylePanel: React.FC = () => {
    const {
        showBorder, setShowBorder,
        showDivider, setShowDivider,
        dividerLength, setDividerLength,
        dividerThickness, setDividerThickness,
        dividerOffsetY, setDividerOffsetY,
        designStyle, setDesignStyle,
        maskShape, setMaskShape,
        isLightMode, setIsLightMode,
        setStarColor,
        showConstellations, setShowConstellations,
        showGrid, setShowGrid,
        gridWidth, setGridWidth,
        gridOpacity, setGridOpacity,
        starScale, setStarScale,
        lineWeight, setLineWeight,
        glowIntensity, setGlowIntensity,
        circleSize, setCircleSize,
        heartSize, setHeartSize,
        houseSize, setHouseSize,
        snapEnabled, setSnapEnabled,
        shapeOutlineWidth, setShapeOutlineWidth,
        finelineWidth, setFinelineWidth,
        showFrame, setShowFrame,
        frameInset, setFrameInset,
        frameWidth, setFrameWidth,
        posterType,
        showInnerRing, setShowInnerRing,
        innerRingWidth, setInnerRingWidth,
        innerRingInset, setInnerRingInset,
        showOuterRing, setShowOuterRing,
        outerRingWidth, setOuterRingWidth,
        outerRingGap, setOuterRingGap,
        showHeartDecor, setShowHeartDecor,
    } = useStore();

    const sliderRow = (label: string, value: number, display: string, min: number, max: number, step: number, onChange: (v: number) => void) => (
        <Box>
            <HStack justify="space-between" mb={2}>
                <Text fontSize="sm" color="gray.700" fontWeight="500">{label}</Text>
                <Text fontSize="xs" color="gray.500" fontWeight="600">{display}</Text>
            </HStack>
            <Slider value={value} min={min} max={max} step={step} onChange={onChange}>
                <SliderTrack bg="gray.200"><SliderFilledTrack bg="gray.900" /></SliderTrack>
                <SliderThumb boxSize={4} borderColor="gray.300" borderWidth="2px" />
            </Slider>
        </Box>
    );

    return (
        <VStack spacing={6} align="stretch">
            {/* Border */}
            <HStack justify="space-between">
                <Text fontSize="sm" fontWeight="500" color="gray.700">Show Border</Text>
                <Switch isChecked={showBorder} onChange={(e) => setShowBorder(e.target.checked)} colorScheme="blue" />
            </HStack>

            {/* Divider */}
            <Box>
                <HStack justify="space-between" mb={showDivider ? 3 : 0}>
                    <Text fontSize="sm" fontWeight="500" color="gray.700">Divider Line</Text>
                    <Switch isChecked={showDivider} onChange={(e) => setShowDivider(e.target.checked)} colorScheme="blue" />
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

            {/* Design Style */}
            <FormControl>
                <FormLabel {...labelStyles}>Design Style</FormLabel>
                <HStack spacing={2}>
                    <Button onClick={() => { setDesignStyle('standard'); setShapeOutlineWidth(1.0); }} {...toggleButtonStyles(designStyle === 'standard')}>Standard</Button>
                    <Button onClick={() => { setDesignStyle('fineline'); setShapeOutlineWidth(0.5); }} {...toggleButtonStyles(designStyle === 'fineline')}>Fineline</Button>
                </HStack>
            </FormControl>

            {/* Mask Shape */}
            <FormControl>
                <FormLabel {...labelStyles}>Mask Shape</FormLabel>
                <HStack spacing={1}>
                    <Button onClick={() => { setMaskShape('circle'); setShowBorder(true); if (shapeOutlineWidth === 0) setShapeOutlineWidth(2); }} {...toggleButtonStyles(maskShape === 'circle')} fontSize="xs">○ Circle</Button>
                    <Button onClick={() => { setMaskShape('heart'); setShowBorder(true); if (shapeOutlineWidth === 0) setShapeOutlineWidth(2); }} {...toggleButtonStyles(maskShape === 'heart')} fontSize="xs">♥ Heart</Button>
                    <Button onClick={() => { setMaskShape('house'); setShowBorder(true); if (shapeOutlineWidth === 0) setShapeOutlineWidth(2); }} {...toggleButtonStyles(maskShape === 'house')} fontSize="xs">⌂ House</Button>
                    <Button onClick={() => { setMaskShape('rect'); setShowBorder(false); setShapeOutlineWidth(0); }} {...toggleButtonStyles(maskShape === 'rect')} fontSize="xs">▭ Rect</Button>
                </HStack>
            </FormControl>

            {/* Light Mode */}
            <HStack justify="space-between">
                <Text fontSize="sm" fontWeight="500" color="gray.700">Light Mode</Text>
                <Switch
                    isChecked={isLightMode}
                    onChange={(e) => {
                        setIsLightMode(e.target.checked);
                        setStarColor(e.target.checked ? '#1a1a1a' : '#ffffff');
                    }}
                    colorScheme="blue"
                />
            </HStack>

            {/* Star-map-only controls */}
            {posterType === 'starmap' && (<>
                <FormControl display="flex" alignItems="center" justifyContent="space-between">
                    <FormLabel fontSize="sm" color="gray.700" fontWeight="500" mb={0}>Constellation Lines</FormLabel>
                    <Switch isChecked={showConstellations} onChange={(e) => setShowConstellations(e.target.checked)} colorScheme="gray" />
                </FormControl>
                {sliderRow('Star Size', starScale, `${starScale.toFixed(1)}x`, 0.5, 2.2, 0.1, setStarScale)}
                {sliderRow('Line Weight', lineWeight, `${lineWeight.toFixed(1)}pt`, 0.1, 1.8, 0.1, setLineWeight)}
                {sliderRow('Glow Intensity', glowIntensity, String(glowIntensity), 0, 20, 1, setGlowIntensity)}
                <FormControl display="flex" alignItems="center" justifyContent="space-between">
                    <FormLabel fontSize="sm" color="gray.700" fontWeight="500" mb={0}>Show Grid</FormLabel>
                    <Switch isChecked={showGrid} onChange={(e) => setShowGrid(e.target.checked)} colorScheme="gray" />
                </FormControl>
                {showGrid && (<>
                    {sliderRow('Grid Width', gridWidth, `${gridWidth.toFixed(1)}pt`, 0.1, 1.2, 0.1, setGridWidth)}
                    {sliderRow('Grid Opacity', gridOpacity, `${Math.round(gridOpacity * 100)}%`, 0, 1, 0.05, setGridOpacity)}
                </>)}
            </>)}

            {/* Shape size sliders */}
            {maskShape === 'circle' && sliderRow('Circle Size', circleSize, `${circleSize.toFixed(2)}x`, 0.5, 1.5, 0.05, setCircleSize)}
            {maskShape === 'heart' && sliderRow('Heart Size', heartSize, `${heartSize.toFixed(2)}x`, 0.5, 1.5, 0.05, setHeartSize)}
            {maskShape === 'house' && sliderRow('House Size', houseSize, `${houseSize.toFixed(2)}x`, 0.5, 1.5, 0.05, setHouseSize)}

            {/* Snap to Center */}
            <FormControl display="flex" alignItems="center" justifyContent="space-between">
                <FormLabel fontSize="sm" color="gray.700" fontWeight="500" mb={0}>Snap to Center</FormLabel>
                <Switch isChecked={snapEnabled} onChange={(e) => setSnapEnabled(e.target.checked)} colorScheme="blue" />
            </FormControl>

            {/* Shape Outline */}
            <FormControl display="flex" alignItems="center" justifyContent="space-between">
                <FormLabel fontSize="sm" color="gray.700" fontWeight="500" mb={0}>Show Shape Outline</FormLabel>
                <Switch isChecked={showBorder} onChange={(e) => setShowBorder(e.target.checked)} colorScheme="blue" />
            </FormControl>
            {showBorder && sliderRow('Shape Outline Width', shapeOutlineWidth, `${shapeOutlineWidth.toFixed(1)}pt`, 0.5, 6.0, 0.5, setShapeOutlineWidth)}

            {/* Fineline Spacing — only relevant when border is visible and fineline style is active */}
            {showBorder && designStyle === 'fineline' && sliderRow('Fineline Spacing', finelineWidth, `${finelineWidth.toFixed(1)}pt`, 0.5, 5, 0.1, setFinelineWidth)}

            {/* Frame Controls */}
            <Box pt={4} borderTop="1px" borderColor="gray.100">
                <HStack justify="space-between" mb={4}>
                    <Text fontSize="sm" fontWeight="500" color="gray.700">Show Frame</Text>
                    <Switch isChecked={showFrame} onChange={(e) => setShowFrame(e.target.checked)} colorScheme="blue" />
                </HStack>
                {showFrame && (
                    <VStack spacing={4}>
                        <Box w="full">
                            <HStack justify="space-between" mb={2}>
                                <Text fontSize="sm" color="gray.700" fontWeight="500">Frame Inset</Text>
                                <Text fontSize="xs" color="gray.500" fontWeight="600">{frameInset}pt</Text>
                            </HStack>
                            <Slider value={frameInset} min={10} max={100} step={5} onChange={setFrameInset}>
                                <SliderTrack bg="gray.200"><SliderFilledTrack bg="gray.900" /></SliderTrack>
                                <SliderThumb boxSize={4} borderColor="gray.300" borderWidth="2px" />
                            </Slider>
                        </Box>
                        <Box w="full">
                            <HStack justify="space-between" mb={2}>
                                <Text fontSize="sm" color="gray.700" fontWeight="500">Frame Width</Text>
                                <Text fontSize="xs" color="gray.500" fontWeight="600">{frameWidth.toFixed(1)}pt</Text>
                            </HStack>
                            <Slider value={frameWidth} min={0.5} max={8.0} step={0.5} onChange={setFrameWidth}>
                                <SliderTrack bg="gray.200"><SliderFilledTrack bg="gray.900" /></SliderTrack>
                                <SliderThumb boxSize={4} borderColor="gray.300" borderWidth="2px" />
                            </Slider>
                        </Box>
                    </VStack>
                )}
            </Box>

            {/* Inner Ring (circle only) */}
            {maskShape === 'circle' && (
                <Box>
                    <HStack justify="space-between" mb={showInnerRing ? 3 : 0}>
                        <Text fontSize="sm" fontWeight="500" color="gray.700">Inner Ring</Text>
                        <Switch isChecked={showInnerRing} onChange={(e) => setShowInnerRing(e.target.checked)} colorScheme="blue" />
                    </HStack>
                    {showInnerRing && (
                        <VStack spacing={3}>
                            <Box w="full">
                                <HStack justify="space-between" mb={1}>
                                    <Text fontSize="xs" color="gray.700" fontWeight="500">Width</Text>
                                    <Text fontSize="xs" color="gray.500">{innerRingWidth.toFixed(1)}pt</Text>
                                </HStack>
                                <Slider value={innerRingWidth} min={0.5} max={6} step={0.5} onChange={setInnerRingWidth}>
                                    <SliderTrack bg="gray.200"><SliderFilledTrack bg="gray.900" /></SliderTrack>
                                    <SliderThumb boxSize={3} borderColor="gray.300" borderWidth="2px" />
                                </Slider>
                            </Box>
                            <Box w="full">
                                <HStack justify="space-between" mb={1}>
                                    <Text fontSize="xs" color="gray.700" fontWeight="500">Inset</Text>
                                    <Text fontSize="xs" color="gray.500">{innerRingInset}px</Text>
                                </HStack>
                                <Slider value={innerRingInset} min={4} max={30} step={1} onChange={setInnerRingInset}>
                                    <SliderTrack bg="gray.200"><SliderFilledTrack bg="gray.900" /></SliderTrack>
                                    <SliderThumb boxSize={3} borderColor="gray.300" borderWidth="2px" />
                                </Slider>
                            </Box>
                        </VStack>
                    )}
                </Box>
            )}

            {/* Outer Ring (circle only) */}
            {maskShape === 'circle' && (
                <Box>
                    <HStack justify="space-between" mb={showOuterRing ? 3 : 0}>
                        <Text fontSize="sm" fontWeight="500" color="gray.700">Outer Ring</Text>
                        <Switch isChecked={showOuterRing} onChange={(e) => setShowOuterRing(e.target.checked)} colorScheme="blue" />
                    </HStack>
                    {showOuterRing && (
                        <VStack spacing={3}>
                            <Box w="full">
                                <HStack justify="space-between" mb={1}>
                                    <Text fontSize="xs" color="gray.700" fontWeight="500">Width</Text>
                                    <Text fontSize="xs" color="gray.500">{outerRingWidth.toFixed(1)}pt</Text>
                                </HStack>
                                <Slider value={outerRingWidth} min={0.5} max={6} step={0.5} onChange={setOuterRingWidth}>
                                    <SliderTrack bg="gray.200"><SliderFilledTrack bg="gray.900" /></SliderTrack>
                                    <SliderThumb boxSize={3} borderColor="gray.300" borderWidth="2px" />
                                </Slider>
                            </Box>
                            <Box w="full">
                                <HStack justify="space-between" mb={1}>
                                    <Text fontSize="xs" color="gray.700" fontWeight="500">Gap</Text>
                                    <Text fontSize="xs" color="gray.500">{outerRingGap}px</Text>
                                </HStack>
                                <Slider value={outerRingGap} min={4} max={50} step={1} onChange={setOuterRingGap}>
                                    <SliderTrack bg="gray.200"><SliderFilledTrack bg="gray.900" /></SliderTrack>
                                    <SliderThumb boxSize={3} borderColor="gray.300" borderWidth="2px" />
                                </Slider>
                            </Box>
                        </VStack>
                    )}
                </Box>
            )}

            {/* Heart Decoration */}
            <Box pt={4} borderTop="1px" borderColor="gray.100">
                <HStack justify="space-between">
                    <Text fontSize="sm" fontWeight="500" color="gray.700">Heart Decoration</Text>
                    <Switch isChecked={showHeartDecor} onChange={(e) => setShowHeartDecor(e.target.checked)} colorScheme="blue" />
                </HStack>
            </Box>
        </VStack>
    );
};

export default StylePanel;
