<?php
/**
 * Hooks de instalação, desinstalação e gatilhos operacionais do plugin JB Cunha
 */

function plugin_jbcunha_install() {
   global $DB;

   $sql_file = __DIR__ . '/install/install.sql';
   if (file_exists($sql_file)) {
      $DB->runFile($sql_file);
   }

   // Criação do perfil operacional para mecânicos e supervisores
   $profile = new Profile();
   if (!$profile->getFromDBByCrit(['name' => 'Técnico Oficina'])) {
      $profile->add([
         'name' => 'Técnico Oficina',
         'interface' => 'simplified'
      ]);
   }

   return true;
}

function plugin_jbcunha_uninstall() {
   // Preservar dados operacionais por segurança contra perda acidental
   // DROP TABLE apenas se explicitamente solicitado em desinstalação profunda
   return true;
}
