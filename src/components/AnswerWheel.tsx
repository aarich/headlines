import React, { useState, useEffect, useRef } from 'react';

// Tuning constants
const FADE_DISTANCE = 2; // How many items to show on each side
const FADE_SPEED = 0.4; // Opacity drop per step
const SCALE_SPEED = 0.15; // Scale drop per step
const ANIMATION_DURATION = 300; // ms
const ANIMATION_EASING = 'cubic-bezier(0.4, 0, 0.2, 1)';
const ITEM_WIDTH = 96; // px, width of each item

interface AnswerWheelProps {
  choices: string[];
  onSetGuess: (guess: string) => void;
  disabled?: boolean;
}

const clamp = (val: number, min: number, max: number) => Math.max(min, Math.min(val, max));

const AnswerWheel: React.FC<AnswerWheelProps> = ({ choices, onSetGuess, disabled }) => {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const dragStartX = useRef<number | null>(null);
  const dragStartIndex = useRef<number>(0);
  const dragging = useRef(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!disabled && choices.length > 0) {
      onSetGuess(choices[selectedIndex]);
    }
  }, [selectedIndex, choices, onSetGuess, disabled]);

  // Drag handlers
  const handleMouseDown = (e: React.MouseEvent) => {
    if (disabled) return;
    dragging.current = true;
    dragStartX.current = e.clientX;
    dragStartIndex.current = selectedIndex;
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
  };

  const handleMouseMove = (e: MouseEvent) => {
    if (!dragging.current || dragStartX.current === null) return;
    const dx = e.clientX - dragStartX.current;
    const deltaIndex = Math.round(-dx / ITEM_WIDTH);
    let newIndex = dragStartIndex.current + deltaIndex;
    newIndex = clamp(newIndex, 0, choices.length - 1);
    setSelectedIndex(newIndex);
  };

  const handleMouseUp = () => {
    dragging.current = false;
    dragStartX.current = null;
    window.removeEventListener('mousemove', handleMouseMove);
    window.removeEventListener('mouseup', handleMouseUp);
  };

  // Touch support
  const handleTouchStart = (e: React.TouchEvent) => {
    if (disabled) return;
    dragging.current = true;
    dragStartX.current = e.touches[0].clientX;
    dragStartIndex.current = selectedIndex;
    window.addEventListener('touchmove', handleTouchMove);
    window.addEventListener('touchend', handleTouchEnd);
  };

  const handleTouchMove = (e: TouchEvent) => {
    if (!dragging.current || dragStartX.current === null) return;
    const dx = e.touches[0].clientX - dragStartX.current;
    const deltaIndex = Math.round(-dx / ITEM_WIDTH);
    let newIndex = dragStartIndex.current + deltaIndex;
    newIndex = clamp(newIndex, 0, choices.length - 1);
    setSelectedIndex(newIndex);
  };

  const handleTouchEnd = () => {
    dragging.current = false;
    dragStartX.current = null;
    window.removeEventListener('touchmove', handleTouchMove);
    window.removeEventListener('touchend', handleTouchEnd);
  };

  // Wheel support
  const handleWheel = (e: React.WheelEvent) => {
    if (disabled) return;
    e.preventDefault();
    setSelectedIndex(prev => clamp(prev + (e.deltaY > 0 ? 1 : -1), 0, choices.length - 1));
  };

  // Keyboard support
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (disabled) return;
    if (e.key === 'ArrowLeft') {
      setSelectedIndex(prev => clamp(prev - 1, 0, choices.length - 1));
    } else if (e.key === 'ArrowRight') {
      setSelectedIndex(prev => clamp(prev + 1, 0, choices.length - 1));
    }
  };

  return (
    <div
      ref={containerRef}
      className="relative inline-block w-48 mx-2 h-16 overflow-visible select-none"
      style={{ width: ITEM_WIDTH * (FADE_DISTANCE * 2 + 1) }}
      onMouseDown={handleMouseDown}
      onTouchStart={handleTouchStart}
      onWheel={handleWheel}
      tabIndex={0}
      onKeyDown={handleKeyDown}
      role="listbox"
      aria-activedescendant={choices[selectedIndex]}
    >
      <div className="absolute left-0 top-1/2 w-full" style={{ transform: 'translateY(-50%)' }}>
        {choices.map((choice, index) => {
          const distance = index - selectedIndex;
          if (Math.abs(distance) > FADE_DISTANCE) return null;
          const opacity = Math.max(0, 1 - Math.abs(distance) * FADE_SPEED);
          const scale = Math.max(0.7, 1 - Math.abs(distance) * SCALE_SPEED);
          const x = distance * ITEM_WIDTH;
          const isSelected = index === selectedIndex;
          return (
            <button
              key={choice}
              type="button"
              className={`absolute top-1/2 left-1/2 px-2 py-1 text-center text-2xl font-medium rounded-lg transition-colors
                ${isSelected ? 'z-10 text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900 shadow-lg' : 'text-gray-600 dark:text-gray-400 bg-transparent'}
                ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer hover:text-blue-500 dark:hover:text-blue-300'}`}
              style={{
                transform: `translate(-50%, -50%) translateX(${x}px) scale(${scale})`,
                opacity,
                transition: `transform ${ANIMATION_DURATION}ms ${ANIMATION_EASING}, opacity ${ANIMATION_DURATION}ms ${ANIMATION_EASING}`,
                pointerEvents: isSelected || !disabled ? 'auto' : 'none',
                minWidth: ITEM_WIDTH - 16,
              }}
              onClick={() => setSelectedIndex(index)}
              tabIndex={isSelected ? 0 : -1}
              aria-current={isSelected}
              aria-label={choice}
            >
              {choice}
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default AnswerWheel;
