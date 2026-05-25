import { cn } from "@/lib/utils";

// Palette stable de 12 couleurs Tailwind (paire bg/text en clair et sombre).
const PALETTE = [
  "bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300",
  "bg-orange-100 text-orange-700 dark:bg-orange-950 dark:text-orange-300",
  "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300",
  "bg-lime-100 text-lime-700 dark:bg-lime-950 dark:text-lime-300",
  "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300",
  "bg-teal-100 text-teal-700 dark:bg-teal-950 dark:text-teal-300",
  "bg-cyan-100 text-cyan-700 dark:bg-cyan-950 dark:text-cyan-300",
  "bg-sky-100 text-sky-700 dark:bg-sky-950 dark:text-sky-300",
  "bg-indigo-100 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300",
  "bg-violet-100 text-violet-700 dark:bg-violet-950 dark:text-violet-300",
  "bg-fuchsia-100 text-fuchsia-700 dark:bg-fuchsia-950 dark:text-fuchsia-300",
  "bg-pink-100 text-pink-700 dark:bg-pink-950 dark:text-pink-300"
];

function hashCode(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = ((h << 5) - h + s.charCodeAt(i)) | 0;
  return Math.abs(h);
}

export function getInitials(prenom: string, nom: string): string {
  const a = (prenom?.trim()?.[0] ?? "").toUpperCase();
  const b = (nom?.trim()?.[0] ?? "").toUpperCase();
  return `${a}${b}` || "?";
}

export interface PatientAvatarProps {
  prenom: string;
  nom: string;
  photoUrl?: string | null;
  size?: "sm" | "md" | "lg";
  className?: string;
}

export function PatientAvatar({
  prenom,
  nom,
  photoUrl,
  size = "md",
  className
}: PatientAvatarProps) {
  const initials = getInitials(prenom, nom);
  const palette = PALETTE[hashCode(`${prenom}|${nom}`) % PALETTE.length];
  const sizeClass =
    size === "sm" ? "h-7 w-7 text-xs" : size === "lg" ? "h-12 w-12 text-base" : "h-9 w-9 text-sm";

  if (photoUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={photoUrl}
        alt={`${prenom} ${nom}`}
        className={cn("rounded-full object-cover", sizeClass, className)}
      />
    );
  }
  return (
    <div
      className={cn(
        "inline-flex items-center justify-center rounded-full font-medium",
        sizeClass,
        palette,
        className
      )}
      aria-label={`Avatar ${prenom} ${nom}`}
    >
      {initials}
    </div>
  );
}
