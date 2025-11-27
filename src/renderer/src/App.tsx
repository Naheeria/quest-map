/* eslint-disable */
import React, { useState, useEffect, useRef } from 'react';
import { Settings, Scroll, CheckCircle2, X, Sparkles, Plus, Trash2, Edit3, Target, Undo2, Focus, Trophy, LocateFixed, AlertTriangle, RefreshCw, Heart, Save, Flag, Power, Grid, Briefcase, Coffee, BookOpen, Activity, Box, Bell } from 'lucide-react';

// --- Constants & Types ---

const CURRENT_APP_VERSION = "1.0.2";

type QuestTag = 'Work' | 'Hobby' | 'SelfDev' | 'Health' | 'Etc';

const TAG_CONFIG: Record<QuestTag, { label: string, color: string, icon: React.ElementType }> = {
  'Work': { label: '업무', color: 'bg-blue-100 text-blue-700 border-blue-200', icon: Briefcase },
  'Hobby': { label: '취미', color: 'bg-pink-100 text-pink-700 border-pink-200', icon: Coffee },
  'SelfDev': { label: '자기계발', color: 'bg-purple-100 text-purple-700 border-purple-200', icon: BookOpen },
  'Health': { label: '건강', color: 'bg-green-100 text-green-700 border-green-200', icon: Activity },
  'Etc': { label: '기타', color: 'bg-slate-100 text-slate-700 border-slate-200', icon: Box },
};

interface QuestStep {
  id: string;
  text: string;
  isCompleted: boolean;
  expReward: number;
  mapPosition: [number, number];
  memo?: string;
}

interface Quest {
  id: string;
  title: string;
  tag: QuestTag; 
  isActive: boolean;
  currentStep: number;
  steps: QuestStep[];
}

interface Achievement {
  id: string;
  categoryId: string;
  title: string;
  description: string;
  condition: (char: Character, quests: Quest[]) => boolean;
}

interface AchievementCategory {
  id: string;
  title: string;
  icon: React.ElementType;
  subAchievements: Achievement[];
}

interface Character {
  id: string;
  name: string;
  imagePath: string | null;
  level: number;
  currentExp: number;
  nextLevelExp: number;
  affinity: number;      
  affinityLevel: number; 
  lastClickDate?: string; 
  dailyClickCount?: number; 
  unlockedAchievements: string[]; 
}

interface GlobalConfig {
  characters: Character[];
  activeCharacterId: string;
  mapImagePath: string | null;
  mapScale: number;
  isMapTiled: boolean; 
  backgroundColor: string;
  opacity: number;
  themeColor: string; 
  customDialogs: string[];
}

// --- Default Components ---

const DefaultCuteChar = () => (
  <svg width="100%" height="100%" viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg" className="drop-shadow-xl">
    <g className="animate-float-soft">
      <path d="M16 40 Q 32 60 48 40 L 44 25 L 20 25 Z" fill="#e57373" />
      <rect x="22" y="30" width="20" height="20" rx="4" fill="#5c6bc0" />
      <rect x="26" y="32" width="12" height="16" rx="2" fill="#9fa8da" /> 
      <circle cx="32" cy="22" r="14" fill="#ffccbc" />
      <path d="M18 22 A 14 14 0 0 1 46 22 L 46 24 L 18 24 Z" fill="#78909c" />
      <rect x="30" y="10" width="4" height="8" rx="1" fill="#eceff1" /> 
      <circle cx="32" cy="8" r="4" fill="#ef5350" />
      <circle cx="28" cy="24" r="2" fill="#37474f" />
      <circle cx="36" cy="24" r="2" fill="#37474f" />
      <path d="M30 28 Q 32 30 34 28" stroke="#ef9a9a" strokeWidth="2" strokeLinecap="round" fill="none" />
    </g>
  </svg>
);

// --- Achievement Definitions ---

const ACHIEVEMENTS_DATA: AchievementCategory[] = [
  {
    id: 'growth',
    title: '대기만성 (성장)',
    icon: Sparkles,
    subAchievements: [
      { id: 'growth_10', categoryId: 'growth', title: '첫걸음', description: '레벨 10 달성', condition: (c) => c.level >= 10 },
      { id: 'growth_30', categoryId: 'growth', title: '숙련된 모험가', description: '레벨 30 달성', condition: (c) => c.level >= 30 },
      { id: 'growth_50', categoryId: 'growth', title: '고지의 입구', description: '레벨 50 달성', condition: (c) => c.level >= 50 },
      { id: 'growth_100', categoryId: 'growth', title: '전설의 시작', description: '레벨 100 달성', condition: (c) => c.level >= 100 },
    ]
  },
  {
    id: 'affinity',
    title: '이심전심 (교감)',
    icon: Heart,
    subAchievements: [
      { id: 'aff_3', categoryId: 'affinity', title: '조금은 친해졌어', description: '호감도 Lv.3 달성', condition: (c) => c.affinityLevel >= 3 },
      { id: 'aff_7', categoryId: 'affinity', title: '친근한 사이', description: '호감도 Lv.7 달성', condition: (c) => c.affinityLevel >= 7 },
      { id: 'aff_20', categoryId: 'affinity', title: '둘도 없는 단짝', description: '호감도 Lv.20 달성', condition: (c) => c.affinityLevel >= 20 },
      { id: 'aff_50', categoryId: 'affinity', title: '영혼의 파트너', description: '호감도 Lv.50 달성', condition: (c) => c.affinityLevel >= 50 },
    ]
  },
  {
    id: 'quest',
    title: '우공이산 (성실)',
    icon: Trophy,
    subAchievements: [
      { id: 'qst_1', categoryId: 'quest', title: '천리 길도 한 걸음 부터', description: '퀘스트 1개 완료', condition: (_c, q) => q.filter(x => x.steps.every(s => s.isCompleted)).length >= 1 },
      { id: 'qst_5', categoryId: 'quest', title: '작심삼일 극복', description: '퀘스트 5개 완료', condition: (_c, q) => q.filter(x => x.steps.every(s => s.isCompleted)).length >= 5 },
      { id: 'qst_10', categoryId: 'quest', title: '습관의 형성', description: '퀘스트 10개 완료', condition: (_c, q) => q.filter(x => x.steps.every(s => s.isCompleted)).length >= 10 },
      { id: 'qst_30', categoryId: 'quest', title: '끈기의 증명', description: '퀘스트 30개 완료', condition: (_c, q) => q.filter(x => x.steps.every(s => s.isCompleted)).length >= 30 },
    ]
  },
  {
    id: 'tag',
    title: '팔방미인 (다재다능)',
    icon: Grid,
    subAchievements: [
      { id: 'tag_work_5', categoryId: 'tag', title: '일잘러', description: '업무 퀘스트 5개 완료', condition: (_c, q) => q.filter(x => x.tag === 'Work' && x.steps.every(s => s.isCompleted)).length >= 5 },
      { id: 'tag_hobby_5', categoryId: 'tag', title: '취미 부자', description: '취미 퀘스트 5개 완료', condition: (_c, q) => q.filter(x => x.tag === 'Hobby' && x.steps.every(s => s.isCompleted)).length >= 5 },
      { id: 'tag_self_5', categoryId: 'tag', title: '갓생 살기', description: '자기계발 퀘스트 5개 완료', condition: (_c, q) => q.filter(x => x.tag === 'SelfDev' && x.steps.every(s => s.isCompleted)).length >= 5 },
      { id: 'tag_health_5', categoryId: 'tag', title: '건강이 최고', description: '건강 퀘스트 5개 완료', condition: (_c, q) => q.filter(x => x.tag === 'Health' && x.steps.every(s => s.isCompleted)).length >= 5 },
    ]
  }
];

// --- Default Data ---

const DAILY_CLICK_LIMIT = 20;

const DEFAULT_DIALOGS = [
  "오늘은 어떤 모험을 할까?",
  "준비 완료!",
  "[Lv.2] 조금씩 익숙해지는 것 같아.",
  "[Lv.5] 너와 함께라면 어디든 갈 수 있어!",
  "[Lv.10] 우린 최고의 파트너야, 그렇지?"
];

const INITIAL_CHAR_ID = "default_char";

const DEFAULT_CONFIG: GlobalConfig = {
  characters: [
    {
      id: INITIAL_CHAR_ID,
      name: "꼬마 용사",
      imagePath: null,
      level: 1,
      currentExp: 0,
      nextLevelExp: 100,
      affinity: 0,
      affinityLevel: 1,
      lastClickDate: new Date().toDateString(),
      dailyClickCount: 0,
      unlockedAchievements: []
    }
  ],
  activeCharacterId: INITIAL_CHAR_ID,
  mapImagePath: null,
  mapScale: 1.0,
  isMapTiled: false,
  backgroundColor: "#f0e6d2",
  opacity: 1.0,
  themeColor: "#8b5e3c", 
  customDialogs: DEFAULT_DIALOGS,
};

