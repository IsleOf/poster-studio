import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    Box, VStack, Input, Button, Text, Heading,
} from '@chakra-ui/react';
import { login, isAuthenticated } from './adminApi';

const AdminLogin: React.FC = () => {
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();

    // If already logged in, redirect
    React.useEffect(() => {
        if (isAuthenticated()) navigate('/admin/dashboard');
    }, [navigate]);

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setLoading(true);
        try {
            await login(password);
            navigate('/admin/dashboard');
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Login failed');
        } finally {
            setLoading(false);
        }
    };

    return (
        <Box minH="100vh" display="flex" alignItems="center" justifyContent="center" bg="gray.50">
            <Box bg="white" p={8} borderRadius="lg" boxShadow="lg" w="400px" maxW="90vw">
                <form onSubmit={handleLogin}>
                    <VStack spacing={4} align="stretch">
                        <Heading size="md" textAlign="center" color="gray.800">
                            The Mapped Moment
                        </Heading>
                        <Text fontSize="sm" color="gray.500" textAlign="center">
                            Seller Dashboard
                        </Text>
                        <Input
                            type="password"
                            placeholder="Admin password"
                            value={password}
                            onChange={e => setPassword(e.target.value)}
                            autoFocus
                            size="lg"
                        />
                        {error && (
                            <Text fontSize="sm" color="red.500" textAlign="center">{error}</Text>
                        )}
                        <Button
                            type="submit"
                            bg="gray.900"
                            color="white"
                            _hover={{ bg: 'gray.700' }}
                            isLoading={loading}
                            size="lg"
                        >
                            Sign In
                        </Button>
                    </VStack>
                </form>
            </Box>
        </Box>
    );
};

export default AdminLogin;
