import { useState } from "react";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch, useLocation } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import Home from "./pages/Home";
import WelcomeScreen from "./pages/WelcomeScreen";
import { useSupabaseAuth } from "./hooks/useSupabaseAuth";

function MainApp() {
  const { user } = useSupabaseAuth();
  const [hasEntered, setHasEntered] = useState(false);
  const [, setLocation] = useLocation();

  const handleEnter = () => {
    setHasEntered(true);
  };

  const handleExit = () => {
    setHasEntered(false);
    setLocation("/");
  };

  return (
    <Switch>
      <Route path="/welcome">
        <WelcomeScreen
          onEnterSystem={() => {
            handleEnter();
            setLocation("/");
          }}
        />
      </Route>
      <Route path="/login">
        <WelcomeScreen
          onEnterSystem={() => {
            handleEnter();
            setLocation("/");
          }}
        />
      </Route>
      <Route path="/inventario">
        <Home onExit={handleExit} />
      </Route>
      <Route path="/">
        {user || hasEntered ? (
          <Home onExit={handleExit} />
        ) : (
          <WelcomeScreen onEnterSystem={handleEnter} />
        )}
      </Route>
      <Route path="/404" component={NotFound} />
      {/* Final fallback route */}
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="light">
        <TooltipProvider>
          <Toaster />
          <MainApp />
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
