const express = require('express');
const cors = require('cors');
const { createClient } = require('@supabase/supabase-js');
const { Resend } = require('resend');
require('dotenv').config();

const app = express();

// Middlewares
app.use(cors({
    origin: 'https://ateliepixel.com' 
}));
app.use(express.json());

// 1. Inicialização do Cliente Supabase
// As chaves são puxadas automaticamente das variáveis de ambiente do Render
const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_ANON_KEY
);

// 2. Inicialização do Cliente Resend
const resend = new Resend(process.env.RESEND_API_KEY);

// 3. Rota Principal de Contato
app.post('/api/contato', async (req, res) => {
    const { email, telefone, mensagem } = req.body;

    console.log('--- NOVA REQUISIÇÃO RECEBIDA ---');
    console.log('Dados do formulário:', { email, telefone, mensagem });

    try {
        // ETAPA A: Gravação no Supabase (Persistência)
        // O .select() força o banco a retornar o objeto criado para confirmação
        const { data, error: dbError } = await supabase
            .from('contatos')
            .insert([{ email, telefone, mensagem }])
            .select();

        if (dbError) {
            console.error('ERRO NO SUPABASE:', dbError);
            // Se o banco falhar, interrompemos aqui para não enviar e-mail falso
            return res.status(500).json({ error: 'Erro ao salvar no banco de dados', detalhes: dbError });
        }

        console.log('SUCESSO NO SUPABASE. Registro criado:', data);

        // ETAPA B: Envio do E-mail via Resend
        // Usamos o domínio de teste obrigatório 'onboarding@resend.dev'
        const emailResponse = await resend.emails.send({
            from: 'Atelie Pixel <contato@ateliepixel.com>',
            to: process.env.EMAIL_TO,
            subject: 'Novo Contato - Ateliê Píxel',
            html: `
                <div style="font-family: sans-serif; color: #333;">
                    <h2 style="color: #7800AB;">Nova mensagem recebida!</h2>
                    <p><strong>E-mail do Cliente:</strong> ${email}</p>
                    <p><strong>Telefone:</strong> ${telefone}</p>
                    <p><strong>Mensagem:</strong></p>
                    <div style="background: #f4f4f4; padding: 10px; border-left: 4px solid #7800AB;">
                        ${mensagem}
                    </div>
                </div>
            `
        });

        console.log('SUCESSO NO RESEND:', emailResponse);

        // Resposta final de sucesso para o Front-end
        res.status(200).json({ 
            message: 'Contato processado com sucesso!',
            id: data[0].id 
        });

    } catch (error) {
        console.error('ERRO CRÍTICO NO BACKEND:', error);
        res.status(500).json({ 
            error: 'Erro interno no servidor', 
            mensagem: error.message 
        });
    }
});

// 4. Inicialização do Servidor
// O Render define a porta automaticamente através da variável PORT
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Servidor rodando com Supabase na porta ${PORT}`);
});