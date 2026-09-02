"use client";
import React, { useState, useEffect, useRef } from "react";
import { ArrowRight, Link, Zap } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export interface TimelineItem {
  id: number;
  title: string;
  date: string;
  content: string;
  category: string;
  icon: React.ElementType;
  relatedIds: number[];
  status: "completed" | "in-progress" | "pending";
  energy: number;
}

export interface RadialOrbitalTimelineProps {
  timelineData: TimelineItem[];
  className?: string;
  radius?: number;
}

export default function RadialOrbitalTimeline({
  timelineData,
  className = "",
  radius = 180,
}: RadialOrbitalTimelineProps) {
  const [expandedItems, setExpandedItems] = useState<Record<number, boolean>>(
    {}
  );
  const viewMode = "orbital" as const;
  const [rotationAngle, setRotationAngle] = useState<number>(0);
  const [autoRotate, setAutoRotate] = useState<boolean>(true);
  const [pulseEffect, setPulseEffect] = useState<Record<number, boolean>>({});
  const centerOffset = { x: 0, y: 0 };
  const [activeNodeId, setActiveNodeId] = useState<number | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const orbitRef = useRef<HTMLDivElement>(null);
  const nodeRefs = useRef<Record<number, HTMLDivElement | null>>({});

  const handleContainerClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === containerRef.current || e.target === orbitRef.current) {
      setExpandedItems({});
      setActiveNodeId(null);
      setPulseEffect({});
      setAutoRotate(true);
    }
  };

  const toggleItem = (id: number) => {
    setExpandedItems((prev) => {
      const newState = { ...prev };
      Object.keys(newState).forEach((key) => {
        if (parseInt(key) !== id) {
          newState[parseInt(key)] = false;
        }
      });

      newState[id] = !prev[id];

      if (!prev[id]) {
        setActiveNodeId(id);
        setAutoRotate(false);

        const relatedItems = getRelatedItems(id);
        const newPulseEffect: Record<number, boolean> = {};
        relatedItems.forEach((relId) => {
          newPulseEffect[relId] = true;
        });
        setPulseEffect(newPulseEffect);

        centerViewOnNode(id);
      } else {
        setActiveNodeId(null);
        setAutoRotate(true);
        setPulseEffect({});
      }

      return newState;
    });
  };

  useEffect(() => {
    let rotationTimer: NodeJS.Timeout;

    if (autoRotate && viewMode === "orbital") {
      rotationTimer = setInterval(() => {
        setRotationAngle((prev) => {
          const newAngle = (prev + 0.3) % 360;
          return Number(newAngle.toFixed(3));
        });
      }, 50);
    }

    return () => {
      if (rotationTimer) {
        clearInterval(rotationTimer);
      }
    };
  }, [autoRotate, viewMode]);

  const centerViewOnNode = (nodeId: number) => {
    if (viewMode !== "orbital" || !nodeRefs.current[nodeId]) return;

    const nodeIndex = timelineData.findIndex((item) => item.id === nodeId);
    const totalNodes = timelineData.length;
    const targetAngle = (nodeIndex / totalNodes) * 360;

    setRotationAngle(270 - targetAngle);
  };

  const calculateNodePosition = (index: number, total: number) => {
    const angle = ((index / total) * 360 + rotationAngle) % 360;
    const radian = (angle * Math.PI) / 180;

    const x = radius * Math.cos(radian) + centerOffset.x;
    const y = (radius * 0.65) * Math.sin(radian) + centerOffset.y;

    const zIndex = Math.round(100 + 50 * Math.cos(radian));
    const opacity = Math.max(
      0.45,
      Math.min(1, 0.45 + 0.55 * ((1 + Math.sin(radian)) / 2))
    );

    return { x, y, angle, zIndex, opacity };
  };

  const getRelatedItems = (itemId: number): number[] => {
    const currentItem = timelineData.find((item) => item.id === itemId);
    return currentItem ? currentItem.relatedIds : [];
  };

  const isRelatedToActive = (itemId: number): boolean => {
    if (!activeNodeId) return false;
    const relatedItems = getRelatedItems(activeNodeId);
    return relatedItems.includes(itemId);
  };

  const getStatusStyles = (status: TimelineItem["status"]): string => {
    switch (status) {
      case "completed":
        return "text-emerald-400 bg-emerald-950/80 border-emerald-500/50";
      case "in-progress":
        return "text-black bg-white border-white";
      case "pending":
        return "text-zinc-400 bg-zinc-900 border-zinc-700";
      default:
        return "text-white bg-black/40 border-white/50";
    }
  };

  return (
    <div
      className={cn(
        "w-full h-[500px] flex flex-col items-center justify-center bg-transparent overflow-visible relative select-none",
        className
      )}
      ref={containerRef}
      onClick={handleContainerClick}
    >
      <div className="relative w-full max-w-lg h-full flex items-center justify-center">
        <div
          className="absolute w-full h-full flex items-center justify-center"
          ref={orbitRef}
          style={{
            perspective: "1000px",
            transform: `translate(${centerOffset.x}px, ${centerOffset.y}px)`,
          }}
        >
          {/* Central Somnia Core */}
          <div className="absolute w-16 h-16 rounded-full bg-gradient-to-br from-emerald-500 via-zinc-200 to-red-500 flex items-center justify-center z-10 shadow-[0_0_40px_rgba(255,255,255,0.3)]">
            <div className="w-8 h-8 rounded-full bg-black/90 backdrop-blur-md flex items-center justify-center text-[10px] font-black text-white">
              SX
            </div>
          </div>

          {/* Orbital Rings */}
          <div
            className="absolute rounded-full border border-zinc-700/40 pointer-events-none"
            style={{ width: `${radius * 2}px`, height: `${radius * 1.3}px` }}
          ></div>
          <div
            className="absolute rounded-full border border-zinc-800/60 pointer-events-none scale-90"
            style={{ width: `${radius * 2}px`, height: `${radius * 1.3}px` }}
          ></div>

          {/* Orbit Nodes */}
          {timelineData.map((item, index) => {
            const position = calculateNodePosition(index, timelineData.length);
            const isExpanded = expandedItems[item.id];
            const isRelated = isRelatedToActive(item.id);
            const isPulsing = pulseEffect[item.id];
            const Icon = item.icon;

            const nodeStyle = {
              transform: `translate(${position.x}px, ${position.y}px)`,
              zIndex: isExpanded ? 200 : position.zIndex,
              opacity: isExpanded ? 1 : position.opacity,
            };

            return (
              <div
                key={item.id}
                ref={(el) => {
                  nodeRefs.current[item.id] = el;
                }}
                className="absolute transition-all duration-700 cursor-pointer"
                style={nodeStyle}
                onClick={(e) => {
                  e.stopPropagation();
                  toggleItem(item.id);
                }}
              >
                {/* Energy Aura */}
                <div
                  className={`absolute rounded-full -inset-1 ${
                    isPulsing ? "animate-pulse duration-1000" : ""
                  }`}
                  style={{
                    background: `radial-gradient(circle, rgba(255,255,255,0.25) 0%, rgba(255,255,255,0) 70%)`,
                    width: `${item.energy * 0.4 + 36}px`,
                    height: `${item.energy * 0.4 + 36}px`,
                    left: `-${(item.energy * 0.4 + 36 - 36) / 2}px`,
                    top: `-${(item.energy * 0.4 + 36 - 36) / 2}px`,
                  }}
                ></div>

                {/* Node Icon Circle */}
                <div
                  className={`
                  w-10 h-10 rounded-full flex items-center justify-center
                  ${
                    isExpanded
                      ? "bg-white text-black shadow-lg shadow-white/30"
                      : isRelated
                      ? "bg-white/80 text-black animate-pulse"
                      : "bg-[#0f0f14] text-zinc-200"
                  }
                  border-2 
                  ${
                    isExpanded
                      ? "border-white"
                      : isRelated
                      ? "border-emerald-400"
                      : "border-zinc-700 hover:border-zinc-400"
                  }
                  transition-all duration-300 transform
                  ${isExpanded ? "scale-125" : "hover:scale-110"}
                `}
                >
                  <Icon size={16} />
                </div>

                {/* Node Label */}
                <div
                  className={`
                  absolute top-11 left-1/2 -translate-x-1/2 whitespace-nowrap
                  text-[11px] font-bold font-mono tracking-wider uppercase
                  transition-all duration-300 pointer-events-none
                  ${isExpanded ? "text-white scale-110" : "text-zinc-400"}
                `}
                >
                  {item.title}
                </div>

                {/* Expanded Card Modal */}
                {isExpanded && (
                  <Card className="absolute top-16 left-1/2 -translate-x-1/2 w-72 bg-[#0e0e14]/95 backdrop-blur-xl border-zinc-700 shadow-2xl shadow-black/80 overflow-visible z-50 animate-in fade-in zoom-in-95 duration-200">
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2 w-px h-3 bg-zinc-500"></div>
                    <CardHeader className="pb-2">
                      <div className="flex justify-between items-center">
                        <Badge
                          className={`px-2 py-0.5 text-[10px] font-mono font-bold uppercase ${getStatusStyles(
                            item.status
                          )}`}
                        >
                          {item.category}
                        </Badge>
                        <span className="text-[10px] font-mono text-zinc-400">
                          {item.date}
                        </span>
                      </div>
                      <CardTitle className="text-sm mt-2 text-white font-black uppercase tracking-tight">
                        {item.title}
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="text-xs text-zinc-300 space-y-3">
                      <p className="leading-relaxed">{item.content}</p>

                      <div className="pt-2 border-t border-zinc-800">
                        <div className="flex justify-between items-center text-[11px] font-mono mb-1">
                          <span className="flex items-center text-zinc-400">
                            <Zap size={11} className="mr-1 text-emerald-400" />
                            Reliability / Finality
                          </span>
                          <span className="font-mono text-emerald-400 font-bold">
                            {item.energy}%
                          </span>
                        </div>
                        <div className="w-full h-1.5 bg-zinc-900 rounded-full overflow-hidden border border-zinc-800">
                          <div
                            className="h-full bg-gradient-to-r from-emerald-500 to-teal-400"
                            style={{ width: `${item.energy}%` }}
                          ></div>
                        </div>
                      </div>

                      {item.relatedIds.length > 0 && (
                        <div className="pt-2 border-t border-zinc-800">
                          <div className="flex items-center mb-1.5">
                            <Link size={10} className="text-zinc-500 mr-1" />
                            <h4 className="text-[10px] uppercase tracking-wider font-mono font-bold text-zinc-500">
                              Next Step
                            </h4>
                          </div>
                          <div className="flex flex-wrap gap-1">
                            {item.relatedIds.map((relatedId) => {
                              const relatedItem = timelineData.find(
                                (i) => i.id === relatedId
                              );
                              return (
                                <Button
                                  key={relatedId}
                                  variant="outline"
                                  size="sm"
                                  className="flex items-center h-6 px-2.5 py-0 text-[10px] rounded-lg border-zinc-700 bg-zinc-900 hover:bg-zinc-800 text-zinc-200 hover:text-white transition-all font-mono"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    toggleItem(relatedId);
                                  }}
                                >
                                  {relatedItem?.title}
                                  <ArrowRight
                                    size={10}
                                    className="ml-1 text-emerald-400"
                                  />
                                </Button>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
