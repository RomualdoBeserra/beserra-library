import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { serveStatic } from 'hono/cloudflare-workers'

type Bindings = { DB: D1Database }
const app = new Hono<{ Bindings: Bindings }>()

app.use('/api/*', cors())
app.use('/static/*', serveStatic({ root: './' }))

// ─── HTML ─────────────────────────────────────────────────────────────────────

app.get('/', (c) => c.html(`<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width,initial-scale=1.0"/>
  <title>Beserra Library</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <link href="https://cdn.jsdelivr.net/npm/@fortawesome/fontawesome-free@6.4.0/css/all.min.css" rel="stylesheet"/>
  <script src="https://cdn.jsdelivr.net/npm/axios@1.6.0/dist/axios.min.js"></script>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;600;700&family=Inter:wght@300;400;500;600&display=swap');
    body{font-family:'Inter',sans-serif}
    h1,h2,h3,.font-serif{font-family:'Playfair Display',serif}
    .book-card{transition:transform .2s,box-shadow .2s}
    .book-card:hover{transform:translateY(-4px);box-shadow:0 12px 30px rgba(0,0,0,.15)}
    .status-badge{font-size:.7rem;font-weight:600;letter-spacing:.05em}
    .modal-overlay{animation:fadeIn .2s ease}
    @keyframes fadeIn{from{opacity:0}to{opacity:1}}
    .modal-box{animation:slideUp .25s ease}
    @keyframes slideUp{from{transform:translateY(30px);opacity:0}to{transform:translateY(0);opacity:1}}
    .sidebar-item.active{background:#ede9fe;color:#7c3aed;font-weight:600}
    .loading-spinner{display:inline-block;width:20px;height:20px;border:3px solid rgba(124,58,237,.3);border-top-color:#7c3aed;border-radius:50%;animation:spin .8s linear infinite}
    @keyframes spin{to{transform:rotate(360deg)}}
    input:focus,select:focus,textarea:focus{outline:none;border-color:#7c3aed;box-shadow:0 0 0 3px rgba(124,58,237,.15)}
    ::-webkit-scrollbar{width:6px}::-webkit-scrollbar-track{background:#f3f4f6}::-webkit-scrollbar-thumb{background:#c4b5fd;border-radius:3px}
    .cover-placeholder{background:linear-gradient(135deg,#7c3aed,#4f46e5)}
    .toast{animation:slideInRight .3s ease,fadeOut .3s ease 2.7s forwards}
    @keyframes slideInRight{from{transform:translateX(100%);opacity:0}to{transform:translateX(0);opacity:1}}
    @keyframes fadeOut{to{opacity:0;transform:translateX(100%)}}
    .step-circle{width:32px;height:32px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-weight:700;font-size:.85rem;flex-shrink:0}
    .step-active .step-circle{background:#7c3aed;color:#fff}
    .step-done .step-circle{background:#10b981;color:#fff}
    .step-pending .step-circle{background:#e5e7eb;color:#9ca3af}
    .step-line{flex:1;height:2px;background:#e5e7eb}
    .step-line.done{background:#10b981}
    .barcode-bar{display:inline-block;background:#111;height:56px}
    .boleto-box{font-family:'Courier New',monospace}
    @keyframes pulse2{0%,100%{opacity:1}50%{opacity:.5}}
    .animate-pulse2{animation:pulse2 1.5s ease-in-out infinite}
  </style>
</head>
<body class="bg-gray-50 min-h-screen">

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
          <p class="text-xs text-gray-500">Biblioteca Familiar</p>
        </div>
      </div>
      <div class="flex items-center gap-3">
        <div class="relative hidden sm:block">
          <i class="fas fa-search absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm"></i>
          <input id="search-global" type="text" placeholder="Buscar livros, autores..."
            class="pl-9 pr-4 py-2 border border-gray-200 rounded-lg text-sm w-64 bg-gray-50 transition-all duration-200 focus:bg-white focus:w-80"/>
        </div>
        <!-- Botão Novo Livro — só admin -->
        <button id="btn-novo-livro" onclick="openModal('modal-livro')" class="hidden bg-violet-600 hover:bg-violet-700 text-white px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 transition-colors">
          <i class="fas fa-plus"></i><span class="hidden sm:inline">Novo Livro</span>
        </button>
        <!-- Estado não logado -->
        <button id="btn-header-login" onclick="openModal('modal-login')" class="flex items-center gap-2 px-4 py-2 border border-gray-200 rounded-lg text-sm text-gray-600 hover:bg-gray-50 transition-colors">
          <i class="fas fa-user-lock"></i><span class="hidden sm:inline">Entrar</span>
        </button>
        <!-- Estado logado -->
        <div id="btn-header-user" class="hidden relative">
          <button onclick="toggleUserMenu()" class="flex items-center gap-2 px-3 py-2 bg-violet-50 border border-violet-200 rounded-lg text-sm text-violet-700 hover:bg-violet-100 transition-colors">
            <i class="fas fa-user-shield"></i>
            <span id="header-user-nome" class="hidden sm:inline font-medium"></span>
            <i class="fas fa-chevron-down text-xs"></i>
          </button>
          <div id="user-menu" class="hidden absolute right-0 top-12 bg-white border border-gray-200 rounded-xl shadow-lg w-52 z-50 overflow-hidden">
            <div class="px-4 py-3 border-b border-gray-100 bg-gray-50">
              <p class="text-xs text-gray-500">Logado como</p>
              <p id="menu-user-email" class="text-sm font-semibold text-gray-800 truncate"></p>
            </div>
            <ul class="p-1">
              <li><button onclick="abrirTrocarSenha()" class="w-full text-left flex items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 rounded-lg"><i class="fas fa-key w-4 text-center text-gray-400"></i> Trocar senha</button></li>
              <li><button onclick="setView('configuracoes')" class="w-full text-left flex items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 rounded-lg"><i class="fas fa-gear w-4 text-center text-gray-400"></i> Configurações</button></li>
              <li class="border-t border-gray-100 mt-1 pt-1"><button onclick="fazerLogout()" class="w-full text-left flex items-center gap-2 px-3 py-2 text-sm text-red-600 hover:bg-red-50 rounded-lg"><i class="fas fa-sign-out-alt w-4 text-center"></i> Sair</button></li>
            </ul>
          </div>
        </div>
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
          <li><button onclick="setView('livros')" id="nav-livros" class="sidebar-item active w-full text-left flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors"><i class="fas fa-books w-4 text-center"></i> Acervo de Livros</button></li>
          <li class="hidden"><button onclick="setView('emprestimos')" id="nav-emprestimos" class="sidebar-item w-full text-left flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors text-gray-600 hover:bg-gray-50"><i class="fas fa-handshake w-4 text-center"></i> Empréstimos <span id="badge-emp" class="ml-auto bg-amber-100 text-amber-700 text-xs px-1.5 py-0.5 rounded-full hidden"></span></button></li>
          <li class="hidden"><button onclick="setView('autores')" id="nav-autores" class="sidebar-item w-full text-left flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors text-gray-600 hover:bg-gray-50"><i class="fas fa-user-pen w-4 text-center"></i> Autores</button></li>
          <li class="hidden"><button onclick="setView('categorias')" id="nav-categorias" class="sidebar-item w-full text-left flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors text-gray-600 hover:bg-gray-50"><i class="fas fa-tags w-4 text-center"></i> Categorias</button></li>
          <li class="hidden"><button onclick="setView('configuracoes')" id="nav-configuracoes" class="sidebar-item w-full text-left flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors text-gray-600 hover:bg-gray-50"><i class="fas fa-gear w-4 text-center"></i> Configurações</button></li>
        </ul>
        <div class="p-4 border-t border-gray-100 mt-2">
          <div class="space-y-2 text-xs text-gray-500">
            <p class="flex justify-between"><span>Total de livros</span><span id="stat-total" class="font-semibold text-gray-700">—</span></p>
            <p class="flex justify-between"><span>Disponíveis</span><span id="stat-disp" class="font-semibold text-green-600">—</span></p>
            <p class="flex justify-between"><span>Emprestados</span><span id="stat-emp" class="font-semibold text-amber-600">—</span></p>
          </div>
        </div>
      </nav>
    </aside>

    <!-- MAIN -->
    <main class="flex-1 min-w-0">

      <!-- LIVROS -->
      <div id="view-livros">
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
            <button onclick="setLayout('grid')" id="btn-grid" class="p-2 rounded-lg text-violet-600 bg-violet-50"><i class="fas fa-grip"></i></button>
            <button onclick="setLayout('list')" id="btn-list" class="p-2 rounded-lg text-gray-400 hover:text-gray-600"><i class="fas fa-list"></i></button>
          </div>
        </div>
        <div id="livros-container" class="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-5">
          <div class="col-span-full flex items-center justify-center py-16 text-gray-400"><div class="loading-spinner"></div></div>
        </div>
      </div>

      <!-- EMPRÉSTIMOS -->
      <div id="view-emprestimos" class="hidden">
        <div class="flex items-center justify-between mb-5">
          <h2 class="font-serif text-2xl font-bold text-gray-800">Gestão de Empréstimos</h2>
        </div>
        <!-- Filtros status empréstimo -->
        <div class="bg-white rounded-xl border border-gray-200 p-4 mb-5 flex flex-wrap gap-2">
          <button onclick="filterEmprestimos('')" id="ef-todos" class="emp-filter-btn px-3 py-1.5 rounded-lg text-xs font-semibold bg-violet-600 text-white">Todos</button>
          <button onclick="filterEmprestimos('aguardando_pagamento')" id="ef-aguardando" class="emp-filter-btn px-3 py-1.5 rounded-lg text-xs font-semibold bg-gray-100 text-gray-600 hover:bg-gray-200">Aguardando Pagamento</button>
          <button onclick="filterEmprestimos('pago')" id="ef-pago" class="emp-filter-btn px-3 py-1.5 rounded-lg text-xs font-semibold bg-gray-100 text-gray-600 hover:bg-gray-200">Pago</button>
          <button onclick="filterEmprestimos('enviado')" id="ef-enviado" class="emp-filter-btn px-3 py-1.5 rounded-lg text-xs font-semibold bg-gray-100 text-gray-600 hover:bg-gray-200">Enviado</button>
          <button onclick="filterEmprestimos('entregue')" id="ef-entregue" class="emp-filter-btn px-3 py-1.5 rounded-lg text-xs font-semibold bg-gray-100 text-gray-600 hover:bg-gray-200">Entregue</button>
          <button onclick="filterEmprestimos('cancelado')" id="ef-cancelado" class="emp-filter-btn px-3 py-1.5 rounded-lg text-xs font-semibold bg-gray-100 text-gray-600 hover:bg-gray-200">Cancelado</button>
        </div>
        <div id="emprestimos-container" class="space-y-4">
          <div class="flex items-center justify-center py-16 text-gray-400"><div class="loading-spinner"></div></div>
        </div>
      </div>

      <!-- AUTORES -->
      <div id="view-autores" class="hidden">
        <div class="flex items-center justify-between mb-5">
          <h2 class="font-serif text-2xl font-bold text-gray-800">Autores</h2>
          <button onclick="openModal('modal-autor')" class="bg-violet-600 hover:bg-violet-700 text-white px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 transition-colors"><i class="fas fa-plus"></i> Novo Autor</button>
        </div>
        <div id="autores-container" class="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4"></div>
      </div>

      <!-- CATEGORIAS -->
      <div id="view-categorias" class="hidden">
        <div class="flex items-center justify-between mb-5">
          <h2 class="font-serif text-2xl font-bold text-gray-800">Categorias</h2>
          <button onclick="openModal('modal-categoria')" class="bg-violet-600 hover:bg-violet-700 text-white px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 transition-colors"><i class="fas fa-plus"></i> Nova Categoria</button>
        </div>
        <div id="categorias-container" class="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4"></div>
      </div>

      <!-- CONFIGURAÇÕES -->
      <div id="view-configuracoes" class="hidden">
        <div class="mb-6">
          <h2 class="font-serif text-2xl font-bold text-gray-800">Configurações do Administrador</h2>
          <p class="text-sm text-gray-500 mt-1">Gerencie os dados da biblioteca e a chave PIX para recebimento de pagamentos</p>
        </div>
        <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">

          <!-- Card Perfil -->
          <div class="bg-white rounded-2xl border border-gray-200 p-6">
            <div class="flex items-center gap-3 mb-5">
              <div class="w-10 h-10 bg-violet-100 rounded-xl flex items-center justify-center">
                <i class="fas fa-building text-violet-600"></i>
              </div>
              <div>
                <h3 class="font-semibold text-gray-800">Dados da Biblioteca</h3>
                <p class="text-xs text-gray-500">Informações exibidas nos comprovantes</p>
              </div>
            </div>
            <div class="space-y-4">
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">Nome da Biblioteca</label>
                <input id="cfg-nome" type="text" placeholder="Ex: Beserra Library" class="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-gray-50 focus:bg-white focus:border-violet-400 outline-none transition"/>
              </div>
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">Responsável</label>
                <input id="cfg-responsavel" type="text" placeholder="Nome do administrador" class="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-gray-50 focus:bg-white focus:border-violet-400 outline-none transition"/>
              </div>
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">E-mail de contato</label>
                <input id="cfg-email" type="email" placeholder="contato@biblioteca.com" class="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-gray-50 focus:bg-white focus:border-violet-400 outline-none transition"/>
              </div>
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">Telefone / WhatsApp</label>
                <input id="cfg-telefone" type="text" placeholder="(11) 99999-9999" class="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-gray-50 focus:bg-white focus:border-violet-400 outline-none transition"/>
              </div>
            </div>
          </div>

          <!-- Card PIX -->
          <div class="bg-white rounded-2xl border border-gray-200 p-6">
            <div class="flex items-center gap-3 mb-5">
              <div class="w-10 h-10 bg-green-100 rounded-xl flex items-center justify-center">
                <i class="fas fa-qrcode text-green-600"></i>
              </div>
              <div>
                <h3 class="font-semibold text-gray-800">Chave PIX</h3>
                <p class="text-xs text-gray-500">Usada para receber o pagamento do frete</p>
              </div>
            </div>

            <!-- Preview PIX -->
            <div id="pix-preview" class="hidden mb-5 bg-green-50 border border-green-200 rounded-xl p-4 text-center">
              <div class="w-16 h-16 mx-auto mb-2 bg-white rounded-xl flex items-center justify-center shadow-sm border border-green-100">
                <i class="fas fa-qrcode text-green-600 text-3xl"></i>
              </div>
              <p class="text-xs text-green-600 font-semibold mb-1">Chave PIX cadastrada</p>
              <p id="pix-preview-tipo" class="text-xs text-gray-500 mb-1"></p>
              <p id="pix-preview-chave" class="font-mono text-sm font-bold text-gray-800 break-all"></p>
              <p id="pix-preview-nome" class="text-xs text-gray-500 mt-1"></p>
            </div>

            <div class="space-y-4">
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">Tipo de Chave</label>
                <select id="cfg-pix-tipo" class="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-gray-50 focus:bg-white focus:border-violet-400 outline-none transition" onchange="atualizarPlaceholderPix()">
                  <option value="cpf">CPF</option>
                  <option value="cnpj">CNPJ</option>
                  <option value="email">E-mail</option>
                  <option value="telefone">Telefone</option>
                  <option value="aleatoria">Chave Aleatória</option>
                </select>
              </div>
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">Chave PIX <span class="text-red-500">*</span></label>
                <input id="cfg-pix-chave" type="text" placeholder="000.000.000-00" class="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-gray-50 focus:bg-white focus:border-violet-400 outline-none transition font-mono"/>
              </div>
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">Nome do Titular</label>
                <input id="cfg-pix-titular" type="text" placeholder="Nome que aparece no PIX" class="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-gray-50 focus:bg-white focus:border-violet-400 outline-none transition"/>
              </div>
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">Banco</label>
                <input id="cfg-pix-banco" type="text" placeholder="Ex: Nubank, Itaú, Bradesco..." class="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-gray-50 focus:bg-white focus:border-violet-400 outline-none transition"/>
              </div>
            </div>
          </div>
        </div>

        <!-- Botão salvar -->
        <div class="mt-6 flex justify-end">
          <button onclick="salvarConfiguracoes()" class="bg-violet-600 hover:bg-violet-700 text-white px-8 py-2.5 rounded-xl text-sm font-semibold flex items-center gap-2 transition-colors shadow-sm">
            <i class="fas fa-save"></i> Salvar Configurações
          </button>
        </div>
      </div>

    </main>
  </div>
</div>

<!-- ═══════════ MODAIS ═══════════ -->

<!-- Modal Livro -->
<div id="modal-livro" class="modal-overlay fixed inset-0 bg-black/50 z-50 hidden flex items-center justify-center p-4">
  <div class="modal-box bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
    <div class="flex items-center justify-between p-6 border-b border-gray-100">
      <h3 id="modal-livro-title" class="font-serif text-xl font-bold text-gray-800">Novo Livro</h3>
      <button onclick="closeModal('modal-livro')" class="w-8 h-8 flex items-center justify-center rounded-full text-gray-400 hover:bg-gray-100"><i class="fas fa-times"></i></button>
    </div>
    <form id="form-livro" onsubmit="saveLivro(event)" class="p-6 space-y-4">
      <input type="hidden" id="livro-id"/>
      <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div class="sm:col-span-2"><label class="block text-sm font-medium text-gray-700 mb-1">Título <span class="text-red-500">*</span></label><input id="livro-titulo" type="text" required placeholder="Ex: Dom Casmurro" class="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-gray-50"/></div>
        <div><label class="block text-sm font-medium text-gray-700 mb-1">Autor</label><select id="livro-autor" class="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-gray-50"><option value="">Selecionar autor</option></select></div>
        <div><label class="block text-sm font-medium text-gray-700 mb-1">Categoria</label><select id="livro-categoria" class="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-gray-50"><option value="">Selecionar categoria</option></select></div>
        <div><label class="block text-sm font-medium text-gray-700 mb-1">ISBN</label><input id="livro-isbn" type="text" placeholder="978-xx-xxx-xxxx-x" class="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-gray-50"/></div>
        <div><label class="block text-sm font-medium text-gray-700 mb-1">Ano de Publicação</label><input id="livro-ano" type="number" min="1000" max="2030" placeholder="2024" class="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-gray-50"/></div>
        <div><label class="block text-sm font-medium text-gray-700 mb-1">Editora</label><input id="livro-editora" type="text" placeholder="Nome da editora" class="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-gray-50"/></div>
        <div><label class="block text-sm font-medium text-gray-700 mb-1">Nº de Páginas</label><input id="livro-paginas" type="number" min="1" placeholder="300" class="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-gray-50"/></div>
        <div><label class="block text-sm font-medium text-gray-700 mb-1">Status</label>
          <select id="livro-status" class="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-gray-50">
            <option value="disponivel">Disponível</option><option value="emprestado">Emprestado</option><option value="reservado">Reservado</option><option value="indisponivel">Indisponível</option>
          </select>
        </div>
        <div class="sm:col-span-2"><label class="block text-sm font-medium text-gray-700 mb-1">URL da Capa</label><input id="livro-capa" type="url" placeholder="https://..." class="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-gray-50"/></div>
        <div class="sm:col-span-2"><label class="block text-sm font-medium text-gray-700 mb-1">Sinopse</label><textarea id="livro-sinopse" rows="3" placeholder="Descrição do livro..." class="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-gray-50 resize-none"></textarea></div>
      </div>
      <div class="flex justify-end gap-3 pt-2">
        <button type="button" onclick="closeModal('modal-livro')" class="px-4 py-2 text-sm text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50">Cancelar</button>
        <button type="submit" class="px-6 py-2 text-sm bg-violet-600 hover:bg-violet-700 text-white rounded-lg font-medium flex items-center gap-2"><i class="fas fa-save"></i><span id="btn-save-livro">Salvar Livro</span></button>
      </div>
    </form>
  </div>
</div>

<!-- Modal Autor -->
<div id="modal-autor" class="modal-overlay fixed inset-0 bg-black/50 z-50 hidden flex items-center justify-center p-4">
  <div class="modal-box bg-white rounded-2xl shadow-2xl w-full max-w-md">
    <div class="flex items-center justify-between p-6 border-b border-gray-100">
      <h3 id="modal-autor-title" class="font-serif text-xl font-bold text-gray-800">Novo Autor</h3>
      <button onclick="closeModal('modal-autor')" class="w-8 h-8 flex items-center justify-center rounded-full text-gray-400 hover:bg-gray-100"><i class="fas fa-times"></i></button>
    </div>
    <form id="form-autor" onsubmit="saveAutor(event)" class="p-6 space-y-4">
      <input type="hidden" id="autor-id"/>
      <div><label class="block text-sm font-medium text-gray-700 mb-1">Nome <span class="text-red-500">*</span></label><input id="autor-nome" type="text" required placeholder="Nome completo" class="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-gray-50"/></div>
      <div><label class="block text-sm font-medium text-gray-700 mb-1">Nacionalidade</label><input id="autor-nacionalidade" type="text" placeholder="Ex: Brasileiro" class="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-gray-50"/></div>
      <div class="flex justify-end gap-3 pt-2">
        <button type="button" onclick="closeModal('modal-autor')" class="px-4 py-2 text-sm text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50">Cancelar</button>
        <button type="submit" class="px-6 py-2 text-sm bg-violet-600 hover:bg-violet-700 text-white rounded-lg font-medium flex items-center gap-2"><i class="fas fa-save"></i> Salvar</button>
      </div>
    </form>
  </div>
</div>

<!-- Modal Categoria -->
<div id="modal-categoria" class="modal-overlay fixed inset-0 bg-black/50 z-50 hidden flex items-center justify-center p-4">
  <div class="modal-box bg-white rounded-2xl shadow-2xl w-full max-w-md">
    <div class="flex items-center justify-between p-6 border-b border-gray-100">
      <h3 id="modal-categoria-title" class="font-serif text-xl font-bold text-gray-800">Nova Categoria</h3>
      <button onclick="closeModal('modal-categoria')" class="w-8 h-8 flex items-center justify-center rounded-full text-gray-400 hover:bg-gray-100"><i class="fas fa-times"></i></button>
    </div>
    <form id="form-categoria" onsubmit="saveCategoria(event)" class="p-6 space-y-4">
      <input type="hidden" id="categoria-id"/>
      <div><label class="block text-sm font-medium text-gray-700 mb-1">Nome <span class="text-red-500">*</span></label><input id="categoria-nome" type="text" required placeholder="Ex: Romance" class="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-gray-50"/></div>
      <div><label class="block text-sm font-medium text-gray-700 mb-1">Descrição</label><textarea id="categoria-descricao" rows="2" placeholder="Breve descrição..." class="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-gray-50 resize-none"></textarea></div>
      <div class="flex justify-end gap-3 pt-2">
        <button type="button" onclick="closeModal('modal-categoria')" class="px-4 py-2 text-sm text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50">Cancelar</button>
        <button type="submit" class="px-6 py-2 text-sm bg-violet-600 hover:bg-violet-700 text-white rounded-lg font-medium flex items-center gap-2"><i class="fas fa-save"></i> Salvar</button>
      </div>
    </form>
  </div>
</div>

<!-- Modal Login -->
<div id="modal-login" class="modal-overlay fixed inset-0 bg-black/50 z-50 hidden flex items-center justify-center p-4">
  <div class="modal-box bg-white rounded-2xl shadow-2xl w-full max-w-sm">
    <div class="p-6 text-center border-b border-gray-100">
      <div class="w-14 h-14 bg-violet-100 rounded-2xl flex items-center justify-center mx-auto mb-3">
        <i class="fas fa-user-shield text-violet-600 text-2xl"></i>
      </div>
      <h3 class="font-serif text-xl font-bold text-gray-800">Área Administrativa</h3>
      <p class="text-sm text-gray-500 mt-1">Entre com suas credenciais de administrador</p>
    </div>
    <form id="form-login" onsubmit="fazerLogin(event)" class="p-6 space-y-4">
      <div>
        <label class="block text-sm font-medium text-gray-700 mb-1">E-mail</label>
        <input id="login-email" type="email" required placeholder="admin@beserra.com" autocomplete="email"
          class="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm bg-gray-50 focus:bg-white focus:border-violet-400 outline-none transition"/>
      </div>
      <div>
        <label class="block text-sm font-medium text-gray-700 mb-1">Senha</label>
        <div class="relative">
          <input id="login-senha" type="password" required placeholder="••••••••" autocomplete="current-password"
            class="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm bg-gray-50 focus:bg-white focus:border-violet-400 outline-none transition pr-10"/>
          <button type="button" onclick="toggleSenhaVis('login-senha')" class="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
            <i class="fas fa-eye text-sm"></i>
          </button>
        </div>
      </div>
      <p id="login-erro" class="text-xs text-red-600 hidden"></p>
      <button type="submit" id="btn-login-submit" class="w-full bg-violet-600 hover:bg-violet-700 text-white py-2.5 rounded-xl text-sm font-semibold flex items-center justify-center gap-2 transition-colors">
        <i class="fas fa-sign-in-alt"></i> Entrar
      </button>
      <button type="button" onclick="closeModal('modal-login')" class="w-full text-sm text-gray-500 hover:text-gray-700 py-1">Cancelar</button>
    </form>
  </div>
</div>

<!-- Modal Trocar Senha -->
<div id="modal-senha" class="modal-overlay fixed inset-0 bg-black/50 z-50 hidden flex items-center justify-center p-4">
  <div class="modal-box bg-white rounded-2xl shadow-2xl w-full max-w-sm">
    <div class="flex items-center justify-between p-6 border-b border-gray-100">
      <h3 class="font-serif text-lg font-bold text-gray-800"><i class="fas fa-key text-violet-500 mr-2"></i>Trocar Senha</h3>
      <button onclick="closeModal('modal-senha')" class="w-8 h-8 flex items-center justify-center rounded-full text-gray-400 hover:bg-gray-100"><i class="fas fa-times"></i></button>
    </div>
    <form id="form-senha" onsubmit="trocarSenha(event)" class="p-6 space-y-4">
      <div>
        <label class="block text-sm font-medium text-gray-700 mb-1">Senha atual</label>
        <div class="relative">
          <input id="senha-atual" type="password" required placeholder="••••••••"
            class="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm bg-gray-50 focus:bg-white focus:border-violet-400 outline-none transition pr-10"/>
          <button type="button" onclick="toggleSenhaVis('senha-atual')" class="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"><i class="fas fa-eye text-sm"></i></button>
        </div>
      </div>
      <div>
        <label class="block text-sm font-medium text-gray-700 mb-1">Nova senha <span class="text-gray-400 font-normal">(mín. 6 caracteres)</span></label>
        <div class="relative">
          <input id="senha-nova" type="password" required minlength="6" placeholder="••••••••"
            class="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm bg-gray-50 focus:bg-white focus:border-violet-400 outline-none transition pr-10"/>
          <button type="button" onclick="toggleSenhaVis('senha-nova')" class="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"><i class="fas fa-eye text-sm"></i></button>
        </div>
      </div>
      <div>
        <label class="block text-sm font-medium text-gray-700 mb-1">Confirmar nova senha</label>
        <input id="senha-confirma" type="password" required minlength="6" placeholder="••••••••"
          class="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm bg-gray-50 focus:bg-white focus:border-violet-400 outline-none transition"/>
      </div>
      <p id="senha-erro" class="text-xs text-red-600 hidden"></p>
      <div class="flex gap-3 pt-1">
        <button type="button" onclick="closeModal('modal-senha')" class="flex-1 border border-gray-200 text-gray-600 rounded-xl py-2.5 text-sm hover:bg-gray-50">Cancelar</button>
        <button type="submit" class="flex-1 bg-violet-600 hover:bg-violet-700 text-white rounded-xl py-2.5 text-sm font-semibold">Salvar</button>
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

<!-- ═══════ MODAL EMPRÉSTIMO (WIZARD 3 PASSOS) ═══════ -->
<div id="modal-emprestimo" class="modal-overlay fixed inset-0 bg-black/50 z-50 hidden flex items-center justify-center p-4">
  <div class="modal-box bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[95vh] overflow-y-auto">

    <!-- Header -->
    <div class="flex items-center justify-between p-6 border-b border-gray-100">
      <h3 class="font-serif text-xl font-bold text-gray-800">Solicitar Empréstimo</h3>
      <button onclick="closeModal('modal-emprestimo')" class="w-8 h-8 flex items-center justify-center rounded-full text-gray-400 hover:bg-gray-100"><i class="fas fa-times"></i></button>
    </div>

    <!-- Steps indicator -->
    <div class="px-6 pt-5 pb-2">
      <div class="flex items-center gap-2">
        <div id="step-ind-1" class="step-active flex flex-col items-center gap-1 flex-shrink-0">
          <div class="step-circle">1</div>
          <span class="text-xs text-violet-600 font-semibold hidden sm:block">Seus Dados</span>
        </div>
        <div id="step-line-1" class="step-line"></div>
        <div id="step-ind-2" class="step-pending flex flex-col items-center gap-1 flex-shrink-0">
          <div class="step-circle">2</div>
          <span class="text-xs text-gray-400 hidden sm:block">Endereço & Frete</span>
        </div>
        <div id="step-line-2" class="step-line"></div>
        <div id="step-ind-3" class="step-pending flex flex-col items-center gap-1 flex-shrink-0">
          <div class="step-circle">3</div>
          <span class="text-xs text-gray-400 hidden sm:block">Boleto</span>
        </div>
      </div>
    </div>

    <div class="p-6">

      <!-- PASSO 1: Dados pessoais -->
      <div id="emp-step-1">
        <div id="emp-livro-info" class="flex gap-4 bg-violet-50 rounded-xl p-4 mb-5"></div>
        <h4 class="font-semibold text-gray-800 mb-4">Seus dados para contato</h4>
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div class="sm:col-span-2">
            <label class="block text-sm font-medium text-gray-700 mb-1">Nome completo <span class="text-red-500">*</span></label>
            <input id="emp-nome" type="text" required placeholder="Seu nome completo" class="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-gray-50"/>
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">E-mail <span class="text-red-500">*</span></label>
            <input id="emp-email" type="email" required placeholder="seu@email.com" class="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-gray-50"/>
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Telefone</label>
            <input id="emp-telefone" type="tel" placeholder="(11) 99999-9999" class="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-gray-50"/>
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">CPF <span class="text-red-500">*</span></label>
            <input id="emp-cpf" type="text" required placeholder="000.000.000-00" maxlength="14" class="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-gray-50"/>
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Prazo desejado</label>
            <select id="emp-prazo" class="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-gray-50">
              <option value="7">7 dias</option>
              <option value="14" selected>14 dias</option>
              <option value="21">21 dias</option>
              <option value="30">30 dias</option>
            </select>
          </div>
        </div>
        <div class="flex justify-end mt-6">
          <button onclick="empStep2()" class="px-6 py-2 bg-violet-600 hover:bg-violet-700 text-white rounded-lg text-sm font-medium flex items-center gap-2">Próximo <i class="fas fa-arrow-right"></i></button>
        </div>
      </div>

      <!-- PASSO 2: Endereço + Frete -->
      <div id="emp-step-2" class="hidden">
        <h4 class="font-semibold text-gray-800 mb-4">Endereço de entrega</h4>
        <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">CEP <span class="text-red-500">*</span></label>
            <div class="relative">
              <input id="emp-cep" type="text" required placeholder="00000-000" maxlength="9" inputmode="numeric" class="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-gray-50 pr-10"/>
              <button type="button" onclick="buscarCEP()" class="absolute right-2 top-1/2 -translate-y-1/2 text-violet-500 hover:text-violet-700"><i class="fas fa-search text-sm"></i></button>
            </div>
            <p id="cep-status" class="text-xs mt-1 text-gray-400"></p>
          </div>
          <div class="sm:col-span-2">
            <label class="block text-sm font-medium text-gray-700 mb-1">Logradouro <span class="text-red-500">*</span></label>
            <input id="emp-logradouro" type="text" required placeholder="Rua, Avenida..." class="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-gray-50"/>
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Número <span class="text-red-500">*</span></label>
            <input id="emp-numero" type="text" required placeholder="123" class="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-gray-50"/>
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Complemento</label>
            <input id="emp-complemento" type="text" placeholder="Apto, Bloco..." class="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-gray-50"/>
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Bairro</label>
            <input id="emp-bairro" type="text" placeholder="Bairro" class="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-gray-50"/>
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Cidade</label>
            <input id="emp-cidade" type="text" placeholder="Cidade" class="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-gray-50"/>
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Estado</label>
            <input id="emp-estado" type="text" placeholder="UF" maxlength="2" class="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-gray-50"/>
          </div>
        </div>

        <!-- Opções de frete -->
        <div id="frete-area" class="hidden mt-5">
          <h5 class="font-semibold text-gray-700 mb-3 flex items-center gap-2"><i class="fas fa-truck text-violet-500"></i> Opções de envio dos Correios</h5>
          <div id="frete-opcoes" class="space-y-3"></div>
        </div>
        <div id="frete-loading" class="hidden mt-5 flex items-center gap-3 text-gray-500 text-sm"><div class="loading-spinner"></div> Calculando frete...</div>

        <div class="flex justify-between mt-6">
          <button onclick="showStep(1)" class="px-5 py-2 border border-gray-200 text-gray-600 rounded-lg text-sm hover:bg-gray-50 flex items-center gap-2"><i class="fas fa-arrow-left"></i> Voltar</button>
          <button onclick="empStep3()" id="btn-emp-step3" disabled class="px-6 py-2 bg-violet-600 hover:bg-violet-700 disabled:opacity-40 disabled:cursor-not-allowed text-white rounded-lg text-sm font-medium flex items-center gap-2">Gerar Boleto <i class="fas fa-barcode"></i></button>
        </div>
      </div>

      <!-- PASSO 3: Boleto -->
      <div id="emp-step-3" class="hidden">
        <div id="boleto-container"></div>
      </div>

    </div>
  </div>
</div>

<!-- Modal detalhe empréstimo (admin) -->
<div id="modal-emp-detalhe" class="modal-overlay fixed inset-0 bg-black/50 z-50 hidden flex items-center justify-center p-4">
  <div class="modal-box bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
    <div id="emp-detalhe-content" class="p-6"></div>
  </div>
</div>

<!-- ═══════════════════ JAVASCRIPT ═══════════════════ -->
<script>
// ─── GLOBALS ────────────────────────────────────────
let currentLayout = 'grid';
let allLivros = [];
let allEmprestimos = [];
let empFilterStatus = '';
let searchTimeout = null;
let selectedFreteOpcao = null;
let currentLivroId = null;
let currentEmprestimoId = null;
let currentUser = null; // null = visitante, objeto = admin logado

// ─── AUTH FRONTEND ──────────────────────────────────
async function checkAuth(){
  try{
    const{data}=await axios.get('/api/auth/me');
    currentUser = data.authenticated ? data.user : null;
  }catch(e){ currentUser = null; }
  aplicarPermissoes();
}

function aplicarPermissoes(){
  const isAdmin = !!currentUser;

  // Header: mostra/oculta botões
  document.getElementById('btn-header-login').classList.toggle('hidden', isAdmin);
  document.getElementById('btn-header-user').classList.toggle('hidden', !isAdmin);
  document.getElementById('btn-novo-livro').classList.toggle('hidden', !isAdmin);
  if(isAdmin){
    document.getElementById('header-user-nome').textContent = currentUser.nome;
    document.getElementById('menu-user-email').textContent = currentUser.email;
  }

  // Sidebar: oculta abas admin para visitantes
  const adminNavs = ['nav-emprestimos','nav-autores','nav-categorias','nav-configuracoes'];
  adminNavs.forEach(id => {
    const el = document.getElementById(id);
    if(el) el.closest('li').classList.toggle('hidden', !isAdmin);
  });

  // Re-renderiza livros para mostrar/ocultar botões de edição
  if(allLivros.length) renderLivros(allLivros);
  if(allEmprestimos.length) renderEmprestimos(allEmprestimos);
}

async function fazerLogin(e){
  e.preventDefault();
  const btn = document.getElementById('btn-login-submit');
  const erro = document.getElementById('login-erro');
  erro.classList.add('hidden');
  btn.disabled = true;
  btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Entrando...';
  try{
    const{data}=await axios.post('/api/auth/login',{
      email: document.getElementById('login-email').value.trim(),
      senha: document.getElementById('login-senha').value
    });
    currentUser = data.user;
    closeModal('modal-login');
    document.getElementById('form-login').reset();
    aplicarPermissoes();
    showToast('Bem-vindo, '+data.user.nome+'!');
    // Se estiver numa view restrita, vai para livros
    setView('livros');
  }catch(err){
    const msg = err.response?.data?.error || 'Erro ao fazer login';
    erro.textContent = msg;
    erro.classList.remove('hidden');
  }finally{
    btn.disabled = false;
    btn.innerHTML = '<i class="fas fa-sign-in-alt"></i> Entrar';
  }
}

async function fazerLogout(){
  try{ await axios.post('/api/auth/logout'); }catch(e){}
  currentUser = null;
  aplicarPermissoes();
  setView('livros');
  toggleUserMenu(true);
  showToast('Sessão encerrada','info');
}

function toggleUserMenu(forceClose=false){
  const menu = document.getElementById('user-menu');
  if(forceClose){ menu.classList.add('hidden'); return; }
  menu.classList.toggle('hidden');
}

// Fecha menu ao clicar fora
document.addEventListener('click', e => {
  const userBtn = document.getElementById('btn-header-user');
  if(userBtn && !userBtn.contains(e.target)){
    document.getElementById('user-menu')?.classList.add('hidden');
  }
});

function abrirTrocarSenha(){
  toggleUserMenu(true);
  document.getElementById('form-senha').reset();
  document.getElementById('senha-erro').classList.add('hidden');
  openModal('modal-senha');
}

async function trocarSenha(e){
  e.preventDefault();
  const erro = document.getElementById('senha-erro');
  erro.classList.add('hidden');
  const nova  = document.getElementById('senha-nova').value;
  const conf  = document.getElementById('senha-confirma').value;
  if(nova !== conf){ erro.textContent='As senhas não coincidem'; erro.classList.remove('hidden'); return; }
  try{
    await axios.put('/api/auth/senha',{
      senha_atual: document.getElementById('senha-atual').value,
      senha_nova:  nova
    });
    closeModal('modal-senha');
    showToast('Senha alterada com sucesso!');
  }catch(err){
    erro.textContent = err.response?.data?.error || 'Erro ao trocar senha';
    erro.classList.remove('hidden');
  }
}

function toggleSenhaVis(id){
  const el = document.getElementById(id);
  el.type = el.type === 'password' ? 'text' : 'password';
}

// ─── UTILS ──────────────────────────────────────────
function showToast(msg, type='success') {
  const colors={success:'bg-green-600',error:'bg-red-600',info:'bg-blue-600',warning:'bg-amber-500'};
  const icons={success:'fa-check-circle',error:'fa-exclamation-circle',info:'fa-info-circle',warning:'fa-exclamation-triangle'};
  const el=document.createElement('div');
  el.className=\`toast flex items-center gap-3 \${colors[type]} text-white px-4 py-3 rounded-xl shadow-lg text-sm font-medium min-w-64\`;
  el.innerHTML=\`<i class="fas \${icons[type]}"></i><span>\${msg}</span>\`;
  document.getElementById('toast-container').appendChild(el);
  setTimeout(()=>el.remove(),3100);
}
function openModal(id){document.getElementById(id).classList.remove('hidden')}
function closeModal(id){document.getElementById(id).classList.add('hidden')}
document.querySelectorAll('.modal-overlay').forEach(m=>m.addEventListener('click',e=>{if(e.target===m)m.classList.add('hidden')}));

function fmtMoeda(v){return 'R$ '+parseFloat(v).toFixed(2).replace('.',',').replace(/\B(?=(\d{3})+(?!\d))/g,'.')}
function fmtData(d){if(!d)return'—';const dt=new Date(d);return dt.toLocaleDateString('pt-BR')+' '+dt.toLocaleTimeString('pt-BR',{hour:'2-digit',minute:'2-digit'})}

function statusBadge(status){
  const map={disponivel:['bg-green-100 text-green-700','Disponível'],emprestado:['bg-amber-100 text-amber-700','Emprestado'],reservado:['bg-blue-100 text-blue-700','Reservado'],indisponivel:['bg-red-100 text-red-700','Indisponível']};
  const[cls,label]=map[status]||['bg-gray-100 text-gray-700',status];
  return \`<span class="status-badge \${cls} px-2 py-0.5 rounded-full">\${label}</span>\`;
}

function empStatusBadge(s){
  const m={aguardando_pagamento:['bg-yellow-100 text-yellow-700','⏳ Aguardando Pagamento'],pago:['bg-blue-100 text-blue-700','💳 Pago'],enviado:['bg-indigo-100 text-indigo-700','📦 Enviado'],entregue:['bg-green-100 text-green-700','✅ Entregue'],cancelado:['bg-red-100 text-red-700','❌ Cancelado']};
  const[cls,label]=m[s]||['bg-gray-100 text-gray-600',s];
  return \`<span class="status-badge \${cls} px-2.5 py-1 rounded-full text-xs">\${label}</span>\`;
}

function maskCPF(el){
  let d=el.value.replace(/\D/g,'').substring(0,11);
  let f=d;
  if(d.length>9)f=d.replace(/(\d{3})(\d{3})(\d{3})(\d{1,2})/,'\$1.\$2.\$3-\$4');
  else if(d.length>6)f=d.replace(/(\d{3})(\d{3})(\d+)/,'\$1.\$2.\$3');
  else if(d.length>3)f=d.replace(/(\d{3})(\d+)/,'\$1.\$2');
  el.value=f;
}
function maskCEP(el){
  let raw=el.value.replace(/\D/g,'');
  if(raw.length>8) raw=raw.substring(0,8);
  const formatted=raw.length===8 ? raw.substring(0,5)+'-'+raw.substring(5) : raw;
  if(el.value!==formatted) el.value=formatted;
  if(raw.length===8) buscarCEP(raw);
}

// ─── CONFIGURAÇÕES ADMIN ─────────────────────────────
async function loadConfiguracoes(){
  try{
    const{data}=await axios.get('/api/admin/config');
    document.getElementById('cfg-nome').value=data.nome||'';
    document.getElementById('cfg-responsavel').value=data.responsavel||'';
    document.getElementById('cfg-email').value=data.email||'';
    document.getElementById('cfg-telefone').value=data.telefone||'';
    document.getElementById('cfg-pix-tipo').value=data.pix_tipo||'cpf';
    document.getElementById('cfg-pix-chave').value=data.pix_chave||'';
    document.getElementById('cfg-pix-titular').value=data.pix_titular||'';
    document.getElementById('cfg-pix-banco').value=data.pix_banco||'';
    atualizarPlaceholderPix();
    atualizarPreviewPix(data);
  }catch(e){showToast('Erro ao carregar configurações','error');}
}

async function salvarConfiguracoes(){
  const chave=document.getElementById('cfg-pix-chave').value.trim();
  if(!chave){showToast('Informe a chave PIX','warning');return;}
  const body={
    nome:document.getElementById('cfg-nome').value.trim(),
    responsavel:document.getElementById('cfg-responsavel').value.trim(),
    email:document.getElementById('cfg-email').value.trim(),
    telefone:document.getElementById('cfg-telefone').value.trim(),
    pix_tipo:document.getElementById('cfg-pix-tipo').value,
    pix_chave:chave,
    pix_titular:document.getElementById('cfg-pix-titular').value.trim(),
    pix_banco:document.getElementById('cfg-pix-banco').value.trim(),
  };
  try{
    await axios.put('/api/admin/config',body);
    showToast('Configurações salvas com sucesso!');
    atualizarPreviewPix(body);
  }catch(e){showToast('Erro ao salvar configurações','error');}
}

function atualizarPlaceholderPix(){
  const tipo=document.getElementById('cfg-pix-tipo').value;
  const el=document.getElementById('cfg-pix-chave');
  const placeholders={cpf:'000.000.000-00',cnpj:'00.000.000/0001-00',email:'seuemail@exemplo.com',telefone:'+55 11 99999-9999',aleatoria:'xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx'};
  el.placeholder=placeholders[tipo]||'';
}

function atualizarPreviewPix(data){
  const prev=document.getElementById('pix-preview');
  if(data.pix_chave){
    prev.classList.remove('hidden');
    const tipos={cpf:'CPF',cnpj:'CNPJ',email:'E-mail',telefone:'Telefone',aleatoria:'Chave Aleatória'};
    document.getElementById('pix-preview-tipo').textContent='Tipo: '+(tipos[data.pix_tipo]||data.pix_tipo||'');
    document.getElementById('pix-preview-chave').textContent=data.pix_chave;
    document.getElementById('pix-preview-nome').textContent=(data.pix_titular?data.pix_titular:'')+(data.pix_banco?' · '+data.pix_banco:'');
  } else {
    prev.classList.add('hidden');
  }
}

// ─── NAVEGAÇÃO ──────────────────────────────────────
function setView(view){
  const adminViews = ['emprestimos','autores','categorias','configuracoes'];
  if(adminViews.includes(view) && !currentUser){
    openModal('modal-login');
    return;
  }
  ['livros','emprestimos','autores','categorias','configuracoes'].forEach(v=>{
    document.getElementById('view-'+v).classList.toggle('hidden',v!==view);
    const nav=document.getElementById('nav-'+v);
    if(v===view){nav.classList.add('active');nav.classList.remove('text-gray-600','hover:bg-gray-50');}
    else{nav.classList.remove('active');nav.classList.add('text-gray-600','hover:bg-gray-50');}
  });
  if(view==='livros')loadLivros();
  if(view==='emprestimos')loadEmprestimos();
  if(view==='autores')loadAutores();
  if(view==='categorias')loadCategorias();
  if(view==='configuracoes')loadConfiguracoes();
}

// ─── LAYOUT ─────────────────────────────────────────
function setLayout(mode){
  currentLayout=mode;
  document.getElementById('btn-grid').className=mode==='grid'?'p-2 rounded-lg text-violet-600 bg-violet-50':'p-2 rounded-lg text-gray-400 hover:text-gray-600';
  document.getElementById('btn-list').className=mode==='list'?'p-2 rounded-lg text-violet-600 bg-violet-50':'p-2 rounded-lg text-gray-400 hover:text-gray-600';
  renderLivros(allLivros);
}

// ─── LIVROS ─────────────────────────────────────────
async function loadLivros(){
  const status=document.getElementById('filter-status').value;
  const cat=document.getElementById('filter-categoria').value;
  const q=document.getElementById('search-global').value;
  let url='/api/livros?';
  if(status)url+='status='+status+'&';
  if(cat)url+='categoria_id='+cat+'&';
  if(q)url+='q='+encodeURIComponent(q)+'&';
  try{
    const{data}=await axios.get(url);
    allLivros=data.livros||[];
    renderLivros(allLivros);
    updateStats(data.stats||{});
  }catch(e){showToast('Erro ao carregar livros','error')}
}

function coverPlaceholder(t,big=true){
  const l=(t||'L')[0].toUpperCase();
  return \`<div class="cover-placeholder w-full h-full flex items-center justify-center \${big?'':'rounded-lg'}"><span class="font-serif \${big?'text-5xl':'text-lg'} text-white/80 font-bold">\${l}</span></div>\`;
}

function renderLivros(livros){
  const c=document.getElementById('livros-container');
  if(!livros.length){
    c.innerHTML=\`<div class="col-span-full flex flex-col items-center justify-center py-20 text-gray-400"><i class="fas fa-book-open text-5xl mb-4 opacity-30"></i><p class="text-lg font-medium">Nenhum livro encontrado</p><button onclick="openModal('modal-livro')" class="mt-4 px-4 py-2 bg-violet-600 text-white rounded-lg text-sm hover:bg-violet-700">+ Adicionar Livro</button></div>\`;
    return;
  }
  if(currentLayout==='grid'){
    c.className='grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-5';
    c.innerHTML=livros.map(l=>\`
      <article class="book-card bg-white rounded-xl border border-gray-200 overflow-hidden cursor-pointer" onclick="viewLivro(\${l.id})">
        <div class="relative h-40 overflow-hidden">
          \${l.capa_url?\`<img src="\${l.capa_url}" alt="\${l.titulo}" class="w-full h-full object-cover" onerror="this.parentElement.innerHTML=coverPlaceholder('\${l.titulo.replace(/'/g,'')}')">\`:coverPlaceholder(l.titulo)}
          <div class="absolute top-2 right-2">\${statusBadge(l.status)}</div>
        </div>
        <div class="p-4">
          <h3 class="font-serif font-semibold text-gray-800 leading-snug line-clamp-2">\${l.titulo}</h3>
          <p class="text-sm text-gray-500 mt-1">\${l.autor_nome||'Autor desconhecido'}</p>
          \${l.categoria_nome?\`<span class="inline-block mt-2 text-xs bg-violet-50 text-violet-700 px-2 py-0.5 rounded-full">\${l.categoria_nome}</span>\`:''}
          <div class="flex items-center justify-between mt-3 pt-3 border-t border-gray-100">
            <span class="text-xs text-gray-400">\${l.ano_publicacao||''}\${l.editora?' · '+l.editora:''}</span>
            <div class="flex gap-1">
              \${l.status==='disponivel'?\`<button onclick="event.stopPropagation();solicitarEmprestimo(\${l.id})" title="Solicitar Empréstimo" class="w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 hover:text-green-600 hover:bg-green-50"><i class="fas fa-handshake text-xs"></i></button>\`:''}
              \${currentUser?\`<button onclick="event.stopPropagation();editLivro(\${l.id})" class="w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 hover:text-violet-600 hover:bg-violet-50"><i class="fas fa-edit text-xs"></i></button><button onclick="event.stopPropagation();deleteLivro(\${l.id},'\${l.titulo.replace(/'/g,'')}')" class="w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50"><i class="fas fa-trash text-xs"></i></button>\`:''}
            </div>
          </div>
        </div>
      </article>\`).join('');
  }else{
    c.className='flex flex-col gap-2';
    c.innerHTML=livros.map(l=>\`
      <article class="book-card bg-white rounded-xl border border-gray-200 flex items-center gap-4 p-4 cursor-pointer" onclick="viewLivro(\${l.id})">
        <div class="w-12 h-16 rounded-lg overflow-hidden flex-shrink-0">\${l.capa_url?\`<img src="\${l.capa_url}" class="w-full h-full object-cover" onerror="this.parentElement.innerHTML=coverPlaceholder('\${l.titulo.replace(/'/g,'')}',false)">\`:coverPlaceholder(l.titulo,false)}</div>
        <div class="flex-1 min-w-0"><h3 class="font-serif font-semibold text-gray-800 truncate">\${l.titulo}</h3><p class="text-sm text-gray-500">\${l.autor_nome||'Desconhecido'}\${l.ano_publicacao?' · '+l.ano_publicacao:''}</p></div>
        \${l.categoria_nome?\`<span class="text-xs bg-violet-50 text-violet-700 px-2 py-0.5 rounded-full hidden sm:inline">\${l.categoria_nome}</span>\`:''}
        <div class="flex-shrink-0">\${statusBadge(l.status)}</div>
        <div class="flex gap-1 flex-shrink-0">
          \${l.status==='disponivel'?\`<button onclick="event.stopPropagation();solicitarEmprestimo(\${l.id})" title="Solicitar Empréstimo" class="w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 hover:text-green-600 hover:bg-green-50"><i class="fas fa-handshake text-xs"></i></button>\`:''}
          \${currentUser?\`<button onclick="event.stopPropagation();editLivro(\${l.id})" class="w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 hover:text-violet-600 hover:bg-violet-50"><i class="fas fa-edit text-xs"></i></button><button onclick="event.stopPropagation();deleteLivro(\${l.id},'\${l.titulo.replace(/'/g,'')}')" class="w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50"><i class="fas fa-trash text-xs"></i></button>\`:''}
        </div>
      </article>\`).join('');
  }
}

function updateStats(s){
  document.getElementById('stat-total').textContent=s.total||0;
  document.getElementById('stat-disp').textContent=s.disponiveis||0;
  document.getElementById('stat-emp').textContent=s.emprestados||0;
}

async function viewLivro(id){
  try{
    const{data:l}=await axios.get('/api/livros/'+id);
    document.getElementById('detalhe-content').innerHTML=\`
      <div class="flex items-start justify-between mb-4"><div></div><button onclick="closeModal('modal-detalhe')" class="w-8 h-8 flex items-center justify-center rounded-full text-gray-400 hover:bg-gray-100"><i class="fas fa-times"></i></button></div>
      <div class="flex gap-5">
        <div class="w-28 h-40 rounded-xl overflow-hidden flex-shrink-0 shadow-md">\${l.capa_url?\`<img src="\${l.capa_url}" class="w-full h-full object-cover" onerror="this.parentElement.innerHTML=coverPlaceholder('\${l.titulo.replace(/'/g,'')}')">\`:coverPlaceholder(l.titulo)}</div>
        <div class="flex-1 min-w-0">
          <h2 class="font-serif text-2xl font-bold text-gray-900 leading-snug">\${l.titulo}</h2>
          <p class="text-gray-500 mt-1">\${l.autor_nome||'Autor desconhecido'}</p>
          <div class="mt-2">\${statusBadge(l.status)}</div>
          \${l.categoria_nome?\`<p class="text-xs text-violet-600 bg-violet-50 rounded-full inline-block px-2 py-0.5 mt-2">\${l.categoria_nome}</p>\`:''}
        </div>
      </div>
      <div class="mt-5 grid grid-cols-2 gap-3 text-sm">
        \${l.isbn?\`<div class="bg-gray-50 rounded-lg p-3"><p class="text-xs text-gray-400 mb-0.5">ISBN</p><p class="font-medium text-gray-700">\${l.isbn}</p></div>\`:''}
        \${l.ano_publicacao?\`<div class="bg-gray-50 rounded-lg p-3"><p class="text-xs text-gray-400 mb-0.5">Ano</p><p class="font-medium text-gray-700">\${l.ano_publicacao}</p></div>\`:''}
        \${l.editora?\`<div class="bg-gray-50 rounded-lg p-3"><p class="text-xs text-gray-400 mb-0.5">Editora</p><p class="font-medium text-gray-700">\${l.editora}</p></div>\`:''}
        \${l.paginas?\`<div class="bg-gray-50 rounded-lg p-3"><p class="text-xs text-gray-400 mb-0.5">Páginas</p><p class="font-medium text-gray-700">\${l.paginas}</p></div>\`:''}
      </div>
      \${l.sinopse?\`<div class="mt-4"><p class="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Sinopse</p><p class="text-sm text-gray-600 leading-relaxed">\${l.sinopse}</p></div>\`:''}
      <div class="mt-5 flex gap-3">
        \${l.status==='disponivel'?\`<button onclick="closeModal('modal-detalhe');solicitarEmprestimo(\${l.id})" class="flex-1 bg-green-600 hover:bg-green-700 text-white rounded-lg py-2 text-sm font-medium"><i class="fas fa-handshake mr-2"></i>Solicitar Empréstimo</button>\`:\`<div class="flex-1 bg-gray-100 text-gray-400 rounded-lg py-2 text-sm font-medium text-center cursor-not-allowed">Livro indisponível</div>\`}
        \${currentUser?\`<button onclick="closeModal('modal-detalhe');editLivro(\${l.id})" class="flex-1 border border-violet-200 text-violet-600 rounded-lg py-2 text-sm font-medium hover:bg-violet-50"><i class="fas fa-edit mr-2"></i>Editar</button><button onclick="closeModal('modal-detalhe');deleteLivro(\${l.id},'\${l.titulo.replace(/'/g,'')}')" class="border border-red-200 text-red-600 rounded-lg py-2 px-4 text-sm font-medium hover:bg-red-50"><i class="fas fa-trash"></i></button>\`:''}
      </div>\`;
    openModal('modal-detalhe');
  }catch(e){showToast('Erro ao carregar detalhes','error')}
}

async function editLivro(id){
  try{
    const{data}=await axios.get('/api/livros/'+id);
    document.getElementById('livro-id').value=data.id;
    document.getElementById('livro-titulo').value=data.titulo;
    document.getElementById('livro-isbn').value=data.isbn||'';
    document.getElementById('livro-ano').value=data.ano_publicacao||'';
    document.getElementById('livro-editora').value=data.editora||'';
    document.getElementById('livro-paginas').value=data.paginas||'';
    document.getElementById('livro-sinopse').value=data.sinopse||'';
    document.getElementById('livro-capa').value=data.capa_url||'';
    document.getElementById('livro-status').value=data.status;
    document.getElementById('livro-autor').value=data.autor_id||'';
    document.getElementById('livro-categoria').value=data.categoria_id||'';
    document.getElementById('modal-livro-title').textContent='Editar Livro';
    document.getElementById('btn-save-livro').textContent='Atualizar Livro';
    openModal('modal-livro');
  }catch(e){showToast('Erro ao carregar livro','error')}
}

async function saveLivro(e){
  e.preventDefault();
  const id=document.getElementById('livro-id').value;
  const payload={titulo:document.getElementById('livro-titulo').value,isbn:document.getElementById('livro-isbn').value||null,ano_publicacao:document.getElementById('livro-ano').value?parseInt(document.getElementById('livro-ano').value):null,editora:document.getElementById('livro-editora').value||null,paginas:document.getElementById('livro-paginas').value?parseInt(document.getElementById('livro-paginas').value):null,sinopse:document.getElementById('livro-sinopse').value||null,capa_url:document.getElementById('livro-capa').value||null,status:document.getElementById('livro-status').value,autor_id:document.getElementById('livro-autor').value?parseInt(document.getElementById('livro-autor').value):null,categoria_id:document.getElementById('livro-categoria').value?parseInt(document.getElementById('livro-categoria').value):null};
  try{
    if(id){await axios.put('/api/livros/'+id,payload);showToast('Livro atualizado!');}
    else{await axios.post('/api/livros',payload);showToast('Livro cadastrado!');}
    closeModal('modal-livro');
    document.getElementById('form-livro').reset();document.getElementById('livro-id').value='';
    document.getElementById('modal-livro-title').textContent='Novo Livro';document.getElementById('btn-save-livro').textContent='Salvar Livro';
    loadLivros();
  }catch(e){showToast(e.response?.data?.error||'Erro ao salvar','error')}
}

async function deleteLivro(id,titulo){
  if(!confirm('Confirma exclusão de "'+titulo+'"?'))return;
  try{await axios.delete('/api/livros/'+id);showToast('Livro excluído!');loadLivros();}
  catch(e){showToast('Erro ao excluir','error')}
}

// ─── EMPRÉSTIMO WIZARD ──────────────────────────────
async function solicitarEmprestimo(livroId){
  currentLivroId=livroId;
  selectedFreteOpcao=null;
  document.getElementById('btn-emp-step3').disabled=true;
  document.getElementById('frete-area').classList.add('hidden');
  document.getElementById('frete-loading').classList.add('hidden');
  document.getElementById('form-livro-info-reset')||null;
  // Reset campos
  ['emp-nome','emp-email','emp-telefone','emp-cpf','emp-cep','emp-logradouro','emp-numero','emp-complemento','emp-bairro','emp-cidade','emp-estado'].forEach(id=>{const el=document.getElementById(id);if(el)el.value='';});
  document.getElementById('emp-prazo').value='14';
  document.getElementById('cep-status').textContent='';

  try{
    const{data:l}=await axios.get('/api/livros/'+livroId);
    document.getElementById('emp-livro-info').innerHTML=\`
      <div class="w-14 h-20 rounded-lg overflow-hidden flex-shrink-0 shadow">\${l.capa_url?\`<img src="\${l.capa_url}" class="w-full h-full object-cover" onerror="this.outerHTML=coverPlaceholder('\${l.titulo.replace(/'/g,'')}',false)">\`:coverPlaceholder(l.titulo,false)}</div>
      <div class="flex-1 min-w-0">
        <p class="text-xs text-violet-600 font-semibold mb-1">Livro selecionado</p>
        <h4 class="font-serif font-bold text-gray-900 leading-snug">\${l.titulo}</h4>
        <p class="text-sm text-gray-500">\${l.autor_nome||'Autor desconhecido'}</p>
      </div>\`;
  }catch(e){}

  showStep(1);
  openModal('modal-emprestimo');
}

function showStep(n){
  [1,2,3].forEach(i=>{
    document.getElementById('emp-step-'+i).classList.toggle('hidden',i!==n);
    const ind=document.getElementById('step-ind-'+i);
    ind.className=ind.className.replace(/step-(active|done|pending)/g,'');
    if(i<n)ind.classList.add('step-done');
    else if(i===n)ind.classList.add('step-active');
    else ind.classList.add('step-pending');
    // atualiza textos de cor
    const span=ind.querySelector('span');
    if(span){span.className=span.className.replace(/text-(violet|green|gray)-\d+/g,'');span.classList.add(i<n?'text-green-600':i===n?'text-violet-600':'text-gray-400');}
  });
  [1,2].forEach(i=>{
    const line=document.getElementById('step-line-'+i);
    line.className='step-line'+(i<n?' done':'');
  });
}

function empStep2(){
  const nome=document.getElementById('emp-nome').value.trim();
  const email=document.getElementById('emp-email').value.trim();
  const cpf=document.getElementById('emp-cpf').value.trim();
  if(!nome||!email||!cpf){showToast('Preencha nome, e-mail e CPF','warning');return;}
  if(cpf.replace(/\D/g,'').length<11){showToast('CPF inválido','warning');return;}
  showStep(2);
}

async function buscarCEP(cep){
  if(!cep) cep=document.getElementById('emp-cep').value.replace(/\D/g,'');
  if(cep.length!==8) return;
  const st=document.getElementById('cep-status');
  st.textContent='Buscando...';st.className='text-xs mt-1 text-gray-400 animate-pulse2';
  try{
    const{data}=await axios.get('/api/cep/'+cep);
    if(data.erro){st.textContent='CEP não encontrado';st.className='text-xs mt-1 text-red-500';return;}
    document.getElementById('emp-logradouro').value=data.logradouro||'';
    document.getElementById('emp-bairro').value=data.bairro||'';
    document.getElementById('emp-cidade').value=data.localidade||'';
    document.getElementById('emp-estado').value=data.uf||'';
    st.textContent='✓ Endereço encontrado — '+data.localidade+'/'+data.uf;
    st.className='text-xs mt-1 text-green-600';
    calcularFrete(cep);
  }catch(e){st.textContent='Erro ao buscar CEP';st.className='text-xs mt-1 text-red-500';}
}

async function calcularFrete(cep){
  document.getElementById('frete-area').classList.add('hidden');
  document.getElementById('frete-loading').classList.remove('hidden');
  selectedFreteOpcao=null;
  document.getElementById('btn-emp-step3').disabled=true;
  try{
    const{data}=await axios.get('/api/frete?cep='+cep);
    document.getElementById('frete-loading').classList.add('hidden');
    document.getElementById('frete-area').classList.remove('hidden');
    const container=document.getElementById('frete-opcoes');
    container.innerHTML=data.opcoes.map((op,i)=>\`
      <label class="flex items-center gap-4 border-2 border-gray-200 hover:border-violet-300 rounded-xl p-4 cursor-pointer transition-all has-[:checked]:border-violet-500 has-[:checked]:bg-violet-50">
        <input type="radio" name="frete" value="\${i}" onchange="selectFrete(\${i},\${op.preco})" class="accent-violet-600"/>
        <div class="flex-1">
          <div class="flex items-center gap-2">
            <span class="font-semibold text-gray-800">\${op.nome}</span>
            <span class="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">\${op.codigo}</span>
          </div>
          <p class="text-xs text-gray-500 mt-0.5">\${op.prazo}</p>
        </div>
        <div class="text-right flex-shrink-0">
          <p class="font-bold text-violet-700 text-lg">\${fmtMoeda(op.preco)}</p>
        </div>
      </label>\`).join('');
  }catch(e){
    document.getElementById('frete-loading').classList.add('hidden');
    showToast('Erro ao calcular frete','error');
  }
}

function selectFrete(idx,preco){
  const opcoes=document.querySelectorAll('input[name="frete"]');
  if(idx>=0&&idx<opcoes.length){
    selectedFreteOpcao={idx,preco};
    document.getElementById('btn-emp-step3').disabled=false;
  }
}

async function empStep3(){
  if(!selectedFreteOpcao){showToast('Selecione uma opção de frete','warning');return;}
  const logradouro=document.getElementById('emp-logradouro').value.trim();
  const numero=document.getElementById('emp-numero').value.trim();
  const cidade=document.getElementById('emp-cidade').value.trim();
  if(!logradouro||!numero||!cidade){showToast('Preencha o endereço completo','warning');return;}

  const payload={
    livro_id:currentLivroId,
    solicitante_nome:document.getElementById('emp-nome').value,
    solicitante_email:document.getElementById('emp-email').value,
    solicitante_telefone:document.getElementById('emp-telefone').value||null,
    solicitante_cpf:document.getElementById('emp-cpf').value,
    prazo_dias:parseInt(document.getElementById('emp-prazo').value),
    endereco_cep:document.getElementById('emp-cep').value,
    endereco_logradouro:logradouro,
    endereco_numero:numero,
    endereco_complemento:document.getElementById('emp-complemento').value||null,
    endereco_bairro:document.getElementById('emp-bairro').value||null,
    endereco_cidade:cidade,
    endereco_estado:document.getElementById('emp-estado').value,
    frete_valor:selectedFreteOpcao.preco,
    frete_modalidade:document.querySelector('input[name="frete"]:checked')?.closest('label')?.querySelector('.font-semibold')?.textContent||'PAC',
    frete_prazo:document.querySelector('input[name="frete"]:checked')?.closest('label')?.querySelector('.text-xs.text-gray-500')?.textContent||'',
  };

  try{
    const{data}=await axios.post('/api/emprestimos',payload);
    showStep(3);
    renderPIX(data);
    // atualiza badge
    loadBadgeEmprestimos();
    loadLivros();
  }catch(e){showToast(e.response?.data?.error||'Erro ao criar empréstimo','error')}
}

async function renderPIX(emp){
  // Busca a chave PIX cadastrada nas configurações
  let pixChave='', pixTipo='', pixTitular='', pixBanco='', nomeBib='Beserra Library';
  try{
    const{data}=await axios.get('/api/admin/config');
    pixChave=data.pix_chave||'';
    pixTipo=data.pix_tipo||'';
    pixTitular=data.pix_titular||'';
    pixBanco=data.pix_banco||'';
    nomeBib=data.nome||'Beserra Library';
  }catch(e){}

  const semPix=!pixChave;
  const tipos={cpf:'CPF',cnpj:'CNPJ',email:'E-mail',telefone:'Telefone',aleatoria:'Chave Aleatória'};
  const tipoLabel=tipos[pixTipo]||pixTipo||'';

  document.getElementById('boleto-container').innerHTML=\`
    <div class="text-center mb-5">
      <div class="w-14 h-14 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-3">
        <i class="fas fa-check text-green-600 text-2xl"></i>
      </div>
      <h4 class="font-serif text-xl font-bold text-gray-800">Empréstimo solicitado!</h4>
      <p class="text-sm text-gray-500 mt-1">Realize o pagamento via PIX para confirmar o envio</p>
    </div>

    \${semPix?\`
      <div class="bg-red-50 border border-red-200 rounded-xl p-5 text-center">
        <i class="fas fa-exclamation-triangle text-red-400 text-2xl mb-2"></i>
        <p class="text-red-700 font-semibold text-sm">Chave PIX não configurada</p>
        <p class="text-red-500 text-xs mt-1">O administrador precisa cadastrar a chave PIX em Configurações antes de receber pagamentos.</p>
      </div>
    \`:\`
      <!-- Comprovante de solicitação -->
      <div class="border-2 border-gray-200 rounded-xl overflow-hidden mb-4">
        <div class="bg-gray-800 text-white px-5 py-3 flex items-center justify-between">
          <div class="flex items-center gap-3">
            <i class="fas fa-book-open text-xl"></i>
            <div><p class="font-bold text-sm">\${nomeBib}</p><p class="text-xs text-gray-300">Comprovante de Solicitação</p></div>
          </div>
          <div class="text-right">
            <p class="text-xs text-gray-300">Nº do Pedido</p>
            <p class="font-bold text-amber-300">#\${String(emp.id).padStart(6,'0')}</p>
          </div>
        </div>
        <div class="bg-white px-5 py-4 grid grid-cols-2 gap-3 text-xs border-b border-dashed border-gray-200">
          <div><p class="text-gray-400 mb-0.5">Solicitante</p><p class="font-semibold text-gray-800">\${emp.solicitante_nome}</p></div>
          <div><p class="text-gray-400 mb-0.5">CPF</p><p class="font-semibold text-gray-800">\${emp.solicitante_cpf}</p></div>
          <div class="col-span-2"><p class="text-gray-400 mb-0.5">Livro</p><p class="font-semibold text-gray-800">\${emp.livro_titulo}</p></div>
          <div><p class="text-gray-400 mb-0.5">Modalidade de Frete</p><p class="font-semibold text-gray-800">\${emp.frete_modalidade}</p></div>
          <div><p class="text-gray-400 mb-0.5">Prazo do Empréstimo</p><p class="font-semibold text-gray-800">\${emp.prazo_dias} dias</p></div>
        </div>
        <div class="bg-violet-50 px-5 py-3 flex items-center justify-between">
          <p class="text-sm text-gray-600 font-medium">Valor a pagar (frete)</p>
          <p class="font-bold text-2xl text-violet-700">\${fmtMoeda(emp.frete_valor)}</p>
        </div>
      </div>

      <!-- Área PIX -->
      <div class="bg-green-50 border-2 border-green-300 rounded-xl overflow-hidden">
        <div class="bg-green-600 text-white px-5 py-3 flex items-center gap-3">
          <i class="fas fa-qrcode text-xl"></i>
          <div>
            <p class="font-bold text-sm">Pagar via PIX</p>
            <p class="text-xs text-green-100">Transferência instantânea — aprovação em segundos</p>
          </div>
        </div>
        <div class="p-5">
          <div class="flex flex-col sm:flex-row items-center gap-5">
            <!-- Ícone QR -->
            <div class="flex-shrink-0 w-28 h-28 bg-white border-2 border-green-300 rounded-xl flex flex-col items-center justify-center shadow-sm">
              <i class="fas fa-qrcode text-green-600 text-4xl mb-1"></i>
              <p class="text-xs text-green-600 font-semibold">PIX</p>
            </div>
            <!-- Dados -->
            <div class="flex-1 w-full space-y-3">
              \${tipoLabel?\`<div class="flex items-center gap-2 text-xs text-gray-500"><i class="fas fa-tag w-4"></i><span>Tipo: <strong>\${tipoLabel}</strong></span></div>\`:''}
              \${pixTitular?\`<div class="flex items-center gap-2 text-xs text-gray-500"><i class="fas fa-user w-4"></i><span>\${pixTitular}</span></div>\`:''}
              \${pixBanco?\`<div class="flex items-center gap-2 text-xs text-gray-500"><i class="fas fa-university w-4"></i><span>\${pixBanco}</span></div>\`:''}
              <div class="bg-white border border-green-200 rounded-lg p-3">
                <p class="text-xs text-gray-400 mb-1">Chave PIX</p>
                <div class="flex items-center gap-2">
                  <p id="pix-chave-display" class="font-mono text-sm font-bold text-gray-800 flex-1 break-all">\${pixChave}</p>
                  <button onclick="copiarPIX('\${pixChave}')" class="flex-shrink-0 px-3 py-1.5 bg-green-600 text-white text-xs rounded-lg hover:bg-green-700 flex items-center gap-1 transition-colors">
                    <i class="fas fa-copy"></i> Copiar
                  </button>
                </div>
              </div>
              <div class="bg-white border border-green-200 rounded-lg p-3">
                <p class="text-xs text-gray-400 mb-1">Valor exato a transferir</p>
                <p class="font-bold text-xl text-green-700">\${fmtMoeda(emp.frete_valor)}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Instruções -->
      <div class="mt-4 bg-amber-50 border border-amber-200 rounded-xl p-4">
        <p class="font-semibold text-amber-800 text-sm mb-2"><i class="fas fa-info-circle mr-2"></i>Como pagar</p>
        <ol class="space-y-1.5 text-amber-700 text-xs list-decimal list-inside">
          <li>Abra o app do seu banco e acesse a área <strong>PIX</strong></li>
          <li>Escolha <strong>Pagar com chave PIX</strong> e cole a chave acima</li>
          <li>Confirme o valor de <strong>\${fmtMoeda(emp.frete_valor)}</strong> e finalize o pagamento</li>
          <li>Após confirmação, o livro será enviado em até <strong>2 dias úteis</strong></li>
          <li>Você receberá o código de rastreamento por e-mail</li>
        </ol>
      </div>
    \`}

    <div class="mt-4 flex gap-3">
      <button onclick="window.print()" class="flex-1 border border-gray-200 text-gray-600 rounded-lg py-2 text-sm hover:bg-gray-50 flex items-center justify-center gap-2">
        <i class="fas fa-print"></i> Imprimir
      </button>
      <button onclick="closeModal('modal-emprestimo');setView('emprestimos')" class="flex-1 bg-violet-600 text-white rounded-lg py-2 text-sm font-medium hover:bg-violet-700 flex items-center justify-center gap-2">
        <i class="fas fa-list"></i> Ver Empréstimos
      </button>
    </div>
  \`;
}

function copiarPIX(chave){
  navigator.clipboard.writeText(chave).then(()=>showToast('Chave PIX copiada!','info')).catch(()=>{
    // fallback para browsers sem clipboard API
    const el=document.createElement('textarea');
    el.value=chave;el.style.position='fixed';el.style.opacity='0';
    document.body.appendChild(el);el.select();
    document.execCommand('copy');document.body.removeChild(el);
    showToast('Chave PIX copiada!','info');
  });
}

// ─── EMPRÉSTIMOS (ADMIN) ─────────────────────────────
async function loadEmprestimos(){
  try{
    const{data}=await axios.get('/api/emprestimos?status='+empFilterStatus);
    allEmprestimos=data.emprestimos||[];
    renderEmprestimos(allEmprestimos);
    updateBadgeEmprestimos(data.pendentes||0);
  }catch(e){showToast('Erro ao carregar empréstimos','error')}
}

async function loadBadgeEmprestimos(){
  try{const{data}=await axios.get('/api/emprestimos?status=aguardando_pagamento');updateBadgeEmprestimos(data.emprestimos?.length||0);}catch(e){}
}

function updateBadgeEmprestimos(n){
  const b=document.getElementById('badge-emp');
  if(n>0){b.textContent=n;b.classList.remove('hidden');}else{b.classList.add('hidden');}
}

function filterEmprestimos(status){
  empFilterStatus=status;
  document.querySelectorAll('.emp-filter-btn').forEach(btn=>{
    btn.className='emp-filter-btn px-3 py-1.5 rounded-lg text-xs font-semibold bg-gray-100 text-gray-600 hover:bg-gray-200';
  });
  const activeId='ef-'+(status||'todos');
  const activeBtn=document.getElementById(activeId);
  if(activeBtn)activeBtn.className='emp-filter-btn px-3 py-1.5 rounded-lg text-xs font-semibold bg-violet-600 text-white';
  loadEmprestimos();
}

function renderEmprestimos(lista){
  const c=document.getElementById('emprestimos-container');
  if(!lista.length){
    c.innerHTML=\`<div class="flex flex-col items-center justify-center py-20 text-gray-400 bg-white rounded-xl border border-gray-200"><i class="fas fa-handshake text-5xl mb-4 opacity-30"></i><p class="text-lg font-medium">Nenhum empréstimo encontrado</p></div>\`;
    return;
  }
  c.innerHTML=lista.map(e=>\`
    <div class="bg-white border border-gray-200 rounded-xl p-5 hover:shadow-md transition-shadow">
      <div class="flex items-start gap-4 flex-wrap">
        <div class="flex-1 min-w-0">
          <div class="flex items-center gap-2 flex-wrap mb-1">
            <span class="font-mono text-xs text-gray-400">#\${String(e.id).padStart(6,'0')}</span>
            \${empStatusBadge(e.status)}
          </div>
          <h3 class="font-serif font-bold text-gray-900">\${e.livro_titulo||'—'}</h3>
          <p class="text-sm text-gray-500 mt-0.5">\${e.solicitante_nome} · \${e.solicitante_email}</p>
          <p class="text-xs text-gray-400 mt-1"><i class="fas fa-map-marker-alt mr-1"></i>\${e.endereco_logradouro}, \${e.endereco_numero} — \${e.endereco_cidade}/\${e.endereco_estado} · CEP \${e.endereco_cep}</p>
        </div>
        <div class="text-right flex-shrink-0">
          <p class="font-bold text-violet-700 text-xl">\${fmtMoeda(e.frete_valor)}</p>
          <p class="text-xs text-gray-400">\${e.frete_modalidade||''}</p>
          <p class="text-xs text-gray-400 mt-1">\${fmtData(e.created_at)}</p>
        </div>
      </div>

      <div class="mt-4 pt-4 border-t border-gray-100 flex flex-wrap gap-2 items-center justify-between">
        <div class="flex flex-wrap gap-2">
          \${e.status==='aguardando_pagamento'?\`
            <button onclick="confirmarPagamento(\${e.id})" class="px-3 py-1.5 bg-green-600 hover:bg-green-700 text-white rounded-lg text-xs font-semibold flex items-center gap-1"><i class="fas fa-check"></i> Confirmar Pagamento</button>
            <button onclick="cancelarEmprestimo(\${e.id})" class="px-3 py-1.5 bg-red-50 text-red-600 hover:bg-red-100 rounded-lg text-xs font-semibold flex items-center gap-1"><i class="fas fa-times"></i> Cancelar</button>
          \`:''}
          \${e.status==='pago'?\`
            <button onclick="marcarEnviado(\${e.id})" class="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold flex items-center gap-1"><i class="fas fa-truck"></i> Marcar como Enviado</button>
          \`:''}
          \${e.status==='enviado'?\`
            <button onclick="marcarEntregue(\${e.id})" class="px-3 py-1.5 bg-green-600 hover:bg-green-700 text-white rounded-lg text-xs font-semibold flex items-center gap-1"><i class="fas fa-box-open"></i> Confirmar Entrega</button>
          \`:''}
        </div>
        <button onclick="verDetalheEmprestimo(\${e.id})" class="px-3 py-1.5 border border-gray-200 text-gray-600 rounded-lg text-xs hover:bg-gray-50 flex items-center gap-1"><i class="fas fa-eye"></i> Detalhes</button>
      </div>
    </div>\`).join('');
}

async function confirmarPagamento(id){
  if(!confirm('Confirmar pagamento do empréstimo #'+String(id).padStart(6,'0')+'?'))return;
  try{await axios.patch('/api/emprestimos/'+id+'/status',{status:'pago'});showToast('Pagamento confirmado! Livro reservado para envio.','info');loadEmprestimos();loadLivros();}
  catch(e){showToast(e.response?.data?.error||'Erro','error')}
}

async function marcarEnviado(id){
  const rastreamento=prompt('Código de rastreamento dos Correios (opcional):');
  try{await axios.patch('/api/emprestimos/'+id+'/status',{status:'enviado',rastreamento:rastreamento||null});showToast('Marcado como enviado!','info');loadEmprestimos();}
  catch(e){showToast('Erro','error')}
}

async function marcarEntregue(id){
  if(!confirm('Confirmar entrega?'))return;
  try{await axios.patch('/api/emprestimos/'+id+'/status',{status:'entregue'});showToast('Entrega confirmada!');loadEmprestimos();loadLivros();}
  catch(e){showToast('Erro','error')}
}

async function cancelarEmprestimo(id){
  if(!confirm('Cancelar este empréstimo?'))return;
  try{await axios.patch('/api/emprestimos/'+id+'/status',{status:'cancelado'});showToast('Empréstimo cancelado.','warning');loadEmprestimos();loadLivros();}
  catch(e){showToast('Erro','error')}
}

async function verDetalheEmprestimo(id){
  try{
    const{data:e}=await axios.get('/api/emprestimos/'+id);
    document.getElementById('emp-detalhe-content').innerHTML=\`
      <div class="flex items-start justify-between mb-5">
        <div>
          <p class="text-xs text-gray-400 font-mono">#\${String(e.id).padStart(6,'0')}</p>
          <h3 class="font-serif text-xl font-bold text-gray-800">\${e.livro_titulo}</h3>
        </div>
        <button onclick="closeModal('modal-emp-detalhe')" class="w-8 h-8 flex items-center justify-center rounded-full text-gray-400 hover:bg-gray-100"><i class="fas fa-times"></i></button>
      </div>
      \${empStatusBadge(e.status)}
      <div class="mt-4 space-y-3 text-sm">
        <div class="grid grid-cols-2 gap-3">
          <div class="bg-gray-50 rounded-lg p-3"><p class="text-xs text-gray-400 mb-0.5">Solicitante</p><p class="font-medium">\${e.solicitante_nome}</p></div>
          <div class="bg-gray-50 rounded-lg p-3"><p class="text-xs text-gray-400 mb-0.5">CPF</p><p class="font-medium">\${e.solicitante_cpf}</p></div>
          <div class="bg-gray-50 rounded-lg p-3"><p class="text-xs text-gray-400 mb-0.5">E-mail</p><p class="font-medium text-xs">\${e.solicitante_email}</p></div>
          <div class="bg-gray-50 rounded-lg p-3"><p class="text-xs text-gray-400 mb-0.5">Telefone</p><p class="font-medium">\${e.solicitante_telefone||'—'}</p></div>
        </div>
        <div class="bg-gray-50 rounded-lg p-3"><p class="text-xs text-gray-400 mb-1">Endereço de entrega</p><p class="font-medium">\${e.endereco_logradouro}, \${e.endereco_numero}\${e.endereco_complemento?', '+e.endereco_complemento:''}</p><p class="text-xs text-gray-500">\${e.endereco_bairro?e.endereco_bairro+' — ':''}\${e.endereco_cidade}/\${e.endereco_estado} — CEP \${e.endereco_cep}</p></div>
        <div class="grid grid-cols-2 gap-3">
          <div class="bg-violet-50 rounded-lg p-3"><p class="text-xs text-violet-400 mb-0.5">Frete</p><p class="font-bold text-violet-700">\${fmtMoeda(e.frete_valor)}</p><p class="text-xs text-violet-500">\${e.frete_modalidade}</p></div>
          <div class="bg-gray-50 rounded-lg p-3"><p class="text-xs text-gray-400 mb-0.5">Prazo devolução</p><p class="font-medium">\${e.prazo_dias} dias</p></div>
        </div>
        \${e.codigo_rastreamento?\`<div class="bg-indigo-50 rounded-lg p-3"><p class="text-xs text-indigo-400 mb-0.5">Rastreamento</p><p class="font-mono font-bold text-indigo-700">\${e.codigo_rastreamento}</p></div>\`:''}
        <div class="bg-green-50 rounded-lg p-3"><p class="text-xs text-green-600 mb-0.5">Pagamento via PIX</p><p class="text-xs text-green-700">Confirme o recebimento na sua conta bancária antes de marcar como pago.</p></div>
        <p class="text-xs text-gray-400 text-right">Solicitado em \${fmtData(e.created_at)}</p>
      </div>
    \`;
    openModal('modal-emp-detalhe');
  }catch(e){showToast('Erro ao carregar detalhes','error')}
}

// ─── AUTORES ─────────────────────────────────────────
async function loadAutores(selectOnly=false){
  try{
    const{data}=await axios.get('/api/autores');
    const autores=data.autores||[];
    const el=document.getElementById('livro-autor');
    if(el){const v=el.value;el.innerHTML='<option value="">Selecionar autor</option>'+autores.map(a=>\`<option value="\${a.id}">\${a.nome}</option>\`).join('');el.value=v;}
    if(selectOnly)return;
    const c=document.getElementById('autores-container');
    if(!autores.length){c.innerHTML=\`<div class="col-span-full text-center py-16 text-gray-400"><i class="fas fa-user-pen text-4xl mb-3 opacity-30"></i><p>Nenhum autor cadastrado</p></div>\`;return;}
    c.innerHTML=autores.map(a=>\`
      <div class="bg-white rounded-xl border border-gray-200 p-5 flex items-center gap-4">
        <div class="w-12 h-12 bg-violet-100 rounded-full flex items-center justify-center flex-shrink-0"><span class="font-serif text-violet-600 text-xl font-bold">\${a.nome[0]}</span></div>
        <div class="flex-1 min-w-0"><h3 class="font-semibold text-gray-800 truncate">\${a.nome}</h3><p class="text-sm text-gray-400">\${a.nacionalidade||'Não informada'}</p><p class="text-xs text-violet-500 mt-0.5">\${a.total_livros||0} livro(s)</p></div>
        <div class="flex gap-1">
          \${currentUser?\`<button onclick="editAutor(\${a.id})" class="w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 hover:text-violet-600 hover:bg-violet-50"><i class="fas fa-edit text-xs"></i></button><button onclick="deleteAutor(\${a.id},'\${a.nome.replace(/'/g,'')}')" class="w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50"><i class="fas fa-trash text-xs"></i></button>\`:''}
        </div>
      </div>\`).join('');
  }catch(e){showToast('Erro ao carregar autores','error')}
}

async function editAutor(id){
  try{const{data}=await axios.get('/api/autores/'+id);document.getElementById('autor-id').value=data.id;document.getElementById('autor-nome').value=data.nome;document.getElementById('autor-nacionalidade').value=data.nacionalidade||'';document.getElementById('modal-autor-title').textContent='Editar Autor';openModal('modal-autor');}
  catch(e){showToast('Erro','error')}
}
async function saveAutor(e){
  e.preventDefault();const id=document.getElementById('autor-id').value;
  const payload={nome:document.getElementById('autor-nome').value,nacionalidade:document.getElementById('autor-nacionalidade').value||null};
  try{if(id){await axios.put('/api/autores/'+id,payload);showToast('Autor atualizado!');}else{await axios.post('/api/autores',payload);showToast('Autor cadastrado!');}
  closeModal('modal-autor');document.getElementById('form-autor').reset();document.getElementById('autor-id').value='';document.getElementById('modal-autor-title').textContent='Novo Autor';loadAutores();}
  catch(e){showToast(e.response?.data?.error||'Erro','error')}
}
async function deleteAutor(id,nome){
  if(!confirm('Excluir autor "'+nome+'"?'))return;
  try{await axios.delete('/api/autores/'+id);showToast('Autor excluído!');loadAutores();}
  catch(e){showToast(e.response?.data?.error||'Erro ao excluir','error')}
}

// ─── CATEGORIAS ──────────────────────────────────────
async function loadCategorias(selectOnly=false){
  try{
    const{data}=await axios.get('/api/categorias');const cats=data.categorias||[];
    ['filter-categoria','livro-categoria'].forEach(id=>{const el=document.getElementById(id);if(!el)return;const v=el.value;const prefix=id==='filter-categoria'?'<option value="">Todas as categorias</option>':'<option value="">Selecionar categoria</option>';el.innerHTML=prefix+cats.map(c=>\`<option value="\${c.id}">\${c.nome}</option>\`).join('');el.value=v;});
    if(selectOnly)return;
    const container=document.getElementById('categorias-container');
    const colors=['bg-violet-50 text-violet-700','bg-blue-50 text-blue-700','bg-green-50 text-green-700','bg-amber-50 text-amber-700','bg-red-50 text-red-700','bg-pink-50 text-pink-700'];
    if(!cats.length){container.innerHTML=\`<div class="col-span-full text-center py-16 text-gray-400"><i class="fas fa-tags text-4xl mb-3 opacity-30"></i><p>Nenhuma categoria</p></div>\`;return;}
    container.innerHTML=cats.map((c,i)=>\`
      <div class="bg-white rounded-xl border border-gray-200 p-5">
        <div class="flex items-center justify-between mb-3">
          <span class="text-xs font-bold px-2.5 py-1 rounded-full \${colors[i%colors.length]}">\${c.nome}</span>
          <div class="flex gap-1">
            \${currentUser?\`<button onclick="editCategoria(\${c.id})" class="w-7 h-7 flex items-center justify-center rounded-lg text-gray-400 hover:text-violet-600 hover:bg-violet-50"><i class="fas fa-edit text-xs"></i></button><button onclick="deleteCategoria(\${c.id},'\${c.nome.replace(/'/g,'')}')" class="w-7 h-7 flex items-center justify-center rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50"><i class="fas fa-trash text-xs"></i></button>\`:''}
          </div>
        </div>
        <p class="text-sm text-gray-500">\${c.descricao||'Sem descrição'}</p>
        <p class="text-xs text-violet-500 mt-2">\${c.total_livros||0} livro(s)</p>
      </div>\`).join('');
  }catch(e){showToast('Erro ao carregar categorias','error')}
}
async function editCategoria(id){
  try{const{data}=await axios.get('/api/categorias/'+id);document.getElementById('categoria-id').value=data.id;document.getElementById('categoria-nome').value=data.nome;document.getElementById('categoria-descricao').value=data.descricao||'';document.getElementById('modal-categoria-title').textContent='Editar Categoria';openModal('modal-categoria');}catch(e){}
}
async function saveCategoria(e){
  e.preventDefault();const id=document.getElementById('categoria-id').value;
  const payload={nome:document.getElementById('categoria-nome').value,descricao:document.getElementById('categoria-descricao').value||null};
  try{if(id){await axios.put('/api/categorias/'+id,payload);showToast('Categoria atualizada!');}else{await axios.post('/api/categorias',payload);showToast('Categoria cadastrada!');}
  closeModal('modal-categoria');document.getElementById('form-categoria').reset();document.getElementById('categoria-id').value='';document.getElementById('modal-categoria-title').textContent='Nova Categoria';loadCategorias();}
  catch(e){showToast(e.response?.data?.error||'Erro','error')}
}
async function deleteCategoria(id,nome){
  if(!confirm('Excluir categoria "'+nome+'"?'))return;
  try{await axios.delete('/api/categorias/'+id);showToast('Categoria excluída!');loadCategorias();}
  catch(e){showToast(e.response?.data?.error||'Erro ao excluir','error')}
}

// ─── BUSCA GLOBAL ─────────────────────────────────────
document.getElementById('search-global').addEventListener('input',()=>{clearTimeout(searchTimeout);searchTimeout=setTimeout(loadLivros,350);});

// ─── MASKS — registra direto (DOM já existe ao final do body) ──────────────────
(function(){
  const cepEl=document.getElementById('emp-cep');
  if(cepEl) cepEl.addEventListener('input',function(){maskCEP(this);});
  const cpfEl=document.getElementById('emp-cpf');
  if(cpfEl) cpfEl.addEventListener('input',function(){maskCPF(this);});
})();

// ─── INIT ─────────────────────────────────────────────
async function init(){
  await Promise.all([loadAutores(true),loadCategorias(true)]);
  await Promise.all([loadLivros(),loadBadgeEmprestimos()]);
}
document.addEventListener('DOMContentLoaded', async ()=>{ await checkAuth(); init(); });
</script>
</body>
</html>`))

