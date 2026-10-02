/**
 * scripts/restaurar_dados_producao.js
 * Script de Recuperação e Restauração de Atividades e Serviços
 * JB Cunha Gestão de Pátio
 */

const API_BASE = process.env.API_BASE || 'https://patio.jbcunha.com.br/api/jbc/v1';
const ADMIN_USER = process.env.ADMIN_USER || 'expedito';
const ADMIN_PASS = process.env.ADMIN_PASS || 'jbc@2026';

const DADOS_RECUPERACAO = [
  {
    id: 1,
    tag: 'CMP 02',
    servicos: [
      {
        id: 1,
        titulo: 'Readequação as normas de segurança',
        descricao: 'Adequação da escada de acesso e normas regulamentadoras',
        responsavel: 'Manuel',
        estado: 'em_execucao',
        atividades: [
          { descricao: 'Inspeção estrutural e alinhamento da escada de acesso', responsavel: 'Manuel', estado: 'concluida' },
          { descricao: 'Soldagem reforçada e fixação dos suportes e corrimão', responsavel: 'Manuel', estado: 'em_andamento' },
          { descricao: 'Aplicação de fundo primer anticorrosivo e pintura', responsavel: 'Manuel', estado: 'pendente' },
          { descricao: 'Instalação de travas de segurança e fitas antiderrapantes', responsavel: 'Manuel', estado: 'pendente' }
        ]
      },
      {
        id: 2,
        titulo: 'Instalação do sistema de irrigação',
        descricao: 'Instalação e testes do conjunto de aspersão e tubulação',
        responsavel: 'Manuel',
        estado: 'em_execucao',
        atividades: [
          { descricao: 'Reparo de vedação e estanqueidade do tanque', responsavel: 'Manuel', estado: 'concluida' },
          { descricao: 'Montagem e alinhamento da tubulação do canhão de água', responsavel: 'Manuel', estado: 'em_andamento' },
          { descricao: 'Instalação e acoplamento da bomba de irrigação', responsavel: 'Manuel', estado: 'pendente' },
          { descricao: 'Teste hidrostático de pressão e vazão dos aspersores', responsavel: 'Manuel', estado: 'pendente' }
        ]
      }
    ]
  },
  {
    id: 2,
    tag: 'CMP 05',
    servicos: [
      {
        titulo: 'Readequação às Normas de Segurança da Fábrica',
        descricao: 'Conformidade de sinalização, segurança e EPIs veiculares',
        responsavel: 'Manuel',
        estado: 'em_execucao',
        atividades: [
          { descricao: 'Checklist e vistoria técnica de conformidade fabril', responsavel: 'Manuel', estado: 'concluida' },
          { descricao: 'Instalação de sinalização refletiva e faixas regulamentares', responsavel: 'Manuel', estado: 'em_andamento' },
          { descricao: 'Revisão e fixação do suporte de extintor de incêndio ABC', responsavel: 'Manuel', estado: 'pendente' },
          { descricao: 'Instalação e teste de alerta sonoro de marcha à ré', responsavel: 'Manuel', estado: 'pendente' }
        ]
      }
    ]
  },
  {
    id: 3,
    tag: 'CMP 12',
    servicos: [
      {
        titulo: 'Eliminação de Vazamento no Sistema de Água',
        descricao: 'Reparo hidráulico nas linhas de sucção e recalque de água',
        responsavel: 'Manuel',
        estado: 'em_execucao',
        atividades: [
          { descricao: 'Localização e diagnóstico de vazamento nas mangueiras e conexões', responsavel: 'Manuel', estado: 'concluida' },
          { descricao: 'Substituição de juntas de vedação e abraçadeiras de alta pressão', responsavel: 'Manuel', estado: 'em_andamento' },
          { descricao: 'Teste hidrostático de estanqueidade operacional', responsavel: 'Manuel', estado: 'pendente' }
        ]
      },
      {
        titulo: 'Revisão e Vedação da Bomba d’Água',
        descricao: 'Eliminação do vazamento de óleo e revisão de retentores',
        responsavel: 'Manuel',
        estado: 'em_diagnostico',
        atividades: [
          { descricao: 'Drenagem de óleo e desmontagem da bomba d’água', responsavel: 'Manuel', estado: 'em_andamento' },
          { descricao: 'Troca de selo mecânico, retentores e anéis O-ring', responsavel: 'Manuel', estado: 'pendente' },
          { descricao: 'Reabastecimento com lubrificante especificado e teste de bancada', responsavel: 'Manuel', estado: 'pendente' }
        ]
      }
    ]
  },
  {
    id: 4,
    tag: 'CMU 008',
    servicos: [
      {
        titulo: 'Reparo no Sistema de Estabilizadores (Macacos Hidráulicos)',
        descricao: 'Manutenção do cilindro hidráulico e sapatas de sustentação',
        responsavel: 'Manuel',
        estado: 'em_execucao',
        atividades: [
          { descricao: 'Teste de pressão e identificação de perda de sustentação', responsavel: 'Manuel', estado: 'concluida' },
          { descricao: 'Desmontagem do cilindro hidráulico e haste da sapata', responsavel: 'Manuel', estado: 'em_andamento' },
          { descricao: 'Substituição do kit de gaxetas, raspadores e anéis guias', responsavel: 'Manuel', estado: 'pendente' },
          { descricao: 'Montagem e teste estático sob carga de trabalho', responsavel: 'Manuel', estado: 'pendente' }
        ]
      }
    ]
  },
  {
    id: 5,
    tag: 'CM 447',
    servicos: [
      {
        titulo: 'Manutenção Preventiva e Revisão Mecânica Geral',
        descricao: 'Revisão periódica completa do cavalo mecânico',
        responsavel: 'Manuel',
        estado: 'em_execucao',
        atividades: [
          { descricao: 'Drenagem e troca de óleo do motor e filtros (óleo, combustível e ar)', responsavel: 'Manuel', estado: 'concluida' },
          { descricao: 'Inspeção do sistema pneumático de freios e espessura de lonas', responsavel: 'Manuel', estado: 'em_andamento' },
          { descricao: 'Checagem de folgas de suspensão, cruzetas e cardan', responsavel: 'Manuel', estado: 'pendente' },
          { descricao: 'Revisão do sistema elétrico, chicotes, faróis e alternador', responsavel: 'Manuel', estado: 'pendente' }
        ]
      }
    ]
  }
];

