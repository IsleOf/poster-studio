import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
    Box, Heading, Text, VStack, HStack, Input, Textarea, Button, Select,
    FormLabel, Switch, Spinner, SimpleGrid, Divider,
} from '@chakra-ui/react';
import { getTemplate, createTemplate, updateTemplate } from './adminApi';
import { useStore } from '../store/useStore';
import { applyTemplate } from '../utils/applyTemplate';

// The subset of store fields that define a template
const TEMPLATE_FIELDS = [
    'posterType', 'maskShape', 'posterColor', 'textColor', 'starColor', 'mapInteriorColor',
    'isLightMode', 'titleFont', 'subtitleFont', 'detailsFont', 'dedicationFont',
    'titleFontSize', 'subtitleFontSize', 'detailsFontSize', 'dedicationFontSize',
    'showBorder', 'borderStyle', 'shapeOutlineWidth', 'showFrame', 'frameInset', 'frameWidth',
    'showDivider', 'dividerLength', 'dividerThickness',
    'circleSize', 'heartSize', 'houseSize', 'shapeOffsetY',
    'starScale', 'lineWeight', 'gridWidth', 'glowIntensity', 'gridOpacity',
    'showConstellations', 'showMilkyWay', 'showGrid',
    'showLocationPin', 'locationPinSize',
    'mapStyleUrl', 'mapColorPreset',
    'showLocation', 'showDate', 'showCoords',
    'titleKerning', 'subtitleKerning', 'detailsKerning', 'dedicationKerning',
    'finelineWidth', 'printSize',
] as const;

function captureSettings(): Record<string, unknown> {
    const state = useStore.getState();
    const out: Record<string, unknown> = {};
    for (const key of TEMPLATE_FIELDS) {
        out[key] = (state as unknown as Record<string, unknown>)[key];
    }
    return out;
}

