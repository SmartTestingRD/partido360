import { useState, useEffect } from 'react';
import { getSectores, getLideres, getFuentes, getUltimoRegistro, postRegistro, Sector, Lider, Fuente, UltimoRegistro, RegistroPayload } from '../api/apiService';
import axios, { AxiosError } from 'axios';

function formatCedula(value: string): string {
  const digits = value.replace(/\D/g, '');
  if (digits.length <= 3) return digits;
  if (digits.length <= 10) return `${digits.slice(0,3)}-${digits.slice(3)}`;
  return `${digits.slice(0,3)}-${digits.slice(3,10)}-${digits.slice(10,11)}`;
}
function formatTelefono(value: string): string {
  const digits = value.replace(/\D/g, '');
  if (digits.length <= 3) return digits;
  if (digits.length <= 6) return `${digits.slice(0,3)}-${digits.slice(3)}`;
  return `${digits.slice(0,3)}-${digits.slice(3,6)}-${digits.slice(6,10)}`;
}

const RegistrarPersona = () => {
    const [sectores, setSectores] = useState<Sector[]>([]);
    const [lideres, setLideres] = useState<Lider[]>([]);
    const [fuentes, setFuentes] = useState<Fuente[]>([]);
    const [ultimoRegistro, setUltimoRegistro] = useState<UltimoRegistro | null>(null);

    const [loading, setLoading] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [successMsg, setSuccessMsg] = useState<string | null>(null);
    const [fieldErrors, setFieldErrors] = useState<Record<string,string>>({});

    async function checkDuplicate(field: 'cedula' | 'telefono', value: string) {
      if (!value || value.replace(/\D/g,'').length < 3) return;
      try {
        const res = await axios.get(`http://localhost:3001/api/personas/buscar?q=${encodeURIComponent(value)}`);
        if (res.data.data && res.data.data.length > 0) {
          setFieldErrors(prev => ({
            ...prev,
            [field]: `⚠️ Ya existe una persona registrada con este ${field === 'cedula' ? 'número de cédula' : 'teléfono'}`
          }));
        } else {
          setFieldErrors(prev => ({...prev, [field]: ''}));
        }
      } catch {}
    }

    const [formData, setFormData] = useState({
        nombres: '',
        apellidos: '',
        cedula: '',
        telefono: '',
        email: '',
        sector: '',
        lider: '',
        fuente: '',
        notas: '',
        mesa: ''
    });

    // Obtener información del usuario logueado
    const userStr = localStorage.getItem('user');
    let currentUser: any = null;
    if (userStr) {
        try {
            currentUser = JSON.parse(userStr);
        } catch (e) { }
    }
    const isLiderRole = currentUser?.rol_nombre === 'SUB_LIDER';
    const isLider = currentUser?.rol_nombre === 'LIDER';

    useEffect(() => {
        const fetchData = async () => {
            setLoading(true);
            try {
                const [sectoresData, lideresData, fuentesData, ultimoRegistroData] = await Promise.all([
                    getSectores(),
                    getLideres(),
                    getFuentes(),
                    getUltimoRegistro()
                ]);
                setSectores(sectoresData);
                setLideres(lideresData);
                setFuentes(fuentesData);
                setUltimoRegistro(ultimoRegistroData);

                // Autocompletar líder si el usuario logueado ya es un líder
                if (isLiderRole && currentUser?.lider_id) {
                    setFormData(prev => ({ ...prev, lider: currentUser.lider_id.toString() }));
                }
                if (isLider && currentUser?.lider_id) {
                    setFormData(prev => ({ ...prev, lider: currentUser.lider_id }));
                }
            } catch (err) {
                console.error("Error cargando catálogos", err);
                setError("Error al cargar datos del sistema. Por favor recarga la página.");
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, []);

    useEffect(() => {
        const interval = setInterval(async () => {
            try {
                const [sectoresData, lideresData] = await Promise.all([
                    getSectores(),
                    getLideres()
                ]);
                setSectores(sectoresData);
                setLideres(lideresData);
            } catch {}
        }, 30000);
        return () => clearInterval(interval);
    }, []);

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        
        // Bloquear números y caracteres especiales en nombres y apellidos en tiempo real
        if (name === 'nombres' || name === 'apellidos') {
            const cleanValue = value.replace(/[^a-zA-ZáéíóúÁÉÍÓÚñÑ\s'-]/g, '');
            setFormData(prev => ({ ...prev, [name]: cleanValue }));
        } else {
            setFormData(prev => ({ ...prev, [name]: value }));
        }
    };

    const handleClear = () => {
        setFormData({
            nombres: '', apellidos: '', cedula: '', telefono: '', email: '',
            sector: '', lider: isLiderRole ? currentUser?.lider_id?.toString() || '' : '', fuente: '', notas: '', mesa: ''
        });
        setError(null);
        setSuccessMsg(null);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        
        // --- Validaciones de Campos Requeridos ---
        if (!formData.nombres.trim()) { setError('El nombre es obligatorio.'); return; }
        if (!formData.apellidos.trim()) { setError('El apellido es obligatorio.'); return; }
        if (!formData.cedula || formData.cedula.length < 11) { setError('La cédula es obligatoria y debe estar completa.'); return; }
        if (!formData.telefono || formData.telefono.length < 10) { setError('El teléfono es obligatorio y debe estar completo.'); return; }
        if (!formData.sector) { setError('Debe seleccionar un centro de votación.'); return; }
        if (!formData.lider) { setError('Debe asignar un líder responsable.'); return; }
        if (!formData.fuente) { setError('Debe seleccionar una fuente de captación.'); return; }

        // --- Validaciones de Formato ---
        const nameRegex = /^[a-zA-ZáéíóúÁÉÍÓÚñÑ\s'-]+$/;
        if (!nameRegex.test(formData.nombres.trim())) {
            setError('El nombre solo debe contener letras y espacios.');
            return;
        }
        if (!nameRegex.test(formData.apellidos.trim())) {
            setError('El apellido solo debe contener letras y espacios.');
            return;
        }
        if (formData.email && formData.email.trim() !== '') {
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailRegex.test(formData.email.trim())) {
                setError('Por favor, ingresa un correo electrónico válido.');
                return;
            }
        }

        setSubmitting(true);
        setError(null);
        setSuccessMsg(null);

        try {
            const payload: RegistroPayload = {
                nombres: formData.nombres,
                apellidos: formData.apellidos,
                cedula: formData.cedula || undefined,
                telefono: formData.telefono,
                email: formData.email || undefined,
                sector_id: formData.sector,
                lider_id: formData.lider,
                fuente_id: formData.fuente,
                notas: formData.notas || undefined,
                mesa: formData.mesa || undefined
            };

            const result = await postRegistro(payload);
            setSuccessMsg(result.message || 'Registro creado y asignado exitosamente.');

            // Refetch ultimo registro to show the one we just made
            const nuevoRegistro = await getUltimoRegistro();
            setUltimoRegistro(nuevoRegistro);

            setTimeout(() => handleClear(), 3000); // Clear after 3 seconds
        } catch (err: unknown) {
            if (err instanceof AxiosError && err.response) {
                const data = err.response.data;
                if (data.code === 'DUPLICATE_PHONE') {
                    setError('El número de teléfono ingresado ya pertenece a otra persona.');
                } else if (data.code === 'DUPLICATE_CEDULA') {
                    setError('La cédula ingresada ya se encuentra registrada.');
                } else {
                    setError(data.message || 'Ocurrió un error al guardar los datos.');
                }
            } else {
                setError('Error de conexión con el servidor. Inténtalo más tarde.');
            }
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="flex-1 overflow-y-auto bg-background-light dark:bg-background-dark p-4 md:p-8 w-full h-full relative">
            {/* Loader Overlay */}
            {submitting && (
                <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-900/40 backdrop-blur-sm animate-fade-in">
                    <div className="bg-white dark:bg-slate-800 p-8 rounded-3xl shadow-2xl flex flex-col items-center gap-4 border border-white/20 dark:border-slate-700/50">
                        <div className="relative">
                            <div className="w-16 h-16 border-4 border-blue-600/20 border-t-blue-600 rounded-full animate-spin"></div>
                            <div className="absolute inset-0 flex items-center justify-center">
                                <span className="material-symbols-outlined text-blue-600 animate-pulse">cloud_upload</span>
                            </div>
                        </div>
                        <div className="text-center">
                            <h3 className="text-lg font-bold text-slate-900 dark:text-white">Procesando Registro</h3>
                            <p className="text-sm text-slate-500 dark:text-slate-400">Estamos guardando los datos de forma segura...</p>
                        </div>
                    </div>
                </div>
            )}

            <div className="max-w-7xl mx-auto">
                <div className="mb-6 md:mb-8">
                    <div className="hidden md:flex items-center text-sm text-gray-500 dark:text-gray-400 gap-2 mb-2">
                        <span onClick={() => window.location.hash = 'dashboard'} className="hover:text-primary cursor-pointer">Dashboard</span>
                        <span className="material-symbols-outlined text-base">chevron_right</span>
                        <span onClick={() => window.location.hash = 'captacion'} className="hover:text-primary cursor-pointer">Captaciones</span>
                        <span className="material-symbols-outlined text-base">chevron_right</span>
                        <span className="text-primary font-medium">Nueva Persona</span>
                    </div>
                    <h1 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white tracking-tight">Registrar Persona</h1>
                    <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Ingrese los datos del nuevo ciudadano al sistema CRM.</p>
                </div>            </div>

            {error && (
                <div className="mb-6 bg-red-50 dark:bg-red-900/20 border-l-4 border-red-500 p-4 rounded-md flex items-start">
                    <span className="material-symbols-outlined text-red-500 mr-3">error</span>
                    <p className="text-sm font-medium text-red-800 dark:text-red-200">{error}</p>
                </div>
            )}

            {successMsg && (
                <div className="mb-6 bg-green-50 dark:bg-green-900/20 border-l-4 border-green-500 p-4 rounded-md flex items-start">
                    <span className="material-symbols-outlined text-green-500 mr-3">check_circle</span>
                    <p className="text-sm font-medium text-green-800 dark:text-green-200">{successMsg}</p>
                </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8">
                <div className="lg:col-span-8">
                    <form onSubmit={handleSubmit} noValidate className="bg-card-light dark:bg-card-dark rounded-xl shadow-soft border border-border-light dark:border-border-dark overflow-hidden flex flex-col h-full">
                        <div className="px-6 py-4 border-b border-border-light dark:border-border-dark bg-gray-50 dark:bg-gray-800/50 flex items-center justify-between">
                            <h2 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                                <span className="material-symbols-outlined text-primary">feed</span>
                                Formulario de Registro
                            </h2>
                            <span className="text-xs font-medium px-2.5 py-0.5 rounded-full bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300 border border-blue-200 dark:border-blue-800">Borrador</span>
                        </div>

                        <div className="p-6 space-y-6 flex-1">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="space-y-1.5">
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300" htmlFor="nombres">
                                        Nombres <span className="text-red-500">*</span>
                                    </label>
                                    <div className="relative rounded-md shadow-sm group">
                                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                            <span className="material-symbols-outlined text-gray-400 group-focus-within:text-primary transition-colors text-xl">person</span>
                                        </div>
                                        <input className="pl-10 block w-full rounded-lg border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:border-primary focus:ring-primary text-base py-3 transition-shadow"
                                            id="nombres" name="nombres" placeholder="Ej. Juan Carlos" required type="text"
                                            value={formData.nombres} onChange={handleInputChange}
                                            onBlur={e => {
                                              if (/\d/.test(e.target.value)) {
                                                setFieldErrors(prev => ({...prev, nombres: 'El nombre no puede contener números'}));
                                              } else {
                                                setFieldErrors(prev => ({...prev, nombres: ''}));
                                              }
                                            }} />
                                    </div>
                                    {fieldErrors.nombres && <p className="text-red-500 text-xs mt-1">{fieldErrors.nombres}</p>}
                                </div>
                                <div className="space-y-1.5">
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300" htmlFor="apellidos">
                                        Apellidos <span className="text-red-500">*</span>
                                    </label>
                                    <input className="block w-full rounded-lg border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:border-primary focus:ring-primary text-base py-3 transition-shadow px-3"
                                        id="apellidos" name="apellidos" placeholder="Ej. Pérez Rodríguez" required type="text"
                                        value={formData.apellidos} onChange={handleInputChange}
                                        onBlur={e => {
                                          if (/\d/.test(e.target.value)) {
                                            setFieldErrors(prev => ({...prev, apellidos: 'Los apellidos no pueden contener números'}));
                                          } else {
                                            setFieldErrors(prev => ({...prev, apellidos: ''}));
                                          }
                                        }} />
                                    {fieldErrors.apellidos && <p className="text-red-500 text-xs mt-1">{fieldErrors.apellidos}</p>}
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="space-y-1.5">
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 flex justify-between" htmlFor="cedula">
                                        <span>Cédula <span className="text-red-500">*</span></span>
                                    </label>
                                    <div className="relative rounded-md shadow-sm group">
                                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                            <span className="material-symbols-outlined text-gray-400 group-focus-within:text-primary transition-colors text-xl">fingerprint</span>
                                        </div>
                                        <input
                                            className="pl-10 block w-full rounded-lg border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:border-primary focus:ring-primary text-base py-3 transition-shadow"
                                            id="cedula"
                                            name="cedula"
                                            placeholder="000-0000000-0"
                                            required
                                            type="text"
                                            value={formData.cedula}
                                            onChange={e => {
                                              const formatted = formatCedula(e.target.value);
                                              setFormData(prev => ({ ...prev, cedula: formatted }));
                                            }}
                                            maxLength={13}
                                            onBlur={() => checkDuplicate('cedula', formData.cedula)}
                                        />
                                    </div>
                                    {fieldErrors.cedula && <p className="text-red-500 text-xs mt-1">{fieldErrors.cedula}</p>}
                                </div>
                                <div className="space-y-1.5">
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300" htmlFor="telefono">
                                        Teléfono <span className="text-red-500">*</span>
                                    </label>
                                    <div className="relative rounded-md shadow-sm group">
                                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                            <span className="material-symbols-outlined text-gray-400 group-focus-within:text-primary transition-colors text-xl">smartphone</span>
                                        </div>
                                        <input
                                            className="pl-10 block w-full rounded-lg border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:border-primary focus:ring-primary text-base py-3 transition-shadow"
                                            id="telefono"
                                            name="telefono"
                                            placeholder="809-000-0000"
                                            required
                                            type="text"
                                            value={formData.telefono}
                                            onChange={e => {
                                              const formatted = formatTelefono(e.target.value);
                                              setFormData(prev => ({ ...prev, telefono: formatted }));
                                            }}
                                            maxLength={12}
                                            onBlur={() => checkDuplicate('telefono', formData.telefono)}
                                        />
                                    </div>
                                    {fieldErrors.telefono && <p className="text-red-500 text-xs mt-1">{fieldErrors.telefono}</p>}
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                <div className="space-y-1.5">
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 flex justify-between" htmlFor="email">
                                        <span>Correo Electrónico</span>
                                        <span className="text-xs text-gray-400 font-normal bg-gray-100 dark:bg-gray-700 px-1.5 py-0.5 rounded">Opcional</span>
                                    </label>
                                    <div className="relative rounded-md shadow-sm group">
                                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                            <span className="material-symbols-outlined text-gray-400 group-focus-within:text-primary transition-colors text-xl">mail</span>
                                        </div>
                                        <input className="pl-10 block w-full rounded-lg border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:border-primary focus:ring-primary text-base py-3 transition-shadow"
                                            id="email" name="email" placeholder="usuario@ejemplo.com" type="email"
                                            value={formData.email} onChange={handleInputChange} />
                                    </div>
                                </div>
                                <div className="space-y-1.5">
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300" htmlFor="sector">
                                        Centro de Votación <span className="text-red-500">*</span>
                                    </label>
                                    <div className="relative rounded-md shadow-sm">
                                        <select className="block w-full px-3 rounded-lg border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:border-primary focus:ring-primary text-base py-3 transition-shadow"
                                            id="sector" name="sector" required value={formData.sector} onChange={handleInputChange} disabled={loading}>
                                            <option value="" disabled>Seleccionar Centro de Votación...</option>
                                            {sectores.map(s => (
                                                <option key={s.sector_id} value={s.sector_id}>{s.nombre}</option>
                                            ))}
                                        </select>
                                    </div>
                                </div>
                                <div className="space-y-1.5">
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 flex justify-between" htmlFor="mesa">
                                        <span>Mesa</span>
                                        <span className="text-xs text-gray-400 font-normal bg-gray-100 dark:bg-gray-700 px-1.5 py-0.5 rounded">Opcional</span>
                                    </label>
                                    <div className="relative rounded-md shadow-sm group">
                                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                            <span className="material-symbols-outlined text-gray-400 group-focus-within:text-primary transition-colors text-xl">tag</span>
                                        </div>
                                        <input className="pl-10 block w-full rounded-lg border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:border-primary focus:ring-primary text-base py-3 transition-shadow"
                                            id="mesa" name="mesa" placeholder="Ej. 0001" type="text"
                                            value={formData.mesa} onChange={handleInputChange} />
                                    </div>
                                </div>
                            </div>

                            <div className="border-t border-dashed border-gray-200 dark:border-gray-700 my-2"></div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="space-y-1.5">
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300" htmlFor="lider">
                                        Líder Responsable <span className="text-red-500">*</span>
                                    </label>
                                    <select 
                                        className={`block w-full px-3 rounded-lg border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:border-primary focus:ring-primary text-base py-3 transition-shadow ${isLiderRole ? 'disabled:bg-gray-100 dark:disabled:bg-gray-700 pointer-events-none appearance-none' : ''}`}
                                        id="lider" 
                                        name="lider" 
                                        required 
                                        value={formData.lider} 
                                        onChange={handleInputChange} 
                                        disabled={loading || isLiderRole || isLider}
                                    >
                                        <option value="" disabled>Asignar Automáticamente...</option>
                                        {lideres.map(l => (
                                            <option key={l.lider_id} value={l.lider_id}>{l.nombre_completo} (Meta: {l.meta_cantidad})</option>
                                        ))}
                                    </select>
                                    {isLiderRole && (
                                        <div className="mt-1 flex items-center gap-1.5 text-xs text-blue-600 dark:text-blue-400 font-medium">
                                            <span className="material-symbols-outlined text-sm">lock</span>
                                            Protegido por tu rol de Líder
                                        </div>
                                    )}
                                    {isLider && <p className="text-xs text-blue-600 mt-1">✓ Asignado automáticamente a tu perfil</p>}
                                </div>
                                <div className="space-y-1.5">
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300" htmlFor="fuente">
                                        Fuente de Captación <span className="text-red-500">*</span>
                                    </label>
                                    <select className="block w-full px-3 rounded-lg border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:border-primary focus:ring-primary text-base py-3 transition-shadow"
                                        id="fuente" name="fuente" required value={formData.fuente} onChange={handleInputChange} disabled={loading}>
                                        <option value="" disabled>Seleccione Fuente...</option>
                                        {fuentes.map(f => (
                                            <option key={f.fuente_id} value={f.fuente_id}>{f.nombre}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            <div className="space-y-1.5">
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300" htmlFor="notas">
                                    Notas Adicionales
                                </label>
                                <textarea className="block w-full rounded-lg border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:border-primary focus:ring-primary sm:text-sm transition-shadow p-3"
                                    id="notas" name="notas" placeholder="Detalles sobre la interacción, necesidades específicas, etc." rows={3}
                                    value={formData.notas} onChange={handleInputChange} />
                            </div>
                        </div>

                        <div className="px-6 py-4 bg-gray-50 dark:bg-gray-800/50 border-t border-border-light dark:border-border-dark flex flex-col-reverse sm:flex-row sm:justify-end gap-3">
                            <button onClick={handleClear} disabled={submitting} className="w-full sm:w-auto px-5 py-4 sm:py-2.5 border border-gray-300 dark:border-gray-600 rounded-xl shadow-sm text-base font-medium text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-200 dark:focus:ring-gray-700 transition-colors" type="button">
                                Limpiar
                            </button>
                            <button disabled={submitting || loading} className="w-full sm:w-auto px-6 py-4 sm:py-2.5 border border-transparent rounded-xl shadow-sm text-base font-semibold text-white bg-primary hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary transition-colors flex items-center justify-center gap-2 group disabled:opacity-75 disabled:cursor-wait" type="submit">
                                {submitting ? (
                                    <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" fill="none" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                        <path className="opacity-75" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" fill="currentColor"></path>
                                    </svg>
                                ) : (
                                    <span className="material-symbols-outlined text-xl group-hover:scale-110 transition-transform">save</span>
                                )}
                                <span>{submitting ? 'Guardando...' : 'Guardar'}</span>
                            </button>
                        </div>
                    </form>
                </div>

                {/* Sidebar Info Card */}
                <div className="lg:col-span-4 space-y-6">
                    <div className="bg-blue-50 dark:bg-blue-900/10 rounded-xl border border-blue-100 dark:border-blue-800 p-4 flex gap-4">
                        <span className="material-symbols-outlined text-primary mt-1">info</span>
                        <div>
                            <h4 className="text-sm font-bold text-primary mb-1">Verificación Electoral</h4>
                            <p className="text-xs text-gray-600 dark:text-gray-300 leading-relaxed">
                                Verifique la cédula en el padrón electoral antes de guardar si el votante dice estar inscrito.
                            </p>
                        </div>
                    </div>

                    <div className="bg-card-light dark:bg-card-dark rounded-xl shadow-soft border border-border-light dark:border-border-dark p-5 sticky top-6">
                        <div className="flex items-center justify-between mb-6 pb-4 border-b border-gray-100 dark:border-gray-700">
                            <h3 className="text-sm font-bold text-gray-900 dark:text-white uppercase tracking-wide">Último Registro</h3>
                            {ultimoRegistro && (
                                <span className="inline-flex items-center px-2 py-1 rounded text-xs font-semibold bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300">
                                    <span className="w-1.5 h-1.5 bg-green-500 rounded-full mr-1.5"></span>
                                    Exitoso
                                </span>
                            )}
                        </div>

                        {ultimoRegistro ? (
                            <>
                                <div className="flex items-center gap-4 mb-6">
                                    <div className="h-14 w-14 rounded-full bg-gradient-to-br from-purple-100 to-indigo-100 dark:from-purple-900/30 dark:to-indigo-900/30 flex items-center justify-center text-purple-600 dark:text-purple-300 font-bold text-xl shadow-inner border border-purple-200 dark:border-purple-800">
                                        {ultimoRegistro.nombres.charAt(0)}{ultimoRegistro.apellidos.charAt(0)}
                                    </div>
                                    <div className="flex-1">
                                        <p className="text-lg font-bold text-gray-900 dark:text-white leading-tight">{ultimoRegistro.nombres} {ultimoRegistro.apellidos}</p>
                                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 flex items-center gap-1">
                                            <span className="material-symbols-outlined text-[14px]">schedule</span>
                                            {new Date(ultimoRegistro.fecha_registro).toLocaleDateString()}
                                        </p>
                                    </div>
                                </div>

                                <div className="space-y-3">
                                    <div className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-800/50 rounded-lg border border-gray-100 dark:border-gray-700">
                                        <div className="p-2 bg-white dark:bg-gray-700 rounded-md shadow-sm">
                                            <span className="material-symbols-outlined text-gray-500 dark:text-gray-300 text-sm">call</span>
                                        </div>
                                        <div>
                                            <p className="text-[10px] uppercase text-gray-400 font-bold tracking-wider">Teléfono</p>
                                            <p className="text-sm font-semibold text-gray-800 dark:text-gray-200">{ultimoRegistro.telefono}</p>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-800/50 rounded-lg border border-gray-100 dark:border-gray-700">
                                        <div className="p-2 bg-white dark:bg-gray-700 rounded-md shadow-sm">
                                            <span className="material-symbols-outlined text-gray-500 dark:text-gray-300 text-sm">person_pin</span>
                                        </div>
                                        <div>
                                            <p className="text-[10px] uppercase text-gray-400 font-bold tracking-wider">Líder Asignado</p>
                                            <p className="text-sm font-semibold text-gray-800 dark:text-gray-200">{ultimoRegistro.lider_nombre || 'Sin líder asignado'}</p>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-800/50 rounded-lg border border-gray-100 dark:border-gray-700">
                                        <div className="p-2 bg-white dark:bg-gray-700 rounded-md shadow-sm">
                                            <span className="material-symbols-outlined text-gray-500 dark:text-gray-300 text-sm">location_on</span>
                                        </div>
                                        <div>
                                            <p className="text-[10px] uppercase text-gray-400 font-bold tracking-wider">Centro de Votación</p>
                                            <p className="text-sm font-semibold text-gray-800 dark:text-gray-200">{ultimoRegistro.sector_nombre || 'Sin definir'} {ultimoRegistro.mesa ? `| Mesa: ${ultimoRegistro.mesa}` : ''}</p>
                                        </div>
                                    </div>
                                </div>
                            </>
                        ) : (
                            <div className="py-8 text-center">
                                <span className="material-symbols-outlined text-4xl text-gray-300 dark:text-gray-600 mb-2">inbox</span>
                                <p className="text-sm text-gray-500 dark:text-gray-400">Aún no hay registros en el sistema.</p>
                            </div>
                        )}

                        <button onClick={() => window.location.hash = 'personas'} className="w-full mt-6 py-2.5 text-sm bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-200 font-medium rounded-lg shadow-sm transition-all flex items-center justify-center gap-2 group">
                            <span>Ver perfil completo</span>
                            <span className="material-symbols-outlined text-base group-hover:translate-x-1 transition-transform">arrow_forward</span>
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default RegistrarPersona;
