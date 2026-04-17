'use client'

import React, { useState, useEffect, useRef } from 'react'
import {
  MonitorPlay,
  Users,
  Trello,
  MessageSquare,
  Zap,
  CheckCircle2,
  ShoppingCart,
  Network,
  BarChart,
  Rocket,
  ChevronLeft,
  ChevronRight,
  Maximize,
  Minimize,
  TrendingUp,
  Target
} from 'lucide-react'
import { clsx } from 'clsx'

const Slide1 = () => (
  <div className="flex flex-col items-center justify-center h-full space-y-8 text-center animate-in fade-in zoom-in duration-700">
    <img 
      src="https://cdn.shopify.com/s/files/1/0370/2466/1636/files/new-abu-logo.png?v=1768487866" 
      alt="ABU Logo" 
      className="w-32 h-auto mb-6 drop-shadow-[0_0_20px_rgba(255,255,255,0.1)]"
    />
    <h1 className="text-6xl md:text-8xl font-black bg-gradient-to-br from-white via-indigo-200 to-indigo-500 text-transparent bg-clip-text leading-tight">
      Escala tu Tienda Online
    </h1>
    <p className="text-2xl md:text-3xl text-indigo-100 max-w-3xl mt-6 font-light">
      La plataforma definitiva para aumentar las ventas de tu e-commerce y multiplicar tus beneficios de manera inteligente con AbuApp.
    </p>
  </div>
)

const SlideMission = () => (
  <div className="flex flex-col md:flex-row items-center justify-center h-full w-full gap-16 animate-in zoom-in-95 fade-in duration-1000">
    
    <div className="flex-1 space-y-10 max-w-2xl relative z-10">
      <div className="inline-flex items-center gap-3 px-4 py-2 rounded-full bg-indigo-500/10 text-indigo-300 border border-indigo-500/20 text-sm font-bold tracking-[0.3em] uppercase shadow-lg shadow-indigo-500/10">
        <Target className="w-4 h-4" /> Nuestra Misión
      </div>
      
      <h2 className="text-5xl md:text-7xl font-extrabold text-white leading-[1.1]">
        Hacemos que cada visita <br />
        <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-300 via-blue-400 to-indigo-400 drop-shadow-sm">
          sea rentable.
        </span>
      </h2>
      
      <p className="text-xl md:text-2xl text-indigo-100/70 font-light leading-relaxed">
        Nuestro objetivo principal es <strong className="text-white font-medium">aumentar tu carrito medio</strong> y disparar <strong className="text-white font-medium">tu conversión final</strong>. Transformamos tu tráfico actual en márgenes sólidos, sin necesidad de elevar tus costes de adquisición.
      </p>
    </div>

    <div className="flex-1 relative w-full flex justify-center animate-in slide-in-from-right-12 fade-in duration-1000 delay-300 fill-mode-both">
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[120%] h-[120%] bg-emerald-500/10 blur-[100px] rounded-full pointer-events-none" />
      
      <div className="relative w-full max-w-md bg-white/5 backdrop-blur-2xl p-10 rounded-[3rem] border border-white/10 shadow-[0_0_80px_rgba(16,185,129,0.15)] overflow-hidden">
        
        <div className="absolute top-0 right-0 p-8 opacity-20 pointer-events-none">
           <TrendingUp className="w-40 h-40 text-emerald-400" />
        </div>

        <div className="relative z-10 flex flex-col h-full space-y-6">
          <div className="w-16 h-16 rounded-2xl bg-emerald-500/20 flex items-center justify-center border border-emerald-500/30 mb-4 shadow-inner">
             <BarChart className="w-8 h-8 text-emerald-300" />
          </div>
          
          <div className="space-y-2">
            <h3 className="text-emerald-400 font-bold uppercase tracking-[0.2em] text-sm md:text-base">
              Impacto Promedio
            </h3>
            <div className="text-6xl md:text-7xl font-black text-white tracking-tighter">
              +7% <span className="text-4xl text-white/50 font-medium">a</span> 15%
            </div>
          </div>
          
          <div className="w-full h-px bg-gradient-to-r from-emerald-500/50 to-transparent my-6" />
          
          <p className="text-lg text-emerald-100/80 font-medium leading-relaxed">
            Aumento directo y cuantificable en las ventas globales de tu tienda online tras nuestra optimización.
          </p>
        </div>
      </div>
    </div>
    
  </div>
)

