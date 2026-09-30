-- ==========================================================
-- ESTRUTURA DO BANCO DE DADOS - PLUGIN JB CUNHA PARA GLPI
-- Complemento operacional para oficinas de máquinas pesadas
-- ==========================================================

-- 1. Tabela complementar de Equipamentos / Ativos Industriais
CREATE TABLE IF NOT EXISTS `glpi_jbc_equipamentos` (
  `id` INT(11) NOT NULL AUTO_INCREMENT,
  `items_id` INT(11) NOT NULL DEFAULT 0 COMMENT 'FK para glpi_computers ou glpi_items',
  `entities_id` INT(11) NOT NULL DEFAULT 0 COMMENT 'FK glpi_entities (Cliente)',
  `codigo_interno` VARCHAR(50) NOT NULL COMMENT 'Ex: EQ-0042',
  `tipo_equipamento` VARCHAR(100) NOT NULL COMMENT 'Ex: Retroescavadeira, Escavadeira, Torno',
  `fabricante` VARCHAR(100) DEFAULT NULL,
  `modelo` VARCHAR(100) DEFAULT NULL,
  `numero_serie` VARCHAR(100) DEFAULT NULL,
  `placa` VARCHAR(20) DEFAULT NULL,
  `patrimonio_cliente` VARCHAR(100) DEFAULT NULL,
  `horimetro` DECIMAL(10,1) DEFAULT 0.0,
  `quilometragem` INT(11) DEFAULT 0,
  `ano_fabricacao` INT(4) DEFAULT NULL,
  `locations_id` INT(11) DEFAULT 0 COMMENT 'Localização física atual',
  `status_operacional` VARCHAR(50) DEFAULT 'Em Operação' COMMENT 'Disponível, Em Manutenção, Aguardando Entrega',
  `foto_url` VARCHAR(255) DEFAULT NULL,
  `observacoes` TEXT,
  `date_creation` DATETIME DEFAULT CURRENT_TIMESTAMP,
  `date_mod` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uniq_codigo_interno` (`codigo_interno`),
  KEY `fk_entities_id` (`entities_id`),
  KEY `fk_items_id` (`items_id`),
  KEY `fk_locations_id` (`locations_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 2. Tabela complementar de Serviços Operacionais (Vinculada a glpi_tickets)
CREATE TABLE IF NOT EXISTS `glpi_jbc_servicos` (
  `id` INT(11) NOT NULL AUTO_INCREMENT,
  `tickets_id` INT(11) NOT NULL COMMENT 'FK glpi_tickets',
  `numero_interno` VARCHAR(50) NOT NULL COMMENT 'Ex: SRV-000452',
  `entities_id` INT(11) NOT NULL COMMENT 'Cliente proprietário',
  `equipamento_id` INT(11) NOT NULL COMMENT 'FK glpi_jbc_equipamentos',
  `tipo_servico` VARCHAR(80) NOT NULL COMMENT 'Mecânica, Hidráulica, Usinagem, etc',
  `etapa_atual` VARCHAR(50) NOT NULL DEFAULT 'Entrada' COMMENT '15 etapas do fluxo',
  `locations_id` INT(11) DEFAULT 0 COMMENT 'Baia/Setor físico na garagem',
  `responsavel_id` INT(11) DEFAULT NULL COMMENT 'FK glpi_users',
  `equipe_id` INT(11) DEFAULT NULL COMMENT 'FK glpi_groups',
  `num_orcamento_erp` VARCHAR(60) DEFAULT NULL,
  `num_os_erp` VARCHAR(60) DEFAULT NULL,
  `num_nf_erp` VARCHAR(60) DEFAULT NULL,
  `prioridade` VARCHAR(20) DEFAULT 'Normal' COMMENT 'Baixa, Normal, Alta, Urgente',
  `data_entrada` DATETIME NOT NULL,
  `data_previsao` DATETIME DEFAULT NULL,
  `data_conclusao` DATETIME DEFAULT NULL,
  `data_entrega` DATETIME DEFAULT NULL,
  `percentual_execucao` INT(3) DEFAULT 0,
  `atrasado` TINYINT(1) DEFAULT 0,
  `sem_atualizacao` TINYINT(1) DEFAULT 0,
  `observacoes` TEXT,
  `date_creation` DATETIME DEFAULT CURRENT_TIMESTAMP,
  `date_mod` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uniq_tickets_id` (`tickets_id`),
  UNIQUE KEY `uniq_numero_interno` (`numero_interno`),
  KEY `fk_equipamento_id` (`equipamento_id`),
  KEY `fk_entities_id` (`entities_id`),
  KEY `fk_locations_id` (`locations_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 3. Tabela de Layout e Áreas da Garagem
CREATE TABLE IF NOT EXISTS `glpi_jbc_garagem` (
  `id` INT(11) NOT NULL AUTO_INCREMENT,
  `locations_id` INT(11) DEFAULT 0 COMMENT 'FK glpi_locations',
  `nome` VARCHAR(100) NOT NULL,
  `tipo_area` VARCHAR(50) NOT NULL DEFAULT 'baia' COMMENT 'baia, usinagem, tornearia, soldagem, teste, lavagem, espera, expedicao',
  `pos_x` INT(11) NOT NULL DEFAULT 0,
  `pos_y` INT(11) NOT NULL DEFAULT 0,
  `largura` INT(11) NOT NULL DEFAULT 200,
  `altura` INT(11) NOT NULL DEFAULT 160,
  `capacidade_max` INT(11) DEFAULT 1,
  `cor_fundo` VARCHAR(20) DEFAULT '#1e293b',
  `cor_borda` VARCHAR(20) DEFAULT '#3b82f6',
  `ativo` TINYINT(1) DEFAULT 1,
  `ordem` INT(11) DEFAULT 0,
  `date_mod` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 4. Tabela de Rastreabilidade e Histórico de Movimentações Físicas
CREATE TABLE IF NOT EXISTS `glpi_jbc_movimentacoes` (
  `id` INT(11) NOT NULL AUTO_INCREMENT,
  `servico_id` INT(11) NOT NULL,
  `equipamento_id` INT(11) NOT NULL,
  `local_origem_id` INT(11) DEFAULT NULL,
  `local_origem_nome` VARCHAR(100) DEFAULT NULL,
  `local_destino_id` INT(11) NOT NULL,
  `local_destino_nome` VARCHAR(100) NOT NULL,
  `users_id` INT(11) DEFAULT NULL COMMENT 'Quem moveu',
  `motivo` VARCHAR(255) DEFAULT NULL,
  `date_mov` DATETIME DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `fk_servico_mov` (`servico_id`),
  KEY `fk_equip_mov` (`equipamento_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 5. Tabela de Evidências Fotográficas e Documentos da Oficina
CREATE TABLE IF NOT EXISTS `glpi_jbc_evidencias` (
  `id` INT(11) NOT NULL AUTO_INCREMENT,
  `servico_id` INT(11) NOT NULL,
  `users_id` INT(11) NOT NULL,
  `tipo_evidencia` VARCHAR(50) NOT NULL DEFAULT 'durante' COMMENT 'antes, diagnostico, peca_usada, componente_fabricado, teste, depois, laudo',
  `titulo` VARCHAR(200) NOT NULL,
  `arquivo_nome` VARCHAR(255) NOT NULL,
  `arquivo_url` VARCHAR(500) NOT NULL,
  `mime_type` VARCHAR(100) DEFAULT 'image/jpeg',
  `tamanho_bytes` INT(11) DEFAULT 0,
  `observacao` TEXT,
  `date_creation` DATETIME DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `fk_servico_evid` (`servico_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 6. Tabela de Integração e Cache de Referenciação com ERP
CREATE TABLE IF NOT EXISTS `glpi_jbc_erp_sync` (
  `id` INT(11) NOT NULL AUTO_INCREMENT,
  `servico_id` INT(11) NOT NULL,
  `tipo_referencia` VARCHAR(30) NOT NULL COMMENT 'orcamento, os, nf',
  `numero_referencia` VARCHAR(100) NOT NULL,
  `status_sync` VARCHAR(30) DEFAULT 'referenciado',
  `dados_json` LONGTEXT DEFAULT NULL,
  `ultima_consulta` DATETIME DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `fk_servico_erp` (`servico_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Carga inicial das baias e setores padrão da Garagem JB Cunha
INSERT INTO `glpi_jbc_garagem` (`nome`, `tipo_area`, `pos_x`, `pos_y`, `largura`, `altura`, `cor_borda`, `ordem`) VALUES
('Entrada / Recepção', 'entrada', 20, 20, 220, 160, '#64748b', 1),
('Baia 01 (Mecânica Pesada)', 'baia', 260, 20, 250, 190, '#f97316', 2),
('Baia 02 (Hidráulica)', 'baia', 530, 20, 250, 190, '#3b82f6', 3),
('Baia 03 (Escavadeiras)', 'baia', 800, 20, 250, 190, '#eab308', 4),
('Baia 04 (Motores / Transmissão)', 'baia', 1070, 20, 250, 190, '#f97316', 5),
('Setor Usinagem', 'usinagem', 20, 240, 240, 180, '#a855f7', 6),
('Setor Tornearia', 'tornearia', 280, 240, 240, 180, '#8b5cf6', 7),
('Soldagem & Caldeiraria', 'soldagem', 540, 240, 240, 180, '#d946ef', 8),
('Área de Testes Hidráulicos', 'teste', 800, 240, 240, 180, '#06b6d4', 9),
('Área de Lavagem & Descontaminação', 'lavagem', 1060, 240, 240, 180, '#14b8a6', 10),
('Área de Espera de Peças', 'espera', 20, 450, 480, 160, '#f59e0b', 11),
('Expedição / Pronto para Entrega', 'expedicao', 530, 450, 770, 160, '#22c55e', 12);
