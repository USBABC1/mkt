// server/services/gemini.service.ts
import { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold } from "@google/generative-ai";
import { GEMINI_API_KEY } from '../config';

interface LandingPageOptions {
  style?: 'modern' | 'minimal' | 'bold' | 'elegant' | 'tech' | 'startup';
  colorScheme?: 'dark' | 'light' | 'gradient' | 'neon' | 'earth' | 'ocean';
  industry?: string;
  targetAudience?: string;
  primaryCTA?: string;
  secondaryCTA?: string;
  includeTestimonials?: boolean;
  includePricing?: boolean;
  includeStats?: boolean;
  includeFAQ?: boolean;
  animationsLevel?: 'none' | 'subtle' | 'moderate' | 'dynamic';
}

class GeminiService {
  private genAI: GoogleGenerativeAI | null = null;

  constructor(apiKey: string) {
    if (!apiKey) {
      console.warn('[GeminiService] API Key não configurada. O serviço não funcionará.');
      return;
    }
    this.genAI = new GoogleGenerativeAI(apiKey);
  }

  private getColorScheme(scheme: string): any {
    const schemes = {
      dark: {
        primary: 'bg-slate-900',
        secondary: 'bg-gray-800',
        accent: 'from-blue-600 to-purple-600',
        text: 'text-white',
        textSecondary: 'text-gray-300'
      },
      light: {
        primary: 'bg-white',
        secondary: 'bg-gray-50',
        accent: 'from-indigo-500 to-purple-600',
        text: 'text-gray-900',
        textSecondary: 'text-gray-600'
      },
      gradient: {
        primary: 'bg-gradient-to-br from-indigo-900 via-purple-900 to-pink-900',
        secondary: 'bg-white/10 backdrop-blur-lg',
        accent: 'from-cyan-400 to-pink-400',
        text: 'text-white',
        textSecondary: 'text-gray-200'
      },
      neon: {
        primary: 'bg-black',
        secondary: 'bg-gray-900',
        accent: 'from-green-400 to-cyan-400',
        text: 'text-white',
        textSecondary: 'text-green-300'
      },
      earth: {
        primary: 'bg-amber-50',
        secondary: 'bg-orange-100',
        accent: 'from-orange-500 to-red-500',
        text: 'text-amber-900',
        textSecondary: 'text-orange-700'
      },
      ocean: {
        primary: 'bg-slate-800',
        secondary: 'bg-blue-900',
        accent: 'from-blue-400 to-teal-400',
        text: 'text-white',
        textSecondary: 'text-blue-200'
      }
    };
    return schemes[scheme as keyof typeof schemes] || schemes.dark;
  }

