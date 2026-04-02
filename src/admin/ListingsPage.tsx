import React, { useEffect, useState, useCallback } from 'react';
import {
    Box, Heading, Text, Button, VStack, HStack, Input, Textarea,
    Table, Thead, Tbody, Tr, Th, Td, Badge, IconButton,
    Modal, ModalOverlay, ModalContent, ModalHeader, ModalBody, ModalFooter, ModalCloseButton,
    FormControl, FormLabel, FormHelperText, useDisclosure, useToast,
    Spinner, Flex, Switch, Select,
} from '@chakra-ui/react';
import { adminFetchJson } from './adminApi';

interface Template {
    id: string;
    name: string;
    description?: string;
    thumbnail_path?: string;
}

interface Listing {
    id: number;
    slug: string;
    name: string;
    description?: string;
    banner_image?: string;
    is_active: number;
    created_at: number;
    template_count?: number;
    templates?: Template[];
}

const API = import.meta.env.VITE_API_URL || '';

const ListingsPage: React.FC = () => {
    const [listings, setListings] = useState<Listing[]>([]);
    const [loading, setLoading] = useState(true);
    const [editTarget, setEditTarget] = useState<Listing | null>(null);
    const [createMode, setCreateMode] = useState(false);
    const { isOpen: isFormOpen, onOpen: openForm, onClose: closeForm } = useDisclosure();
    const { isOpen: isTemplatesOpen, onOpen: openTemplates, onClose: closeTemplates } = useDisclosure();
    const [managingListing, setManagingListing] = useState<Listing | null>(null);
    const toast = useToast();

    const load = useCallback(async () => {
        setLoading(true);
        try {
            const data = await adminFetchJson('/api/admin/listings');
            setListings(data);
        } catch { /* ignore */ } finally { setLoading(false); }
    }, []);

    useEffect(() => { load(); }, [load]);

    const openCreate = () => { setEditTarget(null); setCreateMode(true); openForm(); };
    const openEdit = (l: Listing) => { setEditTarget(l); setCreateMode(false); openForm(); };
    const openManage = async (l: Listing) => {
        const detail = await adminFetchJson(`/api/admin/listings/${l.id}`);
        setManagingListing(detail);
        openTemplates();
    };

    const handleToggleActive = async (l: Listing) => {
        await adminFetchJson(`/api/admin/listings/${l.id}`, {
            method: 'PUT',
            body: JSON.stringify({ is_active: l.is_active ? 0 : 1 }),
        });
        load();
    };

    const handleDelete = async (l: Listing) => {
        if (!confirm(`Delete listing "${l.name}"? This cannot be undone.`)) return;
        await adminFetchJson(`/api/admin/listings/${l.id}`, { method: 'DELETE' });
        toast({ title: 'Listing deleted', status: 'info', duration: 2000 });
        load();
    };

    return (
        <Box>
            <HStack justify="space-between" mb={6}>
                <Box>
                    <Heading size="lg" fontWeight="700" color="gray.900">Listings</Heading>
                    <Text fontSize="sm" color="gray.500" mt={1}>
                        Each listing has a public URL and a set of templates customers can pick from.
                    </Text>
                </Box>
                <Button size="sm" bg="gray.900" color="white" _hover={{ bg: 'gray.700' }} onClick={openCreate}>
                    + New Listing
                </Button>
            </HStack>

            {loading ? (
                <Flex justify="center" py={20}><Spinner /></Flex>
            ) : listings.length === 0 ? (
                <Box textAlign="center" py={20} color="gray.400">
                    <Text mb={4}>No listings yet.</Text>
                    <Button variant="outline" onClick={openCreate}>Create your first listing</Button>
                </Box>
            ) : (
                <Box overflowX="auto" borderRadius="xl" border="1px" borderColor="gray.200" bg="white">
                    <Table size="sm">
                        <Thead bg="gray.50">
                            <Tr>
                                <Th>Name / Slug</Th>
                                <Th>Templates</Th>
                                <Th>Status</Th>
                                <Th>Public URL</Th>
                                <Th></Th>
                            </Tr>
                        </Thead>
                        <Tbody>
                            {listings.map(l => (
                                <Tr key={l.id} _hover={{ bg: 'gray.50' }}>
                                    <Td>
                                        <Text fontWeight="600" fontSize="sm" color="gray.900">{l.name}</Text>
                                        <Text fontSize="xs" color="gray.400" fontFamily="mono">/{l.slug}</Text>
                                    </Td>
                                    <Td>
                                        <Badge colorScheme="gray">{l.template_count ?? 0} templates</Badge>
                                    </Td>
                                    <Td>
                                        <Switch
                                            size="sm"
                                            isChecked={!!l.is_active}
                                            onChange={() => handleToggleActive(l)}
                                        />
                                    </Td>
                                    <Td>
                                        <Text
                                            as="a"
                                            href={`/l/${l.slug}`}
                                            target="_blank"
                                            fontSize="xs"
                                            color="blue.500"
                                            _hover={{ textDecoration: 'underline' }}
                                        >
                                            /l/{l.slug} ↗
                                        </Text>
                                    </Td>
                                    <Td>
                                        <HStack spacing={2} justify="flex-end">
                                            <Button size="xs" variant="outline" onClick={() => openManage(l)}>
                                                Templates
                                            </Button>
                                            <Button size="xs" variant="outline" onClick={() => openEdit(l)}>
                                                Edit
                                            </Button>
                                            <Button size="xs" colorScheme="red" variant="ghost" onClick={() => handleDelete(l)}>
                                                Delete
                                            </Button>
                                        </HStack>
                                    </Td>
                                </Tr>
                            ))}
                        </Tbody>
                    </Table>
                </Box>
            )}

            {/* Create / Edit form modal */}
            <ListingFormModal
                isOpen={isFormOpen}
                onClose={() => { closeForm(); load(); }}
                listing={createMode ? null : editTarget}
            />

            {/* Template management modal */}
            {managingListing && (
                <TemplateManagerModal
                    isOpen={isTemplatesOpen}
                    onClose={() => { closeTemplates(); load(); }}
                    listing={managingListing}
                    onRefresh={async () => {
                        const detail = await adminFetchJson(`/api/admin/listings/${managingListing.id}`);
                        setManagingListing(detail);
                    }}
                />
            )}
        </Box>
    );
};

