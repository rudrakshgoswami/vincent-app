import { useEffect, useState } from 'react';
import {
    LayoutGrid,
    Plus,
    Edit2,
    Trash2,
    Search,
    RefreshCw,
    AlertCircle,
    X,
    Check,
    Image as ImageIcon,
    Loader2
} from 'lucide-react';
import {
    fetchAllCategoriesAdmin,
    createCategory,
    updateCategory,
    deleteCategory,
    fetchAllMenuItemsAdmin,
    createMenuItem,
    updateMenuItem,
    deleteMenuItem,
    uploadFile, getImageUrl
} from '../../api';
import ImageCropperModal from '../../components/ImageCropperModal';

export default function AdminMenuManagement() {
    const [categories, setCategories] = useState([]);
    const [menuItems, setMenuItems] = useState([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('items'); // 'items' or 'categories'
    const [error, setError] = useState('');
    const [searchQuery, setSearchQuery] = useState('');

    // Modal state
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [modalType, setModalType] = useState('item'); // 'item' or 'category'
    const [modalMode, setModalMode] = useState('add'); // 'add' or 'edit'
    const [currentItem, setCurrentItem] = useState(null);
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Form state
    const [formData, setFormData] = useState({
        name: '',
        description: '',
        price: '',
        category: '',
        isVeg: true,
        image: '',
        isAvailable: true
    });

    // Cropper State
    const [cropSource, setCropSource] = useState(null);
    const [isCropperOpen, setIsCropperOpen] = useState(false);

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        try {
            setLoading(true);
            const [categoriesRes, itemsRes] = await Promise.all([
                fetchAllCategoriesAdmin(),
                fetchAllMenuItemsAdmin()
            ]);
            setCategories(categoriesRes.data.categories || []);
            setMenuItems(itemsRes.data.items || []);
            setLoading(false);
        } catch (err) {
            setError(err.message || 'Failed to load menu data');
            setLoading(false);
        }
    };

    const handleOpenModal = (type, mode, data = null) => {
        setModalType(type);
        setModalMode(mode);
        setCurrentItem(data);
        if (mode === 'edit' && data) {
            setFormData({
                name: data.name || '',
                description: data.description || '',
                price: data.price || '',
                category: data.category?._id || data.category || '',
                isVeg: data.isVeg ?? true,
                image: data.image || '',
                isAvailable: data.isAvailable ?? true
            });
        } else {
            setFormData({
                name: '',
                description: '',
                price: '',
                category: categories[0]?._id || '',
                isVeg: true,
                image: '',
                isAvailable: true
            });
        }
        setIsModalOpen(true);
    };

    const handleImageSelect = (e) => {
        const file = e.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = () => {
            setCropSource(reader.result);
            setIsCropperOpen(true);
        };
        reader.readAsDataURL(file);
        e.target.value = '';
    };

    const handleCropComplete = async (croppedBlob) => {
        try {
            setIsSubmitting(true);
            setIsCropperOpen(false);
            const file = new File([croppedBlob], "cropped_menu_item.jpg", { type: "image/jpeg" });
            const response = await uploadFile(file);
            setFormData({ ...formData, image: response.url });
        } catch (err) {
            alert('Upload failed: ' + err.message);
        } finally {
            setIsSubmitting(false);
            setCropSource(null);
        }
    };

    const handleSubmit = async (e) => {
        if (e) e.preventDefault();
        try {
            setIsSubmitting(true);
            if (modalType === 'category') {
                if (modalMode === 'add') {
                    await createCategory({ name: formData.name, description: formData.description });
                } else {
                    await updateCategory(currentItem._id, { name: formData.name, description: formData.description });
                }
            } else {
                if (modalMode === 'add') {
                    await createMenuItem(formData);
                } else {
                    await updateMenuItem(currentItem._id, formData);
                }
            }
            await loadData();
            setIsModalOpen(false);
        } catch (err) {
            alert(err.message || 'Action failed');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleDelete = async (id, type) => {
        if (!confirm(`Are you sure you want to delete this ${type}?`)) return;
        try {
            if (type === 'category') {
                await deleteCategory(id);
            } else {
                await deleteMenuItem(id);
            }
            await loadData();
        } catch (err) {
            alert(err.message || 'Delete failed');
        }
    };

    const filteredItems = menuItems.filter(item =>
        item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.category?.name?.toLowerCase().includes(searchQuery.toLowerCase())
    );

    if (loading) {
        return (
            <div className="h-96 flex flex-col items-center justify-center">
                <Loader2 className="w-10 h-10 animate-spin text-primary mb-4" />
                <p className="text-text-muted">Loading menu items...</p>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h2 className="text-2xl font-heading text-secondary mb-1">Menu Management</h2>
                    <p className="text-text-muted text-sm">Create and manage your food categories and items</p>
                </div>
                <div className="flex items-center gap-3">
                    <button
                        onClick={loadData}
                        className="p-2 text-text-muted hover:text-secondary hover:bg-gray-100 rounded-lg transition-colors border border-gray-200"
                    >
                        <RefreshCw size={20} />
                    </button>
                    <button
                        onClick={() => handleOpenModal(activeTab === 'categories' ? 'category' : 'item', 'add')}
                        className="flex items-center gap-2 bg-primary text-white px-5 py-2.5 rounded-lg hover:bg-primary-dark transition-colors shadow-sm"
                    >
                        <Plus size={20} />
                        Add {activeTab === 'categories' ? 'Category' : 'Item'}
                    </button>
                </div>
            </div>

            {/* Error */}
            {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-lg flex items-center gap-3">
                    <AlertCircle size={20} />
                    <p>{error}</p>
                </div>
            )}

            {/* Tabs & Search */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-2 border border-gray-200 rounded-xl">
                <div className="flex p-1 bg-gray-50 rounded-lg">
                    <button
                        onClick={() => setActiveTab('items')}
                        className={`px-6 py-2 rounded-md text-sm font-medium transition-all ${activeTab === 'items' ? 'bg-white text-secondary shadow-sm' : 'text-text-muted hover:text-secondary'}`}
                    >
                        Menu Items
                    </button>
                    <button
                        onClick={() => setActiveTab('categories')}
                        className={`px-6 py-2 rounded-md text-sm font-medium transition-all ${activeTab === 'categories' ? 'bg-white text-secondary shadow-sm' : 'text-text-muted hover:text-secondary'}`}
                    >
                        Categories
                    </button>
                </div>
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                    <input
                        type="text"
                        placeholder={`Search ${activeTab}...`}
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-10 pr-4 py-2 bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary w-full md:w-64"
                    />
                </div>
            </div>

            {/* Content */}
            {activeTab === 'categories' ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {categories.map(cat => (
                        <div key={cat._id} className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition-shadow group">
                            <div className="flex justify-between items-start mb-4">
                                <div className="p-3 bg-primary/10 rounded-lg text-primary">
                                    <LayoutGrid size={24} />
                                </div>
                                <div className="flex gap-2">
                                    <button
                                        onClick={() => handleOpenModal('category', 'edit', cat)}
                                        className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors border border-transparent hover:border-blue-100"
                                    >
                                        <Edit2 size={16} />
                                    </button>
                                    <button
                                        onClick={() => handleDelete(cat._id, 'category')}
                                        className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors border border-transparent hover:border-red-100"
                                    >
                                        <Trash2 size={16} />
                                    </button>
                                </div>
                            </div>
                            <h3 className="text-xl font-heading text-secondary mb-2">{cat.name}</h3>
                            <p className="text-text-muted text-sm line-clamp-2 mb-4">{cat.description || 'No description provided.'}</p>
                            <div className="pt-4 border-t border-gray-100 flex items-center justify-between">
                                <span className="text-xs font-medium text-text-muted uppercase tracking-wider">
                                    {menuItems.filter(item => item.category?._id === cat._id).length} Items
                                </span>
                            </div>
                        </div>
                    ))}
                    {categories.length === 0 && (
                        <div className="col-span-full py-20 text-center bg-white border border-dashed border-gray-300 rounded-2xl">
                            <LayoutGrid size={48} className="mx-auto text-gray-300 mb-4" />
                            <p className="text-text-muted">No categories found. Create one to get started.</p>
                        </div>
                    )}
                </div>
            ) : (
                <div className="bg-white rounded-xl border border-gray-200 overflow-x-auto shadow-sm">
                    <table className="w-full text-left border-collapse min-w-[600px]">
                        <thead>
                            <tr className="border-b border-gray-200 bg-transparent text-left">
                                <th className="px-6 py-4 text-sm font-semibold text-secondary w-16">#</th>
                                <th className="px-6 py-4 text-sm font-semibold text-secondary">Name</th>
                                <th className="px-6 py-4 text-sm font-semibold text-secondary">Category</th>
                                <th className="px-6 py-4 text-sm font-semibold text-secondary">Tag</th>
                                <th className="px-6 py-4 text-sm font-semibold text-secondary min-w-[100px]">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredItems.map((item, index) => (
                                <tr key={item._id} className="border-b border-gray-100 hover:bg-gray-50/50 transition-colors group">
                                    <td className="px-6 py-4 text-sm text-gray-500 font-medium">
                                        {index + 1}
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-4">
                                            <div className="w-12 h-12 rounded-full overflow-hidden bg-gray-100 flex-shrink-0 border border-gray-100">
                                                {item.image ? (
                                                    <img src={getImageUrl(item.image)} alt={item.name} className="w-full h-full object-cover" />
                                                ) : (
                                                    <div className="w-full h-full flex items-center justify-center text-gray-400">
                                                        <ImageIcon size={20} />
                                                    </div>
                                                )}
                                            </div>
                                            <div className="flex flex-col flex-1">
                                                <span className="text-sm font-medium text-gray-800">{item.name}</span>
                                                <span className="text-[9px] text-gray-400 font-bold uppercase tracking-widest mt-0.5">{item.category?.name || 'Uncategorized'}</span>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 text-sm text-gray-600">
                                        {item.category?.name || '-'}
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="flex flex-wrap gap-2">
                                            {item.isVeg && (
                                                <span className="inline-flex items-center px-0 py-0.5 rounded text-xs font-medium text-green-600">
                                                    Veg
                                                </span>
                                            )}
                                            {!item.isAvailable && (
                                                <span className="inline-flex items-center px-0 py-0.5 rounded text-xs font-medium text-red-500 ml-1">
                                                    Out of Stock
                                                </span>
                                            )}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 align-middle">
                                        <div className="flex items-center justify-start gap-4">
                                            <button
                                                onClick={() => handleOpenModal('item', 'edit', item)}
                                                className="text-blue-500 hover:text-blue-600 transition-colors"
                                                title="Edit"
                                            >
                                                <Edit2 size={18} strokeWidth={2} />
                                            </button>
                                            <button
                                                onClick={() => handleDelete(item._id, 'item')}
                                                className="text-red-500 hover:text-red-600 transition-colors"
                                                title="Delete"
                                            >
                                                <Trash2 size={18} strokeWidth={2} />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                    {filteredItems.length === 0 && (
                        <div className="py-20 text-center bg-white border-t border-dashed border-gray-300">
                            <LayoutGrid size={48} className="mx-auto text-gray-300 mb-4" />
                            <p className="text-text-muted">No items found matching your search.</p>
                        </div>
                    )}
                </div>
            )}

            {/* Modal */}
            {isModalOpen && (
                <div className="fixed top-0 left-0 right-0 bottom-0 z-[9999] flex items-center justify-center p-4 bg-secondary/40 backdrop-blur-md animate-fade-in">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-xl max-h-[90vh] overflow-hidden flex flex-col animate-slide-up">
                        <div className="px-6 py-5 border-b border-gray-100 flex items-center justify-between">
                            <h3 className="text-xl font-heading text-secondary">
                                {modalMode === 'add' ? 'Add New' : 'Edit'} {modalType === 'category' ? 'Category' : 'Menu Item'}
                            </h3>
                            <button onClick={() => setIsModalOpen(false)} className="text-text-muted hover:text-secondary hover:bg-gray-100 p-2 rounded-lg transition-colors">
                                <X size={20} />
                            </button>
                        </div>
                        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-5">
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Name</label>
                                    <input
                                        type="text"
                                        value={formData.name}
                                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                        className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all"
                                        required
                                    />
                                </div>
                                {modalType === 'item' && (
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1.5">Price (₹)</label>
                                            <input
                                                type="number"
                                                value={formData.price}
                                                onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                                                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all"
                                                required
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1.5">Category</label>
                                            <select
                                                value={formData.category}
                                                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                                                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all"
                                                required
                                            >
                                                {categories.map(cat => (
                                                    <option key={cat._id} value={cat._id}>{cat.name}</option>
                                                ))}
                                            </select>
                                        </div>
                                    </div>
                                )}
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Description</label>
                                    <textarea
                                        value={formData.description}
                                        onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                        className="w-full h-32 px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all resize-none"
                                        rows="3"
                                    />
                                </div>
                                {modalType === 'item' && (
                                    <div className="space-y-4">
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1.5">Product Image</label>
                                            <div className="flex items-center gap-4">
                                                <div className="w-24 h-24 bg-gray-100 rounded-xl overflow-hidden flex items-center justify-center border border-dashed border-gray-300">
                                                    {formData.image ? (
                                                        <img src={getImageUrl(formData.image)} alt="Preview" className="w-full h-full object-cover" />
                                                    ) : (
                                                        <ImageIcon className="text-gray-400" size={32} />
                                                    )}
                                                </div>
                                                <div className="flex-1">
                                                    <input
                                                        type="file"
                                                        onChange={handleImageSelect}
                                                        accept="image/*"
                                                        className="hidden"
                                                        id="image-upload"
                                                    />
                                                    <label
                                                        htmlFor="image-upload"
                                                        className="inline-flex items-center gap-2 border border-gray-300 text-gray-700 px-4 py-2 rounded-lg cursor-pointer hover:bg-gray-50 transition-colors"
                                                    >
                                                        {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus size={18} />}
                                                        Upload Image
                                                    </label>
                                                    {formData.image && (
                                                        <button 
                                                            type="button"
                                                            onClick={() => {
                                                                setCropSource(getImageUrl(formData.image));
                                                                setIsCropperOpen(true);
                                                            }}
                                                            className="ml-2 bg-blue-50 text-blue-600 px-3 py-2 rounded-lg text-xs font-bold hover:bg-blue-100 border border-blue-100"
                                                        >
                                                            Edit Photo
                                                        </button>
                                                    )}
                                                    <p className="text-[10px] text-text-muted mt-2">Recommended: 800x600px, JPG or PNG</p>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="flex flex-wrap gap-6 pt-2">
                                            <label className="flex items-center gap-3 cursor-pointer group">
                                                <div
                                                    onClick={() => setFormData({ ...formData, isVeg: !formData.isVeg })}
                                                    className={`w-12 h-6 rounded-full transition-all relative ${formData.isVeg ? 'bg-green-500' : 'bg-gray-300'}`}
                                                >
                                                    <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${formData.isVeg ? 'left-7' : 'left-1'}`} />
                                                </div>
                                                <span className="text-sm font-medium text-gray-700 selection:bg-transparent">Vegetarian</span>
                                            </label>

                                            <label className="flex items-center gap-3 cursor-pointer group">
                                                <div
                                                    onClick={() => setFormData({ ...formData, isAvailable: !formData.isAvailable })}
                                                    className={`w-12 h-6 rounded-full transition-all relative ${formData.isAvailable ? 'bg-primary' : 'bg-gray-300'}`}
                                                >
                                                    <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${formData.isAvailable ? 'left-7' : 'left-1'}`} />
                                                </div>
                                                <span className="text-sm font-medium text-gray-700 selection:bg-transparent">In Stock</span>
                                            </label>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </form>
                        <div className="px-6 py-5 bg-gray-50 flex gap-3">
                            <button
                                onClick={() => setIsModalOpen(false)}
                                className="flex-1 py-3 border border-gray-300 rounded-xl text-sm font-medium text-gray-700 hover:bg-white transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleSubmit}
                                disabled={isSubmitting}
                                className="flex-1 py-3 bg-secondary text-white rounded-xl text-sm font-medium hover:bg-secondary/90 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                            >
                                {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check size={18} />}
                                {modalMode === 'add' ? 'Save Changes' : 'Update Item'}
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
                    aspect={1}
                />
            )}
        </div>
    );
}
