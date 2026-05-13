import {
  Activity,
  AlertCircle,
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  Award,
  Beaker,
  Box,
  Boxes,
  Bug,
  Calendar,
  ChartLine,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Circle,
  Clock,
  Code,
  Compass,
  Copy,
  FileText,
  Flame,
  GitFork,
  Github,
  GitPullRequestCreateArrow,
  Globe,
  Heart,
  HelpCircle,
  History,
  Key,
  List,
  Loader2,
  Lock,
  LogIn,
  LogOut,
  type LucideProps,
  Mail,
  MessageSquare,
  Play,
  PlayCircle,
  Rocket,
  Save,
  Search,
  Shield,
  Sparkles,
  Star,
  Target,
  Terminal,
  Timer,
  ToyBrick,
  TrendingUp,
  Trophy,
  Twitter,
  User,
  UserIcon,
  Users,
  Wrench,
  X,
  Zap,
} from "lucide-react";

export const ICONS = {
  Activity,
  AlertCircle,
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  Award,
  Beaker,
  Box,
  Boxes,
  Bug,
  Calendar,
  ChartLine,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Circle,
  Clock,
  Code,
  Compass,
  Copy,
  FileText,
  Flame,
  GitFork,
  GitPullRequestCreateArrow,
  Github,
  Globe,
  Heart,
  HelpCircle,
  History,
  Key,
  List,
  Loader2,
  Lock,
  LogIn,
  LogOut,
  Mail,
  MessageSquare,
  Play,
  PlayCircle,
  Rocket,
  Save,
  Search,
  Shield,
  Sparkles,
  Star,
  Target,
  Terminal,
  Timer,
  ToyBrick,
  TrendingUp,
  Trophy,
  Twitter,
  User,
  UserIcon,
  Users,
  Wrench,
  X,
  Zap,
} as const;

export type LucideIconName = keyof typeof ICONS;

export type LucideIconProps = LucideProps & {
  name: LucideIconName | string;
};

export function LucideIcon({ name, ...props }: LucideIconProps) {
  if (!name) return <HelpCircle {...props} />;

  // Normalize the icon name (handle case sensitivity and kebab-case to PascalCase)
  const normalizedName = name
    .split("-")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join("") as LucideIconName;

  const Icon = ICONS[normalizedName] ?? ICONS[name as LucideIconName];

  if (!Icon) {
    console.warn(`Icon "${name}" not found in ICONS map, using HelpCircle`);
    return <HelpCircle {...props} />;
  }

  return <Icon {...props} />;
}
