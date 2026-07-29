# Diagrama de arquitectura de RetroGarage

Este diagrama representa los tres proyectos, la base de datos compartida y
los servicios externos utilizados por el sistema.

```mermaid
flowchart LR
    U["Usuarios<br/>Administrador y colaboradores"]

    subgraph FRONT["RetroGarageAPP"]
        APP["Aplicación web/móvil<br/>Expo + React Native<br/>Puerto 8081"]
    end

    subgraph BACK["RetroGarageAPIs"]
        API["API principal REST<br/>Node.js + Express<br/>Puerto 3001"]
        BANK["Simulador bancario<br/>Tarjeta y SINPE Móvil"]
        AUDIT["Auditoría del sistema"]

        API --> BANK
        API --> AUDIT
    end

    subgraph SIM["RetroGarageSimulaciones"]
        FAST["API de simulaciones REST<br/>Python + FastAPI<br/>Puerto 8000"]
        TSE["Consulta simulada TSE"]
        PARTNERS["Servicios de socios<br/>Proveedores, aseguradoras,<br/>grúas y alquileres"]
        COMMERCIAL["API comercial pública<br/>Servicios, productos,<br/>agenda y cotizaciones"]

        FAST --> TSE
        FAST --> PARTNERS
        FAST --> COMMERCIAL
    end

    DB[("SQL Server<br/>Base de datos RetroGarage<br/>Puerto 1433")]

    PAYPAL["PayPal API<br/>Sandbox / Live"]
    HACIENDA["API Hacienda / BCCR<br/>Tipo de cambio"]
    SMTP["Servidor SMTP<br/>Recuperación de contraseña"]
    CLIENT["Sistemas de otros comercios"]

    U -->|"Interfaz gráfica"| APP

    APP -->|"HTTP REST / JSON<br/>localhost:3001/api"| API
    APP -->|"HTTP REST / JSON<br/>localhost:8000"| FAST

    API -->|"Consultas y transacciones SQL"| DB
    FAST -->|"Consultas SQL"| DB

    API -->|"OAuth 2.0 + Orders API<br/>Pagos PayPal"| PAYPAL
    API -->|"HTTPS GET<br/>Referencia para Tarjeta y SINPE"| HACIENDA
    API -->|"SMTP<br/>Correo de recuperación"| SMTP

    CLIENT -->|"HTTP REST / JSON<br/>/api/comercial/v1"| COMMERCIAL

    classDef frontend fill:#dbeafe,stroke:#2563eb,color:#0f172a,stroke-width:2px;
    classDef backend fill:#dcfce7,stroke:#16a34a,color:#0f172a,stroke-width:2px;
    classDef simulation fill:#fef3c7,stroke:#d97706,color:#0f172a,stroke-width:2px;
    classDef database fill:#cffafe,stroke:#0891b2,color:#0f172a,stroke-width:2px;
    classDef external fill:#f3e8ff,stroke:#9333ea,color:#0f172a,stroke-width:2px;
    classDef actor fill:#f8fafc,stroke:#475569,color:#0f172a,stroke-width:2px;

    class APP frontend;
    class API,BANK,AUDIT backend;
    class FAST,TSE,PARTNERS,COMMERCIAL simulation;
    class DB database;
    class PAYPAL,HACIENDA,SMTP external;
    class U,CLIENT actor;
```

## Lectura del diagrama

- `RetroGarageAPP` es el frontend que utiliza el usuario.
- El frontend se comunica mediante HTTP y JSON con la API principal en el
  puerto `3001`.
- Para las consultas simuladas de TSE y socios, el frontend también consume
  directamente la API FastAPI del puerto `8000`.
- Las dos APIs consultan la misma base de datos SQL Server `RetroGarage`.
- La API principal contiene el simulador bancario de Tarjeta y SINPE.
- La API principal se comunica externamente con PayPal, Hacienda/BCCR y el
  servidor de correo.
- La API comercial de FastAPI permite que otro comercio consulte información
  pública de RetroGarage.
