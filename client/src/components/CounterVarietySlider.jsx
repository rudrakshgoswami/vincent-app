import { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight, Utensils } from 'lucide-react';
import { getImageUrl } from '../api';

export default function CounterVarietySlider({ varieties, autoScrollInterval = 3000, showProgress = true }) {
    const [currentIndex, setCurrentIndex] = useState(0);
    const [isHovered, setIsHovered] = useState(false);
    const [imageError, setImageError] = useState({});

    useEffect(() => {
        if (isHovered || !varieties || varieties.length <= 1) return;
        const interval = setInterval(() => {
            setCurrentIndex((prev) => (prev + 1) % varieties.length);
        }, autoScrollInterval);
        return () => clearInterval(interval);
    }, [isHovered, varieties?.length, autoScrollInterval]);

    const handlePrev = (e) => {
        e.stopPropagation();
        setCurrentIndex((prev) => (prev - 1 + varieties.length) % varieties.length);
    };

    const handleNext = (e) => {
        e.stopPropagation();
        setCurrentIndex((prev) => (prev + 1) % varieties.length);
    };

    if (!varieties || varieties.length === 0) return null;

    return (
        <div 
            className="relative w-full h-full group/slider overflow-hidden select-none cursor-pointer"
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
        >
            {/* Progress Indicators */}
            {showProgress && varieties.length > 1 && (
                <div className="absolute top-0 left-0 w-full h-1 z-30 flex gap-0.5 px-0.5 pt-0.5">
                    {varieties.map((_, idx) => (
                        <div key={idx} className="flex-1 h-full bg-white/20 rounded-full overflow-hidden">
                            <div 
                                className={`h-full bg-primary transition-all duration-[3000ms] linear ${idx === currentIndex && !isHovered ? 'w-full' : idx < currentIndex ? 'w-full' : 'w-0'}`}
                            />
                        </div>
                    ))}
                </div>
            )}

            {/* Slides */}
            <div 
                className="flex w-full h-full transition-transform duration-700 cubic-bezier(0.4, 0, 0.2, 1)"
                style={{ transform: `translate3d(-${currentIndex * 100}%, 0, 0)` }}
            >
                {varieties.map((vari, idx) => (
                    <div key={idx} className="w-full h-full shrink-0 relative overflow-hidden">
                        {imageError[idx] ? (
                            <div className="w-full h-full bg-gray-100 flex flex-col items-center justify-center text-gray-300 p-4">
                                <Utensils size={40} className="mb-2 opacity-20" />
                                <p className="text-[10px] font-bold uppercase tracking-widest">{vari.name}</p>
                            </div>
                        ) : (
                            <img 
                                src={getImageUrl(vari.image)} 
                                alt={vari.name} 
                                onError={() => setImageError(prev => ({...prev, [idx]: true}))}
                                className={`w-full h-full object-cover transition-transform duration-[5s] ${currentIndex === idx ? 'scale-110' : 'scale-100'}`} 
                            />
                        )}
                        
                        {/* Elegant Overlay */}
                        <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-100 group-hover/slider:opacity-90 transition-opacity">
                            <div className="absolute bottom-6 left-6 right-6 transform transition-all duration-500 delay-100">
                                <p className="text-white text-base font-black truncate drop-shadow-sm">{vari.name}</p>
                                <p className="text-white/70 text-[10px] line-clamp-1 mt-0.5 font-bold tracking-wide italic">{vari.description}</p>
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {/* Manual Controls */}
            {varieties.length > 1 && (
                <>
                    <button 
                        onClick={handlePrev}
                        className="absolute left-4 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-black/20 backdrop-blur-xl text-white flex items-center justify-center opacity-0 group-hover/slider:opacity-100 transition-all hover:bg-primary hover:scale-110 z-30"
                    >
                        <ChevronLeft size={20} />
                    </button>
                    <button 
                        onClick={handleNext}
                        className="absolute right-4 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-black/20 backdrop-blur-xl text-white flex items-center justify-center opacity-0 group-hover/slider:opacity-100 transition-all hover:bg-primary hover:scale-110 z-30"
                    >
                        <ChevronRight size={20} />
                    </button>
                </>
            )}
        </div>
    );
}
