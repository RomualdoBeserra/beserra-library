-- Categorias
INSERT OR IGNORE INTO categorias (nome, descricao) VALUES
  ('Romance', 'Livros de ficção romântica'),
  ('Ficção Científica', 'Livros de aventura científica e futurismo'),
  ('Terror', 'Livros de suspense e horror'),
  ('Fantasia', 'Livros com mundos e criaturas fantásticas'),
  ('Biografia', 'Histórias de vida de pessoas reais'),
  ('História', 'Livros sobre eventos e períodos históricos'),
  ('Autoajuda', 'Livros de desenvolvimento pessoal'),
  ('Filosofia', 'Livros de pensamento e reflexão filosófica'),
  ('Infantil', 'Livros para crianças'),
  ('Clássico', 'Obras clássicas da literatura mundial');

-- Autores
INSERT OR IGNORE INTO autores (nome, nacionalidade) VALUES
  ('Machado de Assis', 'Brasileiro'),
  ('Clarice Lispector', 'Brasileira'),
  ('J.K. Rowling', 'Britânica'),
  ('George Orwell', 'Britânico'),
  ('Gabriel García Márquez', 'Colombiano'),
  ('Stephen King', 'Americano'),
  ('J.R.R. Tolkien', 'Britânico'),
  ('Fyodor Dostoevsky', 'Russo'),
  ('Jorge Amado', 'Brasileiro'),
  ('Graciliano Ramos', 'Brasileiro');

-- Livros
INSERT OR IGNORE INTO livros (titulo, isbn, ano_publicacao, editora, paginas, sinopse, status, autor_id, categoria_id) VALUES
  ('Dom Casmurro', '978-85-359-0277-5', 1899, 'Ática', 256, 'A história de Bentinho e Capitu, um dos maiores romances da literatura brasileira.', 'disponivel', 1, 1),
  ('Memórias Póstumas de Brás Cubas', '978-85-359-0278-2', 1881, 'Ática', 288, 'O defunto autor narra sua própria história de forma irreverente e filosófica.', 'disponivel', 1, 10),
  ('A Hora da Estrela', '978-85-7164-011-4', 1977, 'Rocco', 88, 'A história de Macabéa, uma nordestina que vive no Rio de Janeiro.', 'disponivel', 2, 1),
  ('Harry Potter e a Pedra Filosofal', '978-85-325-0000-1', 1997, 'Rocco', 264, 'Um jovem bruxo descobre seu destino mágico ao entrar para a Escola Hogwarts.', 'disponivel', 3, 4),
  ('1984', '978-85-359-0277-9', 1949, 'Companhia das Letras', 416, 'Em um regime totalitário distópico, Winston Smith tenta resistir ao controle absoluto.', 'emprestado', 4, 2),
  ('Cem Anos de Solidão', '978-85-359-0279-9', 1967, 'Record', 448, 'A saga da família Buendía na cidade fictícia de Macondo ao longo de cem anos.', 'disponivel', 5, 1),
  ('It - A Coisa', '978-85-325-0001-8', 1986, 'Suma', 1104, 'Um grupo de crianças enfrenta um mal antigo que aterroriza a cidade de Derry.', 'disponivel', 6, 3),
  ('O Senhor dos Anéis', '978-85-325-0002-5', 1954, 'Martins Fontes', 1200, 'A epopeia de Frodo Bolseiro para destruir o Anel do Poder e salvar a Terra-Média.', 'reservado', 7, 4),
  ('Crime e Castigo', '978-85-325-0003-2', 1866, 'Penguin', 576, 'Raskolnikov, um estudante pobre, comete um crime e lida com as consequências psicológicas.', 'disponivel', 8, 8),
  ('Gabriela, Cravo e Canela', '978-85-7164-012-1', 1958, 'Companhia das Letras', 384, 'A história de amor entre o árabe Nacib e a mestiça Gabriela em Ilhéus.', 'disponivel', 9, 1);
