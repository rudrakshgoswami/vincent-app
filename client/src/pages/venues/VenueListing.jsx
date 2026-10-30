import { useState, useEffect, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
    Search, MapPin, Users, Star, Filter, X, SlidersHorizontal,
    Grid3x3, List, ChevronDown, ChevronRight, Sparkles, ArrowUpDown,
    Wifi, Car, Snowflake, Music, Camera, Utensils, Shield, Zap,
    TreePine, Monitor, CircleParking, Heart, Eye
} from 'lucide-react';
import { fetchVenues, getImageUrl } from '../../api';

const VENUE_TYPES = [
    { value: '', label: 'All Types', icon: '🏛️' },
    { value: 'banquet_hall', label: 'Banquet Hall', icon: '🏰' },
    { value: 'lawn_garden', label: 'Lawn & Garden', icon: '🌳' },
    { value: 'rooftop', label: 'Rooftop', icon: '🌆' },
    { value: 'conference_hall', label: 'Conference Hall', icon: '💼' },
    { value: 'poolside', label: 'Poolside', icon: '🏊' },
    { value: 'farmhouse', label: 'Farmhouse', icon: '🏡' },
    { value: 'hotel_ballroom', label: 'Hotel Ballroom', icon: '🏨' }
];

const SORT_OPTIONS = [
    { value: '', label: 'Recommended' },
    { value: 'price_low', label: 'Price: Low to High' },
    { value: 'price_high', label: 'Price: High to Low' },
    { value: 'rating', label: 'Highest Rated' },
    { value: 'popular', label: 'Most Popular' },
    { value: 'newest', label: 'Newest First' }
];

const SETTINGS = [
    { value: '', label: 'Any Setting' },
    { value: 'indoor', label: 'Indoor' },
    { value: 'outdoor', label: 'Outdoor' },
    { value: 'both', label: 'Indoor + Outdoor' }
];

const formatPrice = (price) => {
    if (!price) return '₹0';
    return '₹' + price.toLocaleString('en-IN');
};

const getTypeLabel = (type) => VENUE_TYPES.find(t => t.value === type)?.label || type;
const getTypeIcon = (type) => VENUE_TYPES.find(t => t.value === type)?.icon || '🏛️';

const getCoverImage = (venue) => {
    const coverMedia = venue.media?.find(m => m.isCover);
    const firstImage = venue.media?.[0];
    const img = coverMedia || firstImage;
    if (!img) return null;
    return getImageUrl(img.url);
};

const amenityIcons = {
    parking: <CircleParking size={14} />,
    climate: <Snowflake size={14} />,
    av: <Monitor size={14} />,
    stage: <Music size={14} />,
    lighting: <Zap size={14} />,
    catering: <Utensils size={14} />,
    connectivity: <Wifi size={14} />,
    security: <Shield size={14} />,
    outdoor: <TreePine size={14} />,
    restrooms: <Users size={14} />,
    furniture: <Grid3x3 size={14} />
};

