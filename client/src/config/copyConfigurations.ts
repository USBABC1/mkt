// client/src/config/copyConfigurations.ts

// Definição do tipo BaseGeneratorFormState para referência
export interface BaseGeneratorFormState {
  product: string;
  audience: string;
  objective: 'sales' | 'leads' | 'engagement' | 'awareness';
  tone: 'professional' | 'casual' | 'urgent' | 'inspirational' | 'educational' | 'empathetic' | 'divertido' | 'sofisticado';
}

export type LaunchPhase = 'pre_launch' | 'launch' | 'post_launch';

export interface FieldDefinition {
  name: string;
  label: string;
  type: 'text' | 'textarea' | 'select' | 'number' | 'date';
  placeholder?: string;
  tooltip: string;
  required?: boolean;
  options?: Array<{ value: string; label: string }>;
  defaultValue?: string | number | boolean;
  dependsOn?: string; // Para lógica condicional de campos
  showIf?: (formData: Record<string, any>, baseData?: BaseGeneratorFormState) => boolean; // Para mostrar/ocultar campos
}

export interface CopyPurposeConfig {
  key: string;
  label: string;
  phase: LaunchPhase;
  fields: FieldDefinition[];
  category: string;
  description?: string; // Descrição da finalidade da copy
  promptEnhancer?: (basePrompt: string, details: Record<string, any>, baseForm: BaseGeneratorFormState) => string;
}

