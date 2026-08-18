import React, { useEffect, useRef, useState, useCallback } from 'react';
import {
    Box, Flex, HStack, VStack, Text, Button, Spinner,
    Slider, SliderTrack, SliderFilledTrack, SliderThumb,
    useToast, Tooltip,
    Modal, ModalOverlay, ModalContent, ModalHeader, ModalBody, ModalCloseButton,
    Switch, FormControl, FormLabel, Input, Select, Badge,
    NumberInput, NumberInputField, NumberInputStepper, NumberIncrementStepper, NumberDecrementStepper,
    SimpleGrid,
} from '@chakra-ui/react';
import { useParams, useNavigate } from 'react-router-dom';
import { useStore } from '../store/useStore';
import { applyTemplate, captureCurrentSettings } from '../utils/applyTemplate';
import { getTemplate, saveTemplateSettings, syncToSiblings, isAuthenticated, getTemplateFulfillmentOptions, updateTemplateFulfillmentOptions } from './adminApi';
import VectorStarMap from '../components/VectorStarMap';
import SidebarControls from '../components/SidebarControls';

const StreetMapCapture = React.lazy(() => import('../components/StreetMapCapture'));

interface FulfillmentOption {
    id?: number;
    template_id?: string;
    option_type: string;
    is_enabled: number;
    label: string;
    provider: string | null;
    price_cents: number | null;
    production_days_min: number | null;
    production_days_max: number | null;
    shipping_days_us_min: number | null;
    shipping_days_us_max: number | null;
    shipping_days_intl_min: number | null;
    shipping_days_intl_max: number | null;
    position: number;
}

const OPTION_TYPE_LABELS: Record<string, string> = {
    digital: 'Digital Download',
    print_unframed: 'Printed Poster',
    print_framed: 'Framed Poster',
    canvas: 'Canvas Print',
};

const PROVIDERS = ['', 'prodigi', 'printful', 'printify', 'printops', 'shortrunposters', 'scalablepress', 'manual'];

