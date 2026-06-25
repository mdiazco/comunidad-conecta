import React, { useRef, useState } from 'react';
import { Building2, ClipboardList, Users, Shield, ChevronRight, CheckCircle2, Bell, FileText, Play, Pause, Volume2, VolumeX } from 'lucide-react';
import { base44 } from '@/api/base44Client';

const features = [
  {
    title: 'Gestión Multi-Comunidad',
    desc: 'Centraliza de contis y gestiscuón multi-comunidad.',
    imgSrc: 'https://media.base44.com/images/public/69be92d9b179f726fbced205/5abd15778_generated_image.png',
    imgStyle: { objectPosition: '0% 0%', width: '60px', height: '60px' },
    icon: Building2,
  },
  {
    title: 'Tareas Operativas',
    desc: 'Crea, asigna y hace seguimiento de tareas preventivas y operativas.',
    icon: ClipboardList,
  },
  {
    title: 'Procedimientos y Evidencias',
    desc: 'Documenta procesos operativos con flujos, adjuntos PDF y registro versionado de evidencias.',
    icon: FileText,
  },
  {
    title: 'Roles y Permisos',
    desc: 'Comité, administrador, equipo operativo: cada rol ve y hace exactamente lo que le corresponde.',
    icon: Users,
  },
  {
    title: 'Notificaciones en Tiempo Real',
    desc: 'Alertas automáticas de tareas asignadas, vencimientos y observaciones del comité.',
    icon: Bell,
  },
  {
    title: 'Trazabilidad y Auditoría',
    desc: 'Registro completo de cada acción para transparencia total ante el comité y la administración.',
    icon: Shield,
  },
];

const featureIcons = [Building2, ClipboardList, FileText, Users, Bell, Shield];

const workflow = [
  { step: '01', label: 'Crea la comunidad', desc: 'Crea ma comunidad de la comunidad, tarea fanátra la communido y atenita.' },
  { step: '02', label: 'Invita a tu equipo', desc: 'Invita dinamizacia tu equipo, inviti so dicommandos, con todas sa tareas, Inteligramente antonnies.' },
  { step: '03', label: 'Gestiona tareas', desc: 'Crea, asigna y ejecuta con seguimiento en tiempo real.' },
  { step: '04', label: 'Registra evidencias', desc: 'Registra aurnota y comerc a registrar avidencias, erivaación asidencias, treo, alesutes documentos y traces.' },
];

