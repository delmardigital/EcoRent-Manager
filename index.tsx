import { GoogleGenAI } from "@google/genai";

// --- Base de Datos de Catálogo ---
const CATALOG = {
    categories: [
        { id: 'AUTOS', name: 'Autos', module: 'vehicle' },
        { id: 'SCOOTER', name: 'Scooter - Motorbikes', module: 'vehicle' },
        { id: 'BIKE_NORMAL', name: 'Normal Bikes', module: 'bike' },
        { id: 'BIKE_EB_CITY', name: 'E-Bike City', module: 'bike' },
        { id: 'BIKE_EMTB', name: 'E-MTB', module: 'bike' },
        { id: 'BIKE_EFAT', name: 'E-FatBIKE', module: 'bike' },
        { id: 'TOURS', name: 'Excursions', module: 'tour' },
        { id: 'PADDLE', name: 'Paddle Surf', module: 'tour' },
        { id: 'BOAT', name: 'Boat Rental', module: 'tour' }
    ],
    products: [
        { name: 'Citroen C3 / Peugeot 208', cat: 'AUTOS', price: 50, module: 'vehicle' },
        { name: 'NEW Toyota Aygo X BASIC', cat: 'AUTOS', price: 50, module: 'vehicle' },
        { name: 'Toyota Aygo BASIC', cat: 'AUTOS', price: 45, module: 'vehicle' },
        { name: 'TOYOTA AYGO OPEN', cat: 'AUTOS', price: 50, module: 'vehicle' },
        { name: 'Piaggio Liberty 125cc', cat: 'SCOOTER', price: 35, module: 'vehicle' },
        { name: 'PIAGGIO MEDLEY 125CC', cat: 'SCOOTER', price: 40, module: 'vehicle' },
        { name: 'City Bike', cat: 'BIKE_NORMAL', price: 6, module: 'bike' },
        { name: 'E-Bike City Bike', cat: 'BIKE_EB_CITY', price: 15, module: 'bike' },
        { name: 'E-CITY BIKE Nuevo Modelo', cat: 'BIKE_EB_CITY', price: 20, module: 'bike' },
        { name: 'E-Mountain Bike EMB', cat: 'BIKE_EMTB', price: 20, module: 'bike' },
        { name: 'Discovery Tour 2 HOURS', cat: 'TOURS', price: 65, module: 'tour' },
        { name: 'Tour Catamaran Palma', cat: 'TOURS', price: 35, module: 'tour' },
        { name: 'Paddle Surf SUP', cat: 'PADDLE', price: 12, module: 'tour' },
        { name: 'Boat Rental B450 Theia', cat: 'BOAT', price: 200, module: 'tour' }
    ]
};

const COMPANY_INFO = {
    name: "EcoRent Mobility Solutions",
    owner: "Sasha Kalko",
    address: "Calle Costa Brava 1, 07610 Palma",
    email: "info@ecorentmobility.com",
    web: "www.ecorentmobility.com"
};

const DEFAULT_GAS_URL = "https://script.google.com/macros/s/AKfycbxZyzj2hH6sTlkxWbXe2TLepR8fH0rI1wNxAhgPprzTMGMkxT-EYtL2FH3aGOge3FOw/exec";

// --- Tipos e Interfaces ---
interface Settings { gasUrl: string; }
type ModuleType = 'vehicle' | 'bike' | 'tour';

interface Contract {
    id: string;
    contractNumber: string;
    createdAt: string;
    updatedAt?: string;
    timestamp: number;
    module: ModuleType;
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
    dni?: string;
    country?: string;
    license?: string;
    licenseExpiry?: string;
    licenseCategory?: string;
    hotelName?: string;
    roomNumber?: string;
    homeAddress?: string;
    type: string;
    product: string;
    id_extra?: string;
    start_date: string;
    start_time: string;
    end_date: string;
    end_time: string;
    duration: number;
    quantity: number;
    price_unit: number;
    extras_total: number;
    extras_list: string[];
    total: number;
    notes: string;
}

