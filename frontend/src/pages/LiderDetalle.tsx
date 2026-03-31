import { useState, useEffect, useRef } from 'react';
import {
    getLiderDetalle,
    getLiderPersonas,
    LiderDetalleCompleto,
    Persona,
} from '../api/apiService';
import EditLiderModal, { EditLiderFormValues } from '../components/EditLiderModal';

interface LiderDetalleProps {
    id: string;
    onBack: () => void;
}

const LiderDetalle = ({ id, onBack }: LiderDetalleProps) => {
    const [data, setData] = useState<LiderDetalleCompleto | null>(null);
    const [personas, setPersonas] = useState<Persona[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Toast logic
    const [toasts, setToasts] = useState<{ id: number; message: string; type: 'success' | 'error' | 'info' }[]>([]);
    const toastIdRef = useRef(0);
    const addToast = (message: string, type: 'success' | 'error' | 'info' = 'success') => {
        const id = ++toastIdRef.current;
        setToasts(prev => [...prev, { id, message, type }]);
        setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 3500);
    };

    // Modal Edit State
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [editForm, setEditForm] = useState<EditLiderFormValues>({
        meta_cantidad: 0,
        estado_lider_id: '',
        nivel_lider_id: '',
        lider_padre_id: '',
        nombres: '',
        apellidos: '',
        telefono: '',
        sector_id: ''
    });

    // Filters for personas
    const [searchQ, setSearchQ] = useState('');

    const fetchData = async () => {
        if (!localStorage.getItem('token')) return;
        setLoading(true);
        setError(null);
        try {
            const [detalleRes, personasRes] = await Promise.all([
                getLiderDetalle(id),
                getLiderPersonas(id, { q: searchQ })
            ]);
            setData(detalleRes);
            setPersonas(personasRes.data);

            // Prefill edit form
            setEditForm({
                meta_cantidad: detalleRes.lider.meta_cantidad,
                estado_lider_id: detalleRes.lider.estado_lider.id,
                nivel_lider_id: detalleRes.lider.nivel_lider.id,
                lider_padre_id: detalleRes.lider.lider_padre_id || '',
                nombres: detalleRes.lider.nombres,
                apellidos: detalleRes.lider.apellidos,
                telefono: detalleRes.lider.telefono,
                sector_id: detalleRes.lider.sector_id || ''
            });
        } catch (err) {
            console.error("Error fetching lider data", err);
            setError("No se pudo cargar el perfil del líder.");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [id, searchQ]);



    const getInitials = (nombre?: string) => {
        if (!nombre) return 'NA';
        const parts = nombre.trim().split(' ');
        if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
        return nombre.substring(0, 2).toUpperCase();
    };

    const getStatusBadge = (estado: string) => {
        switch (estado.toLowerCase()) {
            case 'activo':
            case 'activa':
            case 'verificado':
                return 'bg-green-50 text-green-700 ring-green-600/20 dark:bg-green-900/20 dark:text-green-400';
            case 'inactivo':
            case 'inactiva':
                return 'bg-red-50 text-red-700 ring-red-600/20 dark:bg-red-900/20 dark:text-red-400';
            case 'pendiente':
                return 'bg-yellow-50 text-yellow-800 ring-yellow-600/20 dark:bg-yellow-900/20 dark:text-yellow-400';
            default:
                return 'bg-gray-50 text-gray-700 ring-gray-600/20 dark:bg-gray-900/20 dark:text-gray-400';
        }
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
                <p className="text-red-500 mb-4">{error || "Líder no encontrado"}</p>
                <button onClick={onBack} className="text-primary hover:underline">Volver a la lista</button>
            </div>
        );
    }

    const { lider, metricas } = data;
    const progressPerc = Math.min(100, Math.round(metricas.porcentaje_cumplimiento || 0));

    return (
        <div className="flex-1 flex flex-col h-full overflow-y-auto bg-background-light dark:bg-background-dark text-slate-900 dark:text-slate-100 font-display">
            {/* Page Header matching HTML */}
            <header className="sticky top-0 z-20 bg-white/90 dark:bg-[#15202e]/90 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 px-4 py-3 md:py-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <button onClick={onBack} className="flex items-center justify-center p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors text-slate-600 dark:text-slate-300">
                        <span className="material-symbols-outlined">arrow_back</span>
                    </button>
                    <h1 className="text-base md:text-xl font-bold text-center md:text-left truncate">Perfil de Líder</h1>
                </div>
                <div className="flex items-center gap-2">
                    <button
                        onClick={() => setIsEditModalOpen(true)}
                        className="hidden md:flex items-center gap-2 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 px-4 py-2 rounded-lg text-sm font-medium transition-colors shadow-sm"
                    >
                        <span className="material-symbols-outlined text-[18px]">edit_note</span>
                        <span>Editar Líder</span>
                    </button>
                    <button onClick={() => window.location.hash = 'captacion'} className="hidden md:flex items-center gap-2 bg-primary hover:bg-primary-hover text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors shadow-sm">
                        <span className="material-symbols-outlined text-[18px]">person_add</span>
                        <span>Añadir Registro</span>
                    </button>
                    <button
                        onClick={() => setIsEditModalOpen(true)}
                        className="md:hidden flex items-center justify-center p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors text-primary font-medium"
                    >
                        <span className="material-symbols-outlined">edit</span>
                    </button>
                </div>
            </header>

            <main className="flex-1 p-4 md:p-6 lg:p-8 w-full max-w-7xl mx-auto">
                <div className="flex flex-col md:flex-row gap-6 md:gap-8 items-start">

                    {/* Sidebar Profile Card */}
                    <div className="w-full md:w-80 lg:w-96 flex-shrink-0">
                        <div className="bg-white dark:bg-[#15202e] relative pb-6 pt-6 px-6 flex flex-col items-center border-b md:border border-slate-100 dark:border-slate-800 md:rounded-xl shadow-sm md:sticky md:top-6">
                            <div className="relative group cursor-pointer mb-4">
                                <div className="w-24 h-24 md:w-32 md:h-32 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center text-4xl text-slate-500 font-bold overflow-hidden ring-4 ring-white dark:ring-[#15202e] shadow-lg">
                                    {getInitials(lider?.nombre_completo)}
                                </div>
                                {lider?.estado_lider?.nombre?.toLowerCase() === 'activo' && (
                                    <div className="absolute bottom-1 right-1 bg-blue-500 border-2 border-white dark:border-[#15202e] w-8 h-8 rounded-full flex items-center justify-center" title="Líder Verificado">
                                        <span className="material-symbols-outlined text-white text-[18px]">verified</span>
                                    </div>
                                )}
                            </div>
                            <h2 className="text-xl md:text-2xl font-bold text-slate-900 dark:text-white mb-1 text-center">{lider?.nombre_completo || 'Sin Nombre'}</h2>
                            <div className="flex flex-col items-center gap-2 mb-6 w-full">
                                <div className="flex items-center gap-2">
                                    <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold bg-purple-100 text-purple-800 dark:bg-purple-900/40 dark:text-purple-300 border border-purple-200 dark:border-purple-800">
                                        {lider?.nivel_lider?.nombre?.toUpperCase() || 'LÍDER'}
                                    </span>
                                    <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ring-1 ring-inset ${getStatusBadge(lider?.estado_lider?.nombre || '')}`}>
                                        {lider?.estado_lider?.nombre || 'Desconocido'}
                                    </span>
                                </div>
                            </div>

                            <div className="w-full space-y-4 pt-4 border-t border-slate-100 dark:border-slate-800">
                                <div className="flex items-center gap-3 text-sm">
                                    <div className="w-8 h-8 rounded-lg bg-slate-50 dark:bg-slate-800 flex items-center justify-center text-slate-500 dark:text-slate-400">
                                        <span className="material-symbols-outlined text-[18px]">call</span>
                                    </div>
                                    <div className="flex-1">
                                        <p className="text-xs text-slate-500 dark:text-slate-400">Teléfono</p>
                                        <p className="font-medium text-slate-900 dark:text-white">{lider?.telefono || 'Sin Teléfono'}</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-3 text-sm">
                                    <div className="w-8 h-8 rounded-lg bg-slate-50 dark:bg-slate-800 flex items-center justify-center text-slate-500 dark:text-slate-400">
                                        <span className="material-symbols-outlined text-[18px]">location_on</span>
                                    </div>
                                    <div className="flex-1">
                                        <p className="text-xs text-slate-500 dark:text-slate-400">Sector Asignado</p>
                                        <p className="font-medium text-slate-900 dark:text-white">{lider?.sector_nombre || 'Sin Sector'}</p>
                                    </div>
                                </div>
                                {lider?.lider_padre_nombre && (
                                    <div className="flex items-center gap-3 text-sm">
                                        <div className="w-8 h-8 rounded-lg bg-slate-50 dark:bg-slate-800 flex items-center justify-center text-slate-500 dark:text-slate-400">
                                            <span className="material-symbols-outlined text-[18px]">supervisor_account</span>
                                        </div>
                                        <div className="flex-1">
                                            <p className="text-xs text-slate-500 dark:text-slate-400">Líder Superior</p>
                                            <p className="font-medium text-slate-900 dark:text-white">{lider.lider_padre_nombre}</p>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Main Content Info */}
                    <div className="flex-1 w-full pb-24 md:pb-0 space-y-6">

                        {/* Progress Section */}
                        <section>
                            <div className="bg-white dark:bg-[#15202e] rounded-xl shadow-sm border border-slate-100 dark:border-slate-800 p-6 relative overflow-hidden">
                                <div className="absolute top-0 right-0 p-4 opacity-10">
                                    <span className="material-symbols-outlined text-9xl">trending_up</span>
                                </div>
                                <div className="relative z-10 flex flex-col md:flex-row items-center gap-8 md:gap-12">
                                    <div className="flex-shrink-0 relative">
                                        <div
                                            className="w-32 h-32 md:w-40 md:h-40 rounded-full flex items-center justify-center relative shadow-inner"
                                            style={{ background: `conic-gradient(#136dec ${progressPerc}%, #e2e8f0 0%)` }}
                                        >
                                            <div className="w-28 h-28 md:w-36 md:h-36 bg-white dark:bg-[#15202e] rounded-full flex flex-col items-center justify-center shadow-sm">
                                                <span className="text-3xl md:text-4xl font-bold text-slate-900 dark:text-white">{progressPerc}%</span>
                                                <span className="text-xs font-medium text-slate-500 uppercase">Completado</span>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="flex-1 text-center md:text-left space-y-4">
                                        <div>
                                            <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-1">Rendimiento de Captación</h3>
                                            <p className="text-sm text-slate-500 dark:text-slate-400">Progreso actual respecto a la meta establecida para este periodo.</p>
                                        </div>
                                        <div className="flex flex-wrap items-center justify-center md:justify-start gap-6">
                                            <div>
                                                <p className="text-xs text-slate-500 uppercase tracking-wide mb-1">Registrados</p>
                                                <p className="text-2xl md:text-3xl font-bold text-primary">{metricas.total_registrados_activos} <span className="text-sm font-normal text-slate-400">/ {lider.meta_cantidad}</span></p>
                                            </div>
                                            <div className="w-px h-10 bg-slate-200 dark:bg-slate-700 hidden md:block"></div>
                                            <div>
                                                <p className="text-xs text-slate-500 uppercase tracking-wide mb-1">Faltantes</p>
                                                <p className="text-2xl md:text-3xl font-bold text-slate-700 dark:text-slate-300">
                                                    {Math.max(0, lider.meta_cantidad - metricas.total_registrados_activos)}
                                                </p>
                                            </div>
                                            <div className="w-px h-10 bg-slate-200 dark:bg-slate-700 hidden md:block"></div>
                                            <div>
                                                <p className="text-xs text-slate-500 uppercase tracking-wide mb-1">Histórico Total</p>
                                                <p className="text-xl font-bold text-slate-700 dark:text-slate-300 mt-1">{metricas.total_registrados_historico}</p>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </section>

                        <section className="space-y-4">
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                                <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                                    <span className="material-symbols-outlined text-primary">groups</span>
                                    Personas Registradas
                                    <span className="bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 text-xs py-0.5 px-2 rounded-full ml-1">{metricas.total_registrados_activos}</span>
                                </h3>
                                <div className="relative max-w-xs w-full">
                                    <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                                        <span className="text-slate-400 material-symbols-outlined text-[20px]">search</span>
                                    </div>
                                    <input
                                        className="block w-full rounded-lg border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900/50 py-2 pl-10 text-sm placeholder:text-slate-400 focus:border-primary focus:ring-primary dark:text-white shadow-sm"
                                        placeholder="Buscar por nombre..."
                                        type="search"
                                        value={searchQ}
                                        onChange={(e) => setSearchQ(e.target.value)}
                                    />
                                </div>
                            </div>

                            {/* Desktop Table View */}
                            <div className="hidden md:block bg-white dark:bg-[#15202e] rounded-xl shadow-sm border border-slate-100 dark:border-slate-800 overflow-hidden">
                                <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-800">
                                    <thead className="bg-slate-50 dark:bg-slate-800/50">
                                        <tr>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">Nombre</th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">Sector</th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">Estado</th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">Fecha Registro</th>
                                            <th className="px-6 py-3 text-right text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">Teléfono</th>
                                        </tr>
                                    </thead>
                                    <tbody className="bg-white dark:bg-[#15202e] divide-y divide-slate-200 dark:divide-slate-800">
                                        {personas.map((per, idx) => (
                                            <tr key={idx} onClick={() => window.location.hash = `personas/${per.persona_id}`} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors cursor-pointer">
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    <div className="flex items-center">
                                                        <div className="h-10 w-10 flex-shrink-0 rounded-full bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center text-indigo-700 dark:text-indigo-300 font-bold">
                                                            {getInitials((per as any).nombre_completo || per.nombres)}
                                                        </div>
                                                        <div className="ml-4">
                                                            <div className="text-sm font-medium text-slate-900 dark:text-white">{(per as any).nombre_completo || per.nombres}</div>
                                                            {per.cedula && <div className="text-xs text-slate-500">CC: {per.cedula}</div>}
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    <div className="text-sm text-slate-900 dark:text-white">{per.sector_nombre || 'N/A'}</div>
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    <span className={`inline-flex items-center rounded-full px-2 py-1 text-xs font-medium ring-1 ring-inset ${getStatusBadge((per as any).estado_persona?.nombre || 'Verificado')}`}>
                                                        {(per as any).estado_persona?.nombre || 'Verificado'}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500 dark:text-slate-400">
                                                    {new Date(per.fecha_registro).toLocaleDateString()}
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium text-slate-700 dark:text-slate-300">
                                                    {per.telefono}
                                                </td>
                                            </tr>
                                        ))}
                                        {personas.length === 0 && !loading && (
                                            <tr>
                                                <td colSpan={5} className="py-8 text-center text-gray-500">No hay registros encontrados.</td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>

                            {/* Mobile View */}
                            <div className="md:hidden space-y-3">
                                {personas.map((per, idx) => (
                                    <div key={idx} onClick={() => window.location.hash = `personas/${per.persona_id}`} className="bg-white dark:bg-[#15202e] rounded-xl p-4 shadow-sm border border-slate-100 dark:border-slate-800 flex items-center justify-between cursor-pointer active:scale-[0.98] transition-all">
                                        <div className="flex items-center gap-3">
                                            <div className="h-10 w-10 flex-shrink-0 rounded-full bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center text-indigo-700 dark:text-indigo-300 font-bold text-sm">
                                                {getInitials((per as any).nombre_completo || per.nombres)}
                                            </div>
                                            <div>
                                                <h4 className="text-sm font-bold text-slate-900 dark:text-white">{(per as any).nombre_completo || per.nombres}</h4>
                                                <p className="text-xs text-slate-500">{per.sector_nombre || 'Sin Sector'}</p>
                                            </div>
                                        </div>
                                        <div className="flex flex-col items-end gap-1">
                                            <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium ring-1 ring-inset ${getStatusBadge((per as any).estado_persona?.nombre || 'Verificado')}`}>
                                                {(per as any).estado_persona?.nombre || 'Verificado'}
                                            </span>
                                            <span className="text-[10px] text-slate-400">{new Date(per.fecha_registro).toLocaleDateString()}</span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </section>
                    </div>
                </div>
            </main>

            {/* Mobile Bottom Bar */}
            <div className="md:hidden fixed bottom-0 left-0 right-0 p-4 bg-white/80 dark:bg-background-dark/80 backdrop-blur-md border-t border-slate-200 dark:border-slate-800 z-10 safe-area-bottom">
                <div className="max-w-lg mx-auto grid grid-cols-2 gap-3">
                    <button
                        onClick={() => setIsEditModalOpen(true)}
                        className="w-full flex items-center justify-center gap-2 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 font-bold py-3 px-4 rounded-xl shadow-sm transition-all text-sm"
                    >
                        <span className="material-symbols-outlined text-[18px]">edit_note</span>
                        <span>Editar</span>
                    </button>
                    <button onClick={() => window.location.hash = 'captacion'} className="w-full flex items-center justify-center gap-2 bg-primary hover:bg-primary-hover active:scale-[0.98] transition-all text-white font-bold py-3 px-4 rounded-xl shadow-lg shadow-primary/25 text-sm">
                        <span className="material-symbols-outlined text-[18px]">person_add</span>
                        <span>Añadir</span>
                    </button>
                </div>
            </div>

            {/* Edit Modal */}
            <EditLiderModal
                isOpen={isEditModalOpen}
                liderId={id}
                initialValues={editForm}
                onClose={() => setIsEditModalOpen(false)}
                onSuccess={fetchData}
                addToast={addToast}
            />


            {/* Toasts */}
            <div className="fixed bottom-5 right-5 z-[1000] flex flex-col gap-2 pointer-events-none">
                {toasts.map(t => (
                    <div key={t.id} className={`pointer-events-auto flex items-center gap-2 px-4 py-3 rounded-xl shadow-lg border text-sm font-medium animate-fade-in ${t.type === 'success' ? 'bg-green-50 border-green-200 text-green-800 dark:bg-green-900/30 dark:border-green-800 dark:text-green-200' : 'bg-red-50 border-red-200 text-red-800 dark:bg-red-900/30 dark:border-red-800 dark:text-red-200'}`}>
                        <span className="material-symbols-outlined text-lg">
                            {t.type === 'success' ? 'check_circle' : 'error'}
                        </span>
                        {t.message}
                    </div>
                ))}
            </div>
        </div>
    );
};

export default LiderDetalle;

