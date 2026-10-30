// Script to add credentials: 'include' to all protected user API endpoints
// This will be applied to d:\vincentapp\client\src\api.js

// Pattern: Add credentials: 'include' to all fetch calls that use getAuthHeaders()
// (excluding admin endpoints which still use Authorization header)

const userProtectedEndpoints = [
    'getUserProfile',
    'updateUserProfile',
    'uploadProfilePicture',
    'requestUpdateOTP',
    'verifyUpdateOTP',
    'addAddress',
    'updateAddress',
    'deleteAddress',
    'fetchMyOrders',
    'fetchMyReservations',
    'fetchMyVenueBookings',
    // Add other protected endpoints as needed
];

// Note: These endpoints should be manually updated to include:
// credentials: 'include' in the fetch options

console.log('Endpoints to update:', userProtectedEndpoints);
