# Tinybird

> Tinybird deleted the PM layer so technical leads own product decisions for a developer audience that rejects classic PM mediation.

- Stage: enterprise
- Practices: enterprise, discovery, delivery, org_shape

## Javi Santana

### Operating loop

```mermaid
flowchart TD
    A[Developers ingest data into Tinybird] --> B{Data is usable and productized};
    B --> C[Developers build data products];
    C --> D[Expose data endpoints for applications];
    D --> E[Analyze product usage and identify issues];
    E --> F[Team leads make product decisions];
    F --> A;
```

### Ownership

- **Discovery:** Technical team leads — no separate PM layer mediating for a developer audience.
- **Prioritization:** Same leads; product decisions sit with people who ship the data platform.
- **Shipping:** Engineering teams with full product responsibility (“eliminated the product team to be all product”).
- **Sales / GTM:** Enterprise motion exists; how deals reshape the roadmap is not a named owner in the interview.
- **Design:** Not a classic design-org bet — the product is developer-facing APIs and endpoints.

### Evidence

- *We eliminated the product team to be all product.*
- *The interesting part of Tinybird is that it's not a tool to just analyze data; it's a tool where data analysis is productized.*

[Source](../episodes/eliminamos-al-equipo-de-producto-para-ser-todos-producto-javi-santana--qMEVsemCo5c.md)
