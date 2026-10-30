import { useState, useEffect } from 'react';
import {
    MessageSquare, Loader2, Clock, ChevronDown,
    ChevronUp, Mail, Send, CheckCircle2, AlertCircle,
    ArrowLeft
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { fetchMyMessages } from '../api';

export default function MyMessages() {
    const [messages, setMessages] = useState([]);
    const [loading, setLoading] = useState(true);
    const [expandedId, setExpandedId] = useState(null);

    useEffect(() => {
        const load = async () => {
            try {
                const res = await fetchMyMessages();
                setMessages(res.data || []);
            } catch (err) {
                console.error('Failed to load messages:', err);
            } finally {
                setLoading(false);
            }
        };
        load();
    }, []);

    const toggleExpand = (id) => {
        setExpandedId(expandedId === id ? null : id);
    };

    const getStatusBadge = (status) => {
        switch (status) {
            case 'new':
                return (
                    <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-[11px] font-bold bg-amber-100 text-amber-700">
                        <Clock size={12} />
                        Awaiting Reply
                    </span>
                );
            case 'replied':
                return (
                    <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-[11px] font-bold bg-green-100 text-green-700">
                        <CheckCircle2 size={12} />
                        Replied
                    </span>
                );
            case 'archived':
                return (
                    <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-[11px] font-bold bg-gray-100 text-gray-500">
                        <AlertCircle size={12} />
                        Closed
                    </span>
                );
            default:
                return null;
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <Loader2 className="w-10 h-10 text-primary animate-spin" />
            </div>
        );
    }

    return (
        <div className="bg-gray-50 min-h-screen">
            {/* Hero */}
            <div className="relative bg-secondary py-16 px-4 overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-full opacity-10">
                    <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[60%] bg-primary rounded-full blur-[120px]" />
                    <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[60%] bg-primary rounded-full blur-[120px]" />
                </div>
                <div className="max-w-7xl mx-auto relative z-10 text-center">
                    <h1 className="text-3xl md:text-5xl font-heading text-white mb-4 animate-fadeIn">
                        My <span className="text-primary italic">Messages</span>
                    </h1>
                    <p className="text-white/60 max-w-xl mx-auto text-sm leading-relaxed">
                        Track your inquiries and see replies from our team.
                    </p>
                </div>
            </div>

            <div className="max-w-4xl mx-auto px-4 py-12 -mt-6 relative z-20">
                {messages.length === 0 ? (
                    <div className="bg-white rounded-3xl shadow-xl border border-gray-100 p-16 text-center">
                        <MessageSquare className="w-16 h-16 text-gray-200 mx-auto mb-6" />
                        <h3 className="text-xl font-heading text-secondary mb-3">No Messages Yet</h3>
                        <p className="text-gray-400 mb-8 text-sm">You haven't sent any inquiries. Need help?</p>
                        <Link
                            to="/contact"
                            className="inline-flex items-center gap-2 px-8 py-3 bg-primary text-white rounded-2xl font-bold hover:bg-primary-dark transition-all shadow-lg shadow-primary/20"
                        >
                            <Send size={16} />
                            Contact Us
                        </Link>
                    </div>
                ) : (
                    <div className="space-y-4">
                        {messages.map((msg) => {
                            const isExpanded = expandedId === msg._id;
                            return (
                                <div
                                    key={msg._id}
                                    className="bg-white rounded-2xl shadow-md border border-gray-100 overflow-hidden transition-all hover:shadow-lg"
                                >
                                    {/* Header - clickable */}
                                    <button
                                        onClick={() => toggleExpand(msg._id)}
                                        className="w-full px-6 py-5 flex items-center justify-between text-left gap-4"
                                    >
                                        <div className="flex items-center gap-4 min-w-0 flex-1">
                                            <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${msg.status === 'replied' ? 'bg-green-50 text-green-500' :
                                                    msg.status === 'new' ? 'bg-amber-50 text-amber-500' :
                                                        'bg-gray-50 text-gray-400'
                                                }`}>
                                                <Mail size={20} />
                                            </div>
                                            <div className="min-w-0 flex-1">
                                                <div className="flex items-center gap-3 flex-wrap">
                                                    <p className="font-bold text-secondary text-sm">{msg.subject}</p>
                                                    {getStatusBadge(msg.status)}
                                                </div>
                                                <p className="text-xs text-gray-400 mt-1">
                                                    Sent on {new Date(msg.createdAt).toLocaleDateString('en-US', {
                                                        year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit'
                                                    })}
                                                    {msg.replies?.length > 0 && (
                                                        <span className="ml-2 text-primary font-semibold">
                                                            · {msg.replies.length} {msg.replies.length === 1 ? 'reply' : 'replies'}
                                                        </span>
                                                    )}
                                                </p>
                                            </div>
                                        </div>
                                        <div className={`p-2 rounded-full transition-all ${isExpanded ? 'bg-primary/10 text-primary' : 'text-gray-300'}`}>
                                            {isExpanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                                        </div>
                                    </button>

                                    {/* Expanded conversation */}
                                    {isExpanded && (
                                        <div className="px-6 pb-6 border-t border-gray-100 pt-5 space-y-4 animate-slideDown">
                                            {/* Your original message */}
                                            <div className="flex justify-end">
                                                <div className="max-w-[85%]">
                                                    <div className="bg-primary/10 border border-primary/20 p-4 rounded-2xl rounded-tr-sm">
                                                        <p className="text-secondary text-sm leading-relaxed whitespace-pre-wrap">
                                                            {msg.message}
                                                        </p>
                                                    </div>
                                                    <p className="text-[10px] text-gray-400 mt-1 text-right mr-2">
                                                        You · {new Date(msg.createdAt).toLocaleString()}
                                                    </p>
                                                </div>
                                            </div>

                                            {/* Admin replies */}
                                            {msg.replies?.length > 0 ? (
                                                msg.replies.map((reply, idx) => (
                                                    <div key={idx} className="flex justify-start">
                                                        <div className="max-w-[85%]">
                                                            <div className="bg-gray-100 border border-gray-200 p-4 rounded-2xl rounded-tl-sm">
                                                                <p className="text-secondary text-sm leading-relaxed whitespace-pre-wrap">
                                                                    {reply.message}
                                                                </p>
                                                            </div>
                                                            <p className="text-[10px] text-gray-400 mt-1 ml-2">
                                                                {reply.repliedByName || 'Admin'} · {new Date(reply.createdAt).toLocaleString()}
                                                            </p>
                                                        </div>
                                                    </div>
                                                ))
                                            ) : (
                                                <div className="text-center py-6">
                                                    <Clock size={24} className="text-gray-200 mx-auto mb-2" />
                                                    <p className="text-gray-400 text-xs italic">No reply yet — our team will respond soon!</p>
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                )}

                {/* Back to contact link */}
                <div className="mt-10 text-center">
                    <Link
                        to="/contact"
                        className="inline-flex items-center gap-2 text-sm text-primary font-bold hover:text-primary-dark transition-colors"
                    >
                        <ArrowLeft size={16} />
                        Send a New Message
                    </Link>
                </div>
            </div>

            <style>{`
                @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
                @keyframes slideDown { from { opacity: 0; max-height: 0; } to { opacity: 1; max-height: 800px; } }
                .animate-fadeIn { animation: fadeIn 0.8s ease-out; }
                .animate-slideDown { animation: slideDown 0.4s ease-out forwards; }
                .font-heading { font-family: 'Playfair Display', serif; }
            `}</style>
        </div>
    );
}
