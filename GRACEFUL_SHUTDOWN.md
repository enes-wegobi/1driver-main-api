# Graceful Shutdown Implementation

Bu dokümantasyon, NestJS uygulamasında implement edilen graceful shutdown mekanizmasını açıklar.

## 🎯 Amaç

Uygulama kapatılırken tüm bağlantıların ve servislerin düzgün bir şekilde kapatılmasını sağlamak ve veri kaybını önlemek.

## 🔧 Implement Edilen Bileşenler

### 1. Main Application (src/main.ts)
- **Signal Handling**: SIGTERM, SIGINT, uncaughtException, unhandledRejection
- **Shutdown Timeout**: 30 saniye maksimum bekleme süresi
- **Force Exit**: Timeout durumunda zorla çıkış
- **Health Service Integration**: Shutdown durumunu health endpoint'ine yansıtma

### 2. WebSocket Gateway (src/websocket/websocket.gateway.ts)
- **OnModuleDestroy**: Client'lara shutdown bildirimi
- **Client Cleanup**: Tüm bağlı client'ların temizlenmesi
- **User Status Cleanup**: Driver ve customer status'larının temizlenmesi
- **Socket Disconnection**: Graceful socket kapatma

### 3. SocketIO Redis Adapter (src/websocket/adapters/socket-io-redis.adapter.ts)
- **Redis Connection Cleanup**: Pub/Sub client'larının kapatılması
- **Shutdown Method**: Async shutdown desteği
- **Error Handling**: Kapatma sırasında hata yönetimi

### 4. HTTP Clients Service (src/clients/clients.service.ts)
- **OnModuleDestroy**: HTTP agent'larının kapatılması
- **Keep-Alive Cleanup**: Aktif bağlantıların temizlenmesi
- **Agent Destruction**: HTTP ve HTTPS agent'larının destroy edilmesi

### 5. Redis Services (src/redis/services/base-redis.service.ts)
- **Singleton Pattern**: Shared Redis client
- **Connection Management**: Tek client üzerinden bağlantı yönetimi
- **Graceful Quit**: Redis bağlantısının düzgün kapatılması

### 6. Queue Services (src/queue/services/trip-queue.service.ts)
- **OnModuleDestroy**: Queue worker'larının durdurulması
- **Job Completion**: Aktif job'ların tamamlanmasını bekleme
- **Cleanup**: Periyodik temizlik işlemlerinin durdurulması

### 7. Keyspace Event Service (src/redis/services/keyspace-event.service.ts)
- **OnModuleDestroy**: Redis subscriber'ın kapatılması
- **Event Listener Cleanup**: Keyspace event listener'ının durdurulması

### 8. Health Check Module (src/modules/health/)
- **Health Endpoints**: `/api/health`, `/api/health/ready`, `/api/health/live`
- **Shutdown Status**: Shutdown durumunda 503 Service Unavailable
- **Dependency Checks**: Redis, Queue, WebSocket durumu kontrolü

## 🔄 Shutdown Sırası

1. **Signal Reception**: SIGTERM/SIGINT yakalanır
2. **Health Service**: Shutdown durumu işaretlenir
3. **WebSocket Clients**: Client'lara shutdown bildirimi gönderilir
4. **User Status**: Driver/Customer status'ları temizlenir
5. **WebSocket Connections**: Socket bağlantıları kapatılır
6. **Redis Pub/Sub**: WebSocket Redis adapter kapatılır
7. **NestJS Application**: Ana uygulama kapatılır
8. **HTTP Agents**: Keep-alive bağlantıları kapatılır
9. **Redis Connections**: Redis client'ları kapatılır
10. **Queue Workers**: BullMQ worker'ları durdurulur

## 📊 Health Check Endpoints

### GET /api/health
Genel sistem durumu kontrolü
```json
{
  "status": "ok",
  "timestamp": "2024-01-01T12:00:00.000Z",
  "uptime": 12345,
  "version": "1.0.0",
  "dependencies": {
    "redis": "healthy",
    "websocket": "healthy",
    "queue": "healthy"
  }
}
```

### GET /api/health/ready
Servis trafiği almaya hazır mı kontrolü
```json
{
  "status": "ready",
  "timestamp": "2024-01-01T12:00:00.000Z",
  "checks": {
    "redis": true,
    "queue": true
  }
}
```

### GET /api/health/live
Uygulama yaşıyor mu kontrolü
```json
{
  "status": "alive",
  "timestamp": "2024-01-01T12:00:00.000Z",
  "uptime": 12345
}
```

## ⚠️ Dikkat Edilmesi Gereken Noktalar

### 1. Redis Bağlantıları
- **Singleton Pattern**: BaseRedisService tek Redis client kullanır
- **Shared Connection**: Tüm servisler aynı client'ı paylaşır
- **Proper Cleanup**: onModuleDestroy sırasında client kapatılır

### 2. WebSocket Bağlantıları
- **Client Notification**: Shutdown öncesi client'lara bildirim
- **Status Cleanup**: User status'larının temizlenmesi
- **Redis Adapter**: Pub/Sub bağlantılarının kapatılması

### 3. Queue İşlemleri
- **Active Jobs**: Çalışan job'ların tamamlanmasını bekleme
- **Worker Shutdown**: Worker'ların düzgün durdurulması
- **Cleanup Tasks**: Periyodik görevlerin iptal edilmesi

### 4. HTTP Client'lar
- **Keep-Alive**: Aktif bağlantıların kapatılması
- **Agent Cleanup**: HTTP agent'larının destroy edilmesi
- **Connection Pool**: Bağlantı havuzunun temizlenmesi

### 5. Event Listeners
- **Keyspace Events**: Redis keyspace listener'ının kapatılması
- **Process Events**: Signal handler'larının temizlenmesi

## 🚀 Kullanım

### Development
```bash
# Graceful shutdown test
npm run start:dev
# CTRL+C ile test edin
```

### Production
```bash
# Docker container'da
docker stop <container_id>  # SIGTERM gönderir

# PM2 ile
pm2 stop app  # Graceful shutdown

# Kubernetes'te
kubectl delete pod <pod_name>  # SIGTERM sonrası SIGKILL
```

### Monitoring
```bash
# Health check
curl http://localhost:3000/api/health

# Readiness check
curl http://localhost:3000/api/health/ready

# Liveness check
curl http://localhost:3000/api/health/live
```

## 🔍 Troubleshooting

### Shutdown Timeout
- 30 saniye içinde kapatılmazsa force exit
- Log'larda hangi aşamada takıldığını kontrol edin
- Redis/Queue bağlantı sorunları olabilir

### WebSocket Client'lar
- Client'lar shutdown bildirimi alıyor mu kontrol edin
- Reconnection logic'i implement edilmeli
- Status cleanup'ı doğru çalışıyor mu kontrol edin

### Redis Bağlantıları
- Singleton pattern doğru çalışıyor mu
- Multiple disconnect attempt'leri olabilir
- Connection pool durumunu kontrol edin

### Queue Jobs
- Aktif job'lar tamamlanıyor mu
- Worker'lar düzgün durduruluyor mu
- Cleanup işlemleri çalışıyor mu

Bu implementation ile uygulama güvenli bir şekilde kapatılabilir ve veri kaybı önlenir.
