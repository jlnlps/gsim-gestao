const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const DB_PATH = path.join(__dirname, 'gsim.db');
const db = new sqlite3.Database(DB_PATH);

// Promisify helpers
const run = (sql, params=[]) => new Promise((res,rej) => db.run(sql, params, function(err){ err ? rej(err) : res({lastID: this.lastID, changes: this.changes}) }));
const get = (sql, params=[]) => new Promise((res,rej) => db.get(sql, params, (err,row) => err ? rej(err) : res(row)));
const all = (sql, params=[]) => new Promise((res,rej) => db.all(sql, params, (err,rows) => err ? rej(err) : res(rows)));

const init = () => new Promise((res,rej) => {
  db.serialize(() => {
    db.run('PRAGMA foreign_keys = ON');
    db.run(`CREATE TABLE IF NOT EXISTS fornecedores (
      id INTEGER PRIMARY KEY AUTOINCREMENT, nome_empresa TEXT NOT NULL,
      nome_contato TEXT, telefone TEXT, email TEXT,
      criado_em TEXT DEFAULT (datetime('now','localtime')))`);
    db.run(`CREATE TABLE IF NOT EXISTS materiais (
      id INTEGER PRIMARY KEY AUTOINCREMENT, nome TEXT NOT NULL,
      tipo TEXT NOT NULL, especificacao TEXT, estoque_atual REAL DEFAULT 0,
      estoque_minimo REAL DEFAULT 0, custo_medio REAL DEFAULT 0,
      unidade_display TEXT, criado_em TEXT DEFAULT (datetime('now','localtime')))`);
    db.run(`CREATE TABLE IF NOT EXISTS estoque_movimentos (
      id INTEGER PRIMARY KEY AUTOINCREMENT, material_id INTEGER NOT NULL,
      tipo TEXT NOT NULL, quantidade REAL NOT NULL, custo_unitario REAL,
      pedido_id INTEGER, orcamento_id INTEGER, compra_id INTEGER,
      observacao TEXT, criado_em TEXT DEFAULT (datetime('now','localtime')))`);
    db.run(`CREATE TABLE IF NOT EXISTS compras (
      id INTEGER PRIMARY KEY AUTOINCREMENT, fornecedor_id INTEGER,
      material_id INTEGER NOT NULL, quantidade REAL NOT NULL,
      valor_total REAL NOT NULL, custo_unitario REAL NOT NULL,
      data_compra TEXT NOT NULL, observacao TEXT,
      criado_em TEXT DEFAULT (datetime('now','localtime')))`);
    db.run(`CREATE TABLE IF NOT EXISTS clientes (
      id INTEGER PRIMARY KEY AUTOINCREMENT, nome TEXT NOT NULL,
      telefone TEXT NOT NULL, empresa TEXT, documento_tipo TEXT,
      documento TEXT, criado_em TEXT DEFAULT (datetime('now','localtime')))`);
    db.run(`CREATE TABLE IF NOT EXISTS orcamentos (
      id INTEGER PRIMARY KEY AUTOINCREMENT, numero TEXT NOT NULL UNIQUE,
      cliente_nome TEXT NOT NULL, cliente_tel TEXT NOT NULL,
      cliente_empresa TEXT, cliente_documento_tipo TEXT, cliente_documento TEXT,
      status TEXT DEFAULT 'Em aberto', validade_dias INTEGER DEFAULT 7,
      data_orcamento TEXT NOT NULL, data_validade TEXT NOT NULL,
      desconto_tipo TEXT, desconto_valor REAL DEFAULT 0,
      valor_total REAL DEFAULT 0, valor_final REAL DEFAULT 0,
      observacoes TEXT, versao INTEGER DEFAULT 1, orcamento_pai_id INTEGER,
      pedido_id INTEGER, criado_em TEXT DEFAULT (datetime('now','localtime')))`);
    db.run(`CREATE TABLE IF NOT EXISTS orcamento_itens (
      id INTEGER PRIMARY KEY AUTOINCREMENT, orcamento_id INTEGER NOT NULL,
      tipo_servico TEXT NOT NULL, descricao TEXT, quantidade REAL DEFAULT 1,
      unidade TEXT, largura REAL, altura REAL, area_m2 REAL,
      metros_lineares REAL, perimetro_ml REAL, material_id INTEGER,
      material_quantidade REAL, material_id2 INTEGER, material_quantidade2 REAL,
      acabamento TEXT, especificacoes TEXT, preco_referencia REAL,
      preco_unitario REAL, preco_total REAL, terceirizado INTEGER DEFAULT 0)`);
    db.run(`CREATE TABLE IF NOT EXISTS pedidos (
      id INTEGER PRIMARY KEY AUTOINCREMENT, numero TEXT NOT NULL UNIQUE,
      orcamento_id INTEGER, cliente_nome TEXT NOT NULL, cliente_tel TEXT NOT NULL,
      cliente_empresa TEXT, cliente_documento_tipo TEXT, cliente_documento TEXT,
      data_entrada TEXT NOT NULL, data_entrega TEXT NOT NULL,
      status TEXT DEFAULT 'Arte pendente', forma_pagamento TEXT,
      valor_total REAL DEFAULT 0, valor_sinal REAL DEFAULT 0,
      sinal_pago INTEGER DEFAULT 0, saldo_pago INTEGER DEFAULT 0,
      nf_gerada INTEGER DEFAULT 0, observacoes TEXT,
      criado_em TEXT DEFAULT (datetime('now','localtime')))`);
    db.run(`CREATE TABLE IF NOT EXISTS pedido_itens (
      id INTEGER PRIMARY KEY AUTOINCREMENT, pedido_id INTEGER NOT NULL,
      tipo_servico TEXT NOT NULL, descricao TEXT, quantidade REAL DEFAULT 1,
      unidade TEXT, largura REAL, altura REAL, area_m2 REAL,
      metros_lineares REAL, perimetro_ml REAL, material_id INTEGER,
      material_quantidade REAL, material_vinculado INTEGER DEFAULT 0,
      material_id2 INTEGER, material_quantidade2 REAL,
      material_vinculado2 INTEGER DEFAULT 0, acabamento TEXT,
      especificacoes TEXT, preco_unitario REAL, preco_total REAL,
      terceirizado INTEGER DEFAULT 0)`);
    db.run(`CREATE TABLE IF NOT EXISTS despesas_fixas (
      id INTEGER PRIMARY KEY AUTOINCREMENT, descricao TEXT NOT NULL,
      valor REAL NOT NULL, dia_vencimento INTEGER NOT NULL, ativo INTEGER DEFAULT 1,
      criado_em TEXT DEFAULT (datetime('now','localtime')))`);
    db.run(`CREATE TABLE IF NOT EXISTS despesas_fixas_lancamentos (
      id INTEGER PRIMARY KEY AUTOINCREMENT, despesa_fixa_id INTEGER NOT NULL,
      mes_ano TEXT NOT NULL, valor REAL NOT NULL, data_vencimento TEXT NOT NULL,
      pago INTEGER DEFAULT 0, data_pagamento TEXT,
      criado_em TEXT DEFAULT (datetime('now','localtime')))`);
    db.run(`CREATE TABLE IF NOT EXISTS despesas_variaveis (
      id INTEGER PRIMARY KEY AUTOINCREMENT, descricao TEXT NOT NULL,
      categoria TEXT, valor REAL NOT NULL, data_despesa TEXT NOT NULL,
      data_vencimento TEXT, pago INTEGER DEFAULT 0, data_pagamento TEXT,
      compra_id INTEGER, criado_em TEXT DEFAULT (datetime('now','localtime')))`, [], async (err) => {
      if (err) return rej(err);
      // Seed materiais
      const count = await get('SELECT COUNT(*) as c FROM materiais');
      if (count.c === 0) {
        const mats = [
          ['Lona','metro_linear','1,40m de largura',10,'ml'],
          ['Vinil Fosco','metro_linear','1,20m de largura',5,'ml'],
          ['Vinil Brilhante','metro_linear','1,20m de largura',5,'ml'],
          ['PS (Poliestireno)','m2','3mm',5,'m²'],
          ['Chapa Galvanizada','m2','0,5mm',5,'m²'],
          ['Papel A4','folha','75g/m²',500,'folhas'],
          ['Madeira Redonda','unidade','Ø 25mm',10,'unid'],
          ['Madeira Quadrada 0,70m','unidade','2x2cm',10,'unid'],
          ['Madeira Quadrada 1,0m','unidade','2x2cm',10,'unid'],
        ];
        for (const m of mats) {
          await run('INSERT INTO materiais (nome,tipo,especificacao,estoque_minimo,unidade_display) VALUES (?,?,?,?,?)', m);
        }
      }
      res();
    });
  });
});

module.exports = { db, run, get, all, init };
