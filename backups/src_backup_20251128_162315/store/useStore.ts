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

    // Shape Size & Position
    circleSize: number;
    heartSize: number;
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

    // Preview Zoom
    previewZoom: number;

    // New Feature Toggles
    showConstellations: boolean;
    showMilkyWay: boolean;
    showGrid: boolean;
    designStyle: 'standard' | 'fineline' | 'minimal';
    maskShape: 'circle' | 'heart';
    isLightMode: boolean;

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

    // Setters
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
    setPrintSize: (size: { label: string; width: number; height: number; ratio: string }) => void;
    setCustomText: (key: keyof StoreState['customText'], value: string) => void;
    setCircleSize: (size: number) => void;
    setHeartSize: (size: number) => void;
    setShapeOffsetY: (offset: number) => void;
    setTitleFontSize: (size: number) => void;
    setSubtitleFontSize: (size: number) => void;
    setDetailsFontSize: (size: number) => void;
    setDedicationFontSize: (size: number) => void;
    setTitleOffsetY: (offset: number) => void;
    setSubtitleOffsetY: (offset: number) => void;
    setDetailsOffsetY: (offset: number) => void;
    setDedicationOffsetY: (offset: number) => void;
    setPreviewZoom: (zoom: number) => void;
}

export const useStore = create<StoreState>((set) => ({
    // Core Data - Default Values
    title: 'My Star Map',
    subtitle: 'The Night Sky',
    date: new Date(),
    time: '22:00', // Default 10 PM
    location: '',
    lat: 0,
    lng: 0,

    // Style Config - Default Values
    starScale: 1.0,
    lineWeight: 1.0,
    gridWidth: 0.5,
    glowIntensity: 5,
    gridOpacity: 0.3,
    showBorder: true,
    posterColor: '#1B2735',
    textColor: '#ffffff',

    // Shape Size & Position - Default Values
    circleSize: 1.0,
    heartSize: 1.0,
    shapeOffsetY: 0,

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

    // Preview Zoom - Default Value
    previewZoom: 1.0,

    // New Feature Defaults
    showConstellations: true,
    showMilkyWay: false,
    showGrid: true,
    designStyle: 'standard',
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
        dedication: ''
    },

    // Print Size - Default 18x24
    printSize: { label: '18x24"', width: 18, height: 24, ratio: '3/4' },

    // Setters
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
    setPrintSize: (printSize) => set({ printSize }),
    setCustomText: (key, value) => set((state) => ({
        customText: { ...state.customText, [key]: value }
    })),
    setCircleSize: (circleSize) => set({ circleSize }),
    setHeartSize: (heartSize) => set({ heartSize }),
    setShapeOffsetY: (shapeOffsetY) => set({ shapeOffsetY }),
    setTitleFontSize: (titleFontSize) => set({ titleFontSize }),
    setSubtitleFontSize: (subtitleFontSize) => set({ subtitleFontSize }),
    setDetailsFontSize: (detailsFontSize) => set({ detailsFontSize }),
    setDedicationFontSize: (dedicationFontSize) => set({ dedicationFontSize }),
    setTitleOffsetY: (titleOffsetY) => set({ titleOffsetY }),
    setSubtitleOffsetY: (subtitleOffsetY) => set({ subtitleOffsetY }),
    setDetailsOffsetY: (detailsOffsetY) => set({ detailsOffsetY }),
    setDedicationOffsetY: (dedicationOffsetY) => set({ dedicationOffsetY }),
    setPreviewZoom: (previewZoom) => set({ previewZoom }),
}));
