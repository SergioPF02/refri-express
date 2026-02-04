// Official Service Catalog
// This file is used by both Frontend (for selection) and potentially Backend (for validation if we import it there)

export const SERVICE_CATALOG = [
    {
        id: 'cleaning_split',
        name: 'Mantenimiento Preventivo (Split)',
        category: 'Limpieza',
        minPrice: 500,
        maxPrice: 800,
        description: 'Limpieza profunda de evaporador, condensador y filtros.'
    },
    {
        id: 'cleaning_window',
        name: 'Mantenimiento Preventivo (Ventana)',
        category: 'Limpieza',
        minPrice: 400,
        maxPrice: 600,
        description: 'Limpieza general de unidad de ventana.'
    },
    {
        id: 'gas_recharge',
        name: 'Carga de Gas Refrigerante (1kg)',
        category: 'Reparación',
        minPrice: 800,
        maxPrice: 1200,
        description: 'Recarga de gas R410A o R22 (hasta 1kg).'
    },
    {
        id: 'capacitor_change',
        name: 'Cambio de Capacitor',
        category: 'Reparación',
        minPrice: 600,
        maxPrice: 900,
        description: 'Sustitución de capacitor de arranque dañado.'
    },
    {
        id: 'diagnosis',
        name: 'Diagnóstico / Visita',
        category: 'General',
        minPrice: 300,
        maxPrice: 500,
        description: 'Revisión técnica para detectar fallas (se descuenta si se acepta reparación).'
    }
];

export const getServiceById = (id) => SERVICE_CATALOG.find(s => s.id === id);
