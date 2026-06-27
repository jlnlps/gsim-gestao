const express = require('express');
const cors = require('cors');
const path = require('path');
const db = require('./database');

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'client')));

// ─── Helpers ─────────────────────────────────────────────────────────────────
const uid = (prefix) => `${prefix}${Date.now().toString().slice(-6)}`;
const hoje = () => new Date().toISOString().slice(0, 10);
const addDias = (data, dias) => {
  const d = new Date(data + 'T00:00:00');
  d.setDate(d.getDate() + dias);
  return d.toISOString().slice(0, 10);
};
const mesAno = (data) => data.slice(0, 7);
const ultimoDiaMes = (ano, mes) => new Date(ano, mes, 0).getDate();

// ─── CLIENTES ────────────────────────────────────────────────────────────────
app.get('/api/clientes', (req, res) => {
  const { q } = req.query;
  let rows;
  if (q) {
    rows = db.prepare(`SELECT * FROM clientes WHERE nome LIKE ? OR telefone LIKE ? OR empresa LIKE ? ORDER BY nome`).all(`%${q}%`, `%${q}%`, `%${q}%`);
  } else {
    rows = db.prepare('SELECT * FROM clientes ORDER BY nome').all();
  }
  res.json(rows);
});

app.post('/api/clientes', (req, res) => {
  const { nome, telefone, empresa, documento_tipo, documento } = req.body;
  const r = db.prepare(`INSERT INTO clientes (nome, telefone, empresa, documento_tipo, documento) VALUES (?,?,?,?,?)`).run(nome, telefone, empresa || null, documento_tipo || null, documento || null);
  res.json({ id: r.lastInsertRowid });
});

app.put('/api/clientes/:id', (req, res) => {
  const { nome, telefone, empresa, documento_tipo, documento } = req.body;
  db.prepare(`UPDATE clientes SET nome=?, telefone=?, empresa=?, documento_tipo=?, documento=? WHERE id=?`).run(nome, telefone, empresa || null, documento_tipo || null, documento || null, req.params.id);
  res.json({ ok: true });
});

// ─── FORNECEDORES ────────────────────────────────────────────────────────────
app.get('/api/fornecedores', (_, res) => res.json(db.prepare('SELECT * FROM fornecedores ORDER BY nome_empresa').all()));

app.post('/api/fornecedores', (req, res) => {
  const { nome_empresa, nome_contato, telefone, email } = req.body;
  const r = db.prepare(`INSERT INTO fornecedores (nome_empresa, nome_contato, telefone, email) VALUES (?,?,?,?)`).run(nome_empresa, nome_contato || null, telefone || null, email || null);
  res.json({ id: r.lastInsertRowid });
});

app.put('/api/fornecedores/:id', (req, res) => {
  const { nome_empresa, nome_contato, telefone, email } = req.body;
  db.prepare(`UPDATE fornecedores SET nome_empresa=?, nome_contato=?, telefone=?, email=? WHERE id=?`).run(nome_empresa, nome_contato || null, telefone || null, email || null, req.params.id);
  res.json({ ok: true });
});

app.delete('/api/fornecedores/:id', (req, res) => {
  db.prepare('DELETE FROM fornecedores WHERE id=?').run(req.params.id);
  res.json({ ok: true });
});

app.get('/api/fornecedores/:id/compras', (req, res) => {
  const rows = db.prepare(`SELECT c.*, m.nome as material_nome, m.unidade_display FROM compras c JOIN materiais m ON c.material_id=m.id WHERE c.fornecedor_id=? ORDER BY c.data_compra DESC`).all(req.params.id);
  res.json(rows);
});

// ─── MATERIAIS / ESTOQUE ─────────────────────────────────────────────────────
app.get('/api/materiais', (_, res) => res.json(db.prepare('SELECT * FROM materiais ORDER BY nome').all()));

app.post('/api/materiais', (req, res) => {
  const { nome, tipo, especificacao, estoque_minimo, unidade_display } = req.body;
  const r = db.prepare(`INSERT INTO materiais (nome, tipo, especificacao, estoque_minimo, unidade_display) VALUES (?,?,?,?,?)`).run(nome, tipo, especificacao || null, estoque_minimo || 0, unidade_display);
  res.json({ id: r.lastInsertRowid });
});

app.put('/api/materiais/:id', (req, res) => {
  const { nome, especificacao, estoque_minimo, custo_medio } = req.body;
  db.prepare(`UPDATE materiais SET nome=?, especificacao=?, estoque_minimo=?, custo_medio=? WHERE id=?`).run(nome, especificacao || null, estoque_minimo || 0, custo_medio || 0, req.params.id);
  res.json({ ok: true });
});

