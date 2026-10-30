import { Server } from 'socket.io';

let io;

export const initSocket = (server) => {
    io = new Server(server, {
        cors: {
            origin: "*",
            methods: ["GET", "POST"]
        }
    });

    io.on('connection', (socket) => {
        console.log('User connected:', socket.id);

        socket.on('join:admin', () => {
            socket.join('admin');
            console.log('Joined admin room');
        });

        socket.on('join:user', (userId) => {
            socket.join(`user:${userId}`);
            console.log(`Joined user room: user:${userId}`);
        });

        socket.on('disconnect', () => {
            console.log('User disconnected');
        });
    });

    return io;
};

export const getIO = () => {
    if (!io) {
        throw new Error('Socket.io not initialized!');
    }
    return io;
};

export const SOCKET_EVENTS = {
    ORDER_CREATED: 'order:created',
    ORDER_STATUS_CHANGED: 'order:statusChanged',
    ORDER_CANCELLED: 'order:cancelled',
    RESERVATION_CREATED: 'reservation:created',
    RESERVATION_CANCELLED: 'reservation:cancelled',
    TABLE_BOOKED: 'table:booked',
    TABLE_AVAILABLE: 'table:available',
    VENUE_SLOT_LOCKED: 'venue:locked',
    VENUE_SLOT_CONFIRMED: 'venue:confirmed',
    VENUE_SLOT_RELEASED: 'venue:released',
};