  // ✅ CORREÇÃO: Acentos graves (backticks) foram "escapados" com uma barra invertida (\`)
  private getAdvancedSystemPrompt(options: LandingPageOptions): string {
    const colors = this.getColorScheme(options.colorScheme || 'dark');
    
    return `
      Você é um EXPERT FRONTEND ARCHITECT e CONVERSION OPTIMIZATION SPECIALIST, especializado em criar landing pages que convertem visitantes em clientes usando as mais avançadas técnicas de UI/UX, neuromarketing e desenvolvimento web moderno.

      🎯 MISSÃO CRÍTICA: Criar uma landing page que seja visualmente IMPRESSIONANTE, tecnicamente PERFEITA e comercialmente EFICAZ.

      ═══════════════════════════════════════════════════════════════
      📋 ESPECIFICAÇÕES TÉCNICAS OBRIGATÓRIAS
      ═══════════════════════════════════════════════════════════════

      ✅ **FORMATO DE SAÍDA ABSOLUTO**:
      - APENAS código HTML puro, de "<!DOCTYPE html>" até "</html>"
      - ZERO texto explicativo, ZERO markdown, ZERO comentários externos
      - Código deve ser 100% funcional e renderizável imediatamente

      ✅ **ESTRUTURA HTML5 SEMÂNTICA COMPLETA**:
      \`\`\`html
      <!DOCTYPE html>
      <html lang="pt-BR">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>[Título Otimizado para SEO]</title>
        <meta name="description" content="[Meta description persuasiva de 150-160 caracteres]">
        <link rel="canonical" href="https://exemplo.com">
        <meta property="og:title" content="[Open Graph Title]">
        <meta property="og:description" content="[OG Description]">
        <meta property="og:image" content="[OG Image URL]">
        <meta name="twitter:card" content="summary_large_image">
        <script src="https://cdn.tailwindcss.com"></script>
        <script>
          tailwind.config = {
            theme: {
              extend: {
                animation: {
                  'fade-in-up': 'fadeInUp 0.6s ease-out',
                  'fade-in-down': 'fadeInDown 0.6s ease-out',
                  'slide-in-left': 'slideInLeft 0.8s ease-out',
                  'slide-in-right': 'slideInRight 0.8s ease-out',
                  'pulse-slow': 'pulse 3s infinite',
                  'bounce-gentle': 'bounceGentle 2s infinite',
                  'glow': 'glow 2s ease-in-out infinite alternate'
                },
                keyframes: {
                  fadeInUp: { '0%': { opacity: '0', transform: 'translateY(30px)' }, '100%': { opacity: '1', transform: 'translateY(0)' } },
                  fadeInDown: { '0%': { opacity: '0', transform: 'translateY(-30px)' }, '100%': { opacity: '1', transform: 'translateY(0)' } },
                  slideInLeft: { '0%': { opacity: '0', transform: 'translateX(-30px)' }, '100%': { opacity: '1', transform: 'translateX(0)' } },
                  slideInRight: { '0%': { opacity: '0', transform: 'translateX(30px)' }, '100%': { opacity: '1', transform: 'translateX(0)' } },
                  bounceGentle: { '0%, 100%': { transform: 'translateY(0)' }, '50%': { transform: 'translateY(-5px)' } },
                  glow: { '0%': { boxShadow: '0 0 5px rgba(59, 130, 246, 0.5)' }, '100%': { boxShadow: '0 0 20px rgba(59, 130, 246, 0.8)' } }
                }
              }
            }
          }
        </script>
      </head>
      \`\`\`

      ═══════════════════════════════════════════════════════════════
      🎨 ESPECIFICAÇÕES VISUAIS PREMIUM
      ═══════════════════════════════════════════════════════════════

      ✅ **DESIGN SYSTEM AVANÇADO**:
      - **Paleta de Cores**: ${JSON.stringify(colors)}
      - **Tipografia**: Font families modernas (Inter, Poppins, ou similar via Google Fonts)
      - **Espaçamento**: Sistema consistente de spacing (8pt grid)
      - **Sombras**: Múltiplas camadas de sombras para profundidade
      - **Bordas**: Border radius consistente e moderno
      - **Gradientes**: Uso estratégico de gradientes para elementos de destaque

      ✅ **ELEMENTOS VISUAIS OBRIGATÓRIOS**:
      - **Background**: Gradientes complexos, padrões sutis ou texturas
      - **Glassmorphism**: Efeitos de vidro fosco (backdrop-blur)
      - **Neumorphism**: Sombras internas e externas para elementos
      - **Microinterações**: Hover effects, transitions suaves
      - **Ícones**: SVGs inline da Lucide Icons (https://lucide.dev/)
      - **Imagens**: Placeholders otimizados do https://placehold.co/

      ═══════════════════════════════════════════════════════════════
      📱 RESPONSIVIDADE EXTREMA
      ═══════════════════════════════════════════════════════════════

      ✅ **BREAKPOINTS OTIMIZADOS**:
      - **Mobile**: sm: (640px+) - Layout vertical, CTAs grandes
      - **Tablet**: md: (768px+) - Layout híbrido, navegação adaptada
      - **Desktop**: lg: (1024px+) - Layout horizontal, hover effects
      - **Large**: xl: (1280px+) - Máximo aproveitamento do espaço
      - **Extra Large**: 2xl: (1536px+) - Design premium para telas grandes

      ✅ **OTIMIZAÇÕES MOBILE-FIRST**:
      - Touch targets de 44px mínimo
      - Texto legível sem zoom (16px+ base)
      - Loading otimizado para conexões lentas
      - Gestos touch intuitivos

      ═══════════════════════════════════════════════════════════════
      🏗️ ARQUITETURA DE SEÇÕES OBRIGATÓRIAS
      ═══════════════════════════════════════════════════════════════

      **1. 🔝 HEADER INTELIGENTE**:
      - Logo + navegação sticky com backdrop-blur
      - Menu hamburger animado para mobile
      - CTA no header para conversão imediata
      - Indicador de scroll progress (opcional)

      **2. 🚀 HERO SECTION IMPACTANTE**:
      - Headline poderosa (técnicas de copywriting)
      - Subheadline que gera urgência/desejo
      - Duplo CTA (primário + secundário)
      - Hero image/video de alta qualidade
      - Elementos de prova social (logos, números)
      - Scroll indicator animado

      **3. 💎 SEÇÃO DE VALOR ÚNICO**:
      - Value proposition clara e mensurável
      - 3-4 benefícios principais com ícones
      - Before/After ou comparação visual
      - Estatísticas impressionantes

      **4. 🎯 RECURSOS/FUNCIONALIDADES**:
      - Grid responsivo de features
      - Cada feature com ícone SVG único
      - Microcopy persuasivo
      - Hover effects elaborados

      **5. 📊 PROVA SOCIAL PODEROSA**:
      - Testimonials com fotos reais (placeholders)
      - Ratings/reviews com estrelas
      - Logos de clientes/parceiros
      - Números de impacto (usuários, vendas, etc.)

      **6. 💰 SEÇÃO DE PREÇOS (se aplicável)**:
      - Cards de pricing com destaque visual
      - Comparação de planos clara
      - Badge "Mais Popular" ou "Melhor Valor"
      - Garantias e políticas de reembolso

      **7. ❓ FAQ ESTRATÉGICO**:
      - Accordion interativo
      - Perguntas que eliminam objeções
      - Respostas que reforçam benefícios

      **8. 🔥 CTA FINAL IRRESISTÍVEL**:
      - Urgência e escassez
      - Benefício final destacado
      - Múltiplas opções de conversão
      - Garantias de segurança

      **9. 🌐 FOOTER COMPLETO**:
      - Links organizados por categorias
      - Redes sociais com ícones SVG
      - Newsletter signup
      - Informações legais e contato

      ═══════════════════════════════════════════════════════════════
      ⚡ ANIMAÇÕES E MICROINTERAÇÕES
      ═══════════════════════════════════════════════════════════════

      ✅ **NÍVEL DE ANIMAÇÃO: ${options.animationsLevel || 'moderate'}**

      **Animações CSS Personalizadas**:
      - Fade in/out com timings perfeitos
      - Slide animations para revelar conteúdo
      - Hover effects sofisticados
      - Loading states elegantes
      - Scroll-triggered animations (CSS only)

      **Microinterações Obrigatórias**:
      - Botões com feedback visual instantâneo
      - Cards com hover lift effect
      - Form inputs com estados de foco
      - Navegação com indicadores ativos

      ═══════════════════════════════════════════════════════════════
      📈 OTIMIZAÇÃO PARA CONVERSÃO
      ═══════════════════════════════════════════════════════════════

      ✅ **TÉCNICAS DE NEUROMARKETING**:
      - Cores que geram ação (vermelho, laranja para CTAs)
      - Escassez e urgência nos textos
      - Prova social abundante
      - Hierarquia visual clara (regra F)

      ✅ **COPYWRITING AVANÇADO**:
      - Headlines com power words
      - Benefícios focados no cliente (não em features)
      - Linguagem emocional + racional
      - CTAs com verbos de ação específicos

      ✅ **UX PATTERNS COMPROVADOS**:
      - Above the fold otimizado
      - Formulários simples e diretos
      - Trust signals visíveis
      - Mobile-first approach

      ═══════════════════════════════════════════════════════════════
      🛡️ PERFORMANCE E ACESSIBILIDADE
      ═══════════════════════════════════════════════════════════════

      **Performance**:
      - Lazy loading para imagens
      - CSS otimizado e minificado
      - Fontes com display: swap
      - Crítico CSS inline

      **Acessibilidade**:
      - Contraste WCAG AA compliant
      - Alt texts descritivos
      - Navegação por teclado
      - Screen reader friendly

      **SEO**:
      - Meta tags completas
      - Schema markup estruturado
      - URLs semânticas
      - Core Web Vitals otimizados

      ═══════════════════════════════════════════════════════════════
      💡 PERSONALIZAÇÃO BASEADA NO CONTEXTO
      ═══════════════════════════════════════════════════════════════

      - **Estilo**: ${options.style || 'modern'}
      - **Indústria**: ${options.industry || 'tecnologia'}
      - **Público-alvo**: ${options.targetAudience || 'profissionais'}
      - **CTA Primário**: ${options.primaryCTA || 'Começar Agora'}
      - **CTA Secundário**: ${options.secondaryCTA || 'Saber Mais'}

      ═══════════════════════════════════════════════════════════════
      🎯 COMANDO FINAL
      ═══════════════════════════════════════════════════════════════

      Crie uma landing page que seja:
      1. **VISUALMENTE DESLUMBRANTE** - Que faça o usuário parar e admirar
      2. **TECNICAMENTE PERFEITA** - Código limpo, semântico e otimizado  
      3. **COMERCIALMENTE EFICAZ** - Focada 100% em conversão
      4. **MOBILE-FIRST** - Experiência premium em todos os dispositivos
      5. **ÚNICA E MEMORÁVEL** - Que destaque da concorrência

      **LEMBRE-SE**: Sua resposta deve começar IMEDIATAMENTE com "<!DOCTYPE html>" e terminar com "</html>". Nenhum texto adicional!
    `;
  }

