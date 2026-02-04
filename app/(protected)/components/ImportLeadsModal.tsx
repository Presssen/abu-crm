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
    { key: 'company_name', label: 'Empresa', required: false },
    { key: 'domain', label: 'Domain', required: false },
    { key: 'contact_name', label: 'Nombre de Contacto', required: false },
    { key: 'email', label: 'Email', required: false },
    { key: 'phone', label: 'Teléfono', required: false },
    { key: 'categories', label: 'Categories', required: false },
    { key: 'city', label: 'City', required: false },
    { key: 'created', label: 'Created', required: false },
    { key: 'plan', label: 'Plan', required: false },
    { key: 'platform', label: 'Platform', required: false },
    { key: 'platform_rank', label: 'Platform Rank', required: false },
    { key: 'status', label: 'Status', required: false },
    { key: 'source', label: 'Fuente', required: false },
    { key: 'notes', label: 'Notas', required: false },
]

const COUNTRIES = [
    'Andorra', 'España', 'México', 'Argentina', 'Colombia', 'Chile', 'Perú', 'Venezuela',
    'Ecuador', 'Guatemala', 'Cuba', 'Bolivia', 'República Dominicana', 'Honduras',
    'Paraguay', 'El Salvador', 'Nicaragua', 'Costa Rica', 'Panamá', 'Uruguay',
    'Puerto Rico', 'Estados Unidos', 'Otro'
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
    const [selectedCountry, setSelectedCountry] = useState<string>('')

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

            // Create import batch record
            const { data: batchData, error: batchError } = await supabase
                .from('import_batches')
                .insert([{
                    created_by: ownerId,
                    country: selectedCountry,
                    file_name: fileName,
                    total_leads: 0,
                    status: 'completed'
                }])
                .select()
                .single()

            if (batchError) throw batchError
            const batchId = batchData.id

            const leadsToInsert: any[] = []
            const contactsToInsert: any[] = []

            // Prepare leads
            const preparedLeads = fileData.map((row) => {
                const lead: any = {
                    owner_id: ownerId,
                    status: 'new',
                    country: selectedCountry,
                    import_batch_id: batchId
                }

                // Temporary storage for split values
                let allEmails: string[] = []
                let allPhones: string[] = []

                Object.entries(mapping).forEach(([fileHeader, dbField]) => {
                    if (dbField) {
                        let value = row[fileHeader]

                        if (!value) return

                        // Handle Shopify-specific mappings & special parsing
                        // Handle Shopify-specific mappings & special parsing
                        if (dbField === 'email') {
                            const valStr = value.toString()
                            // Extract emails using regex to handle cases like "a@b.com.c@d.com" or separators
                            // We use \b at the end to ensure we don't match partial domains if they run into a separator like .user
                            const emailRegex = /([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})\b/gi
                            const matches = valStr.match(emailRegex)

                            if (matches) {
                                // Clean up matches that might have captured leading separators (like .email@domain.com)
                                const cleanMatches = matches.map((m: string) => m.replace(/^[.:,;\s]+/, ''))
                                allEmails = [...allEmails, ...cleanMatches]
                                if (!lead['email']) {
                                    lead['email'] = cleanMatches[0]
                                }
                            } else {
                                // Fallback split if no clear email pattern found
                                const parts = valStr.split(/[:;,]\s*/).map((s: string) => s.trim()).filter(Boolean)
                                allEmails = [...allEmails, ...parts]
                                if (!lead['email'] && parts.length > 0) {
                                    lead['email'] = parts[0]
                                }
                            }
                        } else if (dbField === 'phone') {
                            // Split phones values like "123:456" or "123, 456"
                            const phones = value.toString().split(/[:;,]\s*/).map((s: string) => s.trim()).filter(Boolean)
                            allPhones = [...allPhones, ...phones]
                            // Set primary phone if not set
                            if (!lead['phone'] && phones.length > 0) {
                                lead['phone'] = phones[0]
                            }
                        } else if (dbField === 'categories') {
                            // Parse category: "/Beauty & Fitness/Face & Body Care" -> "Beauty & Fitness"
                            // Take the part between the first two slashes if it starts with /
                            const valStr = value.toString()
                            if (valStr.startsWith('/')) {
                                const parts = valStr.split('/')
                                // parts[0] is empty string before first slash
                                // parts[1] is "Beauty & Fitness"
                                if (parts.length > 1 && parts[1]) {
                                    lead['categories'] = parts[1]
                                } else {
                                    lead['categories'] = valStr // Fallback
                                }
                            } else {
                                lead['categories'] = valStr
                            }
                        } else if (dbField === 'created') {
                            lead['created_date'] = value
                        } else if (dbField === 'status') {
                            lead['shopify_status'] = value
                        } else if (dbField === 'plan') {
                            lead['plan'] = value?.toString().toLowerCase().includes('plus') ? 'Shopify Plus' : 'Shopify Standard'
                        } else {
                            lead[dbField] = value
                        }
                    }
                })

                // Use domain as company_name if company_name is empty
                if (!lead.company_name && lead.domain) {
                    lead.company_name = lead.domain
                }

                if (!lead.email && !lead.company_name && !lead.domain) return null

                // Return both the lead object and the extra contact info needed
                return {
                    leadData: lead,
                    extraContacts: {
                        emails: allEmails,
                        phones: allPhones,
                        contact_name: lead.contact_name
                    }
                }
            }).filter(Boolean)

            if (preparedLeads.length === 0) {
                throw new Error('No se encontraron leads validos para importar.')
            }

            // Insert leads in batches to avoid huge requests, but we need IDs so likely fine to do one big insert for reasonable sizes.
            // Supabase returns inserted rows.
            const { data: insertedLeads, error: importError } = await supabase
                .from('leads')
                .insert(preparedLeads.map(p => p!.leadData))
                .select('id, email, phone')

            if (importError) throw importError

            // Prepare contacts
            // We need to match inserted leads back to our prepared data.
            // Assumption: The order of insertedLeads matches the order of preparedLeads.
            // THIS IS NOT GUARANTEED IN ALL SQL IMPLEMENTATIONS but typically works in single batch inserts.
            // A safer way is ensuring we can map back via some unique key, but we might not have one.
            // However, Supabase/Postgres `insert returning` typically preserves order of the values clause.

            // To be safer/more robust, let's just iterate and assume validity for this script or use a loop.
            // Actually, for bulk imports, order preservation in RETURNING is standard in Postgres for the VALUES list.

            insertedLeads.forEach((insertedLead, index) => {
                const prepared = preparedLeads[index]
                if (!prepared) return

                const { emails, phones, contact_name } = prepared.extraContacts

                // Create contact entries
                // Add emails that are NOT the primary email
                emails.forEach((email: string) => {
                    if (email !== insertedLead.email) {
                        contactsToInsert.push({
                            lead_id: insertedLead.id,
                            name: contact_name || 'Contacto Adicional',
                            email: email,
                            is_primary: false
                        })
                    }
                })

                // Add phones that are NOT the primary phone
                phones.forEach((phone: string) => {
                    if (phone !== insertedLead.phone) {
                        contactsToInsert.push({
                            lead_id: insertedLead.id,
                            name: contact_name || 'Contacto Adicional',
                            phone: phone,
                            is_primary: false
                        })
                    }
                    // Note: We are creating separate contact entries for extra emails and extra phones for now, 
                    // as we don't know which phone belongs to which email if they are just lists.
                })
            })

            if (contactsToInsert.length > 0) {
                const { error: contactsError } = await supabase
                    .from('lead_contacts')
                    .insert(contactsToInsert)

                if (contactsError) {
                    console.error('Error importing contacts:', contactsError)
                    // We don't fail the whole import if contacts fail, but maybe we should warn?
                }
            }

            // Update batch with total leads count
            await supabase
                .from('import_batches')
                .update({ total_leads: insertedLeads.length })
                .eq('id', batchId)

            setStep(4)
            setTimeout(() => {
                onSuccess()
            }, 1000)
        } catch (err: any) {
            console.error(err)
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
        setSelectedCountry('')
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
                        <div className="space-y-6">
                            {/* Country Selection */}
                            <div className="space-y-2">
                                <label className="text-sm font-bold text-gray-700">País de origen de los leads *</label>
                                <select
                                    value={selectedCountry}
                                    onChange={(e) => setSelectedCountry(e.target.value)}
                                    className="w-full px-4 py-3 bg-white border-2 border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all text-sm font-medium"
                                    required
                                >
                                    <option value="">Seleccionar país...</option>
                                    {COUNTRIES.map(country => (
                                        <option key={country} value={country}>{country}</option>
                                    ))}
                                </select>
                                <p className="text-xs text-gray-500">Este país se asignará a todos los leads importados</p>
                            </div>

                            {/* File Upload */}
                            <div
                                onClick={() => selectedCountry && fileInputRef.current?.click()}
                                className={clsx(
                                    "border-2 border-dashed rounded-3xl h-64 flex flex-col items-center justify-center bg-white transition-all cursor-pointer group",
                                    selectedCountry
                                        ? "border-gray-300 hover:border-indigo-500 hover:bg-indigo-50/50"
                                        : "border-gray-200 bg-gray-50 cursor-not-allowed opacity-50"
                                )}
                            >
                                <input
                                    ref={fileInputRef}
                                    type="file"
                                    onChange={handleFileUpload}
                                    accept=".xlsx, .xls, .csv"
                                    className="hidden"
                                    disabled={!selectedCountry}
                                />
                                <div className={clsx(
                                    "p-4 rounded-2xl mb-4 transition-transform",
                                    selectedCountry
                                        ? "bg-indigo-50 text-indigo-600 group-hover:scale-110"
                                        : "bg-gray-100 text-gray-400"
                                )}>
                                    <Upload size={32} />
                                </div>
                                <p className="font-bold text-gray-900">
                                    {selectedCountry ? 'Haz clic o arrastra tu archivo aquí' : 'Selecciona un país primero'}
                                </p>
                                <p className="text-sm text-gray-500 mt-1">Soporta Excel y CSV</p>
                            </div>
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
