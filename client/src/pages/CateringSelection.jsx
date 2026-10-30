import { useState, useEffect, useMemo } from 'react';
import { 
    ChevronLeft, ChevronRight, X, Info, Star, Zap, CheckCircle, Utensils,
    Package, ArrowRight, Shield, Sparkles, MapPin, Phone, Mail, Clock, 
    ShieldCheck, Loader2, Check, Users
} from 'lucide-react';
import { 
    getImageUrl, fetchCateringPackageById, fetchCateringPackages, fetchCateringExtras, 
    createCateringBookingOrder, verifyCateringBookingPayment, getRazorpayKey 
} from '../api';
import { initiatePayment } from '../utils/paymentHandler';
import { useAuth } from '../context/AuthContext';
import CounterVarietySlider from '../components/CounterVarietySlider';
import FlavorCarousel from '../components/FlavorCarousel';

function fmt(n) { return n ? `₹${Number(n).toLocaleString('en-IN')}` : '—'; }


export default function CateringSelection() {
    const [packages, setPackages] = useState([]);
    const [loading, setLoading] = useState(true);
    const [step, setStep] = useState(1); // 1: Package, 2: Guest Count & Menu, 3: Review
    const [error, setError] = useState('');

    const [extras, setExtras] = useState([]);

    // Selections
    const [selectedPackage, setSelectedPackage] = useState(null);
    const [guestCount, setGuestCount] = useState(50);
    const [menuData, setMenuData] = useState({ categories: [], items: [], counters: [], pkgDetails: null });
    const [loadingMenu, setLoadingMenu] = useState(false);

    // User choices
    const [selectedItems, setSelectedItems] = useState({}); // { categoryId: [itemId1, itemId2] }
    const [selectedCounters, setSelectedCounters] = useState([]);
    const [selectedExtras, setSelectedExtras] = useState([]);
    const [selectedVariants, setSelectedVariants] = useState({}); // { itemId: [variantName1, variantName2] }
    const [specialRequests, setSpecialRequests] = useState('');
    const [activeMenuSection, setActiveMenuSection] = useState('guest-count');
    const [detailedCounter, setDetailedCounter] = useState(null);
    const [isJainMode, setIsJainMode] = useState(false);


    useEffect(() => {
        Promise.all([fetchCateringPackages(), fetchCateringExtras()]).then(([pkgRes, extRes]) => {
            setPackages(pkgRes.packages?.filter(p => p.isActive) || []);
            setExtras(extRes.extras?.filter(e => e.status === 'active') || []);
            setLoading(false);
        }).catch(err => {
            setError('Failed to load catering data.');
            setLoading(false);
        });
    }, []);

    const handleSelectPackage = async (pkg) => {
        setGuestCount(pkg.minGuests || 50);
        setSelectedPackage(pkg);
        setStep(2);
        setError('');
        setActiveMenuSection('guest-count'); // Reset wizard

        setLoadingMenu(true);
        try {
            const res = await fetchCateringPackageById(pkg._id);
            // res contains: package, categories, foodItems, liveCounters
            const fetchedCategories = res.categories || [];

            setMenuData({
                pkgDetails: res.package,
                items: res.foodItems || [],
                counters: res.liveCounters || [],
                categories: fetchedCategories
            });
            // Initialize empty selections
            const initSel = {};
            fetchedCategories.forEach(cat => {
                initSel[cat._id] = [];
            });
            setSelectedItems(initSel);

            // Auto select included counters (where isAddOn is false)
            const includedCounters = (res.liveCounters || []).filter(lc => !lc.isAddOn).map(lc => lc._id);
            setSelectedCounters(includedCounters);

            // Re-fetch extras just to be safe
            const extRes = await fetchCateringExtras();
            setExtras(extRes.extras?.filter(e => e.isActive) || []);
        } catch (err) {
            console.error(err);
            setError('Failed to load package details. Please try again later.');
        } finally {
            setLoadingMenu(false);
        }
    };

    const toggleItemSelection = (catId, itemId, limit) => {
        setSelectedItems(prev => {
            const current = prev[catId] || [];
            if (current.includes(itemId)) {
                // If deselecting item, also clear its variants
                setSelectedVariants(vPrev => {
                    const newV = { ...vPrev };
                    delete newV[itemId];
                    return newV;
                });
                return { ...prev, [catId]: current.filter(id => id !== itemId) };
            } else {
                if (current.length < limit) {
                    return { ...prev, [catId]: [...current, itemId] };
                }
                return prev;
            }
        });
    };

    const toggleVariantSelection = (itemId, variantName, limit) => {
        setSelectedVariants(prev => {
            const current = prev[itemId] || [];
            if (current.includes(variantName)) {
                return { ...prev, [itemId]: current.filter(name => name !== variantName) };
            } else {
                if (current.length < limit) {
                    return { ...prev, [itemId]: [...current, variantName] };
                }
                // If limit is 1, replace
                if (limit === 1) {
                    return { ...prev, [itemId]: [variantName] };
                }
                return prev;
            }
        });
    };

    const toggleCounterSelection = (counter) => {
        if (!counter.isAddOn) return; // Cannot toggle included
        setSelectedCounters(prev => {
            if (prev.includes(counter._id)) return prev.filter(id => id !== counter._id);
            return [...prev, counter._id];
        });
    };

    const toggleExtraSelection = (extraId) => {
        setSelectedExtras(prev => prev.includes(extraId) ? prev.filter(id => id !== extraId) : [...prev, extraId]);
    };

    const costBreakdown = useMemo(() => {
        if (!selectedPackage || !menuData) return { base: 0, addOns: 0, total: 0 };
        const base = guestCount * selectedPackage.pricePerPlate;
        let addOns = 0;
        menuData.counters.forEach(c => {
            if (c.isAddOn && selectedCounters.includes(c._id)) {
                addOns += (c.addOnPricePerPlate * guestCount);
            }
        });
        extras.forEach(e => {
            if (selectedExtras.includes(e._id)) {
                if (e.pricingType === 'per_plate') addOns += (e.price * guestCount);
                if (e.pricingType === 'flat') addOns += e.price;
            }
        });
        return { base, addOns, total: base + addOns };
    }, [guestCount, selectedPackage, menuData, selectedCounters, extras, selectedExtras]);

    const isStep2Valid = useMemo(() => {
        if (!selectedPackage || !menuData) return false;
        if (guestCount < selectedPackage?.minGuests) return false;
        if (guestCount > selectedPackage?.maxGuests) return false;
        for (const cat of menuData.categories) {
            if (cat.isMandatory) {
                const selectedCount = (selectedItems[cat._id] || []).length;
                if (selectedCount !== cat.selectionLimit) return false;
            }
        }
        // Check variants
        for (const itemId of Object.values(selectedItems).flat()) {
            const item = menuData.items.find(i => i._id === itemId);
            if (item?.hasVariants) {
                const limitObj = item.variantPackageLimits?.find(l => (l.packageId?._id || l.packageId || '').toString() === selectedPackage?._id.toString());
                const limit = limitObj?.limit || 1;
                const selectedV = (selectedVariants[itemId] || []).length;
                if (selectedV === 0) return false; // Must select at least one if variants exist and item selected
            }
        }
        return true;
    }, [guestCount, selectedPackage, menuData, selectedItems, selectedVariants]);

    // Menu Sections for Wizard
    const menuSections = useMemo(() => {
        if (!menuData) return [];
        const sections = [{ id: 'guest-count', title: 'Guest Count', type: 'guest' }];
        menuData.categories.forEach((cat, index) => {
            sections.push({ id: `category-${index}`, title: cat.name, type: 'category', cat, index });
        });
        if (menuData.counters.length > 0) {
            sections.push({ id: 'live-counters', title: 'Live Counters', type: 'counters' });
        }
        if (extras.length > 0) {
            sections.push({ id: 'extras', title: 'Add-ons', type: 'extras' });
        }
        return sections;
    }, [menuData, extras]);

    const handleNextSection = () => {
        const currentIndex = menuSections.findIndex(s => s.id === activeMenuSection);
        if (currentIndex < menuSections.length - 1) {
            setActiveMenuSection(menuSections[currentIndex + 1].id);
        }
    };

    const handlePrevSection = () => {
        const currentIndex = menuSections.findIndex(s => s.id === activeMenuSection);
        if (currentIndex > 0) {
            setActiveMenuSection(menuSections[currentIndex - 1].id);
        }
    };

    const renderActiveSectionContent = () => {
        const currentSection = menuSections.find(s => s.id === activeMenuSection);
        if (!currentSection) return null;

        if (currentSection.type === 'guest') {
            return (
                <div className="py-4">
                    <h2 className="text-xl font-bold mb-6 flex items-center gap-2"><Users size={24} className="text-primary" /> Guest Count</h2>
                    <p className="text-gray-600 mb-4">Enter the estimated number of guests for your event. Minimum required for {selectedPackage?.name} is {selectedPackage?.minGuests}.</p>
                    <input
                        type="number"
                        value={guestCount}
                        onChange={e => setGuestCount(Number(e.target.value))}
                        className="border-2 border-gray-200 focus:border-primary focus:ring-4 focus:ring-primary/10 rounded-xl p-4 w-full max-w-xs text-xl font-bold bg-gray-50 transition"
                    />
                    {guestCount < selectedPackage?.minGuests && <p className="text-red-500 font-medium text-sm mt-3 flex items-center gap-1"><Info size={16} /> Minimum {selectedPackage?.minGuests} guests required.</p>}
                    {guestCount > selectedPackage?.maxGuests && <p className="text-red-500 font-medium text-sm mt-3 flex items-center gap-1"><Info size={16} /> Maximum {selectedPackage?.maxGuests} guests allowed.</p>}
                </div>
            );
        }

        if (currentSection.type === 'category') {
            const cat = currentSection.cat;
            const itemsInCat = menuData.items
                .filter(i => (i.categoryId?._id || i.categoryId) === cat._id)
                .filter(i => isJainMode ? (i.isJain !== false) : true);
            const selected = selectedItems[cat._id] || [];
            const allowed = cat.selectionLimit;

            return (
                <div className="py-2 animate-fade-in">
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end border-b border-gray-100 pb-4 mb-6 gap-4">
                        <div>
                            <h4 className="text-[1.35rem] font-heading text-secondary leading-none mb-2">{cat.name}</h4>
                            <p className="text-[10px] text-[#9A9A9A] font-bold uppercase tracking-[0.2em]">
                                Select your preferred {cat.name.toLowerCase()} for the event
                            </p>
                        </div>
                        <div className={`px-4 py-2 rounded-full text-[10px] uppercase font-black tracking-widest shadow-sm leading-none shrink-0 ${selected.length === allowed ? "bg-[#e8f5e9] text-[#1aa94c] border border-[#1aa94c]/20" : "bg-[#F9F6F0] text-[#cca776] border border-[#cca776]/20"}`}>
                            Pick {allowed} ({selected.length}/{allowed}) {cat.isMandatory && selected.length < allowed ? '*' : ''}
                        </div>
                    </div>

                    {itemsInCat.length === 0 ? (
                        <div className="p-8 border-2 border-dashed border-gray-200 rounded-2xl text-center text-gray-500 bg-gray-50">
                            {isJainMode ? "No Jain options available in this category." : "No items found in this category."}
                        </div>
                    ) : (
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 md:gap-6">
                            {itemsInCat.map(item => {
                                const isSelected = selected.includes(item._id);
                                const isMaxed = !isSelected && selected.length >= allowed;
                                return (
                                    <div key={item._id} className="group relative flex flex-col h-full">
                                        <div
                                            onClick={() => toggleItemSelection(cat._id, item._id, allowed)}
                                            className={`flex-1 flex flex-col rounded-[1.25rem] cursor-pointer transition-all duration-300 ease-out overflow-hidden border ${
                                                isSelected 
                                                    ? 'border-[#cca776] ring-1 ring-[#cca776] bg-white shadow-xl scale-[1.02] z-10' 
                                                    : isMaxed 
                                                        ? 'border-border/50 opacity-50 grayscale-[0.5] cursor-not-allowed bg-gray-50' 
                                                        : 'border-border bg-white hover:border-[#cca776]/40 hover:shadow-lg'
                                            }`}
                                        >
                                            {/* Top Image Section */}
                                            <div className="w-full aspect-[4/3] md:aspect-[16/10] relative overflow-hidden bg-gray-50">
                                                {item.image ? (
                                                    <img 
                                                        src={getImageUrl(item.image)} 
                                                        alt={item.name} 
                                                        className={`w-full h-full object-cover transition-transform duration-700 ease-out ${isSelected ? 'scale-105' : 'group-hover:scale-105'}`} 
                                                    />
                                                ) : (
                                                    <div className="w-full h-full flex flex-col items-center justify-center text-gray-300 bg-gray-100">
                                                        <Utensils size={32} className="opacity-20 mb-2" />
                                                    </div>
                                                )}
                                                
                                                <div className={`absolute inset-0 transition-opacity duration-300 ${isSelected ? 'bg-secondary/40' : 'bg-black/0 group-hover:bg-black/10'}`} />
                                                
                                                {/* Selection Check Badge */}
                                                <div className={`absolute top-2.5 right-2.5 flex items-center justify-center w-[26px] h-[26px] bg-[#cca776] text-white rounded-full shadow-lg transition-all transform duration-300 ${isSelected ? 'scale-100 opacity-100 z-20' : 'scale-50 opacity-0'}`}>
                                                    <Check size={14} strokeWidth={3.5} />
                                                </div>
                                            </div>

                                            {/* Bottom Text Content */}
                                            <div className="px-5 pt-4 pb-3 flex-1 flex flex-col bg-white">
                                                <div className="mb-4 flex flex-col gap-1.5">
                                                    <h3 className={`font-heading text-[17px] leading-tight transition-colors duration-300 ${isSelected ? 'text-secondary' : 'text-secondary group-hover:text-secondary/80'}`}>
                                                        {item.name}
                                                    </h3>
                                                    {!isJainMode && item.isJain !== false && (
                                                        <span className="text-[9px] text-[#28a745] font-black tracking-widest uppercase flex items-center gap-1">
                                                            🌿 JAIN AVAILABLE
                                                        </span>
                                                    )}
                                                </div>
                                                
                                                {/* Footer */}
                                                <div className="mt-auto border-t border-gray-100/80 pt-3 flex items-center justify-between">
                                                    <span className="text-[9px] font-black tracking-[0.2em] text-gray-400 uppercase">Master Chef Pick</span>
                                                    <span className={`text-[10px] font-black uppercase tracking-widest transition-colors ${isSelected ? 'text-[#cca776]' : 'text-[#cca776] group-hover:text-[#b89565]'}`}>
                                                        {isSelected ? 'Included' : 'Select Plate'}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Variants Dropdown for Selected Item */}
                                        {isSelected && item.hasVariants && item.variants?.length > 0 && (() => {
                                            const limitObj = item.variantPackageLimits?.find(l => (l.packageId?._id || l.packageId || '').toString() === selectedPackage?._id.toString());
                                            const vLimit = limitObj?.limit || 1;
                                            
                                            return (
                                                <div className="mt-4 p-6 bg-gradient-to-br from-[#FDFAF6] to-white rounded-2xl border-2 border-primary/20 shadow-xl shadow-primary/5 animate-slide-down relative overflow-hidden">
                                                    <div className="absolute top-0 left-0 w-1.5 h-full bg-gradient-to-b from-primary/40 to-primary/10 rounded-l-2xl" />
                                                    <p className="text-sm font-black text-primary uppercase tracking-wider mb-2 flex items-center gap-2 ml-2">
                                                        <Check size={16} className="bg-primary/10 rounded-full p-0.5" />
                                                        Select {vLimit > 1 ? `up to ${vLimit} Flavors` : 'One Flavor'}:
                                                    </p>
                                                    
                                                    {/* Infinite Looping Carousel */}
                                                    <FlavorCarousel 
                                                        variants={item.variants}
                                                        selectedNames={selectedVariants[item._id] || []}
                                                        onToggle={(vName) => toggleVariantSelection(item._id, vName, vLimit)}
                                                    />
                                                    {(selectedVariants[item._id] || []).length === 0 && (
                                                        <p className="text-[11px] text-red-500 mt-4 ml-2 font-black flex items-center gap-1.5 animate-pulse"><Info size={13} /> ACTION REQUIRED: PLEASE PICK A FLAVOR</p>
                                                    )}
                                                </div>
                                            );
                                        })()}
                                    </div>
                                )
                            })}
                        </div>
                    )}
                </div>
            );
        }

        if (currentSection.type === 'counters') {
            return (
                <div className="py-2 animate-fade-in">
                    <div className="flex justify-between items-center mb-6">
                        <div>
                            <h2 className="text-2xl font-bold flex items-center gap-2"><Utensils className="text-primary" /> Live Experience Counters</h2>
                            <p className="text-gray-500 mt-1">Gourmet live stations with artisanal varieties</p>
                        </div>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {menuData.counters.map(counter => {
                            const isSelected = selectedCounters.includes(counter._id);
                            const hasVarieties = counter.varieties && counter.varieties.length > 0;
                            
                            return (
                                <div
                                    key={counter._id}
                                    className={`group relative overflow-hidden rounded-3xl border-2 transition-all duration-500 ${isSelected ? 'border-primary ring-4 ring-primary/5 bg-white shadow-xl translate-y-[-4px]' : 'border-gray-100 bg-gray-50/50 hover:bg-white hover:border-primary/30 hover:shadow-lg hover:translate-y-[-2px]'}`}
                                >
                                    {/* Premium Slider Section */}
                                    <div className="relative h-60 overflow-hidden">
                                        {hasVarieties ? (
                                            <CounterVarietySlider varieties={counter.varieties} />
                                        ) : (
                                            <div className="w-full h-full bg-gray-100 flex items-center justify-center">
                                                {counter.image ? (
                                                    <img src={getImageUrl(counter.image)} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" />
                                                ) : (
                                                    <Utensils size={40} className="text-gray-300" />
                                                )}
                                            </div>
                                        )}
                                        {/* Status Badge */}
                                        <div className="absolute top-4 left-4 z-20">
                                            {!counter.isAddOn ? (
                                                <span className="bg-primary/90 text-white text-[10px] font-black uppercase tracking-widest px-3 py-1.5 rounded-full backdrop-blur-md shadow-lg border border-white/20">Included</span>
                                            ) : (
                                                <span className="bg-blue-600/90 text-white text-[10px] font-black uppercase tracking-widest px-3 py-1.5 rounded-full backdrop-blur-md shadow-lg border border-white/20">Pre-Booking Extras</span>
                                            )}
                                        </div>
                                    </div>

                                    {/* Content Section */}
                                    <div className="p-7">
                                        <div className="flex justify-between items-start mb-4">
                                            <div>
                                                <h3 className="text-2xl font-black text-secondary group-hover:text-primary transition-colors leading-tight">{counter.name}</h3>
                                                {hasVarieties && (
                                                    <div className="flex items-center gap-1.5 mt-2 bg-primary/10 w-max px-2.5 py-1 rounded-lg border border-primary/10 border-dashed">
                                                        <Star size={12} className="text-primary fill-primary" />
                                                        <span className="text-[10px] font-black text-primary uppercase tracking-widest">{counter.varieties.length} Gourmet Varieties</span>
                                                    </div>
                                                )}
                                            </div>
                                            <div className={`p-1.5 rounded-full shadow-inner transition-all duration-500 ${isSelected ? 'bg-primary shadow-primary/20 scale-110' : 'bg-gray-100'}`}>
                                                {isSelected ? <CheckCircle className="text-white" size={24} /> : <div className="w-6 h-6 rounded-full border-2 border-gray-200" />}
                                            </div>
                                        </div>

                                        <p className="text-sm text-gray-500 line-clamp-2 min-h-[44px] leading-relaxed mb-6 font-medium">{counter.description}</p>
                                        
                                        <div className="flex items-center justify-between mt-auto pt-6 border-t border-gray-100">
                                            <div className="flex flex-col">
                                                <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Pricing</span>
                                                <span className="text-xl font-black text-secondary">{counter.isAddOn ? `${fmt(counter.addOnPricePerPlate)}` : 'FREE'} <span className="text-[10px] font-normal text-gray-400">/plt</span></span>
                                            </div>
                                            <div className="flex gap-3">
                                                <button 
                                                    onClick={(e) => { e.stopPropagation(); setDetailedCounter(counter); }}
                                                    className="px-5 py-3 text-xs font-black text-secondary hover:text-primary hover:bg-primary/5 rounded-2xl border border-gray-200 hover:border-primary/30 transition-all flex items-center gap-2"
                                                >
                                                    <Info size={14} /> Details
                                                </button>
                                                <button 
                                                    onClick={() => toggleCounterSelection(counter)}
                                                    className={`px-6 py-3 text-xs font-black rounded-2xl transition-all shadow-lg hover:scale-[1.05] active:scale-[0.95] ${isSelected ? 'bg-secondary text-white shadow-secondary/20' : 'bg-primary text-white shadow-primary/20 hover:bg-primary-dark'}`}
                                                >
                                                    {isSelected ? 'Counter Added' : 'Add to package'}
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )
                        })}
                    </div>
                </div>
            );
        }

        if (currentSection.type === 'extras') {
            return (
                <div className="py-2 animate-fade-in">
                    <h2 className="text-2xl font-bold flex items-center gap-2 mb-2"><Package className="text-primary" /> Other Add-ons</h2>
                    <p className="text-gray-500 mb-6">Additional catering services for your event.</p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {extras.map(extra => {
                            const isSelected = selectedExtras.includes(extra._id);
                            return (
                                <div
                                    key={extra._id}
                                    onClick={() => toggleExtraSelection(extra._id)}
                                    className={`p-5 rounded-xl border-2 cursor-pointer transition-all flex justify-between items-center ${isSelected ? 'border-primary bg-primary/5 shadow-md shadow-primary/10' : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'}`}
                                >
                                    <div>
                                        <p className="font-bold text-lg">{extra.name}</p>
                                        <p className="text-sm mt-1 font-bold text-gray-500">
                                            {extra.pricingType === 'per_plate' ? `+ ${fmt(extra.price)} / guest` : `+ ${fmt(extra.price)} flat fee`}
                                        </p>
                                    </div>
                                    {isSelected ? <CheckCircle className="text-primary fill-primary/20" size={28} /> : <div className="w-7 h-7 rounded-full border-2 border-gray-300 bg-white"></div>}
                                </div>
                            )
                        })}
                    </div>
                </div>
            );
        }
        return null;
    };

    if (loading) return <div className="p-20 text-center"><Loader2 className="animate-spin w-8 h-8 mx-auto" /></div>;

    return (
        <div className="max-w-7xl mx-auto p-4 py-8">
            <h1 className="text-3xl font-bold mb-8 capitalize text-secondary">Catering Booking</h1>

            {/* Step 1: Packages */}
            {step === 1 && (
                <div>
                    <h2 className="text-xl mb-4">Select a Package</h2>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        {packages.map(pkg => (
                            <div key={pkg._id} className="border border-gray-200 rounded-xl overflow-hidden shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 bg-white flex flex-col">
                                {pkg.thumbnail ? (
                                    <img src={pkg.thumbnail} alt={pkg.name} className="w-full h-48 object-cover" />
                                ) : (
                                    <div className="w-full h-48 bg-gray-50 flex items-center justify-center text-gray-300 border-b">
                                        <Utensils size={48} />
                                    </div>
                                )}
                                <div className="p-6 flex-1 flex flex-col">
                                    <h3 className="text-2xl font-bold text-secondary">{pkg.name}</h3>
                                    <p className="text-primary text-2xl font-bold mt-2">{fmt(pkg.pricePerPlate)} <span className="text-sm text-gray-500 font-normal">/plate</span></p>
                                    <p className="text-sm text-gray-500 mt-2 font-medium bg-gray-100 w-max px-2 py-1 rounded">{pkg.minGuests} - {pkg.maxGuests} Guests</p>
                                    <p className="mt-4 text-gray-600 line-clamp-3 min-h-[4rem] flex-1">{pkg.description}</p>
                                    <button onClick={() => handleSelectPackage(pkg)} className="w-full mt-6 border-2 border-primary text-primary hover:bg-primary hover:text-white py-3 rounded-xl font-bold transition-all shadow-sm">
                                        Select Package
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Step 2: Menu Customization */}
            {step === 2 && (
                <div className="flex flex-col lg:flex-row gap-8">
                    <div className="flex-1 w-full overflow-hidden">
                        <button onClick={() => setStep(1)} className="flex items-center text-sm text-gray-500 font-medium mb-4 hover:text-black transition-colors bg-white px-3 py-1.5 rounded-lg border shadow-sm w-max"><ChevronLeft size={16} className="mr-1" /> Change Package</button>

                        {loadingMenu ? <div className="p-20 bg-white rounded-2xl border shadow-sm text-center min-h-[400px] flex flex-col items-center justify-center"><Loader2 className="animate-spin w-10 h-10 text-primary mb-4" /><p className="text-gray-500 font-medium">Loading menu options...</p></div> : (
                            <div className="bg-white rounded-2xl border shadow-sm overflow-hidden flex flex-col">
                                {error && <div className="p-4 bg-red-50 text-red-600 font-medium m-6 rounded-xl border border-red-100 flex items-center gap-2"><Info size={20} /> {error}</div>}

                                {/* Wizard Stepper / Tabs */}
                                <div className="flex flex-col md:flex-row md:items-center justify-between bg-gray-50 border-b p-4 gap-4">
                                    <div className="overflow-x-auto flex gap-2 hide-scrollbar w-full md:w-auto">
                                        {menuSections.map((sec, idx) => {
                                            const isActive = activeMenuSection === sec.id;
                                        // Optional: Check if section is valid to add a checkmark
                                        let isSectionComplete = false;
                                        if (sec.type === 'guest') isSectionComplete = guestCount >= selectedPackage?.minGuests && guestCount <= selectedPackage?.maxGuests;
                                        if (sec.type === 'category') isSectionComplete = !sec.cat.isMandatory || (selectedItems[sec.cat._id]?.length === sec.cat.selectionLimit);

                                        return (
                                            <button
                                                key={sec.id}
                                                onClick={() => setActiveMenuSection(sec.id)}
                                                className={`px-4 py-2.5 rounded-xl whitespace-nowrap text-sm font-bold flex items-center gap-2 transition-all ${isActive ? 'bg-primary text-white shadow-md shadow-primary/20' : 'bg-white text-gray-600 border border-gray-200 hover:border-gray-300 hover:bg-gray-100'}`}
                                            >
                                                {isSectionComplete && !isActive ? <CheckCircle size={14} className="text-green-500" /> : null}
                                                {sec.title}
                                            </button>
                                        )
                                    })}
                                    </div>
                                    <label className="flex items-center gap-3 cursor-pointer bg-white hover:bg-gray-50 px-4 py-2 rounded-full shadow-sm border border-gray-200 transition-all shrink-0">
                                        <span className={`text-xs tracking-widest uppercase font-black transition-colors ${isJainMode ? 'text-green-500' : 'text-[#cca776]'}`}>🌿 Jain Mode</span>
                                        <div className={`w-10 h-5 rounded-full transition-all relative shadow-inner ${isJainMode ? 'bg-green-500' : 'bg-gray-200'}`} onClick={() => {
                                            const newVal = !isJainMode;
                                            setIsJainMode(newVal);
                                            if (newVal) {
                                                if (!specialRequests.includes("Jain Preparation (No Onion, No Garlic)")) {
                                                    setSpecialRequests(prev => (prev ? prev + "\n" : "") + "Jain Preparation (No Onion, No Garlic)");
                                                }
                                            } else {
                                                setSpecialRequests(prev => prev.replace(/\n?Jain Preparation \(No Onion, No Garlic\)/g, ""));
                                            }
                                        }}>
                                            <div className={`w-3.5 h-3.5 rounded-full absolute top-[3px] transition-all shadow-md ${isJainMode ? 'bg-white left-6' : 'bg-white left-1'}`} />
                                        </div>
                                    </label>
                                </div>

                                {/* Active Wizard Content */}
                                <div className="p-6 md:p-8 min-h-[400px]">
                                    {renderActiveSectionContent()}
                                </div>

                                {/* Wizard Navigation Footer */}
                                <div className="bg-gray-50 border-t p-6 flex justify-between items-center bg-white/50 backdrop-blur-sm">
                                    <button
                                        onClick={handlePrevSection}
                                        disabled={menuSections.findIndex(s => s.id === activeMenuSection) === 0}
                                        className="px-6 py-3 rounded-xl font-bold border-2 border-gray-200 text-gray-600 hover:border-gray-300 hover:bg-gray-100 transition disabled:opacity-30 disabled:cursor-not-allowed flex items-center gap-2"
                                    >
                                        <ChevronLeft size={18} /> Back
                                    </button>

                                    <button
                                        onClick={handleNextSection}
                                        disabled={menuSections.findIndex(s => s.id === activeMenuSection) === menuSections.length - 1}
                                        className="px-6 py-3 rounded-xl font-bold bg-primary text-white hover:bg-primary-dark transition disabled:opacity-30 disabled:cursor-not-allowed shadow-md flex items-center gap-2"
                                    >
                                        Next <ChevronRight size={18} />
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Sidebar Summary */}
                    <div className="lg:w-96 shrink-0">
                        <div className="bg-white rounded-xl border shadow-sm sticky top-24 overflow-hidden">
                            <div className="bg-secondary text-white p-6">
                                <h3 className="text-xl font-bold mb-1">Your Menu Summary</h3>
                                <p className="text-secondary-100">{selectedPackage?.name} Package</p>
                            </div>
                            <div className="p-6">
                                <div className="space-y-4 mb-6">
                                    <div className="flex justify-between items-center pb-4 border-b">
                                        <span className="text-gray-600">Guest Count</span>
                                        <span className="font-bold text-lg">{guestCount}</span>
                                    </div>
                                    <div className="flex justify-between items-center pb-4 border-b">
                                        <span className="text-gray-600">Base Cost ({fmt(selectedPackage?.pricePerPlate)}/plt)</span>
                                        <span className="font-bold">{fmt(costBreakdown.base)}</span>
                                    </div>
                                    {costBreakdown.addOns > 0 && (
                                        <div className="flex justify-between items-center pb-4 border-b text-primary">
                                            <span>Add-ons Cost</span>
                                            <span className="font-bold">+{fmt(costBreakdown.addOns)}</span>
                                        </div>
                                    )}
                                </div>
                                <div className="flex justify-between items-center mb-6">
                                    <span className="text-xl font-bold">Total Estimated</span>
                                    <span className="text-2xl font-bold text-primary">{fmt(costBreakdown.total)}</span>
                                </div>

                                <textarea
                                    placeholder="Any special diet request? (e.g. Jain food for 10 pax)"
                                    className="w-full border rounded-lg p-3 text-sm mb-6 bg-gray-50 focus:bg-white"
                                    value={specialRequests}
                                    onChange={e => setSpecialRequests(e.target.value)}
                                    rows="2"
                                />

                                <button
                                    disabled={!isStep2Valid}
                                    onClick={() => setStep(3)}
                                    className="w-full bg-primary text-white py-4 rounded-xl font-bold hover:bg-primary-dark transition disabled:opacity-50 disabled:cursor-not-allowed flex justify-center items-center gap-2"
                                >
                                    Review & Confirm <ArrowRight size={20} />
                                </button>
                                {!isStep2Valid && <p className="text-xs text-red-500 text-center mt-3">Please meet guest minimums and select all required menu items.</p>}
                            </div>
                        </div>
                    </div>
                </div>
            )}            {/* Counter Details Modal */}
            {detailedCounter && (
                <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-secondary/95 backdrop-blur-2xl animate-fade-in" onClick={() => setDetailedCounter(null)} />
                    
                    <div className="bg-white w-full max-w-5xl max-h-[90vh] rounded-[2.5rem] overflow-hidden relative shadow-[0_0_100px_rgba(0,0,0,0.5)] animate-scale-up flex flex-col md:flex-row border border-white/10">
                        {/* Close Button */}
                        <button 
                            onClick={() => setDetailedCounter(null)}
                            className="absolute top-6 right-6 z-[1100] p-3 bg-white/10 hover:bg-white text-white hover:text-black rounded-full backdrop-blur-xl transition-all shadow-xl"
                        >
                            <X size={24} strokeWidth={3} />
                        </button>

                        {/* Modal Visual Side */}
                        <div className="w-full md:w-[45%] h-80 md:h-auto overflow-hidden relative group/modal-img">
                            {detailedCounter.varieties?.length > 0 ? (
                                <CounterVarietySlider varieties={detailedCounter.varieties} autoScrollInterval={4000} />
                            ) : (
                                <div className="w-full h-full relative">
                                    <img src={getImageUrl(detailedCounter.image)} className="w-full h-full object-cover transition-transform duration-1000 group-hover/modal-img:scale-110" />
                                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                                </div>
                            )}
                            
                            {/* Mobile Title Overlay */}
                            <div className="absolute bottom-0 left-0 w-full p-8 text-white md:hidden">
                                <h2 className="text-3xl font-black">{detailedCounter.name}</h2>
                                <p className="text-sm font-bold opacity-80 mt-1 uppercase tracking-widest">Premium Live Counter</p>
                            </div>
                        </div>

                        {/* Modal Info Side */}
                        <div className="w-full md:w-[55%] p-10 overflow-y-auto bg-white flex flex-col">
                            <div className="hidden md:block mb-8">
                                <div className="flex items-center gap-3 mb-2">
                                    <span className="bg-primary/10 text-primary text-[10px] font-black uppercase tracking-[0.2em] px-3 py-1.5 rounded-full border border-primary/20">Culinary Experience</span>
                                    {detailedCounter.isAddOn && <span className="bg-blue-50 text-blue-600 text-[10px] font-black uppercase tracking-[0.2em] px-3 py-1.5 rounded-full border border-blue-200">Pre-Booking Special</span>}
                                </div>
                                <h2 className="text-4xl font-black text-secondary leading-none">{detailedCounter.name}</h2>
                            </div>

                            <div className="space-y-8 flex-1">
                                <div className="p-6 bg-gray-50 rounded-2xl border border-gray-100/50">
                                    <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3 flex items-center gap-2">
                                        <Info size={14} className="text-primary" /> Service Description
                                    </h4>
                                    <p className="text-gray-600 leading-relaxed font-medium">{detailedCounter.description}</p>
                                </div>

                                {detailedCounter.varieties?.length > 0 && (
                                    <div>
                                        <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-5 flex items-center gap-2">
                                            <Star size={14} className="text-primary" /> INCLUDED VARIETIES ({detailedCounter.varieties.length})
                                        </h4>
                                        <div className="grid grid-cols-1 gap-4">
                                            {detailedCounter.varieties.map((v, idx) => (
                                                <div key={idx} className="flex gap-5 p-5 rounded-3xl bg-white border border-gray-100 group/v-item transition-all hover:border-primary/30 hover:shadow-xl hover:translate-x-2">
                                                    <div className="w-20 h-20 rounded-2xl overflow-hidden shrink-0 border-2 border-white shadow-md">
                                                        <img src={getImageUrl(v.image)} className="w-full h-full object-cover group-hover/v-item:scale-110 transition-transform duration-700" />
                                                    </div>
                                                    <div className="flex-1">
                                                        <p className="font-extrabold text-secondary text-lg group-hover/v-item:text-primary transition-colors">{v.name}</p>
                                                        <p className="text-sm text-gray-500 leading-relaxed mt-1 font-medium">{v.description || 'Expertly crafted live variety for a gourmet guest experience.'}</p>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Modal Footer (Fixed for action) */}
                            <div className="mt-10 pt-8 border-t border-gray-100 flex items-center justify-between sticky bottom-0 bg-white">
                                <div className="flex flex-col">
                                    <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Package Pricing</span>
                                    <div className="flex items-baseline gap-1">
                                        <span className="text-3xl font-black text-secondary">{detailedCounter.isAddOn ? fmt(detailedCounter.addOnPricePerPlate) : 'Included'}</span>
                                        <span className="text-sm font-bold text-gray-400">/ guest</span>
                                    </div>
                                </div>
                                
                                <button 
                                    onClick={() => {
                                        if (!selectedCounters.includes(detailedCounter._id)) toggleCounterSelection(detailedCounter);
                                        setDetailedCounter(null);
                                    }}
                                    className={`px-10 py-5 rounded-2xl font-black text-base transition-all flex items-center gap-3 shadow-2xl relative overflow-hidden group/action ${selectedCounters.includes(detailedCounter._id) ? 'bg-secondary text-white shadow-secondary/40' : 'bg-primary text-white shadow-primary/40 hover:scale-[1.05] active:scale-[0.98]'}`}
                                >
                                    <div className="absolute inset-0 bg-white/20 translate-y-full hover:translate-y-0 transition-transform duration-300" />
                                    {selectedCounters.includes(detailedCounter._id) ? <><CheckCircle size={24} /> Already Added</> : <><Zap size={24} fill="currentColor" /> Add to Package</>}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Step 3: Confirmed / Review */}
            {step === 3 && (
                <div className="max-w-2xl mx-auto bg-white rounded-xl border shadow-sm p-8 text-center animate-fade-in">
                    <div className="w-20 h-20 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-6">
                        <Check size={40} />
                    </div>
                    <h2 className="text-3xl font-bold mb-4">Selection Confirmed!</h2>
                    <p className="text-gray-600 mb-8">Your catering menu for {guestCount} guests has been finalized. Estimated total is {fmt(costBreakdown.total)}. This goes directly into the booking/payment flow (mocked for this demo).</p>

                    <button onClick={() => window.location.reload()} className="bg-secondary text-white px-8 py-3 rounded-xl font-bold hover:bg-secondary/90 transition">
                        Start New Booking
                    </button>
                </div>
            )}
            
            {isJainMode && step === 2 && (
                <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-green-500/90 backdrop-blur-md text-white px-6 py-3 rounded-full shadow-lg text-sm font-bold flex items-center gap-2 z-[9999] animate-bounce">
                    🌿 Showing Jain-friendly items only
                </div>
            )}
        </div>
    );
}