  public async createAdvancedLandingPage(
    prompt: string,
    options: LandingPageOptions = {},
    reference?: string
  ): Promise<string> {
    if (!this.genAI) {
      throw new Error('A API Key do Gemini não está configurada no servidor.');
    }

    const model = this.genAI.getGenerativeModel({ 
      model: "gemini-1.5-pro-latest",
      safetySettings: [
        {
          category: HarmCategory.HARM_CATEGORY_HARASSMENT,
          threshold: HarmBlockThreshold.BLOCK_NONE,
        },
        {
          category: HarmCategory.HARM_CATEGORY_HATE_SPEECH,
          threshold: HarmBlockThreshold.BLOCK_NONE,
        },
        {
          category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT,
          threshold: HarmBlockThreshold.BLOCK_NONE,
        },
        {
          category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT,
          threshold: HarmBlockThreshold.BLOCK_NONE,
        },
      ],
    });

    const systemPrompt = this.getAdvancedSystemPrompt(options);

    const userPrompt = `
      BRIEFING DO CLIENTE:
      ${prompt}
      
      CONFIGURAÇÕES ESPECÍFICAS:
      - Estilo: ${options.style || 'modern'}
      - Esquema de Cores: ${options.colorScheme || 'dark'}
      - Indústria: ${options.industry || 'Não especificada'}
      - Público-alvo: ${options.targetAudience || 'Público geral'}
      - CTA Primário: ${options.primaryCTA || 'Começar Agora'}
      - CTA Secundário: ${options.secondaryCTA || 'Saber Mais'}
      - Incluir Depoimentos: ${options.includeTestimonials !== false ? 'Sim' : 'Não'}
      - Incluir Preços: ${options.includePricing ? 'Sim' : 'Não'}
      - Incluir Estatísticas: ${options.includeStats !== false ? 'Sim' : 'Não'}
      - Incluir FAQ: ${options.includeFAQ !== false ? 'Sim' : 'Não'}
      - Nível de Animações: ${options.animationsLevel || 'moderate'}
      
      ${reference ? `
      REFERÊNCIA VISUAL (use como inspiração para estrutura e design, mas o conteúdo deve ser baseado no briefing acima):
      ${reference}
      ` : ''}

      EXECUTE AGORA: Crie a landing page mais impressionante e eficaz possível!
    `;

    try {
      const result = await model.generateContent([systemPrompt, userPrompt]);
      const response = result.response;
      let htmlContent = response.text();

      // Limpa o HTML para garantir que está no formato correto
      const htmlMatch = htmlContent.match(/<!DOCTYPE html>.*<\/html>/is);
      if (htmlMatch) {
        htmlContent = htmlMatch[0];
      } else {
        // Remove possíveis markdown blocks se existirem
        htmlContent = htmlContent
          .replace(/```html\n?/g, '')
          .replace(/```/g, '')
          .trim();
        
        // Se não começar com DOCTYPE, adiciona estrutura básica
        if (!htmlContent.startsWith('<!DOCTYPE html>')) {
          htmlContent = `<!DOCTYPE html>\n${htmlContent}`;
        }
      }

      return htmlContent;
    } catch (error: any) {
      console.error('[GeminiService] Erro ao chamar a API do Gemini:', error);
      throw new Error(`Falha ao gerar landing page: ${error.message}`);
    }
  }

