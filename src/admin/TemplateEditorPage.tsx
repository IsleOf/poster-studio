import React, { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
    Box, Heading, Text, VStack, HStack, Input, Textarea, Button, Select,
    FormLabel, Switch, Spinner, SimpleGrid, Divider, NumberInput, NumberInputField,
    Badge, Tabs, TabList, Tab, TabPanels, TabPanel, Tag, TagLabel, TagCloseButton,
    Wrap, WrapItem, Table, Thead, Tbody, Tr, Th, Td, Tooltip,
} from '@chakra-ui/react';
import { getTemplate, createTemplate, updateTemplate, publishToEtsy, getFulfillmentProviders } from './adminApi';
import { useStore } from '../store/useStore';
import { applyTemplate } from '../utils/applyTemplate';

const TEMPLATE_FIELDS = [
    'posterType', 'maskShape', 'posterColor', 'textColor', 'starColor', 'mapInteriorColor',
    'isLightMode', 'titleFont', 'subtitleFont', 'detailsFont', 'dedicationFont',
    'titleFontSize', 'subtitleFontSize', 'detailsFontSize', 'dedicationFontSize',
    'showBorder', 'borderStyle', 'shapeOutlineWidth', 'showFrame', 'frameInset', 'frameWidth',
    'showDivider', 'dividerLength', 'dividerThickness',
    'circleSize', 'heartSize', 'houseSize', 'shapeOffsetY',
    'starScale', 'lineWeight', 'gridWidth', 'glowIntensity', 'gridOpacity', 'milkyWayOpacity',
    'showConstellations', 'showMilkyWay', 'showGrid',
    'showLocationPin', 'locationPinSize',
    'mapStyleUrl', 'mapColorPreset', 'mapBgColor', 'mapStreetColor',
    'mapWaterColor', 'mapLandColor', 'mapMainRoadColor', 'mapSmallRoadColor', 'mapDetailRoadColor',
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

interface FulfillmentRow {
    id: number;
    provider: string;
    product_type: string;
    size: string;
    print_cost: number | null;
    ship_cost_us: number | null;
    ship_cost_intl: number | null;
    has_api: number;
    notes: string | null;
    source_url: string | null;
    last_updated: number;
}

const PRODUCT_TYPE_LABELS: Record<string, string> = {
    poster_unframed: 'Poster (unframed)',
    poster_framed: 'Framed poster',
    poster_framed_mat: 'Framed + mat',
    canvas: 'Canvas',
};

const SIZES = ['5x7', '8x10', '11x14', '11x17', '12x18', '16x20', '18x24', '24x36'];

interface EtsyListing {
    title: string;
    description: string;
    price: string;
    currency: string;
    quantity: string;
    type: 'download' | 'physical';
    tags: string[];
    taxonomy_id: string;
    shipping_profile_id: string;
    return_policy_id: string;
    materials: string[];
}

const DEFAULT_LISTING: EtsyListing = {
    title: '',
    description: '',
    price: '25.00',
    currency: 'USD',
    quantity: '999',
    type: 'download',
    tags: [],
    taxonomy_id: '66',
    shipping_profile_id: '',
    return_policy_id: '',
    materials: ['Digital Print', 'High Resolution PNG'],
};

const TemplateEditorPage: React.FC = () => {
    const { id } = useParams<{ id?: string }>();
    const isNew = !id || id === 'new';
    const navigate = useNavigate();

    // Template metadata
    const [name, setName] = useState('');
    const [description, setDescription] = useState('');
    const [templateId, setTemplateId] = useState('');
    const [etsyListingId, setEtsyListingId] = useState('');
    const [etsyListingUrl, setEtsyListingUrl] = useState('');
    const [isActive, setIsActive] = useState(true);

    // Etsy listing data
    const [listing, setListing] = useState<EtsyListing>({ ...DEFAULT_LISTING });
    const [tagInput, setTagInput] = useState('');

    // UI state
    const [loading, setLoading] = useState(!isNew);
    const [saving, setSaving] = useState(false);
    const [publishing, setPublishing] = useState(false);
    const [savedMessage, setSavedMessage] = useState('');
    const [publishMessage, setPublishMessage] = useState('');
    const [publishError, setPublishError] = useState('');

    // Fulfillment selection state
    const [fulfillmentProvider, setFulfillmentProvider] = useState('');
    const [fulfillmentSize, setFulfillmentSize] = useState('18x24');
    const [fulfillmentProductType, setFulfillmentProductType] = useState('poster_unframed');
    const [fulfillmentRows, setFulfillmentRows] = useState<FulfillmentRow[]>([]);
    const [fulfillmentLoading, setFulfillmentLoading] = useState(false);

    // Store state for live display
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
                setFulfillmentProvider(data.fulfillment_provider || '');
                setFulfillmentSize(data.fulfillment_size || '18x24');
                if (data.settings) applyTemplate(data.settings);
                if (data.etsyListing) {
                    setListing({ ...DEFAULT_LISTING, ...data.etsyListing });
                } else {
                    setListing(l => ({ ...l, title: data.name ? `Custom ${data.name} Poster` : '' }));
                }
                setLoading(false);
            });
        }
    }, [id, isNew]);

    const loadFulfillmentOptions = useCallback(() => {
        setFulfillmentLoading(true);
        getFulfillmentProviders(fulfillmentSize, fulfillmentProductType)
            .then(rows => setFulfillmentRows(rows))
            .catch(() => setFulfillmentRows([]))
            .finally(() => setFulfillmentLoading(false));
    }, [fulfillmentSize, fulfillmentProductType]);

    useEffect(() => { loadFulfillmentOptions(); }, [loadFulfillmentOptions]);

    const setL = (key: keyof EtsyListing, val: unknown) =>
        setListing(l => ({ ...l, [key]: val }));

    const addTag = () => {
        const t = tagInput.trim().toLowerCase();
        if (!t || listing.tags.includes(t) || listing.tags.length >= 13) return;
        setL('tags', [...listing.tags, t]);
        setTagInput('');
    };

    const removeTag = (t: string) => setL('tags', listing.tags.filter(x => x !== t));

    const handleSave = async () => {
        if (!name.trim()) { alert('Name is required'); return; }
        if (isNew && !templateId.trim()) { alert('Template ID is required'); return; }
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
            etsy_listing: listing,
            fulfillment_provider: fulfillmentProvider || null,
            fulfillment_size: fulfillmentSize || null,
        };
        try {
            if (isNew) {
                await createTemplate(payload);
                navigate(`/admin/templates/${payload.id}/edit`);
            } else {
                await updateTemplate(id!, payload);
            }
            setSavedMessage('Saved!');
            setTimeout(() => setSavedMessage(''), 3000);
        } catch (err) {
            alert('Save failed: ' + (err instanceof Error ? err.message : String(err)));
        }
        setSaving(false);
    };

    const handlePublish = async () => {
        if (!listing.title || !listing.price) {
            setPublishError('Title and price are required to publish');
            return;
        }
        setPublishing(true);
        setPublishError('');
        setPublishMessage('');
        try {
            const result = await publishToEtsy(id!, listing);
            setEtsyListingId(result.listing_id || '');
            setEtsyListingUrl(result.url || '');
            setPublishMessage(
                etsyListingId
                    ? `Listing updated on Etsy (ID: ${result.listing_id})`
                    : `Listing created on Etsy (ID: ${result.listing_id})`
            );
            setTimeout(() => setPublishMessage(''), 6000);
        } catch (err) {
            setPublishError(err instanceof Error ? err.message : 'Publish failed');
        }
        setPublishing(false);
    };

    if (loading) return <Box p={8} textAlign="center"><Spinner /></Box>;

    return (
        <VStack align="stretch" spacing={4} maxW="900px">
            <HStack justify="space-between">
                <HStack>
                    <Button size="xs" variant="ghost" onClick={() => navigate('/admin/templates')}>← Back</Button>
                    <Heading size="md" color="gray.800">{isNew ? 'New Template' : name || 'Edit Template'}</Heading>
                    {!isNew && (
                        <Text
                            fontSize="xs" color="blue.500" fontFamily="mono" cursor="pointer"
                            onClick={() => window.open(`/t/${id}`, '_blank')}
                        >
                            /t/{id}
                        </Text>
                    )}
                </HStack>
                <HStack>
                    {savedMessage && <Text fontSize="sm" color="green.500" fontWeight="600">{savedMessage}</Text>}
                    <Button size="sm" variant="outline" onClick={handleSave} isLoading={saving}>
                        Save
                    </Button>
                </HStack>
            </HStack>

            <Tabs variant="enclosed" size="sm">
                <TabList>
                    <Tab>Template Details</Tab>
                    <Tab>Etsy Listing</Tab>
                    <Tab>
                        Fulfillment
                        {fulfillmentProvider && (
                            <Badge ml={2} colorScheme="green" fontSize="9px">{fulfillmentProvider}</Badge>
                        )}
                    </Tab>
                </TabList>

                <TabPanels>
                    {/* ── Tab 1: Template metadata + designer hint ─────────────── */}
                    <TabPanel px={0} pt={4}>
                        <SimpleGrid columns={{ base: 1, md: 2 }} spacing={4}>
                            <Box bg="white" p={5} borderRadius="lg" border="1px" borderColor="gray.200">
                                <Text fontSize="sm" fontWeight="600" mb={3}>Template Info</Text>
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
                                            <Text fontSize="xs" color="gray.400" mt={1}>/t/{templateId || 'your-id'}</Text>
                                        </Box>
                                    )}
                                    <Box>
                                        <FormLabel fontSize="xs" color="gray.600" mb={1}>Name</FormLabel>
                                        <Input size="sm" value={name} onChange={e => setName(e.target.value)} />
                                    </Box>
                                    <Box>
                                        <FormLabel fontSize="xs" color="gray.600" mb={1}>Internal Description</FormLabel>
                                        <Textarea size="sm" rows={2} value={description} onChange={e => setDescription(e.target.value)} />
                                    </Box>
                                    <HStack justify="space-between">
                                        <FormLabel fontSize="xs" color="gray.600" m={0}>Active</FormLabel>
                                        <Switch isChecked={isActive} onChange={e => setIsActive(e.target.checked)} size="sm" />
                                    </HStack>
                                </VStack>
                            </Box>

                            <Box bg="blue.50" p={5} borderRadius="lg" border="1px" borderColor="blue.200">
                                <Text fontSize="sm" fontWeight="600" color="blue.700" mb={2}>Captured designer settings</Text>
                                <SimpleGrid columns={2} spacing={1} fontSize="xs" mb={3}>
                                    <Text color="blue.500">Mode:</Text>
                                    <Text color="blue.800" fontWeight="600">{posterType}</Text>
                                    <Text color="blue.500">Shape:</Text>
                                    <Text color="blue.800" fontWeight="600">{maskShape}</Text>
                                </SimpleGrid>
                                <Text fontSize="xs" color="blue.600">
                                    Configure the poster designer at <Text as="span" color="blue.400" cursor="pointer" fontWeight="600"
                                        onClick={() => window.open('/', '_blank')}>Home ↗</Text>, then click <strong>Save</strong> here to capture those as this template's defaults.
                                </Text>
                                {!isNew && (
                                    <Box mt={3}>
                                        <Text fontSize="xs" color="blue.600">
                                            Test live:
                                            <Text as="span" ml={1} color="blue.500" fontFamily="mono" cursor="pointer"
                                                onClick={() => window.open(`/t/${id}`, '_blank')}>
                                                /t/{id} ↗
                                            </Text>
                                        </Text>
                                    </Box>
                                )}
                            </Box>
                        </SimpleGrid>
                    </TabPanel>

                    {/* ── Tab 2: Etsy Listing editor ───────────────────────────── */}
                    <TabPanel px={0} pt={4}>
                        <VStack align="stretch" spacing={4}>
                            {/* Publish status bar */}
                            {(etsyListingId || etsyListingUrl) && (
                                <Box bg="green.50" p={3} borderRadius="md" border="1px" borderColor="green.200">
                                    <HStack justify="space-between">
                                        <HStack spacing={2}>
                                            <Badge colorScheme="green">Live on Etsy</Badge>
                                            <Text fontSize="xs" fontFamily="mono" color="green.700">{etsyListingId}</Text>
                                        </HStack>
                                        {etsyListingUrl && (
                                            <Text fontSize="xs" color="green.600" cursor="pointer"
                                                onClick={() => window.open(etsyListingUrl, '_blank')}>
                                                View listing ↗
                                            </Text>
                                        )}
                                    </HStack>
                                </Box>
                            )}

                            <SimpleGrid columns={{ base: 1, md: 2 }} spacing={4}>
                                {/* Left column */}
                                <VStack align="stretch" spacing={3}>
                                    <Box bg="white" p={5} borderRadius="lg" border="1px" borderColor="gray.200">
                                        <Text fontSize="sm" fontWeight="600" mb={3}>Listing Basics</Text>
                                        <VStack align="stretch" spacing={3}>
                                            <Box>
                                                <FormLabel fontSize="xs" color="gray.600" mb={1}>Listing Title *</FormLabel>
                                                <Input size="sm" value={listing.title}
                                                    onChange={e => setL('title', e.target.value)}
                                                    placeholder="Custom Star Map Poster — Personalized Night Sky Print" />
                                                <Text fontSize="xs" color="gray.400" mt={0.5}>{listing.title.length}/140 chars</Text>
                                            </Box>
                                            <Box>
                                                <FormLabel fontSize="xs" color="gray.600" mb={1}>Description</FormLabel>
                                                <Textarea
                                                    size="sm" rows={6} value={listing.description}
                                                    onChange={e => setL('description', e.target.value)}
                                                    placeholder={"✨ A personalised star map showing exactly how the night sky looked above your special place on your special date.\n\n📐 Available sizes: 8x10\", 11x14\", 18x24\"\n🖨️ Digital download — print at home or at a local print shop\n\n▸ HOW IT WORKS\n1. Purchase this listing\n2. In the personalisation notes, include your date, time, and location\n3. Receive your high-resolution file within 24 hours"}
                                                />
                                            </Box>
                                        </VStack>
                                    </Box>

                                    <Box bg="white" p={5} borderRadius="lg" border="1px" borderColor="gray.200">
                                        <Text fontSize="sm" fontWeight="600" mb={3}>Pricing & Stock</Text>
                                        <SimpleGrid columns={2} spacing={3}>
                                            <Box>
                                                <FormLabel fontSize="xs" color="gray.600" mb={1}>Price *</FormLabel>
                                                <HStack>
                                                    <Select size="sm" w="80px" value={listing.currency}
                                                        onChange={e => setL('currency', e.target.value)}>
                                                        <option value="USD">USD</option>
                                                        <option value="AUD">AUD</option>
                                                        <option value="GBP">GBP</option>
                                                        <option value="EUR">EUR</option>
                                                        <option value="CAD">CAD</option>
                                                    </Select>
                                                    <NumberInput size="sm" value={listing.price} min={0.20}
                                                        onChange={val => setL('price', val)}>
                                                        <NumberInputField placeholder="25.00" />
                                                    </NumberInput>
                                                </HStack>
                                            </Box>
                                            <Box>
                                                <FormLabel fontSize="xs" color="gray.600" mb={1}>Quantity</FormLabel>
                                                <NumberInput size="sm" value={listing.quantity} min={1}
                                                    onChange={val => setL('quantity', val)}>
                                                    <NumberInputField />
                                                </NumberInput>
                                            </Box>
                                            <Box>
                                                <FormLabel fontSize="xs" color="gray.600" mb={1}>Type</FormLabel>
                                                <Select size="sm" value={listing.type}
                                                    onChange={e => setL('type', e.target.value as 'download' | 'physical')}>
                                                    <option value="download">Digital Download</option>
                                                    <option value="physical">Physical Item</option>
                                                </Select>
                                            </Box>
                                            <Box>
                                                <FormLabel fontSize="xs" color="gray.600" mb={1}>Taxonomy ID</FormLabel>
                                                <Input size="sm" value={listing.taxonomy_id}
                                                    onChange={e => setL('taxonomy_id', e.target.value)}
                                                    placeholder="66 = Art › Prints" />
                                            </Box>
                                        </SimpleGrid>
                                    </Box>
                                </VStack>

                                {/* Right column */}
                                <VStack align="stretch" spacing={3}>
                                    <Box bg="white" p={5} borderRadius="lg" border="1px" borderColor="gray.200">
                                        <Text fontSize="sm" fontWeight="600" mb={3}>Tags <Text as="span" fontSize="xs" color="gray.400">(max 13)</Text></Text>
                                        <Wrap mb={2}>
                                            {listing.tags.map(t => (
                                                <WrapItem key={t}>
                                                    <Tag size="sm" colorScheme="blue" borderRadius="full">
                                                        <TagLabel>{t}</TagLabel>
                                                        <TagCloseButton onClick={() => removeTag(t)} />
                                                    </Tag>
                                                </WrapItem>
                                            ))}
                                        </Wrap>
                                        <HStack>
                                            <Input
                                                size="sm" placeholder="add tag..." value={tagInput}
                                                onChange={e => setTagInput(e.target.value)}
                                                onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addTag(); } }}
                                            />
                                            <Button size="sm" onClick={addTag} isDisabled={listing.tags.length >= 13}>Add</Button>
                                        </HStack>
                                        <Text fontSize="xs" color="gray.400" mt={1}>{listing.tags.length}/13 tags</Text>
                                    </Box>

                                    <Box bg="white" p={5} borderRadius="lg" border="1px" borderColor="gray.200">
                                        <Text fontSize="sm" fontWeight="600" mb={3}>Shipping & Returns</Text>
                                        <VStack align="stretch" spacing={3}>
                                            <Box>
                                                <FormLabel fontSize="xs" color="gray.600" mb={1}>Shipping Profile ID</FormLabel>
                                                <Input size="sm" value={listing.shipping_profile_id}
                                                    onChange={e => setL('shipping_profile_id', e.target.value)}
                                                    placeholder="Leave blank for digital downloads" />
                                            </Box>
                                            <Box>
                                                <FormLabel fontSize="xs" color="gray.600" mb={1}>Return Policy ID</FormLabel>
                                                <Input size="sm" value={listing.return_policy_id}
                                                    onChange={e => setL('return_policy_id', e.target.value)}
                                                    placeholder="Optional" />
                                            </Box>
                                        </VStack>
                                    </Box>

                                    <Box bg="white" p={5} borderRadius="lg" border="1px" borderColor="gray.200">
                                        <Text fontSize="sm" fontWeight="600" mb={3}>Materials</Text>
                                        {listing.materials.map((m, i) => (
                                            <HStack key={i} mb={1}>
                                                <Input size="sm" value={m}
                                                    onChange={e => {
                                                        const mats = [...listing.materials];
                                                        mats[i] = e.target.value;
                                                        setL('materials', mats);
                                                    }} />
                                                <Button size="xs" variant="ghost" color="red.400"
                                                    onClick={() => setL('materials', listing.materials.filter((_, j) => j !== i))}>
                                                    ×
                                                </Button>
                                            </HStack>
                                        ))}
                                        {listing.materials.length < 13 && (
                                            <Button size="xs" variant="ghost" mt={1}
                                                onClick={() => setL('materials', [...listing.materials, ''])}>
                                                + Add material
                                            </Button>
                                        )}
                                    </Box>
                                </VStack>
                            </SimpleGrid>

                            {/* Publish bar */}
                            <Box bg="white" p={5} borderRadius="lg" border="1px" borderColor="gray.200">
                                <HStack justify="space-between" wrap="wrap" spacing={3}>
                                    <Box>
                                        <Text fontSize="sm" fontWeight="600">Publish to Etsy</Text>
                                        <Text fontSize="xs" color="gray.500">
                                            {etsyListingId
                                                ? 'This will update the existing Etsy listing with the data above.'
                                                : 'This will create a new draft listing in your Etsy shop. Requires Etsy API credentials in .env.'}
                                        </Text>
                                    </Box>
                                    <HStack>
                                        <Button size="sm" onClick={handleSave} isLoading={saving} variant="outline">
                                            Save Draft
                                        </Button>
                                        <Button
                                            size="sm"
                                            bg={etsyListingId ? 'orange.500' : 'green.500'}
                                            color="white"
                                            _hover={{ bg: etsyListingId ? 'orange.600' : 'green.600' }}
                                            onClick={handlePublish}
                                            isLoading={publishing}
                                            loadingText="Publishing..."
                                        >
                                            {etsyListingId ? 'Update Etsy Listing' : 'Publish to Etsy'}
                                        </Button>
                                    </HStack>
                                </HStack>
                                {publishMessage && (
                                    <Text fontSize="sm" color="green.500" fontWeight="600" mt={2}>{publishMessage}</Text>
                                )}
                                {publishError && (
                                    <Text fontSize="sm" color="red.500" mt={2}>{publishError}</Text>
                                )}
                            </Box>
                        </VStack>
                    </TabPanel>
                    {/* ── Tab 3: Fulfillment provider picker ──────────────────── */}
                    <TabPanel px={0} pt={4}>
                        <VStack align="stretch" spacing={4}>
                            {/* Currently selected */}
                            {fulfillmentProvider && (
                                <Box bg="green.50" p={3} borderRadius="md" border="1px" borderColor="green.200">
                                    <HStack>
                                        <Badge colorScheme="green">Selected</Badge>
                                        <Text fontSize="sm" fontWeight="600">{fulfillmentProvider}</Text>
                                        <Text fontSize="sm" color="gray.500">·</Text>
                                        <Text fontSize="sm">{PRODUCT_TYPE_LABELS[fulfillmentProductType] || fulfillmentProductType}</Text>
                                        <Text fontSize="sm" color="gray.500">·</Text>
                                        <Text fontSize="sm">{fulfillmentSize}"</Text>
                                        <Button size="xs" variant="ghost" color="red.400" ml="auto"
                                            onClick={() => setFulfillmentProvider('')}>
                                            Clear
                                        </Button>
                                    </HStack>
                                </Box>
                            )}

                            {/* Filters */}
                            <Box bg="white" p={4} borderRadius="lg" border="1px" borderColor="gray.200">
                                <Text fontSize="sm" fontWeight="600" mb={3}>Find Cheapest Option</Text>
                                <SimpleGrid columns={{ base: 1, md: 2 }} spacing={3}>
                                    <Box>
                                        <FormLabel fontSize="xs" color="gray.600" mb={1}>Product Type</FormLabel>
                                        <Select size="sm" value={fulfillmentProductType}
                                            onChange={e => setFulfillmentProductType(e.target.value)}>
                                            <option value="poster_unframed">Poster (unframed)</option>
                                            <option value="poster_framed">Framed poster</option>
                                            <option value="poster_framed_mat">Framed + mat</option>
                                            <option value="canvas">Canvas</option>
                                        </Select>
                                    </Box>
                                    <Box>
                                        <FormLabel fontSize="xs" color="gray.600" mb={1}>Size</FormLabel>
                                        <Select size="sm" value={fulfillmentSize}
                                            onChange={e => setFulfillmentSize(e.target.value)}>
                                            {SIZES.map(s => <option key={s} value={s}>{s}"</option>)}
                                        </Select>
                                    </Box>
                                </SimpleGrid>
                            </Box>

                            {/* Provider comparison table */}
                            <Box bg="white" borderRadius="lg" border="1px" borderColor="gray.200" overflow="hidden">
                                <HStack px={4} py={3} borderBottom="1px" borderColor="gray.100" justify="space-between">
                                    <Text fontSize="sm" fontWeight="600">
                                        Providers for {fulfillmentSize}" {PRODUCT_TYPE_LABELS[fulfillmentProductType]}
                                    </Text>
                                    <Text fontSize="xs" color="gray.400">sorted by cheapest US total</Text>
                                </HStack>

                                {fulfillmentLoading ? (
                                    <Box p={6} textAlign="center"><Spinner size="sm" /></Box>
                                ) : fulfillmentRows.length === 0 ? (
                                    <Box p={6} textAlign="center">
                                        <Text fontSize="sm" color="gray.500">No pricing data for this combination.</Text>
                                        <Text fontSize="xs" color="gray.400" mt={1}>Run <Text as="span" fontFamily="mono">/update-fulfillment-prices</Text> to refresh.</Text>
                                    </Box>
                                ) : (
                                    <Box overflowX="auto">
                                        <Table size="sm" variant="simple">
                                            <Thead bg="gray.50">
                                                <Tr>
                                                    <Th fontSize="xs">Provider</Th>
                                                    <Th fontSize="xs" isNumeric>Print</Th>
                                                    <Th fontSize="xs" isNumeric>Ship (US)</Th>
                                                    <Th fontSize="xs" isNumeric>Total US</Th>
                                                    <Th fontSize="xs" isNumeric>Ship (Intl)</Th>
                                                    <Th fontSize="xs">API</Th>
                                                    <Th fontSize="xs">Updated</Th>
                                                    <Th></Th>
                                                </Tr>
                                            </Thead>
                                            <Tbody>
                                                {fulfillmentRows.map((row, i) => {
                                                    const totalUs = (row.print_cost ?? 0) + (row.ship_cost_us ?? 0);
                                                    const isCheapest = i === 0;
                                                    const isSelected = fulfillmentProvider === `${row.provider}:${row.product_type}:${row.size}`;
                                                    const updatedDays = Math.floor((Date.now() / 1000 - row.last_updated) / 86400);
                                                    return (
                                                        <Tr key={row.id}
                                                            bg={isSelected ? 'blue.50' : isCheapest ? 'green.50' : undefined}
                                                            _hover={{ bg: isSelected ? 'blue.100' : 'gray.50' }}
                                                        >
                                                            <Td>
                                                                <VStack align="start" spacing={0}>
                                                                    <HStack spacing={1}>
                                                                        <Text fontSize="xs" fontWeight="600" textTransform="capitalize">
                                                                            {row.provider}
                                                                        </Text>
                                                                        {isCheapest && <Badge colorScheme="green" fontSize="8px">cheapest</Badge>}
                                                                    </HStack>
                                                                    {row.notes && (
                                                                        <Tooltip label={row.notes} fontSize="xs">
                                                                            <Text fontSize="10px" color="gray.400" noOfLines={1} maxW="140px">
                                                                                {row.notes}
                                                                            </Text>
                                                                        </Tooltip>
                                                                    )}
                                                                </VStack>
                                                            </Td>
                                                            <Td isNumeric fontSize="xs">
                                                                {row.print_cost != null ? `$${row.print_cost.toFixed(2)}` : '—'}
                                                            </Td>
                                                            <Td isNumeric fontSize="xs">
                                                                {row.ship_cost_us != null ? `$${row.ship_cost_us.toFixed(2)}` : '—'}
                                                            </Td>
                                                            <Td isNumeric>
                                                                <Text fontSize="xs" fontWeight="700"
                                                                    color={isCheapest ? 'green.600' : 'gray.700'}>
                                                                    ${totalUs.toFixed(2)}
                                                                </Text>
                                                            </Td>
                                                            <Td isNumeric fontSize="xs" color="gray.500">
                                                                {row.ship_cost_intl != null ? `$${row.ship_cost_intl.toFixed(2)}` : '—'}
                                                            </Td>
                                                            <Td>
                                                                <Badge colorScheme={row.has_api ? 'purple' : 'gray'} fontSize="9px">
                                                                    {row.has_api ? 'API' : 'manual'}
                                                                </Badge>
                                                            </Td>
                                                            <Td fontSize="10px" color={updatedDays > 30 ? 'orange.500' : 'gray.400'}>
                                                                {updatedDays === 0 ? 'today' : `${updatedDays}d ago`}
                                                            </Td>
                                                            <Td>
                                                                <Button size="xs"
                                                                    colorScheme={isSelected ? 'blue' : 'gray'}
                                                                    variant={isSelected ? 'solid' : 'outline'}
                                                                    onClick={() => {
                                                                        setFulfillmentProvider(
                                                                            isSelected ? '' : `${row.provider}:${row.product_type}:${row.size}`
                                                                        );
                                                                    }}
                                                                >
                                                                    {isSelected ? '✓ Selected' : 'Select'}
                                                                </Button>
                                                            </Td>
                                                        </Tr>
                                                    );
                                                })}
                                            </Tbody>
                                        </Table>
                                    </Box>
                                )}
                            </Box>

                            {/* Margin calculator */}
                            {fulfillmentRows.length > 0 && listing.price && (
                                <Box bg="white" p={4} borderRadius="lg" border="1px" borderColor="gray.200">
                                    <Text fontSize="sm" fontWeight="600" mb={3}>
                                        Margin at ${listing.price} (Etsy listing price)
                                    </Text>
                                    <SimpleGrid columns={{ base: 2, md: 4 }} spacing={3} fontSize="xs">
                                        {fulfillmentRows.slice(0, 4).map(row => {
                                            const totalUs = (row.print_cost ?? 0) + (row.ship_cost_us ?? 0);
                                            const sellPrice = parseFloat(listing.price) || 0;
                                            const etsyFees = sellPrice * 0.065 + sellPrice * 0.03 + 0.25 + 0.20;
                                            const net = sellPrice - totalUs - etsyFees;
                                            const margin = sellPrice > 0 ? Math.round(net / sellPrice * 100) : 0;
                                            return (
                                                <Box key={row.id} p={3} bg="gray.50" borderRadius="md" textAlign="center">
                                                    <Text fontWeight="600" textTransform="capitalize" mb={1}>{row.provider}</Text>
                                                    <Text fontSize="sm" fontWeight="700" color={net > 0 ? 'green.600' : 'red.500'}>
                                                        ${net.toFixed(2)}
                                                    </Text>
                                                    <Text color="gray.500">{margin}% margin</Text>
                                                </Box>
                                            );
                                        })}
                                    </SimpleGrid>
                                    <Text fontSize="10px" color="gray.400" mt={2}>
                                        Etsy fees estimated: 6.5% transaction + 3% + $0.25 payment processing + $0.20 listing fee.
                                    </Text>
                                </Box>
                            )}

                            {/* Refresh hint */}
                            <Box bg="gray.50" p={3} borderRadius="md" border="1px" borderColor="gray.200">
                                <Text fontSize="xs" color="gray.500">
                                    Prices are sourced from provider websites. To refresh with current prices, run the Claude Code skill:
                                </Text>
                                <Text fontSize="xs" fontFamily="mono" color="blue.500" mt={1}>/update-fulfillment-prices</Text>
                                <Text fontSize="xs" color="gray.400" mt={1}>
                                    Prices marked orange are over 30 days old.
                                </Text>
                            </Box>
                        </VStack>
                    </TabPanel>
                </TabPanels>
            </Tabs>
        </VStack>
    );
};

export default TemplateEditorPage;
