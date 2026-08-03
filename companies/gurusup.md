# GuruSup

- Stage: enterprise
- Practices: enterprise, ai_product, founder, platform
- Episodes: 1

## Guests

- Product Demo de GuruSup con Victor Mollá — Founder ([episode](../episodes/gestionamos-500-000-tickets-con-agentes-de-ia-product-demo-de-gurusup--pEj3I-sZhs4.md))

## Product Demo de GuruSup con Victor Mollá

Gurusup, founded by Victor Mollá, is developing an AI-powered customer support system designed to handle customer interactions end-to-end. Unlike traditional systems that rely on pre-written responses or basic information retrieval, Gurusup's agents can perform actions, access internal systems, and collaborate to resolve complex customer issues.

### Product workflow

```mermaid
flowchart TD
    A[Customer Query] --> B{Triage Agent};
    B --> C{Specialist Agent};
    C --> D{Perform Action};
    D --> E{Access CRM/API/DB};
    E --> F{Gather Information};
    F --> G{Formulate Response};
    G --> H[Send Response to Customer];
    D --> I{Browser Automation};
    I --> J[Log into Internal Dashboards];
    J --> K[Execute Actions];
    K --> G;
    E --> L[Update CRM/API/DB];
    L --> G;
    M[New Agent Creation] --> B;
    N[Action Creation] --> C;
    O[Integration Setup] --> E;
    P[MCP Integration] --> E;
```

### Roles & org

```mermaid
flowchart TB
    A[Founder/Product Lead] --> B(Product Team);
    B --> C(Engineering Team);
    C --> D(AI Agents);
    A --> E(Sales/Customer Success);
    E --> F(Customers);
    B --> G(Customer Support Agents - Human);
    G --> H{Agent Configuration & Oversight};
    H --> B;
```

### Practice map

```mermaid
mindmap
  root((Gurusup))
    AI Agents
      Action Execution
      CRM Integration
      API Interaction
      Browser Automation
    Customer Support
      End-to-End Resolution
      Real-time Responses
      Multi-channel Support (Email, WhatsApp)
    Product Development
      Agile & Iterative
      Rapid Prototyping
      Model Agnostic Approach
      Focus on Problem Solving
    Technology
      LLMs (GPT-4o, GPT-4)
      MCPs (Model Communication Protocols)
      Agent Orchestration
      Data Normalization
    Business Model
      Subscription/Per-response
      Focus on Cost Reduction
      Scalability
```

### Key moves

- **Agent-based action execution:** Gurusup's AI agents can perform actions within internal systems (CRM, databases) rather than just providing information.
- **MCP integration:** The use of Model Communication Protocols (MCPs) significantly speeds up integration with various third-party applications and internal systems.
- **Iterative development and pivoting:** The company has demonstrated a willingness to discard previous approaches and rebuild to adapt to technological advancements and market needs.
- **Focus on ease of use:** Despite the complexity of the underlying technology, Gurusup aims to provide a simple interface for configuring and managing AI agents and actions.

[Episode notes](../episodes/gestionamos-500-000-tickets-con-agentes-de-ia-product-demo-de-gurusup--pEj3I-sZhs4.md)