  // Método de compatibilidade com a versão anterior
  public async createLandingPageFromPrompt(
    prompt: string,
    reference?: string
  ): Promise<string> {
    return this.createAdvancedLandingPage(prompt, {
      style: 'modern',
      colorScheme: 'dark',
      animationsLevel: 'moderate'
    }, reference);
  }

  // Método para gerar múltiplas variações
  public async generateVariations(
    prompt: string,
    count: number = 3,
    baseOptions: LandingPageOptions = {}
  ): Promise<string[]> {
    const variations: string[] = [];
    const styles: Array<LandingPageOptions['style']> = ['modern', 'minimal', 'bold', 'elegant', 'tech'];
    const colorSchemes: Array<LandingPageOptions['colorScheme']> = ['dark', 'gradient', 'neon', 'ocean'];

    for (let i = 0; i < count; i++) {
      const options: LandingPageOptions = {
        ...baseOptions,
        style: styles[i % styles.length],
        colorScheme: colorSchemes[i % colorSchemes.length],
        animationsLevel: i === 0 ? 'dynamic' : i === 1 ? 'moderate' : 'subtle'
      };

      try {
        const variation = await this.createAdvancedLandingPage(prompt, options);
        variations.push(variation);
      } catch (error) {
        console.error(`Erro ao gerar variação ${i + 1}:`, error);
      }
    }

    return variations;
  }

