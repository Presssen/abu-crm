'use client'

import { useState, useRef } from 'react'
import { createClient } from '@/lib/auth/client'
import * as XLSX from 'xlsx'
import Papa from 'papaparse'
import {
    Upload,
    Check,
    AlertCircle,
    ChevronRight,
    Table as TableIcon,
    Database,
    Zap,
    X,
    FileSpreadsheet
} from 'lucide-react'
import { clsx } from 'clsx'

const LEAD_FIELDS = [
    { key: 'company_name', label: 'Empresa', required: true },
    { key: 'contact_name', label: 'Nombre de Contacto', required: false },
    { key: 'email', label: 'Email', required: true },
    { key: 'phone', label: 'Teléfono', required: false },
    { key: 'source', label: 'Fuente', required: false },
    { key: 'notes', label: 'Notas', required: false },
]

interface ImportLeadsModalProps {
    isOpen: boolean
    onClose: () => void
    onSuccess: () => void
}

export default function ImportLeadsModal({ isOpen, onClose, onSuccess }: ImportLeadsModalProps) {
    const [step, setStep] = useState(1)
    const [fileData, setFileData] = useState<any[]>([])
    const [headers, setHeaders] = useState<string[]>([])
    const [mapping, setMapping] = useState<Record<string, string>>({})
    const [importing, setImporting] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [fileName, setFileName] = useState<string | null>(null)

    const fileInputRef = useRef<HTMLInputElement>(null)
    const supabase = createClient()

    if (!isOpen) return null

    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (!file) return
        setFileName(file.name)
        processFile(file)
    }

    const processFile = (file: File) => {
        const isExcel = file.name.endsWith('.xlsx') || file.name.endsWith('.xls')

        if (isExcel) {
            const reader = new FileReader()
            reader.onload = (e) => {
                const data = new Uint8Array(e.target?.result as ArrayBuffer)
                const workbook = XLSX.read(data, { type: 'array' })
                const firstSheetName = workbook.SheetNames[0]
                const worksheet = workbook.Sheets[firstSheetName]
                const json = XLSX.utils.sheet_to_json(worksheet, { header: 1 })

                if (json.length > 0) {
                    const hdrs = (json[0] as string[]).map(h => h?.toString().trim())
                    const rows = json.slice(1).map((row: any) => {
                        const obj: any = {}
                        hdrs.forEach((h, i) => {
                            obj[h] = row[i]
                        })
                        return obj
                    })
                    setHeaders(hdrs)
                    setFileData(rows)
                    autoMap(hdrs)
                    setStep(2)
                }
            }
            reader.readAsArrayBuffer(file)
        } else {
            Papa.parse(file, {
                header: true,
                skipEmptyLines: true,
                complete: (results) => {
                    if (results.data.length > 0) {
                        setHeaders(Object.keys(results.data[0] as any))
                        setFileData(results.data)
                        autoMap(Object.keys(results.data[0] as any))
                        setStep(2)
                    }
                }
            })
        }
    }

    const autoMap = (hdrs: string[]) => {
        const newMapping: Record<string, string> = {}
        hdrs.forEach(h => {
            const hLower = h.toLowerCase()
            LEAD_FIELDS.forEach(field => {
                const fieldLabelLower = field.label.toLowerCase()
                const fieldKeyLower = field.key.toLowerCase()
                if (hLower.includes(fieldLabelLower) || hLower.includes(fieldKeyLower)) {
                    newMapping[h] = field.key
                }
            })
        })
        setMapping(newMapping)
    }

    const handleImport = async () => {
        setImporting(true)
        setError(null)
        try {
            const { data: userData } = await supabase.auth.getUser()
            const ownerId = userData.user?.id

            if (!ownerId) throw new Error('No se pudo encontrar al usuario.')

            const leadsToImport = fileData.map((row) => {
                const lead: any = { owner_id: ownerId, status: 'new' }
                Object.entries(mapping).forEach(([fileHeader, dbField]) => {
                    if (dbField) {
                        lead[dbField] = row[fileHeader]
                    }
                })
                return lead
            }).filter(l => l.email || l.company_name)

            const { error: importError } = await supabase.from('leads').insert(leadsToImport)
            if (importError) throw importError

            setStep(4)
            setTimeout(() => {
                onSuccess()
            }, 1000)
        } catch (err: any) {
            setError(err.message || 'Error al importar los datos.')
        } finally {
            setImporting(false)
        }
    }

    const reset = () => {
        setStep(1)
        setFileData([])
        setHeaders([])
        setMapping({})
        setFileName(null)
        setError(null)
    }

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/40 backdrop-blur-sm">
            <div className="bg-white rounded-3xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col shadow-2xl">
                {/* Header */}
                <div className="p-6 border-b border-gray-100 flex items-center justify-between">
                    <div>
                        <h2 className="text-xl font-bold text-gray-900">Importar Leads</h2>
                        <p className="text-sm text-gray-500">Sube tus archivos Excel o CSV</p>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full text-gray-400 hover:text-gray-600 transition-colors">
                        <X size={24} />
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-6 md:p-10 bg-gray-50/30">

                    {/* Stepper */}
                    <div className="flex justify-center mb-10">
                        {[1, 2, 3, 4].map((s) => (
                            <div key={s} className="flex items-center">
                                <div className={clsx(
                                    "h-8 w-8 rounded-full flex items-center justify-center font-bold text-xs transition-all",
                                    step >= s ? "bg-indigo-600 text-white shadow-lg shadow-indigo-200" : "bg-white border-2 border-gray-200 text-gray-300"
                                )}>
                                    {step > s ? <Check size={16} /> : s}
                                </div>
                                {s < 4 && <div className={clsx("w-12 h-0.5 mx-2", step > s ? "bg-indigo-600" : "bg-gray-200")} />}
                            </div>
                        ))}
                    </div>

                    {step === 1 && (
                        <div
                            onClick={() => fileInputRef.current?.click()}
                            className="border-2 border-dashed border-gray-300 rounded-3xl h-64 flex flex-col items-center justify-center bg-white hover:border-indigo-500 hover:bg-indigo-50/50 transition-all cursor-pointer group"
                        >
                            <input ref={fileInputRef} type="file" onChange={handleFileUpload} accept=".xlsx, .xls, .csv" className="hidden" />
                            <div className="p-4 bg-indigo-50 rounded-2xl text-indigo-600 group-hover:scale-110 transition-transform mb-4">
                                <Upload size={32} />
                            </div>
                            <p className="font-bold text-gray-900">Haz clic o arrastra tu archivo aquí</p>
                            <p className="text-sm text-gray-500 mt-1">Soporta Excel y CSV</p>
                        </div>
                    )}

                    {step === 2 && (
                        <div className="space-y-4">
                            <h3 className="font-bold text-gray-900">Mapear Columnas</h3>
                            <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
                                {headers.map((header) => (
                                    <div key={header} className="p-4 border-b border-gray-100 last:border-0 flex items-center justify-between gap-4">
                                        <div className="flex items-center space-x-3 min-w-0">
                                            <FileSpreadsheet size={16} className="text-gray-400 flex-shrink-0" />
                                            <span className="text-sm font-medium text-gray-700 truncate">{header}</span>
                                        </div>
                                        <select
                                            className="bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-500 w-1/2"
                                            value={mapping[header] || ''}
                                            onChange={(e) => setMapping({ ...mapping, [header]: e.target.value })}
                                        >
                                            <option value="">Ignorar</option>
                                            {LEAD_FIELDS.map(f => (
                                                <option key={f.key} value={f.key}>{f.label}</option>
                                            ))}
                                        </select>
                                    </div>
                                ))}
                            </div>
                            <div className="flex justify-end gap-3 pt-4">
                                <button onClick={() => setStep(1)} className="px-4 py-2 text-gray-600 font-medium">Atrás</button>
                                <button onClick={() => setStep(3)} className="px-6 py-2 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700">Continuar</button>
                            </div>
                        </div>
                    )}

                    {step === 3 && (
                        <div className="space-y-4">
                            <h3 className="font-bold text-gray-900">Vista Previa</h3>
                            <div className="bg-white rounded-2xl border border-gray-200 overflow-x-auto">
                                <table className="w-full text-sm text-left">
                                    <thead className="bg-gray-50 border-b border-gray-100">
                                        <tr>
                                            {LEAD_FIELDS.filter(f => Object.values(mapping).includes(f.key)).map(f => (
                                                <th key={f.key} className="px-4 py-3 font-semibold text-gray-600">{f.label}</th>
                                            ))}
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-50">
                                        {fileData.slice(0, 5).map((row, i) => (
                                            <tr key={i}>
                                                {LEAD_FIELDS.filter(f => Object.values(mapping).includes(f.key)).map(f => {
                                                    const originalHeader = Object.entries(mapping).find(([h, m]) => m === f.key)?.[0]
                                                    return <td key={f.key} className="px-4 py-3 text-gray-600">{originalHeader ? row[originalHeader] : '-'}</td>
                                                })}
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                            {error && <div className="text-red-600 text-sm font-medium flex items-center"><AlertCircle size={14} className="mr-1" /> {error}</div>}
                            <div className="flex justify-end gap-3 pt-4">
                                <button onClick={() => setStep(2)} className="px-4 py-2 text-gray-600 font-medium">Atrás</button>
                                <button
                                    onClick={handleImport}
                                    disabled={importing}
                                    className="px-6 py-2 bg-emerald-600 text-white rounded-xl font-bold hover:bg-emerald-700 disabled:opacity-50 flex items-center"
                                >
                                    {importing ? 'Importando...' : 'Confirmar Importación'}
                                </button>
                            </div>
                        </div>
                    )}

                    {step === 4 && (
                        <div className="flex flex-col items-center justify-center py-10 space-y-6">
                            <div className="h-20 w-20 bg-emerald-100 rounded-full flex items-center justify-center text-emerald-600 mb-2">
                                <Check size={40} strokeWidth={3} />
                            </div>
                            <h2 className="text-2xl font-bold text-gray-900">¡Importación Completada!</h2>
                            <p className="text-gray-500">Los leads han sido añadidos correctamente.</p>
                            <div className="flex gap-4">
                                <button onClick={onClose} className="px-8 py-3 bg-gray-900 text-white rounded-xl font-bold hover:bg-black">
                                    Cerrar
                                </button>
                                <button onClick={reset} className="px-8 py-3 bg-white border border-gray-200 text-gray-900 rounded-xl font-bold hover:bg-gray-50">
                                    Importar Otro
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}
