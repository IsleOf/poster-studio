import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
    Box, Heading, Text, VStack, HStack, Badge, Button, Select, Spinner, Divider, Textarea, Input, useToast,
} from '@chakra-ui/react';
import { getOrder, updateOrderStatus, fulfillOrder, updateOrderNotes, resendOrderEmail, updateOrderEmail } from './adminApi';

const STATUS_COLORS: Record<string, string> = {
    pending: 'yellow', pending_manual: 'orange', rendering: 'blue',
    rendered: 'cyan', sent: 'green', fulfilled: 'green', shipped: 'teal', failed: 'red', refunded: 'gray',
};

// These statuses can still be retried / fulfilled
const FULFILLABLE_STATUSES = ['pending', 'pending_manual', 'rendered', 'failed'];

// Preconstructed Etsy message the admin can copy + paste into Etsy (we can't send it via API).
// Includes the print-ready download link + the editable design link for this specific order.
function buildEtsyMessage(order: { etsy_buyer_name?: string }, links: { designUrl?: string | null; downloadUrl?: string | null }): string {
    const name = (order?.etsy_buyer_name || 'there').trim().split(' ')[0] || 'there';
    return [
        `Hi ${name},`,
        ``,
        `Thank you so much for your order — your personalised map is ready! 💛`,
        links.downloadUrl ? `\nDownload your print-ready file here:\n${links.downloadUrl}` : '',
        links.designUrl ? `\nWant to tweak it (names, date, location)? Edit & re-download here:\n${links.designUrl}` : '',
        `\nFree edits for 30 days (up to 3 updated versions). Any questions, just reply here — happy to help!`,
        `\n— The Mapped Moment`,
    ].filter(Boolean).join('\n');
}

