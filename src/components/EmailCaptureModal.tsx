import React, { useEffect, useRef, useState } from 'react';
import {
    Modal, ModalOverlay, ModalContent, ModalHeader, ModalBody, ModalFooter,
    ModalCloseButton, Button, Input, VStack, Text, useDisclosure,
} from '@chakra-ui/react';
import { useStore } from '../store/useStore';

const API_URL = import.meta.env.VITE_API_URL || '';
const LOCAL_KEY = 'posterStudio.emailCaptured';
const SESSION_KEY = 'posterStudio.emailCaptureShown';
const WARMUP_MS = 12000;

type Props = {
    listingSlug?: string;
    designGroupId?: string | null;
    designLabel?: string | null;
};

const EmailCaptureModal: React.FC<Props> = ({ listingSlug, designGroupId, designLabel }) => {
    const { isOpen, onOpen, onClose } = useDisclosure();
    const savedDesignToken = useStore(s => s.savedDesignToken);
    const [email, setEmail] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [done, setDone] = useState(false);
    const [error, setError] = useState('');
    const triggeredRef = useRef(false);
    const mountTsRef = useRef(Date.now());

    useEffect(() => {
        if (typeof window === 'undefined') return;
        if (localStorage.getItem(LOCAL_KEY) === '1') return;
        if (sessionStorage.getItem(SESSION_KEY) === '1') return;

        const tryTrigger = () => {
            if (triggeredRef.current) return;
            if (Date.now() - mountTsRef.current < WARMUP_MS) return;
            triggeredRef.current = true;
            sessionStorage.setItem(SESSION_KEY, '1');
            onOpen();
        };

        // Fallback: trigger after warmup regardless, so passive viewers still see it
        const fallback = setTimeout(tryTrigger, WARMUP_MS + 1000);

        // Trigger on first interaction after warmup
        const onInteract = () => {
            if (Date.now() - mountTsRef.current >= WARMUP_MS) tryTrigger();
        };
        window.addEventListener('pointerdown', onInteract, { passive: true });
        window.addEventListener('keydown', onInteract, { passive: true });

        return () => {
            clearTimeout(fallback);
            window.removeEventListener('pointerdown', onInteract);
            window.removeEventListener('keydown', onInteract);
        };
    }, [onOpen]);

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
            setError('Please enter a valid email');
            return;
        }
        setSubmitting(true);
        setError('');
        try {
            const res = await fetch(`${API_URL}/api/email-capture`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    email,
                    listingSlug: listingSlug || undefined,
                    designGroupId: designGroupId || undefined,
                    designLabel: designLabel || undefined,
                    designToken: savedDesignToken || undefined,
                    referrer: document.referrer || undefined,
                }),
            });
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            localStorage.setItem(LOCAL_KEY, '1');
            setDone(true);
            setTimeout(() => onClose(), 2200);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Something went wrong');
        } finally {
            setSubmitting(false);
        }
    }

    function handleSkip() {
        onClose();
    }

    return (
        <Modal isOpen={isOpen} onClose={handleSkip} isCentered size="md" closeOnOverlayClick={!submitting}>
            <ModalOverlay backdropFilter="blur(4px)" />
            <ModalContent borderRadius="xl" overflow="hidden">
                <ModalHeader bg="gray.900" color="amber.200" textAlign="center" pb={3}>
                    <Text fontSize="xs" letterSpacing="0.18em" textTransform="uppercase" color="yellow.300">
                        The Mapped Moment
                    </Text>
                    <Text fontSize="lg" mt={1} color="white" fontWeight="medium">
                        Save your design — instantly
                    </Text>
                </ModalHeader>
                <ModalCloseButton color="white" isDisabled={submitting} />
                <ModalBody pt={6} pb={2}>
                    {done ? (
                        <VStack spacing={2} py={4}>
                            <Text fontSize="md" color="green.600" fontWeight="medium">Sent — check your inbox ✨</Text>
                            <Text fontSize="sm" color="gray.500" textAlign="center">
                                We've emailed you a link to come back to this design any time.
                            </Text>
                        </VStack>
                    ) : (
                        <form onSubmit={handleSubmit}>
                            <VStack spacing={3} align="stretch">
                                <Text fontSize="sm" color="gray.600">
                                    Pop your email in and we'll send you a link to this design so you can
                                    pick it up later, tweak it, or share with someone.
                                </Text>
                                <Input
                                    type="email"
                                    value={email}
                                    onChange={e => setEmail(e.target.value)}
                                    placeholder="you@example.com"
                                    autoFocus
                                    isDisabled={submitting}
                                />
                                {error && (
                                    <Text fontSize="sm" color="red.500">{error}</Text>
                                )}
                            </VStack>
                        </form>
                    )}
                </ModalBody>
                <ModalFooter justifyContent="space-between" pt={3}>
                    {done ? (
                        <Button size="sm" variant="ghost" onClick={onClose} ml="auto">Close</Button>
                    ) : (
                        <>
                            <Button size="sm" variant="ghost" color="gray.500" onClick={handleSkip} isDisabled={submitting}>
                                Maybe later
                            </Button>
                            <Button
                                size="sm"
                                bg="gray.900"
                                color="white"
                                _hover={{ bg: 'gray.800' }}
                                isLoading={submitting}
                                onClick={handleSubmit}
                            >
                                Email me the link
                            </Button>
                        </>
                    )}
                </ModalFooter>
            </ModalContent>
        </Modal>
    );
};

export default EmailCaptureModal;