// ─── MIDDLEWARE AUTO-MIGRATION ─────────────────────────────────────────────────
let dbInitialized = false

app.use('/api/*', async (c, next) => {
  if (!dbInitialized) {
    const { DB } = c.env
    await DB.prepare(`CREATE TABLE IF NOT EXISTS autores (id INTEGER PRIMARY KEY AUTOINCREMENT, nome TEXT NOT NULL, nacionalidade TEXT, created_at DATETIME DEFAULT CURRENT_TIMESTAMP)`).run()
    await DB.prepare(`CREATE TABLE IF NOT EXISTS categorias (id INTEGER PRIMARY KEY AUTOINCREMENT, nome TEXT NOT NULL UNIQUE, descricao TEXT, created_at DATETIME DEFAULT CURRENT_TIMESTAMP)`).run()
    await DB.prepare(`CREATE TABLE IF NOT EXISTS livros (id INTEGER PRIMARY KEY AUTOINCREMENT, titulo TEXT NOT NULL, isbn TEXT UNIQUE, ano_publicacao INTEGER, editora TEXT, paginas INTEGER, sinopse TEXT, capa_url TEXT, status TEXT DEFAULT 'disponivel' CHECK(status IN ('disponivel','emprestado','reservado','indisponivel')), autor_id INTEGER, categoria_id INTEGER, created_at DATETIME DEFAULT CURRENT_TIMESTAMP, updated_at DATETIME DEFAULT CURRENT_TIMESTAMP, FOREIGN KEY (autor_id) REFERENCES autores(id) ON DELETE SET NULL, FOREIGN KEY (categoria_id) REFERENCES categorias(id) ON DELETE SET NULL)`).run()
    await DB.prepare(`CREATE TABLE IF NOT EXISTS emprestimos (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      livro_id INTEGER NOT NULL,
      solicitante_nome TEXT NOT NULL,
      solicitante_email TEXT NOT NULL,
      solicitante_telefone TEXT,
      solicitante_cpf TEXT NOT NULL,
      prazo_dias INTEGER DEFAULT 14,
      endereco_cep TEXT NOT NULL,
      endereco_logradouro TEXT NOT NULL,
      endereco_numero TEXT NOT NULL,
      endereco_complemento TEXT,
      endereco_bairro TEXT,
      endereco_cidade TEXT NOT NULL,
      endereco_estado TEXT NOT NULL,
      frete_valor REAL NOT NULL,
      frete_modalidade TEXT NOT NULL,
      frete_prazo TEXT,
      codigo_boleto TEXT,
      linha_digitavel TEXT,
      codigo_rastreamento TEXT,
      status TEXT DEFAULT 'aguardando_pagamento' CHECK(status IN ('aguardando_pagamento','pago','enviado','entregue','cancelado')),
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (livro_id) REFERENCES livros(id)
    )`).run()
    await DB.prepare(`CREATE TABLE IF NOT EXISTS configuracoes (
      chave TEXT PRIMARY KEY,
      valor TEXT NOT NULL,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`).run()
    await DB.prepare(`CREATE TABLE IF NOT EXISTS usuarios (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nome TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      senha_hash TEXT NOT NULL,
      role TEXT DEFAULT 'admin' CHECK(role IN ('admin')),
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`).run()
    // Seed: admin padrão (senha: admin123) — hash SHA-256 simples
    await DB.prepare(`INSERT OR IGNORE INTO usuarios (nome, email, senha_hash, role)
      VALUES ('Administrador', 'admin@beserra.com', 'admin123_CHANGE_ME', 'admin')`).run()

    // Seed sempre via INSERT OR IGNORE (idempotente)
    const cats = [['Romance','Livros de ficção romântica'],['Ficção Científica','Livros de aventura científica'],['Terror','Livros de suspense e horror'],['Fantasia','Mundos e criaturas fantásticas'],['Biografia','Histórias de vida reais'],['História','Eventos e períodos históricos'],['Autoajuda','Desenvolvimento pessoal'],['Clássico','Obras clássicas da literatura']]
    for (const [n, d] of cats) await DB.prepare('INSERT OR IGNORE INTO categorias (nome,descricao) VALUES (?,?)').bind(n, d).run()
    const autores = [['Machado de Assis','Brasileiro'],['Clarice Lispector','Brasileira'],['J.K. Rowling','Britânica'],['George Orwell','Britânico'],['Gabriel García Márquez','Colombiano'],['Stephen King','Americano'],['J.R.R. Tolkien','Britânico'],['Jorge Amado','Brasileiro']]
    for (const [n, na] of autores) await DB.prepare('INSERT OR IGNORE INTO autores (nome,nacionalidade) VALUES (?,?)').bind(n, na).run()
    const livros = [
      ['Dom Casmurro','978-85-359-0277-5',1899,'Ática',256,'A história de Bentinho e Capitu.','disponivel'],
      ['Memórias Póstumas de Brás Cubas','978-85-359-0278-2',1881,'Ática',288,'O defunto autor narra sua história.','disponivel'],
      ['A Hora da Estrela','978-85-7164-011-4',1977,'Rocco',88,'A história de Macabéa.','disponivel'],
      ['Harry Potter e a Pedra Filosofal','978-85-325-0000-1',1997,'Rocco',264,'Um jovem bruxo descobre seu destino.','disponivel'],
      ['1984','978-85-359-0277-9',1949,'Companhia das Letras',416,'Regime totalitário distópico.','disponivel'],
      ['Cem Anos de Solidão','978-85-359-0279-9',1967,'Record',448,'A saga da família Buendía.','disponivel'],
      ['It - A Coisa','978-85-325-0001-8',1986,'Suma',1104,'Um mal antigo aterroriza Derry.','disponivel'],
      ['O Senhor dos Anéis','978-85-325-0002-5',1954,'Martins Fontes',1200,'A epopeia de Frodo Bolseiro.','disponivel'],
    ]
    // Busca IDs reais dos autores e categorias para o seed
    const authorMap: Record<string,number> = {}
    const catMap: Record<string,number> = {}
    const aRows = await DB.prepare('SELECT id,nome FROM autores').all<{id:number,nome:string}>()
    const cRows = await DB.prepare('SELECT id,nome FROM categorias').all<{id:number,nome:string}>()
    for (const a of aRows.results) authorMap[a.nome] = a.id
    for (const c of cRows.results) catMap[c.nome] = c.id
    const livroSeed = [
      {titulo:'Dom Casmurro',isbn:'978-85-359-0277-5',ano:1899,editora:'Ática',pag:256,sinopse:'A história de Bentinho e Capitu.',status:'disponivel',autor:'Machado de Assis',cat:'Romance'},
      {titulo:'Memórias Póstumas de Brás Cubas',isbn:'978-85-359-0278-2',ano:1881,editora:'Ática',pag:288,sinopse:'O defunto autor narra sua história.',status:'disponivel',autor:'Machado de Assis',cat:'Clássico'},
      {titulo:'A Hora da Estrela',isbn:'978-85-7164-011-4',ano:1977,editora:'Rocco',pag:88,sinopse:'A história de Macabéa.',status:'disponivel',autor:'Clarice Lispector',cat:'Romance'},
      {titulo:'Harry Potter e a Pedra Filosofal',isbn:'978-85-325-0000-1',ano:1997,editora:'Rocco',pag:264,sinopse:'Um jovem bruxo descobre seu destino.',status:'disponivel',autor:'J.K. Rowling',cat:'Fantasia'},
      {titulo:'1984',isbn:'978-85-359-0277-9',ano:1949,editora:'Companhia das Letras',pag:416,sinopse:'Regime totalitário distópico.',status:'disponivel',autor:'George Orwell',cat:'Ficção Científica'},
      {titulo:'Cem Anos de Solidão',isbn:'978-85-359-0279-9',ano:1967,editora:'Record',pag:448,sinopse:'A saga da família Buendía.',status:'disponivel',autor:'Gabriel García Márquez',cat:'Romance'},
      {titulo:'It - A Coisa',isbn:'978-85-325-0001-8',ano:1986,editora:'Suma',pag:1104,sinopse:'Um mal antigo aterroriza Derry.',status:'disponivel',autor:'Stephen King',cat:'Terror'},
      {titulo:'O Senhor dos Anéis',isbn:'978-85-325-0002-5',ano:1954,editora:'Martins Fontes',pag:1200,sinopse:'A epopeia de Frodo Bolseiro.',status:'disponivel',autor:'J.R.R. Tolkien',cat:'Fantasia'},
    ]
    for (const l of livroSeed) {
      const aid = authorMap[l.autor] || null
      const cid = catMap[l.cat] || null
      await DB.prepare('INSERT OR IGNORE INTO livros (titulo,isbn,ano_publicacao,editora,paginas,sinopse,status,autor_id,categoria_id) VALUES (?,?,?,?,?,?,?,?,?)').bind(l.titulo,l.isbn,l.ano,l.editora,l.pag,l.sinopse,l.status,aid,cid).run()
    }
    dbInitialized = true
  }
  await next()
})

