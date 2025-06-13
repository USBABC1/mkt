DO $$
BEGIN
    -- Este bloco verifica se a coluna 'generation_options' já existe na tabela 'landing_pages'.
    -- Se a coluna não existir, ela será adicionada.
    -- Isso garante que o script possa ser executado com segurança, mesmo que a coluna já tenha sido adicionada manualmente.
    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'landing_pages'
          AND column_name = 'generation_options'
    ) THEN
        -- Adiciona a coluna 'generation_options' do tipo JSONB à tabela 'landing_pages'.
        ALTER TABLE "public"."landing_pages" ADD COLUMN "generation_options" jsonb;
    END IF;
END $$;
