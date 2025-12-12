import React, { useRef, useState } from 'react';
import { Upload, Camera, Image as ImageIcon, Layers, ScanLine } from 'lucide-react';

interface ImageUploadProps {
  onImageSelect: (base64: string) => void;
  onOpenAR: () => void;
}

export const ImageUpload: React.FC<ImageUploadProps> = ({ onImageSelect, onOpenAR }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);

  const processFile = (file: File) => {
    if (!file.type.startsWith('image/')) {
      alert('Please upload an image file (JPG, PNG, etc).');
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const result = e.target?.result as string;
      if (result) {
        onImageSelect(result);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processFile(e.dataTransfer.files[0]);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      processFile(e.target.files[0]);
    }
  };

  return (
    <div className="w-full max-w-xl mx-auto">
      <div 
        className={`relative border-2 border-dashed rounded-3xl p-10 text-center transition-all duration-300 cursor-pointer group bg-white
          ${isDragging 
            ? 'border-emerald-500 bg-emerald-50 scale-[1.02]' 
            : 'border-emerald-200 hover:border-emerald-400 hover:bg-emerald-50/50 hover:shadow-lg'
          }`}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onClick={() => fileInputRef.current?.click()}
      >
        <input 
          type="file" 
          ref={fileInputRef} 
          className="hidden" 
          accept="image/*"
          onChange={handleFileChange}
        />
        
        <div className="mb-6 flex justify-center">
          <div className={`p-5 rounded-full transition-colors ${isDragging ? 'bg-emerald-200 text-emerald-700' : 'bg-emerald-100 text-emerald-600 group-hover:bg-emerald-200 group-hover:text-emerald-700'}`}>
            <Camera size={48} />
          </div>
        </div>

        <h3 className="text-2xl font-semibold text-gray-800 mb-2">
          Check Your Plants' Health
        </h3>
        <p className="text-gray-500 mb-8 max-w-sm mx-auto">
          Upload a photo of a single plant, a leaf, or your <span className="text-emerald-600 font-bold">whole garden bed</span> for an instant check-up.
        </p>

        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <button className="bg-emerald-600 text-white px-8 py-3 rounded-full font-medium hover:bg-emerald-700 transition-colors shadow-lg shadow-emerald-200 flex items-center justify-center gap-2">
            <Upload size={18} />
            Select Photo
          </button>
        </div>
        
        <p className="mt-6 text-xs text-gray-400 font-medium tracking-wide uppercase">
          Supports JPG, PNG, WEBP • Max 5MB
        </p>
      </div>

      <div className="mt-8">
        <button 
           onClick={(e) => {
             e.stopPropagation();
             onOpenAR();
           }}
           className="w-full bg-gray-900 text-white p-4 rounded-2xl flex items-center justify-center gap-3 shadow-xl hover:bg-black transition-transform hover:scale-[1.02] group"
        >
          <div className="bg-white/20 p-2 rounded-full group-hover:bg-white/30 transition-colors">
            <ScanLine size={20} />
          </div>
          <div className="text-left">
             <h4 className="font-bold text-sm">Open AR Health Scanner</h4>
             <p className="text-xs text-gray-400">Detect diseases in real-time</p>
          </div>
        </button>
      </div>

      <div className="grid grid-cols-3 gap-4 mt-8 opacity-70">
         <div className="bg-white p-4 rounded-xl text-center border border-emerald-50 shadow-sm">
            <div className="text-emerald-500 mb-2 flex justify-center"><ImageIcon size={20}/></div>
            <p className="text-xs text-gray-600 font-medium">Single Plant</p>
         </div>
         <div className="bg-white p-4 rounded-xl text-center border border-emerald-50 shadow-sm">
            <div className="text-emerald-500 mb-2 flex justify-center"><Layers size={20}/></div>
            <p className="text-xs text-gray-600 font-medium">Whole Garden</p>
         </div>
         <div className="bg-white p-4 rounded-xl text-center border border-emerald-50 shadow-sm">
            <div className="text-emerald-500 mb-2 flex justify-center"><ImageIcon size={20}/></div>
            <p className="text-xs text-gray-600 font-medium">Close Ups</p>
         </div>
      </div>
    </div>
  );
};