const Slide2 = () => (
  <div className="flex flex-col items-center justify-center h-full w-full animate-in slide-in-from-right-8 fade-in duration-700">
    <div className="inline-block px-4 py-1.5 rounded-full bg-pink-500/20 text-pink-300 border border-pink-500/30 text-sm font-bold uppercase tracking-wider mb-6">Nuestra Experiencia</div>
    <h2 className="text-5xl md:text-6xl font-bold text-white mb-8 text-center max-w-4xl leading-tight">
      Especialistas en <br/><span className="text-transparent bg-clip-text bg-gradient-to-r from-pink-400 to-indigo-400">Upselling y Cross-Selling</span>
    </h2>
    <p className="text-2xl text-indigo-100/80 font-light mb-12 text-center max-w-3xl">
      Ofrecemos productos adicionales con sentido para incrementar el ticket medio.
    </p>
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full max-w-6xl">
      <FeatureCard icon={ShoppingCart} title="Página de Producto" desc="Recomendamos cuando el cliente descubre y evalúa el artículo principal." delay="delay-100" />
      <FeatureCard icon={Trello} title="Dentro del Carrito" desc="Ofertas flash y accesorios complementarios que encajan en el momento clave." delay="delay-200" />
      <FeatureCard icon={Zap} title="Post Checkout" desc="Maximizamos la intención de compra tras el pago exitoso con ofertas limitadas." delay="delay-300" />
    </div>
  </div>
)

const Slide3 = () => (
  <div className="flex flex-col items-center justify-center h-full w-full animate-in slide-in-from-bottom-12 fade-in duration-700">
    <div className="inline-block px-4 py-1.5 rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 text-sm font-bold uppercase tracking-wider mb-6">Catálogo de Widgets</div>
    <h2 className="text-5xl md:text-6xl font-bold text-white mb-12 text-center">Herramientas de Conversión</h2>
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 w-full max-w-6xl">
       <FeatureCard icon={Network} title="Frequently Bought Together" desc="Agrupa productos que suelen comprarse en conjunto a un clic." delay="delay-100" />
       <FeatureCard icon={CheckCircle2} title="Add-ons Clásicos" desc="Complementos sugeridos que suman valor práctico al pedido." delay="delay-200" />
       <FeatureCard icon={Zap} title="Ofertas Post-Checkout" desc="Impacto directo justo después de la compra con alta intencionalidad." delay="delay-300" />
       <FeatureCard icon={BarChart} title="Bulk Discounts" desc="Descuentos escalonados por volumen para subir las cantidades." delay="delay-400" />
       <FeatureCard icon={Rocket} title="Barra de Envío Gratis" desc="Motiva al comprador a subir el ticket medio para no pagar portes." delay="delay-500" />
    </div>
  </div>
)

const Slide4 = () => (
  <div className="flex flex-col items-center justify-center h-full w-full animate-in zoom-in-95 fade-in duration-700">
    <h2 className="text-5xl font-bold text-white mb-20">Conecta tu Tienda</h2>
    <div className="flex flex-col items-center space-y-16">
      <div className="flex items-center justify-center relative w-full max-w-3xl">
        <div className="absolute top-1/2 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-indigo-500/50 to-transparent -translate-y-1/2" />
        <div className="flex items-center justify-between w-full relative z-10">
            <div className="bg-slate-900 p-6 rounded-2xl border border-slate-700 shadow-2xl">
                <ShoppingCart className="w-16 h-16 text-emerald-400" />
            </div>
            <div className="bg-indigo-900/80 p-8 rounded-3xl border-2 border-indigo-500 shadow-[0_0_50px_rgba(99,102,241,0.4)] scale-110">
                <Network className="w-20 h-20 text-white" />
            </div>
            <div className="bg-slate-900 p-6 rounded-2xl border border-slate-700 shadow-2xl">
                <BarChart className="w-16 h-16 text-cyan-400" />
            </div>
        </div>
      </div>
      <div className="text-center max-w-3xl">
          <p className="text-2xl text-indigo-100/90 font-light leading-relaxed">
            Se integra nativamente de forma perfecta con Shopify para sincronizar tu inventario comercial, clientes y carritos. Visualiza desde un único sitio quién compra y por qué lo hace.
          </p>
      </div>
    </div>
  </div>
)

