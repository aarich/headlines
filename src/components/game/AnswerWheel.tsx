import React, { useEffect, useMemo, useRef, useState, useCallback } from 'react';

// Tuning constants
const FADE_DISTANCE = 3; // How many items to show on each side
const FADE_SPEED = 0.3; // Opacity drop per step
const SCALE_SPEED = 0.3; // Scale drop per step
const BLUR_SPEED = 0.8; // Blur amount per step (px)
const ITEM_WIDTH = 96; // px

export const PLACEHOLDER_VALUE = '##HEADLINES_PLACEHOLDER##';
const PLACEHOLDER_TEXT = 'Choose one →';

interface AnswerWheelProps {
  choices: string[];
  onSetGuess: (guess: string) => void;
}

const clamp = (val: number, min: number, max: number) => Math.max(min, Math.min(val, max));

const AnswerWheel: React.FC<AnswerWheelProps> = ({ choices, onSetGuess }) => {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const wheelRef = useRef<HTMLDivElement>(null);

  const displayChoices = useMemo(() => [PLACEHOLDER_TEXT, ...choices], [choices]);

  useEffect(() => {
    if (selectedIndex === 0) {
      onSetGuess(PLACEHOLDER_VALUE);
    } else if (displayChoices.length > 1) {
      onSetGuess(displayChoices[selectedIndex]);
    }
  }, [selectedIndex, displayChoices, onSetGuess]);

  // Keyboard support
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') {
        setSelectedIndex(prev => clamp(prev - 1, 0, displayChoices.length - 1));
      } else if (e.key === 'ArrowRight') {
        setSelectedIndex(prev => clamp(prev + 1, 0, displayChoices.length - 1));
      }
    },
    [displayChoices]
  );

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  // Wheel support
  const handleWheel = (e: React.WheelEvent) => {
    setSelectedIndex(prev => clamp(prev + (e.deltaY > 0 ? 1 : -1), 0, displayChoices.length - 1));
  };

  // Drag support
  const dragStartX = useRef<number | null>(null);
  const dragStartIndex = useRef<number>(0);
  const dragging = useRef(false);

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
    newIndex = clamp(newIndex, 0, displayChoices.length - 1);
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
    newIndex = clamp(newIndex, 0, displayChoices.length - 1);
    setSelectedIndex(newIndex);
  };
  const handleTouchEnd = () => {
    dragging.current = false;
    dragStartX.current = null;
    window.removeEventListener('touchmove', handleTouchMove);
    window.removeEventListener('touchend', handleTouchEnd);
  };

  return (
    <div
      className="relative w-full max-w-2xl mx-auto h-20 overflow-hidden select-none flex items-center justify-center focus:outline-none"
      ref={wheelRef}
      onWheel={handleWheel}
      onMouseDown={handleMouseDown}
      onTouchStart={handleTouchStart}
      role="listbox"
      style={{ height: 80 }}
    >
      <div
        className="absolute left-1/2 top-1/2 "
        style={{ transform: 'translate(-50%, -50%)', width: '100%', height: '100%' }}
      >
        {displayChoices.map((choiceText, index) => {
          const distance = index - selectedIndex;
          if (Math.abs(distance) > FADE_DISTANCE) return null;
          const opacity = Math.max(0, 1 - Math.abs(distance) * FADE_SPEED);
          const scale = Math.max(0.7, 1 - Math.abs(distance) * SCALE_SPEED);
          const blur = Math.abs(distance) === 0 ? 0 : Math.min(2, Math.abs(distance) * BLUR_SPEED);
          const isSelected = index === selectedIndex;
          const isPlaceholder = choiceText === PLACEHOLDER_TEXT;

          let buttonClasses =
            'absolute top-1/2 font-medium rounded-lg transition-colors focus:outline-none cursor-pointer';

          if (isPlaceholder) {
            buttonClasses += ' italic text-gray-500 dark:text-gray-500 text-sm font-normal'; // Placeholder: italic, gray, smaller, lighter
            if (isSelected) {
              buttonClasses += ' z-15'; // Placeholder selected: high z-index, but no bold/shadow/blue
            }
          } else {
            // Regular item
            if (isSelected) {
              buttonClasses += ' z-15 text-blue-600 dark:text-blue-400 shadow-lg font-bold';
            } else {
              buttonClasses += ' text-gray-600 dark:text-gray-400 bg-transparent';
            }
            buttonClasses += ' text-xl hover:text-blue-500 dark:hover:text-blue-300'; // Hover effect for non-placeholders
          }

          return (
            <button
              key={choiceText === PLACEHOLDER_TEXT ? PLACEHOLDER_VALUE : choiceText}
              type="button"
              className={buttonClasses}
              style={{
                left: `calc(50% + ${distance * ITEM_WIDTH}px)`,
                transform: `translate(-50%, -50%) scale(${scale})`,
                opacity,
                minWidth: ITEM_WIDTH - 16,
                filter: `blur(${blur}px)`,
                transition:
                  'transform 300ms cubic-bezier(0.4,0,0.2,1), opacity 300ms cubic-bezier(0.4,0,0.2,1)',
              }}
              onClick={() => setSelectedIndex(index)}
              tabIndex={isSelected ? 0 : -1}
              aria-current={isSelected}
              aria-label={choiceText}
            >
              {choiceText}
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default AnswerWheel;