// ── Create / Edit modal ──────────────────────────────────────────────────────

const ListingFormModal: React.FC<{
    isOpen: boolean;
    onClose: () => void;
    listing: Listing | null;
}> = ({ isOpen, onClose, listing }) => {
    const toast = useToast();
    const [name, setName] = useState('');
    const [slug, setSlug] = useState('');
    const [description, setDescription] = useState('');
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        if (isOpen) {
            setName(listing?.name ?? '');
            setSlug(listing?.slug ?? '');
            setDescription(listing?.description ?? '');
        }
    }, [isOpen, listing]);

    // Auto-generate slug from name when creating
    useEffect(() => {
        if (!listing && name) {
            setSlug(name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''));
        }
    }, [name, listing]);

    const handleSave = async () => {
        if (!name || !slug) { toast({ title: 'Name and slug are required', status: 'warning', duration: 2000 }); return; }
        setSaving(true);
        try {
            if (listing) {
                await adminFetchJson(`/api/admin/listings/${listing.id}`, {
                    method: 'PUT',
                    body: JSON.stringify({ name, slug, description }),
                });
                toast({ title: 'Listing updated', status: 'success', duration: 2000 });
            } else {
                await adminFetchJson('/api/admin/listings', {
                    method: 'POST',
                    body: JSON.stringify({ name, slug, description }),
                });
                toast({ title: 'Listing created', status: 'success', duration: 2000 });
            }
            onClose();
        } catch (err: any) {
            toast({ title: err.message || 'Save failed', status: 'error', duration: 3000 });
        } finally { setSaving(false); }
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} size="md">
            <ModalOverlay />
            <ModalContent>
                <ModalHeader>{listing ? 'Edit Listing' : 'New Listing'}</ModalHeader>
                <ModalCloseButton />
                <ModalBody>
                    <VStack spacing={4}>
                        <FormControl isRequired>
                            <FormLabel fontSize="sm">Name</FormLabel>
                            <Input value={name} onChange={e => setName(e.target.value)} placeholder="Wedding Heart Map" />
                        </FormControl>
                        <FormControl isRequired>
                            <FormLabel fontSize="sm">Slug (URL path)</FormLabel>
                            <Input
                                value={slug}
                                onChange={e => setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
                                placeholder="wedding-heart-map"
                                fontFamily="mono"
                            />
                            <FormHelperText fontSize="xs">
                                Public URL: <strong>/l/{slug || 'your-slug'}</strong>
                            </FormHelperText>
                        </FormControl>
                        <FormControl>
                            <FormLabel fontSize="sm">Description</FormLabel>
                            <Textarea
                                value={description}
                                onChange={e => setDescription(e.target.value)}
                                placeholder="A short description shown on the listing page"
                                rows={3}
                            />
                        </FormControl>
                    </VStack>
                </ModalBody>
                <ModalFooter gap={2}>
                    <Button variant="ghost" onClick={onClose}>Cancel</Button>
                    <Button bg="gray.900" color="white" _hover={{ bg: 'gray.700' }} isLoading={saving} onClick={handleSave}>
                        {listing ? 'Save changes' : 'Create listing'}
                    </Button>
                </ModalFooter>
            </ModalContent>
        </Modal>
    );
};

// ── Template manager modal ───────────────────────────────────────────────────