export const allCopyPurposesConfig: CopyPurposeConfig[] = [
  // --- PRÉ-LANÇAMENTO ---
  {
    key: 'prelaunch_ad_event_invitation',
    label: 'Anúncio: Convite para Evento Online Gratuito',
    phase: 'pre_launch',
    category: 'Anúncios (Pré-Lançamento)',
    description: 'Crie anúncios chamativos para convidar pessoas para seu webinar, masterclass ou live.',
    fields: [
      { name: 'eventName', label: 'Nome do Evento *', type: 'text', placeholder: 'Ex: Masterclass "Decole Seu Negócio Online"', tooltip: 'O título principal do seu evento.', required: true },
      { name: 'eventSubtitle', label: 'Subtítulo do Evento (Opcional)', type: 'text', placeholder: 'Ex: O guia definitivo para...', tooltip: 'Uma frase curta para complementar o nome.'},
      { name: 'eventFormat', label: 'Formato do Evento', type: 'text', placeholder: 'Ex: Workshop online de 3 dias via Zoom', tooltip: 'Descreva como será o evento (live, gravado, desafio, etc.).', defaultValue: 'Webinar Ao Vivo' },
      { name: 'eventDateTime', label: 'Data e Hora Principal do Evento *', type: 'text', placeholder: 'Ex: Terça, 25 de Junho, às 20h (Horário de Brasília)', tooltip: 'Quando o evento principal acontecerá? Inclua fuso horário se relevante.', required: true },
      { name: 'eventDuration', label: 'Duração Estimada do Evento', type: 'text', placeholder: 'Ex: Aproximadamente 1h30', tooltip: 'Quanto tempo o público deve reservar?' },
      { name: 'eventPromise', label: 'Principal Promessa/Transformação do Evento *', type: 'textarea', placeholder: 'Ex: Você vai descobrir o método exato para criar anúncios que vendem todos os dias, mesmo começando do zero.', tooltip: 'O que a pessoa vai ganhar/aprender de mais valioso?', required: true },
      { name: 'eventTopics', label: 'Principais Tópicos Abordados (1 por linha) *', type: 'textarea', placeholder: 'Ex:\n- Como definir seu público ideal\n- Os 3 erros que te fazem perder dinheiro em anúncios\n- O segredo das headlines que convertem', tooltip: 'Liste os pontos chave que serão ensinados.', required: true },
      { name: 'eventTargetAudience', label: 'Público Específico Deste Evento', type: 'text', placeholder: 'Ex: Empreendedores que já tentaram anunciar e não tiveram resultado', tooltip: 'Para quem este evento é especialmente desenhado?' },
      { name: 'eventCTA', label: 'Chamada para Ação do Anúncio *', type: 'text', placeholder: 'Ex: "Garanta sua vaga gratuita agora!" ou "Clique em Saiba Mais e inscreva-se!"', tooltip: 'O que você quer que a pessoa faça ao ver o anúncio?', required: true, defaultValue: 'Inscreva-se Gratuitamente!' },
      { name: 'urgencyScarcityElement', label: 'Elemento de Urgência/Escassez (Opcional)', type: 'text', placeholder: 'Ex: Vagas limitadas, Bônus para os 100 primeiros inscritos', tooltip: 'Algum motivo para a pessoa agir rápido?' },
    ],
  },
  {
    key: 'prelaunch_ad_lead_magnet_download',
    label: 'Anúncio: Download de Material Rico',
    phase: 'pre_launch',
    category: 'Anúncios (Pré-Lançamento)',
    description: 'Desenvolva anúncios que incentivam o download de e-books, checklists ou outros materiais gratuitos.',
    fields: [
      { name: 'leadMagnetTitle', label: 'Título do Material Rico *', type: 'text', placeholder: 'Ex: Guia Completo: 5 Passos Para Organizar Suas Finanças', tooltip: 'O nome chamativo do seu e-book, checklist, template, etc.', required: true },
      { name: 'leadMagnetFormat', label: 'Formato do Material Rico', type: 'text', placeholder: 'Ex: E-book em PDF com 30 páginas', tooltip: 'Qual o formato prático do material?', defaultValue: 'E-book PDF' },
      { name: 'leadMagnetBenefit', label: 'Principal Benefício/Problema que Resolve *', type: 'textarea', placeholder: 'Ex: Aprenda a sair das dívidas e começar a investir em 30 dias com este guia prático.', tooltip: 'Qual a grande vantagem ou solução que o material oferece?', required: true },
      { name: 'leadMagnetContentTeaser', label: 'Conteúdo Resumido/Destaques (1 por linha)', type: 'textarea', placeholder: 'Ex:\n- Checklist para controle de gastos\n- Planilha de orçamento mensal pronta para usar', tooltip: 'O que a pessoa encontrará de mais valioso dentro do material?'},
      { name: 'targetAudienceForMagnet', label: 'Público Ideal para este Material', type: 'text', placeholder: 'Ex: Pessoas que se sentem perdidas com suas finanças pessoais.', tooltip: 'Para quem este material é mais indicado?'},
      { name: 'leadMagnetCTA', label: 'Chamada para Ação do Anúncio *', type: 'text', placeholder: 'Ex: "Baixe seu guia gratuito agora!"', tooltip: 'O que você quer que a pessoa faça?', required: true, defaultValue: 'Download Gratuito!' },
    ],
  },
  {
    key: 'prelaunch_ad_waitlist_vip',
    label: 'Anúncio: Lista de Espera/VIP',
    phase: 'pre_launch',
    category: 'Anúncios (Pré-Lançamento)',
    description: 'Crie anúncios para construir uma lista de espera ou grupo VIP, gerando antecipação para seu lançamento.',
    fields: [
      { name: 'productOrOfferNameVip', label: 'Nome do Produto/Oferta da Lista VIP *', type: 'text', placeholder: 'Ex: Acesso Antecipado ao Curso X', tooltip: 'Sobre qual produto/serviço é a lista de espera/VIP?', required: true },
      { name: 'vipBenefits', label: 'Principais Benefícios de Entrar na Lista VIP (1 por linha) *', type: 'textarea', placeholder: 'Ex:\n- Desconto exclusivo no lançamento\n- Acesso a bônus secretos\n- Ser o primeiro a saber das novidades', tooltip: 'Quais vantagens os inscritos terão?', required: true },
      { name: 'whatToExpectVip', label: 'O que os Membros VIP Receberão/Saberão Primeiro?', type: 'textarea', placeholder: 'Ex: Detalhes completos do curso, data oficial de lançamento, link de compra antecipada.', tooltip: 'Informe o que será comunicado ou oferecido primeiro aos membros.' },
      { name: 'ctaForVipList', label: 'Chamada para Ação do Anúncio para Lista VIP *', type: 'text', placeholder: 'Ex: "Entre para a Lista VIP!" ou "Quero Acesso Antecipado!"', tooltip: 'Qual o CTA para o anúncio da lista?', required: true, defaultValue: 'Quero Ser VIP!' },
      { name: 'senseOfExclusivity', label: 'Elemento de Exclusividade/Escassez (Opcional)', type: 'text', placeholder: 'Ex: Apenas 100 vagas no grupo VIP, Acesso limitado por 48h.', tooltip: 'Como criar um senso de oportunidade única?' },
    ],
  },
  {
    key: 'prelaunch_email_welcome_confirmation',
    label: 'E-mail: Boas-vindas e Confirmação',
    phase: 'pre_launch',
    category: 'E-mails (Pré-Lançamento)',
    description: 'Crie e-mails de boas-vindas para novos inscritos, confirmando a inscrição e entregando o prometido.',
    fields: [
      { name: 'signupReason', label: 'Motivo da Inscrição do Lead *', type: 'text', placeholder: 'Ex: Inscrição na Masterclass XPTO, Download do Guia Y', tooltip: 'O que o lead fez para entrar na sua lista e receber este e-mail?', required: true },
      { name: 'deliveredItemName', label: 'Nome do Item Entregue (se houver)', type: 'text', placeholder: 'Ex: Acesso à Masterclass, Seu Guia de Finanças', tooltip: 'Nome do evento/material que está sendo confirmado/entregue.'},
      { name: 'deliveredItemLink', label: 'Link de Acesso/Download (se houver)', type: 'text', placeholder: 'Ex: https://...', tooltip: 'O link direto para o evento, material, grupo, etc.'},
      { name: 'senderName', label: 'Nome do Remetente do E-mail *', type: 'text', placeholder: 'Ex: João Silva da Empresa XPTO', tooltip: 'Como você ou sua empresa devem ser identificados?', required: true },
      { name: 'nextStepsForLead', label: 'Próximos Passos Sugeridos (1 por linha)', type: 'textarea', placeholder: 'Ex:\n- Adicione este e-mail aos seus contatos.\n- Marque na agenda o dia do nosso evento!', tooltip: 'O que você quer que o lead faça em seguida?'},
      { name: 'valueTeaser', label: 'Pequeno Teaser de Conteúdo Futuro (Opcional)', type: 'textarea', placeholder: 'Ex: Nos próximos dias, vou compartilhar dicas exclusivas sobre X...', tooltip: 'Uma pequena amostra do que mais ele pode esperar.'},
    ],
  },
  {
    key: 'prelaunch_email_value_nurturing',
    label: 'E-mail: Conteúdo de Valor (Aquecimento)',
    phase: 'pre_launch',
    category: 'E-mails (Pré-Lançamento)',
    description: 'Escreva e-mails que entregam valor, educam e aquecem sua lista para o lançamento.',
    fields: [
      { name: 'emailSubject', label: 'Assunto do E-mail *', type: 'text', placeholder: 'Ex: O Segredo Nº1 para [Resolver Dor]', tooltip: 'Crie um assunto que gere curiosidade e abertura.', required: true },
      { name: 'mainProblemAddressed', label: 'Principal Problema/Dor Abordado no E-mail *', type: 'text', placeholder: 'Ex: Falta de tempo para estudar, Dificuldade em economizar', tooltip: 'Qual dor específica este e-mail vai tocar?', required: true },
      { name: 'coreContentValue', label: 'Conteúdo de Valor Principal do E-mail (Resumo) *', type: 'textarea', placeholder: 'Ex: Uma dica prática sobre X, Um insight sobre Y, Uma breve história que ensina Z.', tooltip: 'Qual a principal mensagem de valor que será entregue?', required: true },
      { name: 'connectionToLaunch', label: 'Como este Conteúdo se Conecta ao Próximo Lançamento? (Opcional)', type: 'textarea', placeholder: 'Ex: Este é um dos pilares do nosso novo curso...', tooltip: 'Faça uma ponte sutil para o que está por vir, se aplicável.' },
      { name: 'emailCTA', label: 'Chamada para Ação do E-mail (Opcional)', type: 'text', placeholder: 'Ex: "Responda este e-mail com sua dúvida", "Leia o artigo completo aqui"', tooltip: 'Qual ação você quer que o leitor tome após ler este e-mail de valor?' },
    ],
  },
  {
    key: 'prelaunch_social_post_value_engagement',
    label: 'Post Social: Conteúdo de Valor (Educação/Engajamento)',
    phase: 'pre_launch',
    category: 'Posts Redes Sociais (Pré-Lançamento)',
    description: 'Elabore posts para redes sociais que eduquem e engajem sua audiência antes do lançamento.',
    fields: [
      { name: 'postTopic', label: 'Tópico Central do Post *', type: 'text', placeholder: 'Ex: 3 Mitos sobre Investimentos', tooltip: 'Sobre qual assunto específico será o post?', required: true },
      { name: 'postFormatSuggestion', label: 'Formato Sugerido', type: 'select', options: [{value: 'carrossel', label: 'Carrossel'}, {value: 'reels_script', label: 'Roteiro Reels/TikTok'}, {value: 'imagem_unica_texto', label: 'Imagem Única com Texto Longo'}, {value: 'enquete_story', label: 'Enquete para Story'}], tooltip: 'Qual formato visual/de conteúdo é mais adequado?', defaultValue: 'carrossel'},
      { name: 'mainTeachingPoint', label: 'Principal Ensinamento/Dica *', type: 'textarea', placeholder: 'Ex: A importância de começar pequeno.', tooltip: 'Qual a mensagem chave ou lição que o público deve tirar?', required: true},
      { name: 'supportingPoints', label: 'Pontos de Suporte/Detalhes (1 por linha)', type: 'textarea', placeholder: 'Ex:\n- Dica prática 1...\n- Exemplo real...', tooltip: 'Detalhes, exemplos ou passos que sustentam o ensinamento principal.'},
      { name: 'engagementPrompt', label: 'Chamada para Engajamento *', type: 'text', placeholder: 'Ex: "Qual sua maior dificuldade sobre X? Comenta aqui!"', tooltip: 'Como incentivar comentários, salvamentos, compartilhamentos?', required: true},
      { name: 'relevantHashtags', label: 'Hashtags Relevantes (,)', type: 'text', placeholder: '#dicasfinanceiras, #produtividade', tooltip: 'Sugestões de hashtags.'}
    ]
  },
  {
    key: 'prelaunch_social_post_anticipation',
    label: 'Post Social: Curiosidade/Antecipação',
    phase: 'pre_launch',
    category: 'Posts Redes Sociais (Pré-Lançamento)',
    description: 'Gere expectativa com posts que aguçam a curiosidade sobre o que está por vir.',
    fields: [
      { name: 'teaserTopic', label: 'Tópico do Teaser/Antecipação *', type: 'text', placeholder: 'Ex: Algo novo chegando, Uma solução para X', tooltip: 'Sobre o que você quer gerar curiosidade?', required: true },
      { name: 'curiosityHook', label: 'Gancho de Curiosidade Principal *', type: 'textarea', placeholder: 'Ex: "Você já imaginou se...? Em breve, uma novidade que vai mudar tudo."', tooltip: 'Qual frase ou pergunta vai prender a atenção e gerar especulação?', required: true },
      { name: 'hintWithoutRevealing', label: 'Dica Sutil (Sem Revelar Tudo)', type: 'text', placeholder: 'Ex: "Prepare-se para simplificar Y", "Tem a ver com Z"', tooltip: 'Uma pequena pista do que se trata, mas sem entregar o jogo.' },
      { name: 'anticipationCTA', label: 'Chamada para Ação de Antecipação', type: 'text', placeholder: 'Ex: "Fique de olho nos nossos stories!", "Ative as notificações!"', tooltip: 'O que você quer que o público faça para não perder a novidade?' },
      { name: 'visualSuggestion', label: 'Sugestão de Imagem/Vídeo para o Post', type: 'text', placeholder: 'Ex: Imagem misteriosa com data, GIF animado com contagem regressiva', tooltip: 'Que tipo de visual acompanharia bem este post de antecipação?' },
    ],
  },
  {
    key: 'prelaunch_landing_page_title',
    label: 'Página de Captura: Título Principal',
    phase: 'pre_launch',
    category: 'Página de Captura',
    description: 'Desenvolva títulos (headlines) magnéticos para suas páginas de captura de leads.',
    fields: [
      { name: 'leadMagnetOrEventName', label: 'Nome da Isca Digital ou Evento da Página *', type: 'text', placeholder: 'Ex: E-book Gratuito, Webinar Exclusivo', tooltip: 'O que está sendo oferecido na página de captura?', required: true },
      { name: 'mainBenefitForLead', label: 'Principal Benefício para o Lead ao se Inscrever *', type: 'textarea', placeholder: 'Ex: Descubra como triplicar suas vendas, Aprenda a investir do zero', tooltip: 'Qual a maior vantagem que o lead terá ao fornecer os dados?', required: true },
      { name: 'targetAudienceFocusLp', label: 'Foco no Público-Alvo da Landing Page', type: 'text', placeholder: 'Ex: Para quem está cansado de X, Se você é Y...', tooltip: 'Como o título pode se conectar diretamente com o público-alvo?' },
      { name: 'urgencyOrScarcityLp', label: 'Elemento de Urgência/Escassez (Opcional)', type: 'text', placeholder: 'Ex: Vagas limitadas, Bônus por tempo limitado', tooltip: 'Algum motivo para o lead se inscrever agora?' },
      { name: 'keywordForSeoLp', label: 'Palavra-chave Principal (Opcional)', type: 'text', placeholder: 'Ex: "curso de marketing digital"', tooltip: 'Se houver uma palavra-chave importante para SEO, mencione-a.' },
    ],
  },
  // --- LANÇAMENTO ---
  {
    key: 'launch_sales_page_headline',
    label: 'Página de Vendas: Headline Principal',
    phase: 'launch',
    category: 'Página de Vendas',
    description: 'Crie headlines impactantes e persuasivas para o topo da sua página de vendas.',
    fields: [
      { name: 'productName', label: 'Nome do Produto/Oferta Principal *', type: 'text', placeholder: 'Ex: Curso Online "Método Vendas Imparáveis"', required: true, tooltip: 'O nome exato do seu produto/serviço.'  },
      { name: 'mainTransformation', label: 'Principal Transformação/Resultado da Oferta *', type: 'textarea', placeholder: 'Ex: Conquistar seus primeiros 10 clientes em 30 dias.', required: true, tooltip: 'O resultado final mais desejado que seu cliente alcançará.' },
      { name: 'targetAudiencePain', label: 'Principal Dor/Problema do Público Resolvido *', type: 'text', placeholder: 'Ex: Dificuldade em atrair clientes qualificados.', required: true, tooltip: 'Qual o maior problema que seu produto soluciona?' },
      { name: 'uniqueMechanism', label: 'Mecanismo Único/Diferencial (Opcional)', type: 'text', placeholder: 'Ex: Nosso método "Cliente Atrai Cliente".', tooltip: 'Sua abordagem única.'},
      { name: 'timeOrEffortElement', label: 'Elemento de Tempo/Esforço (Opcional)', type: 'text', placeholder: 'Ex: Em apenas 15 minutos por dia.', tooltip: 'Como a oferta economiza tempo ou simplifica o esforço?'},
    ]
  },
  {
    key: 'launch_ad_direct_to_sales_page',
    label: 'Anúncio: Direto para Página de Vendas',
    phase: 'launch',
    category: 'Anúncios (Lançamento)',
    description: 'Desenvolva anúncios focados em levar tráfego qualificado diretamente para sua página de vendas.',
    fields: [
      { name: 'productName', label: 'Nome do Produto/Oferta Principal *', type: 'text', required: true, tooltip: 'O nome exato do seu produto/serviço.'  },
      { name: 'offerHeadline', label: 'Headline Principal do Anúncio *', type: 'text', placeholder: 'Ex: Cansado de...? Descubra como!', required: true, tooltip: 'A frase de impacto para o anúncio.'},
      { name: 'keyBenefits', label: 'Principais Benefícios da Oferta (1 por linha) *', type: 'textarea', placeholder: 'Ex:\n- Aumente suas vendas\n- Tenha clareza', required: true, tooltip: 'Os resultados mais atraentes para o cliente.'},
      { name: 'targetAudienceFocus', label: 'Foco no Público-Alvo *', type: 'text', placeholder: 'Ex: Para coaches que querem lotar a agenda.', required: true, tooltip: 'Como o anúncio se conecta diretamente com o público-alvo.'},
      { name: 'callToActionSalesPage', label: 'CTA para Página de Vendas *', type: 'text', placeholder: 'Ex: "Clique em Saiba Mais!"', required: true, defaultValue: 'Ver Detalhes e Inscrever-se!'},
      { name: 'urgencyElementLaunch', label: 'Urgência/Escassez (Opcional)', type: 'text', placeholder: 'Ex: Inscrições SÓ esta semana!', tooltip: 'Por que agir agora?'},
    ]
  },
  {
    key: 'launch_email_cart_open',
    label: 'E-mail: Abertura de Carrinho',
    phase: 'launch',
    category: 'E-mails (Lançamento)',
    description: 'Escreva o e-mail crucial que anuncia a abertura das vendas do seu produto ou serviço.',
    fields: [
      { name: 'productName', label: 'Nome do Produto/Oferta Principal *', type: 'text', required: true, tooltip: 'O nome exato do seu produto/serviço.'  },
      { name: 'greetingLine', label: 'Saudação Personalizada (Opcional)', type: 'text', placeholder: 'Ex: Chegou o momento, [Nome]!', tooltip: 'Uma abertura de e-mail mais pessoal.'},
      { name: 'mainOfferAnnouncement', label: 'Anúncio Principal da Abertura *', type: 'textarea', placeholder: 'Ex: As portas para o [Produto] estão abertas!', required: true, tooltip: 'A mensagem central informando que as vendas começaram.'},
      { name: 'linkToSalesPage', label: 'Link da Página de Vendas *', type: 'text', placeholder: 'https://...', required: true, tooltip: 'URL completa da sua página de vendas.'},
      { name: 'keyBonusesIfAny', label: 'Bônus Principais (1 por linha, opcional)', type: 'textarea', placeholder: 'Ex:\n- Bônus 1: Acesso VIP\n- Bônus 2: Mentoria', tooltip: 'Se houver bônus importantes para a abertura, liste-os.'},
      { name: 'reasonToActNow', label: 'Motivo para Agir Agora *', type: 'text', placeholder: 'Ex: Bônus para os 50 primeiros.', required: true, tooltip: 'Por que o lead deve comprar imediatamente?'},
      { name: 'senderSignature', label: 'Assinatura do E-mail *', type: 'text', placeholder: 'Ex: Abraços, João Silva', required: true},
    ]
  },
  { key: 'launch_email_testimonial_proof', label: 'E-mail: Prova Social/Depoimentos', phase: 'launch', category: 'E-mails (Lançamento)', description: 'Use o poder da prova social com e-mails que destacam depoimentos de clientes.', fields: [
      { name: 'productNameProof', label: 'Nome do Produto/Oferta *', type: 'text', required: true, tooltip: 'Qual produto/serviço os depoimentos se referem?' },
      { name: 'testimonialHighlight', label: 'Destaque Principal do Depoimento *', type: 'textarea', placeholder: 'Ex: "Transformou minha forma de ver X", "Resultados em Y semanas"', tooltip: 'Qual a parte mais impactante do depoimento a ser usada?', required: true },
      { name: 'customerNameOrProfile', label: 'Nome/Perfil do Cliente (Opcional)', type: 'text', placeholder: 'Ex: Maria S., Empreendedora Digital', tooltip: 'Como identificar quem deu o depoimento?' },
      { name: 'linkToMoreTestimonials', label: 'Link para Mais Depoimentos (Opcional)', type: 'text', placeholder: 'Ex: Veja mais histórias de sucesso aqui...', tooltip: 'Se tiver uma página com mais provas sociais.' },
  ]},
  { key: 'launch_email_objection_handling', label: 'E-mail: Quebra de Objeções', phase: 'launch', category: 'E-mails (Lançamento)', description: 'Antecipe e responda às principais objeções dos seus leads por e-mail.', fields: [
      { name: 'commonObjection', label: 'Objeção Comum a ser Quebrada *', type: 'text', placeholder: 'Ex: "Não tenho tempo", "É muito caro", "Será que funciona para mim?"', tooltip: 'Qual dúvida ou receio comum seu público tem?', required: true },
      { name: 'counterArgumentSolution', label: 'Contra-argumento/Solução para a Objeção *', type: 'textarea', placeholder: 'Ex: "Nosso método economiza seu tempo...", "Compare o investimento com o retorno...", "Veja casos de sucesso de pessoas como você..."', tooltip: 'Como você pode tranquilizar o lead e mostrar o valor?', required: true },
      { name: 'reiterateBenefit', label: 'Reafirmar Principal Benefício da Oferta', type: 'text', placeholder: 'Ex: Lembre-se, você vai alcançar X...', tooltip: 'Reforce a principal transformação ou resultado.' },
  ]},
  { key: 'launch_email_last_chance_24h', label: 'E-mail: Última Chance (24h)', phase: 'launch', category: 'E-mails (Lançamento)', description: 'Crie e-mails de urgência para as últimas 24 horas da sua oferta.', fields: [
      { name: 'productNameLastChance', label: 'Nome do Produto/Oferta *', type: 'text', required: true, tooltip: 'Qual produto/serviço está com as inscrições encerrando?' },
      { name: 'urgencyReason', label: 'Motivo da Urgência (Últimas 24h) *', type: 'text', placeholder: 'Ex: Carrinho fecha HOJE à meia-noite!', tooltip: 'Deixe claro que o tempo está acabando.', required: true },
      { name: 'whatTheyWillLose', label: 'O que Perderão se Não Agirem Agora (FOMO) *', type: 'textarea', placeholder: 'Ex: Bônus exclusivos, Desconto especial de lançamento, A oportunidade de transformar X...', tooltip: 'Crie o medo de perder a oportunidade (Fear Of Missing Out).', required: true },
      { name: 'finalCTA', label: 'Chamada para Ação Final e Direta *', type: 'text', placeholder: 'Ex: "Garanta sua vaga AGORA!", "Última chance de entrar!"', tooltip: 'Seja direto e incentive a ação imediata.', required: true },
  ]},
  { key: 'launch_email_cart_closing_soon', label: 'E-mail: Carrinho Fechando em Breve', phase: 'launch', category: 'E-mails (Lançamento)', description: 'Alerte sua lista que o carrinho de compras está prestes a fechar (ex: últimas horas).', fields: [
      { name: 'productNameClosing', label: 'Nome do Produto/Oferta *', type: 'text', required: true, tooltip: 'Qual produto/serviço está com as inscrições quase encerrando?' },
      { name: 'closingTimeframe', label: 'Tempo Restante Exato *', type: 'text', placeholder: 'Ex: "ÚLTIMAS 3 HORAS!", "Fecha em menos de 1 hora!"', tooltip: 'Especifique o tempo exato restante.', required: true },
      { name: 'summaryOfOffer', label: 'Breve Resumo da Oferta e Benefício Principal', type: 'textarea', placeholder: 'Ex: Não perca a chance de [Benefício Principal] com o [Produto].', tooltip: 'Relembre rapidamente o valor da oferta.' },
      { name: 'directLinkToPurchase', label: 'Link Direto para Compra/Inscrição *', type: 'text', placeholder: 'https://...', tooltip: 'Facilite o acesso final à página de checkout.', required: true },
  ]},
  { key: 'launch_social_post_product_demo', label: 'Post Social: Demonstração do Produto', phase: 'launch', category: 'Posts Redes Sociais (Lançamento)', description: 'Mostre seu produto em ação com posts de demonstração para redes sociais.', fields: [
      { name: 'featureDemonstrated', label: 'Funcionalidade/Aspecto Demonstrado *', type: 'text', placeholder: 'Ex: Como usar o módulo X, Resultado da técnica Y', tooltip: 'O que especificamente será mostrado no post?', required: true },
      { name: 'benefitOfFeature', label: 'Benefício Direto da Funcionalidade Demonstrada *', type: 'text', placeholder: 'Ex: Economize horas de trabalho, Crie Z em minutos', tooltip: 'Como isso ajuda o usuário na prática?', required: true },
      { name: 'demoCTA', label: 'Chamada para Ação do Post de Demo', type: 'text', placeholder: 'Ex: "Veja como é fácil!", "Experimente você também!"', tooltip: 'O que você quer que o público sinta ou faça?' },
      { name: 'visualSuggestionDemo', label: 'Sugestão de Visual (Vídeo Curto, GIF, Carrossel)', type: 'text', placeholder: 'Ex: Vídeo de tela mostrando o passo a passo.', tooltip: 'Qual formato visual seria ideal para esta demonstração?' },
  ]},
  { key: 'launch_social_post_live_qa', label: 'Post Social: Sessão de Q&A Ao Vivo', phase: 'launch', category: 'Posts Redes Sociais (Lançamento)', description: 'Promova e convide para sessões de Perguntas e Respostas ao vivo.', fields: [
      { name: 'liveQATopic', label: 'Tópico Principal da Live de Q&A *', type: 'text', placeholder: 'Ex: Tirando todas as dúvidas sobre o Curso X', tooltip: 'Qual será o foco da sessão ao vivo?', required: true },
      { name: 'liveDateTime', label: 'Data e Hora da Live *', type: 'text', placeholder: 'Ex: Amanhã, às 19h, no nosso Instagram', tooltip: 'Quando e onde acontecerá a live?', required: true },
      { name: 'guestSpeaker', label: 'Convidado Especial (se houver)', type: 'text', placeholder: 'Ex: Com a participação de [Nome do Especialista]', tooltip: 'Haverá algum convidado na live?' },
      { name: 'liveCTA', label: 'Chamada para Ação para a Live', type: 'text', placeholder: 'Ex: "Defina o lembrete!", "Envie suas perguntas antecipadamente!"', tooltip: 'O que você quer que o público faça?' },
  ]},
  // --- PÓS-LANÇAMENTO ---
  {
    key: 'postlaunch_email_thank_you_non_buyers',
    label: 'E-mail: Agradecimento para Não Compradores',
    phase: 'post_launch',
    category: 'E-mails (Pós-Lançamento)',
    description: 'Prepare um e-mail de agradecimento para quem participou do lançamento mas não comprou, mantendo o relacionamento.',
    fields: [
      { name: 'launchName', label: 'Nome do Lançamento Encerrado *', type: 'text', placeholder: 'Ex: Lançamento Curso Vendas Imparáveis', required: true, tooltip: 'Qual produto/oferta teve o carrinho fechado?' },
      { name: 'mainThankYouMessage', label: 'Mensagem Principal de Agradecimento *', type: 'textarea', placeholder: 'Ex: Gostaria de agradecer imensamente seu interesse e participação.', required: true, tooltip: 'Seja genuíno no agradecimento.' },
      { name: 'valueDeliveredDuringLaunch', label: 'Relembrar Valor Entregue (Opcional)', type: 'text', placeholder: 'Ex: Espero que os conteúdos da Semana X tenham sido úteis para você.', tooltip: 'Mencione brevemente algum valor que foi compartilhado gratuitamente.'},
      { name: 'futureOpportunityTeaser', label: 'Teaser para Futuras Oportunidades (Opcional)', type: 'text', placeholder: 'Ex: Fique de olho, pois em breve teremos mais novidades.', tooltip: 'Deixe uma porta aberta para o futuro.'},
      { name: 'feedbackRequestLink', label: 'Link para Pesquisa de Feedback (Opcional)', type: 'text', placeholder: 'Ex: https://forms.gle/suapesquisa', tooltip: 'Se for pedir feedback, coloque o link aqui.'},
    ],
  },
  { key: 'postlaunch_email_survey_buyers', label: 'E-mail: Pesquisa de Satisfação (Compradores)', phase: 'post_launch', category: 'E-mails (Pós-Lançamento)', description: 'Colete feedback valioso dos seus novos clientes através de e-mails de pesquisa.', fields: [
      { name: 'productPurchased', label: 'Produto/Serviço Comprado *', type: 'text', required: true, tooltip: 'Qual produto o cliente adquiriu?' },
      { name: 'surveyPurpose', label: 'Principal Objetivo da Pesquisa *', type: 'text', placeholder: 'Ex: Melhorar o produto, Entender a experiência do cliente', tooltip: 'O que você quer descobrir com esta pesquisa?', required: true },
      { name: 'linkToSurvey', label: 'Link para a Pesquisa *', type: 'text', placeholder: 'Ex: https://forms.gle/suapesquisa', tooltip: 'Onde o cliente pode responder?', required: true },
      { name: 'incentiveForCompletion', label: 'Incentivo para Completar (Opcional)', type: 'text', placeholder: 'Ex: Concorra a um brinde, Cupom de desconto na próxima compra', tooltip: 'Algum benefício por responder?' },
  ]},
  { key: 'postlaunch_email_upsell_cross_sell', label: 'E-mail: Upsell/Cross-sell para Compradores', phase: 'post_launch', category: 'E-mails (Pós-Lançamento)', description: 'Apresente ofertas complementares para quem já comprou de você.', fields: [
      { name: 'originalProductPurchased', label: 'Produto Original Comprado *', type: 'text', required: true, tooltip: 'Qual produto o cliente já comprou?' },
      { name: 'upsellProductName', label: 'Nome do Produto de Upsell/Cross-sell *', type: 'text', required: true, tooltip: 'Qual o próximo produto a ser oferecido?' },
      { name: 'upsellBenefitConnection', label: 'Benefício do Upsell e Conexão com Compra Anterior *', type: 'textarea', placeholder: 'Ex: "Como você adorou X, vai amar Y que complementa...", "Leve seus resultados para o próximo nível com Z"', tooltip: 'Como o novo produto melhora ou complementa a experiência anterior?', required: true },
      { name: 'upsellSpecialOffer', label: 'Oferta Especial para o Upsell (Opcional)', type: 'text', placeholder: 'Ex: Desconto exclusivo para clientes, Bônus adicional', tooltip: 'Alguma condição especial para esta oferta?' },
      { name: 'linkToUpsellOffer', label: 'Link para a Oferta de Upsell *', type: 'text', placeholder: 'https://...', tooltip: 'Onde o cliente pode ver e adquirir a nova oferta?', required: true },
  ]},
  { key: 'postlaunch_social_post_student_results', label: 'Post Social: Resultados de Alunos/Clientes', phase: 'post_launch', category: 'Posts Redes Sociais (Pós-Lançamento)', description: 'Compartilhe o sucesso dos seus clientes com posts de resultados e depoimentos.', fields: [
      { name: 'customerNameOrInitials', label: 'Nome/Iniciais do Cliente (com permissão) *', type: 'text', placeholder: 'Ex: Maria S., J.P.', tooltip: 'Identificação do cliente que obteve o resultado.', required: true },
      { name: 'resultAchieved', label: 'Principal Resultado Alcançado pelo Cliente *', type: 'textarea', placeholder: 'Ex: "Aumentou as vendas em 50%", "Conseguiu economizar R$500 por mês"', tooltip: 'Qual foi a conquista específica do cliente?', required: true },
      { name: 'productUsed', label: 'Produto/Serviço Utilizado para Alcançar o Resultado', type: 'text', placeholder: 'Ex: Curso de Finanças Pessoais', tooltip: 'Qual dos seus produtos/serviços ajudou o cliente?' },
      { name: 'testimonialQuote', label: 'Citação Curta do Depoimento (Opcional)', type: 'text', placeholder: 'Ex: "Este curso mudou minha vida!"', tooltip: 'Uma frase impactante do cliente.' },
      { name: 'callToActionRelated', label: 'Chamada para Ação Relacionada', type: 'text', placeholder: 'Ex: "Quer resultados assim? Conheça nosso método!", "Inspire-se e comece sua jornada!"', tooltip: 'Como conectar este resultado a uma ação do público?' },
  ]}
];

