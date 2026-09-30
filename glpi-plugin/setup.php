<?php
/**
 * Plugin JB Cunha Operações para GLPI
 * Adaptador de Gestão Operacional para Manutenção de Máquinas Pesadas e Serviços Industriais
 */

define('PLUGIN_JBCUNHA_VERSION', '1.0.0');
define('PLUGIN_JBCUNHA_MIN_GLPI', '10.0.0');
define('PLUGIN_JBCUNHA_MAX_GLPI', '10.0.99');

function plugin_init_jbcunha() {
   global $PLUGIN_HOOKS;

   $PLUGIN_HOOKS['csrf_compliant']['jbcunha'] = true;

   // Registro de classes para autoload
   Plugin::registerClass('PluginJbcunhaServico', ['addtabon' => ['Ticket']]);
   Plugin::registerClass('PluginJbcunhaEquipamento', ['addtabon' => ['Computer', 'Entity']]);
   Plugin::registerClass('PluginJbcunhaGaragem');
   Plugin::registerClass('PluginJbcunhaMovimentacao');

   // Menu na barra superior do GLPI
   if (Session::haveRight('ticket', READ)) {
      $PLUGIN_HOOKS['menu_toadd']['jbcunha'] = ['helpdesk' => 'PluginJbcunhaServico'];
   }
}

function plugin_version_jbcunha() {
   return [
      'name'           => 'JB Cunha - Operações de Oficina Pesada',
      'version'        => PLUGIN_JBCUNHA_VERSION,
      'author'         => 'JB Cunha Manutenção e Serviços',
      'license'        => 'GPLv3+',
      'homepage'       => 'https://jbcunha.com.br',
      'requirements'   => [
         'glpi' => [
            'min' => PLUGIN_JBCUNHA_MIN_GLPI,
            'max' => PLUGIN_JBCUNHA_MAX_GLPI,
         ]
      ]
   ];
}

function plugin_jbcunha_check_prerequisites() {
   if (version_compare(GLPI_VERSION, PLUGIN_JBCUNHA_MIN_GLPI, 'lt') ||
       version_compare(GLPI_VERSION, PLUGIN_JBCUNHA_MAX_GLPI, 'gt')) {
      echo "Este plugin requer GLPI >= " . PLUGIN_JBCUNHA_MIN_GLPI . " e <= " . PLUGIN_JBCUNHA_MAX_GLPI;
      return false;
   }
   return true;
}

function plugin_jbcunha_check_config($verbose = false) {
   return true;
}