const Slide5 = () => (
  <div className="flex flex-col items-center justify-center h-full w-full animate-in slide-in-from-left-8 fade-in duration-700">
    <div className="flex flex-col md:flex-row items-center gap-16 max-w-6xl w-full">
      <div className="flex-1 w-full max-w-md aspect-square bg-gradient-to-br from-indigo-900/40 to-blue-900/40 backdrop-blur-3xl p-8 rounded-[3rem] border border-white/10 shadow-[0_0_100px_rgba(59,130,246,0.2)] flex items-center justify-center relative overflow-hidden">
        <div className="absolute inset-0 bg-blue-500/20 blur-[100px]" />
        <MessageSquare className="w-48 h-48 text-cyan-400 mx-auto relative z-10 animate-pulse drop-shadow-[0_0_30px_rgba(34,211,238,0.6)]" />
      </div>
      <div className="flex-1 space-y-8">
        <div className="inline-block px-4 py-1.5 rounded-full bg-blue-500/20 text-blue-300 border border-blue-500/30 text-sm font-bold uppercase tracking-wider mb-2">
          Innovación
        </div>
        <h2 className="text-5xl font-bold text-white leading-tight">Buscadores con<br/>Inteligencia Artificial</h2>
        <p className="text-2xl text-indigo-100/80 font-light">
          Tus clientes encontrarán exactamente lo que quieren usando lenguaje natural, guiados como si hablaran con un experto.
        </p>
        <ul className="space-y-6 pt-4">
          <ListItem text="Búsqueda semántica e intencional" />
          <ListItem text="Tolerancia a errores tipográficos" />
          <ListItem text="Sugerencias de productos dinámicas" />
        </ul>
      </div>
    </div>
  </div>
)

const SlideCalculator = () => {
  const [visitas, setVisitas] = useState<number>(50000)
  const [conversion, setConversion] = useState<number>(2.5)
  const [carrito, setCarrito] = useState<number>(65)

  const ventasActuales = visitas * (conversion / 100) * carrito
  const aumentoConservador = ventasActuales * 0.07 // 7%
  const aumentoOptimista = ventasActuales * 0.15 // 15%

  const formatearDinero = (valor: number) => {
    return new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(valor)
  }

  return (
    <div className="flex flex-col items-center justify-center h-full w-full animate-in zoom-in-95 fade-in duration-700">
      <div className="inline-block px-4 py-1.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-sm font-bold uppercase tracking-wider mb-6">Proyección de Ingresos</div>
      <h2 className="text-4xl md:text-5xl font-bold text-white mb-10 text-center">Calcula tu Crecimiento con AbuApp</h2>
      
      <div className="flex flex-col lg:flex-row gap-10 w-full max-w-6xl">
        {/* Formulario */}
        <div className="flex-1 bg-white/5 backdrop-blur-xl p-8 rounded-[2rem] border border-white/10 shadow-2xl space-y-8">
           <div>
              <label className="block text-sm font-medium text-emerald-200 mb-2">Visitas Mensuales</label>
              <input 
                type="number" 
                value={visitas} 
                onChange={(e) => setVisitas(Number(e.target.value))} 
                className="w-full bg-slate-900/50 border border-emerald-500/30 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-all font-mono text-xl [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
              />
           </div>
           <div>
              <label className="block text-sm font-medium text-emerald-200 mb-2">Porcentaje de Conversión (%)</label>
              <input 
                type="number" 
                step="0.1"
                value={conversion} 
                onChange={(e) => setConversion(Number(e.target.value))} 
                className="w-full bg-slate-900/50 border border-emerald-500/30 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-all font-mono text-xl [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
              />
           </div>
           <div>
              <label className="block text-sm font-medium text-emerald-200 mb-2">Carrito Medio (€)</label>
              <input 
                type="number" 
                value={carrito} 
                onChange={(e) => setCarrito(Number(e.target.value))} 
                className="w-full bg-slate-900/50 border border-emerald-500/30 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-all font-mono text-xl [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
              />
           </div>
        </div>

        {/* Resultados */}
        <div className="flex-1 flex flex-col justify-center space-y-6">
           <div className="bg-slate-900/60 p-6 rounded-3xl border border-slate-700">
             <div className="text-gray-400 text-sm font-medium uppercase tracking-wider mb-1">Tus Ingresos Mensuales Actuales</div>
             <div className="text-3xl font-light text-white font-mono">{formatearDinero(ventasActuales)}</div>
           </div>
           
           <div className="bg-emerald-500/10 p-8 rounded-3xl border border-emerald-500/30 relative overflow-hidden shadow-[0_0_50px_rgba(16,185,129,0.15)]">
             <div className="absolute top-0 right-0 p-4 opacity-10 pointer-events-none">
                 <TrendingUp className="w-32 h-32 text-emerald-500" />
             </div>
             <div className="relative z-10">
               <div className="text-emerald-300 text-sm font-bold uppercase tracking-wider mb-2">Ganancia Extra Mensual Estimada</div>
               
               <div className="flex flex-col gap-2 mt-4 text-white">
                  <div className="flex items-end gap-3 flex-wrap">
                    <span className="text-5xl font-black text-emerald-400 font-mono tracking-tighter">+{formatearDinero(aumentoConservador)}</span>
                    <span className="text-emerald-200/60 pb-1 text-lg">(+7% Conservador)</span>
                  </div>
                  
                  <div className="w-full h-px bg-emerald-500/20 my-4" />
                  
                  <div className="flex items-end gap-3 flex-wrap">
                    <span className="text-6xl font-black text-white font-mono tracking-tighter">+{formatearDinero(aumentoOptimista)}</span>
                    <span className="text-emerald-200/60 pb-1 text-lg tracking-wider">(+15% Optimista)</span>
                  </div>
               </div>
             </div>
           </div>
        </div>
      </div>
    </div>
  )
}

