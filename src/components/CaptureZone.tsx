import React, { useRef, useState } from 'react';
import { Camera, ImagePlus, Sparkles, Shield, Cpu, UploadCloud } from 'lucide-react';

interface CaptureZoneProps {
  onFilesSelected: (files: File[]) => void;
  onLoadSample: () => void;
  disabled?: boolean;
}

export const CaptureZone: React.FC<CaptureZoneProps> = ({
  onFilesSelected,
  onLoadSample,
  disabled = false,
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    if (!disabled) setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (disabled) return;

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const files = Array.from(e.dataTransfer.files).filter((f) =>
        f.type.startsWith('image/')
      );
      if (files.length > 0) {
        onFilesSelected(files);
      }
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const files = Array.from(e.target.files);
      onFilesSelected(files);
      e.target.value = ''; // Reset for re-selection
    }
  };

  return (
    <div
      className={`capture-card ${isDragging ? 'dragging' : ''}`}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {/* Hidden inputs for camera capture and file picker */}
      <input
        type="file"
        ref={cameraInputRef}
        accept="image/*"
        capture="environment"
        onChange={handleFileChange}
        style={{ display: 'none' }}
      />
      <input
        type="file"
        ref={galleryInputRef}
        accept="image/*"
        multiple
        onChange={handleFileChange}
        style={{ display: 'none' }}
      />

      <div className="capture-icon-bubble">
        <UploadCloud size={32} />
      </div>

      <h2>Snap or Drop Business Cards</h2>
      <p>
        Photograph a single card or lay <strong>up to 6 cards on a table</strong> in one frame.
        Our spatial vision AI segments every card, isolates the photo avatar, and extracts structured contacts.
      </p>

      <div className="capture-btn-group">
        <button
          type="button"
          onClick={() => cameraInputRef.current?.click()}
          disabled={disabled}
          className="btn-primary"
          id="btn-camera-capture"
        >
          <Camera size={18} />
          <span>Camera Shutter</span>
        </button>

        <button
          type="button"
          onClick={() => galleryInputRef.current?.click()}
          disabled={disabled}
          className="btn-secondary"
          id="btn-upload-gallery"
        >
          <ImagePlus size={18} />
          <span>Select Images (Multi)</span>
        </button>

        <button
          type="button"
          onClick={onLoadSample}
          disabled={disabled}
          className="btn-secondary"
          style={{ borderColor: 'rgba(99, 102, 241, 0.4)' }}
          title="Try a synthetic multi-card tabletop snapshot for instant demonstration"
          id="btn-sample-cards"
        >
          <Sparkles size={16} style={{ color: 'var(--accent-primary)' }} />
          <span>Try Multi-Card Demo</span>
        </button>
      </div>

      <div className="capture-meta-badges">
        <span className="meta-badge-item">
          <Shield size={13} style={{ color: 'var(--accent-emerald)' }} />
          100% Client-Side Compression (&lt; 600 KB)
        </span>
        <span className="meta-badge-item">
          <Cpu size={13} style={{ color: 'var(--accent-cyan)' }} />
          Multi-Card Spatial Detection
        </span>
        <span className="meta-badge-item">
          <Sparkles size={13} style={{ color: 'var(--accent-primary)' }} />
          Auto-Cropped vCard Avatars
        </span>
      </div>
    </div>
  );
};
