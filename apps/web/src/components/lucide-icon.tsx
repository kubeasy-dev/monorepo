import { HelpCircle, icons, type LucideProps } from "lucide-react";

export type LucideIconName = keyof typeof icons;

export type LucideIconProps = LucideProps & {
  name: LucideIconName | string;
};

export function LucideIcon({ name, ...props }: LucideIconProps) {
  // Normalize the icon name (handle case sensitivity and kebab-case to PascalCase)
  const normalizedName = name
    .split("-")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join("") as LucideIconName;

  const Icon = icons[normalizedName] ?? icons[name as LucideIconName];

  if (!Icon) {
    console.warn(`Icon "${name}" not found in lucide-react, using HelpCircle`);
    return <HelpCircle {...props} />;
  }

  return <Icon {...props} />;
}
