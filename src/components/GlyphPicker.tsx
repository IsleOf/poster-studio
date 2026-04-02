import React, { useState, useRef } from 'react';
import { Box, HStack, VStack, Text, Button, Grid, Input } from '@chakra-ui/react';
import { useStore } from '../store/useStore';

// ─── Glyph maps (Private Use Area codepoints in Sophia Ronald / Mapped Moment Script) ─

const LETTERS = 'abcdefghijklmnopqrstuvwxyz'.split('');

// Alt 1 — first set of swash alternates
const ALT1: Record<string, string> = {
    a:'\uF001', b:'\uF002', c:'\uF003', d:'\uF004', e:'\uF005', f:'\uF006', g:'\uF007',
    h:'\uF008', i:'\uF009', j:'\uF00A', k:'\uF00B', l:'\uF00C', m:'\uF00D', n:'\uF00E',
    o:'\uF00F', p:'\uF011', q:'\uF013', r:'\uF016', s:'\uF017', t:'\uF01D', u:'\uF019',
    v:'\uF01A', w:'\uF01B', x:'\uF01C', y:'\uF01E', z:'\uF01F',
};

// Alt 2
const ALT2: Record<string, string> = {
    a:'\uF028', b:'\uF02A', c:'\uF02C', d:'\uF02E', e:'\uF030', f:'\uF032', g:'\uF034',
    h:'\uF036', i:'\uF038', j:'\uF03A', k:'\uF03C', l:'\uF059', m:'\uF03E', n:'\uF040',
    o:'\uF042', p:'\uF044', q:'\uF046', r:'\uF05B', s:'\uF048', t:'\uF04A', u:'\uF04C',
    v:'\uF04E', w:'\uF050', x:'\uF052', y:'\uF054', z:'\uF056',
};

// Alt 3
const ALT3: Record<string, string> = {
    a:'\uF029', b:'\uF02B', c:'\uF02D', d:'\uF02F', e:'\uF031', f:'\uF033', g:'\uF035',
    h:'\uF037', i:'\uF039', j:'\uF03B', k:'\uF03D', l:'\uF05A', m:'\uF03F', n:'\uF041',
    o:'\uF043', p:'\uF045', q:'\uF047', r:'\uF05C', s:'\uF049', t:'\uF04B', u:'\uF04D',
    v:'\uF04F', w:'\uF051', x:'\uF053', y:'\uF055', z:'\uF057',
};

// Alt 4
const ALT4: Record<string, string> = {
    a:'\uF05D', b:'\uF05E', c:'\uF05F', d:'\uF060', e:'\uF061', f:'\uF062', g:'\uF063',
    h:'\uF064', i:'\uF065', j:'\uF066', k:'\uF067', l:'\uF068', m:'\uF069', n:'\uF06A',
    o:'\uF06B', p:'\uF06C', q:'\uF06D', r:'\uF06E', s:'\uF06F', t:'\uF070', u:'\uF071',
    v:'\uF072', w:'\uF073', x:'\uF074', y:'\uF075', z:'\uF076',
};

// Alt 5 — heart-tail swash alternates
const ALT5: Record<string, string> = {
    a:'\uF078', b:'\uF079', c:'\uF07A', d:'\uF07B', e:'\uF07C', f:'\uF07D', g:'\uF07E',
    h:'\uF07F', i:'\uF080', j:'\uF081', k:'\uF082', l:'\uF083', m:'\uF084', n:'\uF085',
    o:'\uF08D', p:'\uF087', q:'\uF088', r:'\uF08A', s:'\uF08B', t:'\uF08E', u:'\uF08F',
    v:'\uF090', w:'\uF091', x:'\uF092', y:'\uF093', z:'\uF094',
};

const LIGATURES = [
    { label: 'tt', char: '\uF021' },
    { label: 'th', char: '\uF023' },
    { label: 'ss', char: '\uF024' },
    { label: 'ts', char: '\uF025' },
    { label: 'rr', char: '\uF026' },
];

type TabId = 'std' | 'alt1' | 'alt2' | 'alt3' | 'alt4' | 'alt5' | 'liga';
type FieldId = 'title' | 'subtitle' | 'dedication';

interface GlyphPickerProps {
    defaultField?: FieldId;
}

