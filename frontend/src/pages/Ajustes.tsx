import { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import ConfirmModal from '../components/ConfirmModal';

import { API_URL } from '../api/apiService';
const API = API_URL;

// ─── Toast ────────────────────────────────────────────────────────────────────
type ToastType = 'success' | 'error' | 'info';
interface Toast { id: number; message: string; type: ToastType; }
const TOAST_MS = 3500;

const ToastContainer = ({ toasts, onRemove }: { toasts: Toast[]; onRemove: (id: number) => void }) => (
    <div className="fixed bottom-5 right-5 z-[9999] flex flex-col gap-2 pointer-events-none">
        {toasts.map(t => (
            <div key={t.id} className={`pointer-events-auto flex items-center gap-3 px-4 py-3 rounded-xl shadow-lg border text-sm font-medium max-w-sm
                ${t.type === 'success' ? 'bg-green-50 border-green-200 text-green-800 dark:bg-green-900/30 dark:border-green-800 dark:text-green-200' : ''}
                ${t.type === 'error' ? 'bg-red-50 border-red-200 text-red-800 dark:bg-red-900/30 dark:border-red-800 dark:text-red-200' : ''}
                ${t.type === 'info' ? 'bg-blue-50 border-blue-200 text-blue-800 dark:bg-blue-900/30 dark:border-blue-800 dark:text-blue-200' : ''}
            `}>
                <span className="material-symbols-outlined text-lg shrink-0">
                    {t.type === 'success' ? 'check_circle' : t.type === 'error' ? 'error' : 'info'}
                </span>
                <span className="flex-1">{t.message}</span>
                <button onClick={() => onRemove(t.id)} className="opacity-60 hover:opacity-100 shrink-0">
                    <span className="material-symbols-outlined text-base">close</span>
                </button>
            </div>
        ))}
    </div>
);

// ─── Tab Types ────────────────────────────────────────────────────────────────
type Tab = 'meta' | 'usuarios' | 'catalogos' | 'sistema' | 'sectores' | 'lideres' | 'fuentes' | 'candidatos';

interface TabDef { id: Tab; label: string; icon: string; }


// ─── Shared UI ────────────────────────────────────────────────────────────────
const Card = ({ children, className = '' }: { children: React.ReactNode; className?: string }) => (
    <div className={`bg-card-light dark:bg-card-dark rounded-xl shadow-soft border border-border-light dark:border-border-dark ${className}`}>
        {children}
    </div>
);

const SectionHeader = ({ icon, title, subtitle }: { icon: string; title: string; subtitle?: string }) => (
    <div className="flex items-start gap-3 px-6 py-5 border-b border-border-light dark:border-border-dark">
        <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
            <span className="material-symbols-outlined text-primary">{icon}</span>
        </div>
        <div>
            <h3 className="font-bold text-gray-900 dark:text-white">{title}</h3>
            {subtitle && <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">{subtitle}</p>}
        </div>
    </div>
);

const Spinner = () => (
    <svg className="animate-spin h-5 w-5 text-primary" fill="none" viewBox="0 0 24 24">
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
    </svg>
);

// ─── Tab: Meta Global ─────────────────────────────────────────────────────────
const TabMetaGlobal = ({ toast }: { toast: (m: string, t?: ToastType) => void }) => {
    const [lideres, setLideres] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState<string | null>(null);
    const [metas, setMetas] = useState<Record<string, number>>({});
    const [globalMeta, setGlobalMeta] = useState('');
    const [applyingGlobal, setApplyingGlobal] = useState(false);
    const [search, setSearch] = useState('');
    const [confirmMeta, setConfirmMeta] = useState(false);

    useEffect(() => {
        const load = async () => {
            setLoading(true);
            try {
                const r = await axios.get(`${API}/lideres-resumen?pageSize=200`);
                const data = r.data.data;
                setLideres(data);
                const m: Record<string, number> = {};
                data.forEach((l: any) => { m[l.lider_id] = l.meta_cantidad; });
                setMetas(m);
            } catch { toast('Error cargando líderes', 'error'); }
            finally { setLoading(false); }
        };
        load();
    }, []);

    const saveMeta = async (lider_id: string) => {
        const val = metas[lider_id];
        if (!val || val < 1) { toast('La meta debe ser al menos 1', 'error'); return; }
        setSaving(lider_id);
        try {
            await axios.put(`${API}/lideres/${lider_id}`, { meta_cantidad: val });
            setLideres(prev => prev.map(l => l.lider_id === lider_id ? { ...l, meta_cantidad: val } : l));
            toast('Meta actualizada ✓', 'success');
        } catch { toast('Error al guardar la meta', 'error'); }
        finally { setSaving(null); }
    };

    const applyGlobal = async () => {
        const val = parseInt(globalMeta);
        if (!val || val < 1) { toast('Ingresa un valor válido (≥ 1)', 'error'); return; }
        setConfirmMeta(true);
    };

    const doApplyGlobal = async () => {
        const val = parseInt(globalMeta);
        setConfirmMeta(false);
        setApplyingGlobal(true);
        let ok = 0, fail = 0;
        for (const l of lideres) {
            try { await axios.put(`${API}/lideres/${l.lider_id}`, { meta_cantidad: val }); ok++; }
            catch { fail++; }
        }
        setLideres(prev => prev.map(l => ({ ...l, meta_cantidad: val })));
        setMetas(prev => { const c = { ...prev }; lideres.forEach(l => { c[l.lider_id] = val; }); return c; });
        toast(`${ok} líderes actualizados${fail ? ` (${fail} errores)` : ''}`, fail ? 'error' : 'success');
        setApplyingGlobal(false);
        setGlobalMeta('');
    };

    const filtered = lideres.filter(l =>
        l.nombre_completo.toLowerCase().includes(search.toLowerCase()) ||
        (l.sector_nombre || '').toLowerCase().includes(search.toLowerCase())
    );

    return (
        <div className="space-y-6">
            <ConfirmModal
                open={confirmMeta}
                title="¿Aplicar meta global?"
                message={`La nueva meta será ${globalMeta} personas para TODOS los líderes. Esta acción sobrescribe las metas individuales.`}
                confirmLabel="Sí, aplicar a todos"
                confirmColor="bg-amber-500 hover:bg-amber-600"
                onConfirm={doApplyGlobal}
                onCancel={() => setConfirmMeta(false)}
            />
            {/* Meta Global Masiva */}
            <Card>
                <SectionHeader icon="flag" title="Aplicar Meta Global" subtitle="Establece la misma meta para todos los líderes de una vez" />
                <div className="p-6">
                    <div className="flex gap-3 max-w-sm">
                        <input
                            type="number" min="1" placeholder="Ej. 50"
                            value={globalMeta}
                            onChange={e => setGlobalMeta(e.target.value)}
                            className="flex-1 rounded-lg border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white px-3 py-2 text-sm focus:border-primary focus:ring-1 focus:ring-primary outline-none"
                        />
                        <button onClick={applyGlobal} disabled={applyingGlobal || !globalMeta}
                            className="flex items-center gap-2 bg-primary text-white px-5 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors shadow-sm shadow-blue-500/30">
                            {applyingGlobal ? <Spinner /> : <span className="material-symbols-outlined text-lg">bolt</span>}
                            Aplicar a todos
                        </button>
                    </div>
                    <p className="text-xs text-amber-600 dark:text-amber-400 mt-3 flex items-center gap-1">
                        <span className="material-symbols-outlined text-sm">warning</span>
                        Esta acción sobreescribe la meta individual de cada líder.
                    </p>
                </div>
            </Card>

            {/* Meta Individual */}
            <Card>
                <SectionHeader icon="tune" title="Meta por Líder" subtitle="Edita la meta de cada líder individualmente" />
                <div className="p-4 border-b border-border-light dark:border-border-dark">
                    <div className="relative max-w-xs">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 material-symbols-outlined text-gray-400 text-xl">search</span>
                        <input
                            type="text" placeholder="Buscar líder..."
                            value={search} onChange={e => setSearch(e.target.value)}
                            className="pl-10 w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white px-3 py-2 text-sm focus:border-primary outline-none"
                        />
                    </div>
                </div>
                <div className="overflow-x-auto -mx-px">
                    {loading ? (
                        <div className="p-10 flex justify-center"><Spinner /></div>
                    ) : (
                        <table className="min-w-[600px] w-full text-sm">
                            <thead className="bg-gray-50 dark:bg-gray-800/50 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">
                                <tr>
                                    <th className="px-6 py-3 text-left">Líder</th>
                                    <th className="px-6 py-3 text-left">Sector</th>
                                    <th className="px-6 py-3 text-center w-24">Meta actual</th>
                                    <th className="px-6 py-3 text-center w-36">Nueva meta</th>
                                    <th className="px-6 py-3 w-20"></th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                                {filtered.map(l => (
                                    <tr key={l.lider_id} className="hover:bg-gray-50 dark:hover:bg-gray-800/30 transition-colors">
                                        <td className="px-6 py-3 font-medium text-gray-900 dark:text-white">{l.nombre_completo}</td>
                                        <td className="px-6 py-3 text-gray-500 dark:text-gray-400 text-xs">{l.sector_nombre}</td>
                                        <td className="px-6 py-3 text-center">
                                            <span className="bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 px-2.5 py-1 rounded-full text-xs font-bold">{l.meta_cantidad}</span>
                                        </td>
                                        <td className="px-6 py-3 text-center">
                                            <input
                                                type="number" min="1"
                                                value={metas[l.lider_id] ?? l.meta_cantidad}
                                                onChange={e => setMetas(prev => ({ ...prev, [l.lider_id]: parseInt(e.target.value) || 0 }))}
                                                className="w-24 text-center rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white py-1.5 text-sm focus:border-primary outline-none"
                                            />
                                        </td>
                                        <td className="px-6 py-3 text-right">
                                            <button
                                                onClick={() => saveMeta(l.lider_id)}
                                                disabled={saving === l.lider_id}
                                                className="flex items-center gap-1 ml-auto bg-primary/10 text-primary hover:bg-primary hover:text-white px-3 py-1.5 rounded-lg text-xs font-medium transition-colors disabled:opacity-50"
                                            >
                                                {saving === l.lider_id ? <Spinner /> : <span className="material-symbols-outlined text-base">save</span>}
                                                Guardar
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                    {!loading && filtered.length === 0 && (
                        <div className="py-12 text-center text-gray-400 dark:text-gray-500">
                            <span className="material-symbols-outlined text-4xl">search_off</span>
                            <p className="mt-2 text-sm">No se encontraron líderes</p>
                        </div>
                    )}
                </div>
            </Card>
        </div>
    );
};

// ─── Tab: Usuarios ────────────────────────────────────────────────────────────
const TabUsuarios = ({ toast }: { toast: (m: string, t?: ToastType) => void }) => {
    const userStr = localStorage.getItem('user');
    const currentUserRole = userStr ? JSON.parse(userStr).rol_nombre : '';

    const [form, setForm] = useState({
        persona_id: '', email_login: '', username: '', rol_nombre: 'Coordinador',
        generar_password_temporal: true, password: '',
    });
    const [saving, setSaving] = useState(false);
    const [searchQ, setSearchQ] = useState('');
    const [searchResults, setSearchResults] = useState<any[]>([]);
    const [searching, setSearching] = useState(false);
    const [resetCedula, setResetCedula] = useState('');
    const [resetting, setResetting] = useState(false);
    const [lastCreated, setLastCreated] = useState<{ login: string; password_temporal?: string } | null>(null);
    const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const [usuariosLista, setUsuariosLista] = useState<any[]>([]);
    const [loadingUsuarios, setLoadingUsuarios] = useState(true);

    const loadUsuarios = async () => {
        setLoadingUsuarios(true);
        try {
            const r = await axios.get(`${API}/usuarios/lista`, {
                headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
            });
            setUsuariosLista(r.data.data || []);
        } catch { toast('Error cargando lista de usuarios', 'error'); }
        finally { setLoadingUsuarios(false); }
    };

    useEffect(() => {
        loadUsuarios();
    }, []);

    useEffect(() => {
        if (searchQ.trim().length < 2) { setSearchResults([]); return; }
        if (timerRef.current) clearTimeout(timerRef.current);
        timerRef.current = setTimeout(async () => {
            setSearching(true);
            try {
                const r = await axios.get(`${API}/personas/buscar`, { params: { q: searchQ } });
                setSearchResults(r.data.data);
            } catch { /* silencioso */ }
            finally { setSearching(false); }
        }, 350);
        return () => { if (timerRef.current) clearTimeout(timerRef.current); };
    }, [searchQ]);

    const handleCreate = async () => {
        if (!form.persona_id) { toast('Selecciona una persona', 'error'); return; }
        if (!form.email_login && !form.username) { toast('Ingresa email o username', 'error'); return; }
        
        // --- Validación de Formato de Email ---
        if (form.email_login) {
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailRegex.test(form.email_login)) {
                toast('El formato del correo electrónico no es válido.', 'error');
                return;
            }
        }

        setSaving(true);
        try {
            const payload: any = {
                persona_id: form.persona_id,
                email_login: form.email_login || null,
                username: form.username || null,
                rol_nombre: form.rol_nombre,
                generar_password_temporal: form.generar_password_temporal,
                estado_usuario_nombre: 'Activo',
            };
            if (!form.generar_password_temporal && form.password) payload.password = form.password;
            const r = await axios.post(`${API}/usuarios`, payload);
            setLastCreated({ login: r.data.data.login, password_temporal: r.data.data.password_temporal });
            toast('Usuario creado exitosamente ✓', 'success');
            setForm({ persona_id: '', email_login: '', username: '', rol_nombre: 'Coordinador', generar_password_temporal: true, password: '' });
            setSearchQ(''); setSearchResults([]);
            loadUsuarios();
        } catch (e: any) {
            const msg = e.response?.data?.message || 'Error al crear usuario';
            toast(msg, 'error');
        } finally { setSaving(false); }
    };

    const handleReset = async () => {
        const cedula = resetCedula.replace(/\D/g, '');
        if (!cedula) { toast('Ingresa la cédula del usuario', 'error'); return; }
        setResetting(true);
        try {
            await axios.post(`${API}/usuarios/reset-by-cedula`, { cedula }, {
                headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
            });
            toast('Contraseña restablecida. El usuario deberá ingresar con Clave1234!', 'success');
            setResetCedula('');
        } catch (e: any) {
            toast(e.response?.data?.message || 'Error al resetear contraseña', 'error');
        } finally { setResetting(false); }
    };

    const roles = ['Coordinador', 'Sub-Lider'];

    return (
        <div className="space-y-6">
            {/* Crear usuario */}
            <Card>
                <SectionHeader icon="person_add" title="Crear Acceso de Usuario" subtitle="Vincula una persona existente a un rol de acceso al sistema" />
                <div className="p-6 space-y-5">
                    {/* Búsqueda de persona */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Buscar persona <span className="text-red-500">*</span></label>
                        <div className="relative">
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 material-symbols-outlined text-gray-400 text-xl">search</span>
                            <input type="text" placeholder="Nombre, teléfono o cédula..."
                                value={searchQ} onChange={e => setSearchQ(e.target.value)}
                                className="pl-10 w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white px-3 py-2 text-sm focus:border-primary outline-none"
                            />
                            {searching && <span className="absolute right-3 top-1/2 -translate-y-1/2"><Spinner /></span>}
                        </div>
                        {searchResults.length > 0 && (
                            <div className="mt-1 border border-gray-200 dark:border-gray-700 rounded-lg divide-y divide-gray-100 dark:divide-gray-700 max-h-48 overflow-y-auto">
                                {searchResults.map(p => (
                                    <button key={p.persona_id}
                                        onClick={() => { setForm(f => ({ ...f, persona_id: p.persona_id })); setSearchQ(p.nombre_completo); setSearchResults([]); }}
                                        className={`w-full text-left px-4 py-2.5 hover:bg-blue-50 dark:hover:bg-blue-900/20 flex items-center justify-between group transition-colors ${form.persona_id === p.persona_id ? 'bg-blue-50 dark:bg-blue-900/20' : ''}`}>
                                        <span>
                                            <p className="text-sm font-medium text-gray-900 dark:text-white">{p.nombre_completo}</p>
                                            <p className="text-xs text-gray-400">{p.telefono} · {p.sector_nombre}</p>
                                        </span>
                                        {p.is_lider && <span className="text-[10px] bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300 px-1.5 py-0.5 rounded font-semibold uppercase">SUB-LÍDER</span>}
                                    </button>
                                ))}
                            </div>
                        )}
                        {form.persona_id && (
                            <p className="text-xs text-green-600 dark:text-green-400 mt-1 flex items-center gap-1">
                                <span className="material-symbols-outlined text-sm">check_circle</span>
                                Persona seleccionada (ID: …{form.persona_id.slice(-8)})
                            </p>
                        )}
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Email de login</label>
                            <input type="email" placeholder="usuario@ejemplo.com"
                                value={form.email_login} onChange={e => setForm(f => ({ ...f, email_login: e.target.value }))}
                                className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white px-3 py-2 text-sm focus:border-primary outline-none"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Username (opcional)</label>
                            <input type="text" placeholder="usuario123"
                                value={form.username} onChange={e => setForm(f => ({ ...f, username: e.target.value }))}
                                className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white px-3 py-2 text-sm focus:border-primary outline-none"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Rol <span className="text-red-500">*</span></label>
                            <select value={form.rol_nombre} onChange={e => setForm(f => ({ ...f, rol_nombre: e.target.value }))}
                                className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white px-3 py-2 text-sm focus:border-primary outline-none">
                                {roles.map(r => <option key={r} value={r}>{r}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Contraseña</label>
                            <div className="flex items-center gap-3">
                                <label className="flex items-center gap-2 cursor-pointer">
                                    <input type="checkbox" checked={form.generar_password_temporal}
                                        onChange={e => setForm(f => ({ ...f, generar_password_temporal: e.target.checked }))}
                                        className="rounded border-gray-300 text-primary focus:ring-primary" />
                                    <span className="text-sm text-gray-600 dark:text-gray-400">Generar temporal</span>
                                </label>
                            </div>
                            {!form.generar_password_temporal && (
                                <input type="password" placeholder="Contraseña manual"
                                    value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                                    className="mt-2 w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white px-3 py-2 text-sm focus:border-primary outline-none"
                                />
                            )}
                        </div>
                    </div>

                    <div className="flex justify-end">
                        <button onClick={handleCreate} disabled={saving}
                            className="flex items-center gap-2 bg-primary text-white px-6 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors shadow-sm shadow-blue-500/30">
                            {saving ? <Spinner /> : <span className="material-symbols-outlined text-lg">person_add</span>}
                            Crear usuario
                        </button>
                    </div>

                    {lastCreated && (
                        <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-xl p-4">
                            <p className="text-sm font-semibold text-green-800 dark:text-green-200 flex items-center gap-2">
                                <span className="material-symbols-outlined">check_circle</span>
                                Usuario creado: <code className="font-mono">{lastCreated.login}</code>
                            </p>
                            {lastCreated.password_temporal && (
                                <p className="text-sm text-green-700 dark:text-green-300 mt-1">
                                    Contraseña temporal: <code className="font-mono bg-green-100 dark:bg-green-900/30 px-1.5 py-0.5 rounded font-bold">{lastCreated.password_temporal}</code>
                                    <span className="text-xs ml-2 opacity-70">(Comparte y solicita cambio)</span>
                                </p>
                            )}
                        </div>
                    )}
                </div>
            </Card>

            {/* Reset contraseña */}
            {currentUserRole?.toUpperCase() === 'ADMIN' && (
            <Card>
                <SectionHeader icon="lock_reset" title="Resetear Contraseña" subtitle="Restablece la contraseña de un usuario a Clave1234!" />
                <div className="p-6">
                    <p className="text-sm text-amber-600 dark:text-amber-400 font-medium mb-3 flex items-center gap-1">
                        <span className="material-symbols-outlined text-base">info</span>
                        La nueva contraseña será: <code className="font-mono bg-amber-100 dark:bg-amber-900/30 px-1.5 py-0.5 rounded ml-1">Clave1234!</code>
                    </p>
                    <div className="flex gap-3 max-w-lg">
                        <input
                            type="text"
                            inputMode="numeric"
                            placeholder="Cédula del usuario (Ej: 00100200300)"
                            value={resetCedula}
                            onChange={e => setResetCedula(e.target.value.replace(/\D/g, '').slice(0, 11))}
                            onKeyDown={e => {
                                if (!/[0-9]/.test(e.key) && !['Backspace','Delete','Tab','ArrowLeft','ArrowRight'].includes(e.key)) {
                                    e.preventDefault();
                                }
                            }}
                            maxLength={11}
                            className="flex-1 rounded-lg border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white px-3 py-2 text-sm focus:border-primary outline-none font-mono"
                        />
                        <button onClick={handleReset} disabled={resetting || !resetCedula.trim()}
                            className="flex items-center gap-2 bg-amber-500 text-white px-5 py-2 rounded-lg text-sm font-medium hover:bg-amber-600 disabled:opacity-50 transition-colors shadow-sm">
                            {resetting ? <Spinner /> : <span className="material-symbols-outlined text-lg">lock_reset</span>}
                            Resetear
                        </button>
                    </div>
                    <p className="text-xs text-gray-400 dark:text-gray-500 mt-2">
                        Ingresa la cédula de la persona cuyo acceso deseas restablecer.
                    </p>
                </div>
            </Card>
            )}

            {/* Lista de usuarios con acceso */}
            <Card>
                <SectionHeader icon="manage_accounts" title="Usuarios Activos" subtitle="Lista de usuarios con credenciales de acceso al sistema" />
                <div className="overflow-x-auto -mx-px">
                    {loadingUsuarios ? (
                        <div className="p-10 flex justify-center"><Spinner /></div>
                    ) : (
                        <table className="min-w-[800px] w-full text-sm">
                            <thead className="bg-gray-50 dark:bg-gray-800/50 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">
                                <tr>
                                    <th className="px-6 py-3 text-left">Nombre</th>
                                    <th className="px-6 py-3 text-left">Login / Username</th>
                                    <th className="px-6 py-3 text-left">Rol</th>
                                    <th className="px-6 py-3 text-left">Pertenece a</th>
                                    <th className="px-6 py-3 text-center">Estado</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                                {usuariosLista.map(u => (
                                    <tr key={u.usuario_id} className="hover:bg-gray-50 dark:hover:bg-gray-800/30 transition-colors">
                                        <td className="px-6 py-3 text-gray-900 dark:text-white">
                                            <div className="font-medium">{u.nombre_completo}</div>
                                            <div className="text-xs text-gray-500">{u.cedula}</div>
                                        </td>
                                        <td className="px-6 py-3 text-gray-900 dark:text-white">
                                            {u.email_login && <div>{u.email_login}</div>}
                                            {u.username && <div className="text-xs text-gray-500">@{u.username}</div>}
                                        </td>
                                        <td className="px-6 py-3">
                                            <span className="px-2.5 py-1 rounded-full text-xs font-bold border bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-900/30 dark:text-blue-300 dark:border-blue-800">
                                                {u.rol_nombre}
                                            </span>
                                        </td>
                                        <td className="px-6 py-3 text-gray-600 dark:text-gray-400 text-sm">
                                            {u.candidato || '—'}
                                        </td>
                                        <td className="px-6 py-3 text-center">
                                            {u.activo ? (
                                                <span className="px-2 py-1 bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300 rounded text-xs font-semibold">Activo</span>
                                            ) : (
                                                <span className="px-2 py-1 bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300 rounded text-xs font-semibold">Inactivo</span>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                                {usuariosLista.length === 0 && (
                                    <tr>
                                        <td colSpan={5} className="py-8 text-center text-gray-500 dark:text-gray-400 text-sm">
                                            No hay usuarios registrados
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    )}
                </div>
            </Card>
        </div>
    );
};

// ─── Tab: Catálogos ───────────────────────────────────────────────────────────
interface CatalogItem { id: string; nombre: string; }

const CatalogList = ({ title, icon, subtitle, items, loading }: {
    title: string; icon: string; subtitle?: string;
    items: CatalogItem[]; loading: boolean;
}) => (
    <Card>
        <SectionHeader icon={icon} title={title} subtitle={subtitle} />
        <div className="p-4">
            {loading ? (
                <div className="flex justify-center py-6"><Spinner /></div>
            ) : items.length === 0 ? (
                <p className="text-sm text-center text-gray-400 py-6">Sin registros</p>
            ) : (
                <div className="flex flex-wrap gap-2">
                    {items.map(it => (
                        <span key={it.id} className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded-full text-sm font-medium border border-gray-200 dark:border-gray-700">
                            <span className="w-2 h-2 rounded-full bg-primary/60 shrink-0"></span>
                            {it.nombre}
                        </span>
                    ))}
                </div>
            )}
        </div>
    </Card>
);

const TabCatalogos = () => {
    const [loading, setLoading] = useState(true);
    const [sectores, setSectores] = useState<CatalogItem[]>([]);
    const [niveles, setNiveles] = useState<CatalogItem[]>([]);
    const [estadosLider, setEstadosLider] = useState<CatalogItem[]>([]);
    const [estadosPersona, setEstadosPersona] = useState<CatalogItem[]>([]);
    const [fuentes, setFuentes] = useState<CatalogItem[]>([]);
    const [roles, setRoles] = useState<CatalogItem[]>([]);

    useEffect(() => {
        const load = async () => {
            setLoading(true);
            try {
                const [sec, niv, estL, estP, fue] = await Promise.all([
                    axios.get(`${API}/sectores`),
                    axios.get(`${API}/nivel-lider`),
                    axios.get(`${API}/estado-lider`),
                    axios.get(`${API}/estados-persona`),
                    axios.get(`${API}/fuentes`),
                ]);
                setSectores(sec.data.data.map((x: any) => ({ id: x.sector_id, nombre: x.nombre })));
                setNiveles(niv.data.data.map((x: any) => ({ id: x.nivel_lider_id, nombre: x.nombre })));
                setEstadosLider(estL.data.data.map((x: any) => ({ id: x.estado_lider_id, nombre: x.nombre })));
                setEstadosPersona(estP.data.data.map((x: any) => ({ id: x.estado_persona_id, nombre: x.nombre })));
                setFuentes(fue.data.data.map((x: any) => ({ id: x.fuente_id, nombre: x.nombre })));
                // Roles: hardcoded from what we know
                setRoles([
                    { id: '1', nombre: 'Admin' }, { id: '2', nombre: 'Coordinador' },
                    { id: '3', nombre: 'Sub-Lider' }
                ]);
            } catch { /* silencioso */ }
            finally { setLoading(false); }
        };
        load();
    }, []);

    return (
        <div className="space-y-5">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <CatalogList icon="map" title="Sectores" subtitle="Zonas geográficas del sistema" items={sectores} loading={loading} />
                <CatalogList icon="leaderboard" title="Niveles de Líder" subtitle="Jerarquía de líderes" items={niveles} loading={loading} />
                <CatalogList icon="swap_horiz" title="Estados de Líder" subtitle="Ciclos de vida de un líder" items={estadosLider} loading={loading} />
                <CatalogList icon="person" title="Estados de Persona" subtitle="Ciclos de vida de una persona" items={estadosPersona} loading={loading} />
                <CatalogList icon="hub" title="Fuentes de Captación" subtitle="Canales de registro" items={fuentes} loading={loading} />
                <CatalogList icon="badge" title="Roles del Sistema" subtitle="Niveles de acceso al sistema" items={roles} loading={loading} />
            </div>
            <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl p-4 flex items-start gap-3">
                <span className="material-symbols-outlined text-blue-500 shrink-0">info</span>
                <p className="text-sm text-blue-700 dark:text-blue-300">
                    Los catálogos son administrados directamente en la base de datos. Para agregar, modificar o eliminar valores, contacta al administrador de BD.
                </p>
            </div>
        </div>
    );
};

// ─── Tab: Sistema ─────────────────────────────────────────────────────────────
const TabSistema = () => {
    const [status, setStatus] = useState<'checking' | 'ok' | 'error'>('checking');
    const [dbInfo, setDbInfo] = useState<{ sectores: number; lideres: number; personas: number } | null>(null);

    useEffect(() => {
        const check = async () => {
            try {
                const [sec, lid, per] = await Promise.all([
                    axios.get(`${API}/sectores`),
                    axios.get(`${API}/lideres-resumen?pageSize=1`),
                    axios.get(`${API}/personas?pageSize=1`),
                ]);
                setDbInfo({
                    sectores: sec.data.data?.length ?? 0,
                    lideres: per.data.pagination?.total ?? 0,
                    personas: lid.data.pagination?.total ?? 0,
                });
                setStatus('ok');
            } catch {
                setStatus('error');
            }
        };
        check();
    }, []);

    const stats = [
        { label: 'Total Líderes', value: dbInfo?.lideres ?? '—', icon: 'supervisor_account', color: 'text-blue-600' },
        { label: 'Total Personas', value: dbInfo?.personas ?? '—', icon: 'groups', color: 'text-purple-600' },
        { label: 'Sectores activos', value: dbInfo?.sectores ?? '—', icon: 'map', color: 'text-green-600' },
    ];

    const infoRows = [
        { key: 'Aplicación', value: 'Partido360' },
        { key: 'Backend', value: 'Node.js + Express + PostgreSQL (Neon)' },
        { key: 'Frontend', value: 'React + TypeScript + Tailwind v4' },
        { key: 'Auth', value: 'JWT — 24h de expiración' },
        { key: 'Scope', value: 'CTE recursivo por árbol de líderes' },
        { key: 'Versión', value: 'v1.0.0 — Build estable' },
    ];

    return (
        <div className="space-y-6">
            {/* Estado del backend */}
            <Card>
                <SectionHeader icon="cloud_done" title="Estado del Servidor" subtitle="Conectividad con el backend y base de datos" />
                <div className="p-6">
                    <div className={`flex items-center gap-3 px-4 py-3 rounded-xl border text-sm font-medium
                        ${status === 'ok' ? 'bg-green-50 border-green-200 text-green-800 dark:bg-green-900/20 dark:border-green-800 dark:text-green-200' : ''}
                        ${status === 'error' ? 'bg-red-50 border-red-200 text-red-800 dark:bg-red-900/20 dark:border-red-800 dark:text-red-200' : ''}
                        ${status === 'checking' ? 'bg-gray-50 border-gray-200 text-gray-600 dark:bg-gray-800 dark:border-gray-700 dark:text-gray-300' : ''}
                    `}>
                        {status === 'checking' && <Spinner />}
                        <span className="material-symbols-outlined">
                            {status === 'ok' ? 'check_circle' : status === 'error' ? 'error' : 'sync'}
                        </span>
                        {status === 'ok' && 'Backend conectado y operativo'}
                        {status === 'error' && 'No se puede conectar al backend — verifica que el servidor esté corriendo'}
                        {status === 'checking' && 'Verificando conexión...'}
                    </div>
                </div>
            </Card>

            {/* Estadísticas rápidas */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {stats.map(s => (
                    <Card key={s.label} className="p-5 flex items-center gap-4">
                        <div className="w-12 h-12 rounded-xl bg-gray-100 dark:bg-gray-800 flex items-center justify-center shrink-0">
                            <span className={`material-symbols-outlined text-2xl ${s.color}`}>{s.icon}</span>
                        </div>
                        <div>
                            <p className="text-2xl font-bold text-gray-900 dark:text-white">{s.value}</p>
                            <p className="text-xs text-gray-500 dark:text-gray-400 font-medium">{s.label}</p>
                        </div>
                    </Card>
                ))}
            </div>

            {/* Info general */}
            <Card>
                <SectionHeader icon="info" title="Información del Sistema" />
                <div className="divide-y divide-gray-100 dark:divide-gray-700">
                    {infoRows.map(r => (
                        <div key={r.key} className="flex items-center justify-between px-6 py-3">
                            <span className="text-sm text-gray-500 dark:text-gray-400 font-medium">{r.key}</span>
                            <span className="text-sm text-gray-900 dark:text-white font-semibold">{r.value}</span>
                        </div>
                    ))}
                </div>
            </Card>

            {/* RBAC Info */}
            <Card>
                <SectionHeader icon="shield" title="Roles y Permisos (RBAC)" subtitle="Resumen de niveles de acceso del sistema" />
                <div className="p-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {[
                            { rol: 'ADMIN', color: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300 border-red-200', desc: 'Acceso total: lectura, escritura y administración de cualquier recurso.' },
                            { rol: 'COORDINADOR', color: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300 border-purple-200', desc: 'Acceso global de lectura y escritura. No puede inactivar líderes ajenos.' },
                            { rol: 'SUB_LIDER', color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300 border-blue-200', desc: 'Solo ve su árbol de descendientes (CTE recursivo). Edita solo su propia meta.' },
                        ].map(r => (
                            <div key={r.rol} className="flex items-start gap-3 p-3 bg-gray-50 dark:bg-gray-800/50 rounded-lg border border-gray-100 dark:border-gray-700">
                                <span className={`px-2 py-0.5 rounded-full text-xs font-bold border shrink-0 ${r.color}`}>{r.rol}</span>
                                <p className="text-xs text-gray-600 dark:text-gray-400">{r.desc}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </Card>
        </div>
    );
};

// ─── Tab: Sectores ────────────────────────────────────────────────────────────
const TabSectores = ({ toast }: { toast: (m: string, t?: ToastType) => void }) => {
  const [sectores, setSectores] = useState<{sector_id: string, nombre: string, activo: boolean}[]>([]);
  const [loading, setLoading] = useState(true);
  const [newNombre, setNewNombre] = useState('');
  const [editId, setEditId] = useState<string|null>(null);
  const [editNombre, setEditNombre] = useState('');
  const [saving, setSaving] = useState(false);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string|null>(null);
  const [deleting, setDeleting] = useState(false);

  const authHeader = { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } };

  const load = async () => {
    setLoading(true);
    try {
      const r = await axios.get(`${API}/sectores/todos`, authHeader);
      setSectores(r.data.data);
    } catch { toast('Error cargando centros', 'error'); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const handleAdd = async () => {
    if (!newNombre.trim()) return;
    setSaving(true);
    try {
      await axios.post(`${API}/sectores`, { nombre: newNombre }, authHeader);
      toast('Centro agregado ✓', 'success');
      setNewNombre('');
      load();
    } catch { toast('Error al agregar', 'error'); }
    finally { setSaving(false); }
  };

  const handleEdit = async (id: string) => {
    if (!editNombre.trim()) return;
    try {
      await axios.put(`${API}/sectores/${id}`, { nombre: editNombre }, authHeader);
      toast('Actualizado ✓', 'success');
      setEditId(null);
      load();
    } catch { toast('Error al actualizar', 'error'); }
  };

  const handleDelete = async () => {
    if (!confirmDeleteId) return;
    setDeleting(true);
    try {
      await axios.delete(`${API}/sectores/${confirmDeleteId}`, authHeader);
      toast('Centro de votación eliminado ✓', 'success');
      setSectores(prev => prev.filter(s => s.sector_id !== confirmDeleteId));
    } catch (e: any) {
      toast(e.response?.data?.message || 'Error al eliminar', 'error');
    } finally {
      setDeleting(false);
      setConfirmDeleteId(null);
    }
  };

  const confirmingNombre = sectores.find(s => s.sector_id === confirmDeleteId)?.nombre || '';

  return (
    <div className="space-y-6">
      <ConfirmModal
        open={!!confirmDeleteId}
        title="¿Eliminar centro de votación?"
        message={`"${confirmingNombre}" será eliminado permanentemente. Esta acción no se puede deshacer.`}
        confirmLabel={deleting ? 'Eliminando...' : 'Eliminar'}
        confirmColor="bg-red-600 hover:bg-red-700"
        onConfirm={handleDelete}
        onCancel={() => setConfirmDeleteId(null)}
      />
      <Card>
        <SectionHeader icon="add_location" title="Agregar Centro de Votación" subtitle="Registra un nuevo centro de votación en el sistema" />
        <div className="p-6 flex gap-3">
          <input
            type="text"
            placeholder="Nombre del centro de votación..."
            value={newNombre}
            onChange={e => setNewNombre(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleAdd()}
            className="flex-1 rounded-lg border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white px-3 py-2 text-sm focus:border-primary outline-none"
          />
          <button
            onClick={handleAdd}
            disabled={saving || !newNombre.trim()}
            className="flex items-center gap-2 bg-primary text-white px-5 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors shadow-sm">
            {saving ? <Spinner /> : <span className="material-symbols-outlined text-lg">add</span>}
            Agregar
          </button>
        </div>
      </Card>

      <Card>
        <SectionHeader icon="location_on" title="Centros Registrados" subtitle={`${sectores.length} total`} />
        <div className="divide-y divide-gray-100 dark:divide-gray-700">
          {loading ? (
            <div className="p-8 flex justify-center"><Spinner /></div>
          ) : sectores.length === 0 ? (
            <div className="p-8 text-center text-gray-400 text-sm">No hay centros registrados</div>
          ) : sectores.map(s => (
            <div key={s.sector_id} className="flex items-center gap-4 px-6 py-3 hover:bg-gray-50 dark:hover:bg-gray-800/30 transition-colors">
              {editId === s.sector_id ? (
                <>
                  <input
                    value={editNombre}
                    onChange={e => setEditNombre(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && handleEdit(s.sector_id)}
                    className="flex-1 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white px-3 py-1.5 text-sm focus:border-primary outline-none"
                    autoFocus
                  />
                  <button onClick={() => handleEdit(s.sector_id)} className="text-green-600 hover:text-green-700 font-semibold text-sm transition-colors">Guardar</button>
                  <button onClick={() => setEditId(null)} className="text-gray-400 hover:text-gray-600 text-sm transition-colors">Cancelar</button>
                </>
              ) : (
                <>
                  <span className="flex-1 text-sm font-medium text-gray-900 dark:text-white">{s.nombre}</span>
                  <button
                    onClick={() => { setEditId(s.sector_id); setEditNombre(s.nombre); }}
                    className="text-gray-400 hover:text-primary transition-colors"
                    title="Editar">
                    <span className="material-symbols-outlined text-xl">edit</span>
                  </button>
                  <button
                    onClick={() => setConfirmDeleteId(s.sector_id)}
                    className="text-gray-400 hover:text-red-600 transition-colors"
                    title="Eliminar">
                    <span className="material-symbols-outlined text-xl">delete</span>
                  </button>
                </>
              )}
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
};

// ─── Tab: Líderes ─────────────────────────────────────────────────────────────
const TabLideres = ({ toast }: { toast: (m: string, t?: ToastType) => void }) => {
  const [lideres, setLideres] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  const load = async () => {
    setLoading(true);
    try {
      const r = await axios.get(`${API}/lideres-resumen?pageSize=100`);
      setLideres(r.data.data);
    } catch { toast('Error cargando líderes', 'error'); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const filtered = lideres.filter(l =>
    l.nombre_completo.toLowerCase().includes(search.toLowerCase()) ||
    (l.sector_nombre || '').toLowerCase().includes(search.toLowerCase())
  );

  const handleToggle = async (liderId: string, estadoNombre: string) => {
    const isActivo = estadoNombre.toLowerCase() === 'activo';
    try {
      const estRes = await axios.get(`${API}/estado-lider`);
      const estados = estRes.data.data;
      const target = estados.find((e: any) => e.nombre.toLowerCase() === (isActivo ? 'inactivo' : 'activo'));
      if (!target) return;
      await axios.put(`${API}/lideres/${liderId}`, { estado_lider_id: target.estado_lider_id });
      toast(`Líder ${isActivo ? 'inactivado' : 'activado'} ✓`, 'success');
      load();
    } catch { toast('Error al cambiar estado', 'error'); }
  };

  const getProgressColor = (p: number) => p >= 100 ? 'bg-green-500' : p >= 50 ? 'bg-blue-500' : 'bg-red-400';

  return (
    <div className="space-y-6">
      <Card>
        <SectionHeader icon="supervisor_account" title="Mantenimiento de Líderes" subtitle="Gestiona el estado y progreso de todos los líderes" />
        <div className="p-4 border-b border-border-light dark:border-border-dark">
          <div className="relative max-w-xs">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 material-symbols-outlined text-gray-400 text-xl">search</span>
            <input
              type="text" placeholder="Buscar líder o sector..."
              value={search} onChange={e => setSearch(e.target.value)}
              className="pl-10 w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white px-3 py-2 text-sm focus:border-primary outline-none"
            />
          </div>
        </div>
        <div className="overflow-x-auto -mx-px">
          {loading ? (
            <div className="p-10 flex justify-center"><Spinner /></div>
          ) : (
            <table className="min-w-[650px] w-full text-sm">
              <thead className="bg-gray-50 dark:bg-gray-800/50 text-xs font-semibold text-gray-500 uppercase">
                <tr>
                  <th className="px-6 py-3 text-left">Líder</th>
                  <th className="px-6 py-3 text-left">Sector</th>
                  <th className="px-6 py-3 text-center">Meta</th>
                  <th className="px-6 py-3 text-center">Registrados</th>
                  <th className="px-6 py-3 w-48">Cumplimiento</th>
                  <th className="px-6 py-3 text-center">Estado</th>
                  <th className="px-6 py-3"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                {filtered.map(l => (
                  <tr key={l.lider_id} className="hover:bg-gray-50 dark:hover:bg-gray-800/30 transition-colors">
                    <td className="px-6 py-3 font-medium text-gray-900 dark:text-white">{l.nombre_completo}</td>
                    <td className="px-6 py-3 text-gray-500 text-xs">{l.sector_nombre}</td>
                    <td className="px-6 py-3 text-center">{l.meta_cantidad}</td>
                    <td className="px-6 py-3 text-center font-bold text-gray-900 dark:text-white">{l.total_reclutados}</td>
                    <td className="px-6 py-3">
                      <div className="flex items-center gap-2">
                        <div className="flex-1 bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                          <div className={`h-2 rounded-full ${getProgressColor(l.porcentaje_cumplimiento)}`} style={{ width: `${Math.min(100, l.porcentaje_cumplimiento)}%` }} />
                        </div>
                        <span className="text-xs font-bold w-10 text-right">{l.porcentaje_cumplimiento}%</span>
                      </div>
                    </td>
                    <td className="px-6 py-3 text-center">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-semibold border ${l.estado_nombre?.toLowerCase() === 'activo' ? 'bg-green-100 text-green-800 border-green-200' : 'bg-gray-100 text-gray-600 border-gray-200'}`}>
                        {l.estado_nombre}
                      </span>
                    </td>
                    <td className="px-6 py-3 text-right">
                      <button
                        onClick={() => handleToggle(l.lider_id, l.estado_nombre)}
                        className={`text-xs font-medium px-3 py-1.5 rounded-lg transition-colors ${l.estado_nombre?.toLowerCase() === 'activo' ? 'bg-red-50 text-red-600 hover:bg-red-100' : 'bg-green-50 text-green-600 hover:bg-green-100'}`}>
                        {l.estado_nombre?.toLowerCase() === 'activo' ? 'Inactivar' : 'Activar'}
                      </button>
                    </td>
                  </tr>
                ))}
                {filtered.length === 0 && !loading && (
                  <tr><td colSpan={7} className="py-8 text-center text-gray-400 text-sm">No se encontraron líderes</td></tr>
                )}
              </tbody>
            </table>
          )}
        </div>
      </Card>
    </div>
  );
};

// ─── TabCandidatos ────────────────────────────────────────────────────────────
const TabCandidatos = ({ toast }: { toast: (m: string, t?: ToastType) => void }) => {
  const [candidatos, setCandidatos] = useState<{candidato_id: string, nombre: string, descripcion: string, activo: boolean}[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [showAdminForm, setShowAdminForm] = useState<string|null>(null);
  const [saving, setSaving] = useState(false);
  const [editId, setEditId] = useState<string|null>(null);
  const [form, setForm] = useState({ nombre: '', descripcion: '' });
  const [adminForm, setAdminForm] = useState({
    nombres: '', apellidos: '', cedula: '', telefono: '', email_login: '', password: ''
  });
  const [showAdminPass, setShowAdminPass] = useState(false);
  const userStr = localStorage.getItem('user');
  const currentUserRole = userStr ? JSON.parse(userStr).rol_nombre : '';
  const load = async () => {
    setLoading(true);
    try {
      const r = await axios.get(`${API}/candidatos`);
      setCandidatos(r.data.data);
    } catch { toast('Error cargando candidatos', 'error'); }
    finally { setLoading(false); }
  };
  useEffect(() => { load(); }, []);
  const handleSave = async () => {
    if (!form.nombre.trim()) { toast('El nombre es obligatorio', 'error'); return; }
    setSaving(true);
    try {
      if (editId) {
        await axios.put(`${API}/candidatos/${editId}`, form);
        toast('Candidato actualizado ✓', 'success');
        setEditId(null);
      } else {
        await axios.post(`${API}/candidatos`, form);
        toast('Candidato creado ✓', 'success');
        setShowForm(false);
      }
      setForm({ nombre: '', descripcion: '' });
      load();
    } catch { toast('Error al guardar', 'error'); }
    finally { setSaving(false); }
  };
  const handleToggle = async (id: string, activo: boolean) => {
    try {
      await axios.put(`${API}/candidatos/${id}`, { activo: !activo });
      toast(`Candidato ${!activo ? 'activado' : 'desactivado'} ✓`, 'success');
      load();
    } catch { toast('Error', 'error'); }
  };
  const handleCreateAdmin = async (candidatoId: string) => {
    const { nombres, apellidos, telefono, email_login, password } = adminForm;
    if (!nombres || !apellidos || !telefono || !email_login || !password) {
      toast('Todos los campos del admin son obligatorios', 'error'); return;
    }
    setSaving(true);
    try {
      await axios.post(`${API}/candidatos/${candidatoId}/admin`, adminForm);
      toast('Admin del candidato creado ✓', 'success');
      setShowAdminForm(null);
      setAdminForm({ nombres: '', apellidos: '', cedula: '', telefono: '', email_login: '', password: '' });
    } catch (e: any) {
      toast(e.response?.data?.message || 'Error al crear admin', 'error');
    } finally { setSaving(false); }
  };
  if (currentUserRole?.toUpperCase() !== 'ADMIN') {
    return (
      <Card>
        <div className="p-8 text-center text-gray-400">
          <span className="material-symbols-outlined text-4xl mb-2 block">lock</span>
          <p className="text-sm">Solo el Super Admin puede gestionar candidatos</p>
        </div>
      </Card>
    );
  }
  return (
    <div className="space-y-6">
      <Card>
        <SectionHeader icon="how_to_vote" title="Gestión de Candidatos" subtitle="Administra los candidatos políticos del sistema" />
        <div className="p-6">
          {!showForm && !editId && (
            <button onClick={() => setShowForm(true)}
              className="flex items-center gap-2 bg-primary text-white px-5 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors shadow-sm">
              <span className="material-symbols-outlined text-lg">add</span>
              Nuevo Candidato
            </button>
          )}
          {(showForm || editId) && (
            <div className="bg-gray-50 dark:bg-gray-800/50 rounded-xl p-5 space-y-4 border border-gray-200 dark:border-gray-700">
              <h4 className="font-semibold text-gray-900 dark:text-white">
                {editId ? 'Editar Candidato' : 'Nuevo Candidato'}
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Nombre *</label>
                  <input type="text" placeholder="Ej: Juan Pérez para Alcalde"
                    value={form.nombre} onChange={e => setForm(p => ({...p, nombre: e.target.value}))}
                    className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white px-3 py-2 text-sm focus:border-primary outline-none" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Descripción</label>
                  <input type="text" placeholder="Ej: Candidato a Alcalde de Santiago"
                    value={form.descripcion} onChange={e => setForm(p => ({...p, descripcion: e.target.value}))}
                    className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white px-3 py-2 text-sm focus:border-primary outline-none" />
                </div>
              </div>
              <div className="flex gap-3">
                <button onClick={handleSave} disabled={saving}
                  className="flex items-center gap-2 bg-primary text-white px-5 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors">
                  {saving ? <Spinner /> : <span className="material-symbols-outlined text-lg">save</span>}
                  {editId ? 'Guardar Cambios' : 'Crear Candidato'}
                </button>
                <button onClick={() => { setShowForm(false); setEditId(null); setForm({ nombre: '', descripcion: '' }); }}
                  className="px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors">
                  Cancelar
                </button>
              </div>
            </div>
          )}
        </div>
      </Card>
      <Card>
        <SectionHeader icon="ballot" title="Candidatos Registrados" subtitle={`${candidatos.filter(c => c.activo).length} activos de ${candidatos.length} total`} />
        <div className="divide-y divide-gray-100 dark:divide-gray-700">
          {loading ? <div className="p-8 flex justify-center"><Spinner /></div> :
            candidatos.length === 0 ? <div className="p-8 text-center text-gray-400 text-sm">No hay candidatos registrados</div> :
            candidatos.map(c => (
              <div key={c.candidato_id} className="p-5 hover:bg-gray-50 dark:hover:bg-gray-800/30 transition-colors">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-1">
                      <span className="font-semibold text-gray-900 dark:text-white">{c.nombre}</span>
                      <span className={`text-xs px-2 py-0.5 rounded-full font-semibold border ${c.activo ? 'bg-green-100 text-green-700 border-green-200' : 'bg-gray-100 text-gray-500 border-gray-200'}`}>
                        {c.activo ? 'Activo' : 'Inactivo'}
                      </span>
                    </div>
                    {c.descripcion && <p className="text-xs text-gray-500">{c.descripcion}</p>}
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <button
                      onClick={() => { setEditId(c.candidato_id); setShowForm(false); setForm({ nombre: c.nombre, descripcion: c.descripcion || '' }); }}
                      className="text-gray-400 hover:text-primary transition-colors" title="Editar">
                      <span className="material-symbols-outlined text-xl">edit</span>
                    </button>
                    <button onClick={() => handleToggle(c.candidato_id, c.activo)}
                      className={`transition-colors ${c.activo ? 'text-gray-400 hover:text-red-500' : 'text-gray-400 hover:text-green-500'}`}>
                      <span className="material-symbols-outlined text-xl">{c.activo ? 'toggle_on' : 'toggle_off'}</span>
                    </button>
                    <button
                      onClick={() => setShowAdminForm(showAdminForm === c.candidato_id ? null : c.candidato_id)}
                      className="flex items-center gap-1 text-xs font-medium bg-purple-50 text-purple-600 hover:bg-purple-100 px-3 py-1.5 rounded-lg transition-colors" title="Crear Admin">
                      <span className="material-symbols-outlined text-base">manage_accounts</span>
                      Crear Admin
                    </button>
                  </div>
                </div>
                {showAdminForm === c.candidato_id && (
                  <div className="mt-4 bg-purple-50 dark:bg-purple-900/10 rounded-xl p-4 border border-purple-200 dark:border-purple-800 space-y-3">
                    <h5 className="text-sm font-bold text-purple-800 dark:text-purple-300 flex items-center gap-2">
                      <span className="material-symbols-outlined text-base">admin_panel_settings</span>
                      Crear Administrador para: {c.nombre}
                    </h5>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {/* Nombres */}
                      <div>
                        <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Nombres *</label>
                        <input type="text" placeholder="Juan"
                          value={adminForm.nombres}
                          onChange={e => setAdminForm(p => ({...p, nombres: e.target.value}))}
                          onKeyDown={e => { const allowed=['Backspace','Delete','Tab','ArrowLeft','ArrowRight',' ']; if(!/^[a-zA-ZáéíóúÁÉÍÓÚñÑüÜ]$/.test(e.key)&&!allowed.includes(e.key)) e.preventDefault(); }}
                          className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white px-3 py-2 text-sm focus:border-primary outline-none" />
                      </div>
                      {/* Apellidos */}
                      <div>
                        <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Apellidos *</label>
                        <input type="text" placeholder="Pérez"
                          value={adminForm.apellidos}
                          onChange={e => setAdminForm(p => ({...p, apellidos: e.target.value}))}
                          onKeyDown={e => { const allowed=['Backspace','Delete','Tab','ArrowLeft','ArrowRight',' ']; if(!/^[a-zA-ZáéíóúÁÉÍÓÚñÑüÜ]$/.test(e.key)&&!allowed.includes(e.key)) e.preventDefault(); }}
                          className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white px-3 py-2 text-sm focus:border-primary outline-none" />
                      </div>
                      {/* Cédula */}
                      <div>
                        <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Cédula</label>
                        <input type="text" placeholder="00000000000" inputMode="numeric" maxLength={11}
                          value={adminForm.cedula}
                          onChange={e => setAdminForm(p => ({...p, cedula: e.target.value.replace(/\D/g,'')}))}
                          onKeyDown={e => { const allowed=['Backspace','Delete','Tab','ArrowLeft','ArrowRight']; if(!/^[0-9]$/.test(e.key)&&!allowed.includes(e.key)) e.preventDefault(); }}
                          className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white px-3 py-2 text-sm focus:border-primary outline-none" />
                      </div>
                      {/* Teléfono */}
                      <div>
                        <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Teléfono *</label>
                        <input type="text" placeholder="8090000000" inputMode="numeric" maxLength={10}
                          value={adminForm.telefono}
                          onChange={e => setAdminForm(p => ({...p, telefono: e.target.value.replace(/\D/g,'')}))}
                          onKeyDown={e => { const allowed=['Backspace','Delete','Tab','ArrowLeft','ArrowRight']; if(!/^[0-9]$/.test(e.key)&&!allowed.includes(e.key)) e.preventDefault(); }}
                          className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white px-3 py-2 text-sm focus:border-primary outline-none" />
                      </div>
                      {/* Email */}
                      <div>
                        <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Email de acceso *</label>
                        <input type="text" placeholder="admin@candidato.com"
                          value={adminForm.email_login}
                          onChange={e => setAdminForm(p => ({...p, email_login: e.target.value}))}
                          className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white px-3 py-2 text-sm focus:border-primary outline-none" />
                      </div>
                      {/* Contraseña con toggle */}
                      <div>
                        <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Contraseña inicial *</label>
                        <div className="relative">
                          <input
                            type={showAdminPass ? 'text' : 'password'}
                            placeholder="Mínimo 8 caracteres"
                            value={adminForm.password}
                            onChange={e => setAdminForm(p => ({...p, password: e.target.value}))}
                            className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white px-3 py-2 text-sm focus:border-primary outline-none pr-10"
                          />
                          <button type="button" onClick={() => setShowAdminPass(v => !v)}
                            className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors">
                            <span className="material-symbols-outlined text-lg">{showAdminPass ? 'visibility_off' : 'visibility'}</span>
                          </button>
                        </div>
                      </div>
                    </div>
                    <div className="flex gap-3 pt-1">
                      <button onClick={() => handleCreateAdmin(c.candidato_id)} disabled={saving}
                        className="flex items-center gap-2 bg-purple-600 text-white px-5 py-2 rounded-lg text-sm font-medium hover:bg-purple-700 disabled:opacity-50 transition-colors">
                        {saving ? <Spinner /> : <span className="material-symbols-outlined text-lg">person_add</span>}
                        Crear Administrador
                      </button>
                      <button onClick={() => setShowAdminForm(null)}
                        className="px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors">
                        Cancelar
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))
          }
        </div>
      </Card>
    </div>
  );
};

// ─── TabFuentes ───────────────────────────────────────────────────────────────
const TabFuentes = ({ toast }: { toast: (m: string, t?: ToastType) => void }) => {
  const [fuentes, setFuentes] = useState<{fuente_id: string, nombre: string, activo: boolean}[]>([]);
  const [loading, setLoading] = useState(true);
  const [newNombre, setNewNombre] = useState('');
  const [editId, setEditId] = useState<string|null>(null);
  const [editNombre, setEditNombre] = useState('');
  const [saving, setSaving] = useState(false);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string|null>(null);
  const [deleting, setDeleting] = useState(false);

  const authHeader = { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } };

  const load = async () => {
    setLoading(true);
    try {
      const r = await axios.get(`${API}/fuentes/todas`, authHeader);
      setFuentes(r.data.data);
    } catch { toast('Error cargando fuentes', 'error'); }
    finally { setLoading(false); }
  };
  useEffect(() => { load(); }, []);

  const handleAdd = async () => {
    if (!newNombre.trim()) return;
    setSaving(true);
    try {
      await axios.post(`${API}/fuentes`, { nombre: newNombre }, authHeader);
      toast('Fuente agregada ✓', 'success');
      setNewNombre('');
      load();
    } catch { toast('Error al agregar', 'error'); }
    finally { setSaving(false); }
  };

  const handleEdit = async (id: string) => {
    if (!editNombre.trim()) return;
    try {
      await axios.put(`${API}/fuentes/${id}`, { nombre: editNombre }, authHeader);
      toast('Actualizado ✓', 'success');
      setEditId(null);
      load();
    } catch { toast('Error al actualizar', 'error'); }
  };

  const handleDelete = async () => {
    if (!confirmDeleteId) return;
    setDeleting(true);
    try {
      await axios.delete(`${API}/fuentes/${confirmDeleteId}`, authHeader);
      toast('Fuente eliminada ✓', 'success');
      setFuentes(prev => prev.filter(f => f.fuente_id !== confirmDeleteId));
    } catch (e: any) {
      toast(e.response?.data?.message || 'Error al eliminar', 'error');
    } finally {
      setDeleting(false);
      setConfirmDeleteId(null);
    }
  };

  const confirmingNombre = fuentes.find(f => f.fuente_id === confirmDeleteId)?.nombre || '';

  return (
    <div className="space-y-6">
      <ConfirmModal
        open={!!confirmDeleteId}
        title="¿Eliminar fuente de captación?"
        message={`"${confirmingNombre}" será eliminada permanentemente. Esta acción no se puede deshacer.`}
        confirmLabel={deleting ? 'Eliminando...' : 'Eliminar'}
        confirmColor="bg-red-600 hover:bg-red-700"
        onConfirm={handleDelete}
        onCancel={() => setConfirmDeleteId(null)}
      />
      <Card>
        <SectionHeader icon="add_circle" title="Agregar Fuente de Captación" subtitle="Registra un nuevo canal de captación" />
        <div className="p-6 flex gap-3">
          <input
            type="text" placeholder="Ej: Puerta a Puerta, Redes Sociales..."
            value={newNombre} onChange={e => setNewNombre(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleAdd()}
            className="flex-1 rounded-lg border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white px-3 py-2 text-sm focus:border-primary outline-none"
          />
          <button onClick={handleAdd} disabled={saving || !newNombre.trim()}
            className="flex items-center gap-2 bg-primary text-white px-5 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors shadow-sm">
            {saving ? <Spinner /> : <span className="material-symbols-outlined text-lg">add</span>}
            Agregar
          </button>
        </div>
      </Card>
      <Card>
        <SectionHeader icon="hub" title="Fuentes Registradas" subtitle={`${fuentes.length} total`} />
        <div className="divide-y divide-gray-100 dark:divide-gray-700">
          {loading ? <div className="p-8 flex justify-center"><Spinner /></div> :
            fuentes.length === 0 ? <div className="p-8 text-center text-gray-400 text-sm">No hay fuentes registradas</div> :
            fuentes.map(f => (
              <div key={f.fuente_id} className="flex items-center gap-4 px-6 py-3 hover:bg-gray-50 dark:hover:bg-gray-800/30 transition-colors">
                {editId === f.fuente_id ? (
                  <>
                    <input value={editNombre} onChange={e => setEditNombre(e.target.value)}
                      onKeyDown={e => e.key === 'Enter' && handleEdit(f.fuente_id)}
                      className="flex-1 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white px-3 py-1.5 text-sm focus:border-primary outline-none"
                      autoFocus />
                    <button onClick={() => handleEdit(f.fuente_id)} className="text-green-600 hover:text-green-700 font-semibold text-sm">Guardar</button>
                    <button onClick={() => setEditId(null)} className="text-gray-400 hover:text-gray-600 text-sm">Cancelar</button>
                  </>
                ) : (
                  <>
                    <span className="flex-1 text-sm font-medium text-gray-900 dark:text-white">{f.nombre}</span>
                    <button onClick={() => { setEditId(f.fuente_id); setEditNombre(f.nombre); }}
                      className="text-gray-400 hover:text-primary transition-colors" title="Editar">
                      <span className="material-symbols-outlined text-xl">edit</span>
                    </button>
                    <button onClick={() => setConfirmDeleteId(f.fuente_id)}
                      className="text-gray-400 hover:text-red-600 transition-colors" title="Eliminar">
                      <span className="material-symbols-outlined text-xl">delete</span>
                    </button>
                  </>
                )}
              </div>
            ))
          }
        </div>
      </Card>
    </div>
  );
};

// ─── Main ─────────────────────────────────────────────────────────────────────
const Ajustes = () => {
    // Rol debe calcularse ANTES del primer useState para poder usarlo como valor inicial
    const userObj = JSON.parse(localStorage.getItem('user') || '{}');
    const isSuperAdmin = userObj?.rol_nombre?.toUpperCase() === 'ADMIN' &&
                         userObj?.candidato_id === '00000000-0000-0000-0000-000000000001';

    const [activeTab, setActiveTab] = useState<Tab>(isSuperAdmin ? 'candidatos' : 'meta');
    const [toasts, setToasts] = useState<Toast[]>([]);
    const toastIdRef = useRef(0);

    const TABS: TabDef[] = [
        ...(isSuperAdmin ? [{ id: 'candidatos' as Tab, label: 'Candidatos', icon: 'how_to_vote' }] : []),
        { id: 'meta' as Tab, label: 'Meta Global', icon: 'flag' },
        { id: 'usuarios' as Tab, label: 'Usuarios', icon: 'manage_accounts' },
        { id: 'lideres' as Tab, label: 'Líderes', icon: 'people' },
        { id: 'sectores' as Tab, label: 'Centros Votación', icon: 'location_on' },
        { id: 'fuentes' as Tab, label: 'Fuentes', icon: 'source' },
        { id: 'catalogos' as Tab, label: 'Catálogos', icon: 'category' },
        { id: 'sistema' as Tab, label: 'Sistema', icon: 'settings' },
    ];

    const toast = (message: string, type: ToastType = 'success') => {
        const id = ++toastIdRef.current;
        setToasts(prev => [...prev, { id, message, type }]);
        setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), TOAST_MS);
    };

    return (
        <div className="flex-1 overflow-y-auto bg-background-light dark:bg-background-dark p-4 md:p-8 w-full h-full">
            <ToastContainer toasts={toasts} onRemove={id => setToasts(prev => prev.filter(t => t.id !== id))} />

            <div className="max-w-5xl mx-auto space-y-6">
                {/* Header */}
                <div>
                    <div className="hidden md:flex items-center text-sm text-gray-500 dark:text-gray-400 gap-2 mb-2">
                        <span className="hover:text-primary cursor-pointer" onClick={() => window.location.hash = 'dashboard'}>Dashboard</span>
                        <span className="material-symbols-outlined text-base">chevron_right</span>
                        <span className="text-primary font-medium">Ajustes</span>
                    </div>
                    <h1 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white tracking-tight">Ajustes</h1>
                    <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Configuración global del sistema Partido360</p>
                </div>

                {/* Tabs */}
                <div className="flex gap-1 bg-gray-100 dark:bg-gray-800 p-1 rounded-xl overflow-x-auto">
                    {TABS.map(tab => (
                        <button key={tab.id} onClick={() => setActiveTab(tab.id)}
                            className={`flex-none px-4 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-medium transition-all whitespace-nowrap
                                ${activeTab === tab.id
                                    ? 'bg-white dark:bg-card-dark text-primary shadow-sm'
                                    : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
                                }`}>
                            <span className="material-symbols-outlined text-xl">{tab.icon}</span>
                            <span className="hidden sm:inline">{tab.label}</span>
                        </button>
                    ))}
                </div>

                {/* Tab Content */}
                {activeTab === 'candidatos' && <TabCandidatos toast={toast} />}
                {activeTab === 'meta' && <TabMetaGlobal toast={toast} />}
                {activeTab === 'usuarios' && <TabUsuarios toast={toast} />}
                {activeTab === 'catalogos' && <TabCatalogos />}
                {activeTab === 'sistema' && <TabSistema />}
                {activeTab === 'sectores' && <TabSectores toast={toast} />}
                {activeTab === 'lideres' && <TabLideres toast={toast} />}
                {activeTab === 'fuentes' && <TabFuentes toast={toast} />}

                <div className="h-10" />
            </div>
        </div>
    );
};

export default Ajustes;
