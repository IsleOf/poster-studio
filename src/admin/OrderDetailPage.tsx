import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
    Box, Heading, Text, VStack, HStack, Badge, Button, Select, Spinner, Divider, Textarea,
} from '@chakra-ui/react';
import { getOrder, updateOrderStatus, fulfillOrder, updateOrderNotes } from './adminApi';

const STATUS_COLORS: Record<string, string> = {
    pending: 'yellow', pending_manual: 'orange', rendering: 'blue',
    rendered: 'cyan', sent: 'green', fulfilled: 'green', shipped: 'teal', failed: 'red', refunded: 'gray',
};

// These statuses can still be retried / fulfilled
const FULFILLABLE_STATUSES = ['pending', 'pending_manual', 'rendered', 'failed'];

const OrderDetailPage: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const [order, setOrder] = useState<any>(null);
    const [design, setDesign] = useState<any>(null);
    const [timeline, setTimeline] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [newStatus, setNewStatus] = useState('');
    const [updating, setUpdating] = useState(false);
    const [notes, setNotes] = useState('');
    const [savedNotes, setSavedNotes] = useState('');
    const [savingNotes, setSavingNotes] = useState(false);

    const fetchData = async () => {
        setLoading(true);
        try {
            const data = await getOrder(parseInt(id!));
            setOrder(data.order);
            setDesign(data.design);
            setNewStatus(data.order?.status || '');
            const n = data.order?.seller_notes || '';
            setNotes(n);
            setSavedNotes(n);

            // Fetch timeline (use auth token)
            const token = localStorage.getItem('admin_token');
            const tlRes = await fetch(`/api/admin/orders/${id}/timeline`, {
                headers: token ? { Authorization: `Bearer ${token}` } : {},
            });
            if (tlRes.ok) {
                const tlData = await tlRes.json();
                setTimeline(tlData.events || []);
            }
        } catch {
            // 401 redirects via adminFetch; other errors leave empty state
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchData(); }, [id]);

    const handleStatusUpdate = async () => {
        setUpdating(true);
        await updateOrderStatus(order.id, newStatus);
        await fetchData();
        setUpdating(false);
    };

    const handleFulfill = async () => {
        setUpdating(true);
        await fulfillOrder(order.id);
        await fetchData();
        setUpdating(false);
    };

    const handleSaveNotes = async () => {
        setSavingNotes(true);
        await updateOrderNotes(order.id, notes);
        setSavedNotes(notes);
        setSavingNotes(false);
    };

    const formatDate = (ts: number) => {
        if (!ts) return '-';
        return new Date(ts * 1000).toLocaleDateString('en-AU', {
            day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
        });
    };

    if (loading) return <Box p={8} textAlign="center"><Spinner /></Box>;
    if (!order) return <Text>Order not found</Text>;

    return (
        <VStack align="stretch" spacing={4} maxW="800px">
            <HStack>
                <Button size="xs" variant="ghost" onClick={() => navigate('/admin/orders')}>Back</Button>
                <Heading size="md" color="gray.800">Order #{order.id}</Heading>
                <Badge colorScheme={STATUS_COLORS[order.status] || 'gray'}>{order.status}</Badge>
            </HStack>

            {/* Order info */}
            <Box bg="white" p={5} borderRadius="lg" border="1px" borderColor="gray.200">
                <VStack align="stretch" spacing={3}>
                    {[
                        ['Etsy Receipt ID', <Text fontSize="sm" fontFamily="mono">{order.etsy_receipt_id || '-'}</Text>],
                        ['Design Token', <Text fontSize="sm" fontFamily="mono" fontWeight="600">{order.token}</Text>],
                        ['Type', <Badge colorScheme={order.listing_type === 'print' ? 'purple' : 'blue'}>{order.listing_type}</Badge>],
                        ['Print Size', order.print_size || '-'],
                        ['Buyer', order.etsy_buyer_name || '-'],
                        ['Email', order.etsy_buyer_email || '-'],
                        ['Created', formatDate(order.created_at)],
                        ['Fulfilled', formatDate(order.fulfilled_at)],
                        ...(order.tracking_number ? [['Tracking', (
                            <HStack spacing={2} key="tracking">
                                <Text fontSize="sm" fontFamily="mono">{order.tracking_number}</Text>
                                {order.tracking_url && (
                                    <Text as="a" href={order.tracking_url} target="_blank" rel="noopener noreferrer"
                                        fontSize="xs" color="blue.500" textDecoration="underline">
                                        Track
                                    </Text>
                                )}
                            </HStack>
                        )]] : []),
                        ['Revisions Used', `${order.revisions_used}/3`],
                    ].map(([label, value]) => (
                        <HStack key={String(label)} justify="space-between">
                            <Text fontSize="sm" color="gray.500">{label}</Text>
                            {typeof value === 'string' ? <Text fontSize="sm">{value}</Text> : value}
                        </HStack>
                    ))}
                </VStack>
            </Box>

            {/* Actions */}
            <Box bg="white" p={5} borderRadius="lg" border="1px" borderColor="gray.200">
                <Text fontSize="sm" fontWeight="600" mb={3}>Actions</Text>
                <HStack spacing={2}>
                    <Select size="sm" maxW="200px" value={newStatus} onChange={e => setNewStatus(e.target.value)}>
                        {['pending', 'pending_manual', 'rendering', 'rendered', 'sent', 'fulfilled', 'shipped', 'failed', 'refunded'].map(s => (
                            <option key={s} value={s}>{s}</option>
                        ))}
                    </Select>
                    <Button size="sm" onClick={handleStatusUpdate} isLoading={updating}
                        isDisabled={newStatus === order.status}>
                        Update Status
                    </Button>
                    <Divider orientation="vertical" h="30px" />
                    <Button size="sm" colorScheme="green" onClick={handleFulfill} isLoading={updating}
                        isDisabled={!FULFILLABLE_STATUSES.includes(order.status)}>
                        {order.status === 'failed' ? 'Retry Fulfillment' : 'Fulfill Now'}
                    </Button>
                </HStack>
                {order.status === 'failed' && (
                    <Text fontSize="xs" color="red.500" mt={2}>
                        This order failed. Click "Retry Fulfillment" to attempt again.
                    </Text>
                )}
            </Box>

            {/* Seller notes */}
            <Box bg="white" p={5} borderRadius="lg" border="1px" borderColor="gray.200">
                <Text fontSize="sm" fontWeight="600" mb={3}>Seller Notes</Text>
                <Textarea
                    size="sm"
                    placeholder="Internal notes about this order (not visible to customer)..."
                    value={notes}
                    onChange={e => setNotes(e.target.value)}
                    rows={3}
                    borderColor="gray.200"
                />
                <Button
                    size="sm" mt={2} onClick={handleSaveNotes} isLoading={savingNotes}
                    isDisabled={notes === savedNotes}
                    bg="gray.900" color="white" _hover={{ bg: 'gray.700' }}>
                    Save Note
                </Button>
            </Box>

            {/* Shipping address (print orders) */}
            {order.ship_address_json && order.listing_type === 'print' && (
                <Box bg="white" p={5} borderRadius="lg" border="1px" borderColor="gray.200">
                    <Text fontSize="sm" fontWeight="600" mb={2}>Shipping Address</Text>
                    <Text fontSize="sm" color="gray.600" whiteSpace="pre-line">
                        {(() => {
                            try {
                                const a = JSON.parse(order.ship_address_json);
                                return [a.name, a.first_line, a.second_line, `${a.city}, ${a.state} ${a.zip}`, a.country_iso].filter(Boolean).join('\n');
                            } catch { return order.ship_address_json; }
                        })()}
                    </Text>
                </Box>
            )}

            {/* Design info */}
            {design && (
                <Box bg="white" p={5} borderRadius="lg" border="1px" borderColor="gray.200">
                    <Text fontSize="sm" fontWeight="600" mb={2}>Design Info</Text>
                    <VStack align="stretch" spacing={1}>
                        {[
                            ['Title', design.customText?.title || design.title || '-'],
                            ['Location', design.location || '-'],
                            ['Mode', design.posterType || '-'],
                            ['Shape', design.maskShape || '-'],
                        ].map(([label, value]) => (
                            <HStack key={label} justify="space-between">
                                <Text fontSize="xs" color="gray.500">{label}</Text>
                                <Text fontSize="xs">{value}</Text>
                            </HStack>
                        ))}
                    </VStack>
                </Box>
            )}

            {/* Order Timeline */}
            {timeline.length > 0 && (
                <Box bg="white" p={5} borderRadius="lg" border="1px" borderColor="gray.200">
                    <Text fontSize="sm" fontWeight="600" mb={4}>Timeline</Text>
                    <VStack align="stretch" spacing={0}>
                        {timeline.map((event, idx) => {
                            const dt = new Date((event.created_at || 0) * 1000);
                            const timeStr = dt.toLocaleDateString('en-AU', { hour: '2-digit', minute: '2-digit' });
                            const iLast = idx === timeline.length - 1;
                            return (
                                <Box key={event.id || idx} position="relative" pb={iLast ? 0 : 4}>
                                    {/* Vertical line (until last) */}
                                    {!iLast && (
                                        <Box position="absolute" left="6px" top="20px" w="1px" h="calc(100% + 16px)" bg="gray.300" />
                                    )}
                                    {/* Dot + Content */}
                                    <HStack align="flex-start" spacing={3}>
                                        <Box position="relative" zIndex={1} w="12px" h="12px" borderRadius="full" bg="gray.900" flexShrink={0} mt="2px" />
                                        <VStack align="stretch" spacing={0}>
                                            <HStack justify="space-between">
                                                <Text fontSize="sm" fontWeight="600" color="gray.900">{event.label}</Text>
                                                <Text fontSize="xs" color="gray.500">{timeStr}</Text>
                                            </HStack>
                                            {event.detail && <Text fontSize="xs" color="gray.600">{event.detail}</Text>}
                                            {event.actor && event.actor !== 'system' && (
                                                <Text fontSize="xs" color="gray.400">by {event.actor}</Text>
                                            )}
                                        </VStack>
                                    </HStack>
                                </Box>
                            );
                        })}
                    </VStack>
                </Box>
            )}
        </VStack>
    );
};

export default OrderDetailPage;
