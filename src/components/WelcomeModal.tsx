import React, { useState, useEffect } from 'react';
import {
    Modal, ModalOverlay, ModalContent, ModalBody,
    Button, Text, VStack, HStack, Box, SimpleGrid,
} from '@chakra-ui/react';

const WELCOMED_KEY = 'poster_studio_welcomed';

const STEPS_DEFAULT = [
    {
        icon: '🗺️',
        title: 'Pick a map type',
        body: 'Start with a classic Star Map of the night sky, a monochrome Street Map, or a full-colour Colored Map.',
    },
    {
        icon: '✏️',
        title: 'Personalise it',
        body: 'Set the location, date and time, then customise your title, fonts, and colours in the sidebar.',
    },
    {
        icon: '🛍️',
        title: 'Order your print',
        body: 'Preview a watermarked download for free, or purchase a print-quality file or physical print on Etsy.',
    },
];

const STEPS_TEMPLATE = [
    {
        icon: '✏️',
        title: 'Customise your design',
        body: 'Set your location, date, title and other details in the sidebar. The style is already set up for you.',
    },
    {
        icon: '🖼️',
        title: 'Preview for free',
        body: 'Download a watermarked preview to see exactly how your poster will look before you buy.',
    },
    {
        icon: '🛍️',
        title: 'Save & order on Etsy',
        body: 'Click "Save Design & Order" to get a unique code, then complete your purchase on Etsy and include the code in your order note.',
    },
];

interface WelcomeModalProps {
    isOpen: boolean;
    onClose: () => void;
    isTemplateMode?: boolean;
}

export const WelcomeModal: React.FC<WelcomeModalProps> = ({ isOpen, onClose, isTemplateMode = false }) => {
    const steps = isTemplateMode ? STEPS_TEMPLATE : STEPS_DEFAULT;

    return (
        <Modal isOpen={isOpen} onClose={onClose} isCentered size="lg" closeOnOverlayClick>
            <ModalOverlay bg="blackAlpha.700" />
            <ModalContent borderRadius="2xl" overflow="hidden" mx={3}>
                {/* Header */}
                <Box bg="gray.900" px={8} pt={8} pb={6} textAlign="center">
                    <Text fontSize="xs" fontWeight="700" letterSpacing="0.15em" color="yellow.300" textTransform="uppercase" mb={2}>
                        {isTemplateMode ? 'Customise your order' : 'Welcome to'}
                    </Text>
                    <Text fontSize="2xl" fontWeight="800" color="white" letterSpacing="-0.01em">
                        The Mapped Moment
                    </Text>
                    <Text fontSize="sm" color="gray.400" mt={2}>
                        {isTemplateMode
                            ? 'Personalise this design, then save & order on Etsy'
                            : 'Design a personalised poster in 3 steps'}
                    </Text>
                </Box>

                <ModalBody px={6} py={6}>
                    <SimpleGrid columns={3} gap={4} mb={6}>
                        {steps.map((step, i) => (
                            <VStack key={i} align="center" spacing={2} textAlign="center">
                                <Box fontSize="2xl" lineHeight="1">{step.icon}</Box>
                                <Text fontSize="xs" fontWeight="700" color="gray.800">{step.title}</Text>
                                <Text fontSize="xs" color="gray.500" lineHeight="1.5">{step.body}</Text>
                            </VStack>
                        ))}
                    </SimpleGrid>

                    <VStack spacing={2}>
                        <Button
                            w="full"
                            bg={isTemplateMode ? 'orange.500' : 'gray.900'}
                            color="white"
                            _hover={{ bg: isTemplateMode ? 'orange.600' : 'gray.700' }}
                            borderRadius="lg"
                            size="md"
                            fontWeight="700"
                            onClick={onClose}
                        >
                            {isTemplateMode ? 'Start Customising' : 'Start Designing'}
                        </Button>
                        <Text fontSize="11px" color="gray.400" textAlign="center">
                            {isTemplateMode
                                ? 'Free watermarked preview — save & order on Etsy when ready'
                                : 'Free watermarked preview — no account needed'}
                        </Text>
                    </VStack>
                </ModalBody>
            </ModalContent>
        </Modal>
    );
};

/** Returns isOpen + onClose, auto-opens on first visit. */
export function useWelcomeModal() {
    const [isOpen, setIsOpen] = useState(false);

    useEffect(() => {
        if (!localStorage.getItem(WELCOMED_KEY)) {
            // Small delay so the app has time to render first
            const t = setTimeout(() => setIsOpen(true), 800);
            return () => clearTimeout(t);
        }
    }, []);

    const onClose = () => {
        localStorage.setItem(WELCOMED_KEY, '1');
        setIsOpen(false);
    };

    return { isOpen, onClose };
}
