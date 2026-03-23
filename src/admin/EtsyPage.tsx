import React, { useEffect, useState } from 'react';
import {
    Box, Heading, Text, VStack, HStack, Button, Badge, Spinner,
    Table, Thead, Tbody, Tr, Th, Td, Select,
} from '@chakra-ui/react';
import { getEtsyStatus, getEtsyListings, getTemplates, linkEtsyListing, syncEtsyOrders } from './adminApi';

const EtsyPage: React.FC = () => {
    const [status, setStatus] = useState<any>(null);
    const [listings, setListings] = useState<any[]>([]);
    const [templates, setTemplates] = useState<any[]>([]);
    const [linkMap, setLinkMap] = useState<Record<string, string>>({});
    const [loading, setLoading] = useState(true);
    const [syncing, setSyncing] = useState(false);
    const [syncMsg, setSyncMsg] = useState('');
    const [linking, setLinking] = useState<string | null>(null);

    const fetchAll = async () => {
        setLoading(true);
        const [s, t] = await Promise.all([getEtsyStatus(), getTemplates()]);
        setStatus(s);
        setTemplates(t);
        if (s.connected) {
            try {
                const l = await getEtsyListings();
                setListings(l.listings || []);
            } catch { setListings([]); }
        }
        setLoading(false);
    };

    useEffect(() => { fetchAll(); }, []);

    const handleSync = async () => {
        setSyncing(true);
        setSyncMsg('');
        try {
            const result = await syncEtsyOrders();
            setSyncMsg(`Done — ${result.processed ?? 0} orders processed.`);
            setTimeout(() => setSyncMsg(''), 5000);
        } catch (err) {
            setSyncMsg('Sync failed: ' + (err instanceof Error ? err.message : String(err)));
        }
        setSyncing(false);
    };

    const handleLink = async (listingId: string, templateId: string) => {
        setLinking(listingId);
        await linkEtsyListing(listingId, templateId);
        await fetchAll();
        setLinking(null);
    };

    // Build template lookup: etsy_listing_id -> template_id
    const etsyToTemplate: Record<string, string> = {};
    for (const t of templates) {
        if (t.etsy_listing_id) etsyToTemplate[t.etsy_listing_id] = t.id;
    }

    if (loading) return <Box p={8} textAlign="center"><Spinner /></Box>;

    return (
        <VStack align="stretch" spacing={4} maxW="900px">
            <Heading size="md" color="gray.800">Etsy Integration</Heading>

            {/* Connection Status */}
            <Box bg="white" p={5} borderRadius="lg" border="1px" borderColor="gray.200">
                <Text fontSize="sm" fontWeight="600" mb={3}>Connection Status</Text>
                <HStack spacing={4} wrap="wrap">
                    <HStack>
                        <Badge colorScheme={status?.connected ? 'green' : 'red'}>
                            {status?.connected ? 'Connected' : 'Not Connected'}
                        </Badge>
                        <Text fontSize="sm" color="gray.600">
                            {status?.connected ? `Shop ID: ${status.shopId}` : 'No access token set'}
                        </Text>
                    </HStack>
                    {status?.lastPoll && (
                        <Text fontSize="xs" color="gray.500">
                            Last poll: {new Date(status.lastPoll * 1000).toLocaleString('en-AU')}
                        </Text>
                    )}
                </HStack>

                {!status?.connected && (
                    <Box mt={3} p={3} bg="orange.50" borderRadius="md">
                        <Text fontSize="xs" color="orange.700">
                            Set <Text as="span" fontFamily="mono">ETSY_ACCESS_TOKEN</Text>,{' '}
                            <Text as="span" fontFamily="mono">ETSY_API_KEY</Text>, and{' '}
                            <Text as="span" fontFamily="mono">ETSY_SHOP_ID</Text> in{' '}
                            <Text as="span" fontFamily="mono">server/.env</Text> to connect.
                        </Text>
                        <Text fontSize="xs" color="orange.700" mt={1}>
                            Then restart the server. The Etsy OAuth flow is at <Text as="span" fontFamily="mono">/auth/etsy</Text>.
                        </Text>
                    </Box>
                )}
            </Box>

            {/* Manual Sync */}
            <Box bg="white" p={5} borderRadius="lg" border="1px" borderColor="gray.200">
                <Text fontSize="sm" fontWeight="600" mb={3}>Order Sync</Text>
                <Text fontSize="xs" color="gray.500" mb={3}>
                    Orders are automatically polled every 2 minutes when connected. Use manual sync to force an immediate check.
                </Text>
                <HStack>
                    <Button size="sm" onClick={handleSync} isLoading={syncing} isDisabled={!status?.connected}>
                        Sync Now
                    </Button>
                    {syncMsg && <Text fontSize="sm" color={syncMsg.startsWith('Sync failed') ? 'red.500' : 'green.500'}>{syncMsg}</Text>}
                </HStack>
            </Box>

            {/* Listing → Template Links */}
            <Box bg="white" p={5} borderRadius="lg" border="1px" borderColor="gray.200">
                <Text fontSize="sm" fontWeight="600" mb={1}>Listing → Template Links</Text>
                <Text fontSize="xs" color="gray.500" mb={3}>
                    Link each Etsy listing to a template. When an order arrives for that listing,
                    the system uses the template's default settings to render the poster.
                </Text>

                {/* Templates already with Etsy links */}
                {templates.filter(t => t.etsy_listing_id).length > 0 && (
                    <Box mb={4}>
                        <Text fontSize="xs" fontWeight="600" color="gray.600" mb={2}>Currently linked</Text>
                        <Table size="sm">
                            <Thead>
                                <Tr>
                                    <Th>Template</Th>
                                    <Th>Etsy Listing ID</Th>
                                    <Th>Customer URL</Th>
                                </Tr>
                            </Thead>
                            <Tbody>
                                {templates.filter(t => t.etsy_listing_id).map(t => (
                                    <Tr key={t.id}>
                                        <Td fontWeight="500">{t.name}</Td>
                                        <Td fontFamily="mono" fontSize="xs">{t.etsy_listing_id}</Td>
                                        <Td>
                                            <Text fontSize="xs" color="blue.500" cursor="pointer"
                                                onClick={() => window.open(`/t/${t.id}`, '_blank')}>
                                                /t/{t.id}
                                            </Text>
                                        </Td>
                                    </Tr>
                                ))}
                            </Tbody>
                        </Table>
                    </Box>
                )}

                {/* Listings from Etsy to link */}
                {status?.connected && listings.length > 0 && (
                    <Box>
                        <Text fontSize="xs" fontWeight="600" color="gray.600" mb={2}>Link Etsy listings to templates</Text>
                        <Table size="sm">
                            <Thead>
                                <Tr>
                                    <Th>Listing</Th>
                                    <Th>Listing ID</Th>
                                    <Th>Linked Template</Th>
                                    <Th>Action</Th>
                                </Tr>
                            </Thead>
                            <Tbody>
                                {listings.map((l: any) => {
                                    const currentTemplate = etsyToTemplate[l.listing_id] || '';
                                    const localVal = linkMap[l.listing_id] ?? currentTemplate;
                                    return (
                                        <Tr key={l.listing_id}>
                                            <Td fontSize="xs" maxW="200px">
                                                <Text noOfLines={1}>{l.title}</Text>
                                            </Td>
                                            <Td fontFamily="mono" fontSize="xs">{l.listing_id}</Td>
                                            <Td>
                                                <Select size="xs" maxW="200px"
                                                    value={localVal}
                                                    onChange={e => setLinkMap(m => ({ ...m, [l.listing_id]: e.target.value }))}>
                                                    <option value="">— none —</option>
                                                    {templates.map(t => (
                                                        <option key={t.id} value={t.id}>{t.name}</option>
                                                    ))}
                                                </Select>
                                            </Td>
                                            <Td>
                                                <Button
                                                    size="xs"
                                                    isLoading={linking === l.listing_id}
                                                    isDisabled={localVal === currentTemplate}
                                                    onClick={() => handleLink(String(l.listing_id), localVal)}
                                                >
                                                    Save
                                                </Button>
                                            </Td>
                                        </Tr>
                                    );
                                })}
                            </Tbody>
                        </Table>
                    </Box>
                )}

                {status?.connected && listings.length === 0 && (
                    <Text fontSize="sm" color="gray.500">No active listings found in your Etsy shop.</Text>
                )}
            </Box>
        </VStack>
    );
};

export default EtsyPage;
