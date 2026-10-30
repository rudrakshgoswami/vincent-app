import { useEffect, useState } from 'react';
import {
    Plus, Edit2, Trash2, Search, RefreshCw, AlertCircle, X, Check,
    Loader2, Sparkles, Camera, Music, Truck, Gift, Palette,
    PartyPopper, Users
} from 'lucide-react';
import {
    fetchAllServicesAdmin, createServicePackage, updateServicePackage, deleteServicePackage
} from '../../api';

const SERVICE_CATEGORIES = [
    { value: 'decoration', label: 'Decoration', icon: Palette, emoji: '🎨' },
    { value: 'photography', label: 'Photography / Video', icon: Camera, emoji: '📸' },
    { value: 'entertainment', label: 'Entertainment', icon: Music, emoji: '🎵' },
    { value: 'transportation', label: 'Transportation', icon: Truck, emoji: '🚗' },
    { value: 'gifting', label: 'Gifts & Favors', icon: Gift, emoji: '🎁' },
    { value: 'planning', label: 'Event Planning', icon: PartyPopper, emoji: '🎉' },
    { value: 'staffing', label: 'Staff & Hosting', icon: Users, emoji: '👥' },
    { value: 'other', label: 'Other', icon: Sparkles, emoji: '✨' },
];

function fmt(n) { return n ? `₹${Number(n).toLocaleString('en-IN')}` : '—'; }

const DEFAULT_FORM = {
    name: '', category: 'decoration', description: '',
    price: '', priceType: 'fixed',
    inclusions: '', vendorName: '', vendorPhone: '',
    status: 'active', featured: false, tags: ''
};

