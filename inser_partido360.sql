-- Partido360 - Script de inserción de datos
-- Ejecutar en: psql -U postgres -d postgres

SET search_path TO partido360, public;

-- SECTORES
INSERT INTO partido360.sectores (sector_id, nombre, activo) VALUES
('5e48c216-9e4f-43ec-8d1c-5eaa8789cdee','Sector Centro',true),
('85a8dc32-cd19-4c06-afe3-cd2197ab6f92','Ensanche Ozama',true),
('d7cc2c39-e6b7-48cd-a922-688dfa5fb867','Villa Mella',true),
('a6571c96-29ae-4620-bd2e-24a5ed5995ed','Los Alcarrizos',true),
('e1bc99e6-cef1-45f9-8a9b-9b47588291ef','Los Ríos',true),
('f1f6f691-c458-465c-a7bf-c4cd64a4a667','Naco',true),
('643e0b32-28ef-4706-8fcd-d61c71e1bb00','Piantini',true),
('89d081ef-67c4-4a12-bbb1-25fb23d47ebf','Evaristo Morales',true),
('e6129899-c302-4e43-919b-333b859a25e6','Bella Vista',true),
('cc8d843e-2897-4c16-a7ce-229e3ec37f75','Arroyo Hondo',true),
('d118f822-a069-4fea-8fcf-51816e98e801','Haina',true),
('48a7d232-3eac-4d1e-b853-edc136cbe64d','San Cristóbal Centro',true),
('24bade7d-3753-47d8-aaf8-ff5e1a327d1f','Santiago de los Caballeros',true),
('57c9879d-2c0f-4f53-8466-51b3e174c576','La Romana',true),
('e519ff26-db42-4fcc-8f54-b1c57886b086','Punta Cana',true),
('7398410a-f2ee-4d43-82dc-2d3428c030e2','Bavaro',true),
('26cbc0bd-dbb4-409d-a453-0122579671bf','Boca Chica',true),
('bf53b688-4ff4-478c-8a68-3a5b4e6f614c','San Isidro',true),
('2f133110-f44d-4c75-a7eb-a49df7f766d6','Herrera',true),
('42710318-3663-4da7-852d-6fe7cf886bf0','Los Mina',true),
('95e59a89-3f77-4c7b-976a-137300fa6e17','San Carlos',true),
('3a089b1b-7fb6-4f5c-80e2-c73c27e2e9a0','Gazcue',true),
('0d2d5abf-80ba-43e4-bb0e-31e9b98ad869','Zona Colonial',true),
('d3e613f1-7fc7-4fae-bb15-9145d0545d2a','Gualey',true),
('24cf84f2-5a9d-46d6-8417-a09007ca2271','Capotillo',true),
('49bd2a67-1c0b-446d-9881-b59b1faa20b2','Manganagua',true);

-- ROLES
INSERT INTO partido360.roles (rol_id, nombre, descripcion, activo) VALUES
('32f7e334-bd2f-4b67-9d60-63c9e3b772fd','Admin','Administrador total del sistema',true),
('cf4ac9da-429d-428f-9363-e4e8c936ca77','Coordinador','Gestor de zona o sector',true),
('49d4116d-40dc-4b6b-8c28-e63bf2ce78bb','Sub-Líder','Líder de referidos territorial',true);

-- ESTADO_PERSONA
INSERT INTO partido360.estado_persona (estado_persona_id, nombre, activo) VALUES
('2d2fb9bd-1c60-4369-b1b7-643135ce7172','Activo',true),
('9626337e-537a-4f23-8432-f70056be248f','Validado',true),
('09ecda58-83e9-4894-8917-591cfaac1b67','Duplicado',true),
('979a0c9e-b878-4424-9a51-c78e946a1c08','Inactivo',true);

-- ESTADO_LIDER
INSERT INTO partido360.estado_lider (estado_lider_id, nombre, activo) VALUES
('364ef3eb-d8a1-4d2e-ae42-b3f46797dd20','Activo',true),
('41742209-89e3-4998-a24f-4ccc487a1c6a','Inactivo',true),
('763cb0dc-571d-4511-ba0f-b2ab2b91a686','Suspendido',true);

-- ESTADO_USUARIO
INSERT INTO partido360.estado_usuario (estado_usuario_id, nombre, activo) VALUES
('c16b5db1-18ff-4824-9d75-a635136043ea','Activo',true),
('c25361ed-566b-4155-b723-299abcd12716','Inactivo',true),
('5cea1906-e1aa-4679-b6a3-1bfb845a8651','Bloqueado',true);

