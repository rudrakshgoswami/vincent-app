const getBaseUrl = () => {
    if (import.meta.env.VITE_BACKEND_URL) return import.meta.env.VITE_BACKEND_URL;
    const hostname = window.location.hostname;
    // If accessing from phone (IP), use that IP for backend too
    if (hostname !== 'localhost' && hostname !== '127.0.0.1') {
        return `http://${hostname}:5000`;
    }
    return 'http://localhost:5000';
};

export const BACKEND_URL = getBaseUrl();
const API_URL = `${BACKEND_URL}/api`;

export const getImageUrl = (url) => {
    if (!url) return '';
    if (url.startsWith('http') || url.startsWith('data:')) return url;
    return `${BACKEND_URL}${url.startsWith('/') ? '' : '/'}${url}`;
};

// ============================================================
// AUTH FETCH â€” Central API gateway
// ============================================================
// All API calls go through authFetch() which:
//   1. Injects  Authorization: Bearer <accessToken>  header
//   2. On 401 TOKEN_EXPIRED â†’ silently refreshes token â†’ retries
//   3. On 401 REFRESH_EXPIRED â†’ clears state (user must re-login)
//
// The access token is read from AuthContext (in-memory, per-tab).
// It is NEVER read from localStorage â€” that would break tab isolation.
//
// How to get the auth context here (outside React):
//   We store a reference set by AuthProvider on mount.
// ============================================================

let _getAccessToken = null;   // () => Promise<string|null>
let _silentRefresh = null;    // () => Promise<string|null>

/**
 * Called once by AuthProvider on mount to wire up token access.
 * This lets api.js use the auth context without being a React component.
 */
export const initApiAuth = (getAccessToken, silentRefresh) => {
    _getAccessToken = getAccessToken;
    _silentRefresh = silentRefresh;
};

/**
 * Authenticated fetch â€” use this for ALL protected API calls.
 * Automatically adds the Bearer token and handles expiry.
 */
const authFetch = async (url, options = {}) => {
    // Get current access token from memory
    const token = _getAccessToken ? await _getAccessToken() : null;

    const headers = {
        ...options.headers,
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
    };

    let res = await fetch(url, { ...options, headers, credentials: 'include' });

    // If token expired, try once to refresh and retry
    if (res.status === 401) {
        let body;
        try { body = await res.clone().json(); } catch { body = {}; }

        if (body.code === 'TOKEN_EXPIRED' && _silentRefresh) {
            const newToken = await _silentRefresh();
            if (newToken) {
                // Retry with new token
                res = await fetch(url, {
                    ...options,
                    headers: { ...options.headers, Authorization: `Bearer ${newToken}` },
                    credentials: 'include'
                });
            }
        }
    }

    return res;
};

const handleResponse = async (response) => {
    let data;
    try {
        data = await response.json();
    } catch (e) {
        throw new Error(`Request failed with status ${response.status}`);
    }

    if (!response.ok) {
        const err = new Error(data.message || `Request failed with status ${response.status}`);
        err.code = data.code;
        err.status = response.status;
        throw err;
    }

    return data;
};


// ==========================================
// AUTHENTICATION APIs (mostly public â€” no Bearer needed)
// ==========================================

export const uploadFile = async (file) => {
    const formData = new FormData();
    formData.append('image', file);
    const res = await authFetch(`${API_URL}/upload`, { method: 'POST', body: formData });
    return handleResponse(res);
};

export const registerUser = async (userData) => {
    const res = await fetch(`${API_URL}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(userData)
    });
    return handleResponse(res);
};

export const verifyOTP = async (data) => {
    const res = await fetch(`${API_URL}/auth/verify-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(data)
    });
    return handleResponse(res);
};

export const resendOTP = async (data) => {
    const res = await fetch(`${API_URL}/auth/resend-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(data)
    });
    return handleResponse(res);
};

export const loginUser = async (emailOrPhone, password) => {
    // Determine if email or phone
    const isEmail = emailOrPhone.includes('@');
    const payload = isEmail ? { email: emailOrPhone, password } : { phone: emailOrPhone, password };

    const res = await fetch(`${API_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(payload)
    });
    return handleResponse(res);
};

