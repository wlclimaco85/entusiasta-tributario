# Entusiasta Tributário

Portal de notícias e artigos do meio tributário e empresarial.

## Tecnologias
- HTML5 + CSS3 + JavaScript (Vanilla)
- Backend: AppAcademia Spring Boot (endpoint `/api/artigos`)
- Autenticação: JWT (mesmo login do app)

## Cores
- Preto: `#0a0a0a`
- Laranja escuro: `#e07b00`
- Branco: `#ffffff`

## Estrutura
```
entusiasta-tributario/
├── index.html          # Home — listagem de artigos
├── artigo.html         # Página de leitura do artigo
├── admin.html          # Painel de administração (criar/editar artigos)
├── login.html          # Login (usa JWT do app)
├── css/
│   └── style.css       # Estilos globais
├── js/
│   ├── api.js          # Chamadas ao backend
│   ├── home.js         # Lógica da home
│   ├── artigo.js       # Lógica da página de artigo
│   └── admin.js        # Lógica do painel admin
└── assets/
    └── logo.png        # Logo do site
```

## Como rodar
1. Inicie o backend AppAcademia (`mvn spring-boot:run`)
2. Abra `index.html` no navegador (ou sirva com Live Server)
3. Para administrar artigos, acesse `admin.html` e faça login

## Deploy
O site é estático — pode ser hospedado em qualquer CDN (Netlify, Vercel, GitHub Pages).
Configure a variável `API_BASE` em `js/api.js` para apontar para o backend em produção.
