import React, { useState } from 'react';
import { PlantAnalysisResult, IssueCheck } from '../types';
import { 
  CheckCircle, 
  AlertTriangle, 
  Droplets, 
  Sun, 
  Bug, 
  Sprout, 
  ThermometerSun, 
  Activity,
  HeartPulse,
  Leaf,
  ShieldCheck,
  Stethoscope,
  BookOpen,
  ExternalLink,
  Share2,
  Copy,
  X,
  Twitter,
  MessageCircle
} from 'lucide-react';

interface AnalysisResultProps {
  results: PlantAnalysisResult[];
  onReset: () => void;
  image?: string | null;
}

const HealthIndicator: React.FC<{ label: string; issue: IssueCheck; icon: React.ReactNode }> = ({ label, issue, icon }) => {
  return (
    <div className={`flex items-start gap-3 p-4 rounded-xl border ${issue.detected ? 'bg-red-50 border-red-100' : 'bg-emerald-50 border-emerald-100'} transition-all`}>
      <div className={`mt-0.5 ${issue.detected ? 'text-red-500' : 'text-emerald-500'}`}>
        {issue.detected ? <AlertTriangle size={20} /> : icon}
      </div>
      <div>
        <h4 className={`font-semibold text-sm uppercase tracking-wide mb-1 ${issue.detected ? 'text-red-800' : 'text-emerald-800'}`}>
          {label}
        </h4>
        <p className={`text-sm ${issue.detected ? 'text-red-700' : 'text-emerald-700'}`}>
          {issue.detected ? issue.details : "Looks healthy!"}
        </p>
      </div>
    </div>
  );
};

