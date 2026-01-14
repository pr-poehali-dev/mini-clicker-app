import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import Icon from '@/components/ui/icon';
import { useToast } from '@/hooks/use-toast';

interface GameState {
  coins: number;
  clickPower: number;
  autoClickPower: number;
  level: number;
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
      boosts: {
        clickMultiplier: { level: 0, cost: 50 },
        autoClicker: { level: 0, cost: 100 },
        passiveIncome: { level: 0, cost: 200 }
      }
    };
  });

  const [clickAnimation, setClickAnimation] = useState(false);

  useEffect(() => {
    localStorage.setItem('clickerGame', JSON.stringify(gameState));
  }, [gameState]);

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

  const handleClick = () => {
    setGameState(prev => ({
      ...prev,
      coins: prev.coins + prev.clickPower
    }));
    setClickAnimation(true);
    setTimeout(() => setClickAnimation(false), 200);
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
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-purple-950/20 p-4">
      <div className="max-w-4xl mx-auto">
        <header className="mb-8 text-center pt-6">
          <h1 className="text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-primary via-secondary to-accent mb-2">
            🪙 MEGA CLICKER
          </h1>
          <p className="text-muted-foreground text-lg">Кликай, прокачивайся, зарабатывай!</p>
        </header>

        <Tabs defaultValue="main" className="w-full">
          <TabsList className="grid w-full grid-cols-3 mb-6">
            <TabsTrigger value="main" className="text-base">
              <Icon name="Home" size={18} className="mr-2" />
              Главная
            </TabsTrigger>
            <TabsTrigger value="shop" className="text-base">
              <Icon name="ShoppingCart" size={18} className="mr-2" />
              Магазин
            </TabsTrigger>
            <TabsTrigger value="boosts" className="text-base">
              <Icon name="Zap" size={18} className="mr-2" />
              Бусты
            </TabsTrigger>
          </TabsList>

          <TabsContent value="main" className="space-y-6">
            <Card className="p-6 bg-gradient-to-br from-card to-card/50 border-2 border-primary/20">
              <div className="flex justify-between items-center mb-4">
                <div>
                  <p className="text-sm text-muted-foreground">Уровень {gameState.level}</p>
                  <h2 className="text-4xl font-black text-primary">{gameState.coins.toLocaleString()}</h2>
                  <p className="text-muted-foreground">монет</p>
                </div>
                <Badge variant="secondary" className="text-xl px-4 py-2">
                  <Icon name="TrendingUp" size={20} className="mr-2" />
                  +{gameState.clickPower}/клик
                </Badge>
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

            <div className="flex justify-center">
              <Button
                onClick={handleClick}
                size="lg"
                className={`w-64 h-64 rounded-full text-8xl bg-gradient-to-br from-primary via-secondary to-accent hover:scale-105 transition-all duration-200 shadow-2xl shadow-primary/50 ${
                  clickAnimation ? 'click-animation' : ''
                }`}
              >
                🪙
              </Button>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <Card className="p-4 text-center bg-gradient-to-br from-primary/10 to-transparent">
                <Icon name="MousePointer" size={32} className="mx-auto mb-2 text-primary" />
                <p className="text-2xl font-bold">{gameState.clickPower}</p>
                <p className="text-xs text-muted-foreground">Сила клика</p>
              </Card>
              <Card className="p-4 text-center bg-gradient-to-br from-secondary/10 to-transparent">
                <Icon name="Zap" size={32} className="mx-auto mb-2 text-secondary" />
                <p className="text-2xl font-bold">{gameState.autoClickPower}</p>
                <p className="text-xs text-muted-foreground">Доход/сек</p>
              </Card>
              <Card className="p-4 text-center bg-gradient-to-br from-accent/10 to-transparent">
                <Icon name="Trophy" size={32} className="mx-auto mb-2 text-accent" />
                <p className="text-2xl font-bold">{gameState.level}</p>
                <p className="text-xs text-muted-foreground">Уровень</p>
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
        </Tabs>
      </div>
    </div>
  );
};

export default Index;
