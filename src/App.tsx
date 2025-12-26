import { useState, useEffect } from "react";

function App() {
  const [step, setStep] = useState<number>(1);
  const [totalCells] = useState<number>(70);
  const [obstacles, setObstacles] = useState<number>(8);
  const [shovels, setShovels] = useState<string>("42");
  const [prizeParts, setPrizeParts] = useState<string>("6");
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });

  // Shovel packs state
  const [pack3, setPack3] = useState<number>(0);
  const [pack10, setPack10] = useState<number>(0);
  const [pack30, setPack30] = useState<number>(0);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      setMousePos({ x: e.clientX, y: e.clientY });
    };

    window.addEventListener("mousemove", handleMouseMove);
    return () => window.removeEventListener("mousemove", handleMouseMove);
  }, []);

  function binomial(n: number, k: number): number {
    if (k > n) return 0;
    if (k === 0 || k === n) return 1;
    let res = 1;
    for (let i = 1; i <= k; i++) {
      res *= n - i + 1;
      res /= i;
    }
    return res;
  }

  const availableCells = totalCells - obstacles;
  const validShovels = Math.max(
    1,
    Math.min(parseInt(shovels) || 1, availableCells)
  );
  const validPrizeParts = Math.max(
    1,
    Math.min(parseInt(prizeParts) || 1, availableCells)
  );

  // Calculate probability for "all parts" (complete main prize)
  let probabilityAll = 0;
  if (validShovels >= validPrizeParts) {
    const losingCells = availableCells - validPrizeParts;
    const waysToGetAll = binomial(losingCells, validShovels - validPrizeParts);
    const totalWays = binomial(availableCells, validShovels);
    probabilityAll = waysToGetAll / totalWays;
  }

  const probabilityPercent = (probabilityAll * 100).toFixed(2);

  // Calculate additional shovels from packs
  const additionalShovels = pack3 * 3 + pack10 * 10 + pack30 * 30;
  const totalShovelsWithPacks = validShovels + additionalShovels;
  const totalCost = pack3 * 1 + pack10 * 3 + pack30 * 7;

  // Calculate probability with additional packs
  let probabilityWithPacks = 0;
  let leftoverShovels = 0;

  if (totalShovelsWithPacks >= availableCells) {
    // If we have more shovels than cells, we can dig everything - 100% probability
    probabilityWithPacks = 1;
    leftoverShovels = totalShovelsWithPacks - availableCells;
  } else if (totalShovelsWithPacks >= validPrizeParts) {
    const losingCells = availableCells - validPrizeParts;
    const waysToGetAll = binomial(
      losingCells,
      totalShovelsWithPacks - validPrizeParts
    );
    const totalWays = binomial(availableCells, totalShovelsWithPacks);
    probabilityWithPacks = waysToGetAll / totalWays;
  }
  const probabilityWithPacksPercent = (probabilityWithPacks * 100).toFixed(2);

  const handleShovelsChange = (value: string) => {
    if (value === "" || /^\d+$/.test(value)) {
      setShovels(value);
    }
  };

  const handlePrizePartsChange = (value: string) => {
    if (value === "" || /^\d+$/.test(value)) {
      setPrizeParts(value);
    }
  };

  const goToNextStep = () => {
    if (step < 4) setStep(step + 1);
  };

  const goToPrevStep = () => {
    if (step > 1) setStep(step - 1);
  };

  const resetCalculator = () => {
    setStep(1);
    setObstacles(8);
    setShovels("42");
    setPrizeParts("6");
    setPack3(0);
    setPack10(0);
    setPack30(0);
  };

  // Function to calculate optimal packs to reach 50% probability
  const reachFiftyPercent = () => {
    if (probabilityAll >= 0.5) return; // Already at or above 50%

    // Binary search to find minimum shovels needed for 50%
    let left = validShovels;
    let right = availableCells;
    let targetShovels = validShovels;

    while (left <= right) {
      const mid = Math.floor((left + right) / 2);

      let prob = 0;
      if (mid >= validPrizeParts) {
        const losingCells = availableCells - validPrizeParts;
        const waysToGetAll = binomial(losingCells, mid - validPrizeParts);
        const totalWays = binomial(availableCells, mid);
        prob = waysToGetAll / totalWays;
      }

      if (prob >= 0.5) {
        targetShovels = mid;
        right = mid - 1;
      } else {
        left = mid + 1;
      }
    }

    // Calculate how many additional shovels we need
    const needed = targetShovels - validShovels;

    // Greedy algorithm: buy most cost-effective packs first
    // 30 shovels pack = 0.233 rumb/shovel (best)
    // 10 shovels pack = 0.3 rumb/shovel
    // 3 shovels pack = 0.333 rumb/shovel (worst)

    let remaining = needed;
    let p30 = 0,
      p10 = 0,
      p3 = 0;

    // First, buy as many 30-packs as possible
    if (remaining >= 30) {
      p30 = Math.floor(remaining / 30);
      remaining -= p30 * 30;
    }

    // Then, buy 10-packs
    if (remaining >= 10) {
      p10 = Math.floor(remaining / 10);
      remaining -= p10 * 10;
    }

    // Finally, buy 3-packs for the rest
    if (remaining > 0) {
      p3 = Math.ceil(remaining / 3);
    }

    setPack3(p3);
    setPack10(p10);
    setPack30(p30);
  };

  // Function to calculate repulsion from mouse with smoother, bigger area
  const getRepulsion = (x: number, y: number) => {
    const rect =
      typeof window !== "undefined"
        ? { width: window.innerWidth, height: window.innerHeight }
        : { width: 1920, height: 1080 };
    const itemX = (x / 100) * rect.width;
    const itemY = (y / 100) * rect.height;

    const dx = itemX - mousePos.x;
    const dy = itemY - mousePos.y;
    const distance = Math.sqrt(dx * dx + dy * dy);

    const repelDistance = 350; // Increased from 200 for bigger impact area

    if (distance < repelDistance && distance > 0) {
      const force = Math.pow((repelDistance - distance) / repelDistance, 1.5); // Smoother falloff
      const angle = Math.atan2(dy, dx);
      const offsetX = Math.cos(angle) * force * 120; // Increased from 80
      const offsetY = Math.sin(angle) * force * 120;

      return {
        transform: `translate(${offsetX}px, ${offsetY}px) scale(${
          1 + force * 0.3
        })`,
      };
    }

    return { transform: "translate(0, 0) scale(1)" };
  };

  const emojis = [
    { emoji: "🏴‍☠️", top: 5, left: 5, size: "text-5xl md:text-6xl" },
    { emoji: "💀", top: 5, right: 5, size: "text-4xl md:text-5xl" },
    { emoji: "⚓", top: 15, left: 25, size: "text-5xl md:text-6xl" },
    { emoji: "🗡️", top: 15, right: 25, size: "text-4xl md:text-5xl" },
    { emoji: "💎", top: 30, left: 10, size: "text-4xl md:text-5xl" },
    { emoji: "🏴‍☠️", top: 30, right: 10, size: "text-5xl md:text-6xl" },
    { emoji: "🦜", top: 45, left: 5, size: "text-5xl md:text-6xl" },
    { emoji: "⚔️", top: 45, right: 5, size: "text-4xl md:text-5xl" },
    { emoji: "🪙", top: 60, left: 20, size: "text-5xl md:text-6xl" },
    { emoji: "☠️", top: 60, right: 20, size: "text-4xl md:text-5xl" },
    { emoji: "⛵", top: 75, left: 8, size: "text-4xl md:text-5xl" },
    { emoji: "💰", top: 75, right: 8, size: "text-5xl md:text-6xl" },
    { emoji: "🔱", top: 90, left: 15, size: "text-5xl md:text-6xl" },
    { emoji: "🗺️", top: 90, right: 15, size: "text-4xl md:text-5xl" },
    { emoji: "🦴", top: 20, left: 45, size: "text-4xl md:text-5xl" },
    { emoji: "💎", top: 70, left: 45, size: "text-5xl md:text-6xl" },
    { emoji: "⚓", top: 35, right: 40, size: "text-4xl md:text-5xl" },
    { emoji: "🏴‍☠️", top: 85, right: 40, size: "text-5xl md:text-6xl" },
  ];

  return (
    <div className="h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-neutral-950 flex items-start md:items-center justify-center p-3 md:p-6 relative overflow-hidden">
      {" "}
      {/* Floating Pirate Emojis Background */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none opacity-15">
        {emojis.map((item, index) => {
          const hasLeft = "left" in item;
          const position = hasLeft ? item.left : item.right;
          const positionStyle = hasLeft
            ? { top: `${item.top}%`, left: `${position}%` }
            : { top: `${item.top}%`, right: `${position}%` };

          // TypeScript guard: position is always defined because either left or right exists
          const xPos = position ?? 0;
          const repulsionX = hasLeft ? xPos : 100 - xPos;

          return (
            <div
              key={index}
              className={`absolute ${item.size} transition-all duration-700 ease-out`}
              style={{
                ...positionStyle,
                ...getRepulsion(repulsionX, item.top),
              }}
            >
              {item.emoji}
            </div>
          );
        })}
      </div>
      <div className="w-full max-w-md md:max-w-xl h-full md:h-auto flex items-center relative z-10">
        <div
          className="bg-gradient-to-br from-slate-900 via-slate-800 to-neutral-900 rounded-2xl md:rounded-3xl shadow-2xl border-2 md:border-4 border-amber-600 overflow-hidden backdrop-blur-sm w-full flex flex-col max-h-full"
          style={{
            boxShadow:
              "0 0 60px rgba(217, 119, 6, 0.4), inset 0 0 30px rgba(0, 0, 0, 0.5)",
          }}
        >
          {/* Header */}
          <div className="bg-gradient-to-r from-amber-900 via-orange-900 to-red-950 px-2 py-1 md:px-4 md:py-4 text-center border-b-4 border-amber-600 relative overflow-hidden flex-shrink-0">
            {" "}
            <div className="absolute inset-0 bg-black/30"></div>
            <h1 className="text-sm md:text-2xl lg:text-3xl font-bold text-amber-200 drop-shadow-2xl flex items-center justify-center gap-1.5 mb-0 md:mb-1.5 relative z-10">
              <span className="text-base md:text-3xl lg:text-4xl">🏴‍☠️</span>
              Pirate Bay Calculator
              <span className="text-base md:text-3xl lg:text-4xl">⚓</span>
            </h1>
          </div>

          {/* Progress Bar */}
          <div className="flex items-center justify-center px-2 py-1.5 md:px-4 md:py-3.5 bg-slate-950/50 gap-1.5 backdrop-blur-sm flex-shrink-0">
            <div
              className={`w-5 h-5 md:w-7 md:h-7 rounded-full flex items-center justify-center font-bold text-[10px] md:text-sm transition-all duration-300 ${
                step >= 1
                  ? "bg-gradient-to-br from-amber-500 to-orange-600 text-white shadow-xl shadow-amber-500/50 scale-110"
                  : "bg-slate-700 text-slate-400"
              }`}
            >
              1
            </div>
            <div className="w-3 md:w-6 h-0.5 bg-slate-700 rounded"></div>
            <div
              className={`w-5 h-5 md:w-7 md:h-7 rounded-full flex items-center justify-center font-bold text-[10px] md:text-sm transition-all duration-300 ${
                step >= 2
                  ? "bg-gradient-to-br from-amber-500 to-orange-600 text-white shadow-xl shadow-amber-500/50 scale-110"
                  : "bg-slate-700 text-slate-400"
              }`}
            >
              2
            </div>
            <div className="w-3 md:w-6 h-0.5 bg-slate-700 rounded"></div>
            <div
              className={`w-5 h-5 md:w-7 md:h-7 rounded-full flex items-center justify-center font-bold text-[10px] md:text-sm transition-all duration-300 ${
                step >= 3
                  ? "bg-gradient-to-br from-amber-500 to-orange-600 text-white shadow-xl shadow-amber-500/50 scale-110"
                  : "bg-slate-700 text-slate-400"
              }`}
            >
              3
            </div>
            <div className="w-3 md:w-6 h-0.5 bg-slate-700 rounded"></div>
            <div
              className={`w-5 h-5 md:w-7 md:h-7 rounded-full flex items-center justify-center text-xs md:text-base transition-all duration-300 ${
                step >= 4
                  ? "bg-gradient-to-br from-amber-500 to-orange-600 shadow-xl shadow-amber-500/50 scale-110"
                  : "bg-slate-700 grayscale"
              }`}
            >
              📊
            </div>
          </div>

          {/* Content - Scrollable area */}
          <div className="px-2 py-2 md:px-4 md:py-4 lg:px-6 lg:py-6 flex-1 overflow-y-auto">
            {/* Step 1: Obstacles */}
            {step === 1 && (
              <div className="animate-fade-in">
                <h2 className="text-sm md:text-xl lg:text-2xl font-bold text-amber-300 mb-1 md:mb-1.5 text-center drop-shadow-lg">
                  🚧 Шаг 1: Препятствия
                </h2>
                <p className="text-[10px] md:text-sm text-slate-400 text-center mb-2 md:mb-4">
                  Сколько клеток заняты препятствиями на поле?
                </p>

                <div className="mb-2 md:mb-4">
                  <label className="flex items-center gap-1.5 md:gap-2 text-[10px] md:text-sm font-semibold text-amber-200 mb-1.5 md:mb-3">
                    <span className="text-sm md:text-xl"></span>
                    Клетки с препятствиями:
                  </label>
                  <div className="flex items-center gap-1.5 md:gap-4">
                    <input
                      type="range"
                      min={0}
                      max={8}
                      value={obstacles}
                      onChange={(e) => setObstacles(Number(e.target.value))}
                      className="flex-1 h-1.5 md:h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer"
                    />
                    <div className="min-w-[32px] md:min-w-[42px] px-1.5 py-0.5 md:px-4 md:py-2 bg-slate-800 border-2 border-amber-600 rounded-lg md:rounded-xl text-base md:text-xl font-bold text-amber-400 text-center shadow-lg shadow-amber-600/20">
                      {obstacles}
                    </div>
                  </div>
                </div>

                <div className="bg-slate-800/80 border-2 border-amber-600/50 rounded-lg md:rounded-xl p-1.5 md:p-4 mt-2 md:mt-6 shadow-xl backdrop-blur-sm">
                  <div className="flex justify-between items-center py-1 md:py-2 text-slate-400 text-[10px] md:text-sm border-b border-slate-700">
                    <span>Всего клеток:</span>
                    <strong className="text-amber-200 text-xs md:text-lg">
                      {totalCells}
                    </strong>
                  </div>
                  <div className="flex justify-between items-center py-1 md:py-2 text-slate-400 text-[10px] md:text-sm border-b border-slate-700">
                    <span>Препятствия:</span>
                    <strong className="text-amber-200 text-xs md:text-lg">
                      {obstacles}
                    </strong>
                  </div>
                  <div className="flex justify-between items-center py-1 md:py-2 text-amber-300 text-[10px] md:text-base font-semibold">
                    <span>Доступно:</span>
                    <strong className="text-sm md:text-xl text-amber-400 drop-shadow-lg">
                      {availableCells}
                    </strong>
                  </div>
                </div>
              </div>
            )}

            {/* Step 2: Shovels */}
            {step === 2 && (
              <div className="animate-fade-in">
                <h2 className="text-sm md:text-xl lg:text-2xl font-bold text-amber-300 mb-1 md:mb-1.5 text-center drop-shadow-lg">
                  ⛏️ Шаг 2: Лопаты
                </h2>
                <p className="text-[10px] md:text-sm text-slate-400 text-center mb-2 md:mb-4">
                  Сколько у вас лопат для раскопок?
                </p>

                <div className="mb-2 md:mb-4">
                  <label className="flex items-center gap-1.5 md:gap-2 text-[10px] md:text-sm font-semibold text-amber-200 mb-1.5 md:mb-3">
                    Количество лопат:
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      inputMode="numeric"
                      value={shovels}
                      onChange={(e) => handleShovelsChange(e.target.value)}
                      className="w-full px-2 py-1.5 md:px-3.5 md:py-3.5 bg-slate-800 border-2 border-amber-600 rounded-lg md:rounded-xl text-base md:text-2xl font-medium text-amber-400 text-center focus:outline-none focus:border-amber-500 focus:ring-4 focus:ring-amber-500/30 transition shadow-xl"
                      placeholder="7"
                    />
                    <span className="absolute right-2 md:right-4 top-1/2 -translate-y-1/2 text-slate-500 text-[10px] md:text-base pointer-events-none">
                      / {availableCells}
                    </span>
                  </div>
                </div>

                <div className="bg-slate-800/80 border-2 border-amber-600/50 rounded-lg md:rounded-xl p-1.5 md:p-4 mt-2 md:mt-6 shadow-xl backdrop-blur-sm">
                  <div className="flex justify-between items-center py-1 md:py-2 text-slate-400 text-[10px] md:text-sm border-b border-slate-700">
                    <span>Доступно клеток:</span>
                    <strong className="text-amber-200 text-xs md:text-lg">
                      {availableCells}
                    </strong>
                  </div>
                  <div className="flex justify-between items-center py-1 md:py-2 text-amber-300 text-[10px] md:text-base font-semibold">
                    <span>Ваши лопаты:</span>
                    <strong className="text-sm md:text-xl text-amber-400 drop-shadow-lg">
                      {validShovels}
                    </strong>
                  </div>
                </div>
              </div>
            )}

            {/* Step 3: Prize Parts */}
            {step === 3 && (
              <div className="animate-fade-in">
                <h2 className="text-sm md:text-xl lg:text-2xl font-bold text-amber-300 mb-1 md:mb-1.5 text-center drop-shadow-lg">
                  💎 Шаг 3: Главный приз
                </h2>
                <p className="text-[10px] md:text-sm text-slate-400 text-center mb-2 md:mb-4">
                  Из скольких частей состоит главный приз?
                </p>

                <div className="mb-2 md:mb-4">
                  <label className="flex items-center gap-1.5 md:gap-2 text-[10px] md:text-sm font-semibold text-amber-200 mb-1.5 md:mb-3">
                    Частей главного приза:
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      inputMode="numeric"
                      value={prizeParts}
                      onChange={(e) => handlePrizePartsChange(e.target.value)}
                      className="w-full px-2 py-1.5 md:px-3.5 md:py-3.5 bg-slate-800 border-2 border-amber-600 rounded-lg md:rounded-xl text-base md:text-2xl font-medium text-amber-400 text-center focus:outline-none focus:border-amber-500 focus:ring-4 focus:ring-amber-500/30 transition shadow-xl"
                      placeholder="5"
                    />
                    <span className="absolute right-2 md:right-4 top-1/2 -translate-y-1/2 text-slate-500 text-[10px] md:text-base pointer-events-none">
                      / {availableCells}
                    </span>
                  </div>
                </div>

                <div className="bg-slate-800/80 border-2 border-amber-600/50 rounded-lg md:rounded-xl p-1.5 md:p-4 mt-2 md:mt-6 shadow-xl backdrop-blur-sm">
                  <div className="flex justify-between items-center py-1 md:py-2 text-slate-400 text-[10px] md:text-sm border-b border-slate-700">
                    <span>Доступно клеток:</span>
                    <strong className="text-amber-200 text-xs md:text-lg">
                      {availableCells}
                    </strong>
                  </div>
                  <div className="flex justify-between items-center py-1 md:py-2 text-slate-400 text-[10px] md:text-sm border-b border-slate-700">
                    <span>Ваши лопаты:</span>
                    <strong className="text-amber-200 text-xs md:text-lg">
                      {validShovels}
                    </strong>
                  </div>
                  <div className="flex justify-between items-center py-1 md:py-2 text-amber-300 text-[10px] md:text-base font-semibold">
                    <span>Частей приза:</span>
                    <strong className="text-sm md:text-xl text-amber-400 drop-shadow-lg">
                      {validPrizeParts}
                    </strong>
                  </div>
                </div>
              </div>
            )}

            {/* Step 4: Results */}
            {step === 4 && (
              <div className="animate-fade-in">
                <h2 className="text-sm md:text-xl lg:text-2xl font-bold text-amber-300 mb-0.5 md:mb-1.5 text-center drop-shadow-lg">
                  📊 Результат
                </h2>
                <p className="text-[10px] md:text-sm text-slate-400 text-center mb-2 md:mb-4">
                  Вероятность получить полный главный приз
                </p>

                {/* Probability Card - Before/After */}
                <div
                  className={`rounded-xl md:rounded-2xl px-2 py-2.5 md:px-4 md:py-5 border-2 shadow-2xl mb-2 md:mb-3 relative overflow-hidden ${
                    (pack3 > 0 || pack10 > 0 || pack30 > 0) &&
                    probabilityWithPacks > 0.5
                      ? "bg-gradient-to-br from-green-600 via-emerald-700 to-teal-800 border-green-500"
                      : "bg-gradient-to-br from-amber-600 via-orange-700 to-red-800 border-amber-500"
                  }`}
                  style={{
                    boxShadow:
                      (pack3 > 0 || pack10 > 0 || pack30 > 0) &&
                      probabilityWithPacks > 0.5
                        ? "0 0 40px rgba(34, 197, 94, 0.6), inset 0 0 60px rgba(0, 0, 0, 0.4)"
                        : "0 0 40px rgba(217, 119, 6, 0.6), inset 0 0 60px rgba(0, 0, 0, 0.4)",
                  }}
                >
                  <div className="absolute inset-0 bg-black/20"></div>

                  {pack3 > 0 || pack10 > 0 || pack30 > 0 ? (
                    // Two column layout when packs are selected
                    <div className="grid grid-cols-2 gap-2 md:gap-3 relative z-10">
                      {/* Before (dimmed) */}
                      <div className="opacity-50">
                        <div className="text-amber-200 text-[8px] md:text-[10px] font-semibold uppercase tracking-wider mb-0.5 md:mb-1">
                          Было
                        </div>
                        <div className="text-white text-xl md:text-3xl lg:text-4xl font-bold drop-shadow-2xl leading-none mb-0.5 md:mb-1">
                          {probabilityPercent}%
                        </div>
                        <div className="text-amber-100 text-[8px] md:text-xs font-semibold drop-shadow-lg">
                          {validShovels} лопат
                        </div>
                      </div>

                      {/* Arrow */}
                      <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 text-white text-lg md:text-2xl opacity-70">
                        →
                      </div>

                      {/* After (bright) */}
                      <div className="bg-gradient-to-br from-green-600/20 to-emerald-700/20 rounded-lg md:rounded-xl p-1.5 md:p-2 border border-green-400/30">
                        <div className="text-green-200 text-[8px] md:text-[10px] font-semibold uppercase tracking-wider mb-0.5 md:mb-1">
                          Стало
                        </div>
                        <div className="text-white text-xl md:text-3xl lg:text-4xl font-bold drop-shadow-2xl leading-none mb-0.5 md:mb-1">
                          {probabilityWithPacksPercent}%
                        </div>
                        <div className="text-green-100 text-[8px] md:text-xs font-semibold drop-shadow-lg flex items-center justify-center gap-0.5">
                          {totalShovelsWithPacks} лопат
                        </div>
                        <div className="text-green-200 text-[8px] md:text-[10px] mt-0.5 md:mt-1 flex items-center justify-center gap-0.5">
                          за {totalCost}{" "}
                          <img
                            src="/assets/currencies/rumb.png"
                            alt="румбиков"
                            className="w-2.5 h-2.5 md:w-3 md:h-3 inline-block"
                          />
                        </div>
                        {leftoverShovels > 0 && (
                          <div className="text-green-300 text-[8px] md:text-[10px] mt-0.5 bg-green-900/30 rounded py-0.5 px-1">
                            +{leftoverShovels} лишних
                          </div>
                        )}
                      </div>

                      {/* Change indicator */}
                      <div className="col-span-2 text-center text-green-200 text-[8px] md:text-xs mt-1 md:mt-1.5">
                        Изменение:{" "}
                        {probabilityWithPacks - probabilityAll >= 0 ? "+" : ""}
                        {(
                          (probabilityWithPacks - probabilityAll) *
                          100
                        ).toFixed(2)}
                        %
                      </div>
                    </div>
                  ) : (
                    // Single column layout when no packs selected
                    <div className="text-center relative z-10">
                      <div className="text-amber-200 text-[8px] md:text-[10px] font-semibold uppercase tracking-wider mb-0.5 md:mb-1.5">
                        Текущая вероятность
                      </div>
                      <div className="text-white text-2xl md:text-4xl lg:text-5xl font-bold drop-shadow-2xl leading-none mb-0.5 md:mb-1.5">
                        {probabilityPercent}%
                      </div>
                      <div className="text-amber-100 text-[10px] md:text-sm mt-0.5 md:mt-1.5 font-semibold drop-shadow-lg">
                        С {validShovels} лопатами
                      </div>
                    </div>
                  )}
                </div>

                {/* Shovel Packs Calculator */}
                <div className="bg-slate-800/80 border-2 border-amber-600/50 rounded-lg md:rounded-xl p-2 md:p-3.5 mb-2 md:mb-3 shadow-xl backdrop-blur-sm">
                  <div className="flex items-center justify-between mb-1.5 md:mb-3">
                    <h3 className="text-xs md:text-lg font-bold text-amber-300 flex items-center gap-1.5">
                      <span className="text-sm md:text-xl">🛒</span>
                      Докупить наборы лопат
                    </h3>
                    {probabilityAll < 0.5 && (
                      <button
                        onClick={reachFiftyPercent}
                        className="px-2 py-1 md:px-3 md:py-1.5 bg-gradient-to-br from-green-600 to-emerald-700 text-white rounded-md md:rounded-lg text-[8px] md:text-xs font-semibold transition-all hover:from-green-500 hover:to-emerald-600 active:scale-95 border border-green-500/50"
                      >
                        🎯 До 50%
                      </button>
                    )}
                  </div>

                  {/* Pack options */}
                  <div className="space-y-1.5 md:space-y-2">
                    {/* 3 shovels pack */}
                    <div className="flex items-center gap-1.5 md:gap-2 bg-slate-900/50 rounded-md md:rounded-lg p-1.5 md:p-2">
                      <div className="flex-1">
                        <div className="text-[10px] md:text-sm text-amber-200 font-semibold">
                          3 лопаты
                        </div>
                        <div className="text-[8px] md:text-xs text-slate-400 flex items-center gap-1">
                          1{" "}
                          <img
                            src="/assets/currencies/rumb.png"
                            alt="румбик"
                            className="w-3 h-3 md:w-4 md:h-4 inline-block"
                          />
                        </div>
                      </div>
                      <div className="flex items-center gap-1 md:gap-1.5">
                        <button
                          onClick={() => setPack3(Math.max(0, pack3 - 1))}
                          className="w-5 h-5 md:w-6 md:h-6 bg-slate-700 hover:bg-slate-600 text-amber-300 rounded-md md:rounded-lg font-bold text-xs md:text-base transition active:scale-95"
                        >
                          −
                        </button>
                        <div className="w-6 md:w-8 text-center text-xs md:text-lg font-bold text-amber-400">
                          {pack3}
                        </div>
                        <button
                          onClick={() => setPack3(pack3 + 1)}
                          className="w-5 h-5 md:w-6 md:h-6 bg-amber-600 hover:bg-amber-500 text-white rounded-md md:rounded-lg font-bold text-xs md:text-base transition active:scale-95"
                        >
                          +
                        </button>
                      </div>
                    </div>

                    {/* 10 shovels pack */}
                    <div className="flex items-center gap-1.5 md:gap-2 bg-slate-900/50 rounded-md md:rounded-lg p-1.5 md:p-2">
                      <div className="flex-1">
                        <div className="text-[10px] md:text-sm text-amber-200 font-semibold">
                          10 лопат
                        </div>
                        <div className="text-[8px] md:text-xs text-slate-400 flex items-center gap-1">
                          3{" "}
                          <img
                            src="/assets/currencies/rumb.png"
                            alt="румбика"
                            className="w-3 h-3 md:w-4 md:h-4 inline-block"
                          />
                        </div>
                      </div>
                      <div className="flex items-center gap-1 md:gap-1.5">
                        <button
                          onClick={() => setPack10(Math.max(0, pack10 - 1))}
                          className="w-5 h-5 md:w-6 md:h-6 bg-slate-700 hover:bg-slate-600 text-amber-300 rounded-md md:rounded-lg font-bold text-xs md:text-base transition active:scale-95"
                        >
                          −
                        </button>
                        <div className="w-6 md:w-8 text-center text-xs md:text-lg font-bold text-amber-400">
                          {pack10}
                        </div>
                        <button
                          onClick={() => setPack10(pack10 + 1)}
                          className="w-5 h-5 md:w-6 md:h-6 bg-amber-600 hover:bg-amber-500 text-white rounded-md md:rounded-lg font-bold text-xs md:text-base transition active:scale-95"
                        >
                          +
                        </button>
                      </div>
                    </div>

                    {/* 30 shovels pack */}
                    <div className="flex items-center gap-1.5 md:gap-2 bg-slate-900/50 rounded-md md:rounded-lg p-1.5 md:p-2">
                      <div className="flex-1">
                        <div className="text-[10px] md:text-sm text-amber-200 font-semibold">
                          30 лопат
                        </div>
                        <div className="text-[8px] md:text-xs text-slate-400 flex items-center gap-1">
                          7{" "}
                          <img
                            src="/assets/currencies/rumb.png"
                            alt="румбиков"
                            className="w-3 h-3 md:w-4 md:h-4 inline-block"
                          />
                        </div>
                      </div>
                      <div className="flex items-center gap-1 md:gap-1.5">
                        <button
                          onClick={() => setPack30(Math.max(0, pack30 - 1))}
                          className="w-5 h-5 md:w-6 md:h-6 bg-slate-700 hover:bg-slate-600 text-amber-300 rounded-md md:rounded-lg font-bold text-xs md:text-base transition active:scale-95"
                        >
                          −
                        </button>
                        <div className="w-6 md:w-8 text-center text-xs md:text-lg font-bold text-amber-400">
                          {pack30}
                        </div>
                        <button
                          onClick={() => setPack30(pack30 + 1)}
                          className="w-5 h-5 md:w-6 md:h-6 bg-amber-600 hover:bg-amber-500 text-white rounded-md md:rounded-lg font-bold text-xs md:text-base transition active:scale-95"
                        >
                          +
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Summary */}
                  {(pack3 > 0 || pack10 > 0 || pack30 > 0) && (
                    <div className="mt-2 md:mt-3 pt-2 md:pt-3 border-t border-slate-700">
                      <div className="flex justify-between items-center text-[10px] md:text-sm text-slate-300 mb-0.5 md:mb-1.5">
                        <span>Дополнительно лопат:</span>
                        <span className="text-amber-400 font-bold">
                          +{additionalShovels}
                        </span>
                      </div>
                      <div className="flex justify-between items-center text-[10px] md:text-sm text-slate-300 mb-1 md:mb-2">
                        <span>Стоимость:</span>
                        <span className="text-amber-400 font-bold flex items-center gap-1">
                          {totalCost}{" "}
                          <img
                            src="/assets/currencies/rumb.png"
                            alt="румбиков"
                            className="w-3 h-3 md:w-4 md:h-4 inline-block"
                          />
                        </span>
                      </div>
                      <div className="flex justify-between items-center text-xs md:text-base font-semibold mb-0.5 md:mb-1">
                        <span className="text-amber-200">Всего лопат:</span>
                        <span className="text-amber-400">
                          {totalShovelsWithPacks}
                        </span>
                      </div>
                      {leftoverShovels > 0 && (
                        <div className="flex justify-between items-center text-[10px] md:text-sm text-green-300 bg-green-900/20 rounded-md px-2 py-1 mt-1 md:mt-1.5">
                          <span>✨ Останется лишних:</span>
                          <span className="font-bold">
                            {leftoverShovels} лопат
                          </span>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                <button
                  onClick={resetCalculator}
                  className="w-full mt-2 md:mt-3.5 px-3 py-1.5 md:px-4 md:py-3 bg-gradient-to-br from-amber-600 to-orange-700 text-white rounded-lg md:rounded-xl text-xs md:text-base font-semibold transition-all hover:-translate-y-1 hover:shadow-2xl hover:shadow-amber-600/60 active:scale-95 border-2 border-amber-500/50"
                >
                  🔄 Пересчитать заново
                </button>
              </div>
            )}

            {/* Navigation Buttons */}
            {step < 4 && (
              <div className="flex gap-1.5 md:gap-2 mt-2 md:mt-4">
                {step > 1 && (
                  <button
                    onClick={goToPrevStep}
                    className="flex-1 px-2 py-1.5 md:px-4 md:py-3 bg-slate-800 text-amber-300 border-2 border-amber-600/50 rounded-lg md:rounded-xl text-xs md:text-base font-semibold transition-all hover:bg-slate-700 hover:border-amber-500 active:scale-95"
                  >
                    ← Назад
                  </button>
                )}
                <button
                  onClick={goToNextStep}
                  className="flex-1 px-2 py-1.5 md:px-4 md:py-3 bg-gradient-to-br from-amber-600 to-orange-700 text-white rounded-lg md:rounded-xl text-xs md:text-base font-semibold transition-all hover:-translate-y-1 hover:shadow-2xl hover:shadow-amber-600/60 active:scale-95 border-2 border-amber-500/50"
                >
                  {step === 3 ? "Рассчитать" : "Далее →"}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;
