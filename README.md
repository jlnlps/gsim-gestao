# GSIM — Sistema de Gestão
## Comunicação Visual

---

## ⚡ Como subir no Replit (passo a passo com a interface atual)

### 1. Você já está logada no Replit — ótimo.

---

### 2. Clique em "Import code or design"
Na barra lateral esquerda, a **segunda opção** abaixo de "Create something new".

> ⚠️ **Não use o campo central "Design a UI"** — esse é o Replit Agent (IA) e não é o que precisamos aqui.

---

### 3. Se não funcionar via Import, use "Projects"
1. Clique em **"Projects"** no menu esquerdo
2. Procure um botão **"+ New project"** que aparece nessa tela
3. Quando pedir o tipo, procure **"Node.js"**
4. Dê o nome `gsim-gestao` e confirme

---

### 4. Dentro do projeto — criar os arquivos
No painel de arquivos à esquerda do editor:

**a)** Clique no ícone de **"+"** (novo arquivo) e crie:
- `package.json` → cole o conteúdo do arquivo package.json daqui
- `server.js` → cole o conteúdo do arquivo server.js daqui
- `database.js` → cole o conteúdo do arquivo database.js daqui

**b)** Crie uma **pasta** chamada `client`:
- Dentro dela, crie o arquivo `index.html` → cole o conteúdo daqui

A estrutura final deve ficar assim:
```
gsim-gestao/
├── package.json
├── server.js
├── database.js
└── client/
    └── index.html
```

---

### 5. Instalar as dependências
Clique na aba **"Shell"** ou **"Console"** (parte de baixo da tela) e rode:
```bash
npm install
```
Aguarde terminar (aparece um `$` no final quando acabar).

---

### 6. Rodar
Clique no botão **▶ Run** no topo da tela.

O Replit vai gerar um link público tipo:
```
https://gsim-gestao.seuusuario.repl.co
```

✅ **Esse link funciona em qualquer celular ou computador, para sua mãe e seu pai.**

---

> 💡 **Se travar em qualquer passo:** tira um print e me manda — ajusto as instruções na hora.

---

## 📱 Como usar no dia a dia

1. Salve o link nos favoritos do celular
2. No iPhone/Android: abra o link no Chrome/Safari → "Adicionar à tela inicial" → vira um ícone igual a um app
3. Seu pai e sua mãe podem usar ao mesmo tempo em dispositivos diferentes — os dados ficam no banco de dados do Replit

---

## 🔒 Segurança

O link é privado por padrão (ninguém acha por acidente). Para mais segurança, você pode:
- Ativar autenticação básica (me peça o código)
- Usar o plano pago do Replit para garantir que o servidor nunca "dorme"

---

## 💾 Banco de dados

O sistema usa **SQLite** — um arquivo `gsim.db` criado automaticamente na primeira vez que rodar. Todos os dados ficam salvos lá.

No plano gratuito do Replit, o servidor pode "dormir" após inatividade, mas os **dados nunca se perdem** — ficam no arquivo do banco.

---

## 📋 Módulos do sistema

| Módulo | O que faz |
|---|---|
| 🏠 Dashboard | Visão geral: pedidos ativos, entregas do dia, alertas |
| 📋 Pedidos | Cadastro completo com itens por tipo de serviço, PDF, NF |
| 💼 Orçamentos | Orçamentos com preço referência, versões, conversão em pedido |
| 📅 Cronograma | Agenda visual de todos os pedidos em andamento |
| 💰 Financeiro | Balanço, despesas fixas/variáveis, projeção 6 meses |
| 📦 Estoque | Controle de materiais, compras, consumo automático por pedido |
| 🏭 Fornecedores | Cadastro de fornecedores com histórico de compras |

---

## 🆘 Suporte

Se algo não funcionar, os erros aparecem no terminal do Replit.
Os mais comuns:
- `Cannot find module 'better-sqlite3'` → rode `npm install` novamente
- Página em branco → verifique se o arquivo `client/index.html` está na pasta correta
