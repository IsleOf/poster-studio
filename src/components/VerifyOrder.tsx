import { useState, useEffect, useRef, useCallback } from 'react'
import {
    Box, Container, Heading, Text, VStack, Input, Button,
    Link, Alert, AlertIcon, AlertDescription, Divider, HStack, Spinner,
    FormControl, FormLabel, FormHelperText,
} from '@chakra-ui/react'
import { trackEvent } from '../utils/analytics'

// ─── Types ────────────────────────────────────────────────────────────────────

type Status =
    | 'idle'
    | 'loading'
    | 'rendering'       // server Puppeteer render in progress — polling
    | 'auto_downloading' // file fetch + client-side trigger happening now
    | 'downloaded'      // file delivered to OS download folder
    | 'print_processing'
    | 'error'

interface VerifyResult {
    listingType: 'digital' | 'print'
    downloadUrl?: string
    printifyOrderId?: string
    buyerName?: string
    revisionsUsed?: number
    revisionsRemaining?: number
    revisionsExhausted?: boolean
    printSize?: string | null
}

// ─── Download helper ──────────────────────────────────────────────────────────
// Fetches the file as a binary blob via the Fetch API, then triggers the browser
// "Save file" dialog programmatically. The <a> element is created in memory and
// never inserted into the DOM.
//
// ⚠️ Do NOT "obfuscate" the saved file again. This previously wrapped the PNG as
// application/octet-stream and named it a random hex string with NO extension, on
// the theory that the file type shouldn't be guessable. That actively broke the
// product: the customer paid for this file, and a file with no extension can't be
// opened, printed, or uploaded to a photo lab without being manually renamed. The
// filename must keep its real .png extension. The server already sends the correct
// name via Content-Disposition — honour it.
function filenameFromDisposition(header: string | null): string | null {
    if (!header) return null
    // RFC 5987 filename*=UTF-8''… first, then plain filename="…"
    const star = header.match(/filename\*=UTF-8''([^;]+)/i)
    if (star) { try { return decodeURIComponent(star[1].trim()) } catch { /* fall through */ } }
    const plain = header.match(/filename\s*=\s*"?([^";]+)"?/i)
    return plain ? plain[1].trim() : null
}

async function silentDownload(url: string): Promise<void> {
    const resp = await fetch(url, { credentials: 'same-origin' })
    if (!resp.ok) throw new Error(`Download failed: ${resp.status}`)
    const buf = await resp.arrayBuffer()
    const serverType = resp.headers.get('content-type') || 'image/png'
    const blob = new Blob([buf], { type: serverType })
    const objectUrl = URL.createObjectURL(blob)

    // Prefer the server's filename; fall back to a sensible name. Either way, GUARANTEE
    // an extension so the file is usable the moment it lands in Downloads.
    let filename = filenameFromDisposition(resp.headers.get('content-disposition'))
        || `mapped-moment-${Date.now()}.png`
    if (!/\.[a-z0-9]{2,4}$/i.test(filename)) {
        const ext = serverType.includes('pdf') ? 'pdf' : serverType.includes('jpeg') ? 'jpg' : 'png'
        filename = `${filename}.${ext}`
    }

    const a = document.createElement('a')
    a.href = objectUrl
    a.download = filename
    a.dispatchEvent(new MouseEvent('click', { bubbles: false, cancelable: false }))

    // Revoke on a delay, NOT synchronously. Browsers start the blob download
    // asynchronously; revoking in a finally block can cancel the download outright
    // (observed in Firefox/Safari), which would surface as a silent failed delivery.
    setTimeout(() => URL.revokeObjectURL(objectUrl), 60_000)
}