const Slide6 = () => (
  <div className="flex flex-col items-center justify-center h-full space-y-12 text-center animate-in fade-in slide-in-from-bottom-8 duration-700">
     <div className="relative">
         <div className="absolute inset-0 bg-pink-500/30 blur-[60px] rounded-full" />
         <Rocket className="w-40 h-40 text-pink-400 relative z-10 animate-bounce" />
     </div>
     <h1 className="text-7xl font-black text-white tracking-tight">Multiplica tus Ventas.</h1>
     <p className="text-3xl text-indigo-200 font-light">Reduce el coste de adquisición y retén más clientes con AbuApp.</p>
     <a 
       href="https://admin.shopify.com/store/abuapp/apps/ai-bundle-1/app"
       target="_blank"
       rel="noopener noreferrer"
       className="mt-8 inline-flex px-10 py-5 bg-white text-indigo-950 text-2xl font-bold rounded-full hover:scale-105 transition-all duration-300 shadow-[0_0_50px_rgba(255,255,255,0.4)] hover:shadow-[0_0_70px_rgba(255,255,255,0.6)]"
     >
       Comenzar Ahora
     </a>
  </div>
)

const FeatureCard = ({ icon: Icon, title, desc, delay }: any) => (
  <div className={clsx("bg-white/5 backdrop-blur-xl p-8 rounded-3xl border border-white/10 hover:bg-white/10 transition-all duration-300", delay)}>
    <div className="w-14 h-14 bg-indigo-500/20 rounded-2xl flex items-center justify-center mb-6 border border-indigo-500/30">
        <Icon className="w-7 h-7 text-indigo-300" />
    </div>
    <h3 className="text-2xl font-bold text-white mb-3">{title}</h3>
    <p className="text-lg text-indigo-100/70">{desc}</p>
  </div>
)

const ListItem = ({ text }: { text: string }) => (
  <li className="flex items-center space-x-4 text-xl text-white">
    <CheckCircle2 className="w-8 h-8 text-indigo-400 shrink-0" />
    <span>{text}</span>
  </li>
)

const slides = [
  Slide1,
  SlideMission,
  Slide2,
  Slide3,
  Slide5,
  Slide4,
  SlideCalculator,
  Slide6
]

