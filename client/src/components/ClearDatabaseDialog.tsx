import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { AlertTriangle, Loader2, Trash2, ShieldAlert } from "lucide-react";
import { toast } from "sonner";
import { cleanEntireDatabase } from "@/lib/excelImport";
import { useSupabaseAuth } from "@/hooks/useSupabaseAuth";
import type { Profile } from "@/lib/supabase";

interface ClearDatabaseDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  totalRecords: number;
  profile: Profile | null;
  onSuccess: () => void;
}

export default function ClearDatabaseDialog({
  open,
  onOpenChange,
  totalRecords,
  profile,
  onSuccess,
}: ClearDatabaseDialogProps) {
  const { user } = useSupabaseAuth();
  const [clearing, setClearing] = useState(false);
  const [confirmed, setConfirmed] = useState(false);

  const handleConfirmClear = async () => {
    setClearing(true);
    try {
      const res = await cleanEntireDatabase({ user, profile });
      toast.success("Base de dados limpa com sucesso!", {
        description: `${res.count} registros foram removidos do sistema.`,
      });
      setConfirmed(false);
      onOpenChange(false);
      onSuccess();
    } catch (error) {
      toast.error("Falha ao limpar a base de dados", {
        description:
          error instanceof Error
            ? error.message
            : "Verifique suas permissões de administrador e tente novamente.",
      });
    } finally {
      setClearing(false);
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(val) => {
        if (!clearing) {
          setConfirmed(false);
          onOpenChange(val);
        }
      }}
    >
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <div className="mb-3 flex size-11 items-center justify-center rounded-2xl border border-red-200 bg-red-50 text-red-600 shadow-sm">
            <Trash2 className="size-5" />
          </div>
          <DialogTitle className="text-xl font-bold tracking-tight text-red-600">
            Limpar Toda a Base Atual?
          </DialogTitle>
          <DialogDescription className="text-sm leading-relaxed text-muted-foreground">
            Esta ação é <strong className="text-foreground">irreversível</strong> e
            removerá todos os <strong className="text-foreground">{totalRecords} ativos</strong>{" "}
            cadastrados no sistema, liberando o inventário para uma nova importação.
          </DialogDescription>
        </DialogHeader>

        <div className="my-2 space-y-3 rounded-xl border border-amber-200 bg-amber-50/70 p-3.5 text-xs text-amber-900">
          <div className="flex items-start gap-2.5">
            <ShieldAlert className="mt-0.5 size-4 shrink-0 text-amber-600" />
            <div>
              <p className="font-semibold text-amber-950">Aviso de Governança</p>
              <p className="mt-0.5 leading-5 text-amber-800/90">
                Uma entrada de auditoria será gerada registrando seu usuário, data e
                hora da limpeza completa da base.
              </p>
            </div>
          </div>
        </div>

        <div className="pt-2">
          <label className="flex cursor-pointer items-center gap-2.5 select-none rounded-lg border border-border p-3 hover:bg-muted/40 transition">
            <input
              type="checkbox"
              checked={confirmed}
              onChange={(e) => setConfirmed(e.target.checked)}
              className="size-4 rounded border-slate-300 text-red-600 focus:ring-red-500"
            />
            <span className="text-xs font-medium text-foreground">
              Estou ciente de que todos os dados patrimoniais serão apagados.
            </span>
          </label>
        </div>

        <DialogFooter className="gap-2 pt-3">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={clearing}
            className="rounded-xl"
          >
            Cancelar
          </Button>
          <Button
            type="button"
            variant="destructive"
            onClick={handleConfirmClear}
            disabled={!confirmed || clearing}
            className="gap-1.5 rounded-xl bg-red-600 text-white hover:bg-red-700 shadow-sm"
          >
            {clearing ? (
              <>
                <Loader2 className="size-4 animate-spin" />
                Limpando base...
              </>
            ) : (
              <>
                <Trash2 className="size-4" />
                Confirmar e Limpar Tudo
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
