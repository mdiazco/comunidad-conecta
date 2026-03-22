import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { CheckCircle2 } from 'lucide-react';

const BANKS = [
  'Banco de Chile', 'Banco Santander', 'Banco BCI', 'Banco Estado',
  'Banco Falabella', 'Banco Ripley', 'Banco Security', 'Banco BICE',
  'Banco Itaú', 'Scotiabank', 'Banco Internacional', 'Coopeuch',
];

const ACCOUNT_TYPES = ['Cuenta Corriente', 'Cuenta Vista', 'Cuenta de Ahorro', 'Chequera Electrónica'];

const EMPTY = {
  name: '', giro: '', email: '', phone: '', rut: '', razon_social: '',
  bank_name: '', account_type: '', bank_rut: '', account_number: '',
};

export default function SupplierFormDialog({ open, onOpenChange, supplier = null }) {
  const queryClient = useQueryClient();
  const [step, setStep] = useState(1);
  const [form, setForm] = useState(EMPTY);
  const [errors, setErrors] = useState({});

  useEffect(() => {
    if (open) {
      setForm(supplier ? { ...EMPTY, ...supplier } : EMPTY);
      setStep(1);
      setErrors({});
    }
  }, [open, supplier]);

  const set = (field, value) => setForm(f => ({ ...f, [field]: value }));

  const mutation = useMutation({
    mutationFn: (data) => supplier
      ? base44.entities.Supplier.update(supplier.id, data)
      : base44.entities.Supplier.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['suppliers'] });
      toast.success(supplier ? 'Proveedor actualizado' : 'Proveedor creado exitosamente');
      onOpenChange(false);
    },
  });

  const validateStep1 = () => {
    const e = {};
    if (!form.name.trim()) e.name = 'Este campo es obligatorio';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleNext = () => {
    if (validateStep1()) setStep(2);
  };

  const handleCreate = () => {
    mutation.mutate(form);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{supplier ? 'Editar Proveedor' : 'Crear Proveedor'}</DialogTitle>
        </DialogHeader>

        {/* Stepper */}
        <div className="flex items-center gap-2 py-2">
          {[1, 2].map((s, i) => (
            <React.Fragment key={s}>
              <div className="flex items-center gap-2">
                <div className={cn(
                  "h-5 w-5 rounded-full flex items-center justify-center text-[11px] font-bold border-2 transition-all",
                  step > s
                    ? "bg-primary border-primary text-white"
                    : step === s
                      ? "border-primary bg-primary text-white"
                      : "border-border bg-muted text-muted-foreground"
                )}>
                  {step > s ? <CheckCircle2 className="h-3 w-3" /> : s}
                </div>
                <span className={cn(
                  "text-xs font-medium",
                  step >= s ? "text-foreground" : "text-muted-foreground"
                )}>
                  {s === 1 ? 'Información General' : 'Datos Bancarios'}
                </span>
              </div>
              {i < 1 && (
                <div className={cn("flex-1 h-0.5 mx-1", step > 1 ? "bg-primary" : "bg-border")} />
              )}
            </React.Fragment>
          ))}
        </div>

        {/* ── Step 1: Información General ── */}
        {step === 1 && (
          <div className="space-y-4">
            <p className="text-sm font-semibold text-foreground">Información Proveedor</p>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="name">Nombre <span className="text-red-500">*</span></Label>
                <Input id="name" placeholder="Pedro Pérez" value={form.name} onChange={e => set('name', e.target.value)} />
                {errors.name && <p className="text-xs text-red-500">* {errors.name}</p>}
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="giro">Giro</Label>
                <Input id="giro" placeholder="Sin giro" value={form.giro} onChange={e => set('giro', e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="email">Email</Label>
                <Input id="email" type="email" placeholder="pedro@ejemplo.cl" value={form.email} onChange={e => set('email', e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="phone">Teléfono</Label>
                <Input id="phone" placeholder="+56991652878" value={form.phone} onChange={e => set('phone', e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="rut">Rut</Label>
                <Input id="rut" placeholder="12.345.678-9" value={form.rut} onChange={e => set('rut', e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="razon_social">Razón Social</Label>
                <Input id="razon_social" placeholder="" value={form.razon_social} onChange={e => set('razon_social', e.target.value)} />
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <Button onClick={handleNext}>Siguiente</Button>
            </div>
          </div>
        )}

        {/* ── Step 2: Datos Bancarios ── */}
        {step === 2 && (
          <div className="space-y-4">
            <p className="text-sm font-semibold text-foreground">Cuenta Bancaria Proveedor</p>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Banco</Label>
                <Select value={form.bank_name} onValueChange={v => set('bank_name', v)}>
                  <SelectTrigger><SelectValue placeholder="Seleccione un Banco" /></SelectTrigger>
                  <SelectContent>
                    {BANKS.map(b => <SelectItem key={b} value={b}>{b}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Tipo de cuenta</Label>
                <Select value={form.account_type} onValueChange={v => set('account_type', v)}>
                  <SelectTrigger><SelectValue placeholder="Cuenta" /></SelectTrigger>
                  <SelectContent>
                    {ACCOUNT_TYPES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Rut</Label>
                <Input placeholder="12.345.678-9" value={form.bank_rut} onChange={e => set('bank_rut', e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label>Número De Cuenta</Label>
                <Input placeholder="" value={form.account_number} onChange={e => set('account_number', e.target.value)} />
              </div>
            </div>

            <div className="flex justify-between pt-2">
              <Button variant="outline" onClick={() => setStep(1)}>Volver</Button>
              <Button onClick={handleCreate} disabled={mutation.isPending}>
                {mutation.isPending ? 'Guardando...' : supplier ? 'Actualizar' : 'Crear'}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}