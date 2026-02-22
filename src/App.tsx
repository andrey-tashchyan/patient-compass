import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { CreditProvider } from "@/context/CreditContext";
import Index from "./pages/Index";
import PatientDashboard from "./pages/PatientDashboard";
import PrescriptionWindow from "./pages/PrescriptionWindow";
import NotFound from "./pages/NotFound";
import PatientEvolution from "./pages/PatientEvolution";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <CreditProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/patient-evolution" element={<PatientEvolution />} />
            <Route path="/patient/:id" element={<PatientDashboard />} />
            <Route path="/patient/:id/prescribe" element={<PrescriptionWindow />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </CreditProvider>
  </QueryClientProvider>
);

export default App;
