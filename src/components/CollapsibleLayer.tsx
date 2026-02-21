import { useState } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface CollapsibleLayerProps {
  title: string;
  icon: React.ReactNode;
  badge?: React.ReactNode;
  defaultOpen?: boolean;
  children: React.ReactNode;
}

const CollapsibleLayer = ({ title, icon, badge, defaultOpen = true, children }: CollapsibleLayerProps) => {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <div className="layer-section">
      <button className="layer-header w-full" onClick={() => setIsOpen(!isOpen)}>
        <div className="flex items-center gap-2.5">
          {isOpen ? <ChevronDown className="h-4 w-4 text-muted-foreground" /> : <ChevronRight className="h-4 w-4 text-muted-foreground" />}
          <span className="text-muted-foreground">{icon}</span>
          <span className="text-sm font-semibold tracking-wide uppercase">{title}</span>
        </div>
        {badge && <div>{badge}</div>}
      </button>
      <AnimatePresence initial={false}>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2, ease: "easeInOut" }}
            className="overflow-hidden"
          >
            <div className="layer-content">{children}</div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default CollapsibleLayer;
