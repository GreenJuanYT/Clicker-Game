/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { MousePointer2, Zap, Rocket, Trophy, Play, Volume2, VolumeX, Save, Award, RotateCcw, Star, CheckCircle2, Settings, Trash2, X, Target, Cpu, Layers, RefreshCw } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { soundService } from './soundService';

type Rarity = 'Common' | 'Rare' | 'Epic' | 'Legendary' | 'Unique';
type UpgradeCategory = 'Clicking' | 'Automation' | 'Special';

interface Upgrade {
  id: string;
  name: string;
  description: string;
  baseCost: number;
  type: 'click' | 'auto';
  value: number;
  icon: React.ReactNode;
  maxCount?: number;
  cooldownSecs?: number;
  rarity: Rarity;
  category: UpgradeCategory;
}


interface Achievement {
  id: string;
  title: string;
  description: string;
  requirement: (stats: GameStats) => boolean;
  icon: React.ReactNode;
}

interface GameStats {
  score: number;
  totalScore: number;
  clickPower: number;
  cps: number;
  ownedUpgrades: Record<string, number>;
  prestigePoints: number;
  prestigeCount: number;
  ownedPrestigeUpgrades: Record<string, number>;
  unlockedAchievements: string[];
}

interface PrestigeUpgrade {
  id: string;
  name: string;
  description: string;
  cost: number;
  icon: React.ReactNode;
}

const PRESTIGE_UPGRADES: PrestigeUpgrade[] = [
  { id: 'ancestral-click', name: 'Ancestral Click', description: 'Permanently increases base click power by +5.', cost: 1, icon: <MousePointer2 className="w-5 h-5 text-indigo-500" /> },
  { id: 'shard-mastery', name: 'Shard Mastery', description: 'Increase the bonus of every Prestige Shard to +15% (from 10%).', cost: 5, icon: <Star className="w-5 h-5 text-amber-500" /> },
  { id: 'auto-synthesis', name: 'Auto-Synthesis', description: 'All auto-production is permanently increased by x2.', cost: 15, icon: <Zap className="w-5 h-5 text-red-500" /> },
  { id: 'infinite-momentum', name: 'Infinite Momentum', description: 'Combo decay speed is reduced by 50%.', cost: 30, icon: <Play className="w-5 h-5 text-cyan-400 rotate-90" /> },
  { id: 'critical-overdrive', name: 'Critical Overdrive', description: 'Critical hits now deal 25x damage (up from 10x).', cost: 50, icon: <Target className="w-5 h-5 text-rose-600" /> },
  { id: 'quantum-procurement', name: 'Quantum Procurement', description: 'Shop upgrade prices scale much slower.', cost: 75, icon: <Layers className="w-5 h-5 text-indigo-400" /> },
  { id: 'shard-multiplier-boost', name: 'Shard Multiplier Boost', description: 'Increases shard bonus by another +5% (total +20% if Shard Mastery is owned).', cost: 100, icon: <Star className="w-5 h-5 text-yellow-400 fill-yellow-200" /> },
  { id: 'auto-efficiency', name: 'Auto-Efficiency', description: 'Increases Auto-Clicker and Auto-Synthesizer production by 50%.', cost: 50, icon: <Zap className="w-5 h-5 text-blue-500" /> },
  { id: 'lucky-click', name: 'Lucky Click', description: '5% chance to gain 10x points on a manual click.', cost: 75, icon: <Target className="w-5 h-5 text-rose-500" /> },
  { id: 'deep-combo', name: 'Deep Combo', description: 'Increase maximum combo multiplier by 2x.', cost: 120, icon: <Layers className="w-5 h-5 text-indigo-500" /> },
  { id: 'chrono-anchor', name: 'Chrono Anchor', description: 'Auto-save interval reduced by 50%.', cost: 150, icon: <RotateCcw className="w-5 h-5 text-slate-500" /> },
  { id: 'point-magnet', name: 'Point Magnet', description: '10% chance for clicks to grant 2x points.', cost: 200, icon: <Target className="w-5 h-5 text-blue-500" /> },
  { id: 'multiplier-overflow', name: 'Multiplier Overflow', description: 'Increases combo multiplier cap by 1x.', cost: 300, icon: <Layers className="w-5 h-5 text-purple-600" /> },
  { id: 'shard-reflex', name: 'Shard Reflex', description: 'Flat +20% shard gain.', cost: 400, icon: <Star className="w-5 h-5 text-amber-500" /> },
  { id: 'prestige-paragon', name: 'Prestige Paragon', description: 'Decrease prestige threshold requirement by 20%.', cost: 500, icon: <Trophy className="w-5 h-5 text-amber-500" /> }
];

const INITIAL_PRESTIGE_THRESHOLD = 100000;

