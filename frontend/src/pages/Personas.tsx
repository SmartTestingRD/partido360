import { useState, useEffect } from 'react';
import { getPersonas, getSectores, getLideres, getPersonaDetalle, getNivelesLider, getEstadosLider, crearLider, Persona, Sector, Lider, PersonaDetalle, NivelLider, EstadoLider } from '../api/apiService';

const Personas = () => {
    const [personas, setPersonas] = useState<Persona[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Filters state
    const [search, setSearch] = useState('');
    const [sector, setSector] = useState('');
    const [lider, setLider] = useState('');

    // Pagination state
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [totalRecords, setTotalRecords] = useState(0);
    const pageSize = 10;

    // Catalogues
    const [sectores, setSectores] = useState<Sector[]>([]);
    const [lideres, setLideres] = useState<Lider[]>([]);
    const [nivelesLider, setNivelesLider] = useState<NivelLider[]>([]);
    const [estadosLider, setEstadosLider] = useState<EstadoLider[]>([]);

    // Drawer state
    const [selectedPersonaId, setSelectedPersonaId] = useState<string | null>(null);
    const [personaDetalle, setPersonaDetalle] = useState<PersonaDetalle | null>(null);
    const [loadingDetail, setLoadingDetail] = useState(false);

    // Modal state
    const [isConversionModalOpen, setConversionModalOpen] = useState(false);
    const [metaCantidad, setMetaCantidad] = useState<number>(10);
    const [nivelLiderId, setNivelLiderId] = useState<string>('');
    const [estadoLiderId, setEstadoLiderId] = useState<string>('');
    const [liderPadreId, setLiderPadreId] = useState<string>('');
    const [isConverting, setIsConverting] = useState(false);
    const [conversionSuccess, setConversionSuccess] = useState<string | null>(null);
    const [conversionError, setConversionError] = useState<string | null>(null);

    useEffect(() => {
        if (selectedPersonaId) {
            setLoadingDetail(true);
            getPersonaDetalle(selectedPersonaId)
                .then(data => setPersonaDetalle(data))
                .catch(err => console.error("Error fetching detail:", err))
                .finally(() => setLoadingDetail(false));
        } else {
            setPersonaDetalle(null);
        }
    }, [selectedPersonaId]);

    useEffect(() => {
        const fetchCatalogos = async () => {
            try {
                const [sectoresData, lideresData, nivelesLiderData, estadosLiderData] = await Promise.all([
                    getSectores(),
                    getLideres(),
                    getNivelesLider(),
                    getEstadosLider()
                ]);
                setSectores(sectoresData);
                setLideres(lideresData);
                setNivelesLider(nivelesLiderData);
                setEstadosLider(estadosLiderData);
                if (nivelesLiderData.length > 0) setNivelLiderId(nivelesLiderData[0].nivel_lider_id);
                if (estadosLiderData.length > 0) {
                    const activeState = estadosLiderData.find(e => e.nombre === 'Activo');
                    setEstadoLiderId(activeState ? activeState.estado_lider_id : estadosLiderData[0].estado_lider_id);
                }
            } catch (err) {
                console.error("Error loading catalogs", err);
            }
        };
        fetchCatalogos();
    }, []);

    const fetchPersonasData = async () => {
        setLoading(true);
        setError(null);
        try {
            const data = await getPersonas({ q: search, sector_id: sector, lider_id: lider, page, pageSize });
            setPersonas(data.data);
            setTotalPages(data.totalPages);
            setTotalRecords(data.total);
        } catch (err) {
            console.error("Error fetching personas:", err);
            setError("No se pudieron cargar las personas. Por favor, intenta de nuevo.");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchPersonasData();
    }, [search, sector, lider, page]);

    const handleClearFilters = () => {
        setSearch('');
        setSector('');
        setLider('');
        setPage(1);
    };

    const handleConvertToLider = async () => {
        if (!personaDetalle) return;
        setConversionError(null);
        setConversionSuccess(null);
        setIsConverting(true);
        try {
            await crearLider({
                persona_id: personaDetalle.persona.persona_id,
                meta_cantidad: metaCantidad,
                nivel_lider_id: nivelLiderId,
                estado_lider_id: estadoLiderId,
                lider_padre_id: liderPadreId || null
            });
            setConversionSuccess("¡Líder creado exitosamente!");
            const newData = await getPersonaDetalle(personaDetalle.persona.persona_id);
            setPersonaDetalle(newData);
            setTimeout(() => {
                setConversionModalOpen(false);
                setConversionSuccess(null);
                fetchPersonasData(); // Refresh list to update if needed
            }, 2000);
        } catch (err: any) {
            console.error("Error al convertir en líder:", err);
            if (err.response?.data?.code === 'ALREADY_LIDER') {
                setConversionError("Esta persona ya está registrada como líder.");
            } else {
                setConversionError("Ocurrió un error al intentar convertir a líder.");
            }
        } finally {
            setIsConverting(false);
        }
    };

    const statusColors: Record<string, { bg: string, text: string, border: string, dot: string }> = {
        'Activo': { bg: 'bg-green-100 dark:bg-green-900/30', text: 'text-green-800 dark:text-green-300', border: 'border-green-200 dark:border-green-900', dot: 'bg-green-500' },
        'Inactivo': { bg: 'bg-red-100 dark:bg-red-900/30', text: 'text-red-800 dark:text-red-300', border: 'border-red-200 dark:border-red-900', dot: 'bg-red-500' },
        'Pendiente': { bg: 'bg-yellow-100 dark:bg-yellow-900/30', text: 'text-yellow-800 dark:text-yellow-300', border: 'border-yellow-200 dark:border-yellow-900', dot: 'bg-yellow-500' },
        'Validado': { bg: 'bg-green-100 dark:bg-green-900/30', text: 'text-green-800 dark:text-green-300', border: 'border-green-200 dark:border-green-900', dot: 'bg-green-500' },
        'Incompleto': { bg: 'bg-orange-100 dark:bg-orange-900/30', text: 'text-orange-800 dark:text-orange-300', border: 'border-orange-200 dark:border-orange-900', dot: 'bg-orange-500' }
    };

    const avatarColors = [
        'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300',
        'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300',
        'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300',
        'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300',
        'bg-pink-100 dark:bg-pink-900/30 text-pink-700 dark:text-pink-300'
    ];

    return (
        <main className="flex-1 overflow-y-auto bg-background-light dark:bg-background-dark p-4 md:p-8 relative">
            <div className="max-w-7xl mx-auto space-y-6">
                {/* Header Section */}
                <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
                    <div>
                        <div className="hidden md:flex items-center text-sm text-gray-500 dark:text-gray-400 gap-2 mb-2">
                            <span onClick={() => window.location.hash = 'dashboard'} className="hover:text-primary cursor-pointer">Dashboard</span>
                            <span className="material-symbols-outlined text-base">chevron_right</span>
                            <span className="text-primary font-medium">Administración de Personas</span>
                        </div>
                        <h1 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white tracking-tight">Personas</h1>
                        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Listado general de simpatizantes registrados.</p>
                    </div>
                    <div className="flex gap-3">
                        <button className="flex items-center gap-2 bg-white dark:bg-card-dark border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200 px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-50 dark:hover:bg-gray-700 shadow-sm transition-colors">
                            <span className="material-symbols-outlined text-lg">upload</span>
                            <span className="hidden sm:inline">Importar</span>
                        </button>
                        <button onClick={() => window.location.hash = 'captacion'} className="flex items-center gap-2 bg-primary text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 shadow-sm shadow-blue-500/30 transition-colors">
                            <span className="material-symbols-outlined text-lg">person_add</span>
                            <span className="hidden sm:inline">Nueva Persona</span>
                            <span className="sm:hidden">Nuevo</span>
                        </button>
                    </div>
                </div>

                {error && (
                    <div className="bg-red-50 dark:bg-red-900/20 border-l-4 border-red-500 p-4 rounded-md">
                        <span className="material-symbols-outlined text-red-500 inline-block align-middle mr-2">error</span>
                        <span className="text-sm text-red-700 dark:text-red-200 align-middle">{error}</span>
                    </div>
                )}

                {/* Filters Section */}
                <div className="bg-card-light dark:bg-card-dark rounded-xl shadow-soft border border-border-light dark:border-border-dark p-4">
                    <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
                        <div className="flex flex-wrap gap-3 w-full md:w-auto flex-1">
                            <div className="relative w-full md:w-80">
                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                    <span className="material-symbols-outlined text-gray-400 text-xl">search</span>
                                </div>
                                <input
                                    value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                                    className="pl-10 block w-full rounded-lg border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white focus:border-primary focus:ring-primary sm:text-sm h-10 transition-shadow"
                                    placeholder="Buscar por nombre, cédula o teléfono..."
                                    type="text"
                                />
                            </div>
                            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 w-full md:w-auto">
                                <select value={sector} onChange={(e) => { setSector(e.target.value); setPage(1); }} className="block w-full md:w-32 rounded-lg border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:border-primary focus:ring-primary text-xs sm:text-sm h-10 transition-shadow">
                                    <option value="">Centro de Votación</option>
                                    {sectores.map(s => <option key={s.sector_id} value={s.sector_id}>{s.nombre}</option>)}
                                </select>
                                <select value={lider} onChange={(e) => { setLider(e.target.value); setPage(1); }} className="block w-full md:w-32 rounded-lg border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:border-primary focus:ring-primary text-xs sm:text-sm h-10 transition-shadow">
                                    <option value="">Líder</option>
                                    {lideres.map(l => <option key={l.lider_id} value={l.lider_id}>{l.nombre_completo}</option>)}
                                </select>
                            </div>
                        </div>
                        <button onClick={handleClearFilters} className="text-sm text-gray-500 dark:text-gray-400 hover:text-primary font-medium flex items-center gap-1 whitespace-nowrap self-end md:self-center">
                            <span className="material-symbols-outlined text-lg">filter_alt_off</span>
                            Limpiar
                        </button>
                    </div>
                </div>

                {/* Content Section */}
                <div className="bg-card-light dark:bg-card-dark rounded-xl shadow-soft border border-border-light dark:border-border-dark overflow-hidden flex flex-col relative min-h-[500px]">

                    {loading ? (
                        <div className="p-8 flex items-center justify-center h-full">
                            <svg className="animate-spin h-8 w-8 text-primary" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                        </div>
                    ) : personas.length === 0 ? (
                        <div className="flex-1 flex flex-col flex flex-col items-center justify-center py-16 px-4 text-center">
                            <div className="h-20 w-20 bg-gray-50 dark:bg-gray-800 rounded-full flex items-center justify-center mb-4">
                                <span className="material-symbols-outlined text-4xl text-gray-300 dark:text-gray-600">search_off</span>
                            </div>
                            <h3 className="text-lg font-medium text-gray-900 dark:text-white">No se encontraron personas</h3>
                            <p className="text-gray-500 dark:text-gray-400 text-sm mt-1 max-w-sm">Intente ajustar los filtros de búsqueda o registre una nueva persona en el sistema.</p>
                            <button onClick={handleClearFilters} className="mt-5 text-primary hover:text-blue-700 font-medium text-sm flex items-center gap-1">
                                Limpiar filtros
                                <span className="material-symbols-outlined text-lg">refresh</span>
                            </button>
                        </div>
                    ) : (
                        <>
                            {/* Mobile View */}
                            <div className="md:hidden divide-y divide-gray-100 dark:divide-gray-700">
                                {personas.map((persona, index) => {
                                    const avatarColor = avatarColors[index % avatarColors.length];
                                    const statusInfo = statusColors[persona.estado_nombre || 'Pendiente'] || statusColors['Pendiente'];
                                    const initials = persona.nombres.charAt(0) + persona.apellidos.charAt(0);

                                    return (
                                        <div key={persona.persona_id} className="p-4 space-y-3 relative hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                                            <div className="flex justify-between items-start">
                                                <div className="flex items-center gap-3">
                                                    <div className={`h-10 w-10 rounded-full ${avatarColor} flex items-center justify-center font-bold text-sm`}>
                                                        {initials}
                                                    </div>
                                                    <div>
                                                        <h3 className="font-semibold text-gray-900 dark:text-white leading-tight">{persona.nombres} {persona.apellidos}</h3>
                                                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{persona.cedula || 'Sin cédula'}</p>
                                                    </div>
                                                </div>
                                                <span className={`px-2 py-1 text-xs font-semibold rounded-full ${statusInfo.bg} ${statusInfo.text} border ${statusInfo.border} flex items-center gap-1`}>
                                                    <span className={`w-1.5 h-1.5 rounded-full ${statusInfo.dot}`}></span>
                                                    {persona.estado_nombre}
                                                </span>
                                            </div>
                                            <div className="grid grid-cols-2 gap-y-2 gap-x-4 text-sm mt-2">
                                                <div>
                                                    <p className="text-xs text-gray-500 dark:text-gray-400 mb-0.5">Teléfono</p>
                                                    <p className="font-medium text-gray-900 dark:text-white">{persona.telefono}</p>
                                                </div>
                                                <div>
                                                    <p className="text-xs text-gray-500 dark:text-gray-400 mb-0.5">Líder</p>
                                                    <p className="font-medium text-gray-900 dark:text-white">{persona.lider_nombre || <span className="text-gray-400 italic">Sin asignar</span>}</p>
                                                </div>
                                            </div>
                                            <div className="pt-3 flex items-center justify-between border-t border-gray-100 dark:border-gray-700/50 mt-3">
                                                <button className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 p-1">
                                                    <span className="material-symbols-outlined">more_horiz</span>
                                                </button>
                                                <button onClick={() => window.location.hash = `personas/${persona.persona_id}`} className="text-primary hover:bg-blue-50 dark:hover:bg-blue-900/20 px-4 py-1.5 rounded-lg text-sm font-medium transition-colors border border-blue-100 dark:border-blue-900/30">
                                                    Ver Detalle
                                                </button>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>

                            {/* Desktop View */}
                            <div className="hidden md:block overflow-x-auto custom-scrollbar flex-1">
                                <table className="min-w-[800px] w-full text-left text-sm text-gray-600 dark:text-gray-300">
                                    <thead className="bg-gray-50 dark:bg-gray-800/50 text-xs uppercase font-semibold text-gray-500 dark:text-gray-400 sticky top-0 z-10 backdrop-blur-sm">
                                        <tr>
                                            <th className="px-6 py-4" scope="col">Nombre Completo</th>
                                            <th className="px-6 py-4" scope="col">Teléfono</th>
                                            <th className="px-6 py-4" scope="col">Cédula</th>
                                            <th className="px-6 py-4" scope="col">Centro de Votación</th>
                                            <th className="px-6 py-4" scope="col">Mesa</th>
                                            <th className="px-6 py-4" scope="col">Líder Asignado</th>
                                            <th className="px-6 py-4" scope="col">Fuente</th>
                                            <th className="px-6 py-4" scope="col">Estado</th>
                                            <th className="px-6 py-4" scope="col">Fecha Registro</th>
                                            <th className="px-6 py-4 text-right" scope="col">Acciones</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                                        {personas.map((persona, index) => {
                                            const avatarColor = avatarColors[index % avatarColors.length];
                                            const statusInfo = statusColors[persona.estado_nombre || 'Pendiente'] || statusColors['Pendiente'];
                                            const initials = persona.nombres.charAt(0) + persona.apellidos.charAt(0);

                                            return (
                                                <tr key={persona.persona_id} className="hover:bg-gray-50 dark:hover:bg-gray-800/30 transition-colors group">
                                                    <td className="px-6 py-4 whitespace-nowrap">
                                                        <div className="flex items-center gap-3">
                                                            <div className={`h-8 w-8 rounded-full ${avatarColor} flex items-center justify-center font-bold text-xs`}>
                                                                {initials}
                                                            </div>
                                                            <div className="font-medium text-gray-900 dark:text-white">{persona.nombres} {persona.apellidos}</div>
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-4 whitespace-nowrap">{persona.telefono}</td>
                                                    <td className="px-6 py-4 whitespace-nowrap text-gray-500">{persona.cedula || '--'}</td>
                                                    <td className="px-6 py-4 whitespace-nowrap">{persona.sector_nombre || '--'}</td>
                                                    <td className="px-6 py-4 whitespace-nowrap">{persona.mesa || '--'}</td>
                                                    <td className="px-6 py-4 whitespace-nowrap">
                                                        {persona.lider_nombre ? (
                                                            <div className="flex items-center gap-2">
                                                                <span className="material-symbols-outlined text-gray-400 text-lg">person</span>
                                                                {persona.lider_nombre}
                                                            </div>
                                                        ) : (
                                                            <span className="text-xs italic text-gray-400">Sin asignar</span>
                                                        )}
                                                    </td>
                                                    <td className="px-6 py-4 whitespace-nowrap">
                                                        <span className="text-xs text-gray-500 bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded">{persona.fuente_nombre || 'Sistema'}</span>
                                                    </td>
                                                    <td className="px-6 py-4 whitespace-nowrap">
                                                        <span className={`px-2.5 py-0.5 text-xs font-semibold rounded-full ${statusInfo.bg} ${statusInfo.text} border ${statusInfo.border} flex items-center gap-1 w-fit`}>
                                                            <span className={`w-1.5 h-1.5 rounded-full ${statusInfo.dot}`}></span>
                                                            {persona.estado_nombre}
                                                        </span>
                                                    </td>
                                                    <td className="px-6 py-4 whitespace-nowrap text-xs text-gray-500">{new Date(persona.fecha_registro).toLocaleDateString()}</td>
                                                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                                        <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                            {persona.estado_nombre === 'Pendiente' && (
                                                                <button className="text-green-600 hover:text-green-700 p-1 rounded hover:bg-green-50 dark:hover:bg-green-900/20" title="Validar">
                                                                    <span className="material-symbols-outlined text-xl">check_circle</span>
                                                                </button>
                                                            )}
                                                            <button onClick={() => window.location.hash = `personas/${persona.persona_id}`} className="text-primary hover:text-blue-700 p-1 rounded hover:bg-blue-50 dark:hover:bg-blue-900/20" title="Ver Detalle">
                                                                <span className="material-symbols-outlined text-xl">visibility</span>
                                                            </button>
                                                            <button className="text-gray-400 hover:text-gray-600 p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-800" title="Más opciones">
                                                                <span className="material-symbols-outlined text-xl">more_vert</span>
                                                            </button>
                                                        </div>
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        </>
                    )}

                    {/* Pagination */}
                    {!loading && personas.length > 0 && (
                        <div className="flex flex-col sm:flex-row items-center justify-between border-t border-gray-200 dark:border-gray-700 p-4 mt-auto bg-gray-50 dark:bg-gray-800/20 gap-4 sm:gap-0">
                            <p className="text-sm text-gray-500 dark:text-gray-400">
                                Mostrando <span className="font-medium text-gray-900 dark:text-white">{(page - 1) * pageSize + 1}</span> a <span className="font-medium text-gray-900 dark:text-white">{Math.min(page * pageSize, totalRecords)}</span> de <span className="font-medium text-gray-900 dark:text-white">{totalRecords}</span> resultados
                            </p>
                            <div className="flex items-center gap-2 w-full sm:w-auto justify-center sm:justify-end">
                                <button
                                    onClick={() => setPage(page - 1)}
                                    disabled={page === 1}
                                    className="px-3 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded-md text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 bg-white dark:bg-card-dark disabled:opacity-50 w-full sm:w-auto">
                                    Anterior
                                </button>
                                <button
                                    onClick={() => setPage(page + 1)}
                                    disabled={page >= totalPages}
                                    className="px-3 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded-md text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 bg-white dark:bg-card-dark shadow-sm w-full sm:w-auto disabled:opacity-50">
                                    Siguiente
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Drawer Overlay */}
            <div
                className={`fixed inset-0 bg-gray-900/50 backdrop-blur-sm z-30 transition-opacity ${selectedPersonaId ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
                onClick={() => setSelectedPersonaId(null)}
            />

            {/* Detail Drawer */}
            <div className={`fixed inset-y-0 right-0 w-full md:w-[480px] bg-white dark:bg-card-dark shadow-2xl z-40 transform transition-transform duration-300 ease-in-out ${selectedPersonaId ? 'translate-x-0' : 'translate-x-full'}`}>
                {loadingDetail ? (
                    <div className="h-full flex items-center justify-center">
                        <svg className="animate-spin h-8 w-8 text-primary" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                    </div>
                ) : personaDetalle ? (
                    <div className="h-full flex flex-col">
                        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between bg-gray-50 dark:bg-gray-800/50">
                            <div>
                                <h2 className="text-lg font-bold text-gray-900 dark:text-white">Detalle de Persona</h2>
                                <p className="text-xs text-gray-500">ID: #{personaDetalle.persona.persona_id.substring(0, 8)}</p>
                            </div>
                            <div className="flex items-center gap-2">
                                {!personaDetalle.persona.is_lider && (
                                    <button onClick={() => setConversionModalOpen(true)} className="hidden md:flex items-center gap-2 bg-primary hover:bg-blue-700 text-white px-3 py-1.5 rounded-lg text-sm font-medium transition-colors shadow-sm">
                                        <span className="material-symbols-outlined text-[16px]">stars</span>
                                        <span>Convertir a Líder</span>
                                    </button>
                                )}
                                <button onClick={() => setSelectedPersonaId(null)} className="text-gray-400 hover:text-gray-600 transition-colors ml-2">
                                    <span className="material-symbols-outlined">close</span>
                                </button>
                            </div>
                        </div>
                        <div className="flex-1 overflow-y-auto p-6 space-y-8">
                            <div className="flex items-start gap-4">
                                <div className="h-16 w-16 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 flex items-center justify-center font-bold text-xl shrink-0">
                                    {personaDetalle.persona.nombres.charAt(0)}{personaDetalle.persona.apellidos.charAt(0)}
                                </div>
                                <div>
                                    <h3 className="text-xl font-bold text-gray-900 dark:text-white">{personaDetalle.persona.nombres} {personaDetalle.persona.apellidos}</h3>
                                    <p className="text-sm text-gray-500 dark:text-gray-400">{personaDetalle.persona.sector_nombre || 'Sin Centro de Votación'} {personaDetalle.persona.mesa ? `| Mesa: ${personaDetalle.persona.mesa}` : ''}</p>
                                    <div className="flex items-center gap-2 mt-2">
                                        <span className={`px-2 py-0.5 text-xs font-semibold rounded-full ${statusColors[personaDetalle.persona.estado_nombre || 'Pendiente']?.bg || 'bg-gray-100'} ${statusColors[personaDetalle.persona.estado_nombre || 'Pendiente']?.text || 'text-gray-800'} border ${statusColors[personaDetalle.persona.estado_nombre || 'Pendiente']?.border || 'border-gray-200'} flex items-center gap-1`}>
                                            <span className={`w-1.5 h-1.5 rounded-full ${statusColors[personaDetalle.persona.estado_nombre || 'Pendiente']?.dot || 'bg-gray-500'}`}></span>
                                            {personaDetalle.persona.estado_nombre}
                                        </span>
                                        <span className="text-xs text-gray-400">Reg: {new Date(personaDetalle.persona.fecha_registro).toLocaleDateString()}</span>
                                    </div>
                                </div>
                            </div>
                            <div>
                                <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3 flex items-center gap-2">
                                    <span className="material-symbols-outlined text-base">person</span>
                                    Información Personal
                                </h4>
                                <div className="grid grid-cols-2 gap-4 bg-gray-50 dark:bg-gray-800/50 rounded-lg p-4 border border-gray-100 dark:border-gray-700">
                                    <div>
                                        <p className="text-xs text-gray-400">Cédula</p>
                                        <p className="font-medium text-gray-900 dark:text-white">{personaDetalle.persona.cedula || '--'}</p>
                                    </div>
                                    <div>
                                        <p className="text-xs text-gray-400">Teléfono</p>
                                        <p className="font-medium text-gray-900 dark:text-white">{personaDetalle.persona.telefono}</p>
                                    </div>
                                    <div className="col-span-2">
                                        <p className="text-xs text-gray-400">Email</p>
                                        <p className="font-medium text-gray-900 dark:text-white truncate">{personaDetalle.persona.email_contacto || '--'}</p>
                                    </div>
                                </div>
                            </div>
                            <div>
                                <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3 flex items-center gap-2">
                                    <span className="material-symbols-outlined text-base">supervisor_account</span>
                                    Asignación Actual
                                </h4>
                                <div className="flex items-center gap-3 p-3 border border-blue-100 dark:border-blue-900 bg-blue-50 dark:bg-blue-900/10 rounded-lg">
                                    <div className="h-10 w-10 rounded-full bg-white dark:bg-card-dark flex items-center justify-center shadow-sm">
                                        <span className="material-symbols-outlined text-primary">person</span>
                                    </div>
                                    <div className="flex-1">
                                        <p className="text-xs text-blue-600 dark:text-blue-400 font-medium">Líder Asignado</p>
                                        <p className="font-bold text-gray-900 dark:text-white">{personaDetalle.asignacion_activa?.lider_nombre || 'Sin asignar'}</p>
                                        {personaDetalle.asignacion_activa && <p className="text-xs text-gray-500">Desde: {new Date(personaDetalle.asignacion_activa.fecha_asignacion).toLocaleDateString()}</p>}
                                    </div>
                                    <button className="text-gray-400 hover:text-primary">
                                        <span className="material-symbols-outlined">edit</span>
                                    </button>
                                </div>
                            </div>

                            {personaDetalle.historial_asignaciones.length > 0 && (
                                <div>
                                    <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3 flex items-center gap-2">
                                        <span className="material-symbols-outlined text-base">history</span>
                                        Historial de Asignaciones
                                    </h4>
                                    <div className="space-y-3">
                                        {personaDetalle.historial_asignaciones.map((hist) => (
                                            <div key={hist.asignacion_id} className="text-sm bg-gray-50 dark:bg-gray-800/30 p-3 rounded-lg border border-gray-100 dark:border-gray-700">
                                                <p className="font-semibold text-gray-900 dark:text-white">{hist.lider_nombre}</p>
                                                <p className="text-xs text-gray-500">Asignado: {new Date(hist.fecha_asignacion).toLocaleDateString()}</p>
                                                <p className="text-xs text-gray-500">Estado: {hist.estado_asignacion_nombre}</p>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            <div>
                                <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3 flex items-center gap-2">
                                    <span className="material-symbols-outlined text-base">notes</span>
                                    Notas
                                </h4>
                                <textarea className="w-full rounded-lg border-gray-300 dark:border-gray-700 bg-white dark:bg-card-dark text-sm focus:border-primary focus:ring-primary h-24 resize-none" placeholder="Agregar una nota interna..." defaultValue={personaDetalle.persona.notas || ''}></textarea>
                                <button className="mt-2 text-xs bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 px-3 py-1.5 rounded transition-colors font-medium">
                                    Guardar Nota
                                </button>
                            </div>
                        </div>
                        <div className="p-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 flex gap-3">
                            <button className="flex-1 bg-white dark:bg-card-dark border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200 px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                                Editar Perfil
                            </button>
                            <button className="flex-1 bg-primary text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 shadow-sm transition-colors">
                                Contactar
                            </button>
                        </div>
                    </div>
                ) : null}
            </div>

            {/* Mobile Convert Button within Drawer */}
            {personaDetalle && !personaDetalle.persona.is_lider && selectedPersonaId && (
                <div className="md:hidden fixed bottom-0 left-0 right-0 p-4 bg-white/80 dark:bg-card-dark/80 backdrop-blur-md border-t border-gray-200 dark:border-gray-700 z-50">
                    <button onClick={() => setConversionModalOpen(true)} className="w-full flex items-center justify-center gap-2 bg-primary hover:bg-blue-700 text-white font-bold py-3.5 px-6 rounded-xl shadow-lg shadow-blue-500/25 transition-all">
                        <span className="material-symbols-outlined text-xl">stars</span>
                        <span>Convertir en Líder</span>
                    </button>
                </div>
            )}

            {/* Conversion Modal */}
            {isConversionModalOpen && personaDetalle && (
                <div className="fixed inset-0 z-[60] overflow-y-auto" role="dialog" aria-modal="true">
                    <div className="fixed inset-0 bg-gray-900/60 backdrop-blur-sm transition-opacity" onClick={() => !isConverting && setConversionModalOpen(false)}></div>
                    <div className="flex min-h-full items-center justify-center p-4 text-center">
                        <div className="relative transform overflow-hidden rounded-2xl bg-white dark:bg-card-dark text-left shadow-2xl transition-all w-full max-w-lg border border-gray-200 dark:border-gray-700">
                            <div className="bg-gray-50 dark:bg-gray-800/50 px-6 py-4 flex items-center justify-between border-b border-gray-100 dark:border-gray-700">
                                <div className="flex items-center gap-3">
                                    <div className="p-2 bg-blue-50 dark:bg-blue-900/20 rounded-full text-primary">
                                        <span className="material-symbols-outlined">social_leaderboard</span>
                                    </div>
                                    <div>
                                        <h3 className="text-lg font-bold text-gray-900 dark:text-white">Conversión a Líder</h3>
                                        <p className="text-xs text-gray-500 dark:text-gray-400">Asigna responsabilidades y metas</p>
                                    </div>
                                </div>
                                <button disabled={isConverting} onClick={() => setConversionModalOpen(false)} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded-full p-1 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
                                    <span className="material-symbols-outlined">close</span>
                                </button>
                            </div>

                            <div className="px-6 py-6 space-y-5">
                                {conversionSuccess && (
                                    <div className="p-3 bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300 text-sm rounded-lg border border-green-200 dark:border-green-800 flex items-center gap-2">
                                        <span className="material-symbols-outlined">check_circle</span>
                                        {conversionSuccess}
                                    </div>
                                )}
                                {conversionError && (
                                    <div className="p-3 bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300 text-sm rounded-lg border border-red-200 dark:border-red-800 flex items-center gap-2">
                                        <span className="material-symbols-outlined">error</span>
                                        {conversionError}
                                    </div>
                                )}

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                                    <div className="md:col-span-2">
                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Meta de Captación</label>
                                        <div className="relative">
                                            <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                                                <span className="text-gray-400 material-symbols-outlined text-[20px]">target</span>
                                            </div>
                                            <input
                                                type="number"
                                                value={metaCantidad}
                                                onChange={(e) => setMetaCantidad(parseInt(e.target.value) || 0)}
                                                className="block w-full pl-10 pr-16 py-2.5 rounded-lg border-gray-300 dark:border-gray-600 focus:border-primary focus:ring-primary dark:bg-gray-800 dark:text-white sm:text-sm"
                                            />
                                            <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                                                <span className="text-gray-400 text-xs">personas</span>
                                            </div>
                                        </div>
                                        <p className="mt-1 text-xs text-gray-500">Objetivo de personas a registrar.</p>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Nivel de Líder</label>
                                        <select
                                            value={nivelLiderId}
                                            onChange={(e) => setNivelLiderId(e.target.value)}
                                            className="block w-full rounded-lg border-gray-300 dark:border-gray-600 focus:border-primary focus:ring-primary dark:bg-gray-800 dark:text-white py-2.5 sm:text-sm"
                                        >
                                            <option value="">Seleccionar nivel...</option>
                                            {nivelesLider.map(nl => (
                                                <option key={nl.nivel_lider_id} value={nl.nivel_lider_id}>{nl.nombre}</option>
                                            ))}
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Líder Superior (Opcional)</label>
                                        <select
                                            value={liderPadreId}
                                            onChange={(e) => setLiderPadreId(e.target.value)}
                                            className="block w-full rounded-lg border-gray-300 dark:border-gray-600 focus:border-primary focus:ring-primary dark:bg-gray-800 dark:text-white py-2.5 sm:text-sm"
                                        >
                                            <option value="">Ninguno</option>
                                            {lideres.map(l => (
                                                <option key={l.lider_id} value={l.lider_id}>{l.nombre_completo}</option>
                                            ))}
                                        </select>
                                    </div>
                                    <div className="md:col-span-2">
                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Estado Inicial</label>
                                        <div className="grid grid-cols-2 gap-3">
                                            {estadosLider.map(est => {
                                                const bg = est.nombre === 'Activo' ? 'peer-checked:bg-green-50 dark:peer-checked:bg-green-900/20 peer-checked:border-green-500 peer-checked:text-green-700 dark:peer-checked:text-green-400'
                                                    : 'peer-checked:bg-orange-50 dark:peer-checked:bg-orange-900/20 peer-checked:border-orange-500 peer-checked:text-orange-700 dark:peer-checked:text-orange-400';
                                                const icon = est.nombre === 'Activo' ? 'check_circle' : 'timelapse';
                                                return (
                                                    <label key={est.estado_lider_id} className="relative cursor-pointer group">
                                                        <input
                                                            type="radio"
                                                            name="estadoLider"
                                                            value={est.estado_lider_id}
                                                            checked={estadoLiderId === est.estado_lider_id}
                                                            onChange={(e) => setEstadoLiderId(e.target.value)}
                                                            className="peer sr-only"
                                                        />
                                                        <div className={`w-full p-3 flex items-center justify-center gap-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 transition-all text-sm font-medium hover:bg-gray-50 dark:hover:bg-gray-700 ${bg}`}>
                                                            <span className="material-symbols-outlined text-[18px]">{icon}</span>
                                                            {est.nombre}
                                                        </div>
                                                    </label>
                                                )
                                            })}
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="bg-gray-50 dark:bg-gray-800/50 px-6 py-4 flex flex-row-reverse gap-3 border-t border-gray-100 dark:border-gray-700">
                                <button
                                    onClick={handleConvertToLider}
                                    disabled={isConverting || !nivelLiderId || !estadoLiderId}
                                    className="flex w-full justify-center rounded-lg bg-primary px-4 py-2 text-sm font-bold text-white shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 sm:w-auto disabled:opacity-50 transition-colors items-center gap-2"
                                >
                                    {isConverting ? (
                                        <>
                                            <svg className="animate-spin h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                            </svg>
                                            Guardando...
                                        </>
                                    ) : (
                                        "Confirmar y Convertir"
                                    )}
                                </button>
                                <button
                                    onClick={() => setConversionModalOpen(false)}
                                    disabled={isConverting}
                                    className="mt-3 flex w-full justify-center rounded-lg bg-white dark:bg-transparent px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 shadow-sm border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-800 sm:mt-0 sm:w-auto transition-colors disabled:opacity-50"
                                >
                                    Cancelar
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </main>
    );
};

export default Personas;