export const forgotPassword = async (phone) => {
    const res = await fetch(`${API_URL}/auth/forgot-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone })
    });
    return handleResponse(res);
};

export const resetPassword = async (data) => {
    const res = await fetch(`${API_URL}/auth/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
    });
    return handleResponse(res);
};

export const adminLogin = async (username, password) => {
    const payload = { email: username, password };
    const res = await fetch(`${API_URL}/auth/login`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
    });
    return handleResponse(res);
};

export const initiateRegistration = registerUser; // Backward compatibility

export const getCurrentUser = async () => {
    const res = await authFetch(`${API_URL}/auth/me`);
    return handleResponse(res);
};

export const getCurrentAdmin = async () => {
    const res = await authFetch(`${API_URL}/auth/profile`);
    return handleResponse(res);
};

// ==========================================
// ADMIN USER MANAGEMENT APIs
// ==========================================

export const getAllUsers = async (filters = {}) => {
    const params = new URLSearchParams();
    Object.keys(filters).forEach(key => {
        if (filters[key] !== '' && filters[key] !== null && filters[key] !== undefined) {
            params.append(key, filters[key]);
        }
    });
    const res = await authFetch(`${API_URL}/admin/users?${params}`);
    return handleResponse(res);
};

export const getUserById = async (userId) => {
    const res = await authFetch(`${API_URL}/admin/users/${userId}`);
    return handleResponse(res);
};

export const toggleUserActive = async (userId, reason) => {
    const res = await authFetch(`${API_URL}/admin/users/${userId}/toggle-active`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason })
    });
    return handleResponse(res);
};

export const getUserActivity = async (userId) => {
    const res = await authFetch(`${API_URL}/admin/users/${userId}/activity`);
    return handleResponse(res);
};

export const deleteUser = async (userId) => {
    const res = await authFetch(`${API_URL}/admin/users/${userId}`, { method: 'DELETE' });
    return handleResponse(res);
};

export const getUserStats = async () => {
    const res = await authFetch(`${API_URL}/admin/users/stats`);
    return handleResponse(res);
};

// ==========================================
// USER PROFILE APIs
// ==========================================

export const getUserProfile = async () => {
    const res = await authFetch(`${API_URL}/auth/profile`);
    return handleResponse(res);
};

export const updateUserProfile = async (profileData) => {
    const res = await authFetch(`${API_URL}/profile`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(profileData)
    });
    return handleResponse(res);
};

export const uploadProfilePicture = async (file) => {
    const formData = new FormData();
    formData.append('image', file);
    const res = await authFetch(`${API_URL}/upload/profile-picture`, { method: 'POST', body: formData });
    return handleResponse(res);
};

export const requestUpdateOTP = async (type, value) => {
    const res = await authFetch(`${API_URL}/request-update-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type, value })
    });
    return handleResponse(res);
};

export const verifyUpdateOTP = async (type, value, otp) => {
    const res = await authFetch(`${API_URL}/verify-update-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type, value, otp })
    });
    return handleResponse(res);
};

export const addAddress = async (addressData) => {
    const res = await authFetch(`${API_URL}/user/addresses`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(addressData)
    });
    return handleResponse(res);
};

