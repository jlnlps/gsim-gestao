const express = require('express');
const cors = require('cors');
const path = require('path');
const { run, get, all, init } = require('./database');

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'client')));

const uid = (p) => `${p}${Date.now().toString().slice(-6)}`;
const hoje = () => new Date().toISOString().slice(0,10);
const addDias = (data, dias) => { const d = new Date(data+'T00:00:00'); d.setDate(d.getDate()+dias); return d.toISOString().slice(0,10); };
const ultimoDiaMes = (ano, mes) => new Date(ano, mes, 0).getDate();

// ── FORNECEDORES ─────────────────────────────────────────────────────────────
app.get('/api/fornecedores', async (_, res) => res.json(await all('SELECT * FROM fornecedores ORDER BY nome_empresa')));
app.post('/api/fornecedores', async (req, res) => {
  const { nome_empresa, nome_contato, telefone, email } = req.body;
  const r = await run('INSERT INTO fornecedores (nome_empresa,nome_contato,telefone,email) VALUES (?,?,?,?)', [nome_empresa, nome_contato||null, telefone||null, email||null]);
  res.json({ id: r.lastID });
});
app.put('/api/fornecedores/:id', async (req, res) => {
  const { nome_empresa, nome_contato, telefone, email } = req.body;
  await run('UPDATE fornecedores SET nome_empresa=?,nome_contato=?,telefone=?,email=? WHERE id=?', [nome_empresa, nome_contato||null, telefone||null, email||null, req.params.id]);
  res.json({ ok: true });
});
app.delete('/api/fornecedores/:id', async (req, res) => { await run('DELETE FROM fornecedores WHERE id=?', [req.params.id]); res.json({ ok: true }); });
app.get('/api/fornecedores/:id/compras', async (req, res) => res.json(await all('SELECT c.*,m.nome as material_nome,m.unidade_display FROM compras c JOIN materiais m ON c.material_id=m.id WHERE c.fornecedor_id=? ORDER BY c.data_compra DESC', [req.params.id])));

// ── MATERIAIS ─────────────────────────────────────────────────────────────────
app.get('/api/materiais', async (_, res) => res.json(await all('SELECT * FROM materiais ORDER BY nome')));
app.post('/api/materiais', async (req, res) => {
  const { nome, tipo, especificacao, estoque_minimo, unidade_display } = req.body;
  const r = await run('INSERT INTO materiais (nome,tipo,especificacao,estoque_minimo,unidade_display) VALUES (?,?,?,?,?)', [nome, tipo, especificacao||null, estoque_minimo||0, unidade_display]);
  res.json({ id: r.lastID });
});
app.put('/api/materiais/:id', async (req, res) => {
  const { nome, especificacao, estoque_minimo, custo_medio } = req.body;
  await run('UPDATE materiais SET nome=?,especificacao=?,estoque_minimo=?,custo_medio=? WHERE id=?', [nome, especificacao||null, estoque_minimo||0, custo_medio||0, req.params.id]);
  res.json({ ok: true });
});
app.get('/api/materiais/:id/movimentos', async (req, res) => res.json(await all('SELECT em.*,p.numero as pedido_numero FROM estoque_movimentos em LEFT JOIN pedidos p ON em.pedido_id=p.id WHERE em.material_id=? ORDER BY em.criado_em DESC LIMIT 50', [req.params.id])));

