const Database = require('better-sqlite3');
const path = require('path');

const db = new Database(path.join(__dirname, 'gsim.db'));

db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

db.exec(`
  -- Fornecedores
  CREATE TABLE IF NOT EXISTS fornecedores (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nome_empresa TEXT NOT NULL,
    nome_contato TEXT,
    telefone TEXT,
    email TEXT,
    criado_em TEXT DEFAULT (datetime('now','localtime'))
  );

  -- Materiais de estoque
  CREATE TABLE IF NOT EXISTS materiais (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nome TEXT NOT NULL,
    tipo TEXT NOT NULL, -- 'metro_linear', 'm2', 'unidade', 'folha'
    especificacao TEXT, -- largura do rolo, espessura, etc
    estoque_atual REAL DEFAULT 0,
    estoque_minimo REAL DEFAULT 0,
    custo_medio REAL DEFAULT 0,
    unidade_display TEXT, -- 'ml', 'm²', 'unid', 'folhas'
    criado_em TEXT DEFAULT (datetime('now','localtime'))
  );

  -- Movimentações de estoque
  CREATE TABLE IF NOT EXISTS estoque_movimentos (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    material_id INTEGER NOT NULL REFERENCES materiais(id),
    tipo TEXT NOT NULL, -- 'entrada', 'saida'
    quantidade REAL NOT NULL,
    custo_unitario REAL,
    pedido_id INTEGER,
    orcamento_id INTEGER,
    compra_id INTEGER,
    observacao TEXT,
    criado_em TEXT DEFAULT (datetime('now','localtime'))
  );

  -- Compras de material
  CREATE TABLE IF NOT EXISTS compras (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    fornecedor_id INTEGER REFERENCES fornecedores(id),
    material_id INTEGER NOT NULL REFERENCES materiais(id),
    quantidade REAL NOT NULL,
    valor_total REAL NOT NULL,
    custo_unitario REAL NOT NULL,
    data_compra TEXT NOT NULL,
    observacao TEXT,
    criado_em TEXT DEFAULT (datetime('now','localtime'))
  );

  -- Clientes
  CREATE TABLE IF NOT EXISTS clientes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nome TEXT NOT NULL,
    telefone TEXT NOT NULL,
    empresa TEXT,
    documento_tipo TEXT, -- 'CPF' ou 'CNPJ'
    documento TEXT,
    criado_em TEXT DEFAULT (datetime('now','localtime'))
  );

  -- Orçamentos
  CREATE TABLE IF NOT EXISTS orcamentos (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    numero TEXT NOT NULL UNIQUE,
    cliente_id INTEGER REFERENCES clientes(id),
    cliente_nome TEXT NOT NULL,
    cliente_tel TEXT NOT NULL,
    cliente_empresa TEXT,
    cliente_documento_tipo TEXT,
    cliente_documento TEXT,
    status TEXT DEFAULT 'Em aberto', -- 'Em aberto', 'Aprovado', 'Reprovado'
    validade_dias INTEGER DEFAULT 7,
    data_orcamento TEXT NOT NULL,
    data_validade TEXT NOT NULL,
    desconto_tipo TEXT, -- 'valor' ou 'percentual'
    desconto_valor REAL DEFAULT 0,
    valor_total REAL DEFAULT 0,
    valor_final REAL DEFAULT 0,
    observacoes TEXT,
    versao INTEGER DEFAULT 1,
    orcamento_pai_id INTEGER REFERENCES orcamentos(id),
    pedido_id INTEGER,
    criado_em TEXT DEFAULT (datetime('now','localtime'))
  );

  -- Itens do orçamento
  CREATE TABLE IF NOT EXISTS orcamento_itens (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    orcamento_id INTEGER NOT NULL REFERENCES orcamentos(id) ON DELETE CASCADE,
    tipo_servico TEXT NOT NULL,
    descricao TEXT,
    quantidade REAL DEFAULT 1,
    unidade TEXT,
    largura REAL,
    altura REAL,
    area_m2 REAL,
    metros_lineares REAL,
    perimetro_ml REAL,
    material_id INTEGER REFERENCES materiais(id),
    material_quantidade REAL,
    material_id2 INTEGER REFERENCES materiais(id),
    material_quantidade2 REAL,
    acabamento TEXT,
    especificacoes TEXT, -- JSON com campos extras por tipo
    preco_referencia REAL,
    preco_unitario REAL,
    preco_total REAL,
    terceirizado INTEGER DEFAULT 0
  );

  -- Pedidos
  CREATE TABLE IF NOT EXISTS pedidos (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    numero TEXT NOT NULL UNIQUE,
    orcamento_id INTEGER REFERENCES orcamentos(id),
    cliente_id INTEGER REFERENCES clientes(id),
    cliente_nome TEXT NOT NULL,
    cliente_tel TEXT NOT NULL,
    cliente_empresa TEXT,
    cliente_documento_tipo TEXT,
    cliente_documento TEXT,
    data_entrada TEXT NOT NULL,
    data_entrega TEXT NOT NULL,
    status TEXT DEFAULT 'Arte pendente',
    forma_pagamento TEXT,
    valor_total REAL DEFAULT 0,
    valor_sinal REAL DEFAULT 0,
    sinal_pago INTEGER DEFAULT 0,
    saldo_pago INTEGER DEFAULT 0,
    nf_gerada INTEGER DEFAULT 0,
    observacoes TEXT,
    criado_em TEXT DEFAULT (datetime('now','localtime'))
  );

  -- Itens do pedido
  CREATE TABLE IF NOT EXISTS pedido_itens (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    pedido_id INTEGER NOT NULL REFERENCES pedidos(id) ON DELETE CASCADE,
    tipo_servico TEXT NOT NULL,
    descricao TEXT,
    quantidade REAL DEFAULT 1,
    unidade TEXT,
    largura REAL,
    altura REAL,
    area_m2 REAL,
    metros_lineares REAL,
    perimetro_ml REAL,
    material_id INTEGER REFERENCES materiais(id),
    material_quantidade REAL,
    material_vinculado INTEGER DEFAULT 0,
    material_id2 INTEGER REFERENCES materiais(id),
    material_quantidade2 REAL,
    material_vinculado2 INTEGER DEFAULT 0,
    acabamento TEXT,
    especificacoes TEXT,
    preco_unitario REAL,
    preco_total REAL,
    terceirizado INTEGER DEFAULT 0
  );

  -- Despesas fixas
  CREATE TABLE IF NOT EXISTS despesas_fixas (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    descricao TEXT NOT NULL,
    valor REAL NOT NULL,
    dia_vencimento INTEGER NOT NULL,
    ativo INTEGER DEFAULT 1,
    criado_em TEXT DEFAULT (datetime('now','localtime'))
  );

  -- Lançamentos de despesas fixas mensais
  CREATE TABLE IF NOT EXISTS despesas_fixas_lancamentos (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    despesa_fixa_id INTEGER NOT NULL REFERENCES despesas_fixas(id),
    mes_ano TEXT NOT NULL, -- formato 'YYYY-MM'
    valor REAL NOT NULL,
    data_vencimento TEXT NOT NULL,
    pago INTEGER DEFAULT 0,
    data_pagamento TEXT,
    criado_em TEXT DEFAULT (datetime('now','localtime'))
  );

  -- Despesas variáveis
  CREATE TABLE IF NOT EXISTS despesas_variaveis (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    descricao TEXT NOT NULL,
    categoria TEXT,
    valor REAL NOT NULL,
    data_despesa TEXT NOT NULL,
    data_vencimento TEXT,
    pago INTEGER DEFAULT 0,
    data_pagamento TEXT,
    compra_id INTEGER REFERENCES compras(id),
    criado_em TEXT DEFAULT (datetime('now','localtime'))
  );
`);

