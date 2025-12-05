/*
  # Adicionar coluna transaction_type à tabela transactions

  1. Alterações
    - Adicionar coluna `transaction_type` (text) à tabela `transactions`
      - Valores possíveis: 'initial', 'upsell1', 'upsell2'
      - Valor padrão: 'initial'
      - Permite identificar o tipo de transação no funil de vendas

  2. Notas
    - Esta coluna permite rastrear diferentes tipos de pagamento
    - 'initial': Taxa de Confirmação de Identidade (R$ 21,67)
    - 'upsell1': Taxa de Antecipação de Saque (R$ 28,74)
    - 'upsell2': Taxa Anti-Fraude (R$ 21,90)
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'transactions' AND column_name = 'transaction_type'
  ) THEN
    ALTER TABLE transactions ADD COLUMN transaction_type text NOT NULL DEFAULT 'initial';
  END IF;
END $$;