export const updateAddress = async (index, addressData) => {
    const res = await authFetch(`${API_URL}/user/addresses/${index}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(addressData)
    });
    return handleResponse(res);
};

export const deleteAddress = async (index) => {
    const res = await authFetch(`${API_URL}/user/addresses/${index}`, { method: 'DELETE' });
    return handleResponse(res);
};

// ==========================================
// MENU APIs (Public)
// ==========================================

export const fetchCategories = async () => {
    const res = await fetch(`${API_URL}/menu/categories`);
    return handleResponse(res);
};

export const fetchMenuItems = async (filters = {}) => {
    const params = new URLSearchParams(filters);
    const res = await fetch(`${API_URL}/menu/items?${params}`);
    return handleResponse(res);
};

export const fetchMenuItem = async (id) => {
    const res = await fetch(`${API_URL}/menu/items/${id}`);
    return handleResponse(res);
};

// ==========================================
// ORDER APIs (User)
// ==========================================

export const createOrder = async (orderData) => {
    const res = await authFetch(`${API_URL}/orders`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(orderData)
    });
    return handleResponse(res);
};

export const fetchMyOrders = async (filters = {}) => {
    const params = new URLSearchParams(filters);
    const res = await authFetch(`${API_URL}/orders/my-orders?${params}`);
    return handleResponse(res);
};

export const fetchOrder = async (id) => {
    const res = await authFetch(`${API_URL}/orders/${id}`);
    return handleResponse(res);
};

export const reorder = async (orderId) => {
    const res = await authFetch(`${API_URL}/orders/${orderId}/reorder`, { method: 'POST' });
    return handleResponse(res);
};

// ==========================================
// PAYMENT APIs (Razorpay) - âœ… NEW
// ==========================================

// Stands in for Razorpay checkout while the server has no credentials.
export const createDemoPayment = async (orderId) => {
    const res = await authFetch(`${API_URL}/payment/demo-pay`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderId }),
    });
    return handleResponse(res);
};

export const getRazorpayKey = async () => {
    const res = await fetch(`${API_URL}/payment/key`);
    return handleResponse(res);
};

export const createRazorpayOrder = async (amount, currency = 'INR') => {
    const res = await authFetch(`${API_URL}/payment/create-order`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount, currency })
    });
    const parsed = await handleResponse(res);
    console.log('[DEBUG createRazorpayOrder]', parsed);
    return parsed;
};

export const verifyPayment = async (paymentData) => {
    const res = await authFetch(`${API_URL}/payment/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(paymentData)
    });
    return handleResponse(res);
};

// ==========================================
// VENUE APIs (Public/User)
// ==========================================

export const fetchVenues = async (filters = {}) => {
    const params = new URLSearchParams(filters);
    const res = await fetch(`${API_URL}/venues?${params}`);
    return handleResponse(res);
};

export const fetchVenue = async (id) => {
    const res = await fetch(`${API_URL}/venues/${id}`);
    return handleResponse(res);
};

export const checkVenueAvailability = async (venueId, date) => {
    const res = await fetch(`${API_URL}/venues/check-availability`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ venueId, date })
    });
    return handleResponse(res);
};

export const fetchMonthlyAvailability = async (venueId, month) => {
    const res = await fetch(`${API_URL}/venues/${venueId}/monthly-availability?month=${month}`);
    return handleResponse(res);
};

export const fetchMyVenueBookings = async () => {
    const res = await authFetch(`${API_URL}/venue-bookings/my`);
    return handleResponse(res);
};

export const fetchVenueBookingById = async (id) => {
    const res = await authFetch(`${API_URL}/venue-bookings/${id}`);
    return handleResponse(res);
};

export const fetchVenueBookingInvoice = async (id) => {
    const res = await authFetch(`${API_URL}/venue-bookings/${id}/invoice`);
    if (!res.ok) throw new Error('Failed to fetch invoice');
    return await res.text();
};

export const cancelVenueBooking = async (id, cancellationReason) => {
    const res = await authFetch(`${API_URL}/venue-bookings/${id}/cancel`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ cancellationReason })
    });
    return handleResponse(res);
};

export const extendVenueBookingLock = async (id) => {
    const res = await authFetch(`${API_URL}/venue-bookings/${id}/extend-lock`, { method: 'PUT' });
    return handleResponse(res);
};

export const submitVenueReview = async (bookingId, reviewData) => {
    const res = await authFetch(`${API_URL}/venue-bookings/${bookingId}/review`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(reviewData)
    });
    return handleResponse(res);
};

// --- REAL WORLD REVIEWS (Global) ---
export const fetchVenueReviews = async (venueId) => {
    const res = await fetch(`${API_URL}/reviews/venue/${venueId}`);
    return handleResponse(res);
};

export const submitReview = async (reviewData) => {
    const res = await authFetch(`${API_URL}/reviews`, {
        method: 'POST', 
        headers: { 'Content-Type': 'application/json' }, 
        body: JSON.stringify(reviewData)
    });
    return handleResponse(res);
};

export const fetchAllReviewsAdmin = async () => {
    const res = await authFetch(`${API_URL}/reviews/admin`);
    return handleResponse(res);
};

