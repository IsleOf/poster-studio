import { create } from 'zustand';

interface StoreState {
    // Core Data
    title: string;
    subtitle: string;
    date: Date;
    time: string; // Added Time
    location: string;
    lat: number;
    lng: number;

    // Style Config
    starScale: number;
    lineWeight: number;
    gridWidth: number;
    glowIntensity: number;
    gridOpacity: number;
    showBorder: boolean;
    posterColor: string;
    textColor: string;
    starColor: string; // NEW: Separate color for stars
    mapInteriorColor: string; // NEW: Separate color for inside the map shape

    // Frame Controls
    showFrame: boolean;
    frameInset: number; // Distance from edge in pixels
    frameWidth: number; // Thickness of frame line

    // Shape Size & Position
    circleSize: number;
    heartSize: number;
    houseSize: number;
    shapeOutlineWidth: number; // NEW: Outline width for circle/heart
    shapeOffsetY: number;

    // Font Sizes
    titleFontSize: number;
    subtitleFontSize: number;
    detailsFontSize: number;
    dedicationFontSize: number;

    // Text Positions
    titleOffsetY: number;
    subtitleOffsetY: number;
    detailsOffsetY: number;
    dedicationOffsetY: number;
    dividerOffsetY: number;
    showDivider: boolean;
    dividerLength: number;
    dividerThickness: number;

    // Font and Kerning
    titleFont: string;
    subtitleFont: string;
    detailsFont: string;
    dedicationFont: string;
    titleKerning: number;
    subtitleKerning: number;
    detailsKerning: number;
    dedicationKerning: number;

    // Preview Zoom
    previewZoom: number;

    // New Feature Toggles
    showConstellations: boolean;
    showMilkyWay: boolean;
    showGrid: boolean;
    designStyle: 'standard' | 'fineline' | 'minimal';
    finelineWidth: number; // NEW: Width for fineline double lines
    maskShape: 'circle' | 'heart' | 'house';
    isLightMode: boolean;

    // Preview Pan/Drag State
    previewPanX: number;
    previewPanY: number;

    // Visibility Toggles (Additional Options)
    showLocation: boolean;
    showDate: boolean;
    showCoords: boolean;

    // Custom Text Overrides
    customText: {
        title: string;
        subtitle: string;
        date: string;
        location: string;
        coords: string;
        dedication: string;
    };

    // Print Size
    printSize: { label: string; width: number; height: number; ratio: string };

    // Map image pan offset (drag-to-reposition within the clip shape)
    mapImageOffsetX: number;
    mapImageOffsetY: number;

    // Poster Type
    posterType: 'starmap' | 'streetmap' | 'coloredmap';

    // Street Map Settings
    mapCity: string;
    mapCenterLat: number;
    mapCenterLng: number;
    mapZoom: number;
    mapBgColor: string;
    mapStreetColor: string;
    mapColorPreset: string;
    mapStyleUrl: string | null; // null = custom 2-color style; URL = use prebuilt style (e.g. realistic)

    // Setters
    // Template System
    selectedTemplate: string;
    mapBackgroundImage: string | null;
    borderStyle: 'simple' | 'double-offset' | 'dashed';
    templateSettings: Record<string, Partial<StoreState>>; // Store settings for each template

    // Setters
    setSelectedTemplate: (template: string) => void;
    setMapBackgroundImage: (url: string | null) => void;
    setBorderStyle: (style: 'simple' | 'double-offset' | 'dashed') => void;
    saveTemplateSettings: (templateId: string) => void;
    restoreTemplateSettings: (templateId: string) => void;
    saveTemplateDefaults: (templateId: string) => void;
    loadTemplateDefaults: (templateId: string) => Partial<StoreState> | null;