app.get('/api/materiais/:id/movimentos', (req, res) => {
  const rows = db.prepare(`SELECT em.*, p.numero as pedido_numero FROM estoque_movimentos em LEFT JOIN pedidos p ON em.pedido_id=p.id WHERE em.material_id=? ORDER BY em.criado_em DESC LIMIT 50`).all(req.params.id);
  res.json(rows);
});

// Compra de material
app.post('/api/compras', (req, res) => {
  const { fornecedor_id, material_id, quantidade, valor_total, data_compra, observacao } = req.body;
  const custo_unitario = valor_total / quantidade;

  const insertCompra = db.transaction(() => {
    const r = db.prepare(`INSERT INTO compras (fornecedor_id, material_id, quantidade, valor_total, custo_unitario, data_compra, observacao) VALUES (?,?,?,?,?,?,?)`).run(fornecedor_id || null, material_id, quantidade, valor_total, custo_unitario, data_compra, observacao || null);
    const compra_id = r.lastInsertRowid;

    // Atualiza estoque (custo médio ponderado)
    const mat = db.prepare('SELECT * FROM materiais WHERE id=?').get(material_id);
    const novo_estoque = mat.estoque_atual + quantidade;
    const novo_custo = novo_estoque > 0 ? ((mat.estoque_atual * mat.custo_medio) + (quantidade * custo_unitario)) / novo_estoque : custo_unitario;
    db.prepare('UPDATE materiais SET estoque_atual=?, custo_medio=? WHERE id=?').run(novo_estoque, novo_custo, material_id);

    // Movimento
    db.prepare(`INSERT INTO estoque_movimentos (material_id, tipo, quantidade, custo_unitario, compra_id, observacao) VALUES (?,?,?,?,?,?)`).run(material_id, 'entrada', quantidade, custo_unitario, compra_id, `Compra #${compra_id}`);

    // Despesa variável
    db.prepare(`INSERT INTO despesas_variaveis (descricao, categoria, valor, data_despesa, data_vencimento, pago, compra_id) VALUES (?,?,?,?,?,?,?)`).run(`Compra de material: ${mat.nome}`, 'Material', valor_total, data_compra, data_compra, 1, compra_id);

    return compra_id;
  });

  const id = insertCompra();
  res.json({ id });
});

// Vincular material a item do pedido (quando decide na produção)
app.post('/api/pedido-itens/:id/vincular-material', (req, res) => {
  const { material_id, quantidade, campo } = req.body; // campo: 1 ou 2
  const item = db.prepare('SELECT * FROM pedido_itens WHERE id=?').get(req.params.id);
  if (!item) return res.status(404).json({ error: 'Item não encontrado' });

  db.transaction(() => {
    if (campo === 2) {
      db.prepare('UPDATE pedido_itens SET material_id2=?, material_quantidade2=?, material_vinculado2=1 WHERE id=?').run(material_id, quantidade, req.params.id);
    } else {
      db.prepare('UPDATE pedido_itens SET material_id=?, material_quantidade=?, material_vinculado=1 WHERE id=?').run(material_id, quantidade, req.params.id);
    }
    // Desconta estoque
    const mat = db.prepare('SELECT * FROM materiais WHERE id=?').get(material_id);
    db.prepare('UPDATE materiais SET estoque_atual=? WHERE id=?').run(mat.estoque_atual - quantidade, material_id);
    db.prepare(`INSERT INTO estoque_movimentos (material_id, tipo, quantidade, pedido_id, observacao) VALUES (?,?,?,?,?)`).run(material_id, 'saida', quantidade, item.pedido_id, `Pedido #${item.pedido_id} - vinculação na produção`);
  })();

  res.json({ ok: true });
});

// ─── ORÇAMENTOS ──────────────────────────────────────────────────────────────
app.get('/api/orcamentos', (req, res) => {
  const { status } = req.query;
  let sql = 'SELECT * FROM orcamentos';
  if (status) sql += ` WHERE status=?`;
  sql += ' ORDER BY criado_em DESC';
  const rows = status ? db.prepare(sql).all(status) : db.prepare(sql).all();
  res.json(rows);
});

app.get('/api/orcamentos/:id', (req, res) => {
  const orc = db.prepare('SELECT * FROM orcamentos WHERE id=?').get(req.params.id);
  if (!orc) return res.status(404).json({ error: 'Não encontrado' });
  orc.itens = db.prepare('SELECT * FROM orcamento_itens WHERE orcamento_id=? ORDER BY id').all(orc.id);
  res.json(orc);
});

