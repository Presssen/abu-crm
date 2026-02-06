'use client'

import { useState } from 'react'
import {
    Mail,
    Zap,
    PhoneCall,
    Search,
    Plus,
    ArrowRight,
    Move,
    MoreHorizontal,
    Trash2,
    Play,
    Info,
    Workflow
} from 'lucide-react'
import { clsx } from 'clsx'

interface Node {
    id: string
    type: 'email' | 'ai_search' | 'call' | 'delay' | 'trigger'
    title: string
    description: string
    x: number
    y: number
}

const INITIAL_NODES: Node[] = [
    {
        id: '1',
        type: 'trigger',
        title: 'Nuevo Lead',
        description: 'Cuando entra un lead de Shopify',
        x: 50,
        y: 50
    },
    {
        id: '2',
        type: 'ai_search',
        title: 'Enriquecer con IA',
        description: 'Buscar contactos en Apollo',
        x: 300,
        y: 50
    },
    {
        id: '3',
        type: 'email',
        title: 'Email de Bienvenida',
        description: 'Enviar plantilla intro',
        x: 550,
        y: 50
    },
]

export default function FlowBuilder() {
    const [nodes, setNodes] = useState<Node[]>(INITIAL_NODES)
    const [draggingNode, setDraggingNode] = useState<string | null>(null)
    const [offset, setOffset] = useState({ x: 0, y: 0 })

    const handleMouseDown = (e: React.MouseEvent, id: string) => {
        const node = nodes.find(n => n.id === id)
        if (!node) return
        setDraggingNode(id)
        setOffset({
            x: e.clientX - node.x,
            y: e.clientY - node.y
        })
    }

    const handleMouseMove = (e: React.MouseEvent) => {
        if (!draggingNode) return
        setNodes(nodes.map(node =>
            node.id === draggingNode
                ? { ...node, x: e.clientX - offset.x, y: e.clientY - offset.y }
                : node
        ))
    }

    const handleMouseUp = () => {
        setDraggingNode(null)
    }

    const addNewNode = (type: Node['type']) => {
        const newNode: Node = {
            id: Date.now().toString(),
            type,
            title: type === 'email' ? 'Nuevo Email' : type === 'ai_search' ? 'Nueva Búsqueda IA' : type === 'call' ? 'Nueva Llamada' : 'Nuevo Paso',
            description: 'Configura este paso...',
            x: 100,
            y: 200
        }
        setNodes([...nodes, newNode])
    }

    return (
        <div className="space-y-6">
            {/* Warning Banner */}
            <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex items-start space-x-3 shadow-sm">
                <div className="p-2 bg-amber-100 rounded-lg shrink-0">
                    <Info className="text-amber-700 h-5 w-5" />
                </div>
                <div>
                    <h3 className="text-sm font-bold text-amber-900">Fase Experimental (Alpha)</h3>
                    <p className="text-xs text-amber-700 mt-1">
                        Esta sección está en fase de pruebas. El constructor visual es interactivo pero los flujos aún no se ejecutan automáticamente.
                        Úsala para diseñar y planificar tus estrategias de venta.
                    </p>
                </div>
            </div>

            <div className="flex justify-between items-center">
                <div className="flex gap-3">
                    <button
                        onClick={() => addNewNode('email')}
                        className="inline-flex items-center px-4 py-2 bg-purple-50 text-purple-700 border border-purple-100 rounded-xl text-xs font-bold hover:bg-purple-100 transition-all"
                    >
                        <Mail size={14} className="mr-2" />
                        + Email
                    </button>
                    <button
                        onClick={() => addNewNode('ai_search')}
                        className="inline-flex items-center px-4 py-2 bg-blue-50 text-blue-700 border border-blue-100 rounded-xl text-xs font-bold hover:bg-blue-100 transition-all"
                    >
                        <Search size={14} className="mr-2" />
                        + Búsqueda IA
                    </button>
                    <button
                        onClick={() => addNewNode('call')}
                        className="inline-flex items-center px-4 py-2 bg-rose-50 text-rose-700 border border-rose-100 rounded-xl text-xs font-bold hover:bg-rose-100 transition-all"
                    >
                        <PhoneCall size={14} className="mr-2" />
                        + Llamada
                    </button>
                </div>
                <button className="inline-flex items-center px-6 py-2 bg-indigo-600 text-white rounded-xl text-sm font-bold hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-100">
                    <Play size={14} className="mr-2" />
                    Ejecutar Simulación
                </button>
            </div>

            {/* Canvas Area */}
            <div
                className="relative h-[600px] bg-slate-50 rounded-3xl border-2 border-dashed border-slate-200 overflow-hidden cursor-crosshair group"
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUp}
                onMouseLeave={handleMouseUp}
            >
                {/* Visual Grid Background */}
                <div className="absolute inset-0 opacity-[0.03] pointer-events-none" style={{ backgroundImage: 'radial-gradient(#000 1px, transparent 1px)', backgroundSize: '20px 20px' }} />

                {/* SVG Connections (Mockup) */}
                <svg className="absolute inset-0 pointer-events-none w-full h-full">
                    {nodes.slice(0, -1).map((node, i) => {
                        const next = nodes[i + 1]
                        return (
                            <line
                                key={i}
                                x1={node.x + 100}
                                y1={node.y + 40}
                                x2={next.x + 10}
                                y2={next.y + 40}
                                stroke="#CBD5E1"
                                strokeWidth="2"
                                strokeDasharray="5,5"
                            />
                        )
                    })}
                </svg>

                {nodes.map((node) => (
                    <div
                        key={node.id}
                        onMouseDown={(e) => handleMouseDown(e, node.id)}
                        style={{ left: node.x, top: node.y }}
                        className={clsx(
                            "absolute w-60 bg-white rounded-2xl shadow-xl border-2 transition-transform cursor-grab active:cursor-grabbing select-none",
                            draggingNode === node.id ? "scale-105 shadow-2xl border-indigo-400 z-50" : "border-transparent z-10 hover:border-slate-200"
                        )}
                    >
                        <div className={clsx(
                            "p-3 rounded-t-2xl flex items-center justify-between",
                            node.type === 'trigger' ? "bg-emerald-50 text-emerald-700" :
                                node.type === 'email' ? "bg-purple-50 text-purple-700" :
                                    node.type === 'ai_search' ? "bg-blue-50 text-blue-700" :
                                        node.type === 'call' ? "bg-rose-50 text-rose-700" : "bg-gray-50 text-gray-700"
                        )}>
                            <div className="flex items-center">
                                {node.type === 'trigger' ? <Zap size={16} className="mr-2" /> :
                                    node.type === 'email' ? <Mail size={16} className="mr-2" /> :
                                        node.type === 'ai_search' ? <Search size={16} className="mr-2" /> :
                                            <PhoneCall size={16} className="mr-2" />}
                                <span className="text-xs font-bold uppercase tracking-wider">{node.type}</span>
                            </div>
                            <MoreHorizontal size={14} className="opacity-40" />
                        </div>
                        <div className="p-4">
                            <h4 className="text-sm font-bold text-gray-900 mb-1">{node.title}</h4>
                            <p className="text-[11px] text-gray-500 leading-relaxed">{node.description}</p>
                            <div className="mt-4 pt-4 border-t border-slate-50 flex justify-between items-center">
                                <div className="flex -space-x-1">
                                    {[1, 2, 3].map(i => (
                                        <div key={i} className="h-5 w-5 rounded-full border border-white bg-slate-200" />
                                    ))}
                                </div>
                                <button className="text-slate-300 hover:text-rose-500 transition-colors">
                                    <Trash2 size={12} />
                                </button>
                            </div>
                        </div>
                    </div>
                ))}

                {nodes.length === 0 && (
                    <div className="absolute inset-0 flex flex-center items-center justify-center">
                        <div className="text-center">
                            <Workflow className="h-12 w-12 text-slate-200 mx-auto mb-4" />
                            <p className="text-slate-400 font-medium">Empieza a añadir pasos para crear un flujo</p>
                        </div>
                    </div>
                )}
            </div>
        </div>
    )
}