const TemplateEditorPage: React.FC = () => {
    const { id } = useParams<{ id?: string }>();
    const isNew = !id || id === 'new';
    const navigate = useNavigate();

    const [name, setName] = useState('');
    const [description, setDescription] = useState('');
    const [templateId, setTemplateId] = useState('');
    const [etsyListingId, setEtsyListingId] = useState('');
    const [etsyListingUrl, setEtsyListingUrl] = useState('');
    const [isActive, setIsActive] = useState(true);
    const [loading, setLoading] = useState(!isNew);
    const [saving, setSaving] = useState(false);
    const [savedMessage, setSavedMessage] = useState('');

    // Read current store state for live preview
    const posterType = useStore(s => s.posterType);
    const maskShape = useStore(s => s.maskShape);

    useEffect(() => {
        if (!isNew && id) {
            getTemplate(id).then(data => {
                setName(data.name || '');
                setDescription(data.description || '');
                setTemplateId(data.id);
                setEtsyListingId(data.etsy_listing_id || '');
                setEtsyListingUrl(data.etsy_listing_url || '');
                setIsActive(!!data.is_active);
                // Apply template settings to live store so the sidebar preview shows it
                if (data.settings) applyTemplate(data.settings);
                setLoading(false);
            });
        }
    }, [id, isNew]);

    const handleSave = async () => {
        if (!name.trim()) { alert('Name is required'); return; }
        if (isNew && !templateId.trim()) { alert('Template ID (slug) is required'); return; }

        setSaving(true);
        const settings = captureSettings();
        const payload = {
            id: isNew ? templateId.trim() : id,
            name: name.trim(),
            description: description.trim(),
            etsy_listing_id: etsyListingId.trim() || null,
            etsy_listing_url: etsyListingUrl.trim() || null,
            is_active: isActive,
            settings,
        };

        try {
            if (isNew) {
                await createTemplate(payload);
            } else {
                await updateTemplate(id!, payload);
            }
            setSavedMessage('Saved!');
            setTimeout(() => setSavedMessage(''), 3000);
            if (isNew) navigate(`/admin/templates/${payload.id}/edit`);
        } catch (err) {
            alert('Save failed: ' + (err instanceof Error ? err.message : String(err)));
        }
        setSaving(false);
    };

    if (loading) return <Box p={8} textAlign="center"><Spinner /></Box>;

    return (
        <HStack align="flex-start" spacing={6} maxW="1200px" w="100%">
            {/* Left: metadata form */}
            <VStack align="stretch" spacing={4} w="340px" flexShrink={0}>
                <HStack>
                    <Button size="xs" variant="ghost" onClick={() => navigate('/admin/templates')}>Back</Button>
                    <Heading size="md" color="gray.800">{isNew ? 'New Template' : 'Edit Template'}</Heading>
                </HStack>

                <Box bg="white" p={5} borderRadius="lg" border="1px" borderColor="gray.200">
                    <VStack align="stretch" spacing={3}>
                        {isNew && (
                            <Box>
                                <FormLabel fontSize="xs" color="gray.600" mb={1}>Template ID (slug)</FormLabel>
                                <Input
                                    size="sm" placeholder="classic-dark-starmap"
                                    value={templateId}
                                    onChange={e => setTemplateId(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '-'))}
                                    fontFamily="mono"
                                />
                                <Text fontSize="xs" color="gray.400" mt={1}>URL: /t/{templateId || 'your-id'}</Text>
                            </Box>
                        )}

                        <Box>
                            <FormLabel fontSize="xs" color="gray.600" mb={1}>Name</FormLabel>
                            <Input size="sm" value={name} onChange={e => setName(e.target.value)} />
                        </Box>

                        <Box>
                            <FormLabel fontSize="xs" color="gray.600" mb={1}>Description</FormLabel>
                            <Textarea size="sm" rows={2} value={description} onChange={e => setDescription(e.target.value)} />
                        </Box>

                        <Box>
                            <FormLabel fontSize="xs" color="gray.600" mb={1}>Etsy Listing ID</FormLabel>
                            <Input size="sm" value={etsyListingId} onChange={e => setEtsyListingId(e.target.value)}
                                placeholder="1234567890" fontFamily="mono" />
                        </Box>

                        <Box>
                            <FormLabel fontSize="xs" color="gray.600" mb={1}>Etsy Listing URL</FormLabel>
                            <Input size="sm" value={etsyListingUrl} onChange={e => setEtsyListingUrl(e.target.value)}
                                placeholder="https://www.etsy.com/listing/..." />
                        </Box>

                        <HStack justify="space-between">
                            <FormLabel fontSize="xs" color="gray.600" m={0}>Active</FormLabel>
                            <Switch isChecked={isActive} onChange={e => setIsActive(e.target.checked)} size="sm" />
                        </HStack>
                    </VStack>
                </Box>

                <Box bg="blue.50" p={4} borderRadius="lg" border="1px" borderColor="blue.200">
                    <Text fontSize="xs" color="blue.700" fontWeight="600" mb={1}>Live preview settings</Text>
                    <Text fontSize="xs" color="blue.600">
                        The poster designer in the right pane shows the current state.
                        Adjust any settings in the designer, then click Save to capture those as this template's defaults.
                    </Text>
                    <SimpleGrid columns={2} spacing={1} mt={2}>
                        <Text fontSize="xs" color="blue.500">Mode:</Text>
                        <Text fontSize="xs" color="blue.700" fontWeight="500">{posterType}</Text>
                        <Text fontSize="xs" color="blue.500">Shape:</Text>
                        <Text fontSize="xs" color="blue.700" fontWeight="500">{maskShape}</Text>
                    </SimpleGrid>
                </Box>

                <HStack>
                    <Button
                        size="sm" bg="gray.900" color="white" _hover={{ bg: 'gray.700' }}
                        onClick={handleSave} isLoading={saving} flex={1}
                    >
                        Save Template
                    </Button>
                    {savedMessage && (
                        <Text fontSize="sm" color="green.500" fontWeight="600">{savedMessage}</Text>
                    )}
                </HStack>

                {!isNew && (
                    <Box>
                        <Divider mb={2} />
                        <Text fontSize="xs" color="gray.500">
                            Customer link: <Text as="span" color="blue.500" fontFamily="mono">/t/{id}</Text>
                        </Text>
                    </Box>
                )}
            </VStack>

            {/* Right: note about designer */}
            <Box flex={1} bg="white" p={6} borderRadius="lg" border="1px" borderColor="gray.200">
                <Text fontSize="sm" color="gray.600" fontWeight="600" mb={2}>How to configure this template</Text>
                <VStack align="stretch" spacing={2} fontSize="sm" color="gray.500">
                    <Text>1. Use the main poster designer (go to <Text as="span" color="blue.500" cursor="pointer" onClick={() => window.open('/', '_blank')}>Home</Text>) to configure exactly how you want this template to look by default.</Text>
                    <Text>2. Set the poster type, shape, colors, fonts, and any other settings.</Text>
                    <Text>3. Come back here and click <strong>Save Template</strong> — it captures the current designer state as this template's defaults.</Text>
                    <Text>4. Test by visiting <Text as="span" fontFamily="mono" color="blue.500" cursor="pointer" onClick={() => window.open(`/t/${id || templateId || 'your-id'}`, '_blank')}>/t/{id || templateId || 'your-id'}</Text> in a new tab.</Text>
                </VStack>
            </Box>
        </HStack>
    );
};

export default TemplateEditorPage;