export const updateReviewAdmin = async (id, data) => {
    const res = await authFetch(`${API_URL}/reviews/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
    });
    return handleResponse(res);
};

export const deleteReviewAdmin = async (id) => {
    const res = await authFetch(`${API_URL}/reviews/${id}`, { method: 'DELETE' });

    return handleResponse(res);
};


// ==========================================
// VENUE BOOKING PAYMENT APIs (Razorpay)
// ==========================================

export const createVenueBookingOrder = async (bookingPayload) => {
    const res = await authFetch(`${API_URL}/venue-bookings/create-order`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(bookingPayload)
    });
    return handleResponse(res);
};

export const verifyVenueBookingPayment = async ({ bookingId, razorpayOrderId, razorpayPaymentId, razorpaySignature }) => {
    const res = await authFetch(`${API_URL}/venue-bookings/verify-payment`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bookingId, razorpayOrderId, razorpayPaymentId, razorpaySignature })
    });
    return handleResponse(res);
};

export const createCateringBookingOrder = async (payload) => {
    const res = await authFetch(`${API_URL}/catering-bookings/create-order`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
    });
    return handleResponse(res);
};

export const verifyCateringBookingPayment = async (data) => {
    const res = await authFetch(`${API_URL}/catering-bookings/verify-payment`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
    });
    return handleResponse(res);
};




// ==========================================
// CATERING APIs (Public)
// ==========================================

export const fetchCateringPackages = async () => {
    const res = await fetch(`${API_URL}/catering/packages`);
    return handleResponse(res);
};

export const fetchCateringPackageById = async (id) => {
    const res = await fetch(`${API_URL}/catering/packages/${id}`);
    return handleResponse(res);
};

export const fetchCateringExtras = async () => {
    const res = await fetch(`${API_URL}/catering/extras`);
    return handleResponse(res);
};



// ==========================================
// ADMIN - CATERING MANAGEMENT APIs
// ==========================================

export const fetchAllCateringPackagesAdmin = async () => {
    const res = await authFetch(`${API_URL}/catering/packages`);
    return handleResponse(res);
};

export const createCateringPackage = async (data) => {
    const res = await authFetch(`${API_URL}/catering/packages`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data)
    });
    return handleResponse(res);
};

export const updateCateringPackage = async (id, data) => {
    const res = await authFetch(`${API_URL}/catering/packages/${id}`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data)
    });
    return handleResponse(res);
};

export const deleteCateringPackage = async (id) => {
    const res = await authFetch(`${API_URL}/catering/packages/${id}`, { method: 'DELETE' });
    return handleResponse(res);
};

export const fetchAllCateringExtrasAdmin = async () => {
    const res = await authFetch(`${API_URL}/catering/extras`);
    return handleResponse(res);
};

export const createCateringExtra = async (data) => {
    const res = await authFetch(`${API_URL}/catering/extras`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data)
    });
    return handleResponse(res);
};

export const updateCateringExtra = async (id, data) => {
    const res = await authFetch(`${API_URL}/catering/extras/${id}`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data)
    });
    return handleResponse(res);
};

export const deleteCateringExtra = async (id) => {
    const res = await authFetch(`${API_URL}/catering/extras/${id}`, { method: 'DELETE' });
    return handleResponse(res);
};

// --- NEW CATERING OPERATIONS ---
export const fetchCateringCategories = async () => {
    const res = await fetch(`${API_URL}/catering/categories`);
    return handleResponse(res);
};
export const createCateringCategory = async (data) => {
    const res = await authFetch(`${API_URL}/catering/categories`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data)
    });
    return handleResponse(res);
};
export const updateCateringCategory = async (id, data) => {
    const res = await authFetch(`${API_URL}/catering/categories/${id}`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data)
    });
    return handleResponse(res);
};
export const deleteCateringCategory = async (id) => {
    const res = await authFetch(`${API_URL}/catering/categories/${id}`, { method: 'DELETE' });
    return handleResponse(res);
};

export const fetchCateringFoodItems = async (packageId = '') => {
    const res = await fetch(`${API_URL}/catering/items${packageId ? '?packageId=' + packageId : ''}`);
    return handleResponse(res);
};
export const createCateringFoodItem = async (data) => {
    const res = await authFetch(`${API_URL}/catering/items`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data)
    });
    return handleResponse(res);
};
export const updateCateringFoodItem = async (id, data) => {
    const res = await authFetch(`${API_URL}/catering/items/${id}`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data)
    });
    return handleResponse(res);
};
export const deleteCateringFoodItem = async (id) => {
    const res = await authFetch(`${API_URL}/catering/items/${id}`, { method: 'DELETE' });
    return handleResponse(res);
};

export const fetchCateringLiveCounters = async () => {
    const res = await fetch(`${API_URL}/catering/live-counters`);
    return handleResponse(res);
};
export const createCateringLiveCounter = async (data) => {
    const res = await authFetch(`${API_URL}/catering/live-counters`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data)
    });
    return handleResponse(res);
};
export const updateCateringLiveCounter = async (id, data) => {
    const res = await authFetch(`${API_URL}/catering/live-counters/${id}`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data)
    });
    return handleResponse(res);
};
export const deleteCateringLiveCounter = async (id) => {
    const res = await authFetch(`${API_URL}/catering/live-counters/${id}`, { method: 'DELETE' });
    return handleResponse(res);
};


// TABLE RESERVATION APIs (User)
// ==========================================

export const checkReservationAvailability = async (date, time) => {
    // Using layout endpoint for availability check in new system
    const res = await fetch(`${API_URL}/tables/layout?date=${date}&timeSlot=${time}`);
    return handleResponse(res);
};

export const fetchTableLayout = async (date, timeSlot, guestCount) => {
    const params = new URLSearchParams({ date, timeSlot });
    if (guestCount) params.append('guestCount', guestCount);
    const res = await fetch(`${API_URL}/tables/layout?${params}`);
    return handleResponse(res);
};

export const verifyReservationPayment = async (paymentData) => {
    const res = await authFetch(`${API_URL}/table-reservations/verify-payment`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(paymentData)
    });
    return handleResponse(res);
};

export const createReservation = async (reservationData) => {
    const res = await authFetch(`${API_URL}/table-reservations/create-order`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(reservationData)
    });
    return handleResponse(res);
};

export const fetchMyReservations = async (filters = {}) => {
    const params = new URLSearchParams(filters);
    const res = await authFetch(`${API_URL}/table-reservations/my?${params}`);
    return handleResponse(res);
};

export const cancelReservation = async (id, cancellationReason) => {
    const res = await authFetch(`${API_URL}/table-reservations/${id}/cancel`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cancellationReason })
    });
    return handleResponse(res);
};

export const releaseReservationLock = async (id) => {
    const res = await authFetch(`${API_URL}/table-reservations/${id}/release`, { method: 'PUT' });
    return handleResponse(res);
};

// ==========================================
// ADMIN - MENU MANAGEMENT APIs
// ==========================================

export const fetchAllCategoriesAdmin = async () => {
    const res = await authFetch(`${API_URL}/menu/admin/categories`);
    return handleResponse(res);
};

export const createCategory = async (categoryData) => {
    const res = await authFetch(`${API_URL}/menu/admin/categories`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(categoryData)
    });
    return handleResponse(res);
};

export const updateCategory = async (id, categoryData) => {
    const res = await authFetch(`${API_URL}/menu/admin/categories/${id}`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(categoryData)
    });
    return handleResponse(res);
};

export const deleteCategory = async (id) => {
    const res = await authFetch(`${API_URL}/menu/admin/categories/${id}`, { method: 'DELETE' });
    return handleResponse(res);
};

export const fetchAllMenuItemsAdmin = async () => {
    const res = await authFetch(`${API_URL}/menu/admin/items`);
    return handleResponse(res);
};

export const createMenuItem = async (itemData) => {
    const res = await authFetch(`${API_URL}/menu/admin/items`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(itemData)
    });
    return handleResponse(res);
};

export const updateMenuItem = async (id, itemData) => {
    const res = await authFetch(`${API_URL}/menu/admin/items/${id}`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(itemData)
    });
    return handleResponse(res);
};

export const deleteMenuItem = async (id) => {
    const res = await authFetch(`${API_URL}/menu/admin/items/${id}`, { method: 'DELETE' });
    return handleResponse(res);
};

// ==========================================
// ADMIN - ORDER MANAGEMENT APIs
// ==========================================

export const fetchAllOrders = async (filters = {}) => {
    const params = new URLSearchParams(filters);
    const res = await authFetch(`${API_URL}/orders/admin/all?${params}`);
    return handleResponse(res);
};

export const updateOrderStatus = async (id, status, cancellationReason = null) => {
    const res = await authFetch(`${API_URL}/orders/admin/${id}/status`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status, cancellationReason })
    });
    return handleResponse(res);
};

export const fetchOrderStats = async () => {
    const res = await authFetch(`${API_URL}/orders/admin/stats/overview`);
    return handleResponse(res);
};

// ==========================================
// ADMIN - RESERVATION MANAGEMENT APIs
// ==========================================

export const fetchAllReservations = async (filters = {}) => {
    const params = new URLSearchParams(filters);
    const res = await authFetch(`${API_URL}/table-reservations/admin/all?${params}`);
    return handleResponse(res);
};

export const updateReservationStatus = async (id, status, tableNumber = null, cancellationReason = null) => {
    const res = await authFetch(`${API_URL}/table-reservations/admin/${id}/status`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status, cancellationReason, adminNotes: tableNumber ? `Assigned Table: ${tableNumber}` : null })
    });
    return handleResponse(res);
};

export const fetchReservationStats = async () => {
    const res = await authFetch(`${API_URL}/table-reservations/admin/stats`);
    return handleResponse(res);
};

// ==========================================
// ADMIN - TABLE MANAGEMENT APIs
// ==========================================

export const fetchAllTablesAdmin = async (filters = {}) => {
    const params = new URLSearchParams(filters);
    const res = await authFetch(`${API_URL}/tables?${params}`);
    return handleResponse(res);
};

export const createTable = async (tableData) => {
    const res = await authFetch(`${API_URL}/tables/admin/create`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(tableData)
    });
    return handleResponse(res);
};

export const updateTable = async (id, tableData) => {
    const res = await authFetch(`${API_URL}/tables/admin/${id}`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(tableData)
    });
    return handleResponse(res);
};

export const deleteTable = async (id) => {
    const res = await authFetch(`${API_URL}/tables/admin/${id}`, { method: 'DELETE' });
    return handleResponse(res);
};

export const toggleBlockTable = async (id, isBlocked, reason = '') => {
    const res = await authFetch(`${API_URL}/tables/admin/${id}/block`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ isBlocked, reason })
    });
    return handleResponse(res);
};

export const getTableLayout = async () => {
    const res = await fetch(`${API_URL}/tables/layout`);
    return handleResponse(res);
};

// ==========================================
// ADMIN - VENUE MANAGEMENT APIs
// ==========================================

export const fetchAllVenuesAdmin = async () => {
    const res = await authFetch(`${API_URL}/venues/admin/all`);
    return handleResponse(res);
};

export const createVenue = async (venueData) => {
    const res = await authFetch(`${API_URL}/venues/admin/create`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(venueData)
    });
    return handleResponse(res);
};

export const updateVenue = async (id, venueData) => {
    const res = await authFetch(`${API_URL}/venues/admin/${id}`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(venueData)
    });
    return handleResponse(res);
};

export const deleteVenue = async (id) => {
    const res = await authFetch(`${API_URL}/venues/admin/${id}`, { method: 'DELETE' });
    return handleResponse(res);
};

export const addVenueMedia = async (venueId, type, url, thumbnailUrl = null) => {
    const res = await authFetch(`${API_URL}/venues/admin/${venueId}/media`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type, url, thumbnailUrl })
    });
    return handleResponse(res);
};

export const deleteVenueMedia = async (venueId, mediaId) => {
    const res = await authFetch(`${API_URL}/venues/admin/${venueId}/media/${mediaId}`, { method: 'DELETE' });
    return handleResponse(res);
};

export const blockVenueDates = async (venueId, dates) => {
    const res = await authFetch(`${API_URL}/venues/admin/${venueId}/block-dates`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ dates })
    });
    return handleResponse(res);
};

export const fetchAllVenueBookings = async (filters = {}) => {
    const params = new URLSearchParams(filters);
    const res = await authFetch(`${API_URL}/venue-bookings/admin/all?${params}`);
    return handleResponse(res);
};

export const updateVenueBookingStatus = async (id, status, cancellationReason = null) => {
    const res = await authFetch(`${API_URL}/venue-bookings/admin/${id}/status`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status, cancellationReason })
    });
    return handleResponse(res);
};

export const fetchVenueBookingStats = async () => {
    const res = await authFetch(`${API_URL}/venue-bookings/admin/stats`);
    return handleResponse(res);
};

export const recordVenueBalancePayment = async (bookingId, paymentData) => {
    const res = await authFetch(`${API_URL}/venue-bookings/admin/${bookingId}/record-payment`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(paymentData)
    });
    return handleResponse(res);
};




// ==========================================
// BACKWARD COMPATIBILITY - Old Function Names
// ==========================================
// These aliases support existing page components
// Returns data in old format (arrays) instead of new API response format

export const fetchMenu = async () => {
    try {
        // Fetch both categories and items
        const categoriesRes = await fetchCategories();
        const itemsRes = await fetchMenuItems();

        // Group items by category (old format expected by pages)
        const categories = categoriesRes.data.categories.map(cat => {
            const categoryItems = itemsRes.data.items.filter(item =>
                item.category._id === cat._id || item.category === cat._id
            );
            return {
                id: cat._id,
                name: cat.name,
                description: cat.description,
                Items: categoryItems.map(item => ({
                    id: item._id,
                    name: item.name,
                    description: item.description,
                    price: item.price,
                    image: item.image,
                    isVeg: item.isVeg || item.type === 'veg',
                    type: item.type || (item.isVeg ? 'veg' : 'non-veg')
                }))
            };
        });

        return categories;
    } catch (error) {
        console.error('fetchMenu error:', error);
        return [];
    }
};

export const fetchResources = async () => {
    try {
        // Fetch both banquet and lawn venues
        const venuesRes = await fetchVenues();

        // Return in old format
        return venuesRes.data.venues.map(venue => ({
            id: venue._id,
            name: venue.name,
            type: venue.type,
            description: venue.description,
            capacity: venue.capacity,
            price: venue.pricePerDay,
            image: venue.images[0] || '',
            images: venue.images,
            amenities: venue.amenities || []
        }));
    } catch (error) {
        console.error('fetchResources error:', error);
        return [];
    }
};

export const fetchBookings = async () => {
    try {
        const res = await fetchMyVenueBookings();
        return res.data.bookings || [];
    } catch (error) {
        console.error('fetchBookings error:', error);
        return [];
    }
};

export const createBooking = createVenueBookingOrder;
export const updateBookingStatus = updateVenueBookingStatus;

// ==========================================
// SMART RESERVATION FEATURES APIs
// ==========================================

// User - Get Auto Table Suggestions
export const getTableSuggestions = async (params) => {
    const res = await authFetch(`${API_URL}/table-reservations/suggestions`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(params)
    });
    return handleResponse(res);
};

// User - Request Reservation Edit
export const requestReservationEdit = async (reservationId, changes, reason) => {
    const res = await authFetch(`${API_URL}/table-reservations/${reservationId}/request-edit`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ changes, reason })
    });
    return handleResponse(res);
};

// Admin - Mark Reservation as No-Show
export const markReservationNoShow = async (reservationId, reason) => {
    const res = await authFetch(`${API_URL}/admin/table-reservations/${reservationId}/mark-no-show`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ reason })
    });
    return handleResponse(res);
};

// Admin - Mark Guest Arrival
export const markGuestArrival = async (reservationId) => {
    const res = await authFetch(`${API_URL}/admin/table-reservations/${reservationId}/mark-arrival`, { method: 'PUT' });
    return handleResponse(res);
};

// Admin - Review Edit Request
export const reviewEditRequest = async (reservationId, editRequestIndex, action, reviewNotes, rejectionReason) => {
    const res = await authFetch(`${API_URL}/admin/table-reservations/${reservationId}/edit-requests/${editRequestIndex}/review`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, reviewNotes, rejectionReason })
    });
    return handleResponse(res);
};

// Admin - Force Book Reservation
export const forceBookReservation = async (bookingData) => {
    const res = await authFetch(`${API_URL}/admin/table-reservations/force-book`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(bookingData)
    });
    return handleResponse(res);
};

// Admin - Get Advanced Analytics
export const getAdvancedReservationAnalytics = async (params = {}) => {
    const queryParams = new URLSearchParams(params);
    const res = await authFetch(`${API_URL}/admin/table-reservations/analytics?${queryParams}`);
    return handleResponse(res);
};

// Admin - Get Reservation Settings
export const getReservationSettings = async () => {
    const res = await authFetch(`${API_URL}/admin/settings`);
    return handleResponse(res);
};

// Admin - Update Reservation Settings
export const updateReservationSettings = async (settings) => {
    const res = await authFetch(`${API_URL}/admin/settings`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(settings)
    });
    return handleResponse(res);
};

export const sendOtp = async (phone) => {
    // OTP functionality - to be implemented later
    console.warn('OTP functionality not yet implemented');
    return { success: true, message: 'OTP feature coming soon' };
};

export const verifyOtp = async (phone, otp) => {
    // OTP functionality - to be implemented later
    console.warn('OTP functionality not yet implemented');
    return { success: true, message: 'OTP feature coming soon' };
};
// ==========================================
// USER - PASSWORD CHANGE VIA OTP (non-admin)
// ==========================================

export const requestUserPasswordOTP = async () => {
    const res = await authFetch(`${API_URL}/request-password-otp`, { method: 'POST' });
    return handleResponse(res);
};

export const verifyUserPasswordOTP = async (otp, newPassword) => {
    const res = await authFetch(`${API_URL}/verify-password-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ otp, newPassword })
    });
    return handleResponse(res);
};

