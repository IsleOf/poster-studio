import React, { useState, useEffect } from 'react';
import { useStore } from '../store/useStore';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { format } from 'date-fns';
import DownloadButton from './DownloadButton';

const SidebarControls: React.FC = () => {
    const {
        title, setTitle,
        subtitle, setSubtitle,
        date, // setDate, // Unused
        location, setLocation,
        setLat, setLng,
        // time, setTime, // Unused
        starScale, setStarScale,
        lineWeight, setLineWeight,
        gridWidth, setGridWidth,
        glowIntensity, setGlowIntensity,
        gridOpacity, setGridOpacity,
        showBorder, setShowBorder,
        showConstellations, setShowConstellations,
        showMilkyWay, setShowMilkyWay,
        showGrid, setShowGrid,
        designStyle, setDesignStyle,
        maskShape, setMaskShape,
        isLightMode, setIsLightMode,
        showLocation, setShowLocation,
        showDate, setShowDate,
        showCoords, setShowCoords,
        printSize, setPrintSize,
        customText, setCustomText,
        circleSize, setCircleSize,
        heartSize, setHeartSize,
        shapeOffsetY, setShapeOffsetY,
        titleFontSize, setTitleFontSize,
        subtitleFontSize, setSubtitleFontSize,
        detailsFontSize, setDetailsFontSize,
        dedicationFontSize, setDedicationFontSize,
        titleOffsetY, setTitleOffsetY,
        subtitleOffsetY, setSubtitleOffsetY,
        detailsOffsetY, setDetailsOffsetY,
        dedicationOffsetY, setDedicationOffsetY,
        previewZoom, setPreviewZoom
    } = useStore();

    // Accordion state
    const [openSection, setOpenSection] = useState<string | null>('moment');
    const [locationQuery, setLocationQuery] = useState('');
    const [searchResults, setSearchResults] = useState<any[]>([]);
    // const [isSearching, setIsSearching] = useState(false); // Unused

    const toggleSection = (section: string) => {
        setOpenSection(openSection === section ? null : section);
    };

    /*
    const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const newDate = new Date(e.target.value);
        if (!isNaN(newDate.getTime())) {
            setDate(newDate);
        }
    };
    */

    // Location Search (Nominatim)
    useEffect(() => {
        const delayDebounceFn = setTimeout(async () => {
            if (locationQuery.length > 2) {
                // setIsSearching(true);
                try {
                    const response = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(locationQuery)}`);
                    const data = await response.json();
                    setSearchResults(data);
                } catch (error) {
                    console.error("Location search failed", error);
                } finally {
                    // setIsSearching(false);
                }
            } else {
                setSearchResults([]);
            }
        }, 500);

        return () => clearTimeout(delayDebounceFn);
    }, [locationQuery]);

    const selectLocation = (result: any) => {
        setLocation(result.display_name.split(',')[0]); // Use first part of name
        setLat(parseFloat(result.lat));
        setLng(parseFloat(result.lon));
        setSearchResults([]);
        setLocationQuery('');
    };

    return (
        <div className="w-full h-full bg-gray-900 flex flex-col text-gray-200">
            <div className="p-6 border-b border-gray-800">
                <h2 className="text-2xl font-bold text-white">Customize</h2>
                <p className="text-sm text-gray-400">Personalize your star map</p>
            </div>

            <div className="flex-1 overflow-y-auto">
                {/* Moment Section */}
                <div className="border-b border-gray-800">
                    <button
                        className="w-full px-6 py-4 flex items-center justify-between bg-gray-900 hover:bg-gray-800 transition-colors"
                        onClick={() => toggleSection('moment')}
                    >
                        <span className="font-semibold text-gray-200">Moment</span>
                        {openSection === 'moment' ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
                    </button>

                    {openSection === 'moment' && (
                        <div className="p-6 space-y-4 bg-gray-900">
                            {/* Location Search */}
                            <div className="relative">
                                <label className="block text-sm font-medium text-gray-400 mb-1">Location</label>
                                <div className="relative">
                                    <input
                                        type="text"
                                        value={locationQuery}
                                        onChange={(e) => setLocationQuery(e.target.value)}
                                        className="w-full bg-gray-800 border border-gray-700 rounded-md px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                                        placeholder="Search city (e.g. New York)"
                                    />
                                </div>
                                {searchResults.length > 0 && (
                                    <div className="absolute z-50 w-full mt-1 bg-gray-800 border border-gray-700 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                                        {searchResults.map((result, index) => (
                                            <button
                                                key={index}
                                                className="w-full text-left px-4 py-2 hover:bg-gray-700 text-sm text-gray-200"
                                                onClick={() => selectLocation(result)}
                                            >
                                                {result.display_name}
                                            </button>
                                        ))}
                                    </div>
                                )}
                                <p className="text-xs text-gray-500 italic mb-2">Leave blank to use auto-generated values.</p>

                                <div>
                                    <label className="block text-sm font-medium text-gray-400 mb-1">Title</label>
                                    <input
                                        type="text"
                                        value={customText.title || title}
                                        onChange={(e) => {
                                            setTitle(e.target.value);
                                            setCustomText('title', e.target.value);
                                        }}
                                        className="w-full bg-gray-800 border border-gray-700 rounded-md px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                                        placeholder="My Star Map"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-400 mb-1">Subtitle</label>
                                    <input
                                        type="text"
                                        value={customText.subtitle || subtitle}
                                        onChange={(e) => {
                                            setSubtitle(e.target.value);
                                            setCustomText('subtitle', e.target.value);
                                        }}
                                        className="w-full bg-gray-800 border border-gray-700 rounded-md px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                                        placeholder="The Night Sky"
                                    />
                                </div>

                                {/* Visibility Toggles for Details */}
                                <div className="flex gap-2 mb-2">
                                    <button
                                        onClick={() => setShowDate(!showDate)}
                                        className={`px-3 py-1.5 text-xs font-medium rounded-full transition-all duration-200 ${showDate ? 'bg-blue-600 text-white' : 'bg-gray-800 text-gray-400 hover:bg-gray-700'}`}
                                    >
                                        Date
                                    </button>
                                    <button
                                        onClick={() => setShowLocation(!showLocation)}
                                        className={`px-3 py-1.5 text-xs font-medium rounded-full transition-all duration-200 ${showLocation ? 'bg-blue-600 text-white' : 'bg-gray-800 text-gray-400 hover:bg-gray-700'}`}
                                    >
                                        Location
                                    </button>
                                    <button
                                        onClick={() => setShowCoords(!showCoords)}
                                        className={`px-3 py-1.5 text-xs font-medium rounded-full transition-all duration-200 ${showCoords ? 'bg-blue-600 text-white' : 'bg-gray-800 text-gray-400 hover:bg-gray-700'}`}
                                    >
                                        Coords
                                    </button>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-400 mb-1">Custom Date Text</label>
                                    <input
                                        type="text"
                                        value={customText.date}
                                        onChange={(e) => setCustomText('date', e.target.value)}
                                        className="w-full bg-gray-800 border border-gray-700 rounded-md px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                                        placeholder={format(date, 'MMMM do, yyyy').toUpperCase()}
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-400 mb-1">Custom Location Text</label>
                                    <input
                                        type="text"
                                        value={customText.location}
                                        onChange={(e) => setCustomText('location', e.target.value)}
                                        className="w-full bg-gray-800 border border-gray-700 rounded-md px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                                        placeholder={location ? location.toUpperCase() : 'Location'}
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-400 mb-1">Custom Coordinates</label>
                                    <input
                                        type="text"
                                        value={customText.coords}
                                        onChange={(e) => setCustomText('coords', e.target.value)}
                                        className="w-full bg-gray-800 border border-gray-700 rounded-md px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                                        placeholder="• 0.0000° N, 0.0000° E"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-400 mb-1">Personal Dedication</label>
                                    <textarea
                                        value={customText.dedication}
                                        onChange={(e) => setCustomText('dedication', e.target.value)}
                                        className="w-full bg-gray-800 border border-gray-700 rounded-md px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500 h-24 resize-none"
                                        placeholder="Add a special message at the bottom..."
                                    />
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* Size Section */}
                <div className="border-b border-gray-800">
                    <button
                        className="w-full px-6 py-4 flex items-center justify-between bg-gray-900 hover:bg-gray-800 transition-colors"
                        onClick={() => toggleSection('size')}
                    >
                        <span className="font-semibold text-gray-200">Size</span>
                        {openSection === 'size' ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
                    </button>

                    {openSection === 'size' && (
                        <div className="p-6 grid grid-cols-2 gap-3 bg-gray-900">
                            {[
                                { label: '8x10"', width: 8, height: 10, ratio: '4/5' },
                                { label: '11x14"', width: 11, height: 14, ratio: '11/14' },
                                { label: '16x20"', width: 16, height: 20, ratio: '4/5' },
                                { label: '18x24"', width: 18, height: 24, ratio: '3/4' },
                                { label: '24x36"', width: 24, height: 36, ratio: '2/3' },
                            ].map((size) => (
                                <button
                                    key={size.label}
                                    onClick={() => setPrintSize(size)}
                                    className={`px-4 py-3 rounded-lg text-sm font-medium transition-all duration-200 ${printSize.label === size.label
                                        ? 'bg-blue-600 text-white shadow-md'
                                        : 'bg-gray-800 border border-gray-700 text-gray-400 hover:border-gray-600 hover:bg-gray-700'
                                        }`}
                                >
                                    {size.label}
                                </button>
                            ))}
                        </div>
                    )}
                </div>

                {/* Color Section */}
                <div className="border-b border-gray-800">
                    <button
                        className="w-full px-6 py-4 flex items-center justify-between bg-gray-900 hover:bg-gray-800 transition-colors"
                        onClick={() => toggleSection('color')}
                    >
                        <span className="font-semibold text-gray-200">Color</span>
                        {openSection === 'color' ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
                    </button>

                    {openSection === 'color' && (
                        <div className="p-6 space-y-6 bg-gray-900">
                            <div className="grid grid-cols-5 gap-3">
                                {[
                                    { name: 'White', bg: '#ffffff', text: '#000000' },
                                    { name: 'Black', bg: '#000000', text: '#ffffff' },
                                    { name: 'Navy', bg: '#1B2735', text: '#ffffff' },
                                    { name: 'Charcoal', bg: '#2C3E50', text: '#ffffff' },
                                    { name: 'Midnight', bg: '#0f172a', text: '#ffffff' },
                                    { name: 'Forest', bg: '#1a2f23', text: '#ffffff' },
                                    { name: 'Burgundy', bg: '#3a1c20', text: '#ffffff' },
                                    { name: 'Plum', bg: '#2d1b35', text: '#ffffff' },
                                    { name: 'Teal', bg: '#134e4a', text: '#ffffff' },
                                    { name: 'Slate', bg: '#475569', text: '#ffffff' },
                                ].map((theme) => (
                                    <button
                                        key={theme.name}
                                        onClick={() => {
                                            useStore.getState().setPosterColor(theme.bg);
                                            useStore.getState().setTextColor(theme.text);
                                        }}
                                        className={`w-10 h-10 rounded-full border-2 transition-transform hover:scale-110 ${useStore.getState().posterColor === theme.bg ? 'border-white ring-2 ring-blue-500' : 'border-gray-600'
                                            }`}
                                        style={{ backgroundColor: theme.bg }}
                                        title={theme.name}
                                    />
                                ))}
                            </div>

                            {/* Custom Color Pickers */}
                            <div className="space-y-3 pt-4 border-t border-gray-800">
                                <p className="text-sm font-medium text-gray-400">Custom Colors</p>
                                <div className="flex items-center justify-between">
                                    <label className="text-xs text-gray-500">Background</label>
                                    <div className="flex items-center gap-2">
                                        <span className="text-xs text-gray-500">{useStore.getState().posterColor}</span>
                                        <input
                                            type="color"
                                            value={useStore.getState().posterColor}
                                            onChange={(e) => useStore.getState().setPosterColor(e.target.value)}
                                            className="w-8 h-8 rounded-full overflow-hidden border-0 cursor-pointer"
                                        />
                                    </div>
                                </div>
                                <div className="flex items-center justify-between">
                                    <label className="text-xs text-gray-500">Text & Elements</label>
                                    <div className="flex items-center gap-2">
                                        <span className="text-xs text-gray-500">{useStore.getState().textColor}</span>
                                        <input
                                            type="color"
                                            value={useStore.getState().textColor}
                                            onChange={(e) => useStore.getState().setTextColor(e.target.value)}
                                            className="w-8 h-8 rounded-full overflow-hidden border-0 cursor-pointer"
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* Style Section */}
                <div className="border-b border-gray-800">
                    <button
                        className="w-full px-6 py-4 flex items-center justify-between bg-gray-900 hover:bg-gray-800 transition-colors"
                        onClick={() => toggleSection('style')}
                    >
                        <span className="font-semibold text-gray-200">Style</span>
                        {openSection === 'style' ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
                    </button>

                    {openSection === 'style' && (
                        <div className="p-6 space-y-6 bg-gray-900">
                            {/* Border Toggle */}
                            <div className="flex items-center justify-between">
                                <label className="text-sm font-medium text-gray-400">Show Border</label>
                                <button
                                    onClick={() => setShowBorder(!showBorder)}
                                    className={`w-12 h-6 rounded-full transition-colors relative ${showBorder ? 'bg-blue-600' : 'bg-gray-700'}`}
                                >
                                    <div className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full transition-transform ${showBorder ? 'translate-x-6' : 'translate-x-0'}`} />
                                </button>
                            </div>

                            {/* Design Style Toggles */}
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-gray-400">Design Style</label>
                                <div className="flex gap-2">
                                    <button
                                        onClick={() => setDesignStyle('standard')}
                                        className={`flex-1 py-2 text-xs font-medium rounded-lg border ${designStyle === 'standard' ? 'bg-gray-800 border-blue-500 text-white' : 'border-gray-700 text-gray-500 hover:border-gray-600'}`}
                                    >
                                        Standard
                                    </button>
                                    <button
                                        onClick={() => setDesignStyle('fineline')}
                                        className={`flex-1 py-2 text-xs font-medium rounded-lg border ${designStyle === 'fineline' ? 'bg-gray-800 border-blue-500 text-white' : 'border-gray-700 text-gray-500 hover:border-gray-600'}`}
                                    >
                                        Fineline
                                    </button>
                                </div>
                            </div>

                            {/* Mask Shape (Heart/Circle) */}
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-gray-400">Mask Shape</label>
                                <div className="flex gap-2">
                                    <button
                                        onClick={() => setMaskShape('circle')}
                                        className={`flex-1 py-2 text-xs font-medium rounded-lg border ${maskShape === 'circle' ? 'bg-gray-800 border-blue-500 text-white' : 'border-gray-700 text-gray-500 hover:border-gray-600'}`}
                                    >
                                        Circle
                                    </button>
                                    <button
                                        onClick={() => setMaskShape('heart')}
                                        className={`flex-1 py-2 text-xs font-medium rounded-lg border ${maskShape === 'heart' ? 'bg-gray-800 border-blue-500 text-white' : 'border-gray-700 text-gray-500 hover:border-gray-600'}`}
                                    >
                                        Heart
                                    </button>
                                </div>
                            </div>

                            {/* Light Mode Toggle */}
                            <div className="flex items-center justify-between">
                                <label className="text-sm font-medium text-gray-400">Light Mode</label>
                                <button
                                    onClick={() => setIsLightMode(!isLightMode)}
                                    className={`w-12 h-6 rounded-full transition-colors relative ${isLightMode ? 'bg-blue-600' : 'bg-gray-700'}`}
                                >
                                    <div className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full transition-transform ${isLightMode ? 'translate-x-6' : 'translate-x-0'}`} />
                                </button>
                            </div>

                            {/* Star Size */}
                            <div>
                                <div className="flex justify-between mb-2">
                                    <label className="text-sm font-medium text-gray-400">Star Size</label>
                                    <span className="text-xs text-gray-500">{starScale.toFixed(1)}x</span>
                                </div>
                                <input
                                    type="range"
                                    min="0.5"
                                    max="3.0"
                                    step="0.1"
                                    value={starScale}
                                    onChange={(e) => setStarScale(parseFloat(e.target.value))}
                                    className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-blue-500"
                                />
                            </div>

                            {/* Line Weight */}
                            <div>
                                <div className="flex justify-between mb-2">
                                    <label className="text-sm font-medium text-gray-400">Line Weight</label>
                                    <span className="text-xs text-gray-500">{lineWeight.toFixed(1)}px</span>
                                </div>
                                <input
                                    type="range"
                                    min="0.1"
                                    max="3.0"
                                    step="0.1"
                                    value={lineWeight}
                                    onChange={(e) => setLineWeight(parseFloat(e.target.value))}
                                    className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-blue-500"
                                />
                            </div>

                            {/* Grid Width */}
                            <div>
                                <div className="flex justify-between mb-2">
                                    <label className="text-sm font-medium text-gray-400">Grid Width</label>
                                    <span className="text-xs text-gray-500">{gridWidth.toFixed(1)}px</span>
                                </div>
                                <input
                                    type="range"
                                    min="0.1"
                                    max="3.0"
                                    step="0.1"
                                    value={gridWidth}
                                    onChange={(e) => setGridWidth(parseFloat(e.target.value))}
                                    className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-blue-500"
                                />
                            </div>

                            {/* Glow Intensity */}
                            <div>
                                <div className="flex justify-between mb-2">
                                    <label className="text-sm font-medium text-gray-400">Glow Intensity</label>
                                    <span className="text-xs text-gray-500">{glowIntensity}</span>
                                </div>
                                <input
                                    type="range"
                                    min="0"
                                    max="20"
                                    step="1"
                                    value={glowIntensity}
                                    onChange={(e) => setGlowIntensity(parseFloat(e.target.value))}
                                    className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-blue-500"
                                />
                            </div>

                            {/* Grid Opacity */}
                            <div>
                                <div className="flex justify-between mb-2">
                                    <label className="text-sm font-medium text-gray-400">Grid Opacity</label>
                                    <span className="text-xs text-gray-500">{Math.round(gridOpacity * 100)}%</span>
                                </div>
                                <input
                                    type="range"
                                    min="0"
                                    max="1"
                                    step="0.05"
                                    value={gridOpacity}
                                    onChange={(e) => setGridOpacity(parseFloat(e.target.value))}
                                    className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-blue-500"
                                />
                            </div>

                            {/* Shape Size - Circle (conditional) */}
                            {maskShape === 'circle' && (
                                <div>
                                    <div className="flex justify-between mb-2">
                                        <label className="text-sm font-medium text-gray-400">Circle Size</label>
                                        <span className="text-xs text-gray-500">{circleSize.toFixed(2)}x</span>
                                    </div>
                                    <input
                                        type="range"
                                        min="0.5"
                                        max="1.5"
                                        step="0.05"
                                        value={circleSize}
                                        onChange={(e) => setCircleSize(parseFloat(e.target.value))}
                                        className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-blue-500"
                                    />
                                </div>
                            )}

                            {/* Shape Size - Heart (conditional) */}
                            {maskShape === 'heart' && (
                                <div>
                                    <div className="flex justify-between mb-2">
                                        <label className="text-sm font-medium text-gray-400">Heart Size</label>
                                        <span className="text-xs text-gray-500">{heartSize.toFixed(2)}x</span>
                                    </div>
                                    <input
                                        type="range"
                                        min="0.5"
                                        max="1.5"
                                        step="0.05"
                                        value={heartSize}
                                        onChange={(e) => setHeartSize(parseFloat(e.target.value))}
                                        className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-blue-500"
                                    />
                                </div>
                            )}

                            {/* Shape Vertical Position */}
                            <div>
                                <div className="flex justify-between mb-2">
                                    <label className="text-sm font-medium text-gray-400">Shape Position</label>
                                    <span className="text-xs text-gray-500">{shapeOffsetY > 0 ? '+' : ''}{shapeOffsetY}px</span>
                                </div>
                                <input
                                    type="range"
                                    min="-200"
                                    max="200"
                                    step="5"
                                    value={shapeOffsetY}
                                    onChange={(e) => setShapeOffsetY(parseFloat(e.target.value))}
                                    className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-blue-500"
                                />
                            </div>

                            {/* Font Sizes */}
                            <div className="pt-4 border-t border-gray-800">
                                <h3 className="text-sm font-semibold text-gray-300 mb-4">Font Sizes</h3>

                                {/* Title Font Size */}
                                <div className="mb-4">
                                    <div className="flex justify-between mb-2">
                                        <label className="text-sm font-medium text-gray-400">Title</label>
                                        <span className="text-xs text-gray-500">{titleFontSize}px</span>
                                    </div>
                                    <input
                                        type="range"
                                        min="40"
                                        max="120"
                                        step="2"
                                        value={titleFontSize}
                                        onChange={(e) => setTitleFontSize(parseFloat(e.target.value))}
                                        className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-blue-500"
                                    />
                                </div>

                                {/* Subtitle Font Size */}
                                <div className="mb-4">
                                    <div className="flex justify-between mb-2">
                                        <label className="text-sm font-medium text-gray-400">Subtitle</label>
                                        <span className="text-xs text-gray-500">{subtitleFontSize}px</span>
                                    </div>
                                    <input
                                        type="range"
                                        min="16"
                                        max="60"
                                        step="2"
                                        value={subtitleFontSize}
                                        onChange={(e) => setSubtitleFontSize(parseFloat(e.target.value))}
                                        className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-blue-500"
                                    />
                                </div>

                                {/* Details Font Size */}
                                <div className="mb-4">
                                    <div className="flex justify-between mb-2">
                                        <label className="text-sm font-medium text-gray-400">Details</label>
                                        <span className="text-xs text-gray-500">{detailsFontSize}px</span>
                                    </div>
                                    <input
                                        type="range"
                                        min="12"
                                        max="40"
                                        step="1"
                                        value={detailsFontSize}
                                        onChange={(e) => setDetailsFontSize(parseFloat(e.target.value))}
                                        className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-blue-500"
                                    />
                                </div>

                                {/* Dedication Font Size */}
                                <div>
                                    <div className="flex justify-between mb-2">
                                        <label className="text-sm font-medium text-gray-400">Dedication</label>
                                        <span className="text-xs text-gray-500">{dedicationFontSize}px</span>
                                    </div>
                                    <input
                                        type="range"
                                        min="12"
                                        max="40"
                                        step="1"
                                        value={dedicationFontSize}
                                        onChange={(e) => setDedicationFontSize(parseFloat(e.target.value))}
                                        className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-blue-500"
                                    />
                                </div>
                            </div>

                            {/* Text Positions */}
                            <div className="pt-4 border-t border-gray-800">
                                <h3 className="text-sm font-semibold text-gray-300 mb-4">Text Positions</h3>

                                {/* Title Position */}
                                <div className="mb-4">
                                    <div className="flex justify-between mb-2">
                                        <label className="text-sm font-medium text-gray-400">Title</label>
                                        <span className="text-xs text-gray-500">{titleOffsetY > 0 ? '+' : ''}{titleOffsetY}px</span>
                                    </div>
                                    <input
                                        type="range"
                                        min="-150"
                                        max="150"
                                        step="5"
                                        value={titleOffsetY}
                                        onChange={(e) => setTitleOffsetY(parseFloat(e.target.value))}
                                        className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-blue-500"
                                    />
                                </div>

                                {/* Subtitle Position */}
                                <div className="mb-4">
                                    <div className="flex justify-between mb-2">
                                        <label className="text-sm font-medium text-gray-400">Subtitle</label>
                                        <span className="text-xs text-gray-500">{subtitleOffsetY > 0 ? '+' : ''}{subtitleOffsetY}px</span>
                                    </div>
                                    <input
                                        type="range"
                                        min="-150"
                                        max="150"
                                        step="5"
                                        value={subtitleOffsetY}
                                        onChange={(e) => setSubtitleOffsetY(parseFloat(e.target.value))}
                                        className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-blue-500"
                                    />
                                </div>

                                {/* Details Position */}
                                <div className="mb-4">
                                    <div className="flex justify-between mb-2">
                                        <label className="text-sm font-medium text-gray-400">Details</label>
                                        <span className="text-xs text-gray-500">{detailsOffsetY > 0 ? '+' : ''}{detailsOffsetY}px</span>
                                    </div>
                                    <input
                                        type="range"
                                        min="-150"
                                        max="150"
                                        step="5"
                                        value={detailsOffsetY}
                                        onChange={(e) => setDetailsOffsetY(parseFloat(e.target.value))}
                                        className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-blue-500"
                                    />
                                </div>

                                {/* Dedication Position */}
                                <div>
                                    <div className="flex justify-between mb-2">
                                        <label className="text-sm font-medium text-gray-400">Dedication</label>
                                        <span className="text-xs text-gray-500">{dedicationOffsetY > 0 ? '+' : ''}{dedicationOffsetY}px</span>
                                    </div>
                                    <input
                                        type="range"
                                        min="-150"
                                        max="150"
                                        step="5"
                                        value={dedicationOffsetY}
                                        onChange={(e) => setDedicationOffsetY(parseFloat(e.target.value))}
                                        className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-blue-500"
                                    />
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* Options Section */}
                <div className="border-b border-gray-800">
                    <button
                        className="w-full px-6 py-4 flex items-center justify-between bg-gray-900 hover:bg-gray-800 transition-colors"
                        onClick={() => toggleSection('options')}
                    >
                        <span className="font-semibold text-gray-200">Options</span>
                        {openSection === 'options' ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
                    </button>

                    {openSection === 'options' && (
                        <div className="p-6 space-y-4 bg-gray-900">
                            {/* Zoom Slider */}
                            <div className="mb-6">
                                <div className="flex justify-between mb-2">
                                    <label className="text-sm font-medium text-gray-400">Preview Zoom</label>
                                    <span className="text-xs text-gray-500">{Math.round(previewZoom * 100)}%</span>
                                </div>
                                <input
                                    type="range"
                                    min="0.5"
                                    max="5.0"
                                    step="0.1"
                                    value={previewZoom}
                                    onChange={(e) => setPreviewZoom(parseFloat(e.target.value))}
                                    className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-blue-500"
                                />
                            </div>

                            <div className="flex items-center justify-between">
                                <label className="text-sm font-medium text-gray-400">Constellations</label>
                                <button
                                    onClick={() => setShowConstellations(!showConstellations)}
                                    className={`w-12 h-6 rounded-full transition-colors relative ${showConstellations ? 'bg-blue-600' : 'bg-gray-700'}`}
                                >
                                    <div className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full transition-transform ${showConstellations ? 'translate-x-6' : 'translate-x-0'}`} />
                                </button>
                            </div>

                            <div className="flex items-center justify-between">
                                <label className="text-sm font-medium text-gray-400">Milky Way</label>
                                <button
                                    onClick={() => setShowMilkyWay(!showMilkyWay)}
                                    className={`w-12 h-6 rounded-full transition-colors relative ${showMilkyWay ? 'bg-blue-600' : 'bg-gray-700'}`}
                                >
                                    <div className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full transition-transform ${showMilkyWay ? 'translate-x-6' : 'translate-x-0'}`} />
                                </button>
                            </div>

                            <div className="flex items-center justify-between">
                                <label className="text-sm font-medium text-gray-400">Coordinate Grid</label>
                                <button
                                    onClick={() => setShowGrid(!showGrid)}
                                    className={`w-12 h-6 rounded-full transition-colors relative ${showGrid ? 'bg-blue-600' : 'bg-gray-700'}`}
                                >
                                    <div className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full transition-transform ${showGrid ? 'translate-x-6' : 'translate-x-0'}`} />
                                </button>
                            </div>
                        </div>
                    )}
                </div>

                {/* Export Section */}
                <div className="p-6">
                    <DownloadButton />
                    <p className="text-xs text-center text-gray-500 mt-3">
                        Exporting at 300 DPI for {printSize.label} print
                    </p>
                </div>
            </div>
        </div>
    );
};

export default SidebarControls;
