interface GlowingLogoProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  bg?: 'dark' | 'light';
}

const sizeMap = {
  sm: { brandSize: 22, tagSize: 8,  gap: 10 },
  md: { brandSize: 32, tagSize: 10, gap: 14 },
  lg: { brandSize: 44, tagSize: 11, gap: 16 },
  xl: { brandSize: 52, tagSize: 11, gap: 18 },
};

export default function GlowingLogo({ size = 'md', bg = 'dark' }: GlowingLogoProps) {
  const { brandSize, tagSize, gap } = sizeMap[size];

  const text     = bg === 'dark' ? '#e8d9b8' : '#8a6420';
  const subtitle = bg === 'dark' ? 'rgba(201,164,85,0.55)' : 'rgba(139,100,40,0.7)';

  return (
    <div className="flex flex-col items-start" style={{ gap }}>
      <span
        style={{
          fontFamily: "'Fraunces', serif",
          fontWeight: 300,
          fontStyle: 'italic',
          fontSize: brandSize,
          lineHeight: 1,
          letterSpacing: '-0.01em',
          color: text,
          fontVariationSettings: '"SOFT" 0, "WONK" 1',
        }}
      >
        Glowing
      </span>
      <span
        style={{
          fontFamily: "'DM Sans', sans-serif",
          fontWeight: 300,
          fontSize: tagSize,
          lineHeight: 1,
          letterSpacing: '0.28em',
          textTransform: 'uppercase' as const,
          color: subtitle,
          fontVariationSettings: '"opsz" 14',
        }}
      >
        Colorimetria & Estética
      </span>
    </div>
  );
}
