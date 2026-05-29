import { useState, useEffect, useRef } from 'react';
import {
    Box, Button, FormControl, FormLabel, Input, Textarea, Select,
    VStack, HStack, Heading, Text, Badge, Table, Thead, Tbody, Tr, Th, Td,
    Switch, NumberInput, NumberInputField, Divider, Alert, AlertIcon,
    Accordion, AccordionItem, AccordionButton, AccordionPanel, AccordionIcon,
    useToast, Spinner, IconButton, Tooltip,
} from '@chakra-ui/react';
import { createDesignGroup, getDesignGroups, deleteDesignGroup, getListings, checkMockupPath } from './adminApi';
import { captureCurrentSettings } from '../utils/applyTemplate';

const ALL_SIZES = [
    { code: '4x6',     label: '4×6"',       widthIn: 4,     heightIn: 6,     aspect: 4/6 },
    { code: '5x7',     label: '5×7"',       widthIn: 5,     heightIn: 7,     aspect: 5/7 },
    { code: '8x10',    label: '8×10"',      widthIn: 8,     heightIn: 10,    aspect: 8/10 },
    { code: '11x14',   label: '11×14"',     widthIn: 11,    heightIn: 14,    aspect: 11/14 },
    { code: '12x16',   label: '12×16"',     widthIn: 12,    heightIn: 16,    aspect: 12/16 },
    { code: '16x20',   label: '16×20"',     widthIn: 16,    heightIn: 20,    aspect: 16/20 },
    { code: '18x24',   label: '18×24"',     widthIn: 18,    heightIn: 24,    aspect: 18/24 },
    { code: '20x28',   label: '20×28"',     widthIn: 20,    heightIn: 28,    aspect: 20/28 },
    { code: '24x36',   label: '24×36"',     widthIn: 24,    heightIn: 36,    aspect: 24/36 },
    { code: '30x40',   label: '30×40"',     widthIn: 30,    heightIn: 40,    aspect: 30/40 },
    { code: '36x48',   label: '36×48"',     widthIn: 36,    heightIn: 48,    aspect: 36/48 },
    { code: 'A5',      label: 'A5',         widthIn: 5.83,  heightIn: 8.27,  aspect: 5.83/8.27 },
    { code: 'A4',      label: 'A4',         widthIn: 8.27,  heightIn: 11.69, aspect: 8.27/11.69 },
    { code: 'A3',      label: 'A3',         widthIn: 11.69, heightIn: 16.54, aspect: 11.69/16.54 },
    { code: 'A2',      label: 'A2',         widthIn: 16.54, heightIn: 23.39, aspect: 16.54/23.39 },
    { code: 'A1',      label: 'A1',         widthIn: 23.39, heightIn: 33.11, aspect: 23.39/33.11 },
    { code: '30x40cm', label: '30×40 cm',   widthIn: 11.81, heightIn: 15.75, aspect: 30/40 },
    { code: '40x50cm', label: '40×50 cm',   widthIn: 15.75, heightIn: 19.69, aspect: 40/50 },
    { code: '50x70cm', label: '50×70 cm',   widthIn: 19.69, heightIn: 27.56, aspect: 50/70 },
    { code: '60x90cm', label: '60×90 cm',   widthIn: 23.62, heightIn: 35.43, aspect: 60/90 },
];

