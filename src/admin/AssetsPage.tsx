import React, { useEffect, useState, useRef } from 'react';
import {
    Box, Heading, Text, VStack, HStack, Button, Badge, Spinner,
    Table, Thead, Tbody, Tr, Th, Td, Tabs, TabList, Tab, TabPanels, TabPanel,
    Input, FormLabel, Checkbox, CheckboxGroup, Stack,
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

const FONT_ROLES = [
    { value: 'title', label: 'Title', hint: 'Large display text' },
    { value: 'subtitle', label: 'Subtitle', hint: 'Medium heading' },
    { value: 'details', label: 'Details', hint: 'Coordinates & date (small — readable only)' },
    { value: 'dedication', label: 'Dedication', hint: 'Tagline / quote' },
];

const AssetTab: React.FC<{ type: string }> = ({ type }) => {
    const [assets, setAssets] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [uploading, setUploading] = useState(false);
    const [uploadName, setUploadName] = useState('');
    const [fontRoles, setFontRoles] = useState<string[]>(['title', 'subtitle', 'details', 'dedication']);
    const fileRef = useRef<HTMLInputElement>(null);
    const [deleting, setDeleting] = useState<string | null>(null);

    const fetchData = async () => {
        setLoading(true);
        try {
            const data = await getAssets(type);
            setAssets(Array.isArray(data) ? data : []);
        } catch {
            setAssets([]);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchData(); }, [type]);

    const handleUpload = async () => {
        const file = fileRef.current?.files?.[0];
        if (!file) { alert('Select a file first'); return; }
        if (!uploadName.trim()) { alert('Enter a display name'); return; }
        if (type === 'font' && fontRoles.length === 0) { alert('Select at least one text role'); return; }

        setUploading(true);
        try {
            const reader = new FileReader();
            reader.onload = async (e) => {
                const base64 = (e.target?.result as string)?.split(',')[1];
                await uploadAsset({
                    type,
                    name: uploadName.trim(),
                    filename: file.name,
                    data: base64,
                    ...(type === 'font' ? { roles: fontRoles } : {}),
                });
                setUploadName('');
                setFontRoles(['title', 'subtitle', 'details', 'dedication']);
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
                <VStack align="stretch" spacing={3}>
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

                    {type === 'font' && (
                        <Box>
                            <FormLabel fontSize="xs" color="gray.600" mb={2}>
                                Show this font in which text slots?
                                <Text as="span" color="gray.400" fontWeight="400" ml={1}>
                                    (uncheck slots where this font would look wrong)
                                </Text>
                            </FormLabel>
                            <CheckboxGroup value={fontRoles} onChange={(vals) => setFontRoles(vals as string[])}>
                                <Stack direction="row" wrap="wrap" spacing={4}>
                                    {FONT_ROLES.map(r => (
                                        <Checkbox key={r.value} value={r.value} size="sm">
                                            <Text fontSize="xs" fontWeight="600">{r.label}</Text>
                                            <Text fontSize="xs" color="gray.400">{r.hint}</Text>
                                        </Checkbox>
                                    ))}
                                </Stack>
                            </CheckboxGroup>
                        </Box>
                    )}
                </VStack>
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
                                {type === 'font' && <Th>Roles</Th>}
                                <Th>Uploaded</Th>
                                <Th>Action</Th>
                            </Tr>
                        </Thead>
                        <Tbody>
                            {assets.map((a: any) => {
                                const roles: string[] = a.metadata?.roles || ['title', 'subtitle', 'details', 'dedication'];
                                return (
                                    <Tr key={a.id}>
                                        <Td fontWeight="500">{a.name}</Td>
                                        <Td fontSize="xs" fontFamily="mono">{a.filename}</Td>
                                        {type === 'font' && (
                                            <Td>
                                                <Text fontSize="md" style={{ fontFamily: a.name }}>
                                                    AaBbCc 123
                                                </Text>
                                            </Td>
                                        )}
                                        {type === 'font' && (
                                            <Td>
                                                <HStack spacing={1} wrap="wrap">
                                                    {FONT_ROLES.map(r => (
                                                        <Badge
                                                            key={r.value}
                                                            fontSize="2xs"
                                                            colorScheme={roles.includes(r.value) ? 'blue' : 'gray'}
                                                            opacity={roles.includes(r.value) ? 1 : 0.35}
                                                        >
                                                            {r.label}
                                                        </Badge>
                                                    ))}
                                                </HStack>
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
                                );
                            })}
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
                    Uploaded fonts are automatically available in the designer's font pickers — no code changes needed.
                    Use the role checkboxes to control which text slots they appear in.
                    Calligraphy fonts should be unchecked for <Text as="span" fontFamily="mono">Details</Text> (coordinates are tiny and need clean legible fonts).
                </Text>
            </Box>
        </VStack>
    );
};

export default AssetsPage;
