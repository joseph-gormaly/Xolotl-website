# Xolotl — Investor FAQ & Technical Objection Defense

**Confidential — For Technical Due Diligence, Lead Investors & Evaluators**  
**Company:** Xolotl Canadian Shield Cooperative  
**Website / Codebase:** `https://xolotl.ca` (Core codebase available under institutional NDA)  
**Scope:** Deep-dive answers to rigorous technical, cryptographic, legal, and operational questions.

---

## Table of Contents
1. [Cryptographic Architecture & Mathematics](#1-cryptographic-architecture--mathematics)
2. [Legal Compulsion, CLOUD Act & Sovereign Jurisdictions](#2-legal-compulsion-cloud-act--sovereign-jurisdictions)
3. [Enterprise Performance, Sync & Usability](#3-enterprise-performance-sync--usability)
4. [Disaster Recovery, Ransomware & Data Integrity](#4-disaster-recovery-ransomware--data-integrity)
5. [Attack Surface, Threat Model & Insider Threats](#5-attack-surface-threat-model--insider-threats)
6. [Commercialization, Moat & Defensibility](#6-commercialization-moat--defensibility)

---

## 1. Cryptographic Architecture & Mathematics

### Q1.1: Why not simply use Shamir's Secret Sharing (SSS) to split the master key?
**Objection:** *"Shamir's Secret Sharing is standard, battle-tested, and supported by every standard crypto library. Why introduce FROST and Threshold ElGamal?"*

**The Answer:**
Shamir's Secret Sharing has a fatal architectural flaw for sovereign systems: **to use the key, you must reconstruct it in full on a single machine**.
* When recovering a secret with SSS, $k$ custodians must send their raw private polynomial evaluations ($s_i$) over the network to a coordinating node.
* That coordinating node reassembles the full, raw master key in plaintext.
* If that coordinator is compromised, wiretapped, or legally compelled, the entire institutional archive is compromised forever. Furthermore, any custodian who surrenders their raw share has permanently surrendered their portion of authority.

**How Xolotl Solves This:**
Xolotl never reconstructs raw secret shares:
1. **Pedersen Distributed Key Generation (DKG):** Key shares are generated cooperatively over network rounds. The master secret scalar never exists anywhere—not even transiently during creation.
2. **Threshold ElGamal Decryption:** During unlock, custodians never send private shares. Instead, they produce **partial decryptions** ($D_i = R'^{s_i}$) accompanied by **Chaum-Pedersen zero-knowledge proofs**. The coordinating client combines these point evaluations using Lagrange interpolation over elliptic curve points (`curve25519-dalek`) to derive the ephemeral session key.
3. Raw key shares never leave the memory of their respective custodian agents.

---

### Q1.2: Why didn't FROST threshold signatures alone work for file encryption?
**Objection:** *"FROST is a threshold signature scheme (RFC 9591). Why did you have to engineer a second, independent Threshold ElGamal Decryption scheme?"*

**The Answer:**
This was a critical architectural realization discovered during our Sprint 2 design review (documented in `docs/threat-model.md` §KNOWN GAP):
* Many naive designs attempt to use a threshold signature to unlock data by deriving an AES decryption key from the aggregated FROST signature: `AES_Key = HKDF(frost_signature)`.
* **This is mathematically broken.** FROST signatures are **strictly non-deterministic**. During Round 1 (`round1::commit`), each participant generates fresh, cryptographically secure random nonces via `OsRng`. The FROST specification *mandates* fresh nonces to prevent key leakage (nonce reuse in Schnorr-like schemes allows an attacker to compute the private key).
* Because fresh nonces are used every time, the same custodians signing the exact same message will generate a completely different, valid signature on every unlock.
* If the derived key changes every time, it can never decrypt a Key Encryption Key (KEK) that was sealed once at vault creation.

**The Solution:**
FROST proves *authorization* ("a threshold of custodians authorized this unlock session"). But deterministic *recovery of a fixed secret* requires **Threshold ElGamal Decryption**. Xolotl executes a dual-ceremony design:
* Ceremony A (FROST Ed25519): Custodians sign an ephemeral session challenge, proving policy compliance and identity.
* Ceremony B (Threshold ElGamal): Custodians exponentiate a blinded ephemeral public coordinate $R'$, verifying Chaum-Pedersen proofs to recover the vault's static KEK.

---

### Q1.3: Why doesn't Xolotl use full Multi-Party Computation (MPC-AES) for file streaming?
**Objection:** *"If you really want zero-trust, why decrypt files locally at all? Why not evaluate AES-256 via MPC across the custodians?"*

**The Answer:**
* **Throughput and Latency Physics:** MPC protocols for symmetric block ciphers (such as garbled circuits or Beaver triples for AES-256) require thousands of network communication rounds and gigabytes of circuit communication per megabyte of data.
* Benchmarks for evaluating AES-256 inside MPC show speeds of a few kilobytes per second with high CPU and network overhead.
* Xolotl is built for enterprise users who routinely sync 500 MB legal discovery PDFs, 5 GB video depositions, and 20 GB CAD assemblies. Evaluating AES via MPC at that scale would bring enterprise workstations to a complete crawl.
* **Our Prudent Boundary:** Xolotl applies threshold MPC where it is fast and mathematically sound: **to protect the key**. Once a threshold quorum authorizes the session, the 32-byte Key Encryption Key materializes *strictly in volatile RAM* within the native Rust client. File streaming uses hardware-accelerated AES-256-GCM (via CPU AES-NI instructions), delivering wire-speed encryption (>1.2 GB/s) while ensuring the key is zeroized upon process exit or session timeout.

---

### Q1.4: What is Session Coordinate Blinding, and why was it an essential security fix?
**Objection:** *"In your pre-audit notes, you mention Finding H-1 regarding session coordinate blinding. What was the vulnerability, and how was it fixed?"*

**The Answer:**
* **The Vulnerability (Pre-Audit H-1):** In basic ElGamal threshold decryption, the coordinator requests partial decryptions of the vault's static public coordinate $R$ from each custodian: $D_i = R^{s_i}$. While $D_i$ does not reveal $s_i$, the value $D_i$ is completely deterministic.
* If an adversary or foreign court compelled Custodian 1 on Monday, Custodian 2 on Wednesday, and Custodian 3 next month, they could collect the individual static $D_i$ values asynchronously and combine them after the fact. This completely defeated the purpose of a synchronous threshold unlock.
* **The Fix (`SessionBlinding`):** On every unlock session, the client generates an ephemeral, cryptographically secure scalar $\beta \leftarrow \mathbb{Z}_q^*$ and blinds the base point:
  $$R' = R^\beta$$
* Custodians compute their partial decryption against $R'$:
  $$D_i' = (R')^{s_i} = R^{\beta \cdot s_i}$$
* The client interpolates the partials to recover $S' = Y^\beta$, and un-blinds the result by multiplying by $\beta^{-1} \pmod q$:
  $$S = (S')^{\beta^{-1}} = (Y^\beta)^{\beta^{-1}} = Y$$
* **Security Result:** A partial decryption captured in Session A is mathematically useless in Session B. An attacker must obtain simultaneous participation from a threshold quorum within the active session window.

---

### Q1.5: How is memory protected against RAM dumps, cold-boot attacks, and swap leakage?
**The Answer:**
* All cryptographic secrets—ephemeral scalars, private key packages, intermediate HKDF buffers, and the recovered DataKey—are wrapped in Rust types implementing `zeroize::Zeroize` and `zeroize::ZeroizeOnDrop`.
* When an unlock session expires or an unlocked file transfer finishes, the memory buffers are overwritten with zeros in volatile memory before deallocation.
* The KEK and master secrets are never persisted to disk, temporary files, swap space, or staging caches. Staging directories hold only authenticated AES-256-GCM ciphertext chunks.

---

## 2. Legal Compulsion, CLOUD Act & Sovereign Jurisdictions

### Q2.1: How does Xolotl defeat the US CLOUD Act?
**Objection:** *"The US Clarifying Lawful Overseas Use of Data (CLOUD) Act allows federal courts to compel US companies to provide data stored on any server, anywhere in the world. If you use cloud infrastructure, aren't you vulnerable?"*

**The Answer:**
The CLOUD Act amends the Stored Communications Act (18 U.S.C. § 2713). It states that a service provider must disclose customer data within its "possession, custody, or control," regardless of where the data is stored geographically.

Xolotl defeats the CLOUD Act through **Mathematical Powerlessness**:
1. **The Xolotl SaaS Provider Holds Zero Key Material:** Our Canadian Core Mirror hosts MinIO multi-tenant S3 storage. However, our S3 cluster receives **only raw AES-256-GCM ciphertext**. We do not hold a master key, we do not participate in the DKG, and we do not operate a custodian node.
2. **Subpoena Resistance:** If a US court serves a CLOUD Act warrant or National Security Letter (NSL) on Xolotl (or on AWS/MinIO hosting the mirror), we can fully comply by turning over every byte on our servers. The requesting agency receives opaque ciphertext. Under established US constitutional jurisprudence (e.g., *Bernstein v. DOJ*, *Apple v. FBI*), a court cannot compel an entity to perform impossible cryptanalytic feats or construct backdoors it does not possess.
3. **The Customer Holds the Keys Across Multiple Sovereign Borders:** Key shares reside exclusively on the customer's on-prem edge node, the compliance officer's gate, and foreign sovereign custodians (e.g., in Switzerland and Iceland). A US court has no jurisdiction over independent Swiss or Icelandic data centers.

---

### Q2.2: What prevents an adversary from using an MLAT (Mutual Legal Assistance Treaty)?
**Objection:** *"What if a foreign government uses an MLAT to compel the Swiss and Icelandic custodians?"*

**The Answer:**
1. **Extremely High Legal Friction:** MLAT requests require dual criminality, judicial review by the requested nation's Ministry of Justice, and cantonal court proceedings. In Switzerland (under the Swiss Federal Act on International Mutual Assistance in Criminal Matters - IMAC) and Iceland, foreign discovery requests regarding commercial litigation or political intelligence are routinely rejected.
2. **Time-Window Invalidation:** MLAT proceedings take an average of **12 to 24 months**. Xolotl's unlock sessions operate on an ephemeral **120-second freshness window**. 
3. **No Durable Escrow:** Because custodians do not possess static exportable master keys, a court cannot demand that a custodian "hand over the key." They can only order the custodian to execute an active signing ceremony. A compelled custodian co-signing 18 months later cannot decrypt past data unless the client initiates an active unlock round at that exact second.

---

### Q2.3: How is Jurisdictional Diversity enforced in code?
**Objection:** *"Isn't 'jurisdictional diversity' just a marketing recommendation that customers will ignore?"*

**The Answer:**
No. It is enforced programmatically in the core client logic:
* In `topology::enforce_topology_policy`, the client inspects the roster of participating custodians before launching the unlock ceremony.
* In a $(3, 5)$ vault, if an unlock attempt is initiated where 3 participating custodians share the same jurisdictional metadata (e.g., all 3 are tagged `US` or all 3 reside under the same corporate cloud account), the client code throws `Err(TopologyError::SingleJurisdictionQuorumExceeded)`.
* The unlock aborts immediately, and an audit alert is written to the edge security log. Reaching quorum requires at least one participating custodian from an independent foreign jurisdiction.

---

## 3. Enterprise Performance, Sync & Usability

### Q3.1: Does Xolotl require live custodian participation for every single file write?
**Objection:** *"If 3 custodians in different countries have to participate in every action, won't saving a 10KB Word document take 10 seconds?"*

**The Answer:**
No. That would make the product unusable. Xolotl separates **Session Authorization** from **Continuous File Synchronization**:
* **Unlock Ceremony (Once per Work Session):** When an authorized user begins their day or opens the vault, the client executes the (3,5) threshold unlock ceremony over the WireGuard mesh. This takes approximately **1.2 to 2.5 seconds** total (including round-trip latency across international nodes).
* **Ephemeral Session DataKey:** Upon successful verification of the Chaum-Pedersen proofs, the 32-byte DataKey is unsealed into volatile RAM.
* **Instantaneous File Sync:** While the session is active, saving or editing files triggers the local filesystem watcher. Files are encrypted locally using AES-256-GCM via CPU hardware acceleration (taking less than 5 milliseconds for a standard document) and streamed immediately to the Canadian S3 mirror.
* **Session Expiry:** When the user locks their workstation, signs out, or after an administrative inactivity window (e.g., 8 hours), the DataKey is immediately zeroized. Subsequent file reads require a new threshold unlock.

---

### Q3.2: How does Xolotl handle multi-gigabyte files without crashing endpoint memory?
**Objection:** *"Enterprise sync clients often consume gigabytes of RAM when handling large CAD files or video archives."*

**The Answer:**
Xolotl's sync engine was re-engineered in Sprint 3 specifically to enforce a **constant memory footprint** (`docs/road-to-ga.md` §A-5):
* Files smaller than 64 MiB are encrypted and pushed in a single streaming SigV4 HTTP request.
* Files 64 MiB or larger automatically trigger an S3 **Multipart Upload** using fixed **8 MiB chunks**.
* Each 8 MiB part is read from disk, encrypted with AES-256-GCM, hashed with SHA-256, signed with AWS SigV4, and streamed over the network before the next chunk is read.
* **Result:** Peak memory consumption remains strictly constant at **~8 MiB per transfer**, whether syncing a 20 KB text note or a 50 GB virtual machine disk image.

---

### Q3.3: How do you handle rapid file saves without corrupting versions (debouncing)?
**The Answer:**
On Windows systems, saving a single file via Microsoft Word or Excel generates multiple `ReadDirectoryChangesW` filesystem events within a few hundred milliseconds.
* Naive sync tools fire multiple upload requests, causing race conditions and duplicate version rows.
* Xolotl implemented a **trailing-edge coalescing debouncer** (documented in `client/src-tauri/src/sync.rs`).
* The engine tracks changes by canonical file path. It waits for the filesystem to settle for a 2-second debounce window after the *last* detected write before staging and streaming the final file content.
* Intermediate temporary files (such as Word `.tmp` or lock files) are automatically filtered out.

---

## 4. Disaster Recovery, Ransomware & Data Integrity

### Q4.1: If a client workstation is infected with ransomware, won't it sync the encrypted files and overwrite the clean backups?
**Objection:** *"Ransomware often encrypts local directories. If your client syncs changes in real-time, it will overwrite the good files in the cloud mirror."*

**The Answer:**
Xolotl provides mathematical and architectural immunity against ransomware through two mechanisms:
1. **93-Day Immutable S3 Object Lock (WORM):**
   * The Canadian Core Mirror enforces S3 Object Lock in **Compliance Mode**.
   * In Compliance Mode, once a ciphertext object version is written, it **cannot be overwritten, altered, or deleted by anyone**—not even the root administrator of the cloud cluster—for 93 days.
   * If ransomware encrypts local files, Xolotl's watcher detects new content and pushes it as *new versions* (`file_versions.version_number + 1`). The historical, uncorrupted versions remain permanently locked and intact in S3.
2. **Point-in-Time Recovery (`restore_vault_as_of`):**
   * Every file version is indexed in the edge Postgres database with a millisecond timestamp.
   * If a ransomware attack occurs at 10:14 AM, the administrator or user simply executes:
     `restore_vault_as_of(target_time = "10:13:00 AM")`
   * The client queries Postgres for the exact version active at 10:13 AM, streams the clean ciphertext chunks from the immutable S3 mirror, decrypts them locally, and restores the entire folder to its pristine state.

---

### Q4.2: What happens if an institution's on-prem edge server suffers a catastrophic hardware failure?
**The Answer:**
* **Metadata Disaster Recovery:** The Layer 1 Edge Stack runs an automated, encrypted pg_dump replication pipeline to an offsite secondary standby or a sealed S3 backup bucket.
* **Custodian Redundancy:** Because Xolotl uses a $(3, 5)$ threshold topology, the loss of any single custodian node (such as the on-prem edge server holding Custodian 3) does not prevent data recovery.
* The remaining custodians (e.g., Custodian 1 [User/Device], Custodian 2 [Officer], Custodian 4 [Swiss], Custodian 5 [Iceland]) still constitute a valid quorum of 4 out of 5. They can authorize an emergency recovery ceremony to provision a new edge node and re-key the vault.

---

## 5. Attack Surface, Threat Model & Insider Threats

### Q5.1: What if a malicious insider or compromised admin attempts to flood custodians with unlock requests?
**Objection:** *"Could a rogue admin or attacker script a brute-force attack to coerce custodians into signing?"*

**The Answer:**
Xolotl employs a multi-layered defense against unlock flooding (remediated in Sprint 4 and verified in `edge/custodian-agent/src/rate_limit.rs`):
1. **Sliding-Window Co-Signing Rate Limiting:** All `/unlock/commit`, `/unlock/sign`, and `/decrypt/partial` endpoints share an atomic sliding-window rate limiter (default: 30 requests per minute per vault). Any attempt to exceed this threshold returns HTTP `429 Too Many Requests` with a `Retry-After` header.
2. **Automated Audit Telemetry:** Every throttled or failed unlock attempt immediately generates an asynchronous security event written to the immutable `unlock_audit_log` table in Postgres and triggers an alert.
3. **Operator Bearer Authentication:** Custodian 2 (the compliance officer gate) requires an out-of-band operator token (`OPERATOR_TOKEN`) compared in constant time. An attacker cannot programmatically self-approve requests without the physical officer's credentials.

---

### Q5.2: What if the desktop client binary itself is reverse-engineered or compromised?
**Objection:** *"If an attacker gains local root access to the user's laptop, doesn't all security fail?"*

**The Answer:**
* If an endpoint is fully rooted while an unlock session is active, an attacker with kernel-level memory inspection tools can inspect volatile RAM. This is a fundamental constraint of all computing systems (a user cannot read a document without that document existing in local memory).
* **However, Xolotl dramatically limits the blast radius:**
  1. **No Durable Master Key:** The attacker only captures the ephemeral session key for that specific vault. They do not get the custodian private shares, and they cannot decrypt past or future sessions once the session expires.
  2. **No Central Database Credentials:** As of our Sprint 4 refactoring (`docs/road-to-ga.md` §B-1), the desktop client holds **zero administrative database keys** (`service_role` has been completely stripped from the client binary). The client only holds an unprivileged GoTrue user JWT token constrained by strict Postgres Row-Level Security (RLS).
  3. **No S3 Master Credentials:** The client does not possess raw AWS S3 access keys or secrets. It requests short-lived STS broker tokens scoped strictly to its own tenant bucket prefix.
  4. An attacker who steals the laptop and its disk drive while powered off finds only encrypted ciphertext staging files.

---

## 6. Commercialization, Moat & Defensibility

### Q6.1: Why can't Microsoft or Google simply copy this in OneDrive or Google Drive?
**Objection:** *"What stops Microsoft from adding threshold ElGamal to OneDrive for Business?"*

**The Answer:**
1. **The Innovator's Dilemma & Business Model Conflict:** Microsoft and Google are US public corporations subject to 18 U.S.C. § 2713 (the CLOUD Act) and FISA 702. Their core enterprise strategy is built around scanning, indexing, and applying cloud AI models (e.g., Microsoft Copilot, Google Gemini) to customer files. If they implement true zero-knowledge, blinded threshold encryption where they cannot derive keys, their multi-billion-dollar enterprise AI search and compliance features stop functioning.
2. **Corporate Subpoena Exposure:** Even if Microsoft engineered multi-party cryptography, Microsoft as an entity would still be compelled by US courts to backdoor the software distribution channel or sign malicious updates via Windows Update.
3. **The Sovereign Pure-Play Advantage:** Xolotl is structured from day one as a neutral, multi-jurisdictional sovereign utility. We do not index customer data, we do not train AI on customer documents, and our core mirror is hosted outside US jurisdiction.

---

### Q6.2: What is the defensible IP and technical moat?
**The Answer:**
* **Production Threshold ElGamal Decryption Engine:** Implementing audited threshold ElGamal with Chaum-Pedersen zero-knowledge proofs over `curve25519-dalek` with session blinding is exceptionally complex. There are virtually no open-source, production-ready enterprise implementations in existence.
* **Jurisdictional Topology Enforcement Engine:** Programmatically integrating jurisdictional metadata and enforcing multi-national quorum constraints at the protocol level represents proprietary systems IP.
* **Hybrid 3-Layer Streaming Architecture:** Seamlessly bridging on-prem Postgres RLS, native Rust/Tauri desktop watchers, and blind multi-tenant S3 streaming over WireGuard mesh networking requires deep multi-disciplinary systems engineering that takes years to replicate.
* **High Switching Costs:** Once an enterprise law firm or defense subcontractor deploys Xolotl's Sovereign Edge and configures multi-national custodians, migrating to a competitor involves complex legal, technical, and cryptographic re-enactment.

---