// ── COMPRAS ───────────────────────────────────────────────────────────────────
app.post('/api/compras', async (req, res) => {
  const { fornecedor_id, material_id, quantidade, valor_total, data_compra, observacao } = req.body;
  const custo_unitario = valor_total / quantidade;
  const r = await run('INSERT INTO compras (fornecedor_id,material_id,quantidade,valor_total,custo_unitario,data_compra,observacao) VALUES (?,?,?,?,?,?,?)', [fornecedor_id||null, material_id, quantidade, valor_total, custo_unitario, data_compra, observacao||null]);
  const compra_id = r.lastID;
  const mat = await get('SELECT * FROM materiais WHERE id=?', [material_id]);
  const novo_estoque = mat.estoque_atual + quantidade;
  const novo_custo = novo_estoque > 0 ? ((mat.estoque_atual * mat.custo_medio) + (quantidade * custo_unitario)) / novo_estoque : custo_unitario;
  await run('UPDATE materiais SET estoque_atual=?,custo_medio=? WHERE id=?', [novo_estoque, novo_custo, material_id]);
  await run('INSERT INTO estoque_movimentos (material_id,tipo,quantidade,custo_unitario,compra_id,observacao) VALUES (?,?,?,?,?,?)', [material_id,'entrada',quantidade,custo_unitario,compra_id,`Compra #${compra_id}`]);
  await run('INSERT INTO despesas_variaveis (descricao,categoria,valor,data_despesa,data_vencimento,pago,compra_id) VALUES (?,?,?,?,?,?,?)', [`Compra de material: ${mat.nome}`,'Material',valor_total,data_compra,data_compra,1,compra_id]);
  res.json({ id: compra_id });
});

