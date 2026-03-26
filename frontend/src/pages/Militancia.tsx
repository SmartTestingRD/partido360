import { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import ConfirmModal from '../components/ConfirmModal';

const API = 'http://localhost:3001/api';

type ToastType = 'success' | 'error' | 'info';
interface ToastItem { id: number; message: string; type: ToastType; }

const ESTADOS = ['Activo', 'Inactivo', 'Suspendido'];

const badgeColor: Record<string, string> = {
    Activo: 'bg-green-100 text-green-700 border-green-200 dark:bg-green-900/30 dark:text-green-300 dark:border-green-800',
    Inactivo: 'bg-red-100 text-red-700 border-red-200 dark:bg-red-900/30 dark:text-red-300 dark:border-red-800',
    Suspendido: 'bg-yellow-100 text-yellow-700 border-yellow-200 dark:bg-yellow-900/30 dark:text-yellow-300 dark:border-yellow-800',
};

const Spinner = () => (
    <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
    </svg>
);

export default function Militancia() {
    // ── List state ──────────────────────────────────────────────────────────────
    const [rows, setRows] = useState<any[]>([]);
    const [total, setTotal] = useState(0);
    const [page, setPage] = useState(1);
    const pageSize = 20;
    const totalPages = Math.max(1, Math.ceil(total / pageSize));
    const [loading, setLoading] = useState(false);
    const [search, setSearch] = useState('');
    const [filterEstado, setFilterEstado] = useState('');

    // ── Toast ───────────────────────────────────────────────────────────────────
    const [toasts, setToasts] = useState<ToastItem[]>([]);
    const toastId = useRef(0);
    const toast = (message: string, type: ToastType = 'info') => {
        const id = ++toastId.current;
        setToasts(p => [...p, { id, message, type }]);
        setTimeout(() => setToasts(p => p.filter(t => t.id !== id)), 4000);
    };

    // ── Afiliar modal ────────────────────────────────────────────────────────────
    const [showAfiliar, setShowAfiliar] = useState(false);
    const [personaSearch, setPersonaSearch] = useState('');
    const [personaResults, setPersonaResults] = useState<any[]>([]);
    const [personaSearching, setPersonaSearching] = useState(false);
    const [selectedPersona, setSelectedPersona] = useState<any | null>(null);
    const [afiliarForm, setAfiliarForm] = useState({ numero_carnet: '', fecha_afiliacion: new Date().toISOString().split('T')[0], observaciones: '' });
    const [afiliarLoading, setAfiliarLoading] = useState(false);
    const [afiliarError, setAfiliarError] = useState('');
    const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

    // ── Edit modal ───────────────────────────────────────────────────────────────
    const [editRow, setEditRow] = useState<any | null>(null);
    const [editForm, setEditForm] = useState({ estado: 'Activo', numero_carnet: '', observaciones: '' });
    const [editLoading, setEditLoading] = useState(false);
    const [editError, setEditError] = useState('');

    // ── Delete ───────────────────────────────────────────────────────────────────
    const [deleteTarget, setDeleteTarget] = useState<string | null>(null);

    // ── Fetch list ───────────────────────────────────────────────────────────────
    const fetchData = async (p = page) => {
        if (!localStorage.getItem('token')) return;
        setLoading(true);
        try {
            const params: any = { page: p, pageSize };
            if (search) params.search = search;
            if (filterEstado) params.estado = filterEstado;
            const r = await axios.get(`${API}/militancia`, { params });
            setRows(r.data.data);
            setTotal(r.data.total);
        } catch (e: any) {
            toast(e.response?.data?.message || 'Error cargando militancia', 'error');
        } finally { setLoading(false); }
    };

    useEffect(() => { setPage(1); fetchData(1); }, [search, filterEstado]);
    useEffect(() => { fetchData(page); }, [page]);

    // ── Persona search (debounced) ───────────────────────────────────────────────
    useEffect(() => {
        if (!showAfiliar) return;
        if (personaSearch.trim().length < 2) { setPersonaResults([]); return; }
        if (searchTimer.current) clearTimeout(searchTimer.current);
        searchTimer.current = setTimeout(async () => {
            setPersonaSearching(true);
            try {
                const r = await axios.get(`${API}/personas/buscar`, { params: { q: personaSearch } });
                setPersonaResults(r.data.data || []);
            } catch { setPersonaResults([]); }
            finally { setPersonaSearching(false); }
        }, 350);
    }, [personaSearch, showAfiliar]);

    // ── Afiliar submit ───────────────────────────────────────────────────────────
    const handleAfiliar = async () => {
        if (!selectedPersona) { setAfiliarError('Selecciona una persona'); return; }
        setAfiliarLoading(true); setAfiliarError('');
        try {
            await axios.post(`${API}/militancia`, {
                persona_id: selectedPersona.persona_id,
                numero_carnet: afiliarForm.numero_carnet || undefined,
                fecha_afiliacion: afiliarForm.fecha_afiliacion,
                observaciones: afiliarForm.observaciones || undefined,
            });
            toast(`${selectedPersona.nombre_completo} afiliado exitosamente`, 'success');
            setShowAfiliar(false);
            setSelectedPersona(null); setPersonaSearch(''); setPersonaResults([]);
            setAfiliarForm({ numero_carnet: '', fecha_afiliacion: new Date().toISOString().split('T')[0], observaciones: '' });
            fetchData(1); setPage(1);
        } catch (e: any) {
            setAfiliarError(e.response?.data?.message || 'Error al afiliar');
        } finally { setAfiliarLoading(false); }
    };

    // ── Edit submit ──────────────────────────────────────────────────────────────
    const handleEdit = async () => {
        if (!editRow) return;
        setEditLoading(true); setEditError('');
        try {
            await axios.put(`${API}/militancia/${editRow.militancia_id}`, editForm);
            toast('Registro actualizado', 'success');
            setEditRow(null);
            fetchData(page);
        } catch (e: any) {
            setEditError(e.response?.data?.message || 'Error al actualizar');
        } finally { setEditLoading(false); }
    };

    // ── Delete confirm ───────────────────────────────────────────────────────────
    const handleDelete = async () => {
        if (!deleteTarget) return;
        try {
            await axios.delete(`${API}/militancia/${deleteTarget}`);
            toast('Registro eliminado', 'info');
            setDeleteTarget(null);
            fetchData(page);
        } catch (e: any) {
            toast(e.response?.data?.message || 'Error al eliminar', 'error');
            setDeleteTarget(null);
        }
    };

    const openEdit = (row: any) => {
        setEditRow(row);
        setEditForm({ estado: row.estado, numero_carnet: row.numero_carnet || '', observaciones: row.observaciones || '' });
        setEditError('');
    };

    const toastColors: Record<ToastType, string> = {
        success: 'bg-green-600', error: 'bg-red-600', info: 'bg-blue-600',
    };

    return (
        <main className="flex-1 overflow-y-auto bg-bg-light dark:bg-bg-dark p-4 md:p-6">
            {/* Toasts */}
            <div className="fixed top-4 right-4 z-[200] flex flex-col gap-2 pointer-events-none">
                {toasts.map(t => (
                    <div key={t.id} className={`${toastColors[t.type]} text-white text-sm px-4 py-3 rounded-xl shadow-lg pointer-events-auto max-w-xs`}>
                        {t.message}
                    </div>
                ))}
            </div>

            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                        <span className="material-symbols-outlined text-primary">diversity_3</span>
                        Militancia
                    </h1>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">{total} afiliados registrados</p>
                </div>
                <button
                    onClick={() => { setShowAfiliar(true); setAfiliarError(''); setSelectedPersona(null); setPersonaSearch(''); setPersonaResults([]); }}
                    className="flex items-center gap-2 bg-primary hover:bg-blue-700 text-white px-5 py-2.5 rounded-xl text-sm font-medium shadow-sm transition-colors"
                >
                    <span className="material-symbols-outlined text-lg">person_add</span>
                    Afiliar Persona
                </button>
            </div>

            {/* Filters */}
            <div className="bg-white dark:bg-card-dark rounded-2xl border border-border-light dark:border-border-dark p-4 mb-4 flex flex-col sm:flex-row gap-3">
                <div className="relative flex-1">
                    <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-lg">search</span>
                    <input
                        type="text" value={search} onChange={e => setSearch(e.target.value)}
                        placeholder="Buscar por nombre o cédula..."
                        className="w-full pl-9 pr-4 py-2 text-sm rounded-lg border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white focus:border-primary outline-none"
                    />
                </div>
                <select value={filterEstado} onChange={e => setFilterEstado(e.target.value)}
                    className="px-3 py-2 text-sm rounded-lg border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white focus:border-primary outline-none">
                    <option value="">Todos los estados</option>
                    {ESTADOS.map(e => <option key={e} value={e}>{e}</option>)}
                </select>
                {(search || filterEstado) && (
                    <button onClick={() => { setSearch(''); setFilterEstado(''); }}
                        className="text-sm text-gray-500 hover:text-primary flex items-center gap-1 whitespace-nowrap">
                        <span className="material-symbols-outlined text-base">close</span>
                        Limpiar
                    </button>
                )}
            </div>

            {/* Table */}
            <div className="bg-white dark:bg-card-dark rounded-2xl border border-border-light dark:border-border-dark overflow-hidden">
                {loading ? (
                    <div className="p-12 flex justify-center items-center gap-3 text-gray-400">
                        <Spinner /> Cargando...
                    </div>
                ) : rows.length === 0 ? (
                    <div className="p-12 text-center text-gray-400">
                        <span className="material-symbols-outlined text-5xl mb-3 block">diversity_3</span>
                        <p className="font-medium">No hay afiliados registrados</p>
                        <p className="text-xs mt-1">Usa "Afiliar Persona" para agregar militantes</p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="min-w-full text-sm text-left text-gray-600 dark:text-gray-300">
                            <thead className="bg-gray-50 dark:bg-gray-800/50 text-xs uppercase font-semibold text-gray-500 dark:text-gray-400 sticky top-0">
                                <tr>
                                    <th className="px-5 py-3">Nombre</th>
                                    <th className="px-5 py-3">Cédula</th>
                                    <th className="px-5 py-3 hidden md:table-cell">Sector</th>
                                    <th className="px-5 py-3 hidden sm:table-cell">N° Carnet</th>
                                    <th className="px-5 py-3 hidden sm:table-cell">Fecha Afiliación</th>
                                    <th className="px-5 py-3">Estado</th>
                                    <th className="px-5 py-3 text-right">Acciones</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                                {rows.map(r => (
                                    <tr key={r.militancia_id} className="hover:bg-gray-50 dark:hover:bg-gray-800/30 transition-colors">
                                        <td className="px-5 py-3 font-medium text-gray-900 dark:text-white whitespace-nowrap">{r.nombre_completo}</td>
                                        <td className="px-5 py-3 text-gray-500 whitespace-nowrap">{r.cedula || '--'}</td>
                                        <td className="px-5 py-3 hidden md:table-cell whitespace-nowrap">{r.sector || '--'}</td>
                                        <td className="px-5 py-3 hidden sm:table-cell font-mono text-xs">{r.numero_carnet || '--'}</td>
                                        <td className="px-5 py-3 hidden sm:table-cell text-xs text-gray-500">
                                            {r.fecha_afiliacion ? new Date(r.fecha_afiliacion).toLocaleDateString('es-DO') : '--'}
                                        </td>
                                        <td className="px-5 py-3">
                                            <span className={`px-2.5 py-0.5 text-xs font-semibold rounded-full border ${badgeColor[r.estado] || badgeColor.Inactivo}`}>
                                                {r.estado}
                                            </span>
                                        </td>
                                        <td className="px-5 py-3 text-right">
                                            <div className="flex items-center justify-end gap-2">
                                                <button onClick={() => openEdit(r)}
                                                    className="p-2 rounded-lg text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors" title="Editar">
                                                    <span className="material-symbols-outlined text-base">edit</span>
                                                </button>
                                                <button onClick={() => setDeleteTarget(r.militancia_id)}
                                                    className="p-2 rounded-lg text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors" title="Eliminar">
                                                    <span className="material-symbols-outlined text-base">delete</span>
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}

                {/* Pagination */}
                {totalPages > 1 && (
                    <div className="px-5 py-3 border-t border-gray-100 dark:border-gray-700 flex items-center justify-between text-sm text-gray-500">
                        <span>{total} registros</span>
                        <div className="flex items-center gap-2">
                            <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
                                className="p-1.5 rounded-lg border border-gray-200 dark:border-gray-700 disabled:opacity-40 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                                <span className="material-symbols-outlined text-base">chevron_left</span>
                            </button>
                            <span className="px-2">Pág. {page} de {totalPages}</span>
                            <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}
                                className="p-1.5 rounded-lg border border-gray-200 dark:border-gray-700 disabled:opacity-40 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                                <span className="material-symbols-outlined text-base">chevron_right</span>
                            </button>
                        </div>
                    </div>
                )}
            </div>

            {/* ── Modal: Afiliar Persona ─────────────────────────────────────────────── */}
            {showAfiliar && (
                <div className="fixed inset-0 z-[60] overflow-y-auto">
                    <div className="fixed inset-0 bg-gray-900/60 backdrop-blur-sm" onClick={() => !afiliarLoading && setShowAfiliar(false)} />
                    <div className="flex min-h-full items-center justify-center p-4">
                        <div className="relative bg-white dark:bg-card-dark rounded-2xl shadow-2xl w-full max-w-lg border border-gray-200 dark:border-gray-700">
                            {/* Header */}
                            <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-700 flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <span className="material-symbols-outlined text-primary text-2xl">person_add</span>
                                    <h3 className="text-lg font-bold text-gray-900 dark:text-white">Afiliar Persona</h3>
                                </div>
                                <button onClick={() => setShowAfiliar(false)} disabled={afiliarLoading}
                                    className="text-gray-400 hover:text-gray-600 p-1 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700">
                                    <span className="material-symbols-outlined">close</span>
                                </button>
                            </div>

                            <div className="px-6 py-5 space-y-4">
                                {afiliarError && (
                                    <div className="text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 px-4 py-3 rounded-lg border border-red-200 dark:border-red-800 flex items-center gap-2">
                                        <span className="material-symbols-outlined text-base">error</span>{afiliarError}
                                    </div>
                                )}

                                {/* Persona search */}
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                                        Buscar persona <span className="text-red-500">*</span>
                                    </label>
                                    <div className="relative">
                                        <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-lg">search</span>
                                        <input type="text" value={personaSearch} onChange={e => { setPersonaSearch(e.target.value); setSelectedPersona(null); }}
                                            placeholder="Nombre o cédula..."
                                            className="w-full pl-9 pr-4 py-2 text-sm rounded-lg border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white focus:border-primary outline-none" />
                                        {personaSearching && <span className="absolute right-3 top-1/2 -translate-y-1/2"><Spinner /></span>}
                                    </div>

                                    {/* Results dropdown */}
                                    {personaResults.length > 0 && !selectedPersona && (
                                        <div className="mt-1 border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden shadow-lg max-h-48 overflow-y-auto bg-white dark:bg-card-dark z-10 relative">
                                            {personaResults.map(p => (
                                                <button key={p.persona_id} onClick={() => { setSelectedPersona(p); setPersonaSearch(p.nombre_completo); setPersonaResults([]); }}
                                                    className="w-full text-left px-4 py-2.5 hover:bg-gray-50 dark:hover:bg-gray-800 text-sm border-b border-gray-100 dark:border-gray-700 last:border-0 transition-colors">
                                                    <div className="font-medium text-gray-900 dark:text-white">{p.nombre_completo}</div>
                                                    <div className="text-xs text-gray-500">{p.cedula || 'Sin cédula'} · {p.telefono}</div>
                                                </button>
                                            ))}
                                        </div>
                                    )}

                                    {selectedPersona && (
                                        <div className="mt-2 px-3 py-2 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg flex items-center justify-between">
                                            <div className="text-sm text-blue-700 dark:text-blue-300 font-medium">{selectedPersona.nombre_completo}
                                                <span className="text-xs font-normal ml-2 opacity-70">{selectedPersona.cedula}</span>
                                            </div>
                                            <button onClick={() => { setSelectedPersona(null); setPersonaSearch(''); }}
                                                className="text-blue-400 hover:text-blue-600 ml-2">
                                                <span className="material-symbols-outlined text-base">close</span>
                                            </button>
                                        </div>
                                    )}
                                </div>

                                {/* Carnet */}
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">N° Carnet</label>
                                        <input type="text" value={afiliarForm.numero_carnet}
                                            onChange={e => setAfiliarForm(f => ({ ...f, numero_carnet: e.target.value }))}
                                            placeholder="Opcional"
                                            className="w-full px-3 py-2 text-sm rounded-lg border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white focus:border-primary outline-none" />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Fecha Afiliación</label>
                                        <input type="date" value={afiliarForm.fecha_afiliacion}
                                            onChange={e => setAfiliarForm(f => ({ ...f, fecha_afiliacion: e.target.value }))}
                                            className="w-full px-3 py-2 text-sm rounded-lg border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white focus:border-primary outline-none" />
                                    </div>
                                </div>

                                {/* Observaciones */}
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Observaciones</label>
                                    <textarea value={afiliarForm.observaciones}
                                        onChange={e => setAfiliarForm(f => ({ ...f, observaciones: e.target.value }))}
                                        rows={2} placeholder="Opcional..."
                                        className="w-full px-3 py-2 text-sm rounded-lg border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white focus:border-primary outline-none resize-none" />
                                </div>
                            </div>

                            <div className="px-6 py-4 border-t border-gray-100 dark:border-gray-700 flex flex-row-reverse gap-3">
                                <button onClick={handleAfiliar} disabled={afiliarLoading || !selectedPersona}
                                    className="flex items-center gap-2 bg-primary hover:bg-blue-700 text-white px-6 py-2 rounded-lg text-sm font-medium disabled:opacity-50 transition-colors">
                                    {afiliarLoading ? <Spinner /> : <span className="material-symbols-outlined text-base">check</span>}
                                    Afiliar
                                </button>
                                <button onClick={() => setShowAfiliar(false)} disabled={afiliarLoading}
                                    className="px-5 py-2 rounded-lg border border-gray-300 dark:border-gray-600 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                                    Cancelar
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* ── Modal: Editar ─────────────────────────────────────────────────────── */}
            {editRow && (
                <div className="fixed inset-0 z-[60] overflow-y-auto">
                    <div className="fixed inset-0 bg-gray-900/60 backdrop-blur-sm" onClick={() => !editLoading && setEditRow(null)} />
                    <div className="flex min-h-full items-center justify-center p-4">
                        <div className="relative bg-white dark:bg-card-dark rounded-2xl shadow-2xl w-full max-w-md border border-gray-200 dark:border-gray-700">
                            <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-700 flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <span className="material-symbols-outlined text-amber-500 text-2xl">edit</span>
                                    <div>
                                        <h3 className="text-lg font-bold text-gray-900 dark:text-white">Editar Afiliación</h3>
                                        <p className="text-xs text-gray-400">{editRow.nombre_completo}</p>
                                    </div>
                                </div>
                                <button onClick={() => setEditRow(null)} disabled={editLoading}
                                    className="text-gray-400 hover:text-gray-600 p-1 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700">
                                    <span className="material-symbols-outlined">close</span>
                                </button>
                            </div>

                            <div className="px-6 py-5 space-y-4">
                                {editError && (
                                    <div className="text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 px-4 py-3 rounded-lg border border-red-200 dark:border-red-800">
                                        {editError}
                                    </div>
                                )}
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Estado</label>
                                    <select value={editForm.estado} onChange={e => setEditForm(f => ({ ...f, estado: e.target.value }))}
                                        className="w-full px-3 py-2 text-sm rounded-lg border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white focus:border-primary outline-none">
                                        {ESTADOS.map(e => <option key={e} value={e}>{e}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">N° Carnet</label>
                                    <input type="text" value={editForm.numero_carnet}
                                        onChange={e => setEditForm(f => ({ ...f, numero_carnet: e.target.value }))}
                                        className="w-full px-3 py-2 text-sm rounded-lg border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white focus:border-primary outline-none" />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Observaciones</label>
                                    <textarea value={editForm.observaciones}
                                        onChange={e => setEditForm(f => ({ ...f, observaciones: e.target.value }))}
                                        rows={3}
                                        className="w-full px-3 py-2 text-sm rounded-lg border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white focus:border-primary outline-none resize-none" />
                                </div>
                            </div>

                            <div className="px-6 py-4 border-t border-gray-100 dark:border-gray-700 flex flex-row-reverse gap-3">
                                <button onClick={handleEdit} disabled={editLoading}
                                    className="flex items-center gap-2 bg-amber-500 hover:bg-amber-600 text-white px-6 py-2 rounded-lg text-sm font-medium disabled:opacity-50 transition-colors">
                                    {editLoading ? <Spinner /> : <span className="material-symbols-outlined text-base">save</span>}
                                    Guardar
                                </button>
                                <button onClick={() => setEditRow(null)} disabled={editLoading}
                                    className="px-5 py-2 rounded-lg border border-gray-300 dark:border-gray-600 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                                    Cancelar
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* ── Confirm Delete ────────────────────────────────────────────────────── */}
            <ConfirmModal
                open={!!deleteTarget}
                title="¿Eliminar afiliación?"
                message="Se eliminará el registro de militancia de esta persona. Esta acción no se puede deshacer."
                confirmLabel="Eliminar"
                confirmColor="bg-red-600 hover:bg-red-700"
                onConfirm={handleDelete}
                onCancel={() => setDeleteTarget(null)}
            />
        </main>
    );
}
