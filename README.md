# 📚 Biblioteca Digital

Sistema de gerenciamento de acervo de livros com cadastro completo de livros, autores e categorias.

## Funcionalidades Implementadas

### Livros
- ✅ Listagem com grid e modo lista
- ✅ Busca por título, autor ou editora (tempo real)
- ✅ Filtro por status (disponível, emprestado, reservado, indisponível)
- ✅ Filtro por categoria
- ✅ Cadastro de livros com: título, ISBN, ano, editora, páginas, sinopse, capa (URL), status, autor e categoria
- ✅ Editar livros
- ✅ Excluir livros
- ✅ Visualizar detalhes completos em modal

### Autores
- ✅ Listagem de autores com contagem de livros
- ✅ Cadastro, edição e exclusão de autores
- ✅ Proteção contra exclusão se autor tem livros cadastrados

### Categorias
- ✅ Listagem de categorias com contagem de livros
- ✅ Cadastro, edição e exclusão de categorias
- ✅ Proteção contra exclusão se categoria tem livros

### Interface
- ✅ Design moderno com Tailwind CSS
- ✅ Notificações toast (feedback de ações)
- ✅ Sidebar com estatísticas (total, disponíveis, emprestados)
- ✅ Banco de dados populado automaticamente com 8 livros clássicos
- ✅ Totalmente responsivo

## Endpoints da API

### Livros
| Método | Rota | Descrição |
|--------|------|-----------|
| GET | `/api/livros` | Listar livros (query: `q`, `status`, `categoria_id`) |
| GET | `/api/livros/:id` | Buscar livro por ID |
| POST | `/api/livros` | Criar novo livro |
| PUT | `/api/livros/:id` | Atualizar livro |
| DELETE | `/api/livros/:id` | Excluir livro |

### Autores
| Método | Rota | Descrição |
|--------|------|-----------|
| GET | `/api/autores` | Listar autores |
| GET | `/api/autores/:id` | Buscar autor por ID |
| POST | `/api/autores` | Criar autor |
| PUT | `/api/autores/:id` | Atualizar autor |
| DELETE | `/api/autores/:id` | Excluir autor |

### Categorias
| Método | Rota | Descrição |
|--------|------|-----------|
| GET | `/api/categorias` | Listar categorias |
| GET | `/api/categorias/:id` | Buscar categoria por ID |
| POST | `/api/categorias` | Criar categoria |
| PUT | `/api/categorias/:id` | Atualizar categoria |
| DELETE | `/api/categorias/:id` | Excluir categoria |

## Modelo de Dados

### Livro
```json
{
  "titulo": "Dom Casmurro",
  "isbn": "978-85-359-0277-5",
  "ano_publicacao": 1899,
  "editora": "Ática",
  "paginas": 256,
  "sinopse": "...",
  "capa_url": "https://...",
  "status": "disponivel | emprestado | reservado | indisponivel",
  "autor_id": 1,
  "categoria_id": 1
}
```

## Stack Tecnológica

- **Backend**: Hono (TypeScript) + Cloudflare Workers
- **Banco de dados**: Cloudflare D1 (SQLite)
- **Frontend**: HTML + TailwindCSS (CDN) + Axios
- **Deploy**: Cloudflare Pages
- **Dev Server**: Wrangler + PM2

## Deployment

```bash
# Desenvolvimento local
npm run build
pm2 start ecosystem.config.cjs

# Produção (Cloudflare Pages)
npm run deploy
```

## Status
- **Ambiente**: Desenvolvimento local (sandbox)
- **Última atualização**: Abril 2026
