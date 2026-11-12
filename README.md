# Nexus Forge — Orquestração & Automação Multivendor (Ansible, EXOS, Ruckus ICX & Extreme Fabric)

Plataforma web client-side para orquestração, geração de playbooks **Ansible** e scripts **CLI nativos** (**Extreme EXOS**, **Ruckus ICX / FastIron** e **Extreme Fabric / VOSS**), com gerenciamento de projetos por cliente, validação sintática em tempo real (Linter), simulação local de testes e tradução assistida de configurações legadas.

## 🚀 Funcionalidades Principais

- **Geração Multivendor**:
  - **Ansible**: Playbooks (`playbook.yml`) e inventários (`hosts.ini`) para Cisco IOS/IOS-XE, Cisco NX-OS, Extreme EXOS, Ruckus ICX, Extreme Fabric (VOSS), alvos genéricos e Servidores Linux.
  - **CLI Nativo**: Scripts prontos para console nos dialetos **Extreme EXOS**, **Ruckus ICX (FastIron)** e **Extreme Fabric (VOSS / SPBM)**.
- **Hub de Clientes & Dashboard**:
  - Organização de projetos por cliente com busca rápida, pódio de clientes, gráfico de distribuição por fabricante e auditoria automática de alertas (VLANs não criadas, conflitos de porta, IPs duplicados e ordem de execução).
- **Linter & Simulador de Testes**:
  - Verificação de digitação em blocos livres com sugestões baseadas em distância de edição (Levenshtein/OSA) e validador completo (`🧪 Testar`).
- **Controle de Versões & Autenticação Local (`@gmail.com`)**:
  - Histórico de edições por projeto com fila FIFO de até 4 versões restauráveis e gestão de usuários/administradores via `localStorage` com validação obrigatória de e-mails `@gmail.com`.
- **Tradução de Config Legado**:
  - Gera prompts estruturados com as regras oficiais de sintaxe de cada fabricante para migração rápida de running-configs legados.

## 📂 Estrutura do Projeto

```text
nexus-forge/
├── index.html
├── assets/img/logo.svg
├── css/
│   ├── base.css
│   ├── auth.css
│   ├── hub.css
│   └── modals.css
└── js/
    ├── config.js
    ├── linter.js
    ├── validator.js
    ├── ui-panels.js
    ├── generators.js
    ├── ui-actions.js
    ├── importer.js
    ├── store.js
    ├── modals.js
    ├── legacy-translator.js
    ├── hub.js
    ├── auth.js
    └── main.js