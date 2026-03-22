import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { geoStereographic, geoPath, geoGraticule } from 'd3-geo';
import { select } from 'd3-selection';
import { scaleLinear } from 'd3-scale';
import { drag } from 'd3-drag';
import { useStore } from '../store/useStore';
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
    const [inlineEdit, setInlineEdit] = useState<{
        field: 'title' | 'subtitle' | 'date' | 'location' | 'coords' | 'dedication';
        value: string;
        svgEl: SVGTextElement;
        editRect: { left: number; top: number; width: number; height: number };
        fontFamily: string;
        uppercase?: boolean;
    } | null>(null);

    const {
        title, subtitle, date, time, lat, lng, location, starScale, lineWeight, gridWidth,
        posterColor, textColor, glowIntensity, gridOpacity, showBorder, showConstellations,
        showGrid, designStyle, maskShape, isLightMode, showLocation, showDate,
        showCoords, customText, printSize, circleSize, heartSize, houseSize, shapeOffsetY, titleFontSize,
        subtitleFontSize, detailsFontSize, dedicationFontSize, titleOffsetY, subtitleOffsetY,
        detailsOffsetY, dedicationOffsetY, dividerOffsetY, shapeOutlineWidth, showFrame, frameInset, frameWidth,
        titleFont, subtitleFont, detailsFont, dedicationFont,
        titleKerning, subtitleKerning, detailsKerning, dedicationKerning,
        mapBackgroundImage, borderStyle, selectedTemplate, starColor, mapInteriorColor,
        showDivider, dividerLength, dividerThickness,
        setTitleOffsetY, setSubtitleOffsetY, setDetailsOffsetY, setDedicationOffsetY, setDividerOffsetY,
        posterType, mapImageOffsetX, mapImageOffsetY, setMapImageOffsetX, setMapImageOffsetY,
        mapStreetColor, setCustomText,
        setTitleFontSize, setSubtitleFontSize, setDetailsFontSize, setDedicationFontSize,
        setIsInlineEditing,
        setActiveTypoField,
        pendingGlyphForInlineEdit, setPendingGlyphForInlineEdit,
        showLocationPin, locationPinSize,
        locationPinOffsetX, locationPinOffsetY,
        setLocationPinOffsetX, setLocationPinOffsetY,
    } = useStore();

    // Keep a ref to inlineEdit so the pending-glyph effect always sees the latest value
    // without needing it in the dependency array (avoids circular re-runs)
    const inlineEditRef = useRef(inlineEdit);
    inlineEditRef.current = inlineEdit;

    // Sync inline editing state to store so MainLayout can block poster panning
    useEffect(() => {
        setIsInlineEditing(inlineEdit !== null);
    }, [inlineEdit, setIsInlineEditing]);

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
    const debouncedShapeOutlineWidth = useDebounce(shapeOutlineWidth, 150);
    const debouncedTitleKerning = useDebounce(titleKerning, 200);
    const debouncedSubtitleKerning = useDebounce(subtitleKerning, 200);
    const debouncedDetailsKerning = useDebounce(detailsKerning, 200);
    const debouncedDedicationKerning = useDebounce(dedicationKerning, 200);

    // Calculate dimensions
    const width = 1200;
    const [rW, rH] = printSize.ratio.split('/').map(Number);
    const ratioVal = rW / rH;
    const height = width / ratioVal;

    // Fetch Data Effect (Runs once)
    useEffect(() => {
        const fetchData = async () => {
            try {
                const [starsRes, constellationsRes] = await Promise.all([
                    fetch('https://raw.githubusercontent.com/ofrohn/d3-celestial/master/data/stars.6.json'),
                    fetch('https://raw.githubusercontent.com/ofrohn/d3-celestial/master/data/constellations.lines.json')
                ]);
                const stars = await starsRes.json();
                const constellations = await constellationsRes.json();
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
        const baseMapRadius = Math.min(width, height) * 0.4;
        const mapRadius = baseMapRadius * (
            maskShape === 'circle' ? debouncedCircleSize :
            maskShape === 'heart'  ? debouncedHeartSize  :
                                     debouncedHouseSize
        );
        const center = [width / 2, (height * 0.45) + debouncedShapeOffsetY];

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

        if (maskShape === 'heart') {
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
                .attr('preserveAspectRatio', 'none');

            // Transparent drag hit area over the shape — lets users reposition the map image
            const hitGroup = mapLayer.append('g').style('cursor', 'grab');

            if (maskShape === 'heart') {
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

            hitGroup.call(
                drag<SVGGElement, unknown>()
                    .on('start', (event) => {
                        event.sourceEvent.stopPropagation();
                        hitGroup.style('cursor', 'grabbing');
                    })
                    .on('drag', (event) => {
                        event.sourceEvent.stopPropagation();
                        imgOffsetX += event.dx;
                        imgOffsetY += event.dy;
                        imgEl
                            .attr('x', center[0] - imgSize / 2 + imgOffsetX)
                            .attr('y', center[1] - imgSize / 2 + imgOffsetY);
                    })
                    .on('end', () => {
                        hitGroup.style('cursor', 'grab');
                        if (imgOffsetX !== 0 || imgOffsetY !== 0) {
                            // Convert SVG pixel delta → geographic delta and tell MapLibre
                            // to re-render at the new center. The fresh capture will be
                            // perfectly centred in the shape — no rectangular edges visible.
                            const state = useStore.getState();
                            // The offscreen capture canvas is 1200×1200 px; image is displayed
                            // at imgSize SVG pixels. Scale: SVG px → canvas px.
                            const svgToCanvas = 1200 / imgSize;
                            // MapLibre 512-px tiles: world width in canvas pixels at current zoom
                            const worldWidthPx = 512 * Math.pow(2, state.mapZoom);
                            const degPerCanvasPx = 360 / worldWidthPx;
                            // Dragging image right (+dx) reveals content to the left →
                            // map center moved left (−lng). Dragging down (+dy) reveals
                            // content above → center moved north (+lat).
                            const newLng = state.mapCenterLng - imgOffsetX * svgToCanvas * degPerCanvasPx;
                            const newLat = state.mapCenterLat + imgOffsetY * svgToCanvas * degPerCanvasPx
                                * Math.cos(state.mapCenterLat * Math.PI / 180);
                            state.setMapCenterLng(newLng);
                            state.setMapCenterLat(newLat);
                            // Don't persist imgOffset — after recapture the new image is
                            // naturally centred (offset 0) so there are no edge artefacts.
                        }
                    })
            );

            // (Scroll-wheel zoom is handled by a separate SVG-level useEffect below)
        } else if (posterType !== 'starmap') {
            // Street/colored map mode but image not yet captured — show placeholder
            const shapeFillColor = mapInteriorColor;
            if (maskShape === 'heart') {
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
        } else if (!isLightMode) {
            // Dark background inside shape (using mapInteriorColor)
            const shapeFillColor = mapInteriorColor;
            if (maskShape === 'heart') {
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
                        pinDx += event.dx;
                        pinDy += event.dy;
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
                if (maskShape === 'heart') {
                    layer.append('path').attr('d', userHeartPath).attr('transform', getHeartTransform(scaleMult))
                        .attr('fill', fill).attr('stroke', stroke).attr('stroke-width', strokeWidth);
                } else if (maskShape === 'house') {
                    // House path is scaled by ~10× so normalise: divide by scale factor
                    // so stroke-width behaves like circle (actual SVG px, not scaled px).
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
                    const baseWidth = debouncedShapeOutlineWidth || 1;
                    mapLayer.append('circle').attr('cx', center[0]).attr('cy', center[1]).attr('r', mapRadius + 4)
                        .attr('fill', 'none').attr('stroke', outlineColor).attr('stroke-width', baseWidth);
                    mapLayer.append('circle').attr('cx', center[0]).attr('cy', center[1]).attr('r', mapRadius + 19)
                        .attr('fill', 'none').attr('stroke', outlineColor).attr('stroke-width', baseWidth * 1.5);
                }
            } else {
                appendShapePath(mapLayer, 1, 'none', outlineColor, debouncedShapeOutlineWidth);
            }
        }

    }, [
        starsData, constellationsData, // Data
        date, time, lat, lng, // Projection
        debouncedStarScale, debouncedLineWeight, gridWidth, glowIntensity, gridOpacity, // Style
        showBorder, showConstellations, showGrid, designStyle, maskShape, isLightMode, // Toggles
        debouncedCircleSize, debouncedHeartSize, debouncedHouseSize, debouncedShapeOffsetY, debouncedShapeOutlineWidth, // Shape
        posterColor, textColor, starColor, mapInteriorColor, mapStreetColor, width, height, // Colors & Dims
        mapBackgroundImage, borderStyle, posterType, // New Props
        showLocationPin, locationPinSize, locationPinOffsetX, locationPinOffsetY, // Location pin
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
        const svg = select(svgRef.current);
        const textLayer = svg.select('#text-layer');
        textLayer.selectAll('*').remove();

        // Anchor text below actual circle bottom — adapts correctly to all print sizes and circle sizes
        const _baseRadius = Math.min(width, height) * 0.4;
        const _shapeRadius = _baseRadius * (maskShape === 'circle' ? circleSize : maskShape === 'heart' ? heartSize : houseSize);
        const _shapeBottomY = (height * 0.45 + shapeOffsetY) + _shapeRadius;
        const textStartY = _shapeBottomY + height * 0.08;

        // --- Independent Text Groups & Drag Logic ---

        let naturalY = 0; // Tracks the "natural" flow position without offsets

        // Helper to create drag behavior — tracks movement to distinguish click vs drag
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
                    totalMoved += Math.abs(event.dx) + Math.abs(event.dy);
                    dragStartOffset += event.dy;
                    select(this).attr('transform', `translate(${width / 2}, ${textStartY + naturalBaseY + currentOffset + dragStartOffset})`);
                })
                .on('end', function () {
                    if (dragStartOffset !== 0) {
                        setOffset(currentOffset + dragStartOffset);
                    }
                    if (totalMoved < 4 && onEditClick) {
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
                        accDy += event.dy;
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
            '8x10"': 1500, '11x14"': 1527, '18x24"': 1600, '24x36"': 1800,
        };
        const refRatio = (svgHeightsRef[printSize.label] ?? 1600) / 1600;
        const refTitleSize = Math.round(80 * refRatio);
        const refSubtitleSize = Math.round(32 * refRatio);
        const refDetailsSize = Math.round(24 * refRatio);

        // 1. Title Group
        const titleGroup = textLayer.append('g')
            .attr('transform', `translate(${width / 2}, ${textStartY + naturalY + titleOffsetY})`)
            .attr('text-anchor', 'middle');

        const titleNode = titleGroup.append('text')
            .attr('fill', textColor)
            .attr('font-family', `${titleFont}, serif`)
            .attr('font-size', `${titleFontSize}px`)
            .attr('font-weight', titleFont === 'Mapped Moment Script' ? '400' : 'bold')
            .attr('letter-spacing', titleFont === 'Mapped Moment Script' ? '0' : `${debouncedTitleKerning}em`)
            .style('white-space', 'pre')
            .text((customText.title || title));

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
        titleGroup.call(createDragBehavior(titleOffsetY, setTitleOffsetY, naturalY, (el) => {
            const textEl = el.querySelector('text') as SVGTextElement;
            if (!textEl) return;
            const r = textEl.getBoundingClientRect();
            textEl.style.visibility = 'hidden';
            const titleVal = customText.title || title;
            setInlineEdit({ field: 'title', value: titleVal, svgEl: textEl, editRect: { left: r.left, top: r.top, width: r.width, height: r.height }, fontFamily: titleFont });
            setActiveTypoField('title');
        }));

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
                setInlineEdit({ field: 'subtitle', value: subtitleVal, svgEl: textEl, editRect: { left: r.left, top: r.top, width: r.width, height: r.height }, fontFamily: subtitleFont, uppercase: true });
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
                .attr('opacity', 0.6)
                .style('pointer-events', 'none'); // Line doesn't capture events

            dividerGroup.call(createDragBehavior(dividerOffsetY, setDividerOffsetY, naturalY));

            naturalY += config.dividerPadding;
        }

        // 4. Details Group
        const detailsGroup = textLayer.append('g')
            .attr('transform', `translate(${width / 2}, ${textStartY + naturalY + detailsOffsetY})`)
            .attr('text-anchor', 'middle');

        const dateStr = customText.date || format(new Date(date), 'MMMM do, yyyy').toUpperCase();
        const locStr = customText.location || (location ? location.toUpperCase() : '');
        const coordsStr = customText.coords || `${Math.abs(lat).toFixed(4)}° ${lat >= 0 ? 'N' : 'S'}, ${Math.abs(lng).toFixed(4)}° ${lng >= 0 ? 'E' : 'W'}`;

        const detailsEntries = [
            showLocation ? { field: 'location' as const, text: locStr } : null,
            showCoords  ? { field: 'coords'   as const, text: coordsStr } : null,
            showDate    ? { field: 'date'      as const, text: dateStr } : null,
        ].filter(Boolean) as { field: 'location' | 'coords' | 'date'; text: string }[];

        if (detailsEntries.length > 0) {
            const lineH = detailsFontSize * config.detailsLineHeight + config.detailsSpacing;
            const totalH = detailsEntries.length * lineH;

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
                        dAccDy += event.dy;
                        const s = Math.max(8, Math.min(80, dStartSize - dAccDy * 0.4));
                        detailsGroup.selectAll('text').attr('font-size', `${s}px`);
                    })
                    .on('end', () => {
                        setDetailsFontSize(Math.round(Math.max(8, Math.min(80, dStartSize - dAccDy * 0.4))));
                    })
            );

            // Individual text lines — each clickable to edit
            detailsEntries.forEach(({ field, text }, i) => {
                detailsGroup.append('text')
                    .attr('y', i * lineH)
                    .attr('fill', textColor)
                    .attr('font-family', `${detailsFont}, sans-serif`)
                    .attr('font-size', `${detailsFontSize}px`)
                    .attr('font-weight', '400')
                    .attr('letter-spacing', selectedTemplate === 'modern-white' ? `${debouncedDetailsKerning + 0.02}em` : `${debouncedDetailsKerning}em`)
                    .attr('opacity', 0.8)
                    .style('white-space', 'pre')
                    .style('pointer-events', 'all')
                    .style('cursor', 'text')
                    .text(text)
                    .on('click', function (event) {
                        event.stopPropagation();
                        const textEl = this as SVGTextElement;
                        const r = textEl.getBoundingClientRect();
                        textEl.style.visibility = 'hidden';
                        setInlineEdit({ field, value: text, svgEl: textEl, editRect: { left: r.left, top: r.top, width: r.width, height: r.height }, fontFamily: detailsFont });
                        setActiveTypoField('details');
                    });
            });


            detailsGroup.call(createDragBehavior(detailsOffsetY, setDetailsOffsetY, naturalY));
        }

        // Advance Natural Y — use reference size for stable positioning
        const refLineH = refDetailsSize * config.detailsLineHeight + config.detailsSpacing;
        const refDetailsHeight = detailsEntries.length * refLineH;
        naturalY += refDetailsHeight + config.dedicationTopMargin;

        // 5. Dedication Group
        if (customText.dedication) {
            const dedicationGroup = textLayer.append('g')
                .attr('transform', `translate(${width / 2}, ${textStartY + naturalY + dedicationOffsetY})`)
                .attr('text-anchor', 'middle');

            const dedicationNode = dedicationGroup.append('text')
                .attr('fill', textColor)
                .attr('font-family', `${dedicationFont}, serif`)
                .attr('font-size', `${dedicationFontSize}px`)
                .attr('font-style', 'italic')
                .attr('letter-spacing', dedicationFont === 'Mapped Moment Script' ? '0' : `${debouncedDedicationKerning}em`)
                .text(customText.dedication);

            addTextInteraction(dedicationGroup, dedicationNode, dedicationFontSize, setDedicationFontSize);
            dedicationGroup.call(createDragBehavior(dedicationOffsetY, setDedicationOffsetY, naturalY, (el) => {
                const textEl = el.querySelector('text') as SVGTextElement;
                if (!textEl) return;
                const r = textEl.getBoundingClientRect();
                textEl.style.visibility = 'hidden';
                setInlineEdit({ field: 'dedication', value: customText.dedication, svgEl: textEl, editRect: { left: r.left, top: r.top, width: r.width, height: r.height }, fontFamily: dedicationFont });
                setActiveTypoField('dedication');
            }));
        }

    }, [
        title, subtitle, customText, location, date, lat, lng, // Content
        titleFont, subtitleFont, detailsFont, dedicationFont, // Fonts
        titleFontSize, subtitleFontSize, detailsFontSize, dedicationFontSize, // Sizes
        debouncedTitleKerning, debouncedSubtitleKerning, debouncedDetailsKerning, debouncedDedicationKerning, // Kerning
        titleOffsetY, subtitleOffsetY, detailsOffsetY, dedicationOffsetY, // Offsets
        showDate, showLocation, showCoords, showDivider, dividerOffsetY, dividerLength, dividerThickness, // Toggles
        circleSize, heartSize, houseSize, maskShape, shapeOffsetY, // Shape — textStartY depends on these
        textColor, width, height, frameInset, // Global
        selectedTemplate, // Template
        setTitleFontSize, setSubtitleFontSize, setDetailsFontSize, setDedicationFontSize, setCustomText, setInlineEdit, // Stable setters
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
            const cx = svgW / 2;
            const cy = svgH * 0.45 + state.shapeOffsetY;
            const baseR = Math.min(svgW, svgH) * 0.4;
            const r = baseR * (
                state.maskShape === 'circle' ? state.circleSize :
                state.maskShape === 'heart'  ? state.heartSize  :
                                               state.houseSize
            );

            const dx = svgPt.x - cx;
            const dy = svgPt.y - cy;
            // House uses bounding-box check; circle/heart use circular approximation
            const inShape = state.maskShape === 'house'
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
            {inlineEdit && createPortal((() => {
                const { editRect, fontFamily, uppercase } = inlineEdit;
                const displayValue = uppercase ? inlineEdit.value.toUpperCase() : inlineEdit.value;
                // Compensate for CSS size-adjust on Mapped Moment Script (250%) to avoid double-scaling
                const sizeAdjust = fontFamily === 'Mapped Moment Script' ? 2.5 : 1;
                const fontSize = Math.max(10, (editRect.height * 0.82) / sizeAdjust);
                const commit = () => {
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
                            top: editRect.top - 4,
                            width: Math.max(editRect.width * 1.5, 400),
                            height: editRect.height + 16,
                            fontSize: `${fontSize}px`,
                            fontFamily: `${fontFamily}, serif`,
                            fontWeight: fontFamily === 'Mapped Moment Script' ? '400' : undefined,
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
