import { useState, useEffect, useRef } from 'react';
import { getLideresResumen, getSectores, getEstadosLider, getNivelesLider, updateLider, deleteLider, getLideresResumenExport, Sector, EstadoLider, NivelLider, LiderResumen } from '../api/apiService';
import CreateLiderModal from '../components/CreateLiderModal';
import EditLiderModal, { EditLiderFormValues } from '../components/EditLiderModal';



// ─── Toast ───────────────────────────────────────────────────────────────────
type ToastType = 'success' | 'error' | 'info';
interface Toast { id: number; message: string; type: ToastType; }

const TOAST_DURATION = 3500;

const ToastContainer = ({ toasts, onRemove }: { toasts: Toast[]; onRemove: (id: number) => void }) => (
    <div className="fixed bottom-5 right-5 z-[9999] flex flex-col gap-2 pointer-events-none">
        {toasts.map(t => (
            <div
                key={t.id}
                className={`pointer-events-auto flex items-center gap-3 px-4 py-3 rounded-xl shadow-lg border text-sm font-medium transition-all animate-fade-in max-w-sm
                    ${t.type === 'success' ? 'bg-green-50 border-green-200 text-green-800 dark:bg-green-900/30 dark:border-green-800 dark:text-green-200' : ''}
                    ${t.type === 'error' ? 'bg-red-50 border-red-200 text-red-800 dark:bg-red-900/30 dark:border-red-800 dark:text-red-200' : ''}
                    ${t.type === 'info' ? 'bg-blue-50 border-blue-200 text-blue-800 dark:bg-blue-900/30 dark:border-blue-800 dark:text-blue-200' : ''}
                `}
            >
                <span className="material-symbols-outlined text-lg shrink-0">
                    {t.type === 'success' ? 'check_circle' : t.type === 'error' ? 'error' : 'info'}
                </span>
                <span className="flex-1">{t.message}</span>
                <button onClick={() => onRemove(t.id)} className="opacity-60 hover:opacity-100 transition-opacity shrink-0">
                    <span className="material-symbols-outlined text-base">close</span>
                </button>
            </div>
        ))}
    </div>
);

// ─── Helpers ──────────────────────────────────────────────────────────────────
const calcPct = (reclutados: number, meta: number): number => {
    if (!meta || meta <= 0) return 0;
    return Number(((reclutados / meta) * 100).toFixed(2));
};

