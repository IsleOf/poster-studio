import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
    Box, Flex, Heading, Text, SimpleGrid, Button, VStack, HStack,
    Spinner, Badge,
} from '@chakra-ui/react';

const API = import.meta.env.VITE_API_URL || '';

interface ListingTemplate {
    id: string;
    name: string;
    description?: string;
    thumbnail_path?: string;
}

interface Listing {
    id: number;
    slug: string;
    name: string;
    description?: string;
    banner_image?: string;
    templates: ListingTemplate[];
}

const ListingPage: React.FC = () => {
    const { slug } = useParams<{ slug: string }>();
    const navigate = useNavigate();
    const [listing, setListing] = useState<Listing | null>(null);
    const [loading, setLoading] = useState(true);
    const [notFound, setNotFound] = useState(false);

    useEffect(() => {
        if (!slug) return;
        fetch(`${API}/api/listings/${slug}`)
            .then(r => {
                if (!r.ok) { setNotFound(true); setLoading(false); return null; }
                return r.json();
            })
            .then(data => { if (data) setListing(data); })
            .catch(() => setNotFound(true))
            .finally(() => setLoading(false));
    }, [slug]);

    if (loading) {
        return (
            <Flex minH="100vh" align="center" justify="center" bg="gray.50">
                <Spinner size="lg" color="gray.400" />
            </Flex>
        );
    }

    if (notFound || !listing) {
        return (
            <Flex minH="100vh" align="center" justify="center" bg="gray.50">
                <VStack spacing={4}>
                    <Text fontSize="lg" color="gray.500">This design collection was not found.</Text>
                    <Button variant="outline" onClick={() => navigate('/')}>← Back to Designer</Button>
                </VStack>
            </Flex>
        );
    }

    return (
        <Box minH="100vh" bg="gray.50">
            {/* Hero */}
            <Box
                bg={listing.banner_image ? undefined : 'gray.900'}
                backgroundImage={listing.banner_image ? `url(${API}${listing.banner_image})` : undefined}
                backgroundSize="cover"
                backgroundPosition="center"
                color="white"
                py={{ base: 12, md: 20 }}
                px={{ base: 4, md: 8 }}
            >
                <Box maxW="800px" mx="auto" textAlign="center">
                    <Heading
                        size={{ base: '2xl', md: '3xl' }}
                        fontWeight="800"
                        letterSpacing="-0.02em"
                        mb={4}
                        textShadow={listing.banner_image ? '0 2px 12px rgba(0,0,0,0.5)' : undefined}
                    >
                        {listing.name}
                    </Heading>
                    {listing.description && (
                        <Text
                            fontSize={{ base: 'md', md: 'lg' }}
                            color={listing.banner_image ? 'whiteAlpha.900' : 'gray.400'}
                            maxW="560px"
                            mx="auto"
                            lineHeight="1.7"
                            textShadow={listing.banner_image ? '0 1px 6px rgba(0,0,0,0.4)' : undefined}
                        >
                            {listing.description}
                        </Text>
                    )}
                </Box>
            </Box>

            {/* Template grid */}
            <Box maxW="1100px" mx="auto" px={{ base: 4, md: 8 }} py={{ base: 10, md: 16 }}>
                {listing.templates.length === 0 ? (
                    <Text color="gray.400" textAlign="center" py={12}>No designs available yet.</Text>
                ) : (
                    <>
                        <HStack justify="space-between" mb={8}>
                            <Text fontSize="sm" color="gray.500" fontWeight="500">
                                {listing.templates.length} style{listing.templates.length !== 1 ? 's' : ''} available
                            </Text>
                            <Text fontSize="xs" color="gray.400">
                                Personalise any design — change city, date, title, colours
                            </Text>
                        </HStack>
                        <SimpleGrid columns={{ base: 1, sm: 2, md: 3 }} spacing={{ base: 5, md: 8 }}>
                            {listing.templates.map((t, idx) => (
                                <TemplateCard
                                    key={t.id}
                                    template={t}
                                    isFirst={idx === 0}
                                    onOpen={() => navigate(`/t/${t.id}`)}
                                />
                            ))}
                        </SimpleGrid>
                    </>
                )}
            </Box>
        </Box>
    );
};

const TemplateCard: React.FC<{
    template: ListingTemplate;
    isFirst: boolean;
    onOpen: () => void;
}> = ({ template: t, isFirst, onOpen }) => (
    <Box
        bg="white"
        borderRadius="2xl"
        overflow="hidden"
        border="1px"
        borderColor="gray.200"
        boxShadow={isFirst ? 'lg' : 'sm'}
        _hover={{ borderColor: 'gray.400', boxShadow: 'xl', transform: 'translateY(-2px)' }}
        transition="all 0.2s ease"
        cursor="pointer"
        onClick={onOpen}
    >
        {/* Poster thumbnail */}
        <Box bg="gray.900" h={{ base: '220px', md: '260px' }} position="relative" overflow="hidden">
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
                <Flex h="100%" align="center" justify="center" opacity={0.15}>
                    <svg width="56" height="56" viewBox="0 0 24 24" fill="white">
                        <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/>
                    </svg>
                </Flex>
            )}
            {isFirst && (
                <Badge
                    position="absolute" top={3} left={3}
                    bg="gray.900" color="white"
                    fontSize="10px" px={2} py={1}
                    borderRadius="full"
                >
                    Popular
                </Badge>
            )}
        </Box>

        {/* Info */}
        <VStack align="stretch" spacing={0} p={5}>
            <Text fontWeight="700" fontSize="md" color="gray.900" mb={1}>{t.name}</Text>
            {t.description && (
                <Text fontSize="sm" color="gray.500" noOfLines={2} lineHeight="1.55" mb={3}>{t.description}</Text>
            )}
            <Button
                mt={t.description ? 0 : 3}
                size="sm"
                bg="gray.900"
                color="white"
                _hover={{ bg: 'gray.700' }}
                borderRadius="lg"
                fontWeight="600"
                onClick={onOpen}
            >
                Personalise this design →
            </Button>
        </VStack>
    </Box>
);

export default ListingPage;