// --- Styles ---

const CustomStyles = () => (
  <style>{`
    @import url('https://fonts.googleapis.com/css2?family=Nunito:wght@400;700;900&display=swap');
    .font-cute { font-family: 'Nunito', sans-serif; }
    
    ::-webkit-scrollbar { width: 6px; height: 6px; }
    ::-webkit-scrollbar-track { background: transparent; }
    ::-webkit-scrollbar-thumb { background: rgba(0,0,0,0.1); border-radius: 10px; }
    ::-webkit-scrollbar-thumb:hover { background: rgba(0,0,0,0.2); }

    .scrollbar-hide::-webkit-scrollbar { display: none; }
    .scrollbar-hide { -ms-overflow-style: none; scrollbar-width: none; }

    .soft-ui-container {
      box-shadow: 0 10px 30px -5px rgba(0, 0, 0, 0.2);
      border: 4px solid var(--theme-color);
    }
    .btn-bounce { transition: transform 0.1s cubic-bezier(0.34, 1.56, 0.64, 1); }
    .btn-bounce:active { transform: scale(0.9); }
    .animate-float-soft { animation: floatSoft 3s ease-in-out infinite; }
    @keyframes floatSoft { 0%, 100% { transform: translateY(0px); } 50% { transform: translateY(-6px); } }
    .bg-tabletop-pattern { background-image: radial-gradient(var(--theme-color) 1px, transparent 1px); background-size: 20px 20px; opacity: 0.1; }
    .cursor-grab { cursor: grab; }
    .cursor-grabbing { cursor: grabbing; }

    @keyframes floatHeart {
      0% { transform: translateY(0) scale(1); opacity: 1; }
      100% { transform: translateY(-40px) scale(1.5); opacity: 0; }
    }
    .heart-particle {
      position: absolute;
      pointer-events: none;
      animation: floatHeart 1s ease-out forwards;
      color: #ff4d4d;
      z-index: 50;
    }
     @keyframes floatSweat {
      0% { transform: translateY(0) scale(1); opacity: 1; }
      100% { transform: translateY(-20px) scale(1.2); opacity: 0; }
    }
    .sweat-particle {
      position: absolute;
      pointer-events: none;
      animation: floatSweat 1s ease-out forwards;
      color: #60a5fa;
      z-index: 50;
    }
    .pointer-events-auto { pointer-events: auto; }
    @keyframes popIn {
      0% { opacity: 0; transform: scale(0.8); }
      100% { opacity: 1; transform: scale(1); }
    }
    .animate-popIn { animation: popIn 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards; }
  `}</style>
);

// --- Main Component ---

