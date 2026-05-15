import type { ABBPose } from '../models/domain.model';

/**
 * Parsa un blocco di codice RAPID contenente dichiarazioni robtarget
 * ed estrae un array di ABBPose.
 *
 * Formato target:
 * VAR robtarget nome:=[[X,Y,Z],[q1,q2,q3,q4],[conf],[ext]];
 */
export function parseAbbRapidTargets(rapidCode: string): ABBPose[] {
  // Cerca pattern: [[X,Y,Z],[q1,q2,q3,q4]
  const regex = /\[\s*\[\s*([-\d\.eE+]+)\s*,\s*([-\d\.eE+]+)\s*,\s*([-\d\.eE+]+)\s*\]\s*,\s*\[\s*([-\d\.eE+]+)\s*,\s*([-\d\.eE+]+)\s*,\s*([-\d\.eE+]+)\s*,\s*([-\d\.eE+]+)\s*\]/g;
  
  const poses: ABBPose[] = [];
  let match;

  while ((match = regex.exec(rapidCode)) !== null) {
    poses.push({
      type: 'ABB',
      trans: [
        parseFloat(match[1]),
        parseFloat(match[2]),
        parseFloat(match[3]),
      ],
      rot: [
        parseFloat(match[4]), // q1 = w
        parseFloat(match[5]), // q2 = x
        parseFloat(match[6]), // q3 = y
        parseFloat(match[7]), // q4 = z
      ],
    });
  }

  return poses;
}