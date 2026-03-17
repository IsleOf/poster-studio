import React, { useEffect, useRef, useState } from 'react';
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
    const [starsData, setStarsData] = useState<any>(null);
    const [constellationsData, setConstellationsData] = useState<any>(null);

    const {
        title, subtitle, date, time, lat, lng, location, starScale, lineWeight, gridWidth,
        posterColor, textColor, glowIntensity, gridOpacity, showBorder, showConstellations,
        showGrid, designStyle, maskShape, isLightMode, showLocation, showDate,
        showCoords, customText, printSize, circleSize, heartSize, shapeOffsetY, titleFontSize,
        subtitleFontSize, detailsFontSize, dedicationFontSize, titleOffsetY, subtitleOffsetY,
        detailsOffsetY, dedicationOffsetY, dividerOffsetY, shapeOutlineWidth, showFrame, frameInset, frameWidth,
        titleFont, subtitleFont, detailsFont, dedicationFont,
        titleKerning, subtitleKerning, detailsKerning, dedicationKerning,
        mapBackgroundImage, borderStyle, selectedTemplate, starColor, mapInteriorColor,
        showDivider, dividerLength, dividerThickness,
        setTitleOffsetY, setSubtitleOffsetY, setDetailsOffsetY, setDedicationOffsetY, setDividerOffsetY,
        posterType,
    } = useStore();

    // Debounce frequently-changing values to prevent excessive re-renders
    const debouncedStarScale = useDebounce(starScale, 150);
    const debouncedLineWeight = useDebounce(lineWeight, 150);
    const debouncedCircleSize = useDebounce(circleSize, 150);
    const debouncedHeartSize = useDebounce(heartSize, 150);
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
        const mapRadius = baseMapRadius * (maskShape === 'circle' ? debouncedCircleSize : debouncedHeartSize);
        const center = [width / 2, (height * 0.45) + debouncedShapeOffsetY];

        // Setup Clip Path
        const clipPath = defsLayer.append('clipPath').attr('id', 'map-clip');

        // User-provided heart path  
        const userHeartPath = "M60.83,17.19C68.84,8.84,74.45,1.62,86.79,0.21c23.17-2.66,44.48,21.06,32.78,44.41 c-3.33,6.65-10.11,14.56-17.61,22.32c-8.23,8.52-17.34,16.87-23.72,23.2l-17.4,17.26L46.46,93.56C29.16,76.9,0.95,55.93,0.02,29.95 C-0.63,11.75,13.73,0.09,30.25,0.3C45.01,0.5,51.22,7.84,60.83,17.19L60.83,17.19L60.83,17.19z";
        const heartOrigWidth = 122.88;
        const heartOrigCX = 61.44;
        const heartOrigCY = 53.7;

        const getHeartTransform = (scaleMult: number = 1) => {
            const s = (mapRadius * 2.0 * scaleMult) / heartOrigWidth;
            return `translate(${center[0]}, ${center[1]}) scale(${s}) translate(-${heartOrigCX}, -${heartOrigCY})`;
        };

        if (maskShape === 'heart') {
            clipPath.append('path')
                .attr('d', userHeartPath)
                .attr('transform', getHeartTransform(1));
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
            // Calculate image dimensions to cover the circle/heart
            const imgSize = mapRadius * 2.5; // Ensure coverage
            mapContent.append('image')
                .attr('xlink:href', mapBackgroundImage)
                .attr('x', center[0] - imgSize / 2)
                .attr('y', center[1] - imgSize / 2)
                .attr('width', imgSize)
                .attr('height', imgSize)
                .attr('preserveAspectRatio', 'xMidYMid slice');
        } else if (posterType === 'streetmap') {
            // Street map mode but image not yet captured — show placeholder
            const shapeFillColor = mapInteriorColor;
            if (maskShape === 'heart') {
                mapContent.append('path').attr('d', userHeartPath).attr('transform', getHeartTransform(1)).attr('fill', shapeFillColor);
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
            } else {
                mapContent.append('circle').attr('cx', center[0]).attr('cy', center[1]).attr('r', mapRadius).attr('fill', shapeFillColor);
            }
        }

        // Grid — skip in street map mode
        if (showGrid && posterType !== 'streetmap') {
            const graticule = geoGraticule();
            mapContent.append('path').datum(graticule).attr('d', path as any).attr('fill', 'none').attr('stroke', starColor).attr('stroke-width', gridWidth * 2).attr('stroke-opacity', gridOpacity);
        }

        // Constellations — skip in street map mode
        if (showConstellations && constellationsData.features && posterType !== 'streetmap') {
            mapContent.append('g').selectAll('path').data(constellationsData.features as ConstellationFeature[]).enter().append('path').attr('d', path as any).attr('fill', 'none').attr('stroke', starColor).attr('stroke-width', debouncedLineWeight * 2).attr('stroke-opacity', 1.0);
        }

        // Stars — skip in street map mode
        if (starsData.features && posterType !== 'streetmap') {
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

        // Border Rendering Logic
        if (showBorder) {
            if (borderStyle === 'double-offset') {
                // Double Offset Style: Main thin line + Offset thicker line
                const offset = 15; // Gap between map and outer ring

                if (maskShape === 'heart') {
                    // For heart, draw two outlines with same path but different stroke widths
                    // Outer (thicker) line
                    mapLayer.append('path')
                        .attr('d', userHeartPath)
                        .attr('transform', getHeartTransform(1))
                        .attr('fill', 'none')
                        .attr('stroke', textColor)
                        .attr('stroke-width', (debouncedShapeOutlineWidth || 2) + 6); // Thicker outer stroke

                    // Inner (thinner) line  
                    mapLayer.append('path')
                        .attr('d', userHeartPath)
                        .attr('transform', getHeartTransform(1))
                        .attr('fill', 'none')
                        .attr('stroke', posterColor) // Use poster/background color to create gap effect
                        .attr('stroke-width', (debouncedShapeOutlineWidth || 2) + 3);

                } else {
                    // Refined Double Offset for Modern White
                    const baseWidth = debouncedShapeOutlineWidth || 1;

                    // Inner line (thin)
                    mapLayer.append('circle')
                        .attr('cx', center[0])
                        .attr('cy', center[1])
                        .attr('r', mapRadius + 4) // Slight padding from map
                        .attr('fill', 'none')
                        .attr('stroke', textColor)
                        .attr('stroke-width', baseWidth);

                    // Outer offset line (slightly thicker)
                    mapLayer.append('circle')
                        .attr('cx', center[0])
                        .attr('cy', center[1])
                        .attr('r', mapRadius + offset + 4)
                        .attr('fill', 'none')
                        .attr('stroke', textColor)
                        .attr('stroke-width', baseWidth * 1.5);
                }
            } else {
                // Simple / Standard Style
                if (maskShape === 'heart') {
                    mapLayer.append('path')
                        .attr('d', userHeartPath)
                        .attr('transform', getHeartTransform(1))
                        .attr('fill', 'none')
                        .attr('stroke', textColor)
                        .attr('stroke-width', debouncedShapeOutlineWidth);
                } else {
                    mapLayer.append('circle')
                        .attr('cx', center[0])
                        .attr('cy', center[1])
                        .attr('r', mapRadius)
                        .attr('fill', 'none')
                        .attr('stroke', textColor)
                        .attr('stroke-width', debouncedShapeOutlineWidth);
                }
            }
        }

    }, [
        starsData, constellationsData, // Data
        date, time, lat, lng, // Projection
        debouncedStarScale, debouncedLineWeight, gridWidth, glowIntensity, gridOpacity, // Style
        showBorder, showConstellations, showGrid, designStyle, maskShape, isLightMode, // Toggles
        debouncedCircleSize, debouncedHeartSize, debouncedShapeOffsetY, debouncedShapeOutlineWidth, // Shape
        posterColor, textColor, starColor, mapInteriorColor, width, height, // Colors & Dims
        mapBackgroundImage, borderStyle, posterType // New Props
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

        const textStartY = selectedTemplate === 'modern-white' ? height * 0.75 : height * 0.82;

        // --- Independent Text Groups & Drag Logic ---

        let naturalY = 0; // Tracks the "natural" flow position without offsets

        // Helper to create drag behavior
        const createDragBehavior = (
            currentOffset: number,
            setOffset: (val: number) => void,
            naturalBaseY: number
        ) => {
            let dragStartOffset = 0;
            return drag<SVGGElement, unknown>()
                .on('start', () => { dragStartOffset = 0; })
                .on('drag', function (event) {
                    dragStartOffset += event.dy;
                    select(this).attr('transform', `translate(${width / 2}, ${textStartY + naturalBaseY + currentOffset + dragStartOffset})`);
                })
                .on('end', () => {
                    setOffset(currentOffset + dragStartOffset);
                });
        };

        // Helper to add hit area
        const addHitArea = (group: any, textNode: any) => {
            const bbox = textNode.node().getBBox();
            // Fallback for zero bbox (e.g. if font not loaded or empty text)
            const width = bbox.width || 200;
            const height = bbox.height || 40;
            const x = bbox.x || -100;
            const y = bbox.y || -20;

            group.insert('rect', 'text') // Insert behind text
                .attr('x', x - 20)
                .attr('y', y - 10)
                .attr('width', width + 40)
                .attr('height', height + 20)
                .attr('fill', 'transparent')
                .style('cursor', 'move')
                .style('pointer-events', 'all');
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

        // 1. Title Group
        const titleGroup = textLayer.append('g')
            .attr('transform', `translate(${width / 2}, ${textStartY + naturalY + titleOffsetY})`)
            .attr('text-anchor', 'middle');

        const titleNode = titleGroup.append('text')
            .attr('fill', textColor)
            .attr('font-family', `${titleFont}, serif`)
            .attr('font-size', `${titleFontSize}px`)
            .attr('font-weight', 'bold')
            .attr('letter-spacing', `${debouncedTitleKerning}em`)
            .style('white-space', 'pre')
            .text((customText.title || title));

        addHitArea(titleGroup, titleNode);
        titleGroup.call(createDragBehavior(titleOffsetY, setTitleOffsetY, naturalY));

        // Advance Natural Y
        naturalY += (titleFontSize * 0.8) + config.titleBottomMargin;

        // 2. Subtitle Group
        const subtitleGroup = textLayer.append('g')
            .attr('transform', `translate(${width / 2}, ${textStartY + naturalY + subtitleOffsetY})`)
            .attr('text-anchor', 'middle');

        const subtitleNode = subtitleGroup.append('text')
            .attr('fill', textColor)
            .attr('font-family', `${subtitleFont}, sans-serif`)
            .attr('font-size', `${subtitleFontSize}px`)
            .attr('font-weight', '300')
            .attr('letter-spacing', `${debouncedSubtitleKerning}em`)
            .style('white-space', 'pre')
            .text((customText.subtitle || subtitle).toUpperCase());

        addHitArea(subtitleGroup, subtitleNode);
        subtitleGroup.call(createDragBehavior(subtitleOffsetY, setSubtitleOffsetY, naturalY));

        // Advance Natural Y
        naturalY += (subtitleFontSize * 0.8) + config.subtitleBottomMargin;

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

        const detailsText = [
            showLocation ? locStr : null,
            showCoords ? coordsStr : null,
            showDate ? dateStr : null
        ].filter(Boolean);

        let detailsHeight = 0;
        if (detailsText.length > 0) {
            // Add hit area FIRST (before text)
            detailsGroup.append('rect')
                .attr('x', -150) // Wide enough for coordinates
                .attr('y', -15)
                .attr('width', 300)
                .attr('height', detailsText.length * (detailsFontSize * config.detailsLineHeight + config.detailsSpacing) + 30)
                .attr('fill', 'transparent')
                .style('cursor', 'move')
                .style('pointer-events', 'all');

            // Then add text on top
            detailsText.forEach((line, i) => {
                detailsGroup.append('text')
                    .attr('y', i * (detailsFontSize * config.detailsLineHeight + config.detailsSpacing))
                    .attr('fill', textColor)
                    .attr('font-family', `${detailsFont}, sans-serif`)
                    .attr('font-size', `${detailsFontSize}px`)
                    .attr('font-weight', '400')
                    .attr('letter-spacing', selectedTemplate === 'modern-white' ? `${debouncedDetailsKerning + 0.02}em` : `${debouncedDetailsKerning}em`)
                    .attr('opacity', 0.8)
                    .style('white-space', 'pre')
                    .style('pointer-events', 'none') // Text doesn't capture events
                    .text(line as string);
            });

            // Calculate height for natural flow
            detailsHeight = (detailsText.length * (detailsFontSize * config.detailsLineHeight + config.detailsSpacing));

            detailsGroup.call(createDragBehavior(detailsOffsetY, setDetailsOffsetY, naturalY));
        }

        // Advance Natural Y
        naturalY += detailsHeight + config.dedicationTopMargin;

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
                .attr('letter-spacing', `${debouncedDedicationKerning}em`)
                .text(customText.dedication);

            addHitArea(dedicationGroup, dedicationNode);
            dedicationGroup.call(createDragBehavior(dedicationOffsetY, setDedicationOffsetY, naturalY));
        }

    }, [
        title, subtitle, customText, location, date, lat, lng, // Content
        titleFont, subtitleFont, detailsFont, dedicationFont, // Fonts
        titleFontSize, subtitleFontSize, detailsFontSize, dedicationFontSize, // Sizes
        debouncedTitleKerning, debouncedSubtitleKerning, debouncedDetailsKerning, debouncedDedicationKerning, // Kerning
        titleOffsetY, subtitleOffsetY, detailsOffsetY, dedicationOffsetY, // Offsets
        showDate, showLocation, showCoords, // Toggles
        textColor, width, height, // Global
        selectedTemplate // New Prop
    ]);

    return (
        <svg
            ref={svgRef}
            className="w-full h-full"
            style={{ backgroundColor: posterColor }}
            preserveAspectRatio="xMidYMid meet"
        />
    );
};

export default VectorStarMap;
