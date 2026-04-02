import React, { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import {
    Box, VStack, HStack, Text, Button, Grid, Spinner, Center,
    useToast, Heading, Badge,
} from '@chakra-ui/react';
import { useStore } from '../store/useStore';
import { fetchAndApplyTemplate } from '../utils/applyTemplate';

interface Template {
    id: string;
    name: string;
    description?: string;
    thumbnail_path?: string;
    etsy_variant_name?: string;
}

const TemplateSelector: React.FC = () => {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const toast = useToast();
    const { setSelectedEtsyListingId, setSelectedEtsyVariant } = useStore();

    const listingId = searchParams.get('listing');
    const variantName = searchParams.get('variant');

    const [templates, setTemplates] = useState<Template[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(null);

    // Fetch templates for this listing + variant
    useEffect(() => {
        if (!listingId) {
            setError('Missing listing parameter');
            setLoading(false);
            return;
        }

        const fetchTemplates = async () => {
            try {
                const url = `/api/templates/by-listing/${listingId}${variantName ? `?variant=${encodeURIComponent(variantName)}` : ''}`;
                const res = await fetch(url);
                if (!res.ok) throw new Error('Templates not found for this listing');

                const data = await res.json();
                setTemplates(data.templates);
                if (data.templates.length === 1) {
                    setSelectedTemplateId(data.templates[0].id);
                }
            } catch (err) {
                setError(err instanceof Error ? err.message : 'Failed to load templates');
            } finally {
                setLoading(false);
            }
        };

        fetchTemplates();
    }, [listingId, variantName]);

    const handleSelectTemplate = (templateId: string) => {
        setSelectedTemplateId(templateId);
    };

    const handleEditTemplate = async () => {
        if (!selectedTemplateId) {
            toast({ title: 'Please select a template', status: 'warning', duration: 2000 });
            return;
        }

        try {
            // Apply the template to the designer
            await fetchAndApplyTemplate(selectedTemplateId);

            // Track variant selection for order analytics
            if (listingId) setSelectedEtsyListingId(listingId);
            if (variantName) setSelectedEtsyVariant(variantName);

            // Navigate to designer
            navigate('/');
            toast({ title: 'Template loaded!', status: 'success', duration: 2000 });
        } catch (err) {
            toast({
                title: 'Failed to load template',
                description: err instanceof Error ? err.message : 'Unknown error',
                status: 'error',
                duration: 3000,
            });
        }
    };

    if (loading) {
        return (
            <Center minH="100vh">
                <Spinner size="lg" />
            </Center>
        );
    }

    if (error || templates.length === 0) {
        return (
            <Center minH="100vh">
                <VStack spacing={4}>
                    <Text color="red.500" fontSize="lg">
                        {error || 'No templates found'}
                    </Text>
                    <Button onClick={() => navigate('/')}>← Back to Designer</Button>
                </VStack>
            </Center>
        );
    }

    return (
        <Box p={8} maxW="1200px" mx="auto" minH="100vh">
            <VStack spacing={8} align="stretch">
                {/* Header */}
                <Box>
                    <Heading size="lg" mb={2}>
                        Choose Your Design Style
                    </Heading>
                    {variantName && (
                        <Badge colorScheme="blue" fontSize="md" px={3} py={1}>
                            {variantName}
                        </Badge>
                    )}
                </Box>

                {/* Template Grid */}
                <Grid
                    templateColumns={{ base: '1fr', md: 'repeat(2, 1fr)', lg: 'repeat(3, 1fr)' }}
                    gap={6}
                >
                    {templates.map((template) => (
                        <Box
                            key={template.id}
                            p={4}
                            borderWidth="2px"
                            borderColor={selectedTemplateId === template.id ? 'blue.500' : 'gray.200'}
                            borderRadius="lg"
                            cursor="pointer"
                            transition="all 0.2s"
                            _hover={{ borderColor: 'blue.400', boxShadow: 'md' }}
                            onClick={() => handleSelectTemplate(template.id)}
                            bg={selectedTemplateId === template.id ? 'blue.50' : 'white'}
                        >
                            {/* Thumbnail */}
                            {template.thumbnail_path && (
                                <Box
                                    w="100%"
                                    h="200px"
                                    bg="gray.100"
                                    borderRadius="md"
                                    mb={3}
                                    backgroundImage={`url(${template.thumbnail_path})`}
                                    backgroundSize="cover"
                                    backgroundPosition="center"
                                />
                            )}

                            {/* Template Info */}
                            <Text fontWeight="600" fontSize="md" mb={1}>
                                {template.name}
                            </Text>
                            {template.description && (
                                <Text fontSize="sm" color="gray.600" mb={3}>
                                    {template.description}
                                </Text>
                            )}

                            {/* Selection Badge */}
                            {selectedTemplateId === template.id && (
                                <Badge colorScheme="blue" w="full" textAlign="center" py={2}>
                                    ✓ Selected
                                </Badge>
                            )}
                        </Box>
                    ))}
                </Grid>

                {/* Action Buttons */}
                <HStack spacing={4} justify="center" mt={8}>
                    <Button
                        onClick={() => navigate('/')}
                        variant="outline"
                        size="lg"
                    >
                        ← Back
                    </Button>
                    <Button
                        onClick={handleEditTemplate}
                        isDisabled={!selectedTemplateId}
                        colorScheme="blue"
                        size="lg"
                    >
                        Edit Design →
                    </Button>
                </HStack>
            </VStack>
        </Box>
    );
};

export default TemplateSelector;
