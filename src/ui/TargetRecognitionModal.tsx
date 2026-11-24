import React, { useEffect } from 'react';

interface TargetRecognitionModalProps {
  onClose: () => void;
}

interface TargetProfile {
  id: string;
  name: string;
  category: string;
  silhouette: string;
  colorClass: string;
  dimensions: string;
  speedKts: string;
  rcsM2: string;
  visualKeys: string[];
  recommendedEffector: string;
  tacticalNotes: string;
}

const TARGET_CATALOGUE: TargetProfile[] = [
  {
    id: 'LOITERING_MUNITION',
    name: 'Loitering Munition / Kamikaze Drone',
    category: 'HOSTILE ATTACK (FIXED-WING)',
    silhouette: 'DELTA-WING / PUSHER-PROP',
    colorClass: 'text-threat border-threat/40',
    dimensions: 'Span: 2.4m | Length: 1.9m',
    speedKts: '60 - 140 kts (High speed)',
    rcsM2: '0.03 - 0.08 m²',
    visualKeys: [
      'Swept delta-wing planform with twin vertical fin winglets',
      'Slender aerodynamic fuselage with spherical nose seeker optic dome',
      'Rear pusher propeller disc with audible high-RPM acoustic whine',
      'Direct or pop-up dive kinetic trajectory toward defended asset',
    ],
    recommendedEffector: 'GUN (35mm AHEAD) or INTERCEPTOR / MISSILE',
    tacticalNotes: 'Kinetic kill required. Often RF-hardened or autonomous; RF softkill is frequently ineffective.',
  },
  {
    id: 'HOSTILE_ISR',
    name: 'Tactical Reconnaissance Quadcopter',
    category: 'HOSTILE ISR (MULTIROTOR)',
    silhouette: '4-ROTOR / UNDER-GIMBAL',
    colorClass: 'text-threat border-threat/40',
    dimensions: 'Span: 0.9m | Length: 0.85m',
    speedKts: '15 - 45 kts (Loiter / Hover)',
    rcsM2: '0.01 - 0.02 m²',
    visualKeys: [
      'Carbon-fiber quad-arm frame with four high-aspect rotors',
      '3-axis underslung optical/thermal surveillance gimbal turret',
      'Elevated omnidirectional antenna mast with active RF telemetry link',
      'Stable hovering or creeping perimeter surveillance patterns',
    ],
    recommendedEffector: 'RF_SOFTKILL (Jamming) or LASER DEW',
    tacticalNotes: 'Susceptible to C2 downlink disruption. Jamming severs real-time ISR video feed.',
  },
  {
    id: 'HOSTILE_ATTACK',
    name: 'FPV Kinetic Attack Quadcopter',
    category: 'HOSTILE ATTACK (FPV MULTIROTOR)',
    silhouette: 'X-FRAME / LOW-PROFILE',
    colorClass: 'text-threat border-threat/40',
    dimensions: 'Span: 0.55m | Length: 0.5m',
    speedKts: '40 - 90 kts (Agile / Erratic)',
    rcsM2: '0.005 - 0.01 m²',
    visualKeys: [
      'Aggressive forward-canted camera bracket for high-pitch flight',
      'Exposed lithium battery pack with underslung shaped payload/warhead',
      'High-kV brushless motors spinning high-pitch twin-blade props',
      'Highly erratic, terrain-hugging high-G terminal dive attack run',
    ],
    recommendedEffector: 'GUN (Airburst) or LASER / NET',
    tacticalNotes: 'Fast-closing direct threat. Requires rapid designation before 500m Point of No Return.',
  },
  {
    id: 'SWARM_ELEMENT',
    name: 'Coordinated Swarm Micro-UAV',
    category: 'HOSTILE SWARM (MICRO-ROTOR)',
    silhouette: 'RING-GUARD / ULTRA-COMPACT',
    colorClass: 'text-threat border-threat/40',
    dimensions: 'Span: 0.38m | Length: 0.38m',
    speedKts: '25 - 60 kts (Coordinated)',
    rcsM2: '0.002 - 0.005 m²',
    visualKeys: [
      'Duct-ring propeller guards for close-proximity swarm flight',
      'Synchronized inter-vehicle mesh-radio beacon antenna',
      'Flocking behavior in V-wedge, line-abreast, or decoy-lead formations',
      'Multiple radar echoes arriving simultaneously in tight clusters',
    ],
    recommendedEffector: 'WIDE-BAND RF_SOFTKILL or RAPID-FIRE GUN',
    tacticalNotes: 'Single kinetic missiles result in poor Cost-Exchange Ratio (CER). Use area softkill.',
  },
  {
    id: 'CIVIL_UAS',
    name: 'Commercial Civilian Quadcopter',
    category: 'NON-COMBATANT (CIVILIAN)',
    silhouette: 'SMOOTH CHASSIS / WHITE HULL',
    colorClass: 'text-phosphor border-phosphor/40',
    dimensions: 'Span: 0.65m | Length: 0.6m',
    speedKts: '10 - 30 kts (Predictable)',
    rcsM2: '0.015 m²',
    visualKeys: [
      'Glossy white aerodynamic consumer plastic shell',
      'Standard red/green FAA/DGCA civilian navigation LEDs under motor pods',
      'Commercial Remote ID broadcast active on standard Wi-Fi/BLE bands',
      'Slow, predictable altitude hold and gentle GPS-assisted turns',
    ],
    recommendedEffector: 'NO WEAPONS RELEASE (ROE PROTECTED)',
    tacticalNotes: 'Strict ROE protection. Kinetic engagement constitutes a severe collateral ROE violation.',
  },
  {
    id: 'FRIENDLY_UAS',
    name: 'Friendly Perimeter Patrol UAV',
    category: 'FRIENDLY FORCES (IFF POSITIVE)',
    silhouette: 'MIL-SPEC QUAD / BLUE IFF',
    colorClass: 'text-friend border-friend/40',
    dimensions: 'Span: 1.1m | Length: 1.0m',
    speedKts: '20 - 50 kts (Patrol Route)',
    rcsM2: '0.02 - 0.03 m²',
    visualKeys: [
      'Matte olive-drab or carbon composite military-grade airframe',
      'Active cryptographic IFF Mode 5 transponder interrogation response',
      'Scheduled friendly patrol corridor with pre-briefed waypoints',
      'Continuous telemetry handshakes with base operations',
    ],
    recommendedEffector: 'DO NOT ENGAGE (FRIENDLY VEHICLE)',
    tacticalNotes: 'Engaging friendly units incurs immediate court-martial evaluation penalties.',
  },
  {
    id: 'BIRD',
    name: 'Biological False Alarm (Avian Contact)',
    category: 'BIOLOGICAL CONTACT (NON-THREAT)',
    silhouette: 'AVIAN WING-FLAP / ORGANIC',
    colorClass: 'text-text-dim border-line',
    dimensions: 'Span: 0.8m - 1.5m',
    speedKts: '12 - 35 kts (Thermal soaring)',
    rcsM2: '0.002 - 0.008 m² (Fluctuating)',
    visualKeys: [
      'Anatomical avian silhouette with swept biological wings',
      'Micro-Doppler wing-beat frequency signature instead of rotor harmonics',
      'Zero RF emissions, no telemetry, no remote ID signals',
      'Circling in thermal updrafts or gradual altitude descent',
    ],
    recommendedEffector: 'IGNORE / MONITOR (NO WEAPON RELEASE)',
    tacticalNotes: 'Weapon release on biologicals wastes high-value ordnance and degrades operator score.',
  },
  {
    id: 'UNKNOWN_AIRFRAME',
    name: 'Unresolved Air-Contact / Radar Return',
    category: 'UNRESOLVED CONTACT (RADAR / OPTICAL DEGRADED)',
    silhouette: 'DIAMOND SYMBOL / LIFTING BODY',
    colorClass: 'text-amber border-amber/40',
    dimensions: 'Indeterminate pending sensor resolution',
    speedKts: 'Observed track speed',
    rcsM2: 'Measured SNR equivalent',
    visualKeys: [
      'Tactical radar diamond reticle with central echo pip and heading stem',
      'Generic streamlined lifting body pod when at boundary of optical resolution',
      'Occurs during long range (>2400m), heavy fog/rain, or terrain masking',
      'Requires sensor slew (EO/IR tracking) or track approach to resolve identity',
    ],
    recommendedEffector: 'CONTINUE SENSING / SLEW EO/IR CAMERA',
    tacticalNotes: 'Do not blind-fire on unresolved contacts without RoE compliance and positive identification.',
  },
];