-- ESTADO_ASIGNACION
INSERT INTO partido360.estado_asignacion (estado_asignacion_id, nombre, activo) VALUES
('9600d61b-af7d-427d-bb67-00b3fb3e2e49','Activa',true),
('6cf9c5bc-29b3-47f4-a56b-9ba2cc8e431b','Reasignada',true),
('79d0592d-5045-4642-96d4-a10fe2d0bd56','Anulada',true);

-- ESTADO_EVENTO
INSERT INTO partido360.estado_evento (estado_evento_id, nombre, activo) VALUES
('eb882c38-a3cd-428f-baaa-49a5b40e5951','Programado',true),
('06f19e13-e4ff-495d-b0d0-71bc21587405','Realizado',true),
('c0056765-3197-4364-b225-b84b6d368f18','Cancelado',true);

-- NIVEL_LIDER
INSERT INTO partido360.nivel_lider (nivel_lider_id, nombre, activo) VALUES
('b5f1e98c-554c-4a3b-b106-0f6f9d055567','Sub-líder',true),
('863582cc-43a7-4d81-898b-975abb448e1f','Coordinador',true);

-- FUENTES_CAPTACION
INSERT INTO partido360.fuentes_captacion (fuente_id, nombre, activo, descripcion) VALUES
('30f217d5-86ce-400c-8798-48b6ccea9ce2','WhatsApp',true,NULL),
('5dcec5b5-23bf-410e-bf57-843578134b25','Formulario',true,NULL),
('18f1d01a-1f4a-4fd8-b341-106da6f59b12','Evento',true,NULL),
('5cfe4914-241b-4ac0-b72c-6927d3bfd196','Llamada',true,NULL),
('2a26904c-d822-4c53-b913-9f9be906bf35','Referido',true,NULL);

-- CANDIDATOS
INSERT INTO partido360.candidatos (candidato_id, nombre, partido, activo, fecha_creacion, descripcion) VALUES
('00000000-0000-0000-0000-000000000001','Candidato Principal','Sistema',true,'2026-03-26 14:45:18.201594+00','Candidato por defecto del sistema'),
('f9bdee3a-1208-4d04-a1a6-ea46cb4a51b0','Regidor José Martínez',NULL,false,'2026-03-30 20:48:37.211723+00','Campaña Regiduria 2026');

