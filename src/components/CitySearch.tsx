import React, { useState, useEffect, useRef } from 'react';
import {
    Box, Input, InputGroup, InputRightElement, Spinner,
    List, ListItem, Text, VStack,
} from '@chakra-ui/react';
import { searchCities } from '../utils/geocode';
import type { GeoResult } from '../utils/geocode';

interface CitySearchProps {
    value: string;
    onSelect: (result: GeoResult) => void;
    placeholder?: string;
}

const CitySearch: React.FC<CitySearchProps> = ({
    value,
    onSelect,
    placeholder = 'Search city…',
}) => {
    const [query, setQuery] = useState(value);
    const [results, setResults] = useState<GeoResult[]>([]);
    const [loading, setLoading] = useState(false);
    const [open, setOpen] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);
    // True while we don't want the debounced search to fire
    const skipNextSearch = useRef(false);

    // Debounced search
    useEffect(() => {
        if (skipNextSearch.current) {
            skipNextSearch.current = false;
            return;
        }
        if (query.length < 2) { setResults([]); return; }
        const t = setTimeout(async () => {
            setLoading(true);
            try {
                const r = await searchCities(query);
                setResults(r);
                setOpen(true);
            } catch { /* ignore */ } finally {
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
            }
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, []);

    const handleSelect = (r: GeoResult) => {
        const label = r.name + (r.state ? `, ${r.state}` : '') + `, ${r.country}`;
        skipNextSearch.current = true;
        setQuery(label);
        setResults([]);
        setOpen(false);
        onSelect(r);
    };

    return (
        <Box ref={containerRef} position="relative">
            <InputGroup size="sm">
                <Input
                    value={query}
                    onChange={(e) => {
                        skipNextSearch.current = false;
                        setQuery(e.target.value);
                        setOpen(false);
                    }}
                    placeholder={placeholder}
                    bg="gray.700"
                    border="1px solid"
                    borderColor="gray.600"
                    color="white"
                    _placeholder={{ color: 'gray.400' }}
                    _focus={{ borderColor: 'blue.400', boxShadow: 'none' }}
                    borderRadius="md"
                />
                {loading && (
                    <InputRightElement>
                        <Spinner size="xs" color="gray.400" />
                    </InputRightElement>
                )}
            </InputGroup>

            {open && results.length > 0 && (
                <Box
                    position="absolute"
                    top="100%"
                    left={0}
                    right={0}
                    zIndex={200}
                    bg="gray.800"
                    border="1px solid"
                    borderColor="gray.600"
                    borderRadius="md"
                    mt={1}
                    maxH="200px"
                    overflowY="auto"
                    boxShadow="lg"
                >
                    <List>
                        {results.map((r, i) => (
                            <ListItem
                                key={i}
                                px={3}
                                py={2}
                                cursor="pointer"
                                _hover={{ bg: 'gray.700' }}
                                onClick={() => handleSelect(r)}
                            >
                                <VStack align="start" spacing={0}>
                                    <Text fontSize="sm" color="white" fontWeight="500">
                                        {r.name}
                                    </Text>
                                    <Text fontSize="xs" color="gray.400">
                                        {[r.state, r.country].filter(Boolean).join(', ')}
                                    </Text>
                                </VStack>
                            </ListItem>
                        ))}
                    </List>
                </Box>
            )}

            {open && !loading && results.length === 0 && query.length >= 2 && (
                <Box
                    position="absolute"
                    top="100%"
                    left={0}
                    right={0}
                    zIndex={200}
                    bg="gray.800"
                    border="1px solid"
                    borderColor="gray.600"
                    borderRadius="md"
                    mt={1}
                    p={3}
                >
                    <Text fontSize="sm" color="gray.400">No results for "{query}"</Text>
                </Box>
            )}
        </Box>
    );
};

export default CitySearch;
