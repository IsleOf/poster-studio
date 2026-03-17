import { useEffect, useState } from 'react';

/**
 * Debounce a value - delays updating the value until user stops changing it
 * Perfect for sliders to prevent excessive re-renders
 * @param value - The value to debounce
 * @param delay - Delay in milliseconds (default: 200ms)
 */
export function useDebounce<T>(value: T, delay: number = 200): T {
    const [debouncedValue, setDebouncedValue] = useState<T>(value);

    useEffect(() => {
        // Set up a timer to update the debounced value after the delay
        const timer = setTimeout(() => {
            setDebouncedValue(value);
        }, delay);

        // Clear the timer if value changes before delay expires
        return () => {
            clearTimeout(timer);
        };
    }, [value, delay]);

    return debouncedValue;
}