// #5 — Prodigi is the chosen provider; imperial sizes where Prodigi serves well
const DEFAULT_FULFILLMENT: Record<string, { provider: string; costCents: number }> = {
    '4x6':    { provider: 'prodigi', costCents: 713 },
    '5x7':    { provider: 'prodigi', costCents: 713 },
    '8x10':   { provider: 'prodigi', costCents: 755 },
    '11x14':  { provider: 'prodigi', costCents: 777 },
    '12x16':  { provider: 'prodigi', costCents: 900 },
    '16x20':  { provider: 'prodigi', costCents: 827 },
    '18x24':  { provider: 'prodigi', costCents: 1000 },
    '20x28':  { provider: 'prodigi', costCents: 2467 },
    '24x36':  { provider: 'prodigi', costCents: 1120 },
    '30x40':  { provider: 'prodigi', costCents: 4500 },
    '36x48':  { provider: 'prodigi', costCents: 7000 },
    'A5':     { provider: 'prodigi', costCents: 2000 },
    'A4':     { provider: 'prodigi', costCents: 2500 },
    'A3':     { provider: 'prodigi', costCents: 3100 },
    'A2':     { provider: 'prodigi', costCents: 4400 },
    'A1':     { provider: 'prodigi', costCents: 6300 },
    '30x40cm':{ provider: 'prodigi', costCents: 2500 },
    '40x50cm':{ provider: 'prodigi', costCents: 3500 },
    '50x70cm':{ provider: 'prodigi', costCents: 5000 },
    '60x90cm':{ provider: 'prodigi', costCents: 7000 },
};

function suggestPrice(costCents: number): number {
    return Math.ceil((costCents * 3) / 100) * 100 - 1;
}

interface SizeRow {
    enabled: boolean;
    mockup_path: string;
    mockup_exists: boolean | null; // null = unchecked
    fulfillment_provider: string;
    sell_price_cents: number;
}