// ─── Print & frame guidance ────────────────────────────────────────────────────
// Each print size maps to an off-the-shelf frame so the buyer can drop the print
// straight in — no mat, no trimming. RIBBA (US IKEA) makes exact-match frames for
// the inch sizes below; 18x24 + A-series fall back to a generic standard frame.
const FRAME_TIPS: Record<string, { ribbaSize?: string; alt?: string }> = {
    '5x7':   { ribbaSize: '5×7″' },
    '8x10':  { ribbaSize: '8×10″' },
    '11x14': { ribbaSize: '11×14″' },
    '12x16': { ribbaSize: '12×16″' },
    '16x20': { ribbaSize: '16×20″' },
    '24x36': { ribbaSize: '24×36″' },
    '18x24': { alt: 'a standard 18×24″ poster frame (Target, Walmart or Michaels)' },
    'A5':    { alt: 'any A5 frame' },
    'A4':    { alt: 'an A4 frame (IKEA’s 21×30 cm fits A4)' },
    'A3':    { alt: 'an A3 frame' },
    'A2':    { alt: 'an A2 frame' },
    'A1':    { alt: 'an A1 frame' },
}

// Resolve a loose printSize string ("16x20", `16x20"`, "16x20 Inch", "A4 (UK)") to a FRAME_TIPS key.
function resolveFrameKey(printSize?: string | null): string | null {
    if (!printSize) return null
    const s = printSize.toLowerCase()
    const inch = s.match(/(\d{1,2})\s*x\s*(\d{1,2})/)
    if (inch) {
        const k = `${inch[1]}x${inch[2]}`
        if (FRAME_TIPS[k]) return k
    }
    const a = s.match(/\ba([1-5])\b/)
    if (a) { const k = `A${a[1]}`; if (FRAME_TIPS[k]) return k }
    return null
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function VerifyOrder() {
    const [orderId, setOrderId] = useState('')
    const [token, setToken] = useState('')
    const [status, setStatus] = useState<Status>('idle')
    const [result, setResult] = useState<VerifyResult | null>(null)
    const [errorMsg, setErrorMsg] = useState('')
    const [editing, setEditing] = useState(false)
    const [noCodePrompt, setNoCodePrompt] = useState(false)
    const [lastChecked, setLastChecked] = useState(0)
    const pollRef = useRef<ReturnType<typeof setInterval> | null>(null)
    const tickRef = useRef<ReturnType<typeof setInterval> | null>(null)

    // Trigger the silent download as soon as we have a URL.
    // Wrapped in useCallback so the useEffect dep-array is stable.
    const triggerDownload = useCallback(async (url: string) => {
        setStatus('auto_downloading')
        try {
            await silentDownload(url)
            setStatus('downloaded')
            trackEvent('download_complete')
        } catch (err) {
            setErrorMsg(err instanceof Error ? err.message : 'Download failed. Please try again.')
            setStatus('error')
        }
    }, [])

    // Poll for server render completion when in 'rendering' state
    useEffect(() => {
        if (status !== 'rendering') return

        setLastChecked(0)
        tickRef.current = setInterval(() => setLastChecked(s => s + 1), 1000)

        pollRef.current = setInterval(async () => {
            try {
                const res = await fetch(`/api/order-status?etsyOrderId=${encodeURIComponent(orderId)}`)
                const data = await res.json()
                setLastChecked(0)
                if (data.status === 'sent' || data.status === 'fulfilled') {
                    clearInterval(pollRef.current!)
                    clearInterval(tickRef.current!)
                    setResult(prev => ({ ...(prev ?? { listingType: 'digital' }), downloadUrl: data.downloadUrl }))
                    // Trigger the silent download automatically — no button for the user to click
                    triggerDownload(data.downloadUrl)
                } else if (data.status === 'failed') {
                    clearInterval(pollRef.current!)
                    clearInterval(tickRef.current!)
                    setErrorMsg('Render failed — please contact us via Etsy messages.')
                    setStatus('error')
                }
            } catch {
                // network glitch — keep polling
            }
        }, 5000)

        return () => {
            clearInterval(pollRef.current!)
            clearInterval(tickRef.current!)
        }
    }, [status, orderId, triggerDownload])

    // idOverride/tokenOverride let callers (query-param auto-resolve, the ?o= return-from-editor
    // effect) pass a value straight through instead of racing React's async state updates.
    // Either an order number OR a design code is enough — the backend can resolve a token on
    // its own if that token is already linked to a real order (no order number needed).
    const verify = async (idOverride?: string, tokenOverride?: string) => {
        const id = (idOverride ?? orderId).trim()
        const tok = (tokenOverride ?? token).trim()
        if (!id && !tok) return
        setStatus('loading')
        setErrorMsg('')
        setNoCodePrompt(false)
        trackEvent('verify_attempt')
        try {
            const res = await fetch('/api/verify-order', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ etsyOrderId: id || undefined, token: tok || undefined }),
            })
            const data = await res.json()
            if (!res.ok) {
                if (data.needsToken) {
                    // No code on the order and none entered — steer them to the self-serve editor
                    // instead of a dead-end. Highlight the "Personalise your map" button.
                    setNoCodePrompt(true)
                    setErrorMsg("No design code on this order yet. If you have one, paste it in Design Code above — otherwise tap “Personalise your map” below to create it now (about a minute).")
                } else {
                    setErrorMsg(data.error || 'Verification failed.')
                }
                setStatus('error')
                return
            }
            if (data.status === 'rendering' || data.status === 'pending' || data.status === 'pending_manual') {
                setResult({ listingType: data.listingType || 'digital', printSize: data.printSize || null })
                setStatus('rendering')
                return
            }
            setResult(data)
            trackEvent('verify_success', { type: data.listingType })
            if (data.listingType === 'print') {
                setStatus('print_processing')
            } else if (data.downloadUrl) {
                // Immediately trigger silent download — no intermediate button state
                triggerDownload(data.downloadUrl)
            } else {
                setStatus('error')
                setErrorMsg('No download URL received. Please contact us via Etsy.')
            }
        } catch {
            setErrorMsg('Could not connect to server. Please try again.')
            setStatus('error')
        }
    }

    // ── Retry download if the user's OS blocked/cancelled it ──────────────────
    const retryDownload = () => {
        if (result?.downloadUrl) triggerDownload(result.downloadUrl)
    }

    // ── Open the buyer's OWN order in the full designer to personalise it, then finalise.
    // Removes the no-code / wrong-default dead-end — anyone can edit the map they purchased.
    const startEdit = async () => {
        const id = orderId.trim()
        if (!id) { setErrorMsg('Enter your Etsy order number first.'); return }
        setEditing(true)
        setErrorMsg('')
        try {
            const res = await fetch('/api/order-edit', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ etsyOrderId: id }),
            })
            const data = await res.json()
            if (!res.ok || !data.designUrl) {
                setEditing(false)
                setErrorMsg(data.error || 'Could not open your design. Please try again.')
                setStatus('error')
                return
            }
            trackEvent('order_edit_open')
            window.location.href = data.designUrl   // → /d/<token>?o=<orderId>
        } catch {
            setEditing(false)
            setErrorMsg('Could not connect. Please try again.')
        }
    }

    // ── Auto-return from the designer: /verify?o=<orderId> means the buyer just finalised an
    // edit. Go straight into polling — the order is pending→rendering→sent in the pipeline, and
    // order-status serves the FRESH render's download URL once ready (no re-typing, no stale file).
    useEffect(() => {
        const o = new URLSearchParams(window.location.search).get('o')
        if (o && /^\d+$/.test(o)) {
            setOrderId(o)
            setStatus('rendering')
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])

    // ── Auto-resolve from a link that embeds just the design code: /verify?token=<token>.
    // If that code is already linked to a real order, the backend resolves it with no order
    // number needed (see the token-only lookup in verify.js) — this makes a shared/bookmarked
    // link fully self-contained: no typing, no manual submit.
    useEffect(() => {
        const t = new URLSearchParams(window.location.search).get('token')
        if (t && /^[A-Za-z0-9_-]{4,30}$/.test(t)) {
            setToken(t)
            verify(undefined, t)
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])

    // ─── Render ──────────────────────────────────────────────────────────────

    return (
        <Box minH="100vh" bg="gray.50" py={16}>
            {/* Live region for screen readers */}
            <Box
                as="div"
                aria-live="polite"
                aria-atomic="true"
                position="absolute"
                w="1px" h="1px"
                overflow="hidden"
                style={{ clip: 'rect(0,0,0,0)', whiteSpace: 'nowrap' }}
            >
                {status === 'loading' && 'Checking your order…'}
                {status === 'rendering' && 'Your poster is being generated. This takes about 30 seconds.'}
                {status === 'auto_downloading' && 'Preparing your file for download…'}
                {status === 'downloaded' && 'Your file has been downloaded!'}
                {status === 'print_processing' && 'Your print order has been received.'}
                {status === 'error' && `Error: ${errorMsg}`}
            </Box>

            <Container maxW="480px">
                <VStack spacing={8} align="stretch">
                    <Box textAlign="center">
                        <Link href="/" fontSize="sm" color="gray.500" display="block" mb={6}>
                            ← Back to The Mapped Moment
                        </Link>
                        <Heading size="lg" fontWeight="800" mb={2}>Get Your Poster</Heading>
                        <Text color="gray.500" fontSize="sm">
                            Just enter your Etsy order number — we'll find the design you made and get your file.
                        </Text>
                    </Box>

                    {/* ── Entry form ── */}
                    {(status === 'idle' || status === 'loading' || status === 'error') && (
                        <Box bg="white" borderRadius="xl" p={8} boxShadow="sm" border="1px solid" borderColor="gray.200">
                            <VStack spacing={4}>
                                <FormControl>
                                    <FormLabel fontSize="xs" fontWeight="700" color="gray.500"
                                        textTransform="uppercase" letterSpacing="0.1em">
                                        Etsy Order Number
                                    </FormLabel>
                                    <Input
                                        id="verify-order-id"
                                        placeholder="e.g. 1234567890"
                                        value={orderId}
                                        onChange={e => setOrderId(e.target.value)}
                                        onKeyDown={e => e.key === 'Enter' && verify()}
                                        size="lg" borderRadius="md" fontSize="md" autoFocus
                                        aria-describedby="verify-order-hint"
                                        inputMode="numeric"
                                    />
                                    <FormHelperText id="verify-order-hint" fontSize="xs" color="gray.400">
                                        Find this in your Etsy purchase confirmation email. That's all we need — your
                                        design is matched from your order automatically.
                                    </FormHelperText>
                                </FormControl>

                                {/* Design Code is normally NOT needed — verify-order reads the code the buyer
                                    pasted into Etsy's Personalization box straight off the receipt. Only reveal
                                    this field as a fallback when auto-lookup fails (needsToken → noCodePrompt). */}
                                {noCodePrompt && (
                                    <FormControl>
                                        <FormLabel fontSize="xs" fontWeight="700" color="gray.500"
                                            textTransform="uppercase" letterSpacing="0.1em">
                                            Design Code
                                        </FormLabel>
                                        <Input
                                            id="verify-token"
                                            placeholder="e.g. XK7M2P or abcDEF_123-xyz"
                                            value={token}
                                            onChange={e => setToken(e.target.value.trim())}
                                            onKeyDown={e => e.key === 'Enter' && verify()}
                                            size="lg" borderRadius="md" fontFamily="monospace"
                                            letterSpacing="0.05em" maxLength={30} autoFocus
                                        />
                                        <FormHelperText fontSize="xs" color="gray.400">
                                            We couldn't match your design from the order automatically — paste the
                                            code from your design preview here.
                                        </FormHelperText>
                                    </FormControl>
                                )}

                                {status === 'error' && (
                                    <Alert status="error" borderRadius="md">
                                        <AlertIcon />
                                        <AlertDescription fontSize="sm">{errorMsg}</AlertDescription>
                                    </Alert>
                                )}

                                <Button
                                    onClick={() => verify()}
                                    isLoading={status === 'loading'}
                                    loadingText="Checking order…"
                                    size="lg" width="full"
                                    bg="gray.900" color="white" borderRadius="md" fontWeight="700"
                                    _hover={{ bg: 'gray.700' }}
                                    spinner={<Spinner size="sm" />}
                                >
                                    Get My Poster
                                </Button>

                                <Button
                                    onClick={startEdit}
                                    isLoading={editing}
                                    loadingText="Opening your design…"
                                    variant={noCodePrompt ? 'outline' : 'ghost'}
                                    size={noCodePrompt ? 'md' : 'sm'} width="full"
                                    borderColor={noCodePrompt ? 'gray.900' : undefined}
                                    color={noCodePrompt ? 'gray.900' : 'gray.500'}
                                    fontWeight={noCodePrompt ? '700' : '500'}
                                    fontSize={noCodePrompt ? 'sm' : 'xs'}
                                    _hover={noCodePrompt ? { bg: 'gray.50' } : { color: 'gray.800' }}
                                >
                                    {noCodePrompt ? 'Personalise your map →' : 'No design code? Personalise your map →'}
                                </Button>
                            </VStack>
                        </Box>
                    )}

                    {/* ── Server rendering in progress — polling ── */}
                    {status === 'rendering' && (
                        <Box bg="white" borderRadius="xl" p={8} boxShadow="sm" border="1px solid" borderColor="gray.200" textAlign="center">
                            <Spinner size="xl" color="gray.600" mb={4} />
                            <Heading size="md" fontWeight="800" mb={2}>Your poster is being generated</Heading>
                            <Text color="gray.500" fontSize="sm" mb={4}>
                                This takes about 30 seconds. We'll update automatically — no need to refresh.
                            </Text>
                            <Text fontSize="xs" color="gray.400" mb={4}>
                                Last checked {lastChecked}s ago
                            </Text>
                            {/* If customer has a design token and a specific print size, let them
                                preview the design at the correct size and adjust before we render */}
                            {token.trim() && result?.printSize && result?.listingType === 'print' && (
                                <Box mt={2} p={4} bg="blue.50" borderRadius="md" border="1px solid" borderColor="blue.200">
                                    <Text fontSize="sm" color="blue.800" mb={2} fontWeight="600">
                                        Your order is for a {result.printSize} print
                                    </Text>
                                    <Text fontSize="xs" color="blue.600" mb={3}>
                                        Want to check how your design looks at this size before we finalise it?
                                    </Text>
                                    <Button
                                        as="a"
                                        href={`/d/${encodeURIComponent(token.trim())}?lockedSize=${encodeURIComponent(result.printSize)}`}
                                        size="sm" colorScheme="blue" variant="solid"
                                    >
                                        Preview &amp; adjust at {result.printSize}
                                    </Button>
                                </Box>
                            )}
                        </Box>
                    )}

                    {/* ── File is being fetched and delivered ── */}
                    {status === 'auto_downloading' && (
                        <Box bg="white" borderRadius="xl" p={8} boxShadow="sm" border="1px solid" borderColor="gray.200" textAlign="center">
                            <Spinner size="xl" color="gray.600" mb={4} />
                            <Heading size="md" fontWeight="800" mb={2}>Preparing your file…</Heading>
                            <Text color="gray.500" fontSize="sm">
                                Your download will start automatically. Do not close this tab.
                            </Text>
                        </Box>
                    )}

                    {/* ── Download delivered ── */}
                    {status === 'downloaded' && (
                        <Box bg="white" borderRadius="xl" p={8} boxShadow="sm" border="1px solid" borderColor="gray.200" textAlign="center">
                            <Text fontSize="3xl" mb={4}>✓</Text>
                            <Heading size="md" fontWeight="800" mb={2}>
                                Your file has been delivered{result?.buyerName ? `, ${result.buyerName.split(' ')[0]}` : ''}!
                            </Heading>
                            <Text color="gray.500" fontSize="sm" mb={6}>
                                Your 300 DPI print file should now be in your Downloads folder.
                                Open it in any image viewer or send it directly to a print service.
                            </Text>

                            {(result?.revisionsRemaining ?? 3) > 0 && (
                                <Box bg="gray.50" borderRadius="md" p={3} mb={4} border="1px solid" borderColor="gray.200">
                                    <Text fontSize="xs" color="gray.600" mb={2}>
                                        Wrong location, date or names? Edit your map and we&apos;ll re-make your file —{' '}
                                        <strong>{result?.revisionsRemaining ?? 3} free edit{(result?.revisionsRemaining ?? 3) !== 1 ? 's' : ''} left.</strong>
                                    </Text>
                                    <Button
                                        onClick={startEdit}
                                        isLoading={editing}
                                        loadingText="Opening your design…"
                                        size="sm" width="full" variant="outline"
                                        borderColor="gray.300" fontSize="xs" fontWeight="600"
                                    >
                                        ✏️ Edit / personalise your map
                                    </Button>
                                </Box>
                            )}

                            {/* ── Print & frame guidance (size-aware) ── */}
                            {(() => {
                                const fk = resolveFrameKey(result?.printSize)
                                const tip = fk ? FRAME_TIPS[fk] : null
                                const sizeLabel = fk ? (fk.startsWith('A') ? fk : fk.replace('x', '×') + '″') : ''
                                const ikeaHref = `https://www.ikea.com/us/en/search/?q=${encodeURIComponent('ribba ' + (fk || ''))}`
                                return (
                                    <Box bg="orange.50" borderRadius="md" p={4} mb={4} border="1px solid" borderColor="orange.100" textAlign="left">
                                        <Text fontSize="sm" fontWeight="700" color="gray.800" mb={2}>🖼️ Print &amp; frame it in minutes</Text>
                                        <Text fontSize="xs" color="gray.600" mb={2}>
                                            <Text as="span" fontWeight="700">Print:</Text> Send your file to{' '}
                                            <Link href="https://photos.walmart.com" isExternal color="orange.700" textDecoration="underline">Walmart Photo</Link>,{' '}
                                            <Link href="https://photo.walgreens.com" isExternal color="orange.700" textDecoration="underline">Walgreens</Link>{' '}or CVS for same-day pickup — or{' '}
                                            <Link href="https://www.mpix.com" isExternal color="orange.700" textDecoration="underline">Mpix</Link>{' '}for premium quality. Choose <Text as="span" fontWeight="700">“borderless / full bleed.”</Text>
                                        </Text>
                                        <Text fontSize="xs" color="gray.600">
                                            <Text as="span" fontWeight="700">Frame:</Text>{' '}
                                            {tip?.ribbaSize ? (
                                                <>Your {sizeLabel} print drops straight into an{' '}
                                                    <Link href={ikeaHref} isExternal color="orange.700" textDecoration="underline">IKEA RIBBA {tip.ribbaSize}</Link>{' '}frame — no mat or trimming needed.</>
                                            ) : tip?.alt ? (
                                                <>Your {sizeLabel} print fits {tip.alt} — drop it straight in, no trimming.</>
                                            ) : (
                                                <>It’s sized to standard frames — grab a matching{' '}
                                                    <Link href="https://www.ikea.com/us/en/search/?q=ribba" isExternal color="orange.700" textDecoration="underline">IKEA RIBBA</Link>{' '}frame and drop it in.</>
                                            )}
                                        </Text>
                                    </Box>
                                )
                            })()}

                            <Divider mb={4} />

                            <Button
                                onClick={retryDownload}
                                size="sm" variant="ghost" color="gray.500"
                                fontSize="xs" fontWeight="500"
                                _hover={{ color: 'gray.800' }}
                            >
                                Didn't receive it? Click to retry
                            </Button>
                        </Box>
                    )}

                    {/* ── Print order ── */}
                    {status === 'print_processing' && (
                        <Box bg="white" borderRadius="xl" p={8} boxShadow="sm" border="1px solid" borderColor="gray.200" textAlign="center">
                            <Text fontSize="3xl" mb={4}>🖨️</Text>
                            <Heading size="md" fontWeight="800" mb={2}>Your print is in production!</Heading>
                            <Text color="gray.500" fontSize="sm" mb={4}>
                                Your poster has been sent to our print partner and will be shipped to you soon.
                            </Text>
                            {result?.printifyOrderId && (
                                <HStack justify="center" mb={4}>
                                    <Text fontSize="xs" color="gray.500">Print order ID:</Text>
                                    <Text fontSize="xs" fontFamily="monospace" color="gray.700">
                                        {result.printifyOrderId}
                                    </Text>
                                </HStack>
                            )}
                            <Text fontSize="xs" color="gray.400">
                                You'll receive a shipping notification from Etsy once dispatched.
                            </Text>
                        </Box>
                    )}

                    <Text textAlign="center" fontSize="xs" color="gray.400">
                        Need help?{' '}
                        <Link href="https://www.etsy.com/shop/TheMappedMoment" isExternal color="gray.600">
                            Message us on Etsy
                        </Link>
                        {' · '}
                        <Link href="/privacy" color="gray.600">Privacy Policy</Link>
                    </Text>
                </VStack>
            </Container>
        </Box>
    )
}
