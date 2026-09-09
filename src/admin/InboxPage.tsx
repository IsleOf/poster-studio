import React, { useEffect, useState } from 'react';
import {
    Box, Heading, Text, VStack, HStack, Table, Thead, Tbody, Tr, Th, Td,
    Badge, Button, Spinner, Tabs, TabList, TabPanels, Tab, TabPanel,
} from '@chakra-ui/react';
import { adminFetchJson } from './adminApi';

const API_URL = import.meta.env.VITE_API_URL || '';

const CATEGORY_COLORS: Record<string, string> = {
    dispute: 'red',
    refund: 'orange',
    revision: 'yellow',
    general: 'blue',
    spam: 'gray',
};

interface EmailSummary {
    id: string;
    message_id: string | null;
    from_addr: string;
    to_addr: string;
    subject: string | null;
    category: string | null;
    forwarded: boolean;
    received_at: number;
    has_attachments: boolean;
}

interface Attachment {
    filename: string;
    content_type: string;
    size: number;
    path?: string;
    saved?: boolean;
}

interface EmailDetail extends EmailSummary {
    html: string | null;
    text: string | null;
    triage_json: unknown;
    attachments: Attachment[];
}

function formatDate(ts: number): string {
    if (!ts) return '-';
    return new Date(ts * 1000).toLocaleString('en-AU', {
        day: 'numeric', month: 'short', year: 'numeric',
        hour: '2-digit', minute: '2-digit',
    });
}

