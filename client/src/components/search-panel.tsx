import { useState } from "react";
import { Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { type Paper } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";

interface SearchPanelProps {
  onSearch: (papers: Paper[]) => void;
  onSearching: (searching: boolean) => void;
  searchQuery: string;
  onSearchQueryChange: (query: string) => void;
}

export function SearchPanel({ onSearch, onSearching, searchQuery, onSearchQueryChange }: SearchPanelProps) {
  const [field, setField] = useState<string>("all");
  const [year, setYear] = useState<string>("");
  const { toast } = useToast();

  const handleSearch = async () => {
    if (!searchQuery.trim()) {
      toast({
        title: "Search required",
        description: "Please enter a search query",
        variant: "destructive"
      });
      return;
    }

    onSearching(true);
    
    try {
      const response = await apiRequest("POST", "/api/papers/search", {
        query: searchQuery.trim(),
        field: field !== "all" ? field : undefined,
        year: year ? parseInt(year) : undefined,
        offset: 0,
        limit: 20
      });
      
      const data = await response.json();
      onSearch(data.papers || []);
      
      toast({
        title: "Search completed",
        description: `Found ${data.total || 0} papers`
      });
    } catch (error) {
      console.error("Search error:", error);
      toast({
        title: "Search failed",
        description: "Failed to search papers. Please try again.",
        variant: "destructive"
      });
      onSearch([]);
    } finally {
      onSearching(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleSearch();
    }
  };

  return (
    <div className="p-6 border-b border-gray-200">
      <div className="relative">
        <Input
          type="text"
          placeholder="Search academic papers..."
          value={searchQuery}
          onChange={(e) => onSearchQueryChange(e.target.value)}
          onKeyPress={handleKeyPress}
          className="pl-10 pr-4 py-3"
        />
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
      </div>
      
      {/* Search Filters */}
      <div className="mt-4 space-y-3">
        <div className="flex space-x-2">
          <Select value={field} onValueChange={setField}>
            <SelectTrigger className="flex-1">
              <SelectValue placeholder="All Fields" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Fields</SelectItem>
              <SelectItem value="Computer Science">Computer Science</SelectItem>
              <SelectItem value="Medicine">Medicine</SelectItem>
              <SelectItem value="Physics">Physics</SelectItem>
              <SelectItem value="Biology">Biology</SelectItem>
              <SelectItem value="Mathematics">Mathematics</SelectItem>
              <SelectItem value="Engineering">Engineering</SelectItem>
              <SelectItem value="Chemistry">Chemistry</SelectItem>
              <SelectItem value="Psychology">Psychology</SelectItem>
            </SelectContent>
          </Select>
          <Input
            type="number"
            placeholder="Year"
            value={year}
            onChange={(e) => setYear(e.target.value)}
            className="w-20"
            min="1900"
            max={new Date().getFullYear()}
          />
        </div>
        
        <Button 
          onClick={handleSearch}
          className="w-full"
          disabled={!searchQuery.trim()}
        >
          <Search className="w-4 h-4 mr-2" />
          Search Papers
        </Button>
      </div>
    </div>
  );
}
