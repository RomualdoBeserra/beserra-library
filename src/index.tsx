import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { serveStatic } from 'hono/cloudflare-workers'

type Bindings = {
  DB: D1Database
}

const app = new Hono<{ Bindings: Bindings }>()

app.use('/api/*', cors())
app.use('/static/*', serveStatic({ root: './' }))

// ─── HTML PRINCIPAL ────────────────────────────────────────────────────────────

app.get('/', (c) => {
  return c.html(`<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Beserra Library</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <link href="https://cdn.jsdelivr.net/npm/@fortawesome/fontawesome-free@6.4.0/css/all.min.css" rel="stylesheet" />
  <script src="https://cdn.jsdelivr.net/npm/axios@1.6.0/dist/axios.min.js"></script>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;600;700&family=Inter:wght@300;400;500;600&display=swap');
    body { font-family: 'Inter', sans-serif; }
    h1, h2, h3, .font-serif { font-family: 'Playfair Display', serif; }
    .book-card { transition: transform 0.2s ease, box-shadow 0.2s ease; }
    .book-card:hover { transform: translateY(-4px); box-shadow: 0 12px 30px rgba(0,0,0,0.15); }
    .status-badge { font-size: 0.7rem; font-weight: 600; letter-spacing: 0.05em; }
    .modal-overlay { animation: fadeIn 0.2s ease; }
    @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
    .modal-box { animation: slideUp 0.25s ease; }
    @keyframes slideUp { from { transform: translateY(30px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
    .tab-btn.active { border-bottom: 3px solid #7c3aed; color: #7c3aed; font-weight: 600; }
    .sidebar-item.active { background: #ede9fe; color: #7c3aed; font-weight: 600; }
    .loading-spinner { display: inline-block; width: 20px; height: 20px; border: 3px solid rgba(124,58,237,0.3); border-top-color: #7c3aed; border-radius: 50%; animation: spin 0.8s linear infinite; }
    @keyframes spin { to { transform: rotate(360deg); } }
    input:focus, select:focus, textarea:focus { outline: none; border-color: #7c3aed; box-shadow: 0 0 0 3px rgba(124,58,237,0.15); }
    ::-webkit-scrollbar { width: 6px; } ::-webkit-scrollbar-track { background: #f3f4f6; } ::-webkit-scrollbar-thumb { background: #c4b5fd; border-radius: 3px; }
    .cover-placeholder { background: linear-gradient(135deg, #7c3aed, #4f46e5); }
    .toast { animation: slideInRight 0.3s ease, fadeOut 0.3s ease 2.7s forwards; }
    @keyframes slideInRight { from { transform: translateX(100%); opacity: 0; } to { transform: translateX(0); opacity: 1; } }
    @keyframes fadeOut { to { opacity: 0; transform: translateX(100%); } }
  </style>
</head>
<body class="bg-gray-50 min-h-screen">

<!-- TOAST NOTIFICATIONS -->
<div id="toast-container" class="fixed top-4 right-4 z-50 flex flex-col gap-2"></div>

<!-- HEADER -->
<header class="bg-white border-b border-gray-200 sticky top-0 z-40 shadow-sm">
  <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
    <div class="flex items-center justify-between h-16">
      <div class="flex items-center gap-3">
        <div class="w-10 h-10 bg-violet-600 rounded-xl flex items-center justify-center">
          <i class="fas fa-book-open text-white text-lg"></i>
        </div>
        <div>
          <h1 class="font-serif text-xl font-bold text-gray-900">Beserra Library</h1>
          <p class="text-xs text-gray-500">Book Collection Management</p>
        </div>
      </div>
      <div class="flex items-center gap-3">
        <div class="relative hidden sm:block">
          <i class="fas fa-search absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm"></i>
          <input id="search-global" type="text" placeholder="Buscar livros, autores..." 
            class="pl-9 pr-4 py-2 border border-gray-200 rounded-lg text-sm w-64 bg-gray-50 transition-all duration-200 focus:bg-white focus:w-80" />
        </div>
        <button onclick="openModal('modal-livro')" class="bg-violet-600 hover:bg-violet-700 text-white px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 transition-colors">
          <i class="fas fa-plus"></i> <span class="hidden sm:inline">Novo Livro</span>
        </button>
      </div>
    </div>
  </div>
</header>

<div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
  <div class="flex gap-6">

    <!-- SIDEBAR -->
    <aside class="w-56 flex-shrink-0 hidden lg:block">
      <nav class="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div class="p-4 border-b border-gray-100">
          <p class="text-xs font-semibold text-gray-400 uppercase tracking-wider">Menu</p>
        </div>
        <ul class="p-2 space-y-1">
          <li>
            <button onclick="setView('livros')" id="nav-livros" class="sidebar-item active w-full text-left flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors">
              <i class="fas fa-books w-4 text-center"></i> Acervo de Livros
            </button>
          </li>
          <li>
            <button onclick="setView('autores')" id="nav-autores" class="sidebar-item w-full text-left flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors text-gray-600 hover:bg-gray-50">
              <i class="fas fa-user-pen w-4 text-center"></i> Autores
            </button>
          </li>
          <li>
            <button onclick="setView('categorias')" id="nav-categorias" class="sidebar-item w-full text-left flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors text-gray-600 hover:bg-gray-50">
              <i class="fas fa-tags w-4 text-center"></i> Categorias
            </button>
          </li>
        </ul>
        <div class="p-4 border-t border-gray-100 mt-2">
          <div id="stats-sidebar" class="space-y-2 text-xs text-gray-500">
            <p class="flex justify-between"><span>Total de livros</span> <span id="stat-total" class="font-semibold text-gray-700">—</span></p>
            <p class="flex justify-between"><span>Disponíveis</span> <span id="stat-disp" class="font-semibold text-green-600">—</span></p>
            <p class="flex justify-between"><span>Emprestados</span> <span id="stat-emp" class="font-semibold text-amber-600">—</span></p>
          </div>
        </div>
      </nav>
    </aside>

    <!-- MAIN CONTENT -->
    <main class="flex-1 min-w-0">

      <!-- LIVROS VIEW -->
      <div id="view-livros">
        <!-- Filtros -->
        <div class="bg-white rounded-xl border border-gray-200 p-4 mb-5 flex flex-wrap gap-3 items-center">
          <select id="filter-status" onchange="loadLivros()" class="border border-gray-200 rounded-lg text-sm px-3 py-2 bg-gray-50 text-gray-700">
            <option value="">Todos os status</option>
            <option value="disponivel">Disponível</option>
            <option value="emprestado">Emprestado</option>
            <option value="reservado">Reservado</option>
            <option value="indisponivel">Indisponível</option>
          </select>
          <select id="filter-categoria" onchange="loadLivros()" class="border border-gray-200 rounded-lg text-sm px-3 py-2 bg-gray-50 text-gray-700">
            <option value="">Todas as categorias</option>
          </select>
          <div class="ml-auto flex items-center gap-2">
            <button onclick="setLayout('grid')" id="btn-grid" class="p-2 rounded-lg text-violet-600 bg-violet-50">
              <i class="fas fa-grip"></i>
            </button>
            <button onclick="setLayout('list')" id="btn-list" class="p-2 rounded-lg text-gray-400 hover:text-gray-600">
              <i class="fas fa-list"></i>
            </button>
          </div>
        </div>

        <!-- Grid de Livros -->
        <div id="livros-container" class="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-5">
          <div class="col-span-full flex items-center justify-center py-16 text-gray-400">
            <div class="loading-spinner"></div>
          </div>
        </div>
      </div>

      <!-- AUTORES VIEW -->
      <div id="view-autores" class="hidden">
        <div class="flex items-center justify-between mb-5">
          <h2 class="font-serif text-2xl font-bold text-gray-800">Autores</h2>
          <button onclick="openModal('modal-autor')" class="bg-violet-600 hover:bg-violet-700 text-white px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 transition-colors">
            <i class="fas fa-plus"></i> Novo Autor
          </button>
        </div>
        <div id="autores-container" class="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4"></div>
      </div>

      <!-- CATEGORIAS VIEW -->
      <div id="view-categorias" class="hidden">
        <div class="flex items-center justify-between mb-5">
          <h2 class="font-serif text-2xl font-bold text-gray-800">Categorias</h2>
          <button onclick="openModal('modal-categoria')" class="bg-violet-600 hover:bg-violet-700 text-white px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 transition-colors">
            <i class="fas fa-plus"></i> Nova Categoria
          </button>
        </div>
        <div id="categorias-container" class="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4"></div>
      </div>

    </main>
  </div>
</div>

<!-- ═══════════════════ MODAIS ═══════════════════ -->

<!-- Modal Livro -->
<div id="modal-livro" class="modal-overlay fixed inset-0 bg-black/50 z-50 hidden flex items-center justify-center p-4">
  <div class="modal-box bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
    <div class="flex items-center justify-between p-6 border-b border-gray-100">
      <h3 id="modal-livro-title" class="font-serif text-xl font-bold text-gray-800">Novo Livro</h3>
      <button onclick="closeModal('modal-livro')" class="w-8 h-8 flex items-center justify-center rounded-full text-gray-400 hover:bg-gray-100 hover:text-gray-600">
        <i class="fas fa-times"></i>
      </button>
    </div>
    <form id="form-livro" onsubmit="saveLivro(event)" class="p-6 space-y-4">
      <input type="hidden" id="livro-id" />
      <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div class="sm:col-span-2">
          <label class="block text-sm font-medium text-gray-700 mb-1">Título <span class="text-red-500">*</span></label>
          <input id="livro-titulo" type="text" required placeholder="Ex: Dom Casmurro" class="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-gray-50 transition-all" />
        </div>
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">Autor</label>
          <select id="livro-autor" class="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-gray-50 transition-all">
            <option value="">Selecionar autor</option>
          </select>
        </div>
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">Categoria</label>
          <select id="livro-categoria" class="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-gray-50 transition-all">
            <option value="">Selecionar categoria</option>
          </select>
        </div>
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">ISBN</label>
          <input id="livro-isbn" type="text" placeholder="978-xx-xxx-xxxx-x" class="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-gray-50 transition-all" />
        </div>
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">Ano de Publicação</label>
          <input id="livro-ano" type="number" min="1000" max="2030" placeholder="2024" class="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-gray-50 transition-all" />
        </div>
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">Editora</label>
          <input id="livro-editora" type="text" placeholder="Nome da editora" class="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-gray-50 transition-all" />
        </div>
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">Nº de Páginas</label>
          <input id="livro-paginas" type="number" min="1" placeholder="300" class="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-gray-50 transition-all" />
        </div>
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">Status</label>
          <select id="livro-status" class="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-gray-50 transition-all">
            <option value="disponivel">Disponível</option>
            <option value="emprestado">Emprestado</option>
            <option value="reservado">Reservado</option>
            <option value="indisponivel">Indisponível</option>
          </select>
        </div>
        <div class="sm:col-span-2">
          <label class="block text-sm font-medium text-gray-700 mb-1">URL da Capa</label>
          <input id="livro-capa" type="url" placeholder="https://..." class="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-gray-50 transition-all" />
        </div>
        <div class="sm:col-span-2">
          <label class="block text-sm font-medium text-gray-700 mb-1">Sinopse</label>
          <textarea id="livro-sinopse" rows="3" placeholder="Descrição do livro..." class="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-gray-50 transition-all resize-none"></textarea>
        </div>
      </div>
      <div class="flex justify-end gap-3 pt-2">
        <button type="button" onclick="closeModal('modal-livro')" class="px-4 py-2 text-sm text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">Cancelar</button>
        <button type="submit" class="px-6 py-2 text-sm bg-violet-600 hover:bg-violet-700 text-white rounded-lg font-medium transition-colors flex items-center gap-2">
          <i class="fas fa-save"></i> <span id="btn-save-livro">Salvar Livro</span>
        </button>
      </div>
    </form>
  </div>
</div>

<!-- Modal Autor -->
<div id="modal-autor" class="modal-overlay fixed inset-0 bg-black/50 z-50 hidden flex items-center justify-center p-4">
  <div class="modal-box bg-white rounded-2xl shadow-2xl w-full max-w-md">
    <div class="flex items-center justify-between p-6 border-b border-gray-100">
      <h3 id="modal-autor-title" class="font-serif text-xl font-bold text-gray-800">Novo Autor</h3>
      <button onclick="closeModal('modal-autor')" class="w-8 h-8 flex items-center justify-center rounded-full text-gray-400 hover:bg-gray-100">
        <i class="fas fa-times"></i>
      </button>
    </div>
    <form id="form-autor" onsubmit="saveAutor(event)" class="p-6 space-y-4">
      <input type="hidden" id="autor-id" />
      <div>
        <label class="block text-sm font-medium text-gray-700 mb-1">Nome <span class="text-red-500">*</span></label>
        <input id="autor-nome" type="text" required placeholder="Nome completo" class="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-gray-50 transition-all" />
      </div>
      <div>
        <label class="block text-sm font-medium text-gray-700 mb-1">Nacionalidade</label>
        <input id="autor-nacionalidade" type="text" placeholder="Ex: Brasileiro" class="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-gray-50 transition-all" />
      </div>
      <div class="flex justify-end gap-3 pt-2">
        <button type="button" onclick="closeModal('modal-autor')" class="px-4 py-2 text-sm text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50">Cancelar</button>
        <button type="submit" class="px-6 py-2 text-sm bg-violet-600 hover:bg-violet-700 text-white rounded-lg font-medium flex items-center gap-2">
          <i class="fas fa-save"></i> Salvar
        </button>
      </div>
    </form>
  </div>
</div>

<!-- Modal Categoria -->
<div id="modal-categoria" class="modal-overlay fixed inset-0 bg-black/50 z-50 hidden flex items-center justify-center p-4">
  <div class="modal-box bg-white rounded-2xl shadow-2xl w-full max-w-md">
    <div class="flex items-center justify-between p-6 border-b border-gray-100">
      <h3 id="modal-categoria-title" class="font-serif text-xl font-bold text-gray-800">Nova Categoria</h3>
      <button onclick="closeModal('modal-categoria')" class="w-8 h-8 flex items-center justify-center rounded-full text-gray-400 hover:bg-gray-100">
        <i class="fas fa-times"></i>
      </button>
    </div>
    <form id="form-categoria" onsubmit="saveCategoria(event)" class="p-6 space-y-4">
      <input type="hidden" id="categoria-id" />
      <div>
        <label class="block text-sm font-medium text-gray-700 mb-1">Nome <span class="text-red-500">*</span></label>
        <input id="categoria-nome" type="text" required placeholder="Ex: Romance" class="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-gray-50 transition-all" />
      </div>
      <div>
        <label class="block text-sm font-medium text-gray-700 mb-1">Descrição</label>
        <textarea id="categoria-descricao" rows="2" placeholder="Breve descrição..." class="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-gray-50 transition-all resize-none"></textarea>
      </div>
      <div class="flex justify-end gap-3 pt-2">
        <button type="button" onclick="closeModal('modal-categoria')" class="px-4 py-2 text-sm text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50">Cancelar</button>
        <button type="submit" class="px-6 py-2 text-sm bg-violet-600 hover:bg-violet-700 text-white rounded-lg font-medium flex items-center gap-2">
          <i class="fas fa-save"></i> Salvar
        </button>
      </div>
    </form>
  </div>
</div>

<!-- Modal Detalhes Livro -->
<div id="modal-detalhe" class="modal-overlay fixed inset-0 bg-black/50 z-50 hidden flex items-center justify-center p-4">
  <div class="modal-box bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
    <div id="detalhe-content" class="p-6"></div>
  </div>
</div>

<!-- ═══════════════════ JAVASCRIPT ═══════════════════ -->
<script>
let currentLayout = 'grid';
let allLivros = [];
let searchTimeout = null;

// ─── UTILITÁRIOS ────────────────────────────────────
function showToast(msg, type = 'success') {
  const container = document.getElementById('toast-container');
  const colors = { success: 'bg-green-600', error: 'bg-red-600', info: 'bg-blue-600', warning: 'bg-amber-500' };
  const icons = { success: 'fa-check-circle', error: 'fa-exclamation-circle', info: 'fa-info-circle', warning: 'fa-exclamation-triangle' };
  const el = document.createElement('div');
  el.className = \`toast flex items-center gap-3 \${colors[type]} text-white px-4 py-3 rounded-xl shadow-lg text-sm font-medium min-w-64\`;
  el.innerHTML = \`<i class="fas \${icons[type]}"></i> <span>\${msg}</span>\`;
  container.appendChild(el);
  setTimeout(() => el.remove(), 3100);
}

function openModal(id) { document.getElementById(id).classList.remove('hidden'); }
function closeModal(id) { document.getElementById(id).classList.add('hidden'); }

document.querySelectorAll('.modal-overlay').forEach(m => {
  m.addEventListener('click', e => { if (e.target === m) m.classList.add('hidden'); });
});

function statusBadge(status) {
  const map = {
    disponivel: ['bg-green-100 text-green-700', 'Disponível'],
    emprestado: ['bg-amber-100 text-amber-700', 'Emprestado'],
    reservado: ['bg-blue-100 text-blue-700', 'Reservado'],
    indisponivel: ['bg-red-100 text-red-700', 'Indisponível']
  };
  const [cls, label] = map[status] || ['bg-gray-100 text-gray-700', status];
  return \`<span class="status-badge \${cls} px-2 py-0.5 rounded-full">\${label}</span>\`;
}

function setLayout(mode) {
  currentLayout = mode;
  document.getElementById('btn-grid').className = mode === 'grid' ? 'p-2 rounded-lg text-violet-600 bg-violet-50' : 'p-2 rounded-lg text-gray-400 hover:text-gray-600';
  document.getElementById('btn-list').className = mode === 'list' ? 'p-2 rounded-lg text-violet-600 bg-violet-50' : 'p-2 rounded-lg text-gray-400 hover:text-gray-600';
  renderLivros(allLivros);
}

// ─── NAVEGAÇÃO ──────────────────────────────────────
function setView(view) {
  ['livros','autores','categorias'].forEach(v => {
    document.getElementById('view-' + v).classList.toggle('hidden', v !== view);
    const nav = document.getElementById('nav-' + v);
    if (v === view) {
      nav.classList.add('active');
      nav.classList.remove('text-gray-600', 'hover:bg-gray-50');
    } else {
      nav.classList.remove('active');
      nav.classList.add('text-gray-600', 'hover:bg-gray-50');
    }
  });
  if (view === 'livros') loadLivros();
  if (view === 'autores') loadAutores();
  if (view === 'categorias') loadCategorias();
}

// ─── LIVROS ─────────────────────────────────────────
async function loadLivros() {
  const status = document.getElementById('filter-status').value;
  const categoria = document.getElementById('filter-categoria').value;
  const search = document.getElementById('search-global').value;
  let url = '/api/livros?';
  if (status) url += 'status=' + status + '&';
  if (categoria) url += 'categoria_id=' + categoria + '&';
  if (search) url += 'q=' + encodeURIComponent(search) + '&';
  try {
    const { data } = await axios.get(url);
    allLivros = data.livros || [];
    renderLivros(allLivros);
    updateStats(data.stats || {});
  } catch (e) { showToast('Erro ao carregar livros', 'error'); }
}

function renderLivros(livros) {
  const container = document.getElementById('livros-container');
  if (!livros.length) {
    container.innerHTML = \`<div class="col-span-full flex flex-col items-center justify-center py-20 text-gray-400">
      <i class="fas fa-book-open text-5xl mb-4 opacity-30"></i>
      <p class="text-lg font-medium">Nenhum livro encontrado</p>
      <p class="text-sm mt-1">Cadastre um novo livro para começar</p>
      <button onclick="openModal('modal-livro')" class="mt-4 px-4 py-2 bg-violet-600 text-white rounded-lg text-sm hover:bg-violet-700">+ Adicionar Livro</button>
    </div>\`;
    return;
  }
  if (currentLayout === 'grid') {
    container.className = 'grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-5';
    container.innerHTML = livros.map(l => \`
      <article class="book-card bg-white rounded-xl border border-gray-200 overflow-hidden cursor-pointer" onclick="viewLivro(\${l.id})">
        <div class="relative h-40 overflow-hidden">
          \${l.capa_url ? \`<img src="\${l.capa_url}" alt="\${l.titulo}" class="w-full h-full object-cover" onerror="this.parentElement.innerHTML=coverPlaceholder('\${l.titulo}')" />\` : coverPlaceholder(l.titulo)}
          <div class="absolute top-2 right-2">\${statusBadge(l.status)}</div>
        </div>
        <div class="p-4">
          <h3 class="font-serif font-semibold text-gray-800 leading-snug line-clamp-2">\${l.titulo}</h3>
          <p class="text-sm text-gray-500 mt-1">\${l.autor_nome || 'Autor desconhecido'}</p>
          \${l.categoria_nome ? \`<span class="inline-block mt-2 text-xs bg-violet-50 text-violet-700 px-2 py-0.5 rounded-full">\${l.categoria_nome}</span>\` : ''}
          <div class="flex items-center justify-between mt-3 pt-3 border-t border-gray-100">
            <span class="text-xs text-gray-400">\${l.ano_publicacao || ''} \${l.editora ? '· ' + l.editora : ''}</span>
            <div class="flex gap-1">
              <button onclick="event.stopPropagation(); editLivro(\${l.id})" class="w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 hover:text-violet-600 hover:bg-violet-50 transition-colors">
                <i class="fas fa-edit text-xs"></i>
              </button>
              <button onclick="event.stopPropagation(); deleteLivro(\${l.id}, '\${l.titulo.replace(/'/g,'')}')" class="w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors">
                <i class="fas fa-trash text-xs"></i>
              </button>
            </div>
          </div>
        </div>
      </article>\`).join('');
  } else {
    container.className = 'flex flex-col gap-2';
    container.innerHTML = livros.map(l => \`
      <article class="book-card bg-white rounded-xl border border-gray-200 overflow-hidden cursor-pointer flex items-center gap-4 p-4" onclick="viewLivro(\${l.id})">
        <div class="w-12 h-16 rounded-lg overflow-hidden flex-shrink-0">
          \${l.capa_url ? \`<img src="\${l.capa_url}" alt="\${l.titulo}" class="w-full h-full object-cover" onerror="this.parentElement.innerHTML=coverPlaceholderSmall('\${l.titulo}')" />\` : coverPlaceholderSmall(l.titulo)}
        </div>
        <div class="flex-1 min-w-0">
          <h3 class="font-serif font-semibold text-gray-800 truncate">\${l.titulo}</h3>
          <p class="text-sm text-gray-500">\${l.autor_nome || 'Autor desconhecido'} \${l.ano_publicacao ? '· ' + l.ano_publicacao : ''}</p>
        </div>
        \${l.categoria_nome ? \`<span class="text-xs bg-violet-50 text-violet-700 px-2 py-0.5 rounded-full hidden sm:inline">\${l.categoria_nome}</span>\` : ''}
        <div class="flex-shrink-0">\${statusBadge(l.status)}</div>
        <div class="flex gap-1 flex-shrink-0">
          <button onclick="event.stopPropagation(); editLivro(\${l.id})" class="w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 hover:text-violet-600 hover:bg-violet-50">
            <i class="fas fa-edit text-xs"></i>
          </button>
          <button onclick="event.stopPropagation(); deleteLivro(\${l.id}, '\${l.titulo.replace(/'/g,'')}')" class="w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50">
            <i class="fas fa-trash text-xs"></i>
          </button>
        </div>
      </article>\`).join('');
  }
}

function coverPlaceholder(titulo) {
  const letter = (titulo || 'L')[0].toUpperCase();
  return \`<div class="cover-placeholder w-full h-full flex items-center justify-center">
    <span class="font-serif text-5xl text-white/80 font-bold">\${letter}</span>
  </div>\`;
}
function coverPlaceholderSmall(titulo) {
  const letter = (titulo || 'L')[0].toUpperCase();
  return \`<div class="cover-placeholder w-full h-full flex items-center justify-center rounded-lg">
    <span class="font-serif text-lg text-white/80 font-bold">\${letter}</span>
  </div>\`;
}

function updateStats(stats) {
  document.getElementById('stat-total').textContent = stats.total || 0;
  document.getElementById('stat-disp').textContent = stats.disponiveis || 0;
  document.getElementById('stat-emp').textContent = stats.emprestados || 0;
}

async function viewLivro(id) {
  try {
    const { data } = await axios.get('/api/livros/' + id);
    const l = data;
    document.getElementById('detalhe-content').innerHTML = \`
      <div class="flex items-start justify-between mb-4">
        <div></div>
        <button onclick="closeModal('modal-detalhe')" class="w-8 h-8 flex items-center justify-center rounded-full text-gray-400 hover:bg-gray-100">
          <i class="fas fa-times"></i>
        </button>
      </div>
      <div class="flex gap-5">
        <div class="w-28 h-40 rounded-xl overflow-hidden flex-shrink-0 shadow-md">
          \${l.capa_url ? \`<img src="\${l.capa_url}" class="w-full h-full object-cover" onerror="this.parentElement.innerHTML=coverPlaceholder('\${l.titulo}')">\` : coverPlaceholder(l.titulo)}
        </div>
        <div class="flex-1 min-w-0">
          <h2 class="font-serif text-2xl font-bold text-gray-900 leading-snug">\${l.titulo}</h2>
          <p class="text-gray-500 mt-1">\${l.autor_nome || 'Autor desconhecido'}</p>
          <div class="mt-2">\${statusBadge(l.status)}</div>
          \${l.categoria_nome ? \`<p class="text-xs text-violet-600 bg-violet-50 rounded-full inline-block px-2 py-0.5 mt-2">\${l.categoria_nome}</p>\` : ''}
        </div>
      </div>
      <div class="mt-5 grid grid-cols-2 gap-3 text-sm">
        \${l.isbn ? \`<div class="bg-gray-50 rounded-lg p-3"><p class="text-xs text-gray-400 mb-0.5">ISBN</p><p class="font-medium text-gray-700">\${l.isbn}</p></div>\` : ''}
        \${l.ano_publicacao ? \`<div class="bg-gray-50 rounded-lg p-3"><p class="text-xs text-gray-400 mb-0.5">Ano</p><p class="font-medium text-gray-700">\${l.ano_publicacao}</p></div>\` : ''}
        \${l.editora ? \`<div class="bg-gray-50 rounded-lg p-3"><p class="text-xs text-gray-400 mb-0.5">Editora</p><p class="font-medium text-gray-700">\${l.editora}</p></div>\` : ''}
        \${l.paginas ? \`<div class="bg-gray-50 rounded-lg p-3"><p class="text-xs text-gray-400 mb-0.5">Páginas</p><p class="font-medium text-gray-700">\${l.paginas}</p></div>\` : ''}
      </div>
      \${l.sinopse ? \`<div class="mt-4"><p class="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Sinopse</p><p class="text-sm text-gray-600 leading-relaxed">\${l.sinopse}</p></div>\` : ''}
      <div class="mt-5 flex gap-3">
        <button onclick="closeModal('modal-detalhe'); editLivro(\${l.id})" class="flex-1 border border-violet-200 text-violet-600 rounded-lg py-2 text-sm font-medium hover:bg-violet-50 transition-colors">
          <i class="fas fa-edit mr-2"></i>Editar
        </button>
        <button onclick="closeModal('modal-detalhe'); deleteLivro(\${l.id}, '\${l.titulo.replace(/'/g,'')}')" class="flex-1 border border-red-200 text-red-600 rounded-lg py-2 text-sm font-medium hover:bg-red-50 transition-colors">
          <i class="fas fa-trash mr-2"></i>Excluir
        </button>
      </div>
    \`;
    openModal('modal-detalhe');
  } catch(e) { showToast('Erro ao carregar detalhes', 'error'); }
}

async function editLivro(id) {
  try {
    const { data } = await axios.get('/api/livros/' + id);
    document.getElementById('livro-id').value = data.id;
    document.getElementById('livro-titulo').value = data.titulo;
    document.getElementById('livro-isbn').value = data.isbn || '';
    document.getElementById('livro-ano').value = data.ano_publicacao || '';
    document.getElementById('livro-editora').value = data.editora || '';
    document.getElementById('livro-paginas').value = data.paginas || '';
    document.getElementById('livro-sinopse').value = data.sinopse || '';
    document.getElementById('livro-capa').value = data.capa_url || '';
    document.getElementById('livro-status').value = data.status;
    document.getElementById('livro-autor').value = data.autor_id || '';
    document.getElementById('livro-categoria').value = data.categoria_id || '';
    document.getElementById('modal-livro-title').textContent = 'Editar Livro';
    document.getElementById('btn-save-livro').textContent = 'Atualizar Livro';
    openModal('modal-livro');
  } catch(e) { showToast('Erro ao carregar livro', 'error'); }
}

async function saveLivro(e) {
  e.preventDefault();
  const id = document.getElementById('livro-id').value;
  const payload = {
    titulo: document.getElementById('livro-titulo').value,
    isbn: document.getElementById('livro-isbn').value || null,
    ano_publicacao: document.getElementById('livro-ano').value ? parseInt(document.getElementById('livro-ano').value) : null,
    editora: document.getElementById('livro-editora').value || null,
    paginas: document.getElementById('livro-paginas').value ? parseInt(document.getElementById('livro-paginas').value) : null,
    sinopse: document.getElementById('livro-sinopse').value || null,
    capa_url: document.getElementById('livro-capa').value || null,
    status: document.getElementById('livro-status').value,
    autor_id: document.getElementById('livro-autor').value ? parseInt(document.getElementById('livro-autor').value) : null,
    categoria_id: document.getElementById('livro-categoria').value ? parseInt(document.getElementById('livro-categoria').value) : null,
  };
  try {
    if (id) {
      await axios.put('/api/livros/' + id, payload);
      showToast('Livro atualizado com sucesso!');
    } else {
      await axios.post('/api/livros', payload);
      showToast('Livro cadastrado com sucesso!');
    }
    closeModal('modal-livro');
    resetFormLivro();
    loadLivros();
  } catch(e) {
    const msg = e.response?.data?.error || 'Erro ao salvar livro';
    showToast(msg, 'error');
  }
}

function resetFormLivro() {
  document.getElementById('form-livro').reset();
  document.getElementById('livro-id').value = '';
  document.getElementById('modal-livro-title').textContent = 'Novo Livro';
  document.getElementById('btn-save-livro').textContent = 'Salvar Livro';
}

async function deleteLivro(id, titulo) {
  if (!confirm('Confirma exclusão de "' + titulo + '"?')) return;
  try {
    await axios.delete('/api/livros/' + id);
    showToast('Livro excluído com sucesso!');
    loadLivros();
  } catch(e) { showToast('Erro ao excluir livro', 'error'); }
}

// ─── AUTORES ─────────────────────────────────────────
async function loadAutores(selectOnly = false) {
  try {
    const { data } = await axios.get('/api/autores');
    const autores = data.autores || [];
    // Atualiza selects
    ['livro-autor'].forEach(id => {
      const el = document.getElementById(id);
      if (!el) return;
      const val = el.value;
      el.innerHTML = '<option value="">Selecionar autor</option>' + autores.map(a => \`<option value="\${a.id}">\${a.nome}</option>\`).join('');
      el.value = val;
    });
    if (selectOnly) return;
    const container = document.getElementById('autores-container');
    if (!autores.length) {
      container.innerHTML = \`<div class="col-span-full text-center py-16 text-gray-400"><i class="fas fa-user-pen text-4xl mb-3 opacity-30"></i><p>Nenhum autor cadastrado</p></div>\`;
      return;
    }
    container.innerHTML = autores.map(a => \`
      <div class="bg-white rounded-xl border border-gray-200 p-5 flex items-center gap-4">
        <div class="w-12 h-12 bg-violet-100 rounded-full flex items-center justify-center flex-shrink-0">
          <span class="font-serif text-violet-600 text-xl font-bold">\${a.nome[0]}</span>
        </div>
        <div class="flex-1 min-w-0">
          <h3 class="font-semibold text-gray-800 truncate">\${a.nome}</h3>
          <p class="text-sm text-gray-400">\${a.nacionalidade || 'Nacionalidade não informada'}</p>
          <p class="text-xs text-violet-500 mt-0.5">\${a.total_livros || 0} livro(s)</p>
        </div>
        <div class="flex gap-1">
          <button onclick="editAutor(\${a.id})" class="w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 hover:text-violet-600 hover:bg-violet-50"><i class="fas fa-edit text-xs"></i></button>
          <button onclick="deleteAutor(\${a.id}, '\${a.nome.replace(/'/g,'')}')" class="w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50"><i class="fas fa-trash text-xs"></i></button>
        </div>
      </div>\`).join('');
  } catch(e) { showToast('Erro ao carregar autores', 'error'); }
}

async function editAutor(id) {
  try {
    const { data } = await axios.get('/api/autores/' + id);
    document.getElementById('autor-id').value = data.id;
    document.getElementById('autor-nome').value = data.nome;
    document.getElementById('autor-nacionalidade').value = data.nacionalidade || '';
    document.getElementById('modal-autor-title').textContent = 'Editar Autor';
    openModal('modal-autor');
  } catch(e) { showToast('Erro ao carregar autor', 'error'); }
}

async function saveAutor(e) {
  e.preventDefault();
  const id = document.getElementById('autor-id').value;
  const payload = {
    nome: document.getElementById('autor-nome').value,
    nacionalidade: document.getElementById('autor-nacionalidade').value || null,
  };
  try {
    if (id) { await axios.put('/api/autores/' + id, payload); showToast('Autor atualizado!'); }
    else { await axios.post('/api/autores', payload); showToast('Autor cadastrado!'); }
    closeModal('modal-autor');
    document.getElementById('form-autor').reset();
    document.getElementById('autor-id').value = '';
    document.getElementById('modal-autor-title').textContent = 'Novo Autor';
    loadAutores();
  } catch(e) { showToast(e.response?.data?.error || 'Erro ao salvar', 'error'); }
}

async function deleteAutor(id, nome) {
  if (!confirm('Excluir autor "' + nome + '"?')) return;
  try {
    await axios.delete('/api/autores/' + id);
    showToast('Autor excluído!');
    loadAutores();
  } catch(e) { showToast(e.response?.data?.error || 'Erro ao excluir', 'error'); }
}

// ─── CATEGORIAS ─────────────────────────────────────
async function loadCategorias(selectOnly = false) {
  try {
    const { data } = await axios.get('/api/categorias');
    const cats = data.categorias || [];
    // Atualiza selects
    ['filter-categoria', 'livro-categoria'].forEach(id => {
      const el = document.getElementById(id);
      if (!el) return;
      const val = el.value;
      const prefix = id === 'filter-categoria' ? '<option value="">Todas as categorias</option>' : '<option value="">Selecionar categoria</option>';
      el.innerHTML = prefix + cats.map(c => \`<option value="\${c.id}">\${c.nome}</option>\`).join('');
      el.value = val;
    });
    if (selectOnly) return;
    const container = document.getElementById('categorias-container');
    const colors = ['bg-violet-50 text-violet-700', 'bg-blue-50 text-blue-700', 'bg-green-50 text-green-700', 'bg-amber-50 text-amber-700', 'bg-red-50 text-red-700', 'bg-pink-50 text-pink-700', 'bg-indigo-50 text-indigo-700', 'bg-teal-50 text-teal-700'];
    if (!cats.length) {
      container.innerHTML = \`<div class="col-span-full text-center py-16 text-gray-400"><i class="fas fa-tags text-4xl mb-3 opacity-30"></i><p>Nenhuma categoria cadastrada</p></div>\`;
      return;
    }
    container.innerHTML = cats.map((c, i) => \`
      <div class="bg-white rounded-xl border border-gray-200 p-5">
        <div class="flex items-center justify-between mb-3">
          <span class="text-xs font-bold px-2.5 py-1 rounded-full \${colors[i % colors.length]}">\${c.nome}</span>
          <div class="flex gap-1">
            <button onclick="editCategoria(\${c.id})" class="w-7 h-7 flex items-center justify-center rounded-lg text-gray-400 hover:text-violet-600 hover:bg-violet-50"><i class="fas fa-edit text-xs"></i></button>
            <button onclick="deleteCategoria(\${c.id}, '\${c.nome.replace(/'/g,'')}')" class="w-7 h-7 flex items-center justify-center rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50"><i class="fas fa-trash text-xs"></i></button>
          </div>
        </div>
        <p class="text-sm text-gray-500">\${c.descricao || 'Sem descrição'}</p>
        <p class="text-xs text-violet-500 mt-2">\${c.total_livros || 0} livro(s)</p>
      </div>\`).join('');
  } catch(e) { showToast('Erro ao carregar categorias', 'error'); }
}

async function editCategoria(id) {
  try {
    const { data } = await axios.get('/api/categorias/' + id);
    document.getElementById('categoria-id').value = data.id;
    document.getElementById('categoria-nome').value = data.nome;
    document.getElementById('categoria-descricao').value = data.descricao || '';
    document.getElementById('modal-categoria-title').textContent = 'Editar Categoria';
    openModal('modal-categoria');
  } catch(e) { showToast('Erro ao carregar categoria', 'error'); }
}

async function saveCategoria(e) {
  e.preventDefault();
  const id = document.getElementById('categoria-id').value;
  const payload = {
    nome: document.getElementById('categoria-nome').value,
    descricao: document.getElementById('categoria-descricao').value || null,
  };
  try {
    if (id) { await axios.put('/api/categorias/' + id, payload); showToast('Categoria atualizada!'); }
    else { await axios.post('/api/categorias', payload); showToast('Categoria cadastrada!'); }
    closeModal('modal-categoria');
    document.getElementById('form-categoria').reset();
    document.getElementById('categoria-id').value = '';
    document.getElementById('modal-categoria-title').textContent = 'Nova Categoria';
    loadCategorias();
  } catch(e) { showToast(e.response?.data?.error || 'Erro ao salvar', 'error'); }
}

async function deleteCategoria(id, nome) {
  if (!confirm('Excluir categoria "' + nome + '"?')) return;
  try {
    await axios.delete('/api/categorias/' + id);
    showToast('Categoria excluída!');
    loadCategorias();
  } catch(e) { showToast(e.response?.data?.error || 'Erro ao excluir', 'error'); }
}

// ─── BUSCA GLOBAL ────────────────────────────────────
document.getElementById('search-global').addEventListener('input', e => {
  clearTimeout(searchTimeout);
  searchTimeout = setTimeout(loadLivros, 350);
});

// ─── INICIALIZAÇÃO ───────────────────────────────────
async function init() {
  await Promise.all([loadAutores(true), loadCategorias(true)]);
  await loadLivros();
}

document.addEventListener('DOMContentLoaded', init);
</script>
</body>
</html>`)
})