// ─── HELPER: gerar código de boleto simulado ──────────────────────────────────
function gerarCodigoBoleto(id: number, valor: number): { codigo: string, linha: string } {
  const ts = Date.now().toString().slice(-8)
  const idStr = String(id).padStart(6, '0')
  const valStr = Math.round(valor * 100).toString().padStart(10, '0')
  const codigo = `0379${idStr}${ts}${valStr}0`
  // Linha digitável formatada: xxxxx.xxxxx xxxxx.xxxxxx xxxxx.xxxxxx x xxxxxxxxxxxxxxx
  const c = codigo.padEnd(47, '0')
  const linha = `${c.slice(0,5)}.${c.slice(5,10)} ${c.slice(10,15)}.${c.slice(15,21)} ${c.slice(21,26)}.${c.slice(26,32)} ${c.slice(32,33)} ${c.slice(33,47)}`
  return { codigo, linha }
}

// ─── HELPER: calcular frete por CEP ──────────────────────────────────────────
function calcularFretePorCEP(cep: string): Array<{nome: string, codigo: string, preco: number, prazo: string}> {
  const num = parseInt(cep.replace(/\D/g, '').slice(0, 5))
  // Faixas de CEP por região do Brasil para simular valores reais dos Correios
  let regiao = 'sudeste'
  if (num >= 1000 && num <= 19999) regiao = 'sp_capital'
  else if (num >= 20000 && num <= 28999) regiao = 'rj'
  else if (num >= 29000 && num <= 29999) regiao = 'es'
  else if (num >= 30000 && num <= 39999) regiao = 'mg'
  else if (num >= 40000 && num <= 48999) regiao = 'ba'
  else if (num >= 49000 && num <= 49999) regiao = 'se'
  else if (num >= 50000 && num <= 56999) regiao = 'pe'
  else if (num >= 57000 && num <= 57999) regiao = 'al'
  else if (num >= 58000 && num <= 58999) regiao = 'pb'
  else if (num >= 59000 && num <= 59999) regiao = 'rn'
  else if (num >= 60000 && num <= 63999) regiao = 'ce'
  else if (num >= 64000 && num <= 64999) regiao = 'pi'
  else if (num >= 65000 && num <= 65999) regiao = 'ma'
  else if (num >= 66000 && num <= 68899) regiao = 'pa'
  else if (num >= 68900 && num <= 68999) regiao = 'ap'
  else if (num >= 69000 && num <= 69299) regiao = 'am'
  else if (num >= 69300 && num <= 69399) regiao = 'rr'
  else if (num >= 69400 && num <= 69899) regiao = 'am'
  else if (num >= 69900 && num <= 69999) regiao = 'ac'
  else if (num >= 70000 && num <= 73699) regiao = 'df'
  else if (num >= 73700 && num <= 76799) regiao = 'go'
  else if (num >= 76800 && num <= 76999) regiao = 'ro'
  else if (num >= 77000 && num <= 77999) regiao = 'to'
  else if (num >= 78000 && num <= 78899) regiao = 'mt'
  else if (num >= 78900 && num <= 78999) regiao = 'ms_mt'
  else if (num >= 79000 && num <= 79999) regiao = 'ms'
  else if (num >= 80000 && num <= 87999) regiao = 'pr'
  else if (num >= 88000 && num <= 89999) regiao = 'sc'
  else if (num >= 90000 && num <= 99999) regiao = 'rs'

  // Tabela de preços por modalidade e região (valores próximos aos dos Correios para livros ~400g)
  const tabela: Record<string, {pac: number, sedex: number, sedex10: number, pac_prazo: string, sedex_prazo: string, sedex10_prazo: string}> = {
    sp_capital: {pac: 14.90, sedex: 22.50, sedex10: 38.00, pac_prazo: '3 a 5 dias úteis', sedex_prazo: '1 dia útil', sedex10_prazo: 'Até às 10h do próximo dia útil'},
    rj:         {pac: 17.80, sedex: 25.30, sedex10: 42.00, pac_prazo: '4 a 6 dias úteis', sedex_prazo: '1 dia útil', sedex10_prazo: 'Até às 10h do próximo dia útil'},
    es:         {pac: 19.20, sedex: 27.90, sedex10: 45.00, pac_prazo: '4 a 7 dias úteis', sedex_prazo: '2 dias úteis', sedex10_prazo: 'Até às 10h do 2º dia útil'},
    mg:         {pac: 18.50, sedex: 26.70, sedex10: 44.00, pac_prazo: '4 a 6 dias úteis', sedex_prazo: '1 a 2 dias úteis', sedex10_prazo: 'Até às 10h do 2º dia útil'},
    ba:         {pac: 21.40, sedex: 31.80, sedex10: 52.00, pac_prazo: '5 a 8 dias úteis', sedex_prazo: '2 dias úteis', sedex10_prazo: 'Até às 10h do 2º dia útil'},
    se:         {pac: 22.00, sedex: 32.50, sedex10: 53.00, pac_prazo: '6 a 9 dias úteis', sedex_prazo: '2 dias úteis', sedex10_prazo: 'Até às 10h do 2º dia útil'},
    pe:         {pac: 22.50, sedex: 33.20, sedex10: 54.00, pac_prazo: '6 a 9 dias úteis', sedex_prazo: '2 dias úteis', sedex10_prazo: 'Até às 10h do 2º dia útil'},
    al:         {pac: 22.80, sedex: 33.60, sedex10: 55.00, pac_prazo: '6 a 9 dias úteis', sedex_prazo: '2 a 3 dias úteis', sedex10_prazo: 'Até às 10h do 3º dia útil'},
    pb:         {pac: 23.00, sedex: 34.00, sedex10: 56.00, pac_prazo: '6 a 10 dias úteis', sedex_prazo: '2 a 3 dias úteis', sedex10_prazo: 'Até às 10h do 3º dia útil'},
    rn:         {pac: 23.20, sedex: 34.30, sedex10: 57.00, pac_prazo: '6 a 10 dias úteis', sedex_prazo: '2 a 3 dias úteis', sedex10_prazo: 'Até às 10h do 3º dia útil'},
    ce:         {pac: 23.50, sedex: 35.00, sedex10: 58.00, pac_prazo: '7 a 10 dias úteis', sedex_prazo: '2 a 3 dias úteis', sedex10_prazo: 'Até às 10h do 3º dia útil'},
    pi:         {pac: 24.00, sedex: 36.00, sedex10: 60.00, pac_prazo: '7 a 11 dias úteis', sedex_prazo: '3 dias úteis', sedex10_prazo: 'Até às 10h do 3º dia útil'},
    ma:         {pac: 24.50, sedex: 37.00, sedex10: 62.00, pac_prazo: '7 a 11 dias úteis', sedex_prazo: '3 dias úteis', sedex10_prazo: 'Até às 10h do 3º dia útil'},
    pa:         {pac: 26.50, sedex: 39.80, sedex10: 67.00, pac_prazo: '8 a 12 dias úteis', sedex_prazo: '3 a 4 dias úteis', sedex10_prazo: 'Até às 10h do 4º dia útil'},
    ap:         {pac: 28.00, sedex: 42.00, sedex10: 70.00, pac_prazo: '9 a 14 dias úteis', sedex_prazo: '4 dias úteis', sedex10_prazo: 'Até às 10h do 4º dia útil'},
    am:         {pac: 29.00, sedex: 44.00, sedex10: 73.00, pac_prazo: '9 a 14 dias úteis', sedex_prazo: '4 a 5 dias úteis', sedex10_prazo: 'Até às 10h do 5º dia útil'},
    rr:         {pac: 30.00, sedex: 46.00, sedex10: 75.00, pac_prazo: '10 a 15 dias úteis', sedex_prazo: '5 dias úteis', sedex10_prazo: 'Até às 10h do 5º dia útil'},
    ac:         {pac: 31.00, sedex: 48.00, sedex10: 78.00, pac_prazo: '10 a 15 dias úteis', sedex_prazo: '5 dias úteis', sedex10_prazo: 'Até às 10h do 5º dia útil'},
    df:         {pac: 20.50, sedex: 29.80, sedex10: 49.00, pac_prazo: '5 a 7 dias úteis', sedex_prazo: '2 dias úteis', sedex10_prazo: 'Até às 10h do 2º dia útil'},
    go:         {pac: 21.00, sedex: 30.50, sedex10: 50.00, pac_prazo: '5 a 8 dias úteis', sedex_prazo: '2 dias úteis', sedex10_prazo: 'Até às 10h do 2º dia útil'},
    ro:         {pac: 27.00, sedex: 41.00, sedex10: 68.00, pac_prazo: '8 a 13 dias úteis', sedex_prazo: '4 dias úteis', sedex10_prazo: 'Até às 10h do 4º dia útil'},
    to:         {pac: 23.80, sedex: 36.50, sedex10: 61.00, pac_prazo: '7 a 11 dias úteis', sedex_prazo: '3 dias úteis', sedex10_prazo: 'Até às 10h do 3º dia útil'},
    mt:         {pac: 24.50, sedex: 37.50, sedex10: 63.00, pac_prazo: '7 a 11 dias úteis', sedex_prazo: '3 dias úteis', sedex10_prazo: 'Até às 10h do 3º dia útil'},
    ms_mt:      {pac: 24.00, sedex: 36.80, sedex10: 62.00, pac_prazo: '7 a 11 dias úteis', sedex_prazo: '3 dias úteis', sedex10_prazo: 'Até às 10h do 3º dia útil'},
    ms:         {pac: 22.50, sedex: 34.00, sedex10: 57.00, pac_prazo: '6 a 9 dias úteis', sedex_prazo: '2 a 3 dias úteis', sedex10_prazo: 'Até às 10h do 3º dia útil'},
    pr:         {pac: 18.90, sedex: 27.50, sedex10: 45.00, pac_prazo: '4 a 7 dias úteis', sedex_prazo: '2 dias úteis', sedex10_prazo: 'Até às 10h do 2º dia útil'},
    sc:         {pac: 19.50, sedex: 28.50, sedex10: 47.00, pac_prazo: '4 a 7 dias úteis', sedex_prazo: '2 dias úteis', sedex10_prazo: 'Até às 10h do 2º dia útil'},
    rs:         {pac: 20.00, sedex: 29.00, sedex10: 48.00, pac_prazo: '5 a 7 dias úteis', sedex_prazo: '2 dias úteis', sedex10_prazo: 'Até às 10h do 2º dia útil'},
    sudeste:    {pac: 18.00, sedex: 26.00, sedex10: 43.00, pac_prazo: '4 a 6 dias úteis', sedex_prazo: '1 a 2 dias úteis', sedex10_prazo: 'Até às 10h do 2º dia útil'},
  }

  const t = tabela[regiao] || tabela['sudeste']
  return [
    { nome: 'PAC', codigo: '04510', preco: t.pac, prazo: t.pac_prazo },
    { nome: 'SEDEX', codigo: '04014', preco: t.sedex, prazo: t.sedex_prazo },
    { nome: 'SEDEX 10', codigo: '40215', preco: t.sedex10, prazo: t.sedex10_prazo },
  ]
}

