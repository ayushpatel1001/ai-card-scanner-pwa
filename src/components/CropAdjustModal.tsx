import React, { useRef, useEffect, useState, useCallback } from 'react';
import { X, Crop, Check, RotateCcw } from 'lucide-react';
import type { BoundingBox, ExtractedContact } from '../types/contact';
import { cropCardAvatar, normalizeBoundingBox } from '../services/imageProcessor';

interface CropAdjustModalProps {
  contact: ExtractedContact;
  sourceImageUri: string;
  onApplyCrop: (contactId: string, newBox: BoundingBox, newAvatarUri: string) => void;
  onClose: () => void;
}

type DragMode = 'none' | 'move' | 'nw' | 'ne' | 'se' | 'sw' | 'n' | 's' | 'e' | 'w' | 'draw';

export const CropAdjustModal: React.FC<CropAdjustModalProps> = ({
  contact,
  sourceImageUri,
  onApplyCrop,
  onClose,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [imageEl, setImageEl] = useState<HTMLImageElement | null>(null);
  const [currentBox, setCurrentBox] = useState<BoundingBox>(() =>
    normalizeBoundingBox(contact.box)
  );
  const [previewUri, setPreviewUri] = useState<string>(contact.cropAvatarUri);
  const [dragMode, setDragMode] = useState<DragMode>('none');
  const [dragStart, setDragStart] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [initialBox, setInitialBox] = useState<BoundingBox>(() =>
    normalizeBoundingBox(contact.box)
  );

  // Load the parent full image
  useEffect(() => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.src = sourceImageUri;
    img.onload = () => {
      setImageEl(img);
    };
  }, [sourceImageUri]);

  // Update live preview when bounding box changes
  useEffect(() => {
    if (!imageEl) return;
    let isCancelled = false;

    cropCardAvatar(imageEl, currentBox, 360)
      .then((uri) => {
        if (!isCancelled) setPreviewUri(uri);
      })
      .catch((err) => {
        console.warn('Live crop preview failed:', err);
      });

    return () => {
      isCancelled = true;
    };
  }, [imageEl, currentBox]);

  // Render parent image and bounding box on interactive canvas
  const drawCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas || !imageEl) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set canvas dimensions based on image aspect ratio and container size
    const containerW = canvas.parentElement?.clientWidth || 700;
    const maxH = Math.min(window.innerHeight * 0.55, 500);

    const aspect = imageEl.naturalWidth / imageEl.naturalHeight;
    let canvasW = containerW;
    let canvasH = containerW / aspect;

    if (canvasH > maxH) {
      canvasH = maxH;
      canvasW = maxH * aspect;
    }

    canvas.width = canvasW;
    canvas.height = canvasH;

    // 1. Draw base photo
    ctx.drawImage(imageEl, 0, 0, canvasW, canvasH);

    // 2. Dim background outside bounding box
    const bx = currentBox.xmin * canvasW;
    const by = currentBox.ymin * canvasH;
    const bw = (currentBox.xmax - currentBox.xmin) * canvasW;
    const bh = (currentBox.ymax - currentBox.ymin) * canvasH;

    ctx.fillStyle = 'rgba(0, 0, 0, 0.55)';
    // Top
    ctx.fillRect(0, 0, canvasW, by);
    // Bottom
    ctx.fillRect(0, by + bh, canvasW, canvasH - (by + bh));
    // Left
    ctx.fillRect(0, by, bx, bh);
    // Right
    ctx.fillRect(bx + bw, by, canvasW - (bx + bw), bh);

    // 3. Draw active bounding box border
    ctx.strokeStyle = '#6366f1';
    ctx.lineWidth = 2.5;
    ctx.strokeRect(bx, by, bw, bh);

    // 4. Subtle rule of thirds guidelines inside box
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.25)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    // vertical thirds
    ctx.moveTo(bx + bw / 3, by);
    ctx.lineTo(bx + bw / 3, by + bh);
    ctx.moveTo(bx + (2 * bw) / 3, by);
    ctx.lineTo(bx + (2 * bw) / 3, by + bh);
    // horizontal thirds
    ctx.moveTo(bx, by + bh / 3);
    ctx.lineTo(bx + bw, by + bh / 3);
    ctx.moveTo(bx, by + (2 * bh) / 3);
    ctx.lineTo(bx + bw, by + (2 * bh) / 3);
    ctx.stroke();

    // 5. Draw corner and edge handles
    const handleSize = 14;
    ctx.fillStyle = '#ffffff';
    ctx.strokeStyle = '#4f46e5';
    ctx.lineWidth = 2.5;

    const handles = [
      { x: bx, y: by }, // NW
      { x: bx + bw / 2, y: by }, // N
      { x: bx + bw, y: by }, // NE
      { x: bx + bw, y: by + bh / 2 }, // E
      { x: bx + bw, y: by + bh }, // SE
      { x: bx + bw / 2, y: by + bh }, // S
      { x: bx, y: by + bh }, // SW
      { x: bx, y: by + bh / 2 }, // W
    ];

    for (const h of handles) {
      ctx.fillRect(h.x - handleSize / 2, h.y - handleSize / 2, handleSize, handleSize);
      ctx.strokeRect(h.x - handleSize / 2, h.y - handleSize / 2, handleSize, handleSize);
    }
  }, [imageEl, currentBox]);

  useEffect(() => {
    drawCanvas();
    window.addEventListener('resize', drawCanvas);
    return () => window.removeEventListener('resize', drawCanvas);
  }, [drawCanvas]);

  // Coordinate conversion helper
  const getCanvasCoords = (e: React.MouseEvent | React.TouchEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0, normX: 0, normY: 0 };
    const rect = canvas.getBoundingClientRect();

    let clientX = 0;
    let clientY = 0;
    if ('touches' in e && e.touches.length > 0) {
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    } else if ('clientX' in e) {
      clientX = e.clientX;
      clientY = e.clientY;
    }

    const x = Math.max(0, Math.min(canvas.width, clientX - rect.left));
    const y = Math.max(0, Math.min(canvas.height, clientY - rect.top));

    return {
      x,
      y,
      normX: x / canvas.width,
      normY: y / canvas.height,
    };
  };

  // Determine which handle or region the pointer clicked
  const getHitZone = (normX: number, normY: number): DragMode => {
    const tolerance = 0.05; // 5% normalized tolerance
    const { ymin, xmin, ymax, xmax } = currentBox;

    const nearLeft = Math.abs(normX - xmin) < tolerance;
    const nearRight = Math.abs(normX - xmax) < tolerance;
    const nearTop = Math.abs(normY - ymin) < tolerance;
    const nearBottom = Math.abs(normY - ymax) < tolerance;

    if (nearTop && nearLeft) return 'nw';
    if (nearTop && nearRight) return 'ne';
    if (nearBottom && nearLeft) return 'sw';
    if (nearBottom && nearRight) return 'se';
    if (nearTop && normX > xmin && normX < xmax) return 'n';
    if (nearBottom && normX > xmin && normX < xmax) return 's';
    if (nearLeft && normY > ymin && normY < ymax) return 'w';
    if (nearRight && normY > ymin && normY < ymax) return 'e';

    if (normX >= xmin && normX <= xmax && normY >= ymin && normY <= ymax) {
      return 'move';
    }

    return 'draw';
  };

  const handlePointerDown = (e: React.MouseEvent | React.TouchEvent) => {
    const { normX, normY } = getCanvasCoords(e);
    const mode = getHitZone(normX, normY);

    setDragMode(mode);
    setDragStart({ x: normX, y: normY });
    setInitialBox({ ...currentBox });

    if (mode === 'draw') {
      setCurrentBox({
        xmin: normX,
        ymin: normY,
        xmax: normX + 0.01,
        ymax: normY + 0.01,
      });
    }
  };

  const handlePointerMove = (e: React.MouseEvent | React.TouchEvent) => {
    if (dragMode === 'none') return;
    const { normX, normY } = getCanvasCoords(e);
    const dx = normX - dragStart.x;
    const dy = normY - dragStart.y;

    let { ymin, xmin, ymax, xmax } = initialBox;

    if (dragMode === 'move') {
      const boxW = xmax - xmin;
      const boxH = ymax - ymin;
      let newXmin = Math.max(0, Math.min(1 - boxW, xmin + dx));
      let newYmin = Math.max(0, Math.min(1 - boxH, ymin + dy));
      setCurrentBox({
        xmin: newXmin,
        ymin: newYmin,
        xmax: newXmin + boxW,
        ymax: newYmin + boxH,
      });
      return;
    }

    if (dragMode === 'draw') {
      setCurrentBox({
        xmin: Math.min(dragStart.x, normX),
        ymin: Math.min(dragStart.y, normY),
        xmax: Math.max(dragStart.x, normX),
        ymax: Math.max(dragStart.y, normY),
      });
      return;
    }

    // Handle resizing modes
    if (dragMode.includes('n')) ymin = Math.min(ymax - 0.02, ymin + dy);
    if (dragMode.includes('s')) ymax = Math.max(ymin + 0.02, ymax + dy);
    if (dragMode.includes('w')) xmin = Math.min(xmax - 0.02, xmin + dx);
    if (dragMode.includes('e')) xmax = Math.max(xmin + 0.02, xmax + dx);

    setCurrentBox(normalizeBoundingBox({ ymin, xmin, ymax, xmax }));
  };

  const handlePointerUp = () => {
    setDragMode('none');
  };

  const handleResetToAI = () => {
    setCurrentBox(normalizeBoundingBox(contact.box));
  };

  const handleConfirm = () => {
    onApplyCrop(contact.id, currentBox, previewUri);
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-content crop-modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>
            <Crop size={18} style={{ color: 'var(--accent-primary)', marginRight: '0.5rem' }} />
            Adjust Card Crop & Avatar
          </h3>
          <button onClick={onClose} className="icon-btn" aria-label="Close modal">
            <X size={18} />
          </button>
        </div>

        <div className="modal-body">
          <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '1rem' }}>
            Drag handles to tightly fit the card boundary, or drag inside to position.
            This crop will be attached as the contact photo in the exported vCard.
          </p>

          <div className="crop-canvas-wrapper">
            <canvas
              ref={canvasRef}
              className="crop-canvas"
              onMouseDown={handlePointerDown}
              onMouseMove={handlePointerMove}
              onMouseUp={handlePointerUp}
              onTouchStart={handlePointerDown}
              onTouchMove={handlePointerMove}
              onTouchEnd={handlePointerUp}
            />
          </div>

          <div className="crop-preview-bar">
            <div className="crop-mini-preview">
              <img src={previewUri} alt="Crop Preview" className="crop-mini-thumb" />
              <div>
                <strong style={{ fontSize: '0.85rem', display: 'block' }}>Avatar Preview</strong>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                  Square 360&times;360 Contact Photo
                </span>
              </div>
            </div>

            <button onClick={handleResetToAI} className="btn-secondary btn-sm" title="Reset to AI box">
              <RotateCcw size={14} />
              <span>Reset Box</span>
            </button>
          </div>
        </div>

        <div className="modal-footer">
          <button onClick={onClose} className="btn-secondary">
            Cancel
          </button>
          <button onClick={handleConfirm} className="btn-primary">
            <Check size={16} />
            <span>Apply Crop</span>
          </button>
        </div>
      </div>
    </div>
  );
};
