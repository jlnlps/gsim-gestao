const express = require('express');
const cors = require('cors');
const path = require('path');
const { run, get, all, init } = require('./database');

const app = express();
app.use(cors());
app.use(express.json());

const INDEX_HTML = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>GSIM — Comunicação Visual</title>
<script src="https://cdnjs.cloudflare.com/ajax/libs/react/18.2.0/umd/react.production.min.js"></script>
<script src="https://cdnjs.cloudflare.com/ajax/libs/react-dom/18.2.0/umd/react-dom.production.min.js"></script>
<script src="https://cdnjs.cloudflare.com/ajax/libs/babel-standalone/7.23.2/babel.min.js"></script>
<style>
  *{box-sizing:border-box;margin:0;padding:0}
  body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;background:#f4f4f5;color:#111;min-height:100vh}
  :root{--zinc-50:#fafafa;--zinc-100:#f4f4f5;--zinc-200:#e4e4e7;--zinc-300:#d4d4d8;--zinc-400:#a1a1aa;--zinc-500:#71717a;--zinc-700:#3f3f46;--zinc-800:#27272a;--zinc-900:#18181b;--green:#16a34a;--red:#dc2626;--blue:#2563eb;--yellow:#ca8a04;--orange:#ea580c}
  .btn{display:inline-flex;align-items:center;justify-content:center;gap:6px;padding:10px 16px;border-radius:10px;font-size:13px;font-weight:600;cursor:pointer;border:none;transition:all .15s}
  .btn-primary{background:var(--zinc-900);color:#fff}.btn-primary:hover{background:var(--zinc-700)}
  .btn-secondary{background:#fff;color:var(--zinc-800);border:1px solid var(--zinc-200)}.btn-secondary:hover{background:var(--zinc-50)}
  .btn-danger{background:#fee2e2;color:var(--red)}.btn-danger:hover{background:#fecaca}
  .btn-success{background:#dcfce7;color:var(--green)}.btn-success:hover{background:#bbf7d0}
  .btn:disabled{opacity:.4;cursor:not-allowed}
  .btn-sm{padding:6px 12px;font-size:12px;border-radius:8px}
  .card{background:#fff;border-radius:16px;border:1px solid var(--zinc-200);padding:16px}
  .inp{width:100%;border:1px solid var(--zinc-200);border-radius:10px;padding:9px 12px;font-size:13px;outline:none;transition:border .15s;background:#fff}
  .inp:focus{border-color:var(--zinc-400);box-shadow:0 0 0 3px rgba(0,0,0,.06)}
  .lbl{display:block;font-size:11px;font-weight:600;color:var(--zinc-500);margin-bottom:4px;text-transform:uppercase;letter-spacing:.3px}
  .badge{display:inline-flex;align-items:center;padding:2px 8px;border-radius:999px;font-size:11px;font-weight:600}
  .grid2{display:grid;grid-template-columns:1fr 1fr;gap:12px}
  .grid3{display:grid;grid-template-columns:1fr 1fr 1fr;gap:12px}
  select.inp{cursor:pointer}
  textarea.inp{resize:none}
  .section-title{font-size:10px;font-weight:700;letter-spacing:.8px;text-transform:uppercase;color:var(--zinc-400);margin-bottom:10px}
  .alert{padding:10px 14px;border-radius:10px;font-size:12px;font-weight:500}
  .alert-red{background:#fee2e2;color:#991b1b;border:1px solid #fecaca}
  .alert-yellow{background:#fef9c3;color:#854d0e;border:1px solid #fef08a}
  .alert-green{background:#dcfce7;color:#166534;border:1px solid #bbf7d0}
  @media print{.no-print{display:none!important}}
</style>
</head>
<body>
<div id="root"></div>
<script type="text/babel">
const {useState, useEffect, useCallback} = React;

// ── API ──────────────────────────────────────────────────────────────────────
const API = async (method, path, body) => {
  const r = await fetch(\`/api\${path}\`, {
    method, headers:{'Content-Type':'application/json'},
    body: body ? JSON.stringify(body) : undefined
  });
  return r.json();
};
const GET = p => API('GET', p);
const POST = (p,b) => API('POST', p, b);
const PATCH = (p,b) => API('PATCH', p, b);
const PUT = (p,b) => API('PUT', p, b);

// ── Helpers ──────────────────────────────────────────────────────────────────
const fmtBRL = v => Number(v||0).toLocaleString('pt-BR',{style:'currency',currency:'BRL'});
const fmtDate = d => {if(!d)return'—';const[y,m,dd]=d.split('-');return\`\${dd}/\${m}/\${y}\`};
const today = () => new Date().toISOString().slice(0,10);
const diffDays = (a,b) => Math.ceil((new Date(b)-new Date(a))/86400000);
const mesAtual = () => new Date().toISOString().slice(0,7);

const STATUS_PROD = ['Arte pendente','Arte em andamento','Arte finalizada','Aguardando impressão','Aguardando acabamento','Aguardando entrega','Finalizado','Cancelado'];
const STATUS_COLORS = {'Arte pendente':'#f4f4f5 #71717a','Arte em andamento':'#dbeafe #1d4ed8','Arte finalizada':'#ede9fe #6d28d9','Aguardando impressão':'#fef9c3 #854d0e','Aguardando acabamento':'#ffedd5 #c2410c','Aguardando entrega':'#d1fae5 #065f46','Finalizado':'#dcfce7 #166534','Cancelado':'#fee2e2 #991b1b'};
const getStatusStyle = s => { const [bg,color]=(STATUS_COLORS[s]||'#f4f4f5 #71717a').split(' '); return {background:bg,color}; };

const TIPOS_SERVICO = ['Banner / Lona','Placa','Cavalete','Adesivo / Vinil','Cartão de visita','Panfleto / Folder','Cópias / Impressão A4','Outro'];
const TERCEIRIZADOS = ['Cartão de visita','Panfleto / Folder','Cópias / Impressão A4'];

function Badge({status}){
  return <span className="badge" style={getStatusStyle(status)}>{status}</span>;
}

function StatusSelect({value, onChange}){
  return(
    <select className="inp" value={value} onChange={e=>onChange(e.target.value)} style={{fontSize:12,padding:'6px 10px'}}>
      {STATUS_PROD.map(s=><option key={s}>{s}</option>)}
    </select>
  );
}

// ── Formulário de Item ───────────────────────────────────────────────────────
function ItemForm({item, onChange, onRemove, materiais, showRemove}){
  const tipo = item.tipo_servico;
  const terc = TERCEIRIZADOS.includes(tipo) || tipo === 'Outro';
  const espec = item.especificacoes || {};

  const set = (k,v) => {
    const upd = {...item,[k]:v};
    // Calcular área automaticamente
    if((k==='largura'||k==='altura') && upd.largura && upd.altura){
      upd.area_m2 = parseFloat((upd.largura * upd.altura).toFixed(4));
      if(tipo==='Placa'||tipo==='Banner / Lona'||tipo==='Cavalete'){
        upd.perimetro_ml = parseFloat(((upd.largura+upd.altura)*2).toFixed(4));
      }
      // metros lineares de vinil = área / largura do rolo (definida no material)
      upd.metros_lineares = upd.largura; // provisório, refinado ao selecionar material
    }
    onChange(upd);
  };
  const setEspec = (k,v) => onChange({...item, especificacoes:{...espec,[k]:v}});

  // Filtra materiais relevantes
  const matLona = materiais.filter(m=>m.nome.toLowerCase().includes('lona'));
  const matVinil = (espec.acabamento_fosco||item.acabamento==='Fosco')?materiais.filter(m=>m.nome.toLowerCase().includes('fosco')):materiais.filter(m=>m.nome.toLowerCase().includes('brilhante'));
  const matPS = materiais.filter(m=>m.nome.toLowerCase().includes('ps'));
  const matChapa = materiais.filter(m=>m.nome.toLowerCase().includes('chapa')||m.nome.toLowerCase().includes('galvanizada'));
  const matMadeira = materiais.filter(m=>m.nome.toLowerCase().includes('madeira'));

  return(
    <div className="card" style={{background:'#fafafa',marginBottom:8}}>
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:12}}>
        <span className="section-title">Item</span>
        {showRemove&&<button className="btn btn-danger btn-sm" onClick={onRemove}>Remover</button>}
      </div>
      <div className="grid2" style={{marginBottom:10}}>
        <div>
          <label className="lbl">Tipo de serviço *</label>
          <select className="inp" value={tipo} onChange={e=>set('tipo_servico',e.target.value)}>
            {TIPOS_SERVICO.map(t=><option key={t}>{t}</option>)}
          </select>
        </div>
        <div>
          <label className="lbl">{terc?'Quantidade':'Quantidade'} {tipo==='Cópias / Impressão A4'?'(folhas)':tipo==='Cartão de visita'||tipo==='Panfleto / Folder'?'(unidades)':''}</label>
          <input className="inp" type="number" min="1" value={item.quantidade||1} onChange={e=>set('quantidade',parseFloat(e.target.value))}/>
        </div>
      </div>

      <div style={{marginBottom:10}}>
        <label className="lbl">Descrição / Observações</label>
        <input className="inp" value={item.descricao||''} onChange={e=>set('descricao',e.target.value)} placeholder="Cores, referências, detalhes..."/>
      </div>

      {/* Banner / Lona */}
      {tipo==='Banner / Lona'&&(
        <div>
          <div className="grid2" style={{marginBottom:10}}>
            <div><label className="lbl">Largura (m)</label><input className="inp" type="number" step="0.01" value={item.largura||''} onChange={e=>set('largura',parseFloat(e.target.value))} placeholder="ex: 2.0"/></div>
            <div><label className="lbl">Altura (m)</label><input className="inp" type="number" step="0.01" value={item.altura||''} onChange={e=>set('altura',parseFloat(e.target.value))} placeholder="ex: 1.0"/></div>
          </div>
          {item.area_m2&&<div className="alert alert-green" style={{marginBottom:10}}>Área: <strong>{item.area_m2} m²</strong> · Perímetro: <strong>{item.perimetro_ml} ml</strong></div>}
          <div className="grid2" style={{marginBottom:10}}>
            <div>
              <label className="lbl">Material (rolo)</label>
              <select className="inp" value={item.material_id||''} onChange={e=>set('material_id',parseInt(e.target.value)||null)}>
                <option value="">Definir na produção</option>
                {matLona.map(m=><option key={m.id} value={m.id}>{m.nome} ({m.especificacao})</option>)}
              </select>
            </div>
            <div>
              <label className="lbl">Acabamento</label>
              <select className="inp" value={item.acabamento||''} onChange={e=>set('acabamento',e.target.value)}>
                <option value="">Sem acabamento</option>
                <option>Madeirinha</option><option>Ilhós</option><option>Ambos</option>
              </select>
            </div>
          </div>
          {(item.acabamento==='Ilhós'||item.acabamento==='Ambos')&&(
            <div style={{marginBottom:10}}><label className="lbl">Quantidade de ilhós</label><input className="inp" type="number" value={espec.qtd_ilhos||''} onChange={e=>setEspec('qtd_ilhos',e.target.value)}/></div>
          )}
        </div>
      )}

      {/* Placa */}
      {tipo==='Placa'&&(
        <div>
          <div className="grid2" style={{marginBottom:10}}>
            <div><label className="lbl">Largura (m)</label><input className="inp" type="number" step="0.01" value={item.largura||''} onChange={e=>set('largura',parseFloat(e.target.value))}/></div>
            <div><label className="lbl">Altura (m)</label><input className="inp" type="number" step="0.01" value={item.altura||''} onChange={e=>set('altura',parseFloat(e.target.value))}/></div>
          </div>
          {item.area_m2&&<div className="alert alert-green" style={{marginBottom:10}}>Área: <strong>{item.area_m2} m²</strong> · Perímetro moldura: <strong>{item.perimetro_ml} ml</strong></div>}
          <div className="grid2" style={{marginBottom:10}}>
            <div>
              <label className="lbl">Material *</label>
              <select className="inp" value={espec.material_placa||''} onChange={e=>setEspec('material_placa',e.target.value)}>
                <option value="">Selecione</option><option>Aço (chapa galvanizada)</option><option>PS (poliestireno)</option>
              </select>
            </div>
            <div>
              <label className="lbl">Com moldura?</label>
              <select className="inp" value={espec.com_moldura||'Não'} onChange={e=>setEspec('com_moldura',e.target.value)}>
                <option>Não</option><option>Sim</option>
              </select>
            </div>
          </div>
          {espec.material_placa==='Aço (chapa galvanizada)'&&(
            <div style={{marginBottom:10}}><label className="lbl">Chapa (selecionar rolo)</label>
            <select className="inp" value={item.material_id||''} onChange={e=>set('material_id',parseInt(e.target.value)||null)}>
              <option value="">Definir na produção</option>
              {matChapa.map(m=><option key={m.id} value={m.id}>{m.nome} ({m.especificacao})</option>)}
            </select></div>
          )}
          {espec.material_placa==='PS (poliestireno)'&&(
            <div style={{marginBottom:10}}><label className="lbl">PS (selecionar espessura)</label>
            <select className="inp" value={item.material_id||''} onChange={e=>set('material_id',parseInt(e.target.value)||null)}>
              <option value="">Definir na produção</option>
              {matPS.map(m=><option key={m.id} value={m.id}>{m.nome} ({m.especificacao})</option>)}
            </select></div>
          )}
          <div style={{marginBottom:10}}>
            <label className="lbl">Acabamento</label>
            <select className="inp" value={item.acabamento||''} onChange={e=>set('acabamento',e.target.value)}>
              <option value="">Sem acabamento</option><option>Madeirinha</option><option>Ilhós</option><option>Ambos</option>
            </select>
          </div>
        </div>
      )}

      {/* Cavalete */}
      {tipo==='Cavalete'&&(
        <div>
          <div className="grid2" style={{marginBottom:10}}>
            <div><label className="lbl">Largura (m)</label><input className="inp" type="number" step="0.01" value={item.largura||''} onChange={e=>set('largura',parseFloat(e.target.value))}/></div>
            <div><label className="lbl">Altura (m)</label><input className="inp" type="number" step="0.01" value={item.altura||''} onChange={e=>set('altura',parseFloat(e.target.value))}/></div>
          </div>
          {item.area_m2&&<div className="alert alert-green" style={{marginBottom:10}}>Área por lado: <strong>{item.area_m2} m²</strong> · {espec.lados==='2 lados'?<span>Total lona (2 lados): <strong>{(item.area_m2*2).toFixed(4)} m²</strong></span>:null}</div>}
          <div className="grid3" style={{marginBottom:10}}>
            <div>
              <label className="lbl">Lados</label>
              <select className="inp" value={espec.lados||'1 lado'} onChange={e=>setEspec('lados',e.target.value)}>
                <option>1 lado</option><option>2 lados</option>
              </select>
            </div>
            <div>
              <label className="lbl">Rolo de lona</label>
              <select className="inp" value={item.material_id||''} onChange={e=>set('material_id',parseInt(e.target.value)||null)}>
                <option value="">Definir na produção</option>
                {matLona.map(m=><option key={m.id} value={m.id}>{m.nome}</option>)}
              </select>
            </div>
            <div>
              <label className="lbl">Madeira</label>
              <select className="inp" value={item.material_id2||''} onChange={e=>set('material_id2',parseInt(e.target.value)||null)}>
                <option value="">Sem madeira</option>
                {matMadeira.map(m=><option key={m.id} value={m.id}>{m.nome}</option>)}
              </select>
            </div>
          </div>
        </div>
      )}

      {/* Adesivo */}
      {tipo==='Adesivo / Vinil'&&(
        <div>
          <div className="grid2" style={{marginBottom:10}}>
            <div><label className="lbl">Largura (m)</label><input className="inp" type="number" step="0.01" value={item.largura||''} onChange={e=>set('largura',parseFloat(e.target.value))}/></div>
            <div><label className="lbl">Altura (m)</label><input className="inp" type="number" step="0.01" value={item.altura||''} onChange={e=>set('altura',parseFloat(e.target.value))}/></div>
          </div>
          {item.area_m2&&<div className="alert alert-green" style={{marginBottom:10}}>Área: <strong>{item.area_m2} m²</strong></div>}
          <div className="grid3" style={{marginBottom:10}}>
            <div>
              <label className="lbl">Acabamento</label>
              <select className="inp" value={item.acabamento||''} onChange={e=>set('acabamento',e.target.value)}>
                <option value="">Selecione</option><option>Fosco</option><option>Brilhante</option>
              </select>
            </div>
            <div>
              <label className="lbl">Rolo de vinil</label>
              <select className="inp" value={item.material_id||''} onChange={e=>set('material_id',parseInt(e.target.value)||null)}>
                <option value="">Definir na produção</option>
                {(item.acabamento==='Fosco'?materiais.filter(m=>m.nome.toLowerCase().includes('fosco')):materiais.filter(m=>m.nome.toLowerCase().includes('brilhante'))).map(m=><option key={m.id} value={m.id}>{m.nome}</option>)}
              </select>
            </div>
            <div>
              <label className="lbl">Aplicado em PS?</label>
              <select className="inp" value={espec.em_ps||'Não'} onChange={e=>setEspec('em_ps',e.target.value)}>
                <option>Não</option><option>Sim</option>
              </select>
            </div>
          </div>
          <div className="grid2" style={{marginBottom:10}}>
            <div>
              <label className="lbl">Com corte?</label>
              <select className="inp" value={espec.com_corte||'Não'} onChange={e=>setEspec('com_corte',e.target.value)}>
                <option>Não</option><option>Sim</option>
              </select>
            </div>
            {espec.em_ps==='Sim'&&(
              <div>
                <label className="lbl">PS (espessura)</label>
                <select className="inp" value={item.material_id2||''} onChange={e=>set('material_id2',parseInt(e.target.value)||null)}>
                  <option value="">Selecione</option>
                  {matPS.map(m=><option key={m.id} value={m.id}>{m.nome}</option>)}
                </select>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Preço */}
      <div className="grid2" style={{marginTop:12}}>
        <div><label className="lbl">Preço unitário (R$)</label><input className="inp" type="number" step="0.01" value={item.preco_unitario||''} onChange={e=>{const v=parseFloat(e.target.value)||0;onChange({...item,preco_unitario:v,preco_total:parseFloat((v*(item.quantidade||1)).toFixed(2))})}}/></div>
        <div><label className="lbl">Preço total (R$)</label><input className="inp" type="number" step="0.01" value={item.preco_total||''} onChange={e=>onChange({...item,preco_total:parseFloat(e.target.value)||0})} style={{fontWeight:700}}/></div>
      </div>
    </div>
  );
}

// ── Formulário Pedido/Orçamento ───────────────────────────────────────────────
function PedidoForm({inicial, modo='pedido', onSave, onCancel}){
  const emptyItem = () => ({id:Date.now(),tipo_servico:'Banner / Lona',descricao:'',quantidade:1,largura:null,altura:null,area_m2:null,metros_lineares:null,perimetro_ml:null,material_id:null,material_id2:null,acabamento:'',especificacoes:{},preco_unitario:'',preco_total:''});
  const [form, setForm] = useState(inicial||{
    cliente_nome:'',cliente_tel:'',cliente_empresa:'',documento_tipo:'',documento:'',
    data_entrada:today(),data_entrega:'',
    forma_pagamento:'Pix',valor_sinal:'',
    desconto_tipo:'',desconto_valor:'',
    observacoes:'',
    itens:[emptyItem()]
  });
  const [materiais,setMateriais]=useState([]);
  useEffect(()=>{GET('/materiais').then(setMateriais)},[]);

  const setF=(k,v)=>setForm(p=>({...p,[k]:v}));
  const setItem=(idx,upd)=>setForm(p=>({...p,itens:p.itens.map((it,i)=>i===idx?upd:it)}));
  const addItem=()=>setForm(p=>({...p,itens:[...p.itens,emptyItem()]}));
  const removeItem=idx=>setForm(p=>({...p,itens:p.itens.filter((_,i)=>i!==idx)}));

  const total = form.itens.reduce((s,i)=>s+(parseFloat(i.preco_total)||0),0);
  let totalFinal = total;
  if(form.desconto_tipo==='percentual'&&form.desconto_valor) totalFinal = total*(1-form.desconto_valor/100);
  if(form.desconto_tipo==='valor'&&form.desconto_valor) totalFinal = total-parseFloat(form.desconto_valor);
  const saldo = totalFinal - (parseFloat(form.valor_sinal)||0);
  const valid = form.cliente_nome&&form.cliente_tel&&(modo==='orcamento'||form.data_entrega)&&form.itens.every(i=>i.preco_total);

  const PAGAMENTOS=['Pix','Cartão de crédito','Cartão de débito','Dinheiro','A prazo'];

  return(
    <div style={{maxWidth:680,margin:'0 auto'}}>
      <div style={{display:'flex',alignItems:'center',gap:12,marginBottom:20}}>
        <button className="btn btn-secondary btn-sm" onClick={onCancel}>← Voltar</button>
        <h2 style={{fontWeight:800,fontSize:16}}>{inicial?'Editar':'Novo'} {modo==='orcamento'?'Orçamento':'Pedido'}</h2>
      </div>

      {/* Cliente */}
      <div className="card" style={{marginBottom:12}}>
        <div className="section-title">Cliente</div>
        <div className="grid2" style={{marginBottom:10}}>
          <div><label className="lbl">Nome *</label><input className="inp" value={form.cliente_nome} onChange={e=>setF('cliente_nome',e.target.value)} placeholder="Nome completo"/></div>
          <div><label className="lbl">Telefone *</label><input className="inp" value={form.cliente_tel} onChange={e=>setF('cliente_tel',e.target.value)} placeholder="(11) 99999-9999"/></div>
        </div>
        <div style={{marginBottom:10}}><label className="lbl">Empresa (opcional)</label><input className="inp" value={form.cliente_empresa} onChange={e=>setF('cliente_empresa',e.target.value)}/></div>
        <div className="grid2">
          <div>
            <label className="lbl">Documento (opcional)</label>
            <select className="inp" value={form.documento_tipo||''} onChange={e=>setF('documento_tipo',e.target.value)}>
              <option value="">Sem documento</option><option>CPF</option><option>CNPJ</option>
            </select>
          </div>
          {form.documento_tipo&&<div><label className="lbl">{form.documento_tipo}</label><input className="inp" value={form.documento||''} onChange={e=>setF('documento',e.target.value)} placeholder={form.documento_tipo==='CPF'?'000.000.000-00':'00.000.000/0001-00'}/></div>}
        </div>
      </div>

      {/* Datas */}
      <div className="card" style={{marginBottom:12}}>
        <div className="section-title">Datas</div>
        <div className="grid2">
          <div><label className="lbl">Data de entrada</label><input className="inp" type="date" value={form.data_entrada} onChange={e=>setF('data_entrada',e.target.value)}/></div>
          {modo==='pedido'&&<div><label className="lbl">Data de entrega *</label><input className="inp" type="date" value={form.data_entrega} onChange={e=>setF('data_entrega',e.target.value)}/></div>}
        </div>
        {modo==='pedido'&&form.data_entrega&&<div style={{marginTop:8,fontSize:12,color:'var(--zinc-500)'}}>Prazo: <strong>{diffDays(form.data_entrada,form.data_entrega)} dias</strong></div>}
      </div>

      {/* Itens */}
      <div className="card" style={{marginBottom:12}}>
        <div className="section-title">Itens do pedido</div>
        {form.itens.map((item,idx)=>(
          <ItemForm key={item.id} item={item} onChange={upd=>setItem(idx,upd)} onRemove={()=>removeItem(idx)} materiais={materiais} showRemove={form.itens.length>1}/>
        ))}
        <button className="btn btn-secondary" style={{width:'100%',marginTop:8}} onClick={addItem}>+ Adicionar item</button>
        <div style={{display:'flex',justifyContent:'flex-end',marginTop:12,fontWeight:700,fontSize:15}}>Total: {fmtBRL(total)}</div>
      </div>

      {/* Desconto (orçamento) */}
      {modo==='orcamento'&&(
        <div className="card" style={{marginBottom:12}}>
          <div className="section-title">Desconto (opcional)</div>
          <div className="grid2">
            <div>
              <label className="lbl">Tipo</label>
              <select className="inp" value={form.desconto_tipo||''} onChange={e=>setF('desconto_tipo',e.target.value)}>
                <option value="">Sem desconto</option><option value="percentual">Percentual (%)</option><option value="valor">Valor fixo (R$)</option>
              </select>
            </div>
            {form.desconto_tipo&&<div><label className="lbl">{form.desconto_tipo==='percentual'?'%':'R$'}</label><input className="inp" type="number" step="0.01" value={form.desconto_valor||''} onChange={e=>setF('desconto_valor',parseFloat(e.target.value))}/></div>}
          </div>
          {form.desconto_tipo&&<div style={{marginTop:10,fontWeight:700,fontSize:15}}>Total com desconto: {fmtBRL(totalFinal)}</div>}
        </div>
      )}

      {/* Pagamento */}
      <div className="card" style={{marginBottom:12}}>
        <div className="section-title">Pagamento</div>
        <div className="grid2" style={{marginBottom:10}}>
          <div>
            <label className="lbl">Forma de pagamento</label>
            <select className="inp" value={form.forma_pagamento||''} onChange={e=>setF('forma_pagamento',e.target.value)}>
              {PAGAMENTOS.map(p=><option key={p}>{p}</option>)}
            </select>
          </div>
          <div><label className="lbl">Valor do sinal (R$)</label><input className="inp" type="number" step="0.01" value={form.valor_sinal||''} onChange={e=>setF('valor_sinal',parseFloat(e.target.value)||'')}/></div>
        </div>
        {totalFinal>0&&<div style={{display:'flex',justifyContent:'space-between',background:'#fafafa',borderRadius:10,padding:'10px 14px'}}>
          <span style={{fontSize:12,color:'var(--zinc-500)'}}>Saldo restante</span>
          <span style={{fontWeight:700,color:'var(--red)'}}>{fmtBRL(saldo<0?0:saldo)}</span>
        </div>}
      </div>

      {/* Obs */}
      <div className="card" style={{marginBottom:16}}>
        <label className="lbl">Observações</label>
        <textarea className="inp" rows={3} value={form.observacoes||''} onChange={e=>setF('observacoes',e.target.value)} placeholder="Detalhes adicionais..."/>
      </div>

      <div style={{display:'flex',gap:10,paddingBottom:40}}>
        <button className="btn btn-secondary" style={{flex:1}} onClick={onCancel}>Cancelar</button>
        <button className="btn btn-primary" style={{flex:2}} disabled={!valid} onClick={()=>onSave({...form,valor_total:totalFinal,desconto_valor:parseFloat(form.desconto_valor)||0})}>
          {inicial?'Salvar alterações':\`Criar \${modo==='orcamento'?'orçamento':'pedido'}\`}
        </button>
      </div>
    </div>
  );
}

// ── Detalhe Pedido ───────────────────────────────────────────────────────────
function PedidoDetalhe({id, onBack, onEdit}){
  const [ped,setPed]=useState(null);
  const [loading,setLoading]=useState(true);

  const load = useCallback(()=>GET(\`/pedidos/\${id}\`).then(p=>{setPed(p);setLoading(false)}),[id]);
  useEffect(()=>{load()},[load]);

  if(loading) return <div style={{padding:40,textAlign:'center',color:'var(--zinc-400)'}}>Carregando...</div>;
  if(!ped) return <div style={{padding:40,textAlign:'center',color:'var(--red)'}}>Pedido não encontrado</div>;

  const total = ped.valor_total||0;
  const sinal = ped.valor_sinal||0;
  const saldo = total-sinal;

  const printNF = async () => {
    const r = await GET(\`/pedidos/\${id}/nf\`);
    const win = window.open('','_blank');
    win.document.write(\`<pre style="font-family:monospace;padding:32px;white-space:pre-wrap">\${r.texto}</pre>\`);
    win.document.close();
    setTimeout(()=>win.print(),300);
  };

  const printPedido = () => {
    const itensHTML = ped.itens.map(i=>\`<tr><td>\${i.tipo_servico}</td><td>\${i.descricao||'—'}</td><td style="text-align:center">\${i.quantidade}</td><td style="text-align:right">R$ \${Number(i.preco_unitario||0).toFixed(2)}</td><td style="text-align:right">R$ \${Number(i.preco_total||0).toFixed(2)}</td></tr>\`).join('');
    const win = window.open('','_blank');
    win.document.write(\`<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Pedido \${ped.numero}</title><style>*{box-sizing:border-box;margin:0;padding:0}body{font-family:Arial,sans-serif;font-size:12px;padding:32px;max-width:720px;margin:auto}.header{display:flex;justify-content:space-between;border-bottom:2px solid #111;padding-bottom:12px;margin-bottom:16px}.empresa{font-size:22px;font-weight:900}.sub{font-size:10px;color:#666}.num{text-align:right;font-size:11px;color:#666}.num strong{font-size:20px;color:#111;display:block}.sec{margin-bottom:14px}.sec-title{font-size:9px;font-weight:700;letter-spacing:1px;text-transform:uppercase;color:#999;margin-bottom:6px;border-bottom:1px solid #eee;padding-bottom:3px}.grid2{display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px}.field label{font-size:9px;color:#999;display:block;margin-bottom:1px}.field span{font-size:12px;font-weight:600}table{width:100%;border-collapse:collapse}th{background:#111;color:#fff;font-size:9px;text-transform:uppercase;padding:6px 8px;text-align:left}td{padding:6px 8px;border-bottom:1px solid #f0f0f0;font-size:11px}tr:nth-child(even)td{background:#fafafa}.total-row td{font-weight:700;border-top:2px solid #111;background:#f5f5f5}.pag{display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px;background:#f8f8f8;border-radius:6px;padding:10px}.pag-item label{font-size:9px;color:#999;display:block;margin-bottom:2px}.pag-item span{font-size:13px;font-weight:700}.saldo{color:#c00}.assinatura{display:grid;grid-template-columns:1fr 1fr;gap:32px;margin-top:24px}.linha{border-top:1px solid #bbb;padding-top:4px;font-size:10px;color:#999;text-align:center}.footer{margin-top:20px;border-top:1px solid #ddd;padding-top:10px;font-size:9px;color:#aaa;text-align:center}</style></head><body>
    <div class="header"><div><div class="empresa">GSIM</div><div class="sub">Comunicação Visual</div></div><div class="num">Nº do Pedido<strong>\${ped.numero}</strong><div>Entrada: \${fmtDate(ped.data_entrada)}</div><div>Entrega: \${fmtDate(ped.data_entrega)}</div></div></div>
    <div class="sec"><div class="sec-title">Cliente</div><div class="grid2"><div class="field"><label>Nome</label><span>\${ped.cliente_nome}</span></div><div class="field"><label>Telefone</label><span>\${ped.cliente_tel}</span></div><div class="field"><label>Empresa</label><span>\${ped.cliente_empresa||'—'}</span></div></div></div>
    <div class="sec"><div class="sec-title">Itens</div><table><thead><tr><th>Serviço</th><th>Descrição</th><th style="text-align:center">Qtd</th><th style="text-align:right">Unit.</th><th style="text-align:right">Total</th></tr></thead><tbody>\${itensHTML}<tr class="total-row"><td colspan="4">TOTAL</td><td style="text-align:right">\${fmtBRL(total)}</td></tr></tbody></table></div>
    <div class="sec"><div class="sec-title">Pagamento</div><div class="pag"><div class="pag-item"><label>Forma</label><span>\${ped.forma_pagamento||'—'}</span></div><div class="pag-item"><label>Sinal \${ped.sinal_pago?'✓ Pago':'◯ Pendente'}</label><span>\${fmtBRL(sinal)}</span></div><div class="pag-item"><label>Saldo a pagar</label><span class="saldo">\${fmtBRL(saldo)}</span></div></div></div>
    \${ped.observacoes?\`<div class="sec"><div class="sec-title">Observações</div><p style="background:#fffbe6;border-left:3px solid #f0c040;padding:8px 12px;border-radius:0 4px 4px 0;font-size:11px">\${ped.observacoes}</p></div>\`:''}
    <div class="assinatura"><div class="linha">Assinatura do Cliente</div><div class="linha">Assinatura / Carimbo</div></div>
    <div class="footer">Gsim Comunicação Visual · [Endereço] · [Telefone] · [Email] — \${new Date().toLocaleDateString('pt-BR')}</div>
    </body></html>\`);
    win.document.close();
    setTimeout(()=>win.print(),400);
  };

  return(
    <div style={{maxWidth:680,margin:'0 auto'}}>
      <div style={{display:'flex',alignItems:'center',gap:12,marginBottom:20,flexWrap:'wrap'}}>
        <button className="btn btn-secondary btn-sm" onClick={onBack}>← Voltar</button>
        <div style={{flex:1}}>
          <div style={{fontWeight:800,fontSize:16}}>{ped.cliente_nome} <span style={{fontWeight:400,fontSize:13,color:'var(--zinc-400)'}}>#{ped.numero}</span></div>
          {ped.cliente_empresa&&<div style={{fontSize:12,color:'var(--zinc-500)'}}>{ped.cliente_empresa}</div>}
        </div>
        <Badge status={ped.status}/>
      </div>

      {/* Status */}
      <div className="card" style={{marginBottom:12}}>
        <div className="section-title">Status de produção</div>
        <StatusSelect value={ped.status} onChange={async s=>{await PATCH(\`/pedidos/\${id}/status\`,{status:s});load()}}/>
      </div>

      {/* Datas */}
      <div className="card" style={{marginBottom:12}}>
        <div className="section-title">Datas</div>
        <div className="grid2">
          <div><span style={{fontSize:11,color:'var(--zinc-400)'}}>Entrada</span><div style={{fontWeight:600}}>{fmtDate(ped.data_entrada)}</div></div>
          <div><span style={{fontSize:11,color:'var(--zinc-400)'}}>Entrega</span><div style={{fontWeight:600}}>{fmtDate(ped.data_entrega)}</div>
          {ped.status!=='Finalizado'&&ped.status!=='Cancelado'&&<div style={{fontSize:12,color:diffDays(today(),ped.data_entrega)<=2?'var(--red)':'var(--zinc-500)'}}>{diffDays(today(),ped.data_entrega)<0?\`⚠️ \${Math.abs(diffDays(today(),ped.data_entrega))}d atrasado\`:diffDays(today(),ped.data_entrega)===0?'⚡ Hoje':\`\${diffDays(today(),ped.data_entrega)}d restantes\`}</div>}
          </div>
        </div>
      </div>

      {/* Itens */}
      <div className="card" style={{marginBottom:12,padding:0,overflow:'hidden'}}>
        <table style={{width:'100%',borderCollapse:'collapse'}}>
          <thead><tr style={{background:'var(--zinc-900)',color:'#fff'}}>
            <th style={{padding:'8px 12px',fontSize:11,textAlign:'left'}}>Serviço</th>
            <th style={{padding:'8px 12px',fontSize:11,textAlign:'center'}}>Qtd</th>
            <th style={{padding:'8px 12px',fontSize:11,textAlign:'right'}}>Total</th>
          </tr></thead>
          <tbody>
            {ped.itens.map(i=>(
              <tr key={i.id} style={{borderBottom:'1px solid var(--zinc-100)'}}>
                <td style={{padding:'10px 12px'}}>
                  <div style={{fontWeight:600,fontSize:13}}>{i.tipo_servico}</div>
                  {i.descricao&&<div style={{fontSize:11,color:'var(--zinc-400)'}}>{i.descricao}</div>}
                  {i.area_m2&&<div style={{fontSize:11,color:'var(--zinc-400)'}}>Área: {i.area_m2} m² {i.perimetro_ml?\`· Perímetro: \${i.perimetro_ml} ml\`:''}</div>}
                  {i.material_nome&&<div style={{fontSize:11,color:'var(--blue)'}}>Material: {i.material_nome} {!i.material_vinculado&&<span style={{color:'var(--orange)'}}>⚠️ pendente</span>}</div>}
                </td>
                <td style={{padding:'10px 12px',textAlign:'center',fontSize:13}}>{i.quantidade}</td>
                <td style={{padding:'10px 12px',textAlign:'right',fontWeight:700,fontSize:13}}>{fmtBRL(i.preco_total)}</td>
              </tr>
            ))}
            <tr style={{background:'var(--zinc-50)'}}>
              <td colSpan="2" style={{padding:'10px 12px',fontSize:11,fontWeight:700,color:'var(--zinc-500)'}}>TOTAL</td>
              <td style={{padding:'10px 12px',textAlign:'right',fontWeight:800,fontSize:15}}>{fmtBRL(total)}</td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* Pagamento */}
      <div className="card" style={{marginBottom:12}}>
        <div className="section-title">Pagamento — {ped.forma_pagamento||'—'}</div>
        <div style={{display:'flex',flexDirection:'column',gap:10}}>
          <label style={{display:'flex',justifyContent:'space-between',alignItems:'center',cursor:'pointer'}}>
            <div>
              <span style={{fontWeight:600,fontSize:13}}>Sinal</span>
              <span style={{color:'var(--zinc-400)',fontSize:13}}> · {fmtBRL(sinal)}</span>
            </div>
            <div style={{display:'flex',alignItems:'center',gap:8}}>
              <span style={{fontSize:12,color:ped.sinal_pago?'var(--green)':'var(--zinc-400)',fontWeight:600}}>{ped.sinal_pago?'Pago':'Pendente'}</span>
              <input type="checkbox" checked={!!ped.sinal_pago} onChange={async e=>{await PATCH(\`/pedidos/\${id}/pagamento\`,{sinal_pago:e.target.checked,saldo_pago:!!ped.saldo_pago});load()}} style={{width:16,height:16}}/>
            </div>
          </label>
          <label style={{display:'flex',justifyContent:'space-between',alignItems:'center',cursor:'pointer'}}>
            <div>
              <span style={{fontWeight:600,fontSize:13}}>Saldo restante</span>
              <span style={{color:'var(--red)',fontWeight:700,fontSize:13}}> · {fmtBRL(saldo)}</span>
            </div>
            <div style={{display:'flex',alignItems:'center',gap:8}}>
              <span style={{fontSize:12,color:ped.saldo_pago?'var(--green)':'var(--zinc-400)',fontWeight:600}}>{ped.saldo_pago?'Pago':'Pendente'}</span>
              <input type="checkbox" checked={!!ped.saldo_pago} onChange={async e=>{await PATCH(\`/pedidos/\${id}/pagamento\`,{sinal_pago:!!ped.sinal_pago,saldo_pago:e.target.checked});load()}} style={{width:16,height:16}}/>
            </div>
          </label>
        </div>
      </div>

      {ped.observacoes&&<div className="alert alert-yellow" style={{marginBottom:12}}>{ped.observacoes}</div>}

      {/* Ações */}
      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:8,paddingBottom:40}}>
        <button className="btn btn-secondary" onClick={printPedido}>🖨️ Imprimir</button>
        <button className="btn btn-secondary" onClick={printNF}>🧾 Gerar NF</button>
        <button className="btn btn-primary" onClick={()=>onEdit(ped)}>✏️ Editar</button>
      </div>
    </div>
  );
}

// ── Lista Pedidos ─────────────────────────────────────────────────────────────
function ListaPedidos({onNovo, onDetalhe}){
  const [pedidos,setPedidos]=useState([]);
  const [busca,setBusca]=useState('');
  const [filtroStatus,setFiltroStatus]=useState('todos');

  useEffect(()=>{
    const q = new URLSearchParams({...(busca?{q:busca}:{}),(filtroStatus!=='todos'?{status:filtroStatus}:{})}).toString();
    GET(\`/pedidos?\${q}\`).then(setPedidos);
  },[busca,filtroStatus]);

  return(
    <div>
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:16}}>
        <h2 style={{fontWeight:800,fontSize:18}}>Pedidos</h2>
        <button className="btn btn-primary" onClick={onNovo}>+ Novo pedido</button>
      </div>
      <input className="inp" value={busca} onChange={e=>setBusca(e.target.value)} placeholder="Buscar por cliente ou número..." style={{marginBottom:12}}/>
      <div style={{display:'flex',gap:6,flexWrap:'wrap',marginBottom:16}}>
        {['todos',...STATUS_PROD].map(s=>(
          <button key={s} onClick={()=>setFiltroStatus(s)}
            style={{padding:'4px 10px',borderRadius:8,fontSize:11,fontWeight:600,border:'1px solid',cursor:'pointer',
              background:filtroStatus===s?'var(--zinc-900)':'#fff',
              color:filtroStatus===s?'#fff':'var(--zinc-500)',
              borderColor:filtroStatus===s?'var(--zinc-900)':'var(--zinc-200)'}}>
            {s==='todos'?'Todos':s}
          </button>
        ))}
      </div>
      {pedidos.length===0&&<div style={{textAlign:'center',padding:48,color:'var(--zinc-400)'}}>Nenhum pedido encontrado</div>}
      <div style={{display:'flex',flexDirection:'column',gap:8}}>
        {pedidos.map(p=>{
          const dias=diffDays(today(),p.data_entrega);
          const urgente=!['Finalizado','Cancelado'].includes(p.status)&&dias<=2;
          return(
            <div key={p.id} className="card" onClick={()=>onDetalhe(p.id)} style={{cursor:'pointer',borderColor:urgente?'#fca5a5':'var(--zinc-200)',background:urgente?'#fff5f5':'#fff',transition:'all .15s'}}
              onMouseEnter={e=>e.currentTarget.style.boxShadow='0 4px 16px rgba(0,0,0,.08)'}
              onMouseLeave={e=>e.currentTarget.style.boxShadow='none'}>
              <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',gap:8}}>
                <div style={{minWidth:0}}>
                  <div style={{display:'flex',alignItems:'center',gap:8,flexWrap:'wrap'}}>
                    <span style={{fontWeight:700,fontSize:14}}>{p.cliente_nome}</span>
                    <span style={{fontSize:11,color:'var(--zinc-400)',fontFamily:'monospace'}}>#{p.numero}</span>
                  </div>
                  {p.cliente_empresa&&<div style={{fontSize:12,color:'var(--zinc-400)'}}>{p.cliente_empresa}</div>}
                  <div style={{fontSize:12,color:'var(--zinc-400)',marginTop:2}}>Entrega: {fmtDate(p.data_entrega)}{!['Finalizado','Cancelado'].includes(p.status)&&<span style={{marginLeft:8,color:dias<0?'var(--red)':dias<=2?'var(--orange)':'var(--zinc-400)'}}>{dias<0?\`⚠️ \${Math.abs(dias)}d atrasado\`:dias===0?'⚡ Hoje':\`\${dias}d\`}</span>}</div>
                </div>
                <div style={{textAlign:'right',flexShrink:0}}>
                  <div style={{fontWeight:800,fontSize:15,marginBottom:4}}>{fmtBRL(p.valor_total)}</div>
                  <Badge status={p.status}/>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Orçamentos ────────────────────────────────────────────────────────────────
function Orcamentos(){
  const [view,setView]=useState('lista');
  const [orcamentos,setOrcamentos]=useState([]);
  const [selected,setSelected]=useState(null);

  const load=()=>GET('/orcamentos').then(setOrcamentos);
  useEffect(()=>{load()},[]);

  const ORC_STATUS_COLORS={'Em aberto':'#fef9c3 #854d0e','Aprovado':'#dcfce7 #166534','Reprovado':'#fee2e2 #991b1b'};

  if(view==='novo')return(
    <PedidoForm modo="orcamento" onCancel={()=>setView('lista')} onSave={async data=>{
      await POST('/orcamentos',{...data,itens:data.itens});
      load();setView('lista');
    }}/>
  );

  if(view==='detalhe'&&selected)return(
    <OrcamentoDetalhe id={selected} onBack={()=>{setSelected(null);setView('lista');load()}} onNovaVersao={async()=>{await POST(\`/orcamentos/\${selected}/nova-versao\`,{});load();}} onConverter={async(data)=>{await POST(\`/orcamentos/\${selected}/converter\`,data);load();setView('lista');}}/>
  );

  return(
    <div>
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:16}}>
        <h2 style={{fontWeight:800,fontSize:18}}>Orçamentos</h2>
        <button className="btn btn-primary" onClick={()=>setView('novo')}>+ Novo orçamento</button>
      </div>
      {orcamentos.length===0&&<div style={{textAlign:'center',padding:48,color:'var(--zinc-400)'}}>Nenhum orçamento ainda</div>}
      <div style={{display:'flex',flexDirection:'column',gap:8}}>
        {orcamentos.map(o=>{
          const [bg,color]=(ORC_STATUS_COLORS[o.status]||'#f4f4f5 #71717a').split(' ');
          const vencendo=o.status==='Em aberto'&&diffDays(today(),o.data_validade)<=2;
          return(
            <div key={o.id} className="card" onClick={()=>{setSelected(o.id);setView('detalhe')}} style={{cursor:'pointer',borderColor:vencendo?'#fca5a5':'var(--zinc-200)'}}>
              <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start'}}>
                <div>
                  <div style={{fontWeight:700,fontSize:14}}>{o.cliente_nome} <span style={{fontSize:11,color:'var(--zinc-400)',fontFamily:'monospace'}}>#{o.numero}</span></div>
                  {o.cliente_empresa&&<div style={{fontSize:12,color:'var(--zinc-400)'}}>{o.cliente_empresa}</div>}
                  <div style={{fontSize:12,color:'var(--zinc-400)',marginTop:2}}>
                    Emitido: {fmtDate(o.data_orcamento)} · Validade: {fmtDate(o.data_validade)}
                    {vencendo&&<span style={{color:'var(--red)',marginLeft:8}}>⚠️ vencendo</span>}
                    {o.versao>1&&<span style={{marginLeft:8,fontSize:11,background:'#ede9fe',color:'#6d28d9',padding:'1px 6px',borderRadius:4}}>v{o.versao}</span>}
                  </div>
                </div>
                <div style={{textAlign:'right'}}>
                  <div style={{fontWeight:800,fontSize:15,marginBottom:4}}>{fmtBRL(o.valor_final)}</div>
                  <span className="badge" style={{background:bg,color}}>{o.status}</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function OrcamentoDetalhe({id,onBack,onNovaVersao,onConverter}){
  const [orc,setOrc]=useState(null);
  const [convertindo,setConvertindo]=useState(false);
  const [dataEntrega,setDataEntrega]=useState('');
  const [formaPag,setFormaPag]=useState('Pix');
  const [sinal,setSinal]=useState('');

  useEffect(()=>{GET(\`/orcamentos/\${id}\`).then(setOrc)},[id]);
  if(!orc)return<div style={{padding:40,textAlign:'center',color:'var(--zinc-400)'}}>Carregando...</div>;

  const printOrc=()=>{
    const itensHTML=orc.itens.map(i=>\`<tr><td>\${i.tipo_servico}</td><td>\${i.descricao||'—'}</td><td style="text-align:center">\${i.quantidade}</td><td style="text-align:right">R$ \${Number(i.preco_unitario||0).toFixed(2)}</td><td style="text-align:right">R$ \${Number(i.preco_total||0).toFixed(2)}</td></tr>\`).join('');
    const desc=orc.desconto_valor>0?\`<p>Desconto: \${orc.desconto_tipo==='percentual'?orc.desconto_valor+'%':'R$ '+Number(orc.desconto_valor).toFixed(2)}</p>\`:'';
    const win=window.open('','_blank');
    win.document.write(\`<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Orçamento \${orc.numero}</title><style>*{box-sizing:border-box;margin:0;padding:0}body{font-family:Arial,sans-serif;font-size:12px;padding:32px;max-width:720px;margin:auto}.header{display:flex;justify-content:space-between;border-bottom:2px solid #111;padding-bottom:12px;margin-bottom:16px}.empresa{font-size:22px;font-weight:900}.num{text-align:right;font-size:11px;color:#666}.num strong{font-size:20px;color:#111;display:block}table{width:100%;border-collapse:collapse}th{background:#111;color:#fff;font-size:9px;text-transform:uppercase;padding:6px 8px;text-align:left}td{padding:6px 8px;border-bottom:1px solid #f0f0f0;font-size:11px}.total-row td{font-weight:700;border-top:2px solid #111;background:#f5f5f5}.validade{background:#fffbe6;border-left:3px solid #f0c040;padding:8px 12px;margin-top:12px;font-size:11px}.assinatura{display:grid;grid-template-columns:1fr 1fr;gap:32px;margin-top:28px}.linha{border-top:1px solid #bbb;padding-top:4px;font-size:10px;color:#999;text-align:center}.footer{margin-top:20px;border-top:1px solid #ddd;padding-top:10px;font-size:9px;color:#aaa;text-align:center}</style></head><body>
    <div class="header"><div><div class="empresa">GSIM</div><div style="font-size:10px;color:#666">Comunicação Visual</div></div><div class="num">ORÇAMENTO<strong>\${orc.numero}</strong><div>Data: \${fmtDate(orc.data_orcamento)}</div><div>Validade: \${fmtDate(orc.data_validade)}</div></div></div>
    <div style="margin-bottom:14px"><div style="font-size:9px;font-weight:700;letter-spacing:1px;text-transform:uppercase;color:#999;margin-bottom:6px;border-bottom:1px solid #eee;padding-bottom:3px">Cliente</div>
    <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px"><div><label style="font-size:9px;color:#999;display:block">Nome</label><span style="font-size:12px;font-weight:600">\${orc.cliente_nome}</span></div><div><label style="font-size:9px;color:#999;display:block">Telefone</label><span style="font-size:12px;font-weight:600">\${orc.cliente_tel}</span></div><div><label style="font-size:9px;color:#999;display:block">Empresa</label><span style="font-size:12px;font-weight:600">\${orc.cliente_empresa||'—'}</span></div></div></div>
    <table><thead><tr><th>Serviço</th><th>Descrição</th><th style="text-align:center">Qtd</th><th style="text-align:right">Unit.</th><th style="text-align:right">Total</th></tr></thead><tbody>\${itensHTML}<tr class="total-row"><td colspan="4">TOTAL\${orc.desconto_valor>0?' (com desconto)':''}</td><td style="text-align:right">R$ \${Number(orc.valor_final).toFixed(2)}</td></tr></tbody></table>
    \${desc}
    <div class="validade">Este orçamento é válido por \${orc.validade_dias} dias a partir da data de emissão (\${fmtDate(orc.data_validade)}).</div>
    \${orc.observacoes?\`<p style="margin-top:10px;font-size:11px;color:#555">\${orc.observacoes}</p>\`:''}
    <div class="assinatura"><div class="linha">Assinatura do Cliente</div><div class="linha">Assinatura / Carimbo</div></div>
    <div class="footer">Gsim Comunicação Visual · [Endereço] · [Telefone] · [Email] — \${new Date().toLocaleDateString('pt-BR')}</div>
    </body></html>\`);
    win.document.close();setTimeout(()=>win.print(),400);
  };

  const setStatus=async s=>{await PATCH(\`/orcamentos/\${id}/status\`,{status:s});GET(\`/orcamentos/\${id}\`).then(setOrc)};

  return(
    <div style={{maxWidth:680,margin:'0 auto'}}>
      <div style={{display:'flex',alignItems:'center',gap:12,marginBottom:20}}>
        <button className="btn btn-secondary btn-sm" onClick={onBack}>← Voltar</button>
        <div style={{flex:1}}>
          <div style={{fontWeight:800,fontSize:16}}>{orc.cliente_nome} <span style={{fontWeight:400,fontSize:13,color:'var(--zinc-400)'}}>#{orc.numero}</span></div>
          {orc.versao>1&&<span style={{fontSize:11,background:'#ede9fe',color:'#6d28d9',padding:'2px 8px',borderRadius:4}}>Versão {orc.versao}</span>}
        </div>
      </div>

      <div className="card" style={{marginBottom:12}}>
        <div className="section-title">Status</div>
        <div style={{display:'flex',gap:8,flexWrap:'wrap'}}>
          {['Em aberto','Aprovado','Reprovado'].map(s=>(
            <button key={s} onClick={()=>setStatus(s)} className="btn btn-sm"
              style={{background:orc.status===s?'var(--zinc-900)':'#fff',color:orc.status===s?'#fff':'var(--zinc-700)',border:'1px solid var(--zinc-200)'}}>
              {s}
            </button>
          ))}
        </div>
      </div>

      <div className="card" style={{marginBottom:12,padding:0,overflow:'hidden'}}>
        <table style={{width:'100%',borderCollapse:'collapse'}}>
          <thead><tr style={{background:'var(--zinc-900)',color:'#fff'}}>
            <th style={{padding:'8px 12px',fontSize:11,textAlign:'left'}}>Serviço</th>
            <th style={{padding:'8px 12px',fontSize:11,textAlign:'center'}}>Qtd</th>
            <th style={{padding:'8px 12px',fontSize:11,textAlign:'right'}}>Total</th>
          </tr></thead>
          <tbody>
            {orc.itens.map(i=>(
              <tr key={i.id} style={{borderBottom:'1px solid var(--zinc-100)'}}>
                <td style={{padding:'10px 12px'}}><div style={{fontWeight:600,fontSize:13}}>{i.tipo_servico}</div>{i.descricao&&<div style={{fontSize:11,color:'var(--zinc-400)'}}>{i.descricao}</div>}</td>
                <td style={{textAlign:'center',padding:'10px 12px'}}>{i.quantidade}</td>
                <td style={{textAlign:'right',padding:'10px 12px',fontWeight:700}}>{fmtBRL(i.preco_total)}</td>
              </tr>
            ))}
            <tr style={{background:'var(--zinc-50)'}}>
              <td colSpan="2" style={{padding:'10px 12px',fontSize:11,fontWeight:700,color:'var(--zinc-500)'}}>TOTAL{orc.desconto_valor>0?' (com desconto)':''}</td>
              <td style={{padding:'10px 12px',textAlign:'right',fontWeight:800,fontSize:15}}>{fmtBRL(orc.valor_final)}</td>
            </tr>
          </tbody>
        </table>
      </div>

      {orc.status==='Aprovado'&&!convertindo&&(
        <div className="alert alert-green" style={{marginBottom:12,display:'flex',justifyContent:'space-between',alignItems:'center'}}>
          <span>Orçamento aprovado! Converter em pedido?</span>
          <button className="btn btn-success btn-sm" onClick={()=>setConvertindo(true)}>Converter</button>
        </div>
      )}

      {convertindo&&(
        <div className="card" style={{marginBottom:12}}>
          <div className="section-title">Converter em pedido</div>
          <div className="grid2" style={{marginBottom:10}}>
            <div><label className="lbl">Data de entrega *</label><input className="inp" type="date" value={dataEntrega} onChange={e=>setDataEntrega(e.target.value)}/></div>
            <div><label className="lbl">Forma de pagamento</label><select className="inp" value={formaPag} onChange={e=>setFormaPag(e.target.value)}><option>Pix</option><option>Cartão de crédito</option><option>Cartão de débito</option><option>Dinheiro</option><option>A prazo</option></select></div>
          </div>
          <div style={{marginBottom:10}}><label className="lbl">Valor do sinal (R$)</label><input className="inp" type="number" step="0.01" value={sinal} onChange={e=>setSinal(e.target.value)}/></div>
          <div style={{display:'flex',gap:8}}>
            <button className="btn btn-secondary" onClick={()=>setConvertindo(false)}>Cancelar</button>
            <button className="btn btn-primary" disabled={!dataEntrega} onClick={()=>onConverter({data_entrega:dataEntrega,forma_pagamento:formaPag,valor_sinal:parseFloat(sinal)||0})}>Criar pedido</button>
          </div>
        </div>
      )}

      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8,paddingBottom:40}}>
        <button className="btn btn-secondary" onClick={printOrc}>🖨️ Imprimir PDF</button>
        <button className="btn btn-secondary" onClick={async()=>{await onNovaVersao();onBack();}}>📋 Nova versão</button>
      </div>
    </div>
  );
}

// ── Cronograma ────────────────────────────────────────────────────────────────
function Cronograma(){
  const [data,setData]=useState(null);
  useEffect(()=>{GET('/cronograma').then(setData)},[]);
  if(!data)return<div style={{padding:40,textAlign:'center',color:'var(--zinc-400)'}}>Carregando...</div>;

  return(
    <div>
      <h2 style={{fontWeight:800,fontSize:18,marginBottom:16}}>Cronograma</h2>
      {data.orcamentos_vencendo.length>0&&(
        <div style={{marginBottom:16}}>
          <div className="section-title" style={{color:'var(--red)'}}>⚠️ Orçamentos vencendo em 2 dias</div>
          {data.orcamentos_vencendo.map(o=>(
            <div key={o.id} className="alert alert-red" style={{marginBottom:8}}>
              <strong>{o.cliente_nome}</strong> #{o.numero} — Vence em {fmtDate(o.data_validade)} — {fmtBRL(o.valor_final)}
            </div>
          ))}
        </div>
      )}
      <div className="section-title">Pedidos em andamento</div>
      {data.pedidos.length===0&&<div style={{textAlign:'center',padding:48,color:'var(--zinc-400)'}}>Nenhum pedido em andamento</div>}
      <div style={{display:'flex',flexDirection:'column',gap:10}}>
        {data.pedidos.map(p=>{
          const dias=diffDays(today(),p.data_entrega);
          const urgente=dias<=2;
          const totalDias=diffDays(p.data_entrada,p.data_entrega);
          const passados=diffDays(p.data_entrada,today());
          const pct=Math.min(100,Math.max(0,(passados/Math.max(totalDias,1))*100));
          return(
            <div key={p.id} className="card" style={{borderColor:urgente?'#fca5a5':'var(--zinc-200)',background:urgente?'#fff5f5':'#fff'}}>
              <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',gap:8,marginBottom:10}}>
                <div>
                  <div style={{fontWeight:700}}>{p.cliente_nome} <span style={{fontWeight:400,fontSize:12,color:'var(--zinc-400)'}}>#{p.numero}</span></div>
                  <div style={{fontSize:12,color:'var(--zinc-500)',marginTop:2}}>
                    {dias<0?<span style={{color:'var(--red)',fontWeight:600}}>⚠️ {Math.abs(dias)}d atrasado</span>:dias===0?<span style={{color:'var(--orange)',fontWeight:600}}>⚡ Entrega hoje</span>:<span>{dias}d para entrega ({fmtDate(p.data_entrega)})</span>}
                  </div>
                </div>
                <Badge status={p.status}/>
              </div>
              <div style={{background:'var(--zinc-100)',borderRadius:999,height:6}}>
                <div style={{height:6,borderRadius:999,background:pct>80?'var(--red)':pct>50?'var(--orange)':'var(--green)',width:\`\${pct}%\`,transition:'width .3s'}}/>
              </div>
              <div style={{display:'flex',justifyContent:'space-between',fontSize:11,color:'var(--zinc-400)',marginTop:4}}>
                <span>{fmtDate(p.data_entrada)}</span>
                <span>{Math.round(pct)}% do prazo</span>
                <span>{fmtDate(p.data_entrega)}</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Estoque ───────────────────────────────────────────────────────────────────
function Estoque(){
  const [materiais,setMateriais]=useState([]);
  const [fornecedores,setFornecedores]=useState([]);
  const [compraForm,setCompraForm]=useState({fornecedor_id:'',material_id:'',quantidade:'',valor_total:'',data_compra:today(),observacao:''});
  const [novoMat,setNovoMat]=useState({nome:'',tipo:'metro_linear',especificacao:'',estoque_minimo:'',unidade_display:'ml'});
  const [showNovoMat,setShowNovoMat]=useState(false);
  const [showCompra,setShowCompra]=useState(false);

  const load=()=>{GET('/materiais').then(setMateriais);GET('/fornecedores').then(setFornecedores)};
  useEffect(()=>{load()},[]);

  const custo_unit=compraForm.quantidade&&compraForm.valor_total?(parseFloat(compraForm.valor_total)/parseFloat(compraForm.quantidade)).toFixed(4):null;

  const submitCompra=async()=>{
    await POST('/compras',{...compraForm,quantidade:parseFloat(compraForm.quantidade),valor_total:parseFloat(compraForm.valor_total)});
    setCompraForm({fornecedor_id:'',material_id:'',quantidade:'',valor_total:'',data_compra:today(),observacao:''});
    setShowCompra(false);load();
  };

  const submitNovoMat=async()=>{
    await POST('/materiais',{...novoMat,estoque_minimo:parseFloat(novoMat.estoque_minimo)||0});
    setNovoMat({nome:'',tipo:'metro_linear',especificacao:'',estoque_minimo:'',unidade_display:'ml'});
    setShowNovoMat(false);load();
  };

  const baixos=materiais.filter(m=>m.estoque_minimo>0&&m.estoque_atual<=m.estoque_minimo);

  return(
    <div>
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:16}}>
        <h2 style={{fontWeight:800,fontSize:18}}>Estoque</h2>
        <div style={{display:'flex',gap:8}}>
          <button className="btn btn-secondary btn-sm" onClick={()=>setShowNovoMat(!showNovoMat)}>+ Material</button>
          <button className="btn btn-primary btn-sm" onClick={()=>setShowCompra(!showCompra)}>📦 Registrar compra</button>
        </div>
      </div>

      {baixos.length>0&&<div className="alert alert-red" style={{marginBottom:16}}>⚠️ {baixos.length} material(is) abaixo do estoque mínimo: {baixos.map(m=>m.nome).join(', ')}</div>}

      {showCompra&&(
        <div className="card" style={{marginBottom:16}}>
          <div className="section-title">Registrar compra de material</div>
          <div className="grid2" style={{marginBottom:10}}>
            <div><label className="lbl">Fornecedor</label><select className="inp" value={compraForm.fornecedor_id} onChange={e=>setCompraForm(p=>({...p,fornecedor_id:e.target.value}))}><option value="">Sem fornecedor</option>{fornecedores.map(f=><option key={f.id} value={f.id}>{f.nome_empresa}</option>)}</select></div>
            <div><label className="lbl">Material *</label><select className="inp" value={compraForm.material_id} onChange={e=>setCompraForm(p=>({...p,material_id:e.target.value}))}><option value="">Selecione</option>{materiais.map(m=><option key={m.id} value={m.id}>{m.nome} {m.especificacao?\`(\${m.especificacao})\`:''}</option>)}</select></div>
            <div><label className="lbl">Quantidade ({materiais.find(m=>m.id==compraForm.material_id)?.unidade_display||'unid'})</label><input className="inp" type="number" step="0.01" value={compraForm.quantidade} onChange={e=>setCompraForm(p=>({...p,quantidade:e.target.value}))}/></div>
            <div><label className="lbl">Valor total (R$)</label><input className="inp" type="number" step="0.01" value={compraForm.valor_total} onChange={e=>setCompraForm(p=>({...p,valor_total:e.target.value}))}/></div>
            <div><label className="lbl">Data</label><input className="inp" type="date" value={compraForm.data_compra} onChange={e=>setCompraForm(p=>({...p,data_compra:e.target.value}))}/></div>
            <div><label className="lbl">Observação</label><input className="inp" value={compraForm.observacao} onChange={e=>setCompraForm(p=>({...p,observacao:e.target.value}))}/></div>
          </div>
          {custo_unit&&<div className="alert alert-green" style={{marginBottom:10}}>Custo unitário: <strong>R$ {custo_unit}/{materiais.find(m=>m.id==compraForm.material_id)?.unidade_display||'unid'}</strong></div>}
          <div style={{display:'flex',gap:8}}>
            <button className="btn btn-secondary" onClick={()=>setShowCompra(false)}>Cancelar</button>
            <button className="btn btn-primary" disabled={!compraForm.material_id||!compraForm.quantidade||!compraForm.valor_total} onClick={submitCompra}>Registrar compra</button>
          </div>
        </div>
      )}

      {showNovoMat&&(
        <div className="card" style={{marginBottom:16}}>
          <div className="section-title">Novo material</div>
          <div className="grid2" style={{marginBottom:10}}>
            <div><label className="lbl">Nome *</label><input className="inp" value={novoMat.nome} onChange={e=>setNovoMat(p=>({...p,nome:e.target.value}))}/></div>
            <div><label className="lbl">Tipo</label><select className="inp" value={novoMat.tipo} onChange={e=>{const t=e.target.value;setNovoMat(p=>({...p,tipo:t,unidade_display:t==='metro_linear'?'ml':t==='m2'?'m²':t==='folha'?'folhas':'unid'}))}}><option value="metro_linear">Metro linear</option><option value="m2">Metro quadrado</option><option value="unidade">Unidade</option><option value="folha">Folha</option></select></div>
            <div><label className="lbl">Especificação</label><input className="inp" value={novoMat.especificacao} onChange={e=>setNovoMat(p=>({...p,especificacao:e.target.value}))} placeholder="ex: 1,40m largura"/></div>
            <div><label className="lbl">Estoque mínimo</label><input className="inp" type="number" step="0.01" value={novoMat.estoque_minimo} onChange={e=>setNovoMat(p=>({...p,estoque_minimo:e.target.value}))}/></div>
          </div>
          <div style={{display:'flex',gap:8}}>
            <button className="btn btn-secondary" onClick={()=>setShowNovoMat(false)}>Cancelar</button>
            <button className="btn btn-primary" disabled={!novoMat.nome} onClick={submitNovoMat}>Salvar</button>
          </div>
        </div>
      )}

      <div style={{display:'flex',flexDirection:'column',gap:8}}>
        {materiais.map(m=>{
          const baixo=m.estoque_minimo>0&&m.estoque_atual<=m.estoque_minimo;
          return(
            <div key={m.id} className="card" style={{borderColor:baixo?'#fca5a5':'var(--zinc-200)',background:baixo?'#fff5f5':'#fff'}}>
              <div style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}>
                <div>
                  <div style={{fontWeight:700,fontSize:14}}>{m.nome}</div>
                  {m.especificacao&&<div style={{fontSize:12,color:'var(--zinc-400)'}}>{m.especificacao}</div>}
                  <div style={{fontSize:12,color:'var(--zinc-500)',marginTop:4}}>
                    Custo médio: <strong>{fmtBRL(m.custo_medio)}/{m.unidade_display}</strong>
                    {m.estoque_minimo>0&&<span style={{marginLeft:8,color:'var(--zinc-400)'}}>mín: {m.estoque_minimo} {m.unidade_display}</span>}
                  </div>
                </div>
                <div style={{textAlign:'right'}}>
                  <div style={{fontSize:22,fontWeight:800,color:baixo?'var(--red)':'var(--zinc-900)'}}>{Number(m.estoque_atual).toFixed(2)}</div>
                  <div style={{fontSize:11,color:'var(--zinc-400)'}}>{m.unidade_display}</div>
                  {baixo&&<div style={{fontSize:11,color:'var(--red)',fontWeight:600}}>⚠️ Estoque baixo</div>}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Financeiro ────────────────────────────────────────────────────────────────
function Financeiro(){
  const [subTab,setSubTab]=useState('balanco');
  const [balanco,setBalanco]=useState(null);
  const [projecao,setProjecao]=useState([]);
  const [despFixas,setDespFixas]=useState([]);
  const [lancamentos,setLancamentos]=useState([]);
  const [contasPagar,setContasPagar]=useState([]);
  const [despVars,setDespVars]=useState([]);
  const [mes,setMes]=useState(mesAtual());
  const [filtroPagar,setFiltroPagar]=useState('todas');
  const [novaDesp,setNovaDesp]=useState({descricao:'',categoria:'',valor:'',data_despesa:today(),data_vencimento:today()});
  const [novaFixa,setNovaFixa]=useState({descricao:'',valor:'',dia_vencimento:'5'});
  const [showNovaFixa,setShowNovaFixa]=useState(false);
  const [showNovaVar,setShowNovaVar]=useState(false);

  const load=useCallback(()=>{
    const [ano,m]=mes.split('-');
    const inicio=\`\${mes}-01\`;
    const ultimo=new Date(parseInt(ano),parseInt(m),0).getDate();
    const fim=\`\${mes}-\${String(ultimo).padStart(2,'0')}\`;
    GET(\`/financeiro/balanco?data_inicio=\${inicio}&data_fim=\${fim}\`).then(setBalanco);
    GET('/financeiro/projecao').then(setProjecao);
    GET('/despesas-fixas').then(setDespFixas);
    GET(\`/despesas-fixas/lancamentos?mes_ano=\${mes}\`).then(setLancamentos);
    GET(\`/financeiro/contas-a-pagar?filtro=\${filtroPagar}\`).then(setContasPagar);
    GET(\`/despesas-variaveis?mes_ano=\${mes}\`).then(setDespVars);
  },[mes,filtroPagar]);

  useEffect(()=>{load()},[load]);

  const gerarMes=async()=>{await POST('/despesas-fixas/gerar-mes',{mes_ano:mes});load()};
  const pagarLanc=async id=>{await PATCH(\`/despesas-fixas/lancamentos/\${id}/pagar\`,{});load()};
  const pagarVar=async id=>{await PATCH(\`/despesas-variaveis/\${id}/pagar\`,{});load()};

  const MESES_PT=['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'];

  const today_str=today();
  const em3=new Date();em3.setDate(em3.getDate()+3);

  const alertaConta=c=>{
    if(!c.data_vencimento)return'';
    if(c.data_vencimento<today_str)return 'vencida';
    if(c.data_vencimento<=em3.toISOString().slice(0,10))return 'vencendo';
    return '';
  };

  return(
    <div>
      <h2 style={{fontWeight:800,fontSize:18,marginBottom:16}}>Financeiro</h2>
      <div style={{display:'flex',gap:6,marginBottom:16,overflowX:'auto',paddingBottom:4}}>
        {['balanco','projecao','contas','despesas'].map(t=>(
          <button key={t} onClick={()=>setSubTab(t)} className="btn btn-sm" style={{whiteSpace:'nowrap',background:subTab===t?'var(--zinc-900)':'#fff',color:subTab===t?'#fff':'var(--zinc-700)',border:'1px solid var(--zinc-200)'}}>
            {t==='balanco'?'📊 Balanço':t==='projecao'?'📈 Projeção':t==='contas'?'💳 Contas a pagar':'📋 Despesas'}
          </button>
        ))}
      </div>

      {/* Balanço */}
      {subTab==='balanco'&&(
        <div>
          <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:16}}>
            <input className="inp" type="month" value={mes} onChange={e=>setMes(e.target.value)} style={{width:'auto'}}/>
          </div>
          {balanco&&(
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10,marginBottom:16}}>
              {[
                {label:'Entradas recebidas',val:balanco.entradas_recebidas,color:'var(--green)'},
                {label:'A receber',val:balanco.a_receber,color:'var(--blue)'},
                {label:'Despesas pagas',val:balanco.despesas_pagas,color:'var(--red)'},
                {label:'A pagar',val:balanco.a_pagar,color:'var(--orange)'},
              ].map(c=>(
                <div key={c.label} className="card">
                  <div style={{fontSize:11,color:'var(--zinc-400)',marginBottom:4}}>{c.label}</div>
                  <div style={{fontSize:20,fontWeight:800,color:c.color}}>{fmtBRL(c.val)}</div>
                </div>
              ))}
              <div className="card" style={{gridColumn:'1/-1',background:balanco.lucro_liquido>=0?'#f0fdf4':'#fef2f2',borderColor:balanco.lucro_liquido>=0?'#86efac':'#fca5a5'}}>
                <div style={{fontSize:11,color:'var(--zinc-400)',marginBottom:4}}>Lucro líquido</div>
                <div style={{fontSize:24,fontWeight:900,color:balanco.lucro_liquido>=0?'var(--green)':'var(--red)'}}>{fmtBRL(balanco.lucro_liquido)}</div>
                <div style={{fontSize:11,color:'var(--zinc-400)',marginTop:4}}>Entradas − despesas pagas − custo de materiais ({fmtBRL(balanco.custo_materiais)})</div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Projeção */}
      {subTab==='projecao'&&(
        <div>
          <div className="section-title">Próximos 6 meses</div>
          <div style={{display:'flex',flexDirection:'column',gap:8}}>
            {projecao.map(p=>{
              const [ano,m]=p.mes_ano.split('-');
              return(
                <div key={p.mes_ano} className="card">
                  <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:8}}>
                    <span style={{fontWeight:700,fontSize:14}}>{MESES_PT[parseInt(m)-1]} {ano}</span>
                    <span style={{fontWeight:800,fontSize:16,color:p.saldo_projetado>=0?'var(--green)':'var(--red)'}}>{fmtBRL(p.saldo_projetado)}</span>
                  </div>
                  <div style={{display:'flex',gap:16,fontSize:12,color:'var(--zinc-500)'}}>
                    <span>↑ Entradas: {fmtBRL(p.entradas_esperadas)}</span>
                    <span>↓ Fixas: {fmtBRL(p.despesas_fixas)}</span>
                  </div>
                  <div style={{marginTop:8,background:'var(--zinc-100)',borderRadius:999,height:6}}>
                    <div style={{height:6,borderRadius:999,background:p.saldo_projetado>=0?'var(--green)':'var(--red)',width:\`\${Math.min(100,Math.abs(p.entradas_esperadas>0?(p.saldo_projetado/p.entradas_esperadas)*100:0))}%\`}}/>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Contas a pagar */}
      {subTab==='contas'&&(
        <div>
          <div style={{display:'flex',gap:6,marginBottom:12,flexWrap:'wrap'}}>
            {[['todas','Todas'],['hoje','Hoje'],['semana','Esta semana'],['vencidas','Vencidas']].map(([v,l])=>(
              <button key={v} onClick={()=>setFiltroPagar(v)} className="btn btn-sm" style={{background:filtroPagar===v?'var(--zinc-900)':'#fff',color:filtroPagar===v?'#fff':'var(--zinc-700)',border:'1px solid var(--zinc-200)'}}>{l}</button>
            ))}
          </div>
          {contasPagar.length===0&&<div style={{textAlign:'center',padding:48,color:'var(--zinc-400)'}}>Nenhuma conta pendente</div>}
          <div style={{display:'flex',flexDirection:'column',gap:8}}>
            {contasPagar.map(c=>{
              const alerta=alertaConta(c);
              return(
                <div key={\`\${c.origem}-\${c.id}\`} className="card" style={{borderColor:alerta==='vencida'?'#fca5a5':alerta==='vencendo'?'#fed7aa':'var(--zinc-200)',background:alerta==='vencida'?'#fff5f5':alerta==='vencendo'?'#fff7ed':'#fff'}}>
                  <div style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}>
                    <div>
                      <div style={{fontWeight:600,fontSize:13}}>{c.descricao}</div>
                      <div style={{fontSize:11,color:'var(--zinc-400)',marginTop:2}}>
                        Vence: {fmtDate(c.data_vencimento)} · {c.origem==='fixa'?'Despesa fixa':'Variável'}
                        {alerta==='vencida'&&<span style={{color:'var(--red)',marginLeft:6,fontWeight:600}}>⚠️ Vencida</span>}
                        {alerta==='vencendo'&&<span style={{color:'var(--orange)',marginLeft:6,fontWeight:600}}>⚡ Vencendo</span>}
                      </div>
                    </div>
                    <div style={{display:'flex',alignItems:'center',gap:10}}>
                      <span style={{fontWeight:700,fontSize:15}}>{fmtBRL(c.valor)}</span>
                      <button className="btn btn-success btn-sm" onClick={()=>c.origem==='fixa'?pagarLanc(c.id):pagarVar(c.id)}>Pagar</button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Despesas */}
      {subTab==='despesas'&&(
        <div>
          <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:12}}>
            <input className="inp" type="month" value={mes} onChange={e=>setMes(e.target.value)} style={{width:'auto'}}/>
            <div style={{display:'flex',gap:6}}>
              <button className="btn btn-secondary btn-sm" onClick={()=>setShowNovaFixa(!showNovaFixa)}>+ Fixa</button>
              <button className="btn btn-secondary btn-sm" onClick={()=>setShowNovaVar(!showNovaVar)}>+ Variável</button>
              <button className="btn btn-primary btn-sm" onClick={gerarMes}>Gerar mês</button>
            </div>
          </div>

          {showNovaFixa&&(
            <div className="card" style={{marginBottom:12}}>
              <div className="section-title">Nova despesa fixa</div>
              <div className="grid3" style={{marginBottom:10}}>
                <div style={{gridColumn:'1/3'}}><label className="lbl">Descrição *</label><input className="inp" value={novaFixa.descricao} onChange={e=>setNovaFixa(p=>({...p,descricao:e.target.value}))}/></div>
                <div><label className="lbl">Valor (R$)</label><input className="inp" type="number" step="0.01" value={novaFixa.valor} onChange={e=>setNovaFixa(p=>({...p,valor:e.target.value}))}/></div>
                <div><label className="lbl">Dia vencimento</label><input className="inp" type="number" min="1" max="31" value={novaFixa.dia_vencimento} onChange={e=>setNovaFixa(p=>({...p,dia_vencimento:e.target.value}))}/></div>
              </div>
              <div style={{display:'flex',gap:8}}>
                <button className="btn btn-secondary" onClick={()=>setShowNovaFixa(false)}>Cancelar</button>
                <button className="btn btn-primary" disabled={!novaFixa.descricao||!novaFixa.valor} onClick={async()=>{await POST('/despesas-fixas',{...novaFixa,valor:parseFloat(novaFixa.valor),dia_vencimento:parseInt(novaFixa.dia_vencimento)});setShowNovaFixa(false);load();}}>Salvar</button>
              </div>
            </div>
          )}

          {showNovaVar&&(
            <div className="card" style={{marginBottom:12}}>
              <div className="section-title">Nova despesa variável</div>
              <div className="grid2" style={{marginBottom:10}}>
                <div style={{gridColumn:'1/-1'}}><label className="lbl">Descrição *</label><input className="inp" value={novaDesp.descricao} onChange={e=>setNovaDesp(p=>({...p,descricao:e.target.value}))}/></div>
                <div><label className="lbl">Categoria</label><input className="inp" value={novaDesp.categoria} onChange={e=>setNovaDesp(p=>({...p,categoria:e.target.value}))} placeholder="ex: Energia, Frete..."/></div>
                <div><label className="lbl">Valor (R$) *</label><input className="inp" type="number" step="0.01" value={novaDesp.valor} onChange={e=>setNovaDesp(p=>({...p,valor:e.target.value}))}/></div>
                <div><label className="lbl">Data</label><input className="inp" type="date" value={novaDesp.data_despesa} onChange={e=>setNovaDesp(p=>({...p,data_despesa:e.target.value}))}/></div>
                <div><label className="lbl">Vencimento</label><input className="inp" type="date" value={novaDesp.data_vencimento} onChange={e=>setNovaDesp(p=>({...p,data_vencimento:e.target.value}))}/></div>
              </div>
              <div style={{display:'flex',gap:8}}>
                <button className="btn btn-secondary" onClick={()=>setShowNovaVar(false)}>Cancelar</button>
                <button className="btn btn-primary" disabled={!novaDesp.descricao||!novaDesp.valor} onClick={async()=>{await POST('/despesas-variaveis',{...novaDesp,valor:parseFloat(novaDesp.valor)});setShowNovaVar(false);load();}}>Salvar</button>
              </div>
            </div>
          )}

          <div className="section-title">Despesas fixas — {mes}</div>
          {lancamentos.length===0&&<div style={{fontSize:12,color:'var(--zinc-400)',marginBottom:12}}>Nenhum lançamento. Clique em "Gerar mês" para criar.</div>}
          {lancamentos.map(l=>(
            <div key={l.id} className="card" style={{marginBottom:8,opacity:l.pago?0.6:1}}>
              <div style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}>
                <div>
                  <span style={{fontWeight:600,fontSize:13,textDecoration:l.pago?'line-through':'none'}}>{l.descricao}</span>
                  <div style={{fontSize:11,color:'var(--zinc-400)'}}>Vence {fmtDate(l.data_vencimento)}</div>
                </div>
                <div style={{display:'flex',alignItems:'center',gap:10}}>
                  <span style={{fontWeight:700}}>{fmtBRL(l.valor)}</span>
                  {!l.pago&&<button className="btn btn-success btn-sm" onClick={()=>pagarLanc(l.id)}>Pagar</button>}
                  {l.pago&&<span style={{fontSize:12,color:'var(--green)',fontWeight:600}}>✓ Pago</span>}
                </div>
              </div>
            </div>
          ))}

          <div className="section-title" style={{marginTop:16}}>Despesas variáveis — {mes}</div>
          {despVars.length===0&&<div style={{fontSize:12,color:'var(--zinc-400)'}}>Nenhuma despesa variável neste mês.</div>}
          {despVars.map(d=>(
            <div key={d.id} className="card" style={{marginBottom:8,opacity:d.pago?0.6:1}}>
              <div style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}>
                <div>
                  <span style={{fontWeight:600,fontSize:13,textDecoration:d.pago?'line-through':'none'}}>{d.descricao}</span>
                  {d.categoria&&<span style={{fontSize:11,color:'var(--zinc-400)',marginLeft:6}}>· {d.categoria}</span>}
                  <div style={{fontSize:11,color:'var(--zinc-400)'}}>Vence {fmtDate(d.data_vencimento)}</div>
                </div>
                <div style={{display:'flex',alignItems:'center',gap:10}}>
                  <span style={{fontWeight:700}}>{fmtBRL(d.valor)}</span>
                  {!d.pago&&<button className="btn btn-success btn-sm" onClick={()=>pagarVar(d.id)}>Pagar</button>}
                  {d.pago&&<span style={{fontSize:12,color:'var(--green)',fontWeight:600}}>✓ Pago</span>}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Fornecedores ──────────────────────────────────────────────────────────────
function Fornecedores(){
  const [lista,setLista]=useState([]);
  const [form,setForm]=useState({nome_empresa:'',nome_contato:'',telefone:'',email:''});
  const [showForm,setShowForm]=useState(false);
  const load=()=>GET('/fornecedores').then(setLista);
  useEffect(()=>{load()},[]);
  const submit=async()=>{await POST('/fornecedores',form);setForm({nome_empresa:'',nome_contato:'',telefone:'',email:''});setShowForm(false);load();};
  return(
    <div>
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:16}}>
        <h2 style={{fontWeight:800,fontSize:18}}>Fornecedores</h2>
        <button className="btn btn-primary" onClick={()=>setShowForm(!showForm)}>+ Novo</button>
      </div>
      {showForm&&(
        <div className="card" style={{marginBottom:16}}>
          <div className="grid2" style={{marginBottom:10}}>
            <div style={{gridColumn:'1/-1'}}><label className="lbl">Nome da empresa *</label><input className="inp" value={form.nome_empresa} onChange={e=>setForm(p=>({...p,nome_empresa:e.target.value}))}/></div>
            <div><label className="lbl">Contato</label><input className="inp" value={form.nome_contato} onChange={e=>setForm(p=>({...p,nome_contato:e.target.value}))}/></div>
            <div><label className="lbl">Telefone</label><input className="inp" value={form.telefone} onChange={e=>setForm(p=>({...p,telefone:e.target.value}))}/></div>
            <div style={{gridColumn:'1/-1'}}><label className="lbl">Email</label><input className="inp" type="email" value={form.email} onChange={e=>setForm(p=>({...p,email:e.target.value}))}/></div>
          </div>
          <div style={{display:'flex',gap:8}}><button className="btn btn-secondary" onClick={()=>setShowForm(false)}>Cancelar</button><button className="btn btn-primary" disabled={!form.nome_empresa} onClick={submit}>Salvar</button></div>
        </div>
      )}
      {lista.length===0&&<div style={{textAlign:'center',padding:48,color:'var(--zinc-400)'}}>Nenhum fornecedor cadastrado</div>}
      <div style={{display:'flex',flexDirection:'column',gap:8}}>
        {lista.map(f=>(
          <div key={f.id} className="card">
            <div style={{fontWeight:700,fontSize:14}}>{f.nome_empresa}</div>
            {f.nome_contato&&<div style={{fontSize:12,color:'var(--zinc-500)'}}>{f.nome_contato}</div>}
            <div style={{display:'flex',gap:16,fontSize:12,color:'var(--zinc-400)',marginTop:4}}>
              {f.telefone&&<span>📞 {f.telefone}</span>}
              {f.email&&<span>✉️ {f.email}</span>}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Dashboard ─────────────────────────────────────────────────────────────────
function Dashboard({onNav}){
  const [data,setData]=useState(null);
  useEffect(()=>{GET('/dashboard').then(setData)},[]);
  if(!data)return<div style={{padding:40,textAlign:'center',color:'var(--zinc-400)'}}>Carregando...</div>;
  return(
    <div>
      <div style={{marginBottom:20}}>
        <h2 style={{fontWeight:900,fontSize:22,letterSpacing:'-0.5px'}}>GSIM</h2>
        <p style={{fontSize:12,color:'var(--zinc-400)'}}>Comunicação Visual — {new Date().toLocaleDateString('pt-BR',{weekday:'long',day:'numeric',month:'long'})}</p>
      </div>
      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10,marginBottom:20}}>
        {[
          {label:'Pedidos em andamento',val:data.pedidos_ativos,color:'var(--blue)',tab:'pedidos'},
          {label:'Entregas hoje',val:data.entrega_hoje,color:data.entrega_hoje>0?'var(--orange)':'var(--zinc-400)',tab:'cronograma'},
          {label:'Materiais em baixa',val:data.materiais_baixos,color:data.materiais_baixos>0?'var(--red)':'var(--zinc-400)',tab:'estoque'},
          {label:'Orçamentos vencendo',val:data.orcamentos_vencendo,color:data.orcamentos_vencendo>0?'var(--orange)':'var(--zinc-400)',tab:'orcamentos'},
        ].map(c=>(
          <div key={c.label} className="card" style={{cursor:'pointer'}} onClick={()=>onNav(c.tab)}>
            <div style={{fontSize:11,color:'var(--zinc-400)',marginBottom:4}}>{c.label}</div>
            <div style={{fontSize:32,fontWeight:900,color:c.color}}>{c.val}</div>
          </div>
        ))}
      </div>
      {data.contas_vencendo>0&&<div className="alert alert-red">⚠️ {data.contas_vencendo} conta(s) vencendo em 3 dias — <button style={{background:'none',border:'none',textDecoration:'underline',cursor:'pointer',color:'inherit',fontWeight:600}} onClick={()=>onNav('financeiro')}>ver contas a pagar</button></div>}
    </div>
  );
}

// ── App Root ──────────────────────────────────────────────────────────────────
function App(){
  const [tab,setTab]=useState('dashboard');
  const [pedidoView,setPedidoView]=useState('lista');
  const [pedidoSelected,setPedidoSelected]=useState(null);
  const [pedidoEditing,setPedidoEditing]=useState(null);

  const TABS=[
    {id:'dashboard',label:'🏠'},
    {id:'pedidos',label:'📋'},
    {id:'orcamentos',label:'💼'},
    {id:'cronograma',label:'📅'},
    {id:'financeiro',label:'💰'},
    {id:'estoque',label:'📦'},
    {id:'fornecedores',label:'🏭'},
  ];

  const handleNav=t=>{setTab(t);setPedidoView('lista')};

  return(
    <div style={{maxWidth:720,margin:'0 auto',minHeight:'100vh',display:'flex',flexDirection:'column'}}>
      {/* Header */}
      <div style={{background:'#fff',borderBottom:'1px solid var(--zinc-200)',padding:'12px 16px',position:'sticky',top:0,zIndex:10}}>
        <div style={{display:'flex',gap:4,overflowX:'auto'}}>
          {TABS.map(t=>(
            <button key={t.id} onClick={()=>handleNav(t.id)}
              style={{padding:'8px 14px',borderRadius:10,border:'none',cursor:'pointer',fontSize:t.id==='dashboard'?18:14,fontWeight:600,whiteSpace:'nowrap',transition:'all .15s',
                background:tab===t.id?'var(--zinc-900)':'transparent',
                color:tab===t.id?'#fff':'var(--zinc-500)'}}>
              {t.label} {t.id!=='dashboard'&&<span style={{fontSize:11}}>{t.id==='pedidos'?'Pedidos':t.id==='orcamentos'?'Orçamentos':t.id==='cronograma'?'Agenda':t.id==='financeiro'?'Financeiro':t.id==='estoque'?'Estoque':'Fornec.'}</span>}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div style={{flex:1,padding:'20px 16px'}}>
        {tab==='dashboard'&&<Dashboard onNav={handleNav}/>}

        {tab==='pedidos'&&(
          <>
            {pedidoView==='lista'&&<ListaPedidos onNovo={()=>setPedidoView('novo')} onDetalhe={id=>{setPedidoSelected(id);setPedidoView('detalhe')}}/>}
            {pedidoView==='novo'&&<PedidoForm onCancel={()=>setPedidoView('lista')} onSave={async data=>{await POST('/pedidos',data);setPedidoView('lista')}}/>}
            {pedidoView==='detalhe'&&<PedidoDetalhe id={pedidoSelected} onBack={()=>setPedidoView('lista')} onEdit={p=>{setPedidoEditing(p);setPedidoView('editar')}}/>}
            {pedidoView==='editar'&&<PedidoForm inicial={pedidoEditing} onCancel={()=>setPedidoView('detalhe')} onSave={async data=>{await PUT(\`/pedidos/\${pedidoEditing.id}\`,data);setPedidoView('detalhe')}}/>}
          </>
        )}

        {tab==='orcamentos'&&<Orcamentos/>}
        {tab==='cronograma'&&<Cronograma/>}
        {tab==='financeiro'&&<Financeiro/>}
        {tab==='estoque'&&<Estoque/>}
        {tab==='fornecedores'&&<Fornecedores/>}
      </div>
    </div>
  );
}

ReactDOM.render(<App/>, document.getElementById('root'));
</script>
</body>
</html>
`;

app.get('/', (_, res) => res.type('html').send(INDEX_HTML));
app.get('/index.html', (_, res) => res.type('html').send(INDEX_HTML));

const uid = (p) => `${p}${Date.now().toString().slice(-6)}`;
const hoje = () => new Date().toISOString().slice(0,10);
const addDias = (data, dias) => { const d = new Date(data+'T00:00:00'); d.setDate(d.getDate()+dias); return d.toISOString().slice(0,10); };
const ultimoDiaMes = (ano, mes) => new Date(ano, mes, 0).getDate();

app.get('/api/fornecedores', async (_, res) => res.json(await all('SELECT * FROM fornecedores ORDER BY nome_empresa')));
app.post('/api/fornecedores', async (req, res) => { const { nome_empresa, nome_contato, telefone, email } = req.body; const r = await run('INSERT INTO fornecedores (nome_empresa,nome_contato,telefone,email) VALUES (?,?,?,?)', [nome_empresa, nome_contato||null, telefone||null, email||null]); res.json({ id: r.lastID }); });
app.put('/api/fornecedores/:id', async (req, res) => { const { nome_empresa, nome_contato, telefone, email } = req.body; await run('UPDATE fornecedores SET nome_empresa=?,nome_contato=?,telefone=?,email=? WHERE id=?', [nome_empresa, nome_contato||null, telefone||null, email||null, req.params.id]); res.json({ ok: true }); });
app.delete('/api/fornecedores/:id', async (req, res) => { await run('DELETE FROM fornecedores WHERE id=?', [req.params.id]); res.json({ ok: true }); });
app.get('/api/fornecedores/:id/compras', async (req, res) => res.json(await all('SELECT c.*,m.nome as material_nome,m.unidade_display FROM compras c JOIN materiais m ON c.material_id=m.id WHERE c.fornecedor_id=? ORDER BY c.data_compra DESC', [req.params.id])));

app.get('/api/materiais', async (_, res) => res.json(await all('SELECT * FROM materiais ORDER BY nome')));
app.post('/api/materiais', async (req, res) => { const { nome, tipo, especificacao, estoque_minimo, unidade_display } = req.body; const r = await run('INSERT INTO materiais (nome,tipo,especificacao,estoque_minimo,unidade_display) VALUES (?,?,?,?,?)', [nome, tipo, especificacao||null, estoque_minimo||0, unidade_display]); res.json({ id: r.lastID }); });
app.put('/api/materiais/:id', async (req, res) => { const { nome, especificacao, estoque_minimo, custo_medio } = req.body; await run('UPDATE materiais SET nome=?,especificacao=?,estoque_minimo=?,custo_medio=? WHERE id=?', [nome, especificacao||null, estoque_minimo||0, custo_medio||0, req.params.id]); res.json({ ok: true }); });
app.get('/api/materiais/:id/movimentos', async (req, res) => res.json(await all('SELECT em.*,p.numero as pedido_numero FROM estoque_movimentos em LEFT JOIN pedidos p ON em.pedido_id=p.id WHERE em.material_id=? ORDER BY em.criado_em DESC LIMIT 50', [req.params.id])));

app.post('/api/compras', async (req, res) => { const { fornecedor_id, material_id, quantidade, valor_total, data_compra, observacao } = req.body; const custo_unitario = valor_total/quantidade; const r = await run('INSERT INTO compras (fornecedor_id,material_id,quantidade,valor_total,custo_unitario,data_compra,observacao) VALUES (?,?,?,?,?,?,?)', [fornecedor_id||null,material_id,quantidade,valor_total,custo_unitario,data_compra,observacao||null]); const compra_id = r.lastID; const mat = await get('SELECT * FROM materiais WHERE id=?', [material_id]); const novo_estoque = mat.estoque_atual+quantidade; const novo_custo = novo_estoque>0?((mat.estoque_atual*mat.custo_medio)+(quantidade*custo_unitario))/novo_estoque:custo_unitario; await run('UPDATE materiais SET estoque_atual=?,custo_medio=? WHERE id=?', [novo_estoque,novo_custo,material_id]); await run('INSERT INTO estoque_movimentos (material_id,tipo,quantidade,custo_unitario,compra_id,observacao) VALUES (?,?,?,?,?,?)', [material_id,'entrada',quantidade,custo_unitario,compra_id,`Compra #${compra_id}`]); await run('INSERT INTO despesas_variaveis (descricao,categoria,valor,data_despesa,data_vencimento,pago,compra_id) VALUES (?,?,?,?,?,?,?)', [`Compra de material: ${mat.nome}`,'Material',valor_total,data_compra,data_compra,1,compra_id]); res.json({ id: compra_id }); });

app.get('/api/orcamentos', async (req, res) => { const { status } = req.query; const rows = status ? await all('SELECT * FROM orcamentos WHERE status=? ORDER BY criado_em DESC', [status]) : await all('SELECT * FROM orcamentos ORDER BY criado_em DESC'); res.json(rows); });
app.get('/api/orcamentos/:id', async (req, res) => { const orc = await get('SELECT * FROM orcamentos WHERE id=?', [req.params.id]); if (!orc) return res.status(404).json({ error: 'Não encontrado' }); orc.itens = await all('SELECT * FROM orcamento_itens WHERE orcamento_id=? ORDER BY id', [orc.id]); res.json(orc); });
app.post('/api/orcamentos', async (req, res) => { const { cliente_nome, cliente_tel, cliente_empresa, cliente_documento_tipo, cliente_documento, itens, desconto_tipo, desconto_valor, observacoes, validade_dias } = req.body; const data_orc=hoje(); const val_dias=validade_dias||7; const data_val=addDias(data_orc,val_dias); const numero=uid('ORC'); const valor_total=itens.reduce((s,i)=>s+(parseFloat(i.preco_total)||0),0); let valor_final=valor_total; if(desconto_tipo==='percentual'&&desconto_valor) valor_final=valor_total*(1-desconto_valor/100); if(desconto_tipo==='valor'&&desconto_valor) valor_final=valor_total-desconto_valor; const r=await run('INSERT INTO orcamentos (numero,cliente_nome,cliente_tel,cliente_empresa,cliente_documento_tipo,cliente_documento,data_orcamento,data_validade,validade_dias,desconto_tipo,desconto_valor,valor_total,valor_final,observacoes) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)', [numero,cliente_nome,cliente_tel,cliente_empresa||null,cliente_documento_tipo||null,cliente_documento||null,data_orc,data_val,val_dias,desconto_tipo||null,desconto_valor||0,valor_total,valor_final,observacoes||null]); const orc_id=r.lastID; for(const item of itens){await run('INSERT INTO orcamento_itens (orcamento_id,tipo_servico,descricao,quantidade,unidade,largura,altura,area_m2,metros_lineares,perimetro_ml,material_id,material_quantidade,material_id2,material_quantidade2,acabamento,especificacoes,preco_referencia,preco_unitario,preco_total,terceirizado) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)', [orc_id,item.tipo_servico,item.descricao||null,item.quantidade||1,item.unidade||null,item.largura||null,item.altura||null,item.area_m2||null,item.metros_lineares||null,item.perimetro_ml||null,item.material_id||null,item.material_quantidade||null,item.material_id2||null,item.material_quantidade2||null,item.acabamento||null,item.especificacoes?JSON.stringify(item.especificacoes):null,item.preco_referencia||null,item.preco_unitario||null,item.preco_total||null,item.terceirizado?1:0]);} res.json({id:orc_id,numero}); });
app.patch('/api/orcamentos/:id/status', async (req, res) => { await run('UPDATE orcamentos SET status=? WHERE id=?', [req.body.status, req.params.id]); res.json({ ok: true }); });
app.post('/api/orcamentos/:id/nova-versao', async (req, res) => { const pai=await get('SELECT * FROM orcamentos WHERE id=?', [req.params.id]); if(!pai) return res.status(404).json({error:'Não encontrado'}); const itens=await all('SELECT * FROM orcamento_itens WHERE orcamento_id=?', [pai.id]); const numero=uid('ORC'); const data_orc=hoje(); const data_val=addDias(data_orc,pai.validade_dias||7); const r=await run('INSERT INTO orcamentos (numero,cliente_nome,cliente_tel,cliente_empresa,cliente_documento_tipo,cliente_documento,data_orcamento,data_validade,validade_dias,desconto_tipo,desconto_valor,valor_total,valor_final,observacoes,versao,orcamento_pai_id) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)', [numero,pai.cliente_nome,pai.cliente_tel,pai.cliente_empresa,pai.cliente_documento_tipo,pai.cliente_documento,data_orc,data_val,pai.validade_dias,pai.desconto_tipo,pai.desconto_valor,pai.valor_total,pai.valor_final,pai.observacoes,(pai.versao||1)+1,pai.id]); const orc_id=r.lastID; for(const item of itens){await run('INSERT INTO orcamento_itens (orcamento_id,tipo_servico,descricao,quantidade,unidade,largura,altura,area_m2,metros_lineares,perimetro_ml,material_id,material_quantidade,material_id2,material_quantidade2,acabamento,especificacoes,preco_referencia,preco_unitario,preco_total,terceirizado) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)', [orc_id,item.tipo_servico,item.descricao,item.quantidade,item.unidade,item.largura,item.altura,item.area_m2,item.metros_lineares,item.perimetro_ml,item.material_id,item.material_quantidade,item.material_id2,item.material_quantidade2,item.acabamento,item.especificacoes,item.preco_referencia,item.preco_unitario,item.preco_total,item.terceirizado]);} res.json({id:orc_id,numero}); });
app.post('/api/orcamentos/:id/converter', async (req, res) => { const { data_entrega, forma_pagamento, valor_sinal } = req.body; const orc=await get('SELECT * FROM orcamentos WHERE id=?', [req.params.id]); if(!orc) return res.status(404).json({error:'Não encontrado'}); const itens=await all('SELECT * FROM orcamento_itens WHERE orcamento_id=?', [orc.id]); const numero=uid('PED'); const r=await run('INSERT INTO pedidos (numero,orcamento_id,cliente_nome,cliente_tel,cliente_empresa,cliente_documento_tipo,cliente_documento,data_entrada,data_entrega,forma_pagamento,valor_total,valor_sinal,observacoes) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)', [numero,orc.id,orc.cliente_nome,orc.cliente_tel,orc.cliente_empresa,orc.cliente_documento_tipo,orc.cliente_documento,hoje(),data_entrega,forma_pagamento||null,orc.valor_final,valor_sinal||0,orc.observacoes]); const ped_id=r.lastID; for(const item of itens){await run('INSERT INTO pedido_itens (pedido_id,tipo_servico,descricao,quantidade,unidade,largura,altura,area_m2,metros_lineares,perimetro_ml,material_id,material_quantidade,material_id2,material_quantidade2,acabamento,especificacoes,preco_unitario,preco_total,terceirizado) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)', [ped_id,item.tipo_servico,item.descricao,item.quantidade,item.unidade,item.largura,item.altura,item.area_m2,item.metros_lineares,item.perimetro_ml,item.material_id,item.material_quantidade,item.material_id2,item.material_quantidade2,item.acabamento,item.especificacoes,item.preco_unitario,item.preco_total,item.terceirizado]); if(!item.terceirizado&&item.material_id&&item.material_quantidade){const mat=await get('SELECT * FROM materiais WHERE id=?', [item.material_id]); if(mat){await run('UPDATE materiais SET estoque_atual=? WHERE id=?', [mat.estoque_atual-item.material_quantidade,item.material_id]); await run('INSERT INTO estoque_movimentos (material_id,tipo,quantidade,pedido_id) VALUES (?,?,?,?)', [item.material_id,'saida',item.material_quantidade,ped_id]);}}} await run('UPDATE orcamentos SET status=?,pedido_id=? WHERE id=?', ['Aprovado',ped_id,orc.id]); res.json({ped_id,numero}); });
app.post('/api/orcamentos/preco-referencia', async (req, res) => { const { tipo_servico, material_id, material_quantidade } = req.body; let custo_material=0; if(material_id&&material_quantidade){const mat=await get('SELECT custo_medio FROM materiais WHERE id=?', [material_id]); if(mat) custo_material+=mat.custo_medio*material_quantidade;} const historico=await get('SELECT AVG(preco_total/NULLIF(area_m2,0)) as media_m2, AVG(preco_total) as media_total FROM orcamento_itens WHERE tipo_servico=? AND preco_total>0', [tipo_servico]); res.json({custo_material,sugestao:custo_material>0?custo_material*3:null,historico}); });

app.get('/api/pedidos', async (req, res) => { const { status, q } = req.query; let sql='SELECT * FROM pedidos WHERE 1=1'; const params=[]; if(status&&status!=='todos'){sql+=' AND status=?'; params.push(status);} if(q){sql+=' AND (cliente_nome LIKE ? OR numero LIKE ?)'; params.push(`%${q}%`,`%${q}%`);} sql+=' ORDER BY criado_em DESC'; res.json(await all(sql,params)); });
app.get('/api/pedidos/:id', async (req, res) => { const ped=await get('SELECT * FROM pedidos WHERE id=?', [req.params.id]); if(!ped) return res.status(404).json({error:'Não encontrado'}); ped.itens=await all('SELECT pi.*,m.nome as material_nome,m.unidade_display,m2.nome as material_nome2 FROM pedido_itens pi LEFT JOIN materiais m ON pi.material_id=m.id LEFT JOIN materiais m2 ON pi.material_id2=m2.id WHERE pi.pedido_id=? ORDER BY pi.id', [ped.id]); res.json(ped); });
app.post('/api/pedidos', async (req, res) => { const { cliente_nome, cliente_tel, cliente_empresa, cliente_documento_tipo, cliente_documento, data_entrada, data_entrega, forma_pagamento, valor_sinal, observacoes, itens } = req.body; const numero=uid('PED'); const valor_total=itens.reduce((s,i)=>s+(parseFloat(i.preco_total)||0),0); const r=await run('INSERT INTO pedidos (numero,cliente_nome,cliente_tel,cliente_empresa,cliente_documento_tipo,cliente_documento,data_entrada,data_entrega,forma_pagamento,valor_total,valor_sinal,observacoes) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)', [numero,cliente_nome,cliente_tel,cliente_empresa||null,cliente_documento_tipo||null,cliente_documento||null,data_entrada,data_entrega,forma_pagamento||null,valor_total,valor_sinal||0,observacoes||null]); const ped_id=r.lastID; for(const item of itens){await run('INSERT INTO pedido_itens (pedido_id,tipo_servico,descricao,quantidade,unidade,largura,altura,area_m2,metros_lineares,perimetro_ml,material_id,material_quantidade,material_id2,material_quantidade2,acabamento,especificacoes,preco_unitario,preco_total,terceirizado) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)', [ped_id,item.tipo_servico,item.descricao||null,item.quantidade||1,item.unidade||null,item.largura||null,item.altura||null,item.area_m2||null,item.metros_lineares||null,item.perimetro_ml||null,item.material_id||null,item.material_quantidade||null,item.material_id2||null,item.material_quantidade2||null,item.acabamento||null,item.especificacoes?JSON.stringify(item.especificacoes):null,item.preco_unitario||null,item.preco_total||null,item.terceirizado?1:0]); if(!item.terceirizado&&item.material_id&&item.material_quantidade){const mat=await get('SELECT * FROM materiais WHERE id=?', [item.material_id]); if(mat){await run('UPDATE materiais SET estoque_atual=? WHERE id=?', [mat.estoque_atual-item.material_quantidade,item.material_id]); await run('INSERT INTO estoque_movimentos (material_id,tipo,quantidade,pedido_id) VALUES (?,?,?,?)', [item.material_id,'saida',item.material_quantidade,ped_id]);}}} res.json({id:ped_id,numero}); });
app.patch('/api/pedidos/:id/status', async (req, res) => { await run('UPDATE pedidos SET status=? WHERE id=?', [req.body.status, req.params.id]); res.json({ok:true}); });
app.patch('/api/pedidos/:id/pagamento', async (req, res) => { await run('UPDATE pedidos SET sinal_pago=?,saldo_pago=? WHERE id=?', [req.body.sinal_pago?1:0,req.body.saldo_pago?1:0,req.params.id]); res.json({ok:true}); });
app.get('/api/pedidos/:id/nf', async (req, res) => { const ped=await get('SELECT * FROM pedidos WHERE id=?', [req.params.id]); if(!ped) return res.status(404).json({error:'Não encontrado'}); const itens=await all('SELECT * FROM pedido_itens WHERE pedido_id=?', [ped.id]); const linhas=itens.map(i=>`${[i.tipo_servico,i.descricao].filter(Boolean).join(' - ')} | Qtd: ${i.quantidade} ${i.unidade||'un'} | Unit: R$ ${Number(i.preco_unitario||0).toFixed(2)} | Total: R$ ${Number(i.preco_total||0).toFixed(2)}`); const texto=`DESCRIÇÃO PARA NFS-e\n\nPedido: ${ped.numero}\nCliente: ${ped.cliente_nome}${ped.cliente_empresa?' / '+ped.cliente_empresa:''}${ped.cliente_documento?'\n'+ped.cliente_documento_tipo+': '+ped.cliente_documento:''}\n\nSERVIÇOS:\n${linhas.join('\n')}\n\nTOTAL: R$ ${Number(ped.valor_total||0).toFixed(2)}\n\nGsim Comunicação Visual`; await run('UPDATE pedidos SET nf_gerada=1 WHERE id=?', [ped.id]); res.json({texto}); });

app.get('/api/despesas-fixas', async (_,res) => res.json(await all('SELECT * FROM despesas_fixas WHERE ativo=1 ORDER BY dia_vencimento')));
app.post('/api/despesas-fixas', async (req,res) => { const {descricao,valor,dia_vencimento}=req.body; const r=await run('INSERT INTO despesas_fixas (descricao,valor,dia_vencimento) VALUES (?,?,?)', [descricao,valor,dia_vencimento]); res.json({id:r.lastID}); });
app.put('/api/despesas-fixas/:id', async (req,res) => { const {descricao,valor,dia_vencimento,ativo}=req.body; await run('UPDATE despesas_fixas SET descricao=?,valor=?,dia_vencimento=?,ativo=? WHERE id=?', [descricao,valor,dia_vencimento,ativo?1:0,req.params.id]); res.json({ok:true}); });
app.post('/api/despesas-fixas/gerar-mes', async (req,res) => { const {mes_ano}=req.body; const [ano,mes]=mes_ano.split('-').map(Number); const fixas=await all('SELECT * FROM despesas_fixas WHERE ativo=1'); let gerados=0; for(const f of fixas){const existe=await get('SELECT id FROM despesas_fixas_lancamentos WHERE despesa_fixa_id=? AND mes_ano=?', [f.id,mes_ano]); if(!existe){const dia=Math.min(f.dia_vencimento,ultimoDiaMes(ano,mes)); await run('INSERT INTO despesas_fixas_lancamentos (despesa_fixa_id,mes_ano,valor,data_vencimento) VALUES (?,?,?,?)', [f.id,mes_ano,f.valor,`${mes_ano}-${String(dia).padStart(2,'0')}`]); gerados++;}} res.json({gerados}); });
app.get('/api/despesas-fixas/lancamentos', async (req,res) => { const {mes_ano}=req.query; const rows=mes_ano?await all('SELECT dfl.*,df.descricao FROM despesas_fixas_lancamentos dfl JOIN despesas_fixas df ON dfl.despesa_fixa_id=df.id WHERE dfl.mes_ano=? ORDER BY dfl.data_vencimento', [mes_ano]):await all('SELECT dfl.*,df.descricao FROM despesas_fixas_lancamentos dfl JOIN despesas_fixas df ON dfl.despesa_fixa_id=df.id ORDER BY dfl.data_vencimento'); res.json(rows); });
app.patch('/api/despesas-fixas/lancamentos/:id/pagar', async (req,res) => { await run('UPDATE despesas_fixas_lancamentos SET pago=1,data_pagamento=? WHERE id=?', [hoje(),req.params.id]); res.json({ok:true}); });
app.get('/api/despesas-variaveis', async (req,res) => { const {mes_ano,pago}=req.query; let sql='SELECT * FROM despesas_variaveis WHERE 1=1'; const params=[]; if(mes_ano){sql+=" AND strftime('%Y-%m',data_despesa)=?"; params.push(mes_ano);} if(pago!==undefined){sql+=' AND pago=?'; params.push(parseInt(pago));} res.json(await all(sql+' ORDER BY data_vencimento,data_despesa',params)); });
app.post('/api/despesas-variaveis', async (req,res) => { const {descricao,categoria,valor,data_despesa,data_vencimento,pago}=req.body; const r=await run('INSERT INTO despesas_variaveis (descricao,categoria,valor,data_despesa,data_vencimento,pago) VALUES (?,?,?,?,?,?)', [descricao,categoria||null,valor,data_despesa,data_vencimento||data_despesa,pago?1:0]); res.json({id:r.lastID}); });
app.patch('/api/despesas-variaveis/:id/pagar', async (req,res) => { await run('UPDATE despesas_variaveis SET pago=1,data_pagamento=? WHERE id=?', [hoje(),req.params.id]); res.json({ok:true}); });



app.get('/api/financeiro/balanco', async (req,res) => {
  const {data_inicio,data_fim}=req.query;
  const er=await get('SELECT COALESCE(SUM(CASE WHEN sinal_pago=1 THEN valor_sinal ELSE 0 END)+SUM(CASE WHEN saldo_pago=1 THEN (valor_total-valor_sinal) ELSE 0 END),0) as total FROM pedidos WHERE data_entrada BETWEEN ? AND ?', [data_inicio,data_fim]);
  const ar=await get("SELECT COALESCE(SUM(CASE WHEN sinal_pago=0 THEN valor_sinal ELSE 0 END)+SUM(CASE WHEN saldo_pago=0 THEN (valor_total-valor_sinal) ELSE 0 END),0) as total FROM pedidos WHERE status NOT IN ('Cancelado','Finalizado') AND data_entrega BETWEEN ? AND ?", [data_inicio,data_fim]);
  const dfp=await get('SELECT COALESCE(SUM(valor),0) as total FROM despesas_fixas_lancamentos WHERE pago=1 AND data_vencimento BETWEEN ? AND ?', [data_inicio,data_fim]);
  const dvp=await get('SELECT COALESCE(SUM(valor),0) as total FROM despesas_variaveis WHERE pago=1 AND data_despesa BETWEEN ? AND ?', [data_inicio,data_fim]);
  const dfpend=await get('SELECT COALESCE(SUM(valor),0) as total FROM despesas_fixas_lancamentos WHERE pago=0 AND data_vencimento BETWEEN ? AND ?', [data_inicio,data_fim]);
  const dvpend=await get('SELECT COALESCE(SUM(valor),0) as total FROM despesas_variaveis WHERE pago=0 AND data_vencimento BETWEEN ? AND ?', [data_inicio,data_fim]);
  const cm=await get("SELECT COALESCE(SUM(em.quantidade*em.custo_unitario),0) as total FROM estoque_movimentos em JOIN pedidos p ON em.pedido_id=p.id WHERE em.tipo='saida' AND p.data_entrada BETWEEN ? AND ?", [data_inicio,data_fim]);
  const total_desp=dfp.total+dvp.total+cm.total;
  res.json({entradas_recebidas:er.total,a_receber:ar.total,despesas_pagas:total_desp,despesas_fixas_pagas:dfp.total,despesas_variaveis_pagas:dvp.total,custo_materiais:cm.total,a_pagar:dfpend.total+dvpend.total,lucro_liquido:er.total-total_desp});
});
app.get('/api/financeiro/projecao', async (_,res) => { const meses=[]; const agora=new Date(); for(let i=0;i<6;i++){const d=new Date(agora.getFullYear(),agora.getMonth()+i,1); const ma=`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`; const inicio=`${ma}-01`; const fim=`${ma}-${String(ultimoDiaMes(d.getFullYear(),d.getMonth()+1)).padStart(2,'0')}`; const entradas=await get("SELECT COALESCE(SUM(valor_total-valor_sinal),0) as total FROM pedidos WHERE saldo_pago=0 AND data_entrega BETWEEN ? AND ? AND status NOT IN ('Cancelado')", [inicio,fim]); const desp_fixas=await get('SELECT COALESCE(SUM(valor),0) as total FROM despesas_fixas WHERE ativo=1'); meses.push({mes_ano:ma,entradas_esperadas:entradas.total,despesas_fixas:desp_fixas.total,saldo_projetado:entradas.total-desp_fixas.total});} res.json(meses); });

app.get('/api/financeiro/contas-a-pagar', async (req,res) => { const {filtro}=req.query; const hj=hoje(); const em7=addDias(hj,7); let fixas,vars; if(filtro==='hoje'){fixas=await all("SELECT 'fixa' as origem,dfl.id,df.descricao,dfl.valor,dfl.data_vencimento,dfl.pago FROM despesas_fixas_lancamentos dfl JOIN despesas_fixas df ON dfl.despesa_fixa_id=df.id WHERE dfl.pago=0 AND dfl.data_vencimento=?",[hj]); vars=await all("SELECT 'variavel' as origem,id,descricao,valor,data_vencimento,pago FROM despesas_variaveis WHERE pago=0 AND data_vencimento=?",[hj]);}else if(filtro==='semana'){fixas=await all("SELECT 'fixa' as origem,dfl.id,df.descricao,dfl.valor,dfl.data_vencimento,dfl.pago FROM despesas_fixas_lancamentos dfl JOIN despesas_fixas df ON dfl.despesa_fixa_id=df.id WHERE dfl.pago=0 AND dfl.data_vencimento BETWEEN ? AND ?",[hj,em7]); vars=await all("SELECT 'variavel' as origem,id,descricao,valor,data_vencimento,pago FROM despesas_variaveis WHERE pago=0 AND data_vencimento BETWEEN ? AND ?",[hj,em7]);}else if(filtro==='vencidas'){fixas=await all("SELECT 'fixa' as origem,dfl.id,df.descricao,dfl.valor,dfl.data_vencimento,dfl.pago FROM despesas_fixas_lancamentos dfl JOIN despesas_fixas df ON dfl.despesa_fixa_id=df.id WHERE dfl.pago=0 AND dfl.data_vencimento<?",[hj]); vars=await all("SELECT 'variavel' as origem,id,descricao,valor,data_vencimento,pago FROM despesas_variaveis WHERE pago=0 AND data_vencimento<?",[hj]);}else{fixas=await all("SELECT 'fixa' as origem,dfl.id,df.descricao,dfl.valor,dfl.data_vencimento,dfl.pago FROM despesas_fixas_lancamentos dfl JOIN despesas_fixas df ON dfl.despesa_fixa_id=df.id WHERE dfl.pago=0 ORDER BY dfl.data_vencimento"); vars=await all("SELECT 'variavel' as origem,id,descricao,valor,data_vencimento,pago FROM despesas_variaveis WHERE pago=0 ORDER BY data_vencimento");} res.json([...fixas,...vars].sort((a,b)=>(a.data_vencimento||''). localeCompare(b.data_vencimento||'')));});

app.get('/api/cronograma', async (_,res) => { const em2=addDias(hoje(),2); const pedidos=await all("SELECT * FROM pedidos WHERE status NOT IN ('Finalizado','Cancelado') ORDER BY data_entrega ASC"); const orcamentos=await all("SELECT * FROM orcamentos WHERE status='Em aberto' AND data_validade<=? ORDER BY data_validade ASC",[em2]); res.json({pedidos,orcamentos_vencendo:orcamentos}); });

app.get('/api/dashboard', async (_,res) => { const hj=hoje(); const em3=addDias(hj,3); const em2=addDias(hj,2); const pa=await get("SELECT COUNT(*) as c FROM pedidos WHERE status NOT IN ('Finalizado','Cancelado')"); const eh=await get("SELECT COUNT(*) as c FROM pedidos WHERE data_entrega=? AND status NOT IN ('Finalizado','Cancelado')",[hj]); const mb=await get('SELECT COUNT(*) as c FROM materiais WHERE estoque_atual<=estoque_minimo AND estoque_minimo>0'); const ov=await get("SELECT COUNT(*) as c FROM orcamentos WHERE status='Em aberto' AND data_validade<=?",[em2]); const cv1=await get('SELECT COUNT(*) as c FROM despesas_fixas_lancamentos WHERE pago=0 AND data_vencimento<=?',[em3]); const cv2=await get('SELECT COUNT(*) as c FROM despesas_variaveis WHERE pago=0 AND data_vencimento<=?',[em3]); res.json({pedidos_ativos:pa.c,entrega_hoje:eh.c,materiais_baixos:mb.c,orcamentos_vencendo:ov.c,contas_vencendo:cv1.c+cv2.c}); });

app.get('*', (_, res) => res.type('html').send(INDEX_HTML));

const PORT = process.env.PORT || 3000;
init().then(() => {
  app.listen(PORT, () => console.log(`GSIM rodando na porta ${PORT}`));
}).catch(err => { console.error('Erro ao iniciar banco:', err); process.exit(1); });
