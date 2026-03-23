import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
    Box, Heading, Text, VStack, HStack, Table, Thead, Tbody, Tr, Th, Td,
    Badge, Input, Select, Button, Spinner,
} from '@chakra-ui/react';
import { getOrders } from './adminApi';

const STATUS_COLORS: Record<string, string> = {
    pending: 'yellow', pending_manual: 'orange', rendering: 'blue',
    rendered: 'cyan', sent: 'green', fulfilled: 'green', failed: 'red', refunded: 'gray',
};

const OrdersPage: React.FC = () => {
    const [searchParams, setSearchParams] = useSearchParams();
    const [orders, setOrders] = useState<any[]>([]);
    const [total, setTotal] = useState(0);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState(searchParams.get('search') || '');
    const [statusFilter, setStatusFilter] = useState(searchParams.get('status') || 'all');
    const [page, setPage] = useState(parseInt(searchParams.get('page') || '1'));
    const navigate = useNavigate();

    const fetchData = async () => {
        setLoading(true);
        const params: Record<string, string> = { page: String(page), limit: '25' };
        if (statusFilter !== 'all') params.status = statusFilter;
        if (search) params.search = search;
        const data = await getOrders(params);
        setOrders(data.orders || []);
        setTotal(data.total || 0);
        setLoading(false);
    };

    useEffect(() => { fetchData(); }, [page, statusFilter]);

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();
        setPage(1);
        fetchData();
    };

    const formatDate = (ts: number) => {
        if (!ts) return '-';
        return new Date(ts * 1000).toLocaleDateString('en-AU', {
            day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
        });
    };

    return (
        <VStack align="stretch" spacing={4} maxW="1200px">
            <HStack justify="space-between">
                <Heading size="md" color="gray.800">Orders</Heading>
                <Text fontSize="sm" color="gray.500">{total} total</Text>
            </HStack>

            <HStack as="form" onSubmit={handleSearch} spacing={2}>
                <Input
                    size="sm" placeholder="Search token, order ID, buyer..."
                    value={search} onChange={e => setSearch(e.target.value)}
                    maxW="300px"
                />
                <Select size="sm" maxW="180px" value={statusFilter} onChange={e => { setStatusFilter(e.target.value); setPage(1); }}>
                    <option value="all">All statuses</option>
                    <option value="pending">Pending</option>
                    <option value="pending_manual">Pending Manual</option>
                    <option value="rendering">Rendering</option>
                    <option value="rendered">Rendered</option>
                    <option value="sent">Sent</option>
                    <option value="fulfilled">Fulfilled</option>
                    <option value="failed">Failed</option>
                    <option value="refunded">Refunded</option>
                </Select>
                <Button size="sm" type="submit">Search</Button>
            </HStack>

            <Box bg="white" borderRadius="lg" border="1px" borderColor="gray.200" overflow="hidden">
                {loading ? (
                    <Box p={8} textAlign="center"><Spinner /></Box>
                ) : orders.length === 0 ? (
                    <Box p={8} textAlign="center"><Text color="gray.500">No orders found</Text></Box>
                ) : (
                    <Table size="sm">
                        <Thead>
                            <Tr>
                                <Th>ID</Th>
                                <Th>Etsy Order</Th>
                                <Th>Token</Th>
                                <Th>Buyer</Th>
                                <Th>Type</Th>
                                <Th>Status</Th>
                                <Th>Date</Th>
                            </Tr>
                        </Thead>
                        <Tbody>
                            {orders.map(o => (
                                <Tr
                                    key={o.id}
                                    cursor="pointer"
                                    _hover={{ bg: 'gray.50' }}
                                    onClick={() => navigate(`/admin/orders/${o.id}`)}
                                >
                                    <Td fontWeight="600">{o.id}</Td>
                                    <Td fontSize="xs" fontFamily="mono">{o.etsy_receipt_id || '-'}</Td>
                                    <Td fontSize="xs" fontFamily="mono">{o.token}</Td>
                                    <Td>{o.etsy_buyer_name || '-'}</Td>
                                    <Td>
                                        <Badge colorScheme={o.listing_type === 'print' ? 'purple' : 'blue'} fontSize="xs">
                                            {o.listing_type}
                                        </Badge>
                                    </Td>
                                    <Td>
                                        <Badge colorScheme={STATUS_COLORS[o.status] || 'gray'} fontSize="xs">
                                            {o.status}
                                        </Badge>
                                    </Td>
                                    <Td fontSize="xs">{formatDate(o.created_at)}</Td>
                                </Tr>
                            ))}
                        </Tbody>
                    </Table>
                )}
            </Box>

            {total > 25 && (
                <HStack justify="center" spacing={2}>
                    <Button size="xs" isDisabled={page <= 1} onClick={() => setPage(p => p - 1)}>Previous</Button>
                    <Text fontSize="sm" color="gray.600">Page {page} of {Math.ceil(total / 25)}</Text>
                    <Button size="xs" isDisabled={page >= Math.ceil(total / 25)} onClick={() => setPage(p => p + 1)}>Next</Button>
                </HStack>
            )}
        </VStack>
    );
};

export default OrdersPage;
