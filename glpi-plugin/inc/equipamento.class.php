<?php
/**
 * Modelo de Equipamento Industrial do Cliente
 */

class PluginJbcunhaEquipamento extends CommonDBTM {
   static $rightname = 'computer';

   static function getTypeName($nb = 0) {
      return _n('Máquina / Equipamento Industrial', 'Máquinas / Equipamentos Industriais', $nb, 'jbcunha');
   }

   function getTabNameForItem(CommonGLPI $item, $withtemplate = 0) {
      if (in_array($item->getType(), ['Computer', 'Entity'])) {
         return __('Dados Industriais JB Cunha', 'jbcunha');
      }
      return '';
   }

   static function displayTabContentForItem(CommonGLPI $item, $tabnum = 1, $withtemplate = 0) {
      echo "<div class='spaced'>";
      echo "<h4>Ativo do Cliente (Máquina Pesada / Implemento)</h4>";
      echo "<p>Gerenciado via Central de Operações JB Cunha.</p>";
      echo "</div>";
      return true;
   }
}
