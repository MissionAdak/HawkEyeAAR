import React from 'react';
import type { EnvironmentObjectInfo } from '@/render3d/environment/types';

interface EnvironmentInspectorProps {
  objectInfo: EnvironmentObjectInfo | null;
  onClose: () => void;
  onFocus?: () => void;
}

export const EnvironmentInspector: React.FC<EnvironmentInspectorProps> = ({
  objectInfo,
  onClose,
  onFocus,
}) => {
  if (!objectInfo) return null;

  const {
    id,
    name,
    category,
    preset,
    zoneId,
    position,
    heightM,
    elevationM,
    maskingProperties,
    isObstructionEnvelope,
    description,
  } = objectInfo;

  const getCategoryBadgeClass = (cat: string) => {
    switch (cat) {
      case 'RADAR_INSTALLATION':
      case 'PROTECTED_FACILITY':
        return 'border-phosphor text-phosphor bg-phosphorDim/20';
      case 'TOWER':
      case 'BUILDING':
      case 'AIRFIELD':
        return 'border-amber text-amber bg-amber/10';
      case 'VEGETATION':
        return 'border-friend text-friend bg-friend/10';
      case 'TERRAIN_ZONE':
      case 'RIDGE':
        return 'border-text-dim text-text-dim bg-carbon-800';
      default:
        return 'border-line text-text-dim bg-carbon-800';
    }
  };

  return (
    <div
      data-testid="environment-inspector-panel"
      className="absolute top-10 left-2 z-20 w-[280px] bg-carbon-900/95 border border-line p-3 font-mono text-[11px] text-text-main shadow-xl backdrop-blur-sm select-none"
    >
      {/* Header */}
      <div className="flex items-center justify-between pb-1.5 border-b border-line mb-2">
        <div className="flex items-center gap-1.5 truncate">
          <span className="font-display font-bold text-xs text-text-main truncate">
            {name}
          </span>
        </div>
        <div className="flex items-center gap-1">
          {onFocus && (
            <button
              onClick={onFocus}
              className="px-1.5 py-0.5 text-[9px] border border-line hover:border-friend text-text-dim hover:text-friend transition-colors font-bold"
              title="Focus 3D Camera on this object (F)"
            >
              [F] FOCUS
            </button>
          )}
          <button
            onClick={onClose}
            className="text-text-dim hover:text-text-main font-bold px-1"
            title="Close Inspector"
          >
            ✕
          </button>
        </div>
      </div>

      {/* Badges Strip */}
      <div className="flex items-center gap-1.5 flex-wrap mb-2">
        <span
          className={`px-1.5 py-0.5 border text-[9px] font-bold tracking-wider ${getCategoryBadgeClass(
            category
          )}`}
        >
          {category.replace('_', ' ')}
        </span>
        <span className="px-1.5 py-0.5 border border-line bg-carbon-800 text-[9px] text-text-dim">
          {preset.replace('_', ' ')}
        </span>
        {isObstructionEnvelope && (
          <span className="px-1.5 py-0.5 border border-amber text-amber bg-amber/10 text-[9px] font-bold">
            MASKING ENVELOPE
          </span>
        )}
      </div>

      {/* Metadata Grid */}
      <div className="space-y-1 text-[10px] bg-carbon-950 p-2 border border-line mb-2">
        <div className="flex justify-between">
          <span className="text-text-dim">OBJECT ID:</span>
          <span className="font-bold text-text-main">{id}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-text-dim">COORDINATES:</span>
          <span className="font-bold text-text-main">
            {Math.round(position.x)}m E, {Math.round(position.y)}m N
          </span>
        </div>
        <div className="flex justify-between">
          <span className="text-text-dim">HEIGHT / ALT:</span>
          <span className="font-bold text-phosphor">
            {Math.round(heightM)}m {elevationM ? `(Elev: ${Math.round(elevationM)}m)` : ''}
          </span>
        </div>
        {zoneId && (
          <div className="flex justify-between">
            <span className="text-text-dim">ZONE REFERENCE:</span>
            <span className="font-bold text-amber">{zoneId}</span>
          </div>
        )}
        {maskingProperties && (
          <>
            <div className="flex justify-between">
              <span className="text-text-dim">MASK SHADOW:</span>
              <span className="font-bold text-amber">{maskingProperties.shadowM}m</span>
            </div>
            <div className="flex justify-between">
              <span className="text-text-dim">ATTENUATION RHO:</span>
              <span className="font-bold text-amber">{maskingProperties.rho}</span>
            </div>
          </>
        )}
      </div>

      {/* Description */}
      {description && (
        <p className="text-[10px] text-text-dim leading-relaxed italic border-t border-line/50 pt-1.5">
          {description}
        </p>
      )}
    </div>
  );
};
