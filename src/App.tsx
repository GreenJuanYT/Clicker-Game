/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useCallback } from 'react';
import { MousePointer2, Zap, Rocket, Trophy, Play, Volume2, VolumeX } from 'lucide-react';
import { motion } from 'motion/react';
import { soundService } from './soundService';

interface Upgrade {
  id: string;
  name: string;
  description: string;
  baseCost: number;
  type: 'click' | 'auto';
  value: number;
  icon: React.ReactNode;
}

const UPGRADES: Upgrade[] = [
  {
    id: 'auto-clicker',
    name: 'Auto-Clicker',
    description: 'Generates 1 point every second.',
    baseCost: 15,
    type: 'auto',
    value: 1,
    icon: <Play className="w-5 h-5 text-blue-500" />
  },
  {
    id: 'double-points',
    name: 'Double Points',
    description: 'Doubles your click power.',
    baseCost: 100,
    type: 'click',
    value: 2,
    icon: <Zap className="w-5 h-5 text-yellow-500" />
  },
  {
    id: 'mega-booster',
    name: 'Mega Booster',
    description: 'Fast auto-clicking (+10 CPS).',
    baseCost: 500,
    type: 'auto',
    value: 10,
    icon: <Rocket className="w-5 h-5 text-red-500" />
  }
];