const UPGRADES: Upgrade[] = [
  // Clicking
  { id: 'double-points', name: 'Power Tap', description: 'Adds +1 to click power.', baseCost: 25, type: 'click', value: 1, icon: <Zap className="w-5 h-5 text-yellow-500" />, rarity: 'Common', category: 'Clicking' },
  { id: 'double-points-t2', name: 'Kinetic Tap', description: 'Enhanced energy transfer (+5 Click Power).', baseCost: 1000, type: 'click', value: 5, icon: <Zap className="w-5 h-5 text-yellow-400" />, rarity: 'Rare', category: 'Clicking' },
  { id: 'double-points-t3', name: 'Neural Tap', description: 'Deep link synchronization (+25 Click Power).', baseCost: 30000, type: 'click', value: 25, icon: <Zap className="w-5 h-5 text-orange-500" />, rarity: 'Epic', category: 'Clicking' },
  { id: 'double-points-t4', name: 'Cosmic Tap', description: 'Harness the power of the stars (+125 Click Power).', baseCost: 1000000, type: 'click', value: 125, icon: <Star className="w-5 h-5 text-purple-600" />, rarity: 'Legendary', category: 'Clicking' },
  { id: 'mega-clicker', name: 'Mega Clicker', description: 'Increases base click power by a massive +100.', baseCost: 1000000, type: 'click', value: 100, icon: <Rocket className="w-5 h-5 text-indigo-600" />, rarity: 'Epic', category: 'Clicking' },
  { id: 'precision-calibration', name: 'Precision Calibration', description: '10% chance for massive 15x Crit on clicks.', baseCost: 75000, type: 'click', value: 0.10, icon: <Target className="w-5 h-5 text-emerald-500" />, rarity: 'Rare', category: 'Clicking' },
  { id: 'explosion-clicks', name: 'Explosion Clicks', description: 'Manual clicks temporarily grant massive power.', baseCost: 500000, type: 'click', value: 1000, icon: <Rocket className="w-5 h-5 text-red-500" />, rarity: 'Unique', category: 'Clicking' },
  
  // Automation
  { id: 'auto-clicker', name: 'Auto-Clicker', description: 'Generates 1 point every second.', baseCost: 50, type: 'auto', value: 1, icon: <Play className="w-5 h-5 text-blue-500" />, rarity: 'Common', category: 'Automation' },
  { id: 'auto-clicker-t2', name: 'Turbo Clicker', description: 'A more efficient automated pulse (+5 CPS).', baseCost: 2000, type: 'auto', value: 5, icon: <Zap className="w-5 h-5 text-blue-400" />, rarity: 'Rare', category: 'Automation' },
  { id: 'auto-clicker-t3', name: 'Fusion Clicker', description: 'Atomic-level automation (+25 CPS).', baseCost: 60000, type: 'auto', value: 25, icon: <Zap className="w-5 h-5 text-blue-600" />, rarity: 'Epic', category: 'Automation' },
  { id: 'auto-clicker-t4', name: 'Quantum Clicker', description: 'Sub-atomic production loops (+125 CPS).', baseCost: 2000000, type: 'auto', value: 125, icon: <Zap className="w-5 h-5 text-indigo-500" />, rarity: 'Legendary', category: 'Automation' },
  { id: 'advanced-auto-clicker', name: 'Advanced Auto-Clicker', description: 'Doubles the CPS of your base Auto-Clickers.', baseCost: 7500, type: 'auto', value: 2, icon: <Play className="w-5 h-5 text-indigo-400" />, rarity: 'Rare', category: 'Automation' },
  { id: 'auto-synthesizer-pro', name: 'Auto-Synthesizer Pro', description: 'Generates points based on total clicks.', baseCost: 100000, type: 'auto', value: 0.1, icon: <Layers className="w-5 h-5 text-purple-500" />, rarity: 'Epic', category: 'Automation' },
  { id: 'atomic-synthesis', name: 'Atomic Synthesis', description: 'Advanced production technique.', baseCost: 5000000, type: 'auto', value: 1000, icon: <Cpu className="w-5 h-5 text-cyan-600" />, rarity: 'Unique', category: 'Automation' },

  // Special
  { id: 'shard-resonator', name: 'Shard Resonator', description: 'Increases shard gain! Each 100k points grants +0.1 shards.', baseCost: 100000, type: 'auto', value: 0.1, icon: <Star className="w-5 h-5 text-amber-500" />, rarity: 'Rare', category: 'Special', maxCount: 1 },
  { id: 'entropy-engine', name: 'Entropy Engine', description: 'Periodically taps into cosmic energy for a random boost.', baseCost: 500000, type: 'auto', value: 0, icon: <Cpu className="w-5 h-5 text-red-500" />, rarity: 'Epic', category: 'Special', maxCount: 1 },
  { id: 'point-vacuum', name: 'Point Vacuum', description: 'When idle for 5s, gain a 1.5x CPS boost.', baseCost: 250000, type: 'auto', value: 0, icon: <Target className="w-5 h-5 text-purple-500" />, rarity: 'Rare', category: 'Special', maxCount: 1 },
  { id: 'point-glitch', name: 'Point Glitch', description: 'Every 10th click gives 100x points.', baseCost: 50000, type: 'click', value: 0, icon: <Cpu className="w-5 h-5 text-green-500" />, rarity: 'Rare', category: 'Special', maxCount: 1 },
  { id: 'combo-catalyst', name: 'Combo Catalyst', description: 'Increases combo multiplier by +0.5, but max combo is halved.', baseCost: 200000, type: 'click', value: 0.5, icon: <Zap className="w-5 h-5 text-orange-500" />, rarity: 'Rare', category: 'Special', maxCount: 1 },
  { id: 'idle-master', name: 'Idle Master', description: 'If you do not click for 10s, auto-production doubles.', baseCost: 500000, type: 'auto', value: 0, icon: <Play className="w-5 h-5 text-cyan-500" />, rarity: 'Epic', category: 'Special', maxCount: 1 },
  { id: 'click-battery', name: 'Click Battery', description: 'Every manual click adds +1 to battery, powers auto-prod.', baseCost: 800000, type: 'click', value: 0, icon: <Zap className="w-5 h-5 text-indigo-700" />, rarity: 'Epic', category: 'Special', maxCount: 1 },
  { id: 'shard-harvester', name: 'Shard Harvester', description: 'Increases shard gen by +0.01 per 1m points.', baseCost: 1000000, type: 'auto', value: 0.01, icon: <Star className="w-5 h-5 text-amber-700" />, rarity: 'Epic', category: 'Special', maxCount: 1 },
  { id: 'time-dilator', name: 'Time Dilator', description: 'All auto-production speeds up over time.', baseCost: 2500000, type: 'auto', value: 0, icon: <RefreshCw className="w-5 h-5 text-slate-600" />, rarity: 'Legendary', category: 'Special', maxCount: 1 },
  { id: 'prestige-booster', name: 'Prestige Booster', description: 'Increases prestige shard yield by +10%.', baseCost: 5000000, type: 'auto', value: 0.1, icon: <Trophy className="w-5 h-5 text-amber-600" />, rarity: 'Legendary', category: 'Special', maxCount: 1 },
  { id: 'market-crash', name: 'Market Crash', description: 'Reduce cost of all upgrades by 50% for 30s.', baseCost: 10000000, type: 'click', value: 0, icon: <Trash2 className="w-5 h-5 text-red-500" />, rarity: 'Legendary', cooldownSecs: 300, category: 'Special', maxCount: 1 },
  { id: 'click-echo', name: 'Click Echo', description: 'Every manual click triggers a free auto-clicker pulse.', baseCost: 20000000, type: 'click', value: 1, icon: <Volume2 className="w-5 h-5 text-blue-400" />, rarity: 'Legendary', category: 'Special', maxCount: 1 },
  { id: 'prestige-synergy', name: 'Soul Catalyst', description: 'Adds +1.0 CPS for every Prestige Point owned.', baseCost: 5000, type: 'auto', value: 1.0, icon: <Star className="w-5 h-5 text-amber-500" />, rarity: 'Rare', category: 'Special', maxCount: 1 },
  { id: 'combo-multiplier', name: 'Combo Multiplier', description: 'Enables the combo system. While active, production is x3.', baseCost: 7500, type: 'click', value: 1, icon: <Cpu className="w-5 h-5 text-cyan-500" />, rarity: 'Rare', category: 'Special', maxCount: 1 },
  { id: 'combo-upgrader', name: 'Combo Upgrader', description: 'Unlocks the 3x combo tier (requires 100 combo points).', baseCost: 750000, type: 'click', value: 1, icon: <Cpu className="w-5 h-5 text-indigo-500" />, rarity: 'Epic', category: 'Special', maxCount: 1 },
  { id: 'combo-master', name: 'Combo Master', description: 'Unlocks the 5x combo tier (requires 400 combo points).', baseCost: 7500000, type: 'click', value: 1, icon: <Cpu className="w-5 h-5 text-rose-500" />, rarity: 'Epic', category: 'Special', maxCount: 1 },
  { id: 'combo-overdrive', name: 'Combo Overdrive', description: 'Unlocks the 10x combo tier (requires 800 combo points).', baseCost: 50000000, type: 'click', value: 1, icon: <Zap className="w-5 h-5 text-red-600" />, rarity: 'Legendary', category: 'Special', maxCount: 1 },
  { id: 'bulk-procurement', name: 'Bulk Procurement', description: 'Reduces all upgrade costs by 15% per level.', baseCost: 350000, type: 'click', value: 0.15, icon: <Layers className="w-5 h-5 text-slate-500" />, rarity: 'Epic', maxCount: 1, category: 'Special' },
  { id: 'minesweeper', name: 'Minesweeper', description: 'A game of chance! Gain huge points if you avoid mines (10% chance to lose score).', baseCost: 100000, type: 'click', value: 0, icon: <Target className="w-5 h-5 text-slate-600" />, rarity: 'Unique', category: 'Special', maxCount: 1 }
];

const ACHIEVEMENTS: Achievement[] = [
  { id: 'starter', title: 'Humble Beginnings', description: 'Reach 1,000 total points.', requirement: (stats) => stats.totalScore >= 1000, icon: <Star className="w-5 h-5 text-yellow-400" /> },
  { id: 'millionaire', title: 'The Millionaire', description: 'Reach 1,000,000 total points.', requirement: (stats) => stats.totalScore >= 1000000, icon: <Trophy className="w-5 h-5 text-amber-500" /> },
  { id: 'billionaire', title: 'Galactic Mogul', description: 'Reach 1,000,000,000 total points.', requirement: (stats) => stats.totalScore >= 1000000000, icon: <Rocket className="w-5 h-5 text-indigo-600" /> },
  { id: 'upgrade-addict', title: 'Upgrade Addict', description: 'Buy 100 total upgrades.', requirement: (stats) => Object.values(stats.ownedUpgrades).reduce((a, b) => a + b, 0) >= 100, icon: <Zap className="w-5 h-5 text-purple-500" /> },
  { id: 'cps-god', title: 'Automatic Overlord', description: 'Reach 1,000 Points Per Second.', requirement: (stats) => stats.cps >= 1000, icon: <Rocket className="w-5 h-5 text-red-500" /> },
  { id: 'combo-king', title: 'Momentum Master', description: 'Reach a combo of 400.', requirement: (stats) => (stats as any).combo >= 400, icon: <Zap className="w-5 h-5 text-cyan-400" /> },
  { id: 'prestige-first', title: 'Ascension', description: 'Prestige for the first time.', requirement: (stats) => stats.prestigePoints > 0, icon: <RotateCcw className="w-5 h-5 text-amber-600" /> },
  { id: 'crit-lucky', title: 'Perfect Alignment', description: 'Unlock Precision Calibration.', requirement: (stats) => stats.ownedUpgrades['precision-calibration'] > 0, icon: <Target className="w-5 h-5 text-emerald-500" /> },
  { id: 'click-marathon', title: 'Finger of Fury', description: 'Click the button 5,000 times.', requirement: (stats) => (stats as any).totalClicks >= 5000, icon: <MousePointer2 className="w-5 h-5 text-pink-500" /> },
  { id: 'the-collector', title: 'The Collector', description: 'Own at least 1 of every building/upgrade.', requirement: (stats) => Object.values(stats.ownedUpgrades).every(count => count > 0), icon: <Layers className="w-5 h-5 text-indigo-400" /> },
  { id: 'max-prestige', title: 'Godlike status', description: 'Reach 50 Prestige Points.', requirement: (stats) => stats.prestigePoints >= 50, icon: <Trophy className="w-5 h-5 text-yellow-600" /> }
];