// ─── MIDDLEWARE: AUTO-MIGRATION ────────────────────────────────────────────────

let dbInitialized = false

app.use('/api/*', async (c, next) => {
  if (!dbInitialized) {
    const { DB } = c.env
    // Criar tabelas individualmente (D1 exec não suporta multi-statement)
    await DB.prepare(`CREATE TABLE IF NOT EXISTS autores (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nome TEXT NOT NULL,
      nacionalidade TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`).run()
    
    await DB.prepare(`CREATE TABLE IF NOT EXISTS categorias (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nome TEXT NOT NULL UNIQUE,
      descricao TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`).run()
    
    await DB.prepare(`CREATE TABLE IF NOT EXISTS livros (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      titulo TEXT NOT NULL,
      isbn TEXT UNIQUE,
      ano_publicacao INTEGER,
      editora TEXT,
      paginas INTEGER,
      sinopse TEXT,
      capa_url TEXT,
      status TEXT DEFAULT 'disponivel' CHECK(status IN ('disponivel','emprestado','reservado','indisponivel')),
      autor_id INTEGER,
      categoria_id INTEGER,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (autor_id) REFERENCES autores(id) ON DELETE SET NULL,
      FOREIGN KEY (categoria_id) REFERENCES categorias(id) ON DELETE SET NULL
    )`).run()
    
    // Seed inicial se banco vazio
    const check = await DB.prepare('SELECT COUNT(*) as n FROM categorias').first<{n: number}>()
    if (check && check.n === 0) {
      const cats = [
        ['Romance', 'Livros de ficção romântica'],
        ['Ficção Científica', 'Livros de aventura científica e futurismo'],
        ['Terror', 'Livros de suspense e horror'],
        ['Fantasia', 'Livros com mundos e criaturas fantásticas'],
        ['Biografia', 'Histórias de vida de pessoas reais'],
        ['História', 'Livros sobre eventos históricos'],
        ['Autoajuda', 'Livros de desenvolvimento pessoal'],
        ['Clássico', 'Obras clássicas da literatura mundial'],
      ]
      for (const [nome, descricao] of cats) {
        await DB.prepare('INSERT OR IGNORE INTO categorias (nome, descricao) VALUES (?, ?)').bind(nome, descricao).run()
      }
      
      const autores = [
        ['Machado de Assis', 'Brasileiro'],
        ['Clarice Lispector', 'Brasileira'],
        ['J.K. Rowling', 'Britânica'],
        ['George Orwell', 'Britânico'],
        ['Gabriel García Márquez', 'Colombiano'],
        ['Stephen King', 'Americano'],
        ['J.R.R. Tolkien', 'Britânico'],
        ['Jorge Amado', 'Brasileiro'],
      ]
      for (const [nome, nac] of autores) {
        await DB.prepare('INSERT OR IGNORE INTO autores (nome, nacionalidade) VALUES (?, ?)').bind(nome, nac).run()
      }
      
      const livros = [
        ['Dom Casmurro', '978-85-359-0277-5', 1899, 'Ática', 256, 'A história de Bentinho e Capitu, um dos maiores romances da literatura brasileira.', 'disponivel', 1, 1],
        ['Memórias Póstumas de Brás Cubas', '978-85-359-0278-2', 1881, 'Ática', 288, 'O defunto autor narra sua própria história de forma irreverente e filosófica.', 'disponivel', 1, 8],
        ['A Hora da Estrela', '978-85-7164-011-4', 1977, 'Rocco', 88, 'A história de Macabéa, uma nordestina que vive no Rio de Janeiro.', 'disponivel', 2, 1],
        ['Harry Potter e a Pedra Filosofal', '978-85-325-0000-1', 1997, 'Rocco', 264, 'Um jovem bruxo descobre seu destino mágico ao entrar para a Escola Hogwarts.', 'disponivel', 3, 4],
        ['1984', '978-85-359-0277-9', 1949, 'Companhia das Letras', 416, 'Em um regime totalitário distópico, Winston Smith tenta resistir ao controle absoluto.', 'emprestado', 4, 2],
        ['Cem Anos de Solidão', '978-85-359-0279-9', 1967, 'Record', 448, 'A saga da família Buendía na cidade fictícia de Macondo ao longo de cem anos.', 'disponivel', 5, 1],
        ['It - A Coisa', '978-85-325-0001-8', 1986, 'Suma', 1104, 'Um grupo de crianças enfrenta um mal antigo que aterroriza a cidade de Derry.', 'disponivel', 6, 3],
        ['O Senhor dos Anéis', '978-85-325-0002-5', 1954, 'Martins Fontes', 1200, 'A epopeia de Frodo Bolseiro para destruir o Anel do Poder e salvar a Terra-Média.', 'reservado', 7, 4],
      ]
      for (const [titulo, isbn, ano, editora, pag, sinopse, status, autor_id, cat_id] of livros) {
        await DB.prepare('INSERT OR IGNORE INTO livros (titulo, isbn, ano_publicacao, editora, paginas, sinopse, status, autor_id, categoria_id) VALUES (?,?,?,?,?,?,?,?,?)')
          .bind(titulo, isbn, ano, editora, pag, sinopse, status, autor_id, cat_id).run()
      }
    }
    
    dbInitialized = true
  }
  
  await next()
})

