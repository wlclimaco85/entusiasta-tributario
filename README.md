# Entusiasta Tributário

Portal de notícias e artigos do meio tributário e empresarial.

## Tecnologias
- HTML5 + CSS3 + JavaScript (Vanilla)
- Backend: AppAcademia Spring Boot (Railway)
- Grid: Grid.js | Gráficos: Chart.js
- Cotações: AwesomeAPI (câmbio) + CoinGecko (cripto) + Yahoo Finance (bolsa)

## Cores
- Preto: `#0a0a0a` | Laranja: `#e07b00` | Branco: `#ffffff`

## URLs do Backend
- **Produção**: `https://appacademia-production-be7e.up.railway.app/boletobancos`
- **Dev local**: `http://localhost:8088/boletobancos`

## ⚠️ Setup inicial no Railway

A tabela `artigo` precisa ser criada manualmente no banco do Railway:

1. Acesse o painel do Railway → seu projeto → banco PostgreSQL
2. Clique em **"Query"** ou use o **pgAdmin/DBeaver** conectado ao Railway
3. Execute o arquivo `setup_railway.sql` deste projeto
4. Ou execute o SQL mínimo:

```sql
CREATE TABLE IF NOT EXISTS public.artigo (
    id SERIAL PRIMARY KEY,
    titulo VARCHAR(300) NOT NULL,
    slug VARCHAR(300) UNIQUE,
    resumo TEXT,
    conteudo_completo TEXT,
    autor VARCHAR(150),
    categoria VARCHAR(100),
    tags VARCHAR(500),
    imagem_capa VARCHAR(500),
    subtitulo VARCHAR(500),
    fonte VARCHAR(300),
    link_fonte VARCHAR(500),
    ordem_exibicao INTEGER NOT NULL DEFAULT 0,
    destaque BOOLEAN NOT NULL DEFAULT FALSE,
    publicado BOOLEAN NOT NULL DEFAULT FALSE,
    tempo_leitura_min INTEGER,
    visualizacoes BIGINT NOT NULL DEFAULT 0,
    data_publicacao TIMESTAMP WITHOUT TIME ZONE,
    cod_app INTEGER,
    menu_categorias VARCHAR(300) DEFAULT 'home',
    empresa_id INTEGER,
    parceiro_id INTEGER,
    app_id INTEGER,
    user_logado_id INTEGER,
    dh_created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW(),
    dh_updated_at TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW()
);
```

## Estrutura
```
entusiasta-tributario/
├── index.html          # Home
├── artigo.html         # Leitura do artigo
├── admin.html          # Painel admin (Grid.js + Chart.js)
├── login.html          # Login JWT
├── cotacoes.html       # Cotações (Ibovespa, moedas, cripto)
├── setup_railway.sql   # Script SQL para Railway
├── css/style.css
└── js/
    ├── api.js          # Chamadas ao backend
    ├── home.js         # Lógica da home
    ├── artigo.js       # Lógica do artigo
    ├── admin.js        # Painel admin
    ├── cotacoes.js     # Página de cotações
    └── cotacoes_widget.js  # Widget da sidebar
```

## Como rodar localmente
1. Inicie o backend AppAcademia (`mvn spring-boot:run`)
2. Abra `index.html` no navegador (Live Server recomendado)
3. Para admin: `admin.html` → login com credenciais do app
