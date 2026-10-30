import { useEffect, useState } from 'react';
import {
    Plus, Edit2, Trash2, Search, RefreshCw, AlertCircle, X, Check,
    Image as ImageIcon, Loader2, MapPin, Users, Star, Eye, EyeOff,
    Building2, ChevronDown, ChevronUp, Upload, Calendar, IndianRupee,
    Wifi, Car, Snowflake, Music, Shield, Zap, Monitor, TreePine,
    Quote, Reply, MessageSquare
} from 'lucide-react';

import {
    fetchAllVenuesAdmin, createVenue, updateVenue, deleteVenue,
    addVenueMedia, deleteVenueMedia, uploadFile, getImageUrl,
    fetchVenueReviews, updateReviewAdmin, deleteReviewAdmin
} from '../../api';
import ImageCropperModal from '../../components/ImageCropperModal';



const VENUE_TYPES = [
    { value: 'banquet_hall', label: 'Banquet Hall', icon: '🏛️' },
    { value: 'lawn_garden', label: 'Lawn / Garden', icon: '🌳' },
    { value: 'rooftop', label: 'Rooftop', icon: '🏙️' },
    { value: 'conference_hall', label: 'Conference Hall', icon: '🏢' },
    { value: 'poolside', label: 'Poolside', icon: '🏊' },
    { value: 'farmhouse', label: 'Farmhouse', icon: '🏡' },
    { value: 'hotel_ballroom', label: 'Hotel Ballroom', icon: '🏨' }
];

const AMENITY_CATEGORIES = [
    { key: 'parking', label: 'Parking', icon: Car },
    { key: 'climate', label: 'Climate Control', icon: Snowflake },
    { key: 'av', label: 'Audio/Visual', icon: Monitor },
    { key: 'stage', label: 'Stage & Platform', icon: Music },
    { key: 'lighting', label: 'Lighting', icon: Zap },
    { key: 'catering', label: 'Catering Facilities', icon: Building2 },
    { key: 'connectivity', label: 'Connectivity', icon: Wifi },
    { key: 'security', label: 'Security', icon: Shield },
    { key: 'outdoor', label: 'Outdoor', icon: TreePine },
    { key: 'furniture', label: 'Furniture', icon: Building2 },
];

const DEFAULT_FORM = {
    name: '', slug: '', type: 'banquet_hall', setting: 'indoor',
    description: '', shortDescription: '',
    capacity: { min: 50, max: 500 },
    area: '',
    location: { address: '', area: '', city: '', state: '', pincode: '', googleMapsUrl: '' },
    contact: { phone: '', email: '' },
    pricing: {
        weekday: { morning: '', afternoon: '', evening: '', fullDay: '' },
        weekend: { morning: '', afternoon: '', evening: '', fullDay: '' },
        holiday: { morning: '', afternoon: '', evening: '', fullDay: '' },
        securityDeposit: '', cleaningFee: '', extraHourCharge: '', gstPercent: 18,
    },
    amenities: [], media: [],
    status: 'active', featured: false, tags: '',
};

function slugify(str) {
    return str.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
}

