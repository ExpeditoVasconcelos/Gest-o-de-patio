<?php
/**
 * Modelo de Serviço Operacional JB Cunha
 * Estende os chamados (Tickets) para a realidade de manutenção mecânica e industrial
 */

class PluginJbcunhaServico extends CommonDBTM {
   static $rightname = 'ticket';

   static function getTypeName($nb = 0) {
      return _n('Serviço de Oficina', 'Serviços de Oficina', $nb, 'jbcunha');
   }

   function getTabNameForItem(CommonGLPI $item, $withtemplate = 0) {
      if ($item->getType() == 'Ticket') {
         return __('Oficina JB Cunha', 'jbcunha');
      }
      return '';
   }

   static function displayTabContentForItem(CommonGLPI $item, $tabnum = 1, $withtemplate = 0) {
      if ($item->getType() == 'Ticket') {
         self::showForTicket($item);
      }
      return true;
   }

   static function showForTicket(Ticket $ticket) {
      global $DB;

      $iterator = $DB->request([
         'FROM' => 'glpi_jbc_servicos',
         'WHERE' => ['tickets_id' => $ticket->fields['id']]
      ]);

      echo "<div class='spaced'>";
      echo "<h3>Controle Operacional - JB Cunha</h3>";
      if (count($iterator)) {
         $data = $iterator->current();
         echo "<table class='tab_cadre_fixe'>";
         echo "<tr><th>Etapa Atual</th><td><strong>" . htmlspecialchars($data['etapa_atual']) . "</strong></td></tr>";
         echo "<tr><th>OS ERP</th><td>" . htmlspecialchars($data['num_os_erp'] ?? '-') . "</td></tr>";
         echo "<tr><th>Orçamento ERP</th><td>" . htmlspecialchars($data['num_orcamento_erp'] ?? '-') . "</td></tr>";
         echo "<tr><th>NF ERP</th><td>" . htmlspecialchars($data['num_nf_erp'] ?? '-') . "</td></tr>";
         echo "<tr><th>Localização na Garagem</th><td>" . htmlspecialchars($data['locations_id']) . "</td></tr>";
         echo "</table>";
      } else {
         echo "<p>Nenhum registro operacional vinculado a este chamado.</p>";
      }
      echo "</div>";
   }
}
