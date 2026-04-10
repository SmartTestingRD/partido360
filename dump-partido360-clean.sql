--
-- PostgreSQL database dump
--

-- Dumped from database version 17.8 (a48d9ca)
-- Dumped by pg_dump version 17.0

-- Started on 2026-04-06 12:30:27

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- TOC entry 9 (class 2615 OID 500530)
-- Name: partido360; Type: SCHEMA; Schema: -; Owner: postgres
--



ALTER SCHEMA partido360 OWNER TO postgres;

--
-- TOC entry 1160 (class 1247 OID 650050)
-- Name: ConfidenceLevel; Type: TYPE; Schema: partido360; Owner: postgres
--

CREATE TYPE partido360."ConfidenceLevel" AS ENUM (
    'HIGH',
    'MEDIUM',
    'LOW',
    'STALE',
    'MANUAL',
    'UNKNOWN'
);


ALTER TYPE partido360."ConfidenceLevel" OWNER TO postgres;

--
-- TOC entry 1163 (class 1247 OID 650064)
-- Name: MarketDataProvider; Type: TYPE; Schema: partido360; Owner: postgres
--

CREATE TYPE partido360."MarketDataProvider" AS ENUM (
    'COINGECKO',
    'BINANCE',
    'KRAKEN',
    'COINBASE',
    'MANUAL',
    'ROUTED_SYNTHETIC'
);


ALTER TYPE partido360."MarketDataProvider" OWNER TO postgres;

--
-- TOC entry 1157 (class 1247 OID 650038)
-- Name: PricingStrategy; Type: TYPE; Schema: partido360; Owner: postgres
--

CREATE TYPE partido360."PricingStrategy" AS ENUM (
    'DIRECT_FIAT',
    'STABLECOIN_PEG',
    'CROSS_RATE',
    'MANUAL_ONLY',
    'NOT_PRICED'
);


ALTER TYPE partido360."PricingStrategy" OWNER TO postgres;

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- TOC entry 330 (class 1259 OID 650117)
-- Name: AssetManualPriceOverride; Type: TABLE; Schema: partido360; Owner: postgres
--

