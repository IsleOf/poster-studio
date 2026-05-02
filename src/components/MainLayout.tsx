import React, { useEffect, useRef, useState, useCallback } from 'react';
import {
    Box, Flex, Slider, SliderTrack, SliderFilledTrack, SliderThumb,
    Text, VStack, HStack, Button, useToast, Tooltip,
} from '@chakra-ui/react';
import { renderPosterToBlob } from '../utils/renderPoster';
import { useParams } from 'react-router-dom';
import { useStore } from '../store/useStore';
import { AUTO_SAVE_KEY } from '../store/useStore';
import { trackEvent } from '../utils/analytics';
import { fetchAndApplyTemplate } from '../utils/applyTemplate';
import VectorStarMap from './VectorStarMap';
import SidebarControls from './SidebarControls';

// Lazy-load MapLibre-powered capture component — only needed for street/colored map modes.
// This keeps MapLibre GL JS (~200 KB gzipped) out of the initial bundle for star map users.
const StreetMapCapture = React.lazy(() => import('./StreetMapCapture'));
import type { DesignGroup } from '../types/listing';

const API_URL = import.meta.env.VITE_API_URL || '';
const TEMPLATE_BOOTSTRAP_TIMEOUT_MS = 4000;

const MainLayout: React.FC = () => {
    const { templateId, slug, designSlug } = useParams<{ templateId?: string; slug?: string; designSlug?: string }>();
    const [designGroups, setDesignGroups] = useState<DesignGroup[]>([]);
    // Always start in loading state — even on /, we auto-load Design001 below.
    // This prevents the legacy default "My Star Map" from flickering before
    // the real first design loads.
    const [templateLoading, setTemplateLoading] = useState(true);
    const containerRef = useRef<HTMLDivElement>(null);
    const {
        previewZoom, setPreviewZoom,
        previewPanX, setPreviewPanX,
        previewPanY, setPreviewPanY,
        printSize,
        posterType,
        setMapBackgroundImage,
        isInlineEditing,
    } = useStore();

    const { canUndo, canRedo, undo, redo } = useStore();
    const toast = useToast();
    const [isFullscreen, setIsFullscreen] = useState(false);
    const [isCopying, setIsCopying] = useState(false);
    const [sidebarWidth, setSidebarWidth] = useState(400);
    const sidebarDragRef = useRef(false);

    const handleCopyImage = useCallback(async () => {
        const svgEl = document.getElementById('poster-preview')?.querySelector('svg') as SVGSVGElement | null;
        if (!svgEl || !navigator.clipboard?.write) return;
        setIsCopying(true);
        try {
            // Render at 150 DPI for a reasonable clipboard image size
            const blob = await renderPosterToBlob(svgEl, printSize.width, printSize.height, 150, true);
            await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })]);
            toast({ title: 'Copied!', description: 'Poster image copied to clipboard.', status: 'success', duration: 2500, isClosable: true });
            trackEvent('copy_image');
        } catch {
            toast({ title: 'Copy failed', description: 'Your browser may not support clipboard images.', status: 'error', duration: 3000, isClosable: true });
        } finally {
            setIsCopying(false);
        }
    }, [printSize, toast]);

    // Page view tracking
    useEffect(() => {
        trackEvent('page_view', { path: window.location.pathname, template: templateId });
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // Auto-load Design001 (or the first available design for the default map type)
    // when the user lands on / with no template/listing URL. Without this, the page
    // shows the bare Zustand defaults ("My Star Map") which is not a finished design.
    // Autosave restore (below) can still override if the user clicks Restore.
    useEffect(() => {
        if (templateId || slug) return;
        const API = API_URL;
        let cancelled = false;
        const controller = new AbortController();
        const bootstrapTimeout = window.setTimeout(() => controller.abort(), TEMPLATE_BOOTSTRAP_TIMEOUT_MS);
        const finishLoading = () => {
            if (!cancelled) setTemplateLoading(false);
        };
        const withTimeout = <T,>(promise: Promise<T>) => Promise.race([
            promise,
            new Promise<T>((_, reject) => {
                window.setTimeout(() => reject(new Error('Template bootstrap timed out')), TEMPLATE_BOOTSTRAP_TIMEOUT_MS);
            }),
        ]);

        const templatesUrl = new URL(`${API}/api/templates`, window.location.origin);
        templatesUrl.searchParams.set('ts', `${Date.now()}`);
        fetch(templatesUrl.toString(), { signal: controller.signal, cache: 'no-store' })
            .then(r => r.ok ? r.json() : [])
            .then(async (rows: Array<{ id: string; design_group_id: string | null; posterType?: string }>) => {
                if (!Array.isArray(rows) || rows.length === 0) {
                    return;
                }
                const starmaps = rows.filter(r => r.design_group_id && (r.posterType ?? 'starmap') === 'starmap');
                const design001 = starmaps.find(r => /-design001$/i.test(r.design_group_id || '')) || starmaps[0];
                if (design001) {
                    await withTimeout(fetchAndApplyTemplate(design001.id, { designGroupId: design001.design_group_id || undefined }));
                }
            })
            .catch(() => {})
            .finally(() => {
                window.clearTimeout(bootstrapTimeout);
                finishLoading();
            });
        return () => {
            cancelled = true;
            window.clearTimeout(bootstrapTimeout);
            controller.abort();
        };
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // Auto-save restore — offer to reload from localStorage on first mount (only if no template in URL)
    useEffect(() => {
        if (templateId || slug) return; // template/listing URL overrides autosave
        try {
            const raw = localStorage.getItem(AUTO_SAVE_KEY);
            if (!raw) return;
            const { ts, state } = JSON.parse(raw);
            // Only offer restore if saved within last 7 days and has meaningful content
            const ageHours = (Date.now() - ts) / 3600000;
            if (ageHours > 168 || !state?.title) return;
            toast({
                title: 'Resume previous design?',
                description: `Saved ${Math.round(ageHours)}h ago — "${state.title}"`,
                status: 'info',
                duration: null,
                isClosable: true,
                position: 'bottom-right',
                render: ({ onClose }) => (
                    <Box bg="white" border="1px" borderColor="gray.200" borderRadius="lg" p={4} boxShadow="lg" maxW="320px">
                        <Text fontWeight="600" fontSize="sm" mb={1}>Resume previous design?</Text>
                        <Text fontSize="xs" color="gray.500" mb={3}>
                            Saved {Math.round(ageHours)}h ago — "{state.title}"
                        </Text>
                        <HStack spacing={2}>
                            <Button size="xs" bg="gray.900" color="white" _hover={{ bg: 'gray.700' }}
                                onClick={() => {
                                    const patch: Record<string, unknown> = { ...state };
                                    if (typeof patch.date === 'string') patch.date = new Date(patch.date as string);
                                    useStore.setState(patch as unknown as Parameters<typeof useStore.setState>[0]);
                                    onClose();
                                }}>
                                Restore
                            </Button>
                            <Button size="xs" variant="ghost" onClick={() => {
                                localStorage.removeItem(AUTO_SAVE_KEY);
                                onClose();
                            }}>
                                Discard
                            </Button>
                        </HStack>
                    </Box>
                ),
            });
        } catch { /* ignore */ }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const [previewDimensions, setPreviewDimensions] = useState({ width: 0, height: 0 });
    const [isDragging, setIsDragging] = useState(false);
    const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
    // Touch pinch state
    const [touchStartDist, setTouchStartDist] = useState<number | null>(null);
    const [touchStartZoom, setTouchStartZoom] = useState(1);
    // Ref so window-level move handler always reads the current editing state (avoids stale closure)
    const isInlineEditingRef = useRef(false);
    // Use a Zustand subscribe instead of useEffect so the ref updates SYNCHRONOUSLY
    // when setIsInlineEditing is called from a D3 native event handler.
    // useEffect only runs after React re-renders, which is too late — the dblclick
    // event fires before the next render, so the ref would still be stale.
    useEffect(() => {
        return useStore.subscribe((state) => {
            isInlineEditingRef.current = state.isInlineEditing;
        });
    }, []);

    // ── Load template from URL ──────────────────────────────────────────────
    useEffect(() => {
        // Check for shared design state in ?d= query param first
        const params = new URLSearchParams(window.location.search);
        const encoded = params.get('d');
        if (encoded) {
            try {
                const c = JSON.parse(decodeURIComponent(escape(atob(encoded))));
                const store = useStore.getState();
                // Mode & shape
                if (c.posterType) store.setPosterType(c.posterType);
                if (c.maskShape) store.setMaskShape(c.maskShape);
                if (c.designStyle) store.setDesignStyle(c.designStyle);
                if (typeof c.isLightMode === 'boolean') store.setIsLightMode(c.isLightMode);
                if (c.borderStyle) store.setBorderStyle(c.borderStyle);
                // Colors
                if (c.posterColor) store.setPosterColor(c.posterColor);
                if (c.textColor) store.setTextColor(c.textColor);
                if (c.starColor) store.setStarColor(c.starColor);
                if (c.mapInteriorColor) store.setMapInteriorColor(c.mapInteriorColor);
                // Visibility
                if (typeof c.showBorder === 'boolean') store.setShowBorder(c.showBorder);
                if (typeof c.showFrame === 'boolean') store.setShowFrame(c.showFrame);
                if (c.frameInset != null) store.setFrameInset(c.frameInset);
                if (c.frameWidth != null) store.setFrameWidth(c.frameWidth);
                if (typeof c.showLocation === 'boolean') store.setShowLocation(c.showLocation);
                if (typeof c.showDate === 'boolean') store.setShowDate(c.showDate);
                if (typeof c.showCoords === 'boolean') store.setShowCoords(c.showCoords);
                if (typeof c.showDivider === 'boolean') store.setShowDivider(c.showDivider);
                if (c.dividerLength != null) store.setDividerLength(c.dividerLength);
                if (c.dividerThickness != null) store.setDividerThickness(c.dividerThickness);
                if (typeof c.showConstellations === 'boolean') store.setShowConstellations(c.showConstellations);
                if (typeof c.showMilkyWay === 'boolean') store.setShowMilkyWay(c.showMilkyWay);
                if (typeof c.showGrid === 'boolean') store.setShowGrid(c.showGrid);
                if (c.gridWidth != null) store.setGridWidth(c.gridWidth);
                if (c.gridOpacity != null) store.setGridOpacity(c.gridOpacity);
                // Rings & decorations
                if (typeof c.showInnerRing === 'boolean') store.setShowInnerRing(c.showInnerRing);
                if (c.innerRingWidth != null) store.setInnerRingWidth(c.innerRingWidth);
                if (c.innerRingInset != null) store.setInnerRingInset(c.innerRingInset);
                if (typeof c.showOuterRing === 'boolean') store.setShowOuterRing(c.showOuterRing);
                if (c.outerRingWidth != null) store.setOuterRingWidth(c.outerRingWidth);
                if (c.outerRingGap != null) store.setOuterRingGap(c.outerRingGap);
                if (typeof c.showHeartDecor === 'boolean') store.setShowHeartDecor(c.showHeartDecor);
                // Vertical separator
                if (typeof c.showVertSep === 'boolean') store.setShowVertSep(c.showVertSep);
                if (c.vertSepHeight != null) store.setVertSepHeight(c.vertSepHeight);
                if (c.vertSepThickness != null) store.setVertSepThickness(c.vertSepThickness);
                if (c.vertSepOffsetY != null) store.setVertSepOffsetY(c.vertSepOffsetY);
                // Text content
                if (c.title != null) store.setCustomText('title', c.title);
                if (c.subtitle != null) store.setCustomText('subtitle', c.subtitle);
                if (c.customDate != null) store.setCustomText('date', c.customDate);
                if (c.customLocation != null) store.setCustomText('location', c.customLocation);
                if (c.customCoords != null) store.setCustomText('coords', c.customCoords);
                if (c.customDedication != null) store.setCustomText('dedication', c.customDedication);
                if (c.customNames != null) store.setCustomText('names', c.customNames);
                // Star map location & time
                if (c.location) store.setLocation(c.location);
                if (c.lat) store.setLat(c.lat);
                if (c.lng) store.setLng(c.lng);
                if (c.date) store.setDate(new Date(c.date));
                if (c.time) store.setTime(c.time);
                // Fonts
                if (c.titleFont) store.setTitleFont(c.titleFont);
                if (c.subtitleFont) store.setSubtitleFont(c.subtitleFont);
                if (c.detailsFont) store.setDetailsFont(c.detailsFont);
                if (c.dedicationFont) store.setDedicationFont(c.dedicationFont);
                if (c.namesFont) store.setNamesFont(c.namesFont);
                // Font sizes
                if (c.titleFontSize) store.setTitleFontSize(c.titleFontSize);
                if (c.subtitleFontSize) store.setSubtitleFontSize(c.subtitleFontSize);
                if (c.detailsFontSize) store.setDetailsFontSize(c.detailsFontSize);
                if (c.dedicationFontSize) store.setDedicationFontSize(c.dedicationFontSize);
                if (c.namesFontSize) store.setNamesFontSize(c.namesFontSize);
                // Kerning
                if (c.titleKerning != null) store.setTitleKerning(c.titleKerning);
                if (c.subtitleKerning != null) store.setSubtitleKerning(c.subtitleKerning);
                if (c.detailsKerning != null) store.setDetailsKerning(c.detailsKerning);
                if (c.dedicationKerning != null) store.setDedicationKerning(c.dedicationKerning);
                if (c.namesKerning != null) store.setNamesKerning(c.namesKerning);
                // Text position offsets
                if (c.titleOffsetX != null) store.setTitleOffsetX(c.titleOffsetX);
                if (c.titleOffsetY != null) store.setTitleOffsetY(c.titleOffsetY);
                if (c.subtitleOffsetY != null) store.setSubtitleOffsetY(c.subtitleOffsetY);
                if (c.detailsOffsetY != null) store.setDetailsOffsetY(c.detailsOffsetY);
                if (c.dedicationOffsetY != null) store.setDedicationOffsetY(c.dedicationOffsetY);
                if (c.namesOffsetY != null) store.setNamesOffsetY(c.namesOffsetY);
                if (c.heartDecorOffsetY != null) store.setHeartDecorOffsetY(c.heartDecorOffsetY);
                if (c.dividerOffsetY != null) store.setDividerOffsetY(c.dividerOffsetY);
                // Names & text flags
                if (typeof c.showNames === 'boolean') store.setShowNames(c.showNames);
                if (typeof c.titleAllCaps === 'boolean') store.setTitleAllCaps(c.titleAllCaps);
                // Shape
                if (c.circleSize != null) store.setCircleSize(c.circleSize);
                if (c.heartSize != null) store.setHeartSize(c.heartSize);
                if (c.houseSize != null) store.setHouseSize(c.houseSize);
                if (c.shapeOutlineWidth != null) store.setShapeOutlineWidth(c.shapeOutlineWidth);
                if (c.shapeOffsetY != null) store.setShapeOffsetY(c.shapeOffsetY);
                if (c.shapeOffsetX != null) store.setShapeOffsetX(c.shapeOffsetX);
                // Star map
                if (c.starScale != null) store.setStarScale(c.starScale);
                if (c.lineWeight != null) store.setLineWeight(c.lineWeight);
                if (c.glowIntensity != null) store.setGlowIntensity(c.glowIntensity);
                if (c.finelineWidth != null) store.setFinelineWidth(c.finelineWidth);
                // Map
                if (c.mapCity) store.setMapCity(c.mapCity);
                if (c.mapCenterLat) store.setMapCenterLat(c.mapCenterLat);
                if (c.mapCenterLng) store.setMapCenterLng(c.mapCenterLng);
                if (c.mapZoom) store.setMapZoom(c.mapZoom);
                if (c.mapBearing != null) store.setMapBearing(c.mapBearing);
                if (c.mapStyleUrl !== undefined) store.setMapStyleUrl(c.mapStyleUrl);
                if (c.mapBgColor) store.setMapBgColor(c.mapBgColor);
                if (c.mapStreetColor) store.setMapStreetColor(c.mapStreetColor);
                if (c.mapColorPreset) store.setMapColorPreset(c.mapColorPreset);
                // Location pin
                if (typeof c.showLocationPin === 'boolean') store.setShowLocationPin(c.showLocationPin);
                if (c.locationPinSize != null) store.setLocationPinSize(c.locationPinSize);
                if (c.locationPinOffsetX != null) store.setLocationPinOffsetX(c.locationPinOffsetX);
                if (c.locationPinOffsetY != null) store.setLocationPinOffsetY(c.locationPinOffsetY);
                // Print size
                if (c.printSize) store.setPrintSize(c.printSize);
            } catch { /* ignore malformed ?d= */ }
            // Fall through to listing/template load if on a listing or template URL —
            // ?d= state is applied as an override on top of the template base settings.
            if (!templateId && !slug) {
                setTemplateLoading(false);
                return;
            }
        }
        if (!encoded && templateId) {
            fetchAndApplyTemplate(templateId).finally(() => setTemplateLoading(false));
            trackEvent('template_load', { templateId });
        }
        if (slug) {
            // Listing page — fetch design groups and auto-load the default (first 8x10) template.
            // When ?d= is present, still load the listing groups for the sidebar design picker,
            // but skip fetchAndApplyTemplate so the ?d= state isn't overwritten.
            const listingUrl = new URL(`${API_URL}/api/listings/${slug}`, window.location.origin);
            listingUrl.searchParams.set('ts', `${Date.now()}`);
            fetch(listingUrl.toString(), { cache: 'no-store' })
                .then(r => r.ok ? r.json() : null)
                .then(listing => {
                    if (!listing?.templates?.length) return;
                    // Build design groups using design_group_id (templates are ordered by created_at ASC,
                    // so group insertion order matches Design001 → Design002 → ... naturally).
                    const groupMap = new Map<string, DesignGroup>();
                    for (const t of listing.templates) {
                        const groupId: string = t.design_group_id || t.id;
                        // Group name: strip size suffix from template name (e.g. "Design001 — 8×10"" → "Design001")
                        const nameParts = (t.name as string).split(' — ');
                        const groupName = nameParts.length > 1 ? nameParts.slice(0, -1).join(' — ') : t.name;
                        const sizeLabel = nameParts.length > 1 ? nameParts[nameParts.length - 1] : t.fulfillment_size || t.name;
                        if (!groupMap.has(groupId)) {
                            groupMap.set(groupId, { id: groupId, name: groupName, sizes: [] });
                        }
                        groupMap.get(groupId)!.sizes.push({
                            id: t.id,
                            name: sizeLabel,
                            thumbnail_path: t.thumbnail_path,
                            fulfillment_size: t.fulfillment_size,
                            sell_price_cents: t.sell_price_cents,
                        });
                    }
                    const groups = Array.from(groupMap.values());
                    setDesignGroups(groups);

                    // Resolve target design group from URL `designSlug`, else first group.
                    // designSlug matches by either:
                    //   - exact group id (e.g. "sm001-design002")
                    //   - the trailing "designNNN" segment of the group id (e.g. "design002")
                    //   - the kebab-cased group name (e.g. "design-002" → matches "Design 002")
                    const allTemplates = listing.templates as Array<{id: string; fulfillment_size?: string; design_group_id?: string}>;
                    let targetGroupId = groups[0]?.id;
                    if (designSlug) {
                        const ds = designSlug.toLowerCase();
                        const match = groups.find(g =>
                            g.id.toLowerCase() === ds
                            || g.id.toLowerCase().endsWith('-' + ds)
                            || g.name.toLowerCase().replace(/\s+/g, '-') === ds
                        );
                        if (match) targetGroupId = match.id;
                    }

                    trackEvent('design_view', { slug, designSlug: designSlug || null, designGroupId: targetGroupId });

                    // Skip template apply if ?d= state is present — the shared state takes precedence
                    if (encoded) {
                        setTemplateLoading(false);
                        return;
                    }

                    const preferred = allTemplates.find(t => t.design_group_id === targetGroupId && t.fulfillment_size === '8x10')
                        || allTemplates.find(t => t.design_group_id === targetGroupId)
                        || allTemplates.find(t => t.fulfillment_size === '8x10')
                        || allTemplates[0];
                    if (preferred) {
                        const preferredGroup = groups.find(g => g.sizes.some(sz => sz.id === preferred.id));
                        fetchAndApplyTemplate(preferred.id, {
                            designGroupId: preferredGroup?.id ?? targetGroupId,
                        }).finally(() => setTemplateLoading(false));
                    } else {
                        setTemplateLoading(false);
                    }
                })
                .catch(() => setTemplateLoading(false));
        }
    }, [templateId, slug, designSlug]);

    // ── Street map capture ───────────────────────────────────────────────────
    const handleMapCapture = useCallback((dataUrl: string) => {
        // Clear any drag offset from the previous image — the new capture is
        // already centred at the new map position, so offset must be reset to 0.
        useStore.getState().setMapImageOffsetX(0);
        useStore.getState().setMapImageOffsetY(0);
        setMapBackgroundImage(dataUrl);
    }, [setMapBackgroundImage]);

    useEffect(() => {
        if (posterType === 'starmap') {
            setMapBackgroundImage(null);
        }
    }, [posterType, setMapBackgroundImage]);

    // ── Preview dimensions ───────────────────────────────────────────────────
    useEffect(() => {
        const updateDimensions = () => {
            if (containerRef.current) {
                const { clientWidth, clientHeight } = containerRef.current;
                const isMobile = window.innerWidth < 768;
                const padding = isMobile ? 12 : 80;
                const availableWidth = clientWidth - padding * 2;
                const availableHeight = clientHeight - padding * 2;
                const aspectRatio = printSize.width / printSize.height;
                let width: number, height: number;
                if (availableWidth / availableHeight > aspectRatio) {
                    height = availableHeight;
                    width = height * aspectRatio;
                } else {
                    width = availableWidth;
                    height = width / aspectRatio;
                }
                setPreviewDimensions({ width, height });
            }
        };
        updateDimensions();
        window.addEventListener('resize', updateDimensions);
        return () => window.removeEventListener('resize', updateDimensions);
    }, [printSize]);

    // ── Keyboard shortcuts: Ctrl+Z undo, Ctrl+Y / Ctrl+Shift+Z redo ─────────
    useEffect(() => {
        const handler = (e: KeyboardEvent) => {
            const ctrl = e.ctrlKey || e.metaKey;
            if (!ctrl) return;
            if (e.key === 'z' && !e.shiftKey) { e.preventDefault(); undo(); }
            if (e.key === 'y' || (e.key === 'z' && e.shiftKey)) { e.preventDefault(); redo(); }
        };
        window.addEventListener('keydown', handler);
        return () => window.removeEventListener('keydown', handler);
    }, [undo, redo]);

    // ── Mouse Zoom / Pan ─────────────────────────────────────────────────────
    const handleWheel = (e: React.WheelEvent) => {
        if (e.ctrlKey || e.metaKey) {
            e.preventDefault();
            e.stopPropagation();
            const delta = e.deltaY * -0.005;
            setPreviewZoom(Math.min(Math.max(0.5, previewZoom + delta), 3));
        }
    };

    const handleMouseDown = (e: React.MouseEvent) => {
        if (e.button === 0 && !isInlineEditingRef.current) {
            // Don't start poster pan when clicking on SVG text/interactive elements —
            // those have their own D3 drag handlers and should not also pan the poster.
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
        // Don't reset pan if inline editing just opened — the first click of a double-click
        // opens the editor (setting isInlineEditing=true synchronously via D3 → Zustand),
        // so the second click's dblclick event fires with isInlineEditingRef already true.
        if (isInlineEditingRef.current) return;
        setPreviewPanX(0);
        setPreviewPanY(0);
    };

    // ── Touch Pinch-to-zoom / Pan ────────────────────────────────────────────
    const getTouchDist = (touches: React.TouchList) => {
        const dx = touches[0].clientX - touches[1].clientX;
        const dy = touches[0].clientY - touches[1].clientY;
        return Math.sqrt(dx * dx + dy * dy);
    };

    const handleTouchStart = (e: React.TouchEvent) => {
        if (e.touches.length === 2) {
            setTouchStartDist(getTouchDist(e.touches));
            setTouchStartZoom(previewZoom);
        } else if (e.touches.length === 1 && !isInlineEditingRef.current) {
            setIsDragging(true);
            setDragStart({
                x: e.touches[0].clientX - previewPanX,
                y: e.touches[0].clientY - previewPanY,
            });
        }
    };

    // Non-passive touchmove so we can call preventDefault (prevents scroll interference)
    const handleTouchMoveNative = useCallback((e: TouchEvent) => {
        if (e.touches.length === 2 && touchStartDist !== null) {
            e.preventDefault();
            const dx = e.touches[0].clientX - e.touches[1].clientX;
            const dy = e.touches[0].clientY - e.touches[1].clientY;
            const dist = Math.sqrt(dx * dx + dy * dy);
            const scale = dist / touchStartDist;
            setPreviewZoom(Math.min(Math.max(0.5, touchStartZoom * scale), 3));
        } else if (e.touches.length === 1 && isDragging && !isInlineEditingRef.current) {
            e.preventDefault();
            setPreviewPanX(e.touches[0].clientX - dragStart.x);
            setPreviewPanY(e.touches[0].clientY - dragStart.y);
        }
    }, [touchStartDist, touchStartZoom, isDragging, dragStart, setPreviewZoom, setPreviewPanX, setPreviewPanY]);

    const handleTouchEnd = () => {
        setIsDragging(false);
        setTouchStartDist(null);
    };

    useEffect(() => {
        const el = containerRef.current;
        if (!el) return;
        el.addEventListener('touchmove', handleTouchMoveNative, { passive: false });
        return () => el.removeEventListener('touchmove', handleTouchMoveNative);
    }, [handleTouchMoveNative]);

    // ── Sidebar resize drag ──────────────────────────────────────────────────
    const handleSidebarDragStart = useCallback((e: React.MouseEvent) => {
        e.preventDefault();
        sidebarDragRef.current = true;
        const onMove = (ev: MouseEvent) => {
            if (!sidebarDragRef.current) return;
            // Sidebar is on the right; dragging left = wider, right = narrower
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

    return (
        <>
        {/* Skip-to-content for keyboard users */}
        <Box
            as="a" href="#sidebar-controls"
            position="absolute" top="-100px" left={2} zIndex={9999}
            bg="gray.900" color="white" px={3} py={2} borderRadius="md" fontSize="sm"
            _focus={{ top: 2 }}
        >
            Skip to controls
        </Box>
        <Flex
            h={{ base: 'auto', md: '100vh' }}
            minH="100vh"
            overflow={{ base: 'visible', md: 'hidden' }}
            bg="gray.50"
            flexDirection={{ base: 'column', md: 'row' }}
        >
            {/* ── Preview area ──────────────────────────────────────────── */}
            <Box
                ref={containerRef}
                as="main"
                aria-label="Poster preview"
                // Mobile: sticky so preview stays visible while controls scroll
                // Desktop: fill remaining width
                flex={{ base: 'none', md: '1' }}
                h={{ base: '45vh', md: '100vh' }}
                w={{ base: '100%', md: 'auto' }}
                display="flex"
                alignItems="center"
                justifyContent="center"
                bg="gray.50"
                p={{ base: 3, md: 8 }}
                overflow="hidden"
                position={{ base: 'sticky', md: 'relative' }}
                top={{ base: 0, md: 'auto' }}
                zIndex={{ base: 20, md: 'auto' }}
                onWheelCapture={handleWheel}
                onMouseDown={handleMouseDown}
                onDoubleClick={handleDoubleClick}
                onTouchStart={handleTouchStart}
                onTouchEnd={handleTouchEnd}
                cursor={isDragging ? 'grabbing' : 'grab'}
                userSelect="none"
                // Prevent browser default touch behaviours (scroll, zoom) on preview
                style={{ touchAction: 'none' }}
            >
                {/* Undo / Redo buttons */}
                <Box
                    position="absolute"
                    top={4}
                    left={4}
                    zIndex={100}
                    bg="white"
                    borderRadius="md"
                    border="1px solid"
                    borderColor="gray.200"
                    boxShadow="sm"
                    overflow="hidden"
                >
                    <HStack spacing={0}>
                        <Button
                            size="xs"
                            variant="ghost"
                            borderRadius={0}
                            isDisabled={!canUndo}
                            onClick={undo}
                            title="Undo (Ctrl+Z)"
                            px={3}
                            py={2}
                            h="auto"
                            fontSize="13px"
                            color="gray.600"
                            _hover={{ bg: 'gray.50' }}
                            _disabled={{ opacity: 0.35, cursor: 'not-allowed' }}
                        >
                            ↩
                        </Button>
                        <Box w="1px" bg="gray.200" h="24px" />
                        <Button
                            size="xs"
                            variant="ghost"
                            borderRadius={0}
                            isDisabled={!canRedo}
                            onClick={redo}
                            title="Redo (Ctrl+Y)"
                            px={3}
                            py={2}
                            h="auto"
                            fontSize="13px"
                            color="gray.600"
                            _hover={{ bg: 'gray.50' }}
                            _disabled={{ opacity: 0.35, cursor: 'not-allowed' }}
                        >
                            ↪
                        </Button>
                        <Box w="1px" bg="gray.200" h="24px" />
                        <Tooltip label="Copy poster as image" placement="bottom" fontSize="xs" openDelay={500}>
                            <Button
                                size="xs"
                                variant="ghost"
                                borderRadius={0}
                                onClick={handleCopyImage}
                                isLoading={isCopying}
                                px={3}
                                py={2}
                                h="auto"
                                fontSize="11px"
                                color="gray.500"
                                _hover={{ bg: 'gray.50', color: 'gray.900' }}
                            >
                                ⧉
                            </Button>
                        </Tooltip>
                    </HStack>
                </Box>

                {/* Zoom controls — desktop only (mobile uses pinch-to-zoom) */}
                <Box
                    display={{ base: 'none', md: 'block' }}
                    position="absolute"
                    top={4}
                    right={4}
                    bg="white"
                    p={3}
                    borderRadius="md"
                    border="1px solid"
                    borderColor="gray.200"
                    boxShadow="sm"
                    minW="180px"
                    zIndex={100}
                >
                    <VStack spacing={2} align="stretch">
                        <HStack justify="space-between">
                            <Text fontSize="xs" fontWeight="600" color="gray.700">Zoom</Text>
                            <Text fontSize="xs" color="gray.500" fontWeight="600">
                                {Math.round(previewZoom * 100)}%
                            </Text>
                        </HStack>
                        <HStack spacing={1} mb={2}>
                            <Button size="xs" onClick={() => setPreviewZoom(Math.max(0.5, previewZoom - 0.1))}>-</Button>
                            <Slider flex="1" value={previewZoom} min={0.5} max={3.0} step={0.1}
                                onChange={setPreviewZoom} aria-label="zoom-slider">
                                <SliderTrack bg="gray.200">
                                    <SliderFilledTrack bg="gray.900" />
                                </SliderTrack>
                                <SliderThumb boxSize={3} borderColor="gray.300" borderWidth="1px" />
                            </Slider>
                            <Button size="xs" onClick={() => setPreviewZoom(Math.min(3.0, previewZoom + 0.1))}>+</Button>
                        </HStack>
                    </VStack>
                </Box>

                {/* Mobile zoom reset hint — tap to reset */}
                <Box
                    display={{ base: 'block', md: 'none' }}
                    position="absolute"
                    top={2}
                    right={2}
                    zIndex={100}
                >
                    <Button
                        size="xs"
                        variant="ghost"
                        color="gray.500"
                        fontSize="10px"
                        px={2}
                        py={1}
                        h="auto"
                        onClick={() => { setPreviewZoom(1); setPreviewPanX(0); setPreviewPanY(0); }}
                    >
                        Reset
                    </Button>
                </Box>

                {/* Fullscreen toggle — desktop only */}
                <Box
                    display={{ base: 'none', md: 'flex' }}
                    gap={2}
                    position="absolute"
                    bottom={4}
                    right={4}
                    zIndex={100}
                >
                    <Button
                        size="xs"
                        variant="ghost"
                        color="gray.400"
                        fontSize="11px"
                        px={2} py={1} h="auto"
                        _hover={{ color: 'gray.700', bg: 'white' }}
                        onClick={() => setIsFullscreen(f => !f)}
                        title={isFullscreen ? 'Exit fullscreen preview' : 'Fullscreen preview'}
                    >
                        {isFullscreen ? '✕ Exit fullscreen' : '⛶ Fullscreen'}
                    </Button>
                </Box>

                {/* Loading spinner for listing/template pages */}
                {templateLoading && (
                    <Box position="absolute" inset={0} display="flex" alignItems="center" justifyContent="center" zIndex={200} bg="gray.50">
                        <VStack spacing={3}>
                            <Box as="div" w="24px" h="24px" border="2px solid" borderColor="gray.300" borderTopColor="gray.600" borderRadius="full"
                                animation="spin 0.6s linear infinite" />
                            <Text fontSize="xs" color="gray.400">Loading design...</Text>
                        </VStack>
                    </Box>
                )}

                {/* Poster Preview */}
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
                        opacity={templateLoading ? 0 : 1}
                    >
                        <VectorStarMap />
                        {/* DEMO watermark overlay — matches the watermark baked into exports */}
                        <Box
                            position="absolute"
                            inset={0}
                            pointerEvents="none"
                            overflow="hidden"
                            zIndex={5}
                            aria-hidden
                        >
                            {/* Diagonal DEMO tiles — same pattern as drawDemoWatermark in renderPoster.ts */}
                            {Array.from({ length: 12 }).map((_, i) => (
                                <Text
                                    key={i}
                                    position="absolute"
                                    left={`${(i % 4) * 30 - 10}%`}
                                    top={`${Math.floor(i / 4) * 36 - 5}%`}
                                    fontSize="13%"
                                    fontWeight="bold"
                                    color="white"
                                    opacity={0.18}
                                    transform="rotate(-36deg)"
                                    fontFamily="Arial, sans-serif"
                                    letterSpacing="0.05em"
                                    whiteSpace="nowrap"
                                    userSelect="none"
                                >
                                    DEMO
                                </Text>
                            ))}
                        </Box>
                </Box>

                {/* Offscreen street map renderer */}
                {posterType !== 'starmap' && (
                    <Box
                        position="fixed"
                        top="-9999px"
                        left="-9999px"
                        width="1200px"
                        height="1200px"
                        pointerEvents="none"
                        aria-hidden
                    >
                        <React.Suspense fallback={null}>
                            <StreetMapCapture onCapture={handleMapCapture} />
                        </React.Suspense>
                    </Box>
                )}
            </Box>

            {/* ── Sidebar controls ──────────────────────────────────────── */}
            {!isFullscreen && (
            <Box
                id="sidebar-controls"
                as="aside"
                aria-label="Poster design controls"
                // Mobile: full width below preview, natural height (page scrolls)
                // Desktop: resizable column on the right, scrolls internally
                w={{ base: '100%', md: `${sidebarWidth}px` }}
                minW={{ base: 'unset', md: '280px' }}
                flex={{ base: 'none', md: 'none' }}
                h={{ base: 'auto', md: '100vh' }}
                overflowY={{ base: 'visible', md: 'auto' }}
                borderLeft={{ base: 'none', md: '1px' }}
                borderTop={{ base: '1px', md: 'none' }}
                borderColor="gray.200"
                bg="white"
                zIndex={{ base: 1, md: 10 }}
                position="relative"
            >
                {/* Drag handle — desktop only */}
                <Box
                    display={{ base: 'none', md: 'block' }}
                    position="absolute"
                    left="-4px"
                    top={0}
                    bottom={0}
                    w="8px"
                    cursor="col-resize"
                    zIndex={20}
                    onMouseDown={handleSidebarDragStart}
                    _hover={{ bg: 'blue.100', opacity: 0.6 }}
                    transition="background 0.15s"
                />
                <SidebarControls designGroups={designGroups} />
            </Box>
            )}
        </Flex>
        </>
    );
};

export default MainLayout;
