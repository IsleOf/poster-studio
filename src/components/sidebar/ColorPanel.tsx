// ColorPanel — Poster color palette presets and custom color pickers.
// Extracted from SidebarControls. Uses useStore() directly.

import React from 'react';
import { useStore } from '../../store/useStore';
import { Box, VStack, HStack, Text, Input } from '@chakra-ui/react';

const PALETTE_PRESETS = [
    { bg: '#0a1628', text: '#c8b888', label: 'Navy Gold' },
    { bg: '#1a1a2e', text: '#e0d0b0', label: 'Midnight Cream' },
    { bg: '#ffffff', text: '#1a202c', label: 'Clean White' },
    { bg: '#f5f5f0', text: '#2d3748', label: 'Ivory' },
    { bg: '#0d1b3e', text: '#d4a574', label: 'Indigo Copper' },
    { bg: '#1a0a00', text: '#f0c080', label: 'Dark Amber' },
    { bg: '#0a2818', text: '#a8d8a0', label: 'Forest' },
    { bg: '#1a0a2e', text: '#c8a0e8', label: 'Cosmic' },
];

const ColorPanel: React.FC = () => {
    const {
        posterColor, setPosterColor,
        textColor, setTextColor,
        starColor, setStarColor,
        mapInteriorColor, setMapInteriorColor,
        mapStreetColor, setMapStreetColor,
        posterType,
    } = useStore();

    return (
        <VStack align="stretch" spacing={3}>
            {/* Color palette presets */}
            <Text fontSize="xs" fontWeight="600" color="gray.700">Presets</Text>
            <HStack flexWrap="wrap" spacing={2}>
                {PALETTE_PRESETS.map(({ bg, text, label }) => (
                    <Box
                        key={bg}
                        w="28px" h="28px" borderRadius="md" bg={bg}
                        border="2px solid"
                        borderColor={posterColor === bg ? 'blue.400' : 'gray.300'}
                        cursor="pointer" title={label}
                        position="relative" overflow="hidden"
                        onClick={() => {
                            setPosterColor(bg);
                            setTextColor(text);
                            setStarColor(text);
                            setMapInteriorColor(bg);
                        }}
                        _hover={{ borderColor: 'blue.300' }}
                    >
                        <Box position="absolute" bottom={0} left={0} right={0} h="35%" bg={text} opacity={0.8} />
                    </Box>
                ))}
            </HStack>

            <Text fontSize="xs" fontWeight="600" color="gray.700">Custom Colors</Text>

            {/* Background */}
            <HStack justify="space-between" p={3} bg="gray.50" borderRadius="md" border="1px solid" borderColor="gray.200">
                <Text fontSize="sm" color="gray.700" fontWeight="500">Background</Text>
                <HStack>
                    <Text fontSize="xs" color="gray.500" fontFamily="mono">{posterColor}</Text>
                    <Input
                        type="color" w={8} h={8} p={0}
                        border="1px solid" borderColor="gray.300" borderRadius="md" bg="transparent"
                        value={posterColor}
                        onChange={(e) => setPosterColor(e.target.value)}
                        cursor="pointer"
                    />
                </HStack>
            </HStack>

            {/* Text & elements */}
            <HStack justify="space-between" p={3} bg="gray.50" borderRadius="md" border="1px solid" borderColor="gray.200">
                <Text fontSize="sm" color="gray.700" fontWeight="500">Text & Elements</Text>
                <HStack>
                    <Text fontSize="xs" color="gray.500" fontFamily="mono">{textColor}</Text>
                    <Input
                        type="color" w={8} h={8} p={0}
                        border="1px solid" borderColor="gray.300" borderRadius="md" bg="transparent"
                        value={textColor}
                        onChange={(e) => setTextColor(e.target.value)}
                        cursor="pointer"
                    />
                </HStack>
            </HStack>

            {/* Streets (streetmap) or Map Background (starmap/coloredmap) */}
            {posterType === 'streetmap' ? (
                <HStack justify="space-between" p={3} bg="gray.50" borderRadius="md" border="1px solid" borderColor="gray.200">
                    <Text fontSize="sm" color="gray.700" fontWeight="500">Streets</Text>
                    <HStack>
                        <Text fontSize="xs" color="gray.500" fontFamily="mono">{mapStreetColor}</Text>
                        <Input
                            type="color" w={8} h={8} p={0}
                            border="1px solid" borderColor="gray.300" borderRadius="md" bg="transparent"
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
                        <Text fontSize="xs" color="gray.500" fontFamily="mono">{mapInteriorColor}</Text>
                        <Input
                            type="color" w={8} h={8} p={0}
                            border="1px solid" borderColor="gray.300" borderRadius="md" bg="transparent"
                            value={mapInteriorColor}
                            onChange={(e) => setMapInteriorColor(e.target.value)}
                            cursor="pointer"
                        />
                    </HStack>
                </HStack>
            )}
        </VStack>
    );
};

export default ColorPanel;