// ─── AUTH HELPERS ─────────────────────────────────────────────────────────────
const JWT_SECRET = 'beserra-library-secret-2024'

async function hashSenha(senha: string): Promise<string> {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(senha + JWT_SECRET))
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2,'0')).join('')
}

async function gerarToken(payload: Record<string, unknown>): Promise<string> {
  const header  = btoa(JSON.stringify({ alg: 'HS256', typ: 'JWT' }))
  const body    = btoa(JSON.stringify({ ...payload, iat: Date.now() }))
  const sig     = await crypto.subtle.digest('SHA-256',
    new TextEncoder().encode(`${header}.${body}.${JWT_SECRET}`))
  const sigHex  = Array.from(new Uint8Array(sig)).map(b => b.toString(16).padStart(2,'0')).join('')
  return `${header}.${body}.${sigHex}`
}

function verificarToken(token: string): Record<string, any> | null {
  try {
    const parts = token.split('.')
    if (parts.length !== 3) return null
    const payload = JSON.parse(atob(parts[1]))
    // token válido por 12h
    if (Date.now() - payload.iat > 12 * 60 * 60 * 1000) return null
    return payload
  } catch { return null }
}

function getTokenFromRequest(c: any): string | null {
  // Cookie httpOnly
  const cookieHeader = c.req.header('Cookie') || ''
  const match = cookieHeader.match(/bl_token=([^;]+)/)
  if (match) return match[1]
  // Authorization Bearer (fallback para chamadas diretas)
  const auth = c.req.header('Authorization') || ''
  if (auth.startsWith('Bearer ')) return auth.slice(7)
  return null
}