declare global {
    interface Window {
        navigate: (view: string) => void;
        toggleSettings: () => void;
        saveSettings: () => void;
        recalculateTotals: () => void;
        handleFormSubmit: (e: Event, module: ModuleType) => Promise<void>;
        showInvoice: (contract: Contract) => void;
        downloadPDF: (id: string) => void;
        shareWhatsApp: (id: string) => void;
        viewInvoice: (id: string) => void;
        deleteContract: (id: string) => void;
        editContract: (id: string) => void;
        autofillCurrentForm: () => void;
        fillWithExampleData: () => void;
        toggleTheme: () => void;
        updateProductList: (module: ModuleType, catId: string) => void;
        syncAllToCloud: () => Promise<void>;
        contactIT: () => void;
    }
    var lucide: any;
    var QRCode: any;
    var html2pdf: any;
}

// --- Global State ---
const savedSettings = localStorage.getItem('ecorent_settings');
let state = {
    currentView: 'dashboard',
    editingId: null as string | null,
    contracts: JSON.parse(localStorage.getItem('ecorent_contracts') || '[]') as Contract[],
    settings: (savedSettings ? JSON.parse(savedSettings) : { gasUrl: DEFAULT_GAS_URL }) as Settings,
    lastId: parseInt(localStorage.getItem('ecorent_last_id') || '0'),
    lastClient: JSON.parse(localStorage.getItem('ecorent_last_client') || 'null'),
    theme: localStorage.getItem('ecorent_theme') || 'light'
};

// --- Logic functions ---
window.navigate = (view: string) => {
    state.currentView = view;
    state.editingId = null;
    render();
    document.querySelectorAll('.nav-tab').forEach(el => el.classList.remove('active'));
    const tabId = `nav-${view}`;
    document.getElementById(tabId)?.classList.add('active');
};

window.toggleTheme = () => {
    state.theme = state.theme === 'light' ? 'dark' : 'light';
    applyTheme();
    saveState();
};

const applyTheme = () => {
    document.documentElement.setAttribute('data-theme', state.theme);
    if (state.theme === 'dark') document.documentElement.classList.add('dark');
    else document.documentElement.classList.remove('dark');
    
    const themeIcon = document.getElementById('theme-icon');
    if (themeIcon) {
        themeIcon.setAttribute('data-lucide', state.theme === 'light' ? 'moon' : 'sun');
        if (window.lucide) window.lucide.createIcons();
    }
};

window.toggleSettings = () => {
    const modal = document.getElementById('settings-modal');
    modal?.classList.toggle('hidden');
    modal?.classList.toggle('flex');
    if (!modal?.classList.contains('hidden')) {
        const gasInput = document.getElementById('gas-url') as HTMLInputElement;
        if (gasInput) gasInput.value = state.settings.gasUrl;
    }
};

window.saveSettings = () => {
    const url = (document.getElementById('gas-url') as HTMLInputElement).value;
    state.settings.gasUrl = url || DEFAULT_GAS_URL;
    saveState();
    window.toggleSettings();
    render();
};

window.contactIT = () => {
    const msg = encodeURIComponent("Hola, necesito asistencia técnica con el Sistema de Gestión EcoRent.");
    window.open(`https://wa.me/34698971708?text=${msg}`, '_blank');
};

window.autofillCurrentForm = () => {
    if (!state.lastClient) {
        alert("No hay datos guardados de clientes anteriores.");
        return;
    }
    const form = document.getElementById('main-form') as HTMLFormElement;
    if (!form) return;
    Object.keys(state.lastClient).forEach(key => {
        const input = form.querySelector(`[name="${key}"]`) as HTMLInputElement;
        if (input) input.value = state.lastClient[key] || '';
    });
    window.recalculateTotals();
};

