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
    return saved ? JSON.parse(saved) : {
      coins: 0,
      clickPower: 1,
      autoClickPower: 0,
      level: 1,
      lastDailyReward: null,
      dailyStreak: 0,
      boosts: {
        clickMultiplier: { level: 0, cost: 50 },
        autoClicker: { level: 0, cost: 100 },
        passiveIncome: { level: 0, cost: 200 }
      }
    };
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

  useEffect(() => {
    localStorage.setItem('clickerGame', JSON.stringify(gameState));
  }, [gameState]);

  useEffect(() => {
    const spawnRocket = () => {
      const randomDelay = Math.random() * 30000 + 20000;
      setTimeout(() => {
        if (!boostActive) {
          const startX = Math.random() * (window.innerWidth - 100);
          const startY = window.innerHeight + 100;
          setRocketPosition({ x: startX, y: startY });
          setRocketVisible(true);
          
          const flyDuration = 5000;
          const startTime = Date.now();
          
          const animateRocket = () => {
            const elapsed = Date.now() - startTime;
            const progress = elapsed / flyDuration;
            
            if (progress < 1 && rocketVisible) {
              const newY = startY - (window.innerHeight + 200) * progress;
              const wobble = Math.sin(progress * 10) * 30;
              setRocketPosition({ x: startX + wobble, y: newY });
              requestAnimationFrame(animateRocket);
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

  const catchRocket = () => {
    if (rocketVisible) {
      setRocketVisible(false);
      setBoostActive(true);
      setBoostTimeLeft(15);
      
      if ('vibrate' in navigator) {
        navigator.vibrate([100, 50, 100]);
      }
      
      toast({
        title: "🚀 Ракета поймана!",
        description: "Сила клика увеличена на 50% на 15 секунд!",
      });
    }
  };

  const handleClick = (e: React.MouseEvent<HTMLButtonElement> | React.TouchEvent<HTMLButtonElement>) => {
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
    
    const effectivePower = boostActive ? Math.floor(gameState.clickPower * 1.5) : gameState.clickPower;
    
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
    const boost = gameState.boosts[boostType];
    
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
        } else if (boostType === 'passiveIncome') {
          updated.autoClickPower += newLevel * 5;
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
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-purple-950/20 p-2 sm:p-4 pb-safe">
      <div className="max-w-4xl mx-auto">
        <header className="mb-4 sm:mb-6 text-center pt-2 sm:pt-6">
          <h1 className="text-3xl sm:text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-primary via-secondary to-accent mb-2">
            💰 RUBLE CLICKER
          </h1>
          <p className="text-muted-foreground text-sm sm:text-lg">Кликай, прокачивайся, зарабатывай!</p>
        </header>

        <Card className={`p-3 sm:p-4 mb-4 sm:mb-6 bg-gradient-to-r from-primary/20 via-secondary/20 to-accent/20 border-2 ${coinPulse ? 'coin-pulse' : ''}`}>
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-2 sm:gap-3">
              <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-primary flex items-center justify-center text-xl sm:text-2xl">
                🪙
              </div>
              <div>
                <p className="text-xs sm:text-sm text-muted-foreground">Ваш баланс</p>
                <h2 className="text-2xl sm:text-3xl font-black text-foreground">{gameState.coins.toLocaleString()}</h2>
              </div>
            </div>
            <div className="text-right">
              {boostActive && (
                <Badge className="mb-1 sm:mb-2 text-xs sm:text-sm bg-accent animate-pulse">
                  <Icon name="Rocket" size={12} className="mr-1 sm:w-3.5 sm:h-3.5" />
                  🚀 {boostTimeLeft}с
                </Badge>
              )}
              {!boostActive && (
                <Badge variant="outline" className="mb-1 sm:mb-2 text-xs sm:text-sm">
                  <Icon name="Flame" size={12} className="mr-1 text-accent sm:w-3.5 sm:h-3.5" />
                  {gameState.dailyStreak}
                </Badge>
              )}
              <p className="text-xs sm:text-sm text-muted-foreground">Ур. {gameState.level}</p>
            </div>
          </div>
        </Card>

        <Tabs defaultValue="main" className="w-full">
          <TabsList className="grid w-full grid-cols-4 mb-4 sm:mb-6 h-auto">
            <TabsTrigger value="main" className="text-xs sm:text-base py-2 sm:py-3 flex-col sm:flex-row gap-0.5 sm:gap-2">
              <Icon name="Home" size={16} className="sm:w-[18px] sm:h-[18px]" />
              <span className="hidden sm:inline">Главная</span>
              <span className="sm:hidden">Дом</span>
            </TabsTrigger>
            <TabsTrigger value="shop" className="text-xs sm:text-base py-2 sm:py-3 flex-col sm:flex-row gap-0.5 sm:gap-2">
              <Icon name="ShoppingCart" size={16} className="sm:w-[18px] sm:h-[18px]" />
              <span className="hidden sm:inline">Магазин</span>
              <span className="sm:hidden">Топ</span>
            </TabsTrigger>
            <TabsTrigger value="boosts" className="text-xs sm:text-base py-2 sm:py-3 flex-col sm:flex-row gap-0.5 sm:gap-2">
              <Icon name="Zap" size={16} className="sm:w-[18px] sm:h-[18px]" />
              <span>Бусты</span>
            </TabsTrigger>
            <TabsTrigger value="rewards" className="text-xs sm:text-base py-2 sm:py-3 flex-col sm:flex-row gap-0.5 sm:gap-2">
              <Icon name="Gift" size={16} className="sm:w-[18px] sm:h-[18px]" />
              <span className="hidden sm:inline">Награды</span>
              <span className="sm:hidden">🎁</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="main" className="space-y-4 sm:space-y-6">
            <Card className="p-6 bg-gradient-to-br from-card to-card/50 border-2 border-primary/20">
              <div className="flex justify-between items-center mb-4">
                <div>
                  <p className="text-sm text-muted-foreground">Прогресс уровня {gameState.level}</p>
                  <Badge variant="secondary" className="text-xl px-4 py-2 mt-2">
                    <Icon name="TrendingUp" size={20} className="mr-2" />
                    +{gameState.clickPower}/клик
                  </Badge>
                </div>
              </div>
              
              <div className="mb-2">
                <div className="flex justify-between text-sm mb-1">
                  <span>До следующего уровня</span>
                  <span className="font-bold">{nextLevelCoins()}</span>
                </div>
                <Progress value={currentLevelProgress()} className="h-3" />
              </div>
              
              {gameState.autoClickPower > 0 && (
                <div className="flex items-center gap-2 text-accent mt-3">
                  <Icon name="Repeat" size={18} />
                  <span className="font-semibold">+{gameState.autoClickPower}/сек автодоход</span>
                </div>
              )}
            </Card>

            <div className="flex justify-center relative touch-none select-none">
              <Button
                onClick={handleClick}
                onTouchStart={handleClick}
                size="lg"
                className={`w-64 h-64 sm:w-80 sm:h-80 rounded-full p-0 bg-transparent active:scale-95 sm:hover:scale-105 transition-all duration-200 border-0 shadow-2xl shadow-yellow-500/50 relative overflow-visible ${
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

            <div className="grid grid-cols-3 gap-2 sm:gap-4">
              <Card className="p-2 sm:p-4 text-center bg-gradient-to-br from-primary/10 to-transparent">
                <Icon name="MousePointer" size={24} className="mx-auto mb-1 sm:mb-2 text-primary sm:w-8 sm:h-8" />
                <p className="text-lg sm:text-2xl font-bold">{gameState.clickPower}</p>
                <p className="text-[10px] sm:text-xs text-muted-foreground">Сила</p>
              </Card>
              <Card className="p-2 sm:p-4 text-center bg-gradient-to-br from-secondary/10 to-transparent">
                <Icon name="Zap" size={24} className="mx-auto mb-1 sm:mb-2 text-secondary sm:w-8 sm:h-8" />
                <p className="text-lg sm:text-2xl font-bold">{gameState.autoClickPower}</p>
                <p className="text-[10px] sm:text-xs text-muted-foreground">Авто/сек</p>
              </Card>
              <Card className="p-2 sm:p-4 text-center bg-gradient-to-br from-accent/10 to-transparent">
                <Icon name="Trophy" size={24} className="mx-auto mb-1 sm:mb-2 text-accent sm:w-8 sm:h-8" />
                <p className="text-lg sm:text-2xl font-bold">{gameState.level}</p>
                <p className="text-[10px] sm:text-xs text-muted-foreground">Уровень</p>
              </Card>
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
                  <Icon name="Coins" size={20} className="mr-2" />
                  {gameState.boosts.passiveIncome.cost}
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
                  <div className="text-right">
                    <p className="text-sm text-white/70">Следующая награда</p>
                    <p className="text-2xl font-bold">{50 + gameState.dailyStreak * 20} 🪙</p>
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
                    <p className="text-lg font-bold">{50 + (day - 1) * 20}</p>
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
                    <span className="text-3xl">💰</span>
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
                    <span className="text-3xl">🔥</span>
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
                    <span className="text-3xl">⭐</span>
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