🚌 BusPoint - Sistema de Gestão de Transporte Universitário

📌 Resumo do Projeto

O BusPoint é uma plataforma desenvolvida como Trabalho de Conclusão de Curso (TCC) voltada para a gestão inteligente e otimizada do transporte universitário e escolar.

A solução integra em um único ecossistema web a administração de motoristas, alunos, ônibus, rotas e viagens. O sistema permite o acompanhamento em tempo real das rotas, validação e aprovação de matrículas de alunos, gerenciamento de horários e controle de acesso seguro por meio de perfis diferenciados (Administrador, Motorista e Aluno).

🛠️ Tecnologias Utilizadas

Back-end

Linguagem: Java 17

Framework: Spring Boot 3

Segurança & Autenticação: Spring Security + JWT (JSON Web Tokens)

Persistência de Dados: Spring Data JPA / Hibernate

Banco de Dados: PostgreSQL

Front-end

Interface: HTML5, CSS3, JavaScript (Vanilla JS)

Arquitetura Front-end: SPA (Single Page Application) modular otimizada

Comunicação: API REST via Fetch API

📅 Etapas do Projeto

Levantamento de Requisitos e Planejamento:

Definição do escopo, regras de negócio para alocação de alunos e rotas, e modelagem das entidades de dados.

Design de UI/UX:

Criação da identidade visual, wireframes e protótipos de alta fidelidade focando na usabilidade de alunos e administradores.

Desenvolvimento da API Back-end:

Implementação dos controllers RESTful, regras de serviço, migração de dados e camada de segurança com Spring Security e JWT.

Desenvolvimento Front-end & Integração:

Construção das telas do painel administrativo e da visão do aluno/motorista, integrando os endpoints REST da aplicação.

Ajustes de Segurança e Testes:

Testes de integração, refatoração de permissões por perfil (Roles) e homologação dos fluxos de cadastro e aprovação de matrículas.

👥 Participantes e Papéis

Luis Guilherme — Back-end e Documentação

Leonardo — Auxílio no Back-end e Associação de Front-end

Luan Hygor — Front-end (Escopo e Estrutura)

Luiz Jhonathan — Designer de UI e UX

Prof. André Mosca — Orientador do Projeto TCC

🏁 Conclusão do Projeto

O projeto BusPoint alcançou seu objetivo principal de entregar uma plataforma robusta, segura e acessível para sanar os desafios da logística do transporte escolar e universitário.

Através da centralização de informações e do controle dinâmico de status (aprovação de alunos e vinculação de ônibus e viagens), a aplicação reduz ruídos de comunicação entre a gestão e os passageiros, demonstrando a viabilidade prática da solução desenvolvida e a sólida integração entre o design centrado no usuário e a arquitetura de software orientada a serviços.

🚀 Como Executar o Projeto

Pró-requisitos

Java 17+

Maven 3.x+

PostgreSQL instalado e rodando

Passos

Clonar o repositório:

git clone https://github.com/tucoLG/BusPoint_TCC.git


Configurar o banco de dados:
Configure a URL e credenciais do banco em src/main/resources/application.properties ou através de variáveis de ambiente (DB_URL, DB_USER, DB_PASS).

Executar o Back-end:

mvn spring-boot:run


Acessar o Front-end:
Abra o arquivo index.html em seu navegador ou utilize um servidor estático local (como Live Server no VS Code).