app.post('/api/orcamentos', (req, res) => {
  const { cliente_nome, cliente_tel, cliente_empresa, cliente_documento_tipo, cliente_documento, itens, desconto_tipo, desconto_valor, observacoes, validade_dias } = req.body;
  const data_orc = hoje();
  const val_dias = validade_dias || 7;
  const data_val = addDias(data_orc, val_dias);
  const numero = uid('ORC');

  const valor_total = itens.reduce((s, i) => s + (parseFloat(i.preco_total) || 0), 0);
  let valor_final = valor_total;
  if (desconto_tipo === 'percentual' && desconto_valor) valor_final = valor_total * (1 - desconto_valor / 100);
  if (desconto_tipo === 'valor' && desconto_valor) valor_final = valor_total - desconto_valor;

  const insertOrc = db.transaction(() => {
    const r = db.prepare(`INSERT INTO orcamentos (numero, cliente_nome, cliente_tel, cliente_empresa, cliente_documento_tipo, cliente_documento, data_orcamento, data_validade, validade_dias, desconto_tipo, desconto_valor, valor_total, valor_final, observacoes) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)`).run(numero, cliente_nome, cliente_tel, cliente_empresa || null, cliente_documento_tipo || null, cliente_documento || null, data_orc, data_val, val_dias, desconto_tipo || null, desconto_valor || 0, valor_total, valor_final, observacoes || null);
    const orc_id = r.lastInsertRowid;

    itens.forEach(item => {
      db.prepare(`INSERT INTO orcamento_itens (orcamento_id, tipo_servico, descricao, quantidade, unidade, largura, altura, area_m2, metros_lineares, perimetro_ml, material_id, material_quantidade, material_id2, material_quantidade2, acabamento, especificacoes, preco_referencia, preco_unitario, preco_total, terceirizado) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`).run(orc_id, item.tipo_servico, item.descricao || null, item.quantidade || 1, item.unidade || null, item.largura || null, item.altura || null, item.area_m2 || null, item.metros_lineares || null, item.perimetro_ml || null, item.material_id || null, item.material_quantidade || null, item.material_id2 || null, item.material_quantidade2 || null, item.acabamento || null, item.especificacoes ? JSON.stringify(item.especificacoes) : null, item.preco_referencia || null, item.preco_unitario || null, item.preco_total || null, item.terceirizado ? 1 : 0);
    });

    return orc_id;
  });

  const id = insertOrc();
  res.json({ id, numero });
});

// Nova versão do orçamento
app.post('/api/orcamentos/:id/nova-versao', (req, res) => {
  const pai = db.prepare('SELECT * FROM orcamentos WHERE id=?').get(req.params.id);
  if (!pai) return res.status(404).json({ error: 'Não encontrado' });
  const itens = db.prepare('SELECT * FROM orcamento_itens WHERE orcamento_id=?').all(pai.id);

  const numero = uid('ORC');
  const data_orc = hoje();
  const data_val = addDias(data_orc, pai.validade_dias || 7);

  const r = db.prepare(`INSERT INTO orcamentos (numero, cliente_nome, cliente_tel, cliente_empresa, cliente_documento_tipo, cliente_documento, data_orcamento, data_validade, validade_dias, desconto_tipo, desconto_valor, valor_total, valor_final, observacoes, versao, orcamento_pai_id) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`).run(numero, pai.cliente_nome, pai.cliente_tel, pai.cliente_empresa, pai.cliente_documento_tipo, pai.cliente_documento, data_orc, data_val, pai.validade_dias, pai.desconto_tipo, pai.desconto_valor, pai.valor_total, pai.valor_final, pai.observacoes, (pai.versao || 1) + 1, pai.id);

  const orc_id = r.lastInsertRowid;
  itens.forEach(item => {
    db.prepare(`INSERT INTO orcamento_itens (orcamento_id, tipo_servico, descricao, quantidade, unidade, largura, altura, area_m2, metros_lineares, perimetro_ml, material_id, material_quantidade, material_id2, material_quantidade2, acabamento, especificacoes, preco_referencia, preco_unitario, preco_total, terceirizado) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`).run(orc_id, item.tipo_servico, item.descricao, item.quantidade, item.unidade, item.largura, item.altura, item.area_m2, item.metros_lineares, item.perimetro_ml, item.material_id, item.material_quantidade, item.material_id2, item.material_quantidade2, item.acabamento, item.especificacoes, item.preco_referencia, item.preco_unitario, item.preco_total, item.terceirizado);
  });

  res.json({ id: orc_id, numero });
});

// Atualizar status do orçamento
app.patch('/api/orcamentos/:id/status', (req, res) => {
  const { status } = req.body;
  db.prepare('UPDATE orcamentos SET status=? WHERE id=?').run(status, req.params.id);
  res.json({ ok: true });
});