-- PERSONAS
INSERT INTO partido360.personas (persona_id, nombres, apellidos, cedula, telefono, email, sector_id, direccion, fecha_registro, estado_persona_id, candidato_id, notas, mesa, fuente_id, email_contacto) VALUES
('e46a33c6-abd3-4397-a1e3-268f3248b9f7','Erick','Guerrero','00000000001','8099999999',NULL,'5e48c216-9e4f-43ec-8d1c-5eaa8789cdee',NULL,'2026-03-26 14:45:18.563622+00','2d2fb9bd-1c60-4369-b1b7-643135ce7172','00000000-0000-0000-0000-000000000001',NULL,NULL,NULL,NULL),
('8022b85a-947d-485e-b7af-873fab74c507','Manuel','Jimenez','123-4567891-2','809-455-5555',NULL,'3a089b1b-7fb6-4f5c-80e2-c73c27e2e9a0',NULL,'2026-04-01 15:44:38.770004+00','2d2fb9bd-1c60-4369-b1b7-643135ce7172','00000000-0000-0000-0000-000000000001',NULL,NULL,NULL,NULL),
('3c591d1e-dad3-402f-9976-7a25121717aa','Amor ','de Tango','12345678912','8497575757',NULL,'bf53b688-4ff4-478c-8a68-3a5b4e6f614c',NULL,'2026-04-01 15:57:35.068236+00','2d2fb9bd-1c60-4369-b1b7-643135ce7172','f9bdee3a-1208-4d04-a1a6-ea46cb4a51b0',NULL,NULL,NULL,NULL),
('6b080fee-d65e-448e-9038-95744d00ad58','manuel','jose','12818186116','8188880808',NULL,'bf53b688-4ff4-478c-8a68-3a5b4e6f614c',NULL,'2026-04-01 16:47:42.579157+00','2d2fb9bd-1c60-4369-b1b7-643135ce7172','f9bdee3a-1208-4d04-a1a6-ea46cb4a51b0',NULL,NULL,NULL,NULL),
('ab261845-48ed-4f9b-9ff0-e2b9fc5f0a9f','michel','ortiz','818-1818181-0','849-111-2222',NULL,'2f133110-f44d-4c75-a7eb-a49df7f766d6',NULL,'2026-04-01 16:51:54.940594+00','2d2fb9bd-1c60-4369-b1b7-643135ce7172','00000000-0000-0000-0000-000000000001',NULL,NULL,NULL,NULL),
('2588d050-4e89-49a5-8785-cfdf99f478bc','manuel','ramirez','342-3523523-5','809-181-1616',NULL,'e519ff26-db42-4fcc-8f54-b1c57886b086',NULL,'2026-04-01 16:52:42.151787+00','2d2fb9bd-1c60-4369-b1b7-643135ce7172','00000000-0000-0000-0000-000000000001',NULL,NULL,NULL,NULL),
('82ba4737-90e9-431f-a4eb-ac50c079870e','Gloria','Tejeda','416-8186681-6','809-445-4545',NULL,'e519ff26-db42-4fcc-8f54-b1c57886b086',NULL,'2026-04-01 18:38:50.888175+00','2d2fb9bd-1c60-4369-b1b7-643135ce7172','00000000-0000-0000-0000-000000000001',NULL,NULL,NULL,NULL),
('e4c303f4-8090-4707-950d-a86cdd1e13b1','Maria','Manuel','161-6160606-8','809-481-8181',NULL,'57c9879d-2c0f-4f53-8466-51b3e174c576',NULL,'2026-04-01 18:42:36.38448+00','2d2fb9bd-1c60-4369-b1b7-643135ce7172','00000000-0000-0000-0000-000000000001',NULL,NULL,NULL,NULL),
('56883a20-27d0-414f-a4b6-b641652e75a8','Oscar','Mora','123-4567891-0','809-545-5555',NULL,'7398410a-f2ee-4d43-82dc-2d3428c030e2',NULL,'2026-04-01 18:21:37.149047+00','2d2fb9bd-1c60-4369-b1b7-643135ce7172','00000000-0000-0000-0000-000000000001',NULL,NULL,NULL,NULL),
('b7fbf42d-4cac-4698-965f-8b667f5d5ddb','carlos','rivera','181-8168168-1','849-252-5222',NULL,'d118f822-a069-4fea-8fcf-51816e98e801',NULL,'2026-04-01 18:48:20.794365+00','2d2fb9bd-1c60-4369-b1b7-643135ce7172','00000000-0000-0000-0000-000000000001',NULL,NULL,NULL,NULL);

-- USUARIOS
INSERT INTO partido360.usuarios (usuario_id, persona_id, username, email_login, password_hash, auth_provider, rol_id, estado_usuario_id, candidato_id, ultimo_login, fecha_creacion, failed_login_attempts, locked_until, last_login_at) VALUES
('482f26ec-f2e9-44be-b373-22e17e514c1f','e46a33c6-abd3-4397-a1e3-268f3248b9f7','00000000001','ejguerrero@smarttestingrd.com','$2b$10$gOQmDatHyi/gJ503hmr8keeRUWRNXAJKeRO4AoyMJ1PV3tRMIsloy','local','32f7e334-bd2f-4b67-9d60-63c9e3b772fd','c16b5db1-18ff-4824-9d75-a635136043ea','00000000-0000-0000-0000-000000000001','2026-04-03 19:58:12.461805+00','2026-03-26 14:45:18.778064+00',0,NULL,'2026-04-03 19:58:12.461805+00'),
('5a3ed048-37ca-4ba1-8889-769b8b898576','3c591d1e-dad3-402f-9976-7a25121717aa','12345678912',NULL,'$2b$12$GICG7wcFtRAVfWtIRNaLU.WgHDLhcqgINhmoMsZSY87whk0uI1MBS','local','49d4116d-40dc-4b6b-8c28-e63bf2ce78bb','c16b5db1-18ff-4824-9d75-a635136043ea','f9bdee3a-1208-4d04-a1a6-ea46cb4a51b0',NULL,'2026-04-01 15:57:35.068236+00',0,NULL,NULL),
('1a153114-ba2a-408a-a109-eac033bb2c01','6b080fee-d65e-448e-9038-95744d00ad58','12818186116',NULL,'$2b$12$4FCI2vf3CIU7I41LbkUzmeFi0QW8EcU.YsbdN7Rh6CNVF7OzjgVem','local','49d4116d-40dc-4b6b-8c28-e63bf2ce78bb','c16b5db1-18ff-4824-9d75-a635136043ea','f9bdee3a-1208-4d04-a1a6-ea46cb4a51b0',NULL,'2026-04-01 16:47:42.579157+00',0,NULL,NULL);