async function requireAdmin(c: any, next: any) {
  const token = getTokenFromRequest(c)
  if (!token) return c.json({ error: 'Não autorizado. Faça login.' }, 401)
  const payload = verificarToken(token)
  if (!payload) return c.json({ error: 'Sessão expirada. Faça login novamente.' }, 401)
  c.set('adminUser', payload)
  await next()
}

// ─── API AUTH ─────────────────────────────────────────────────────────────────
app.post('/api/auth/login', async (c) => {
  const { DB } = c.env
  const { email, senha } = await c.req.json() as { email: string, senha: string }
  if (!email || !senha) return c.json({ error: 'E-mail e senha são obrigatórios' }, 400)

  const user = await DB.prepare('SELECT * FROM usuarios WHERE email=?')
    .bind(email.toLowerCase().trim()).first<any>()
  if (!user) return c.json({ error: 'E-mail ou senha incorretos' }, 401)

  // Suporta senha em texto puro (primeira vez) e hash
  const hash = await hashSenha(senha)
  const senhaOk = user.senha_hash === hash || user.senha_hash === senha
  if (!senhaOk) return c.json({ error: 'E-mail ou senha incorretos' }, 401)

  // Se estava em texto puro, atualiza para hash
  if (user.senha_hash === senha) {
    await DB.prepare('UPDATE usuarios SET senha_hash=? WHERE id=?').bind(hash, user.id).run()
  }

  const token = await gerarToken({ id: user.id, nome: user.nome, email: user.email, role: user.role })

  // Define cookie httpOnly com 12h de expiração
  c.header('Set-Cookie',
    `bl_token=${token}; HttpOnly; SameSite=Strict; Path=/; Max-Age=43200`)
  return c.json({ ok: true, user: { id: user.id, nome: user.nome, email: user.email, role: user.role } })
})

