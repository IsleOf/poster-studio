import React, { useEffect, useState } from 'react';
import { Box, Heading, Text, VStack, HStack, Button, Spinner, SimpleGrid, Table, Thead, Tbody, Tr, Th, Td } from '@chakra-ui/react';

const API = import.meta.env.VITE_API_URL || '';

type Range = '7d' | '30d' | '90d';

interface AnalyticsData {
    byEvent: { name: string; count: number }[];
    daily: { day: string; total: number }[];
    topTemplates: { templateId?: string; count: number }[];
    topCities: { city?: string; country?: string; count: number }[];
    range: string;
}

const RANGES: { label: string; value: Range }[] = [
    { label: '7d', value: '7d' },
    { label: '30d', value: '30d' },
    { label: '90d', value: '90d' },
];

const AnalyticsPage: React.FC = () => {
    const [data, setData] = useState<AnalyticsData | null>(null);
    const [loading, setLoading] = useState(true);
    const [range, setRange] = useState<Range>('30d');

    const token = localStorage.getItem('admin_token');

    useEffect(() => {
        setLoading(true);
        fetch(`${API}/api/admin/analytics?range=${range}`, {
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

    return (
        <VStack align="stretch" spacing={6} maxW="900px">
            <HStack justify="space-between" flexWrap="wrap" gap={2}>
                <Heading size="md" color="gray.800">Analytics</Heading>
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
                <Text color="gray.500">Failed to load analytics.</Text>
            ) : (
                <>
                    {/* Event counts */}
                    <SimpleGrid columns={{ base: 2, md: 3 }} spacing={4}>
                        {data.byEvent.map(e => (
                            <Box key={e.name} bg="white" p={4} borderRadius="lg" border="1px" borderColor="gray.200">
                                <Text fontSize="xs" color="gray.500" textTransform="uppercase" letterSpacing="0.05em" mb={1}>
                                    {e.name.replace(/_/g, ' ')}
                                </Text>
                                <Text fontSize="2xl" fontWeight="700">{e.count.toLocaleString()}</Text>
                            </Box>
                        ))}
                    </SimpleGrid>

                    {/* Daily chart */}
                    {data.daily.length > 0 && (
                        <Box bg="white" p={5} borderRadius="lg" border="1px" borderColor="gray.200">
                            <Text fontSize="sm" fontWeight="600" color="gray.700" mb={4}>Daily Events</Text>
                            <DailyChart data={data.daily} />
                        </Box>
                    )}

                    <SimpleGrid columns={{ base: 1, md: 2 }} spacing={4}>
                        {/* Top templates */}
                        {data.topTemplates.length > 0 && (
                            <Box bg="white" p={5} borderRadius="lg" border="1px" borderColor="gray.200">
                                <Text fontSize="sm" fontWeight="600" color="gray.700" mb={3}>Top Templates Loaded</Text>
                                <Table size="sm">
                                    <Thead><Tr><Th>Template</Th><Th isNumeric>Count</Th></Tr></Thead>
                                    <Tbody>
                                        {data.topTemplates.map((t, i) => (
                                            <Tr key={i}>
                                                <Td fontFamily="mono" fontSize="xs">{(t as any).templateId || '—'}</Td>
                                                <Td isNumeric fontWeight="600">{t.count}</Td>
                                            </Tr>
                                        ))}
                                    </Tbody>
                                </Table>
                            </Box>
                        )}

                        {/* Top cities */}
                        {data.topCities.length > 0 && (
                            <Box bg="white" p={5} borderRadius="lg" border="1px" borderColor="gray.200">
                                <Text fontSize="sm" fontWeight="600" color="gray.700" mb={3}>Top Cities Searched</Text>
                                <Table size="sm">
                                    <Thead><Tr><Th>City</Th><Th>Country</Th><Th isNumeric>Count</Th></Tr></Thead>
                                    <Tbody>
                                        {data.topCities.map((c, i) => (
                                            <Tr key={i}>
                                                <Td>{(c as any).city || '—'}</Td>
                                                <Td color="gray.500" fontSize="xs">{(c as any).country || ''}</Td>
                                                <Td isNumeric fontWeight="600">{c.count}</Td>
                                            </Tr>
                                        ))}
                                    </Tbody>
                                </Table>
                            </Box>
                        )}
                    </SimpleGrid>
                </>
            )}
        </VStack>
    );
};

const DailyChart: React.FC<{ data: { day: string; total: number }[] }> = ({ data }) => {
    const max = Math.max(...data.map(d => d.total), 1);
    const W = 600, H = 80, barW = Math.max(4, Math.floor(W / data.length) - 2);
    return (
        <Box overflowX="auto">
            <svg width="100%" viewBox={`0 0 ${W} ${H + 20}`} style={{ minWidth: '280px' }}>
                {data.map((d, i) => {
                    const barH = Math.max(2, Math.round((d.total / max) * H));
                    const x = (i / data.length) * W;
                    return (
                        <g key={d.day}>
                            <title>{d.day}: {d.total}</title>
                            <rect x={x} y={H - barH} width={barW} height={barH} rx={1} fill="#63B3ED" />
                        </g>
                    );
                })}
                {/* x-axis labels for first and last */}
                {data.length > 0 && (
                    <>
                        <text x={0} y={H + 16} fontSize={10} fill="#888">{data[0].day.slice(5)}</text>
                        <text x={W - 30} y={H + 16} fontSize={10} fill="#888">{data[data.length - 1].day.slice(5)}</text>
                    </>
                )}
            </svg>
        </Box>
    );
};

export default AnalyticsPage;
