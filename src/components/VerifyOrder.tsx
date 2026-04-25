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
}

// ─── Silent download helper ───────────────────────────────────────────────────
// Fetches the file as a binary blob via the Fetch API, then triggers the browser
// "Save file" dialog programmatically.  The <a> element is created in memory and
// never inserted into the DOM, so the blob: URL is never visible to the user or
// to browser extensions that scan the DOM for downloadable resources.
// The blob: URL is revoked before this function returns.
async function silentDownload(url: string): Promise<void> {
    const resp = await fetch(url, { credentials: 'same-origin' })
    if (!resp.ok) throw new Error(`Download failed: ${resp.status}`)
    const buf = await resp.arrayBuffer()
    // Re-wrap as octet-stream so the browser cannot infer the real content type
    const blob = new Blob([buf], { type: 'application/octet-stream' })
    const objectUrl = URL.createObjectURL(blob)
    try {
        const a = document.createElement('a')
        a.href = objectUrl
        // Filename shown in the OS save dialog — a random hex string with no extension
        // so the file type is not guessable without opening the file.
        a.download = Array.from(crypto.getRandomValues(new Uint8Array(12)))
            .map(b => b.toString(16).padStart(2, '0'))
            .join('')
        // Click without ever adding the element to the live DOM
        a.dispatchEvent(new MouseEvent('click', { bubbles: false, cancelable: false }))
    } finally {
        // Revoke immediately — even if the browser starts the download asynchronously,
        // revoking here makes the URL unusable for any subsequent fetch or right-click.
        URL.revokeObjectURL(objectUrl)
    }
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function VerifyOrder() {
    const [orderId, setOrderId] = useState('')
    const [token, setToken] = useState('')
    const [status, setStatus] = useState<Status>('idle')
    const [result, setResult] = useState<VerifyResult | null>(null)
    const [errorMsg, setErrorMsg] = useState('')
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

    const verify = async () => {
        if (!orderId.trim()) return
        setStatus('loading')
        setErrorMsg('')
        trackEvent('verify_attempt')
        try {
            const res = await fetch('/api/verify-order', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ etsyOrderId: orderId.trim(), token: token.trim() || undefined }),
            })
            const data = await res.json()
            if (!res.ok) {
                setErrorMsg(data.error || 'Verification failed.')
                setStatus('error')
                return
            }
            if (data.status === 'rendering' || data.status === 'pending' || data.status === 'pending_manual') {
                setResult({ listingType: data.listingType || 'digital' })
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
                            Enter your Etsy order number to download your file or check your print status.
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
                                        Find this in your Etsy purchase confirmation email.
                                    </FormHelperText>
                                </FormControl>

                                <FormControl>
                                    <FormLabel fontSize="xs" fontWeight="700" color="gray.500"
                                        textTransform="uppercase" letterSpacing="0.1em">
                                        Design Token{' '}
                                        <Text as="span" fontWeight="400" textTransform="none">(optional — speeds up lookup)</Text>
                                    </FormLabel>
                                    <Input
                                        id="verify-token"
                                        placeholder="e.g. XK7M2P or abcDEF_123-xyz"
                                        value={token}
                                        onChange={e => setToken(e.target.value.trim())}
                                        onKeyDown={e => e.key === 'Enter' && verify()}
                                        size="lg" borderRadius="md" fontFamily="monospace"
                                        letterSpacing="0.05em" maxLength={30}
                                    />
                                </FormControl>

                                {status === 'error' && (
                                    <Alert status="error" borderRadius="md">
                                        <AlertIcon />
                                        <AlertDescription fontSize="sm">{errorMsg}</AlertDescription>
                                    </Alert>
                                )}

                                <Button
                                    onClick={verify}
                                    isLoading={status === 'loading'}
                                    loadingText="Checking order…"
                                    size="lg" width="full"
                                    bg="gray.900" color="white" borderRadius="md" fontWeight="700"
                                    _hover={{ bg: 'gray.700' }}
                                    spinner={<Spinner size="sm" />}
                                >
                                    Get My Poster
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
                            <Text fontSize="xs" color="gray.400">
                                Last checked {lastChecked}s ago
                            </Text>
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
                                        <strong>{result?.revisionsRemaining ?? 3} correction{(result?.revisionsRemaining ?? 3) !== 1 ? 's' : ''} remaining.</strong>{' '}
                                        Not happy with the result?
                                    </Text>
                                    <Button
                                        as="a" href="/" size="sm" width="full" variant="outline"
                                        borderColor="gray.300" fontSize="xs" fontWeight="600"
                                    >
                                        Redesign → get new token → enter it below
                                    </Button>
                                </Box>
                            )}

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