app.post('/api/auth/logout', (c) => {
  c.header('Set-Cookie', 'bl_token=; HttpOnly; SameSite=Strict; Path=/; Max-Age=0')
  return c.json({ ok: true })
})

app.get('/api/auth/me', (c) => {
  const token = getTokenFromRequest(c)
  if (!token) return c.json({ authenticated: false })
  const payload = verificarToken(token)
  if (!payload) return c.json({ authenticated: false })
  return c.json({ authenticated: true, user: { id: payload.id, nome: payload.nome, email: payload.email, role: payload.role } })
})

app.put('/api/auth/senha', async (c) => {
  const token = getTokenFromRequest(c)
  if (!token) return c.json({ error: 'Não autorizado' }, 401)
  const payload = verificarToken(token)
  if (!payload) return c.json({ error: 'Sessão expirada' }, 401)
  const { DB } = c.env
  const { senha_atual, senha_nova } = await c.req.json() as any
  if (!senha_atual || !senha_nova) return c.json({ error: 'Informe a senha atual e a nova senha' }, 400)
  if (senha_nova.length < 6) return c.json({ error: 'Nova senha deve ter pelo menos 6 caracteres' }, 400)
  const user = await DB.prepare('SELECT * FROM usuarios WHERE id=?').bind(payload.id).first<any>()
  if (!user) return c.json({ error: 'Usuário não encontrado' }, 404)
  const hashAtual = await hashSenha(senha_atual)
  if (user.senha_hash !== hashAtual && user.senha_hash !== senha_atual)
    return c.json({ error: 'Senha atual incorreta' }, 401)
  const hashNova = await hashSenha(senha_nova)
  await DB.prepare('UPDATE usuarios SET senha_hash=? WHERE id=?').bind(hashNova, payload.id).run()
  return c.json({ ok: true })
})

