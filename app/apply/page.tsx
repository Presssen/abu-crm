'use client'

import { useState } from 'react'

export default function ApplyPage() {
    const [formData, setFormData] = useState({
        full_name: '',
        email: '',
        phone: '',
        linkedin_url: '',
        video_url: '',
        has_computer: false,
        has_phone: false,
        work_mode: 'remote',
        cover_letter: ''
    })
    const [cvFile, setCvFile] = useState<File | null>(null)
    const [submitting, setSubmitting] = useState(false)
    const [submitted, setSubmitted] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [acceptedTerms, setAcceptedTerms] = useState(false)

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!acceptedTerms) {
            setError('Debes aceptar que has leído los detalles del puesto')
            return
        }
        setSubmitting(true)
        setError(null)

        try {
            const data = new FormData()
            data.append('full_name', formData.full_name)
            data.append('email', formData.email)
            data.append('phone', formData.phone)
            data.append('linkedin_url', formData.linkedin_url)
            data.append('video_url', formData.video_url)
            data.append('has_computer', String(formData.has_computer))
            data.append('has_phone', String(formData.has_phone))
            data.append('work_mode', formData.work_mode)
            data.append('cover_letter', formData.cover_letter)
            if (cvFile) data.append('cv', cvFile)

            const res = await fetch('/api/applications', {
                method: 'POST',
                body: data
            })

            const result = await res.json()
            if (!res.ok) throw new Error(result.error || 'Error al enviar')
            setSubmitted(true)
        } catch (err: any) {
            setError(err.message || 'Error al enviar la candidatura')
        } finally {
            setSubmitting(false)
        }
    }

    if (submitted) {
        return (
            <div style={{
                minHeight: '100vh',
                background: '#f8f9fa',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '24px'
            }}>
                <div style={{
                    background: 'white',
                    borderRadius: '12px',
                    padding: '56px 40px',
                    maxWidth: '480px',
                    width: '100%',
                    textAlign: 'center',
                    border: '1px solid #e5e7eb'
                }}>
                    <div style={{
                        width: '56px', height: '56px', borderRadius: '50%',
                        background: '#ecfdf5', display: 'flex', alignItems: 'center', justifyContent: 'center',
                        margin: '0 auto 24px', border: '1px solid #d1fae5'
                    }}>
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#059669" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                            <polyline points="20 6 9 17 4 12" />
                        </svg>
                    </div>
                    <h1 style={{ fontSize: '22px', fontWeight: 700, color: '#111827', margin: '0 0 8px', letterSpacing: '-0.3px' }}>
                        Candidatura recibida
                    </h1>
                    <p style={{ fontSize: '15px', color: '#6b7280', lineHeight: 1.6, margin: 0 }}>
                        Hemos registrado tu candidatura correctamente. Revisaremos tu perfil y nos pondremos en contacto contigo.
                    </p>
                    <div style={{ marginTop: '32px', padding: '16px', background: '#f9fafb', borderRadius: '8px', border: '1px solid #f3f4f6' }}>
                        <p style={{ fontSize: '13px', color: '#9ca3af', margin: 0 }}>
                            Gracias por tu interés en unirte a ABU.
                        </p>
                    </div>
                </div>
            </div>
        )
    }

    return (
        <div style={{ minHeight: '100vh', background: '#f8f9fa' }}>
            {/* Top bar */}
            <div style={{
                background: 'white',
                borderBottom: '1px solid #e5e7eb',
                padding: '16px 24px',
                position: 'sticky',
                top: 0,
                zIndex: 10
            }}>
                <div style={{ maxWidth: '680px', margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <img
                        src="https://cdn.shopify.com/s/files/1/0370/2466/1636/files/new-abu-logo.png?v=1768487866"
                        alt="ABU"
                        style={{ height: '32px' }}
                    />
                    <span style={{ fontSize: '13px', color: '#9ca3af', fontWeight: 500 }}>Proceso de selección</span>
                </div>
            </div>

            <div style={{ maxWidth: '680px', margin: '0 auto', padding: '40px 20px 60px' }}>
                {/* Title */}
                <div style={{ marginBottom: '32px' }}>
                    <h1 style={{
                        fontSize: '28px', fontWeight: 700, color: '#111827',
                        margin: '0 0 6px', letterSpacing: '-0.5px'
                    }}>
                        Prácticas de Ventas B2B
                    </h1>
                    <p style={{ fontSize: '15px', color: '#6b7280', margin: 0 }}>
                        Desde el 20 de mayo de 2026 · Tiempo completo · Remoto con presencialidad en Madrid
                    </p>
                </div>

                {/* Job Details */}
                <div style={{
                    background: 'white', borderRadius: '10px', border: '1px solid #e5e7eb',
                    padding: '28px', marginBottom: '24px'
                }}>
                    <h2 style={{ fontSize: '15px', fontWeight: 700, color: '#111827', margin: '0 0 20px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                        Detalles del puesto
                    </h2>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1px', background: '#f3f4f6', borderRadius: '8px', overflow: 'hidden', marginBottom: '24px' }}>
                        <DetailCell label="Inicio" value="20 de mayo de 2026" sub="Hasta julio, con opción de ampliar a agosto" />
                        <DetailCell label="Retribución fija" value="600 € / mes" sub="Más variable por objetivos de venta" />
                        <DetailCell label="Modalidad" value="Remoto + presencial" sub="Días de presencialidad obligatoria en Madrid" />
                        <DetailCell label="Tipo" value="Prácticas" sub="Jornada completa" />
                    </div>

                    <div style={{ fontSize: '14px', color: '#4b5563', lineHeight: 1.7 }}>
                        <p style={{ margin: '0 0 12px' }}>
                            Buscamos personas proactivas con interés en el mundo comercial y las ventas B2B. 
                            Trabajarás con herramientas profesionales de CRM, contactando empresas, cualificando leads 
                            y gestionando reuniones comerciales.
                        </p>
                        <p style={{ margin: '0 0 12px' }}>
                            Se establecerán objetivos de venta claros y medibles, con una compensación variable 
                            vinculada a resultados. Es una oportunidad real para desarrollar competencias comerciales 
                            en un entorno de startup.
                        </p>
                        <p style={{
                            margin: 0, padding: '12px 16px', background: '#fffbeb',
                            borderRadius: '6px', border: '1px solid #fef3c7', fontSize: '13px', color: '#92400e'
                        }}>
                            <strong>Importante:</strong> Habrá días de presencialidad obligatoria en Madrid. 
                            El resto del tiempo se puede teletrabajar.
                        </p>
                    </div>
                </div>

                {/* Form */}
                <div style={{
                    background: 'white', borderRadius: '10px', border: '1px solid #e5e7eb',
                    padding: '28px'
                }}>
                    <h2 style={{ fontSize: '15px', fontWeight: 700, color: '#111827', margin: '0 0 24px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                        Formulario de candidatura
                    </h2>

                    <form onSubmit={handleSubmit}>
                        {/* Contact */}
                        <Section label="Información de contacto">
                            <input type="text" placeholder="Nombre completo" required
                                value={formData.full_name}
                                onChange={(e) => setFormData(p => ({ ...p, full_name: e.target.value }))}
                                style={inputStyle} />
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                                <input type="email" placeholder="Email" required
                                    value={formData.email}
                                    onChange={(e) => setFormData(p => ({ ...p, email: e.target.value }))}
                                    style={inputStyle} />
                                <input type="tel" placeholder="Teléfono" required
                                    value={formData.phone}
                                    onChange={(e) => setFormData(p => ({ ...p, phone: e.target.value }))}
                                    style={inputStyle} />
                            </div>
                            <input type="url" placeholder="URL de LinkedIn (opcional)"
                                value={formData.linkedin_url}
                                onChange={(e) => setFormData(p => ({ ...p, linkedin_url: e.target.value }))}
                                style={inputStyle} />
                        </Section>

                        {/* CV */}
                        <Section label="Currículum vitae">
                            <label style={{
                                display: 'flex', alignItems: 'center', gap: '14px',
                                padding: '18px 20px', border: '1px solid #e5e7eb', borderRadius: '8px',
                                cursor: 'pointer', background: cvFile ? '#f0fdf4' : '#fafafa',
                                transition: 'all 0.15s'
                            }}>
                                <input type="file" accept=".pdf,.doc,.docx"
                                    onChange={(e) => setCvFile(e.target.files?.[0] || null)}
                                    style={{ display: 'none' }} />
                                <div style={{
                                    width: '40px', height: '40px', borderRadius: '8px',
                                    background: cvFile ? '#dcfce7' : '#f3f4f6',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                                    border: cvFile ? '1px solid #bbf7d0' : '1px solid #e5e7eb'
                                }}>
                                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={cvFile ? '#16a34a' : '#9ca3af'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                                        <polyline points="14 2 14 8 20 8" />
                                    </svg>
                                </div>
                                <div>
                                    <div style={{ fontSize: '14px', fontWeight: 600, color: cvFile ? '#15803d' : '#374151' }}>
                                        {cvFile ? cvFile.name : 'Selecciona o arrastra tu CV'}
                                    </div>
                                    <div style={{ fontSize: '12px', color: '#9ca3af', marginTop: '2px' }}>
                                        {cvFile ? 'Click para cambiar archivo' : 'PDF, DOC o DOCX — máximo 10MB'}
                                    </div>
                                </div>
                            </label>
                        </Section>

                        {/* Video */}
                        <Section label="Vídeo de presentación (opcional)">
                            <input type="url"
                                placeholder="Pega aquí el enlace a tu vídeo (YouTube, Loom, Google Drive...)"
                                value={formData.video_url}
                                onChange={(e) => setFormData(p => ({ ...p, video_url: e.target.value }))}
                                style={inputStyle} />
                            <p style={{ fontSize: '12px', color: '#9ca3af', margin: '4px 0 0', lineHeight: 1.5 }}>
                                Graba un vídeo de menos de 1 minuto presentándote: quién eres, por qué te interesa el puesto y qué puedes aportar. 
                                Súbelo a YouTube, Loom o Google Drive y pega el enlace aquí.
                            </p>
                        </Section>

                        {/* Equipment */}
                        <Section label="Disponibilidad de equipo">
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                                <OptionButton
                                    label="Ordenador propio"
                                    sublabel={formData.has_computer ? 'Disponible' : 'No disponible'}
                                    active={formData.has_computer}
                                    onClick={() => setFormData(p => ({ ...p, has_computer: !p.has_computer }))}
                                />
                                <OptionButton
                                    label="Teléfono propio"
                                    sublabel={formData.has_phone ? 'Disponible' : 'No disponible'}
                                    active={formData.has_phone}
                                    onClick={() => setFormData(p => ({ ...p, has_phone: !p.has_phone }))}
                                />
                            </div>
                        </Section>

                        {/* Work mode */}
                        <Section label="Modalidad preferida">
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px' }}>
                                {[
                                    { value: 'remote', label: 'Teletrabajo' },
                                    { value: 'onsite', label: 'Presencial' },
                                    { value: 'both', label: 'Sin preferencia' },
                                ].map(opt => (
                                    <button key={opt.value} type="button"
                                        onClick={() => setFormData(p => ({ ...p, work_mode: opt.value }))}
                                        style={{
                                            padding: '14px 12px', borderRadius: '8px', cursor: 'pointer',
                                            textAlign: 'center', transition: 'all 0.15s',
                                            fontSize: '13px', fontWeight: 600, fontFamily: 'inherit',
                                            border: formData.work_mode === opt.value ? '2px solid #4f46e5' : '1px solid #e5e7eb',
                                            background: formData.work_mode === opt.value ? '#eef2ff' : 'white',
                                            color: formData.work_mode === opt.value ? '#4338ca' : '#6b7280'
                                        }}
                                    >
                                        {opt.label}
                                    </button>
                                ))}
                            </div>
                        </Section>

                        {/* Cover letter */}
                        <Section label="Carta de motivación (opcional)">
                            <textarea
                                placeholder="¿Por qué te interesa este puesto? Cuéntanos brevemente sobre ti y tu motivación..."
                                value={formData.cover_letter}
                                onChange={(e) => setFormData(p => ({ ...p, cover_letter: e.target.value }))}
                                rows={4}
                                style={{ ...inputStyle, resize: 'vertical' as const, minHeight: '100px' }}
                            />
                        </Section>

                        {/* Terms */}
                        <label style={{
                            display: 'flex', alignItems: 'flex-start', gap: '12px',
                            padding: '16px 18px', background: '#f9fafb', borderRadius: '8px',
                            cursor: 'pointer', marginBottom: '24px', border: '1px solid #f3f4f6'
                        }}>
                            <input type="checkbox" checked={acceptedTerms}
                                onChange={(e) => setAcceptedTerms(e.target.checked)}
                                style={{ marginTop: '2px', accentColor: '#4f46e5', width: '16px', height: '16px', flexShrink: 0 }}
                            />
                            <span style={{ fontSize: '13px', color: '#6b7280', lineHeight: 1.6 }}>
                                He leído los detalles del puesto y confirmo que entiendo las condiciones: retribución fija de 600 €/mes más variable por objetivos, inicio el 20 de mayo de 2026, con días de presencialidad obligatoria en Madrid.
                            </span>
                        </label>

                        {/* Error */}
                        {error && (
                            <div style={{
                                padding: '12px 16px', background: '#fef2f2', border: '1px solid #fecaca',
                                borderRadius: '8px', color: '#b91c1c', fontSize: '13px', fontWeight: 500,
                                marginBottom: '16px'
                            }}>
                                {error}
                            </div>
                        )}

                        {/* Submit */}
                        <button type="submit" disabled={submitting}
                            style={{
                                width: '100%', padding: '14px', background: submitting ? '#9ca3af' : '#111827',
                                color: 'white', border: 'none', borderRadius: '8px',
                                fontSize: '14px', fontWeight: 600, cursor: submitting ? 'not-allowed' : 'pointer',
                                transition: 'all 0.15s', fontFamily: 'inherit', letterSpacing: '0.2px'
                            }}
                        >
                            {submitting ? 'Enviando candidatura...' : 'Enviar candidatura'}
                        </button>
                    </form>
                </div>

                {/* Footer */}
                <p style={{ textAlign: 'center', fontSize: '12px', color: '#9ca3af', marginTop: '32px' }}>
                    © 2026 ABU · Todos los derechos reservados
                </p>
            </div>
        </div>
    )
}

// ─── Sub-components ────────────────────────

function Section({ label, children }: { label: string; children: React.ReactNode }) {
    return (
        <div style={{ marginBottom: '24px' }}>
            <label style={{
                display: 'block', fontSize: '12px', fontWeight: 600, color: '#6b7280',
                textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '10px'
            }}>
                {label}
            </label>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {children}
            </div>
        </div>
    )
}

function DetailCell({ label, value, sub }: { label: string; value: string; sub: string }) {
    return (
        <div style={{ background: 'white', padding: '16px 18px' }}>
            <div style={{ fontSize: '11px', fontWeight: 600, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '4px' }}>{label}</div>
            <div style={{ fontSize: '15px', fontWeight: 700, color: '#111827', marginBottom: '2px' }}>{value}</div>
            <div style={{ fontSize: '12px', color: '#6b7280' }}>{sub}</div>
        </div>
    )
}

function OptionButton({ label, sublabel, active, onClick }: { label: string; sublabel: string; active: boolean; onClick: () => void }) {
    return (
        <button type="button" onClick={onClick}
            style={{
                display: 'flex', alignItems: 'center', gap: '12px',
                padding: '14px 16px', borderRadius: '8px', cursor: 'pointer',
                textAlign: 'left', transition: 'all 0.15s', width: '100%',
                fontFamily: 'inherit',
                border: active ? '2px solid #22c55e' : '1px solid #e5e7eb',
                background: active ? '#f0fdf4' : 'white',
            }}
        >
            <div style={{
                width: '18px', height: '18px', borderRadius: '50%',
                border: active ? '5px solid #22c55e' : '2px solid #d1d5db',
                flexShrink: 0, transition: 'all 0.15s'
            }} />
            <div>
                <div style={{ fontSize: '13px', fontWeight: 600, color: '#111827' }}>{label}</div>
                <div style={{ fontSize: '11px', color: active ? '#16a34a' : '#9ca3af', fontWeight: 500 }}>{sublabel}</div>
            </div>
        </button>
    )
}

// ─── Styles ─────────────────────────

const inputStyle: React.CSSProperties = {
    width: '100%', padding: '11px 14px',
    border: '1px solid #e5e7eb', borderRadius: '8px',
    fontSize: '14px', color: '#111827', outline: 'none',
    transition: 'border-color 0.15s', fontFamily: 'inherit',
    boxSizing: 'border-box' as const, background: 'white'
}
