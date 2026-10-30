import { useEffect, useState } from 'react';
import {
    Plus,
    Search,
    Filter,
    Edit2,
    Trash2,
    Lock,
    Unlock,
    Grid3x3,
    List,
    MapPin,
    Users,
    RefreshCw,
    X,
    IndianRupee,
    Layout,
    Wind,
    Coffee,
    Sparkles,
    Shield
} from 'lucide-react';
import {
    fetchAllTablesAdmin,
    createTable,
    updateTable,
    deleteTable,
    toggleBlockTable
} from '../../api';

export default function TableManagement() {
    const [tables, setTables] = useState([]);
    const [filteredTables, setFilteredTables] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [viewMode, setViewMode] = useState('grid');

    const [areaFilter, setAreaFilter] = useState('all');
    const [statusFilter, setStatusFilter] = useState('all');
    const [searchTerm, setSearchTerm] = useState('');

    const [showModal, setShowModal] = useState(false);
    const [modalMode, setModalMode] = useState('create');
    const [selectedTable, setSelectedTable] = useState(null);

    const initialFormState = {
        tableNumber: '',
        capacity: 2,
        shape: 'square',
        area: 'Indoor',
        acType: 'AC',
        floor: 'Ground',
        reservationPrice: 100,
        position: { x: 50, y: 50 },
        preferences: [],
        description: '',
        isActive: true
    };
    const [formData, setFormData] = useState(initialFormState);

    useEffect(() => {
        loadTables();
    }, []);

    useEffect(() => {
        filterTables();
    }, [tables, areaFilter, statusFilter, searchTerm]);

    const loadTables = async () => {
        try {
            setLoading(true);
            const response = await fetchAllTablesAdmin();
            setTables(response.data.tables || []);
            setLoading(false);
        } catch (err) {
            setError(err.message || 'Failed to load tables');
            setLoading(false);
        }
    };

    const filterTables = () => {
        let filtered = [...tables];
        if (areaFilter !== 'all') filtered = filtered.filter(table => table.area === areaFilter);
        if (statusFilter === 'active') filtered = filtered.filter(table => table.isActive && !table.isBlocked);
        else if (statusFilter === 'blocked') filtered = filtered.filter(table => table.isBlocked);
        else if (statusFilter === 'inactive') filtered = filtered.filter(table => !table.isActive);

        if (searchTerm) {
            filtered = filtered.filter(table =>
                table.tableNumber?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                table.description?.toLowerCase().includes(searchTerm.toLowerCase())
            );
        }
        setFilteredTables(filtered);
    };

    const handleOpenModal = (mode, table = null) => {
        setModalMode(mode);
        if (mode === 'edit' && table) {
            setSelectedTable(table);
            setFormData({
                ...table,
                preferences: table.preferences || [],
                position: table.position || { x: 50, y: 50 }
            });
        } else {
            setSelectedTable(null);
            setFormData(initialFormState);
        }
        setShowModal(true);
    };

    const handleCloseModal = () => {
        setShowModal(false);
        setSelectedTable(null);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            if (modalMode === 'create') await createTable(formData);
            else await updateTable(selectedTable._id, formData);
            await loadTables();
            handleCloseModal();
        } catch (err) {
            alert(`Failed: ${err.message}`);
        }
    };

    const handleDelete = async (id) => {
        if (!confirm('Permanent deletion is irreversible. Continue?')) return;
        try {
            await deleteTable(id);
            await loadTables();
        } catch (err) {
            alert(err.message);
        }
    };

    const handleToggleBlock = async (id, currentStatus) => {
        const reason = !currentStatus ? prompt('Reason for blocking:') : '';
        if (!currentStatus && !reason) return;
        try {
            await toggleBlockTable(id, !currentStatus, reason);
            await loadTables();
        } catch (err) {
            alert(err.message);
        }
    };

    const PositionPicker = ({ value, onChange }) => (
        <div className="relative w-full aspect-[16/9] bg-surfaceDark/5 border-2 border-dashed border-border rounded-xl overflow-hidden group cursor-crosshair shadow-inner-soft"
            onClick={(e) => {
                const rect = e.currentTarget.getBoundingClientRect();
                const x = Math.round(((e.clientX - rect.left) / rect.width) * 100);
                const y = Math.round(((e.clientY - rect.top) / rect.height) * 100);
                onChange({ x, y });
            }}
        >
            <div className="absolute inset-0 grid grid-cols-12 grid-rows-6 opacity-20 pointer-events-none">
                {[...Array(72)].map((_, i) => <div key={i} className="border border-secondary/10" />)}
            </div>

            {tables.map(t => (
                <div key={t._id}
                    className={`absolute w-4 h-4 rounded-full ${t._id === selectedTable?._id ? 'hidden' : 'bg-secondary/10 border border-secondary/20'} flex items-center justify-center text-[6px] font-bold text-secondary`}
                    style={{ left: `${t.position?.x}%`, top: `${t.position?.y}%`, transform: 'translate(-50%, -50%)' }}
                >
                    {t.tableNumber}
                </div>
            ))}

            <div className="absolute w-8 h-8 bg-primary rounded-full shadow-premium flex items-center justify-center transform -translate-x-1/2 -translate-y-1/2 transition-all duration-300 ring-4 ring-primary/20"
                style={{ left: `${value.x}%`, top: `${value.y}%` }}
            >
                <MapPin className="w-4 h-4 text-white" />
            </div>
            <div className="absolute bottom-3 right-3 glass px-3 py-1 text-[10px] font-black uppercase tracking-widest text-secondary">
                X:{value.x}% Y:{value.y}%
            </div>
        </div>
    );

    const preferenceOptions = ['Window', 'Private', 'Garden View', 'Near Entrance', 'Corner', 'Central'];

    return (
        <div className="px-6 py-8 animate-fade-in">
            {/* Page Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-12">
                <div>
                    <h1 className="text-4xl font-heading text-secondary mb-2">Architectural Layout</h1>
                    <p className="text-text-muted text-sm uppercase tracking-widest font-bold">
                        {filteredTables.length} Active Structures Curated
                    </p>
                </div>
                <div className="flex gap-4">
                    <button onClick={loadTables} className="btn-outline flex items-center gap-2 px-6 py-3 bg-white">
                        <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
                        Sync
                    </button>
                    <button onClick={() => handleOpenModal('create')} className="btn-primary flex items-center gap-2 px-8">
                        <Plus size={18} /> Add Table
                    </button>
                </div>
            </div>

            {/* Premium Control Bar */}
            <div className="bg-white p-4 rounded-2xl border border-border shadow-premium mb-10 flex flex-wrap gap-4 items-center">
                <div className="relative flex-1 min-w-[280px] group">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-primary/50 group-focus-within:text-primary transition-colors" size={20} />
                    <input
                        type="text"
                        placeholder="Search by index or description..."
                        className="input-premium pl-12 py-3 border-transparent bg-surface focus:bg-white"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>

                <div className="flex gap-2 bg-surface p-1 rounded-xl border border-border">
                    {['all', 'Indoor', 'Outdoor', 'Rooftop'].map(a => (
                        <button
                            key={a}
                            onClick={() => setAreaFilter(a)}
                            className={`px-5 py-2 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all ${areaFilter === a ? 'bg-white text-secondary shadow-sm' : 'text-text-muted hover:text-primary'}`}
                        >
                            {a}
                        </button>
                    ))}
                </div>

                <div className="h-8 w-px bg-border" />

                <div className="flex bg-surface rounded-xl p-1 border border-border">
                    <button onClick={() => setViewMode('grid')} className={`p-2.5 rounded-lg transition-all ${viewMode === 'grid' ? 'bg-white shadow-sm text-primary' : 'text-text-muted hover:text-secondary'}`}>
                        <Grid3x3 size={20} />
                    </button>
                    <button onClick={() => setViewMode('list')} className={`p-2.5 rounded-lg transition-all ${viewMode === 'list' ? 'bg-white shadow-sm text-primary' : 'text-text-muted hover:text-secondary'}`}>
                        <List size={20} />
                    </button>
                </div>
            </div>

            {loading ? (
                <div className="flex flex-col items-center justify-center py-32 grayscale opacity-40">
                    <Coffee className="w-12 h-12 text-secondary mb-4 animate-bounce" />
                    <p className="text-[10px] font-black uppercase tracking-[0.3em]">Rendering Blueprints...</p>
                </div>
            ) : filteredTables.length === 0 ? (
                <div className="text-center py-32 bg-white rounded-3xl border border-border border-dashed shadow-inner-soft">
                    <Layout size={60} className="text-text-muted/20 mx-auto mb-6" />
                    <h3 className="text-2xl font-heading text-secondary mb-2">No Structures Defined</h3>
                    <p className="text-text-muted text-sm uppercase tracking-widest font-bold mb-8">Begin by initializing a new table entry.</p>
                    <button onClick={() => handleOpenModal('create')} className="btn-outline px-10">Initialize First Table</button>
                </div>
            ) : viewMode === 'grid' ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
                    {filteredTables.map(table => (
                        <div key={table._id} className={`card-premium group relative overflow-hidden transition-all duration-500 hover:-translate-y-2 ${table.isBlocked ? 'border-red-100 opacity-60 grayscale-[0.5]' : ''}`}>
                            <div className="flex items-center justify-between mb-6">
                                <div className="w-14 h-14 rounded-2xl bg-secondary text-white flex items-center justify-center text-2xl font-heading group-hover:scale-110 transition-transform shadow-premium">
                                    {table.tableNumber}
                                </div>
                                <div className="flex flex-col items-end gap-1">
                                    <div className="badge-premium !text-[8px]">{table.area}</div>
                                    <div className="text-[9px] font-black text-text-muted uppercase tracking-widest">{table.shape}</div>
                                </div>
                            </div>

                            <div className="space-y-4 mb-8">
                                <div className="flex items-center justify-between text-xs font-bold uppercase tracking-widest">
                                    <div className="flex items-center gap-2 text-text-muted">
                                        <Users size={14} className="text-primary" /> Capacity
                                    </div>
                                    <span className="text-secondary">{table.capacity} Guests</span>
                                </div>
                                <div className="flex items-center justify-between text-xs font-bold uppercase tracking-widest">
                                    <div className="flex items-center gap-2 text-text-muted">
                                        <IndianRupee size={14} className="text-primary" /> Pre-payment
                                    </div>
                                    <span className="text-secondary">₹{table.reservationPrice}</span>
                                </div>
                                <div className="flex items-center justify-between text-xs font-bold uppercase tracking-widest">
                                    <div className="flex items-center gap-2 text-text-muted">
                                        <Wind size={14} className="text-primary" /> Environment
                                    </div>
                                    <span className={`px-2 py-0.5 rounded ${table.acType === 'AC' ? 'bg-blue-50 text-blue-600' : 'bg-gray-50 text-gray-600'}`}>
                                        {table.acType}
                                    </span>
                                </div>
                            </div>

                            <div className="flex gap-2 pt-6 border-t border-border opacity-0 group-hover:opacity-100 transition-all transform translate-y-4 group-hover:translate-y-0">
                                <button onClick={() => handleOpenModal('edit', table)} className="flex-1 py-2.5 bg-surface text-secondary text-[10px] font-black uppercase tracking-widest rounded-lg border border-border hover:border-primary transition-colors">Edit</button>
                                <button onClick={() => handleToggleBlock(table._id, table.isBlocked)} className={`px-4 py-2.5 rounded-lg text-[10px] font-black uppercase tracking-widest ${table.isBlocked ? 'bg-green-50 text-green-600' : 'bg-orange-50 text-orange-600'}`}>
                                    {table.isBlocked ? <Unlock size={14} /> : <Lock size={14} />}
                                </button>
                                <button onClick={() => handleDelete(table._id)} className="px-4 py-2.5 bg-red-50 text-red-600 rounded-lg hover:bg-red-600 hover:text-white transition-colors">
                                    <Trash2 size={14} />
                                </button>
                            </div>

                            {table.isBlocked && (
                                <div className="absolute top-2 left-2 p-1.5 bg-white rounded-full shadow-sm text-red-600 border border-red-100">
                                    <Lock size={12} />
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            ) : (
                <div className="bg-white rounded-3xl border border-border overflow-hidden shadow-premium">
                    <table className="w-full">
                        <thead className="bg-secondary text-white/50 text-[9px] font-black uppercase tracking-[0.2em]">
                            <tr>
                                <th className="px-8 py-4 text-left">Ref Index</th>
                                <th className="px-8 py-4 text-left">Dimensional Capacity</th>
                                <th className="px-8 py-4 text-left">Zone Allocation</th>
                                <th className="px-8 py-4 text-left">Service Potential</th>
                                <th className="px-8 py-4 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-border">
                            {filteredTables.map(table => (
                                <tr key={table._id} className="hover:bg-surface/50 transition-colors group">
                                    <td className="px-8 py-6">
                                        <div className="flex items-center gap-4">
                                            <div className="w-10 h-10 bg-secondary rounded-xl flex items-center justify-center text-white font-heading text-lg">#{table.tableNumber}</div>
                                            <span className="text-xs font-bold uppercase tracking-widest text-secondary">{table.shape} Structure</span>
                                        </div>
                                    </td>
                                    <td className="px-8 py-6">
                                        <span className="text-xs font-black text-secondary uppercase tracking-widest">{table.capacity} Guests</span>
                                    </td>
                                    <td className="px-8 py-6">
                                        <div className="flex items-center gap-2">
                                            <div className="badge-premium !text-[8px]">{table.area}</div>
                                            <span className="text-[10px] text-text-muted font-bold opacity-50">{table.floor} Floor</span>
                                        </div>
                                    </td>
                                    <td className="px-8 py-6">
                                        <span className={`text-[10px] font-black uppercase tracking-widest ${table.isBlocked ? 'text-red-500' : 'text-green-600'}`}>
                                            {table.isBlocked ? 'Deactivated' : 'operational'}
                                        </span>
                                    </td>
                                    <td className="px-8 py-6 text-right">
                                        <div className="flex justify-end gap-3 lg:opacity-0 group-hover:opacity-100 transition-opacity">
                                            <button onClick={() => handleOpenModal('edit', table)} className="p-2 hover:text-primary transition-colors"><Edit2 size={16} /></button>
                                            <button onClick={() => handleDelete(table._id)} className="p-2 hover:text-red-500 transition-colors"><Trash2 size={16} /></button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {/* Premium Table Modal */}
            {showModal && (
                <div className="fixed inset-0 w-full h-full z-[9999] bg-secondary/80 backdrop-blur-md flex items-center justify-center p-4 lg:p-10 animate-fade-in" onClick={handleCloseModal}>
                    <div className="bg-white rounded-[2rem] shadow-premium w-full max-w-5xl mx-auto max-h-[90vh] overflow-y-auto animate-scale-up border border-white/20 relative" onClick={e => e.stopPropagation()}>
                        <form onSubmit={handleSubmit}>
                            <div className="p-10 border-b border-border bg-surface/30 relative overflow-hidden">
                                <div className="absolute top-0 right-0 p-10 opacity-5 scale-150 rotate-12">
                                    <Layout size={200} />
                                </div>
                                <div className="flex justify-between items-start relative z-10">
                                    <div>
                                        <h3 className="text-4xl font-heading text-secondary mb-2">
                                            {modalMode === 'create' ? 'Define New Structure' : `Refine Table #${formData.tableNumber}`}
                                        </h3>
                                        <p className="text-text-muted uppercase text-[10px] font-bold tracking-[0.2em]">Institutional Asset Entry Portal</p>
                                    </div>
                                    <button type="button" onClick={handleCloseModal} className="w-12 h-12 flex items-center justify-center bg-white rounded-full shadow-premium hover:rotate-90 transition-transform">
                                        <X size={20} />
                                    </button>
                                </div>
                            </div>

                            <div className="p-10 grid grid-cols-1 lg:grid-cols-2 gap-12">
                                <div className="space-y-8">
                                    <div className="grid grid-cols-2 gap-8">
                                        <div>
                                            <label className="label-premium">Table Identifier</label>
                                            <input required type="text" className="input-premium"
                                                value={formData.tableNumber}
                                                onChange={e => setFormData({ ...formData, tableNumber: e.target.value })}
                                                placeholder="e.g. 101"
                                            />
                                        </div>
                                        <div>
                                            <label className="label-premium">Dimensional Affinity (Guests)</label>
                                            <div className="flex items-center gap-4 bg-surface rounded-xl p-1 border border-border">
                                                <button type="button" className="w-10 h-10 bg-white rounded-lg shadow-sm font-black text-secondary hover:bg-primary hover:text-white transition-colors" onClick={() => setFormData(prev => ({ ...prev, capacity: Math.max(1, prev.capacity - 1) }))}>-</button>
                                                <input type="number" className="flex-1 bg-transparent text-center font-black text-secondary outline-none"
                                                    value={formData.capacity}
                                                    onChange={e => setFormData({ ...formData, capacity: parseInt(e.target.value) })}
                                                />
                                                <button type="button" className="w-10 h-10 bg-white rounded-lg shadow-sm font-black text-secondary hover:bg-primary hover:text-white transition-colors" onClick={() => setFormData(prev => ({ ...prev, capacity: prev.capacity + 1 }))}>+</button>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-2 gap-8">
                                        <div>
                                            <label className="label-premium">Pre-payment Threshold (₹)</label>
                                            <div className="relative group">
                                                <IndianRupee size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-primary/50 group-focus-within:text-primary transition-colors" />
                                                <input required type="number" className="input-premium pl-12"
                                                    value={formData.reservationPrice}
                                                    onChange={e => setFormData({ ...formData, reservationPrice: parseInt(e.target.value) })}
                                                />
                                            </div>
                                        </div>
                                        <div>
                                            <label className="label-premium">Geometric Selection</label>
                                            <select className="input-premium appearance-none bg-no-repeat bg-[right_1rem_center] bg-[length:1em_1em]"
                                                style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%23B69A71' stroke-width='2'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' d='M19 9l-7 7-7-7'%3E%3C/path%3E%3C/svg%3E")` }}
                                                value={formData.shape} onChange={e => setFormData({ ...formData, shape: e.target.value })}>
                                                <option value="square">Quadrilateral Square</option>
                                                <option value="round">Circular Infinity</option>
                                                <option value="rectangle">Grand Rectangle</option>
                                            </select>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-2 gap-8">
                                        <div>
                                            <label className="label-premium">Zone Allocation</label>
                                            <div className="flex flex-wrap gap-2">
                                                {['Indoor', 'Outdoor', 'Garden', 'Rooftop'].map(a => (
                                                    <button key={a} type="button"
                                                        onClick={() => setFormData({ ...formData, area: a })}
                                                        className={`px-4 py-2 rounded-lg text-[9px] font-black uppercase tracking-widest border-2 transition-all ${formData.area === a ? 'bg-secondary text-white border-secondary' : 'bg-white text-text-muted border-border hover:border-primary/50'}`}
                                                    >
                                                        {a}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                        <div>
                                            <label className="label-premium">Thermal Regulation</label>
                                            <div className="flex gap-4">
                                                {['AC', 'Non-AC'].map(type => (
                                                    <label key={type} className="flex items-center gap-3 cursor-pointer group">
                                                        <div className="relative flex items-center justify-center">
                                                            <input type="radio" name="acType" value={type} checked={formData.acType === type} onChange={e => setFormData({ ...formData, acType: e.target.value })} className="w-5 h-5 appearance-none border-2 border-border rounded-full checked:border-primary transition-all cursor-pointer" />
                                                            {formData.acType === type && <div className="absolute w-2.5 h-2.5 bg-primary rounded-full animate-scale-up" />}
                                                        </div>
                                                        <span className="text-[10px] font-bold uppercase tracking-widest text-secondary">{type} Support</span>
                                                    </label>
                                                ))}
                                            </div>
                                        </div>
                                    </div>

                                    <div>
                                        <label className="label-premium">Unique Perspectives (Features)</label>
                                        <div className="flex flex-wrap gap-3">
                                            {preferenceOptions.map(opt => (
                                                <button
                                                    key={opt}
                                                    type="button"
                                                    onClick={() => {
                                                        const prefs = formData.preferences || [];
                                                        setFormData({ ...formData, preferences: prefs.includes(opt) ? prefs.filter(p => p !== opt) : [...prefs, opt] });
                                                    }}
                                                    className={`px-4 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest border transition-all ${formData.preferences?.includes(opt)
                                                        ? 'bg-primary/10 text-primary border-primary'
                                                        : 'bg-surface text-text-muted border-transparent hover:bg-white hover:border-border shadow-sm'
                                                        }`}
                                                >
                                                    {opt}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                </div>

                                <div className="space-y-10">
                                    <div className="p-8 bg-surface/50 rounded-[2.5rem] border border-border border-dashed shadow-inner-soft">
                                        <div className="flex items-center gap-4 mb-6">
                                            <div className="w-10 h-10 bg-primary/20 rounded-xl flex items-center justify-center text-primary">
                                                <MapPin size={20} />
                                            </div>
                                            <div>
                                                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-secondary">Spatial Positioning</p>
                                                <p className="text-xs text-text-muted">Define the table's nexus on the conceptual floor map.</p>
                                            </div>
                                        </div>
                                        <PositionPicker
                                            value={formData.position || { x: 50, y: 50 }}
                                            onChange={pos => setFormData({ ...formData, position: pos })}
                                        />
                                    </div>

                                    <div>
                                        <label className="label-premium">Architectural Vignette (Description)</label>
                                        <textarea className="input-premium h-32 resize-none"
                                            value={formData.description || ''}
                                            onChange={e => setFormData({ ...formData, description: e.target.value })}
                                            placeholder="Explicate the unique qualities and surrounding ambiance of this specific structure..."
                                        />
                                    </div>
                                </div>
                            </div>

                            <div className="p-10 border-t border-border bg-surface/30 flex justify-end gap-6 items-center">
                                <span className="text-[10px] font-black uppercase tracking-widest text-text-muted opacity-50 mr-auto flex items-center gap-2">
                                    <Shield size={14} /> Global Validation Required
                                </span>
                                <button type="button" onClick={handleCloseModal} className="px-8 py-4 text-[10px] font-black uppercase tracking-widest text-text-muted hover:text-secondary transition-colors">Abort</button>
                                <button type="submit" className="btn-primary py-4 px-12 text-[10px] font-black uppercase tracking-[0.3em] flex items-center justify-center gap-3">
                                    <Sparkles size={16} />
                                    {modalMode === 'create' ? 'Instantiate Structure' : 'Commit Refinements'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
