#!/bin/bash
# Arranca el servidor WhatsApp Baileys apuntando al Next.js local
# Uso: ./start-whatsapp.sh

WHATSAPP_WEBHOOK_URL=http://localhost:3000/api/agent/webhook \
WHATSAPP_WEBHOOK_SECRET=wa-secret-dnclinicas-2026 \
CLINIC_SLUG=estetica-bella-vista-demo \
SUPABASE_URL=https://ugqflfvoblcurdyocgtr.supabase.co \
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVncWZsZnZvYmxjdXJkeW9jZ3RyIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NDU0MzkyMywiZXhwIjoyMDkwMTE5OTIzfQ.xsZmFppplEl-6-_pJx-gmxTu6WLznAmIJEho6xBqBw8 \
npx tsx whatsapp-server.ts
