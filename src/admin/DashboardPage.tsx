import React, { useEffect, useState } from 'react';
import { Box, Heading, SimpleGrid, Text, VStack, Spinner, Badge, HStack, Button } from '@chakra-ui/react';
import { useNavigate } from 'react-router-dom';
import { getOrderStats } from './adminApi';

type Range = '7d' | '30d' | '90d' | 'all';

interface WeekDay { day: string; orders: number; cents?: number; }
interface Revenue { totalCents: number; digitalCents: number; printCents: number; weeklyTrend: WeekDay[]; }
interface Funnel { designsCreated: number; ordersPlaced: number; ordersFulfilled: number; }
interface Stats {
    total: number;
    today: number;
    thisWeek: number;
    pending: number;
    byStatus: { status: string; count: number }[];
    revenue?: Revenue;
    avgProcessingSeconds?: number | null;
    fulfillmentRatePct?: number | null;
    funnel?: Funnel;
    range?: string;
}

const fmt = (cents: number) => `$${(cents / 100).toFixed(2)}`;

const fmtDuration = (seconds: number | null | undefined) => {
    if (!seconds) return '—';
    if (seconds < 3600) return `${Math.round(seconds / 60)}m`;
    if (seconds < 86400) return `${Math.round(seconds / 3600)}h`;
    return `${(seconds / 86400).toFixed(1)}d`;
};

const StatCard: React.FC<{ label: string; value: number | string; color?: string; onClick?: () => void }> = ({ label, value, color = 'gray.900', onClick }) => (
    <Box
        bg="white" p={5} borderRadius="lg" border="1px" borderColor="gray.200"
        cursor={onClick ? 'pointer' : 'default'}
        onClick={onClick}
        _hover={onClick ? { borderColor: 'gray.400' } : {}}
        transition="all 0.1s"
    >
        <Text fontSize="xs" fontWeight="600" color="gray.500" textTransform="uppercase" mb={1}>{label}</Text>
        <Text fontSize="2xl" fontWeight="700" color={color}>{value}</Text>
    </Box>
);

const Sparkline: React.FC<{ data: WeekDay[] }> = ({ data }) => {
    if (!data.length) return null;
    const W = 180, H = 40, BAR = 16, GAP = 6;
    const max = Math.max(...data.map(d => d.orders), 1);
    return (
        <svg width={W} height={H} style={{ display: 'block' }}>
            {data.map((d, i) => {
                const barH = Math.max(3, Math.round((d.orders / max) * (H - 8)));
                return (
                    <g key={d.day}>
                        <title>{d.day}: {d.orders} order{d.orders !== 1 ? 's' : ''}</title>
                        <rect x={i * (BAR + GAP)} y={H - barH} width={BAR} height={barH} rx={2}
                            fill={d.orders > 0 ? '#48BB78' : '#E2E8F0'} />
                    </g>
                );
            })}
        </svg>
    );
};

const FunnelBar: React.FC<{ label: string; value: number; max: number; color: string }> = ({ label, value, max, color }) => {
    const pct = max > 0 ? Math.round((value / max) * 100) : 0;
    return (
        <Box>
            <HStack justify="space-between" mb={1}>
                <Text fontSize="xs" color="gray.600">{label}</Text>
                <Text fontSize="xs" fontWeight="700">{value} <Text as="span" color="gray.400">({pct}%)</Text></Text>
            </HStack>
            <Box bg="gray.100" borderRadius="full" h="8px" overflow="hidden">
                <Box bg={color} h="8px" borderRadius="full" w={`${pct}%`} transition="width 0.4s" />
            </Box>
        </Box>
    );
};

const STATUS_COLORS: Record<string, string> = {
    pending: 'yellow', pending_manual: 'orange', rendering: 'blue',
    rendered: 'cyan', sent: 'green', fulfilled: 'green', shipped: 'teal', failed: 'red', refunded: 'gray',
};

const RANGES: { label: string; value: Range }[] = [
    { label: '7d', value: '7d' },
    { label: '30d', value: '30d' },
    { label: '90d', value: '90d' },
    { label: 'All time', value: 'all' },
];

