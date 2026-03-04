/**
 * API Endpoint: /api/signals
 * Busca os sinais mais recentes do daemon no Railway
 */

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Chamando o endpoint do daemon no Railway (diligent-spirit service)
    const daemonUrl = process.env.DAEMON_API_URL || 'http://diligent-spirit.railway.internal:3001/signals';
    
    console.log(`📡 Fetching signals from: ${daemonUrl}`);
    
    const response = await fetch(daemonUrl, {
      method: 'GET',
      timeout: 10000
    });

    if (!response.ok) {
      throw new Error(`Daemon returned ${response.status}`);
    }

    const data = await response.json();
    
    // Calcular métricas agregadas
    const signals = data.signals || [];
    const portfolio = {
      total: signals.length,
      buy_signals: signals.filter(s => s.signal.includes('COMPRA')).length,
      sell_signals: signals.filter(s => s.signal.includes('VENDA')).length,
      hold_signals: signals.filter(s => s.signal.includes('MANTER')).length,
      portfolio_value: 1000000, // Placeholder
      pnl: 0, // Será calculado de trades reais
      pnl_percentage: 0,
      win_rate: 50.0,
      signals: signals
    };

    return res.status(200).json(portfolio);
  } catch (error) {
    console.error('❌ Error fetching signals:', error);
    return res.status(500).json({
      error: 'Failed to fetch signals',
      message: error.message
    });
  }
}
