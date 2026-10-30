import React, { useRef } from 'react';
import { Check, ChevronLeft, ChevronRight, Utensils } from 'lucide-react';
import { getImageUrl } from '../api';

/**
 * A standard, high-performance horizontal scrolling carousel for sub-flavors.
 * Props:
 * - variants: Array of flavor objects { name, image, price }
 * - selectedNames: Array of selected flavor names
 * - onToggle: Function(variantName) to trigger selection
 */
export default function FlavorCarousel({ variants = [], selectedNames = [], onToggle }) {
    const trackRef = useRef(null);

    // Config
    const CARD_W = 155; // width + gap
    const GAP = 12;

    // Minimum variants check
    if (!variants || variants.length === 0) return null;

    const scroll = (dir) => {
        if (trackRef.current) {
            trackRef.current.scrollBy({ left: dir * CARD_W, behavior: 'smooth' });
        }
    };

    const scrollToDot = (index) => {
        if (trackRef.current) {
            const children = trackRef.current.children;
            if (children[index]) {
                const targetScroll = children[index].offsetLeft - trackRef.current.offsetLeft;
                trackRef.current.scrollTo({ left: targetScroll, behavior: 'smooth' });
            }
        }
    };

    return (
        <div className="flavor-carousel-root relative w-full overflow-hidden py-1">
            <style>{`
                .carousel-arrow {
                    position: absolute; top: 50%; transform: translateY(-50%); z-index: 10;
                    width: 32px; height: 32px; border-radius: 50%; border: none; cursor: pointer;
                    background: #fff; color: #cca776; display: flex; align-items: center; justify-content: center;
                    box-shadow: 0 4px 12px rgba(0,0,0,0.15); transition: all 0.2s;
                }
                .carousel-arrow:hover { background: #cca776; color: #fff; transform: translateY(-50%) scale(1.1); }
                .carousel-arrow.left { left: 4px; }
                .carousel-arrow.right { right: 4px; }
                
                .carousel-mask { overflow: hidden; border-radius: 0.75rem; padding: 10px 0; margin: -10px 0; }
                
                .carousel-track { 
                    display: flex; 
                    overflow-x: auto; 
                    scroll-behavior: smooth;
                    scroll-snap-type: x mandatory;
                    -webkit-overflow-scrolling: touch;
                    margin: 0 4px; 
                    /* Hide scrollbar */
                    scrollbar-width: none; /* Firefox */
                    -ms-overflow-style: none;  /* IE and Edge */
                }
                .carousel-track::-webkit-scrollbar { display: none; /* Chrome/Safari */ }
                
                .flavor-card-custom {
                    flex-shrink: 0; position: relative; border-radius: 0.9rem; overflow: hidden;
                    background: #fff; display: flex; flex-direction: column; cursor: pointer; border: none; outline: none; padding: 0;
                    box-shadow: 0 2px 10px rgba(0,0,0,0.06); transition: all 0.4s cubic-bezier(0.25,0.8,0.25,1);
                    scroll-snap-align: start; /* snap point for scrolling */
                }
                .flavor-card-custom:hover { transform: translateY(-4px); box-shadow: 0 10px 24px rgba(0,0,0,0.12); }
                .flavor-card-custom.selected { outline: 2px solid #cca776; outline-offset: 2px; transform: scale(1.02); box-shadow: 0 8px 24px rgba(204,167,118,0.3); }
                
                .flavor-img-wrap { width: 100%; aspect-ratio: 1; overflow: hidden; position: relative; background: #f9f9f9; }
                .flavor-img { width: 100%; height: 100%; object-fit: cover; transition: transform 0.6s ease; }
                .flavor-card-custom:hover .flavor-img { transform: scale(1.08); }
                .flavor-card-custom.selected .flavor-img { transform: scale(1.05); }
                
                .flavor-overlay { position: absolute; inset: 0; background: linear-gradient(to top, rgba(0,0,0,0.55) 0%, rgba(0,0,0,0.05) 55%, transparent); }
                .flavor-check {
                    position: absolute; top: 8px; right: 8px; z-index: 5;
                    width: 22px; height: 22px; border-radius: 50%; background: #cca776; color: #fff;
                    display: flex; align-items: center; justify-content: center; box-shadow: 0 3px 10px rgba(204,167,118,0.4);
                    animation: popIn 0.3s cubic-bezier(0.34,1.56,0.64,1) forwards;
                }
                @keyframes popIn { from { transform: scale(0); opacity: 0; } to { transform: scale(1); opacity: 1; } }
                
                .flavor-body { padding: 8px; display: flex; flex-direction: column; align-items: center; }
                .flavor-name { position: absolute; bottom: 8px; left: 8px; right: 8px; font-size: 12px; font-weight: 800; color: #fff; text-shadow: 0 1px 3px rgba(0,0,0,0.7); text-align: center; }
                
                .selected-pill {
                    background: rgba(204,167,118,0.12); padding: 5px; display: flex; justify-content: center; width: 100%;
                    font-size: 9.5px; font-weight: 800; color: #cca776; text-transform: uppercase; letter-spacing: 0.1em;
                }
            `}</style>

            <div className="carousel-viewport relative">
                <button className="carousel-arrow left" onClick={(e) => { e.stopPropagation(); e.preventDefault(); scroll(-1); }}>
                    <ChevronLeft size={18} strokeWidth={3} />
                </button>

                <div className="carousel-mask px-8">
                    <div
                        ref={trackRef}
                        className="carousel-track items-center"
                        style={{ gap: GAP }}
                    >
                        {variants.map((v, i) => {
                            const isSelected = selectedNames.includes(v.name);
                            return (
                                <button
                                    key={`${v.name}-${i}`}
                                    className={`flavor-card-custom ${isSelected ? 'selected' : ''}`}
                                    style={{ minWidth: CARD_W - GAP, width: CARD_W - GAP }}
                                    onClick={(e) => {
                                        e.preventDefault();
                                        e.stopPropagation();
                                        onToggle(v.name);
                                    }}
                                >
                                    <div className="flavor-img-wrap">
                                        {v.image ? (
                                            <img src={(typeof getImageUrl === 'function') ? getImageUrl(v.image) : v.image} alt={v.name} className="flavor-img" loading="lazy" />
                                        ) : (
                                            <div className="w-full h-full flex items-center justify-center">
                                                <Utensils size={32} className="text-gray-300" />
                                            </div>
                                        )}
                                        <div className="flavor-overlay" />
                                        
                                        {/* Name overlay */}
                                        <span className="flavor-name leading-tight">{v.name}</span>

                                        {/* Floating Checkmark Selection */}
                                        {isSelected && (
                                            <div className="flavor-check">
                                                <Check size={13} strokeWidth={4} />
                                            </div>
                                        )}
                                    </div>

                                    {/* Selected Pill Header */}
                                    {isSelected && (
                                        <div className="selected-pill">✓ Selected</div>
                                    )}
                                </button>
                            );
                        })}
                    </div>
                </div>

                <button className="carousel-arrow right" onClick={(e) => { e.stopPropagation(); e.preventDefault(); scroll(1); }}>
                    <ChevronRight size={18} strokeWidth={3} />
                </button>
            </div>
            
            {/* Dots */}
            <div className="flex justify-center flex-wrap gap-1.5 mt-3 mb-1 px-4">
                {variants.map((v, i) => (
                    <button
                        key={`dot-${i}`}
                        onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            scrollToDot(i);
                        }}
                        className={`w-1.5 h-1.5 rounded-full transition-all duration-300 ${selectedNames.includes(v.name) ? 'bg-[#cca776] scale-150' : 'bg-[#cca776]/30'}`}
                    />
                ))}
            </div>
        </div>
    );
}
