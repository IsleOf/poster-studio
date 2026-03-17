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
    maskShape: 'circle' | 'heart';
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

    // Poster Type
    posterType: 'starmap' | 'streetmap';

    // Street Map Settings
    mapCity: string;
    mapCenterLat: number;
    mapCenterLng: number;
    mapZoom: number;
    mapBgColor: string;
    mapStreetColor: string;
    mapColorPreset: string;

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
    setMaskShape: (shape: 'circle' | 'heart') => void;
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
    setPosterType: (type: 'starmap' | 'streetmap') => void;
    setMapCity: (city: string) => void;
    setMapCenterLat: (lat: number) => void;
    setMapCenterLng: (lng: number) => void;
    setMapZoom: (zoom: number) => void;
    setMapBgColor: (color: string) => void;
    setMapStreetColor: (color: string) => void;
    setMapColorPreset: (preset: string) => void;
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
    shapeOutlineWidth: 2.0,
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

    // Print Size - Default 18x24
    printSize: { label: '18x24"', width: 18, height: 24, ratio: '3/4' },

    // Poster Type - Default star map
    posterType: 'starmap',

    // Street Map Settings - Defaults
    mapCity: '',
    mapCenterLat: 48.8566,
    mapCenterLng: 2.3522,
    mapZoom: 13,
    mapBgColor: '#1a1a2e',
    mapStreetColor: '#3d5a80',
    mapColorPreset: 'midnight',

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
    setDesignStyle: (designStyle) => set({ designStyle }),
    setMaskShape: (maskShape) => set({ maskShape }),
    setIsLightMode: (isLightMode) => set({ isLightMode }),
    setShowLocation: (showLocation) => set({ showLocation }),
    setShowDate: (showDate) => set({ showDate }),
    setShowCoords: (showCoords) => set({ showCoords }),
    setPosterColor: (posterColor) => set({ posterColor }),
    setTextColor: (textColor) => set({ textColor }),
    setStarColor: (starColor) => set({ starColor }),
    setMapInteriorColor: (mapInteriorColor) => set({ mapInteriorColor }),
    setPrintSize: (printSize) => set({ printSize }),
    setCustomText: (key, value) => set((state) => ({
        customText: { ...state.customText, [key]: value }
    })),
    setCircleSize: (circleSize) => set({ circleSize }),
    setHeartSize: (heartSize) => set({ heartSize }),
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

    // Poster type setters
    setPosterType: (posterType) => set({ posterType }),
    setMapCity: (mapCity) => set({ mapCity }),
    setMapCenterLat: (mapCenterLat) => set({ mapCenterLat }),
    setMapCenterLng: (mapCenterLng) => set({ mapCenterLng }),
    setMapZoom: (mapZoom) => set({ mapZoom }),
    setMapBgColor: (mapBgColor) => set({ mapBgColor }),
    setMapStreetColor: (mapStreetColor) => set({ mapStreetColor }),
    setMapColorPreset: (mapColorPreset) => set({ mapColorPreset }),
}));