export default function PresentationClient() {
  const [currentSlide, setCurrentSlide] = useState(0)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  const goToNextSlide = () => {
    setCurrentSlide((prev) => Math.min(prev + 1, slides.length - 1))
  }

  const goToPrevSlide = () => {
    setCurrentSlide((prev) => Math.max(prev - 1, 0))
  }

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignorar navegación si estamos rellenando el formulario
      if (document.activeElement?.tagName === 'INPUT' || document.activeElement?.tagName === 'TEXTAREA') {
        return
      }

      if (e.key === 'ArrowRight' || e.key === ' ') {
        goToNextSlide()
      } else if (e.key === 'ArrowLeft') {
        goToPrevSlide()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      containerRef.current?.requestFullscreen().catch((err) => {
        console.error("Error attempting to enable fullscreen:", err)
      })
    } else {
      document.exitFullscreen()
    }
  }

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement)
    }
    document.addEventListener('fullscreenchange', handleFullscreenChange)
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange)
  }, [])

  const CurrentSlideComponent = slides[currentSlide]

  return (
    <div className="w-full h-full flex flex-col items-center justify-center bg-gray-50 p-4 md:p-8 relative">
      
      {!isFullscreen && (
        <div className="absolute inset-0 z-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-5 pointer-events-none" />
      )}

      {/* Header outside presentation */}
      {!isFullscreen && (
        <div className="w-full max-w-[1400px] flex justify-end mb-4 relative z-10">
           <button 
             onClick={toggleFullscreen} 
             className="text-gray-400 hover:text-indigo-600 px-3 py-1.5 rounded-lg text-sm font-medium flex items-center gap-2 hover:bg-gray-100 transition-colors"
           >
             <Maximize size={16} /> 
             Pantalla Completa
           </button>
        </div>
      )}

      {/* Main Presentation Container */}
      <div 
        ref={containerRef}
        className={clsx(
          "relative overflow-hidden transition-all duration-500 ease-in-out bg-slate-950",
          isFullscreen 
            ? "w-screen h-screen rounded-none" 
            : "w-full max-w-[1400px] aspect-video rounded-[2rem] shadow-2xl border-4 border-indigo-900/30"
        )}
      >
        {/* Background Gradients inside the presentation screen */}
        <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
             <div className="absolute -top-[20%] -left-[10%] w-[50%] h-[50%] rounded-full bg-indigo-600/20 blur-[120px]" />
             <div className="absolute bottom-[0%] -right-[10%] w-[60%] h-[60%] rounded-full bg-purple-600/20 blur-[150px]" />
        </div>

        {/* Content */}
        <div className="relative z-10 w-full h-full p-8 md:p-16">
           <CurrentSlideComponent key={currentSlide} />
        </div>

        {/* Progress Bar */}
        <div className="absolute bottom-0 left-0 right-0 h-1 bg-white/10 z-20">
          <div 
            className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 transition-all duration-500 ease-out"
            style={{ width: `${((currentSlide + 1) / slides.length) * 100}%` }}
          />
        </div>

        {/* Controls Overlay */}
        <div className="absolute bottom-6 left-6 right-6 flex items-center justify-between z-50 opacity-0 bg-gradient-to-t from-slate-950/80 to-transparent pt-10 pb-2 px-4 hover:opacity-100 transition-opacity duration-300 rounded-b-[1.5rem] pointer-events-auto">
            <div className="flex items-center space-x-4">
                <button 
                  onClick={goToPrevSlide}
                  disabled={currentSlide === 0}
                  className="p-3 rounded-full bg-white/10 text-white hover:bg-white/20 disabled:opacity-30 disabled:cursor-not-allowed backdrop-blur-md transition-colors"
                >
                  <ChevronLeft className="w-6 h-6" />
                </button>
                <span className="text-white/60 font-medium">
                  {currentSlide + 1} / {slides.length}
                </span>
                <button 
                  onClick={goToNextSlide}
                  disabled={currentSlide === slides.length - 1}
                  className="p-3 rounded-full bg-white/10 text-white hover:bg-white/20 disabled:opacity-30 disabled:cursor-not-allowed backdrop-blur-md transition-colors"
                >
                  <ChevronRight className="w-6 h-6" />
                </button>
            </div>
            
            <button 
                onClick={toggleFullscreen}
                className="p-3 rounded-full bg-white/10 text-white hover:bg-white/20 backdrop-blur-md transition-colors"
                title={isFullscreen ? "Exit Fullscreen" : "Enter Fullscreen"}
            >
                {isFullscreen ? <Minimize className="w-6 h-6" /> : <Maximize className="w-6 h-6" />}
            </button>
        </div>

      </div>
    </div>
  )
}