// Converter orçamento aprovado em pedido
app.post('/api/orcamentos/:id/converter', (req, res) => {
  const { data_entrega, forma_pagamento, valor_sinal } = req.body;
  const orc = db.prepare('SELECT * FROM orcamentos WHERE id=?').get(req.params.id);
  if (!orc) return res.status(404).json({ error: 'Não encontrado' });
  const itens = db.prepare('SELECT * FROM orcamento_itens WHERE orcamento_id=?').all(orc.id);

  const numero = uid('PED');

  const createPedido = db.transaction(() => {
    const r = db.prepare(`INSERT INTO pedidos (numero, orcamento_id, cliente_nome, cliente_tel, cliente_empresa, cliente_documento_tipo, cliente_documento, data_entrada, data_entrega, forma_pagamento, valor_total, valor_sinal, observacoes) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)`).run(numero, orc.id, orc.cliente_nome, orc.cliente_tel, orc.cliente_empresa, orc.cliente_documento_tipo, orc.cliente_documento, hoje(), data_entrega, forma_pagamento || null, orc.valor_final, valor_sinal || 0, orc.observacoes);
    const ped_id = r.lastInsertRowid;

    itens.forEach(item => {
      db.prepare(`INSERT INTO pedido_itens (pedido_id, tipo_servico, descricao, quantidade, unidade, largura, altura, area_m2, metros_lineares, perimetro_ml, material_id, material_quantidade, material_id2, material_quantidade2, acabamento, especificacoes, preco_unitario, preco_total, terceirizado) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`).run(ped_id, item.tipo_servico, item.descricao, item.quantidade, item.unidade, item.largura, item.altura, item.area_m2, item.metros_lineares, item.perimetro_ml, item.material_id, item.material_quantidade, item.material_id2, item.material_quantidade2, item.acabamento, item.especificacoes, item.preco_unitario, item.preco_total, item.terceirizado);

      // Descontar materiais não terceirizados
      if (!item.terceirizado) {
        if (item.material_id && item.material_quantidade) {
          const mat = db.prepare('SELECT * FROM materiais WHERE id=?').get(item.material_id);
          if (mat) {
            db.prepare('UPDATE materiais SET estoque_atual=? WHERE id=?').run(mat.estoque_atual - item.material_quantidade, item.material_id);
            db.prepare(`INSERT INTO estoque_movimentos (material_id, tipo, quantidade, pedido_id, observacao) VALUES (?,?,?,?,?)`).run(item.material_id, 'saida', item.material_quantidade, ped_id, `Pedido ${numero}`);
          }
        }
        if (item.material_id2 && item.material_quantidade2) {
          const mat2 = db.prepare('SELECT * FROM materiais WHERE id=?').get(item.material_id2);
          if (mat2) {
            db.prepare('UPDATE materiais SET estoque_atual=? WHERE id=?').run(mat2.estoque_atual - item.material_quantidade2, item.material_id2);
            db.prepare(`INSERT INTO estoque_movimentos (material_id, tipo, quantidade, pedido_id, observacao) VALUES (?,?,?,?,?)`).run(item.material_id2, 'saida', item.material_quantidade2, ped_id, `Pedido ${numero}`);
          }
        }
      }
    });

    db.prepare('UPDATE orcamentos SET status=?, pedido_id=? WHERE id=?').run('Aprovado', ped_id, orc.id);
    return { ped_id, numero };
  });

  const result = createPedido();
  res.json(result);
});

// Preço referência para item
app.post('/api/orcamentos/preco-referencia', (req, res) => {
  const { tipo_servico, material_id, material_quantidade, material_id2, material_quantidade2 } = req.body;

  let custo_material = 0;
  if (material_id && material_quantidade) {
    const mat = db.prepare('SELECT custo_medio FROM materiais WHERE id=?').get(material_id);
    if (mat) custo_material += mat.custo_medio * material_quantidade;
  }
  if (material_id2 && material_quantidade2) {
    const mat2 = db.prepare('SELECT custo_medio FROM materiais WHERE id=?').get(material_id2);
    if (mat2) custo_material += mat2.custo_medio * material_quantidade2;
  }

  // Média histórica de pedidos similares
  const historico = db.prepare(`SELECT AVG(pi.preco_total / NULLIF(pi.area_m2, 0)) as media_m2, AVG(pi.preco_total) as media_total FROM pedido_itens pi WHERE pi.tipo_servico=? AND pi.preco_total > 0 LIMIT 20`).get(tipo_servico);

  const sugestao = custo_material > 0 ? custo_material * 3 : null;
  res.json({ custo_material, sugestao, historico });
});

// ─── PEDIDOS ─────────────────────────────────────────────────────────────────
app.get('/api/pedidos', (req, res) => {
  const { status, q } = req.query;
  let sql = 'SELECT * FROM pedidos WHERE 1=1';
  const params = [];
  if (status && status !== 'todos') { sql += ' AND status=?'; params.push(status); }
  if (q) { sql += ' AND (cliente_nome LIKE ? OR numero LIKE ?)'; params.push(`%${q}%`, `%${q}%`); }
  sql += ' ORDER BY criado_em DESC';
  res.json(db.prepare(sql).all(...params));
});