const TABS: { id: TabId; label: string }[] = [
    { id: 'std',  label: 'Std' },
    { id: 'alt1', label: 'Alt 1' },
    { id: 'alt2', label: 'Alt 2' },
    { id: 'alt3', label: 'Alt 3' },
    { id: 'alt4', label: 'Alt 4' },
    { id: 'alt5', label: '❤ Alt 5' },
    { id: 'liga', label: 'Lig' },
];

const FIELD_LABELS: Record<FieldId, string> = {
    title: 'Title',
    subtitle: 'Subtitle',
    dedication: 'Dedication',
};

function getGlyphs(tab: TabId): { char: string; label: string }[] {
    const map: Record<string, Record<string, string>> = {
        alt1: ALT1, alt2: ALT2, alt3: ALT3, alt4: ALT4, alt5: ALT5,
    };
    if (tab === 'std') {
        return LETTERS.map(l => ({ char: l, label: l }));
    }
    if (tab === 'liga') {
        return LIGATURES;
    }
    const m = map[tab];
    return LETTERS.map(l => ({ char: m[l] ?? '', label: l })).filter(g => g.char);
}

const GlyphPicker: React.FC<GlyphPickerProps> = ({ defaultField = 'title' }) => {
    const [activeTab, setActiveTab] = useState<TabId>('alt1');
    const [targetField, setTargetField] = useState<FieldId>(defaultField);
    const { customText, setCustomText, isInlineEditing, activeTypoField, setPendingGlyphForInlineEdit } = useStore();
    const inputRef = useRef<HTMLInputElement>(null);
    // Tracks cursor position; updated on every selection/key/mouse event
    const cursorRef = useRef<{ start: number; end: number }>({ start: -1, end: -1 });

    const currentText = customText[targetField];

    // Auto-sync target field when user clicks a text element in the poster
    React.useEffect(() => {
        if (activeTypoField && activeTypoField !== 'details') {
            setTargetField(activeTypoField as FieldId);
        }
    }, [activeTypoField]);

    const updateCursor = () => {
        if (inputRef.current) {
            cursorRef.current = {
                start: inputRef.current.selectionStart ?? -1,
                end: inputRef.current.selectionEnd ?? -1,
            };
        }
    };

    const insertGlyph = (glyph: string) => {
        // If inline editing the same field, use the pending mechanism so VectorStarMap inserts at cursor
        if (isInlineEditing && activeTypoField === targetField) {
            setPendingGlyphForInlineEdit(glyph);
            return;
        }
        const text = customText[targetField];
        const { start, end } = cursorRef.current;
        let newText: string;
        let newPos: number;

        if (start >= 0) {
            newText = text.slice(0, start) + glyph + text.slice(end);
            newPos = start + glyph.length;
        } else {
            newText = text + glyph;
            newPos = newText.length;
        }

        setCustomText(targetField, newText);
        cursorRef.current = { start: newPos, end: newPos };

        // Restore focus and cursor position after React re-renders
        requestAnimationFrame(() => {
            if (inputRef.current) {
                inputRef.current.focus();
                inputRef.current.setSelectionRange(newPos, newPos);
                cursorRef.current = { start: newPos, end: newPos };
            }
        });
    };

    const deleteLastChar = () => {
        if (!currentText) return;
        const chars = [...currentText];
        chars.pop();
        const newText = chars.join('');
        setCustomText(targetField, newText);
        const newPos = newText.length;
        cursorRef.current = { start: newPos, end: newPos };
        requestAnimationFrame(() => {
            if (inputRef.current) {
                inputRef.current.focus();
                inputRef.current.setSelectionRange(newPos, newPos);
            }
        });
    };

    const glyphs = getGlyphs(activeTab);

    return (
        <VStack align="stretch" spacing={3}>
            {/* Field selector */}
            <HStack spacing={1}>
                <Text fontSize="xs" fontWeight="600" color="gray.600" flexShrink={0}>Into:</Text>
                {(Object.keys(FIELD_LABELS) as FieldId[]).map(f => (
                    <Button
                        key={f}
                        size="xs"
                        flex={1}
                        onClick={() => setTargetField(f)}
                        bg={targetField === f ? 'gray.900' : 'white'}
                        color={targetField === f ? 'white' : 'gray.600'}
                        border="1px solid"
                        borderColor={targetField === f ? 'gray.900' : 'gray.300'}
                        _hover={{ bg: targetField === f ? 'gray.800' : 'gray.50' }}
                        borderRadius="md"
                    >
                        {FIELD_LABELS[f]}
                    </Button>
                ))}
            </HStack>

            {/* Editable text preview + backspace */}
            <HStack
                p={4}
                bg="gray.50"
                borderRadius="md"
                border="1px solid"
                borderColor="gray.200"
                spacing={2}
                minH="130px"
                overflow="visible"
                alignItems="center"
            >
                <Input
                    ref={inputRef}
                    flex={1}
                    fontSize="3xl"
                    fontFamily="'Mapped Moment Script', cursive"
                    fontWeight="400"
                    value={currentText}
                    onChange={(e) => {
                        setCustomText(targetField, e.target.value);
                        updateCursor();
                    }}
                    onSelect={updateCursor}
                    onKeyUp={updateCursor}
                    onMouseUp={updateCursor}
                    onFocus={updateCursor}
                    placeholder="type here or click glyphs below"
                    _placeholder={{ color: 'gray.400', fontSize: 'sm', fontFamily: 'sans-serif' }}
                    border="none"
                    bg="transparent"
                    p={0}
                    h="auto"
                    minH="100px"
                    lineHeight="2.2"
                    overflow="visible"
                    _focus={{ boxShadow: 'none', outline: 'none' }}
                    color="gray.900"
                />
                <Button
                    size="xs"
                    variant="ghost"
                    color="gray.500"
                    onClick={deleteLastChar}
                    isDisabled={!currentText}
                    title="Delete last character"
                    px={1}
                    minW="auto"
                >
                    ⌫
                </Button>
            </HStack>

            {/* Tab bar */}
            <HStack spacing={1} flexWrap="wrap">
                {TABS.map(tab => (
                    <Button
                        key={tab.id}
                        size="xs"
                        onClick={() => setActiveTab(tab.id)}
                        bg={activeTab === tab.id ? 'gray.900' : 'white'}
                        color={activeTab === tab.id ? 'white' : 'gray.600'}
                        border="1px solid"
                        borderColor={activeTab === tab.id ? 'gray.900' : 'gray.300'}
                        _hover={{ bg: activeTab === tab.id ? 'gray.800' : 'gray.50' }}
                        borderRadius="md"
                        px={2}
                    >
                        {tab.label}
                    </Button>
                ))}
            </HStack>

            {/* Glyph grid — 4 columns so wide swash glyphs (Alt1/Alt4/Alt5/Lig) have room */}
            <Grid templateColumns="repeat(4, 1fr)" gap={1}>
                {glyphs.map((g, i) => (
                    <Box
                        key={i}
                        as="button"
                        onMouseDown={(e: React.MouseEvent) => e.preventDefault()}
                        onClick={() => insertGlyph(g.char)}
                        h="80px"
                        display="flex"
                        flexDirection="column"
                        alignItems="center"
                        justifyContent="center"
                        bg="white"
                        border="1px solid"
                        borderColor="gray.200"
                        borderRadius="md"
                        _hover={{ bg: 'blue.50', borderColor: 'blue.300', cursor: 'pointer' }}
                        transition="all 0.1s"
                        position="relative"
                        overflow="hidden"
                        title={`Insert ${g.label} (${activeTab})`}
                    >
                        <Text
                            fontSize="3xl"
                            fontFamily="'Mapped Moment Script', cursive"
                            fontWeight="400"
                            lineHeight={1}
                            userSelect="none"
                            pointerEvents="none"
                            w="100%"
                            textAlign="center"
                        >
                            {g.char}
                        </Text>
                        <Text
                            fontSize="8px"
                            color="gray.400"
                            position="absolute"
                            bottom="1px"
                            right="3px"
                            lineHeight={1}
                            pointerEvents="none"
                        >
                            {g.label}
                        </Text>
                    </Box>
                ))}
            </Grid>

            <Text fontSize="xs" color="gray.400">
                Type directly above or click a glyph to insert at cursor. Use ⌫ to delete.
            </Text>
        </VStack>
    );
};

export default GlyphPicker;