// ── ORÇAMENTOS ────────────────────────────────────────────────────────────────
app.get('/api/orcamentos', async (req, res) => {
  const { status } = req.query;
  const rows = status ? await all('SELECT * FROM orcamentos WHERE status=? ORDER BY criado_em DESC', [status]) : await all('SELECT * FROM orcamentos ORDER BY criado_em DESC');
  res.json(rows);
});
app.get('/api/orcamentos/:id', async (req, res) => {
  const orc = await get('SELECT * FROM orcamentos WHERE id=?', [req.params.id]);
  if (!orc) return res.status(404).json({ error: 'Não encontrado' });
  orc.itens = await all('SELECT * FROM orcamento_itens WHERE orcamento_id=? ORDER BY id', [orc.id]);
  res.json(orc);
});
app.post('/api/orcamentos', async (req, res) => {
  const { cliente_nome, cliente_tel, cliente_empresa, cliente_documento_tipo, cliente_documento, itens, desconto_tipo, desconto_valor, observacoes, validade_dias } = req.body;
  const data_orc = hoje(); const val_dias = validade_dias||7; const data_val = addDias(data_orc, val_dias); const numero = uid('ORC');
  const valor_total = itens.reduce((s,i) => s+(parseFloat(i.preco_total)||0), 0);
  let valor_final = valor_total;
  if (desconto_tipo==='percentual' && desconto_valor) valor_final = valor_total*(1-desconto_valor/100);
  if (desconto_tipo==='valor' && desconto_valor) valor_final = valor_total-desconto_valor;
  const r = await run('INSERT INTO orcamentos (numero,cliente_nome,cliente_tel,cliente_empresa,cliente_documento_tipo,cliente_documento,data_orcamento,data_validade,validade_dias,desconto_tipo,desconto_valor,valor_total,valor_final,observacoes) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)', [numero,cliente_nome,cliente_tel,cliente_empresa||null,cliente_documento_tipo||null,cliente_documento||null,data_orc,data_val,val_dias,desconto_tipo||null,desconto_valor||0,valor_total,valor_final,observacoes||null]);
  const orc_id = r.lastID;
  for (const item of itens) {
    await run('INSERT INTO orcamento_itens (orcamento_id,tipo_servico,descricao,quantidade,unidade,largura,altura,area_m2,metros_lineares,perimetro_ml,material_id,material_quantidade,material_id2,material_quantidade2,acabamento,especificacoes,preco_referencia,preco_unitario,preco_total,terceirizado) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)', [orc_id,item.tipo_servico,item.descricao||null,item.quantidade||1,item.unidade||null,item.largura||null,item.altura||null,item.area_m2||null,item.metros_lineares||null,item.perimetro_ml||null,item.material_id||null,item.material_quantidade||null,item.material_id2||null,item.material_quantidade2||null,item.acabamento||null,item.especificacoes?JSON.stringify(item.especificacoes):null,item.preco_referencia||null,item.preco_unitario||null,item.preco_total||null,item.terceirizado?1:0]);
  }
  res.json({ id: orc_id, numero });
});
app.post('/api/orcamentos/:id/nova-versao', async (req, res) => {
  const pai = await get('SELECT * FROM orcamentos WHERE id=?', [req.params.id]);
  if (!pai) return res.status(404).json({ error: 'Não encontrado' });
  const itens = await all('SELECT * FROM orcamento_itens WHERE orcamento_id=?', [pai.id]);
  const numero = uid('ORC'); const data_orc = hoje(); const data_val = addDias(data_orc, pai.validade_dias||7);
  const r = await run('INSERT INTO orcamentos (numero,cliente_nome,cliente_tel,cliente_empresa,cliente_documento_tipo,cliente_documento,data_orcamento,data_validade,validade_dias,desconto_tipo,desconto_valor,valor_total,valor_final,observacoes,versao,orcamento_pai_id) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)', [numero,pai.cliente_nome,pai.cliente_tel,pai.cliente_empresa,pai.cliente_documento_tipo,pai.cliente_documento,data_orc,data_val,pai.validade_dias,pai.desconto_tipo,pai.desconto_valor,pai.valor_total,pai.valor_final,pai.observacoes,(pai.versao||1)+1,pai.id]);
  const orc_id = r.lastID;
  for (const item of itens) {
    await run('INSERT INTO orcamento_itens (orcamento_id,tipo_servico,descricao,quantidade,unidade,largura,altura,area_m2,metros_lineares,perimetro_ml,material_id,material_quantidade,material_id2,material_quantidade2,acabamento,especificacoes,preco_referencia,preco_unitario,preco_total,terceirizado) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)', [orc_id,item.tipo_servico,item.descricao,item.quantidade,item.unidade,item.largura,item.altura,item.area_m2,item.metros_lineares,item.perimetro_ml,item.material_id,item.material_quantidade,item.material_id2,item.material_quantidade2,item.acabamento,item.especificacoes,item.preco_referencia,item.preco_unitario,item.preco_total,item.terceirizado]);
  }
  res.json({ id: orc_id, numero });
});
app.patch('/api/orcamentos/:id/status', async (req, res) => { await run('UPDATE orcamentos SET status=? WHERE id=?', [req.body.status, req.params.id]); res.json({ ok: true }); });
app.post('/api/orcamentos/:id/converter', async (req, res) => {
  const { data_entrega, forma_pagamento, valor_sinal } = req.body;
  const orc = await get('SELECT * FROM orcamentos WHERE id=?', [req.params.id]);
  if (!orc) return res.status(404).json({ error: 'Não encontrado' });
  const itens = await all('SELECT * FROM orcamento_itens WHERE orcamento_id=?', [orc.id]);
  const numero = uid('PED');
  const r = await run('INSERT INTO pedidos (numero,orcamento_id,cliente_nome,cliente_tel,cliente_empresa,cliente_documento_tipo,cliente_documento,data_entrada,data_entrega,forma_pagamento,valor_total,valor_sinal,observacoes) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)', [numero,orc.id,orc.cliente_nome,orc.cliente_tel,orc.cliente_empresa,orc.cliente_documento_tipo,orc.cliente_documento,hoje(),data_entrega,forma_pagamento||null,orc.valor_final,valor_sinal||0,orc.observacoes]);
  const ped_id = r.lastID;
  for (const item of itens) {
    await run('INSERT INTO pedido_itens (pedido_id,tipo_servico,descricao,quantidade,unidade,largura,altura,area_m2,metros_lineares,perimetro_ml,material_id,material_quantidade,material_id2,material_quantidade2,acabamento,especificacoes,preco_unitario,preco_total,terceirizado) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)', [ped_id,item.tipo_servico,item.descricao,item.quantidade,item.unidade,item.largura,item.altura,item.area_m2,item.metros_lineares,item.perimetro_ml,item.material_id,item.material_quantidade,item.material_id2,item.material_quantidade2,item.acabamento,item.especificacoes,item.preco_unitario,item.preco_total,item.terceirizado]);
    if (!item.terceirizado) {
      if (item.material_id && item.material_quantidade) {
        const mat = await get('SELECT * FROM materiais WHERE id=?', [item.material_id]);
        if (mat) { await run('UPDATE materiais SET estoque_atual=? WHERE id=?', [mat.estoque_atual-item.material_quantidade, item.material_id]); await run('INSERT INTO estoque_movimentos (material_id,tipo,quantidade,pedido_id) VALUES (?,?,?,?)', [item.material_id,'saida',item.material_quantidade,ped_id]); }
      }
    }
  }
  await run('UPDATE orcamentos SET status=?,pedido_id=? WHERE id=?', ['Aprovado',ped_id,orc.id]);
  res.json({ ped_id, numero });
});
app.post('/api/orcamentos/preco-referencia', async (req, res) => {
  const { tipo_servico, material_id, material_quantidade } = req.body;
  let custo_material = 0;
  if (material_id && material_quantidade) { const mat = await get('SELECT custo_medio FROM materiais WHERE id=?', [material_id]); if (mat) custo_material += mat.custo_medio * material_quantidade; }
  const historico = await get('SELECT AVG(preco_total/NULLIF(area_m2,0)) as media_m2, AVG(preco_total) as media_total FROM orcamento_itens WHERE tipo_servico=? AND preco_total>0', [tipo_servico]);
  res.json({ custo_material, sugestao: custo_material>0 ? custo_material*3 : null, historico });
});

