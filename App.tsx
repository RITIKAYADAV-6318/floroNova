import React, { useState, useEffect } from 'react';
import { PlantAnalysisResult, HistoryItem, PlantFolder } from './types';
import { analyzePlantImage } from './services/geminiService';
import { StorageService } from './services/storage';
import { useAuth } from './contexts/AuthContext';
import { ImageUpload } from './components/ImageUpload';
import { AnalysisResult } from './components/AnalysisResult';
import { HistoryView } from './components/HistoryView';
import { ChatInterface } from './components/ChatInterface';
import { ARScanner } from './components/ARScanner';
import { Sprout, Loader2, Leaf, Sun, History as HistoryIcon, ArrowLeft, LogOut } from 'lucide-react';

const App: React.FC = () => {
  const [analyzing, setAnalyzing] = useState(false);
  const [results, setResults] = useState<PlantAnalysisResult[] | null>(null);
  const [currentImage, setCurrentImage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showHistory, setShowHistory] = useState(false);
  const [showAR, setShowAR] = useState(false);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [folders, setFolders] = useState<PlantFolder[]>([]);
  
  // Auth State
  const { user, logout, isLoading: authLoading } = useAuth();
  const [showProfileMenu, setShowProfileMenu] = useState(false);

  // Load data when user changes or component mounts
  useEffect(() => {
    // If auth is still loading, wait
    if (authLoading) return;

    // Load data specific to the current user (or guest if user is null)
    const currentHistory = StorageService.getHistory(user?.id);
    const currentFolders = StorageService.getFolders(user?.id);
    
    setHistory(currentHistory);
    setFolders(currentFolders);
    
    // Reset views on user switch
    setResults(null);
    setCurrentImage(null);
    setShowHistory(false);
    setShowAR(false);
  }, [user, authLoading]);

  const saveToHistory = (newResults: PlantAnalysisResult[]) => {
    // Only save if at least one valid plant is found
    const validPlants = newResults.filter(r => r.isPlant);
    if (validPlants.length === 0) return;

    const newItem: HistoryItem = {
      id: crypto.randomUUID(),
      timestamp: Date.now(),
      results: validPlants
    };

    const updatedHistory = [newItem, ...history];
    setHistory(updatedHistory);
    StorageService.saveHistory(updatedHistory, user?.id);
  };

  const clearHistory = () => {
    if (confirm("Are you sure you want to clear your plant history?")) {
      setHistory([]);
      StorageService.saveHistory([], user?.id);
    }
  };

  // Folder Management Functions
  const createFolder = (name: string) => {
    const newFolder: PlantFolder = {
      id: crypto.randomUUID(),
      name,
      createdAt: Date.now()
    };
    const updatedFolders = [...folders, newFolder];
    setFolders(updatedFolders);
    StorageService.saveFolders(updatedFolders, user?.id);
  };

  const deleteFolder = (folderId: string) => {
    if (confirm("Delete this folder? Items inside will remain in history but be ungrouped.")) {
      const updatedFolders = folders.filter(f => f.id !== folderId);
      setFolders(updatedFolders);
      StorageService.saveFolders(updatedFolders, user?.id);
      
      const updatedHistory = history.map(item => 
        item.folderId === folderId ? { ...item, folderId: undefined } : item
      );
      setHistory(updatedHistory);
      StorageService.saveHistory(updatedHistory, user?.id);
    }
  };

  const moveItemsToFolder = (itemIds: string[], folderId: string | undefined) => {
    const updatedHistory = history.map(item => 
      itemIds.includes(item.id) ? { ...item, folderId } : item
    );
    setHistory(updatedHistory);
    StorageService.saveHistory(updatedHistory, user?.id);
  };

  const handleImageSelect = async (base64Image: string) => {
    setAnalyzing(true);
    setCurrentImage(base64Image);
    setError(null);
    setShowHistory(false);
    try {
      const data = await analyzePlantImage(base64Image);
      setResults(data);
      saveToHistory(data);
    } catch (err: any) {
      setError(err.message || "Something went wrong. Please try again.");
    } finally {
      setAnalyzing(false);
    }
  };

  const handleReset = () => {
    setResults(null);
    setCurrentImage(null);
    setError(null);
    setShowHistory(false);
    setShowAR(false);
  };

  const handleHistorySelect = (item: HistoryItem) => {
    setResults(item.results);
    setCurrentImage(null); // History items do not store images currently to save space
    setShowHistory(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Close profile menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (!target.closest('.profile-menu-container')) {
        setShowProfileMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-emerald-50">
        <Loader2 className="animate-spin text-emerald-600" size={32} />
      </div>
    );
  }

  // If AR mode is active, render it fullscreen
  if (showAR) {
    return <ARScanner onClose={() => setShowAR(false)} />;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-teal-50 to-white text-gray-800 font-sans">
      
      {/* Navigation / Header */}
      <nav className="p-4 sm:p-6 sticky top-0 z-50 bg-white/80 backdrop-blur-xl border-b border-emerald-100/50 shadow-sm transition-all duration-300 animate-slide-down">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          
          {/* New Logo Implementation with Animations */}
          <div className="flex items-center gap-3 cursor-pointer group select-none" onClick={handleReset}>
            {/* Logo Icon */}
            <div className="bg-gradient-to-br from-emerald-400 to-emerald-600 p-2.5 rounded-2xl text-white shadow-lg shadow-emerald-200 group-hover:shadow-emerald-300 transition-all duration-500 ease-out group-hover:scale-105 group-hover:rotate-6">
              <Leaf size={26} strokeWidth={2.5} className="fill-white/10" />
            </div>
            
            {/* Logo Text */}
            <div className="flex flex-col">
              <div className="text-2xl font-bold tracking-tight leading-none text-gray-900 transition-all duration-300">
                <span className="group-hover:text-emerald-600 transition-colors">floro</span>
                <span className="text-emerald-600 group-hover:text-gray-900 transition-colors">Nova</span>
              </div>
              <span className="text-[0.65rem] font-bold text-gray-400 tracking-[0.2em] uppercase leading-none mt-1 group-hover:tracking-[0.25em] group-hover:text-emerald-500/80 transition-all duration-500">
                AI Plant Expert
              </span>
            </div>
          </div>
          
          <div className="flex items-center gap-2 sm:gap-4">
            {!analyzing && (results || showHistory) && (
              <button 
                onClick={handleReset}
                className="hidden sm:flex items-center gap-2 text-sm font-medium text-gray-500 hover:text-emerald-600 transition-all duration-200 hover:-translate-x-1"
              >
                <ArrowLeft size={18} />
                Back to Scan
              </button>
            )}
            
            <button 
              onClick={() => {
                setShowHistory(!showHistory);
                setResults(null);
                setCurrentImage(null);
                setError(null);
              }}
              className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-semibold transition-all duration-300 transform active:scale-95 ${
                showHistory 
                  ? 'bg-emerald-100 text-emerald-700 ring-2 ring-emerald-200' 
                  : 'bg-white text-gray-600 hover:bg-gray-50 hover:shadow-md hover:-translate-y-0.5 border border-transparent hover:border-gray-100'
              }`}
            >
              <HistoryIcon size={18} />
              <span className="hidden sm:inline">History</span>
            </button>

            {/* User Profile - Only visible if already logged in (persistence) */}
            <div className="relative profile-menu-container">
              {user && (
                <button 
                  onClick={() => setShowProfileMenu(!showProfileMenu)}
                  className="flex items-center gap-2 pl-2 pr-1 py-1 rounded-full bg-white border border-gray-100 hover:shadow-md hover:ring-2 hover:ring-emerald-100 transition-all duration-300"
                >
                  <span className="text-sm font-medium text-gray-700 hidden sm:block pl-2">{user.name.split(' ')[0]}</span>
                  <img src={user.avatar} alt={user.name} className="w-8 h-8 rounded-full bg-gray-200 border border-white" />
                </button>
              )}

              {/* Profile Dropdown */}
              {showProfileMenu && user && (
                <div className="absolute right-0 top-full mt-2 w-56 bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden animate-fade-in-up z-50 origin-top-right">
                  <div className="p-4 border-b border-gray-100 bg-gray-50/50">
                    <p className="font-bold text-gray-800">{user.name}</p>
                    <p className="text-xs text-gray-500 truncate">{user.email}</p>
                  </div>
                  <div className="p-2">
                    <button 
                      onClick={() => {
                        logout();
                        setShowProfileMenu(false);
                      }}
                      className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-600 hover:bg-red-50 rounded-xl transition-colors font-medium"
                    >
                      <LogOut size={16} />
                      Sign Out
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        
        {/* State: Loading */}
        {analyzing && (
          <div className="flex flex-col items-center justify-center min-h-[60vh] text-center animate-pulse">
            <div className="relative">
              <div className="w-24 h-24 border-4 border-emerald-200 border-t-emerald-600 rounded-full animate-spin mb-6"></div>
              <div className="absolute inset-0 flex items-center justify-center text-emerald-600">
                <Leaf size={32} />
              </div>
            </div>
            <h2 className="text-2xl font-bold text-gray-800 mb-2">Analyzing your plants...</h2>
            <p className="text-gray-500">Detecting separate plants and diagnosing health</p>
          </div>
        )}

        {/* State: Error */}
        {!analyzing && error && (
          <div className="max-w-md mx-auto text-center p-8 bg-white rounded-3xl shadow-xl border border-red-100 animate-fade-in">
             <div className="bg-red-50 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 text-red-500">
                <Loader2 size={32} />
             </div>
            <h3 className="text-xl font-bold text-gray-800 mb-2">Oops!</h3>
            <p className="text-gray-600 mb-6">{error}</p>
            <button 
              onClick={() => setError(null)}
              className="bg-gray-900 text-white px-6 py-2 rounded-full hover:bg-black transition-colors"
            >
              Try Again
            </button>
          </div>
        )}

        {/* State: History View */}
        {!analyzing && showHistory && (
          <HistoryView 
            history={history}
            folders={folders}
            onSelect={handleHistorySelect} 
            onClear={clearHistory}
            onClose={() => setShowHistory(false)}
            onCreateFolder={createFolder}
            onDeleteFolder={deleteFolder}
            onMoveItems={moveItemsToFolder}
          />
        )}

        {/* State: Upload View (Default) */}
        {!analyzing && !results && !error && !showHistory && (
          <div className="flex flex-col items-center justify-center min-h-[70vh] animate-fade-in-up">
            <div className="text-center mb-12 max-w-2xl">
              <span className="inline-block py-1 px-3 rounded-full bg-emerald-100 text-emerald-800 text-sm font-semibold mb-4 border border-emerald-200">
                AI Plant Assistant
              </span>
              <h1 className="text-5xl font-bold text-gray-900 mb-6 leading-tight">
                Heal your plants with <span className="text-emerald-600">kindness</span> & science.
              </h1>
              <p className="text-xl text-gray-500 leading-relaxed">
                floroNova identifies plants instantly and provides gentle, expert advice. <br/>
                <span className="font-semibold text-emerald-600">Supports single plants or whole gardens!</span>
              </p>
            </div>
            
            <ImageUpload 
               onImageSelect={handleImageSelect} 
               onOpenAR={() => setShowAR(true)}
            />
            
            <div className="mt-16 text-center">
              <p className="text-sm text-gray-400 font-medium uppercase tracking-widest mb-4">Trusted by plant lovers</p>
              <div className="flex justify-center items-center gap-8 opacity-50 grayscale hover:grayscale-0 transition-all duration-500">
                 <div className="flex items-center gap-1"><Leaf size={16}/><span>NatureHome</span></div>
                 <div className="flex items-center gap-1"><Sprout size={16}/><span>GreenThumb</span></div>
                 <div className="flex items-center gap-1"><Sun size={16}/><span>FloraDaily</span></div>
              </div>
            </div>
          </div>
        )}

        {/* State: Result View */}
        {!analyzing && results && !showHistory && (
          <AnalysisResult results={results} onReset={handleReset} image={currentImage} />
        )}

      </main>
      
      {/* Floating Chat Interface (Hidden in AR Mode) */}
      {!showAR && <ChatInterface contextImage={currentImage} />}

      {!showAR && (
        <footer className="text-center py-8 text-gray-400 text-sm">
          <p>&copy; {new Date().getFullYear()} floroNova. AI advice should be used as a guide.</p>
        </footer>
      )}
    </div>
  );
};

export default App;