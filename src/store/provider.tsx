'use client';

import { ReactNode, useEffect, useState } from 'react';
import { Provider } from 'react-redux';
import { store } from './store';
import { useAppDispatch } from './hooks';
import { checkAuth } from './slices/authSlice';

interface ReduxProviderProps {
    children: ReactNode;
}

function AuthInitializer({ children }: { children: ReactNode }) {
    const dispatch = useAppDispatch();
    const [isHydrated, setIsHydrated] = useState(false);

    useEffect(() => {
        setIsHydrated(true);
        // Always check auth on mount to ensure fresh state
        dispatch(checkAuth());
    }, [dispatch]);

    // Prevent hydration mismatch by only rendering children after hydration
    if (!isHydrated) {
        return <>{children}</>;
    }

    return <>{children}</>;
}

export function ReduxProvider({ children }: ReduxProviderProps) {
    return (
        <Provider store={store}>
            <AuthInitializer>{children}</AuthInitializer>
        </Provider>
    );
}
