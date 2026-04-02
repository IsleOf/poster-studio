import { useState, useEffect, useRef } from 'react'
import {
    Box, Container, Heading, Text, VStack, Input, Button,
    Link, Alert, AlertIcon, AlertDescription, Divider, HStack, Spinner,
    FormControl, FormLabel, FormHelperText,
} from '@chakra-ui/react'
import { trackEvent } from '../utils/analytics'

type Status = 'idle' | 'loading' | 'rendering' | 'digital_ready' | 'print_processing' | 'error'

interface VerifyResult {
    listingType: 'digital' | 'print'
    downloadUrl?: string
    printifyOrderId?: string
    buyerName?: string
    revisionsUsed?: number
    revisionsRemaining?: number
    revisionsExhausted?: boolean
}

export default function VerifyOrder() {
    const [orderId, setOrderId] = useState('')
    const [token, setToken] = useState('')
    const [status, setStatus] = useState<Status>('idle')
    const [result, setResult] = useState<VerifyResult | null>(null)
    const [errorMsg, setErrorMsg] = useState('')
    const [lastChecked, setLastChecked] = useState(0)
    const pollRef = useRef<ReturnType<typeof setInterval> | null>(null)
    const tickRef = useRef<ReturnType<typeof setInterval> | null>(null)

    // Poll for render completion when in 'rendering' state
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
                    setStatus('digital_ready')
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
    }, [status, orderId])

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
            // Server returns status field when order is still rendering
            if (data.status === 'rendering' || data.status === 'pending' || data.status === 'pending_manual') {
                setResult({ listingType: data.listingType || 'digital' })
                setStatus('rendering')
                return
            }
            setResult(data)
            trackEvent('verify_success', { type: data.listingType })
            setStatus(data.listingType === 'print' ? 'print_processing' : 'digital_ready')
        } catch {
            setErrorMsg('Could not connect to server. Please try again.')
            setStatus('error')
        }
    }

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
                {status === 'digital_ready' && 'Your poster is ready to download!'}
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
                                        placeholder="e.g. XK7M2P"
                                        value={token}
                                        onChange={e => setToken(e.target.value.toUpperCase())}
                                        onKeyDown={e => e.key === 'Enter' && verify()}
                                        size="lg" borderRadius="md" fontFamily="monospace"
                                        letterSpacing="0.15em" maxLength={6}
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

                    {status === 'digital_ready' && result?.downloadUrl && (
                        <Box bg="white" borderRadius="xl" p={8} boxShadow="sm" border="1px solid" borderColor="gray.200" textAlign="center">
                            <Text fontSize="3xl" mb={4}>🎉</Text>
                            <Heading size="md" fontWeight="800" mb={2}>
                                Your poster is ready{result.buyerName ? `, ${result.buyerName.split(' ')[0]}` : ''}!
                            </Heading>
                            <Text color="gray.500" fontSize="sm" mb={6}>
                                Your high-resolution 300 DPI print file is ready to download.
                            </Text>
                            <Button
                                as="a" href={result.downloadUrl} download
                                size="lg" width="full"
                                bg="gray.900" color="white" borderRadius="md" fontWeight="700"
                                _hover={{ bg: 'gray.700' }} mb={4}
                            >
                                Download PNG (300 DPI)
                            </Button>
                            {(result.revisionsRemaining ?? 3) > 0 && (
                                <Box bg="gray.50" borderRadius="md" p={3} mb={4} border="1px solid" borderColor="gray.200">
                                    <Text fontSize="xs" color="gray.600" mb={2}>
                                        <strong>{result.revisionsRemaining ?? 3} correction{(result.revisionsRemaining ?? 3) !== 1 ? 's' : ''} remaining.</strong> Not happy with the result?
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
                            <Text fontSize="xs" color="gray.400">
                                Link valid for 7 days. Includes {3 - (result.revisionsUsed ?? 0)} of 3 free corrections.
                            </Text>
                        </Box>
                    )}

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
