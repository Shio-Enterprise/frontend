# #83 — páginas institucionais e ajuda

Esta entrega prepara as seis páginas com rascunhos identificados como provisórios. Não conclui o recebimento e a aprovação do conteúdo exigidos pela [issue #83](https://github.com/Shio-Enterprise/Documentacao/issues/83).

| Página | Rota | Chave do conteúdo |
| --- | --- | --- |
| Sobre nós | `/sobre-nos` | `about` |
| Nossa história | `/nossa-historia` | `history` |
| Contato | `/contato` | `contact` |
| Suporte ao cliente | `/ajuda/suporte` | `support` |
| Prazo de entrega | `/ajuda/prazo-de-entrega` | `delivery` |
| Trocas e devoluções | `/ajuda/trocas-e-devolucoes` | `exchanges` |

## Substituir o conteúdo

- Textos, contatos, caminhos das imagens, descrições e legendas ficam em `src/data/institutionalContent.js`.
- A apresentação compartilhada fica em `src/pages/public/InstitutionalPage/index.jsx`. As rotas e a navegação usam os mesmos dados.
- O item Contato do cabeçalho também abre a nova página, tanto no desktop quanto no menu do celular.
- As imagens provisórias são as campanhas já existentes em `public/images/shio/`. Coloque as fotos oficiais nessa pasta e atualize `src`, `alt`, `caption` e as dimensões da imagem no componente se necessário.
- Os contatos são campos de espera, sem e-mail ou telefone inventados. Ao receber os canais oficiais, substitua os valores e adicione os links de contato correspondentes.
- `socialLinks` começa vazio. Para cada perfil oficial confirmado, inclua `{ label: 'Instagram', href: 'URL_OFICIAL' }`. O rodapé exibe os links em nova aba com `noopener noreferrer`; redes sem URL permanecem ocultas.
- Após a aprovação de todos os textos e imagens, retire o aviso de conteúdo provisório do componente e atualize os testes. Não publique os rascunhos como política oficial da loja.

## Ainda depende da Shio

Textos institucionais, fotos, contatos e horários, perfis sociais, origem/preparação/prazos de envio e política de trocas e devoluções. Registrar as aprovações na issue.

O rodapé mostra Pix e cartão, as opções apresentadas no checkout atual. Boleto foi retirado até haver confirmação e suporte no fluxo de pagamento.
