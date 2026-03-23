import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    Box, Heading, Text, VStack, HStack, Table, Thead, Tbody, Tr, Th, Td,
    Badge, Button, Spinner, IconButton,
} from '@chakra-ui/react';
import { getTemplates, deleteTemplate } from './adminApi';

const TemplatesPage: React.FC = () => {
    const [templates, setTemplates] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const navigate = useNavigate();

    const fetchData = async () => {
        setLoading(true);
        const data = await getTemplates();
        setTemplates(data);
        setLoading(false);
    };

    useEffect(() => { fetchData(); }, []);

    const handleDelete = async (id: string) => {
        if (!confirm(`Deactivate template "${id}"?`)) return;
        await deleteTemplate(id);
        fetchData();
    };

    const APP_URL = window.location.origin;

    return (
        <VStack align="stretch" spacing={4} maxW="1000px">
            <HStack justify="space-between">
                <Heading size="md" color="gray.800">Templates</Heading>
                <Button size="sm" bg="gray.900" color="white" _hover={{ bg: 'gray.700' }}
                    onClick={() => navigate('/admin/templates/new')}>
                    New Template
                </Button>
            </HStack>

            <Box bg="white" borderRadius="lg" border="1px" borderColor="gray.200" overflow="hidden">
                {loading ? (
                    <Box p={8} textAlign="center"><Spinner /></Box>
                ) : templates.length === 0 ? (
                    <Box p={8} textAlign="center"><Text color="gray.500">No templates</Text></Box>
                ) : (
                    <Table size="sm">
                        <Thead>
                            <Tr>
                                <Th>ID</Th>
                                <Th>Name</Th>
                                <Th>Mode</Th>
                                <Th>Shape</Th>
                                <Th>Etsy Listing</Th>
                                <Th>Active</Th>
                                <Th>URL</Th>
                                <Th>Actions</Th>
                            </Tr>
                        </Thead>
                        <Tbody>
                            {templates.map(t => (
                                <Tr key={t.id}>
                                    <Td fontFamily="mono" fontSize="xs">{t.id}</Td>
                                    <Td fontWeight="500">{t.name}</Td>
                                    <Td>
                                        <Badge fontSize="xs" colorScheme={
                                            t.settings?.posterType === 'starmap' ? 'purple' :
                                            t.settings?.posterType === 'coloredmap' ? 'green' : 'blue'
                                        }>
                                            {t.settings?.posterType || '-'}
                                        </Badge>
                                    </Td>
                                    <Td fontSize="xs">{t.settings?.maskShape || '-'}</Td>
                                    <Td fontSize="xs" fontFamily="mono">{t.etsy_listing_id || '-'}</Td>
                                    <Td>
                                        <Badge colorScheme={t.is_active ? 'green' : 'gray'} fontSize="xs">
                                            {t.is_active ? 'Active' : 'Inactive'}
                                        </Badge>
                                    </Td>
                                    <Td>
                                        <Text fontSize="xs" color="blue.500" cursor="pointer"
                                            onClick={() => window.open(`${APP_URL}/t/${t.id}`, '_blank')}>
                                            /t/{t.id}
                                        </Text>
                                    </Td>
                                    <Td>
                                        <HStack spacing={1}>
                                            <Button size="xs" variant="ghost" onClick={() => navigate(`/admin/templates/${t.id}/edit`)}>
                                                Edit
                                            </Button>
                                            <Button size="xs" variant="ghost" color="red.500" onClick={() => handleDelete(t.id)}>
                                                Delete
                                            </Button>
                                        </HStack>
                                    </Td>
                                </Tr>
                            ))}
                        </Tbody>
                    </Table>
                )}
            </Box>
        </VStack>
    );
};

export default TemplatesPage;