// ─── API FRETE ────────────────────────────────────────────────────────────────
app.get('/api/frete', (c) => {
  const cep = c.req.query('cep') || ''
  if (!cep || cep.replace(/\D/g,'').length !== 8) return c.json({ error: 'CEP inválido' }, 400)
  const opcoes = calcularFretePorCEP(cep)
  return c.json({ cep, opcoes })
})

// ─── API CEP (proxy ViaCEP — evita CORS no cliente) ──────────────────────────
app.get('/api/cep/:cep', async (c) => {
  const cep = c.req.param('cep').replace(/\D/g, '')
  if (cep.length !== 8) return c.json({ error: 'CEP inválido' }, 400)
  try {
    const res = await fetch(`https://viacep.com.br/ws/${cep}/json/`)
    const data = await res.json() as any
    if (data.erro) return c.json({ error: 'CEP não encontrado' }, 404)
    return c.json(data)
  } catch (e) {
    return c.json({ error: 'Erro ao consultar CEP' }, 500)
  }
})

// ─── API EMPRÉSTIMOS ──────────────────────────────────────────────────────────
app.get('/api/emprestimos', async (c) => {
  const { DB } = c.env
  const status = c.req.query('status') || ''
  let q = `SELECT e.*, l.titulo as livro_titulo FROM emprestimos e LEFT JOIN livros l ON e.livro_id=l.id WHERE 1=1`
  const params: string[] = []
  if (status) { q += ` AND e.status=?`; params.push(status) }
  q += ` ORDER BY e.created_at DESC`
  const result = await DB.prepare(q).bind(...params).all()
  const pendentes = await DB.prepare(`SELECT COUNT(*) as n FROM emprestimos WHERE status='aguardando_pagamento'`).first<{n:number}>()
  return c.json({ emprestimos: result.results, pendentes: pendentes?.n || 0 })
})

