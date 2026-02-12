import React, { useEffect, useMemo, useState } from 'react';
import onionSvg from 'assets/onion.svg';
import { useSettings } from 'contexts/SettingsContext';

// Animation constants - feel free to adjust these values
const ANIMATION_CONFIG = {
  // Floating animation ranges
  floatDurationRange: { min: 10, max: 20 }, // seconds for one complete float cycle
  floatDistanceRange: { min: 30, max: 80 }, // pixels of vertical movement

  // Movement ranges
  moveDurationRange: { min: 20, max: 40 }, // seconds for one complete movement cycle
  moveDistanceRange: { min: 50, max: 150 }, // pixels of movement
  moveAngleRange: { min: 0, max: 360 }, // angle of movement in degrees

  // Rotation animation
  rotationDuration: 20, // seconds for one complete rotation

  // Color animation
  colorChangeDuration: 8, // seconds for one complete color cycle
  baseHue: 280, // base hue for the neon effect (purple)
  hueRange: 60, // range of hue variation

  // Size and quantity
  minSize: 40, // minimum size in pixels
  maxSize: 150, // maximum size in pixels
  maxOnions: 8, // maximum number of onions on screen

  // Light effect
  pulseDuration: 4, // seconds for one complete pulse cycle
  glowSize: 120, // size of the glow effect in pixels
  glowIntensity: 0.4, // intensity of the glow (0-1)

  // Halo effect
  haloLayers: 3, // number of halo layers per onion
  haloBaseSize: 200, // base size of the largest halo
  haloPulseDuration: 8, // seconds for one complete halo pulse
  haloColors: [
    'hsla(280, 100%, 70%, 0.2)', // purple
    'hsla(320, 100%, 70%, 0.15)', // pink
    'hsla(240, 100%, 70%, 0.1)', // blue
  ],

  // Rotation animation ranges
  rotationDurationRange: { min: 15, max: 45 }, // seconds for one complete rotation
  rotationDirection: [-1, 1], // -1 for counter-clockwise, 1 for clockwise
};

