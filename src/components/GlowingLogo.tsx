import { cn } from "@/lib/utils";

type Size = "sm" | "md" | "lg" | "xl";
type Bg = "dark" | "light";

type Props = {
  size?: Size;
  bg?: Bg;
  showTagline?: boolean;
  className?: string;
};

export function GlowingLogo({
  size = "md",
  bg = "light",
  showTagline = true,
  className,
}: Props) {
  return (
    <span
      className={cn(
        "glowing-logo",
        `glowing-logo--${size}`,
        `glowing-logo--${bg}`,
        className,
      )}
    >
      <span className="glowing-logo__word">Glowing</span>
      {showTagline ? (
        <span className="glowing-logo__tag">Colorimetria & Estética</span>
      ) : null}
    </span>
  );
}
