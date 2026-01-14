import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import Icon from '@/components/ui/icon';
import { useToast } from '@/hooks/use-toast';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

interface GameState {
  coins: number;
  clickPower: number;
  autoClickPower: number;
  level: number;
  lastDailyReward: string | null;
  dailyStreak: number;
  referralsCount: number;
  userId: string;
  boosts: {
    clickMultiplier: { level: number; cost: number };
    autoClicker: { level: number; cost: number };
    passiveIncome: { level: number; cost: number };
  };
}

const LEVEL_THRESHOLDS = [0, 100, 500, 2000, 10000, 50000];

const Index = () => {
  const { toast } = useToast();
  const [gameState, setGameState] = useState<GameState>(() => {
    const saved = localStorage.getItem('clickerGame');
    const defaultState = {
      coins: 0,
      clickPower: 1,
      autoClickPower: 0,
      level: 1,
      lastDailyReward: null,
      dailyStreak: 0,
      referralsCount: 0,
      userId: Math.random().toString(36).substring(2, 11),
      boosts: {
        clickMultiplier: { level: 0, cost: 50 },
        autoClicker: { level: 0, cost: 100 },
        passiveIncome: { level: 0, cost: 200 }
      }
    };
    
    if (saved) {
      const parsed = JSON.parse(saved);
      return {
        ...defaultState,
        ...parsed,
        userId: parsed.userId || defaultState.userId,
        referralsCount: parsed.referralsCount || 0
      };
    }
    
    return defaultState;
  });

  const [clickAnimation, setClickAnimation] = useState(false);
  const [showDailyReward, setShowDailyReward] = useState(false);
  const [dailyRewardAmount, setDailyRewardAmount] = useState(0);
  const [coinPulse, setCoinPulse] = useState(false);
  const [floatingNumbers, setFloatingNumbers] = useState<Array<{ id: number; value: number; x: number; y: number }>>([]);
  const [rocketVisible, setRocketVisible] = useState(false);
  const [rocketPosition, setRocketPosition] = useState({ x: 0, y: 0 });
  const [boostActive, setBoostActive] = useState(false);
  const [boostTimeLeft, setBoostTimeLeft] = useState(0);
  const [adsgramController, setAdsgramController] = useState<any>(null);
  const [gamePaused, setGamePaused] = useState(false);
  const [showReferralDialog, setShowReferralDialog] = useState(false);
  const [referralLinkCopied, setReferralLinkCopied] = useState(false);

  useEffect(() => {
    localStorage.setItem('clickerGame', JSON.stringify(gameState));
  }, [gameState]);

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const refId = urlParams.get('ref');
    
    if (refId && refId !== gameState.userId) {
      const hasClaimedRef = localStorage.getItem(`claimed_ref_${refId}`);
      
      if (!hasClaimedRef) {
        localStorage.setItem(`claimed_ref_${refId}`, 'true');
        
        setGameState(prev => ({
          ...prev,
          coins: prev.coins + 1000
        }));
        
        toast({
          title: "🎉 Бонус за реферала!",
          description: "Вы получили 1000 монет за переход по реферальной ссылке!",
        });
      }
    }
  }, []);

  const getReferralLink = () => {
    const baseUrl = window.location.origin + window.location.pathname;
    return `https://t.me/ruble_rush_coin_bot?start=${gameState.userId}`;
  };

  const copyReferralLink = () => {
    const link = getReferralLink();
    navigator.clipboard.writeText(link).then(() => {
      setReferralLinkCopied(true);
      toast({
        title: "✅ Скопировано!",
        description: "Реферальная ссылка скопирована в буфер обмена",
      });
      setTimeout(() => setReferralLinkCopied(false), 3000);
    });
  };

  const shareReferralLink = () => {
    const link = getReferralLink();
    const text = `🪙 Присоединяйся к RUBLE CLICKER и получи 1000 монет в подарок!`;
    const telegramUrl = `https://t.me/share/url?url=${encodeURIComponent(link)}&text=${encodeURIComponent(text)}`;
    window.open(telegramUrl, '_blank');
  };

  useEffect(() => {
    if (typeof window !== 'undefined' && (window as any).Adsgram) {
      const AdController = (window as any).Adsgram.init({ blockId: "21002" });
      setAdsgramController(AdController);
    }
  }, []);

  useEffect(() => {
    let timeoutId: number;
    let animationFrameId: number;
    
    const spawnRocket = () => {
      const randomDelay = Math.random() * 25 * 60000 + 5 * 60000;
      timeoutId = window.setTimeout(() => {
        if (!boostActive) {
          const startX = Math.random() * (window.innerWidth - 100);
          const startY = window.innerHeight + 100;
          setRocketPosition({ x: startX, y: startY });
          setRocketVisible(true);
          
          const flyDuration = 5000;
          const startTime = Date.now();
          const isFlying = true;
          
          const animateRocket = () => {
            const elapsed = Date.now() - startTime;
            const progress = elapsed / flyDuration;
            
            if (progress < 1 && isFlying) {
              const newY = startY - (window.innerHeight + 200) * progress;
              const wobble = Math.sin(progress * 10) * 30;
              setRocketPosition({ x: startX + wobble, y: newY });
              animationFrameId = requestAnimationFrame(animateRocket);
            } else {
              setRocketVisible(false);
              spawnRocket();
            }
          };
          
          animateRocket();
        } else {
          spawnRocket();
        }
      }, randomDelay);
    };
    
    spawnRocket();
    
    return () => {
      if (timeoutId) clearTimeout(timeoutId);
      if (animationFrameId) cancelAnimationFrame(animationFrameId);
    };
  }, [boostActive]);

  useEffect(() => {
    if (boostActive && boostTimeLeft > 0) {
      const timer = setInterval(() => {
        setBoostTimeLeft(prev => {
          if (prev <= 1) {
            setBoostActive(false);
            toast({
              title: "⏱️ Буст закончился",
              description: "Ловите следующую ракету для нового буста!",
            });
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
      return () => clearInterval(timer);
    }
  }, [boostActive, boostTimeLeft]);

  useEffect(() => {
    const today = new Date().toDateString();
    const lastReward = gameState.lastDailyReward;
    
    if (!lastReward || lastReward !== today) {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const isConsecutive = lastReward === yesterday.toDateString();
      
      const newStreak = isConsecutive ? gameState.dailyStreak + 1 : 1;
      const baseReward = 50;
      const streakBonus = (newStreak - 1) * 20;
      const totalReward = baseReward + streakBonus;
      
      setDailyRewardAmount(totalReward);
      setShowDailyReward(true);
    }
  }, []);

  const claimDailyReward = () => {
    const today = new Date().toDateString();
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const isConsecutive = gameState.lastDailyReward === yesterday.toDateString();
    
    const newStreak = isConsecutive ? gameState.dailyStreak + 1 : 1;
    
    setGameState(prev => ({
      ...prev,
      coins: prev.coins + dailyRewardAmount,
      lastDailyReward: today,
      dailyStreak: newStreak
    }));
    
    setShowDailyReward(false);
    setCoinPulse(true);
    setTimeout(() => setCoinPulse(false), 300);
    
    toast({
      title: "🎁 Ежедневная награда получена!",
      description: `+${dailyRewardAmount} монет! Серия: ${newStreak} ${newStreak === 1 ? 'день' : newStreak < 5 ? 'дня' : 'дней'}`,
    });
  };

  useEffect(() => {
    if (gameState.autoClickPower > 0) {
      const interval = setInterval(() => {
        setGameState(prev => ({
          ...prev,
          coins: prev.coins + prev.autoClickPower
        }));
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [gameState.autoClickPower]);

  useEffect(() => {
    const newLevel = LEVEL_THRESHOLDS.findIndex(threshold => gameState.coins < threshold);
    const calculatedLevel = newLevel === -1 ? LEVEL_THRESHOLDS.length : newLevel;
    
    if (calculatedLevel > gameState.level) {
      setGameState(prev => ({ ...prev, level: calculatedLevel }));
      toast({
        title: "🎉 Новый уровень!",
        description: `Вы достигли ${calculatedLevel} уровня!`,
      });
    }
  }, [gameState.coins]);

  const showRewardedAd = (rewardCallback: () => void) => {
    if (adsgramController) {
      setGamePaused(true);
      adsgramController.show().then(() => {
        rewardCallback();
        setGamePaused(false);
      }).catch((error: any) => {
        console.log('Реклама не показана:', error);
        setGamePaused(false);
        toast({
          title: "❌ Ошибка",
          description: "Не удалось загрузить рекламу",
          variant: "destructive"
        });
      });
    } else {
      rewardCallback();
    }
  };

  const catchRocket = () => {
    if (rocketVisible && !gamePaused) {
      setRocketVisible(false);
      
      showRewardedAd(() => {
        setBoostActive(true);
        setBoostTimeLeft(15);
        
        if ('vibrate' in navigator) {
          navigator.vibrate([100, 50, 100]);
        }
        
        toast({
          title: "🚀 Буст активирован!",
          description: "Сила клика увеличена на 50% на 15 секунд!",
        });
      });
    }
  };

  const handleClick = (e: React.MouseEvent<HTMLButtonElement> | React.TouchEvent<HTMLButtonElement>) => {
    if (gamePaused) return;
    
    const effectivePower = boostActive ? Math.floor(gameState.clickPower * 1.5) : gameState.clickPower;
    
    setGameState(prev => ({
      ...prev,
      coins: prev.coins + effectivePower
    }));
    setClickAnimation(true);
    setCoinPulse(true);
    
    if ('vibrate' in navigator) {
      navigator.vibrate(50);
    }
    
    const rect = e.currentTarget.getBoundingClientRect();
    let x, y;
    
    if ('touches' in e) {
      x = e.touches[0].clientX - rect.left;
      y = e.touches[0].clientY - rect.top;
    } else {
      x = e.clientX - rect.left;
      y = e.clientY - rect.top;
    }
    
    const newNumber = {
      id: Date.now() + Math.random(),
      value: effectivePower,
      x,
      y
    };
    
    setFloatingNumbers(prev => [...prev, newNumber]);
    
    setTimeout(() => {
      setFloatingNumbers(prev => prev.filter(num => num.id !== newNumber.id));
    }, 1000);
    
    setTimeout(() => {
      setClickAnimation(false);
      setCoinPulse(false);
    }, 200);
  };

  const buyBoost = (boostType: keyof GameState['boosts']) => {
    if (gamePaused) return;
    
    const boost = gameState.boosts[boostType];
    
    if (boostType === 'passiveIncome') {
      showRewardedAd(() => {
        const newLevel = boost.level + 1;
        const newCost = Math.floor(boost.cost * 1.5);
        
        setGameState(prev => {
          const updated = { ...prev };
          updated.boosts[boostType] = { level: newLevel, cost: newCost };
          updated.autoClickPower += newLevel * 5;
          return updated;
        });
        
        toast({
          title: "✅ Пассивный доход получен!",
          description: `Уровень: ${newLevel}. +${newLevel * 5}/сек`,
        });
      });
      return;
    }
    
    if (gameState.coins >= boost.cost) {
      const newLevel = boost.level + 1;
      const newCost = Math.floor(boost.cost * 1.5);
      
      setGameState(prev => {
        const updated = { ...prev };
        updated.coins -= boost.cost;
        updated.boosts[boostType] = { level: newLevel, cost: newCost };
        
        if (boostType === 'clickMultiplier') {
          updated.clickPower = 1 + newLevel;
        } else if (boostType === 'autoClicker') {
          updated.autoClickPower = newLevel * 2;
        }
        
        return updated;
      });
      
      toast({
        title: "✅ Буст куплен!",
        description: `Уровень буста: ${newLevel}`,
      });
    } else {
      toast({
        title: "❌ Недостаточно монет",
        description: `Нужно ещё ${boost.cost - gameState.coins} монет`,
        variant: "destructive"
      });
    }
  };

  const currentLevelProgress = () => {
    if (gameState.level >= LEVEL_THRESHOLDS.length) return 100;
    const current = LEVEL_THRESHOLDS[gameState.level - 1];
    const next = LEVEL_THRESHOLDS[gameState.level];
    return ((gameState.coins - current) / (next - current)) * 100;
  };

  const nextLevelCoins = () => {
    return gameState.level >= LEVEL_THRESHOLDS.length 
      ? "MAX" 
      : LEVEL_THRESHOLDS[gameState.level];
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-purple-950/20 pb-24 sm:pb-4 flex flex-col">
      <div className="max-w-4xl mx-auto w-full flex-1 flex flex-col p-2 sm:p-4">
        <header className="mb-3 sm:mb-6 text-center pt-2 sm:pt-6">
          <h1 className="text-2xl sm:text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-primary via-secondary to-accent mb-1">
            💰 RUBLE CLICKER
          </h1>
          <p className="text-muted-foreground text-xs sm:text-lg">Кликай, прокачивайся, зарабатывай!</p>
        </header>

        <Card className={`p-2 sm:p-4 mb-3 sm:mb-6 bg-gradient-to-r from-primary/20 via-secondary/20 to-accent/20 border-2 ${coinPulse ? 'coin-pulse' : ''}`}>
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-2 sm:gap-3">
              <div className="w-8 h-8 sm:w-12 sm:h-12 rounded-full overflow-hidden flex items-center justify-center">
                <img 
                  src="https://cdn.poehali.dev/files/rouble-coin-3d-icon-isolated-transparent-background_936869-2627.png"
                  alt="Ruble Coin"
                  className="w-full h-full object-contain"
                  draggable={false}
                />
              </div>
              <div>
                <p className="text-[10px] sm:text-sm text-muted-foreground">Ваш баланс</p>
                <h2 className="text-xl sm:text-3xl font-black text-foreground">{gameState.coins.toLocaleString()}</h2>
              </div>
            </div>
            <div className="text-right">
              {boostActive && (
                <Badge className="mb-1 text-[10px] sm:text-sm bg-accent animate-pulse">
                  <Icon name="Rocket" size={10} className="mr-0.5 sm:mr-1 sm:w-3.5 sm:h-3.5" />
                  🚀 {boostTimeLeft}с
                </Badge>
              )}
              {!boostActive && (
                <Badge variant="outline" className="mb-1 text-[10px] sm:text-sm">
                  <Icon name="Flame" size={10} className="mr-0.5 sm:mr-1 text-accent sm:w-3.5 sm:h-3.5" />
                  {gameState.dailyStreak}
                </Badge>
              )}
              <p className="text-[10px] sm:text-sm text-muted-foreground">Ур. {gameState.level}</p>
            </div>
          </div>
        </Card>

        <Tabs defaultValue="main" className="w-full flex-1 flex flex-col">
          <TabsContent value="main" className="flex-1 flex flex-col">
            <Card className="p-2 sm:p-6 mb-3 sm:mb-6 bg-gradient-to-br from-card to-card/50 border-2 border-primary/20">
              <div className="mb-2">
                <div className="flex justify-between text-[10px] sm:text-sm mb-1">
                  <span>До уровня {gameState.level + 1}</span>
                  <span className="font-bold">{nextLevelCoins()}</span>
                </div>
                <Progress value={currentLevelProgress()} className="h-1.5 sm:h-3" />
              </div>
              
              <div className="flex justify-between items-center">
                <Badge variant="secondary" className="text-[10px] sm:text-base px-2 py-0.5 sm:px-4 sm:py-2">
                  <Icon name="TrendingUp" size={12} className="mr-1 sm:mr-2 sm:w-5 sm:h-5" />
                  +{gameState.clickPower}/клик
                </Badge>
                {gameState.autoClickPower > 0 && (
                  <div className="flex items-center gap-1 text-accent">
                    <Icon name="Repeat" size={12} className="sm:w-[18px] sm:h-[18px]" />
                    <span className="text-[10px] sm:text-base font-semibold">+{gameState.autoClickPower}/сек</span>
                  </div>
                )}
              </div>
            </Card>

            <div className="flex-1 flex items-center justify-center relative touch-none select-none">
              <Button
                onClick={handleClick}
                onTouchStart={handleClick}
                size="lg"
                className={`w-56 h-56 sm:w-80 sm:h-80 rounded-full p-0 bg-transparent active:scale-95 sm:hover:scale-105 transition-all duration-200 border-0 shadow-2xl shadow-yellow-500/50 relative overflow-visible ${
                  clickAnimation ? 'click-animation' : ''
                }`}
                style={{ 
                  background: 'transparent',
                  WebkitTapHighlightColor: 'transparent',
                  touchAction: 'manipulation'
                }}
              >
                <div className="w-full h-full rounded-full flex items-center justify-center">
                  <img 
                    src="https://cdn.poehali.dev/files/rouble-coin-3d-icon-isolated-transparent-background_936869-2627.png"
                    alt="Ruble Coin"
                    className={`w-full h-full object-contain drop-shadow-2xl ${boostActive ? 'rocket-boost-active' : ''}`}
                    draggable={false}
                    style={{
                      WebkitUserSelect: 'none',
                      userSelect: 'none',
                      filter: boostActive 
                        ? 'drop-shadow(0 20px 40px rgba(251, 146, 60, 0.8)) brightness(1.3)' 
                        : 'drop-shadow(0 20px 40px rgba(234, 179, 8, 0.5))'
                    }}
                  />
                </div>
                {floatingNumbers.map((num) => (
                  <span
                    key={num.id}
                    className="absolute text-2xl sm:text-4xl font-black text-accent float-number pointer-events-none"
                    style={{
                      left: `${num.x}px`,
                      top: `${num.y}px`,
                      textShadow: '0 0 10px rgba(0,0,0,0.8), 0 0 20px rgba(251,146,60,0.5)'
                    }}
                  >
                    +{num.value}
                  </span>
                ))}
              </Button>
            </div>

          </TabsContent>

          <TabsContent value="shop" className="space-y-4">
            <Card className="p-6 bg-gradient-to-br from-primary/5 to-transparent border-primary/20">
              <div className="flex items-center gap-3 mb-4">
                <Icon name="Sparkles" size={32} className="text-primary" />
                <div>
                  <h3 className="text-2xl font-bold">Множитель кликов</h3>
                  <p className="text-sm text-muted-foreground">Увеличивает силу каждого клика</p>
                </div>
              </div>
              <div className="flex justify-between items-center">
                <div>
                  <Badge variant="outline" className="mb-2">Уровень {gameState.boosts.clickMultiplier.level}</Badge>
                  <p className="text-sm">Сила клика: <span className="font-bold text-primary">{1 + gameState.boosts.clickMultiplier.level}</span></p>
                </div>
                <Button 
                  onClick={() => buyBoost('clickMultiplier')}
                  size="lg"
                  className="bg-primary hover:bg-primary/90"
                >
                  <Icon name="Coins" size={20} className="mr-2" />
                  {gameState.boosts.clickMultiplier.cost}
                </Button>
              </div>
            </Card>

            <Card className="p-6 bg-gradient-to-br from-secondary/5 to-transparent border-secondary/20">
              <div className="flex items-center gap-3 mb-4">
                <Icon name="MousePointerClick" size={32} className="text-secondary" />
                <div>
                  <h3 className="text-2xl font-bold">Автокликер</h3>
                  <p className="text-sm text-muted-foreground">Автоматические клики каждую секунду</p>
                </div>
              </div>
              <div className="flex justify-between items-center">
                <div>
                  <Badge variant="outline" className="mb-2">Уровень {gameState.boosts.autoClicker.level}</Badge>
                  <p className="text-sm">Доход: <span className="font-bold text-secondary">+{gameState.boosts.autoClicker.level * 2}/сек</span></p>
                </div>
                <Button 
                  onClick={() => buyBoost('autoClicker')}
                  size="lg"
                  className="bg-secondary hover:bg-secondary/90"
                >
                  <Icon name="Coins" size={20} className="mr-2" />
                  {gameState.boosts.autoClicker.cost}
                </Button>
              </div>
            </Card>

            <Card className="p-6 bg-gradient-to-br from-accent/5 to-transparent border-accent/20">
              <div className="flex items-center gap-3 mb-4">
                <Icon name="Rocket" size={32} className="text-accent" />
                <div>
                  <h3 className="text-2xl font-bold">Пассивный доход</h3>
                  <p className="text-sm text-muted-foreground">Генератор монет в фоновом режиме</p>
                </div>
              </div>
              <div className="flex justify-between items-center">
                <div>
                  <Badge variant="outline" className="mb-2">Уровень {gameState.boosts.passiveIncome.level}</Badge>
                  <p className="text-sm">Доход: <span className="font-bold text-accent">+{gameState.boosts.passiveIncome.level * 5}/сек</span></p>
                </div>
                <Button 
                  onClick={() => buyBoost('passiveIncome')}
                  size="lg"
                  className="bg-accent hover:bg-accent/90"
                >
                  <Icon name="Video" size={20} className="mr-2" />
                  Смотреть рекламу
                </Button>
              </div>
            </Card>
          </TabsContent>

          <TabsContent value="boosts" className="space-y-4">
            <Card className="p-6 bg-gradient-to-br from-card to-card/50">
              <h3 className="text-2xl font-bold mb-4 flex items-center gap-2">
                <Icon name="Award" size={28} className="text-primary" />
                Активные бусты
              </h3>
              
              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 bg-primary/10 rounded-lg">
                  <div className="flex items-center gap-3">
                    <Icon name="Sparkles" size={24} className="text-primary" />
                    <div>
                      <p className="font-bold">Множитель кликов</p>
                      <p className="text-sm text-muted-foreground">Уровень {gameState.boosts.clickMultiplier.level}</p>
                    </div>
                  </div>
                  <Badge variant="secondary">+{gameState.boosts.clickMultiplier.level} к силе</Badge>
                </div>

                <div className="flex items-center justify-between p-4 bg-secondary/10 rounded-lg">
                  <div className="flex items-center gap-3">
                    <Icon name="MousePointerClick" size={24} className="text-secondary" />
                    <div>
                      <p className="font-bold">Автокликер</p>
                      <p className="text-sm text-muted-foreground">Уровень {gameState.boosts.autoClicker.level}</p>
                    </div>
                  </div>
                  <Badge variant="secondary">+{gameState.boosts.autoClicker.level * 2}/сек</Badge>
                </div>

                <div className="flex items-center justify-between p-4 bg-accent/10 rounded-lg">
                  <div className="flex items-center gap-3">
                    <Icon name="Rocket" size={24} className="text-accent" />
                    <div>
                      <p className="font-bold">Пассивный доход</p>
                      <p className="text-sm text-muted-foreground">Уровень {gameState.boosts.passiveIncome.level}</p>
                    </div>
                  </div>
                  <Badge variant="secondary">+{gameState.boosts.passiveIncome.level * 5}/сек</Badge>
                </div>
              </div>

              <div className="mt-6 p-4 bg-gradient-to-r from-primary/20 via-secondary/20 to-accent/20 rounded-lg">
                <p className="text-center text-sm">
                  <Icon name="Info" size={16} className="inline mr-1" />
                  Покупайте бусты в магазине для увеличения дохода
                </p>
              </div>
            </Card>

            <Card className="p-6 bg-gradient-to-br from-green-500/10 to-transparent border-green-500/20">
              <div className="text-center mb-6">
                <div className="text-5xl mb-3">👥</div>
                <h3 className="text-2xl font-bold mb-2">Приглашай друзей!</h3>
                <p className="text-muted-foreground">Получай <span className="text-green-500 font-bold">1000 монет</span> за каждого друга</p>
              </div>

              <div className="bg-gradient-to-r from-green-500/20 to-primary/20 rounded-lg p-4 mb-4">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm text-muted-foreground">Приглашено друзей:</span>
                  <Badge variant="default" className="bg-green-500">
                    <Icon name="Users" size={14} className="mr-1" />
                    {gameState.referralsCount}
                  </Badge>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Заработано:</span>
                  <div className="flex items-center gap-2">
                    <img 
                      src="https://cdn.poehali.dev/files/rouble-coin-3d-icon-isolated-transparent-background_936869-2627.png"
                      alt="Coin"
                      className="w-5 h-5 object-contain"
                      draggable={false}
                    />
                    <span className="font-bold text-green-500">{gameState.referralsCount * 1000}</span>
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <Button 
                  onClick={shareReferralLink}
                  size="lg"
                  className="w-full bg-gradient-to-r from-green-500 to-primary hover:opacity-90"
                >
                  <Icon name="Share2" size={20} className="mr-2" />
                  Поделиться ссылкой
                </Button>
                
                <Button 
                  onClick={copyReferralLink}
                  variant="outline"
                  size="lg"
                  className="w-full"
                >
                  <Icon name={referralLinkCopied ? "Check" : "Copy"} size={20} className="mr-2" />
                  {referralLinkCopied ? "Скопировано!" : "Скопировать ссылку"}
                </Button>
              </div>

              <div className="mt-4 p-3 bg-muted/20 rounded-lg">
                <p className="text-xs text-center text-muted-foreground">
                  <Icon name="Info" size={12} className="inline mr-1" />
                  Ваш друг получит 1000 монет при первом входе по вашей ссылке
                </p>
              </div>
            </Card>

            <Card className="p-6 bg-gradient-to-br from-primary/5 to-transparent">
              <h3 className="text-xl font-bold mb-4">🏆 Достижения</h3>
              <div className="grid grid-cols-2 gap-4">
                <div className={`p-4 rounded-lg text-center ${gameState.level >= 2 ? 'bg-primary/20' : 'bg-muted/20 opacity-50'}`}>
                  <p className="text-3xl mb-2">🥉</p>
                  <p className="text-sm font-bold">Новичок</p>
                  <p className="text-xs text-muted-foreground">Уровень 2</p>
                </div>
                <div className={`p-4 rounded-lg text-center ${gameState.level >= 3 ? 'bg-primary/20' : 'bg-muted/20 opacity-50'}`}>
                  <p className="text-3xl mb-2">🥈</p>
                  <p className="text-sm font-bold">Профи</p>
                  <p className="text-xs text-muted-foreground">Уровень 3</p>
                </div>
                <div className={`p-4 rounded-lg text-center ${gameState.level >= 4 ? 'bg-primary/20' : 'bg-muted/20 opacity-50'}`}>
                  <p className="text-3xl mb-2">🥇</p>
                  <p className="text-sm font-bold">Мастер</p>
                  <p className="text-xs text-muted-foreground">Уровень 4</p>
                </div>
                <div className={`p-4 rounded-lg text-center ${gameState.level >= 5 ? 'bg-primary/20' : 'bg-muted/20 opacity-50'}`}>
                  <p className="text-3xl mb-2">💎</p>
                  <p className="text-sm font-bold">Легенда</p>
                  <p className="text-xs text-muted-foreground">Уровень 5</p>
                </div>
              </div>
            </Card>
          </TabsContent>

          <TabsContent value="rewards" className="space-y-4">
            <Card className="p-6 bg-gradient-to-br from-primary via-secondary to-accent text-white">
              <div className="text-center mb-6">
                <div className="text-6xl mb-4">🎁</div>
                <h3 className="text-3xl font-black mb-2">Ежедневные награды</h3>
                <p className="text-white/90">Заходи каждый день и получай бонусы!</p>
              </div>

              <div className="bg-white/10 backdrop-blur-sm rounded-lg p-6 mb-4">
                <div className="flex justify-between items-center mb-4">
                  <div>
                    <p className="text-sm text-white/70">Текущая серия</p>
                    <div className="flex items-center gap-2">
                      <Icon name="Flame" size={28} className="text-accent" />
                      <span className="text-4xl font-black">{gameState.dailyStreak}</span>
                      <span className="text-lg">{gameState.dailyStreak === 1 ? 'день' : gameState.dailyStreak < 5 ? 'дня' : 'дней'}</span>
                    </div>
                  </div>
                  <div className="text-right flex flex-col items-end">
                    <p className="text-sm text-white/70 mb-2">Следующая награда</p>
                    <div className="flex items-center gap-2">
                      <img 
                        src="https://cdn.poehali.dev/files/rouble-coin-3d-icon-isolated-transparent-background_936869-2627.png"
                        alt="Coin"
                        className="w-8 h-8 object-contain"
                        draggable={false}
                      />
                      <p className="text-2xl font-bold">{50 + gameState.dailyStreak * 20}</p>
                    </div>
                  </div>
                </div>
                
                {gameState.lastDailyReward === new Date().toDateString() ? (
                  <div className="bg-green-500/20 border border-green-500/50 rounded-lg p-4 text-center">
                    <Icon name="CheckCircle" size={32} className="mx-auto mb-2 text-green-400" />
                    <p className="font-bold">Награда за сегодня получена!</p>
                    <p className="text-sm text-white/70">Возвращайся завтра за новой наградой</p>
                  </div>
                ) : (
                  <Button 
                    onClick={() => setShowDailyReward(true)}
                    size="lg" 
                    className="w-full bg-white text-primary hover:bg-white/90 font-bold text-lg"
                  >
                    <Icon name="Gift" size={24} className="mr-2" />
                    Получить награду
                  </Button>
                )}
              </div>

              <div className="grid grid-cols-7 gap-2">
                {[1, 2, 3, 4, 5, 6, 7].map((day) => (
                  <div 
                    key={day}
                    className={`p-3 rounded-lg text-center ${
                      day <= gameState.dailyStreak 
                        ? 'bg-white/20 border-2 border-white/50' 
                        : 'bg-white/5 border-2 border-white/10'
                    }`}
                  >
                    <p className="text-xs mb-1">День {day}</p>
                    <div className="flex items-center justify-center gap-1">
                      <img 
                        src="https://cdn.poehali.dev/files/rouble-coin-3d-icon-isolated-transparent-background_936869-2627.png"
                        alt="Coin"
                        className="w-4 h-4 object-contain"
                        draggable={false}
                      />
                      <p className="text-sm font-bold">{50 + (day - 1) * 20}</p>
                    </div>
                  </div>
                ))}
              </div>
            </Card>

            <Card className="p-6 bg-gradient-to-br from-card to-card/50">
              <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
                <Icon name="Star" size={24} className="text-accent" />
                Бонусы за достижения
              </h3>
              <div className="space-y-3">
                <div className={`p-4 rounded-lg flex justify-between items-center ${
                  gameState.coins >= 100 ? 'bg-primary/20 border-2 border-primary' : 'bg-muted/10'
                }`}>
                  <div className="flex items-center gap-3">
                    <img 
                      src="https://cdn.poehali.dev/files/rouble-coin-3d-icon-isolated-transparent-background_936869-2627.png"
                      alt="Coin"
                      className="w-12 h-12 object-contain"
                      draggable={false}
                    />
                    <div>
                      <p className="font-bold">Первая сотня</p>
                      <p className="text-sm text-muted-foreground">Заработай 100 монет</p>
                    </div>
                  </div>
                  {gameState.coins >= 100 && (
                    <Badge variant="default" className="bg-primary">
                      <Icon name="Check" size={16} className="mr-1" />
                      Выполнено
                    </Badge>
                  )}
                </div>

                <div className={`p-4 rounded-lg flex justify-between items-center ${
                  gameState.dailyStreak >= 3 ? 'bg-secondary/20 border-2 border-secondary' : 'bg-muted/10'
                }`}>
                  <div className="flex items-center gap-3">
                    <img 
                      src="https://cdn.poehali.dev/files/rouble-coin-3d-icon-isolated-transparent-background_936869-2627.png"
                      alt="Coin"
                      className="w-12 h-12 object-contain"
                      draggable={false}
                    />
                    <div>
                      <p className="font-bold">Упорство</p>
                      <p className="text-sm text-muted-foreground">3 дня подряд</p>
                    </div>
                  </div>
                  {gameState.dailyStreak >= 3 && (
                    <Badge variant="default" className="bg-secondary">
                      <Icon name="Check" size={16} className="mr-1" />
                      Выполнено
                    </Badge>
                  )}
                </div>

                <div className={`p-4 rounded-lg flex justify-between items-center ${
                  gameState.dailyStreak >= 7 ? 'bg-accent/20 border-2 border-accent' : 'bg-muted/10'
                }`}>
                  <div className="flex items-center gap-3">
                    <img 
                      src="https://cdn.poehali.dev/files/rouble-coin-3d-icon-isolated-transparent-background_936869-2627.png"
                      alt="Coin"
                      className="w-12 h-12 object-contain"
                      draggable={false}
                    />
                    <div>
                      <p className="font-bold">Легенда</p>
                      <p className="text-sm text-muted-foreground">7 дней подряд</p>
                    </div>
                  </div>
                  {gameState.dailyStreak >= 7 && (
                    <Badge variant="default" className="bg-accent">
                      <Icon name="Check" size={16} className="mr-1" />
                      Выполнено
                    </Badge>
                  )}
                </div>
              </div>
            </Card>
          </TabsContent>

          <TabsContent value="wallet" className="flex-1 flex items-center justify-center">
            <Card className="p-8 text-center bg-gradient-to-br from-card to-card/50">
              <Icon name="Wallet" size={64} className="mx-auto mb-4 text-muted-foreground" />
              <h3 className="text-2xl font-bold mb-2">Кошелек</h3>
              <p className="text-lg text-muted-foreground">Coming Soon</p>
            </Card>
          </TabsContent>
          <div className="fixed bottom-0 left-0 right-0 bg-card/95 backdrop-blur-sm border-t border-border z-50">
            <div className="max-w-4xl mx-auto">
              <TabsList className="grid w-full grid-cols-5 h-16 bg-transparent rounded-none">
                <TabsTrigger value="main" className="flex-col gap-1 data-[state=active]:bg-primary/20">
                  <Icon name="Home" size={20} />
                  <span className="text-[10px]">Главная</span>
                </TabsTrigger>
                <TabsTrigger value="shop" className="flex-col gap-1 data-[state=active]:bg-primary/20">
                  <Icon name="ShoppingCart" size={20} />
                  <span className="text-[10px]">Магазин</span>
                </TabsTrigger>
                <TabsTrigger value="boosts" className="flex-col gap-1 data-[state=active]:bg-primary/20">
                  <Icon name="Zap" size={20} />
                  <span className="text-[10px]">Бусты</span>
                </TabsTrigger>
                <TabsTrigger value="rewards" className="flex-col gap-1 data-[state=active]:bg-primary/20">
                  <Icon name="Gift" size={20} />
                  <span className="text-[10px]">Награды</span>
                </TabsTrigger>
                <TabsTrigger value="wallet" className="flex-col gap-1 data-[state=active]:bg-primary/20">
                  <Icon name="Wallet" size={20} />
                  <span className="text-[10px]">Кошелек</span>
                </TabsTrigger>
              </TabsList>
            </div>
          </div>
        </Tabs>

        {rocketVisible && (
          <div
            onClick={catchRocket}
            onTouchStart={catchRocket}
            className="fixed cursor-pointer z-50 animate-pulse"
            style={{
              left: `${rocketPosition.x}px`,
              top: `${rocketPosition.y}px`,
              transform: 'translate(-50%, -50%)',
              transition: 'none',
              pointerEvents: 'auto'
            }}
          >
            <div className="relative">
              <div className="text-6xl sm:text-7xl drop-shadow-2xl" style={{ filter: 'drop-shadow(0 0 20px rgba(251, 146, 60, 0.8))' }}>
                🚀
              </div>
              <div className="absolute -top-12 left-1/2 transform -translate-x-1/2 bg-accent text-white px-3 py-1 rounded-full text-xs font-bold whitespace-nowrap animate-bounce">
                +50% на 15с!
              </div>
            </div>
          </div>
        )}

        <Dialog open={showDailyReward} onOpenChange={setShowDailyReward}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="text-3xl font-black text-center mb-4">
                🎉 Ежедневная награда!
              </DialogTitle>
              <DialogDescription className="text-center space-y-6">
                <div className="bg-gradient-to-br from-primary via-secondary to-accent p-8 rounded-2xl">
                  <div className="text-7xl mb-4">🪙</div>
                  <p className="text-5xl font-black text-white mb-2">
                    +{dailyRewardAmount}
                  </p>
                  <p className="text-white/90 text-lg">монет</p>
                </div>
                
                <div className="flex items-center justify-center gap-2 text-lg">
                  <Icon name="Flame" size={24} className="text-accent" />
                  <span className="font-bold">
                    Серия: {gameState.lastDailyReward ? 
                      (new Date().toDateString() === new Date(new Date(gameState.lastDailyReward).getTime() + 86400000).toDateString() 
                        ? gameState.dailyStreak + 1 
                        : 1)
                      : 1} 
                    {gameState.dailyStreak + 1 === 1 ? ' день' : gameState.dailyStreak + 1 < 5 ? ' дня' : ' дней'}
                  </span>
                </div>

                <p className="text-muted-foreground">
                  Заходи каждый день, чтобы увеличить серию и получать больше монет!
                </p>

                <Button 
                  onClick={claimDailyReward}
                  size="lg"
                  className="w-full bg-gradient-to-r from-primary via-secondary to-accent hover:opacity-90 text-white font-bold text-lg"
                >
                  <Icon name="Gift" size={24} className="mr-2" />
                  Забрать награду
                </Button>
              </DialogDescription>
            </DialogHeader>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
};

export default Index;