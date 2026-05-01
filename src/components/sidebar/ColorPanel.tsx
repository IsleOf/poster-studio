// ColorPanel — Poster color palette presets and custom color pickers.
// Extracted from SidebarControls. Uses useStore() directly.

import React from 'react';
import { useStore } from '../../store/useStore';
import { Box, VStack, HStack, Text, Input } from '@chakra-ui/react';


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
