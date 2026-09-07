export interface LoginRequest {
  email: string;
  password: string;
}

export interface LoginResponse {
  token: string;
  token_type: string;
  expires_in: number;
  user: User;
}

export interface User {
  id: number;
  name: string;
  email: string;
  document: string | null;
  profile_photo_url: string | null;
  telefone: string | null;
  cpf: string | null;
  instagram: string | null;
}

export type PushValorTipo = "total" | "comissao";

export interface Profile {
  first_name: string | null;
  last_name: string | null;
  full_name: string | null;
  email: string | null;
  cpf: string | null;
  birth_date: string | null;
  phone: string | null;
  // Define qual valor aparece no push de venda: total do pedido ou comissão a receber.
  push_valor_tipo: PushValorTipo;
}