app.get('/api/pedidos/:id', (req, res) => {
  const ped = db.prepare('SELECT * FROM pedidos WHERE id=?').get(req.params.id);
  if (!ped) return res.status(404).json({ error: 'Não encontrado' });
  ped.itens = db.prepare('SELECT pi.*, m.nome as material_nome, m.unidade_display, m2.nome as material_nome2, m2.unidade_display as unidade_display2 FROM pedido_itens pi LEFT JOIN materiais m ON pi.material_id=m.id LEFT JOIN materiais m2 ON pi.material_id2=m2.id WHERE pi.pedido_id=? ORDER BY pi.id').all(ped.id);
  res.json(ped);
});

app.post('/api/pedidos', (req, res) => {
  const { cliente_nome, cliente_tel, cliente_empresa, cliente_documento_tipo, cliente_documento, data_entrada, data_entrega, forma_pagamento, valor_sinal, observacoes, itens } = req.body;
  const numero = uid('PED');
  const valor_total = itens.reduce((s, i) => s + (parseFloat(i.preco_total) || 0), 0);

  const createPedido = db.transaction(() => {
    const r = db.prepare(`INSERT INTO pedidos (numero, cliente_nome, cliente_tel, cliente_empresa, cliente_documento_tipo, cliente_documento, data_entrada, data_entrega, forma_pagamento, valor_total, valor_sinal, observacoes) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)`).run(numero, cliente_nome, cliente_tel, cliente_empresa || null, cliente_documento_tipo || null, cliente_documento || null, data_entrada, data_entrega, forma_pagamento || null, valor_total, valor_sinal || 0, observacoes || null);
    const ped_id = r.lastInsertRowid;

    itens.forEach(item => {
      db.prepare(`INSERT INTO pedido_itens (pedido_id, tipo_servico, descricao, quantidade, unidade, largura, altura, area_m2, metros_lineares, perimetro_ml, material_id, material_quantidade, material_id2, material_quantidade2, acabamento, especificacoes, preco_unitario, preco_total, terceirizado) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`).run(ped_id, item.tipo_servico, item.descricao || null, item.quantidade || 1, item.unidade || null, item.largura || null, item.altura || null, item.area_m2 || null, item.metros_lineares || null, item.perimetro_ml || null, item.material_id || null, item.material_quantidade || null, item.material_id2 || null, item.material_quantidade2 || null, item.acabamento || null, item.especificacoes ? JSON.stringify(item.especificacoes) : null, item.preco_unitario || null, item.preco_total || null, item.terceirizado ? 1 : 0);

      // Descontar estoque se material definido
      if (!item.terceirizado && item.material_id && item.material_quantidade) {
        const mat = db.prepare('SELECT * FROM materiais WHERE id=?').get(item.material_id);
        if (mat) {
          db.prepare('UPDATE materiais SET estoque_atual=? WHERE id=?').run(mat.estoque_atual - item.material_quantidade, item.material_id);
          db.prepare(`INSERT INTO estoque_movimentos (material_id, tipo, quantidade, pedido_id) VALUES (?,?,?,?)`).run(item.material_id, 'saida', item.material_quantidade, ped_id);
        }
      }
      if (!item.terceirizado && item.material_id2 && item.material_quantidade2) {
        const mat2 = db.prepare('SELECT * FROM materiais WHERE id=?').get(item.material_id2);
        if (mat2) {
          db.prepare('UPDATE materiais SET estoque_atual=? WHERE id=?').run(mat2.estoque_atual - item.material_quantidade2, item.material_id2);
          db.prepare(`INSERT INTO estoque_movimentos (material_id, tipo, quantidade, pedido_id) VALUES (?,?,?,?)`).run(item.material_id2, 'saida', item.material_quantidade2, ped_id);
        }
      }
    });

    return { ped_id, numero };
  });

  const result = createPedido();
  res.json(result);
});

app.patch('/api/pedidos/:id/status', (req, res) => {
  db.prepare('UPDATE pedidos SET status=? WHERE id=?').run(req.body.status, req.params.id);
  res.json({ ok: true });
});

app.patch('/api/pedidos/:id/pagamento', (req, res) => {
  const { sinal_pago, saldo_pago } = req.body;
  db.prepare('UPDATE pedidos SET sinal_pago=?, saldo_pago=? WHERE id=?').run(sinal_pago ? 1 : 0, saldo_pago ? 1 : 0, req.params.id);
  res.json({ ok: true });
});