// ── PEDIDOS ───────────────────────────────────────────────────────────────────
app.get('/api/pedidos', async (req, res) => {
  const { status, q } = req.query;
  let sql = 'SELECT * FROM pedidos WHERE 1=1'; const params = [];
  if (status && status!=='todos') { sql+=' AND status=?'; params.push(status); }
  if (q) { sql+=' AND (cliente_nome LIKE ? OR numero LIKE ?)'; params.push(`%${q}%`,`%${q}%`); }
  sql += ' ORDER BY criado_em DESC';
  res.json(await all(sql, params));
});
app.get('/api/pedidos/:id', async (req, res) => {
  const ped = await get('SELECT * FROM pedidos WHERE id=?', [req.params.id]);
  if (!ped) return res.status(404).json({ error: 'Não encontrado' });
  ped.itens = await all('SELECT pi.*,m.nome as material_nome,m.unidade_display,m2.nome as material_nome2 FROM pedido_itens pi LEFT JOIN materiais m ON pi.material_id=m.id LEFT JOIN materiais m2 ON pi.material_id2=m2.id WHERE pi.pedido_id=? ORDER BY pi.id', [ped.id]);
  res.json(ped);
});
app.post('/api/pedidos', async (req, res) => {
  const { cliente_nome, cliente_tel, cliente_empresa, cliente_documento_tipo, cliente_documento, data_entrada, data_entrega, forma_pagamento, valor_sinal, observacoes, itens } = req.body;
  const numero = uid('PED');
  const valor_total = itens.reduce((s,i) => s+(parseFloat(i.preco_total)||0), 0);
  const r = await run('INSERT INTO pedidos (numero,cliente_nome,cliente_tel,cliente_empresa,cliente_documento_tipo,cliente_documento,data_entrada,data_entrega,forma_pagamento,valor_total,valor_sinal,observacoes) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)', [numero,cliente_nome,cliente_tel,cliente_empresa||null,cliente_documento_tipo||null,cliente_documento||null,data_entrada,data_entrega,forma_pagamento||null,valor_total,valor_sinal||0,observacoes||null]);
  const ped_id = r.lastID;
  for (const item of itens) {
    await run('INSERT INTO pedido_itens (pedido_id,tipo_servico,descricao,quantidade,unidade,largura,altura,area_m2,metros_lineares,perimetro_ml,material_id,material_quantidade,material_id2,material_quantidade2,acabamento,especificacoes,preco_unitario,preco_total,terceirizado) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)', [ped_id,item.tipo_servico,item.descricao||null,item.quantidade||1,item.unidade||null,item.largura||null,item.altura||null,item.area_m2||null,item.metros_lineares||null,item.perimetro_ml||null,item.material_id||null,item.material_quantidade||null,item.material_id2||null,item.material_quantidade2||null,item.acabamento||null,item.especificacoes?JSON.stringify(item.especificacoes):null,item.preco_unitario||null,item.preco_total||null,item.terceirizado?1:0]);
    if (!item.terceirizado && item.material_id && item.material_quantidade) {
      const mat = await get('SELECT * FROM materiais WHERE id=?', [item.material_id]);
      if (mat) { await run('UPDATE materiais SET estoque_atual=? WHERE id=?', [mat.estoque_atual-item.material_quantidade, item.material_id]); await run('INSERT INTO estoque_movimentos (material_id,tipo,quantidade,pedido_id) VALUES (?,?,?,?)', [item.material_id,'saida',item.material_quantidade,ped_id]); }
    }
  }
  res.json({ id: ped_id, numero });
});
app.patch('/api/pedidos/:id/status', async (req, res) => { await run('UPDATE pedidos SET status=? WHERE id=?', [req.body.status, req.params.id]); res.json({ ok: true }); });
app.patch('/api/pedidos/:id/pagamento', async (req, res) => { await run('UPDATE pedidos SET sinal_pago=?,saldo_pago=? WHERE id=?', [req.body.sinal_pago?1:0, req.body.saldo_pago?1:0, req.params.id]); res.json({ ok: true }); });
app.get('/api/pedidos/:id/nf', async (req, res) => {
  const ped = await get('SELECT * FROM pedidos WHERE id=?', [req.params.id]);
  if (!ped) return res.status(404).json({ error: 'Não encontrado' });
  const itens = await all('SELECT * FROM pedido_itens WHERE pedido_id=?', [ped.id]);
  const linhas = itens.map(i => `${[i.tipo_servico,i.descricao].filter(Boolean).join(' - ')} | Qtd: ${i.quantidade} ${i.unidade||'un'} | Unit: R$ ${Number(i.preco_unitario||0).toFixed(2)} | Total: R$ ${Number(i.preco_total||0).toFixed(2)}`);
  const texto = `DESCRIÇÃO PARA NFS-e\n\nPedido: ${ped.numero}\nCliente: ${ped.cliente_nome}${ped.cliente_empresa?' / '+ped.cliente_empresa:''}${ped.cliente_documento?'\n'+ped.cliente_documento_tipo+': '+ped.cliente_documento:''}\n\nSERVIÇOS:\n${linhas.join('\n')}\n\nTOTAL: R$ ${Number(ped.valor_total||0).toFixed(2)}\n\nGsim Comunicação Visual`;
  await run('UPDATE pedidos SET nf_gerada=1 WHERE id=?', [ped.id]);
  res.json({ texto });
});

