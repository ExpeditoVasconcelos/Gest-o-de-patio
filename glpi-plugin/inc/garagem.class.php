<?php
/**
 * Modelo de Layout e Baias da Garagem
 */

class PluginJbcunhaGaragem extends CommonDBTM {
   static $rightname = 'location';

   static function getTypeName($nb = 0) {
      return _n('Área da Garagem', 'Áreas da Garagem', $nb, 'jbcunha');
   }
}
