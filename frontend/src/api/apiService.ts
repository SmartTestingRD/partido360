import axios from 'axios';

const API_URL = 'http://localhost:3001/api';

// Add a request interceptor to attach the JWT token to every request
axios.interceptors.request.use((config) => {
    const token = localStorage.getItem('token');
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
}, (error) => {
    return Promise.reject(error);
});

// Add a response interceptor to handle 401 Unauthorized globally
axios.interceptors.response.use(
    (response) => response,
    (error) => {
        if (error.response && error.response.status === 401) {
            localStorage.removeItem('token');
            localStorage.removeItem('user');
            window.location.hash = 'login';
        }
        return Promise.reject(error);
    }
);

export interface Sector {
    sector_id: string;
    nombre: string;
}

export interface Lider {
    lider_id: string;
    nombre_completo: string;
    meta_cantidad: number;
}

export interface Fuente {
    fuente_id: string;
    nombre: string;
}

export interface LiderResumen {
    lider_id: string;
    lider_padre_id: string | null;
    nombre_completo: string;
    telefono: string;
    cedula?: string;
    sector_id: string;
    sector_nombre: string;
    meta_cantidad: number;
    total_reclutados: number;
    porcentaje_cumplimiento: number;
    estado_lider_id: string;
    estado_nombre: string;
    nivel_lider_id: string;
    nivel_nombre: string;
    nombres: string;
    apellidos: string;
}

export interface RegistroPayload {
    nombres: string;
    apellidos: string;
    cedula?: string;
    telefono: string;
    email?: string;
    sector_id: string;
    mesa?: string;
    notas?: string;
    lider_id: string;
    fuente_id: string;
}

export interface UltimoRegistro {
    nombres: string;
    apellidos: string;
    telefono: string;
    fecha_registro: string;
    mesa?: string | null;
    sector_nombre: string;
    lider_nombre: string;
}

export interface EstadoPersona {
    estado_persona_id: string;
    nombre: string;
}

export interface Persona {
    persona_id: string;
    nombres: string;
    apellidos: string;
    cedula: string | null;
    telefono: string;
    email_contacto: string | null;
    mesa?: string | null;
    sector_nombre: string | null;
    lider_nombre: string | null;
    fuente_nombre: string | null;
    estado_nombre: string | null;
    fecha_registro: string;
    is_lider?: boolean;
}

export interface AsignacionActiva {
    asignacion_id: string;
    fecha_asignacion: string;
    lider_nombre: string;
    fuente_nombre: string | null;
}

export interface HistorialAsignacion {
    asignacion_id: string;
    fecha_asignacion: string;
    lider_nombre: string;
    estado_asignacion_nombre: string;
    fuente_nombre: string | null;
}

export interface PersonaDetalle {
    persona: Persona & { notas?: string };
    asignacion_activa: AsignacionActiva | null;
    historial_asignaciones: HistorialAsignacion[];
}

export interface PaginatedResponse<T> {
    data: T[];
    total: number;
    page: number;
    pageSize: number;
    totalPages: number;
}

export const getSectores = async (): Promise<Sector[]> => {
    const response = await axios.get(`${API_URL}/sectores`);
    return response.data.data;
};

export const getLideres = async (): Promise<Lider[]> => {
    const response = await axios.get(`${API_URL}/lideres`);
    return response.data.data;
};

export const getFuentes = async (): Promise<Fuente[]> => {
    const response = await axios.get(`${API_URL}/fuentes`);
    return response.data.data;
};

export interface DashboardData {
    kpis: {
        total_captadas: number;
        nuevos_hoy: number;
        lideres_activos: number;
        meta_global_percent: number;
    };
    ranking_lideres: {
        lider_id: string;
        name: string;
        count: number;
        meta_cantidad: number;
        percent: number;
    }[];
    ranking_sectores: {
        name: string;
        count: number;
        percent: number;
    }[];
    actividad_reciente: {
        target_name: string;
        leader_name: string;
        creator_name: string;
        type: string;
        relative_time: string;
    }[];
}

