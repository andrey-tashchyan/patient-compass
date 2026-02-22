import { useCredits } from "@/context/CreditContext";
import paidLogo from "@/assets/paid-logo.png";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { RefreshCw } from "lucide-react";

const CreditCounter = () => {
  const { total, used, remaining, planName, refillCredits, hasCredits } = useCredits();
  const pct = Math.round((remaining / total) * 100);

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button className="flex items-center gap-2 h-9 px-3 text-sm border border-border rounded-lg hover:bg-muted transition-colors">
          <img src={paidLogo} alt="Paid" className="h-4" />
          <span className="font-medium tabular-nums">
            {remaining}
            <span className="text-muted-foreground font-normal"> / {total}</span>
          </span>
        </button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-72 p-4 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <img src={paidLogo} alt="Paid" className="h-5" />
            <span className="font-semibold text-sm">API Credits</span>
          </div>
          <span className="text-xs bg-muted px-2 py-0.5 rounded-full text-muted-foreground">
            {planName}
          </span>
        </div>

        <div className="space-y-1.5">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Remaining</span>
            <span className="font-medium tabular-nums">{remaining} credits</span>
          </div>
          <Progress value={pct} className="h-2" />
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>{used} used this month</span>
            <span>{pct}%</span>
          </div>
        </div>

        {!hasCredits && (
          <div className="rounded-md bg-destructive/10 border border-destructive/20 p-2 text-xs text-destructive font-medium text-center">
            No remaining credits. Upgrade plan.
          </div>
        )}

        <Button
          variant="outline"
          size="sm"
          className="w-full gap-1.5"
          onClick={refillCredits}
        >
          <RefreshCw className="h-3.5 w-3.5" />
          Refill Credits (Admin)
        </Button>

        <p className="text-[10px] text-muted-foreground text-center">
          Powered by <span className="font-semibold">Paid</span>
        </p>
      </PopoverContent>
    </Popover>
  );
};

export default CreditCounter;
