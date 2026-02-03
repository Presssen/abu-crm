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
    Search,
    Table as TableIcon,
    Database,
    Zap,
    X,
    FileSpreadsheet
} from 'lucide-react'
import { clsx } from 'clsx'
import { useRouter } from 'next/navigation'

const LEAD_FIELDS = [
    { key: 'company_name', label: 'Empresa', required: true },
    { key: 'contact_name', label: 'Nombre de Contacto', required: false },
    { key: 'email', label: 'Email', required: true },
    { key: 'phone', label: 'Teléfono', required: false },
    { key: 'source', label: 'Fuente', required: false },
    { key: 'notes', label: 'Notas', required: false },
]

export default function ImportsPage() {
    const [step, setStep] = useState(1)
    const [fileData, setFileData] = useState<any[]>([])
    const [headers, setHeaders] = useState<string[]>([])
    const [mapping, setMapping] = useState<Record<string, string>>({})
    const [importing, setImporting] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [fileName, setFileName] = useState<string | null>(null)

    const fileInputRef = useRef<HTMLInputElement>(null)
    const supabase = createClient()
    const router = useRouter()

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
        } catch (err: any) {
            setError(err.message || 'Error al importar los datos.')
        } finally {
            setImporting(false)
        }
    }

    return (
        <div className="max-w-4xl mx-auto space-y-8 pb-12">
            <div className="text-center space-y-2">
                <h1 className="text-3xl font-bold text-gray-900">Importar Leads</h1>
                <p className="text-gray-500">Sube tu archivo Excel o CSV para añadir prospectos de forma masiva.</p>
            </div>

            {/* Stepper */}
            <div className="relative">
                <div className="absolute top-5 left-0 w-full h-0.5 bg-gray-100 -z-10" />
                <div className="flex justify-between">
                    {[1, 2, 3, 4].map((s) => (
                        <div key={s} className="flex flex-col items-center">
                            <div className={clsx(
                                "h-10 w-10 rounded-full flex items-center justify-center font-bold text-sm transition-all duration-300 border-4",
                                step > s ? "bg-emerald-500 border-white text-white" :
                                    step === s ? "bg-indigo-600 border-white text-white shadow-lg shadow-indigo-100" :
                                        "bg-white border-gray-100 text-gray-400"
                            )}>
                                {step > s ? <Check size={20} /> : s}
                            </div>
                            <span className={clsx(
                                "mt-2 text-xs font-bold uppercase tracking-wider",
                                step === s ? "text-indigo-600" : "text-gray-400"
                            )}>
                                {s === 1 ? 'Subir' : s === 2 ? 'Mapear' : s === 3 ? 'Vista Previa' : 'Listo'}
                            </span>
                        </div>
                    ))}
                </div>
            </div>

            {/* Step 1: Upload */}
            {step === 1 && (
                <div
                    onClick={() => fileInputRef.current?.click()}
                    className="border-2 border-dashed border-gray-200 rounded-3xl p-16 flex flex-col items-center justify-center bg-white hover:border-indigo-400 hover:bg-indigo-50/30 transition-all cursor-pointer group"
                >
                    <input
                        type="file"
                        ref={fileInputRef}
                        onChange={handleFileUpload}
                        accept=".xlsx, .xls, .csv"
                        className="hidden"
                    />
                    <div className="p-6 bg-indigo-50 rounded-2xl text-indigo-600 group-hover:scale-110 transition-transform duration-300">
                        <Upload size={48} />
                    </div>
                    <div className="mt-8 text-center">
                        <p className="text-lg font-bold text-gray-900">Haz clic para subir o arrastra un archivo</p>
                        <p className="mt-1 text-sm text-gray-500">Soporta .xlsx, .xls y .csv (Máx. 5MB)</p>
                    </div>
                </div>
            )}

            {/* Step 2: Mapping */}
            {step === 2 && (
                <div className="bg-white rounded-3xl border border-gray-100 shadow-xl overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-500">
                    <div className="p-6 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
                        <div className="flex items-center space-x-3">
                            <Database className="text-indigo-600" size={24} />
                            <h2 className="text-lg font-bold text-gray-900">Mapear Columnas</h2>
                        </div>
                        <p className="text-sm font-medium text-gray-500">{fileName}</p>
                    </div>
                    <div className="p-6 space-y-6">
                        <div className="grid grid-cols-2 gap-4 text-xs font-bold text-gray-400 uppercase tracking-wider pb-2 border-b border-gray-50">
                            <div>Columna en tu Archivo</div>
                            <div>Campo en el CRM</div>
                        </div>
                        <div className="space-y-4">
                            {headers.map((header) => (
                                <div key={header} className="grid grid-cols-2 gap-4 items-center">
                                    <div className="flex items-center space-x-3">
                                        <div className="h-8 w-8 rounded-lg bg-gray-100 flex items-center justify-center text-gray-500 text-xs">
                                            <FileSpreadsheet size={16} />
                                        </div>
                                        <span className="text-sm font-medium text-gray-700 truncate">{header}</span>
                                    </div>
                                    <select
                                        className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
                                        value={mapping[header] || ''}
                                        onChange={(e) => setMapping({ ...mapping, [header]: e.target.value })}
                                    >
                                        <option value="">Ignorar columna</option>
                                        {LEAD_FIELDS.map(f => (
                                            <option key={f.key} value={f.key}>
                                                {f.label} {f.required ? '*' : ''}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            ))}
                        </div>
                    </div>
                    <div className="p-6 border-t border-gray-100 bg-gray-50/50 flex justify-between">
                        <button onClick={() => setStep(1)} className="px-6 py-2.5 text-sm font-bold text-gray-600 hover:text-gray-900">
                            Atrás
                        </button>
                        <button
                            onClick={() => setStep(3)}
                            className="inline-flex items-center px-8 py-2.5 bg-indigo-600 text-white text-sm font-bold rounded-xl hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-100"
                        >
                            Continuar a Vista Previa
                            <ChevronRight size={18} className="ml-2" />
                        </button>
                    </div>
                </div>
            )}

            {/* Step 3: Preview */}
            {step === 3 && (
                <div className="bg-white rounded-3xl border border-gray-100 shadow-xl overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-500">
                    <div className="p-6 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
                        <div className="flex items-center space-x-3">
                            <TableIcon className="text-indigo-600" size={24} />
                            <h2 className="text-lg font-bold text-gray-900">Vista Previa ({fileData.length} leads)</h2>
                        </div>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm">
                            <thead className="bg-gray-50 border-b border-gray-100">
                                <tr>
                                    {LEAD_FIELDS.filter(f => Object.values(mapping).includes(f.key)).map(f => (
                                        <th key={f.key} className="px-6 py-4 font-bold text-gray-500">{f.label}</th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-50">
                                {fileData.slice(0, 10).map((row, i) => (
                                    <tr key={i}>
                                        {LEAD_FIELDS.filter(f => Object.values(mapping).includes(f.key)).map(f => {
                                            const originalHeader = Object.entries(mapping).find(([h, m]) => m === f.key)?.[0]
                                            return (
                                                <td key={f.key} className="px-6 py-4 text-gray-600">
                                                    {originalHeader ? row[originalHeader] : '-'}
                                                </td>
                                            )
                                        })}
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                        {fileData.length > 10 && (
                            <div className="p-4 text-center text-xs text-gray-400 font-medium italic border-t border-gray-50">
                                Mostrando los primeros 10 registros...
                            </div>
                        )}
                    </div>
                    <div className="p-6 border-t border-gray-100 bg-gray-50/50 flex justify-between items-center">
                        <div>
                            {error && (
                                <div className="flex items-center text-rose-600 text-sm font-bold uppercase tracking-wider">
                                    <AlertCircle size={16} className="mr-2" />
                                    {error}
                                </div>
                            )}
                        </div>
                        <div className="flex space-x-4">
                            <button onClick={() => setStep(2)} className="px-6 py-2.5 text-sm font-bold text-gray-600 hover:text-gray-900">
                                Atrás
                            </button>
                            <button
                                onClick={handleImport}
                                disabled={importing}
                                className="inline-flex items-center px-8 py-2.5 bg-indigo-600 text-white text-sm font-bold rounded-xl hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-100 disabled:opacity-50"
                            >
                                {importing ? (
                                    <>
                                        <Zap className="mr-2 animate-pulse" size={18} />
                                        Importando...
                                    </>
                                ) : (
                                    <>
                                        Confirmar Importación
                                        <Check size={18} className="ml-2" />
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Step 4: Success */}
            {step === 4 && (
                <div className="text-center py-12 space-y-8 animate-in zoom-in duration-500">
                    <div className="inline-flex p-8 bg-emerald-50 rounded-full text-emerald-600 ring-8 ring-emerald-50/50">
                        <Check size={64} strokeWidth={3} />
                    </div>
                    <div className="space-y-3">
                        <h2 className="text-3xl font-black text-gray-900 uppercase tracking-tight">¡Importación Exitosa!</h2>
                        <p className="text-gray-500 max-w-md mx-auto">
                            Se han importado correctamente {fileData.length} nuevos leads a tu ecosistema de ventas.
                        </p>
                    </div>
                    <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                        <button
                            onClick={() => router.push('/leads')}
                            className="w-full sm:w-auto px-10 py-4 bg-gray-900 text-white font-bold rounded-2xl hover:bg-black transition-all shadow-xl shadow-gray-200"
                        >
                            Ver Leads Importados
                        </button>
                        <button
                            onClick={() => {
                                setStep(1)
                                setFileData([])
                                setHeaders([])
                                setMapping({})
                                setFileName(null)
                            }}
                            className="w-full sm:w-auto px-10 py-4 bg-white text-gray-900 font-bold border border-gray-200 rounded-2xl hover:bg-gray-50 transition-all"
                        >
                            Importar Otro Archivo
                        </button>
                    </div>
                </div>
            )}
        </div>
    )
}