    setTitle: (title: string) => void;
    setSubtitle: (subtitle: string) => void;
    setDate: (date: Date) => void;
    setTime: (time: string) => void;
    setLocation: (location: string) => void;
    setLat: (lat: number) => void;
    setLng: (lng: number) => void;
    setStarScale: (starScale: number) => void;
    setLineWeight: (lineWeight: number) => void;
    setGridWidth: (gridWidth: number) => void;
    setGlowIntensity: (glowIntensity: number) => void;
    setGridOpacity: (gridOpacity: number) => void;
    setShowBorder: (show: boolean) => void;
    setShowConstellations: (show: boolean) => void;
    setShowMilkyWay: (show: boolean) => void;
    setShowGrid: (show: boolean) => void;
    setDesignStyle: (style: 'standard' | 'fineline' | 'minimal') => void;
    setMaskShape: (shape: 'circle' | 'heart' | 'house') => void;
    setIsLightMode: (isLight: boolean) => void;
    setShowLocation: (show: boolean) => void;
    setShowDate: (show: boolean) => void;
    setShowCoords: (show: boolean) => void;
    setPosterColor: (posterColor: string) => void;
    setTextColor: (textColor: string) => void;
    setStarColor: (starColor: string) => void;
    setMapInteriorColor: (color: string) => void;
    setPrintSize: (size: { label: string; width: number; height: number; ratio: string }) => void;
    setCustomText: (key: keyof StoreState['customText'], value: string) => void;
    setCircleSize: (size: number) => void;
    setHeartSize: (size: number) => void;
    setHouseSize: (size: number) => void;
    setShapeOutlineWidth: (width: number) => void;
    setShapeOffsetY: (offset: number) => void;
    setTitleFontSize: (size: number) => void;
    setSubtitleFontSize: (size: number) => void;
    setDetailsFontSize: (size: number) => void;
    setDedicationFontSize: (size: number) => void;
    setTitleOffsetY: (offset: number) => void;
    setSubtitleOffsetY: (offset: number) => void;
    setDetailsOffsetY: (offset: number) => void;
    setDedicationOffsetY: (offset: number) => void;
    setDividerOffsetY: (offset: number) => void;
    setShowDivider: (show: boolean) => void;
    setDividerLength: (length: number) => void;
    setDividerThickness: (thickness: number) => void;
    setPreviewZoom: (zoom: number) => void;
    setPreviewPanX: (x: number) => void;
    setPreviewPanY: (y: number) => void;
    isInlineEditing: boolean;
    setIsInlineEditing: (editing: boolean) => void;
    setShowFrame: (show: boolean) => void;
    setFrameInset: (inset: number) => void;
    setFrameWidth: (width: number) => void;
    setFinelineWidth: (width: number) => void;
    setTitleFont: (font: string) => void;
    setSubtitleFont: (font: string) => void;
    setDetailsFont: (font: string) => void;
    setDedicationFont: (font: string) => void;
    setTitleKerning: (kerning: number) => void;
    setSubtitleKerning: (kerning: number) => void;
    setDetailsKerning: (kerning: number) => void;
    setDedicationKerning: (kerning: number) => void;

    // Poster type setters
    setPosterType: (type: 'starmap' | 'streetmap' | 'coloredmap') => void;
    setMapCity: (city: string) => void;
    setMapCenterLat: (lat: number) => void;
    setMapCenterLng: (lng: number) => void;
    setMapZoom: (zoom: number) => void;
    setMapBgColor: (color: string) => void;
    setMapStreetColor: (color: string) => void;
    setMapColorPreset: (preset: string) => void;
    setMapStyleUrl: (url: string | null) => void;
    setMapImageOffsetX: (x: number) => void;
    setMapImageOffsetY: (y: number) => void;

    // Active typography field (set when user clicks a text element in the poster)
    activeTypoField: 'title' | 'subtitle' | 'details' | 'dedication' | null;
    setActiveTypoField: (field: 'title' | 'subtitle' | 'details' | 'dedication' | null) => void;

    // Pending glyph to be inserted at cursor in the inline edit input
    pendingGlyphForInlineEdit: string | null;
    setPendingGlyphForInlineEdit: (glyph: string | null) => void;

    // Location pin (small red heart on map)
    showLocationPin: boolean;
    locationPinSize: number;
    locationPinOffsetX: number;
    locationPinOffsetY: number;
    setShowLocationPin: (show: boolean) => void;
    setLocationPinSize: (size: number) => void;
    setLocationPinOffsetX: (x: number) => void;
    setLocationPinOffsetY: (y: number) => void;
}