export default function Landing() {
  const handleLogin = () => base44.auth.redirectToLogin('/dashboard');

  return (
    <div className="min-h-screen font-inter" style={{ background: '#F0F4FF' }}>

      {/* HEADER */}
      <header className="fixed top-0 left-0 right-0 z-50" style={{ background: 'rgba(240,244,255,0.92)', backdropFilter: 'blur(12px)', borderBottom: '1px solid #E0E8FF' }}>
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center">
            <img src="https://media.base44.com/images/public/69be92d9b179f726fbced205/cf2a70525_lgcomunidad.png" alt="Comunidad Conecta" className="h-16 w-auto object-contain" />
          </div>

          {/* Nav links */}
          <nav className="hidden md:flex items-center gap-7">
            <a href="#inicio" className="text-sm font-semibold tracking-wide uppercase transition-colors hover:text-blue-600" style={{ color: '#0A0A2E' }}>Inicio</a>
            <a href="#features" className="text-sm font-semibold tracking-wide uppercase transition-colors hover:text-blue-600" style={{ color: '#0A0A2E' }}>Funcionalidades</a>
            <a href="#como-funciona" className="text-sm font-semibold tracking-wide uppercase transition-colors hover:text-blue-600" style={{ color: '#0A0A2E' }}>¿Cómo Funciona?</a>
            <a href="#comunidad" className="text-sm font-semibold tracking-wide uppercase transition-colors hover:text-blue-600" style={{ color: '#0A0A2E' }}>Comunidad</a>
            <a href="#contacto" className="text-sm font-semibold tracking-wide uppercase transition-colors hover:text-blue-600" style={{ color: '#0A0A2E' }}>Contacto</a>
          </nav>

          <button
            onClick={handleLogin}
            className="font-bold px-5 py-2 rounded-full text-sm text-white transition-all"
            style={{ background: '#0055FF' }}
          >
            Ingreso
          </button>
        </div>
      </header>

      {/* ── HERO ── */}
      <section id="inicio" className="pt-20 pb-0 overflow-hidden" style={{ background: '#F0F4FF' }}>
        <div className="max-w-6xl mx-auto px-6 grid md:grid-cols-2 gap-8 items-center min-h-[480px]">
          {/* Left text */}
          <div className="py-16">
            <h1 className="font-extrabold leading-tight mb-4" style={{ fontSize: '2.6rem', color: '#0A0A2E' }}>
              Conecta tu comunidad.<br />
              <span style={{ color: '#0055FF' }}>Gestiona sin fricciones.</span>
            </h1>
            <p className="text-base mb-8 leading-relaxed max-w-md" style={{ color: '#444466' }}>
              Centraliza la administración de edificios y condominios: tareas, procedimientos, evidencias y comunicación entre equipo y comité, en un solo lugar.
            </p>
            <div className="flex flex-wrap gap-3">
              <button
                onClick={handleLogin}
                className="font-bold px-7 py-3 rounded-full text-white flex items-center gap-2 transition-all shadow-lg"
                style={{ background: '#0055FF', boxShadow: '0 8px 24px rgba(0,85,255,0.35)' }}
              >
                Ingreso a la plataforma <ChevronRight className="w-4 h-4" />
              </button>
              <a
                href="#features"
                className="font-semibold px-7 py-3 rounded-full transition-all border"
                style={{ background: 'white', color: '#0A0A2E', border: '1.5px solid #D0DBFF' }}
              >
                Conocer más
              </a>
            </div>

            {/* Floating key labels */}
            <div className="flex flex-wrap gap-2 mt-8">
              {['Multi-tenant', 'Rol-based', 'Trazable', 'Evidencias', 'Welcome Home'].map(label => (
                <span
                  key={label}
                  className="text-xs font-semibold px-3 py-1.5 rounded-lg"
                  style={{ background: 'white', color: '#0055FF', border: '1.5px solid #D0DBFF', boxShadow: '0 2px 8px rgba(0,85,255,0.08)' }}
                >
                  {label}
                </span>
              ))}
            </div>
          </div>

          {/* Right isometric illustration */}
          <div className="flex items-center justify-center">
            <img
              src="https://media.base44.com/images/public/69be92d9b179f726fbced205/781cc4356_generated_image.png"
              alt="Isometric platform illustration"
              className="w-full max-w-lg object-contain"
              style={{ maxHeight: '480px' }}
            />
          </div>
        </div>
      </section>

      {/* ── FEATURES ── */}
      <section id="features" className="py-20 px-6" style={{ background: 'white' }}>
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="font-bold text-4xl mb-3" style={{ color: '#0A0A2E' }}>Todo lo que necesitas para operar</h2>
            <p className="text-base" style={{ color: '#6B7280' }}>Funcionalidades diseñadas para el día a día de administradores y equipos operativos.</p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
            {features.map((f, i) => {
              const Icon = featureIcons[i];
              return (
                <div
                  key={f.title}
                  className="rounded-2xl p-6 flex flex-col gap-3 relative overflow-hidden"
                  style={{ background: '#F8FAFF', border: '1.5px solid #E0E8FF', boxShadow: '0 2px 12px rgba(0,85,255,0.06)' }}
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="font-bold text-base leading-snug mb-1.5" style={{ color: '#0A0A2E' }}>{f.title}</h3>
                      <p className="text-sm leading-relaxed" style={{ color: '#6B7280' }}>{f.desc}</p>
                    </div>
                    <div
                      className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ml-3"
                      style={{ background: '#EEF3FF', border: '1.5px solid #D0DBFF' }}
                    >
                      <Icon className="w-5 h-5" style={{ color: '#0055FF' }} />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── HOW IT WORKS ── */}
      <section id="como-funciona" className="py-20 px-6 relative overflow-hidden" style={{ background: '#F0F4FF' }}>
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="font-bold text-4xl mb-3" style={{ color: '#0A0A2E' }}>¿Cómo funciona?</h2>
            <p className="text-base" style={{ color: '#6B7280' }}>Comienza en minutos con un flujo simple y estructurado.</p>
          </div>

          <div className="grid md:grid-cols-2 gap-10 items-center">
            {/* Steps list */}
            <div className="space-y-8">
              {workflow.map((w, i) => (
                <div key={w.step} className="flex gap-5 items-start">
                  <div
                    className="text-3xl font-extrabold shrink-0 leading-none"
                    style={{ color: '#0055FF', minWidth: '48px' }}
                  >
                    {w.step}
                  </div>
                  <div>
                    <h4 className="font-bold text-base mb-1" style={{ color: '#0A0A2E' }}>{w.label}</h4>
                    <p className="text-sm" style={{ color: '#6B7280' }}>{w.desc}</p>
                  </div>
                </div>
              ))}
            </div>

            {/* Staircase illustration */}
            <div className="flex items-center justify-center">
              <img
                src="https://media.base44.com/images/public/69be92d9b179f726fbced205/20867d657_generated_image.png"
                alt="Staircase workflow illustration"
                className="w-full max-w-md object-contain"
                style={{ maxHeight: '400px' }}
              />
            </div>
          </div>
        </div>
      </section>

      {/* ── CTA ── */}
      <section className="py-16 px-6">
        <div className="max-w-2xl mx-auto">
          <div
            className="rounded-3xl p-10 text-center text-white"
            style={{
              background: '#0055FF',
              boxShadow: '0 16px 48px rgba(0,85,255,0.35)',
            }}
          >
            <h2 className="font-bold text-3xl mb-3">Listo para conectar tu comunidad</h2>
            <p className="text-blue-100 text-base mb-7 leading-relaxed">
              Centraliza la administración de edificios y condominios: tareas, procedimientos.
            </p>
            <button
              onClick={handleLogin}
              className="font-bold px-8 py-3 rounded-full text-sm transition-all"
              style={{ background: 'white', color: '#0055FF', boxShadow: '0 4px 16px rgba(0,0,0,0.15)' }}
            >
              Ingreso a la plataforma
            </button>
          </div>
        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer className="py-12 px-6 relative overflow-hidden" style={{ background: '#F0F4FF' }}>
        <div className="max-w-6xl mx-auto relative">
          {/* Footer isometric scene */}
          <div className="flex justify-center mb-6">
            <img
              src="https://media.base44.com/images/public/69be92d9b179f726fbced205/a860bfa79_generated_image.png"
              alt="Footer illustration"
              className="w-full max-w-lg object-contain"
              style={{ maxHeight: '180px' }}
            />
          </div>
          <div className="text-center">
            <div className="flex items-center justify-center mb-2">
              <img src="https://media.base44.com/images/public/69be92d9b179f726fbced205/cf2a70525_lgcomunidad.png" alt="Comunidad Conecta" className="h-14 w-auto object-contain" />
            </div>
            <p className="text-sm" style={{ color: '#6B7280' }}>Plataforma de gestión residencial · {new Date().getFullYear()}</p>
          </div>
        </div>
      </footer>

    </div>
  );
}