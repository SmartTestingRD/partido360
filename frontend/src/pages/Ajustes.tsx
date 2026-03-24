import { useState, useEffect, useRef } from 'react';
import axios from 'axios';

const API = import.meta.env.VITE_API_URL || '/api';

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
type Tab = 'meta' | 'usuarios' | 'catalogos' | 'sistema' | 'candidatos';

interface TabDef { id: Tab; label: string; icon: string; }
const BASE_TABS: TabDef[] = [
    { id: 'meta', label: 'Meta Global', icon: 'flag' },
    { id: 'usuarios', label: 'Usuarios', icon: 'manage_accounts' },
    { id: 'catalogos', label: 'Catálogos', icon: 'category' },
    { id: 'sistema', label: 'Sistema', icon: 'settings' },
];

// ─── Helper: rol desde localStorage ─────────────────────────────────────────
function getRolFromStorage(): string {
    try { return JSON.parse(localStorage.getItem('user') || '{}').rol_nombre || ''; }
    catch { return ''; }
}

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
        if (!window.confirm(`¿Aplicar meta de ${val} a TODOS los líderes?`)) return;
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
                <div className="overflow-x-auto">
                    {loading ? (
                        <div className="p-10 flex justify-center"><Spinner /></div>
                    ) : (
                        <table className="w-full text-sm">
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
    const [form, setForm] = useState({
        persona_id: '', email_login: '', username: '', rol_nombre: 'Lider',
        generar_password_temporal: true, password: '',
    });
    const [saving, setSaving] = useState(false);
    const [searchQ, setSearchQ] = useState('');
    const [searchResults, setSearchResults] = useState<any[]>([]);
    const [searching, setSearching] = useState(false);
    const [resetId, setResetId] = useState('');
    const [resetting, setResetting] = useState(false);
    const [lastCreated, setLastCreated] = useState<{ login: string; password_temporal?: string } | null>(null);
    const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

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
            setForm({ persona_id: '', email_login: '', username: '', rol_nombre: 'Lider', generar_password_temporal: true, password: '' });
            setSearchQ(''); setSearchResults([]);
        } catch (e: any) {
            const msg = e.response?.data?.message || 'Error al crear usuario';
            toast(msg, 'error');
        } finally { setSaving(false); }
    };

    const handleReset = async () => {
        if (!resetId.trim()) { toast('Ingresa el ID del usuario', 'error'); return; }
        setResetting(true);
        try {
            const r = await axios.post(`${API}/usuarios/${resetId}/reset-password`, { generar_password_temporal: true });
            toast(`Contraseña reseteada. Temporal: ${r.data.data.password_temporal}`, 'info');
        } catch (e: any) {
            toast(e.response?.data?.message || 'Error al resetear contraseña', 'error');
        } finally { setResetting(false); }
    };

    const roles = ['Admin', 'Coordinador', 'Lider', 'Operador'];

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
                                        {p.is_lider && <span className="text-[10px] bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300 px-1.5 py-0.5 rounded font-semibold">LÍDER</span>}
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
            <Card>
                <SectionHeader icon="lock_reset" title="Resetear Contraseña" subtitle="Genera una nueva contraseña temporal para un usuario por su ID" />
                <div className="p-6">
                    <div className="flex gap-3 max-w-lg">
                        <input type="text" placeholder="ID del usuario (UUID)"
                            value={resetId} onChange={e => setResetId(e.target.value)}
                            className="flex-1 rounded-lg border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white px-3 py-2 text-sm focus:border-primary outline-none font-mono"
                        />
                        <button onClick={handleReset} disabled={resetting || !resetId.trim()}
                            className="flex items-center gap-2 bg-amber-500 text-white px-5 py-2 rounded-lg text-sm font-medium hover:bg-amber-600 disabled:opacity-50 transition-colors shadow-sm">
                            {resetting ? <Spinner /> : <span className="material-symbols-outlined text-lg">lock_reset</span>}
                            Resetear
                        </button>
                    </div>
                    <p className="text-xs text-gray-400 dark:text-gray-500 mt-2">
                        El ID lo encuentras en la tabla <code className="bg-gray-100 dark:bg-gray-800 px-1 rounded">usuarios</code> o en el perfil de la persona.
                    </p>
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
                    { id: '3', nombre: 'Lider' }, { id: '4', nombre: 'Operador' },
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
        { key: 'Aplicación', value: 'SIGED360' },
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
                            { rol: 'LIDER', color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300 border-blue-200', desc: 'Solo ve su árbol de descendientes (CTE recursivo). Edita solo su propia meta.' },
                            { rol: 'OPERADOR', color: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300 border-green-200', desc: 'Alias de COORDINADOR (legacy). Mismos permisos.' },
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

// ─── Tab: Candidatos (solo ADMIN) ─────────────────────────────────────────────
const TabCandidatos = ({ toast }: { toast: (m: string, t?: ToastType) => void }) => {
    const [candidatos, setCandidatos] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [nombre, setNombre] = useState('');
    const [descripcion, setDescripcion] = useState('');
    const [saving, setSaving] = useState(false);

    const load = async () => {
        setLoading(true);
        try {
            const r = await axios.get(`${API}/candidatos`);
            setCandidatos(r.data.data || []);
        } catch { toast('Error cargando candidatos', 'error'); }
        finally { setLoading(false); }
    };

    useEffect(() => { load(); }, []);

    const handleCreate = async () => {
        if (!nombre.trim()) { toast('El nombre es requerido', 'error'); return; }
        setSaving(true);
        try {
            await axios.post(`${API}/candidatos`, { nombre: nombre.trim(), descripcion: descripcion.trim() || null });
            toast('Candidato creado ✓', 'success');
            setNombre(''); setDescripcion('');
            load();
        } catch (e: any) {
            toast(e.response?.data?.message || 'Error al crear candidato', 'error');
        } finally { setSaving(false); }
    };

    const toggleActivo = async (id: string, activo: boolean) => {
        try {
            await axios.patch(`${API}/candidatos/${id}`, { activo: !activo });
            setCandidatos(prev => prev.map(c => c.candidato_id === id ? { ...c, activo: !activo } : c));
            toast(`Candidato ${!activo ? 'activado' : 'desactivado'} ✓`);
        } catch { toast('Error al actualizar candidato', 'error'); }
    };

    return (
        <div className="space-y-6">
            <Card>
                <SectionHeader icon="how_to_vote" title="Nuevo Candidato" subtitle="Agrega un candidato/cliente al sistema" />
                <div className="p-6 space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Nombre <span className="text-red-500">*</span></label>
                        <input type="text" placeholder="Ej. Juan Pérez" value={nombre} onChange={e => setNombre(e.target.value)}
                            className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white px-3 py-2 text-sm focus:border-primary outline-none" />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Descripción</label>
                        <input type="text" placeholder="Cargo, partido, referencia..." value={descripcion} onChange={e => setDescripcion(e.target.value)}
                            className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white px-3 py-2 text-sm focus:border-primary outline-none" />
                    </div>
                    <button onClick={handleCreate} disabled={saving || !nombre.trim()}
                        className="flex items-center gap-2 bg-primary text-white px-5 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors shadow-sm shadow-blue-500/30">
                        {saving ? <Spinner /> : <span className="material-symbols-outlined text-lg">add</span>}
                        Crear candidato
                    </button>
                </div>
            </Card>

            <Card>
                <SectionHeader icon="ballot" title="Candidatos registrados" />
                {loading ? (
                    <div className="p-10 flex justify-center"><Spinner /></div>
                ) : candidatos.length === 0 ? (
                    <div className="py-10 text-center text-gray-400 text-sm">No hay candidatos registrados</div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead className="bg-gray-50 dark:bg-gray-800/50 text-xs font-semibold text-gray-500 uppercase">
                                <tr>
                                    <th className="px-6 py-3 text-left">Nombre</th>
                                    <th className="px-6 py-3 text-left">Descripción</th>
                                    <th className="px-6 py-3 text-left">Creado</th>
                                    <th className="px-6 py-3 text-center w-24">Estado</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                                {candidatos.map(c => (
                                    <tr key={c.candidato_id} className="hover:bg-gray-50 dark:hover:bg-gray-800/30 transition-colors">
                                        <td className="px-6 py-3 font-medium text-gray-900 dark:text-white">{c.nombre}</td>
                                        <td className="px-6 py-3 text-gray-500 dark:text-gray-400 text-xs">{c.descripcion || '—'}</td>
                                        <td className="px-6 py-3 text-gray-500 text-xs">{new Date(c.fecha_creacion).toLocaleDateString('es-DO')}</td>
                                        <td className="px-6 py-3 text-center">
                                            <button onClick={() => toggleActivo(c.candidato_id, c.activo)}
                                                className={`px-2.5 py-1 rounded-full text-xs font-bold border transition-colors ${c.activo ? 'bg-green-50 text-green-700 border-green-200 hover:bg-green-100' : 'bg-gray-100 text-gray-500 border-gray-200 hover:bg-gray-200'}`}>
                                                {c.activo ? 'Activo' : 'Inactivo'}
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </Card>
        </div>
    );
};

// ─── Main ─────────────────────────────────────────────────────────────────────
const Ajustes = () => {
    const rol = getRolFromStorage();
    const isAdmin = rol === 'ADMIN';
    const visibleTabs: TabDef[] = isAdmin
        ? [...BASE_TABS, { id: 'candidatos' as Tab, label: 'Candidatos', icon: 'how_to_vote' }]
        : BASE_TABS;

    const [activeTab, setActiveTab] = useState<Tab>('meta');
    const [toasts, setToasts] = useState<Toast[]>([]);
    const toastIdRef = useRef(0);

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
                    <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Configuración global del sistema SIGED360</p>
                </div>

                {/* Tabs */}
                <div className="flex gap-1 bg-gray-100 dark:bg-gray-800 p-1 rounded-xl overflow-x-auto">
                    {visibleTabs.map(tab => (
                        <button key={tab.id} onClick={() => setActiveTab(tab.id)}
                            className={`flex-1 flex items-center justify-center gap-2 px-3 py-2.5 rounded-lg text-sm font-medium transition-all whitespace-nowrap
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
                {activeTab === 'meta' && <TabMetaGlobal toast={toast} />}
                {activeTab === 'usuarios' && <TabUsuarios toast={toast} />}
                {activeTab === 'catalogos' && <TabCatalogos />}
                {activeTab === 'sistema' && <TabSistema />}
                {activeTab === 'candidatos' && isAdmin && <TabCandidatos toast={toast} />}

                <div className="h-10" />
            </div>
        </div>
    );
};

export default Ajustes;
