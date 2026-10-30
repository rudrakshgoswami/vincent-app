import React, { useState, useCallback } from 'react';
import Cropper from 'react-easy-crop';
import { getCroppedImg } from '../utils/imageUtils';
import { X, Check, RotateCw, ZoomIn, ZoomOut, Maximize } from 'lucide-react';

const ImageCropperModal = ({ image, onCropComplete, onCancel, aspect = 4 / 3 }) => {
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState(null);

  const onCropChange = (crop) => {
    setCrop(crop);
  };

  const onCropAreaComplete = useCallback((_croppedArea, croppedAreaPixels) => {
    setCroppedAreaPixels(croppedAreaPixels);
  }, []);

  const handleDone = async () => {
    try {
      const croppedImage = await getCroppedImg(image, croppedAreaPixels, rotation);
      onCropComplete(croppedImage);
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="fixed inset-0 z-[110000] flex items-center justify-center p-4 animate-fade-in">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-xl" onClick={onCancel}></div>
      
      <div className="relative bg-[#1a1a1a] rounded-3xl w-full max-w-4xl overflow-hidden shadow-2xl flex flex-col h-[85vh] border border-white/10">
        {/* Header */}
        <div className="p-4 flex items-center justify-between border-b border-white/10 bg-white/5 backdrop-blur-md">
          <div className="flex items-center gap-3">
            <div className="bg-primary/20 p-2 rounded-xl text-primary border border-primary/20">
              <Maximize size={20} />
            </div>
            <div>
              <h3 className="text-white font-bold text-lg leading-tight">Adjust Image</h3>
              <p className="text-gray-400 text-[10px] uppercase tracking-widest font-bold">Pinch to zoom, drag to position</p>
            </div>
          </div>
          <button 
            onClick={onCancel}
            className="p-2 hover:bg-white/10 rounded-full text-gray-400 transition-colors"
          >
            <X size={24} />
          </button>
        </div>

        <div className="relative flex-1 bg-[#111] overflow-hidden">
          <Cropper
            image={image}
            crop={crop}
            zoom={zoom}
            aspect={aspect}
            rotation={rotation}
            onCropChange={onCropChange}
            onCropComplete={onCropAreaComplete}
            onZoomChange={setZoom}
            objectFit="contain"
            showGrid={true}
            style={{
              containerStyle: { background: '#111' },
              cropAreaStyle: { border: '2px solid rgba(255, 255, 255, 0.5)' }
            }}
          />
          
          {/* Helper Badge */}
          <div className="absolute top-4 left-4 z-10 bg-black/60 backdrop-blur-md px-3 py-1.5 rounded-full border border-white/10 flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
            <span className="text-[10px] font-bold text-white uppercase tracking-widest">Live Editor</span>
          </div>

          {/* Guide text */}
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-10 bg-black/60 backdrop-blur-md px-4 py-2 rounded-2xl border border-white/10">
            <p className="text-[11px] text-gray-300">Drag image to position • Use sliders to zoom & rotate</p>
          </div>
        </div>

        {/* Controls */}
        <div className="p-6 bg-white/5 backdrop-blur-lg border-t border-white/10 flex flex-col md:flex-row gap-8">
          {/* Live Preview / Frame */}
          <div className="shrink-0 space-y-3 hidden md:block">
            <span className="text-gray-400 text-xs font-bold uppercase tracking-wider block px-1">Live Feed Preview</span>
            <div 
              style={{ 
                width: '200px', 
                height: `${200 / aspect}px`,
                position: 'relative',
                overflow: 'hidden',
                borderRadius: '16px',
                background: '#111',
                border: '2px solid rgba(255,255,255,0.1)',
                boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.5)'
              }}
            >
              <div
                style={{
                  width: '100%',
                  height: '100%',
                  backgroundImage: `url(${image})`,
                  backgroundSize: `${zoom * 100}%`,
                  backgroundPosition: `${50 - (crop.x / zoom)}% ${50 - (crop.y / zoom)}%`,
                  backgroundRepeat: 'no-repeat',
                  transform: `rotate(${rotation}deg)`,
                  transition: 'none',
                  filter: 'brightness(1.1)'
                }}
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent pointer-events-none" />
              <div className="absolute top-2 right-2 bg-primary/80 backdrop-blur-sm text-[8px] font-black text-white px-2 py-0.5 rounded-full uppercase tracking-tighter">Actual Frame</div>
            </div>
          </div>

          <div className="flex-1 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {/* Zoom Control */}
              <div className="space-y-3">
                <div className="flex items-center justify-between px-1">
                  <span className="text-gray-400 text-xs font-bold uppercase tracking-wider">Zoom</span>
                  <span className="text-white text-xs font-mono">{Math.round(zoom * 100)}%</span>
                </div>
                <div className="flex items-center gap-4">
                  <ZoomOut size={16} className="text-gray-500" />
                  <input
                    type="range"
                    value={zoom}
                    min={1}
                    max={3}
                    step={0.1}
                    aria-labelledby="Zoom"
                    onChange={(e) => setZoom(parseFloat(e.target.value))}
                    className="flex-1 accent-primary h-1.5 bg-white/10 rounded-lg appearance-none cursor-pointer"
                  />
                  <ZoomIn size={16} className="text-gray-500" />
                </div>
              </div>

              {/* Rotation Control */}
              <div className="space-y-3">
                <div className="flex items-center justify-between px-1">
                  <span className="text-gray-400 text-xs font-bold uppercase tracking-wider">Rotation</span>
                  <span className="text-white text-xs font-mono">{rotation}°</span>
                </div>
                <div className="flex items-center gap-4">
                  <button 
                    onClick={() => setRotation(r => (r - 90) % 360)}
                    className="p-2 bg-white/5 hover:bg-white/10 rounded-lg text-gray-300 transition-all border border-white/5"
                  >
                    <RotateCw size={16} style={{ transform: 'scaleX(-1)' }} />
                  </button>
                  <input
                    type="range"
                    value={rotation}
                    min={0}
                    max={360}
                    step={1}
                    aria-labelledby="Rotation"
                    onChange={(e) => setRotation(parseInt(e.target.value))}
                    className="flex-1 accent-primary h-1.5 bg-white/10 rounded-lg appearance-none cursor-pointer"
                  />
                  <button 
                    onClick={() => setRotation(r => (r + 90) % 360)}
                    className="p-2 bg-white/5 hover:bg-white/10 rounded-lg text-gray-300 transition-all border border-white/5"
                  >
                    <RotateCw size={16} />
                  </button>
                </div>
              </div>
            </div>

            {/* Footer Buttons */}
            <div className="flex gap-4 pt-2">
              <button 
                onClick={onCancel}
                className="flex-1 bg-white/5 hover:bg-white/10 text-white font-bold py-4 rounded-2xl transition-all border border-white/10 shadow-lg"
              >
                Cancel
              </button>
              <button 
                onClick={handleDone}
                className="flex-[2] bg-primary hover:bg-primary-dark text-white font-bold py-4 rounded-2xl transition-all shadow-lg shadow-primary/20 flex items-center justify-center gap-2"
              >
                <Check size={20} strokeWidth={3} />
                Apply Changes
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ImageCropperModal;
