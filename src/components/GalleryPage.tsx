import React, { useEffect, useState } from 'react';
import {
    Box, Flex, Heading, Text, SimpleGrid, Button, VStack,
    Spinner, Badge, HStack,
} from '@chakra-ui/react';
import { useNavigate } from 'react-router-dom';

const API = import.meta.env.VITE_API_URL || '';

interface Template {
    id: string;
    name: string;
    description: string | null;
    thumbnail_path: string | null;
    etsy_listing_url: string | null;
}

const POSTER_TYPE_LABELS: Record<string, { label: string; color: string }> = {
    starmap:    { label: 'Star Map',     color: 'purple' },
    streetmap:  { label: 'Street Map',  color: 'blue' },
    coloredmap: { label: 'Colored Map', color: 'green' },
};

const GalleryPage: React.FC = () => {
    const [templates, setTemplates] = useState<Template[]>([]);
    const [loading, setLoading] = useState(true);
    const navigate = useNavigate();

    useEffect(() => {
        fetch(`${API}/api/templates`)
            .then(r => r.json())
            .then(setTemplates)
            .catch(() => {})
            .finally(() => setLoading(false));
    }, []);

    return (
        <Box minH="100vh" bg="gray.50">
            {/* Header */}
            <Box bg="gray.900" color="white" py={{ base: 8, md: 12 }} px={{ base: 4, md: 8 }}>
                <Box maxW="1100px" mx="auto">
                    <HStack spacing={4} mb={4}>
                        <Button size="xs" variant="ghost" color="gray.400" _hover={{ color: 'white' }}
                            onClick={() => navigate('/')}>
                            ← Designer
                        </Button>
                    </HStack>
                    <Heading size={{ base: 'xl', md: '2xl' }} fontWeight="800" letterSpacing="-0.02em" mb={3}>
                        Template Gallery
                    </Heading>
                    <Text color="gray.400" fontSize={{ base: 'sm', md: 'md' }} maxW="520px">
                        Choose a starting point and personalise it — change the location, date, title, colours, and fonts.
                        All posters are free to preview.
                    </Text>
                </Box>
            </Box>

            {/* Grid */}
            <Box maxW="1100px" mx="auto" px={{ base: 4, md: 8 }} py={{ base: 8, md: 12 }}>
                {loading ? (
                    <Flex justify="center" py={20}><Spinner size="lg" /></Flex>
                ) : templates.length === 0 ? (
                    <Text color="gray.500" textAlign="center" py={20}>No templates found.</Text>
                ) : (
                    <SimpleGrid columns={{ base: 1, sm: 2, md: 3, lg: 4 }} spacing={6}>
                        {templates.map(t => (
                            <TemplateCard key={t.id} template={t} onOpen={() => navigate(`/t/${t.id}`)} />
                        ))}
                    </SimpleGrid>
                )}
            </Box>
        </Box>
    );
};

const TemplateCard: React.FC<{ template: Template; onOpen: () => void }> = ({ template: t, onOpen }) => {
    const posterType = (t as any).posterType || '';
    const typeInfo = POSTER_TYPE_LABELS[posterType];

    return (
        <Box
            bg="white"
            borderRadius="xl"
            overflow="hidden"
            border="1px"
            borderColor="gray.200"
            _hover={{ borderColor: 'gray.400', shadow: 'md' }}
            transition="all 0.15s"
            cursor="pointer"
            onClick={onOpen}
        >
            {/* Thumbnail / placeholder */}
            <Box
                bg="gray.900"
                h="180px"
                position="relative"
                overflow="hidden"
            >
                {t.thumbnail_path ? (
                    <Box
                        as="img"
                        src={`${API}${t.thumbnail_path}`}
                        alt={t.name}
                        w="100%"
                        h="100%"
                        objectFit="cover"
                        style={{ display: 'block' }}
                    />
                ) : (
                    <Flex h="100%" align="center" justify="center" opacity={0.3}>
                        <svg width="48" height="48" viewBox="0 0 24 24" fill="white">
                            <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/>
                        </svg>
                    </Flex>
                )}
                {typeInfo && (
                    <Badge
                        position="absolute" top={2} left={2}
                        colorScheme={typeInfo.color}
                        fontSize="10px"
                    >
                        {typeInfo.label}
                    </Badge>
                )}
            </Box>

            {/* Info */}
            <VStack align="stretch" spacing={1} p={4}>
                <Text fontWeight="700" fontSize="sm" color="gray.900" noOfLines={1}>{t.name}</Text>
                {t.description && (
                    <Text fontSize="xs" color="gray.500" noOfLines={2} lineHeight="1.5">{t.description}</Text>
                )}
                <HStack spacing={2} mt={2} pt={2} borderTop="1px" borderColor="gray.100">
                    <Button size="xs" bg="gray.900" color="white" _hover={{ bg: 'gray.700' }} flex="1" onClick={onOpen}>
                        Customise
                    </Button>
                    {t.etsy_listing_url && (
                        <Button
                            size="xs" variant="outline" flex="1"
                            onClick={(e) => { e.stopPropagation(); window.open(t.etsy_listing_url!, '_blank'); }}
                        >
                            Buy on Etsy
                        </Button>
                    )}
                </HStack>
            </VStack>
        </Box>
    );
};

export default GalleryPage;