// Gerar texto NF
app.get('/api/pedidos/:id/nf', (req, res) => {
  const ped = db.prepare('SELECT * FROM pedidos WHERE id=?').get(req.params.id);
  if (!ped) return res.status(404).json({ error: 'Não encontrado' });
  const itens = db.prepare('SELECT * FROM pedido_itens WHERE pedido_id=?').all(ped.id);

  const linhas = itens.map(i => {
    const desc = [i.tipo_servico, i.descricao].filter(Boolean).join(' - ');
    return `${desc} | Qtd: ${i.quantidade} ${i.unidade || 'un'} | Valor unitário: R$ ${Number(i.preco_unitario || 0).toFixed(2)} | Total: R$ ${Number(i.preco_total || 0).toFixed(2)}`;
  });

  const texto = `DESCRIÇÃO DO SERVIÇO PARA NFS-e\n\nPedido: ${ped.numero}\nCliente: ${ped.cliente_nome}${ped.cliente_empresa ? ` / ${ped.cliente_empresa}` : ''}${ped.cliente_documento ? `\n${ped.cliente_documento_tipo}: ${ped.cliente_documento}` : ''}\n\nSERVIÇOS PRESTADOS:\n${linhas.join('\n')}\n\nVALOR TOTAL: R$ ${Number(ped.valor_total || 0).toFixed(2)}\n\nGsim Comunicação Visual - Serviços gráficos e comunicação visual`;

  db.prepare('UPDATE pedidos SET nf_gerada=1 WHERE id=?').run(ped.id);
  res.json({ texto });
});

// ─── FINANCEIRO ──────────────────────────────────────────────────────────────
// Despesas fixas
app.get('/api/despesas-fixas', (_, res) => res.json(db.prepare('SELECT * FROM despesas_fixas WHERE ativo=1 ORDER BY dia_vencimento').all()));

app.post('/api/despesas-fixas', (req, res) => {
  const { descricao, valor, dia_vencimento } = req.body;
  const r = db.prepare('INSERT INTO despesas_fixas (descricao, valor, dia_vencimento) VALUES (?,?,?)').run(descricao, valor, dia_vencimento);
  res.json({ id: r.lastInsertRowid });
});

app.put('/api/despesas-fixas/:id', (req, res) => {
  const { descricao, valor, dia_vencimento, ativo } = req.body;
  db.prepare('UPDATE despesas_fixas SET descricao=?, valor=?, dia_vencimento=?, ativo=? WHERE id=?').run(descricao, valor, dia_vencimento, ativo ? 1 : 0, req.params.id);
  res.json({ ok: true });
});

// Gerar lançamentos do mês para despesas fixas
app.post('/api/despesas-fixas/gerar-mes', (req, res) => {
  const { mes_ano } = req.body; // 'YYYY-MM'
  const [ano, mes] = mes_ano.split('-').map(Number);
  const fixas = db.prepare('SELECT * FROM despesas_fixas WHERE ativo=1').all();

  const gerados = [];
  fixas.forEach(f => {
    const existe = db.prepare('SELECT id FROM despesas_fixas_lancamentos WHERE despesa_fixa_id=? AND mes_ano=?').get(f.id, mes_ano);
    if (!existe) {
      const dia = Math.min(f.dia_vencimento, ultimoDiaMes(ano, mes));
      const data_venc = `${mes_ano}-${String(dia).padStart(2, '0')}`;
      const r = db.prepare('INSERT INTO despesas_fixas_lancamentos (despesa_fixa_id, mes_ano, valor, data_vencimento) VALUES (?,?,?,?)').run(f.id, mes_ano, f.valor, data_venc);
      gerados.push(r.lastInsertRowid);
    }
  });
  res.json({ gerados: gerados.length });
});

app.get('/api/despesas-fixas/lancamentos', (req, res) => {
  const { mes_ano } = req.query;
  let sql = `SELECT dfl.*, df.descricao FROM despesas_fixas_lancamentos dfl JOIN despesas_fixas df ON dfl.despesa_fixa_id=df.id`;
  if (mes_ano) sql += ` WHERE dfl.mes_ano=?`;
  sql += ' ORDER BY dfl.data_vencimento';
  const rows = mes_ano ? db.prepare(sql).all(mes_ano) : db.prepare(sql).all();
  res.json(rows);
});

app.patch('/api/despesas-fixas/lancamentos/:id/pagar', (req, res) => {
  db.prepare('UPDATE despesas_fixas_lancamentos SET pago=1, data_pagamento=? WHERE id=?').run(hoje(), req.params.id);
  res.json({ ok: true });
});

// Despesas variáveis
app.get('/api/despesas-variaveis', (req, res) => {
  const { mes_ano, pago } = req.query;
  let sql = 'SELECT * FROM despesas_variaveis WHERE 1=1';
  const params = [];
  if (mes_ano) { sql += ' AND strftime(\'%Y-%m\', data_despesa)=?'; params.push(mes_ano); }
  if (pago !== undefined) { sql += ' AND pago=?'; params.push(parseInt(pago)); }
  sql += ' ORDER BY data_vencimento, data_despesa';
  res.json(db.prepare(sql).all(...params));
});