const SinglePlantResult: React.FC<{ result: PlantAnalysisResult, index: number, image?: string | null }> = ({ result, index, image }) => {
  const [showShare, setShowShare] = useState(false);
  const [copied, setCopied] = useState(false);

  // Calculate overall health score visually based on number of issues
  const issues = result.issues ? (Object.values(result.issues) as IssueCheck[]) : [];
  const detectedIssuesCount = issues.filter(i => i.detected).length;
  const isHealthy = detectedIssuesCount === 0;

  // Share logic
  const shareText = `I just analyzed my ${result.plantName} with floroNova! 🌿\n\nDiagnosis: ${result.diagnosis}\n\nGet expert plant advice: ${window.location.origin}`;
  
  const handleCopy = () => {
    navigator.clipboard.writeText(shareText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="bg-white rounded-3xl shadow-xl overflow-hidden border border-emerald-50 mb-12 last:mb-0 relative">
        <div className={`p-6 sm:p-10 text-white relative overflow-hidden ${!image ? 'bg-emerald-600' : 'bg-gray-900'}`}>
          
          {image && (
             <>
               <img src={image} alt={result.plantName} className="absolute inset-0 w-full h-full object-cover opacity-60" />
               <div className="absolute inset-0 bg-gradient-to-t from-gray-900/90 via-gray-900/40 to-transparent"></div>
             </>
          )}

          {!image && (
            <div className="absolute top-0 right-0 p-8 opacity-10 pointer-events-none">
              <Leaf size={120} />
            </div>
          )}

          {/* Share Button */}
          <button 
            onClick={() => setShowShare(true)}
            className="absolute top-6 right-6 z-20 bg-white/20 hover:bg-white/30 p-2 rounded-full backdrop-blur-sm transition-colors text-white"
            title="Share Report"
          >
            <Share2 size={20} />
          </button>

          <div className="relative z-10">
            <div className="flex items-center gap-2 mb-2 text-emerald-100">
              <Sprout size={18} />
              <span className="uppercase tracking-wider text-xs font-bold">Plant #{index + 1} Identification</span>
            </div>
            <h1 className="text-3xl sm:text-4xl font-bold mb-2 pr-12 text-shadow-sm">{result.plantName}</h1>
            <div className="flex flex-wrap items-center gap-4 text-emerald-50 text-sm">
              <span className="bg-emerald-500/50 px-3 py-1 rounded-full border border-emerald-400/30 backdrop-blur-sm">
                {result.confidence}% Confidence
              </span>
              {result.alternatives && result.alternatives.length > 0 && (
                <span className="drop-shadow-md">Could also be: {result.alternatives.slice(0, 2).join(", ")}</span>
              )}
            </div>
          </div>
        </div>
        
        {/* Diagnosis Summary */}
        <div className="p-6 sm:p-10">
          <div className="flex items-start gap-4 mb-6">
            <div className={`p-3 rounded-full shrink-0 ${isHealthy ? 'bg-emerald-100 text-emerald-600' : 'bg-amber-100 text-amber-600'}`}>
              <Stethoscope size={24} />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-800 mb-2">Doctor's Diagnosis</h2>
              <p className="text-gray-600 leading-relaxed text-lg">{result.diagnosis}</p>
            </div>
          </div>

          {/* Health Check Grid */}
          {result.issues && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
              <HealthIndicator label="Pests" issue={result.issues.pests} icon={<Bug size={20} />} />
              <HealthIndicator label="Diseases" issue={result.issues.diseases} icon={<Activity size={20} />} />
              <HealthIndicator label="Watering" issue={result.issues.underwatering.detected ? result.issues.underwatering : result.issues.overwatering} icon={<Droplets size={20} />} />
              <HealthIndicator label="Sunlight" issue={result.issues.sunlight} icon={<Sun size={20} />} />
              <HealthIndicator label="Nutrients" issue={result.issues.nutrientDeficiency} icon={<HeartPulse size={20} />} />
              <HealthIndicator label="Soil & Stress" issue={result.issues.soil.detected ? result.issues.soil : result.issues.generalStress} icon={<ThermometerSun size={20} />} />
            </div>
          )}

          {/* Treatment Plan */}
          {!isHealthy && result.treatmentPlan && (
            <div className="bg-emerald-50/50 rounded-3xl p-6 sm:p-8 mb-8 border border-emerald-100">
              <div className="flex items-center gap-3 mb-6">
                <div className="bg-blue-100 p-2 rounded-lg text-blue-600">
                  <ShieldCheck size={24} />
                </div>
                <h2 className="text-2xl font-bold text-gray-800">Treatment Plan</h2>
              </div>
              
              <div className="space-y-6 relative before:absolute before:left-4 before:top-4 before:bottom-4 before:w-0.5 before:bg-emerald-100">
                {result.treatmentPlan.map((step, idx) => (
                  <div key={idx} className="relative pl-12">
                    <div className="absolute left-0 top-0 w-8 h-8 rounded-full bg-emerald-600 text-white flex items-center justify-center font-bold text-sm shadow-md z-10">
                      {idx + 1}
                    </div>
                    <h3 className="text-lg font-bold text-gray-800 mb-1">{step.title}</h3>
                    <p className="text-gray-600">{step.instruction}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Prevention Tips */}
          {result.preventionTips && (
            <div className="mb-8">
              <h2 className="text-xl font-bold text-emerald-900 mb-6 flex items-center gap-2">
                <CheckCircle size={20} className="text-emerald-600" />
                Prevention & Care Tips
              </h2>
              <ul className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {result.preventionTips.map((tip, idx) => (
                  <li key={idx} className="flex items-start gap-3 bg-white p-4 rounded-xl shadow-sm border border-emerald-100/50">
                    <span className="block w-2 h-2 mt-2 rounded-full bg-emerald-400 shrink-0" />
                    <span className="text-emerald-800">{tip}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Expert Resources Section */}
          {result.expertResources && result.expertResources.length > 0 && (
            <div className="bg-emerald-900 rounded-3xl p-6 sm:p-8 text-emerald-50">
              <div className="flex items-center gap-3 mb-6">
                <BookOpen size={24} className="text-emerald-300" />
                <h2 className="text-xl font-bold">Expert Reading & Resources</h2>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {result.expertResources.map((res, idx) => (
                  <a 
                    key={idx} 
                    href={res.url && res.url.startsWith('http') ? res.url : `https://www.google.com/search?q=${encodeURIComponent(res.title + ' ' + result.plantName)}`}
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="bg-white/10 hover:bg-white/20 p-5 rounded-xl transition-all border border-emerald-500/30 flex flex-col h-full group"
                  >
                    <div className="flex justify-between items-start gap-2 mb-3">
                      <h3 className="font-bold text-lg text-white group-hover:text-emerald-200 transition-colors">
                        {res.title}
                      </h3>
                      <ExternalLink size={16} className="shrink-0 opacity-50 group-hover:opacity-100 transition-opacity mt-1" />
                    </div>
                    <p className="text-sm text-emerald-200/80 leading-relaxed flex-grow">
                      {res.description}
                    </p>
                    <div className="mt-4 text-xs font-semibold uppercase tracking-wider text-emerald-400/80">
                      Read Article
                    </div>
                  </a>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Share Modal */}
        {showShare && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden animate-scale-up relative p-6">
            <button 
              onClick={() => setShowShare(false)}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors p-2"
            >
              <X size={20} />
            </button>
            
            <h3 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2">
              <Share2 size={24} className="text-emerald-600" />
              Share Report
            </h3>
            
            <div className="bg-gray-50 p-4 rounded-xl border border-gray-100 mb-6">
              <p className="text-gray-600 text-sm italic leading-relaxed">
                "{shareText}"
              </p>
            </div>

            <div className="grid grid-cols-1 gap-3">
              <button 
                onClick={handleCopy}
                className="flex items-center justify-center gap-2 w-full p-3 rounded-xl border border-gray-200 hover:bg-gray-50 transition-colors font-medium text-gray-700"
              >
                {copied ? <CheckCircle size={18} className="text-emerald-500" /> : <Copy size={18} />}
                {copied ? "Copied!" : "Copy to Clipboard"}
              </button>
              
              <a 
                href={`https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-2 w-full p-3 rounded-xl bg-black text-white hover:bg-gray-800 transition-colors font-medium"
              >
                <Twitter size={18} />
                Share on X
              </a>

              <a 
                href={`https://wa.me/?text=${encodeURIComponent(shareText)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-2 w-full p-3 rounded-xl bg-[#25D366] text-white hover:bg-[#20bd5a] transition-colors font-medium"
              >
                <MessageCircle size={18} />
                Share on WhatsApp
              </a>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export const AnalysisResult: React.FC<AnalysisResultProps> = ({ results, onReset, image }) => {
  // Guard against null/undefined/empty result
  if (!results || results.length === 0) return null;

  // Filter out non-plant detections unless everything is marked as not a plant
  const validPlants = results.filter(r => r.isPlant);
  const displayPlants = validPlants.length > 0 ? validPlants : results;

  // If no valid plants found and result says so
  if (displayPlants.length === 1 && !displayPlants[0].isPlant) {
    return (
      <div className="max-w-md mx-auto text-center p-8 bg-white rounded-3xl shadow-xl border border-red-100 mt-10">
        <div className="bg-red-50 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6 text-red-500">
          <AlertTriangle size={40} />
        </div>
        <h2 className="text-2xl font-bold text-gray-800 mb-4">Not a Plant?</h2>
        <p className="text-gray-600 mb-8 leading-relaxed">
          I'm having trouble identifying a plant in this photo. I work best with clear photos of leaves, flowers, or whole plants.
        </p>
        <button 
          onClick={onReset}
          className="bg-emerald-600 hover:bg-emerald-700 text-white font-medium py-3 px-8 rounded-full transition-colors shadow-lg shadow-emerald-200"
        >
          Try Another Photo
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto animate-fade-in pb-20 space-y-8">
      
      {displayPlants.map((plant, index) => (
        <SinglePlantResult key={index} result={plant} index={index} image={image} />
      ))}

      {/* Floating Action Button for New Scan - Moved to left to avoid Chat FAB */}
      <div className="fixed bottom-6 left-6 z-50">
        <button 
          onClick={onReset}
          className="bg-gray-900 hover:bg-black text-white px-6 py-4 rounded-full shadow-2xl flex items-center gap-2 font-semibold transition-transform hover:scale-105"
        >
          <Sprout size={20} />
          Scan Another Plant
        </button>
      </div>

    </div>
  );
};