// ─── API LIVROS ────────────────────────────────────────────────────────────────

app.get('/api/livros', async (c) => {
  const { DB } = c.env
  const { q, status, categoria_id } = c.req.query()
  
  let query = `
    SELECT l.*, a.nome as autor_nome, cat.nome as categoria_nome
    FROM livros l
    LEFT JOIN autores a ON l.autor_id = a.id
    LEFT JOIN categorias cat ON l.categoria_id = cat.id
    WHERE 1=1
  `
  const params: (string | number)[] = []
  
  if (q) {
    query += ` AND (l.titulo LIKE ? OR a.nome LIKE ? OR l.editora LIKE ?)`
    params.push(`%${q}%`, `%${q}%`, `%${q}%`)
  }
  if (status) { query += ` AND l.status = ?`; params.push(status) }
  if (categoria_id) { query += ` AND l.categoria_id = ?`; params.push(parseInt(categoria_id)) }
  
  query += ` ORDER BY l.created_at DESC`
  
  const livros = await DB.prepare(query).bind(...params).all()
  
  const stats = await DB.prepare(`
    SELECT 
      COUNT(*) as total,
      SUM(CASE WHEN status='disponivel' THEN 1 ELSE 0 END) as disponiveis,
      SUM(CASE WHEN status='emprestado' THEN 1 ELSE 0 END) as emprestados,
      SUM(CASE WHEN status='reservado' THEN 1 ELSE 0 END) as reservados
    FROM livros
  `).first()
  
  return c.json({ livros: livros.results, stats })
})

