import React, { useState } from "react";
import MrPayLogo from "@/components/MrPayLogo";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useSupabaseAuth } from "@/hooks/useSupabaseAuth";
import { isSupabaseConfigured } from "@/lib/supabase";
import { toast } from "sonner";
import { LockKeyhole, ArrowRight, Sparkles } from "lucide-react";

interface WelcomeScreenProps {
  onEnterSystem: () => void;
}

export default function WelcomeScreen({ onEnterSystem }: WelcomeScreenProps) {
  const { user, signIn, signUp } = useSupabaseAuth();
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [pending, setPending] = useState(false);

  const handleMainButtonClick = () => {
    if (user) {
      onEnterSystem();
    } else {
      setAuthModalOpen(true);
    }
  };

  const handleAuthSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setPending(true);
    try {
      if (mode === "login") {
        await signIn(email, password);
        toast.success("Sessão iniciada com sucesso!", {
          description: "Bem-vindo ao sistema de controle de ativos MR Pay.",
        });
      } else {
        await signUp(email, password, fullName);
        toast.success("Conta criada com sucesso!", {
          description: "Verifique seu e-mail para confirmação se necessário.",
        });
      }
      setAuthModalOpen(false);
      onEnterSystem();
    } catch (error) {
      // If Supabase is not configured or fails, offer demo entrance
      if (!isSupabaseConfigured) {
        toast.info("Acesso em modo demonstração liberado.");
        setAuthModalOpen(false);
        onEnterSystem();
      } else {
        toast.error("Não foi possível realizar o login", {
          description: error instanceof Error ? error.message : "Verifique suas credenciais e tente novamente.",
        });
      }
    } finally {
      setPending(false);
    }
  };

  const handleDemoAccess = () => {
    setAuthModalOpen(false);
    onEnterSystem();
    toast.success("Acesso liberado", {
      description: "Navegando no modo demonstração de ativos.",
    });
  };

  return (
    <div className="relative flex min-h-screen w-full flex-col items-center justify-center bg-[#0d1527] px-4 py-12 text-slate-100 selection:bg-blue-600 selection:text-white">
      {/* Subtle background glow effects */}
      <div className="pointer-events-none absolute -top-24 left-1/2 h-96 w-96 -translate-x-1/2 rounded-full bg-blue-600/10 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-24 left-1/2 h-96 w-96 -translate-x-1/2 rounded-full bg-sky-500/10 blur-3xl" />

      {/* Main Card */}
      <div className="relative z-10 w-full max-w-[430px] rounded-3xl border border-[#23325c] bg-[#16203d]/90 p-8 shadow-[0_25px_60px_-15px_rgba(0,0,0,0.7)] backdrop-blur-xl sm:p-10">
        {/* Logo Container */}
        <div className="flex justify-center pb-2 pt-2">
          <MrPayLogo size={110} />
        </div>

        {/* Title & Subtitle */}
        <div className="mt-8 text-center">
          <h1 className="text-2xl font-bold tracking-tight text-white sm:text-[26px]">
            Bem Vindo
          </h1>
          <p className="mt-2 text-sm font-normal text-[#8ea1c1]">
            Faça login para acessar o sistema de ativos
          </p>
        </div>

        {/* Action Button */}
        <div className="mt-8">
          <button
            type="button"
            onClick={handleMainButtonClick}
            className="flex h-12 w-full cursor-pointer items-center justify-center rounded-xl bg-[#166fe5] px-4 text-base font-semibold text-white shadow-lg shadow-blue-600/25 transition-all duration-150 hover:bg-[#155fc0] hover:shadow-blue-600/35 active:scale-[0.99]"
          >
            Entrar no Sistema
          </button>
        </div>

        {/* Divider */}
        <div className="my-7 w-full border-t border-[#25355e]" />

        {/* Disclaimer / Notice */}
        <div className="space-y-1 text-center">
          <p className="text-xs text-[#70809e]">
            Acesso restrito a usuários autorizados.
          </p>
          <p className="text-xs text-[#70809e]">
            Em caso de dúvidas, entre em contato com o administrador.
          </p>
        </div>
      </div>

      {/* Footer Details */}
      <div className="relative z-10 mt-6 space-y-1 text-center text-xs text-[#64748b]">
        <p className="font-mono text-xs text-[#70809e]">v. 1.0.0.1</p>
        <p className="text-[#64748b]">© 2026 MR Pay — Todos os direitos reservados</p>
        <p className="text-[#64748b]">
          Desenvolvido por GERTEC/ConsulTI - (98) 98600-1270
        </p>
      </div>

      {/* Login Dialog Modal */}
      <Dialog open={authModalOpen} onOpenChange={setAuthModalOpen}>
        <DialogContent className="border-[#23325c] bg-[#16203d] text-white shadow-2xl sm:max-w-[430px]">
          <DialogHeader>
            <div className="mb-2 flex size-10 items-center justify-center rounded-xl bg-blue-600 text-white shadow-md shadow-blue-600/30">
              <LockKeyhole className="size-4" />
            </div>
            <DialogTitle className="text-xl font-bold tracking-tight text-white">
              {mode === "login" ? "Acessar Sistema de Ativos" : "Criar acesso operacional"}
            </DialogTitle>
            <DialogDescription className="text-xs text-[#8ea1c1]">
              {mode === "login"
                ? "Entre com suas credenciais para consultar e gerenciar os ativos MR Pay."
                : "Cadastre-se como operador para acompanhar a custódia e inventário."}
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleAuthSubmit} className="space-y-4 pt-2">
            {mode === "signup" && (
              <div className="space-y-1.5">
                <Label htmlFor="welcome-fullName" className="text-xs font-medium text-slate-200">
                  Nome completo
                </Label>
                <Input
                  id="welcome-fullName"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Nome do Operador"
                  className="border-[#2a3c6d] bg-[#0f172a]/70 text-sm text-white placeholder:text-slate-500 focus-visible:ring-blue-500"
                  required
                />
              </div>
            )}

            <div className="space-y-1.5">
              <Label htmlFor="welcome-email" className="text-xs font-medium text-slate-200">
                E-mail corporativo
              </Label>
              <Input
                id="welcome-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="operador@mrpay.com.br"
                className="border-[#2a3c6d] bg-[#0f172a]/70 text-sm text-white placeholder:text-slate-500 focus-visible:ring-blue-500"
                required
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="welcome-password" className="text-xs font-medium text-slate-200">
                Senha
              </Label>
              <Input
                id="welcome-password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Mínimo 6 caracteres"
                minLength={6}
                className="border-[#2a3c6d] bg-[#0f172a]/70 text-sm text-white placeholder:text-slate-500 focus-visible:ring-blue-500"
                required
              />
            </div>

            <DialogFooter className="flex-col gap-2 pt-3 sm:flex-col">
              <Button
                type="submit"
                className="h-11 w-full rounded-xl bg-[#166fe5] font-semibold text-white shadow-md shadow-blue-600/30 hover:bg-[#155fc0]"
                disabled={pending}
              >
                {pending ? "Autenticando..." : mode === "login" ? "Entrar com Credenciais" : "Criar Conta"}
              </Button>

              <Button
                type="button"
                variant="outline"
                onClick={handleDemoAccess}
                className="h-10 w-full rounded-xl border-[#2a3c6d] bg-transparent text-xs text-[#8ea1c1] hover:bg-[#1f2d52] hover:text-white"
              >
                <Sparkles className="mr-1.5 size-3.5 text-sky-400" />
                Acessar modo demonstração
              </Button>
            </DialogFooter>
          </form>

          <button
            type="button"
            onClick={() => setMode(mode === "login" ? "signup" : "login")}
            className="mt-2 text-center text-xs font-medium text-[#8ea1c1] transition hover:text-white"
          >
            {mode === "login" ? "Ainda não tenho acesso? Cadastrar" : "Já tenho uma conta? Fazer login"}
          </button>
        </DialogContent>
      </Dialog>
    </div>
  );
}
