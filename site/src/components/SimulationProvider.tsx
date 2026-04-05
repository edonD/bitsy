"use client";

import {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  type ReactNode,
} from "react";
import {
  type SimulationConfig,
  type SimulationResult,
  type ModelId,
  runSimulation,
  saveSimulationResult,
  getSimulationHistory,
  clearSimulationHistory,
} from "@/lib/simulation-engine";

interface SimulationState {
  currentResult: SimulationResult | null;
  history: SimulationResult[];
  isRunning: boolean;
  run: (config: SimulationConfig) => void;
  clearHistory: () => void;
  loadFromHistory: (id: string) => void;
}

const SimulationContext = createContext<SimulationState | null>(null);

export function useSimulation(): SimulationState {
  const ctx = useContext(SimulationContext);
  if (!ctx) throw new Error("useSimulation must be used within SimulationProvider");
  return ctx;
}

export function SimulationProvider({ children }: { children: ReactNode }) {
  const [currentResult, setCurrentResult] = useState<SimulationResult | null>(null);
  const [history, setHistory] = useState<SimulationResult[]>([]);
  const [isRunning, setIsRunning] = useState(false);

  useEffect(() => {
    const h = getSimulationHistory();
    setHistory(h);
    if (h.length > 0) {
      setCurrentResult(h[0]);
    }
  }, []);

  const run = useCallback((config: SimulationConfig) => {
    setIsRunning(true);
    // Simulate a brief delay for UX
    setTimeout(() => {
      const result = runSimulation(config);
      saveSimulationResult(result);
      setCurrentResult(result);
      setHistory(getSimulationHistory());
      setIsRunning(false);
    }, 800);
  }, []);

  const handleClearHistory = useCallback(() => {
    clearSimulationHistory();
    setHistory([]);
    setCurrentResult(null);
  }, []);

  const loadFromHistory = useCallback(
    (id: string) => {
      const found = history.find((h) => h.id === id);
      if (found) setCurrentResult(found);
    },
    [history]
  );

  return (
    <SimulationContext.Provider
      value={{
        currentResult,
        history,
        isRunning,
        run,
        clearHistory: handleClearHistory,
        loadFromHistory,
      }}
    >
      {children}
    </SimulationContext.Provider>
  );
}