window.fillWithExampleData = () => {
    const form = document.getElementById('main-form') as HTMLFormElement;
    if (!form) { alert("Entra en un módulo de alquiler primero."); return; }
    const examples: Record<string, string> = {
        firstName: "Cliente", lastName: "Ejemplo", email: "ejemplo@ecorent.com", phone: "+34 600000000",
        country: "España", dni: "12345678Z", license: "B-12345678", price_unit: "50", quantity: "1", duration: "2"
    };
    Object.keys(examples).forEach(key => {
        const input = form.querySelector(`[name="${key}"]`) as HTMLInputElement;
        if (input) input.value = examples[key];
    });
    window.recalculateTotals();
};

const isSummer = () => { const month = new Date().getMonth(); return month >= 3 && month <= 9; };
const getRecommendedReturnTime = (module: ModuleType) => isSummer() ? (module === 'vehicle' ? '20:00' : '21:00') : '07:00';
const generateContractNumber = () => { state.lastId++; return state.lastId.toString().padStart(6, '0'); };

const saveState = () => {
    localStorage.setItem('ecorent_contracts', JSON.stringify(state.contracts));
    localStorage.setItem('ecorent_settings', JSON.stringify(state.settings));
    localStorage.setItem('ecorent_last_id', state.lastId.toString());
    localStorage.setItem('ecorent_theme', state.theme);
    updateSyncStatus();
};

const updateSyncStatus = () => {
    const led = document.getElementById('sync-status');
    if (led) led.className = `status-led ${state.settings.gasUrl ? 'text-green-500 bg-green-500 animate-pulse' : 'text-yellow-400 bg-yellow-400'}`;
};

