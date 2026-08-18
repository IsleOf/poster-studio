import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
    Box, Heading, Text, VStack, HStack, Table, Thead, Tbody, Tr, Th, Td,
    Badge, Input, Select, Button, Spinner, Checkbox,
} from '@chakra-ui/react';
import { getOrders, bulkUpdateOrderStatus } from './adminApi';

const STATUS_COLORS: Record<string, string> = {
    pending: 'yellow', pending_manual: 'orange', rendering: 'blue',
    rendered: 'cyan', sent: 'green', fulfilled: 'green', failed: 'red', refunded: 'gray',
};

const OrdersPage: React.FC = () => {
    const [searchParams] = useSearchParams();
    const [orders, setOrders] = useState<any[]>([]);
    const [total, setTotal] = useState(0);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState(searchParams.get('search') || '');
    const [statusFilter, setStatusFilter] = useState(searchParams.get('status') || 'all');
    const [page, setPage] = useState(parseInt(searchParams.get('page') || '1'));
    const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
    const [bulkStatus, setBulkStatus] = useState('refunded');
    const [applyingBulk, setApplyingBulk] = useState(false);
    const navigate = useNavigate();

    const fetchData = async () => {
        setLoading(true);
        try {
            const params: Record<string, string> = { page: String(page), limit: '25' };
            if (statusFilter !== 'all') params.status = statusFilter;
            if (search) params.search = search;
            const data = await getOrders(params);
            setOrders(Array.isArray(data?.orders) ? data.orders : []);
            setTotal(data?.total || 0);
            setSelectedIds(new Set());
        } catch {
            setOrders([]);
        } finally {
            setLoading(false);
        }
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

    const toggleSelect = (id: number) => {
        setSelectedIds(prev => {
            const next = new Set(prev);
            next.has(id) ? next.delete(id) : next.add(id);
            return next;
        });
    };

    const toggleAll = () => {
        if (selectedIds.size === orders.length) {
            setSelectedIds(new Set());
        } else {
            setSelectedIds(new Set(orders.map(o => o.id)));
        }
    };

    const handleBulkApply = async () => {
        if (!selectedIds.size) return;
        setApplyingBulk(true);
        await bulkUpdateOrderStatus(Array.from(selectedIds), bulkStatus);
        await fetchData();
        setApplyingBulk(false);
    };

    const exportCSV = () => {
        const headers = ['ID', 'Etsy Receipt', 'Token', 'Buyer', 'Email', 'Type', 'Status', 'Size', 'Created', 'Fulfilled'];
        const rows = orders.map(o => [
            o.id, o.etsy_receipt_id || '', o.token, o.etsy_buyer_name || '', o.etsy_buyer_email || '',
            o.listing_type, o.status, o.print_size || '',
            formatDate(o.created_at), o.fulfilled_at ? formatDate(o.fulfilled_at) : '',
        ]);
        const csv = [headers, ...rows]
            .map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(','))
            .join('\n');
        const blob = new Blob([csv], { type: 'text/csv' });
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = `orders-${new Date().toISOString().slice(0, 10)}.csv`;
        a.click();
        URL.revokeObjectURL(a.href);
    };

    return (
        <VStack align="stretch" spacing={4} maxW="1200px">
            <HStack justify="space-between">
                <Heading size="md" color="gray.800">Orders</Heading>
                <HStack spacing={2}>
                    <Text fontSize="sm" color="gray.500">{total} total</Text>
                    <Button size="sm" variant="outline" onClick={exportCSV}>Export CSV</Button>
                </HStack>
            </HStack>

            <HStack as="form" onSubmit={handleSearch} spacing={2}>
                <Input
                    size="sm" placeholder="Search token, order ID, buyer..."
                    value={search} onChange={e => setSearch(e.target.value)}
                    maxW="300px"
                />
                <Button size="sm" colorScheme="orange"
                    variant={statusFilter === 'needs_attention' ? 'solid' : 'outline'}
                    onClick={() => { setStatusFilter('needs_attention'); setPage(1); }}>
                    ⚠ Needs attention
                </Button>
                <Select size="sm" maxW="190px" value={statusFilter} onChange={e => { setStatusFilter(e.target.value); setPage(1); }}>
                    <option value="all">All statuses</option>
                    <option value="needs_attention">⚠ Needs attention</option>
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

            {/* Bulk toolbar */}
            {selectedIds.size > 0 && (
                <HStack bg="blue.50" p={3} borderRadius="md" border="1px" borderColor="blue.200" spacing={3}>
                    <Text fontSize="sm" fontWeight="600" color="blue.700">{selectedIds.size} selected</Text>
                    <Select
                        size="sm" maxW="180px" value={bulkStatus}
                        onChange={e => setBulkStatus(e.target.value)}
                        data-testid="bulk-status-select"
                    >
                        {['pending', 'pending_manual', 'sent', 'fulfilled', 'failed', 'refunded'].map(s => (
                            <option key={s} value={s}>{s}</option>
                        ))}
                    </Select>
                    <Button size="sm" colorScheme="blue" onClick={handleBulkApply} isLoading={applyingBulk}>
                        Apply to Selected
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => setSelectedIds(new Set())}>
                        Clear
                    </Button>
                </HStack>
            )}

            <Box bg="white" borderRadius="lg" border="1px" borderColor="gray.200" overflow="hidden">
                {loading ? (
                    <Box p={8} textAlign="center"><Spinner /></Box>
                ) : orders.length === 0 ? (
                    <Box p={8} textAlign="center"><Text color="gray.500">No orders found</Text></Box>
                ) : (
                    <Table size="sm">
                        <Thead>
                            <Tr>
                                <Th w="40px">
                                    <Checkbox
                                        isChecked={selectedIds.size === orders.length && orders.length > 0}
                                        isIndeterminate={selectedIds.size > 0 && selectedIds.size < orders.length}
                                        onChange={toggleAll}
                                    />
                                </Th>
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
                                    bg={selectedIds.has(o.id) ? 'blue.50' : undefined}
                                    _hover={{ bg: selectedIds.has(o.id) ? 'blue.100' : 'gray.50' }}
                                >
                                    <Td onClick={e => e.stopPropagation()}>
                                        <Checkbox
                                            isChecked={selectedIds.has(o.id)}
                                            onChange={() => toggleSelect(o.id)}
                                        />
                                    </Td>
                                    <Td fontWeight="600" cursor="pointer" onClick={() => navigate(`/admin/orders/${o.id}`)}>{o.id}</Td>
                                    <Td fontSize="xs" fontFamily="mono" cursor="pointer" onClick={() => navigate(`/admin/orders/${o.id}`)}>{o.etsy_receipt_id || '-'}</Td>
                                    <Td fontSize="xs" fontFamily="mono" cursor="pointer" onClick={() => navigate(`/admin/orders/${o.id}`)}>{o.token}</Td>
                                    <Td cursor="pointer" onClick={() => navigate(`/admin/orders/${o.id}`)}>{o.etsy_buyer_name || '-'}</Td>
                                    <Td cursor="pointer" onClick={() => navigate(`/admin/orders/${o.id}`)}>
                                        <Badge colorScheme={o.listing_type === 'print' ? 'purple' : 'blue'} fontSize="xs">
                                            {o.listing_type}
                                        </Badge>
                                    </Td>
                                    <Td cursor="pointer" onClick={() => navigate(`/admin/orders/${o.id}`)}>
                                        <Badge colorScheme={STATUS_COLORS[o.status] || 'gray'} fontSize="xs">
                                            {o.status}
                                        </Badge>
                                    </Td>
                                    <Td fontSize="xs" cursor="pointer" onClick={() => navigate(`/admin/orders/${o.id}`)}>{formatDate(o.created_at)}</Td>
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