export default function DesignImportPage() {
    const toast = useToast();
    const [loading, setLoading] = useState(false);
    const [groups, setGroups] = useState<any[]>([]);
    const [listings, setListings] = useState<any[]>([]);

    const [groupId, setGroupId] = useState('');
    const [groupName, setGroupName] = useState('');
    const [groupDesc, setGroupDesc] = useState('');
    const [listingMode, setListingMode] = useState<'new' | 'existing'>('new');
    const [listingId, setListingId] = useState('');
    const [listingName, setListingName] = useState('');
    const [listingSlug, setListingSlug] = useState('');
    const [etsyListingId, setEtsyListingId] = useState(''); // #4
    const [mockupBase, setMockupBase] = useState('');
    const [settingsJson, setSettingsJson] = useState('{}');
    const [settingsError, setSettingsError] = useState('');

    const [sizeRows, setSizeRows] = useState<Record<string, SizeRow>>(() => {
        const rows: Record<string, SizeRow> = {};
        for (const s of ALL_SIZES) {
            const def = DEFAULT_FULFILLMENT[s.code];
            rows[s.code] = {
                enabled: false,
                mockup_path: '',
                mockup_exists: null,
                fulfillment_provider: def?.provider || 'prodigi',
                sell_price_cents: suggestPrice(def?.costCents || 1000),
            };
        }
        return rows;
    });

    useEffect(() => {
        Promise.all([getDesignGroups(), getListings()]).then(([g, l]) => {
            setGroups(g);
            setListings(l);
        });
    }, []);

    useEffect(() => {
        if (!mockupBase) return;
        const base = mockupBase.replace(/\/$/, '');
        setSizeRows(prev => {
            const next = { ...prev };
            for (const s of ALL_SIZES) {
                next[s.code] = { ...next[s.code], mockup_path: `${base}/${s.code}.png`, mockup_exists: null };
            }
            return next;
        });
    }, [mockupBase]);

    useEffect(() => {
        if (listingMode === 'new' && listingName) {
            setListingSlug(listingName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''));
        }
    }, [listingName, listingMode]);

    // #1 — Capture current designer state as settings JSON
    function handleCaptureFromDesigner() {
        try {
            const settings = captureCurrentSettings();
            setSettingsJson(JSON.stringify(settings, null, 2));
            setSettingsError('');
            toast({ title: 'Captured from designer', status: 'success', duration: 2000 });
        } catch (e: any) {
            toast({ title: 'Capture failed', description: e.message, status: 'error' });
        }
    }

    function validateSettings(): object | null {
        try {
            const parsed = JSON.parse(settingsJson);
            setSettingsError('');
            return parsed;
        } catch (e: any) {
            setSettingsError(e.message);
            return null;
        }
    }

    // #3 — Check a single mockup path exists on the server
    async function handleCheckPath(code: string) {
        const p = sizeRows[code].mockup_path;
        if (!p) return;
        try {
            const result = await checkMockupPath(p);
            setSizeRows(prev => ({ ...prev, [code]: { ...prev[code], mockup_exists: result.exists } }));
        } catch {
            setSizeRows(prev => ({ ...prev, [code]: { ...prev[code], mockup_exists: false } }));
        }
    }

    // Check all enabled mockup paths at once
    async function handleCheckAllPaths() {
        const enabled = ALL_SIZES.filter(s => sizeRows[s.code].enabled && sizeRows[s.code].mockup_path);
        await Promise.all(enabled.map(s => handleCheckPath(s.code)));
    }

    async function handleImport() {
        const settings = validateSettings();
        if (!settings) return;
        if (!groupId.trim()) return toast({ title: 'Design ID required', status: 'error' });
        if (!groupName.trim()) return toast({ title: 'Design name required', status: 'error' });

        const enabledSizes = ALL_SIZES.filter(s => sizeRows[s.code].enabled);
        if (enabledSizes.length === 0) return toast({ title: 'Select at least one size', status: 'error' });

        const payload: any = {
            id: groupId.trim().toLowerCase().replace(/[^a-z0-9-]/g, '-'),
            name: groupName.trim(),
            description: groupDesc.trim() || undefined,
            base_settings_json: settings,
            sizes: enabledSizes.map(s => ({
                size_code: s.code,
                mockup_path: sizeRows[s.code].mockup_path || undefined,
                fulfillment_provider: sizeRows[s.code].fulfillment_provider,
                sell_price_cents: sizeRows[s.code].sell_price_cents,
            })),
        };

        if (listingMode === 'existing') {
            payload.listing_id = Number(listingId);
        } else {
            if (!listingName.trim()) return toast({ title: 'Listing name required', status: 'error' });
            payload.listing_name = listingName.trim();
            payload.listing_slug = listingSlug.trim();
        }
        // #4 — include Etsy listing ID if provided
        if (etsyListingId.trim()) payload.etsy_listing_id = etsyListingId.trim();

        setLoading(true);
        try {
            const result = await createDesignGroup(payload);
            toast({ title: `Created ${result.templates.length} templates`, description: `Listing ID: ${result.listingId}`, status: 'success' });
            const [g, l] = await Promise.all([getDesignGroups(), getListings()]);
            setGroups(g);
            setListings(l);
            // Reset form
            setGroupId(''); setGroupName(''); setGroupDesc(''); setEtsyListingId('');
            setMockupBase(''); setSettingsJson('{}');
        } catch (e: any) {
            toast({ title: 'Import failed', description: e.message, status: 'error' });
        } finally {
            setLoading(false);
        }
    }

    async function handleDelete(id: string) {
        if (!confirm(`Delete design group "${id}" and all its size templates?`)) return;
        await deleteDesignGroup(id);
        setGroups(await getDesignGroups());
    }

    const toggleSize = (code: string) => setSizeRows(prev => ({ ...prev, [code]: { ...prev[code], enabled: !prev[code].enabled } }));
    const updateRow = (code: string, field: keyof SizeRow, value: any) =>
        setSizeRows(prev => ({ ...prev, [code]: { ...prev[code], [field]: value, ...(field === 'mockup_path' ? { mockup_exists: null } : {}) } }));

    const selectedCount = ALL_SIZES.filter(s => sizeRows[s.code].enabled).length;

    return (
        <Box p={6} maxW="1100px">
            <Heading size="md" mb={1}>Design Import</Heading>
            <Text color="gray.500" fontSize="sm" mb={6}>
                Style your poster in the designer first, then capture settings here. Each enabled size becomes a template added to the listing.
            </Text>

            <Accordion allowMultiple defaultIndex={[0, 1, 2, 3]}>
                {/* ── Step 1: Design Identity ── */}
                <AccordionItem border="1px solid" borderColor="gray.200" borderRadius="md" mb={3}>
                    <AccordionButton bg="gray.50" borderRadius="md" _expanded={{ bg: 'blue.50' }}>
                        <Box flex="1" textAlign="left" fontWeight="semibold" fontSize="sm">1 — Design Identity</Box>
                        <AccordionIcon />
                    </AccordionButton>
                    <AccordionPanel p={4}>
                        <VStack spacing={3} align="stretch">
                            <HStack>
                                <FormControl>
                                    <FormLabel fontSize="xs">Design ID <Text as="span" color="gray.400">(slug, e.g. sm001-design001)</Text></FormLabel>
                                    <Input size="sm" value={groupId} onChange={e => setGroupId(e.target.value)} placeholder="sm001-design001" fontFamily="mono" />
                                </FormControl>
                                <FormControl>
                                    <FormLabel fontSize="xs">Design Name</FormLabel>
                                    <Input size="sm" value={groupName} onChange={e => setGroupName(e.target.value)} placeholder="The Night We Met — Classic Dark" />
                                </FormControl>
                            </HStack>
                            <FormControl>
                                <FormLabel fontSize="xs">Description (optional)</FormLabel>
                                <Input size="sm" value={groupDesc} onChange={e => setGroupDesc(e.target.value)} placeholder="Star map poster, dark circle, cream background" />
                            </FormControl>
                        </VStack>
                    </AccordionPanel>
                </AccordionItem>

                {/* ── Step 2: Listing ── */}
                <AccordionItem border="1px solid" borderColor="gray.200" borderRadius="md" mb={3}>
                    <AccordionButton bg="gray.50" borderRadius="md" _expanded={{ bg: 'blue.50' }}>
                        <Box flex="1" textAlign="left" fontWeight="semibold" fontSize="sm">2 — Listing</Box>
                        <AccordionIcon />
                    </AccordionButton>
                    <AccordionPanel p={4}>
                        <HStack mb={3}>
                            <Button size="xs" variant={listingMode === 'new' ? 'solid' : 'outline'} colorScheme="blue" onClick={() => setListingMode('new')}>Create new listing</Button>
                            <Button size="xs" variant={listingMode === 'existing' ? 'solid' : 'outline'} colorScheme="blue" onClick={() => setListingMode('existing')}>Add to existing</Button>
                        </HStack>
                        {listingMode === 'new' ? (
                            <VStack spacing={3} align="stretch">
                                <FormControl>
                                    <FormLabel fontSize="xs">Listing Name</FormLabel>
                                    <Input size="sm" value={listingName} onChange={e => setListingName(e.target.value)} placeholder="Star Map Poster — The Night We Met" />
                                </FormControl>
                                <FormControl>
                                    <FormLabel fontSize="xs">URL Slug</FormLabel>
                                    <Input size="sm" value={listingSlug} onChange={e => setListingSlug(e.target.value)} fontFamily="mono" />
                                </FormControl>
                            </VStack>
                        ) : (
                            <FormControl>
                                <FormLabel fontSize="xs">Existing Listing</FormLabel>
                                <Select size="sm" value={listingId} onChange={e => setListingId(e.target.value)}>
                                    <option value="">— select —</option>
                                    {listings.map((l: any) => (
                                        <option key={l.id} value={l.id}>{l.name} ({l.template_count} templates)</option>
                                    ))}
                                </Select>
                            </FormControl>
                        )}
                        {/* #4 — Etsy listing ID */}
                        <FormControl mt={3}>
                            <FormLabel fontSize="xs">
                                Etsy Listing ID <Text as="span" color="gray.400">(optional — enables auto-render for orders from this listing)</Text>
                            </FormLabel>
                            <Input
                                size="sm"
                                value={etsyListingId}
                                onChange={e => setEtsyListingId(e.target.value)}
                                placeholder="123456789"
                                fontFamily="mono"
                                maxW="220px"
                            />
                        </FormControl>
                    </AccordionPanel>
                </AccordionItem>

                {/* ── Step 3: Design Settings ── */}
                <AccordionItem border="1px solid" borderColor="gray.200" borderRadius="md" mb={3}>
                    <AccordionButton bg="gray.50" borderRadius="md" _expanded={{ bg: 'blue.50' }}>
                        <Box flex="1" textAlign="left" fontWeight="semibold" fontSize="sm">3 — Design Settings</Box>
                        <AccordionIcon />
                    </AccordionButton>
                    <AccordionPanel p={4}>
                        {/* #1 — Capture from designer */}
                        <Alert status="info" mb={3} py={2} fontSize="xs" borderRadius="md">
                            <AlertIcon />
                            Style the poster in the designer tab first, then click Capture to fill these settings automatically.
                        </Alert>
                        <Button
                            size="sm"
                            colorScheme="blue"
                            variant="solid"
                            mb={3}
                            onClick={handleCaptureFromDesigner}
                        >
                            ↙ Capture from Designer
                        </Button>
                        <Text fontSize="xs" color="gray.500" mb={2}>
                            Or edit JSON directly. All Zustand store fields are accepted.
                        </Text>
                        <Textarea
                            size="sm"
                            fontFamily="mono"
                            fontSize="xs"
                            rows={16}
                            value={settingsJson}
                            onChange={e => setSettingsJson(e.target.value)}
                        />
                        {settingsError && (
                            <Alert status="error" mt={2} py={1} fontSize="xs">
                                <AlertIcon />{settingsError}
                            </Alert>
                        )}
                    </AccordionPanel>
                </AccordionItem>

                {/* ── Step 4: Sizes ── */}
                <AccordionItem border="1px solid" borderColor="gray.200" borderRadius="md" mb={3}>
                    <AccordionButton bg="gray.50" borderRadius="md" _expanded={{ bg: 'blue.50' }}>
                        <Box flex="1" textAlign="left" fontWeight="semibold" fontSize="sm">
                            4 — Sizes &amp; Pricing
                            {selectedCount > 0 && <Badge ml={2} colorScheme="green">{selectedCount} selected</Badge>}
                        </Box>
                        <AccordionIcon />
                    </AccordionButton>
                    <AccordionPanel p={4}>
                        <HStack mb={3} justify="space-between">
                            <FormControl maxW="340px">
                                <FormLabel fontSize="xs">Mockup base path <Text as="span" color="gray.400">(auto-fills per size)</Text></FormLabel>
                                <Input size="sm" value={mockupBase} onChange={e => setMockupBase(e.target.value)} placeholder="/designs/SM001/Design001" fontFamily="mono" />
                            </FormControl>
                            {/* #3 — check all paths */}
                            <Button size="xs" variant="outline" mt={6} onClick={handleCheckAllPaths} isDisabled={selectedCount === 0}>
                                Check paths
                            </Button>
                        </HStack>

                        <Box overflowX="auto">
                            <Table size="xs" fontSize="xs">
                                <Thead>
                                    <Tr>
                                        <Th w="40px"></Th>
                                        <Th>Size</Th>
                                        <Th>Mockup path</Th>
                                        <Th>Fulfillment</Th>
                                        <Th>Sell price (USD)</Th>
                                    </Tr>
                                </Thead>
                                <Tbody>
                                    {ALL_SIZES.map(s => {
                                        const row = sizeRows[s.code];
                                        const pathColor = row.mockup_exists === true
                                            ? 'green.500'
                                            : row.mockup_exists === false
                                            ? 'red.400'
                                            : 'gray.300';
                                        return (
                                            <Tr key={s.code} bg={row.enabled ? 'green.50' : undefined} opacity={row.enabled ? 1 : 0.5}>
                                                <Td>
                                                    <Switch size="sm" isChecked={row.enabled} onChange={() => toggleSize(s.code)} />
                                                </Td>
                                                <Td fontWeight="semibold" whiteSpace="nowrap">{s.label}</Td>
                                                <Td>
                                                    <HStack spacing={1}>
                                                        <Input
                                                            size="xs"
                                                            fontFamily="mono"
                                                            value={row.mockup_path}
                                                            onChange={e => updateRow(s.code, 'mockup_path', e.target.value)}
                                                            isDisabled={!row.enabled}
                                                            w="200px"
                                                            borderColor={row.mockup_exists === false ? 'red.400' : undefined}
                                                        />
                                                        {/* #3 — per-row check indicator */}
                                                        {row.enabled && row.mockup_path && (
                                                            <Tooltip label={
                                                                row.mockup_exists === true ? 'File found ✓' :
                                                                row.mockup_exists === false ? 'File not found' :
                                                                'Click to check'
                                                            }>
                                                                <Box
                                                                    w="8px" h="8px" borderRadius="full"
                                                                    bg={pathColor} cursor="pointer"
                                                                    onClick={() => handleCheckPath(s.code)}
                                                                />
                                                            </Tooltip>
                                                        )}
                                                    </HStack>
                                                </Td>
                                                <Td>
                                                    <Input
                                                        size="xs"
                                                        value={row.fulfillment_provider}
                                                        onChange={e => updateRow(s.code, 'fulfillment_provider', e.target.value)}
                                                        isDisabled={!row.enabled}
                                                        w="120px"
                                                    />
                                                </Td>
                                                <Td>
                                                    <NumberInput
                                                        size="xs"
                                                        value={(row.sell_price_cents / 100).toFixed(2)}
                                                        onChange={(_, v) => updateRow(s.code, 'sell_price_cents', isNaN(v) ? 0 : Math.round(v * 100))}
                                                        isDisabled={!row.enabled}
                                                        min={0}
                                                        step={5}
                                                        w="100px"
                                                    >
                                                        <NumberInputField fontFamily="mono" />
                                                    </NumberInput>
                                                </Td>
                                            </Tr>
                                        );
                                    })}
                                </Tbody>
                            </Table>
                        </Box>
                    </AccordionPanel>
                </AccordionItem>
            </Accordion>

            <Button
                colorScheme="blue"
                onClick={handleImport}
                isLoading={loading}
                isDisabled={selectedCount === 0}
                mt={2}
                size="md"
            >
                Import Design ({selectedCount} sizes)
            </Button>

            {groups.length > 0 && (
                <Box mt={8}>
                    <Divider mb={4} />
                    <Heading size="sm" mb={3}>Existing Design Groups</Heading>
                    <Table size="sm">
                        <Thead>
                            <Tr>
                                <Th>ID</Th>
                                <Th>Name</Th>
                                <Th>Sizes</Th>
                                <Th>Created</Th>
                                <Th></Th>
                            </Tr>
                        </Thead>
                        <Tbody>
                            {groups.map((g: any) => (
                                <Tr key={g.id}>
                                    <Td fontFamily="mono" fontSize="xs">{g.id}</Td>
                                    <Td>{g.name}</Td>
                                    <Td><Badge colorScheme="blue">{g.size_count} sizes</Badge></Td>
                                    <Td fontSize="xs" color="gray.500">{new Date(g.created_at * 1000).toLocaleDateString()}</Td>
                                    <Td>
                                        <Tooltip label="Delete group + all templates">
                                            <Button size="xs" colorScheme="red" variant="ghost" onClick={() => handleDelete(g.id)}>Delete</Button>
                                        </Tooltip>
                                    </Td>
                                </Tr>
                            ))}
                        </Tbody>
                    </Table>
                </Box>
            )}
        </Box>
    );
}
