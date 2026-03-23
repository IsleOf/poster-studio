import React from 'react';
import { Routes, Route, NavLink, useNavigate, Navigate } from 'react-router-dom';
import { Box, Flex, VStack, Text, Button } from '@chakra-ui/react';
import { isAuthenticated, clearToken } from './adminApi';
import AdminLogin from './AdminLogin';
import DashboardPage from './DashboardPage';
import OrdersPage from './OrdersPage';
import OrderDetailPage from './OrderDetailPage';
import TemplatesPage from './TemplatesPage';
import TemplateEditorPage from './TemplateEditorPage';
import EtsyPage from './EtsyPage';
import AssetsPage from './AssetsPage';
import SettingsPage from './SettingsPage';

const NAV_ITEMS = [
    { path: '/admin/dashboard', label: 'Dashboard' },
    { path: '/admin/orders', label: 'Orders' },
    { path: '/admin/templates', label: 'Templates' },
    { path: '/admin/etsy', label: 'Etsy' },
    { path: '/admin/assets', label: 'Assets' },
    { path: '/admin/settings', label: 'Settings' },
];

const NavItem: React.FC<{ path: string; label: string }> = ({ path, label }) => (
    <NavLink to={path} style={{ width: '100%' }}>
        {({ isActive }) => (
            <Box
                px={4} py={2} borderRadius="md" w="100%"
                bg={isActive ? 'gray.100' : 'transparent'}
                color={isActive ? 'gray.900' : 'gray.600'}
                fontWeight={isActive ? '600' : '400'}
                fontSize="sm"
                _hover={{ bg: 'gray.50' }}
                transition="all 0.1s"
            >
                {label}
            </Box>
        )}
    </NavLink>
);

const AdminLayout: React.FC = () => {
    const navigate = useNavigate();

    if (!isAuthenticated()) {
        return <AdminLogin />;
    }

    const handleLogout = () => {
        clearToken();
        navigate('/admin/login');
    };

    return (
        <Flex h="100vh" overflow="hidden">
            {/* Sidebar */}
            <Box w="220px" bg="white" borderRight="1px" borderColor="gray.200" py={4} display="flex" flexDirection="column">
                <Box px={4} mb={6}>
                    <Text fontWeight="700" fontSize="sm" color="gray.900">The Mapped Moment</Text>
                    <Text fontSize="xs" color="gray.500">Seller Dashboard</Text>
                </Box>
                <VStack spacing={0.5} px={2} flex={1} align="stretch">
                    {NAV_ITEMS.map(item => (
                        <NavItem key={item.path} {...item} />
                    ))}
                </VStack>
                <Box px={4} pt={4} borderTop="1px" borderColor="gray.100">
                    <Button size="xs" variant="ghost" color="gray.500" onClick={handleLogout} w="100%">
                        Logout
                    </Button>
                </Box>
            </Box>

            {/* Content */}
            <Box flex={1} bg="gray.50" overflowY="auto" p={6}>
                <Routes>
                    <Route index element={<Navigate to="/admin/dashboard" replace />} />
                    <Route path="login" element={<AdminLogin />} />
                    <Route path="dashboard" element={<DashboardPage />} />
                    <Route path="orders" element={<OrdersPage />} />
                    <Route path="orders/:id" element={<OrderDetailPage />} />
                    <Route path="templates" element={<TemplatesPage />} />
                    <Route path="templates/:id/edit" element={<TemplateEditorPage />} />
                    <Route path="templates/new" element={<TemplateEditorPage />} />
                    <Route path="etsy" element={<EtsyPage />} />
                    <Route path="assets" element={<AssetsPage />} />
                    <Route path="settings" element={<SettingsPage />} />
                </Routes>
            </Box>
        </Flex>
    );
};

export default AdminLayout;
