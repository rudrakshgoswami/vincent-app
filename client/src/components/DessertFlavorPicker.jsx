import { useState, useRef, useEffect, useCallback } from 'react';
import { Check, ChevronLeft, ChevronRight, Plus, Minus, ShoppingCart, Info, ChevronDown } from 'lucide-react';

// ─── Sample Data ────────────────────────────────────────────────────────────
const DESSERT_MENU = [
  {
    id: 1,
    name: 'Gajar Halwa',
    image: 'https://images.unsplash.com/photo-1666110801823-f4c9f2a84a54?w=400&q=80',
    tag: 'VEG',
    hasVariants: false,
  },
  {
    id: 2,
    name: 'Rasgulla',
    image: 'https://images.unsplash.com/photo-1588166524941-3bf61a9c41db?w=400&q=80',
    tag: 'VEG',
    hasVariants: false,
  },
  {
    id: 3,
    name: 'Ice Cream',
    image: 'https://images.unsplash.com/photo-1501443762994-82bd5dace89a?w=400&q=80',
    tag: 'VEG',
    hasVariants: false,
  },
  {
    id: 4,
    name: 'Rabdi',
    image: 'https://images.unsplash.com/photo-1520072959219-c595dc870360?w=400&q=80',
    tag: 'VEG',
    hasVariants: true,
    variants: [
      { name: 'Mango Rabdi',      price: null, image: 'https://images.unsplash.com/photo-1553279768-865429fa0078?w=300&q=80' },
      { name: 'Kesar Rabdi',      price: null, image: 'https://images.unsplash.com/photo-1596797038530-2c107229654b?w=300&q=80' },
      { name: 'Dry Fruit Rabdi',  price: null, image: 'https://images.unsplash.com/photo-1606787366850-de6330128bfc?w=300&q=80' },
      { name: 'Chocolate Rabdi',  price: null, image: 'https://images.unsplash.com/photo-1511381939415-e44015466834?w=300&q=80' },
      { name: 'Rose Rabdi',       price: null, image: 'https://images.unsplash.com/photo-1565299585323-38d6b0865b47?w=300&q=80' },
      { name: 'Oreo Rabdi',       price: null, image: 'https://images.unsplash.com/photo-1599599810769-bcde5a160d32?w=300&q=80' },
    ],
  },
];

