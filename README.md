# infoset-mcp

Infoset CRM MCP Server — Claude Code ve diger MCP client'lar icin.

Infoset destek bilet sistemiyle entegrasyon saglayan [Model Context Protocol](https://modelcontextprotocol.io/) server'i. Ticket listeleme, detay goruntuleme, arama, olusturma, guncelleme ve istatistik sorgulama islemlerini MCP tool'lari uzerinden sunar.

## Kurulum

```bash
npm install
```

`.env.example` dosyasini `.env` olarak kopyalayip doldurun:

```bash
cp .env.example .env
```

Gerekli degiskenler:

| Degisken | Aciklama |
|----------|----------|
| `INFOSET_EMAIL` | Infoset login email |
| `INFOSET_PASSWORD` | Infoset login password |
| `INFOSET_BASE_URL` | API base URL (varsayilan: `https://api.infoset.app`) |

## MCP Konfigurasyonu

`.claude.json` dosyasina ekleyin:

```json
{
  "mcpServers": {
    "infoset": {
      "command": "node.exe",
      "args": ["C:\\dev\\infoset-mcp\\src\\mcp-server.mjs"],
      "env": {
        "INFOSET_EMAIL": "your-email@example.com",
        "INFOSET_PASSWORD": "your-password",
        "INFOSET_BASE_URL": "https://api.infoset.app"
      }
    }
  }
}
```

## Tool Listesi

| # | Tool | Aciklama |
|---|------|----------|
| 1 | `infoset_list_tickets` | Ticket listele — status, owner, tarih filtresi ve sayfalama |
| 2 | `infoset_get_ticket` | Tek ticket detayi getir |
| 3 | `infoset_get_ticket_logs` | Ticket aktivite loglarini getir |
| 4 | `infoset_get_email` | Email icerigini ID ile getir |
| 5 | `infoset_get_sla_breaches` | Ticket SLA ihlal verilerini getir |
| 6 | `infoset_get_contact` | Kisi bilgilerini ID ile getir |
| 7 | `infoset_search_tickets` | Ticketlarda anahtar kelime araması |
| 8 | `infoset_create_ticket` | Yeni ticket olustur |
| 9 | `infoset_update_ticket` | Mevcut ticketi guncelle (status, priority, owner, subject) |
| 10 | `infoset_list_contacts` | Kisi listele/ara |
| 11 | `infoset_get_company` | Sirket bilgilerini ID ile getir |
| 12 | `infoset_get_ticket_stats` | Ticket istatistikleri (status bazinda sayilar) |

## Kullanim Ornekleri

```
# Acik ticketlari listele
mcp__infoset__infoset_list_tickets status=[1,2] itemsPerPage=50

# Ticket detayi
mcp__infoset__infoset_get_ticket ticketId=8837516

# Ticket ara
mcp__infoset__infoset_search_tickets query="odeme hatasi"

# SLA ihlallerini kontrol et
mcp__infoset__infoset_get_sla_breaches ticketId=8837516

# Istatistikler
mcp__infoset__infoset_get_ticket_stats
```

## Gelistirme

```bash
# Test calistir
npm test

# Server'i dogrudan baslat
npm start
```

## Lisans

MIT
