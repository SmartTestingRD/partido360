import React, { useState } from 'react';

const Login: React.FC = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);
        try {
            // Temporary: Simulate login call or call actual API
            const API_URL = import.meta.env.VITE_API_URL || '/api';
            const response = await fetch(`${API_URL}/auth/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ login: email, password })
            });
            const data = await response.json();

            if (data.ok) {
                localStorage.setItem('token', data.data.token);
                localStorage.setItem('user', JSON.stringify(data.data.user));
                // simple redirect to hash router dashboard
                window.location.hash = 'dashboard';
            } else {
                setError(data.message || 'Error de credenciales');
            }
        } catch (err) {
            setError('Error de conexión con el servidor');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="flex-1 flex min-h-screen w-full font-display">
            <div className="w-full xl:w-1/3 bg-white dark:bg-[#15202e] flex flex-col justify-center px-6 py-12 lg:px-12 shadow-xl z-10 border-r border-slate-200 dark:border-slate-800">
                <div className="sm:mx-auto sm:w-full sm:max-w-md">
                    <div className="flex items-center justify-center gap-3 text-primary mb-8">
                        <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-xl">
                            <span className="material-symbols-outlined text-4xl">diversity_3</span>
                        </div>
                    </div>
                    <h2 className="text-center text-2xl md:text-3xl font-bold tracking-tight text-slate-900 dark:text-white">
                        Bienvenido al CRM Político
                    </h2>
                    <p className="mt-2 text-center text-sm text-slate-500 dark:text-slate-400">
                        Ingresa tus credenciales para acceder a la plataforma de gestión.
                    </p>
                </div>

                <div className="mt-10 sm:mx-auto sm:w-full sm:max-w-[480px]">
                    {error && (
                        <div className="mb-4 bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-lg text-sm flex items-center gap-2">
                            <span className="material-symbols-outlined">error</span>
                            {error}
                        </div>
                    )}
                    <form className="space-y-6" onSubmit={handleSubmit}>
                        <div>
                            <label className="block text-sm font-medium leading-6 text-slate-900 dark:text-slate-200" htmlFor="email">
                                Correo Electrónico
                            </label>
                            <div className="relative mt-2 rounded-md shadow-sm">
                                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                                    <span className="material-symbols-outlined text-slate-400 text-[20px]">mail</span>
                                </div>
                                <input
                                    id="email"
                                    name="email"
                                    type="email"
                                    required
                                    placeholder="ejemplo@organizacion.com"
                                    className="block w-full rounded-lg border-0 py-3 pl-10 text-slate-900 shadow-sm ring-1 ring-inset ring-slate-300 placeholder:text-slate-400 focus:ring-2 focus:ring-inset focus:ring-primary dark:bg-slate-900/50 dark:ring-slate-700 dark:text-white sm:text-sm sm:leading-6"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-medium leading-6 text-slate-900 dark:text-slate-200" htmlFor="password">
                                Contraseña
                            </label>
                            <div className="relative mt-2 rounded-md shadow-sm">
                                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                                    <span className="material-symbols-outlined text-slate-400 text-[20px]">lock</span>
                                </div>
                                <input
                                    id="password"
                                    name="password"
                                    type={showPassword ? "text" : "password"}
                                    required
                                    placeholder="••••••••"
                                    className="block w-full rounded-lg border-0 py-3 pl-10 text-slate-900 shadow-sm ring-1 ring-inset ring-slate-300 placeholder:text-slate-400 focus:ring-2 focus:ring-inset focus:ring-primary dark:bg-slate-900/50 dark:ring-slate-700 dark:text-white sm:text-sm sm:leading-6"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                />
                                <div className="absolute inset-y-0 right-0 flex items-center pr-3 cursor-pointer" onClick={() => setShowPassword(!showPassword)}>
                                    <span className="material-symbols-outlined text-slate-400 text-[20px] hover:text-slate-600 dark:hover:text-slate-200 transition-colors">
                                        {showPassword ? 'visibility_off' : 'visibility'}
                                    </span>
                                </div>
                            </div>
                        </div>

                        <div className="flex items-center justify-between">
                            <div className="flex items-center">
                                <input
                                    id="remember-me"
                                    name="remember-me"
                                    type="checkbox"
                                    className="h-4 w-4 rounded border-slate-300 text-primary focus:ring-primary dark:border-slate-600 dark:bg-slate-800 dark:ring-offset-slate-900"
                                />
                                <label htmlFor="remember-me" className="ml-2 block text-sm text-slate-700 dark:text-slate-300">
                                    Recordarme
                                </label>
                            </div>
                            <div className="text-sm">
                                <a href="#forgot-password" className="font-semibold text-primary hover:text-primary-hover">
                                    ¿Olvidaste tu contraseña?
                                </a>
                            </div>
                        </div>

                        <div>
                            <button
                                type="submit"
                                disabled={loading}
                                className="flex w-full justify-center rounded-lg bg-primary px-3 py-3 text-sm font-semibold leading-6 text-white shadow-sm hover:bg-primary-hover focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary transition-all active:scale-[0.99] disabled:opacity-70 disabled:cursor-not-allowed"
                            >
                                {loading ? 'Iniciando...' : 'Iniciar Sesión'}
                            </button>
                        </div>
                    </form>

                    <div className="mt-8 text-center text-xs text-slate-400 dark:text-slate-500">
                        <p>© 2024 CRM Político. Todos los derechos reservados.</p>
                    </div>
                </div>
            </div>

            <div className="hidden xl:block relative w-0 flex-1 bg-slate-50 dark:bg-[#0f151b]">
                <div className="absolute inset-0 flex flex-col items-center justify-center p-12 text-center text-white z-10">
                    <div className="max-w-xl space-y-8">
                        <div className="w-24 h-24 mx-auto bg-white/10 backdrop-blur-lg rounded-full flex items-center justify-center border border-white/20 shadow-2xl bg-blue-600">
                            <span className="material-symbols-outlined text-6xl text-white">how_to_vote</span>
                        </div>
                        <div>
                            <h1 className="text-4xl lg:text-5xl font-bold mb-4 text-slate-900 dark:text-white">Liderazgo y Gestión Territorial</h1>
                            <p className="text-lg text-slate-600 dark:text-blue-100 font-light">
                                "La herramienta integral para organizar equipos, seguir metas y consolidar el apoyo ciudadano en tiempo real."
                            </p>
                        </div>
                        <div className="grid grid-cols-3 gap-6 pt-8 border-t border-slate-200 dark:border-white/10">
                            <div>
                                <span className="block text-3xl font-bold mb-1 text-slate-800 dark:text-white">15k+</span>
                                <span className="text-sm text-slate-500 dark:text-blue-200">Militantes</span>
                            </div>
                            <div>
                                <span className="block text-3xl font-bold mb-1 text-slate-800 dark:text-white">85%</span>
                                <span className="text-sm text-slate-500 dark:text-blue-200">Meta Global</span>
                            </div>
                            <div>
                                <span className="block text-3xl font-bold mb-1 text-slate-800 dark:text-white">120</span>
                                <span className="text-sm text-slate-500 dark:text-blue-200">Sectores</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Login;
