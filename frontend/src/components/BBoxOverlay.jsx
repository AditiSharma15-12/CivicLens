import React, { useRef, useState, useEffect, useCallback } from 'react';

const TYPE_COLORS = {
  pothole: '#EF4444',
  crack: '#F59E0B',
  drain: '#3B82F6',
  garbage: '#8B5CF6',
  streetlight: '#10B981',
};

const DEFAULT_COLOR = '#64748B';

function getTypeColor(type) {
  return TYPE_COLORS[type?.toLowerCase()] || DEFAULT_COLOR;
}

/**
 * BBoxOverlay - renders an image with scaled detection bounding boxes.
 *
 * Props:
 *   src          - image URL
 *   alt          - img alt text
 *   detections   - array of { type, confidence, bbox: [x1,y1,x2,y2] }
 *   imageWidth   - original image width in px (from backend)
 *   imageHeight  - original image height in px (from backend)
 *   className    - optional extra classes on the outer container
 */
export default function BBoxOverlay({
  src,
  alt = 'Report photo',
  detections = [],
  imageWidth,
  imageHeight,
  className = '',
}) {
  const containerRef = useRef(null);
  const [scale, setScale] = useState({ x: 1, y: 1 });

  // Recompute scale whenever the container is resized
  const updateScale = useCallback(() => {
    if (!containerRef.current || !imageWidth || !imageHeight) return;
    const { width, height } = containerRef.current.getBoundingClientRect();
    setScale({
      x: width / imageWidth,
      y: height / imageHeight,
    });
  }, [imageWidth, imageHeight]);

  useEffect(() => {
    if (!containerRef.current) return;
    const observer = new ResizeObserver(() => updateScale());
    observer.observe(containerRef.current);
    updateScale();
    return () => observer.disconnect();
  }, [updateScale]);

  const hasBoxes = detections.length > 0 && imageWidth && imageHeight;

  return (
    <div ref={containerRef} className={`relative w-full ${className}`}>
      <img
        src={src}
        alt={alt}
        className="w-full object-contain block"
        onLoad={updateScale}
      />

      {hasBoxes && detections.map((det, idx) => {
        const [x1, y1, x2, y2] = det.bbox || [0, 0, 0, 0];
        const color = getTypeColor(det.type);
        const pct = det.confidence != null
          ? `${Math.round(det.confidence * 100)}%`
          : '';
        const label = [det.type, pct].filter(Boolean).join(' ');

        const left   = x1 * scale.x;
        const top    = y1 * scale.y;
        const width  = (x2 - x1) * scale.x;
        const height = (y2 - y1) * scale.y;

        return (
          <div
            key={idx}
            className="absolute"
            style={{
              left,
              top,
              width,
              height,
              border: `2px solid ${color}`,
              boxSizing: 'border-box',
              pointerEvents: 'none',
            }}
          >
            {/* Label chip above the box */}
            <span
              className="absolute -top-5 left-0 text-[10px] font-semibold px-1.5 py-0.5 leading-none whitespace-nowrap"
              style={{
                backgroundColor: color,
                color: '#fff',
              }}
            >
              {label}
            </span>
          </div>
        );
      })}
    </div>
  );
}