const TemplateManagerModal: React.FC<{
    isOpen: boolean;
    onClose: () => void;
    listing: Listing;
    onRefresh: () => Promise<void>;
}> = ({ isOpen, onClose, listing, onRefresh }) => {
    const toast = useToast();
    const [allTemplates, setAllTemplates] = useState<Template[]>([]);
    const [addingId, setAddingId] = useState('');

    useEffect(() => {
        if (isOpen) {
            adminFetchJson('/api/admin/templates').then(data => setAllTemplates(data)).catch(() => {});
        }
    }, [isOpen]);

    const assigned = (listing.templates ?? []) as Template[];
    const unassigned = allTemplates.filter(t => !assigned.find(a => a.id === t.id));

    const handleAdd = async () => {
        if (!addingId) return;
        try {
            await adminFetchJson(`/api/admin/listings/${listing.id}/templates`, {
                method: 'POST',
                body: JSON.stringify({ template_id: addingId }),
            });
            setAddingId('');
            await onRefresh();
        } catch (err: any) {
            toast({ title: err.message || 'Failed to add', status: 'error', duration: 2000 });
        }
    };

    const handleRemove = async (templateId: string) => {
        await adminFetchJson(`/api/admin/listings/${listing.id}/templates/${templateId}`, { method: 'DELETE' });
        await onRefresh();
    };

    const moveUp = async (idx: number) => {
        if (idx === 0) return;
        const newOrder = [...assigned];
        [newOrder[idx - 1], newOrder[idx]] = [newOrder[idx], newOrder[idx - 1]];
        await adminFetchJson(`/api/admin/listings/${listing.id}/templates/reorder`, {
            method: 'PUT',
            body: JSON.stringify({ order: newOrder.map(t => t.id) }),
        });
        await onRefresh();
    };

    const moveDown = async (idx: number) => {
        if (idx >= assigned.length - 1) return;
        const newOrder = [...assigned];
        [newOrder[idx], newOrder[idx + 1]] = [newOrder[idx + 1], newOrder[idx]];
        await adminFetchJson(`/api/admin/listings/${listing.id}/templates/reorder`, {
            method: 'PUT',
            body: JSON.stringify({ order: newOrder.map(t => t.id) }),
        });
        await onRefresh();
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} size="lg">
            <ModalOverlay />
            <ModalContent>
                <ModalHeader>
                    Templates for "{listing.name}"
                    <Text fontSize="sm" fontWeight="400" color="gray.500" mt={1}>
                        /l/{listing.slug}
                    </Text>
                </ModalHeader>
                <ModalCloseButton />
                <ModalBody>
                    <VStack spacing={5} align="stretch">
                        {/* Add template */}
                        <Box>
                            <Text fontSize="sm" fontWeight="600" mb={2}>Add template</Text>
                            <HStack>
                                <Select
                                    size="sm"
                                    value={addingId}
                                    onChange={e => setAddingId(e.target.value)}
                                    placeholder="Choose a template…"
                                >
                                    {unassigned.map(t => (
                                        <option key={t.id} value={t.id}>{t.name}</option>
                                    ))}
                                </Select>
                                <Button size="sm" isDisabled={!addingId} onClick={handleAdd} flexShrink={0}>
                                    Add
                                </Button>
                            </HStack>
                        </Box>

                        {/* Assigned templates */}
                        <Box>
                            <Text fontSize="sm" fontWeight="600" mb={2}>
                                Assigned templates ({assigned.length})
                            </Text>
                            {assigned.length === 0 ? (
                                <Text fontSize="sm" color="gray.400">None yet — add a template above.</Text>
                            ) : (
                                <VStack spacing={2} align="stretch">
                                    {assigned.map((t, idx) => (
                                        <HStack key={t.id} p={3} bg="gray.50" borderRadius="lg" spacing={3}>
                                            {t.thumbnail_path && (
                                                <Box
                                                    as="img"
                                                    src={`${API}${t.thumbnail_path}`}
                                                    w="40px" h="40px"
                                                    borderRadius="md"
                                                    objectFit="cover"
                                                    flexShrink={0}
                                                />
                                            )}
                                            <Box flex="1" minW={0}>
                                                <Text fontSize="sm" fontWeight="600" noOfLines={1}>{t.name}</Text>
                                                <Text fontSize="xs" color="gray.400" fontFamily="mono">{t.id}</Text>
                                            </Box>
                                            <HStack spacing={1} flexShrink={0}>
                                                <IconButton
                                                    aria-label="Move up"
                                                    icon={<span>↑</span>}
                                                    size="xs"
                                                    variant="ghost"
                                                    isDisabled={idx === 0}
                                                    onClick={() => moveUp(idx)}
                                                />
                                                <IconButton
                                                    aria-label="Move down"
                                                    icon={<span>↓</span>}
                                                    size="xs"
                                                    variant="ghost"
                                                    isDisabled={idx === assigned.length - 1}
                                                    onClick={() => moveDown(idx)}
                                                />
                                                <Button
                                                    size="xs"
                                                    colorScheme="red"
                                                    variant="ghost"
                                                    onClick={() => handleRemove(t.id)}
                                                >
                                                    Remove
                                                </Button>
                                            </HStack>
                                        </HStack>
                                    ))}
                                </VStack>
                            )}
                        </Box>
                    </VStack>
                </ModalBody>
                <ModalFooter>
                    <Button onClick={onClose}>Done</Button>
                </ModalFooter>
            </ModalContent>
        </Modal>
    );
};

export default ListingsPage;
