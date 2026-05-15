import * as THREE from 'three';

export interface PlateTextureOptions {
  /** Lato fisico del plate in mm (informativo, non scala la texture). */
  size_mm: number;
  /** Numero righe della griglia. Default 7 (Halcon caltab standard). */
  rows?: number;
  /** Numero colonne della griglia. Default 7. */
  cols?: number;
  /** Risoluzione canvas in pixel (lato). Default 1024. */
  canvas_size_px?: number;
}

/**
 * Genera texture Halcon caltab fedele:
 * - Sfondo bianco-avorio
 * - Frame nero perimetrale (proporzionale: thickness = size/32)
 * - Griglia 7×7 di dot neri (spacing = size/8, radius = size/64)
 * - Mark triangolare nell'angolo bottom-left per orientazione asimmetrica
 *
 * Proporzioni standard Halcon (verificate contro CalibObj.descr 18.11).
 */
export function generatePlateTexture(opts: PlateTextureOptions): THREE.CanvasTexture {
  const rows = opts.rows ?? 7;
  const cols = opts.cols ?? 7;
  const px = opts.canvas_size_px ?? 1024;

  const canvas = document.createElement('canvas');
  canvas.width = px;
  canvas.height = px;
  const ctx = canvas.getContext('2d');
  if (!ctx) return new THREE.CanvasTexture(canvas);

  // Background bianco-avorio
  ctx.fillStyle = '#f5f5f0';
  ctx.fillRect(0, 0, px, px);

  // Frame nero perimetrale (thickness = size/32 in proporzione)
  const frameThickPx = px / 32;
  ctx.fillStyle = '#111';
  ctx.fillRect(0, 0, px, frameThickPx);
  ctx.fillRect(0, px - frameThickPx, px, frameThickPx);
  ctx.fillRect(0, 0, frameThickPx, px);
  ctx.fillRect(px - frameThickPx, 0, frameThickPx, px);

  // Griglia di dot (spacing = size/8, radius = size/64)
  const spacingPx = px / 8;
  const dotRadiusPx = px / 64;
  const centerPx = px / 2;

  ctx.fillStyle = '#111';
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const x = centerPx + (c - (cols - 1) / 2) * spacingPx;
      const y = centerPx + (r - (rows - 1) / 2) * spacingPx;
      ctx.beginPath();
      ctx.arc(x, y, dotRadiusPx, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // Mark triangolare nell'angolo bottom-left (asimmetria orientamento Halcon).
  // Halcon convention: p1=(-half, -0.75*half), p2=(-0.75*half, -half), p3=corner(-half, -half).
  // In canvas (Y flippato): (0, 0.875*px), (0.125*px, px), (0, px).
  ctx.beginPath();
  ctx.moveTo(0, 0.875 * px);
  ctx.lineTo(0.125 * px, px);
  ctx.lineTo(0, px);
  ctx.closePath();
  ctx.fillStyle = '#111';
  ctx.fill();

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.needsUpdate = true;
  return texture;
}