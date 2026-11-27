// server.js
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const { createClient } = require('@supabase/supabase-js'); // <-- Tambahan Supabase

const app = express();
const PORT = process.env.PORT || 3001;

// ==========================================
// INISIALISASI SUPABASE
// ==========================================
const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_ANON_KEY
);

// ==========================================
// MIDDLEWARE
// ==========================================
app.use(cors());
app.use(express.json());

// Sajikan file statis dari folder 'public'
app.use(express.static(path.join(__dirname, 'public')));

// ==========================================
// ENDPOINT API CHAT (GROQ)
// ==========================================
app.post('/api/chat', async (req, res) => {
    try {
        const { messages, model = "openai/gpt-oss-120b" } = req.body;

        if (!messages || !Array.isArray(messages)) {
            return res.status(400).json({ error: "Format messages tidak valid." });
        }

        const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${process.env.GROQ_API_KEY}`,
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                model: model,
                messages: messages,
                temperature: 0.7,
                max_tokens: 1024,
                stream: false
            })
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error?.message || "Gagal menghubungi Groq");
        }

        const data = await response.json();
        res.json({ reply: data.choices[0].message.content });

    } catch (error) {
        console.error("Error Backend Chat:", error.message);
        res.status(500).json({ error: error.message });
    }
});

// ==========================================
// ENDPOINT AUTENTIKASI (SUPABASE)
// ==========================================

// Endpoint Daftar (Sign Up)
app.post('/api/auth/signup', async (req, res) => {
    const { email, password } = req.body;
    if (!email || !password) {
        return res.status(400).json({ error: "Email dan password wajib diisi." });
    }

    const { data, error } = await supabase.auth.signUp({ email, password });
    if (error) return res.status(400).json({ error: error.message });

    res.json({ 
        message: "Pendaftaran berhasil. Cek email untuk konfirmasi.", 
        user: data.user 
    });
});

// Endpoint Masuk (Login)
app.post('/api/auth/login', async (req, res) => {
    const { email, password } = req.body;
    if (!email || !password) {
        return res.status(400).json({ error: "Email dan password wajib diisi." });
    }

    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) return res.status(400).json({ error: error.message });

    res.json({ 
        message: "Login berhasil", 
        session: data.session, 
        user: data.user 
    });
});

// ==========================================
// FALLBACK ROUTE & SERVER START
// ==========================================

// Fallback: jika route tidak ditemukan, arahkan ke index.html
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Jalankan server (hanya di lokal, bukan di Vercel)
if (process.env.NODE_ENV !== 'production') {
    app.listen(PORT, () => {
        console.log(`✅ NeoBot aktif di http://localhost:${PORT}`);
    });
}

// Export app untuk Vercel
module.exports = app;