async function executarRecuperacao() {
  console.log(`[RECUPERAÇÃO] 🚀 Conectando à API: ${API_BASE}`);
  
  // 1. Obter Token de Autenticação
  const loginRes = await fetch(`${API_BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: ADMIN_USER, senha: ADMIN_PASS })
  });
  const loginData = await loginRes.json();
  if (!loginData.success || !loginData.token) {
    console.error('[RECUPERAÇÃO] ❌ Falha no login admin:', loginData.message);
    process.exit(1);
  }
  const token = loginData.token;
  console.log('[RECUPERAÇÃO] ✅ Autenticado com sucesso como:', loginData.usuario.nome);

  // 2. Processar cada equipamento
  for (const item of DADOS_RECUPERACAO) {
    console.log(`\n──────────────────────────────────────────────────────────`);
    console.log(`[RECUPERAÇÃO] Processando veículo: #${item.id} - ${item.tag}`);

    // Buscar estado atual do equipamento
    const eqRes = await fetch(`${API_BASE}/atendimentos/${item.id}`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const eqData = await eqRes.json();
    if (!eqData.success || !eqData.data) {
      console.warn(`[RECUPERAÇÃO] ⚠️ Equipamento #${item.id} não encontrado na API. Pulando.`);
      continue;
    }

    const eqAtual = eqData.data;
    const servicosExistentes = eqAtual.servicos || [];

    for (const srvDesejado of item.servicos) {
      // Verificar se o serviço já existe (por ID ou por título)
      let srvEncontrado = servicosExistentes.find(s => 
        (srvDesejado.id && s.id === srvDesejado.id) ||
        (s.titulo && s.titulo.toLowerCase().trim() === srvDesejado.titulo.toLowerCase().trim())
      );

      if (!srvEncontrado) {
        console.log(`  ➕ Criando serviço: "${srvDesejado.titulo}"...`);
        const addSrvRes = await fetch(`${API_BASE}/atendimentos/${item.id}/servicos`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({
            titulo: srvDesejado.titulo,
            descricao: srvDesejado.descricao,
            responsavel: srvDesejado.responsavel,
            estado: srvDesejado.estado
          })
        });
        const addSrvData = await addSrvRes.json();
        if (addSrvData.success && addSrvData.data) {
          srvEncontrado = addSrvData.data;
          console.log(`  ✅ Serviço criado com ID ${srvEncontrado.id}`);
        } else {
          console.error(`  ❌ Falha ao criar serviço:`, addSrvData.message);
          continue;
        }
      } else {
        console.log(`  ℹ️ Serviço "${srvEncontrado.titulo}" já existente (ID ${srvEncontrado.id}).`);
      }

      // Adicionar atividades que ainda não existem
      const atvsExistentes = srvEncontrado.atividades || [];
      for (const atvDesejada of srvDesejado.atividades) {
        const atvExiste = atvsExistentes.find(a => 
          a.descricao && a.descricao.toLowerCase().trim() === atvDesejada.descricao.toLowerCase().trim()
        );

        if (!atvExiste) {
          console.log(`    ➕ Adicionando atividade: "${atvDesejada.descricao}" [${atvDesejada.estado}]...`);
          const addAtvRes = await fetch(`${API_BASE}/atendimentos/${item.id}/servicos/${srvEncontrado.id}/atividades`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
              descricao: atvDesejada.descricao,
              responsavel: atvDesejada.responsavel,
              estado: atvDesejada.estado,
              usuario: ADMIN_USER
            })
          });
          const addAtvData = await addAtvRes.json();
          if (addAtvData.success) {
            console.log(`    ✅ Atividade inserida com sucesso.`);
          } else {
            console.error(`    ❌ Erro ao inserir atividade:`, addAtvData.message);
          }
        } else {
          console.log(`    ℹ️ Atividade "${atvExiste.descricao}" já existe.`);
        }
      }
    }
  }

  // 3. Atualizar estados dos veículos para 'em_execucao' onde há atividades em andamento
  for (const item of DADOS_RECUPERACAO) {
    console.log(`\n[RECUPERAÇÃO] Atualizando estado operacional de #${item.id} (${item.tag})...`);
    await fetch(`${API_BASE}/atendimentos/${item.id}/estado`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        estado: 'em_execucao',
        motivo: 'Atividades em execução na oficina'
      })
    });
  }

  console.log('\n==========================================================');
  console.log('[RECUPERAÇÃO] ✅ CONCLUÍDO COM SUCESSO!');
  console.log('Verifique o aplicativo em https://patio.jbcunha.com.br/mobile');
  console.log('==========================================================');
}

executarRecuperacao().catch(err => {
  console.error('[RECUPERAÇÃO] 💥 Erro fatal:', err);
});