CREATE TABLE partido360."AssetManualPriceOverride" (
    id text NOT NULL,
    "canonicalAssetId" text NOT NULL,
    "manualPriceUsd" numeric(18,8) NOT NULL,
    reason text,
    "validFrom" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "validUntil" timestamp(3) without time zone,
    "createdBy" text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE partido360."AssetManualPriceOverride" OWNER TO postgres;

--
-- TOC entry 328 (class 1259 OID 650097)
-- Name: AssetPriceSnapshot; Type: TABLE; Schema: partido360; Owner: postgres
--

CREATE TABLE partido360."AssetPriceSnapshot" (
    id text NOT NULL,
    "canonicalAssetId" text NOT NULL,
    provider partido360."MarketDataProvider" NOT NULL,
    "providerSymbolOrPair" text,
    "priceUsd" numeric(18,8) NOT NULL,
    "confidenceLevel" partido360."ConfidenceLevel" NOT NULL,
    "isStale" boolean DEFAULT false NOT NULL,
    "fetchedAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "rawPayload" jsonb,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE partido360."AssetPriceSnapshot" OWNER TO postgres;

--
-- TOC entry 327 (class 1259 OID 650088)
-- Name: AssetPriceSourceMapping; Type: TABLE; Schema: partido360; Owner: postgres
--

CREATE TABLE partido360."AssetPriceSourceMapping" (
    id text NOT NULL,
    "canonicalAssetId" text NOT NULL,
    provider partido360."MarketDataProvider" NOT NULL,
    "externalIdentifier" text NOT NULL,
    metadata jsonb,
    "isPrimary" boolean DEFAULT false NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE partido360."AssetPriceSourceMapping" OWNER TO postgres;

--
-- TOC entry 329 (class 1259 OID 650107)
-- Name: AssetValuationSnapshot; Type: TABLE; Schema: partido360; Owner: postgres
--

CREATE TABLE partido360."AssetValuationSnapshot" (
    id text NOT NULL,
    "walletAccountId" text,
    "canonicalAssetId" text NOT NULL,
    quantity numeric(18,8) NOT NULL,
    "resolvedPriceUsd" numeric(18,8) NOT NULL,
    "estimatedValueUsd" numeric(18,8) NOT NULL,
    "priceSnapshotId" text,
    "valuationStatus" text NOT NULL,
    "confidenceLevel" partido360."ConfidenceLevel" NOT NULL,
    "isStale" boolean DEFAULT false NOT NULL,
    "valuedAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE partido360."AssetValuationSnapshot" OWNER TO postgres;

--
-- TOC entry 326 (class 1259 OID 650077)
-- Name: CanonicalAsset; Type: TABLE; Schema: partido360; Owner: postgres
--

CREATE TABLE partido360."CanonicalAsset" (
    id text NOT NULL,
    "internalAssetCode" text NOT NULL,
    "displaySymbol" text NOT NULL,
    chain text,
    "contractAddress" text,
    decimals integer DEFAULT 18 NOT NULL,
    "isStablecoin" boolean DEFAULT false NOT NULL,
    "pricingStrategy" partido360."PricingStrategy" DEFAULT 'DIRECT_FIAT'::partido360."PricingStrategy" NOT NULL,
    "coingeckoId" text,
    "binanceSymbol" text,
    "krakenPair" text,
    "coinbaseBase" text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE partido360."CanonicalAsset" OWNER TO postgres;

--
-- TOC entry 331 (class 1259 OID 650126)
-- Name: PricingState; Type: TABLE; Schema: partido360; Owner: postgres
--

CREATE TABLE partido360."PricingState" (
    "canonicalAssetId" text NOT NULL,
    "lastPricedAt" timestamp(3) without time zone,
    "lastStatus" text,
    "lastError" text,
    "freshnessSeconds" integer DEFAULT 300 NOT NULL,
    "staleAfterSeconds" integer DEFAULT 3600 NOT NULL,
    "sourceUsed" partido360."MarketDataProvider",
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE partido360."PricingState" OWNER TO postgres;

--
-- TOC entry 283 (class 1259 OID 500724)
-- Name: asignaciones; Type: TABLE; Schema: partido360; Owner: postgres
--

CREATE TABLE partido360.asignaciones (
    asignacion_id uuid DEFAULT gen_random_uuid() NOT NULL,
    lider_id uuid NOT NULL,
    persona_id uuid NOT NULL,
    fecha_asignacion timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    fuente_id uuid,
    estado_asignacion_id uuid NOT NULL
);


ALTER TABLE partido360.asignaciones OWNER TO postgres;

--
-- TOC entry 286 (class 1259 OID 500804)
-- Name: bitacora_cambios; Type: TABLE; Schema: partido360; Owner: postgres
--

CREATE TABLE partido360.bitacora_cambios (
    cambio_id uuid DEFAULT gen_random_uuid() NOT NULL,
    entidad character varying(100) NOT NULL,
    entidad_id character varying(50) NOT NULL,
    accion character varying(50) NOT NULL,
    detalle text,
    usuario_id uuid NOT NULL,
    fecha timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE partido360.bitacora_cambios OWNER TO postgres;

--
-- TOC entry 279 (class 1259 OID 500614)
-- Name: candidatos; Type: TABLE; Schema: partido360; Owner: postgres
--

CREATE TABLE partido360.candidatos (
    candidato_id uuid DEFAULT gen_random_uuid() NOT NULL,
    nombre character varying(100) NOT NULL,
    partido character varying(100),
    activo boolean DEFAULT true,
    fecha_creacion timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    descripcion text
);


ALTER TABLE partido360.candidatos OWNER TO postgres;

--
-- TOC entry 287 (class 1259 OID 500818)
-- Name: duplicados_detectados; Type: TABLE; Schema: partido360; Owner: postgres
--

CREATE TABLE partido360.duplicados_detectados (
    duplicado_id uuid DEFAULT gen_random_uuid() NOT NULL,
    persona_id uuid NOT NULL,
    motivo character varying(255) NOT NULL,
    fecha timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    estado_revision character varying(50) DEFAULT 'pendiente'::character varying NOT NULL,
    resuelto_por_usuario_id uuid,
    fecha_resolucion timestamp with time zone,
    comentario_resolucion text
);


ALTER TABLE partido360.duplicados_detectados OWNER TO postgres;

--
-- TOC entry 274 (class 1259 OID 500567)
-- Name: estado_asignacion; Type: TABLE; Schema: partido360; Owner: postgres
--

CREATE TABLE partido360.estado_asignacion (
    estado_asignacion_id uuid DEFAULT gen_random_uuid() NOT NULL,
    nombre character varying(50) NOT NULL,
    activo boolean DEFAULT true
);


ALTER TABLE partido360.estado_asignacion OWNER TO postgres;

--
-- TOC entry 276 (class 1259 OID 500585)
-- Name: estado_evento; Type: TABLE; Schema: partido360; Owner: postgres
--

CREATE TABLE partido360.estado_evento (
    estado_evento_id uuid DEFAULT gen_random_uuid() NOT NULL,
    nombre character varying(50) NOT NULL,
    activo boolean DEFAULT true
);


ALTER TABLE partido360.estado_evento OWNER TO postgres;

--
-- TOC entry 273 (class 1259 OID 500558)
-- Name: estado_lider; Type: TABLE; Schema: partido360; Owner: postgres
--

CREATE TABLE partido360.estado_lider (
    estado_lider_id uuid DEFAULT gen_random_uuid() NOT NULL,
    nombre character varying(50) NOT NULL,
    activo boolean DEFAULT true
);


ALTER TABLE partido360.estado_lider OWNER TO postgres;

--
-- TOC entry 272 (class 1259 OID 500549)
-- Name: estado_persona; Type: TABLE; Schema: partido360; Owner: postgres
--

CREATE TABLE partido360.estado_persona (
    estado_persona_id uuid DEFAULT gen_random_uuid() NOT NULL,
    nombre character varying(50) NOT NULL,
    activo boolean DEFAULT true
);


ALTER TABLE partido360.estado_persona OWNER TO postgres;

--
-- TOC entry 278 (class 1259 OID 500605)
-- Name: estado_usuario; Type: TABLE; Schema: partido360; Owner: postgres
--

CREATE TABLE partido360.estado_usuario (
    estado_usuario_id uuid DEFAULT gen_random_uuid() NOT NULL,
    nombre character varying(50) NOT NULL,
    activo boolean DEFAULT true
);


ALTER TABLE partido360.estado_usuario OWNER TO postgres;

--
-- TOC entry 284 (class 1259 OID 500753)
-- Name: eventos; Type: TABLE; Schema: partido360; Owner: postgres
--

CREATE TABLE partido360.eventos (
    evento_id uuid DEFAULT gen_random_uuid() NOT NULL,
    nombre character varying(150) NOT NULL,
    fecha timestamp with time zone NOT NULL,
    sector_id uuid NOT NULL,
    descripcion text,
    estado_evento_id uuid NOT NULL,
    creado_por_usuario_id uuid,
    candidato_id uuid NOT NULL,
    fecha_creacion timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE partido360.eventos OWNER TO postgres;

--
-- TOC entry 271 (class 1259 OID 500540)
-- Name: fuentes_captacion; Type: TABLE; Schema: partido360; Owner: postgres
--

CREATE TABLE partido360.fuentes_captacion (
    fuente_id uuid DEFAULT gen_random_uuid() NOT NULL,
    nombre character varying(100) NOT NULL,
    activo boolean DEFAULT true,
    descripcion text
);


ALTER TABLE partido360.fuentes_captacion OWNER TO postgres;

--
-- TOC entry 282 (class 1259 OID 500687)
-- Name: lideres; Type: TABLE; Schema: partido360; Owner: postgres
--

CREATE TABLE partido360.lideres (
    lider_id uuid DEFAULT gen_random_uuid() NOT NULL,
    persona_id uuid NOT NULL,
    meta_cantidad integer DEFAULT 10 NOT NULL,
    codigo_lider character varying(50),
    fecha_inicio timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    estado_lider_id uuid NOT NULL,
    nivel_lider_id uuid NOT NULL,
    lider_padre_id uuid,
    candidato_id uuid NOT NULL
);


ALTER TABLE partido360.lideres OWNER TO postgres;

--
-- TOC entry 289 (class 1259 OID 589831)
-- Name: militancia; Type: TABLE; Schema: partido360; Owner: postgres
--

CREATE TABLE partido360.militancia (
    militancia_id uuid DEFAULT gen_random_uuid() NOT NULL,
    persona_id uuid NOT NULL,
    candidato_id uuid,
    estado character varying(50) DEFAULT 'Activo'::character varying,
    numero_carnet character varying(50),
    fecha_afiliacion date DEFAULT CURRENT_DATE,
    observaciones text,
    fecha_creacion timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE partido360.militancia OWNER TO postgres;

--
-- TOC entry 275 (class 1259 OID 500576)
-- Name: nivel_lider; Type: TABLE; Schema: partido360; Owner: postgres
--

CREATE TABLE partido360.nivel_lider (
    nivel_lider_id uuid DEFAULT gen_random_uuid() NOT NULL,
    nombre character varying(50) NOT NULL,
    activo boolean DEFAULT true
);


ALTER TABLE partido360.nivel_lider OWNER TO postgres;

--
-- TOC entry 285 (class 1259 OID 500782)
-- Name: participacion_evento; Type: TABLE; Schema: partido360; Owner: postgres
--

CREATE TABLE partido360.participacion_evento (
    participacion_id uuid DEFAULT gen_random_uuid() NOT NULL,
    evento_id uuid NOT NULL,
    persona_id uuid NOT NULL,
    asistio boolean DEFAULT false,
    comentario text,
    fecha_registro timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE partido360.participacion_evento OWNER TO postgres;

--
-- TOC entry 288 (class 1259 OID 500838)
-- Name: password_resets; Type: TABLE; Schema: partido360; Owner: postgres
--

CREATE TABLE partido360.password_resets (
    reset_id uuid DEFAULT gen_random_uuid() NOT NULL,
    usuario_id uuid NOT NULL,
    token_hash character varying(255) NOT NULL,
    expires_at timestamp with time zone NOT NULL,
    used_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE partido360.password_resets OWNER TO postgres;

--
-- TOC entry 280 (class 1259 OID 500622)
-- Name: personas; Type: TABLE; Schema: partido360; Owner: postgres
--

CREATE TABLE partido360.personas (
    persona_id uuid DEFAULT gen_random_uuid() NOT NULL,
    nombres character varying(100) NOT NULL,
    apellidos character varying(100) NOT NULL,
    cedula character varying(20),
    telefono character varying(20) NOT NULL,
    email character varying(150),
    sector_id uuid NOT NULL,
    direccion text,
    fecha_registro timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    estado_persona_id uuid NOT NULL,
    candidato_id uuid NOT NULL,
    notas text,
    mesa character varying(50),
    fuente_id uuid,
    email_contacto character varying(150)
);


ALTER TABLE partido360.personas OWNER TO postgres;

--
-- TOC entry 277 (class 1259 OID 500594)
-- Name: roles; Type: TABLE; Schema: partido360; Owner: postgres
--

CREATE TABLE partido360.roles (
    rol_id uuid DEFAULT gen_random_uuid() NOT NULL,
    nombre character varying(50) NOT NULL,
    descripcion text,
    activo boolean DEFAULT true
);


ALTER TABLE partido360.roles OWNER TO postgres;

--
-- TOC entry 270 (class 1259 OID 500531)
-- Name: sectores; Type: TABLE; Schema: partido360; Owner: postgres
--

CREATE TABLE partido360.sectores (
    sector_id uuid DEFAULT gen_random_uuid() NOT NULL,
    nombre character varying(100) NOT NULL,
    activo boolean DEFAULT true
);


ALTER TABLE partido360.sectores OWNER TO postgres;

--
-- TOC entry 281 (class 1259 OID 500650)
-- Name: usuarios; Type: TABLE; Schema: partido360; Owner: postgres
--

CREATE TABLE partido360.usuarios (
    usuario_id uuid DEFAULT gen_random_uuid() NOT NULL,
    persona_id uuid NOT NULL,
    username character varying(100),
    email_login character varying(150),
    password_hash character varying(255),
    auth_provider character varying(50) DEFAULT 'local'::character varying NOT NULL,
    rol_id uuid NOT NULL,
    estado_usuario_id uuid NOT NULL,
    candidato_id uuid,
    ultimo_login timestamp with time zone,
    fecha_creacion timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    failed_login_attempts integer DEFAULT 0,
    locked_until timestamp with time zone,
    last_login_at timestamp with time zone
);


ALTER TABLE partido360.usuarios OWNER TO postgres;

--
-- TOC entry 4226 (class 0 OID 650117)
-- Dependencies: 330
-- Data for Name: AssetManualPriceOverride; Type: TABLE DATA; Schema: partido360; Owner: postgres
--

COPY partido360."AssetManualPriceOverride" (id, "canonicalAssetId", "manualPriceUsd", reason, "validFrom", "validUntil", "createdBy", "createdAt") FROM stdin;
\.


--
-- TOC entry 4224 (class 0 OID 650097)
-- Dependencies: 328
-- Data for Name: AssetPriceSnapshot; Type: TABLE DATA; Schema: partido360; Owner: postgres
--

COPY partido360."AssetPriceSnapshot" (id, "canonicalAssetId", provider, "providerSymbolOrPair", "priceUsd", "confidenceLevel", "isStale", "fetchedAt", "rawPayload", "createdAt") FROM stdin;
\.


--
-- TOC entry 4223 (class 0 OID 650088)
-- Dependencies: 327
-- Data for Name: AssetPriceSourceMapping; Type: TABLE DATA; Schema: partido360; Owner: postgres
--

COPY partido360."AssetPriceSourceMapping" (id, "canonicalAssetId", provider, "externalIdentifier", metadata, "isPrimary", "createdAt", "updatedAt") FROM stdin;
\.


--
-- TOC entry 4225 (class 0 OID 650107)
-- Dependencies: 329
-- Data for Name: AssetValuationSnapshot; Type: TABLE DATA; Schema: partido360; Owner: postgres
--

COPY partido360."AssetValuationSnapshot" (id, "walletAccountId", "canonicalAssetId", quantity, "resolvedPriceUsd", "estimatedValueUsd", "priceSnapshotId", "valuationStatus", "confidenceLevel", "isStale", "valuedAt", "createdAt") FROM stdin;
\.


--
-- TOC entry 4222 (class 0 OID 650077)
-- Dependencies: 326
-- Data for Name: CanonicalAsset; Type: TABLE DATA; Schema: partido360; Owner: postgres
--

COPY partido360."CanonicalAsset" (id, "internalAssetCode", "displaySymbol", chain, "contractAddress", decimals, "isStablecoin", "pricingStrategy", "coingeckoId", "binanceSymbol", "krakenPair", "coinbaseBase", "createdAt", "updatedAt") FROM stdin;
\.


--
-- TOC entry 4227 (class 0 OID 650126)
-- Dependencies: 331
-- Data for Name: PricingState; Type: TABLE DATA; Schema: partido360; Owner: postgres
--

COPY partido360."PricingState" ("canonicalAssetId", "lastPricedAt", "lastStatus", "lastError", "freshnessSeconds", "staleAfterSeconds", "sourceUsed", "updatedAt") FROM stdin;
\.


--
-- TOC entry 4215 (class 0 OID 500724)
-- Dependencies: 283
-- Data for Name: asignaciones; Type: TABLE DATA; Schema: partido360; Owner: postgres
--

COPY partido360.asignaciones (asignacion_id, lider_id, persona_id, fecha_asignacion, fuente_id, estado_asignacion_id) FROM stdin;
b66eddf6-7820-4916-8ead-40b5325b4578	146db7e9-7667-4606-a416-87eedb5fb7e6	ab261845-48ed-4f9b-9ff0-e2b9fc5f0a9f	2026-04-01 16:51:54.940594+00	30f217d5-86ce-400c-8798-48b6ccea9ce2	9600d61b-af7d-427d-bb67-00b3fb3e2e49
2f9c2c32-c913-46a5-89d4-bbb341b4b1ad	146db7e9-7667-4606-a416-87eedb5fb7e6	2588d050-4e89-49a5-8785-cfdf99f478bc	2026-04-01 16:52:42.151787+00	5dcec5b5-23bf-410e-bf57-843578134b25	9600d61b-af7d-427d-bb67-00b3fb3e2e49
cdfcf518-7b0a-4aae-ab1b-02682a816f1d	7bc627af-2fc6-409a-a7d3-26faa740e730	56883a20-27d0-414f-a4b6-b641652e75a8	2026-04-01 18:21:37.149047+00	30f217d5-86ce-400c-8798-48b6ccea9ce2	9600d61b-af7d-427d-bb67-00b3fb3e2e49
336eb283-63bb-467d-b38f-755943952c51	7bc627af-2fc6-409a-a7d3-26faa740e730	82ba4737-90e9-431f-a4eb-ac50c079870e	2026-04-01 18:38:50.888175+00	5cfe4914-241b-4ac0-b72c-6927d3bfd196	9600d61b-af7d-427d-bb67-00b3fb3e2e49
586fd85a-6632-4e21-a888-7435ba796c89	7bc627af-2fc6-409a-a7d3-26faa740e730	e4c303f4-8090-4707-950d-a86cdd1e13b1	2026-04-01 18:42:36.38448+00	5dcec5b5-23bf-410e-bf57-843578134b25	9600d61b-af7d-427d-bb67-00b3fb3e2e49
aaf6d3c2-93f2-49df-a5c2-2e5e4777ba95	7bc627af-2fc6-409a-a7d3-26faa740e730	b7fbf42d-4cac-4698-965f-8b667f5d5ddb	2026-04-01 18:48:20.794365+00	5dcec5b5-23bf-410e-bf57-843578134b25	9600d61b-af7d-427d-bb67-00b3fb3e2e49
\.


--
-- TOC entry 4218 (class 0 OID 500804)
-- Dependencies: 286
-- Data for Name: bitacora_cambios; Type: TABLE DATA; Schema: partido360; Owner: postgres
--

COPY partido360.bitacora_cambios (cambio_id, entidad, entidad_id, accion, detalle, usuario_id, fecha) FROM stdin;
\.


--
-- TOC entry 4211 (class 0 OID 500614)
-- Dependencies: 279
-- Data for Name: candidatos; Type: TABLE DATA; Schema: partido360; Owner: postgres
--

COPY partido360.candidatos (candidato_id, nombre, partido, activo, fecha_creacion, descripcion) FROM stdin;
00000000-0000-0000-0000-000000000001	Candidato Principal	Sistema	t	2026-03-26 14:45:18.201594+00	Candidato por defecto del sistema
f9bdee3a-1208-4d04-a1a6-ea46cb4a51b0	Regidor José Martínez	\N	f	2026-03-30 20:48:37.211723+00	Campaña Regiduria 2026
\.


--
-- TOC entry 4219 (class 0 OID 500818)
-- Dependencies: 287
-- Data for Name: duplicados_detectados; Type: TABLE DATA; Schema: partido360; Owner: postgres
--

COPY partido360.duplicados_detectados (duplicado_id, persona_id, motivo, fecha, estado_revision, resuelto_por_usuario_id, fecha_resolucion, comentario_resolucion) FROM stdin;
\.


--
-- TOC entry 4206 (class 0 OID 500567)
-- Dependencies: 274
-- Data for Name: estado_asignacion; Type: TABLE DATA; Schema: partido360; Owner: postgres
--

COPY partido360.estado_asignacion (estado_asignacion_id, nombre, activo) FROM stdin;
9600d61b-af7d-427d-bb67-00b3fb3e2e49	Activa	t
6cf9c5bc-29b3-47f4-a56b-9ba2cc8e431b	Reasignada	t
79d0592d-5045-4642-96d4-a10fe2d0bd56	Anulada	t
\.


--
-- TOC entry 4208 (class 0 OID 500585)
-- Dependencies: 276
-- Data for Name: estado_evento; Type: TABLE DATA; Schema: partido360; Owner: postgres
--

COPY partido360.estado_evento (estado_evento_id, nombre, activo) FROM stdin;
eb882c38-a3cd-428f-baaa-49a5b40e5951	Programado	t
06f19e13-e4ff-495d-b0d0-71bc21587405	Realizado	t
c0056765-3197-4364-b225-b84b6d368f18	Cancelado	t
\.


--
-- TOC entry 4205 (class 0 OID 500558)
-- Dependencies: 273
-- Data for Name: estado_lider; Type: TABLE DATA; Schema: partido360; Owner: postgres
--

COPY partido360.estado_lider (estado_lider_id, nombre, activo) FROM stdin;
364ef3eb-d8a1-4d2e-ae42-b3f46797dd20	Activo	t
41742209-89e3-4998-a24f-4ccc487a1c6a	Inactivo	t
763cb0dc-571d-4511-ba0f-b2ab2b91a686	Suspendido	t
\.


--
-- TOC entry 4204 (class 0 OID 500549)
-- Dependencies: 272
-- Data for Name: estado_persona; Type: TABLE DATA; Schema: partido360; Owner: postgres
--

COPY partido360.estado_persona (estado_persona_id, nombre, activo) FROM stdin;
2d2fb9bd-1c60-4369-b1b7-643135ce7172	Activo	t
9626337e-537a-4f23-8432-f70056be248f	Validado	t
09ecda58-83e9-4894-8917-591cfaac1b67	Duplicado	t
979a0c9e-b878-4424-9a51-c78e946a1c08	Inactivo	t
\.


--
-- TOC entry 4210 (class 0 OID 500605)
-- Dependencies: 278
-- Data for Name: estado_usuario; Type: TABLE DATA; Schema: partido360; Owner: postgres
--

COPY partido360.estado_usuario (estado_usuario_id, nombre, activo) FROM stdin;
c16b5db1-18ff-4824-9d75-a635136043ea	Activo	t
c25361ed-566b-4155-b723-299abcd12716	Inactivo	t
5cea1906-e1aa-4679-b6a3-1bfb845a8651	Bloqueado	t
\.


--
-- TOC entry 4216 (class 0 OID 500753)
-- Dependencies: 284
-- Data for Name: eventos; Type: TABLE DATA; Schema: partido360; Owner: postgres
--

COPY partido360.eventos (evento_id, nombre, fecha, sector_id, descripcion, estado_evento_id, creado_por_usuario_id, candidato_id, fecha_creacion) FROM stdin;
\.


--
-- TOC entry 4203 (class 0 OID 500540)
-- Dependencies: 271
-- Data for Name: fuentes_captacion; Type: TABLE DATA; Schema: partido360; Owner: postgres
--

COPY partido360.fuentes_captacion (fuente_id, nombre, activo, descripcion) FROM stdin;
30f217d5-86ce-400c-8798-48b6ccea9ce2	WhatsApp	t	\N
5dcec5b5-23bf-410e-bf57-843578134b25	Formulario	t	\N
18f1d01a-1f4a-4fd8-b341-106da6f59b12	Evento	t	\N
5cfe4914-241b-4ac0-b72c-6927d3bfd196	Llamada	t	\N
2a26904c-d822-4c53-b913-9f9be906bf35	Referido	t	\N
\.


--
-- TOC entry 4214 (class 0 OID 500687)
-- Dependencies: 282
-- Data for Name: lideres; Type: TABLE DATA; Schema: partido360; Owner: postgres
--

COPY partido360.lideres (lider_id, persona_id, meta_cantidad, codigo_lider, fecha_inicio, estado_lider_id, nivel_lider_id, lider_padre_id, candidato_id) FROM stdin;
6f371bcb-6b6c-43a3-b8ed-55c3dbe331a1	3c591d1e-dad3-402f-9976-7a25121717aa	10	LDR-055699	2026-04-01 15:57:35.068236+00	364ef3eb-d8a1-4d2e-ae42-b3f46797dd20	863582cc-43a7-4d81-898b-975abb448e1f	\N	f9bdee3a-1208-4d04-a1a6-ea46cb4a51b0
146db7e9-7667-4606-a416-87eedb5fb7e6	6b080fee-d65e-448e-9038-95744d00ad58	10	LDR-063322	2026-04-01 16:47:42.579157+00	364ef3eb-d8a1-4d2e-ae42-b3f46797dd20	863582cc-43a7-4d81-898b-975abb448e1f	\N	f9bdee3a-1208-4d04-a1a6-ea46cb4a51b0
7bc627af-2fc6-409a-a7d3-26faa740e730	2588d050-4e89-49a5-8785-cfdf99f478bc	15	LDR-040137	2026-04-01 17:20:39.708367+00	364ef3eb-d8a1-4d2e-ae42-b3f46797dd20	b5f1e98c-554c-4a3b-b106-0f6f9d055567	\N	00000000-0000-0000-0000-000000000001
\.


--
-- TOC entry 4221 (class 0 OID 589831)
-- Dependencies: 289
-- Data for Name: militancia; Type: TABLE DATA; Schema: partido360; Owner: postgres
--

COPY partido360.militancia (militancia_id, persona_id, candidato_id, estado, numero_carnet, fecha_afiliacion, observaciones, fecha_creacion) FROM stdin;
\.


--
-- TOC entry 4207 (class 0 OID 500576)
-- Dependencies: 275
-- Data for Name: nivel_lider; Type: TABLE DATA; Schema: partido360; Owner: postgres
--

COPY partido360.nivel_lider (nivel_lider_id, nombre, activo) FROM stdin;
b5f1e98c-554c-4a3b-b106-0f6f9d055567	Sub-líder	t
863582cc-43a7-4d81-898b-975abb448e1f	Coordinador	t
\.


--
-- TOC entry 4217 (class 0 OID 500782)
-- Dependencies: 285
-- Data for Name: participacion_evento; Type: TABLE DATA; Schema: partido360; Owner: postgres
--

COPY partido360.participacion_evento (participacion_id, evento_id, persona_id, asistio, comentario, fecha_registro) FROM stdin;
\.


--
-- TOC entry 4220 (class 0 OID 500838)
-- Dependencies: 288
-- Data for Name: password_resets; Type: TABLE DATA; Schema: partido360; Owner: postgres
--

COPY partido360.password_resets (reset_id, usuario_id, token_hash, expires_at, used_at, created_at) FROM stdin;
\.


--
-- TOC entry 4212 (class 0 OID 500622)
-- Dependencies: 280
-- Data for Name: personas; Type: TABLE DATA; Schema: partido360; Owner: postgres
--

COPY partido360.personas (persona_id, nombres, apellidos, cedula, telefono, email, sector_id, direccion, fecha_registro, estado_persona_id, candidato_id, notas, mesa, fuente_id, email_contacto) FROM stdin;
e46a33c6-abd3-4397-a1e3-268f3248b9f7	Erick	Guerrero	00000000001	8099999999	\N	5e48c216-9e4f-43ec-8d1c-5eaa8789cdee	\N	2026-03-26 14:45:18.563622+00	2d2fb9bd-1c60-4369-b1b7-643135ce7172	00000000-0000-0000-0000-000000000001	\N	\N	\N	\N
8022b85a-947d-485e-b7af-873fab74c507	Manuel	Jimenez	123-4567891-2	809-455-5555	\N	3a089b1b-7fb6-4f5c-80e2-c73c27e2e9a0	\N	2026-04-01 15:44:38.770004+00	2d2fb9bd-1c60-4369-b1b7-643135ce7172	00000000-0000-0000-0000-000000000001	\N	\N	\N	\N
3c591d1e-dad3-402f-9976-7a25121717aa	Amor 	de Tango	12345678912	8497575757	\N	bf53b688-4ff4-478c-8a68-3a5b4e6f614c	\N	2026-04-01 15:57:35.068236+00	2d2fb9bd-1c60-4369-b1b7-643135ce7172	f9bdee3a-1208-4d04-a1a6-ea46cb4a51b0	\N	\N	\N	\N
6b080fee-d65e-448e-9038-95744d00ad58	manuel	jose	12818186116	8188880808	\N	bf53b688-4ff4-478c-8a68-3a5b4e6f614c	\N	2026-04-01 16:47:42.579157+00	2d2fb9bd-1c60-4369-b1b7-643135ce7172	f9bdee3a-1208-4d04-a1a6-ea46cb4a51b0	\N	\N	\N	\N
ab261845-48ed-4f9b-9ff0-e2b9fc5f0a9f	michel	ortiz	818-1818181-0	849-111-2222	\N	2f133110-f44d-4c75-a7eb-a49df7f766d6	\N	2026-04-01 16:51:54.940594+00	2d2fb9bd-1c60-4369-b1b7-643135ce7172	00000000-0000-0000-0000-000000000001	\N	\N	\N	\N
2588d050-4e89-49a5-8785-cfdf99f478bc	manuel	ramirez	342-3523523-5	809-181-1616	\N	e519ff26-db42-4fcc-8f54-b1c57886b086	\N	2026-04-01 16:52:42.151787+00	2d2fb9bd-1c60-4369-b1b7-643135ce7172	00000000-0000-0000-0000-000000000001	\N	\N	\N	\N
82ba4737-90e9-431f-a4eb-ac50c079870e	Gloria	Tejeda	416-8186681-6	809-445-4545	\N	e519ff26-db42-4fcc-8f54-b1c57886b086	\N	2026-04-01 18:38:50.888175+00	2d2fb9bd-1c60-4369-b1b7-643135ce7172	00000000-0000-0000-0000-000000000001	\N	\N	\N	\N
e4c303f4-8090-4707-950d-a86cdd1e13b1	Maria	Manuel	161-6160606-8	809-481-8181	\N	57c9879d-2c0f-4f53-8466-51b3e174c576	\N	2026-04-01 18:42:36.38448+00	2d2fb9bd-1c60-4369-b1b7-643135ce7172	00000000-0000-0000-0000-000000000001	\N	\N	\N	\N
56883a20-27d0-414f-a4b6-b641652e75a8	Oscar	Mora	123-4567891-0	809-545-5555	\N	7398410a-f2ee-4d43-82dc-2d3428c030e2	\N	2026-04-01 18:21:37.149047+00	2d2fb9bd-1c60-4369-b1b7-643135ce7172	00000000-0000-0000-0000-000000000001	\N	\N	\N	\N
b7fbf42d-4cac-4698-965f-8b667f5d5ddb	carlos	rivera	181-8168168-1	849-252-5222	\N	d118f822-a069-4fea-8fcf-51816e98e801	\N	2026-04-01 18:48:20.794365+00	2d2fb9bd-1c60-4369-b1b7-643135ce7172	00000000-0000-0000-0000-000000000001	\N	\N	\N	\N
\.


--
-- TOC entry 4209 (class 0 OID 500594)
-- Dependencies: 277
-- Data for Name: roles; Type: TABLE DATA; Schema: partido360; Owner: postgres
--

COPY partido360.roles (rol_id, nombre, descripcion, activo) FROM stdin;
32f7e334-bd2f-4b67-9d60-63c9e3b772fd	Admin	Administrador total del sistema	t
cf4ac9da-429d-428f-9363-e4e8c936ca77	Coordinador	Gestor de zona o sector	t
49d4116d-40dc-4b6b-8c28-e63bf2ce78bb	Sub-Líder	Líder de referidos territorial	t
\.


--
-- TOC entry 4202 (class 0 OID 500531)
-- Dependencies: 270
-- Data for Name: sectores; Type: TABLE DATA; Schema: partido360; Owner: postgres
--

COPY partido360.sectores (sector_id, nombre, activo) FROM stdin;
5e48c216-9e4f-43ec-8d1c-5eaa8789cdee	Sector Centro	t
85a8dc32-cd19-4c06-afe3-cd2197ab6f92	Ensanche Ozama	t
d7cc2c39-e6b7-48cd-a922-688dfa5fb867	Villa Mella	t
a6571c96-29ae-4620-bd2e-24a5ed5995ed	Los Alcarrizos	t
e1bc99e6-cef1-45f9-8a9b-9b47588291ef	Los Ríos	t
f1f6f691-c458-465c-a7bf-c4cd64a4a667	Naco	t
643e0b32-28ef-4706-8fcd-d61c71e1bb00	Piantini	t
89d081ef-67c4-4a12-bbb1-25fb23d47ebf	Evaristo Morales	t
e6129899-c302-4e43-919b-333b859a25e6	Bella Vista	t
cc8d843e-2897-4c16-a7ce-229e3ec37f75	Arroyo Hondo	t
d118f822-a069-4fea-8fcf-51816e98e801	Haina	t
48a7d232-3eac-4d1e-b853-edc136cbe64d	San Cristóbal Centro	t
24bade7d-3753-47d8-aaf8-ff5e1a327d1f	Santiago de los Caballeros	t
57c9879d-2c0f-4f53-8466-51b3e174c576	La Romana	t
e519ff26-db42-4fcc-8f54-b1c57886b086	Punta Cana	t
7398410a-f2ee-4d43-82dc-2d3428c030e2	Bavaro	t
26cbc0bd-dbb4-409d-a453-0122579671bf	Boca Chica	t
bf53b688-4ff4-478c-8a68-3a5b4e6f614c	San Isidro	t
2f133110-f44d-4c75-a7eb-a49df7f766d6	Herrera	t
42710318-3663-4da7-852d-6fe7cf886bf0	Los Mina	t
95e59a89-3f77-4c7b-976a-137300fa6e17	San Carlos	t
3a089b1b-7fb6-4f5c-80e2-c73c27e2e9a0	Gazcue	t
0d2d5abf-80ba-43e4-bb0e-31e9b98ad869	Zona Colonial	t
d3e613f1-7fc7-4fae-bb15-9145d0545d2a	Gualey	t
24cf84f2-5a9d-46d6-8417-a09007ca2271	Capotillo	t
49bd2a67-1c0b-446d-9881-b59b1faa20b2	Manganagua	t
\.


--
-- TOC entry 4213 (class 0 OID 500650)
-- Dependencies: 281
-- Data for Name: usuarios; Type: TABLE DATA; Schema: partido360; Owner: postgres
--

COPY partido360.usuarios (usuario_id, persona_id, username, email_login, password_hash, auth_provider, rol_id, estado_usuario_id, candidato_id, ultimo_login, fecha_creacion, failed_login_attempts, locked_until, last_login_at) FROM stdin;
5a3ed048-37ca-4ba1-8889-769b8b898576	3c591d1e-dad3-402f-9976-7a25121717aa	12345678912	\N	$2b$12$GICG7wcFtRAVfWtIRNaLU.WgHDLhcqgINhmoMsZSY87whk0uI1MBS	local	49d4116d-40dc-4b6b-8c28-e63bf2ce78bb	c16b5db1-18ff-4824-9d75-a635136043ea	f9bdee3a-1208-4d04-a1a6-ea46cb4a51b0	\N	2026-04-01 15:57:35.068236+00	0	\N	\N
1a153114-ba2a-408a-a109-eac033bb2c01	6b080fee-d65e-448e-9038-95744d00ad58	12818186116	\N	$2b$12$4FCI2vf3CIU7I41LbkUzmeFi0QW8EcU.YsbdN7Rh6CNVF7OzjgVem	local	49d4116d-40dc-4b6b-8c28-e63bf2ce78bb	c16b5db1-18ff-4824-9d75-a635136043ea	f9bdee3a-1208-4d04-a1a6-ea46cb4a51b0	\N	2026-04-01 16:47:42.579157+00	0	\N	\N
482f26ec-f2e9-44be-b373-22e17e514c1f	e46a33c6-abd3-4397-a1e3-268f3248b9f7	00000000001	ejguerrero@smarttestingrd.com	$2b$10$gOQmDatHyi/gJ503hmr8keeRUWRNXAJKeRO4AoyMJ1PV3tRMIsloy	local	32f7e334-bd2f-4b67-9d60-63c9e3b772fd	c16b5db1-18ff-4824-9d75-a635136043ea	00000000-0000-0000-0000-000000000001	2026-04-03 19:58:12.461805+00	2026-03-26 14:45:18.778064+00	0	\N	2026-04-03 19:58:12.461805+00
\.


--
-- TOC entry 4018 (class 2606 OID 650125)
-- Name: AssetManualPriceOverride AssetManualPriceOverride_pkey; Type: CONSTRAINT; Schema: partido360; Owner: postgres
--

ALTER TABLE ONLY partido360."AssetManualPriceOverride"
    ADD CONSTRAINT "AssetManualPriceOverride_pkey" PRIMARY KEY (id);


--
-- TOC entry 4014 (class 2606 OID 650106)
-- Name: AssetPriceSnapshot AssetPriceSnapshot_pkey; Type: CONSTRAINT; Schema: partido360; Owner: postgres
--

ALTER TABLE ONLY partido360."AssetPriceSnapshot"
    ADD CONSTRAINT "AssetPriceSnapshot_pkey" PRIMARY KEY (id);


--
-- TOC entry 4012 (class 2606 OID 650096)
-- Name: AssetPriceSourceMapping AssetPriceSourceMapping_pkey; Type: CONSTRAINT; Schema: partido360; Owner: postgres
--

ALTER TABLE ONLY partido360."AssetPriceSourceMapping"
    ADD CONSTRAINT "AssetPriceSourceMapping_pkey" PRIMARY KEY (id);


--
-- TOC entry 4016 (class 2606 OID 650116)
-- Name: AssetValuationSnapshot AssetValuationSnapshot_pkey; Type: CONSTRAINT; Schema: partido360; Owner: postgres
--

ALTER TABLE ONLY partido360."AssetValuationSnapshot"
    ADD CONSTRAINT "AssetValuationSnapshot_pkey" PRIMARY KEY (id);


--
-- TOC entry 4009 (class 2606 OID 650087)
-- Name: CanonicalAsset CanonicalAsset_pkey; Type: CONSTRAINT; Schema: partido360; Owner: postgres
--

ALTER TABLE ONLY partido360."CanonicalAsset"
    ADD CONSTRAINT "CanonicalAsset_pkey" PRIMARY KEY (id);


--
-- TOC entry 4020 (class 2606 OID 650134)
-- Name: PricingState PricingState_pkey; Type: CONSTRAINT; Schema: partido360; Owner: postgres
--

ALTER TABLE ONLY partido360."PricingState"
    ADD CONSTRAINT "PricingState_pkey" PRIMARY KEY ("canonicalAssetId");


--
-- TOC entry 3982 (class 2606 OID 500730)
-- Name: asignaciones asignaciones_pkey; Type: CONSTRAINT; Schema: partido360; Owner: postgres
--

ALTER TABLE ONLY partido360.asignaciones
    ADD CONSTRAINT asignaciones_pkey PRIMARY KEY (asignacion_id);


--
-- TOC entry 3996 (class 2606 OID 500812)
-- Name: bitacora_cambios bitacora_cambios_pkey; Type: CONSTRAINT; Schema: partido360; Owner: postgres
--

ALTER TABLE ONLY partido360.bitacora_cambios
    ADD CONSTRAINT bitacora_cambios_pkey PRIMARY KEY (cambio_id);


--
-- TOC entry 3958 (class 2606 OID 500621)
-- Name: candidatos candidatos_pkey; Type: CONSTRAINT; Schema: partido360; Owner: postgres
--

ALTER TABLE ONLY partido360.candidatos
    ADD CONSTRAINT candidatos_pkey PRIMARY KEY (candidato_id);


--
-- TOC entry 4000 (class 2606 OID 500827)
-- Name: duplicados_detectados duplicados_detectados_pkey; Type: CONSTRAINT; Schema: partido360; Owner: postgres
--

ALTER TABLE ONLY partido360.duplicados_detectados
    ADD CONSTRAINT duplicados_detectados_pkey PRIMARY KEY (duplicado_id);


--
-- TOC entry 3938 (class 2606 OID 500575)
-- Name: estado_asignacion estado_asignacion_nombre_key; Type: CONSTRAINT; Schema: partido360; Owner: postgres
--

ALTER TABLE ONLY partido360.estado_asignacion
    ADD CONSTRAINT estado_asignacion_nombre_key UNIQUE (nombre);


--
-- TOC entry 3940 (class 2606 OID 500573)
-- Name: estado_asignacion estado_asignacion_pkey; Type: CONSTRAINT; Schema: partido360; Owner: postgres
--

ALTER TABLE ONLY partido360.estado_asignacion
    ADD CONSTRAINT estado_asignacion_pkey PRIMARY KEY (estado_asignacion_id);


--
-- TOC entry 3946 (class 2606 OID 500593)
-- Name: estado_evento estado_evento_nombre_key; Type: CONSTRAINT; Schema: partido360; Owner: postgres
--

ALTER TABLE ONLY partido360.estado_evento
    ADD CONSTRAINT estado_evento_nombre_key UNIQUE (nombre);


--
-- TOC entry 3948 (class 2606 OID 500591)
-- Name: estado_evento estado_evento_pkey; Type: CONSTRAINT; Schema: partido360; Owner: postgres
--

ALTER TABLE ONLY partido360.estado_evento
    ADD CONSTRAINT estado_evento_pkey PRIMARY KEY (estado_evento_id);


--
-- TOC entry 3934 (class 2606 OID 500566)
-- Name: estado_lider estado_lider_nombre_key; Type: CONSTRAINT; Schema: partido360; Owner: postgres
--

ALTER TABLE ONLY partido360.estado_lider
    ADD CONSTRAINT estado_lider_nombre_key UNIQUE (nombre);


--
-- TOC entry 3936 (class 2606 OID 500564)
-- Name: estado_lider estado_lider_pkey; Type: CONSTRAINT; Schema: partido360; Owner: postgres
--

ALTER TABLE ONLY partido360.estado_lider
    ADD CONSTRAINT estado_lider_pkey PRIMARY KEY (estado_lider_id);


--
-- TOC entry 3930 (class 2606 OID 500557)
-- Name: estado_persona estado_persona_nombre_key; Type: CONSTRAINT; Schema: partido360; Owner: postgres
--

ALTER TABLE ONLY partido360.estado_persona
    ADD CONSTRAINT estado_persona_nombre_key UNIQUE (nombre);


--
-- TOC entry 3932 (class 2606 OID 500555)
-- Name: estado_persona estado_persona_pkey; Type: CONSTRAINT; Schema: partido360; Owner: postgres
--

ALTER TABLE ONLY partido360.estado_persona
    ADD CONSTRAINT estado_persona_pkey PRIMARY KEY (estado_persona_id);


--
-- TOC entry 3954 (class 2606 OID 500613)
-- Name: estado_usuario estado_usuario_nombre_key; Type: CONSTRAINT; Schema: partido360; Owner: postgres
--

ALTER TABLE ONLY partido360.estado_usuario
    ADD CONSTRAINT estado_usuario_nombre_key UNIQUE (nombre);


--
-- TOC entry 3956 (class 2606 OID 500611)
-- Name: estado_usuario estado_usuario_pkey; Type: CONSTRAINT; Schema: partido360; Owner: postgres
--

ALTER TABLE ONLY partido360.estado_usuario
    ADD CONSTRAINT estado_usuario_pkey PRIMARY KEY (estado_usuario_id);


--
-- TOC entry 3988 (class 2606 OID 500761)
-- Name: eventos eventos_pkey; Type: CONSTRAINT; Schema: partido360; Owner: postgres
--

ALTER TABLE ONLY partido360.eventos
    ADD CONSTRAINT eventos_pkey PRIMARY KEY (evento_id);


--
-- TOC entry 3926 (class 2606 OID 500548)
-- Name: fuentes_captacion fuentes_captacion_nombre_key; Type: CONSTRAINT; Schema: partido360; Owner: postgres
--

ALTER TABLE ONLY partido360.fuentes_captacion
    ADD CONSTRAINT fuentes_captacion_nombre_key UNIQUE (nombre);


--
-- TOC entry 3928 (class 2606 OID 500546)
-- Name: fuentes_captacion fuentes_captacion_pkey; Type: CONSTRAINT; Schema: partido360; Owner: postgres
--

ALTER TABLE ONLY partido360.fuentes_captacion
    ADD CONSTRAINT fuentes_captacion_pkey PRIMARY KEY (fuente_id);


--
-- TOC entry 3976 (class 2606 OID 500698)
-- Name: lideres lideres_codigo_lider_key; Type: CONSTRAINT; Schema: partido360; Owner: postgres
--

ALTER TABLE ONLY partido360.lideres
    ADD CONSTRAINT lideres_codigo_lider_key UNIQUE (codigo_lider);


--
-- TOC entry 3978 (class 2606 OID 500696)
-- Name: lideres lideres_persona_id_key; Type: CONSTRAINT; Schema: partido360; Owner: postgres
--

ALTER TABLE ONLY partido360.lideres
    ADD CONSTRAINT lideres_persona_id_key UNIQUE (persona_id);


--
-- TOC entry 3980 (class 2606 OID 500694)
-- Name: lideres lideres_pkey; Type: CONSTRAINT; Schema: partido360; Owner: postgres
--

ALTER TABLE ONLY partido360.lideres
    ADD CONSTRAINT lideres_pkey PRIMARY KEY (lider_id);


--
-- TOC entry 4006 (class 2606 OID 589841)
-- Name: militancia militancia_pkey; Type: CONSTRAINT; Schema: partido360; Owner: postgres
--

ALTER TABLE ONLY partido360.militancia
    ADD CONSTRAINT militancia_pkey PRIMARY KEY (militancia_id);


--
-- TOC entry 3942 (class 2606 OID 500584)
-- Name: nivel_lider nivel_lider_nombre_key; Type: CONSTRAINT; Schema: partido360; Owner: postgres
--

ALTER TABLE ONLY partido360.nivel_lider
    ADD CONSTRAINT nivel_lider_nombre_key UNIQUE (nombre);


--
-- TOC entry 3944 (class 2606 OID 500582)
-- Name: nivel_lider nivel_lider_pkey; Type: CONSTRAINT; Schema: partido360; Owner: postgres
--

ALTER TABLE ONLY partido360.nivel_lider
    ADD CONSTRAINT nivel_lider_pkey PRIMARY KEY (nivel_lider_id);


--
-- TOC entry 3992 (class 2606 OID 500791)
-- Name: participacion_evento participacion_evento_pkey; Type: CONSTRAINT; Schema: partido360; Owner: postgres
--

ALTER TABLE ONLY partido360.participacion_evento
    ADD CONSTRAINT participacion_evento_pkey PRIMARY KEY (participacion_id);


--
-- TOC entry 4004 (class 2606 OID 500844)
-- Name: password_resets password_resets_pkey; Type: CONSTRAINT; Schema: partido360; Owner: postgres
--

ALTER TABLE ONLY partido360.password_resets
    ADD CONSTRAINT password_resets_pkey PRIMARY KEY (reset_id);


--
-- TOC entry 3960 (class 2606 OID 500632)
-- Name: personas personas_cedula_key; Type: CONSTRAINT; Schema: partido360; Owner: postgres
--

ALTER TABLE ONLY partido360.personas
    ADD CONSTRAINT personas_cedula_key UNIQUE (cedula);


--
-- TOC entry 3962 (class 2606 OID 500630)
-- Name: personas personas_pkey; Type: CONSTRAINT; Schema: partido360; Owner: postgres
--

ALTER TABLE ONLY partido360.personas
    ADD CONSTRAINT personas_pkey PRIMARY KEY (persona_id);


--
-- TOC entry 3964 (class 2606 OID 500634)
-- Name: personas personas_telefono_key; Type: CONSTRAINT; Schema: partido360; Owner: postgres
--

ALTER TABLE ONLY partido360.personas
    ADD CONSTRAINT personas_telefono_key UNIQUE (telefono);


--
-- TOC entry 3950 (class 2606 OID 500604)
-- Name: roles roles_nombre_key; Type: CONSTRAINT; Schema: partido360; Owner: postgres
--

ALTER TABLE ONLY partido360.roles
    ADD CONSTRAINT roles_nombre_key UNIQUE (nombre);


--
-- TOC entry 3952 (class 2606 OID 500602)
-- Name: roles roles_pkey; Type: CONSTRAINT; Schema: partido360; Owner: postgres
--

ALTER TABLE ONLY partido360.roles
    ADD CONSTRAINT roles_pkey PRIMARY KEY (rol_id);


--
-- TOC entry 3922 (class 2606 OID 500539)
-- Name: sectores sectores_nombre_key; Type: CONSTRAINT; Schema: partido360; Owner: postgres
--

ALTER TABLE ONLY partido360.sectores
    ADD CONSTRAINT sectores_nombre_key UNIQUE (nombre);


--
-- TOC entry 3924 (class 2606 OID 500537)
-- Name: sectores sectores_pkey; Type: CONSTRAINT; Schema: partido360; Owner: postgres
--

ALTER TABLE ONLY partido360.sectores
    ADD CONSTRAINT sectores_pkey PRIMARY KEY (sector_id);


--
-- TOC entry 3994 (class 2606 OID 500793)
-- Name: participacion_evento unique_evento_persona_participacion; Type: CONSTRAINT; Schema: partido360; Owner: postgres
--

ALTER TABLE ONLY partido360.participacion_evento
    ADD CONSTRAINT unique_evento_persona_participacion UNIQUE (evento_id, persona_id);


--
-- TOC entry 3986 (class 2606 OID 500732)
-- Name: asignaciones unique_lider_persona_asignacion; Type: CONSTRAINT; Schema: partido360; Owner: postgres
--

ALTER TABLE ONLY partido360.asignaciones
    ADD CONSTRAINT unique_lider_persona_asignacion UNIQUE (lider_id, persona_id);


--
-- TOC entry 3967 (class 2606 OID 500666)
-- Name: usuarios usuarios_email_login_key; Type: CONSTRAINT; Schema: partido360; Owner: postgres
--

ALTER TABLE ONLY partido360.usuarios
    ADD CONSTRAINT usuarios_email_login_key UNIQUE (email_login);


--
-- TOC entry 3969 (class 2606 OID 500662)
-- Name: usuarios usuarios_persona_id_key; Type: CONSTRAINT; Schema: partido360; Owner: postgres
--

ALTER TABLE ONLY partido360.usuarios
    ADD CONSTRAINT usuarios_persona_id_key UNIQUE (persona_id);


--
-- TOC entry 3971 (class 2606 OID 500660)
-- Name: usuarios usuarios_pkey; Type: CONSTRAINT; Schema: partido360; Owner: postgres
--

ALTER TABLE ONLY partido360.usuarios
    ADD CONSTRAINT usuarios_pkey PRIMARY KEY (usuario_id);


--
-- TOC entry 3973 (class 2606 OID 500664)
-- Name: usuarios usuarios_username_key; Type: CONSTRAINT; Schema: partido360; Owner: postgres
--

ALTER TABLE ONLY partido360.usuarios
    ADD CONSTRAINT usuarios_username_key UNIQUE (username);


--
-- TOC entry 4010 (class 1259 OID 650136)
-- Name: AssetPriceSourceMapping_canonicalAssetId_provider_key; Type: INDEX; Schema: partido360; Owner: postgres
--

CREATE UNIQUE INDEX "AssetPriceSourceMapping_canonicalAssetId_provider_key" ON partido360."AssetPriceSourceMapping" USING btree ("canonicalAssetId", provider);


--
-- TOC entry 4007 (class 1259 OID 650135)
-- Name: CanonicalAsset_internalAssetCode_key; Type: INDEX; Schema: partido360; Owner: postgres
--

CREATE UNIQUE INDEX "CanonicalAsset_internalAssetCode_key" ON partido360."CanonicalAsset" USING btree ("internalAssetCode");


--
-- TOC entry 3983 (class 1259 OID 500857)
-- Name: idx_asignaciones_lider; Type: INDEX; Schema: partido360; Owner: postgres
--

CREATE INDEX idx_asignaciones_lider ON partido360.asignaciones USING btree (lider_id);


--
-- TOC entry 3984 (class 1259 OID 500858)
-- Name: idx_asignaciones_persona; Type: INDEX; Schema: partido360; Owner: postgres
--

CREATE INDEX idx_asignaciones_persona ON partido360.asignaciones USING btree (persona_id);


--
-- TOC entry 3997 (class 1259 OID 500853)
-- Name: idx_bitacora_entidad; Type: INDEX; Schema: partido360; Owner: postgres
--

CREATE INDEX idx_bitacora_entidad ON partido360.bitacora_cambios USING btree (entidad);


--
-- TOC entry 3998 (class 1259 OID 500852)
-- Name: idx_bitacora_fecha; Type: INDEX; Schema: partido360; Owner: postgres
--

CREATE INDEX idx_bitacora_fecha ON partido360.bitacora_cambios USING btree (fecha);


--
-- TOC entry 4001 (class 1259 OID 500854)
-- Name: idx_duplicados_estado; Type: INDEX; Schema: partido360; Owner: postgres
--

CREATE INDEX idx_duplicados_estado ON partido360.duplicados_detectados USING btree (estado_revision);


--
-- TOC entry 4002 (class 1259 OID 500855)
-- Name: idx_duplicados_fecha; Type: INDEX; Schema: partido360; Owner: postgres
--

CREATE INDEX idx_duplicados_fecha ON partido360.duplicados_detectados USING btree (fecha);


--
-- TOC entry 3989 (class 1259 OID 500850)
-- Name: idx_eventos_fecha; Type: INDEX; Schema: partido360; Owner: postgres
--

CREATE INDEX idx_eventos_fecha ON partido360.eventos USING btree (fecha);


--
-- TOC entry 3990 (class 1259 OID 500851)
-- Name: idx_eventos_sector; Type: INDEX; Schema: partido360; Owner: postgres
--

CREATE INDEX idx_eventos_sector ON partido360.eventos USING btree (sector_id);


--
-- TOC entry 3974 (class 1259 OID 500856)
-- Name: idx_lideres_padre; Type: INDEX; Schema: partido360; Owner: postgres
--

CREATE INDEX idx_lideres_padre ON partido360.lideres USING btree (lider_padre_id);


--
-- TOC entry 3965 (class 1259 OID 500859)
-- Name: idx_usuarios_rol; Type: INDEX; Schema: partido360; Owner: postgres
--

CREATE INDEX idx_usuarios_rol ON partido360.usuarios USING btree (rol_id);


--
-- TOC entry 4055 (class 2606 OID 650162)
-- Name: AssetManualPriceOverride AssetManualPriceOverride_canonicalAssetId_fkey; Type: FK CONSTRAINT; Schema: partido360; Owner: postgres
--

ALTER TABLE ONLY partido360."AssetManualPriceOverride"
    ADD CONSTRAINT "AssetManualPriceOverride_canonicalAssetId_fkey" FOREIGN KEY ("canonicalAssetId") REFERENCES partido360."CanonicalAsset"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- TOC entry 4051 (class 2606 OID 650142)
-- Name: AssetPriceSnapshot AssetPriceSnapshot_canonicalAssetId_fkey; Type: FK CONSTRAINT; Schema: partido360; Owner: postgres
--

ALTER TABLE ONLY partido360."AssetPriceSnapshot"
    ADD CONSTRAINT "AssetPriceSnapshot_canonicalAssetId_fkey" FOREIGN KEY ("canonicalAssetId") REFERENCES partido360."CanonicalAsset"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- TOC entry 4050 (class 2606 OID 650137)
-- Name: AssetPriceSourceMapping AssetPriceSourceMapping_canonicalAssetId_fkey; Type: FK CONSTRAINT; Schema: partido360; Owner: postgres
--

ALTER TABLE ONLY partido360."AssetPriceSourceMapping"
    ADD CONSTRAINT "AssetPriceSourceMapping_canonicalAssetId_fkey" FOREIGN KEY ("canonicalAssetId") REFERENCES partido360."CanonicalAsset"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- TOC entry 4052 (class 2606 OID 650152)
-- Name: AssetValuationSnapshot AssetValuationSnapshot_canonicalAssetId_fkey; Type: FK CONSTRAINT; Schema: partido360; Owner: postgres
--

ALTER TABLE ONLY partido360."AssetValuationSnapshot"
    ADD CONSTRAINT "AssetValuationSnapshot_canonicalAssetId_fkey" FOREIGN KEY ("canonicalAssetId") REFERENCES partido360."CanonicalAsset"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- TOC entry 4053 (class 2606 OID 650157)
-- Name: AssetValuationSnapshot AssetValuationSnapshot_priceSnapshotId_fkey; Type: FK CONSTRAINT; Schema: partido360; Owner: postgres
--

ALTER TABLE ONLY partido360."AssetValuationSnapshot"
    ADD CONSTRAINT "AssetValuationSnapshot_priceSnapshotId_fkey" FOREIGN KEY ("priceSnapshotId") REFERENCES partido360."AssetPriceSnapshot"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- TOC entry 4054 (class 2606 OID 650147)
-- Name: AssetValuationSnapshot AssetValuationSnapshot_walletAccountId_fkey; Type: FK CONSTRAINT; Schema: partido360; Owner: postgres
--

-- FK removida: referencia a WalletAccount de otro proyecto


--
-- TOC entry 4056 (class 2606 OID 650167)
-- Name: PricingState PricingState_canonicalAssetId_fkey; Type: FK CONSTRAINT; Schema: partido360; Owner: postgres
--

ALTER TABLE ONLY partido360."PricingState"
    ADD CONSTRAINT "PricingState_canonicalAssetId_fkey" FOREIGN KEY ("canonicalAssetId") REFERENCES partido360."CanonicalAsset"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- TOC entry 4034 (class 2606 OID 500748)
-- Name: asignaciones asignaciones_estado_asignacion_id_fkey; Type: FK CONSTRAINT; Schema: partido360; Owner: postgres
--

ALTER TABLE ONLY partido360.asignaciones
    ADD CONSTRAINT asignaciones_estado_asignacion_id_fkey FOREIGN KEY (estado_asignacion_id) REFERENCES partido360.estado_asignacion(estado_asignacion_id) ON DELETE RESTRICT;


--
-- TOC entry 4035 (class 2606 OID 500743)
-- Name: asignaciones asignaciones_fuente_id_fkey; Type: FK CONSTRAINT; Schema: partido360; Owner: postgres
--

ALTER TABLE ONLY partido360.asignaciones
    ADD CONSTRAINT asignaciones_fuente_id_fkey FOREIGN KEY (fuente_id) REFERENCES partido360.fuentes_captacion(fuente_id) ON DELETE SET NULL;


--
-- TOC entry 4036 (class 2606 OID 500733)
-- Name: asignaciones asignaciones_lider_id_fkey; Type: FK CONSTRAINT; Schema: partido360; Owner: postgres
--

ALTER TABLE ONLY partido360.asignaciones
    ADD CONSTRAINT asignaciones_lider_id_fkey FOREIGN KEY (lider_id) REFERENCES partido360.lideres(lider_id) ON DELETE RESTRICT;


--
-- TOC entry 4037 (class 2606 OID 500738)
-- Name: asignaciones asignaciones_persona_id_fkey; Type: FK CONSTRAINT; Schema: partido360; Owner: postgres
--

ALTER TABLE ONLY partido360.asignaciones
    ADD CONSTRAINT asignaciones_persona_id_fkey FOREIGN KEY (persona_id) REFERENCES partido360.personas(persona_id) ON DELETE RESTRICT;


--
-- TOC entry 4044 (class 2606 OID 500813)
-- Name: bitacora_cambios bitacora_cambios_usuario_id_fkey; Type: FK CONSTRAINT; Schema: partido360; Owner: postgres
--

ALTER TABLE ONLY partido360.bitacora_cambios
    ADD CONSTRAINT bitacora_cambios_usuario_id_fkey FOREIGN KEY (usuario_id) REFERENCES partido360.usuarios(usuario_id) ON DELETE RESTRICT;


--
-- TOC entry 4045 (class 2606 OID 500828)
-- Name: duplicados_detectados duplicados_detectados_persona_id_fkey; Type: FK CONSTRAINT; Schema: partido360; Owner: postgres
--

ALTER TABLE ONLY partido360.duplicados_detectados
    ADD CONSTRAINT duplicados_detectados_persona_id_fkey FOREIGN KEY (persona_id) REFERENCES partido360.personas(persona_id) ON DELETE CASCADE;


--
-- TOC entry 4046 (class 2606 OID 500833)
-- Name: duplicados_detectados duplicados_detectados_resuelto_por_usuario_id_fkey; Type: FK CONSTRAINT; Schema: partido360; Owner: postgres
--

ALTER TABLE ONLY partido360.duplicados_detectados
    ADD CONSTRAINT duplicados_detectados_resuelto_por_usuario_id_fkey FOREIGN KEY (resuelto_por_usuario_id) REFERENCES partido360.usuarios(usuario_id) ON DELETE SET NULL;


--
-- TOC entry 4038 (class 2606 OID 500777)
-- Name: eventos eventos_candidato_id_fkey; Type: FK CONSTRAINT; Schema: partido360; Owner: postgres
--

ALTER TABLE ONLY partido360.eventos
    ADD CONSTRAINT eventos_candidato_id_fkey FOREIGN KEY (candidato_id) REFERENCES partido360.candidatos(candidato_id) ON DELETE CASCADE;


--
-- TOC entry 4039 (class 2606 OID 500772)
-- Name: eventos eventos_creado_por_usuario_id_fkey; Type: FK CONSTRAINT; Schema: partido360; Owner: postgres
--

ALTER TABLE ONLY partido360.eventos
    ADD CONSTRAINT eventos_creado_por_usuario_id_fkey FOREIGN KEY (creado_por_usuario_id) REFERENCES partido360.usuarios(usuario_id) ON DELETE SET NULL;


--
-- TOC entry 4040 (class 2606 OID 500767)
-- Name: eventos eventos_estado_evento_id_fkey; Type: FK CONSTRAINT; Schema: partido360; Owner: postgres
--

ALTER TABLE ONLY partido360.eventos
    ADD CONSTRAINT eventos_estado_evento_id_fkey FOREIGN KEY (estado_evento_id) REFERENCES partido360.estado_evento(estado_evento_id) ON DELETE RESTRICT;


--
-- TOC entry 4041 (class 2606 OID 500762)
-- Name: eventos eventos_sector_id_fkey; Type: FK CONSTRAINT; Schema: partido360; Owner: postgres
--

ALTER TABLE ONLY partido360.eventos
    ADD CONSTRAINT eventos_sector_id_fkey FOREIGN KEY (sector_id) REFERENCES partido360.sectores(sector_id) ON DELETE RESTRICT;


--
-- TOC entry 4029 (class 2606 OID 500719)
-- Name: lideres lideres_candidato_id_fkey; Type: FK CONSTRAINT; Schema: partido360; Owner: postgres
--

ALTER TABLE ONLY partido360.lideres
    ADD CONSTRAINT lideres_candidato_id_fkey FOREIGN KEY (candidato_id) REFERENCES partido360.candidatos(candidato_id) ON DELETE CASCADE;


--
-- TOC entry 4030 (class 2606 OID 500704)
-- Name: lideres lideres_estado_lider_id_fkey; Type: FK CONSTRAINT; Schema: partido360; Owner: postgres
--

ALTER TABLE ONLY partido360.lideres
    ADD CONSTRAINT lideres_estado_lider_id_fkey FOREIGN KEY (estado_lider_id) REFERENCES partido360.estado_lider(estado_lider_id) ON DELETE RESTRICT;


--
-- TOC entry 4031 (class 2606 OID 500714)
-- Name: lideres lideres_lider_padre_id_fkey; Type: FK CONSTRAINT; Schema: partido360; Owner: postgres
--

ALTER TABLE ONLY partido360.lideres
    ADD CONSTRAINT lideres_lider_padre_id_fkey FOREIGN KEY (lider_padre_id) REFERENCES partido360.lideres(lider_id) ON DELETE SET NULL;


--
-- TOC entry 4032 (class 2606 OID 500709)
-- Name: lideres lideres_nivel_lider_id_fkey; Type: FK CONSTRAINT; Schema: partido360; Owner: postgres
--

ALTER TABLE ONLY partido360.lideres
    ADD CONSTRAINT lideres_nivel_lider_id_fkey FOREIGN KEY (nivel_lider_id) REFERENCES partido360.nivel_lider(nivel_lider_id) ON DELETE RESTRICT;


--
-- TOC entry 4033 (class 2606 OID 500699)
-- Name: lideres lideres_persona_id_fkey; Type: FK CONSTRAINT; Schema: partido360; Owner: postgres
--

ALTER TABLE ONLY partido360.lideres
    ADD CONSTRAINT lideres_persona_id_fkey FOREIGN KEY (persona_id) REFERENCES partido360.personas(persona_id) ON DELETE RESTRICT;


--
-- TOC entry 4048 (class 2606 OID 589847)
-- Name: militancia militancia_candidato_id_fkey; Type: FK CONSTRAINT; Schema: partido360; Owner: postgres
--

ALTER TABLE ONLY partido360.militancia
    ADD CONSTRAINT militancia_candidato_id_fkey FOREIGN KEY (candidato_id) REFERENCES partido360.candidatos(candidato_id) ON DELETE CASCADE;


--
-- TOC entry 4049 (class 2606 OID 589842)
-- Name: militancia militancia_persona_id_fkey; Type: FK CONSTRAINT; Schema: partido360; Owner: postgres
--

ALTER TABLE ONLY partido360.militancia
    ADD CONSTRAINT militancia_persona_id_fkey FOREIGN KEY (persona_id) REFERENCES partido360.personas(persona_id) ON DELETE CASCADE;


--
-- TOC entry 4042 (class 2606 OID 500794)
-- Name: participacion_evento participacion_evento_evento_id_fkey; Type: FK CONSTRAINT; Schema: partido360; Owner: postgres
--

ALTER TABLE ONLY partido360.participacion_evento
    ADD CONSTRAINT participacion_evento_evento_id_fkey FOREIGN KEY (evento_id) REFERENCES partido360.eventos(evento_id) ON DELETE CASCADE;


--
-- TOC entry 4043 (class 2606 OID 500799)
-- Name: participacion_evento participacion_evento_persona_id_fkey; Type: FK CONSTRAINT; Schema: partido360; Owner: postgres
--

ALTER TABLE ONLY partido360.participacion_evento
    ADD CONSTRAINT participacion_evento_persona_id_fkey FOREIGN KEY (persona_id) REFERENCES partido360.personas(persona_id) ON DELETE CASCADE;


--
-- TOC entry 4047 (class 2606 OID 500845)
-- Name: password_resets password_resets_usuario_id_fkey; Type: FK CONSTRAINT; Schema: partido360; Owner: postgres
--

ALTER TABLE ONLY partido360.password_resets
    ADD CONSTRAINT password_resets_usuario_id_fkey FOREIGN KEY (usuario_id) REFERENCES partido360.usuarios(usuario_id) ON DELETE CASCADE;


--
-- TOC entry 4021 (class 2606 OID 500645)
-- Name: personas personas_candidato_id_fkey; Type: FK CONSTRAINT; Schema: partido360; Owner: postgres
--

ALTER TABLE ONLY partido360.personas
    ADD CONSTRAINT personas_candidato_id_fkey FOREIGN KEY (candidato_id) REFERENCES partido360.candidatos(candidato_id) ON DELETE CASCADE;


--
-- TOC entry 4022 (class 2606 OID 500640)
-- Name: personas personas_estado_persona_id_fkey; Type: FK CONSTRAINT; Schema: partido360; Owner: postgres
--

ALTER TABLE ONLY partido360.personas
    ADD CONSTRAINT personas_estado_persona_id_fkey FOREIGN KEY (estado_persona_id) REFERENCES partido360.estado_persona(estado_persona_id) ON DELETE RESTRICT;


--
-- TOC entry 4023 (class 2606 OID 589826)
-- Name: personas personas_fuente_id_fkey; Type: FK CONSTRAINT; Schema: partido360; Owner: postgres
--

ALTER TABLE ONLY partido360.personas
    ADD CONSTRAINT personas_fuente_id_fkey FOREIGN KEY (fuente_id) REFERENCES partido360.fuentes_captacion(fuente_id) ON DELETE SET NULL;


--
-- TOC entry 4024 (class 2606 OID 500635)
-- Name: personas personas_sector_id_fkey; Type: FK CONSTRAINT; Schema: partido360; Owner: postgres
--

ALTER TABLE ONLY partido360.personas
    ADD CONSTRAINT personas_sector_id_fkey FOREIGN KEY (sector_id) REFERENCES partido360.sectores(sector_id) ON DELETE RESTRICT;


--
-- TOC entry 4025 (class 2606 OID 500682)
-- Name: usuarios usuarios_candidato_id_fkey; Type: FK CONSTRAINT; Schema: partido360; Owner: postgres
--

ALTER TABLE ONLY partido360.usuarios
    ADD CONSTRAINT usuarios_candidato_id_fkey FOREIGN KEY (candidato_id) REFERENCES partido360.candidatos(candidato_id) ON DELETE CASCADE;


--
-- TOC entry 4026 (class 2606 OID 500677)
-- Name: usuarios usuarios_estado_usuario_id_fkey; Type: FK CONSTRAINT; Schema: partido360; Owner: postgres
--

ALTER TABLE ONLY partido360.usuarios
    ADD CONSTRAINT usuarios_estado_usuario_id_fkey FOREIGN KEY (estado_usuario_id) REFERENCES partido360.estado_usuario(estado_usuario_id) ON DELETE RESTRICT;


--
-- TOC entry 4027 (class 2606 OID 500667)
-- Name: usuarios usuarios_persona_id_fkey; Type: FK CONSTRAINT; Schema: partido360; Owner: postgres
--

ALTER TABLE ONLY partido360.usuarios
    ADD CONSTRAINT usuarios_persona_id_fkey FOREIGN KEY (persona_id) REFERENCES partido360.personas(persona_id) ON DELETE RESTRICT;


--
-- TOC entry 4028 (class 2606 OID 500672)
-- Name: usuarios usuarios_rol_id_fkey; Type: FK CONSTRAINT; Schema: partido360; Owner: postgres
--

ALTER TABLE ONLY partido360.usuarios
    ADD CONSTRAINT usuarios_rol_id_fkey FOREIGN KEY (rol_id) REFERENCES partido360.roles(rol_id) ON DELETE RESTRICT;


-- Completed on 2026-04-06 12:30:34

--
-- PostgreSQL database dump complete
--

