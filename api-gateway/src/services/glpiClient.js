/**
 * Cliente REST para comunicação bidirecional com a API nativa do GLPI (apirest.php)
 */

const config = require('../config');

class GlpiClient {
  constructor() {
    this.baseUrl = config.GLPI.URL;
    this.appToken = config.GLPI.APP_TOKEN;
    this.userToken = config.GLPI.USER_TOKEN;
    this.sessionToken = null;
    this.enabled = config.GLPI.ENABLED;
  }

  async initSession() {
    if (!this.enabled) {
      return { success: true, mode: 'local_standalone' };
    }

    try {
      const headers = {
        'Content-Type': 'application/json',
        'Authorization': `user_token ${this.userToken}`
      };
      if (this.appToken) {
        headers['App-Token'] = this.appToken;
      }

      const response = await fetch(`${this.baseUrl}/initSession`, {
        method: 'GET',
        headers
      });

      if (!response.ok) {
        throw new Error(`Erro GLPI initSession: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      this.sessionToken = data.session_token;
      return { success: true, session_token: this.sessionToken };
    } catch (err) {
      console.warn('[GLPI Client] Servidor GLPI remoto inacessível, operando em modo local:', err.message);
      return { success: false, error: err.message };
    }
  }

  async killSession() {
    if (!this.enabled || !this.sessionToken) return;
    try {
      await fetch(`${this.baseUrl}/killSession`, {
        method: 'GET',
        headers: {
          'Session-Token': this.sessionToken,
          'App-Token': this.appToken
        }
      });
      this.sessionToken = null;
    } catch (e) {
      // ignore
    }
  }

  async criarTicket(dadosServico) {
    if (!this.enabled) {
      return { id: Math.floor(Math.random() * 9000) + 1000, mock: true };
    }

    await this.initSession();
    try {
      const payload = {
        input: {
          name: `${dadosServico.numero_interno} - ${dadosServico.titulo}`,
          content: dadosServico.descricao,
          status: 2, // Processing
          urgency: dadosServico.prioridade === 'Urgente' ? 5 : 3
        }
      };

      const res = await fetch(`${this.baseUrl}/Ticket`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Session-Token': this.sessionToken,
          'App-Token': this.appToken
        },
        body: JSON.stringify(payload)
      });

      return await res.json();
    } catch (err) {
      console.error('[GLPI Client] Erro ao criar ticket no GLPI:', err.message);
      return { error: err.message };
    }
  }

  async adicionarFollowup(ticketId, autor, texto) {
    if (!this.enabled) return { success: true, mock: true };

    await this.initSession();
    try {
      const payload = {
        input: {
          items_id: ticketId,
          itemtype: 'Ticket',
          content: `[Oficina JB Cunha - ${autor}] ${texto}`
        }
      };

      const res = await fetch(`${this.baseUrl}/ITILFollowup`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Session-Token': this.sessionToken,
          'App-Token': this.appToken
        },
        body: JSON.stringify(payload)
      });

      return await res.json();
    } catch (err) {
      console.error('[GLPI Client] Erro ao adicionar followup:', err.message);
      return { error: err.message };
    }
  }
}

module.exports = new GlpiClient();
