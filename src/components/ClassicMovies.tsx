import React, { useState, useEffect } from 'react';
import { Search, Film, Play, ArrowLeft, RefreshCw, Library, Download, Calendar } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface ArchiveMovie {
  identifier: string;
  title: string;
  year?: string;
  description?: string;
  downloads?: number;
}

export function ClassicMovies() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<ArchiveMovie[]>([]);
  const [trending, setTrending] = useState<ArchiveMovie[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedMovie, setSelectedMovie] = useState<ArchiveMovie | null>(null);

  useEffect(() => {
    const fetchTrending = async () => {
      try {
        setIsLoading(true);
        // Fetch top public domain feature films
        const res = await fetch(
          `https://archive.org/advancedsearch.php?q=collection:(feature_films)+AND+mediatype:(movies)&fl[]=identifier,title,year,downloads,description&sort[]=downloads+desc&output=json&rows=30&page=1`
        );
        const data = await res.json();
        if (data.response?.docs) {
          setTrending(data.response.docs);
        }
      } catch (error) {
        console.error('Failed to fetch archive movies', error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchTrending();
  }, []);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) {
      setResults([]);
      return;
    }
    
    setIsLoading(true);
    try {
      const searchTerm = encodeURIComponent(query);
      const res = await fetch(
        `https://archive.org/advancedsearch.php?q=title:(${searchTerm})+AND+collection:(feature_films)+AND+mediatype:(movies)&fl[]=identifier,title,year,downloads,description&sort[]=downloads+desc&output=json&rows=30&page=1`
      );
      const data = await res.json();
      if (data.response?.docs) {
        setResults(data.response.docs);
      } else {
        setResults([]);
      }
    } catch (error) {
      console.error('Failed to search movies', error);
    } finally {
      setIsLoading(false);
    }
  };

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
            <span className="font-medium text-sm">Back to Browse</span>
          </button>
          <div className="flex items-center gap-3">
             <h2 className="text-lg font-bold text-white truncate max-w-[300px] md:max-w-md">{selectedMovie.title}</h2>
             {selectedMovie.year && (
               <span className="hidden sm:inline-flex items-center gap-1 bg-emerald-500/10 px-2 py-1 rounded text-xs font-mono text-emerald-300 border border-emerald-500/20">
                  {String(selectedMovie.year).substring(0, 4)}
               </span>
             )}
          </div>
        </div>
        
        <div className="flex-1 w-full relative bg-black flex items-center justify-center">
          <iframe
            src={`https://archive.org/embed/${selectedMovie.identifier}?autoplay=1`}
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
            <div className="w-10 h-10 rounded-xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center">
               <Library className="w-5 h-5 text-emerald-400" />
            </div>
            Classic Cinema
          </h1>
          <p className="text-slate-400 mt-2 text-sm font-medium">Public domain, ad-free classics from Archive.org</p>
        </div>

        <form onSubmit={handleSearch} className="w-full md:max-w-md relative">
          <Search className="w-5 h-5 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2" />
          <input 
            type="text" 
            placeholder="Search classic movies..." 
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              if (!e.target.value) setResults([]);
            }}
            className="w-full bg-white/[0.03] border border-white/[0.1] hover:border-emerald-500/30 focus:border-emerald-500 focus:bg-white/[0.05] rounded-2xl pl-12 pr-4 py-3.5 text-white placeholder-slate-500 transition-all shadow-inner outline-none"
          />
          <button 
            type="submit"
            className="absolute right-2 top-1/2 -translate-y-1/2 bg-emerald-600 hover:bg-emerald-500 text-white p-2 rounded-xl transition-colors cursor-pointer"
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
            <>Popular Classics <span className="text-emerald-400 text-xs px-2 py-0.5 bg-emerald-500/10 rounded border border-emerald-500/20">All-time</span></>
          )}
        </h2>

        {isLoading && !displayMovies.length ? (
           <div className="w-full py-20 flex flex-col items-center justify-center gap-4">
             <RefreshCw className="w-10 h-10 text-emerald-500 animate-spin" />
             <p className="text-slate-400 font-medium animate-pulse">Loading archive...</p>
           </div>
        ) : displayMovies.length === 0 ? (
           <div className="w-full py-20 flex flex-col items-center justify-center text-center">
             <div className="w-16 h-16 rounded-full bg-white/[0.02] flex items-center justify-center mb-4 border border-white/[0.05]">
               <Library className="w-8 h-8 text-slate-600" />
             </div>
             <p className="text-xl font-bold text-slate-300">No movies found</p>
             <p className="text-slate-500 mt-2">Try a different title from the past.</p>
           </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4 sm:gap-6 pb-20">
            <AnimatePresence>
              {displayMovies.map((movie, index) => (
                <motion.div
                  key={movie.identifier}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.3, delay: index * 0.02 }}
                  onClick={() => setSelectedMovie(movie)}
                  className="group cursor-pointer flex flex-col"
                >
                  <div className="w-full aspect-[2/3] rounded-xl sm:rounded-2xl bg-black/40 border border-white/[0.05] overflow-hidden relative shadow-lg group-hover:shadow-emerald-500/20 transition-all duration-300 group-hover:-translate-y-1 group-hover:border-emerald-500/30">
                    <img 
                      src={`https://archive.org/services/img/${movie.identifier}`} 
                      alt={movie.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      loading="lazy"
                      onError={(e) => {
                        e.currentTarget.style.display = 'none';
                        e.currentTarget.parentElement?.classList.add('flex', 'items-center', 'justify-center');
                      }}
                    />
                    <div className="absolute inset-0 flex items-center justify-center -z-10">
                      <Film className="w-10 h-10 text-slate-700" />
                    </div>
                    
                    <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex flex-col justify-end p-4">
                      <div className="flex items-center justify-center w-12 h-12 rounded-full bg-emerald-600 text-white self-center mb-4 transform translate-y-4 group-hover:translate-y-0 transition-all duration-300 shadow-[0_0_15px_rgba(16,185,129,0.5)]">
                        <Play className="w-5 h-5 ml-1" />
                      </div>
                    </div>
                  </div>
                  
                  <div className="mt-3 px-1">
                    <h3 className="text-sm font-bold text-slate-200 truncate group-hover:text-emerald-300 transition-colors" title={movie.title}>
                      {movie.title}
                    </h3>
                    <div className="flex items-center gap-3 mt-1.5 text-xs text-slate-500 font-medium">
                       {movie.year && (
                         <span className="flex items-center gap-1">
                           <Calendar className="w-3 h-3 text-slate-600" />
                           {String(movie.year).substring(0, 4)}
                         </span>
                       )}
                       {movie.downloads && (
                         <span className="flex items-center gap-1 text-slate-500">
                           <Download className="w-3 h-3" />
                           {(movie.downloads / 1000).toFixed(1)}k
                         </span>
                       )}
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
