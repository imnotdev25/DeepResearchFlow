import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Search, Filter } from "lucide-react";
import { type Paper } from "@shared/schema";

interface SearchPanelProps {
  onSearchResults: (papers: Paper[]) => void;
  isSearching: boolean;
  onSearchingChange: (searching: boolean) => void;
}

export function SearchPanel({ onSearchResults, isSearching, onSearchingChange }: SearchPanelProps) {
  const [query, setQuery] = useState("");
  const [field, setField] = useState("");
  const [year, setYear] = useState("");
  const [minCitations, setMinCitations] = useState("");
  const [showAdvanced, setShowAdvanced] = useState(false);

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
          field: field || undefined,
          year: year ? parseInt(year) : undefined,
          minCitations: minCitations ? parseInt(minCitations) : undefined,
          limit: 20,
          offset: 0,
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
            <Button 
              type="button" 
              variant="outline" 
              onClick={() => setShowAdvanced(!showAdvanced)}
              className="shrink-0"
            >
              <Filter className="w-4 h-4" />
              Filters
            </Button>
            <Button type="submit" disabled={isSearching || !query.trim()}>
              {isSearching ? "Searching..." : "Search"}
            </Button>
          </div>
          
          {showAdvanced && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 bg-slate-50 dark:bg-slate-800 rounded-lg">
              <div className="space-y-2">
                <Label htmlFor="field">Field of Study</Label>
                <Select value={field} onValueChange={setField}>
                  <SelectTrigger>
                    <SelectValue placeholder="Any field" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">Any field</SelectItem>
                    <SelectItem value="Computer Science">Computer Science</SelectItem>
                    <SelectItem value="Medicine">Medicine</SelectItem>
                    <SelectItem value="Biology">Biology</SelectItem>
                    <SelectItem value="Physics">Physics</SelectItem>
                    <SelectItem value="Chemistry">Chemistry</SelectItem>
                    <SelectItem value="Psychology">Psychology</SelectItem>
                    <SelectItem value="Economics">Economics</SelectItem>
                    <SelectItem value="Engineering">Engineering</SelectItem>
                    <SelectItem value="Mathematics">Mathematics</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="year">Publication Year</Label>
                <Input
                  id="year"
                  type="number"
                  value={year}
                  onChange={(e) => setYear(e.target.value)}
                  placeholder="e.g., 2023"
                  min="1900"
                  max={new Date().getFullYear()}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="citations">Min Citations</Label>
                <Input
                  id="citations"
                  type="number"
                  value={minCitations}
                  onChange={(e) => setMinCitations(e.target.value)}
                  placeholder="e.g., 10"
                  min="0"
                />
              </div>
            </div>
          )}
          <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400">
            <Filter className="w-4 h-4" />
            <span>Advanced filters coming soon</span>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}