app.get('/api/emprestimos/:id', async (c) => {
  const { DB } = c.env
  const emp = await DB.prepare(`SELECT e.*, l.titulo as livro_titulo FROM emprestimos e LEFT JOIN livros l ON e.livro_id=l.id WHERE e.id=?`).bind(c.req.param('id')).first()
  if (!emp) return c.json({ error: 'Empréstimo não encontrado' }, 404)
  return c.json(emp)
})

// empréstimos: criação é pública (qualquer um pode pedir), gestão exige admin
app.post('/api/emprestimos', async (c) => {
  const { DB } = c.env
  const body = await c.req.json()
  const { livro_id, solicitante_nome, solicitante_email, solicitante_cpf, solicitante_telefone, prazo_dias, endereco_cep, endereco_logradouro, endereco_numero, endereco_complemento, endereco_bairro, endereco_cidade, endereco_estado, frete_valor, frete_modalidade, frete_prazo } = body

  if (!livro_id || !solicitante_nome || !solicitante_email || !solicitante_cpf) return c.json({ error: 'Dados obrigatórios faltando' }, 400)

  // Verifica se o livro está disponível
  const livro = await DB.prepare('SELECT * FROM livros WHERE id=?').bind(livro_id).first<{status: string, titulo: string}>()
  if (!livro) return c.json({ error: 'Livro não encontrado' }, 404)
  if (livro.status !== 'disponivel') return c.json({ error: 'Livro não está disponível para empréstimo' }, 409)

  // Cria o empréstimo
  const result = await DB.prepare(`
    INSERT INTO emprestimos (livro_id,solicitante_nome,solicitante_email,solicitante_cpf,solicitante_telefone,prazo_dias,endereco_cep,endereco_logradouro,endereco_numero,endereco_complemento,endereco_bairro,endereco_cidade,endereco_estado,frete_valor,frete_modalidade,frete_prazo,status)
    VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,'aguardando_pagamento')
  `).bind(livro_id, solicitante_nome, solicitante_email, solicitante_cpf, solicitante_telefone||null, prazo_dias||14, endereco_cep, endereco_logradouro, endereco_numero, endereco_complemento||null, endereco_bairro||null, endereco_cidade, endereco_estado, frete_valor, frete_modalidade, frete_prazo||null).run()

  const newId = result.meta.last_row_id as number

  // Gera boleto simulado
  const { codigo, linha } = gerarCodigoBoleto(newId, frete_valor)
  await DB.prepare('UPDATE emprestimos SET codigo_boleto=?, linha_digitavel=? WHERE id=?').bind(codigo, linha, newId).run()

  // Reserva o livro
  await DB.prepare("UPDATE livros SET status='reservado', updated_at=CURRENT_TIMESTAMP WHERE id=?").bind(livro_id).run()

  return c.json({
    id: newId,
    livro_titulo: livro.titulo,
    solicitante_nome,
    solicitante_cpf,
    frete_valor,
    frete_modalidade,
    prazo_dias: prazo_dias || 14,
    codigo_boleto: codigo,
    linha_digitavel: linha,
    status: 'aguardando_pagamento'
  }, 201)
})

app.patch('/api/emprestimos/:id/status', requireAdmin, async (c) => {
  const { DB } = c.env
  const id = c.req.param('id')
  const { status, rastreamento } = await c.req.json()
  const validStatus = ['aguardando_pagamento','pago','enviado','entregue','cancelado']
  if (!validStatus.includes(status)) return c.json({ error: 'Status inválido' }, 400)

  const emp = await DB.prepare('SELECT * FROM emprestimos WHERE id=?').bind(id).first<{livro_id: number, status: string}>()
  if (!emp) return c.json({ error: 'Empréstimo não encontrado' }, 404)

  // Atualiza rastreamento se fornecido
  if (rastreamento) await DB.prepare('UPDATE emprestimos SET codigo_rastreamento=? WHERE id=?').bind(rastreamento, id).run()
  await DB.prepare('UPDATE emprestimos SET status=?, updated_at=CURRENT_TIMESTAMP WHERE id=?').bind(status, id).run()

  // Atualiza status do livro conforme fluxo
  if (status === 'pago') await DB.prepare("UPDATE livros SET status='emprestado', updated_at=CURRENT_TIMESTAMP WHERE id=?").bind(emp.livro_id).run()
  if (status === 'entregue') await DB.prepare("UPDATE livros SET status='emprestado', updated_at=CURRENT_TIMESTAMP WHERE id=?").bind(emp.livro_id).run()
  if (status === 'cancelado') await DB.prepare("UPDATE livros SET status='disponivel', updated_at=CURRENT_TIMESTAMP WHERE id=?").bind(emp.livro_id).run()

  return c.json({ message: 'Status atualizado', status })
})

// ─── API LIVROS ────────────────────────────────────────────────────────────────
app.get('/api/livros', async (c) => {
  const { DB } = c.env
  const { q, status, categoria_id } = c.req.query()
  let query = `SELECT l.*, a.nome as autor_nome, cat.nome as categoria_nome FROM livros l LEFT JOIN autores a ON l.autor_id=a.id LEFT JOIN categorias cat ON l.categoria_id=cat.id WHERE 1=1`
  const params: (string|number)[] = []
  if (q) { query += ` AND (l.titulo LIKE ? OR a.nome LIKE ? OR l.editora LIKE ?)`; params.push(`%${q}%`,`%${q}%`,`%${q}%`) }
  if (status) { query += ` AND l.status=?`; params.push(status) }
  if (categoria_id) { query += ` AND l.categoria_id=?`; params.push(parseInt(categoria_id)) }
  query += ` ORDER BY l.created_at DESC`
  const livros = await DB.prepare(query).bind(...params).all()
  const stats = await DB.prepare(`SELECT COUNT(*) as total, SUM(CASE WHEN status='disponivel' THEN 1 ELSE 0 END) as disponiveis, SUM(CASE WHEN status='emprestado' THEN 1 ELSE 0 END) as emprestados, SUM(CASE WHEN status='reservado' THEN 1 ELSE 0 END) as reservados FROM livros`).first()
  return c.json({ livros: livros.results, stats })
})

app.get('/api/livros/:id', async (c) => {
  const { DB } = c.env
  const livro = await DB.prepare(`SELECT l.*, a.nome as autor_nome, cat.nome as categoria_nome FROM livros l LEFT JOIN autores a ON l.autor_id=a.id LEFT JOIN categorias cat ON l.categoria_id=cat.id WHERE l.id=?`).bind(c.req.param('id')).first()
  if (!livro) return c.json({ error: 'Livro não encontrado' }, 404)
  return c.json(livro)
})

app.post('/api/livros', requireAdmin, async (c) => {
  const { DB } = c.env
  const body = await c.req.json()
  const { titulo, isbn, ano_publicacao, editora, paginas, sinopse, capa_url, status, autor_id, categoria_id } = body
  if (!titulo) return c.json({ error: 'Título é obrigatório' }, 400)
  try {
    const result = await DB.prepare(`INSERT INTO livros (titulo,isbn,ano_publicacao,editora,paginas,sinopse,capa_url,status,autor_id,categoria_id) VALUES (?,?,?,?,?,?,?,?,?,?)`).bind(titulo,isbn||null,ano_publicacao||null,editora||null,paginas||null,sinopse||null,capa_url||null,status||'disponivel',autor_id||null,categoria_id||null).run()
    return c.json({ id: result.meta.last_row_id }, 201)
  } catch (e: any) {
    if (e.message?.includes('UNIQUE')) return c.json({ error: 'ISBN já cadastrado' }, 409)
    return c.json({ error: 'Erro ao criar livro' }, 500)
  }
})

app.put('/api/livros/:id', requireAdmin, async (c) => {
  const { DB } = c.env
  const body = await c.req.json()
  const { titulo, isbn, ano_publicacao, editora, paginas, sinopse, capa_url, status, autor_id, categoria_id } = body
  if (!titulo) return c.json({ error: 'Título é obrigatório' }, 400)
  try {
    await DB.prepare(`UPDATE livros SET titulo=?,isbn=?,ano_publicacao=?,editora=?,paginas=?,sinopse=?,capa_url=?,status=?,autor_id=?,categoria_id=?,updated_at=CURRENT_TIMESTAMP WHERE id=?`).bind(titulo,isbn||null,ano_publicacao||null,editora||null,paginas||null,sinopse||null,capa_url||null,status||'disponivel',autor_id||null,categoria_id||null,c.req.param('id')).run()
    return c.json({ message: 'Atualizado' })
  } catch (e: any) {
    if (e.message?.includes('UNIQUE')) return c.json({ error: 'ISBN já cadastrado' }, 409)
    return c.json({ error: 'Erro' }, 500)
  }
})

app.delete('/api/livros/:id', requireAdmin, async (c) => {
  const { DB } = c.env
  await DB.prepare('DELETE FROM livros WHERE id=?').bind(c.req.param('id')).run()
  return c.json({ message: 'Excluído' })
})

// ─── API AUTORES ──────────────────────────────────────────────────────────────
app.get('/api/autores', async (c) => {
  const { DB } = c.env
  const r = await DB.prepare(`SELECT a.*, COUNT(l.id) as total_livros FROM autores a LEFT JOIN livros l ON l.autor_id=a.id GROUP BY a.id ORDER BY a.nome`).all()
  return c.json({ autores: r.results })
})
app.get('/api/autores/:id', async (c) => {
  const { DB } = c.env
  const a = await DB.prepare('SELECT * FROM autores WHERE id=?').bind(c.req.param('id')).first()
  if (!a) return c.json({ error: 'Não encontrado' }, 404)
  return c.json(a)
})
app.post('/api/autores', requireAdmin, async (c) => {
  const { DB } = c.env
  const { nome, nacionalidade } = await c.req.json()
  if (!nome) return c.json({ error: 'Nome obrigatório' }, 400)
  const r = await DB.prepare('INSERT INTO autores (nome,nacionalidade) VALUES (?,?)').bind(nome, nacionalidade||null).run()
  return c.json({ id: r.meta.last_row_id }, 201)
})
app.put('/api/autores/:id', requireAdmin, async (c) => {
  const { DB } = c.env
  const { nome, nacionalidade } = await c.req.json()
  if (!nome) return c.json({ error: 'Nome obrigatório' }, 400)
  await DB.prepare('UPDATE autores SET nome=?,nacionalidade=? WHERE id=?').bind(nome, nacionalidade||null, c.req.param('id')).run()
  return c.json({ message: 'Atualizado' })
})
app.delete('/api/autores/:id', requireAdmin, async (c) => {
  const { DB } = c.env
  const u = await DB.prepare('SELECT COUNT(*) as n FROM livros WHERE autor_id=?').bind(c.req.param('id')).first<{n:number}>()
  if (u && u.n > 0) return c.json({ error: 'Autor possui livros. Remova-os primeiro.' }, 409)
  await DB.prepare('DELETE FROM autores WHERE id=?').bind(c.req.param('id')).run()
  return c.json({ message: 'Excluído' })
})

// ─── API CATEGORIAS ───────────────────────────────────────────────────────────
app.get('/api/categorias', async (c) => {
  const { DB } = c.env
  const r = await DB.prepare(`SELECT cat.*, COUNT(l.id) as total_livros FROM categorias cat LEFT JOIN livros l ON l.categoria_id=cat.id GROUP BY cat.id ORDER BY cat.nome`).all()
  return c.json({ categorias: r.results })
})
app.get('/api/categorias/:id', async (c) => {
  const { DB } = c.env
  const cat = await DB.prepare('SELECT * FROM categorias WHERE id=?').bind(c.req.param('id')).first()
  if (!cat) return c.json({ error: 'Não encontrado' }, 404)
  return c.json(cat)
})
app.post('/api/categorias', requireAdmin, async (c) => {
  const { DB } = c.env
  const { nome, descricao } = await c.req.json()
  if (!nome) return c.json({ error: 'Nome obrigatório' }, 400)
  try {
    const r = await DB.prepare('INSERT INTO categorias (nome,descricao) VALUES (?,?)').bind(nome, descricao||null).run()
    return c.json({ id: r.meta.last_row_id }, 201)
  } catch (e: any) {
    if (e.message?.includes('UNIQUE')) return c.json({ error: 'Categoria já existe' }, 409)
    return c.json({ error: 'Erro' }, 500)
  }
})
app.put('/api/categorias/:id', requireAdmin, async (c) => {
  const { DB } = c.env
  const { nome, descricao } = await c.req.json()
  if (!nome) return c.json({ error: 'Nome obrigatório' }, 400)
  await DB.prepare('UPDATE categorias SET nome=?,descricao=? WHERE id=?').bind(nome, descricao||null, c.req.param('id')).run()
  return c.json({ message: 'Atualizado' })
})
app.delete('/api/categorias/:id', requireAdmin, async (c) => {
  const { DB } = c.env
  const u = await DB.prepare('SELECT COUNT(*) as n FROM livros WHERE categoria_id=?').bind(c.req.param('id')).first<{n:number}>()
  if (u && u.n > 0) return c.json({ error: 'Categoria possui livros. Remova-os primeiro.' }, 409)
  await DB.prepare('DELETE FROM categorias WHERE id=?').bind(c.req.param('id')).run()
  return c.json({ message: 'Excluído' })
})

// ─── API CONFIGURAÇÕES ADMIN ──────────────────────────────────────────────────
app.get('/api/admin/config', requireAdmin, async (c) => {
  const { DB } = c.env
  const rows = await DB.prepare('SELECT chave, valor FROM configuracoes').all<{chave:string, valor:string}>()
  const config: Record<string,string> = {}
  for (const r of rows.results) config[r.chave] = r.valor
  return c.json(config)
})

app.put('/api/admin/config', requireAdmin, async (c) => {
  const { DB } = c.env
  const body = await c.req.json() as Record<string,string>
  for (const [chave, valor] of Object.entries(body)) {
    await DB.prepare(`
      INSERT INTO configuracoes (chave, valor, updated_at) VALUES (?, ?, CURRENT_TIMESTAMP)
      ON CONFLICT(chave) DO UPDATE SET valor=excluded.valor, updated_at=excluded.updated_at
    `).bind(chave, String(valor)).run()
  }
  return c.json({ message: 'Configurações salvas' })
})

export default app
