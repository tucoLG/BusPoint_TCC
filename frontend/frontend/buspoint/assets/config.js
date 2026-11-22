/* Endereço da API BusPoint (Spring Boot). Altere se o backend rodar em outro lugar. */
window.BP_API = 'http://localhost:8080';

/* MODO SEM AUTENTICAÇÃO (somente para ver as telas enquanto a API está em desenvolvimento).
   true  = não pede login, não envia token; a tela de entrada vira um seletor de perfil.
   false = login real (POST /api/auth/login com JWT). */
window.BP_SEM_AUTH = false;
