import React, { useState, useEffect } from 'react';
import { getDashboardData, DashboardData } from '../api/apiService';
import CreateLiderModal from '../components/CreateLiderModal';

// ─── Toast (Temporary Local Implementation for Dashboard) ───────────────────
type ToastType = 'success' | 'error' | 'info';
interface Toast { id: number; message: string; type: ToastType; }
const TOAST_DURATION = 3500;


const Dashboard: React.FC = () => {
    // Attempting to retrieve user from localStorage for a personalized greeting
    const userStr = localStorage.getItem('user');
    let user = null;
    if (userStr) {
        try {
            user = JSON.parse(userStr);
        } catch (e) { }
    }
    const safeFirstName = user?.nombre_completo ? user.nombre_completo.split(' ')[0] : 'Usuario';

    const [data, setData] = useState<DashboardData | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Modal Create Lider
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

    // Toasts
    const [toasts, setToasts] = useState<Toast[]>([]);
    const addToast = (message: string, type: ToastType = 'success') => {
        const id = Date.now();
        setToasts(prev => [...prev, { id, message, type }]);
        setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), TOAST_DURATION);
    };


    const loadData = async () => {
        if (!localStorage.getItem('token')) return;
        try {
            setLoading(true);
            setError(null);
            const result = await getDashboardData();
            setData(result);
        } catch (err) {
            console.error('Error loading dashboard data:', err);
            setError('No se pudieron cargar las métricas. Por favor, intenta de nuevo.');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadData();
    }, []);

    useEffect(() => {
        const interval = setInterval(() => {
            loadData();
        }, 60000);
        return () => clearInterval(interval);
    }, []);

    if (loading && !data) {
        return (
            <main className="flex-1 overflow-y-auto p-4 md:p-8 flex items-center justify-center font-display w-full">
                <div className="flex flex-col items-center justify-center space-y-4">
                    <span className="material-symbols-outlined animate-spin text-primary text-4xl">refresh</span>
                    <p className="text-slate-500 font-medium font-display">Cargando métricas...</p>
                </div>
            </main>
        );
    }

    if (error || !data) {
        return (
            <main className="flex-1 overflow-y-auto p-4 md:p-8 flex items-center justify-center font-display w-full">
                <div className="flex flex-col items-center justify-center space-y-4 text-slate-500">
                    <span className="material-symbols-outlined text-4xl text-red-400">error</span>
                    <p className="font-medium text-center">{error || 'No se encontraron datos'}</p>
                    <button onClick={loadData} className="mt-2 px-4 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg text-sm font-semibold transition-colors">
                        Reintentar
                    </button>
                </div>
            </main>
        );
    }

    return (
        <main className="flex-1 overflow-y-auto p-4 md:p-8 space-y-6 md:space-y-8 pb-24 md:pb-8 font-display w-full">
            <div className="md:hidden">
                <h2 className="text-lg font-semibold text-slate-800 dark:text-slate-200">Hola, {safeFirstName} 👋</h2>
                <p className="text-sm text-slate-500 dark:text-slate-400">Aquí está el resumen de tu campaña hoy.</p>
            </div>

            {/* KPIs Grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">

                {/* KPI 1 */}
                <div className="glass-panel p-5 rounded-2xl shadow-glass flex flex-col justify-between h-full relative overflow-hidden group hover:translate-y-[-2px] transition-transform duration-300 bg-white/70 dark:bg-slate-800/60 backdrop-blur-md border border-white/30 dark:border-white/5">
                    <div className="absolute -right-6 -top-6 w-24 h-24 bg-blue-400/10 rounded-full blur-2xl group-hover:bg-blue-400/20 transition-all"></div>
                    <div className="flex justify-between items-start mb-3 z-10">
                        <div className="bg-blue-50 dark:bg-blue-900/30 p-2.5 rounded-xl text-blue-600 shadow-sm">
                            <span className="material-symbols-outlined text-[20px]">groups</span>
                        </div>
                        <span className="flex items-center text-xs font-bold text-emerald-600 bg-emerald-50 dark:bg-emerald-900/30 px-2 py-1 rounded-full border border-emerald-100 dark:border-emerald-800">
                            <span className="material-symbols-outlined text-[14px] mr-0.5">trending_up</span>
                            12%
                        </span>
                    </div>
                    <div className="z-10">
                        <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">Total Captadas</p>
                        <p className="text-2xl md:text-3xl font-bold text-slate-900 dark:text-white mt-1">{data.kpis.total_captadas.toLocaleString()}</p>
                    </div>
                    {/* Decorative Chart */}
                    <div className="mt-4 h-8 flex items-end gap-1 opacity-50">
                        <div className="w-1/6 bg-blue-300 rounded-t-sm h-[40%]"></div>
                        <div className="w-1/6 bg-blue-300 rounded-t-sm h-[60%]"></div>
                        <div className="w-1/6 bg-blue-300 rounded-t-sm h-[45%]"></div>
                        <div className="w-1/6 bg-blue-300 rounded-t-sm h-[70%]"></div>
                        <div className="w-1/6 bg-blue-300 rounded-t-sm h-[50%]"></div>
                        <div className="w-1/6 bg-blue-500 rounded-t-sm h-[90%]"></div>
                    </div>
                </div>

                {/* KPI 2 */}
                <div className="glass-panel p-5 rounded-2xl shadow-glass flex flex-col justify-between h-full relative overflow-hidden group hover:translate-y-[-2px] transition-transform duration-300 bg-white/70 dark:bg-slate-800/60 backdrop-blur-md border border-white/30 dark:border-white/5">
                    <div className="absolute -right-6 -top-6 w-24 h-24 bg-purple-400/10 rounded-full blur-2xl group-hover:bg-purple-400/20 transition-all"></div>
                    <div className="flex justify-between items-start mb-3 z-10">
                        <div className="bg-purple-50 dark:bg-purple-900/30 p-2.5 rounded-xl text-purple-600 shadow-sm">
                            <span className="material-symbols-outlined text-[20px]">badge</span>
                        </div>
                    </div>
                    <div className="z-10">
                        <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">Líderes Activos</p>
                        <p className="text-2xl md:text-3xl font-bold text-slate-900 dark:text-white mt-1">{data.kpis.lideres_activos}</p>
                    </div>
                    {/* Decorative Chart */}
                    <div className="mt-4 h-8 flex items-end gap-1 opacity-50">
                        <div className="w-1/6 bg-purple-300 rounded-t-sm h-[30%]"></div>
                        <div className="w-1/6 bg-purple-300 rounded-t-sm h-[40%]"></div>
                        <div className="w-1/6 bg-purple-300 rounded-t-sm h-[35%]"></div>
                        <div className="w-1/6 bg-purple-300 rounded-t-sm h-[50%]"></div>
                        <div className="w-1/6 bg-purple-300 rounded-t-sm h-[55%]"></div>
                        <div className="w-1/6 bg-purple-500 rounded-t-sm h-[65%]"></div>
                    </div>
                </div>

                {/* KPI 3 */}
                <div className="glass-panel p-5 rounded-2xl shadow-glass flex flex-col items-center justify-center text-center h-full relative overflow-hidden group hover:translate-y-[-2px] transition-transform duration-300 bg-white/70 dark:bg-slate-800/60 backdrop-blur-md border border-white/30 dark:border-white/5">
                    <div className="relative w-16 h-16 md:w-20 md:h-20 mb-2">
                        <svg className="w-full h-full transform -rotate-90">
                            <circle className="text-slate-100 dark:text-slate-700" cx="50%" cy="50%" fill="transparent" r="45%" stroke="currentColor" strokeWidth="6"></circle>
                            <circle className="text-blue-500 transition-all duration-1000 ease-out" cx="50%" cy="50%" fill="transparent" r="45%" stroke="currentColor" strokeDasharray="283" strokeDashoffset={283 - (283 * data.kpis.meta_global_percent) / 100} strokeLinecap="round" strokeWidth="6"></circle>
                        </svg>
                        <div className="absolute inset-0 flex items-center justify-center">
                            <span className="text-sm md:text-lg font-bold text-slate-900 dark:text-white">{data.kpis.meta_global_percent}%</span>
                        </div>
                    </div>
                    <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">Meta Global</p>
                </div>

                {/* KPI 4 */}
                <div className="glass-panel p-5 rounded-2xl shadow-glass flex flex-col justify-between h-full relative overflow-hidden group hover:translate-y-[-2px] transition-transform duration-300 bg-white/70 dark:bg-slate-800/60 backdrop-blur-md border border-white/30 dark:border-white/5">
                    <div className="absolute -right-6 -top-6 w-24 h-24 bg-orange-400/10 rounded-full blur-2xl group-hover:bg-orange-400/20 transition-all"></div>
                    <div className="flex justify-between items-start mb-3 z-10">
                        <div className="bg-orange-50 dark:bg-orange-900/30 p-2.5 rounded-xl text-orange-600 shadow-sm">
                            <span className="material-symbols-outlined text-[20px]">person_add</span>
                        </div>
                    </div>
                    <div className="z-10">
                        <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">Nuevos (Hoy)</p>
                        <p className="text-2xl md:text-3xl font-bold text-slate-900 dark:text-white mt-1">{data.kpis.nuevos_hoy}</p>
                    </div>
                    {/* Decorative Chart */}
                    <div className="mt-4 h-8 flex items-end gap-1 opacity-50">
                        <div className="w-1/6 bg-orange-300 rounded-t-sm h-[20%]"></div>
                        <div className="w-1/6 bg-orange-300 rounded-t-sm h-[25%]"></div>
                        <div className="w-1/6 bg-orange-300 rounded-t-sm h-[40%]"></div>
                        <div className="w-1/6 bg-orange-300 rounded-t-sm h-[30%]"></div>
                        <div className="w-1/6 bg-orange-300 rounded-t-sm h-[80%]"></div>
                        <div className="w-1/6 bg-orange-500 rounded-t-sm h-[95%]"></div>
                    </div>
                </div>

            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 md:gap-8">
                {/* Left Column (Rankings) */}
                <div className="lg:col-span-2 space-y-6 md:space-y-8">
                    {/* Ranking Líderes */}
                    <div className="glass-panel rounded-2xl shadow-glass overflow-hidden bg-white/70 dark:bg-slate-800/60 backdrop-blur-md border border-white/30 dark:border-white/5">
                        <div className="p-5 md:p-6 flex justify-between items-center bg-white/50 dark:bg-slate-800/50">
                            <h3 className="text-base md:text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                                <span className="material-symbols-outlined text-yellow-500 drop-shadow-sm">leaderboard</span>
                                Ranking de Líderes
                            </h3>
                            <a href="#lideres" className="text-xs md:text-sm font-semibold text-blue-600 hover:text-blue-700 transition-colors">Ver todo</a>
                        </div>
                        <div className="divide-y divide-slate-100/80 dark:divide-slate-800/80">
                            {data.ranking_lideres.length === 0 ? (
                                <div className="p-4 text-center text-sm text-slate-500">No hay líderes para mostrar</div>
                            ) : data.ranking_lideres.map((leader, index) => {
                                const rings = ['from-yellow-400 to-orange-500', 'from-slate-300 to-slate-400', 'from-orange-600 to-amber-700', 'from-blue-400 to-indigo-500', 'from-purple-400 to-pink-500'];
                                const badges = ['bg-yellow-400', 'bg-slate-400', 'bg-orange-700', 'bg-blue-500', 'bg-purple-500'];
                                return (
                                    <a
                                        key={index}
                                        href={`#lideres/${leader.lider_id}`}
                                        className="p-4 md:p-5 flex items-center gap-4 hover:bg-white/60 dark:hover:bg-slate-700/30 transition-colors group cursor-pointer"
                                    >
                                        <div className="flex-shrink-0 relative">
                                            <div className={`h-10 w-10 md:h-12 md:w-12 rounded-full p-0.5 bg-gradient-to-tr ${rings[index % rings.length]} shadow-md`}>
                                                <div className="h-full w-full rounded-full bg-slate-200 dark:bg-slate-700 border-2 border-white dark:border-slate-800 flex items-center justify-center overflow-hidden">
                                                    <span className="material-symbols-outlined text-slate-400">person</span>
                                                </div>
                                            </div>
                                            <div className={`absolute -top-1 -right-1 ${badges[index % badges.length]} text-white text-[10px] md:text-xs font-bold h-4 w-4 md:h-5 md:w-5 rounded-full flex items-center justify-center shadow-sm ring-2 ring-white dark:ring-slate-900`}>{index + 1}</div>
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="flex justify-between mb-2">
                                                <p className="text-sm md:text-base font-semibold text-slate-900 dark:text-white truncate group-hover:text-blue-600 transition-colors">{leader.name || 'Sin nombre'}</p>
                                                <p className="text-sm md:text-base font-bold text-slate-800 dark:text-slate-100 font-mono">{leader.count.toLocaleString()}</p>
                                            </div>
                                            <div className="w-full bg-slate-100 dark:bg-slate-700/50 rounded-full h-1.5 md:h-2 overflow-hidden flex items-center relative">
                                                <div className="absolute inset-y-0 left-0 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-full shadow-lg shadow-blue-500/30" style={{ width: `${leader.percent}%` }}></div>
                                                <span className="absolute right-0 text-[8px] md:text-[10px] text-slate-400 px-1 z-10">{leader.percent}%</span>
                                            </div>
                                        </div>
                                    </a>
                                );
                            })}
                        </div>
                    </div>

                    {/* Ranking Sectores */}
                    <div className="glass-panel rounded-2xl shadow-glass p-5 md:p-6 bg-white/70 dark:bg-slate-800/60 backdrop-blur-md border border-white/30 dark:border-white/5">
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="text-base md:text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                                <span className="material-symbols-outlined text-indigo-500">location_city</span>
                                Ranking por Sectores
                            </h3>
                        </div>
                        <div className="space-y-6">
                            {data.ranking_sectores.length === 0 ? (
                                <div className="text-sm text-slate-500">No hay sectores para mostrar</div>
                            ) : data.ranking_sectores.map((sector, index) => {
                                const colors = ['from-sky-400 to-indigo-600', 'from-emerald-400 to-teal-600', 'from-orange-400 to-red-500', 'from-purple-400 to-fuchsia-600', 'from-blue-400 to-cyan-500'];
                                return (
                                    <div key={index}>
                                        <div className="flex justify-between text-sm mb-2">
                                            <span className="font-medium text-slate-700 dark:text-slate-300">{sector.name}</span>
                                            <span className="font-bold text-slate-900 dark:text-white font-mono">{sector.count.toLocaleString()}</span>
                                        </div>
                                        <div className="w-full bg-slate-100 dark:bg-slate-700/50 rounded-full h-3 md:h-4 p-0.5 shadow-inner">
                                            <div className={`bg-gradient-to-r ${colors[index % colors.length]} h-full rounded-full transition-all duration-500 shadow-sm`} style={{ width: `${sector.percent}%` }}></div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>

                {/* Right Column (Actions & Activity) */}
                <div className="lg:col-span-1 space-y-6 md:space-y-8">
                    {/* Acciones Rápidas */}
                    <section className="glass-panel rounded-2xl shadow-glass p-5 md:p-6 bg-white/70 dark:bg-slate-800/60 backdrop-blur-md border border-white/30 dark:border-white/5">
                        <h3 className="text-base md:text-lg font-bold text-slate-900 dark:text-white mb-5 flex items-center gap-2">
                            <span className="material-symbols-outlined text-blue-500 text-[24px]">bolt</span>
                            Acciones Rápidas
                        </h3>
                        <div className="flex flex-row lg:flex-col gap-3 overflow-x-auto hide-scrollbar pb-2 lg:pb-0">
                            <a href="#captacion" className="flex-none lg:w-full flex lg:flex-row flex-col items-center lg:items-start lg:gap-4 p-4 lg:py-4 justify-center w-28 h-auto bg-gradient-to-br from-blue-500 to-blue-700 text-white rounded-2xl shadow-lg shadow-blue-500/30 active:scale-95 transition-all hover:shadow-xl group relative overflow-hidden">
                                <div className="absolute inset-0 bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                                <div className="bg-white/20 p-2 rounded-lg mb-2 lg:mb-0">
                                    <span className="material-symbols-outlined text-[24px]">how_to_reg</span>
                                </div>
                                <div className="text-center lg:text-left z-10">
                                    <span className="text-xs lg:text-sm font-bold block">Registrar Persona</span>
                                    <span className="hidden lg:block text-xs text-blue-100 font-medium mt-0.5">Nuevo simpatizante</span>
                                </div>
                            </a>
                            <button
                                onClick={() => setIsCreateModalOpen(true)}
                                className="flex-none lg:w-full flex lg:flex-row flex-col items-center lg:items-start lg:gap-4 p-4 lg:py-4 justify-center w-28 h-auto bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 rounded-2xl shadow-sm active:scale-95 transition-all hover:bg-slate-50 dark:hover:bg-slate-700 hover:shadow-md group"
                            >
                                <div className="bg-purple-50 dark:bg-purple-900/20 p-2 rounded-lg text-purple-600 mb-2 lg:mb-0 group-hover:bg-purple-100 transition-colors">
                                    <span className="material-symbols-outlined text-[24px]">person_add_alt</span>
                                </div>
                                <div className="text-center lg:text-left">
                                    <span className="text-xs lg:text-sm font-bold block text-left">Añadir Líder</span>
                                    <span className="hidden lg:block text-xs text-slate-500 dark:text-slate-400 font-medium mt-0.5">Nuevo coordinador</span>
                                </div>
                            </button>

                            <a href="#ajustes" className="flex-none lg:w-full flex lg:flex-row flex-col items-center lg:items-start lg:gap-4 p-4 lg:py-4 justify-center w-28 h-auto bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 rounded-2xl shadow-sm active:scale-95 transition-all hover:bg-slate-50 dark:hover:bg-slate-700 hover:shadow-md group">
                                <div className="bg-orange-50 dark:bg-orange-900/20 p-2 rounded-lg text-orange-600 mb-2 lg:mb-0 group-hover:bg-orange-100 transition-colors">
                                    <span className="material-symbols-outlined text-[24px]">summarize</span>
                                </div>
                                <div className="text-center lg:text-left">
                                    <span className="text-xs lg:text-sm font-bold block">Reportes</span>
                                    <span className="hidden lg:block text-xs text-slate-500 dark:text-slate-400 font-medium mt-0.5">Exportar PDF/Excel</span>
                                </div>
                            </a>
                        </div>
                    </section>

                    {/* Actividad Reciente */}
                    <section className="glass-panel rounded-2xl shadow-glass p-5 md:p-6 bg-white/70 dark:bg-slate-800/60 backdrop-blur-md border border-white/30 dark:border-white/5">
                        <h3 className="text-base md:text-lg font-bold text-slate-900 dark:text-white mb-6 flex items-center gap-2">
                            <span className="material-symbols-outlined text-slate-400">history</span>
                            Actividad Reciente
                        </h3>
                        <div className="relative pl-4 space-y-8">
                            <div className="absolute left-4 top-2 bottom-2 w-0.5 bg-slate-200/60 dark:bg-slate-700/60 rounded-full"></div>

                            {data.actividad_reciente.length === 0 ? (
                                <div className="text-sm text-slate-500 pl-2">No hay actividad reciente</div>
                            ) : data.actividad_reciente.map((act, index) => (
                                <div key={index} className="relative pl-6">
                                    <div className={`absolute left-[-15px] top-1.5 h-3.5 w-3.5 rounded-full border-2 z-10 shadow-sm ml-[24px] ${index === 0 ? 'bg-white dark:bg-slate-800 border-blue-500' : 'bg-slate-200 dark:bg-slate-600 border-white dark:border-slate-800'}`}></div>
                                    <div className="flex items-start gap-3">
                                        <div className="bg-blue-50 dark:bg-blue-900/20 p-2 rounded-lg text-blue-600 shrink-0 shadow-sm mt-[-4px]">
                                            <span className="material-symbols-outlined text-[16px]">person_add</span>
                                        </div>
                                        <div>
                                            <p className="text-sm text-slate-700 dark:text-slate-200 leading-snug">
                                                <span className="font-semibold text-slate-900 dark:text-white">{act.creator_name}</span> registró a <span className="font-medium text-slate-800 dark:text-slate-100">{act.target_name}</span>.
                                            </p>
                                            <p className="text-xs text-slate-400 mt-1 font-medium capitalize">{act.relative_time}</p>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </section>
                </div>
            </div>

            {/* Modal de Creación */}
            <CreateLiderModal
                isOpen={isCreateModalOpen}
                onClose={() => setIsCreateModalOpen(false)}
                onSuccess={loadData}
                addToast={addToast}
            />

            {/* Toast Container */}
            <div className="fixed bottom-20 md:bottom-5 right-5 z-[9999] flex flex-col gap-2 pointer-events-none">
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
                    </div>
                ))}
            </div>
        </main>

    );
};

export default Dashboard;