// ==========================================
// ADMIN - PROFILE & SETTINGS APIs
// ==========================================

export const requestAdminPasswordOTP = async () => {
    const res = await authFetch(`${API_URL}/admin/request-password-otp`, {
        method: 'POST'
    });
    return handleResponse(res);
};

export const verifyAdminPasswordOTP = async (otp, newPassword) => {
    const res = await authFetch(`${API_URL}/admin/verify-password-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ otp, newPassword })
    });
    return handleResponse(res);
};

export const getAdminProfile = async () => {
    const res = await authFetch(`${API_URL}/admin/profile`);
    return handleResponse(res);
};

export const updateAdminProfile = async (profileData) => {
    const res = await authFetch(`${API_URL}/admin/profile`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(profileData)
    });
    return handleResponse(res);
};

export const updateRestaurantSettings = async (settingsData) => {
    const res = await authFetch(`${API_URL}/admin/settings`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(settingsData)
    });
    return handleResponse(res);
};

export const uploadImage = async (file) => {
    const formData = new FormData();
    formData.append('image', file);
    const res = await authFetch(`${API_URL}/upload`, { method: 'POST', body: formData });
    return handleResponse(res);
};

// ==========================================
// CONTACT US & MESSAGES APIs
// ==========================================

export const fetchContactInfo = async () => {
    const res = await fetch(`${API_URL}/contact/info`);
    return handleResponse(res);
};

export const submitContactForm = async (formData) => {
    // Use authFetch so logged-in users get their userId linked to the message
    const res = await authFetch(`${API_URL}/contact`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
    });
    return handleResponse(res);
};

export const fetchAllContactMessages = async () => {
    const res = await authFetch(`${API_URL}/contact/admin/messages`);
    return handleResponse(res);
};

export const updateMessageStatus = async (id, status, adminNotes) => {
    const res = await authFetch(`${API_URL}/contact/admin/messages/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status, adminNotes })
    });
    return handleResponse(res);
};

export const adminReplyToMessage = async (id, message) => {
    const res = await authFetch(`${API_URL}/contact/admin/messages/${id}/reply`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message })
    });
    return handleResponse(res);
};

export const deleteContactMessage = async (id) => {
    const res = await authFetch(`${API_URL}/contact/admin/messages/${id}`, {
        method: 'DELETE'
    });
    return handleResponse(res);
};

export const fetchMyMessages = async () => {
    const res = await authFetch(`${API_URL}/contact/my-messages`);
    return handleResponse(res);
};

export const fetchRestaurantSettings = async () => {
    const res = await authFetch(`${API_URL}/admin/settings`);
    return handleResponse(res);
};

// ==========================================
// VENUE SLOT LOCKING APIs
// ==========================================

export const lockVenueSlot = async (lockData) => {
    const res = await authFetch(`${API_URL}/venue-bookings/lock-slot`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(lockData)
    });
    return handleResponse(res);
};

export const releaseVenueSlot = async (lockData) => {
    const res = await authFetch(`${API_URL}/venue-bookings/release-slot`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(lockData)
    });
    return handleResponse(res);
};