export const useStore = create<StoreState>((set) => ({
    // Core Data - Default Values
    title: 'My Star Map',
    subtitle: '',
    date: new Date(),
    time: '22:00', // Default 10 PM
    location: '',
    lat: 0,
    lng: 0,

    // Style Config - Default Values
    starScale: 1.9,
    lineWeight: 1.6,
    gridWidth: 0.5,
    glowIntensity: 5,
    gridOpacity: 0.3,
    showBorder: true,
    posterColor: '#1B2735',
    textColor: '#ffffff',
    starColor: '#ffffff',
    mapInteriorColor: '#1B2735', // Default to match poster

    // Shape Size & Position - Default Values
    circleSize: 1.0,
    heartSize: 1.0,
    houseSize: 1.0,
    shapeOutlineWidth: 1.0,
    shapeOffsetY: -60, // Move shapes higher by default

    // Font Sizes - Default Values
    titleFontSize: 80,
    subtitleFontSize: 32,
    detailsFontSize: 24,
    dedicationFontSize: 24,

    // Text Positions - Default Values
    titleOffsetY: 0,
    subtitleOffsetY: 0,
    detailsOffsetY: 0,
    dedicationOffsetY: 0,
    dividerOffsetY: 0,
    showDivider: false, // Off by default for all templates except Modern White
    dividerLength: 90, // Total width in px
    dividerThickness: 0.5,

    // Font and Kerning Defaults
    titleFont: 'Playfair Display',
    subtitleFont: 'Lato',
    detailsFont: 'Lato',
    dedicationFont: 'Playfair Display',
    titleKerning: 0.05,
    subtitleKerning: 0.2,
    detailsKerning: 0.1,
    dedicationKerning: 0.05,

    // Preview Zoom & Pan - Default Values
    previewZoom: 1.0,
    previewPanX: 0,
    previewPanY: 0,
    isInlineEditing: false,

    // Frame Defaults
    showFrame: true,
    frameInset: 40, // 40px from edge
    frameWidth: 5,

    // New Feature Defaults
    showConstellations: true,
    showMilkyWay: false,
    showGrid: true,
    designStyle: 'standard',
    finelineWidth: 1.0,
    maskShape: 'circle',
    isLightMode: false,

    // Visibility Defaults
    showLocation: true,
    showDate: true,
    showCoords: true,

    // Custom Text - Defaults empty (use auto-generated)
    customText: {
        title: '',
        subtitle: '',
        date: '',
        location: '',
        coords: '',
        dedication: 'Personal Dedication' // Default placeholder text
    },

    // Print Size - Default 8x10
    printSize: { label: '8x10"', width: 8, height: 10, ratio: '4/5' },

    // Map image pan offsets
    mapImageOffsetX: 0,
    mapImageOffsetY: 0,
    activeTypoField: null,
    pendingGlyphForInlineEdit: null,
    showLocationPin: true,
    locationPinSize: 70,
    locationPinOffsetX: 0,
    locationPinOffsetY: 0,

    // Poster Type - Default star map
    posterType: 'starmap',

    // Street Map Settings - Defaults
    mapCity: '',
    mapCenterLat: 48.8566,
    mapCenterLng: 2.3522,
    mapZoom: 14, // zoom 14+ is needed for OpenFreeMap to include residential streets
    mapBgColor: '#1a1a2e',
    mapStreetColor: '#3d5a80',
    mapColorPreset: 'midnight',
    mapStyleUrl: null,

    // Setters
    // Template System - Default Values
    selectedTemplate: 'custom',
    mapBackgroundImage: null,
    borderStyle: 'simple',
    templateSettings: {},

    // Setters Implementation
    setSelectedTemplate: (selectedTemplate) => set({ selectedTemplate }),
    setMapBackgroundImage: (mapBackgroundImage) => set({ mapBackgroundImage }),
    setBorderStyle: (borderStyle) => set({ borderStyle }),
    saveTemplateSettings: (templateId) => set((state) => {
        // Create a snapshot of current visual settings
        const snapshot: Partial<StoreState> = {
            posterColor: state.posterColor,
            textColor: state.textColor,
            starColor: state.starColor,
            mapInteriorColor: state.mapInteriorColor,
            starScale: state.starScale,
            lineWeight: state.lineWeight,
            gridWidth: state.gridWidth,
            glowIntensity: state.glowIntensity,
            gridOpacity: state.gridOpacity,
            showBorder: state.showBorder,
            showConstellations: state.showConstellations,
            showMilkyWay: state.showMilkyWay,
            showGrid: state.showGrid,
            designStyle: state.designStyle,
            maskShape: state.maskShape,
            isLightMode: state.isLightMode,
            mapBackgroundImage: state.mapBackgroundImage,
            borderStyle: state.borderStyle,
            showFrame: state.showFrame,
            frameInset: state.frameInset,
            frameWidth: state.frameWidth,
            shapeOutlineWidth: state.shapeOutlineWidth,
            titleFont: state.titleFont,
            subtitleFont: state.subtitleFont,
            detailsFont: state.detailsFont,
            dedicationFont: state.dedicationFont,
            titleFontSize: state.titleFontSize,
            subtitleFontSize: state.subtitleFontSize,
            detailsFontSize: state.detailsFontSize,
            dedicationFontSize: state.dedicationFontSize,
            titleOffsetY: state.titleOffsetY,
            subtitleOffsetY: state.subtitleOffsetY,
            detailsOffsetY: state.detailsOffsetY,
            dedicationOffsetY: state.dedicationOffsetY,
            dividerOffsetY: state.dividerOffsetY,
            // Add other visual props as needed
        };
        return {
            templateSettings: {
                ...state.templateSettings,
                [templateId]: snapshot
            }
        };
    }),
    restoreTemplateSettings: (templateId) => set((state) => {
        const settings = state.templateSettings[templateId];
        if (settings) {
            return { ...settings };
        }
        return {};
    }),
    saveTemplateDefaults: (templateId) => {
        const state = useStore.getState();
        // Create a snapshot of current visual settings (same as saveTemplateSettings)
        const snapshot: Partial<StoreState> = {
            posterColor: state.posterColor,
            textColor: state.textColor,
            starColor: state.starColor,
            mapInteriorColor: state.mapInteriorColor,
            starScale: state.starScale,
            lineWeight: state.lineWeight,
            gridWidth: state.gridWidth,
            glowIntensity: state.glowIntensity,
            gridOpacity: state.gridOpacity,
            showBorder: state.showBorder,
            showConstellations: state.showConstellations,
            showMilkyWay: state.showMilkyWay,
            showGrid: state.showGrid,
            designStyle: state.designStyle,
            maskShape: state.maskShape,
            isLightMode: state.isLightMode,
            mapBackgroundImage: state.mapBackgroundImage,
            borderStyle: state.borderStyle,
            showFrame: state.showFrame,
            frameInset: state.frameInset,
            frameWidth: state.frameWidth,
            shapeOutlineWidth: state.shapeOutlineWidth,
            titleFont: state.titleFont,
            subtitleFont: state.subtitleFont,
            detailsFont: state.detailsFont,
            dedicationFont: state.dedicationFont,
            titleFontSize: state.titleFontSize,
            subtitleFontSize: state.subtitleFontSize,
            detailsFontSize: state.detailsFontSize,
            dedicationFontSize: state.dedicationFontSize,
            titleOffsetY: state.titleOffsetY,
            subtitleOffsetY: state.subtitleOffsetY,
            detailsOffsetY: state.detailsOffsetY,
            dedicationOffsetY: state.dedicationOffsetY,
            dividerOffsetY: state.dividerOffsetY,
            showDivider: state.showDivider,
            dividerLength: state.dividerLength,
            dividerThickness: state.dividerThickness,
        };

        // Save to localStorage
        try {
            const savedDefaults = JSON.parse(localStorage.getItem('templateDefaults') || '{}');
            savedDefaults[templateId] = snapshot;
            localStorage.setItem('templateDefaults', JSON.stringify(savedDefaults));
        } catch (error) {
            console.error('Failed to save template defaults:', error);
        }
    },
    loadTemplateDefaults: (templateId): Partial<StoreState> | null => {
        try {
            const savedDefaults = JSON.parse(localStorage.getItem('templateDefaults') || '{}');
            return savedDefaults[templateId] || null;
        } catch (error) {
            console.error('Failed to load template defaults:', error);
            return null;
        }
    },

    setTitle: (title) => set({ title }),
    setSubtitle: (subtitle) => set({ subtitle }),
    setDate: (date) => set({ date }),
    setTime: (time) => set({ time }),
    setLocation: (location) => set({ location }),
    setLat: (lat) => set({ lat }),
    setLng: (lng) => set({ lng }),
    setStarScale: (starScale) => set({ starScale }),
    setLineWeight: (lineWeight) => set({ lineWeight }),
    setGridWidth: (gridWidth) => set({ gridWidth }),
    setGlowIntensity: (glowIntensity) => set({ glowIntensity }),
    setGridOpacity: (gridOpacity) => set({ gridOpacity }),
    setShowBorder: (showBorder) => set({ showBorder }),
    setShowConstellations: (showConstellations) => set({ showConstellations }),
    setShowMilkyWay: (showMilkyWay) => set({ showMilkyWay }),
    setShowGrid: (showGrid) => set({ showGrid }),
    setDesignStyle: (designStyle) => set({
        designStyle,
        borderStyle: designStyle === 'fineline' ? 'double-offset' : 'simple',
    }),
    setMaskShape: (maskShape) => set({ maskShape }),
    setIsLightMode: (isLightMode) => set({ isLightMode }),
    setShowLocation: (showLocation) => set({ showLocation }),
    setShowDate: (showDate) => set({ showDate }),
    setShowCoords: (showCoords) => set({ showCoords }),
    // Keep mapBgColor in sync with posterColor so street-map background always
    // matches the overall design palette when the user changes the poster color.
    setPosterColor: (posterColor) => set({ posterColor, mapBgColor: posterColor }),
    setTextColor: (textColor) => set({ textColor }),
    setStarColor: (starColor) => set({ starColor }),
    setMapInteriorColor: (mapInteriorColor) => set({ mapInteriorColor }),
    setPrintSize: (printSize) => set(() => {
        // All formats share the same circle size (1.0) — the SVG coordinate system handles
        // the physical size difference. 8x10 and 16x20 are the same aspect ratio and thus
        // identical SVG dimensions (1200×1500), so their designs should look identical.
        // Fonts scale purely by SVG height ratio relative to the 18x24 baseline (1600px).
        const svgHeights: Record<string, number> = {
            '8x10"':  1500,   // ratio 4:5  → same SVG as 16x20
            '11x14"': 1527,   // ratio 11:14
            '18x24"': 1600,   // baseline
            '24x36"': 1800,   // ratio 2:3
        };
        const baseH = svgHeights['18x24"'];
        const h     = svgHeights[printSize.label] ?? baseH;
        const r     = h / baseH;

        return {
            printSize,
            // Circle identical across all sizes — proportions stay consistent
            circleSize:   1.0,
            heartSize:    1.0,
            houseSize:    1.0,
            shapeOffsetY: -60,
            // Fonts scale with SVG canvas height so text occupies the same visual proportion
            titleFontSize:      Math.round(80 * r),
            subtitleFontSize:   Math.round(32 * r),
            detailsFontSize:    Math.round(24 * r),
            dedicationFontSize: Math.round(24 * r),
        };
    }),
    setCustomText: (key, value) => set((state) => ({
        customText: { ...state.customText, [key]: value }
    })),
    setCircleSize: (circleSize) => set({ circleSize }),
    setHeartSize: (heartSize) => set({ heartSize }),
    setHouseSize: (houseSize) => set({ houseSize }),
    setShapeOutlineWidth: (shapeOutlineWidth) => set({ shapeOutlineWidth }),
    setShapeOffsetY: (shapeOffsetY) => set({ shapeOffsetY }),
    setTitleFontSize: (titleFontSize) => set({ titleFontSize }),
    setSubtitleFontSize: (subtitleFontSize) => set({ subtitleFontSize }),
    setDetailsFontSize: (detailsFontSize) => set({ detailsFontSize }),
    setDedicationFontSize: (dedicationFontSize) => set({ dedicationFontSize }),
    setTitleOffsetY: (titleOffsetY) => set({ titleOffsetY }),
    setSubtitleOffsetY: (subtitleOffsetY) => set({ subtitleOffsetY }),
    setDetailsOffsetY: (detailsOffsetY) => set({ detailsOffsetY }),
    setDedicationOffsetY: (dedicationOffsetY) => set({ dedicationOffsetY }),
    setDividerOffsetY: (dividerOffsetY) => set({ dividerOffsetY }),
    setShowDivider: (showDivider) => set({ showDivider }),
    setDividerLength: (dividerLength) => set({ dividerLength }),
    setDividerThickness: (dividerThickness) => set({ dividerThickness }),
    setPreviewZoom: (previewZoom) => set({ previewZoom }),
    setPreviewPanX: (previewPanX) => set({ previewPanX }),
    setPreviewPanY: (previewPanY) => set({ previewPanY }),
    setIsInlineEditing: (isInlineEditing) => set({ isInlineEditing }),
    setShowFrame: (showFrame) => set({ showFrame }),
    setFrameInset: (frameInset) => set({ frameInset }),
    setFrameWidth: (frameWidth) => set({ frameWidth }),
    setFinelineWidth: (finelineWidth) => set({ finelineWidth }),
    setTitleFont: (titleFont) => set({ titleFont }),
    setSubtitleFont: (subtitleFont) => set({ subtitleFont }),
    setDetailsFont: (detailsFont) => set({ detailsFont }),
    setDedicationFont: (dedicationFont) => set({ dedicationFont }),
    setTitleKerning: (titleKerning) => set({ titleKerning }),
    setSubtitleKerning: (subtitleKerning) => set({ subtitleKerning }),
    setDetailsKerning: (detailsKerning) => set({ detailsKerning }),
    setDedicationKerning: (dedicationKerning) => set({ dedicationKerning }),

    // Poster type setters — sync mapStyleUrl so StreetMapCapture uses the right style
    setPosterType: (posterType) => set({
        posterType,
        showLocationPin: posterType === 'coloredmap',
        mapStyleUrl: posterType === 'coloredmap'
            ? 'https://tiles.openfreemap.org/styles/bright'
            : null,
    }),
    setMapCity: (mapCity) => set({ mapCity, mapImageOffsetX: 0, mapImageOffsetY: 0, locationPinOffsetX: 0, locationPinOffsetY: 0 }),
    setMapCenterLat: (mapCenterLat) => set({ mapCenterLat }),
    setMapCenterLng: (mapCenterLng) => set({ mapCenterLng }),
    setMapZoom: (mapZoom) => set({ mapZoom }),
    setMapBgColor: (mapBgColor) => set({ mapBgColor }),
    setMapStreetColor: (mapStreetColor) => set({ mapStreetColor }),
    setMapColorPreset: (mapColorPreset) => set({ mapColorPreset }),
    setMapStyleUrl: (mapStyleUrl) => set({ mapStyleUrl }),
    setMapImageOffsetX: (mapImageOffsetX) => set({ mapImageOffsetX }),
    setMapImageOffsetY: (mapImageOffsetY) => set({ mapImageOffsetY }),
    setActiveTypoField: (activeTypoField) => set({ activeTypoField }),
    setPendingGlyphForInlineEdit: (pendingGlyphForInlineEdit) => set({ pendingGlyphForInlineEdit }),
    setShowLocationPin: (showLocationPin) => set({ showLocationPin }),
    setLocationPinSize: (locationPinSize) => set({ locationPinSize }),
    setLocationPinOffsetX: (locationPinOffsetX) => set({ locationPinOffsetX }),
    setLocationPinOffsetY: (locationPinOffsetY) => set({ locationPinOffsetY }),
}));
