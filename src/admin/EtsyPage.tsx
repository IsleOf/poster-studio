import React, { useEffect, useState } from 'react';
import {
    Box, Heading, Text, VStack, HStack, Button, Badge, Spinner,
    Table, Thead, Tbody, Tr, Th, Td, Select, SimpleGrid, Divider, useToast,
} from '@chakra-ui/react';
import { useNavigate } from 'react-router-dom';
import { getEtsyStatus, getEtsyListings, getEtsyReceipts, getTemplates, linkEtsyListing, syncEtsyOrders } from './adminApi';

const fmt = (cents: number, divisor = 100) =>
    `$${(cents / divisor).toFixed(2)}`;

const EtsyPage: React.FC = () => {
    const [status, setStatus] = useState<any>(null);
    const [listings, setListings] = useState<any[]>([]);
    const [receipts, setReceipts] = useState<any[]>([]);
    const [templates, setTemplates] = useState<any[]>([]);
    const [linkMap, setLinkMap] = useState<Record<string, string>>({});
    const [loading, setLoading] = useState(true);
    const [syncing, setSyncing] = useState(false);
    const [syncResult, setSyncResult] = useState<{ ok: boolean; msg: string } | null>(null);
    const [linking, setLinking] = useState<string | null>(null);
    const navigate = useNavigate();
    const toast = useToast();

    const fetchAll = async () => {
        setLoading(true);
        try {
            const [s, t] = await Promise.all([getEtsyStatus(), getTemplates()]);
            setStatus(s);
            setTemplates(Array.isArray(t) ? t : []);
            if (s?.connected) {
                const [l, r] = await Promise.allSettled([getEtsyListings(), getEtsyReceipts()]);
                setListings(l.status === 'fulfilled' ? (l.value?.listings || []) : []);
                setReceipts(r.status === 'fulfilled' ? (r.value?.receipts || []) : []);
            }
        } catch {
            // 401 will redirect; other errors leave empty state
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchAll(); }, []);

    const handleSync = async () => {
        setSyncing(true);
        setSyncResult(null);
        try {
            const result = await syncEtsyOrders();
            const msg = result.imported > 0
                ? `${result.imported} new order${result.imported !== 1 ? 's' : ''} imported`
                : 'No new orders';
            setSyncResult({ ok: true, msg });
            toast({ title: msg, status: 'success', duration: 4000 });
            setTimeout(() => setSyncResult(null), 6000);
        } catch (err) {
            const msg = 'Sync failed: ' + (err instanceof Error ? err.message : String(err));
            setSyncResult({ ok: false, msg });
        }
        setSyncing(false);
    };

    const handleLink = async (listingId: string, templateId: string) => {
        setLinking(listingId);
        await linkEtsyListing(listingId, templateId);
        await fetchAll();
        setLinking(null);
    };

    const etsyToTemplate: Record<string, string> = {};
    for (const t of templates) {
        if (t.etsy_listing_id) etsyToTemplate[t.etsy_listing_id] = t.id;
    }

    if (loading) return <Box p={8} textAlign="center"><Spinner /></Box>;

    return (
        <VStack align="stretch" spacing={5} maxW="1000px">
            <Heading size="md" color="gray.800">Etsy Shop</Heading>

            {/* ── Shop stats (when connected) ──────────────────────────────── */}
            {status?.connected ? (
                <>
                    <Box bg="green.50" borderRadius="lg" border="1px" borderColor="green.200" p={5}>
                        <HStack justify="space-between" flexWrap="wrap" gap={3}>
                            <HStack spacing={3}>
                                <Badge colorScheme="green" fontSize="sm" px={2} py={1}>● Connected</Badge>
                                <Box>
                                    <Text fontSize="sm" fontWeight="700" color="gray.800">
                                        {status.shopName || status.shopId}
                                    </Text>
                                    {status.lastPollAt && (
                                        <Text fontSize="xs" color="gray.500">
                                            Last synced {new Date(status.lastPollAt).toLocaleString('en-AU', {
                                                day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit',
                                            })}
                                        </Text>
                                    )}
                                </Box>
                            </HStack>
                            <HStack spacing={2}>
                                <Button size="sm" onClick={handleSync} isLoading={syncing}>
                                    Sync Orders Now
                                </Button>
                                {syncResult && (
                                    <Text fontSize="sm" color={syncResult.ok ? 'green.600' : 'red.500'} fontWeight="600">
                                        {syncResult.msg}
                                    </Text>
                                )}
                            </HStack>
                        </HStack>

                        {/* Stat pills */}
                        <SimpleGrid columns={{ base: 2, md: 4 }} spacing={3} mt={4}>
                            {[
                                { label: 'Total Listings', value: status.listingsCount ?? '—' },
                                { label: 'Active Listings', value: status.activeListingsCount ?? '—' },
                                { label: 'Pending Orders', value: status.pendingOrdersCount ?? '—', alert: (status.pendingOrdersCount ?? 0) > 0 },
                                { label: 'Shop ID', value: status.shopId ?? '—' },
                            ].map(s => (
                                <Box key={s.label} bg="white" px={3} py={2} borderRadius="md" border="1px"
                                    borderColor={s.alert ? 'orange.300' : 'green.200'}>
                                    <Text fontSize="xs" color="gray.500">{s.label}</Text>
                                    <Text fontSize="lg" fontWeight="700"
                                        color={s.alert ? 'orange.500' : 'gray.800'}>{s.value}</Text>
                                </Box>
                            ))}
                        </SimpleGrid>
                    </Box>

                    {/* ── Recent Etsy receipts ─────────────────────────────────── */}
                    {receipts.length > 0 && (
                        <Box bg="white" borderRadius="lg" border="1px" borderColor="gray.200">
                            <Box px={5} py={3} borderBottom="1px" borderColor="gray.100">
                                <Text fontSize="sm" fontWeight="600" color="gray.700">
                                    Recent Etsy Receipts
                                </Text>
                                <Text fontSize="xs" color="gray.400">
                                    Paid orders from your Etsy shop. Use "Sync Orders Now" to import new ones.
                                </Text>
                            </Box>
                            <Table size="sm">
                                <Thead>
                                    <Tr>
                                        <Th>Receipt ID</Th>
                                        <Th>Buyer</Th>
                                        <Th>Message</Th>
                                        <Th>Amount</Th>
                                        <Th>Date</Th>
                                        <Th>Status</Th>
                                    </Tr>
                                </Thead>
                                <Tbody>
                                    {receipts.map((r: any) => (
                                        <Tr key={r.receipt_id} _hover={{ bg: 'gray.50' }}>
                                            <Td fontFamily="mono" fontSize="xs" color="gray.600">
                                                {r.receipt_id}
                                            </Td>
                                            <Td fontWeight="500">{r.name}</Td>
                                            <Td maxW="200px">
                                                <Text fontSize="xs" color="gray.600" noOfLines={1}
                                                    title={r.message_from_buyer}>
                                                    {r.message_from_buyer || <Text as="span" color="gray.300">—</Text>}
                                                </Text>
                                            </Td>
                                            <Td fontSize="sm" fontWeight="600" color="green.600">
                                                {r.total_price
                                                    ? fmt(r.total_price.amount, r.total_price.divisor)
                                                    : '—'}
                                            </Td>
                                            <Td fontSize="xs" color="gray.500">
                                                {r.created_timestamp
                                                    ? new Date(r.created_timestamp * 1000).toLocaleDateString('en-AU', {
                                                        day: 'numeric', month: 'short',
                                                    })
                                                    : '—'}
                                            </Td>
                                            <Td>
                                                <Badge colorScheme="green" fontSize="xs">{r.status}</Badge>
                                            </Td>
                                        </Tr>
                                    ))}
                                </Tbody>
                            </Table>
                        </Box>
                    )}

                    {/* ── Listing performance table ────────────────────────────── */}
                    {listings.length > 0 && (
                        <Box bg="white" borderRadius="lg" border="1px" borderColor="gray.200">
                            <Box px={5} py={3} borderBottom="1px" borderColor="gray.100">
                                <Text fontSize="sm" fontWeight="600" color="gray.700">
                                    Listing Performance
                                </Text>
                                <Text fontSize="xs" color="gray.400">
                                    Live stats from your Etsy shop. Link each listing to a template to enable auto-fulfillment.
                                </Text>
                            </Box>
                            <Table size="sm">
                                <Thead>
                                    <Tr>
                                        <Th>Listing</Th>
                                        <Th>State</Th>
                                        <Th isNumeric>Price</Th>
                                        <Th isNumeric>Views</Th>
                                        <Th isNumeric>❤️</Th>
                                        <Th>Template</Th>
                                        <Th>Action</Th>
                                    </Tr>
                                </Thead>
                                <Tbody>
                                    {listings.map((l: any) => {
                                        const listingId = String(l.id || l.listing_id);
                                        const currentTemplate = etsyToTemplate[listingId] || '';
                                        const localVal = linkMap[listingId] ?? currentTemplate;
                                        return (
                                            <Tr key={listingId} _hover={{ bg: 'gray.50' }}
                                                opacity={l.state === 'inactive' ? 0.6 : 1}>
                                                <Td maxW="240px">
                                                    <Text fontSize="xs" fontWeight="500" noOfLines={2}>{l.title}</Text>
                                                    <Text fontSize="xs" fontFamily="mono" color="gray.400">{listingId}</Text>
                                                </Td>
                                                <Td>
                                                    <Badge colorScheme={l.state === 'active' ? 'green' : 'gray'} fontSize="xs">
                                                        {l.state}
                                                    </Badge>
                                                </Td>
                                                <Td isNumeric fontSize="sm" fontWeight="600" color="green.600">
                                                    {l.price
                                                        ? fmt(l.price.amount, l.price.divisor)
                                                        : '—'}
                                                </Td>
                                                <Td isNumeric fontSize="sm" color="gray.700">
                                                    {l.views?.toLocaleString() ?? '—'}
                                                </Td>
                                                <Td isNumeric fontSize="sm" color="gray.500">
                                                    {l.num_favorers?.toLocaleString() ?? '—'}
                                                </Td>
                                                <Td>
                                                    <Select size="xs" maxW="160px"
                                                        value={localVal}
                                                        onChange={e => setLinkMap(m => ({ ...m, [listingId]: e.target.value }))}>
                                                        <option value="">— none —</option>
                                                        {templates.map(t => (
                                                            <option key={t.id} value={t.id}>{t.name}</option>
                                                        ))}
                                                    </Select>
                                                </Td>
                                                <Td>
                                                    <HStack spacing={1}>
                                                        <Button
                                                            size="xs"
                                                            isLoading={linking === listingId}
                                                            isDisabled={localVal === currentTemplate}
                                                            onClick={() => handleLink(listingId, localVal)}
                                                        >
                                                            Save
                                                        </Button>
                                                        {l.url && (
                                                            <Button size="xs" variant="ghost"
                                                                onClick={() => window.open(l.url, '_blank')}>
                                                                ↗
                                                            </Button>
                                                        )}
                                                    </HStack>
                                                </Td>
                                            </Tr>
                                        );
                                    })}
                                </Tbody>
                            </Table>
                        </Box>
                    )}

                </>

            ) : (
                /* ── Not connected state ───────────────────────────────────── */
                <Box bg="white" borderRadius="lg" border="1px" borderColor="gray.200" p={6}>
                    <HStack justify="space-between" flexWrap="wrap" gap={3} mb={4}>
                        <HStack spacing={3}>
                            <Badge colorScheme="red" fontSize="sm" px={2} py={1}>Not Connected</Badge>
                            <Box>
                                <Text fontSize="sm" fontWeight="600" color="gray.700">Etsy shop not connected</Text>
                                <Text fontSize="xs" color="gray.400">Set credentials in Settings to enable auto-fulfillment</Text>
                            </Box>
                        </HStack>
                        <HStack spacing={2}>
                            <Button size="sm" isDisabled>Sync Orders Now</Button>
                            <Button size="sm" variant="outline" onClick={() => navigate('/admin/settings')}>
                                Go to Settings →
                            </Button>
                        </HStack>
                    </HStack>
                    <VStack align="start" spacing={1} fontSize="xs" color="gray.500" pl={1}>
                        <Text>1. Create an Etsy App at <Text as="span" fontFamily="mono">etsy.com/developers</Text></Text>
                        <Text>2. Add <Text as="span" fontFamily="mono" color="gray.700">ETSY_API_KEY</Text>, <Text as="span" fontFamily="mono" color="gray.700">ETSY_ACCESS_TOKEN</Text>, <Text as="span" fontFamily="mono" color="gray.700">ETSY_SHOP_ID</Text> to <Text as="span" fontFamily="mono">server/.env</Text></Text>
                        <Text>3. Restart server · use OAuth flow at <Text as="span" fontFamily="mono">/auth/etsy</Text> · return here</Text>
                    </VStack>
                </Box>
            )}

            {/* ── Linked templates — always visible regardless of Etsy connection ── */}
            {templates.filter(t => t.etsy_listing_id).length > 0 && (
                <Box bg="white" borderRadius="lg" border="1px" borderColor="gray.200" p={5}>
                    <Text fontSize="sm" fontWeight="600" mb={3}>Currently linked</Text>
                    <Table size="sm">
                        <Thead>
                            <Tr>
                                <Th>Template</Th>
                                <Th>Etsy Listing ID</Th>
                                <Th>Designer URL</Th>
                            </Tr>
                        </Thead>
                        <Tbody>
                            {templates.filter(t => t.etsy_listing_id).map(t => (
                                <Tr key={t.id}>
                                    <Td fontWeight="500" fontSize="sm">{t.name}</Td>
                                    <Td fontFamily="mono" fontSize="xs" color="gray.600">{t.etsy_listing_id}</Td>
                                    <Td>
                                        <Text fontSize="xs" color="blue.500" cursor="pointer" textDecoration="underline"
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
        </VStack>
    );
};

export default EtsyPage;