export default function AdminVenueManagement() {
    const [venues, setVenues] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [searchQuery, setSearchQuery] = useState('');
    const [filterType, setFilterType] = useState('');
    const [filterStatus, setFilterStatus] = useState('');

    // Modal
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [modalMode, setModalMode] = useState('add');
    const [currentVenue, setCurrentVenue] = useState(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [activeTab, setActiveTab] = useState('basic');
    const [formData, setFormData] = useState({ ...DEFAULT_FORM });

    // Cropper State
    const [cropSource, setCropSource] = useState(null);
    const [isCropperOpen, setIsCropperOpen] = useState(false);
    const [mediaCropIdx, setMediaCropIdx] = useState(null); // null = new image, number = edit gallery image

    useEffect(() => { loadData(); }, []);

    const loadData = async () => {
        try {
            setLoading(true);
            const res = await fetchAllVenuesAdmin();
            // Backend returns raw array: res.json(venues)
            setVenues(Array.isArray(res) ? res : (res.data?.venues || res.venues || []));
        } catch (err) {
            setError(err.message || 'Failed to load venues');
        } finally {
            setLoading(false);
        }
    };

    const openModal = (mode, venue = null) => {
        setModalMode(mode);
        setCurrentVenue(venue);
        setActiveTab('basic');
        if (mode === 'edit' && venue) {
            setFormData({
                name: venue.name || '',
                slug: venue.slug || '',
                type: venue.type || 'banquet_hall',
                setting: venue.setting || 'indoor',
                description: venue.description || '',
                shortDescription: venue.shortDescription || '',
                capacity: venue.capacity || { min: 50, max: 500 },
                area: venue.area || '',
                location: venue.location || { address: '', area: '', city: '', state: '', pincode: '', googleMapsUrl: '' },
                contact: venue.contact || { phone: '', email: '' },
                pricing: venue.pricing || DEFAULT_FORM.pricing,
                amenities: venue.amenities || [],
                media: venue.media || [],
                status: venue.status || 'active',
                featured: venue.featured || false,
                tags: Array.isArray(venue.tags) ? venue.tags.join(', ') : (venue.tags || ''),
            });
        } else {
            setFormData({ ...DEFAULT_FORM });
        }
        setIsModalOpen(true);
    };

    const handleSubmit = async () => {
        if (!formData.name.trim()) { alert('Venue name is required'); return; }
        try {
            setIsSubmitting(true);
            const payload = {
                ...formData,
                slug: formData.slug || slugify(formData.name),
                tags: typeof formData.tags === 'string'
                    ? formData.tags.split(',').map(t => t.trim()).filter(Boolean)
                    : formData.tags,
            };
            if (modalMode === 'add') {
                await createVenue(payload);
            } else {
                await updateVenue(currentVenue._id, payload);
            }
            await loadData();
            setIsModalOpen(false);
        } catch (err) {
            alert(err.message || 'Action failed');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleDelete = async (id) => {
        if (!confirm('Are you sure you want to delete this venue? This cannot be undone.')) return;
        try {
            await deleteVenue(id);
            await loadData();
        } catch (err) {
            alert(err.message || 'Delete failed');
        }
    };

    const handleToggleStatus = async (venue) => {
        try {
            await updateVenue(venue._id, {
                status: venue.status === 'active' ? 'inactive' : 'active'
            });
            await loadData();
        } catch (err) {
            alert(err.message || 'Update failed');
        }
    };

    const filtered = venues.filter(v => {
        if (searchQuery && !v.name?.toLowerCase().includes(searchQuery.toLowerCase())) return false;
        if (filterType && v.type !== filterType) return false;
        if (filterStatus && v.status !== filterStatus) return false;
        return true;
    });

    const getTypeLabel = (t) => VENUE_TYPES.find(vt => vt.value === t)?.label || t;
    const getTypeIcon = (t) => VENUE_TYPES.find(vt => vt.value === t)?.icon || '🏛️';
    const getCoverImage = (v) => {
        const cover = v.media?.find(m => m.isCover);
        const url = cover?.url || v.media?.[0]?.url || null;
        return url ? getImageUrl(url) : null;
    };

    const getStartingPrice = (v) => {
        if (!v.pricing) return null;
        const prices = [];
        ['weekday', 'weekend', 'holiday'].forEach(day => {
            if (v.pricing[day]) {
                Object.values(v.pricing[day]).forEach(price => {
                    if (price && !isNaN(price)) prices.push(Number(price));
                });
            }
        });
        return prices.length > 0 ? Math.min(...prices) : null;
    };
    const handleImageSelect = (file, idx = null) => {
        if (!file && typeof file !== 'string') return;
        
        if (typeof file === 'string') {
            setCropSource(file);
            setMediaCropIdx(idx);
            setIsCropperOpen(true);
            return;
        }

        const reader = new FileReader();
        reader.onload = () => {
            setCropSource(reader.result);
            setMediaCropIdx(idx);
            setIsCropperOpen(true);
        };
        reader.readAsDataURL(file);
    };

    const handleCropComplete = async (croppedBlob) => {
        try {
            setIsSubmitting(true);
            setIsCropperOpen(false);
            const file = new File([croppedBlob], "venue_media.jpg", { type: "image/jpeg" });
            const res = await uploadFile(file);
            const imgUrl = res.url || res.data?.url;

            if (imgUrl) {
                if (mediaCropIdx === null) {
                    setFormData(prev => ({
                        ...prev,
                        media: [...prev.media, { type: 'image', url: imgUrl, category: 'other', caption: '', isCover: prev.media.length === 0, order: prev.media.length }]
                    }));
                } else {
                    const newMedia = [...formData.media];
                    newMedia[mediaCropIdx].url = imgUrl;
                    setFormData({ ...formData, media: newMedia });
                }
            }
        } catch (err) {
            alert('Upload failed: ' + err.message);
        } finally {
            setIsSubmitting(false);
            setCropSource(null);
        }
    };

    // ----------- RENDER -----------
    if (loading) {
        return (
            <div className="h-96 flex flex-col items-center justify-center">
                <Loader2 className="w-10 h-10 animate-spin text-primary mb-4" />
                <p className="text-text-muted">Loading venues...</p>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h2 className="text-2xl font-heading text-secondary mb-1">Venue Management</h2>
                    <p className="text-text-muted text-sm">{venues.length} venues configured</p>
                </div>
                <div className="flex items-center gap-3">
                    <button onClick={loadData} className="p-2 text-text-muted hover:text-secondary hover:bg-gray-100 rounded-lg transition-colors border border-gray-200">
                        <RefreshCw size={20} />
                    </button>
                    <button onClick={() => openModal('add')} className="flex items-center gap-2 bg-primary text-white px-5 py-2.5 rounded-lg hover:bg-primary-dark transition-colors shadow-sm">
                        <Plus size={20} /> Add Venue
                    </button>
                </div>
            </div>

            {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-lg flex items-center gap-3">
                    <AlertCircle size={20} /><p>{error}</p>
                </div>
            )}

            {/* Filters */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-3 border border-gray-200 rounded-xl">
                <div className="flex flex-wrap items-center gap-3">
                    <select value={filterType} onChange={e => setFilterType(e.target.value)}
                        className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary outline-none">
                        <option value="">All Types</option>
                        {VENUE_TYPES.map(t => <option key={t.value} value={t.value}>{t.icon} {t.label}</option>)}
                    </select>
                    <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)}
                        className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary outline-none">
                        <option value="">All Status</option>
                        <option value="active">Active</option>
                        <option value="inactive">Inactive</option>
                        <option value="maintenance">Maintenance</option>
                    </select>
                </div>
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                    <input type="text" placeholder="Search venues..." value={searchQuery}
                        onChange={e => setSearchQuery(e.target.value)}
                        className="pl-10 pr-4 py-2 bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary w-full md:w-64" />
                </div>
            </div>

            {/* Venue Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
                {filtered.map(venue => (
                    <div key={venue._id} className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm hover:shadow-md transition-all group">
                        {/* Image */}
                        <div className="h-44 bg-gray-100 relative overflow-hidden">
                            {getCoverImage(venue) ? (
                                <img src={getCoverImage(venue)} alt={venue.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                            ) : (
                                <div className="w-full h-full flex items-center justify-center text-gray-300">
                                    <Building2 size={56} />
                                </div>
                            )}
                            <div className="absolute top-3 left-3 flex gap-2">
                                <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full uppercase tracking-wider 
                                    ${venue.status === 'active' ? 'bg-green-500 text-white' : venue.status === 'maintenance' ? 'bg-yellow-500 text-white' : 'bg-gray-500 text-white'}`}>
                                    {venue.status}
                                </span>
                                {venue.featured && <span className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-primary text-white uppercase tracking-wider">Featured</span>}
                            </div>
                            <div className="absolute top-3 right-3 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                <button onClick={() => openModal('edit', venue)} className="p-2 bg-white/90 backdrop-blur-sm text-blue-600 rounded-lg hover:bg-white shadow-sm">
                                    <Edit2 size={16} />
                                </button>
                                <button onClick={() => handleDelete(venue._id)} className="p-2 bg-white/90 backdrop-blur-sm text-red-600 rounded-lg hover:bg-white shadow-sm">
                                    <Trash2 size={16} />
                                </button>
                            </div>
                        </div>
                        {/* Info */}
                        <div className="p-5">
                            <div className="flex items-start justify-between mb-2">
                                <div>
                                    <h3 className="text-lg font-heading text-secondary mb-0.5">{venue.name}</h3>
                                    <p className="text-text-muted text-xs flex items-center gap-1">
                                        <MapPin size={12} /> {venue.location?.area || venue.location?.city || 'No location'}
                                    </p>
                                </div>
                                <span className="text-sm" title={getTypeLabel(venue.type)}>{getTypeIcon(venue.type)}</span>
                            </div>
                            <div className="flex items-center gap-4 text-xs text-text-muted mt-3 mb-4">
                                <span className="flex items-center gap-1" title="Capacity"><Users size={13} /> {venue.capacity?.min || '?'} – {venue.capacity?.max || '?'}</span>
                                <span className="flex items-center gap-1" title="Rating">
                                    <Star size={13} className={venue.rating > 0 ? "text-yellow-500 fill-yellow-500" : "text-gray-300"} /> 
                                    {venue.rating > 0 ? venue.rating?.toFixed(1) : 'No rating'}
                                </span>
                                <span className="flex items-center gap-1" title="Reviews">
                                    <MessageSquare size={13} /> {venue.reviewCount || 0}
                                </span>
                                {getStartingPrice(venue) && <span className="text-primary font-semibold ml-auto">₹{getStartingPrice(venue)?.toLocaleString()}</span>}
                            </div>

                            <div className="flex items-center gap-2 pt-3 border-t border-gray-100">
                                <button onClick={() => handleToggleStatus(venue)}
                                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors border
                                    ${venue.status === 'active' ? 'border-red-200 text-red-600 hover:bg-red-50' : 'border-green-200 text-green-600 hover:bg-green-50'}`}>
                                    {venue.status === 'active' ? <><EyeOff size={13} /> Deactivate</> : <><Eye size={13} /> Activate</>}
                                </button>
                                <button onClick={() => openModal('edit', venue)}
                                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border border-gray-200 text-gray-600 hover:bg-gray-50 transition-colors ml-auto">
                                    <Edit2 size={13} /> Edit
                                </button>
                            </div>
                        </div>
                    </div>
                ))}
                {filtered.length === 0 && (
                    <div className="col-span-full py-20 text-center bg-white border border-dashed border-gray-300 rounded-2xl">
                        <Building2 size={48} className="mx-auto text-gray-300 mb-4" />
                        <p className="text-text-muted">{searchQuery || filterType || filterStatus ? 'No venues match your filters.' : 'No venues found. Create one to get started.'}</p>
                    </div>
                )}
            </div>

            {/* ====== ADD / EDIT MODAL ====== */}
            {isModalOpen && (
                <div className="overlay-premium z-[9999]">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[92vh] overflow-hidden flex flex-col animate-scale-up">
                        {/* Modal Header */}
                        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
                            <h3 className="text-xl font-heading text-secondary">
                                {modalMode === 'add' ? '➕ Add New Venue' : '✏️ Edit Venue'}
                            </h3>
                            <button onClick={() => setIsModalOpen(false)} className="text-text-muted hover:text-secondary hover:bg-gray-100 p-2 rounded-lg transition-colors">
                                <X size={20} />
                            </button>
                        </div>

                        {/* Tabs */}
                        <div className="px-6 pt-3 flex gap-1 border-b border-gray-100 overflow-x-auto scrollbar-hide">
                            {[
                                { key: 'basic', label: 'Basic Info' },
                                { key: 'pricing', label: 'Pricing' },
                                { key: 'amenities', label: 'Amenities' },
                                { key: 'media', label: 'Gallery' },
                                { key: 'location', label: 'Location' },
                                { key: 'policies', label: 'Policies' },
                                modalMode === 'edit' && { key: 'reviews', label: `Reviews (${currentVenue?.reviewCount || 0})` },
                            ].filter(Boolean).map(tab => (

                                <button key={tab.key} onClick={() => setActiveTab(tab.key)}
                                    className={`px-4 py-2.5 text-sm font-medium rounded-t-lg whitespace-nowrap transition-all border-b-2
                                    ${activeTab === tab.key ? 'border-primary text-primary bg-primary/5' : 'border-transparent text-text-muted hover:text-secondary hover:bg-gray-50'}`}>
                                    {tab.label}
                                </button>
                            ))}
                        </div>

                        {/* Tab Content */}
                        <div className="flex-1 overflow-y-auto p-6 space-y-5">
                            {activeTab === 'basic' && <BasicInfoTab formData={formData} setFormData={setFormData} />}
                            {activeTab === 'pricing' && <PricingTab formData={formData} setFormData={setFormData} />}
                            {activeTab === 'amenities' && <AmenitiesTab formData={formData} setFormData={setFormData} />}
                            {activeTab === 'media' && <MediaTab formData={formData} setFormData={setFormData} onImageSelect={handleImageSelect} />}
                            {activeTab === 'location' && <LocationTab formData={formData} setFormData={setFormData} />}
                            {activeTab === 'policies' && <PoliciesTab formData={formData} setFormData={setFormData} />}
                            {activeTab === 'reviews' && <VenueReviewsTab venueId={currentVenue?._id} onUpdate={loadData} />}

                        </div>

                        {/* Footer */}
                        <div className="px-6 py-4 bg-gray-50 flex gap-3 border-t border-gray-100">
                            <button onClick={() => setIsModalOpen(false)}
                                className="flex-1 py-3 border border-gray-300 rounded-xl text-sm font-medium text-gray-700 hover:bg-white transition-colors">
                                Cancel
                            </button>
                            <button onClick={handleSubmit} disabled={isSubmitting}
                                className="flex-1 py-3 bg-secondary text-white rounded-xl text-sm font-medium hover:bg-secondary/90 transition-colors disabled:opacity-50 flex items-center justify-center gap-2">
                                {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check size={18} />}
                                {modalMode === 'add' ? 'Create Venue' : 'Update Venue'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
            {isCropperOpen && (
                <ImageCropperModal 
                    image={cropSource}
                    onCropComplete={handleCropComplete}
                    onCancel={() => {
                        setIsCropperOpen(false);
                        setCropSource(null);
                    }}
                    aspect={16 / 9}
                />
            )}
        </div>
    );
}

/* =========== TAB COMPONENTS =========== */

function InputField({ label, value, onChange, type = 'text', placeholder = '', required = false, className = '' }) {
    return (
        <div className={className}>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">{label} {required && <span className="text-red-500">*</span>}</label>
            <input type={type} value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all" required={required} />
        </div>
    );
}

function BasicInfoTab({ formData, setFormData }) {
    return (
        <div className="space-y-5">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <InputField label="Venue Name" value={formData.name} required
                    onChange={v => setFormData({ ...formData, name: v, slug: slugify(v) })} placeholder="e.g. Royal Banquet Hall" />
                <InputField label="URL Slug" value={formData.slug}
                    onChange={v => setFormData({ ...formData, slug: v })} placeholder="auto-generated" />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Venue Type <span className="text-red-500">*</span></label>
                    <select value={formData.type} onChange={e => setFormData({ ...formData, type: e.target.value })}
                        className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary outline-none">
                        {VENUE_TYPES.map(t => <option key={t.value} value={t.value}>{t.icon} {t.label}</option>)}
                    </select>
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Setting</label>
                    <select value={formData.setting} onChange={e => setFormData({ ...formData, setting: e.target.value })}
                        className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary outline-none">
                        <option value="indoor">Indoor</option>
                        <option value="outdoor">Outdoor</option>
                        <option value="both">Both</option>
                    </select>
                </div>
                <InputField label="Area (sq.ft)" value={formData.area} type="number"
                    onChange={v => setFormData({ ...formData, area: v })} />
            </div>

            <div className="grid grid-cols-2 gap-4">
                <InputField label="Min Capacity" value={formData.capacity.min} type="number"
                    onChange={v => setFormData({ ...formData, capacity: { ...formData.capacity, min: parseInt(v) || 0 } })} />
                <InputField label="Max Capacity" value={formData.capacity.max} type="number"
                    onChange={v => setFormData({ ...formData, capacity: { ...formData.capacity, max: parseInt(v) || 0 } })} />
            </div>

            <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Description</label>
                <textarea value={formData.description} onChange={e => setFormData({ ...formData, description: e.target.value })}
                    className="w-full h-28 px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary outline-none resize-none" placeholder="Detailed venue description..." />
            </div>
            <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Short Description (for cards)</label>
                <textarea value={formData.shortDescription} onChange={e => setFormData({ ...formData, shortDescription: e.target.value })}
                    className="w-full h-16 px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary outline-none resize-none" placeholder="2-3 line summary..." />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Status</label>
                    <select value={formData.status} onChange={e => setFormData({ ...formData, status: e.target.value })}
                        className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary outline-none">
                        <option value="active">✅ Active</option>
                        <option value="inactive">🔴 Inactive</option>
                        <option value="maintenance">🔧 Under Maintenance</option>
                    </select>
                </div>
                <InputField label="Tags (comma-separated)" value={formData.tags}
                    onChange={v => setFormData({ ...formData, tags: v })} placeholder="luxury, wedding, corporate" />
            </div>

            <label className="flex items-center gap-3 cursor-pointer">
                <div onClick={() => setFormData({ ...formData, featured: !formData.featured })}
                    className={`w-12 h-6 rounded-full transition-all relative ${formData.featured ? 'bg-primary' : 'bg-gray-300'}`}>
                    <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${formData.featured ? 'left-7' : 'left-1'}`} />
                </div>
                <span className="text-sm font-medium text-gray-700">Featured Venue (show on homepage)</span>
            </label>
        </div>
    );
}

function PricingTab({ formData, setFormData }) {
    const updateSlot = (dayType, slot, val) => {
        setFormData({
            ...formData,
            pricing: {
                ...formData.pricing,
                [dayType]: { ...formData.pricing[dayType], [slot]: val ? parseInt(val) : '' }
            }
        });
    };
    const updateField = (key, val) => {
        setFormData({ ...formData, pricing: { ...formData.pricing, [key]: val ? parseInt(val) : '' } });
    };

    const slots = ['morning', 'afternoon', 'evening', 'fullDay'];
    const slotLabels = { morning: '☀️ Morning (6AM-12PM)', afternoon: '🌤️ Afternoon (12PM-6PM)', evening: '🌙 Evening (6PM-12AM)', fullDay: '📅 Full Day (6AM-12AM)' };

    return (
        <div className="space-y-6">
            <div>
                <h4 className="text-lg font-heading text-secondary mb-4">Time Slot Pricing</h4>
                <div className="overflow-x-auto">
                    <table className="w-full text-sm border border-gray-200 rounded-lg overflow-hidden">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="text-left px-4 py-3 font-medium text-gray-700">Time Slot</th>
                                <th className="text-center px-4 py-3 font-medium text-gray-700">Weekday (₹)</th>
                                <th className="text-center px-4 py-3 font-medium text-gray-700">Weekend (₹)</th>
                                <th className="text-center px-4 py-3 font-medium text-gray-700">Holiday (₹)</th>
                            </tr>
                        </thead>
                        <tbody>
                            {slots.map(slot => (
                                <tr key={slot} className="border-t border-gray-100">
                                    <td className="px-4 py-3 whitespace-nowrap text-gray-700">{slotLabels[slot]}</td>
                                    {['weekday', 'weekend', 'holiday'].map(day => (
                                        <td key={day} className="px-3 py-2">
                                            <input type="number" value={formData.pricing?.[day]?.[slot] || ''}
                                                onChange={e => updateSlot(day, slot, e.target.value)}
                                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary outline-none text-center" placeholder="0" />
                                        </td>
                                    ))}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            <div>
                <h4 className="text-lg font-heading text-secondary mb-4">Additional Charges</h4>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <InputField label="Security Deposit (₹)" value={formData.pricing?.securityDeposit || ''} type="number"
                        onChange={v => updateField('securityDeposit', v)} />
                    <InputField label="Cleaning Fee (₹)" value={formData.pricing?.cleaningFee || ''} type="number"
                        onChange={v => updateField('cleaningFee', v)} />
                    <InputField label="Extra Hour (₹)" value={formData.pricing?.extraHourCharge || ''} type="number"
                        onChange={v => updateField('extraHourCharge', v)} />
                    <InputField label="GST (%)" value={formData.pricing?.gstPercent || 18} type="number"
                        onChange={v => updateField('gstPercent', v)} />
                </div>
            </div>
        </div>
    );
}

function AmenitiesTab({ formData, setFormData }) {
    const [newAmenity, setNewAmenity] = useState('');
    const amenities = formData.amenities || [];

    const addAmenity = (name) => {
        if (!name.trim()) return;
        const existing = amenities.find(a => (typeof a === 'string' ? a : a.name)?.toLowerCase() === name.toLowerCase());
        if (existing) return;
        setFormData({ ...formData, amenities: [...amenities, { name: name.trim(), category: 'other', available: true }] });
        setNewAmenity('');
    };

    const removeAmenity = (idx) => {
        const updated = [...amenities];
        updated.splice(idx, 1);
        setFormData({ ...formData, amenities: updated });
    };

    const QUICK_AMENITIES = [
        'Car Parking', 'Valet Parking', 'Air Conditioning', 'Sound System', 'Stage', 'WiFi',
        'Power Backup', 'Projector', 'Changing Rooms', 'CCTV', 'Security', 'Wheelchair Access',
        'Catering Kitchen', 'Green Room', 'LED Screen', 'DJ Setup', 'Bridal Room', 'Generator',
        'Swimming Pool', 'Garden Area', 'Terrace', 'Fire Safety', 'Elevator'
    ];

    const isSelected = (name) => amenities.some(a => (typeof a === 'string' ? a : a.name)?.toLowerCase() === name.toLowerCase());

    return (
        <div className="space-y-6">
            <div>
                <h4 className="text-lg font-heading text-secondary mb-3">Quick Add Amenities</h4>
                <div className="flex flex-wrap gap-2">
                    {QUICK_AMENITIES.map(a => (
                        <button key={a} onClick={() => isSelected(a) ? null : addAmenity(a)}
                            className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all border
                            ${isSelected(a) ? 'bg-primary text-white border-primary' : 'bg-white text-gray-600 border-gray-300 hover:border-primary hover:text-primary'}`}>
                            {isSelected(a) ? '✓ ' : '+ '}{a}
                        </button>
                    ))}
                </div>
            </div>

            <div>
                <h4 className="text-lg font-heading text-secondary mb-3">Custom Amenity</h4>
                <div className="flex gap-2">
                    <input value={newAmenity} onChange={e => setNewAmenity(e.target.value)} placeholder="Type amenity name..."
                        className="flex-1 px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary outline-none"
                        onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addAmenity(newAmenity))} />
                    <button onClick={() => addAmenity(newAmenity)} className="px-4 py-2.5 bg-primary text-white rounded-lg hover:bg-primary-dark transition-colors">
                        <Plus size={18} />
                    </button>
                </div>
            </div>

            <div>
                <h4 className="text-sm font-medium text-gray-700 mb-2">Selected Amenities ({amenities.length})</h4>
                {amenities.length === 0 ? (
                    <p className="text-text-muted text-sm py-3">No amenities selected yet.</p>
                ) : (
                    <div className="flex flex-wrap gap-2">
                        {amenities.map((a, i) => (
                            <span key={i} className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-secondary/5 text-secondary rounded-full text-xs font-medium border border-secondary/10">
                                {typeof a === 'string' ? a : a.name}
                                <button onClick={() => removeAmenity(i)} className="hover:text-red-500 transition-colors"><X size={12} /></button>
                            </span>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}

function LocationTab({ formData, setFormData }) {
    const loc = formData.location || {};
    const con = formData.contact || {};
    const updateLoc = (key, val) => setFormData({ ...formData, location: { ...formData.location, [key]: val } });
    const updateCon = (key, val) => setFormData({ ...formData, contact: { ...formData.contact, [key]: val } });

    return (
        <div className="space-y-6">
            <div>
                <h4 className="text-lg font-heading text-secondary mb-4">Address</h4>
                <div className="space-y-4">
                    <InputField label="Street Address" value={loc.address || ''} onChange={v => updateLoc('address', v)} placeholder="123 Main Street" />
                    <div className="grid grid-cols-2 gap-4">
                        <InputField label="Area / Locality" value={loc.area || ''} onChange={v => updateLoc('area', v)} placeholder="Downtown" />
                        <InputField label="City" value={loc.city || ''} onChange={v => updateLoc('city', v)} placeholder="Mumbai" />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <InputField label="State" value={loc.state || ''} onChange={v => updateLoc('state', v)} placeholder="Maharashtra" />
                        <InputField label="PIN Code" value={loc.pincode || ''} onChange={v => updateLoc('pincode', v)} placeholder="400001" />
                    </div>
                    <InputField label="Google Maps Location URL" value={loc.googleMapsUrl || ''} onChange={v => updateLoc('googleMapsUrl', v)} placeholder="https://goo.gl/maps/..." />
                </div>
            </div>
            <div>
                <h4 className="text-lg font-heading text-secondary mb-4">Contact Information</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <InputField label="Phone" value={con.phone || ''} onChange={v => updateCon('phone', v)} placeholder="+91 98765 43210" />
                    <InputField label="Email" value={con.email || ''} onChange={v => updateCon('email', v)} placeholder="info@venue.com" type="email" />
                </div>
            </div>
        </div>
    );
}

function PoliciesTab({ formData, setFormData }) {
    return (
        <div className="space-y-6">
            <div className="p-4 bg-blue-50/50 border border-blue-100 rounded-lg">
                <p className="text-sm text-blue-700">💡 Policies are configured in the Venue schema defaults. You can override them per-venue by editing the raw data directly or through the API.</p>
            </div>
            <div className="grid grid-cols-2 gap-4">
                <InputField label="Min Advance Booking (days)" value={formData.policies?.minAdvanceBooking || 7} type="number"
                    onChange={v => setFormData({ ...formData, policies: { ...formData.policies, minAdvanceBooking: parseInt(v) || 7 } })} />
                <InputField label="Max Advance Booking (days)" value={formData.policies?.maxAdvanceBooking || 365} type="number"
                    onChange={v => setFormData({ ...formData, policies: { ...formData.policies, maxAdvanceBooking: parseInt(v) || 365 } })} />
            </div>
            <InputField label="Advance Payment (%)" value={formData.policies?.advancePaymentPercent || 40} type="number"
                onChange={v => setFormData({ ...formData, policies: { ...formData.policies, advancePaymentPercent: parseInt(v) || 40 } })} />
            <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Cancellation Policy</label>
                <textarea value={formData.policies?.cancellationPolicy || ''}
                    onChange={e => setFormData({ ...formData, policies: { ...formData.policies, cancellationPolicy: e.target.value } })}
                    className="w-full h-24 px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary outline-none resize-none"
                    placeholder="e.g. 90% refund if cancelled 60+ days before. 50% for 30-60 days. No refund under 30 days." />
            </div>
            <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Terms & Conditions</label>
                <textarea value={formData.policies?.termsAndConditions || ''}
                    onChange={e => setFormData({ ...formData, policies: { ...formData.policies, termsAndConditions: e.target.value } })}
                    className="w-full h-24 px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary outline-none resize-none"
                    placeholder="Venue rules, noise restrictions, etc." />
            </div>
        </div>
    );
}

function MediaTab({ formData, setFormData, onImageSelect }) {
    const [uploading, setUploading] = useState(false);

    const media = formData.media || [];

    const handleLocalFileSelect = (e) => {
        const file = e.target.files?.[0];
        if (!file) return;
        onImageSelect(file, null);
        e.target.value = '';
    };

    const removeMedia = (idx) => {
        const newMedia = [...media];
        newMedia.splice(idx, 1);
        // Ensure at least one cover if remaining
        if (newMedia.length > 0 && !newMedia.some(m => m.isCover)) {
            newMedia[0].isCover = true;
        }
        setFormData({ ...formData, media: newMedia });
    };

    const setAsCover = (idx) => {
        const newMedia = media.map((m, i) => ({ ...m, isCover: i === idx }));
        setFormData({ ...formData, media: newMedia });
    };

    const updateMediaField = (idx, field, val) => {
        const newMedia = [...media];
        newMedia[idx][field] = val;
        setFormData({ ...formData, media: newMedia });
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <h4 className="text-lg font-heading text-secondary mb-1">Venue Gallery</h4>
                <div className="relative overflow-hidden w-auto h-auto">
                    <input type="file" accept="image/*" onChange={handleLocalFileSelect} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" />
                    <button className="flex items-center gap-2 bg-primary/10 text-primary px-4 py-2 rounded-lg font-medium hover:bg-primary/20 transition-colors pointer-events-none">
                        <Upload size={18} />
                        Upload Gallery Image
                    </button>
                </div>
            </div>

            {media.length === 0 ? (
                <div className="py-12 border-2 border-dashed border-gray-200 rounded-xl text-center text-text-muted">
                    <ImageIcon className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                    <p>No images uploaded yet.</p>
                </div>
            ) : (
                <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
                    {media.map((img, i) => (
                        <div key={i} className="border border-gray-200 rounded-xl overflow-hidden bg-white shadow-sm hover:shadow-md transition-all">
                            <div className="relative h-40 group">
                                <img src={getImageUrl(img.url)} alt="" className="w-full h-full object-cover" />
                                <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                                    <button 
                                        type="button"
                                        onClick={() => onImageSelect(getImageUrl(img.url), i)} 
                                        className="p-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors" 
                                        title="Adjust Crop"
                                    >
                                        <Edit2 size={16} />
                                    </button>
                                    <button 
                                        type="button"
                                        onClick={() => removeMedia(i)} 
                                        className="p-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors" 
                                        title="Delete Image"
                                    >
                                        <Trash2 size={16} />
                                    </button>
                                </div>
                                {img.isCover && (
                                    <div className="absolute top-2 left-2 bg-yellow-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider shadow-sm">
                                        Cover
                                    </div>
                                )}
                            </div>
                            <div className="p-3 space-y-2">
                                <label className="flex items-center gap-2 py-1 cursor-pointer">
                                    <input type="radio" checked={img.isCover || false} onChange={() => setAsCover(i)} className="text-primary focus:ring-primary" />
                                    <span className="text-sm font-medium text-gray-700">Set as Cover</span>
                                </label>
                                <select value={img.category || 'other'} onChange={(e) => updateMediaField(i, 'category', e.target.value)} className="w-full px-2 py-1.5 text-xs border border-gray-200 rounded-lg outline-none focus:border-primary">
                                    <option value="exterior">Exterior</option>
                                    <option value="interior">Interior</option>
                                    <option value="rooms">Rooms</option>
                                    <option value="events">Events</option>
                                    <option value="other">Other</option>
                                </select>
                                <input type="text" value={img.caption || ''} onChange={(e) => updateMediaField(i, 'caption', e.target.value)} placeholder="Caption (optional)" className="w-full px-2 py-1.5 text-xs border border-gray-200 rounded-lg outline-none focus:border-primary" />
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}


function VenueReviewsTab({ venueId, onUpdate }) {
    const [reviews, setReviews] = useState([]);
    const [loading, setLoading] = useState(true);
    const [replyingTo, setReplyingTo] = useState(null);
    const [adminReply, setAdminReply] = useState('');
    const [updating, setUpdating] = useState(false);

    useEffect(() => {
        loadReviews();
    }, [venueId]);

    const loadReviews = async () => {
        try {
            setLoading(true);
            const data = await fetchVenueReviews(venueId);
            setReviews(data);
        } catch (err) {
            console.error('Failed to load reviews:', err);
        } finally {
            setLoading(false);
        }
    };

    const handleDeleteReview = async (id) => {
        if (!confirm('Delete this review?')) return;
        try {
            await deleteReviewAdmin(id);
            loadReviews();
            if (onUpdate) onUpdate(); // Refresh venue stats
        } catch (err) {
            alert(err.message);
        }
    };

    const handleReplySubmit = async (e) => {
        e.preventDefault();
        try {
            setUpdating(true);
            await updateReviewAdmin(replyingTo._id, { adminReply });
            setReplyingTo(null);
            setAdminReply('');
            loadReviews();
        } catch (err) {
            alert(err.message);
        } finally {
            setUpdating(false);
        }
    };

    if (loading) return <div className="flex justify-center p-12"><Loader2 className="animate-spin text-primary" /></div>;

    return (
        <div className="space-y-4">
            {reviews.length === 0 ? (
                <div className="text-center py-12 text-text-muted">No reviews yet for this venue.</div>
            ) : (
                <div className="space-y-4">
                    {reviews.map(review => (
                        <div key={review._id} className="p-4 border border-gray-100 rounded-xl bg-gray-50/50 space-y-3">
                            <div className="flex items-center justify-between">
                                <div>
                                    <div className="font-bold text-secondary text-sm">{review.userName}</div>
                                    <div className="flex items-center gap-1 text-[10px] text-text-muted">
                                        <Star size={10} className="text-yellow-500 fill-yellow-500" />
                                        {review.rating} • {new Date(review.createdAt).toLocaleDateString()}
                                    </div>
                                </div>
                                <div className="flex gap-2">
                                    <button 
                                        onClick={() => { setReplyingTo(review); setAdminReply(review.adminReply || ''); }}
                                        className="p-1.5 text-blue-600 hover:bg-white rounded shadow-sm transition-colors border border-transparent hover:border-blue-100"
                                    >
                                        <Reply size={14} />
                                    </button>
                                    <button 
                                        onClick={() => handleDeleteReview(review._id)}
                                        className="p-1.5 text-red-600 hover:bg-white rounded shadow-sm transition-colors border border-transparent hover:border-red-100"
                                    >
                                        <Trash2 size={14} />
                                    </button>
                                </div>
                            </div>
                            <p className="text-xs text-text leading-relaxed">"{review.comment}"</p>
                            
                            {review.adminReply && (
                                <div className="pl-3 border-l-2 border-primary bg-white/50 p-2 rounded-r-lg">
                                    <div className="text-[10px] font-bold text-primary uppercase mb-1">Admin Reply</div>
                                    <p className="text-[11px] italic text-secondary">"{review.adminReply}"</p>
                                </div>
                            )}

                            {replyingTo && replyingTo._id === review._id && (
                                <form onSubmit={handleReplySubmit} className="mt-3 space-y-2 animate-fade-in">
                                    <textarea 
                                        value={adminReply}
                                        onChange={e => setAdminReply(e.target.value)}
                                        placeholder="Type your reply..."
                                        className="w-full text-xs p-2 border border-gray-200 rounded-lg focus:ring-1 focus:ring-primary outline-none"
                                        rows={3}
                                    />
                                    <div className="flex gap-2 justify-end">
                                        <button type="button" onClick={() => setReplyingTo(null)} className="text-[10px] font-bold text-text-muted hover:text-secondary px-2">Cancel</button>
                                        <button type="submit" disabled={updating} className="bg-primary text-white text-[10px] font-bold py-1 px-3 rounded-lg hover:bg-primary-dark transition-all">
                                            {updating ? 'Saving...' : 'Post Reply'}
                                        </button>
                                    </div>
                                </form>
                            )}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
