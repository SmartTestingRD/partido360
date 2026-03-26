import { useState, useEffect } from 'react';
import {
    getSectores,
    getEstadosLider,
    getNivelesLider,
    getLideres,
    updateLider,
    EstadoLider,
    NivelLider,
    Lider,
    Sector
} from '../api/apiService';

export interface EditLiderFormValues {
    nombres: string;
    apellidos: string;
    telefono: string;
    sector_id: string;
    meta_cantidad: number;
    estado_lider_id: string;
    nivel_lider_id: string;
    lider_padre_id: string;
}

interface EditLiderModalProps {
    isOpen: boolean;
    liderId: string;
    initialValues: EditLiderFormValues;
    onClose: () => void;
    onSuccess: () => void;
    addToast: (message: string, type?: 'success' | 'error' | 'info') => void;
}

function formatTelefonoEdit(value: string): string {
  const digits = value.replace(/\D/g, '');
  if (digits.length <= 3) return digits;
  if (digits.length <= 6) return `${digits.slice(0,3)}-${digits.slice(3)}`;
  return `${digits.slice(0,3)}-${digits.slice(3,6)}-${digits.slice(6,10)}`;
}

const EditLiderModal = ({ isOpen, liderId, initialValues, onClose, onSuccess, addToast }: EditLiderModalProps) => {
    const [form, setForm] = useState<EditLiderFormValues>(initialValues);
    const [isSaving, setIsSaving] = useState(false);

    // Catalogs
    const [sectores, setSectores] = useState<Sector[]>([]);
    const [estadosLider, setEstadosLider] = useState<EstadoLider[]>([]);
    const [nivelesLider, setNivelesLider] = useState<NivelLider[]>([]);
    const [allLideres, setAllLideres] = useState<Lider[]>([]);

    // Reset form whenever initialValues change (i.e. when a different leader is selected)
    useEffect(() => {
        setForm(initialValues);
    }, [initialValues]);

    // Load catalogs on first open
    useEffect(() => {
        if (!isOpen) return;
        const fetchCatalogs = async () => {
            try {
                const [s, e, n, l] = await Promise.all([
                    getSectores(),
                    getEstadosLider(),
                    getNivelesLider(),
                    getLideres()
                ]);
                setSectores(s);
                setEstadosLider(e);
                setNivelesLider(n);
                setAllLideres(l.filter((lid: Lider) => lid.lider_id !== liderId));
            } catch (err) {
                console.error('Error loading catalogs', err);
            }
        };
        fetchCatalogs();
    }, [isOpen, liderId]);

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        if (name === 'nombres' || name === 'apellidos') {
            const cleanValue = value.replace(/[^a-zA-ZáéíóúÁÉÍÓÚñÑ\s'-]/g, '');
            setForm(prev => ({ ...prev, [name]: cleanValue }));
        } else {
            setForm(prev => ({ ...prev, [name]: value }));
        }
    };

    const handleSave = async () => {
        if (!form.nombres.trim()) {
            addToast('El nombre es obligatorio', 'error');
            return;
        }
        if (/\d/.test(form.nombres)) {
            addToast('El nombre no puede contener números', 'error');
            return;
        }
        if (!form.apellidos.trim()) {
            addToast('Los apellidos son obligatorios', 'error');
            return;
        }
        if (/\d/.test(form.apellidos)) {
            addToast('Los apellidos no pueden contener números', 'error');
            return;
        }
        if (!form.telefono.trim()) {
            addToast('El teléfono es obligatorio', 'error');
            return;
        }
        if (form.telefono.replace(/\D/g,'').length < 10) {
            addToast('El teléfono debe tener 10 dígitos', 'error');
            return;
        }
        if (form.meta_cantidad < 1) {
            addToast('La meta debe ser al menos 1', 'error');
            return;
        }

        setIsSaving(true);
        try {
            await updateLider(liderId, {
                meta_cantidad: form.meta_cantidad,
                estado_lider_id: form.estado_lider_id,
                nivel_lider_id: form.nivel_lider_id,
                // lider_padre_id es de solo lectura — no se envía al backend
                nombres: form.nombres,
                apellidos: form.apellidos,
                telefono: form.telefono,
                sector_id: form.sector_id || null
            });
            addToast('Líder actualizado correctamente', 'success');
            onClose();
            onSuccess();
        } catch (err) {
            console.error('Error updating leader', err);
            addToast('Error al actualizar el líder', 'error');
        } finally {
            setIsSaving(false);
        }
    };

    if (!isOpen) return null;

    const inputCls = "w-full bg-slate-50 dark:bg-slate-900 border-0 rounded-xl py-3 px-4 text-slate-900 dark:text-white focus:ring-2 focus:ring-primary/50 transition-all font-medium placeholder:text-slate-400";
    const selectCls = `${inputCls} appearance-none`;
    const labelCls = "block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5 ml-1";

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in">
            <div className="bg-white dark:bg-[#15202e] w-full max-w-md rounded-2xl shadow-2xl overflow-hidden animate-scale-up border border-slate-200 dark:border-slate-800">
                {/* Header */}
                <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-800/50">
                    <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                        <span className="material-symbols-outlined text-primary">edit_square</span>
                        Editar Líder
                    </h3>
                    <button onClick={onClose} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors">
                        <span className="material-symbols-outlined">close</span>
                    </button>
                </div>

                {/* Body */}
                <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">

                    {/* Nombres / Apellidos */}
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className={labelCls}>Nombres *</label>
                            <input type="text" 
                                name="nombres"
                                value={form.nombres} 
                                onChange={handleInputChange} 
                                className={inputCls} 
                                placeholder="Ej: Juan" />
                        </div>
                        <div>
                            <label className={labelCls}>Apellidos *</label>
                            <input type="text" 
                                name="apellidos"
                                value={form.apellidos} 
                                onChange={handleInputChange} 
                                className={inputCls} 
                                placeholder="Ej: Pérez" />
                        </div>
                    </div>

                    {/* Teléfono / Sector */}
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className={labelCls}>Teléfono *</label>
                            <input
                                type="text"
                                className={inputCls}
                                placeholder="809-000-0000"
                                value={form.telefono}
                                onChange={e => setForm(p => ({ ...p, telefono: formatTelefonoEdit(e.target.value) }))}
                                maxLength={12}
                            />
                        </div>
                        <div>
                            <label className={labelCls}>Sector *</label>
                            <select 
                                name="sector_id"
                                value={form.sector_id} 
                                onChange={handleInputChange} 
                                className={selectCls}>
                                <option value="">Seleccionar</option>
                                {sectores.map(s => <option key={s.sector_id} value={s.sector_id}>{s.nombre}</option>)}
                            </select>
                        </div>
                    </div>

                    <div className="h-px bg-slate-100 dark:bg-slate-800 my-1" />

                    {/* Meta / Estado */}
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className={labelCls}>Meta *</label>
                            <div className="relative">
                                <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-[18px]">flag</span>
                                <input type="number" 
                                    name="meta_cantidad"
                                    min="1" 
                                    value={form.meta_cantidad} 
                                    onChange={e => setForm(p => ({ ...p, meta_cantidad: parseInt(e.target.value) || 0 }))} 
                                    className={`${inputCls} pl-10`} />
                            </div>
                        </div>
                        <div>
                            <label className={labelCls}>Estado *</label>
                            <select 
                                name="estado_lider_id"
                                value={form.estado_lider_id} 
                                onChange={handleInputChange} 
                                className={selectCls}>
                                {estadosLider.map(e => <option key={e.estado_lider_id} value={e.estado_lider_id}>{e.nombre}</option>)}
                            </select>
                        </div>
                    </div>

                    {/* Nivel / Superior */}
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className={labelCls}>Nivel *</label>
                            <select 
                                name="nivel_lider_id"
                                value={form.nivel_lider_id} 
                                onChange={handleInputChange} 
                                className={selectCls}>
                                {nivelesLider.map(n => <option key={n.nivel_lider_id} value={n.nivel_lider_id}>{n.nombre}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className={labelCls}>Superior</label>
                            <select 
                                name="lider_padre_id"
                                value={form.lider_padre_id} 
                                onChange={handleInputChange} 
                                className={selectCls}>
                                <option value="">Ninguno (Cabeza)</option>
                                {allLideres.map(l => <option key={l.lider_id} value={l.lider_id}>{l.nombre_completo}</option>)}
                            </select>
                        </div>
                    </div>
                </div>

                {/* Footer */}
                <div className="px-6 py-4 bg-slate-50 dark:bg-slate-800/50 flex items-center justify-end gap-3 border-t border-slate-100 dark:border-slate-800">
                    <button onClick={onClose} className="px-5 py-2.5 rounded-xl text-sm font-bold text-slate-500 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors">
                        Cancelar
                    </button>
                    <button onClick={handleSave} disabled={isSaving} className="px-6 py-2.5 rounded-xl text-sm font-bold text-white bg-primary hover:bg-primary-hover disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-primary/25 transition-all flex items-center gap-2">
                        {isSaving ? (
                            <>
                                <svg className="animate-spin h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                                </svg>
                                Guardando...
                            </>
                        ) : (
                            <>
                                <span className="material-symbols-outlined text-[18px]">save</span>
                                Guardar Cambios
                            </>
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default EditLiderModal;