const OrderDetailPage: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const [order, setOrder] = useState<any>(null);
    const [design, setDesign] = useState<any>(null);
    const [timeline, setTimeline] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [newStatus, setNewStatus] = useState('');
    const [updating, setUpdating] = useState(false);
    const [notes, setNotes] = useState('');
    const [savedNotes, setSavedNotes] = useState('');
    const [savingNotes, setSavingNotes] = useState(false);
    const [resending, setResending] = useState(false);
    const [resendResult, setResendResult] = useState<string | null>(null);
    const [links, setLinks] = useState<{ designUrl?: string | null; downloadUrl?: string | null }>({});
    const [emailInput, setEmailInput] = useState('');
    const [savedEmail, setSavedEmail] = useState('');
    const [savingEmail, setSavingEmail] = useState(false);
    const [etsyCopied, setEtsyCopied] = useState(false);
    const toast = useToast();

    const fetchData = async () => {
        setLoading(true);
        try {
            const data = await getOrder(parseInt(id!));
            setOrder(data.order);
            setDesign(data.design);
            setLinks({ designUrl: data.designUrl, downloadUrl: data.downloadUrl });
            const em = data.order?.etsy_buyer_email || '';
            setEmailInput(em);
            setSavedEmail(em);
            setNewStatus(data.order?.status || '');
            const n = data.order?.seller_notes || '';
            setNotes(n);
            setSavedNotes(n);

            // Fetch timeline (use auth token)
            const token = localStorage.getItem('admin_token');
            const tlRes = await fetch(`/api/admin/orders/${id}/timeline`, {
                headers: token ? { Authorization: `Bearer ${token}` } : {},
            });
            if (tlRes.ok) {
                const tlData = await tlRes.json();
                setTimeline(tlData.events || []);
            }
        } catch {
            // 401 redirects via adminFetch; other errors leave empty state
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchData(); }, [id]);

    const handleStatusUpdate = async () => {
        setUpdating(true);
        await updateOrderStatus(order.id, newStatus);
        await fetchData();
        setUpdating(false);
    };

    const handleFulfill = async () => {
        setUpdating(true);
        await fulfillOrder(order.id);
        await fetchData();
        setUpdating(false);
    };

    const handleResendEmail = async () => {
        setResending(true);
        setResendResult(null);
        try {
            await resendOrderEmail(order.id);
            setResendResult('Sent');
        } catch (err: any) {
            setResendResult(err.message || 'Failed');
        } finally {
            setResending(false);
        }
    };

    const handleSaveNotes = async () => {
        setSavingNotes(true);
        await updateOrderNotes(order.id, notes);
        setSavedNotes(notes);
        setSavingNotes(false);
    };

    const handleSaveEmail = async () => {
        setSavingEmail(true);
        try {
            await updateOrderEmail(order.id, emailInput.trim());
            setSavedEmail(emailInput.trim());
            toast({ title: 'Buyer email saved', status: 'success', duration: 2000 });
            await fetchData();
        } catch (err: any) {
            toast({ title: 'Email update failed', description: err.message, status: 'error', duration: 4000 });
        } finally {
            setSavingEmail(false);
        }
    };

    const copyEtsyMessage = () => {
        navigator.clipboard.writeText(buildEtsyMessage(order, links)).then(() => {
            setEtsyCopied(true);
            setTimeout(() => setEtsyCopied(false), 2000);
        }).catch(() => toast({ title: 'Copy failed', status: 'warning', duration: 3000 }));
    };

    const formatDate = (ts: number) => {
        if (!ts) return '-';
        return new Date(ts * 1000).toLocaleDateString('en-AU', {
            day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
        });
    };

    if (loading) return <Box p={8} textAlign="center"><Spinner /></Box>;
    if (!order) return <Text>Order not found</Text>;

    return (
        <VStack align="stretch" spacing={4} maxW="800px">
            <HStack>
                <Button size="xs" variant="ghost" onClick={() => navigate('/admin/orders')}>Back</Button>
                <Heading size="md" color="gray.800">Order #{order.id}</Heading>
                <Badge colorScheme={STATUS_COLORS[order.status] || 'gray'}>{order.status}</Badge>
            </HStack>

            {/* Order info */}
            <Box bg="white" p={5} borderRadius="lg" border="1px" borderColor="gray.200">
                <VStack align="stretch" spacing={3}>
                    {[
                        ['Etsy Receipt ID', <Text fontSize="sm" fontFamily="mono">{order.etsy_receipt_id || '-'}</Text>],
                        ['Design', order.token ? (
                            <HStack spacing={2} key="design-token">
                                <Text fontSize="sm" fontFamily="mono" fontWeight="600">{order.token}</Text>
                                <Button as="a" href={`/d/${encodeURIComponent(order.token)}?admin=1`} target="_blank"
                                    rel="noopener noreferrer" size="xs" colorScheme="blue" variant="outline">
                                    Open design ↗
                                </Button>
                            </HStack>
                        ) : '-'],
                        ['Type', <Badge colorScheme={order.listing_type === 'print' ? 'purple' : 'blue'}>{order.listing_type}</Badge>],
                        ['Print Size', order.print_size || '-'],
                        ['Buyer', order.etsy_buyer_name || '-'],
                        ['Email', order.etsy_buyer_email || '-'],
                        ['Created', formatDate(order.created_at)],
                        ['Fulfilled', formatDate(order.fulfilled_at)],
                        ...(order.tracking_number ? [['Tracking', (
                            <HStack spacing={2} key="tracking">
                                <Text fontSize="sm" fontFamily="mono">{order.tracking_number}</Text>
                                {order.tracking_url && (
                                    <Text as="a" href={order.tracking_url} target="_blank" rel="noopener noreferrer"
                                        fontSize="xs" color="blue.500" textDecoration="underline">
                                        Track
                                    </Text>
                                )}
                            </HStack>
                        )]] : []),
                        ['Revisions Used', `${order.revisions_used}/3`],
                        ...(order.prodigi_submit_after && order.status === 'rendered' ? [[
                            'Prodigi Submission',
                            <Text fontSize="sm" color="orange.600" fontWeight="500">
                                Scheduled {formatDate(order.prodigi_submit_after)}
                            </Text>
                        ]] : []),
                        ...(order.prodigi_order_id ? [['Prodigi Order ID',
                            <Text fontSize="sm" fontFamily="mono">{order.prodigi_order_id}</Text>
                        ]] : []),
                    ].map(([label, value]) => (
                        <HStack key={String(label)} justify="space-between">
                            <Text fontSize="sm" color="gray.500">{label}</Text>
                            {typeof value === 'string' ? <Text fontSize="sm">{value}</Text> : value}
                        </HStack>
                    ))}
                </VStack>
            </Box>

            {/* Actions */}
            <Box bg="white" p={5} borderRadius="lg" border="1px" borderColor="gray.200">
                <Text fontSize="sm" fontWeight="600" mb={3}>Actions</Text>
                <HStack spacing={2} flexWrap="wrap">
                    <Select size="sm" maxW="200px" value={newStatus} onChange={e => setNewStatus(e.target.value)}>
                        {['pending', 'pending_manual', 'rendering', 'rendered', 'sent', 'fulfilled', 'shipped', 'failed', 'refunded'].map(s => (
                            <option key={s} value={s}>{s}</option>
                        ))}
                    </Select>
                    <Button size="sm" onClick={handleStatusUpdate} isLoading={updating}
                        isDisabled={newStatus === order.status}>
                        Update Status
                    </Button>
                    <Divider orientation="vertical" h="30px" />
                    <Button size="sm" colorScheme="green" onClick={handleFulfill} isLoading={updating}
                        isDisabled={!FULFILLABLE_STATUSES.includes(order.status)}>
                        {['print', 'framed'].includes(order.listing_type) && order.status === 'rendered'
                            ? 'Submit to Prodigi Now'
                            : order.status === 'failed'
                            ? 'Retry Fulfillment'
                            : 'Fulfill Now'}
                    </Button>
                    {order.etsy_buyer_email && (
                        <>
                            <Divider orientation="vertical" h="30px" />
                            <Button size="sm" variant="outline" onClick={handleResendEmail} isLoading={resending}>
                                Resend Email
                            </Button>
                            {resendResult && (
                                <Text fontSize="xs" color={resendResult === 'Sent' ? 'green.600' : 'red.500'}>
                                    {resendResult}
                                </Text>
                            )}
                        </>
                    )}
                </HStack>
                {['print', 'framed'].includes(order.listing_type) && order.status === 'rendered' && !order.prodigi_order_id && (
                    <Text fontSize="xs" color="orange.600" mt={2}>
                        ⚠ Auto-Prodigi is OFF — this order is rendered but NOT sent to Prodigi. Verify your
                        Etsy payout has cleared to your bank, then click "Submit to Prodigi Now" to produce it.
                    </Text>
                )}
                {order.status === 'failed' && (
                    <Text fontSize="xs" color="red.500" mt={2}>
                        This order failed. Click "Retry Fulfillment" to attempt again.
                    </Text>
                )}
            </Box>

            {/* Delivery — buyer email, customer/render links, copyable Etsy message */}
            <Box bg="white" p={5} borderRadius="lg" border="1px" borderColor="gray.200">
                <Text fontSize="sm" fontWeight="600" mb={3}>Delivery</Text>

                {/* Buyer email — editable (Etsy API doesn't expose it; paste from the buyer's message) */}
                <Text fontSize="xs" color="gray.500" mb={1}>Buyer email</Text>
                <HStack mb={4}>
                    <Input size="sm" type="email" placeholder="buyer@example.com (not provided by Etsy — add manually)"
                        value={emailInput} onChange={e => setEmailInput(e.target.value)} borderColor="gray.200" />
                    <Button size="sm" onClick={handleSaveEmail} isLoading={savingEmail}
                        isDisabled={emailInput.trim() === savedEmail.trim()}
                        bg="gray.900" color="white" _hover={{ bg: 'gray.700' }} flexShrink={0}>
                        Save
                    </Button>
                </HStack>

                {/* Links to verify */}
                <Text fontSize="xs" color="gray.500" mb={1}>Links</Text>
                <HStack spacing={2} mb={4} flexWrap="wrap">
                    {links.designUrl && (
                        <Button as="a" href={links.designUrl} target="_blank" rel="noopener noreferrer"
                            size="xs" variant="outline" colorScheme="blue">Customer view ↗</Button>
                    )}
                    {order.token && (
                        <Button as="a" href={`/d/${encodeURIComponent(order.token)}?admin=1`} target="_blank" rel="noopener noreferrer"
                            size="xs" variant="outline" colorScheme="purple">Edit / Export (admin) ↗</Button>
                    )}
                    {links.downloadUrl
                        ? <Button as="a" href={links.downloadUrl} target="_blank" rel="noopener noreferrer"
                            size="xs" variant="outline" colorScheme="green">Download render ↗</Button>
                        : <Text fontSize="xs" color="gray.400">No render yet</Text>}
                </HStack>

                {/* Preconstructed Etsy message — copy & paste into Etsy (links included) */}
                <HStack justify="space-between" mb={1}>
                    <Text fontSize="xs" color="gray.500">Etsy message (copy &amp; send in Etsy)</Text>
                    <Button size="xs" onClick={copyEtsyMessage} variant="ghost" colorScheme={etsyCopied ? 'green' : 'gray'}>
                        {etsyCopied ? '✓ Copied' : 'Copy'}
                    </Button>
                </HStack>
                <Textarea size="sm" rows={9} isReadOnly value={buildEtsyMessage(order, links)}
                    borderColor="gray.200" fontSize="xs" fontFamily="mono"
                    onFocus={e => e.target.select()} />
                {!links.downloadUrl && (
                    <Text fontSize="xs" color="orange.500" mt={1}>
                        Render the order first so the download link appears in the message.
                    </Text>
                )}
            </Box>

            {/* Seller notes */}
            <Box bg="white" p={5} borderRadius="lg" border="1px" borderColor="gray.200">
                <Text fontSize="sm" fontWeight="600" mb={3}>Seller Notes</Text>
                <Textarea
                    size="sm"
                    placeholder="Internal notes about this order (not visible to customer)..."
                    value={notes}
                    onChange={e => setNotes(e.target.value)}
                    rows={3}
                    borderColor="gray.200"
                />
                <Button
                    size="sm" mt={2} onClick={handleSaveNotes} isLoading={savingNotes}
                    isDisabled={notes === savedNotes}
                    bg="gray.900" color="white" _hover={{ bg: 'gray.700' }}>
                    Save Note
                </Button>
            </Box>

            {/* Shipping address (print orders) */}
            {order.ship_address_json && order.listing_type === 'print' && (
                <Box bg="white" p={5} borderRadius="lg" border="1px" borderColor="gray.200">
                    <Text fontSize="sm" fontWeight="600" mb={2}>Shipping Address</Text>
                    <Text fontSize="sm" color="gray.600" whiteSpace="pre-line">
                        {(() => {
                            try {
                                const a = JSON.parse(order.ship_address_json);
                                return [a.name, a.first_line, a.second_line, `${a.city}, ${a.state} ${a.zip}`, a.country_iso].filter(Boolean).join('\n');
                            } catch { return order.ship_address_json; }
                        })()}
                    </Text>
                </Box>
            )}

            {/* Design info — the prefilled/personalised fields, to verify a recovered order */}
            {design && (
                <Box bg="white" p={5} borderRadius="lg" border="1px" borderColor="gray.200">
                    <HStack justify="space-between" mb={2}>
                        <Text fontSize="sm" fontWeight="600">Design Info</Text>
                        {order.token && (
                            <Button as="a" href={`/d/${encodeURIComponent(order.token)}?admin=1`} target="_blank"
                                rel="noopener noreferrer" size="xs" colorScheme="blue" variant="outline">
                                Open design ↗
                            </Button>
                        )}
                    </HStack>
                    {(() => {
                        const ct = design.customText || {};
                        const coords = ct.coords
                            || ((design.mapCenterLat != null && design.mapCenterLng != null)
                                ? `${Number(design.mapCenterLat).toFixed(4)}, ${Number(design.mapCenterLng).toFixed(4)}`
                                : '');
                        const empty = !ct.title && !ct.names && !ct.location && !ct.date && !coords;
                        const rows: [string, string][] = [
                            ['Names', ct.names || '-'],
                            ['Title', ct.title || design.title || '-'],
                            ['Subtitle', ct.subtitle || '-'],
                            ['Location', ct.location || design.location || design.mapCity || '-'],
                            ['Date', ct.date || '-'],
                            ['Coordinates', coords || '-'],
                            ['Mode', design.posterType || '-'],
                            ['Shape', design.maskShape || '-'],
                        ];
                        return (
                            <VStack align="stretch" spacing={1}>
                                {empty && (
                                    <Text fontSize="xs" color="orange.500" mb={1}>
                                        ⚠ No personalised fields saved — design is blank (recovery may not have run).
                                    </Text>
                                )}
                                {rows.map(([label, value]) => (
                                    <HStack key={label} justify="space-between">
                                        <Text fontSize="xs" color="gray.500">{label}</Text>
                                        <Text fontSize="xs" textAlign="right">{value}</Text>
                                    </HStack>
                                ))}
                            </VStack>
                        );
                    })()}
                </Box>
            )}

            {/* Order Timeline */}
            {timeline.length > 0 && (
                <Box bg="white" p={5} borderRadius="lg" border="1px" borderColor="gray.200">
                    <Text fontSize="sm" fontWeight="600" mb={4}>Timeline</Text>
                    <VStack align="stretch" spacing={0}>
                        {timeline.map((event, idx) => {
                            const dt = new Date((event.created_at || 0) * 1000);
                            const timeStr = dt.toLocaleDateString('en-AU', { hour: '2-digit', minute: '2-digit' });
                            const iLast = idx === timeline.length - 1;
                            return (
                                <Box key={event.id || idx} position="relative" pb={iLast ? 0 : 4}>
                                    {/* Vertical line (until last) */}
                                    {!iLast && (
                                        <Box position="absolute" left="6px" top="20px" w="1px" h="calc(100% + 16px)" bg="gray.300" />
                                    )}
                                    {/* Dot + Content */}
                                    <HStack align="flex-start" spacing={3}>
                                        <Box position="relative" zIndex={1} w="12px" h="12px" borderRadius="full" bg="gray.900" flexShrink={0} mt="2px" />
                                        <VStack align="stretch" spacing={0}>
                                            <HStack justify="space-between">
                                                <Text fontSize="sm" fontWeight="600" color="gray.900">{event.label}</Text>
                                                <Text fontSize="xs" color="gray.500">{timeStr}</Text>
                                            </HStack>
                                            {event.detail && <Text fontSize="xs" color="gray.600">{event.detail}</Text>}
                                            {event.actor && event.actor !== 'system' && (
                                                <Text fontSize="xs" color="gray.400">by {event.actor}</Text>
                                            )}
                                        </VStack>
                                    </HStack>
                                </Box>
                            );
                        })}
                    </VStack>
                </Box>
            )}
        </VStack>
    );
};

export default OrderDetailPage;
