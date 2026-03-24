import React, { useState, useEffect } from 'react';
import CreateLiderModal from '../components/CreateLiderModal';
import axios from 'axios';

const LiderDashboard: React.FC = () => {
    // Attempting to retrieve user from localStorage for a personalized greeting
    const userStr = localStorage.getItem('user');
    let user = null;
    if (userStr) {
        try {
            user = JSON.parse(userStr);
        } catch (e) { }
    }
    const safeFirstName = user?.nombre_completo ? user.nombre_completo.split(' ')[0] : 'Líder';

    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [toasts, setToasts] = useState<{ id: number, message: string, type: 'success' | 'error' | 'info' }[]>([]);
    const [liderStats, setLiderStats] = useState<{
        meta_cantidad: number;
        total_registrados_activos: number;
        porcentaje_cumplimiento: number;
    } | null>(null);

    useEffect(() => {
        const userStr = localStorage.getItem('user');
        const currentUser = userStr ? JSON.parse(userStr) : null;
        if (currentUser?.lider_id) {
            axios.get(`http://localhost:3001/api/lideres/${currentUser.lider_id}`, {
                headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
            }).then(res => {
                const { metricas, lider } = res.data.data;
                setLiderStats({
                    meta_cantidad: lider.meta_cantidad,
                    total_registrados_activos: metricas.total_registrados_activos,
                    porcentaje_cumplimiento: metricas.porcentaje_cumplimiento
                });
            }).catch(() => {});
        }
    }, []);

    const addToast = (message: string, type: 'success' | 'error' | 'info' = 'success') => {
        const id = Date.now();
        setToasts(prev => [...prev, { id, message, type }]);
        setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 3500);
    };

    return (
        <main className="flex-1 overflow-y-auto w-full bg-slate-50 dark:bg-slate-900 font-display min-h-screen pb-24 relative sm:p-6 p-4">
            {/* Header Greeting */}
            <div className="mb-6 mt-4 md:mt-0 text-center md:text-left">
                <h2 className="text-2xl md:text-3xl font-extrabold text-slate-900 dark:text-white mb-1">Hola, <span className="text-blue-600 dark:text-blue-400">{safeFirstName}</span> 👋</h2>
                <p className="text-sm text-slate-500 dark:text-slate-400">¿Qué te gustaría gestionar hoy?</p>
            </div>

            {/* ── Botón principal mobile-first ── */}
            <button
              onClick={() => { window.location.hash = 'captacion'; }}
              className="w-full bg-blue-600 active:bg-blue-800 text-white font-semibold py-5 px-6 rounded-2xl text-lg flex items-center justify-center gap-3 shadow-lg mb-6 transition-all active:scale-95"
            >
              <span className="material-symbols-outlined text-3xl">person_add</span>
              <span>Registrar nueva persona</span>
            </button>

            {/* ── Stats Cards ── */}
            {liderStats && (
              <div className="mx-auto max-w-4xl mb-6 grid grid-cols-1 sm:grid-cols-3 gap-4">
                {/* Total registrados */}
                <div className="bg-white dark:bg-slate-800 rounded-2xl p-5 shadow-sm border border-slate-100 dark:border-slate-700/50 flex items-center gap-4">
                  <div className="p-3 bg-blue-100 dark:bg-blue-900/30 rounded-xl">
                    <span className="material-symbols-outlined text-blue-600 text-2xl">group</span>
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-blue-600">{liderStats.total_registrados_activos}</p>
                    <p className="text-sm text-slate-500 font-medium">Registrados</p>
                  </div>
                </div>
                {/* Meta con barra de progreso */}
                <div className="bg-white dark:bg-slate-800 rounded-2xl p-5 shadow-sm border border-slate-100 dark:border-slate-700/50 sm:col-span-2">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">Mi Meta</p>
                    <span className={`text-2xl font-bold ${liderStats.porcentaje_cumplimiento >= 100 ? 'text-green-600' : 'text-blue-600'}`}>
                      {liderStats.porcentaje_cumplimiento}%
                    </span>
                  </div>
                  <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-3 mb-1">
                    <div
                      className={`h-3 rounded-full transition-all ${liderStats.porcentaje_cumplimiento >= 100 ? 'bg-green-500' : 'bg-blue-500'}`}
                      style={{ width: `${Math.min(100, liderStats.porcentaje_cumplimiento)}%` }}
                    />
                  </div>
                  <p className="text-sm text-slate-500">
                    {liderStats.total_registrados_activos} de {liderStats.meta_cantidad} personas
                    {liderStats.porcentaje_cumplimiento >= 100 && ' 🎉 ¡Meta cumplida!'}
                  </p>
                </div>
              </div>
            )}

            {/* Menu Options - Mobile First App Layout */}
            <div className="flex flex-col gap-5 md:grid md:grid-cols-3 md:gap-6 max-w-4xl mx-auto">
                {/* Opcion 1: Registrar Nuevo */}
                <a
                    href="#captacion"
                    className="flex items-center p-6 bg-gradient-to-br from-blue-600 to-indigo-700 rounded-3xl shadow-xl shadow-blue-900/20 active:scale-[0.98] transition-transform duration-200 group relative overflow-hidden"
                >
                    <div className="absolute top-0 right-0 p-8 w-40 h-40 bg-white/10 rounded-full blur-3xl transform translate-x-12 -translate-y-12"></div>
                    <div className="bg-white/20 p-4 rounded-2xl mr-5 backdrop-blur-md shadow-inner text-white z-10">
                        <span className="material-symbols-outlined text-[36px] block">person_add</span>
                    </div>
                    <div className="flex-1 z-10">
                        <h3 className="text-xl font-bold text-white mb-1">Registrar Nuevo</h3>
                        <p className="text-blue-100 text-sm font-medium leading-tight">Captar un nuevo simpatizante para la estructura.</p>
                    </div>
                    <div className="text-white z-10 bg-white/20 rounded-full p-1 opacity-80 group-hover:opacity-100 group-hover:translate-x-1 transition-all">
                        <span className="material-symbols-outlined text-[24px]">chevron_right</span>
                    </div>
                </a>

                {/* Opcion 2: Consultar mis captados */}
                <a
                    href="#personas"
                    className="flex items-center p-6 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-3xl shadow-xl shadow-emerald-900/20 active:scale-[0.98] transition-transform duration-200 group relative overflow-hidden"
                >
                    <div className="absolute top-0 right-0 p-8 w-40 h-40 bg-white/10 rounded-full blur-3xl transform translate-x-12 -translate-y-12"></div>
                    <div className="bg-white/20 p-4 rounded-2xl mr-5 backdrop-blur-md shadow-inner text-white z-10">
                        <span className="material-symbols-outlined text-[36px] block">groups</span>
                    </div>
                    <div className="flex-1 z-10">
                        <h3 className="text-xl font-bold text-white mb-1">Mis Captados</h3>
                        <p className="text-emerald-100 text-sm font-medium leading-tight">Consultar y gestionar las personas que has captado.</p>
                    </div>
                    <div className="text-white z-10 bg-white/20 rounded-full p-1 opacity-80 group-hover:opacity-100 group-hover:translate-x-1 transition-all">
                        <span className="material-symbols-outlined text-[24px]">chevron_right</span>
                    </div>
                </a>

                {/* Opcion 3: Convertir Lider */}
                <button
                    onClick={() => setIsCreateModalOpen(true)}
                    className="w-full text-left flex items-center p-6 bg-gradient-to-br from-purple-600 to-fuchsia-700 rounded-3xl shadow-xl shadow-purple-900/20 active:scale-[0.98] transition-transform duration-200 group relative overflow-hidden"
                >
                    <div className="absolute top-0 right-0 p-8 w-40 h-40 bg-white/10 rounded-full blur-3xl transform translate-x-12 -translate-y-12"></div>
                    <div className="bg-white/20 p-4 rounded-2xl mr-5 backdrop-blur-md shadow-inner text-white z-10">
                        <span className="material-symbols-outlined text-[36px] block">supervisor_account</span>
                    </div>
                    <div className="flex-1 z-10">
                        <h3 className="text-xl font-bold text-white mb-1">Convertir Líder</h3>
                        <p className="text-purple-100 text-sm font-medium leading-tight">Promover a un simpatizante al rol de líder.</p>
                    </div>
                    <div className="text-white z-10 bg-white/20 rounded-full p-1 opacity-80 group-hover:opacity-100 group-hover:translate-x-1 transition-all">
                        <span className="material-symbols-outlined text-[24px]">chevron_right</span>
                    </div>
                </button>

                {/* Opcion 4: Agregar Sub-Líder */}
                <button
                    onClick={() => setIsCreateModalOpen(true)}
                    className="w-full text-left flex items-center p-6 bg-gradient-to-br from-amber-500 to-orange-600 rounded-3xl shadow-xl shadow-amber-900/20 active:scale-[0.98] transition-transform duration-200 group relative overflow-hidden"
                >
                    <div className="absolute top-0 right-0 p-8 w-40 h-40 bg-white/10 rounded-full blur-3xl transform translate-x-12 -translate-y-12"></div>
                    <div className="bg-white/20 p-4 rounded-2xl mr-5 backdrop-blur-md shadow-inner text-white z-10">
                        <span className="material-symbols-outlined text-[36px] block">group_add</span>
                    </div>
                    <div className="flex-1 z-10">
                        <h3 className="text-xl font-bold text-white mb-1">Agregar Sub-Líder</h3>
                        <p className="text-amber-100 text-sm font-medium leading-tight">Registrar un nuevo sub-líder bajo tu mandato.</p>
                    </div>
                    <div className="text-white z-10 bg-white/20 rounded-full p-1 opacity-80 group-hover:opacity-100 group-hover:translate-x-1 transition-all">
                        <span className="material-symbols-outlined text-[24px]">chevron_right</span>
                    </div>
                </button>
            </div>

            {/* Quick Stats or info snippet */}
            <div className="mt-10 mx-auto max-w-4xl bg-white dark:bg-slate-800 rounded-3xl p-6 shadow-sm border border-slate-100 dark:border-slate-700/50">
                <div className="flex items-center gap-3 mb-4">
                    <span className="material-symbols-outlined text-blue-500">info</span>
                    <h4 className="text-sm font-bold text-slate-800 dark:text-slate-200">Consejo Rápido</h4>
                </div>
                <p className="text-sm text-slate-500 dark:text-slate-400">
                    Sigue motivando a tu equipo y registra los nuevos simpatizantes inmediatamente después de su captación.
                </p>
            </div>

            {/* Modal de Creación */}
            <CreateLiderModal
                isOpen={isCreateModalOpen}
                onClose={() => setIsCreateModalOpen(false)}
                onSuccess={() => { setIsCreateModalOpen(false); addToast('Sub-líder creado exitosamente', 'success'); }}
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

export default LiderDashboard;
