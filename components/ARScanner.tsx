import React, { useEffect, useRef, useState } from 'react';
import { ArrowLeft, AlertTriangle, Droplets, Sun, Bug, Activity, Pause, Play, ScanLine, FileText, CheckCircle, Clock, Thermometer, ShieldAlert, X } from 'lucide-react';
import { scanPlantAR, generateDetailedARReport } from '../services/geminiService';
import { ARDetection, ARIssueType, ARDetailedReport } from '../types';

interface ARScannerProps {
  onClose: () => void;
}

export const ARScanner: React.FC<ARScannerProps> = ({ onClose }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isScanning, setIsScanning] = useState(true);
  const [detections, setDetections] = useState<ARDetection[]>([]);
  const [permissionError, setPermissionError] = useState(false);
  const [lastScanTime, setLastScanTime] = useState(0);
  
  // Report State
  const [report, setReport] = useState<ARDetailedReport | null>(null);
  const [reportImage, setReportImage] = useState<string | null>(null);
  const [generatingReport, setGeneratingReport] = useState(false);

  // Setup Camera
  useEffect(() => {
    let stream: MediaStream | null = null;

    const startCamera = async () => {
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'environment' } // Prefer back camera
        });
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
      } catch (err) {
        console.error("Camera access denied", err);
        setPermissionError(true);
      }
    };

    startCamera();

    return () => {
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  // AR Loop
  useEffect(() => {
    let intervalId: any;

    const scanFrame = async () => {
      if (!isScanning || generatingReport || report || !videoRef.current || !canvasRef.current || videoRef.current.readyState !== 4) return;
      
      const now = Date.now();
      // Rate limit scans to every 1.5 seconds to balance API usage and "real-time" feel
      if (now - lastScanTime < 1500) return; 

      // Create a temporary canvas to capture the frame
      const tempCanvas = document.createElement('canvas');
      tempCanvas.width = videoRef.current.videoWidth;
      tempCanvas.height = videoRef.current.videoHeight;
      const ctx = tempCanvas.getContext('2d');
      if (!ctx) return;

      // Draw video frame to temp canvas
      ctx.drawImage(videoRef.current, 0, 0, tempCanvas.width, tempCanvas.height);
      
      // Get Base64 image
      const base64Image = tempCanvas.toDataURL('image/jpeg', 0.6); // Compress slightly for speed

      try {
        setLastScanTime(Date.now());
        const results = await scanPlantAR(base64Image);
        setDetections(results);
      } catch (e) {
        console.error("AR Scan failed", e);
      }
    };

    if (isScanning && !permissionError) {
      intervalId = setInterval(scanFrame, 200); // Check loop freq (actual scan rate limited inside)
    }

    return () => clearInterval(intervalId);
  }, [isScanning, permissionError, lastScanTime, generatingReport, report]);

  // Handle Detailed Report Generation
  const handleCaptureReport = async () => {
    if (!videoRef.current) return;

    setIsScanning(false); // Pause live scan
    setGeneratingReport(true);
    videoRef.current.pause(); // Freeze frame

    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = videoRef.current.videoWidth;
    tempCanvas.height = videoRef.current.videoHeight;
    const ctx = tempCanvas.getContext('2d');
    if (!ctx) return;
    
    ctx.drawImage(videoRef.current, 0, 0);
    const base64Image = tempCanvas.toDataURL('image/jpeg', 0.9); // High quality for report

    setReportImage(base64Image); // Store image for display

    try {
      const data = await generateDetailedARReport(base64Image);
      setReport(data);
    } catch (e) {
      console.error("Failed to generate report", e);
      alert("Could not generate report. Please try again.");
      setReportImage(null);
      setIsScanning(true);
      videoRef.current.play();
    } finally {
      setGeneratingReport(false);
    }
  };

  const closeReport = () => {
    setReport(null);
    setReportImage(null);
    setIsScanning(true);
    if (videoRef.current) videoRef.current.play();
  };

  // Render Overlays
  useEffect(() => {
    const renderOverlays = () => {
      if (!videoRef.current || !canvasRef.current) return;

      const video = videoRef.current;
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      // Match canvas size to video display size
      if (canvas.width !== video.clientWidth || canvas.height !== video.clientHeight) {
         canvas.width = video.clientWidth;
         canvas.height = video.clientHeight;
      }

      ctx.clearRect(0, 0, canvas.width, canvas.height);

      if (detections.length === 0 || report) return; // Don't show bounding boxes if report is open

      detections.forEach(det => {
        // Gemini returns 0-1000 based coordinates [ymin, xmin, ymax, xmax]
        const [ymin, xmin, ymax, xmax] = det.box_2d;

        // Convert to pixel coordinates
        const x = (xmin / 1000) * canvas.width;
        const y = (ymin / 1000) * canvas.height;
        const w = ((xmax - xmin) / 1000) * canvas.width;
        const h = ((ymax - ymin) / 1000) * canvas.height;

        // Determine Color based on Type
        let color = '#10B981'; // Default Emerald (Healthy)
        let bgColor = 'rgba(16, 185, 129, 0.2)';
        
        switch (det.type) {
          case 'disease':
            color = '#EF4444'; // Red
            bgColor = 'rgba(239, 68, 68, 0.2)';
            break;
          case 'nutrient':
            color = '#EAB308'; // Yellow
            bgColor = 'rgba(234, 179, 8, 0.2)';
            break;
          case 'dryness':
            color = '#3B82F6'; // Blue
            bgColor = 'rgba(59, 130, 246, 0.2)';
            break;
          case 'pest':
            color = '#F97316'; // Orange
            bgColor = 'rgba(249, 115, 22, 0.2)';
            break;
        }

        // Draw Box
        ctx.strokeStyle = color;
        ctx.lineWidth = 3;
        ctx.beginPath();
        // Add rounded corners visually by drawing lines
        ctx.roundRect(x, y, w, h, 8);
        ctx.stroke();
        
        // Fill lightly
        ctx.fillStyle = bgColor;
        ctx.fill();

        // Draw Label Background
        const labelText = `${det.label} (${Math.round(det.confidence)}%)`;
        ctx.font = 'bold 14px Outfit, sans-serif';
        const textWidth = ctx.measureText(labelText).width;
        
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.roundRect(x, y - 28, textWidth + 16, 24, 6);
        ctx.fill();

        // Draw Label Text
        ctx.fillStyle = '#FFFFFF';
        ctx.fillText(labelText, x + 8, y - 11);
      });
    };

    // Use requestAnimationFrame for smooth overlay rendering attached to video
    let animationFrameId: number;
    const loop = () => {
      renderOverlays();
      animationFrameId = requestAnimationFrame(loop);
    };
    loop();

    return () => cancelAnimationFrame(animationFrameId);
  }, [detections, report]);

  // Issue Legend Component
  const LegendItem: React.FC<{ type: ARIssueType; label: string; color: string; icon: React.ReactNode }> = ({ type, label, color, icon }) => (
    <div className="flex items-center gap-2 bg-black/50 backdrop-blur-md px-3 py-1.5 rounded-full border border-white/10">
      <div className={`p-1 rounded-full ${color}`}>
        {icon}
      </div>
      <span className="text-xs font-medium text-white">{label}</span>
    </div>
  );

  return (
    <div className="fixed inset-0 z-[100] bg-black flex flex-col font-sans">
      {/* Header */}
      <div className="absolute top-0 left-0 right-0 p-4 z-20 flex justify-between items-start bg-gradient-to-b from-black/60 to-transparent">
        <button 
          onClick={onClose}
          className="p-3 rounded-full bg-white/20 backdrop-blur-md text-white hover:bg-white/30 transition-colors"
        >
          <ArrowLeft size={24} />
        </button>
        
        <div className="flex flex-col items-end gap-2">
           <div className="bg-emerald-600/90 backdrop-blur-md px-4 py-2 rounded-full text-white text-sm font-bold shadow-lg flex items-center gap-2 animate-pulse">
              <ScanLine size={16} /> Live Health Scan
           </div>
           {!report && detections.length > 0 && (
             <div className="bg-black/60 backdrop-blur-md px-3 py-1 rounded-full text-xs text-gray-300">
               {detections.length} issues detected
             </div>
           )}
        </div>
      </div>

      {/* Main AR View */}
      <div className="relative flex-1 bg-gray-900 overflow-hidden">
        {permissionError ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center text-white p-8 text-center">
            <AlertTriangle size={48} className="text-red-500 mb-4" />
            <h3 className="text-xl font-bold mb-2">Camera Access Required</h3>
            <p className="text-gray-400">Please allow camera access to use the AR Health Scanner.</p>
            <button onClick={onClose} className="mt-6 bg-white text-black px-6 py-2 rounded-full font-bold">Go Back</button>
          </div>
        ) : (
          <>
            <video 
              ref={videoRef}
              autoPlay 
              playsInline 
              muted
              className={`absolute inset-0 w-full h-full object-cover transition-all duration-500 ${report ? 'blur-sm scale-105 brightness-50' : ''}`}
            />
            <canvas 
              ref={canvasRef}
              className="absolute inset-0 w-full h-full pointer-events-none"
            />
            
            {/* Generating Loader */}
            {generatingReport && (
              <div className="absolute inset-0 flex flex-col items-center justify-center z-30">
                <div className="w-16 h-16 border-4 border-emerald-400 border-t-transparent rounded-full animate-spin mb-4"></div>
                <h3 className="text-white text-xl font-bold animate-pulse">Generating Report...</h3>
              </div>
            )}
          </>
        )}
      </div>

      {/* Report Modal */}
      {report && (
        <div className="absolute inset-x-4 bottom-4 top-8 bg-white rounded-3xl z-40 shadow-2xl overflow-hidden flex flex-col animate-fade-in-up border border-gray-800">
          
          {/* Captured Image */}
          {reportImage && (
             <div className="h-56 w-full shrink-0 relative bg-black">
                <img src={reportImage} alt="Analyzed Plant" className="w-full h-full object-cover opacity-90" />
                <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-transparent to-transparent"></div>
                <button 
                  onClick={closeReport} 
                  className="absolute top-4 right-4 p-2 bg-black/40 backdrop-blur-md rounded-full text-white hover:bg-black/60 transition-colors"
                >
                  <X size={20} />
                </button>
             </div>
          )}

          {/* Report Header */}
          <div className={`p-6 bg-emerald-600 text-white relative z-10 ${reportImage ? '-mt-4 rounded-t-3xl shadow-lg' : ''}`}>
            {!reportImage && (
                <button onClick={closeReport} className="absolute top-4 right-4 p-2 bg-white/20 rounded-full hover:bg-white/30 transition-colors">
                  <X size={20} />
                </button>
            )}
            <h2 className="text-2xl font-bold pr-10 mb-1">{report.disease_name}</h2>
            <div className="flex items-center gap-3 text-emerald-100 text-sm">
               <span className="flex items-center gap-1 bg-white/20 px-2 py-0.5 rounded-full">
                 <ShieldAlert size={12} /> {report.severity_level} Severity
               </span>
               <span className="flex items-center gap-1 bg-white/20 px-2 py-0.5 rounded-full">
                 <Activity size={12} /> {Math.round(report.confidence_score)}% Confidence
               </span>
            </div>
          </div>
          
          {/* Report Body */}
          <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-white">
             {/* Scores */}
             <div className="grid grid-cols-2 gap-4">
                <div className="bg-gray-50 p-4 rounded-2xl border border-gray-100 text-center">
                   <div className="text-emerald-500 mb-1 flex justify-center"><CheckCircle size={24}/></div>
                   <div className="text-2xl font-bold text-gray-800">{report.care_score}/10</div>
                   <div className="text-xs text-gray-400 uppercase tracking-wide">Health Score</div>
                </div>
                <div className="bg-gray-50 p-4 rounded-2xl border border-gray-100 text-center">
                   <div className="text-blue-500 mb-1 flex justify-center"><Clock size={24}/></div>
                   <div className="text-xl font-bold text-gray-800 leading-tight py-1">{report.time_to_recovery}</div>
                   <div className="text-xs text-gray-400 uppercase tracking-wide">Recovery</div>
                </div>
             </div>

             {/* Sections */}
             <div>
               <h4 className="font-bold text-gray-800 mb-2 flex items-center gap-2">
                 <AlertTriangle size={18} className="text-amber-500"/> Symptoms
               </h4>
               <ul className="list-disc pl-5 space-y-1 text-gray-600 text-sm">
                 {report.symptoms_observed.map((s, i) => <li key={i}>{s}</li>)}
               </ul>
             </div>

             <div>
               <h4 className="font-bold text-gray-800 mb-2 flex items-center gap-2">
                 <Thermometer size={18} className="text-red-500"/> Immediate Action
               </h4>
               <div className="space-y-2">
                 {report.immediate_actions.map((action, i) => (
                   <div key={i} className="flex gap-3 bg-red-50 p-3 rounded-xl border border-red-100 text-sm text-gray-700">
                     <span className="font-bold text-red-500">{i+1}.</span>
                     {action}
                   </div>
                 ))}
               </div>
             </div>

             <div>
               <h4 className="font-bold text-gray-800 mb-2 flex items-center gap-2">
                 <ShieldAlert size={18} className="text-blue-500"/> Prevention
               </h4>
               <ul className="list-disc pl-5 space-y-1 text-gray-600 text-sm">
                 {report.long_term_prevention.map((s, i) => <li key={i}>{s}</li>)}
               </ul>
             </div>
          </div>
        </div>
      )}

      {/* Footer Controls & Legend (Hidden when report is open) */}
      {!report && (
        <div className="absolute bottom-0 left-0 right-0 p-6 z-20 bg-gradient-to-t from-black/80 via-black/40 to-transparent">
          {/* Dynamic Legend */}
          <div className="flex flex-wrap gap-2 mb-8 justify-center">
             <LegendItem type="disease" label="Disease" color="bg-red-500 text-white" icon={<Activity size={12}/>} />
             <LegendItem type="nutrient" label="Nutrient" color="bg-yellow-500 text-white" icon={<Sun size={12}/>} />
             <LegendItem type="dryness" label="Watering" color="bg-blue-500 text-white" icon={<Droplets size={12}/>} />
             <LegendItem type="pest" label="Pests" color="bg-orange-500 text-white" icon={<Bug size={12}/>} />
          </div>

          <div className="flex justify-center items-center gap-8">
             {/* Play/Pause Scan */}
             <button 
               onClick={() => {
                 setDetections([]);
                 setIsScanning(!isScanning);
               }}
               className="w-12 h-12 rounded-full bg-white/20 backdrop-blur-md text-white flex items-center justify-center hover:bg-white/30 transition-colors"
             >
               {isScanning ? <Pause size={20} fill="currentColor" /> : <Play size={20} fill="currentColor" className="ml-0.5" />}
             </button>

             {/* Shutter Button (Generate Report) */}
             <button 
               onClick={handleCaptureReport}
               disabled={generatingReport}
               className="w-20 h-20 rounded-full border-4 border-white flex items-center justify-center shadow-[0_0_20px_rgba(255,255,255,0.3)] hover:scale-105 transition-transform group relative"
             >
               <div className="w-16 h-16 bg-white rounded-full group-hover:scale-90 transition-transform"></div>
               <div className="absolute -bottom-8 text-white text-xs font-bold opacity-80 whitespace-nowrap">
                 Generate Report
               </div>
             </button>

             {/* Spacer for alignment */}
             <div className="w-12 h-12"></div>
          </div>
        </div>
      )}
    </div>
  );
};