import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
    Box, Heading, Text, VStack, HStack, Badge, Button, Select, Spinner, Divider,
} from '@chakra-ui/react';
import { getOrder, updateOrderStatus, fulfillOrder } from './adminApi';

const STATUS_COLORS: Record<string, string> = {
    pending: 'yellow', pending_manual: 'orange', rendering: 'blue',
    rendered: 'cyan', sent: 'green', fulfilled: 'green', failed: 'red', refunded: 'gray',
};

const OrderDetailPage: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const [order, setOrder] = useState<any>(null);
    const [design, setDesign] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [newStatus, setNewStatus] = useState('');
    const [updating, setUpdating] = useState(false);

    const fetchData = async () => {
        setLoading(true);
        const data = await getOrder(parseInt(id!));
        setOrder(data.order);
        setDesign(data.design);
        setNewStatus(data.order?.status || '');
        setLoading(false);
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
                <Button size="xs" variant="ghost" onClick={() => navigate('/admin/orders')}>
                    Back
                </Button>
                <Heading size="md" color="gray.800">Order #{order.id}</Heading>
                <Badge colorScheme={STATUS_COLORS[order.status] || 'gray'}>{order.status}</Badge>
            </HStack>

            <Box bg="white" p={5} borderRadius="lg" border="1px" borderColor="gray.200">
                <VStack align="stretch" spacing={3}>
                    <HStack justify="space-between">
                        <Text fontSize="sm" color="gray.500">Etsy Receipt ID</Text>
                        <Text fontSize="sm" fontFamily="mono">{order.etsy_receipt_id || '-'}</Text>
                    </HStack>
                    <HStack justify="space-between">
                        <Text fontSize="sm" color="gray.500">Design Token</Text>
                        <Text fontSize="sm" fontFamily="mono" fontWeight="600">{order.token}</Text>
                    </HStack>
                    <HStack justify="space-between">
                        <Text fontSize="sm" color="gray.500">Type</Text>
                        <Badge colorScheme={order.listing_type === 'print' ? 'purple' : 'blue'}>
                            {order.listing_type}
                        </Badge>
                    </HStack>
                    <HStack justify="space-between">
                        <Text fontSize="sm" color="gray.500">Print Size</Text>
                        <Text fontSize="sm">{order.print_size || '-'}</Text>
                    </HStack>
                    <HStack justify="space-between">
                        <Text fontSize="sm" color="gray.500">Buyer</Text>
                        <Text fontSize="sm">{order.etsy_buyer_name || '-'}</Text>
                    </HStack>
                    <HStack justify="space-between">
                        <Text fontSize="sm" color="gray.500">Email</Text>
                        <Text fontSize="sm">{order.etsy_buyer_email || '-'}</Text>
                    </HStack>
                    <HStack justify="space-between">
                        <Text fontSize="sm" color="gray.500">Created</Text>
                        <Text fontSize="sm">{formatDate(order.created_at)}</Text>
                    </HStack>
                    <HStack justify="space-between">
                        <Text fontSize="sm" color="gray.500">Fulfilled</Text>
                        <Text fontSize="sm">{formatDate(order.fulfilled_at)}</Text>
                    </HStack>
                    {order.tracking_number && (
                        <HStack justify="space-between">
                            <Text fontSize="sm" color="gray.500">Tracking</Text>
                            <Text fontSize="sm" fontFamily="mono">{order.tracking_number}</Text>
                        </HStack>
                    )}
                    <HStack justify="space-between">
                        <Text fontSize="sm" color="gray.500">Revisions Used</Text>
                        <Text fontSize="sm">{order.revisions_used}/3</Text>
                    </HStack>
                </VStack>
            </Box>

            {/* Status Actions */}
            <Box bg="white" p={5} borderRadius="lg" border="1px" borderColor="gray.200">
                <Text fontSize="sm" fontWeight="600" mb={3}>Actions</Text>
                <HStack spacing={2}>
                    <Select size="sm" maxW="200px" value={newStatus} onChange={e => setNewStatus(e.target.value)}>
                        {['pending', 'pending_manual', 'rendering', 'rendered', 'sent', 'fulfilled', 'failed', 'refunded'].map(s => (
                            <option key={s} value={s}>{s}</option>
                        ))}
                    </Select>
                    <Button size="sm" onClick={handleStatusUpdate} isLoading={updating}
                        isDisabled={newStatus === order.status}>
                        Update Status
                    </Button>
                    <Divider orientation="vertical" h="30px" />
                    <Button size="sm" colorScheme="green" onClick={handleFulfill} isLoading={updating}
                        isDisabled={['sent', 'fulfilled'].includes(order.status)}>
                        Fulfill Now
                    </Button>
                </HStack>
            </Box>

            {/* Shipping Address (for print orders) */}
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

            {/* Design preview info */}
            {design && (
                <Box bg="white" p={5} borderRadius="lg" border="1px" borderColor="gray.200">
                    <Text fontSize="sm" fontWeight="600" mb={2}>Design Info</Text>
                    <VStack align="stretch" spacing={1}>
                        <HStack justify="space-between">
                            <Text fontSize="xs" color="gray.500">Title</Text>
                            <Text fontSize="xs">{design.customText?.title || design.title || '-'}</Text>
                        </HStack>
                        <HStack justify="space-between">
                            <Text fontSize="xs" color="gray.500">Location</Text>
                            <Text fontSize="xs">{design.location || '-'}</Text>
                        </HStack>
                        <HStack justify="space-between">
                            <Text fontSize="xs" color="gray.500">Mode</Text>
                            <Text fontSize="xs">{design.posterType || '-'}</Text>
                        </HStack>
                        <HStack justify="space-between">
                            <Text fontSize="xs" color="gray.500">Shape</Text>
                            <Text fontSize="xs">{design.maskShape || '-'}</Text>
                        </HStack>
                    </VStack>
                </Box>
            )}
        </VStack>
    );
};

export default OrderDetailPage;