const calculateBaseCPS = (ownedUpgrades: Record<string, number>, prestigePoints: number, ownedPrestigeUpgrades: Record<string, number>) => {
    let total = 0;
    const autoClickerBonus = ownedUpgrades['advanced-auto-clicker'] ? 2 : 1;
    total += (ownedUpgrades['auto-clicker'] || 0) * 1 * autoClickerBonus;
    total += (ownedUpgrades['auto-clicker-t2'] || 0) * 5;
    total += (ownedUpgrades['auto-clicker-t3'] || 0) * 25;
    total += (ownedUpgrades['auto-clicker-t4'] || 0) * 125;
    if (ownedUpgrades['prestige-synergy']) {
      total += ownedUpgrades['prestige-synergy'] * prestigePoints * 1.0;
    }
    if (ownedPrestigeUpgrades['auto-efficiency']) {
      total *= 1.5;
    }
    if (ownedUpgrades['point-vacuum'] > 0) {
        total *= 1.5;
    }
    return total;
};

// ... inside App component ...
export default function App() {

  const [score, setScore] = useState(0);
  const [totalScore, setTotalScore] = useState(0);
  const [ownedUpgrades, setOwnedUpgrades] = useState<Record<string, number>>({});
  const [prestigePoints, setPrestigePoints] = useState(0);
  const [prestigeCount, setPrestigeCount] = useState(0);
  const [ownedPrestigeUpgrades, setOwnedPrestigeUpgrades] = useState<Record<string, number>>({});
  const [unlockedAchievements, setUnlockedAchievements] = useState<string[]>([]);
  const [totalClicks, setTotalClicks] = useState(0);
  const [wheelTickets, setWheelTickets] = useState(0);
  const [ticketsBought, setTicketsBought] = useState(0);
  const [combo, setCombo] = useState(0);
  const [lastClickTime, setLastClickTime] = useState(0);
  const [lastPurchaseTimes, setLastPurchaseTimes] = useState<Record<string, number>>({});
  const [prestigeEffect, setPrestigeEffect] = useState(false);
  const [shardParticles, setShardParticles] = useState<{ id: number; x: number; y: number }[]>([]);
  const [isSpinning, setIsSpinning] = useState(false);
  const [wheelRotation, setWheelRotation] = useState(0);
  const [isSoundOn, setIsSoundOn] = useState(true);
  const [isLuckyWheelOpen, setIsLuckyWheelOpen] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [newAchievements, setNewAchievements] = useState<string[]>([]);
  const [activeTab, setActiveTab] = useState<'upgrades' | 'achievements' | 'prestige' | 'settings'>('upgrades');
  const [offlineEarned, setOfflineEarned] = useState<{ points: number } | null>(null);
  const [currentTime, setCurrentTime] = useState(Date.now());
  const [tempMultiplier, setTempMultiplier] = useState(1);
  const [tempMultiplierEnd, setTempMultiplierEnd] = useState(0);

  const comboMultiplier = useMemo(() => {
    if (combo >= 800) return 10;
    if (combo >= 400) return 5;
    if (combo >= 100) return 3;
    if (combo > 0) return 2;
    return 1;
  }, [combo]);

  const isComboActive = useMemo(() => combo > 0, [combo]);

  const shardMultiplier = useMemo(() => 1 + (prestigePoints * 0.1), [prestigePoints]);
  
  const currentPrestigeThreshold = useMemo(() => INITIAL_PRESTIGE_THRESHOLD * Math.pow(1.5, prestigeCount), [prestigeCount]);

  const formatNumber = (num: number): string => {
    if (num >= 1e9) return (num / 1e9).toFixed(1) + 'B';
    if (num >= 1e6) return (num / 1e6).toFixed(1) + 'M';
    if (num >= 1e3) return (num / 1e3).toFixed(1) + 'k';
    return Math.floor(num).toLocaleString();
  };

  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const [critFlash, setCritFlash] = useState(false); // NEW
  const [particles, setParticles] = useState<{ id: number; x: number; y: number; value: string; color?: string; size?: string }[]>([]);

  const activeTempMult = useMemo(() => {
    return Date.now() < tempMultiplierEnd ? tempMultiplier : 1;
  }, [tempMultiplier, tempMultiplierEnd, currentTime]);

  const autoSynthesisMultiplier = useMemo(() => ownedPrestigeUpgrades['auto-synthesis'] ? 2 : 1, [ownedPrestigeUpgrades]);

  // Derived stats
  const clickPower = useMemo(() => {
    let power = 1;
    if (ownedPrestigeUpgrades['ancestral-click']) {
      power += 5;
    }
    power += (ownedUpgrades['mega-clicker'] || 0) * 100;
    power += (ownedUpgrades['double-points'] || 0) * 1;
    power += (ownedUpgrades['double-points-t2'] || 0) * 5;
    power += (ownedUpgrades['double-points-t3'] || 0) * 25;
    power += (ownedUpgrades['double-points-t4'] || 0) * 125;
    return power * comboMultiplier;
  }, [ownedUpgrades, comboMultiplier, ownedPrestigeUpgrades]);

  const cps = useMemo(() => {
    const total = calculateBaseCPS(ownedUpgrades, prestigePoints, ownedPrestigeUpgrades);
    return total * comboMultiplier * autoSynthesisMultiplier * activeTempMult;
  }, [ownedUpgrades, prestigePoints, comboMultiplier, autoSynthesisMultiplier, activeTempMult, currentTime, lastClickTime, ownedPrestigeUpgrades]);

  const globalMultiplier = useMemo(() => shardMultiplier * activeTempMult, [shardMultiplier, activeTempMult]);

  // Load game
  useEffect(() => {
    const saved = localStorage.getItem('clicker_quest_save');
    if (saved) {
      try {
        const data = JSON.parse(saved);
        setScore(data.score || 0);
        setTotalScore(data.totalScore || 0);
        
        // Merge saved upgrades with all possible upgrades to ensure 0 for new ones
        const baseUpgrades = UPGRADES.reduce((acc, curr) => ({ ...acc, [curr.id]: 0 }), {});
        setOwnedUpgrades({ ...baseUpgrades, ...(data.ownedUpgrades || {}) });

        setPrestigePoints(data.prestigePoints || 0);
        setPrestigeCount(data.prestigeCount || 0);
        setOwnedPrestigeUpgrades(data.ownedPrestigeUpgrades || {});
        setUnlockedAchievements(data.unlockedAchievements || []);
        setTotalClicks(data.totalClicks || 0);
        setWheelTickets(data.wheelTickets || 0);
        setTicketsBought(data.ticketsBought || 0);

        // Offline calculation
        if (data.lastSaveTime) {
          const offlineTime = (Date.now() - data.lastSaveTime) / 1000;
          const cpsEst = calculateBaseCPS(data.ownedUpgrades || {}, data.prestigePoints || 0, data.ownedPrestigeUpgrades || {});
          const pointsEarned = Math.floor(offlineTime * cpsEst);
          
          if (pointsEarned > 0) {
            setOfflineEarned({ points: pointsEarned });
            setScore(prev => prev + pointsEarned);
            setTotalScore(prev => prev + pointsEarned);
          }
        }
      } catch (e) {
        console.error("Failed to load save", e);
      }
    }
  }, []);

  // Clear new achievements when viewing them
  useEffect(() => {
    if (activeTab === 'achievements') {
      const timer = setTimeout(() => setNewAchievements([]), 3000);
      return () => clearTimeout(timer);
    }
  }, [activeTab]);

  // Auto-save every 30 seconds (or 15 if Chrono Anchor is owned)
  useEffect(() => {
    const interval = setInterval(saveGameSilent, ownedPrestigeUpgrades['chrono-anchor'] ? 15000 : 30000);
    return () => clearInterval(interval);
  }, [score, totalScore, ownedUpgrades, prestigePoints, unlockedAchievements, ownedPrestigeUpgrades]);

  // Entropy Engine: Periodic random reward
  useEffect(() => {
    if (ownedUpgrades['entropy-engine'] > 0) {
      const interval = setInterval(() => {
        if (Math.random() < 0.1) { // 10% chance every second
          setScore(prev => prev + (cps * 5 * ownedUpgrades['entropy-engine']));
        }
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [ownedUpgrades['entropy-engine'], cps]);

  const saveGameSilent = () => {
    const data = { 
      score, 
      totalScore, 
      ownedUpgrades, 
      prestigePoints, 
      prestigeCount, 
      ownedPrestigeUpgrades, 
      unlockedAchievements, 
      totalClicks,
      wheelTickets,
      ticketsBought,
      lastSaveTime: Date.now()
    };
    localStorage.setItem('clicker_quest_save', JSON.stringify(data));
  };

  // Combo decay logic
  useEffect(() => {
    const interval = setInterval(() => {
      const now = Date.now();
      setCurrentTime(now); // Update current time for cooldown display
      if (now - lastClickTime > 3000) {
        const decayAmount = ownedPrestigeUpgrades['infinite-momentum'] ? 2 : 5;
        setCombo(prev => Math.max(0, prev - decayAmount));
      }
    }, 100);
    return () => clearInterval(interval);
  }, [lastClickTime]);

  const handleManualSave = () => {
    saveGameSilent();
    setSaveMessage("Game Saved Successfully!");
    soundService.playUpgrade();
    setTimeout(() => setSaveMessage(null), 3000);
  };

  const handleDeleteProgress = () => {
    localStorage.removeItem('clicker_quest_save');
    window.location.reload();
  };

  // Achievement checking
  useEffect(() => {
    const currentStats: GameStats & { combo: number; totalClicks: number } = { 
      score, 
      totalScore, 
      clickPower, 
      cps, 
      ownedUpgrades, 
      prestigePoints, 
      prestigeCount,
      ownedPrestigeUpgrades,
      unlockedAchievements,
      combo,
      totalClicks
    };
    const newlyUnlocked: string[] = [];

    ACHIEVEMENTS.forEach(ach => {
      if (!unlockedAchievements.includes(ach.id) && ach.requirement(currentStats as any)) {
        newlyUnlocked.push(ach.id);
      }
    });

    if (newlyUnlocked.length > 0) {
      setUnlockedAchievements(prev => [...prev, ...newlyUnlocked]);
      setNewAchievements(prev => [...prev, ...newlyUnlocked]);
      soundService.playUpgrade();
    }
  }, [score, totalScore, ownedUpgrades, cps, unlockedAchievements, prestigePoints, prestigeCount, ownedPrestigeUpgrades]);

  // Calculate score addition on each interval
  useEffect(() => {
    const interval = setInterval(() => {
      const added = cps * globalMultiplier;
      setScore(prev => prev + added);
      setTotalScore(prev => prev + added);
    }, 1000);
    return () => clearInterval(interval);
  }, [cps, globalMultiplier]);

  const handleManualClick = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    let baseAddedValue = clickPower * globalMultiplier;
    let isCrit = false;
    
    // Precision Calibration: Chance for 10x or 25x Crit
    const critLevel = ownedUpgrades['precision-calibration'] || 0;
    if (critLevel > 0 && Math.random() < critLevel * 0.05) {
      const critMultiplier = ownedPrestigeUpgrades['critical-overdrive'] ? 25 : 10;
      baseAddedValue *= critMultiplier;
      isCrit = true;
    }

    // Point Magnet: 10% chance for clicks to grant 2x points
    if (ownedPrestigeUpgrades['point-magnet'] && Math.random() < 0.1) {
        baseAddedValue *= 2;
        isCrit = true;
    }

    // Minesweeper
    if (ownedUpgrades['minesweeper'] > 0) {
        if (Math.random() < 0.1) {
            baseAddedValue = Math.floor(baseAddedValue * -5);
        } else {
            baseAddedValue *= 3;
        }
    }
    
    // Explosion Clicks
    if (ownedUpgrades['explosion-clicks'] > 0) {
         if(Math.random() < 0.05) {                
             setTempMultiplier(5);
             setTempMultiplierEnd(Date.now() + 5000); // 5 sec boost
         }
    }

    setScore(prev => Math.max(0, prev + baseAddedValue));
    setTotalScore(prev => prev + Math.max(0, baseAddedValue));
    setTotalClicks(prev => prev + 1);
    soundService.playClick();
    if (isCrit) {
      soundService.playCritSound();
      setCritFlash(true);
      setTimeout(() => setCritFlash(false), 200);
    }

    // Combo logic: Max combo depends on unlocked tiers
    if (ownedUpgrades['combo-multiplier'] > 0) {
      let maxComboPossible = 100;
      if (ownedUpgrades['combo-overdrive'] > 0) maxComboPossible = 1000;
      else if (ownedUpgrades['combo-master'] > 0) maxComboPossible = 800;
      else if (ownedUpgrades['combo-upgrader'] > 0) maxComboPossible = 400;

      setCombo(prev => Math.min(maxComboPossible, prev + 5));
      setLastClickTime(Date.now());
    }

    // Create floating particle at click position
    const id = Date.now();
    // Support both mouse and touch events
    const clientX = 'clientX' in e ? e.clientX : (e as any).touches[0].clientX;
    const clientY = 'clientY' in e ? e.clientY : (e as any).touches[0].clientY;

    setParticles(prev => [...prev.slice(-10), { 
      id, 
      x: clientX + (Math.random() * 40 - 20), 
      y: clientY - 40, 
      value: `${isCrit ? 'CRIT! ' : ''}+${baseAddedValue.toFixed(1)}`,
      color: isCrit ? 'text-yellow-500' : 'text-blue-600'
    }]);

    // Remove particle after animation
    setTimeout(() => {
      setParticles(prev => prev.filter(p => p.id !== id));
    }, 1000);
  }, [clickPower, globalMultiplier, ownedUpgrades]);

  const getUpgradeCost = (upgrade: Upgrade) => {
    const count = ownedUpgrades[upgrade.id] || 0;
    const baseCost = upgrade.baseCost;
    
    // Bulk Procurement: Reduces all upgrade costs by 10% per level
    const reductionLevel = ownedUpgrades['bulk-procurement'] || 0;
    const effectiveBaseCost = baseCost * Math.pow(0.85, reductionLevel);
    
    const scalingFactor = ownedPrestigeUpgrades['quantum-procurement'] ? 1.08 : 1.12;
    return Math.floor(effectiveBaseCost * Math.pow(scalingFactor, count));
  };

  const buyUpgrade = (upgrade: Upgrade) => {
    const cost = getUpgradeCost(upgrade);
    const count = ownedUpgrades[upgrade.id] || 0;
    
    // Check Max Count
    if (upgrade.maxCount && count >= upgrade.maxCount) {
      return;
    }

    // Check Cooldown
    if (upgrade.cooldownSecs) {
      const lastTime = lastPurchaseTimes[upgrade.id] || 0;
      const secondsPassed = (Date.now() - lastTime) / 1000;
      if (secondsPassed < upgrade.cooldownSecs) {
        soundService.playError();
        return;
      }
    }

    if (score >= cost) {
      soundService.playUpgrade();
      setScore(prev => prev - cost);
      setOwnedUpgrades(prev => ({
        ...prev,
        [upgrade.id]: (prev[upgrade.id] || 0) + 1
      }));
      
      if (upgrade.cooldownSecs) {
        setLastPurchaseTimes(prev => ({
          ...prev,
          [upgrade.id]: Date.now()
        }));
      }
    } else {
      soundService.playError();
    }
  };

  const handlePrestige = () => {
    const earnedPoints = Math.floor(score / currentPrestigeThreshold);
    let bonusShards = 0;
    if (ownedUpgrades['shard-resonator'] > 0) {
      bonusShards = Math.floor(score / 100000) * 0.1 * ownedUpgrades['shard-resonator'];
    }
    // Shard Reflex: Flat +20% shard gain
    if (ownedPrestigeUpgrades['shard-reflex']) {
        bonusShards *= 1.2;
    }
    const totalEarnedPoints = Math.floor(earnedPoints + bonusShards);

    if (totalEarnedPoints > 0) {
      setPrestigeEffect(true);
      
      // Create shard particles
      const newShards = Array.from({ length: 15 }, (_, i) => ({
        id: Date.now() + i,
        x: Math.random() * window.innerWidth,
        y: Math.random() * window.innerHeight
      }));
      setShardParticles(newShards);
      setTimeout(() => setShardParticles([]), 2000);

      setPrestigePoints(prev => prev + totalEarnedPoints);
      setPrestigeCount(prev => prev + 1);
      setScore(0);
      setOwnedUpgrades(
        UPGRADES.reduce((acc, curr) => ({ ...acc, [curr.id]: 0 }), {})
      );
      setActiveTab('upgrades');
      soundService.playUpgrade();
      
      setTimeout(() => setPrestigeEffect(false), 2000);
    } else {
      soundService.playError();
    }
  };

  const buyPrestigeUpgrade = (upgrade: PrestigeUpgrade) => {
    if (prestigePoints >= upgrade.cost && !ownedPrestigeUpgrades[upgrade.id]) {
      soundService.playUpgrade();
      setPrestigePoints(prev => prev - upgrade.cost);
      setOwnedPrestigeUpgrades(prev => ({
        ...prev,
        [upgrade.id]: 1
      }));
    } else {
      soundService.playError();
    }
  };

  const currentTicketPrice = useMemo(() => {
    return Math.floor(10000 * Math.pow(1.2, ticketsBought));
  }, [ticketsBought]);

  const buyTicket = () => {
    if (score >= currentTicketPrice) {
      setScore(prev => prev - currentTicketPrice);
      setWheelTickets(prev => prev + 1);
      setTicketsBought(prev => prev + 1);
      soundService.playUpgrade();
    } else {
      soundService.playError();
    }
  };

  const spinWheel = () => {
    if (wheelTickets > 0 && !isSpinning) {
      setIsSpinning(true);
      setWheelTickets(prev => prev - 1);
      soundService.playClick();

      const extraSpins = 5 + Math.random() * 5;
      const newRotation = wheelRotation + (extraSpins * 360);
      setWheelRotation(newRotation);

      // 8 segments
      setTimeout(() => {
        setIsSpinning(false);
        const normalizedRotation = newRotation % 360;
        const segment = Math.floor(((360 - normalizedRotation) % 360) / 45);
        
        // Rewards: 0: Points, 1: Shards, 2: Temp x5, 3: AutoClicker, 4: Points+, 5: Shards+, 6: Temp x10, 7: Massive Points
        switch(segment) {
          case 0:
          case 4:
            setScore(prev => prev + (cps * 60 + 1000));
            break;
          case 1:
          case 5:
            setPrestigePoints(prev => prev + 1);
            break;
          case 2:
            setTempMultiplier(5);
            setTempMultiplierEnd(Date.now() + 60000); // 1 min x5
            break;
          case 6:
            setTempMultiplier(10);
            setTempMultiplierEnd(Date.now() + 30000); // 30 sec x10
            break;
          case 3:
            setOwnedUpgrades(prev => ({ ...prev, 'auto-clicker': (prev['auto-clicker'] || 0) + 1 }));
            break;
          case 7:
            setScore(prev => prev + (cps * 300 + 10000));
            break;
        }
        soundService.playUpgrade();
      }, 3000);
    }
  };

  const toggleSound = () => {
    const newState = soundService.toggle();
    setIsSoundOn(newState);
    soundService.playClick();
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans select-none overflow-hidden relative">
      {/* Lucky Wheel Toggle Button */}
      <motion.button
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.9 }}
        onClick={() => setIsLuckyWheelOpen(true)}
        className="fixed top-6 left-6 z-[100] p-3 bg-white rounded-2xl shadow-xl border-2 border-slate-100 flex items-center gap-3 hover:border-rose-400 group transition-all"
      >
        <div className="bg-rose-50 p-2 rounded-xl group-hover:bg-rose-100 transition-colors">
          <RefreshCw className={`w-6 h-6 text-rose-500 ${isSpinning ? 'animate-spin' : ''}`} />
        </div>
        <div className="hidden sm:flex flex-col items-start pr-2">
          <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">Lucky Wheel</span>
          <span className="text-sm font-black text-slate-800 leading-none">
            {wheelTickets > 0 ? `${wheelTickets} TICKETS` : 'FREE SPIN?'} 
          </span>
        </div>
        {wheelTickets > 0 && (
          <div className="absolute -top-2 -right-2 w-5 h-5 bg-rose-500 rounded-full border-2 border-white flex items-center justify-center">
            <span className="text-[10px] font-bold text-white leading-none">{wheelTickets}</span>
          </div>
        )}
      </motion.button>

       {/* Shard Particles */}
      <AnimatePresence>
        {shardParticles.map(p => (
          <motion.div
            key={p.id}
            initial={{ scale: 0, opacity: 0, x: p.x, y: p.y }}
            animate={{ 
              scale: [0, 1.5, 0.8], 
              opacity: [0, 1, 0],
              x: window.innerWidth / 2, 
              y: window.innerHeight * 0.1 
            }}
            transition={{ duration: 1.5, ease: "anticipate" }}
            className="fixed z-[250] pointer-events-none"
          >
            <Star className="w-8 h-8 text-amber-400 fill-amber-400 drop-shadow-md" />
          </motion.div>
        ))}
      </AnimatePresence>

      <AnimatePresence>
        {saveMessage && (
          <motion.div 
            initial={{ y: -50, opacity: 0 }}
            animate={{ y: 20, opacity: 1 }}
            exit={{ y: -50, opacity: 0 }}
            className="fixed top-0 left-1/2 -translate-x-1/2 z-[100] bg-green-500 text-white px-6 py-2 rounded-full shadow-lg font-bold flex items-center gap-2"
          >
            <CheckCircle2 size={18} />
            {saveMessage}
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {prestigeEffect && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[200] bg-amber-500/20 backdrop-blur-md flex items-center justify-center pointer-events-none"
          >
            <motion.div
              initial={{ scale: 0.5, opacity: 0 }}
              animate={{ scale: [0.5, 1.2, 1], opacity: 1 }}
              transition={{ duration: 1 }}
              className="flex flex-col items-center gap-4"
            >
              <Star className="w-32 h-32 text-amber-500 fill-amber-500 drop-shadow-[0_0_30px_rgba(245,158,11,0.8)]" />
              <h2 className="text-5xl font-black text-amber-600 uppercase italic tracking-tighter drop-shadow-md">ASCENDED</h2>
            </motion.div>
            {[...Array(20)].map((_, i) => (
              <motion.div
                key={i}
                initial={{ 
                  x: "50vw", 
                  y: "50vh", 
                  scale: 0 
                }}
                animate={{ 
                  x: `${Math.random() * 100}vw`, 
                  y: `${Math.random() * 100}vh`, 
                  scale: Math.random() * 2 + 1,
                  opacity: [1, 0]
                }}
                transition={{ duration: 2, ease: "easeOut" }}
                className="absolute w-2 h-2 bg-amber-400 rounded-full"
              />
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Offline Earnings Modal */}
      <AnimatePresence>
        {offlineEarned && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[400] bg-slate-900/80 backdrop-blur-md flex items-center justify-center p-4"
          >
            <motion.div 
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              className="bg-white rounded-[2rem] w-full max-w-sm p-8 shadow-2xl text-center"
            >
              <Award className="w-16 h-16 text-blue-500 mx-auto mb-4" />
              <h2 className="text-2xl font-black text-slate-800 uppercase mb-2">Welcome Back!</h2>
              <p className="text-slate-500 mb-6 font-bold">While you were away, your machines were busy...</p>
              
              <div className="bg-slate-100 p-6 rounded-2xl mb-6">
                <span className="text-sm font-bold text-slate-400 block uppercase tracking-widest mb-1">Earned</span>
                <span className="text-4xl font-black text-blue-600">+{offlineEarned.points.toLocaleString()}</span>
              </div>
              
              <button 
                onClick={() => setOfflineEarned(null)}
                className="w-full py-4 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-black uppercase tracking-widest transition-all"
              >
                Collect
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Lucky Wheel Modal */}
      <AnimatePresence>
        {isLuckyWheelOpen && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[300] bg-slate-900/80 backdrop-blur-md flex items-center justify-center p-4"
          >
            <motion.div 
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              className="bg-white rounded-[2rem] w-full max-w-sm p-6 shadow-2xl relative overflow-hidden"
            >
              <button 
                onClick={() => setIsLuckyWheelOpen(false)}
                className="absolute top-4 right-4 p-2 bg-slate-100 hover:bg-slate-200 rounded-full transition-colors z-30"
              >
                <X className="w-5 h-5 text-slate-500" />
              </button>

              <div className="text-center mb-6">
                <h2 className="text-2xl font-black text-slate-800 tracking-tight uppercase">Lucky Wheel</h2>
                <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider italic">Spin to win epic rewards!</p>
              </div>

              <div className="relative w-64 h-64 mx-auto mb-6 flex items-center justify-center">
                <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-2 z-30">
                  <motion.div 
                    animate={isSpinning ? { rotate: [0, -10, 10, -10, 0] } : {}}
                    transition={{ repeat: Infinity, duration: 0.2 }}
                    className="w-4 h-8 bg-rose-500 rounded-b-full shadow-lg border-2 border-white" 
                  />
                </div>

                <motion.div 
                  animate={{ rotate: wheelRotation }}
                  transition={{ 
                    rotate: isSpinning ? { duration: 3, ease: [0.15, 0, 0.15, 1] } : { duration: 0 }
                  }}
                  className="w-full h-full rounded-full border-[8px] border-slate-800 bg-slate-100 relative overflow-hidden shadow-xl"
                >
                  {[0,1,2,3,4,5,6,7].map((i) => (
                    <React.Fragment key={i}>
                      <div 
                        style={{ transform: `rotate(${i * 45}deg)` }}
                        className="absolute top-0 left-1/2 -ml-[1px] w-[2px] h-full bg-slate-800 origin-bottom opacity-10"
                      />
                      <div 
                        style={{ transform: `translateX(-50%) rotate(${i * 45 + 22.5}deg)` }}
                        className="absolute top-[15%] left-1/2 origin-bottom h-[35%] flex flex-col items-center pt-2"
                      >
                        <span className="font-black text-[8px] uppercase tracking-tighter text-slate-700 text-center">
                          {["Points", "Shard", "x5 Boost", "Auto", "Points+", "Shard", "x10 Boost", "MEGA"][i]}
                        </span>
                      </div>
                    </React.Fragment>
                  ))}
                </motion.div>
                
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <div className="w-12 h-12 bg-slate-800 rounded-full border-4 border-slate-100 z-10 shadow-lg flex items-center justify-center">
                    <RefreshCw className={`text-white w-5 h-5 ${isSpinning ? 'animate-spin' : ''}`} />
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 flex justify-between items-center overflow-hidden relative">
                  {isSpinning && (
                    <motion.div 
                      initial={{ width: 0 }}
                      animate={{ width: '100%' }}
                      transition={{ duration: 3, ease: 'linear' }}
                      className="absolute bottom-0 left-0 h-1 bg-rose-500 opacity-20"
                    />
                  )}
                  <div>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Tickets held</p>
                    <p className="text-xl font-black text-slate-800">{wheelTickets}</p>
                  </div>
                  <button 
                    onClick={spinWheel}
                    disabled={isSpinning || wheelTickets <= 0}
                    className={`px-8 py-3 rounded-xl font-black text-white text-sm uppercase tracking-widest transition-all ${isSpinning || wheelTickets <= 0 ? 'bg-slate-300' : 'bg-rose-500 hover:bg-rose-600 shadow-lg shadow-rose-200 active:scale-95'}`}
                  >
                    Spin
                  </button>
                </div>

                <div className="p-4 bg-indigo-50 border border-indigo-100 rounded-2xl flex justify-between items-center group">
                  <div className="flex flex-col">
                    <span className="text-[10px] font-black text-indigo-400 uppercase tracking-widest mb-0.5">Lucky Ticket</span>
                    <span className="text-base font-black text-indigo-900">${currentTicketPrice.toLocaleString()}</span>
                  </div>
                  <button 
                    onClick={buyTicket}
                    disabled={score < currentTicketPrice}
                    className={`px-5 py-2.5 rounded-lg font-black uppercase text-[10px] tracking-wider transition-all ${score >= currentTicketPrice ? 'bg-indigo-600 text-white hover:bg-indigo-700 shadow-md group-hover:scale-105' : 'bg-slate-200 text-slate-400'}`}
                  >
                    Purchase
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showDeleteConfirm && (
          <div className="fixed inset-0 z-[300] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="bg-white rounded-3xl p-8 max-w-sm w-full shadow-2xl border-2 border-red-100 flex flex-col gap-6"
            >
              <div className="flex flex-col items-center text-center gap-4">
                <div className="p-4 bg-red-50 rounded-full">
                  <Trash2 className="w-12 h-12 text-red-500" />
                </div>
                <div>
                  <h3 className="text-xl font-black text-slate-800">PERMANENT DELETION</h3>
                  <p className="text-sm text-slate-500 mt-2">
                    Warning: This action is <span className="text-red-600 font-bold underline">IRREVERSIBLE</span>. 
                    You will lose all {formatNumber(totalScore)} lifetime points, all Prestige Shards, and all Achievements. 
                    Your legacy will be completely erased.
                  </p>
                </div>
              </div>
              <div className="flex gap-3">
                <button 
                  onClick={() => setShowDeleteConfirm(false)}
                  className="flex-1 py-3 rounded-xl font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 transition-colors"
                >
                  Cancel
                </button>
                <button 
                  onClick={handleDeleteProgress}
                  className="flex-1 py-3 rounded-xl font-bold text-white bg-red-500 hover:bg-red-600 transition-colors shadow-lg shadow-red-200"
                >
                  Clear Game
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Floating Particles Area */}
      <div className="fixed inset-0 pointer-events-none z-50">
        <AnimatePresence>
          {particles.map(particle => (
            <motion.div
              key={particle.id}
              initial={{ opacity: 1, y: particle.y, x: particle.x, scale: 0.5 }}
              animate={{ opacity: 0, y: particle.y - 120, x: particle.x + (Math.random() * 40 - 20), scale: 1.5 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.8, ease: "easeOut" }}
              className={`absolute font-black text-2xl pointer-events-none drop-shadow-md whitespace-nowrap ${particle.color || 'text-blue-600'}`}
            >
              {particle.value}
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* Header */}
      <header className="bg-white border-b border-slate-200 p-4 sticky top-0 z-10 shadow-sm flex justify-between items-center">
        <div className="flex items-center gap-2">
          <Trophy className="w-6 h-6 text-amber-500" />
          <h1 className="text-xl font-bold text-slate-800 tracking-tight text-nowrap">Clicker Quest</h1>
        </div>
        <div className="flex gap-4 items-center overflow-hidden">
          {prestigePoints > 0 && (
            <div className="text-right flex items-center gap-1 bg-amber-50 px-3 py-1 rounded-lg border border-amber-200">
               <Star className="w-4 h-4 text-amber-500 fill-amber-500" />
               <span className="text-sm font-bold text-amber-700">x{globalMultiplier.toFixed(1)}</span>
            </div>
          )}
          <div className="text-right shrink-0">
            <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest leading-none mb-1">PPS</p>
            <p className="font-mono text-blue-600 font-bold leading-none">{formatNumber(cps * globalMultiplier)}</p>
          </div>
        </div>
      </header>

      {/* Main Game Area */}
      <main className="flex-1 flex flex-col items-center justify-center p-6 gap-8">
        <div className="text-center">
          <p className="text-slate-500 text-sm font-medium uppercase tracking-wider mb-1">Current Score</p>
          <h2 className="text-6xl font-black text-slate-900 drop-shadow-sm font-mono tracking-tighter">
            {formatNumber(score)}
          </h2>
        </div>

        {/* Combo Bar */}
        {ownedUpgrades['combo-multiplier'] > 0 && (
          <div className="w-full max-w-sm flex flex-col gap-2 relative p-4 bg-slate-900 rounded-2xl border border-slate-700 shadow-xl">
            {/* Visual Flare for active combo */}
            {comboMultiplier > 1 && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: [0.1, 0.3, 0.1] }}
                transition={{ repeat: Infinity, duration: 1.5 }}
                className={`absolute -inset-1 rounded-2xl blur-lg pointer-events-none transition-colors duration-300 ${
                  combo >= 800 ? 'bg-red-500' : combo >= 400 ? 'bg-rose-500' : combo >= 200 ? 'bg-amber-500' : 'bg-cyan-500'
                }`}
              />
            )}
            
            <div className="flex justify-between items-center relative z-10">
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                <Cpu size={14} /> Neural Link
              </span>
              <span className={`text-sm font-black transition-colors duration-300 ${
                combo >= 800 ? 'text-red-400 animate-pulse' : combo >= 400 ? 'text-rose-400' : combo >= 100 ? 'text-amber-400' : isComboActive ? 'text-cyan-400' : 'text-slate-600'
              }`}>
                {comboMultiplier > 1 ? `x${comboMultiplier}` : `${Math.floor((combo / 100) * 100)}%`}
              </span>
            </div>
            
            <div className="h-4 w-full bg-slate-800 rounded-lg overflow-hidden border border-slate-700 shadow-inner relative z-10">
              <motion.div 
                initial={false}
                animate={{ 
                  width: `${(combo / (ownedUpgrades['combo-overdrive'] > 0 ? 800 : ownedUpgrades['combo-master'] > 0 ? 400 : 100)) * 100}%`,
                  backgroundColor: combo >= 800 ? '#ef4444' : combo >= 400 ? '#f43f5e' : combo >= 100 ? '#f59e0b' : '#3b82f6'
                }}
                className="h-full rounded-lg"
                transition={{ type: 'spring', stiffness: 100, damping: 20 }}
              >
                {isComboActive && (
                  <motion.div
                    animate={{ x: ['-100%', '200%'] }}
                    transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
                    className="w-full h-full bg-gradient-to-r from-transparent via-white/20 to-transparent"
                  />
                )}
              </motion.div>
            </div>
            
            <div className="flex justify-between px-1 relative z-10 text-[9px] font-bold text-slate-500 uppercase tracking-tighter">
              <span>x2</span>
              <span>x3</span>
              <span>x5</span>
              <span>x10</span>
            </div>
          </div>
        )}

        {/* Big Click Button */}
        <motion.button
          id="main-clicker"
          animate={{ 
            scale: critFlash ? 1.2 : ((cps * globalMultiplier > 0 || combo > 1) ? [1, 1.02, 1] : 1),
            boxShadow: critFlash ? "0 0 50px rgba(250, 204, 21, 0.8)" : ((cps * globalMultiplier > 0 || combo > 1) ? ["0 0 0px rgba(79, 70, 229, 0)", "0 0 20px rgba(79, 70, 229, 0.5)", "0 0 0px rgba(79, 70, 229, 0)"] : "none")
          }}
          transition={{ repeat: critFlash ? 0 : Infinity, duration: 1 }}
          whileTap={{ scale: 0.85, rotate: 5 }}
          onClick={(e) => handleManualClick(e)}
          className={`relative w-64 h-64 bg-gradient-to-br rounded-full flex items-center justify-center cursor-pointer border-8 active:border-blue-300 group transition-all duration-200 ${
            critFlash ? 'from-yellow-400 to-yellow-600 border-yellow-300' : 'from-blue-500 to-blue-700 border-blue-400'
          } ${
            combo >= 400 ? 'shadow-[0_0_60px_rgba(239,68,68,0.6)]' : combo >= 100 ? 'shadow-[0_0_50px_rgba(245,158,11,0.5)]' : isComboActive ? 'shadow-[0_0_40px_rgba(6,182,212,0.4)]' : 'shadow-[0_20px_50px_rgba(59,130,246,0.3)]'
          }`}
        >
          <div className="absolute inset-0 rounded-full bg-blue-400 opacity-0 group-hover:opacity-10 transition-opacity" />
          <div className="flex flex-col items-center gap-2">
            <MousePointer2 className="w-16 h-16 text-white drop-shadow-md" />
            <span className="text-white font-black text-2xl uppercase tracking-widest drop-shadow-sm">Click!</span>
          </div>
          
          <motion.div
            animate={{ scale: [1, 1.1, 1], opacity: [0.1, 0, 0.1] }}
            transition={{ duration: 2, repeat: Infinity }}
            className="absolute -inset-4 border-2 border-blue-200 rounded-full"
          />
        </motion.button>
        
        <p className="text-slate-400 text-sm italic font-medium">Click power: {(clickPower * globalMultiplier).toFixed(1)}</p>
      </main>

      {/* Bottom Section with Tabs */}
      <section className="bg-white border-t border-slate-200 w-full max-w-2xl mx-auto rounded-t-3xl shadow-[0_-8px_30px_rgb(0,0,0,0.04)] flex flex-col h-[45%] overflow-hidden">
        {/* Navigation Tabs */}
        <div className="flex border-b border-slate-100">
          <button 
            onClick={() => { setActiveTab('upgrades'); soundService.playClick(); }}
            className={`flex-1 py-4 text-xs font-bold flex flex-col items-center justify-center gap-1 transition-colors ${activeTab === 'upgrades' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-slate-400 hover:text-slate-600'}`}
          >
            <Zap size={18} />
            Shop
          </button>
          <button 
            onClick={() => { setActiveTab('achievements'); soundService.playClick(); }}
            className={`flex-1 py-4 text-xs font-bold flex flex-col items-center justify-center gap-1 transition-colors relative ${activeTab === 'achievements' ? 'text-purple-600 border-b-2 border-purple-600' : 'text-slate-400 hover:text-slate-600'}`}
          >
            <div className="relative">
              <Award size={18} />
              {newAchievements.length > 0 && (
                <motion.span 
                  initial={{ scale: 0 }}
                  animate={{ scale: [1, 1.2, 1] }}
                  transition={{ repeat: Infinity, duration: 1 }}
                  className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full border-2 border-white shadow-sm"
                />
              )}
            </div>
            Awards ({unlockedAchievements.length})
          </button>
          <button 
            onClick={() => { setActiveTab('prestige'); soundService.playClick(); }}
            className={`flex-1 py-4 text-xs font-bold flex flex-col items-center justify-center gap-1 transition-colors ${activeTab === 'prestige' ? 'text-amber-600 border-b-2 border-amber-600' : 'text-slate-400 hover:text-slate-600'}`}
          >
            <RotateCcw size={18} />
            Prestige
          </button>
          <button 
            onClick={() => { setActiveTab('settings'); soundService.playClick(); }}
            className={`flex-1 py-4 text-xs font-bold flex flex-col items-center justify-center gap-1 transition-colors ${activeTab === 'settings' ? 'text-slate-800 border-b-2 border-slate-800' : 'text-slate-400 hover:text-slate-600'}`}
          >
            <Settings size={18} />
            Setup
          </button>
        </div>

        {/* Tab Content */}
        <div className="flex-1 overflow-y-auto p-4">
          {activeTab === 'upgrades' && (
            <div className="flex flex-col gap-6 pb-8">
              {(['Clicking', 'Automation', 'Special'] as UpgradeCategory[]).map(category => {
                const categoryUpgrades = UPGRADES.filter(u => u.category === category).filter(upgrade => {
                  // Keep existing sequence logic...
                  if (upgrade.id === 'combo-upgrader') return ownedUpgrades['combo-multiplier'] > 0;
                  if (upgrade.id === 'combo-master') return ownedUpgrades['combo-upgrader'] > 0;
                  if (upgrade.id === 'advanced-auto-clicker') return (ownedUpgrades['auto-clicker'] || 0) >= 20;
                  if (upgrade.id === 'auto-clicker-t2') return (ownedUpgrades['auto-clicker'] || 0) >= 25;
                  if (upgrade.id === 'auto-clicker-t3') return (ownedUpgrades['auto-clicker-t2'] || 0) >= 20;
                  if (upgrade.id === 'auto-clicker-t4') return (ownedUpgrades['auto-clicker-t3'] || 0) >= 15;
                  if (upgrade.id === 'double-points-t2') return (ownedUpgrades['double-points'] || 0) >= 25;
                  if (upgrade.id === 'double-points-t3') return (ownedUpgrades['double-points-t2'] || 0) >= 20;
                  if (upgrade.id === 'double-points-t4') return (ownedUpgrades['double-points-t3'] || 0) >= 15;
                  return true;
                });

                if (categoryUpgrades.length === 0) return null;

                return (
                  <div key={category} className="flex flex-col gap-2">
                    <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest px-2">{category}</h3>
                    <div className="grid grid-cols-1 gap-3">
                      {categoryUpgrades.map((upgrade) => {
                        const cost = getUpgradeCost(upgrade);
                        const count = ownedUpgrades[upgrade.id] || 0;
                        const isMaxed = upgrade.maxCount ? count >= upgrade.maxCount : false;
                        let cooldownRemaining = 0;
                        if (upgrade.cooldownSecs) {
                          const lastTime = lastPurchaseTimes[upgrade.id] || 0;
                          const secondsPassed = (currentTime - lastTime) / 1000;
                          cooldownRemaining = Math.max(0, Math.ceil(upgrade.cooldownSecs - secondsPassed));
                        }
                        const canAfford = score >= cost && !isMaxed && cooldownRemaining === 0;

                        return (
                          <button
                            key={upgrade.id}
                            id={`upgrade-${upgrade.id}`}
                            onClick={() => buyUpgrade(upgrade)}
                            disabled={!canAfford}
                            className={`flex items-center gap-4 p-4 rounded-xl border-2 transition-all duration-200 text-left relative overflow-hidden ${canAfford ? 'bg-white border-slate-200 hover:border-blue-500 hover:shadow-md cursor-pointer' : isMaxed ? 'bg-green-50 border-green-200 cursor-default' : 'bg-slate-50 border-slate-100 opacity-60 cursor-not-allowed'}`}
                          >
                            {cooldownRemaining > 0 && (
                              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="absolute inset-0 bg-slate-900/60 flex flex-col items-center justify-center z-10 backdrop-blur-[1px]">
                                <div className="text-white font-black text-2xl tracking-tighter flex items-center gap-1">
                                  <RotateCcw className="animate-spin" size={20} />
                                  {cooldownRemaining}s
                                </div>
                                <span className="text-[8px] text-slate-300 font-bold uppercase tracking-widest">Recharging</span>
                              </motion.div>
                            )}
                            <div className={`p-3 rounded-lg ${canAfford ? upgrade.id.includes('-t4') ? 'bg-purple-100' : upgrade.id.includes('-t3') ? 'bg-orange-100' : upgrade.id.includes('-t2') ? 'bg-blue-100' : 'bg-slate-100' : isMaxed ? 'bg-green-100/50' : 'bg-slate-200'}`}>
                              {upgrade.icon}
                            </div>
                            <div className="flex-1">
                              <div className="flex justify-between items-start">
                                <h4 className="font-bold text-slate-800">{upgrade.name}</h4>
                                <span className={`text-xs px-2 py-0.5 rounded-full font-bold ${isMaxed ? 'bg-green-500 text-white' : 'bg-slate-200 text-slate-600'}`}>
                                  {isMaxed ? 'MAX' : `x${count}`}
                                </span>
                              </div>
                              <p className="text-xs text-slate-500 mb-1">{upgrade.description}</p>
                              <div className="flex justify-between items-center">
                                <p className={`text-sm font-black ${isMaxed ? 'text-green-600' : canAfford ? 'text-blue-600' : 'text-slate-400'}`}>
                                  {isMaxed ? 'Purchased' : `$${formatNumber(cost)}`}
                                </p>
                                {cooldownRemaining > 0 && (
                                  <div className="flex items-center gap-1 text-[10px] font-black text-amber-600 uppercase bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                                    Cooldown: {cooldownRemaining}s
                                  </div>
                                )}
                              </div>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          )}


          {activeTab === 'achievements' && (
            <div className="grid grid-cols-1 gap-3 pb-8">
              {ACHIEVEMENTS.map((ach) => {
                const isUnlocked = unlockedAchievements.includes(ach.id);
                const isNew = newAchievements.includes(ach.id);
                return (
                  <div 
                    key={ach.id}
                    className={`flex items-center gap-4 p-4 rounded-xl border-2 ${isUnlocked ? 'bg-white border-purple-200 shadow-sm' : 'bg-slate-50 border-slate-100 grayscale opacity-50'}`}
                  >
                    <motion.div 
                      animate={isNew ? { scale: [1, 1.2, 1], rotate: [0, 5, -5, 0] } : {}}
                      transition={isNew ? { duration: 1, repeat: Infinity } : {}}
                      className="p-3 bg-slate-100 rounded-lg"
                    >
                      {ach.icon}
                    </motion.div>
                    <div>
                      <h4 className="font-bold text-slate-800">{ach.title}</h4>
                      <p className="text-xs text-slate-500">{ach.description}</p>
                    </div>
                    {isUnlocked && <CheckCircle2 className="ml-auto text-green-500" size={20} />}
                  </div>
                );
              })}
            </div>
          )}

          {activeTab === 'prestige' && (
            <div className="flex flex-col h-full bg-slate-50/50">
              {/* Prestige Stats Summary */}
              <div className="p-4 grid grid-cols-2 gap-3">
                <div className="bg-white p-3 rounded-xl border border-amber-100 shadow-sm flex flex-col items-center">
                  <motion.div
                    key={prestigePoints}
                    initial={{ scale: 1 }}
                    animate={{ scale: [1, 1.4, 1] }}
                    transition={{ duration: 0.4 }}
                  >
                    <Star className="w-5 h-5 text-amber-500 mb-1 fill-amber-300" />
                  </motion.div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase">Shards</span>
                  <motion.span 
                    key={`score-${prestigePoints}`}
                    initial={{ y: 5, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    className="text-lg font-black text-amber-600"
                  >
                    {prestigePoints}
                  </motion.span>
                </div>
                <div className="bg-white p-3 rounded-xl border border-blue-100 shadow-sm flex flex-col items-center">
                  <span className="text-[10px] font-bold text-slate-400 uppercase mb-1">Current Multiplier</span>
                  <span className="text-lg font-black text-blue-600">x{globalMultiplier.toFixed(2)}</span>
                </div>
              </div>

              {/* Shard Shop Toggle */}
              <div className="px-4 flex flex-col gap-4 overflow-y-auto pb-20">
                {prestigeCount > 0 && (
                  <div className="flex flex-col gap-2">
                    <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-1">Prestige Shop</h3>
                    {PRESTIGE_UPGRADES.map((pup) => {
                      const isOwned = !!ownedPrestigeUpgrades[pup.id];
                      const canAfford = prestigePoints >= pup.cost;
                      
                      return (
                        <button
                          key={pup.id}
                          disabled={isOwned || !canAfford}
                          onClick={() => buyPrestigeUpgrade(pup)}
                          className={`
                            flex items-center gap-4 p-4 rounded-xl border-2 transition-all text-left
                            ${isOwned 
                              ? 'bg-green-50 border-green-200 cursor-default' 
                              : canAfford 
                                ? 'bg-white border-amber-200 hover:border-amber-400 cursor-pointer shadow-sm' 
                                : 'bg-slate-50 border-slate-100 opacity-60 cursor-not-allowed'}
                          `}
                        >
                          <div className={`p-2 rounded-lg ${isOwned ? 'bg-green-100/50' : 'bg-amber-50 text-amber-600'}`}>
                            {pup.icon}
                          </div>
                          <div className="flex-1">
                            <div className="flex justify-between items-center">
                              <h4 className="font-bold text-slate-800 text-sm">{pup.name}</h4>
                              {isOwned ? (
                                <CheckCircle2 className="text-green-600" size={16} />
                              ) : (
                                <span className="text-[10px] font-black bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full flex items-center gap-1">
                                  <Star size={10} className="fill-amber-700" />
                                  {formatNumber(pup.cost)}
                                </span>
                              )}
                            </div>
                            <p className="text-[10px] text-slate-500">{pup.description}</p>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}

                <div className="flex flex-col items-center text-center p-4 bg-white rounded-2xl border-2 border-slate-100 gap-4 mt-2">
                  <div>
                    <h3 className="text-lg font-black text-slate-800 uppercase tracking-tight">Perform Ascension</h3>
                    <p className="text-[10px] text-slate-500 mt-1 uppercase font-bold tracking-widest">
                      Reset requirement: {formatNumber(currentPrestigeThreshold)} Points
                    </p>
                  </div>

                  <div className="flex flex-col gap-1 items-center">
                    <span className="text-xs font-bold text-slate-400 uppercase">Est. Shards Gained</span>
                    <span className="text-3xl font-black text-green-600">+{Math.floor(score / currentPrestigeThreshold)}</span>
                  </div>

                  <button 
                    onClick={handlePrestige}
                    disabled={score < currentPrestigeThreshold}
                    className={`w-full py-4 rounded-xl font-black text-white uppercase tracking-widest transition-all ${score >= currentPrestigeThreshold ? 'bg-amber-500 hover:bg-amber-600 shadow-lg shadow-amber-200' : 'bg-slate-300 cursor-not-allowed'}`}
                  >
                    Reset for Shards
                  </button>
                  <p className="text-[9px] text-slate-400 italic">Next threshold will be x1.5 higher</p>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'settings' && (
            <div className="flex flex-col gap-4 pb-8">
              <div className="flex flex-col gap-2">
                <h3 className="text-sm font-bold text-slate-400 uppercase tracking-widest px-2">General</h3>
                
                <button 
                  onClick={toggleSound}
                  className="w-full flex items-center justify-between p-4 bg-white border-2 border-slate-100 rounded-2xl hover:border-blue-200 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-slate-50 rounded-lg">
                      {isSoundOn ? <Volume2 className="text-blue-500" size={20} /> : <VolumeX className="text-slate-400" size={20} />}
                    </div>
                    <span className="font-bold text-slate-700">Sound Effects</span>
                  </div>
                  <div className={`w-12 h-6 rounded-full relative transition-colors ${isSoundOn ? 'bg-blue-500' : 'bg-slate-200'}`}>
                    <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${isSoundOn ? 'left-7' : 'left-1'}`} />
                  </div>
                </button>

                <button 
                  onClick={handleManualSave}
                  className="w-full flex items-center justify-between p-4 bg-white border-2 border-slate-100 rounded-2xl hover:border-blue-200 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-slate-50 rounded-lg text-blue-500">
                      <Save size={20} />
                    </div>
                    <span className="font-bold text-slate-700">Manual Save Now</span>
                  </div>
                  <span className="text-xs font-bold bg-blue-50 text-blue-600 px-2 py-1 rounded-md">Save</span>
                </button>
              </div>

              <div className="flex flex-col gap-2 mt-4">
                <h3 className="text-sm font-bold text-red-400 uppercase tracking-widest px-2">Danger Zone</h3>
                
                <button 
                  onClick={() => setShowDeleteConfirm(true)}
                  className="w-full flex items-center justify-between p-4 bg-red-50 border-2 border-red-100 rounded-2xl hover:bg-red-100 transition-colors group"
                >
                  <div className="flex items-center gap-3 text-red-600">
                    <div className="p-2 bg-white rounded-lg shadow-sm">
                      <Trash2 size={20} />
                    </div>
                    <span className="font-bold">Delete All Progress</span>
                  </div>
                  <X className="text-red-300 group-hover:text-red-500" size={16} />
                </button>
              </div>

              <div className="mt-8 text-center">
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Clicker Quest v1.2</p>
                <p className="text-[10px] text-slate-300 mt-1 uppercase">No external services used • Locally Saved</p>
              </div>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}


