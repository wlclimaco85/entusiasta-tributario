-- ============================================================
-- setup_railway.sql
-- Execute este script no banco PostgreSQL do Railway para
-- criar a tabela artigo e inserir os artigos de exemplo.
-- ============================================================

-- Cria tabela artigo (idempotente)
CREATE TABLE IF NOT EXISTS public.artigo (
    id                  SERIAL PRIMARY KEY,
    titulo              VARCHAR(300) NOT NULL,
    subtitulo           VARCHAR(500),
    resumo              TEXT,
    conteudo_completo   TEXT,
    autor               VARCHAR(150),
    categoria           VARCHAR(100),
    tags                VARCHAR(500),
    imagem_capa         VARCHAR(500),
    slug                VARCHAR(300) UNIQUE,
    fonte               VARCHAR(300),
    link_fonte          VARCHAR(500),
    ordem_exibicao      INTEGER NOT NULL DEFAULT 0,
    destaque            BOOLEAN NOT NULL DEFAULT FALSE,
    publicado           BOOLEAN NOT NULL DEFAULT FALSE,
    tempo_leitura_min   INTEGER,
    visualizacoes       BIGINT NOT NULL DEFAULT 0,
    data_publicacao     TIMESTAMP WITHOUT TIME ZONE,
    cod_app             INTEGER,
    menu_categorias     VARCHAR(300) DEFAULT 'home',
    empresa_id          INTEGER,
    parceiro_id         INTEGER,
    app_id              INTEGER,
    user_logado_id      INTEGER,
    dh_created_at       TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW(),
    dh_updated_at       TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_artigo_publicado ON public.artigo (publicado);
CREATE INDEX IF NOT EXISTS idx_artigo_categoria ON public.artigo (categoria);
CREATE INDEX IF NOT EXISTS idx_artigo_destaque  ON public.artigo (destaque);
CREATE INDEX IF NOT EXISTS idx_artigo_slug      ON public.artigo (slug);

-- Insere artigos de exemplo (apenas se a tabela estiver vazia)
INSERT INTO public.artigo (titulo, subtitulo, resumo, conteudo_completo, autor, categoria, tags, slug, ordem_exibicao, destaque, publicado, tempo_leitura_min, visualizacoes, data_publicacao, menu_categorias)
SELECT * FROM (VALUES
(
  'Reforma Tributaria 2025: LC 214 e o novo IVA dual brasileiro',
  'Entenda como o IBS e a CBS vao substituir cinco impostos ate 2033',
  'A Lei Complementar 214/2025 estabelece o marco legal do IBS, CBS e IS. Saiba o que muda para empresas e contribuintes.',
  '<h2>O que e a Reforma Tributaria?</h2><p>A EC 132/2023 e a LC 214/2025 representam a maior mudanca no sistema tributario brasileiro em decadas.</p><h2>Os tres novos tributos</h2><ul><li><strong>IBS</strong> - Imposto sobre Bens e Servicos</li><li><strong>CBS</strong> - Contribuicao sobre Bens e Servicos</li><li><strong>IS</strong> - Imposto Seletivo</li></ul>',
  'Entusiasta Tributario', 'Tributario',
  'reforma tributaria, IBS, CBS, IVA, LC 214',
  'reforma-tributaria-2025-lc-214-ibs-cbs',
  1, TRUE, TRUE, 6, 120, NOW() - INTERVAL ''5 days'', 'home,tributario'
),
(
  'MEI 2025: Limite de faturamento, DAS e novas obrigacoes',
  'Tudo que o Microempreendedor Individual precisa saber para 2025',
  'O MEI tem limite de faturamento de R$ 81 mil anuais em 2025. Confira as obrigacoes e valores do DAS.',
  '<h2>Limite de faturamento do MEI</h2><p>Em 2025, o limite anual de faturamento do MEI permanece em R$ 81.000,00.</p><h2>Valores do DAS em 2025</h2><ul><li>Comercio e Industria: R$ 71,60/mes</li><li>Servicos: R$ 75,60/mes</li></ul>',
  'Entusiasta Tributario', 'MEI',
  'MEI, microempreendedor, DAS, SIMEI, faturamento',
  'mei-2025-limite-faturamento-das-obrigacoes',
  2, TRUE, TRUE, 5, 98, NOW() - INTERVAL ''3 days'', 'home,mei'
),
(
  'Simples Nacional 2025: Como calcular corretamente seus impostos',
  'Guia pratico para empresas optantes pelo Simples Nacional',
  'O Simples Nacional e o regime tributario mais utilizado por micro e pequenas empresas. Entenda como calcular os impostos.',
  '<h2>O que e o Simples Nacional?</h2><p>Regime tributario simplificado para empresas com faturamento anual de ate R$ 4,8 milhoes.</p><h2>Os 5 Anexos</h2><ul><li>Anexo I: Comercio (4% a 19%)</li><li>Anexo II: Industria (4,5% a 30%)</li><li>Anexo III: Servicos (6% a 33%)</li></ul>',
  'Entusiasta Tributario', 'Empresarial',
  'simples nacional, calculo, aliquota, DAS',
  'simples-nacional-2025-calcular-impostos',
  3, FALSE, TRUE, 6, 75, NOW() - INTERVAL ''2 days'', 'home,empresarial'
),
(
  'IBS e CBS: Os dois novos impostos que vao substituir ICMS, ISS, PIS e COFINS',
  'O IVA dual brasileiro e a principal mudanca da reforma tributaria',
  'O IBS e a CBS formam o IVA dual brasileiro. Juntos, substituirao cinco impostos ate 2033.',
  '<h2>O que e o IVA dual?</h2><p>O Brasil adotou um modelo de IVA dual, com dois impostos sobre o consumo: o IBS e a CBS.</p>',
  'Entusiasta Tributario', 'Reforma Tributaria',
  'IBS, CBS, IVA dual, reforma tributaria',
  'ibs-cbs-novos-impostos-substituir-icms-iss-pis-cofins',
  4, TRUE, TRUE, 7, 210, NOW() - INTERVAL ''1 day'', 'home,reforma'
),
(
  'IRPF 2025: Tudo que voce precisa saber sobre a declaracao',
  'Prazo, obrigatoriedade, deducoes e como evitar a malha fina',
  'O prazo para entrega da declaracao do IRPF 2025 vai ate 30 de maio. Saiba quem e obrigado a declarar.',
  '<h2>Quem e obrigado a declarar?</h2><p>Deve declarar o IRPF 2025 quem recebeu rendimentos tributaveis acima de R$ 33.888,00 em 2024.</p>',
  'Entusiasta Tributario', 'Tributario',
  'IRPF, imposto de renda, declaracao, malha fina',
  'irpf-2025-declaracao-imposto-de-renda',
  5, FALSE, TRUE, 5, 88, NOW() - INTERVAL ''4 days'', 'home,tributario'
),
(
  'DASN-SIMEI 2025: Como fazer a declaracao anual do MEI',
  'Prazo ate 31 de maio. Veja o passo a passo',
  'Todos os MEIs devem entregar a DASN-SIMEI ate 31 de maio de 2025.',
  '<h2>O que e a DASN-SIMEI?</h2><p>A Declaracao Anual do Simples Nacional para o MEI deve ser entregue ate 31 de maio de cada ano.</p>',
  'Entusiasta Tributario', 'MEI',
  'DASN-SIMEI, declaracao anual, MEI, prazo',
  'dasn-simei-2025-declaracao-anual-mei',
  6, FALSE, TRUE, 4, 65, NOW() - INTERVAL ''6 days'', 'home,mei'
)
) AS v(titulo, subtitulo, resumo, conteudo_completo, autor, categoria, tags, slug, ordem_exibicao, destaque, publicado, tempo_leitura_min, visualizacoes, data_publicacao, menu_categorias)
WHERE NOT EXISTS (SELECT 1 FROM public.artigo LIMIT 1);

-- Confirma
SELECT COUNT(*) as total_artigos FROM public.artigo;
