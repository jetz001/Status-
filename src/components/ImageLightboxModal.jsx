import React from 'react';
import { X, Download } from 'lucide-react';

export default function ImageLightboxModal({ imageUrl, onClose }) {
  if (!imageUrl) return null;

  return (
    <div 
      onClick={onClose}
      className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-4 backdrop-blur-sm select-none"
    >
      <div 
        onClick={(e) => e.stopPropagation()}
        className="relative max-w-5xl max-h-[90vh] flex flex-col items-center"
      >
        <div className="absolute -top-10 right-0 flex items-center space-x-3">
          <a 
            href={imageUrl}
            download={`image-${Date.now()}.png`}
            className="p-1.5 bg-white/10 hover:bg-white/20 text-white rounded transition flex items-center space-x-1 text-xs"
          >
            <Download size={14} />
            <span>Download</span>
          </a>
          <button 
            onClick={onClose}
            className="p-1.5 bg-white/10 hover:bg-red-600 text-white rounded transition"
          >
            <X size={16} />
          </button>
        </div>

        <img 
          src={imageUrl} 
          alt="Full size attachment" 
          className="max-w-full max-h-[85vh] rounded-lg shadow-2xl object-contain border border-white/10" 
        />
      </div>
    </div>
  );
}
