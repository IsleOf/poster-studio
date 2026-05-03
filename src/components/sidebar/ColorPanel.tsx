// ColorPanel — Poster color palette presets and custom color pickers.
// Extracted from SidebarControls. Uses useStore() directly.

import React from 'react';
import { useStore } from '../../store/useStore';
import { Box, VStack, HStack, Text, Input } from '@chakra-ui/react';

type ColorRowProps = {
    label: string;
    value: string;
    onChange: (value: string) => void;
};

const ColorRow: React.FC<ColorRowProps> = ({ label, value, onChange }) => (
    <HStack justify="space-between" p={3} bg="gray.50" borderRadius="md" border="1px solid" borderColor="gray.200">
        <Text fontSize="sm" color="gray.700" fontWeight="500">{label}</Text>
        <HStack>
            <Text fontSize="xs" color="gray.500" fontFamily="mono">{value}</Text>
            <Input
                type="color" w={8} h={8} p={0}
                border="1px solid" borderColor="gray.300" borderRadius="md" bg="transparent"
                value={value}
                onChange={(e) => onChange(e.target.value)}
                cursor="pointer"
            />
        </HStack>
    </HStack>
);

const ColorPanel: React.FC = () => {
    const {
        posterColor, setPosterColor,
        textColor, setTextColor,
        starColor, setStarColor,
        mapInteriorColor, setMapInteriorColor,
        mapStreetColor, setMapStreetColor,
        mapBgColor, setMapBgColor,
        mapWaterColor, setMapWaterColor,
        mapLandColor, setMapLandColor,
        mapMainRoadColor, setMapMainRoadColor,
        mapSmallRoadColor, setMapSmallRoadColor,
        mapDetailRoadColor, setMapDetailRoadColor,
        posterType,
    } = useStore();

    return (
        <VStack align="stretch" spacing={3}>

            {/* Background */}
            <ColorRow label="Background" value={posterColor} onChange={setPosterColor} />

            {/* Text & elements */}
            <ColorRow label="Text & Elements" value={textColor} onChange={setTextColor} />

            {/* Element-level street-map colors or shape interior for non-street maps. */}
            {posterType === 'streetmap' ? (
                <>
                    <Box pt={2}>
                        <Text fontSize="sm" color="gray.700" fontWeight="700">Map Colors</Text>
                        <Text fontSize="xs" color="gray.500">Controls apply to the actual vector map layers.</Text>
                    </Box>
                    <ColorRow label="Map Background" value={mapBgColor} onChange={setMapBgColor} />
                    <ColorRow label="Water" value={mapWaterColor} onChange={setMapWaterColor} />
                    <ColorRow label="Land/Parks" value={mapLandColor} onChange={setMapLandColor} />
                    <ColorRow label="Main Streets" value={mapMainRoadColor} onChange={(value) => {
                        setMapMainRoadColor(value);
                        setMapStreetColor(value);
                    }} />
                    <ColorRow label="Small Streets" value={mapSmallRoadColor} onChange={setMapSmallRoadColor} />
                    <ColorRow label="Detail Streets" value={mapDetailRoadColor} onChange={setMapDetailRoadColor} />
                </>
            ) : (
                <ColorRow label="Map Background" value={mapInteriorColor} onChange={setMapInteriorColor} />
            )}
        </VStack>
    );
};

export default ColorPanel;
