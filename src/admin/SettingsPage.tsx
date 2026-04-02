import React, { useEffect, useState } from 'react';
import {
    Box, Heading, Text, VStack, HStack, Button, Switch, FormLabel,
    Input, Spinner, Divider, Badge, Alert, AlertIcon,
} from '@chakra-ui/react';
import { getSettings, updateSettings, getEmailStatus, testEmail } from './adminApi';

const SettingsPage: React.FC = () => {
    const [settings, setSettings] = useState<Record<string, any>>({});
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [savedMsg, setSavedMsg] = useState('');

    // Printify variant IDs (stored in settings table)
    const [printifyBlueprint, setPrintifyBlueprint] = useState('');
    const [printifyProvider, setPrintifyProvider] = useState('');
    const [printifyVariant8x10, setPrintifyVariant8x10] = useState('');
    const [printifyVariant11x14, setPrintifyVariant11x14] = useState('');
    const [printifyVariant18x24, setPrintifyVariant18x24] = useState('');
    const [printifyVariant24x36, setPrintifyVariant24x36] = useState('');

    // Email status
    const [emailStatus, setEmailStatus] = useState<{ enabled: boolean; configured: boolean; from: string | null; sellerEmail: string | null } | null>(null);
    const [testingEmail, setTestingEmail] = useState(false);
    const [emailTestMsg, setEmailTestMsg] = useState<{ ok: boolean; text: string } | null>(null);

    // Local editable state
    const [autoProcess, setAutoProcess] = useState(false);
    const [maxRevisions, setMaxRevisions] = useState('3');
    const [notifyEmail, setNotifyEmail] = useState('');

    useEffect(() => {
        Promise.all([
            getSettings().catch(() => ({})),
            getEmailStatus().catch(() => null),
        ]).then(([s, es]) => {
            setSettings(s ?? {});
            setAutoProcess(!!s?.auto_process_orders);
            setMaxRevisions(String(s?.max_revisions ?? 3));
            setNotifyEmail(s?.notify_email ?? '');
            setPrintifyBlueprint(String(s?.printify_blueprint_id ?? ''));
            setPrintifyProvider(String(s?.printify_provider_id ?? ''));
            setPrintifyVariant8x10(String(s?.['printify_variant_8x10'] ?? ''));
            setPrintifyVariant11x14(String(s?.['printify_variant_11x14'] ?? ''));
            setPrintifyVariant18x24(String(s?.['printify_variant_18x24'] ?? ''));
            setPrintifyVariant24x36(String(s?.['printify_variant_24x36'] ?? ''));
            setEmailStatus(es);
            setLoading(false);
        }).catch(() => setLoading(false));
    }, []);

    const handleSave = async () => {
        setSaving(true);
        await updateSettings({
            auto_process_orders: autoProcess,
            max_revisions: parseInt(maxRevisions) || 3,
            notify_email: notifyEmail.trim(),
            printify_blueprint_id: printifyBlueprint.trim(),
            printify_provider_id: printifyProvider.trim(),
            'printify_variant_8x10': printifyVariant8x10.trim(),
            'printify_variant_11x14': printifyVariant11x14.trim(),
            'printify_variant_18x24': printifyVariant18x24.trim(),
            'printify_variant_24x36': printifyVariant24x36.trim(),
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

            {/* Email Configuration */}
            <Box bg="white" p={5} borderRadius="lg" border="1px" borderColor="gray.200">
                <Text fontSize="sm" fontWeight="600" mb={3}>Email Notifications</Text>
                {emailStatus ? (
                    <VStack align="stretch" spacing={3}>
                        <HStack spacing={2} flexWrap="wrap">
                            <Badge colorScheme={emailStatus.enabled ? 'green' : 'gray'}>
                                {emailStatus.enabled ? 'Enabled' : 'Disabled (EMAIL_ENABLED not set)'}
                            </Badge>
                            <Badge colorScheme={emailStatus.configured ? 'green' : 'orange'}>
                                {emailStatus.configured ? 'SMTP configured' : 'SMTP not configured'}
                            </Badge>
                        </HStack>
                        {emailStatus.from && (
                            <Text fontSize="xs" color="gray.600">From: <Text as="span" fontFamily="mono">{emailStatus.from}</Text></Text>
                        )}
                        {emailStatus.sellerEmail && (
                            <Text fontSize="xs" color="gray.600">Digest to: <Text as="span" fontFamily="mono">{emailStatus.sellerEmail}</Text></Text>
                        )}
                        {!emailStatus.enabled && (
                            <Text fontSize="xs" color="gray.400">
                                Set <Text as="span" fontFamily="mono">EMAIL_ENABLED=true</Text> and SMTP vars in <Text as="span" fontFamily="mono">server/.env</Text> to activate.
                            </Text>
                        )}
                        <HStack>
                            <Button
                                size="sm" variant="outline"
                                isLoading={testingEmail}
                                isDisabled={!emailStatus.enabled || !emailStatus.configured}
                                onClick={async () => {
                                    setTestingEmail(true);
                                    setEmailTestMsg(null);
                                    try {
                                        await testEmail();
                                        setEmailTestMsg({ ok: true, text: 'Test digest sent — check your inbox.' });
                                    } catch (err: any) {
                                        setEmailTestMsg({ ok: false, text: err.message });
                                    } finally {
                                        setTestingEmail(false);
                                    }
                                }}
                            >
                                Send Test Email
                            </Button>
                        </HStack>
                        {emailTestMsg && (
                            <Alert status={emailTestMsg.ok ? 'success' : 'error'} fontSize="sm" py={2} borderRadius="md">
                                <AlertIcon />
                                {emailTestMsg.text}
                            </Alert>
                        )}
                    </VStack>
                ) : (
                    <Text fontSize="xs" color="gray.400">Loading email status…</Text>
                )}
            </Box>

            {/* Printify Variant Mapping */}
            <Box bg="white" p={5} borderRadius="lg" border="1px" borderColor="gray.200">
                <Text fontSize="sm" fontWeight="600" mb={1}>Printify Variant Mapping</Text>
                <Text fontSize="xs" color="gray.500" mb={3}>
                    Map print sizes to Printify variant IDs. Find these via Printify's catalog API or dashboard.
                    Webhook URL: <Text as="span" fontFamily="mono">{window.location.origin}/api/webhooks/printify</Text>
                </Text>
                <VStack align="stretch" spacing={2}>
                    <HStack justify="space-between">
                        <Text fontSize="xs" color="gray.600" w="120px">Blueprint ID</Text>
                        <Input size="xs" value={printifyBlueprint} onChange={e => setPrintifyBlueprint(e.target.value)} placeholder="e.g. 5" maxW="140px" fontFamily="mono" />
                    </HStack>
                    <HStack justify="space-between">
                        <Text fontSize="xs" color="gray.600" w="120px">Provider ID</Text>
                        <Input size="xs" value={printifyProvider} onChange={e => setPrintifyProvider(e.target.value)} placeholder="e.g. 1" maxW="140px" fontFamily="mono" />
                    </HStack>
                    <Divider />
                    {[
                        ['8×10"', printifyVariant8x10, setPrintifyVariant8x10],
                        ['11×14"', printifyVariant11x14, setPrintifyVariant11x14],
                        ['18×24"', printifyVariant18x24, setPrintifyVariant18x24],
                        ['24×36"', printifyVariant24x36, setPrintifyVariant24x36],
                    ].map(([label, val, setter]) => (
                        <HStack key={label as string} justify="space-between">
                            <Text fontSize="xs" color="gray.600" w="120px">{label as string} variant</Text>
                            <Input size="xs" value={val as string} onChange={e => (setter as (v: string) => void)(e.target.value)} placeholder="variant ID" maxW="140px" fontFamily="mono" />
                        </HStack>
                    ))}
                </VStack>
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
                    <CredRow name="PRINTIFY_WEBHOOK_SECRET" set={!!settings._printifyWebhookSecret} label="(optional — signs webhook requests)" />
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
