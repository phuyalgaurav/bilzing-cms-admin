import { LoaderCircle } from "lucide-react";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";

export function ConfirmDialog({ open, onOpenChange, title, description, confirmLabel = "Delete", onConfirm, pending = false }: { open: boolean; onOpenChange(open: boolean): void; title: string; description: string; confirmLabel?: string; onConfirm(): void; pending?: boolean }) {
  return <AlertDialog open={open} onOpenChange={onOpenChange}><AlertDialogContent><AlertDialogHeader><AlertDialogTitle>{title}</AlertDialogTitle><AlertDialogDescription>{description}</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel disabled={pending}>Cancel</AlertDialogCancel><AlertDialogAction disabled={pending} onClick={onConfirm}>{pending ? <LoaderCircle className="size-4 animate-spin" /> : null}{confirmLabel}</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog>;
}
