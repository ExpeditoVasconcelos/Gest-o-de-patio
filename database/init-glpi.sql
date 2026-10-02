-- ====================================================================
-- BANCO DE DADOS OFICIAL GLPI 10.x — CENTRAL DE OPERAÇÕES JB CUNHA
-- Arquitetura Corporativa de Gestão de Serviços, Pátio e Ordens de Serviço
-- Compatível com MariaDB 10.5+ e MySQL 8.0+
-- ====================================================================

SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

-- 1. Entidades / Clientes Corporativos (glpi_entities)
CREATE TABLE IF NOT EXISTS `glpi_entities` (
  `id` INT(11) NOT NULL AUTO_INCREMENT,
  `name` VARCHAR(255) NOT NULL,
  `completename` TEXT DEFAULT NULL,
  `comment` TEXT DEFAULT NULL,
  `date_mod` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `date_creation` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `name` (`name`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 2. Localizações / Baias Físicas do Pátio (glpi_locations)
CREATE TABLE IF NOT EXISTS `glpi_locations` (
  `id` INT(11) NOT NULL AUTO_INCREMENT,
  `entities_id` INT(11) NOT NULL DEFAULT 0,
  `name` VARCHAR(255) NOT NULL,
  `completename` TEXT DEFAULT NULL,
  `comment` TEXT DEFAULT NULL,
  `date_mod` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `date_creation` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `name` (`name`),
  KEY `entities_id` (`entities_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 3. Ativos / Equipamentos e Veículos Pesados (glpi_computers / glpi_items)
CREATE TABLE IF NOT EXISTS `glpi_computers` (
  `id` INT(11) NOT NULL AUTO_INCREMENT,
  `entities_id` INT(11) NOT NULL DEFAULT 0,
  `name` VARCHAR(255) NOT NULL COMMENT 'Identificação / Tag / Placa',
  `serial` VARCHAR(255) DEFAULT NULL COMMENT 'Número de Série / Chassi',
  `otherserial` VARCHAR(255) DEFAULT NULL COMMENT 'Horímetro / Quilometragem',
  `contact` VARCHAR(255) DEFAULT NULL COMMENT 'Responsável do Cliente',
  `contact_num` VARCHAR(255) DEFAULT NULL COMMENT 'Telefone de Contato',
  `users_id_tech` INT(11) NOT NULL DEFAULT 0 COMMENT 'Técnico Responsável',
  `locations_id` INT(11) NOT NULL DEFAULT 0 COMMENT 'Baia Física Atual',
  `comment` TEXT DEFAULT NULL COMMENT 'Queixa Inicial / Observações Técnicas',
  `date_mod` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `date_creation` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `name` (`name`),
  KEY `entities_id` (`entities_id`),
  KEY `locations_id` (`locations_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 4. Chamados / Ordens de Serviço (glpi_tickets)
CREATE TABLE IF NOT EXISTS `glpi_tickets` (
  `id` INT(11) NOT NULL AUTO_INCREMENT,
  `entities_id` INT(11) NOT NULL DEFAULT 0,
  `name` VARCHAR(255) NOT NULL COMMENT 'Título do Atendimento / O.S.',
  `date` DATETIME NOT NULL COMMENT 'Data de Entrada',
  `closedate` DATETIME DEFAULT NULL COMMENT 'Data de Encerramento/Entrega',
  `solvedate` DATETIME DEFAULT NULL COMMENT 'Data de Solução/Pronto',
  `time_to_resolve` DATETIME DEFAULT NULL COMMENT 'Previsão de Entrega',
  `status` INT(11) NOT NULL DEFAULT 1 COMMENT '1:Recebido, 2:Execução, 3:Diagnóstico, 4:Aguardando, 5:Pronto, 6:Entregue',
  `urgency` INT(11) NOT NULL DEFAULT 3 COMMENT '1..5',
  `impact` INT(11) NOT NULL DEFAULT 3 COMMENT '1..5',
  `priority` INT(11) NOT NULL DEFAULT 3 COMMENT '1:Muito Baixa .. 5:Muito Alta',
  `locations_id` INT(11) NOT NULL DEFAULT 0 COMMENT 'Localização / Baia',
  `content` LONGTEXT DEFAULT NULL COMMENT 'Descrição Completa dos Serviços',
  `actiontime` INT(11) NOT NULL DEFAULT 0 COMMENT 'Tempo Total em Segundos',
  `num_orcamento` VARCHAR(100) DEFAULT NULL,
  `num_os` VARCHAR(100) DEFAULT NULL,
  `num_nf` VARCHAR(100) DEFAULT NULL,
  `custo_direto` DECIMAL(12,2) DEFAULT 0.00,
  `is_deleted` TINYINT(1) NOT NULL DEFAULT 0,
  `date_mod` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `date_creation` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `name` (`name`),
  KEY `entities_id` (`entities_id`),
  KEY `status` (`status`),
  KEY `locations_id` (`locations_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 5. Vínculo N:N entre Ticket (O.S.) e Equipamento (glpi_items_tickets)
CREATE TABLE IF NOT EXISTS `glpi_items_tickets` (
  `id` INT(11) NOT NULL AUTO_INCREMENT,
  `items_id` INT(11) NOT NULL,
  `itemtype` VARCHAR(100) NOT NULL DEFAULT 'Computer',
  `tickets_id` INT(11) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `unicity` (`itemtype`,`items_id`,`tickets_id`),
  KEY `tickets_id` (`tickets_id`),
  KEY `item` (`itemtype`,`items_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 6. Tarefas e Atividades Operacionais (glpi_tickettasks)
CREATE TABLE IF NOT EXISTS `glpi_tickettasks` (
  `id` INT(11) NOT NULL AUTO_INCREMENT,
  `tickets_id` INT(11) NOT NULL,
  `taskcategories_id` INT(11) NOT NULL DEFAULT 0,
  `date` DATETIME NOT NULL,
  `users_id` INT(11) NOT NULL DEFAULT 0,
  `users_id_tech` INT(11) NOT NULL DEFAULT 0,
  `content` TEXT DEFAULT NULL,
  `actiontime` INT(11) NOT NULL DEFAULT 0 COMMENT 'Horas/Minutos em segundos',
  `state` INT(11) NOT NULL DEFAULT 0 COMMENT '0:Pendente, 1:Em Andamento, 2:Concluída',
  `titulo_servico` VARCHAR(255) DEFAULT NULL,
  `estado_interno` VARCHAR(50) DEFAULT 'pendente',
  `date_mod` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `date_creation` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `tickets_id` (`tickets_id`),
  KEY `state` (`state`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 7. Acompanhamentos, Histórico e Timeline (glpi_ticketfollowups)
CREATE TABLE IF NOT EXISTS `glpi_ticketfollowups` (
  `id` INT(11) NOT NULL AUTO_INCREMENT,
  `tickets_id` INT(11) NOT NULL,
  `date` DATETIME NOT NULL,
  `users_id` INT(11) NOT NULL DEFAULT 0,
  `content` TEXT DEFAULT NULL,
  `is_private` TINYINT(1) NOT NULL DEFAULT 0,
  `timeline_position` INT(11) NOT NULL DEFAULT 1,
  `date_mod` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `date_creation` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `tickets_id` (`tickets_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 8. Documentos e Fotos da Oficina (glpi_documents)
CREATE TABLE IF NOT EXISTS `glpi_documents` (
  `id` INT(11) NOT NULL AUTO_INCREMENT,
  `entities_id` INT(11) NOT NULL DEFAULT 0,
  `name` VARCHAR(255) NOT NULL,
  `filename` VARCHAR(255) NOT NULL,
  `filepath` VARCHAR(500) NOT NULL,
  `mime` VARCHAR(100) DEFAULT 'image/jpeg',
  `tag` VARCHAR(255) DEFAULT NULL,
  `date_mod` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `date_creation` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 9. Vínculo de Fotos com Tickets (glpi_documents_items)
CREATE TABLE IF NOT EXISTS `glpi_documents_items` (
  `id` INT(11) NOT NULL AUTO_INCREMENT,
  `documents_id` INT(11) NOT NULL,
  `items_id` INT(11) NOT NULL COMMENT 'ID do Ticket ou Equipamento',
  `itemtype` VARCHAR(100) NOT NULL DEFAULT 'Ticket',
  `timeline_position` INT(11) NOT NULL DEFAULT 1,
  `date_mod` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `date_creation` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `documents_id` (`documents_id`),
  KEY `item` (`itemtype`,`items_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 10. Usuários do Sistema (glpi_users)
CREATE TABLE IF NOT EXISTS `glpi_users` (
  `id` INT(11) NOT NULL AUTO_INCREMENT,
  `name` VARCHAR(255) NOT NULL UNIQUE COMMENT 'Username de Login',
  `password` VARCHAR(255) NOT NULL COMMENT 'Hash crypto.scrypt',
  `realname` VARCHAR(255) NOT NULL COMMENT 'Nome Completo',
  `role` VARCHAR(50) NOT NULL DEFAULT 'usuario' COMMENT 'admin, usuario, cliente',
  `empresa_vinculada` VARCHAR(255) DEFAULT NULL,
  `is_active` TINYINT(1) NOT NULL DEFAULT 1,
  `last_login` DATETIME DEFAULT NULL,
  `date_mod` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `date_creation` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `role` (`role`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 11. Módulo Operacional de Compras e Peças (glpi_jbc_compras)
CREATE TABLE IF NOT EXISTS `glpi_jbc_compras` (
  `id` INT(11) NOT NULL AUTO_INCREMENT,
  `tickets_id` INT(11) DEFAULT NULL COMMENT 'FK glpi_tickets (opcional)',
  `solicitante` VARCHAR(255) NOT NULL,
  `solicitante_id` INT(11) DEFAULT NULL,
  `descricao` VARCHAR(255) NOT NULL,
  `quantidade` INT(11) NOT NULL DEFAULT 1,
  `valor_unitario` DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  `valor_total` DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  `fornecedor` VARCHAR(255) DEFAULT NULL,
  `status` VARCHAR(50) NOT NULL DEFAULT 'pendente' COMMENT 'pendente, autorizado, declinado, comprado',
  `urgencia` VARCHAR(50) DEFAULT 'Normal',
  `aprovado_por` VARCHAR(255) DEFAULT NULL,
  `motivo_recusa` TEXT DEFAULT NULL,
  `data_solicitacao` DATETIME NOT NULL,
  `data_aprovacao` DATETIME DEFAULT NULL,
  `date_mod` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `date_creation` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `tickets_id` (`tickets_id`),
  KEY `status` (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 12. Mapeamento Espacial das Baias e Layout do Pátio (glpi_jbc_garagem)
CREATE TABLE IF NOT EXISTS `glpi_jbc_garagem` (
  `id` INT(11) NOT NULL AUTO_INCREMENT,
  `locations_id` INT(11) DEFAULT 0,
  `nome` VARCHAR(100) NOT NULL,
  `tipo_area` VARCHAR(50) NOT NULL DEFAULT 'baia',
  `pos_x` INT(11) NOT NULL DEFAULT 0,
  `pos_y` INT(11) NOT NULL DEFAULT 0,
  `largura` INT(11) NOT NULL DEFAULT 200,
  `altura` INT(11) NOT NULL DEFAULT 160,
  `capacidade_max` INT(11) DEFAULT 1,
  `cor_fundo` VARCHAR(20) DEFAULT '#1e293b',
  `cor_borda` VARCHAR(20) DEFAULT '#3b82f6',
  `ativo` TINYINT(1) DEFAULT 1,
  `ordem` INT(11) DEFAULT 0,
  `date_mod` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 13. Histórico e Auditoria de Movimentações entre Baias (glpi_jbc_movimentacoes)
CREATE TABLE IF NOT EXISTS `glpi_jbc_movimentacoes` (
  `id` INT(11) NOT NULL AUTO_INCREMENT,
  `tickets_id` INT(11) NOT NULL,
  `local_origem` VARCHAR(100) DEFAULT NULL,
  `local_destino` VARCHAR(100) NOT NULL,
  `usuario` VARCHAR(100) NOT NULL,
  `motivo` VARCHAR(255) DEFAULT NULL,
  `date_mov` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `tickets_id` (`tickets_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ====================================================================
-- CARGA INICIAL ESSENCIAL — AMBIENTE TOTALMENTE ZERADO DE PRODUÇÃO
-- Sem serviços rodando, sem compras de teste, sem atividades de teste
-- Apenas os administradores/aprovadores e a estrutura física das baias
-- ====================================================================

-- Carga das 12 Baias Oficiais em glpi_locations e glpi_jbc_garagem
INSERT INTO `glpi_locations` (`id`, `name`, `completename`) VALUES
(1, 'Entrada / Recepção', 'Entrada / Recepção'),
(2, 'Baia 01 (Mecânica Pesada)', 'Baia 01 (Mecânica Pesada)'),
(3, 'Baia 02 (Hidráulica)', 'Baia 02 (Hidráulica)'),
(4, 'Baia 03 (Escavadeiras)', 'Baia 03 (Escavadeiras)'),
(5, 'Baia 04 (Motores / Transmissão)', 'Baia 04 (Motores / Transmissão)'),
(6, 'Setor Usinagem', 'Setor Usinagem'),
(7, 'Setor Tornearia', 'Setor Tornearia'),
(8, 'Soldagem & Caldeiraria', 'Soldagem & Caldeiraria'),
(9, 'Área de Testes Hidráulicos', 'Área de Testes Hidráulicos'),
(10, 'Área de Lavagem & Descontaminação', 'Área de Lavagem & Descontaminação'),
(11, 'Área de Espera de Peças', 'Área de Espera de Peças'),
(12, 'Expedição / Pronto para Entrega', 'Expedição / Pronto para Entrega');

INSERT INTO `glpi_jbc_garagem` (`id`, `locations_id`, `nome`, `tipo_area`, `pos_x`, `pos_y`, `largura`, `altura`, `cor_borda`, `ordem`) VALUES
(1, 1, 'Entrada / Recepção', 'entrada', 20, 20, 220, 160, '#64748b', 1),
(2, 2, 'Baia 01 (Mecânica Pesada)', 'baia', 260, 20, 250, 190, '#f97316', 2),
(3, 3, 'Baia 02 (Hidráulica)', 'baia', 530, 20, 250, 190, '#3b82f6', 3),
(4, 4, 'Baia 03 (Escavadeiras)', 'baia', 800, 20, 250, 190, '#eab308', 4),
(5, 5, 'Baia 04 (Motores / Transmissão)', 'baia', 1070, 20, 250, 190, '#f97316', 5),
(6, 6, 'Setor Usinagem', 'usinagem', 20, 240, 240, 180, '#a855f7', 6),
(7, 7, 'Setor Tornearia', 'tornearia', 280, 240, 240, 180, '#8b5cf6', 7),
(8, 8, 'Soldagem & Caldeiraria', 'soldagem', 540, 240, 240, 180, '#d946ef', 8),
(9, 9, 'Área de Testes Hidráulicos', 'teste', 800, 240, 240, 180, '#06b6d4', 9),
(10, 10, 'Área de Lavagem & Descontaminação', 'lavagem', 1060, 240, 240, 180, '#14b8a6', 10),
(11, 11, 'Área de Espera de Peças', 'espera', 20, 450, 480, 160, '#f59e0b', 11),
(12, 12, 'Expedição / Pronto para Entrega', 'expedicao', 530, 450, 770, 160, '#22c55e', 12);

-- Usuários Operacionais Essenciais de Produção (Hash crypto.scrypt para 'jbc@2026')
INSERT INTO `glpi_users` (`id`, `name`, `password`, `realname`, `role`, `is_active`) VALUES
(1, 'manuel', '10ca7c77e88c841a073383f57e0f1f6b:024b7bef19fe025938b4b762f2b64a9f99eeac41526f4519df9f0a730f2ff5df0f871e57b429d7e8af411f9b0e5eecc0e61e3bdd67e99560e738036772340c34', 'Manuel', 'admin', 1),
(2, 'expedito', '10ca7c77e88c841a073383f57e0f1f6b:024b7bef19fe025938b4b762f2b64a9f99eeac41526f4519df9f0a730f2ff5df0f871e57b429d7e8af411f9b0e5eecc0e61e3bdd67e99560e738036772340c34', 'Expedito', 'admin', 1),
(3, 'operador', 'a169d6c81a23a56279339901e09ed8d3:c1051737325a4eeea88d57f73039078465ad3aba17667800a35a605f6dd11a56c611ad22cde46c858851705fc5028479bd3e3a4ffbcd3382056417347f77f0dc', 'Operador Pátio', 'usuario', 1);

SET FOREIGN_KEY_CHECKS = 1;
