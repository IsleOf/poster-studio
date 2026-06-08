import { create } from 'zustand';
import type { MapExportTarget } from '../utils/mapExportSizing';

// ── History helpers ──────────────────────────────────────────────────────────

const MAX_HISTORY = 30;

// Design-affecting fields (excludes UI/preview state and history itself)
const DESIGN_FIELDS = [
    'title', 'subtitle', 'date', 'time', 'location', 'lat', 'lng',
    'starScale', 'lineWeight', 'gridWidth', 'glowIntensity', 'gridOpacity',
    'showBorder', 'posterColor', 'textColor', 'starColor', 'mapInteriorColor',
    'showFrame', 'frameInset', 'frameWidth', 'finelineWidth',
    'circleSize', 'heartSize', 'houseSize', 'shapeOutlineWidth', 'shapeOffsetY', 'shapeOffsetX', 'snapEnabled',
    'showInnerRing', 'innerRingWidth', 'innerRingInset',
    'showOuterRing', 'outerRingWidth', 'outerRingGap',
    'showHeartDecor',
    'titleFontSize', 'subtitleFontSize', 'detailsFontSize', 'dedicationFontSize', 'namesFontSize',
    'titleOffsetX', 'titleOffsetY', 'subtitleOffsetY', 'detailsOffsetY', 'dedicationOffsetY', 'namesOffsetY',
    'heartDecorOffsetY', 'dividerOffsetY', 'showDivider', 'dividerLength', 'dividerThickness', 'vertSepOffsetY', 'showVertSep', 'vertSepHeight', 'vertSepThickness',
    'showNames',
    'showConstellations', 'showMilkyWay', 'showGrid', 'showLocation', 'showDate', 'showCoords', 'detailsDateFirst',
    'maskShape', 'isLightMode', 'designStyle', 'borderStyle',
    'titleFont', 'subtitleFont', 'detailsFont', 'dedicationFont', 'namesFont',
    'titleKerning', 'subtitleKerning', 'detailsKerning', 'dedicationKerning', 'namesKerning',
    'titleAllCaps', 'locationAllCaps',
    'customText', 'posterType', 'printSize', 'selectedTemplate',
    'mapCity', 'mapCenterLat', 'mapCenterLng', 'mapZoom', 'mapBearing',
    'mapBgColor', 'mapStreetColor', 'mapWaterColor', 'mapLandColor',
    'mapMainRoadColor', 'mapSmallRoadColor', 'mapDetailRoadColor',
    'mapColorPreset', 'mapStyleUrl',
    'mapBackgroundImage', 'mapImageOffsetX', 'mapImageOffsetY', 'mapImageOpacity',
    'showLocationPin', 'locationPinSize', 'locationPinOffsetX', 'locationPinOffsetY',
    'backgroundImageUrl', 'backgroundImageOffsetY',
] as const;

type DesignField = typeof DESIGN_FIELDS[number];

function captureDesignSnapshot(state: StoreState): Partial<StoreState> {
    const snap: Partial<StoreState> = {};
    for (const key of DESIGN_FIELDS) {
        (snap as Record<string, unknown>)[key] = (state as unknown as Record<string, unknown>)[key];
    }
    return snap;
}

