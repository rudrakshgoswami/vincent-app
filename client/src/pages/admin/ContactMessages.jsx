import { useState, useEffect } from 'react';
import {
    Mail, Phone, Clock, Trash2, CheckCircle,
    MessageSquare, AlertCircle, Search, Filter,
    MoreVertical, ChevronDown, Check, X, Loader2,
    CheckCircle2, Send, Reply
} from 'lucide-react';
import { fetchAllContactMessages, updateMessageStatus, deleteContactMessage, adminReplyToMessage } from '../../api';

export default function ContactMessages() {
    const [messages, setMessages] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [filterStatus, setFilterStatus] = useState('all');
    const [selectedMessage, setSelectedMessage] = useState(null);
    const [updating, setUpdating] = useState(false);
    const [replyText, setReplyText] = useState('');
    const [sendingReply, setSendingReply] = useState(false);

    const loadMessages = async () => {
        try {
            setLoading(true);
            const res = await fetchAllContactMessages();
            setMessages(res.data);
        } catch (err) {
            console.error('Failed to load messages:', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadMessages();
    }, []);

    const handleStatusUpdate = async (id, newStatus) => {
        try {
            setUpdating(true);
            await updateMessageStatus(id, newStatus);
            setMessages(prev => prev.map(m => m._id === id ? { ...m, status: newStatus } : m));
            if (selectedMessage?._id === id) {
                setSelectedMessage({ ...selectedMessage, status: newStatus });
            }
        } catch (err) {
            alert('Failed to update status: ' + err.message);
        } finally {
            setUpdating(false);
        }
    };

    const handleDelete = async (id) => {
        if (!window.confirm('Are you sure you want to delete this message?')) return;
        try {
            await deleteContactMessage(id);
            setMessages(prev => prev.filter(m => m._id !== id));
            if (selectedMessage?._id === id) setSelectedMessage(null);
        } catch (err) {
            alert('Failed to delete message: ' + err.message);
        }
    };

    const handleSendReply = async () => {
        if (!replyText.trim() || !selectedMessage) return;
        try {
            setSendingReply(true);
            const res = await adminReplyToMessage(selectedMessage._id, replyText.trim());
            const updatedMsg = res.data;
            // Update messages list
            setMessages(prev => prev.map(m => m._id === updatedMsg._id ? updatedMsg : m));
            setSelectedMessage(updatedMsg);
            setReplyText('');
        } catch (err) {
            alert('Failed to send reply: ' + err.message);
        } finally {
            setSendingReply(false);
        }
    };

    const filteredMessages = messages.filter(m => {
        const matchesSearch =
            m.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            m.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
            m.subject.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesFilter = filterStatus === 'all' || m.status === filterStatus;
        return matchesSearch && matchesFilter;
    });

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h2 className="text-2xl font-heading text-secondary">Customer Inquiries</h2>
                    <p className="text-text-muted text-sm">Manage and respond to messages from your customers.</p>
                </div>
                <div className="flex gap-2">
                    <button
                        onClick={loadMessages}
                        className="p-2 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                        title="Refresh"
                    >
                        <Clock size={18} className={loading ? 'animate-spin' : ''} />
                    </button>
                </div>
            </div>

            {/* ── Filters & Search ───────────────────────────────────── */}
            <div className="bg-white p-4 rounded-xl border border-gray-200 flex flex-col md:flex-row gap-4 items-center">
                <div className="relative flex-1 w-full">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                    <input
                        type="text"
                        placeholder="Search by name, email or subject..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all text-sm"
                    />
                </div>
                <div className="flex items-center gap-2 w-full md:w-auto">
                    <Filter className="text-gray-400" size={18} />
                    <select
                        value={filterStatus}
                        onChange={(e) => setFilterStatus(e.target.value)}
                        className="flex-1 md:flex-none pl-3 pr-8 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all text-sm appearance-none cursor-pointer"
                    >
                        <option value="all">All Status</option>
                        <option value="new">New</option>
                        <option value="replied">Replied</option>
                        <option value="archived">Archived</option>
                    </select>
                </div>
            </div>

            <div className="grid lg:grid-cols-12 gap-6">

                {/* ── Messages List ───────────────────────────────────── */}
                <div className={`${selectedMessage ? 'lg:col-span-5' : 'lg:col-span-12'} space-y-4`}>
                    {loading ? (
                        <div className="flex justify-center py-20">
                            <Loader2 className="w-8 h-8 text-primary animate-spin" />
                        </div>
                    ) : filteredMessages.length === 0 ? (
                        <div className="bg-white border border-dashed border-gray-300 rounded-xl p-12 text-center">
                            <MessageSquare className="w-12 h-12 text-gray-200 mx-auto mb-4" />
                            <p className="text-gray-500 font-medium">No messages found matching your criteria.</p>
                        </div>
                    ) : (
                        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
                            <div className="overflow-x-auto">
                                <table className="w-full text-left">
                                    <thead className="bg-gray-50 text-gray-600 text-xs uppercase tracking-wider">
                                        <tr>
                                            <th className="px-6 py-4 font-semibold">Message</th>
                                            <th className="px-6 py-4 font-semibold">Details</th>
                                            <th className="px-6 py-4 font-semibold">Status</th>
                                            <th className="px-6 py-4 font-semibold text-right">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-100 italic">
                                        {filteredMessages.map((m) => (
                                            <tr
                                                key={m._id}
                                                onClick={() => { setSelectedMessage(m); setReplyText(''); }}
                                                className={`hover:bg-gray-50/80 cursor-pointer transition-colors group ${selectedMessage?._id === m._id ? 'bg-primary/5 border-l-4 border-l-primary' : ''}`}
                                            >
                                                <td className="px-6 py-4">
                                                    <p className="font-semibold text-secondary text-sm truncate max-w-[150px]">{m.subject}</p>
                                                    <p className="text-xs text-text-muted mt-1 truncate max-w-[200px]">{m.message}</p>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <p className="text-sm font-medium text-secondary">{m.name}</p>
                                                    <p className="text-xs text-text-muted">{new Date(m.createdAt).toLocaleDateString()}</p>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <span className={`px-2 py-1 rounded-full text-[10px] font-bold uppercase ${m.status === 'new' ? 'bg-amber-100 text-amber-600' :
                                                        m.status === 'replied' ? 'bg-green-100 text-green-600' : 'bg-gray-100 text-gray-500'
                                                        }`}>
                                                        {m.status}
                                                        {m.replies?.length > 0 && ` (${m.replies.length})`}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4 text-right">
                                                    <button
                                                        onClick={(e) => { e.stopPropagation(); handleDelete(m._id); }}
                                                        className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"
                                                    >
                                                        <Trash2 size={16} />
                                                    </button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}
                </div>

                {/* ── Message Detail View + Reply ──────────────────────── */}
                {selectedMessage && (
                    <div className="lg:col-span-7 animate-fadeIn">
                        <div className="bg-white border border-gray-200 rounded-3xl shadow-xl overflow-hidden sticky top-24">
                            <div className="bg-secondary p-6 text-white flex items-center justify-between">
                                <div className="flex items-center gap-4">
                                    <div className="w-12 h-12 bg-white/20 rounded-2xl flex items-center justify-center">
                                        <Mail size={24} />
                                    </div>
                                    <div>
                                        <h3 className="font-heading text-lg">{selectedMessage.subject}</h3>
                                        <p className="text-white/60 text-xs">Received {new Date(selectedMessage.createdAt).toLocaleString()}</p>
                                    </div>
                                </div>
                                <button
                                    onClick={() => setSelectedMessage(null)}
                                    className="p-2 hover:bg-white/10 rounded-full transition-colors"
                                >
                                    <X size={20} />
                                </button>
                            </div>

                            <div className="p-8 space-y-6 max-h-[70vh] overflow-y-auto">
                                {/* Customer info */}
                                <div className="grid md:grid-cols-2 gap-6 pb-6 border-b border-gray-100">
                                    <div className="flex items-start gap-3">
                                        <div className="mt-1 p-2 bg-gray-50 rounded-lg text-primary">
                                            <Search size={16} />
                                        </div>
                                        <div>
                                            <p className="text-[10px] uppercase tracking-wider text-gray-400 font-bold">Customer</p>
                                            <p className="text-sm font-semibold text-secondary">{selectedMessage.name}</p>
                                        </div>
                                    </div>
                                    <div className="flex items-start gap-3">
                                        <div className="mt-1 p-2 bg-gray-50 rounded-lg text-primary">
                                            <Mail size={16} />
                                        </div>
                                        <div>
                                            <p className="text-[10px] uppercase tracking-wider text-gray-400 font-bold">Email</p>
                                            <a href={`mailto:${selectedMessage.email}`} className="text-sm font-semibold text-secondary hover:text-primary transition-colors underline decoration-dotted underline-offset-4">
                                                {selectedMessage.email}
                                            </a>
                                        </div>
                                    </div>
                                    {selectedMessage.phone && (
                                        <div className="flex items-start gap-3">
                                            <div className="mt-1 p-2 bg-gray-50 rounded-lg text-primary">
                                                <Phone size={16} />
                                            </div>
                                            <div>
                                                <p className="text-[10px] uppercase tracking-wider text-gray-400 font-bold">Phone</p>
                                                <p className="text-sm font-semibold text-secondary">{selectedMessage.phone}</p>
                                            </div>
                                        </div>
                                    )}
                                    <div className="flex items-start gap-3">
                                        <div className="mt-1 p-2 bg-gray-50 rounded-lg text-primary">
                                            <AlertCircle size={16} />
                                        </div>
                                        <div>
                                            <p className="text-[10px] uppercase tracking-wider text-gray-400 font-bold">Current Status</p>
                                            <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${selectedMessage.status === 'new' ? 'bg-amber-100 text-amber-600' :
                                                selectedMessage.status === 'replied' ? 'bg-green-100 text-green-600' : 'bg-gray-100 text-gray-500'
                                                }`}>
                                                {selectedMessage.status}
                                            </span>
                                        </div>
                                    </div>
                                </div>

                                {/* Conversation Thread */}
                                <div>
                                    <p className="text-[10px] uppercase tracking-wider text-gray-400 font-bold mb-3 flex items-center gap-2">
                                        <MessageSquare size={12} />
                                        Conversation Thread
                                    </p>

                                    <div className="space-y-4">
                                        {/* Original customer message */}
                                        <div className="flex justify-start">
                                            <div className="max-w-[85%]">
                                                <div className="bg-gray-100 p-4 rounded-2xl rounded-tl-sm border border-gray-200">
                                                    <p className="text-secondary text-sm leading-relaxed whitespace-pre-wrap">
                                                        {selectedMessage.message}
                                                    </p>
                                                </div>
                                                <p className="text-[10px] text-gray-400 mt-1 ml-2">
                                                    {selectedMessage.name} · {new Date(selectedMessage.createdAt).toLocaleString()}
                                                </p>
                                            </div>
                                        </div>

                                        {/* Admin replies */}
                                        {selectedMessage.replies?.map((reply, idx) => (
                                            <div key={idx} className="flex justify-end">
                                                <div className="max-w-[85%]">
                                                    <div className="bg-primary/10 border border-primary/20 p-4 rounded-2xl rounded-tr-sm">
                                                        <p className="text-secondary text-sm leading-relaxed whitespace-pre-wrap">
                                                            {reply.message}
                                                        </p>
                                                    </div>
                                                    <p className="text-[10px] text-gray-400 mt-1 mr-2 text-right">
                                                        {reply.repliedByName || 'Admin'} · {new Date(reply.createdAt).toLocaleString()}
                                                    </p>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                {/* Reply Input */}
                                <div className="pt-4 border-t border-gray-100">
                                    <p className="text-[10px] uppercase tracking-wider text-gray-400 font-bold mb-3 flex items-center gap-2">
                                        <Reply size={12} />
                                        Write a Reply
                                    </p>
                                    <div className="flex gap-3">
                                        <textarea
                                            value={replyText}
                                            onChange={(e) => setReplyText(e.target.value)}
                                            placeholder="Type your reply to the customer..."
                                            rows="3"
                                            className="flex-1 px-4 py-3 bg-gray-50 border border-gray-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all text-sm resize-none"
                                        />
                                        <button
                                            onClick={handleSendReply}
                                            disabled={!replyText.trim() || sendingReply}
                                            className="self-end px-6 py-3 bg-primary text-white rounded-2xl font-bold hover:bg-primary-dark transition-all flex items-center gap-2 shadow-lg shadow-primary/20 disabled:opacity-50 disabled:cursor-not-allowed"
                                        >
                                            {sendingReply ? (
                                                <Loader2 size={18} className="animate-spin" />
                                            ) : (
                                                <>
                                                    <Send size={16} />
                                                    Send
                                                </>
                                            )}
                                        </button>
                                    </div>
                                </div>

                                {/* Action buttons */}
                                <div className="flex items-center justify-between pt-4">
                                    <div className="flex gap-2">
                                        {selectedMessage.status !== 'archived' && (
                                            <button
                                                onClick={() => handleStatusUpdate(selectedMessage._id, 'archived')}
                                                disabled={updating}
                                                className="px-6 py-2.5 bg-gray-100 text-gray-600 rounded-xl text-xs font-bold hover:bg-gray-200 transition-all flex items-center gap-2 disabled:opacity-50"
                                            >
                                                <Trash2 size={14} />
                                                Archive
                                            </button>
                                        )}
                                    </div>
                                    <button
                                        onClick={() => handleDelete(selectedMessage._id)}
                                        className="text-red-500 hover:text-red-700 text-xs font-bold flex items-center gap-1 transition-colors"
                                    >
                                        <Trash2 size={14} />
                                        Delete Permanently
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            <style>{`
                @keyframes fadeIn { from { opacity: 0; transform: scale(0.95); } to { opacity: 1; transform: scale(1); } }
                .animate-fadeIn { animation: fadeIn 0.3s ease-out forwards; }
                .font-heading { font-family: 'Playfair Display', serif; }
            `}</style>
        </div>
    );
}
