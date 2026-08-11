import { Search, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function SearchInput({ value, onChange, placeholder = "Search…", className }: { value: string; onChange(value: string): void; placeholder?: string; className?: string }) {
  return (
    <div className={cn("relative w-full sm:max-w-sm", className)}>
      <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
      <Input value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} className="pl-9 pr-9" />
      {value ? <Button type="button" variant="ghost" size="icon" className="absolute right-0.5 top-0.5 size-8" onClick={() => onChange("")} aria-label="Clear search"><X className="size-3.5" /></Button> : null}
    </div>
  );
}
