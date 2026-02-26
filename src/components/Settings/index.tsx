import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, User, Bot, Database } from "lucide-react";
import { useAppVersion } from "@/hooks/useAppVersion";
import { cn } from "@/lib";
import { ProfileTab } from "@/components/Settings/tabs/ProfileTab";
import { AITab } from "@/components/Settings/tabs/AITab";
import { DataTab } from "@/components/Settings/tabs/DataTab";

type SettingsTab = "profile" | "ai" | "data";

const TABS: { id: SettingsTab; label: string; icon: React.ReactNode }[] = [
  { id: "profile", label: "Profil", icon: <User size={14} /> },
  { id: "ai", label: "IA", icon: <Bot size={14} /> },
  { id: "data", label: "Données", icon: <Database size={14} /> },
];

interface SettingsProps {
  onClose: () => void;
}

export function Settings({ onClose }: SettingsProps) {
  const [activeTab, setActiveTab] = useState<SettingsTab>("profile");
  const version = useAppVersion();

  return (
    <div className="flex h-screen w-screen flex-col bg-surface-deep pt-8">
      <div className="texture-overlay pointer-events-none fixed inset-0 z-50" />

      <div className="relative z-10 mx-auto flex w-full max-w-2xl flex-1 flex-col overflow-hidden px-8 py-6">
        {/* Header */}
        <div className="mb-6 flex items-center gap-4">
          <motion.button
            onClick={onClose}
            className="flex cursor-pointer items-center gap-2 text-text-muted transition-all duration-200 hover:text-accent"
            whileHover={{ x: -2 }}
            whileTap={{ scale: 0.98 }}
          >
            <ArrowLeft size={16} />
          </motion.button>
          <h1 className="text-metallic text-2xl font-bold tracking-tight">Paramètres</h1>
        </div>

        {/* Tabs */}
        <div className="mb-6 flex gap-1 rounded-xl border border-border-metallic bg-surface-elevated p-1">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                "flex flex-1 cursor-pointer items-center justify-center gap-2 rounded-lg px-3 py-2 text-xs font-medium transition-all duration-200",
                activeTab === tab.id
                  ? "bg-surface-hover text-text shadow-[inset_0_1px_0_0_rgba(255,255,255,0.04),0_1px_3px_rgba(0,0,0,0.2)]"
                  : "text-text-muted hover:text-text-secondary"
              )}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </div>

        {/* Tab content */}
        <div className="flex-1 overflow-y-auto">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.15 }}
            >
              {activeTab === "profile" && <ProfileTab />}
              {activeTab === "ai" && <AITab />}
              {activeTab === "data" && <DataTab />}
            </motion.div>
          </AnimatePresence>

          {/* Footer */}
          <div className="py-8 text-center">
            <p className="font-mono text-[10px] uppercase tracking-widest text-text-ghost">
              STEM{version ? ` v${version}` : ""}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
