# Xolotl Canadian Shield Cooperative — Fundraising, Investor & Web Materials

**Official Domain:** [xolotl.ca](https://xolotl.ca)  
**Hosting:** GitHub Pages (`gh-pages` deployment from `PITCH/`)  
**Entity:** Xolotl Canadian Shield Cooperative  

Welcome to the public web and investor materials package for the **Xolotl Canadian Shield Cooperative**.

Xolotl is a **zero-trust, hybrid sovereign edge file-synchronization platform** designed for institutions (legal, defense, healthcare, wealth management, critical infrastructure) and sovereign entities that require absolute data confidentiality and immunity against single-party legal compulsion.

---

## Directory Index

| Document | Purpose | Target Audience |
|---|---|---|
| [**index.html**](index.html) | Modern, responsive landing page for **xolotl.ca** with interactive threat simulator, architecture visualizer, and PITR slider. | Public, Enterprise Leads, Institutional Design Partners |
| [**deck.html**](deck.html) | Standalone interactive 14-slide investor presentation player with Web Speech API voice narration, live closed captions, and video telemetry. | Investors, Evaluators, Sovereign Partners |
| [**assets/**](assets/) | Fine-art imagery (granite bedrock, twilight sky, Xólotl mythos) & architectural MP4 videos (WireGuard radar, DKG ceremony, WORM rollback). | Static Web Assets |
| [**CNAME**](CNAME) | GitHub Pages custom domain routing file (`xolotl.ca`). | GitHub Pages DNS Deployment |
| [**robots.txt**](robots.txt) | Search engine indexing directives protecting internal and markdown documents. | Web Crawlers, SEO (Googlebot, Bingbot) |
| [**sitemap.xml**](sitemap.xml) | Clean XML sitemap covering canonical routes (`xolotl.ca`, `deck.html`). | Search Engines, SEO Indexing |
| [**EXECUTIVE_SUMMARY.md**](EXECUTIVE_SUMMARY.md) | 2-page investment memo covering problem, solution, cryptographic moat, traction, and financing ask. | VCs, Angel Syndicates, Family Offices, Grant Evaluators |
| [**PITCH_DECK.md**](PITCH_DECK.md) | Full 14-slide presentation script with slide copy, visual diagrams, talking points, and anticipated audience questions. | Seed Pitch Meetings, Demo Days, Partner Presentations |
| [**INVESTOR_FAQ_AND_OBJECTIONS.md**](INVESTOR_FAQ_AND_OBJECTIONS.md) | Deep technical, legal, and operational FAQ addressing hard questions on cryptography, CLOUD Act resistance, and disaster recovery. | Technical Due Diligence Teams, Cryptographers, Lead Investors |
| **Data Room (Under NDA)** | Detailed 18-month pro-forma financial model, sovereign grant funding roadmap, and cryptographic audit RFP. | Qualified Institutional Investors (via `coop@xolotl.ca`) |

---

## Core Value Proposition At A Glance

```
                                  +---------------------------------------+
                                  |    Layer 3: Canadian Core Mirror      |
                                  |  - MinIO Multi-Tenant Object Lock     |
                                  |  - Ciphertext-only (Zero Shards Ever) |
                                  |  - Powerless to Comply with Subpoenas |
                                  +---------------------------------------+
                                                     ^
                                            SigV4    | Streaming
                                           Ciphertext| Encrypted PUT/GET
                                                     v
+------------------------+        Mesh Transport     +------------------------+
|  Layer 2: Tauri Client | <=======================> |  Layer 1: Edge Stack   |
|  - AES-256-GCM Stream  |      (WireGuard/Headscale)|  - On-Prem Postgres/RLS|
|  - FROST Coordinator   |                           |  - GoTrue Auth / Nginx |
|  - Ephemeral Memory KEK|                           |  - Custodian Agent 3   |
+------------------------+                           +------------------------+
         |                                                       |
         | (FROST / Threshold ElGamal Rounds)                    |
         v                                                       v
+------------------------+                           +------------------------+
| Custodian 2 (Officer)  |                           | Custodians 4 & 5       |
| - Approval Gate CLI    |                           | - Cross-Jurisdiction   |
| - Network Isolated     |                           |   (Swiss / EU / IS)    |
+------------------------+                           +------------------------+
```

1. **Institutions get a "OneDrive-like" experience** — Instant drop-in file sync, point-in-time rollbacks, file-level ACLs, and desktop native integration.
2. **True Zero-Trust & Blind SaaS** — The company operating the core backup mirror never receives, derives, or touches a usable fraction of the decryption key.
3. **Legal Blast-Radius Immunity** — Key material is partitioned via **Pedersen DKG + FROST threshold signatures + Threshold ElGamal decryption**. Under the enforced (3,5) topology, no single jurisdiction holds a quorum. Even a legally compelled, fully cooperative entity cannot produce plaintext or a durable decryption key.
4. **Proven, Validated Codebase** — Not whitepaper vaporware: real passing live-integration tests across Dockerized Headscale mesh, Postgres RLS, MinIO S3 streaming, and audited Ed25519 threshold crypto with AI security review remediations completed.

---

## Suggested Fundraising Target

* **Primary Ask:** **$1,250,000 Seed Round** (Equity / SAFE)
* **Non-Dilutive Target:** **$250,000 – $400,000** (Sovereign Tech Fund / EU Horizon / NRC IRAP)
* **Runway:** 18 months to General Availability (GA), 15 enterprise pilots, and $1.2M ARR.