app.post('/api/despesas-variaveis', (req, res) => {
  const { descricao, categoria, valor, data_despesa, data_vencimento, pago } = req.body;
  const r = db.prepare('INSERT INTO despesas_variaveis (descricao, categoria, valor, data_despesa, data_vencimento, pago) VALUES (?,?,?,?,?,?)').run(descricao, categoria || null, valor, data_despesa, data_vencimento || data_despesa, pago ? 1 : 0);
  res.json({ id: r.lastInsertRowid });
});

app.patch('/api/despesas-variaveis/:id/pagar', (req, res) => {
  db.prepare('UPDATE despesas_variaveis SET pago=1, data_pagamento=? WHERE id=?').run(hoje(), req.params.id);
  res.json({ ok: true });
});

// Balanço
app.get('/api/financeiro/balanco', (req, res) => {
  const { data_inicio, data_fim } = req.query;

  const entradas_recebidas = db.prepare(`SELECT COALESCE(SUM(CASE WHEN sinal_pago=1 THEN valor_sinal ELSE 0 END) + SUM(CASE WHEN saldo_pago=1 THEN (valor_total - valor_sinal) ELSE 0 END), 0) as total FROM pedidos WHERE data_entrada BETWEEN ? AND ?`).get(data_inicio, data_fim);

  const a_receber = db.prepare(`SELECT COALESCE(SUM(CASE WHEN sinal_pago=0 THEN valor_sinal ELSE 0 END) + SUM(CASE WHEN saldo_pago=0 THEN (valor_total - valor_sinal) ELSE 0 END), 0) as total FROM pedidos WHERE status NOT IN ('Cancelado','Finalizado') AND data_entrega BETWEEN ? AND ?`).get(data_inicio, data_fim);

  const desp_fixas_pagas = db.prepare(`SELECT COALESCE(SUM(valor),0) as total FROM despesas_fixas_lancamentos WHERE pago=1 AND data_vencimento BETWEEN ? AND ?`).get(data_inicio, data_fim);

  const desp_var_pagas = db.prepare(`SELECT COALESCE(SUM(valor),0) as total FROM despesas_variaveis WHERE pago=1 AND data_despesa BETWEEN ? AND ?`).get(data_inicio, data_fim);

  const desp_fixas_pendentes = db.prepare(`SELECT COALESCE(SUM(valor),0) as total FROM despesas_fixas_lancamentos WHERE pago=0 AND data_vencimento BETWEEN ? AND ?`).get(data_inicio, data_fim);

  const desp_var_pendentes = db.prepare(`SELECT COALESCE(SUM(valor),0) as total FROM despesas_variaveis WHERE pago=0 AND data_vencimento BETWEEN ? AND ?`).get(data_inicio, data_fim);

  const custo_materiais = db.prepare(`SELECT COALESCE(SUM(em.quantidade * em.custo_unitario),0) as total FROM estoque_movimentos em JOIN pedidos p ON em.pedido_id=p.id WHERE em.tipo='saida' AND p.data_entrada BETWEEN ? AND ?`).get(data_inicio, data_fim);

  const total_despesas = desp_fixas_pagas.total + desp_var_pagas.total + custo_materiais.total;
  const lucro = entradas_recebidas.total - total_despesas;

  res.json({
    entradas_recebidas: entradas_recebidas.total,
    a_receber: a_receber.total,
    despesas_pagas: total_despesas,
    despesas_fixas_pagas: desp_fixas_pagas.total,
    despesas_variaveis_pagas: desp_var_pagas.total,
    custo_materiais: custo_materiais.total,
    a_pagar: desp_fixas_pendentes.total + desp_var_pendentes.total,
    lucro_liquido: lucro,
  });
});

// Projeção 6 meses
app.get('/api/financeiro/projecao', (_, res) => {
  const meses = [];
  const agora = new Date();

  for (let i = 0; i < 6; i++) {
    const d = new Date(agora.getFullYear(), agora.getMonth() + i, 1);
    const ma = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    const inicio = `${ma}-01`;
    const fim = `${ma}-${String(ultimoDiaMes(d.getFullYear(), d.getMonth() + 1)).padStart(2, '0')}`;

    // Entradas esperadas (saldo pendente de pedidos com entrega no mês)
    const entradas = db.prepare(`SELECT COALESCE(SUM(valor_total - valor_sinal),0) as total FROM pedidos WHERE saldo_pago=0 AND data_entrega BETWEEN ? AND ? AND status NOT IN ('Cancelado')`).get(inicio, fim);

    // Despesas fixas do mês
    const desp_fixas = db.prepare(`SELECT COALESCE(SUM(df.valor),0) as total FROM despesas_fixas df WHERE df.ativo=1`).get();

    meses.push({ mes_ano: ma, entradas_esperadas: entradas.total, despesas_fixas: desp_fixas.total, saldo_projetado: entradas.total - desp_fixas.total });
  }

  res.json(meses);
});