app.get('/api/livros/:id', async (c) => {
  const { DB } = c.env
  const id = c.req.param('id')
  const livro = await DB.prepare(`
    SELECT l.*, a.nome as autor_nome, cat.nome as categoria_nome
    FROM livros l
    LEFT JOIN autores a ON l.autor_id = a.id
    LEFT JOIN categorias cat ON l.categoria_id = cat.id
    WHERE l.id = ?
  `).bind(id).first()
  if (!livro) return c.json({ error: 'Livro não encontrado' }, 404)
  return c.json(livro)
})

app.post('/api/livros', async (c) => {
  const { DB } = c.env
  const body = await c.req.json()
  const { titulo, isbn, ano_publicacao, editora, paginas, sinopse, capa_url, status, autor_id, categoria_id } = body
  if (!titulo) return c.json({ error: 'Título é obrigatório' }, 400)
  
  try {
    const result = await DB.prepare(`
      INSERT INTO livros (titulo, isbn, ano_publicacao, editora, paginas, sinopse, capa_url, status, autor_id, categoria_id)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(titulo, isbn || null, ano_publicacao || null, editora || null, paginas || null,
       sinopse || null, capa_url || null, status || 'disponivel', autor_id || null, categoria_id || null).run()
    return c.json({ id: result.meta.last_row_id, message: 'Livro criado com sucesso' }, 201)
  } catch (e: any) {
    if (e.message?.includes('UNIQUE')) return c.json({ error: 'ISBN já cadastrado' }, 409)
    return c.json({ error: 'Erro ao criar livro' }, 500)
  }
})

app.put('/api/livros/:id', async (c) => {
  const { DB } = c.env
  const id = c.req.param('id')
  const body = await c.req.json()
  const { titulo, isbn, ano_publicacao, editora, paginas, sinopse, capa_url, status, autor_id, categoria_id } = body
  if (!titulo) return c.json({ error: 'Título é obrigatório' }, 400)
  
  try {
    await DB.prepare(`
      UPDATE livros SET titulo=?, isbn=?, ano_publicacao=?, editora=?, paginas=?, sinopse=?, capa_url=?, status=?, autor_id=?, categoria_id=?, updated_at=CURRENT_TIMESTAMP
      WHERE id=?
    `).bind(titulo, isbn || null, ano_publicacao || null, editora || null, paginas || null,
       sinopse || null, capa_url || null, status || 'disponivel', autor_id || null, categoria_id || null, id).run()
    return c.json({ message: 'Livro atualizado com sucesso' })
  } catch (e: any) {
    if (e.message?.includes('UNIQUE')) return c.json({ error: 'ISBN já cadastrado' }, 409)
    return c.json({ error: 'Erro ao atualizar livro' }, 500)
  }
})

app.delete('/api/livros/:id', async (c) => {
  const { DB } = c.env
  const id = c.req.param('id')
  await DB.prepare('DELETE FROM livros WHERE id = ?').bind(id).run()
  return c.json({ message: 'Livro excluído com sucesso' })
})

// ─── API AUTORES ───────────────────────────────────────────────────────────────

app.get('/api/autores', async (c) => {
  const { DB } = c.env
  const autores = await DB.prepare(`
    SELECT a.*, COUNT(l.id) as total_livros
    FROM autores a
    LEFT JOIN livros l ON l.autor_id = a.id
    GROUP BY a.id
    ORDER BY a.nome
  `).all()
  return c.json({ autores: autores.results })
})

app.get('/api/autores/:id', async (c) => {
  const { DB } = c.env
  const autor = await DB.prepare('SELECT * FROM autores WHERE id = ?').bind(c.req.param('id')).first()
  if (!autor) return c.json({ error: 'Autor não encontrado' }, 404)
  return c.json(autor)
})

app.post('/api/autores', async (c) => {
  const { DB } = c.env
  const { nome, nacionalidade } = await c.req.json()
  if (!nome) return c.json({ error: 'Nome é obrigatório' }, 400)
  const result = await DB.prepare('INSERT INTO autores (nome, nacionalidade) VALUES (?, ?)').bind(nome, nacionalidade || null).run()
  return c.json({ id: result.meta.last_row_id }, 201)
})

app.put('/api/autores/:id', async (c) => {
  const { DB } = c.env
  const { nome, nacionalidade } = await c.req.json()
  if (!nome) return c.json({ error: 'Nome é obrigatório' }, 400)
  await DB.prepare('UPDATE autores SET nome=?, nacionalidade=? WHERE id=?').bind(nome, nacionalidade || null, c.req.param('id')).run()
  return c.json({ message: 'Autor atualizado' })
})

app.delete('/api/autores/:id', async (c) => {
  const { DB } = c.env
  const id = c.req.param('id')
  const used = await DB.prepare('SELECT COUNT(*) as n FROM livros WHERE autor_id = ?').bind(id).first<{n: number}>()
  if (used && used.n > 0) return c.json({ error: 'Autor possui livros cadastrados. Remova-os primeiro.' }, 409)
  await DB.prepare('DELETE FROM autores WHERE id = ?').bind(id).run()
  return c.json({ message: 'Autor excluído' })
})

// ─── API CATEGORIAS ────────────────────────────────────────────────────────────

app.get('/api/categorias', async (c) => {
  const { DB } = c.env
  const cats = await DB.prepare(`
    SELECT cat.*, COUNT(l.id) as total_livros
    FROM categorias cat
    LEFT JOIN livros l ON l.categoria_id = cat.id
    GROUP BY cat.id
    ORDER BY cat.nome
  `).all()
  return c.json({ categorias: cats.results })
})

app.get('/api/categorias/:id', async (c) => {
  const { DB } = c.env
  const cat = await DB.prepare('SELECT * FROM categorias WHERE id = ?').bind(c.req.param('id')).first()
  if (!cat) return c.json({ error: 'Categoria não encontrada' }, 404)
  return c.json(cat)
})

app.post('/api/categorias', async (c) => {
  const { DB } = c.env
  const { nome, descricao } = await c.req.json()
  if (!nome) return c.json({ error: 'Nome é obrigatório' }, 400)
  try {
    const result = await DB.prepare('INSERT INTO categorias (nome, descricao) VALUES (?, ?)').bind(nome, descricao || null).run()
    return c.json({ id: result.meta.last_row_id }, 201)
  } catch (e: any) {
    if (e.message?.includes('UNIQUE')) return c.json({ error: 'Categoria já existe' }, 409)
    return c.json({ error: 'Erro ao criar categoria' }, 500)
  }
})

app.put('/api/categorias/:id', async (c) => {
  const { DB } = c.env
  const { nome, descricao } = await c.req.json()
  if (!nome) return c.json({ error: 'Nome é obrigatório' }, 400)
  await DB.prepare('UPDATE categorias SET nome=?, descricao=? WHERE id=?').bind(nome, descricao || null, c.req.param('id')).run()
  return c.json({ message: 'Categoria atualizada' })
})

app.delete('/api/categorias/:id', async (c) => {
  const { DB } = c.env
  const id = c.req.param('id')
  const used = await DB.prepare('SELECT COUNT(*) as n FROM livros WHERE categoria_id = ?').bind(id).first<{n: number}>()
  if (used && used.n > 0) return c.json({ error: 'Categoria possui livros cadastrados. Remova-os primeiro.' }, 409)
  await DB.prepare('DELETE FROM categorias WHERE id = ?').bind(id).run()
  return c.json({ message: 'Categoria excluída' })
})

export default app
