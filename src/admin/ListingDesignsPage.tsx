import React, { useEffect, useState, useCallback } from 'react';
import {
    Box, Heading, Text, Button, VStack, HStack, Grid,
    Spinner, Flex, Badge, IconButton,
} from '@chakra-ui/react';
import { useParams, useNavigate } from 'react-router-dom';
import { adminFetchJson } from './adminApi';

const API = import.meta.env.VITE_API_URL || '';

interface SizeVariant {
    id: string;
    name: string;
    fulfillment_size: string;
    thumbnail_path?: string;
}

interface DesignGroup {
    id: string;
    name: string;
    description?: string;
    sizes: SizeVariant[];
}

interface Listing {
    id: number;
    slug: string;
    name: string;
    description?: string;
    designGroups: DesignGroup[];
}

// Preferred display order for sizes
const SIZE_ORDER = ['5x7', '8x10', '11x14', '12x16', '16x20', '18x24', '24x36', 'A5', 'A4', 'A3', 'A2', 'A1'];

const sortSizes = (sizes: SizeVariant[]) =>
    [...sizes].sort((a, b) => {
        const ai = SIZE_ORDER.indexOf(a.fulfillment_size);
        const bi = SIZE_ORDER.indexOf(b.fulfillment_size);
        if (ai === -1 && bi === -1) return 0;
        if (ai === -1) return 1;
        if (bi === -1) return -1;
        return ai - bi;
    });

const ListingDesignsPage: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const [listing, setListing] = useState<Listing | null>(null);
    const [loading, setLoading] = useState(true);

    const load = useCallback(async () => {
        setLoading(true);
        try {
            const data = await adminFetchJson(`/api/admin/listings/${id}`);
            setListing(data);
        } catch { /* ignore */ }
        finally { setLoading(false); }
    }, [id]);

    useEffect(() => { load(); }, [load]);

    if (loading) return (
        <Flex justify="center" py={20}><Spinner /></Flex>
    );

    if (!listing) return (
        <Box py={20} textAlign="center" color="gray.400">Listing not found.</Box>
    );

    return (
        <Box>
            {/* Header */}
            <HStack mb={1} spacing={2}>
                <IconButton
                    aria-label="Back to listings"
                    icon={<span style={{ fontSize: 16 }}>←</span>}
                    size="sm" variant="ghost" color="gray.500"
                    onClick={() => navigate('/admin/listings')}
                />
                <Box>
                    <Heading size="lg" fontWeight="700" color="gray.900">{listing.name}</Heading>
                    <HStack spacing={3} mt={0.5}>
                        <Text fontSize="xs" color="gray.400" fontFamily="mono">/{listing.slug}</Text>
                        <Text
                            as="a"
                            href={`/l/${listing.slug}`}
                            target="_blank"
                            fontSize="xs"
                            color="blue.500"
                            _hover={{ textDecoration: 'underline' }}
                        >
                            View listing ↗
                        </Text>
                    </HStack>
                </Box>
            </HStack>

            {listing.designGroups.length === 0 ? (
                <Box
                    mt={8} p={10} textAlign="center"
                    border="2px dashed" borderColor="gray.200"
                    borderRadius="xl" color="gray.400"
                >
                    <Text mb={2}>No design groups yet.</Text>
                    <Text fontSize="sm">Use Design Import to create design variants for this listing.</Text>
                    <Button mt={4} size="sm" variant="outline" onClick={() => navigate('/admin/design-import')}>
                        Go to Design Import
                    </Button>
                </Box>
            ) : (
                <VStack spacing={6} align="stretch" mt={6}>
                    {listing.designGroups.map((group) => (
                        <Box
                            key={group.id}
                            bg="white"
                            border="1px solid"
                            borderColor="gray.200"
                            borderRadius="xl"
                            overflow="hidden"
                        >
                            {/* Group header */}
                            <Flex
                                px={5} py={3}
                                bg="gray.50"
                                borderBottom="1px solid"
                                borderColor="gray.200"
                                align="center"
                                justify="space-between"
                            >
                                <HStack spacing={3}>
                                    <Text fontWeight="700" fontSize="sm" color="gray.900">{group.name}</Text>
                                    <Badge colorScheme="gray" fontSize="10px">{group.sizes.length} sizes</Badge>
                                </HStack>
                            </Flex>

                            {/* Size grid */}
                            <Box p={5}>
                                {group.sizes.length === 0 ? (
                                    <Text fontSize="sm" color="gray.400">No sizes in this group.</Text>
                                ) : (
                                    <Grid templateColumns="repeat(auto-fill, minmax(140px, 1fr))" gap={3}>
                                        {sortSizes(group.sizes).map((sz) => (
                                            <SizeCard
                                                key={sz.id}
                                                size={sz}
                                                onEdit={() => navigate(`/admin/design-editor/${sz.id}`)}
                                            />
                                        ))}
                                    </Grid>
                                )}
                            </Box>
                        </Box>
                    ))}
                </VStack>
            )}
        </Box>
    );
};

const SizeCard: React.FC<{ size: SizeVariant; onEdit: () => void }> = ({ size, onEdit }) => {
    const label = size.fulfillment_size || size.id.split('-').pop()?.toUpperCase() || size.id;
    return (
        <Button
            variant="outline"
            borderColor="gray.200"
            borderRadius="lg"
            h="auto"
            py={3}
            px={4}
            display="flex"
            flexDirection="column"
            alignItems="center"
            gap={1}
            _hover={{ borderColor: 'blue.400', bg: 'blue.50' }}
            transition="all 0.15s"
            onClick={onEdit}
        >
            <Text fontSize="sm" fontWeight="700" color="gray.800">{label}</Text>
            <Text fontSize="10px" color="gray.400">Edit Design</Text>
        </Button>
    );
};

export default ListingDesignsPage;