export const getDashboardData = async (): Promise<DashboardData> => {
    const response = await axios.get(`${API_URL}/dashboard`);
    return response.data.data;
};

export const getLideresResumen = async (params?: { search?: string, sector?: string, estado?: string, nivel?: string, page?: number, pageSize?: number }): Promise<PaginatedResponse<LiderResumen>> => {
    const queryParams = new URLSearchParams();
    if (params) {
        if (params.search) queryParams.append('search', params.search);
        if (params.sector) queryParams.append('sector', params.sector);
        if (params.estado) queryParams.append('estado', params.estado);
        if (params.nivel) queryParams.append('nivel', params.nivel);
        if (params.page) queryParams.append('page', params.page.toString());
        if (params.pageSize) queryParams.append('pageSize', params.pageSize.toString());
    }
    const response = await axios.get(`${API_URL}/lideres-resumen?${queryParams.toString()}`);

    if (response.data.pagination) {
        return {
            data: response.data.data,
            ...response.data.pagination
        };
    }
    return { data: response.data.data, total: 0, page: 1, pageSize: 10, totalPages: 1 };
};

export const getLideresResumenExport = async (params?: { search?: string, sector?: string, estado?: string, nivel?: string }) => {
    const queryParams = new URLSearchParams();
    if (params) {
        if (params.search) queryParams.append('search', params.search);
        if (params.sector) queryParams.append('sector', params.sector);
        if (params.estado) queryParams.append('estado', params.estado);
        if (params.nivel) queryParams.append('nivel', params.nivel);
    }
    const response = await axios.get(`${API_URL}/lideres-resumen/export?${queryParams.toString()}`, {
        responseType: 'blob'
    });
    return response.data;
};

export const postRegistro = async (payload: RegistroPayload) => {
    const response = await axios.post(`${API_URL}/registro`, payload);
    return response.data;
};

export const getUltimoRegistro = async (): Promise<UltimoRegistro | null> => {
    const response = await axios.get(`${API_URL}/ultimo-registro`);
    return response.data.data;
};

export const getEstadosPersona = async (): Promise<EstadoPersona[]> => {
    const response = await axios.get(`${API_URL}/estados-persona`);
    return response.data.data;
};

export interface NivelLider {
    nivel_lider_id: string;
    nombre: string;
}

export interface EstadoLider {
    estado_lider_id: string;
    nombre: string;
}

export interface LiderFormPayload {
    persona_id: string;
    meta_cantidad: number;
    nivel_lider_id: string;
    estado_lider_id: string;
    lider_padre_id?: string | null;
    nombres?: string;
    apellidos?: string;
    telefono?: string;
    sector_id?: string | null;
}

export interface PersonaBusqueda {
    persona_id: string;
    nombre_completo: string;
    telefono: string;
    cedula: string | null;
    sector_nombre: string | null;
    is_lider: boolean;
}

export interface CreateLiderPayload {
    modo: 'NUEVO' | 'EXISTENTE';
    persona_existente?: { persona_id: string };
    persona_nueva?: {
        nombres: string;
        apellidos: string;
        cedula?: string | null;
        telefono: string;
        email?: string | null;
        sector_id: string;
        mesa?: string | null;
        notas?: string | null;
    };
    lider: {
        meta_cantidad: number;
        nivel_lider_id: string;
        estado_lider_id: string;
        lider_padre_id?: string | null;
        codigo_lider?: string | null;
    };
    usuario?: {
        crear: boolean;
        email_login?: string | null;
        username?: string | null;
        generar_password_temporal?: boolean;
        rol_nombre?: string;
        estado_usuario_nombre?: string;
    };
}

export const buscarPersonas = async (q: string): Promise<PersonaBusqueda[]> => {
    if (!q || q.trim().length < 2) return [];
    const response = await axios.get(`${API_URL}/personas/buscar`, { params: { q } });
    return response.data.data;
};