// ─── Component ────────────────────────────────────────────────────────────────
const Lideres = () => {
    // ─── Usuario logueado (para control de visibilidad de botones) ────────────
    const _rawUser = (() => {
        try { return JSON.parse(localStorage.getItem('user') || '{}'); } catch { return {}; }
    })();
    const currentUserRol: string = (
        _rawUser?.rol_nombre || _rawUser?.data?.rol_nombre || _rawUser?.user?.rol_nombre || ''
    ).toUpperCase().replace(/[-_\s]/g, '');
    const currentLiderId: string | null = _rawUser?.lider_id || _rawUser?.data?.lider_id || _rawUser?.user?.lider_id || null;
    const currentUserEmail: string = _rawUser?.email || _rawUser?.data?.email || _rawUser?.user?.email || '';
    const currentCandidatoId: string = _rawUser?.candidato_id || _rawUser?.data?.candidato_id || _rawUser?.user?.candidato_id || '';
    const SUPER_ADMIN_CAND_ID = '00000000-0000-0000-0000-000000000001';
    const isSuperAdmin = currentCandidatoId === SUPER_ADMIN_CAND_ID || currentUserEmail === 'ejguerrero@smarttestingrd.com';

    /** ¿Puede el usuario logueado realizar acciones sobre este líder? */
    const canEdit = (lider: LiderResumen): boolean => {
        if (currentUserRol === 'ADMIN' || currentUserRol === 'COORDINADOR') return true;
        if (currentUserRol === 'SUBLIDER' && currentLiderId) {
            // Solo puede actuar sobre sus subordinados directos, NO sobre sí mismo ni su superior
            return lider.lider_padre_id === currentLiderId;
        }
        return false;
    };

    const [lideres, setLideres] = useState<LiderResumen[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Toasts
    const [toasts, setToasts] = useState<Toast[]>([]);
    const toastIdRef = useRef(0);
    const addToast = (message: string, type: ToastType = 'success') => {
        const id = ++toastIdRef.current;
        setToasts(prev => [...prev, { id, message, type }]);
        setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), TOAST_DURATION);
    };
    const removeToast = (id: number) => setToasts(prev => prev.filter(t => t.id !== id));

    // Filters
    const [search, setSearch] = useState('');
    const [sector, setSector] = useState('');
    const [nivel, setNivel] = useState('');

    // Pagination
    const [page, setPage] = useState(1);
    const [pageSize] = useState(10);
    const [total, setTotal] = useState(0);

    // Modal — Meta
    const [selectedGoalLider, setSelectedGoalLider] = useState<LiderResumen | null>(null);
    const [goalValue, setGoalValue] = useState<number>(0);
    const [isSavingGoal, setIsSavingGoal] = useState(false);

    // Modal — Edit
    const [selectedEditLider, setSelectedEditLider] = useState<LiderResumen | null>(null);
    const [editForm, setEditForm] = useState<EditLiderFormValues>({
        meta_cantidad: 0, estado_lider_id: '', nivel_lider_id: '', lider_padre_id: '',
        nombres: '', apellidos: '', telefono: '', sector_id: ''
    });


    // Modal — Create Full
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    // Modal — Confirm inactivation
    const [confirmPending, setConfirmPending] = useState<{ liderId: string; isActivo: boolean } | null>(null);

    // Modal — Delete confirm (Solo Super Admin)
    const [deleteConfirmLider, setDeleteConfirmLider] = useState<LiderResumen | null>(null);
    const [isDeleting, setIsDeleting] = useState(false);


    // Catalogs
    const [sectores, setSectores] = useState<Sector[]>([]);
    const [estadosLider, setEstadosLider] = useState<EstadoLider[]>([]);
    const [nivelesLider, setNivelesLider] = useState<NivelLider[]>([]);

    // ── Data fetching ─────────────────────────────────────────────────────────
    const fetchLideres = async () => {
        if (!localStorage.getItem('token')) return;
        setLoading(true);
        setError(null);
        try {
            const res = await getLideresResumen({ search, sector, nivel, page, pageSize });
            console.log('[DEBUG Lideres.tsx] API Response:', res);
            setLideres(res.data);
            setTotal(res.total || 0);
        } catch (err) {
            console.error('Error fetching lideres:', err);
            setError('No se pudieron cargar los líderes. Por favor, intenta nuevamente.');
        } finally {
            setLoading(false);
            console.log('[DEBUG Lideres.tsx] Current Lideres state:', lideres);
        }
    };

    const fetchCatalogs = async () => {
        if (!localStorage.getItem('token')) return;
        try {
            const [s, e, n] = await Promise.all([getSectores(), getEstadosLider(), getNivelesLider()]);
            setSectores(s);
            setEstadosLider(e);
            setNivelesLider(n);
        } catch (err) {
            console.error('Error fetching catalogs:', err);
        }
    };

    useEffect(() => { fetchCatalogs(); }, []);
    useEffect(() => { setPage(1); }, [search, sector, nivel]);
    useEffect(() => { fetchLideres(); }, [search, sector, nivel, page]);

    /* Borrado redundante - ahora en CreateLiderModal */

    // ── Actions ───────────────────────────────────────────────────────────────
    const handleToggleStatus = (e: React.MouseEvent, liderId: string, currentStatus: string) => {
        e.stopPropagation();
        const isActivo = currentStatus.toLowerCase() === 'activo';
        if (isActivo) {
            // Show React confirmation modal instead of window.confirm()
            setConfirmPending({ liderId, isActivo });
        } else {
            executeToggle(liderId, false);
        }
    };

    const executeToggle = async (liderId: string, isActivo: boolean) => {
        setConfirmPending(null);

        // Make sure catalogs are loaded
        let estadosCatalog = estadosLider;
        if (!estadosCatalog.length) {
            try {
                const e = await getEstadosLider();
                setEstadosLider(e);
                estadosCatalog = e;
            } catch {
                addToast('No se pudieron cargar los estados.', 'error');
                return;
            }
        }

        const inactivoState = estadosCatalog.find(est => est.nombre.toLowerCase() === 'inactivo');
        const activoState = estadosCatalog.find(est => est.nombre.toLowerCase() === 'activo');
        const targetState = isActivo ? inactivoState : activoState;

        if (!targetState) {
            addToast('No se pudo determinar el estado destino.', 'error');
            return;
        }

        try {
            await updateLider(liderId, { estado_lider_id: targetState.estado_lider_id });
            addToast(`Líder ${isActivo ? 'inactivado' : 'activado'} correctamente.`, 'success');
            fetchLideres();
        } catch (err) {
            console.error('Error updating leader status', err);
            addToast('Error al cambiar el estado del líder.', 'error');
        }
    };

    const handleSaveGoal = async () => {
        if (!selectedGoalLider || goalValue < 1) return;
        setIsSavingGoal(true);
        const snapshot = [...lideres];
        try {
            // Optimistic update
            const updated = lideres.map(l => {
                if (l.lider_id !== selectedGoalLider.lider_id) return l;
                return { ...l, meta_cantidad: goalValue, porcentaje_cumplimiento: calcPct(l.total_reclutados, goalValue) };
            });
            setLideres(updated);
            setSelectedGoalLider(null);

            await updateLider(selectedGoalLider.lider_id, { meta_cantidad: goalValue });
            addToast('Meta actualizada correctamente.', 'success');
        } catch (err) {
            console.error(err);
            setLideres(snapshot);
            setSelectedGoalLider(selectedGoalLider);
            addToast('Error al guardar la meta.', 'error');
        } finally {
            setIsSavingGoal(false);
        }
    };



    const handleDeleteLider = async () => {
        if (!deleteConfirmLider) return;
        setIsDeleting(true);
        try {
            await deleteLider(deleteConfirmLider.lider_id);
            addToast(`Líder "${deleteConfirmLider.nombre_completo}" eliminado correctamente.`, 'success');
            setDeleteConfirmLider(null);
            fetchLideres();
        } catch (err) {
            console.error('Error eliminando líder:', err);
            addToast('Error al eliminar el líder.', 'error');
        } finally {
            setIsDeleting(false);
        }
    };

    const handleClearFilters = () => {
        setSearch('');
        setSector('');
        setNivel('');
        setPage(1);
    };

    const handleExport = async () => {
        try {
            const blob = await getLideresResumenExport({ search, sector, nivel });
            const url = window.URL.createObjectURL(new Blob([blob]));
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', 'lideres.csv');
            document.body.appendChild(link);
            link.click();
            link.parentNode?.removeChild(link);
            addToast('CSV exportado correctamente.', 'success');
        } catch (err) {
            console.error('Error exportando líderes:', err);
            addToast('Error al exportar los líderes.', 'error');
        }
    };

    const openEditModal = (e: React.MouseEvent, lider: LiderResumen) => {
        e.stopPropagation();
        // Usar IDs directos del backend (ya incluidos en lideres-resumen)
        // Fallback a búsqueda por nombre si el campo directo no está disponible
        const curEst = lider.estado_lider_id || estadosLider.find(est => est.nombre === lider.estado_nombre)?.estado_lider_id || '';
        const curNiv = lider.nivel_lider_id || nivelesLider.find(n => n.nombre === lider.nivel_nombre)?.nivel_lider_id || '';
        setEditForm({
            meta_cantidad: lider.meta_cantidad,
            estado_lider_id: curEst,
            nivel_lider_id: curNiv,
            lider_padre_id: lider.lider_padre_id || '',
            nombres: lider.nombres || '',
            apellidos: lider.apellidos || '',
            telefono: lider.telefono || '',
            sector_id: lider.sector_id || '',
        });
        setSelectedEditLider(lider);
    };


    // ── Helpers ───────────────────────────────────────────────────────────────
    const getInitials = (nombres: string, apellidos: string) =>
        `${nombres.charAt(0)}${apellidos.charAt(0)}`.toUpperCase();

    const getAvatarColor = (index: number) => {
        const colors = [
            'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
            'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300',
            'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300',
            'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300',
            'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300',
            'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300',
        ];
        return colors[index % colors.length];
    };

    const getProgressColor = (porcentaje: number) => {
        if (porcentaje >= 100) return 'bg-green-500 text-green-600';
        if (porcentaje >= 50) return 'bg-blue-500 text-blue-600';
        return 'bg-red-500 text-red-600';
    };

    const formatPhone = (phone: string) => {
        if (!phone) return '';
        const clean = phone.replace(/\D/g, '');
        if (clean.length === 10) {
            return `${clean.slice(0, 3)}-${clean.slice(3, 6)}-${clean.slice(6)}`;
        }
        return phone;
    };

    const getStatusBadge = (estadoNombre: string) => {
        switch (estadoNombre.toLowerCase()) {
            case 'activo':
            case 'activa':
                return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300 border-green-200 dark:border-green-900';
            case 'inactivo':
            case 'inactiva':
                return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300 border-red-200 dark:border-red-900';
            case 'pendiente':
                return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300 border-yellow-200 dark:border-yellow-900';
            default:
                return 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-300 border-gray-200 dark:border-gray-900';
        }
    };

    // ── Render ────────────────────────────────────────────────────────────────
    return (
        <div className="flex-1 overflow-y-auto bg-background-light dark:bg-background-dark p-4 md:p-8 w-full h-full">
            <ToastContainer toasts={toasts} onRemove={removeToast} />

            <div className="max-w-7xl mx-auto space-y-6">

                {/* Header */}
                <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
                    <div>
                        <div className="hidden md:flex items-center text-sm text-gray-500 dark:text-gray-400 gap-2 mb-2">
                            <span onClick={() => window.location.hash = 'dashboard'} className="hover:text-primary cursor-pointer">Dashboard</span>
                            <span className="material-symbols-outlined text-base">chevron_right</span>
                            <span className="text-primary font-medium">Administración de Líderes</span>
                        </div>
                        <h1 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white tracking-tight">Administración de Líderes</h1>
                        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Gestione el rendimiento y seguimiento de su estructura política.</p>
                    </div>
                    <div className="flex gap-3">
                        <button onClick={handleExport} className="flex items-center gap-2 bg-white dark:bg-card-dark border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200 px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-50 dark:hover:bg-gray-700 shadow-sm transition-colors">
                            <span className="material-symbols-outlined text-lg">download</span>
                            <span className="hidden sm:inline">Exportar</span>
                        </button>
                        <button
                            onClick={() => setIsCreateModalOpen(true)}
                            className="flex items-center gap-2 bg-primary text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 shadow-sm shadow-blue-500/30 transition-colors"
                        >
                            <span className="material-symbols-outlined text-lg">add</span>
                            <span>Nuevo Líder</span>
                        </button>
                    </div>
                </div>

                {/* Inline error (non-action errors only) */}
                {error && (
                    <div className="bg-red-50 dark:bg-red-900/20 border-l-4 border-red-500 p-4 rounded-md flex items-start">
                        <span className="material-symbols-outlined text-red-500 mr-3">error</span>
                        <p className="text-sm font-medium text-red-800 dark:text-red-200">{error}</p>
                    </div>
                )}

                {/* Filters */}
                <div className="bg-card-light dark:bg-card-dark rounded-xl shadow-soft border border-border-light dark:border-border-dark p-4">
                    <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
                        <div className="flex flex-wrap gap-3 w-full md:w-auto flex-1">
                            <div className="relative w-full md:w-64">
                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                    <span className="material-symbols-outlined text-gray-400 text-xl">search</span>
                                </div>
                                <input
                                    className="pl-10 block w-full rounded-lg border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white focus:border-primary focus:ring-primary sm:text-sm h-10 transition-shadow"
                                    placeholder="Buscar líder..."
                                    type="text"
                                    value={search}
                                    onChange={(e) => setSearch(e.target.value)}
                                />
                            </div>
                            <select
                                className="block w-full md:w-32 rounded-lg border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:border-primary focus:ring-primary text-xs sm:text-sm h-10 transition-shadow disabled:opacity-50"
                                value={sector}
                                disabled={loading || sectores.length === 0}
                                onChange={(e) => setSector(e.target.value)}
                            >
                                <option value="">Centro de Votación</option>
                                {sectores.map(s => <option key={s.sector_id} value={s.sector_id}>{s.nombre}</option>)}
                            </select>
                            <select
                                className="block w-full md:w-32 rounded-lg border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:border-primary focus:ring-primary text-xs sm:text-sm h-10 transition-shadow disabled:opacity-50"
                                value={nivel}
                                disabled={loading || nivelesLider.length === 0}
                                onChange={(e) => setNivel(e.target.value)}
                            >
                                <option value="">Nivel</option>
                                {nivelesLider.map(n => <option key={n.nivel_lider_id} value={n.nivel_lider_id}>{n.nombre}</option>)}
                            </select>
                        </div>
                        <button
                            onClick={handleClearFilters}
                            className="text-sm text-gray-500 dark:text-gray-400 hover:text-primary font-medium flex items-center gap-1 whitespace-nowrap self-end md:self-center">
                            <span className="material-symbols-outlined text-lg">filter_alt_off</span>
                            Limpiar
                        </button>
                    </div>
                </div>

                {/* Table / Cards */}
                <div className="bg-card-light dark:bg-card-dark rounded-xl shadow-soft border border-border-light dark:border-border-dark overflow-hidden">
                    {loading ? (
                        <div className="p-10 flex justify-center items-center">
                            <svg className="animate-spin h-8 w-8 text-primary" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                        </div>
                    ) : lideres.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-16 bg-card-light dark:bg-card-dark rounded-xl border border-dashed border-gray-300 dark:border-gray-700">
                            <div className="h-20 w-20 bg-gray-50 dark:bg-gray-800 rounded-full flex items-center justify-center mb-4">
                                <span className="material-symbols-outlined text-4xl text-gray-300 dark:text-gray-600">search_off</span>
                            </div>
                            <h3 className="text-lg font-medium text-gray-900 dark:text-white">No se encontraron líderes</h3>
                            <p className="text-gray-500 dark:text-gray-400 text-sm mt-1 max-w-sm text-center">Intente ajustar los filtros de búsqueda o registre un nuevo líder en el sistema.</p>
                            <button onClick={handleClearFilters} className="mt-5 text-primary hover:text-blue-700 font-medium text-sm flex items-center gap-1">
                                Limpiar filtros
                                <span className="material-symbols-outlined text-lg">refresh</span>
                            </button>
                        </div>
                    ) : (
                        <>
                            {/* ── Mobile Cards ── */}
                            <div className="md:hidden divide-y divide-gray-100 dark:divide-gray-700">
                                {lideres.map((lider, idx) => (
                                    <div key={lider.lider_id} className="p-4 space-y-3 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                                        <div className="flex justify-between items-start">
                                            <div className="flex items-center gap-3">
                                                <div className={`h-10 w-10 rounded-full flex items-center justify-center font-bold text-sm ${getAvatarColor(idx)}`}>
                                                    {getInitials(lider.nombres, lider.apellidos)}
                                                </div>
                                                <div>
                                                    {/* Name as explicit link */}
                                                    <button
                                                        onClick={() => window.location.hash = `lideres/${lider.lider_id}`}
                                                        className="font-semibold text-gray-900 dark:text-white hover:text-primary dark:hover:text-primary text-left transition-colors"
                                                    >
                                                        {lider.nombre_completo}
                                                    </button>
                                                    <p className="text-xs text-gray-500 dark:text-gray-400">{lider.nivel_nombre} • {lider.sector_nombre}</p>
                                                </div>
                                            </div>
                                            <span className={`px-2 py-1 text-xs font-semibold rounded-full border ${getStatusBadge(lider.estado_nombre)}`}>
                                                {lider.estado_nombre}
                                            </span>
                                        </div>

                                        <div className="flex items-center justify-between text-sm text-gray-600 dark:text-gray-300">
                                            <span>Meta: <span className="font-medium">{lider.meta_cantidad}</span></span>
                                            <span className="font-bold text-gray-900 dark:text-white">Registrados: {lider.total_reclutados}</span>
                                        </div>

                                        <div className="space-y-1">
                                            <div className="flex justify-between text-xs mb-1">
                                                <span className="text-gray-500 font-medium">Cumplimiento</span>
                                                <span className={`font-bold ${getProgressColor(lider.porcentaje_cumplimiento).split(' ')[1]}`}>
                                                    {lider.porcentaje_cumplimiento}%
                                                </span>
                                            </div>
                                            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                                                <div className={`h-2 rounded-full ${getProgressColor(lider.porcentaje_cumplimiento).split(' ')[0]}`} style={{ width: `${Math.min(100, lider.porcentaje_cumplimiento)}%` }}></div>
                                            </div>
                                            {lider.porcentaje_cumplimiento >= 100 && (
                                                <div className="flex justify-end pt-1">
                                                    <span className="flex items-center gap-1 text-[10px] font-bold text-amber-500 uppercase tracking-wider bg-amber-50 dark:bg-amber-900/20 px-1.5 py-0.5 rounded border border-amber-200 dark:border-amber-800">
                                                        <span className="material-symbols-outlined text-[12px]">emoji_events</span>
                                                        Meta Superada
                                                    </span>
                                                </div>
                                            )}
                                        </div>

                                        <div className="pt-3 border-t border-gray-100 dark:border-gray-700/50 flex flex-wrap justify-end gap-2">
                                            {canEdit(lider) && (
                                            <button onClick={(e) => { e.stopPropagation(); setSelectedGoalLider(lider); setGoalValue(lider.meta_cantidad); }} className="px-3 py-1.5 bg-yellow-50 text-yellow-700 dark:bg-yellow-900/20 dark:text-yellow-400 rounded-md text-sm font-medium hover:bg-yellow-100">
                                                Meta
                                            </button>
                                            )}
                                            {canEdit(lider) && (
                                            <button onClick={(e) => openEditModal(e, lider)} className="px-3 py-1.5 bg-blue-50 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400 rounded-md text-sm font-medium hover:bg-blue-100 dark:hover:bg-blue-900/40">
                                                Editar
                                            </button>
                                            )}
                                            <button onClick={() => window.location.hash = `lideres/${lider.lider_id}`} className="px-3 py-1.5 bg-gray-50 text-gray-600 dark:bg-gray-700 dark:text-gray-300 rounded-md text-sm font-medium hover:bg-gray-100 dark:hover:bg-gray-600">
                                                Perfil
                                            </button>
                                            {canEdit(lider) && (
                                            <button
                                                onClick={(e) => handleToggleStatus(e, lider.lider_id, lider.estado_nombre)}
                                                className={`px-3 py-1.5 rounded-md text-sm font-medium ${lider.estado_nombre.toLowerCase() === 'activo' ? 'bg-red-50 text-red-600 dark:bg-red-900/20 dark:text-red-400 hover:bg-red-100' : 'bg-green-50 text-green-600 dark:bg-green-900/20 dark:text-green-400 hover:bg-green-100'}`}
                                            >
                                                {lider.estado_nombre.toLowerCase() === 'activo' ? 'Inactivar' : 'Activar'}
                                            </button>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>

                            {/* ── Desktop Table ── */}
                            <div className="hidden md:block overflow-x-auto">
                                <table className="min-w-[750px] w-full text-left text-sm text-gray-600 dark:text-gray-300">
                                    <thead className="bg-gray-50 dark:bg-gray-800/50 text-xs uppercase font-semibold text-gray-500 dark:text-gray-400">
                                        <tr>
                                            <th className="px-6 py-4" scope="col">Líder</th>
                                            <th className="px-6 py-4" scope="col">Teléfono</th>
                                            <th className="px-6 py-4" scope="col">Centro de Votación</th>
                                            <th className="px-6 py-4 text-center" scope="col">Meta</th>
                                            <th className="px-6 py-4 text-center" scope="col">
                                                <div className="flex items-center justify-center gap-1 text-primary">
                                                    Registrados
                                                    <span className="material-symbols-outlined text-sm">arrow_downward</span>
                                                </div>
                                            </th>
                                            <th className="px-6 py-4 w-48" scope="col">% Cumplimiento</th>
                                            <th className="px-6 py-4" scope="col">Estado</th>
                                            <th className="px-6 py-4 text-right" scope="col">Acciones</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                                        {lideres.map((lider, idx) => (
                                            <tr
                                                key={lider.lider_id}
                                                onClick={() => window.location.hash = `lideres/${lider.lider_id}`}
                                                className="hover:bg-gray-50 dark:hover:bg-gray-800/30 transition-colors cursor-pointer"
                                            >
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    <div className="flex items-center gap-3">
                                                        <div className={`h-9 w-9 rounded-full flex items-center justify-center font-bold text-xs flex-shrink-0 ${getAvatarColor(idx)}`}>
                                                            {getInitials(lider.nombres, lider.apellidos)}
                                                        </div>
                                                        <div>
                                                            {/* Name as explicit link – stopPropagation to avoid double-nav */}
                                                            <button
                                                                onClick={(e) => { e.stopPropagation(); window.location.hash = `lideres/${lider.lider_id}`; }}
                                                                className="font-medium text-gray-900 dark:text-white hover:text-primary dark:hover:text-primary transition-colors text-left"
                                                            >
                                                                {lider.nombre_completo}
                                                            </button>
                                                            <div className="text-xs text-gray-500">{lider.nivel_nombre}</div>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap">{formatPhone(lider.telefono || '')}</td>
                                                <td className="px-6 py-4 whitespace-nowrap">{lider.sector_nombre}</td>
                                                <td className="px-6 py-4 text-center font-medium">{lider.meta_cantidad}</td>
                                                <td className="px-6 py-4 text-center font-bold text-gray-900 dark:text-white">{lider.total_reclutados}</td>
                                                <td className="px-6 py-4 align-middle">
                                                    <div className="w-full flex items-center gap-2">
                                                        <div className="flex-1 bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                                                            <div className={`h-2 rounded-full ${getProgressColor(lider.porcentaje_cumplimiento).split(' ')[0]}`} style={{ width: `${Math.min(100, lider.porcentaje_cumplimiento)}%` }}></div>
                                                        </div>
                                                        <span className={`text-xs font-bold ${getProgressColor(lider.porcentaje_cumplimiento).split(' ')[1]}`}>
                                                            {lider.porcentaje_cumplimiento}%
                                                        </span>
                                                    </div>
                                                    {lider.porcentaje_cumplimiento >= 100 && (
                                                        <div className="mt-1 flex justify-start">
                                                            <span className="flex items-center gap-0.5 text-[10px] font-bold text-amber-500 uppercase tracking-wider bg-amber-50 dark:bg-amber-900/20 px-1.5 py-0.5 rounded border border-amber-200 dark:border-amber-800">
                                                                <span className="material-symbols-outlined text-[12px]">emoji_events</span>
                                                                Superada
                                                            </span>
                                                        </div>
                                                    )}
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    <span className={`px-2.5 py-0.5 text-xs font-semibold rounded-full border ${getStatusBadge(lider.estado_nombre)}`}>
                                                        {lider.estado_nombre}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                                    <div className="flex justify-end items-center gap-1">
                                                        {canEdit(lider) && (
                                                        <button
                                                            onClick={(e) => { e.stopPropagation(); setSelectedGoalLider(lider); setGoalValue(lider.meta_cantidad); }}
                                                            className="text-gray-400 hover:text-yellow-500 transition-colors p-1"
                                                            title="Establecer Meta"
                                                        >
                                                            <span className="material-symbols-outlined text-xl">flag</span>
                                                        </button>
                                                        )}
                                                        {canEdit(lider) && (
                                                        <button
                                                            onClick={(e) => openEditModal(e, lider)}
                                                            className="text-gray-400 hover:text-primary transition-colors p-1"
                                                            title="Editar Datos"
                                                        >
                                                            <span className="material-symbols-outlined text-xl">edit</span>
                                                        </button>
                                                        )}
                                                        <button
                                                            onClick={(e) => { e.stopPropagation(); window.location.hash = `lideres/${lider.lider_id}`; }}
                                                            className="text-gray-400 hover:text-green-600 transition-colors p-1"
                                                            title="Ver Perfil"
                                                        >
                                                            <span className="material-symbols-outlined text-xl">visibility</span>
                                                        </button>
                                                        {canEdit(lider) && (
                                                        <button
                                                            onClick={(e) => handleToggleStatus(e, lider.lider_id, lider.estado_nombre)}
                                                            className={`transition-colors p-1 ${lider.estado_nombre.toLowerCase() === 'activo' ? 'text-gray-400 hover:text-red-500' : 'text-gray-400 hover:text-green-500'}`}
                                                            title={lider.estado_nombre.toLowerCase() === 'activo' ? 'Inactivar' : 'Activar'}
                                                        >
                                                            <span className="material-symbols-outlined text-xl">
                                                                {lider.estado_nombre.toLowerCase() === 'activo' ? 'block' : 'check_circle'}
                                                            </span>
                                                        </button>
                                                        )}
                                                        {isSuperAdmin && (
                                                        <button
                                                            onClick={(e) => { e.stopPropagation(); setDeleteConfirmLider(lider); }}
                                                            className="text-gray-400 hover:text-red-600 transition-colors p-1"
                                                            title="Eliminar Líder"
                                                        >
                                                            <span className="material-symbols-outlined text-xl">delete</span>
                                                        </button>
                                                        )}
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </>
                    )}
                </div>

                {/* Pagination */}
                {!loading && lideres.length > 0 && (
                    <div className="flex items-center justify-between border-t border-gray-200 dark:border-gray-700 pt-4 px-1">
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                            Mostrando <span className="font-medium text-gray-900 dark:text-white">{(page - 1) * pageSize + 1}</span> a <span className="font-medium text-gray-900 dark:text-white">{Math.min(page * pageSize, total)}</span> de <span className="font-medium text-gray-900 dark:text-white">{total}</span> resultados
                        </p>
                        <div className="flex items-center gap-2">
                            <button
                                onClick={() => setPage(p => Math.max(1, p - 1))}
                                disabled={page === 1}
                                className="px-3 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded-md text-gray-700 hover:text-gray-900 dark:text-gray-300 dark:hover:text-white hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium">
                                Anterior
                            </button>
                            <button
                                onClick={() => setPage(p => p + 1)}
                                disabled={page * pageSize >= total}
                                className="px-3 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded-md text-gray-700 hover:text-gray-900 dark:text-gray-300 dark:hover:text-white hover:bg-gray-50 dark:hover:bg-gray-800 bg-white dark:bg-card-dark shadow-sm disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium">
                                Siguiente
                            </button>
                        </div>
                    </div>
                )}

                <div className="h-10"></div>
            </div>

            {/* ── Modal: Establecer Meta ── */}
            {selectedGoalLider && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
                    <div className="bg-white dark:bg-card-dark rounded-xl shadow-xl w-full max-w-sm overflow-hidden animate-fade-in">
                        <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-800 flex justify-between items-center">
                            <h3 className="font-bold text-gray-900 dark:text-white flex items-center gap-2">
                                <span className="material-symbols-outlined text-primary">flag</span>
                                Establecer Meta
                            </h3>
                            <button onClick={() => setSelectedGoalLider(null)} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
                                <span className="material-symbols-outlined">close</span>
                            </button>
                        </div>
                        <div className="p-6">
                            <p className="text-sm text-gray-600 dark:text-gray-300 mb-4">
                                Establece la meta para el líder <strong>{selectedGoalLider.nombre_completo}</strong>.
                            </p>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                Cantidad de Registros
                            </label>
                            <input
                                type="number"
                                min="1"
                                value={goalValue}
                                onChange={(e) => setGoalValue(parseInt(e.target.value) || 0)}
                                className="w-full rounded-lg border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-primary focus:border-primary px-4 py-2"
                            />
                            {goalValue < 1 && <p className="text-xs text-red-500 mt-1">La meta debe ser al menos 1.</p>}
                        </div>
                        <div className="px-6 py-4 bg-gray-50 dark:bg-gray-800/50 border-t border-gray-100 dark:border-gray-800 flex justify-end gap-3">
                            <button onClick={() => setSelectedGoalLider(null)} className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors">Cancelar</button>
                            <button
                                onClick={handleSaveGoal}
                                disabled={isSavingGoal || goalValue < 1}
                                className="px-4 py-2 text-sm font-medium text-white bg-primary hover:bg-blue-700 rounded-lg shadow-sm disabled:opacity-50 transition-colors flex items-center gap-2">
                                {isSavingGoal ? <span className="material-symbols-outlined animate-spin text-sm">progress_activity</span> : null}
                                Guardar
                            </button>
                        </div>
                    </div>
                </div>
            )}


            {/* ── Modal: Editar Líder (centralized) ── */}
            <EditLiderModal
                isOpen={!!selectedEditLider}
                liderId={selectedEditLider?.lider_id || ''}
                initialValues={editForm}
                onClose={() => setSelectedEditLider(null)}
                onSuccess={fetchLideres}
                addToast={addToast}
            />

            {/* ── Modal: Confirmación inactivar líder ── */}
            {confirmPending && (
                <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in">
                    <div className="bg-white dark:bg-[#15202e] w-full max-w-sm rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden animate-scale-up">
                        <div className="p-6">
                            <div className="flex items-center gap-3 mb-4">
                                <div className="w-10 h-10 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center flex-shrink-0">
                                    <span className="material-symbols-outlined text-red-600 dark:text-red-400">person_off</span>
                                </div>
                                <div>
                                    <h3 className="text-base font-bold text-slate-900 dark:text-white">Inactivar Líder</h3>
                                    <p className="text-sm text-slate-500 dark:text-slate-400">Esta acción cambiará el estado del líder.</p>
                                </div>
                            </div>
                            <p className="text-sm text-slate-700 dark:text-slate-300">
                                ¿Estás seguro de que deseas <span className="font-semibold text-red-600 dark:text-red-400">inactivar</span> a este líder?
                            </p>
                        </div>
                        <div className="px-6 pb-6 flex items-center justify-end gap-3">
                            <button
                                onClick={() => setConfirmPending(null)}
                                className="px-5 py-2.5 rounded-xl text-sm font-bold text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={() => executeToggle(confirmPending.liderId, confirmPending.isActivo)}
                                className="px-5 py-2.5 rounded-xl text-sm font-bold text-white bg-red-600 hover:bg-red-700 transition-colors shadow-md shadow-red-500/25"
                            >
                                Sí, inactivar
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Modal: Crear / Convertir Líder */}
            <CreateLiderModal
                isOpen={isCreateModalOpen}
                onClose={() => setIsCreateModalOpen(false)}
                onSuccess={fetchLideres}
                addToast={addToast}
            />

            {/* ── Modal: Confirmar Eliminación de Líder ── */}
            {deleteConfirmLider && (
                <div className="fixed inset-0 z-[300] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in">
                    <div className="bg-white dark:bg-[#15202e] w-full max-w-sm rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden animate-scale-up">
                        <div className="p-6">
                            <div className="flex items-center gap-3 mb-4">
                                <div className="w-10 h-10 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center flex-shrink-0">
                                    <span className="material-symbols-outlined text-red-600 dark:text-red-400">delete_forever</span>
                                </div>
                                <div>
                                    <h3 className="text-base font-bold text-slate-900 dark:text-white">Eliminar Líder</h3>
                                    <p className="text-sm text-slate-500 dark:text-slate-400">Esta acción es permanente e irreversible.</p>
                                </div>
                            </div>
                            <p className="text-sm text-slate-700 dark:text-slate-300">
                                ¿Estás seguro de que deseas <span className="font-semibold text-red-600 dark:text-red-400">eliminar permanentemente</span> al líder <span className="font-bold">"{deleteConfirmLider.nombre_completo}"</span>? Se eliminarán también su perfil de persona y usuario asociado.
                            </p>
                        </div>
                        <div className="px-6 pb-6 flex items-center justify-end gap-3">
                            <button
                                onClick={() => setDeleteConfirmLider(null)}
                                disabled={isDeleting}
                                className="px-5 py-2.5 rounded-xl text-sm font-bold text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors disabled:opacity-50"
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={handleDeleteLider}
                                disabled={isDeleting}
                                className="px-5 py-2.5 rounded-xl text-sm font-bold text-white bg-red-600 hover:bg-red-700 transition-colors shadow-md shadow-red-500/25 disabled:opacity-50 flex items-center gap-2"
                            >
                                {isDeleting && <span className="material-symbols-outlined animate-spin text-sm">progress_activity</span>}
                                Sí, eliminar
                            </button>
                        </div>
                    </div>
                </div>
            )}

        </div>
    );
};

export default Lideres;
