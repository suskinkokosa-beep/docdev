import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Search, FileText, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';

interface SearchResult {
  id: string;
  name: string;
  code: string;
  fileName: string;
  categoryId: string;
}

export function GlobalSearch() {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');

  const { data: results = [], isLoading } = useQuery<SearchResult[]>({
    queryKey: ['search', query],
    queryFn: async () => {
      if (query.length < 2) return [];
      const response = await fetch(`/api/search/documents?q=${encodeURIComponent(query)}`, {
        credentials: 'include',
      });
      if (!response.ok) throw new Error('Search failed');
      return response.json();
    },
    enabled: query.length >= 2,
  });

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'k' && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      setIsOpen(true);
    }
  };

  return (
    <>
      <Button
        variant="outline"
        className="w-64 justify-start text-muted-foreground"
        onClick={() => setIsOpen(true)}
      >
        <Search className="mr-2 h-4 w-4" />
        <span className="hidden lg:inline-flex">Поиск документов...</span>
        <kbd className="pointer-events-none ml-auto hidden h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium opacity-100 sm:flex">
          <span className="text-xs">Ctrl</span>K
        </kbd>
      </Button>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="max-w-2xl p-0">
          <div className="flex items-center border-b px-4 py-3">
            <Search className="mr-2 h-4 w-4 shrink-0 opacity-50" />
            <Input
              placeholder="Поиск документов по названию, коду или файлу..."
              className="border-0 focus-visible:ring-0 focus-visible:ring-offset-0"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={handleKeyDown}
            />
            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          </div>

          <ScrollArea className="max-h-[400px]">
            {query.length < 2 ? (
              <div className="p-8 text-center text-sm text-muted-foreground">
                Введите минимум 2 символа для поиска
              </div>
            ) : results.length === 0 && !isLoading ? (
              <div className="p-8 text-center text-sm text-muted-foreground">
                Документы не найдены
              </div>
            ) : (
              <div className="p-2">
                {results.map((doc) => (
                  <button
                    key={doc.id}
                    className="flex w-full items-center gap-3 rounded-md px-3 py-2 text-left hover:bg-accent"
                    onClick={() => {
                      window.location.href = `/documents?id=${doc.id}`;
                      setIsOpen(false);
                    }}
                  >
                    <FileText className="h-4 w-4 text-muted-foreground" />
                    <div className="flex-1 overflow-hidden">
                      <p className="truncate font-medium text-sm">{doc.name}</p>
                      <p className="truncate text-xs text-muted-foreground">
                        {doc.code} • {doc.fileName}
                      </p>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </ScrollArea>
        </DialogContent>
      </Dialog>
    </>
  );
}
