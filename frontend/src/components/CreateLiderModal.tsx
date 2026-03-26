import { useState, useEffect } from 'react';
import { IMaskInput } from 'react-imask';
import {
    getSectores,
    getEstadosLider,
    getNivelesLider,
    getLideres,
    createLiderFull,
    createLiderHierarchy,
    buscarPersonas,
    Sector,
    EstadoLider,
    NivelLider,
    Lider,
    PersonaBusqueda
} from '../api/apiService';

interface CreateLiderModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
    addToast: (message: string, type?: 'success' | 'error' | 'info') => void;
}

const CreateLiderModal = ({ isOpen, onClose, onSuccess, addToast }: CreateLiderModalProps) => {
    const [isSaving, setIsSaving] = useState(false);
    const [modo, setModo] = useState<'NUEVO' | 'EXISTENTE'>('NUEVO');

    // Auth context
    const userStr = localStorage.getItem('user');
    let currentUser: any = null;
    if (userStr) {
        try { currentUser = JSON.parse(userStr); } catch (e) { }
    }
    
    // Si el rol contiene 'ADMIN', lo tratamos como admin global (no restringido a jerarquía automática)
    const isAdmin = currentUser?.rol_nombre?.toUpperCase().includes('ADMIN');
    const isLiderOrCoordinador = !isAdmin && (currentUser?.rol_nombre === 'SUB_LIDER' || currentUser?.rol_nombre === 'COORDINADOR');
    const currentLiderId = currentUser?.lider_id;

    // Catalogs
    const [sectores, setSectores] = useState<Sector[]>([]);
    const [estadosLider, setEstadosLider] = useState<EstadoLider[]>([]);
    const [nivelesLider, setNivelesLider] = useState<NivelLider[]>([]);
    const [todoLideres, setTodoLideres] = useState<Lider[]>([]);

    // Search
    const [busquedaQuery, setBusquedaQuery] = useState('');
    const [busquedaResultados, setBusquedaResultados] = useState<PersonaBusqueda[]>([]);
    const [isBuscando, setIsBuscando] = useState(false);
    const [personaSeleccionada, setPersonaSeleccionada] = useState<PersonaBusqueda | null>(null);

    // Form
    const [form, setForm] = useState({
        persona: { nombres: '', apellidos: '', cedula: '', telefono: '', email: '', sector_id: '', mesa: '', notas: '' },
        lider: { meta_cantidad: 10, nivel_lider_id: '', estado_lider_id: '', lider_padre_id: '', codigo_lider: '' },
        usuario: { crear: false }
    });

    const [creacionResult, setCreacionResult] = useState<{ lider_id?: string } | null>(null);

    useEffect(() => {
        if (isOpen) {
            fetchCatalogs();
        } else {
            resetForm();
        }
    }, [isOpen]);

    const fetchCatalogs = async () => {
        try {
            const [s, e, n, all] = await Promise.all([getSectores(), getEstadosLider(), getNivelesLider(), getLideres()]);
            setSectores(s);
            setEstadosLider(e);
            setNivelesLider(n);
            setTodoLideres(all);
            // Set defaults únicamente si el usuario es Admin o elige manualmente
            const defaultNivel = n.find(nv => nv.nombre.toLowerCase() !== 'cabeza') || n[0];
            const activo = e.find(ev => ev.nombre.toLowerCase() === 'activo') || e[0];

            setForm(prev => ({
                ...prev,
                lider: {
                    ...prev.lider,
                    nivel_lider_id: isLiderOrCoordinador ? '' : (defaultNivel?.nivel_lider_id || ''),
                    estado_lider_id: activo?.estado_lider_id || '',
                    lider_padre_id: isLiderOrCoordinador && currentLiderId ? currentLiderId : prev.lider.lider_padre_id
                }
            }));
        } catch (err) {
            console.error('Error fetching catalogs:', err);
        }
    };

    const resetForm = () => {
        setModo('NUEVO');
        setBusquedaQuery('');
        setBusquedaResultados([]);
        setPersonaSeleccionada(null);
        setCreacionResult(null);
        setForm({
            persona: { nombres: '', apellidos: '', cedula: '', telefono: '', email: '', sector_id: '', mesa: '', notas: '' },
            lider: { meta_cantidad: 10, nivel_lider_id: nivelesLider[0]?.nivel_lider_id || '', estado_lider_id: estadosLider.find(e => e.nombre === 'Activo')?.estado_lider_id || '', lider_padre_id: '', codigo_lider: '' },
            usuario: { crear: false }
        });
    };

    // Debounced search
    useEffect(() => {
        if (modo !== 'EXISTENTE' || busquedaQuery.trim().length < 2) {
            setBusquedaResultados([]);
            return;
        }
        const timer = setTimeout(async () => {
            setIsBuscando(true);
            try {
                const res = await buscarPersonas(busquedaQuery);
                setBusquedaResultados(res);
            } catch { /* silencioso */ }
            finally { setIsBuscando(false); }
        }, 350);
        return () => clearTimeout(timer);
    }, [busquedaQuery, modo]);

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        
        // Bloquear números y caracteres especiales en nombres y apellidos en tiempo real
        if (name === 'nombres' || name === 'apellidos') {
            const cleanValue = value.replace(/[^a-zA-ZáéíóúÁÉÍÓÚñÑ\s'-]/g, '');
            setForm(prev => ({ ...prev, persona: { ...prev.persona, [name]: cleanValue } }));
        } else {
            // Check if it belongs to persona, lider or usuario
            if (['nombres', 'apellidos', 'cedula', 'telefono', 'email', 'sector_id', 'mesa', 'notas'].includes(name)) {
                setForm(prev => ({ ...prev, persona: { ...prev.persona, [name]: value } }));
            } else if (['meta_cantidad', 'nivel_lider_id', 'estado_lider_id', 'lider_padre_id', 'codigo_lider'].includes(name)) {
                setForm(prev => ({ ...prev, lider: { ...prev.lider, [name]: value } }));
            } else if (['crear'].includes(name)) {
                setForm(prev => ({ ...prev, usuario: { ...prev.usuario, [name]: value } }));
            }
        }
    };

    const handleSave = async () => {
        const { persona, lider, usuario } = form;

        // --- Validaciones de Campos Requeridos (Español) ---
        if (modo === 'EXISTENTE') {
            if (!personaSeleccionada) {
                addToast('Selecciona una persona existente.', 'error'); return;
            }
        } else {
            if (!persona.nombres.trim()) { addToast('El nombre es obligatorio.', 'error'); return; }
            if (!persona.apellidos.trim()) { addToast('El apellido es obligatorio.', 'error'); return; }
            if (!persona.cedula || persona.cedula.length < 11) { addToast('La cédula es obligatoria y debe estar completa.', 'error'); return; }
            if (!persona.telefono || persona.telefono.length < 10) { addToast('El teléfono es obligatorio.', 'error'); return; }
            if (!persona.sector_id) { addToast('Debe seleccionar un centro de votación.', 'error'); return; }
        }

        if (!isLiderOrCoordinador) {
            if (!lider.nivel_lider_id) { addToast('Debe seleccionar un nivel jerárquico.', 'error'); return; }
            if (!lider.estado_lider_id) { addToast('Debe seleccionar un estado para el líder.', 'error'); return; }
        }

        // Si crear=true, la cédula se usa automáticamente como login — sin validación de email

        // --- Validaciones de Formato (Nombres) ---
        const nameRegex = /^[a-zA-ZáéíóúÁÉÍÓÚñÑ\s'-]+$/;
        if (modo === 'NUEVO') {
            if (!nameRegex.test(persona.nombres.trim())) { addToast('El nombre solo permite letras y espacios.', 'error'); return; }
            if (!nameRegex.test(persona.apellidos.trim())) { addToast('El apellido solo permite letras y espacios.', 'error'); return; }
            if (persona.email && persona.email.trim() !== '') {
                const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
                if (!emailRegex.test(persona.email.trim())) {
                    addToast('El correo de contacto tiene un formato inválido.', 'error');
                    return;
                }
            }
        }

        setIsSaving(true);
        try {
            const payload: any = {
                modo: modo,
                lider: isLiderOrCoordinador ? undefined : {
                    meta_cantidad: lider.meta_cantidad,
                    nivel_lider_id: lider.nivel_lider_id,
                    estado_lider_id: lider.estado_lider_id,
                    lider_padre_id: lider.lider_padre_id || null,
                    codigo_lider: lider.codigo_lider || null,
                },
                // Campos para el endpoint de jerarquía
                lider_padre_id: isLiderOrCoordinador ? currentLiderId : undefined,
                meta_cantidad: isLiderOrCoordinador ? lider.meta_cantidad : undefined,
            };

            if (modo === 'EXISTENTE') {
                payload.persona_existente = { persona_id: personaSeleccionada!.persona_id };
            } else {
                payload.persona_nueva = {
                    nombres: persona.nombres,
                    apellidos: persona.apellidos,
                    cedula: persona.cedula || null,
                    telefono: persona.telefono,
                    email: persona.email || null,
                    sector_id: persona.sector_id,
                    mesa: persona.mesa || null,
                    notas: persona.notas || null,
                };
            }

            if (usuario.crear) {
                // La cédula de la persona se usará como login — backend la obtiene directamente
                // Contraseña inicial fija: Clave1234!
                payload.usuario = {
                    crear: true,
                    rol_nombre: 'Sub-Líder',
                    estado_usuario_nombre: 'Activo',
                };
            }

            const res = isLiderOrCoordinador 
                ? await createLiderHierarchy(payload)
                : await createLiderFull(payload);

            if (usuario.crear) {
                // Mostrar pantalla de confirmación con la clave fija
                setCreacionResult({ lider_id: res?.data?.lider_id });
            } else {
                addToast('Líder creado exitosamente.', 'success');
                onSuccess();
                onClose();
                window.location.hash = 'lideres';
            }
        } catch (err: any) {
            const code = err.response?.data?.code;
            const msg = err.response?.data?.message || 'Error al crear el líder.';
            if (code === 'ALREADY_LIDER') addToast('Esta persona ya es líder.', 'error');
            else addToast(msg, 'error');
        } finally {
            setIsSaving(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className={`fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm transition-all duration-300 ${isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
            
            {/* Loader Overlay (Copiado de RegistrarPersona) */}
            {isSaving && (
                <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-900/40 backdrop-blur-sm animate-fade-in text-center">
                    <div className="bg-white dark:bg-slate-800 p-8 rounded-3xl shadow-2xl flex flex-col items-center gap-4 border border-white/20 dark:border-slate-700/50">
                        <div className="relative">
                            <div className="w-16 h-16 border-4 border-blue-600/20 border-t-blue-600 rounded-full animate-spin"></div>
                            <div className="absolute inset-0 flex items-center justify-center">
                                <span className="material-symbols-outlined text-blue-600 animate-pulse">person_add</span>
                            </div>
                        </div>
                        <div>
                            <h3 className="text-lg font-bold text-slate-900 dark:text-white">Procesando Líder</h3>
                            <p className="text-sm text-slate-500 dark:text-slate-400">Creando el nuevo perfil en la estructura...</p>
                        </div>
                    </div>
                </div>
            )}
            <div className="bg-white dark:bg-card-dark rounded-xl shadow-xl w-full max-w-2xl overflow-hidden animate-fade-in flex flex-col max-h-[90vh]">

                {/* Header */}
                <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-800 flex justify-between items-center bg-white dark:bg-card-dark sticky top-0 z-10">
                    <h3 className="font-bold text-gray-900 dark:text-white flex items-center gap-2 font-display">
                        <span className="material-symbols-outlined text-primary">person_add</span>
                        {modo === 'NUEVO' ? 'Crear Nuevo Líder' : 'Convertir Persona en Líder'}
                    </h3>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors">
                        <span className="material-symbols-outlined">close</span>
                    </button>
                </div>

                {creacionResult ? (
                    <div className="p-8 flex flex-col items-center gap-5 text-center font-display">
                        <div className="w-16 h-16 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                            <span className="material-symbols-outlined text-4xl text-green-600">check_circle</span>
                        </div>
                        <div>
                            <p className="font-bold text-gray-900 dark:text-white text-lg">¡Líder creado exitosamente!</p>
                            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">El líder ya puede iniciar sesión con su cédula.</p>
                        </div>
                        <div className="w-full bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-xl p-4">
                            <p className="text-xs font-semibold text-yellow-700 dark:text-yellow-400 uppercase tracking-wider mb-2">Contraseña Inicial</p>
                            <div className="flex items-center gap-3 justify-center">
                                <code className="text-xl font-mono font-bold text-yellow-900 dark:text-yellow-200 bg-yellow-100 dark:bg-yellow-900/40 px-4 py-2 rounded-lg tracking-widest">
                                    Clave1234!
                                </code>
                                <button
                                    onClick={() => { navigator.clipboard.writeText('Clave1234!'); addToast('Contraseña copiada', 'success'); }}
                                    className="p-2 rounded-lg bg-yellow-100 dark:bg-yellow-900/30 hover:bg-yellow-200 text-yellow-700 dark:text-yellow-400 transition-colors"
                                    title="Copiar"
                                >
                                    <span className="material-symbols-outlined text-lg">content_copy</span>
                                </button>
                            </div>
                            <p className="text-xs text-yellow-600 dark:text-yellow-500 mt-2 text-center">Login: cédula de la persona · Contraseña: Clave1234!</p>
                        </div>
                        <button
                            onClick={() => {
                                onSuccess();
                                onClose();
                                if (isLiderOrCoordinador) {
                                    window.location.hash = 'dashboard';
                                }
                            }}
                            className="px-6 py-2 bg-primary text-white rounded-lg font-medium hover:bg-blue-700 transition-colors"
                        >
                            Aceptar y cerrar
                        </button>
                    </div>
                ) : (
                    <>
                        <div className="overflow-y-auto flex-1 font-display">
                            <div className="px-6 pt-5 pb-4 border-b border-gray-100 dark:border-gray-800">
                                <div className="flex rounded-xl bg-gray-100 dark:bg-gray-800 p-1 gap-1">
                                    <button
                                        onClick={() => { setModo('NUEVO'); setPersonaSeleccionada(null); setBusquedaQuery(''); }}
                                        className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-sm font-semibold transition-all ${modo === 'NUEVO'
                                            ? 'bg-white dark:bg-gray-700 text-primary shadow-sm'
                                            : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
                                            }`}
                                    >
                                        <span className="material-symbols-outlined text-lg">person_add</span>
                                        Crear Persona Nueva
                                    </button>
                                    <button
                                        onClick={() => { setModo('EXISTENTE'); }}
                                        className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-sm font-semibold transition-all ${modo === 'EXISTENTE'
                                            ? 'bg-white dark:bg-gray-700 text-primary shadow-sm'
                                            : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
                                            }`}
                                    >
                                        <span className="material-symbols-outlined text-lg">manage_search</span>
                                        Convertir Existente
                                    </button>
                                </div>
                            </div>

                            <div className="p-6 space-y-8">
                                {/* SECCIÓN A — Persona */}
                                <section>
                                    <div className="flex items-center gap-2 mb-4">
                                        <div className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center text-blue-600 dark:text-blue-400 font-bold text-xs">1</div>
                                        <h4 className="font-bold text-gray-900 dark:text-white">
                                            {modo === 'NUEVO' ? 'Datos de Persona' : 'Buscar Persona'}
                                        </h4>
                                    </div>

                                    {modo === 'EXISTENTE' ? (
                                        <div className="space-y-3">
                                            <div className="relative">
                                                <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-xl">search</span>
                                                <input
                                                    type="text"
                                                    placeholder="Buscar por nombre, teléfono o cédula..."
                                                    className="w-full pl-10 pr-4 rounded-lg border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-primary focus:border-primary px-3 py-2 text-sm h-10"
                                                    value={busquedaQuery}
                                                    onChange={e => { setBusquedaQuery(e.target.value); setPersonaSeleccionada(null); }}
                                                    autoFocus
                                                />
                                                {isBuscando && (
                                                    <span className="material-symbols-outlined animate-spin absolute right-3 top-1/2 -translate-y-1/2 text-primary text-xl">progress_activity</span>
                                                )}
                                            </div>

                                            {personaSeleccionada && (
                                                <div className="flex items-center gap-3 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl">
                                                    <div className="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900/40 flex items-center justify-center font-bold text-blue-600 dark:text-blue-300 text-sm flex-shrink-0">
                                                        {personaSeleccionada.nombre_completo.split(' ').map(n => n[0]).slice(0, 2).join('')}
                                                    </div>
                                                    <div className="flex-1 min-w-0">
                                                        <p className="font-semibold text-gray-900 dark:text-white text-sm truncate">{personaSeleccionada.nombre_completo}</p>
                                                        <p className="text-xs text-gray-500 dark:text-gray-400">{personaSeleccionada.telefono} · {personaSeleccionada.sector_nombre}</p>
                                                    </div>
                                                    <button onClick={() => { setPersonaSeleccionada(null); setBusquedaQuery(''); }} className="text-gray-400 hover:text-red-500 transition-colors flex-shrink-0">
                                                        <span className="material-symbols-outlined text-xl">close</span>
                                                    </button>
                                                </div>
                                            )}

                                            {!personaSeleccionada && busquedaResultados.length > 0 && (
                                                <div className="border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden divide-y divide-gray-100 dark:divide-gray-700 max-h-60 overflow-y-auto shadow-inner">
                                                    {busquedaResultados.map(p => (
                                                        <button
                                                            key={p.persona_id}
                                                            disabled={p.is_lider}
                                                            onClick={() => { setPersonaSeleccionada(p); setBusquedaResultados([]); }}
                                                            className={`w-full flex items-center gap-3 px-4 py-3 text-left transition-colors ${p.is_lider
                                                                ? 'opacity-50 cursor-not-allowed bg-gray-50 dark:bg-gray-800'
                                                                : 'hover:bg-blue-50 dark:hover:bg-blue-900/20 cursor-pointer'
                                                                }`}
                                                        >
                                                            <div className="w-8 h-8 rounded-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center font-bold text-gray-600 dark:text-gray-300 text-xs flex-shrink-0">
                                                                {p.nombre_completo.split(' ').map(n => n[0]).slice(0, 2).join('')}
                                                            </div>
                                                            <div className="flex-1 min-w-0">
                                                                <p className="font-medium text-gray-900 dark:text-white text-sm truncate">{p.nombre_completo}</p>
                                                                <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{p.telefono}{p.cedula ? ` · ${p.cedula}` : ''} · {p.sector_nombre}</p>
                                                            </div>
                                                            {p.is_lider ? (
                                                                <span className="text-xs font-semibold text-amber-600 bg-amber-50 dark:bg-amber-900/20 px-2 py-0.5 rounded-full border border-amber-200 flex-shrink-0">Ya es líder</span>
                                                            ) : (
                                                                <span className="material-symbols-outlined text-gray-400 text-xl flex-shrink-0">chevron_right</span>
                                                            )}
                                                        </button>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    ) : (
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            <div>
                                                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Nombres *</label>
                                                <input type="text" 
                                                    name="nombres"
                                                    className="w-full rounded-lg border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-primary focus:border-primary px-3 py-2 text-sm transition-shadow"
                                                    value={form.persona.nombres}
                                                    onChange={handleInputChange} />
                                            </div>
                                            <div>
                                                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Apellidos *</label>
                                                <input type="text" 
                                                    name="apellidos"
                                                    className="w-full rounded-lg border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-primary focus:border-primary px-3 py-2 text-sm transition-shadow"
                                                    value={form.persona.apellidos}
                                                    onChange={handleInputChange} />
                                            </div>
                                            <div>
                                                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Cédula *</label>
                                                <IMaskInput
                                                    mask="000-0000000-0"
                                                    unmask={true}
                                                    onAccept={(value: string) => setForm(p => ({ ...p, persona: { ...p.persona, cedula: value } }))}
                                                    className="w-full rounded-lg border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-primary focus:border-primary px-3 py-2 text-sm transition-shadow"
                                                    placeholder="000-0000000-0"
                                                    value={form.persona.cedula}
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Teléfono *</label>
                                                <IMaskInput
                                                    mask="000-000-0000"
                                                    unmask={true}
                                                    onAccept={(value: string) => setForm(p => ({ ...p, persona: { ...p.persona, telefono: value } }))}
                                                    className="w-full rounded-lg border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-primary focus:border-primary px-3 py-2 text-sm transition-shadow"
                                                    placeholder="000-000-0000"
                                                    value={form.persona.telefono}
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Centro de Votación *</label>
                                                <select 
                                                    name="sector_id"
                                                    className="w-full rounded-lg border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-primary focus:border-primary px-3 py-2 text-sm transition-shadow"
                                                    value={form.persona.sector_id}
                                                    onChange={handleInputChange}>
                                                    <option value="">Seleccionar Centro de Votación</option>
                                                    {sectores.map(s => <option key={s.sector_id} value={s.sector_id}>{s.nombre}</option>)}
                                                </select>
                                            </div>
                                            <div>
                                                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Mesa</label>
                                                <input type="text" 
                                                    name="mesa"
                                                    className="w-full rounded-lg border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-primary focus:border-primary px-3 py-2 text-sm transition-shadow"
                                                    value={form.persona.mesa || ''}
                                                    onChange={handleInputChange} />
                                            </div>
                                        </div>
                                    )}
                                </section>

                                {/* SECCIÓN B — Líder */}
                                <section>
                                    <div className="flex items-center gap-2 mb-4">
                                        <div className="w-8 h-8 rounded-full bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center text-purple-600 dark:text-purple-400 font-bold text-xs">2</div>
                                        <h4 className="font-bold text-gray-900 dark:text-white">Datos de Líder</h4>
                                    </div>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Meta de Registros *</label>
                                            <input type="number" min="1" className="w-full rounded-lg border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-primary focus:border-primary px-3 py-2 text-sm transition-shadow"
                                                value={form.lider.meta_cantidad}
                                                onChange={e => setForm(p => ({ ...p, lider: { ...p.lider, meta_cantidad: parseInt(e.target.value) || 0 } }))} />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Nivel *</label>
                                            {isLiderOrCoordinador ? (
                                                <div className="w-full bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-600 dark:text-slate-300 flex items-center gap-2">
                                                    <span className="material-symbols-outlined text-sm text-blue-500">check_circle</span>
                                                    <span>Sub-Líder <span className="text-slate-400">(asignado automáticamente)</span></span>
                                                </div>
                                            ) : (
                                                <select className="w-full rounded-lg border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-primary focus:border-primary px-3 py-2 text-sm transition-shadow"
                                                    value={form.lider.nivel_lider_id}
                                                    onChange={e => setForm(p => ({ ...p, lider: { ...p.lider, nivel_lider_id: e.target.value } }))}>
                                                    {nivelesLider.filter(n => n.nombre.toLowerCase() !== 'cabeza').map(n => <option key={n.nivel_lider_id} value={n.nivel_lider_id}>{n.nombre}</option>)}
                                                </select>
                                            )}
                                        </div>
                                        {!isLiderOrCoordinador && (
                                            <div>
                                                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Líder Superior</label>
                                                <select className="w-full rounded-lg border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-primary focus:border-primary px-3 py-2 text-sm transition-shadow"
                                                    value={form.lider.lider_padre_id}
                                                    onChange={e => setForm(p => ({ ...p, lider: { ...p.lider, lider_padre_id: e.target.value } }))}>
                                                    <option value="">Sin Líder Superior</option>
                                                    {todoLideres.map(l => <option key={l.lider_id} value={l.lider_id}>{l.nombre_completo}</option>)}
                                                </select>
                                            </div>
                                        )}
                                        <div>
                                            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Estado *</label>
                                            <select className="w-full rounded-lg border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-primary focus:border-primary px-3 py-2 text-sm"
                                                value={form.lider.estado_lider_id}
                                                onChange={e => setForm(p => ({ ...p, lider: { ...p.lider, estado_lider_id: e.target.value } }))}>
                                                {estadosLider.map(e => <option key={e.estado_lider_id} value={e.estado_lider_id}>{e.nombre}</option>)}
                                            </select>
                                        </div>
                                    </div>
                                </section>

                                {/* SECCIÓN C — Acceso al Sistema */}
                                <section className="bg-slate-50 dark:bg-slate-800/30 -mx-6 px-6 py-6 border-y border-slate-100 dark:border-slate-800">
                                    <div className="flex items-center justify-between mb-4">
                                        <div className="flex items-center gap-2">
                                            <div className="w-8 h-8 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center text-emerald-600 dark:text-emerald-400 font-bold text-xs">3</div>
                                            <h4 className="font-bold text-gray-900 dark:text-white">Acceso al Sistema</h4>
                                        </div>
                                        <label className="relative inline-flex items-center cursor-pointer">
                                            <input type="checkbox" className="sr-only peer" checked={form.usuario.crear}
                                                onChange={e => setForm(p => ({ ...p, usuario: { ...p.usuario, crear: e.target.checked } }))} />
                                            <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-slate-600 peer-checked:bg-blue-600 shadow-inner"></div>
                                            <span className="ml-3 text-sm font-medium text-slate-700 dark:text-slate-300">Crear cuenta</span>
                                        </label>
                                    </div>

                                    {form.usuario.crear && (
                                        <div className="mt-3 flex items-start gap-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl p-4 animate-slide-down">
                                            <span className="material-symbols-outlined text-blue-500 text-xl shrink-0 mt-0.5">info</span>
                                            <div className="text-sm text-blue-800 dark:text-blue-200">
                                                <p className="font-semibold">Acceso automático por cédula</p>
                                                <p className="mt-0.5 text-blue-600 dark:text-blue-300">El líder podrá iniciar sesión con su <strong>cédula</strong> y la contraseña inicial <code className="font-mono bg-blue-100 dark:bg-blue-900/40 px-1.5 py-0.5 rounded">Clave1234!</code></p>
                                            </div>
                                        </div>
                                    )}
                                </section>
                            </div>
                        </div>

                        <div className="px-6 py-4 bg-white dark:bg-card-dark border-t border-gray-100 dark:border-gray-800 flex justify-end gap-3 sticky bottom-0 z-10 font-display">
                            <button onClick={onClose}
                                className="px-4 py-2 text-sm font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors">
                                Cancelar
                            </button>
                            <button onClick={handleSave} disabled={isSaving}
                                className="px-6 py-2 text-sm font-bold text-white bg-primary hover:bg-blue-700 rounded-lg shadow-md hover:shadow-lg disabled:opacity-50 transition-all flex items-center gap-2 active:scale-95">
                                {isSaving ? (
                                    <><span className="material-symbols-outlined animate-spin text-sm">progress_activity</span><span>Guardando...</span></>
                                ) : (
                                    <span>{modo === 'NUEVO' ? 'Crear Líder' : 'Convertir en Líder'}</span>
                                )}
                            </button>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
};

export default CreateLiderModal;
