<?php
/**
 * Modelo de Histórico de Movimentações Físicas
 */

class PluginJbcunhaMovimentacao extends CommonDBTM {
   static $rightname = 'ticket';

   static function getTypeName($nb = 0) {
      return _n('Movimentação Física', 'Movimentações Físicas', $nb, 'jbcunha');
   }
}
