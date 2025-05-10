import React, { useState, useEffect, useRef } from 'react';

// Tuning constants
const FADE_DISTANCE = 2; // How many items to show on each side
const FADE_SPEED = 0.6; // Opacity drop per step
const SCALE_SPEED = 0.2; // Scale drop per step
const BLUR_SPEED = 0.8; // Blur amount per step (px)
const ANIMATION_DURATION = 300; // ms
const ANIMATION_EASING = 'cubic-bezier(0.4, 0, 0.2, 1)';
const ITEM_WIDTH = window.innerWidth < 768 ? 96 : 132; // px, width of each item - responsive based on screen size

interface AnswerWheelProps {
  choices: string[];
  onSetGuess: (guess: string) => void;
}

const clamp = (val: number, min: number, max: number) => Math.max(min, Math.min(val, max));

const AnswerWheel: React.FC<AnswerWheelProps> = ({ choices, onSetGuess }) => {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const dragStartX = useRef<number | null>(null);
  const dragStartIndex = useRef<number>(0);
  const dragging = useRef(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const itemRefs = useRef<(HTMLButtonElement | null)[]>([]);

  useEffect(() => {
    if (choices.length > 0) {
      onSetGuess(choices[selectedIndex]);
    }
  }, [selectedIndex, choices, onSetGuess]);

  // Center selected item in the wheel
  useEffect(() => {
    if (containerRef.current && itemRefs.current[selectedIndex]) {
      const container = containerRef.current;
      const item = itemRefs.current[selectedIndex];
      if (item) {
        const scrollLeft = item.offsetLeft - container.offsetWidth / 2 + item.offsetWidth / 2;
        container.scrollTo({ left: scrollLeft, behavior: 'smooth' });
      }
    }
  }, [selectedIndex, choices.length]);

  // Drag handlers
  const handleMouseDown = (e: React.MouseEvent) => {
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
    setSelectedIndex(prev => clamp(prev + (e.deltaY > 0 ? 1 : -1), 0, choices.length - 1));
  };

  // Keyboard support
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowLeft') {
      setSelectedIndex(prev => clamp(prev - 1, 0, choices.length - 1));
    } else if (e.key === 'ArrowRight') {
      setSelectedIndex(prev => clamp(prev + 1, 0, choices.length - 1));
    }
  };

  return (
    <div
      ref={containerRef}
      className="relative w-full max-w-2xl mx-auto h-16 overflow-x-auto overflow-y-visible select-none px-2 hide-scrollbar flex items-center"
      onMouseDown={handleMouseDown}
      onTouchStart={handleTouchStart}
      onWheel={handleWheel}
      tabIndex={0}
      onKeyDown={handleKeyDown}
      role="listbox"
      aria-activedescendant={choices[selectedIndex]}
      style={{ scrollSnapType: 'x mandatory' }}
    >
      <div
        className="flex flex-row items-center w-full justify-center relative"
        style={{ minHeight: '100%' }}
      >
        {choices.map((choice, index) => {
          const distance = index - selectedIndex;
          if (Math.abs(distance) > FADE_DISTANCE) return null;
          const opacity = Math.max(0, 1 - Math.abs(distance) * FADE_SPEED);
          const scale = Math.max(0.7, 1 - Math.abs(distance) * SCALE_SPEED);
          const blur = Math.abs(distance) === 0 ? 0 : Math.min(2, Math.abs(distance) * BLUR_SPEED);
          const isSelected = index === selectedIndex;
          return (
            <button
              key={choice}
              ref={el => (itemRefs.current[index] = el)}
              type="button"
              className={`mx-2 px-2 py-1 text-center text-base sm:text-lg md:text-2xl font-medium rounded-lg transition-colors
                ${isSelected ? 'z-10 text-blue-600 dark:text-blue-400 shadow-lg' : 'text-gray-600 dark:text-gray-400 bg-transparent'}
                cursor-pointer hover:text-blue-500 dark:hover:text-blue-300`}
              style={{
                opacity,
                transform: `scale(${scale})`,
                minWidth: ITEM_WIDTH - 16,
                filter: `blur(${blur}px)`,
                transition: `transform ${ANIMATION_DURATION}ms ${ANIMATION_EASING}, opacity ${ANIMATION_DURATION}ms ${ANIMATION_EASING}`,
                scrollSnapAlign: 'center',
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
