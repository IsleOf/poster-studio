import { useState } from 'react'
import {
    Box, Container, Heading, Text, VStack, Input, Button,
    Link, Alert, AlertIcon, AlertDescription, Divider, HStack, Spinner
} from '@chakra-ui/react'

type Status = 'idle' | 'loading' | 'digital_ready' | 'print_processing' | 'error'

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

    const verify = async () => {
        if (!orderId.trim()) return
        setStatus('loading')
        setErrorMsg('')
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
            setResult(data)
            setStatus(data.listingType === 'print' ? 'print_processing' : 'digital_ready')
        } catch {
            setErrorMsg('Could not connect to server. Please try again.')
            setStatus('error')
        }
    }

    return (
        <Box minH="100vh" bg="gray.50" py={16}>
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

                    {status === 'idle' || status === 'loading' || status === 'error' ? (
                        <Box bg="white" borderRadius="xl" p={8} boxShadow="sm" border="1px solid" borderColor="gray.200">
                            <VStack spacing={4}>
                                <Box w="full">
                                    <Text fontSize="xs" fontWeight="700" color="gray.500"
                                        textTransform="uppercase" letterSpacing="0.1em" mb={2}>
                                        Etsy Order Number
                                    </Text>
                                    <Input
                                        placeholder="e.g. 1234567890"
                                        value={orderId}
                                        onChange={e => setOrderId(e.target.value)}
                                        onKeyDown={e => e.key === 'Enter' && verify()}
                                        size="lg"
                                        borderRadius="md"
                                        fontSize="md"
                                        autoFocus
                                    />
                                    <Text fontSize="xs" color="gray.400" mt={1}>
                                        Find this in your Etsy purchase confirmation email.
                                    </Text>
                                </Box>

                                <Box w="full">
                                    <Text fontSize="xs" fontWeight="700" color="gray.500"
                                        textTransform="uppercase" letterSpacing="0.1em" mb={2}>
                                        Design Token <Text as="span" fontWeight="400" textTransform="none">(optional — speeds up lookup)</Text>
                                    </Text>
                                    <Input
                                        placeholder="e.g. XK7M2P"
                                        value={token}
                                        onChange={e => setToken(e.target.value.toUpperCase())}
                                        onKeyDown={e => e.key === 'Enter' && verify()}
                                        size="lg"
                                        borderRadius="md"
                                        fontFamily="monospace"
                                        letterSpacing="0.15em"
                                        maxLength={6}
                                    />
                                </Box>

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
                                    size="lg"
                                    width="full"
                                    bg="gray.900"
                                    color="white"
                                    borderRadius="md"
                                    fontWeight="700"
                                    _hover={{ bg: 'gray.700' }}
                                    spinner={<Spinner size="sm" />}
                                >
                                    Get My Poster
                                </Button>
                            </VStack>
                        </Box>
                    ) : status === 'digital_ready' && result?.downloadUrl ? (
                        <Box bg="white" borderRadius="xl" p={8} boxShadow="sm" border="1px solid" borderColor="gray.200" textAlign="center">
                            <Text fontSize="3xl" mb={4}>🎉</Text>
                            <Heading size="md" fontWeight="800" mb={2}>
                                Your poster is ready{result.buyerName ? `, ${result.buyerName.split(' ')[0]}` : ''}!
                            </Heading>
                            <Text color="gray.500" fontSize="sm" mb={6}>
                                Your high-resolution 300 DPI print file is ready to download.
                            </Text>
                            <Button
                                as="a"
                                href={result.downloadUrl}
                                download
                                size="lg"
                                width="full"
                                bg="gray.900"
                                color="white"
                                borderRadius="md"
                                fontWeight="700"
                                _hover={{ bg: 'gray.700' }}
                                mb={4}
                            >
                                Download PNG (300 DPI)
                            </Button>
                            {(result.revisionsRemaining ?? 3) > 0 && (
                                <Box bg="gray.50" borderRadius="md" p={3} mb={4} border="1px solid" borderColor="gray.200">
                                    <Text fontSize="xs" color="gray.600" mb={2}>
                                        <strong>{result.revisionsRemaining ?? 3} correction{(result.revisionsRemaining ?? 3) !== 1 ? 's' : ''} remaining.</strong> Not happy with the result?
                                    </Text>
                                    <Button
                                        as="a"
                                        href="/"
                                        size="sm"
                                        width="full"
                                        variant="outline"
                                        borderColor="gray.300"
                                        fontSize="xs"
                                        fontWeight="600"
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
                    ) : status === 'print_processing' ? (
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
                    ) : null}

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
