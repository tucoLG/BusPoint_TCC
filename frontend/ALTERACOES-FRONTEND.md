# Alterações do front-end (adequação ao backend `projeto-corrigido-v2`)

Base visual: **buspoint-frontend** (estilização nova). Backend: **não foi alterado**.
Todo trecho novo no código está marcado com o comentário `ALTERAÇÃO` (busque por esse termo).

## O que mudou

| Onde | O que foi feito | Endpoint(s) do backend |
|---|---|---|
| `assets/bp.js` → `BP.svc` | Catálogo com **todos os 57 endpoints** dos controllers (um método por endpoint). | todos |
| Admin › Alunos / Motoristas / Administradores | Botão **Resetar senha** na lista e nos detalhes + modal com a senha temporária (com botão Copiar). | `PATCH /api/administradores/resetar-senha/{id}` |
| Meu perfil | Card **Alterar senha** (validações iguais às do backend; só aparece para usuário ATIVO). | `PATCH /api/auth/alterar-senha` |
| Admin › **Administradores** (tela nova) | Listar, cadastrar, editar, ver detalhes, aprovar (PENDENTE→ATIVO), inativar. Item novo no menu lateral. | `/api/administradores/*` |
| `admin/administradores*.html` | 3 páginas novas (mesmo molde das de alunos). | — |

Detalhes de comportamento:
- "Resetar senha" só aparece para usuário **ATIVO** (regra do backend) e **nunca na própria conta** (para isso existe "Meu perfil").
- O admin logado não consegue **inativar a própria conta** pela lista (ficaria sem acesso).
- O modal da senha temporária **não fecha ao clicar fora** — a senha só é exibida uma vez.
- Cadastro de administrador segue o `CadastrarAdminDTO`: nome 3–50, senha 5–15, telefone 12–13 dígitos (coluna do banco = 13).

## Estrutura
```
projeto/
├── BusPointAPI/                  (backend — idêntico ao projeto-corrigido-v2)
└── frontend/frontend/buspoint/   (front novo + alterações acima)
```
Para rodar: suba o backend (porta 8080, `assets/config.js` → `BP_API`) e abra `frontend/frontend/buspoint/index.html`
por um servidor estático (ex.: extensão Live Server do VS Code).
