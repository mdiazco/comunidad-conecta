import React, { useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { Building2, ClipboardList, Users, Shield, ChevronRight, CheckCircle2, Bell, FileText, Play, Pause, Volume2, VolumeX } from 'lucide-react';
import { base44 } from '@/api/base44Client';

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
  const videoRef = useRef(null);
  const [muted, setMuted] = useState(true);
  const [playing, setPlaying] = useState(true);

  const handleLogin = () => base44.auth.redirectToLogin('/dashboard');

  const toggleMute = () => {
    if (videoRef.current) {
      videoRef.current.muted = !muted;
      setMuted(!muted);
    }
  };

  const togglePlay = () => {
    if (videoRef.current) {
      if (playing) {
        videoRef.current.pause();
      } else {
        videoRef.current.play();
      }
      setPlaying(!playing);
    }
  };

  return (
    <div className="min-h-screen bg-white font-inter">

      {/* HEADER */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-white/90 backdrop-blur border-b border-slate-100">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center"></div>

        </div>
      </header>

      {/* ── HERO CON VIDEO ── */}
      <section className="relative h-screen min-h-[600px] flex items-center justify-center overflow-hidden">

        {/* Video de fondo */}
        <video
          ref={videoRef}
          className="absolute inset-0 w-full h-full object-cover"
          autoPlay
          muted
          loop
          playsInline
          poster="https://media.base44.com/images/public/69be92d9b179f726fbced205/03cefdb27_generated_image.png"
        >
          {/* Video de Pexels: comunidad, vecinos, gente conectada */}
          <source
            src="https://videos.pexels.com/video-files/3252925/3252925-uhd_2560_1440_25fps.mp4"
            type="video/mp4"
          />
          <source
            src="https://videos.pexels.com/video-files/7578540/7578540-hd_1920_1080_25fps.mp4"
            type="video/mp4"
          />
        </video>

        {/* Overlay oscuro con gradiente */}
        <div className="absolute inset-0 bg-gradient-to-b from-slate-900/70 via-slate-900/60 to-slate-900/80" />

        {/* Controles de video */}
        <div className="absolute bottom-6 right-6 z-20 flex gap-2">
          <button
            onClick={togglePlay}
            className="w-9 h-9 rounded-full bg-white/20 backdrop-blur-sm border border-white/30 flex items-center justify-center text-white hover:bg-white/30 transition-colors"
          >
            {playing ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
          </button>
          <button
            onClick={toggleMute}
            className="w-9 h-9 rounded-full bg-white/20 backdrop-blur-sm border border-white/30 flex items-center justify-center text-white hover:bg-white/30 transition-colors"
          >
            {muted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
          </button>
        </div>

        {/* Contenido del hero */}
        <div className="relative z-10 max-w-4xl mx-auto px-6 text-center">
          <h1 className="text-5xl md:text-7xl font-extrabold text-white leading-tight mb-6 drop-shadow-lg">
            Conecta tu comunidad.<br />
            <span className="text-blue-400">Gestiona sin fricciones.</span>
          </h1>

          <p className="text-slate-200 text-lg md:text-xl leading-relaxed max-w-2xl mx-auto mb-10 drop-shadow">
            Centraliza la administración de edificios y condominios: tareas, procedimientos, evidencias y comunicación entre equipo y comité, en un solo lugar.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <button
              onClick={handleLogin}
              className="bg-primary text-white font-bold px-10 py-4 rounded-2xl hover:bg-primary/90 transition-all text-base flex items-center justify-center gap-2 shadow-2xl shadow-primary/40"
            >
              Ingreso a la plataforma <ChevronRight className="w-5 h-5" />
            </button>
            <a
              href="#features"
              className="bg-white/15 text-white font-semibold px-10 py-4 rounded-2xl hover:bg-white/25 transition-all text-base border border-white/30 backdrop-blur-sm"
            >
              Conocer más
            </a>
          </div>
        </div>

        {/* Indicador de scroll */}
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 z-10 flex flex-col items-center gap-1 animate-bounce">
          <div className="w-px h-8 bg-white/40 rounded-full" />
          <div className="w-1.5 h-1.5 rounded-full bg-white/60" />
        </div>
      </section>

      {/* MINI STATS */}
      <section className="bg-slate-900 py-10 px-6">
        <div className="max-w-4xl mx-auto grid grid-cols-3 gap-4">
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
            {workflow.map((w) => (
              <div key={w.step} className="flex flex-col items-center text-center">
                <div className="w-12 h-12 rounded-full bg-primary text-white font-bold text-sm flex items-center justify-center mb-4 shadow-lg">
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
          <button
            onClick={handleLogin}
            className="inline-flex items-center gap-2 bg-white text-primary font-bold px-8 py-3.5 rounded-xl hover:bg-blue-50 transition-colors text-base shadow-lg"
          >
            <CheckCircle2 className="w-5 h-5" /> Ingreso a la plataforma
          </button>
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