// ── FINANCEIRO ────────────────────────────────────────────────────────────────
app.get('/api/despesas-fixas', async (_, res) => res.json(await all('SELECT * FROM despesas_fixas WHERE ativo=1 ORDER BY dia_vencimento')));
app.post('/api/despesas-fixas', async (req, res) => {
  const { descricao, valor, dia_vencimento } = req.body;
  const r = await run('INSERT INTO despesas_fixas (descricao,valor,dia_vencimento) VALUES (?,?,?)', [descricao, valor, dia_vencimento]);
  res.json({ id: r.lastID });
});
app.put('/api/despesas-fixas/:id', async (req, res) => { const { descricao, valor, dia_vencimento, ativo } = req.body; await run('UPDATE despesas_fixas SET descricao=?,valor=?,dia_vencimento=?,ativo=? WHERE id=?', [descricao,valor,dia_vencimento,ativo?1:0,req.params.id]); res.json({ ok: true }); });
app.post('/api/despesas-fixas/gerar-mes', async (req, res) => {
  const { mes_ano } = req.body; const [ano,mes] = mes_ano.split('-').map(Number);
  const fixas = await all('SELECT * FROM despesas_fixas WHERE ativo=1');
  let gerados = 0;
  for (const f of fixas) {
    const existe = await get('SELECT id FROM despesas_fixas_lancamentos WHERE despesa_fixa_id=? AND mes_ano=?', [f.id, mes_ano]);
    if (!existe) { const dia = Math.min(f.dia_vencimento, ultimoDiaMes(ano,mes)); await run('INSERT INTO despesas_fixas_lancamentos (despesa_fixa_id,mes_ano,valor,data_vencimento) VALUES (?,?,?,?)', [f.id,mes_ano,f.valor,`${mes_ano}-${String(dia).padStart(2,'0')}`]); gerados++; }
  }
  res.json({ gerados });
});
app.get('/api/despesas-fixas/lancamentos', async (req, res) => {
  const { mes_ano } = req.query;
  const rows = mes_ano ? await all('SELECT dfl.*,df.descricao FROM despesas_fixas_lancamentos dfl JOIN despesas_fixas df ON dfl.despesa_fixa_id=df.id WHERE dfl.mes_ano=? ORDER BY dfl.data_vencimento', [mes_ano]) : await all('SELECT dfl.*,df.descricao FROM despesas_fixas_lancamentos dfl JOIN despesas_fixas df ON dfl.despesa_fixa_id=df.id ORDER BY dfl.data_vencimento');
  res.json(rows);
});
app.patch('/api/despesas-fixas/lancamentos/:id/pagar', async (req, res) => { await run('UPDATE despesas_fixas_lancamentos SET pago=1,data_pagamento=? WHERE id=?', [hoje(),req.params.id]); res.json({ ok: true }); });
app.get('/api/despesas-variaveis', async (req, res) => {
  const { mes_ano, pago } = req.query; let sql = 'SELECT * FROM despesas_variaveis WHERE 1=1'; const params = [];
  if (mes_ano) { sql+=" AND strftime('%Y-%m',data_despesa)=?"; params.push(mes_ano); }
  if (pago !== undefined) { sql+=' AND pago=?'; params.push(parseInt(pago)); }
  res.json(await all(sql+' ORDER BY data_vencimento,data_despesa', params));
});
app.post('/api/despesas-variaveis', async (req, res) => {
  const { descricao, categoria, valor, data_despesa, data_vencimento, pago } = req.body;
  const r = await run('INSERT INTO despesas_variaveis (descricao,categoria,valor,data_despesa,data_vencimento,pago) VALUES (?,?,?,?,?,?)', [descricao,categoria||null,valor,data_despesa,data_vencimento||data_despesa,pago?1:0]);
  res.json({ id: r.lastID });
});
app.patch('/api/despesas-variaveis/:id/pagar', async (req, res) => { await run('UPDATE despesas_variaveis SET pago=1,data_pagamento=? WHERE id=?', [hoje(),req.params.id]); res.json({ ok: true }); });