export const TargetRecognitionModal: React.FC<TargetRecognitionModalProps> = ({ onClose }) => {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' || e.key === 'm' || e.key === 'M') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 bg-carbon-950/90 backdrop-blur-sm flex items-center justify-center p-4 select-none">
      <div className="w-full max-w-4xl max-h-[92vh] bg-carbon-900 border border-amber/60 flex flex-col font-mono text-xs overflow-hidden shadow-2xl">
        {/* Header */}
        <div className="h-[44px] px-4 bg-carbon-950 border-b border-line flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 bg-amber rounded-full animate-pulse" />
            <span className="font-display font-bold text-sm tracking-widest text-amber">
              C-UAS TARGET RECOGNITION GUIDE & THREAT VISUAL TAXONOMY
            </span>
          </div>
          <button
            onClick={onClose}
            className="px-2 py-0.5 border border-line hover:border-threat text-text-dim hover:text-threat font-bold transition-colors"
          >
            [ESC / CLOSE]
          </button>
        </div>

        {/* Subheader Banner */}
        <div className="px-4 py-2 bg-carbon-950/80 border-b border-line flex items-center justify-between text-[11px] text-text-dim">
          <span>TRAINING REFERENCE MANUAL — NON-OPERATIONAL FAMILIARIZATION AID</span>
          <span className="text-phosphor">8 PROCEDURAL 3D AIRFRAME MODELS CONFIGURED</span>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar text-text-main">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {TARGET_CATALOGUE.map((item) => (
              <div
                key={item.id}
                className={`p-3 bg-carbon-950 border ${item.colorClass} flex flex-col justify-between space-y-2`}
              >
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-display font-bold text-xs text-text-main tracking-wider">
                      {item.name}
                    </span>
                    <span className="text-[10px] px-1 border border-line text-text-dim">
                      {item.silhouette}
                    </span>
                  </div>
                  <div className="text-[10px] font-bold tracking-wide uppercase mb-2">
                    {item.category}
                  </div>

                  <div className="grid grid-cols-3 gap-1 text-[10px] text-text-dim py-1 border-t border-b border-line/60 mb-2">
                    <div>{item.dimensions}</div>
                    <div>{item.speedKts}</div>
                    <div>RCS: {item.rcsM2}</div>
                  </div>

                  <div className="space-y-1 mb-2">
                    <div className="text-[9px] uppercase tracking-wider text-text-dim font-bold">
                      Key Visual Recognition Features:
                    </div>
                    {item.visualKeys.map((key, i) => (
                      <div key={i} className="text-[10px] text-text-main/90 flex items-start gap-1">
                        <span className="text-amber">•</span>
                        <span>{key}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="pt-2 border-t border-line/60 space-y-1">
                  <div className="text-[10px]">
                    <span className="text-text-dim">WEAPON: </span>
                    <span className="font-bold text-phosphor">{item.recommendedEffector}</span>
                  </div>
                  <div className="text-[9px] text-text-dim italic">
                    {item.tacticalNotes}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="h-[36px] px-4 bg-carbon-950 border-t border-line flex items-center justify-between text-[11px] text-text-dim">
          <span>OPERATOR NOTICE: In EVALUATION mode, recognition guides and ground-truth hints are locked (Rule F5).</span>
          <button
            onClick={onClose}
            className="px-3 py-1 bg-amber/20 border border-amber text-amber font-bold hover:bg-amber hover:text-carbon-950 transition-colors"
          >
            DISMISS GUIDE [M]
          </button>
        </div>
      </div>
    </div>
  );
};