const DesignEditorPage: React.FC = () => {
    const { templateId } = useParams<{ templateId: string }>();
    const navigate = useNavigate();
    const toast = useToast();
    const containerRef = useRef<HTMLDivElement>(null);

    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [syncing, setSyncing] = useState(false);
    const [templateName, setTemplateName] = useState('');
    const [siblings, setSiblings] = useState<Array<{ id: string; name: string; fulfillment_size: string }>>([]);
    const [listingInfo, setListingInfo] = useState<{ name?: string; slug?: string; groupName?: string } | null>(null);

    // Fulfillment options modal
    const [showFulfillment, setShowFulfillment] = useState(false);
    const [fulfillmentOptions, setFulfillmentOptions] = useState<FulfillmentOption[]>([]);
    const [savingFulfillment, setSavingFulfillment] = useState(false);

    const {
        previewZoom, setPreviewZoom,
        previewPanX, setPreviewPanX,
        previewPanY, setPreviewPanY,
        printSize,
        posterType,
        setMapBackgroundImage,
        streetMapRendering,
        isInlineEditing,
        undo, redo,
    } = useStore();

    const isInlineEditingRef = useRef(false);
    useEffect(() => {
        return useStore.subscribe((state) => {
            isInlineEditingRef.current = state.isInlineEditing;
        });
    }, []);

    // ── Keyboard shortcuts: Ctrl+Z undo, Ctrl+Y / Ctrl+Shift+Z redo ─────────
    // (mirrors MainLayout — the admin designer previously had no undo shortcut).
    // Skipped while inline-editing text so native text undo still works in fields.
    useEffect(() => {
        const handler = (e: KeyboardEvent) => {
            const ctrl = e.ctrlKey || e.metaKey;
            if (!ctrl) return;
            if (isInlineEditingRef.current) return;
            const t = e.target as HTMLElement | null;
            if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable)) return;
            if (e.key === 'z' && !e.shiftKey) { e.preventDefault(); undo(); }
            if (e.key === 'y' || (e.key === 'z' && e.shiftKey)) { e.preventDefault(); redo(); }
        };
        window.addEventListener('keydown', handler);
        return () => window.removeEventListener('keydown', handler);
    }, [undo, redo]);

    // Auth check
    useEffect(() => {
        if (!isAuthenticated()) {
            navigate('/admin/login');
        }
    }, [navigate]);

    // Load template
    useEffect(() => {
        if (!templateId) return;
        setLoading(true);
        (async () => {
            try {
                const data = await getTemplate(templateId);
                setTemplateName(data.name || templateId);
                if (data.siblings) setSiblings(data.siblings);
                if (data._listing || data._groupName) {
                    setListingInfo({ name: data._listing?.name, slug: data._listing?.slug, groupName: data._groupName });
                }
                if (data.settings_json) {
                    const settings = JSON.parse(data.settings_json);
                    applyTemplate(settings);
                } else if (data.settings) {
                    applyTemplate(data.settings);
                }
            } catch (err) {
                toast({ title: 'Failed to load template', status: 'error', duration: 3000 });
            } finally {
                setLoading(false);
            }
        })();
    }, [templateId, toast]);

    // Load fulfillment options when modal opens
    const handleOpenFulfillment = async () => {
        if (!templateId) return;
        setShowFulfillment(true);
        if (fulfillmentOptions.length === 0) {
            try {
                const opts = await getTemplateFulfillmentOptions(templateId);
                setFulfillmentOptions(opts);
            } catch {
                toast({ title: 'Failed to load fulfillment options', status: 'error', duration: 3000 });
            }
        }
    };

    const handleFulfillmentChange = (idx: number, field: keyof FulfillmentOption, value: unknown) => {
        setFulfillmentOptions(prev => {
            const next = [...prev];
            next[idx] = { ...next[idx], [field]: value };
            return next;
        });
    };

    const handleSaveFulfillment = async () => {
        if (!templateId) return;
        setSavingFulfillment(true);
        try {
            await updateTemplateFulfillmentOptions(templateId, fulfillmentOptions);
            toast({ title: 'Fulfillment options saved', status: 'success', duration: 2000 });
            setShowFulfillment(false);
        } catch {
            toast({ title: 'Failed to save fulfillment options', status: 'error', duration: 3000 });
        } finally {
            setSavingFulfillment(false);
        }
    };

    // Save handler — saves this size + auto-cascades to same-ratio siblings
    const handleSave = async () => {
        if (!templateId) return;
        setSaving(true);
        try {
            const settings = captureCurrentSettings();
            const result = await saveTemplateSettings(templateId, settings);
            const synced = result?.syncedSameRatio ?? 0;
            toast({
                title: 'Saved',
                description: synced > 0 ? `Also updated ${synced} same-ratio size${synced > 1 ? 's' : ''}` : undefined,
                status: 'success',
                duration: 2000,
            });
            return true;
        } catch (err) {
            toast({ title: 'Save failed', status: 'error', duration: 3000 });
            return false;
        } finally {
            setSaving(false);
        }
    };

    // Sync to all sizes — saves current template then pushes to all siblings
    const handleSyncAll = async () => {
        if (!templateId) return;
        setSyncing(true);
        try {
            const settings = captureCurrentSettings();
            await saveTemplateSettings(templateId, settings);
            const result = await syncToSiblings(templateId);
            const srcSize = result?.srcSize ? ` from ${result.srcSize}` : '';
            const sameCount = result?.synced ?? 0;
            toast({
                title: 'Synced',
                description: `Saved + pushed to ${sameCount} other size(s)${srcSize}. Same-ratio sizes got full layout; others got style only.`,
                status: 'success',
                duration: 4000,
            });
        } catch (err: any) {
            toast({ title: 'Sync failed', description: err?.message, status: 'error', duration: 4000 });
        } finally {
            setSyncing(false);
        }
    };

    // Navigate to sibling size without saving — save is explicit via the Save button.
    // Auto-save here was corrupting designs when bad state (e.g. an off-screen divider)
    // was accidentally persisted to all sibling templates.
    const handleSiblingClick = (siblingId: string) => {
        if (siblingId === templateId || !templateId) return;
        navigate(`/admin/design-editor/${siblingId}`, { replace: true });
    };

    // Map capture
    const handleMapCapture = useCallback((dataUrl: string) => {
        useStore.getState().setMapImageOffsetX(0);
        useStore.getState().setMapImageOffsetY(0);
        setMapBackgroundImage(dataUrl);
    }, [setMapBackgroundImage]);

    // Preview dimensions
    const [previewDimensions, setPreviewDimensions] = useState({ width: 0, height: 0 });
    // NOTE: `loading` is in the deps deliberately. While loading, the component
    // early-returns (no container mounted), so this effect's first run finds
    // containerRef.current === null and bails without attaching the observer.
    // For sizes whose ratio differs from the default (8x10 / 4:5), the ratio
    // changes when the template loads, which re-runs the effect after the
    // container exists. But 8x10 and 16x20 are themselves 4:5 — their ratio never
    // changes, so without `loading` here the observer would never attach and the
    // preview would stay 0×0 (blank poster). Re-running on `loading` fixes that.
    useEffect(() => {
        if (loading) return;
        const container = containerRef.current;
        if (!container) return;
        const update = () => {
            const { width: cw, height: ch } = container.getBoundingClientRect();
            const padding = 64;
            const availW = cw - padding * 2;
            const availH = ch - padding * 2;
            if (availW <= 0 || availH <= 0) return; // container not laid out yet; RO will fire again
            const [rW, rH] = printSize.ratio.split('/').map(Number);
            const posterAspect = rW / rH;
            let w: number, h: number;
            if (availW / availH > posterAspect) {
                h = availH; w = h * posterAspect;
            } else {
                w = availW; h = w / posterAspect;
            }
            setPreviewDimensions({ width: Math.round(w), height: Math.round(h) });
        };
        update();
        const ro = new ResizeObserver(update);
        ro.observe(container);
        return () => ro.disconnect();
    }, [printSize.ratio, loading]);

    // Pan/zoom handlers
    const [isDragging, setIsDragging] = useState(false);
    const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
    const [sidebarWidth, setSidebarWidth] = useState(400);
    const sidebarDragRef = useRef(false);

    // Reference background image overlay
    const [refImage, setRefImage] = useState<string | null>(null);
    const [refOpacity, setRefOpacity] = useState(0.5);
    const refFileRef = useRef<HTMLInputElement>(null);
    const handleRefUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = () => setRefImage(reader.result as string);
        reader.readAsDataURL(file);
    };

    const handleWheel = (e: React.WheelEvent) => {
        e.preventDefault();
        const delta = e.deltaY > 0 ? -0.05 : 0.05;
        setPreviewZoom(Math.min(Math.max(0.5, previewZoom + delta), 3));
    };

    const handleMouseDown = (e: React.MouseEvent) => {
        if (e.button === 0 && !isInlineEditingRef.current) {
            if ((e.target as Element).closest('#text-layer')) return;
            setIsDragging(true);
            setDragStart({ x: e.clientX - previewPanX, y: e.clientY - previewPanY });
        }
    };

    useEffect(() => {
        const handleMouseMove = (e: MouseEvent) => {
            if (isDragging && !isInlineEditingRef.current) {
                setPreviewPanX(e.clientX - dragStart.x);
                setPreviewPanY(e.clientY - dragStart.y);
            }
        };
        const handleMouseUp = () => setIsDragging(false);
        if (isDragging) {
            window.addEventListener('mousemove', handleMouseMove);
            window.addEventListener('mouseup', handleMouseUp);
        }
        return () => {
            window.removeEventListener('mousemove', handleMouseMove);
            window.removeEventListener('mouseup', handleMouseUp);
        };
    }, [isDragging, dragStart, setPreviewPanX, setPreviewPanY]);

    const handleDoubleClick = () => {
        if (isInlineEditingRef.current) return;
        setPreviewPanX(0); setPreviewPanY(0);
    };

    const handleSidebarDragStart = useCallback((e: React.MouseEvent) => {
        e.preventDefault();
        sidebarDragRef.current = true;
        const onMove = (ev: MouseEvent) => {
            if (!sidebarDragRef.current) return;
            const newWidth = window.innerWidth - ev.clientX;
            setSidebarWidth(Math.min(Math.max(280, newWidth), 700));
        };
        const onUp = () => {
            sidebarDragRef.current = false;
            window.removeEventListener('mousemove', onMove);
            window.removeEventListener('mouseup', onUp);
        };
        window.addEventListener('mousemove', onMove);
        window.addEventListener('mouseup', onUp);
    }, []);

    if (loading) {
        return (
            <Flex h="100vh" alignItems="center" justifyContent="center" bg="gray.50">
                <VStack spacing={4}>
                    <Spinner size="xl" color="gray.400" />
                    <Text color="gray.500" fontSize="sm">Loading template...</Text>
                </VStack>
            </Flex>
        );
    }

    return (
        <Flex h="100vh" overflow="hidden" bg="gray.50" flexDirection="column">
            {/* Top bar */}
            <Flex
                h="48px" minH="48px"
                bg="gray.900" color="white"
                alignItems="center" px={4}
                justify="space-between"
                zIndex={100}
            >
                <HStack spacing={3}>
                    <Button
                        size="xs" variant="ghost" color="gray.300"
                        _hover={{ color: 'white', bg: 'gray.700' }}
                        onClick={() => {
                            if (listingInfo?.slug) {
                                navigate(`/admin/listings`);
                            } else {
                                navigate('/admin/listings');
                            }
                        }}
                    >
                        ← Back to Listings
                    </Button>
                    <Text fontSize="sm" fontWeight="600">{templateName}</Text>
                    {listingInfo?.groupName && (
                        <Text fontSize="xs" color="gray.400">{listingInfo.groupName}</Text>
                    )}
                </HStack>

                {/* Sibling size switcher */}
                {siblings.length > 1 && (
                    <HStack spacing={1} overflowX="auto" maxW="60%" px={2}>
                        {siblings.map((sib) => (
                            <Tooltip key={sib.id} label={sib.name} fontSize="xs" placement="bottom" hasArrow>
                                <Button
                                    size="xs"
                                    variant={sib.id === templateId ? 'solid' : 'ghost'}
                                    bg={sib.id === templateId ? 'blue.500' : 'transparent'}
                                    color={sib.id === templateId ? 'white' : 'gray.400'}
                                    _hover={{ bg: sib.id === templateId ? 'blue.500' : 'gray.700', color: 'white' }}
                                    onClick={() => handleSiblingClick(sib.id)}
                                    isDisabled={saving}
                                    px={2}
                                    minW="auto"
                                    fontWeight={sib.id === templateId ? '700' : '400'}
                                    fontSize="xs"
                                >
                                    {sib.fulfillment_size || sib.id}
                                </Button>
                            </Tooltip>
                        ))}
                    </HStack>
                )}

                <HStack spacing={2}>
                    {listingInfo?.slug && (
                        <Button
                            size="xs" variant="ghost" color="gray.400"
                            _hover={{ color: 'white', bg: 'gray.700' }}
                            onClick={() => window.open(`/l/${listingInfo.slug}`, '_blank')}
                        >
                            View Listing
                        </Button>
                    )}
                    <Button
                        size="xs" variant="ghost" color="gray.400"
                        _hover={{ color: 'white', bg: 'gray.700' }}
                        onClick={handleOpenFulfillment}
                        aria-label="Fulfillment options"
                    >
                        Fulfillment
                    </Button>
                    {siblings.length > 1 && (
                        <Button
                            size="sm"
                            bg="blue.600" color="white"
                            _hover={{ bg: 'blue.500' }}
                            isLoading={syncing}
                            loadingText="Syncing…"
                            onClick={handleSyncAll}
                            px={4}
                            title="Save current settings and push to all sizes in this design group"
                        >
                            Sync to all sizes
                        </Button>
                    )}
                    <Button
                        size="sm"
                        bg="green.500" color="white"
                        _hover={{ bg: 'green.400' }}
                        isLoading={saving}
                        onClick={handleSave}
                        px={6}
                    >
                        Save
                    </Button>
                </HStack>
            </Flex>

            {/* Editor body */}
            <Flex flex="1" overflow="hidden">
                {/* Preview area */}
                <Box
                    ref={containerRef}
                    flex="1"
                    h="100%"
                    display="flex"
                    alignItems="center"
                    justifyContent="center"
                    bg="#EAEEF2"
                    p={8}
                    overflow="hidden"
                    position="relative"
                    onWheelCapture={handleWheel}
                    onMouseDown={handleMouseDown}
                    onDoubleClick={handleDoubleClick}
                    cursor={isDragging ? 'grabbing' : 'grab'}
                    userSelect="none"
                    style={{ touchAction: 'none' }}
                >
                    {/* Zoom + Reference Image controls */}
                    <Box
                        position="absolute" top={4} right={4}
                        bg="white" p={3} borderRadius="md"
                        border="1px solid" borderColor="gray.200"
                        boxShadow="sm" minW="180px" zIndex={100}
                    >
                        <VStack spacing={3} align="stretch">
                            <VStack spacing={2} align="stretch">
                                <HStack justify="space-between">
                                    <Text fontSize="xs" fontWeight="600" color="gray.700">Zoom</Text>
                                    <Text fontSize="xs" color="gray.500" fontWeight="600">{Math.round(previewZoom * 100)}%</Text>
                                </HStack>
                                <HStack spacing={1}>
                                    <Button size="xs" onClick={() => setPreviewZoom(Math.max(0.5, previewZoom - 0.1))}>-</Button>
                                    <Slider flex="1" value={previewZoom} min={0.5} max={3.0} step={0.1}
                                        onChange={setPreviewZoom} aria-label="zoom-slider">
                                        <SliderTrack bg="gray.200"><SliderFilledTrack bg="gray.900" /></SliderTrack>
                                        <SliderThumb boxSize={3} borderColor="gray.300" borderWidth="1px" />
                                    </Slider>
                                    <Button size="xs" onClick={() => setPreviewZoom(Math.min(3.0, previewZoom + 0.1))}>+</Button>
                                </HStack>
                            </VStack>

                            {/* Reference image overlay */}
                            <Box borderTop="1px solid" borderColor="gray.100" pt={2}>
                                <HStack justify="space-between" mb={1}>
                                    <Text fontSize="xs" fontWeight="600" color="gray.700">Reference</Text>
                                    {refImage && (
                                        <Button size="xs" variant="ghost" color="red.400" onClick={() => setRefImage(null)} p={0} h="auto" minW="auto">
                                            ✕
                                        </Button>
                                    )}
                                </HStack>
                                <input
                                    ref={refFileRef}
                                    type="file"
                                    accept="image/*"
                                    onChange={handleRefUpload}
                                    style={{ display: 'none' }}
                                />
                                {!refImage ? (
                                    <Button size="xs" w="100%" variant="outline" colorScheme="gray" onClick={() => refFileRef.current?.click()}>
                                        Upload Image
                                    </Button>
                                ) : (
                                    <VStack spacing={1} align="stretch">
                                        <HStack justify="space-between">
                                            <Text fontSize="10px" color="gray.500">Opacity</Text>
                                            <Text fontSize="10px" color="gray.500">{Math.round(refOpacity * 100)}%</Text>
                                        </HStack>
                                        <Slider value={refOpacity} min={0} max={1} step={0.05} onChange={setRefOpacity} aria-label="ref-opacity" size="sm">
                                            <SliderTrack bg="gray.200"><SliderFilledTrack bg="blue.400" /></SliderTrack>
                                            <SliderThumb boxSize={2} />
                                        </Slider>
                                        <Button size="xs" variant="ghost" color="gray.500" onClick={() => refFileRef.current?.click()} fontSize="10px">
                                            Change
                                        </Button>
                                    </VStack>
                                )}
                            </Box>
                        </VStack>
                    </Box>

                    {/* Poster Preview — no DEMO watermark */}
                    <Box
                        id="poster-preview"
                        position="relative"
                        boxShadow="sm"
                        width={`${previewDimensions.width}px`}
                        height={`${previewDimensions.height}px`}
                        maxWidth="100%"
                        maxHeight="100%"
                        transform={`scale(${previewZoom}) translate(${previewPanX / previewZoom}px, ${previewPanY / previewZoom}px)`}
                        transformOrigin="center center"
                        transition={isDragging ? 'none' : 'transform 0.2s ease-out'}
                        bg="white"
                        border="1px solid"
                        borderColor="gray.200"
                        pointerEvents="none"
                    >
                        <VectorStarMap />
                        {refImage && (
                            <img
                                src={refImage}
                                alt="Reference overlay"
                                style={{
                                    position: 'absolute',
                                    top: 0,
                                    left: 0,
                                    width: '100%',
                                    height: '100%',
                                    objectFit: 'contain',
                                    opacity: refOpacity,
                                    pointerEvents: 'none',
                                }}
                            />
                        )}
                    </Box>

                    {/* "Updating map…" overlay while a street/colored-map capture is in flight */}
                    {posterType !== 'starmap' && streetMapRendering && (
                        <Flex
                            position="absolute" inset={0} zIndex={5}
                            align="center" justify="center"
                            bg="rgba(255,255,255,0.55)" pointerEvents="none"
                            borderRadius="sm"
                        >
                            <HStack spacing={2} bg="white" px={3} py={2} borderRadius="md" boxShadow="md">
                                <Spinner size="sm" color="gray.500" />
                                <Text fontSize="xs" color="gray.600" fontWeight="500">Updating map…</Text>
                            </HStack>
                        </Flex>
                    )}

                    {/* Offscreen street map renderer — lazy-loaded to keep MapLibre out of main bundle */}
                    {posterType !== 'starmap' && (
                        <Box position="fixed" top="-9999px" left="-9999px" width="1200px" height="1200px" pointerEvents="none" aria-hidden>
                            <React.Suspense fallback={null}>
                                <StreetMapCapture onCapture={handleMapCapture} />
                            </React.Suspense>
                        </Box>
                    )}
                </Box>

                {/* Sidebar */}
                <Box
                    w={`${sidebarWidth}px`}
                    minW="280px"
                    h="100%"
                    overflowY="auto"
                    borderLeft="1px"
                    borderColor="gray.200"
                    bg="white"
                    position="relative"
                >
                    <Box
                        position="absolute"
                        left="-4px" top={0} bottom={0}
                        w="8px" cursor="col-resize" zIndex={20}
                        onMouseDown={handleSidebarDragStart}
                        _hover={{ bg: 'blue.100', opacity: 0.6 }}
                        transition="background 0.15s"
                    />
                    <SidebarControls editorSiblings={siblings} onSiblingSwitch={handleSiblingClick} isAdmin={true} />
                </Box>
            </Flex>

            {/* Fulfillment Options Modal */}
            <Modal isOpen={showFulfillment} onClose={() => setShowFulfillment(false)} size="2xl" scrollBehavior="inside">
                <ModalOverlay />
                <ModalContent>
                    <ModalHeader fontSize="md" pb={2}>
                        Fulfillment Options
                        <Text fontSize="xs" fontWeight="400" color="gray.500" mt={0.5}>
                            Configure which formats are available for this size ({templateName})
                        </Text>
                    </ModalHeader>
                    <ModalCloseButton />
                    <ModalBody pb={6}>
                        {fulfillmentOptions.length === 0 ? (
                            <Flex align="center" justify="center" py={8}>
                                <Spinner size="md" color="gray.400" />
                            </Flex>
                        ) : (
                            <VStack spacing={4} align="stretch">
                                {fulfillmentOptions.map((opt, idx) => (
                                    <Box key={opt.option_type} p={4} border="1px solid" borderColor={opt.is_enabled ? 'blue.200' : 'gray.200'} borderRadius="lg" bg={opt.is_enabled ? 'blue.50' : 'gray.50'}>
                                        <HStack justify="space-between" mb={opt.is_enabled ? 3 : 0}>
                                            <HStack spacing={3}>
                                                <Switch
                                                    isChecked={!!opt.is_enabled}
                                                    onChange={e => handleFulfillmentChange(idx, 'is_enabled', e.target.checked ? 1 : 0)}
                                                    colorScheme="blue"
                                                    size="md"
                                                />
                                                <Text fontWeight="600" fontSize="sm" color={opt.is_enabled ? 'blue.800' : 'gray.600'}>
                                                    {OPTION_TYPE_LABELS[opt.option_type] || opt.option_type}
                                                </Text>
                                                {!opt.is_enabled && <Badge colorScheme="gray" fontSize="10px">Disabled</Badge>}
                                            </HStack>
                                            <FormControl display="flex" alignItems="center" w="auto">
                                                <FormLabel fontSize="xs" color="gray.500" mb={0} mr={2} whiteSpace="nowrap">Label</FormLabel>
                                                <Input
                                                    size="xs" value={opt.label}
                                                    onChange={e => handleFulfillmentChange(idx, 'label', e.target.value)}
                                                    w="160px" borderRadius="md"
                                                />
                                            </FormControl>
                                        </HStack>
                                        {opt.is_enabled ? (
                                            <SimpleGrid columns={3} spacing={3}>
                                                <FormControl>
                                                    <FormLabel fontSize="xs" color="gray.500" mb={1}>Provider</FormLabel>
                                                    <Select size="xs" value={opt.provider || ''} onChange={e => handleFulfillmentChange(idx, 'provider', e.target.value || null)} borderRadius="md">
                                                        {PROVIDERS.map(p => <option key={p} value={p}>{p || '—'}</option>)}
                                                    </Select>
                                                </FormControl>
                                                <FormControl>
                                                    <FormLabel fontSize="xs" color="gray.500" mb={1}>Price (USD cents)</FormLabel>
                                                    <NumberInput size="xs" value={opt.price_cents ?? ''} min={0}
                                                        onChange={v => handleFulfillmentChange(idx, 'price_cents', v === '' ? null : Number(v))}>
                                                        <NumberInputField borderRadius="md" />
                                                        <NumberInputStepper><NumberIncrementStepper /><NumberDecrementStepper /></NumberInputStepper>
                                                    </NumberInput>
                                                </FormControl>
                                                <Box />
                                                <FormControl>
                                                    <FormLabel fontSize="xs" color="gray.500" mb={1}>Production days</FormLabel>
                                                    <HStack spacing={1}>
                                                        <NumberInput size="xs" value={opt.production_days_min ?? ''} min={0} w="70px"
                                                            onChange={v => handleFulfillmentChange(idx, 'production_days_min', v === '' ? null : Number(v))}>
                                                            <NumberInputField borderRadius="md" placeholder="min" />
                                                        </NumberInput>
                                                        <Text fontSize="xs" color="gray.400">–</Text>
                                                        <NumberInput size="xs" value={opt.production_days_max ?? ''} min={0} w="70px"
                                                            onChange={v => handleFulfillmentChange(idx, 'production_days_max', v === '' ? null : Number(v))}>
                                                            <NumberInputField borderRadius="md" placeholder="max" />
                                                        </NumberInput>
                                                    </HStack>
                                                </FormControl>
                                                <FormControl>
                                                    <FormLabel fontSize="xs" color="gray.500" mb={1}>US shipping days</FormLabel>
                                                    <HStack spacing={1}>
                                                        <NumberInput size="xs" value={opt.shipping_days_us_min ?? ''} min={0} w="70px"
                                                            onChange={v => handleFulfillmentChange(idx, 'shipping_days_us_min', v === '' ? null : Number(v))}>
                                                            <NumberInputField borderRadius="md" placeholder="min" />
                                                        </NumberInput>
                                                        <Text fontSize="xs" color="gray.400">–</Text>
                                                        <NumberInput size="xs" value={opt.shipping_days_us_max ?? ''} min={0} w="70px"
                                                            onChange={v => handleFulfillmentChange(idx, 'shipping_days_us_max', v === '' ? null : Number(v))}>
                                                            <NumberInputField borderRadius="md" placeholder="max" />
                                                        </NumberInput>
                                                    </HStack>
                                                </FormControl>
                                                <FormControl>
                                                    <FormLabel fontSize="xs" color="gray.500" mb={1}>Intl shipping days</FormLabel>
                                                    <HStack spacing={1}>
                                                        <NumberInput size="xs" value={opt.shipping_days_intl_min ?? ''} min={0} w="70px"
                                                            onChange={v => handleFulfillmentChange(idx, 'shipping_days_intl_min', v === '' ? null : Number(v))}>
                                                            <NumberInputField borderRadius="md" placeholder="min" />
                                                        </NumberInput>
                                                        <Text fontSize="xs" color="gray.400">–</Text>
                                                        <NumberInput size="xs" value={opt.shipping_days_intl_max ?? ''} min={0} w="70px"
                                                            onChange={v => handleFulfillmentChange(idx, 'shipping_days_intl_max', v === '' ? null : Number(v))}>
                                                            <NumberInputField borderRadius="md" placeholder="max" />
                                                        </NumberInput>
                                                    </HStack>
                                                </FormControl>
                                            </SimpleGrid>
                                        ) : null}
                                    </Box>
                                ))}
                                <HStack justify="flex-end" pt={2}>
                                    <Button size="sm" variant="ghost" onClick={() => setShowFulfillment(false)}>Cancel</Button>
                                    <Button size="sm" colorScheme="blue" isLoading={savingFulfillment} onClick={handleSaveFulfillment}>
                                        Save options
                                    </Button>
                                </HStack>
                            </VStack>
                        )}
                    </ModalBody>
                </ModalContent>
            </Modal>
        </Flex>
    );
};

export default DesignEditorPage;
