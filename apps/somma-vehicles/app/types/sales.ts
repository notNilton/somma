/**
 * Payload enviado ao registrar uma nova venda via POST /api/app/vendas.
 */
export interface SaleRequest {
  /** Nome do cliente */
  customer_name: string;
  /** Valor da venda em centavos */
  amount: number;
  /** Canal de venda (ex: "Site", "Instagram") */
  channel: string;
  /** Forma de pagamento (ex: "Cartão de crédito", "Pix") */
  payment_method: string;
}

/**
 * Resposta da API ao criar uma venda.
 */
export interface SaleResponse {
  /** ID do pedido criado */
  id: string;
}
