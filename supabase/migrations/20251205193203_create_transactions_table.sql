/*
  # Criar tabela de transações PIX

  1. Nova Tabela
    - `transactions`
      - `id` (uuid, primary key)
      - `transaction_id` (text, unique) - ID da transação na Aureo Pay
      - `customer_name` (text) - Nome do cliente
      - `customer_email` (text) - Email do cliente
      - `customer_phone` (text) - Telefone do cliente
      - `customer_document` (text) - CPF do cliente
      - `pix_key` (text) - Chave PIX informada
      - `pix_key_type` (text) - Tipo da chave PIX
      - `amount` (numeric) - Valor da transação
      - `status` (text) - Status da transação
      - `qrcode` (text) - QR Code do PIX
      - `expiration_date` (date) - Data de expiração
      - `paid_at` (timestamptz) - Data de pagamento
      - `created_at` (timestamptz) - Data de criação
      - `updated_at` (timestamptz) - Data de atualização

  2. Segurança
    - Habilitar RLS na tabela transactions
    - Permitir INSERT para usuários não autenticados (para criar transações)
    - Permitir SELECT para visualizar transações
*/

CREATE TABLE IF NOT EXISTS transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  transaction_id text UNIQUE NOT NULL,
  customer_name text NOT NULL,
  customer_email text NOT NULL,
  customer_phone text NOT NULL,
  customer_document text NOT NULL,
  pix_key text NOT NULL,
  pix_key_type text NOT NULL,
  amount numeric NOT NULL DEFAULT 21.67,
  status text NOT NULL DEFAULT 'waiting_payment',
  qrcode text,
  expiration_date date,
  paid_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow insert transactions"
  ON transactions
  FOR INSERT
  TO anon
  WITH CHECK (true);

CREATE POLICY "Allow select transactions"
  ON transactions
  FOR SELECT
  TO anon
  USING (true);