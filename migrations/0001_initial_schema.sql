-- Tabela de autores
CREATE TABLE IF NOT EXISTS autores (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  nome TEXT NOT NULL,
  nacionalidade TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Tabela de categorias
CREATE TABLE IF NOT EXISTS categorias (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  nome TEXT NOT NULL UNIQUE,
  descricao TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Tabela de livros
CREATE TABLE IF NOT EXISTS livros (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  titulo TEXT NOT NULL,
  isbn TEXT UNIQUE,
  ano_publicacao INTEGER,
  editora TEXT,
  paginas INTEGER,
  sinopse TEXT,
  capa_url TEXT,
  status TEXT DEFAULT 'disponivel' CHECK(status IN ('disponivel', 'emprestado', 'reservado', 'indisponivel')),
  autor_id INTEGER,
  categoria_id INTEGER,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (autor_id) REFERENCES autores(id) ON DELETE SET NULL,
  FOREIGN KEY (categoria_id) REFERENCES categorias(id) ON DELETE SET NULL
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_livros_titulo ON livros(titulo);
CREATE INDEX IF NOT EXISTS idx_livros_autor ON livros(autor_id);
CREATE INDEX IF NOT EXISTS idx_livros_categoria ON livros(categoria_id);
CREATE INDEX IF NOT EXISTS idx_livros_status ON livros(status);
CREATE INDEX IF NOT EXISTS idx_autores_nome ON autores(nome);
