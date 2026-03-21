import React from 'react';
import { Link } from 'react-router-dom';
import { Building2, ClipboardList, Users, Shield, ChevronRight, CheckCircle2, Bell, FileText } from 'lucide-react';

const features = [
  {
    icon: Building2,
    title: 'Gestión Multi-Comunidad',
    desc: 'Administra edificios y condominios desde un único panel centralizado con visibilidad total.',
  },
  {
    icon: ClipboardList,
    title: 'Tareas Operativas',
    desc: 'Crea, asigna y hace seguimiento de tareas preventivas, de emergencia y administrativas.',
  },
  {
    icon: FileText,
    title: 'Procedimientos y Evidencias',
    desc: 'Documenta procesos operativos con flujos, adjuntos PDF y registro versionado de evidencias.',
  },
  {
    icon: Users,
    title: 'Roles y Permisos',
    desc: 'Comité, administrador, equipo operativo: cada rol ve y hace exactamente lo que le corresponde.',
  },
  {
    icon: Bell,
    title: 'Notificaciones en Tiempo Real',
    desc: 'Alertas automáticas de tareas asignadas, vencimientos y observaciones del comité.',
  },
  {
    icon: Shield,
    title: 'Trazabilidad y Auditoría',
    desc: 'Registro completo de cada acción para transparencia total ante el comité y la administración.',
  },
];

const workflow = [
  { step: '01', label: 'Crea la comunidad', desc: 'Registra los datos del edificio o condominio.' },
  { step: '02', label: 'Invita a tu equipo', desc: 'Asigna roles: administrador, operativo o comité.' },
  { step: '03', label: 'Gestiona tareas', desc: 'Crea, asigna y ejecuta con seguimiento en tiempo real.' },
  { step: '04', label: 'Registra evidencias', desc: 'Sube fotos y documentos como respaldo de cada trabajo.' },
];

export default function Landing() {
  return (
    <div className="min-h-screen bg-white font-inter">

      {/* HEADER */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-white/90 backdrop-blur border-b border-slate-100">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
              <Building2 className="w-4 h-4 text-white" />
            </div>
            <span className="font-bold text-slate-800 text-lg">Comunidad Conecta</span>
          </div>
          <Link
            to="/dashboard"
            className="flex items-center gap-2 bg-primary text-white text-sm font-medium px-4 py-2 rounded-lg hover:bg-primary/90 transition-colors"
          >
            Ingresar al sistema <ChevronRight className="w-4 h-4" />
          </Link>
        </div>
      </header>

      {/* HERO */}
      <section className="pt-32 pb-24 px-6 bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900 relative overflow-hidden">
        {/* decorative circles */}
        <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-primary/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/4 pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-blue-500/10 rounded-full blur-3xl translate-y-1/2 -translate-x-1/4 pointer-events-none" />

        <div className="max-w-4xl mx-auto text-center relative z-10">
          <span className="inline-block bg-primary/20 text-blue-300 text-xs font-semibold px-3 py-1 rounded-full mb-6 border border-primary/30">
            Plataforma de gestión residencial
          </span>
          <h1 className="text-4xl md:text-6xl font-extrabold text-white leading-tight mb-6">
            La gestión de tu comunidad,{' '}
            <span className="text-primary">sin fricciones</span>
          </h1>
          <p className="text-slate-300 text-lg md:text-xl leading-relaxed max-w-2xl mx-auto mb-10">
            Comunidad Conecta centraliza la administración de edificios y condominios: tareas operativas, procedimientos, evidencias y comunicación entre equipo y comité en un solo lugar.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              to="/dashboard"
              className="bg-primary text-white font-semibold px-8 py-3.5 rounded-xl hover:bg-primary/90 transition-colors text-base flex items-center justify-center gap-2"
            >
              Acceder al panel <ChevronRight className="w-5 h-5" />
            </Link>
            <a
              href="#features"
              className="bg-white/10 text-white font-semibold px-8 py-3.5 rounded-xl hover:bg-white/20 transition-colors text-base border border-white/20"
            >
              Conocer más
            </a>
          </div>
        </div>

        {/* mini stats */}
        <div className="max-w-3xl mx-auto mt-16 grid grid-cols-3 gap-4 relative z-10">
          {[
            { value: 'Multi-tenant', label: 'Varias comunidades' },
            { value: 'Rol-based', label: 'Control de accesos' },
            { value: 'Trazable', label: 'Auditoría completa' },
          ].map((s) => (
            <div key={s.label} className="text-center border border-white/10 rounded-xl p-4 bg-white/5">
              <div className="text-white font-bold text-xl">{s.value}</div>
              <div className="text-slate-400 text-sm mt-1">{s.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* FEATURES */}
      <section id="features" className="py-24 px-6 bg-slate-50">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-14">
            <h2 className="text-3xl md:text-4xl font-bold text-slate-800">Todo lo que necesitas para operar</h2>
            <p className="text-slate-500 mt-3 text-lg max-w-xl mx-auto">Funcionalidades diseñadas para el día a día de administradores y equipos operativos.</p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((f) => (
              <div key={f.title} className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm hover:shadow-md transition-shadow">
                <div className="w-11 h-11 bg-primary/10 rounded-xl flex items-center justify-center mb-4">
                  <f.icon className="w-5 h-5 text-primary" />
                </div>
                <h3 className="font-semibold text-slate-800 mb-2">{f.title}</h3>
                <p className="text-slate-500 text-sm leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* WORKFLOW */}
      <section className="py-24 px-6 bg-white">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-14">
            <h2 className="text-3xl md:text-4xl font-bold text-slate-800">¿Cómo funciona?</h2>
            <p className="text-slate-500 mt-3 text-lg">Comienza en minutos con un flujo simple y estructurado.</p>
          </div>
          <div className="grid md:grid-cols-4 gap-8">
            {workflow.map((w, i) => (
              <div key={w.step} className="flex flex-col items-center text-center relative">
                {i < workflow.length - 1 && (
                  <div className="hidden md:block absolute top-6 left-[calc(50%+28px)] right-[-calc(50%-28px)] h-px bg-slate-200 z-0" style={{width: 'calc(100% - 56px)', left: 'calc(50% + 28px)'}} />
                )}
                <div className="w-12 h-12 rounded-full bg-primary text-white font-bold text-sm flex items-center justify-center mb-4 z-10 relative shadow-lg">
                  {w.step}
                </div>
                <h4 className="font-semibold text-slate-800 mb-1">{w.label}</h4>
                <p className="text-slate-500 text-sm">{w.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 px-6 bg-gradient-to-r from-primary to-blue-700">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">Listo para conectar tu comunidad</h2>
          <p className="text-blue-100 text-lg mb-8">Accede al panel de administración y empieza a gestionar tus comunidades hoy mismo.</p>
          <Link
            to="/dashboard"
            className="inline-flex items-center gap-2 bg-white text-primary font-bold px-8 py-3.5 rounded-xl hover:bg-blue-50 transition-colors text-base shadow-lg"
          >
            <CheckCircle2 className="w-5 h-5" /> Ingresar al sistema
          </Link>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="bg-slate-900 text-slate-400 py-8 px-6 text-center text-sm">
        <div className="flex items-center justify-center gap-2 mb-2">
          <Building2 className="w-4 h-4 text-primary" />
          <span className="text-white font-semibold">Comunidad Conecta 2.0</span>
        </div>
        <p>Plataforma de gestión residencial · {new Date().getFullYear()}</p>
      </footer>
    </div>
  );
}