import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { geoStereographic, geoPath, geoGraticule } from 'd3-geo';
import { select } from 'd3-selection';
import { scaleLinear } from 'd3-scale';
import { drag } from 'd3-drag';
import { useStore } from '../store/useStore';
import { useShallow } from 'zustand/react/shallow';
import { getProjectionRotation } from '../utils/astronomy';
import { format } from 'date-fns';
import { useDebounce } from '../hooks/useDebounce';

interface StarFeature {
    type: 'Feature';
    properties: {
        mag: number;
        [key: string]: any;
    };
    geometry: {
        type: 'Point';
        coordinates: [number, number];
    };
}

interface ConstellationFeature {
    type: 'Feature';
    geometry: {
        type: 'MultiLineString';
        coordinates: number[][][];
    };
    properties: {
        [key: string]: any;
    };
}

const VectorStarMap: React.FC = () => {
    const svgRef = useRef<SVGSVGElement>(null);
    const inlineEditInputRef = useRef<HTMLInputElement>(null);
    const [starsData, setStarsData] = useState<any>(null);
    const [constellationsData, setConstellationsData] = useState<any>(null);

    // Snap guide line visibility (shown while dragging shape near vertical center)
    const [snapGuideX, setSnapGuideX] = useState(false);

    // Live bounding rect for the inline editor — updated after CSS transitions settle
    const [liveEditRect, setLiveEditRect] = useState<{ left: number; top: number; width: number; height: number } | null>(null);

    const [inlineEdit, setInlineEdit] = useState<{
        field: 'title' | 'subtitle' | 'date' | 'location' | 'coords' | 'dedication' | 'names';
        value: string;
        svgEl: SVGTextElement;
        editRect: { left: number; top: number; width: number; height: number };
        fontFamily: string;
        fontSize: number;
        uppercase?: boolean;
    } | null>(null);

    const {
        title, subtitle, date, time, lat, lng, location, starScale, lineWeight, gridWidth,
        posterColor, textColor, glowIntensity, gridOpacity, showBorder, showConstellations,
        showGrid, designStyle, maskShape, isLightMode, showLocation, showDate,
        showCoords, customText, printSize, circleSize, heartSize, houseSize, shapeOffsetY, titleFontSize,
        subtitleFontSize, detailsFontSize, dedicationFontSize, namesFontSize, titleOffsetX, titleOffsetY, subtitleOffsetY,
        detailsOffsetY, dedicationOffsetY, namesOffsetY, heartDecorOffsetY, dividerOffsetY, shapeOutlineWidth, showFrame, frameInset, frameWidth,
        titleFont, subtitleFont, detailsFont, dedicationFont, namesFont,
        titleKerning, subtitleKerning, detailsKerning, dedicationKerning, namesKerning,
        titleAllCaps,
        showNames,
        mapBackgroundImage, borderStyle, selectedTemplate, starColor, mapInteriorColor,
        showDivider, dividerLength, dividerThickness,
        vertSepOffsetY, setVertSepOffsetY,
        showVertSep, vertSepHeight, vertSepThickness, setShowVertSep, setVertSepHeight, setVertSepThickness,
        setTitleOffsetX, setTitleOffsetY, setSubtitleOffsetY, setDetailsOffsetY, setDedicationOffsetY, setHeartDecorOffsetY, setDividerOffsetY, setDividerLength, setDividerThickness,
        posterType, mapImageOffsetX, mapImageOffsetY, mapImageOpacity, setMapImageOffsetX, setMapImageOffsetY,
        mapStreetColor, setCustomText,
        setTitleFontSize, setSubtitleFontSize, setDetailsFontSize, setDedicationFontSize, setNamesFontSize,
        setNamesOffsetY,
        setIsInlineEditing,
        setActiveTypoField,
        pendingGlyphForInlineEdit, setPendingGlyphForInlineEdit,
        // previewZoom intentionally excluded — all usages already use useStore.getState()
        // inside D3 event handlers, so it doesn't need to be in the reactive selector.
        showLocationPin, locationPinSize,
        locationPinOffsetX, locationPinOffsetY,
        setLocationPinOffsetX, setLocationPinOffsetY,
        shapeOffsetX, setShapeOffsetX, setShapeOffsetY,
        snapEnabled,
        showInnerRing, innerRingWidth, innerRingInset,
        showOuterRing, outerRingWidth, outerRingGap,
        showHeartDecor,
    } = useStore(useShallow(s => ({
        title: s.title, subtitle: s.subtitle, date: s.date, time: s.time,
        lat: s.lat, lng: s.lng, location: s.location,
        starScale: s.starScale, lineWeight: s.lineWeight, gridWidth: s.gridWidth,
        posterColor: s.posterColor, textColor: s.textColor, glowIntensity: s.glowIntensity,
        gridOpacity: s.gridOpacity, showBorder: s.showBorder, showConstellations: s.showConstellations,
        showGrid: s.showGrid, designStyle: s.designStyle, maskShape: s.maskShape,
        isLightMode: s.isLightMode, showLocation: s.showLocation, showDate: s.showDate,
        showCoords: s.showCoords, customText: s.customText, printSize: s.printSize,
        circleSize: s.circleSize, heartSize: s.heartSize, houseSize: s.houseSize,
        shapeOffsetY: s.shapeOffsetY, shapeOffsetX: s.shapeOffsetX, snapEnabled: s.snapEnabled,
        titleFontSize: s.titleFontSize, subtitleFontSize: s.subtitleFontSize,
        detailsFontSize: s.detailsFontSize, dedicationFontSize: s.dedicationFontSize, namesFontSize: s.namesFontSize,
        titleOffsetX: s.titleOffsetX, titleOffsetY: s.titleOffsetY, subtitleOffsetY: s.subtitleOffsetY,
        detailsOffsetY: s.detailsOffsetY, dedicationOffsetY: s.dedicationOffsetY,
        namesOffsetY: s.namesOffsetY, heartDecorOffsetY: s.heartDecorOffsetY, dividerOffsetY: s.dividerOffsetY,
        shapeOutlineWidth: s.shapeOutlineWidth, showFrame: s.showFrame,
        frameInset: s.frameInset, frameWidth: s.frameWidth,
        titleFont: s.titleFont, subtitleFont: s.subtitleFont, detailsFont: s.detailsFont,
        dedicationFont: s.dedicationFont, namesFont: s.namesFont,
        titleKerning: s.titleKerning, subtitleKerning: s.subtitleKerning,
        detailsKerning: s.detailsKerning, dedicationKerning: s.dedicationKerning, namesKerning: s.namesKerning,
        titleAllCaps: s.titleAllCaps, showNames: s.showNames,
        mapBackgroundImage: s.mapBackgroundImage, borderStyle: s.borderStyle,
        selectedTemplate: s.selectedTemplate, starColor: s.starColor, mapInteriorColor: s.mapInteriorColor,
        showDivider: s.showDivider, dividerLength: s.dividerLength, dividerThickness: s.dividerThickness,
        vertSepOffsetY: s.vertSepOffsetY,
        showVertSep: s.showVertSep, vertSepHeight: s.vertSepHeight, vertSepThickness: s.vertSepThickness,
        posterType: s.posterType, mapImageOffsetX: s.mapImageOffsetX, mapImageOffsetY: s.mapImageOffsetY,
        mapImageOpacity: s.mapImageOpacity, mapStreetColor: s.mapStreetColor,
        showLocationPin: s.showLocationPin, locationPinSize: s.locationPinSize,
        locationPinOffsetX: s.locationPinOffsetX, locationPinOffsetY: s.locationPinOffsetY,
        pendingGlyphForInlineEdit: s.pendingGlyphForInlineEdit,
        // Setters — stable references, won't cause re-renders but included for convenience
        setTitleOffsetX: s.setTitleOffsetX, setTitleOffsetY: s.setTitleOffsetY,
        setSubtitleOffsetY: s.setSubtitleOffsetY, setDetailsOffsetY: s.setDetailsOffsetY,
        setDedicationOffsetY: s.setDedicationOffsetY, setHeartDecorOffsetY: s.setHeartDecorOffsetY,
        setDividerOffsetY: s.setDividerOffsetY, setDividerLength: s.setDividerLength, setDividerThickness: s.setDividerThickness,
        setVertSepOffsetY: s.setVertSepOffsetY,
        setShowVertSep: s.setShowVertSep, setVertSepHeight: s.setVertSepHeight, setVertSepThickness: s.setVertSepThickness,
        setMapImageOffsetX: s.setMapImageOffsetX,
        setMapImageOffsetY: s.setMapImageOffsetY, setCustomText: s.setCustomText,
        setTitleFontSize: s.setTitleFontSize, setSubtitleFontSize: s.setSubtitleFontSize,
        setDetailsFontSize: s.setDetailsFontSize, setDedicationFontSize: s.setDedicationFontSize,
        setNamesFontSize: s.setNamesFontSize, setNamesOffsetY: s.setNamesOffsetY,
        setIsInlineEditing: s.setIsInlineEditing, setActiveTypoField: s.setActiveTypoField,
        setPendingGlyphForInlineEdit: s.setPendingGlyphForInlineEdit,
        setLocationPinOffsetX: s.setLocationPinOffsetX, setLocationPinOffsetY: s.setLocationPinOffsetY,
        setShapeOffsetX: s.setShapeOffsetX, setShapeOffsetY: s.setShapeOffsetY,
        showInnerRing: s.showInnerRing, innerRingWidth: s.innerRingWidth, innerRingInset: s.innerRingInset,
        showOuterRing: s.showOuterRing, outerRingWidth: s.outerRingWidth, outerRingGap: s.outerRingGap,
        showHeartDecor: s.showHeartDecor,
    })));

    // Keep a ref to inlineEdit so the pending-glyph effect always sees the latest value
    // without needing it in the dependency array (avoids circular re-runs)
    const inlineEditRef = useRef(inlineEdit);
    inlineEditRef.current = inlineEdit;

    // Sync inline editing state to store so MainLayout can block poster panning
    useEffect(() => {
        setIsInlineEditing(inlineEdit !== null);
    }, [inlineEdit, setIsInlineEditing]);

    // Re-capture the text element's bounding rect after CSS transitions settle (250ms).
    // This fixes position jumps when the poster was mid-transition when clicked.
    useLayoutEffect(() => {
        if (!inlineEdit) { setLiveEditRect(null); return; }
        const capture = () => {
            const fresh = inlineEdit.svgEl.getBoundingClientRect();
            setLiveEditRect({ left: fresh.left, top: fresh.top, width: fresh.width, height: fresh.height });
        };
        capture(); // immediate capture for initial render
        const t = setTimeout(capture, 260); // re-capture after transition (0.2s)
        return () => clearTimeout(t);
    }, [inlineEdit?.field]); // re-run only on new edit, not on value changes

    // Insert a pending glyph (from GlyphPicker) at the current cursor position in the inline edit input
    useEffect(() => {
        if (!pendingGlyphForInlineEdit) return;
        const edit = inlineEditRef.current;
        if (!edit) { setPendingGlyphForInlineEdit(null); return; }
        const input = inlineEditInputRef.current;
        const start = input ? (input.selectionStart ?? edit.value.length) : edit.value.length;
        const end   = input ? (input.selectionEnd   ?? start)             : start;
        const newVal = edit.value.slice(0, start) + pendingGlyphForInlineEdit + edit.value.slice(end);
        const newPos = start + pendingGlyphForInlineEdit.length;
        setInlineEdit({ ...edit, value: newVal });
        setPendingGlyphForInlineEdit(null);
        requestAnimationFrame(() => {
            if (inlineEditInputRef.current) {
                inlineEditInputRef.current.focus();
                inlineEditInputRef.current.setSelectionRange(newPos, newPos);
            }
        });
    }, [pendingGlyphForInlineEdit, setPendingGlyphForInlineEdit]);

    // Debounce frequently-changing values to prevent excessive re-renders
    const debouncedStarScale = useDebounce(starScale, 150);
    const debouncedLineWeight = useDebounce(lineWeight, 150);
    const debouncedCircleSize = useDebounce(circleSize, 150);
    const debouncedHeartSize = useDebounce(heartSize, 150);
    const debouncedHouseSize = useDebounce(houseSize, 150);
    const debouncedShapeOffsetY = useDebounce(shapeOffsetY, 150);
    const debouncedShapeOffsetX = useDebounce(shapeOffsetX, 150);
    const debouncedShapeOutlineWidth = useDebounce(shapeOutlineWidth, 150);
    const debouncedTitleKerning = useDebounce(titleKerning, 200);
    const debouncedSubtitleKerning = useDebounce(subtitleKerning, 200);
    const debouncedDetailsKerning = useDebounce(detailsKerning, 200);
    const debouncedDedicationKerning = useDebounce(dedicationKerning, 200);
    const debouncedNamesKerning = useDebounce(namesKerning, 200);

    // Calculate dimensions
    const width = 1200;
    const [rW, rH] = printSize.ratio.split('/').map(Number);
    const ratioVal = rW / rH;
    const height = width / ratioVal;

    // Fetch Data Effect (Runs once) — Cache API for offline support + faster repeat visits
    useEffect(() => {
        const STARS_URL = 'https://raw.githubusercontent.com/ofrohn/d3-celestial/master/data/stars.6.json';
        const CONSTELLATIONS_URL = 'https://raw.githubusercontent.com/ofrohn/d3-celestial/master/data/constellations.lines.json';
        const CACHE_NAME = 'star-data-v1';

        const fetchCached = async (url: string): Promise<any> => {
            try {
                const cache = await caches.open(CACHE_NAME);
                const cached = await cache.match(url);
                if (cached) return cached.json();
                const res = await fetch(url);
                if (res.ok) await cache.put(url, res.clone());
                return res.json();
            } catch {
                // CacheStorage not available (e.g. non-HTTPS dev) — fall through to direct fetch
                return fetch(url).then(r => r.json());
            }
        };

        const fetchData = async () => {
            try {
                const [stars, constellations] = await Promise.all([
                    fetchCached(STARS_URL),
                    fetchCached(CONSTELLATIONS_URL),
                ]);
                setStarsData(stars);
                setConstellationsData(constellations);
            } catch (error) {
                console.error('Error fetching star map data:', error);
            }
        };
        fetchData();
    }, []);

    // Setup SVG Layers Effect
    useEffect(() => {
        if (!svgRef.current) return;
        const svg = select(svgRef.current);

        svg.attr('viewBox', `0 0 ${width} ${height}`);

        // Background
        let bgRect = svg.select('rect.background-rect') as any;
        if (bgRect.empty()) {
            bgRect = svg.insert('rect', ':first-child').attr('class', 'background-rect') as any;
        }
        bgRect.attr('width', '100%').attr('height', '100%').attr('fill', posterColor);

        // Layers
        const layers = ['defs-layer', 'map-layer', 'frame-layer', 'text-layer'];
        layers.forEach(layerId => {
            if (svg.select(`g#${layerId}`).empty()) {
                if (layerId === 'defs-layer') {
                    svg.append('defs').attr('id', layerId);
                } else {
                    svg.append('g').attr('id', layerId);
                }
            }
        });

    }, [width, height, posterColor]);

    // Map Rendering Effect (Heavy)
    useEffect(() => {
        if (!svgRef.current || !starsData || !constellationsData) return;

        const svg = select(svgRef.current);
        const mapLayer = svg.select('#map-layer');
        const defsLayer = svg.select('#defs-layer');

        // Clear previous map content
        mapLayer.selectAll('*').remove();
        defsLayer.selectAll('*').remove();

        // --- Map Logic ---
        const RECT_MAP_H = height * 0.74; // rect mask: total map section height
        // Inset padding — creates white frame around the map (matches SVG reference: 50/800 = 6.25%)
        const RECT_MAP_PAD = width * 0.0625;
        const RECT_MAP_INNER_X = RECT_MAP_PAD;
        const RECT_MAP_INNER_Y = RECT_MAP_PAD;
        const RECT_MAP_INNER_W = width - 2 * RECT_MAP_PAD;
        const RECT_MAP_INNER_H = RECT_MAP_H - 2 * RECT_MAP_PAD;
        const baseMapRadius = Math.min(width, height) * 0.4;
        const mapRadius = maskShape === 'rect' ? RECT_MAP_INNER_W / 2 : baseMapRadius * (
            maskShape === 'circle' ? debouncedCircleSize :
            maskShape === 'heart'  ? debouncedHeartSize  :
                                     debouncedHouseSize
        );
        const center = maskShape === 'rect'
            ? [width / 2, RECT_MAP_INNER_Y + RECT_MAP_INNER_H / 2]
            : [width / 2 + debouncedShapeOffsetX, (height * 0.45) + debouncedShapeOffsetY];

        // Setup Clip Path
        const clipPath = defsLayer.append('clipPath').attr('id', 'map-clip');

        // Heart path (viewBox-less, bounding box ~122.88 × ~107)
        const userHeartPath = "M60.83,17.19C68.84,8.84,74.45,1.62,86.79,0.21c23.17-2.66,44.48,21.06,32.78,44.41 c-3.33,6.65-10.11,14.56-17.61,22.32c-8.23,8.52-17.34,16.87-23.72,23.2l-17.4,17.26L46.46,93.56C29.16,76.9,0.95,55.93,0.02,29.95 C-0.63,11.75,13.73,0.09,30.25,0.3C45.01,0.5,51.22,7.84,60.83,17.19L60.83,17.19L60.83,17.19z";
        const heartOrigWidth = 122.88;
        const heartOrigCX = 61.44;
        const heartOrigCY = 53.7;
        const getHeartTransform = (scaleMult: number = 1) => {
            const s = (mapRadius * 2.0 * scaleMult) / heartOrigWidth;
            return `translate(${center[0]}, ${center[1]}) scale(${s}) translate(-${heartOrigCX}, -${heartOrigCY})`;
        };

        // House path (viewBox 0 0 100 100, bounding box X:10-90 Y:0-90)
        const userHousePath = "M 20 90 L 20 40 L 10 40 L 50 0 L 60 10 L 60 2 L 70 2 L 70 20 L 90 40 L 80 40 L 80 90 Z";
        const houseOrigHeight = 90; // scale by height so shape fits vertically
        const houseOrigCX = 50;    // center of bounding box X: (10+90)/2
        const houseOrigCY = 45;    // center of bounding box Y: (0+90)/2
        const getHouseTransform = (scaleMult: number = 1) => {
            const s = (mapRadius * 2.0 * scaleMult) / houseOrigHeight;
            return `translate(${center[0]}, ${center[1]}) scale(${s}) translate(-${houseOrigCX}, -${houseOrigCY})`;
        };

        if (maskShape === 'rect') {
            clipPath.append('rect').attr('x', RECT_MAP_INNER_X).attr('y', RECT_MAP_INNER_Y).attr('width', RECT_MAP_INNER_W).attr('height', RECT_MAP_INNER_H);
        } else if (maskShape === 'heart') {
            clipPath.append('path').attr('d', userHeartPath).attr('transform', getHeartTransform(1));
        } else if (maskShape === 'house') {
            clipPath.append('path').attr('d', userHousePath).attr('transform', getHouseTransform(1));
        } else {
            clipPath.append('circle').attr('cx', center[0]).attr('cy', center[1]).attr('r', mapRadius);
        }

        // Setup Glow Filter
        const blurRadius = (glowIntensity / 10) * 8;
        const filter = defsLayer.append('filter').attr('id', 'star-glow').attr('x', '-100%').attr('y', '-100%').attr('width', '300%').attr('height', '300%');
        filter.append('feGaussianBlur').attr('stdDeviation', blurRadius).attr('result', 'coloredBlur');
        const feMerge = filter.append('feMerge');
        feMerge.append('feMergeNode').attr('in', 'coloredBlur');
        feMerge.append('feMergeNode').attr('in', 'SourceGraphic');

        // Projection
        const [hours, minutes] = time.split(':').map(Number);
        const dateTime = new Date(date);
        dateTime.setHours(hours || 0, minutes || 0);
        const rotation = getProjectionRotation(dateTime, lat, lng);
        const projection = geoStereographic().scale(mapRadius).translate([center[0], center[1]]).rotate(rotation).clipAngle(90);
        const path = geoPath().projection(projection);

        // Draw Map Background (Clipped)
        const mapContent = mapLayer.append('g').attr('clip-path', 'url(#map-clip)');

        // Background Image or Color
        if (mapBackgroundImage) {
            // Use 3x radius so there's plenty of room to drag the image within the shape
            const imgSize = mapRadius * 3;
            let imgOffsetX = mapImageOffsetX;
            let imgOffsetY = mapImageOffsetY;

            const imgEl = mapContent.append('image')
                .attr('xlink:href', mapBackgroundImage)
                .attr('x', center[0] - imgSize / 2 + imgOffsetX)
                .attr('y', center[1] - imgSize / 2 + imgOffsetY)
                .attr('width', imgSize)
                .attr('height', imgSize)
                .attr('preserveAspectRatio', 'none')
                .attr('opacity', mapImageOpacity ?? 1);

            // Transparent drag hit area over the shape — lets users reposition the map image
            const hitGroup = mapLayer.append('g').style('cursor', 'grab');

            if (maskShape === 'rect') {
                hitGroup.append('rect')
                    .attr('x', RECT_MAP_INNER_X).attr('y', RECT_MAP_INNER_Y).attr('width', RECT_MAP_INNER_W).attr('height', RECT_MAP_INNER_H)
                    .attr('fill', 'transparent')
                    .style('pointer-events', 'all');
            } else if (maskShape === 'heart') {
                hitGroup.append('path')
                    .attr('d', userHeartPath)
                    .attr('transform', getHeartTransform(1))
                    .attr('fill', 'transparent')
                    .style('pointer-events', 'all');
            } else if (maskShape === 'house') {
                hitGroup.append('path')
                    .attr('d', userHousePath)
                    .attr('transform', getHouseTransform(1))
                    .attr('fill', 'transparent')
                    .style('pointer-events', 'all');
            } else {
                hitGroup.append('circle')
                    .attr('cx', center[0])
                    .attr('cy', center[1])
                    .attr('r', mapRadius)
                    .attr('fill', 'transparent')
                    .style('pointer-events', 'all');
            }

            // Track where the drag started so we only apply the DELTA of this
            // drag session — not the full accumulated imgOffsetX which may already
            // be reflected in mapCenterLng from a previous drag.
            let dragStartOffsetX = imgOffsetX;
            let dragStartOffsetY = imgOffsetY;

            hitGroup.call(
                drag<SVGGElement, unknown>()
                    .on('start', (event) => {
                        event.sourceEvent.stopPropagation();
                        hitGroup.style('cursor', 'grabbing');
                        dragStartOffsetX = imgOffsetX;
                        dragStartOffsetY = imgOffsetY;
                        useStore.getState().setIsDraggingMapImage(true);
                    })
                    .on('drag', (event) => {
                        event.sourceEvent.stopPropagation();
                        const zoom = useStore.getState().previewZoom;
                        imgOffsetX += event.dx / zoom;
                        imgOffsetY += event.dy / zoom;
                        imgEl
                            .attr('x', center[0] - imgSize / 2 + imgOffsetX)
                            .attr('y', center[1] - imgSize / 2 + imgOffsetY);
                    })
                    .on('end', () => {
                        hitGroup.style('cursor', 'grab');
                        // Only the movement added in THIS drag session
                        const deltaX = imgOffsetX - dragStartOffsetX;
                        const deltaY = imgOffsetY - dragStartOffsetY;
                        if (deltaX !== 0 || deltaY !== 0) {
                            // Persist the drag offset so the SVG keeps showing the image
                            // in the dragged position while MapLibre re-renders at the new center.
                            // MainLayout's handleMapCapture will clear these to 0 once the
                            // new tile capture arrives, so no snap-back occurs.
                            const state = useStore.getState();
                            state.setMapImageOffsetX(imgOffsetX);
                            state.setMapImageOffsetY(imgOffsetY);

                            // Convert SVG pixel delta → geographic delta and tell MapLibre
                            // to re-render at the new center. The fresh capture will be
                            // perfectly centred in the shape — no rectangular edges visible.
                            const svgToCanvas = 1200 / imgSize;
                            const worldWidthPx = 512 * Math.pow(2, state.mapZoom);
                            const degPerCanvasPx = 360 / worldWidthPx;
                            const newLng = state.mapCenterLng - deltaX * svgToCanvas * degPerCanvasPx;
                            const newLat = state.mapCenterLat + deltaY * svgToCanvas * degPerCanvasPx
                                * Math.cos(state.mapCenterLat * Math.PI / 180);
                            // Set coords FIRST — Zustand subscribe fires synchronously here,
                            // incrementing captureVersionRef before any awaiting stitch resumes.
                            // Then clear isDraggingMapImage so no stale capture can slip through
                            // the guard with the old version number.
                            state.setMapCenterLng(newLng);
                            state.setMapCenterLat(newLat);
                        }
                        // Clear dragging flag AFTER coordinate updates so the synchronous
                        // version increment happens before any stale stitch checks the flag.
                        useStore.getState().setIsDraggingMapImage(false);
                    })
            );

            // (Scroll-wheel zoom is handled by a separate SVG-level useEffect below)
        } else if (posterType !== 'starmap') {
            // Street/colored map mode but image not yet captured — show placeholder
            const shapeFillColor = mapInteriorColor;
            if (maskShape === 'rect') {
                mapContent.append('rect').attr('x', RECT_MAP_INNER_X).attr('y', RECT_MAP_INNER_Y).attr('width', RECT_MAP_INNER_W).attr('height', RECT_MAP_INNER_H).attr('fill', shapeFillColor);
            } else if (maskShape === 'heart') {
                mapContent.append('path').attr('d', userHeartPath).attr('transform', getHeartTransform(1)).attr('fill', shapeFillColor);
            } else if (maskShape === 'house') {
                mapContent.append('path').attr('d', userHousePath).attr('transform', getHouseTransform(1)).attr('fill', shapeFillColor);
            } else {
                mapContent.append('circle').attr('cx', center[0]).attr('cy', center[1]).attr('r', mapRadius).attr('fill', shapeFillColor);
            }
            mapContent.append('text')
                .attr('x', center[0]).attr('y', center[1] - 20)
                .attr('text-anchor', 'middle').attr('fill', 'rgba(255,255,255,0.5)')
                .attr('font-size', '32px').attr('font-family', 'sans-serif')
                .text('⊕');
            mapContent.append('text')
                .attr('x', center[0]).attr('y', center[1] + 24)
                .attr('text-anchor', 'middle').attr('fill', 'rgba(255,255,255,0.4)')
                .attr('font-size', '20px').attr('font-family', 'sans-serif')
                .text('Search a city to load map');
        } else {
            // Fill shape interior with mapInteriorColor (works for both dark and light mode)
            const shapeFillColor = mapInteriorColor;
            if (maskShape === 'rect') {
                mapContent.append('rect').attr('x', RECT_MAP_INNER_X).attr('y', RECT_MAP_INNER_Y).attr('width', RECT_MAP_INNER_W).attr('height', RECT_MAP_INNER_H).attr('fill', shapeFillColor);
            } else if (maskShape === 'heart') {
                mapContent.append('path').attr('d', userHeartPath).attr('transform', getHeartTransform(1)).attr('fill', shapeFillColor);
            } else if (maskShape === 'house') {
                mapContent.append('path').attr('d', userHousePath).attr('transform', getHouseTransform(1)).attr('fill', shapeFillColor);
            } else {
                mapContent.append('circle').attr('cx', center[0]).attr('cy', center[1]).attr('r', mapRadius).attr('fill', shapeFillColor);
            }
        }

        // Grid — skip in street/colored map mode
        if (showGrid && posterType === 'starmap') {
            const graticule = geoGraticule();
            mapContent.append('path').datum(graticule).attr('d', path as any).attr('fill', 'none').attr('stroke', starColor).attr('stroke-width', gridWidth * 2).attr('stroke-opacity', gridOpacity);
        }

        // Constellations — skip in street/colored map mode
        if (showConstellations && constellationsData.features && posterType === 'starmap') {
            mapContent.append('g').selectAll('path').data(constellationsData.features as ConstellationFeature[]).enter().append('path').attr('d', path as any).attr('fill', 'none').attr('stroke', starColor).attr('stroke-width', debouncedLineWeight * 2).attr('stroke-opacity', 1.0);
        }

        // Stars — skip in street/colored map mode
        if (starsData.features && posterType === 'starmap') {
            const magScale = scaleLinear().domain([-2, 6]).range([6 * debouncedStarScale, 0.8 * debouncedStarScale]).clamp(true);
            const features = starsData.features as StarFeature[];
            const brightStars = features.filter(d => d.properties.mag < 2.5);
            const faintStars = features.filter(d => d.properties.mag >= 2.5);

            const drawStars = (selection: any, data: StarFeature[]) => {
                selection.selectAll('circle').data(data).enter().append('circle')
                    .attr('cx', (d: StarFeature) => { const coords = projection(d.geometry.coordinates); return coords ? coords[0] : null; })
                    .attr('cy', (d: StarFeature) => { const coords = projection(d.geometry.coordinates); return coords ? coords[1] : null; })
                    .attr('r', (d: StarFeature) => magScale(d.properties.mag))
                    .attr('fill', starColor);
            };

            const faintGroup = mapContent.append('g');
            drawStars(faintGroup, faintStars);

            const brightGroup = mapContent.append('g');
            if (glowIntensity > 0 && !isLightMode) {
                brightGroup.style('filter', 'url(#star-glow)');
            }
            drawStars(brightGroup, brightStars);
        }

        // Location Pin — small red heart, draggable
        if (showLocationPin && posterType !== 'starmap' && mapBackgroundImage) {
            const pinScale = locationPinSize / heartOrigWidth;
            const pinX = center[0] + locationPinOffsetX;
            const pinY = center[1] + locationPinOffsetY;

            const pinGroup = mapLayer.append('g')
                .attr('transform', `translate(${pinX}, ${pinY})`)
                .style('cursor', 'grab');

            pinGroup.append('path')
                .attr('d', userHeartPath)
                .attr('transform', `scale(${pinScale}) translate(-${heartOrigCX}, -${heartOrigCY})`)
                .attr('fill', '#e74c3c')
                .attr('stroke', '#ffffff')
                .attr('stroke-width', 2 / pinScale);

            // Larger invisible hit area for easy grabbing
            const hitSize = Math.max(locationPinSize * 1.5, 40);
            pinGroup.append('rect')
                .attr('x', -hitSize / 2).attr('y', -hitSize / 2)
                .attr('width', hitSize).attr('height', hitSize)
                .attr('fill', 'transparent')
                .style('pointer-events', 'all');

            let pinDx = 0, pinDy = 0;
            pinGroup.call(
                drag<SVGGElement, unknown>()
                    .on('start', (event) => {
                        event.sourceEvent.stopPropagation();
                        pinDx = 0; pinDy = 0;
                        pinGroup.style('cursor', 'grabbing');
                    })
                    .on('drag', (event) => {
                        event.sourceEvent.stopPropagation();
                        const zoom = useStore.getState().previewZoom;
                        pinDx += event.dx / zoom;
                        pinDy += event.dy / zoom;
                        pinGroup.attr('transform', `translate(${pinX + pinDx}, ${pinY + pinDy})`);
                    })
                    .on('end', () => {
                        pinGroup.style('cursor', 'grab');
                        if (pinDx !== 0 || pinDy !== 0) {
                            setLocationPinOffsetX(locationPinOffsetX + pinDx);
                            setLocationPinOffsetY(locationPinOffsetY + pinDy);
                        }
                    })
            );
        }

        // Border Rendering Logic
        // Colored map (white bg) → 50% gray for all shapes.
        // 2-color street map → use the street/accent color.
        // House on star map → dark gray so it reads over any star field.
        // Star map → textColor.
        const outlineColor = posterType === 'coloredmap'
            ? '#808080'
            : maskShape === 'house'
                ? '#333333'
                : posterType === 'streetmap' ? mapStreetColor : textColor;

        if (showBorder) {
            const appendShapePath = (layer: typeof mapLayer, scaleMult: number, fill: string, stroke: string, strokeWidth: number) => {
                if (maskShape === 'rect') {
                    layer.append('rect').attr('x', RECT_MAP_INNER_X).attr('y', RECT_MAP_INNER_Y).attr('width', RECT_MAP_INNER_W).attr('height', RECT_MAP_INNER_H)
                        .attr('fill', fill).attr('stroke', stroke).attr('stroke-width', strokeWidth);
                } else if (maskShape === 'heart') {
                    layer.append('path').attr('d', userHeartPath).attr('transform', getHeartTransform(scaleMult))
                        .attr('fill', fill).attr('stroke', stroke).attr('stroke-width', strokeWidth);
                } else if (maskShape === 'house') {
                    const houseScale = (mapRadius * 2.0 * scaleMult) / houseOrigHeight;
                    layer.append('path').attr('d', userHousePath).attr('transform', getHouseTransform(scaleMult))
                        .attr('fill', fill).attr('stroke', stroke).attr('stroke-width', strokeWidth / houseScale);
                } else {
                    layer.append('circle').attr('cx', center[0]).attr('cy', center[1]).attr('r', mapRadius)
                        .attr('fill', fill).attr('stroke', stroke).attr('stroke-width', strokeWidth);
                }
            };

            if (borderStyle === 'double-offset') {
                if (maskShape === 'heart' || maskShape === 'house') {
                    appendShapePath(mapLayer, 1, 'none', outlineColor, (debouncedShapeOutlineWidth || 2) + 6);
                    appendShapePath(mapLayer, 1, 'none', posterColor,   (debouncedShapeOutlineWidth || 2) + 3);
                } else {
                    // Two clean concentric rings with white breathing room from the clip edge.
                    // whiteGap  = clear space from star-map boundary to inner ring outer edge
                    // ringGap   = clear white space between the two rings
                    const w = debouncedShapeOutlineWidth || 1.5;
                    const whiteGap = 10; // pt from clip edge to inner ring
                    const ringGap  = 5;  // pt of white between the two rings
                    // inner ring center
                    mapLayer.append('circle')
                        .attr('cx', center[0]).attr('cy', center[1])
                        .attr('r', mapRadius + whiteGap + w / 2)
                        .attr('fill', 'none').attr('stroke', outlineColor).attr('stroke-width', w);
                    // outer ring center — starts where inner ring ends + ringGap
                    mapLayer.append('circle')
                        .attr('cx', center[0]).attr('cy', center[1])
                        .attr('r', mapRadius + whiteGap + w + ringGap + (w * 0.7) / 2)
                        .attr('fill', 'none').attr('stroke', outlineColor).attr('stroke-width', w * 0.7);
                }
            } else {
                appendShapePath(mapLayer, 1, 'none', outlineColor, debouncedShapeOutlineWidth);
            }
        }

        // Outer ring — a circle drawn outside the map circle at outerRingGap distance
        if (showOuterRing && maskShape === 'circle') {
            mapLayer.append('circle')
                .attr('cx', center[0]).attr('cy', center[1])
                .attr('r', mapRadius + outerRingGap)
                .attr('fill', 'none')
                .attr('stroke', outlineColor)
                .attr('stroke-width', outerRingWidth);
        }

        // Inner ring — a white (posterColor) circle drawn inside the map circle
        if (showInnerRing && maskShape === 'circle') {
            mapLayer.append('circle')
                .attr('cx', center[0]).attr('cy', center[1])
                .attr('r', mapRadius - innerRingInset)
                .attr('fill', 'none')
                .attr('stroke', posterColor)
                .attr('stroke-width', innerRingWidth);
        }

        // ── Shape Select / Move / Resize (non-rect only) — works like text tools ──
        if (maskShape !== 'rect') {
            const SNAP_THRESHOLD = 18;
            const pad = 12; // padding around bounding box for selection rect

            // Bounding box of the shape (used for selection rect and hit area)
            const bbX = center[0] - mapRadius - pad;
            const bbY = center[1] - mapRadius - pad;
            const bbW = (mapRadius + pad) * 2;
            const bbH = (mapRadius + pad) * 2;

            // Helper: ghost transform for heart/house at arbitrary center
            const heartTransformAt = (cx: number, cy: number) => {
                const s = (mapRadius * 2.0) / heartOrigWidth;
                return `translate(${cx}, ${cy}) scale(${s}) translate(-${heartOrigCX}, -${heartOrigCY})`;
            };
            const houseTransformAt = (cx: number, cy: number) => {
                const s = (mapRadius * 2.0) / houseOrigHeight;
                return `translate(${cx}, ${cy}) scale(${s}) translate(-${houseOrigCX}, -${houseOrigCY})`;
            };

            // --- Interaction layer (on top of everything) ---
            const shapeInteract = mapLayer.append('g').style('cursor', 'move');

            // Full bounding-box transparent hit area (catches all mouse events on/inside shape)
            shapeInteract.append('rect')
                .attr('x', bbX).attr('y', bbY).attr('width', bbW).attr('height', bbH)
                .attr('fill', 'transparent').attr('stroke', 'none')
                .style('pointer-events', 'all');

            // Dashed selection box — visible on hover, hidden by default
            const selBox = shapeInteract.append('rect')
                .attr('x', bbX).attr('y', bbY).attr('width', bbW).attr('height', bbH)
                .attr('fill', 'none')
                .attr('stroke', 'rgba(59,130,246,0.7)').attr('stroke-width', 1.5)
                .attr('stroke-dasharray', '8,5').attr('rx', maskShape === 'circle' ? mapRadius + pad : 6)
                .attr('opacity', 0).style('pointer-events', 'none');

            // Resize handle — bottom-right corner, drag vertically to scale
            const resizeHitR = 20;
            const resizeR = 6;
            const resizeX = bbX + bbW;
            const resizeY = bbY + bbH;

            const resizeHitArea = shapeInteract.append('rect')
                .attr('x', resizeX - resizeHitR).attr('y', resizeY - resizeHitR)
                .attr('width', resizeHitR * 2).attr('height', resizeHitR * 2)
                .attr('fill', 'transparent').attr('opacity', 0)
                .style('cursor', 'nwse-resize').style('pointer-events', 'all');

            const resizeDot = shapeInteract.append('circle')
                .attr('cx', resizeX).attr('cy', resizeY).attr('r', resizeR)
                .attr('fill', 'rgba(59,130,246,0.9)').attr('stroke', 'white').attr('stroke-width', 1.5)
                .attr('opacity', 0).style('pointer-events', 'none');

            // Show selection UI on hover
            shapeInteract
                .on('mouseover', () => { selBox.attr('opacity', 1); resizeDot.attr('opacity', 1); resizeHitArea.attr('opacity', 1); })
                .on('mouseout', () => { selBox.attr('opacity', 0); resizeDot.attr('opacity', 0); resizeHitArea.attr('opacity', 0); });

            // --- Resize drag (bottom-right handle, drag diagonally to scale) ---
            let resizeStartSize = 0, resizeAccDelta = 0;
            resizeHitArea.call(
                drag<SVGRectElement, unknown>()
                    .on('start', (event) => {
                        event.sourceEvent.stopPropagation();
                        resizeDot.attr('opacity', 1); resizeHitArea.attr('opacity', 1);
                        resizeAccDelta = 0;
                        const st = useStore.getState();
                        resizeStartSize = maskShape === 'circle' ? st.circleSize : maskShape === 'heart' ? st.heartSize : st.houseSize;
                    })
                    .on('drag', (event) => {
                        const zoom = useStore.getState().previewZoom;
                        // Bottom-right handle: drag down-right = grow, up-left = shrink
                        resizeAccDelta += (event.dx + event.dy) / zoom / 2;
                        const newSize = Math.max(0.5, Math.min(1.5, resizeStartSize + resizeAccDelta / baseMapRadius));
                        // Move dot to show live feedback
                        const newR = baseMapRadius * newSize;
                        resizeDot.attr('cx', center[0] - pad + newR + pad * 2).attr('cy', center[1] - pad + newR + pad * 2);
                    })
                    .on('end', () => {
                        const newSize = Math.max(0.5, Math.min(1.5, resizeStartSize + resizeAccDelta / baseMapRadius));
                        const rounded = Math.round(newSize * 20) / 20;
                        const st = useStore.getState();
                        if (maskShape === 'circle') st.setCircleSize(rounded);
                        else if (maskShape === 'heart') st.setHeartSize(rounded);
                        else st.setHouseSize(rounded);
                    })
            );

            // --- Move drag (anywhere inside bounding box, except resize handle) ---
            let ghostEl: any = null;
            let finalDX = 0, finalDY = 0;

            shapeInteract.call(
                drag<SVGGElement, unknown>()
                    .filter((event) => {
                        // Don't start shape drag when clicking the resize handle area
                        const target = event.target as SVGElement;
                        return target !== resizeHitArea.node();
                    })
                    .on('start', (event) => {
                        event.sourceEvent.stopPropagation();
                        finalDX = 0; finalDY = 0;
                        shapeInteract.style('cursor', 'grabbing');
                        selBox.attr('opacity', 1);
                        // Ghost: dashed outline of shape at current position
                        if (maskShape === 'circle') {
                            ghostEl = mapLayer.insert('circle', ':first-child')
                                .attr('cx', center[0]).attr('cy', center[1]).attr('r', mapRadius);
                        } else if (maskShape === 'heart') {
                            ghostEl = mapLayer.insert('path', ':first-child').attr('d', userHeartPath)
                                .attr('transform', heartTransformAt(center[0], center[1]));
                        } else {
                            ghostEl = mapLayer.insert('path', ':first-child').attr('d', userHousePath)
                                .attr('transform', houseTransformAt(center[0], center[1]));
                        }
                        ghostEl.attr('fill', 'none')
                            .attr('stroke', 'rgba(59,130,246,0.6)').attr('stroke-width', 2)
                            .attr('stroke-dasharray', '10,6').style('pointer-events', 'none');
                    })
                    .on('drag', (event) => {
                        event.sourceEvent.stopPropagation();
                        const zoom = useStore.getState().previewZoom;
                        finalDX += event.dx / zoom;
                        finalDY += event.dy / zoom;

                        let newCX = center[0] + finalDX;
                        let newCY = center[1] + finalDY;

                        if (useStore.getState().snapEnabled) {
                            if (Math.abs(newCX - width / 2) < SNAP_THRESHOLD) {
                                newCX = width / 2; finalDX = newCX - center[0]; setSnapGuideX(true);
                            } else { setSnapGuideX(false); }
                        }

                        // Move ghost
                        if (ghostEl) {
                            if (maskShape === 'circle') {
                                ghostEl.attr('cx', newCX).attr('cy', newCY);
                            } else if (maskShape === 'heart') {
                                ghostEl.attr('transform', heartTransformAt(newCX, newCY));
                            } else {
                                ghostEl.attr('transform', houseTransformAt(newCX, newCY));
                            }
                        }
                        // Move the selection box with the ghost too
                        selBox
                            .attr('x', newCX - mapRadius - pad)
                            .attr('y', newCY - mapRadius - pad);
                    })
                    .on('end', () => {
                        shapeInteract.style('cursor', 'move');
                        if (ghostEl) { ghostEl.remove(); ghostEl = null; }
                        setSnapGuideX(false);
                        if (finalDX !== 0 || finalDY !== 0) {
                            const st = useStore.getState();
                            st.setShapeOffsetX(st.shapeOffsetX + finalDX);
                            st.setShapeOffsetY(st.shapeOffsetY + finalDY);
                        }
                    })
            );
        }

    }, [
        starsData, constellationsData, // Data
        date, time, lat, lng, // Projection
        debouncedStarScale, debouncedLineWeight, gridWidth, glowIntensity, gridOpacity, // Style
        showBorder, showConstellations, showGrid, designStyle, maskShape, isLightMode, // Toggles
        debouncedCircleSize, debouncedHeartSize, debouncedHouseSize, debouncedShapeOffsetY, debouncedShapeOffsetX, debouncedShapeOutlineWidth, // Shape
        posterColor, textColor, starColor, mapInteriorColor, mapStreetColor, width, height, // Colors & Dims
        mapBackgroundImage, mapImageOffsetX, mapImageOffsetY, mapImageOpacity, borderStyle, posterType, // New Props
        showLocationPin, locationPinSize, locationPinOffsetX, locationPinOffsetY, // Location pin
        showInnerRing, innerRingWidth, innerRingInset,
        showOuterRing, outerRingWidth, outerRingGap, // Inner ring
    ]);

    // Frame Rendering Effect
    useEffect(() => {
        if (!svgRef.current) return;
        const svg = select(svgRef.current);
        const frameLayer = svg.select('#frame-layer');
        frameLayer.selectAll('*').remove();

        if (showFrame) {
            frameLayer.append('rect')
                .attr('x', frameInset)
                .attr('y', frameInset)
                .attr('width', width - (frameInset * 2))
                .attr('height', height - (frameInset * 2))
                .attr('fill', 'none')
                .attr('stroke', textColor)
                .attr('stroke-width', frameWidth)
                .style('pointer-events', 'none');
        }
    }, [showFrame, frameInset, frameWidth, textColor, width, height]);

    // Text Rendering Effect
    useEffect(() => {
        if (!svgRef.current) return;
        // Do not re-render text while the inline editor is open — this effect
        // calls textLayer.selectAll('*').remove() which destroys the SVG text
        // elements. The element whose visibility was set to 'hidden' would be
        // destroyed, causing the text to reappear/jump next to the input overlay.
        // The effect re-runs when inlineEdit becomes null (editing ends).
        if (inlineEdit !== null) return;
        const svg = select(svgRef.current);
        const textLayer = svg.select('#text-layer');
        textLayer.selectAll('*').remove();

        // Anchor text below the shape's NATURAL bottom (using saved circleSize, ignoring shapeOffsetY).
        // shapeOffsetY only moves the shape — text is decoupled from shape position.
        // circleSize IS used so same-ratio sizes (same circleSize) have identical textStartY.
        const _RECT_MAP_H = height * 0.74;
        const _baseRadius = Math.min(width, height) * 0.4;
        const _shapeRadius = maskShape === 'rect' ? 0 : _baseRadius * (maskShape === 'circle' ? circleSize : maskShape === 'heart' ? heartSize : houseSize);
        const textStartY = maskShape === 'rect'
            ? _RECT_MAP_H + height * 0.03
            : height * 0.45 + _shapeRadius + height * 0.05;

        // --- Independent Text Groups & Drag Logic ---

        let naturalY = 0; // Tracks the "natural" flow position without offsets

        // Helper to create drag behavior — tracks movement to distinguish click vs drag.
        // Divides event.dx/dy by previewZoom because CSS scale() on the preview container
        // is not reflected in SVGElement.getScreenCTM(), causing drag distances to be
        // multiplied by the zoom factor in browsers that don't account for CSS transforms.
        const createDragBehavior = (
            currentOffset: number,
            setOffset: (val: number) => void,
            naturalBaseY: number,
            onEditClick?: (groupEl: SVGGElement) => void
        ) => {
            let dragStartOffset = 0;
            let totalMoved = 0;
            return drag<SVGGElement, unknown>()
                .on('start', () => { dragStartOffset = 0; totalMoved = 0; })
                .on('drag', function (event) {
                    const zoom = useStore.getState().previewZoom;
                    const dy = event.dy / zoom;
                    totalMoved += Math.abs(event.dx) + Math.abs(event.dy);
                    dragStartOffset += dy;
                    select(this).attr('transform', `translate(${width / 2}, ${textStartY + naturalBaseY + currentOffset + dragStartOffset})`);
                })
                .on('end', function () {
                    if (dragStartOffset !== 0) {
                        setOffset(currentOffset + dragStartOffset);
                    }
                    if (totalMoved < 4 && onEditClick) {
                        // Set synchronously before React re-render so MainLayout's
                        // isInlineEditingRef is true before the dblclick event fires.
                        useStore.getState().setIsInlineEditing(true);
                        onEditClick(this as unknown as SVGGElement);
                    }
                });
        };

        // Add interactive box, resize handle, and hover effects to a text group
        const addTextInteraction = (
            group: any,
            textNode: any,
            currentFontSize: number,
            setFontSize: (s: number) => void
        ) => {
            const el = textNode.node() as SVGTextElement | null;
            const rawBbox = el ? el.getBBox() : null;
            const pad = 10;
            const bx = rawBbox ? rawBbox.x - pad : -110;
            const by = rawBbox ? rawBbox.y - pad : -30;
            const bw = rawBbox ? rawBbox.width + pad * 2 : 220;
            const bh = rawBbox ? rawBbox.height + pad * 2 : 60;

            // Transparent hit area for drag
            group.insert('rect', ':first-child')
                .attr('x', bx).attr('y', by)
                .attr('width', bw).attr('height', bh)
                .attr('fill', 'transparent')
                .style('cursor', 'move')
                .style('pointer-events', 'all');

            // Dashed selection box — visible on hover
            const selBox = group.append('rect')
                .attr('x', bx).attr('y', by)
                .attr('width', bw).attr('height', bh)
                .attr('fill', 'none')
                .attr('stroke', textColor)
                .attr('stroke-width', 1)
                .attr('stroke-dasharray', '5,4')
                .attr('opacity', 0)
                .attr('rx', 3)
                .style('pointer-events', 'none');

            // Resize handle (bottom-right corner) — large invisible hit zone + small visible square
            const hSize = 10;
            const hitSize = 32; // much larger click target
            const hx = bx + bw - hSize / 2;
            const hy = by + bh - hSize / 2;

            // Large transparent hit area (easy to grab)
            const resizeHitArea = group.append('rect')
                .attr('x', hx - (hitSize - hSize) / 2)
                .attr('y', hy - (hitSize - hSize) / 2)
                .attr('width', hitSize).attr('height', hitSize)
                .attr('fill', 'transparent')
                .attr('opacity', 0)
                .style('cursor', 'ns-resize')
                .style('pointer-events', 'all');

            // Visible indicator (stays small)
            const resizeHandle = group.append('rect')
                .attr('x', hx).attr('y', hy)
                .attr('width', hSize).attr('height', hSize)
                .attr('fill', textColor)
                .attr('rx', 2)
                .attr('opacity', 0)
                .style('pointer-events', 'none');

            // Hover show/hide
            group
                .on('mouseover', () => { selBox.attr('opacity', 0.5); resizeHandle.attr('opacity', 1); resizeHitArea.attr('opacity', 1); })
                .on('mouseout', () => { selBox.attr('opacity', 0); resizeHandle.attr('opacity', 0); resizeHitArea.attr('opacity', 0); });

            // Resize drag — drag up to grow, down to shrink (on the large hit area)
            let startSize = currentFontSize;
            let accDy = 0;
            resizeHitArea.call(
                drag<SVGRectElement, unknown>()
                    .on('start', (event) => {
                        event.sourceEvent.stopPropagation();
                        startSize = currentFontSize;
                        accDy = 0;
                    })
                    .on('drag', (event) => {
                        accDy += event.dy / useStore.getState().previewZoom;
                        const newSize = Math.max(10, Math.min(400, startSize - accDy * 0.5));
                        textNode.attr('font-size', `${newSize}px`);
                    })
                    .on('end', () => {
                        const newSize = Math.max(10, Math.min(400, startSize - accDy * 0.5));
                        setFontSize(Math.round(newSize));
                    })
            );
        };

        // --- Design Guru Layout System ---
        const RHYTHM_UNIT = 8;
        const layoutConfig = {
            'sm001': {
                titleBottomMargin: RHYTHM_UNIT * 1.5,
                subtitleBottomMargin: RHYTHM_UNIT * 1.5,
                dividerPadding: RHYTHM_UNIT * 1.5,
                detailsLineHeight: 1.55,
                detailsSpacing: RHYTHM_UNIT * 0.5,
                dedicationTopMargin: RHYTHM_UNIT * 2.5,
            },
            'modern-white': {
                titleBottomMargin: RHYTHM_UNIT * 3,
                subtitleBottomMargin: RHYTHM_UNIT * 3,
                dividerPadding: RHYTHM_UNIT * 3,
                detailsLineHeight: 1.8,
                detailsSpacing: RHYTHM_UNIT * 0.75,
                dedicationTopMargin: RHYTHM_UNIT * 4,
            },
            'love-dark': {
                titleBottomMargin: RHYTHM_UNIT * 1,
                subtitleBottomMargin: RHYTHM_UNIT * 4,
                dividerPadding: 0,
                detailsLineHeight: 1.4,
                detailsSpacing: 0,
                dedicationTopMargin: RHYTHM_UNIT * 5,
            },
            'classic-dark': {
                titleBottomMargin: RHYTHM_UNIT * 1.5,
                subtitleBottomMargin: RHYTHM_UNIT * 3,
                dividerPadding: 0,
                detailsLineHeight: 1.5,
                detailsSpacing: 0,
                dedicationTopMargin: RHYTHM_UNIT * 5,
            },
            'design2-bw': {
                titleBottomMargin: RHYTHM_UNIT * 0.5,
                subtitleBottomMargin: RHYTHM_UNIT * 1,
                dividerPadding: 0,
                detailsLineHeight: 1.35,
                detailsSpacing: 0,
                dedicationTopMargin: RHYTHM_UNIT * 1.5,
            },
            'default': {
                titleBottomMargin: RHYTHM_UNIT * 2,
                subtitleBottomMargin: RHYTHM_UNIT * 3,
                dividerPadding: 0,
                detailsLineHeight: 1.5,
                detailsSpacing: 0,
                dedicationTopMargin: RHYTHM_UNIT * 5,
            }
        };

        const config = layoutConfig[selectedTemplate as keyof typeof layoutConfig] || layoutConfig['default'];

        // Reference font sizes for stable flow layout — resizing one element won't push others
        const svgHeightsRef: Record<string, number> = {
            '5x7"': 1680, '8x10"': 1500, '11x14"': 1527, '12x16"': 1600,
            '16x20"': 1500, '18x24"': 1600, '24x36"': 1800,
            'A5': 1697, 'A4': 1697, 'A3': 1697, 'A2': 1697, 'A1': 1697,
        };
        const refRatio = (svgHeightsRef[printSize.label] ?? height) / 1600;
        const refTitleSize = Math.round(80 * refRatio);
        const refSubtitleSize = Math.round(32 * refRatio);
        const refDetailsSize = Math.round(24 * refRatio);

        // 1. Title Group
        const titleGroup = textLayer.append('g')
            .attr('transform', `translate(${width / 2 + titleOffsetX}, ${textStartY + naturalY + titleOffsetY})`)
            .attr('text-anchor', 'middle');

        const titleNode = titleGroup.append('text')
            .attr('fill', textColor)
            .attr('font-family', `${titleFont}, serif`)
            .attr('font-size', `${titleFontSize}px`)
            .attr('font-weight', ['Lato', 'DM Sans', 'Poppins', 'Nunito', 'Oswald', 'Montserrat', 'Bebas Neue', 'Brandon Grotesque', 'Cinzel', 'Playfair Display', 'Orbitron'].includes(titleFont) ? 'bold' : '400')
            .attr('letter-spacing', titleFont === 'Mapped Moment Script' ? '0' : `${debouncedTitleKerning}em`)
            .style('white-space', 'pre')
            .text(titleAllCaps ? (customText.title || title).toUpperCase() : (customText.title || title));

        // Auto-fit: scale down if title is too wide for the poster
        const maxTextWidth = width - 2 * (frameInset + 20);
        const titleEl = titleNode.node();
        if (titleEl) {
            const bbox = (titleEl as SVGTextElement).getBBox();
            if (bbox.width > maxTextWidth) {
                const scaleFactor = maxTextWidth / bbox.width;
                titleNode.attr('transform', `scale(${scaleFactor}, ${scaleFactor})`);
            }
        }

        addTextInteraction(titleGroup, titleNode, titleFontSize, setTitleFontSize);

        // Title drag: supports both X (horizontal) and Y (vertical) movement.
        // X snaps back to center (offsetX=0) when within ±15 SVG units of center.
        // Capture naturalY NOW (by value) — naturalY is a let accumulator that gets
        // mutated as subtitle/divider/details/dedication are added below. If we used
        // it directly inside the closure it would reflect the final accumulated value
        // (e.g. 200+) instead of 0, causing the title to jump on drag start.
        const titleNaturalY = naturalY;
        {
            const SNAP_THRESHOLD = 15;
            let dxAcc = 0, dyAcc = 0, totalMoved = 0;
            titleGroup.call(
                drag<SVGGElement, unknown>()
                    .on('start', () => { dxAcc = 0; dyAcc = 0; totalMoved = 0; })
                    .on('drag', function(event) {
                        const zoom = useStore.getState().previewZoom;
                        const dx = event.dx / zoom;
                        const dy = event.dy / zoom;
                        totalMoved += Math.abs(event.dx) + Math.abs(event.dy);
                        dxAcc += dx;
                        dyAcc += dy;
                        const snapOn = useStore.getState().snapEnabled;
                        let snapX = titleOffsetX + dxAcc;
                        if (snapOn && Math.abs(snapX) < SNAP_THRESHOLD) {
                            snapX = 0; dxAcc = -titleOffsetX;
                            setSnapGuideX(true);
                        } else {
                            setSnapGuideX(false);
                        }
                        select(this).attr('transform', `translate(${width / 2 + snapX}, ${textStartY + titleNaturalY + titleOffsetY + dyAcc})`);
                    })
                    .on('end', function() {
                        setSnapGuideX(false);
                        if (totalMoved < 4) {
                            const textEl = (this as SVGGElement).querySelector('text') as SVGTextElement;
                            if (!textEl) return;
                            const r = textEl.getBoundingClientRect();
                            textEl.style.visibility = 'hidden';
                            useStore.getState().setIsInlineEditing(true);
                            const titleVal = customText.title || title;
                            setInlineEdit({ field: 'title', value: titleVal, svgEl: textEl, editRect: { left: r.left, top: r.top, width: r.width, height: r.height }, fontFamily: titleFont, fontSize: titleFontSize });
                            setActiveTypoField('title');
                            return;
                        }
                        let newOffsetX = titleOffsetX + dxAcc;
                        if (useStore.getState().snapEnabled && Math.abs(newOffsetX) < SNAP_THRESHOLD) newOffsetX = 0;
                        setTitleOffsetX(newOffsetX);
                        if (dyAcc !== 0) setTitleOffsetY(titleOffsetY + dyAcc);
                    })
            );
        }

        // Advance Natural Y — use reference size so resizing title doesn't move other elements
        naturalY += (refTitleSize * 0.8) + config.titleBottomMargin;

        // 2. Subtitle Group — only render if there's actual text (avoids blank gap)
        const subtitleText = (customText.subtitle || subtitle).toUpperCase();
        if (subtitleText) {
            const subtitleGroup = textLayer.append('g')
                .attr('transform', `translate(${width / 2}, ${textStartY + naturalY + subtitleOffsetY})`)
                .attr('text-anchor', 'middle');

            const subtitleNode = subtitleGroup.append('text')
                .attr('fill', textColor)
                .attr('font-family', `${subtitleFont}, sans-serif`)
                .attr('font-size', `${subtitleFontSize}px`)
                .attr('font-weight', subtitleFont === 'Mapped Moment Script' ? '400' : '300')
                .attr('letter-spacing', subtitleFont === 'Mapped Moment Script' ? '0' : `${debouncedSubtitleKerning}em`)
                .style('white-space', 'pre')
                .text(subtitleText);

            // Auto-fit subtitle
            const subtitleEl = subtitleNode.node();
            if (subtitleEl) {
                const bbox = (subtitleEl as SVGTextElement).getBBox();
                if (bbox.width > maxTextWidth) {
                    const scaleFactor = maxTextWidth / bbox.width;
                    subtitleNode.attr('transform', `scale(${scaleFactor}, ${scaleFactor})`);
                }
            }

            addTextInteraction(subtitleGroup, subtitleNode, subtitleFontSize, setSubtitleFontSize);
            subtitleGroup.call(createDragBehavior(subtitleOffsetY, setSubtitleOffsetY, naturalY, (el) => {
                const textEl = el.querySelector('text') as SVGTextElement;
                if (!textEl) return;
                const r = textEl.getBoundingClientRect();
                textEl.style.visibility = 'hidden';
                const subtitleVal = customText.subtitle || subtitle;
                setInlineEdit({ field: 'subtitle', value: subtitleVal, svgEl: textEl, editRect: { left: r.left, top: r.top, width: r.width, height: r.height }, fontFamily: subtitleFont, fontSize: subtitleFontSize, uppercase: true });
                setActiveTypoField('subtitle');
            }));

            naturalY += (refSubtitleSize * 0.8) + config.subtitleBottomMargin;
        }

        // 3. Divider (Universal - all templates if enabled)
        if (showDivider) {
            naturalY += config.dividerPadding;

            const dividerGroup = textLayer.append('g')
                .attr('transform', `translate(${width / 2}, ${textStartY + naturalY + dividerOffsetY})`)
                .attr('text-anchor', 'middle');

            const halfLength = dividerLength / 2;

            // Hit area FIRST (make it easier to grab)
            dividerGroup.append('rect')
                .attr('x', -(halfLength + 20))
                .attr('y', -10)
                .attr('width', dividerLength + 40)
                .attr('height', 20)
                .attr('fill', 'transparent')
                .style('cursor', 'move')
                .style('pointer-events', 'all');

            // Line on top of hit area
            dividerGroup.append('line')
                .attr('x1', -halfLength)
                .attr('y1', 0)
                .attr('x2', halfLength)
                .attr('y2', 0)
                .attr('stroke', textColor)
                .attr('stroke-width', dividerThickness)
                .style('pointer-events', 'none');

            // Resize handles at each end — drag to change dividerLength
            const handleSize = 12;
            let dlStartLen = 0, dlAccDx = 0;
            const makeResizeHandle = (side: -1 | 1) => {
                const hitArea = dividerGroup.append('rect')
                    .attr('x', side * halfLength - handleSize / 2)
                    .attr('y', -handleSize / 2)
                    .attr('width', handleSize).attr('height', handleSize)
                    .attr('fill', 'transparent')
                    .attr('opacity', 0)
                    .style('cursor', 'ew-resize')
                    .style('pointer-events', 'all');

                const visual = dividerGroup.append('rect')
                    .attr('x', side * halfLength - 3).attr('y', -4)
                    .attr('width', 6).attr('height', 8)
                    .attr('fill', textColor).attr('rx', 1)
                    .attr('opacity', 0)
                    .style('pointer-events', 'none');

                hitArea.call(
                    drag<SVGRectElement, unknown>()
                        .on('start', (event) => {
                            event.sourceEvent.stopPropagation();
                            dlStartLen = useStore.getState().dividerLength;
                            dlAccDx = 0;
                        })
                        .on('drag', (event) => {
                            dlAccDx += event.dx / useStore.getState().previewZoom;
                            const newLen = Math.max(20, dlStartLen + side * dlAccDx * 2);
                            useStore.getState().setDividerLength(Math.round(newLen));
                        })
                );

                return { hitArea, visual };
            };
            const leftHandle = makeResizeHandle(-1);
            const rightHandle = makeResizeHandle(1);

            dividerGroup
                .on('mouseover.divider', () => {
                    leftHandle.visual.attr('opacity', 0.8);
                    rightHandle.visual.attr('opacity', 0.8);
                    leftHandle.hitArea.attr('opacity', 1);
                    rightHandle.hitArea.attr('opacity', 1);
                })
                .on('mouseout.divider', () => {
                    leftHandle.visual.attr('opacity', 0);
                    rightHandle.visual.attr('opacity', 0);
                    leftHandle.hitArea.attr('opacity', 0);
                    rightHandle.hitArea.attr('opacity', 0);
                });

            // Thickness: double-click cycles through 3 presets (0.5 → 1 → 2 → 0.5)
            dividerGroup.on('dblclick', (event) => {
                event.stopPropagation();
                const cur = useStore.getState().dividerThickness;
                const next = cur < 0.8 ? 1 : cur < 1.5 ? 2 : 0.5;
                setDividerThickness(next);
            });

            dividerGroup.call(createDragBehavior(dividerOffsetY, setDividerOffsetY, naturalY));

            naturalY += config.dividerPadding;
        }

        // 4. Details Group
        const detailsNaturalY = naturalY; // captured before any offset applied — used for vertical sep positioning
        const detailsGroup = textLayer.append('g')
            .attr('transform', `translate(${width / 2}, ${textStartY + naturalY + detailsOffsetY})`)
            .attr('text-anchor', 'middle');

        const dateStr = customText.date || format(new Date(date), 'MMMM do, yyyy').toUpperCase();
        const locStr = customText.location || (location ? location.toUpperCase() : '');
        const coordsStr = customText.coords || `${Math.abs(lat).toFixed(4)}° ${lat >= 0 ? 'N' : 'S'}, ${Math.abs(lng).toFixed(4)}° ${lng >= 0 ? 'E' : 'W'}`;

        // When only location + date are shown (no coords), render on ONE line with vertical separator.
        const inlineLocationDate = showLocation && showDate && !showCoords;

        const detailsEntries = inlineLocationDate
            ? [{ field: 'location' as const, text: locStr }, { field: 'date' as const, text: dateStr }]
            : [
                showLocation ? { field: 'location' as const, text: locStr } : null,
                showCoords  ? { field: 'coords'   as const, text: coordsStr } : null,
                showDate    ? { field: 'date'      as const, text: dateStr } : null,
              ].filter(Boolean) as { field: 'location' | 'coords' | 'date'; text: string }[];

        if (detailsEntries.length > 0) {
            const lineH = detailsFontSize * config.detailsLineHeight + config.detailsSpacing;
            const totalH = inlineLocationDate ? lineH : detailsEntries.length * lineH;

            // Hit area for drag (behind everything)
            detailsGroup.insert('rect', ':first-child')
                .attr('x', -160).attr('y', -15)
                .attr('width', 320).attr('height', totalH + 30)
                .attr('fill', 'transparent')
                .style('cursor', 'move')
                .style('pointer-events', 'all');

            // Dashed selection box
            const detailsSelBox = detailsGroup.append('rect')
                .attr('x', -160).attr('y', -15)
                .attr('width', 320).attr('height', totalH + 30)
                .attr('fill', 'none')
                .attr('stroke', textColor)
                .attr('stroke-width', 1)
                .attr('stroke-dasharray', '5,4')
                .attr('opacity', 0).attr('rx', 3)
                .style('pointer-events', 'none');

            // Resize handle for details font — large hit zone + small visual
            const dhSize = 10;
            const dHitSize = 32;
            const dhx = 160 - dhSize / 2;
            const dhy = totalH + 15 - dhSize / 2;

            const detailsResizeHitArea = detailsGroup.append('rect')
                .attr('x', dhx - (dHitSize - dhSize) / 2).attr('y', dhy - (dHitSize - dhSize) / 2)
                .attr('width', dHitSize).attr('height', dHitSize)
                .attr('fill', 'transparent').attr('opacity', 0)
                .style('cursor', 'ns-resize').style('pointer-events', 'all');

            const detailsResizeHandle = detailsGroup.append('rect')
                .attr('x', dhx).attr('y', dhy)
                .attr('width', dhSize).attr('height', dhSize)
                .attr('fill', textColor).attr('rx', 2)
                .attr('opacity', 0)
                .style('pointer-events', 'none');

            detailsGroup
                .on('mouseover', () => { detailsSelBox.attr('opacity', 0.5); detailsResizeHandle.attr('opacity', 1); detailsResizeHitArea.attr('opacity', 1); })
                .on('mouseout', () => { detailsSelBox.attr('opacity', 0); detailsResizeHandle.attr('opacity', 0); detailsResizeHitArea.attr('opacity', 0); });

            let dStartSize = detailsFontSize, dAccDy = 0;
            detailsResizeHitArea.call(
                drag<SVGRectElement, unknown>()
                    .on('start', (event) => { event.sourceEvent.stopPropagation(); dStartSize = detailsFontSize; dAccDy = 0; })
                    .on('drag', (event) => {
                        dAccDy += event.dy / useStore.getState().previewZoom;
                        const s = Math.max(8, Math.min(80, dStartSize - dAccDy * 0.4));
                        detailsGroup.selectAll('text').attr('font-size', `${s}px`);
                    })
                    .on('end', () => {
                        setDetailsFontSize(Math.round(Math.max(8, Math.min(80, dStartSize - dAccDy * 0.4))));
                    })
            );

            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const detailsTextAttrs = (node: any) =>
                node.attr('fill', textColor)
                    .attr('font-family', `${detailsFont}, sans-serif`)
                    .attr('font-size', `${detailsFontSize}px`)
                    .attr('font-weight', '400')
                    .attr('letter-spacing', selectedTemplate === 'modern-white' ? `${debouncedDetailsKerning + 0.02}em` : `${debouncedDetailsKerning}em`)
                    .style('white-space', 'pre')
                    .style('pointer-events', 'all')
                    .style('cursor', 'text');

            if (inlineLocationDate) {
                // Location and date anchored outward from centre — no bbox measurement needed.
                // Separator line is always at x=0 (the group centre).
                const halfGap = detailsFontSize * 1.0; // distance from centre to each text anchor
                const sepH = detailsFontSize * 0.85;

                // Location — right-aligned, flows leftward from -halfGap
                const locNode = detailsGroup.append('text')
                    .attr('x', -halfGap).attr('y', 0).attr('text-anchor', 'end');
                detailsTextAttrs(locNode).text(locStr)
                    .on('click', function (this: SVGTextElement, event: MouseEvent) {
                        event.stopPropagation();
                        const textEl = this as SVGTextElement;
                        const r = textEl.getBoundingClientRect();
                        textEl.style.visibility = 'hidden';
                        useStore.getState().setIsInlineEditing(true);
                        setInlineEdit({ field: 'location', value: locStr, svgEl: textEl, editRect: { left: r.left, top: r.top, width: r.width, height: r.height }, fontFamily: detailsFont, fontSize: detailsFontSize });
                        setActiveTypoField('details');
                    });

                // Date — left-aligned, flows rightward from +halfGap
                const dateNode = detailsGroup.append('text')
                    .attr('x', halfGap).attr('y', 0).attr('text-anchor', 'start');
                detailsTextAttrs(dateNode).text(dateStr)
                    .on('click', function (this: SVGTextElement, event: MouseEvent) {
                        event.stopPropagation();
                        const textEl = this as SVGTextElement;
                        const r = textEl.getBoundingClientRect();
                        textEl.style.visibility = 'hidden';
                        useStore.getState().setIsInlineEditing(true);
                        setInlineEdit({ field: 'date', value: dateStr, svgEl: textEl, editRect: { left: r.left, top: r.top, width: r.width, height: r.height }, fontFamily: detailsFont, fontSize: detailsFontSize });
                        setActiveTypoField('details');
                    });

                // Transparent hit-rects so both halves are easily clickable
                [-1, 1].forEach(side => {
                    detailsGroup.append('rect')
                        .attr('x', side === -1 ? -maxTextWidth / 2 : halfGap)
                        .attr('y', -detailsFontSize * 0.8)
                        .attr('width', maxTextWidth / 2 - halfGap)
                        .attr('height', detailsFontSize * 1.4)
                        .attr('fill', 'transparent')
                        .style('pointer-events', 'all')
                        .style('cursor', 'text')
                        .on('click', function (event: MouseEvent) {
                            event.stopPropagation();
                            const target = side === -1 ? locNode.node() as SVGTextElement : dateNode.node() as SVGTextElement;
                            if (!target) return;
                            const r = target.getBoundingClientRect();
                            target.style.visibility = 'hidden';
                            useStore.getState().setIsInlineEditing(true);
                            const f = side === -1 ? 'location' : 'date';
                            const v = side === -1 ? locStr : dateStr;
                            setInlineEdit({ field: f, value: v, svgEl: target, editRect: { left: r.left, top: r.top, width: r.width, height: r.height }, fontFamily: detailsFont, fontSize: detailsFontSize });
                            setActiveTypoField('details');
                        });
                });

                // Vertical separator is rendered as an independent group after detailsGroup (see below)
            } else {
                // Standard multi-line rendering
                detailsEntries.forEach(({ field, text }, i) => {
                    const node = detailsGroup.append('text').attr('y', i * lineH);
                    detailsTextAttrs(node).text(text)
                        .on('click', function (this: SVGTextElement, event: MouseEvent) {
                            event.stopPropagation();
                            const textEl = this as SVGTextElement;
                            const r = textEl.getBoundingClientRect();
                            textEl.style.visibility = 'hidden';
                            useStore.getState().setIsInlineEditing(true);
                            setInlineEdit({ field, value: text, svgEl: textEl, editRect: { left: r.left, top: r.top, width: r.width, height: r.height }, fontFamily: detailsFont, fontSize: detailsFontSize });
                            setActiveTypoField('details');
                        });
                });
            }


            detailsGroup.call(createDragBehavior(detailsOffsetY, setDetailsOffsetY, naturalY));
        }

        // 4b. Vertical separator — fully independent group, does NOT use detailsOffsetY
        if (inlineLocationDate && showVertSep) {
            const sepH = vertSepHeight;
            // Position uses only its own vertSepOffsetY — independent of detailsOffsetY
            const vertSepGroup = textLayer.append('g')
                .attr('transform', `translate(${width / 2}, ${textStartY + detailsNaturalY + vertSepOffsetY})`);

            // Hit area — tall/narrow strip for easy grabbing
            const hitPad = 10;
            vertSepGroup.append('rect')
                .attr('x', -hitPad).attr('y', -sepH / 2 - hitPad)
                .attr('width', hitPad * 2).attr('height', sepH + hitPad * 2)
                .attr('fill', 'transparent')
                .style('cursor', 'move').style('pointer-events', 'all');

            // The vertical line
            vertSepGroup.append('line')
                .attr('x1', 0).attr('y1', -sepH / 2)
                .attr('x2', 0).attr('y2', sepH / 2)
                .attr('stroke', textColor).attr('stroke-width', vertSepThickness)
                .style('pointer-events', 'none');

            // Top/bottom resize handles
            let vsStartH = 0, vsAccDy = 0;
            const makeVsHandle = (side: -1 | 1) => {
                const hSize = 10, hHit = 28;
                const hy = side * sepH / 2;
                const hitH = vertSepGroup.append('rect')
                    .attr('x', -hHit / 2).attr('y', hy - hHit / 2)
                    .attr('width', hHit).attr('height', hHit)
                    .attr('fill', 'transparent').attr('opacity', 0)
                    .style('cursor', 'ns-resize').style('pointer-events', 'all');
                const visH = vertSepGroup.append('rect')
                    .attr('x', -hSize / 2).attr('y', hy - hSize / 2)
                    .attr('width', hSize).attr('height', hSize)
                    .attr('fill', textColor).attr('rx', 2)
                    .attr('opacity', 0).style('pointer-events', 'none');
                hitH.call(
                    drag<SVGRectElement, unknown>()
                        .on('start', (event) => { event.sourceEvent.stopPropagation(); vsStartH = useStore.getState().vertSepHeight; vsAccDy = 0; })
                        .on('drag', (event) => {
                            vsAccDy += event.dy / useStore.getState().previewZoom;
                            const newH = Math.max(8, vsStartH + side * vsAccDy * 2);
                            setVertSepHeight(Math.round(newH));
                        })
                );
                return { hitH, visH };
            };
            const topHandle = makeVsHandle(-1);
            const botHandle = makeVsHandle(1);

            // Selection box on hover
            const vsSelBox = vertSepGroup.append('rect')
                .attr('x', -hitPad).attr('y', -sepH / 2 - hitPad)
                .attr('width', hitPad * 2).attr('height', sepH + hitPad * 2)
                .attr('fill', 'none').attr('stroke', textColor)
                .attr('stroke-width', 1).attr('stroke-dasharray', '3,3')
                .attr('opacity', 0).attr('rx', 2).style('pointer-events', 'none');

            vertSepGroup
                .on('mouseover', () => { vsSelBox.attr('opacity', 0.5); topHandle.visH.attr('opacity', 0.8); botHandle.visH.attr('opacity', 0.8); topHandle.hitH.attr('opacity', 1); botHandle.hitH.attr('opacity', 1); })
                .on('mouseout', () => { vsSelBox.attr('opacity', 0); topHandle.visH.attr('opacity', 0); botHandle.visH.attr('opacity', 0); topHandle.hitH.attr('opacity', 0); botHandle.hitH.attr('opacity', 0); });

            // Double-click cycles thickness
            vertSepGroup.on('dblclick', (event: MouseEvent) => {
                event.stopPropagation();
                const cur = useStore.getState().vertSepThickness;
                const next = cur < 0.8 ? 1 : cur < 1.5 ? 2 : 0.5;
                setVertSepThickness(next);
            });

            vertSepGroup.call(createDragBehavior(vertSepOffsetY, setVertSepOffsetY, detailsNaturalY));
        }

        // Advance Natural Y — use reference size for stable positioning
        const refLineH = refDetailsSize * config.detailsLineHeight + config.detailsSpacing;
        const refDetailsHeight = detailsEntries.length * refLineH;
        naturalY += refDetailsHeight + config.dedicationTopMargin;

        // 4.5 Names Group — rendered after details (e.g. design002: "James & Lilly" below location/date)
        if (showNames && customText.names) {
            const namesGroup = textLayer.append('g')
                .attr('transform', `translate(${width / 2}, ${textStartY + naturalY + namesOffsetY})`)
                .attr('text-anchor', 'middle');

            const namesNode = namesGroup.append('text')
                .attr('fill', textColor)
                .attr('font-family', `${namesFont}, serif`)
                .attr('font-size', `${namesFontSize}px`)
                .attr('font-weight', (namesFont === 'Mapped Moment Script' || namesFont === 'Mapped2' || namesFont === 'Title001' || namesFont === 'Cinzel') ? '400' : '300')
                .attr('letter-spacing', namesFont === 'Mapped Moment Script' ? '0' : `${debouncedNamesKerning}em`)
                .style('white-space', 'pre')
                .text(customText.names);

            const namesEl = namesNode.node();
            if (namesEl) {
                const bbox = (namesEl as SVGTextElement).getBBox();
                if (bbox.width > maxTextWidth) namesNode.attr('transform', `scale(${maxTextWidth / bbox.width}, 1)`);
            }

            addTextInteraction(namesGroup, namesNode, namesFontSize, setNamesFontSize);
            namesGroup.call(createDragBehavior(namesOffsetY, setNamesOffsetY, naturalY, (el) => {
                const textEl = el.querySelector('text') as SVGTextElement;
                if (!textEl) return;
                const r = textEl.getBoundingClientRect();
                textEl.style.visibility = 'hidden';
                setInlineEdit({ field: 'names', value: customText.names, svgEl: textEl, editRect: { left: r.left, top: r.top, width: r.width, height: r.height }, fontFamily: namesFont, fontSize: namesFontSize });
                setActiveTypoField('names');
            }));

            naturalY += (namesFontSize * 0.8) + config.dedicationTopMargin;
        }

        // 5. Dedication Group
        if (customText.dedication) {
            const dedicationGroup = textLayer.append('g')
                .attr('transform', `translate(${width / 2}, ${textStartY + naturalY + dedicationOffsetY})`)
                .attr('text-anchor', 'middle');

            // Fonts that are natively cursive — registered as font-style:normal in @font-face, must NOT get synthetic italic
            const NATIVE_SCRIPT_FONTS = new Set(['Mapped Moment Script', 'Great Vibes', 'Sacramento', 'Pinyon Script', 'Allura', 'Petit Formal Script', 'Alex Brush', 'Parisienne']);
            // Fonts that need italic to activate their cursive form (they have a separate italic face)
            const ITALIC_SCRIPT_FONTS = new Set(['Dancing Script']);
            const dedicationNode = dedicationGroup.append('text')
                .attr('fill', textColor)
                .attr('font-family', `${dedicationFont}, cursive`)
                .attr('font-size', `${dedicationFontSize}px`)
                .attr('font-weight', '400')
                .attr('font-style', ITALIC_SCRIPT_FONTS.has(dedicationFont) ? 'italic' : 'normal')
                .attr('letter-spacing', dedicationFont === 'Mapped Moment Script' ? '0' : `${debouncedDedicationKerning}em`)
                .text(customText.dedication);

            addTextInteraction(dedicationGroup, dedicationNode, dedicationFontSize, setDedicationFontSize);
            dedicationGroup.call(createDragBehavior(dedicationOffsetY, setDedicationOffsetY, naturalY, (el) => {
                const textEl = el.querySelector('text') as SVGTextElement;
                if (!textEl) return;
                const r = textEl.getBoundingClientRect();
                textEl.style.visibility = 'hidden';
                setInlineEdit({ field: 'dedication', value: customText.dedication, svgEl: textEl, editRect: { left: r.left, top: r.top, width: r.width, height: r.height }, fontFamily: dedicationFont, fontSize: dedicationFontSize });
                setActiveTypoField('dedication');
            }));
        }

        // Small decorative heart below dedication — draggable, matches SVG reference
        if (showHeartDecor) {
            const heartGapY = (customText.dedication ? dedicationFontSize * 2.5 : height * 0.04);
            const heartBaseY = textStartY + naturalY + dedicationOffsetY + heartGapY;
            const heartScale = (height / 1200) * 0.5;
            // hitPad in un-scaled units so the click target is large
            const hitPad = 30 / heartScale;

            const heartGroup = textLayer.append('g')
                .attr('transform', `translate(${width / 2}, ${heartBaseY + heartDecorOffsetY}) scale(${heartScale})`)
                .style('cursor', 'move');

            // Large transparent hit area (scale-compensated so it's ~60×60px on screen)
            heartGroup.append('rect')
                .attr('x', -hitPad / 2).attr('y', -hitPad / 4)
                .attr('width', hitPad).attr('height', hitPad)
                .attr('fill', 'transparent')
                .style('pointer-events', 'all');

            heartGroup.append('path')
                .attr('d', 'M0,15.5 C-10,5 -25,10 -25,25 C-25,45 0,65 0,65 C0,65 25,45 25,25 C25,10 10,5 0,15.5 Z')
                .attr('fill', textColor)
                .style('pointer-events', 'none');

            let heartDragAcc = 0;
            heartGroup.call(
                drag<SVGGElement, unknown>()
                    .on('start', (event) => { event.sourceEvent.stopPropagation(); heartDragAcc = 0; })
                    .on('drag', function(event) {
                        heartDragAcc += event.dy / useStore.getState().previewZoom;
                        const newY = heartBaseY + heartDecorOffsetY + heartDragAcc;
                        select(this).attr('transform', `translate(${width / 2}, ${newY}) scale(${heartScale})`);
                    })
                    .on('end', () => {
                        if (heartDragAcc !== 0) setHeartDecorOffsetY(heartDecorOffsetY + heartDragAcc);
                    })
            );
        }

    }, [
        title, subtitle, customText, location, date, lat, lng, // Content
        titleFont, subtitleFont, detailsFont, dedicationFont, namesFont, // Fonts
        titleFontSize, subtitleFontSize, detailsFontSize, dedicationFontSize, namesFontSize, // Sizes
        debouncedTitleKerning, debouncedSubtitleKerning, debouncedDetailsKerning, debouncedDedicationKerning, debouncedNamesKerning, // Kerning
        titleAllCaps, // Title casing
        titleOffsetX, titleOffsetY, subtitleOffsetY, detailsOffsetY, dedicationOffsetY, namesOffsetY, heartDecorOffsetY, // Offsets
        showNames, // Names toggle
        showDate, showLocation, showCoords, showDivider, dividerOffsetY, dividerLength, dividerThickness, vertSepOffsetY, showVertSep, vertSepHeight, vertSepThickness, // Toggles
        showHeartDecor, // Decorative heart below text
        circleSize, heartSize, houseSize, maskShape, // Shape — textStartY depends on these (shapeOffsetY removed: text is now decoupled from shape position)
        textColor, width, height, frameInset, // Global
        selectedTemplate, // Template
        setTitleFontSize, setSubtitleFontSize, setDetailsFontSize, setDedicationFontSize, setNamesFontSize, setCustomText, setInlineEdit, // Stable setters
        inlineEdit, // Guard: effect is skipped while editing (inlineEdit !== null), re-runs when it closes
    ]);

    // Scroll-wheel zoom over the map shape (street map mode only).
    // Works regardless of whether a city image has been captured yet.
    useEffect(() => {
        if (!svgRef.current) return;
        const svgEl = svgRef.current;

        const handleWheel = (e: WheelEvent) => {
            const state = useStore.getState();
            if (state.posterType === 'starmap') return;

            // Convert screen coords → SVG coordinate space
            const ctm = svgEl.getScreenCTM();
            if (!ctm) return;
            const pt = svgEl.createSVGPoint();
            pt.x = e.clientX;
            pt.y = e.clientY;
            const svgPt = pt.matrixTransform(ctm.inverse());

            // Is the cursor inside the map shape?
            const svgW = 1200;
            const [rW, rH] = state.printSize.ratio.split('/').map(Number);
            const svgH = svgW / (rW / rH);
            const cx = svgW / 2 + state.shapeOffsetX;
            const cy = svgH * 0.45 + state.shapeOffsetY;
            const baseR = Math.min(svgW, svgH) * 0.4;
            const r = baseR * (
                state.maskShape === 'circle' ? state.circleSize :
                state.maskShape === 'heart'  ? state.heartSize  :
                                               state.houseSize
            );

            const dx = svgPt.x - cx;
            const dy = svgPt.y - cy;
            // Rect: entire top portion is interactive for scroll zoom
            const RECT_H_WZ = svgH * 0.74;
            const RECT_PAD_WZ = svgW * 0.0625;
            const inShape = state.maskShape === 'rect'
                ? svgPt.x >= RECT_PAD_WZ && svgPt.x <= svgW - RECT_PAD_WZ && svgPt.y >= RECT_PAD_WZ && svgPt.y <= RECT_H_WZ - RECT_PAD_WZ
                : state.maskShape === 'house'
                    ? Math.abs(dx) <= r * 0.89 && dy >= -r && dy <= r
                    : dx * dx + dy * dy <= r * r;
            if (inShape) {
                e.preventDefault();
                e.stopPropagation();
                const delta = e.deltaY > 0 ? -0.5 : 0.5;
                state.setMapZoom(Math.max(1, Math.min(20, state.mapZoom + delta)));
            }
        };

        svgEl.addEventListener('wheel', handleWheel, { passive: false });
        return () => svgEl.removeEventListener('wheel', handleWheel);
    }, [posterType]);

    return (
        <div style={{ position: 'relative', width: '100%', height: '100%' }}>
            <svg
                ref={svgRef}
                className="w-full h-full"
                style={{ backgroundColor: posterColor, pointerEvents: inlineEdit ? 'none' : 'auto' }}
                preserveAspectRatio="xMidYMid meet"
            />
            {/* Snap guide overlay — separate SVG so D3 never touches it */}
            {snapGuideX && (
                <svg
                    style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', pointerEvents: 'none' }}
                    viewBox={`0 0 ${width} ${height}`}
                    preserveAspectRatio="xMidYMid meet"
                >
                    <line x1={width / 2} y1={0} x2={width / 2} y2={height}
                        stroke="rgba(59,130,246,0.65)" strokeWidth={1.5} strokeDasharray="8,5" />
                </svg>
            )}
            {inlineEdit && liveEditRect && createPortal((() => {
                const { fontFamily, uppercase } = inlineEdit;
                // Use liveEditRect — re-captured after CSS transitions settle, so position is accurate
                const editRect = liveEditRect;
                const displayValue = uppercase ? inlineEdit.value.toUpperCase() : inlineEdit.value;
                // Compute CSS scale from SVG viewBox vs rendered size, then apply to stored font size.
                // This avoids the calligraphy-font bbox inflation problem (ascenders/descenders make
                // editRect.height much larger than the actual em-square).
                const svgEl = inlineEdit.svgEl.closest('svg');
                const svgScale = svgEl
                    ? svgEl.getBoundingClientRect().width / (svgEl.viewBox.baseVal.width || 1)
                    : 1;
                const fontSize = Math.max(10, inlineEdit.fontSize * svgScale);
                const commit = () => {
                    // Restore visibility before unmounting — the text effect guard
                    // kept the element alive with visibility:hidden while editing.
                    // Restoring here makes it briefly visible until the effect re-runs
                    // and recreates it, preventing a flash of empty space.
                    inlineEdit.svgEl.style.visibility = 'visible';
                    setCustomText(inlineEdit.field, inlineEdit.value);
                    setInlineEdit(null);
                };
                return (
                    <input
                        ref={inlineEditInputRef}
                        autoFocus
                        value={displayValue}
                        onChange={e => {
                            const v = uppercase ? e.target.value.toUpperCase() : e.target.value;
                            setInlineEdit({ ...inlineEdit, value: v });
                        }}
                        onBlur={commit}
                        onKeyDown={e => {
                            if (e.key === 'Enter') commit();
                            if (e.key === 'Escape') {
                                inlineEdit.svgEl.style.visibility = 'visible';
                                setInlineEdit(null);
                            }
                        }}
                        style={{
                            position: 'fixed',
                            left: editRect.left + editRect.width / 2 - Math.max(editRect.width * 1.5, 400) / 2,
                            top: editRect.top + editRect.height / 2 - (fontSize * 1.4) / 2,
                            width: Math.max(editRect.width * 1.5, 400),
                            height: fontSize * 1.4,
                            fontSize: `${fontSize}px`,
                            fontFamily: `${fontFamily}, cursive`,
                            fontWeight: '400',
                            fontStyle: new Set(['Dancing Script']).has(fontFamily) ? 'italic' : 'normal',
                            textAlign: 'center',
                            background: 'transparent',
                            border: 'none',
                            outline: '1.5px dashed rgba(255,255,255,0.55)',
                            borderRadius: '3px',
                            color: textColor,
                            zIndex: 9999,
                            padding: '0 8px',
                            boxSizing: 'border-box',
                            caretColor: textColor,
                            letterSpacing: uppercase ? '0.12em' : '0.02em',
                            textTransform: uppercase ? 'uppercase' : 'none',
                        }}
                    />
                );
            })(), document.body)}
        </div>
    );
};

export default VectorStarMap;