// Contas a pagar (alertas)
app.get('/api/financeiro/contas-a-pagar', (req, res) => {
  const { filtro } = req.query; // 'todas', 'hoje', 'semana', 'vencidas'
  const hj = hoje();
  const em7 = addDias(hj, 7);

  let fixas_sql = `SELECT 'fixa' as origem, dfl.id, df.descricao, dfl.valor, dfl.data_vencimento, dfl.pago FROM despesas_fixas_lancamentos dfl JOIN despesas_fixas df ON dfl.despesa_fixa_id=df.id WHERE dfl.pago=0`;
  let var_sql = `SELECT 'variavel' as origem, dv.id, dv.descricao, dv.valor, dv.data_vencimento, dv.pago FROM despesas_variaveis dv WHERE dv.pago=0`;

  if (filtro === 'hoje') { fixas_sql += ` AND dfl.data_vencimento=?`; var_sql += ` AND dv.data_vencimento=?`; }
  else if (filtro === 'semana') { fixas_sql += ` AND dfl.data_vencimento BETWEEN ? AND ?`; var_sql += ` AND dv.data_vencimento BETWEEN ? AND ?`; }
  else if (filtro === 'vencidas') { fixas_sql += ` AND dfl.data_vencimento < ?`; var_sql += ` AND dv.data_vencimento < ?`; }

  let fixas, vars;
  if (filtro === 'semana') {
    fixas = db.prepare(fixas_sql + ' ORDER BY dfl.data_vencimento').all(hj, em7);
    vars = db.prepare(var_sql + ' ORDER BY dv.data_vencimento').all(hj, em7);
  } else if (filtro === 'hoje' || filtro === 'vencidas') {
    fixas = db.prepare(fixas_sql + ' ORDER BY dfl.data_vencimento').all(hj);
    vars = db.prepare(var_sql + ' ORDER BY dv.data_vencimento').all(hj);
  } else {
    fixas = db.prepare(fixas_sql + ' ORDER BY dfl.data_vencimento').all();
    vars = db.prepare(var_sql + ' ORDER BY dv.data_vencimento').all();
  }

  res.json([...fixas, ...vars].sort((a, b) => a.data_vencimento.localeCompare(b.data_vencimento)));
});

// ─── CRONOGRAMA ──────────────────────────────────────────────────────────────
app.get('/api/cronograma', (_, res) => {
  const hj = hoje();
  const em2 = addDias(hj, 2);

  const pedidos = db.prepare(`SELECT * FROM pedidos WHERE status NOT IN ('Finalizado','Cancelado') ORDER BY data_entrega ASC`).all();
  const orcamentos = db.prepare(`SELECT * FROM orcamentos WHERE status='Em aberto' AND data_validade <= ? ORDER BY data_validade ASC`).all(em2);

  res.json({ pedidos, orcamentos_vencendo: orcamentos });
});

// ─── DASHBOARD ───────────────────────────────────────────────────────────────
app.get('/api/dashboard', (_, res) => {
  const hj = hoje();
  const inicio_mes = `${hj.slice(0, 7)}-01`;
  const fim_mes = addDias(inicio_mes.slice(0, 7).replace('-', '-') + '-01', 31).slice(0, 7) + '-' + String(ultimoDiaMes(...hj.slice(0, 7).split('-').map(Number))).padStart(2, '0');

  const pedidos_ativos = db.prepare(`SELECT COUNT(*) as c FROM pedidos WHERE status NOT IN ('Finalizado','Cancelado')`).get().c;
  const entrega_hoje = db.prepare(`SELECT COUNT(*) as c FROM pedidos WHERE data_entrega=? AND status NOT IN ('Finalizado','Cancelado')`).get(hj).c;
  const materiais_baixos = db.prepare(`SELECT COUNT(*) as c FROM materiais WHERE estoque_atual <= estoque_minimo AND estoque_minimo > 0`).get().c;
  const orcamentos_vencendo = db.prepare(`SELECT COUNT(*) as c FROM orcamentos WHERE status='Em aberto' AND data_validade <= ?`).get(addDias(hj, 2)).c;
  const contas_vencendo = db.prepare(`SELECT COUNT(*) as c FROM despesas_fixas_lancamentos WHERE pago=0 AND data_vencimento <= ?`).get(addDias(hj, 3)).c + db.prepare(`SELECT COUNT(*) as c FROM despesas_variaveis WHERE pago=0 AND data_vencimento <= ?`).get(addDias(hj, 3)).c;

  res.json({ pedidos_ativos, entrega_hoje, materiais_baixos, orcamentos_vencendo, contas_vencendo });
});

// ─── Fallback SPA ────────────────────────────────────────────────────────────
app.get('*', (_, res) => res.sendFile(path.join(__dirname, 'client', 'index.html')));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`GSIM rodando na porta ${PORT}`));
