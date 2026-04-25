import React, { useEffect, useState, useCallback } from 'react';
import {
    Box, Heading, Text, Button, VStack, HStack, Input, Textarea,
    Table, Thead, Tbody, Tr, Th, Td, Badge,
    Modal, ModalOverlay, ModalContent, ModalHeader, ModalBody, ModalFooter, ModalCloseButton,
    FormControl, FormLabel, FormHelperText, useDisclosure, useToast,
    Spinner, Flex, Switch, Select,
} from '@chakra-ui/react';
import { useNavigate } from 'react-router-dom';
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
    etsy_listing_id?: string;
    etsy_listing_url?: string;
    etsy_title?: string;
    etsy_description?: string;
    etsy_tags?: string; // JSON array string
    etsy_taxonomy_id?: number;
    etsy_shipping_profile_id?: number;
    base_price_cents?: number;
    fulfillment_type?: string;
    poster_type?: string;
    meta_title?: string;
    meta_description?: string;
}

const API = import.meta.env.VITE_API_URL || '';

const ListingsPage: React.FC = () => {
    const navigate = useNavigate();
    const [listings, setListings] = useState<Listing[]>([]);
    const [loading, setLoading] = useState(true);
    const [loadError, setLoadError] = useState<string | null>(null);
    const [editTarget, setEditTarget] = useState<Listing | null>(null);
    const [createMode, setCreateMode] = useState(false);
    const { isOpen: isFormOpen, onOpen: openForm, onClose: closeForm } = useDisclosure();
    const toast = useToast();

    const load = useCallback(async () => {
        setLoading(true);
        setLoadError(null);
        try {
            const data = await adminFetchJson('/api/admin/listings');
            setListings(data);
        } catch (err: any) {
            setLoadError(err.message || 'Failed to load listings');
        } finally { setLoading(false); }
    }, []);

    useEffect(() => { load(); }, [load]);

    const openCreate = () => { setEditTarget(null); setCreateMode(true); openForm(); };
    const openEdit = (l: Listing) => { setEditTarget(l); setCreateMode(false); openForm(); };

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
            ) : loadError ? (
                <Box textAlign="center" py={20} color="red.400">
                    <Text mb={2} fontWeight="600">Could not load listings</Text>
                    <Text fontSize="sm" mb={4} color="gray.500">{loadError}</Text>
                    <Button size="sm" variant="outline" onClick={load}>Retry</Button>
                </Box>
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
                                            <Button
                                                size="xs"
                                                bg="gray.900" color="white"
                                                _hover={{ bg: 'gray.700' }}
                                                onClick={() => navigate(`/admin/listings/${l.id}`)}
                                            >
                                                Designs
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
        </Box>
    );
};

// ── Create / Edit modal ──────────────────────────────────────────────────────

const SectionLabel: React.FC<{ children: React.ReactNode }> = ({ children }) => (
    <Text fontSize="xs" fontWeight="700" color="gray.500" textTransform="uppercase" letterSpacing="0.08em" pt={2}>{children}</Text>
);


// ── Create / Edit modal with tabs ───────────────────────────────────────────

