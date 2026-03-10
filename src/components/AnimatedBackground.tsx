import { useSettings } from 'contexts/SettingsContext';
import { useMemo } from 'react';

const LineOnionSvg = ({ className, style }: { className: string; style: React.CSSProperties }) => (
  <svg
    viewBox="0 0 100 100"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
    style={style}
    xmlns="http://www.w3.org/2000/svg"
  >
    {/* Outer Silhouette & Sprouting Leaves */}
    <path d="M50 85 C20 85 20 50 42 35 C45 25 40 10 35 5 C45 10 48 20 50 30 C52 20 55 10 65 5 C60 10 55 25 58 35 C80 50 80 85 50 85 Z" />

    {/* Inner Contours to give it volume */}
    <path d="M50 85 C35 85 35 60 46 42" />
    <path d="M50 85 C65 85 65 60 54 42" />

    {/* Roots */}
    <path d="M45 85 L40 92 M50 85 L50 95 M55 85 L60 92" />
  </svg>
);

const LineOnionSvg2 = ({ className, style }: { className: string; style: React.CSSProperties }) => (
  <svg
    viewBox="0 0 100 100"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
    style={style}
    xmlns="http://www.w3.org/2000/svg"
  >
    {/* Outer Silhouette & Sprouting Leaves: Very tall and narrow */}
    <path d="M50 90 C33 90 33 50 45 35 C46 25 42 10 40 5 C46 10 48 20 50 30 C52 20 54 10 60 5 C58 10 54 25 55 35 C67 50 67 90 50 90 Z" />

    {/* Inner Contours */}
    <path d="M50 90 C42 90 42 60 47 40" />
    <path d="M50 90 C58 90 58 60 53 40" />

    {/* Roots */}
    <path d="M47 90 L45 98 M50 90 L50 100 M53 90 L55 98" />
  </svg>
);

const LineOnionSvg3 = ({ className, style }: { className: string; style: React.CSSProperties }) => (
  <svg
    viewBox="0 0 100 100"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
    style={style}
    xmlns="http://www.w3.org/2000/svg"
  >
    {/* Outer Silhouette & Sprouting Leaves: Very wide, squat, single main sprout */}
    <path d="M50 80 C10 80 10 50 45 45 C48 35 48 20 48 10 C50 20 52 35 55 45 C90 50 90 80 50 80 Z" />

    {/* Inner Contours */}
    <path d="M50 80 C25 80 25 60 45 50" />
    <path d="M50 80 C75 80 75 60 55 50" />

    {/* Roots */}
    <path d="M35 80 L30 85 M45 80 L42 88 M50 80 L50 90 M55 80 L58 88 M65 80 L70 85" />
  </svg>
);

type OnionProps = {
  x: number;
  y: number;
  scale: number;
  rotation: number;
  delay: number;
  duration: number;
  variant: number;
};

const Onion = ({ x, y, scale, rotation, delay, duration, variant }: OnionProps) => {
  const SvgComponent = variant === 1 ? LineOnionSvg2 : variant === 2 ? LineOnionSvg3 : LineOnionSvg;

  // Outer Wrapper: handles static position, scale, and base rotation
  return (
    <div
      className="absolute flex items-center justify-center w-24 h-24"
      style={{
        left: `${x}%`,
        top: `${y}%`,
        transform: `scale(${scale}) rotate(${rotation}deg)`,
        // We set the color here so both the SVG and the glow inherit it via currentColor
        color: 'inherit',
      }}
    >
      {/* Inner Wrapper: Handles floating animation separately to avoid overrriting scale */}
      <div
        className="relative w-full h-full group flex items-center justify-center"
        style={{
          willChange: 'transform',
          animation: `smoothFloat ${duration}s ease-in-out ${delay}s infinite alternate`,
        }}
      >
        {/* Ethereal Glow Layer (GPU Accelerated)
        Placed behind the SVG. Uses a radial gradient that fades to transparent.
        By animating opacity and scale, it looks like a pulsating aura.
      */}
        <div
          className="absolute rounded-full pointer-events-none"
          style={{
            width: '140%',
            height: '140%',
            // Shifted slightly down to center behind the "bulb" of the onion rather than the leaves
            top: '10%',
            background: 'radial-gradient(circle at center, currentColor 0%, transparent 60%)',
            willChange: 'transform, opacity',
            animation: `etherealPulse ${duration * 0.85}s ease-in-out ${delay}s infinite alternate`,
          }}
        />

        <SvgComponent
          className="relative z-10 w-full h-full drop-shadow-sm"
          style={{ transform: 'translateZ(0)' }}
        />
      </div>
    </div>
  );
};

const AnimatedBackground: React.FC = () => {
  const { settings } = useSettings();

  // Generate random properties once
  const onions = useMemo(() => {
    const totalPixels = window.innerWidth * window.innerHeight;
    const numOnions = Math.max(Math.min(20, Math.floor(totalPixels / 150000)), 5);

    return Array.from({ length: numOnions }).map((_, i) => ({
      id: i,
      x: 10 + Math.random() * 80,
      y: 10 + Math.random() * 80,
      scale: 0.5 + Math.random() * 0.8,
      rotation: -20 + Math.random() * 40,
      delay: -(Math.random() * 10),
      duration: 3 + Math.random() * 4,
      variant: Math.floor(Math.random() * 3),
    }));
  }, []);

  if (!settings.showAnimations) {
    return null;
  }

  return (
    <div className="fixed inset-0 w-full h-screen overflow-hidden transition-colors duration-700 pointer-events-none dark:bg-slate-950 dark:text-indigo-200/60 bg-stone-50 text-amber-600/40">
      <style
        dangerouslySetInnerHTML={{
          __html: `
        @keyframes smoothFloat {
          0% { transform: translateY(20px) rotate(-3deg); }
          100% { transform: translateY(-20px) rotate(3deg); }
        }
        @keyframes etherealPulse {
          0% { transform: scale(0.85); opacity: 0.1; }
          100% { transform: scale(1.15); opacity: 0.35; }
        }
      `,
        }}
      />

      {/* Onions */}
      {onions.map(onion => (
        <Onion key={onion.id} {...onion} />
      ))}

      {/* Ambient background particles */}
      <div className="absolute inset-0 pointer-events-none">
        {Array.from({ length: 20 }).map((_, i) => (
          <div
            key={i}
            className="absolute rounded-full bg-current opacity-20"
            style={{
              width: Math.random() * 4 + 'px',
              height: Math.random() * 4 + 'px',
              left: Math.random() * 100 + '%',
              top: Math.random() * 100 + '%',
              animation: `etherealPulse ${2 + Math.random() * 3}s ease-in-out -${Math.random() * 5}s infinite alternate`,
            }}
          />
        ))}
      </div>
    </div>
  );
};

export default AnimatedBackground;
