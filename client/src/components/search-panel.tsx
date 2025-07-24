import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Search, Filter } from "lucide-react";
import { type Paper } from "@shared/schema";

interface SearchPanelProps {
  onSearchResults: (papers: Paper[]) => void;
  isSearching: boolean;
  onSearchingChange: (searching: boolean) => void;
}

export function SearchPanel({ onSearchResults, isSearching, onSearchingChange }: SearchPanelProps) {
  const [query, setQuery] = useState("");

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;

    onSearchingChange(true);
    try {
      const response = await fetch("/api/papers/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          query: query.trim(),
          limit: 20,
          offset: 0,
          fields: ["title", "abstract", "year", "authors", "citationCount"],
          minCitationCount: 0,
          maxYear: new Date().getFullYear(),
          minYear: 1900,
        }),
      });

      if (!response.ok) {
        throw new Error("Search failed");
      }

      const data = await response.json();
      onSearchResults(data.papers || []);
    } catch (error) {
      console.error("Search error:", error);
      onSearchResults([]);
    } finally {
      onSearchingChange(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Search className="w-5 h-5" />
          Search Academic Papers
        </CardTitle>
        <CardDescription>
          Search millions of academic papers using Semantic Scholar
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSearch} className="space-y-4">
          <div className="flex gap-2">
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Enter search terms..."
              disabled={isSearching}
              className="flex-1"
            />
            <Button type="submit" disabled={isSearching || !query.trim()}>
              {isSearching ? "Searching..." : "Search"}
            </Button>
          </div>
          <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400">
            <Filter className="w-4 h-4" />
            <span>Advanced filters coming soon</span>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}