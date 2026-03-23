import React, { useEffect, useState, useRef } from 'react';
import {
    Box, Heading, Text, VStack, HStack, Button, Badge, Spinner,
    Table, Thead, Tbody, Tr, Th, Td, Tabs, TabList, Tab, TabPanels, TabPanel,
    Input, FormLabel,
} from '@chakra-ui/react';
import { getAssets, uploadAsset, deleteAsset } from './adminApi';

const TYPE_LABELS: Record<string, string> = {
    font: 'Font',
    svg_shape: 'SVG Shape',
    image: 'Image',
};

const ACCEPT: Record<string, string> = {
    font: '.woff2,.woff,.ttf,.otf',
    svg_shape: '.svg',
    image: '.png,.jpg,.jpeg,.webp',
};

const AssetTab: React.FC<{ type: string }> = ({ type }) => {
    const [assets, setAssets] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [uploading, setUploading] = useState(false);
    const [uploadName, setUploadName] = useState('');
    const fileRef = useRef<HTMLInputElement>(null);
    const [deleting, setDeleting] = useState<string | null>(null);

    const fetchData = async () => {
        setLoading(true);
        const data = await getAssets(type);
        setAssets(data || []);
        setLoading(false);
    };

    useEffect(() => { fetchData(); }, [type]);

    const handleUpload = async () => {
        const file = fileRef.current?.files?.[0];
        if (!file) { alert('Select a file first'); return; }
        if (!uploadName.trim()) { alert('Enter a display name'); return; }

        setUploading(true);
        try {
            // Read file as base64
            const reader = new FileReader();
            reader.onload = async (e) => {
                const base64 = (e.target?.result as string)?.split(',')[1];
                await uploadAsset({
                    type,
                    name: uploadName.trim(),
                    filename: file.name,
                    data: base64,
                });
                setUploadName('');
                if (fileRef.current) fileRef.current.value = '';
                await fetchData();
                setUploading(false);
            };
            reader.readAsDataURL(file);
        } catch (err) {
            alert('Upload failed: ' + (err instanceof Error ? err.message : String(err)));
            setUploading(false);
        }
    };

    const handleDelete = async (id: string, name: string) => {
        if (!confirm(`Delete "${name}"?`)) return;
        setDeleting(id);
        await deleteAsset(id);
        await fetchData();
        setDeleting(null);
    };

    return (
        <VStack align="stretch" spacing={4}>
            {/* Upload */}
            <Box bg="gray.50" p={4} borderRadius="md" border="1px" borderColor="gray.200">
                <Text fontSize="sm" fontWeight="600" mb={3}>Upload {TYPE_LABELS[type]}</Text>
                <HStack spacing={3} wrap="wrap">
                    <Box>
                        <FormLabel fontSize="xs" color="gray.600" mb={1}>Display Name</FormLabel>
                        <Input size="sm" placeholder="e.g. Bebas Neue" value={uploadName}
                            onChange={e => setUploadName(e.target.value)} w="200px" />
                    </Box>
                    <Box>
                        <FormLabel fontSize="xs" color="gray.600" mb={1}>File</FormLabel>
                        <Input size="sm" type="file" accept={ACCEPT[type]} ref={fileRef} w="250px" p={1} />
                    </Box>
                    <Box pt={6}>
                        <Button size="sm" onClick={handleUpload} isLoading={uploading}
                            bg="gray.900" color="white" _hover={{ bg: 'gray.700' }}>
                            Upload
                        </Button>
                    </Box>
                </HStack>
            </Box>

            {/* List */}
            {loading ? (
                <Box textAlign="center" py={6}><Spinner /></Box>
            ) : assets.length === 0 ? (
                <Text fontSize="sm" color="gray.500" textAlign="center" py={6}>
                    No {TYPE_LABELS[type].toLowerCase()}s uploaded yet
                </Text>
            ) : (
                <Box bg="white" borderRadius="lg" border="1px" borderColor="gray.200" overflow="hidden">
                    <Table size="sm">
                        <Thead>
                            <Tr>
                                <Th>Name</Th>
                                <Th>Filename</Th>
                                {type === 'font' && <Th>Preview</Th>}
                                <Th>Uploaded</Th>
                                <Th>Action</Th>
                            </Tr>
                        </Thead>
                        <Tbody>
                            {assets.map((a: any) => (
                                <Tr key={a.id}>
                                    <Td fontWeight="500">{a.name}</Td>
                                    <Td fontSize="xs" fontFamily="mono">{a.filename}</Td>
                                    {type === 'font' && (
                                        <Td>
                                            <Text
                                                fontSize="md"
                                                style={{ fontFamily: a.name }}
                                            >
                                                AaBbCc 123
                                            </Text>
                                        </Td>
                                    )}
                                    <Td fontSize="xs">
                                        {new Date(a.created_at * 1000).toLocaleDateString('en-AU')}
                                    </Td>
                                    <Td>
                                        <Button size="xs" variant="ghost" color="red.500"
                                            isLoading={deleting === a.id}
                                            onClick={() => handleDelete(a.id, a.name)}>
                                            Delete
                                        </Button>
                                    </Td>
                                </Tr>
                            ))}
                        </Tbody>
                    </Table>
                </Box>
            )}
        </VStack>
    );
};

const AssetsPage: React.FC = () => {
    return (
        <VStack align="stretch" spacing={4} maxW="900px">
            <Heading size="md" color="gray.800">Assets</Heading>
            <Text fontSize="sm" color="gray.600">
                Upload fonts, SVG shapes, and images to use in templates.
            </Text>

            <Box bg="white" borderRadius="lg" border="1px" borderColor="gray.200" overflow="hidden">
                <Tabs>
                    <TabList px={4} pt={2}>
                        <Tab fontSize="sm">Fonts</Tab>
                        <Tab fontSize="sm">SVG Shapes</Tab>
                        <Tab fontSize="sm">Images</Tab>
                    </TabList>
                    <TabPanels>
                        <TabPanel><AssetTab type="font" /></TabPanel>
                        <TabPanel><AssetTab type="svg_shape" /></TabPanel>
                        <TabPanel><AssetTab type="image" /></TabPanel>
                    </TabPanels>
                </Tabs>
            </Box>

            <Box bg="blue.50" p={4} borderRadius="lg" border="1px" borderColor="blue.200">
                <Text fontSize="xs" color="blue.700" fontWeight="600" mb={1}>About uploaded fonts</Text>
                <Text fontSize="xs" color="blue.600">
                    Uploaded fonts are served at <Text as="span" fontFamily="mono">/api/assets/:id/file</Text>.
                    To use them in templates, add the font name to the font selector lists in SidebarControls.tsx.
                    Future versions will load these dynamically.
                </Text>
            </Box>
        </VStack>
    );
};

export default AssetsPage;