-- LIDERES
INSERT INTO partido360.lideres (lider_id, persona_id, meta_cantidad, codigo_lider, fecha_inicio, estado_lider_id, nivel_lider_id, lider_padre_id, candidato_id) VALUES
('6f371bcb-6b6c-43a3-b8ed-55c3dbe331a1','3c591d1e-dad3-402f-9976-7a25121717aa',10,'LDR-055699','2026-04-01 15:57:35.068236+00','364ef3eb-d8a1-4d2e-ae42-b3f46797dd20','863582cc-43a7-4d81-898b-975abb448e1f',NULL,'f9bdee3a-1208-4d04-a1a6-ea46cb4a51b0'),
('146db7e9-7667-4606-a416-87eedb5fb7e6','6b080fee-d65e-448e-9038-95744d00ad58',10,'LDR-063322','2026-04-01 16:47:42.579157+00','364ef3eb-d8a1-4d2e-ae42-b3f46797dd20','863582cc-43a7-4d81-898b-975abb448e1f',NULL,'f9bdee3a-1208-4d04-a1a6-ea46cb4a51b0'),
('7bc627af-2fc6-409a-a7d3-26faa740e730','2588d050-4e89-49a5-8785-cfdf99f478bc',15,'LDR-040137','2026-04-01 17:20:39.708367+00','364ef3eb-d8a1-4d2e-ae42-b3f46797dd20','b5f1e98c-554c-4a3b-b106-0f6f9d055567',NULL,'00000000-0000-0000-0000-000000000001');

-- ASIGNACIONES
INSERT INTO partido360.asignaciones (asignacion_id, lider_id, persona_id, fecha_asignacion, fuente_id, estado_asignacion_id) VALUES
('b66eddf6-7820-4916-8ead-40b5325b4578','146db7e9-7667-4606-a416-87eedb5fb7e6','ab261845-48ed-4f9b-9ff0-e2b9fc5f0a9f','2026-04-01 16:51:54.940594+00','30f217d5-86ce-400c-8798-48b6ccea9ce2','9600d61b-af7d-427d-bb67-00b3fb3e2e49'),
('2f9c2c32-c913-46a5-89d4-bbb341b4b1ad','146db7e9-7667-4606-a416-87eedb5fb7e6','2588d050-4e89-49a5-8785-cfdf99f478bc','2026-04-01 16:52:42.151787+00','5dcec5b5-23bf-410e-bf57-843578134b25','9600d61b-af7d-427d-bb67-00b3fb3e2e49'),
('cdfcf518-7b0a-4aae-ab1b-02682a816f1d','7bc627af-2fc6-409a-a7d3-26faa740e730','56883a20-27d0-414f-a4b6-b641652e75a8','2026-04-01 18:21:37.149047+00','30f217d5-86ce-400c-8798-48b6ccea9ce2','9600d61b-af7d-427d-bb67-00b3fb3e2e49'),
('336eb283-63bb-467d-b38f-755943952c51','7bc627af-2fc6-409a-a7d3-26faa740e730','82ba4737-90e9-431f-a4eb-ac50c079870e','2026-04-01 18:38:50.888175+00','5cfe4914-241b-4ac0-b72c-6927d3bfd196','9600d61b-af7d-427d-bb67-00b3fb3e2e49'),
('586fd85a-6632-4e21-a888-7435ba796c89','7bc627af-2fc6-409a-a7d3-26faa740e730','e4c303f4-8090-4707-950d-a86cdd1e13b1','2026-04-01 18:42:36.38448+00','5dcec5b5-23bf-410e-bf57-843578134b25','9600d61b-af7d-427d-bb67-00b3fb3e2e49'),
('aaf6d3c2-93f2-49df-a5c2-2e5e4777ba95','7bc627af-2fc6-409a-a7d3-26faa740e730','b7fbf42d-4cac-4698-965f-8b667f5d5ddb','2026-04-01 18:48:20.794365+00','5dcec5b5-23bf-410e-bf57-843578134b25','9600d61b-af7d-427d-bb67-00b3fb3e2e49');