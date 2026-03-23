import React, { useEffect, useState } from 'react';
import {
    Box, Heading, Text, VStack, HStack, Button, Switch, FormLabel,
    Input, Spinner, Divider, Badge,
} from '@chakra-ui/react';
import { getSettings, updateSettings } from './adminApi';

const SettingsPage: React.FC = () => {
    const [settings, setSettings] = useState<Record<string, any>>({});
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [savedMsg, setSavedMsg] = useState('');

    // Local editable state
    const [autoProcess, setAutoProcess] = useState(false);
    const [maxRevisions, setMaxRevisions] = useState('3');
    const [notifyEmail, setNotifyEmail] = useState('');

    useEffect(() => {
        getSettings().then(s => {
            setSettings(s);
            setAutoProcess(!!s.auto_process_orders);
            setMaxRevisions(String(s.max_revisions ?? 3));
            setNotifyEmail(s.notify_email ?? '');
            setLoading(false);
        });
    }, []);

    const handleSave = async () => {
        setSaving(true);
        await updateSettings({
            auto_process_orders: autoProcess,
            max_revisions: parseInt(maxRevisions) || 3,
            notify_email: notifyEmail.trim(),
        });
        setSavedMsg('Settings saved!');
        setTimeout(() => setSavedMsg(''), 3000);
        setSaving(false);
    };

    if (loading) return <Box p={8} textAlign="center"><Spinner /></Box>;

    return (
        <VStack align="stretch" spacing={4} maxW="700px">
            <Heading size="md" color="gray.800">Settings</Heading>

            {/* Order Processing */}
            <Box bg="white" p={5} borderRadius="lg" border="1px" borderColor="gray.200">
                <Text fontSize="sm" fontWeight="600" mb={3}>Order Processing</Text>
                <VStack align="stretch" spacing={4}>
                    <HStack justify="space-between">
                        <Box>
                            <Text fontSize="sm">Auto-process orders</Text>
                            <Text fontSize="xs" color="gray.500">
                                When enabled, orders are automatically rendered and the download link
                                is sent to the buyer via Etsy Conversations. When disabled, orders
                                queue as "pending_manual" and you confirm each one from the Orders page.
                            </Text>
                        </Box>
                        <HStack>
                            <Badge colorScheme={autoProcess ? 'green' : 'gray'} fontSize="xs">
                                {autoProcess ? 'ON' : 'OFF'}
                            </Badge>
                            <Switch
                                isChecked={autoProcess}
                                onChange={e => setAutoProcess(e.target.checked)}
                                size="md"
                            />
                        </HStack>
                    </HStack>

                    <Divider />

                    <HStack justify="space-between">
                        <Box>
                            <Text fontSize="sm">Max revisions per order</Text>
                            <Text fontSize="xs" color="gray.500">
                                Number of times a buyer can re-download a modified version.
                            </Text>
                        </Box>
                        <Input
                            size="sm" type="number" min={0} max={10} w="80px"
                            value={maxRevisions}
                            onChange={e => setMaxRevisions(e.target.value)}
                        />
                    </HStack>
                </VStack>
            </Box>

            {/* Notifications */}
            <Box bg="white" p={5} borderRadius="lg" border="1px" borderColor="gray.200">
                <Text fontSize="sm" fontWeight="600" mb={3}>Notifications</Text>
                <Box>
                    <FormLabel fontSize="xs" color="gray.600" mb={1}>
                        Notify email (for new order alerts — optional)
                    </FormLabel>
                    <Input
                        size="sm" type="email" placeholder="you@example.com"
                        value={notifyEmail} onChange={e => setNotifyEmail(e.target.value)}
                        maxW="300px"
                    />
                    <Text fontSize="xs" color="gray.400" mt={1}>
                        Not implemented yet — placeholder for future email notifications.
                    </Text>
                </Box>
            </Box>

            {/* Environment / Credentials */}
            <Box bg="white" p={5} borderRadius="lg" border="1px" borderColor="gray.200">
                <Text fontSize="sm" fontWeight="600" mb={3}>API Credentials</Text>
                <Text fontSize="xs" color="gray.500" mb={3}>
                    These are set via environment variables in <Text as="span" fontFamily="mono">server/.env</Text>.
                    Restart the server after changing them.
                </Text>
                <VStack align="stretch" spacing={2} fontSize="xs" fontFamily="mono" color="gray.700">
                    <CredRow name="ETSY_API_KEY" set={!!settings._etsyApiKey} />
                    <CredRow name="ETSY_ACCESS_TOKEN" set={!!settings._etsyAccessToken} />
                    <CredRow name="ETSY_SHOP_ID" set={!!settings._etsyShopId} />
                    <CredRow name="PRINTIFY_TOKEN" set={!!settings._printifyToken} />
                    <CredRow name="ADMIN_PASSWORD" set={true} label="(always required)" />
                    <CredRow name="JWT_SECRET" set={true} label="(auto-generated if not set)" />
                </VStack>
            </Box>

            <HStack>
                <Button size="sm" bg="gray.900" color="white" _hover={{ bg: 'gray.700' }}
                    onClick={handleSave} isLoading={saving}>
                    Save Settings
                </Button>
                {savedMsg && <Text fontSize="sm" color="green.500" fontWeight="600">{savedMsg}</Text>}
            </HStack>
        </VStack>
    );
};

const CredRow: React.FC<{ name: string; set: boolean; label?: string }> = ({ name, set, label }) => (
    <HStack justify="space-between" maxW="450px">
        <Text>{name}</Text>
        <HStack spacing={1}>
            {label && <Text color="gray.400" fontFamily="sans-serif" fontSize="xs">{label}</Text>}
            <Badge colorScheme={set ? 'green' : 'red'} fontSize="xs">
                {set ? 'set' : 'missing'}
            </Badge>
        </HStack>
    </HStack>
);

export default SettingsPage;
