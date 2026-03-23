import React, { useEffect, useState } from 'react';
import { Box, Heading, SimpleGrid, Text, VStack, Spinner, Badge } from '@chakra-ui/react';
import { useNavigate } from 'react-router-dom';
import { getOrderStats } from './adminApi';

interface Stats {
    total: number;
    today: number;
    thisWeek: number;
    pending: number;
    byStatus: { status: string; count: number }[];
}

const StatCard: React.FC<{ label: string; value: number | string; color?: string; onClick?: () => void }> = ({ label, value, color = 'gray.900', onClick }) => (
    <Box
        bg="white" p={5} borderRadius="lg" border="1px" borderColor="gray.200"
        cursor={onClick ? 'pointer' : 'default'}
        onClick={onClick}
        _hover={onClick ? { borderColor: 'gray.400' } : {}}
        transition="all 0.1s"
    >
        <Text fontSize="xs" fontWeight="600" color="gray.500" textTransform="uppercase" mb={1}>
            {label}
        </Text>
        <Text fontSize="2xl" fontWeight="700" color={color}>{value}</Text>
    </Box>
);

const STATUS_COLORS: Record<string, string> = {
    pending: 'yellow', pending_manual: 'orange', rendering: 'blue',
    rendered: 'cyan', sent: 'green', fulfilled: 'green', failed: 'red', refunded: 'gray',
};

const DashboardPage: React.FC = () => {
    const [stats, setStats] = useState<Stats | null>(null);
    const [loading, setLoading] = useState(true);
    const navigate = useNavigate();

    useEffect(() => {
        getOrderStats().then(setStats).finally(() => setLoading(false));
    }, []);

    if (loading) return <Box p={8} textAlign="center"><Spinner /></Box>;
    if (!stats) return <Text>Failed to load stats</Text>;

    return (
        <VStack align="stretch" spacing={6} maxW="900px">
            <Heading size="md" color="gray.800">Dashboard</Heading>

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

            <Box bg="white" p={5} borderRadius="lg" border="1px" borderColor="gray.200">
                <Text fontSize="sm" fontWeight="600" color="gray.700" mb={3}>Orders by Status</Text>
                <SimpleGrid columns={{ base: 2, md: 4 }} spacing={2}>
                    {stats.byStatus.map(s => (
                        <Box key={s.status} display="flex" alignItems="center" gap={2}>
                            <Badge colorScheme={STATUS_COLORS[s.status] || 'gray'} fontSize="xs">
                                {s.status}
                            </Badge>
                            <Text fontSize="sm" fontWeight="600">{s.count}</Text>
                        </Box>
                    ))}
                </SimpleGrid>
            </Box>
        </VStack>
    );
};

export default DashboardPage;
