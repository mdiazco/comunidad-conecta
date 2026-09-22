import React, { useState } from 'react';
import { User, IdCard, Mail, Phone, Loader2, CheckCircle2, Send } from 'lucide-react';
import { base44 } from '@/api/base44Client';

const INITIAL = { full_name: '', rut: '', email: '', phone: '' };

export default function LeadForm() {
  const [form, setForm] = useState(INITIAL);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  const handleChange = (field) => (e) => {
    setForm((prev) => ({ ...prev, [field]: e.target.value }));
    if (success) setSuccess(false);
    if (error) setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!form.full_name || !form.rut || !form.email || !form.phone) {
      setError('Por favor completa todos los campos.');
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
      setError('El email ingresado no es válido.');
      return;
    }

    setLoading(true);
    try {
      const res = await base44.functions.invoke('registerLead', form);
      setSuccess(true);
      setForm(INITIAL);
    } catch (err) {
      const msg = err?.response?.data?.error || err?.message || 'No se pudo enviar el registro. Inténtalo nuevamente.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="text-center py-6">
        <div className="w-16 h-16 rounded-full mx-auto mb-4 flex items-center justify-center" style={{ background: '#E6F9F0' }}>
          <CheckCircle2 className="w-9 h-9" style={{ color: '#16A34A' }} />
        </div>
        <h3 className="font-bold text-xl mb-2" style={{ color: '#0A0A2E' }}>¡Registro enviado!</h3>
        <p className="text-sm mb-5" style={{ color: '#6B7280' }}>
          Gracias por tu interés. Nuestro equipo se pondrá en contacto contigo pronto.
        </p>
        <button
          onClick={() => setSuccess(false)}
          className="font-semibold px-6 py-2.5 rounded-full text-sm transition-all"
          style={{ background: '#0055FF', color: 'white' }}
        >
          Registrar otro interesado
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Nombre */}
      <div>
        <label className="block text-xs font-semibold mb-1.5" style={{ color: '#0A0A2E' }}>Nombre completo</label>
        <div className="relative">
          <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: '#9AA3B5' }} />
          <input
            type="text"
            value={form.full_name}
            onChange={handleChange('full_name')}
            placeholder="Ej. María González"
            disabled={loading}
            className="w-full pl-9 pr-4 py-2.5 rounded-lg text-sm outline-none transition-all"
            style={{ background: '#F8FAFF', border: '1.5px solid #D0DBFF', color: '#0A0A2E' }}
          />
        </div>
      </div>

      {/* RUT */}
      <div>
        <label className="block text-xs font-semibold mb-1.5" style={{ color: '#0A0A2E' }}>RUT</label>
        <div className="relative">
          <IdCard className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: '#9AA3B5' }} />
          <input
            type="text"
            value={form.rut}
            onChange={handleChange('rut')}
            placeholder="Ej. 12.345.678-9"
            disabled={loading}
            className="w-full pl-9 pr-4 py-2.5 rounded-lg text-sm outline-none transition-all"
            style={{ background: '#F8FAFF', border: '1.5px solid #D0DBFF', color: '#0A0A2E' }}
          />
        </div>
      </div>

      {/* Email */}
      <div>
        <label className="block text-xs font-semibold mb-1.5" style={{ color: '#0A0A2E' }}>Email</label>
        <div className="relative">
          <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: '#9AA3B5' }} />
          <input
            type="email"
            value={form.email}
            onChange={handleChange('email')}
            placeholder="Ej. maria@email.cl"
            disabled={loading}
            className="w-full pl-9 pr-4 py-2.5 rounded-lg text-sm outline-none transition-all"
            style={{ background: '#F8FAFF', border: '1.5px solid #D0DBFF', color: '#0A0A2E' }}
          />
        </div>
      </div>

      {/* Teléfono */}
      <div>
        <label className="block text-xs font-semibold mb-1.5" style={{ color: '#0A0A2E' }}>Teléfono</label>
        <div className="relative">
          <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: '#9AA3B5' }} />
          <input
            type="tel"
            value={form.phone}
            onChange={handleChange('phone')}
            placeholder="Ej. +56 9 1234 5678"
            disabled={loading}
            className="w-full pl-9 pr-4 py-2.5 rounded-lg text-sm outline-none transition-all"
            style={{ background: '#F8FAFF', border: '1.5px solid #D0DBFF', color: '#0A0A2E' }}
          />
        </div>
      </div>

      {error && (
        <p className="text-sm" style={{ color: '#DC2626' }}>{error}</p>
      )}

      <button
        type="submit"
        disabled={loading}
        className="w-full font-bold py-3 rounded-full text-white flex items-center justify-center gap-2 transition-all disabled:opacity-60"
        style={{ background: '#0055FF', boxShadow: '0 8px 24px rgba(0,85,255,0.35)' }}
      >
        {loading ? (
          <><Loader2 className="w-4 h-4 animate-spin" /> Enviando...</>
        ) : (
          <>Enviar registro <Send className="w-4 h-4" /></>
        )}
      </button>
    </form>
  );
}