export const getNivelesLider = async (): Promise<NivelLider[]> => {
    const response = await axios.get(`${API_URL}/nivel-lider`);
    return response.data.data;
};

export const getEstadosLider = async (): Promise<EstadoLider[]> => {
    const response = await axios.get(`${API_URL}/estado-lider`);
    return response.data.data;
};

export const crearLider = async (data: LiderFormPayload): Promise<any> => {
    const response = await axios.post(`${API_URL}/lideres`, data);
    return response.data;
};

export const createLiderFull = async (data: CreateLiderPayload): Promise<any> => {
    const response = await axios.post(`${API_URL}/lideres/crear`, data);
    return response.data;
};

export interface CreateLiderHierarchyPayload {
    nombres: string;
    apellidos: string;
    cedula?: string | null;
    telefono: string;
    email?: string | null;
    sector_id: string;
    lider_padre_id: string;
    meta_cantidad?: number;
    usuario?: {
        crear: boolean;
        email_login?: string | null;
        generar_password_temporal?: boolean;
        rol_nombre?: string;
        estado_usuario_nombre?: string;
    };
}

export const createLiderHierarchy = async (payload: CreateLiderHierarchyPayload): Promise<any> => {
    const response = await axios.post(`${API_URL}/lideres/hierarchy`, payload);
    return response.data;
};

export const updateLider = async (id: string, data: Partial<LiderFormPayload>): Promise<any> => {
    const response = await axios.put(`${API_URL}/lideres/${id}`, data);
    return response.data;
};

export const getPersonas = async (params: { q?: string; sector_id?: string; lider_id?: string; estado_persona_id?: string; page?: number; pageSize?: number; }): Promise<PaginatedResponse<Persona>> => {
    const response = await axios.get(`${API_URL}/personas`, { params });
    // Note: handling custom pagination response format if provided, otherwise default mapping
    const resData = response.data;
    if (resData.pagination) {
        return {
            data: resData.data,
            ...resData.pagination
        };
    }
    return { data: resData.data, total: 0, page: 1, pageSize: 10, totalPages: 1 };
};

export const getPersonaDetalle = async (id: string): Promise<PersonaDetalle> => {
    const response = await axios.get(`${API_URL}/personas/${id}`);
    return response.data.data;
};

export interface LiderDetalleInfo {
    lider_id: string;
    persona_id: string;
    meta_cantidad: number;
    codigo_lider: string | null;
    lider_padre_id: string | null;
    lider_padre_nombre?: string | null;
    nombres: string;
    apellidos: string;
    nombre_completo: string;
    telefono: string;
    sector_id: string | null;
    sector_nombre: string | null;
    estado_lider: {
        id: string;
        nombre: string;
    };
    nivel_lider: {
        id: string;
        nombre: string;
    };
}

export interface MetricasLider {
    total_registrados_activos: number;
    porcentaje_cumplimiento: number;
    total_registrados_historico: number;
}

export interface LiderDetalleCompleto {
    lider: LiderDetalleInfo;
    metricas: MetricasLider;
}

export const getLiderDetalle = async (id: string): Promise<LiderDetalleCompleto> => {
    const response = await axios.get(`${API_URL}/lideres/${id}`);
    return response.data.data;
};

export const getLiderPersonas = async (id: string, params?: { q?: string; estado_persona_id?: string; sector_id?: string; fuente_id?: string; fecha_inicio?: string; fecha_fin?: string; page?: number; pageSize?: number }): Promise<PaginatedResponse<any>> => {
    const response = await axios.get(`${API_URL}/lideres/${id}/personas`, { params });
    const resData = response.data;
    if (resData.pagination) {
        return {
            data: resData.data,
            ...resData.pagination
        };
    }
    return { data: resData.data, total: 0, page: 1, pageSize: 10, totalPages: 1 };
};
