import React, { useState, useEffect } from 'react';
import CreateLiderModal from '../components/CreateLiderModal';
import axios from 'axios';
import { API_URL } from '../api/apiService';

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
        if (!localStorage.getItem('token')) return;
        const userStr = localStorage.getItem('user');
        const currentUser = userStr ? JSON.parse(userStr) : null;
        if (currentUser?.lider_id) {
            axios.get(`${API_URL}/lideres/${currentUser.lider_id}`, {
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
              className="w-full md:w-auto md:px-8 bg-blue-600 hover:bg-blue-700 text-white font-medium py-4 md:py-3 px-6 rounded-2xl text-base md:text-sm flex items-center justify-center gap-3 shadow-md active:scale-95 transition-transform mb-6"
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

            {/* Menu Options */}
            <div className="grid grid-cols-2 gap-3 mb-6">
                {/* Card Registrar Nuevo */}
                <button
                    onClick={() => { window.location.hash = 'captacion'; }}
                    className="bg-blue-600 hover:bg-blue-700 active:scale-95 transition-all rounded-2xl p-4 text-left text-white"
                >
                    <span className="material-symbols-outlined text-2xl mb-2 block">person_add</span>
                    <div className="font-semibold text-sm">Registrar Nuevo</div>
                    <div className="text-xs opacity-75 mt-1 hidden sm:block">Captar un nuevo simpatizante</div>
                </button>
                {/* Card Mis Captados */}
                <button
                    onClick={() => { window.location.hash = 'personas'; }}
                    className="bg-emerald-600 hover:bg-emerald-700 active:scale-95 transition-all rounded-2xl p-4 text-left text-white"
                >
                    <span className="material-symbols-outlined text-2xl mb-2 block">groups</span>
                    <div className="font-semibold text-sm">Mis Captados</div>
                    <div className="text-xs opacity-75 mt-1 hidden sm:block">Ver personas registradas</div>
                </button>
                {/* Card Convertir Líder */}
                <button
                    onClick={() => { window.location.hash = 'personas'; }}
                    className="bg-purple-600 hover:bg-purple-700 active:scale-95 transition-all rounded-2xl p-4 text-left text-white"
                >
                    <span className="material-symbols-outlined text-2xl mb-2 block">how_to_reg</span>
                    <div className="font-semibold text-sm">Convertir Líder</div>
                    <div className="text-xs opacity-75 mt-1 hidden sm:block">Promover a rol de líder</div>
                </button>
                {/* Card Agregar Sub-Líder */}
                <button
                    onClick={() => { window.location.hash = 'lideres'; }}
                    className="bg-orange-500 hover:bg-orange-600 active:scale-95 transition-all rounded-2xl p-4 text-left text-white"
                >
                    <span className="material-symbols-outlined text-2xl mb-2 block">group_add</span>
                    <div className="font-semibold text-sm">Agregar Sub-Líder</div>
                    <div className="text-xs opacity-75 mt-1 hidden sm:block">Registrar nuevo sub-líder</div>
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