const AnimatedBackground: React.FC = () => {
  const { settings } = useSettings();
  const [isDarkMode, setIsDarkMode] = useState(false);

  // Initialize onions with unique movement patterns
  const onions = useMemo(
    () =>
      Array.from({ length: ANIMATION_CONFIG.maxOnions }, (_, i) => ({
        id: i,
        x: Math.random() * 100,
        y: Math.random() * 100,
        size:
          Math.random() * (ANIMATION_CONFIG.maxSize - ANIMATION_CONFIG.minSize) +
          ANIMATION_CONFIG.minSize,
        rotation: Math.random() * 360,
        floatDuration:
          Math.random() *
            (ANIMATION_CONFIG.floatDurationRange.max - ANIMATION_CONFIG.floatDurationRange.min) +
          ANIMATION_CONFIG.floatDurationRange.min,
        floatDistance:
          Math.random() *
            (ANIMATION_CONFIG.floatDistanceRange.max - ANIMATION_CONFIG.floatDistanceRange.min) +
          ANIMATION_CONFIG.floatDistanceRange.min,
        moveDuration:
          Math.random() *
            (ANIMATION_CONFIG.moveDurationRange.max - ANIMATION_CONFIG.moveDurationRange.min) +
          ANIMATION_CONFIG.moveDurationRange.min,
        moveDistance:
          Math.random() *
            (ANIMATION_CONFIG.moveDistanceRange.max - ANIMATION_CONFIG.moveDistanceRange.min) +
          ANIMATION_CONFIG.moveDistanceRange.min,
        moveAngle: Math.random() * 360,
        rotationDuration:
          Math.random() *
            (ANIMATION_CONFIG.rotationDurationRange.max -
              ANIMATION_CONFIG.rotationDurationRange.min) +
          ANIMATION_CONFIG.rotationDurationRange.min,
        rotationDirection: ANIMATION_CONFIG.rotationDirection[Math.floor(Math.random() * 2)],
      })),
    []
  );

  // Check for dark mode
  useEffect(() => {
    if (settings.displayMode === 'system') {
      const darkModeMediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
      setIsDarkMode(darkModeMediaQuery.matches);

      const handleChange = (e: MediaQueryListEvent) => setIsDarkMode(e.matches);
      darkModeMediaQuery.addEventListener('change', handleChange);
      return () => darkModeMediaQuery.removeEventListener('change', handleChange);
    } else {
      setIsDarkMode(settings.displayMode === 'dark');
    }
  }, [settings.displayMode]);

  if (!settings.showAnimations) {
    return null;
  }

  return (
    <div
      className="fixed inset-0 overflow-hidden pointer-events-none"
      style={
        {
          animation: `cycleHue ${ANIMATION_CONFIG.colorChangeDuration}s linear infinite`,
          '--base-hue': ANIMATION_CONFIG.baseHue,
          '--hue-range': ANIMATION_CONFIG.hueRange,
        } as React.CSSProperties
      }
    >
      {onions.map(onion => (
        <div
          key={onion.id}
          className="absolute"
          style={
            {
              left: `${onion.x}%`,
              top: `${onion.y}%`,
              width: `${onion.size}px`,
              height: `${onion.size}px`,
              animation: `move ${onion.moveDuration}s ease-in-out infinite`,
              '--move-distance': `${onion.moveDistance}px`,
              '--move-angle': `${onion.moveAngle}deg`,
              willChange: 'transform',
            } as React.CSSProperties
          }
        >
          {/* Float wrapper - separates vertical oscillation from the path movement */}
          <div
            className="w-full h-full"
            style={
              {
                animation: `float ${onion.floatDuration}s ease-in-out infinite`,
                '--float-distance': `-${onion.floatDistance}px`,
                willChange: 'transform',
              } as React.CSSProperties
            }
          >
            {/* Consolidated Glow/Halo effect - reduced layers for performance */}
            <div
              className="absolute"
              style={{
                width: `${ANIMATION_CONFIG.haloBaseSize}px`,
                height: `${ANIMATION_CONFIG.haloBaseSize}px`,
                left: '50%',
                top: '50%',
                transform: 'translate(-50%, -50%)',
                background: `radial-gradient(circle, 
                  hsla(var(--animated-hue-value), 100%, 70%, 0.5) 0%,
                  hsla(var(--animated-hue-value), 100%, 70%, 0.2) 40%,
                  transparent 70%
                )`,
                animation: `pulse ${ANIMATION_CONFIG.haloPulseDuration}s ease-in-out infinite`,
                filter: 'blur(12px)',
                zIndex: 0,
                willChange: 'transform, opacity',
              }}
            />

            {/* Onion image with its own rotation animation */}
            <div
              className="absolute z-10 w-full h-full"
              style={
                {
                  left: '50%',
                  top: '50%',
                  transform: `translate(-50%, -50%)`,
                  animation: `rotate ${onion.rotationDuration}s linear infinite`,
                  filter: `
                    hue-rotate(calc(var(--animated-hue-value) * 1deg))
                    drop-shadow(0 0 4px rgba(255, 255, 255, 0.15))
                    ${isDarkMode ? 'brightness(1.1) invert(0.6)' : 'brightness(0.7) invert(0.15)'}
                  `,
                  ['--rotation-direction' as string]: onion.rotationDirection,
                  willChange: 'transform, filter',
                } as React.CSSProperties
              }
            >
              <img
                src={onionSvg}
                alt="Floating onion"
                className="w-full h-full object-contain"
                style={{
                  opacity: isDarkMode ? 0.6 : 0.4,
                }}
              />
            </div>
          </div>
        </div>
      ))}

      <style>
        {`
          @property --animated-hue-value {
            syntax: '<number>';
            initial-value: ${ANIMATION_CONFIG.baseHue};
            inherits: true;
          }

          @keyframes float {
            0%, 100% { transform: translateY(0); }
            50% { transform: translateY(var(--float-distance)); }
          }

          @keyframes move {
            0%, 100% { transform: translate(0, 0); }
            50% {
              transform: translate(
                calc(cos(var(--move-angle)) * var(--move-distance)),
                calc(sin(var(--move-angle)) * var(--move-distance))
              );
            }
          }

          @keyframes rotate {
            from { transform: translate(-50%, -50%) rotate(0deg); }
            to { transform: translate(-50%, -50%) rotate(calc(360deg * var(--rotation-direction))); }
          }

          @keyframes pulse {
            0%, 100% {
              opacity: 0.6;
              transform: translate(-50%, -50%) scale(1);
            }
            50% {
              opacity: 0.2;
              transform: translate(-50%, -50%) scale(1.3);
            }
          }

          @keyframes cycleHue {
            from { --animated-hue-value: var(--base-hue); }
            to { --animated-hue-value: calc(var(--base-hue) + var(--hue-range)); }
          }
        `}
      </style>
    </div>
  );
};

export default AnimatedBackground;