// Seed materiais padrão se vazio
const count = db.prepare('SELECT COUNT(*) as c FROM materiais').get();
if (count.c === 0) {
  const insert = db.prepare(`
    INSERT INTO materiais (nome, tipo, especificacao, estoque_minimo, unidade_display)
    VALUES (?, ?, ?, ?, ?)
  `);
  const materiais = [
    ['Lona', 'metro_linear', '1,40m de largura', 10, 'ml'],
    ['Vinil Fosco', 'metro_linear', '1,20m de largura', 5, 'ml'],
    ['Vinil Brilhante', 'metro_linear', '1,20m de largura', 5, 'ml'],
    ['PS (Poliestireno)', 'm2', '3mm', 5, 'm²'],
    ['Chapa Galvanizada', 'm2', '0,5mm', 5, 'm²'],
    ['Papel A4', 'folha', '75g/m²', 500, 'folhas'],
    ['Madeira Redonda', 'unidade', 'Ø 25mm', 10, 'unid'],
    ['Madeira Quadrada 0,70m', 'unidade', '2x2cm - 0,70m', 10, 'unid'],
    ['Madeira Quadrada 1,0m', 'unidade', '2x2cm - 1,0m', 10, 'unid'],
  ];
  materiais.forEach(m => insert.run(...m));
}

module.exports = db;