// Schemas da IA (se não forem importados de outro lugar)
export const aiResponseSchema = { type: "OBJECT", properties: { mainCopy: { type: "STRING" }, alternativeVariation1: { type: "STRING" }, alternativeVariation2: { type: "STRING" }, platformSuggestion: { type: "STRING" }, notes: { type: "STRING" } }, required: ["mainCopy", "platformSuggestion"] };
export const contentIdeasResponseSchema = { type: "OBJECT", properties: { contentIdeas: { type: "ARRAY", items: { "type": "STRING" } } }, required: ["contentIdeas"] };
export const optimizeCopyResponseSchema = { type: "OBJECT", properties: { optimizedCopy: { type: "STRING" }, optimizationNotes: { type: "STRING" } }, required: ["optimizedCopy"] };

// Opções para Selects (se não forem importados de outro lugar)
export const objectiveOptions: Array<{ value: BaseGeneratorFormState['objective']; label: string }> = [
    { value: 'sales', label: 'Gerar Vendas' }, { value: 'leads', label: 'Gerar Leads' },
    { value: 'engagement', label: 'Aumentar Engajamento' }, { value: 'awareness', label: 'Criar Reconhecimento' }
];
export const toneOptions: Array<{ value: BaseGeneratorFormState['tone']; label: string }> = [
    { value: 'professional', label: 'Profissional' }, { value: 'casual', label: 'Casual' },
    { value: 'urgent', label: 'Urgente' }, { value: 'inspirational', label: 'Inspiracional' },
    { value: 'educational', label: 'Educativo' }, { value: 'empathetic', label: 'Empático' },
    { value: 'divertido', label: 'Divertido' }, { value: 'sofisticado', label: 'Sofisticado' }
];
