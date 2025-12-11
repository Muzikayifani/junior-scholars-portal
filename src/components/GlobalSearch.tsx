import { useState, useEffect, useRef } from 'react';
import { Search, X, FileText, Award, Users, BookOpen, MessageSquare } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useGlobalSearch, SearchResult } from '@/hooks/useGlobalSearch';
import { useNavigate } from 'react-router-dom';
import { useDebounce } from '@/hooks/useDebounce';
import { useAuth } from '@/hooks/useAuth';

const getResultIcon = (type: SearchResult['type']) => {
  switch (type) {
    case 'assignment':
      return <FileText className="h-4 w-4 text-warning" />;
    case 'result':
      return <Award className="h-4 w-4 text-success" />;
    case 'class':
      return <BookOpen className="h-4 w-4 text-info" />;
    case 'student':
      return <Users className="h-4 w-4 text-primary" />;
    case 'message':
      return <MessageSquare className="h-4 w-4 text-muted-foreground" />;
    default:
      return <Search className="h-4 w-4" />;
  }
};

export const GlobalSearch = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const { results, isSearching, search, clearResults } = useGlobalSearch();
  
  const debouncedQuery = useDebounce(query, 300);

  // Don't render search if user isn't authenticated
  if (!user) {
    return (
      <Button variant="outline" className="h-9 w-9 p-0" disabled>
        <Search className="h-4 w-4" />
      </Button>
    );
  }

  // Keyboard shortcut to open search
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setOpen(true);
      }
      if (e.key === 'Escape') {
        setOpen(false);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Focus input when dialog opens
  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 100);
    } else {
      setQuery('');
      clearResults();
    }
  }, [open, clearResults]);

  // Search when query changes
  useEffect(() => {
    search(debouncedQuery);
  }, [debouncedQuery, search]);

  const handleResultClick = (result: SearchResult) => {
    navigate(result.url);
    setOpen(false);
  };

  return (
    <>
      <Button
        variant="outline"
        className="relative h-9 w-9 p-0 xl:h-10 xl:w-60 xl:justify-start xl:px-3 xl:py-2"
        onClick={() => setOpen(true)}
      >
        <Search className="h-4 w-4 xl:mr-2" />
        <span className="hidden xl:inline-flex">Search...</span>
        <kbd className="pointer-events-none absolute right-1.5 top-2 hidden h-6 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium opacity-100 xl:flex">
          <span className="text-xs">⌘</span>K
        </kbd>
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-[550px] p-0">
          <DialogHeader className="p-4 pb-0">
            <DialogTitle className="sr-only">Search</DialogTitle>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                ref={inputRef}
                placeholder="Search assignments, results, classes..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="pl-9 pr-9"
              />
              {query && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7 p-0"
                  onClick={() => setQuery('')}
                >
                  <X className="h-4 w-4" />
                </Button>
              )}
            </div>
          </DialogHeader>

          <ScrollArea className="max-h-[400px] px-4 pb-4">
            {isSearching ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin h-6 w-6 border-2 border-primary border-t-transparent rounded-full" />
              </div>
            ) : results.length > 0 ? (
              <div className="space-y-1 pt-2">
                {results.map((result) => (
                  <div
                    key={`${result.type}-${result.id}`}
                    className="flex items-center gap-3 p-3 rounded-lg cursor-pointer hover:bg-muted transition-colors"
                    onClick={() => handleResultClick(result)}
                  >
                    {getResultIcon(result.type)}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{result.title}</p>
                      {result.subtitle && (
                        <p className="text-xs text-muted-foreground truncate">{result.subtitle}</p>
                      )}
                    </div>
                    <span className="text-xs text-muted-foreground capitalize">{result.type}</span>
                  </div>
                ))}
              </div>
            ) : query ? (
              <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
                <Search className="h-8 w-8 mb-2 opacity-50" />
                <p className="text-sm">No results found</p>
                <p className="text-xs">Try different keywords</p>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
                <Search className="h-8 w-8 mb-2 opacity-50" />
                <p className="text-sm">Start typing to search</p>
                <p className="text-xs">Search across assignments, results, and more</p>
              </div>
            )}
          </ScrollArea>
        </DialogContent>
      </Dialog>
    </>
  );
};