// ─── Infinite Flavor Carousel ────────────────────────────────────────────────
function FlavorCarousel({ variants, selected, onSelect }) {
  const trackRef   = useRef(null);
  const timerRef   = useRef(null);
  const hoveredRef = useRef(false);
  const CARD_W     = 155; // px including gap
  const GAP        = 12;

  // Triple-clone for seamless loop
  const items = [...variants, ...variants, ...variants];
  const total = variants.length;

  const [offset, setOffset] = useState(total * CARD_W); // start in middle clone
  const [transitioning, setTransitioning] = useState(true);

  const slide = useCallback((dir) => {
    setTransitioning(true);
    setOffset(prev => prev + dir * CARD_W);
  }, [CARD_W]);

  // Handle loop boundary jump (no-transition snap)
  useEffect(() => {
    if (!transitioning) return;
    const raw = offset;
    const min = CARD_W;                      // first real item start
    const max = total * CARD_W * 2;          // last clone region start
    if (raw >= max) {
      const t = setTimeout(() => {
        setTransitioning(false);
        setOffset(raw - total * CARD_W);
      }, 500);
      return () => clearTimeout(t);
    }
    if (raw < min) {
      const t = setTimeout(() => {
        setTransitioning(false);
        setOffset(raw + total * CARD_W);
      }, 500);
      return () => clearTimeout(t);
    }
  }, [offset, total, CARD_W, transitioning]);

  // Re-enable transition after snap
  useEffect(() => {
    if (!transitioning) {
      const t = setTimeout(() => setTransitioning(true), 50);
      return () => clearTimeout(t);
    }
  }, [transitioning]);

  // Auto-slide
  const startAuto = useCallback(() => {
    timerRef.current = setInterval(() => {
      if (!hoveredRef.current) slide(1);
    }, 2200);
  }, [slide]);

  useEffect(() => {
    startAuto();
    return () => clearInterval(timerRef.current);
  }, [startAuto]);

  const handleHover = (val) => {
    hoveredRef.current = val;
  };

  // Touch / swipe
  const touchStart = useRef(null);
  const onTouchStart = (e) => { touchStart.current = e.touches[0].clientX; };
  const onTouchEnd   = (e) => {
    if (touchStart.current === null) return;
    const diff = touchStart.current - e.changedTouches[0].clientX;
    if (Math.abs(diff) > 40) slide(diff > 0 ? 1 : -1);
    touchStart.current = null;
  };

  return (
    <div className="flavor-carousel-root">
      {/* Header */}
      <p className="carousel-heading">
        <Check size={15} style={{ background: 'rgba(204,167,118,.18)', borderRadius: '50%', padding: 2 }} />
        Select One Flavor:
      </p>

      {/* Track wrapper */}
      <div
        className="carousel-viewport"
        onMouseEnter={() => handleHover(true)}
        onMouseLeave={() => handleHover(false)}
        onTouchStart={onTouchStart}
        onTouchEnd={onTouchEnd}
      >
        {/* Prev arrow */}
        <button className="carousel-arrow left" onClick={() => slide(-1)} aria-label="Previous">
          <ChevronLeft size={18} />
        </button>

        {/* Scrolling track */}
        <div className="carousel-mask">
          <div
            ref={trackRef}
            className="carousel-track"
            style={{
              transform:  `translateX(-${offset}px)`,
              transition: transitioning ? 'transform 0.48s cubic-bezier(.25,.8,.25,1)' : 'none',
              gap:        GAP,
            }}
          >
            {items.map((v, i) => {
              const isSel = selected === v.name;
              return (
                <button
                  key={`${v.name}-${i}`}
                  className={`flavor-card ${isSel ? 'selected' : ''}`}
                  style={{ minWidth: CARD_W - GAP, width: CARD_W - GAP }}
                  onClick={() => onSelect(v.name)}
                  tabIndex={i >= total && i < total * 2 ? 0 : -1}
                >
                  {/* Image */}
                  <div className="flavor-img-wrap">
                    <img src={v.image} alt={v.name} className="flavor-img" loading="lazy" />
                    <div className="flavor-overlay" />
                    {isSel && (
                      <div className="flavor-check">
                        <Check size={13} strokeWidth={3.5} />
                      </div>
                    )}
                  </div>
                  {/* Name + price */}
                  <div className="flavor-body">
                    <span className="flavor-name">{v.name}</span>
                    {v.price && <span className="flavor-price">₹{v.price}</span>}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Next arrow */}
        <button className="carousel-arrow right" onClick={() => slide(1)} aria-label="Next">
          <ChevronRight size={18} />
        </button>
      </div>

      {/* Dot indicators */}
      <div className="carousel-dots">
        {variants.map((v, i) => (
          <button
            key={v.name}
            onClick={() => {
              setTransitioning(true);
              setOffset((total + i) * CARD_W);
            }}
            className={`dot ${selected === v.name ? 'active' : ''}`}
            aria-label={`Select ${v.name}`}
          />
        ))}
      </div>
    </div>
  );
}

// ─── Main Component ──────────────────────────────────────────────────────────
export default function DessertFlavorPicker() {
  const [selectedItem,    setSelectedItem]    = useState(null);
  const [selectedFlavor,  setSelectedFlavor]  = useState(null);
  const [quantity,        setQuantity]        = useState(1);
  const [cartAdded,       setCartAdded]       = useState(false);

  const toggleItem = (item) => {
    if (selectedItem?.id === item.id) {
      setSelectedItem(null);
      setSelectedFlavor(null);
      setQuantity(1);
      setCartAdded(false);
    } else {
      setSelectedItem(item);
      setSelectedFlavor(null);
      setQuantity(1);
      setCartAdded(false);
    }
  };

  const handleAddCart = () => {
    setCartAdded(true);
    setTimeout(() => setCartAdded(false), 2000);
  };

  const canAdd = !selectedItem?.hasVariants || !!selectedFlavor;

  return (
    <>
      {/* ── Inline styles (self-contained) ─────────────────────────────── */}
      <style>{CSS}</style>

      <section className="dessert-section">
        <div className="section-header">
          <h2 className="section-title">🍮 Dessert Selection</h2>
          <p className="section-sub">Select your preferred dessert for the event</p>
        </div>

        {/* ── Items grid ─────────────────────────────────────────────── */}
        <div className="items-grid">
          {DESSERT_MENU.map(item => {
            const isOpen = selectedItem?.id === item.id;
            return (
              <div key={item.id} className={`item-col ${isOpen ? 'open' : ''}`}>
                {/* Card */}
                <div className={`item-card ${isOpen ? 'active' : ''}`} onClick={() => toggleItem(item)}>
                  {/* Image */}
                  <div className="card-img-wrap">
                    <img src={item.image} alt={item.name} className="card-img" />
                    <div className="card-img-overlay" />
                    {/* VEG badge */}
                    <div className="veg-badge">
                      <div className="veg-dot" />
                      <span>{item.tag}</span>
                    </div>
                    {/* Check badge */}
                    <div className={`check-badge ${isOpen ? 'visible' : ''}`}>
                      <Check size={13} strokeWidth={3.5} />
                    </div>
                  </div>
                  {/* Footer */}
                  <div className="card-footer">
                    <h3 className={`card-name ${isOpen ? 'gold' : ''}`}>{item.name}</h3>
                    <div className="card-meta">
                      <span className="chef-label">MASTER CHEF PICK</span>
                      <span className={`status-label ${isOpen ? 'gold' : ''}`}>
                        {isOpen ? 'INCLUDED' : 'SELECT PLATE'}
                      </span>
                    </div>
                  </div>
                  {/* Expand indicator */}
                  {item.hasVariants && (
                    <div className={`expand-indicator ${isOpen ? 'rotated' : ''}`}>
                      <ChevronDown size={14} />
                    </div>
                  )}
                </div>

                {/* ── Expandable Flavor Section ─────────────────────── */}
                <div className={`flavor-panel ${isOpen && item.hasVariants ? 'expanded' : ''}`}>
                  <div className="flavor-panel-inner">
                    <FlavorCarousel
                      variants={item.variants || []}
                      selected={selectedFlavor}
                      onSelect={setSelectedFlavor}
                    />

                    {/* No-selection warning */}
                    {!selectedFlavor && (
                      <p className="no-flavor-warn">
                        <Info size={13} />
                        Please select a flavor to continue
                      </p>
                    )}

                    {/* Quantity + Add to Cart */}
                    <div className="cta-row">
                      <div className="qty-control">
                        <button
                          className="qty-btn"
                          onClick={() => setQuantity(q => Math.max(1, q - 1))}
                          disabled={quantity <= 1}
                        >
                          <Minus size={14} />
                        </button>
                        <span className="qty-value">{quantity}</span>
                        <button
                          className="qty-btn"
                          onClick={() => setQuantity(q => q + 1)}
                        >
                          <Plus size={14} />
                        </button>
                      </div>
                      <button
                        className={`add-cart-btn ${canAdd ? '' : 'disabled'} ${cartAdded ? 'added' : ''}`}
                        onClick={canAdd ? handleAddCart : undefined}
                        disabled={!canAdd}
                      >
                        <ShoppingCart size={15} />
                        {cartAdded ? '✓ Added!' : 'Add to Cart'}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </section>
    </>
  );
}

// ─── Styles ─────────────────────────────────────────────────────────────────
const CSS = `
/* ── Section ──────────────────────────────────────────────────── */
.dessert-section {
  font-family: 'Inter', sans-serif;
  padding: 2rem 1.5rem;
  max-width: 1100px;
  margin: 0 auto;
}
.section-header { margin-bottom: 1.75rem; }
.section-title {
  font-size: 1.5rem;
  font-weight: 900;
  color: #1a1208;
  letter-spacing: -.02em;
  margin: 0 0 .25rem;
}
.section-sub {
  font-size: .72rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: .18em;
  color: #9A9A9A;
  margin: 0;
}

/* ── Grid ────────────────────────────────────────────────────── */
.items-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(210px, 1fr));
  gap: 1.25rem;
  align-items: start;
}
.item-col { display: flex; flex-direction: column; }
.item-col.open { grid-column: span 2; }

/* ── Item Card ───────────────────────────────────────────────── */
.item-card {
  position: relative;
  border-radius: 1.25rem;
  overflow: hidden;
  border: 1.5px solid #E8E2D9;
  background: #fff;
  cursor: pointer;
  transition: all .32s cubic-bezier(.25,.8,.25,1);
  box-shadow: 0 2px 8px rgba(0,0,0,.04);
  flex: 1;
  display: flex;
  flex-direction: column;
}
.item-card:hover { border-color: #cca776; box-shadow: 0 8px 28px rgba(204,167,118,.18); transform: translateY(-2px); }
.item-card.active {
  border-color: #cca776;
  ring: 1px solid #cca776;
  box-shadow: 0 8px 28px rgba(204,167,118,.22);
  transform: scale(1.01);
}

/* ── Card image ──────────────────────────────────────────────── */
.card-img-wrap { position: relative; width: 100%; aspect-ratio: 4/3; overflow: hidden; background: #f5f0e8; }
.card-img { width: 100%; height: 100%; object-fit: cover; transition: transform .6s ease; }
.item-card:hover .card-img,
.item-card.active .card-img { transform: scale(1.06); }
.card-img-overlay { position: absolute; inset: 0; background: linear-gradient(to top, rgba(0,0,0,.08), transparent); }

.veg-badge {
  position: absolute; top: 10px; left: 10px; z-index: 5;
  display: flex; align-items: center; gap: 5px;
  background: #22c55e; border-radius: 999px;
  padding: 3px 9px; box-shadow: 0 2px 6px rgba(0,0,0,.18);
}
.veg-dot { width: 6px; height: 6px; background: #fff; border-radius: 50%; }
.veg-badge span { font-size: 9px; color: #fff; font-weight: 900; letter-spacing: .15em; }

.check-badge {
  position: absolute; top: 10px; right: 10px; z-index: 5;
  width: 26px; height: 26px; border-radius: 50%;
  background: #cca776; color: #fff;
  display: flex; align-items: center; justify-content: center;
  box-shadow: 0 3px 10px rgba(204,167,118,.45);
  transform: scale(.5); opacity: 0;
  transition: all .28s cubic-bezier(.34,1.56,.64,1);
}
.check-badge.visible { transform: scale(1); opacity: 1; }

/* ── Card footer ─────────────────────────────────────────────── */
.card-footer { padding: 14px 16px 12px; background: #fff; flex: 1; display: flex; flex-direction: column; gap: 10px; }
.card-name { font-size: 1.05rem; font-weight: 800; color: #1a1208; margin: 0; transition: color .2s; }
.card-name.gold { color: #b5822e; }
.card-meta { display: flex; justify-content: space-between; align-items: center; }
.chef-label { font-size: 7.5px; font-weight: 900; letter-spacing: .2em; color: #9A9A9A; text-transform: uppercase; }
.status-label { font-size: 8px; font-weight: 900; letter-spacing: .15em; text-transform: uppercase; color: rgba(204,167,118,.4); transition: color .2s; }
.status-label.gold { color: #cca776; }

.expand-indicator {
  position: absolute; bottom: 10px; right: 12px;
  color: #cca776; opacity: .6;
  transition: transform .3s ease;
}
.expand-indicator.rotated { transform: rotate(180deg); opacity: 1; }

/* ── Flavor panel (accordion) ────────────────────────────────── */
.flavor-panel {
  max-height: 0;
  overflow: hidden;
  transition: max-height .45s cubic-bezier(.4,0,.2,1), opacity .35s ease;
  opacity: 0;
}
.flavor-panel.expanded { max-height: 600px; opacity: 1; }
.flavor-panel-inner {
  margin-top: 10px;
  padding: 20px 18px 18px;
  background: linear-gradient(135deg, #FDFAF6 0%, #fff 100%);
  border-radius: 1.25rem;
  border: 1.5px solid rgba(204,167,118,.25);
  box-shadow: 0 6px 24px rgba(204,167,118,.08);
  position: relative;
}
.flavor-panel-inner::before {
  content: '';
  position: absolute; top: 0; left: 0;
  width: 4px; height: 100%;
  background: linear-gradient(to bottom, #cca776, rgba(204,167,118,.15));
  border-radius: 999px 0 0 999px;
}

/* ── Carousel root ───────────────────────────────────────────── */
.carousel-heading {
  display: flex; align-items: center; gap: 6px;
  font-size: .72rem; font-weight: 900;
  color: #cca776; text-transform: uppercase; letter-spacing: .12em;
  margin: 0 0 14px 8px;
}

.carousel-viewport {
  position: relative;
  display: flex; align-items: center; gap: 4px;
}

.carousel-mask {
  flex: 1;
  overflow: hidden;
  border-radius: .75rem;
}

.carousel-track {
  display: flex;
  will-change: transform;
}

/* ── Flavor card ─────────────────────────────────────────────── */
.flavor-card {
  flex-shrink: 0;
  border: none; outline: none; cursor: pointer;
  background: #fff;
  border-radius: .9rem;
  overflow: hidden;
  display: flex; flex-direction: column;
  box-shadow: 0 2px 10px rgba(0,0,0,.07);
  transition: transform .3s cubic-bezier(.25,.8,.25,1), box-shadow .3s, ring .3s;
  padding: 0;
}
.flavor-card:hover { transform: translateY(-3px); box-shadow: 0 10px 28px rgba(0,0,0,.14); }
.flavor-card.selected {
  outline: 2px solid #cca776;
  outline-offset: 2px;
  transform: scale(1.04);
  box-shadow: 0 8px 24px rgba(204,167,118,.32);
}
.flavor-img-wrap { position: relative; width: 100%; aspect-ratio: 1; overflow: hidden; background: #f5f0e8; }
.flavor-img { width: 100%; height: 100%; object-fit: cover; transition: transform .6s ease; }
.flavor-card:hover .flavor-img { transform: scale(1.08); }
.flavor-overlay { position: absolute; inset: 0; background: linear-gradient(to top, rgba(0,0,0,.5) 0%, rgba(0,0,0,.05) 55%, transparent); }
.flavor-check {
  position: absolute; top: 7px; right: 7px; z-index: 5;
  width: 22px; height: 22px; border-radius: 50%;
  background: #cca776; color: #fff;
  display: flex; align-items: center; justify-content: center;
  box-shadow: 0 2px 8px rgba(204,167,118,.5);
  animation: popIn .25s cubic-bezier(.34,1.56,.64,1) forwards;
}
@keyframes popIn { from { transform: scale(0); opacity: 0; } to { transform: scale(1); opacity: 1; } }

.flavor-body {
  padding: 7px 8px 8px;
  background: #fff; display: flex; flex-direction: column; align-items: center; gap: 1px;
}
.flavor-name { font-size: 11px; font-weight: 800; color: #1a1208; text-align: center; line-height: 1.3; }
.flavor-card.selected .flavor-name { color: #b5822e; }
.flavor-price { font-size: 10px; font-weight: 700; color: #cca776; }

/* ── Carousel arrows ─────────────────────────────────────────── */
.carousel-arrow {
  width: 30px; height: 30px; border-radius: 50%; border: none; cursor: pointer;
  background: #fff; color: #cca776;
  display: flex; align-items: center; justify-content: center;
  box-shadow: 0 2px 8px rgba(0,0,0,.12);
  transition: all .2s; flex-shrink: 0;
  z-index: 2;
}
.carousel-arrow:hover { background: #cca776; color: #fff; transform: scale(1.08); }

/* ── Dots ────────────────────────────────────────────────────── */
.carousel-dots {
  display: flex; justify-content: center; gap: 5px; margin-top: 11px;
}
.dot {
  width: 6px; height: 6px; border-radius: 50%;
  border: none; cursor: pointer;
  background: rgba(204,167,118,.3);
  transition: all .25s;
}
.dot.active { background: #cca776; transform: scale(1.4); }

/* ── No-flavor warning ───────────────────────────────────────── */
.no-flavor-warn {
  display: flex; align-items: center; gap: 5px;
  font-size: 11px; font-weight: 800; color: #e67e22;
  text-transform: uppercase; letter-spacing: .1em;
  margin: 12px 0 0 4px;
  animation: pulse 1.8s ease-in-out infinite;
}
@keyframes pulse { 0%,100%{opacity:1} 50%{opacity:.55} }

/* ── CTA row ─────────────────────────────────────────────────── */
.cta-row {
  display: flex; align-items: center; gap: 12px;
  margin-top: 14px;
}
.qty-control {
  display: flex; align-items: center; gap: 0;
  background: #F9F6F0; border-radius: 999px;
  border: 1.5px solid rgba(204,167,118,.3);
  overflow: hidden;
}
.qty-btn {
  width: 32px; height: 32px; border: none; cursor: pointer;
  background: transparent; color: #cca776;
  display: flex; align-items: center; justify-content: center;
  transition: background .18s;
}
.qty-btn:hover:not(:disabled) { background: rgba(204,167,118,.15); }
.qty-btn:disabled { opacity: .35; cursor: default; }
.qty-value { font-size: 13px; font-weight: 900; color: #1a1208; min-width: 26px; text-align: center; }

.add-cart-btn {
  flex: 1; padding: 9px 16px; border: none;
  border-radius: 999px; cursor: pointer;
  background: linear-gradient(135deg, #d4a85a 0%, #cca776 50%, #b5822e 100%);
  color: #fff; font-size: 12px; font-weight: 900;
  letter-spacing: .08em; text-transform: uppercase;
  display: flex; align-items: center; justify-content: center; gap: 6px;
  box-shadow: 0 4px 16px rgba(204,167,118,.4);
  transition: all .25s;
}
.add-cart-btn:hover:not(.disabled) { transform: translateY(-1px); box-shadow: 0 7px 22px rgba(204,167,118,.5); }
.add-cart-btn.disabled {
  background: #e0d8cc; color: #9A9A9A;
  box-shadow: none; cursor: not-allowed;
}
.add-cart-btn.added {
  background: linear-gradient(135deg, #22c55e, #16a34a);
  box-shadow: 0 4px 16px rgba(34,197,94,.35);
}

/* ── Responsive ──────────────────────────────────────────────── */
@media (max-width: 640px) {
  .items-grid { grid-template-columns: 1fr 1fr; }
  .item-col.open { grid-column: 1 / -1; }
  .cta-row { flex-direction: column; }
  .add-cart-btn { width: 100%; }
}
`;