function formatSize(bytes: number): string {
    if (!bytes) return '';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

// Download an attachment via an authenticated fetch, then trigger browser save
async function downloadAttachment(emailId: string, filename: string): Promise<void> {
    const token = localStorage.getItem('admin_token');
    const headers: Record<string, string> = {};
    if (token) headers['Authorization'] = `Bearer ${token}`;
    const res = await fetch(
        `${API_URL}/api/admin/inbound-emails/${encodeURIComponent(emailId)}/attachments/${encodeURIComponent(filename)}`,
        { headers }
    );
    if (!res.ok) throw new Error(`Failed to download: ${res.status}`);
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

// ── Detail panel ──────────────────────────────────────────────────────────────

const EmailDetailView: React.FC<{ emailId: string; onBack: () => void }> = ({ emailId, onBack }) => {
    const [email, setEmail] = useState<EmailDetail | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [downloading, setDownloading] = useState<string | null>(null);

    useEffect(() => {
        setLoading(true);
        setError(null);
        adminFetchJson(`/api/admin/inbound-emails/${emailId}`)
            .then(setEmail)
            .catch(e => setError(e.message))
            .finally(() => setLoading(false));
    }, [emailId]);

    if (loading) return <Box p={8} textAlign="center"><Spinner /></Box>;
    if (error) return <Box p={8}><Text color="red.500">{error}</Text></Box>;
    if (!email) return null;

    const handleDownload = async (filename: string) => {
        setDownloading(filename);
        try { await downloadAttachment(emailId, filename); } catch { /* ignore */ } finally { setDownloading(null); }
    };

    return (
        <VStack align="stretch" spacing={4}>
            <HStack>
                <Button size="sm" variant="outline" onClick={onBack}>&larr; Back to Inbox</Button>
            </HStack>

            <Box bg="white" borderRadius="lg" border="1px" borderColor="gray.200" p={5}>
                <VStack align="stretch" spacing={3}>
                    <HStack justify="space-between" wrap="wrap">
                        <Heading size="sm" color="gray.800">{email.subject || '(no subject)'}</Heading>
                        <Text fontSize="xs" color="gray.400">{formatDate(email.received_at)}</Text>
                    </HStack>
                    <HStack spacing={6} wrap="wrap">
                        <Text fontSize="sm"><Text as="span" fontWeight="600" color="gray.600">From: </Text>{email.from_addr}</Text>
                        <Text fontSize="sm"><Text as="span" fontWeight="600" color="gray.600">To: </Text>{email.to_addr}</Text>
                    </HStack>
                    <HStack spacing={2}>
                        {email.category && (
                            <Badge colorScheme={CATEGORY_COLORS[email.category] || 'gray'} fontSize="xs">
                                {email.category}
                            </Badge>
                        )}
                        {email.forwarded && <Badge colorScheme="green" fontSize="xs">forwarded</Badge>}
                    </HStack>
                </VStack>
            </Box>

            {/* Body tabs */}
            <Box bg="white" borderRadius="lg" border="1px" borderColor="gray.200" overflow="hidden">
                <Tabs size="sm" colorScheme="blue">
                    <TabList px={4} pt={2}>
                        <Tab>Plain Text</Tab>
                        {email.html && <Tab>HTML</Tab>}
                        {!!email.triage_json && <Tab>Triage</Tab>}
                    </TabList>
                    <TabPanels>
                        <TabPanel p={4}>
                            {email.text ? (
                                <Box
                                    as="pre"
                                    fontFamily="mono"
                                    fontSize="sm"
                                    whiteSpace="pre-wrap"
                                    wordBreak="break-word"
                                    color="gray.700"
                                    maxH="500px"
                                    overflowY="auto"
                                >
                                    {email.text}
                                </Box>
                            ) : (
                                <Text fontSize="sm" color="gray.400" fontStyle="italic">No plain text body</Text>
                            )}
                        </TabPanel>
                        {email.html && (
                            <TabPanel p={0}>
                                {/* sandboxed iframe — prevents XSS from untrusted email HTML */}
                                <Box as="iframe"
                                    sandbox=""
                                    srcDoc={email.html}
                                    width="100%"
                                    height="500px"
                                    border="none"
                                    display="block"
                                    title="Email HTML body"
                                />
                            </TabPanel>
                        )}
                        {!!email.triage_json && (
                            <TabPanel p={4}>
                                <Box
                                    as="pre"
                                    fontFamily="mono"
                                    fontSize="xs"
                                    whiteSpace="pre-wrap"
                                    wordBreak="break-word"
                                    color="gray.700"
                                    maxH="400px"
                                    overflowY="auto"
                                >
                                    {JSON.stringify(email.triage_json, null, 2)}
                                </Box>
                            </TabPanel>
                        )}
                    </TabPanels>
                </Tabs>
            </Box>

            {/* Attachments */}
            {email.attachments && email.attachments.length > 0 && (
                <Box bg="white" borderRadius="lg" border="1px" borderColor="gray.200" p={4}>
                    <Text fontWeight="600" fontSize="sm" color="gray.700" mb={3}>
                        Attachments ({email.attachments.length})
                    </Text>
                    <VStack align="stretch" spacing={2}>
                        {email.attachments.map((att, i) => (
                            <HStack key={i} justify="space-between" p={2} bg="gray.50" borderRadius="md">
                                <VStack align="start" spacing={0}>
                                    <Text fontSize="sm" fontWeight="500">{att.filename}</Text>
                                    <Text fontSize="xs" color="gray.500">
                                        {att.content_type}{att.size ? ` · ${formatSize(att.size)}` : ''}
                                    </Text>
                                </VStack>
                                <Button
                                    size="xs"
                                    variant="outline"
                                    isLoading={downloading === att.filename}
                                    isDisabled={att.saved === false}
                                    onClick={() => handleDownload(att.filename)}
                                    title={att.saved === false ? 'File not saved on server' : 'Download'}
                                >
                                    Download
                                </Button>
                            </HStack>
                        ))}
                    </VStack>
                </Box>
            )}
        </VStack>
    );
};

// ── List view ─────────────────────────────────────────────────────────────────

const InboxPage: React.FC = () => {
    const [emails, setEmails] = useState<EmailSummary[]>([]);
    const [total, setTotal] = useState(0);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [selectedId, setSelectedId] = useState<string | null>(null);

    const fetchEmails = async () => {
        setLoading(true);
        setError(null);
        try {
            const data = await adminFetchJson('/api/admin/inbound-emails?limit=100');
            setEmails(Array.isArray(data?.emails) ? data.emails : []);
            setTotal(data?.total || 0);
        } catch (e: any) {
            setError(e.message);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchEmails(); }, []);

    if (selectedId) {
        return (
            <VStack align="stretch" spacing={4} maxW="900px">
                <EmailDetailView emailId={selectedId} onBack={() => setSelectedId(null)} />
            </VStack>
        );
    }

    return (
        <VStack align="stretch" spacing={4} maxW="1100px">
            <HStack justify="space-between">
                <Heading size="md" color="gray.800">Inbox</Heading>
                <HStack spacing={2}>
                    <Text fontSize="sm" color="gray.500">{total} email{total !== 1 ? 's' : ''}</Text>
                    <Button size="sm" variant="outline" onClick={fetchEmails} isLoading={loading}>
                        Refresh
                    </Button>
                </HStack>
            </HStack>

            {error && (
                <Box bg="red.50" border="1px" borderColor="red.200" borderRadius="md" p={3}>
                    <Text color="red.700" fontSize="sm">{error}</Text>
                </Box>
            )}

            <Box bg="white" borderRadius="lg" border="1px" borderColor="gray.200" overflow="hidden">
                {loading ? (
                    <Box p={8} textAlign="center"><Spinner /></Box>
                ) : emails.length === 0 ? (
                    <Box p={8} textAlign="center"><Text color="gray.500">No inbound emails yet</Text></Box>
                ) : (
                    <Table size="sm">
                        <Thead>
                            <Tr>
                                <Th>Received</Th>
                                <Th>From</Th>
                                <Th>Subject</Th>
                                <Th>Category</Th>
                                <Th w="40px" textAlign="center">📎</Th>
                                <Th w="40px" textAlign="center">✓</Th>
                            </Tr>
                        </Thead>
                        <Tbody>
                            {emails.map(e => (
                                <Tr
                                    key={e.id}
                                    cursor="pointer"
                                    _hover={{ bg: 'gray.50' }}
                                    onClick={() => setSelectedId(e.id)}
                                >
                                    <Td fontSize="xs" whiteSpace="nowrap">{formatDate(e.received_at)}</Td>
                                    <Td fontSize="sm" maxW="220px">
                                        <Text noOfLines={1} title={e.from_addr}>{e.from_addr}</Text>
                                    </Td>
                                    <Td fontSize="sm" maxW="300px">
                                        <Text noOfLines={1} title={e.subject || undefined}>
                                            {e.subject || <Text as="span" color="gray.400" fontStyle="italic">(no subject)</Text>}
                                        </Text>
                                    </Td>
                                    <Td>
                                        {e.category ? (
                                            <Badge
                                                colorScheme={CATEGORY_COLORS[e.category] || 'gray'}
                                                fontSize="xs"
                                                textTransform="capitalize"
                                            >
                                                {e.category}
                                            </Badge>
                                        ) : (
                                            <Text fontSize="xs" color="gray.400">—</Text>
                                        )}
                                    </Td>
                                    <Td textAlign="center">
                                        {e.has_attachments ? (
                                            <Text fontSize="sm" title="Has attachments">📎</Text>
                                        ) : null}
                                    </Td>
                                    <Td textAlign="center">
                                        {e.forwarded ? (
                                            <Text fontSize="sm" color="green.500" title="Forwarded">✓</Text>
                                        ) : null}
                                    </Td>
                                </Tr>
                            ))}
                        </Tbody>
                    </Table>
                )}
            </Box>
        </VStack>
    );
};

export default InboxPage;
