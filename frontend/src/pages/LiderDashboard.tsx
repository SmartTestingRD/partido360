import React, { useState } from 'react';
import CreateLiderModal from '../components/CreateLiderModal';

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

    const addToast = (message: string, type: 'success' | 'error' | 'info' = 'success') => {
        const id = Date.now();
        setToasts(prev => [...prev, { id, message, type }]);
        setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 3500);
    };

    return (
        <main className="flex-1 overflow-y-auto w-full bg-slate-50 dark:bg-slate-900 font-display min-h-screen pb-24 relative sm:p-6 p-4">
            {/* Header Greeting */}
            <div className="mb-8 mt-4 md:mt-0 text-center md:text-left">
                <h2 className="text-3xl md:text-3xl font-extrabold text-slate-900 dark:text-white mb-2">Hola, <span className="text-blue-600 dark:text-blue-400">{safeFirstName}</span> 👋</h2>
                <p className="text-base text-slate-500 dark:text-slate-400">¿Qué te gustaría gestionar hoy?</p>
            </div>

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
                onSuccess={() => { }}
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
