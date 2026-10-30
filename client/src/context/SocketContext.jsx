import React, { createContext, useContext, useEffect, useState } from 'react';
import { io } from 'socket.io-client';
import { BACKEND_URL } from '../api.js';

const SocketContext = createContext(null);

export const useSocket = () => {
    const context = useContext(SocketContext);
    if (!context) {
        throw new Error('useSocket must be used within SocketProvider');
    }
    return context;
};

/**
 * Join socket rooms based on authenticated user.
 * Call this from a component that has access to AuthContext after login/refresh.
 */
export const joinSocketRooms = (socket, user) => {
    if (!socket || !user) return;
    if (user.isAdmin) socket.emit('join:admin');
    if (user._id) socket.emit('join:user', user._id);
};

export const SocketProvider = ({ children }) => {
    const [socket, setSocket] = useState(null);
    const [connected, setConnected] = useState(false);

    useEffect(() => {
        // Initialize Socket.IO connection (public — no auth needed to connect)
        const socketInstance = io(BACKEND_URL, {
            transports: ['websocket', 'polling'],
            reconnection: true,
            reconnectionDelay: 1000,
            reconnectionAttempts: 5
        });

        socketInstance.on('connect', () => {
            console.log('✅ Socket.IO connected:', socketInstance.id);
            setConnected(true);
            // NOTE: Room joining is done externally via joinSocketRooms()
            // after the auth state is known. Do NOT read localStorage here.
        });

        socketInstance.on('disconnect', () => {
            console.log('❌ Socket.IO disconnected');
            setConnected(false);
        });

        socketInstance.on('connect_error', (error) => {
            console.error('Socket.IO connection error:', error);
            setConnected(false);
        });

        setSocket(socketInstance);

        // Cleanup on unmount
        return () => {
            socketInstance.disconnect();
        };
    }, []);


    return (
        <SocketContext.Provider value={{ socket, connected }}>
            {children}
        </SocketContext.Provider>
    );
};

// Event listener hook
export const useSocketEvent = (eventName, callback) => {
    const { socket } = useSocket();

    useEffect(() => {
        if (!socket) return;

        socket.on(eventName, callback);

        return () => {
            socket.off(eventName, callback);
        };
    }, [socket, eventName, callback]);
};

// Socket event constants (must match backend)
export const SOCKET_EVENTS = {
    // Orders
    ORDER_CREATED: 'order:created',
    ORDER_UPDATED: 'order:updated',
    ORDER_STATUS_CHANGED: 'order:statusChanged',
    ORDER_CANCELLED: 'order:cancelled',

    // Reservations
    RESERVATION_CREATED: 'reservation:created',
    RESERVATION_UPDATED: 'reservation:updated',
    RESERVATION_STATUS_CHANGED: 'reservation:statusChanged',

    // Venue Bookings
    BOOKING_CREATED: 'booking:created',
    BOOKING_UPDATED: 'booking:updated',
    BOOKING_STATUS_CHANGED: 'booking:statusChanged',
    VENUE_SLOT_LOCKED: 'venue:locked',
    VENUE_SLOT_CONFIRMED: 'venue:confirmed',
    VENUE_SLOT_RELEASED: 'venue:released',

    // Stats
    STATS_UPDATED: 'stats:updated'
};