app.get('/api/financeiro/balanco', async (req, res) => {
  const { data_inicio, data_fim } = req.query;
  const er = await get('SELECT COALESCE(SUM(CASE WHEN sinal_pago=1 THEN valor_sinal ELSE 0 END)+SUM(CASE WHEN saldo_pago=1 THEN (valor_total-valor_sinal) ELSE 0 END),0) as total FROM pedidos WHERE data_entrada BETWEEN ? AND ?', [data_inicio,data_fim]);
  const ar = await get("SELECT COALESCE(SUM(CASE WHEN sinal_pago=0 THEN valor_sinal ELSE 0 END)+SUM(CASE WHEN saldo_pago=0 THEN (valor_total-valor_sinal) ELSE 0 END),0) as total FROM pedidos WHERE status NOT IN ('Cancelado','Finalizado') AND data_entrega BETWEEN ? AND ?", [data_inicio,data_fim]);
  const dfp = await get('SELECT COALESCE(SUM(valor),0) as total FROM despesas_fixas_lancamentos WHERE pago=1 AND data_vencimento BETWEEN ? AND ?', [data_inicio,data_fim]);
  const dvp = await get('SELECT COALESCE(SUM(valor),0) as total FROM despesas_variaveis WHERE pago=1 AND data_despesa BETWEEN ? AND ?', [data_inicio,data_fim]);
  const dfpend = await get('SELECT COALESCE(SUM(valor),0) as total FROM despesas_fixas_lancamentos WHERE pago=0 AND data_vencimento BETWEEN ? AND ?', [data_inicio,data_fim]);
  const dvpend = await get('SELECT COALESCE(SUM(valor),0) as total FROM despesas_variaveis WHERE pago=0 AND data_vencimento BETWEEN ? AND ?', [data_inicio,data_fim]);
  const cm = await get('SELECT COALESCE(SUM(em.quantidade*em.custo_unitario),0) as total FROM estoque_movimentos em JOIN pedidos p ON em.pedido_id=p.id WHERE em.tipo=\'saida\' AND p.data_entrada BETWEEN ? AND ?', [data_inicio,data_fim]);
  const total_desp = dfp.total+dvp.total+cm.total;
  res.json({ entradas_recebidas:er.total, a_receber:ar.total, despesas_pagas:total_desp, despesas_fixas_pagas:dfp.total, despesas_variaveis_pagas:dvp.total, custo_materiais:cm.total, a_pagar:dfpend.total+dvpend.total, lucro_liquido:er.total-total_desp });
});