export default function App() {
  const [score, setScore] = useState(0);
  const [clickPower, setClickPower] = useState(1);
  const [cps, setCps] = useState(0);
  const [ownedUpgrades, setOwnedUpgrades] = useState<Record<string, number>>({
    'auto-clicker': 0,
    'double-points': 0,
    'mega-booster': 0,
  });
  const [isSoundOn, setIsSoundOn] = useState(soundService.isEnabled());

  // Calculate score addition on each interval
  useEffect(() => {
    const interval = setInterval(() => {
      setScore(prev => prev + cps);
    }, 1000);
    return () => clearInterval(interval);
  }, [cps]);

  const handleManualClick = useCallback(() => {
    setScore(prev => prev + clickPower);
    soundService.playClick();
  }, [clickPower]);

  const getUpgradeCost = (upgrade: Upgrade) => {
    const count = ownedUpgrades[upgrade.id];
    return Math.floor(upgrade.baseCost * Math.pow(1.15, count));
  };

  const buyUpgrade = (upgrade: Upgrade) => {
    const cost = getUpgradeCost(upgrade);
    if (score >= cost) {
      soundService.playUpgrade();
      setScore(prev => prev - cost);
      setOwnedUpgrades(prev => ({
        ...prev,
        [upgrade.id]: prev[upgrade.id] + 1
      }));

      if (upgrade.type === 'click') {
        setClickPower(prev => prev * upgrade.value);
      } else {
        setCps(prev => prev + upgrade.value);
      }
    } else {
      soundService.playError();
    }
  };

  const toggleSound = () => {
    const newState = soundService.toggle();
    setIsSoundOn(newState);
  };

  return (
    <div className="min-h-screen bg-[#facc15] flex flex-col font-sans select-none overflow-hidden text-black">
      {/* Sound Toggle */}
      <button 
        onClick={toggleSound}
        className="absolute top-4 right-4 z-20 bg-white/50 p-2 rounded-full border-2 border-black/10 hover:bg-white transition-colors"
      >
        {isSoundOn ? <Volume2 size={20} /> : <VolumeX size={20} />}
      </button>

      {/* Header / Score Board */}
      <div className="w-full flex justify-center pt-8 px-6">
        <div className="bg-white rounded-3xl px-10 py-5 shadow-[0_10px_0_0_rgba(0,0,0,0.1)] border-4 border-black max-w-sm w-full text-center">
          <h1 className="text-xs uppercase font-black tracking-widest text-gray-500 mb-1">Total Score</h1>
          <div className="text-5xl font-black text-black tabular-nums font-mono tracking-tighter">
            {Math.floor(score).toLocaleString()}
          </div>
          <div className="text-sm font-bold text-orange-500 mt-1 uppercase">
            +{cps.toLocaleString()} per sec
          </div>
        </div>
      </div>

      {/* Main Game Area */}
      <main className="flex-1 flex flex-col items-center justify-center p-6 -mt-8">
        {/* Big Click Button */}
        <motion.button
          id="main-clicker"
          whileTap={{ scale: 0.95, translateY: 10 }}
          onClick={handleManualClick}
          className="group relative w-64 h-64 rounded-full bg-red-500 border-8 border-black shadow-[0_15px_0_0_rgba(153,27,27,1)] active:shadow-none transition-all cursor-pointer outline-none flex items-center justify-center"
        >
          <span className="text-4xl font-black text-white uppercase transform group-hover:scale-110 transition-transform select-none drop-shadow-[2px_2px_0_rgba(0,0,0,0.5)]">
            Click!
          </span>
          <div className="absolute -top-4 -right-4 bg-white border-4 border-black rounded-full w-16 h-16 flex items-center justify-center font-black text-2xl shadow-lg">
            ⚡
          </div>
        </motion.button>
        
        <p className="mt-8 text-black font-black uppercase text-xs tracking-widest bg-white/30 px-4 py-1 rounded-full border-2 border-black/10">
          Click power: {clickPower}
        </p>
      </main>

      {/* Upgrades Section */}
      <section className="p-6 max-h-[45%] overflow-y-auto w-full max-w-4xl mx-auto pb-12">
        <div className="flex items-center justify-center gap-2 mb-6">
          <div className="h-1 flex-1 bg-black/10 rounded-full" />
          <h3 className="text-xs font-black uppercase tracking-widest text-black/60 px-4">
            Awesome Upgrades
          </h3>
          <div className="h-1 flex-1 bg-black/10 rounded-full" />
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {UPGRADES.map((upgrade) => {
            const cost = getUpgradeCost(upgrade);
            const canAfford = score >= cost;
            const count = ownedUpgrades[upgrade.id];
            
            // Map colors based on upgrade type or ID
            const colorClass = upgrade.id === 'auto-clicker' ? 'bg-blue-500' : 
                               upgrade.id === 'double-points' ? 'bg-purple-500' : 
                               'bg-green-500';
            const lightColorClass = upgrade.id === 'auto-clicker' ? 'bg-blue-100' : 
                                     upgrade.id === 'double-points' ? 'bg-purple-100' : 
                                     'bg-green-100';
            
            return (
              <div
                key={upgrade.id}
                id={`upgrade-${upgrade.id}`}
                onClick={() => buyUpgrade(upgrade)}
                className={`
                  bg-white border-4 border-black rounded-2xl p-5 shadow-[4px_4px_0_0_#000] transition-all cursor-pointer flex flex-col justify-between h-48
                  ${canAfford ? 'opacity-100 translate-y-0 scale-100' : 'opacity-50 grayscale-[0.5]'}
                  active:translate-x-1 active:translate-y-1 active:shadow-none
                `}
              >
                <div className="flex items-start justify-between">
                  <div className={`${lightColorClass} p-2 rounded-lg border-2 border-black`}>
                    {upgrade.icon}
                  </div>
                  <div className="text-right">
                    <h3 className="font-black text-sm uppercase leading-tight">{upgrade.name}</h3>
                    <p className="text-[10px] font-bold text-gray-500 uppercase">
                      x{count}
                    </p>
                  </div>
                </div>
                
                <div className="mt-2 text-[10px] font-bold text-gray-400 line-clamp-2">
                  {upgrade.description}
                </div>

                <div className="mt-4">
                  <div className="text-xs font-black text-black">
                    COST: <span className={canAfford ? 'text-green-600' : 'text-red-500'}>{cost.toLocaleString()}</span>
                  </div>
                  <button className={`w-full mt-2 py-2 ${colorClass} text-white font-black rounded-xl text-xs uppercase border-2 border-black shadow-[2px_2px_0_0_#000] pointer-events-none`}>
                    Upgrade
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}

