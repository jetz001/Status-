import React, { useEffect, useRef, useState } from 'react';
import { ChevronRight } from 'lucide-react';

export default function ContextMenu({
  isOpen,
  position = { x: 0, y: 0 },
  items = [],
  onClose
}) {
  const menuRef = useRef(null);
  const [adjustedPos, setAdjustedPos] = useState({ x: 0, y: 0 });
  const [activeSubmenuIndex, setActiveSubmenuIndex] = useState(null);

  // Viewport boundary collision calculation
  useEffect(() => {
    if (!isOpen) {
      setActiveSubmenuIndex(null);
      return;
    }

    const updatePosition = () => {
      if (!menuRef.current) return;
      const menuRect = menuRef.current.getBoundingClientRect();
      const padding = 12;
      let newX = position.x;
      let newY = position.y;

      if (newX + menuRect.width > window.innerWidth - padding) {
        newX = window.innerWidth - menuRect.width - padding;
      }
      if (newY + menuRect.height > window.innerHeight - padding) {
        newY = window.innerHeight - menuRect.height - padding;
      }
      if (newX < padding) newX = padding;
      if (newY < padding) newY = padding;

      setAdjustedPos({ x: newX, y: newY });
    };

    // Run after DOM render
    const frame = requestAnimationFrame(updatePosition);
    return () => cancelAnimationFrame(frame);
  }, [isOpen, position]);

  // Handle click outside and Escape key
  useEffect(() => {
    if (!isOpen) return;

    const handleMouseDown = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        onClose();
      }
    };

    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    const handleScroll = () => {
      onClose();
    };

    window.addEventListener('mousedown', handleMouseDown);
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('scroll', handleScroll, true);

    return () => {
      window.removeEventListener('mousedown', handleMouseDown);
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('scroll', handleScroll, true);
    };
  }, [isOpen, onClose]);

  if (!isOpen || !items || items.length === 0) return null;

  return (
    <div
      ref={menuRef}
      style={{
        top: `${adjustedPos.y}px`,
        left: `${adjustedPos.x}px`
      }}
      className="fixed z-[9999] min-w-[210px] bg-[#24262b] border border-[#383a3e] rounded-xl shadow-2xl p-1.5 text-xs text-[#dcdce0] select-none animate-in fade-in zoom-in-95 duration-100"
    >
      {items.map((item, index) => {
        if (item.type === 'separator') {
          return <div key={`sep-${index}`} className="my-1 border-t border-[#34363a]" />;
        }

        const hasSubmenu = item.submenu && item.submenu.length > 0;
        const isSubmenuOpen = activeSubmenuIndex === index;
        const Icon = item.icon;

        return (
          <div
            key={`item-${index}`}
            className="relative"
            onMouseEnter={() => {
              if (hasSubmenu) setActiveSubmenuIndex(index);
              else setActiveSubmenuIndex(null);
            }}
          >
            <button
              type="button"
              disabled={item.disabled}
              onClick={(e) => {
                e.stopPropagation();
                if (item.disabled) return;
                if (!hasSubmenu && item.onClick) {
                  item.onClick();
                  onClose();
                }
              }}
              className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-left transition cursor-pointer ${
                item.disabled
                  ? 'opacity-40 cursor-not-allowed'
                  : item.danger
                  ? 'hover:bg-red-500/20 text-red-400 hover:text-red-300'
                  : isSubmenuOpen
                  ? 'bg-[#333538] text-white'
                  : 'hover:bg-[#2e3034] text-gray-200 hover:text-white'
              }`}
            >
              <div className="flex items-center space-x-2.5 truncate">
                {Icon && <Icon size={14} className={item.danger ? 'text-red-400' : item.iconColor || 'text-gray-400'} />}
                {item.colorDot && (
                  <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: item.colorDot }} />
                )}
                <span className="truncate font-medium">{item.label}</span>
              </div>

              <div className="flex items-center space-x-1 flex-shrink-0 ml-3">
                {item.badge && (
                  <span className="text-[10px] px-1.5 py-0.2 rounded bg-[#18191c] text-gray-400 border border-[#383a3e]">
                    {item.badge}
                  </span>
                )}
                {hasSubmenu && <ChevronRight size={13} className="text-gray-400" />}
              </div>
            </button>

            {/* Submenu flyout */}
            {hasSubmenu && isSubmenuOpen && (
              <div
                className="absolute left-full top-0 -ml-1 min-w-[180px] bg-[#24262b] border border-[#383a3e] rounded-xl shadow-2xl p-1.5 z-[10000] animate-in fade-in zoom-in-95 duration-75"
                style={{
                  // If opening to the right would clip off-screen, open to left
                  transform: adjustedPos.x + 390 > window.innerWidth ? 'translateX(calc(-200% - 10px))' : 'none'
                }}
              >
                {item.submenu.map((sub, subIdx) => {
                  if (sub.type === 'separator') {
                    return <div key={`sub-sep-${subIdx}`} className="my-1 border-t border-[#34363a]" />;
                  }

                  const SubIcon = sub.icon;
                  return (
                    <button
                      key={`sub-${subIdx}`}
                      type="button"
                      disabled={sub.disabled}
                      onClick={(e) => {
                        e.stopPropagation();
                        if (sub.disabled) return;
                        if (sub.onClick) sub.onClick();
                        onClose();
                      }}
                      className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-left transition cursor-pointer ${
                        sub.disabled
                          ? 'opacity-40 cursor-not-allowed'
                          : sub.danger
                          ? 'hover:bg-red-500/20 text-red-400'
                          : 'hover:bg-[#2e3034] text-gray-200 hover:text-white'
                      }`}
                    >
                      <div className="flex items-center space-x-2 truncate">
                        {SubIcon && <SubIcon size={13} className={sub.iconColor || 'text-gray-400'} />}
                        {sub.colorDot && (
                          <span className="w-2.5 h-2.5 rounded-full flex-shrink-0 shadow-sm" style={{ backgroundColor: sub.colorDot }} />
                        )}
                        <span className="truncate">{sub.label}</span>
                      </div>
                      {sub.checked && <span className="text-purple-400 text-xs font-bold">✓</span>}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