app.get('/api/financeiro/projecao', async (_, res) => {
  const meses = []; const agora = new Date();
  for (let i = 0; i < 6; i++) {
    const d = new Date(agora.getFullYear(), agora.getMonth()+i, 1);
    const ma = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`;
    const inicio = `${ma}-01`; const fim = `${ma}-${String(ultimoDiaMes(d.getFullYear(),d.getMonth()+1)).padStart(2,'0')}`;
    const entradas = await get("SELECT COALESCE(SUM(valor_total-valor_sinal),0) as total FROM pedidos WHERE saldo_pago=0 AND data_entrega BETWEEN ? AND ? AND status NOT IN ('Cancelado')", [inicio,fim]);
    const desp_fixas = await get('SELECT COALESCE(SUM(valor),0) as total FROM despesas_fixas WHERE ativo=1');
    meses.push({ mes_ano:ma, entradas_esperadas:entradas.total, despesas_fixas:desp_fixas.total, saldo_projetado:entradas.total-desp_fixas.total });
  }
  res.json(meses);
});

app.get('/api/financeiro/contas-a-pagar', async (req, res) => {
  const { filtro } = req.query; const hj = hoje(); const em7 = addDias(hj,7);
  let fixas, vars;
  if (filtro==='hoje') {
    fixas = await all("SELECT 'fixa' as origem,dfl.id,df.descricao,dfl.valor,dfl.data_vencimento,dfl.pago FROM despesas_fixas_lancamentos dfl JOIN despesas_fixas df ON dfl.despesa_fixa_id=df.id WHERE dfl.pago=0 AND dfl.data_vencimento=?", [hj]);
    vars = await all("SELECT 'variavel' as origem,id,descricao,valor,data_vencimento,pago FROM despesas_variaveis WHERE pago=0 AND data_vencimento=?", [hj]);
  } else if (filtro==='semana') {
    fixas = await all("SELECT 'fixa' as origem,dfl.id,df.descricao,dfl.valor,dfl.data_vencimento,dfl.pago FROM despesas_fixas_lancamentos dfl JOIN despesas_fixas df ON dfl.despesa_fixa_id=df.id WHERE dfl.pago=0 AND dfl.data_vencimento BETWEEN ? AND ?", [hj,em7]);
    vars = await all("SELECT 'variavel' as origem,id,descricao,valor,data_vencimento,pago FROM despesas_variaveis WHERE pago=0 AND data_vencimento BETWEEN ? AND ?", [hj,em7]);
  } else if (filtro==='vencidas') {
    fixas = await all("SELECT 'fixa' as origem,dfl.id,df.descricao,dfl.valor,dfl.data_vencimento,dfl.pago FROM despesas_fixas_lancamentos dfl JOIN despesas_fixas df ON dfl.despesa_fixa_id=df.id WHERE dfl.pago=0 AND dfl.data_vencimento<?", [hj]);
    vars = await all("SELECT 'variavel' as origem,id,descricao,valor,data_vencimento,pago FROM despesas_variaveis WHERE pago=0 AND data_vencimento<?", [hj]);
  } else {
    fixas = await all("SELECT 'fixa' as origem,dfl.id,df.descricao,dfl.valor,dfl.data_vencimento,dfl.pago FROM despesas_fixas_lancamentos dfl JOIN despesas_fixas df ON dfl.despesa_fixa_id=df.id WHERE dfl.pago=0 ORDER BY dfl.data_vencimento");
    vars = await all("SELECT 'variavel' as origem,id,descricao,valor,data_vencimento,pago FROM despesas_variaveis WHERE pago=0 ORDER BY data_vencimento");
  }
  res.json([...fixas,...vars].sort((a,b) => (a.data_vencimento||'').localeCompare(b.data_vencimento||'')));
});

// ── CRONOGRAMA ────────────────────────────────────────────────────────────────
app.get('/api/cronograma', async (_, res) => {
  const em2 = addDias(hoje(),2);
  const pedidos = await all("SELECT * FROM pedidos WHERE status NOT IN ('Finalizado','Cancelado') ORDER BY data_entrega ASC");
  const orcamentos = await all("SELECT * FROM orcamentos WHERE status='Em aberto' AND data_validade<=? ORDER BY data_validade ASC", [em2]);
  res.json({ pedidos, orcamentos_vencendo: orcamentos });
});

// ── DASHBOARD ─────────────────────────────────────────────────────────────────
app.get('/api/dashboard', async (_, res) => {
  const hj = hoje(); const em3 = addDias(hj,3); const em2 = addDias(hj,2);
  const pa = await get("SELECT COUNT(*) as c FROM pedidos WHERE status NOT IN ('Finalizado','Cancelado')");
  const eh = await get("SELECT COUNT(*) as c FROM pedidos WHERE data_entrega=? AND status NOT IN ('Finalizado','Cancelado')", [hj]);
  const mb = await get('SELECT COUNT(*) as c FROM materiais WHERE estoque_atual<=estoque_minimo AND estoque_minimo>0');
  const ov = await get("SELECT COUNT(*) as c FROM orcamentos WHERE status='Em aberto' AND data_validade<=?", [em2]);
  const cv1 = await get('SELECT COUNT(*) as c FROM despesas_fixas_lancamentos WHERE pago=0 AND data_vencimento<=?', [em3]);
  const cv2 = await get('SELECT COUNT(*) as c FROM despesas_variaveis WHERE pago=0 AND data_vencimento<=?', [em3]);
  res.json({ pedidos_ativos:pa.c, entrega_hoje:eh.c, materiais_baixos:mb.c, orcamentos_vencendo:ov.c, contas_vencendo:cv1.c+cv2.c });
});

app.get('*', (_, res) => res.sendFile(path.join(__dirname, 'client', 'index.html')));

const PORT = process.env.PORT || 3000;
init().then(() => {
  app.listen(PORT, () => console.log(`GSIM rodando na porta ${PORT}`));
}).catch(err => { console.error('Erro ao iniciar banco:', err); process.exit(1); });
