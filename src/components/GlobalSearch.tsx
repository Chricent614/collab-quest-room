import { useState } from 'react';
import { Search, User, FileText, Users, BookOpen, ClipboardList } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { useNavigate } from 'react-router-dom';
import { useGlobalSearch, SearchResult } from '@/hooks/useGlobalSearch';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Card } from '@/components/ui/card';

const GlobalSearch = () => {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [showResults, setShowResults] = useState(false);
  const { results, loading } = useGlobalSearch(searchQuery);

  const getIcon = (type: SearchResult['type']) => {
    switch (type) {
      case 'user': return <User className="h-4 w-4" />;
      case 'post': return <FileText className="h-4 w-4" />;
      case 'group': return <Users className="h-4 w-4" />;
      case 'resource': return <BookOpen className="h-4 w-4" />;
      case 'task': return <ClipboardList className="h-4 w-4" />;
    }
  };

  const handleResultClick = (result: SearchResult) => {
    navigate(result.url);
    setSearchQuery('');
    setShowResults(false);
  };

  return (
    <div className="relative flex-1 max-w-md mx-2 md:mx-8">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search everything..."
          className="pl-10 h-9"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          onFocus={() => setShowResults(true)}
          onBlur={() => setTimeout(() => setShowResults(false), 200)}
        />
      </div>

      {showResults && searchQuery.length >= 2 && (
        <Card className="absolute top-full mt-2 w-full max-h-96 overflow-y-auto z-50 shadow-lg">
          {loading ? (
            <div className="p-4 text-center text-sm text-muted-foreground">
              Searching...
            </div>
          ) : results.length === 0 ? (
            <div className="p-4 text-center text-sm text-muted-foreground">
              No results found
            </div>
          ) : (
            <div className="py-2">
              {results.map((result) => (
                <div
                  key={`${result.type}-${result.id}`}
                  className="px-4 py-2 hover:bg-muted cursor-pointer flex items-center gap-3"
                  onClick={() => handleResultClick(result)}
                >
                  {result.type === 'user' && result.avatarUrl ? (
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={result.avatarUrl} />
                      <AvatarFallback>{result.title.charAt(0)}</AvatarFallback>
                    </Avatar>
                  ) : (
                    <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center">
                      {getIcon(result.type)}
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium truncate">{result.title}</span>
                      <span className="text-xs text-muted-foreground capitalize">{result.type}</span>
                    </div>
                    {result.description && (
                      <p className="text-xs text-muted-foreground truncate">
                        {result.description}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      )}
    </div>
  );
};

export default GlobalSearch;
