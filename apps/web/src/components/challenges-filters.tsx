import type { ChallengeListInput } from "@kubeasy/api-schemas/challenges";
import { useSuspenseQuery } from "@tanstack/react-query";
import { Search } from "lucide-react";
import { useState } from "react";
import { Input } from "@kubeasy/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@kubeasy/ui/select";
import type { ChallengeTypeItem } from "@/lib/api-client";
import { difficulties } from "@/lib/constants";
import { themeListOptions, typeListOptions } from "@/lib/query-options";

interface ChallengesFiltersProps {
  onFilterChange: (filters: ChallengeListInput) => void;
}

export function ChallengesFilters({
  onFilterChange,
}: Readonly<ChallengesFiltersProps>) {
  const [theme, setTheme] = useState<string | undefined>(undefined);
  const [type, setType] = useState<string | undefined>(undefined);
  const [difficulty, setDifficulty] = useState<string | undefined>(undefined);
  const [search, setSearch] = useState<string>("");

  const { data: themes } = useSuspenseQuery(themeListOptions());
  const { data: types } = useSuspenseQuery(typeListOptions());

  const buildFilters = (
    overrides: Partial<ChallengeListInput>,
  ): ChallengeListInput => ({
    theme: theme === "all" ? undefined : theme,
    type: type === "all" ? undefined : type,
    difficulty: (difficulty === "all"
      ? undefined
      : difficulty) as ChallengeListInput["difficulty"],
    search: search === "" ? undefined : search,
    ...overrides,
  });

  const handleThemeChange = (value: string | null) => {
    const v = value ?? undefined;
    setTheme(v);
    onFilterChange(buildFilters({ theme: v === "all" ? undefined : v }));
  };

  const handleTypeChange = (value: string | null) => {
    const v = value ?? undefined;
    setType(v);
    onFilterChange(buildFilters({ type: v === "all" ? undefined : v }));
  };

  const handleDifficultyChange = (value: string | null) => {
    const v = value ?? undefined;
    setDifficulty(v);
    onFilterChange(
      buildFilters({
        difficulty: (v === "all"
          ? undefined
          : v) as ChallengeListInput["difficulty"],
      }),
    );
  };

  const handleSearchChange = (value: string) => {
    setSearch(value);
    onFilterChange(buildFilters({ search: value === "" ? undefined : value }));
  };

  return (
    <div className="flex flex-col md:flex-row gap-4 flex-1">
      <div className="relative flex-[2]">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground z-10" />
        <Input
          placeholder="Search challenges..."
          value={search}
          onChange={(e) => handleSearchChange(e.target.value)}
          className="pl-12 pr-4 py-6 neo-border-thick neo-shadow font-bold text-base focus:neo-shadow-lg transition-shadow"
        />
      </div>
      <Select value={theme} onValueChange={handleThemeChange}>
        <SelectTrigger className="w-full md:w-[160px] neo-border-thick neo-shadow font-bold py-6 text-base">
          <SelectValue placeholder="Theme" />
        </SelectTrigger>
        <SelectContent className="neo-border-thick neo-shadow">
          <SelectItem value="all" className="font-bold">
            All Themes
          </SelectItem>
          {themes.map((t) => (
            <SelectItem key={t.slug} value={t.slug} className="font-bold">
              {t.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Select value={type} onValueChange={handleTypeChange}>
        <SelectTrigger className="w-full md:w-[160px] neo-border-thick neo-shadow font-bold py-6 text-base">
          <SelectValue placeholder="Type" />
        </SelectTrigger>
        <SelectContent className="neo-border-thick neo-shadow">
          <SelectItem value="all" className="font-bold">
            All Types
          </SelectItem>
          {(types as ChallengeTypeItem[]).map((t) => (
            <SelectItem key={t.slug} value={t.slug} className="font-bold">
              {t.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Select value={difficulty} onValueChange={handleDifficultyChange}>
        <SelectTrigger className="w-full md:w-[160px] neo-border-thick neo-shadow font-bold py-6 text-base">
          <SelectValue placeholder="Difficulty" />
        </SelectTrigger>
        <SelectContent className="neo-border-thick neo-shadow">
          {difficulties.map((diff) => (
            <SelectItem
              key={diff.value}
              value={diff.value}
              className="font-bold"
            >
              {diff.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
