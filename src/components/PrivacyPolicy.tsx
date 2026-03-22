import { Box, Container, Heading, Text, VStack, Link, Divider } from '@chakra-ui/react'

export default function PrivacyPolicy() {
    return (
        <Box minH="100vh" bg="white" py={16}>
            <Container maxW="700px">
                <VStack align="start" spacing={8}>
                    <Box>
                        <Link href="/" fontSize="sm" color="gray.500" mb={6} display="block">
                            ← Back to The Mapped Moment
                        </Link>
                        <Heading as="h1" size="xl" fontWeight="800" mb={2}>Privacy Policy</Heading>
                        <Text color="gray.500" fontSize="sm">Last updated: March 2026</Text>
                    </Box>

                    <Divider />

                    <Section title="Who We Are">
                        The Mapped Moment ("we", "us") operates the custom poster design tool at{' '}
                        <Link href="https://themappedmoment.com" color="blue.500">
                            themappedmoment.com
                        </Link>{' '}
                        and sells personalised map and star chart posters via our Etsy shop,{' '}
                        <Link href="https://www.etsy.com/shop/TheMappedMoment" color="blue.500" isExternal>
                            etsy.com/shop/TheMappedMoment
                        </Link>.
                    </Section>

                    <Section title="What Data We Collect">
                        <Text mb={3}>When you use our design tool and place an order, we collect:</Text>
                        <VStack align="start" spacing={2} pl={4}>
                            <BulletItem><strong>Design configuration</strong> — your poster settings (location, date, colours, fonts). Stored against a short design token you receive at checkout.</BulletItem>
                            <BulletItem><strong>Etsy order data</strong> — when you purchase via Etsy, we read your order details (receipt ID, personalisation note, shipping address for print orders) via the Etsy API. We do not store payment information.</BulletItem>
                            <BulletItem><strong>Name and email</strong> — provided by Etsy as part of your order, used solely to deliver your file or print.</BulletItem>
                            <BulletItem><strong>Shipping address</strong> — for print orders only, passed directly to our print fulfilment partner (Printify) for shipping. Not stored after fulfilment.</BulletItem>
                        </VStack>
                    </Section>

                    <Section title="How We Use Your Data">
                        <VStack align="start" spacing={2} pl={4}>
                            <BulletItem>To render your custom poster at print resolution (300 DPI).</BulletItem>
                            <BulletItem>To deliver your digital file via Etsy message or secure download link.</BulletItem>
                            <BulletItem>To route print orders to our fulfilment partner (Printify) for printing and shipping.</BulletItem>
                            <BulletItem>We do not sell, share, or use your data for advertising or marketing.</BulletItem>
                        </VStack>
                    </Section>

                    <Section title="Etsy API Data">
                        We use the Etsy API to:
                        <VStack align="start" spacing={2} pl={4} mt={3}>
                            <BulletItem>Read your paid order receipts to verify purchase and retrieve your design token.</BulletItem>
                            <BulletItem>Send you a message via Etsy Conversations with your download link (digital orders).</BulletItem>
                        </VStack>
                        <Text mt={3}>
                            We access only the minimum data necessary to fulfil your order. We do not access your Etsy account, favourites, payment details, or any data beyond your order receipt.
                        </Text>
                    </Section>

                    <Section title="Third-Party Services">
                        <VStack align="start" spacing={2} pl={4}>
                            <BulletItem><strong>Etsy</strong> — order management and buyer communication. Subject to <Link href="https://www.etsy.com/legal/privacy" isExternal color="blue.500">Etsy's Privacy Policy</Link>.</BulletItem>
                            <BulletItem><strong>Printify</strong> — print fulfilment for physical orders. Your shipping address is shared with Printify solely to fulfil your order. Subject to <Link href="https://printify.com/privacy-policy/" isExternal color="blue.500">Printify's Privacy Policy</Link>.</BulletItem>
                            <BulletItem><strong>OpenFreeMap / MapLibre</strong> — street map tile data. No personal data is sent to these services.</BulletItem>
                            <BulletItem><strong>Nominatim / OpenStreetMap</strong> — city geocoding. Only the city name you type is sent; no personal data.</BulletItem>
                        </VStack>
                    </Section>

                    <Section title="Data Retention">
                        <VStack align="start" spacing={2} pl={4}>
                            <BulletItem>Design configurations are retained for 90 days after creation to allow re-downloads.</BulletItem>
                            <BulletItem>Rendered poster files are deleted 30 days after fulfilment.</BulletItem>
                            <BulletItem>Order records (receipt ID, status, token) are retained for 12 months for support purposes.</BulletItem>
                        </VStack>
                    </Section>

                    <Section title="Your Rights">
                        You may request deletion of your data at any time by contacting us at{' '}
                        <Link href="mailto:hello@themappedmoment.com" color="blue.500">
                            hello@themappedmoment.com
                        </Link>. We will delete your design configuration, order record, and any rendered files within 7 days.
                    </Section>

                    <Section title="Security">
                        Your data is stored on an encrypted server (AWS EC2, Sydney region). All connections are secured via HTTPS/TLS. Download links are time-limited and unique to each order.
                    </Section>

                    <Section title="Contact">
                        For any privacy questions or data requests:<br />
                        <Link href="mailto:hello@themappedmoment.com" color="blue.500">
                            hello@themappedmoment.com
                        </Link>
                        <br />
                        <Link href="https://www.etsy.com/shop/TheMappedMoment" color="blue.500" isExternal>
                            etsy.com/shop/TheMappedMoment
                        </Link>
                    </Section>
                </VStack>
            </Container>
        </Box>
    )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
    return (
        <Box w="full">
            <Heading as="h2" size="md" fontWeight="700" mb={3}>{title}</Heading>
            <Text color="gray.700" lineHeight="1.8" fontSize="sm">{children}</Text>
        </Box>
    )
}

function BulletItem({ children }: { children: React.ReactNode }) {
    return (
        <Text fontSize="sm" color="gray.700" lineHeight="1.8">
            • {children}
        </Text>
    )
}