export default function AdminServiceManagement() {
    const [services, setServices] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [searchQuery, setSearchQuery] = useState('');
    const [filterCat, setFilterCat] = useState('');

    // Modal
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [modalMode, setModalMode] = useState('add');
    const [currentItem, setCurrentItem] = useState(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [formData, setFormData] = useState({ ...DEFAULT_FORM });

    useEffect(() => { loadData(); }, []);

    const loadData = async () => {
        try {
            setLoading(true);
            const res = await fetchAllServicesAdmin();
            // Backend returns raw array
            setServices(Array.isArray(res) ? res : (res.data?.services || res.services || []));
        } catch (err) {
            setError(err.message || 'Failed to load services');
        } finally {
            setLoading(false);
        }
    };

    const openModal = (mode, data = null) => {
        setModalMode(mode);
        setCurrentItem(data);
        if (mode === 'edit' && data) {
            setFormData({
                name: data.name || '',
                category: data.category || 'decoration',
                description: data.description || '',
                price: data.price || '',
                priceType: data.priceType || 'fixed',
                inclusions: Array.isArray(data.inclusions) ? data.inclusions.join(', ') : (data.inclusions || ''),
                vendorName: data.vendor?.name || data.vendorName || '',
                vendorPhone: data.vendor?.phone || data.vendorPhone || '',
                status: data.status || 'active',
                featured: data.featured || false,
                tags: Array.isArray(data.tags) ? data.tags.join(', ') : (data.tags || ''),
            });
        } else {
            setFormData({ ...DEFAULT_FORM });
        }
        setIsModalOpen(true);
    };

    const handleSubmit = async () => {
        if (!formData.name.trim()) { alert('Name is required'); return; }
        try {
            setIsSubmitting(true);
            const payload = {
                ...formData,
                inclusions: typeof formData.inclusions === 'string' ? formData.inclusions.split(',').map(s => s.trim()).filter(Boolean) : formData.inclusions,
                tags: typeof formData.tags === 'string' ? formData.tags.split(',').map(s => s.trim()).filter(Boolean) : formData.tags,
                vendor: { name: formData.vendorName, phone: formData.vendorPhone },
            };
            delete payload.vendorName;
            delete payload.vendorPhone;
            if (modalMode === 'add') await createServicePackage(payload);
            else await updateServicePackage(currentItem._id, payload);
            await loadData();
            setIsModalOpen(false);
        } catch (err) {
            alert(err.message || 'Action failed');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleDelete = async (id) => {
        if (!confirm('Delete this service package? This cannot be undone.')) return;
        try {
            await deleteServicePackage(id);
            await loadData();
        } catch (err) {
            alert(err.message || 'Delete failed');
        }
    };

    const getCatInfo = (cat) => SERVICE_CATEGORIES.find(c => c.value === cat) || SERVICE_CATEGORIES[SERVICE_CATEGORIES.length - 1];

    const filtered = services.filter(s => {
        if (filterCat && s.category !== filterCat) return false;
        if (searchQuery && !s.name?.toLowerCase().includes(searchQuery.toLowerCase())) return false;
        return true;
    });

    // Group by category for visual
    const grouped = {};
    filtered.forEach(s => {
        const cat = s.category || 'other';
        if (!grouped[cat]) grouped[cat] = [];
        grouped[cat].push(s);
    });

    if (loading) {
        return (
            <div className="h-96 flex flex-col items-center justify-center">
                <Loader2 className="w-10 h-10 animate-spin text-primary mb-4" />
                <p className="text-text-muted">Loading services...</p>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h2 className="text-2xl font-heading text-secondary mb-1">Service Packages</h2>
                    <p className="text-text-muted text-sm">{services.length} services across {new Set(services.map(s => s.category)).size} categories</p>
                </div>
                <div className="flex items-center gap-3">
                    <button onClick={loadData} className="p-2 text-text-muted hover:text-secondary hover:bg-gray-100 rounded-lg transition-colors border border-gray-200">
                        <RefreshCw size={20} />
                    </button>
                    <button onClick={() => openModal('add')}
                        className="flex items-center gap-2 bg-primary text-white px-5 py-2.5 rounded-lg hover:bg-primary-dark transition-colors shadow-sm">
                        <Plus size={20} /> Add Service
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
                <div className="flex flex-wrap gap-2">
                    <button onClick={() => setFilterCat('')}
                        className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all border ${!filterCat ? 'bg-secondary text-white border-secondary' : 'bg-white text-gray-600 border-gray-300 hover:border-secondary'}`}>
                        All
                    </button>
                    {SERVICE_CATEGORIES.map(c => (
                        <button key={c.value} onClick={() => setFilterCat(c.value)}
                            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all border ${filterCat === c.value ? 'bg-secondary text-white border-secondary' : 'bg-white text-gray-600 border-gray-300 hover:border-secondary'}`}>
                            {c.emoji} {c.label}
                        </button>
                    ))}
                </div>
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                    <input type="text" placeholder="Search services..." value={searchQuery}
                        onChange={e => setSearchQuery(e.target.value)}
                        className="pl-10 pr-4 py-2 bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary w-full md:w-64" />
                </div>
            </div>

            {/* Service Cards */}
            {Object.entries(grouped).length > 0 ? (
                Object.entries(grouped).map(([cat, items]) => {
                    const catInfo = getCatInfo(cat);
                    const CatIcon = catInfo.icon;
                    return (
                        <div key={cat}>
                            <h3 className="text-lg font-heading text-secondary mb-3 flex items-center gap-2">
                                <span className="text-xl">{catInfo.emoji}</span> {catInfo.label}
                                <span className="text-xs text-text-muted font-normal">({items.length})</span>
                            </h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5 mb-6">
                                {items.map(svc => (
                                    <div key={svc._id} className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm hover:shadow-md transition-all group">
                                        <div className="flex items-start justify-between mb-3">
                                            <div className="flex items-center gap-3">
                                                <div className="p-2.5 bg-primary/10 rounded-lg text-primary">
                                                    <CatIcon size={20} />
                                                </div>
                                                <div>
                                                    <h4 className="text-base font-heading text-secondary">{svc.name}</h4>
                                                    {svc.vendor?.name && <p className="text-[10px] text-text-muted">by {svc.vendor.name}</p>}
                                                </div>
                                            </div>
                                            <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <button onClick={() => openModal('edit', svc)} className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg"><Edit2 size={15} /></button>
                                                <button onClick={() => handleDelete(svc._id)} className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg"><Trash2 size={15} /></button>
                                            </div>
                                        </div>

                                        <p className="text-2xl font-heading text-primary mb-2">
                                            {fmt(svc.price)}{svc.priceType === 'per_person' && <span className="text-xs text-text-muted font-normal"> /person</span>}
                                        </p>

                                        {svc.description && <p className="text-xs text-text-muted line-clamp-2 mb-3">{svc.description}</p>}

                                        {svc.inclusions?.length > 0 && (
                                            <div className="flex flex-wrap gap-1 mb-3">
                                                {svc.inclusions.slice(0, 3).map((inc, i) => (
                                                    <span key={i} className="text-[10px] bg-green-50 text-green-700 px-2 py-0.5 rounded-full border border-green-100">✓ {inc}</span>
                                                ))}
                                                {svc.inclusions.length > 3 && <span className="text-[10px] text-text-muted">+{svc.inclusions.length - 3} more</span>}
                                            </div>
                                        )}

                                        <div className="flex items-center justify-between pt-3 border-t border-gray-100 text-xs text-text-muted">
                                            {svc.featured && <span className="text-primary font-bold">⭐ Featured</span>}
                                            <span className={`font-bold uppercase ml-auto ${svc.status === 'active' ? 'text-green-600' : 'text-red-500'}`}>
                                                {svc.status === 'active' ? '● Active' : '● Inactive'}
                                            </span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    );
                })
            ) : (
                <div className="py-20 text-center bg-white border border-dashed border-gray-300 rounded-2xl">
                    <Sparkles size={48} className="mx-auto text-gray-300 mb-4" />
                    <p className="text-text-muted">No services found.</p>
                </div>
            )}

            {/* Modal */}
            {isModalOpen && (
                <div className="fixed top-0 left-0 right-0 bottom-0 z-[9999] flex items-center justify-center p-4 bg-secondary/80 backdrop-blur-md animate-fade-in">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-xl max-h-[90vh] overflow-hidden flex flex-col animate-scale-up">
                        <div className="px-6 py-5 border-b border-gray-100 flex items-center justify-between">
                            <h3 className="text-xl font-heading text-secondary">
                                {modalMode === 'add' ? '➕ Add Service' : '✏️ Edit Service'}
                            </h3>
                            <button onClick={() => setIsModalOpen(false)} className="text-text-muted hover:text-secondary hover:bg-gray-100 p-2 rounded-lg transition-colors">
                                <X size={20} />
                            </button>
                        </div>

                        <div className="flex-1 overflow-y-auto p-6 space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Service Name <span className="text-red-500">*</span></label>
                                    <input value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })}
                                        className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary outline-none" required />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Category</label>
                                    <select value={formData.category} onChange={e => setFormData({ ...formData, category: e.target.value })}
                                        className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary outline-none">
                                        {SERVICE_CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.emoji} {c.label}</option>)}
                                    </select>
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1.5">Description</label>
                                <textarea value={formData.description} onChange={e => setFormData({ ...formData, description: e.target.value })}
                                    className="w-full h-20 px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary outline-none resize-none" />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Price (₹) <span className="text-red-500">*</span></label>
                                    <input type="number" value={formData.price} onChange={e => setFormData({ ...formData, price: e.target.value })}
                                        className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary outline-none" required />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Price Type</label>
                                    <select value={formData.priceType} onChange={e => setFormData({ ...formData, priceType: e.target.value })}
                                        className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary outline-none">
                                        <option value="fixed">Fixed</option>
                                        <option value="per_person">Per Person</option>
                                        <option value="per_hour">Per Hour</option>
                                    </select>
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1.5">Inclusions (comma-separated)</label>
                                <input value={formData.inclusions} onChange={e => setFormData({ ...formData, inclusions: e.target.value })}
                                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary outline-none"
                                    placeholder="Stage setup, Flower decoration, LED Lighting..." />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Vendor Name</label>
                                    <input value={formData.vendorName} onChange={e => setFormData({ ...formData, vendorName: e.target.value })}
                                        className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary outline-none" />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Vendor Phone</label>
                                    <input value={formData.vendorPhone} onChange={e => setFormData({ ...formData, vendorPhone: e.target.value })}
                                        className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary outline-none" />
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Status</label>
                                    <select value={formData.status} onChange={e => setFormData({ ...formData, status: e.target.value })}
                                        className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary outline-none">
                                        <option value="active">Active</option>
                                        <option value="inactive">Inactive</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Tags (comma-separated)</label>
                                    <input value={formData.tags} onChange={e => setFormData({ ...formData, tags: e.target.value })}
                                        className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary outline-none"
                                        placeholder="wedding, stage, floral..." />
                                </div>
                            </div>
                            <label className="flex items-center gap-3 cursor-pointer">
                                <div onClick={() => setFormData({ ...formData, featured: !formData.featured })}
                                    className={`w-12 h-6 rounded-full transition-all relative ${formData.featured ? 'bg-primary' : 'bg-gray-300'}`}>
                                    <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${formData.featured ? 'left-7' : 'left-1'}`} />
                                </div>
                                <span className="text-sm font-medium text-gray-700">Featured Service</span>
                            </label>
                        </div>

                        <div className="px-6 py-5 bg-gray-50 flex gap-3 border-t">
                            <button onClick={() => setIsModalOpen(false)}
                                className="flex-1 py-3 border border-gray-300 rounded-xl text-sm font-medium text-gray-700 hover:bg-white transition-colors">
                                Cancel
                            </button>
                            <button onClick={handleSubmit} disabled={isSubmitting}
                                className="flex-1 py-3 bg-secondary text-white rounded-xl text-sm font-medium hover:bg-secondary/90 transition-colors disabled:opacity-50 flex items-center justify-center gap-2">
                                {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check size={18} />}
                                {modalMode === 'add' ? 'Create Service' : 'Update Service'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
