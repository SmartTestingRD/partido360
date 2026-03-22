import React, { useState, useEffect } from 'react';

const ResetPassword: React.FC = () => {
    const [token, setToken] = useState<string | null>(null);
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        // Parse token from hash e.g. #reset-password?token=xyz
        const hashParts = window.location.hash.split('?');
        if (hashParts.length > 1) {
            const params = new URLSearchParams(hashParts[1]);
            const tokenParam = params.get('token');
            if (tokenParam) {
                setToken(tokenParam);
            } else {
                setError('No se proporcionó un token de seguridad válido.');
            }
        } else {
            setError('Falta el token de seguridad en la URL.');
        }
    }, []);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);
        setMessage(null);

        if (!token) {
            setError('El enlace de recuperación no es válido.');
            setLoading(false);
            return;
        }

        try {
            const API_URL = import.meta.env.VITE_API_URL || '/api';
            const response = await fetch(`${API_URL}/auth/reset-password`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ token, new_password: password })
            });
            const data = await response.json();

            if (data.ok) {
                setMessage(data.message || 'Contraseña actualizada exitosamente.');
                setPassword('');
                // Redirect user back to login after 3 seconds
                setTimeout(() => {
                    window.location.hash = 'login';
                }, 3000);
            } else {
                setError(data.message || 'Error al restablecer la contraseña');
            }
        } catch (err) {
            setError('Error de conexión con el servidor');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="flex-1 flex min-h-screen w-full font-display bg-slate-50 dark:bg-[#0f151b]">
            <div className="w-full max-w-md mx-auto bg-white dark:bg-[#15202e] flex flex-col justify-center px-6 py-12 lg:px-12 shadow-xl z-10 border border-slate-200 dark:border-slate-800 rounded-2xl mt-12 mb-auto">
                <div className="sm:mx-auto sm:w-full sm:max-w-md">
                    <div className="flex items-center justify-center gap-3 text-primary mb-8">
                        <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-xl">
                            <span className="material-symbols-outlined text-4xl">vpn_key</span>
                        </div>
                    </div>
                    <h2 className="text-center text-2xl md:text-3xl font-bold tracking-tight text-slate-900 dark:text-white">
                        Crear Nueva Contraseña
                    </h2>
                    <p className="mt-2 text-center text-sm text-slate-500 dark:text-slate-400">
                        Ingresa y confirma tu nueva contraseña para recuperar el acceso a tu cuenta.
                    </p>
                </div>

                <div className="mt-10 sm:mx-auto sm:w-full sm:max-w-[480px]">
                    {error && (
                        <div className="mb-4 bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-lg text-sm flex items-center gap-2">
                            <span className="material-symbols-outlined">error</span>
                            {error}
                        </div>
                    )}
                    {message && (
                        <div className="mb-4 bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg text-sm flex items-center gap-2">
                            <span className="material-symbols-outlined">check_circle</span>
                            {message}
                        </div>
                    )}

                    <form className="space-y-6" onSubmit={handleSubmit}>
                        <div>
                            <label className="block text-sm font-medium leading-6 text-slate-900 dark:text-slate-200" htmlFor="password">
                                Nueva Contraseña
                            </label>
                            <div className="relative mt-2 rounded-md shadow-sm">
                                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                                    <span className="material-symbols-outlined text-slate-400 text-[20px]">lock_reset</span>
                                </div>
                                <input
                                    id="password"
                                    name="password"
                                    type="password"
                                    required
                                    placeholder="••••••••"
                                    className="block w-full rounded-lg border-0 py-3 pl-10 text-slate-900 shadow-sm ring-1 ring-inset ring-slate-300 placeholder:text-slate-400 focus:ring-2 focus:ring-inset focus:ring-primary dark:bg-slate-900/50 dark:ring-slate-700 dark:text-white sm:text-sm sm:leading-6"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    disabled={loading || message !== null || !token}
                                />
                            </div>
                            <p className="mt-2 text-[11px] text-slate-500">Mínimo 8 caracteres, al menos 1 mayúscula y 1 número.</p>
                        </div>

                        <div>
                            <button
                                type="submit"
                                disabled={loading || !password || message !== null || !token}
                                className="flex w-full justify-center rounded-lg bg-primary px-3 py-3 text-sm font-semibold leading-6 text-white shadow-sm hover:bg-primary-hover focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary transition-all active:scale-[0.99] disabled:opacity-70 disabled:cursor-not-allowed"
                            >
                                {loading ? 'Guardando...' : 'Guardar Contraseña y Entrar'}
                            </button>
                        </div>
                    </form>

                    <div className="mt-6 text-center text-sm">
                        <a href="#login" className="font-semibold text-slate-600 dark:text-slate-400 hover:text-primary flex items-center justify-center gap-2">
                            <span className="material-symbols-outlined text-[18px]">arrow_back</span>
                            Volver al inicio de sesión
                        </a>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ResetPassword;
