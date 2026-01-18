import React, { useRef } from 'react';
import { Button } from "@/components/ui/button";
import { Upload, X, Image as ImageIcon } from "lucide-react";

export default function ImageUploader({ onUpload, isUploading, images, onRemove }) {
  const fileInputRef = useRef(null);

  const handleFileSelect = (e) => {
    const files = Array.from(e.target.files);
    if (files.length > 0) {
      onUpload(files);
    }
  };

  return (
    <div className="space-y-4">
      <div 
        onClick={() => fileInputRef.current?.click()}
        className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-blue-500 hover:bg-blue-50 transition-colors cursor-pointer"
      >
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept="image/*,video/*"
          onChange={handleFileSelect}
          className="hidden"
        />
        <Upload className="w-12 h-12 text-gray-400 mx-auto mb-4" />
        <p className="text-sm font-medium text-gray-700 mb-1">
          Click to upload images or videos
        </p>
        <p className="text-xs text-gray-500">
          PNG, JPG, MP4 up to 50MB
        </p>
        {isUploading && (
          <p className="text-sm text-blue-600 mt-2">Uploading...</p>
        )}
      </div>

      {images.length > 0 && (
        <div className="grid grid-cols-3 gap-4">
          {images.map((url, idx) => (
            <div key={idx} className="relative group">
              <img
                src={url}
                alt={`Defect ${idx + 1}`}
                className="w-full h-32 object-cover rounded-lg border"
              />
              <button
                type="button"
                onClick={() => onRemove(idx)}
                className="absolute top-2 right-2 p-1 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}