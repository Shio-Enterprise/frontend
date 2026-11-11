// #83: substituir os rascunhos e as imagens pelo conteúdo aprovado pela Shio.
export const institutionalPages = {
  about: {
    path: '/sobre-nos',
    label: 'Sobre nós',
    group: 'Shio',
    intro: 'Mais do que vestir. Expressar o que faz sentido para você.',
    image: {
      src: '/images/shio/hero-slide-2.jpg.png',
      alt: 'Camisetas claras da campanha Shio, com a frase Deus primeiro. Negócios depois.',
      caption: 'Imagem provisória: campanha já utilizada no site.',
    },
    sections: [
      {
        title: 'O que nos move',
        paragraphs: ['Acreditamos nas conexões entre o que vestimos e o que carregamos com a gente. Nas ideias que acompanham a rotina e nos detalhes que tornam uma peça parte da nossa história.'],
      },
      {
        title: 'De perto, do seu jeito',
        paragraphs: ['Este é um espaço para conhecer a identidade da Shio, suas referências e o cuidado por trás de cada coleção. Em breve, a marca vai contar essa história com as próprias palavras.'],
        link: { label: 'Conhecer nossa história', to: '/nossa-historia' },
      },
    ],
    action: { label: 'Explorar os drops', to: '/category/all' },
  },
  history: {
    path: '/nossa-historia',
    label: 'Nossa história',
    group: 'Shio',
    intro: 'Toda história tem um começo. A nossa está ganhando este espaço.',
    image: {
      src: '/images/shio/hero-slide-1.png',
      alt: 'Imagem de campanha de um drop da Shio',
      caption: 'Imagem provisória: campanha já utilizada no site.',
    },
    sections: [
      {
        title: 'A primeira ideia',
        paragraphs: ['Uma referência, uma conversa, uma vontade de criar. Aqui vamos compartilhar como a Shio começou e quais ideias deram forma à marca.'],
      },
      {
        title: 'O caminho até aqui',
        paragraphs: ['Este espaço vai reunir os momentos, as pessoas e as coleções que fazem parte dessa trajetória. Os relatos e as fotografias serão escolhidos pela própria Shio.'],
      },
      {
        title: 'Os próximos capítulos',
        paragraphs: ['A história continua nas peças, nos encontros e em quem escolhe caminhar com a marca. Conheça os drops disponíveis enquanto preparamos os próximos capítulos desta página.'],
      },
    ],
    action: { label: 'Ver os drops', to: '/category/all' },
  },
  contact: {
    path: '/contato',
    label: 'Contato',
    group: 'Shio',
    intro: 'Vamos conversar? Encontre o caminho para falar com a Shio.',
    contacts: [
      { label: 'E-mail', value: 'Endereço oficial em breve' },
      { label: 'WhatsApp', value: 'Número oficial em breve' },
      { label: 'Horário de atendimento', value: 'Dias e horários a confirmar' },
    ],
    sections: [
      {
        title: 'Sobre uma compra',
        paragraphs: ['Para conferir informações de uma compra, acesse sua conta e abra o pedido. Ao entrar em contato com a loja, tenha o número do pedido em mãos.'],
        link: { label: 'Ver meus pedidos', to: '/my-orders' },
      },
      {
        title: 'Dúvidas antes de comprar',
        paragraphs: ['Reunimos informações sobre entrega, acompanhamento de pedidos e solicitações de troca na área de ajuda.'],
        link: { label: 'Consultar a ajuda', to: '/ajuda/suporte' },
      },
    ],
  },
  support: {
    path: '/ajuda/suporte',
    label: 'Suporte ao cliente',
    group: 'Ajuda',
    intro: 'Uma ajuda para cada etapa da sua compra.',
    sections: [
      {
        title: 'Quero acompanhar meu pedido',
        paragraphs: ['Acesse Meus pedidos e selecione uma compra para consultar seu status e as informações de envio disponíveis.'],
        link: { label: 'Acessar meus pedidos', to: '/my-orders' },
      },
      {
        title: 'Tenho uma dúvida sobre entrega',
        paragraphs: ['Confira como consultar a estimativa para seu endereço e onde acompanhar as informações do envio.'],
        link: { label: 'Consultar prazo de entrega', to: '/ajuda/prazo-de-entrega' },
      },
      {
        title: 'Preciso de uma troca ou devolução',
        paragraphs: ['Consulte as orientações e abra o pedido na sua conta para verificar as opções de solicitação disponíveis.'],
        link: { label: 'Ver trocas e devoluções', to: '/ajuda/trocas-e-devolucoes' },
      },
      {
        title: 'Quero falar com a loja',
        paragraphs: ['Os canais oficiais de atendimento serão disponibilizados assim que forem confirmados pela Shio.'],
        link: { label: 'Ver informações de contato', to: '/contato' },
      },
    ],
  },
  delivery: {
    path: '/ajuda/prazo-de-entrega',
    label: 'Prazo de entrega',
    group: 'Ajuda',
    intro: 'Do carrinho até você, acompanhe cada etapa.',
    sections: [
      {
        title: 'Consulte pelo seu CEP',
        paragraphs: ['No checkout, selecione seu endereço para consultar as opções de frete e a estimativa de entrega disponíveis para o pedido. Confira essas informações antes de concluir a compra.'],
      },
      {
        title: 'Preparação e envio',
        paragraphs: ['As informações oficiais sobre o local de envio, a preparação dos pedidos e a contagem do prazo serão publicadas aqui após a confirmação da Shio. Esta prévia não estabelece um prazo de entrega.'],
      },
      {
        title: 'Depois da compra',
        paragraphs: ['Na sua conta, abra o pedido para consultar o status e o código de rastreio, quando disponível. Se precisar de ajuda, consulte as informações de atendimento.'],
        link: { label: 'Acompanhar meu pedido', to: '/my-orders' },
      },
    ],
    action: { label: 'Consultar o suporte', to: '/ajuda/suporte' },
  },
  exchanges: {
    path: '/ajuda/trocas-e-devolucoes',
    label: 'Trocas e devoluções',
    group: 'Ajuda',
    intro: 'As orientações para cuidar da sua compra, em um só lugar.',
    sections: [
      {
        title: 'Comece pelo seu pedido',
        paragraphs: ['Acesse sua conta e abra a compra em Meus pedidos. As opções de troca ou reembolso aparecem nos detalhes do pedido, conforme a elegibilidade da compra.'],
        link: { label: 'Abrir meus pedidos', to: '/my-orders' },
      },
      {
        title: 'Acompanhe sua solicitação',
        paragraphs: ['Depois de solicitar, acompanhe a análise e as instruções da loja nos detalhes do pedido. Aguarde as orientações antes de enviar uma peça.'],
      },
      {
        title: 'Política da loja',
        paragraphs: ['A política oficial, com prazos, condições, custos de envio e orientações para devolução, será incluída após a aprovação da Shio. Este texto demonstrativo não substitui essa política.'],
      },
    ],
    action: { label: 'Preciso de ajuda', to: '/ajuda/suporte' },
  },
};

// Preencher apenas com URLs oficiais confirmadas; sem URL, a rede fica oculta.
export const socialLinks = [];