const syncToSheets = async (contract: Contract) => {
    if (!state.settings.gasUrl) return false;
    try {
        const payload = {
            "Numero Contrato": contract.contractNumber, "FECHA": contract.createdAt, "FECHA MODIFICACION": contract.updatedAt || "",
            "Nombre": contract.firstName, "Apellido": contract.lastName, "Email": contract.email, "Teléfono": contract.phone,
            "País": contract.country, "DNI": contract.dni, "Modelo": contract.product, "Fecha Entrega": contract.start_date,
            "Fecha Devolución": contract.end_date, "Días": contract.duration, "Precio/Día": contract.price_unit,
            "Total": contract.total, "Gestión": COMPANY_INFO.owner
        };
        await fetch(state.settings.gasUrl, { method: 'POST', mode: 'no-cors', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
        return true;
    } catch (e) { return false; }
};

window.syncAllToCloud = async () => {
    if (!state.settings.gasUrl) { alert("Configura la URL de Apps Script."); return; }
    const btn = document.getElementById('sync-all-btn');
    if (btn) btn.innerText = "Enviando...";
    for (const c of state.contracts) await syncToSheets(c);
    alert("Datos sincronizados con éxito.");
    if (btn) btn.innerText = "Enviar al excel nube";
    render();
};

// --- Form Components ---
const FormHeader = (title: string, colorClass: string, isEdit = false, contractNo = "") => `
    <header class="flex items-center justify-between mb-8">
        <button onclick="window.navigate('dashboard')" class="btn-icon bg-gray-100 text-gray-600"><i data-lucide="chevron-left"></i></button>
        <h2 class="text-2xl font-extrabold text-${colorClass}-600 tracking-tight">${isEdit ? 'Modificar' : 'Nuevo'} ${title}</h2>
        <div class="bg-${colorClass}-50 text-${colorClass}-700 px-4 py-1.5 rounded-full text-xs font-mono font-black border border-${colorClass}-200/50">#${contractNo || (state.lastId + 1).toString().padStart(6, '0')}</div>
    </header>
`;

const ClientInfoForm = (data: Partial<Contract> = {}) => `
    <div class="card p-8 space-y-6">
        <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
            <input type="text" name="firstName" value="${data.firstName || ''}" placeholder="Nombre" required class="input-field">
            <input type="text" name="lastName" value="${data.lastName || ''}" placeholder="Apellido" required class="input-field">
            <input type="email" name="email" value="${data.email || ''}" placeholder="Email" required class="input-field">
            <input type="tel" name="phone" value="${data.phone || ''}" placeholder="Teléfono" required class="input-field">
            <input type="text" name="country" value="${data.country || ''}" placeholder="País" class="input-field">
            <input type="text" name="dni" value="${data.dni || ''}" placeholder="DNI / Pasaporte" required class="input-field">
        </div>
    </div>
`;

const CommonAlquilerForm = (module: ModuleType, data: Partial<Contract> = {}) => {
    const isEdit = !!data.id;
    const today = new Date().toISOString().split('T')[0];
    const timeNow = new Date().toTimeString().split(' ')[0].slice(0, 5);
    const color = module === 'vehicle' ? 'red' : (module === 'bike' ? 'green' : 'blue');
    const labelTitle = module === 'vehicle' ? 'Vehículo' : (module === 'bike' ? 'Bicicleta' : 'Tour');

    return `
        <div class="space-y-8 animate-fade-in">
            ${FormHeader(labelTitle, color, isEdit, data.contractNumber)}
            <form id="main-form" onsubmit="window.handleFormSubmit(event, '${module}')" class="space-y-8">
                ${isEdit ? `<input type="hidden" name="id" value="${data.id}">` : ''}
                ${ClientInfoForm(data)}
                
                <div class="card p-8 space-y-6">
                    <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <select name="type" class="input-field" onchange="window.updateProductList('${module}', this.value)">
                            <option value="">Seleccionar tipo...</option>
                            ${CATALOG.categories.filter(c => c.module === module).map(c => `<option value="${c.id}" ${data.type === c.id ? 'selected' : ''}>${c.name}</option>`).join('')}
                        </select>
                        <select name="product" id="product-select" class="input-field" required>
                            <option value="">Seleccionar modelo...</option>
                            ${data.product ? `<option value="${data.product}" selected>${data.product}</option>` : ''}
                        </select>
                    </div>

                    <div class="grid grid-cols-2 md:grid-cols-4 gap-6">
                        <div class="flex flex-col"><label class="text-[10px] font-bold opacity-50 uppercase ml-1">Cantidad</label><input type="number" name="quantity" value="${data.quantity || 1}" min="1" class="input-field" onchange="window.recalculateTotals()"></div>
                        <div class="flex flex-col"><label class="text-[10px] font-bold opacity-50 uppercase ml-1">Fecha</label><input type="date" name="start_date" value="${data.start_date || today}" class="input-field" onchange="window.recalculateTotals()"></div>
                        <div class="flex flex-col"><label class="text-[10px] font-bold opacity-50 uppercase ml-1">Hora</label><input type="time" name="start_time" value="${data.start_time || timeNow}" class="input-field"></div>
                        <div class="flex flex-col"><label class="text-[10px] font-bold opacity-50 uppercase ml-1">${module === 'vehicle' ? 'Días' : 'Duración'}</label><input type="number" name="duration" value="${data.duration || 1}" class="input-field" onchange="window.recalculateTotals()"></div>
                    </div>
                </div>

                <div class="card p-8 bg-${color === 'green' ? 'primary' : color + '-600'} text-white flex flex-col md:flex-row justify-between items-center gap-6 shadow-2xl">
                    <div class="text-center md:text-left">
                        <p class="text-[10px] uppercase font-black opacity-80 tracking-widest">Total Alquiler</p>
                        <h3 class="text-4xl font-black" id="total-preview">€${(data.total || 0).toFixed(2)}</h3>
                    </div>
                    <div class="flex gap-4 w-full md:w-auto">
                        <input type="number" name="price_unit" value="${data.price_unit || ''}" placeholder="Precio Unit" class="input-field w-32 bg-white/20 border-white/20 text-white placeholder:text-white/60" onchange="window.recalculateTotals()">
                        <button type="submit" class="bg-white text-${color === 'green' ? 'primary' : color + '-600'} px-12 py-4 rounded-2xl font-black shadow-lg hover:scale-105 transition-all">${isEdit ? 'ACTUALIZAR' : 'GUARDAR'}</button>
                    </div>
                </div>
            </form>
        </div>
    `;
};

window.updateProductList = (module: ModuleType, catId: string) => {
    const select = document.getElementById('product-select') as HTMLSelectElement;
    const priceInput = document.querySelector('input[name="price_unit"]') as HTMLInputElement;
    if (!select) return;
    const filtered = CATALOG.products.filter(p => p.cat === catId);
    select.innerHTML = '<option value="">Seleccionar modelo...</option>' + 
        filtered.map(p => `<option value="${p.name}" data-price="${p.price}">${p.name}</option>`).join('');
    
    if (filtered.length > 0 && priceInput && !priceInput.value) {
        priceInput.value = filtered[0].price.toString();
        window.recalculateTotals();
    }
};

window.recalculateTotals = () => {
    const form = document.getElementById('main-form') as HTMLFormElement;
    if (!form) return;
    const formData = new FormData(form);
    const price = parseFloat(formData.get('price_unit') as string || '0');
    const qty = parseFloat(formData.get('quantity') as string || '1');
    const dur = parseFloat(formData.get('duration') as string || '1');
    const preview = document.getElementById('total-preview');
    if (preview) preview.innerText = `€${(price * qty * dur).toFixed(2)}`;
};

window.handleFormSubmit = async (e: Event, module: ModuleType) => {
    e.preventDefault();
    const form = e.target as HTMLFormElement;
    const formData = new FormData(form);
    const editId = formData.get('id') as string | null;

    const clientData = {
        firstName: formData.get('firstName') as string,
        lastName: formData.get('lastName') as string,
        email: formData.get('email') as string,
        phone: formData.get('phone') as string,
        country: formData.get('country') as string,
        dni: formData.get('dni') as string
    };

    state.lastClient = clientData;
    localStorage.setItem('ecorent_last_client', JSON.stringify(clientData));

    const totalStr = document.getElementById('total-preview')?.innerText.replace('€', '') || '0';
    
    if (editId) {
        const index = state.contracts.findIndex(c => c.id === editId);
        if (index !== -1) {
            const updated: Contract = {
                ...state.contracts[index],
                ...clientData,
                updatedAt: new Date().toLocaleString(),
                type: formData.get('type') as string,
                product: formData.get('product') as string,
                start_date: formData.get('start_date') as string,
                start_time: formData.get('start_time') as string,
                duration: parseFloat(formData.get('duration') as string) || 1,
                quantity: parseFloat(formData.get('quantity') as string) || 1,
                price_unit: parseFloat(formData.get('price_unit') as string) || 0,
                total: parseFloat(totalStr)
            };
            state.contracts[index] = updated;
            saveState();
            await syncToSheets(updated);
            window.showInvoice(updated);
        }
    } else {
        const contract: Contract = {
            id: crypto.randomUUID(),
            contractNumber: generateContractNumber(),
            createdAt: new Date().toISOString().split('T')[0],
            timestamp: Date.now(),
            module,
            ...clientData,
            type: formData.get('type') as string,
            product: formData.get('product') as string,
            start_date: formData.get('start_date') as string,
            start_time: formData.get('start_time') as string,
            end_date: formData.get('start_date') as string, // Simplificado para nuevo
            end_time: '20:00',
            duration: parseFloat(formData.get('duration') as string) || 1,
            quantity: parseFloat(formData.get('quantity') as string) || 1,
            price_unit: parseFloat(formData.get('price_unit') as string) || 0,
            extras_total: 0,
            extras_list: [],
            total: parseFloat(totalStr),
            notes: ""
        };
        state.contracts.push(contract);
        saveState();
        await syncToSheets(contract);
        window.showInvoice(contract);
    }
};

window.viewInvoice = (id: string) => { const c = state.contracts.find(x => x.id === id); if (c) window.showInvoice(c); };
window.deleteContract = (id: string) => { if (confirm('¿Eliminar registro?')) { state.contracts = state.contracts.filter(c => c.id !== id); saveState(); render(); } };
window.editContract = (id: string) => { state.editingId = id; render(); };

window.showInvoice = (c: Contract) => {
    const container = document.getElementById('view-container');
    const color = c.module === 'vehicle' ? 'red-600' : (c.module === 'bike' ? 'primary' : 'blue-600');
    
    container!.innerHTML = `
        <div class="space-y-8 animate-fade-in">
            <div class="flex justify-between items-center">
                <button onclick="window.navigate('history')" class="btn-icon bg-gray-100 text-gray-600"><i data-lucide="arrow-left"></i></button>
                <div class="flex gap-2">
                    <button onclick="window.downloadPDF('${c.id}')" class="bg-black text-white px-6 py-3 rounded-xl font-bold flex items-center gap-2"><i data-lucide="printer" class="w-4 h-4"></i> PDF</button>
                    <button onclick="window.shareWhatsApp('${c.id}')" class="bg-green-600 text-white px-6 py-3 rounded-xl font-bold flex items-center gap-2"><i data-lucide="send" class="w-4 h-4"></i> WhatsApp</button>
                </div>
            </div>
            
            <div id="invoice-render-area" class="card p-12 bg-white max-w-2xl mx-auto space-y-8 border shadow-2xl">
                <div class="flex justify-between items-start border-b pb-8">
                    <div>
                        <h1 class="text-3xl font-black text-${color}">${COMPANY_INFO.name}</h1>
                        <p class="text-xs font-bold text-muted uppercase tracking-widest mt-1">${COMPANY_INFO.address}</p>
                    </div>
                    <div class="text-right">
                        <div class="bg-gray-50 p-3 rounded-2xl inline-block border">
                            <p class="text-[9px] font-black opacity-40 uppercase mb-1">Contrato</p>
                            <h2 class="text-xl font-black">#${c.contractNumber}</h2>
                        </div>
                    </div>
                </div>

                <div class="grid grid-cols-2 gap-8">
                    <div>
                        <h4 class="text-[10px] font-black opacity-30 uppercase tracking-widest mb-4">Arrendatario</h4>
                        <p class="font-extrabold text-lg">${c.firstName} ${c.lastName}</p>
                        <p class="text-sm opacity-60">${c.email}</p>
                        <p class="text-sm opacity-60">${c.phone}</p>
                    </div>
                    <div>
                        <h4 class="text-[10px] font-black opacity-30 uppercase tracking-widest mb-4">Servicio</h4>
                        <p class="font-extrabold text-lg">${c.product}</p>
                        <p class="text-sm opacity-60">${c.start_date} @ ${c.start_time}</p>
                    </div>
                </div>

                <div class="bg-gray-50 p-6 rounded-2xl flex justify-between items-center">
                    <div>
                        <p class="text-[10px] font-black opacity-40 uppercase">Total Pagado</p>
                        <p class="text-xs opacity-60 italic">I.V.A Incluido (21%)</p>
                    </div>
                    <h3 class="text-4xl font-black text-${color}">€${c.total.toFixed(2)}</h3>
                </div>

                <div class="text-center pt-8 border-t">
                    <div id="qr-invoice" class="inline-block p-2 bg-gray-50 rounded-2xl border"></div>
                    <p class="text-[8px] font-bold opacity-30 uppercase tracking-[0.3em] mt-4">Verificación Digital EcoRent</p>
                </div>
            </div>
        </div>
    `;
    
    if (window.lucide) window.lucide.createIcons();
    setTimeout(() => {
        new QRCode(document.getElementById('qr-invoice'), { text: c.id, width: 80, height: 80 });
    }, 100);
};

window.downloadPDF = (id: string) => {
    const el = document.getElementById('invoice-render-area');
    if (el) html2pdf().set({ margin: 1, filename: `EcoRent_Contrato_${id}.pdf`, image: { type: 'jpeg', quality: 0.98 }, html2canvas: { scale: 2 }, jsPDF: { unit: 'in', format: 'letter', orientation: 'portrait' } }).from(el).save();
};

window.shareWhatsApp = (id: string) => {
    const c = state.contracts.find(x => x.id === id);
    if (c) window.open(`https://wa.me/${c.phone.replace(/\D/g, '')}?text=Hola ${c.firstName}, aquí tienes tu contrato EcoRent #${c.contractNumber} por €${c.total.toFixed(2)}.`, '_blank');
};

const Dashboard = () => `
    <div class="space-y-12 animate-fade-in">
        <div class="flex justify-between items-end">
            <div>
                <h1 class="text-5xl font-black tracking-tighter">EcoManager</h1>
                <p class="text-muted font-bold mt-2">Bienvenido, <span class="text-primary">${COMPANY_INFO.owner}</span></p>
            </div>
            <div class="card p-6 border-l-8 border-primary"><p class="text-[10px] font-black opacity-40 uppercase tracking-widest">Ingresos</p><p class="text-3xl font-black">€${state.contracts.reduce((a, b) => a + b.total, 0).toFixed(2)}</p></div>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-3 gap-8">
            <button onclick="window.navigate('vehicles')" class="card p-10 group hover:bg-red-600 hover:text-white transition-all duration-300 flex flex-col items-center gap-4"><div class="bg-red-50 p-6 rounded-3xl text-red-600 group-hover:bg-white/20 group-hover:text-white transition-all"><i data-lucide="car" class="w-10 h-10"></i></div><span class="font-black text-xl">Vehículos</span></button>
            <button onclick="window.navigate('bikes')" class="card p-10 group hover:bg-primary hover:text-white transition-all duration-300 flex flex-col items-center gap-4"><div class="bg-green-50 p-6 rounded-3xl text-primary group-hover:bg-white/20 group-hover:text-white transition-all"><i data-lucide="bike" class="w-10 h-10"></i></div><span class="font-black text-xl">Bicicletas</span></button>
            <button onclick="window.navigate('tours')" class="card p-10 group hover:bg-blue-600 hover:text-white transition-all duration-300 flex flex-col items-center gap-4"><div class="bg-blue-50 p-6 rounded-3xl text-blue-600 group-hover:bg-white/20 group-hover:text-white transition-all"><i data-lucide="map" class="w-10 h-10"></i></div><span class="font-black text-xl">Excursiones</span></button>
        </div>
    </div>
`;

const HistoryView = () => `
    <div class="space-y-6 animate-fade-in">
        <h2 class="text-3xl font-black tracking-tight">Registro de Alquileres</h2>
        <div class="space-y-4">
            ${state.contracts.slice().reverse().map(c => `
                <div class="card p-6 flex justify-between items-center hover:scale-[1.01] transition-all cursor-pointer border-l-4 ${c.module === 'vehicle' ? 'border-red-500' : (c.module === 'bike' ? 'border-primary' : 'border-blue-500')}">
                    <div onclick="window.viewInvoice('${c.id}')" class="flex-1">
                        <p class="font-black">#${c.contractNumber} — ${c.firstName} ${c.lastName}</p>
                        <p class="text-xs opacity-50 uppercase font-bold mt-1">${c.createdAt} • ${c.product}</p>
                    </div>
                    <div class="flex gap-4">
                        <button onclick="window.editContract('${c.id}')" class="text-blue-400 hover:text-blue-600"><i data-lucide="edit-3"></i></button>
                        <button onclick="window.deleteContract('${c.id}')" class="text-red-300 hover:text-red-500"><i data-lucide="trash-2"></i></button>
                    </div>
                </div>
            `).join('')}
            ${state.contracts.length === 0 ? '<div class="card p-20 text-center text-muted italic">No hay registros almacenados.</div>' : ''}
        </div>
    </div>
`;

const ExportView = () => `
    <div class="space-y-8 animate-fade-in">
        <div class="flex flex-col md:flex-row justify-between items-center gap-4">
            <h2 class="text-3xl font-black tracking-tight">Exportación & Nube</h2>
            <button onclick="window.syncAllToCloud()" id="sync-all-btn" class="bg-primary text-white px-8 py-4 rounded-2xl font-black shadow-xl hover:scale-105 transition-all">Enviar al excel nube</button>
        </div>
        <div class="card overflow-hidden">
            <table class="w-full text-xs text-left border-collapse">
                <thead class="bg-gray-50 border-b font-black uppercase text-muted tracking-tighter">
                    <tr><th class="p-4">Contrato</th><th class="p-4">Fecha</th><th class="p-4">Cliente</th><th class="p-4">Total</th><th class="p-4 text-center">Acción</th></tr>
                </thead>
                <tbody class="divide-y">
                    ${state.contracts.map(c => `
                        <tr class="hover:bg-gray-50/50">
                            <td class="p-4 font-bold text-primary">#${c.contractNumber}</td>
                            <td class="p-4">${c.createdAt}</td>
                            <td class="p-4">${c.firstName} ${c.lastName}</td>
                            <td class="p-4 font-black">€${c.total.toFixed(2)}</td>
                            <td class="p-4 text-center"><button onclick="window.editContract('${c.id}')" class="p-2 text-blue-500 hover:bg-blue-50 rounded-lg"><i data-lucide="edit-3" class="w-4 h-4"></i></button></td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        </div>
    </div>
`;

const CatalogView = () => `
    <div class="space-y-8 animate-fade-in">
        <h2 class="text-3xl font-black tracking-tight">Catálogo de Servicios</h2>
        <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
            ${CATALOG.categories.map(cat => `
                <div class="card p-6">
                    <h3 class="font-black border-b pb-3 mb-4 text-primary">${cat.name}</h3>
                    <div class="space-y-2">
                        ${CATALOG.products.filter(p => p.cat === cat.id).map(p => `
                            <div class="flex justify-between text-sm">
                                <span class="font-medium opacity-70">${p.name}</span>
                                <span class="font-black text-primary">€${p.price}</span>
                            </div>
                        `).join('')}
                    </div>
                </div>
            `).join('')}
        </div>
    </div>
`;

function render() {
    const container = document.getElementById('view-container');
    if (!container) return;
    
    if (state.editingId) {
        const c = state.contracts.find(x => x.id === state.editingId);
        if (c) {
            container.innerHTML = CommonAlquilerForm(c.module, c);
            if (window.lucide) window.lucide.createIcons();
            return;
        }
    }

    switch (state.currentView) {
        case 'dashboard': container.innerHTML = Dashboard(); break;
        case 'vehicles': container.innerHTML = CommonAlquilerForm('vehicle'); break;
        case 'bikes': container.innerHTML = CommonAlquilerForm('bike'); break;
        case 'tours': container.innerHTML = CommonAlquilerForm('tour'); break;
        case 'catalog': container.innerHTML = CatalogView(); break;
        case 'export': container.innerHTML = ExportView(); break;
        case 'history': container.innerHTML = HistoryView(); break;
        default: container.innerHTML = Dashboard();
    }
    if (window.lucide) window.lucide.createIcons();
    updateSyncStatus();
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

document.addEventListener('DOMContentLoaded', () => { applyTheme(); render(); });