export default function VenueListing() {
    const navigate = useNavigate();
    const [venues, setVenues] = useState([]);
    const [loading, setLoading] = useState(true);
    const [totalPages, setTotalPages] = useState(1);
    const [totalCount, setTotalCount] = useState(0);
    const [viewMode, setViewMode] = useState('grid');
    const [showFilters, setShowFilters] = useState(false);
    const [showSortDropdown, setShowSortDropdown] = useState(false);
    const sortRef = useRef(null);

    // Filters
    const [filters, setFilters] = useState({
        search: '',
        type: '',
        setting: '',
        minCapacity: '',
        maxCapacity: '',
        minPrice: '',
        maxPrice: '',
        rating: '',
        sort: '',
        page: 1
    });

    // Fetch venues
    useEffect(() => {
        loadVenues();
    }, [filters.type, filters.setting, filters.sort, filters.page, filters.rating]);

    const loadVenues = async () => {
        setLoading(true);
        try {
            const params = {};
            if (filters.type) params.type = filters.type;
            if (filters.setting) params.setting = filters.setting;
            if (filters.minCapacity) params.minCapacity = filters.minCapacity;
            if (filters.maxCapacity) params.maxCapacity = filters.maxCapacity;
            if (filters.search) params.search = filters.search;
            if (filters.rating) params.rating = filters.rating;
            if (filters.sort) params.sort = filters.sort;
            params.page = filters.page;
            params.limit = 12;

            const data = await fetchVenues(params);
            setVenues(data.venues || []);
            setTotalPages(data.pages || 1);
            setTotalCount(data.total || 0);
        } catch (err) {
            console.error('Error fetching venues:', err);
        } finally {
            setLoading(false);
        }
    };

    const handleSearch = (e) => {
        e.preventDefault();
        setFilters(f => ({ ...f, page: 1 }));
        loadVenues();
    };

    const clearFilters = () => {
        setFilters({ search: '', type: '', setting: '', minCapacity: '', maxCapacity: '', minPrice: '', maxPrice: '', rating: '', sort: '', page: 1 });
    };

    const activeFilterCount = [filters.type, filters.setting, filters.minCapacity, filters.maxCapacity, filters.rating].filter(Boolean).length;

    // Close dropdown on outside click
    useEffect(() => {
        const handler = (e) => {
            if (sortRef.current && !sortRef.current.contains(e.target)) setShowSortDropdown(false);
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, []);

    return (
        <div className="min-h-screen bg-background">
            {/* Hero Section */}
            <section className="relative bg-secondary overflow-hidden">
                <div className="absolute inset-0 opacity-10" style={{
                    backgroundImage: 'radial-gradient(circle at 20% 50%, rgba(182, 154, 113, 0.3) 0%, transparent 50%), radial-gradient(circle at 80% 50%, rgba(182, 154, 113, 0.2) 0%, transparent 50%)'
                }} />
                <div className="absolute inset-0" style={{
                    backgroundImage: 'url("data:image/svg+xml,%3Csvg width=\'60\' height=\'60\' viewBox=\'0 0 60 60\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cg fill=\'none\' fill-rule=\'evenodd\'%3E%3Cg fill=\'%23B69A71\' fill-opacity=\'0.04\'%3E%3Cpath d=\'M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z\'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")'
                }} />

                <div className="relative container mx-auto px-6 py-16 md:py-24">
                    <div className="max-w-3xl mx-auto text-center">
                        <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-primary/20 rounded-full text-primary text-xs font-medium tracking-wider uppercase mb-6 animate-fade-in">
                            <Sparkles size={14} />
                            Premium Venues for Every Occasion
                        </div>
                        <h1 className="text-4xl md:text-5xl lg:text-6xl font-heading text-white mb-4 animate-fade-in-up" style={{ animationDelay: '0.1s' }}>
                            Find Your Perfect Venue
                        </h1>
                        <p className="text-white/60 text-lg max-w-xl mx-auto mb-8 animate-fade-in-up" style={{ animationDelay: '0.2s' }}>
                            Explore our curated collection of extraordinary venues for weddings, corporate events, and celebrations.
                        </p>

                        {/* Search Bar */}
                        <form onSubmit={handleSearch} className="animate-fade-in-up" style={{ animationDelay: '0.3s' }}>
                            <div className="relative max-w-2xl mx-auto">
                                <div className="flex bg-white rounded-2xl shadow-premium overflow-hidden">
                                    <div className="flex-1 flex items-center px-5 gap-3">
                                        <Search size={20} className="text-text-muted flex-shrink-0" />
                                        <input
                                            type="text"
                                            placeholder="Search venues by name, location, or tags..."
                                            className="w-full py-4 text-text outline-none border-none bg-transparent font-body"
                                            value={filters.search}
                                            onChange={e => setFilters(f => ({ ...f, search: e.target.value }))}
                                        />
                                    </div>
                                    <button type="submit" className="bg-primary hover:bg-primary-dark text-white px-8 font-medium transition-colors">
                                        Search
                                    </button>
                                </div>
                            </div>
                        </form>
                    </div>
                </div>
            </section>

            {/* Type Tabs */}
            <section className="bg-white border-b border-border sticky top-20 z-10">
                <div className="container mx-auto px-6">
                    <div className="flex items-center gap-1 overflow-x-auto py-3 scrollbar-hide">
                        {VENUE_TYPES.map(type => (
                            <button
                                key={type.value}
                                onClick={() => setFilters(f => ({ ...f, type: type.value, page: 1 }))}
                                className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-all ${filters.type === type.value
                                    ? 'bg-primary text-white shadow-md'
                                    : 'bg-surface text-text-muted hover:bg-accent hover:text-text'
                                    }`}
                            >
                                <span>{type.icon}</span>
                                {type.label}
                            </button>
                        ))}
                    </div>
                </div>
            </section>

            {/* Controls Bar */}
            <section className="bg-white border-b border-border-light">
                <div className="container mx-auto px-6 py-3">
                    <div className="flex items-center justify-between">
                        <p className="text-sm text-text-muted">
                            <span className="font-semibold text-text">{totalCount}</span> venues found
                        </p>

                        <div className="flex items-center gap-3">
                            {/* Filter Toggle */}
                            <button
                                onClick={() => setShowFilters(!showFilters)}
                                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all border ${showFilters ? 'border-primary bg-primary/5 text-primary' : 'border-border text-text-muted hover:border-primary/30'
                                    }`}
                            >
                                <SlidersHorizontal size={16} />
                                Filters
                                {activeFilterCount > 0 && (
                                    <span className="bg-primary text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">{activeFilterCount}</span>
                                )}
                            </button>

                            {/* Sort Dropdown */}
                            <div className="relative" ref={sortRef}>
                                <button
                                    onClick={() => setShowSortDropdown(!showSortDropdown)}
                                    className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium border border-border text-text-muted hover:border-primary/30 transition-all"
                                >
                                    <ArrowUpDown size={16} />
                                    {SORT_OPTIONS.find(s => s.value === filters.sort)?.label || 'Sort'}
                                    <ChevronDown size={14} />
                                </button>
                                {showSortDropdown && (
                                    <div className="absolute right-0 top-full mt-2 bg-white rounded-xl border border-border shadow-premium min-w-[200px] z-20 overflow-hidden animate-scale-up">
                                        {SORT_OPTIONS.map(option => (
                                            <button
                                                key={option.value}
                                                onClick={() => { setFilters(f => ({ ...f, sort: option.value })); setShowSortDropdown(false); }}
                                                className={`w-full text-left px-4 py-2.5 text-sm transition-colors ${filters.sort === option.value ? 'bg-primary/5 text-primary font-medium' : 'hover:bg-surface text-text'
                                                    }`}
                                            >
                                                {option.label}
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>

                            {/* View Toggle */}
                            <div className="flex bg-surface rounded-lg p-0.5">
                                <button
                                    onClick={() => setViewMode('grid')}
                                    className={`p-2 rounded-md transition-all ${viewMode === 'grid' ? 'bg-white shadow-sm text-primary' : 'text-text-muted'}`}
                                >
                                    <Grid3x3 size={16} />
                                </button>
                                <button
                                    onClick={() => setViewMode('list')}
                                    className={`p-2 rounded-md transition-all ${viewMode === 'list' ? 'bg-white shadow-sm text-primary' : 'text-text-muted'}`}
                                >
                                    <List size={16} />
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* Filter Panel */}
            {showFilters && (
                <section className="bg-white border-b border-border-light animate-fade-in">
                    <div className="container mx-auto px-6 py-5">
                        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
                            {/* Setting */}
                            <div>
                                <label className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-1.5 block">Setting</label>
                                <select
                                    value={filters.setting}
                                    onChange={e => setFilters(f => ({ ...f, setting: e.target.value, page: 1 }))}
                                    className="w-full px-3 py-2.5 rounded-lg border border-border text-sm bg-white focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
                                >
                                    {SETTINGS.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                                </select>
                            </div>

                            {/* Min Capacity */}
                            <div>
                                <label className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-1.5 block">Min Guests</label>
                                <input
                                    type="number" placeholder="50"
                                    value={filters.minCapacity}
                                    onChange={e => setFilters(f => ({ ...f, minCapacity: e.target.value }))}
                                    className="w-full px-3 py-2.5 rounded-lg border border-border text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
                                />
                            </div>

                            {/* Max Capacity */}
                            <div>
                                <label className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-1.5 block">Max Guests</label>
                                <input
                                    type="number" placeholder="500"
                                    value={filters.maxCapacity}
                                    onChange={e => setFilters(f => ({ ...f, maxCapacity: e.target.value }))}
                                    className="w-full px-3 py-2.5 rounded-lg border border-border text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
                                />
                            </div>

                            {/* Min Rating */}
                            <div>
                                <label className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-1.5 block">Min Rating</label>
                                <select
                                    value={filters.rating}
                                    onChange={e => setFilters(f => ({ ...f, rating: e.target.value, page: 1 }))}
                                    className="w-full px-3 py-2.5 rounded-lg border border-border text-sm bg-white focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
                                >
                                    <option value="">Any</option>
                                    <option value="4.5">4.5+ ⭐</option>
                                    <option value="4">4.0+ ⭐</option>
                                    <option value="3">3.0+ ⭐</option>
                                </select>
                            </div>

                            {/* Actions */}
                            <div className="col-span-2 flex items-end gap-2">
                                <button
                                    onClick={() => { setFilters(f => ({ ...f, page: 1 })); loadVenues(); }}
                                    className="flex-1 bg-primary hover:bg-primary-dark text-white py-2.5 rounded-lg text-sm font-medium transition-colors"
                                >
                                    Apply Filters
                                </button>
                                <button
                                    onClick={clearFilters}
                                    className="px-4 py-2.5 border border-border rounded-lg text-sm text-text-muted hover:bg-surface transition-colors"
                                >
                                    Clear
                                </button>
                            </div>
                        </div>
                    </div>
                </section>
            )}

            {/* Venues Grid / List */}
            <section className="container mx-auto px-6 py-8">
                {loading ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {[...Array(6)].map((_, i) => (
                            <div key={i} className="bg-white rounded-2xl overflow-hidden border border-border animate-pulse">
                                <div className="h-56 bg-surface" />
                                <div className="p-5 space-y-3">
                                    <div className="h-5 bg-surface rounded w-2/3" />
                                    <div className="h-4 bg-surface rounded w-1/2" />
                                    <div className="h-4 bg-surface rounded w-3/4" />
                                    <div className="flex gap-2 mt-4">
                                        <div className="h-8 bg-surface rounded w-16" />
                                        <div className="h-8 bg-surface rounded w-16" />
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                ) : venues.length === 0 ? (
                    <div className="text-center py-20">
                        <div className="text-6xl mb-4">🏛️</div>
                        <h3 className="text-xl font-heading text-secondary mb-2">No venues found</h3>
                        <p className="text-text-muted mb-6">Try adjusting your filters or search criteria</p>
                        <button onClick={clearFilters} className="px-6 py-2.5 bg-primary text-white rounded-lg font-medium hover:bg-primary-dark transition-colors">
                            Clear Filters
                        </button>
                    </div>
                ) : viewMode === 'grid' ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {venues.map((venue, i) => (
                            <VenueCard key={venue._id} venue={venue} index={i} navigate={navigate} />
                        ))}
                    </div>
                ) : (
                    <div className="space-y-4">
                        {venues.map((venue, i) => (
                            <VenueListCard key={venue._id} venue={venue} index={i} navigate={navigate} />
                        ))}
                    </div>
                )}

                {/* Pagination */}
                {totalPages > 1 && (
                    <div className="flex justify-center items-center gap-2 mt-10">
                        <button
                            disabled={filters.page <= 1}
                            onClick={() => setFilters(f => ({ ...f, page: f.page - 1 }))}
                            className="px-4 py-2 rounded-lg border border-border text-sm disabled:opacity-40 hover:bg-surface transition-colors"
                        >
                            Previous
                        </button>
                        {[...Array(totalPages)].map((_, i) => (
                            <button
                                key={i}
                                onClick={() => setFilters(f => ({ ...f, page: i + 1 }))}
                                className={`w-9 h-9 rounded-lg text-sm font-medium transition-all ${filters.page === i + 1 ? 'bg-primary text-white' : 'hover:bg-surface text-text-muted'
                                    }`}
                            >
                                {i + 1}
                            </button>
                        ))}
                        <button
                            disabled={filters.page >= totalPages}
                            onClick={() => setFilters(f => ({ ...f, page: f.page + 1 }))}
                            className="px-4 py-2 rounded-lg border border-border text-sm disabled:opacity-40 hover:bg-surface transition-colors"
                        >
                            Next
                        </button>
                    </div>
                )}
            </section>
        </div>
    );
}

// ========================================
// VENUE CARD (Grid View)
// ========================================
function VenueCard({ venue, index, navigate }) {
    const coverImg = getCoverImage(venue);
    const startPrice = venue.pricing?.weekday?.evening || venue.pricing?.weekday?.morning || 0;

    return (
        <div
            className="group bg-white rounded-2xl overflow-hidden border border-border hover:border-primary/30 hover:shadow-premium-hover transition-all duration-500 cursor-pointer animate-fade-in-up"
            style={{ animationDelay: `${index * 0.05}s` }}
            onClick={() => navigate(`/venues/${venue._id}`)}
        >
            {/* Image */}
            <div className="relative h-56 bg-surface overflow-hidden">
                {coverImg ? (
                    <img
                        src={coverImg}
                        alt={venue.name}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                        loading="lazy"
                    />
                ) : (
                    <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-primary/10 to-primary/5">
                        <span className="text-6xl">{getTypeIcon(venue.type)}</span>
                    </div>
                )}

                {/* Overlay badges */}
                <div className="absolute top-3 left-3 flex gap-2">
                    {venue.featured && (
                        <span className="px-2.5 py-1 bg-primary text-white text-[10px] uppercase tracking-wider font-bold rounded-full flex items-center gap-1">
                            <Sparkles size={10} /> Featured
                        </span>
                    )}
                    {venue.trending && (
                        <span className="px-2.5 py-1 bg-red-500 text-white text-[10px] uppercase tracking-wider font-bold rounded-full">
                            🔥 Trending
                        </span>
                    )}
                </div>

                {/* Price badge */}
                <div className="absolute bottom-3 right-3 bg-white/95 backdrop-blur-sm rounded-lg px-3 py-1.5 shadow-md">
                    <p className="text-xs text-text-muted">Starting at</p>
                    <p className="text-lg font-heading text-secondary">{formatPrice(startPrice)}</p>
                </div>

                {/* Type badge */}
                <div className="absolute top-3 right-3">
                    <span className="px-2.5 py-1 bg-secondary/80 backdrop-blur-sm text-white text-[10px] uppercase tracking-wider font-medium rounded-full">
                        {getTypeLabel(venue.type)}
                    </span>
                </div>
            </div>

            {/* Content */}
            <div className="p-5">
                <div className="flex items-start justify-between gap-2 mb-2">
                    <h3 className="text-lg font-heading text-secondary group-hover:text-primary transition-colors line-clamp-1">
                        {venue.name}
                    </h3>
                    {venue.rating > 0 && (
                        <div className="flex items-center gap-1 bg-green-50 px-2 py-0.5 rounded-md flex-shrink-0">
                            <Star size={12} className="text-green-600 fill-green-600" />
                            <span className="text-sm font-semibold text-green-700">{venue.rating?.toFixed(1)}</span>
                        </div>
                    )}
                </div>

                <div className="flex items-center gap-1.5 text-text-muted text-sm mb-3">
                    <MapPin size={14} className="text-primary flex-shrink-0" />
                    <span className="line-clamp-1">{venue.location?.area}, {venue.location?.city}</span>
                </div>

                <p className="text-sm text-text-muted line-clamp-2 mb-4">
                    {venue.shortDescription || venue.description}
                </p>

                {/* Quick Info */}
                <div className="flex items-center gap-4 text-xs text-text-muted mb-4">
                    <div className="flex items-center gap-1.5">
                        <Users size={13} className="text-primary" />
                        <span>{venue.capacity?.min} - {venue.capacity?.max} guests</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                        <span className="text-base">{venue.setting === 'indoor' ? '🏠' : venue.setting === 'outdoor' ? '🌿' : '🏠🌿'}</span>
                        <span className="capitalize">{venue.setting}</span>
                    </div>
                </div>

                {/* Amenities Tags */}
                <div className="flex flex-wrap gap-1.5">
                    {(venue.amenities || []).slice(0, 4).map((am, idx) => (
                        <span key={idx} className="inline-flex items-center gap-1 px-2 py-0.5 bg-surface text-text-muted text-[11px] rounded-md font-medium">
                            {am.icon || (amenityIcons[am.category] ? amenityIcons[am.category] : null)}
                            {am.name}
                        </span>
                    ))}
                    {(venue.amenities || []).length > 4 && (
                        <span className="px-2 py-0.5 bg-primary/5 text-primary text-[11px] rounded-md font-medium">
                            +{venue.amenities.length - 4} more
                        </span>
                    )}
                </div>
            </div>

            {/* Footer */}
            <div className="px-5 py-3 border-t border-border-light flex items-center justify-between">
                <div className="flex items-center gap-1 text-xs text-text-muted">
                    <Eye size={13} />
                    <span>{venue.bookingCount || 0} bookings</span>
                </div>
                <span className="text-sm font-medium text-primary flex items-center gap-1 group-hover:gap-2 transition-all">
                    View Details <ChevronRight size={14} />
                </span>
            </div>
        </div>
    );
}

// ========================================
// VENUE CARD (List View)
// ========================================
function VenueListCard({ venue, index, navigate }) {
    const coverImg = getCoverImage(venue);
    const startPrice = venue.pricing?.weekday?.evening || venue.pricing?.weekday?.morning || 0;

    return (
        <div
            className="group bg-white rounded-2xl overflow-hidden border border-border hover:border-primary/30 hover:shadow-premium-hover transition-all duration-500 cursor-pointer flex animate-fade-in-up"
            style={{ animationDelay: `${index * 0.05}s` }}
            onClick={() => navigate(`/venues/${venue._id}`)}
        >
            {/* Image */}
            <div className="relative w-72 flex-shrink-0 overflow-hidden">
                {coverImg ? (
                    <img src={coverImg} alt={venue.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" loading="lazy" />
                ) : (
                    <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-primary/10 to-primary/5 min-h-[200px]">
                        <span className="text-5xl">{getTypeIcon(venue.type)}</span>
                    </div>
                )}
                <div className="absolute top-3 left-3 flex gap-2">
                    {venue.featured && <span className="px-2.5 py-1 bg-primary text-white text-[10px] uppercase tracking-wider font-bold rounded-full">⭐ Featured</span>}
                </div>
            </div>

            {/* Content */}
            <div className="flex-1 p-5 flex flex-col justify-between">
                <div>
                    <div className="flex items-start justify-between gap-3 mb-2">
                        <div>
                            <h3 className="text-xl font-heading text-secondary group-hover:text-primary transition-colors">{venue.name}</h3>
                            <div className="flex items-center gap-1.5 text-text-muted text-sm mt-0.5">
                                <MapPin size={14} className="text-primary" />
                                <span>{venue.location?.area}, {venue.location?.city}</span>
                            </div>
                        </div>
                        <div className="text-right flex-shrink-0">
                            <p className="text-xs text-text-muted">Starting at</p>
                            <p className="text-xl font-heading text-secondary">{formatPrice(startPrice)}</p>
                        </div>
                    </div>

                    <p className="text-sm text-text-muted line-clamp-2 mb-3">{venue.shortDescription || venue.description}</p>

                    <div className="flex items-center gap-5 text-sm text-text-muted mb-3">
                        <div className="flex items-center gap-1.5"><Users size={14} className="text-primary" /><span>{venue.capacity?.min}-{venue.capacity?.max} guests</span></div>
                        {venue.rating > 0 && (
                            <div className="flex items-center gap-1"><Star size={14} className="text-yellow-500 fill-yellow-500" /><span className="font-medium text-text">{venue.rating?.toFixed(1)}</span><span>({venue.reviewCount} reviews)</span></div>
                        )}
                        <span className="capitalize px-2 py-0.5 bg-surface rounded text-xs">{venue.setting}</span>
                        <span className="px-2 py-0.5 bg-surface rounded text-xs">{getTypeLabel(venue.type)}</span>
                    </div>

                    <div className="flex flex-wrap gap-1.5">
                        {(venue.amenities || []).slice(0, 6).map((am, idx) => (
                            <span key={idx} className="inline-flex items-center gap-1 px-2 py-0.5 bg-surface text-text-muted text-[11px] rounded-md font-medium">
                                {am.icon} {am.name}
                            </span>
                        ))}
                        {(venue.amenities || []).length > 6 && (
                            <span className="px-2 py-0.5 bg-primary/5 text-primary text-[11px] rounded-md font-medium">+{venue.amenities.length - 6} more</span>
                        )}
                    </div>
                </div>

                <div className="flex items-center justify-end mt-3">
                    <span className="text-sm font-medium text-primary flex items-center gap-1 group-hover:gap-2 transition-all">
                        View Details <ChevronRight size={14} />
                    </span>
                </div>
            </div>
        </div>
    );
}