const ListingFormModal: React.FC<{
    isOpen: boolean;
    onClose: () => void;
    listing: Listing | null;
}> = ({ isOpen, onClose, listing }) => {
    const toast = useToast();
    const [saving, setSaving] = useState(false);

    // Basic
    const [name, setName] = useState('');
    const [slug, setSlug] = useState('');
    const [description, setDescription] = useState('');
    const [posterType, setPosterType] = useState('starmap');
    const [basePriceCents, setBasePriceCents] = useState('');
    // Etsy
    const [etsyTitle, setEtsyTitle] = useState('');
    const [etsyDescription, setEtsyDescription] = useState('');
    const [etsyTags, setEtsyTags] = useState('');
    const [etsyListingId, setEtsyListingId] = useState('');
    const [etsyListingUrl, setEtsyListingUrl] = useState('');
    const [etsyTaxonomyId, setEtsyTaxonomyId] = useState('');
    const [etsyShippingProfileId, setEtsyShippingProfileId] = useState('');
    // SEO
    const [metaTitle, setMetaTitle] = useState('');
    const [metaDescription, setMetaDescription] = useState('');

    useEffect(() => {
        if (isOpen) {
            setName(listing?.name ?? '');
            setSlug(listing?.slug ?? '');
            setDescription(listing?.description ?? '');
            setPosterType(listing?.poster_type ?? 'starmap');
            setBasePriceCents(listing?.base_price_cents ? String(listing.base_price_cents / 100) : '');
            setEtsyTitle(listing?.etsy_title ?? '');
            setEtsyDescription(listing?.etsy_description ?? '');
            setEtsyTags(listing?.etsy_tags ? JSON.parse(listing.etsy_tags).join(', ') : '');
            setEtsyListingId(listing?.etsy_listing_id ?? '');
            setEtsyListingUrl(listing?.etsy_listing_url ?? '');
            setEtsyTaxonomyId(listing?.etsy_taxonomy_id ? String(listing.etsy_taxonomy_id) : '');
            setEtsyShippingProfileId(listing?.etsy_shipping_profile_id ? String(listing.etsy_shipping_profile_id) : '');
            setMetaTitle(listing?.meta_title ?? '');
            setMetaDescription(listing?.meta_description ?? '');
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
        const tags = etsyTags.split(',').map(t => t.trim()).filter(Boolean);
        const payload = {
            name, slug, description,
            poster_type: posterType || null,
            base_price_cents: basePriceCents ? Math.round(parseFloat(basePriceCents) * 100) : null,
            etsy_title: etsyTitle || null,
            etsy_description: etsyDescription || null,
            etsy_tags: tags.length ? tags : null,
            etsy_listing_id: etsyListingId || null,
            etsy_listing_url: etsyListingUrl || null,
            etsy_taxonomy_id: etsyTaxonomyId ? parseInt(etsyTaxonomyId) : null,
            etsy_shipping_profile_id: etsyShippingProfileId ? parseInt(etsyShippingProfileId) : null,
            meta_title: metaTitle || null,
            meta_description: metaDescription || null,
        };
        try {
            if (listing) {
                await adminFetchJson(`/api/admin/listings/${listing.id}`, { method: 'PUT', body: JSON.stringify(payload) });
                toast({ title: 'Listing updated', status: 'success', duration: 2000 });
            } else {
                await adminFetchJson('/api/admin/listings', { method: 'POST', body: JSON.stringify(payload) });
                toast({ title: 'Listing created', status: 'success', duration: 2000 });
            }
            onClose();
        } catch (err: any) {
            toast({ title: err.message || 'Save failed', status: 'error', duration: 3000 });
        } finally { setSaving(false); }
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} size="2xl" scrollBehavior="inside">
            <ModalOverlay />
            <ModalContent>
                <ModalHeader>{listing ? 'Edit Listing' : 'New Listing'}</ModalHeader>
                <ModalCloseButton />
                <ModalBody pb={4}>
                    <VStack spacing={3} align="stretch">

                                    <SectionLabel>Basic Info</SectionLabel>
                                    <FormControl isRequired>
                                        <FormLabel fontSize="sm">Internal name</FormLabel>
                                        <Input value={name} onChange={e => setName(e.target.value)} placeholder="Custom Star Map — The Night We Met" />
                                    </FormControl>
                                    <FormControl isRequired>
                                        <FormLabel fontSize="sm">Slug (URL path)</FormLabel>
                                        <Input
                                            value={slug}
                                            onChange={e => setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
                                            placeholder="star-map-night-we-met"
                                            fontFamily="mono"
                                        />
                                        <FormHelperText fontSize="xs">Public URL: <strong>/l/{slug || 'your-slug'}</strong></FormHelperText>
                                    </FormControl>
                                    <HStack spacing={3}>
                                        <FormControl>
                                            <FormLabel fontSize="sm">Poster type</FormLabel>
                                            <Select size="sm" value={posterType} onChange={e => setPosterType(e.target.value)}>
                                                <option value="starmap">Star Map</option>
                                                <option value="streetmap">Street Map</option>
                                                <option value="coloredmap">Colored Map</option>
                                            </Select>
                                        </FormControl>
                                        <FormControl>
                                            <FormLabel fontSize="sm">Base price (USD)</FormLabel>
                                            <Input size="sm" value={basePriceCents} onChange={e => setBasePriceCents(e.target.value)} placeholder="29.95" type="number" min="0" step="0.01" />
                                        </FormControl>
                                    </HStack>

                                    <SectionLabel>Etsy Listing</SectionLabel>
                                    <FormControl>
                                        <FormLabel fontSize="sm">Etsy listing title</FormLabel>
                                        <Input value={etsyTitle} onChange={e => setEtsyTitle(e.target.value)} placeholder="Custom Star Map Print — Personalised Night Sky Poster" />
                                        <FormHelperText fontSize="xs">Used when auto-publishing to Etsy. Leave blank to use internal name.</FormHelperText>
                                    </FormControl>
                                    <FormControl>
                                        <FormLabel fontSize="sm">Etsy description</FormLabel>
                                        <Textarea value={etsyDescription} onChange={e => setEtsyDescription(e.target.value)} rows={5}
                                            placeholder="Capture the exact night sky from your special moment...&#10;&#10;Personalise with your date, location, and a dedication message." />
                                    </FormControl>
                                    <FormControl>
                                        <FormLabel fontSize="sm">Etsy tags <Text as="span" color="gray.400" fontWeight="400">(comma-separated, max 13)</Text></FormLabel>
                                        <Input value={etsyTags} onChange={e => setEtsyTags(e.target.value)}
                                            placeholder="star map, night sky print, custom star map, anniversary gift" />
                                        <FormHelperText fontSize="xs">{etsyTags.split(',').filter(t => t.trim()).length} / 13 tags</FormHelperText>
                                    </FormControl>
                                    <HStack spacing={3}>
                                        <FormControl>
                                            <FormLabel fontSize="sm">Etsy listing ID</FormLabel>
                                            <Input size="sm" value={etsyListingId} onChange={e => setEtsyListingId(e.target.value)} placeholder="1234567890" fontFamily="mono" />
                                        </FormControl>
                                        <FormControl>
                                            <FormLabel fontSize="sm">Etsy taxonomy ID</FormLabel>
                                            <Input size="sm" value={etsyTaxonomyId} onChange={e => setEtsyTaxonomyId(e.target.value)} placeholder="2078" fontFamily="mono" />
                                        </FormControl>
                                        <FormControl>
                                            <FormLabel fontSize="sm">Shipping profile ID</FormLabel>
                                            <Input size="sm" value={etsyShippingProfileId} onChange={e => setEtsyShippingProfileId(e.target.value)} placeholder="12345" fontFamily="mono" />
                                        </FormControl>
                                    </HStack>
                                    <FormControl>
                                        <FormLabel fontSize="sm">Etsy listing URL</FormLabel>
                                        <Input value={etsyListingUrl} onChange={e => setEtsyListingUrl(e.target.value)} placeholder="https://www.etsy.com/listing/..." fontFamily="mono" fontSize="xs" />
                                    </FormControl>

                                    <SectionLabel>SEO</SectionLabel>
                                    <FormControl>
                                        <FormLabel fontSize="sm">Meta title</FormLabel>
                                        <Input value={metaTitle} onChange={e => setMetaTitle(e.target.value)} placeholder="Custom Star Map Poster | The Mapped Moment" />
                                    </FormControl>
                                    <FormControl>
                                        <FormLabel fontSize="sm">Meta description</FormLabel>
                                        <Textarea value={metaDescription} onChange={e => setMetaDescription(e.target.value)} rows={2}
                                            placeholder="Create a personalised star map poster of the exact night sky on your special date." />
                                    </FormControl>
                                    <FormControl>
                                        <FormLabel fontSize="sm">Short description <Text as="span" color="gray.400" fontWeight="400">(shown on listing page)</Text></FormLabel>
                                        <Textarea value={description} onChange={e => setDescription(e.target.value)} rows={2}
                                            placeholder="Personalise this star map with your location and date." />
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


export default ListingsPage;