  // Método para otimizar landing page existente
  public async optimizeLandingPage(
    currentHtml: string,
    optimizationGoals: string[] = ['conversion', 'performance', 'accessibility']
  ): Promise<string> {
    if (!this.genAI) {
      throw new Error('A API Key do Gemini não está configurada no servidor.');
    }

    const model = this.genAI.getGenerativeModel({ model: "gemini-1.5-pro-latest" });

    const optimizationPrompt = `
      Você é um especialista em OTIMIZAÇÃO DE CONVERSÃO e PERFORMANCE WEB.
      
      Analise a landing page fornecida e aplique as seguintes otimizações:
      ${optimizationGoals.map(goal => `- ${goal.toUpperCase()}`).join('\n')}
      
      LANDING PAGE ATUAL:
      ${currentHtml}
      
      OTIMIZAÇÕES OBRIGATÓRIAS:
      1. Melhore os CTAs para aumentar conversão
      2. Otimize a hierarquia visual
      3. Adicione elementos de urgência e escassez
      4. Melhore a prova social
      5. Otimize para mobile
      6. Adicione microinterações
      7. Melhore o SEO on-page
      8. Otimize a velocidade de carregamento
      
      Retorne APENAS o HTML otimizado, sem explicações.
    `;

    try {
      const result = await model.generateContent(optimizationPrompt);
      const response = result.response;
      return response.text();
    } catch (error: any) {
      console.error('[GeminiService] Erro ao otimizar landing page:', error);
      throw new Error(`Falha ao otimizar landing page: ${error.message}`);
    }
  }
}

export const geminiService = new GeminiService(GEMINI_API_KEY);