export default function QuestMapTracker() {
  const [config, setConfig] = useState<GlobalConfig>(DEFAULT_CONFIG);
  const [quests, setQuests] = useState<Quest[]>([]);
  
  // UI State
  const [activeModal, setActiveModal] = useState<'none' | 'quests' | 'settings' | 'editor' | 'char_view'>('none');
  const [questTab, setQuestTab] = useState<'active' | 'completed'>('active');
  const [filterTag, setFilterTag] = useState<'All' | QuestTag>('All'); 
  const [charViewTab, setCharViewTab] = useState<'status' | 'achievements'>('status');
  const [showLevelUp, setShowLevelUp] = useState(false);
  const [achievementUnlock, setAchievementUnlock] = useState<string | null>(null);
  const [charDialog, setCharDialog] = useState<string | null>(null);
  const [viewDialog, setViewDialog] = useState<string>("");
  const [updateInfo, setUpdateInfo] = useState<{version: string, message: string} | null>(null);
  
  // Memo State
  const [memoTarget, setMemoTarget] = useState<{questId: string, stepId: string} | null>(null);
  const [memoText, setMemoText] = useState("");

  // Interaction State
  const [focusedQuestId, setFocusedQuestId] = useState<string | null>(null);
  const [editingQuestId, setEditingQuestId] = useState<string | null>(null);
  const [placingStepId, setPlacingStepId] = useState<string | null>(null);
  const [openTagDropdownId, setOpenTagDropdownId] = useState<string | null>(null); 
  
  // Effects
  const [particles, setParticles] = useState<{id: number, x: number, y: number, type: 'heart'|'sweat'}[]>([]);
  const particleIdCounter = useRef(0);
  
  // Panning State (via Mouse Event Handlers now)
  const [panOffset, setPanOffset] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const lastMousePos = useRef({ x: 0, y: 0 });

  // --- Derived State ---
  const activeChar = config.characters.find(c => c.id === config.activeCharacterId) || config.characters[0];
  const activeQuests = quests.filter(q => q.isActive);
  
  const focusedQuest = quests.find(q => q.id === focusedQuestId) || activeQuests[0] || (quests.length > 0 ? quests[0] : null);

  useEffect(() => {
    if (focusedQuest && focusedQuestId !== focusedQuest.id) {
        setFocusedQuestId(focusedQuest.id);
    }
  }, [quests, focusedQuestId]);

  const charPos = focusedQuest 
    ? (focusedQuest.currentStep < focusedQuest.steps.length 
        ? focusedQuest.steps[focusedQuest.currentStep].mapPosition 
        : focusedQuest.steps[focusedQuest.steps.length - 1].mapPosition)
    : [0, 0];

  const viewportOffset = {
      x: (210 - charPos[0]) + panOffset.x,
      y: (210 - charPos[1]) + panOffset.y
  };

  // Load/Save Logic
  useEffect(() => {
    const savedConfig = localStorage.getItem('quest_config_v18');
    const savedQuests = localStorage.getItem('quests_v18');
    if (savedConfig) setConfig(JSON.parse(savedConfig));
    
    if (savedQuests) {
        const parsedQuests = JSON.parse(savedQuests);
        const migratedQuests = parsedQuests.map((q: any) => ({
            ...q,
            tag: q.tag || 'Etc' 
        }));
        setQuests(migratedQuests);
    }
  }, []);

  useEffect(() => {
    localStorage.setItem('quest_config_v18', JSON.stringify(config));
    localStorage.setItem('quests_v18', JSON.stringify(quests));
  }, [config, quests]);

// --- [수정] Version Check Effect ---
  useEffect(() => {
    const checkForUpdates = async () => {
      try {
        // [1] 아래 URL을 본인의 깃허브 주소로 변경해야 함!!
        // 형식: https://raw.githubusercontent.com/[내아이디]/[저장소이름]/main/version.json
        const response = await fetch('https://raw.githubusercontent.com/Naheeria/quest-map/refs/heads/main/version.json');
        const data = await response.json();
        
        // [2] 기존 가짜 데이터(const data = {...}) 부분은 지우거나 주석 처리하세요.

        const lastSeenVersion = localStorage.getItem('last_seen_update_version');

        if (data.latestVersion > CURRENT_APP_VERSION && lastSeenVersion !== data.latestVersion) {
          setUpdateInfo({ version: data.latestVersion, message: data.message });
        }
      } catch (error) {
        console.error("Update check failed", error);
      }
    };
    checkForUpdates();
  }, []);

  // --- Window Event Listeners ---
  useEffect(() => {
      const handleWindowMouseMove = (e: MouseEvent) => {
          if (!isDragging) return;
          const dx = e.clientX - lastMousePos.current.x;
          const dy = e.clientY - lastMousePos.current.y;
          setPanOffset(prev => ({ x: prev.x + dx, y: prev.y + dy }));
          lastMousePos.current = { x: e.clientX, y: e.clientY };
      };
      const handleWindowMouseUp = () => setIsDragging(false);
      if (isDragging) {
          window.addEventListener('mousemove', handleWindowMouseMove);
          window.addEventListener('mouseup', handleWindowMouseUp);
      }
      return () => {
          window.removeEventListener('mousemove', handleWindowMouseMove);
          window.removeEventListener('mouseup', handleWindowMouseUp);
      };
  }, [isDragging]);

  useEffect(() => {
      const handleClickOutside = () => setOpenTagDropdownId(null);
      window.addEventListener('click', handleClickOutside);
      return () => window.removeEventListener('click', handleClickOutside);
  }, []);

  // --- Logic Functions ---

const quitApp = () => {
      try { 
          window.close(); 
      } catch(e) { 
          // 에러 나도 아무것도 안 함 (무시)
          console.log(e); 
      }
  };

  const handleGoToUpdate = () => {
      window.open('https://www.postype.com/', '_blank'); 
  };

  const handleCloseUpdate = () => {
      if (updateInfo) {
          localStorage.setItem('last_seen_update_version', updateInfo.version);
      }
      setUpdateInfo(null);
  };

  const getRandomDialog = () => {
      const availableDialogs = config.customDialogs.filter(d => {
          const match = d.match(/^\[Lv\.(\d+)\]/);
          if (match) return activeChar.affinityLevel >= parseInt(match[1]);
          return true;
      }).map(d => d.replace(/^\[Lv\.\d+\]\s*/, ''));
      if(availableDialogs.length === 0) return "모험 준비 완료!";
      return availableDialogs[Math.floor(Math.random() * availableDialogs.length)];
  };

  // --- Character Management Functions (Restored) ---

  const addNewCharacter = () => {
      const newChar: Character = {
          id: crypto.randomUUID(),
          name: "새로운 모험가",
          imagePath: null,
          level: 1,
          currentExp: 0,
          nextLevelExp: 100,
          affinity: 0,
          affinityLevel: 1,
          unlockedAchievements: []
      };
      setConfig(prev => ({
          ...prev,
          characters: [...prev.characters, newChar],
          activeCharacterId: newChar.id // Switch to new char
      }));
  };

  const updateCharacter = (id: string, field: keyof Character, value: any) => {
      setConfig(prev => ({
          ...prev,
          characters: prev.characters.map(c => c.id === id ? { ...c, [field]: value } : c)
      }));
  };

  const deleteCharacter = (id: string) => {
      if (config.characters.length <= 1) return alert("최소 한 명의 캐릭터는 필요합니다!");
      if (window.confirm("정말 이 캐릭터를 삭제하시겠습니까? (모든 기록이 사라집니다)")) {
          const newChars = config.characters.filter(c => c.id !== id);
          setConfig(prev => ({
              ...prev,
              characters: newChars,
              activeCharacterId: prev.activeCharacterId === id ? newChars[0].id : prev.activeCharacterId
          }));
      }
  };

  const handleProgress = (amount: number, isClickAction: boolean = false) => {
    const charIndex = config.characters.findIndex(c => c.id === config.activeCharacterId);
    if (charIndex === -1) return false;

    const char = config.characters[charIndex];
    let newChar = { ...char };
    const today = new Date().toDateString();

    if (newChar.lastClickDate !== today) {
        newChar.dailyClickCount = 0;
        newChar.lastClickDate = today;
    }

    if (isClickAction) {
        const currentClicks = newChar.dailyClickCount || 0;
        if (currentClicks >= DAILY_CLICK_LIMIT) return false;
        newChar.dailyClickCount = currentClicks + 1;
    }

    // EXP Logic
    if (!isClickAction) {
        let newExp = char.currentExp + amount;
        if (newExp < 0) newExp = 0;
        let newLevel = char.level;
        let nextExp = char.nextLevelExp;
        let leveledUp = false;
        while (newExp >= nextExp) {
            newExp -= nextExp;
            newLevel += 1;
            nextExp = Math.floor(nextExp * 1.2);
            leveledUp = true;
        }
        newChar.level = newLevel;
        newChar.currentExp = newExp;
        newChar.nextLevelExp = nextExp;
        if (leveledUp) {
            setShowLevelUp(true);
            setTimeout(() => setShowLevelUp(false), 3000);
        }
    }

    // Affinity Logic
    const affinityGain = isClickAction ? 1 : (amount > 0 ? 5 : -5);
    let newAffinity = char.affinity + affinityGain;
    if (newAffinity < 0) newAffinity = 0;
    newChar.affinity = newAffinity;
    newChar.affinityLevel = Math.floor(newAffinity / 100) + 1;

    // Achievement Check
    const unlocked = newChar.unlockedAchievements || [];
    const newlyUnlocked: string[] = [];
    
    ACHIEVEMENTS_DATA.forEach(cat => {
        cat.subAchievements.forEach(ach => {
            if (!unlocked.includes(ach.id)) {
                if (ach.condition(newChar, quests)) {
                    newlyUnlocked.push(ach.title);
                    unlocked.push(ach.id);
                }
            }
        });
    });
    newChar.unlockedAchievements = unlocked;

    if (newlyUnlocked.length > 0) {
        setAchievementUnlock(newlyUnlocked[0]);
        setTimeout(() => setAchievementUnlock(null), 3000);
    }

    const newCharacters = [...config.characters];
    newCharacters[charIndex] = newChar;
    setConfig(prev => ({ ...prev, characters: newCharacters }));
    return true;
  };

  const spawnParticle = (x: number, y: number, type: 'heart'|'sweat') => {
      const id = particleIdCounter.current++;
      setParticles(prev => [...prev, { id, x, y, type }]);
      setTimeout(() => setParticles(prev => prev.filter(h => h.id !== id)), 1000);
  };

  const showRandomDialog = (limitReached: boolean) => {
      if (limitReached) {
          const limitDialogs = ["오늘은 여기까지만!", "조금 쉬고 싶어.", "내일 또 봐!", "부끄러워..."];
          setCharDialog(limitDialogs[Math.floor(Math.random() * limitDialogs.length)]);
          setTimeout(() => setCharDialog(null), 2000);
          return;
      }
      const msg = getRandomDialog();
      setCharDialog(msg);
      setTimeout(() => setCharDialog(null), 3000);
  };

  const jumpToLocation = (pos: [number, number]) => {
      setPanOffset({
          x: charPos[0] - pos[0],
          y: charPos[1] - pos[1]
      });
      setActiveModal('none'); 
  };

  const toggleStep = (questId: string, stepId: string) => {
    setQuests(prev => prev.map(q => {
      if (q.id !== questId) return q;
      const stepIndex = q.steps.findIndex(s => s.id === stepId);
      if (stepIndex === -1) return q;
      const step = q.steps[stepIndex];
      const newSteps = [...q.steps];
      let newCurrentStep = q.currentStep;

      if (!step.isCompleted) {
        if (stepIndex !== q.currentStep) return q; 
        newSteps[stepIndex] = { ...step, isCompleted: true };
        handleProgress(step.expReward, false);
        newCurrentStep = Math.min(stepIndex + 1, q.steps.length);
      } else {
        if (stepIndex !== q.currentStep - 1 && !(q.currentStep === q.steps.length && stepIndex === q.steps.length - 1)) {
             if(!window.confirm("주의: 순서를 건너뛰고 취소하시겠습니까?")) return q;
        }
        newSteps[stepIndex] = { ...step, isCompleted: false };
        handleProgress(-step.expReward, false);
        if (stepIndex < newCurrentStep) newCurrentStep = stepIndex;
      }
      return { ...q, steps: newSteps, currentStep: newCurrentStep };
    }));
  };

  const openMemo = (questId: string, stepId: string, currentMemo: string = "") => {
      setMemoTarget({questId, stepId});
      setMemoText(currentMemo || "");
  };

  const saveMemo = () => {
      if (!memoTarget) return;
      setQuests(prev => prev.map(q => {
          if (q.id !== memoTarget.questId) return q;
          return {
              ...q,
              steps: q.steps.map(s => s.id === memoTarget.stepId ? { ...s, memo: memoText } : s)
          };
      }));
      setMemoTarget(null);
  };

  // Image Upload with Size Check
  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>, type: 'map' | 'char', charId?: string) => {
      const file = e.target.files?.[0];
      if (!file) return;
      if (file.size > 3 * 1024 * 1024) { 
          alert("이미지 용량이 너무 큽니다 (3MB 이하 권장).");
          return;
      }
      const reader = new FileReader();
      reader.onload = () => {
          if (type === 'map') {
              setConfig(prev => ({...prev, mapImagePath: reader.result as string}));
          } else {
              // Update specific character image
              const targetId = charId || config.activeCharacterId;
              updateCharacter(targetId, 'imagePath', reader.result);
          }
      };
      reader.readAsDataURL(file);
  };

  const getNextPosition = (steps: QuestStep[], allQuests: Quest[]): [number, number] => {
      const existingPoints: [number, number][] = [];
      allQuests.forEach(q => q.steps.forEach(s => existingPoints.push(s.mapPosition)));
      let startX = 0, startY = 0;
      if (steps.length > 0) {
          const lastPos = steps[steps.length - 1].mapPosition;
          startX = lastPos[0];
          startY = lastPos[1];
      } else {
          startX = (Math.random() - 0.5) * 200;
          startY = (Math.random() - 0.5) * 200;
          return [startX, startY];
      }
      for (let i = 0; i < 15; i++) {
          const offsetX = (Math.random() - 0.5) * 240;
          const offsetY = 80 + Math.random() * 80; 
          const candidate: [number, number] = [startX + offsetX, startY + offsetY];
          let tooClose = false;
          for (const point of existingPoints) {
              if (Math.sqrt(Math.pow(candidate[0] - point[0], 2) + Math.pow(candidate[1] - point[1], 2)) < 60) { 
                  tooClose = true; break;
              }
          }
          if (!tooClose) return candidate;
      }
      return [startX, startY + 100];
  };

  const addStep = (questId: string) => {
      setQuests(quests.map(q => {
          if (q.id !== questId) return q;
          const newPos = getNextPosition(q.steps, quests);
          const newStep: QuestStep = { id: crypto.randomUUID(), text: "새로운 목표", isCompleted: false, expReward: 20, mapPosition: newPos };
          return { ...q, steps: [...q.steps, newStep] };
      }));
  };

  const addNewQuest = () => {
      const startX = (Math.random() - 0.5) * 300;
      const startY = (Math.random() - 0.5) * 300;
      const newQuest: Quest = { 
          id: crypto.randomUUID(), 
          title: "새로운 모험", 
          tag: 'Etc', 
          isActive: true, 
          currentStep: 0, 
          steps: [{ id: crypto.randomUUID(), text: "시작 지점", isCompleted: false, expReward: 10, mapPosition: [startX, startY] }] 
      };
      setQuests([...quests, newQuest]); 
      setEditingQuestId(newQuest.id);
  };

  const startNewSeason = () => {
      if (window.confirm("🗺️ 새 모험을 시작하시겠습니까?\n\n- 캐릭터 레벨/호감도는 유지됩니다.\n- 퀘스트/지도는 초기화됩니다.")) {
          setQuests([]);
          setConfig(prev => ({ ...prev, mapImagePath: null, mapScale: 1.0 }));
          alert("새로운 시즌이 시작되었습니다!");
      }
  };

  const resetAllData = () => {
      if (window.confirm("⚠️ 모든 데이터 삭제: 초기화하시겠습니까?")) {
          localStorage.removeItem('quest_config_v18');
          localStorage.removeItem('quests_v18');
          window.location.reload();
      }
  };

  const handleCharInteract = (e: React.MouseEvent) => {
      e.stopPropagation(); 
      const success = handleProgress(0, true);
      if (success) {
          showRandomDialog(false);
          setViewDialog(getRandomDialog()); 
          spawnParticle(0, -50, 'heart'); 
      } else {
          showRandomDialog(true);
          setViewDialog("오늘은 여기까지만!"); 
          spawnParticle(0, -50, 'sweat');
      }
  };

  const handleMouseDown = (e: React.MouseEvent) => {
      if (placingStepId) return;
      setIsDragging(true);
      lastMousePos.current = { x: e.clientX, y: e.clientY };
  };

  // --- Render ---

  return (
    <div className="flex items-center justify-center min-h-screen bg-transparent p-4 font-cute select-none">
      <CustomStyles />
      
      {/* Widget Frame */}
      <div 
        className="relative w-[420px] h-[420px] rounded-3xl overflow-hidden soft-ui-container bg-white"
        style={{ 
          opacity: config.opacity,
          '--theme-color': config.themeColor
        } as React.CSSProperties}
      >
        {/* 👇 [추가] 윈도우 이동용 투명 손잡이 (상단 60px 영역) */}
        <div 
            className="absolute top-0 left-0 w-full h-[60px] z-20"
            style={{ WebkitAppRegion: 'drag' } as React.CSSProperties} 
        />
        <button onClick={quitApp} className="absolute top-4 right-4 z-50 text-slate-400 hover:text-red-500 transition-colors bg-white/80 rounded-full p-1 shadow-sm" style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties} title="종료"><Power size={16} strokeWidth={3}/></button>

        {/* Update Notification Modal */}
        {updateInfo && (
          <div className="absolute inset-0 z-[70] flex items-center justify-center bg-black/60 backdrop-blur-sm animate-in fade-in" style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}>
            <div className="bg-white rounded-3xl p-6 text-center shadow-2xl animate-popIn max-w-[280px]">
              <div className="flex justify-center mb-4">
                <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center animate-bounce">
                  <Bell size={32} className="text-blue-500 fill-blue-200"/>
                </div>
              </div>
              <h2 className="text-xl font-black text-gray-800 mb-1">업데이트가 있어요!</h2>
              <p className="text-xs text-gray-500 mb-1">v{updateInfo.version}</p>
              <p className="text-sm text-gray-600 mb-5 break-keep whitespace-pre-wrap">
                    {updateInfo.message || "포스타입에서 새로 받아주세요!"}
                </p>
              
              <div className="flex flex-col gap-2">
                <button onClick={handleGoToUpdate} className="w-full py-2.5 bg-blue-500 hover:bg-blue-600 text-white text-sm rounded-xl font-bold shadow-md transition-colors">
                  다운로드 하러 가기
                </button>
                <button onClick={handleCloseUpdate} className="w-full py-2.5 text-gray-400 hover:text-gray-600 text-xs font-medium hover:bg-gray-100 rounded-xl transition-colors">
                  나중에 할게요 (닫기)
                </button>
              </div>
            </div>
          </div>
        )}

        {/* CAMERA LAYER */}
        <div 
            className={`absolute w-full h-full will-change-transform ${isDragging ? 'cursor-grabbing' : 'cursor-grab'}`}
            style={{
                transform: `translate(${viewportOffset.x}px, ${viewportOffset.y}px)`,
                transition: isDragging ? 'none' : 'transform 0.1s ease-out'
            }}
            onMouseDown={handleMouseDown}
            onClick={(e) => {
                if(placingStepId) {
                    const rect = e.currentTarget.getBoundingClientRect();
                    const mapX = (e.clientX - rect.left) - viewportOffset.x;
                    const mapY = (e.clientY - rect.top) - viewportOffset.y;
                    const snappedX = Math.round(mapX / 10) * 10;
                    const snappedY = Math.round(mapY / 10) * 10;
                    setQuests(prev => prev.map(q => q.id === editingQuestId ? {...q, steps: q.steps.map(s => s.id === placingStepId ? {...s, mapPosition:[snappedX, snappedY]} : s)} : q));
                    setPlacingStepId(null);
                }
            }}
        >
            <div className="absolute -top-[5000px] -left-[5000px] w-[10000px] h-[10000px] bg-tabletop-pattern pointer-events-none" style={{ backgroundColor: config.backgroundColor }}/>
            
            {config.mapImagePath && config.isMapTiled ? (
                <div className="absolute -top-[5000px] -left-[5000px] w-[10000px] h-[10000px] pointer-events-none opacity-80" style={{ backgroundImage: `url(${config.mapImagePath})`, backgroundRepeat: 'repeat', backgroundSize: `${config.mapScale * 400}px` }}/>
            ) : (
                <div className="absolute top-1/2 left-1/2 flex items-center justify-center pointer-events-none transition-all duration-300" style={{ transform: `translate(-50%, -50%) scale(${config.mapScale || 1})` }}>
                    {config.mapImagePath ? <div className="relative shadow-2xl rounded-sm"><img src={config.mapImagePath} alt="Map" className="max-w-none object-cover block" /><div className="absolute inset-0 pointer-events-none bg-black/5"></div></div> : <div className="w-[800px] h-[800px] bg-green-100 rounded-xl border-4 border-dashed border-green-200 flex items-center justify-center text-green-800/20 font-bold text-4xl">MAP AREA</div>}
                </div>
            )}

            <svg className="absolute -top-[5000px] -left-[5000px] w-[10000px] h-[10000px] overflow-visible pointer-events-none z-10">
                 <g transform="translate(5000, 5000)">
                    {activeQuests.map(quest => {
                        const isFocused = focusedQuest && quest.id === focusedQuest.id;
                        const isCompleted = quest.steps.every(s => s.isCompleted);
                        return (
                            <g key={quest.id} opacity={isCompleted ? 0.8 : (isFocused ? 1 : 0.3)} className="transition-opacity duration-500">
                                <path d={`M ${quest.steps.map(s => s.mapPosition.join(',')).join(' L ')}`} stroke={isCompleted ? "#FFD700" : (isFocused ? "white" : config.themeColor)} strokeWidth={isCompleted || isFocused ? "6" : "4"} strokeDasharray={isCompleted ? "0" : (isFocused ? "10,10" : "5,5")} fill="none" strokeLinecap="round" className="drop-shadow-sm"/>
                                {quest.steps.map((step, i) => (
                                    <g key={i} transform={`translate(${step.mapPosition[0]}, ${step.mapPosition[1]})`}>
                                        <circle r={step.isCompleted ? "8" : "6"} fill={step.isCompleted ? (isCompleted ? "#FFD700" : "#4ade80") : (isFocused ? "#fff" : "#ccc")} stroke={config.themeColor} strokeWidth="3" className="pointer-events-auto"/>
                                        {step.isCompleted && i === quest.steps.length - 1 && (
                                            <g className="cursor-pointer hover:scale-125 transition-transform pointer-events-auto" onClick={(e) => { e.stopPropagation(); openMemo(quest.id, step.id, step.memo); }} transform="translate(10, -14)"><Flag size={18} fill={step.memo ? "#fbbf24" : "white"} className={step.memo ? "text-yellow-500 drop-shadow-md" : "text-slate-400"} /></g>
                                        )}
                                        {placingStepId === step.id && <circle r="20" stroke="red" strokeWidth="2" fill="none" className="animate-ping" />}
                                    </g>
                                ))}
                            </g>
                        );
                    })}
                 </g>
            </svg>

            <div 
                className="absolute transition-all duration-700 ease-in-out cursor-pointer z-20 btn-bounce no-drag"
                style={{ left: `${charPos[0]}px`, top: `${charPos[1]}px`, transform: 'translate(-50%, -50%)' }}
                onClick={(e) => { if(!placingStepId && !isDragging) handleCharInteract(e); }}
            >
                <div className="animate-float-soft">
                    {activeChar.imagePath ? <div className="w-20 h-20 relative flex items-center justify-center filter drop-shadow-2xl hover:scale-110 transition-transform"><img src={activeChar.imagePath} alt="Char" className="w-full h-full object-contain" /></div> : <div className="w-20 h-20"><DefaultCuteChar /></div>}
                </div>
                {particles.map(p => (
                    p.type === 'heart' ? <Heart key={p.id} size={20} fill="#ff4d4d" className="heart-particle" style={{ left: '50%', top: '0', marginLeft: '-10px' }} /> : <span key={p.id} className="sweat-particle text-lg" style={{ left: '50%', top: '0', marginLeft: '-10px' }}>💦</span>
                ))}
                {charDialog && <div className="absolute -top-10 left-1/2 transform -translate-x-1/2 bg-white text-slate-700 text-xs font-bold px-3 py-1 rounded-xl shadow-lg border border-slate-100 w-max max-w-[140px] text-center z-50 animate-in fade-in slide-in-from-bottom-2">{charDialog}<div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-3 h-3 bg-white border-b border-r border-slate-100 transform rotate-45"></div></div>}
            </div>
        </div>

        {/* --- UI Overlays --- */}
        
        {memoTarget && (
             <div className="absolute inset-0 bg-black/50 z-50 flex items-center justify-center p-6 animate-in fade-in no-drag" onClick={() => setMemoTarget(null)}>
                 <div className="bg-white w-full max-w-sm rounded-3xl p-4 shadow-2xl transform scale-100 transition-all" onClick={e => e.stopPropagation()}>
                     <div className="flex justify-between items-center mb-4"><h3 className="text-sm font-bold text-slate-700 flex items-center gap-2"><Flag size={16} className="text-blue-500"/> 모험의 족적 (메모)</h3><button onClick={() => setMemoTarget(null)}><X size={18} className="text-slate-400"/></button></div>
                     <textarea className="w-full h-32 bg-yellow-50 border border-yellow-200 rounded-xl p-3 text-sm text-slate-700 font-bold resize-none outline-none" placeholder="메모..." value={memoText} onChange={e => setMemoText(e.target.value)} autoFocus />
                     <div className="flex justify-end mt-3"><button onClick={saveMemo} className="flex items-center gap-1 bg-blue-500 text-white px-4 py-2 rounded-xl text-xs font-bold"><Save size={14}/> 저장</button></div>
                 </div>
             </div>
        )}

        {placingStepId && <div className="absolute inset-0 bg-black/20 z-50 flex items-center justify-center pointer-events-none" style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}><div className="bg-white px-4 py-2 rounded-full shadow-lg text-sm font-bold animate-bounce text-slate-700 flex items-center gap-2"><Target className="text-red-500" size={16}/> 지도 클릭하여 위치 수정</div></div>}
        {(panOffset.x !== 0 || panOffset.y !== 0) && <button onClick={() => setPanOffset({x:0, y:0})} className="absolute bottom-20 left-1/2 transform -translate-x-1/2 bg-slate-800 text-white px-4 py-2 rounded-full shadow-lg text-xs font-bold flex items-center gap-2 z-40 hover:bg-slate-700" style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}><LocateFixed size={14}/> 내 위치로</button>}
        
        {achievementUnlock && (
            <div className="absolute top-20 left-1/2 transform -translate-x-1/2 bg-white px-4 py-3 rounded-xl shadow-2xl z-50 animate-in fade-in slide-in-from-top-4 border-2 border-yellow-400 flex flex-col items-center" style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}>
                <Trophy size={24} className="text-yellow-500 mb-1 animate-bounce"/>
                <div className="text-[10px] text-slate-400 font-bold uppercase">업적 달성!</div>
                <div className="text-sm font-black text-slate-800">{achievementUnlock}</div>
            </div>
        )}

        <div className="absolute top-4 left-4 z-30 flex items-start gap-2 pointer-events-none">
             <button onClick={() => { setViewDialog(getRandomDialog()); setActiveModal('char_view'); }} className="w-14 h-14 rounded-full bg-white border-2 border-slate-100 shadow-md flex items-center justify-center overflow-hidden hover:scale-105 transition-transform pointer-events-auto flex-shrink-0" style={{ borderColor: config.themeColor, WebkitAppRegion: 'no-drag' } as React.CSSProperties}>
                {activeChar.imagePath ? <img src={activeChar.imagePath} className="w-full h-full object-cover"/> : <div className="w-8 h-8"><DefaultCuteChar/></div>}
             </button>
             <div className="bg-white/90 backdrop-blur-sm p-2 rounded-xl shadow-sm border-2 border-slate-100 w-28 pointer-events-auto flex flex-col gap-1" style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}>
                 <div className="text-[10px] font-bold text-slate-700 text-center truncate leading-tight"><span className="text-yellow-500 mr-1">Lv.{activeChar.level}</span>{activeChar.name}</div>
                 <div className="w-full h-1.5 bg-slate-200 rounded-full overflow-hidden"><div className="h-full bg-yellow-400" style={{ width: `${(activeChar.currentExp / activeChar.nextLevelExp) * 100}%` }} /></div>
                 <div className="w-full h-1.5 bg-pink-100 rounded-full overflow-hidden"><div className="h-full bg-pink-400" style={{ width: `${activeChar.affinity % 100}%` }} /></div>
            </div>
        </div>

        {/* Quest Info (Right) */}
        <div className="absolute top-4 right-12 z-30 w-40 pointer-events-none no-drag">
            {focusedQuest ? (
                <button 
                    onClick={() => setActiveModal('quests')}
                    className="w-full bg-white/90 backdrop-blur-sm p-2 rounded-xl shadow-sm border-2 border-slate-100 text-left pointer-events-auto transition-transform hover:scale-105"
                >
                     <div className="flex justify-between items-center mb-1">
                         <span className="text-[8px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
                             <Focus size={8} className="text-blue-400"/> FOCUS
                         </span>
                         <span className="text-[8px] font-bold text-slate-400">
                             {Math.min(focusedQuest.currentStep + 1, focusedQuest.steps.length)}/{focusedQuest.steps.length}
                         </span>
                     </div>
                     <div className="text-xs font-bold text-slate-700 truncate mb-0.5">{focusedQuest.title}</div>
                     
                     {/* [추가됨] 현재 진행 중인 단계 표시 */}
                     <div className="text-[9px] text-slate-500 truncate flex items-center gap-1">
                        <div className="w-1 h-1 rounded-full bg-blue-400 shrink-0 animate-pulse"/>
                        {focusedQuest.currentStep < focusedQuest.steps.length 
                            ? focusedQuest.steps[focusedQuest.currentStep].text 
                            : "모든 임무 완료!"}
                     </div>
                </button>
            ) : (
                <div className="w-full bg-white/90 backdrop-blur-sm p-2 rounded-xl shadow-sm border-2 border-slate-100 text-center pointer-events-auto">
                    <span className="text-[10px] font-bold text-slate-400">NO QUEST</span>
                </div>
            )}
        </div>

        <div className="absolute bottom-4 right-4 flex space-x-3 z-40" style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}>
            <button onClick={() => setActiveModal('editor')} className="w-12 h-12 bg-slate-800 hover:bg-slate-700 text-white rounded-full shadow-lg border-2 border-slate-600 flex items-center justify-center transition-all btn-bounce"><Edit3 size={18} /></button>
            <button onClick={() => setActiveModal('quests')} className="w-12 h-12 bg-white hover:bg-slate-50 text-slate-600 rounded-full shadow-lg border-2 border-slate-100 flex items-center justify-center transition-all btn-bounce"><Scroll size={20} /></button>
            <button onClick={() => setActiveModal('settings')} className="w-12 h-12 bg-white hover:bg-slate-50 text-slate-600 rounded-full shadow-lg border-2 border-slate-100 flex items-center justify-center transition-all btn-bounce"><Settings size={20} /></button>
        </div>

        {showLevelUp && <div className="absolute inset-0 z-50 flex items-center justify-center bg-white/60 backdrop-blur-sm animate-in zoom-in duration-300 no-drag" style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}><div className="bg-white p-6 rounded-3xl shadow-2xl text-center border-4 border-yellow-100 transform -rotate-2"><div className="text-4xl mb-2 animate-bounce">🎉</div><div className="text-2xl font-black text-slate-800 mb-1">LEVEL UP!</div><div className="text-sm font-bold text-slate-500">Lv.{activeChar.level} 달성 축하해요!</div></div></div>}

        {/* --- Modals --- */}

        {activeModal === 'char_view' && (
             <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm z-50 p-4 animate-in fade-in flex items-center justify-center" onClick={() => setActiveModal('none')} style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}>
                 <div className="bg-white w-full max-w-[320px] h-[400px] rounded-3xl shadow-2xl overflow-hidden flex flex-col" onClick={e => e.stopPropagation()}>
                     <div className="relative h-40 bg-slate-100 flex items-center justify-center shrink-0" style={{ backgroundColor: config.backgroundColor }}>
                         <button onClick={() => setActiveModal('none')} className="absolute top-3 right-3 text-slate-400 hover:text-slate-600"><X size={20}/></button>
                         <div className="absolute inset-0 bg-tabletop-pattern pointer-events-none opacity-50"/>
                         <div className="relative w-32 h-32 cursor-pointer transition-transform active:scale-95 animate-float-soft" onClick={handleCharInteract}>
                             {activeChar.imagePath ? <img src={activeChar.imagePath} className="w-full h-full object-contain drop-shadow-lg"/> : <div className="w-full h-full p-2"><DefaultCuteChar/></div>}
                            {particles.map(p => (p.type === 'heart' ? <Heart key={p.id} size={30} fill="#ff4d4d" className="heart-particle" style={{ left: '50%', top: '50%', marginTop: '-40px', marginLeft: '-15px' }} /> : <span key={p.id} className="sweat-particle text-2xl" style={{ left: '50%', top: '50%', marginTop: '-40px', marginLeft: '-15px' }}>💦</span>))}
                         </div>
                     </div>
                     <div className="flex bg-slate-50 p-1 border-b border-slate-100">
                         <button onClick={() => setCharViewTab('status')} className={`flex-1 text-xs font-bold py-2 rounded-lg ${charViewTab==='status' ? 'bg-white shadow text-slate-800' : 'text-slate-400'}`}>상태</button>
                         <button onClick={() => setCharViewTab('achievements')} className={`flex-1 text-xs font-bold py-2 rounded-lg ${charViewTab==='achievements' ? 'bg-white shadow text-slate-800' : 'text-slate-400'}`}>업적</button>
                     </div>
                     <div className="p-5 text-center flex-1 overflow-y-auto">
                         {charViewTab === 'status' ? (
                             <>
                                <h2 className="text-xl font-black text-slate-800 mb-1">{activeChar.name}</h2>
                                <p className="text-xs text-slate-500 font-bold mb-4">"{viewDialog}"</p>
                                <div className="grid grid-cols-2 gap-3 mb-4">
                                    <div className="bg-yellow-50 p-3 rounded-2xl border border-yellow-100">
                                        <div className="text-[10px] font-bold text-yellow-600 uppercase">Level</div>
                                        <div className="text-xl font-black text-yellow-500">{activeChar.level}</div>
                                        <div className="text-[10px] text-yellow-400">{Math.floor((activeChar.currentExp/activeChar.nextLevelExp)*100)}% EXP</div>
                                    </div>
                                    <div className="bg-pink-50 p-3 rounded-2xl border border-pink-100">
                                        <div className="text-[10px] font-bold text-pink-600 uppercase">Affinity</div>
                                        <div className="text-xl font-black text-pink-500">{activeChar.affinityLevel}</div>
                                        <div className="text-[10px] text-pink-400">{activeChar.dailyClickCount}/{DAILY_CLICK_LIMIT} Clicks</div>
                                    </div>
                                </div>
                             </>
                         ) : (
                             <div className="space-y-3 text-left">
                                 {ACHIEVEMENTS_DATA.map(cat => {
                                     const unlockedCount = cat.subAchievements.filter(ach => (activeChar.unlockedAchievements || []).includes(ach.id)).length;
                                     const totalCount = cat.subAchievements.length;
                                     const progress = (unlockedCount / totalCount) * 100;
                                     const Icon = cat.icon;
                                     return (
                                         <div key={cat.id} className="bg-slate-50 rounded-xl border border-slate-200 p-3">
                                             <div className="flex items-center justify-between mb-2">
                                                 <div className="flex items-center gap-2 font-bold text-xs text-slate-700"><Icon size={14} className="text-slate-400"/> {cat.title}</div>
                                                 <div className="text-[10px] font-bold text-slate-400">{Math.round(progress)}%</div>
                                             </div>
                                             <div className="w-full h-1.5 bg-slate-200 rounded-full mb-3 overflow-hidden"><div className="h-full bg-blue-400 transition-all duration-500" style={{width: `${progress}%`}}/></div>
                                             <div className="space-y-1">
                                                 {cat.subAchievements.map(ach => {
                                                     const isUnlocked = (activeChar.unlockedAchievements || []).includes(ach.id);
                                                     return (
                                                         <div key={ach.id} className={`flex items-center justify-between text-[10px] p-1 rounded ${isUnlocked ? 'bg-blue-50 text-blue-700' : 'text-slate-300'}`}>
                                                             <span className="font-bold">{ach.title}</span>
                                                             {isUnlocked && <CheckCircle2 size={10}/>}
                                                         </div>
                                                     )
                                                 })}
                                             </div>
                                         </div>
                                     );
                                 })}
                             </div>
                         )}
                     </div>
                 </div>
             </div>
        )}

        {activeModal === 'quests' && (
            <div className="absolute inset-0 bg-slate-900/20 backdrop-blur-sm z-50 p-4 animate-in fade-in" style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}>
                <div className="bg-white w-full h-full rounded-3xl shadow-2xl flex flex-col overflow-hidden">
                    <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                        <h2 className="text-lg font-black text-slate-700 flex items-center gap-2"><Scroll size={20} className="text-slate-400"/> 모험 기록</h2>
                        <button onClick={() => setActiveModal('none')}><X size={20} className="text-slate-500"/></button>
                    </div>
                    <div className="flex flex-col p-2 gap-2 bg-slate-50">
                        <div className="flex gap-2">
                            <button onClick={() => setQuestTab('active')} className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all ${questTab === 'active' ? 'bg-white shadow text-slate-800' : 'text-slate-400 hover:bg-white/50'}`}>진행 중</button>
                            <button onClick={() => setQuestTab('completed')} className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all ${questTab === 'completed' ? 'bg-yellow-50 shadow text-yellow-700 border border-yellow-100' : 'text-slate-400 hover:bg-white/50'}`}>완료됨</button>
                        </div>
                         <div className="flex gap-1 overflow-x-auto pb-1 scrollbar-hide">
                            <button onClick={() => setFilterTag('All')} className={`px-2 py-1 rounded-lg text-[10px] font-bold flex-shrink-0 border ${filterTag === 'All' ? 'bg-slate-800 text-white border-slate-800' : 'bg-white text-slate-500 border-slate-200'}`}>전체</button>
                            {Object.entries(TAG_CONFIG).map(([key, conf]) => {
                                const Icon = conf.icon;
                                return <button key={key} onClick={() => setFilterTag(key as QuestTag)} className={`px-2 py-1 rounded-lg text-[10px] font-bold flex-shrink-0 border flex items-center gap-1 transition-all ${filterTag === key ? conf.color : 'bg-white text-slate-400 border-slate-200 grayscale'}`}><Icon size={10}/> {conf.label}</button>
                            })}
                        </div>
                    </div>
                    <div className="p-4 overflow-y-auto flex-1 space-y-4">
                        {quests.filter(q => {
                            const completed = q.steps.every(s => s.isCompleted);
                            const tabMatch = questTab === 'active' ? (q.isActive && !completed) : completed;
                            const tagMatch = filterTag === 'All' || q.tag === filterTag;
                            return tabMatch && tagMatch;
                        }).map(quest => {
                             const TagIcon = TAG_CONFIG[quest.tag]?.icon || Box;
                             const TagColor = TAG_CONFIG[quest.tag]?.color || 'bg-slate-100 text-slate-700';
                             const TagLabel = TAG_CONFIG[quest.tag]?.label || '기타';
                             return (
                                <div key={quest.id} className={`p-4 rounded-2xl border-2 transition-all ${quest.steps.every(s => s.isCompleted) ? 'border-yellow-300 bg-yellow-50/50' : (focusedQuest && focusedQuestId === quest.id ? 'border-blue-200 bg-blue-50/30' : 'border-slate-100 bg-slate-50/50')}`}>
                                    <div className="flex justify-between items-center mb-3">
                                        <div className="flex flex-col">
                                            <div className={`self-start text-[9px] px-1.5 py-0.5 rounded mb-1 flex items-center gap-1 border ${TagColor}`}><TagIcon size={8}/> {TagLabel}</div>
                                            <h3 className={`font-bold ${quest.steps.every(s => s.isCompleted) ? 'text-yellow-800 flex items-center gap-1' : 'text-slate-700'}`}>{quest.title} {quest.steps.every(s => s.isCompleted) && <Trophy size={14}/>}</h3>
                                        </div>
                                        {!quest.steps.every(s => s.isCompleted) && focusedQuestId !== quest.id && (
                                            <button onClick={() => setFocusedQuestId(quest.id)} className="text-xs bg-white border border-slate-200 px-3 py-1.5 rounded-full font-bold text-slate-600 shadow-sm hover:bg-blue-50 hover:text-blue-600">포커스</button>
                                        )}
                                    </div>
                                    <div className="space-y-3">
                                        {quest.steps.map((step, idx) => (
                                            // [수정됨] onClick에 jumpToLocation 연결 & 커서 포인터 추가
                                            <div 
                                                key={step.id} 
                                                className="flex items-center gap-3 cursor-pointer hover:bg-slate-100 p-2 rounded-lg transition-colors group" 
                                                onClick={() => jumpToLocation(step.mapPosition)}
                                                title="클릭하여 이 위치로 이동"
                                            >
                                                <button 
                                                    disabled={quest.steps.every(s => s.isCompleted) || (!step.isCompleted && idx !== quest.currentStep)} 
                                                    onClick={(e) => { e.stopPropagation(); toggleStep(quest.id, step.id); }} 
                                                    className={`w-8 h-8 shrink-0 rounded-full flex items-center justify-center border-2 transition-all btn-bounce ${step.isCompleted ? 'bg-green-400 border-green-400 text-white' : idx === quest.currentStep ? 'bg-white border-yellow-400 text-yellow-500 shadow-md scale-110' : 'bg-slate-100 border-slate-200 text-slate-300'}`}
                                                >
                                                    {step.isCompleted ? <Undo2 size={16} /> : <CheckCircle2 size={16} strokeWidth={3} />}
                                                </button>
                                                <div className="flex-1">
                                                    <div className={`text-sm font-bold ${step.isCompleted ? 'text-slate-400 line-through' : 'text-slate-700'}`}>{step.text}</div>
                                                    <div className="text-[10px] text-slate-400 font-bold flex items-center gap-2 mt-0.5">
                                                        <span>{step.isCompleted ? '완료됨' : `+${step.expReward} EXP`}</span>
                                                        
                                                        {/* [추가됨] 이동 가능함을 알리는 배지 (마우스 올리면 색상 변경) */}
                                                        <span className="text-[9px] text-blue-400 bg-blue-50 px-1.5 py-0.5 rounded border border-blue-100 flex items-center gap-1 group-hover:bg-blue-500 group-hover:text-white group-hover:border-blue-500 transition-colors">
                                                            <LocateFixed size={8}/> 이동
                                                        </span>
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                             )
                        })}
                    </div>
                </div>
            </div>
        )}

        {activeModal === 'editor' && (
             <div className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm z-50 p-4 animate-in fade-in" style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}>
                <div className="bg-white w-full h-full rounded-3xl shadow-2xl flex flex-col overflow-hidden">
                    <div className="p-3 border-b border-slate-100 flex justify-between items-center bg-slate-800 text-white">
                        <h2 className="text-sm font-bold flex items-center gap-2"><Edit3 size={16}/> 퀘스트 관리자</h2>
                        <button onClick={() => { setActiveModal('none'); setPlacingStepId(null); }}><X size={18} /></button>
                    </div>
                    <div className="p-2 border-b border-slate-100 flex justify-end">
                        <button onClick={addNewQuest} className="flex items-center gap-1 text-[10px] bg-blue-100 text-blue-600 px-2 py-1 rounded-lg font-bold"><Plus size={12}/> 추가</button>
                    </div>
                    <div className="flex-1 overflow-y-auto bg-slate-50 p-3 space-y-4">
                        {quests.map(quest => {
                            const TagIcon = TAG_CONFIG[quest.tag]?.icon || Box;
                            const TagLabel = TAG_CONFIG[quest.tag]?.label || '기타';
                            const TagColor = TAG_CONFIG[quest.tag]?.color || 'bg-slate-100 text-slate-700';

                            return (
                                <div key={quest.id} className="bg-white border border-slate-200 rounded-xl p-3 shadow-sm">
                                    <div className="flex flex-col gap-2 mb-2">
                                        <div className="flex items-center gap-2">
                                            {/* 1. 태그 버튼 (이전 수정 사항 유지) */}
                                            <div className="relative shrink-0">
                                                <button 
                                                    onClick={(e) => { e.stopPropagation(); setOpenTagDropdownId(openTagDropdownId === quest.id ? null : quest.id); }}
                                                    className={`text-xs px-3 py-1.5 rounded-lg flex items-center gap-1.5 border font-bold whitespace-nowrap ${TagColor}`}
                                                >
                                                    <TagIcon size={12}/> {TagLabel}
                                                </button>
                                                {openTagDropdownId === quest.id && (
                                                    <div className="absolute top-full left-0 mt-1 bg-white border border-slate-200 rounded-lg shadow-xl p-1 grid grid-cols-1 z-50 w-max min-w-[100px] animate-in fade-in zoom-in-95 duration-100">
                                                        {Object.entries(TAG_CONFIG).map(([key, conf]) => {
                                                            const Icon = conf.icon;
                                                            return (
                                                                <button 
                                                                    key={key} 
                                                                    onClick={(e) => { 
                                                                        e.stopPropagation();
                                                                        setQuests(prev => prev.map(q => q.id === quest.id ? {...q, tag: key as QuestTag} : q));
                                                                        setOpenTagDropdownId(null);
                                                                    }} 
                                                                    className="text-xs p-2 hover:bg-slate-100 text-left rounded flex items-center gap-2 text-slate-600 whitespace-nowrap"
                                                                >
                                                                    <Icon size={14}/> {conf.label}
                                                                </button>
                                                            )
                                                        })}
                                                    </div>
                                                )}
                                            </div>

                                            {/* 2. 입력창 수정: min-w-0 추가 (중요! 이게 있어야 태그가 커져도 입력창이 알아서 줄어듦) */}
                                            <input 
                                                type="text" 
                                                value={quest.title} 
                                                onChange={(e) => setQuests(prev => prev.map(q => q.id === quest.id ? {...q, title: e.target.value} : q))} 
                                                className="text-sm font-bold text-slate-700 bg-transparent outline-none flex-1 min-w-0 border-b border-transparent focus:border-blue-300"
                                            />

                                            {/* 3. 버튼 그룹 수정: shrink-0 추가 (공간이 좁아져도 버튼이 찌그러지거나 밀려나지 않음) */}
                                            <div className="flex gap-1 shrink-0">
                                                <button onClick={() => setEditingQuestId(editingQuestId === quest.id ? null : quest.id)} className="p-1.5 bg-slate-100 text-slate-400 rounded-lg"><Edit3 size={14}/></button>
                                                <button onClick={() => { if(confirm("삭제?")) setQuests(quests.filter(q => q.id !== quest.id)); }} className="p-1.5 bg-red-50 text-red-400 rounded-lg"><Trash2 size={14}/></button>
                                            </div>
                                        </div>
                                    </div>
                                    {editingQuestId === quest.id && (
                                        <div className="mt-2 space-y-2 border-t border-slate-100 pt-2 pl-2">
                                            {quest.steps.map((step, idx) => (
                                                <div key={step.id} className="flex flex-col gap-2 bg-slate-50 p-2 rounded-lg border border-slate-100">
                                                    <div className="flex gap-2"><span className="text-xs text-slate-400">{idx+1}</span><input value={step.text} onChange={(e) => setQuests(prev => prev.map(q => q.id === quest.id ? {...q, steps: q.steps.map(s => s.id === step.id ? {...s, text: e.target.value} : s)} : q))} className="text-xs flex-1 bg-white border border-slate-200 rounded p-1"/></div>
                                                    <button onClick={() => { setPlacingStepId(step.id); setActiveModal('none'); }} className={`text-[10px] py-1 rounded border flex items-center justify-center gap-1 ${placingStepId === step.id ? 'bg-red-50 text-red-500' : 'bg-white'}`}><Target size={10}/> {placingStepId === step.id ? '지도 클릭하여 배치...' : '위치 수정'}</button>
                                                </div>
                                            ))}
                                            <button onClick={() => addStep(quest.id)} className="w-full text-[10px] py-2 bg-blue-50 text-blue-600 rounded-lg border border-blue-100 flex items-center justify-center gap-1"><Sparkles size={10}/> 다음 단계 자동 추가</button>
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </div>
             </div>
        )}

        {activeModal === 'settings' && (
            <div className="absolute inset-0 bg-slate-900/20 backdrop-blur-sm z-50 p-4 animate-in fade-in" style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}>
                <div className="bg-white w-full h-full rounded-3xl shadow-2xl flex flex-col overflow-hidden">
                    <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                        <h2 className="text-lg font-black text-slate-700 flex items-center gap-2"><Settings size={20} className="text-slate-400"/> 설정</h2>
                        <button onClick={() => setActiveModal('none')}><X size={20} className="text-slate-500"/></button>
                    </div>

                    <div className="p-5 overflow-y-auto flex-1 space-y-6">
                        
                        <div className="space-y-2">
                            <label className="text-xs font-bold text-slate-400 uppercase">테마 색상</label>
                            <div className="flex gap-2">
                                {['#8b5e3c', '#ef5350', '#ec4899', '#a855f7', '#3b82f6', '#10b981', '#f59e0b', '#374151'].map(color => (
                                    <button
                                        key={color}
                                        onClick={() => setConfig({...config, themeColor: color})}
                                        className={`w-8 h-8 rounded-full border-2 transition-transform hover:scale-110 ${config.themeColor === color ? 'border-white ring-2 ring-slate-300 scale-110' : 'border-transparent'}`}
                                        style={{ backgroundColor: color }}
                                    />
                                ))}
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label className="text-xs font-bold text-slate-400 uppercase flex justify-between items-center">
                                <span>캐릭터 관리</span>
                                <div className="flex items-center gap-2 text-[10px] text-slate-400">
                                    <span className="flex items-center gap-1"><Trophy size={10}/> {ACHIEVEMENTS_DATA.reduce((acc, cat) => acc + cat.subAchievements.filter(a => (activeChar.unlockedAchievements || []).includes(a.id)).length, 0)}</span>
                                    <button onClick={addNewCharacter} className="text-blue-500 flex items-center gap-1"><Plus size={10}/> 추가</button>
                                </div>
                            </label>
                            <div className="grid grid-cols-2 gap-2">
                                {config.characters.map(char => (
                                    <div key={char.id} className={`p-2 rounded-xl border-2 cursor-pointer transition-all ${config.activeCharacterId === char.id ? 'border-blue-400 bg-blue-50' : 'border-slate-200 bg-white'}`} onClick={() => setConfig({...config, activeCharacterId: char.id})}>
                                        <div className="flex justify-between items-center mb-1">
                                            <span className="text-[10px] font-bold text-slate-500">Lv.{char.level} <span className="text-pink-400">♥{char.affinityLevel}</span></span>
                                            {config.characters.length > 1 && <button onClick={(e) => { e.stopPropagation(); deleteCharacter(char.id); }} className="text-red-400"><Trash2 size={10}/></button>}
                                        </div>
                                        <div className="text-xs font-bold text-slate-700 truncate mb-2">{char.name}</div>
                                        <input 
                                            type="text" 
                                            value={char.name} 
                                            onClick={(e) => e.stopPropagation()}
                                            onChange={(e) => updateCharacter(char.id, 'name', e.target.value)}
                                            className="w-full text-[10px] bg-white border border-slate-200 rounded px-1 mb-1"
                                            placeholder="이름 변경"
                                        />
                                        <label className="block w-full text-center bg-slate-100 text-[8px] text-slate-500 rounded py-1 cursor-pointer hover:bg-slate-200">
                                            이미지 변경
                                            <input type="file" accept="image/*" className="hidden" onChange={(e) => handleImageUpload(e, 'char', char.id)} />
                                        </label>
                                    </div>
                                ))}
                            </div>
                        </div>

                         <div className="space-y-2">
                            <label className="text-xs font-bold text-slate-400 uppercase flex items-center gap-2">
                                대사 편집 (Tip: [Lv.숫자]로 해금 조건 설정)
                            </label>
                            <textarea 
                                value={config.customDialogs.join('\n')}
                                onChange={(e) => setConfig({...config, customDialogs: e.target.value.split('\n')})}
                                className="w-full h-24 bg-slate-50 rounded-xl px-4 py-3 text-xs font-bold text-slate-600 outline-none resize-none border border-slate-100 focus:border-blue-300"
                                placeholder="예시:&#13;&#10;안녕?&#13;&#10;[Lv.5] 이제 꽤 친해졌네!&#13;&#10;[Lv.10] 넌 최고의 파트너야."
                            />
                        </div>

                        <div className="space-y-2 pt-2 border-t border-slate-100">
                             <label className="flex flex-col items-center justify-center p-3 rounded-xl border-2 border-dashed border-slate-200 hover:border-blue-400 hover:bg-blue-50 cursor-pointer bg-slate-50 text-center">
                                <span className="text-xs font-bold text-slate-600">지도 이미지 변경</span>
                                <input type="file" accept="image/*" className="hidden" onChange={(e) => handleImageUpload(e, 'map')} />
                            </label>
                             <div className="flex justify-between items-center mt-2">
                                <span className="text-xs text-slate-500">지도 배율 (x{config.mapScale})</span>
                                <input type="range" min="0.5" max="5.0" step="0.1" value={config.mapScale} onChange={(e) => setConfig({...config, mapScale: parseFloat(e.target.value)})} className="w-24 accent-blue-500"/>
                            </div>
                            <div className="flex items-center justify-between mt-2">
                                <span className="text-xs text-slate-500">지도 패턴 반복 (타일링)</span>
                                <button 
                                    onClick={() => setConfig({...config, isMapTiled: !config.isMapTiled})}
                                    className={`w-10 h-5 rounded-full flex items-center transition-colors px-1 ${config.isMapTiled ? 'bg-blue-500 justify-end' : 'bg-slate-300 justify-start'}`}
                                >
                                    <div className="w-3 h-3 bg-white rounded-full shadow-sm"/>
                                </button>
                            </div>
                        </div>
                        
                        <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                             <button onClick={startNewSeason} className="w-full bg-white text-slate-600 border border-slate-200 py-2 rounded-lg text-xs font-bold hover:bg-slate-100 transition-colors flex items-center justify-center gap-2">
                                <RefreshCw size={12}/> 새로운 시즌 시작 (지도/퀘스트 초기화)
                             </button>
                        </div>

                        <div className="pt-2 mt-2 border-t border-slate-100">
                             <button onClick={resetAllData} className="w-full bg-red-50 hover:bg-red-100 text-red-500 py-3 rounded-xl text-xs font-bold transition-colors flex items-center justify-center gap-2 border border-red-100">
                                <AlertTriangle size={14}/> 모든 데이터 초기화
                             </button>
                        </div>
                    </div>
                </div>
            </div>
        )}
      </div>
    </div>
  );
}