const DashboardPage: React.FC = () => {
    const [stats, setStats] = useState<Stats | null>(null);
    const [loading, setLoading] = useState(true);
    const [range, setRange] = useState<Range>('all');
    const navigate = useNavigate();

    useEffect(() => {
        setLoading(true);
        getOrderStats({ range })
            .then(setStats)
            .catch(() => setStats(null))
            .finally(() => setLoading(false));
    }, [range]);

    const rev = stats?.revenue;
    const funnel = stats?.funnel;

    return (
        <VStack align="stretch" spacing={6} maxW="900px">
            <HStack justify="space-between" flexWrap="wrap" gap={2}>
                <Heading size="md" color="gray.800">Dashboard</Heading>
                <HStack spacing={1}>
                    {RANGES.map(r => (
                        <Button
                            key={r.value}
                            size="xs"
                            variant={range === r.value ? 'solid' : 'ghost'}
                            bg={range === r.value ? 'gray.900' : undefined}
                            color={range === r.value ? 'white' : 'gray.600'}
                            _hover={{ bg: range === r.value ? 'gray.700' : 'gray.100' }}
                            onClick={() => setRange(r.value)}
                        >
                            {r.label}
                        </Button>
                    ))}
                </HStack>
            </HStack>

            {loading ? (
                <Box textAlign="center" py={12}><Spinner /></Box>
            ) : !stats ? (
                <Text>Failed to load stats</Text>
            ) : (
                <>
                    {/* Order counts */}
                    <SimpleGrid columns={{ base: 2, md: 4 }} spacing={4}>
                        <StatCard label="Total Orders" value={stats.total} onClick={() => navigate('/admin/orders')} />
                        <StatCard label="Today" value={stats.today} />
                        <StatCard label="This Week" value={stats.thisWeek} />
                        <StatCard
                            label="Pending Action"
                            value={stats.pending}
                            color={stats.pending > 0 ? 'orange.500' : 'gray.900'}
                            onClick={() => navigate('/admin/orders?status=pending')}
                        />
                    </SimpleGrid>

                    {/* Revenue + sparkline */}
                    {rev && (
                        <Box bg="white" p={5} borderRadius="lg" border="1px" borderColor="gray.200">
                            <Text fontSize="sm" fontWeight="600" color="gray.700" mb={4}>Revenue (fulfilled orders)</Text>
                            <SimpleGrid columns={{ base: 1, md: 3 }} spacing={4} mb={4}>
                                <Box>
                                    <Text fontSize="xs" color="gray.500" mb={1}>Total</Text>
                                    <Text fontSize="xl" fontWeight="700" color="green.600">{fmt(rev.totalCents)}</Text>
                                </Box>
                                <Box>
                                    <Text fontSize="xs" color="gray.500" mb={1}>Digital</Text>
                                    <Text fontSize="xl" fontWeight="700">{fmt(rev.digitalCents)}</Text>
                                </Box>
                                <Box>
                                    <Text fontSize="xs" color="gray.500" mb={1}>Print</Text>
                                    <Text fontSize="xl" fontWeight="700">{fmt(rev.printCents)}</Text>
                                </Box>
                            </SimpleGrid>
                            {rev.weeklyTrend.length > 0 && (
                                <Box>
                                    <Text fontSize="xs" color="gray.400" mb={2}>Order trend</Text>
                                    <Sparkline data={rev.weeklyTrend} />
                                </Box>
                            )}
                        </Box>
                    )}

                    {/* Conversion funnel */}
                    {funnel && (
                        <Box bg="white" p={5} borderRadius="lg" border="1px" borderColor="gray.200">
                            <Text fontSize="sm" fontWeight="600" color="gray.700" mb={4}>Conversion Funnel</Text>
                            <VStack align="stretch" spacing={3}>
                                <FunnelBar label="Designs created" value={funnel.designsCreated} max={funnel.designsCreated} color="#63B3ED" />
                                <FunnelBar label="Orders placed" value={funnel.ordersPlaced} max={funnel.designsCreated} color="#68D391" />
                                <FunnelBar label="Orders fulfilled" value={funnel.ordersFulfilled} max={funnel.designsCreated} color="#48BB78" />
                            </VStack>
                            {funnel.designsCreated > 0 && (
                                <Text fontSize="xs" color="gray.400" mt={3}>
                                    {Math.round((funnel.ordersPlaced / funnel.designsCreated) * 100)}% of designs converted to orders
                                    {funnel.ordersPlaced > 0 && ` · ${Math.round((funnel.ordersFulfilled / funnel.ordersPlaced) * 100)}% fulfilled`}
                                </Text>
                            )}
                        </Box>
                    )}

                    {/* Quick stats */}
                    {(stats.avgProcessingSeconds !== undefined || stats.fulfillmentRatePct !== undefined) && (
                        <SimpleGrid columns={{ base: 2, md: 2 }} spacing={4}>
                            <StatCard label="Avg. Processing" value={fmtDuration(stats.avgProcessingSeconds)} />
                            <StatCard
                                label="Fulfillment Rate"
                                value={stats.fulfillmentRatePct != null ? `${stats.fulfillmentRatePct}%` : '—'}
                                color={stats.fulfillmentRatePct != null && stats.fulfillmentRatePct >= 90 ? 'green.500' : 'orange.500'}
                            />
                        </SimpleGrid>
                    )}

                    {/* Status breakdown */}
                    <Box bg="white" p={5} borderRadius="lg" border="1px" borderColor="gray.200">
                        <Text fontSize="sm" fontWeight="600" color="gray.700" mb={3}>Orders by Status</Text>
                        <SimpleGrid columns={{ base: 2, md: 4 }} spacing={2}>
                            {(stats.byStatus ?? []).map(s => (
                                <HStack key={s.status} spacing={2}
                                    cursor="pointer" onClick={() => navigate(`/admin/orders?status=${s.status}`)}
                                    _hover={{ opacity: 0.75 }}>
                                    <Badge colorScheme={STATUS_COLORS[s.status] || 'gray'} fontSize="xs">{s.status}</Badge>
                                    <Text fontSize="sm" fontWeight="600">{s.count}</Text>
                                </HStack>
                            ))}
                        </SimpleGrid>
                    </Box>
                </>
            )}
        </VStack>
    );
};

export default DashboardPage;
