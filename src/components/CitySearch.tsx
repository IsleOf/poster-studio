import React, { useState, useEffect, useRef, useCallback, useId } from 'react';
import {
    Box, Input, InputGroup, InputRightElement, Spinner,
    List, ListItem, Text, VStack, IconButton, HStack, Divider,
} from '@chakra-ui/react';
import { searchCities, reverseGeocode } from '../utils/geocode';
import type { GeoResult } from '../utils/geocode';

const RECENT_KEY = 'city_search_recent';
const MAX_RECENT = 5;

function loadRecent(): GeoResult[] {
    try { return JSON.parse(localStorage.getItem(RECENT_KEY) || '[]'); } catch { return []; }
}

function saveRecent(r: GeoResult) {
    const label = r.name + (r.state ? `, ${r.state}` : '') + `, ${r.country}`;
    const prev = loadRecent().filter(
        p => (p.name + (p.state ? `, ${p.state}` : '') + `, ${p.country}`) !== label
    );
    localStorage.setItem(RECENT_KEY, JSON.stringify([r, ...prev].slice(0, MAX_RECENT)));
}

interface CitySearchProps {
    value: string;
    onSelect: (result: GeoResult) => void;
    onError?: (msg: string) => void;
    placeholder?: string;
}

const CitySearch: React.FC<CitySearchProps> = ({
    value,
    onSelect,
    onError,
    placeholder = 'Search location…',
}) => {
    const [query, setQuery] = useState(value);
    const [results, setResults] = useState<GeoResult[]>([]);
    const [loading, setLoading] = useState(false);
    const [locating, setLocating] = useState(false);
    const [open, setOpen] = useState(false);
    const [activeIdx, setActiveIdx] = useState(-1);
    const [searchError, setSearchError] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);
    const skipNextSearch = useRef(false);
    const listboxId = useId();

    // Recentx shown when query is empty and input focused
    const [showRecent, setShowRecent] = useState(false);
    const recent = loadRecent();

    const visibleItems: GeoResult[] = open
        ? results
        : showRecent && recent.length > 0
            ? recent
            : [];

    const isShowingRecent = !open && showRecent && recent.length > 0;

    // Debounced search
    useEffect(() => {
        if (skipNextSearch.current) {
            skipNextSearch.current = false;
            return;
        }
        setSearchError(false);
        if (query.length < 2) {
            setResults([]);
            setOpen(false);
            setActiveIdx(-1);
            return;
        }
        const t = setTimeout(async () => {
            setLoading(true);
            try {
                const r = await searchCities(query);
                setResults(r);
                setOpen(true);
                setActiveIdx(-1);
                if (r.length === 0) setOpen(true); // show "no results"
            } catch {
                setSearchError(true);
                setOpen(false);
                onError?.('Location search failed. Please check your connection.');
            } finally {
                setLoading(false);
            }
        }, 350);
        return () => clearTimeout(t);
    }, [query]);

    // Close on outside click
    useEffect(() => {
        const handler = (e: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
                setOpen(false);
                setShowRecent(false);
            }
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, []);

    const handleSelect = useCallback((r: GeoResult) => {
        const label = r.name + (r.state ? `, ${r.state}` : '') + `, ${r.country}`;
        skipNextSearch.current = true;
        setQuery(label);
        setResults([]);
        setOpen(false);
        setShowRecent(false);
        setActiveIdx(-1);
        saveRecent(r);
        onSelect(r);
    }, [onSelect]);

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        const items = visibleItems;
        if (!items.length && e.key !== 'Escape') return;

        if (e.key === 'ArrowDown') {
            e.preventDefault();
            setActiveIdx(i => Math.min(i + 1, items.length - 1));
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            setActiveIdx(i => Math.max(i - 1, 0));
        } else if (e.key === 'Enter') {
            e.preventDefault();
            if (activeIdx >= 0 && items[activeIdx]) {
                handleSelect(items[activeIdx]);
            }
        } else if (e.key === 'Escape') {
            setOpen(false);
            setShowRecent(false);
            setActiveIdx(-1);
            inputRef.current?.blur();
        }
    };

    const handleUseLocation = () => {
        if (!navigator.geolocation) {
            onError?.('Geolocation is not supported by your browser.');
            return;
        }
        setLocating(true);
        navigator.geolocation.getCurrentPosition(
            async (pos) => {
                try {
                    const r = await reverseGeocode(pos.coords.latitude, pos.coords.longitude);
                    if (r) {
                        handleSelect(r);
                    } else {
                        onError?.('Could not determine your city. Please search manually.');
                    }
                } catch {
                    onError?.('Location lookup failed.');
                } finally {
                    setLocating(false);
                }
            },
            () => {
                onError?.('Location access denied. Please search manually.');
                setLocating(false);
            },
            { timeout: 8000 }
        );
    };

    const dropdownOpen = (open && (results.length > 0 || (!loading && query.length >= 2))) || isShowingRecent;
    const activeItemId = activeIdx >= 0 ? `${listboxId}-item-${activeIdx}` : undefined;

    return (
        <Box ref={containerRef} position="relative">
            <HStack spacing={1}>
                <InputGroup size="sm" flex="1">
                    <Input
                        ref={inputRef}
                        value={query}
                        onChange={(e) => {
                            skipNextSearch.current = false;
                            setQuery(e.target.value);
                            setOpen(false);
                            setShowRecent(false);
                        }}
                        onFocus={() => {
                            if (query.length < 2 && recent.length > 0) setShowRecent(true);
                        }}
                        onKeyDown={handleKeyDown}
                        placeholder={placeholder}
                        bg="white"
                        border="1px solid"
                        borderColor={searchError ? 'red.400' : 'gray.200'}
                        color="gray.800"
                        _placeholder={{ color: 'gray.400' }}
                        _focus={{ borderColor: 'blue.400', boxShadow: 'none' }}
                        borderRadius="md"
                        // ARIA combobox
                        role="combobox"
                        aria-expanded={dropdownOpen}
                        aria-autocomplete="list"
                        aria-controls={listboxId}
                        aria-activedescendant={activeItemId}
                        autoComplete="off"
                    />
                    {(loading || locating) && (
                        <InputRightElement>
                            <Spinner size="xs" color="gray.400" />
                        </InputRightElement>
                    )}
                </InputGroup>
                {/* Use my location */}
                <IconButton
                    aria-label="Use my location"
                    size="sm"
                    variant="ghost"
                    color="gray.500"
                    _hover={{ color: 'blue.500', bg: 'gray.100' }}
                    isLoading={locating}
                    onClick={handleUseLocation}
                    title="Use my current location"
                    icon={
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <circle cx="12" cy="12" r="3"/>
                            <path d="M12 2v3M12 19v3M2 12h3M19 12h3"/>
                            <path d="M12 2a10 10 0 1 0 0 20A10 10 0 0 0 12 2"/>
                        </svg>
                    }
                />
            </HStack>

            {dropdownOpen && (
                <Box
                    id={listboxId}
                    role="listbox"
                    aria-label="City suggestions"
                    position="absolute"
                    top="100%"
                    left={0}
                    right={0}
                    zIndex={200}
                    bg="white"
                    border="1px solid"
                    borderColor="gray.200"
                    borderRadius="md"
                    mt={1}
                    maxH="220px"
                    overflowY="auto"
                    boxShadow="lg"
                >
                    {isShowingRecent && (
                        <>
                            <Text fontSize="10px" fontWeight="600" color="gray.500" px={3} pt={2} pb={1} textTransform="uppercase" letterSpacing="0.08em">
                                Recent
                            </Text>
                            <Divider borderColor="gray.200" />
                        </>
                    )}

                    {visibleItems.length > 0 ? (
                        <List>
                            {visibleItems.map((r, i) => (
                                <ListItem
                                    key={`${r.lat},${r.lng}`}
                                    id={`${listboxId}-item-${i}`}
                                    role="option"
                                    aria-selected={i === activeIdx}
                                    px={3}
                                    py={2}
                                    cursor="pointer"
                                    bg={i === activeIdx ? 'blue.50' : 'transparent'}
                                    _hover={{ bg: 'gray.50' }}
                                    onMouseEnter={() => setActiveIdx(i)}
                                    onMouseDown={(e) => { e.preventDefault(); handleSelect(r); }}
                                >
                                    <VStack align="start" spacing={0}>
                                        <Text fontSize="sm" color="gray.800" fontWeight="500">{r.name}</Text>
                                        <Text fontSize="xs" color="gray.500">
                                            {[r.state, r.country].filter(Boolean).join(', ')}
                                        </Text>
                                    </VStack>
                                </ListItem>
                            ))}
                        </List>
                    ) : (
                        !loading && query.length >= 2 && (
                            <Text fontSize="sm" color="gray.500" px={3} py={3}>
                                No results for "{query}"
                            </Text>
                        )
                    )}
                </Box>
            )}
        </Box>
    );
};

export default CitySearch;
