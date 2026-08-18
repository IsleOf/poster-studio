import React, { useEffect, useState } from 'react';
import {
    Box, Heading, Text, VStack, HStack, Button, Spinner, SimpleGrid,
    Table, Thead, Tbody, Tr, Th, Td, Badge, Link, Tooltip,
} from '@chakra-ui/react';

const API = import.meta.env.VITE_API_URL || '';

type Range = '7d' | '30d' | '90d' | 'all';

interface Activity {
    token: string;
    created_at: number;
    email: string | null;
    order_id: number | null;
    order_status: string | null;
    order_receipt: string | null;
    posterType: string | null;
    maskShape: string | null;
    title: string | null;
    location: string | null;
    printSize: string | null;
    orderType: string | null;
}

interface DemoActivityResponse {
    activity: Activity[];
    summary: { total: number; withEmail: number; withOrder: number; unconverted: number };
    range: string;
    caveat: string;
}

const RANGES: { label: string; value: Range }[] = [
    { label: '7d', value: '7d' },
    { label: '30d', value: '30d' },
    { label: '90d', value: '90d' },
    { label: 'All', value: 'all' },
];

function formatDate(ts: number): string {
    return new Date(ts * 1000).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}

function describeDesign(a: Activity): string {
    const parts: string[] = [];
    if (a.posterType) parts.push(a.posterType.replace('map', ' map'));
    if (a.maskShape && a.maskShape !== 'rect') parts.push(a.maskShape);
    if (a.location) parts.push(`— ${a.location}`);
    return parts.length ? parts.join(' ') : '(untitled)';
}

const LeadsPage: React.FC = () => {
    const [data, setData] = useState<DemoActivityResponse | null>(null);
    const [loading, setLoading] = useState(true);
    const [range, setRange] = useState<Range>('30d');
    const [onlyUnconverted, setOnlyUnconverted] = useState(false);

    const token = localStorage.getItem('admin_token');

    useEffect(() => {
        setLoading(true);
        fetch(`${API}/api/admin/demo-activity?range=${range}`, {
            headers: token ? { Authorization: `Bearer ${token}` } : {},
        })
            .then(r => {
                if (r.status === 401) { localStorage.removeItem('admin_token'); window.location.replace('/admin/login'); throw new Error('Unauthorized'); }
                if (!r.ok) throw new Error(`HTTP ${r.status}`);
                return r.json();
            })
            .then(setData)
            .catch(() => setData(null))
            .finally(() => setLoading(false));
    }, [range, token]);

    const rows = data ? (onlyUnconverted ? data.activity.filter(a => !a.order_id) : data.activity) : [];

    return (
        <VStack align="stretch" spacing={6} maxW="1100px">
            <HStack justify="space-between" flexWrap="wrap" gap={2}>
                <Box>
                    <Heading size="md" color="gray.800">Leads &amp; Demo Activity</Heading>
                    <Text fontSize="xs" color="gray.500" mt={1}>
                        Every design a visitor saved (via Share or the order flow) — what they were building, whether they left an email, whether they bought.
                    </Text>
                </Box>
                <HStack spacing={1}>
                    {RANGES.map(r => (
                        <Button key={r.value} size="xs"
                            variant={range === r.value ? 'solid' : 'ghost'}
                            bg={range === r.value ? 'gray.900' : undefined}
                            color={range === r.value ? 'white' : 'gray.600'}
                            _hover={{ bg: range === r.value ? 'gray.700' : 'gray.100' }}
                            onClick={() => setRange(r.value)}>
                            {r.label}
                        </Button>
                    ))}
                </HStack>
            </HStack>

            {loading ? (
                <Box textAlign="center" py={12}><Spinner /></Box>
            ) : !data ? (
                <Text color="gray.500">Failed to load.</Text>
            ) : (
                <>
                    <Box bg="orange.50" border="1px" borderColor="orange.200" borderRadius="md" px={4} py={3}>
                        <Text fontSize="xs" color="orange.800">{data.caveat}</Text>
                    </Box>

                    <SimpleGrid columns={{ base: 2, md: 4 }} spacing={4}>
                        <Stat label="Designs saved" value={data.summary.total} />
                        <Stat label="Left an email" value={data.summary.withEmail} />
                        <Stat label="Went on to order" value={data.summary.withOrder} />
                        <Stat label="Saved, no order" value={data.summary.unconverted} accent />
                    </SimpleGrid>

                    <HStack>
                        <Button size="xs"
                            variant={onlyUnconverted ? 'solid' : 'outline'}
                            colorScheme={onlyUnconverted ? 'orange' : 'gray'}
                            onClick={() => setOnlyUnconverted(v => !v)}>
                            {onlyUnconverted ? 'Showing: saved but never ordered' : 'Show only: saved but never ordered'}
                        </Button>
                    </HStack>

                    <Box bg="white" borderRadius="lg" border="1px" borderColor="gray.200" overflowX="auto">
                        <Table size="sm">
                            <Thead>
                                <Tr>
                                    <Th>Date</Th>
                                    <Th>What they were building</Th>
                                    <Th>Size</Th>
                                    <Th>Email</Th>
                                    <Th>Outcome</Th>
                                    <Th>Design</Th>
                                </Tr>
                            </Thead>
                            <Tbody>
                                {rows.map(a => (
                                    <Tr key={a.token}>
                                        <Td whiteSpace="nowrap" fontSize="xs" color="gray.500">{formatDate(a.created_at)}</Td>
                                        <Td>
                                            <Text fontSize="sm">{describeDesign(a)}</Text>
                                            {a.title && <Text fontSize="xs" color="gray.500" fontStyle="italic">"{a.title}"</Text>}
                                        </Td>
                                        <Td fontSize="xs" color="gray.600">{a.printSize || '—'}</Td>
                                        <Td fontSize="xs">{a.email || <Text as="span" color="gray.400">—</Text>}</Td>
                                        <Td>
                                            {a.order_id ? (
                                                <Tooltip label={`Receipt ${a.order_receipt || a.order_id}`}>
                                                    <Badge colorScheme="green">{a.order_status || 'ordered'}</Badge>
                                                </Tooltip>
                                            ) : (
                                                <Badge colorScheme="gray" variant="subtle">no order yet</Badge>
                                            )}
                                        </Td>
                                        <Td>
                                            <Link href={`/d/${a.token}`} isExternal color="blue.600" fontSize="xs">
                                                open ↗
                                            </Link>
                                        </Td>
                                    </Tr>
                                ))}
                                {rows.length === 0 && (
                                    <Tr><Td colSpan={6}><Text color="gray.400" fontSize="sm" py={6} textAlign="center">Nothing in this range.</Text></Td></Tr>
                                )}
                            </Tbody>
                        </Table>
                    </Box>
                </>
            )}
        </VStack>
    );
};

const Stat: React.FC<{ label: string; value: number; accent?: boolean }> = ({ label, value, accent }) => (
    <Box bg="white" p={4} borderRadius="lg" border="1px" borderColor={accent ? 'orange.200' : 'gray.200'}>
        <Text fontSize="xs" color="gray.500" textTransform="uppercase" letterSpacing="0.05em" mb={1}>{label}</Text>
        <Text fontSize="2xl" fontWeight="700" color={accent ? 'orange.600' : 'gray.900'}>{value.toLocaleString()}</Text>
    </Box>
);

export default LeadsPage;