export type MapCaptureOptions = Partial<Pick<MapExportTarget, 'targetPx' | 'detailScale'>>;

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
    shapeOffsetX: number; // Horizontal shape offset — text does NOT follow
    snapEnabled: boolean; // Snap-to-center guide lines on/off
    showInnerRing: boolean; // White ring inside the map circle
    innerRingWidth: number; // Stroke width of the inner ring
    innerRingInset: number; // Distance from circle edge inward
    showOuterRing: boolean; // Extra circle drawn outside the map circle
    outerRingWidth: number; // Stroke width of the outer ring
    outerRingGap: number;   // Gap (pt) between circle edge and outer ring centre
    showHeartDecor: boolean; // Small decorative heart below text (any shape)

    // Font Sizes
    titleFontSize: number;
    subtitleFontSize: number;
    detailsFontSize: number;
    dedicationFontSize: number;
    namesFontSize: number;

    // Text Positions
    titleOffsetX: number;
    titleOffsetY: number;
    subtitleOffsetY: number;
    detailsOffsetY: number;
    dedicationOffsetY: number;
    namesOffsetY: number;
    heartDecorOffsetY: number;
    dividerOffsetY: number;
    showDivider: boolean;
    dividerLength: number;
    dividerThickness: number;
    vertSepOffsetY: number;
    showVertSep: boolean;
    vertSepHeight: number;
    vertSepThickness: number;
    showNames: boolean; // Show couple/names text element (design002+)

    // Font and Kerning
    titleFont: string;
    subtitleFont: string;
    detailsFont: string;
    dedicationFont: string;
    namesFont: string;
    titleKerning: number;
    subtitleKerning: number;
    detailsKerning: number;
    dedicationKerning: number;
    namesKerning: number;
    titleAllCaps: boolean;
    locationAllCaps: boolean;

    // Preview Zoom
    previewZoom: number;

    // New Feature Toggles
    showConstellations: boolean;
    showMilkyWay: boolean;
    showGrid: boolean;
    designStyle: 'standard' | 'fineline' | 'minimal';
    finelineWidth: number; // NEW: Width for fineline double lines
    maskShape: 'circle' | 'heart' | 'house' | 'rect';
    isLightMode: boolean;

    // Preview Pan/Drag State
    previewPanX: number;
    previewPanY: number;

    // Visibility Toggles (Additional Options)
    showLocation: boolean;
    showDate: boolean;
    showCoords: boolean;
    detailsDateFirst: boolean;

    // Custom Text Overrides
    customText: {
        title: string;
        subtitle: string;
        date: string;
        location: string;
        coords: string;
        dedication: string;
        names: string;
    };

    // Print Size
    printSize: { label: string; width: number; height: number; ratio: string };
    lockedPrintSize: { label: string; width: number; height: number; ratio: string } | null;

    // Map image pan offset and opacity
    mapImageOffsetX: number;
    mapImageOffsetY: number;
    mapImageOpacity: number; // 0.1–1.0, controls map fade intensity
    /** True while the user is actively dragging the map image in the poster preview */
    isDraggingMapImage: boolean;
    /** True while the vector street map is fetching tiles / rasterising a new view */
    streetMapRendering: boolean;

    // Poster Type
    posterType: 'starmap' | 'streetmap' | 'coloredmap';

    // Street Map Settings
    mapCity: string;
    mapCenterLat: number;
    mapCenterLng: number;
    mapZoom: number;
    mapBearing: number; // 0–360, degrees clockwise rotation of the map
    mapBgColor: string;
    mapStreetColor: string;
    mapWaterColor: string;
    mapLandColor: string;
    mapMainRoadColor: string;
    mapSmallRoadColor: string;
    mapDetailRoadColor: string;
    mapColorPreset: string;
    mapStyleUrl: string | null; // null = custom 2-color style; URL = use prebuilt style (e.g. realistic)
    /** Multiplier for street/place label text size on the colored map (1 = style default). */
    mapLabelScale: number;

    // Setters
    // Template System
    selectedTemplate: string;
    mapBackgroundImage: string | null;
    backgroundImageUrl: string | null; // custom poster background image (URL or data URI)
    backgroundImageOffsetY: number; // vertical pan of the poster background image (-100..100)
    borderStyle: 'simple' | 'double-offset' | 'dashed';
    templateSettings: Record<string, Partial<StoreState>>; // Store settings for each template

    // High-res print capture — set by StreetMapCapture on mount, called by DownloadButton
    captureHighResFn: ((options?: MapCaptureOptions) => Promise<string>) | null;
    setCaptureHighResFn: (fn: ((options?: MapCaptureOptions) => Promise<string>) | null) => void;

    // Setters
    setSelectedTemplate: (template: string) => void;
    setMapBackgroundImage: (url: string | null) => void;
    setBackgroundImageUrl: (url: string | null) => void;
    setBackgroundImageOffsetY: (v: number) => void;
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
    setMaskShape: (shape: 'circle' | 'heart' | 'house' | 'rect') => void;
    setIsLightMode: (isLight: boolean) => void;
    setShowLocation: (show: boolean) => void;
    setShowDate: (show: boolean) => void;
    setShowCoords: (show: boolean) => void;
    setDetailsDateFirst: (v: boolean) => void;
    setPosterColor: (posterColor: string) => void;
    setTextColor: (textColor: string) => void;
    setStarColor: (starColor: string) => void;
    setMapInteriorColor: (color: string) => void;
    setPrintSize: (size: { label: string; width: number; height: number; ratio: string }) => void;
    setLockedPrintSize: (size: { label: string; width: number; height: number; ratio: string } | null) => void;
    setCustomText: (key: keyof StoreState['customText'], value: string) => void;
    setCircleSize: (size: number) => void;
    setHeartSize: (size: number) => void;
    setHouseSize: (size: number) => void;
    setShapeOutlineWidth: (width: number) => void;
    setShapeOffsetY: (offset: number) => void;
    setShapeOffsetX: (offset: number) => void;
    setSnapEnabled: (enabled: boolean) => void;
    setShowInnerRing: (show: boolean) => void;
    setInnerRingWidth: (width: number) => void;
    setInnerRingInset: (inset: number) => void;
    setShowOuterRing: (show: boolean) => void;
    setOuterRingWidth: (width: number) => void;
    setOuterRingGap: (gap: number) => void;
    setShowHeartDecor: (show: boolean) => void;
    setTitleFontSize: (size: number) => void;
    setSubtitleFontSize: (size: number) => void;
    setDetailsFontSize: (size: number) => void;
    setDedicationFontSize: (size: number) => void;
    setNamesFontSize: (size: number) => void;
    setTitleOffsetX: (offset: number) => void;
    setTitleOffsetY: (offset: number) => void;
    setSubtitleOffsetY: (offset: number) => void;
    setDetailsOffsetY: (offset: number) => void;
    setDedicationOffsetY: (offset: number) => void;
    setNamesOffsetY: (offset: number) => void;
    setHeartDecorOffsetY: (offset: number) => void;
    setDividerOffsetY: (offset: number) => void;
    setShowDivider: (show: boolean) => void;
    setDividerLength: (length: number) => void;
    setDividerThickness: (thickness: number) => void;
    setVertSepOffsetY: (offset: number) => void;
    setShowVertSep: (show: boolean) => void;
    setVertSepHeight: (height: number) => void;
    setVertSepThickness: (thickness: number) => void;
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
    setNamesFont: (font: string) => void;
    setShowNames: (show: boolean) => void;
    setTitleKerning: (kerning: number) => void;
    setSubtitleKerning: (kerning: number) => void;
    setDetailsKerning: (kerning: number) => void;
    setDedicationKerning: (kerning: number) => void;
    setNamesKerning: (kerning: number) => void;
    setTitleAllCaps: (v: boolean) => void;
    setLocationAllCaps: (v: boolean) => void;

    // Poster type setters
    setPosterType: (type: 'starmap' | 'streetmap' | 'coloredmap') => void;
    setMapCity: (city: string) => void;
    setMapCenterLat: (lat: number) => void;
    setMapCenterLng: (lng: number) => void;
    setMapZoom: (zoom: number) => void;
    setMapBearing: (bearing: number) => void;
    setMapBgColor: (color: string) => void;
    setMapStreetColor: (color: string) => void;
    setMapWaterColor: (color: string) => void;
    setMapLandColor: (color: string) => void;
    setMapMainRoadColor: (color: string) => void;
    setMapSmallRoadColor: (color: string) => void;
    setMapDetailRoadColor: (color: string) => void;
    setMapColorPreset: (preset: string) => void;
    setMapStyleUrl: (url: string | null) => void;
    setMapLabelScale: (v: number) => void;
    setMapImageOffsetX: (x: number) => void;
    setMapImageOffsetY: (y: number) => void;
    setMapImageOpacity: (opacity: number) => void;
    setIsDraggingMapImage: (v: boolean) => void;
    setStreetMapRendering: (v: boolean) => void;

    // Active typography field (set when user clicks a text element in the poster)
    activeTypoField: 'title' | 'subtitle' | 'details' | 'dedication' | 'names' | null;
    typoFieldVersion: number; // increments on every setActiveTypoField call so useEffect fires even for repeat clicks
    setActiveTypoField: (field: 'title' | 'subtitle' | 'details' | 'dedication' | 'names' | null) => void;

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

    // Active design group — tracks which design group is selected in listing mode
    activeDesignGroupId: string | null;
    setActiveDesignGroupId: (id: string | null) => void;

    // Template-link ordering flow
    selectedTemplateEtsyUrl: string | null;
    selectedTemplateEtsyVariantName: string | null;
    selectedTemplateFulfillmentSize: string | null;
    selectedTemplateListingSlug: string | null;
    savedDesignToken: string | null;
    selectedEtsyListingId: string | null;
    selectedEtsyVariant: string | null;
    setSelectedTemplateEtsyUrl: (url: string | null) => void;
    setSelectedTemplateEtsyVariantName: (name: string | null) => void;
    setSelectedTemplateFulfillmentSize: (size: string | null) => void;
    setSelectedTemplateListingSlug: (slug: string | null) => void;
    setSavedDesignToken: (token: string | null) => void;
    setSelectedEtsyListingId: (id: string | null) => void;
    setSelectedEtsyVariant: (variant: string | null) => void;

    // Undo / Redo
    _historyPast: Partial<StoreState>[];
    _historyFuture: Partial<StoreState>[];
    _isUndoRedo: boolean;
    canUndo: boolean;
    canRedo: boolean;
    undo: () => void;
    redo: () => void;
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
    shapeOffsetX: 0,
    snapEnabled: true,

    // Font Sizes - Default Values
    titleFontSize: 80,
    subtitleFontSize: 32,
    detailsFontSize: 24,
    dedicationFontSize: 24,
    namesFontSize: 48,
    namesOffsetY: 0,
    showNames: false,

    // Text Positions - Default Values
    titleOffsetX: 0,
    titleOffsetY: 0,
    subtitleOffsetY: 0,
    detailsOffsetY: 0,
    dedicationOffsetY: 0,
    heartDecorOffsetY: 0,
    showHeartDecor: false,
    showInnerRing: false,
    innerRingWidth: 2,
    innerRingInset: 10,
    showOuterRing: false,
    outerRingWidth: 1.5,
    outerRingGap: 15,
    dividerOffsetY: 0,
    showDivider: false, // Off by default for all templates except Modern White
    dividerLength: 90, // Total width in px
    dividerThickness: 0.5,
    vertSepOffsetY: 0,
    showVertSep: true,
    vertSepHeight: 16,
    vertSepThickness: 0.8,

    // Font and Kerning Defaults
    titleFont: 'Playfair Display',
    subtitleFont: 'Lato',
    detailsFont: 'Lato',
    dedicationFont: 'Playfair Display',
    namesFont: 'Playfair Display',
    titleKerning: 0.05,
    subtitleKerning: 0.2,
    detailsKerning: 0.1,
    dedicationKerning: 0.05,
    namesKerning: 0.15,
    titleAllCaps: false,
    locationAllCaps: false,

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
    detailsDateFirst: false,

    // Custom Text - Defaults empty (use auto-generated)
    customText: {
        title: '',
        subtitle: '',
        date: '',
        location: '',
        coords: '',
        dedication: 'Personal Dedication', // Default placeholder text
        names: '',
    },

    // Print Size - Default 8x10
    printSize: { label: '8x10"', width: 8, height: 10, ratio: '4/5' },
    lockedPrintSize: null,

    // Map image pan offsets
    mapImageOffsetX: 0,
    mapImageOffsetY: 0,
    mapImageOpacity: 1,
    isDraggingMapImage: false,
    streetMapRendering: false,
    activeTypoField: null,
    typoFieldVersion: 0,
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
    mapBearing: 0,
    mapBgColor: '#1a1a2e',
    mapStreetColor: '#3d5a80',
    mapWaterColor: '#8f8f8f',
    mapLandColor: '#b6b6b6',
    mapMainRoadColor: '#111111',
    mapSmallRoadColor: '#1a1a1a',
    mapDetailRoadColor: '#2a2a2a',
    mapColorPreset: 'midnight',
    mapStyleUrl: null,
    mapLabelScale: 1,

    // Setters
    // Template System - Default Values
    selectedTemplate: 'custom',
    mapBackgroundImage: null,
    backgroundImageUrl: null,
    backgroundImageOffsetY: 0,
    borderStyle: 'simple',
    templateSettings: {},
    captureHighResFn: null,

    // Setters Implementation
    setSelectedTemplate: (selectedTemplate) => set({ selectedTemplate }),
    setMapBackgroundImage: (mapBackgroundImage) => set({ mapBackgroundImage }),
    setBackgroundImageUrl: (backgroundImageUrl) => set({ backgroundImageUrl }),
    setBackgroundImageOffsetY: (backgroundImageOffsetY) => set({ backgroundImageOffsetY }),
    setBorderStyle: (borderStyle) => set({ borderStyle }),
    setCaptureHighResFn: (captureHighResFn) => set({ captureHighResFn }),
    saveTemplateSettings: (templateId) => set((state) => {
        // Create a snapshot of current visual settings
        const snapshot: Partial<StoreState> = {
            posterColor: state.posterColor,
            textColor: state.textColor,
            starColor: state.starColor,
            mapInteriorColor: state.mapInteriorColor,
            mapBgColor: state.mapBgColor,
            mapStreetColor: state.mapStreetColor,
            mapWaterColor: state.mapWaterColor,
            mapLandColor: state.mapLandColor,
            mapMainRoadColor: state.mapMainRoadColor,
            mapSmallRoadColor: state.mapSmallRoadColor,
            mapDetailRoadColor: state.mapDetailRoadColor,
            mapColorPreset: state.mapColorPreset,
            mapStyleUrl: state.mapStyleUrl,
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
            backgroundImageUrl: state.backgroundImageUrl,
            backgroundImageOffsetY: state.backgroundImageOffsetY,
            borderStyle: state.borderStyle,
            showFrame: state.showFrame,
            frameInset: state.frameInset,
            frameWidth: state.frameWidth,
            shapeOutlineWidth: state.shapeOutlineWidth,
            showInnerRing: state.showInnerRing,
            innerRingWidth: state.innerRingWidth,
            innerRingInset: state.innerRingInset,
            showOuterRing: state.showOuterRing,
            outerRingWidth: state.outerRingWidth,
            outerRingGap: state.outerRingGap,
            showHeartDecor: state.showHeartDecor,
            titleFont: state.titleFont,
            subtitleFont: state.subtitleFont,
            detailsFont: state.detailsFont,
            dedicationFont: state.dedicationFont,
            namesFont: state.namesFont,
            titleFontSize: state.titleFontSize,
            subtitleFontSize: state.subtitleFontSize,
            detailsFontSize: state.detailsFontSize,
            dedicationFontSize: state.dedicationFontSize,
            namesFontSize: state.namesFontSize,
            titleOffsetY: state.titleOffsetY,
            subtitleOffsetY: state.subtitleOffsetY,
            detailsOffsetY: state.detailsOffsetY,
            dedicationOffsetY: state.dedicationOffsetY,
            namesOffsetY: state.namesOffsetY,
            dividerOffsetY: state.dividerOffsetY,
            vertSepOffsetY: state.vertSepOffsetY,
            showVertSep: state.showVertSep,
            vertSepHeight: state.vertSepHeight,
            vertSepThickness: state.vertSepThickness,
            namesKerning: state.namesKerning,
            showNames: state.showNames,
            titleAllCaps: state.titleAllCaps,
            locationAllCaps: state.locationAllCaps,
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
            mapBgColor: state.mapBgColor,
            mapStreetColor: state.mapStreetColor,
            mapWaterColor: state.mapWaterColor,
            mapLandColor: state.mapLandColor,
            mapMainRoadColor: state.mapMainRoadColor,
            mapSmallRoadColor: state.mapSmallRoadColor,
            mapDetailRoadColor: state.mapDetailRoadColor,
            mapColorPreset: state.mapColorPreset,
            mapStyleUrl: state.mapStyleUrl,
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
            backgroundImageUrl: state.backgroundImageUrl,
            backgroundImageOffsetY: state.backgroundImageOffsetY,
            borderStyle: state.borderStyle,
            showFrame: state.showFrame,
            frameInset: state.frameInset,
            frameWidth: state.frameWidth,
            shapeOutlineWidth: state.shapeOutlineWidth,
            showInnerRing: state.showInnerRing,
            innerRingWidth: state.innerRingWidth,
            innerRingInset: state.innerRingInset,
            showOuterRing: state.showOuterRing,
            outerRingWidth: state.outerRingWidth,
            outerRingGap: state.outerRingGap,
            showHeartDecor: state.showHeartDecor,
            titleFont: state.titleFont,
            subtitleFont: state.subtitleFont,
            detailsFont: state.detailsFont,
            dedicationFont: state.dedicationFont,
            namesFont: state.namesFont,
            titleFontSize: state.titleFontSize,
            subtitleFontSize: state.subtitleFontSize,
            detailsFontSize: state.detailsFontSize,
            dedicationFontSize: state.dedicationFontSize,
            namesFontSize: state.namesFontSize,
            titleOffsetY: state.titleOffsetY,
            subtitleOffsetY: state.subtitleOffsetY,
            detailsOffsetY: state.detailsOffsetY,
            dedicationOffsetY: state.dedicationOffsetY,
            namesOffsetY: state.namesOffsetY,
            dividerOffsetY: state.dividerOffsetY,
            vertSepOffsetY: state.vertSepOffsetY,
            showDivider: state.showDivider,
            dividerLength: state.dividerLength,
            dividerThickness: state.dividerThickness,
            showVertSep: state.showVertSep,
            vertSepHeight: state.vertSepHeight,
            vertSepThickness: state.vertSepThickness,
            namesKerning: state.namesKerning,
            showNames: state.showNames,
            titleAllCaps: state.titleAllCaps,
            locationAllCaps: state.locationAllCaps,
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
    setDetailsDateFirst: (detailsDateFirst) => set({ detailsDateFirst }),
    // Keep mapBgColor and mapInteriorColor in sync with posterColor.
    // mapInteriorColor only follows when it hasn't been manually diverged from posterColor.
    setPosterColor: (posterColor) => set((state) => ({
        posterColor,
        mapBgColor: posterColor,
        mapInteriorColor: state.mapInteriorColor === state.posterColor ? posterColor : state.mapInteriorColor,
    })),
    setTextColor: (textColor) => set({ textColor }),
    setStarColor: (starColor) => set({ starColor }),
    setMapInteriorColor: (mapInteriorColor) => set({ mapInteriorColor }),
    setLockedPrintSize: (lockedPrintSize) => set((state) => ({
        lockedPrintSize,
        // Snap the active size to the lock immediately
        ...(lockedPrintSize ? { printSize: lockedPrintSize } : {}),
    })),
    setPrintSize: (printSize) => set((state) => {
        if (state.lockedPrintSize) return {}; // silently ignore — size is locked to paid order
        // All formats share the same circle size (1.0) — the SVG coordinate system handles
        // the physical size difference. 8x10 and 16x20 are the same aspect ratio and thus
        // identical SVG dimensions (1200×1500), so their designs should look identical.
        // Fonts scale purely by SVG height ratio relative to the 18x24 baseline (1600px).
        // SVG height for each print size (width is always 1200, height = 1200 / ratio)
        const svgHeights: Record<string, number> = {
            '5x7"':   1680,   // ratio 5:7
            '8x10"':  1500,   // ratio 4:5  → same SVG as 16x20
            '11x14"': 1527,   // ratio 11:14
            '12x16"': 1600,   // ratio 3:4  → same SVG as 18x24
            '16x20"': 1500,   // ratio 4:5  → same SVG as 8x10
            '18x24"': 1600,   // baseline, ratio 3:4
            '24x36"': 1800,   // ratio 2:3
            'A5':     1697,   // ratio 1:√2 (normalized to 210/297)
            'A4':     1697,   // ratio 1:√2 (normalized to 210/297)
            'A3':     1697,   // ratio 1:√2 (normalized to 210/297)
            'A2':     1697,   // ratio 1:√2 (normalized to 210/297)
            'A1':     1697,   // ratio 1:√2 (normalized to 210/297)
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
            namesFontSize:      Math.round(48 * r),
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
    setShapeOffsetX: (shapeOffsetX) => set({ shapeOffsetX }),
    setSnapEnabled: (snapEnabled) => set({ snapEnabled }),
    setTitleFontSize: (titleFontSize) => set({ titleFontSize }),
    setSubtitleFontSize: (subtitleFontSize) => set({ subtitleFontSize }),
    setDetailsFontSize: (detailsFontSize) => set({ detailsFontSize }),
    setDedicationFontSize: (dedicationFontSize) => set({ dedicationFontSize }),
    setNamesFontSize: (namesFontSize) => set({ namesFontSize }),
    setNamesOffsetY: (namesOffsetY) => set({ namesOffsetY }),
    setNamesFont: (namesFont) => set({ namesFont }),
    setShowNames: (showNames) => set({ showNames }),
    setNamesKerning: (namesKerning) => set({ namesKerning }),
    setTitleAllCaps: (titleAllCaps) => set({ titleAllCaps }),
    setLocationAllCaps: (locationAllCaps) => set({ locationAllCaps }),
    setTitleOffsetX: (titleOffsetX) => set({ titleOffsetX }),
    setTitleOffsetY: (titleOffsetY) => set({ titleOffsetY }),
    setSubtitleOffsetY: (subtitleOffsetY) => set({ subtitleOffsetY }),
    setDetailsOffsetY: (detailsOffsetY) => set({ detailsOffsetY }),
    setDedicationOffsetY: (dedicationOffsetY) => set({ dedicationOffsetY }),
    setHeartDecorOffsetY: (heartDecorOffsetY) => set({ heartDecorOffsetY }),
    setShowOuterRing: (showOuterRing) => set({ showOuterRing }),
    setOuterRingWidth: (outerRingWidth) => set({ outerRingWidth }),
    setOuterRingGap: (outerRingGap) => set({ outerRingGap }),
    setShowHeartDecor: (showHeartDecor) => set({ showHeartDecor }),
    setShowInnerRing: (showInnerRing) => set({ showInnerRing }),
    setInnerRingWidth: (innerRingWidth) => set({ innerRingWidth }),
    setInnerRingInset: (innerRingInset) => set({ innerRingInset }),
    setDividerOffsetY: (dividerOffsetY) => set({ dividerOffsetY }),
    setShowDivider: (showDivider) => set({ showDivider }),
    setDividerLength: (dividerLength) => set({ dividerLength }),
    setDividerThickness: (dividerThickness) => set({ dividerThickness }),
    setVertSepOffsetY: (vertSepOffsetY: number) => set({ vertSepOffsetY }),
    setShowVertSep: (showVertSep: boolean) => set({ showVertSep }),
    setVertSepHeight: (vertSepHeight: number) => set({ vertSepHeight }),
    setVertSepThickness: (vertSepThickness: number) => set({ vertSepThickness }),
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
    // Note: showLocationPin is intentionally NOT changed here — the user controls it independently.
    setPosterType: (posterType) => set({
        posterType,
        mapStyleUrl: posterType === 'coloredmap'
            ? 'https://tiles.openfreemap.org/styles/bright'
            : null,
    }),
    setMapCity: (mapCity) => set({ mapCity, mapBackgroundImage: null, mapImageOffsetX: 0, mapImageOffsetY: 0, locationPinOffsetX: 0, locationPinOffsetY: 0 }),
    setMapCenterLat: (mapCenterLat) => set({ mapCenterLat }),
    setMapCenterLng: (mapCenterLng) => set({ mapCenterLng }),
    setMapZoom: (mapZoom) => set({ mapZoom }),
    setMapBearing: (mapBearing) => set({ mapBearing }),
    setMapBgColor: (mapBgColor) => set({ mapBgColor }),
    setMapStreetColor: (mapStreetColor) => set({ mapStreetColor }),
    setMapWaterColor: (mapWaterColor) => set({ mapWaterColor }),
    setMapLandColor: (mapLandColor) => set({ mapLandColor }),
    setMapMainRoadColor: (mapMainRoadColor) => set({ mapMainRoadColor }),
    setMapSmallRoadColor: (mapSmallRoadColor) => set({ mapSmallRoadColor }),
    setMapDetailRoadColor: (mapDetailRoadColor) => set({ mapDetailRoadColor }),
    setMapColorPreset: (mapColorPreset) => set({ mapColorPreset }),
    setMapStyleUrl: (mapStyleUrl) => set({ mapStyleUrl }),
    setMapLabelScale: (mapLabelScale) => set({ mapLabelScale }),
    setMapImageOffsetX: (mapImageOffsetX) => set({ mapImageOffsetX }),
    setMapImageOffsetY: (mapImageOffsetY) => set({ mapImageOffsetY }),
    setMapImageOpacity: (mapImageOpacity) => set({ mapImageOpacity }),
    setIsDraggingMapImage: (isDraggingMapImage) => set({ isDraggingMapImage }),
    setStreetMapRendering: (streetMapRendering) => set({ streetMapRendering }),
    setActiveTypoField: (activeTypoField) => set((s) => ({ activeTypoField, typoFieldVersion: s.typoFieldVersion + 1 })),
    setPendingGlyphForInlineEdit: (pendingGlyphForInlineEdit) => set({ pendingGlyphForInlineEdit }),
    setShowLocationPin: (showLocationPin) => set({ showLocationPin }),
    setLocationPinSize: (locationPinSize) => set({ locationPinSize }),
    setLocationPinOffsetX: (locationPinOffsetX) => set({ locationPinOffsetX }),
    setLocationPinOffsetY: (locationPinOffsetY) => set({ locationPinOffsetY }),

    // Active design group
    activeDesignGroupId: null,
    setActiveDesignGroupId: (activeDesignGroupId) => set({ activeDesignGroupId }),

    // Template-link ordering flow
    selectedTemplateEtsyUrl: null,
    selectedTemplateEtsyVariantName: null,
    selectedTemplateFulfillmentSize: null,
    selectedTemplateListingSlug: null,
    savedDesignToken: null,
    selectedEtsyListingId: null,
    selectedEtsyVariant: null,
    setSelectedTemplateEtsyUrl: (selectedTemplateEtsyUrl) => set({ selectedTemplateEtsyUrl }),
    setSelectedTemplateEtsyVariantName: (selectedTemplateEtsyVariantName) => set({ selectedTemplateEtsyVariantName }),
    setSelectedTemplateFulfillmentSize: (selectedTemplateFulfillmentSize) => set({ selectedTemplateFulfillmentSize }),
    setSelectedTemplateListingSlug: (selectedTemplateListingSlug) => set({ selectedTemplateListingSlug }),
    setSavedDesignToken: (savedDesignToken) => set({ savedDesignToken }),
    setSelectedEtsyListingId: (selectedEtsyListingId) => set({ selectedEtsyListingId }),
    setSelectedEtsyVariant: (selectedEtsyVariant) => set({ selectedEtsyVariant }),

    // Undo / Redo
    _historyPast: [],
    _historyFuture: [],
    _isUndoRedo: false,
    canUndo: false,
    canRedo: false,
    undo: () => set((state) => {
        if (state._historyPast.length === 0) return {};
        const past = [...state._historyPast];
        const snapshot = past.pop()!;
        const currentSnap = captureDesignSnapshot(state);
        return {
            ...snapshot,
            _historyPast: past,
            _historyFuture: [currentSnap, ...state._historyFuture].slice(0, MAX_HISTORY),
            _isUndoRedo: true,
            canUndo: past.length > 0,
            canRedo: true,
        };
    }),
    redo: () => set((state) => {
        if (state._historyFuture.length === 0) return {};
        const future = [...state._historyFuture];
        const snapshot = future.shift()!;
        const currentSnap = captureDesignSnapshot(state);
        return {
            ...snapshot,
            _historyPast: [...state._historyPast, currentSnap].slice(-MAX_HISTORY),
            _historyFuture: future,
            _isUndoRedo: true,
            canUndo: true,
            canRedo: future.length > 0,
        };
    }),
}));

// ── History subscriber ────────────────────────────────────────────────────────
// Watches for design field changes and pushes snapshots to _historyPast.
// Debounced 400ms so rapid slider drags produce a single history entry.

let _pendingSnapshot: Partial<StoreState> | null = null;
let _historyTimer: ReturnType<typeof setTimeout> | null = null;

useStore.subscribe((newState, prevState) => {
    // Skip during undo/redo to avoid self-perpetuating history loops
    if (newState._isUndoRedo) {
        // Reset flag after undo/redo settles
        setTimeout(() => useStore.setState({ _isUndoRedo: false }), 0);
        return;
    }

    // Check if any design field changed
    const changed = DESIGN_FIELDS.some(
        k => newState[k as keyof StoreState] !== prevState[k as keyof StoreState]
    );
    if (!changed) return;

    // Capture "before" snapshot on FIRST change of a batch
    if (!_pendingSnapshot) {
        _pendingSnapshot = captureDesignSnapshot(prevState);
    }

    if (_historyTimer) clearTimeout(_historyTimer);
    _historyTimer = setTimeout(() => {
        if (!_pendingSnapshot) return;
        const snap = _pendingSnapshot;
        _pendingSnapshot = null;
        useStore.setState((state) => ({
            _historyPast: [...state._historyPast, snap].slice(-MAX_HISTORY),
            _historyFuture: [],
            canUndo: true,
            canRedo: false,
        }));
    }, 400);
});

// ── Auto-save to localStorage ─────────────────────────────────────────────────
// Debounced 2s — saves design snapshot for crash/refresh recovery.

export const AUTO_SAVE_KEY = 'poster_studio_autosave';

let _autoSaveTimer: ReturnType<typeof setTimeout> | null = null;

useStore.subscribe((newState, prevState) => {
    if (newState._isUndoRedo) return;
    const changed = DESIGN_FIELDS.some(k => newState[k] !== prevState[k]);
    if (!changed) return;

    if (_autoSaveTimer) clearTimeout(_autoSaveTimer);
    _autoSaveTimer = setTimeout(() => {
        try {
            const snap = captureDesignSnapshot(newState);
            // Serialize Date to ISO string for JSON storage
            const serializable = { ...snap, date: (snap.date as Date)?.toISOString?.() ?? snap.date };
            localStorage.setItem(AUTO_SAVE_KEY, JSON.stringify({ ts: Date.now(), state: serializable }));
        } catch { /* localStorage full or unavailable */ }
    }, 2000);
});
