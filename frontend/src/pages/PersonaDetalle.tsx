import { useState, useEffect } from 'react';
import axios from 'axios';
import { getPersonaDetalle, PersonaDetalle as IPersonaDetalle } from '../api/apiService';

const API = 'http://localhost:3001/api';

const Spinner = () => (
    <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
    </svg>
);

interface PersonaDetalleProps {
    id: string;
    onBack: () => void;
}

const PersonaDetalle = ({ id, onBack }: PersonaDetalleProps) => {
    const [data, setData] = useState<IPersonaDetalle | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [isConversionModalOpen, setIsConversionModalOpen] = useState(false);
    const [convertForm, setConvertForm] = useState({ meta_cantidad: 10, sector_id: '', nivel_lider_id: '', lider_padre_id: '' });
    const [sectores, setSectores] = useState<any[]>([]);
    const [niveles, setNiveles] = useState<any[]>([]);
    const [lideresDisp, setLideresDisp] = useState<any[]>([]);
    const [convertLoading, setConvertLoading] = useState(false);
    const [convertError, setConvertError] = useState('');
    const [convertSuccess, setConvertSuccess] = useState('');

    useEffect(() => {
        const fetchDetalle = async () => {
            setLoading(true);
            setError(null);
            try {
                const res = await getPersonaDetalle(id);
                setData(res);
            } catch (err) {
                console.error("Error fetching persona data", err);
                setError("No se pudo cargar el perfil de la persona.");
            } finally {
                setLoading(false);
            }
        };
        fetchDetalle();
    }, [id]);

    useEffect(() => {
        if (!isConversionModalOpen) return;
        Promise.all([
            axios.get(`${API}/sectores`),
            axios.get(`${API}/nivel-lider`),
            axios.get(`${API}/lideres-resumen`),
        ]).then(([s, n, l]) => {
            setSectores(s.data.data || []);
            setNiveles(n.data.data || []);
            setLideresDisp(l.data.data || []);
        }).catch(console.error);
    }, [isConversionModalOpen]);

    const handleConvertirLider = async () => {
        if (!convertForm.sector_id) { setConvertError('Selecciona un sector'); return; }
        setConvertLoading(true); setConvertError('');
        try {
            const res = await axios.post(`${API}/personas/${data?.persona.persona_id}/convertir-lider`, convertForm);
            if (res.data.ok) {
                setConvertSuccess(res.data.message || 'Persona convertida en líder');
                setTimeout(() => {
                    setIsConversionModalOpen(false);
                    setConvertSuccess('');
                    setConvertForm({ meta_cantidad: 10, sector_id: '', nivel_lider_id: '', lider_padre_id: '' });
                    // Recargar datos
                    getPersonaDetalle(id).then(setData).catch(console.error);
                }, 1800);
            }
        } catch (err: any) {
            setConvertError(err.response?.data?.message || 'Error al convertir');
        } finally { setConvertLoading(false); }
    };

    const getInitials = (nombre?: string) => {
        if (!nombre) return 'NA';
        const parts = nombre.trim().split(' ');
        if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
        return nombre.substring(0, 2).toUpperCase();
    };

    if (loading && !data) {
        return (
            <div className="flex-1 flex justify-center items-center h-full">
                <svg className="animate-spin h-8 w-8 text-primary" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
            </div>
        );
    }

    if (error || !data) {
        return (
            <div className="flex-1 p-8 text-center">
                <p className="text-red-500 mb-4">{error || "Persona no encontrada"}</p>
                <button onClick={onBack} className="text-primary hover:underline">Volver</button>
            </div>
        );
    }

    const { persona, asignacion_activa } = data;
    const nombreCompleto = `${persona.nombres} ${persona.apellidos}`.trim();

    return (
        <div className="flex-1 flex flex-col h-full overflow-y-auto bg-background-light dark:bg-background-dark text-slate-900 dark:text-slate-100 font-display">
            {/* Header */}
            <header className="sticky top-0 z-20 bg-white/90 dark:bg-[#15202e]/90 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 px-4 py-3 md:py-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <button onClick={onBack} className="flex items-center justify-center p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors text-slate-600 dark:text-slate-300">
                        <span className="material-symbols-outlined">arrow_back</span>
                    </button>
                    <h1 className="text-base md:text-xl font-bold text-center md:text-left truncate">Perfil de Persona</h1>
                </div>
                <div className="flex items-center gap-2">
                    {!persona.is_lider && (
                        <button onClick={() => setIsConversionModalOpen(true)} className="hidden md:flex items-center gap-2 bg-primary hover:bg-primary-hover text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors shadow-sm">
                            <span className="material-symbols-outlined text-[18px]">stars</span>
                            <span>Convertir en Líder</span>
                        </button>
                    )}
                    <button className="flex items-center justify-center p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors text-primary font-medium">
                        <span className="material-symbols-outlined">edit</span>
                    </button>
                </div>
            </header>

            <main className="flex-1 p-4 md:p-6 lg:p-8 w-full max-w-7xl mx-auto">
                <div className="flex flex-col md:flex-row gap-6 md:gap-8 items-start">
                    {/* Sidebar Card */}
                    <div className="w-full md:w-80 lg:w-96 flex-shrink-0">
                        <div className="bg-white dark:bg-[#15202e] relative pb-6 pt-6 px-6 flex flex-col items-center border-b md:border border-slate-100 dark:border-slate-800 md:rounded-xl shadow-sm md:sticky md:top-6">
                            <div className="relative group cursor-pointer mb-4">
                                <div className="w-24 h-24 md:w-32 md:h-32 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center text-4xl text-slate-500 font-bold overflow-hidden ring-4 ring-white dark:ring-[#15202e] shadow-lg">
                                    {getInitials(nombreCompleto)}
                                </div>
                                {persona.estado_nombre?.toLowerCase() === 'verificado' && (
                                    <div className="absolute bottom-1 right-1 bg-green-500 border-2 border-white dark:border-[#15202e] w-7 h-7 rounded-full flex items-center justify-center">
                                        <span className="material-symbols-outlined text-white text-[16px] font-bold">check</span>
                                    </div>
                                )}
                            </div>
                            <h2 className="text-xl md:text-2xl font-bold text-slate-900 dark:text-white mb-1 text-center">{nombreCompleto}</h2>
                            <div className="flex flex-col items-center gap-2 mb-6 w-full">
                                <div className="flex items-center gap-2">
                                    <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${persona.is_lider ? 'bg-purple-100 text-purple-800' : 'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300'}`}>
                                        {persona.is_lider ? 'Líder' : 'Simpatizante Activo'}
                                    </span>
                                </div>
                                <span className="text-xs text-slate-500 dark:text-slate-400">Registrada el {new Date(persona.fecha_registro).toLocaleDateString()}</span>
                            </div>

                            <div className="w-full space-y-3 pt-4 border-t border-slate-100 dark:border-slate-800">
                                <div className="grid grid-cols-2 gap-4 text-center">
                                    <div className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-lg">
                                        <span className="block text-xl font-bold text-slate-900 dark:text-white">0</span>
                                        <span className="text-xs text-slate-500">Eventos</span>
                                    </div>
                                    <div className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-lg">
                                        <span className="block text-xl font-bold text-slate-900 dark:text-white">-</span>
                                        <span className="text-xs text-slate-500">Asistencia</span>
                                    </div>
                                </div>
                            </div>

                            <div className="hidden md:block w-full mt-6 space-y-2">
                                <button className="w-full flex items-center justify-start gap-3 px-4 py-3 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors text-sm font-medium">
                                    <span className="material-symbols-outlined text-slate-400">history</span>
                                    Ver Historial de Cambios
                                </button>
                                <button className="w-full flex items-center justify-start gap-3 px-4 py-3 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors text-sm font-medium">
                                    <span className="material-symbols-outlined text-slate-400">share</span>
                                    Compartir Perfil
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Main Content Info */}
                    <div className="flex-1 w-full pb-24 md:pb-0 space-y-6">
                        <section className="space-y-3">
                            <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100 uppercase tracking-wider pl-1 flex items-center gap-2">
                                <span className="material-symbols-outlined text-[18px] text-slate-400">badge</span>
                                Información Personal
                            </h3>
                            <div className="bg-white dark:bg-[#15202e] rounded-xl shadow-sm border border-slate-100 dark:border-slate-800 overflow-hidden">
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2">
                                    <div className="flex items-center p-4 md:p-5 border-b md:border-b-0 md:border-r border-slate-100 dark:border-slate-800/50 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                                        <div className="flex-shrink-0 w-10 h-10 rounded-full bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center text-primary">
                                            <span className="material-symbols-outlined">fingerprint</span>
                                        </div>
                                        <div className="ml-4 flex-1">
                                            <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">Cédula</p>
                                            <p className="text-sm font-medium text-slate-900 dark:text-white">{persona.cedula || 'N/A'}</p>
                                        </div>
                                    </div>
                                    <a href={`tel:${persona.telefono}`} className="flex items-center p-4 md:p-5 border-b md:border-b-0 border-slate-100 dark:border-slate-800/50 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors group">
                                        <div className="flex-shrink-0 w-10 h-10 rounded-full bg-green-50 dark:bg-green-900/20 flex items-center justify-center text-green-600 dark:text-green-400 group-hover:bg-green-100 transition-colors">
                                            <span className="material-symbols-outlined">call</span>
                                        </div>
                                        <div className="ml-4 flex-1">
                                            <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">Teléfono</p>
                                            <p className="text-sm font-medium text-slate-900 dark:text-white group-hover:text-primary transition-colors">{persona.telefono}</p>
                                        </div>
                                        <span className="material-symbols-outlined text-slate-300 dark:text-slate-600 opacity-0 group-hover:opacity-100 transition-opacity">open_in_new</span>
                                    </a>
                                    <a href={`mailto:${persona.email_contacto || ''}`} className="flex items-center p-4 md:p-5 border-b md:border-t md:border-r border-slate-100 dark:border-slate-800/50 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors group">
                                        <div className="flex-shrink-0 w-10 h-10 rounded-full bg-purple-50 dark:bg-purple-900/20 flex items-center justify-center text-purple-600 dark:text-purple-400 group-hover:bg-purple-100 transition-colors">
                                            <span className="material-symbols-outlined">mail</span>
                                        </div>
                                        <div className="ml-4 flex-1 min-w-0">
                                            <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">Email</p>
                                            <p className="text-sm font-medium text-slate-900 dark:text-white truncate">{persona.email_contacto || 'No registrado'}</p>
                                        </div>
                                    </a>
                                    <div className="flex items-center p-4 md:p-5 md:border-t hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                                        <div className="flex-shrink-0 w-10 h-10 rounded-full bg-orange-50 dark:bg-orange-900/20 flex items-center justify-center text-orange-600 dark:text-orange-400">
                                            <span className="material-symbols-outlined">location_on</span>
                                        </div>
                                        <div className="ml-4 flex-1">
                                            <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">Centro de Votación</p>
                                            <p className="text-sm font-medium text-slate-900 dark:text-white">{persona.sector_nombre || 'N/A'}</p>
                                            {persona.mesa && <p className="text-xs font-semibold text-slate-600 dark:text-slate-300">Mesa: {persona.mesa}</p>}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </section>

                        <section className="space-y-3">
                            <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100 uppercase tracking-wider pl-1 flex items-center gap-2">
                                <span className="material-symbols-outlined text-[18px] text-slate-400">assignment_ind</span>
                                Asignación Actual
                            </h3>
                            <div className="bg-white dark:bg-[#15202e] rounded-xl shadow-sm border border-slate-100 dark:border-slate-800 p-4 md:p-6 space-y-6">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div>
                                        <p className="text-xs text-slate-500 dark:text-slate-400 font-medium mb-2 uppercase tracking-wide">Referido por</p>
                                        <div className="flex items-center gap-3 p-3 rounded-lg border border-slate-100 dark:border-slate-700/50 bg-slate-50 dark:bg-slate-800/30">
                                            <div className="w-10 h-10 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center text-slate-500 font-bold overflow-hidden flex-shrink-0">
                                                {getInitials(asignacion_activa?.lider_nombre || 'N/A')}
                                            </div>
                                            <div>
                                                <p className="text-sm font-bold text-slate-900 dark:text-white cursor-pointer hover:underline">{asignacion_activa?.lider_nombre || 'Sin Líder'}</p>
                                                <p className="text-xs text-slate-500">Líder Activo</p>
                                            </div>
                                        </div>
                                    </div>
                                    <div>
                                        <p className="text-xs text-slate-500 dark:text-slate-400 font-medium mb-2 uppercase tracking-wide">Fuente de Captación</p>
                                        <div className="flex items-center gap-3 p-3 rounded-lg border border-slate-100 dark:border-slate-700/50 bg-slate-50 dark:bg-slate-800/30 h-[66px]">
                                            <div className="w-10 h-10 rounded-full bg-indigo-50 dark:bg-indigo-900/20 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
                                                <span className="material-symbols-outlined">door_front</span>
                                            </div>
                                            <div>
                                                <p className="text-sm font-bold text-slate-900 dark:text-white">{persona.fuente_nombre || 'Desconocida'}</p>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                                {persona.notas && (
                                    <div className="pt-2 md:pt-4 border-t border-slate-100 dark:border-slate-800">
                                        <p className="text-xs text-slate-500 dark:text-slate-400 font-medium mb-2 uppercase tracking-wide">Notas Internas</p>
                                        <div className="bg-yellow-50 dark:bg-yellow-900/10 p-4 rounded-lg border border-yellow-100 dark:border-yellow-900/30 relative">
                                            <span className="material-symbols-outlined absolute top-4 left-4 text-yellow-500/50 text-2xl">format_quote</span>
                                            <p className="text-sm text-slate-700 dark:text-slate-300 italic leading-relaxed pl-8">
                                                "{persona.notas}"
                                            </p>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </section>
                    </div>
                </div>
            </main>

            {/* Mobile Bottom Bar */}
            {!persona.is_lider && (
                <div className="md:hidden fixed bottom-0 left-0 right-0 p-4 bg-white/80 dark:bg-background-dark/80 backdrop-blur-md border-t border-slate-200 dark:border-slate-800 z-10 safe-area-bottom">
                    <div className="max-w-lg mx-auto">
                        <button onClick={() => setIsConversionModalOpen(true)} className="w-full flex items-center justify-center gap-2 bg-primary hover:bg-primary-hover active:scale-[0.98] transition-all text-white font-bold py-3.5 px-6 rounded-xl shadow-lg shadow-primary/25">
                            <span className="material-symbols-outlined">stars</span>
                            <span>Convertir en Líder</span>
                        </button>
                    </div>
                </div>
            )}

            {/* Conversion Modal */}
            {isConversionModalOpen && (
                <div className="fixed inset-0 z-50 overflow-y-auto" role="dialog">
                    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => !convertLoading && setIsConversionModalOpen(false)} />
                    <div className="flex min-h-full items-end justify-center sm:items-center p-4">
                        <div className="relative bg-white dark:bg-[#15202e] rounded-t-2xl sm:rounded-2xl shadow-2xl w-full sm:max-w-lg border border-slate-200 dark:border-slate-700">
                            {/* Header */}
                            <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <span className="material-symbols-outlined text-primary text-2xl">social_leaderboard</span>
                                    <div>
                                        <h3 className="text-lg font-bold text-slate-900 dark:text-white">Convertir en Líder</h3>
                                        <p className="text-xs text-slate-400">{data?.persona.nombres} {data?.persona.apellidos}</p>
                                    </div>
                                </div>
                                <button onClick={() => setIsConversionModalOpen(false)} disabled={convertLoading}
                                    className="text-slate-400 hover:text-slate-600 p-1 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800">
                                    <span className="material-symbols-outlined">close</span>
                                </button>
                            </div>

                            <div className="px-6 py-5 space-y-4">
                                {convertError && (
                                    <div className="text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 px-4 py-3 rounded-lg border border-red-200 dark:border-red-800">
                                        {convertError}
                                    </div>
                                )}
                                {convertSuccess && (
                                    <div className="text-sm text-green-700 dark:text-green-300 bg-green-50 dark:bg-green-900/20 px-4 py-3 rounded-lg border border-green-200 dark:border-green-800 flex items-center gap-2">
                                        <span className="material-symbols-outlined text-base">check_circle</span>{convertSuccess}
                                    </div>
                                )}

                                <div>
                                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">Sector <span className="text-red-500">*</span></label>
                                    <select value={convertForm.sector_id} onChange={e => setConvertForm(f => ({ ...f, sector_id: e.target.value }))}
                                        className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:border-primary outline-none">
                                        <option value="">Seleccionar sector...</option>
                                        {sectores.map(s => <option key={s.sector_id} value={s.sector_id}>{s.nombre}</option>)}
                                    </select>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">Meta de personas</label>
                                    <input type="number" min="1" value={convertForm.meta_cantidad}
                                        onChange={e => setConvertForm(f => ({ ...f, meta_cantidad: parseInt(e.target.value) || 10 }))}
                                        className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:border-primary outline-none" />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">Nivel de Líder</label>
                                    <select value={convertForm.nivel_lider_id} onChange={e => setConvertForm(f => ({ ...f, nivel_lider_id: e.target.value }))}
                                        className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:border-primary outline-none">
                                        <option value="">Seleccionar nivel...</option>
                                        {niveles.filter(n => n.nombre?.toLowerCase() !== 'cabeza').map(n => <option key={n.nivel_lider_id} value={n.nivel_lider_id}>{n.nombre}</option>)}
                                    </select>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">Líder Superior (opcional)</label>
                                    <select value={convertForm.lider_padre_id} onChange={e => setConvertForm(f => ({ ...f, lider_padre_id: e.target.value }))}
                                        className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:border-primary outline-none">
                                        <option value="">Sin líder superior</option>
                                        {lideresDisp.map(l => <option key={l.lider_id} value={l.lider_id}>{l.nombre_completo}</option>)}
                                    </select>
                                </div>
                            </div>

                            <div className="px-6 py-4 border-t border-slate-100 dark:border-slate-800 flex gap-3">
                                <button onClick={() => setIsConversionModalOpen(false)} disabled={convertLoading}
                                    className="flex-1 py-2.5 rounded-lg border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 text-sm hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">
                                    Cancelar
                                </button>
                                <button onClick={handleConvertirLider} disabled={convertLoading || !convertForm.sector_id}
                                    className="flex-1 py-2.5 rounded-lg bg-primary hover:bg-blue-700 text-white text-sm font-medium disabled:opacity-50 transition-colors flex items-center justify-center gap-2">
                                    {convertLoading ? <Spinner /> : <span className="material-symbols-outlined text-base">stars</span>}
                                    {convertLoading ? 'Convirtiendo...' : 'Convertir en Líder'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default PersonaDetalle;
