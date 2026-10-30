import { useEffect, useState } from 'react';
import {
    Plus, Edit2, Trash2, Search, RefreshCw, AlertCircle, X, Check,
    Loader2, Utensils, Package, Tag, Coffee
} from 'lucide-react';
import {
    fetchAllCateringPackagesAdmin, createCateringPackage, updateCateringPackage, deleteCateringPackage,
    fetchCateringCategories, createCateringCategory, updateCateringCategory, deleteCateringCategory,
    fetchCateringFoodItems, createCateringFoodItem, updateCateringFoodItem, deleteCateringFoodItem,
    fetchCateringLiveCounters, createCateringLiveCounter, updateCateringLiveCounter, deleteCateringLiveCounter,
    fetchAllCateringExtrasAdmin, createCateringExtra, updateCateringExtra, deleteCateringExtra,
    uploadFile, getImageUrl
} from '../../api';
import ImageCropperModal from '../../components/ImageCropperModal';

function fmt(n) { return n ? `₹${Number(n).toLocaleString('en-IN')}` : '—'; }

export default function AdminCateringManagement() {
    const [activeTab, setActiveTab] = useState('packages');
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    const [packages, setPackages] = useState([]);
    const [categories, setCategories] = useState([]);
    const [foodItems, setFoodItems] = useState([]);
    const [liveCounters, setLiveCounters] = useState([]);
    const [extras, setExtras] = useState([]);
    const [searchQuery, setSearchQuery] = useState('');

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [modalMode, setModalMode] = useState('add');
    const [currentItem, setCurrentItem] = useState(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isUploading, setIsUploading] = useState(false);

    // Form states matching new schema
    const [pkgForm, setPkgForm] = useState({ name: '', description: '', pricePerPlate: '', minGuests: 50, maxGuests: 1000, isActive: true, thumbnail: '' });
    const [catForm, setCatForm] = useState({ name: '', selectionLimit: 1, packageLimits: [], packageIds: [], isMandatory: true, sortOrder: 0, image: '' });
    const [itemForm, setItemForm] = useState({ name: '', description: '', categoryId: '', packageIds: [], isAvailable: true, isJain: false, image: '', hasVariants: false, variants: [], variantPackageLimits: [] });
    const [counterForm, setCounterForm] = useState({ name: '', description: '', isAddOn: false, addOnPricePerPlate: 0, packageIds: [], image: '', varieties: [] });
    const [extraForm, setExtraForm] = useState({ name: '', description: '', pricingType: 'per_plate', price: '', isActive: true });

    // Cropper State
    const [cropSource, setCropSource] = useState(null);
    const [isCropperOpen, setIsCropperOpen] = useState(false);
    const [cropTarget, setCropTarget] = useState({ type: '', idx: null }); // type: 'package', 'category', 'item', 'counter', 'variant'

    useEffect(() => { loadData(); }, []);

    const loadData = async () => {
        try {
            setLoading(true);
            const [pkgRes, catRes, itemRes, counterRes, extRes] = await Promise.all([
                fetchAllCateringPackagesAdmin(),
                fetchCateringCategories(),
                fetchCateringFoodItems(),
                fetchCateringLiveCounters(),
                fetchAllCateringExtrasAdmin()
            ]);
            setPackages(pkgRes.packages || []);
            setCategories(catRes.categories || []);
            setFoodItems(itemRes.items || []);
            setLiveCounters(counterRes.counters || []);
            setExtras(extRes.extras || []);
        } catch (err) {
            setError(err.message || 'Failed to load data');
        } finally {
            setLoading(false);
        }
    };

    const openModal = (mode, data = null) => {
        setModalMode(mode);
        setCurrentItem(data);
        if (activeTab === 'packages') {
            setPkgForm(data ? { ...data } : { name: '', description: '', pricePerPlate: '', minGuests: 50, maxGuests: 1000, isActive: true });
        } else if (activeTab === 'categories') {
            setCatForm(data ? { 
                ...data, 
                packageLimits: data.packageLimits || [],
                packageIds: data.packageIds?.map(p => p._id || p) || [],
                image: data.image || ''
            } : { name: '', selectionLimit: 1, packageLimits: [], packageIds: [], isMandatory: true, sortOrder: 0, image: '' });
        } else if (activeTab === 'items') {
            setItemForm(data ? { 
                ...data, 
                categoryId: data.categoryId?._id || data.categoryId, 
                packageIds: data.packageIds?.map(p => p._id || p) || [],
                hasVariants: data.hasVariants || false,
                variants: data.variants || [],
                variantPackageLimits: data.variantPackageLimits || [],
                isJain: !!data.isJain
            } : { name: '', description: '', categoryId: categories[0]?._id || '', packageIds: [], isAvailable: true, isJain: false, hasVariants: false, variants: [], variantPackageLimits: [] });
        } else if (activeTab === 'counters') {
            setCounterForm(data ? { ...data, packageIds: data.packageIds?.map(p => p._id || p) || [], varieties: data.varieties || [] } : { name: '', description: '', isAddOn: false, addOnPricePerPlate: 0, packageIds: [], varieties: [] });
        } else if (activeTab === 'extras') {
            setExtraForm(data ? { ...data } : { name: '', description: '', pricingType: 'per_plate', price: '', isActive: true });
        }
        setIsModalOpen(true);
    };

    const handleImageSelect = (e, type, idx = null) => {
        const file = e.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = () => {
            setCropSource(reader.result);
            setCropTarget({ type, idx });
            setIsCropperOpen(true);
        };
        reader.readAsDataURL(file);
        // Reset input so same file can be selected again
        e.target.value = '';
    };

    const handleCropComplete = async (croppedBlob) => {
        try {
            setIsUploading(true);
            setIsCropperOpen(false);
            const file = new File([croppedBlob], "cropped_image.jpg", { type: "image/jpeg" });
            const res = await uploadFile(file);
            
            const type = cropTarget.type;
            const idx = cropTarget.idx;

            if (type === 'package') setPkgForm(prev => ({ ...prev, thumbnail: res.url }));
            else if (type === 'category') setCatForm(prev => ({ ...prev, image: res.url }));
            else if (type === 'item') setItemForm(prev => ({ ...prev, image: res.url }));
            else if (type === 'counter') setCounterForm(prev => ({ ...prev, image: res.url }));
            else if (type === 'counterVariety' && idx !== null) {
                const nv = [...counterForm.varieties];
                nv[idx].image = res.url;
                setCounterForm({ ...counterForm, varieties: nv });
            } else if (type === 'variant' && idx !== null) {
                const nv = [...itemForm.variants];
                nv[idx].image = res.url;
                setItemForm({ ...itemForm, variants: nv });
            }
        } catch (err) {
            alert(err.message || 'Upload failed');
        } finally {
            setIsUploading(false);
            setCropSource(null);
        }
    };

    const handleSubmit = async () => {
        try {
            setIsSubmitting(true);
            if (activeTab === 'packages') {
                if (modalMode === 'add') await createCateringPackage(pkgForm);
                else await updateCateringPackage(currentItem._id, pkgForm);
            } else if (activeTab === 'categories') {
                const sanitizedCat = {
                    ...catForm,
                    packageLimits: (catForm.packageLimits || []).map(l => ({
                        ...l,
                        limit: parseInt(l.limit) || 1
                    })),
                    selectionLimit: parseInt(catForm.packageLimits[0]?.limit) || 1
                };
                if (modalMode === 'add') await createCateringCategory(sanitizedCat);
                else await updateCateringCategory(currentItem._id, sanitizedCat);
            } else if (activeTab === 'items') {
                if (modalMode === 'add') await createCateringFoodItem(itemForm);
                else await updateCateringFoodItem(currentItem._id, itemForm);
            } else if (activeTab === 'counters') {
                if (modalMode === 'add') await createCateringLiveCounter(counterForm);
                else await updateCateringLiveCounter(currentItem._id, counterForm);
            } else if (activeTab === 'extras') {
                if (modalMode === 'add') await createCateringExtra(extraForm);
                else await updateCateringExtra(currentItem._id, extraForm);
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
        if (!confirm('Are you sure you want to delete this item?')) return;
        try {
            if (activeTab === 'packages') await deleteCateringPackage(id);
            else if (activeTab === 'categories') await deleteCateringCategory(id);
            else if (activeTab === 'items') await deleteCateringFoodItem(id);
            else if (activeTab === 'counters') await deleteCateringLiveCounter(id);
            else if (activeTab === 'extras') await deleteCateringExtra(id);
            await loadData();
        } catch (err) {
            alert(err.message || 'Delete failed');
        }
    };

    const togglePackageLimit = (pkgId) => {
        const limits = [...catForm.packageLimits];
        const existingId = (typeof pkgId === 'object') ? pkgId._id : pkgId;
        const existingIdx = limits.findIndex(l => {
            const lid = l.packageId?._id || l.packageId;
            return lid === existingId;
        });
        
        let newLimits;
        if (existingIdx > -1) {
            newLimits = limits.filter((_, i) => i !== existingIdx);
        } else {
            newLimits = [...limits, { packageId: existingId, limit: 1 }];
        }
        
        setCatForm({ 
            ...catForm, 
            packageLimits: newLimits,
            packageIds: newLimits.map(l => l.packageId?._id || l.packageId)
        });
    };

    const updatePackageLimitValue = (pkgId, value) => {
        const targetId = (pkgId?._id || pkgId || '').toString();
        const numValue = value === '' ? '' : parseInt(value);
        
        setCatForm(prev => ({
            ...prev,
            packageLimits: prev.packageLimits.map(l => {
                const lid = (l.packageId?._id || l.packageId || '').toString();
                if (lid === targetId) return { ...l, limit: numValue };
                return l;
            })
        }));
    };

    const updateVariantPackageLimitValue = (pkgId, value) => {
        const targetId = (pkgId?._id || pkgId || '').toString();
        const numValue = value === '' ? '' : parseInt(value);
        
        setItemForm(prev => {
            const limits = [...prev.variantPackageLimits];
            const idx = limits.findIndex(l => (l.packageId?._id || l.packageId || '').toString() === targetId);
            
            if (idx > -1) {
                limits[idx] = { ...limits[idx], limit: numValue };
            } else {
                limits.push({ packageId: targetId, limit: numValue });
            }
            
            return { ...prev, variantPackageLimits: limits };
        });
    };

    const togglePackageSelectionArray = (pkgId, formGetter, formSetter, arrayKey) => {
        const pkgs = [...formGetter[arrayKey]];
        if (pkgs.includes(pkgId)) formSetter({ ...formGetter, [arrayKey]: pkgs.filter(id => id !== pkgId) });
        else formSetter({ ...formGetter, [arrayKey]: [...pkgs, pkgId] });
    };

    if (loading) return <div className="p-10 text-center"><Loader2 className="animate-spin inline-block mr-2" /> Loading...</div>;

    const renderTabs = () => (
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
            <div className="flex flex-wrap gap-2">
                {['packages', 'categories', 'items', 'counters', 'extras'].map(tab => (
                    <button key={tab} onClick={() => { setActiveTab(tab); setSearchQuery(''); }}
                        className={`px-4 py-2 capitalize font-medium rounded-lg transition-all ${activeTab === tab ? 'bg-primary text-white shadow-md' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
                        {tab.replace('-', ' ')}
                    </button>
                ))}
            </div>
            
            <div className="relative w-full md:w-64">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                <input 
                    type="text" 
                    placeholder={`Search ${activeTab}...`}
                    className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                />
                {searchQuery && (
                    <button 
                        onClick={() => setSearchQuery('')}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    >
                        <X size={14} />
                    </button>
                )}
            </div>
        </div>
    );

    const filteredPackages = packages.filter(p => 
        p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.description?.toLowerCase().includes(searchQuery.toLowerCase())
    );
    const filteredCategories = categories.filter(c => 
        c.name.toLowerCase().includes(searchQuery.toLowerCase())
    );
    const filteredFoodItems = foodItems.filter(i => 
        i.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        i.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        i.categoryId?.name?.toLowerCase().includes(searchQuery.toLowerCase())
    );
    const filteredLiveCounters = liveCounters.filter(c => 
        c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.description?.toLowerCase().includes(searchQuery.toLowerCase())
    );
    const filteredExtras = extras.filter(e => 
        e.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        e.description?.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h2 className="text-2xl font-bold">Catering System</h2>
                <button onClick={() => openModal('add')} className="bg-primary text-white px-4 py-2 rounded-lg flex items-center gap-2">
                    <Plus size={18} /> Add New
                </button>
            </div>
            {error && <div className="text-red-500 bg-red-50 p-3 rounded">{error}</div>}

            {renderTabs()}

            {/* List Views */}
            <div className="bg-white rounded-lg shadow border border-gray-100 p-4 overflow-x-auto">
                {activeTab === 'packages' && (
                    <table className="w-full text-left">
                        <thead><tr className="border-b"><th className="pb-2 w-12 text-gray-500 font-semibold">#</th><th className="pb-2">Name</th><th className="pb-2">Price/Plate</th><th className="pb-2">Actions</th></tr></thead>
                        <tbody>
                            {filteredPackages.map((p, index) => (
                                <tr key={p._id} className="border-b">
                                    <td className="py-2 text-gray-500 text-sm font-medium">{index + 1}</td>
                                    <td className="py-2">
                                        <div className="flex items-center gap-3">
                                            {p.thumbnail && <img src={getImageUrl(p.thumbnail)} alt={p.name} className="w-10 h-10 rounded object-cover border" />}
                                            <span>{p.name} {p.isActive ? '' : '(Inactive)'}</span>
                                        </div>
                                    </td>
                                    <td className="py-2">{fmt(p.pricePerPlate)}</td>
                                    <td className="py-2 flex gap-2">
                                        <button onClick={() => openModal('edit', p)} className="p-1 text-blue-500"><Edit2 size={16} /></button>
                                        <button onClick={() => handleDelete(p._id)} className="p-1 text-red-500"><Trash2 size={16} /></button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
                {activeTab === 'packages' && filteredPackages.length === 0 && (
                    <div className="py-12 text-center">
                        <Package className="mx-auto text-gray-300 mb-2" size={40} />
                        <p className="text-gray-500 font-medium">No packages found {searchQuery && `for "${searchQuery}"`}</p>
                    </div>
                )}

                {activeTab === 'categories' && (
                    <table className="w-full text-left">
                        <thead><tr className="border-b"><th className="pb-2 w-12 text-gray-500 font-semibold">#</th><th className="pb-2">Name</th><th className="pb-2">Limit</th><th className="pb-2">Mandatory</th><th className="pb-2">Actions</th></tr></thead>
                        <tbody>
                            {filteredCategories.map((c, index) => (
                                <tr key={c._id} className="border-b">
                                    <td className="py-2 text-gray-500 text-sm font-medium">{index + 1}</td>
                                    <td className="py-2">{c.name}</td>
                                    <td className="py-2">
                                        <div className="flex flex-wrap gap-1">
                                            {c.packageLimits?.map(l => {
                                                const pkgName = packages.find(p => p._id === (l.packageId?._id || l.packageId))?.name;
                                                return pkgName ? (
                                                    <span key={l.packageId?._id || l.packageId} className="text-[9px] bg-blue-50 text-blue-600 px-1.5 py-0.5 rounded border border-blue-100 font-bold whitespace-nowrap">
                                                        {pkgName}: {l.limit}
                                                    </span>
                                                ) : null;
                                            })}
                                        </div>
                                    </td>
                                    <td className="py-2">
                                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${c.isMandatory ? 'bg-orange-100 text-orange-600' : 'bg-gray-100 text-gray-500'}`}>
                                            {c.isMandatory ? 'MANDATORY' : 'OPTIONAL'}
                                        </span>
                                    </td>
                                    <td className="py-2 flex gap-2">
                                        <button onClick={() => openModal('edit', c)} className="p-1 text-blue-500"><Edit2 size={16} /></button>
                                        <button onClick={() => handleDelete(c._id)} className="p-1 text-red-500"><Trash2 size={16} /></button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
                {activeTab === 'categories' && filteredCategories.length === 0 && (
                    <div className="py-12 text-center">
                        <Tag className="mx-auto text-gray-300 mb-2" size={40} />
                        <p className="text-gray-500 font-medium">No categories found {searchQuery && `for "${searchQuery}"`}</p>
                    </div>
                )}

                {activeTab === 'items' && (
                    <table className="w-full text-left">
                        <thead><tr className="border-b"><th className="pb-2 w-12 text-gray-500 font-semibold">#</th><th className="pb-2">Name</th><th className="pb-2">Category</th><th className="pb-2">Tag</th><th className="pb-2">Actions</th></tr></thead>
                        <tbody>
                            {filteredFoodItems.map((i, index) => (
                                <tr key={i._id} className="border-b hover:bg-gray-50/50 transition-colors">
                                    <td className="py-2 text-gray-500 text-sm font-medium">{index + 1}</td>
                                    <td className="py-2">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-lg overflow-hidden border border-gray-100 flex-shrink-0">
                                                <img 
                                                    src={i.image ? getImageUrl(i.image) : `https://source.unsplash.com/100x100/?${encodeURIComponent(i.name)},food`} 
                                                    alt={i.name} 
                                                    className="w-full h-full object-cover" 
                                                />
                                            </div>
                                            <div className="min-w-0">
                                                <p className="font-medium text-gray-900 truncate">{i.name}</p>
                                                <p className="text-[10px] text-gray-500 uppercase tracking-wider">{i.categoryId?.name || 'Uncategorized'}</p>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="py-2">{i.categoryId?.name || '-'}</td>
                                    <td className="py-2 mb-1">
                                        <div className="flex flex-col gap-1">
                                            {i.isAvailable === false && <span className="text-[10px] text-orange-500 font-bold uppercase">Unavailable</span>}
                                        </div>
                                    </td>
                                    <td className="py-2 flex gap-2">
                                        <button onClick={() => openModal('edit', i)} className="p-1 text-blue-500"><Edit2 size={16} /></button>
                                        <button onClick={() => handleDelete(i._id)} className="p-1 text-red-500"><Trash2 size={16} /></button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
                {activeTab === 'items' && filteredFoodItems.length === 0 && (
                    <div className="py-12 text-center">
                        <Utensils className="mx-auto text-gray-300 mb-2" size={40} />
                        <p className="text-gray-500 font-medium">No items found {searchQuery && `for "${searchQuery}"`}</p>
                    </div>
                )}

                {activeTab === 'counters' && (
                    <table className="w-full text-left">
                        <thead><tr className="border-b"><th className="pb-2 w-12 text-gray-500 font-semibold">#</th><th className="pb-2">Name</th><th className="pb-2">Included / Extra Price</th><th className="pb-2">Actions</th></tr></thead>
                        <tbody>
                            {filteredLiveCounters.map((c, index) => (
                                <tr key={c._id} className="border-b">
                                    <td className="py-2 text-gray-500 text-sm font-medium">{index + 1}</td>
                                    <td className="py-2">
                                        <div className="flex items-center gap-3">
                                            {c.image && <img src={getImageUrl(c.image)} alt={c.name} className="w-10 h-10 rounded object-cover border" />}
                                            <span>{c.name}</span>
                                        </div>
                                    </td>
                                    <td className="py-2">{!c.isAddOn ? 'Included' : fmt(c.addOnPricePerPlate)}</td>
                                    <td className="py-2 flex gap-2">
                                        <button onClick={() => openModal('edit', c)} className="p-1 text-blue-500"><Edit2 size={16} /></button>
                                        <button onClick={() => handleDelete(c._id)} className="p-1 text-red-500"><Trash2 size={16} /></button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
                {activeTab === 'counters' && filteredLiveCounters.length === 0 && (
                    <div className="py-12 text-center">
                        <Coffee className="mx-auto text-gray-300 mb-2" size={40} />
                        <p className="text-gray-500 font-medium">No live counters found {searchQuery && `for "${searchQuery}"`}</p>
                    </div>
                )}

                {activeTab === 'extras' && (
                    <table className="w-full text-left">
                        <thead><tr className="border-b"><th className="pb-2 w-12 text-gray-500 font-semibold">#</th><th className="pb-2">Name</th><th className="pb-2">Price</th><th className="pb-2">Actions</th></tr></thead>
                        <tbody>
                            {filteredExtras.map((e, index) => (
                                <tr key={e._id} className="border-b">
                                    <td className="py-2 text-gray-500 text-sm font-medium">{index + 1}</td>
                                    <td className="py-2">{e.name}</td>
                                    <td className="py-2 text-primary">{e.pricingType === 'per_plate' ? fmt(e.price) + '/plate' : fmt(e.price) + ' (flat)'}</td>
                                    <td className="py-2 flex gap-2">
                                        <button onClick={() => openModal('edit', e)} className="p-1 text-blue-500"><Edit2 size={16} /></button>
                                        <button onClick={() => handleDelete(e._id)} className="p-1 text-red-500"><Trash2 size={16} /></button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
                {activeTab === 'extras' && filteredExtras.length === 0 && (
                    <div className="py-12 text-center">
                        <Plus className="mx-auto text-gray-300 mb-2" size={40} />
                        <p className="text-gray-500 font-medium">No extras found {searchQuery && `for "${searchQuery}"`}</p>
                    </div>
                )}
            </div>

            {/* Modal */}
            {isModalOpen && (
                <div className="overlay-premium z-[9999]" onClick={() => setIsModalOpen(false)}>
                    <div className="bg-white rounded-xl shadow-xl w-full max-w-lg p-6 my-8" onClick={e => e.stopPropagation()}>
                        <h3 className="text-xl font-bold mb-4 capitalize">{modalMode} {activeTab.replace('-', ' ')}</h3>
                        
                        {/* Image Upload Component Helper */}
                        {['packages', 'categories', 'items', 'counters'].includes(activeTab) && (
                            <div className="mb-6">
                                <label className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-2 block">Item Image</label>
                                <div className="flex items-center gap-4">
                                    <div className="w-24 h-24 rounded-2xl border-2 border-dashed border-gray-200 flex items-center justify-center overflow-hidden bg-gray-50 relative group">
                                        {activeTab === 'packages' && pkgForm.thumbnail ? (
                                            <img src={getImageUrl(pkgForm.thumbnail)} className="w-full h-full object-cover" />
                                        ) : activeTab === 'categories' && catForm.image ? (
                                            <img src={getImageUrl(catForm.image)} className="w-full h-full object-cover" />
                                        ) : activeTab === 'items' && itemForm.image ? (
                                            <img src={getImageUrl(itemForm.image)} className="w-full h-full object-cover" />
                                        ) : activeTab === 'counters' && counterForm.image ? (
                                            <img src={getImageUrl(counterForm.image)} className="w-full h-full object-cover" />
                                        ) : (
                                            <div className="text-gray-300 flex flex-col items-center">
                                                <Utensils size={24} />
                                                <span className="text-[10px] mt-1">No Image</span>
                                            </div>
                                        )}
                                        {isUploading && (
                                            <div className="absolute inset-0 bg-black/40 flex items-center justify-center text-white">
                                                <Loader2 size={16} className="animate-spin" />
                                            </div>
                                        )}
                                    </div>
                                    <div className="flex-1">
                                        <p className="text-[10px] text-gray-500 mb-3 leading-relaxed">Recommended size: 800x600px. Supports JPG, PNG, WebP.</p>
                                        <label className="bg-white border border-gray-200 text-secondary px-4 py-2 rounded-xl text-xs font-bold cursor-pointer hover:bg-gray-50 transition-colors inline-flex items-center gap-2 shadow-sm">
                                            <Plus size={14} />
                                            {isUploading ? 'Uploading...' : 'Choose Photo'}
                                            <input 
                                                type="file" 
                                                className="hidden" 
                                                accept="image/*"
                                                onChange={(e) => {
                                                    const typeMap = { 'packages': 'package', 'categories': 'category', 'items': 'item', 'counters': 'counter' };
                                                    handleImageSelect(e, typeMap[activeTab]);
                                                }}
                                            />
                                        </label>
                                        {(activeTab === 'packages' ? pkgForm.thumbnail : activeTab === 'categories' ? catForm.image : activeTab === 'items' ? itemForm.image : counterForm.image) && (
                                            <button 
                                                onClick={() => {
                                                    const url = getImageUrl(activeTab === 'packages' ? pkgForm.thumbnail : activeTab === 'categories' ? catForm.image : activeTab === 'items' ? itemForm.image : counterForm.image);
                                                    setCropSource(url);
                                                    setCropTarget({ type: activeTab === 'packages' ? 'package' : activeTab === 'categories' ? 'category' : activeTab === 'items' ? 'item' : 'counter', idx: null });
                                                    setIsCropperOpen(true);
                                                }}
                                                className="ml-2 bg-blue-50 text-blue-600 px-3 py-2 rounded-xl text-xs font-bold hover:bg-blue-100 border border-blue-100"
                                            >
                                                Edit Crop
                                            </button>
                                        )}
                                    </div>
                                </div>
                            </div>
                        )}

                        <div className="space-y-4 max-h-[60vh] overflow-y-auto p-1">

                            {/* Package Form */}
                            {activeTab === 'packages' && (
                                <>
                                    <div className="space-y-1">
                                        <label className="text-xs font-semibold text-gray-500 ml-1">Package Name</label>
                                        <input placeholder="Name" className="w-full border p-2 rounded" value={pkgForm.name} onChange={e => setPkgForm({ ...pkgForm, name: e.target.value })} />
                                    </div>
                                    <textarea placeholder="Description" className="w-full border p-2 rounded" value={pkgForm.description} onChange={e => setPkgForm({ ...pkgForm, description: e.target.value })} />
                                    <div className="space-y-1">
                                        <label className="text-xs font-semibold text-gray-500 ml-1">Price Per Person (₹)</label>
                                        <input type="number" placeholder="Price Per Plate" className="w-full border p-2 rounded" value={pkgForm.pricePerPlate} onChange={e => setPkgForm({ ...pkgForm, pricePerPlate: e.target.value })} />
                                    </div>
                                    <div className="flex gap-4">
                                        <div className="flex-1 space-y-1">
                                            <label className="text-xs font-semibold text-gray-500 ml-1">Min Guest Entry</label>
                                            <input type="number" placeholder="50" className="w-full border p-2 rounded" value={pkgForm.minGuests} onChange={e => setPkgForm({ ...pkgForm, minGuests: e.target.value })} />
                                        </div>
                                        <div className="flex-1 space-y-1">
                                            <label className="text-xs font-semibold text-gray-500 ml-1">Max Guest Capacity</label>
                                            <input type="number" placeholder="1000" className="w-full border p-2 rounded" value={pkgForm.maxGuests} onChange={e => setPkgForm({ ...pkgForm, maxGuests: e.target.value })} />
                                        </div>
                                    </div>
                                    <div className="flex gap-2">
                                        <label className="flex items-center gap-2"><input type="checkbox" checked={pkgForm.isActive} onChange={e => setPkgForm({ ...pkgForm, isActive: e.target.checked })} /> Active</label>
                                    </div>
                                </>
                            )}

                            {/* Category Form */}
                            {activeTab === 'categories' && (
                                <>
                                    <div className="space-y-1">
                                        <label className="text-xs font-semibold text-gray-500 ml-1">Category Name (e.g. Starters)</label>
                                        <input placeholder="Name" className="w-full border p-2 rounded" value={catForm.name} onChange={e => setCatForm({ ...catForm, name: e.target.value })} />
                                    </div>

                                    <label className="flex items-center gap-2"><input type="checkbox" checked={catForm.isMandatory} onChange={e => setCatForm({ ...catForm, isMandatory: e.target.checked })} /> Mandatory (Customer must select items)</label>
                                    <h4 className="font-bold pt-2 mt-2 border-t text-sm">Applies To Packages & Limits</h4>
                                    <div className="space-y-3">
                                        {packages.map(p => {
                                            const pid = (p._id || p || '').toString();
                                            const isSelected = catForm.packageIds.some(id => (id?._id || id || '').toString() === pid);
                                            const limitObj = catForm.packageLimits.find(l => (l.packageId?._id || l.packageId || '').toString() === pid);
                                            
                                            return (
                                                <div key={pid} className="flex items-center justify-between p-2 border rounded-lg hover:bg-gray-50 transition-colors">
                                                    <label className="flex items-center gap-3 cursor-pointer flex-1">
                                                        <input 
                                                            type="checkbox" 
                                                            checked={isSelected} 
                                                            onChange={() => togglePackageLimit(p._id)} 
                                                            className="w-4 h-4 text-primary rounded border-gray-300 focus:ring-primary"
                                                        />
                                                        <span className="text-sm font-medium text-gray-700">{p.name}</span>
                                                    </label>
                                                    
                                                    {isSelected && (
                                                        <div className="flex items-center gap-2 animate-fade-in">
                                                            <span className="text-[10px] font-bold text-gray-400 uppercase">Limit:</span>
                                                            <input 
                                                                type="text" 
                                                                inputMode="numeric"
                                                                className="w-16 border rounded p-1 text-center text-xs font-bold focus:ring-1 focus:ring-primary focus:border-primary outline-none"
                                                                value={limitObj?.limit ?? ''}
                                                                onChange={(e) => {
                                                                    const val = e.target.value.replace(/[^0-9]/g, '');
                                                                    updatePackageLimitValue(pid, val);
                                                                }}
                                                                placeholder="1"
                                                            />
                                                        </div>
                                                    )}
                                                </div>
                                            );
                                        })}
                                    </div>
                                </>
                            )}

                            {/* Food Item Form */}
                            {activeTab === 'items' && (
                                <>
                                    <input placeholder="Name" className="w-full border p-2 rounded" value={itemForm.name} onChange={e => setItemForm({ ...itemForm, name: e.target.value })} />
                                    <textarea placeholder="Description" className="w-full border p-2 rounded" value={itemForm.description} onChange={e => setItemForm({ ...itemForm, description: e.target.value })} />
                                    <select className="w-full border p-2 rounded" value={itemForm.categoryId} onChange={e => setItemForm({ ...itemForm, categoryId: e.target.value })}>
                                        <option value="">Select Category</option>
                                        {categories.map(c => <option key={c._id} value={c._id}>{c.name}</option>)}
                                    </select>

                                    <div className="flex flex-col gap-2 pt-2">
                                        <label className="flex items-center gap-2"><input type="checkbox" checked={itemForm.isAvailable} onChange={e => setItemForm({ ...itemForm, isAvailable: e.target.checked })} /> Available</label>
                                        <label className="flex items-center gap-2 text-green-700 font-bold"><input type="checkbox" checked={itemForm.isJain} onChange={e => setItemForm({ ...itemForm, isJain: e.target.checked })} /> 🌿 Supports Jain Preparation</label>
                                    </div>
                                    
                                    {/* Variants Section */}
                                    <div className="border-t pt-4 mt-4 space-y-4">
                                        <div className="flex items-center justify-between">
                                            <h4 className="font-bold text-sm">Item Variants (Options/Flavors)</h4>
                                            <label className="flex items-center gap-2 text-xs cursor-pointer bg-gray-50 px-2 py-1 rounded border">
                                                <input type="checkbox" checked={itemForm.hasVariants} onChange={e => setItemForm({ ...itemForm, hasVariants: e.target.checked })} />
                                                Enable Variants
                                            </label>
                                        </div>

                                        {itemForm.hasVariants && (
                                            <div className="space-y-4 p-3 bg-gray-50 rounded-xl border border-gray-100">
                                                <h5 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest border-b pb-2 mb-2">Package Selection Limits</h5>
                                                <div className="space-y-2">
                                                    {packages.filter(p => itemForm.packageIds.includes(p._id)).map(p => {
                                                        const pid = p._id.toString();
                                                        const limitObj = itemForm.variantPackageLimits.find(l => (l.packageId?._id || l.packageId || '').toString() === pid);
                                                        return (
                                                            <div key={pid} className="flex items-center justify-between gap-4 p-2 bg-white rounded-lg border">
                                                                <span className="text-xs font-medium text-gray-700">{p.name}</span>
                                                                <div className="flex items-center gap-2">
                                                                    <span className="text-[9px] font-bold text-gray-400">PICK LIMIT:</span>
                                                                    <input 
                                                                        type="number" 
                                                                        className="w-12 border rounded p-1 text-center text-xs font-bold"
                                                                        value={limitObj?.limit ?? 1}
                                                                        onChange={(e) => updateVariantPackageLimitValue(pid, e.target.value)}
                                                                        min="1"
                                                                    />
                                                                </div>
                                                            </div>
                                                        );
                                                    })}
                                                    {itemForm.packageIds.length === 0 && <p className="text-[10px] text-orange-500 italic">Select packages below first to set variant limits.</p>}
                                                </div>

                                                <h5 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest border-b pb-2 mb-2 mt-4">Manage Flavors</h5>
                                                <div className="space-y-3">
                                                    {itemForm.variants.map((v, idx) => (
                                                        <div key={idx} className="flex flex-col gap-2 p-3 bg-white border rounded-xl shadow-sm">
                                                            <div className="flex gap-2">
                                                                <input 
                                                                    placeholder="Variant Name (e.g. Mango)" 
                                                                    className="flex-1 border p-1.5 rounded text-sm font-medium" 
                                                                    value={v.name} 
                                                                    onChange={(e) => {
                                                                        const nv = [...itemForm.variants];
                                                                        nv[idx].name = e.target.value;
                                                                        setItemForm({ ...itemForm, variants: nv });
                                                                    }}
                                                                />
                                                                <button 
                                                                    type="button" 
                                                                    onClick={() => {
                                                                        const nv = itemForm.variants.filter((_, i) => i !== idx);
                                                                        setItemForm({ ...itemForm, variants: nv });
                                                                    }}
                                                                    className="text-red-500 p-1.5 hover:bg-red-50 rounded"
                                                                >
                                                                    <Trash2 size={16} />
                                                                </button>
                                                            </div>
                                                            <div className="flex items-center gap-3">
                                                                <div className="w-12 h-12 rounded-lg bg-gray-50 border border-dashed flex items-center justify-center overflow-hidden shrink-0">
                                                                    {v.image ? (
                                                                        <img src={getImageUrl(v.image)} className="w-full h-full object-cover" />
                                                                    ) : (
                                                                        <Utensils size={14} className="text-gray-300" />
                                                                    )}
                                                                </div>
                                                                <label className="text-[10px] font-bold bg-gray-100 text-gray-600 px-3 py-1.5 rounded-lg cursor-pointer hover:bg-gray-200 transition-colors">
                                                                    {v.image ? 'Change Image' : 'Add Image'}
                                                                    <input 
                                                                        type="file" 
                                                                        className="hidden" 
                                                                        accept="image/*"
                                                                        onChange={(e) => handleImageSelect(e, 'variant', idx)}
                                                                    />
                                                                </label>
                                                                {v.image && (
                                                                    <button 
                                                                        type="button"
                                                                        onClick={() => {
                                                                            setCropSource(getImageUrl(v.image));
                                                                            setCropTarget({ type: 'variant', idx });
                                                                            setIsCropperOpen(true);
                                                                        }}
                                                                        className="text-[10px] font-bold text-blue-600 hover:underline"
                                                                    >
                                                                        Adjust
                                                                    </button>
                                                                )}
                                                            </div>
                                                        </div>
                                                    ))}
                                                    <button 
                                                        type="button"
                                                        onClick={() => setItemForm({ ...itemForm, variants: [...itemForm.variants, { name: '', image: '' }] })}
                                                        className="w-full py-2 border-2 border-dashed border-gray-200 rounded-lg text-xs font-bold text-gray-400 hover:border-primary/30 hover:text-primary transition-colors flex items-center justify-center gap-2"
                                                    >
                                                        <Plus size={14} /> Add Flavor
                                                    </button>
                                                </div>
                                            </div>
                                        )}
                                    </div>

                                    <h4 className="font-bold pt-2 mt-2 border-t text-sm">Available in Packages</h4>
                                    <div className="flex flex-wrap gap-2 text-sm">
                                        {packages.map(p => (
                                            <label key={p._id} className="flex items-center gap-1 border p-1 px-2 rounded cursor-pointer">
                                                <input type="checkbox" checked={itemForm.packageIds.includes(p._id)} onChange={() => togglePackageSelectionArray(p._id, itemForm, setItemForm, 'packageIds')} />
                                                {p.name}
                                            </label>
                                        ))}
                                    </div>
                                </>
                            )}

                            {/* Live Counter Form */}
                            {activeTab === 'counters' && (
                                <>
                                    <input placeholder="Counter Name" className="w-full border p-2 rounded" value={counterForm.name} onChange={e => setCounterForm({ ...counterForm, name: e.target.value })} />
                                    <textarea placeholder="Description" className="w-full border p-2 rounded" value={counterForm.description} onChange={e => setCounterForm({ ...counterForm, description: e.target.value })} />
                                    <label className="flex items-center gap-2"><input type="checkbox" checked={counterForm.isAddOn} onChange={e => setCounterForm({ ...counterForm, isAddOn: e.target.checked })} /> Is Add-On (Costs Extra)</label>
                                    {counterForm.isAddOn && <input type="number" placeholder="Add-On Price Per Plate" className="w-full border p-2 rounded" value={counterForm.addOnPricePerPlate} onChange={e => setCounterForm({ ...counterForm, addOnPricePerPlate: e.target.value })} />}
                                    
                                    {/* Counter Varieties Section */}
                                    <div className="border-t pt-4 mt-4 space-y-4">
                                        <h4 className="font-bold text-sm">Counter Varieties (Items included)</h4>
                                        <div className="space-y-3 p-3 bg-gray-50 rounded-xl border border-gray-100">
                                            {counterForm.varieties.map((v, idx) => (
                                                <div key={idx} className="flex flex-col gap-2 p-3 bg-white border rounded-xl shadow-sm animate-fade-in">
                                                    <div className="flex gap-2">
                                                        <div className="flex-1 space-y-2">
                                                            <input 
                                                                placeholder="Variety Name (e.g. Mixed Veg Pasta)" 
                                                                className="w-full border p-1.5 rounded text-sm font-bold" 
                                                                value={v.name} 
                                                                onChange={(e) => {
                                                                    const nv = [...counterForm.varieties];
                                                                    nv[idx].name = e.target.value;
                                                                    setCounterForm({ ...counterForm, varieties: nv });
                                                                }}
                                                            />
                                                            <textarea 
                                                                placeholder="Variety Description" 
                                                                className="w-full border p-1.5 rounded text-xs" 
                                                                value={v.description} 
                                                                onChange={(e) => {
                                                                    const nv = [...counterForm.varieties];
                                                                    nv[idx].description = e.target.value;
                                                                    setCounterForm({ ...counterForm, varieties: nv });
                                                                }}
                                                            />
                                                        </div>
                                                        <button 
                                                            type="button" 
                                                            onClick={() => {
                                                                const nv = counterForm.varieties.filter((_, i) => i !== idx);
                                                                setCounterForm({ ...counterForm, varieties: nv });
                                                            }}
                                                            className="text-red-500 p-1.5 hover:bg-red-50 rounded h-fit"
                                                        >
                                                            <Trash2 size={16} />
                                                        </button>
                                                    </div>
                                                    <div className="flex items-center gap-3">
                                                        <div className="w-12 h-12 rounded-lg bg-gray-50 border border-dashed flex items-center justify-center overflow-hidden shrink-0">
                                                            {v.image ? (
                                                                <img src={getImageUrl(v.image)} className="w-full h-full object-cover" />
                                                            ) : (
                                                                <Utensils size={14} className="text-gray-300" />
                                                            )}
                                                        </div>
                                                        <label className="text-[10px] font-bold bg-gray-100 text-gray-600 px-3 py-1.5 rounded-lg cursor-pointer hover:bg-gray-200 transition-colors">
                                                            {v.image ? 'Change Image' : 'Add Image'}
                                                            <input 
                                                                type="file" 
                                                                className="hidden" 
                                                                accept="image/*"
                                                                onChange={(e) => handleImageSelect(e, 'counterVariety', idx)}
                                                            />
                                                        </label>
                                                        {v.image && (
                                                            <button 
                                                                type="button"
                                                                onClick={() => {
                                                                    setCropSource(getImageUrl(v.image));
                                                                    setCropTarget({ type: 'counterVariety', idx });
                                                                    setIsCropperOpen(true);
                                                                }}
                                                                className="text-[10px] font-bold text-blue-600 hover:underline"
                                                            >
                                                                Adjust
                                                            </button>
                                                        )}
                                                    </div>
                                                </div>
                                            ))}
                                            <button 
                                                type="button"
                                                onClick={() => setCounterForm({ ...counterForm, varieties: [...counterForm.varieties, { name: '', description: '', image: '' }] })}
                                                className="w-full py-2 border-2 border-dashed border-gray-200 rounded-lg text-xs font-bold text-gray-400 hover:border-primary/30 hover:text-primary transition-colors flex items-center justify-center gap-2"
                                            >
                                                <Plus size={14} /> Add Variety
                                            </button>
                                        </div>
                                    </div>

                                    <h4 className="font-bold pt-2 mt-2 border-t text-sm">Available in Packages</h4>
                                    <div className="flex flex-wrap gap-2 text-sm">
                                        {packages.map(p => (
                                            <label key={p._id} className="flex items-center gap-1 border p-1 px-2 rounded cursor-pointer">
                                                <input type="checkbox" checked={counterForm.packageIds.includes(p._id)} onChange={() => togglePackageSelectionArray(p._id, counterForm, setCounterForm, 'packageIds')} />
                                                {p.name}
                                            </label>
                                        ))}
                                    </div>
                                </>
                            )}

                            {/* Extras Form */}
                            {activeTab === 'extras' && (
                                <>
                                    <input placeholder="Addon Name (e.g. Midnight Snack)" className="w-full border p-2 rounded" value={extraForm.name} onChange={e => setExtraForm({ ...extraForm, name: e.target.value })} />
                                    <textarea placeholder="Description" className="w-full border p-2 rounded" value={extraForm.description} onChange={e => setExtraForm({ ...extraForm, description: e.target.value })} />
                                    <select className="w-full border p-2 rounded" value={extraForm.pricingType} onChange={e => setExtraForm({ ...extraForm, pricingType: e.target.value })}>
                                        <option value="per_plate">Per Plate</option>
                                        <option value="flat">Flat Fee</option>
                                    </select>
                                    <input type="number" placeholder="Price" className="w-full border p-2 rounded" value={extraForm.price} onChange={e => setExtraForm({ ...extraForm, price: e.target.value })} />
                                    <label className="flex items-center gap-2"><input type="checkbox" checked={extraForm.isActive} onChange={e => setExtraForm({ ...extraForm, isActive: e.target.checked })} /> Active</label>
                                </>
                            )}

                        </div>
                        <div className="flex gap-2 mt-6 pt-4 border-t">
                            <button onClick={() => setIsModalOpen(false)} className="flex-1 bg-gray-100 p-2 rounded">Cancel</button>
                            <button onClick={handleSubmit} disabled={isSubmitting} className="flex-1 bg-secondary text-white p-2 rounded flex justify-center items-center">
                                {isSubmitting ? <Loader2 className="animate-spin w-4 h-4" /> : 'Save'}
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
                    aspect={4 / 3}
                />
            )}
        </div>
    );
}
