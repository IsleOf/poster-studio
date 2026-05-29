// ColorPanel — Poster color palette presets, custom color pickers, background image upload.
import React, { useRef } from 'react';
import { useStore } from '../../store/useStore';
import { Box, VStack, HStack, Text, Input, Button, Image, IconButton } from '@chakra-ui/react';

const API = import.meta.env.VITE_API_URL || '';

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
        backgroundImageUrl, setBackgroundImageUrl,
        posterType,
    } = useStore();

    const fileInputRef = useRef<HTMLInputElement>(null);
    const [uploading, setUploading] = React.useState(false);

    async function handleImageUpload(e: React.ChangeEvent<HTMLInputElement>) {
        const file = e.target.files?.[0];
        if (!file) return;
        setUploading(true);
        try {
            // Try admin upload first (if authenticated)
            const adminJwt = localStorage.getItem('admin_jwt') || sessionStorage.getItem('admin_jwt') || '';
            if (adminJwt) {
                const reader = new FileReader();
                reader.onload = async () => {
                    const base64 = (reader.result as string).split(',')[1];
                    const res = await fetch(`${API}/api/admin/assets/upload`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${adminJwt}` },
                        body: JSON.stringify({ type: 'image', name: file.name, filename: file.name, data: base64 }),
                    });
                    if (res.ok) {
                        const data = await res.json();
                        setBackgroundImageUrl(`${API}${data.url}`);
                    } else {
                        // Fallback: use data URI directly (not persisted after reload)
                        setBackgroundImageUrl(reader.result as string);
                    }
                    setUploading(false);
                };
                reader.readAsDataURL(file);
            } else {
                // Guest mode: encode as data URI (lost on page reload, stored in design token on save)
                const reader = new FileReader();
                reader.onload = () => {
                    setBackgroundImageUrl(reader.result as string);
                    setUploading(false);
                };
                reader.readAsDataURL(file);
            }
        } catch {
            setUploading(false);
        }
        // Reset input so same file can be re-selected
        if (fileInputRef.current) fileInputRef.current.value = '';
    }

    return (
        <VStack align="stretch" spacing={3}>

            {/* Background color */}
            <ColorRow label="Background" value={posterColor} onChange={setPosterColor} />

            {/* Background image */}
            <Box p={3} bg="gray.50" borderRadius="md" border="1px solid" borderColor="gray.200">
                <HStack justify="space-between" mb={backgroundImageUrl ? 2 : 0}>
                    <Text fontSize="sm" color="gray.700" fontWeight="500">Background Image</Text>
                    <HStack spacing={1}>
                        {backgroundImageUrl && (
                            <IconButton
                                aria-label="Remove background image"
                                icon={<span>✕</span>}
                                size="xs" variant="ghost" colorScheme="red"
                                onClick={() => setBackgroundImageUrl(null)}
                            />
                        )}
                        <Button
                            size="xs"
                            variant="outline"
                            isLoading={uploading}
                            onClick={() => fileInputRef.current?.click()}
                        >
                            {backgroundImageUrl ? 'Replace' : 'Upload'}
                        </Button>
                    </HStack>
                </HStack>
                {backgroundImageUrl && (
                    <Image
                        src={backgroundImageUrl}
                        alt="Background preview"
                        h="60px" w="100%"
                        objectFit="cover"
                        borderRadius="sm"
                        border="1px solid"
                        borderColor="gray.200"
                    />
                )}
                {!backgroundImageUrl && (
                    <Text fontSize="xs" color="gray.400">
                        Upload an image to use as the poster background (replaces solid color).
                    </Text>
                )}
                <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/png,image/jpeg,image/webp"
                    style={{ display: 'none' }}
                    onChange={handleImageUpload}
                />
            </Box>

            {/* Text & elements */}
            <ColorRow label="Text & Elements" value={textColor} onChange={setTextColor} />

            {/* Street map gets per-layer color controls; star/colored maps derive interior from Background */}
            {posterType === 'streetmap' && (
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
            )}
        </VStack>
    );
};

export default ColorPanel;
