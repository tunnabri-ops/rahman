import React, { useState, useEffect } from 'react';
import { Search, Film, AlertCircle, Play, ArrowLeft, Star, Calendar, RefreshCw } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const TMDB_API_KEY = (import.meta as any).env.VITE_TMDB_API_KEY;

interface Movie {
  id: number;
  title: string;
  poster_path: string | null;
  release_date: string;
  vote_average: number;
  overview: string;
}

export function MovieSearch() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Movie[]>([]);
  const [trending, setTrending] = useState<Movie[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedMovie, setSelectedMovie] = useState<Movie | null>(null);

  useEffect(() => {
    if (!TMDB_API_KEY) return;
    
    // Fetch trending movies on load
    const fetchTrending = async () => {
      try {
        setIsLoading(true);
        const res = await fetch(`https://api.themoviedb.org/3/trending/movie/day?api_key=${TMDB_API_KEY}`);
        const data = await res.json();
        if (data.results) {
          setTrending(data.results.slice(0, 12));
        }
      } catch (error) {
        console.error('Failed to fetch trending movies', error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchTrending();
  }, []);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim() || !TMDB_API_KEY) return;
    
    setIsLoading(true);
    try {
      const res = await fetch(
        `https://api.themoviedb.org/3/search/movie?api_key=${TMDB_API_KEY}&query=${encodeURIComponent(query)}&language=en-US&page=1`
      );
      const data = await res.json();
      if (data.results) {
        setResults(data.results);
      }
    } catch (error) {
      console.error('Failed to search movies', error);
    } finally {
      setIsLoading(false);
    }
  };

  if (!TMDB_API_KEY) {
    return (
      <div className="flex-1 flex items-center justify-center p-6 h-full w-full">
        <div className="max-w-md bg-white/[0.02] border border-white/[0.05] p-8 rounded-3xl text-center backdrop-blur-md shadow-2xl relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/10 to-purple-500/10 opacity-50" />
          <div className="relative z-10 flex flex-col items-center">
            <div className="w-16 h-16 rounded-2xl bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center mb-6">
              <Film className="w-8 h-8 text-indigo-400" />
            </div>
            <h2 className="text-2xl font-extrabold text-white mb-3">Movie Search Disabled</h2>
            <p className="text-slate-400 mb-6 leading-relaxed">
              To enable the VOD Movie Search feature, please provide a TMDB API Key.
            </p>
            <div className="w-full bg-black/40 rounded-xl p-4 border border-white/[0.05] text-left">
              <ol className="list-decimal pl-5 text-sm text-slate-300 space-y-2 marker:text-indigo-400 font-medium">
                <li>Go to <a href="https://www.themoviedb.org/settings/api" target="_blank" rel="noreferrer" className="text-indigo-400 hover:underline">themoviedb.org</a></li>
                <li>Create a free account & get an API Key</li>
                <li>Add it to the Secrets panel in AI Studio as <code className="bg-white/10 px-1.5 py-0.5 rounded text-indigo-200 text-xs font-mono ml-1">VITE_TMDB_API_KEY</code></li>
                <li>Restart the server</li>
              </ol>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (selectedMovie) {
    return (
      <div className="h-full flex flex-col bg-black overflow-hidden relative">
        <div className="h-16 px-6 flex items-center justify-between bg-black/60 backdrop-blur-xl border-b border-white/[0.05] z-10 shrink-0">
          <button 
            onClick={() => setSelectedMovie(null)}
            className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors group cursor-pointer"
          >
            <div className="w-8 h-8 rounded-full bg-white/[0.05] group-hover:bg-white/10 flex items-center justify-center transition-colors">
              <ArrowLeft className="w-4 h-4" />
            </div>
            <span className="font-medium text-sm">Back to Search</span>
          </button>
          <div className="flex items-center gap-3">
             <h2 className="text-lg font-bold text-white truncate max-w-[300px] md:max-w-md">{selectedMovie.title}</h2>
             <span className="hidden sm:inline-flex items-center gap-1 bg-white/[0.05] px-2 py-1 rounded text-xs font-mono text-slate-300 border border-white/[0.05]">
                {selectedMovie.release_date?.split('-')[0]}
             </span>
          </div>
        </div>
        
        <div className="flex-1 w-full relative bg-black flex items-center justify-center">
          <iframe
            src={`https://vidsrc.me/embed/movie?tmdb=${selectedMovie.id}`}
            className="w-full h-full border-0 absolute inset-0"
            allowFullScreen
            title={selectedMovie.title}
          />
        </div>
      </div>
    );
  }

  const displayMovies = query ? results : trending;

  return (
    <div className="h-full flex flex-col p-4 sm:p-8 overflow-y-auto w-full max-w-7xl mx-auto space-y-8">
      {/* Search Header */}
      <div className="flex flex-col md:flex-row items-center justify-between gap-6 shrink-0 relative z-10 mt-4 sm:mt-0">
        <div>
          <h1 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight drop-shadow-sm flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center">
               <Film className="w-5 h-5 text-indigo-400" />
            </div>
            Movie VOD
          </h1>
          <p className="text-slate-400 mt-2 text-sm font-medium">Search and watch movies directly from TMDB.</p>
        </div>

        <form onSubmit={handleSearch} className="w-full md:max-w-md relative">
          <Search className="w-5 h-5 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2" />
          <input 
            type="text" 
            placeholder="Search for a movie..." 
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              if (!e.target.value) setResults([]);
            }}
            className="w-full bg-white/[0.03] border border-white/[0.1] hover:border-indigo-500/30 focus:border-indigo-500 focus:bg-white/[0.05] rounded-2xl pl-12 pr-4 py-3.5 text-white placeholder-slate-500 transition-all shadow-inner outline-none"
          />
          <button 
            type="submit"
            className="absolute right-2 top-1/2 -translate-y-1/2 bg-indigo-600 hover:bg-indigo-500 text-white p-2 rounded-xl transition-colors cursor-pointer"
          >
            {isLoading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
          </button>
        </form>
      </div>

      {/* Grid Content */}
      <div className="flex-1">
        <h2 className="text-lg font-bold text-slate-200 mb-6 flex items-center gap-2">
          {query ? (
            <>Search Results <span className="text-slate-500 font-normal text-sm">({results.length})</span></>
          ) : (
            <>Trending Now <span className="text-indigo-400 text-xs px-2 py-0.5 bg-indigo-500/10 rounded border border-indigo-500/20">Daily</span></>
          )}
        </h2>

        {isLoading && !displayMovies.length ? (
           <div className="w-full py-20 flex flex-col items-center justify-center gap-4">
             <RefreshCw className="w-10 h-10 text-indigo-500 animate-spin" />
             <p className="text-slate-400 font-medium animate-pulse">Loading movies...</p>
           </div>
        ) : displayMovies.length === 0 ? (
           <div className="w-full py-20 flex flex-col items-center justify-center text-center">
             <div className="w-16 h-16 rounded-full bg-white/[0.02] flex items-center justify-center mb-4 border border-white/[0.05]">
               <Search className="w-8 h-8 text-slate-600" />
             </div>
             <p className="text-xl font-bold text-slate-300">No movies found</p>
             <p className="text-slate-500 mt-2">Try adjusting your search query.</p>
           </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4 sm:gap-6 pb-20">
            <AnimatePresence>
              {displayMovies.map((movie, index) => (
                <motion.div
                  key={movie.id}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.3, delay: index * 0.05 }}
                  onClick={() => setSelectedMovie(movie)}
                  className="group cursor-pointer flex flex-col"
                >
                  <div className="w-full aspect-[2/3] rounded-xl sm:rounded-2xl bg-black/40 border border-white/[0.05] overflow-hidden relative shadow-lg group-hover:shadow-indigo-500/20 transition-all duration-300 group-hover:-translate-y-1 group-hover:border-indigo-500/30">
                    {movie.poster_path ? (
                      <img 
                        src={`https://image.tmdb.org/t/p/w500${movie.poster_path}`} 
                        alt={movie.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                        loading="lazy"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <Film className="w-10 h-10 text-slate-700" />
                      </div>
                    )}
                    
                    <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex flex-col justify-end p-4">
                      <div className="flex items-center justify-center w-12 h-12 rounded-full bg-indigo-600 text-white self-center mb-4 transform translate-y-4 group-hover:translate-y-0 transition-all duration-300 shadow-[0_0_15px_rgba(99,102,241,0.5)]">
                        <Play className="w-5 h-5 ml-1" />
                      </div>
                    </div>
                  </div>
                  
                  <div className="mt-3 px-1">
                    <h3 className="text-sm font-bold text-slate-200 truncate group-hover:text-indigo-300 transition-colors">
                      {movie.title}
                    </h3>
                    <div className="flex items-center gap-3 mt-1.5 text-xs text-slate-500 font-medium">
                       <span className="flex items-center gap-1">
                         <Calendar className="w-3 h-3 text-slate-600" />
                         {movie.release_date ? movie.release_date.split('-')[0] : 'N/A'}
                       </span>
                       <span className="flex items-center gap-1 text-amber-400/80">
                         <Star className="w-3 h-3" />
                         {movie.vote_average ? movie.vote_average.toFixed(1) : 'NR'}
                       </span>
                    </div>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}
      </div>
    </div>
  );
}
