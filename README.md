# 🚌 BusPoint — Sistema de Gestão de Transporte Escolar

O **BusPoint** é uma aplicação full-stack desenvolvida como Trabalho de Conclusão de Curso (TCC) para modernizar, organizar e otimizar o gerenciamento do transporte escolar. O sistema conecta **Administradores**, **Motoristas** e **Alunos** em uma plataforma centralizada, garantindo maior controle operacional, rastreabilidade de embarques e desembarques e transparência nas rotas e horários.

---

## 📋 Resumo do Projeto

A gestão tradicional do transporte escolar frequentemente enfrenta problemas como desencontro de informações sobre horários, falta de controle em tempo real sobre os passageiros embarcados e dificuldades na organização de rotas e frotas. 

O **BusPoint** resolve esses gargalos oferecendo três ambientes dedicados e protegidos por autenticação **JWT (JSON Web Token)** com controle de acesso baseado em perfis (*Role-Based Access Control*):

* **Painel Administrativo (Web):** Gestão completa de alunos (incluindo aprovação de cadastros pendentes e alteração de status), motoristas, ônibus, pontos de parada, criação de rotas ordenadas, vinculação de matrículas, agendamento de viagens e auditoria de registros de embarque/desembarque.
* **Área do Motorista (Responsiva / Mobile):** Visualização da rota vinculada, pontos de parada em ordem de percurso, lista de alunos ativos, dados do veículo, controle de início/encerramento de viagens e registro rápido de embarque e desembarque de passageiros.
* **Área do Aluno (Responsiva / Mobile):** Consulta de matrícula, situação cadastral, itinerário da rota, horários de saída e retorno, informações do ônibus/motorista e histórico completo de embarques e desembarques.

### 🛠️ Tecnologias Utilizadas

* **Back-end:** Java, Spring Boot, Spring Security (JWT), Spring Data JPA / Hibernate.
* **Banco de Dados:** PostgreSQL.
* **Front-end:** HTML5, CSS3, JavaScript (ES6+ modular).
* **Prototipação & Modelagem:** Figma, Astah UML.
* **Ferramentas:** Git, GitHub, Visual Studio Code, Postman.

---

## 🚀 Etapas do Projeto

O desenvolvimento do BusPoint foi estruturado em etapas sequenciais para garantir alinhamento entre requisitos de negócio, experiência do usuário e arquitetura de software:

1. **Levantamento de Requisitos e Documentação:** Definição das regras de negócio, casos de uso, requisitos funcionais/não funcionais e elaboração da documentação técnica seguindo as normas da ABNT.
2. **Modelagem de Dados e Arquitetura:** Criação dos diagramas UML (casos de uso e classes), definição da herança de usuários (`Usuario`, `Administrador`, `Motorista`, `Aluno`) e estruturação do banco de dados relacional em PostgreSQL.
3. **Prototipação UI/UX:** Criação da identidade visual, paletas de cores (com suporte a tema claro e escuro) e protótipos de telas para desktop e dispositivos móveis.
4. **Desenvolvimento da API REST (Back-end):** Implementação das entidades JPA, DTOs, regras de negócio nos Services, endpoints nos Controllers e camada de segurança com filtros JWT e controle de permissões por perfil.
5. **Desenvolvimento da Interface (Front-end):** Construção das páginas HTML/CSS e desenvolvimento do cliente de API e gerenciamento de estado/sessão em JavaScript puro.
6. **Integração, Testes e Validação:** Conexão entre front-end e back-end, testes de fluxos de autenticação, validação de permissões de acesso, correção de inconsistências e preparação para implantação.

---

## 👥 Participantes do Projeto

| Integrante | Função / Responsabilidade |
| :--- | :--- |
| **Luis Guilherme** | Desenvolvimento Back-end e Documentação |
| **Leonardo** | Auxílio no Back-end e Associação com o Front-end |
| **Luan Hygor** | Desenvolvimento Front-end (Escopo e Estruturação) |
| **Luiz Jhonathan** | Designer de UI e UX |
| **André Mosca** | Orientador do Projeto TCC |

---

## 🎯 Conclusão do Projeto

O desenvolvimento do **BusPoint** demonstrou na prática como a engenharia de software aplicada a problemas cotidianos pode transformar a logística do transporte escolar. A integração entre uma API REST segura e tipada no back-end e uma interface limpa e responsiva no front-end permitiu entregar uma solução funcional, escalável e acessível para todos os perfis envolvidos na operação diária.

Além de consolidar os conhecimentos técnicos adquiridos ao longo do curso — como modelagem relacional, segurança com tokens JWT, arquitetura em camadas e consumo assíncrono de APIs —, o projeto reforçou a importância do trabalho colaborativo, da divisão clara de responsabilidades e do rigor na documentação técnica.
