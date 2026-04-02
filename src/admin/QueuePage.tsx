import React, { useEffect, useState, useCallback } from 'react';
import {
    Box, Heading, Text, VStack, HStack, Badge, Button, Spinner,
    Table, Thead, Tbody, Tr, Th, Td, SimpleGrid, Switch, Divider, useToast,
} from '@chakra-ui/react';
import { useNavigate } from 'react-router-dom';
import { getOrders, fulfillOrder, getSettings, updateSettings } from './adminApi';

const STATUS_COLORS: Record<string, string> = {
    rendering: 'blue', pending: 'yellow', pending_manual: 'orange',
};

const elapsed = (ts: number) => {
    const secs = Math.floor((Date.now() / 1000) - ts);
    if (secs < 60) return `${secs}s`;
    if (secs < 3600) return `${Math.floor(secs / 60)}m`;
    return `${Math.floor(secs / 3600)}h ${Math.floor((secs % 3600) / 60)}m`;
};

const QueuePage: React.FC = () => {
    const [rendering, setRendering] = useState<any[]>([]);
    const [pending, setPending] = useState<any[]>([]);
    const [manual, setManual] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [autoMode, setAutoMode] = useState(false);
    const [toggling, setToggling] = useState(false);
    const [approving, setApproving] = useState<number | null>(null);
    const [lastRefresh, setLastRefresh] = useState(Date.now());
    const navigate = useNavigate();
    const toast = useToast();

    const load = useCallback(async () => {
        const [r, p, m, s] = await Promise.all([
            getOrders({ status: 'rendering', limit: '50' }),
            getOrders({ status: 'pending', limit: '50' }),
            getOrders({ status: 'pending_manual', limit: '50' }),
            getSettings(),
        ]);
        setRendering(r.orders || []);
        setPending(p.orders || []);
        setManual(m.orders || []);
        setAutoMode(!!s.auto_process_orders);
        setLastRefresh(Date.now());
        setLoading(false);
    }, []);

    useEffect(() => {
        load();
        const iv = setInterval(load, 30_000);
        return () => clearInterval(iv);
    }, [load]);

    const handleToggleMode = async () => {
        setToggling(true);
        const next = !autoMode;
        await updateSettings({ auto_process_orders: next });
        setAutoMode(next);
        setToggling(false);
        toast({
            title: next ? 'Auto-process enabled' : 'Manual mode enabled',
            description: next
                ? 'New orders will be rendered and sent automatically.'
                : 'New orders will queue for manual review.',
            status: next ? 'success' : 'info',
            duration: 3000,
            isClosable: true,
        });
    };

    const handleApprove = async (orderId: number) => {
        setApproving(orderId);
        await fulfillOrder(orderId);
        toast({ title: 'Order approved — queued for rendering', status: 'success', duration: 3000 });
        await load();
        setApproving(null);
    };

    const totalQueued = rendering.length + pending.length + manual.length;

    if (loading) return <Box p={8} textAlign="center"><Spinner /></Box>;

    return (
        <VStack align="stretch" spacing={4} maxW="1000px">
            {/* Header */}
            <HStack justify="space-between" flexWrap="wrap" gap={3}>
                <Box>
                    <Heading size="md" color="gray.800">Render Queue</Heading>
                    <Text fontSize="xs" color="gray.500" mt={0.5}>
                        {totalQueued} order{totalQueued !== 1 ? 's' : ''} in queue ·{' '}
                        Auto-refreshes every 30s · Last updated {new Date(lastRefresh).toLocaleTimeString('en-AU', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                    </Text>
                </Box>
                <HStack spacing={3} bg="white" px={4} py={2} borderRadius="lg" border="1px" borderColor="gray.200">
                    <Box>
                        <Text fontSize="xs" fontWeight="700" color={autoMode ? 'green.600' : 'orange.600'}>
                            {autoMode ? '⚡ Auto Mode' : '🖐 Manual Mode'}
                        </Text>
                        <Text fontSize="xs" color="gray.400">
                            {autoMode ? 'Orders render + send automatically' : 'You approve each order'}
                        </Text>
                    </Box>
                    <Switch
                        isChecked={autoMode}
                        onChange={handleToggleMode}
                        isDisabled={toggling}
                        colorScheme="green"
                        size="md"
                    />
                </HStack>
            </HStack>

            {/* Stats */}
            <SimpleGrid columns={{ base: 2, md: 3 }} spacing={3}>
                <StatBox label="Rendering Now" value={rendering.length} color="blue.500" />
                <StatBox label="Pending Manual" value={manual.length} color="orange.500" alert={manual.length > 0} />
                <StatBox label="Auto Queue" value={pending.length} color="yellow.600" />
            </SimpleGrid>

            {/* Manual approval section — always shown first if items exist */}
            {manual.length > 0 && (
                <Box bg="white" borderRadius="lg" border="2px" borderColor="orange.200">
                    <Box px={5} py={3} borderBottom="1px" borderColor="orange.100" bg="orange.50" borderTopRadius="lg">
                        <HStack>
                            <Badge colorScheme="orange" fontSize="xs">Action Required</Badge>
                            <Text fontSize="sm" fontWeight="600" color="orange.800">
                                {manual.length} order{manual.length !== 1 ? 's' : ''} waiting for your approval
                            </Text>
                        </HStack>
                        <Text fontSize="xs" color="orange.600" mt={0.5}>
                            These arrived while in manual mode. Review and approve to start rendering.
                        </Text>
                    </Box>
                    <Table size="sm">
                        <Thead>
                            <Tr>
                                <Th>Order</Th>
                                <Th>Buyer</Th>
                                <Th>Type</Th>
                                <Th>Size</Th>
                                <Th>Received</Th>
                                <Th>Action</Th>
                            </Tr>
                        </Thead>
                        <Tbody>
                            {manual.map(o => (
                                <Tr key={o.id} _hover={{ bg: 'orange.50' }}>
                                    <Td fontWeight="600" cursor="pointer" color="blue.600"
                                        onClick={() => navigate(`/admin/orders/${o.id}`)}>
                                        #{o.id}
                                    </Td>
                                    <Td>{o.etsy_buyer_name || '—'}</Td>
                                    <Td>
                                        <Badge colorScheme={o.listing_type === 'print' ? 'purple' : 'blue'} fontSize="xs">
                                            {o.listing_type}
                                        </Badge>
                                    </Td>
                                    <Td fontSize="xs" color="gray.600">{o.print_size || '—'}</Td>
                                    <Td fontSize="xs" color="gray.500">{elapsed(o.created_at)} ago</Td>
                                    <Td>
                                        <HStack spacing={1}>
                                            <Button
                                                size="xs" colorScheme="orange"
                                                isLoading={approving === o.id}
                                                onClick={() => handleApprove(o.id)}
                                            >
                                                Approve & Render
                                            </Button>
                                            <Button
                                                size="xs" variant="ghost"
                                                onClick={() => navigate(`/admin/orders/${o.id}`)}
                                            >
                                                View
                                            </Button>
                                        </HStack>
                                    </Td>
                                </Tr>
                            ))}
                        </Tbody>
                    </Table>
                </Box>
            )}

            {/* Active renders */}
            <Box bg="white" borderRadius="lg" border="1px" borderColor="gray.200">
                <Box px={5} py={3} borderBottom="1px" borderColor="gray.100">
                    <HStack>
                        {rendering.length > 0 && <Spinner size="xs" color="blue.500" />}
                        <Text fontSize="sm" fontWeight="600" color="gray.700">
                            Active Renders ({rendering.length})
                        </Text>
                    </HStack>
                </Box>
                {rendering.length === 0 ? (
                    <Box p={6} textAlign="center">
                        <Text fontSize="sm" color="gray.400">No orders currently rendering.</Text>
                    </Box>
                ) : (
                    <Table size="sm">
                        <Thead>
                            <Tr><Th>Order</Th><Th>Buyer</Th><Th>Type</Th><Th>Size</Th><Th>Started</Th><Th>Status</Th></Tr>
                        </Thead>
                        <Tbody>
                            {rendering.map(o => (
                                <Tr key={o.id} _hover={{ bg: 'blue.50' }}>
                                    <Td fontWeight="600" cursor="pointer" color="blue.600"
                                        onClick={() => navigate(`/admin/orders/${o.id}`)}>
                                        #{o.id}
                                    </Td>
                                    <Td>{o.etsy_buyer_name || '—'}</Td>
                                    <Td>
                                        <Badge colorScheme={o.listing_type === 'print' ? 'purple' : 'blue'} fontSize="xs">
                                            {o.listing_type}
                                        </Badge>
                                    </Td>
                                    <Td fontSize="xs" color="gray.600">{o.print_size || '—'}</Td>
                                    <Td fontSize="xs" color="gray.500">{elapsed(o.created_at)} ago</Td>
                                    <Td>
                                        <HStack spacing={1}>
                                            <Spinner size="xs" color="blue.500" />
                                            <Badge colorScheme="blue" fontSize="xs">rendering</Badge>
                                        </HStack>
                                    </Td>
                                </Tr>
                            ))}
                        </Tbody>
                    </Table>
                )}
            </Box>

            {/* Auto queue */}
            <Box bg="white" borderRadius="lg" border="1px" borderColor="gray.200">
                <Box px={5} py={3} borderBottom="1px" borderColor="gray.100">
                    <Text fontSize="sm" fontWeight="600" color="gray.700">
                        Auto Queue ({pending.length})
                    </Text>
                    <Text fontSize="xs" color="gray.400">
                        Waiting to be picked up by the render worker.
                    </Text>
                </Box>
                {pending.length === 0 ? (
                    <Box p={6} textAlign="center">
                        <Text fontSize="sm" color="gray.400">Queue is empty.</Text>
                    </Box>
                ) : (
                    <Table size="sm">
                        <Thead>
                            <Tr><Th>Order</Th><Th>Buyer</Th><Th>Type</Th><Th>Size</Th><Th>Queued</Th></Tr>
                        </Thead>
                        <Tbody>
                            {pending.map(o => (
                                <Tr key={o.id} _hover={{ bg: 'gray.50' }}>
                                    <Td fontWeight="600" cursor="pointer" color="blue.600"
                                        onClick={() => navigate(`/admin/orders/${o.id}`)}>
                                        #{o.id}
                                    </Td>
                                    <Td>{o.etsy_buyer_name || '—'}</Td>
                                    <Td>
                                        <Badge colorScheme={o.listing_type === 'print' ? 'purple' : 'blue'} fontSize="xs">
                                            {o.listing_type}
                                        </Badge>
                                    </Td>
                                    <Td fontSize="xs" color="gray.600">{o.print_size || '—'}</Td>
                                    <Td fontSize="xs" color="gray.500">{elapsed(o.created_at)} ago</Td>
                                </Tr>
                            ))}
                        </Tbody>
                    </Table>
                )}
            </Box>

            {totalQueued === 0 && (
                <Box bg="green.50" border="1px" borderColor="green.200" borderRadius="lg" p={6} textAlign="center">
                    <Text fontSize="sm" fontWeight="600" color="green.700">✓ Queue is clear</Text>
                    <Text fontSize="xs" color="green.600" mt={1}>All orders have been processed.</Text>
                </Box>
            )}

            <Divider />
            <HStack justify="space-between" flexWrap="wrap" gap={2}>
                <Text fontSize="xs" color="gray.400">
                    Failed orders are not shown here — find them in{' '}
                    <Text as="span" color="blue.500" cursor="pointer"
                        onClick={() => navigate('/admin/orders?status=failed')}>
                        Orders → Failed
                    </Text>.
                </Text>
                <Button size="xs" variant="outline" onClick={load}>Refresh Now</Button>
            </HStack>
        </VStack>
    );
};

const StatBox: React.FC<{ label: string; value: number; color: string; alert?: boolean }> = ({ label, value, color, alert }) => (
    <Box p={4} borderRadius="lg" border="1px"
        borderColor={alert && value > 0 ? 'orange.300' : 'gray.200'}
        bg={alert && value > 0 ? 'orange.50' : 'white'}>
        <Text fontSize="xs" fontWeight="600" color="gray.500" textTransform="uppercase" mb={1}>{label}</Text>
        <Text fontSize="2xl" fontWeight="700" color={value > 0 ? color : 'gray.300'}>{value}</Text>
    </Box>
);

export default QueuePage;
